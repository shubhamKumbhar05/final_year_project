import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sendMessage, initializeSession } from '../services/convaiService'
import { generateTopologyCommandFromPrompt } from './lab/simulation/topologyGenerator'

/**
 * ConvaiChat Component
 * Floating chat panel for conversing with Convai character
 */
export default function ConvaiChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  // Initialize session on component mount
  useEffect(() => {
    const init = async () => {
      try {
        const sid = await initializeSession()
        setSessionId(sid)
        setMessages([
          {
            type: 'bot',
            text: 'Hello! 👋 I can help you build and configure networks. Try:\n\n📐 Generate topologies: "Create a star topology with 5 PCs"\n🔧 Modify devices: "Change PC-1 IP to 10.0.0.5"\n🔗 Manage connections: "Connect Router to Server"\n⚙️ Configure: "Set PC-1 subnet to 255.255.254.0"\n🏷️ Rename: "Rename PC-1 to WebServer"\n\nWhat would you like to learn or build?',
            timestamp: new Date(),
          },
        ])
      } catch (err) {
        setError('Failed to initialize chat. Please try again.')
        console.error(err)
      }
    }

    if (isOpen && !sessionId) {
      init()
    }
  }, [isOpen, sessionId])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!inputValue.trim() || !sessionId) return
    const userText = inputValue.trim()

    // Add user message to chat
    const userMsg = {
      type: 'user',
      text: userText,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    const topologyCommand = generateTopologyCommandFromPrompt(userText)
    if (topologyCommand) {
      try {
        const payload = {
          command: topologyCommand,
          generatedAt: Date.now(),
        }
        localStorage.setItem('netviz:pendingTopology', JSON.stringify(payload))
        window.dispatchEvent(new CustomEvent('netviz:generate-topology', { detail: payload }))

        setMessages((prev) => [...prev, {
          type: 'bot',
          text: `Topology command detected. ${topologyCommand.summary} Open LAB to view updates.`,
          timestamp: new Date(),
        }])
      } catch (genError) {
        console.error('Topology generation dispatch error:', genError)
      }
    }

    try {
      const response = await sendMessage(userText, sessionId)

      // Add bot response
      const botMsg = {
        type: 'bot',
        text: response.text,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      setError('Failed to get response. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Keep chat/session in memory so reopening the panel restores history.
    setIsOpen(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Button */}
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="chat-button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center text-white text-2xl"
            title="Chat with AI Guide"
          >
            💬
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-0 right-0 w-[25rem] h-[27rem] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-5 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-white font-bold">Network Guide</h2>
                <p className="text-xs text-blue-100">Powered by Convai</p>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-lg ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-700 text-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs mt-1.5 opacity-70">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-700 text-slate-100 px-4 py-3 rounded-lg rounded-bl-none">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-900/50 text-red-200 px-4 py-3 rounded-md text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-700 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about networks..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-800 text-white px-4 py-2.5 rounded border border-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-5 py-2.5 rounded transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
