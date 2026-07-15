"""
rag/chunker.py — Convert raw document dicts into (text, metadata) pairs.

Each demand row becomes one semantic text chunk plus a metadata dict
with all filterable fields. Metadata values must be strings for
ChromaDB compatibility.
"""
from __future__ import annotations


# Fields that go into the ChromaDB metadata (must all be strings)
METADATA_FIELDS = [
    "Application",
    "Priority",
    "Requestor Department",
    "Requestor Division",
    "Requestor Vertical",
    "Location Name",
    "Project Type",
    "Project Status",
    "Demand Status",
    "Work Area",
    "Impact",
    "Is Agile",
    "Is Migrated",
    "Demand Type",
    "PM Department",
    "PM Division",
    "PM Vertical",
    # ROI fields
    "ROI Cost Reduction",
    "ROI Effort Reduction",
    "ROI Additional Profit",
    "ROI Regulatory",
    "ROI User Experience Improvement",
    "ROI Branding",
    "ROI Security Enhancement",
    "ROI Performance Improvement",
]


def _safe(doc: dict, key: str) -> str:
    """Return cleaned string value or 'N/A' if blank."""
    v = doc.get(key, "").strip()
    return v if v else "N/A"


def _roi_section(doc: dict) -> str:
    """
    Build a human-readable ROI summary sentence from all ROI columns.
    Only includes ROI dimensions that have non-N/A values.
    """
    roi_fields = {
        "Cost Reduction":          _safe(doc, "ROI Cost Reduction"),
        "Effort Reduction":        _safe(doc, "ROI Effort Reduction"),
        "Additional Profit":       _safe(doc, "ROI Additional Profit"),
        "Regulatory Compliance":   _safe(doc, "ROI Regulatory"),
        "User Experience":         _safe(doc, "ROI User Experience Improvement"),
        "Branding":                _safe(doc, "ROI Branding"),
        "Security Enhancement":    _safe(doc, "ROI Security Enhancement"),
        "Performance Improvement": _safe(doc, "ROI Performance Improvement"),
    }
    # Keep only fields that have actual values
    present = {k: v for k, v in roi_fields.items() if v != "N/A"}
    if not present:
        return ""
    parts = ", ".join(f"{k}: {v}" for k, v in present.items())
    return f"ROI dimensions — {parts}."


def build_chunk_text(doc: dict) -> str:
    """
    Convert a document dict into a human-readable paragraph.

    The paragraph structure is designed for semantic similarity search:
    keywords are explicit, relationships are natural language.
    All meaningful columns — including ROI scores and Demand Desc —
    are embedded so the LLM can answer questions about them.
    """
    parts: list[str] = []

    demand_id    = _safe(doc, "Demand ID")
    app          = _safe(doc, "Application")
    priority     = _safe(doc, "Priority")
    proj_type    = _safe(doc, "Project Type")
    proj_status  = _safe(doc, "Project Status")
    demand_status = _safe(doc, "Demand Status")
    dept         = _safe(doc, "Requestor Department")
    division     = _safe(doc, "Requestor Division")
    vertical     = _safe(doc, "Requestor Vertical")
    location     = _safe(doc, "Location Name")
    requestor    = _safe(doc, "Requestor Name")
    owner        = _safe(doc, "Owner Name")
    pm_dept      = _safe(doc, "PM Department")
    pm_div       = _safe(doc, "PM Division")
    pm_vert      = _safe(doc, "PM Vertical")
    pm_name      = _safe(doc, "PM Name")
    work_area    = _safe(doc, "Work Area")
    impact       = _safe(doc, "Impact")
    agile        = _safe(doc, "Is Agile")
    migrated     = _safe(doc, "Is Migrated")
    demand_type  = _safe(doc, "Demand Type")
    req_date     = _safe(doc, "Demand Request Date")
    target_date  = _safe(doc, "Demand Target Date")
    proj_name    = _safe(doc, "Project Title")
    proj_key     = _safe(doc, "Project Key")
    description  = _safe(doc, "Demand Desc")

    # ── Core sentence ──────────────────────────────────────────────────
    intro = (
        f"Demand {demand_id} is a {priority} priority {demand_type} request "
        f"for the {app} application."
    )
    parts.append(intro)

    # ── Project context ────────────────────────────────────────────────
    if proj_name and proj_name != "N/A":
        proj_ref = f" (key: {proj_key})" if proj_key and proj_key != "N/A" else ""
        parts.append(f"The project is titled '{proj_name}'{proj_ref}.")
    parts.append(
        f"It is classified as a {proj_type} project currently in {proj_status} status, "
        f"with the demand status being {demand_status}."
    )

    # ── Requestor context ──────────────────────────────────────────────
    requestor_parts = [f"The request was raised by the {dept} department"]
    if division and division != "N/A":
        requestor_parts.append(f"({division} division)")
    requestor_parts.append(f"under the {vertical} vertical.")
    if requestor and requestor != "N/A":
        requestor_parts.append(f"Requested by: {requestor}.")
    if location and location != "N/A":
        requestor_parts.append(f"Location: {location}.")
    if owner and owner != "N/A":
        requestor_parts.append(f"Owner: {owner}.")
    parts.append(" ".join(requestor_parts))

    # ── PM context ────────────────────────────────────────────────────
    pm_parts = [f"The PM department responsible is {pm_dept}"]
    if pm_div and pm_div != "N/A":
        pm_parts.append(f"({pm_div} division,")
        if pm_vert and pm_vert != "N/A":
            pm_parts.append(f"{pm_vert} vertical)")
        else:
            pm_parts.append(")")
    if pm_name and pm_name != "N/A":
        pm_parts.append(f"managed by {pm_name}.")
    parts.append(" ".join(pm_parts) + ".")

    # ── Technical attributes ───────────────────────────────────────────
    parts.append(
        f"Work area: {work_area}. Impact level: {impact}. "
        f"Agile methodology: {agile}. Migration status: {migrated}."
    )

    # ── Dates ─────────────────────────────────────────────────────────
    date_parts = []
    if req_date and req_date != "N/A":
        date_parts.append(f"Demand request date: {req_date}")
    if target_date and target_date != "N/A":
        date_parts.append(f"target date: {target_date}")
    if date_parts:
        parts.append(". ".join(date_parts) + ".")

    # ── ROI section ────────────────────────────────────────────────────
    roi = _roi_section(doc)
    if roi:
        parts.append(roi)

    # ── Description (full text for semantic search) ────────────────────
    if description and description != "N/A":
        parts.append(f"Description: {description}")

    return " ".join(parts)


def build_metadata(doc: dict) -> dict[str, str]:
    """
    Extract filterable metadata from a document dict.

    All values are coerced to strings (ChromaDB requirement).
    Blank values are stored as empty string "" to allow $ne filtering.
    """
    meta: dict[str, str] = {}
    # Always include Demand ID in metadata for source display
    meta["Demand ID"] = doc.get("Demand ID", "").strip()
    for field in METADATA_FIELDS:
        val = doc.get(field, "").strip()
        meta[field] = val
    return meta


def chunk_documents(documents: list[dict]) -> tuple[list[str], list[dict], list[str]]:
    """
    Convert a list of document dicts into parallel lists of:
    - texts: semantic chunk strings
    - metadatas: metadata dicts
    - ids: unique document IDs

    Returns:
        (texts, metadatas, ids)
    """
    texts: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for i, doc in enumerate(documents):
        text = build_chunk_text(doc)
        meta = build_metadata(doc)

        # Use Demand ID if available, otherwise generate one
        demand_id = doc.get("Demand ID", "").strip()
        doc_id = f"demand_{demand_id}" if demand_id else f"demand_row_{i}"

        texts.append(text)
        metadatas.append(meta)
        ids.append(doc_id)

    return texts, metadatas, ids
