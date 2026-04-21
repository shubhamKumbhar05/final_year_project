import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

/**
 * Session Layer Visualization - Per-Concept Models
 * Session Establishment | Dialog Control | Synchronization | Session Termination
 */

// Session Establishment Visualization
function SessionEstablishmentViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.004
  })
  return (
    <group ref={groupRef}>
      {/* Initiator */}
      <mesh position={[-4, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.7} />
      </mesh>
      {/* Handshake steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={`handshake-${i}`} position={[-2 + i * 2, 1.5, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Responder */}
      <mesh position={[4, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.7} />
      </mesh>
      {/* Connection line */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-4, 0, 0, 4, 0, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
    </group>
  )
}

// Speaker Box Component - handles its own color animation
function SpeakerBox({ position, isActive }) {
  const meshRef = useRef()
  const timeRef = useRef(0)
  const colorRef = useRef('#3b82f6')

  useFrame(() => {
    timeRef.current += 0.016
    if (meshRef.current) {
      const isHighlight = isActive && Math.floor(timeRef.current / 1000) % 2 === 0
      colorRef.current = isHighlight ? '#60a5fa' : '#3b82f6'
      meshRef.current.material.color.set(colorRef.current)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1.2, 1.8, 1.2]} />
      <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.7} />
    </mesh>
  )
}

// Dialog Control Visualization
function DialogControlViz() {
  const groupRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.z += 0.003
  })

  return (
    <group ref={groupRef}>
      {/* Speaker A */}
      <SpeakerBox position={[-3.5, 0, 0]} isActive={true} />
      {/* Token indicator (who's speaking) */}
      <TokenIndicator timeRef={timeRef} />
      {/* Speaker B */}
      <SpeakerBox position={[3.5, 0, 0]} isActive={false} />
      {/* Conversation line */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-3.5, 0, 0, 3.5, 0, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
    </group>
  )
}

function TokenIndicator({ timeRef }) {
  const sphereRef = useRef()
  useFrame(() => {
    if (sphereRef.current) {
      sphereRef.current.position.x = Math.sin(timeRef.current * 0.002) * 2
    }
  })
  return (
    <mesh ref={sphereRef} position={[0, 2, 0]}>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
    </mesh>
  )
}

// Synchronization Visualization
function SynchronizationViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.005
  })
  return (
    <group ref={groupRef}>
      {/* Sync points along session */}
      {[0, 1, 2, 3].map((i) => {
        const xPos = -3 + i * 2
        return (
          <group key={`sync-${i}`} position={[xPos, 0, 0]}>
            {/* Checkpoint sphere */}
            <mesh>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#60a5fa' : '#93c5fd'} emissive="#3b82f6" emissiveIntensity={0.8} />
            </mesh>
            {/* Data blocks */}
            {[0, 1].map((j) => (
              <mesh key={`data-${j}`} position={[0, (j - 0.5) * 1.2, 0]}>
                <boxGeometry args={[0.4, 0.4, 0.4]} />
                <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.7} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* Timeline */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-4, -2, 0, 4, -2, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
    </group>
  )
}

// Session Termination Visualization
function SessionTerminationViz() {
  const groupRef = useRef()
  const terminatedRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.003
    if (terminatedRef.current) {
      const progress = Math.max(0.1, 1 - (timeRef.current % 3000) / 3000)
      terminatedRef.current.scale.set(progress, progress, progress)
      terminatedRef.current.material.opacity = progress
    }
  })
  return (
    <group ref={groupRef}>
      {/* Active session */}
      <mesh position={[-4, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#60a5fa" emissive="#3b82f6" emissiveIntensity={0.8} />
      </mesh>
      {/* Closing process */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 1.8, 1.8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} />
      </mesh>
      {/* Terminated/closed */}
      <mesh ref={terminatedRef} position={[4, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.7} transparent opacity={1} />
      </mesh>
      {/* Timeline arrow */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-4, -2, 0, 4, -2, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </line>
    </group>
  )
}

export default function SessionLayerViz({ conceptId = 'sess-establishment' }) {
  switch (conceptId) {
    case 'sess-establishment':
      return <SessionEstablishmentViz />
    case 'sess-dialog-control':
      return <DialogControlViz />
    case 'sess-sync':
      return <SynchronizationViz />
    case 'sess-termination':
      return <SessionTerminationViz />
    default:
      return <SessionEstablishmentViz />
  }
}
