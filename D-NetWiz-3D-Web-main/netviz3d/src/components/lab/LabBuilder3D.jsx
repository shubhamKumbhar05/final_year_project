import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { OSI_LAYERS } from './simulation/osiLayers'
import { createSimulationPlan, buildAdjacency } from './simulation/simulationEngine'
import { getLayerColor, getPacketAnimationSpeed, getStepDurationMs } from './simulation/animationController'
import { calculateCompleteProtocolStack } from './simulation/protocolCalculationEngine'
import { NestedEncapsulationStack } from './simulation/nestedEncapsulation'
import { NetworkSimulation, generateTraversalTimeline, generateBitstream } from './simulation/traversalLogic'
import { CompleteDecapsulation, ReceiverConsole } from './simulation/receiverValidation'
import { CalculationDashboard } from './simulation/calculationDashboard'

const COMPONENT_CATEGORIES = [
  {
    title: 'End Devices',
    items: [
      { type: 'pc', label: 'PC', color: '#34d399', family: 'end' },
      { type: 'laptop', label: 'Laptop', color: '#2dd4bf', family: 'end' },
      { type: 'server', label: 'Server', color: '#60a5fa', family: 'end' },
      { type: 'printer', label: 'Printer', color: '#fda4af', family: 'end' },
      { type: 'ip-phone', label: 'IP Phone', color: '#93c5fd', family: 'end' },
      { type: 'iot-device', label: 'IoT Device', color: '#a3e635', family: 'end' },
    ],
  },
  {
    title: 'Network Devices',
    items: [
      { type: 'router', label: 'Router', color: '#f59e0b', family: 'network' },
      { type: 'switch', label: 'Switch', color: '#22d3ee', family: 'network' },
      { type: 'hub', label: 'Hub', color: '#38bdf8', family: 'network' },
      { type: 'access-point', label: 'Access Point', color: '#818cf8', family: 'network' },
      { type: 'firewall', label: 'Firewall', color: '#f43f5e', family: 'network' },
    ],
  },
  {
    title: 'Transmission Media',
    items: [
      { type: 'ethernet-cable', label: 'Ethernet Cable', color: '#fbbf24', family: 'media' },
      { type: 'fiber-cable', label: 'Fiber Cable', color: '#c084fc', family: 'media' },
      { type: 'wireless-link', label: 'Wireless Link', color: '#e879f9', family: 'media' },
    ],
  },
  {
    title: 'Services',
    items: [
      { type: 'dns-server', label: 'DNS Server', color: '#06b6d4', family: 'service' },
      { type: 'dhcp-server', label: 'DHCP Server', color: '#14b8a6', family: 'service' },
      { type: 'web-server', label: 'Web Server', color: '#0ea5e9', family: 'service' },
      { type: 'ftp-server', label: 'FTP Server', color: '#2563eb', family: 'service' },
    ],
  },
  {
    title: 'WAN / Cloud',
    items: [
      { type: 'internet-cloud', label: 'Internet Cloud', color: '#a78bfa', family: 'wan' },
      { type: 'isp-node', label: 'ISP Node', color: '#f472b6', family: 'wan' },
      { type: 'modem', label: 'Modem', color: '#fb7185', family: 'wan' },
    ],
  },
]

const COMPONENT_LIBRARY = COMPONENT_CATEGORIES.flatMap((group) => group.items)
const STATUS_OPTIONS = ['active', 'inactive']

const SUBNET_MASKS = new Set([
  '255.0.0.0', '255.128.0.0', '255.192.0.0', '255.224.0.0', '255.240.0.0', '255.248.0.0',
  '255.252.0.0', '255.254.0.0', '255.255.0.0', '255.255.128.0', '255.255.192.0',
  '255.255.224.0', '255.255.240.0', '255.255.248.0', '255.255.252.0', '255.255.254.0',
  '255.255.255.0', '255.255.255.128', '255.255.255.192', '255.255.255.224',
  '255.255.255.240', '255.255.255.248', '255.255.255.252', '255.255.255.254',
])

const typeHeights = {
  router: 0.5,
  switch: 0.35,
  pc: 0.45,
  server: 0.6,
  firewall: 0.55,
  laptop: 0.35,
  printer: 0.3,
  'ip-phone': 0.28,
  'iot-device': 0.26,
  hub: 0.33,
  'access-point': 0.35,
  'ethernet-cable': 0.2,
  'fiber-cable': 0.2,
  'wireless-link': 0.2,
  'dns-server': 0.55,
  'dhcp-server': 0.55,
  'web-server': 0.55,
  'ftp-server': 0.55,
  'internet-cloud': 0.65,
  'isp-node': 0.45,
  modem: 0.35,
}

function toIpOctets(ip) {
  return ip.split('.').map((n) => Number(n))
}

function isValidIPv4(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every((part) => {
    if (part === '' || Number.isNaN(Number(part))) return false
    const n = Number(part)
    return n >= 0 && n <= 255 && String(n) === String(Number(part))
  })
}

function isValidMac(mac) {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac)
}

function isValidSubnetMask(mask) {
  return SUBNET_MASKS.has(mask)
}

function networkKey(ip, mask) {
  if (!isValidIPv4(ip) || !isValidIPv4(mask)) return 'unassigned'
  const a = toIpOctets(ip)
  const b = toIpOctets(mask)
  return `${a[0] & b[0]}.${a[1] & b[1]}.${a[2] & b[2]}.${a[3] & b[3]}/${mask}`
}

function generateMac() {
  const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join(':').toUpperCase()
}

function getNodeValidation(node) {
  const issues = []
  if (!node.config.name.trim()) issues.push('Name is required')
  if (!isValidIPv4(node.config.ipAddress)) issues.push('Invalid IP address')
  if (!isValidSubnetMask(node.config.subnetMask)) issues.push('Invalid subnet mask')
  if (!isValidMac(node.config.macAddress)) issues.push('Invalid MAC address')
  return { valid: issues.length === 0, issues }
}

function getMediaColor(media) {
  if (media === 'fiber-cable') return '#a78bfa'
  if (media === 'wireless-link') return '#f472b6'
  return '#fbbf24'
}

function findNode(nodes, id) {
  return nodes.find((node) => node.id === id)
}

function getPointOnPolyline(points, t) {
  if (points.length === 0) return [0, 0, 0]
  if (points.length === 1) return points[0]

  const segmentCount = points.length - 1
  const scaled = Math.max(0, Math.min(0.9999, t)) * segmentCount
  const index = Math.floor(scaled)
  const localT = scaled - index

  const p0 = points[index]
  const p1 = points[index + 1]
  return [
    p0[0] + (p1[0] - p0[0]) * localT,
    p0[1] + (p1[1] - p0[1]) * localT,
    p0[2] + (p1[2] - p0[2]) * localT,
  ]
}

function PacketActor({ points, color, speed = 0.08, offset = 0, dropped = false }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    if (!ref.current || dropped) return
    const t = (clock.elapsedTime * speed + offset) % 1
    const [x, y, z] = getPointOnPolyline(points, t)
    ref.current.position.set(x, y + 0.25, z)
  })

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.14, 18, 18]} />
      <meshStandardMaterial color={dropped ? '#ef4444' : color} emissive={dropped ? '#ef4444' : color} emissiveIntensity={0.75} />
    </mesh>
  )
}

// Bitstream visualization component
function BitActor({ position, color = '#ffff00' }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  )
}

function DeviceMesh({ node, selected, hasError, isHot, onClick, onMove, onMoveStart, onMoveEnd }) {
  const [x, y, z] = node.position
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const hitPointRef = useRef(new THREE.Vector3())

  const family = COMPONENT_LIBRARY.find((item) => item.type === node.type)?.family || 'end'
  const label = node.config?.name || node.label

  const geometry = {
    router: <cylinderGeometry args={[0.7, 0.7, 0.45, 24]} />,
    switch: <boxGeometry args={[1.25, 0.25, 0.75]} />,
    pc: <boxGeometry args={[0.9, 0.5, 0.18]} />,
    server: <boxGeometry args={[0.65, 1, 0.65]} />,
    firewall: <coneGeometry args={[0.55, 1, 24]} />,
    laptop: <boxGeometry args={[0.95, 0.2, 0.68]} />,
    printer: <boxGeometry args={[0.8, 0.35, 0.65]} />,
    'ip-phone': <boxGeometry args={[0.65, 0.18, 0.5]} />,
    'iot-device': <sphereGeometry args={[0.24, 18, 18]} />,
    hub: <sphereGeometry args={[0.42, 18, 18]} />,
    'access-point': <coneGeometry args={[0.42, 0.7, 18]} />,
    'ethernet-cable': <boxGeometry args={[1.4, 0.08, 0.08]} />,
    'fiber-cable': <boxGeometry args={[1.4, 0.08, 0.08]} />,
    'wireless-link': <torusGeometry args={[0.38, 0.08, 12, 24]} />,
    'dns-server': <boxGeometry args={[0.62, 1, 0.62]} />,
    'dhcp-server': <boxGeometry args={[0.62, 1, 0.62]} />,
    'web-server': <boxGeometry args={[0.62, 1, 0.62]} />,
    'ftp-server': <boxGeometry args={[0.62, 1, 0.62]} />,
    'internet-cloud': <sphereGeometry args={[0.65, 20, 20]} />,
    'isp-node': <dodecahedronGeometry args={[0.5, 0]} />,
    modem: <boxGeometry args={[0.8, 0.28, 0.5]} />,
  }

  const statusColor = hasError ? '#ef4444' : isHot ? '#facc15' : node.config.status === 'active' ? '#22c55e' : '#64748b'
  const emissiveColor = hasError ? '#ef4444' : selected ? '#22d3ee' : '#000000'

  return (
    <group
      position={[x, y, z]}
      onPointerDown={(e) => {
        e.stopPropagation()
        draggingRef.current = true
        movedRef.current = false
        onMoveStart()
        e.target.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return
        e.stopPropagation()
        const hit = e.ray.intersectPlane(dragPlaneRef.current, hitPointRef.current)
        if (!hit) return
        movedRef.current = true
        onMove(node.id, hitPointRef.current.x, hitPointRef.current.z)
      }}
      onPointerUp={(e) => {
        if (!draggingRef.current) return
        e.stopPropagation()
        draggingRef.current = false
        onMoveEnd()
        e.target.releasePointerCapture(e.pointerId)
        if (!movedRef.current) onClick(node.id)
      }}
    >
      <mesh castShadow receiveShadow>
        {geometry[node.type] || <boxGeometry args={[0.75, 0.4, 0.75]} />}
        <meshStandardMaterial color={node.color} emissive={emissiveColor} emissiveIntensity={selected || hasError ? 0.6 : 0} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, -y + 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[family === 'wan' ? 1.1 : 0.9, family === 'wan' ? 1.1 : 0.9, 0.06, 24]} />
        <meshStandardMaterial color={selected ? '#22d3ee' : '#1f2937'} opacity={0.9} transparent />
      </mesh>
      <mesh position={[0, y + 0.35, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.65} />
      </mesh>
      <Html position={[0, y + 0.63, 0]} center distanceFactor={22}>
        <div className="px-2 py-0.5 rounded bg-black/70 border border-cyan-900/40 text-[10px] text-cyan-100 whitespace-nowrap">
          {label}
        </div>
      </Html>
    </group>
  )
}

export default function LabBuilder3D({ onBack }) {
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [selectedNodeIds, setSelectedNodeIds] = useState([])
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [selectedMedia, setSelectedMedia] = useState('ethernet-cable')
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [pendingAddType, setPendingAddType] = useState('router')

  const [simulationMode, setSimulationMode] = useState('complete')
  const [selectedLayerId, setSelectedLayerId] = useState('network')
  const [simulationStatus, setSimulationStatus] = useState('stopped')
  const [simulationPlan, setSimulationPlan] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [currentLayer, setCurrentLayer] = useState(null)
  const [currentNode, setCurrentNode] = useState(null)
  const [packetState, setPacketState] = useState(null)

  const [simulationInput, setSimulationInput] = useState({
    sourceId: '',
    destinationId: '',
    dataType: 'Text',
    protocol: 'TCP',
    payload: 'Hello from NetViz3D',
    port: '8080',
    packetSize: '256',
    mss: '1460', // Max Segment Size
  })

  const [errorToggles, setErrorToggles] = useState({
    packetLoss: false,
    highLatency: false,
    congestion: false,
  })

  // Protocol Simulation States
  const [protocolStack, setProtocolStack] = useState(null)
  const [protocolDashboardData, setProtocolDashboardData] = useState(null)
  const [protocolSimulation, setProtocolSimulation] = useState(null)
  const [protocolTimeline, setProtocolTimeline] = useState(null)
  const [protocolBitstream, setProtocolBitstream] = useState(null)
  const [protocolDecapsulation, setProtocolDecapsulation] = useState(null)
  const [protocolStatus, setProtocolStatus] = useState('idle') // idle, calculating, animating, validating, complete
  const [calculationHistory, setCalculationHistory] = useState([])
  const [transmissionEvents, setTransmissionEvents] = useState([])
  const [protocolAnimationProgress, setProtocolAnimationProgress] = useState(0)
  const [receiverConsole, setReceiverConsole] = useState(null)
  const [dashboardMinimized, setDashboardMinimized] = useState(false)

  const [dropHint, setDropHint] = useState('Drag a component into the canvas to place it')
  const fileInputRef = useRef(null)
  const timerRef = useRef(null)
  const protocolTimerRef = useRef(null)

  const graphAdjacency = useMemo(() => buildAdjacency(nodes, links), [nodes, links])

  const nodeValidationMap = useMemo(() => {
    const map = {}
    nodes.forEach((node) => {
      map[node.id] = getNodeValidation(node)
    })
    return map
  }, [nodes])

  const subnetClusters = useMemo(() => {
    const groups = {}
    nodes.forEach((node) => {
      const key = networkKey(node.config.ipAddress, node.config.subnetMask)
      if (!groups[key]) groups[key] = []
      groups[key].push(node.id)
    })
    return groups
  }, [nodes])

  const nodeClusterKeyMap = useMemo(() => {
    const map = {}
    Object.entries(subnetClusters).forEach(([key, ids]) => {
      ids.forEach((id) => {
        map[id] = key
      })
    })
    return map
  }, [subnetClusters])

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const simulationPathPoints = useMemo(() => {
    const pathIds = simulationPlan?.pathNodeIds || []
    return pathIds
      .map((id) => findNode(nodes, id))
      .filter(Boolean)
      .map((node) => [node.position[0], node.position[1], node.position[2]])
  }, [simulationPlan, nodes])

  const currentStep = useMemo(() => {
    if (!simulationPlan || currentStepIndex < 0) return null
    return simulationPlan.steps[currentStepIndex] || null
  }, [simulationPlan, currentStepIndex])

  const selectedNodeNames = useMemo(() => {
    return selectedNodeIds
      .map((id) => findNode(nodes, id))
      .filter(Boolean)
      .map((node) => node.config.name)
  }, [selectedNodeIds, nodes])

  const pathNodeIds = currentStep?.pathNodeIds || []
  const activePathEdgeIds = currentStep?.activeEdgeIds || []

  const nextNameForType = (type, currentNodes) => {
    const count = currentNodes.filter((node) => node.type === type).length + 1
    return `${type.toUpperCase()}-${count}`
  }

  const setStepState = (stepIndex) => {
    if (!simulationPlan) return
    const step = simulationPlan.steps[stepIndex]
    if (!step) return
    setCurrentStepIndex(stepIndex)
    setCurrentLayer(step.layerId)
    setCurrentNode(step.currentNodeId || null)
    setPacketState(step.packetState)
    setDropHint(step.description)
  }

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const advanceSimulationStep = () => {
    if (!simulationPlan) return
    const nextIndex = currentStepIndex + 1
    if (nextIndex >= simulationPlan.steps.length) {
      setSimulationStatus('stopped')
      clearTimer()
      setDropHint('OSI simulation completed successfully.')
      return
    }
    setStepState(nextIndex)
  }

  useEffect(() => {
    clearTimer()
    if (simulationStatus !== 'running' || !currentStep) return () => {}

    const duration = getStepDurationMs(currentStep, errorToggles)
    timerRef.current = setTimeout(() => {
      advanceSimulationStep()
    }, duration)

    return () => clearTimer()
  }, [simulationStatus, currentStepIndex, currentStep, errorToggles])

  useEffect(() => () => clearTimer(), [])

  const addNodeAt = (type, x, z) => {
    const component = COMPONENT_LIBRARY.find((item) => item.type === type)
    if (!component) return

    const applySnap = (v) => (snapToGrid ? Math.round(v) : Number(v.toFixed(2)))

    setNodes((prevNodes) => {
      const id = `lab-${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      const y = typeHeights[type] || 0.45
      const safeX = applySnap(Math.max(-14, Math.min(14, x)))
      const safeZ = applySnap(Math.max(-10, Math.min(10, z)))
      const defaultName = nextNameForType(type, prevNodes)

      const newNode = {
        id,
        type,
        label: defaultName,
        color: component.color,
        position: [safeX, y, safeZ],
        config: {
          name: defaultName,
          ipAddress: '192.168.1.10',
          subnetMask: '255.255.255.0',
          macAddress: generateMac(),
          deviceType: type,
          status: 'active',
        },
      }

      const nextNodes = [...prevNodes, newNode]
      setSelectedNodeId(id)
      setSimulationInput((prev) => ({
        ...prev,
        sourceId: prev.sourceId || id,
      }))
      return nextNodes
    })
  }

  const addNodeAtCenter = () => {
    addNodeAt(pendingAddType, 0, 0)
  }

  const handleCanvasDrop = (event) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/x-netviz-component')
    if (!type) return

    const rect = event.currentTarget.getBoundingClientRect()
    const normX = (event.clientX - rect.left) / rect.width
    const normY = (event.clientY - rect.top) / rect.height

    const worldX = (normX - 0.5) * 28
    const worldZ = (normY - 0.5) * 20

    addNodeAt(type, worldX, worldZ)
    setDropHint(`${type.toUpperCase()} placed at (${worldX.toFixed(1)}, ${worldZ.toFixed(1)})`)
  }

  const handleNodeSelect = (nodeId) => {
    setSelectedNodeId(nodeId)
    setSelectedNodeIds((prev) => {
      if (prev.includes(nodeId)) {
        return prev.filter((id) => id !== nodeId)
      }
      if (prev.length >= 2) {
        return [prev[1], nodeId]
      }
      return [...prev, nodeId]
    })
  }

  const handleNodeMove = (nodeId, nextX, nextZ) => {
    const applySnap = (v) => (snapToGrid ? Math.round(v) : Number(v.toFixed(2)))

    setNodes((prev) => prev.map((node) => {
      if (node.id !== nodeId) return node
      const clampedX = applySnap(Math.max(-14, Math.min(14, nextX)))
      const clampedZ = applySnap(Math.max(-10, Math.min(10, nextZ)))
      return {
        ...node,
        position: [clampedX, node.position[1], clampedZ],
      }
    }))
  }

  const connectSelectedNodes = () => {
    if (selectedNodeIds.length !== 2) return

    const [a, b] = selectedNodeIds
    const exists = links.some((edge) => {
      return (edge.source === a && edge.target === b) || (edge.source === b && edge.target === a)
    })
    if (exists) return

    setLinks((prev) => [...prev, {
      id: `link-${Date.now()}`,
      source: a,
      target: b,
      media: selectedMedia,
      status: 'active',
    }])
    setSelectedNodeIds([])
    setSelectedLinkId(null)
    setDropHint('Connection created successfully.')
  }

  const deleteSelectedConnection = () => {
    if (!selectedLinkId) return
    setLinks((prev) => prev.filter((edge) => edge.id !== selectedLinkId))
    setSelectedLinkId(null)
  }

  const removeSelectedNode = () => {
    if (selectedNodeIds.length !== 1) return
    const toRemove = selectedNodeIds[0]

    setNodes((prev) => prev.filter((node) => node.id !== toRemove))
    setLinks((prev) => prev.filter((edge) => edge.source !== toRemove && edge.target !== toRemove))
    setSelectedNodeIds([])
    setSelectedNodeId(null)
    setSelectedLinkId(null)
  }

  const resetSimulation = () => {
    clearTimer()
    setSimulationStatus('stopped')
    setSimulationPlan(null)
    setCurrentStepIndex(-1)
    setCurrentLayer(null)
    setCurrentNode(null)
    setPacketState(null)
    setDropHint('Simulation reset.')
  }

  const findNodeByAlias = (list, alias) => {
    if (!alias) return null
    const normalized = String(alias).trim().toLowerCase()

    return list.find((node) => {
      const name = node.config?.name?.toLowerCase() || ''
      const type = node.type?.toLowerCase() || ''
      const id = node.id?.toLowerCase() || ''
      return name === normalized
        || id === normalized
        || name.includes(normalized)
        || normalized.includes(name)
        || type === normalized
    }) || null
  }

  const applyReplaceTopology = (payload) => {
    const topology = payload?.topology || payload
    if (!topology || !Array.isArray(topology.nodes) || !Array.isArray(topology.edges)) return

    const nodeIdMap = {}
    const generatedNodes = topology.nodes.map((item, idx) => {
      const component = COMPONENT_LIBRARY.find((entry) => entry.type === item.type)
      const type = component?.type || 'pc'
      const id = `lab-ai-${type}-${Date.now()}-${idx}`
      nodeIdMap[idx] = id
      const y = typeHeights[type] || 0.45
      const x = Math.max(-14, Math.min(14, Number(item.x) || 0))
      const z = Math.max(-10, Math.min(10, Number(item.z) || 0))
      const name = item.name || `${type.toUpperCase()}-${idx + 1}`

      return {
        id,
        type,
        label: name,
        color: component?.color || '#34d399',
        position: [x, y, z],
        config: {
          name,
          ipAddress: `192.168.1.${10 + idx}`,
          subnetMask: '255.255.255.0',
          macAddress: generateMac(),
          deviceType: type,
          status: 'active',
        },
      }
    })

    const generatedEdges = topology.edges.map((edge, idx) => ({
      id: `link-ai-${Date.now()}-${idx}`,
      source: nodeIdMap[edge.from],
      target: nodeIdMap[edge.to],
      media: edge.media || 'ethernet-cable',
      status: 'active',
    })).filter((edge) => edge.source && edge.target && edge.source !== edge.target)

    setNodes(generatedNodes)
    setLinks(generatedEdges)
    setSelectedNodeIds([])
    setSelectedNodeId(generatedNodes[0]?.id || null)
    setSelectedLinkId(null)
    resetSimulation()
    setSimulationInput((prev) => ({
      ...prev,
      sourceId: generatedNodes[0]?.id || '',
      destinationId: generatedNodes[generatedNodes.length - 1]?.id || '',
    }))
    setDropHint(topology.summary || `AI generated ${generatedNodes.length} nodes and ${generatedEdges.length} links.`)
  }

  const applyModifyOperations = (command) => {
    const operations = Array.isArray(command?.operations) ? command.operations : []
    if (operations.length === 0) return

    let nextNodes = [...nodes]
    let nextLinks = [...links]

    operations.forEach((operation, opIndex) => {
      if (operation.type === 'add') {
        const count = Math.max(1, Number(operation.count || 1))
        const deviceType = operation.deviceType || 'pc'
        const component = COMPONENT_LIBRARY.find((entry) => entry.type === deviceType)
        if (!component) return

        const baseCount = nextNodes.length
        for (let i = 0; i < count; i += 1) {
          const id = `lab-ai-edit-${deviceType}-${Date.now()}-${opIndex}-${i}`
          const idx = baseCount + i
          const angle = (Math.PI * 2 * idx) / Math.max(6, baseCount + count)
          const radius = 7 + (idx % 3)
          const x = Math.cos(angle) * radius
          const z = Math.sin(angle) * radius
          const y = typeHeights[deviceType] || 0.45
          const sameTypeCount = nextNodes.filter((n) => n.type === deviceType).length + 1
          const name = `${deviceType.toUpperCase()}-${sameTypeCount}`

          nextNodes.push({
            id,
            type: deviceType,
            label: name,
            color: component.color,
            position: [x, y, z],
            config: {
              name,
              ipAddress: `192.168.1.${10 + nextNodes.length}`,
              subnetMask: '255.255.255.0',
              macAddress: generateMac(),
              deviceType,
              status: 'active',
            },
          })
        }
        return
      }

      if (operation.type === 'remove') {
        const targetNode = findNodeByAlias(nextNodes, operation.target)
        if (!targetNode) return
        nextNodes = nextNodes.filter((node) => node.id !== targetNode.id)
        nextLinks = nextLinks.filter((edge) => edge.source !== targetNode.id && edge.target !== targetNode.id)
        return
      }

      if (operation.type === 'remove-type') {
        const count = Math.max(1, Number(operation.count || 1))
        const candidates = nextNodes.filter((node) => node.type === operation.deviceType).slice(-count)
        const removeIds = new Set(candidates.map((node) => node.id))
        if (removeIds.size === 0) return
        nextNodes = nextNodes.filter((node) => !removeIds.has(node.id))
        nextLinks = nextLinks.filter((edge) => !removeIds.has(edge.source) && !removeIds.has(edge.target))
        return
      }

      if (operation.type === 'connect') {
        const a = findNodeByAlias(nextNodes, operation.a)
        const b = findNodeByAlias(nextNodes, operation.b)
        if (!a || !b || a.id === b.id) return
        const exists = nextLinks.some((edge) => {
          return (edge.source === a.id && edge.target === b.id) || (edge.source === b.id && edge.target === a.id)
        })
        if (exists) return

        nextLinks.push({
          id: `link-ai-edit-${Date.now()}-${opIndex}`,
          source: a.id,
          target: b.id,
          media: operation.media || 'ethernet-cable',
          status: 'active',
        })
        return
      }

      if (operation.type === 'disconnect') {
        const a = findNodeByAlias(nextNodes, operation.a)
        const b = findNodeByAlias(nextNodes, operation.b)
        if (!a || !b) return
        nextLinks = nextLinks.filter((edge) => {
          return !((edge.source === a.id && edge.target === b.id) || (edge.source === b.id && edge.target === a.id))
        })
        return
      }

      if (operation.type === 'rename') {
        const targetNode = findNodeByAlias(nextNodes, operation.target)
        if (!targetNode) return
        nextNodes = nextNodes.map((node) => {
          if (node.id !== targetNode.id) return node
          return {
            ...node,
            label: operation.newName,
            config: {
              ...node.config,
              name: operation.newName,
            },
          }
        })
        return
      }

      if (operation.type === 'change-type') {
        const targetNode = findNodeByAlias(nextNodes, operation.target)
        if (!targetNode) return
        const newTypeComponent = COMPONENT_LIBRARY.find((item) => item.type === operation.newType)
        if (!newTypeComponent) return

        nextNodes = nextNodes.map((node) => {
          if (node.id !== targetNode.id) return node
          const newY = typeHeights[operation.newType] || 0.45
          return {
            ...node,
            type: operation.newType,
            color: newTypeComponent.color,
            position: [node.position[0], newY, node.position[2]],
            config: {
              ...node.config,
              deviceType: operation.newType,
            },
          }
        })
        return
      }

      if (operation.type === 'set-config') {
        const targetNode = findNodeByAlias(nextNodes, operation.target)
        if (!targetNode) return
        nextNodes = nextNodes.map((node) => {
          if (node.id !== targetNode.id) return node
          return {
            ...node,
            config: {
              ...node.config,
              [operation.key]: operation.value,
            },
          }
        })
      }
    })

    setNodes(nextNodes)
    setLinks(nextLinks)
    setSelectedNodeIds([])
    setSelectedNodeId(nextNodes[0]?.id || null)
    setSelectedLinkId(null)
    resetSimulation()
    setSimulationInput((prev) => ({
      ...prev,
      sourceId: prev.sourceId && findNodeByAlias(nextNodes, prev.sourceId) ? prev.sourceId : (nextNodes[0]?.id || ''),
      destinationId: prev.destinationId && findNodeByAlias(nextNodes, prev.destinationId) ? prev.destinationId : (nextNodes[nextNodes.length - 1]?.id || ''),
    }))
    setDropHint(command.summary || 'Topology updated via chatbot command.')
  }

  const applyTopologyCommand = (payload) => {
    const command = payload?.command
    if (command?.mode === 'modify') {
      applyModifyOperations(command)
      return
    }

    if (command?.mode === 'replace') {
      applyReplaceTopology(command)
      return
    }

    applyReplaceTopology(payload)
  }

  const clearTopology = () => {
    setNodes([])
    setLinks([])
    setSelectedNodeIds([])
    setSelectedNodeId(null)
    setSelectedLinkId(null)
    resetSimulation()
    setSimulationInput((prev) => ({ ...prev, sourceId: '', destinationId: '' }))
    setDropHint('Topology reset. Start building again.')
  }

  const updateNodeConfig = (nodeId, key, value) => {
    setNodes((prev) => prev.map((node) => {
      if (node.id !== nodeId) return node
      return {
        ...node,
        config: {
          ...node.config,
          [key]: value,
        },
      }
    }))
  }

  const saveTopology = () => {
    const payload = {
      nodes,
      edges: links,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab-topology-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadTopology = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const nextNodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
      const nextEdges = Array.isArray(parsed.edges) ? parsed.edges : []
      setNodes(nextNodes)
      setLinks(nextEdges)
      setSelectedNodeIds([])
      setSelectedNodeId(null)
      setSelectedLinkId(null)
      resetSimulation()
      setDropHint('Topology loaded successfully.')
    } catch {
      setDropHint('Failed to load topology file.')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const startSimulation = () => {
    const sourceNode = findNode(nodes, simulationInput.sourceId)
    const destinationNode = findNode(nodes, simulationInput.destinationId)

    const plan = createSimulationPlan({
      mode: simulationMode,
      selectedLayer: selectedLayerId,
      input: simulationInput,
      sourceNode,
      destinationNode,
      nodes,
      edges: links,
      errorToggles,
    })

    if (!plan.valid) {
      setDropHint(plan.reason)
      return
    }

    setSimulationPlan(plan)
    setSimulationStatus('running')
    setStepState(0)
  }

  const pauseSimulation = () => {
    if (simulationStatus !== 'running') return
    setSimulationStatus('paused')
    clearTimer()
  }

  const resumeSimulation = () => {
    if (simulationStatus !== 'paused') return
    setSimulationStatus('running')
  }

  const stopSimulation = () => {
    clearTimer()
    setSimulationStatus('stopped')
    setDropHint('Simulation stopped.')
  }

  const stepSimulation = () => {
    if (!simulationPlan) {
      const sourceNode = findNode(nodes, simulationInput.sourceId)
      const destinationNode = findNode(nodes, simulationInput.destinationId)
      const plan = createSimulationPlan({
        mode: simulationMode,
        selectedLayer: selectedLayerId,
        input: simulationInput,
        sourceNode,
        destinationNode,
        nodes,
        edges: links,
        errorToggles,
      })

      if (!plan.valid) {
        setDropHint(plan.reason)
        return
      }

      setSimulationPlan(plan)
      setSimulationStatus('paused')
      setStepState(0)
      return
    }

    setSimulationStatus('paused')
    advanceSimulationStep()
  }

  // Protocol Simulation Handlers
  const addCalculationStep = (operation, result, details = '') => {
    const stepText = `${operation}: ${result}${details ? ` (${details})` : ''}`
    setCalculationHistory((prev) => [...prev, stepText])
  }

  const handleSendProtocolData = async () => {
    const sourceNode = findNode(nodes, simulationInput.sourceId)
    const destNode = findNode(nodes, simulationInput.destinationId)

    if (!sourceNode || !destNode) {
      setDropHint('Select both source and destination nodes.')
      return
    }

    setProtocolStatus('calculating')
    setCalculationHistory([])
    setTransmissionEvents([])
    setProtocolAnimationProgress(0)

    try {
      // Step 1: Calculate all protocols with custom MSS
      const mssValue = parseInt(simulationInput.mss) || 1460
      const mtuValue = parseInt(simulationInput.packetSize) || 1500
      
      const stack = calculateCompleteProtocolStack({
        applicationData: simulationInput.payload,
        sourceIp: sourceNode.config.ipAddress,
        destIp: destNode.config.ipAddress,
        sourcePort: parseInt(simulationInput.port) || 5000,
        destPort: parseInt(simulationInput.port) + 80 || 8080,
        protocol: simulationInput.protocol,
        packetLength: mtuValue,
        bandwidth: 1e9, // 1 Gbps
        distance: 100, // meters
        mss: mssValue,
        mtu: mtuValue,
        ttl: 64,
        errorRate: errorToggles.packetLoss ? 0.05 : 0,
      })

      setProtocolStack(stack)

      // Transform stack data into dashboard format with proper structure
      const dashboardData = {
        calculations: {
          timestamp: new Date().toISOString(),
        },
        layers: {
          transport: stack.layers.transport,
          network: stack.layers.network,
          datalink: stack.layers.datalink,
          physical: {
            delays: {
              transmission: stack.summary?.delays?.transmission || 0,
              propagation: stack.summary?.delays?.propagation || 0,
              processing: stack.summary?.delays?.processing || 0,
              queue: 0,
              total: stack.summary?.delays?.total || 0,
            },
            total: {
              delayMs: stack.summary?.delays?.total || 0,
            },
            bitStream: stack.timeline?.bitStream || '11010110',
          },
        },
        config: {
          userInput: simulationInput.payload,
        },
        summary: {
          bytes: {
            payload: simulationInput.payload.length,
            totalFrame: (stack.summary?.bytes?.totalFrame || (simulationInput.payload.length + 38)),
          },
          delays: {
            transmission: stack.summary?.delays?.transmission || 0,
            propagation: stack.summary?.delays?.propagation || 0,
            processing: stack.summary?.delays?.processing || 0,
            total: stack.summary?.delays?.total || 0,
          },
          totalSegments: stack.summary?.totalSegments || stack.layers.transport.totalSegments,
        },
      }

      setProtocolDashboardData(dashboardData)
      addCalculationStep('Segmentation', `${stack.summary?.totalSegments || stack.layers.transport.totalSegments} segments`, `MSS=${mssValue}B`)
      addCalculationStep('CRC-32', stack.layers.datalink.crc32, 'Polynomial 0xEDB88320')
      const totalDly = stack.summary?.delays?.total || stack.timeline?.totalTime || 0
      const transDly = stack.summary?.delays?.transmission || stack.layers.physical?.delays?.transmission || 0
      const propDly = stack.summary?.delays?.propagation || stack.layers.physical?.delays?.propagation || 0
      addCalculationStep('Total Delay', `${totalDly.toFixed(3)}ms`, 
        `d_trans=${transDly.toFixed(3)}ms + d_prop=${propDly.toFixed(3)}ms`)

      // Step 2: Create network simulation
      const sim = new NetworkSimulation(stack)
      setProtocolSimulation(sim)

      // Step 3: Generate traversal timeline
      const distanceMeters = Math.hypot(
        destNode.position[0] - sourceNode.position[0],
        destNode.position[2] - sourceNode.position[2]
      ) * 10 // scale for visualization

      const totalDelaySeconds = stack.summary?.delays?.total || stack.timeline?.totalTime || 0.01
      const timeline = generateTraversalTimeline({
        sourceNode,
        destNode,
        numHops: 2,
        totalDelay: totalDelaySeconds / 1000, // Convert ms to seconds
        wireLength: 500, // pixels for animation
      })

      setProtocolTimeline(timeline)
      setTransmissionEvents(timeline.phases)

      // Step 4: Generate bitstream
      const bits = generateBitstream(stack.layers.physical.bitStream)
      setProtocolBitstream(bits)

      // Step 5: Setup receiver validation
      const dec = new CompleteDecapsulation(stack, destNode, '')
      setProtocolDecapsulation(dec)

      const receiverLog = new ReceiverConsole()
      setReceiverConsole(receiverLog)

      setProtocolStatus('animating')
      setDropHint('📤 Transmission started - watching bitstream animation...')
    } catch (error) {
      console.error('Protocol simulation error:', error)
      setDropHint('Error during protocol simulation: ' + error.message)
      setProtocolStatus('idle')
    }
  }

  const handleCompleteProtocolReceiver = () => {
    if (!protocolDecapsulation) return

    setProtocolStatus('validating')

    const integrityCheck = protocolDecapsulation.performIntegrityCheck()
    const decapSteps = protocolDecapsulation.getDecapsulationSteps()

    if (integrityCheck.valid) {
      const finalData = protocolDecapsulation.deliverToApplication()
      setDropHint('✅ Reception complete - Data validated and delivered successfully!')
      if (receiverConsole) {
        receiverConsole.logValidFrame(integrityCheck)
      }
    } else {
      const errorState = protocolDecapsulation.generateErrorState(integrityCheck.errorType)
      setDropHint('❌ Reception error - ' + (integrityCheck.errorType || 'Unknown'))
      if (receiverConsole) {
        receiverConsole.logCorruptedFrame(integrityCheck)
      }
    }

    setProtocolStatus('complete')
  }

  const resetProtocolSimulation = () => {
    if (protocolTimerRef.current) {
      clearTimeout(protocolTimerRef.current)
      protocolTimerRef.current = null
    }
    setProtocolStatus('idle')
    setProtocolStack(null)
    setProtocolDashboardData(null)
    setProtocolSimulation(null)
    setProtocolTimeline(null)
    setProtocolBitstream(null)
    setProtocolDecapsulation(null)
    setCalculationHistory([])
    setTransmissionEvents([])
    setProtocolAnimationProgress(0)
    setReceiverConsole(null)
    setDropHint('Protocol simulation reset.')
  }

  // Animation loop for protocol bitstream
  useEffect(() => {
    if (protocolStatus !== 'animating' || !protocolTimeline) {
      return
    }

    const totalDuration = protocolTimeline.totalDuration || 3

    let startTime = Date.now()

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = Math.min(1, elapsed / totalDuration)

      setProtocolAnimationProgress(progress)

      if (progress >= 1) {
        setProtocolAnimationProgress(1)
        handleCompleteProtocolReceiver()
        return
      }

      protocolTimerRef.current = requestAnimationFrame(animate)
    }

    protocolTimerRef.current = requestAnimationFrame(animate)

    return () => {
      if (protocolTimerRef.current) {
        cancelAnimationFrame(protocolTimerRef.current)
      }
    }
  }, [protocolStatus, protocolTimeline])

  const currentPacketColor = useMemo(() => {
    if (!currentStep) return '#22d3ee'
    if (currentStep.type === 'event' && currentStep.severity === 'error') return '#ef4444'
    return getLayerColor(currentStep.layerId)
  }, [currentStep])

  const packetSpeed = currentStep ? getPacketAnimationSpeed(currentStep, errorToggles) : 0.06

  useEffect(() => {
    const onGeneratedTopology = (event) => {
      applyTopologyCommand(event.detail)
    }

    window.addEventListener('netviz:generate-topology', onGeneratedTopology)

    const pendingRaw = localStorage.getItem('netviz:pendingTopology')
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw)
        applyTopologyCommand(pending)
      } catch (error) {
        console.error('Failed to parse pending topology:', error)
      } finally {
        localStorage.removeItem('netviz:pendingTopology')
      }
    }

    return () => {
      window.removeEventListener('netviz:generate-topology', onGeneratedTopology)
    }
  }, [])

  // Dynamically update Protocol Calculations dashboard when simulation input changes
  useEffect(() => {
    if (!protocolStack || protocolStatus === 'idle') {
      return
    }

    const sourceNode = findNode(nodes, simulationInput.sourceId)
    const destNode = findNode(nodes, simulationInput.destinationId)

    if (!sourceNode || !destNode) {
      return
    }

    try {
      // Recalculate protocol stack with updated input
      const mssValue = parseInt(simulationInput.mss) || 1460
      const mtuValue = parseInt(simulationInput.packetSize) || 1500

      const updatedStack = calculateCompleteProtocolStack({
        applicationData: simulationInput.payload,
        sourceIp: sourceNode.config.ipAddress,
        destIp: destNode.config.ipAddress,
        sourcePort: parseInt(simulationInput.port) || 5000,
        destPort: parseInt(simulationInput.port) + 80 || 8080,
        protocol: simulationInput.protocol,
        packetLength: mtuValue,
        bandwidth: 1e9, // 1 Gbps
        distance: 100, // meters
        mss: mssValue,
        mtu: mtuValue,
        ttl: 64,
        errorRate: errorToggles.packetLoss ? 0.05 : 0,
      })

      // Update dashboard data with recalculated values
      const updatedDashboardData = {
        calculations: {
          timestamp: new Date().toISOString(),
        },
        layers: {
          transport: updatedStack.layers.transport,
          network: updatedStack.layers.network,
          datalink: updatedStack.layers.datalink,
          physical: {
            delays: {
              transmission: updatedStack.summary?.delays?.transmission || 0,
              propagation: updatedStack.summary?.delays?.propagation || 0,
              processing: updatedStack.summary?.delays?.processing || 0,
              queue: 0,
              total: updatedStack.summary?.delays?.total || 0,
            },
            total: {
              delayMs: updatedStack.summary?.delays?.total || 0,
            },
            bitStream: updatedStack.timeline?.bitStream || '11010110',
          },
        },
        config: {
          userInput: simulationInput.payload,
        },
        summary: {
          bytes: {
            payload: simulationInput.payload.length,
            totalFrame: (updatedStack.summary?.bytes?.totalFrame || (simulationInput.payload.length + 38)),
          },
          delays: {
            transmission: updatedStack.summary?.delays?.transmission || 0,
            propagation: updatedStack.summary?.delays?.propagation || 0,
            processing: updatedStack.summary?.delays?.processing || 0,
            total: updatedStack.summary?.delays?.total || 0,
          },
          totalSegments: updatedStack.summary?.totalSegments || updatedStack.layers.transport.totalSegments,
        },
      }

      setProtocolDashboardData(updatedDashboardData)
    } catch (error) {
      console.error('Error updating protocol calculations dashboard:', error)
    }
  }, [simulationInput, protocolStack, protocolStatus, nodes, errorToggles])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="relative min-h-screen w-full bg-[#050505] text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(59,130,246,0.16),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(34,211,238,0.12),transparent_45%)]" />

      <div className="relative z-10 min-h-screen grid grid-cols-1 xl:grid-cols-[340px_1fr_340px]">
        <aside className="border-r border-cyan-900/30 bg-black/45 backdrop-blur-md p-4 sm:p-5 space-y-4 max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-cyan-300 tracking-wide">LAB Builder</h2>
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded border border-cyan-500/40 text-cyan-200 text-xs sm:text-sm hover:bg-cyan-500/10 transition"
            >
              Back
            </button>
          </div>

          <p className="text-xs sm:text-sm text-cyan-100/75 leading-relaxed">
            Build topology, then run OSI simulation in layer mode or complete mode.
          </p>

          <div className="space-y-3">
            {COMPONENT_CATEGORIES.map((category) => (
              <div key={category.title} className="rounded-md border border-cyan-900/35 bg-black/20 p-2.5">
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/70 mb-2 px-1">{category.title}</p>
                <div className="space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.type}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-netviz-component', item.type)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      className="group cursor-grab active:cursor-grabbing rounded-md border border-cyan-800/40 bg-cyan-900/15 px-3 py-2 hover:border-cyan-400/45 hover:bg-cyan-700/15 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-cyan-100">{item.label}</span>
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-cyan-900/35">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select value={pendingAddType} onChange={(e) => setPendingAddType(e.target.value)} className="bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
                {COMPONENT_LIBRARY.map((item) => (
                  <option key={item.type} value={item.type}>{item.label}</option>
                ))}
              </select>
              <button type="button" onClick={addNodeAtCenter} className="rounded-md border border-cyan-500/40 px-3 py-2 text-xs font-semibold hover:bg-cyan-500/10">Add</button>
            </div>

            <select value={selectedMedia} onChange={(e) => setSelectedMedia(e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
              <option value="ethernet-cable">Ethernet Cable</option>
              <option value="fiber-cable">Fiber Cable</option>
              <option value="wireless-link">Wireless Link</option>
            </select>

            <button type="button" onClick={connectSelectedNodes} disabled={selectedNodeIds.length !== 2} className="w-full rounded-md bg-cyan-600/85 hover:bg-cyan-500 disabled:bg-cyan-900/40 disabled:text-cyan-300/50 px-3 py-2.5 text-sm font-semibold transition">Connect Nodes</button>
            <button type="button" onClick={deleteSelectedConnection} disabled={!selectedLinkId} className="w-full rounded-md bg-amber-600/75 hover:bg-amber-500 disabled:bg-amber-900/35 disabled:text-amber-200/45 px-3 py-2.5 text-sm font-semibold transition">Delete Connection</button>
            <button type="button" onClick={removeSelectedNode} disabled={selectedNodeIds.length !== 1} className="w-full rounded-md bg-rose-600/75 hover:bg-rose-500 disabled:bg-rose-900/35 disabled:text-rose-200/45 px-3 py-2.5 text-sm font-semibold transition">Delete Node</button>
            <button type="button" onClick={clearTopology} className="w-full rounded-md border border-cyan-500/40 hover:bg-cyan-500/10 px-3 py-2.5 text-sm font-semibold text-cyan-100 transition">Reset Topology</button>

            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={saveTopology} className="rounded-md border border-cyan-500/40 hover:bg-cyan-500/10 px-2 py-2 text-xs font-semibold">Save JSON</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md border border-cyan-500/40 hover:bg-cyan-500/10 px-2 py-2 text-xs font-semibold">Load JSON</button>
              <input ref={fileInputRef} type="file" accept="application/json" onChange={loadTopology} className="hidden" />
            </div>

            <label className="flex items-center justify-between rounded-md border border-cyan-900/35 bg-black/20 px-3 py-2 text-xs">
              <span>Snap To Grid</span>
              <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
            </label>
          </div>

          <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/65">Selection</p>
            <p className="text-xs text-cyan-100/80 min-h-4">{selectedNodeNames.length > 0 ? selectedNodeNames.join(' + ') : 'None'}</p>
            <p className="text-[11px] text-cyan-200/50">Nodes: {nodes.length} | Links: {links.length}</p>
            <p className="text-[11px] text-cyan-200/50">Clusters: {Object.keys(subnetClusters).filter((k) => k !== 'unassigned').length}</p>
          </div>

          <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 max-h-44 overflow-auto">
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/65 mb-2">Connections</p>
            {links.length === 0 && <p className="text-xs text-cyan-200/50">No connections yet.</p>}
            {links.map((edge) => {
              const a = findNode(nodes, edge.source)
              const b = findNode(nodes, edge.target)
              return (
                <button
                  key={edge.id}
                  type="button"
                  onClick={() => setSelectedLinkId(edge.id)}
                  className={`w-full text-left mb-1.5 rounded px-2 py-1.5 border text-xs ${selectedLinkId === edge.id ? 'border-cyan-400 bg-cyan-800/30' : 'border-cyan-900/35 bg-black/30'}`}
                >
                  {(a?.config.name || 'Node')} → {(b?.config.name || 'Node')} ({edge.media})
                </button>
              )
            })}
          </div>
        </aside>

        <section
          className="relative min-h-[60vh] lg:min-h-screen"
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }}
          onDrop={handleCanvasDrop}
        >
          <Canvas shadows camera={{ position: [9, 10, 11], fov: 50 }} className="w-full h-full">
            <color attach="background" args={['#060b15']} />
            <ambientLight intensity={0.45} />
            <directionalLight position={[10, 12, 8]} intensity={1.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[40, 28]} />
              <meshStandardMaterial color="#0b1220" roughness={0.95} metalness={0.05} />
            </mesh>

            <gridHelper args={[40, 40, '#0ea5e9', '#1e293b']} position={[0, 0.02, 0]} />

            {links.map((link) => {
              const from = findNode(nodes, link.source)
              const to = findNode(nodes, link.target)
              if (!from || !to) return null

              const isActive = activePathEdgeIds.includes(link.id)
              const isSelected = selectedLinkId === link.id
              const linkColor = isActive ? '#22c55e' : isSelected ? '#f59e0b' : getMediaColor(link.media)

              return (
                <Line key={link.id} points={[from.position, to.position]} color={linkColor} lineWidth={2} transparent opacity={0.9} />
              )
            })}

            {simulationPathPoints.length > 1 && currentStep && (
              <>
                <PacketActor
                  points={simulationPathPoints}
                  color={currentPacketColor}
                  speed={packetSpeed}
                  offset={0}
                  dropped={currentStep.type === 'event' && currentStep.severity === 'error'}
                />
                {errorToggles.congestion && currentStep.type === 'transit' && (
                  <>
                    <PacketActor points={simulationPathPoints} color="#facc15" speed={0.05} offset={0.3} />
                    <PacketActor points={simulationPathPoints} color="#facc15" speed={0.05} offset={0.6} />
                  </>
                )}
              </>
            )}

            {/* Render 3D Protocol Encapsulation Stack */}
            {protocolStack && (
              <NestedEncapsulationStack
                protocolStack={protocolStack}
                animationProgress={protocolAnimationProgress}
                decapsulating={protocolStatus === 'validating' || protocolStatus === 'complete'}
              />
            )}

            {/* Render Protocol Bitstream Animation */}
            {protocolBitstream && protocolTimeline && protocolAnimationProgress < 1 && (
              protocolBitstream.slice(0, Math.ceil(protocolBitstream.length * protocolAnimationProgress * 2)).map((bit, idx) => {
                // Animate bits along a path from sender to receiver
                const sourceNode = findNode(nodes, simulationInput.sourceId)
                const destNode = findNode(nodes, simulationInput.destinationId)
                if (!sourceNode || !destNode) return null

                const progress = (idx / protocolBitstream.length) + (protocolAnimationProgress * 0.5)
                const x = sourceNode.position[0] + (destNode.position[0] - sourceNode.position[0]) * progress
                const y = 1 + Math.sin(progress * Math.PI * 3) * 0.3
                const z = sourceNode.position[2] + (destNode.position[2] - sourceNode.position[2]) * progress

                return (
                  <BitActor
                    key={idx}
                    position={[x, y, z]}
                    color={bit.color}
                  />
                )
              })
            )}

            {nodes.map((node) => (
              <DeviceMesh
                key={node.id}
                node={node}
                selected={selectedNodeIds.includes(node.id)}
                hasError={!nodeValidationMap[node.id]?.valid}
                isHot={pathNodeIds.includes(node.id)}
                onClick={handleNodeSelect}
                onMove={handleNodeMove}
                onMoveStart={() => setIsDraggingNode(true)}
                onMoveEnd={() => setIsDraggingNode(false)}
              />
            ))}

            <OrbitControls makeDefault enabled={!isDraggingNode} enableDamping dampingFactor={0.08} />
          </Canvas>

          <div className="pointer-events-none absolute left-4 right-4 top-4 flex justify-center">
            <div className="px-4 py-2 rounded-md bg-black/45 border border-cyan-900/40 backdrop-blur-sm text-[11px] sm:text-xs tracking-wide text-cyan-100/80">
              {dropHint}
            </div>
          </div>
        </section>

        <aside className="border-l border-cyan-900/30 bg-black/45 backdrop-blur-md p-4 sm:p-5 space-y-4 max-h-screen overflow-y-auto">
          <h3 className="text-lg font-black tracking-wide text-cyan-300">Configuration + OSI Engine</h3>

          <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/70">Simulation Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulationMode('layer')}
                className={`rounded px-2 py-2 text-xs font-semibold border ${simulationMode === 'layer' ? 'bg-cyan-700/40 border-cyan-400' : 'border-cyan-900/40'}`}
              >
                Layer-by-Layer
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('complete')}
                className={`rounded px-2 py-2 text-xs font-semibold border ${simulationMode === 'complete' ? 'bg-cyan-700/40 border-cyan-400' : 'border-cyan-900/40'}`}
              >
                Complete OSI
              </button>
            </div>

            {simulationMode === 'layer' && (
              <select
                value={selectedLayerId}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs"
              >
                {OSI_LAYERS.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.name}</option>
                ))}
              </select>
            )}

            <p className="text-[11px] uppercase tracking-wider text-cyan-300/70 mt-2">Custom Input</p>
            <select value={simulationInput.sourceId} onChange={(e) => setSimulationInput((prev) => ({ ...prev, sourceId: e.target.value }))} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
              <option value="">Source Device</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.config.name}</option>
              ))}
            </select>

            <select value={simulationInput.destinationId} onChange={(e) => setSimulationInput((prev) => ({ ...prev, destinationId: e.target.value }))} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
              <option value="">Destination Device</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>{node.config.name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select value={simulationInput.dataType} onChange={(e) => setSimulationInput((prev) => ({ ...prev, dataType: e.target.value }))} className="bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
                <option>Text</option>
                <option>File</option>
                <option>HTTP Request</option>
                <option>JSON Payload</option>
              </select>
              <select value={simulationInput.protocol} onChange={(e) => setSimulationInput((prev) => ({ ...prev, protocol: e.target.value }))} className="bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
                <option>TCP</option>
                <option>UDP</option>
              </select>
            </div>

            <textarea
              value={simulationInput.payload}
              onChange={(e) => setSimulationInput((prev) => ({ ...prev, payload: e.target.value }))}
              className="w-full min-h-16 bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs"
              placeholder="Message payload"
            />

            <p className="text-[11px] uppercase tracking-wider text-green-300/70 mt-2">📊 Packet Configuration</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-cyan-300/70">Port</label>
                <input
                  value={simulationInput.port}
                  onChange={(e) => setSimulationInput((prev) => ({ ...prev, port: e.target.value }))}
                  className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs mt-1"
                  placeholder="8080"
                  type="number"
                />
              </div>
              <div>
                <label className="text-[10px] text-cyan-300/70">MSS (L4)</label>
                <input
                  value={simulationInput.mss}
                  onChange={(e) => setSimulationInput((prev) => ({ ...prev, mss: e.target.value }))}
                  className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs mt-1"
                  placeholder="1460"
                  type="number"
                  min="500"
                  max="9000"
                />
                <div className="text-[9px] text-cyan-400/50 mt-1">TCP segment</div>
              </div>
              <div>
                <label className="text-[10px] text-cyan-300/70">MTU (L2)</label>
                <input
                  value={simulationInput.packetSize}
                  onChange={(e) => setSimulationInput((prev) => ({ ...prev, packetSize: e.target.value }))}
                  className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs mt-1"
                  placeholder="1500"
                  type="number"
                  min="500"
                  max="9000"
                />
                <div className="text-[9px] text-cyan-400/50 mt-1">Frame size</div>
              </div>
            </div>

            <p className="text-[11px] uppercase tracking-wider text-cyan-300/70">Error/Event Toggles</p>
            {[
              { key: 'packetLoss', label: 'Packet loss' },
              { key: 'highLatency', label: 'High latency' },
              { key: 'congestion', label: 'Congestion' },
            ].map((toggle) => (
              <label key={toggle.key} className="flex items-center justify-between text-xs rounded border border-cyan-900/30 bg-black/20 px-2.5 py-1.5">
                <span>{toggle.label}</span>
                <input
                  type="checkbox"
                  checked={errorToggles[toggle.key]}
                  onChange={(e) => setErrorToggles((prev) => ({ ...prev, [toggle.key]: e.target.checked }))}
                />
              </label>
            ))}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button type="button" onClick={startSimulation} className="rounded bg-emerald-600/85 hover:bg-emerald-500 px-2 py-2 text-xs font-semibold">Start</button>
              <button type="button" onClick={pauseSimulation} className="rounded bg-amber-600/85 hover:bg-amber-500 px-2 py-2 text-xs font-semibold">Pause</button>
              <button type="button" onClick={resumeSimulation} className="rounded bg-cyan-600/85 hover:bg-cyan-500 px-2 py-2 text-xs font-semibold">Resume</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={stepSimulation} className="rounded bg-purple-600/85 hover:bg-purple-500 px-2 py-2 text-xs font-semibold">Step</button>
              <button type="button" onClick={stopSimulation} className="rounded bg-rose-700/85 hover:bg-rose-600 px-2 py-2 text-xs font-semibold">Stop</button>
              <button type="button" onClick={resetSimulation} className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-2 text-xs font-semibold">Reset</button>
            </div>

            <p className="text-[11px] text-cyan-200/60">Status: {simulationStatus} | Step: {Math.max(currentStepIndex + 1, 0)}/{simulationPlan?.steps.length || 0}</p>
          </div>

          {/* Protocol Simulation Section */}
          <div className="rounded-md border border-green-900/35 bg-black/25 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-green-300/70">🔬 Protocol Simulation</p>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={handleSendProtocolData}
                disabled={protocolStatus === 'calculating' || protocolStatus === 'animating' || protocolStatus === 'validating' || !simulationInput.sourceId || !simulationInput.destinationId}
                className="rounded bg-green-600/85 hover:bg-green-500 disabled:bg-green-900/40 disabled:text-green-300/50 px-2 py-2 text-xs font-semibold transition"
              >
                📤 Send Data
              </button>
              <button 
                type="button" 
                onClick={resetProtocolSimulation}
                disabled={protocolStatus === 'idle'}
                className="rounded bg-green-600/65 hover:bg-green-500 disabled:bg-green-900/40 disabled:text-green-300/50 px-2 py-2 text-xs font-semibold transition"
              >
                🔄 Reset
              </button>
            </div>

            <p className="text-[11px] text-green-200/60">
              Status: {protocolStatus} | Progress: {(protocolAnimationProgress * 100).toFixed(0)}%
            </p>
          </div>

          <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/70">OSI Stack</p>
            <div className="space-y-1.5">
              {OSI_LAYERS.map((layer) => {
                const isActive = currentLayer === layer.id
                return (
                  <div key={layer.id} className={`rounded px-2.5 py-1.5 text-xs border ${isActive ? 'border-cyan-300 bg-cyan-700/25' : 'border-cyan-900/30 bg-black/25'}`}>
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: layer.color }} />
                    {layer.name}
                  </div>
                )
              })}
            </div>
          </div>

          {currentStep && (
            <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-cyan-300/70">Current Step</p>
              <p className="text-sm text-cyan-100">{currentStep.title}</p>
              <p className="text-xs text-cyan-200/70">{currentStep.description}</p>
              <p className="text-[11px] text-cyan-200/60">Node: {findNode(nodes, currentNode)?.config.name || 'In transit'}</p>
            </div>
          )}

          <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 max-h-64 overflow-auto">
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/70 mb-2">Packet State</p>
            <pre className="text-[10px] leading-relaxed text-cyan-100/70 whitespace-pre-wrap">
              {packetState ? JSON.stringify(packetState, null, 2) : 'No packet yet'}
            </pre>
          </div>

          <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 max-h-44 overflow-auto">
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/70 mb-2">Adjacency Graph</p>
            <pre className="text-[10px] leading-relaxed text-cyan-100/70 whitespace-pre-wrap">
              {JSON.stringify(graphAdjacency, null, 2)}
            </pre>
          </div>

          {selectedNode && (
            <div className="rounded-md border border-cyan-900/35 bg-black/25 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-cyan-300/70">Device Configuration</p>
              <input value={selectedNode.config.name} onChange={(e) => updateNodeConfig(selectedNode.id, 'name', e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs" placeholder="Device Name" />
              <input value={selectedNode.config.ipAddress} onChange={(e) => updateNodeConfig(selectedNode.id, 'ipAddress', e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs" placeholder="IP Address" />
              <input value={selectedNode.config.subnetMask} onChange={(e) => updateNodeConfig(selectedNode.id, 'subnetMask', e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs" placeholder="Subnet Mask" />
              <input value={selectedNode.config.macAddress} onChange={(e) => updateNodeConfig(selectedNode.id, 'macAddress', e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs" placeholder="MAC Address" />
              <input value={selectedNode.config.deviceType} onChange={(e) => updateNodeConfig(selectedNode.id, 'deviceType', e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs" placeholder="Device Type" />
              <select value={selectedNode.config.status} onChange={(e) => updateNodeConfig(selectedNode.id, 'status', e.target.value)} className="w-full bg-slate-900/80 border border-cyan-900/40 rounded px-2.5 py-2 text-xs">
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              {!nodeValidationMap[selectedNode.id]?.valid && (
                <ul className="text-xs text-rose-300 space-y-1">
                  {nodeValidationMap[selectedNode.id].issues.map((issue) => <li key={issue}>• {issue}</li>)}
                </ul>
              )}
              {nodeValidationMap[selectedNode.id]?.valid && <p className="text-xs text-emerald-300">Configuration looks good.</p>}
              <p className="text-[11px] text-cyan-200/60">Subnet Cluster: {nodeClusterKeyMap[selectedNode.id] || 'unassigned'}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Calculation Dashboard Overlay */}
      {protocolDashboardData && (
        <CalculationDashboard
          protocolData={protocolDashboardData}
          calculationHistory={calculationHistory}
          isMinimized={dashboardMinimized}
          onToggleMinimize={() => setDashboardMinimized(!dashboardMinimized)}
        />
      )}
    </motion.div>
  )
}
