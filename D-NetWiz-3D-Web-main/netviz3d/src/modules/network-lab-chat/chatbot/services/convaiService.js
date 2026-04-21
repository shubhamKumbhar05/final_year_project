/**
 * Convai Integration Service
 * Communicates with backend proxy to avoid CORS and expose API key
 */

const API_BASE = 'http://localhost:3001/api/convai'

let sessionId = null

/**
 * Initialize a new Convai session
 */
export const initializeSession = async () => {
  try {
    const response = await fetch(`${API_BASE}/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.details || error.error || `Failed to initialize session: ${response.statusText}`)
    }

    const data = await response.json()
    sessionId = data.sessionId
    return sessionId
  } catch (error) {
    console.error('Session initialization error:', error)
    throw error
  }
}

/**
 * Send message to Convai character and get response
 * @param {string} userMessage - The user's message
 * @param {string} currentSessionId - The current session ID
 * @returns {Promise<{text: string, audio?: string}>} - Character response
 */
export const sendMessage = async (userMessage, currentSessionId = null) => {
  try {
    // Initialize session if needed
    if (!currentSessionId && !sessionId) {
      await initializeSession()
    }

    const activeSessionId = currentSessionId || sessionId || '-1'

    let response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage: userMessage,
        sessionId: activeSessionId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      const reason = String(error.details || error.error || '')

      const shouldResetSession =
        reason.toLowerCase().includes('session')
        || reason.toLowerCase().includes('conversation history')
        || response.status === 504

      if (shouldResetSession) {
        const freshSessionId = '-1'
        response = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userMessage: userMessage,
            sessionId: freshSessionId,
          }),
        })

        if (!response.ok) {
          const retryError = await response.json()
          throw new Error(retryError.details || retryError.error || `API retry failed: ${response.statusText}`)
        }
      } else {
        throw new Error(error.details || error.error || `API call failed: ${response.statusText}`)
      }
    }

    const data = await response.json()
    sessionId = data.sessionId || activeSessionId

    return {
      text: data.text || '',
      audio: data.audio || null,
      sessionId,
    }
  } catch (error) {
    console.error('Convai message error:', error)
    throw error
  }
}

/**
 * End the current session
 */
export const endSession = async (currentSessionId = null) => {
  try {
    const activeSessionId = currentSessionId || sessionId

    const response = await fetch(`${API_BASE}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: activeSessionId,
      }),
    })

    if (response.ok) {
      sessionId = null
    }

    return response.ok
  } catch (error) {
    console.error('Session end error:', error)
    return false
  }
}

/**
 * Clear current session
 */
export const clearSession = () => {
  sessionId = null
}

/**
 * Get current session ID
 */
export const getSessionId = () => sessionId
