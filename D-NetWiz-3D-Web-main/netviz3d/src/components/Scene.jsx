import { useRef, Suspense } from 'react'
import { OrbitControls, Grid, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import Node from './nodes/Node'
import NetworkLinks from './links/NetworkLinks'
import PacketManager from './packets/PacketManager'
import useNetworkStore from '../store/useNetworkStore'

// Slowly pulsing point light to give the grid a "breathing" tech look
function PulsingLight() {
  const lightRef = useRef()

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.getElapsedTime()
      lightRef.current.intensity = 1.2 + Math.sin(t * 0.8) * 0.4
    }
  })

  return (
    <pointLight
      ref={lightRef}
      position={[0, 8, 0]}
      color="#00ffcc"
      intensity={1.2}
      distance={40}
      decay={2}
    />
  )
}

// Renders all network nodes from the store
function NetworkNodes() {
  const nodes = useNetworkStore((s) => s.nodes)

  return (
    <>
      {nodes.map((node) => (
        <Suspense key={node.id} fallback={null}>
          <Node
            id={node.id}
            type={node.type}
            position={node.position}
            ip={node.ip}
            hostname={node.hostname}
          />
        </Suspense>
      ))}
    </>
  )
}

export default function Scene() {
  return (
    <>
      {/* ── Lights ─────────────────────────────────────────────────── */}
      <ambientLight color="#0a1628" intensity={2} />
      <PulsingLight />

      {/* Accent lights for depth */}
      <pointLight position={[-12, 6, -12]} color="#0055ff" intensity={0.8} distance={30} />
      <pointLight position={[12, 6, 12]} color="#00ffcc" intensity={0.6} distance={25} />

      {/* ── Background Stars ───────────────────────────────────────── */}
      <Stars
        radius={80}
        depth={50}
        count={3000}
        factor={3}
        saturation={0.5}
        fade
        speed={0.4}
      />

      {/* ── Infinite grid (Drei helper) ──────────────────────────── */}
      <Grid
        position={[0, -0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#0a3d62"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#00aaff"
        fadeDistance={60}
        fadeStrength={1.5}
        infiniteGrid
      />

      {/* ── Network Links (cables) ────────────────────────────────── */}
      <NetworkLinks />

      {/* ── In-flight Packets ─────────────────────────────────────── */}
      <PacketManager />

      {/* ── Network Nodes ─────────────────────────────────────────── */}
      <NetworkNodes />

      {/* ── Camera Controls ───────────────────────────────────────── */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={4}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  )
}
