"""
rag/chroma.py — ChromaDB client, collection management, and vector operations.

Key behaviours:
- Persistent storage at CHROMA_PATH (survives restarts).
- Auto-rebuild when demands.xlsx fingerprint changes.
- Embeddings are computed via our SentenceTransformer service, not
  ChromaDB's built-in embedding function, for full control.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import chromadb
from chromadb import Collection
from loguru import logger

from config import settings
from rag.chunker import chunk_documents
from rag.embeddings import embedding_service
from rag.loader import get_file_fingerprint, load_documents


# Path for the fingerprint cache file
_FINGERPRINT_FILE = Path(settings.chroma_absolute_path) / ".fingerprint"


def _get_stored_fingerprint() -> str:
    if _FINGERPRINT_FILE.exists():
        return _FINGERPRINT_FILE.read_text().strip()
    return ""


def _save_fingerprint(fp: str) -> None:
    _FINGERPRINT_FILE.parent.mkdir(parents=True, exist_ok=True)
    _FINGERPRINT_FILE.write_text(fp)


def _get_client() -> chromadb.PersistentClient:
    path = str(settings.chroma_absolute_path)
    Path(path).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=path)


def build_or_load_collection(force_rebuild: bool = False) -> Collection:
    """
    Return the ChromaDB collection, building it if necessary.

    Rebuilds when:
    - force_rebuild=True is passed.
    - The demands.xlsx fingerprint has changed since last build.
    - The collection is empty.

    Args:
        force_rebuild: If True, always drop and rebuild the collection.

    Returns:
        The loaded/built ChromaDB collection.
    """
    client = _get_client()
    excel_path = settings.excel_absolute_path
    current_fp = get_file_fingerprint(excel_path)
    stored_fp = _get_stored_fingerprint()

    needs_rebuild = force_rebuild or (current_fp != stored_fp)

    if not needs_rebuild:
        try:
            collection = client.get_collection(settings.collection_name)
            if collection.count() > 0:
                logger.info(
                    f"Loaded existing ChromaDB collection '{settings.collection_name}' "
                    f"({collection.count()} docs)."
                )
                return collection
            # Collection exists but is empty — rebuild
            needs_rebuild = True
        except Exception:
            needs_rebuild = True

    if needs_rebuild:
        logger.info("Building ChromaDB collection from knowledge base…")

        # Drop existing collection if present
        try:
            client.delete_collection(settings.collection_name)
            logger.debug("Dropped existing collection.")
        except Exception:
            pass

        collection = client.create_collection(
            name=settings.collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        # Load, chunk, embed, upsert
        documents = load_documents(excel_path)
        texts, metadatas, ids = chunk_documents(documents)

        logger.info(f"Embedding {len(texts)} documents…")
        embeddings = embedding_service.encode(texts)

        # ChromaDB upsert in batches of 500
        batch_size = 500
        for start in range(0, len(texts), batch_size):
            end = start + batch_size
            collection.upsert(
                ids=ids[start:end],
                embeddings=embeddings[start:end],
                documents=texts[start:end],
                metadatas=metadatas[start:end],
            )
            logger.debug(f"Upserted batch {start}:{end}")

        _save_fingerprint(current_fp)
        logger.info(
            f"Collection '{settings.collection_name}' built with {collection.count()} documents."
        )

    return collection


def query_collection(
    collection: Collection,
    query_text: str,
    where_filter: dict[str, Any] | None = None,
    top_k: int | None = None,
) -> dict[str, Any]:
    """
    Query the collection using vector similarity + optional metadata filter.

    Args:
        collection: The ChromaDB collection to query.
        query_text: User query string.
        where_filter: Optional ChromaDB `where` clause for metadata filtering.
        top_k: Number of results to return (default: settings.top_k).

    Returns:
        ChromaDB query result dict with keys: ids, documents, metadatas, distances.
    """
    k = top_k or settings.top_k
    query_embedding = embedding_service.encode_query(query_text)

    kwargs: dict[str, Any] = {
        "query_embeddings": [query_embedding],
        "n_results": min(k, collection.count() or 1),
        "include": ["documents", "metadatas", "distances"],
    }

    if where_filter:
        # Only apply filter if the collection has metadata
        kwargs["where"] = where_filter

    try:
        results = collection.query(**kwargs)
        return results
    except Exception as e:
        # If filter causes an error (e.g. no matching docs), retry without filter
        if where_filter:
            logger.warning(f"Filtered query failed ({e}), retrying without filter.")
            kwargs.pop("where", None)
            return collection.query(**kwargs)
        raise


def get_collection_stats(collection: Collection) -> dict[str, Any]:
    """Return basic stats about the collection."""
    count = collection.count()
    return {
        "collection": settings.collection_name,
        "document_count": count,
        "embed_model": settings.embed_model,
        "excel_path": str(settings.excel_absolute_path),
        "chroma_path": str(settings.chroma_absolute_path),
    }
