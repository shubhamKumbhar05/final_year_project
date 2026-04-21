/**
 * Simple backend proxy for Convai API
 * Avoids CORS issues by proxying requests through your own server
 * 
 * Usage: node server.js
 * Then update convaiService.js to call http://localhost:3001/api/convai
 */

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001

const CONVAI_API_BASE = 'https://api.convai.com'
const CHARACTER_ID = '227fad3a-2743-11f1-8306-42010a7be02c'
const API_KEY = '00bbb6212a694f3132dea85bff6ab8c1'
const CONVAI_TIMEOUT_MS = 20000

// Middleware
app.use(cors())
app.use(express.json())

const parseConvaiResponse = async (response) => {
  const raw = await response.text()

  try {
    return {
      ok: response.ok,
      status: response.status,
      data: JSON.parse(raw),
      raw,
    }
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      data: null,
      raw,
    }
  }
}

const callConvai = async ({ userMessage, sessionId }) => {
  const formData = new FormData()
  formData.append('userText', userMessage)
  formData.append('charID', CHARACTER_ID)
  formData.append('sessionID', sessionId)
  formData.append('voiceResponse', 'False')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CONVAI_TIMEOUT_MS)

  try {
    const response = await fetch(`${CONVAI_API_BASE}/character/getResponse`, {
      method: 'POST',
      headers: {
        'CONVAI-API-KEY': API_KEY,
      },
      body: formData,
      signal: controller.signal,
    })

    return await parseConvaiResponse(response)
  } finally {
    clearTimeout(timeoutId)
  }
}

const isSessionError = (text) => {
  if (!text) return false
  const normalized = String(text).toLowerCase()
  return normalized.includes('no conversation history result')
    || normalized.includes('invalid session')
    || normalized.includes('sessionid')
}

/**
 * Initialize a new Convai session
 */
app.post('/api/convai/init', async (req, res) => {
  // Convai getResponse supports sessionID='-1' to start a new session.
  // We return this token so frontend can keep a simple init flow.
  res.json({ sessionId: '-1' })
})

/**
 * Send message to Convai character
 */
app.post('/api/convai/chat', async (req, res) => {
  try {
    const { userMessage, sessionId } = req.body

    if (!userMessage) {
      return res.status(400).json({
        error: 'Missing required field: userMessage',
      })
    }

    const activeSessionId = sessionId || '-1'
    let parsed = await callConvai({ userMessage, sessionId: activeSessionId })

    const maybeText = parsed.data?.error || parsed.raw || ''
    if (!parsed.ok && activeSessionId !== '-1' && isSessionError(maybeText)) {
      // Session can expire server-side; retry once with a fresh session token.
      parsed = await callConvai({ userMessage, sessionId: '-1' })
    }

    if (!parsed.ok) {
      const errorText = parsed.data?.error || parsed.raw || 'Convai request failed'
      return res.status(parsed.status).json({
        error: 'Failed to get chat response',
        details: errorText,
      })
    }

    const data = parsed.data || {}

    res.json({
      text: data.text || data.charMessage || data.message || '',
      audio: data.audio || null,
      sessionId: data.sessionID || data.sessionId || activeSessionId,
    })
  } catch (error) {
    console.error('Chat error:', error)

    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Convai timeout. Please try again.' })
    }

    res.status(500).json({ error: error.message || 'Unexpected chat server error' })
  }
})

/**
 * End session
 */
app.post('/api/convai/end', async (req, res) => {
  // No explicit end endpoint is required for getResponse sessions.
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`✓ Convai proxy server running on http://localhost:${PORT}`)
})
