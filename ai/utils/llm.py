"""
utils/llm.py — LLM client supporting Ollama and OpenAI-compatible APIs.

Controlled by settings.llm_backend:
  "ollama"  → POST to OLLAMA_URL/api/generate (local, free, offline)
  "openai"  → OpenAI SDK with configurable base_url (cloud or local vLLM)
"""
from __future__ import annotations

import httpx
from loguru import logger
import re

from config import settings


class LLMError(Exception):
    """Raised when the LLM call fails."""


async def generate(system_prompt: str, user_message: str, history: list[dict[str, str]] | None = None) -> str:
    """
    Call the configured LLM and return the generated text response.

    Args:
        system_prompt: The system/context prompt (contains RAG context).
        user_message: The user's question.
        history: Optional list of previous messages in the conversation.

    Returns:
        The LLM's text response.

    Raises:
        LLMError: If the LLM call fails after retry.
    """
    if history is None:
        history = []
        
    backend = settings.llm_backend.lower()

    if backend == "ollama":
        return await _call_ollama(system_prompt, user_message, history)
    elif backend == "openai":
        return await _call_openai(system_prompt, user_message, history)
    else:
        raise LLMError(f"Unknown LLM_BACKEND: '{backend}'. Use 'ollama' or 'openai'.")


async def _call_ollama(system_prompt: str, user_message: str, history: list[dict[str, str]]) -> str:
    """Call Ollama's /api/chat endpoint."""
    url = f"{settings.ollama_url.rstrip('/')}/api/chat"
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.1,   # Low temperature for factual, grounded answers
            "num_predict": 512,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            content = data.get("message", {}).get("content", "")
            if not content:
                raise LLMError("Ollama returned an empty response.")
            return content.strip()
    except httpx.ConnectError:
        raise LLMError(
            "Could not connect to Ollama. "
            f"Is Ollama running at {settings.ollama_url}? "
            "Run: ollama serve"
        )
    except httpx.HTTPStatusError as e:
        raise LLMError(f"Ollama HTTP error: {e.response.status_code} — {e.response.text}")
    except Exception as e:
        raise LLMError(f"Ollama call failed: {e}")


async def _call_openai(system_prompt: str, user_message: str, history: list[dict[str, str]]) -> str:
    """Call an OpenAI-compatible API."""
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=settings.openai_api_key or "not-required",
            base_url=settings.openai_base_url,
        )
        
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            temperature=0.1,
            max_tokens=1024,
        )
        content = response.choices[0].message.content or ""
        content = re.sub(r"\n{3,}", "\n\n", content)
        content = content.strip()
        return content.strip()
    except Exception as e:
        raise LLMError(f"OpenAI API call failed: {e}")


async def check_llm_health() -> dict[str, str]:
    """Check if the LLM backend is reachable."""
    backend = settings.llm_backend.lower()
    try:
        if backend == "ollama":
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{settings.ollama_url}/api/tags")
                r.raise_for_status()
            return {"status": "ok", "backend": "ollama", "model": settings.ollama_model}
        elif backend == "openai":
            return {"status": "ok", "backend": "openai", "model": settings.openai_model}
    except Exception as e:
        return {"status": "error", "backend": backend, "error": str(e)}
    return {"status": "unknown"}


# Phrases that signal the query depends on prior context and needs rewriting
_CONTEXT_SIGNALS = {
    "previous", "last question", "that question", "same question", "above",
    "again", "repeat", "rephrase", "earlier", "before", "that", "it again",
    "those", "them", "as before", "like before", "same thing", "what you said",
    "what was", "elaborate", "explain more", "tell me more", "go on",
    "continue", "expand", "simplify", "simpler", "other words", "in detail",
    "third point", "second point", "first point", "that point", "the point",
    "first option", "second option", "third option", "last answer",
}


def _needs_rewrite(query: str, history: list[dict[str, str]]) -> bool:
    """
    Return True if the query is a contextual follow-up that depends on history
    and therefore needs to be rewritten before RAG retrieval.

    Short queries (≤ 8 words) with context signals are always rewritten.
    Longer queries are only rewritten if they contain a strong context signal.
    """
    if not history:
        return False
    q_lower = query.strip().lower()
    word_count = len(q_lower.split())
    return any(signal in q_lower for signal in _CONTEXT_SIGNALS) or word_count <= 4


async def rewrite_query(query: str, history: list[dict[str, str]]) -> str:
    """
    Use the LLM to rewrite a contextual follow-up query into a complete,
    standalone question that can be used for RAG document retrieval.

    The rewritten query will be in the same domain (DE-BP3 portfolio) and will
    incorporate any references to prior turns (e.g. "that", "previous question",
    "third point", "elaborate", etc.) so the vector search finds the right docs.

    Args:
        query:   The raw user message (potentially a follow-up / vague reference).
        history: The conversation history so far (list of {role, content} dicts).

    Returns:
        A standalone, self-contained question string. Falls back to the original
        query if rewriting fails or if the LLM refuses to produce one.
    """
    if not _needs_rewrite(query, history):
        return query  # Fast path — no rewrite needed

    # Build a compact conversation summary for the rewrite prompt
    # Only use the last 6 turns (3 user + 3 assistant) to keep the prompt tight
    recent = history[-6:]
    conv_lines = []
    for msg in recent:
        role = "User" if msg["role"] == "user" else "Assistant"
        # Truncate very long assistant answers to the first 400 chars
        content = msg["content"][:400] + "…" if len(msg["content"]) > 400 else msg["content"]
        conv_lines.append(f"{role}: {content}")
    conversation_text = "\n".join(conv_lines)

    rewrite_system = (
        "You are a query rewriting assistant for an enterprise portfolio management chatbot. "
        "Your ONLY job is to rewrite the user's latest message into a single, complete, "
        "self-contained question that can be understood without any prior context. "
        "The domain is the DE-BP3 demand portfolio (applications, priorities, departments, ROI, forecasts, etc.). "
        "Rules:\n"
        "- Output ONLY the rewritten question — nothing else. No explanation, no preamble.\n"
        "- Resolve all pronouns and references (e.g. 'it', 'that', 'the previous question', 'third point') "
        "  using the conversation history.\n"
        "- If the user says 'answer the previous question again', output the previous user question verbatim.\n"
        "- If the user says 'elaborate on the third point', identify what the third point was and ask about it explicitly.\n"
        "- Keep the question concise and specific to the DE-BP3 domain.\n"
        "- If the query is already self-contained, return it unchanged.\n"
    )

    rewrite_user = (
        f"Conversation so far:\n{conversation_text}\n\n"
        f"Latest user message: {query}\n\n"
        f"Rewritten standalone question:"
    )

    try:
        backend = settings.llm_backend.lower()
        if backend == "ollama":
            rewritten = await _call_ollama(rewrite_system, rewrite_user, [])
        elif backend == "openai":
            rewritten = await _call_openai(rewrite_system, rewrite_user, [])
        else:
            return query

        rewritten = rewritten.strip().strip('"').strip("'")
        # Sanity check: if the LLM returned something too long or weird, fall back
        if not rewritten or len(rewritten) > 500 or "\n" in rewritten:
            logger.warning(f"Query rewrite produced unexpected output, falling back to original.")
            return query

        logger.info(f"Query rewritten: '{query[:60]}' → '{rewritten[:60]}'")
        return rewritten

    except Exception as e:
        logger.warning(f"Query rewrite failed ({e}), using original query.")
        return query

