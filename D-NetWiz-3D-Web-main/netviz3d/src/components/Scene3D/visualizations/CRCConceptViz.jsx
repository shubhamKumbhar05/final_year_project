import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

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

function normalizeBits(value) {
  return (value || '').replace(/[^01]/g, '')
}

function isBinary(value) {
  return /^[01]+$/.test(value)
}

function xorDivision(dividendBits, divisorBits) {
  const dividend = dividendBits.split('').map((ch) => Number(ch))
  const divisor = divisorBits.split('').map((ch) => Number(ch))
  const steps = []

  for (let i = 0; i <= dividend.length - divisor.length; i += 1) {
    const aligned = dividend.slice(i, i + divisor.length).join('')
    if (dividend[i] === 1) {
      for (let j = 0; j < divisor.length; j += 1) {
        dividend[i + j] ^= divisor[j]
      }
      steps.push({
        index: i,
        action: 'XOR',
        aligned,
        divisor: divisorBits,
        result: dividend.slice(i, i + divisor.length).join(''),
      })
    } else {
      steps.push({
        index: i,
        action: 'SKIP',
        aligned,
        divisor: '-'.repeat(divisor.length),
        result: aligned,
      })
    }
  }

  const remainderLength = divisor.length - 1
  const remainder = dividend.slice(dividend.length - remainderLength).join('')
  return { remainder, steps }
}

function buildCrcEncoding(dataBits, generatorBits) {
  const appendedZeros = '0'.repeat(generatorBits.length - 1)
  const paddedData = `${dataBits}${appendedZeros}`
  const division = xorDivision(paddedData, generatorBits)
  return {
    dataBits,
    generatorBits,
    paddedData,
    remainder: division.remainder,
    frameBits: `${dataBits}${division.remainder}`,
    steps: division.steps,
  }
}

function buildReceiverCheck(frameBits, generatorBits) {
  const division = xorDivision(frameBits, generatorBits)
  const accepted = /^0+$/.test(division.remainder)
  return {
    remainder: division.remainder,
    accepted,
    steps: division.steps,
  }
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
          {isVisible ? '-' : '+'}
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

function TravelingFrameBlock({ fromPos, toPos, runId, frameBits, flippedIndexes, onComplete, speedMultiplier = 1 }) {
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
        }, 250 / speedMultiplier)
      },
    })

    frameBits.split('').forEach((_, idx) => {
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
  }, [runId, frameBits, onComplete, speedMultiplier])

  return (
    <>
      {visibleBlocks.map((idx) => (
        <SingleTravelingBlock
          key={`travel-${runId}-${idx}`}
          bit={frameBits[idx]}
          blockIndex={idx}
          curve={curve}
          scale={travelScale}
          runId={runId}
          speedMultiplier={speedMultiplier}
          isCorrupted={flippedIndexes.includes(idx)}
        />
      ))}
    </>
  )
}

function SingleTravelingBlock({ bit, blockIndex, curve, scale, runId, speedMultiplier = 1, isCorrupted }) {
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
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial
          color={isCorrupted ? '#ef4444' : '#3b82f6'}
          emissive={isCorrupted ? '#b91c1c' : '#1d4ed8'}
          emissiveIntensity={isCorrupted ? 0.95 : 0.6}
        />
      </mesh>
      <Text position={[0, 0, 0.36]} fontSize={0.2} color="#f8fafc" anchorX="center" anchorY="middle" maxWidth={0.65}>
        {bit}
      </Text>
    </group>
  )
}

function PCNode({ pc, showSuccess, showError }) {
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
            Data Accepted
          </Text>
        </group>
      )}

      {showError && (
        <group position={[0, 1.15, 0]}>
          <mesh>
            <planeGeometry args={[2.3, 0.35]} />
            <meshBasicMaterial color="#dc2626" transparent opacity={0.85} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.13} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            Error Detected: CRC Failed
          </Text>
        </group>
      )}
    </group>
  )
}

function BitSphereRow({ bits, label, color = 'blue', highlightStart = -1 }) {
  const palette = color === 'orange'
    ? { bg: 'from-orange-400 to-amber-600', ring: 'ring-orange-300/40' }
    : { bg: 'from-blue-400 to-cyan-600', ring: 'ring-cyan-300/40' }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {bits.split('').map((bit, idx) => (
          <div
            key={`${label}-${idx}`}
            className={`h-8 w-8 rounded-full bg-gradient-to-br ${palette.bg} text-white flex items-center justify-center text-sm font-bold shadow-lg ring-1 ${palette.ring} ${idx >= highlightStart && highlightStart >= 0 ? 'outline outline-2 outline-orange-400/70' : ''}`}
          >
            {bit}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CRCConceptViz() {
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

  const [dataBitsInput, setDataBitsInput] = useState('110101')
  const [generatorInput, setGeneratorInput] = useState('1011')
  const [encodingResult, setEncodingResult] = useState(null)
  const [mathOverlayOpen, setMathOverlayOpen] = useState(true)

  const [speedMultiplier, setSpeedMultiplier] = useState(0.6)
  const [inputPanelVisible, setInputPanelVisible] = useState(true)
  const [receiverPanelVisible, setReceiverPanelVisible] = useState(true)
  const [transmissionPanelVisible, setTransmissionPanelVisible] = useState(true)
  const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false)

  const [flippedIndexes, setFlippedIndexes] = useState([])
  const [activeTransmission, setActiveTransmission] = useState(null)
  const [txRunId, setTxRunId] = useState(0)
  const [transmissionInProgress, setTransmissionInProgress] = useState(false)
  const [receiverResult, setReceiverResult] = useState(null)
  const [receiverSteps, setReceiverSteps] = useState([])
  const [transmissionHistory, setTransmissionHistory] = useState([])

  const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs])
  const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc])

  const frameBitsAfterInjection = useMemo(() => {
    if (!encodingResult) return ''
    const bits = encodingResult.frameBits.split('')
    flippedIndexes.forEach((idx) => {
      if (idx >= 0 && idx < bits.length) {
        bits[idx] = bits[idx] === '1' ? '0' : '1'
      }
    })
    return bits.join('')
  }, [encodingResult, flippedIndexes])

  useEffect(() => {
    setManualMacs((prev) => Array.from({ length: pcCount }, (_, idx) => prev[idx] ?? ''))
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

  function handleGenerateCRC() {
    setTxError('')
    const dataBits = normalizeBits(dataBitsInput)
    const generator = normalizeBits(generatorInput)

    if (!isBinary(dataBits) || dataBits.length < 4) {
      setTxError('Data bits must be binary and at least 4 bits long.')
      return
    }

    if (!isBinary(generator) || generator.length < 3 || !generator.startsWith('1') || !generator.endsWith('1')) {
      setTxError('Generator must be binary, min length 3, and start/end with 1 (example: 1011).')
      return
    }

    const result = buildCrcEncoding(dataBits, generator)
    setEncodingResult(result)
    setFlippedIndexes([])
    setReceiverResult(null)
    setReceiverSteps([])
  }

  function toggleBitFlip(index) {
    if (transmissionInProgress || !encodingResult) return
    setFlippedIndexes((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index)
      }
      return [...prev, index].sort((a, b) => a - b)
    })
  }

  function startTransmission() {
    setTxError('')
    if (!encodingResult) {
      setTxError('Generate CRC first.')
      return
    }

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

    setTransmissionInProgress(true)
    const newRunId = txRunId + 1
    setTxRunId(newRunId)
    setActiveTransmission({
      fromId: sourcePc,
      toId: targetPc,
      runId: newRunId,
      frameBits: frameBitsAfterInjection,
      flippedIndexes,
    })
  }

  function handleTransmissionComplete() {
    if (!activeTransmission || !encodingResult) return

    const check = buildReceiverCheck(activeTransmission.frameBits, encodingResult.generatorBits)
    setReceiverResult({
      incomingFrame: activeTransmission.frameBits,
      remainder: check.remainder,
      accepted: check.accepted,
    })
    setReceiverSteps(check.steps)

    const sourceNode = pcs.find((pc) => pc.id === activeTransmission.fromId)
    const targetNode = pcs.find((pc) => pc.id === activeTransmission.toId)
    setTransmissionHistory((prev) => [
      ...prev,
      {
        id: activeTransmission.runId,
        time: new Date().toLocaleTimeString(),
        from: sourceNode?.name || 'Unknown',
        to: targetNode?.name || 'Unknown',
        sent: activeTransmission.frameBits,
        flipped: [...activeTransmission.flippedIndexes],
        remainder: check.remainder,
        verdict: check.accepted ? 'Data Accepted' : 'Error Detected: CRC Failed',
      },
    ])

    setTransmissionInProgress(false)
    setActiveTransmission(null)
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
        <PCNode
          key={pc.id}
          pc={pc}
          showSuccess={!!receiverResult?.accepted && pc.id === targetPc}
          showError={receiverResult && !receiverResult.accepted && pc.id === targetPc}
        />
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
            frameBits={activeTransmission.frameBits}
            flippedIndexes={activeTransmission.flippedIndexes}
            onComplete={handleTransmissionComplete}
            speedMultiplier={speedMultiplier}
          />
        )
      })()}

      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="w-full h-full relative">
          {isAnyPanelDragging && (
            <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto', cursor: 'grabbing' }} />
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
                          <p className="text-xs text-slate-200">{l.from.toUpperCase()} ? {l.to.toUpperCase()}</p>
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
                title="CRC Input Window"
                initialX={20}
                initialY={110}
                isVisible={inputPanelVisible}
                onToggle={() => setInputPanelVisible(!inputPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(560px,92vw)] space-y-3">
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupOpen(true)}
                      className="px-3 py-2 text-xs font-semibold rounded-md border border-blue-300/50 bg-blue-500/25 text-blue-100 hover:bg-blue-500/35"
                    >
                      Edit Topology
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Data Bits</label>
                      <input
                        type="text"
                        value={dataBitsInput}
                        onChange={(e) => setDataBitsInput(e.target.value)}
                        placeholder="110101"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-300 mb-1">Generator Polynomial</label>
                      <input
                        type="text"
                        value={generatorInput}
                        onChange={(e) => setGeneratorInput(e.target.value)}
                        placeholder="1011"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateCRC}
                    className="w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35"
                  >
                    Generate CRC
                  </button>

                  {encodingResult && (
                    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                      <BitSphereRow bits={encodingResult.dataBits} label="Data Spheres" color="blue" />
                      <BitSphereRow bits={encodingResult.generatorBits} label="Generator Spheres" color="blue" />
                      <BitSphereRow
                        bits={encodingResult.frameBits}
                        label="Frame With CRC"
                        color="orange"
                        highlightStart={encodingResult.dataBits.length}
                      />
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase tracking-wider text-amber-300/90">Math Overlay</p>
                      <button
                        type="button"
                        onClick={() => setMathOverlayOpen(!mathOverlayOpen)}
                        className="text-xs px-2 py-1 rounded border border-slate-700 bg-slate-800 text-slate-300"
                      >
                        {mathOverlayOpen ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {mathOverlayOpen && (
                      <div className="space-y-2 text-xs">
                        {encodingResult ? (
                          <>
                            <p className="text-slate-300">Padded Data: <span className="font-mono text-cyan-300">{encodingResult.paddedData}</span></p>
                            <p className="text-slate-300">CRC (Remainder): <span className="font-mono text-orange-300">{encodingResult.remainder}</span></p>
                            <div className="max-h-40 overflow-auto rounded border border-slate-800 bg-slate-950/70 p-2 space-y-1">
                              {encodingResult.steps.map((step) => (
                                <p key={`enc-step-${step.index}`} className="font-mono text-[11px] text-slate-300">
                                  {`i=${step.index} ${step.action} | ${step.aligned} with ${step.divisor} -> ${step.result}`}
                                </p>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-slate-500">Generate CRC to view binary division steps.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    disabled={!encodingResult || transmissionInProgress}
                    className="w-full rounded-md bg-emerald-500/25 border border-emerald-300/50 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/35 disabled:opacity-50"
                  >
                    Transmit Frame
                  </button>

                  {txError && (
                    <p className="rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                      {txError}
                    </p>
                  )}
                </div>
              </DraggablePanel>

              <DraggablePanel
                title="Receiver Node"
                initialX={window.innerWidth - 590}
                initialY={window.innerHeight - 420}
                isVisible={receiverPanelVisible}
                onToggle={() => setReceiverPanelVisible(!receiverPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(560px,94vw)]">
                  {!receiverResult && (
                    <p className="text-xs text-slate-400">Receiver is waiting for incoming frame.</p>
                  )}

                  {receiverResult && (
                    <div className="space-y-3 text-xs">
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-slate-400 mb-1">Incoming Frame</p>
                        <p className="font-mono text-blue-300 break-all">{receiverResult.incomingFrame}</p>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-slate-400 mb-1">Receiver Division Remainder</p>
                        <p className={`font-mono break-all ${receiverResult.accepted ? 'text-emerald-300' : 'text-red-300'}`}>
                          {receiverResult.remainder}
                        </p>
                      </div>
                      <div className={`rounded-md border p-3 ${receiverResult.accepted ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-red-400/40 bg-red-500/10'}`}>
                        <p className={`font-semibold ${receiverResult.accepted ? 'text-emerald-300' : 'text-red-300'}`}>
                          {receiverResult.accepted ? 'Data Accepted' : 'Error Detected: CRC Failed'}
                        </p>
                      </div>
                      <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-amber-300/90 mb-2">Receiver Math Overlay</p>
                        <div className="max-h-36 overflow-auto space-y-1">
                          {receiverSteps.map((step) => (
                            <p key={`rx-step-${step.index}`} className="font-mono text-[11px] text-slate-300">
                              {`i=${step.index} ${step.action} | ${step.aligned} with ${step.divisor} -> ${step.result}`}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DraggablePanel>

              <DraggablePanel
                title="Transmission Window"
                initialX={20}
                initialY={window.innerHeight - 360}
                isVisible={transmissionPanelVisible}
                onToggle={() => setTransmissionPanelVisible(!transmissionPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(500px,92vw)] space-y-3">
                  {!encodingResult && <p className="text-xs text-slate-400">Generate CRC first to build a frame.</p>}

                  {encodingResult && (
                    <>
                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Click Any Bit To Flip (Error Injection)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {encodingResult.frameBits.split('').map((bit, idx) => {
                            const flipped = flippedIndexes.includes(idx)
                            const displayed = flipped ? (bit === '1' ? '0' : '1') : bit
                            return (
                              <button
                                key={`inj-${idx}`}
                                type="button"
                                onClick={() => toggleBitFlip(idx)}
                                disabled={transmissionInProgress}
                                className={`h-8 w-8 rounded-full text-sm font-bold transition-all ${
                                  flipped
                                    ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                                    : 'bg-cyan-600 text-white hover:bg-cyan-500'
                                } ${transmissionInProgress ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                {displayed}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3 text-xs space-y-1">
                        <p className="text-slate-300">Frame with CRC: <span className="font-mono text-orange-300 break-all">{encodingResult.frameBits}</span></p>
                        <p className="text-slate-300">Frame on Wire: <span className="font-mono text-cyan-300 break-all">{frameBitsAfterInjection}</span></p>
                        <p className="text-slate-300">Flipped Bit Positions: <span className="font-mono text-red-300">{flippedIndexes.length ? flippedIndexes.map((n) => n + 1).join(', ') : 'None'}</span></p>
                      </div>
                    </>
                  )}

                  <div className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Recent Transmissions</p>
                    {transmissionHistory.length === 0 ? (
                      <p className="text-xs text-slate-500">No transmissions yet.</p>
                    ) : (
                      <div className="max-h-44 overflow-auto space-y-2">
                        {transmissionHistory.slice().reverse().map((tx) => (
                          <div key={tx.id} className="rounded-md border border-slate-700 bg-slate-900/70 p-2 text-xs">
                            <p className="text-slate-300">{tx.from} to {tx.to} at {tx.time}</p>
                            <p className="text-slate-400">Wire: <span className="font-mono text-cyan-300 break-all">{tx.sent}</span></p>
                            <p className="text-slate-400">Remainder: <span className="font-mono text-amber-300">{tx.remainder}</span></p>
                            <p className={`${tx.verdict.includes('Accepted') ? 'text-emerald-300' : 'text-red-300'} font-semibold`}>{tx.verdict}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DraggablePanel>
            </>
          )}
        </div>
      </Html>
    </group>
  )
}
