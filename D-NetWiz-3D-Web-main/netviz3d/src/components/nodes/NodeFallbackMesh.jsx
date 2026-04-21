import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/*
 * Low-poly procedural meshes used when no GLB model is present.
 * Each type has a recognisable silhouette + emissive colour accent.
 *
 * Colours:
 *   PC     → steel blue  (#0088cc)
 *   Router → cyan-green  (#00ccaa)
 *   Server → violet      (#8800ff)
 */

// ── Shared material helper ────────────────────────────────────────────────────
function NodeMat({ color, emissive, hovered }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={emissive}
      emissiveIntensity={hovered ? 1.8 : 0.6}
      metalness={0.7}
      roughness={0.25}
    />
  )
}

// ── PC ────────────────────────────────────────────────────────────────────────
export function PCMesh({ hovered }) {
  return (
    <group>
      {/* Monitor body */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[1.4, 1.0, 0.12]} />
        <NodeMat color="#0d2a4a" emissive="#0088cc" hovered={hovered} />
      </mesh>
      {/* Screen bezel inset */}
      <mesh position={[0, 1.0, 0.07]}>
        <boxGeometry args={[1.15, 0.78, 0.01]} />
        <meshStandardMaterial color="#001122" emissive="#00aaff" emissiveIntensity={hovered ? 2.5 : 1.2} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.5, 8]} />
        <NodeMat color="#0d2a4a" emissive="#0088cc" hovered={hovered} />
      </mesh>
      {/* Stand base */}
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[0.65, 0.06, 0.38]} />
        <NodeMat color="#0d2a4a" emissive="#0088cc" hovered={hovered} />
      </mesh>
      {/* Keyboard */}
      <mesh position={[0, 0.04, 0.55]} castShadow>
        <boxGeometry args={[1.1, 0.05, 0.42]} />
        <NodeMat color="#081820" emissive="#0055aa" hovered={hovered} />
      </mesh>
    </group>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export function RouterMesh({ hovered }) {
  return (
    <group>
      {/* Main flat body */}
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[1.6, 0.28, 1.0]} />
        <NodeMat color="#0a2420" emissive="#00ccaa" hovered={hovered} />
      </mesh>
      {/* Antenna left */}
      <mesh position={[-0.5, 0.72, -0.3]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.9, 8]} />
        <NodeMat color="#0a2420" emissive="#00ccaa" hovered={hovered} />
      </mesh>
      {/* Antenna right */}
      <mesh position={[0.5, 0.72, -0.3]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.9, 8]} />
        <NodeMat color="#0a2420" emissive="#00ccaa" hovered={hovered} />
      </mesh>
      {/* Port strip on front face */}
      <mesh position={[0, 0.18, 0.52]}>
        <boxGeometry args={[1.2, 0.1, 0.02]} />
        <meshStandardMaterial color="#001a18" emissive="#00ffcc" emissiveIntensity={hovered ? 3 : 1.5} />
      </mesh>
    </group>
  )
}

// ── Server ────────────────────────────────────────────────────────────────────
export function ServerMesh({ hovered }) {
  return (
    <group>
      {/* Rack chassis */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[1.2, 1.6, 0.8]} />
        <NodeMat color="#1a0a2e" emissive="#8800ff" hovered={hovered} />
      </mesh>
      {/* Drive bay rows (3 units) */}
      {[0.7, 0.9, 1.1].map((y, i) => (
        <mesh key={i} position={[0, y, 0.41]}>
          <boxGeometry args={[0.9, 0.12, 0.01]} />
          <meshStandardMaterial
            color="#0d0020"
            emissive="#aa44ff"
            emissiveIntensity={hovered ? 2.5 : 1.0}
          />
        </mesh>
      ))}
      {/* Status LED strip */}
      <mesh position={[0, 1.4, 0.41]}>
        <boxGeometry args={[0.7, 0.06, 0.01]} />
        <meshStandardMaterial color="#000" emissive="#00ffcc" emissiveIntensity={hovered ? 3 : 1.8} />
      </mesh>
    </group>
  )
}

// ── Unified export ────────────────────────────────────────────────────────────
export default function NodeFallbackMesh({ type, hovered }) {
  switch (type) {
    case 'router': return <RouterMesh hovered={hovered} />
    case 'server': return <ServerMesh hovered={hovered} />
    default:       return <PCMesh hovered={hovered} />
  }
}
