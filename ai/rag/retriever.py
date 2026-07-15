"""
rag/retriever.py — Hybrid retrieval: metadata filter + vector similarity.

The retriever accepts an intent result from utils/intent.py, builds an
appropriate ChromaDB where-clause, and returns the top-K most relevant
document chunks with their metadata.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from chromadb import Collection
from loguru import logger

from config import settings
from rag.chroma import query_collection


@dataclass
class RetrievedDoc:
    text: str
    metadata: dict[str, str]
    score: float  # Cosine distance (lower = more similar)


def build_where_filter(entities: dict[str, str]) -> dict[str, Any] | None:
    """
    Convert extracted entities into a ChromaDB `where` filter.

    ChromaDB requires $and for multiple conditions.
    Single condition: {"field": {"$eq": "value"}}
    Multiple: {"$and": [{"f1": {"$eq": "v1"}}, {"f2": {"$eq": "v2"}}]}

    Only non-empty entity values are included.

    Args:
        entities: Dict of field → value extracted by intent detection.

    Returns:
        ChromaDB where dict, or None if no entities.
    """
    if not entities:
        return None

    conditions = []
    for field, value in entities.items():
        if value and value.strip():
            conditions.append({field: {"$eq": value.strip()}})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}


def retrieve(
    collection: Collection,
    query: str,
    entities: dict[str, str] | None = None,
    top_k: int | None = None,
) -> list[RetrievedDoc]:
    """
    Retrieve the most relevant documents for a user query.

    Pipeline:
    1. Build metadata filter from extracted entities (if any).
    2. Query ChromaDB with vector similarity + filter.
    3. Return sorted RetrievedDoc list.

    Args:
        collection: The ChromaDB collection.
        query: User's natural language query.
        entities: Dict of metadata field → extracted value (from intent detection).
        top_k: Number of documents to retrieve.

    Returns:
        List of RetrievedDoc sorted by relevance (ascending cosine distance).
    """
    k = top_k or settings.top_k
    where_filter = build_where_filter(entities or {})

    if where_filter:
        logger.debug(f"Applying metadata filter: {where_filter}")

    results = query_collection(
        collection=collection,
        query_text=query,
        where_filter=where_filter,
        top_k=k,
    )

    docs: list[RetrievedDoc] = []
    if not results or not results.get("documents"):
        return docs

    documents_list = results["documents"][0]
    metadatas_list = results["metadatas"][0]
    distances_list = results["distances"][0]

    for text, meta, dist in zip(documents_list, metadatas_list, distances_list):
        docs.append(RetrievedDoc(
            text=text or "",
            metadata=meta or {},
            score=float(dist),
        ))

    logger.debug(f"Retrieved {len(docs)} documents for query: '{query[:60]}…'")
    return docs


def format_context(docs: list[RetrievedDoc]) -> str:
    """
    Format retrieved documents into a context string for the LLM prompt.

    Each document is presented as a numbered entry with its text.
    """
    if not docs:
        return "No relevant documents found in the knowledge base."

    parts = []
    for i, doc in enumerate(docs, 1):
        parts.append(f"[Document {i}]\n{doc.text}")

    return "\n\n".join(parts)
