import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import HTTPViz from './HTTPViz'
import HTTPSViz from './HTTPSViz'
import DNSViz from './DNSViz'
import FTPViz from './FTPViz'
import TelnetViz from './TelnetViz'

/**
 * Application Layer Visualization - Per-Concept Models
 * HTTP | HTTPS | DNS | FTP | Telnet
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

// Fallback HTTP Visualization (used if HTTPViz component fails to load)
function HTTPVizFallback() {
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

export default function ApplicationLayerViz({ conceptId = 'app-http' }) {
  switch (conceptId) {
    case 'app-http':
      return <HTTPViz />
    case 'app-https':
      return <HTTPSViz />
    case 'app-dns':
      return <DNSViz />
    case 'app-ftp':
      return <FTPViz />
    case 'app-telnet':
      return <TelnetViz />
    default:
      return <HTTPViz />
  }
}
