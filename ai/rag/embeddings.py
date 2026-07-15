"""
rag/embeddings.py — Singleton SentenceTransformer wrapper.

The model is loaded once at startup and reused for all embedding calls.
This avoids repeated disk I/O and model initialisation overhead.
"""
from __future__ import annotations

import numpy as np
from loguru import logger
from sentence_transformers import SentenceTransformer

from config import settings


class EmbeddingService:
    """Thread-safe singleton wrapper around SentenceTransformer."""

    _instance: "EmbeddingService | None" = None
    _model: SentenceTransformer | None = None

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load(self) -> None:
        if self._model is None:
            logger.info(f"Loading embedding model: {settings.embed_model}")
            self._model = SentenceTransformer(settings.embed_model)
            logger.info("Embedding model loaded.")

    @property
    def model(self) -> SentenceTransformer:
        self._load()
        return self._model  # type: ignore[return-value]

    def encode(self, texts: list[str], batch_size: int = 64) -> list[list[float]]:
        """
        Encode a list of strings into embedding vectors.

        Args:
            texts: Input strings to embed.
            batch_size: Number of texts per batch (default 64).

        Returns:
            List of embedding vectors (list of floats).
        """
        self._load()
        embeddings: np.ndarray = self._model.encode(  # type: ignore[union-attr]
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return embeddings.tolist()

    def encode_query(self, query: str) -> list[float]:
        """Encode a single query string."""
        return self.encode([query])[0]


# Module-level singleton
embedding_service = EmbeddingService()
