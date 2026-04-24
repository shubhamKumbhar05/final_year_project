/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import gsap from 'gsap'
/* eslint-enable no-unused-vars */

/**
 * DNS (Domain Name System) Visualization
 * Shows hierarchical DNS lookup from URL to IP address
 *
 * Phase 1: Identity Nodes ✅
 * Phase 2: URL Request Animation ✅
 * Phase 3: Recursive Search (The Chase) ✅
 * Phase 4: IP Discovery & Return ✅
 * Phase 5: DNS Caching Logic ✅
 */

// ═════════════════════════════════════════════════════════════════
// HELPER: Extract domain from URL
// ═════════════════════════════════════════════════════════════════

const extractDomain = (url) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`)
    return urlObj.hostname
  } catch {
    return url
  }
}

// ═════════════════════════════════════════════════════════════════
// PHASE 1: NODE COMPONENTS
// ═════════════════════════════════════════════════════════════════

function DNSNode({ position, label, color, isGlowing }) {
  const meshRef = useRef()
  const glowRef = useRef()

  useFrame((state) => {
    if (isGlowing && glowRef.current) {
      glowRef.current.rotation.z += 0.02
      glowRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.2
    }
  })

  return (
    <group position={position}>
      {/* Main cube */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshPhongMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>

      {/* Glow effect when caching */}
      {isGlowing && (
        <mesh ref={glowRef}>
          <torusGeometry args={[1.2, 0.15, 8, 100]} rotation={[Math.PI / 4, 0, 0]} />
          <meshBasicMaterial color={color} transparent depthWrite={false} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, -1.3, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: color,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            border: `1px solid ${color}`,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// DNS QUERY PACKET
// ═════════════════════════════════════════════════════════════════

function DNSPacket({ position, label, color, opacity }) {
  return (
    <group position={position}>
      {/* Packet cube */}
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Glow aura */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.2 * opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      <Html position={[0, 0.8, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: color,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '9px',
            fontFamily: 'monospace',
            maxWidth: '150px',
            wordBreak: 'break-all',
            whiteSpace: 'normal',
            border: `1px solid ${color}`,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// PHASE 3: QUERY PULSE (for hop visualization)
// ═════════════════════════════════════════════════════════════════

function QueryPulse({ startPos, endPos, isActive, label, color }) {
  const meshRef = useRef()
  const t = useRef(0)

  useFrame(() => {
    if (!isActive || !meshRef.current) return
    t.current += 0.016

    const progress = (t.current % 2) / 2 // 0-1 loop
    const currentPos = [
      startPos[0] + (endPos[0] - startPos[0]) * progress,
      startPos[1] + (endPos[1] - startPos[1]) * progress,
      startPos[2] + (endPos[2] - startPos[2]) * progress,
    ]

    meshRef.current.position.set(currentPos[0], currentPos[1], currentPos[2])
    meshRef.current.scale.set(
      0.5 + Math.sin(progress * Math.PI * 2) * 0.3,
      0.5 + Math.sin(progress * Math.PI * 2) * 0.3,
      0.5 + Math.sin(progress * Math.PI * 2) * 0.3
    )
  })

  if (!isActive) return null

  return (
    <group ref={meshRef} position={startPos}>
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color={color} emissive={color} />
      </mesh>
      <Html position={[0, 0.6, 0]} center>
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            color: color,
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '8px',
            fontFamily: 'monospace',
            border: `1px solid ${color}`,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// MAIN DNS STAGE
// ═════════════════════════════════════════════════════════════════

function DNSStage() {
  // Input state
  const [userInput, setUserInput] = useState('google.com')

  // Animation state
  const [packetPosition, setPacketPosition] = useState([-5, 0, 0])
  const [packetLabel, setPacketLabel] = useState('')
  const [packetColor, setPacketColor] = useState('#ffffff')
  const [packetOpacity, setPacketOpacity] = useState(0)
  const [showPacket, setShowPacket] = useState(false)

  // Hop animation state
  const [activeHops, setActiveHops] = useState({})
  const [currentHop, setCurrentHop] = useState(null)

  // Cache state
  const [resolverGlowing, setResolverGlowing] = useState(false)
  const [cachedDomains, setCachedDomains] = useState({})
  const [uiMessage, setUiMessage] = useState('Enter a domain name and click RESOLVE')

  // Dragging state
  const [uiOffsetX, setUiOffsetX] = useState(0)
  const [uiOffsetY, setUiOffsetY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Node positions
  const userPos = [-5, 0, 0]
  const resolverPos = [-2, 0, 0]
  const rootPos = [1, 2, 0]
  const tldPos = [1, 0, 0]
  const authPos = [1, -2, 0]

  // Generate fake IP
  const generateIP = (domain) => {
    const hash = domain.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return `${hash % 256}.${(hash * 7) % 256}.${(hash * 13) % 256}.${(hash * 19) % 256}`
  }

  // Handle resolve button
  const handleResolve = useCallback(() => {
    const domain = extractDomain(userInput)

    // Check cache
    if (cachedDomains[domain]) {
      setUiMessage(`✅ Cache HIT! Resolved ${domain} → ${cachedDomains[domain]}`)
      animateCachedResolution(domain, cachedDomains[domain])
      return
    }

    // Full DNS resolution
    setUiMessage(`🔍 Resolving ${domain}...`)
    startDNSResolution(domain)
  }, [userInput, cachedDomains])

  // Handle dragging
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - uiOffsetX, y: e.clientY - uiOffsetY })
  }

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return
      setUiOffsetX(e.clientX - dragStart.x)
      setUiOffsetY(e.clientY - dragStart.y)
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add document event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Animation: User sends query to Resolver
  const startDNSResolution = (domain) => {
    const timeline = gsap.timeline()

    // Phase 1: White packet to resolver
    timeline.to(
      { x: -5, y: 0 },
      {
        x: -2,
        y: 0,
        duration: 1,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
          setPacketColor('#ffffff')
          setPacketLabel(domain)
          setShowPacket(true)
        },
      },
      0
    )

    // Phase 2: Queries to servers (hops)
    timeline.call(() => {
      setUiMessage('📡 Querying Root Server...')
      setActiveHops({ hop1: true })
    }, null, 1)

    // Hop 1: Resolver → Root
    timeline.to(
      { x: -2, y: 0 },
      {
        x: 1,
        y: 2,
        duration: 1,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
        },
      },
      1
    )

    timeline.call(() => {
      setUiMessage('📡 Querying TLD Server (.com)...')
      setActiveHops({ hop2: true })
      setCurrentHop('hop1')
    }, null, 2)

    // Hop 2: Resolver → TLD
    timeline.to(
      { x: 1, y: 2 },
      {
        x: 1,
        y: 0,
        duration: 1,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
        },
      },
      2
    )

    timeline.call(() => {
      setUiMessage('📡 Querying Authoritative Server...')
      setActiveHops({ hop3: true })
      setCurrentHop('hop2')
    }, null, 3)

    // Hop 3: Resolver → Authoritative
    timeline.to(
      { x: 1, y: 0 },
      {
        x: 1,
        y: -2,
        duration: 1,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
        },
      },
      3
    )

    // Phase 3: Transform to gold IP packet
    timeline.call(() => {
      const ip = generateIP(domain)
      setUiMessage(`✨ Found! ${domain} → ${ip}`)
      setPacketColor('#fbbf24')
      setPacketLabel(ip)
      setResolverGlowing(true)
      setCachedDomains((prev) => ({ ...prev, [domain]: ip }))
      setCurrentHop('hop3')
    }, null, 4)

    // Phase 4: Return to user
    timeline.to(
      { x: 1, y: -2 },
      {
        x: -5,
        y: 0,
        duration: 1.5,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
        },
      },
      4
    )

    timeline.call(() => {
      setUiMessage(`✅ DNS Resolution Complete! ${domain} is now accessible.`)
      setShowPacket(false)
      setResolverGlowing(false)
      setActiveHops({})
      setCurrentHop(null)
    }, null, 5.5)
  }

  // Cached resolution (faster)
  const animateCachedResolution = (domain, ip) => {
    const timeline = gsap.timeline()

    // Resolver glows
    setResolverGlowing(true)

    // Fast packet: User → Resolver
    timeline.to(
      { x: -5, y: 0 },
      {
        x: -2,
        y: 0,
        duration: 0.5,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
          setPacketColor('#ffffff')
          setPacketLabel(domain)
          setShowPacket(true)
        },
      },
      0
    )

    // Instant response: Resolver → User (gold)
    timeline.to(
      { x: -2, y: 0 },
      {
        x: -5,
        y: 0,
        duration: 0.3,
        onUpdate: function () {
          setPacketPosition([this.targets()[0].x, this.targets()[0].y, 0])
        },
      },
      0.5
    )

    timeline.call(() => {
      setPacketColor('#fbbf24')
      setPacketLabel(ip)
    }, null, 0.5)

    timeline.call(() => {
      setShowPacket(false)
      setResolverGlowing(false)
    }, null, 0.8)
  }

  return (
    <group>
      {/* ── PHASE 1: IDENTITY NODES ──────────────────────────────────────── */}

      {/* User PC */}
      <DNSNode position={userPos} label="USER PC" color="#06b6d4" isGlowing={false} />

      {/* Local Resolver */}
      <DNSNode position={resolverPos} label="Local Resolver" color="#8b5cf6" isGlowing={resolverGlowing} />

      {/* Root Server */}
      <DNSNode position={rootPos} label="Root Server" color="#ec4899" isGlowing={false} />

      {/* TLD Server */}
      <DNSNode position={tldPos} label="TLD Server (.com)" color="#f59e0b" isGlowing={false} />

      {/* Authoritative Server */}
      <DNSNode position={authPos} label="Authoritative" color="#10b981" isGlowing={false} />

      {/* ── PHASE 2 & 4: DNS PACKET ───────────────────────────────────────── */}
      {showPacket && (
        <DNSPacket position={packetPosition} label={packetLabel} color={packetColor} opacity={1} />
      )}

      {/* ── PHASE 3: QUERY PULSES (The Hops) ──────────────────────────────── */}
      <QueryPulse startPos={resolverPos} endPos={rootPos} isActive={activeHops.hop1} label="Where is .com?" color="#ec4899" />
      <QueryPulse
        startPos={resolverPos}
        endPos={tldPos}
        isActive={activeHops.hop2}
        label="Where is domain?"
        color="#f59e0b"
      />
      <QueryPulse
        startPos={resolverPos}
        endPos={authPos}
        isActive={activeHops.hop3}
        label="What is IP?"
        color="#10b981"
      />

      {/* ── CONNECTION LINES ──────────────────────────────────────────────── */}
      {/* User to Resolver */}
      <line position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([userPos[0], userPos[1], userPos[2], resolverPos[0], resolverPos[1], resolverPos[2]])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888888" linewidth={1} transparent opacity={0.3} />
      </line>

      {/* Resolver to Servers */}
      <line position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={
              new Float32Array([resolverPos[0], resolverPos[1], resolverPos[2], rootPos[0], rootPos[1], rootPos[2]])
            }
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888888" linewidth={1} transparent opacity={0.3} />
      </line>

      <line position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([resolverPos[0], resolverPos[1], resolverPos[2], tldPos[0], tldPos[1], tldPos[2]])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888888" linewidth={1} transparent opacity={0.3} />
      </line>

      <line position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([resolverPos[0], resolverPos[1], resolverPos[2], authPos[0], authPos[1], authPos[2]])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888888" linewidth={1} transparent opacity={0.3} />
      </line>

      {/* ── UI OVERLAY ────────────────────────────────────────────────────── */}
      <Html
        position={[(uiOffsetX / 100) * 0, (uiOffsetY / 100 + 3.5) * 0, 0]}
        scale={1}
        center
        style={{
          position: 'fixed',
          left: `calc(50% + ${uiOffsetX}px)`,
          top: `calc(50% - ${uiOffsetY}px)`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(22, 33, 62, 0.9))',
            border: '2px solid #8b5cf6',
            borderRadius: '8px',
            padding: '16px',
            width: '400px',
            fontFamily: 'monospace',
            color: '#e0e0e0',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.2)',
            pointerEvents: 'auto',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          role="region"
          aria-label="DNS Resolution Control"
        >
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '10px' }}>
            🔍 DNS RESOLUTION
          </div>

          {/* Domain Input */}
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter domain (e.g., google.com)"
            aria-label="Domain input"
            style={{
              width: '100%',
              padding: '8px',
              background: '#0f3460',
              border: '1px solid #8b5cf6',
              borderRadius: '4px',
              color: '#ffffff',
              fontFamily: 'monospace',
              fontSize: '11px',
              marginBottom: '8px',
              boxSizing: 'border-box',
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleResolve()}
          />

          {/* Resolve Button */}
          <button
            onClick={handleResolve}
            type="button"
            aria-label="Resolve domain"
            style={{
              width: '100%',
              padding: '8px',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '11px',
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#a78bfa'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#8b5cf6'
            }}
          >
            ▶ RESOLVE
          </button>

          {/* Status Message */}
          <div
            style={{
              fontSize: '10px',
              color: '#8b5cf6',
              lineHeight: '1.4',
              minHeight: '30px',
            }}
          >
            {uiMessage}
          </div>

          {/* Cached Domains List */}
          {Object.keys(cachedDomains).length > 0 && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px',
                background: '#0f3460',
                borderRadius: '4px',
                fontSize: '9px',
                color: '#10b981',
                maxHeight: '80px',
                overflowY: 'auto',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📦 CACHE:</div>
              {Object.entries(cachedDomains).map(([domain, ip]) => (
                <div key={domain} style={{ marginBottom: '2px' }}>
                  {domain} → {ip}
                </div>
              ))}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════

export default function DNSViz() {
  return <DNSStage />
}
