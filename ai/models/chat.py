"""
models/chat.py — Pydantic models for the /chat endpoint.
"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="User's question")
    session_id: str | None = Field(None, description="Optional session identifier")
    history: list[ChatMessage] = Field(default_factory=list, description="Previous messages in the conversation")

    @field_validator("query")
    @classmethod
    def sanitise_query(cls, v: str) -> str:
        """Strip whitespace and block suspiciously long or injection-like inputs."""
        v = v.strip()
        # Remove null bytes and control characters
        v = "".join(c for c in v if c >= " " or c in "\n\r\t")
        return v[:500]  # hard cap


class SourceDocument(BaseModel):
    text: str
    metadata: dict[str, str]
    score: float


class ChatResponse(BaseModel):
    answer: str
    intent: str
    sources: list[SourceDocument] = Field(default_factory=list)
    forecast: dict | None = None  # Populated when intent=forecast_request
    session_id: str | None = None
