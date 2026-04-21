/**
 * OSI Animation Controller
 * Orchestrates the three phases of logically perfect OSI animation:
 * 1. ENCAPSULATION (Phase 1) - Data flows down with proper PDU wrapping
 * 2. PEER COMMUNICATION (Phase 2) - Logical layer-to-layer communication
 * 3. DECAPSULATION (Phase 3) - Receiver "unwraps" headers
 */

import {
  PDU_LAYER_CONFIG,
  ENCAPSULATION_ANIMATION_SEQUENCE,
  DECAPSULATION_ANIMATION_SEQUENCE,
} from './pduEncapsulation'

/**
 * Animation step generator for complete OSI animation
 * Creates detailed steps for each phase with proper timing and visual cues
 */
export function generateCompleteOSIAnimationSteps({
  sourceNode,
  destinationNode,
  input,
  errorToggles = {},
}) {
  const steps = []
  let stepId = 0

  // ===================== PHASE 1: ENCAPSULATION =====================
  const encapsulationPhase = {
    phase: 'encapsulation',
    title: 'Phase 1: Encapsulation',
    description: 'Data flows downward through layers, wrapping into PDUs',
    steps: [],
  }

  // App → Session: Data remains as Data
  ;['application', 'presentation', 'session'].forEach((layer) => {
    const config = PDU_LAYER_CONFIG[layer]
    const seq = ENCAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === layer)

    encapsulationPhase.steps.push({
      id: stepId++,
      type: 'encapsulation',
      phase: 'phase1',
      layer,
      layerId: layer,
      title: seq.description,
      description: `${config.name} block remains as ${config.name}. Preparing for transport.`,
      pduType: 'Data',
      pduColor: config.color,
      action: 'Prepare',
      duration: seq.duration,
      visualization: {
        showDataBlock: true,
        position: 'upper',
        animation: 'fadeIn',
      },
    })
  })

  // Transport: Data becomes Segment (wrapping with blue header)
  const transportSeq = ENCAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'transport')
  encapsulationPhase.steps.push({
    id: stepId++,
    type: 'encapsulation',
    phase: 'phase1',
    layer: 'transport',
    layerId: 'transport',
    title: transportSeq.description,
    description: `Blue TCP/UDP Header wraps Data → SEGMENT PDU. Shows Src/Dest Ports.`,
    pduType: 'Segment',
    pduColor: PDU_LAYER_CONFIG.transport.color,
    headers: {
      protocol: input.protocol || 'TCP',
      srcPort: input.port || 49152,
      dstPort: 80,
      seqNum: 1001,
        ackNum: 0,
    },
    action: 'Segment (L4)',
    duration: transportSeq.duration,
    visualization: {
      showHeaderWrap: true,
      headerColor: '#60a5fa',
      payloadColor: '#fbbf24',
      nesting: 'Data inside Header',
    },
  })

  // Network: Segment becomes Packet (wrapping with green header)
  const networkSeq = ENCAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'network')
  encapsulationPhase.steps.push({
    id: stepId++,
    type: 'encapsulation',
    phase: 'phase1',
    layer: 'network',
    layerId: 'network',
    title: networkSeq.description,
    description: `Green IP Header wraps Segment → PACKET PDU. Shows Src/Dest IPs.`,
    pduType: 'Packet',
    pduColor: PDU_LAYER_CONFIG.network.color,
    headers: {
      srcIP: sourceNode?.config?.ipAddress || '192.168.1.1',
      dstIP: destinationNode?.config?.ipAddress || '192.168.1.2',
      ttl: 64,
      protocol: 'TCP',
    },
    action: 'Packetize (L3)',
    duration: networkSeq.duration,
    visualization: {
      showHeaderWrap: true,
      headerColor: '#22c55e',
      payloadColor: '#60a5fa',
      nesting: 'Segment inside Header',
    },
  })

  // Data Link: Packet becomes Frame (wrapping with purple header+trailer)
  const datalinkSeq = ENCAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'datalink')
  encapsulationPhase.steps.push({
    id: stepId++,
    type: 'encapsulation',
    phase: 'phase1',
    layer: 'datalink',
    layerId: 'datalink',
    title: datalinkSeq.description,
    description: `Purple Ethernet Header+Trailer wrap Packet → FRAME PDU. Shows Src/Dest MACs.`,
    pduType: 'Frame',
    pduColor: PDU_LAYER_CONFIG.datalink.color,
    headers: {
      srcMAC: sourceNode?.config?.macAddress || 'AA:BB:CC:DD:EE:FF',
      dstMAC: destinationNode?.config?.macAddress || '11:22:33:44:55:66',
      etherType: '0x0800',
    },
    trailer: {
      fcs: 'CRC32',
    },
    action: 'Frame (L2)',
    duration: datalinkSeq.duration,
    visualization: {
      showHeaderTrailerWrap: true,
      headerColor: '#8b5cf6',
      trailerColor: '#8b5cf6',
      payloadColor: '#22c55e',
      nesting: 'Packet inside Header+Trailer',
    },
  })

  // Physical: Frame becomes Bitstream (converted to binary)
  const physicalSeq = ENCAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'physical')
  encapsulationPhase.steps.push({
    id: stepId++,
    type: 'encapsulation',
    phase: 'phase1',
    layer: 'physical',
    layerId: 'physical',
    title: physicalSeq.description,
    description: `Frame converted to 1s and 0s. Bitstream ready for transmission.`,
    pduType: 'Bitstream',
    pduColor: PDU_LAYER_CONFIG.physical.color,
    action: 'Transmit (L1)',
    duration: physicalSeq.duration,
    visualization: {
      showBitstream: true,
      bitCount: 1500 * 8,
      animateBits: true,
    },
  })

  // ===================== PHASE 2: PEER COMMUNICATION =====================
  const peerPhase = {
    phase: 'peer-communication',
    title: 'Phase 2: Peer-to-Peer Communication',
    description: 'Logical layer-to-layer communication via ghost connections',
    steps: [],
  }

  // Show each layer peer connection
  ;['application', 'presentation', 'session', 'transport', 'network', 'datalink', 'physical'].forEach((layer) => {
    peerPhase.steps.push({
      id: stepId++,
      type: 'peer-communication',
      phase: 'phase2',
      layer,
      layerId: layer,
      title: `Layer ${layer} Peer Communication`,
      description: `L${layer} at sender "speaks" only with L${layer} at receiver. Ghost connection established.`,
      peerType: 'logical',
      visualization: {
        ghostConnection: true,
        connectionStyle: 'dashed',
        color: PDU_LAYER_CONFIG[layer].color,
        connectionLabel: `L${layer} ↔ L${layer}`,
      },
      duration: 800,
    })
  })

  // ===================== PHASE 3: DECAPSULATION =====================
  const decapsulationPhase = {
    phase: 'decapsulation',
    title: 'Phase 3: Decapsulation',
    description: 'Receiver strips headers layer by layer to reveal original data',
    steps: [],
  }

  // Physical → Data Link: Bitstream to Frame
  const physicalDeseq = DECAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'physical')
  decapsulationPhase.steps.push({
    id: stepId++,
    type: 'decapsulation',
    phase: 'phase3',
    layer: 'physical',
    layerId: 'physical',
    title: physicalDeseq.description,
    description: `Bitstream received on physical medium. Reassemble to Frame.`,
    pduType: 'Bitstream',
    pduColor: PDU_LAYER_CONFIG.physical.color,
    action: 'Receive (L1)',
    duration: physicalDeseq.duration,
    visualization: {
      showBitstream: true,
      assembled: false,
    },
  })

  // Data Link: Strip header/trailer
  const datalinkDeseq = DECAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'datalink')
  decapsulationPhase.steps.push({
    id: stepId++,
    type: 'decapsulation',
    phase: 'phase3',
    layer: 'datalink',
    layerId: 'datalink',
    title: datalinkDeseq.description,
    description: `MAC address valid ✓. Peel Purple Header/Trailer → Packet revealed.`,
    pduType: 'Frame',
    pduColor: PDU_LAYER_CONFIG.datalink.color,
    action: 'Check MAC & Strip (L2)',
    duration: datalinkDeseq.duration,
    visualization: {
      stripHeader: true,
      stripTrailer: true,
      notifyIfMismatch: true,
    },
  })

  // Network: Strip IP header
  const networkDeseq = DECAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'network')
  decapsulationPhase.steps.push({
    id: stepId++,
    type: 'decapsulation',
    phase: 'phase3',
    layer: 'network',
    layerId: 'network',
    title: networkDeseq.description,
    description: `IP address matches ✓. Peel Green Header → Segment revealed.`,
    pduType: 'Packet',
    pduColor: PDU_LAYER_CONFIG.network.color,
    action: 'Check IP & Strip (L3)',
    duration: networkDeseq.duration,
    visualization: {
      stripHeader: true,
      notifyIfMismatch: true,
    },
  })

  // Transport: Strip TCP/UDP header and reassemble segments
  const transportDeseq = DECAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === 'transport')
  decapsulationPhase.steps.push({
    id: stepId++,
    type: 'decapsulation',
    phase: 'phase3',
    layer: 'transport',
    layerId: 'transport',
    title: transportDeseq.description,
    description: `Ports & Sequence valid ✓. Peel Blue Header → Segments reassemble to original Data.`,
    pduType: 'Segment',
    pduColor: PDU_LAYER_CONFIG.transport.color,
    action: 'Check Ports/Seq & Reassemble (L4)',
    duration: transportDeseq.duration,
    visualization: {
      stripHeader: true,
      reassembleSegments: true,
      notifyIfMismatch: true,
    },
  })

  // Session → Application: Data block delivered
  ;['session', 'presentation', 'application'].forEach((layer, idx) => {
    const seqData = DECAPSULATION_ANIMATION_SEQUENCE.find((s) => s.layer === layer)
    decapsulationPhase.steps.push({
      id: stepId++,
      type: 'decapsulation',
      phase: 'phase3',
      layer,
      layerId: layer,
      title: seqData.description,
      description: `${layer === 'application' ? 'Original Data Block delivered to Application in perfect form!' : `${layer} processing complete.`}`,
      pduType: 'Data',
      pduColor: PDU_LAYER_CONFIG[layer].color,
      action: layer === 'application' ? 'Deliver to App' : `Process (L${7 - idx})`,
      duration: seqData.duration,
      visualization: {
        showDataBlock: idx === 2,
        animation: idx === 2 ? 'success' : 'fadeIn',
      },
    })
  })

  return {
    phases: [encapsulationPhase, peerPhase, decapsulationPhase],
    totalSteps: stepId,
    sourceNode,
    destinationNode,
    errorToggles,
  }
}

/**
 * Animation timing calculator
 * Handles variable durations based on error conditions
 */
export function calculateAnimationTiming(step, errorToggles = {}) {
  let duration = step.duration || 1000

  if (errorToggles.highLatency) {
    duration *= 1.5
  }

  if (errorToggles.congestion && step.phase === 'phase1') {
    // Congestion affects encapsulation
    duration *= 1.2
  }

  if (errorToggles.packetLoss && step.phase === 'phase3') {
    // Packet loss adds retry logic
    duration *= 1.3
  }

  return duration
}

/**
 * Generates visual state for each step
 * Determines what should be rendered at each animation step
 */
export function getStepVisualState(step, packet) {
  const state = {
    layerId: step.layerId,
    pduType: step.pduType,
    pduColor: step.pduColor,
    showHeaders: true,
    headers: step.headers || {},
    currentData: {
      pdu: step.pduType,
    },
    visualization: step.visualization,
  }

  if (step.phase === 'phase2') {
    state.ghostConnections = true
    state.activeLayer = step.layerId
  }

  return state
}

/**
 * Generates human-readable explanation for each step
 * Used in UI feedback/tutorial text
 */
export function getStepExplanation(step) {
  const explanations = {
    application: 'Raw application data enters the network stack',
    presentation: 'Data formatting and encoding applied',
    session: 'Session established with sequence tracking',
    transport: 'Data segmented with ports and sequence numbers',
    network: 'IP addressing and routing information added',
    datalink: 'MAC addressing and frame structure added',
    physical: 'Data converted to electrical/optical signals',
  }

  return explanations[step.layerId] || 'Processing data'
}

/**
 * Error handling for animation
 * Generates special steps for error conditions
 */
export function generateErrorSteps(errorToggles, phase, layer) {
  const errorSteps = []

  if (errorToggles.packetLoss && phase === 'phase3' && layer === 'physical') {
    errorSteps.push({
      type: 'error',
      severity: 'high',
      title: 'Packet Loss Detected',
      description: 'Frame corrupted during transmission. Retransmission required.',
      layer,
      visualization: {
        showError: true,
        flashColor: '#ef4444',
      },
    })
  }

  if (errorToggles.macMismatch && phase === 'phase3' && layer === 'datalink') {
    errorSteps.push({
      type: 'error',
      severity: 'medium',
      title: 'MAC Address Mismatch',
      description: 'Destination MAC does not match. Frame discarded.',
      layer,
      visualization: {
        showError: true,
        stripFailed: true,
      },
    })
  }

  if (errorToggles.ipMismatch && phase === 'phase3' && layer === 'network') {
    errorSteps.push({
      type: 'error',
      severity: 'medium',
      title: 'IP Address Mismatch',
      description: 'Destination IP does not match. Packet discarded or forwarded.',
      layer,
      visualization: {
        showError: true,
        stripFailed: true,
      },
    })
  }

  return errorSteps
}

export default {
  generateCompleteOSIAnimationSteps,
  calculateAnimationTiming,
  getStepVisualState,
  getStepExplanation,
  generateErrorSteps,
}
