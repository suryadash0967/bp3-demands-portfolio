"""
forecasting/forecast.py — Prophet-based demand forecasting engine.

Returns historical data, point forecasts, confidence intervals,
trend direction, peak month, and growth percentage.

If historical data is insufficient (< 3 data points), returns a clear
error message instead of an unreliable prediction.
"""
from __future__ import annotations

import warnings
from dataclasses import dataclass
from typing import Any

import pandas as pd
from loguru import logger

from forecasting.preprocess import build_time_series, load_dataframe

# Suppress Prophet/Stan verbose output
warnings.filterwarnings("ignore")


@dataclass
class ForecastResult:
    metric: str
    category: str | None
    months_ahead: int

    # Historical data points
    historical: list[dict[str, Any]]

    # Forecast data points
    forecast: list[dict[str, Any]]

    # Summary stats
    trend: str          # "increasing" | "decreasing" | "stable"
    peak_month: str     # e.g. "Mar 2025"
    growth_pct: float   # % change from last historical to last forecast
    confidence: str     # "high" | "medium" | "low"

    # Error case
    error: str | None = None


def _trend_label(growth_pct: float) -> str:
    if growth_pct > 10:
        return "increasing"
    elif growth_pct < -10:
        return "decreasing"
    return "stable"


def _confidence_label(n_historical: int) -> str:
    if n_historical >= 12:
        return "high"
    elif n_historical >= 6:
        return "medium"
    return "low"


def run_forecast(
    metric: str = "overall",
    category: str | None = None,
    months_ahead: int = 6,
) -> ForecastResult:
    """
    Run a Prophet forecast for the specified metric and category.

    Args:
        metric: "overall" | "application" | "department" | "priority" |
                "project_type" | "work_area" | "vertical"
        category: Specific category value (required for non-overall metrics).
        months_ahead: Number of months to forecast (1–24).

    Returns:
        ForecastResult containing historical + forecast data and summary stats.
    """
    months_ahead = max(1, min(24, months_ahead))
    cat_display = category if category else "Overall"

    # ── Load and preprocess ────────────────────────────────────────────
    try:
        df = load_dataframe()
        ts = build_time_series(df, metric=metric, category=category)
    except ValueError as e:
        return ForecastResult(
            metric=metric, category=category, months_ahead=months_ahead,
            historical=[], forecast=[], trend="stable", peak_month="N/A",
            growth_pct=0.0, confidence="low", error=str(e),
        )
    except Exception as e:
        logger.error(f"Preprocessing error: {e}")
        return ForecastResult(
            metric=metric, category=category, months_ahead=months_ahead,
            historical=[], forecast=[], trend="stable", peak_month="N/A",
            growth_pct=0.0, confidence="low",
            error=f"Data loading error: {e}",
        )

    n = len(ts)
    logger.info(f"Forecasting {metric}/{cat_display}: {n} historical data points, {months_ahead} months ahead.")

    # ── Minimum data check ─────────────────────────────────────────────
    if n < 3:
        return ForecastResult(
            metric=metric, category=category, months_ahead=months_ahead,
            historical=_format_historical(ts), forecast=[],
            trend="stable", peak_month="N/A", growth_pct=0.0, confidence="low",
            error=(
                f"Insufficient historical data to generate a reliable forecast for "
                f"{metric}='{cat_display}' ({n} data point{'s' if n != 1 else ''} found; "
                f"at least 3 months of data are required)."
            ),
        )

    # ── Run Prophet ────────────────────────────────────────────────────
    try:
        from prophet import Prophet

        model = Prophet(
            yearly_seasonality=(n >= 12),
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.80,
            changepoint_prior_scale=0.05,
        )

        model.fit(ts)

        future = model.make_future_dataframe(periods=months_ahead, freq="MS")
        forecast_df = model.predict(future)

        # Clip negative predictions to 0
        forecast_df["yhat"] = forecast_df["yhat"].clip(lower=0)
        forecast_df["yhat_lower"] = forecast_df["yhat_lower"].clip(lower=0)
        forecast_df["yhat_upper"] = forecast_df["yhat_upper"].clip(lower=0)

    except Exception as e:
        logger.error(f"Prophet error: {e}")
        return ForecastResult(
            metric=metric, category=category, months_ahead=months_ahead,
            historical=_format_historical(ts), forecast=[],
            trend="stable", peak_month="N/A", growth_pct=0.0, confidence="low",
            error=f"Forecasting model error: {e}",
        )

    # ── Split historical vs future ─────────────────────────────────────
    historical_dates = set(ts["ds"].dt.strftime("%Y-%m-%d"))

    historical_rows = forecast_df[forecast_df["ds"].dt.strftime("%Y-%m-%d").isin(historical_dates)]
    future_rows = forecast_df[~forecast_df["ds"].dt.strftime("%Y-%m-%d").isin(historical_dates)]

    # ── Compute summary stats ──────────────────────────────────────────
    last_actual = float(ts["y"].iloc[-1]) if len(ts) > 0 else 0
    last_forecast = float(future_rows["yhat"].iloc[-1]) if len(future_rows) > 0 else last_actual
    growth_pct = ((last_forecast - last_actual) / last_actual * 100) if last_actual > 0 else 0.0

    # Peak month from the full forecast period
    all_rows = pd.concat([
        ts.rename(columns={"y": "yhat"})[["ds", "yhat"]],
        future_rows[["ds", "yhat"]],
    ])
    peak_idx = all_rows["yhat"].idxmax()
    peak_month_str = all_rows.loc[peak_idx, "ds"].strftime("%b %Y")

    confidence = _confidence_label(n)
    trend = _trend_label(growth_pct)

    return ForecastResult(
        metric=metric,
        category=category,
        months_ahead=months_ahead,
        historical=_format_historical(ts, forecast_df),
        forecast=_format_forecast(future_rows),
        trend=trend,
        peak_month=peak_month_str,
        growth_pct=round(growth_pct, 1),
        confidence=confidence,
        error=None,
    )


def _format_historical(
    ts: pd.DataFrame,
    forecast_df: pd.DataFrame | None = None,
) -> list[dict[str, Any]]:
    """Format historical time series for API response."""
    rows = []
    for _, row in ts.iterrows():
        point: dict[str, Any] = {
            "ds": row["ds"].strftime("%Y-%m-%d"),
            "label": row["ds"].strftime("%b %Y"),
            "actual": int(row["y"]),
        }
        # If we have forecast for historical period, add it for overlay
        if forecast_df is not None:
            match = forecast_df[forecast_df["ds"] == row["ds"]]
            if not match.empty:
                point["yhat"] = round(float(match.iloc[0]["yhat"]), 1)
                point["yhat_lower"] = round(float(match.iloc[0]["yhat_lower"]), 1)
                point["yhat_upper"] = round(float(match.iloc[0]["yhat_upper"]), 1)
        rows.append(point)
    return rows


def _format_forecast(future_rows: pd.DataFrame) -> list[dict[str, Any]]:
    """Format future forecast rows for API response."""
    rows = []
    for _, row in future_rows.iterrows():
        rows.append({
            "ds": row["ds"].strftime("%Y-%m-%d"),
            "label": row["ds"].strftime("%b %Y"),
            "yhat": max(0, round(float(row["yhat"]), 1)),
            "yhat_lower": max(0, round(float(row["yhat_lower"]), 1)),
            "yhat_upper": max(0, round(float(row["yhat_upper"]), 1)),
        })
    return rows
