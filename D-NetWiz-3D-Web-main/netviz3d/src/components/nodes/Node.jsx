import { useRef, useState, Component } from 'react'
import { Text, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import NodeFallbackMesh from './NodeFallbackMesh'
import useNetworkStore from '../../store/useNetworkStore'

// ── Colour map per node type ──────────────────────────────────────────────────
const TYPE_COLOURS = {
  pc:     { label: '#00aaff', ring: '#0088cc' },
  router: { label: '#00ffcc', ring: '#00ccaa' },
  server: { label: '#cc88ff', ring: '#8800ff' },
}

// ── ErrorBoundary – catches GLTF 404 and renders fallback geometry ───────────
class ModelErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ── GLTF model loader (only rendered inside Suspense + ErrorBoundary) ────────
function NodeGLTF({ type }) {
  const { scene } = useGLTF(`/models/${type}.glb`)
  return <primitive object={scene.clone()} scale={1} />
}

// ── Selection ring that pulses at the node base ──────────────────────────────
function SelectionRing({ color }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.12
      ref.current.scale.set(s, s, s)
    }
  })

  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.1, 1.3, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Main Node component ──────────────────────────────────────────────────────
export default function Node({ id, type, position, ip, hostname }) {
  const groupRef = useRef()
  const [hovered, setHovered] = useState(false)
  const selectedNodeId = useNetworkStore((s) => s.selectedNodeId)
  const selectNode = useNetworkStore((s) => s.selectNode)
  const isSelected = selectedNodeId === id
  const colours = TYPE_COLOURS[type] || TYPE_COLOURS.pc

  // Smooth scale interpolation on hover
  useFrame(() => {
    if (groupRef.current) {
      const target = hovered || isSelected ? 1.08 : 1.0
      groupRef.current.scale.lerp(
        { x: target, y: target, z: target },
        0.1,
      )
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        selectNode(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {/* ── 3D Model (GLTF → fallback) ─────────────────────────────── */}
      <ModelErrorBoundary fallback={<NodeFallbackMesh type={type} hovered={hovered || isSelected} />}>
        <NodeGLTF type={type} />
      </ModelErrorBoundary>

      {/* ── IP Address label ───────────────────────────────────────── */}
      <Text
        position={[0, 2.1, 0]}
        fontSize={0.28}
        color={colours.label}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.015}
        outlineColor="#000000"
        font={undefined}
      >
        {ip}
      </Text>

      {/* ── Hostname label ─────────────────────────────────────────── */}
      <Text
        position={[0, 1.75, 0]}
        fontSize={0.2}
        color="#8899aa"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.012}
        outlineColor="#000000"
        font={undefined}
      >
        {hostname}
      </Text>

      {/* ── Selection ring ─────────────────────────────────────────── */}
      {isSelected && <SelectionRing color={colours.ring} />}
    </group>
  )
}
