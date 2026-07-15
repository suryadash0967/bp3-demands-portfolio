/**
 * routes/aiRoutes.js
 *
 * Express API gateway routes for the FastAPI AI microservice.
 * All AI logic lives in FastAPI — Express only proxies authenticated requests.
 *
 * Routes:
 *   POST /api/chat     → FastAPI POST /chat
 *   POST /api/forecast → FastAPI POST /forecast
 *   GET  /api/ai/health → FastAPI GET /health
 */

import express from 'express'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const REQUEST_TIMEOUT_MS = 60_000  // 60 seconds (LLM can be slow)

/**
 * Generic proxy helper — forwards a request body to the FastAPI AI service.
 * Sanitises request body and validates payload size.
 */
async function proxyToAI(endpoint, body, res) {
  try {
    // Dynamic import of node-fetch (ESM-compatible)
    const { default: fetch } = await import('node-fetch')

    // Size guard — reject payloads > 50KB
    const bodyStr = JSON.stringify(body)
    if (bodyStr.length > 50_000) {
      return res.status(413).json({ message: 'Request payload too large.' })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.detail || data.message || 'AI service error.',
      })
    }

    return res.status(200).json(data)

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ message: 'AI service request timed out.' })
    }
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'AI service is not running. Please start the FastAPI service.',
      })
    }
    console.error('[AI proxy error]', err.message)
    return res.status(500).json({ message: 'Failed to reach AI service.' })
  }
}

// ── POST /api/chat ─────────────────────────────────────────────────────────────
router.post('/chat', verifyToken, async (req, res) => {
  const { query, session_id, history } = req.body

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'query (string) is required.' })
  }

  const sanitisedQuery = query.trim().slice(0, 500)
  if (!sanitisedQuery) {
    return res.status(400).json({ message: 'query cannot be empty.' })
  }

  await proxyToAI('/chat', {
    query: sanitisedQuery,
    session_id: session_id || null,
    history: history || [],
  }, res)
})

// ── POST /api/forecast ─────────────────────────────────────────────────────────
router.post('/forecast', verifyToken, async (req, res) => {
  const { metric = 'overall', category = null, months = 6 } = req.body

  const validMetrics = [
    'overall', 'application', 'department', 'priority',
    'project_type', 'work_area', 'vertical', 'pm_department',
  ]
  if (!validMetrics.includes(metric)) {
    return res.status(400).json({
      message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
    })
  }

  const monthsInt = parseInt(months, 10)
  if (isNaN(monthsInt) || monthsInt < 1 || monthsInt > 24) {
    return res.status(400).json({ message: 'months must be an integer between 1 and 24.' })
  }

  await proxyToAI('/forecast', {
    metric,
    category: category ? String(category).trim().slice(0, 100) : null,
    months: monthsInt,
  }, res)
})

// ── GET /api/ai/health ─────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch')
    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = await response.json()
    return res.status(response.ok ? 200 : 503).json(data)
  } catch {
    return res.status(503).json({
      status: 'error',
      message: 'AI service is not reachable.',
    })
  }
})

// ── GET /api/ai/categories/:metric ───────────────────────────────────────────
router.get('/categories/:metric', verifyToken, async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch')
    const { metric } = req.params
    const response = await fetch(
      `${AI_SERVICE_URL}/forecast/categories/${encodeURIComponent(metric)}`,
      { signal: AbortSignal.timeout(10_000) }
    )
    const data = await response.json()
    return res.status(response.ok ? 200 : 400).json(data)
  } catch {
    return res.status(503).json({ message: 'AI service not reachable.' })
  }
})

export default router
