/**
 * Nested Encapsulation Stack - 3D Visualization
 * Shows proper nesting: Segment inside Packet inside Frame
 * With live header metadata display
 */

import React from 'react'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Layer 4 - Transport Segment (innermost)
 */
export function TransportSegment({ segment, position = [0, 0, 0], isActive = false }) {
  const width = 1
  const height = 0.8
  const depth = 0.5

  return (
    <group position={position}>
      {/* Segment box - Blue */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive={isActive ? new THREE.Color('#60a5fa') : new THREE.Color('#000000')}
          emissiveIntensity={isActive ? 0.8 : 0}
          metalness={0.3}
          roughness={0.7}
          wireframe={isActive}
        />
      </mesh>

      {/* Segment label */}
      <Text
        position={[0, 0, depth / 2 + 0.05]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={width * 0.9}
      >
        SEGMENT (L4)
      </Text>

      {/* Header info */}
      <group position={[0, -height / 2 - 0.3, 0]}>
        <Text
          position={[0, 0, 0]}
          fontSize={0.12}
          color="#60a5fa"
          anchorX="center"
          anchorY="top"
        >
          TCP/UDP
        </Text>
        <Text
          position={[0, -0.15, 0]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="top"
        >
          {`Port: ${segment?.sourcePort || 0}→${segment?.destinationPort || 0}`}
        </Text>
        <Text
          position={[0, -0.27, 0]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="center"
          anchorY="top"
        >
          {`Seq: ${segment?.sequenceNumber || 0}`}
        </Text>
      </group>

      {/* Payload indicator */}
      <Html position={[width / 2 + 0.2, 0, 0]} scale={0.5}>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #60a5fa',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#60a5fa',
            whiteSpace: 'nowrap',
          }}
        >
          Payload: {segment?.length || 0}B
        </div>
      </Html>
    </group>
  )
}

/**
 * Layer 3 - Network Packet (contains Segment)
 */
export function NetworkPacket({ packet, segment, position = [0, 0, 0], isActive = false }) {
  const width = 1.6
  const height = 1.4
  const depth = 0.9

  return (
    <group position={position}>
      {/* Outer packet shell - Green */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive={isActive ? new THREE.Color('#22c55e') : new THREE.Color('#000000')}
          emissiveIntensity={isActive ? 0.5 : 0}
          transparent={true}
          opacity={0.4}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Packet wireframe edges */}
      <lineSegments>
        <BufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={8}
            array={new Float32Array([
              -width / 2, -height / 2, -depth / 2,
              width / 2, -height / 2, -depth / 2,
              width / 2, height / 2, -depth / 2,
              -width / 2, height / 2, -depth / 2,
              -width / 2, -height / 2, depth / 2,
              width / 2, -height / 2, depth / 2,
              width / 2, height / 2, depth / 2,
              -width / 2, height / 2, depth / 2,
            ])}
            itemSize={3}
          />
        </BufferGeometry>
        <lineBasicMaterial color="#22c55e" linewidth={2} />
      </lineSegments>

      {/* Nested Segment inside Packet */}
      <TransportSegment segment={segment} position={[0, 0, 0]} isActive={isActive} />

      {/* Packet label */}
      <Text
        position={[0, height / 2 + 0.2, 0]}
        fontSize={0.3}
        color="#22c55e"
        anchorX="center"
        anchorY="bottom"
      >
        PACKET (L3)
      </Text>

      {/* Header info - IP */}
      <group position={[-width / 2 - 0.3, 0, 0]}>
        <Text
          position={[0, 0.15, 0]}
          fontSize={0.12}
          color="#22c55e"
          anchorX="right"
          anchorY="middle"
        >
          IP Header
        </Text>
        <Text
          position={[0, 0, 0]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="right"
          anchorY="middle"
        >
          {`Src: ${packet?.sourceIP || '0.0.0.0'}`}
        </Text>
        <Text
          position={[0, -0.12, 0]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="right"
          anchorY="middle"
        >
          {`Dst: ${packet?.destinationIP || '0.0.0.0'}`}
        </Text>
        <Text
          position={[0, -0.24, 0]}
          fontSize={0.1}
          color="#94a3b8"
          anchorX="right"
          anchorY="middle"
        >
          {`TTL: ${packet?.ttl || 64}`}
        </Text>
      </group>
    </group>
  )
}

/**
 * Layer 2 - Data Link Frame (contains Packet)
 */
export function DataLinkFrame({ frame, packet, segment, position = [0, 0, 0], isActive = false }) {
  const width = 2.2
  const height = 1.9
  const depth = 1.3

  return (
    <group position={position}>
      {/* Outer frame shell - Purple */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive={isActive ? new THREE.Color('#8b5cf6') : new THREE.Color('#000000')}
          emissiveIntensity={isActive ? 0.3 : 0}
          transparent={true}
          opacity={0.25}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>

      {/* Frame edges with pattern */}
      <lineSegments>
        <BufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={8}
            array={new Float32Array([
              -width / 2, -height / 2, -depth / 2,
              width / 2, -height / 2, -depth / 2,
              width / 2, height / 2, -depth / 2,
              -width / 2, height / 2, -depth / 2,
              -width / 2, -height / 2, depth / 2,
              width / 2, -height / 2, depth / 2,
              width / 2, height / 2, depth / 2,
              -width / 2, height / 2, depth / 2,
            ])}
            itemSize={3}
          />
        </BufferGeometry>
        <lineBasicMaterial color="#8b5cf6" linewidth={3} />
      </lineSegments>

      {/* Nested Packet (with Segment inside) */}
      <NetworkPacket packet={packet} segment={segment} position={[0, 0, 0]} isActive={isActive} />

      {/* Frame label */}
      <Text
        position={[0, height / 2 + 0.35, 0]}
        fontSize={0.35}
        color="#8b5cf6"
        anchorX="center"
        anchorY="bottom"
        fontWeight="bold"
      >
        FRAME (L2)
      </Text>

      {/* Header info - MAC */}
      <group position={[width / 2 + 0.4, 0.35, 0]}>
        <Text
          position={[0, 0.2, 0]}
          fontSize={0.12}
          color="#8b5cf6"
          anchorX="left"
          anchorY="middle"
        >
          Frame Header
        </Text>
        <Text
          position={[0, 0.05, 0]}
          fontSize={0.09}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          {`Src MAC: ${frame?.srcMac || 'AA:BB:CC:DD:EE:FF'}`}
        </Text>
        <Text
          position={[0, -0.08, 0]}
          fontSize={0.09}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          {`Dst MAC: ${frame?.dstMac || '11:22:33:44:55:66'}`}
        </Text>
      </group>

      {/* Trailer info - FCS */}
      <group position={[width / 2 + 0.4, -0.35, 0]}>
        <Text
          position={[0, 0.1, 0]}
          fontSize={0.12}
          color="#8b5cf6"
          anchorX="left"
          anchorY="middle"
        >
          Frame Trailer (FCS)
        </Text>
        <Text
          position={[0, -0.08, 0]}
          fontSize={0.09}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          {`CRC32: ${frame?.crc32 || '00000000'}`}
        </Text>
      </group>

      {/* Size indicator */}
      <Html position={[0, -height / 2 - 0.4, 0]} scale={0.5}>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #8b5cf6',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#8b5cf6',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Total Frame Size
          <br />
          {frame?.totalSize || 0} bytes
        </div>
      </Html>
    </group>
  )
}

/**
 * Complete nested encapsulation stack
 * Shows all three layers at once
 */
export function NestedEncapsulationStack({
  protocolData,
  activeLayer = 'datalink',
  position = [0, 0, 0],
}) {
  if (!protocolData) return null

  const { layers } = protocolData
  const frame = {
    srcMac: layers.datalink.srcMac,
    dstMac: layers.datalink.dstMac,
    crc32: layers.datalink.crc32,
    totalSize: protocolData.summary.bytes.totalFrame,
  }

  const packet = {
    sourceIP: layers.network.sourceIP,
    destinationIP: layers.network.destinationIP,
    ttl: layers.network.routingDecision.includes('LOCAL') ? 64 : 64,
  }

  const segment = layers.transport.segments[0] // First segment
  segment.sourcePort = layers.transport.segments[0].sourcePort
  segment.destinationPort = layers.transport.segments[0].destinationPort

  return (
    <group position={position}>
      {/* Main nested structure */}
      <DataLinkFrame
        frame={frame}
        packet={packet}
        segment={segment}
        position={[0, 0, 0]}
        isActive={activeLayer === 'datalink'}
      />

      {/* Labels below the stack */}
      <Html position={[0, -2.5, 0]} scale={1}>
        <div
          style={{
            textAlign: 'center',
            color: '#e2e8f0',
            fontSize: '12px',
          }}
        >
          <div style={{ marginBottom: '4px', color: '#8b5cf6' }}>
            L2: Frame contains Packet
          </div>
          <div style={{ marginBottom: '4px', color: '#22c55e' }}>
            L3: Packet contains Segment
          </div>
          <div style={{ color: '#60a5fa' }}>
            L4: Segment contains Payload
          </div>
        </div>
      </Html>
    </group>
  )
}

/**
 * Simplified version for showing multiple layers side by side
 */
export function EncapsulationComparison({ protocolData, position = [0, 0, 0] }) {
  if (!protocolData) return null

  const layers = protocolData.layers
  const layerSpacing = 2.5

  return (
    <group position={position}>
      {/* Frame (L2) */}
      <group position={[-layerSpacing, 0, 0]}>
        <Text position={[0, 1.5, 0]} fontSize={0.25} color="#8b5cf6">
          L2: FRAME
        </Text>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 1.5, 0.8]} />
          <meshStandardMaterial color="#8b5cf6" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0, 0.5]} fontSize={0.12} color="#ffffff" anchorX="center">
          {`MAC: ${layers.datalink.srcMac?.substring(0, 8)}...`}
        </Text>
      </group>

      {/* Packet (L3) */}
      <group position={[0, 0, 0]}>
        <Text position={[0, 1.5, 0]} fontSize={0.25} color="#22c55e">
          L3: PACKET
        </Text>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 1.5, 0.8]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0, 0.5]} fontSize={0.12} color="#ffffff" anchorX="center">
          {`IP: ${layers.network.sourceIP}`}
        </Text>
      </group>

      {/* Segment (L4) */}
      <group position={[layerSpacing, 0, 0]}>
        <Text position={[0, 1.5, 0]} fontSize={0.25} color="#60a5fa">
          L4: SEGMENT
        </Text>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 1.5, 0.8]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.5} />
        </mesh>
        <Text position={[0, 0, 0.5]} fontSize={0.12} color="#ffffff" anchorX="center">
          {`Port: ${layers.transport.segments[0]?.sourcePort}`}
        </Text>
      </group>

      {/* Arrows showing containment */}
      {/* L2 -> L3 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              -layerSpacing + 1.2, -0.2, 0,
              -0.9, -0.2, 0,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#aaa" linewidth={2} />
      </lineSegments>

      {/* L3 -> L4 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              1.2, -0.2, 0,
              layerSpacing - 1.2, -0.2, 0,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#aaa" linewidth={2} />
      </lineSegments>

      {/* Containment labels */}
      <Text position={[-layerSpacing / 2, -0.6, 0]} fontSize={0.15} color="#888">
        contains
      </Text>
      <Text position={[layerSpacing / 2, -0.6, 0]} fontSize={0.15} color="#888">
        contains
      </Text>
    </group>
  )
}

export default {
  NestedEncapsulationStack,
  TransportSegment,
  NetworkPacket,
  DataLinkFrame,
  EncapsulationComparison,
}
