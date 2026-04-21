/**
 * Protocol Calculation Engine
 * Complete protocol stack calculations for all 7 OSI layers
 * Implements real-world networking mathematics
 */

// ============================================================================
// L4 TRANSPORT LAYER - Segmentation with MSS
// ============================================================================

export function calculateSegmentation(payload, mss = 1460) {
  const totalLength = payload.length
  const segmentCount = Math.ceil(totalLength / mss)
  
  const segments = []
  let sequenceNumber = Math.floor(Math.random() * 1000) // Random initial seq

  for (let i = 0; i < segmentCount; i++) {
    const start = i * mss
    const end = Math.min(start + mss, totalLength)
    const segmentData = payload.substring(start, end)

    segments.push({
      segmentId: i,
      sequenceNumber: sequenceNumber + (i * mss),
      acknowledgmentNumber: 0, // Will be set by receiver
      sourcePort: Math.floor(Math.random() * 16384) + 49152, // Ephemeral port
      destinationPort: 80, // HTTP
      length: segmentData.length,
      flags: {
        SYN: i === 0, // First packet has SYN
        ACK: false,
        FIN: i === segmentCount - 1, // Last packet has FIN
        RST: false,
      },
      windowSize: 65535,
      checksum: calculateTCPChecksum(segmentData),
      payload: segmentData,
    })
  }

  return {
    totalSegments: segmentCount,
    mss,
    segments,
    totalBytes: totalLength,
  }
}

// TCP Checksum (1's complement of 1's complement sum)
function calculateTCPChecksum(data) {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data.charCodeAt(i)
  }
  // 1's complement
  let checksum = (~sum) & 0xffff
  return '0x' + checksum.toString(16).toUpperCase().padStart(4, '0')
}

// ============================================================================
// L3 NETWORK LAYER - Routing & IPv4 Fragmentation
// ============================================================================

export function performSubnetMaskANDing(srcIP, dstIP, subnetMask) {
  const parseIP = (ip) => ip.split('.').map(Number)
  const parseMask = (mask) => mask.split('.').map(Number)

  const src = parseIP(srcIP)
  const dst = parseIP(dstIP)
  const mask = parseMask(subnetMask)

  const srcNetwork = src.map((octet, i) => octet & mask[i])
  const dstNetwork = dst.map((octet, i) => octet & mask[i])

  const isLocal = srcNetwork.every((octet, i) => octet === dstNetwork[i])

  return {
    sourceIP: srcIP,
    destinationIP: dstIP,
    subnetMask,
    sourceNetwork: srcNetwork.join('.'),
    destinationNetwork: dstNetwork.join('.'),
    isLocal,
    routingDecision: isLocal ? 'LOCAL' : 'REMOTE (via Gateway)',
  }
}

export function calculateFragmentation(payloadLength, mtu = 1500, headerSize = 20) {
  const maxPayloadPerPacket = mtu - headerSize
  const fragmentCount = Math.ceil(payloadLength / maxPayloadPerPacket)

  const fragments = []
  let fragmentOffset = 0

  for (let i = 0; i < fragmentCount; i++) {
    const fragSize = Math.min(maxPayloadPerPacket, payloadLength - i * maxPayloadPerPacket)
    
    fragments.push({
      fragmentId: i,
      offset: fragmentOffset,
      size: fragSize,
      moreFragments: i < fragmentCount - 1,
      ttl: 64,
      ipChecksum: '0x' + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0'),
    })

    fragmentOffset += fragSize
  }

  return {
    fragmentCount,
    mtu,
    maxPayloadPerPacket,
    fragments,
    totalSize: payloadLength,
    fragmentationNeeded: fragmentCount > 1,
  }
}

// ============================================================================
// L2 DATA LINK LAYER - CRC Calculation & Bit Stuffing
// ============================================================================

export function calculateCRC32(data) {
  const CRC32_TABLE = new Uint32Array(256)
  
  // Generate CRC32 table
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    CRC32_TABLE[i] = c >>> 0
  }

  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i)
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

export function calculateBitStuffing(data) {
  // Flag pattern: 01111110 (0x7E)
  const flagPattern = '01111110'
  let binary = ''

  // Convert to binary
  for (let i = 0; i < data.length; i++) {
    binary += data.charCodeAt(i).toString(2).padStart(8, '0')
  }

  let stuffed = ''
  let consecutiveOnes = 0

  for (const bit of binary) {
    stuffed += bit

    if (bit === '1') {
      consecutiveOnes++
      // After 5 consecutive 1s, insert a 0
      if (consecutiveOnes === 5) {
        stuffed += '0'
        consecutiveOnes = 0
      }
    } else {
      consecutiveOnes = 0
    }
  }

  return {
    originalBinary: binary,
    stuffedBinary: stuffed,
    originalLength: data.length * 8,
    stuffedLength: stuffed.length,
    overhead: stuffed.length - (data.length * 8),
    framingOverhead: ((stuffed.length - (data.length * 8)) / (data.length * 8) * 100).toFixed(2),
  }
}

// ============================================================================
// L1 PHYSICAL LAYER - Delay Calculations
// ============================================================================

export function calculatePhysicalDelay(frameLength, wireLengthKm, bandwidth = 1000) {
  // frameLength in bytes
  // wireLengthKm in kilometers
  // bandwidth in Mbps (default 1Gbps)

  // Transmission Delay = Frame Size / Bandwidth
  const frameSizeBits = frameLength * 8
  const bandwidthBps = bandwidth * 1000000 // Convert Mbps to bps
  const transmissionDelay = (frameSizeBits / bandwidthBps) * 1000 // Milliseconds

  // Propagation Delay = Wire Length / Speed of Light in fiber (~2/3 * c)
  const speedOfLightInFiber = (2 / 3) * 3e5 // km/ms
  const propagationDelay = wireLengthKm / speedOfLightInFiber // Milliseconds

  // Processing Delay (typically 0.5-1ms per hop, we'll use routers as hops)
  // Estimate: 1 hop per 100km
  const estimatedHops = Math.max(1, Math.ceil(wireLengthKm / 100))
  const processingDelayPerHop = 0.5 // ms
  const processingDelay = estimatedHops * processingDelayPerHop

  // Queue Delay (varies, we'll simulate based on traffic)
  const queueDelay = 0 // Will be set based on network load

  const totalDelay = transmissionDelay + propagationDelay + processingDelay + queueDelay

  return {
    frameLength,
    frameSizeBits,
    bandwidth,
    wireLengthKm,
    estimatedHops,
    delays: {
      transmission: parseFloat(transmissionDelay.toFixed(4)), // d_trans
      propagation: parseFloat(propagationDelay.toFixed(4)),   // d_prop
      processing: parseFloat(processingDelay.toFixed(4)),     // d_proc
      queue: parseFloat(queueDelay.toFixed(4)),               // d_queue
    },
    formulae: {
      transmission: `${frameSizeBits} bits / ${bandwidthBps} bps = ${transmissionDelay.toFixed(4)} ms`,
      propagation: `${wireLengthKm} km / ${speedOfLightInFiber.toFixed(0)} km/ms = ${propagationDelay.toFixed(4)} ms`,
      processing: `${estimatedHops} hops × ${processingDelayPerHop} ms = ${processingDelay.toFixed(4)} ms`,
    },
    total: {
      delayMs: parseFloat(totalDelay.toFixed(4)),
      delayUs: parseFloat((totalDelay * 1000).toFixed(2)),
      delayS: parseFloat((totalDelay / 1000).toFixed(6)),
    },
    bitTransmissionRate: (1 / (frameSizeBits / bandwidthBps) * 1000).toFixed(2), // bits per ms
  }
}

// ============================================================================
// L5-L7 UPPER LAYERS - Session, Presentation, Application
// ============================================================================

export function prepareApplicationData(userInput) {
  return {
    application: {
      protocol: 'HTTP',
      method: 'POST',
      uri: '/api/data',
      payload: userInput,
    },
    presentation: {
      encoding: 'UTF-8',
      compressed: userInput.length > 100,
    },
    session: {
      sessionId: 'sess-' + Math.random().toString(36).substring(7),
      sequenceNumber: Math.floor(Math.random() * 1000000),
    },
  }
}

// ============================================================================
// COMPLETE PROTOCOL STACK CALCULATOR
// ============================================================================

export function calculateCompleteProtocolStack({
  userInput = '',
  sourceIP = '192.168.1.1',
  destinationIP = '192.168.1.100',
  subnetMask = '255.255.255.0',
  sourceMac = 'AA:BB:CC:DD:EE:FF',
  destinationMac = '11:22:33:44:55:66',
  mss = 1460,
  mtu = 1500,
  wireLengthKm = 1,
  bandwidth = 1000, // Mbps
}) {
  // L7-L5: Prepare upper layers
  const upperLayers = prepareApplicationData(userInput)

  // L4: Transport layer - Segmentation
  const transport = calculateSegmentation(userInput, mss)

  // L3: Network layer - Routing and Fragmentation
  const routing = performSubnetMaskANDing(sourceIP, destinationIP, subnetMask)
  
  // For each segment, check fragmentation
  const fragments = calculateFragmentation(userInput.length, mtu, 20)

  // L2: Data Link layer - CRC and Bit Stuffing
  const crc = calculateCRC32(userInput)
  const bitStuffing = calculateBitStuffing(userInput)

  // L1: Physical layer - Delay calculations
  // Frame size = User data + L4 header (20) + L3 header (20) + L2 header (14) + Trailer (4)
  const frameSize = userInput.length + 20 + 20 + 14 + 4
  const physical = calculatePhysicalDelay(frameSize, wireLengthKm, bandwidth)

  return {
    // Input configuration
    config: {
      userInput,
      sourceIP,
      destinationIP,
      subnetMask,
      sourceMac,
      destinationMac,
      mss,
      mtu,
      wireLengthKm,
      bandwidth,
    },

    // Layer calculations
    layers: {
      application: upperLayers.application,
      presentation: upperLayers.presentation,
      session: upperLayers.session,
      transport,
      network: routing,
      datalink: {
        srcMac: sourceMac,
        dstMac: destinationMac,
        etherType: '0x0800',
        crc32: crc,
        bitStuffing,
      },
      physical,
    },

    // Summary statistics
    summary: {
      totalSegments: transport.totalSegments,
      bytes: {
        payload: userInput.length,
        l4Header: 20,
        l3Header: 20,
        l2Header: 14,
        l2Trailer: 4,
        totalFrame: frameSize,
      },
      delays: {
        transmission: physical.delays.transmission,
        propagation: physical.delays.propagation,
        processing: physical.delays.processing,
        total: physical.total.delayMs,
      },
      routing: {
        isLocal: routing.isLocal,
        decision: routing.routingDecision,
      },
      fragmentation: {
        required: fragments.fragmentationNeeded,
        fragmentCount: fragments.fragmentCount,
      },
    },

    // Timeline for animation
    timeline: {
      // Time to load frame onto wire (based on transmission delay)
      frameLoadTime: physical.delays.transmission,
      // Time for frame to propagate
      propagationTime: physical.delays.propagation,
      // Time to process at each hop
      processingTime: physical.delays.processing,
      // Total time to receiver
      totalTime: physical.total.delayMs,
      // Speed of bits on wire (bits per millisecond)
      bitSpeed: physical.bitTransmissionRate,
    },

    // For logging
    calculations: {
      timestamp: new Date().toISOString(),
      userHash: generateHash(userInput),
    },
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

export function bitsToString(binary) {
  let result = ''
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.substring(i, i + 8)
    result += String.fromCharCode(parseInt(byte, 2))
  }
  return result
}

export function stringToBits(str) {
  let binary = ''
  for (let i = 0; i < str.length; i++) {
    binary += str.charCodeAt(i).toString(2).padStart(8, '0')
  }
  return binary
}

// Simulate network error injection
export function injectError(binary, errorRate = 0.01) {
  let modified = ''
  let errorsInjected = 0

  for (const bit of binary) {
    if (Math.random() < errorRate) {
      modified += bit === '0' ? '1' : '0'
      errorsInjected++
    } else {
      modified += bit
    }
  }

  return {
    original: binary,
    modified,
    errorsInjected,
    errorRate: (errorsInjected / binary.length * 100).toFixed(4),
  }
}

export default {
  calculateSegmentation,
  performSubnetMaskANDing,
  calculateFragmentation,
  calculateCRC32,
  calculateBitStuffing,
  calculatePhysicalDelay,
  calculateCompleteProtocolStack,
  injectError,
  stringToBits,
  bitsToString,
  generateHash,
}
