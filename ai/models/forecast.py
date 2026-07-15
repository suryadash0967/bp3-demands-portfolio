"""
models/forecast.py — Pydantic models for the /forecast endpoint.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


VALID_METRICS = Literal[
    "overall", "application", "department", "priority",
    "project_type", "work_area", "vertical", "pm_department"
]


class ForecastRequest(BaseModel):
    metric: str = Field("overall", description="Grouping metric for the forecast")
    category: str | None = Field(None, description="Category value (e.g. 'SAP', 'Finance')")
    months: int = Field(6, ge=1, le=24, description="Number of months to forecast ahead")

    @field_validator("metric")
    @classmethod
    def validate_metric(cls, v: str) -> str:
        allowed = {
            "overall", "application", "department", "priority",
            "project_type", "work_area", "vertical", "pm_department",
        }
        v = v.strip().lower()
        if v not in allowed:
            raise ValueError(f"metric must be one of {allowed}")
        return v

    @field_validator("category")
    @classmethod
    def sanitise_category(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return v.strip()[:100] or None


class DataPoint(BaseModel):
    ds: str               # ISO date string "YYYY-MM-DD"
    label: str            # Human-readable "Jan 2024"
    actual: int | None = None
    yhat: float | None = None
    yhat_lower: float | None = None
    yhat_upper: float | None = None


class ForecastResponse(BaseModel):
    metric: str
    category: str | None
    months_ahead: int
    historical: list[dict[str, Any]]
    forecast: list[dict[str, Any]]
    trend: str
    peak_month: str
    growth_pct: float
    confidence: str
    error: str | None = None
