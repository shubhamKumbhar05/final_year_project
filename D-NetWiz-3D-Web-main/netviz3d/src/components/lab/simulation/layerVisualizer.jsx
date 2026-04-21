/**
 * Layer Visualizer
 * Renders PDU hierarchy with proper nesting visualization
 * Shows encapsulation structure with color-coded headers and payloads
 */

import React from 'react'
import { Text, Box } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Visual representation of a single PDU at a specific layer
 * Shows header, payload nesting, and layer-specific information
 */
export function PDUBox({ pdu, position, scale = 1, isActive = false }) {
  if (!pdu) return null

  const width = 2 * scale
  const height = 1.5 * scale
  const depth = 0.1

  const boxColor = new THREE.Color(pdu.color || '#666666')

  return (
    <group position={position}>
      {/* Main PDU box */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={boxColor}
          emissive={isActive ? boxColor : new THREE.Color('#000000')}
          emissiveIntensity={isActive ? 0.5 : 0}
          wireframe={isActive}
        />
      </mesh>

      {/* Label text */}
      <Text
        position={[0, 0, depth / 2 + 0.01]}
        fontSize={0.3 * scale}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={width * 0.9}
      >
        {pdu.abbreviation}
      </Text>

      {/* PDU name */}
      <Text
        position={[0, -height / 2 - 0.3, 0]}
        fontSize={0.2 * scale}
        color={boxColor}
        anchorX="center"
        anchorY="top"
      >
        {pdu.name}
      </Text>
    </group>
  )
}

/**
 * Visualizes the complete encapsulation nesting hierarchy
 * Layers are stacked inside each other visually
 */
export function EncapsulationVisualizer({ packet, activeLayer, position = [0, 0, 0] }) {
  if (!packet) return null

  const layers = ['application', 'presentation', 'session', 'transport', 'network', 'datalink', 'physical']
  const layerBoxes = []

  // Create nested boxes for each layer
  let totalWidth = 0
  const boxSpacing = 0.05

  layers.forEach((layerId, index) => {
    const pduData = packet[layerId]
    if (!pduData) return

    const size = 2 - index * 0.3 // Decreasing size for nesting effect
    const yPos = (layers.length / 2 - index - 1) * (size + boxSpacing)
    const isActive = layerId === activeLayer

    layerBoxes.push(
      <group key={layerId} position={[position[0], position[1] + yPos, position[2] + index * 0.01]}>
        <PDUBox
          pdu={pduData}
          position={[0, 0, 0]}
          scale={size / 2}
          isActive={isActive}
        />
      </group>,
    )

    totalWidth = Math.max(totalWidth, size)
  })

  return <group>{layerBoxes}</group>
}

/**
 * Displays header information for current PDU
 * Shows all header fields specific to the layer
 */
export function HeaderInfoDisplay({ pdu, position = [0, 0, 0] }) {
  if (!pdu || !pdu.headers) return null

  const headerEntries = Object.entries(pdu.headers)
  const lineHeight = 0.25

  return (
    <group position={position}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color={pdu.color}
        anchorX="left"
        anchorY="top"
        maxWidth={3}
      >
        {pdu.name} Headers:
      </Text>

      {headerEntries.map(([key, value], index) => (
        <Text
          key={key}
          position={[0.2, -lineHeight * (index + 1), 0]}
          fontSize={0.2}
          color="#999999"
          anchorX="left"
          anchorY="top"
          maxWidth={2.8}
        >
          {`${key}: ${value}`}
        </Text>
      ))}
    </group>
  )
}

/**
 * AnimatedPDUTransition
 * Animates a PDU moving from sender to receiver,
 * showing encapsulation/decapsulation
 */
export function AnimatedPDUTransition({ fromPos, toPos, pdu, progress = 0 }) {
  if (!pdu) return null

  // Linear interpolation
  const currentPos = [
    fromPos[0] + (toPos[0] - fromPos[0]) * progress,
    fromPos[1] + (toPos[1] - fromPos[1]) * progress,
    fromPos[2] + (toPos[2] - fromPos[2]) * progress,
  ]

  // Scale effect during transition
  const scale = 0.8 + progress * 0.2

  return <PDUBox pdu={pdu} position={currentPos} scale={scale} isActive={true} />
}

/**
 * EncapsulationFlow visualizes the complete transformation
 * Shows data becoming segment, then packet, then frame, then bits
 */
export function EncapsulationFlow({ packets, currentLayer, position = [0, 0, 0] }) {
  const layerPositions = {
    application: [position[0] - 4, position[1] + 3, position[2]],
    presentation: [position[0] - 3, position[1] + 2.5, position[2]],
    session: [position[0] - 2, position[1] + 2, position[2]],
    transport: [position[0] - 1, position[1] + 1.5, position[2]],
    network: [position[0], position[1] + 1, position[2]],
    datalink: [position[0] + 1, position[1] + 0.5, position[2]],
    physical: [position[0] + 2, position[1], position[2]],
  }

  const pduElements = []

  Object.entries(layerPositions).forEach(([layer, pos]) => {
    const pdu = packets?.[`${layer}Data`] || packets?.[layer === 'transport' ? 'segment' : layer === 'network' ? 'packet' : layer === 'datalink' ? 'frame' : layer === 'physical' ? 'bits' : layer]

    if (pdu) {
      const isActive = layer === currentLayer
      pduElements.push(
        <group key={layer}>
          <PDUBox pdu={{ ...pdu, abbreviation: layer.substring(0, 3).toUpperCase() }} position={pos} scale={1} isActive={isActive} />
          {/* Connection line to next layer */}
          {layerPositions[Object.keys(layerPositions)[Object.keys(layerPositions).indexOf(layer) + 1]] && (
            <line
              points={[
                pos,
                layerPositions[Object.keys(layerPositions)[Object.keys(layerPositions).indexOf(layer) + 1]],
              ]}
            >
              <lineBasicMaterial color="#999999" linewidth={1} />
            </line>
          )}
        </group>,
      )
    }
  })

  return <group position={position}>{pduElements}</group>
}

/**
 * Port and Protocol Information Visualizer
 * Displays transport layer specifics like TCP/UDP ports
 */
export function TransportHeaderDisplay({ segment, position = [0, 0, 0] }) {
  if (!segment) return null

  return (
    <group position={position}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color="#60a5fa"
        anchorX="left"
        anchorY="top"
      >
        TCP/UDP Header (L4)
      </Text>

      <Text
        position={[0.2, -0.3, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Source Port: ${segment.sourcePort}`}
      </Text>

      <Text
        position={[0.2, -0.55, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Destination Port: ${segment.destinationPort}`}
      </Text>

      <Text
        position={[0.2, -0.8, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Sequence Number: ${segment.sequence}`}
      </Text>
    </group>
  )
}

/**
 * IP Address Information Visualizer
 * Displays network layer specifics
 */
export function NetworkHeaderDisplay({ packet, position = [0, 0, 0] }) {
  if (!packet) return null

  return (
    <group position={position}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color="#22c55e"
        anchorX="left"
        anchorY="top"
      >
        IP Header (L3)
      </Text>

      <Text
        position={[0.2, -0.3, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Source IP: ${packet.sourceIp}`}
      </Text>

      <Text
        position={[0.2, -0.55, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Destination IP: ${packet.destinationIp}`}
      </Text>

      <Text
        position={[0.2, -0.8, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`TTL: ${packet.ttl}`}
      </Text>
    </group>
  )
}

/**
 * MAC Address Information Visualizer
 * Displays data link layer specifics
 */
export function DataLinkHeaderDisplay({ frame, position = [0, 0, 0] }) {
  if (!frame) return null

  return (
    <group position={position}>
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color="#8b5cf6"
        anchorX="left"
        anchorY="top"
      >
        Ethernet Header (L2)
      </Text>

      <Text
        position={[0.2, -0.3, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Source MAC: ${frame.sourceMac}`}
      </Text>

      <Text
        position={[0.2, -0.55, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`Destination MAC: ${frame.destinationMac}`}
      </Text>

      <Text
        position={[0.2, -0.8, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="left"
        anchorY="top"
      >
        {`EtherType: ${frame.etherType}`}
      </Text>

      {frame.fcs && (
        <Text
          position={[0.2, -1.05, 0]}
          fontSize={0.2}
          color="#999999"
          anchorX="left"
          anchorY="top"
        >
          {`FCS: ${frame.fcs}`}
        </Text>
      )}
    </group>
  )
}

export default {
  PDUBox,
  EncapsulationVisualizer,
  HeaderInfoDisplay,
  AnimatedPDUTransition,
  EncapsulationFlow,
  TransportHeaderDisplay,
  NetworkHeaderDisplay,
  DataLinkHeaderDisplay,
}
