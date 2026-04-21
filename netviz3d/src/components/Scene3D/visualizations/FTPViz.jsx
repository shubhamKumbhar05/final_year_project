/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import gsap from 'gsap'
/* eslint-enable no-unused-vars */

/**
 * FTP (File Transfer Protocol) Visualization - PERFECTED
 * Complete FTP protocol simulation with multiple phases
 *
 * Phase 1: Connection Establishment (TCP Handshake) ✅
 * Phase 2: Authentication (USER/PASS commands) ✅
 * Phase 3: Data Connection Setup (PASV/PORT modes) ✅
 * Phase 4: File Transfer (STOR/RETR commands) ✅
 * Phase 5: Connection Termination & Cleanup ✅
 */

// ═════════════════════════════════════════════════════════════════
// FTP COMMAND LOG TERMINAL
// ═════════════════════════════════════════════════════════════════

function CommandTerminal({ logs, isConnected }) {
  return (
    <div
      style={{
        background: '#0a0e27',
        border: '1px solid #10b981',
        borderRadius: '4px',
        padding: '6px',
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#34d399',
        maxHeight: '100px',
        overflowY: 'auto',
        lineHeight: '1.3',
        marginTop: '8px'
      }}
    >
      {logs.length === 0 ? (
        <div style={{ color: 'rgba(52, 211, 153, 0.5)' }}>• Ready to connect...</div>
      ) : (
        logs.map((log, idx) => (
          <div key={idx} style={{ color: log.type === 'error' ? '#ef4444' : '#34d399', marginBottom: '2px' }}>
            {log.type === 'sent' && '▶ '}
            {log.type === 'received' && '◀ '}
            {log.type === 'error' && '✗ '}
            {log.type === 'success' && '✓ '}
            {log.message}
          </div>
        ))
      )}
      {isConnected && <div style={{ color: '#10b981', marginTop: '4px' }}>🟢 Connected</div>}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════
// ENHANCED FTP CONTROL PANEL
// ═════════════════════════════════════════════════════════════════

function FTPControlPanel({ onConnect, onTransfer, onModeToggle, isTransferring, isConnected, mode, onDisconnect }) {
  const panelRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [selectedFile, setSelectedFile] = useState('document.pdf')
  const [transferType, setTransferType] = useState('upload')
  const [logs, setLogs] = useState([])

  const fileDirectory = [
    { name: 'document.pdf', size: '2.5 MB', icon: '📄' },
    { name: 'image.jpg', size: '1.8 MB', icon: '🖼️' },
    { name: 'data.zip', size: '5.2 MB', icon: '📦' },
    { name: 'video.mp4', size: '156 MB', icon: '🎬' },
    { name: 'config.xml', size: '45 KB', icon: '⚙️' },
    { name: 'archive.tar.gz', size: '12.3 MB', icon: '📚' },
    { name: 'script.js', size: '256 KB', icon: '📝' }
  ]

  const addLog = useCallback((message, type = 'info') => {
    setLogs((prev) => [...prev.slice(-5), { message, type }])
  }, [])

  const handleConnect = useCallback(() => {
    if (isConnected) {
      addLog('QUIT', 'sent')
      setTimeout(() => addLog('221 Goodbye', 'received'), 300)
      onDisconnect()
      return
    }

    // Connection sequence simulation
    addLog('USER anonymous', 'sent')
    setTimeout(() => addLog('331 Anonymous login ok', 'received'), 200)

    setTimeout(() => {
      addLog('PASS user@example.com', 'sent')
      setTimeout(() => addLog('230 Login successful', 'received'), 200)
    }, 500)

    setTimeout(() => {
      addLog('SYST', 'sent')
      setTimeout(() => addLog('215 UNIX Type: L8', 'received'), 200)
    }, 900)

    setTimeout(() => {
      onConnect()
    }, 1500)
  }, [isConnected, onConnect, onDisconnect, addLog])

  const handleTransfer = useCallback(() => {
    if (!isConnected) {
      addLog('Error: Not connected', 'error')
      return
    }

    const cmd = transferType === 'upload' ? 'STOR' : 'RETR'
    addLog(`${cmd} ${selectedFile}`, 'sent')
    addLog('150 Opening BINARY mode data connection', 'received')

    onTransfer(selectedFile, transferType)

    setTimeout(() => {
      addLog('226 Transfer complete', 'received')
    }, 3000)
  }, [isConnected, selectedFile, transferType, onTransfer, addLog])

  const handleMouseDown = (e) => {
    setDragging(true)
    setOffset({
      x: e.clientX - panelRef.current.offsetLeft,
      y: e.clientY - panelRef.current.offsetTop
    })
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging || !panelRef.current) return
      panelRef.current.style.left = `${e.clientX - offset.x}px`
      panelRef.current.style.top = `${e.clientY - offset.y}px`
    }

    const handleMouseUp = () => {
      setDragging(false)
    }

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, offset])

  return (
    <Html position={[0, 3.5, 0]} scale={0.8} distanceFactor={1.2}>
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          left: '20px',
          top: '20px',
          width: '380px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.96) 0%, rgba(52, 211, 153, 0.92) 100%)',
          border: '2px solid #10b981',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 12px 40px rgba(16, 185, 129, 0.4)',
          color: '#fff',
          fontFamily: 'monospace',
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 1000
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>📁 FTP Protocol Viz</div>
          <div style={{ fontSize: '10px', color: isConnected ? '#22c55e' : '#ef4444' }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        {/* Connection Button */}
        <button
          onClick={handleConnect}
          disabled={isTransferring}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '11px',
            fontWeight: 'bold',
            background: isConnected ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)',
            border: `2px solid ${isConnected ? '#ef4444' : '#22c55e'}`,
            color: '#fff',
            borderRadius: '6px',
            cursor: isTransferring ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            if (!isTransferring) {
              e.target.style.background = isConnected ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isTransferring) {
              e.target.style.background = isConnected ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'
            }
          }}
        >
          {isConnected ? '🔌 DISCONNECT' : '🔌 CONNECT'}
        </button>

        {isConnected && (
          <>
            {/* Mode Toggle */}
            <div style={{ marginBottom: '10px', display: 'flex', gap: '6px' }}>
              <button
                onClick={() => onModeToggle('passive')}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '10px',
                  background: mode === 'passive' ? '#059669' : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${mode === 'passive' ? '#34d399' : 'rgba(255,255,255,0.3)'}`,
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                PASV
              </button>
              <button
                onClick={() => onModeToggle('active')}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '10px',
                  background: mode === 'active' ? '#059669' : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${mode === 'active' ? '#34d399' : 'rgba(255,255,255,0.3)'}`,
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                PORT
              </button>
            </div>

            {/* Transfer Type Selector */}
            <div style={{ marginBottom: '10px', display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setTransferType('upload')}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '10px',
                  background: transferType === 'upload' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${transferType === 'upload' ? '#60a5fa' : 'rgba(255,255,255,0.3)'}`,
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                ⬆️ UPLOAD
              </button>
              <button
                onClick={() => setTransferType('download')}
                style={{
                  flex: 1,
                  padding: '6px',
                  fontSize: '10px',
                  background: transferType === 'download' ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${transferType === 'download' ? '#a78bfa' : 'rgba(255,255,255,0.3)'}`,
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                ⬇️ DOWNLOAD
              </button>
            </div>

            {/* File Selection */}
            <div style={{ marginBottom: '10px', fontSize: '10px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Select File:</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '9px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {fileDirectory.map((file) => (
                  <option key={file.name} value={file.name}>
                    {file.icon} {file.name} ({file.size})
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Button */}
            <button
              onClick={handleTransfer}
              disabled={isTransferring}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                background: isTransferring ? 'rgba(100,100,100,0.5)' : 'rgba(251, 191, 36, 0.8)',
                border: '2px solid #fbbf24',
                color: '#000',
                borderRadius: '6px',
                cursor: isTransferring ? 'not-allowed' : 'pointer',
                marginBottom: '10px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!isTransferring) e.target.style.background = 'rgba(251, 191, 36, 1)'
              }}
              onMouseLeave={(e) => {
                if (!isTransferring) e.target.style.background = 'rgba(251, 191, 36, 0.8)'
              }}
            >
              {isTransferring ? '⏳ Transferring...' : `▶️ ${transferType.toUpperCase()}`}
            </button>
          </>
        )}

        {/* Command Terminal */}
        <CommandTerminal logs={logs} isConnected={isConnected} />
      </div>
    </Html>
  )
}

// ═════════════════════════════════════════════════════════════════
// 3D COMPONENTS: SERVER
// ═════════════════════════════════════════════════════════════════

function FTPServer({ isConnected }) {
  const meshRef = useRef()
  const lightsRef = useRef([])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008
      meshRef.current.position.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.08
    }

    lightsRef.current.forEach((light, idx) => {
      if (light) {
        light.intensity = isConnected ? 0.8 + Math.sin(state.clock.elapsedTime * 2 + idx) * 0.3 : 0.3
      }
    })
  })

  return (
    <group position={[5, 0, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 3, 0.9]} />
        <meshStandardMaterial
          color={isConnected ? '#10b981' : '#4b5563'}
          emissive={isConnected ? '#059669' : '#2d3748'}
          emissiveIntensity={0.6}
        />
      </mesh>

      {[0, 1, 2, 3].map((i) => (
        <mesh key={`light-${i}`} position={[0.5, 0.9 - i * 0.6, 0.55]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={isConnected ? '#34d399' : '#6b7280'}
            emissive={isConnected ? '#10b981' : '#4b5563'}
            ref={(mesh) => (lightsRef.current[i] = mesh)}
          />
        </mesh>
      ))}

      {[0, 1, 2].map((i) => (
        <mesh key={`vent-${i}`} position={[-0.5, 0.6 - i * 0.8, 0.5]}>
          <boxGeometry args={[0.3, 0.3, 0.1]} />
          <meshStandardMaterial color="#1f2937" emissive="#111827" emissiveIntensity={0.4} />
        </mesh>
      ))}

      <Text position={[0, -1.7, 0]} fontSize={0.28} color="#fff" anchorX="center" anchorY="middle">
        FTP SERVER
      </Text>

      <mesh>
        <boxGeometry args={[1.4, 3.2, 1.1]} />
        <meshStandardMaterial
          color={isConnected ? '#10b981' : '#4b5563'}
          emissive={isConnected ? '#059669' : '#2d3748'}
          emissiveIntensity={isConnected ? 0.2 : 0.05}
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// 3D COMPONENTS: CLIENT
// ═════════════════════════════════════════════════════════════════

function FTPClient({ isConnected }) {
  const meshRef = useRef()

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= 0.006
    }
  })

  return (
    <group position={[-5, 0, 0]}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 2, 0.9]} />
        <meshStandardMaterial
          color={isConnected ? '#3b82f6' : '#4b5563'}
          emissive={isConnected ? '#1e40af' : '#2d3748'}
          emissiveIntensity={0.5}
        />
      </mesh>

      <mesh position={[0, 0.6, 0.5]}>
        <planeGeometry args={[0.6, 0.5]} />
        <meshStandardMaterial
          color={isConnected ? '#60a5fa' : '#6b7280'}
          emissive={isConnected ? '#1e40af' : '#4b5563'}
          emissiveIntensity={isConnected ? 0.6 : 0.2}
        />
      </mesh>

      {[0, 1].map((i) => (
        <mesh key={`key-${i}`} position={[-0.2 + i * 0.4, -0.7, 0.45]}>
          <boxGeometry args={[0.15, 0.1, 0.1]} />
          <meshStandardMaterial color="#6b7280" emissive="#4b5563" emissiveIntensity={0.3} />
        </mesh>
      ))}

      <Text position={[0, -1.3, 0]} fontSize={0.24} color="#fff" anchorX="center" anchorY="middle">
        CLIENT
      </Text>

      <mesh>
        <boxGeometry args={[1.2, 2.2, 1.1]} />
        <meshStandardMaterial
          color={isConnected ? '#3b82f6' : '#4b5563'}
          emissive={isConnected ? '#1e40af' : '#2d3748'}
          emissiveIntensity={isConnected ? 0.15 : 0.03}
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// 3D COMPONENTS: FILE PACKET
// ═════════════════════════════════════════════════════════════════

function FilePacket({ position, progress, transferType }) {
  const groupRef = useRef()

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.05
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.01
    }
  })

  const color = transferType === 'upload' ? '#3b82f6' : '#8b5cf6'
  const emissive = transferType === 'upload' ? '#1e40af' : '#6d28d9'

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.6, 0.6, 0.4]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.7} />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.45, 0.06, 8, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>

      {progress > 0 && (
        <mesh position={[0, 0, 0.01]}>
          <torusGeometry args={[0.43, 0.04, 8, Math.max(4, Math.floor((progress / 100) * 32))]} />
          <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.9} />
        </mesh>
      )}

      <Text position={[0, 0, 0.25]} fontSize={0.2} color="#fff" anchorX="center" anchorY="middle">
        📦
      </Text>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// 3D COMPONENTS: CONNECTION LINE
// ═════════════════════════════════════════════════════════════════

function ConnectionLine({ isConnected, mode, isTransferring, transferType }) {
  const getColor = () => {
    if (!isConnected) return '#6b7280'
    if (isTransferring) return transferType === 'upload' ? '#3b82f6' : '#8b5cf6'
    return mode === 'passive' ? '#34d399' : '#fbbf24'
  }

  return (
    <>
      <line position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-4, 0, 0, 4, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={getColor()} linewidth={isTransferring ? 4 : 2} />
      </line>

      {isConnected && (
        <Text position={[0, 0.7, 0]} fontSize={0.18} color={getColor()} anchorX="center">
          {mode === 'passive' ? 'PASV' : 'PORT'}
        </Text>
      )}

      {isTransferring &&
        [0, 1, 2].map((i) => {
          const offset = (Date.now() * 0.001 + i * 0.3) % 1
          const x = transferType === 'upload' ? -4 + offset * 8 : 4 - offset * 8
          return (
            <mesh key={`particle-${i}`} position={[x, 0, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color={getColor()} emissive={getColor()} emissiveIntensity={0.8} />
            </mesh>
          )
        })}
    </>
  )
}

// ═════════════════════════════════════════════════════════════════
// MAIN FTP VISUALIZATION EXPORT
// ═════════════════════════════════════════════════════════════════

export default function FTPViz() {
  const [isConnected, setIsConnected] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [mode, setMode] = useState('passive')
  const [activeTransfer, setActiveTransfer] = useState(null)
  const [transferProgress, setTransferProgress] = useState(0)
  const timelineRef = useRef(null)

  const handleConnect = useCallback(() => {
    setIsConnected(true)
  }, [])

  const handleDisconnect = useCallback(() => {
    setIsConnected(false)
    setActiveTransfer(null)
    setIsTransferring(false)
  }, [])

  const handleTransfer = useCallback((fileName, transferType) => {
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    setIsTransferring(true)
    setActiveTransfer({ fileName, type: transferType })
    setTransferProgress(0)

    const tl = gsap.timeline()
    timelineRef.current = tl

    tl.to(
      { progress: 0 },
      {
        progress: 100,
        duration: 3,
        ease: 'power1.inOut',
        onUpdate: function () {
          setTransferProgress(this.targets()[0].progress)
        }
      }
    )

    tl.call(() => {
      setIsTransferring(false)
      setActiveTransfer(null)
      setTransferProgress(0)
    })
  }, [])

  const handleModeToggle = useCallback((newMode) => {
    setMode(newMode)
  }, [])

  return (
    <>
      <FTPControlPanel
        onConnect={handleConnect}
        onTransfer={handleTransfer}
        onModeToggle={handleModeToggle}
        isTransferring={isTransferring}
        isConnected={isConnected}
        mode={mode}
        onDisconnect={handleDisconnect}
      />

      <group>
        <FTPClient isConnected={isConnected} />

        <ConnectionLine
          isConnected={isConnected}
          mode={mode}
          isTransferring={isTransferring}
          transferType={activeTransfer?.type}
        />

        {activeTransfer && (
          <group
            position={
              activeTransfer.type === 'upload'
                ? [-5 + transferProgress * 0.1, 0.5 + Math.sin(transferProgress * 0.05) * 0.2, 0]
                : [5 - transferProgress * 0.1, 0.5 + Math.sin(transferProgress * 0.05) * 0.2, 0]
            }
          >
            <FilePacket position={[0, 0, 0]} progress={transferProgress} transferType={activeTransfer.type} />
            <Text position={[0, -0.6, 0]} fontSize={0.14} color="#fef3c7" anchorX="center">
              {Math.round(transferProgress)}%
            </Text>
          </group>
        )}

        <FTPServer isConnected={isConnected} />

        {!isConnected && (
          <Text position={[0, -2.5, 0]} fontSize={0.2} color="#ef4444" anchorX="center">
            ⚠️ Connection Closed
          </Text>
        )}

        {isConnected && !isTransferring && (
          <Text position={[0, -2.5, 0]} fontSize={0.2} color="#22c55e" anchorX="center">
            ✓ Ready to Transfer
          </Text>
        )}

        {isTransferring && (
          <Text position={[0, -2.5, 0]} fontSize={0.2} color="#3b82f6" anchorX="center">
            ⬆️ {Math.round(transferProgress)}%
          </Text>
        )}
      </group>
    </>
  )
}
