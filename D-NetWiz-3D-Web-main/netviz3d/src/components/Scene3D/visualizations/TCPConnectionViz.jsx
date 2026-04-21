/**
 * TCP Connection Visualization
 * Demonstrates the TCP 3-way handshake (HandshakeStage) with packet animations
 * 
 * Phase 1: Scene setup (Client/Server nodes + cable) ✅
 * Phase 2: 3-way handshake animation ✅
 * Phase 3: Failure scenarios (TIMEOUT, REFUSED) ✅
 * Phase 4: 4-way closing (FIN sequences)
 * Phase 5: (TBD)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

// ── DEBUG FLAG ───────────────────────────────────────────────────
const DEBUG = false

// ═════════════════════════════════════════════════════════════════
// COMPONENT: HandshakeStage
// Renders Client and Server nodes with connection cable
// ═════════════════════════════════════════════════════════════════

function HandshakeStage({ connectionState, cableOpacity = 1 }) {
  // Client Node colors - Cyan
  const clientBaseColor = '#06b6d4'
  const clientSuccessColor = '#10b981'  // Green for successful connection
  const clientFailureColor = '#ef4444'  // Red for failures and closed connections
  
  // Server Node colors - Yellow
  const serverBaseColor = '#eab308'
  const serverSuccessColor = '#22c55e'  // Green for successful connection
  const serverFailureColor = '#ef4444'  // Red for failures and closed connections
  
  // Determine client color based on connection state
  const getClientColor = (state) => {
    if (state === 'ESTABLISHED') {
      return clientSuccessColor  // Green for successful handshake
    } else if (state === 'TIMEOUT' || state === 'REFUSED' || state === 'TIME_WAIT') {
      return clientFailureColor  // Red for failures and closing completion
    } else if (state === 'CLOSED') {
      return clientBaseColor  // Return to default cyan when fully closed
    }
    return clientBaseColor  // Cyan during handshake process
  }

  // Determine server color based on connection state
  const getServerColor = (state) => {
    if (state === 'ESTABLISHED') {
      return serverSuccessColor  // Green for successful handshake
    } else if (state === 'TIMEOUT' || state === 'REFUSED' || state === 'TIME_WAIT') {
      return serverFailureColor  // Red for failures and closing completion
    } else if (state === 'CLOSED') {
      return serverBaseColor  // Return to default yellow when fully closed
    }
    return serverBaseColor  // Yellow during handshake process
  }

  const clientColor = getClientColor(connectionState)
  const serverColor = getServerColor(connectionState)

  return (
    <group>
      {/* ── CLIENT NODE (Left, x = -4) ────────────────────────────── */}
      <group position={[-4, 0, 0]}>
        {/* Main cube */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial color={clientColor} emissive={clientColor} emissiveIntensity={0.3} />
        </mesh>

        {/* Glowing ring at the base */}
        <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.08, 16, 32]} />
          <meshBasicMaterial color={clientColor} transparent opacity={0.8} />
        </mesh>

        {/* Status indicator light */}
        <pointLight position={[0, 0.6, 0.8]} intensity={2} distance={3} color={clientColor} />

        {/* Connection port - right side */}
        <mesh position={[0.6, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshPhongMaterial color={clientColor} emissive={clientColor} emissiveIntensity={0.5} />
        </mesh>

        {/* CLIENT Label */}
        <Text
          position={[0, -1.3, 0]}
          fontSize={0.35}
          color={clientColor}
          anchorX="center"
          anchorY="top"
          fontWeight="bold"
        >
          CLIENT
        </Text>
      </group>

      {/* ── CONNECTION CABLE ──────────────────────────────────────── */}
      <group>
        {/* Core transmission line - neutral white */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 8.5, 32]} />
          <meshPhongMaterial 
            color="#e0e7ff" 
            emissive="#c0d9ff" 
            emissiveIntensity={0.8}
            metalness={0.5}
            roughness={0.2}
            transparent
            opacity={cableOpacity}
          />
        </mesh>

        {/* Insulation layer - semi-transparent neutral */}
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 8.5, 32]} />
          <meshPhongMaterial 
            color="#f3f4f6" 
            emissive="#e5e7eb"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6 * cableOpacity}
          />
        </mesh>

        {/* Outer glow layer - subtle white glow */}
        <mesh position={[0, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 8.5, 32]} />
          <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.15 * cableOpacity}
          />
        </mesh>

        {/* Connection connector at left (Client side) */}
        <mesh position={[-4.3, 0, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshPhongMaterial color={clientColor} emissive={clientColor} emissiveIntensity={0.7} />
        </mesh>

        {/* Connection connector at right (Server side) */}
        <mesh position={[4.3, 0, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshPhongMaterial color={serverColor} emissive={serverColor} emissiveIntensity={0.7} />
        </mesh>
      </group>

      {/* Cable glow point light - Neutral white blend */}
      <pointLight position={[0, 0, 0]} intensity={2} distance={10} color="#ffffff" />

      {/* ── SERVER NODE (Right, x = 4) ────────────────────────────── */}
      <group position={[4, 0, 0]}>
        {/* Main cube */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial color={serverColor} emissive={serverColor} emissiveIntensity={0.3} />
        </mesh>

        {/* Glowing ring at the base */}
        <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.08, 16, 32]} />
          <meshBasicMaterial color={serverColor} transparent opacity={0.8} />
        </mesh>

        {/* Status indicator light */}
        <pointLight position={[0, 0.6, 0.8]} intensity={2} distance={3} color={serverColor} />

        {/* Connection port - left side */}
        <mesh position={[-0.6, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshPhongMaterial color={serverColor} emissive={serverColor} emissiveIntensity={0.5} />
        </mesh>

        {/* SERVER Label */}
        <Text
          position={[0, -1.3, 0]}
          fontSize={0.35}
          color={serverColor}
          anchorX="center"
          anchorY="top"
          fontWeight="bold"
        >
          SERVER
        </Text>
      </group>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// COMPONENT: Packet
// Individual data packet visualization with pulsing animation
// ═════════════════════════════════════════════════════════════════

function Packet({ position, label, color, visible, opacity = 1 }) {
  const groupRef = useRef(null)
  const meshRef = useRef(null)

  // Pulsing animation using useFrame
  useFrame((state) => {
    if (!meshRef.current || !visible) return
    
    const pulse = Math.sin(state.clock.elapsedTime * 5) * 0.3
    meshRef.current.scale.setScalar(1 + pulse * 0.3)
  })

  if (!visible) return null

  return (
    <group ref={groupRef} position={position}>
      {/* Main packet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.4}
          transparent={true}
          opacity={opacity}
        />
      </mesh>

      {/* Glow shell 1 */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color={color} transparent={true} opacity={opacity * 0.4} />
      </mesh>

      {/* Glow shell 2 */}
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshBasicMaterial color={color} transparent={true} opacity={opacity * 0.2} />
      </mesh>

      {/* Point light for glow */}
      <pointLight intensity={3} distance={5} color={color} />

      {/* Label group */}
      <group position={[0, 0.85, 0]}>
        {/* Glow background behind text */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[1.2, 0.48]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.25} />
        </mesh>

        {/* Main label text - large and bright */}
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.32}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="900"
          outlineWidth={0.025}
          outlineColor={color}
          letterSpacing={0.08}
        >
          {label}
        </Text>
      </group>
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// COMPONENT: AnimatedPackets
// GSAP timeline orchestration for packet animations
// ═════════════════════════════════════════════════════════════════

function AnimatedPackets({ isHandshaking, onHandshakeComplete, onStateChange, failureType, isClosing, onCableOpacityChange }) {
  const [packets, setPackets] = useState({
    syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
    synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
    ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
    rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
    fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
    ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
  })

  // Track animation state with refs to avoid closure issues
  const animStateRef = useRef({
    synX: -4,
    synAckX: 4,
    ackX: -4,
    rstX: 4,
    finX: -4,
    ack2X: 4,
  })

  // Main animation effect
  useEffect(() => {
    if (!isHandshaking && !isClosing) return

    if (DEBUG) console.log('🎬 Animation starting:', { failureType, isHandshaking, isClosing })

    // Get GSAP from window (loaded via CDN in index.html)
    const gsap = window.gsap
    if (!gsap) {
      console.error('GSAP not loaded - ensure it\'s included in index.html')
      return
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        if (DEBUG) console.log('✅ Timeline complete')
        onHandshakeComplete()
      },
    })

    // ┌───────────────────────────────────────────────────────────┐
    // │ CLOSING HANDSHAKE (4-Way Termination)                     │
    // └───────────────────────────────────────────────────────────┘
    if (isClosing) {
      if (DEBUG) console.log('👋 CLOSING sequence')

      // ═══ STEP 1: Client FIN (0s → 1.5s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('📤 Step 1: Client sending FIN')
          onStateChange('FIN_WAIT_1')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: true, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.finX = -4
        },
        null,
        0
      )

      // Animate FIN packet
      timeline.to(
        animStateRef.current,
        {
          finX: 4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              fin: { ...p.fin, position: [animStateRef.current.finX, 0, 0] },
            }))
          },
        },
        0
      )

      // ═══ STEP 2: Server ACK (1.5s → 3.0s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('📥 Step 2: Server sending ACK')
          onStateChange('CLOSE_WAIT')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: true, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.ack2X = 4
        },
        null,
        1.5
      )

      // Animate ACK packet back
      timeline.to(
        animStateRef.current,
        {
          ack2X: -4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              ack2: { ...p.ack2, position: [animStateRef.current.ack2X, 0, 0] },
            }))
          },
        },
        1.5
      )

      // ═══ STEP 3: Server FIN with 1-second delay (4.0s → 5.5s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('📤 Step 3: Server sending FIN')
          onStateChange('LAST_ACK')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [4, 0, 0], visible: true, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [-4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.finX = 4
        },
        null,
        4.0
      )

      // Animate Server FIN backwards
      timeline.to(
        animStateRef.current,
        {
          finX: -4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              fin: { ...p.fin, position: [animStateRef.current.finX, 0, 0] },
            }))
          },
        },
        4.0
      )

      // ═══ STEP 4: Client final ACK (5.5s → 7.0s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('✅ Step 4: Client sending final ACK')
          onStateChange('TIME_WAIT')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [-4, 0, 0], visible: true, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.ack2X = -4
        },
        null,
        5.5
      )

      // Animate final ACK
      timeline.to(
        animStateRef.current,
        {
          ack2X: 4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              ack2: { ...p.ack2, position: [animStateRef.current.ack2X, 0, 0] },
            }))
          },
        },
        5.5
      )

      // ═══ FINAL: Fade cable and reset (7.0s → 8.0s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('🔌 Closing connection - Fading cable')
        },
        null,
        7.0
      )

      // Fade cable opacity
      timeline.to(
        { opacity: 1 },
        {
          opacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: function () {
            if (onCableOpacityChange) {
              onCableOpacityChange(this.progress())
            }
          },
        },
        7.0
      )

      // Final state - connection closed
      timeline.call(
        () => {
          if (DEBUG) console.log('❌ Connection CLOSED')
          onStateChange('CLOSED')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
        },
        null,
        8.0
      )

      return () => {
        timeline.kill()
      }
    }

    // ┌───────────────────────────────────────────────────────────┐
    // │ SUCCESSFUL HANDSHAKE                                      │
    // └───────────────────────────────────────────────────────────┘
    if (!failureType) {
      if (DEBUG) console.log('✅ SUCCESS scenario')

      // ═══ STEP 1: SYN (0s → 1.5s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('📤 Step 1: SYN_SENT')
          onStateChange('SYN_SENT')
          setPackets({
            syn: { position: [-4, 0, 0], visible: true, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.synX = -4
        },
        null,
        0
      )

      // Animate SYN packet movement
      timeline.to(
        animStateRef.current,
        {
          synX: 4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              syn: { ...p.syn, position: [animStateRef.current.synX, 0, 0] },
            }))
          },
        },
        0
      )

      // ═══ STEP 2: SYN-ACK (1.5s → 3.0s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('📥 Step 2: SYN_RCVD')
          onStateChange('SYN_RCVD')
          setPackets({
            syn: { position: [4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: true, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.synAckX = 4
        },
        null,
        1.5
      )

      // Animate SYN-ACK packet movement
      timeline.to(
        animStateRef.current,
        {
          synAckX: -4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              synAck: { ...p.synAck, position: [animStateRef.current.synAckX, 0, 0] },
            }))
          },
        },
        1.5
      )

      // ═══ STEP 3: ACK (3.0s → 4.5s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('✅ Step 3: ESTABLISHED_CLIENT')
          onStateChange('ESTABLISHED_CLIENT')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [-4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: true, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.ackX = -4
        },
        null,
        3.0
      )

      // Animate ACK packet movement
      timeline.to(
        animStateRef.current,
        {
          ackX: 4,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              ack: { ...p.ack, position: [animStateRef.current.ackX, 0, 0] },
            }))
          },
        },
        3.0
      )

      // ═══ FINAL: Connection established (4.5s) ═══
      timeline.call(
        () => {
          if (DEBUG) console.log('🔗 Handshake complete')
          onStateChange('ESTABLISHED')
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
        },
        null,
        4.5
      )
    }

    // ┌───────────────────────────────────────────────────────────┐
    // │ TIMEOUT SCENARIO                                          │
    // └───────────────────────────────────────────────────────────┘
    else if (failureType === 'TIMEOUT') {
      if (DEBUG) console.log('⏱️ TIMEOUT scenario')

      // Show SYN packet
      timeline.call(
        () => {
          if (DEBUG) console.log('📤 SYN packet being sent...')
          onStateChange('SYN_SENT')
          setPackets({
            syn: { position: [-4, 0, 0], visible: true, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.synX = -4
        },
        null,
        0
      )

      // Move SYN to middle
      timeline.to(
        animStateRef.current,
        {
          synX: 0,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              syn: { ...p.syn, position: [animStateRef.current.synX, 0, 0] },
            }))
          },
        },
        0
      )

      // Blink yellow 3 times
      for (let i = 0; i < 3; i++) {
        const time = 1.5 + i * 0.3
        timeline.to(
          {},
          {
            duration: 0.15,
            onUpdate: () => {
              setPackets((p) => ({
                ...p,
                syn: { ...p.syn, color: '#eab308', opacity: 0.4 },
              }))
            },
          },
          time
        )
        timeline.to(
          {},
          {
            duration: 0.15,
            onUpdate: () => {
              setPackets((p) => ({
                ...p,
                syn: { ...p.syn, color: '#3b82f6', opacity: 1 },
              }))
            },
          },
          time + 0.15
        )
      }

      // Turn red and disappear
      timeline.call(
        () => {
          setPackets((p) => ({
            ...p,
            syn: { ...p.syn, color: '#ef4444' },
          }))
        },
        null,
        2.4
      )

      timeline.to(
        animStateRef.current,
        {
          duration: 0.5,
          ease: 'power2.in',
          onUpdate: function () {
            const progress = this.progress()
            setPackets((p) => ({
              ...p,
              syn: { ...p.syn, scale: 1 - progress * 0.8, opacity: 1 - progress * 0.8 },
            }))
          },
          onComplete: () => {
            setPackets((p) => ({
              ...p,
              syn: { ...p.syn, visible: false },
            }))
          },
        },
        2.4
      )

      timeline.call(
        () => {
          if (DEBUG) console.log('⏱️ TIMEOUT state reached')
          onStateChange('TIMEOUT')
        },
        null,
        2.9
      )
    }

    // ┌───────────────────────────────────────────────────────────┐
    // │ REFUSED SCENARIO                                          │
    // └───────────────────────────────────────────────────────────┘
    else if (failureType === 'REFUSED') {
      if (DEBUG) console.log('❌ REFUSED scenario')

      // Show SYN packet
      timeline.call(
        () => {
          if (DEBUG) console.log('📤 SYN packet being sent...')
          onStateChange('SYN_SENT')
          setPackets({
            syn: { position: [-4, 0, 0], visible: true, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.synX = -4
        },
        null,
        0
      )

      // Move SYN to middle
      timeline.to(
        animStateRef.current,
        {
          synX: 0,
          duration: 1.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              syn: { ...p.syn, position: [animStateRef.current.synX, 0, 0] },
            }))
          },
        },
        0
      )

      // Server sends RST (connection refused)
      timeline.call(
        () => {
          if (DEBUG) console.log('❌ RST packet being sent back...')
          onStateChange('REFUSED')
          setPackets({
            syn: { position: [0, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: true, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
          animStateRef.current.rstX = 4
        },
        null,
        1.5
      )

      // Animate RST back to client fast
      timeline.to(
        animStateRef.current,
        {
          rstX: -4,
          duration: 0.8,
          ease: 'power2.out',
          onUpdate: () => {
            setPackets((p) => ({
              ...p,
              rst: { ...p.rst, position: [animStateRef.current.rstX, 0, 0] },
            }))
          },
        },
        1.5
      )

      // Clean up
      timeline.call(
        () => {
          setPackets({
            syn: { position: [-4, 0, 0], visible: false, color: '#3b82f6', scale: 1, opacity: 1 },
            synAck: { position: [4, 0, 0], visible: false, color: '#8b5cf6', scale: 1, opacity: 1 },
            ack: { position: [-4, 0, 0], visible: false, color: '#ec4899', scale: 1, opacity: 1 },
            rst: { position: [4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            fin: { position: [-4, 0, 0], visible: false, color: '#ef4444', scale: 1, opacity: 1 },
            ack2: { position: [4, 0, 0], visible: false, color: '#10b981', scale: 1, opacity: 1 },
          })
        },
        null,
        2.3
      )
    }

    return () => {
      timeline.kill()
    }
  }, [isHandshaking, isClosing, onHandshakeComplete, onStateChange, failureType, onCableOpacityChange])

  return (
    <group>
      <Packet
        position={packets.syn.position}
        label="SYN"
        color={packets.syn.color}
        visible={packets.syn.visible}
        opacity={packets.syn.opacity}
      />
      <Packet
        position={packets.synAck.position}
        label="SYN-ACK"
        color={packets.synAck.color}
        visible={packets.synAck.visible}
        opacity={packets.synAck.opacity}
      />
      <Packet
        position={packets.ack.position}
        label="ACK"
        color={packets.ack.color}
        visible={packets.ack.visible}
        opacity={packets.ack.opacity}
      />
      <Packet
        position={packets.rst.position}
        label="RST"
        color={packets.rst.color}
        visible={packets.rst.visible}
        opacity={packets.rst.opacity}
      />
      <Packet
        position={packets.fin.position}
        label="FIN"
        color={packets.fin.color}
        visible={packets.fin.visible}
        opacity={packets.fin.opacity}
      />
      <Packet
        position={packets.ack2.position}
        label="ACK"
        color={packets.ack2.color}
        visible={packets.ack2.visible}
        opacity={packets.ack2.opacity}
      />
    </group>
  )
}

// ═════════════════════════════════════════════════════════════════
// MAIN EXPORT: TCPConnectionViz
// ═════════════════════════════════════════════════════════════════

export default function TCPConnectionViz({ triggerScenario, onStateUpdate, triggerClosing }) {
  const [isHandshaking, setIsHandshaking] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [connectionState, setConnectionState] = useState('CLOSED')
  const [failureType, setFailureType] = useState(null)
  const [statusMessage, setStatusMessage] = useState('Ready')
  const [cableOpacity, setCableOpacity] = useState(1)

  // Memoize state change handler to prevent unnecessary re-renders of AnimatedPackets
  const handleStateChange = useCallback((newState) => {
    if (DEBUG) console.log('📊 State update:', newState)
    setConnectionState(newState)

    let statusMsg = 'Ready'
    switch (newState) {
      case 'SYN_SENT':
        statusMsg = '📤 Step 1/3: Client sending SYN (Blue Packet) - Initiating connection...'
        break
      case 'SYN_RCVD':
        statusMsg = '📥 Step 2/3: Server received SYN, responding with SYN-ACK (Purple Packet)...'
        break
      case 'ESTABLISHED_CLIENT':
        statusMsg = '✅ Step 3/3: Client acknowledging with ACK (Pink Packet)...'
        break
      case 'ESTABLISHED':
        statusMsg = '🔗 Connection ESTABLISHED! 3-Way Handshake Complete'
        break
      case 'TIMEOUT':
        statusMsg = '⏱️ Connection TIMEOUT - Server did not respond'
        break
      case 'REFUSED':
        statusMsg = '❌ Connection REFUSED - Server rejected request'
        break
      case 'FIN_WAIT_1':
        statusMsg = '👋 Step 1/4: Client initiating termination - Sending FIN...'
        break
      case 'CLOSE_WAIT':
        statusMsg = '👂 Step 2/4: Server received FIN - Acknowledging with ACK...'
        break
      case 'LAST_ACK':
        statusMsg = '👋 Step 3/4: Server sending FIN...'
        break
      case 'TIME_WAIT':
        statusMsg = '✅ Step 4/4: Client sending final ACK - Closing connection...'
        break
      case 'CLOSED':
        statusMsg = '🔌 Connection CLOSED! 4-Way Handshake Complete'
        break
      default:
        statusMsg = 'Ready'
    }

    setStatusMessage(statusMsg)
    if (onStateUpdate) {
      onStateUpdate(statusMsg)
    }
  }, [onStateUpdate])

  // Memoize handshake complete handler
  const handleHandshakeComplete = useCallback(() => {
    if (DEBUG) console.log('🏁 Animation complete')
    setIsHandshaking(false)
    setIsClosing(false)

    // Auto reset after delay to show the final color briefly then return to default
    // Delayed state update is intentional and avoids cascading renders
    setTimeout(() => {
      // Defer setState to avoid cascading renders
      setTimeout(() => setConnectionState('CLOSED'), 0)
      setStatusMessage('Ready')
      setFailureType(null)
      setCableOpacity(1)
    }, 2000)
  }, [])

  // Listen for external triggers
  useEffect(() => {
    if (!triggerScenario && !triggerClosing) return

    if (DEBUG) console.log('🎯 Trigger received:', { triggerScenario, triggerClosing })

    // Handle closing trigger - takes priority
    if (triggerClosing) {
      // Start closing animation immediately (defer to avoid cascading renders)
      setTimeout(() => setIsClosing(true), 0)
      return
    }

    // Handle opening trigger (only if no closing animation)
    if (triggerScenario && !triggerClosing) {
      // Reset state for new animation (defer all setState calls)
      setTimeout(() => {
        setConnectionState('CLOSED')
        setIsHandshaking(false)
        setIsClosing(false)
        setCableOpacity(1)
      }, 0)

      // Set failure type based on trigger (defer setState)
      setTimeout(() => {
        if (triggerScenario === 'success') {
          setFailureType(null)
        } else if (triggerScenario === 'timeout') {
          setFailureType('TIMEOUT')
        } else if (triggerScenario === 'refused') {
          setFailureType('REFUSED')
        }
      }, 0)

      // Start animation after state is reset
      const timer = setTimeout(() => {
        setIsHandshaking(true)
      }, 50)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [triggerScenario, triggerClosing])

  return (
    <group>
      {/* Nodes and connection cable */}
      <HandshakeStage connectionState={connectionState} cableOpacity={cableOpacity} />

      {/* Animated packets */}
      <AnimatedPackets
        isHandshaking={isHandshaking}
        isClosing={isClosing}
        onStateChange={handleStateChange}
        onHandshakeComplete={handleHandshakeComplete}
        failureType={failureType}
        onCableOpacityChange={setCableOpacity}
      />

      {/* Status message storage */}
      <group userData={{ statusMessage }} />
    </group>
  )
}

export { HandshakeStage }
