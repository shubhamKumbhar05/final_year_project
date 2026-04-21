export const OSI_LAYERS = [
  { id: 'application', name: 'Application', color: '#ef4444' },
  { id: 'presentation', name: 'Presentation', color: '#facc15' },
  { id: 'session', name: 'Session', color: '#a855f7' },
  { id: 'transport', name: 'Transport', color: '#f97316' },
  { id: 'network', name: 'Network', color: '#22c55e' },
  { id: 'datalink', name: 'Data Link', color: '#3b82f6' },
  { id: 'physical', name: 'Physical', color: '#f8fafc' },
]

export const ENCAPSULATION_ORDER = [
  'application',
  'presentation',
  'session',
  'transport',
  'network',
  'datalink',
  'physical',
]

export const DECAPSULATION_ORDER = [...ENCAPSULATION_ORDER].reverse()

export function getLayerMeta(layerId) {
  return OSI_LAYERS.find((layer) => layer.id === layerId)
}

function toBits(text) {
  return Array.from(text)
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ')
}

function clonePacket(packet) {
  return JSON.parse(JSON.stringify(packet))
}

export function applyEncapsulationLayer(packet, layerId, context) {
  const next = clonePacket(packet)
  const { input, sourceNode, destinationNode } = context

  switch (layerId) {
    case 'application': {
      next.applicationData = {
        dataType: input.dataType,
        payload: input.payload,
        appProtocol: input.dataType === 'HTTP Request' ? 'HTTP' : 'APP-DATA',
      }
      break
    }
    case 'presentation': {
      const raw = next.applicationData?.payload ?? input.payload
      next.presentationData = {
        encoding: 'UTF-8',
        compressed: raw.replace(/\s+/g, ' '),
        encrypted: btoa(unescape(encodeURIComponent(raw))).slice(0, 120),
      }
      break
    }
    case 'session': {
      next.sessionInfo = {
        sessionId: `sess-${sourceNode.id.slice(-4)}-${destinationNode.id.slice(-4)}`,
        status: 'ESTABLISHED',
        checkpoint: Date.now(),
      }
      break
    }
    case 'transport': {
      const payloadForSegment = next.presentationData?.encrypted || next.applicationData?.payload || ''
      const segmentSize = Number(input.packetSize) > 0 ? Number(input.packetSize) : 256
      const segments = []
      for (let i = 0; i < payloadForSegment.length; i += segmentSize) {
        segments.push(payloadForSegment.slice(i, i + segmentSize))
      }
      next.segment = {
        protocol: input.protocol,
        sourcePort: Number(input.port || 49152),
        destinationPort: input.dataType === 'HTTP Request' ? 80 : Number(input.port || 8080),
        sequence: 1,
        ack: input.protocol === 'TCP' ? 1 : 0,
        segments,
      }
      break
    }
    case 'network': {
      next.packet = {
        sourceIp: sourceNode.config.ipAddress,
        destinationIp: destinationNode.config.ipAddress,
        ttl: 64,
        protocol: next.segment?.protocol || input.protocol,
      }
      break
    }
    case 'datalink': {
      next.frame = {
        sourceMac: sourceNode.config.macAddress,
        destinationMac: destinationNode.config.macAddress,
        etherType: '0x0800',
        fcs: 'CRC32-MOCK',
      }
      break
    }
    case 'physical': {
      const asString = JSON.stringify({
        applicationData: next.applicationData,
        presentationData: next.presentationData,
        sessionInfo: next.sessionInfo,
        segment: next.segment,
        packet: next.packet,
        frame: next.frame,
      })
      next.bits = toBits(asString).slice(0, 1800)
      break
    }
    default:
      break
  }

  return next
}

export function applyDecapsulationLayer(packet, layerId) {
  const next = clonePacket(packet)

  switch (layerId) {
    case 'physical': {
      delete next.bits
      break
    }
    case 'datalink': {
      delete next.frame
      break
    }
    case 'network': {
      delete next.packet
      break
    }
    case 'transport': {
      delete next.segment
      break
    }
    case 'session': {
      if (next.sessionInfo) {
        next.sessionInfo.status = 'TERMINATED'
      }
      break
    }
    case 'presentation': {
      delete next.presentationData
      break
    }
    case 'application': {
      // Application data remains as final user-visible payload
      break
    }
    default:
      break
  }

  return next
}
