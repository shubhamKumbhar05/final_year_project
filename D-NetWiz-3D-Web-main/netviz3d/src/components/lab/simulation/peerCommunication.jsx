/**
 * Peer-to-Peer Communication Visualizer
 * Implements Phase 2: Shows logical layer-to-layer communication
 * Using ghost connections (horizontal dashed lines) to illustrate
 * that layers only interact with their equivalent peer layer
 */

import React from 'react'
import { Line, Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Creates a ghost connection between sender and receiver at the same layer
 * Represents the logical "peer-to-peer" communication between equivalent OSI layers
 */
export function GhostPeerConnection({
  senderPos = [-3, 0, 0],
  receiverPos = [3, 0, 0],
  layerId = 'network',
  isActive = false,
}) {
  const layerColors = {
    application: '#ef4444',
    presentation: '#facc15',
    session: '#a855f7',
    transport: '#f97316',
    network: '#22c55e',
    datalink: '#3b82f6',
    physical: '#f8fafc',
  }

  const color = new THREE.Color(layerColors[layerId] || '#999999')
  const dashSize = 0.1
  const gapSize = 0.1

  return (
    <group>
      {/* Dashed line representing peer connection */}
      <Line
        points={[senderPos, receiverPos]}
        color={color}
        lineWidth={2}
        segments={20}
        dashed={true}
        dashScale={5}
        dashSize={dashSize}
        gapSize={gapSize}
        opacity={isActive ? 0.8 : 0.4}
      />

      {/* Arrows at both ends indicating bidirectional communication */}
      {isActive && (
        <>
          {/* Sender arrow */}
          <group position={senderPos}>
            <Line
              points={[[0, 0, 0], [0.3, 0.1, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[0, 0, 0], [0.3, -0.1, 0]]}
              color={color}
              lineWidth={2}
            />
          </group>

          {/* Receiver arrow */}
          <group position={receiverPos}>
            <Line
              points={[[0, 0, 0], [-0.3, 0.1, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[0, 0, 0], [-0.3, -0.1, 0]]}
              color={color}
              lineWidth={2}
            />
          </group>
        </>
      )}

      {/* Label for the connection */}
      {isActive && (
        <Text
          position={[
            (senderPos[0] + receiverPos[0]) / 2,
            (senderPos[1] + receiverPos[1]) / 2 + 0.3,
            (senderPos[2] + receiverPos[2]) / 2,
          ]}
          fontSize={0.2}
          color={color}
          anchorX="center"
          anchorY="bottom"
        >
          Peer Communication
        </Text>
      )}
    </group>
  )
}

/**
 * Displays all ghost connections for a specific layer
 * Shows the horizontal peer-to-peer logical communication
 */
export function PeerCommunicationLayer({
  layer,
  senderPos = [-3, 0, 0],
  receiverPos = [3, 0, 0],
  isActive = false,
  position = [0, 0, 0],
}) {
  const layerHeights = {
    application: 3,
    presentation: 2.5,
    session: 2,
    transport: 1.5,
    network: 1,
    datalink: 0.5,
    physical: 0,
  }

  const height = layerHeights[layer] || 1

  return (
    <group position={position}>
      <GhostPeerConnection
        senderPos={[senderPos[0], senderPos[1] + height, senderPos[2]]}
        receiverPos={[receiverPos[0], receiverPos[1] + height, receiverPos[2]]}
        layerId={layer}
        isActive={isActive}
      />
    </group>
  )
}

/**
 * Complete peer communication stack
 * Shows all ghost connections for all layers simultaneously
 */
export function PeerCommunicationStack({
  senderPos = [-3, 0, 0],
  receiverPos = [3, 0, 0],
  activeLayer = null,
  showAll = false,
}) {
  const layers = ['application', 'presentation', 'session', 'transport', 'network', 'datalink', 'physical']

  return (
    <group>
      {layers.map((layer) => (
        <PeerCommunicationLayer
          key={layer}
          layer={layer}
          senderPos={senderPos}
          receiverPos={receiverPos}
          isActive={showAll || activeLayer === layer}
        />
      ))}
    </group>
  )
}

/**
 * Visualizes header stripping during decapsulation
 * Shows headers being "peeled off" layer by layer
 */
export function DeencapsulationVisualization({
  currentLayer,
  position = [0, 0, 0],
}) {
  const layerInfo = {
    physical: {
      action: 'Reassemble Bits → Frame',
      color: '#6b7280',
      message: 'Physical layer receives bitstream',
    },
    datalink: {
      action: 'Check MAC → Remove Header/Trailer',
      color: '#8b5cf6',
      message: 'Strip Ethernet Header (L2)',
    },
    network: {
      action: 'Check IP → Remove Header',
      color: '#22c55e',
      message: 'Strip IP Header (L3)',
    },
    transport: {
      action: 'Check Port/Seq → Reassemble Segments',
      color: '#60a5fa',
      message: 'Strip TCP/UDP Header (L4)',
    },
    session: {
      action: 'Validate Session',
      color: '#a855f7',
      message: 'Session Processing',
    },
    presentation: {
      action: 'Decode & Decompress',
      color: '#facc15',
      message: 'Presentation Processing',
    },
    application: {
      action: 'Deliver Data to App',
      color: '#ef4444',
      message: 'Data delivered to Application',
    },
  }

  const info = layerInfo[currentLayer]
  if (!info) return null

  const color = new THREE.Color(info.color)

  return (
    <group position={position}>
      {/* Main action text */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.3}
        color={info.color}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {info.action}
      </Text>

      {/* Detailed message */}
      <Text
        position={[0, -0.4, 0]}
        fontSize={0.2}
        color="#999999"
        anchorX="center"
        anchorY="top"
        maxWidth={3}
      >
        {info.message}
      </Text>
    </group>
  )
}

/**
 * Animation controller for showing layer interactions
 * Orchestrates the peer communication visualization
 */
export function LayerInteractionIndicator({
  sourceLayer,
  destinationLayer,
  isEncapsulation = true,
  position = [0, 0, 0],
}) {
  const layerPositions = {
    application: 0,
    presentation: 1,
    session: 2,
    transport: 3,
    network: 4,
    datalink: 5,
    physical: 6,
  }

  const sourceY = layerPositions[sourceLayer] * 0.5
  const destY = layerPositions[destinationLayer] * 0.5

  const direction = isEncapsulation ? '↓' : '↑'
  const actionText = isEncapsulation ? 'Encapsulating...' : 'Decapsulating...'

  return (
    <group position={position}>
      {/* Arrow showing direction of data flow */}
      <Text
        position={[0, sourceY - destY, 0]}
        fontSize={0.5}
        color="#999999"
        anchorX="center"
        anchorY="middle"
      >
        {direction}
      </Text>

      {/* Action label */}
      <Text
        position={[0.5, (sourceY + destY) / 2, 0]}
        fontSize={0.2}
        color="#666666"
        anchorX="left"
        anchorY="middle"
      >
        {actionText}
      </Text>
    </group>
  )
}

/**
 * Shows logical versus physical path
 * Illustrates that L3 only "sees" L3, L4 only "sees" L4, etc.
 */
export function LayerIsolationVisualization({
  allLayers = [
    'application',
    'presentation',
    'session',
    'transport',
    'network',
    'datalink',
    'physical',
  ],
  activeLayer = null,
  position = [0, 0, 0],
}) {
  const layerColors = {
    application: '#ef4444',
    presentation: '#facc15',
    session: '#a855f7',
    transport: '#f97316',
    network: '#22c55e',
    datalink: '#3b82f6',
    physical: '#f8fafc',
  }

  return (
    <group position={position}>
      {allLayers.map((layer, index) => {
        const isActive = activeLayer === layer
        const yPos = index * 0.6

        return (
          <group key={layer} position={[0, -yPos, 0]}>
            {/* Layer box */}
            <mesh>
              <boxGeometry args={[2, 0.5, 0.1]} />
              <meshStandardMaterial
                color={layerColors[layer]}
                emissive={isActive ? new THREE.Color(layerColors[layer]) : new THREE.Color('#000000')}
                emissiveIntensity={isActive ? 0.6 : 0.2}
              />
            </mesh>

            {/* Layer text */}
            <Text
              position={[0, 0, 0.1]}
              fontSize={0.2}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {layer}
            </Text>

            {/* Indicator showing layer isolation */}
            {isActive && (
              <group>
                {/* Left bracket */}
                <Line
                  points={[
                    [-1.1, -0.3, 0.15],
                    [-1.1, 0.3, 0.15],
                  ]}
                  color="#ffff00"
                  lineWidth={3}
                />
                {/* Right bracket */}
                <Line
                  points={[
                    [1.1, -0.3, 0.15],
                    [1.1, 0.3, 0.15],
                  ]}
                  color="#ffff00"
                  lineWidth={3}
                />
              </group>
            )}
          </group>
        )
      })}

      {/* Explanation text */}
      {activeLayer && (
        <Text
          position={[0, -5, 0]}
          fontSize={0.2}
          color="#999999"
          anchorX="center"
          anchorY="top"
          maxWidth={2}
        >
          Only peers at same layer can see each other's headers
        </Text>
      )}
    </group>
  )
}

export default {
  GhostPeerConnection,
  PeerCommunicationLayer,
  PeerCommunicationStack,
  DeencapsulationVisualization,
  LayerInteractionIndicator,
  LayerIsolationVisualization,
}
