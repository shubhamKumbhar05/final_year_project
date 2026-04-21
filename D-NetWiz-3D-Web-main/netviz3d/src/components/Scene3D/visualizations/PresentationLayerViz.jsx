import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

/**
 * Presentation Layer Visualization - Per-Concept Models
 * Encryption | Compression | Encoding | Translation
 */

// Encryption Visualization
function EncryptionViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.008
  })
  return (
    <group ref={groupRef}>
      {/* Plain text box */}
      <mesh position={[-3.5, 0, 0]}>
        <boxGeometry args={[1.2, 2, 1.2]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
      {/* Encryption process (rotating torus) */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[1.5, 0.2, 16, 100]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>
      {/* Encrypted text box */}
      <mesh position={[3.5, 0, 0]}>
        <boxGeometry args={[1.2, 2, 1.2]} />
        <meshStandardMaterial color="#dc2626" emissive="#991b1b" emissiveIntensity={0.7} />
      </mesh>
      {/* Key indicator */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[0.4, 0.8, 0.4]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

// Compression Visualization
function CompressionViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z += 0.005
  })
  return (
    <group ref={groupRef}>
      {/* Uncompressed data (larger) */}
      <mesh position={[-4, 0, 0]}>
        <boxGeometry args={[2.5, 2.5, 2.5]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
      {/* Arrow indicator */}
      <mesh position={[-0.5, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
      {/* Compressed data (smaller) */}
      <mesh position={[4, 0, 0]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.7} />
      </mesh>
      {/* Compression label */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// Encoding Visualization
function EncodingViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.006
  })
  return (
    <group ref={groupRef}>
      {/* Source format */}
      <mesh position={[-4, 0, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
      {/* Encoding processors */}
      {[0, 1, 2].map((i) => (
        <mesh key={`encode-${i}`} position={[-1.5 + i * 1.5, 0, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Encoded format */}
      <mesh position={[4, 0, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// Translation Visualization
function TranslationViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.x += 0.004
  })
  return (
    <group ref={groupRef}>
      {/* Input format A */}
      <mesh position={[-4, 1.5, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
      {/* Input format B */}
      <mesh position={[-4, -1.5, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
      </mesh>
      {/* Translator hub */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 1.8, 1.8]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>
      {/* Output format */}
      <mesh position={[4, 0, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

export default function PresentationLayerViz({ conceptId = 'pres-encryption' }) {
  switch (conceptId) {
    case 'pres-encryption':
      return <EncryptionViz />
    case 'pres-compression':
      return <CompressionViz />
    case 'pres-encoding':
      return <EncodingViz />
    case 'pres-translation':
      return <TranslationViz />
    default:
      return <EncryptionViz />
  }
}
