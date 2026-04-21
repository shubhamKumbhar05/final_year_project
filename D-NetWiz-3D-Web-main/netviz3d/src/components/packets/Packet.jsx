import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import useNetworkStore from '../../store/useNetworkStore'

/*
 * A single in-flight packet.
 *
 * Pattern:
 *   • GSAP tweens a plain proxy object  { t: 0 → 1 }
 *   • useFrame reads proxy.t each tick  → curve.getPoint(t) → mesh position
 *   • On tween complete: quick burst scale → removePacket cleans up the store
 *
 * This keeps all animation off the React render cycle for maximum perf.
 */
export default function Packet({ id, fromPos, toPos, color = '#00ffcc' }) {
  const meshRef  = useRef()   // the whole packet group
  const lightRef = useRef()
  const proxy    = useRef({ t: 0 })

  const removePacket = useNetworkStore((s) => s.removePacket)

  // Build the arc curve once
  const curve = useMemo(() => {
    const s = new THREE.Vector3(fromPos[0], fromPos[1], fromPos[2])
    const e = new THREE.Vector3(toPos[0],   toPos[1],   toPos[2])
    const arcHeight = 1.4 + s.distanceTo(e) * 0.07
    const mid = new THREE.Vector3(
      (s.x + e.x) / 2,
      Math.max(s.y, e.y) + arcHeight,
      (s.z + e.z) / 2,
    )
    return new THREE.CatmullRomCurve3([s, mid, e])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromPos[0], fromPos[1], fromPos[2], toPos[0], toPos[1], toPos[2]])

  // GSAP travel tween – mount only
  useEffect(() => {
    const p = proxy.current

    const tween = gsap.to(p, {
      t: 1,
      duration: 2.5,
      ease: 'power1.inOut',
      onComplete: () => {
        // Burst on arrival
        if (meshRef.current) {
          gsap.to(meshRef.current.scale, {
            x: 3, y: 3, z: 3,
            duration: 0.15,
            ease: 'power2.out',
            onComplete: () => removePacket(id),
          })
        } else {
          removePacket(id)
        }
      },
    })

    return () => {
      gsap.killTweensOf(p)
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Every frame: move mesh + light along the curve
  useFrame(() => {
    const point = curve.getPoint(Math.min(proxy.current.t, 1))
    meshRef.current?.position.copy(point)
    lightRef.current?.position.copy(point)
  })

  return (
    <>
      {/* Group moves both meshes together via one ref */}
      <group ref={meshRef}>
        {/* Outer glow shell */}
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={5}
            toneMapped={false}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Inner bright white core */}
        <mesh>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={8}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Travelling point light for scene illumination */}
      <pointLight
        ref={lightRef}
        color={color}
        intensity={3}
        distance={5}
        decay={2}
      />
    </>
  )
}
