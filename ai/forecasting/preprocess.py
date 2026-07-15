"""
forecasting/preprocess.py — Parse demands.xlsx into time-series DataFrames.

Supports grouping by: overall, application, department, priority,
project_type, work_area, vertical.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd
from loguru import logger

from config import settings


# Excel serial date epoch (days since 1900-01-01, with Lotus 1-2-3 bug)
_EXCEL_EPOCH = pd.Timestamp("1899-12-30")

# Map metric names → Excel column names
_METRIC_COLUMN_MAP: dict[str, str] = {
    "overall": None,                    # type: ignore
    "application": "Application",
    "department": "Requestor Department",
    "priority": "Priority",
    "project_type": "Project Type",
    "work_area": "Work Area",
    "vertical": "Requestor Vertical",
    "pm_department": "PM Department",
}

# Demand date column name(s) to try
_DATE_COLUMNS = ["Demand Request Date", "Request Date", "Date"]


def _parse_date_value(val) -> pd.Timestamp | None:
    """Convert a cell value (serial int, string, or datetime) to Timestamp."""
    if pd.isna(val) or val == "":
        return None
    if isinstance(val, (int, float)):
        try:
            return _EXCEL_EPOCH + pd.Timedelta(days=int(val))
        except Exception:
            return None
    try:
        return pd.Timestamp(val)
    except Exception:
        return None


def load_dataframe(excel_path: str | Path | None = None) -> pd.DataFrame:
    """
    Load demands.xlsx into a DataFrame with parsed dates.

    Args:
        excel_path: Path to the Excel file. Defaults to settings value.

    Returns:
        DataFrame with all columns + a parsed 'ds' column (Timestamp).
    """
    path = Path(excel_path or settings.excel_absolute_path)
    if not path.exists():
        raise FileNotFoundError(f"Excel not found: {path}")

    logger.info(f"Loading DataFrame from {path}")
    df = pd.read_excel(path, engine="openpyxl")

    # Normalise column names
    df.columns = [str(c).strip() for c in df.columns]

    # Aliases for common column name variations
    col_aliases = {
        "Demand Priority": "Priority",
        "Requestor Dept": "Requestor Department",
        "PM Dept": "PM Department",
    }
    df.rename(columns=col_aliases, inplace=True)

    # Parse date column into 'ds'
    date_col = None
    for candidate in _DATE_COLUMNS:
        if candidate in df.columns:
            date_col = candidate
            break

    if date_col:
        df["ds"] = df[date_col].apply(_parse_date_value)
    else:
        logger.warning("No date column found — forecasting will not work.")
        df["ds"] = None

    # Strip string columns
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip()
        df[col] = df[col].replace({"nan": "", "None": "", "NaN": ""})

    logger.info(f"DataFrame loaded: {len(df)} rows, {len(df.columns)} columns.")
    return df


def build_time_series(
    df: pd.DataFrame,
    metric: str = "overall",
    category: str | None = None,
) -> pd.DataFrame:
    """
    Aggregate the DataFrame into a monthly time-series for Prophet.

    Args:
        df: Full demands DataFrame with a 'ds' column.
        metric: One of the supported metric keys (see _METRIC_COLUMN_MAP).
        category: Category value to filter on (e.g., "SAP", "Finance").

    Returns:
        DataFrame with columns ['ds', 'y'] — monthly demand counts.
        ds is the first day of each month (Period start).

    Raises:
        ValueError: If metric is unsupported or category is required but missing.
    """
    if metric not in _METRIC_COLUMN_MAP:
        raise ValueError(
            f"Unknown metric '{metric}'. Supported: {list(_METRIC_COLUMN_MAP)}"
        )

    col = _METRIC_COLUMN_MAP[metric]

    # Apply category filter for non-overall metrics
    filtered = df.copy()
    if col and category:
        cat_lower = category.strip().lower()
        filtered = filtered[filtered[col].str.lower().str.strip() == cat_lower]
        if filtered.empty:
            raise ValueError(
                f"No data found for {metric}='{category}'. "
                "Check the value matches exactly what is in the Excel file."
            )

    # Drop rows with no date
    filtered = filtered.dropna(subset=["ds"])
    if filtered.empty:
        raise ValueError("No rows with valid dates found for the specified filter.")

    # Group by month
    filtered["month"] = filtered["ds"].dt.to_period("M")
    monthly = (
        filtered.groupby("month")
        .size()
        .reset_index(name="y")
    )
    monthly["ds"] = monthly["month"].dt.to_timestamp()
    monthly = monthly[["ds", "y"]].sort_values("ds").reset_index(drop=True)

    return monthly


def get_available_categories(metric: str) -> list[str]:
    """
    Return unique non-empty categories for a given metric.

    Useful for the frontend to populate dropdown options.
    """
    col = _METRIC_COLUMN_MAP.get(metric)
    if not col:
        return []
    try:
        df = load_dataframe()
        vals = df[col].dropna().unique().tolist()
        return sorted([v for v in vals if v.strip()])
    except Exception as e:
        logger.warning(f"Could not load categories for {metric}: {e}")
        return []
