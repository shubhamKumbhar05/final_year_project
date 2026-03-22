/**
 * OSI Model Layer Definitions
 * Organized by concept names for proper structure and retrieval.
 * 
 * Each layer contains concepts that will be visualized in 3D.
 * The structure supports "ping" and "three-way handshake" demonstrations.
 */

export const OSI_LAYERS = [
  {
    id: 'application',
    name: 'Application Layer',
    number: 7,
    color: '#10b981', // Emerald green
    description: 'User applications and network services',
    concepts: [
      {
        id: 'app-http',
        name: 'HTTP',
        meaning: 'Protocol for transferring hypertext documents',
        example: 'Browser requesting a webpage (port 80/443)',
        visualGoal: 'Show HTTP request/response packets',
      },
      {
        id: 'app-dns',
        name: 'DNS',
        meaning: 'Translates domain names to IP addresses',
        example: 'google.com -> 142.250.185.46',
        visualGoal: 'Illustrate DNS query and resolution',
      },
      {
        id: 'app-ftp',
        name: 'FTP',
        meaning: 'File Transfer Protocol for uploading/downloading files',
        example: 'Transferring files to a server (port 21)',
        visualGoal: 'Show file transmission between nodes',
      },
      {
        id: 'app-data-gen',
        name: 'Data Generator',
        meaning: 'Synthesized traffic for simulation purposes',
        example: 'Generating 100 packets/second for testing',
        visualGoal: 'Visualize continuous data flow',
      },
    ],
  },
  {
    id: 'transport',
    name: 'Transport Layer',
    number: 4,
    color: '#a855f7', // Purple
    description: 'End-to-end communication and reliability',
    concepts: [
      {
        id: 'trans-segmentation',
        name: 'Segmentation',
        meaning: 'Breaking large data into smaller segments',
        example: 'Dividing a 1MB file into 1460-byte segments',
        visualGoal: 'Show data being split into segments',
      },
      {
        id: 'trans-retrans',
        name: 'Multiplexing and Demultiplexing',
        meaning: 'Combining multiple streams for transmission and separating them at the receiver',
        example: 'Web browser and email client both use TCP, identified by port numbers',
        visualGoal: 'Show multiple data streams merged and then separated by port numbers',
      },
      {
        id: 'trans-tcp-conn',
        name: 'TCP Connection',
        meaning: 'Establishing a reliable connection via TCP handshake',
        example: 'SYN → SYN-ACK → ACK (three-way handshake)',
        visualGoal: 'Animate the three-way handshake process',
      },
      {
        id: 'trans-ack',
        name: 'ACK and Retransmission',
        meaning: 'Acknowledgment that data was received successfully and retransmission if not acknowledged',
        example: 'Receiver sends ACK=12345 to confirm receipt; sender retransmits if ACK is not received',
        visualGoal: 'Show acknowledgment packets flowing back and retransmission on timeout',
      },
      {
        id: 'trans-flow-ctrl',
        name: 'Flow Control',
        meaning: 'Managing data transmission rate to prevent congestion',
        example: 'Sender limits window size to 64KB per ACK',
        visualGoal: 'Show sliding window mechanism',
      },
      {
        id: 'trans-congestion-ctrl',
        name: 'Congestion Control',
        meaning: 'Managing transmission rate to prevent network congestion and packet loss',
        example: 'TCP Reno adjusts congestion window based on timeouts and triple ACK duplicates',
        visualGoal: 'Show congestion window dynamics with AIMD algorithm and packet loss scenarios',
      },
      {
        id: 'trans-tcp-vs-udp',
        name: 'TCP vs UDP',
        meaning: 'Comparing reliable (TCP) vs unreliable (UDP) protocols',
        example: 'TCP for email, UDP for video streaming',
        visualGoal: 'Side-by-side comparison visualization',
      },
    ],
  },
  {
    id: 'network',
    name: 'Network Layer',
    number: 3,
    color: '#3b82f6', // Blue
    description: 'Routing, logical addressing, and packet header inspection',
    concepts: [
      {
        id: 'net-ipv4-header',
        name: 'IPv4 Header',
        meaning: 'The packet travel document routers inspect to forward, validate, and expire traffic safely',
        example: 'Version 4, TTL 64, Protocol 6, Source 192.168.1.10, Destination 10.0.0.42',
        visualGoal: 'Inspect and edit an IPv4 header while watching TTL, encapsulation, and checksum behavior in 3D',
      },
      {
        id: 'net-network-host-id',
        name: 'Network ID, Host ID, and IP Address',
        meaning: 'IP address breakdown showing which portion identifies the network and which identifies the host',
        example: 'In 192.168.1.10/24: Network ID=192.168.1.0, Host ID=10, Subnet Mask=255.255.255.0',
        visualGoal: 'Visualize IP address components and subnet mask',
      },
      {
        id: 'net-classful-addressing',
        name: 'Classful Addressing (Class A, B, C, D, E)',
        meaning: 'Legacy IP addressing scheme dividing addresses into 5 classes based on first octet',
        example: 'Class A: 1-126 (16M hosts), Class B: 128-191 (64K hosts), Class C: 192-223 (254 hosts)',
        visualGoal: 'Display classful address ranges and their characteristics',
      },
      {
        id: 'net-subnetting',
        name: 'Subnetting',
        meaning: 'Dividing a network into smaller subnetworks using subnet masks',
        example: '192.168.1.0/24 divided into /26 subnets: 192.168.1.0/26, 192.168.1.64/26, etc.',
        visualGoal: 'Show network being subdivided into subnets',
      },
      {
        id: 'net-supernetting',
        name: 'Supernetting',
        meaning: 'Combining multiple smaller networks into one larger network (route aggregation)',
        example: 'Combining 192.168.0.0/24 and 192.168.1.0/24 into 192.168.0.0/23',
        visualGoal: 'Visualize multiple networks combining into supernet',
      },
      {
        id: 'net-cidr',
        name: 'Classless Inter-Domain Routing (CIDR)',
        meaning: 'Modern IP addressing notation allowing flexible network/host bit allocation',
        example: '192.168.1.0/24 (CIDR notation with /24 indicating 24 network bits)',
        visualGoal: 'Display CIDR notation and address blocks',
      },
      {
        id: 'net-vlsm',
        name: 'VLSM (Variable Length Subnet Mask)',
        meaning: 'Using different subnet masks for different parts of the network to optimize space',
        example: 'Large subnet /22 for main office, smaller /26 for branch offices',
        visualGoal: 'Show subnets of different sizes within same network',
      },
      {
        id: 'net-forwarding-table',
        name: 'Forwarding Table',
        meaning: 'Router table containing destination networks and the next-hop to reach them',
        example: 'Route: 10.0.0.0/8 via 192.168.1.1, 172.16.0.0/12 via 192.168.1.2',
        visualGoal: 'Display routing table and packet forwarding decisions',
      },
      {
        id: 'net-routing-algorithm',
        name: 'Routing Algorithm (LSR)',
        meaning: 'Link State Routing algorithm that calculates shortest path to all destinations',
        example: 'OSPF or IS-IS using LSR to build routing tables dynamically',
        visualGoal: 'Animate LSR algorithm calculating optimal paths',
      },
    ],
  },
  {
    id: 'datalink',
    name: 'Data-Link Layer',
    number: 2,
    color: '#f59e0b', // Amber
    description: 'Physical addressing and frame management',
    concepts: [
      {
        id: 'dl-mac-addr',
        name: 'MAC Address',
        meaning: 'Physical hardware address for LAN communication',
        example: 'Device with MAC 00:1A:2B:3C:4D:5E',
        visualGoal: 'Display MAC addresses in local segments',
      },
      {
        id: 'dl-framing',
        name: 'Framing',
        meaning: 'Organizing data into frames with headers and trailers',
        example: 'Ethernet frame with source, destination, CRC',
        visualGoal: 'Show frame structure with boundaries',
      },
      {
        id: 'dl-arp',
        name: 'ARP',
        meaning: 'Address Resolution Protocol; maps IP to MAC addresses',
        example: 'Who has 192.168.1.1? → 00:1A:2B:3C:4D:5E',
        visualGoal: 'Animate ARP broadcast and unicast response',
      },
      {
        id: 'dl-error-check',
        name: 'Error Checking',
        meaning: 'Detecting transmission errors using bit-level corruption analysis',
        example: 'Single-bit and burst errors are identified at the receiver',
        visualGoal: 'Show error detection and frame discard',
      },
      {
        id: 'dl-crc',
        name: 'CRC',
        meaning: 'Cyclic Redundancy Check polynomial-based error detection',
        example: 'Sender appends CRC remainder; receiver verifies with same generator',
        visualGoal: 'Visualize CRC generation, transmission error injection, and receiver verdict',
      },
      {
        id: 'dl-checksum',
        name: 'Checksum',
        meaning: "1's Complement addition-based error detection (Checksum)",
        example: 'Sender adds segments, appends complement; receiver verifies all-1s',
        visualGoal: 'Visualize 1s complement addition, checksum creation, error injection, and receiver verdict',
      },
      {
        id: 'dl-hamming',
        name: 'Hamming Code',
        meaning: 'Single-bit error correction using overlapping parity bits (7,4 Hamming code)',
        example: 'Sender encodes 4 data bits with 3 parity bits; receiver detects and corrects 1-bit errors',
        visualGoal: 'Visualize parity placement, error injection, syndrome calculation, and self-healing correction',
      },
      {
        id: 'dl-flow-delay',
        name: 'Delays in Flow Control',
        meaning: 'Measure transmission, propagation, queue, and processing delays with RTT impact',
        example: 'Higher traffic load creates queue delay while ACK return path increases RTT',
        visualGoal: 'Show end-to-end delay components, ACK loop, and parity-based receiver validation',
      },
      {
        id: 'datalink-2d-parity',
        name: '2D Parity',
        meaning: 'Two-dimensional parity error detection',
        example: '4x4 grid with row and column parity bits',
        visualGoal: 'Show grid, parity bits, error triangulation',
      },
    ],
  },
  {
    id: 'session',
    name: 'Session Layer',
    number: 5,
    color: '#f43f5e',
    description: 'Session management and dialogue control',
    concepts: [
      {
        id: 'sess-establishment',
        name: 'Session Establishment',
        meaning: 'Initiating and preparing a communication session',
        example: 'Client connects to server, session ID created',
        visualGoal: 'Visualize session initialization handshake',
      },
      {
        id: 'sess-dialog-control',
        name: 'Dialog Control',
        meaning: 'Managing turn-taking in bidirectional communication',
        example: 'Token passing to ensure one speaker at a time',
        visualGoal: 'Show two-way communication with control flow',
      },
      {
        id: 'sess-sync',
        name: 'Synchronization',
        meaning: 'Establishing checkpoints for data recovery',
        example: 'Major sync point every 1000 bytes sent',
        visualGoal: 'Display session checkpoints along timeline',
      },
      {
        id: 'sess-termination',
        name: 'Termination',
        meaning: 'Properly closing and cleaning up a session',
        example: 'Graceful close with final ACK exchange',
        visualGoal: 'Animate session closure and resource cleanup',
      },
    ],
  },
  {
    id: 'presentation',
    name: 'Presentation Layer',
    number: 6,
    color: '#ec4899',
    description: 'Data formatting and encryption',
    concepts: [
      {
        id: 'pres-encryption',
        name: 'Encryption',
        meaning: 'Encrypting data for security and privacy',
        example: 'AES-256 encryption of sensitive data',
        visualGoal: 'Show plaintext transforming to ciphertext',
      },
      {
        id: 'pres-compression',
        name: 'Compression',
        meaning: 'Reducing data size for efficient transmission',
        example: 'GZIP compression reducing file size by 70%',
        visualGoal: 'Visualize data shrinking during compression',
      },
      {
        id: 'pres-encoding',
        name: 'Encoding',
        meaning: 'Converting data to standard format (e.g., UTF-8)',
        example: 'Character encoding conversion for different systems',
        visualGoal: 'Show format conversion process',
      },
      {
        id: 'pres-translation',
        name: 'Translation',
        meaning: 'Converting between different data formats',
        example: 'Converting JPEG to PNG, or JSON to XML',
        visualGoal: 'Demonstrate format transformation',
      },
    ],
  },
  {
    id: 'physical',
    name: 'Physical Layer',
    number: 1,
    color: '#eab308',
    description: 'Physical transmission medium and signals',
    concepts: [
      {
        id: 'phys-cables',
        name: 'Cables & Media',
        meaning: 'Physical medium carrying signals (copper, fiber, wireless)',
        example: 'Cat6 UTP cable for Ethernet, fiber optic for long distances',
        visualGoal: 'Display different cable types and connections',
      },
      {
        id: 'phys-digital-signals',
        name: 'Digital Signals',
        meaning: 'Representing binary data as voltage levels (high/low)',
        example: 'Voltage: 5V=1 (high), 0V=0 (low)',
        visualGoal: 'Visualize digital signal waveform (0s and 1s)',
      },
      {
        id: 'phys-modulation',
        name: 'Signal Modulation',
        meaning: 'Modulating signals onto carrier waves for transmission',
        example: 'WiFi using OFDM modulation at 2.4 GHz',
        visualGoal: 'Show signal modulation onto carrier wave',
      },
      {
        id: 'phys-hubs',
        name: 'Hubs & Repeaters',
        meaning: 'Devices that extend signal range and connect segments',
        example: 'Network hub broadcasting to all connected ports',
        visualGoal: 'Display hub repeating signal to all ports',
      },
      {
        id: 'phys-line-coding',
        name: 'Line Coding',
        meaning: 'Encoding digital data into physical signal patterns',
        example: 'Manchester encoding, 8B/10B encoding',
        visualGoal: 'Show binary data encoded as signal patterns',
      },
      {
        id: 'phys-sync',
        name: 'Synchronization',
        meaning: 'Maintaining timing synchronization between sender and receiver',
        example: 'Clock recovery from bit stream',
        visualGoal: 'Visualize clock signals and synchronization pulses',
      },
    ],
  },
]

/**
 * Utility: Get layer by ID
 */
export const getLayerById = (id) => OSI_LAYERS.find((l) => l.id === id)

/**
 * Utility: Get concept by ID
 */
export const getConceptById = (conceptId) => {
  for (const layer of OSI_LAYERS) {
    const concept = layer.concepts.find((c) => c.id === conceptId)
    if (concept) return { ...concept, layerId: layer.id, layerName: layer.name }
  }
  return null
}

/**
 * Utility: Get all concepts for a layer
 */
export const getLayerConcepts = (layerId) => {
  const layer = getLayerById(layerId)
  return layer?.concepts ?? []
}
