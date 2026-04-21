/**
 * PDU Encapsulation Module
 * Implements strict Protocol Data Unit logic with proper nesting and color coding
 * Follows the hierarchical structure where each layer wraps the previous layer's PDU
 */

export const PDU_LAYER_CONFIG = {
  application: {
    name: 'Data',
    color: '#fbbf24', // Gold - raw data
    abbreviation: 'DATA',
    headerFields: [],
    description: 'Raw application data block',
  },
  presentation: {
    name: 'Data',
    color: '#fbbf24', // Gold - still raw data at this point
    abbreviation: 'DATA',
    headerFields: ['encoding', 'compression'],
    description: 'Data with presentation formatting',
  },
  session: {
    name: 'Data',
    color: '#fbbf24', // Gold - ready for transport
    abbreviation: 'DATA',
    headerFields: ['sessionId'],
    description: 'Session-managed data',
  },
  transport: {
    name: 'Segment',
    color: '#60a5fa', // Blue - L4 header
    abbreviation: 'SEG',
    headerFields: ['srcPort', 'dstPort', 'seqNum', 'ackNum', 'checksum'],
    description: 'TCP/UDP Header + Data Payload',
    showPayload: true,
  },
  network: {
    name: 'Packet',
    color: '#22c55e', // Green - L3 header
    abbreviation: 'PKT',
    headerFields: ['srcIP', 'dstIP', 'ttl', 'protocol', 'checksum'],
    description: 'IP Header + Segment (Payload)',
    showPayload: true,
  },
  datalink: {
    name: 'Frame',
    color: '#8b5cf6', // Purple - L2 header/trailer
    abbreviation: 'FRM',
    headerFields: ['srcMAC', 'dstMAC', 'etherType'],
    trailerFields: ['fcs'],
    description: 'Ethernet Header + Packet (Payload) + Trailer',
    showPayload: true,
    hasTrailer: true,
  },
  physical: {
    name: 'Bitstream',
    color: '#6b7280', // Gray - bits
    abbreviation: 'BITS',
    headerFields: [],
    description: '1s and 0s traveling across medium',
  },
}

/**
 * Creates a properly nested PDU structure during encapsulation
 * Each layer wraps the previous layer's PDU as its payload
 */
export function createEncapsulatedPDU(packet, layerId, context = {}) {
  const { sourceNode, destinationNode } = context
  const config = PDU_LAYER_CONFIG[layerId]
  if (!config) return null

  const pdu = {
    layerId,
    name: config.name,
    color: config.color,
    abbreviation: config.abbreviation,
    timestamp: Date.now(),
    description: config.description,
    headers: {},
    trailer: null,
    payload: null, // The previous layer's PDU becomes the payload
  }

  switch (layerId) {
    case 'application': {
      pdu.headers = {
        appProtocol: packet.applicationData?.appProtocol || 'HTTP',
        contentType: 'text/plain',
      }
      pdu.payloadData = packet.applicationData?.payload || 'Application Data'
      break
    }

    case 'presentation': {
      pdu.headers = {
        encoding: 'UTF-8',
        compression: 'DEFLATE',
      }
      // The payload is the previous layer's output
      pdu.payload = packet._lastPDU // Reference to previous PDU
      break
    }

    case 'session': {
      pdu.headers = {
        sessionId: `sess-${sourceNode?.id?.slice?.(-4) || 'src'}-${destinationNode?.id?.slice?.(-4) || 'dst'}`,
        sequenceNumber: 1,
      }
      pdu.payload = packet._lastPDU
      break
    }

    case 'transport': {
      const protocol = context.input?.protocol || 'TCP'
      pdu.headers = {
        srcPort: Number(context.input?.port || 49152),
        dstPort: 80,
        seqNum: 1001,
        ackNum: 0,
        checksum: '0xABCD',
        protocol,
      }
      pdu.payload = packet._lastPDU
      pdu.segments = (packet.segment?.segments || []).length // Number of segments
      pdu.segmentSize = context.input?.packetSize || 256
      break
    }

    case 'network': {
      pdu.headers = {
        srcIP: sourceNode?.config?.ipAddress || '192.168.1.1',
        dstIP: destinationNode?.config?.ipAddress || '192.168.1.2',
        ttl: 64,
        protocol: 'TCP',
        headerChecksum: '0xDEAD',
      }
      pdu.payload = packet._lastPDU
      break
    }

    case 'datalink': {
      pdu.headers = {
        srcMAC: sourceNode?.config?.macAddress || 'AA:BB:CC:DD:EE:FF',
        dstMAC: destinationNode?.config?.macAddress || '11:22:33:44:55:66',
        etherType: '0x0800', // IPv4
      }
      pdu.trailer = {
        fcs: 'CRC32', // Frame Check Sequence
      }
      pdu.payload = packet._lastPDU
      break
    }

    case 'physical': {
      pdu.headers = {
        medium: 'Ethernet',
        speed: '1 Gbps',
      }
      // Bits represent the entire frame converted to binary
      const frameSize = 1500 // bytes
      pdu.bitCount = frameSize * 8
      pdu.bitsPerSecond = 1000000000 // 1 Gbps
      pdu.payload = packet._lastPDU
      break
    }

    default:
      break
  }

  return pdu
}

/**
 * Visualize the complete encapsulation hierarchy
 * Shows how each layer nests within the next
 */
export function getEncapsulationHierarchy(packets) {
  // packets is the accumulated packet state showing all layers

  const hierarchy = {
    physicalBits: {
      type: 'bitstream',
      size: 'N × 8 bits',
      children: [
        {
          type: 'frame',
          label: 'Frame',
          color: '#8b5cf6',
          headers: {
            label: 'Ethernet Header',
            fields: ['Dest MAC', 'Src MAC', 'Type'],
          },
          children: [
            {
              type: 'packet',
              label: 'Packet',
              color: '#22c55e',
              headers: {
                label: 'IP Header',
                fields: ['Dest IP', 'Src IP', 'TTL', 'Protocol'],
              },
              children: [
                {
                  type: 'segment',
                  label: 'Segment',
                  color: '#60a5fa',
                  headers: {
                    label: 'TCP/UDP Header',
                    fields: ['Dest Port', 'Src Port', 'Seq#', 'Ack#'],
                  },
                  children: [
                    {
                      type: 'data',
                      label: 'Data',
                      color: '#fbbf24',
                      content: 'Application Payload',
                    },
                  ],
                },
              ],
            },
          ],
          trailer: {
            label: 'Ethernet Trailer (FCS)',
          },
        },
      ],
    },
  }

  return hierarchy
}

/**
 * Animation sequence for encapsulation phase
 * Each step wraps the previous PDU
 */
export const ENCAPSULATION_ANIMATION_SEQUENCE = [
  {
    layer: 'application',
    phase: 'encapsulation',
    description: 'Raw Data Block appears',
    label: 'Data (Gold Block)',
    duration: 1000,
  },
  {
    layer: 'presentation',
    phase: 'encapsulation',
    description: 'Data stays as Data, formatting applied',
    label: 'Data with Encoding',
    duration: 800,
  },
  {
    layer: 'session',
    phase: 'encapsulation',
    description: 'Data ready for transport',
    label: 'Data with Session ID',
    duration: 800,
  },
  {
    layer: 'transport',
    phase: 'encapsulation',
    description: 'Blue TCP/UDP Header wraps the Data → Segment PDU',
    label: 'Segment (Data + L4 Header)',
    duration: 1200,
  },
  {
    layer: 'network',
    phase: 'encapsulation',
    description: 'Green IP Header wraps Segment → Packet PDU',
    label: 'Packet (Segment + L3 Header)',
    duration: 1200,
  },
  {
    layer: 'datalink',
    phase: 'encapsulation',
    description: 'Purple Ethernet Header+Trailer wrap Packet → Frame PDU',
    label: 'Frame (Packet + L2 Header/Trailer)',
    duration: 1200,
  },
  {
    layer: 'physical',
    phase: 'encapsulation',
    description: 'Frame converted to binary stream',
    label: 'Bitstream (1s and 0s)',
    duration: 1000,
  },
]

/**
 * Peer-to-Peer Communication visualization
 * Shows horizontal layer-to-layer "communication"
 */
export function createPeerConnectionData(senderLayer, receiverLayer) {
  return {
    senderLayer,
    receiverLayer,
    connectionType: 'logical-peer',
    description: `Layer ${senderLayer} at sender "speaks" with Layer ${receiverLayer} at receiver`,
    visualization: {
      style: 'dashed',
      color: '#94a3b8',
      opacity: 0.6,
      label: `L${senderLayer} ↔ L${receiverLayer}`,
    },
  }
}

/**
 * Decapsulation animation sequence
 * Inverse of encapsulation, peeling off headers
 */
export const DECAPSULATION_ANIMATION_SEQUENCE = [
  {
    layer: 'physical',
    phase: 'decapsulation',
    description: 'Bitstream received, reassemble to Frame',
    label: 'Bits → Frame',
    duration: 1000,
  },
  {
    layer: 'datalink',
    phase: 'decapsulation',
    description: 'Check MAC address, peel Purple Header/Trailer → Packet revealed',
    label: 'Frame → Packet',
    duration: 1200,
  },
  {
    layer: 'network',
    phase: 'decapsulation',
    description: 'Check IP address, peel Green Header → Segment revealed',
    label: 'Packet → Segment',
    duration: 1200,
  },
  {
    layer: 'transport',
    phase: 'decapsulation',
    description: 'Check Port/Sequence, peel Blue Header → Data reassembled',
    label: 'Segment → Data',
    duration: 1200,
  },
  {
    layer: 'session',
    phase: 'decapsulation',
    description: 'Session context validated',
    label: 'Session Processing',
    duration: 800,
  },
  {
    layer: 'presentation',
    phase: 'decapsulation',
    description: 'Decode and decompress',
    label: 'Presentation Processing',
    duration: 800,
  },
  {
    layer: 'application',
    phase: 'decapsulation',
    description: 'Original Data Block delivered to Application',
    label: 'Data → Application',
    duration: 1000,
  },
]

export default {
  PDU_LAYER_CONFIG,
  createEncapsulatedPDU,
  getEncapsulationHierarchy,
  ENCAPSULATION_ANIMATION_SEQUENCE,
  DECAPSULATION_ANIMATION_SEQUENCE,
  createPeerConnectionData,
}
