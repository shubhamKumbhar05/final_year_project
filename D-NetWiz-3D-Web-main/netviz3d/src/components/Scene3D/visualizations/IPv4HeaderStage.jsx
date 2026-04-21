import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Line, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'

const TOPOLOGY_DEFAULTS = [
  {
    id: 'client',
    role: 'client',
    label: 'CLIENT',
    hostname: 'WS-ALPHA',
    ip: '192.168.1.10',
    type: 'pc',
    position: [-6, 0.95, 0],
    accent: '#38bdf8',
  },
  {
    id: 'router-a',
    role: 'router',
    label: 'R1',
    hostname: 'EDGE-A',
    ip: '172.16.0.1',
    type: 'router',
    position: [-2.8, 0.95, 0.6],
    accent: '#facc15',
  },
  {
    id: 'router-b',
    role: 'router',
    label: 'R2',
    hostname: 'CORE-B',
    ip: '172.16.0.2',
    type: 'router',
    position: [0, 0.95, -0.2],
    accent: '#facc15',
  },
  {
    id: 'router-c',
    role: 'router',
    label: 'R3',
    hostname: 'EDGE-C',
    ip: '172.16.0.3',
    type: 'router',
    position: [2.9, 0.95, 0.5],
    accent: '#facc15',
  },
  {
    id: 'server',
    role: 'server',
    label: 'SERVER',
    hostname: 'SRV-MAIN',
    ip: '10.0.0.42',
    type: 'server',
    position: [6, 0.95, 0],
    accent: '#f472b6',
  },
]

const DEFAULT_HEADER = {
  version: '4',
  ihl: '5',
  totalLength: '60',
  identification: '54321',
  flags: 'DF',
  fragmentOffset: '0',
  ttl: '64',
  protocol: '6',
  sourceIp: TOPOLOGY_DEFAULTS[0].ip,
  destinationIp: TOPOLOGY_DEFAULTS[4].ip,
}

const HEADER_LAYOUT = [
  [
    { key: 'version', label: 'Version', width: 0.34, x: -1.08, color: '#22c55e' },
    { key: 'ihl', label: 'IHL', width: 0.34, x: -0.7, color: '#14b8a6' },
    { key: 'totalLength', label: 'Total Length', width: 1.36, x: 0.36, color: '#38bdf8' },
  ],
  [
    { key: 'identification', label: 'Identification', width: 1.12, x: -0.52, color: '#60a5fa' },
    { key: 'flags', label: 'Flags', width: 0.38, x: 0.38, color: '#f59e0b' },
    { key: 'fragmentOffset', label: 'Fragment Offset', width: 0.92, x: 1.04, color: '#f97316' },
  ],
  [
    { key: 'ttl', label: 'TTL', width: 0.58, x: -0.92, color: '#facc15' },
    { key: 'protocol', label: 'Protocol', width: 0.58, x: -0.24, color: '#22c55e' },
    { key: 'checksum', label: 'Checksum', width: 1.08, x: 0.74, color: '#f472b6' },
  ],
  [
    { key: 'sourceIp', label: 'Source IP', width: 2.2, x: 0, color: '#38bdf8' },
  ],
  [
    { key: 'destinationIp', label: 'Destination IP', width: 2.2, x: 0, color: '#f472b6' },
  ],
]

const panelStyles = {
  fullscreen: {
    width: '100%',
    height: '100%',
    position: 'relative',
    pointerEvents: 'none',
  },
  shell: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: '22px',
    boxSizing: 'border-box',
  },
  panel: {
    width: '360px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 44px)',
    overflowY: 'auto',
    background: 'linear-gradient(180deg, rgba(3,7,18,0.92), rgba(8,47,73,0.84))',
    border: '1px solid rgba(56,189,248,0.28)',
    borderRadius: '20px',
    boxShadow: '0 18px 60px rgba(2, 132, 199, 0.18)',
    backdropFilter: 'blur(16px)',
    color: '#e0f2fe',
    padding: '18px',
    pointerEvents: 'auto',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  sectionTitle: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color: '#7dd3fc',
    marginBottom: '10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    color: '#bae6fd',
    letterSpacing: '0.06em',
  },
  input: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(56, 189, 248, 0.22)',
    borderRadius: '10px',
    color: '#f8fafc',
    padding: '10px 12px',
    outline: 'none',
    fontSize: '13px',
  },
  buttonRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '8px',
  },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.82)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    pointerEvents: 'auto',
    zIndex: 20,
  },
  modal: {
    width: 'min(960px, 96vw)',
    maxHeight: '90vh',
    overflowY: 'auto',
    borderRadius: '22px',
    border: '1px solid rgba(56,189,248,0.3)',
    background: 'linear-gradient(180deg, rgba(2,6,23,0.96), rgba(15,23,42,0.94))',
    boxShadow: '0 28px 90px rgba(0,0,0,0.45)',
    padding: '22px',
    color: '#e2e8f0',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  modalGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  modalCard: {
    borderRadius: '18px',
    border: '1px solid rgba(71,85,105,0.7)',
    background: 'rgba(2, 6, 23, 0.7)',
    padding: '14px',
  },
}

function createDefaultTopologyNodes() {
  return TOPOLOGY_DEFAULTS.map((node) => ({
    ...node,
    position: [...node.position],
  }))
}

function clampInteger(value, fallback) {
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function parseSceneNumber(value, fallback) {
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

function calculateChecksum(header) {
  const payload = [
    header.version,
    header.ihl,
    header.totalLength,
    header.identification,
    header.flags,
    header.fragmentOffset,
    header.ttl,
    header.protocol,
    header.sourceIp,
    header.destinationIp,
  ].join('|')

  let sum = 0
  for (let index = 0; index < payload.length; index += 1) {
    sum = (sum + payload.charCodeAt(index) * (index + 1)) & 0xffff
  }

  return `0x${sum.toString(16).toUpperCase().padStart(4, '0')}`
}

function corruptChecksum(checksum) {
  if (checksum.length < 6) return '0xDEAD'
  return `${checksum.slice(0, -1)}${checksum.endsWith('F') ? 'A' : 'F'}`
}

function HeaderFieldCell({ field, value, rowIndex, selectedField, onSelect, xRayMode, errorInjected }) {
  const isSelected = selectedField === field.key
  const isChecksumError = field.key === 'checksum' && errorInjected

  return (
    <group position={[field.x, 0.55 - rowIndex * 0.28, 0.22]}>
      <mesh onClick={(event) => {
        event.stopPropagation()
        onSelect(field.key)
      }}>
        <boxGeometry args={[field.width, 0.2, 0.12]} />
        <meshStandardMaterial
          color={isChecksumError ? '#ef4444' : field.color}
          emissive={isChecksumError ? '#dc2626' : field.color}
          emissiveIntensity={isSelected ? 1.1 : 0.45}
          transparent
          opacity={xRayMode ? 0.78 : 0.18}
        />
      </mesh>

      {xRayMode && (
        <Html center style={{ pointerEvents: 'none' }}>
          <div style={{
            minWidth: `${Math.max(field.width * 70, 72)}px`,
            padding: '6px 8px',
            borderRadius: '10px',
            border: `1px solid ${isChecksumError ? '#ef4444' : field.color}`,
            background: 'rgba(2, 6, 23, 0.88)',
            color: '#f8fafc',
            fontSize: '10px',
            textAlign: 'center',
            boxShadow: `0 0 18px ${isChecksumError ? 'rgba(239,68,68,0.35)' : 'rgba(56,189,248,0.18)'}`,
          }}>
            <div style={{ color: isChecksumError ? '#fca5a5' : '#7dd3fc', marginBottom: '3px', letterSpacing: '0.08em' }}>
              {field.label}
            </div>
            <div style={{ fontWeight: 700 }}>
              {value}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

function NetworkNode({ node, index }) {
  const isRouter = node.type === 'router'
  const meshColor = isRouter ? '#0c4a6e' : '#0f172a'

  return (
    <group position={node.position}>
      <mesh>
        {isRouter ? <sphereGeometry args={[0.62, 32, 32]} /> : <boxGeometry args={[1.05, 1.05, 1.05]} />}
        <meshStandardMaterial color={meshColor} emissive={meshColor} emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0, -0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.05, 16, 48]} />
        <meshBasicMaterial color={node.accent} transparent opacity={0.75} />
      </mesh>
      <Text position={[0, -1.22, 0]} fontSize={0.24} color="#e2e8f0" anchorX="center" anchorY="middle">
        {node.label}
      </Text>
      <Text position={[0, 1.1, 0]} fontSize={0.18} color={node.accent} anchorX="center" anchorY="middle">
        {node.hostname}
      </Text>
      <Text position={[0, 0.82, 0]} fontSize={0.16} color="#cbd5e1" anchorX="center" anchorY="middle">
        {index === 0 || index === 4 ? node.ip : 'TTL - 1'}
      </Text>
    </group>
  )
}

export default function IPv4HeaderStage() {
  const packetAnchorRef = useRef(null)
  const packetModelRef = useRef(null)
  const packetBodyRef = useRef(null)
  const packetShellRef = useRef(null)
  const transportRef = useRef(null)
  const scannerRef = useRef(null)
  const scanStateRef = useRef({ progress: 0 })
  const runIdRef = useRef(0)
  const timeoutsRef = useRef([])

  const [topologyNodes, setTopologyNodes] = useState(() => createDefaultTopologyNodes())
  const [topologyEditorOpen, setTopologyEditorOpen] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [header, setHeader] = useState(DEFAULT_HEADER)
  const [xRayMode, setXRayMode] = useState(false)
  const [selectedField, setSelectedField] = useState('ttl')
  const [statusText, setStatusText] = useState('Inspect the IPv4 travel document, edit the topology if needed, then send it across the route.')
  const [liveTtl, setLiveTtl] = useState(clampInteger(DEFAULT_HEADER.ttl, 64))
  const [currentStop, setCurrentStop] = useState('CLIENT')
  const [packetVisible, setPacketVisible] = useState(true)
  const [scannerActive, setScannerActive] = useState(false)
  const [delivered, setDelivered] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [errorInjected, setErrorInjected] = useState(false)
  const [sending, setSending] = useState(false)

  const routePoints = useMemo(
    () => topologyNodes.map((node) => [...node.position]),
    [topologyNodes]
  )

  const routeLabels = useMemo(
    () => topologyNodes.map((node) => node.hostname || node.label),
    [topologyNodes]
  )

  const clientNode = topologyNodes[0]
  const serverNode = topologyNodes[topologyNodes.length - 1]
  const computedChecksum = calculateChecksum(header)
  const displayedChecksum = errorInjected ? corruptChecksum(computedChecksum) : computedChecksum

  function clearTimers() {
    timeoutsRef.current.forEach((timerId) => clearTimeout(timerId))
    timeoutsRef.current = []
  }

  function wait(ms) {
    return new Promise((resolve) => {
      const timerId = setTimeout(resolve, ms)
      timeoutsRef.current.push(timerId)
    })
  }

  function movePacketTo(position, duration) {
    return new Promise((resolve) => {
      if (!packetAnchorRef.current) {
        resolve()
        return
      }

      gsap.to(packetAnchorRef.current.position, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration,
        ease: 'power2.inOut',
        onComplete: resolve,
      })
    })
  }

  function restorePacketVisuals() {
    if (packetAnchorRef.current && routePoints.length > 0) {
      packetAnchorRef.current.position.set(...routePoints[0])
      packetAnchorRef.current.scale.set(1, 1, 1)
    }

    if (packetBodyRef.current) {
      packetBodyRef.current.color.set('#22c55e')
      packetBodyRef.current.emissive.set('#22c55e')
      packetBodyRef.current.opacity = xRayMode ? 0.22 : 0.88
      packetBodyRef.current.emissiveIntensity = 0.78
    }

    if (packetShellRef.current) {
      packetShellRef.current.color.set('#4ade80')
      packetShellRef.current.opacity = 0.22
    }

    if (transportRef.current) {
      transportRef.current.color.set('#38bdf8')
      transportRef.current.emissive.set('#38bdf8')
      transportRef.current.opacity = 0.9
    }

    scanStateRef.current.progress = 0
  }

  function cancelSimulation() {
    runIdRef.current += 1
    clearTimers()

    if (packetAnchorRef.current) {
      gsap.killTweensOf(packetAnchorRef.current.position)
      gsap.killTweensOf(packetAnchorRef.current.scale)
    }

    gsap.killTweensOf(scanStateRef.current)
    setSending(false)
    setScannerActive(false)
  }

  function triggerGlow() {
    if (!packetBodyRef.current || !packetShellRef.current) return

    gsap.fromTo(
      packetBodyRef.current,
      { emissiveIntensity: 0.65 },
      { emissiveIntensity: 1.35, duration: 0.28, yoyo: true, repeat: 1, ease: 'power2.out' }
    )

    gsap.fromTo(
      packetShellRef.current,
      { opacity: 0.18 },
      { opacity: 0.42, duration: 0.28, yoyo: true, repeat: 1, ease: 'power2.out' }
    )
  }

  function snapHeaderShell() {
    if (!packetModelRef.current || !packetShellRef.current || !transportRef.current) return

    gsap.fromTo(
      packetModelRef.current.scale,
      { x: 0.88, y: 0.88, z: 0.88 },
      { x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(2)' }
    )

    gsap.fromTo(
      packetShellRef.current,
      { opacity: 0.05 },
      { opacity: 0.24, duration: 0.4, ease: 'power2.out' }
    )

    gsap.fromTo(
      transportRef.current.scale,
      { x: 0.75, y: 0.75, z: 0.75 },
      { x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(2)' }
    )
  }

  function resetScene(message = 'Header reset. Packet returned to the first hop for another run.') {
    cancelSimulation()
    restorePacketVisuals()
    setPacketVisible(true)
    setDelivered(false)
    setRejected(false)
    setErrorInjected(false)
    setCurrentStop(routeLabels[0] || 'CLIENT')
    setLiveTtl(clampInteger(header.ttl, 64))
    setStatusText(message)
  }

  function updateTopologyNode(nodeId, field, value) {
    setTopologyNodes((current) => current.map((node) => {
      if (node.id !== nodeId) return node

      if (field === 'x') {
        return {
          ...node,
          position: [parseSceneNumber(value, node.position[0]), node.position[1], node.position[2]],
        }
      }

      if (field === 'z') {
        return {
          ...node,
          position: [node.position[0], node.position[1], parseSceneNumber(value, node.position[2])],
        }
      }

      return {
        ...node,
        [field]: value,
      }
    }))

    setDelivered(false)
    setRejected(false)
    setStatusText('Topology updated. The IPv4 route and node badges reflect the new settings immediately.')
  }

  function resetTopology() {
    cancelSimulation()
    setTopologyNodes(createDefaultTopologyNodes())
    setHeader((current) => ({
      ...current,
      sourceIp: TOPOLOGY_DEFAULTS[0].ip,
      destinationIp: TOPOLOGY_DEFAULTS[4].ip,
    }))
    setCurrentStop(TOPOLOGY_DEFAULTS[0].hostname)
    setStatusText('Topology restored to the default client-router-router-router-server path.')
    setPacketVisible(true)
    setDelivered(false)
    setRejected(false)
    setErrorInjected(false)
    setLiveTtl(clampInteger(header.ttl, 64))
  }

  function updateHeaderField(key, value) {
    setHeader((current) => ({ ...current, [key]: value }))
    setSelectedField(key)
    setDelivered(false)
    setRejected(false)
    setErrorInjected(false)

    if (key === 'ttl') {
      setLiveTtl(clampInteger(value, 0))
      setStatusText('TTL edited. Routers will decrement this field hop by hop.')
      triggerGlow()
      return
    }

    if (key === 'sourceIp') {
      setTopologyNodes((current) => current.map((node, index) => index === 0 ? { ...node, ip: value } : node))
      setStatusText('Source IP updated. The packet label and client badge now reflect the new origin instantly.')
      return
    }

    if (key === 'destinationIp') {
      setTopologyNodes((current) => current.map((node, index) => index === current.length - 1 ? { ...node, ip: value } : node))
      setStatusText('Destination IP updated. The server badge and shipping label now target the new host.')
      return
    }

    setStatusText(`${key} updated. Checksum recalculated for the revised header.`)
  }

  async function runPacket() {
    if (sending || routePoints.length < 2) return

    cancelSimulation()
    restorePacketVisuals()

    const runId = runIdRef.current + 1
    runIdRef.current = runId

    const startingTtl = Math.max(0, clampInteger(header.ttl, 0))
    const travelScale = Math.max(speedMultiplier, 0.2)

    setSending(true)
    setPacketVisible(true)
    setScannerActive(false)
    setDelivered(false)
    setRejected(false)
    setCurrentStop(routeLabels[0] || 'CLIENT')
    setLiveTtl(startingTtl)
    setStatusText('IPv4 header snapped around the TCP segment. Packet leaving the client now.')
    snapHeaderShell()
    triggerGlow()

    for (let hopIndex = 1; hopIndex < routePoints.length; hopIndex += 1) {
      const isFinalHop = hopIndex === routePoints.length - 1
      await movePacketTo(routePoints[hopIndex], (isFinalHop ? 1.55 : 1.25) / travelScale)
      if (runId !== runIdRef.current) return

      const hopLabel = routeLabels[hopIndex] || `Hop ${hopIndex + 1}`
      setCurrentStop(hopLabel)

      if (!isFinalHop) {
        const decrementedTtl = Math.max(0, startingTtl - hopIndex)
        setLiveTtl(decrementedTtl)
        setSelectedField('ttl')
        triggerGlow()

        if (decrementedTtl === 0) {
          setStatusText(`${hopLabel} decremented TTL to 0. The packet expired and was dropped before the next hop.`)
          if (packetBodyRef.current && packetShellRef.current && transportRef.current && packetAnchorRef.current) {
            gsap.to(packetBodyRef.current.color, { r: 0.94, g: 0.27, b: 0.27, duration: 0.2 })
            gsap.to(packetBodyRef.current.emissive, { r: 0.86, g: 0.15, b: 0.15, duration: 0.2 })
            gsap.to(packetShellRef.current, { opacity: 0.46, duration: 0.2 })
            gsap.to(packetAnchorRef.current.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 0.22, yoyo: true, repeat: 1 })
            gsap.to([packetBodyRef.current, packetShellRef.current, transportRef.current], { opacity: 0, duration: 0.45, delay: 0.15 })
          }

          await wait(520 / travelScale)
          if (runId !== runIdRef.current) return

          setPacketVisible(false)
          setSending(false)
          return
        }

        setStatusText(`${hopLabel} inspected the header and reduced TTL to ${decrementedTtl}.`)
        await wait(900 / travelScale)
        if (runId !== runIdRef.current) return
      }
    }

    setStatusText('Packet reached the destination. Scanner validating IPv4 header checksum.')
    setScannerActive(true)
    scanStateRef.current.progress = 0

    await new Promise((resolve) => {
      gsap.to(scanStateRef.current, {
        progress: 1,
        duration: 1.4 / travelScale,
        ease: 'power1.inOut',
        onComplete: resolve,
      })
    })

    if (runId !== runIdRef.current) return

    setScannerActive(false)

    if (errorInjected) {
      setRejected(true)
      setSelectedField('checksum')
      setStatusText('Checksum mismatch detected. The destination rejected the packet without inspecting the payload.')
      if (packetBodyRef.current && packetShellRef.current) {
        gsap.to(packetBodyRef.current.color, { r: 0.94, g: 0.27, b: 0.27, duration: 0.24 })
        gsap.to(packetBodyRef.current.emissive, { r: 0.86, g: 0.15, b: 0.15, duration: 0.24 })
        gsap.to(packetShellRef.current, { opacity: 0.4, duration: 0.24 })
      }
      setSending(false)
      return
    }

    setDelivered(true)
    setStatusText('Checksum validated. The IPv4 shell protected the segment all the way to the server.')
    triggerGlow()
    setSending(false)
  }

  useEffect(() => {
    restorePacketVisuals()
    setLiveTtl(clampInteger(header.ttl, 64))
    setCurrentStop(routeLabels[0] || 'CLIENT')

    return () => {
      cancelSimulation()
    }
  }, [])

  useEffect(() => {
    if (!packetBodyRef.current) return
    packetBodyRef.current.opacity = xRayMode ? 0.22 : 0.88
  }, [xRayMode])

  useEffect(() => {
    setHeader((current) => {
      const nextSourceIp = clientNode?.ip || current.sourceIp
      const nextDestinationIp = serverNode?.ip || current.destinationIp

      if (current.sourceIp === nextSourceIp && current.destinationIp === nextDestinationIp) {
        return current
      }

      return {
        ...current,
        sourceIp: nextSourceIp,
        destinationIp: nextDestinationIp,
      }
    })

    if (!sending) {
      setCurrentStop(routeLabels[0] || 'CLIENT')
    }
  }, [clientNode?.ip, routeLabels, sending, serverNode?.ip])

  useEffect(() => {
    if (!sending) {
      restorePacketVisuals()
    }
  }, [routePoints, sending])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (packetModelRef.current) {
      packetModelRef.current.rotation.y = Math.sin(time * 0.7) * 0.08
      packetModelRef.current.rotation.x = Math.cos(time * 0.45) * 0.05
    }

    if (transportRef.current) {
      transportRef.current.emissiveIntensity = 0.45 + (Math.sin(time * 3.2) + 1) * 0.12
    }

    if (packetShellRef.current && !sending) {
      packetShellRef.current.opacity = 0.18 + (Math.sin(time * 2.2) + 1) * 0.03
    }

    if (scannerRef.current && scannerActive) {
      scannerRef.current.position.x = -1.12 + scanStateRef.current.progress * 2.24
    }
  })

  return (
    <group>
      <group>
        {routePoints.slice(0, -1).map((point, index) => (
          <Line
            key={`route-segment-${topologyNodes[index].id}-${topologyNodes[index + 1].id}`}
            points={[point, routePoints[index + 1]]}
            color={index === routePoints.length - 2 ? '#f472b6' : '#38bdf8'}
            lineWidth={index === 0 ? 2 : 1.4}
            transparent
            opacity={0.36}
          />
        ))}
      </group>

      {topologyNodes.map((node, index) => (
        <NetworkNode key={node.id} node={node} index={index} />
      ))}

      {packetVisible && routePoints.length > 0 && (
        <group ref={packetAnchorRef} position={routePoints[0]}>
          <group ref={packetModelRef}>
            <group position={[0, 0.2, 0]} onClick={(event) => {
              event.stopPropagation()
              setXRayMode((current) => {
                const next = !current
                setStatusText(next ? 'X-ray mode enabled. The 32-bit IPv4 rows are visible inside the packet.' : 'Packet shell closed. Click again to reveal the IPv4 header grid.')
                return next
              })
            }}>
              <mesh>
                <boxGeometry args={[2.75, 1.85, 1.5]} />
                <meshStandardMaterial ref={packetBodyRef} color="#22c55e" emissive="#22c55e" emissiveIntensity={0.78} transparent opacity={0.88} />
              </mesh>
              <mesh>
                <boxGeometry args={[2.95, 2.02, 1.68]} />
                <meshBasicMaterial ref={packetShellRef} color="#4ade80" transparent opacity={0.22} depthWrite={false} />
              </mesh>

              <mesh position={[0, 0, -0.12]}>
                <boxGeometry args={[1.85, 0.75, 0.65]} />
                <meshStandardMaterial ref={transportRef} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.56} transparent opacity={0.9} />
              </mesh>

              {HEADER_LAYOUT.map((row, rowIndex) => (
                <group key={`row-${rowIndex}`}>
                  <mesh position={[0, 0.55 - rowIndex * 0.28, 0.14]}>
                    <boxGeometry args={[2.34, 0.21, 0.05]} />
                    <meshBasicMaterial color="#082f49" transparent opacity={xRayMode ? 0.9 : 0.12} />
                  </mesh>
                  {row.map((field) => (
                    <HeaderFieldCell
                      key={field.key}
                      field={field}
                      value={field.key === 'checksum' ? displayedChecksum : header[field.key]}
                      rowIndex={rowIndex}
                      selectedField={selectedField}
                      onSelect={setSelectedField}
                      xRayMode={xRayMode}
                      errorInjected={errorInjected}
                    />
                  ))}
                </group>
              ))}

              <Html position={[0, 1.52, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{
                  border: '1px solid rgba(125,211,252,0.35)',
                  borderRadius: '999px',
                  padding: '7px 12px',
                  background: 'rgba(2, 6, 23, 0.82)',
                  color: '#e0f2fe',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 18px rgba(56,189,248,0.18)',
                }}>
                  IPv4 TRAVEL DOCUMENT | TTL {liveTtl} | {header.sourceIp} {'->'} {header.destinationIp}
                </div>
              </Html>

              {scannerActive && (
                <group ref={scannerRef} position={[-1.12, 0.2, 0.95]}>
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.04, 0.04, 2.15, 16]} />
                    <meshBasicMaterial color="#e2e8f0" transparent opacity={0.8} />
                  </mesh>
                  <pointLight color="#ffffff" intensity={1.1} distance={2.4} />
                </group>
              )}
            </group>
          </group>
        </group>
      )}

      <Html fullscreen>
        <div style={panelStyles.fullscreen}>
          {topologyEditorOpen && (
            <div style={panelStyles.modalBackdrop}>
              <div style={panelStyles.modal}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '18px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.22em', color: '#7dd3fc', marginBottom: '6px' }}>
                      IPv4 Topology Setup
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                      Edit Route Nodes
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1' }}>
                      Adjust the client, three routers, and server that the packet traverses. Hostnames, IPs, and X/Z positions all update the live path instantly.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTopologyEditorOpen(false)}
                    style={{
                      border: '1px solid rgba(56,189,248,0.22)',
                      background: 'rgba(15,23,42,0.88)',
                      color: '#f8fafc',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Close Editor
                  </button>
                </div>

                <div style={{
                  padding: '14px',
                  borderRadius: '16px',
                  border: '1px solid rgba(56,189,248,0.18)',
                  background: 'rgba(15,23,42,0.72)',
                  marginBottom: '16px',
                }}>
                  <div style={{ ...panelStyles.sectionTitle, marginBottom: '8px' }}>Simulation setting</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '10px' }}>Hop speed: {speedMultiplier.toFixed(1)}x</div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speedMultiplier}
                    onChange={(event) => setSpeedMultiplier(parseFloat(event.target.value))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: '#64748b' }}>
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                  </div>
                </div>

                <div style={panelStyles.modalGrid}>
                  {topologyNodes.map((node) => (
                    <div key={node.id} style={panelStyles.modalCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: node.accent, marginBottom: '4px' }}>
                            {node.role}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>{node.label}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                          <div>Device</div>
                          <div style={{ color: '#e2e8f0', marginTop: '4px' }}>{node.type}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div style={panelStyles.field}>
                          <label style={panelStyles.label}>Hostname</label>
                          <input style={panelStyles.input} value={node.hostname} onChange={(event) => updateTopologyNode(node.id, 'hostname', event.target.value)} />
                        </div>
                        <div style={panelStyles.field}>
                          <label style={panelStyles.label}>IPv4 Address</label>
                          <input style={panelStyles.input} value={node.ip} onChange={(event) => updateTopologyNode(node.id, 'ip', event.target.value)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                          <div style={panelStyles.field}>
                            <label style={panelStyles.label}>X Position</label>
                            <input type="number" step="0.1" style={panelStyles.input} value={node.position[0]} onChange={(event) => updateTopologyNode(node.id, 'x', event.target.value)} />
                          </div>
                          <div style={panelStyles.field}>
                            <label style={panelStyles.label}>Z Position</label>
                            <input type="number" step="0.1" style={panelStyles.input} value={node.position[2]} onChange={(event) => updateTopologyNode(node.id, 'z', event.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={resetTopology}
                    style={{
                      border: '1px solid rgba(239,68,68,0.28)',
                      background: 'rgba(127,29,29,0.3)',
                      color: '#fecaca',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Reset Default Topology
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopologyEditorOpen(false)}
                    style={{
                      border: '1px solid rgba(34,197,94,0.28)',
                      background: 'rgba(20,83,45,0.4)',
                      color: '#bbf7d0',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Apply and Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={panelStyles.shell}>
            <div style={panelStyles.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#7dd3fc', letterSpacing: '0.18em', marginBottom: '6px' }}>
                    IPv4 PACKET INSPECTOR
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#f8fafc' }}>
                    Header Table
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#93c5fd' }}>
                  <div>Current stop</div>
                  <div style={{ fontSize: '14px', color: '#f8fafc', marginTop: '4px' }}>{currentStop}</div>
                </div>
              </div>

              <div style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(15,23,42,0.72)',
                border: '1px solid rgba(56,189,248,0.18)',
                marginBottom: '16px',
              }}>
                <div style={{ ...panelStyles.sectionTitle, marginBottom: '8px' }}>Simulation status</div>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: delivered ? '#86efac' : rejected ? '#fca5a5' : '#e0f2fe' }}>
                  {statusText}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={panelStyles.sectionTitle}>Topology controls</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setTopologyEditorOpen(true)}
                    style={{
                      flex: 1,
                      background: 'rgba(14,165,233,0.16)',
                      border: '1px solid rgba(14,165,233,0.32)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Edit Topology
                  </button>
                  <button
                    type="button"
                    onClick={resetTopology}
                    style={{
                      background: 'rgba(15,23,42,0.88)',
                      border: '1px solid rgba(56,189,248,0.22)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Reset Topology
                  </button>
                </div>

                <label style={{ ...panelStyles.label, display: 'block', marginBottom: '8px' }}>
                  Hop Speed: {speedMultiplier.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speedMultiplier}
                  onChange={(event) => setSpeedMultiplier(parseFloat(event.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={panelStyles.sectionTitle}>Editable header fields</div>
                <div style={panelStyles.grid}>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Version</label>
                    <input style={panelStyles.input} value={header.version} onChange={(event) => updateHeaderField('version', event.target.value)} />
                  </div>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>IHL</label>
                    <input style={panelStyles.input} value={header.ihl} onChange={(event) => updateHeaderField('ihl', event.target.value)} />
                  </div>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>TTL</label>
                    <input style={{ ...panelStyles.input, borderColor: selectedField === 'ttl' ? 'rgba(250,204,21,0.55)' : 'rgba(56,189,248,0.22)' }} value={header.ttl} onChange={(event) => updateHeaderField('ttl', event.target.value)} />
                  </div>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Protocol</label>
                    <input style={panelStyles.input} value={header.protocol} onChange={(event) => updateHeaderField('protocol', event.target.value)} />
                  </div>
                  <div style={{ ...panelStyles.field, gridColumn: '1 / -1' }}>
                    <label style={panelStyles.label}>Source IP</label>
                    <input style={{ ...panelStyles.input, borderColor: selectedField === 'sourceIp' ? 'rgba(56,189,248,0.58)' : 'rgba(56,189,248,0.22)' }} value={header.sourceIp} onChange={(event) => updateHeaderField('sourceIp', event.target.value)} />
                  </div>
                  <div style={{ ...panelStyles.field, gridColumn: '1 / -1' }}>
                    <label style={panelStyles.label}>Destination IP</label>
                    <input style={{ ...panelStyles.input, borderColor: selectedField === 'destinationIp' ? 'rgba(244,114,182,0.58)' : 'rgba(56,189,248,0.22)' }} value={header.destinationIp} onChange={(event) => updateHeaderField('destinationIp', event.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={panelStyles.sectionTitle}>Extended fields</div>
                <div style={panelStyles.grid}>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Total Length</label>
                    <input style={panelStyles.input} value={header.totalLength} onChange={(event) => updateHeaderField('totalLength', event.target.value)} />
                  </div>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Identification</label>
                    <input style={panelStyles.input} value={header.identification} onChange={(event) => updateHeaderField('identification', event.target.value)} />
                  </div>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Flags</label>
                    <input style={panelStyles.input} value={header.flags} onChange={(event) => updateHeaderField('flags', event.target.value)} />
                  </div>
                  <div style={panelStyles.field}>
                    <label style={panelStyles.label}>Fragment Offset</label>
                    <input style={panelStyles.input} value={header.fragmentOffset} onChange={(event) => updateHeaderField('fragmentOffset', event.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '12px',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '14px',
                background: 'rgba(15,23,42,0.72)',
                border: `1px solid ${errorInjected ? 'rgba(239,68,68,0.42)' : 'rgba(56,189,248,0.18)'}`,
                marginBottom: '16px',
              }}>
                <div>
                  <div style={panelStyles.sectionTitle}>Checksum validation</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: errorInjected ? '#fca5a5' : '#86efac' }}>
                    {displayedChecksum}
                  </div>
                  <div style={{ fontSize: '12px', color: errorInjected ? '#fecaca' : '#bae6fd', marginTop: '4px' }}>
                    {errorInjected ? 'Corrupted header bit injected. Destination should reject this packet.' : 'Checksum matches the current header fields.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setErrorInjected((current) => {
                      const next = !current
                      setRejected(false)
                      setDelivered(false)
                      setSelectedField('checksum')
                      setStatusText(next ? 'Error injection enabled. The destination scanner should flag the checksum.' : 'Injected error cleared. Header checksum is valid again.')
                      return next
                    })
                  }}
                  style={{
                    background: errorInjected ? 'rgba(239,68,68,0.18)' : 'rgba(14,165,233,0.16)',
                    border: `1px solid ${errorInjected ? 'rgba(239,68,68,0.4)' : 'rgba(14,165,233,0.32)'}`,
                    color: '#f8fafc',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {errorInjected ? 'Clear Error' : 'Inject Error'}
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '10px',
                marginBottom: '16px',
              }}>
                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  <div style={{ fontSize: '11px', color: '#7dd3fc', marginBottom: '4px', letterSpacing: '0.08em' }}>LIVE TTL</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#fde68a' }}>{liveTtl}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  <div style={{ fontSize: '11px', color: '#7dd3fc', marginBottom: '4px', letterSpacing: '0.08em' }}>PROTOCOL</div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: '#86efac' }}>{header.protocol}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '14px', background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  <div style={{ fontSize: '11px', color: '#7dd3fc', marginBottom: '4px', letterSpacing: '0.08em' }}>MODE</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginTop: '8px' }}>{xRayMode ? 'X-RAY' : 'SEALED'}</div>
                </div>
              </div>

              <div style={panelStyles.buttonRow}>
                <button
                  type="button"
                  onClick={runPacket}
                  disabled={sending}
                  style={{
                    background: sending ? 'rgba(14,165,233,0.14)' : 'linear-gradient(135deg, rgba(14,165,233,0.95), rgba(34,197,94,0.85))',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    padding: '12px 10px',
                    cursor: sending ? 'default' : 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Send Packet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setXRayMode((current) => {
                      const next = !current
                      setStatusText(next ? 'X-ray mode enabled. Header fields are exposed as 32-bit rows.' : 'Packet shell resealed. Click again to inspect the header grid.')
                      return next
                    })
                  }}
                  style={{
                    background: 'rgba(15,23,42,0.88)',
                    border: '1px solid rgba(56,189,248,0.22)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  {xRayMode ? 'Seal Packet' : 'X-Ray'}
                </button>
                <button
                  type="button"
                  onClick={() => resetScene()}
                  style={{
                    background: 'rgba(15,23,42,0.88)',
                    border: '1px solid rgba(56,189,248,0.22)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  Reset Run
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '12px', color: '#93c5fd', lineHeight: 1.6 }}>
                Click the packet to toggle X-ray mode. Set TTL to 2 to watch it expire at the second router. Use Edit Topology to move routers, rename devices, or change the client and server IPv4 addresses.
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}