/* eslint-disable no-unused-vars */
import React, { useState, useRef, useCallback, createContext, useContext } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import gsap from 'gsap'
/* eslint-enable no-unused-vars */

/**
 * HTTP Protocol Visualization
 * Demonstrates HTTP Request/Response cycle
 *
 * Browser sends HTTP requests to server
 * Server processes and sends HTTP responses
 * Visual envelope animations show data transmission
 */

// ═════════════════════════════════════════════════════════════════
// HTTP CONTEXT - Unified state management
// ═════════════════════════════════════════════════════════════════

const HTTPContext = createContext(null)

function useHTTPContext() {
  const context = useContext(HTTPContext)
  if (!context) {
    throw new Error('useHTTPContext must be used within HTTPProvider')
  }
  return context
}

// ═════════════════════════════════════════════════════════════════
// HTTP PROVIDER - Manages unified state for control panel & visualization
// ═════════════════════════════════════════════════════════════════

function HTTPProvider({ children }) {
  const [inputUrl, setInputUrl] = useState('http://myserver.com/data')
  const [selectedMethod, setSelectedMethod] = useState('GET')
  const [httpStatus, setHttpStatus] = useState('IDLE')
  const [responseData, setResponseData] = useState(null)
  const [requestPosition, setRequestPosition] = useState([-4, 0, 0])
  const [responsePosition, setResponsePosition] = useState([3, 0, 0])
  const [showRequestEnvelope, setShowRequestEnvelope] = useState(false)
  const [showResponseEnvelope, setShowResponseEnvelope] = useState(false)
  const [serverGlow, setServerGlow] = useState(0)

  const serverRef = useRef(null)
  const requestEnvelopeRef = useRef(null)
  const responseEnvelopeRef = useRef(null)
  const animationRef = useRef(null)

  // Handler that manages HTTP request animation - SYNCHRONIZES with 3D visualization
  const handleSendRequest = useCallback((method, url) => {
    // Only allow requests when idle or completed
    if (httpStatus !== 'IDLE' && httpStatus !== 'COMPLETED') return

    setHttpStatus('REQUESTING')
    setShowRequestEnvelope(true)
    setResponseData(null)
    setShowResponseEnvelope(false)

    if (animationRef.current) {
      animationRef.current.kill()
    }

    animationRef.current = gsap.timeline()

    // Request travels from client to server
    animationRef.current.to(
      { pos: -4 },
      {
        pos: 3,
        duration: 2,
        onUpdate: function () {
          setRequestPosition([this.targets()[0].pos, 0, 0])
        },
        ease: 'power1.inOut',
      },
      0
    )

    // Server processing
    animationRef.current.call(() => {
      setHttpStatus('PROCESSING')
      setShowRequestEnvelope(false)

      gsap.to(
        { glow: 0 },
        {
          glow: 1,
          duration: 0.5,
          repeat: 1,
          yoyo: true,
          onUpdate: function () {
            setServerGlow(this.targets()[0].glow)
          },
        }
      )
    }, null, 1.8)

    // Generate response
    animationRef.current.call(() => {
      const isError = url.includes('404') || Math.random() > 0.8

      if (isError) {
        setResponseData({
          error: '404 Not Found',
          statusCode: 404,
          success: false,
        })
      } else {
        setResponseData({
          statusCode: 200,
          payload: 'Success! Data Loaded',
          success: true,
        })
      }

      setShowResponseEnvelope(true)
      setResponsePosition([3, 0, 0])
      setHttpStatus('RESPONDING')
    }, null, 2.5)

    // Response travels back from server to client
    animationRef.current.to(
      { pos: 3 },
      {
        pos: -4,
        duration: 2,
        onUpdate: function () {
          setResponsePosition([this.targets()[0].pos, 0, 0])
        },
        ease: 'power1.inOut',
      },
      2.7
    )

    // Complete
    animationRef.current.call(() => {
      setShowResponseEnvelope(false)
      setHttpStatus('COMPLETED')
    }, null, 4.5)
  }, [httpStatus])

  const value = {
    // Input state
    inputUrl,
    setInputUrl,
    selectedMethod,
    setSelectedMethod,
    // Visualization state
    httpStatus,
    responseData,
    requestPosition,
    responsePosition,
    showRequestEnvelope,
    showResponseEnvelope,
    serverGlow,
    // Refs
    serverRef,
    requestEnvelopeRef,
    responseEnvelopeRef,
    // Handlers
    handleSendRequest,
  }

  return <HTTPContext.Provider value={value}>{children}</HTTPContext.Provider>
}

// ═════════════════════════════════════════════════════════════════
// HTTP CONTROL PANEL - Now connected to context
// ═════════════════════════════════════════════════════════════════

function HTTPControlPanel() {
  const {
    inputUrl,
    setInputUrl,
    selectedMethod,
    setSelectedMethod,
    httpStatus,
    responseData,
    handleSendRequest,
  } = useHTTPContext()

  const isLoading = httpStatus === 'REQUESTING' || httpStatus === 'PROCESSING'
  const hasError = responseData?.error
  const hasSuccess = responseData?.success && httpStatus !== 'REQUESTING'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '320px',
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
        border: '2px solid #00ffcc',
        borderRadius: '10px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e0e0e0',
        boxShadow: '0 16px 64px rgba(0, 255, 204, 0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        zIndex: 1000,
        pointerEvents: 'auto',
        userSelect: 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Compact Header */}
      <div
        style={{
          color: '#00ffcc',
          fontSize: '12px',
          fontWeight: 'bold',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(0, 255, 204, 0.5)',
          textAlign: 'left',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🌐</span>
        <span>HTTP REQUEST</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            padding: '2px 6px',
            background: hasError ? '#ff444444' : hasSuccess ? '#10b98144' : '#fbbf2444',
            borderRadius: '4px',
            color: hasError ? '#ff4444' : hasSuccess ? '#10b981' : '#fbbf24',
          }}
        >
          {httpStatus}
        </span>
      </div>

      {/* URL Input - Compact */}
      <div style={{ marginBottom: '8px' }}>
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          disabled={isLoading}
          placeholder="http://example.com"
          style={{
            width: '100%',
            padding: '6px 8px',
            background: 'rgba(15, 52, 96, 0.8)',
            border: '1px solid #00ffcc',
            borderRadius: '5px',
            color: '#00ffcc',
            fontSize: '10px',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: isLoading ? 0.5 : 1,
            cursor: isLoading ? 'not-allowed' : 'text',
            fontFamily: 'monospace',
            transition: 'all 0.2s',
          }}
        />
      </div>

      {/* Method & Send - Compact Row */}
      <div style={{ marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'stretch' }}>
        <select
          value={selectedMethod}
          onChange={(e) => !isLoading && setSelectedMethod(e.target.value)}
          disabled={isLoading}
          style={{
            flex: '0 0 60px',
            padding: '6px 6px',
            background: selectedMethod === 'GET' ? '#00ffcc' : '#0f3460',
            border: '1px solid #00ffcc',
            borderRadius: '5px',
            color: selectedMethod === 'GET' ? '#000' : '#00ffcc',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            fontFamily: 'monospace',
            transition: 'all 0.2s',
          }}
        >
          <option>GET</option>
          <option>POST</option>
        </select>

        <button
          onClick={() => handleSendRequest(selectedMethod, inputUrl)}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '6px 10px',
            background: isLoading ? 'rgba(100, 100, 100, 0.6)' : '#00ffcc',
            border: 'none',
            borderRadius: '5px',
            color: isLoading ? '#999' : '#000',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
            transition: 'all 0.2s',
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
          }}
        >
          {isLoading ? '⏳ WAIT' : '🚀 SEND'}
        </button>
      </div>

      {/* Response Preview - Compact */}
      {responseData && (
        <div
          style={{
            padding: '8px',
            background: 'rgba(15, 52, 96, 0.8)',
            borderRadius: '5px',
            fontSize: '9px',
            color: hasError ? '#ff4444' : '#10b981',
            maxHeight: '70px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            border: '1px solid ' + (hasError ? 'rgba(255, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'),
            lineHeight: '1.4',
          }}
        >
          {hasError ? (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>❌ {responseData.error}</div>
            </>
          ) : hasSuccess ? (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>✅ CODE: {responseData.statusCode}</div>
              <div style={{ color: '#aaa' }}>{responseData.payload}</div>
            </>
          ) : null}
        </div>
      )}

      {/* Quick Info */}
      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid rgba(0, 255, 204, 0.3)',
          fontSize: '8px',
          color: '#666',
          lineHeight: '1.3',
        }}
      >
        <div>📡 Network: HTTP/1.1</div>
        <div>⏱️ Animation: {isLoading ? 'Running' : 'Idle'}</div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// REQUEST ENVELOPE COMPONENT
// ═════════════════════════════════════════════════════════════════

function RequestEnvelope({ position, color, opacity }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[0, 0.35, 0.25]}>
        <boxGeometry args={[0.6, 0.2, 0.05]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh>
        <torusGeometry args={[0.6, 0.08, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.6} />
      </mesh>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// HTTP 3D STAGE COMPONENT - Connected to context
// ═════════════════════════════════════════════════════════════════

function HTTPStage3D() {
  const {
    httpStatus,
    responseData,
    requestPosition,
    responsePosition,
    showRequestEnvelope,
    showResponseEnvelope,
    serverGlow,
    serverRef,
    requestEnvelopeRef,
    responseEnvelopeRef,
  } = useHTTPContext()

  useFrame(() => {
    if (serverRef.current) {
      serverRef.current.scale.set(
        1 + serverGlow * 0.3,
        1 + serverGlow * 0.3,
        1 + serverGlow * 0.3
      )
    }
  })

  return (
    <group>
      {/* Client Node */}
      <group position={[-5, 0, 0]}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[0, 0.6, 0.8]} intensity={2} distance={3} color="#06b6d4" />
        <Text position={[0, -1.2, 0]} fontSize={0.3} color="#06b6d4">
          CLIENT
        </Text>
      </group>

      {/* Server Node */}
      <group ref={serverRef} position={[5, 0, 0]}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.4} />
        </mesh>
        <pointLight position={[0, 0.6, 0.8]} intensity={2} distance={3} color="#eab308" />
        <Text position={[0, -1.2, 0]} fontSize={0.3} color="#eab308">
          SERVER
        </Text>
      </group>

      {/* Network Line */}
      <line position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-5, 0, 0, 5, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#10b981" linewidth={2} transparent opacity={0.5} />
      </line>

      {/* Request Envelope Animation */}
      {showRequestEnvelope && (
        <group ref={requestEnvelopeRef} position={requestPosition}>
          <RequestEnvelope position={[0, 0, 0]} color="#3b82f6" opacity={1} />
          <Text position={[0, 1.2, 0]} fontSize={0.25} color="#3b82f6">
            HTTP GET
          </Text>
        </group>
      )}

      {/* Response Envelope Animation */}
      {showResponseEnvelope && (
        <group ref={responseEnvelopeRef} position={responsePosition}>
          <RequestEnvelope
            position={[0, 0, 0]}
            color={responseData?.statusCode === 404 ? '#ef4444' : '#10b981'}
            opacity={1}
          />
          <Text
            position={[0, 1.2, 0]}
            fontSize={0.25}
            color={responseData?.statusCode === 404 ? '#ef4444' : '#10b981'}
          >
            {responseData?.statusCode === 404 ? 'HTTP 404' : 'HTTP 200 OK'}
          </Text>
        </group>
      )}

      {/* Status Text */}
      <Text position={[0, 3, 0]} fontSize={0.35} color="#00ffcc">
        {httpStatus}
      </Text>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// UNIFIED COMPONENT - Both panel and visualization with single provider
// ═════════════════════════════════════════════════════════════════

function HTTPComplete() {
  return (
    <>
      <HTTPControlPanel />
      <HTTPStage3D />
    </>
  )
}

// ═════════════════════════════════════════════════════════════════
// MAIN EXPORTS
// ═════════════════════════════════════════════════════════════════

// Export provider for use at Scene3D level
export { HTTPProvider }

// Export control panel container that renders ONLY the UI panel
export function HTTPControlPanelContainer() {
  return <HTTPControlPanel />
}

// Default export - the 3D visualization (for use INSIDE Canvas)
// Must be wrapped by HTTPProvider at Scene3D level for context access
export default function HTTPViz() {
  return <HTTPStage3D />
}
