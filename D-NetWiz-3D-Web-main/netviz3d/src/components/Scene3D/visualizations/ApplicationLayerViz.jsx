import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

/**
 * Application Layer Visualization - Per-Concept Models
 * HTTP | DNS | FTP | Data Generator
 */

// Arrow particle for HTTP
function HTTPArrow({ index }) {
  const meshRef = useRef()
  const timeRef = useRef(0)

  useFrame(() => {
    timeRef.current += 0.016
    if (meshRef.current) {
      meshRef.current.position.y = 0.5 + Math.sin(timeRef.current * 0.003 + index) * 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={[-1 + index, 0.5, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
    </mesh>
  )
}

// HTTP Visualization
function HTTPViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.01
  })
  return (
    <group ref={groupRef}>
      {/* Request box */}
      <mesh position={[-3, 0, 0]}>
        <boxGeometry args={[1.5, 2, 1.5]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.6} />
      </mesh>
      {/* Response box */}
      <mesh position={[3, 0, 0]}>
        <boxGeometry args={[1.5, 2, 1.5]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.6} />
      </mesh>
      {/* Data flowing arrows */}
      {[0, 1, 2].map((i) => (
        <HTTPArrow key={`arrow-${i}`} index={i} />
      ))}
    </group>
  )
}

// DNS Visualization
function DNSViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z += 0.005
  })
  return (
    <group ref={groupRef}>
      {/* Query sphere */}
      <mesh position={[-4, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.7} />
      </mesh>
      {/* DNS server (octahedron) */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.8} />
      </mesh>
      {/* Response torus */}
      <mesh position={[4, 0, 0]}>
        <torusGeometry args={[0.8, 0.2, 16, 100]} />
        <meshStandardMaterial color="#6ee7b7" emissive="#10b981" emissiveIntensity={0.6} />
      </mesh>
      {/* Lines connecting */}
      {[0, 1].map((i) => (
        <line key={`line-${i}`} position={[0, 0, 0]}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-4, 0, 0, 4, 0, 0])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color="#10b981" linewidth={2} />
        </line>
      ))}
    </group>
  )
}

// FTP Visualization
function FTPViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.x += 0.008
  })
  return (
    <group ref={groupRef}>
      {/* Source node */}
      <mesh position={[-4, 0, 0]}>
        <boxGeometry args={[1.2, 2.5, 1.2]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.7} />
      </mesh>
      {/* Files (small cubes) */}
      {[0, 1, 2].map((i) => (
        <mesh key={`file-${i}`} position={[-1.5 + i, -1.5 + Math.sin(Date.now() * 0.002 + i) * 0.8, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Destination node */}
      <mesh position={[4, 0, 0]}>
        <boxGeometry args={[1.2, 2.5, 1.2]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

// Data Generator Visualization
function DataGeneratorViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.005
  })
  return (
    <group ref={groupRef}>
      {/* Generator core */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.7} />
      </mesh>
      {/* Orbiting particles */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const angle = (i / 6) * Math.PI * 2
        const x = Math.cos(angle) * (3 + Math.sin(Date.now() * 0.002) * 0.5)
        const y = Math.sin(angle) * (3 + Math.cos(Date.now() * 0.002) * 0.5)
        return (
          <mesh key={`particle-${i}`} position={[x, y, 0]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
          </mesh>
        )
      })}
      {/* Emission ring */}
      <mesh>
        <torusGeometry args={[3.5, 0.1, 8, 100]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

export default function ApplicationLayerViz({ conceptId = 'app-http' }) {
  switch (conceptId) {
    case 'app-http':
      return <HTTPViz />
    case 'app-dns':
      return <DNSViz />
    case 'app-ftp':
      return <FTPViz />
    case 'app-data-gen':
      return <DataGeneratorViz />
    default:
      return <HTTPViz />
  }
}
