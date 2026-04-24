const CONVAI_API_BASE = process.env.CONVAI_API_BASE || 'https://api.convai.com'
const CONVAI_TIMEOUT_MS = Number(process.env.CONVAI_TIMEOUT_MS || 20000)

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

const isSessionError = (text) => {
  if (!text) return false
  const normalized = String(text).toLowerCase()
  return normalized.includes('no conversation history result')
    || normalized.includes('invalid session')
    || normalized.includes('sessionid')
}

const callConvai = async ({ userMessage, sessionId, characterId, apiKey }) => {
  const formData = new FormData()
  formData.append('userText', userMessage)
  formData.append('charID', characterId)
  formData.append('sessionID', sessionId)
  formData.append('voiceResponse', 'False')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CONVAI_TIMEOUT_MS)

  try {
    const response = await fetch(`${CONVAI_API_BASE}/character/getResponse`, {
      method: 'POST',
      headers: {
        'CONVAI-API-KEY': apiKey,
      },
      body: formData,
      signal: controller.signal,
    })

    return await parseConvaiResponse(response)
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const characterId = process.env.CONVAI_CHARACTER_ID
  const apiKey = process.env.CONVAI_API_KEY

  if (!characterId || !apiKey) {
    return res.status(500).json({
      error: 'Server not configured',
      details: 'Missing CONVAI_CHARACTER_ID or CONVAI_API_KEY',
    })
  }

  try {
    const { userMessage, sessionId } = req.body || {}

    if (!userMessage) {
      return res.status(400).json({
        error: 'Missing required field: userMessage',
      })
    }

    const activeSessionId = sessionId || '-1'
    let parsed = await callConvai({
      userMessage,
      sessionId: activeSessionId,
      characterId,
      apiKey,
    })

    const maybeText = parsed.data?.error || parsed.raw || ''
    if (!parsed.ok && activeSessionId !== '-1' && isSessionError(maybeText)) {
      parsed = await callConvai({
        userMessage,
        sessionId: '-1',
        characterId,
        apiKey,
      })
    }

    if (!parsed.ok) {
      const errorText = parsed.data?.error || parsed.raw || 'Convai request failed'
      return res.status(parsed.status).json({
        error: 'Failed to get chat response',
        details: errorText,
      })
    }

    const data = parsed.data || {}

    return res.status(200).json({
      text: data.text || data.charMessage || data.message || '',
      audio: data.audio || null,
      sessionId: data.sessionID || data.sessionId || activeSessionId,
    })
  } catch (error) {
    console.error('Chat error:', error)

    if (error?.name === 'AbortError') {
      return res.status(504).json({ error: 'Convai timeout. Please try again.' })
    }

    return res.status(500).json({ error: error.message || 'Unexpected chat server error' })
  }
}
