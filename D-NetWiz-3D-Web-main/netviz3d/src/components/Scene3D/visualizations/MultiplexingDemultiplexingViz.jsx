/**
 * Multiplexing and Demultiplexing Visualization
 * 
 * The Concept: "The Three-to-One-to-Three" Bridge with 15 Packet Flows
 * - Each of the 3 client apps sends 5 packets (15 TOTAL)
 * - Synchronized first wave: all 3 apps send 1st packet at t=0
 * - Then: remaining 12 packets interleaved randomly with 1s spacing
 * - All packets share 1 tunnel and may arrive out of order
 * - At DEMUX, port numbers determine correct destination app
 * - PROVES multiplexing works in real-world chaotic conditions!
 * 
 * ANIMATION TIMING (Slow & Smooth - 7.5 seconds per packet):
 * - Wire travel: 1.5s | MUX pause: 0.8s | Tunnel: 3s | DEMUX: 0.8s | Server: 1.5s
 * 
 * Phase 1: Static Geometry & Wire Paths ✅
 * Phase 2: 15-Packet Animation with Synchronized Start + Random Flow ✅
 * Phase 3: Intelligent Port-Based Demultiplexing ✅
 */

import React, { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Line, Sphere } from '@react-three/drei'

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CLIENT_X = -5
const SERVER_X = 5
const TUNNEL_LENGTH = SERVER_X - CLIENT_X

// Application positions (inside each node)
const APP_POSITIONS_Y = [0.7, 0, -0.7] // Top, Middle, Bottom
const APP_COLORS = ['#ef4444', '#22c55e', '#3b82f6'] // Red, Green, Blue
const APP_NAMES = ['App A (Port 80)', 'App B (Port 443)', 'App C (Port 8080)']
const APP_PORTS = [80, 443, 8080]

// MUX/DEMUX junction points
const MUX_JUNCTION_X = CLIENT_X + 1.5 // Just before tunnel entry
const DEMUX_JUNCTION_X = SERVER_X - 1.5 // Just after tunnel exit

// Y positions at MUX/DEMUX junctions (where wires connect)
const MUX_WIRE_Y_POSITIONS = [0.3, 0, -0.3] // Red, Green, Blue wires at MUX
const DEMUX_WIRE_Y_POSITIONS = [0.3, 0, -0.3] // Red, Green, Blue wires at DEMUX

// Animation timing constants - Total 7.5 seconds (1.5x slower for better understanding)
const WIRE_TRAVEL_TIME = 1.5 // Phase 1: Client app → MUX (1.5s)
const MUX_PAUSE_TIME = 0.8 // MUX pause for header stamping (0.8s)
const TUNNEL_TRAVEL_TIME = 3 // Phase 2: Through tunnel (3s)
const DEMUX_PAUSE_TIME = 0.8 // DEMUX pause for port routing (0.8s)
const SERVER_TRAVEL_TIME = 1.5 // Phase 3: DEMUX → Server app (1.5s)
const SEGMENT_DURATION = WIRE_TRAVEL_TIME + MUX_PAUSE_TIME + TUNNEL_TRAVEL_TIME + DEMUX_PAUSE_TIME + SERVER_TRAVEL_TIME

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Application Cube (Red/Green/Blue)
// ═══════════════════════════════════════════════════════════════

function AppCube({ position, color, label, labelSide = 'center' }) {
  // Determine label position based on side
  const getLabelPosition = () => {
    if (labelSide === 'left') return [-0.55, 0, 0]
    if (labelSide === 'right') return [0.55, 0, 0]
    return [0, -0.6, 0] // center/bottom
  }

  const getLabelAnchor = () => {
    if (labelSide === 'left') return 'right'
    if (labelSide === 'right') return 'left'
    return 'center'
  }

  return (
    <group position={position}>
      {/* Main cube */}
      <mesh>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.05, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>

      {/* Label */}
      <Text position={getLabelPosition()} fontSize={0.16} color={color} anchorX={getLabelAnchor()} fontWeight="bold">
        {label}
      </Text>

      {/* Point light for glow */}
      <pointLight position={[0, 0, 0]} intensity={1.5} distance={2} color={color} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Wire Path (Curved line from App to Junction)
// ═══════════════════════════════════════════════════════════════

function WirePath({ startPos, endPos, color, dashes = false }) {
  // Generate curved path (parabolic arc)
  const points = []
  const segments = 50

  for (let i = 0; i <= segments; i++) {
    const t = i / segments // 0 to 1
    // Proper parabolic interpolation: linear interpolation + arc
    const x = startPos[0] + (endPos[0] - startPos[0]) * t
    const y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 0.25 // Arc on top of linear path
    const z = startPos[2] + (endPos[2] - startPos[2]) * t

    points.push([x, y, z])
  }

  return (
    <Line
      points={points}
      color={color}
      lineWidth={3}
      dashed={dashes}
      dashScale={0.5}
      transparent
      opacity={0.2}
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Junction Point (MUX or DEMUX)
// ═══════════════════════════════════════════════════════════════

function JunctionPoint({ position, type = 'mux', color = '#fbbf24' }) {
  const meshRef = useRef(null)

  // Gentle pulse animation
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.2
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={position}>
      {/* Main junction sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Ring around junction */}
      <mesh>
        <torusGeometry args={[0.25, 0.08, 16, 100]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Point light */}
      <pointLight position={[0, 0, 0]} intensity={2} distance={3} color={color} />

      {/* Label */}
      <Text position={[0, 0.5, 0]} fontSize={0.14} color={color} anchorX="center" fontWeight="bold">
        {type.toUpperCase()}
      </Text>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Animated Segment (Data Packet)
// ═══════════════════════════════════════════════════════════════

function AnimatedSegment({ segment }) {
  const { appIndex, startTime, color, port } = segment
  const meshRef = useRef(null)
  const [showPort, setShowPort] = useState(false)
  const [showRoute, setShowRoute] = useState(false)

  // Wire path definition (Client App → MUX)
  const getWirePoints = () => {
    const startPos = [CLIENT_X - 0.65, APP_POSITIONS_Y[appIndex], 0.25]
    const endPos = [MUX_JUNCTION_X, MUX_WIRE_Y_POSITIONS[appIndex], 0]
    const points = []
    const segments = 50

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = startPos[0] + (endPos[0] - startPos[0]) * t
      const y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 0.2
      const z = startPos[2] + (endPos[2] - startPos[2]) * t
      points.push([x, y, z])
    }
    return points
  }

  // Tunnel path (from MUX to DEMUX - STRAIGHT LINE along center)
  const getTunnelPath = () => {
    const tunnelStart = MUX_JUNCTION_X
    const tunnelEnd = DEMUX_JUNCTION_X
    
    // Generate smooth interpolation for perfectly straight line
    const points = []
    const segments = 50
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = tunnelStart + (tunnelEnd - tunnelStart) * t
      const y = 0 // CENTER OF TUNNEL - NO VERTICAL MOTION
      const z = 0 // CENTER OF TUNNEL - NO Z MOTION
      points.push([x, y, z])
    }
    
    return points
  }

  // Server path (from DEMUX to correct Server App based on port/appIndex)
  const getServerPath = () => {
    const startPos = [DEMUX_JUNCTION_X, DEMUX_WIRE_Y_POSITIONS[appIndex], 0]
    const endPos = [SERVER_X + 0.65, APP_POSITIONS_Y[appIndex], 0.25]
    const points = []
    const segments = 50

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = startPos[0] + (endPos[0] - startPos[0]) * t
      const y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 0.2
      const z = startPos[2] + (endPos[2] - startPos[2]) * t
      points.push([x, y, z])
    }
    return points
  }

  // Interpolate position along path
  const interpolatePosition = (points, t) => {
    t = Math.max(0, Math.min(1, t))
    const index = t * (points.length - 1)
    const currentIndex = Math.floor(index)
    const nextIndex = Math.min(currentIndex + 1, points.length - 1)
    const localT = index - currentIndex

    const p1 = points[currentIndex]
    const p2 = points[nextIndex]

    return [
      p1[0] + (p2[0] - p1[0]) * localT,
      p1[1] + (p2[1] - p1[1]) * localT,
      p1[2] + (p2[2] - p1[2]) * localT,
    ]
  }

  useFrame(({ clock }) => {
    if (!meshRef.current) return

    const elapsed = clock.getElapsedTime() - startTime
    if (elapsed < 0) return

    // Update port label visibility at MUX
    const showPortNow = elapsed >= WIRE_TRAVEL_TIME && elapsed < WIRE_TRAVEL_TIME + MUX_PAUSE_TIME
    if (showPortNow !== showPort) {
      setShowPort(showPortNow)
    }

    // Update route label visibility at DEMUX
    const tunnelEnd = WIRE_TRAVEL_TIME + MUX_PAUSE_TIME + TUNNEL_TRAVEL_TIME
    const showRouteNow = elapsed >= tunnelEnd && elapsed < tunnelEnd + DEMUX_PAUSE_TIME
    if (showRouteNow !== showRoute) {
      setShowRoute(showRouteNow)
    }

    // PHASE 1: Travel on wire to MUX (0 to WIRE_TRAVEL_TIME)
    if (elapsed < WIRE_TRAVEL_TIME) {
      const t = elapsed / WIRE_TRAVEL_TIME
      const wirePoints = getWirePoints()
      const pos = interpolatePosition(wirePoints, t)
      meshRef.current.position.set(...pos)
    }
    // PHASE 2: Pause at MUX (WIRE_TRAVEL_TIME to WIRE_TRAVEL_TIME + MUX_PAUSE_TIME)
    else if (elapsed < WIRE_TRAVEL_TIME + MUX_PAUSE_TIME) {
      meshRef.current.position.set(MUX_JUNCTION_X, MUX_WIRE_Y_POSITIONS[appIndex], 0)
    }
    // PHASE 3: Travel through tunnel (WIRE_TRAVEL_TIME + MUX_PAUSE_TIME to end of tunnel)
    else if (elapsed < WIRE_TRAVEL_TIME + MUX_PAUSE_TIME + TUNNEL_TRAVEL_TIME) {
      const tunnelPhaseElapsed = elapsed - (WIRE_TRAVEL_TIME + MUX_PAUSE_TIME)
      const t = tunnelPhaseElapsed / TUNNEL_TRAVEL_TIME
      const tunnelPath = getTunnelPath()
      const pos = interpolatePosition(tunnelPath, t)
      meshRef.current.position.set(...pos)
    }
    // PHASE 4: Pause at DEMUX (after tunnel to after demux pause)
    else if (elapsed < WIRE_TRAVEL_TIME + MUX_PAUSE_TIME + TUNNEL_TRAVEL_TIME + DEMUX_PAUSE_TIME) {
      meshRef.current.position.set(DEMUX_JUNCTION_X, DEMUX_WIRE_Y_POSITIONS[appIndex], 0)
    }
    // PHASE 5: Travel from DEMUX to correct Server App (final phase)
    else if (elapsed < SEGMENT_DURATION) {
      const serverPhaseElapsed = elapsed - (WIRE_TRAVEL_TIME + MUX_PAUSE_TIME + TUNNEL_TRAVEL_TIME + DEMUX_PAUSE_TIME)
      const t = serverPhaseElapsed / SERVER_TRAVEL_TIME
      const serverPath = getServerPath()
      const pos = interpolatePosition(serverPath, t)
      meshRef.current.position.set(...pos)
    } else {
      // Animation complete
      meshRef.current.visible = false
    }
  })

  return (
    <group>
      {/* Segment cube */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Segment glow aura */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Port label (appears at MUX for header stamping) */}
      {showPort && (
        <group position={[MUX_JUNCTION_X, MUX_WIRE_Y_POSITIONS[appIndex] + 0.35, 0]}>
          <mesh>
            <planeGeometry args={[0.65, 0.22]} />
            <meshBasicMaterial color="#000" transparent opacity={0.75} />
          </mesh>
          <Text fontSize={0.11} color={color} anchorX="center" anchorY="middle" fontWeight="bold" position={[0, 0, 0.01]}>
            {`Port: ${port}`}
          </Text>
        </group>
      )}

      {/* Route label (appears at DEMUX for demultiplexing decision) */}
      {showRoute && (
        <group position={[DEMUX_JUNCTION_X, DEMUX_WIRE_Y_POSITIONS[appIndex] + 0.35, 0]}>
          <mesh>
            <planeGeometry args={[0.65, 0.22]} />
            <meshBasicMaterial color="#000" transparent opacity={0.75} />
          </mesh>
          <Text fontSize={0.11} color={color} anchorX="center" anchorY="middle" fontWeight="bold" position={[0, 0, 0.01]}>
            {`→ App ${String.fromCharCode(65 + appIndex)}`}
          </Text>
        </group>
      )}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Tunnel (Transmission Channel)
// ═══════════════════════════════════════════════════════════════

function Tunnel() {
  // Calculate tunnel dimensions
  const tunnelStart = MUX_JUNCTION_X
  const tunnelEnd = DEMUX_JUNCTION_X
  const tunnelMiddle = (tunnelStart + tunnelEnd) / 2
  const tunnelLength = tunnelEnd - tunnelStart
  const tunnelRadius = 0.08 // Narrower width

  return (
    <group>
      {/* Main transmission cylinder - positioned between MUX and DEMUX */}
      <mesh position={[tunnelMiddle, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[tunnelRadius, tunnelRadius, tunnelLength, 16]} />
        <meshPhongMaterial
          color="#06b6d4"
          emissive="#0284c7"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
          wireframe={false}
        />
      </mesh>

      {/* Outer glow layer */}
      <mesh position={[tunnelMiddle, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[tunnelRadius + 0.05, tunnelRadius + 0.05, tunnelLength, 16]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.2} />
      </mesh>

      {/* Center guide line */}
      <Line
        points={[
          [tunnelStart, 0, 0],
          [tunnelEnd, 0, 0],
        ]}
        color="#fbbf24"
        lineWidth={2}
        dashed
        dashScale={0.6}
        transparent
        opacity={0.6}
      />

      {/* Label */}
      <Text position={[tunnelMiddle, 0.35, 0]} fontSize={0.16} color="#06b6d4" anchorX="center" fontWeight="bold">
        NETWORK TUNNEL
      </Text>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Node (Client or Server)
// ═══════════════════════════════════════════════════════════════

function Node({ position, label, isClient = true }) {
  return (
    <group position={position}>
      {/* Main node cube - Completely invisible */}
      <mesh>
        <boxGeometry args={[1.8, 2.8, 1.2]} />
        <meshPhongMaterial
          color={isClient ? '#06b6d4' : '#eab308'}
          emissive={isClient ? '#0891b2' : '#a16207'}
          emissiveIntensity={0.3}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Node outline */}
      <mesh>
        <boxGeometry args={[1.85, 2.85, 1.25]} />
        <meshBasicMaterial color={isClient ? '#06b6d4' : '#eab308'} wireframe transparent opacity={0} />
      </mesh>

      {/* Node label */}
      <Text position={[0, -1.3, 0.5]} fontSize={0.28} color={isClient ? '#06b6d4' : '#eab308'} anchorX="center" fontWeight="bold">
        {label}
      </Text>

      {/* Point light */}
      <pointLight position={[0, 0, 0.5]} intensity={1.5} distance={4} color={isClient ? '#06b6d4' : '#eab308'} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// INNER COMPONENT: Multiplexing & Demultiplexing 3D Scene
// ═══════════════════════════════════════════════════════════════

function MultiplexingDemultiplexingScene({ isRunning, onStatusUpdate, resetTrigger }) {
  const [segments, setSegments] = useState([])
  const [tunnelQueue, setTunnelQueue] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const clockRef = useRef(0)
  const hasSpawnedRef = useRef(false)
  const hasCompletedRef = useRef(false)

  // Animation loop
  useFrame(({ clock }) => {
    clockRef.current = clock.getElapsedTime()

    // COMBINED: Cleanup completed segments AND update tunnel queue in ONE state update
    setSegments((prev) => {
      // Filter out completed segments (with small buffer to ensure animation completes)
      const activeSegments = prev.filter((seg) => {
        const elapsed = clockRef.current - seg.startTime
        return elapsed < SEGMENT_DURATION + 0.2 // Small buffer for safety
      })

      // Check if animation has completed (all segments done and was playing)
      if (isPlaying && activeSegments.length === 0 && prev.length > 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true
        if (onStatusUpdate) {
          onStatusUpdate('✅ The process of Multiplexing and Demultiplexing completed successfully!')
        }
      }

      // Track segments currently in tunnel
      const inTunnel = activeSegments.filter((seg) => {
        const elapsed = clockRef.current - seg.startTime
        return elapsed > WIRE_TRAVEL_TIME + MUX_PAUSE_TIME && elapsed < SEGMENT_DURATION
      })

      const inTunnelIds = inTunnel.map((s) => s.id)
      if (JSON.stringify(inTunnelIds) !== JSON.stringify(tunnelQueue)) {
        setTunnelQueue(inTunnelIds)
      }

      return activeSegments // Return filtered active segments
    })
  })

  // Handle start from parent
  useEffect(() => {
    if (isRunning) {
      setTimeout(() => {
        setIsPlaying(true)
        if (onStatusUpdate) {
          onStatusUpdate('▶️ The Process of Multiplexing & Demultiplexing Started...')
        }
      }, 0)
    }
  }, [isRunning, onStatusUpdate])

  // Handle reset trigger from parent
  useEffect(() => {
    setTimeout(() => {
      setIsPlaying(false)
      setSegments([])
      setTunnelQueue([])
      hasSpawnedRef.current = false
      hasCompletedRef.current = false
      if (onStatusUpdate) {
        onStatusUpdate('Ready')
      }
    }, 0)
  }, [resetTrigger, onStatusUpdate])

  // Spawn segments when animation starts
  useEffect(() => {
    if (isPlaying && !hasSpawnedRef.current) {
      hasSpawnedRef.current = true
      const currentTime = clockRef.current

      // PHASE 1: First wave - 1 packet from each app simultaneously at t=0
      const firstWave = [0, 1, 2].map((appIndex) => ({
        id: `seg-${Date.now()}-first-${appIndex}`,
        appIndex: appIndex,
        startTime: currentTime,
        color: APP_COLORS[appIndex],
        port: APP_PORTS[appIndex],
        packetNumber: 1,
      }))

      // PHASE 2: Remaining packets - 4 from each app (12 total), shuffled randomly
      const remainingOrder = []
      for (let appIdx = 0; appIdx < 3; appIdx++) {
        for (let pktCount = 0; pktCount < 4; pktCount++) {
          remainingOrder.push(appIdx)
        }
      }

      // Shuffle remaining packets using Fisher-Yates
      for (let i = remainingOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingOrder[i], remainingOrder[j]] = [remainingOrder[j], remainingOrder[i]]
      }

      // Create remaining segments from shuffled order
      const remainingSegments = remainingOrder.map((appIndex, sequenceIndex) => ({
        id: `seg-${Date.now()}-remaining-${sequenceIndex}`,
        appIndex: appIndex,
        startTime: currentTime + (sequenceIndex + 1) * 1.0,
        color: APP_COLORS[appIndex],
        port: APP_PORTS[appIndex],
        packetNumber: 2 + sequenceIndex,
      }))

      // Combine first wave + remaining packets
      const newSegments = [...firstWave, ...remainingSegments]
      setSegments(newSegments)
    }
  }, [isPlaying])



  return (
    <group position={[0, 0.5, 0]}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 1: STATIC GEOMETRY & WIRE PATHS */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* Client Application Cubes (Red, Green, Blue) */}
      {APP_POSITIONS_Y.map((y, idx) => (
        <AppCube
          key={`client-app-${idx}`}
          position={[CLIENT_X - 0.65, y, 0.25]}
          color={APP_COLORS[idx]}
          label={APP_NAMES[idx].split('(')[0].trim()}
          labelSide="left"
        />
      ))}

      {/* Client Node Label */}
      <Text position={[CLIENT_X - 0.65, -1.5, 0.25]} fontSize={0.18} color="#06b6d4" anchorX="center" fontWeight="bold">
        CLIENT NODE
      </Text>

      {/* ─── CLIENT WIRES (App → MUX Junction) ─── */}
      {/* Wire 1: Red (App A) → MUX */}
      <WirePath
        startPos={[CLIENT_X - 0.65, APP_POSITIONS_Y[0], 0.25]}
        endPos={[MUX_JUNCTION_X, 0.3, 0]}
        color={APP_COLORS[0]}
      />

      {/* Wire 2: Green (App B) → MUX */}
      <WirePath
        startPos={[CLIENT_X - 0.65, APP_POSITIONS_Y[1], 0.25]}
        endPos={[MUX_JUNCTION_X, 0, 0]}
        color={APP_COLORS[1]}
      />

      {/* Wire 3: Blue (App C) → MUX */}
      <WirePath
        startPos={[CLIENT_X - 0.65, APP_POSITIONS_Y[2], 0.25]}
        endPos={[MUX_JUNCTION_X, -0.3, 0]}
        color={APP_COLORS[2]}
      />

      {/* ─── MUX JUNCTION ─── */}
      <JunctionPoint position={[MUX_JUNCTION_X, 0, 0]} type="mux" color="#fbbf24" />

      {/* ─── TRANSMISSION TUNNEL ─── */}
      <Tunnel />

      {/* ─── DEMUX JUNCTION ─── */}
      <JunctionPoint position={[DEMUX_JUNCTION_X, 0, 0]} type="demux" color="#f59e0b" />

      {/* ─── SERVER WIRES (DEMUX Junction → Server Apps) ─── */}
      {/* Wire 1: DEMUX → Red (App A) */}
      <WirePath
        startPos={[DEMUX_JUNCTION_X, 0.3, 0]}
        endPos={[SERVER_X + 0.65, APP_POSITIONS_Y[0], 0.25]}
        color={APP_COLORS[0]}
      />

      {/* Wire 2: DEMUX → Green (App B) */}
      <WirePath
        startPos={[DEMUX_JUNCTION_X, 0, 0]}
        endPos={[SERVER_X + 0.65, APP_POSITIONS_Y[1], 0.25]}
        color={APP_COLORS[1]}
      />

      {/* Wire 3: DEMUX → Blue (App C) */}
      <WirePath
        startPos={[DEMUX_JUNCTION_X, -0.3, 0]}
        endPos={[SERVER_X + 0.65, APP_POSITIONS_Y[2], 0.25]}
        color={APP_COLORS[2]}
      />

      {/* Server Application Cubes (Red, Green, Blue) */}
      {APP_POSITIONS_Y.map((y, idx) => (
        <AppCube
          key={`server-app-${idx}`}
          position={[SERVER_X + 0.65, y, 0.25]}
          color={APP_COLORS[idx]}
          label={APP_NAMES[idx].split('(')[0].trim()}
          labelSide="right"
        />
      ))}

      {/* Server Node Label */}
      <Text position={[SERVER_X + 0.65, -1.5, 0.25]} fontSize={0.18} color="#eab308" anchorX="center" fontWeight="bold">
        SERVER NODE
      </Text>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 2-3: ANIMATED SEGMENTS (Multiplexing + Demultiplexing) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {segments.map((segment) => (
        <AnimatedSegment key={segment.id} segment={segment} />
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════
// OUTER WRAPPER: Component with HTML Controls
// ═══════════════════════════════════════════════════════════════

export default function MultiplexingDemultiplexingViz({ isRunning, onStatusUpdate, resetTrigger }) {
  return <MultiplexingDemultiplexingScene isRunning={isRunning} onStatusUpdate={onStatusUpdate} resetTrigger={resetTrigger} />
}
