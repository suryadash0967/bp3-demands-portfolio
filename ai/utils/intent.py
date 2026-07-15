"""
utils/intent.py — Intent detection and entity extraction.

Analyses the user query to:
1. Classify intent type (dataset_qa, semantic_search, insight, forecast_request).
2. Extract metadata entities (Application, Priority, Department, etc.)
3. Build ChromaDB-compatible where filters from those entities.
4. Detect forecast requests and extract forecast parameters.

This is rule-based / keyword-based — no LLM call needed for intent,
keeping latency low and behaviour deterministic.

All entity values are matched against the ACTUAL values present in the
demands.xlsx file, with case-insensitive matching applied at comparison time.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum


class IntentType(str, Enum):
    DATASET_QA = "dataset_qa"
    SEMANTIC_SEARCH = "semantic_search"
    INSIGHT = "insight"
    FORECAST_REQUEST = "forecast_request"
    UNKNOWN = "unknown"


# ── Known value maps — matched against actual Excel data ──────────────────────

# Exact values from Demand Priority column
_PRIORITY_MAP: dict[str, str] = {
    "critical": "Critical",
    "high":     "High",
    "medium":   "Medium",
    "low":      "Low",
}

# Exact values from Demand Type column
_DEMAND_TYPE_MAP: dict[str, str] = {
    "feature enhancement":    "Feature Enhancement",
    "feature":                "Feature Enhancement",
    "report development":     "Report Development",
    "report":                 "Report Development",
    "technology enhancement": "Technology Enhancement",
    "tech enhancement":       "Technology Enhancement",
    "configuration":          "Configuration Changes",
    "config":                 "Configuration Changes",
    "configuration changes":  "Configuration Changes",
    "policy":                 "Policy/Statuatory",
    "statutory":              "Policy/Statuatory",
    "transformation":         "Transformation Request",
    "others":                 "Others",
}

# Exact values from Demand Status column
_DEMAND_STATUS_MAP: dict[str, str] = {
    "aa approval":            "AA Approval",
    "aut spoc approval":      "AUT SPOC Approval",
    "aut spoc approved":      "AUT SPOC Approved",
    "ci approval":            "CI Approval",
    "dgbp approval":          "DGBP Approval",
    "dgbp approved":          "DGBP Approved",
    "dgbp rejected":          "DGBP Rejected",
    "dm approval":            "DM Approval",
    "dm approved":            "DM Approved",
    "dm rejected":            "DM Rejected",
    "dpm approval":           "DPM Approval",
    "dpm rejected":           "DPM Rejected",
    "pm rejected":            "PM Rejected",
    "project created":        "Project Created",
    "spoc reassignment":      "SPOC Reassignment",
    "vc approval":            "VC Approval",
    "approved":               "DM Approved",
    "rejected":               "DM Rejected",
    "created":                "Project Created",
}

# Exact values from Project Status column
_PROJECT_STATUS_MAP: dict[str, str] = {
    "completed":              "Completed",
    "closed":                 "Closed/Completed",
    "closed/completed":       "Closed/Completed",
    "close":                  "Closed/Completed",
    "yet to start":           "Yet To Start",
    "not started":            "Yet To Start",
    "to do":                  "To Do",
    "todo":                   "To Do",
    "in development":         "In Development",
    "development":            "In Development",
    "in progress":            "In Progress",
    "in uat":                 "In UAT",
    "uat":                    "In UAT",
    "in release":             "In Release",
    "design":                 "Design",
    "rejected":               "Rejected",
    "in progress":            "In Progress",
}

# Exact values from Project Type column
_PROJECT_TYPE_MAP: dict[str, str] = {
    "type a": "Type A",
    "type b": "Type B",
    "type c": "Type C",
    "a type": "Type A",
    "b type": "Type B",
    "c type": "Type C",
}

# Exact values from Impact column
_IMPACT_MAP: dict[str, str] = {
    "enterprise":   "Enterprise",
    "division":     "Division",
    "department":   "Department",
    "function":     "Function",
    "sub-function": "Sub-Function",
    "subfunction":  "Sub-Function",
}

# Work Area values from Excel (stored in uppercase/mixed case)
# Note: "de" is intentionally omitted — it causes false matches in words like "migrated", "agile"
_WORK_AREA_MAP: dict[str, str] = {
    "production":   "PRODUCTION",
    "finance":      "Finance",
    "hr":           "HR",
    "scmgt":        "SCMGT",
    "quality":      "QUALITY",
    "qa":           "QA",
    "spares":       "SPARES",
    "export sales": "Export Sales",
    "domestic sales": "Domestic Sales - Logistics",
    "logistics":    "Domestic Sales - Logistics",
}

_FORECAST_METRICS = {
    "overall":      "overall",
    "department":   "department",
    "application":  "application",
    "app":          "application",
    "priority":     "priority",
    "project type": "project_type",
    "work area":    "work_area",
    "vertical":     "vertical",
}

# Keywords that suggest forecast intent
_FORECAST_KEYWORDS = {
    "forecast", "predict", "projection", "trend", "next month",
    "next quarter", "next year", "future", "upcoming", "estimate",
}

# Keywords that suggest insight intent
_INSIGHT_KEYWORDS = {
    "summarize", "summary", "overview", "insight", "workload",
    "busiest", "highest", "most", "analysis", "analyze", "distribution",
    "breakdown", "compare", "comparison", "average", "avg", "mean",
}

# Keywords that suggest dataset_qa intent (counting / specific lookup)
_QA_KEYWORDS = {
    "how many", "count", "total", "number of", "list", "show",
    "which department", "which application", "what is the", "what are",
    "who", "when", "status of", "priority of", "give me", "find",
    "display", "tell me", "get", "fetch",
}


@dataclass
class IntentResult:
    intent: IntentType = IntentType.UNKNOWN
    entities: dict[str, str] = field(default_factory=dict)
    forecast_params: dict[str, str | int] = field(default_factory=dict)
    raw_query: str = ""


def _extract_application(query_lower: str) -> str | None:
    """
    Attempt to extract an application name from the query.
    """
    app_patterns = [
        r"\bsap\b(?:\s+\w+)?(?:\s*-\s*\w+)?",  # SAP, SAP PP, SAP PP - SAP PP
        r"\boracle\b(?:\s+\w+)?",
        r"\bsalesforce\b",
        r"\bservicenow\b",
        r"\bworkday\b",
        r"\bsuccess\s*factors\b",
        r"\bariba\b",
        r"\bconcur\b",
        r"\bhrms\b",
        r"\berp\b",
        r"\bcrm\b",
    ]
    for pat in app_patterns:
        m = re.search(pat, query_lower)
        if m:
            return m.group(0).title()
    return None


def _extract_months(query_lower: str) -> int:
    """Extract number of months from forecast queries."""
    m = re.search(r"(\d+)\s+month", query_lower)
    if m:
        return min(int(m.group(1)), 24)
    if "quarter" in query_lower:
        return 3
    if "year" in query_lower or "annual" in query_lower:
        return 12
    return 6  # default


def _match_map(query_lower: str, value_map: dict[str, str]) -> str | None:
    """
    Return the canonical value from value_map whose key appears in query_lower.
    Matches longest key first to avoid partial matches.
    """
    # Sort by length descending so "closed/completed" beats "closed"
    for key in sorted(value_map.keys(), key=len, reverse=True):
        if key in query_lower:
            return value_map[key]
    return None


def detect_intent(query: str) -> IntentResult:
    """
    Analyse a user query and return an IntentResult.

    Args:
        query: Raw user query string.

    Returns:
        IntentResult with classified intent, extracted entities,
        and forecast params if applicable.
    """
    result = IntentResult(raw_query=query)
    q = query.strip().lower()

    entities: dict[str, str] = {}

    # ── 1. Forecast intent ─────────────────────────────────────────────
    if any(kw in q for kw in _FORECAST_KEYWORDS):
        result.intent = IntentType.FORECAST_REQUEST

        metric = "overall"
        for phrase, key in _FORECAST_METRICS.items():
            if phrase in q:
                metric = key
                break

        category = None
        app = _extract_application(q)
        if app:
            category = app
        elif metric == "priority":
            val = _match_map(q, _PRIORITY_MAP)
            if val:
                category = val

        result.forecast_params = {
            "metric": metric,
            "category": category or "",
            "months": _extract_months(q),
        }
        return result

    # ── 2. Is Migrated ─────────────────────────────────────────────────
    if "migrat" in q:
        if "not" in q or "non" in q or "un" in q:
            entities["Is Migrated"] = "No"
        else:
            entities["Is Migrated"] = "Yes"

    # ── 3. Is Agile ────────────────────────────────────────────────────
    if "agile" in q:
        if "non" in q or "not" in q:
            entities["Is Agile"] = "No"
        else:
            entities["Is Agile"] = "Yes"

    # ── 4. Priority entity ─────────────────────────────────────────────
    priority = _match_map(q, _PRIORITY_MAP)
    if priority:
        entities["Priority"] = priority

    # ── 5. Application entity ──────────────────────────────────────────
    app = _extract_application(q)
    if app:
        entities["Application"] = app

    # ── 6. Demand Status ───────────────────────────────────────────────
    demand_status = _match_map(q, _DEMAND_STATUS_MAP)
    if demand_status:
        entities["Demand Status"] = demand_status

    # ── 7. Project Status ──────────────────────────────────────────────
    proj_status = _match_map(q, _PROJECT_STATUS_MAP)
    if proj_status:
        entities["Project Status"] = proj_status

    # ── 8. Project Type ────────────────────────────────────────────────
    proj_type = _match_map(q, _PROJECT_TYPE_MAP)
    if proj_type:
        entities["Project Type"] = proj_type

    # ── 9. Demand Type ─────────────────────────────────────────────────
    demand_type = _match_map(q, _DEMAND_TYPE_MAP)
    if demand_type:
        entities["Demand Type"] = demand_type

    # ── 10. Work Area ──────────────────────────────────────────────────
    work_area = _match_map(q, _WORK_AREA_MAP)
    if work_area:
        entities["Work Area"] = work_area

    # ── 11. Impact ─────────────────────────────────────────────────────
    impact = _match_map(q, _IMPACT_MAP)
    if impact:
        entities["Impact"] = impact

    result.entities = entities

    # ── Classify intent type ───────────────────────────────────────────
    if any(kw in q for kw in _INSIGHT_KEYWORDS):
        result.intent = IntentType.INSIGHT
    elif any(kw in q for kw in _QA_KEYWORDS):
        result.intent = IntentType.DATASET_QA
    else:
        result.intent = IntentType.SEMANTIC_SEARCH

    return result
