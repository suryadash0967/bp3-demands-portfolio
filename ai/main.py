"""
main.py — FastAPI AI microservice entry point.

Endpoints:
  POST /chat      — RAG-based Q&A + intent-driven forecasting
  POST /forecast  — Prophet demand forecasting
  GET  /health    — Service health check
  GET  /kb/stats  — Knowledge base statistics
  POST /kb/rebuild — Force rebuild ChromaDB collection
"""
# from __future__ import annotations

import asyncio
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from config import settings
from forecasting.forecast import ForecastResult, run_forecast
from models.chat import ChatRequest, ChatResponse, SourceDocument
from models.forecast import ForecastRequest, ForecastResponse
from rag.chroma import build_or_load_collection, get_collection_stats
from rag.prompt import build_no_context_response, build_prompt
from rag.retriever import retrieve
from utils.intent import IntentType, detect_intent
from utils.llm import LLMError, generate, rewrite_query
from utils.logger import setup_logger

# ── Logging ────────────────────────────────────────────────────────────────────
Path("logs").mkdir(exist_ok=True)
setup_logger("INFO")

# ── Rate limiting ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── Global state ───────────────────────────────────────────────────────────────
_collection = None  # ChromaDB collection singleton


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build/load ChromaDB collection on startup."""
    global _collection
    logger.info("🚀 DE-BP3 AI Service starting…")
    try:
        _collection = await asyncio.to_thread(build_or_load_collection)
        logger.info("✅ Knowledge base ready.")
    except Exception as e:
        logger.error(f"❌ Failed to initialise knowledge base: {e}")
        # Service starts but chat will return errors until KB is ready
    yield
    logger.info("AI Service shutting down.")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DE-BP3 Enterprise AI Service",
    description="Closed-domain RAG assistant and demand forecasting for the DE-BP3 portfolio.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow Express backend and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── Request logging middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = int((time.time() - start) * 1000)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    return response


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    """Returns service health and knowledge base status."""
    kb_ready = _collection is not None
    stats = {}
    if kb_ready:
        try:
            stats = get_collection_stats(_collection)
        except Exception:
            pass
    return {
        "status": "ok",
        "service": "DE-BP3 AI Service",
        "kb_ready": kb_ready,
        "llm_backend": settings.llm_backend,
        "llm_model": settings.ollama_model if settings.llm_backend == "ollama" else settings.openai_model,
        **stats,
    }


# ── KB Stats ───────────────────────────────────────────────────────────────────
@app.get("/kb/stats", tags=["Knowledge Base"])
async def kb_stats():
    """Returns knowledge base collection statistics."""
    if _collection is None:
        raise HTTPException(status_code=503, detail="Knowledge base not yet initialised.")
    return get_collection_stats(_collection)


# ── KB Rebuild ─────────────────────────────────────────────────────────────────
@app.post("/kb/rebuild", tags=["Knowledge Base"])
async def kb_rebuild():
    """Force a full rebuild of the ChromaDB collection from demands.xlsx."""
    global _collection
    logger.info("Force rebuilding ChromaDB collection…")
    try:
        _collection = await asyncio.to_thread(build_or_load_collection, True)
        stats = get_collection_stats(_collection)
        return {"status": "rebuilt", **stats}
    except Exception as e:
        logger.error(f"Rebuild failed: {e}")
        raise HTTPException(status_code=500, detail=f"Rebuild failed: {e}")


# ── Chat ───────────────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse, tags=["AI"])
@limiter.limit(f"{settings.rate_limit_rpm}/minute")
async def chat(request: Request, body: ChatRequest):
    """
    Closed-domain RAG Q&A endpoint.

    Pipeline:
    1. Detect intent + extract entities from the query.
    2. If forecast intent → call forecasting engine, then format result as text.
    3. Otherwise → retrieve relevant docs from ChromaDB, build prompt, call LLM.
    4. Return structured ChatResponse.
    """
    if _collection is None:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is not ready yet. Please try again in a moment.",
        )

    query = body.query
    history_dicts = [{"role": msg.role, "content": msg.content} for msg in body.history]
    logger.info(f"Chat query: '{query[:80]}'")

    # ── Query rewriting ────────────────────────────────────────────────
    # If the query is a contextual follow-up (e.g. "answer the previous question
    # again", "elaborate on the third point", "explain that in simpler terms"),
    # rewrite it into a fully self-contained question BEFORE doing RAG retrieval.
    # The LLM still receives the full original query + history for its answer.
    retrieval_query = await rewrite_query(query, history_dicts)

    # ── Intent detection ───────────────────────────────────────────────
    intent_result = detect_intent(retrieval_query)
    logger.debug(f"Intent: {intent_result.intent}, entities: {intent_result.entities}")

    forecast_data: dict | None = None

    # ── Forecast path ──────────────────────────────────────────────────
    if intent_result.intent == IntentType.FORECAST_REQUEST:
        params = intent_result.forecast_params
        logger.info(f"Forecast intent detected: {params}")

        fc_result: ForecastResult = await asyncio.to_thread(
            run_forecast,
            params.get("metric", "overall"),
            params.get("category") or None,
            int(params.get("months", 6)),
        )

        if fc_result.error:
            answer = (
                f"I attempted to generate a forecast for **{params.get('metric', 'overall')}** "
                f"but encountered an issue:\n\n{fc_result.error}"
            )
        else:
            metric_label = params.get("metric", "overall").replace("_", " ").title()
            cat_label = f" for **{fc_result.category}**" if fc_result.category else ""
            answer = (
                f"📈 **Demand Forecast** — {metric_label}{cat_label}\n\n"
                f"- **Trend:** {fc_result.trend.title()}\n"
                f"- **Peak Month:** {fc_result.peak_month}\n"
                f"- **Growth:** {'+' if fc_result.growth_pct >= 0 else ''}{fc_result.growth_pct}% "
                f"over the next {fc_result.months_ahead} month(s)\n"
                f"- **Confidence:** {fc_result.confidence.title()}\n\n"
                f"The forecast is based on {len(fc_result.historical)} months of historical data. "
                f"Use the Forecast page for a full chart view."
            )

        forecast_data = {
            "metric": fc_result.metric,
            "category": fc_result.category,
            "historical": fc_result.historical,
            "forecast": fc_result.forecast,
            "trend": fc_result.trend,
            "peak_month": fc_result.peak_month,
            "growth_pct": fc_result.growth_pct,
            "confidence": fc_result.confidence,
            "error": fc_result.error,
        }

        return ChatResponse(
            answer=answer,
            intent=intent_result.intent.value,
            sources=[],
            forecast=forecast_data,
            session_id=body.session_id,
        )

    # ── RAG path ───────────────────────────────────────────────────────
    docs = await asyncio.to_thread(
        retrieve,
        _collection,
        retrieval_query,       # Use the rewritten (context-resolved) query for retrieval
        intent_result.entities,
    )

    # Check if retrieval returned any meaningful results
    SIMILARITY_THRESHOLD = 0.92  # Relaxed: 0.85 was too aggressive for metadata-filtered queries
    relevant_docs = [d for d in docs if d.score < SIMILARITY_THRESHOLD]

    if not relevant_docs:
        # Give a specific message if we were filtering by entities but found nothing
        if intent_result.entities:
            entity_desc = ", ".join(f"{k} = '{v}'" for k, v in intent_result.entities.items())
            answer = (
                f"I searched the DE-BP3 knowledge base for demands matching **{entity_desc}** "
                f"but found no matching records.\n\n"
                f"This could mean:\n"
                f"- No demands with those exact attributes exist in the current dataset.\n"
                f"- The value may be spelled differently in the data (e.g. the Work Area or Status field may use different casing or abbreviations).\n\n"
                f"Try rephrasing with different filter values, or ask a broader question."
            )
        else:
            answer = build_no_context_response()
        return ChatResponse(
            answer=answer,
            intent=intent_result.intent.value,
            sources=[],
            session_id=body.session_id,
        )

    # ── Build prompt and call LLM ──────────────────────────────────────
    system_prompt, user_msg = build_prompt(query, relevant_docs)

    try:
        answer = await generate(system_prompt, user_msg, history_dicts)
    except LLMError as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"LLM service unavailable: {e}",
        )

    # ── Format sources for response (top 3 only) ───────────────────────
    sources = [
        SourceDocument(
            text=d.text[:300] + "…" if len(d.text) > 300 else d.text,
            metadata=d.metadata,
            score=round(d.score, 4),
        )
        for d in relevant_docs[:3]
    ]

    return ChatResponse(
        answer=answer,
        intent=intent_result.intent.value,
        sources=sources,
        session_id=body.session_id,
    )


# ── Forecast ───────────────────────────────────────────────────────────────────
@app.post("/forecast", response_model=ForecastResponse, tags=["Forecasting"])
@limiter.limit(f"{settings.rate_limit_rpm}/minute")
async def forecast(request: Request, body: ForecastRequest):
    """
    Prophet demand forecasting endpoint.

    Body: { metric, category, months }
    Returns historical data, forecast points, confidence intervals, and summary stats.
    """
    logger.info(f"Forecast request: metric={body.metric}, category={body.category}, months={body.months}")

    result: ForecastResult = await asyncio.to_thread(
        run_forecast,
        body.metric,
        body.category,
        body.months,
    )

    return ForecastResponse(
        metric=result.metric,
        category=result.category,
        months_ahead=result.months_ahead,
        historical=result.historical,
        forecast=result.forecast,
        trend=result.trend,
        peak_month=result.peak_month,
        growth_pct=result.growth_pct,
        confidence=result.confidence,
        error=result.error,
    )


# ── Forecast categories ────────────────────────────────────────────────────────
@app.get("/forecast/categories/{metric}", tags=["Forecasting"])
async def forecast_categories(metric: str):
    """Return available category values for a given metric (for frontend dropdowns)."""
    from forecasting.preprocess import get_available_categories
    categories = await asyncio.to_thread(get_available_categories, metric)
    return {"metric": metric, "categories": categories}


# ── Dev entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.ai_port,
        reload=True,
        log_level="info",
    )
