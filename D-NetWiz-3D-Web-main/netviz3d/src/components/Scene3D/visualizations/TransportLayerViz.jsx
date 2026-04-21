import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Text } from '@react-three/drei'
import TCPConnectionViz from './TCPConnectionViz'
import SegmentationStage from './SegmentationStage'
import ACKViz from './ACKViz'
import FlowControlViz from './FlowControlViz'
import TcpUdpViz from './TcpUdpViz'
import MultiplexingDemultiplexingViz from './MultiplexingDemultiplexingViz'
import CongestionControlViz from './CongestionControlViz'

/**
 * Transport Layer Visualization - Per-Concept Models
 * Segmentation | TCP Connection | ACK | Retransmission | Flow Control | TCP vs UDP
 */

// TCP Connection Visualization is now imported from TCPConnectionViz.jsx
// See TCPConnectionViz component for Phase 1-5 implementation details

// ACK Mechanism Visualization is now imported from ACKViz.jsx
// See ACKViz component for STOP-AND-WAIT protocol implementation

// Retransmission Visualization
function RetransmissionViz() {
  const groupRef = useRef()
  const packetRef = useRef()
  const timeRef = useRef(0)
  useFrame(() => {
    timeRef.current += 0.016
    if (groupRef.current) groupRef.current.rotation.y += 0.002
    if (packetRef.current) {
      packetRef.current.position.x = Math.sin(timeRef.current * 0.002) * 2
    }
  })
  return (
    <group ref={groupRef}>
      {/* Sender */}
      <mesh position={[-3, 1.5, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
      </mesh>
      {/* Receiver */}
      <mesh position={[3, 1.5, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.7} />
      </mesh>
      {/* Timeout zone */}
      <mesh position={[0, -1, 0]}>
        <torusGeometry args={[2.5, 0.15, 8, 100]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Packet being resent */}
      <mesh ref={packetRef} position={[0, 1.5, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

// Flow Control Visualization is now imported from FlowControlViz.jsx

// TCP vs UDP Visualization is now imported from TcpUdpViz.jsx

export default function TransportLayerViz({ conceptId = 'trans-segmentation', triggerScenario, triggerClosing, onStateUpdate, segmentPhase, inOrderMode, ackIsRunning, onACKMessage, ackResetTrigger, packetLossEnabled, ackLossEnabled, flowControlIsRunning, onFlowControlMessage, flowControlResetTrigger, flowControlDrainSpeed, flowControlSimulateFullBuffer, flowControlClearBuffer, tcpUdpIsRunning, tcpUdpIsTCP, onTcpUdpMessage, tcpUdpResetTrigger, tcpUdpSimulateLoss, multiplexingIsRunning, onMultiplexingMessage, multiplexingResetTrigger, congestionCtrlIsRunning, onCongestionCtrlMessage, congestionCtrlResetTrigger, onCongestionCtrlStateUpdate, congestionCtrlNetworkCongestionTrigger }) {
  switch (conceptId) {
    case 'trans-segmentation':
      return <SegmentationStage externalPhase={segmentPhase} inOrderMode={inOrderMode} />
    case 'trans-tcp-conn':
      return <TCPConnectionViz triggerScenario={triggerScenario} triggerClosing={triggerClosing} onStateUpdate={onStateUpdate} />
    case 'trans-ack':
      return <ACKViz isRunning={ackIsRunning} onMessage={onACKMessage} resetTrigger={ackResetTrigger} packetLossEnabled={packetLossEnabled} ackLossEnabled={ackLossEnabled} />
    case 'trans-retrans':
      return <MultiplexingDemultiplexingViz isRunning={multiplexingIsRunning} onStatusUpdate={onMultiplexingMessage} resetTrigger={multiplexingResetTrigger} />
    case 'trans-flow-ctrl':
      return <FlowControlViz isRunning={flowControlIsRunning} onMessage={onFlowControlMessage} resetTrigger={flowControlResetTrigger} drainSpeed={flowControlDrainSpeed} simulateFullBuffer={flowControlSimulateFullBuffer} clearBuffer={flowControlClearBuffer} />
    case 'trans-tcp-vs-udp':
      return <TcpUdpViz isRunning={tcpUdpIsRunning} isTCP={tcpUdpIsTCP} onMessage={onTcpUdpMessage} resetTrigger={tcpUdpResetTrigger} simulateLoss={tcpUdpSimulateLoss} />
    case 'trans-congestion-ctrl':
      return <CongestionControlViz isRunning={congestionCtrlIsRunning} onMessage={onCongestionCtrlMessage} resetTrigger={congestionCtrlResetTrigger} onStateUpdate={onCongestionCtrlStateUpdate} congestionCtrlNetworkCongestionTrigger={congestionCtrlNetworkCongestionTrigger} />
    default:
      return <SegmentationStage inOrderMode={inOrderMode} />
  }
}
