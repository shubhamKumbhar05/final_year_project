import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

const ERROR_TYPE = {
  ONE_BIT: 'one-bit',
  BURST: 'burst',
}

const MIN_PCS = 2
const MAX_PCS = 8

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
  while (unique.size < count) {
    unique.add(generateMacAddress())
  }
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

function DraggablePanel({ children, title, initialX, initialY, isVisible, onToggle, onDragChange }) {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return
    setIsDragging(true)
    if (onDragChange) onDragChange(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (onDragChange) onDragChange(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [isDragging])

  return (
    <div
      style={{ left: position.x, top: position.y }}
      className={`absolute pointer-events-auto rounded-xl border border-amber-400/30 bg-slate-950/82 backdrop-blur-md shadow-[0_12px_45px_rgba(0,0,0,0.45)] ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 cursor-grab">
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/85">{title}</p>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          {isVisible ? '−' : '+'}
        </button>
      </div>
      {isVisible && <div className="p-4 md:p-5">{children}</div>}
    </div>
  )
}

function NetworkLink({ start, end }) {
  const geometry = useMemo(() => {
    const c = curveBetween(start, end)
    return new THREE.TubeGeometry(c, 48, 0.04, 8, false)
  }, [start, end])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={LINK_COLORS.tube}
        emissive={LINK_COLORS.emissive}
        emissiveIntensity={0.8}
        metalness={0.5}
        roughness={0.35}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

function TravelingFrameBlock({ fromPos, toPos, runId, frameData, onComplete, speedMultiplier = 1 }) {
  const curve = useMemo(() => curveBetween(fromPos, toPos), [fromPos, toPos])
  const travelScale = 0.32
  const [visibleBlocks, setVisibleBlocks] = useState([])

  useEffect(() => {
    setVisibleBlocks([])
    const blockRefs = []
    const baseDuration = 0.85 / speedMultiplier
    const baseOverlap = 0.12 / speedMultiplier

    const timeline = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          if (onComplete) onComplete()
        }, 300 / speedMultiplier)
      },
    })

    frameData.blocks.forEach((_, idx) => {
      blockRefs[idx] = { t: 0, visible: false }

      timeline.call(() => {
        blockRefs[idx].visible = true
        setVisibleBlocks([...Array(idx + 1).keys()])
      })

      timeline.to(
        blockRefs[idx],
        {
          t: 1,
          duration: baseDuration,
          ease: 'power1.inOut',
        },
        `>-${baseOverlap}`
      )
    })

    return () => {
      timeline.kill()
      blockRefs.forEach((ref) => {
        if (ref) gsap.killTweensOf(ref)
      })
    }
  }, [runId, frameData, onComplete, speedMultiplier])

  return (
    <>
      {visibleBlocks.map((idx) => (
        <SingleTravelingBlock
          key={`travel-${runId}-${idx}`}
          block={frameData.blocks[idx]}
          blockIndex={idx}
          curve={curve}
          scale={travelScale}
          runId={runId}
          speedMultiplier={speedMultiplier}
        />
      ))}
    </>
  )
}

function SingleTravelingBlock({ block, blockIndex, curve, scale, runId, speedMultiplier = 1 }) {
  const groupRef = useRef()
  const proxy = useRef({ t: 0 })

  useEffect(() => {
    proxy.current.t = 0
    const tween = gsap.to(proxy.current, {
      t: 1,
      duration: 0.85 / speedMultiplier,
      ease: 'power1.inOut',
    })

    return () => {
      gsap.killTweensOf(proxy.current)
      tween.kill()
    }
  }, [runId, blockIndex, speedMultiplier])

  useEffect(() => {
    let rafId
    const tick = () => {
      const p = curve.getPoint(Math.min(proxy.current.t, 1))
      if (groupRef.current) groupRef.current.position.copy(p)
      rafId = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(rafId)
  }, [curve])

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color={block.color} emissive={block.color} emissiveIntensity={0.5} />
      </mesh>
      <Text position={[0, 0, 0.38]} fontSize={0.2} color="#e2e8f0" anchorX="center" anchorY="middle" maxWidth={0.65}>
        {block.label}
      </Text>
    </group>
  )
}

function PCNode({ pc, showSuccess }) {
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
      <mesh position={[0.55, 0.12, -0.06]}>
        <boxGeometry args={[0.28, 0.34, 0.36]} />
        <meshStandardMaterial color="#1e293b" emissive="#0f172a" emissiveIntensity={0.3} />
      </mesh>

      <Text position={[0, 0.86, 0]} fontSize={0.16} color="#f8fafc" anchorX="center" anchorY="middle">
        {pc.name}
      </Text>
      <Text position={[0, -0.28, 0]} fontSize={0.11} color="#22d3ee" anchorX="center" anchorY="middle" maxWidth={2.4}>
        {pc.mac}
      </Text>

      {showSuccess && (
        <group position={[0, 1.15, 0]}>
          <mesh>
            <planeGeometry args={[1.8, 0.35]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.85} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            ✓ Transmission Complete
          </Text>
        </group>
      )}
    </group>
  )
}

function toTextChars(input) {
  const normalized = input.length > 0 ? input : 'NETWIZ'
  return normalized.split('')
}

function buildPayloadData(input) {
  const payload = toTextChars(input)
  const output = payload.join('')
  return {
    payload,
    receiverOutput: output,
    comparisonOriginal: output,
    comparisonFramed: output,
  }
}

function errorTypeExplanation(activeErrorType) {
  if (activeErrorType === ERROR_TYPE.ONE_BIT) {
    return 'Single-Bit Error: exactly one position in the data unit is corrupted. In this simulator, one position is marked as the error position. This commonly models a short noise spike.'
  }

  return 'Burst Error: a consecutive section of positions is corrupted. Burst length is measured from first corrupted position to last corrupted position. This commonly models longer interference in serial links.'
}

function buildDecodedParts(text, errorPositions) {
  if (!text) return [{ text: '', isError: false }]
  if (!errorPositions || errorPositions.length === 0) return [{ text, isError: false }]

  const errorSet = new Set(errorPositions)
  const parts = []

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const isError = errorSet.has(i)

    if (parts.length > 0 && parts[parts.length - 1].isError === isError) {
      parts[parts.length - 1].text += char
    } else {
      parts.push({ text: char, isError })
    }
  }

  return parts
}

export default function ErrorTypeConceptViz() {
  const [setupOpen, setSetupOpen] = useState(true)
  const [pcCount, setPcCount] = useState(4)
  const [assignmentMode, setAssignmentMode] = useState('automatic')
  const [manualMacs, setManualMacs] = useState(Array.from({ length: 4 }, () => ''))
  const [pcs, setPcs] = useState([])
  const [links, setLinks] = useState([])
  const [setupError, setSetupError] = useState('')
  const [linkFrom, setLinkFrom] = useState('')
  const [linkTo, setLinkTo] = useState('')

  const [userInput, setUserInput] = useState('HELLO|NET')
  const [activeErrorType, setActiveErrorType] = useState(ERROR_TYPE.ONE_BIT)
  const [sourcePc, setSourcePc] = useState('')
  const [targetPc, setTargetPc] = useState('')
  const [txError, setTxError] = useState('')
  const [txRunId, setTxRunId] = useState(0)
  const [showFramingPayload, setShowFramingPayload] = useState(false)
  const [activeTransmission, setActiveTransmission] = useState(null)
  const [errorMode, setErrorMode] = useState('without')
  const [transmissionInProgress, setTransmissionInProgress] = useState(false)
  const [showSuccessOnReceiver, setShowSuccessOnReceiver] = useState(false)
  const [decodedWithError, setDecodedWithError] = useState('')
  const [errorPositions, setErrorPositions] = useState([])

  const [speedMultiplier, setSpeedMultiplier] = useState(0.2)
  const [inputPanelVisible, setInputPanelVisible] = useState(true)
  const [receiverPanelVisible, setReceiverPanelVisible] = useState(true)
  const [historyPanelVisible, setHistoryPanelVisible] = useState(true)
  const [transmissionHistory, setTransmissionHistory] = useState([])
  const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false)
  const [transmissionComplete, setTransmissionComplete] = useState(false)
  const [pendingTransmissionData, setPendingTransmissionData] = useState(null)
  const [receiverSnapshot, setReceiverSnapshot] = useState(null)

  const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs])
  const methodData = useMemo(() => buildPayloadData(userInput), [userInput])
  const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc])

  const travelFrameData = useMemo(() => {
    return {
      blocks: methodData.payload.map((ch) => ({
        label: ch,
        color: '#3b82f6',
      })),
    }
  }, [methodData])

  const finalDecodedOutput = methodData.receiverOutput

  const decodedOutputParts = useMemo(() => {
    const currentOutput = errorMode === 'with' ? decodedWithError : finalDecodedOutput
    return buildDecodedParts(currentOutput, errorMode === 'with' ? errorPositions : [])
  }, [decodedWithError, errorMode, errorPositions, finalDecodedOutput])

  const transmissionStatus = useMemo(() => {
    if (errorMode === 'with' && errorPositions.length > 0) {
      return 'Error Detected'
    }
    return 'No error Detected.'
  }, [errorMode, errorPositions])

  const frameVerified = useMemo(() => {
    return !(errorMode === 'with' && errorPositions.length > 0)
  }, [errorMode, errorPositions])

  useEffect(() => {
    setManualMacs((prev) => {
      const next = Array.from({ length: pcCount }, (_, idx) => prev[idx] ?? '')
      return next
    })
  }, [pcCount])

  useEffect(() => {
    if (!sourcePc && pcs.length > 0) {
      setSourcePc(pcs[0].id)
    }
  }, [sourcePc, pcs])

  useEffect(() => {
    if (!targetPc && toOptions.length > 0) {
      setTargetPc(toOptions[0].id)
    }
  }, [targetPc, toOptions])

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
      return {
        id: `pc-${i + 1}`,
        name: `PC-${i + 1}`,
        mac: macs[i],
        position: [Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius],
      }
    })

    setPcs(builtPcs)
    setLinks([])
    setLinkFrom(builtPcs[0]?.id ?? '')
    setLinkTo(builtPcs[1]?.id ?? '')
    setSourcePc(builtPcs[0]?.id ?? '')
    setTargetPc(builtPcs[1]?.id ?? '')
    setShowFramingPayload(false)
  }

  function addLink() {
    setSetupError('')
    if (!linkFrom || !linkTo) {
      setSetupError('Select both PCs before adding a link.')
      return
    }

    if (linkFrom === linkTo) {
      setSetupError('A PC cannot be linked to itself.')
      return
    }

    const key = makePairKey(linkFrom, linkTo)
    if (links.some((l) => l.key === key)) {
      setSetupError('Link already exists between those PCs.')
      return
    }

    setLinks((prev) => [...prev, { id: `link-${prev.length + 1}`, key, from: linkFrom, to: linkTo }])
  }

  function removeLink(id) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  function completeSetup() {
    if (pcs.length < MIN_PCS) {
      setSetupError('Prepare PCs first.')
      return
    }
    if (links.length === 0) {
      setSetupError('Add at least one link before continuing.')
      return
    }

    setSetupOpen(false)
  }

  function computeErrorPositions(text) {
    if (!text || text.length === 0) return []

    if (activeErrorType === ERROR_TYPE.ONE_BIT) {
      const middleIndex = Math.floor(text.length / 2)
      return [middleIndex]
    }

    // Burst: pick random non-adjacent scattered positions across the data unit.
    const maxCount = Math.max(2, Math.min(4, Math.floor(text.length / 2)))
    const burstCount = text.length <= 3 ? Math.min(2, text.length) : 2 + Math.floor(Math.random() * (maxCount - 1))

    let available = Array.from({ length: text.length }, (_, i) => i)
    const positions = []

    for (let i = 0; i < burstCount && available.length > 0; i += 1) {
      const pickIdx = Math.floor(Math.random() * available.length)
      const picked = available[pickIdx]
      positions.push(picked)
      available = available.filter((p) => Math.abs(p - picked) > 1)
    }

    return positions.sort((a, b) => a - b)
  }

  function startTransmission() {
    setTxError('')
    if (!sourcePc || !targetPc) {
      setTxError('Select both From and To PCs.')
      return
    }

    if (sourcePc === targetPc) {
      setTxError('From and To must be different PCs.')
      return
    }

    const exists = links.some((l) => l.key === makePairKey(sourcePc, targetPc))
    if (!exists) {
      setTxError('No physical link exists between selected PCs. Add it in topology setup.')
      return
    }

    const sourceNode = pcs.find((pc) => pc.id === sourcePc)
    const targetNode = pcs.find((pc) => pc.id === targetPc)

    if (!sourceNode || !targetNode) {
      setTxError('Invalid PC selection')
      return
    }

    setTransmissionInProgress(true)
    setShowSuccessOnReceiver(false)
    setShowFramingPayload(true)
    setTransmissionComplete(false)

    const original = methodData.receiverOutput
    let txErrorPositions = []
    if (errorMode === 'with') {
      txErrorPositions = computeErrorPositions(original)
      setErrorPositions(txErrorPositions)
      setDecodedWithError(original)
    } else {
      setErrorPositions([])
      setDecodedWithError(original)
    }

    const newRunId = txRunId + 1
    setTxRunId(newRunId)
    setActiveTransmission({
      fromId: sourcePc,
      toId: targetPc,
      runId: newRunId,
      frameData: travelFrameData,
    })

    const frameText = travelFrameData.blocks.map((b) => b.label).join('')
    const status = errorMode === 'with' ? 'Error' : 'No error'
    const errPositions1Indexed = txErrorPositions.map((p) => p + 1)
    const errLength =
      txErrorPositions.length === 0
        ? 0
        : activeErrorType === ERROR_TYPE.ONE_BIT
          ? 1
          : Math.max(...txErrorPositions) - Math.min(...txErrorPositions) + 1

    const snapshot = {
      originalData: methodData.comparisonOriginal,
      framedData: methodData.comparisonFramed,
      decodedParts: buildDecodedParts(original, txErrorPositions),
      transmissionStatus: txErrorPositions.length > 0 ? 'Error Detected' : 'No error Detected.',
      frameVerified: txErrorPositions.length === 0,
    }

    setPendingTransmissionData({
      id: newRunId,
      from: sourceNode.name,
      to: targetNode.name,
      frameData: frameText,
      method: activeErrorType === ERROR_TYPE.ONE_BIT ? 'Error Type: 1 bit' : 'Error Type: Burst',
      status,
      errorPositions: errPositions1Indexed,
      errorLength: errLength,
      snapshot,
    })
  }

  function handleTransmissionComplete() {
    setActiveTransmission(null)
    setShowSuccessOnReceiver(true)
    setTransmissionInProgress(false)
    setTransmissionComplete(true)

    if (pendingTransmissionData) {
      setReceiverSnapshot(pendingTransmissionData.snapshot)
      setTransmissionHistory((prev) => [
        ...prev,
        {
          ...pendingTransmissionData,
          timestamp: new Date().toLocaleTimeString(),
        },
      ])
      setPendingTransmissionData(null)
    }

    setTimeout(() => {
      setShowSuccessOnReceiver(false)
    }, 3500)
  }

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
        return <NetworkLink key={link.id} start={start} end={end} />
      })}

      {pcs.map((pc) => (
        <PCNode key={pc.id} pc={pc} showSuccess={showSuccessOnReceiver && pc.id === targetPc} />
      ))}

      {activeTransmission && (() => {
        const fromPos = positionMap.get(activeTransmission.fromId)
        const toPos = positionMap.get(activeTransmission.toId)
        if (!fromPos || !toPos) return null
        return (
          <TravelingFrameBlock
            key={`tx-${activeTransmission.runId}`}
            fromPos={fromPos}
            toPos={toPos}
            runId={activeTransmission.runId}
            frameData={activeTransmission.frameData}
            onComplete={handleTransmissionComplete}
            speedMultiplier={speedMultiplier}
          />
        )
      })()}

      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="w-full h-full relative">
          {isAnyPanelDragging && (
            <div
              className="fixed inset-0 z-[9999]"
              style={{ pointerEvents: 'auto', cursor: 'grabbing' }}
            />
          )}
          {setupOpen && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
              <div className="w-[min(860px,96vw)] max-h-[90vh] overflow-auto rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-5 md:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/85 mb-2">Framing Topology Setup</p>
                <h3 className="text-xl font-bold text-slate-100 mb-4">Configure PCs, MACs, and Links Before Transmission</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">1) PC & MAC Assignment</p>
                    <label htmlFor="pc-count" className="block text-sm text-slate-200 mb-1">Number of PCs</label>
                    <input
                      id="pc-count"
                      type="number"
                      min={MIN_PCS}
                      max={MAX_PCS}
                      value={pcCount}
                      onChange={(e) => setPcCount(Math.max(MIN_PCS, Math.min(MAX_PCS, Number(e.target.value) || MIN_PCS)))}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignmentMode('manual')}
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          assignmentMode === 'manual'
                            ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100'
                            : 'border-slate-700 bg-slate-900 text-slate-300'
                        }`}
                      >
                        Manual MAC
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignmentMode('automatic')}
                        className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          assignmentMode === 'automatic'
                            ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100'
                            : 'border-slate-700 bg-slate-900 text-slate-300'
                        }`}
                      >
                        Automatic MAC
                      </button>
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
                            className={`w-full rounded-md border px-2.5 py-1.5 text-xs ${
                              assignmentMode === 'manual'
                                ? 'border-slate-700 bg-slate-900 text-slate-100'
                                : 'border-slate-800 bg-slate-900/50 text-slate-500 cursor-not-allowed'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={preparePcConfig}
                      className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35"
                    >
                      Apply PC & MAC Setup
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">2) Link Builder</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">PC A</label>
                        <select
                          value={linkFrom}
                          onChange={(e) => setLinkFrom(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                        >
                          {pcs.map((pc) => (
                            <option key={`from-${pc.id}`} value={pc.id}>{pc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">PC B</label>
                        <select
                          value={linkTo}
                          onChange={(e) => setLinkTo(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                        >
                          {pcs.map((pc) => (
                            <option key={`to-${pc.id}`} value={pc.id}>{pc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addLink}
                      disabled={pcs.length === 0}
                      className="mt-3 w-full rounded-md bg-blue-500/25 border border-blue-300/50 px-3 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/35 disabled:opacity-40"
                    >
                      Add Link
                    </button>

                    <div className="mt-3 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-900/70 p-2 space-y-1">
                      {links.length === 0 && <p className="text-xs text-slate-500">No links added yet.</p>}
                      {links.map((l) => (
                        <div key={l.id} className="flex items-center justify-between rounded bg-slate-800/80 px-2 py-1">
                          <p className="text-xs text-slate-200">{l.from.toUpperCase()} ↔ {l.to.toUpperCase()}</p>
                          <button
                            type="button"
                            onClick={() => removeLink(l.id)}
                            className="text-[11px] text-red-300 hover:text-red-200"
                          >
                            remove
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={completeSetup}
                      className="mt-3 w-full rounded-md bg-emerald-500/25 border border-emerald-300/50 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/35"
                    >
                      Complete Topology Setup
                    </button>
                  </div>
                </div>

                {setupError && (
                  <p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {setupError}
                  </p>
                )}
              </div>
            </div>
          )}

          {!setupOpen && (
            <>
              <DraggablePanel
                title="Error Type"
                initialX={20}
                initialY={120}
                isVisible={inputPanelVisible}
                onToggle={() => setInputPanelVisible(!inputPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(470px,92vw)]">
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupOpen(true)}
                      className="px-3 py-2 text-xs font-semibold rounded-md border border-blue-300/50 bg-blue-500/25 text-blue-100 hover:bg-blue-500/35"
                    >
                      Edit Topology
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[11px] text-slate-400 mb-1">Transmission Speed: {speedMultiplier}x</label>
                    <input
                      type="range"
                      min="0.2"
                      max="2"
                      step="0.2"
                      value={speedMultiplier}
                      onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>0.2x</span>
                      <span>1x</span>
                      <span>2x</span>
                    </div>
                  </div>

                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      disabled={transmissionInProgress}
                      onClick={() => setErrorMode('without')}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                        errorMode === 'without'
                          ? 'border-emerald-300 bg-emerald-500/25 text-emerald-100'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-500/60'
                      } ${transmissionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Without Error
                    </button>
                    <button
                      type="button"
                      disabled={transmissionInProgress}
                      onClick={() => setErrorMode('with')}
                      className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                        errorMode === 'with'
                          ? 'border-red-300 bg-red-500/25 text-red-100'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-red-500/60'
                      } ${transmissionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      With Error
                    </button>
                  </div>

                  <label htmlFor="raw-data" className="block text-xs text-slate-200 mb-2 font-semibold">
                    Raw Data Input
                  </label>
                  <input
                    id="raw-data"
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
                    placeholder="Type text or binary (e.g. 11111011111)"
                  />

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={errorMode === 'without' || transmissionInProgress}
                      onClick={() => setActiveErrorType(ERROR_TYPE.ONE_BIT)}
                      className={`rounded-md px-2.5 py-2 text-xs font-semibold border transition-colors ${
                        activeErrorType === ERROR_TYPE.ONE_BIT
                          ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60'
                      } ${(errorMode === 'without' || transmissionInProgress) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      1 bit
                    </button>
                    <button
                      type="button"
                      disabled={errorMode === 'without' || transmissionInProgress}
                      onClick={() => setActiveErrorType(ERROR_TYPE.BURST)}
                      className={`rounded-md px-2.5 py-2 text-xs font-semibold border transition-colors ${
                        activeErrorType === ERROR_TYPE.BURST
                          ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60'
                      } ${(errorMode === 'without' || transmissionInProgress) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Burst
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">From</label>
                      <select
                        value={sourcePc}
                        onChange={(e) => {
                          setSourcePc(e.target.value)
                          setTargetPc('')
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                      >
                        {pcs.map((pc) => (
                          <option key={`src-${pc.id}`} value={pc.id}>{pc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">To</label>
                      <select
                        value={targetPc}
                        onChange={(e) => setTargetPc(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                      >
                        {toOptions.map((pc) => (
                          <option key={`dst-${pc.id}`} value={pc.id}>{pc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startTransmission}
                    className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35"
                  >
                    Start Transmission
                  </button>

                  {txError && (
                    <p className="mt-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                      {txError}
                    </p>
                  )}

                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3 max-h-48 overflow-y-auto">
                    <p className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">Method Logic</p>
                    <p className="text-xs text-slate-200 leading-relaxed">{errorTypeExplanation(activeErrorType)}</p>
                  </div>
                </div>
              </DraggablePanel>

              <DraggablePanel
                title="Receiver Node / Unstuffing"
                initialX={window.innerWidth - 580}
                initialY={window.innerHeight - 400}
                isVisible={receiverPanelVisible}
                onToggle={() => setReceiverPanelVisible(!receiverPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(560px,94vw)]">
                  {!showFramingPayload && (
                    <p className="text-xs text-slate-400">Frames are hidden until you start transmission.</p>
                  )}

                  {showFramingPayload && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                          <p className="text-slate-400 mb-1">Original Data</p>
                          <p className="font-mono text-blue-300 break-all">{receiverSnapshot?.originalData ?? methodData.comparisonOriginal}</p>
                        </div>
                        {transmissionComplete ? (
                          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                            <p className="text-slate-400 mb-1">Framed Data</p>
                            <p className="font-mono text-green-300 break-all">{receiverSnapshot?.framedData ?? methodData.comparisonFramed}</p>
                          </div>
                        ) : (
                          <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3 flex items-center justify-center">
                            <p className="text-amber-300 text-xs animate-pulse">⏳ Transmitting frames...</p>
                          </div>
                        )}
                      </div>

                      {transmissionComplete && receiverSnapshot && (
                        <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/70 p-3 text-xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-slate-200">
                              Decoded Output:{' '}
                              {receiverSnapshot.decodedParts.map((part, idx) => (
                                <span
                                  key={`decoded-${idx}`}
                                  className={`font-mono break-all ${part.isError ? 'text-red-300' : 'text-blue-300'}`}
                                >
                                  {part.text}
                                </span>
                              ))}
                            </p>
                            <p className={`font-semibold ${receiverSnapshot.frameVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                              {receiverSnapshot.frameVerified ? 'Frame Verified' : 'Frame Check Failed'}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-700">
                            <p className="text-slate-400 text-[11px] mb-1">Transmission Status</p>
                            <p className={`font-semibold ${
                              receiverSnapshot.transmissionStatus === 'No error Detected.' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {receiverSnapshot.transmissionStatus}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </DraggablePanel>

              <DraggablePanel
                title="Transmission History"
                initialX={20}
                initialY={window.innerHeight - 350}
                isVisible={historyPanelVisible}
                onToggle={() => setHistoryPanelVisible(!historyPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(420px,90vw)]">
                  {transmissionHistory.length === 0 ? (
                    <p className="text-xs text-slate-400">No transmissions yet.</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {transmissionHistory.slice().reverse().map((tx) => (
                        <div key={tx.id} className="rounded-md border border-slate-700 bg-slate-900/70 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-slate-300 font-semibold">{tx.method}</p>
                            <p className="text-[10px] text-slate-500">{tx.timestamp}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                            <p className="text-slate-400">From: <span className="text-blue-300">{tx.from}</span></p>
                            <p className="text-slate-400">To: <span className="text-emerald-300">{tx.to}</span></p>
                          </div>
                          <p className="text-xs text-slate-400 mb-1">Frame: <span className="text-amber-300 font-mono break-all">{tx.frameData}</span></p>
                          <p className="text-xs text-slate-400">
                            Status: <span className={`font-semibold ${tx.status === 'No error' ? 'text-emerald-400' : 'text-red-400'}`}>{tx.status}</span>
                          </p>
                          {tx.status === 'Error' && (
                            <>
                              <p className="text-xs text-slate-400">Error Position: <span className="text-red-300 font-mono">{tx.errorPositions?.join(', ')}</span></p>
                              <p className="text-xs text-slate-400">Error Length: <span className="text-red-300 font-semibold">{tx.errorLength}</span></p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DraggablePanel>
            </>
          )}
        </div>
      </Html>
    </group>
  )
}
