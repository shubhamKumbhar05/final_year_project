import React, { useState, useRef, useCallback, createContext, useContext } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import gsap from 'gsap'

/**
 * HTTPS (HTTP Secure) Visualization - TLS Handshake & Encryption
 *
 * Core Concept: "The Locked Briefcase"
 * - Client and Server establish trust through handshake
 * - Secret key exchange (asymmetric then symmetric encryption)
 * - Secure data transmission through encrypted tunnel
 * - Visual comparison: HTTP (unencrypted) vs HTTPS (encrypted)
 *
 * Phase 1: The Trust Environment (Setup)
 * Phase 2: The Handshake Animation (Certificate & verification)
 * Phase 3: Asymmetric Encryption (Public/Private keys)
 * Phase 4: Symmetric Encryption (Session established & data flow)
 * Phase 5: HTTP vs HTTPS Toggle (Comparison mode)
 */

// ═════════════════════════════════════════════════════════════════
// HTTPS CONTEXT - Unified state management
// ═════════════════════════════════════════════════════════════════

const HTTPSContext = createContext(null)

function useHTTPSContext() {
  const context = useContext(HTTPSContext)
  if (!context) {
    throw new Error('useHTTPSContext must be used within HTTPSProvider')
  }
  return context
}

// ═════════════════════════════════════════════════════════════════
// HTTPS PROVIDER - Manages unified state for control panel & visualization
// ═════════════════════════════════════════════════════════════════

function HTTPSProvider({ children }) {
  const [currentPhase, setCurrentPhase] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('IDLE')
  const [isSecure, setIsSecure] = useState(false)
  const [httpsMode, setHttpsMode] = useState('HTTPS')
  const [showHacker, setShowHacker] = useState(false)
  const [interceptedData, setInterceptedData] = useState(false)

  // Phase 2 state
  const [showClientHello, setShowClientHello] = useState(false)
  const [clientHelloPos, setClientHelloPos] = useState([-5, 0, 0])
  const [showCertificate, setShowCertificate] = useState(false)
  const [certificatePos, setCertificatePos] = useState([5, 0, 0])
  const [certificateOpacity, setCertificateOpacity] = useState(0)
  const [showCheckmark, setShowCheckmark] = useState(false)

  // Phase 3 state
  const [showPublicKey, setShowPublicKey] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showSessionKeyBox, setShowSessionKeyBox] = useState(false)
  const [sessionKeyPos, setSessionKeyPos] = useState([-5, 0, 0])
  const [sessionKeyLocked, setSessionKeyLocked] = useState(true)

  // Phase 4 state
  const [dataCubes, setDataCubes] = useState([])
  const [pipeColor, setPipeColor] = useState('#888888')

  // Animation references
  const animationRef = useRef(null)

  const resetSceneState = useCallback(({ preserveMode = true } = {}) => {
    if (animationRef.current) {
      animationRef.current.kill()
      animationRef.current = null
    }

    setIsAnimating(false)
    setConnectionStatus('IDLE')
    setIsSecure(false)
    setShowClientHello(false)
    setClientHelloPos([-5, 0, 0])
    setShowCertificate(false)
    setCertificatePos([5, 0, 0])
    setCertificateOpacity(0)
    setShowCheckmark(false)
    setShowPublicKey(false)
    setShowPrivateKey(false)
    setShowSessionKeyBox(false)
    setSessionKeyPos([-5, 0, 0])
    setSessionKeyLocked(true)
    setDataCubes([])
    setInterceptedData(false)

    if (!preserveMode) {
      setHttpsMode('HTTPS')
      setPipeColor('#888888')
    }
  }, [])

  const handlePhaseSelect = useCallback((phase) => {
    if (isAnimating) return
    resetSceneState()
    setCurrentPhase(phase)
    setPipeColor('#888888')
  }, [isAnimating, resetSceneState])

  const handleModeToggle = useCallback((mode) => {
    setHttpsMode(mode)
    if (mode === 'HTTPS') {
      setPipeColor('#fbbf24')
      setIsSecure(true)
      setConnectionStatus('ENCRYPTED ✓')
    } else {
      setPipeColor('#ef4444')
      setIsSecure(false)
      setConnectionStatus('UNENCRYPTED ⚠️')
    }
  }, [])

  const startHandshake = useCallback(() => {
    if (isAnimating) return
    resetSceneState()
    setIsAnimating(true)

    const runMode = httpsMode
    const isHttpsRun = runMode === 'HTTPS'
    const hackerEnabled = showHacker

    const timeline = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false)
        setConnectionStatus(
          isHttpsRun
            ? 'DEMO COMPLETE: HTTPS SECURE ✓'
            : 'DEMO COMPLETE: HTTP INSECURE ⚠️'
        )
        animationRef.current = null
      },
    })

    // ═══ PHASE 1: Trust Environment (0.0-1.2s) ═════════════════════
    timeline.call(() => {
      setCurrentPhase(1)
      setPipeColor('#888888')
      setIsSecure(false)
      setConnectionStatus('PHASE 1/5: CLIENT + SERVER')
    }, null, 0)

    // ═══ PHASE 2: Handshake with Clear Sequence (1.2-7.5s) ════════════
    timeline.call(() => {
      setCurrentPhase(2)
      setShowClientHello(true)
      setClientHelloPos([-5, 0, 0])
      setConnectionStatus(
        isHttpsRun ? 'PHASE 2/5: CLIENT SENDS HELLO' : 'PHASE 2/5: CLIENT SENDS REQUEST'
      )
    }, null, 1.2)

    // ClientHello travels slowly from left to right (1.5s)
    const helloAnimation = { pos: -5 }
    timeline.to(
      helloAnimation,
      {
        pos: 5,
        duration: 1.8,
        ease: 'sine.inOut',
        onUpdate: () => {
          setClientHelloPos([helloAnimation.pos, 0, 0])
        },
      },
      1.2
    )

    if (isHttpsRun) {
      // ─── HTTPS HANDSHAKE SEQUENCE ─────────────────────────────────
      // Pause before server responds
      timeline.call(() => {
        setShowClientHello(false)
        setConnectionStatus('PHASE 2/5: SERVER PROCESSING...')
      }, null, 3.2)

      // Server sends certificate back (1.2s)
      timeline.call(() => {
        setShowCertificate(true)
        setCertificatePos([5, 0, 0])
        setCertificateOpacity(1)
        setConnectionStatus('PHASE 2/5: SERVER SENDS CERTIFICATE')
      }, null, 3.8)

      const certAnimation = { pos: 5 }
      timeline.to(
        certAnimation,
        {
          pos: -5,
          duration: 1.5,
          ease: 'sine.inOut',
          onUpdate: () => {
            setCertificatePos([certAnimation.pos, 0, 0])
          },
        },
        3.8
      )

      // Certificate verification
      timeline.call(() => {
        setShowCertificate(false)
        setShowCheckmark(true)
        setConnectionStatus('PHASE 2/5: CERTIFICATE VERIFIED ✓')
      }, null, 5.5)

      timeline.call(() => {
        setShowCheckmark(false)
      }, null, 6.5)

      // ═══ PHASE 3: Key Exchange (7.5-12.5s) ══════════════════════════
      timeline.call(() => {
        setCurrentPhase(3)
        setShowPublicKey(false)
        setShowPrivateKey(false)
        setShowSessionKeyBox(false)
        setSessionKeyLocked(true)
        setConnectionStatus('PHASE 3/5: GENERATING ENCRYPTION KEYS')
      }, null, 7.5)

      // Show public key
      timeline.call(() => {
        setShowPublicKey(true)
        setConnectionStatus('PHASE 3/5: PUBLIC KEY SHARED')
      }, null, 8.0)

      // Show private key
      timeline.call(() => {
        setShowPrivateKey(true)
        setConnectionStatus('PHASE 3/5: PRIVATE KEY PROTECTED')
      }, null, 8.8)

      // Session key animation (2.0s - slow and clear)
      timeline.call(() => {
        setShowSessionKeyBox(true)
        setSessionKeyPos([-5, 0, 0])
        setSessionKeyLocked(true)
        setConnectionStatus('PHASE 3/5: SESSION KEY TRAVELING...')
      }, null, 9.5)

      const sessionAnimation = { pos: -5 }
      timeline.to(
        sessionAnimation,
        {
          pos: 5,
          duration: 2.0,
          ease: 'sine.inOut',
          onUpdate: () => {
            setSessionKeyPos([sessionAnimation.pos, 0, 0])
          },
        },
        9.5
      )

      timeline.call(() => {
        setSessionKeyLocked(false)
        setConnectionStatus('PHASE 3/5: SESSION KEY ESTABLISHED ✓')
      }, null, 11.7)

      // ═══ PHASE 4: Encrypted Data Transfer (12.5-22.0s) ═══════════════
      timeline.call(() => {
        setCurrentPhase(4)
        setDataCubes([])
        setPipeColor('#fbbf24')
        setIsSecure(true)
        setConnectionStatus('PHASE 4/5: SENDING ENCRYPTED PACKETS')
      }, null, 12.5)

      const phase4Cubes = [
        { id: 10, label: 'E1', delay: 0.5 },
        { id: 11, label: 'E2', delay: 1.5 },
        { id: 12, label: 'E3', delay: 2.5 },
      ]

      phase4Cubes.forEach(({ id, label, delay }) => {
        // Announce packet
        if (delay === 0.5) {
          timeline.call(() => {
            setConnectionStatus('PHASE 4/5: PACKET 1 SENDING...')
          }, null, 12.5 + delay - 0.2)
        } else if (delay === 1.5) {
          timeline.call(() => {
            setConnectionStatus('PHASE 4/5: PACKET 2 SENDING...')
          }, null, 12.5 + delay - 0.2)
        } else if (delay === 2.5) {
          timeline.call(() => {
            setConnectionStatus('PHASE 4/5: PACKET 3 SENDING...')
          }, null, 12.5 + delay - 0.2)
        }

        timeline.call(() => {
          setDataCubes((prev) => [
            ...prev,
            { id, label, pos: -5, isEncrypted: true },
          ])
        }, null, 12.5 + delay)

        const cubeAnimation = { pos: -5 }
        timeline.to(
          cubeAnimation,
          {
            pos: 5,
            duration: 2.2,
            ease: 'sine.inOut',
            onUpdate: () => {
              setDataCubes((prev) =>
                prev.map((cube) =>
                  cube.id === id ? { ...cube, pos: cubeAnimation.pos } : cube
                )
              )
            },
            onComplete: () => {
              setDataCubes((prev) => prev.filter((cube) => cube.id !== id))
            },
          },
          12.5 + delay
        )
      })

      // ═══ PHASE 5: Encryption Comparison (22.0-30.0s) ═════════════════
      timeline.call(() => {
        setCurrentPhase(5)
        setDataCubes([])
        setPipeColor('#fbbf24')
        setIsSecure(true)
        setConnectionStatus('PHASE 5/5: ENCRYPTED DATA REMAINS UNREADABLE ✓')
      }, null, 22.0)

      const phase5Cubes = [
        { id: 20, label: 'A#$K@L', delay: 0.5 },
        { id: 21, label: '8K!@M2', delay: 1.5 },
        { id: 22, label: '3N$@9P', delay: 2.5 },
      ]

      phase5Cubes.forEach(({ id, label, delay }) => {
        timeline.call(() => {
          setDataCubes((prev) => [
            ...prev,
            { id, label, pos: -5, isEncrypted: true },
          ])
        }, null, 22.0 + delay)

        const cubeAnimation = { pos: -5 }
        timeline.to(
          cubeAnimation,
          {
            pos: 5,
            duration: 2.2,
            ease: 'sine.inOut',
            onUpdate: () => {
              setDataCubes((prev) =>
                prev.map((cube) =>
                  cube.id === id ? { ...cube, pos: cubeAnimation.pos } : cube
                )
              )
            },
            onComplete: () => {
              setDataCubes((prev) => prev.filter((cube) => cube.id !== id))
            },
          },
          22.0 + delay
        )
      })
    } else {
      // ─── HTTP MODE (NO TLS) ───────────────────────────────────────
      // Pause before server responds
      timeline.call(() => {
        setShowClientHello(false)
        setConnectionStatus('PHASE 2/5: SERVER PROCESSING (NO SECURITY)...')
      }, null, 3.2)

      // ═══ PHASE 3: No Keys (3.8-7.5s) ════════════════════════════════
      timeline.call(() => {
        setCurrentPhase(3)
        setConnectionStatus('PHASE 3/5: NO ENCRYPTION KEYS ⚠️')
      }, null, 3.8)

      // ═══ PHASE 4: Plain Data (7.5-17.0s) ═════════════════════════════
      timeline.call(() => {
        setCurrentPhase(4)
        setDataCubes([])
        setPipeColor('#ef4444')
        setIsSecure(false)
        setConnectionStatus('PHASE 4/5: SENDING PLAINTEXT PACKETS')
      }, null, 7.5)

      const phase4Cubes = [
        { id: 10, label: 'PWD', delay: 0.5 },
        { id: 11, label: 'USR', delay: 1.5 },
        { id: 12, label: '123', delay: 2.5 },
      ]

      phase4Cubes.forEach(({ id, label, delay }) => {
        // Announce packet
        if (delay === 0.5) {
          timeline.call(() => {
            setConnectionStatus('PHASE 4/5: PACKET 1 SENDING (UNENCRYPTED)...')
          }, null, 7.5 + delay - 0.2)
        } else if (delay === 1.5) {
          timeline.call(() => {
            setConnectionStatus('PHASE 4/5: PACKET 2 SENDING (UNENCRYPTED)...')
          }, null, 7.5 + delay - 0.2)
        } else if (delay === 2.5) {
          timeline.call(() => {
            setConnectionStatus('PHASE 4/5: PACKET 3 SENDING (UNENCRYPTED)...')
          }, null, 7.5 + delay - 0.2)
        }

        timeline.call(() => {
          setDataCubes((prev) => [
            ...prev,
            { id, label, pos: -5, isEncrypted: false },
          ])
        }, null, 7.5 + delay)

        const cubeAnimation = { pos: -5 }
        timeline.to(
          cubeAnimation,
          {
            pos: 5,
            duration: 2.2,
            ease: 'sine.inOut',
            onUpdate: () => {
              const currentPos = cubeAnimation.pos
              setDataCubes((prev) =>
                prev.map((cube) =>
                  cube.id === id ? { ...cube, pos: currentPos } : cube
                )
              )

              if (hackerEnabled && Math.abs(currentPos) < 0.5) {
                setInterceptedData(true)
              }
            },
            onComplete: () => {
              setDataCubes((prev) => prev.filter((cube) => cube.id !== id))
            },
          },
          7.5 + delay
        )
      })

      // ═══ PHASE 5: Readable Data Warning (17.0-25.0s) ════════════════
      timeline.call(() => {
        setCurrentPhase(5)
        setDataCubes([])
        setPipeColor('#ef4444')
        setIsSecure(false)
        setConnectionStatus('PHASE 5/5: DATA READABLE - SECURITY RISK ⚠️')
      }, null, 17.0)

      const phase5Cubes = [
        { id: 20, label: 'Password', delay: 0.5 },
        { id: 21, label: 'Credit', delay: 1.5 },
        { id: 22, label: 'Card#', delay: 2.5 },
      ]

      phase5Cubes.forEach(({ id, label, delay }) => {
        timeline.call(() => {
          setDataCubes((prev) => [
            ...prev,
            { id, label, pos: -5, isEncrypted: false },
          ])
        }, null, 17.0 + delay)

        const cubeAnimation = { pos: -5 }
        timeline.to(
          cubeAnimation,
          {
            pos: 5,
            duration: 2.2,
            ease: 'sine.inOut',
            onUpdate: () => {
              const currentPos = cubeAnimation.pos
              setDataCubes((prev) =>
                prev.map((cube) =>
                  cube.id === id ? { ...cube, pos: currentPos } : cube
                )
              )
            },
            onComplete: () => {
              setDataCubes((prev) => prev.filter((cube) => cube.id !== id))
            },
          },
          17.0 + delay
        )
      })
    }

    animationRef.current = timeline
  }, [isAnimating, resetSceneState, showHacker, httpsMode])

  const value = {
    currentPhase,
    setCurrentPhase,
    isAnimating,
    connectionStatus,
    isSecure,
    httpsMode,
    showHacker,
    setShowHacker,
    interceptedData,
    showClientHello,
    clientHelloPos,
    showCertificate,
    certificatePos,
    certificateOpacity,
    showCheckmark,
    showPublicKey,
    showPrivateKey,
    showSessionKeyBox,
    sessionKeyPos,
    sessionKeyLocked,
    dataCubes,
    pipeColor,
    handlePhaseSelect,
    handleModeToggle,
    startHandshake,
  }

  return <HTTPSContext.Provider value={value}>{children}</HTTPSContext.Provider>
}

// ═════════════════════════════════════════════════════════════════
// HTTPS CONTROL PANEL - Fixed on screen (bottom-left)
// ═════════════════════════════════════════════════════════════════

function HTTPSControlPanel() {
  const {
    currentPhase,
    isAnimating,
    connectionStatus,
    isSecure,
    showHacker,
    setShowHacker,
    httpsMode,
    handlePhaseSelect,
    handleModeToggle,
    startHandshake,
  } = useHTTPSContext()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '320px',
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
        border: '2px solid #fbbf24',
        borderRadius: '10px',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e0e0e0',
        boxShadow: '0 16px 64px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        zIndex: 1000,
        pointerEvents: 'auto',
        userSelect: 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Compact Header */}
      <div
        style={{
          color: '#fbbf24',
          fontSize: '12px',
          fontWeight: 'bold',
          marginBottom: '10px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(251, 191, 36, 0.5)',
          textAlign: 'left',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🔐</span>
        <span>HTTPS TLS</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            padding: '2px 6px',
            background: isSecure ? '#10b98144' : '#ef444444',
            borderRadius: '4px',
            color: isSecure ? '#10b981' : '#ef4444',
          }}
        >
          {connectionStatus}
        </span>
      </div>

      {/* Mode Toggle */}
      <div style={{ marginBottom: '8px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => handleModeToggle('HTTPS')}
          style={{
            flex: 1,
            padding: '6px',
            background: httpsMode === 'HTTPS' ? '#fbbf24' : '#0f3460',
            border: '1px solid #fbbf24',
            borderRadius: '5px',
            color: httpsMode === 'HTTPS' ? '#000' : '#fbbf24',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '10px',
            transition: 'all 0.2s',
          }}
        >
          🔒 HTTPS
        </button>
        <button
          onClick={() => handleModeToggle('HTTP')}
          style={{
            flex: 1,
            padding: '6px',
            background: httpsMode === 'HTTP' ? '#ef4444' : '#0f3460',
            border: '1px solid #ef4444',
            borderRadius: '5px',
            color: httpsMode === 'HTTP' ? '#fff' : '#ef4444',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '10px',
            transition: 'all 0.2s',
          }}
        >
          ⚠️ HTTP
        </button>
      </div>

      {/* Phase Selection - Compact */}
      <div style={{ marginBottom: '8px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '4px',
          }}
        >
          {[1, 2, 3, 4, 5].map((phase) => (
            <button
              key={phase}
              onClick={() => handlePhaseSelect(phase)}
              disabled={isAnimating}
              style={{
                padding: '5px',
                background: currentPhase === phase ? '#fbbf24' : '#0f3460',
                border: '1px solid #fbbf24',
                borderRadius: '4px',
                color: currentPhase === phase ? '#000' : '#fbbf24',
                fontWeight: 'bold',
                fontSize: '10px',
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                opacity: isAnimating && currentPhase !== phase ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={startHandshake}
        disabled={isAnimating}
        style={{
          width: '100%',
          padding: '8px',
          background: isAnimating ? 'rgba(100, 100, 100, 0.6)' : '#10b981',
          border: 'none',
          borderRadius: '5px',
          color: isAnimating ? '#999' : '#fff',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: isAnimating ? 'not-allowed' : 'pointer',
          marginBottom: '8px',
          transition: 'all 0.2s',
          opacity: isAnimating ? 0.6 : 1,
        }}
      >
        {isAnimating ? '⏳ RUNNING' : '▶️ RUN 1→5'}
      </button>

      {/* Hacker Toggle */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          background: 'rgba(15, 52, 96, 0.8)',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '10px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          marginBottom: '8px',
          color: showHacker ? '#ef4444' : '#999',
          transition: 'all 0.2s',
        }}
      >
        <input
          type="checkbox"
          checked={showHacker}
          onChange={() => setShowHacker(!showHacker)}
          style={{ cursor: 'pointer', width: '14px', height: '14px' }}
        />
        <span>👨‍💻 Hacker</span>
      </label>

      {/* Phase Info */}
      <div
        style={{
          padding: '6px 8px',
          background: 'rgba(15, 52, 96, 0.8)',
          borderRadius: '5px',
          borderLeft: '3px solid #00ffcc',
          fontSize: '9px',
          color: '#00ffcc',
          lineHeight: '1.3',
        }}
      >
        {currentPhase === 1 && '📍 Setup: Client, Server, Pipe'}
        {currentPhase === 2 && '📍 Handshake: Certificate'}
        {currentPhase === 3 && '📍 Keys: Public/Private'}
        {currentPhase === 4 && '📍 Tunnel: Secure Data'}
        {currentPhase === 5 && '📍 Compare: Encrypted vs Plain'}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 1: CLIENT NODE
// ═════════════════════════════════════════════════════════════════

function ClientNode({ position }) {
  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.002
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhongMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 0, 0.7]} intensity={2} distance={3} color="#06b6d4" />
      <Text position={[0, -1.3, 0]} fontSize={0.28} color="#06b6d4" anchorX="center">
        🌐 CLIENT
      </Text>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 1: SERVER NODE
// ═════════════════════════════════════════════════════════════════

function ServerNode({ position }) {
  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z -= 0.002
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhongMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 0, 0.7]} intensity={2} distance={3} color="#10b981" />
      <Text position={[0, -1.3, 0]} fontSize={0.28} color="#10b981" anchorX="center">
        🖥️ SERVER
      </Text>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 1: TRANSMISSION PIPE
// ═════════════════════════════════════════════════════════════════

function TransmissionPipe({ pipeColor, isSecure }) {
  const cylinderRef = useRef()

  useFrame(() => {
    if (cylinderRef.current && isSecure) {
      cylinderRef.current.material.opacity = 0.6 + Math.sin(Date.now() * 0.003) * 0.2
      cylinderRef.current.material.emissive.setStyle(pipeColor)
    }
  })

  return (
    <mesh
      ref={cylinderRef}
      position={[0, 0, 0]}
      rotation={[0, 0, Math.PI / 2]}
    >
      <cylinderGeometry args={[0.4, 0.4, 10, 32]} />
      <meshStandardMaterial
        color={pipeColor}
        emissive={isSecure ? pipeColor : '#000'}
        emissiveIntensity={isSecure ? 0.6 : 0}
        transparent
        opacity={isSecure ? 0.8 : 0.3}
      />
    </mesh>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 2: CERTIFICATE SCROLL
// ═════════════════════════════════════════════════════════════════

function Certificate({ position, opacity }) {
  return (
    <group position={position}>
      {/* Main scroll */}
      <mesh>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.8}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Seal */}
      <mesh position={[0, -0.2, 0.1]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 32]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#dc2626"
          emissiveIntensity={0.7}
          transparent
          opacity={opacity}
        />
      </mesh>
      {/* Glow effect */}
      <mesh>
        <boxGeometry args={[0.6, 0.9, 0.15]} />
        <meshBasicMaterial
          color="#fbbf24"
          transparent
          opacity={opacity * 0.2}
        />
      </mesh>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 2: CLIENT HELLO CUBE
// ═════════════════════════════════════════════════════════════════

function ClientHello({ position, opacity }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial
        color="#06b6d4"
        emissive="#06b6d4"
        emissiveIntensity={0.7}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 2: VERIFICATION CHECKMARK
// ═════════════════════════════════════════════════════════════════

function VerificationCheckmark({ position, opacity }) {
  return (
    <Text position={position} fontSize={0.6} color="#10b981" anchorX="center" anchorY="middle">
      ✓
    </Text>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 3: KEY ICON (PUBLIC)
// ═════════════════════════════════════════════════════════════════

function PublicKeyIcon({ position }) {
  return (
    <group position={position}>
      {/* Key shaft */}
      <mesh position={[-0.12, 0, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.08]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Key head */}
      <mesh position={[0.18, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.08, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Label */}
      <Text position={[0, -0.4, 0]} fontSize={0.18} color="#fbbf24" anchorX="center">
        PUBLIC KEY
      </Text>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 3: KEY ICON (PRIVATE - HIDDEN)
// ═════════════════════════════════════════════════════════════════

function PrivateKeyIcon({ position, isVisible }) {
  return (
    <group position={position}>
      {/* Key shaft */}
      <mesh position={[-0.12, 0, 0]} opacity={isVisible ? 1 : 0.3}>
        <boxGeometry args={[0.5, 0.12, 0.08]} />
        <meshStandardMaterial
          color={isVisible ? '#ef4444' : '#666'}
          emissive={isVisible ? '#dc2626' : '#333'}
          emissiveIntensity={isVisible ? 0.8 : 0.2}
        />
      </mesh>
      {/* Key head */}
      <mesh position={[0.18, 0, 0]} opacity={isVisible ? 1 : 0.3}>
        <cylinderGeometry args={[0.15, 0.15, 0.08, 32]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial
          color={isVisible ? '#ef4444' : '#666'}
          emissive={isVisible ? '#dc2626' : '#333'}
          emissiveIntensity={isVisible ? 0.8 : 0.2}
        />
      </mesh>
      {/* Label */}
      <Text
        position={[0, -0.4, 0]}
        fontSize={0.18}
        color={isVisible ? '#ef4444' : '#666'}
        anchorX="center"
      >
        {isVisible ? 'PRIVATE KEY' : '🔒 HIDDEN'}
      </Text>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 3: SESSION KEY BOX (LOCKED)
// ═════════════════════════════════════════════════════════════════

function SessionKeyBox({ position, isLocked }) {
  return (
    <group position={position}>
      {/* Box */}
      <mesh position={[0, 0, 0.15]}>
        <boxGeometry args={[0.6, 0.5, 0.3]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Padlock */}
      {isLocked && (
        <>
          {/* Lock body */}
          <mesh position={[0, 0.2, 0.35]}>
            <boxGeometry args={[0.2, 0.25, 0.08]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Shackle */}
          <mesh position={[0, 0.45, 0.35]}>
            <torusGeometry args={[0.12, 0.04, 16, 32]} />
            <meshStandardMaterial
              color="#ef4444"
              emissive="#dc2626"
              emissiveIntensity={0.8}
            />
          </mesh>
        </>
      )}
      {/* Open indicator */}
      {!isLocked && (
        <Text position={[0, 0.2, 0.38]} fontSize={0.25} color="#10b981" anchorX="center">
          ✓
        </Text>
      )}
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 4: DATA CUBE (ENCRYPTED)
// ═════════════════════════════════════════════════════════════════

function DataCube({ position, isEncrypted, label }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshStandardMaterial
        color={isEncrypted ? '#fbbf24' : '#ef4444'}
        emissive={isEncrypted ? '#f59e0b' : '#dc2626'}
        emissiveIntensity={0.7}
      />
      <Text position={[0, 0, 0.15]} fontSize={0.08} color="#000" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </mesh>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 5: HACKER NODE (RED SKULL)
// ═════════════════════════════════════════════════════════════════

function HackerNode({ position, isActive, interceptedData }) {
  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.03
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshPhongMaterial
          color={isActive ? '#ef4444' : '#666'}
          emissive={isActive ? '#dc2626' : '#333'}
          emissiveIntensity={isActive ? 0.8 : 0.3}
        />
      </mesh>
      {isActive && (
        <pointLight position={[0, 0, 0.5]} intensity={2} distance={3} color="#ef4444" />
      )}
      <Text position={[0, -1.1, 0]} fontSize={0.25} color={isActive ? '#ef4444' : '#666'} anchorX="center">
        👨‍💻
      </Text>
      {interceptedData && (
        <Text position={[0, -1.5, 0]} fontSize={0.15} color="#ef4444" anchorX="center">
          INTERCEPTED
        </Text>
      )}
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// HTTPS 3D STAGE COMPONENT - Connected to context
// ═════════════════════════════════════════════════════════════════

function HTTPSStage3D() {
  const {
    currentPhase,
    isSecure,
    showHacker,
    interceptedData,
    showClientHello,
    clientHelloPos,
    showCertificate,
    certificatePos,
    certificateOpacity,
    showCheckmark,
    showPublicKey,
    showPrivateKey,
    showSessionKeyBox,
    sessionKeyPos,
    sessionKeyLocked,
    dataCubes,
    pipeColor,
  } = useHTTPSContext()

  return (
    <group>
      {/* ═══ PHASE 1: BASIC SETUP ═══════════════════════════════ */}
      {currentPhase >= 1 && (
        <>
          <ClientNode position={[-5, 0, 0]} />
          <ServerNode position={[5, 0, 0]} />
          <TransmissionPipe pipeColor={pipeColor} isSecure={isSecure} />
        </>
      )}

      {/* ─── Hacker node (optional) ────────────────────────────── */}
      {showHacker && currentPhase >= 1 && (
        <HackerNode
          position={[0, 2.5, 0]}
          isActive={showHacker}
          interceptedData={interceptedData}
        />
      )}

      {/* ═══ PHASE 2: HANDSHAKE ANIMATION ═════════════════════════ */}
      {currentPhase >= 2 && (
        <>
          {showClientHello && <ClientHello position={clientHelloPos} opacity={1} />}
          {showCertificate && (
            <Certificate position={certificatePos} opacity={certificateOpacity} />
          )}
          {showCheckmark && (
            <VerificationCheckmark position={[-5, 1.2, 0]} opacity={1} />
          )}
        </>
      )}

      {/* ═══ PHASE 3: ASYMMETRIC ENCRYPTION ═══════════════════════ */}
      {currentPhase >= 3 && (
        <>
          {showPublicKey && <PublicKeyIcon position={[5, 1.2, 0]} />}
          {showPrivateKey && (
            <PrivateKeyIcon position={[5, -1.2, 0]} isVisible={true} />
          )}
          {showSessionKeyBox && (
            <SessionKeyBox position={sessionKeyPos} isLocked={sessionKeyLocked} />
          )}
        </>
      )}

      {/* ═══ PHASE 4 & 5: DATA CUBES (ENCRYPTED) ═════════════════ */}
      {currentPhase >= 4 &&
        dataCubes.map((cube) => (
          <DataCube
            key={cube.id}
            position={[cube.pos, 0, 0]}
            isEncrypted={cube.isEncrypted}
            label={cube.label}
          />
        ))}
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// MAIN EXPORTS
// ═════════════════════════════════════════════════════════════════

// Export provider for use at Scene3D level
export { HTTPSProvider }

// Export control panel container that renders ONLY the UI panel
export function HTTPSControlPanelContainer() {
  return <HTTPSControlPanel />
}

// Default export - the 3D visualization (for use INSIDE Canvas)
// Must be wrapped by HTTPSProvider at Scene3D level for context access
export default function HTTPSViz() {
  return <HTTPSStage3D />
}
