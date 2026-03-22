// ─────────────────────────────────────────────
//  Hamming Distance & Weight Utilities
// ─────────────────────────────────────────────
function hammingWeight(bits) {
  // bits: array of 0/1 or string of 0/1
  if (typeof bits === 'string') bits = bits.split('').map(Number)
  return bits.reduce((acc, b) => acc + (b === 1 ? 1 : 0), 0)
}

function hammingDistance(a, b) {
  // a, b: arrays or strings of 0/1, must be same length
  if (typeof a === 'string') a = a.split('').map(Number)
  if (typeof b === 'string') b = b.split('').map(Number)
  if (a.length !== b.length) return null
  return a.reduce((acc, v, i) => acc + (v !== b[i] ? 1 : 0), 0)
}
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const MIN_PCS = 2
const MAX_PCS = 8
const DATA_BITS = 4
const TOTAL_BITS = 7 // (7,4) Hamming code
const PARITY_POSITIONS = [1, 2, 4] // 1-based
const DATA_POSITIONS = [3, 5, 6, 7] // 1-based

const LINK_COLORS = {
  tube: '#002244',
  emissive: '#0066cc',
}

// ─────────────────────────────────────────────
//  MAC / Topology utilities (same as ErrorTypeConceptViz)
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
//  Hamming Code Math Utilities
// ─────────────────────────────────────────────
function calcParity(bits, positions) {
  // bits: array of 0/1, positions: 1-based indices to check
  let parity = 0
  positions.forEach((pos) => {
    parity ^= bits[pos - 1]
  })
  return parity
}

function encodeHamming(dataBits) {
  // dataBits: array of 0/1, length 4
  const bits = Array(TOTAL_BITS).fill(0)
  // Place data bits
  DATA_POSITIONS.forEach((pos, i) => {
    bits[pos - 1] = dataBits[i]
  })
  // Calculate parity bits
  bits[0] = calcParity(bits, [1, 3, 5, 7]) // P1
  bits[1] = calcParity(bits, [2, 3, 6, 7]) // P2
  bits[3] = calcParity(bits, [4, 5, 6, 7]) // P4
  return bits
}

function syndrome(received) {
  // received: array of 0/1, length 7
  const s1 = calcParity(received, [1, 3, 5, 7])
  const s2 = calcParity(received, [2, 3, 6, 7])
  const s4 = calcParity(received, [4, 5, 6, 7])
  const syndromeVal = s1 * 1 + s2 * 2 + s4 * 4
  return { s1, s2, s4, syndromeVal }
}

function decodeHamming(received) {
  // received: array of 0/1, length 7
  const { s1, s2, s4, syndromeVal } = syndrome(received)
  let corrected = [...received]
  let correctedBit = null
  if (syndromeVal > 0 && syndromeVal <= 7) {
    corrected[syndromeVal - 1] ^= 1
    correctedBit = syndromeVal - 1
  }
  // Extract data bits
  const data = DATA_POSITIONS.map((pos) => corrected[pos - 1])
  return { corrected, correctedBit, syndrome: { s1, s2, s4, syndromeVal }, data }
}

function isBinaryString(str, len) {
  return str.length === len && /^[01]+$/.test(str)
}

// ─────────────────────────────────────────────
//  Shared 3D Components (exact copy of ErrorTypeConceptViz topology)
// ─────────────────────────────────────────────
function DraggablePanel({ children, title, initialX, initialY, isVisible, onToggle, onDragChange }) {
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const handleMouseDown = (e) => {
    if (["INPUT", "SELECT", "BUTTON", "TEXTAREA"].includes(e.target.tagName)) return
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
            {'✓ Frame Repaired Successfully'}
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
            {'✗ Error Detected'}
          </Text>
        </group>
      )}
    </group>
  )
}

// ─────────────────────────────────────────────
//  BitSphereRow — HTML overlay row of coloured bit circles
// ─────────────────────────────────────────────
function BitSphereRow({ bits, highlight, glitchIdx }) {
  // bits: array of 0/1, highlight: array of indices, glitchIdx: index of glitched bit
  return (
    <div className="flex flex-wrap gap-[3px]">
      {bits.map((bit, idx) => {
        let bgColor = '#3b82f6'
        if (PARITY_POSITIONS.includes(idx + 1)) bgColor = '#fbbf24'
        if (highlight && highlight.includes(idx)) bgColor = '#a21caf'
        if (glitchIdx === idx) bgColor = '#ef4444'
        const opacity = bit === 1 ? 0.9 : 0.28
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
              backgroundColor: `${bgColor}${bit === 1 ? 'cc' : '30'}`,
              color: bit === 1 ? '#fff' : '#aaa',
              fontSize: '9px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              opacity,
              userSelect: 'none',
              boxShadow: highlight && highlight.includes(idx) ? '0 0 8px #a21caf' : undefined,
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
//  Main Component
// ─────────────────────────────────────────────
export default function HammingCodeConceptViz() {
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

  // ── Hamming state ──
  const [dataBits, setDataBits] = useState('1011')
  const [encodedBits, setEncodedBits] = useState(Array(TOTAL_BITS).fill(0))
  const [highlight, setHighlight] = useState([])
  const [glitchIdx, setGlitchIdx] = useState(null)
  const [glitchedBits, setGlitchedBits] = useState(null)
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
  const [showSyndrome, setShowSyndrome] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const [transmissionComplete, setTransmissionComplete] = useState(false)
  const [transmissionHistory, setTransmissionHistory] = useState([])
  const [pendingTxData, setPendingTxData] = useState(null)
  // Parity option
  const [parityType, setParityType] = useState('even') // 'even' or 'odd'
  // Math steps
  const [showMath, setShowMath] = useState(false)
  const [mathSteps, setMathSteps] = useState([])

  // ── Panel drag state (for overlay cursor) ──
  const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false)

  // ── Derived ──
  const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs])
  const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc])

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
  useEffect(() => {
    // Reset on new data
    setGlitchIdx(null)
    setGlitchedBits(null)
    setReceiverResult(null)
    setTransmissionComplete(false)
    setShowSyndrome(false)
    setShowCorrection(false)
    if (isBinaryString(dataBits, DATA_BITS)) {
      const bits = dataBits.split('').map(Number)
      const { encoded, steps } = encodeHammingWithSteps(bits, parityType)
      setEncodedBits(encoded)
      setMathSteps(steps)
    } else {
      setEncodedBits(Array(TOTAL_BITS).fill(0))
      setMathSteps([])
    }
  }, [dataBits, parityType])

  // Hamming encoding with steps for math window
  function encodeHammingWithSteps(dataBits, parityType) {
    const bits = Array(TOTAL_BITS).fill(0)
    const steps = []
    DATA_POSITIONS.forEach((pos, i) => {
      bits[pos - 1] = dataBits[i]
      steps.push({ type: 'data', pos, value: dataBits[i] })
    })
    // Calculate parity bits
    const p1 = calcParity(bits, [1, 3, 5, 7], parityType)
    const p2 = calcParity(bits, [2, 3, 6, 7], parityType)
    const p4 = calcParity(bits, [4, 5, 6, 7], parityType)
    bits[0] = p1
    bits[1] = p2
    bits[3] = p4
    steps.push({ type: 'parity', label: 'P1', positions: [1, 3, 5, 7], value: p1, parityType })
    steps.push({ type: 'parity', label: 'P2', positions: [2, 3, 6, 7], value: p2, parityType })
    steps.push({ type: 'parity', label: 'P4', positions: [4, 5, 6, 7], value: p4, parityType })
    return { encoded: bits, steps }
  }

  // Modified parity calculation for even/odd
  function calcParity(bits, positions, parityType) {
    let parity = 0
    positions.forEach((pos) => {
      parity ^= bits[pos - 1]
    })
    if (parityType === 'odd') {
      parity = parity ^ 1
    }
    return parity
  }

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

  // ── Hamming handlers ──
  function handleHighlight(parityIdx) {
    // parityIdx: 0,1,2 for P1,P2,P4
    if (parityIdx === 0) setHighlight([0, 2, 4, 6])
    if (parityIdx === 1) setHighlight([1, 2, 5, 6])
    if (parityIdx === 2) setHighlight([3, 4, 5, 6])
    setTimeout(() => setHighlight([]), 1200)
  }
  function handleGlitch(idx) {
    if (glitchIdx !== null) return
    setGlitchIdx(idx)
    setGlitchedBits(encodedBits.map((b, i) => (i === idx ? 1 - b : b)))
  }
  function clearGlitch() {
    setGlitchIdx(null)
    setGlitchedBits(null)
    setReceiverResult(null)
    setShowSyndrome(false)
    setShowCorrection(false)
  }
  function startTransmission() {
    setTxError('')
    if (!isBinaryString(dataBits, DATA_BITS)) { setTxError('Enter 4 data bits (0/1).'); return }
    if (!sourcePc || !targetPc) { setTxError('Select both From and To PCs.'); return }
    if (sourcePc === targetPc) { setTxError('From and To must be different PCs.'); return }
    const exists = links.some((l) => l.key === makePairKey(sourcePc, targetPc))
    if (!exists) { setTxError('No physical link between selected PCs. Add it in topology setup.'); return }
    const sourceNode = pcs.find((pc) => pc.id === sourcePc)
    const targetNode = pcs.find((pc) => pc.id === targetPc)
    if (!sourceNode || !targetNode) return
    setTransmissionInProgress(true)
    setShowSuccess(false)
    setShowError(false)
    setTransmissionComplete(false)
    setReceiverResult(null)
    const newRunId = txRunId + 1
    setTxRunId(newRunId)
    setActiveTransmission({ fromId: sourcePc, toId: targetPc, runId: newRunId, frameData: { blocks: (glitchedBits ?? encodedBits).map((b, i) => ({ label: b, color: i === glitchIdx ? '#ef4444' : (PARITY_POSITIONS.includes(i + 1) ? '#fbbf24' : '#3b82f6') })) } })
    setPendingTxData({
      id: newRunId,
      from: sourceNode.name,
      to: targetNode.name,
      frameBits: glitchedBits ?? encodedBits,
      glitchIdx,
      timestamp: new Date().toLocaleTimeString(),
    })
  }
  function handleTransmissionComplete() {
    setActiveTransmission(null)
    setTransmissionInProgress(false)
    setTransmissionComplete(true)
    if (pendingTxData) {
      // Receiver logic
      const rxBits = pendingTxData.frameBits
      const result = decodeHammingWithParity(rxBits, parityType)
      setReceiverResult(result)
      setShowSyndrome(true)
      setShowCorrection(result.correctedBit !== null)
      if (result.correctedBit !== null) {
        setShowSuccess(true)
        setShowError(false)
        setTimeout(() => setShowSuccess(false), 3500)
      } else if (result.syndrome.syndromeVal !== 0) {
        setShowError(true)
        setShowSuccess(false)
        setTimeout(() => setShowError(false), 3500)
      }
      setTransmissionHistory((prev) => [...prev, { ...pendingTxData, result }])
      setPendingTxData(null)
    }
  }

  // Decoding with parity type
  function decodeHammingWithParity(received, parityType) {
    const s1 = calcParity(received, [1, 3, 5, 7], parityType)
    const s2 = calcParity(received, [2, 3, 6, 7], parityType)
    const s4 = calcParity(received, [4, 5, 6, 7], parityType)
    const syndromeVal = s1 * 1 + s2 * 2 + s4 * 4
    let corrected = [...received]
    let correctedBit = null
    if (syndromeVal > 0 && syndromeVal <= 7) {
      corrected[syndromeVal - 1] ^= 1
      correctedBit = syndromeVal - 1
    }
    const data = DATA_POSITIONS.map((pos) => corrected[pos - 1])
    return { corrected, correctedBit, syndrome: { s1, s2, s4, syndromeVal }, data }
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
                <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300/85 mb-2">Hamming Code Topology Setup</p>
                <h3 className="text-xl font-bold text-slate-100 mb-4">Configure PCs, MACs, and Links Before Transmission</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* PC & MAC panel */}
                  <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-300 mb-2">1) PC & MAC Assignment</p>
                    <label htmlFor="ham-pc-count" className="block text-sm text-slate-200 mb-1">Number of PCs</label>
                    <input
                      id="ham-pc-count"
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
                        <div key={`ham-mac-${i}`}>
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
                        <div key={`ham-lf-${fi}`}>
                          <label className="block text-[11px] text-slate-400 mb-1">{label}</label>
                          <select
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                          >
                            {pcs.map((pc) => <option key={`ham-opt-${fi}-${pc.id}`} value={pc.id}>{pc.name}</option>)}
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
              {/* ── PANEL 1: Hamming Input Window ── */}
              <DraggablePanel
                title="Hamming Code Input Window"
                initialX={20}
                initialY={100}
                isVisible={true}
                onToggle={() => {}}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(500px,94vw)]">
                                    {/* Hamming Weight & Distance */}
                                    <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <div className="rounded border border-emerald-400/30 bg-emerald-500/10 p-2">
                                        <p className="text-[11px] uppercase tracking-wider text-emerald-300 mb-1">Hamming Weight</p>
                                        <span className="text-xs text-emerald-200 font-mono">Data: {dataBits.padEnd(4, '0')}</span><br />
                                        <span className="text-xs text-emerald-200">Weight: {isBinaryString(dataBits, DATA_BITS) ? hammingWeight(dataBits) : '-'}</span>
                                      </div>
                                      <div className="rounded border border-fuchsia-400/30 bg-fuchsia-500/10 p-2">
                                        <p className="text-[11px] uppercase tracking-wider text-fuchsia-300 mb-1">Hamming Distance</p>
                                        <span className="text-xs text-fuchsia-200 font-mono">Original: {isBinaryString(dataBits, DATA_BITS) ? encodeHammingWithSteps(dataBits.split('').map(Number), parityType).encoded.join('') : '-------'}</span><br />
                                        <span className="text-xs text-fuchsia-200 font-mono">Glitched: {(glitchedBits ?? encodedBits).join('')}</span><br />
                                        <span className="text-xs text-fuchsia-200">Distance: {isBinaryString(dataBits, DATA_BITS) ? hammingDistance(encodeHammingWithSteps(dataBits.split('').map(Number), parityType).encoded, glitchedBits ?? encodedBits) : '-'}</span>
                                      </div>
                                    </div>
                  {/* Parity selection */}
                  <div className="mb-3 flex gap-2 items-center">
                    <label className="text-xs text-slate-200 font-semibold">Parity:</label>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-md border text-xs font-semibold ${parityType === 'even' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
                      onClick={() => setParityType('even')}
                    >Even Parity</button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-md border text-xs font-semibold ${parityType === 'odd' ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
                      onClick={() => setParityType('odd')}
                    >Odd Parity</button>
                  </div>
                                    {/* Show Math window toggle */}
                                    <div className="mb-3">
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-md border border-blue-400 bg-blue-500/20 text-xs font-semibold text-blue-200"
                                        onClick={() => setShowMath((v) => !v)}
                                      >{showMath ? 'Hide Math' : 'Show Math'}</button>
                                    </div>
                                    {/* Math window */}
                                    {showMath && (
                                      <div className="mb-3 rounded-lg border border-blue-400 bg-blue-500/10 p-3">
                                        <p className="text-[11px] uppercase tracking-wider text-blue-300 mb-2">Hamming Code Calculation Steps ({parityType.charAt(0).toUpperCase() + parityType.slice(1)} Parity)</p>
                                        <ul className="text-xs text-slate-200 font-mono space-y-1">
                                          {mathSteps.map((step, idx) => {
                                            if (step.type === 'data') {
                                              return <li key={idx}>Place data bit {step.value} at position {step.pos}</li>
                                            }
                                            if (step.type === 'parity') {
                                              return <li key={idx}>Calculate {step.label}: positions [{step.positions.join(', ')}] → {step.value} ({parityType} parity)</li>
                                            }
                                            return null
                                          })}
                                        </ul>
                                      </div>
                                    )}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSetupOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md border border-blue-300/50 bg-blue-500/25 text-blue-100 hover:bg-blue-500/35"
                    >
                      Edit Topology
                    </button>
                  </div>
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
                  <label htmlFor="ham-data-bits" className="block text-xs text-slate-200 mb-1 font-semibold">
                    Data Bits (4 bits)
                  </label>
                  <input
                    id="ham-data-bits"
                    type="text"
                    value={dataBits}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^01]/g, '').slice(0, 4)
                      setDataBits(val)
                    }}
                    maxLength={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400 font-mono"
                    placeholder="e.g. 1011"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Only 0s and 1s accepted. 4 bits required.</p>
                  {/* Bit placement visualization */}
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">
                      Bit Placement (7,4 Hamming)
                    </p>
                    <BitSphereRow bits={encodedBits} highlight={highlight} />
                    <div className="flex gap-2 mt-2">
                      {['P1', 'P2', 'P4'].map((p, i) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleHighlight(i)}
                          className="rounded border border-fuchsia-400/50 bg-fuchsia-500/20 px-2 py-1 text-xs text-fuchsia-200 hover:bg-fuchsia-500/30"
                        >
                          Highlight {p} Group
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* From / To selects */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">From</label>
                      <select
                        value={sourcePc}
                        onChange={(e) => { setSourcePc(e.target.value); setTargetPc('') }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                      >
                        {pcs.map((pc) => <option key={`ham-src-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">To</label>
                      <select
                        value={targetPc}
                        onChange={(e) => setTargetPc(e.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-100"
                      >
                        {toOptions.map((pc) => <option key={`ham-dst-${pc.id}`} value={pc.id}>{pc.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Transmit */}
                  <button
                    type="button"
                    onClick={startTransmission}
                    disabled={!isBinaryString(dataBits, DATA_BITS) || transmissionInProgress}
                    className="mt-3 w-full rounded-md bg-cyan-500/25 border border-cyan-300/50 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/35 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {transmissionInProgress ? '⏳ Transmitting...' : '▶ Transmit Frame'}
                  </button>
                  {txError && (
                    <p className="mt-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">{txError}</p>
                  )}
                  {/* Concept explanation */}
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">How Hamming Code Works</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Hamming code uses redundant parity bits at positions 1, 2, and 4 to create overlapping parity checks. Each parity bit covers a unique group of bits. If a single bit is corrupted, the receiver can detect and correct it by summing the positions of failing parity checks.
                    </p>
                  </div>
                </div>
              </DraggablePanel>
              {/* ── PANEL 2: Receiver Node ── */}
              <DraggablePanel
                title="Receiver Node"
                initialX={typeof window !== 'undefined' ? window.innerWidth - 520 : 800}
                initialY={typeof window !== 'undefined' ? window.innerHeight - 420 : 400}
                isVisible={true}
                onToggle={() => {}}
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
                        <p className="text-[11px] text-slate-400 mb-1">Received Frame (7 bits)</p>
                        <BitSphereRow bits={receiverResult.corrected} glitchIdx={glitchIdx} />
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] text-blue-300">■ Data</span>
                          <span className="text-[10px] text-yellow-300">■ Parity</span>
                          {glitchIdx !== null && <span className="text-[10px] text-red-300">■ Glitched</span>}
                        </div>
                      </div>
                      {/* Syndrome calculation */}
                      {showSyndrome && (
                        <div className="rounded-md border border-fuchsia-400/30 bg-slate-900/70 p-3 mb-3">
                          <p className="text-[11px] text-fuchsia-300 mb-1">Syndrome Calculation</p>
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-fuchsia-200">P1: {receiverResult.syndrome.s1}</span>
                            <span className="text-[10px] text-fuchsia-200">P2: {receiverResult.syndrome.s2}</span>
                            <span className="text-[10px] text-fuchsia-200">P4: {receiverResult.syndrome.s4}</span>
                            <span className="text-[10px] text-fuchsia-200">Sum: {receiverResult.syndrome.syndromeVal}</span>
                          </div>
                          {receiverResult.syndrome.syndromeVal > 0 && (
                            <div className="mt-2 text-xs text-fuchsia-300">
                              Error detected at position {receiverResult.syndrome.syndromeVal}. Correcting...
                            </div>
                          )}
                        </div>
                      )}
                      {/* Correction animation */}
                      {showCorrection && receiverResult.correctedBit !== null && (
                        <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 mb-3 text-center">
                          <p className="text-emerald-300 text-xs font-bold">Bit {receiverResult.correctedBit + 1} corrected!</p>
                          <p className="text-emerald-200 text-xs">Frame Repaired Successfully. Data Integrity 100%.</p>
                        </div>
                      )}
                      {/* Data extraction */}
                      <div className="rounded-md border border-blue-400/30 bg-blue-500/10 p-3 text-center">
                        <p className="text-blue-300 text-xs font-bold">Extracted Data: {receiverResult.data.join('')}</p>
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
                isVisible={true}
                onToggle={() => {}}
                onDragChange={setIsAnyPanelDragging}
              >
                <div className="w-[min(480px,92vw)]">
                  {/* Frame on wire */}
                  <div className="rounded-md border border-slate-700 bg-slate-900/70 p-3 mb-3">
                    <p className="text-[11px] text-slate-400 mb-2">Frame on Wire</p>
                    <BitSphereRow bits={glitchedBits ?? encodedBits} glitchIdx={glitchIdx} />
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-blue-300">■ Data</span>
                      <span className="text-[10px] text-yellow-300">■ Parity</span>
                      {glitchIdx !== null && (
                        <span className="text-[10px] text-red-300">■ Glitch at bit {glitchIdx + 1}</span>
                      )}
                    </div>
                  </div>
                  {/* Glitch controls */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {[...Array(TOTAL_BITS)].map((_, idx) => (
                      <button
                        key={`glitch-btn-${idx}`}
                        type="button"
                        disabled={glitchIdx !== null || transmissionInProgress}
                        onClick={() => handleGlitch(idx)}
                        className={`rounded-md border border-red-400/50 bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed ${glitchIdx === idx ? 'ring-2 ring-red-400' : ''}`}
                      >
                        Flip Bit {idx + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={glitchIdx === null || transmissionInProgress}
                      onClick={clearGlitch}
                      className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
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
                            Frame: <span className="text-amber-300">{tx.frameBits.join('')}</span>
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {tx.glitchIdx !== null && (
                              <p className="text-[10px] text-red-300">
                                Glitch@bit {tx.glitchIdx + 1}
                              </p>
                            )}
                            {tx.result && tx.result.correctedBit !== null && (
                              <p className="text-[10px] text-emerald-300">
                                Corrected bit {tx.result.correctedBit + 1}
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
