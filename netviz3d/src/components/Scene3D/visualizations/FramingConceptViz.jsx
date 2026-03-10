import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Html, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

const METHOD = {
  CHARACTER_COUNT: 'character-count',
  BYTE_STUFFING: 'byte-stuffing',
  BIT_STUFFING: 'bit-stuffing',
}

const FLAG_CHAR = '|'
const ESC_CHAR = '\\'
const HDLC_FLAG = '01111110'
const SPACING = 0.9
const MIN_PCS = 2
const MAX_PCS = 8

const LINK_COLORS = {
  tube: '#002244',
  emissive: '#0066cc',
  pulse: '#00aaff',
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

function FramingLink({ start, end }) {
  const { geometry } = useMemo(() => {
    const c = curveBetween(start, end)
    const g = new THREE.TubeGeometry(c, 48, 0.04, 8, false)
    return { curve: c, geometry: g }
  }, [start, end])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
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
    </group>
  )
}

function TravelingFrameBlock({ fromPos, toPos, runId, frameData, onComplete, speedMultiplier = 1 }) {
  const curve = useMemo(() => curveBetween(fromPos, toPos), [fromPos, toPos])
  const travelScale = 0.32
  const [visibleBlocks, setVisibleBlocks] = useState([])

  useEffect(() => {
    setVisibleBlocks([])
    const blockRefs = []
    const baseDuration = 0.35 / speedMultiplier
    const baseOverlap = 0.25 / speedMultiplier
    
    const timeline = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          if (onComplete) onComplete()
        }, 300 / speedMultiplier)
      },
    })

    frameData.blocks.forEach((block, idx) => {
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
          frameType={frameData.type}
          runId={runId}
          speedMultiplier={speedMultiplier}
        />
      ))}
    </>
  )
}

function SingleTravelingBlock({ block, blockIndex, curve, scale, frameType, runId, speedMultiplier = 1 }) {
  const groupRef = useRef()
  const proxy = useRef({ t: 0 })

  useEffect(() => {
    proxy.current.t = 0
    const tween = gsap.to(proxy.current, {
      t: 1,
      duration: 0.35 / speedMultiplier,
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
      {frameType === 'character' && (
        <group>
          <mesh>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color={block.color} emissive={block.color} emissiveIntensity={0.5} />
          </mesh>
          <Text position={[0, 0, 0.38]} fontSize={0.2} color="#e2e8f0" anchorX="center" anchorY="middle" maxWidth={0.65}>
            {block.label}
          </Text>
        </group>
      )}

      {frameType === 'byte' && (
        <group>
          <mesh>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color={block.color} emissive={block.color} emissiveIntensity={0.5} />
          </mesh>
          <Text position={[0, 0, 0.38]} fontSize={0.2} color="#e2e8f0" anchorX="center" anchorY="middle" maxWidth={0.65}>
            {block.label}
          </Text>
        </group>
      )}

      {frameType === 'bit' && (
        <group>
          <mesh>
            <sphereGeometry args={[0.28, 20, 20]} />
            <meshStandardMaterial color={block.color} emissive={block.color} emissiveIntensity={0.6} />
          </mesh>
          <Text position={[0, -0.42, 0]} fontSize={0.13} color="#94a3b8" anchorX="center" anchorY="middle">
            {block.label}
          </Text>
        </group>
      )}
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

function toBitString(input) {
  const trimmed = input.trim()

  if (!trimmed) {
    return '101111101111011'
  }

  if (/^[01\s]+$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, '')
  }

  return trimmed
    .split('')
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')
}

function xAt(index, total) {
  return (index - (total - 1) / 2) * SPACING
}

function buildCharacterCountFrame(input) {
  const payload = toTextChars(input)
  const lengthValue = payload.length + 1
  const framed = [String(lengthValue), ...payload]
  const receiverValid = Number(framed[0]) === framed.length

  return {
    payload,
    framed,
    receiverOutput: payload.join(''),
    receiverValid,
    comparisonOriginal: payload.join(''),
    comparisonFramed: framed.join(' '),
    insertions: [],
    methodTitle: 'Character Count',
  }
}

function buildByteStuffingFrame(input) {
  const payload = toTextChars(input)
  const stuffedPayload = []
  const insertions = []

  payload.forEach((ch) => {
    if (ch === FLAG_CHAR || ch === ESC_CHAR) {
      stuffedPayload.push({ value: ESC_CHAR, isStuffed: true })
      insertions.push(stuffedPayload.length)
    }
    stuffedPayload.push({ value: ch, isStuffed: false })
  })

  const framedObjects = [
    { value: FLAG_CHAR, isFlag: true },
    ...stuffedPayload,
    { value: FLAG_CHAR, isFlag: true },
  ]

  const unstuffed = []
  for (let i = 1; i < framedObjects.length - 1; i += 1) {
    const current = framedObjects[i]
    if (current.value === ESC_CHAR) {
      const next = framedObjects[i + 1]
      if (next) {
        unstuffed.push(next.value)
        i += 1
      }
    } else {
      unstuffed.push(current.value)
    }
  }

  return {
    payload,
    framed: framedObjects.map((entry) => entry.value),
    framedObjects,
    receiverOutput: unstuffed.join(''),
    receiverValid: unstuffed.join('') === payload.join(''),
    comparisonOriginal: payload.join(''),
    comparisonFramed: framedObjects.map((entry) => entry.value).join(' '),
    insertions,
    methodTitle: 'Byte Stuffing',
  }
}

function buildBitStuffingFrame(input) {
  const dataBits = toBitString(input).split('')
  const stuffedPayload = []
  const stuffedIndexes = []
  let consecutiveOnes = 0

  dataBits.forEach((bit) => {
    stuffedPayload.push({ bit, isStuffed: false })

    if (bit === '1') {
      consecutiveOnes += 1
      if (consecutiveOnes === 5) {
        stuffedPayload.push({ bit: '0', isStuffed: true })
        stuffedIndexes.push(stuffedPayload.length - 1)
        consecutiveOnes = 0
      }
    } else {
      consecutiveOnes = 0
    }
  })

  const framedBits = [
    ...HDLC_FLAG.split('').map((bit) => ({ bit, isFlag: true })),
    ...stuffedPayload,
    ...HDLC_FLAG.split('').map((bit) => ({ bit, isFlag: true })),
  ]

  const unstuffed = []
  let run = 0
  for (let i = HDLC_FLAG.length; i < framedBits.length - HDLC_FLAG.length; i += 1) {
    const currentBit = framedBits[i].bit
    unstuffed.push(currentBit)

    if (currentBit === '1') {
      run += 1
      if (run === 5) {
        i += 1
        run = 0
      }
    } else {
      run = 0
    }
  }

  return {
    payloadBits: dataBits,
    stuffedPayload,
    framedBits,
    receiverOutputBits: unstuffed.join(''),
    receiverValid: unstuffed.join('') === dataBits.join(''),
    comparisonOriginal: dataBits.join(''),
    comparisonFramed: framedBits.map((entry) => entry.bit).join(''),
    stuffedIndexes,
    methodTitle: 'Bit Stuffing',
  }
}

function buildMethodData(input, activeMethod) {
  if (activeMethod === METHOD.BYTE_STUFFING) {
    return buildByteStuffingFrame(input)
  }

  if (activeMethod === METHOD.BIT_STUFFING) {
    return buildBitStuffingFrame(input)
  }

  return buildCharacterCountFrame(input)
}

function methodExplanation(activeMethod) {
  if (activeMethod === METHOD.CHARACTER_COUNT) {
    return `Character Count Method: Think of it like writing a shopping list. First, you write "I have 5 items", then list them. Here, we add a number at the start telling how many characters follow (including the count itself). Example: For data "HELLO", we send "6HELLO" (6 = 1 header + 5 letters). The receiver reads the first number to know exactly how many characters to expect. Problem: If the count gets corrupted during transmission, the receiver won't know where the frame ends!`
  }

  if (activeMethod === METHOD.BYTE_STUFFING) {
    return `Byte Stuffing Method: Imagine marking the start and end of your message with special bookmarks (${FLAG_CHAR}). Like this: ${FLAG_CHAR}message${FLAG_CHAR}. But what if your actual message contains ${FLAG_CHAR}? The receiver will think it's the end! Solution: We "escape" it. Whenever we find ${FLAG_CHAR} or escape character (${ESC_CHAR}) in data, we add ${ESC_CHAR} before it. Example: Data "A${FLAG_CHAR}B" becomes "${FLAG_CHAR}A${ESC_CHAR}${FLAG_CHAR}B${FLAG_CHAR}". The receiver removes the ${ESC_CHAR} characters to get back original data. It's like saying "the next character is data, not a command!"`
  }

  return `Bit Stuffing Method: Used in protocols like HDLC. We mark frame boundaries with a special 8-bit pattern: "01111110" (six 1s between 0s). To prevent data from accidentally creating this pattern, whenever we see five consecutive 1s in data, we automatically insert a 0 after them. Example: Data "11111000" becomes "111110000" (0 inserted after five 1s). The receiver removes these extra 0s. It's like a safety mechanism - even if your data has lots of 1s, it can never accidentally create the exact flag pattern because we break it up!`
}

function TokenCube({ position, color, label, cubeRef }) {
  return (
    <group position={position} ref={cubeRef}>
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.25} roughness={0.45} />
      </mesh>
      <Text
        position={[0, 0, 0.38]}
        fontSize={0.2}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.65}
      >
        {label}
      </Text>
    </group>
  )
}

export default function FramingConceptViz() {
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
  const [activeMethod, setActiveMethod] = useState(METHOD.CHARACTER_COUNT)
  const [scannerIndex, setScannerIndex] = useState(-1)
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
  
  const [speedMultiplier, setSpeedMultiplier] = useState(0.5)
  const [inputPanelVisible, setInputPanelVisible] = useState(true)
  const [receiverPanelVisible, setReceiverPanelVisible] = useState(true)
  const [historyPanelVisible, setHistoryPanelVisible] = useState(true)
  const [transmissionHistory, setTransmissionHistory] = useState([])
  const [isAnyPanelDragging, setIsAnyPanelDragging] = useState(false)
  const [transmissionComplete, setTransmissionComplete] = useState(false)
  const [pendingTransmissionData, setPendingTransmissionData] = useState(null)

  const charTravelRef = useRef()
  const charHeaderRef = useRef()
  const byteFlagStartRef = useRef()
  const byteFlagEndRef = useRef()
  const byteTokenRefs = useRef([])
  const bitSphereRefs = useRef([])
  const bitShotRef = useRef()
  const scannerRef = useRef()

  const positionMap = useMemo(() => new Map(pcs.map((pc) => [pc.id, pc.position])), [pcs])

  const methodData = useMemo(() => buildMethodData(userInput, activeMethod), [userInput, activeMethod])

  const toOptions = useMemo(() => pcs.filter((pc) => pc.id !== sourcePc), [pcs, sourcePc])

  const travelFrameData = useMemo(() => {
    if (activeMethod === METHOD.CHARACTER_COUNT) {
      return {
        type: 'character',
        blocks: methodData.framed.map((ch, idx) => ({
          label: ch,
          color: idx === 0 ? '#22c55e' : '#3b82f6',
        })),
      }
    }

    if (activeMethod === METHOD.BYTE_STUFFING) {
      return {
        type: 'byte',
        blocks: methodData.framedObjects.map((entry) => {
          const isStuffed = entry.isStuffed
          const isFlag = entry.isFlag
          const color = isFlag ? '#22c55e' : isStuffed ? '#ef4444' : '#3b82f6'
          const label = entry.value === ESC_CHAR ? 'ESC' : entry.value === FLAG_CHAR ? 'FLAG' : entry.value
          return { label, color }
        }),
      }
    }

    if (activeMethod === METHOD.BIT_STUFFING) {
      return {
        type: 'bit',
        blocks: methodData.framedBits.map((entry, idx) => {
          const inPayload = idx >= HDLC_FLAG.length && idx < methodData.framedBits.length - HDLC_FLAG.length
          const payloadIndex = idx - HDLC_FLAG.length
          const isStuffed = inPayload && methodData.stuffedPayload[payloadIndex]?.isStuffed

          let color = '#f8fafc'
          if (entry.isFlag) color = '#22c55e'
          else if (isStuffed) color = '#ef4444'
          else if (entry.bit === '1') color = '#3b82f6'

          return { label: entry.bit, color }
        }),
      }
    }

    return { type: 'character', blocks: [] }
  }, [activeMethod, methodData])

  const finalDecodedOutput = useMemo(() => {
    return activeMethod === METHOD.BIT_STUFFING ? methodData.receiverOutputBits : methodData.receiverOutput
  }, [activeMethod, methodData])

  const decodedOutputParts = useMemo(() => {
    if (errorMode === 'without' || !decodedWithError) {
      return [{ text: finalDecodedOutput, isError: false }]
    }

    const original = finalDecodedOutput
    const corrupted = decodedWithError
    const parts = []
    
    for (let i = 0; i < Math.max(original.length, corrupted.length); i++) {
      const oChar = original[i] || ''
      const cChar = corrupted[i] || ''
      
      if (oChar === cChar) {
        if (parts.length > 0 && !parts[parts.length - 1].isError) {
          parts[parts.length - 1].text += cChar
        } else {
          parts.push({ text: cChar, isError: false })
        }
      } else {
        if (parts.length > 0 && parts[parts.length - 1].isError) {
          parts[parts.length - 1].text += cChar
        } else {
          parts.push({ text: cChar, isError: true })
        }
      }
    }
    
    return parts
  }, [errorMode, decodedWithError, finalDecodedOutput])

  const transmissionStatus = useMemo(() => {
    const original = methodData.comparisonOriginal
    const decoded = errorMode === 'with' && decodedWithError ? decodedWithError : finalDecodedOutput
    return original === decoded ? 'No error Detected.' : 'Error Detected'
  }, [methodData, finalDecodedOutput, errorMode, decodedWithError])

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

    if (errorMode === 'with') {
      const original = activeMethod === METHOD.BIT_STUFFING ? methodData.receiverOutputBits : methodData.receiverOutput
      if (original.length > 2) {
        const errorIndex = Math.floor(original.length / 2)
        const corrupted = original.substring(0, errorIndex) + 'X' + original.substring(errorIndex + 1)
        setDecodedWithError(corrupted)
      } else {
        setDecodedWithError(original + 'X')
      }
    } else {
      setDecodedWithError('')
    }

    const newRunId = txRunId + 1
    setTxRunId(newRunId)
    setActiveTransmission({
      fromId: sourcePc,
      toId: targetPc,
      runId: newRunId,
      frameData: travelFrameData,
    })
    
    const frameText = travelFrameData.blocks.map(b => b.label).join('')
    const status = errorMode === 'with' ? 'Error' : 'No error'
    setPendingTransmissionData({
      id: newRunId,
      from: sourceNode.name,
      to: targetNode.name,
      frameData: frameText,
      method: methodData.methodTitle,
      status: status,
    })
  }

  function handleTransmissionComplete() {
    setActiveTransmission(null)
    setShowSuccessOnReceiver(true)
    setTransmissionInProgress(false)
    setTransmissionComplete(true)

    if (pendingTransmissionData) {
      setTransmissionHistory(prev => [
        ...prev,
        {
          ...pendingTransmissionData,
          timestamp: new Date().toLocaleTimeString(),
        }
      ])
      setPendingTransmissionData(null)
    }

    setTimeout(() => {
      setShowSuccessOnReceiver(false)
    }, 3500)
  }

  useEffect(() => {
    byteTokenRefs.current = []
    bitSphereRefs.current = []
  }, [activeMethod, userInput, txRunId])

  useEffect(() => {
    if (!showFramingPayload) return undefined

    const timeline = gsap.timeline()

    if (activeMethod === METHOD.CHARACTER_COUNT && charHeaderRef.current && charTravelRef.current) {
      gsap.set(charTravelRef.current.position, { x: -2.8, y: 1.45, z: 0 })
      gsap.set(charHeaderRef.current.position, {
        x: xAt(0, methodData.framed.length),
        y: 1.2,
        z: 0,
      })

      timeline
        .to(charHeaderRef.current.position, {
          y: 0,
          duration: 0.8,
          ease: 'back.out(1.7)',
        })
        .to(
          charTravelRef.current.position,
          {
            x: 2.3,
            duration: 1.5,
            ease: 'power1.inOut',
          },
          '>-0.1'
        )
    }

    if (
      activeMethod === METHOD.BYTE_STUFFING &&
      byteFlagStartRef.current &&
      byteFlagEndRef.current &&
      methodData.framed
    ) {
      const total = methodData.framed.length
      const startX = xAt(0, total)
      const endX = xAt(total - 1, total)

      gsap.set(byteFlagStartRef.current.position, { x: startX - 1.2, y: 0, z: 0 })
      gsap.set(byteFlagEndRef.current.position, { x: endX + 1.2, y: 0, z: 0 })

      timeline
        .to(byteFlagStartRef.current.position, {
          x: startX,
          duration: 0.5,
          ease: 'back.out(1.5)',
        })
        .to(
          byteFlagEndRef.current.position,
          {
            x: endX,
            duration: 0.5,
            ease: 'back.out(1.5)',
          },
          '<'
        )

      methodData.insertions.forEach((insertionIndex) => {
        const insertedRef = byteTokenRefs.current[insertionIndex]
        if (!insertedRef) return

        gsap.set(insertedRef.position, { x: xAt(insertionIndex, total), y: 1.1, z: 0 })
        gsap.set(insertedRef.scale, { x: 0.2, y: 0.2, z: 0.2 })

        timeline
          .to(insertedRef.position, {
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
          })
          .to(
            insertedRef.scale,
            {
              x: 1,
              y: 1,
              z: 1,
              duration: 0.2,
              ease: 'back.out(1.8)',
            },
            '<'
          )

        byteTokenRefs.current.forEach((ref, idx) => {
          if (!ref || idx <= insertionIndex) return
          timeline.fromTo(
            ref.position,
            { x: xAt(idx, total) - 0.55 },
            {
              x: xAt(idx, total),
              duration: 0.3,
              ease: 'power2.out',
            },
            '<'
          )
        })

        timeline.to({}, { duration: 0.15 })
      })
    }

    if (activeMethod === METHOD.BIT_STUFFING && methodData.framedBits) {
      setScannerIndex(-1)

      const payloadOffset = HDLC_FLAG.length
      const total = methodData.framedBits.length

      methodData.stuffedIndexes.forEach((idx) => {
        const ref = bitSphereRefs.current[payloadOffset + idx]
        if (ref) {
          gsap.set(ref.scale, { x: 0.15, y: 0.15, z: 0.15 })
          gsap.set(ref.position, { x: xAt(payloadOffset + idx, total), y: 0.95, z: 0 })
        }
      })

      const scannerProxy = { i: -1 }
      const payloadTotal = methodData.stuffedPayload.length

      for (let payloadIndex = 0; payloadIndex < payloadTotal; payloadIndex += 1) {
        timeline.to(scannerProxy, {
          i: payloadIndex,
          duration: 0.16,
          ease: 'none',
          onUpdate: () => {
            setScannerIndex(Math.round(scannerProxy.i))
          },
        })

        const payloadEntry = methodData.stuffedPayload[payloadIndex]
        if (payloadEntry?.isStuffed) {
          const globalIndex = payloadOffset + payloadIndex
          const insertedSphere = bitSphereRefs.current[globalIndex]

          timeline.to({}, { duration: 0.1 })

          if (bitShotRef.current) {
            const shotX = xAt(globalIndex, total)
            timeline
              .set(bitShotRef.current.position, { x: shotX, y: 1.9, z: 0 })
              .set(bitShotRef.current.scale, { x: 1, y: 1, z: 1 })
              .to(bitShotRef.current.position, {
                y: 0,
                duration: 0.2,
                ease: 'power2.in',
              })
              .to(
                bitShotRef.current.scale,
                {
                  x: 0.01,
                  y: 0.01,
                  z: 0.01,
                  duration: 0.12,
                  ease: 'power2.out',
                },
                '<+0.03'
              )
          }

          if (insertedSphere) {
            timeline
              .to(insertedSphere.scale, {
                x: 1,
                y: 1,
                z: 1,
                duration: 0.22,
                ease: 'back.out(2)',
              }, '<')
              .to(
                insertedSphere.position,
                {
                  y: 0,
                  duration: 0.22,
                  ease: 'power2.out',
                },
                '<'
              )
          }

          bitSphereRefs.current.forEach((ref, idx) => {
            if (!ref || idx <= globalIndex) return
            timeline.fromTo(
              ref.position,
              { x: xAt(idx, total) - 0.45 },
              {
                x: xAt(idx, total),
                duration: 0.22,
                ease: 'power2.out',
              },
              '<'
            )
          })
        }
      }
    }

    return () => {
      timeline.kill()
    }
  }, [activeMethod, methodData, showFramingPayload, txRunId])

  useEffect(() => {
    if (!showFramingPayload || !scannerRef.current || activeMethod !== METHOD.BIT_STUFFING || !methodData.stuffedPayload) {
      return
    }

    const payloadLength = methodData.stuffedPayload.length
    const x = xAt(HDLC_FLAG.length + Math.max(scannerIndex, 0), methodData.framedBits.length)
    gsap.to(scannerRef.current.position, {
      x,
      duration: 0.12,
      ease: 'power1.out',
    })

    if (scannerIndex < 0 || scannerIndex >= payloadLength) {
      gsap.to(scannerRef.current.material, {
        opacity: 0.3,
        duration: 0.12,
      })
    } else {
      gsap.to(scannerRef.current.material, {
        opacity: 0.9,
        duration: 0.12,
      })
    }
  }, [scannerIndex, activeMethod, methodData, showFramingPayload])

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
        return <FramingLink key={link.id} start={start} end={end} />
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
                title="Framing Simulator"
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
                    min="0.5"
                    max="3"
                    step="0.5"
                    value={speedMultiplier}
                    onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>0.5x</span>
                    <span>1.5x</span>
                    <span>3x</span>
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

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveMethod(METHOD.CHARACTER_COUNT)}
                    className={`rounded-md px-2.5 py-2 text-xs font-semibold border transition-colors ${
                      activeMethod === METHOD.CHARACTER_COUNT
                        ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60'
                    }`}
                  >
                    Character Count
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMethod(METHOD.BYTE_STUFFING)}
                    className={`rounded-md px-2.5 py-2 text-xs font-semibold border transition-colors ${
                      activeMethod === METHOD.BYTE_STUFFING
                        ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60'
                    }`}
                  >
                    Byte Stuffing
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMethod(METHOD.BIT_STUFFING)}
                    className={`rounded-md px-2.5 py-2 text-xs font-semibold border transition-colors ${
                      activeMethod === METHOD.BIT_STUFFING
                        ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60'
                    }`}
                  >
                    Bit Stuffing
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
                  <p className="text-xs text-slate-200 leading-relaxed">{methodExplanation(activeMethod)}</p>
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
                        <p className="font-mono text-blue-300 break-all">{methodData.comparisonOriginal}</p>
                      </div>
                      {transmissionComplete ? (
                        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
                          <p className="text-slate-400 mb-1">Framed Data</p>
                          <p className="font-mono text-green-300 break-all">{methodData.comparisonFramed}</p>
                        </div>
                      ) : (
                        <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3 flex items-center justify-center">
                          <p className="text-amber-300 text-xs animate-pulse">⏳ Transmitting frames...</p>
                        </div>
                      )}
                    </div>

                    {transmissionComplete && (
                      <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/70 p-3 text-xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <p className="text-slate-200">
                            Decoded Output:{' '}
                            {decodedOutputParts.map((part, idx) => (
                              <span
                                key={`decoded-${idx}`}
                                className={`font-mono break-all ${part.isError ? 'text-red-300' : 'text-blue-300'}`}
                              >
                                {part.text}
                              </span>
                            ))}
                          </p>
                          <p className={`font-semibold ${methodData.receiverValid ? 'text-emerald-400' : 'text-red-400'}`}>
                            {methodData.receiverValid ? 'Frame Verified' : 'Frame Check Failed'}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-700">
                          <p className="text-slate-400 text-[11px] mb-1">Transmission Status</p>
                          <p className={`font-semibold ${
                            transmissionStatus === 'No error Detected.' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {transmissionStatus}
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
