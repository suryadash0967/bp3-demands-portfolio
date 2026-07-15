"""
rag/embeddings.py — Singleton Embedding Function using ONNX.

Uses ChromaDB's DefaultEmbeddingFunction (all-MiniLM-L6-v2 via ONNX) 
instead of PyTorch to keep memory usage well under 512MB for Render Free Tier.
"""
from __future__ import annotations

from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from loguru import logger

from config import settings


class EmbeddingService:
    """Thread-safe singleton wrapper around ONNX embedding function."""

    _instance: "EmbeddingService | None" = None
    _func: DefaultEmbeddingFunction | None = None

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load(self) -> None:
        if self._func is None:
            logger.info("Loading ONNX embedding model (Low RAM Mode)...")
            # This automatically downloads and uses all-MiniLM-L6-v2 via ONNX
            self._func = DefaultEmbeddingFunction()
            logger.info("ONNX embedding model loaded.")

    def encode(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """
        Encode a list of strings into embedding vectors using ONNX.
        """
        self._load()
        all_embeddings = []
        # Process in batches to save memory
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = self._func(batch)  # type: ignore
            # Chroma returns embeddings as a list of numpy arrays or lists
            if hasattr(embeddings, "tolist"):
                embeddings = embeddings.tolist()
            all_embeddings.extend(embeddings)
        return all_embeddings

    def encode_query(self, query: str) -> list[float]:
        """Encode a single query string."""
        self._load()
        emb = self._func([query])[0]  # type: ignore
        if hasattr(emb, "tolist"):
            return emb.tolist()
        return emb


# Module-level singleton
embedding_service = EmbeddingService()
