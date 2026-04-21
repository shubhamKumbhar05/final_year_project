import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

/**
 * Congestion Control Visualization - Phase 4: Congestion Avoidance
 * 
 * Phase 4 Mechanics:
 * 1. Triggered when: cwnd >= ssthresh (after Slow Start)
 * 2. Linear Growth: cwnd += 1 per RTT (instead of doubling)
 * 3. Visual: Cubes grow incrementally, not exponentially
 * 4. Graph: Plot linear growth curve
 * 5. Color: Cyan (careful, steady climbing)
 * 6. Duration: ~10 seconds showing gradual increase
 */

const CongestionControlViz = ({ isRunning = false, onMessage, resetTrigger = 0, onStateUpdate, congestionCtrlNetworkCongestionTrigger = 0 }) => {
  const groupRef = useRef()
  
  // ===== STATE MANAGEMENT (Non-rendering) =====
  // These persist across frames without causing React re-renders
  const stateEngineRef = useRef({
    cwnd: 1,              // Congestion Window - starts at 1
    ssthresh: 8,          // Slow Start Threshold (double until 8)
    maxCwnd: 25,          // Maximum congestion window limit
    protocolState: 'IDLE', // IDLE, SLOW_START, CONGESTION_AVOIDANCE, RECOVERY
    time: 0,
    rtt: 0.9,             // Round Trip Time simulation (slower for clarity)
    packetAckCount: 0,    // Track incoming ACKs
    lastCwndIncrementTime: 0, // Track when to increase cwnd
    animationActive: false, // Animation trigger
    hasTransitionedToCA: false, // Track Slow Start -> Congestion Avoidance transition
    maxCwndReachedTime: null, // Legacy field retained for reset compatibility
    lossDetected: false,  // Phase 5: Loss detection flag
    hasRecoveredFromLoss: false, // Track if we've already recovered from this loss
    recoveryFlashUntil: 0, // Keep RECOVERY state visible briefly after loss
    routerAlertUntil: 0, // Keep router in strong alert pulse after manual congestion
  })

  // ===== PACKET TRACKING =====
  const packetsRef = useRef([])  // Array of { id, x, z, age, createdAt, groupId, groupSize }
  const groupsRef = useRef([])   // Track packet groups for labeling { id, count, x, z, createdAt, age }
  const droppedPacketsRef = useRef([]) // Short-lived red burst for visual packet loss
  const graphDataRef = useRef([{ time: 0, cwnd: 1 }]) // Track all points for graphing
  const lastSpawnTimeRef = useRef(0) // Prevent multiple spawns per RTT
  const routerPulseRef = useRef(0) // For router visual pulse effect (Phase 5)

  // ===== DISPLAY STATE (Rendering) =====
  // Only update for UI display, not animation calculations
  const [displayValues, setDisplayValues] = useState({
    cwnd: 1,
    ssthresh: 8,
    maxCwnd: 25,
    protocolState: 'IDLE',
    stateColor: '#9ca3af',      // Gray for IDLE
    stateDescription: 'Standby',
  })

  const [packets, setPackets] = useState([])
  const [packetGroups, setPacketGroups] = useState([])
  const [droppedPackets, setDroppedPackets] = useState([])
  const [routerPulse, setRouterPulse] = useState(0) // Phase 5: Router pulse effect (0-1)

  const COLORS = {
    client: '#a855f7',
    server: '#06b6d4',
    highway: '#f59e0b',
    router: '#fbbf24',
    graphBg: '#1f2937',
    graphAxis: '#9ca3af',
    graphLine: '#3b82f6',
    // State-based colors
    idle: '#9ca3af',              // Gray
    slowStart: '#10b981',          // Green
    congestionAvoidance: '#06b6d4', // Cyan
    recovery: '#ef4444',           // Red (loss detected + recovery)
  }

  const STATE_COLORS = {
    IDLE: COLORS.idle,
    SLOW_START: COLORS.slowStart,
    CONGESTION_AVOIDANCE: COLORS.congestionAvoidance,
    RECOVERY: COLORS.recovery,
  }

  const STATE_DESCRIPTIONS = {
    IDLE: 'Standby - Ready for phase transitions',
    SLOW_START: 'Testing capacity - Exponential growth (cwnd *= 2)',
    CONGESTION_AVOIDANCE: 'Safe climbing - Linear growth (cwnd += 1)',
    RECOVERY: 'Recovering from loss - Controlled increment',
  }

  const POSITIONS = {
    clientX: -5,
    serverX: 5,
    routerX: 0,
    nodeY: 2,
  }

  const SIZES = {
    nodeRadius: 0.6,
    nodeCubeSize: 1.05,
    highwayRadius: 0.2,
    highwayLength: 10,
    routerSize: 0.5,
  }

  const triggerPacketLoss = useCallback((engine, reason = 'AUTO') => {
    if (!engine.animationActive) return

    const prevCwnd = Math.max(1, Math.floor(engine.cwnd))
    const newSsthresh = Math.max(2, Math.floor(prevCwnd / 2))

    const inFlightPackets = packetsRef.current.slice(0, 24)
    const seededDrops = inFlightPackets.length > 0
      ? inFlightPackets.map((packet, idx) => {
          const angle = (idx / Math.max(1, inFlightPackets.length)) * Math.PI * 2
          return {
            id: `drop-${Math.random()}`,
            x: packet.x,
            z: packet.z,
            vx: Math.cos(angle) * 0.55,
            vy: 0.55 + (idx % 3) * 0.14,
            vz: Math.sin(angle) * 0.55,
            createdAt: engine.time,
            age: 0,
            ttl: 1.6,
          }
        })
      : Array.from({ length: 18 }, (_, idx) => {
          const angle = (idx / 18) * Math.PI * 2
          return {
            id: `drop-${Math.random()}`,
            x: 0,
            z: Math.sin(angle) * 0.45,
            vx: Math.cos(angle) * 0.8,
            vy: 0.7 + (idx % 4) * 0.14,
            vz: Math.sin(angle) * 0.8,
            createdAt: engine.time,
            age: 0,
            ttl: 1.6,
          }
        })

    droppedPacketsRef.current = seededDrops
    setDroppedPackets([...droppedPacketsRef.current])

    engine.ssthresh = newSsthresh
    engine.cwnd = newSsthresh
    engine.lastCwndIncrementTime = 0
    engine.hasTransitionedToCA = false
    engine.maxCwndReachedTime = null
    engine.lossDetected = false
    engine.hasRecoveredFromLoss = false
    engine.protocolState = 'CONGESTION_AVOIDANCE'
    engine.recoveryFlashUntil = engine.time + 2.2
    engine.routerAlertUntil = engine.time + 2.6

    routerPulseRef.current = 2.1
    setRouterPulse(1)

    // Flush in-flight packets to make the loss event visually obvious.
    packetsRef.current = []
    groupsRef.current = []

    graphDataRef.current.push({
      time: engine.time,
      cwnd: engine.cwnd,
    })

    if (onMessage) {
      onMessage(`🔴 NETWORK CONGESTION (${reason}): Packet loss at cwnd=${prevCwnd}`)
      setTimeout(() => {
        onMessage(`📉 MULTIPLICATIVE DECREASE: ssthresh=${newSsthresh}, cwnd=${newSsthresh}`)
      }, 220)
      setTimeout(() => {
        onMessage(`♻️ RECOVERY: Entering Congestion Avoidance from threshold (linear +1 per RTT)`)
      }, 520)
    }
  }, [onMessage])

  // Initialize on mount
  useEffect(() => {
    if (onMessage) {
      onMessage('🔧 Phase 3-5: Animation Ready - Click START to begin')
    }
  }, [onMessage])

  // Handle isRunning prop changes
  useEffect(() => {
    stateEngineRef.current.animationActive = isRunning
    if (isRunning) {
      if (onMessage) {
        onMessage('▶️ ANIMATION STARTED - Slow Start (1→2→4→8) → Congestion Avoidance (8→25) → Loss Detection & Recovery')
      }
    }
  }, [isRunning, onMessage])

  // Handle reset trigger
  useEffect(() => {
    const resetAll = () => {
      stateEngineRef.current.cwnd = 1
      stateEngineRef.current.ssthresh = 8
      stateEngineRef.current.maxCwnd = 25
      stateEngineRef.current.protocolState = 'IDLE'
      stateEngineRef.current.time = 0
      stateEngineRef.current.rtt = 0.9
      stateEngineRef.current.packetAckCount = 0
      stateEngineRef.current.lastCwndIncrementTime = 0
      stateEngineRef.current.animationActive = false
      stateEngineRef.current.hasTransitionedToCA = false
      stateEngineRef.current.maxCwndReachedTime = null
      stateEngineRef.current.lossDetected = false
      stateEngineRef.current.hasRecoveredFromLoss = false
      stateEngineRef.current.recoveryFlashUntil = 0
      stateEngineRef.current.routerAlertUntil = 0
      packetsRef.current = []
      groupsRef.current = []
      droppedPacketsRef.current = []
      graphDataRef.current = [{ time: 0, cwnd: 1 }]
      lastSpawnTimeRef.current = 0
      routerPulseRef.current = 0

      setDisplayValues({
        cwnd: 1,
        ssthresh: 8,
        maxCwnd: 25,
        protocolState: 'IDLE',
        stateColor: '#9ca3af',
        stateDescription: 'Standby - Ready for phase transitions',
      })
      setPackets([])
      setPacketGroups([])
      setDroppedPackets([])
      setRouterPulse(0)

      if (onMessage) {
        onMessage('✅ Visualization reset to default state')
        setTimeout(() => {
          onMessage('')
        }, 2000)
      }
    }
    
    queueMicrotask(resetAll)
  }, [resetTrigger, onMessage])

  // Handle network congestion trigger - force packet loss
  useEffect(() => {
    if (congestionCtrlNetworkCongestionTrigger <= 0) return
    
    const engine = stateEngineRef.current

    // Force network congestion by triggering packet loss immediately.
    triggerPacketLoss(engine, 'MANUAL')
  }, [congestionCtrlNetworkCongestionTrigger, triggerPacketLoss])

  // Notify parent of state updates
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate(displayValues)
    }
  }, [displayValues, onStateUpdate])

  // Animation loop - update state engine
  useFrame((state, delta) => {
    const engine = stateEngineRef.current

    if (!engine.animationActive) {
      // Display idle state
      setDisplayValues({
        cwnd: engine.cwnd,
        ssthresh: engine.ssthresh,
        maxCwnd: engine.maxCwnd,
        protocolState: 'IDLE',
        stateColor: STATE_COLORS.IDLE,
        stateDescription: STATE_DESCRIPTIONS.IDLE,
      })
      return
    }

    // ===== PHASE 3 & 4: SLOW START → CONGESTION AVOIDANCE =====
    engine.time += delta
    engine.lastCwndIncrementTime += delta

    // Packet loss is triggered only by the manual "Congest Network" control.

    // Determine current protocol state
    if (engine.cwnd < engine.ssthresh) {
      // SLOW START: Exponential growth
      engine.protocolState = 'SLOW_START'
      
      if (engine.lastCwndIncrementTime >= engine.rtt) {
        engine.cwnd *= 2
        engine.lastCwndIncrementTime = 0
        engine.hasTransitionedToCA = false
        
        graphDataRef.current.push({ 
          time: engine.time, 
          cwnd: engine.cwnd 
        })

        if (onMessage) {
          onMessage(`📈 SLOW START: cwnd doubled to ${engine.cwnd} (at RTT ${(engine.time / engine.rtt).toFixed(1)})`)
        }
      }
    } else {
      // CONGESTION AVOIDANCE: Linear growth
      if (!engine.hasTransitionedToCA) {
        engine.hasTransitionedToCA = true
        if (onMessage) {
          onMessage(`🟦 THRESHOLD REACHED: Switching to Congestion Avoidance (Linear Growth - cwnd += 1 per RTT)`)
        }
      }
      
      engine.protocolState = 'CONGESTION_AVOIDANCE'
      
      if (engine.lastCwndIncrementTime >= engine.rtt) {
        if (engine.cwnd < engine.maxCwnd) {
          engine.cwnd += 1  // Add 1 instead of doubling
          engine.lastCwndIncrementTime = 0
          
          graphDataRef.current.push({ 
            time: engine.time, 
            cwnd: engine.cwnd 
          })

          if (onMessage) {
            onMessage(`📊 CONGESTION AVOIDANCE: cwnd incremented to ${engine.cwnd} (Careful climb at RTT ${(engine.time / engine.rtt).toFixed(1)})`)
          }
        } else {
          engine.lastCwndIncrementTime = 0
          if (onMessage) {
            onMessage(`✅ MAX CWND REACHED: ${engine.cwnd} packets (click 🔴 Congest Network to trigger packet loss)`)
          }
        }
      }
    }

    // Spawn packets representing current cwnd
    if (Math.floor(engine.time / (engine.rtt / 4)) % 4 === 0 && packetsRef.current.length < engine.cwnd && engine.time - lastSpawnTimeRef.current > engine.rtt - 0.1) {
      const groupId = Math.random()
      const groupSize = engine.cwnd
      lastSpawnTimeRef.current = engine.time
      
      for (let i = packetsRef.current.length; i < engine.cwnd; i++) {
        packetsRef.current.push({
          id: Math.random(),
          x: -4,
          z: (i - engine.cwnd / 2) * 0.3,
          age: 0,
          createdAt: engine.time,
          groupId: groupId,
          groupSize: groupSize,
        })
      }
      
      // Track this group for labeling
      groupsRef.current.push({
        id: groupId,
        count: groupSize,
        x: -4,
        z: 0,
        createdAt: engine.time,
        age: 0,
      })
    }

    // Update packet positions (animate across the network)
    packetsRef.current = packetsRef.current.filter((packet) => {
      packet.age = engine.time - packet.createdAt
      if (packet.age > engine.rtt * 2) return false
      
      if (packet.age < engine.rtt) {
        // Going from client to server (DATA PACKET)
        packet.x = -4 + (packet.age / engine.rtt) * 8
        packet.isACK = false
      } else {
        // Coming back (ACK PACKET)
        packet.x = 4 - ((packet.age - engine.rtt) / engine.rtt) * 8
        packet.isACK = true
      }
      return true
    })

    // Update group label positions and cleanup
    groupsRef.current = groupsRef.current.map((group) => {
      group.age = engine.time - group.createdAt
      
      if (group.age < engine.rtt) {
        // Moving forward with packets
        group.x = -4 + (group.age / engine.rtt) * 8
      } else if (group.age < engine.rtt * 2) {
        // Coming back with ACKs
        group.x = 4 - ((group.age - engine.rtt) / engine.rtt) * 8
      }
      
      return group
    }).filter((group) => group.age < engine.rtt * 2)

    droppedPacketsRef.current = droppedPacketsRef.current
      .map((packet) => ({
        ...packet,
        age: engine.time - packet.createdAt,
        x: packet.x + packet.vx * delta,
        z: packet.z + packet.vz * delta,
      }))
      .filter((packet) => packet.age < packet.ttl)

    // Update router pulse effect for Phase 5
    if (routerPulseRef.current > 0) {
      if (engine.time < engine.routerAlertUntil) {
        routerPulseRef.current = Math.max(routerPulseRef.current, 1.3)
      } else {
        routerPulseRef.current -= delta * 0.65
      }
      const pulseWave = 0.62 + 0.38 * Math.sin(engine.time * 9)
      setRouterPulse(Math.max(0, routerPulseRef.current) * pulseWave)
    }

    // Update protocol state when hitting threshold
    let newState = 'SLOW_START'
    let stateColor = STATE_COLORS.SLOW_START
    let stateDesc = STATE_DESCRIPTIONS.SLOW_START
    
    if (engine.time < engine.recoveryFlashUntil) {
      newState = 'RECOVERY'
      stateColor = STATE_COLORS.RECOVERY
      stateDesc = 'Loss handled - cwnd dropped and Slow Start restarted'
    } else if (engine.cwnd >= engine.ssthresh) {
      newState = 'CONGESTION_AVOIDANCE'
      stateColor = STATE_COLORS.CONGESTION_AVOIDANCE
      stateDesc = STATE_DESCRIPTIONS.CONGESTION_AVOIDANCE
    }

    // Update display values
    setDisplayValues({
      cwnd: engine.cwnd,
      ssthresh: engine.ssthresh,
      maxCwnd: engine.maxCwnd,
      protocolState: newState,
      stateColor: stateColor,
      stateDescription: stateDesc,
    })

    // Update packets for rendering
    setPackets([...packetsRef.current])
    setPacketGroups([...groupsRef.current])
    setDroppedPackets([...droppedPacketsRef.current])

    // Subtle scene rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.00015
    }
  })

  return (
    <group ref={groupRef}>
      {/* ===== CLIENT NODE (SENDER) ===== */}
      <mesh position={[POSITIONS.clientX, POSITIONS.nodeY, 0]}>
        <boxGeometry args={[SIZES.nodeCubeSize, SIZES.nodeCubeSize, SIZES.nodeCubeSize]} />
        <meshStandardMaterial
          color={COLORS.client}
          emissive={COLORS.client}
          emissiveIntensity={0.7}
          metalness={0.25}
          roughness={0.35}
        />
      </mesh>
      <Text position={[POSITIONS.clientX, POSITIONS.nodeY + 1.2, 0]} fontSize={0.3} color={COLORS.client}>
        CLIENT
      </Text>
      <Text position={[POSITIONS.clientX, POSITIONS.nodeY + 0.8, 0]} fontSize={0.2} color="#a0aec0">
        (Sender)
      </Text>

      {/* ===== SERVER NODE (RECEIVER) ===== */}
      <mesh position={[POSITIONS.serverX, POSITIONS.nodeY, 0]}>
        <boxGeometry args={[SIZES.nodeCubeSize, SIZES.nodeCubeSize, SIZES.nodeCubeSize]} />
        <meshStandardMaterial
          color={COLORS.server}
          emissive={COLORS.server}
          emissiveIntensity={0.7}
          metalness={0.25}
          roughness={0.35}
        />
      </mesh>
      <Text position={[POSITIONS.serverX, POSITIONS.nodeY + 1.2, 0]} fontSize={0.3} color={COLORS.server}>
        SERVER
      </Text>
      <Text position={[POSITIONS.serverX, POSITIONS.nodeY + 0.8, 0]} fontSize={0.2} color="#a0aec0">
        (Receiver)
      </Text>

      {/* ===== NETWORK HIGHWAY ===== */}
      <mesh position={[0, POSITIONS.nodeY, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[SIZES.highwayRadius, SIZES.highwayRadius, SIZES.highwayLength, 16]} />
        <meshStandardMaterial
          color={COLORS.highway}
          emissive={COLORS.highway}
          emissiveIntensity={0.4}
          transparent
          opacity={0.7}
        />
      </mesh>
      <Text position={[0, POSITIONS.nodeY - 0.8, 0]} fontSize={0.25} color={COLORS.highway}>
        Network Highway
      </Text>

      {/* ===== ROUTER NODE (CENTER DIAMOND) ===== */}
      <mesh position={[POSITIONS.routerX, POSITIONS.nodeY, 0]} rotation={[0.785, 1.57, 0]}>
        <octahedronGeometry args={[SIZES.routerSize, 2]} />
        <meshStandardMaterial
          color={routerPulse > 0 ? `#ef4444` : COLORS.router}
          emissive={routerPulse > 0 ? `#ef4444` : COLORS.router}
          emissiveIntensity={0.6 + routerPulse * 0.4}
        />
      </mesh>
      <Text position={[POSITIONS.routerX, POSITIONS.nodeY + 1.0, 0]} fontSize={0.22} color={routerPulse > 0 ? '#ef4444' : COLORS.router}>
        {routerPulse > 0 ? '⚠️ Router' : 'Router'}
      </Text>

      {/* ===== ANIMATED PACKETS (Data & ACK) ===== */}
      {packets.map((packet) => (
        <mesh key={packet.id} position={[packet.x, POSITIONS.nodeY + 0.2, packet.z]}>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial
            color={packet.isACK ? '#10b981' : '#3b82f6'}
            emissive={packet.isACK ? '#10b981' : '#3b82f6'}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}

      {/* ===== PACKET LOSS BURST ===== */}
      {droppedPackets.map((packet) => (
        <mesh
          key={packet.id}
          position={[packet.x, POSITIONS.nodeY + 0.24 + packet.age * packet.vy, packet.z]}
          rotation={[packet.age * 6, packet.age * 4, 0]}
        >
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={1.1}
            transparent
            opacity={Math.max(0, 1 - packet.age / packet.ttl)}
          />
        </mesh>
      ))}

      {/* ===== PACKET GROUP LABELS ===== */}
      {packetGroups.map((group) => (
        <Text
          key={`group-label-${group.id}`}
          position={[group.x, POSITIONS.nodeY + 0.9, 0]}
          fontSize={0.35}
          color="#fbbf24"
          anchorX="center"
          anchorY="middle"
        >
          {group.count}
        </Text>
      ))}
    </group>
  )
}

export default CongestionControlViz




