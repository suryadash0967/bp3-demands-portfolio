# DE-BP3 Enterprise AI Module — Setup Guide

## Architecture Overview

```
React (port 5173)
    ↓  /api/chat, /api/forecast
Express (port 3001)          ← handles auth, users, sessions, AI gateway
    ↓  HTTP proxy
FastAPI AI Service (port 8000)  ← RAG, embeddings, forecasting
    ↓
ChromaDB (./ai/chroma_store/)  ← persistent vector store
sentence-transformers           ← all-MiniLM-L6-v2 embeddings
Prophet                         ← demand forecasting
LLM (Ollama or OpenAI-compatible)
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.10+ | Required for FastAPI + Prophet |
| Node.js | 18+ | Already installed |
| Ollama OR OpenAI key | — | For LLM responses |

### Install Ollama (recommended — free, local, offline)

1. Download from https://ollama.com
2. Install and run: `ollama serve`
3. Pull the model: `ollama pull llama3`

> Alternative: Use any OpenAI-compatible API (Groq, Together AI, etc.) by setting `LLM_BACKEND=openai` in `ai/.env`.

### Windows: C++ Build Tools (required for Prophet/pystan)

If you don't have Visual C++ Build Tools:
1. Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Install "Desktop development with C++" workload
3. Restart your terminal

---

## Step 1: Set Up the Python AI Service

```powershell
# Navigate to the ai/ directory
cd ai

# Create a virtual environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\activate

# Install dependencies (this may take 5–10 minutes)
pip install -r requirements.txt
```

### Configure the AI service

```powershell
# Copy the example env file
copy .env.example .env

# Edit ai/.env — set your LLM backend:
# For Ollama (free, local):
#   LLM_BACKEND=ollama
#   OLLAMA_MODEL=llama3
#
# For OpenAI / Groq / etc.:
#   LLM_BACKEND=openai
#   OPENAI_API_KEY=your-key-here
#   OPENAI_BASE_URL=https://api.openai.com/v1   (or Groq: https://api.groq.com/openai/v1)
#   OPENAI_MODEL=gpt-4o-mini
```

### Start the AI service

py -3.12 -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install prophet
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

On first start, the service will:
1. Load `demands.xlsx` from `src/data/demands.xlsx`
2. Embed all rows with `all-MiniLM-L6-v2`
3. Build the ChromaDB collection at `ai/chroma_store/`
4. Start serving on `http://localhost:8000`

> **First-start time**: 2–5 minutes depending on the Excel file size and your hardware.
> Subsequent starts are instant (collection is cached).

Verify it works:
```powershell
curl http://localhost:8000/health
```

---

## Step 2: Install Node.js dependencies

```powershell
cd backend
npm install
```

This installs `node-fetch` which is the new dependency for the AI proxy routes.

---

## Step 3: Start all services

Open **3 terminals**:

**Terminal 1 — AI Service:**
```powershell
cd ai
.\venv\Scripts\activate
python main.py
```

**Terminal 2 — Express Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 3 — React Frontend:**
```powershell
npm run dev
```

---

## What's New

### FastAPI AI Service (`ai/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, all routes |
| `config.py` | Settings from .env |
| `rag/loader.py` | Excel → structured documents |
| `rag/chunker.py` | Row → semantic text + metadata |
| `rag/embeddings.py` | SentenceTransformer singleton |
| `rag/chroma.py` | ChromaDB CRUD, auto-rebuild |
| `rag/retriever.py` | Hybrid metadata+vector retrieval |
| `rag/prompt.py` | Closed-domain system prompt |
| `utils/intent.py` | Query intent detection + entity extraction |
| `utils/llm.py` | Ollama / OpenAI LLM client |
| `utils/logger.py` | Loguru structured logging |
| `forecasting/preprocess.py` | Excel → time-series DataFrames |
| `forecasting/forecast.py` | Prophet forecasting engine |
| `models/chat.py` | Pydantic: ChatRequest, ChatResponse |
| `models/forecast.py` | Pydantic: ForecastRequest, ForecastResponse |

### Express Changes

| File | Change |
|------|--------|
| `backend/routes/aiRoutes.js` | NEW — proxy routes for /api/chat, /api/forecast |
| `backend/server.js` | Mounts aiRoutes |
| `backend/package.json` | Added `node-fetch` |
| `backend/.env` | Added `AI_SERVICE_URL` |

### Frontend Changes

| File | Change |
|------|--------|
| `src/App.jsx` | Added `/forecast` route + `ChatWidget` |
| `src/components/ChatWidget/ChatWidget.jsx` | NEW — floating AI chat widget |
| `src/components/ChatWidget/ChatWidget.css` | NEW — widget styles |
| `src/pages/Forecast.jsx` | NEW — forecast dashboard page |
| `src/pages/Forecast.css` | NEW — forecast page styles |
| `src/components/Sidebar/Sidebar.jsx` | Added Forecasting nav item |

---

## API Reference

### Chat

```http
POST /api/chat
Content-Type: application/json
Cookie: token=<jwt>

{
  "query": "How many high priority demands exist?",
  "session_id": "optional-string"
}
```

Response:
```json
{
  "answer": "Based on the DE-BP3 knowledge base...",
  "intent": "dataset_qa",
  "sources": [{ "text": "...", "metadata": {...}, "score": 0.12 }],
  "forecast": null
}
```

### Forecast

```http
POST /api/forecast
Content-Type: application/json
Cookie: token=<jwt>

{
  "metric": "overall",
  "category": null,
  "months": 6
}
```

Supported metrics: `overall`, `application`, `department`, `priority`, `project_type`, `work_area`, `vertical`, `pm_department`

---

## Rebuilding the Knowledge Base

When you update `demands.xlsx`, the AI service automatically detects the change on next restart (fingerprint-based). To force an immediate rebuild:

```powershell
curl -X POST http://localhost:8000/kb/rebuild
```

Or call the Express proxy:
```http
POST /api/kb/rebuild
```

---

## Zero Hallucination Policy

The system is configured for closed-domain operation:
- The LLM receives **only** the context retrieved from ChromaDB
- Temperature is set to **0.1** (near-deterministic)
- The system prompt explicitly forbids outside knowledge
- If relevant documents are not found (similarity threshold exceeded), the system returns a pre-defined refusal message — **no LLM call is made**

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| `ECONNREFUSED` on `/api/chat` | Start the FastAPI service: `python main.py` |
| Ollama connection error | Run `ollama serve` in a separate terminal |
| Prophet install fails (Windows) | Install Visual C++ Build Tools |
| ChromaDB import error | `pip install chromadb==0.5.3` |
| Empty forecast (insufficient data) | Need ≥3 months of dated demand data |
| Chat returns "knowledge base not ready" | Wait 2–3 minutes for ChromaDB to build on first start |
| Torch import warning | Safe to ignore — CPU-only inference works fine |
