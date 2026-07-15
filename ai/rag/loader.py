"""
rag/loader.py — Load and parse demands.xlsx into structured row dicts.

Each row in the Excel file becomes one document dict with cleaned,
trimmed string values. Blank cells are kept as empty strings so
downstream code can decide what to skip.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import openpyxl
from loguru import logger


# Column aliases: map possible Excel header variations → canonical field name
_COLUMN_ALIASES: dict[str, str] = {
    # Core IDs
    "demand id": "Demand ID",
    "demand_id": "Demand ID",
    "id": "Demand ID",
    # Description
    "demand desc": "Demand Desc",
    "demand description": "Demand Desc",
    "description": "Demand Desc",
    # Application
    "application": "Application",
    "app": "Application",
    # Priority
    "demand priority": "Priority",
    "priority": "Priority",
    # Project fields
    "project type": "Project Type",
    "project status": "Project Status",
    "project title": "Project Title",
    "project key": "Project Key",
    "demand status": "Demand Status",
    "status": "Project Status",
    # Requestor fields
    "requestor department": "Requestor Department",
    "department": "Requestor Department",
    "requestor vertical": "Requestor Vertical",
    "vertical": "Requestor Vertical",
    "requestor division": "Requestor Division",
    "requestor name": "Requestor Name",
    "location name": "Location Name",
    "requestor staff id": "Requestor Staff ID",
    "owner name": "Owner Name",
    "owner staff id": "Owner Staff ID",
    # PM fields
    "pm department": "PM Department",
    "pm division": "PM Division",
    "pm vert": "PM Vertical",
    "pm name": "PM Name",
    "pm staff id": "PM Staff ID",
    # Attributes
    "work area": "Work Area",
    "impact": "Impact",
    "agile": "Is Agile",
    "is agile": "Is Agile",
    "migrated": "Is Migrated",
    "is migrated": "Is Migrated",
    "demand type": "Demand Type",
    # ROI columns
    "roi cost reduction": "ROI Cost Reduction",
    "roi effort reduction": "ROI Effort Reduction",
    "additional profit": "ROI Additional Profit",
    "roi regulatory": "ROI Regulatory",
    "roi user exp improvement": "ROI User Experience Improvement",
    "roi branding": "ROI Branding",
    "roi security enhancement": "ROI Security Enhancement",
    "roi performance improvement": "ROI Performance Improvement",
    # Date fields
    "demand request date": "Demand Request Date",
    "request date": "Demand Request Date",
    "demand target date": "Demand Target Date",
    "dpm approval date": "DPM Approval Date",
    "dm approval date": "DM Approval Date",
    "dm approved by": "DM Approved By",
    "project created date": "Project Created Date",
    "actual start date": "Actual Start Date",
    "actual end date": "Actual End Date",
    "planned start date": "Planned Start Date",
    "planned end date": "Planned End Date",
    # Other
    "project name": "Project Title",
    "epic assignee": "Epic Assignee",
    "epic key": "Epic Key",
    "emgergency sr no": "Emergency Sr No",
    "emergency sr no": "Emergency Sr No",
}


def _normalise_header(header: str) -> str:
    """Return canonical field name for a given header, or the header itself."""
    return _COLUMN_ALIASES.get(str(header).strip().lower(), str(header).strip())


def _cell_value(cell: Any) -> str:
    """Convert a cell value to a clean string."""
    if cell is None:
        return ""
    v = str(cell).strip()
    # Remove Excel error strings
    if v.startswith("#"):
        return ""
    return v


def load_documents(excel_path: str | Path) -> list[dict[str, str]]:
    """
    Load demands.xlsx and return a list of row dicts.

    Each dict has canonical field names (Application, Priority, etc.)
    as keys and cleaned string values. Rows where every meaningful
    field is empty are skipped.

    Args:
        excel_path: Absolute or relative path to the Excel file.

    Returns:
        List of row dicts, one per data row in the first sheet.

    Raises:
        FileNotFoundError: If the Excel file does not exist.
        ValueError: If the file has no readable data rows.
    """
    path = Path(excel_path)
    if not path.exists():
        raise FileNotFoundError(f"Excel knowledge base not found at: {path}")

    logger.info(f"Loading knowledge base from {path}")

    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb.worksheets[0]

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        raise ValueError("Excel file is empty.")

    # First row = headers
    raw_headers = rows[0]
    headers = [_normalise_header(h) if h else f"Col_{i}" for i, h in enumerate(raw_headers)]

    documents: list[dict[str, str]] = []
    skipped = 0

    for row_idx, row in enumerate(rows[1:], start=2):
        doc = {headers[i]: _cell_value(v) for i, v in enumerate(row) if i < len(headers)}

        # Skip completely empty rows
        meaningful = [v for k, v in doc.items() if v and k not in ("Demand ID",)]
        if not meaningful:
            skipped += 1
            continue

        documents.append(doc)

    wb.close()
    logger.info(f"Loaded {len(documents)} documents ({skipped} empty rows skipped).")
    return documents


def get_file_fingerprint(excel_path: str | Path) -> str:
    """Return a fingerprint string (mtime + size) to detect file changes."""
    p = Path(excel_path)
    if not p.exists():
        return "missing"
    stat = p.stat()
    return f"{stat.st_mtime:.0f}:{stat.st_size}"
