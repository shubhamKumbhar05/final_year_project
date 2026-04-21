import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import IPv4HeaderStage from './IPv4HeaderStage'
import IPFragmentationStage from './IPFragmentationStage'

/**
 * Network Layer Visualization - Per-Concept Models
 * IPv4 Header | Fragmentation | TTL | Network/Host ID | Classful Addressing | Subnetting |
 * Supernetting | CIDR | VLSM | Forwarding Table | Routing Algorithm
 */

// IP Addressing Visualization
function IPAddressingViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.003
  })
  return (
    <group ref={groupRef}>
      {/* Nodes representing devices */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2
        return (
          <mesh key={`ip-node-${i}`} position={[Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0]}>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
          </mesh>
        )
      })}
      {/* Central switcher */}
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
      </mesh>
      {/* IP label glow ring */}
      <mesh>
        <torusGeometry args={[4, 0.1, 8, 100]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

// Subnetting Visualization
function SubnettingViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z += 0.002
  })
  return (
    <group ref={groupRef}>
      {/* Subnets visualization */}
      {[0, 1, 2].map((i) => (
        <group key={`subnet-${i}`} position={[(i - 1) * 3.5, 0, 0]}>
          {/* Subnet boundary */}
          <mesh>
            <boxGeometry args={[2.5, 3, 2.5]} />
            <meshStandardMaterial color="#06b6d4" transparent opacity={0.2} emissive="#0891b2" emissiveIntensity={0.4} />
          </mesh>
          {/* Devices in subnet */}
          {[0, 1].map((j) => (
            <mesh key={`device-${j}`} position={[(j - 0.5) * 0.8, (j - 0.5) * 1, 0]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// Routing Table Visualization
function RoutingTableViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.004
  })
  return (
    <group ref={groupRef}>
      {/* Router */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
      {/* Routing paths */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2
        return (
          <group key={`route-${i}`}>
            {/* Destination nodes */}
            <mesh position={[Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 0]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
            </mesh>
            {/* Path line */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([0, 0, 0, Math.cos(angle) * 4.5, Math.sin(angle) * 4.5, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#06b6d4" linewidth={2} />
            </line>
          </group>
        )
      })}
    </group>
  )
}

// Packet Animation Component for Forwarding
function ForwardingPacket() {
  const packetRef = useRef()
  const timeRef = useRef(0)

  useFrame(() => {
    timeRef.current += 0.016
    if (packetRef.current) {
      packetRef.current.position.x = Math.sin(timeRef.current * 0.002) * 4
    }
  })

  return (
    <mesh ref={packetRef} position={[0, 0.5, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
    </mesh>
  )
}

// Forwarding Visualization
function ForwardingViz() {
  const groupRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.002
  })
  return (
    <group ref={groupRef}>
      {/* Source router */}
      <mesh position={[-4, 0, 0]}>
        <boxGeometry args={[1.2, 1.8, 1.2]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
      {/* Intermediate routers */}
      {[0, 1].map((i) => (
        <mesh key={`router-${i}`} position={[-1.5 + i * 3, 0, 0]}>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* Destination router */}
      <mesh position={[4, 0, 0]}>
        <boxGeometry args={[1.2, 1.8, 1.2]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
      {/* Packet in transit */}
      <ForwardingPacket />
    </group>
  )
}

// Path Selection Visualization
function PathSelectionViz() {
  const groupRef = useRef()
  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.y += 0.003
  })
  return (
    <group ref={groupRef}>
      {/* Source */}
      <mesh position={[-5, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
      {/* Multiple paths - only shortest highlighted */}
      {[0, 1, 2].map((i) => {
        const isOptimal = i === 0
        return (
          <group key={`path-${i}`}>
            {/* Intermediate node */}
            <mesh position={[-2, (i - 1) * 2, 0]}>
              <boxGeometry args={[0.6, 0.6, 0.6]} />
              <meshStandardMaterial color={isOptimal ? '#10b981' : '#06b6d4'} emissive={isOptimal ? '#059669' : '#0891b2'} emissiveIntensity={isOptimal ? 0.9 : 0.5} />
            </mesh>
            {/* Path line */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([-5, 0, 0, -2, (i - 1) * 2, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isOptimal ? '#10b981' : '#06b6d4'} linewidth={isOptimal ? 3 : 1} />
            </line>
            {/* Final segment */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([-2, (i - 1) * 2, 0, 5, 0, 0])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color={isOptimal ? '#10b981' : '#06b6d4'} linewidth={isOptimal ? 3 : 1} />
            </line>
          </group>
        )
      })}
      {/* Destination */}
      <mesh position={[5, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

// TTL Visualization
function TTLViz() {
  const groupRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.003
  })
  return (
    <group ref={groupRef}>
      {/* Hops with decreasing TTL */}
      {[0, 1, 2, 3].map((i) => {
        const ttl = 64 - i * 16
        return (
          <group key={`ttl-${i}`} position={[(i - 1.5) * 3, 0, 0]}>
            {/* Router node */}
            <mesh>
              <sphereGeometry args={[0.7, 16, 16]} />
              <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
            </mesh>
            {/* TTL indicator rings */}
            {[0, 1].map((j) => (
              <mesh key={`ring-${j}`} rotation={[j === 0 ? Math.PI / 2 : 0, j === 0 ? 0 : Math.PI / 2, 0]}>
                <torusGeometry args={[1 + j * 0.3, 0.05, 8, 100]} />
                <meshStandardMaterial color={ttl > 32 ? '#10b981' : '#ef4444'} emissive={ttl > 32 ? '#059669' : '#dc2626'} emissiveIntensity={0.6} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* Packet traversing */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

// Single Dropped Packet Component
function DroppedPacket({ index, randomX }) {
  const meshRef = useRef()
  const timeRef = useRef(0)

  useFrame(() => {
    timeRef.current += 0.016
    if (meshRef.current) {
      const progress = (timeRef.current * 0.002 + index * 0.3) % 1
      meshRef.current.position.y = 1 + progress * 3
      meshRef.current.material.emissiveIntensity = 1 - progress
      meshRef.current.material.opacity = 1 - progress
    }
  })

  return (
    <mesh ref={meshRef} position={[randomX, 1, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1} transparent opacity={1} />
    </mesh>
  )
}

// Dropped Packets Component
function DroppedPackets() {
  // Initialize random positions using lazy initial state (runs only once)
  const [positions] = useState(() => [0, 1, 2].map(() => Math.random() * 2 - 1))

  return (
    <>
      {[0, 1, 2].map((i) => (
        <DroppedPacket key={`drop-${i}`} index={i} randomX={positions[i]} />
      ))}
    </>
  )
}

// Packet Drop Visualization
function PacketDropViz() {
  const groupRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.002
  })
  return (
    <group ref={groupRef}>
      {/* Source router */}
      <mesh position={[-4, 2, 0]}>
        <boxGeometry args={[1.2, 1.5, 1.2]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
      {/* Congested router */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.8, 2.2, 1.8]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.7} />
      </mesh>
      {/* Dropped packets fading away */}
      <DroppedPackets />
      {/* Destination router */}
      <mesh position={[4, -2, 0]}>
        <boxGeometry args={[1.2, 1.5, 1.2]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.7} />
      </mesh>
    </group>
  )
}

export default function NetworkLayerViz({ conceptId = 'net-ipv4-header', ipFragIsAttempting = false, ipFragDFEnabled = false, ipFragOutOfOrder = false, ipFragShowICMPError = false, isFragmentationAttempting = false, isDFEnabled = false, isFragmentationOutOfOrder = false, showICMPError = false }) {
  const _fragAttempting = ipFragIsAttempting || isFragmentationAttempting
  const _fragDFEnabled = ipFragDFEnabled || isDFEnabled
  const _fragOutOfOrder = ipFragOutOfOrder || isFragmentationOutOfOrder
  const _fragShowICMPError = ipFragShowICMPError || showICMPError

  switch (conceptId) {
    case 'net-ipv4-header':
      return <IPv4HeaderStage />
    case 'net-network-host-id':
      return <IPAddressingViz />
    case 'net-classful-addressing':
      return <PathSelectionViz />
    case 'net-subnetting':
      return <SubnettingViz />
    case 'net-supernetting':
      return <RoutingTableViz />
    case 'net-cidr':
      return <ForwardingViz />
    case 'net-vlsm':
      return <PathSelectionViz />
    case 'net-forwarding-table':
      return <RoutingTableViz />
    case 'net-routing-algorithm':
      return <PacketDropViz />
    default:
      return <IPAddressingViz />
  }
}
