import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const MIN_PCS = 2
const MAX_PCS = 8
const BIT_WIDTH = 8
const DEFAULT_BITSTREAM = '1011000101110010'

const LINK_COLORS = {
  tube: '#002244',
  emissive: '#0066cc',
}

// ─────────────────────────────────────────────
//  MAC / Topology utilities  (same as ErrorTypeConceptViz)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
//  Checksum Math Utilities
// ─────────────────────────────────────────────

function padToWidth(bitStr, width) {
  return bitStr.padStart(width, '0').slice(-width)
}

/**
 * Adds two BIT_WIDTH binary strings.
 * Returns { sum: string, carry: 0|1 }.
 */
function binaryAdd(a, b) {
  const pa = padToWidth(a, BIT_WIDTH)
  const pb = padToWidth(b, BIT_WIDTH)
  let carry = 0
  let result = ''
  for (let i = BIT_WIDTH - 1; i >= 0; i -= 1) {
    const total = parseInt(pa[i], 10) + parseInt(pb[i], 10) + carry
    result = `${total % 2}${result}`
    carry = Math.floor(total / 2)
  }
  return { sum: result, carry }
}

/**
 * 1's-Complement addition of all segments (wrap-around carry).
 * Returns { finalSum, checksum, steps }.
 */
function onesComplementAdd(segments) {
  const steps = []
  let acc = padToWidth(segments[0], BIT_WIDTH)

  for (let i = 1; i < segments.length; i += 1) {
    const seg = padToWidth(segments[i], BIT_WIDTH)
    const { sum, carry } = binaryAdd(acc, seg)
    steps.push({ type: 'add', a: acc, b: seg, result: sum, carry })
    let current = sum
    if (carry) {
      const wrapped = binaryAdd(current, '00000001')
      steps.push({ type: 'wrap', before: current, after: wrapped.sum })
      current = wrapped.sum
    }
    acc = current
  }

  const checksum = acc.split('').map((b) => (b === '0' ? '1' : '0')).join('')
  steps.push({ type: 'complement', sum: acc, checksum })
  return { finalSum: acc, checksum, steps }
}

/**
 * Splits bitstream into BIT_WIDTH-sized segments, zero-padding the last if needed.
 * Ensures minimum 2 segments.
 */
function buildSegments(bitstream) {
  const clean = bitstream.replace(/\s/g, '') || '0000000000000000'
  const result = []
  for (let i = 0; i < clean.length; i += BIT_WIDTH) {
    result.push(padToWidth(clean.slice(i, i + BIT_WIDTH), BIT_WIDTH))
  }
  while (result.length < 2) result.push('00000000')
  return result
}

/**
 * Receiver verification: add all data segments + received checksum.
 * All-1s result means accepted.
 * Returns { result, accepted, steps }.
 */
function verifyChecksum(segments, checksum) {
  const allSegs = [...segments, padToWidth(checksum, BIT_WIDTH)]
  const steps = []
  let acc = allSegs[0]

  for (let i = 1; i < allSegs.length; i += 1) {
    const seg = allSegs[i]
    const { sum, carry } = binaryAdd(acc, seg)
    steps.push({ type: 'add', a: acc, b: seg, result: sum, carry })
    let current = sum
    if (carry) {
      const wrapped = binaryAdd(current, '00000001')
      steps.push({ type: 'wrap', before: current, after: wrapped.sum })
      current = wrapped.sum
    }
    acc = current
  }

  const accepted = acc === '1'.repeat(BIT_WIDTH)
  return { result: acc, accepted, steps }
}

// ─────────────────────────────────────────────
//  Shared 3D Components  (exact copy of ErrorTypeConceptViz topology)
// ─────────────────────────────────────────────

function DraggablePanel({ children, title, initialX, initialY, isVisible, onToggle, onDragChange }) {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName)) return
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
        setTimeout(() => { if (onComplete) onComplete() }, 300 / speedMultiplier)
      },
    })

    frameData.blocks.forEach((_, idx) => {
      blockRefs[idx] = { t: 0 }
      timeline.call(() => {
        blockRefs[idx].visible = true
        setVisibleBlocks([...Array(idx + 1).keys()])
      })
      timeline.to(blockRefs[idx], { t: 1, duration: baseDuration, ease: 'power1.inOut' }, `>-${baseOverlap}`)
    })

    return () => {
      timeline.kill()
      blockRefs.forEach((ref) => { if (ref) gsap.killTweensOf(ref) })
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
    const tween = gsap.to(proxy.current, { t: 1, duration: 0.85 / speedMultiplier, ease: 'power1.inOut' })
    return () => { gsap.killTweensOf(proxy.current); tween.kill() }
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
        <group position={[0, 1.2, 0]}>
          <mesh>
            <planeGeometry args={[2.2, 0.38]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.88} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            {'✓ Data Verified'}
          </Text>
        </group>
      )}

      {showError && (
        <group position={[0, 1.2, 0]}>
          <mesh>
            <planeGeometry args={[2.6, 0.38]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.88} />
          </mesh>
          <Text position={[0, 0, 0.02]} fontSize={0.11} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            {'✗ Checksum Mismatch'}
          </Text>
        </group>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────
//  BitSphereRow — HTML overlay row of coloured bit circles
// ─────────────────────────────────────────────
function BitSphereRow({ bits, dataLen, glitchSet }) {
  // bits: string  dataLen: index where checksum starts  glitchSet: Set of glitched indices
  return (
    <div className="flex flex-wrap gap-[3px]">
      {bits.split('').map((bit, idx) => {
        const isChecksumBit = dataLen !== undefined && idx >= dataLen
        const isGlitched = glitchSet && glitchSet.has(idx)
        let bgColor = isGlitched ? '#ef4444' : isChecksumBit ? '#f97316' : '#3b82f6'
        const opacity = bit === '1' ? 0.9 : 0.28
        return (
          <span
            key={`bsr-${idx}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: `1.5px solid ${bgColor}`,
              backgroundColor: `${bgColor}${bit === '1' ? 'cc' : '30'}`,
              color: bit === '1' ? '#fff' : '#aaa',
              fontSize: '9px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              opacity,
              userSelect: 'none',
            }}
          >
            {bit}
          </span>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
//  Segment Addition Step (math overlay row)
// ─────────────────────────────────────────────
function StepRow({ step, idx }) {
  if (step.type === 'add') {
    return (
      <div key={`step-${idx}`} className="text-[11px] font-mono border-b border-slate-800 pb-1 mb-1">
        <span className="text-blue-300">{step.a}</span>
        <span className="text-slate-400"> + </span>
        <span className="text-emerald-300">{step.b}</span>
        <span className="text-slate-400"> = </span>
        <span className="text-yellow-300">{step.result}</span>
        {step.carry === 1 && <span className="ml-1 text-pink-400 font-bold">(carry!)</span>}
      </div>
    )
  }
  if (step.type === 'wrap') {
    return (
      <div key={`step-${idx}`} className="text-[11px] font-mono text-pink-300 border-b border-slate-800 pb-1 mb-1">
        {'↩ wrap carry: '}
        <span className="text-yellow-300">{step.before}</span>
        {' + 1 = '}
        <span className="text-yellow-200 font-bold">{step.after}</span>
      </div>
    )
  }
  if (step.type === 'complement') {
    return (
      <div key={`step-${idx}`} className="text-[11px] font-mono border-b border-slate-800 pb-1 mb-1">
        <span className="text-slate-300">{'Complement ('}</span>
        <span className="text-yellow-300">{step.sum}</span>
        <span className="text-slate-300">{')'}</span>
        <span className="text-slate-400"> = </span>
        <span className="text-orange-300 font-bold">{step.checksum}</span>
        <span className="ml-1 text-orange-200">(Checksum)</span>
      </div>
    )
  }
  return null
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────
export default function ChecksumConceptViz() {
  // ── Topology state (identical to ErrorTypeConceptViz) ──
  const [setupOpen, setSetupOpen] = useState(true)
  const [pcCount, setPcCount] = useState(4)
  const [assignmentMode, setAssignmentMode] = useState('automatic')
  const [manualMacs, setManualMacs] = useState(Array.from({ length: 4 }, () => ''))
  const [pcs, setPcs] = useState([])
  const [links, setLinks] = useState([])
  const [setupError, setSetupError] = useState('')
  const [linkFrom, setLinkFrom] = useState('')
  const [linkTo, setLinkTo] = useState('')

  // ── Checksum state ──
  const [bitstream, setBitstream] = useState(DEFAULT_BITSTREAM)
  const [checksumData, setChecksumData] = useState(null)
  const [glitchedBits, setGlitchedBits] = useState(null) // string or null
  const [glitchIndices, setGlitchIndices] = useState(new Set())
  const [sourcePc, setSourcePc] = useState('')
  const [targetPc, setTargetPc] = useState('')
  const [txError, setTxError] = useState('')
  const [txRunId, setTxRunId] = useState(0)
  const [activeTransmission, setActiveTransmission] = useState(null)
  const [transmissionInProgress, setTransmissionInProgress] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [receiverResult, setReceiverResult] = useState(null)
  const [speedMultiplier, setSpeedMultiplier] = useState(0.5)

  // ── Panel visibility ──
  const [inputPanelVisible, setInputPanelVisible] = useState(true)
  const [receiverPanelVisible, setReceiverPanelVisible] = useState(true)
  const [transmissionPanelVisible, setTransmissionPanelVisible] = useState(true)
  const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false)
  const [showMathOverlay, setShowMathOverlay] = useState(false)
  const [showReceiverMath, setShowReceiverMath] = useState(false)
  const [transmissionComplete, setTransmissionComplete] = useState(false)
  const [transmissionHistory, setTransmissionHistory] = useState([])
  const [pendingTxData, setPendingTxData] = useState(null)

  // ── Derived ──
  const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs])
  const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc])
  const segments = useMemo(() => buildSegments(bitstream), [bitstream])
  const dataStr = useMemo(() => segments.join(''), [segments])

  // Full frame: data segments + checksum (or just data if not yet calculated)
  const frameString = useMemo(() => {
    if (!checksumData) return null
    return dataStr + checksumData.checksum
  }, [checksumData, dataStr])

  // Active frame (might have glitches)
  const activeFrame = useMemo(() => glitchedBits ?? frameString, [glitchedBits, frameString])

  // Travel frame data for 3D animation
  const travelFrameData = useMemo(() => {
    if (!activeFrame || !checksumData) return { blocks: [] }
    const dataLen = dataStr.length
    const originalFrame = frameString ?? activeFrame
    return {
      blocks: activeFrame.split('').map((bit, idx) => {
        const isChecksumBit = idx >= dataLen
        let color = isChecksumBit ? '#f97316' : '#3b82f6'
        if (glitchIndices.has(idx)) color = '#ef4444'
        return { label: bit, color }
      }),
    }
  }, [activeFrame, checksumData, dataStr, glitchIndices, frameString])

  // ── Effects (same pattern as ErrorTypeConceptViz) ──
  useEffect(() => {
    setManualMacs((prev) => Array.from({ length: pcCount }, (_, i) => prev[i] ?? ''))
  }, [pcCount])

  useEffect(() => {
    if (!sourcePc && pcs.length > 0) setSourcePc(pcs[0].id)
  }, [sourcePc, pcs])

  useEffect(() => {
    if (!targetPc && toOptions.length > 0) setTargetPc(toOptions[0].id)
  }, [targetPc, toOptions])

  // Reset glitch when new calculation is done
  useEffect(() => {
    setGlitchedBits(null)
    setGlitchIndices(new Set())
    setReceiverResult(null)
    setTransmissionComplete(false)
  }, [checksumData])

  // ── Topology handlers (identical to ErrorTypeConceptViz) ──
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
    if (!linkFrom || !linkTo) { setSetupError('Select both PCs before adding a link.'); return }
    if (linkFrom === linkTo) { setSetupError('A PC cannot be linked to itself.'); return }
    const key = makePairKey(linkFrom, linkTo)
    if (links.some((l) => l.key === key)) { setSetupError('Link already exists between those PCs.'); return }
    setLinks((prev) => [...prev, { id: `link-${prev.length + 1}`, key, from: linkFrom, to: linkTo }])
  }

  function removeLink(id) {
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  function completeSetup() {
    if (pcs.length < MIN_PCS) { setSetupError('Prepare PCs first.'); return }
    if (links.length === 0) { setSetupError('Add at least one link before continuing.'); return }
    setSetupOpen(false)
  }

  // ── Checksum handlers ──
  function handleCalculateChecksum() {
    const segs = buildSegments(bitstream)
    const result = onesComplementAdd(segs)
    setChecksumData({ segments: segs, ...result })
    setReceiverResult(null)
    setTransmissionComplete(false)
  }

  function handleGlitch() {
    if (!frameString) return
    const bits = frameString.split('')
    // Only corrupt in the data portion (not the checksum bits)
    const dataLen = dataStr.length
    const maxAttempts = 20
    let pos = -1
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = Math.floor(Math.random() * dataLen)
      if (!glitchIndices.has(candidate)) { pos = candidate; break }
    }
    if (pos === -1) return
    bits[pos] = bits[pos] === '0' ? '1' : '0'
    setGlitchedBits(bits.join(''))
    setGlitchIndices((prev) => new Set([...prev, pos]))
  }

  function clearGlitch() {
    setGlitchedBits(null)
    setGlitchIndices(new Set())
  }

  function startTransmission() {
    setTxError('')
    if (!checksumData) { setTxError('Calculate checksum first.'); return }
    if (!sourcePc || !targetPc) { setTxError('Select both From and To PCs.'); return }
    if (sourcePc === targetPc) { setTxError('From and To must be different PCs.'); return }
    const exists = links.some((l) => l.key === makePairKey(sourcePc, targetPc))
    if (!exists) { setTxError('No physical link between selected PCs. Add it in topology setup.'); return }

    const sourceNode = pcs.find((pc) => pc.id === sourcePc)
    const targetNode = pcs.find((pc) => pc.id === targetPc)
    if (!sourceNode || !targetNode) return

    const currentFrame = activeFrame ?? ''
    const rxDataSegs = buildSegments(currentFrame.slice(0, dataStr.length))
    const rxChecksum = currentFrame.slice(dataStr.length) || '00000000'
    const verdict = verifyChecksum(rxDataSegs, rxChecksum)

    setTransmissionInProgress(true)
    setShowSuccess(false)
    setShowError(false)
    setTransmissionComplete(false)
    setReceiverResult(null)

    const newRunId = txRunId + 1
    setTxRunId(newRunId)
    setActiveTransmission({ fromId: sourcePc, toId: targetPc, runId: newRunId, frameData: travelFrameData })

    setPendingTxData({
      id: newRunId,
      from: sourceNode.name,
      to: targetNode.name,
      frameBits: currentFrame,
      glitched: glitchIndices.size > 0,
      glitchPositions: [...glitchIndices].sort((a, b) => a - b),
      verdict,
      timestamp: new Date().toLocaleTimeString(),
    })
  }

  function handleTransmissionComplete() {
    setActiveTransmission(null)
    setTransmissionInProgress(false)
    setTransmissionComplete(true)

    if (pendingTxData) {
      setReceiverResult(pendingTxData.verdict)
      if (pendingTxData.verdict.accepted) {
        setShowSuccess(true)
        setShowError(false)
        setTimeout(() => setShowSuccess(false), 3500)
      } else {
        setShowError(true)
        setShowSuccess(false)
        setTimeout(() => setShowError(false), 3500)
      }
      setTransmissionHistory((prev) => [...prev, pendingTxData])
      setPendingTxData(null)
    }
  }

  // ─────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────
  return (
    <group>
      {/* Ground grid */}
      <group position={[0, -0.7, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[15, 8]} />
          <meshStandardMaterial color="#64748b" emissive="#475569" emissiveIntensity={0.18} />
        </mesh>
      </group>

      {/* Network links */}
      {links.map((link) => {
        const start = positionMap.get(link.from)
        const end = positionMap.get(link.to)
        if (!start || !end) return null
        return <NetworkLink key={link.id} start={start} end={end} />
      })}

      {/* PC Nodes */}
      {pcs.map((pc) => (
        <PCNode
          key={pc.id}
          pc={pc}
          showSuccess={showSuccess && pc.id === targetPc}
          showError={showError && pc.id === targetPc}
        />
      ))}

      {/* Traveling frame */}
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

      {/* ── HTML Panels ── */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div className="w-full h-full relative">
          {isAnyPanelDragging && (
            <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto', cursor: 'grabbing' }} />
          )}

          {/* ══════════════════════════════════════
              TOPOLOGY SETUP MODAL
          ══════════════════════════════════════ */}
          {setupOpen && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
              <div className="w-[min(860px,96vw)] max-h-[90vh] overflow-auto rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-5 md:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/85 mb-2">Checksum Topology Setup</p>
                <h3 className="text-xl font-bold text-slate-100 mb-4">Configure PCs, MACs, and Links Before Transmission</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* PC & MAC panel */}
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">1) PC & MAC Assignment</p>
                    <label htmlFor="cs-pc-count" className="block text-sm text-slate-200 mb-1">Number of PCs</label>
                    <input
                      id="cs-pc-count"
                      type="number"
                      min={MIN_PCS}
                      max={MAX_PCS}
                      value={pcCount}
                      onChange={(e) => setPcCount(Math.max(MIN_PCS, Math.min(MAX_PCS, Number(e.target.value) || MIN_PCS)))}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      {['manual', 'automatic'].map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setAssignmentMode(mode)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                            assignmentMode === mode
                              ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100'
                              : 'border-slate-700 bg-slate-900 text-slate-300'
                          }`}
                        >
                          {mode === 'manual' ? 'Manual MAC' : 'Automatic MAC'}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Array.from({ length: pcCount }, (_, i) => (
                        <div key={`cs-mac-${i}`}>
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

                  {/* Link Builder */}
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">2) Link Builder</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[{ label: 'PC A', val: linkFrom, set: setLinkFrom }, { label: 'PC B', val: linkTo, set: setLinkTo }].map(({ label, val, set }, fi) => (
                        <div key={`cs-lf-${fi}`}>
                          <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
                          <select
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                          >
                            {pcs.map((pc) => <option key={`cs-opt-${fi}-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                          </select>
                        </div>
                      ))}
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
                          <p className="text-xs text-slate-200">{l.from.toUpperCase()} {'<->'} {l.to.toUpperCase()}</p>
                          <button type="button" onClick={() => removeLink(l.id)} className="text-[11px] text-red-300 hover:text-red-200">remove</button>
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
                  <p className="mt-4 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{setupError}</p>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              MAIN PANELS (after setup)
          ══════════════════════════════════════ */}
          {!setupOpen && (
            <>
              {/* ── PANEL 1: Checksum Input Window ── */}
              <DraggablePanel
                title="Checksum Input Window"
                initialX={20}
                initialY={100}
                isVisible={inputPanelVisible}
                onToggle={() => setInputPanelVisible(!inputPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(500px,94vw)]">
                  {/* Toolbar */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-300/50 bg-blue-500/25 text-blue-100 hover:bg-blue-500/35"
                    >
                      Edit Topology
                    </button>
                  </div>

                  {/* Speed */}
                  <div className="mb-3">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Transmission Speed: {speedMultiplier}x
                    </label>
                    <input
                      type="range" min="0.2" max="2" step="0.2"
                      value={speedMultiplier}
                      onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>0.2x</span><span>1x</span><span>2x</span>
                    </div>
                  </div>

                  {/* Bitstream input */}
                  <label htmlFor="cs-bitstream" className="block text-xs text-slate-200 mb-1 font-semibold">
                    Bitstream Input (multiples of 8 bits recommended)
                  </label>
                  <input
                    id="cs-bitstream"
                    type="text"
                    value={bitstream}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^01]/g, '')
                      setBitstream(val)
                    }}
                    maxLength={64}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400 font-mono"
                    placeholder="e.g. 1011000101110010"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Only 0s and 1s accepted. Auto-padded to {BIT_WIDTH}-bit segments.</p>

                  {/* Segment Preview */}
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">
                      Data Segments ({segments.length} × {BIT_WIDTH}-bit)
                    </p>
                    {segments.map((seg, si) => (
                      <div key={`seg-${si}`} className="mb-1.5">
                        <span className="text-[10px] text-blue-300 mr-2">Seg {si + 1}:</span>
                        <BitSphereRow bits={seg} />
                      </div>
                    ))}
                  </div>

                  {/* Calculate Button */}
                  <button
                    type="button"
                    disabled={bitstream.length === 0 || transmissionInProgress}
                    onClick={handleCalculateChecksum}
                    className="mt-3 w-full rounded-md bg-yellow-500/25 border border-yellow-300/50 px-3 py-2 text-sm font-semibold text-yellow-100 hover:bg-yellow-500/35 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ⊕ Calculate Checksum
                  </button>

                  {/* Checksum result */}
                  {checksumData && (
                    <div className="mt-3 rounded-lg border border-orange-400/30 bg-slate-900/70 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] uppercase tracking-wider text-orange-300/80">Checksum Result</p>
                        <button
                          type="button"
                          onClick={() => setShowMathOverlay(!showMathOverlay)}
                          className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                        >
                          {showMathOverlay ? 'Hide Math' : 'Show Math'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="rounded border border-slate-700 bg-slate-900/70 p-2">
                          <p className="text-slate-400 text-[10px] mb-1">1s Complement Sum</p>
                          <p className="font-mono text-yellow-300">{checksumData.finalSum}</p>
                        </div>
                        <div className="rounded border border-orange-400/30 bg-slate-900/70 p-2">
                          <p className="text-slate-400 text-[10px] mb-1">Checksum (Complement)</p>
                          <p className="font-mono text-orange-300 font-bold">{checksumData.checksum}</p>
                        </div>
                      </div>

                      {/* Math overlay */}
                      {showMathOverlay && (
                        <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-700 bg-slate-950/80 p-2">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Binary Addition Steps</p>
                          {checksumData.steps.map((step, si) => (
                            <StepRow key={`math-${si}`} step={step} idx={si} />
                          ))}
                        </div>
                      )}

                      {/* Frame preview */}
                      <div className="mt-2">
                        <p className="text-[10px] text-slate-400 mb-1">Frame = Data + Checksum</p>
                        <BitSphereRow bits={activeFrame ?? (dataStr + checksumData.checksum)} dataLen={dataStr.length} glitchSet={glitchIndices} />
                        <div className="flex gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] text-blue-300">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', backgroundColor: '#3b82f6' }} />
                            Data
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-orange-300">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', backgroundColor: '#f97316' }} />
                            Checksum
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-red-300">
                            <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', backgroundColor: '#ef4444' }} />
                            Glitch
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* From / To selects */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">From</label>
                      <select
                        value={sourcePc}
                        onChange={(e) => { setSourcePc(e.target.value); setTargetPc('') }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                      >
                        {pcs.map((pc) => <option key={`cs-src-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">To</label>
                      <select
                        value={targetPc}
                        onChange={(e) => setTargetPc(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                      >
                        {toOptions.map((pc) => <option key={`cs-dst-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Transmit */}
                  <button
                    type="button"
                    onClick={startTransmission}
                    disabled={!checksumData || transmissionInProgress}
                    className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {transmissionInProgress ? '⏳ Transmitting...' : '▶ Transmit Frame'}
                  </button>

                  {txError && (
                    <p className="mt-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">{txError}</p>
                  )}

                  {/* Concept explanation */}
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">How Checksum Works</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Sender divides bits into {BIT_WIDTH}-bit segments and adds them using 1's Complement addition.
                      Carry bits wrap around back to the LSB (pink carry indicator).
                      The final sum is complemented to form the <span className="text-orange-300">Checksum</span>, appended to the frame.
                      Receiver re-adds all segments + checksum; result should be all 1s for a clean frame.
                    </p>
                  </div>
                </div>
              </DraggablePanel>

              {/* ── PANEL 2: Receiver Node ── */}
              <DraggablePanel
                title="Receiver Node"
                initialX={typeof window !== 'undefined' ? window.innerWidth - 520 : 800}
                initialY={typeof window !== 'undefined' ? window.innerHeight - 420 : 400}
                isVisible={receiverPanelVisible}
                onToggle={() => setReceiverPanelVisible(!receiverPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(500px,94vw)]">
                  {!transmissionComplete && (
                    <p className="text-xs text-slate-400">
                      {transmissionInProgress
                        ? '⏳ Receiving frame...'
                        : 'Waiting for transmission. Transmit a frame to see the receiver verdict.'}
                    </p>
                  )}

                  {transmissionComplete && receiverResult && (
                    <>
                      {/* Received frame display */}
                      <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 mb-3">
                        <p className="text-[11px] text-slate-400 mb-1">Received Frame (Data + Checksum Bits)</p>
                        <BitSphereRow
                          bits={activeFrame ?? (dataStr + (checksumData?.checksum ?? '00000000'))}
                          dataLen={dataStr.length}
                          glitchSet={glitchIndices}
                        />
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] text-blue-300">■ Data ({dataStr.length}b)</span>
                          <span className="text-[10px] text-orange-300">■ Checksum ({BIT_WIDTH}b)</span>
                          {glitchIndices.size > 0 && <span className="text-[10px] text-red-300">■ Glitched</span>}
                        </div>
                      </div>

                      {/* Receiver segments */}
                      <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] text-slate-400">Receiver 1's Complement Addition</p>
                          <button
                            type="button"
                            onClick={() => setShowReceiverMath(!showReceiverMath)}
                            className="text-[10px] px-2 py-0.5 rounded border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            {showReceiverMath ? 'Hide Steps' : 'Show Steps'}
                          </button>
                        </div>

                        {/* Receiver segments table */}
                        <div className="space-y-1 mb-2">
                          {(() => {
                            const rxFrame = activeFrame ?? (dataStr + (checksumData?.checksum ?? '00000000'))
                            const rxDataSegs = buildSegments(rxFrame.slice(0, dataStr.length))
                            const rxChk = rxFrame.slice(dataStr.length) || '00000000'
                            return [...rxDataSegs, rxChk].map((seg, si, arr) => (
                              <div key={`rxseg-${si}`} className="flex items-center gap-2">
                                <span className="text-[10px] w-20 text-slate-400 shrink-0">
                                  {si < arr.length - 1 ? `Seg ${si + 1}` : 'Checksum'}:
                                </span>
                                <BitSphereRow bits={padToWidth(seg, BIT_WIDTH)} />
                              </div>
                            ))
                          })()}
                        </div>

                        {/* Result row */}
                        <div className="border-t border-slate-700 pt-2 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] w-20 text-slate-400 shrink-0">Result:</span>
                            <div className="flex flex-wrap gap-[3px]">
                              {receiverResult.result.split('').map((bit, bi) => {
                                const isOne = bit === '1'
                                const color = isOne
                                  ? (receiverResult.accepted ? '#10b981' : '#ef4444')
                                  : '#ef4444'
                                return (
                                  <span
                                    key={`rxres-${bi}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      border: `1.5px solid ${color}`,
                                      backgroundColor: `${color}cc`,
                                      color: '#fff',
                                      fontSize: '9px',
                                      fontFamily: 'monospace',
                                      fontWeight: 'bold',
                                      boxShadow: receiverResult.accepted && isOne ? `0 0 6px ${color}` : 'none',
                                    }}
                                  >
                                    {bit}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Math steps */}
                        {showReceiverMath && (
                          <div className="mt-2 max-h-40 overflow-y-auto rounded border border-slate-700 bg-slate-950/80 p-2">
                            {receiverResult.steps.map((step, si) => (
                              <StepRow key={`rxmath-${si}`} step={step} idx={si} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Verdict */}
                      <div className={`rounded-lg border p-3 text-center ${
                        receiverResult.accepted
                          ? 'border-emerald-400/50 bg-emerald-500/10'
                          : 'border-red-400/50 bg-red-500/10'
                      }`}>
                        <p className={`text-base font-bold ${receiverResult.accepted ? 'text-emerald-300' : 'text-red-300'}`}>
                          {receiverResult.accepted ? '✓ Data Verified' : '✗ Error Detected: Checksum Mismatch'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {receiverResult.accepted
                            ? `Result is all 1s (${receiverResult.result}) — frame accepted.`
                            : `Result is ${receiverResult.result} — not all 1s, frame discarded.`}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </DraggablePanel>

              {/* ── PANEL 3: Transmission Window ── */}
              <DraggablePanel
                title="Transmission Window"
                initialX={20}
                initialY={typeof window !== 'undefined' ? window.innerHeight - 340 : 500}
                isVisible={transmissionPanelVisible}
                onToggle={() => setTransmissionPanelVisible(!transmissionPanelVisible)}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(480px,92vw)]">
                  {/* Frame on wire */}
                  {checksumData ? (
                    <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 mb-3">
                      <p className="text-[11px] text-slate-400 mb-2">Frame on Wire</p>
                      <BitSphereRow
                        bits={activeFrame ?? (dataStr + checksumData.checksum)}
                        dataLen={dataStr.length}
                        glitchSet={glitchIndices}
                      />
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-blue-300">■ Data ({dataStr.length}b)</span>
                        <span className="text-[10px] text-orange-300">■ Checksum ({BIT_WIDTH}b)</span>
                        {glitchIndices.size > 0 && (
                          <span className="text-[10px] text-red-300">
                            ■ Glitch at bit{glitchIndices.size > 1 ? 's' : ''} {[...glitchIndices].sort((a, b) => a - b).map((i) => i + 1).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-3">Calculate checksum to see the frame.</p>
                  )}

                  {/* Glitch controls */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    <button
                      type="button"
                      disabled={!checksumData || transmissionInProgress}
                      onClick={handleGlitch}
                      className="flex-1 rounded-md border border-red-400/50 bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ⚡ Glitch (Flip Bit)
                    </button>
                    <button
                      type="button"
                      disabled={!glitchedBits || transmissionInProgress}
                      onClick={clearGlitch}
                      className="flex-1 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ✕ Clear Glitch
                    </button>
                  </div>

                  {/* Transmission History */}
                  <p className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">Recent Transmissions</p>
                  {transmissionHistory.length === 0 ? (
                    <p className="text-xs text-slate-400">No transmissions yet.</p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-2">
                      {transmissionHistory.slice().reverse().map((tx) => (
                        <div key={tx.id} className="rounded-md border border-slate-700 bg-slate-900/70 p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-slate-300 font-semibold">
                              {tx.from} {'→'} {tx.to}
                            </p>
                            <p className="text-[10px] text-slate-500">{tx.timestamp}</p>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono break-all mb-1">
                            Frame: <span className="text-amber-300">{tx.frameBits.slice(0, 24)}{tx.frameBits.length > 24 ? '…' : ''}</span>
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-xs font-semibold ${tx.verdict.accepted ? 'text-emerald-400' : 'text-red-400'}`}>
                              {tx.verdict.accepted ? '✓ Verified' : '✗ Mismatch'}
                            </p>
                            {tx.glitched && (
                              <p className="text-[10px] text-red-300">
                                Glitch@bit{tx.glitchPositions.length > 1 ? 's' : ''} {tx.glitchPositions.map((p) => p + 1).join(',')}
                              </p>
                            )}
                          </div>
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
