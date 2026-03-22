/**
 * Concept Names and Mappings
 * Maps concept IDs to display names and colors for visualization
 * IDs must match the ones defined in osiLayers.js
 */

export const conceptMapping = {
  // Application Layer (4 concepts)
  'app-http': {
    name: 'HTTP Protocol',
    fullName: 'HyperText Transfer Protocol',
    color: '#10b981',
    layer: 'Application',
    icon: '🌐'
  },
  'app-dns': {
    name: 'DNS',
    fullName: 'Domain Name System',
    color: '#34d399',
    layer: 'Application',
    icon: '🔍'
  },
  'app-ftp': {
    name: 'FTP',
    fullName: 'File Transfer Protocol',
    color: '#6ee7b7',
    layer: 'Application',
    icon: '📁'
  },
  'app-data-gen': {
    name: 'Data Generator',
    fullName: 'Application Data Generation',
    color: '#a7f3d0',
    layer: 'Application',
    icon: '💾'
  },

  // Transport Layer (6 concepts)
  'trans-segmentation': {
    name: 'Segmentation',
    fullName: 'Data Segmentation',
    color: '#3b82f6',
    layer: 'Transport',
    icon: '✂️'
  },
  'trans-tcp-conn': {
    name: 'TCP Connection',
    fullName: 'TCP Three-Way Handshake',
    color: '#60a5fa',
    layer: 'Transport',
    icon: '🤝'
  },
  'trans-ack': {
    name: 'ACK & Retransmission',
    fullName: 'Acknowledgment & Retransmission Protocol',
    color: '#93c5fd',
    layer: 'Transport',
    icon: '✓'
  },
  'trans-retrans': {
    name: 'Multiplexing and Demultiplexing',
    fullName: 'Packets Multiplexing and Demultiplexing',
    color: '#bfdbfe',
    layer: 'Transport',
    icon: '🔄'
  },
  'trans-flow-ctrl': {
    name: 'Flow Control',
    fullName: 'Sliding Window Flow Control',
    color: '#dbeafe',
    layer: 'Transport',
    icon: '⚖️'
  },
  'trans-flow-delay': {
    name: 'Delays in Flow Control',
    fullName: 'Transmission, Propagation, Queue, and Processing Delay',
    color: '#bfdbfe',
    layer: 'Transport',
    icon: '⏱️'
  },
  'trans-tcp-vs-udp': {
    name: 'TCP vs UDP',
    fullName: 'Connection Oriented vs Connectionless',
    color: '#eff6ff',
    layer: 'Transport',
    icon: '⚡'
  },

  // Network Layer (9 concepts)
  'net-ipv4-header': {
    name: 'IPv4 Header',
    fullName: 'IPv4 Packet Inspector',
    color: '#38bdf8',
    layer: 'Network',
    icon: 'IP'
  },
  'net-ip-fragmentation': {
    name: 'IP Fragmentation',
    fullName: 'MTU Bottleneck and Reassembly',
    color: '#0ea5e9',
    layer: 'Network',
    icon: '🧩'
  },
  'net-ip-addr': {
    name: 'IP Addressing',
    fullName: 'Internet Protocol Addressing',
    color: '#06b6d4',
    layer: 'Network',
    icon: '🏷️'
  },
  'net-subnetting': {
    name: 'Subnetting',
    fullName: 'Network Subnetting',
    color: '#22d3ee',
    layer: 'Network',
    icon: '🔗'
  },
  'net-routing-table': {
    name: 'Routing Table',
    fullName: 'Router Routing Table',
    color: '#06b6d4',
    layer: 'Network',
    icon: '📍'
  },
  'net-forwarding': {
    name: 'Packet Forwarding',
    fullName: 'Router Packet Forwarding',
    color: '#22d3ee',
    layer: 'Network',
    icon: '➡️'
  },
  'net-path-selection': {
    name: 'Path Selection',
    fullName: 'Shortest Path Algorithm',
    color: '#06b6d4',
    layer: 'Network',
    icon: '🛤️'
  },
  'net-ttl': {
    name: 'TTL',
    fullName: 'Time To Live Hop Limit',
    color: '#22d3ee',
    layer: 'Network',
    icon: '⏰'
  },
  'net-pkt-drop': {
    name: 'Packet Drop',
    fullName: 'Congestion Packet Drop',
    color: '#06b6d4',
    layer: 'Network',
    icon: '🗑️'
  },

  // Data Link Layer (4 concepts)
  'dl-mac-addr': {
    name: 'MAC Address',
    fullName: 'Media Access Control Addressing',
    color: '#8b5cf6',
    layer: 'Data Link',
    icon: '🎫'
  },
  'dl-framing': {
    name: 'Framing',
    fullName: 'Frame Structure',
    color: '#a78bfa',
    layer: 'Data Link',
    icon: '📦'
  },
  'dl-arp': {
    name: 'ARP',
    fullName: 'Address Resolution Protocol',
    color: '#c4b5fd',
    layer: 'Data Link',
    icon: '🔎'
  },
  'dl-error-check': {
    name: 'Error Checking',
    fullName: 'Bit Error Type Checking',
    color: '#ddd6fe',
    layer: 'Data Link',
    icon: '✔️'
  },
  'dl-crc': {
    name: 'CRC',
    fullName: 'Cyclic Redundancy Check',
    color: '#c084fc',
    layer: 'Data Link',
    icon: '🧮'
  },

  'dl-checksum': {
    name: 'Checksum',
    fullName: '1\'s Complement Checksum',
    color: '#fbbf24',
    layer: 'Data Link',
    icon: '🧾'
  },

  'dl-hamming': {
    name: 'Hamming Code',
    fullName: 'Hamming (7,4) Error Correction',
    color: '#38bdf8',
    layer: 'Data Link',
    icon: '🧬'
  },

  'dl-flow-delay': {
    name: 'Delays in Flow Control',
    fullName: 'Transmission, Propagation, Queue, and Processing Delay',
    color: '#93c5fd',
    layer: 'Data Link',
    icon: '⏱️'
  },

  'datalink-2d-parity': {
    name: '2D Parity',
    fullName: 'Two-Dimensional Parity Check',
    color: '#fbbf24',
    layer: 'Data Link',
    icon: '🟦'
  },

  // Session Layer (4 concepts)
  'sess-establishment': {
    name: 'Session Establishment',
    fullName: 'Session Initiation',
    color: '#f43f5e',
    layer: 'Session',
    icon: '🚀'
  },
  'sess-dialog-control': {
    name: 'Dialog Control',
    fullName: 'Two-Way Communication',
    color: '#fb7185',
    layer: 'Session',
    icon: '💬'
  },
  'sess-sync': {
    name: 'Synchronization',
    fullName: 'Session Checkpointing',
    color: '#fda4af',
    layer: 'Session',
    icon: '🔄'
  },
  'sess-termination': {
    name: 'Session Termination',
    fullName: 'Session Closure',
    color: '#fecdd3',
    layer: 'Session',
    icon: '🔚'
  },

  // Presentation Layer (4 concepts)
  'pres-encryption': {
    name: 'Encryption',
    fullName: 'Data Encryption',
    color: '#ec4899',
    layer: 'Presentation',
    icon: '🔐'
  },
  'pres-compression': {
    name: 'Compression',
    fullName: 'Data Compression',
    color: '#f472b6',
    layer: 'Presentation',
    icon: '📉'
  },
  'pres-encoding': {
    name: 'Encoding',
    fullName: 'Character Encoding',
    color: '#f9a8d4',
    layer: 'Presentation',
    icon: '🔤'
  },
  'pres-translation': {
    name: 'Translation',
    fullName: 'Data Format Translation',
    color: '#fbcfe8',
    layer: 'Presentation',
    icon: '🔄'
  },

  // Physical Layer (6 concepts)
  'phys-cables': {
    name: 'Cables & Media',
    fullName: 'Physical Cable Types',
    color: '#eab308',
    layer: 'Physical',
    icon: '🔌'
  },
  'phys-digital-signals': {
    name: 'Digital Signals',
    fullName: 'Binary Signal Representation',
    color: '#facc15',
    layer: 'Physical',
    icon: '〰️'
  },
  'phys-modulation': {
    name: 'Signal Modulation',
    fullName: 'Data Modulation',
    color: '#fde047',
    layer: 'Physical',
    icon: '📡'
  },
  'phys-hubs': {
    name: 'Hubs & Repeaters',
    fullName: 'Network Hubs',
    color: '#fef08a',
    layer: 'Physical',
    icon: '🌟'
  },
  'phys-line-coding': {
    name: 'Line Coding',
    fullName: 'Digital Line Coding',
    color: '#fef3c7',
    layer: 'Physical',
    icon: '◼️'
  },
  'phys-sync': {
    name: 'Synchronization',
    fullName: 'Clock Synchronization',
    color: '#fef9e7',
    layer: 'Physical',
    icon: '⏱️'
  }
}

/**
 * Get concept info by ID
 */
export const getConceptInfo = (conceptId) => {
  return conceptMapping[conceptId] || {
    name: 'Unknown Concept',
    fullName: 'Unknown Concept',
    color: '#64748b',
    layer: 'Unknown',
    icon: '❓'
  }
}

/**
 * Get all concepts by layer
 */
export const getConceptsByLayer = (layerId) => {
  const layerMap = {
    1: 'Application',
    2: 'Presentation',
    3: 'Session',
    4: 'Transport',
    5: 'Network',
    6: 'Data Link',
    7: 'Physical'
  }
  
  const targetLayer = layerMap[layerId]
  return Object.values(conceptMapping).filter((info) => info.layer === targetLayer)
}
