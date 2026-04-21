import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

/**
 * Physical Layer Visualization - Per-Concept Models
 * Cables | Digital Signals | Signal Modulation | Hubs | Line Coding | Synchronization
 */

// Cables/Transmission Media Visualization
function CablesViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.002
  })
  return (
    <group ref={groupRef}>
      {/* Different cable types */}
      {[0, 1, 2].map((i) => (
        <mesh key={`cable-${i}`} position={[(i - 1) * 3, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 4, 16]} />
          <meshStandardMaterial color={['#0284c7', '#00d9ff', '#0f766e'][i]} emissive={['#0096ff', '#0284c7', '#14b8a6'][i]} emissiveIntensity={0.7} />
        </mesh>
      ))}
      {/* Connected nodes */}
      {[0, 1, 2].map((i) => (
        <group key={`node-${i}`}>
          <mesh position={[(i - 1) * 3, -2.5, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="#0f172a" emissive="#0284c7" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[(i - 1) * 3, 2.5, 0]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color="#0f172a" emissive="#0284c7" emissiveIntensity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Digital Signals Visualization
function DigitalSignalsViz() {
  const groupRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.z += 0.001
  })
  return (
    <group ref={groupRef}>
      {/* Signal wave representation */}
      <DigitalBits timeRef={timeRef} />
      {/* Baseline */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-3, 0, 0, 3, 0, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#0284c7" linewidth={1} />
      </line>
    </group>
  )
}

function DigitalBits({ timeRef }) {
  const bitsRef = useRef([])

  useFrame(() => {
    bitsRef.current.forEach((ref, i) => {
      if (ref) {
        const isHigh = Math.floor((timeRef.current * 0.001 + i) / 2) % 2 === 0
        ref.position.y = isHigh ? 1.5 : -1.5
        ref.material.color.setHex(isHigh ? 0x00d9ff : 0x0284c7)
      }
    })
  })

  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={`bit-${i}`} ref={(el) => (bitsRef.current[i] = el)} position={[-2 + i * 1, -1.5, 0]}>
          <boxGeometry args={[0.6, 0.8, 0.6]} />
          <meshStandardMaterial color="#00d9ff" emissive="#0f766e" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </>
  )
}

// Signal Modulation Visualization
function SignalModulationViz() {
  const groupRef = useRef()
  const modulatedRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.002
    if (modulatedRef.current) {
      modulatedRef.current.position.y = Math.sin(timeRef.current * 0.003) * 1.5
    }
  })
  return (
    <group ref={groupRef}>
      {/* Carrier wave */}
      <mesh position={[-4, 0, 0]}>
        <torusGeometry args={[1, 0.2, 8, 100]} />
        <meshStandardMaterial color="#0284c7" emissive="#0096ff" emissiveIntensity={0.6} />
      </mesh>
      {/* Data signal */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} />
      </mesh>
      {/* Modulated signal */}
      <mesh ref={modulatedRef} position={[4, 0, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#00d9ff" emissive="#0f766e" emissiveIntensity={0.8} />
      </mesh>
      {/* Flow arrows */}
      {[0, 1].map((i) => (
        <line key={`arrow-${i}`}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-4, -1.5 + i * 3, 0, 0, -1.5 + i * 3, 0])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#fbbf24" linewidth={2} />
        </line>
      ))}
    </group>
  )
}

// Hubs/Repeaters Visualization
function HubsViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.004
  })
  return (
    <group ref={groupRef}>
      {/* Central hub */}
      <mesh>
        <octahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#0284c7" emissive="#0096ff" emissiveIntensity={0.8} />
      </mesh>
      {/* Connected devices */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2
        return (
          <group key={`device-${i}`}>
            {/* Device */}
            <mesh position={[Math.cos(angle) * 4, Math.sin(angle) * 4, 0]}>
              <sphereGeometry args={[0.6, 16, 16]} />
              <meshStandardMaterial color="#0f172a" emissive="#0284c7" emissiveIntensity={0.7} />
            </mesh>
            {/* Connection cable */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([0, 0, 0, Math.cos(angle) * 4, Math.sin(angle) * 4, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#0284c7" linewidth={2} />
            </line>
          </group>
        )
      })}
    </group>
  )
}

// Line Coding Visualization
function LineCodinViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z += 0.003
  })
  return (
    <group ref={groupRef}>
      {/* Binary data input */}
      <mesh position={[-4, 1.5, 0]}>
        <boxGeometry args={[1.5, 1.5, 1]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.7} />
      </mesh>
      {/* Encoder */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#0284c7" emissive="#0096ff" emissiveIntensity={0.8} />
      </mesh>
      {/* Output varying signal */}
      {[0, 1, 2, 3, 4].map((i) => {
        const yPos = (i % 2) === 0 ? 1 : -1
        return (
          <mesh key={`coded-${i}`} position={[0 + i * 0.8, yPos + 1.5, 0]}>
            <boxGeometry args={[0.5, 0.6, 0.5]} />
            <meshStandardMaterial color="#00d9ff" emissive="#0f766e" emissiveIntensity={0.8} />
          </mesh>
        )
      })}
      {/* Output label */}
      <mesh position={[4, -1.5, 0]}>
        <boxGeometry args={[1.5, 1.5, 1]} />
        <meshStandardMaterial color="#00d9ff" emissive="#0284c7" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

// Synchronization Visualization
function SynchronizationViz() {
  const groupRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.002
  })
  return (
    <group ref={groupRef}>
      {/* Clock signal */}
      <ClockSignal timeRef={timeRef} />
      {/* Clock reference */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[6, 0.4, 0.8]} />
        <meshStandardMaterial color="#0284c7" emissive="#0096ff" emissiveIntensity={0.6} />
      </mesh>
      {/* Sync indicator line */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-4, 0, 0, 4, 0, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#0284c7" linewidth={2} />
      </line>
    </group>
  )
}

function ClockSignal({ timeRef }) {
  const clockRef = useRef([])

  useFrame(() => {
    clockRef.current.forEach((ref, i) => {
      if (ref) {
        const isHigh = Math.floor((timeRef.current * 0.001 + i) / 2) % 2 === 0
        ref.position.y = isHigh ? 1.5 : -1.5
        ref.material.color.setHex(isHigh ? 0xfbbf24 : 0x0284c7)
      }
    })
  })

  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`clock-${i}`} ref={(el) => (clockRef.current[i] = el)} position={[-3 + i * 2, -1.5, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </>
  )
}

export default function PhysicalLayerViz({ conceptId = 'phys-cables' }) {
  switch (conceptId) {
    case 'phys-cables':
      return <CablesViz />
    case 'phys-digital-signals':
      return <DigitalSignalsViz />
    case 'phys-modulation':
      return <SignalModulationViz />
    case 'phys-hubs':
      return <HubsViz />
    case 'phys-line-coding':
      return <LineCodinViz />
    case 'phys-sync':
      return <SynchronizationViz />
    default:
      return <CablesViz />
  }
}
