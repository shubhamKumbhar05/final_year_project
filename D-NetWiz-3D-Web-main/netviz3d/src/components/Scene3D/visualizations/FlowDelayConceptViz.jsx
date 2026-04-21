import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'

const MIN_PCS = 2
const MAX_PCS = 8
const PROPAGATION_SPEED = 2e8
const ACK_BITS = 64

const LINK_COLORS = {
  tube: '#002244',
  emissive: '#0066cc',
}

function generateMacAddress() {
  const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256))
  bytes[0] = (bytes[0] | 0x02) & 0xfe
  return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':')
}

function isValidMac(mac) {
  return /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim())
}

function uniqueMacList(count) {
  const unique = new Set()
  while (unique.size < count) unique.add(generateMacAddress())
  return Array.from(unique)
}

function makePairKey(a, b) {
  return [a, b].sort().join('|')
}

function curveBetween(start, end) {
  const s = new THREE.Vector3(start[0], start[1], start[2])
  const e = new THREE.Vector3(end[0], end[1], end[2])
  const arcHeight = 0.8 + s.distanceTo(e) * 0.08
  const mid = new THREE.Vector3((s.x + e.x) / 2, Math.max(s.y, e.y) + arcHeight, (s.z + e.z) / 2)
  return new THREE.CatmullRomCurve3([s, mid, e])
}

function NetworkLink({ start, end, active = false }) {
  const geometry = useMemo(() => {
    const c = curveBetween(start, end)
    return new THREE.TubeGeometry(c, 48, 0.04, 8, false)
  }, [start, end])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={active ? '#0b3d91' : LINK_COLORS.tube}
        emissive={active ? '#22d3ee' : LINK_COLORS.emissive}
        emissiveIntensity={active ? 1.15 : 0.8}
        metalness={0.5}
        roughness={0.35}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

function PCNode({ pc, role, showSuccess }) {
  return (
    <group position={pc.position}>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[0.95, 0.62, 0.12]} />
        <meshStandardMaterial color="#0f172a" emissive="#0f172a" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.39, 0.07]}>
        <boxGeometry args={[0.78, 0.47, 0.02]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0369a1" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.32, 16]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[0.45, 0.05, 0.25]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      <Text position={[0, 0.86, 0]} fontSize={0.16} color="#f8fafc" anchorX="center" anchorY="middle">
        {pc.name}
      </Text>
      <Text position={[0, -0.28, 0]} fontSize={0.11} color="#22d3ee" anchorX="center" anchorY="middle" maxWidth={2.4}>
        {pc.mac}
      </Text>
      {role && (
        <Text position={[0, 1.08, 0]} fontSize={0.11} color="#fde68a" anchorX="center" anchorY="middle">
          {role}
        </Text>
      )}

      {showSuccess && (
        <group position={[0, 1.3, 0]}>
          <mesh>
            <planeGeometry args={[2.2, 0.34]} />
            <meshBasicMaterial color="#16a34a" transparent opacity={0.85} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            ACK Received
          </Text>
        </group>
      )}
    </group>
  )
}

function RouterNode({ position, queuePackets, phase, phaseProgress }) {
  const scannerActive = phase === 'processing'
  const queueActive = phase === 'queue'

  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.3, 0.8, 1]} />
        <meshStandardMaterial color="#1f2937" emissive="#0f172a" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.14, 20]} />
        <meshStandardMaterial
          color={scannerActive ? '#facc15' : '#475569'}
          emissive={scannerActive ? '#f59e0b' : '#1e293b'}
          emissiveIntensity={scannerActive ? 1.2 : 0.2}
        />
      </mesh>
      <Text position={[0, 1.2, 0]} fontSize={0.12} color="#f8fafc" anchorX="center" anchorY="middle">
        Router
      </Text>

      <group position={[-0.5, 0.22, 0.52]}>
        <mesh>
          <boxGeometry args={[0.38, 0.54, 0.34]} />
          <meshStandardMaterial color="#0f172a" emissive="#020617" emissiveIntensity={0.2} transparent opacity={0.92} />
        </mesh>
        {Array.from({ length: Math.min(6, queuePackets) }, (_, idx) => {
          const y = -0.18 + idx * 0.1
          const pulse = queueActive ? 0.1 * Math.sin((idx + 1) * 4 + phaseProgress * Math.PI * 4) : 0
          return (
            <mesh key={`qp-${idx}`} position={[0, y + pulse, 0]}>
              <boxGeometry args={[0.26, 0.06, 0.2]} />
              <meshStandardMaterial color={queueActive ? '#ef4444' : '#60a5fa'} emissive={queueActive ? '#b91c1c' : '#1d4ed8'} emissiveIntensity={0.6} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function packetPositionOnRoute(fromPos, routerPos, toPos, phase, progress) {
  const curveA = curveBetween(fromPos, routerPos)
  const curveB = curveBetween(routerPos, toPos)

  if (phase === 'propagation') {
    if (progress < 0.5) return curveA.getPoint(progress / 0.5)
    return curveB.getPoint((progress - 0.5) / 0.5)
  }

  if (phase === 'ack-propagation') {
    if (progress < 0.5) return curveB.getPoint(1 - progress / 0.5)
    return curveA.getPoint(1 - (progress - 0.5) / 0.5)
  }

  if (phase === 'queue' || phase === 'processing') return new THREE.Vector3(routerPos[0], routerPos[1] + 0.6, routerPos[2])
  if (phase === 'ack-transmission') return new THREE.Vector3(toPos[0], toPos[1] + 0.4, toPos[2])
  return new THREE.Vector3(fromPos[0], fromPos[1] + 0.45, fromPos[2])
}

function AnimatedPacket({ fromPos, toPos, routerPos, phase, phaseProgress }) {
  if (!fromPos || !toPos || !routerPos || phase === 'idle' || phase === 'complete') return null
  const isAck = phase === 'ack-transmission' || phase === 'ack-propagation'
  const packetPos = packetPositionOnRoute(fromPos, routerPos, toPos, phase, phaseProgress)

  return (
    <group position={[packetPos.x, packetPos.y, packetPos.z]}>
      <mesh scale={phase === 'transmission' ? [1 - phaseProgress * 0.35, 1 - phaseProgress * 0.35, 1 - phaseProgress * 0.35] : [1, 1, 1]}>
        <boxGeometry args={isAck ? [0.28, 0.2, 0.2] : [0.4, 0.26, 0.26]} />
        <meshStandardMaterial
          color={isAck ? '#22c55e' : '#38bdf8'}
          emissive={isAck ? '#16a34a' : '#0ea5e9'}
          emissiveIntensity={0.9}
          transparent
          opacity={phase === 'transmission' ? Math.max(0.35, 1 - phaseProgress * 0.5) : 1}
        />
      </mesh>
      <Text position={[0, 0.24, 0]} fontSize={0.09} color="#e2e8f0" anchorX="center" anchorY="middle">
        {isAck ? 'ACK' : 'DATA'}
      </Text>
    </group>
  )
}

function sanitizeBitStream(input) {
  const cleaned = input.replace(/[^01]/g, '')
  return cleaned.length > 0 ? cleaned : '10110011'
}

function parityBitFor(bits, mode) {
  const ones = bits.split('').filter((b) => b === '1').length
  if (mode === 'odd') return ones % 2 === 0 ? '1' : '0'
  return ones % 2 === 0 ? '0' : '1'
}

function visualDuration(realSeconds, timeScale) {
  const scale = Math.max(0.1, timeScale)
  return Math.max(0.45, Math.min(12, (realSeconds * 9) / scale))
}

function formatMs(seconds) {
  return `${(seconds * 1000).toFixed(2)} ms`
}

export default function FlowDelayConceptViz() {
  const [setupOpen, setSetupOpen] = useState(true)
  const [pcCount, setPcCount] = useState(4)
  const [assignmentMode, setAssignmentMode] = useState('automatic')
  const [manualMacs, setManualMacs] = useState(Array.from({ length: 4 }, () => ''))
  const [pcs, setPcs] = useState([])
  const [links, setLinks] = useState([])
  const [setupError, setSetupError] = useState('')
  const [linkFrom, setLinkFrom] = useState('')
  const [linkTo, setLinkTo] = useState('')

  const [sourcePc, setSourcePc] = useState('')
  const [targetPc, setTargetPc] = useState('')
  const [txError, setTxError] = useState('')

  const [payloadBitsInput, setPayloadBitsInput] = useState('10110011')
  const [packetSizeBits, setPacketSizeBits] = useState(1024)
  const [bandwidthMbps, setBandwidthMbps] = useState(12)
  const [distanceKm, setDistanceKm] = useState(80)
  const [trafficLoad, setTrafficLoad] = useState(35)
  const [processingMs, setProcessingMs] = useState(2.5)
  const [timeScale, setTimeScale] = useState(1)
  const [parityMode, setParityMode] = useState('even')
  const [extraCongestion, setExtraCongestion] = useState(false)

  const [leftWindowLock, setLeftWindowLock] = useState(false)
  const [rightWindowLock, setRightWindowLock] = useState(false)
  const [leftWindowX, setLeftWindowX] = useState(20)
  const [leftWindowY, setLeftWindowY] = useState(110)
  const [rightWindowX, setRightWindowX] = useState(() => (typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 580) : 760))
  const [rightWindowY, setRightWindowY] = useState(() => (typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 395) : 220))
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1366,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  }))

  const [phase, setPhase] = useState('idle')
  const [phaseProgress, setPhaseProgress] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [clockMs, setClockMs] = useState(0)
  const [showSuccessOnReceiver, setShowSuccessOnReceiver] = useState(false)

  const [metrics, setMetrics] = useState({ dTrans: 0, dProp: 0, dQueue: 0, dProc: 0, dAckTrans: 0, dAckProp: 0, totalDelay: 0, rtt: 0, queuePackets: 0 })
  const [receiverState, setReceiverState] = useState({ framedBits: '-', parityBit: '-', parityOk: null, message: 'Ready' })
  const [history, setHistory] = useState([])

  const leftPanelMaxX = Math.max(0, viewport.w - 520)
  const rightPanelMaxX = Math.max(0, viewport.w - 560)
  const panelMaxY = Math.max(0, viewport.h - 120)

  const runRef = useRef({ stages: [], stageIndex: 0, elapsedInStage: 0, elapsedVisual: 0, totalVisualDuration: 1, rttSeconds: 0, runId: 0 })

  const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs])
  const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc])
  const sourceNode = useMemo(() => pcs.find((pc) => pc.id === sourcePc), [pcs, sourcePc])
  const targetNode = useMemo(() => pcs.find((pc) => pc.id === targetPc), [pcs, targetPc])
  const activePairKey = useMemo(() => (sourcePc && targetPc ? makePairKey(sourcePc, targetPc) : ''), [sourcePc, targetPc])

  const routerPos = useMemo(() => {
    if (!sourceNode || !targetNode) return null
    const sx = sourceNode.position[0]
    const sz = sourceNode.position[2]
    const tx = targetNode.position[0]
    const tz = targetNode.position[2]
    const mx = (sx + tx) / 2
    const mz = (sz + tz) / 2
    const dx = tx - sx
    const dz = tz - sz
    const len = Math.hypot(dx, dz)
    const nx = len > 0.001 ? -dz / len : 0
    const nz = len > 0.001 ? dx / len : 1
    const lateralOffset = Math.min(2.2, Math.max(1.1, len * 0.22))
    return [mx + nx * lateralOffset, 0.25, mz + nz * lateralOffset]
  }, [sourceNode, targetNode])

  const payloadBits = useMemo(() => sanitizeBitStream(payloadBitsInput), [payloadBitsInput])
  const onesCount = useMemo(() => payloadBits.split('').filter((b) => b === '1').length, [payloadBits])
  const parityBit = useMemo(() => parityBitFor(payloadBits, parityMode), [payloadBits, parityMode])
  const framedBits = useMemo(() => `${payloadBits}${parityBit}`, [payloadBits, parityBit])

  useEffect(() => {
    setManualMacs((prev) => Array.from({ length: pcCount }, (_, idx) => prev[idx] ?? ''))
  }, [pcCount])

  useEffect(() => {
    if (!sourcePc && pcs.length > 0) setSourcePc(pcs[0].id)
  }, [sourcePc, pcs])

  useEffect(() => {
    if (!targetPc && toOptions.length > 0) setTargetPc(toOptions[0].id)
  }, [targetPc, toOptions])

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function preparePcConfig() {
    setSetupError('')
    if (pcCount < MIN_PCS || pcCount > MAX_PCS) {
      setSetupError(`PC count must be between ${MIN_PCS} and ${MAX_PCS}.`)
      return
    }

    let macs = []
    if (assignmentMode === 'manual') {
      const trimmed = manualMacs.slice(0, pcCount).map((m) => m.trim())
      if (trimmed.some((m) => !isValidMac(m))) {
        setSetupError('All manual MAC addresses must follow format XX:XX:XX:XX:XX:XX')
        return
      }
      if (new Set(trimmed.map((m) => m.toUpperCase())).size !== trimmed.length) {
        setSetupError('Manual MAC addresses must be unique.')
        return
      }
      macs = trimmed.map((m) => m.toUpperCase())
    } else {
      macs = uniqueMacList(pcCount)
      setManualMacs(macs)
    }

    const radius = Math.max(2.8, Math.min(4.2, pcCount * 0.65))
    const builtPcs = Array.from({ length: pcCount }, (_, i) => {
      const angle = (i / pcCount) * Math.PI * 2
      return { id: `pc-${i + 1}`, name: `PC-${i + 1}`, mac: macs[i], position: [Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius] }
    })

    setPcs(builtPcs)
    setLinks([])
    setLinkFrom(builtPcs[0]?.id ?? '')
    setLinkTo(builtPcs[1]?.id ?? '')
    setSourcePc(builtPcs[0]?.id ?? '')
    setTargetPc(builtPcs[1]?.id ?? '')
  }

  function addLink() {
    setSetupError('')
    if (!linkFrom || !linkTo) return setSetupError('Select both PCs before adding a link.')
    if (linkFrom === linkTo) return setSetupError('A PC cannot be linked to itself.')
    const key = makePairKey(linkFrom, linkTo)
    if (links.some((l) => l.key === key)) return setSetupError('Link already exists between those PCs.')
    setLinks((prev) => [...prev, { id: `link-${prev.length + 1}`, key, from: linkFrom, to: linkTo }])
  }

  function removeLink(id) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  function completeSetup() {
    if (pcs.length < MIN_PCS) return setSetupError('Prepare PCs first.')
    if (links.length === 0) return setSetupError('Add at least one link before continuing.')
    setSetupOpen(false)
  }

  function buildRunMetrics() {
    const L = Math.max(64, Number(packetSizeBits) || 64)
    const R = Math.max(0.1, Number(bandwidthMbps) || 0.1) * 1e6
    const distMeters = Math.max(1, Number(distanceKm) || 1) * 1000
    const load = Math.max(0, Math.min(100, Number(trafficLoad) || 0))
    const procMs = Math.max(0.2, Number(processingMs) || 0.2)

    const dTrans = L / R
    const dProp = distMeters / PROPAGATION_SPEED
    const queuePackets = Math.round((load / 100) * 4) + (extraCongestion ? 3 : 0)
    const dQueue = queuePackets * dTrans * 0.35
    const dProc = procMs / 1000
    const dAckTrans = ACK_BITS / R
    const dAckProp = dProp
    const totalDelay = dTrans + dProp + dQueue + dProc
    const rtt = totalDelay + dAckTrans + dAckProp

    return { dTrans, dProp, dQueue, dProc, dAckTrans, dAckProp, totalDelay, rtt, queuePackets }
  }

  function startSimulation() {
    setTxError('')
    if (!sourcePc || !targetPc) return setTxError('Select both From and To PCs.')
    if (sourcePc === targetPc) return setTxError('From and To must be different PCs.')
    const exists = links.some((l) => l.key === makePairKey(sourcePc, targetPc))
    if (!exists) return setTxError('No physical link exists between selected PCs. Add it in topology setup.')

    const m = buildRunMetrics()
    const stageDefs = [
      { key: 'transmission', duration: visualDuration(m.dTrans, timeScale) },
      { key: 'propagation', duration: visualDuration(m.dProp, timeScale) },
      { key: 'queue', duration: visualDuration(Math.max(m.dQueue, 0.0001), timeScale) },
      { key: 'processing', duration: visualDuration(m.dProc, timeScale) },
      { key: 'ack-transmission', duration: visualDuration(m.dAckTrans, timeScale) },
      { key: 'ack-propagation', duration: visualDuration(m.dAckProp, timeScale) },
    ]

    const totalVisual = stageDefs.reduce((acc, s) => acc + s.duration, 0)
    const injectedError = extraCongestion && m.queuePackets >= 5 && Math.random() < 0.2
    let receivedFrame = framedBits
    if (injectedError) {
      const flipAt = Math.max(0, Math.min(receivedFrame.length - 1, Math.floor(receivedFrame.length / 2)))
      const chars = receivedFrame.split('')
      chars[flipAt] = chars[flipAt] === '1' ? '0' : '1'
      receivedFrame = chars.join('')
    }

    const receivedPayload = receivedFrame.slice(0, -1)
    const receivedParityBit = receivedFrame.slice(-1)
    const expectedParityBit = parityBitFor(receivedPayload, parityMode)
    const parityOk = receivedParityBit === expectedParityBit

    runRef.current = {
      stages: stageDefs,
      stageIndex: 0,
      elapsedInStage: 0,
      elapsedVisual: 0,
      totalVisualDuration: totalVisual,
      rttSeconds: m.rtt,
      runId: runRef.current.runId + 1,
    }

    setMetrics(m)
    setClockMs(0)
    setPhase(stageDefs[0].key)
    setPhaseProgress(0)
    setIsRunning(true)
    setShowSuccessOnReceiver(false)

    setReceiverState({
      framedBits: receivedFrame,
      parityBit: receivedParityBit,
      parityOk,
      message: injectedError
        ? 'Bit flip observed under congestion. Parity check evaluates frame integrity.'
        : 'No bit corruption injected in this run. Receiver validates parity and sends ACK.',
    })

    setHistory((prev) => {
      const next = [...prev]
      if (next.length > 9) next.shift()
      next.push({ id: runRef.current.runId + 1, from: sourceNode?.name ?? sourcePc, to: targetNode?.name ?? targetPc, rtt: m.rtt, parityOk, timestamp: new Date().toLocaleTimeString() })
      return next
    })
  }

  useFrame((_, delta) => {
    if (!isRunning) return
    const current = runRef.current
    const stage = current.stages[current.stageIndex]
    if (!stage) return setIsRunning(false)

    current.elapsedInStage += delta
    current.elapsedVisual += delta

    const progress = Math.min(current.elapsedInStage / stage.duration, 1)
    setPhaseProgress(progress)
    const ratio = Math.min(current.elapsedVisual / current.totalVisualDuration, 1)
    setClockMs(current.rttSeconds * ratio * 1000)

    if (progress >= 1) {
      current.stageIndex += 1
      current.elapsedInStage = 0
      const next = current.stages[current.stageIndex]
      if (!next) {
        setPhase('complete')
        setIsRunning(false)
        setPhaseProgress(1)
        setClockMs(current.rttSeconds * 1000)
        setShowSuccessOnReceiver(true)
        setTimeout(() => setShowSuccessOnReceiver(false), 3500)
      } else {
        setPhase(next.key)
      }
    }
  })

  return (
    <group>
      <group position={[0, -0.7, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[15, 8]} />
          <meshStandardMaterial color="#64748b" emissive="#475569" emissiveIntensity={0.18} />
        </mesh>
      </group>

      {links.map((link) => {
        const start = positionMap.get(link.from)
        const end = positionMap.get(link.to)
        if (!start || !end) return null
        return <NetworkLink key={link.id} start={start} end={end} active={link.key === activePairKey} />
      })}

      {sourceNode && targetNode && routerPos && (
        <>
          <NetworkLink start={sourceNode.position} end={routerPos} active={isRunning || phase !== 'idle'} />
          <NetworkLink start={routerPos} end={targetNode.position} active={isRunning || phase !== 'idle'} />
          <RouterNode position={routerPos} queuePackets={metrics.queuePackets} phase={phase} phaseProgress={phaseProgress} />
        </>
      )}

      {pcs.map((pc) => {
        let role = ''
        if (pc.id === sourcePc) role = 'Source'
        if (pc.id === targetPc) role = 'Destination'
        return <PCNode key={pc.id} pc={pc} role={role} showSuccess={showSuccessOnReceiver && pc.id === targetPc} />
      })}

      {sourceNode && targetNode && routerPos && (
        <AnimatedPacket fromPos={sourceNode.position} toPos={targetNode.position} routerPos={routerPos} phase={phase} phaseProgress={phaseProgress} />
      )}

      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="w-full h-full relative">
          {setupOpen && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
              <div className="w-[min(860px,96vw)] max-h-[90vh] overflow-auto rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-5 md:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/85 mb-2">Flow Delay Topology Setup</p>
                <h3 className="text-xl font-bold text-slate-100 mb-4">Configure PCs, MACs, and Links Before Delay Simulation</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">1) PC and MAC Assignment</p>
                    <label htmlFor="pc-count" className="block text-sm text-slate-200 mb-1">Number of PCs</label>
                    <input id="pc-count" type="number" min={MIN_PCS} max={MAX_PCS} value={pcCount} onChange={(e) => setPcCount(Math.max(MIN_PCS, Math.min(MAX_PCS, Number(e.target.value) || MIN_PCS)))} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setAssignmentMode('manual')} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${assignmentMode === 'manual' ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>Manual MAC</button>
                      <button type="button" onClick={() => setAssignmentMode('automatic')} className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${assignmentMode === 'automatic' ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>Automatic MAC</button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Array.from({ length: pcCount }, (_, i) => (
                        <div key={`manual-mac-${i}`}>
                          <label className="block text-[11px] text-slate-400 mb-1">PC-{i + 1} MAC</label>
                          <input
                            type="text"
                            value={manualMacs[i] ?? ''}
                            disabled={assignmentMode !== 'manual'}
                            onChange={(e) => {
                              const next = [...manualMacs]
                              next[i] = e.target.value
                              setManualMacs(next)
                            }}
                            placeholder="AA:BB:CC:DD:EE:FF"
                            className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${assignmentMode === 'manual' ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed'}`}
                          />
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={preparePcConfig} className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35">Apply PC and MAC Setup</button>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">2) Link Builder</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">PC A</label>
                        <select value={linkFrom} onChange={(e) => setLinkFrom(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100">
                          {pcs.map((pc) => <option key={`from-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">PC B</label>
                        <select value={linkTo} onChange={(e) => setLinkTo(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100">
                          {pcs.map((pc) => <option key={`to-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <button type="button" onClick={addLink} disabled={pcs.length === 0} className="mt-3 w-full rounded-md bg-blue-500/25 border border-blue-300/50 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/35 disabled:opacity-40">Add Link</button>
                    <div className="mt-3 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-900/70 p-2 space-y-1">
                      {links.length === 0 && <p className="text-xs text-slate-500">No links added yet.</p>}
                      {links.map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded bg-slate-800/80 px-2 py-1">
                          <p className="text-xs text-slate-200">{l.from.toUpperCase()} <span>{'<->'}</span> {l.to.toUpperCase()}</p>
                          <button type="button" onClick={() => removeLink(l.id)} className="text-[11px] text-red-300 hover:text-red-200">remove</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={completeSetup} className="mt-3 w-full rounded-md bg-emerald-500/25 border border-emerald-300/50 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/35">Complete Topology Setup</button>
                  </div>
                </div>

                {setupError && <p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{setupError}</p>}
              </div>
            </div>
          )}

          {!setupOpen && (
            <>
              <div className="absolute pointer-events-auto rounded-xl border border-amber-400/30 bg-slate-950/88 backdrop-blur-md shadow-[0_12px_45px_rgba(0,0,0,0.45)]" style={{ left: leftWindowX, top: leftWindowY, width: 'min(520px, 94vw)' }}>
                <div className="px-4 py-2 border-b border-slate-700/50"><p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/85">Input Window + Math Window</p></div>
                <div className="p-4 md:p-5">
                  <div className="mb-3 rounded-md border border-slate-700 bg-slate-900/70 p-3 space-y-2 text-xs">
                    <label className="inline-flex items-center gap-2 text-amber-200 font-semibold"><input type="checkbox" checked={leftWindowLock} onChange={(e) => setLeftWindowLock(e.target.checked)} className="accent-amber-500" />Lock</label>
                    <p className="text-slate-400">When Lock is ON, use sliders to reposition this window.</p>
                    <label className="block">Horizontal: <span className="text-cyan-300">{leftWindowX}px</span><input type="range" min="0" max={leftPanelMaxX} step="1" disabled={!leftWindowLock} value={Math.min(leftWindowX, leftPanelMaxX)} onChange={(e) => setLeftWindowX(Number(e.target.value))} className="w-full accent-cyan-400 disabled:opacity-40" /></label>
                    <label className="block">Vertical: <span className="text-cyan-300">{leftWindowY}px</span><input type="range" min="0" max={panelMaxY} step="1" disabled={!leftWindowLock} value={Math.min(leftWindowY, panelMaxY)} onChange={(e) => setLeftWindowY(Number(e.target.value))} className="w-full accent-cyan-400 disabled:opacity-40" /></label>
                  </div>
                  <div className={`${leftWindowLock ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="mb-3 flex gap-2">
                      <button type="button" onClick={() => setSetupOpen(true)} className="px-3 py-2 text-xs font-semibold rounded-md border border-blue-300/50 bg-blue-500/25 text-blue-100 hover:bg-blue-500/35">Edit Topology</button>
                      <button type="button" onClick={() => setExtraCongestion((prev) => !prev)} className={`px-3 py-2 text-xs font-semibold rounded-md border ${extraCongestion ? 'border-red-300/60 bg-red-500/25 text-red-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>{extraCongestion ? 'Congestion: ON' : 'Congestion: OFF'}</button>
                    </div>
                    <label htmlFor="payload-bits" className="block text-xs text-slate-200 mb-1 font-semibold">Input Window: Payload Bits</label>
                    <input id="payload-bits" type="text" value={payloadBitsInput} onChange={(e) => setPayloadBitsInput(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400" placeholder="Binary payload e.g. 10110011" />
                    <p className="mt-1 text-[11px] text-slate-400">Only 0 and 1 are used for parity math.</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div><label className="block text-[11px] text-slate-400 mb-1">From</label><select value={sourcePc} onChange={(e) => { setSourcePc(e.target.value); setTargetPc('') }} className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100">{pcs.map((pc) => <option key={`src-${pc.id}`} value={pc.id}>{pc.name}</option>)}</select></div>
                      <div><label className="block text-[11px] text-slate-400 mb-1">To</label><select value={targetPc} onChange={(e) => setTargetPc(e.target.value)} className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100">{toOptions.map((pc) => <option key={`dst-${pc.id}`} value={pc.id}>{pc.name}</option>)}</select></div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-200">
                      <label className="block">Packet Size: <span className="text-cyan-300">{packetSizeBits} bits</span><input type="range" min="128" max="8192" step="64" value={packetSizeBits} onChange={(e) => setPacketSizeBits(Number(e.target.value))} className="w-full accent-cyan-400" /></label>
                      <label className="block">Bandwidth: <span className="text-cyan-300">{bandwidthMbps.toFixed(1)} Mbps</span><input type="range" min="0.5" max="100" step="0.5" value={bandwidthMbps} onChange={(e) => setBandwidthMbps(Number(e.target.value))} className="w-full accent-cyan-400" /></label>
                      <label className="block">Distance: <span className="text-cyan-300">{distanceKm.toFixed(1)} km</span><input type="range" min="1" max="1200" step="1" value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} className="w-full accent-cyan-400" /></label>
                      <label className="block">Traffic Load: <span className="text-cyan-300">{trafficLoad}%</span><input type="range" min="0" max="100" step="1" value={trafficLoad} onChange={(e) => setTrafficLoad(Number(e.target.value))} className="w-full accent-cyan-400" /></label>
                      <label className="block">Processing Delay: <span className="text-cyan-300">{processingMs.toFixed(1)} ms</span><input type="range" min="0.2" max="20" step="0.1" value={processingMs} onChange={(e) => setProcessingMs(Number(e.target.value))} className="w-full accent-cyan-400" /></label>
                      <label className="block">Slow Motion: <span className="text-cyan-300">{timeScale.toFixed(1)}x</span><input type="range" min="0.1" max="2" step="0.1" value={timeScale} onChange={(e) => setTimeScale(Number(e.target.value))} className="w-full accent-cyan-400" /></label>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setParityMode('even')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${parityMode === 'even' ? 'border-amber-300 bg-amber-500/25 text-amber-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>Even Parity</button>
                      <button type="button" onClick={() => setParityMode('odd')} className={`rounded-md border px-3 py-2 text-xs font-semibold ${parityMode === 'odd' ? 'border-amber-300 bg-amber-500/25 text-amber-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>Odd Parity</button>
                    </div>
                    <button type="button" onClick={startSimulation} disabled={isRunning} className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35 disabled:opacity-50">{isRunning ? 'Simulation Running...' : 'Start Delay Simulation'}</button>
                    {txError && <p className="mt-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">{txError}</p>}
                    <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/70 p-3"><p className="text-slate-300 mb-1">Delay Equations</p><p className="text-slate-200">d_trans = L / R = {Math.max(64, Number(packetSizeBits))} / {(Math.max(0.1, Number(bandwidthMbps)) * 1e6).toFixed(0)} s</p><p className="text-slate-200">d_prop = distance / speed = {(Math.max(1, Number(distanceKm)) * 1000).toFixed(0)} / {PROPAGATION_SPEED} s</p><p className="text-slate-200">d_queue = queuePackets × d_trans × 0.35 = {metrics.queuePackets} × d_trans × 0.35</p><p className="text-slate-200">d_proc = {Math.max(0.2, Number(processingMs)).toFixed(1)} ms</p><p className="text-emerald-300 mt-1 font-semibold">RTT = d_trans + d_prop + d_queue + d_proc + d_ack_trans + d_ack_prop</p></div>
                    <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/70 p-3"><p className="text-slate-300 mb-1">Parity Math ({parityMode})</p><p className="text-slate-200">Ones in payload = {onesCount}</p><p className="text-slate-200">Parity bit = {parityBit}</p><p className="text-slate-200">Framed bits = {framedBits}</p><p className="text-slate-400 mt-1">Rule: Even parity makes total ones even, Odd parity makes total ones odd.</p></div>
                  </div>
                </div>
              </div>

              <div className="absolute pointer-events-auto rounded-xl border border-amber-400/30 bg-slate-950/88 backdrop-blur-md shadow-[0_12px_45px_rgba(0,0,0,0.45)]" style={{ left: rightWindowX, top: rightWindowY, width: 'min(560px, 94vw)' }}>
                <div className="px-4 py-2 border-b border-slate-700/50"><p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/85">Receiver Node + Transmission History</p></div>
                <div className="p-4 md:p-5">
                  <div className="mb-3 rounded-md border border-slate-700 bg-slate-900/70 p-3 space-y-2 text-xs">
                    <label className="inline-flex items-center gap-2 text-amber-200 font-semibold"><input type="checkbox" checked={rightWindowLock} onChange={(e) => setRightWindowLock(e.target.checked)} className="accent-amber-500" />Lock</label>
                    <p className="text-slate-400">When Lock is ON, use sliders to reposition this window.</p>
                    <label className="block">Horizontal: <span className="text-cyan-300">{rightWindowX}px</span><input type="range" min="0" max={rightPanelMaxX} step="1" disabled={!rightWindowLock} value={Math.min(rightWindowX, rightPanelMaxX)} onChange={(e) => setRightWindowX(Number(e.target.value))} className="w-full accent-cyan-400 disabled:opacity-40" /></label>
                    <label className="block">Vertical: <span className="text-cyan-300">{rightWindowY}px</span><input type="range" min="0" max={panelMaxY} step="1" disabled={!rightWindowLock} value={Math.min(rightWindowY, panelMaxY)} onChange={(e) => setRightWindowY(Number(e.target.value))} className="w-full accent-cyan-400 disabled:opacity-40" /></label>
                  </div>
                  <div className={`${rightWindowLock ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="w-[min(560px,94vw)] space-y-2 text-xs">
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3"><p className="text-slate-400 mb-1">Frame At Receiver</p><p className="font-mono text-cyan-200 break-all">{receiverState.framedBits}</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3"><p className="text-slate-400 mb-1">Parity Mode</p><p className="text-amber-200 font-semibold uppercase">{parityMode}</p></div>
                        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3"><p className="text-slate-400 mb-1">Parity Result</p><p className={`font-semibold ${receiverState.parityOk == null ? 'text-slate-300' : receiverState.parityOk ? 'text-emerald-400' : 'text-red-400'}`}>{receiverState.parityOk == null ? 'Pending' : receiverState.parityOk ? 'Valid' : 'Mismatch'}</p></div>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3"><p className="text-slate-400 mb-1">Receiver Note</p><p className="text-slate-200 leading-relaxed">{receiverState.message}</p></div>
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3"><p className="text-slate-400 mb-1">ACK State</p><p className={`font-semibold ${phase === 'complete' ? 'text-emerald-400' : 'text-cyan-300'}`}>{phase === 'complete' ? 'ACK returned to Source' : isRunning ? `In transit (${phase})` : 'Idle'}</p></div>
                    </div>
                    <div className="mt-3 w-[min(520px,92vw)] space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2"><p className="text-slate-400">d_trans</p><p className="text-blue-300 font-semibold">{formatMs(metrics.dTrans)}</p></div>
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2"><p className="text-slate-400">d_prop</p><p className="text-yellow-300 font-semibold">{formatMs(metrics.dProp)}</p></div>
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2"><p className="text-slate-400">d_queue</p><p className="text-red-300 font-semibold">{formatMs(metrics.dQueue)}</p></div>
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2"><p className="text-slate-400">d_proc</p><p className="text-fuchsia-300 font-semibold">{formatMs(metrics.dProc)}</p></div>
                      </div>
                      <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3"><p className="text-slate-300 mb-1">Global Clock (RTT)</p><p className="text-xl font-bold text-emerald-300">{clockMs.toFixed(2)} ms</p><p className="mt-1 text-[11px] text-slate-400">Phase: <span className="text-cyan-300 uppercase">{phase}</span></p></div>
                      <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3"><p className="text-slate-300 mb-2">Combined Delay Stack</p><div className="h-4 w-full rounded bg-slate-800 overflow-hidden flex">{metrics.totalDelay > 0 && (<><div style={{ width: `${(metrics.dTrans / metrics.totalDelay) * 100}%` }} className="h-full bg-blue-500" /><div style={{ width: `${(metrics.dProp / metrics.totalDelay) * 100}%` }} className="h-full bg-yellow-400" /><div style={{ width: `${(metrics.dQueue / metrics.totalDelay) * 100}%` }} className="h-full bg-red-500" /><div style={{ width: `${(metrics.dProc / metrics.totalDelay) * 100}%` }} className="h-full bg-fuchsia-500" /></>)}</div><p className="mt-2 text-[11px] text-slate-400">Blue=Trans | Yellow=Prop | Red=Queue | Purple=Proc</p></div>
                      <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3"><p className="text-slate-300 mb-2">Run History</p>{history.length === 0 ? (<p className="text-slate-500">No runs yet.</p>) : (<div className="max-h-32 overflow-y-auto space-y-2">{history.slice().reverse().map((h) => (<div key={h.id} className="rounded border border-slate-700 bg-slate-800/60 p-2"><p className="text-slate-300">{h.timestamp} | {h.from} {'->'} {h.to}</p><p className="text-slate-400">RTT: <span className="text-emerald-300">{formatMs(h.rtt)}</span> | Parity: <span className={h.parityOk ? 'text-emerald-300' : 'text-red-300'}>{h.parityOk ? 'Valid' : 'Mismatch'}</span></p></div>))}</div>)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Html>
    </group>
  )
}
