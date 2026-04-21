import React, { useRef, useState, useEffect } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

/**
 * IP Fragmentation Stage - Phase 1 & 2: MTU Bottleneck & Fragmentation
 * 
 * Visualizes:
 * - Source Router on the left
 * - Destination Router on the right
 * - A narrow MTU Tunnel (500 bytes) in the middle
 * - A large Datagram (1500 bytes) at Source Router
 * - Phase 2: When DF=OFF, shows fragmentation into 3 pieces traveling through tunnel
 */

const SCENE_WIDTH = 15
const ROUTER_SIZE = 1.0
const MTU_TUNNEL_WIDTH = 1.2
const MTU_TUNNEL_HEIGHT = 1.5
const MTU_TUNNEL_DEPTH = 6.0
const DATAGRAM_SIZE = 2.0
const DATAGRAM_DEPTH = 0.8
const FRAGMENT_SIZE = 0.8
const FRAGMENT_DEPTH = 0.3

/**
 * Reassembly Buffer Component
 * Shows fragments in arrive queue (unsorted) with animation showing reordering
 */
function ReassemblyBuffer({ position, fragments, phase }) {
  return (
    <group position={position}>
      {/* Buffer label */}
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.25}
        color="#60a5fa"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        {phase === 'arriving' ? 'Arrival Queue' : phase === 'reordering' ? 'Reordering...' : 'Reassembly Complete'}
      </Text>

      {/* Fragment positions in buffer based on phase */}
      {fragments.map((frag, idx) => {
        let bufferY, bufferZ
        
        if (phase === 'arriving') {
          // Display in arrival order
          bufferY = 0.8 - idx * 0.6
          bufferZ = -0.3 + idx * 0.3
        } else {
          // Display in correct offset order after reordering
          bufferY = 0.8 - frag.offsetIndex * 0.6
          bufferZ = -0.3 + frag.offsetIndex * 0.3
        }

        return (
          <group key={frag.id} position={[0, bufferY, bufferZ]}>
            {/* Fragment in buffer */}
            <mesh>
              <boxGeometry args={[FRAGMENT_SIZE * 0.8, FRAGMENT_SIZE * 0.7, FRAGMENT_DEPTH]} />
              <meshStandardMaterial
                color={phase === 'complete' ? '#10b981' : '#fbbf24'}
                emissive={phase === 'complete' ? '#10b981' : '#fbbf24'}
                emissiveIntensity={0.4}
                metalness={0.5}
                roughness={0.3}
              />
            </mesh>

            {/* Label */}
            <Text
              position={[0, 0, FRAGMENT_DEPTH / 2 + 0.1]}
              fontSize={0.16}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              pointerEvents="none"
            >
              {frag.label}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

/**
 * Fragment Header Component
 * Shows IP fragment header info: ID, MF flag, Offset
 */
function FragmentHeader({ position, id, mf, offset }) {
  return (
    <group position={position}>
      {/* Header background box - larger for better spacing */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[2.4, 0.7, 0.1]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#0f172a"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.6}
          transparent={true}
          opacity={0.8}
        />
      </mesh>

      {/* ID Label */}
      <Text
        position={[-0.65, 0.08, 0.15]}
        fontSize={0.18}
        color="#60a5fa"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        ID: {id}
      </Text>

      {/* MF Flag Label */}
      <Text
        position={[0.15, 0.08, 0.15]}
        fontSize={0.18}
        color={mf === 1 ? '#fbbf24' : '#10b981'}
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        MF: {mf}
      </Text>

      {/* Offset Label */}
      <Text
        position={[0.95, 0.08, 0.15]}
        fontSize={0.18}
        color="#a78bfa"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        Off: {offset}
      </Text>
    </group>
  )
}

/**
 * Fragment Component
 * Smaller cube representing a fragmented piece of the datagram
 */
function Fragment({ position, label, color, isVisible = true, fragmentId, mf, offset }) {
  const meshRef = useRef()

  useFrame(({ clock }) => {
    if (meshRef.current && isVisible) {
      meshRef.current.position.y += Math.sin(clock.elapsedTime * 2) * 0.005
    }
  })

  if (!isVisible) return null

  return (
    <group position={position}>
      {/* Fragment Header */}
      <FragmentHeader
        position={[0, FRAGMENT_SIZE / 2 + 0.5, 0]}
        id={fragmentId}
        mf={mf}
        offset={offset}
      />

      {/* Fragment Cube */}
      <mesh ref={meshRef}>
        <boxGeometry args={[FRAGMENT_SIZE, FRAGMENT_SIZE, FRAGMENT_DEPTH]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Fragment label */}
      <Text
        position={[0, FRAGMENT_SIZE / 2 + 0.15, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * Traveling Fragment Component
 * Animates one fragment from source to destination with an arc through the MTU tunnel.
 */
function TravelingFragment({ startPos, endPos, delay = 0, label, color, fragmentId, mf, offset }) {
  const groupRef = useRef()
  const startTimeRef = useRef(null)
  const TRAVEL_DURATION = 2.5 // seconds

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    if (startTimeRef.current === null) {
      startTimeRef.current = clock.getElapsedTime()
    }

    const elapsed = clock.getElapsedTime() - startTimeRef.current

    if (elapsed < delay) {
      // Keep fragment parked at source until its own staggered send time.
      groupRef.current.position.set(startPos[0], startPos[1], startPos[2])
      return
    }

    const animationElapsed = elapsed - delay
    if (animationElapsed >= TRAVEL_DURATION) {
      groupRef.current.position.set(endPos[0], endPos[1], endPos[2])
      return
    }

    const t = animationElapsed / TRAVEL_DURATION
    const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    const arcDip = Math.sin(easeT * Math.PI) * 2.0

    const x = startPos[0] + (endPos[0] - startPos[0]) * easeT
    const y = startPos[1] + (endPos[1] - startPos[1]) * easeT - arcDip
    const z = startPos[2] + (endPos[2] - startPos[2]) * easeT

    groupRef.current.position.set(x, y, z)
  })

  return (
    <group ref={groupRef} position={startPos}>
      <FragmentHeader
        position={[0, FRAGMENT_SIZE / 2 + 0.5, 0]}
        id={fragmentId}
        mf={mf}
        offset={offset}
      />

      <mesh>
        <boxGeometry args={[FRAGMENT_SIZE, FRAGMENT_SIZE, FRAGMENT_DEPTH]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>

      <Text
        position={[0, FRAGMENT_SIZE / 2 + 0.15, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * PHASE 5 FRAGMENT - IN-ORDER REASSEMBLY
 * 
 * Single persistent component that handles ONE fragment through all animation phases.
 * Phases:
 *   0 (0-800ms): Static at source
 *   1 (800-2200ms): Traveling through tunnel with staggered start
 *   2 (2200-3700ms): Static at destination buffer
 *   3 (3700-5500ms): Snapping to center position
 *   4+ (5500ms+): Hidden
 */
function Phase5Fragment({
  fragIndex,              // 0, 1, or 2
  reassemblyPhase5,       // Current phase
  snapProgress,           // 0 to 1 for phase 3
  isVisible,              // Master visibility
  label,
  color,
  fragmentId,
  mf,
  offset
}) {
  const groupRef = useRef()
  const phase1StartTimeRef = useRef(null)

  // Position definitions for each fragment
  const SOURCE_POS = [-(SCENE_WIDTH / 2 - 2), 3.0, [-0.4, 0, 0.4][fragIndex]]
  const BUFFER_POS = [SCENE_WIDTH / 2 - 2, [1.0, 0.5, 0.0][fragIndex], [-0.4, 0, 0.4][fragIndex]]
  const SNAP_END_POS = [SCENE_WIDTH / 2 - 2, 2.5, [-0.2, 0, 0.2][fragIndex]]

  // Staggered travel delays: Fragment 0 starts at 0ms, Fragment 1 at 200ms, Fragment 2 at 400ms
  const TRAVEL_DELAY = [0.0, 0.2, 0.4][fragIndex]
  const TRAVEL_DURATION = 1.4 // 1400ms total travel time per fragment

  useFrame(({ clock }) => {
    if (!groupRef.current || !isVisible) return

    const elapsedTime = clock.getElapsedTime()

    switch (reassemblyPhase5) {
      case 0: {
        // Phase 0: Static at source
        groupRef.current.position.set(...SOURCE_POS)
        break
      }

      case 1: {
        // Phase 1: Travel through tunnel with staggered delays
        if (phase1StartTimeRef.current === null) {
          phase1StartTimeRef.current = elapsedTime
        }

        const elapsedSincePhase1 = elapsedTime - phase1StartTimeRef.current
        const delayInSeconds = TRAVEL_DELAY

        if (elapsedSincePhase1 < delayInSeconds) {
          // Waiting for delay - keep parked at source until this fragment starts moving
          groupRef.current.position.set(...SOURCE_POS)
        } else {
          // Animation active
          const animElapsed = elapsedSincePhase1 - delayInSeconds
          
          if (animElapsed < TRAVEL_DURATION) {
            // Animate with arc dip through tunnel
            const t = animElapsed / TRAVEL_DURATION
            const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
            const arcDip = Math.sin(easeT * Math.PI) * 2.0

            const x = SOURCE_POS[0] + (BUFFER_POS[0] - SOURCE_POS[0]) * easeT
            const y = SOURCE_POS[1] + (BUFFER_POS[1] - SOURCE_POS[1]) * easeT - arcDip
            const z = SOURCE_POS[2] + (BUFFER_POS[2] - SOURCE_POS[2]) * easeT

            groupRef.current.position.set(x, y, z)
          } else {
            // Travel complete
            groupRef.current.position.set(...BUFFER_POS)
          }
        }
        break
      }

      case 2: {
        // Phase 2: Static in buffer at destination
        groupRef.current.position.set(...BUFFER_POS)
        phase1StartTimeRef.current = null // Reset for next animation cycle
        break
      }

      case 3: {
        // Phase 3: Snap animation - interpolate from buffer to center
        const x = BUFFER_POS[0] + (SNAP_END_POS[0] - BUFFER_POS[0]) * snapProgress
        const y = BUFFER_POS[1] + (SNAP_END_POS[1] - BUFFER_POS[1]) * snapProgress
        const z = BUFFER_POS[2] + (SNAP_END_POS[2] - BUFFER_POS[2]) * snapProgress
        groupRef.current.position.set(x, y, z)
        break
      }

      case 4:
      default: {
        // Phase 4+: Hidden
        groupRef.current.position.set(SCENE_WIDTH * 10, 0, 0)
        break
      }
    }
  })

  if (!isVisible) {
    return null
  }

  return (
    <group ref={groupRef} position={SOURCE_POS}>
      <FragmentHeader
        position={[0, FRAGMENT_SIZE / 2 + 0.5, 0]}
        id={fragmentId}
        mf={mf}
        offset={offset}
      />
      <mesh>
        <boxGeometry args={[FRAGMENT_SIZE, FRAGMENT_SIZE, FRAGMENT_DEPTH]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
      <Text
        position={[0, FRAGMENT_SIZE / 2 + 0.15, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * ICMP Error Message (Phase 4)
 * Displays an ICMP "Destination Unreachable" error message
 */
function ICMPErrorMessage({ position, visible = true }) {
  if (!visible) return null
  
  return (
    <group position={position}>
      {/* Error message box */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[3, 1.5, 0.2]} />
        <meshStandardMaterial
          color="#ff6b6b"
          emissive="#ff0000"
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Error text */}
      <Text
        position={[0, 0.3, 0.15]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
        maxWidth={2.8}
      >
        ICMP ERROR
      </Text>

      {/* Error details */}
      <Text
        position={[0, -0.2, 0.15]}
        fontSize={0.18}
        color="#ffcccc"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
        maxWidth={2.8}
      >
        Fragmentation Needed
      </Text>

      {/* MTU info */}
      <Text
        position={[0, -0.6, 0.15]}
        fontSize={0.16}
        color="#ffdddd"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
        maxWidth={2.8}
      >
        Required MTU: 500 bytes
      </Text>
    </group>
  )
}

function Router({ position, label, color }) {
  return (
    <group position={position}>
      {/* Router body */}
      <mesh>
        <boxGeometry args={[ROUTER_SIZE, ROUTER_SIZE, ROUTER_SIZE]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Router label - positioned above, facing camera */}
      <Text
        position={[0, ROUTER_SIZE / 2 + 0.7, 0]}
        fontSize={0.35}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
        maxWidth={ROUTER_SIZE * 1.2}
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * MTU Tunnel Component
 * Horizontal cylindrical pipe representing the bandwidth constraint
 * Oriented along X-axis from Source to Destination
 */
function MTUTunnel() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main tunnel body - cylinder oriented horizontally along X-axis */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.6, MTU_TUNNEL_DEPTH, 32]} />
        <meshStandardMaterial
          color="#0f5a8a"
          emissive="#0f5a8a"
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.5}
          transparent={true}
          opacity={0.6}
        />
      </mesh>

      {/* Tunnel outline - wireframe for clarity */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.65, 0.65, MTU_TUNNEL_DEPTH, 32]} />
        <meshStandardMaterial
          color="#00ddff"
          emissive="#00ddff"
          emissiveIntensity={0.8}
          wireframe={true}
          transparent={true}
          opacity={0.7}
          linewidth={2}
        />
      </mesh>

      {/* Inner glow effect */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.58, 0.58, MTU_TUNNEL_DEPTH - 0.2, 16]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.3}
          transparent={true}
          opacity={0.2}
        />
      </mesh>

      {/* Tunnel label: MTU value - positioned above the tunnel */}
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.35}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
      >
        MTU: 500 Bytes
      </Text>

      {/* Warning marker on left entrance */}
      <mesh position={[-(MTU_TUNNEL_DEPTH / 2 + 0.3), 0, 0]}>
        <boxGeometry args={[0.3, 1.5, 0.3]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff0000" emissiveIntensity={0.4} />
      </mesh>

      {/* Warning marker on right exit */}
      <mesh position={[MTU_TUNNEL_DEPTH / 2 + 0.3, 0, 0]}>
        <boxGeometry args={[0.3, 1.5, 0.3]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff0000" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

/**
 * IP Datagram Component
 * Large gold cube representing the oversized packet
 */
function IPDatagramBox({ position, rotation, scale = 1.0, isRejected = false }) {
  const meshRef = useRef()

  // Subtle bounce animation
  useFrame(({ clock }) => {
    if (meshRef.current && !isRejected) {
      meshRef.current.position.y += Math.sin(clock.elapsedTime * 2) * 0.01
    }
  })

  return (
    <group position={position}>
      {/* Datagram body */}
      <mesh ref={meshRef} rotation={rotation}>
        <boxGeometry args={[DATAGRAM_SIZE * scale, DATAGRAM_SIZE * scale, DATAGRAM_DEPTH * scale]} />
        <meshStandardMaterial
          color={isRejected ? '#dc2626' : '#fbbf24'}
          emissive={isRejected ? '#991b1b' : '#f59e0b'}
          emissiveIntensity={isRejected ? 0.6 : 0.4}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Datagram label: Title - positioned above cube */}
      <Text
        position={[0, DATAGRAM_SIZE * scale / 2 + 0.6, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
        maxWidth={DATAGRAM_SIZE * scale + 0.5}
        overflowWrap="break-word"
      >
        {isRejected ? 'TOO LARGE!' : 'IP Datagram'}
      </Text>

      {/* Datagram label: Size - positioned above title with spacing */}
      <Text
        position={[0, DATAGRAM_SIZE * scale / 2 + 0.25, 0]}
        fontSize={0.22}
        color="#ffebcd"
        anchorX="center"
        anchorY="middle"
        pointerEvents="none"
        maxWidth={DATAGRAM_SIZE * scale + 0.5}
      >
        {isRejected ? 'Dropped' : 'size 1500 bytes'}
      </Text>
    </group>
  )
}

/**
 * IPFragmentationStage Component
 * Phase 1: MTU Bottleneck - packet rejection
 * Phase 2: Fragmentation - packet breaks apart and travels through tunnel
 * Phase 3: Out-of-Order Reassembly - fragments arrive scrambled and reorder at destination
 */
export default function IPFragmentationStage({ isAttempting = false, isDFEnabled = false, isOutOfOrder = false, showICMPError = false }) {
  const sceneRef = useRef()
  const [hasRejected, setHasRejected] = useState(false)
  const [isFragmenting, setIsFragmenting] = useState(false)
  const [reassemblyPhase, setReassemblyPhase] = useState(0) // 0: none, 1: traveling, 2: arriving, 3: reordering, 4: complete
  const [bufferFragments, setBufferFragments] = useState([])
  // Phase 5: Normal reassembly (in-order mode) states
  const [reassemblyPhase5, setReassemblyPhase5] = useState(0) // 0: source, 1: traveling, 2: buffer, 3: snap, 4: reassembled
  const [showSourceFragments5, setShowSourceFragments5] = useState(false) // Explicitly control visibility of source fragments in Phase 5
  const [showBufferZone, setShowBufferZone] = useState(false)
  const [showReassembledDatagram, setShowReassembledDatagram] = useState(false)
  const [snapProgress, setSnapProgress] = useState(0) // 0-1 for snap animation (Phase 5)
  const [outOfOrderSnapProgress, setOutOfOrderSnapProgress] = useState(0) // 0-1 for snap animation (Out-of-Order)
  const [showOutOfOrderReassembled, setShowOutOfOrderReassembled] = useState(false)
  const lastAttemptRef = useRef(false)
  const startTimeRef = useRef(null)
  const snapStartTimeRef = useRef(null)
  const outOfOrderSnapStartTimeRef = useRef(null)

  // Fragment arrival order based on out-of-order mode
  const getFragmentDelays = () => {
    if (isOutOfOrder) {
      // Out-of-order: Fragment 2 travels first, then 0, then 1
      return [
        { index: 0, delay: 0.8 },  // Frag 0 travels second
        { index: 1, delay: 1.6 },  // Frag 1 travels third
        { index: 2, delay: 0.0 }   // Frag 2 travels first
      ]
    } else {
      // In-order: 0, 1, 2 (sequential by offset)
      return [
        { index: 0, delay: 0.0 },  // Frag 0 (offset 0) travels first
        { index: 1, delay: 0.8 },  // Frag 1 (offset 62) travels second
        { index: 2, delay: 1.6 }   // Frag 2 (offset 124) travels third
      ]
    }
  }

  // Respond to parent's transmission attempt
  useEffect(() => {
    // Only trigger if isAttempting changed from false to true
    if (isAttempting && !lastAttemptRef.current) {
      lastAttemptRef.current = true
      
      if (isDFEnabled) {
        // Phase 1: Rejection when DF is ON
        Promise.resolve().then(() => {
          setHasRejected(true)
        })

        const timer = setTimeout(() => {
          setHasRejected(false)
          lastAttemptRef.current = false
        }, 2000)

        return () => clearTimeout(timer)
      } else if (isOutOfOrder) {
        // Phase 2-4: Out-of-Order Reassembly
        Promise.resolve().then(() => {
          setIsFragmenting(true)
          setReassemblyPhase(0) // Start at phase 0 to show fragments at source
        })
        startTimeRef.current = Date.now()

        // Phase 0: Show fragments at source for 1 second
        const travelStartTimer = setTimeout(() => {
          setReassemblyPhase(1) // Start traveling phase
        }, 1000)

        // Phase 1: Fragments travel one-by-one through tunnel
        // Last fragment starts at 1s + 1.6s delay, animation 2.5s, done at 5.1s
        const completeTimer = setTimeout(() => {
          setReassemblyPhase(2) // Arriving phase
        }, 5100)

        const reorderTimer = setTimeout(() => {
          setReassemblyPhase(3) // Start reordering
          // Scrambled arrival order: Frag 2 first, Frag 0 second, Frag 1 third
          const fragmentData = [
            { id: 0, label: 'Frag 2', offsetIndex: 2, offset: 124, originalIndex: 2 },
            { id: 1, label: 'Frag 0', offsetIndex: 0, offset: 0, originalIndex: 0 },
            { id: 2, label: 'Frag 1', offsetIndex: 1, offset: 62, originalIndex: 1 }
          ]
          setBufferFragments(fragmentData)
        }, 6000) // Brief arrival display before reordering

        const finalTimer = setTimeout(() => {
          setReassemblyPhase(4) // Start snapping phase
          setOutOfOrderSnapProgress(0)
          outOfOrderSnapStartTimeRef.current = Date.now()
        }, 6000) // Start snap after reordering begins

        const snapCompleteTimer = setTimeout(() => {
          setShowOutOfOrderReassembled(true)
        }, 7500) // Show reassembled after snap completes

        const endTimer = setTimeout(() => {
          setReassemblyPhase(0)
          setShowOutOfOrderReassembled(false)
          setOutOfOrderSnapProgress(0)
          setIsFragmenting(false)
          lastAttemptRef.current = false
        }, 8500) // End animation

        return () => {
          clearTimeout(travelStartTimer)
          clearTimeout(completeTimer)
          clearTimeout(reorderTimer)
          clearTimeout(finalTimer)
          clearTimeout(snapCompleteTimer)
          clearTimeout(endTimer)
        }
      } else {
        // PHASE 5: IN-ORDER REASSEMBLY (Normal Mode)
        // Timeline (all times in ms):
        // 0-800ms: Phase 0 - Fragments visible at source
        // 800-2200ms: Phase 1 - Fragments traveling through tunnel
        // 2200-3700ms: Phase 2 - Fragments in buffer at destination
        // 3700-5500ms: Phase 3 - Fragments snapping together
        // 5500-9500ms: Phase 4 - Reassembled datagram visible
        
        Promise.resolve().then(() => {
          setIsFragmenting(true)
          setReassemblyPhase5(0)
          setShowSourceFragments5(true)
          setShowBufferZone(false)
          setShowReassembledDatagram(false)
          setSnapProgress(0)
        })

        // 800ms: Transition from Phase 0 to Phase 1 (start traveling)
        const phase1Timer = setTimeout(() => {
          setShowSourceFragments5(false)
          setReassemblyPhase5(1)
        }, 800)

        // 2200ms: Transition from Phase 1 to Phase 2 (arrived at destination)
        const phase2Timer = setTimeout(() => {
          setReassemblyPhase5(2)
          setShowBufferZone(true)
        }, 2200)

        // 3700ms: Transition from Phase 2 to Phase 3 (start snapping)
        const phase3Timer = setTimeout(() => {
          setReassemblyPhase5(3)
          setSnapProgress(0)
          snapStartTimeRef.current = Date.now()
        }, 3700)

        // 5500ms: Transition from Phase 3 to Phase 4 (show reassembled datagram)
        const phase4Timer = setTimeout(() => {
          setReassemblyPhase5(4)
          setShowBufferZone(false)
          setShowReassembledDatagram(true)
        }, 5500)

        // 9500ms: End animation and reset
        const endTimer = setTimeout(() => {
          setReassemblyPhase5(0)
          setShowBufferZone(false)
          setShowReassembledDatagram(false)
          setSnapProgress(0)
          setIsFragmenting(false)
          lastAttemptRef.current = false
        }, 9500)

        return () => {
          clearTimeout(phase1Timer)
          clearTimeout(phase2Timer)
          clearTimeout(phase3Timer)
          clearTimeout(phase4Timer)
          clearTimeout(endTimer)
        }
      }
    } else if (!isAttempting) {
      lastAttemptRef.current = false
      Promise.resolve().then(() => {
        setIsFragmenting(false)
        setReassemblyPhase(0)
        setReassemblyPhase5(0)
        setShowSourceFragments5(false)
        setShowBufferZone(false)
        setShowReassembledDatagram(false)
        setSnapProgress(0)
        setOutOfOrderSnapProgress(0)
        setShowOutOfOrderReassembled(false)
        setBufferFragments([])
      })
    }
  }, [isAttempting, isDFEnabled, isOutOfOrder])

  // Animate snap progress smoothly from 0 to 1 over 1.8 seconds (3700ms to 5500ms) for Phase 5
  // Also animate out-of-order snap progress from 6000ms to 7500ms (1.5 seconds)
  useFrame(() => {
    // Phase 5 snap animation
    if (reassemblyPhase5 === 3 && snapStartTimeRef.current) {
      const elapsed = Date.now() - snapStartTimeRef.current
      const snapDuration = 1800 // milliseconds for snap animation
      const progress = Math.min(elapsed / snapDuration, 1.0)
      setSnapProgress(progress)

      // If snap is complete, no need to keep animating
      if (progress >= 1.0) {
        snapStartTimeRef.current = null
      }
    }

    // Out-of-order snap animation
    if (isOutOfOrder && reassemblyPhase === 4 && outOfOrderSnapStartTimeRef.current) {
      const elapsed = Date.now() - outOfOrderSnapStartTimeRef.current
      const snapDuration = 1500 // milliseconds for snap animation (1.5 seconds)
      const progress = Math.min(elapsed / snapDuration, 1.0)
      setOutOfOrderSnapProgress(progress)

      // If snap is complete, no need to keep animating
      if (progress >= 1.0) {
        outOfOrderSnapStartTimeRef.current = null
      }
    }
  })

  return (
    <group ref={sceneRef}>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 10, 10]} intensity={1.0} />
      <pointLight position={[-5, 5, 5]} intensity={0.8} color="#00ffff" />

      {/* Source Router (Left) */}
      <Router
        position={[-(SCENE_WIDTH / 2 - 2), 0, 0]}
        label="Source Router"
        color="#22d3ee"
      />

      {/* Large IP Datagram at Source - Hidden during fragmentation */}
      {!isFragmenting && (
        <IPDatagramBox
          position={[-(SCENE_WIDTH / 2 - 2), 3.0, 0]}
          rotation={[0.3, 0.4, 0.1]}
          scale={1.0}
          isRejected={hasRejected}
        />
      )}

      {/* Fragment 0 at Source - Only visible before transmission starts */}
      {isFragmenting && isOutOfOrder && reassemblyPhase === 0 && (
        <Fragment
          position={[-(SCENE_WIDTH / 2 - 2), 3.0, -0.8]}
          label="Fragment 0"
          color="#fbbf24"
          isVisible={true}
          fragmentId={101}
          mf={1}
          offset={0}
        />
      )}

      {/* Fragment 1 at Source - Only visible before transmission starts */}
      {isFragmenting && isOutOfOrder && reassemblyPhase === 0 && (
        <Fragment
          position={[-(SCENE_WIDTH / 2 - 2), 3.0, 0]}
          label="Fragment 1"
          color="#fbbf24"
          isVisible={true}
          fragmentId={101}
          mf={1}
          offset={62}
        />
      )}

      {/* Fragment 2 at Source - Only visible before transmission starts */}
      {isFragmenting && isOutOfOrder && reassemblyPhase === 0 && (
        <Fragment
          position={[-(SCENE_WIDTH / 2 - 2), 3.0, 0.8]}
          label="Fragment 2"
          color="#fbbf24"
          isVisible={true}
          fragmentId={101}
          mf={0}
          offset={124}
        />
      )}

      {/* Traveling Fragments - Animation through tunnel */}
      {isFragmenting && reassemblyPhase === 1 && getFragmentDelays().map((frag) => {
        // Fragments pass through the MTU tunnel
        // Start from source router, descend into tunnel, travel through, then ascend to destination
        const positions = [
          { start: [-(SCENE_WIDTH / 2 - 2), 3.0, -0.4], end: [SCENE_WIDTH / 2 - 2, 1.0, -0.4] },
          { start: [-(SCENE_WIDTH / 2 - 2), 3.0, 0], end: [SCENE_WIDTH / 2 - 2, 0.5, 0] },
          { start: [-(SCENE_WIDTH / 2 - 2), 3.0, 0.4], end: [SCENE_WIDTH / 2 - 2, 0.0, 0.4] }
        ]
        const pos = positions[frag.index]
        const fragmentInfo = [
          { label: 'Frag 0', id: 101, mf: 1, offset: 0 },
          { label: 'Frag 1', id: 101, mf: 1, offset: 62 },
          { label: 'Frag 2', id: 101, mf: 0, offset: 124 }
        ]
        const info = fragmentInfo[frag.index]

        return (
          <TravelingFragment
            key={`traveling-${frag.index}`}
            startPos={pos.start}
            endPos={pos.end}
            delay={frag.delay}
            label={info.label}
            color="#fbbf24"
            fragmentId={info.id}
            mf={info.mf}
            offset={info.offset}
          />
        )
      })}

      {/* Reassembled Fragments at Destination - In-Order (Phase 2) */}
      {isFragmenting && reassemblyPhase >= 2 && reassemblyPhase <= 3 && !isOutOfOrder && (
        <>
          <Fragment
            position={[SCENE_WIDTH / 2 - 2, 1.0, -0.8]}
            label="Fragment 0"
            color={reassemblyPhase === 4 ? '#10b981' : '#fbbf24'}
            isVisible={true}
            fragmentId={101}
            mf={1}
            offset={0}
          />
          <Fragment
            position={[SCENE_WIDTH / 2 - 2, 0.5, 0]}
            label="Fragment 1"
            color={reassemblyPhase === 4 ? '#10b981' : '#fbbf24'}
            isVisible={true}
            fragmentId={101}
            mf={1}
            offset={62}
          />
          <Fragment
            position={[SCENE_WIDTH / 2 - 2, 0.0, 0.8]}
            label="Fragment 2"
            color={reassemblyPhase === 4 ? '#10b981' : '#fbbf24'}
            isVisible={true}
            fragmentId={101}
            mf={0}
            offset={124}
          />

          {/* Reassembly label */}
          {reassemblyPhase === 4 && (
            <Text
              position={[SCENE_WIDTH / 2 - 2, -1.2, 0]}
              fontSize={0.3}
              color="#10b981"
              anchorX="center"
              anchorY="middle"
              pointerEvents="none"
            >
              ✓ Reassembled
            </Text>
          )}
        </>
      )}

      {/* Reassembly Buffer at Destination - Out-of-Order (Phase 2-3) */}
      {isFragmenting && isOutOfOrder && reassemblyPhase >= 2 && reassemblyPhase < 4 && (
        <ReassemblyBuffer
          position={[SCENE_WIDTH / 2 - 2, 0.5, 0]}
          fragments={bufferFragments}
          phase={reassemblyPhase === 2 ? 'arriving' : reassemblyPhase === 3 ? 'reordering' : 'complete'}
        />
      )}

      {/* Out-of-Order Snap Animation (Phase 4) - Fragments snapping together */}
      {isFragmenting && isOutOfOrder && reassemblyPhase === 4 && !showOutOfOrderReassembled && bufferFragments.map((frag) => {
        // Snap positions - move to center by offset order
        const startPos = [
          [SCENE_WIDTH / 2 - 2, 1.0, -0.6],   // Offset 0
          [SCENE_WIDTH / 2 - 2, 0.5, 0],      // Offset 62
          [SCENE_WIDTH / 2 - 2, 0.0, 0.6]     // Offset 124
        ]
        const endPos = [
          [SCENE_WIDTH / 2 - 2, 2.5, -0.2],   // Reassembled offset 0
          [SCENE_WIDTH / 2 - 2, 2.5, 0],      // Reassembled offset 62
          [SCENE_WIDTH / 2 - 2, 2.5, 0.2]     // Reassembled offset 124
        ]
        
        // Sort by offset to match correct order
        const sortedFrags = [...bufferFragments].sort((a, b) => a.offset - b.offset)
        const sortedIdx = sortedFrags.findIndex(f => f.offset === frag.offset)
        
        // Interpolate based on outOfOrderSnapProgress (0-1)
        const currentPos = [
          startPos[sortedIdx][0] + (endPos[sortedIdx][0] - startPos[sortedIdx][0]) * outOfOrderSnapProgress,
          startPos[sortedIdx][1] + (endPos[sortedIdx][1] - startPos[sortedIdx][1]) * outOfOrderSnapProgress,
          startPos[sortedIdx][2] + (endPos[sortedIdx][2] - startPos[sortedIdx][2]) * outOfOrderSnapProgress
        ]

        return (
          <Fragment
            key={`snap-ooo-${frag.id}`}
            position={currentPos}
            label={frag.label}
            color="#fbbf24"
            isVisible={true}
            fragmentId={101}
            mf={frag.offset === 124 ? 0 : 1}
            offset={frag.offset}
          />
        )
      })}

      {/* Out-of-Order: Reassembled datagram at destination */}
      {isFragmenting && isOutOfOrder && showOutOfOrderReassembled && (
        <>
          <IPDatagramBox
            position={[SCENE_WIDTH / 2 - 2, 2.5, 0]}
            rotation={[0.3, 0.4, 0.1]}
            scale={1.0}
            isRejected={false}
          />
          <Text
            position={[SCENE_WIDTH / 2 - 2, 1.0, 0]}
            fontSize={0.3}
            color="#10b981"
            anchorX="center"
            anchorY="middle"
            pointerEvents="none"
          >
            ✓ Reordered & Reassembled
          </Text>
        </>
      )}

      {/* Old Final reassembly complete label for out-of-order - REPLACED ABOVE */}
      { /* Removed old label */ }

      {/* ICMP Error Message (Phase 4) - displayed when showICMPError is true */}
      {showICMPError && isFragmenting && (
        <ICMPErrorMessage
          position={[0, 2.5, 0]}
          visible={true}
        />
      )}

      {/* ===== PHASE 5: NORMAL IN-ORDER REASSEMBLY VISUALIZATION ===== */}
      {/* Three persistent fragments that move through all phases together */}
      {isFragmenting && !isOutOfOrder && [0, 1, 2].map((fragIndex) => {
        const fragmentData = [
          { label: 'Frag 0', id: 101, mf: 1, offset: 0 },
          { label: 'Frag 1', id: 101, mf: 1, offset: 62 },
          { label: 'Frag 2', id: 101, mf: 0, offset: 124 }
        ]
        const data = fragmentData[fragIndex]
        
        // Visibility logic:
        // Phase 0: Show only if showSourceFragments5 is true
        // Phase 1-3: Always show (traveling, buffering, snapping)
        // Phase 4+: Hide
        const shouldShow = reassemblyPhase5 === 0 
          ? showSourceFragments5 
          : reassemblyPhase5 >= 1 && reassemblyPhase5 <= 3

        return (
          <Phase5Fragment
            key={`phase5-frag-${fragIndex}`}
            fragIndex={fragIndex}
            reassemblyPhase5={reassemblyPhase5}
            snapProgress={snapProgress}
            isVisible={shouldShow}
            label={data.label}
            color="#fbbf24"
            fragmentId={data.id}
            mf={data.mf}
            offset={data.offset}
          />
        )
      })}

      {/* Phase 5: Buffer zone visual container (Phases 2-3) */}
      {isFragmenting && (reassemblyPhase5 === 2 || reassemblyPhase5 === 3) && showBufferZone && !isOutOfOrder && (
        <>
          <mesh position={[SCENE_WIDTH / 2 - 2, 2.5, 0]}>
            <boxGeometry args={[2.0, 2.0, 2.0]} />
            <meshStandardMaterial
              color="#064e3b"
              transparent={true}
              opacity={0.1}
              wireframe={false}
            />
          </mesh>
          <Text
            position={[SCENE_WIDTH / 2 - 2, 4.2, 0]}
            fontSize={0.4}
            color="#06b6d4"
            anchorX="center"
            anchorY="middle"
            pointerEvents="none"
          >
            Buffer zone
          </Text>
        </>
      )}

      {/* Phase 5: Reassembled datagram at destination */}
      {isFragmenting && reassemblyPhase5 === 4 && showReassembledDatagram && !isOutOfOrder && (
        <>
          <IPDatagramBox
            position={[SCENE_WIDTH / 2 - 2, 2.5, 0]}
            rotation={[0.3, 0.4, 0.1]}
            scale={1.0}
            isRejected={false}
          />
          <Text
            position={[SCENE_WIDTH / 2 - 2, 1.0, 0]}
            fontSize={0.3}
            color="#10b981"
            anchorX="center"
            anchorY="middle"
            pointerEvents="none"
          >
            ✓ Successfully Reassembled
          </Text>
        </>
      )}

      {/* MTU Tunnel (Center) */}
      <MTUTunnel />

      {/* Destination Router (Right) */}
      <Router
        position={[SCENE_WIDTH / 2 - 2, 0, 0]}
        label="Destination Router"
        color="#06b6d4"
      />

      {/* Ground reference plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[SCENE_WIDTH, 10]} />
        <meshStandardMaterial
          color="#1a1a2e"
          wireframe={true}
          transparent={true}
          opacity={0.15}
        />
      </mesh>

      {/* Connection path between routers (visual guide) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              -(SCENE_WIDTH / 2 - 2),
              0,
              0,
              SCENE_WIDTH / 2 - 2,
              0,
              0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#0891b2" linewidth={2} transparent={true} opacity={0.3} />
      </line>

      {/* UI Button (rendered as 2D HTML overlay - handled in parent) */}
    </group>
  )
}
