import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useNetworkStore from '../../store/useNetworkStore'

// ── Colour palette per link type ─────────────────────────────────────────────
const LINK_COLOURS = {
  lan: { tube: '#002244', emissive: '#0066cc', pulse: '#00aaff' },
  wan: { tube: '#2a1800', emissive: '#cc7700', pulse: '#ffcc44' },
  dmz: { tube: '#2a0011', emissive: '#cc1133', pulse: '#ff5577' },
}

// ── Glowing orb that slides along the curve ──────────────────────────────────
function FlowPulse({ curve, color, offset, speed }) {
  const meshRef = useRef()
  const t = useRef(offset)

  useFrame((_, delta) => {
    t.current = (t.current + delta * speed) % 1
    const point = curve.getPoint(t.current)
    if (meshRef.current) meshRef.current.position.copy(point)
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.09, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={5}
        toneMapped={false}
      />
    </mesh>
  )
}

// ── Link ─────────────────────────────────────────────────────────────────────
export default function Link({ id, start, end, type = 'lan' }) {
  const hovered      = useNetworkStore((s) => s.hoveredLinkId === id)
  const setHovered   = useNetworkStore((s) => s.setHoveredLink)
  const clearHovered = useNetworkStore((s) => s.clearHoveredLink)

  const colours = LINK_COLOURS[type] ?? LINK_COLOURS.lan

  // Build curve + tube geometry; recompute only when positions change
  const { curve, geometry } = useMemo(() => {
    const s = new THREE.Vector3(start[0], start[1], start[2])
    const e = new THREE.Vector3(end[0],   end[1],   end[2])

    // Elevate the midpoint to create a natural cable arc
    const arcHeight = 1.0 + s.distanceTo(e) * 0.06
    const mid = new THREE.Vector3(
      (s.x + e.x) / 2,
      Math.max(s.y, e.y) + arcHeight,
      (s.z + e.z) / 2,
    )

    const curve = new THREE.CatmullRomCurve3([s, mid, e])
    const geometry = new THREE.TubeGeometry(curve, 48, 0.04, 8, false)
    return { curve, geometry }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start[0], start[1], start[2], end[0], end[1], end[2]])

  // Dispose geometry when component unmounts
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      {/* ── Cable tube ─────────────────────────────────────────────── */}
      <mesh
        geometry={geometry}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(id) }}
        onPointerOut={clearHovered}
      >
        <meshStandardMaterial
          color={colours.tube}
          emissive={colours.emissive}
          emissiveIntensity={hovered ? 2.5 : 0.7}
          metalness={0.5}
          roughness={0.35}
          transparent
          opacity={hovered ? 1.0 : 0.88}
        />
      </mesh>

      {/* ── Animated flow pulses (two offset so one is always visible) ─ */}
      <FlowPulse curve={curve} color={colours.pulse} offset={0.0}  speed={0.38} />
      <FlowPulse curve={curve} color={colours.pulse} offset={0.5}  speed={0.38} />
    </group>
  )
}
