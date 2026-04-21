import React, { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FLOW CONTROL VISUALIZATION
// Sliding Window Flow Control â€” complete feedback loop
// Burst â†’ Buffer Fill â†’ ACK(rwnd) â†’ Window Resize â†’ Slide â†’ Next Burst
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Configuration
const TOTAL_SEGMENTS = 20
const INITIAL_WINDOW_SIZE = 4
const SEGMENT_SIZE = 0.22
const SEGMENT_STRIDE = 0.27
const BUFFER_CAPACITY = 5
const FILL_PER_SEGMENT = 1 / BUFFER_CAPACITY // 0.2 per segment arrival

// Layout positions
const CLIENT_X = -4.5
const SERVER_X = 5
const QUEUE_Y = 1.0
const QUEUE_START_X = -5.0

// Buffer tank
const TANK_RADIUS = 0.4
const TANK_HEIGHT = 1.6

// Animation speeds (per-frame, tuned for smooth viewing)
const SEGMENT_TRAVEL_SPEED = 0.008
const ACK_TRAVEL_SPEED = 0.009
const SEGMENT_STAGGER = 0.4 // seconds between burst segments launching
const POST_ACK_PAUSE = 1.4 // seconds pause after ACK before next burst

export default function FlowControlViz({ isRunning = false, onMessage, resetTrigger = 0, drainSpeed = 0.5, simulateFullBuffer = false, clearBuffer = 0 }) {
  const groupRef = useRef(null)
  const timeRef = useRef(0)

  // â”€â”€ Render state (read by JSX, synced from refs at end of useFrame) â”€â”€
  const [renderState, setRenderState] = useState({
    time: 0,
    windowSize: INITIAL_WINDOW_SIZE,
    windowOffset: 0,
    bufferLevel: 0,
    sentSegments: new Set(),
    flyingSegments: [],
    ackPulses: [],
    serverFlash: 0,
    gearRotation: 0,
    frozen: false,
    persistTimerProgress: 0,
    probePosition: -1,
    probeAckPosition: -1,
    probeAckRwnd: 0,
    thawFlash: 0,
    frozenAtOffset: 0
  })

  // â”€â”€ Ref-based animation state (read/written in useFrame, avoids stale closures) â”€â”€
  const phaseRef = useRef('idle')
  const windowSizeRef = useRef(INITIAL_WINDOW_SIZE)
  const windowOffsetRef = useRef(0)
  const bufferLevelRef = useRef(0)
  const sentSegmentsRef = useRef(new Set())
  const completionShownRef = useRef(false)
  const pauseUntilRef = useRef(0)
  const messageShownRef = useRef(new Set())
  const burstArrivedCountRef = useRef(0)
  const burstTotalCountRef = useRef(0)
  const ackSentForBurstRef = useRef(false)
  const flyingSegmentsRef = useRef([])
  const ackPulsesRef = useRef([])
  const serverFlashRef = useRef(0)
  const gearRotationRef = useRef(0)

  // -- Zero Window Probe refs --
  const frozenRef = useRef(false)
  const persistTimerStartRef = useRef(0)
  const persistTimerProgressRef = useRef(0)
  const probePositionRef = useRef(-1)
  const probeAckPositionRef = useRef(-1)
  const probeAckRwndRef = useRef(0)
  const probeSentCountRef = useRef(0)
  const win0AckSentRef = useRef(false)
  const clearBufferRef = useRef(0)
  const thawFlashRef = useRef(0)
  const frozenAtOffsetRef = useRef(0)
  const drainMsgSentRef = useRef(false)
  const simulateFullBufferRef = useRef(false)
  const zwpTriggeredRef = useRef(false)

  // Stable ref to latest onMessage callback
  const onMessageRef = useRef(onMessage)
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  // Sync simulateFullBuffer prop to ref for useFrame access
  useEffect(() => {
    simulateFullBufferRef.current = simulateFullBuffer
  }, [simulateFullBuffer])

  // Handle "Clear Server Buffer" trigger
  useEffect(() => {
    if (clearBuffer === 0) return
    clearBufferRef.current = clearBuffer
  }, [clearBuffer])

  // Reset handler
  useEffect(() => {
    const resetAll = () => {
      timeRef.current = 0
      phaseRef.current = 'idle'
      windowSizeRef.current = INITIAL_WINDOW_SIZE
      windowOffsetRef.current = 0
      bufferLevelRef.current = 0
      sentSegmentsRef.current = new Set()
      completionShownRef.current = false
      pauseUntilRef.current = 0
      messageShownRef.current.clear()
      burstArrivedCountRef.current = 0
      burstTotalCountRef.current = 0
      ackSentForBurstRef.current = false
      flyingSegmentsRef.current = []
      ackPulsesRef.current = []
      serverFlashRef.current = 0
      gearRotationRef.current = 0
      frozenRef.current = false
      persistTimerStartRef.current = 0
      persistTimerProgressRef.current = 0
      probePositionRef.current = -1
      probeAckPositionRef.current = -1
      probeAckRwndRef.current = 0
      probeSentCountRef.current = 0
      win0AckSentRef.current = false
      clearBufferRef.current = 0
      thawFlashRef.current = 0
      frozenAtOffsetRef.current = 0
      drainMsgSentRef.current = false
      simulateFullBufferRef.current = false
      zwpTriggeredRef.current = false
      setRenderState({
        time: 0,
        windowSize: INITIAL_WINDOW_SIZE,
        windowOffset: 0,
        bufferLevel: 0,
        sentSegments: new Set(),
        flyingSegments: [],
        ackPulses: [],
        serverFlash: 0,
        gearRotation: 0,
        frozen: false,
        persistTimerProgress: 0,
        probePosition: -1,
        probeAckPosition: -1,
        probeAckRwnd: 0,
        thawFlash: 0,
        frozenAtOffset: 0
      })
    }
    queueMicrotask(resetAll)
  }, [resetTrigger])

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // ANIMATION LOOP â€” all reads/writes use refs, setState only to trigger render
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  useFrame((_, delta) => {
    timeRef.current += delta
    const now = timeRef.current

    if (!isRunning) {
      // Still sync time for pulsing animations
      setRenderState(prev => prev.time === now ? prev : { ...prev, time: now })
      return
    }

    const phase = phaseRef.current
    const sendMsg = (key, text) => {
      if (onMessageRef.current && !messageShownRef.current.has(key)) {
        messageShownRef.current.add(key)
        onMessageRef.current(text)
      }
    }

    // â”€â”€ PHASE: IDLE â†’ Launch a new burst â”€â”€
    if (phase === 'idle' && !frozenRef.current) {
      const wSize = windowSizeRef.current
      const wOffset = windowOffsetRef.current
      const sent = sentSegmentsRef.current

      const newFlying = []
      const newSent = new Set(sent)
      let count = 0

      for (let i = 0; i < wSize; i++) {
        const segIdx = wOffset + i
        if (segIdx >= TOTAL_SEGMENTS || newSent.has(segIdx)) continue
        newSent.add(segIdx)
        newFlying.push({
          id: `fly-${segIdx}-${now}`,
          segmentIndex: segIdx,
          position: 0,
          spawnTime: now + i * SEGMENT_STAGGER,
          arrived: false,
          arrivalTime: 0
        })
        count++
      }

      if (count === 0) {
        phaseRef.current = 'complete'
      } else {
        phaseRef.current = 'sending'
        burstTotalCountRef.current = count
        burstArrivedCountRef.current = 0
        ackSentForBurstRef.current = false
        sentSegmentsRef.current = newSent
        flyingSegmentsRef.current = [...flyingSegmentsRef.current, ...newFlying]

        const key = `burst-${wOffset}`
        if (wSize >= 4) {
          sendMsg(key, `[CLIENT] High Throughput: Sending ${count} segments (Window: ${wSize})`)
        } else if (wSize === 1) {
          sendMsg(key, `[CLIENT] Flow Control Active: Sending 1 segment (Window throttled to 1)`)
        } else {
          sendMsg(key, `[CLIENT] Sending ${count} segments (Window: ${wSize})`)
        }
      }
      return
    }

    // â”€â”€ Move flying segments toward server â”€â”€
    let arrivalsThisTick = 0
    const segs = flyingSegmentsRef.current
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      if (seg.arrived || now < seg.spawnTime) continue

      const newPos = Math.min(seg.position + SEGMENT_TRAVEL_SPEED, 1)

      if (newPos >= 0.98 && !seg.arrived) {
        arrivalsThisTick++
        segs[i] = { ...seg, position: 1, arrived: true, arrivalTime: now }
      } else {
        segs[i] = { ...seg, position: newPos }
      }
    }

    // Handle each arrival -> fill buffer
    if (arrivalsThisTick > 0) {
      serverFlashRef.current = 1
      burstArrivedCountRef.current += arrivalsThisTick
      for (let a = 0; a < arrivalsThisTick; a++) {
        bufferLevelRef.current = Math.min(bufferLevelRef.current + FILL_PER_SEGMENT, 1)
      }
      const bl = bufferLevelRef.current
      if (bl >= 0.8) sendMsg('buffer-warn', '[SERVER] Buffer at 80%+! Pressure building - sending throttle signal...')
      if (bl >= 1.0) sendMsg('buffer-full', '[SERVER] Buffer FULL (100%)! Maximum backpressure!')
    }
    // Clean up faded-out arrived segments
    flyingSegmentsRef.current = segs.filter(seg => !(seg.arrived && now - seg.arrivalTime > 0.5))
    // -- When ALL burst segments arrived -> send ACK with rwnd --
    if (phase === 'sending' &&
        burstArrivedCountRef.current >= burstTotalCountRef.current &&
        burstTotalCountRef.current > 0 &&
        !ackSentForBurstRef.current) {
      ackSentForBurstRef.current = true

      // ZWP mode: when buffer is above 75%, send WIN:0
      if (simulateFullBufferRef.current && !zwpTriggeredRef.current && bufferLevelRef.current >= 0.75) {
        zwpTriggeredRef.current = true
        phaseRef.current = 'ack-traveling'
        ackPulsesRef.current = [...ackPulsesRef.current, {
          id: `ack-win0-${now}`,
          position: 1,
          rwnd: 0,
          spawnTime: now + 0.3,
          arrived: false,
          arrivalTime: 0,
          isWin0: true
        }]
        const bufPct = Math.round(bufferLevelRef.current * 100)
        sendMsg('ack-zwp-trigger', '[SERVER] Receive Buffer at ' + bufPct + '%! Sending ACK WIN: 0 - Sender must STOP!')
      } else {
        // Normal ACK with rwnd
        phaseRef.current = 'ack-traveling'
        const currentBufferSegments = Math.round(bufferLevelRef.current * BUFFER_CAPACITY)
        const rwnd = Math.max(1, Math.min(INITIAL_WINDOW_SIZE, BUFFER_CAPACITY - currentBufferSegments))
        ackPulsesRef.current = [...ackPulsesRef.current, {
          id: `ack-${now}`,
          position: 1,
          rwnd,
          spawnTime: now + 0.3,
          arrived: false,
          arrivalTime: 0
        }]
        const key = `ack-${windowOffsetRef.current}`
        if (rwnd <= 1) {
          sendMsg(key, '[SERVER] Sending ACK -> WIN: ' + rwnd + ' (Buffer under pressure - throttling sender!)')
        } else if (rwnd >= INITIAL_WINDOW_SIZE) {
          sendMsg(key, '[SERVER] Sending ACK -> WIN: ' + rwnd + ' (Buffer clear - full speed ahead!)')
        } else {
          sendMsg(key, '[SERVER] Sending ACK -> WIN: ' + rwnd + ' (Buffer partially full)')
        }
      }
    }    // â”€â”€ Move ACK pulses back toward client â”€â”€
    let arrivedAck = null
    const acks = ackPulsesRef.current
    for (let i = 0; i < acks.length; i++) {
      const ack = acks[i]
      if (ack.arrived || now < ack.spawnTime) continue

      const newPos = Math.max(ack.position - ACK_TRAVEL_SPEED, 0)

      if (newPos <= 0.02 && !ack.arrived) {
        arrivedAck = ack
        acks[i] = { ...ack, position: 0, arrived: true, arrivalTime: now }
      } else {
        acks[i] = { ...ack, position: newPos }
      }
    }

    // â”€â”€ ACK arrived â†’ resize window, slide offset, schedule next burst â”€â”€
    if (arrivedAck) {
      // Check if this is a WIN:0 ACK that should freeze
      if (arrivedAck.rwnd === 0) {
        frozenRef.current = true
        windowSizeRef.current = 0
        phaseRef.current = 'frozen'
        persistTimerStartRef.current = 0
        persistTimerProgressRef.current = 0
        probePositionRef.current = -1
        probeAckPositionRef.current = -1
        frozenAtOffsetRef.current = windowOffsetRef.current
        sendMsg('window-zero', '[CLIENT] ACK received: WIN: 0 - Window LOCKED! Transmission FROZEN. Waiting...')
        // Skip normal ACK processing
      } else {
      const newWinSize = arrivedAck.rwnd
      const oldWinSize = windowSizeRef.current
      const oldOffset = windowOffsetRef.current
      const sent = sentSegmentsRef.current

      const rKey = `resize-${oldOffset}-${newWinSize}`
      if (newWinSize < oldWinSize) {
        sendMsg(rKey, `[CLIENT] ACK received -> Window SHRINKS: ${oldWinSize} -> ${newWinSize} (Flow Control: Slow Down!)`)
      } else if (newWinSize > oldWinSize) {
        sendMsg(rKey, `[CLIENT] ACK received -> Window EXPANDS: ${oldWinSize} -> ${newWinSize} (Recovery: Speed Up!)`)
      } else {
        sendMsg(rKey, `[CLIENT] ACK received -> Window stays at ${newWinSize}`)
      }

      windowSizeRef.current = newWinSize

      let newOffset = oldOffset
      while (newOffset < TOTAL_SEGMENTS && sent.has(newOffset)) {
        newOffset++
      }
      windowOffsetRef.current = newOffset

      if (newOffset >= TOTAL_SEGMENTS) {
        phaseRef.current = 'complete'
      } else {
        phaseRef.current = 'pause'
        pauseUntilRef.current = now + POST_ACK_PAUSE
      }
    }

    }

    // Clean up faded ACK pulses
    ackPulsesRef.current = acks.filter(ack => !(ack.arrived && now - ack.arrivalTime > 0.5))

    // â”€â”€ PAUSE â†’ wait, then go idle for next burst â”€â”€
    if (phase === 'pause' && now >= pauseUntilRef.current) {
      phaseRef.current = 'idle'
    }

    // â”€â”€ COMPLETION â”€â”€
    if (phase === 'complete' && !completionShownRef.current) {
      completionShownRef.current = true
      if (onMessageRef.current) onMessageRef.current(`[COMPLETE] All ${TOTAL_SEGMENTS} segments successfully transmitted via Flow Control!`)
    }

        // Server processor: drain the buffer continuously
    if (bufferLevelRef.current > 0) {
      if (!frozenRef.current) {
        // When ZWP mode active and not yet triggered, server is overwhelmed — no drain
        // so buffer visibly fills from segment arrivals and triggers WIN:0
        const effectiveDrain = (simulateFullBufferRef.current && !zwpTriggeredRef.current)
          ? 0
          : drainSpeed
        gearRotationRef.current += delta * 2 * effectiveDrain
        const drainAmount = 0.2 * effectiveDrain * delta
        bufferLevelRef.current = Math.max(bufferLevelRef.current - drainAmount, 0)
      } else {
        // Server still processes backlog while frozen
        gearRotationRef.current += delta * 1.5
        if (probePositionRef.current >= 0) {
          // Faster drain while probe is in flight
          const fastDrain = 0.5 * delta
          bufferLevelRef.current = Math.max(bufferLevelRef.current - fastDrain, 0)
        } else {
          // Slow background drain during persist timer wait
          const bgDrain = 0.10 * delta
          bufferLevelRef.current = Math.max(bufferLevelRef.current - bgDrain, 0)
        }
      }
    }

    // -- ZERO WINDOW PROBE LOGIC --
   if (frozenRef.current) {
      // Check if clear buffer was requested
      if (clearBufferRef.current > 0) {
        clearBufferRef.current = 0
        bufferLevelRef.current = 0
        sendMsg('buffer-cleared', '[SERVER] Buffer cleared! Processing complete. Sending Window Update...')
      }

      // Persist Timer countdown
      if (persistTimerStartRef.current === 0) {
        persistTimerStartRef.current = now
      }
      const elapsed = now - persistTimerStartRef.current
      persistTimerProgressRef.current = Math.min(elapsed / 4, 1)

      // Drain message when buffer has visibly dropped
      if (!drainMsgSentRef.current && bufferLevelRef.current < 0.6) {
        drainMsgSentRef.current = true
        const bufPct = Math.round(bufferLevelRef.current * 100)
        sendMsg('drain-backlog', '[SERVER] Processing backlog... buffer draining (' + bufPct + '%)')
      }

      if (persistTimerProgressRef.current < 1) {
        const probeNum = probeSentCountRef.current + 1
        if (probeNum === 1) {
          sendMsg('persist-timer', '[CLIENT] Receiver busy. Starting Persist Timer...')
        } else {
          sendMsg('persist-timer-' + probeNum, '[CLIENT] No response yet. Persist Timer restarted (Probe #' + probeNum + ')...')
        }
      }

      // Timer finished -> launch probe
      if (persistTimerProgressRef.current >= 1 && probePositionRef.current < 0 && probeAckPositionRef.current < 0) {
        probePositionRef.current = 0
        probeSentCountRef.current += 1
        const probeNum = probeSentCountRef.current
        sendMsg('probe-sent-' + probeNum, '[CLIENT] Sending Zero Window Probe #' + probeNum + ' (1 Byte) to Server...')
      }

      // Move probe toward server
      if (probePositionRef.current >= 0 && probePositionRef.current < 1) {
        probePositionRef.current = Math.min(probePositionRef.current + 0.007, 1)

        // Probe arrived at server
        if (probePositionRef.current >= 0.98) {
          probePositionRef.current = 1
          serverFlashRef.current = 1

          // Determine response based on actual buffer level
          const currentBufSegs = Math.round(bufferLevelRef.current * BUFFER_CAPACITY)
          const rwnd = Math.min(INITIAL_WINDOW_SIZE, Math.max(0, BUFFER_CAPACITY - currentBufSegs))
          probeAckRwndRef.current = rwnd
          probeAckPositionRef.current = 1

          const ackNum = frozenAtOffsetRef.current + 1
          const bufPct = Math.round(bufferLevelRef.current * 100)
          if (rwnd > 0) {
            sendMsg('probe-response-recovery-' + probeSentCountRef.current, '[SERVER] Buffer at ' + bufPct + '%. Responding: ACK ' + ackNum + ' | WIN: ' + rwnd + ' - Sender can resume!')
          } else {
            sendMsg('probe-response-full-' + probeSentCountRef.current, '[SERVER] Buffer at ' + bufPct + '%. Responding: ACK ' + ackNum + ' | WIN: 0 - Stay paused!')
          }
        }
      }

      // Move probe ACK back toward client
      if (probeAckPositionRef.current >= 0) {
        probeAckPositionRef.current = Math.max(probeAckPositionRef.current - 0.008, 0)

        // ACK arrived at client
        if (probeAckPositionRef.current <= 0.02) {
          const rwnd = probeAckRwndRef.current
          probeAckPositionRef.current = -1
          probePositionRef.current = -1

          if (rwnd > 0) {
            // THAW: Window opens, resume sending
            frozenRef.current = false
            windowSizeRef.current = rwnd
            thawFlashRef.current = 1
            drainMsgSentRef.current = false
            // Reset ZWP trigger so cycle can repeat on next burst
            zwpTriggeredRef.current = false
            // Slide window offset past already-sent segments
            let newOffset = windowOffsetRef.current
            while (newOffset < TOTAL_SEGMENTS && sentSegmentsRef.current.has(newOffset)) {
              newOffset++
            }
            windowOffsetRef.current = newOffset
            if (newOffset >= TOTAL_SEGMENTS) {
              phaseRef.current = 'complete'
            } else {
              phaseRef.current = 'pause'
              pauseUntilRef.current = now + POST_ACK_PAUSE
            }
            sendMsg('thaw', '[CLIENT] Window REOPENED: 0 -> ' + rwnd + '! Resuming transmission!')
          } else {
            // Still frozen, restart persist timer
            persistTimerStartRef.current = 0
            persistTimerProgressRef.current = 0
            sendMsg('still-frozen-' + probeSentCountRef.current, '[CLIENT] Window still 0. Restarting Persist Timer...')
          }
        }
      }
    }
    // Fade server flash
    if (serverFlashRef.current > 0) {
      serverFlashRef.current = Math.max(serverFlashRef.current - delta * 2.5, 0)
    }
    // Fade thaw flash (gold window recovery effect)
    if (thawFlashRef.current > 0) {
      thawFlashRef.current = Math.max(thawFlashRef.current - delta * 1.2, 0)
    }

    // ── Sync all ref state to React state for rendering ──
    setRenderState({
      time: now,
      windowSize: windowSizeRef.current,
      windowOffset: windowOffsetRef.current,
      bufferLevel: bufferLevelRef.current,
      sentSegments: sentSegmentsRef.current,
      flyingSegments: [...flyingSegmentsRef.current],
      ackPulses: [...ackPulsesRef.current],
      serverFlash: serverFlashRef.current,
      gearRotation: gearRotationRef.current,
      frozen: frozenRef.current,
      persistTimerProgress: persistTimerProgressRef.current,
      probePosition: probePositionRef.current,
      probeAckPosition: probeAckPositionRef.current,
      probeAckRwnd: probeAckRwndRef.current,
      thawFlash: thawFlashRef.current,
      frozenAtOffset: frozenAtOffsetRef.current
    })
  })

  // Segment position calculator
  const getSegmentX = (index) => QUEUE_START_X + index * SEGMENT_STRIDE

  // Destructure render state for JSX
  const { time: now, windowSize, windowOffset, bufferLevel, sentSegments,
    flyingSegments: flySegs, ackPulses: ackList, serverFlash, frozen, persistTimerProgress, probePosition, probeAckPosition, probeAckRwnd, thawFlash, frozenAtOffset } = renderState

  // Window geometry
  const windowCenterX = getSegmentX(windowOffset) + (windowSize - 1) * SEGMENT_STRIDE / 2
  const windowWidth = windowSize * SEGMENT_STRIDE

  // Cable geometry
  const cableMidX = (CLIENT_X + SERVER_X) / 2
  const cableLength = SERVER_X - CLIENT_X

  return (
    <group ref={groupRef} position={[-1, 0, 0]}>
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* CLIENT NODE (Sender) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <group position={[CLIENT_X, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshPhongMaterial
            color={frozen ? '#ff4444' : '#00ffff'}
            emissive={frozen ? '#ff2222' : '#00ffff'}
            emissiveIntensity={frozen ? 0.4 + Math.sin(now * 3) * 0.3 : 0.6}
            shininess={80}
          />
        </mesh>
        <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.06, 16, 32]} />
          <meshBasicMaterial color={frozen ? '#ff4444' : '#00ffff'} transparent opacity={0.8} />
        </mesh>
        <pointLight position={[0, 0, 0]} intensity={2} distance={2.5} color={frozen ? '#ff4444' : '#00ffff'} />
        {/* Frozen red pulse glow */}
        {frozen && (
          <pointLight position={[0, 0.5, 0.5]} intensity={3 + Math.sin(now * 3) * 1.5} distance={3} color="#ff3333" />
        )}
        <Text
          position={[0, -1.0, 0]}
          fontSize={0.35}
          color={frozen ? '#ff6666' : '#00ffff'}
          anchorX="center"
          anchorY="top"
          fontWeight="bold"
        >
          SENDER
        </Text>
        {/* FROZEN status label */}
        {frozen && (
          <Text
            position={[0, 0.7, 0.5]}
            fontSize={0.18}
            color="#ff4444"
            anchorX="center"
            anchorY="center"
            fontWeight="bold"
          >
            FROZEN
          </Text>
        )}
      </group>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* SERVER NODE (Receiver) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <group position={[SERVER_X, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshPhongMaterial
            color={serverFlash > 0 ? '#22ff00' : '#ffaa00'}
            emissive={serverFlash > 0 ? '#22ff00' : '#ffaa00'}
            emissiveIntensity={0.6 + serverFlash * 2}
            shininess={80}
          />
        </mesh>
        <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.06, 16, 32]} />
          <meshBasicMaterial color={serverFlash > 0 ? '#22ff00' : '#ffaa00'} transparent opacity={0.8} />
        </mesh>
        <pointLight position={[0, 0, 0]} intensity={2} distance={2.5} color="#ffaa00" />
        {serverFlash > 0 && (
          <pointLight position={[0, 0.5, 0.8]} intensity={8 * serverFlash} distance={6} color="#22ff00" />
        )}
        <Text
          position={[0, -1.0, 0]}
          fontSize={0.35}
          color={serverFlash > 0 ? '#ccffcc' : '#ffdd00'}
          anchorX="center"
          anchorY="top"
          fontWeight="bold"
        >
          RECEIVER
        </Text>
      </group>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* CONNECTION CABLE */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <group>
        {/* Core cable */}
        <mesh position={[cableMidX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, cableLength, 32]} />
          <meshPhongMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={0.8}
          />
        </mesh>
        {/* Insulation */}
        <mesh position={[cableMidX, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, cableLength, 32]} />
          <meshPhongMaterial
            color="#0099dd"
            emissive="#0099dd"
            emissiveIntensity={0.4}
            transparent
            opacity={0.5}
          />
        </mesh>
        {/* Cable glow */}
        <pointLight position={[cableMidX, 0, 0]} intensity={1.5} distance={4} color="#00ffff" />
      </group>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* CLIENT-TO-QUEUE VERTICAL CONNECTOR */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <mesh position={[CLIENT_X, (0.4 + QUEUE_Y) / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, QUEUE_Y - 0.55, 8]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
      </mesh>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* DATA SEGMENT QUEUE (20 Blue Cubes) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => {
        const x = getSegmentX(i)
        const isInWindow = i >= windowOffset && i < windowOffset + windowSize && !sentSegments.has(i)
        const isSent = sentSegments.has(i)
        const pulse = isInWindow ? Math.sin(now * 3 + i * 0.5) * 0.15 + 0.85 : 1

        return (
          <group key={`seg-${i}`} position={[x, QUEUE_Y, 0]}>
            {/* Segment cube */}
            <mesh>
              <boxGeometry args={[SEGMENT_SIZE, SEGMENT_SIZE, SEGMENT_SIZE]} />
              <meshPhongMaterial
                color={isSent ? '#1e293b' : isInWindow ? '#00eeff' : '#3b82f6'}
                emissive={isSent ? '#0f172a' : isInWindow ? '#00bbdd' : '#1e3a8a'}
                emissiveIntensity={isSent ? 0.1 : isInWindow ? 0.8 * pulse : 0.3}
                shininess={isInWindow ? 100 : 40}
                transparent={isSent}
                opacity={isSent ? 0.25 : 1}
              />
            </mesh>

            {/* Glow light for sendable segments */}
            {isInWindow && (
              <pointLight
                position={[0, 0, 0]}
                intensity={1.2 * pulse}
                distance={0.5}
                color="#00eeff"
              />
            )}

            {/* Segment number label */}
            <Text
              position={[0, 0, SEGMENT_SIZE / 2 + 0.01]}
              fontSize={0.08}
              color={isSent ? '#334155' : isInWindow ? '#ffffff' : '#94a3b8'}
              anchorX="center"
              anchorY="center"
              fontWeight="bold"
            >
              {i + 1}
            </Text>
          </group>
        )
      })}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* SLIDING WINDOW FRAME */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <group position={[windowCenterX, QUEUE_Y, 0]}>
        {/* Inner wireframe box */}
        <mesh>
          <boxGeometry args={[frozen ? 0.5 : windowWidth, 0.42, 0.42]} />
          <meshBasicMaterial
            color={frozen ? '#ff3333' : thawFlash > 0.3 ? '#ffdd00' : '#00ffff'}
            wireframe={true}
            transparent
            opacity={frozen ? 0.8 + Math.sin(now * 4) * 0.2 : thawFlash > 0 ? 0.9 : 0.6 + Math.sin(now * 2) * 0.15}
          />
        </mesh>

        {/* Outer glow wireframe */}
        <mesh>
          <boxGeometry args={[(frozen ? 0.5 : windowWidth) + 0.04, 0.46, 0.46]} />
          <meshBasicMaterial
            color={frozen ? '#ff5555' : thawFlash > 0.3 ? '#ffee44' : '#00ddff'}
            wireframe={true}
            transparent
            opacity={frozen ? 0.4 + Math.sin(now * 4) * 0.15 : thawFlash > 0 ? 0.6 : 0.2 + Math.sin(now * 2) * 0.08}
          />
        </mesh>

        {/* Window label */}
        <Text
          position={[0, 0.4, 0]}
          fontSize={0.14}
          color={frozen ? '#ff4444' : thawFlash > 0.3 ? '#ffdd00' : '#00ffff'}
          anchorX="center"
          anchorY="bottom"
          fontWeight="bold"
        >
          {frozen ? 'WINDOW LOCKED (WIN: 0)' : thawFlash > 0.3 ? `WINDOW REOPENED! (rwnd: ${windowSize})` : `WINDOW (rwnd: ${windowSize})`}
        </Text>

        {/* Window glow */}
        <pointLight position={[0, 0, 0.4]} intensity={thawFlash > 0 ? 3 : 1.2} distance={1.8} color={frozen ? '#ff3333' : thawFlash > 0.3 ? '#ffdd00' : '#00eeff'} />

        {/* Thaw recovery gold flash */}
        {thawFlash > 0 && (
          <pointLight position={[0, 0, 0]} intensity={5 * thawFlash} distance={3} color="#ffdd00" />
        )}

        {/* Frozen red pulse light */}
        {frozen && (
          <pointLight position={[0, 0, 0]} intensity={2 + Math.sin(now * 4) * 1} distance={2.5} color="#ff3333" />
        )}
      </group>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* BUFFER TANK (at Receiver) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <group position={[SERVER_X + 1.3, 0, 0]}>
        {/* Tank shell - transparent cylinder */}
        <mesh>
          <cylinderGeometry args={[TANK_RADIUS, TANK_RADIUS, TANK_HEIGHT, 32]} />
          <meshPhongMaterial
            color="#60a5fa"
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>

        {/* Tank wireframe overlay for visibility */}
        <mesh>
          <cylinderGeometry args={[TANK_RADIUS + 0.01, TANK_RADIUS + 0.01, TANK_HEIGHT, 16]} />
          <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.25} />
        </mesh>

        {/* Top rim */}
        <mesh position={[0, TANK_HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TANK_RADIUS, 0.03, 8, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} />
        </mesh>

        {/* Bottom rim */}
        <mesh position={[0, -TANK_HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TANK_RADIUS, 0.03, 8, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} />
        </mesh>

        {/* Bottom cap */}
        <mesh position={[0, -TANK_HEIGHT / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[TANK_RADIUS, 32]} />
          <meshPhongMaterial color="#1e3a8a" transparent opacity={0.3} />
        </mesh>

        {/* Liquid level (renders when buffer has data) */}
        {bufferLevel > 0.01 && (() => {
          // Color shifts: green (low) -> yellow (mid) -> red (high)
          const liquidColor = bufferLevel > 0.7 ? '#ff4444' : bufferLevel > 0.4 ? '#ffaa00' : '#00ff88'
          const liquidEmissive = bufferLevel > 0.7 ? '#ff2222' : bufferLevel > 0.4 ? '#ff8800' : '#00dd66'
          return (
            <mesh position={[0, -TANK_HEIGHT / 2 + (bufferLevel * TANK_HEIGHT) / 2, 0]}>
              <cylinderGeometry args={[TANK_RADIUS - 0.04, TANK_RADIUS - 0.04, bufferLevel * TANK_HEIGHT, 32]} />
              <meshPhongMaterial
                color={liquidColor}
                emissive={liquidEmissive}
                emissiveIntensity={0.5 + bufferLevel * 0.3}
                transparent
                opacity={0.6}
              />
            </mesh>
          )
        })()}

        {/* Tank label */}
        <Text
          position={[0, TANK_HEIGHT / 2 + 0.2, 0]}
          fontSize={0.13}
          color="#60a5fa"
          anchorX="center"
          anchorY="bottom"
          fontWeight="bold"
        >
          RECEIVE BUFFER
        </Text>

        {/* Buffer % label */}
        <Text
          position={[0, 0, TANK_RADIUS + 0.12]}
          fontSize={0.13}
          color={bufferLevel > 0.7 ? '#ff4444' : bufferLevel > 0.4 ? '#ffaa00' : '#94a3b8'}
          anchorX="center"
          anchorY="center"
          fontWeight="bold"
        >
          {`${Math.round(bufferLevel * 100)}%`}
        </Text>

        {/* Buffer status text during ZWP */}
        {frozen && bufferLevel >= 0.99 && (
          <Text
            position={[0, -TANK_HEIGHT / 2 - 0.2, 0]}
            fontSize={0.11}
            color="#ff4444"
            anchorX="center"
            anchorY="top"
            fontWeight="bold"
          >
            FULL!
          </Text>
        )}
        {frozen && probePosition >= 0 && bufferLevel < 0.99 && bufferLevel > 0.01 && (
          <Text
            position={[0, -TANK_HEIGHT / 2 - 0.2, 0]}
            fontSize={0.11}
            color="#ffaa00"
            anchorX="center"
            anchorY="top"
            fontWeight="bold"
          >
            DRAINING...
          </Text>
        )}

      </group>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* FLYING SEGMENTS (in transit from client to server) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {flySegs.filter(seg => now >= seg.spawnTime).map((seg) => {
        
        // Interpolate position from queue to server
        const startX = getSegmentX(seg.segmentIndex)
        const startY = QUEUE_Y
        const endX = SERVER_X
        const endY = 0.5 // Land near server at cable level

        const t = seg.position
        const x = startX + (endX - startX) * t
        // Arc trajectory - rises then descends to server
        const arcHeight = 0.8
        const y = startY + (endY - startY) * t + Math.sin(t * Math.PI) * arcHeight
        
        // Fade out on arrival
        const arrivalFade = seg.arrived ? Math.max(0, 1 - (now - seg.arrivalTime) / 0.5) : 1
        
        return (
          <group key={seg.id} position={[x, y, 0]}>
            <mesh>
              <boxGeometry args={[SEGMENT_SIZE, SEGMENT_SIZE, SEGMENT_SIZE]} />
              <meshPhongMaterial
                color="#00eeff"
                emissive="#00bbdd"
                emissiveIntensity={1.0}
                shininess={100}
                transparent
                opacity={arrivalFade}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[SEGMENT_SIZE + 0.03, SEGMENT_SIZE + 0.03, SEGMENT_SIZE + 0.03]} />
              <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.5 * arrivalFade} />
            </mesh>
            {arrivalFade > 0.3 && (
              <pointLight position={[0, 0, 0]} intensity={2 * arrivalFade} distance={1} color="#00eeff" />
            )}
            <Text
              position={[0, SEGMENT_SIZE / 2 + 0.08, 0]}
              fontSize={0.08}
              color="#ffffff"
              anchorX="center"
              anchorY="bottom"
              fontWeight="bold"
              fillOpacity={arrivalFade}
            >
              {seg.segmentIndex + 1}
            </Text>
          </group>
        )
      })}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* ACK PULSES (traveling from server back to client) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {ackList.filter(ack => now >= ack.spawnTime).map((ack) => {
        const x = CLIENT_X + ack.position * (SERVER_X - CLIENT_X)
        const y = -0.5 // Below the cable
        const arrivalFade = ack.arrived ? Math.max(0, 1 - (now - ack.arrivalTime) / 0.5) : 1
        const pulse = Math.sin(now * 4) * 0.3 + 0.7

        const isWin0 = ack.isWin0 || ack.rwnd === 0
        const ackColor = isWin0 ? '#ff4444' : '#ffcc00'
        const ackEmissive = isWin0 ? '#ff2222' : '#ffaa00'
        const ackGlowColor = isWin0 ? '#ff5555' : '#ffdd00'
        const ackLabelColor = isWin0 ? '#ff6666' : '#ffdd00'

        return (
          <group key={ack.id} position={[x, y, 0]}>
            {/* ACK sphere */}
            <mesh>
              <sphereGeometry args={[0.3, 32, 32]} />
              <meshPhongMaterial
                color={ackColor}
                emissive={ackEmissive}
                emissiveIntensity={1.0 * pulse}
                shininess={100}
                transparent
                opacity={arrivalFade}
              />
            </mesh>
            {/* Outer glow */}
            <mesh>
              <sphereGeometry args={[0.45, 32, 32]} />
              <meshBasicMaterial
                color={ackGlowColor}
                wireframe
                transparent
                opacity={0.4 * pulse * arrivalFade}
              />
            </mesh>
            {/* Light */}
            <pointLight position={[0, 0, 0]} intensity={4 * pulse * arrivalFade} distance={3} color={ackColor} />
            {/* WIN label */}
            <Text
              position={[0, -0.55, 0]}
              fontSize={0.16}
              color={ackLabelColor}
              anchorX="center"
              anchorY="top"
              fontWeight="bold"
              fillOpacity={arrivalFade}
            >
              {isWin0 ? 'WIN: 0 (STOP!)' : `WIN: ${ack.rwnd}`}
            </Text>
          </group>
        )
      })}

      {/* PERSIST TIMER (0-100% circular progress above Client when frozen) */}
      {frozen && persistTimerProgress > 0 && persistTimerProgress < 1 && (
        <group position={[CLIENT_X, 1.8, 0]}>
          {/* Background ring track */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.08, 16, 100, 0, Math.PI * 2]} />
            <meshBasicMaterial color="#ff6600" opacity={0.4} transparent />
          </mesh>
          {/* Progress ring - fills from 0% to 100% */}
          {(() => {
            const progress = persistTimerProgress
            const angle = Math.PI * 2 * progress
            const intensity = 0.5 + progress * 1.5
            return (
              <>
                <mesh rotation={[Math.PI / 2, 0, angle]}>
                  <torusGeometry args={[0.35, 0.08, 16, 100, 0, angle]} />
                  <meshBasicMaterial
                    color={progress > 0.7 ? '#ff3333' : '#ffaa00'}
                    opacity={intensity}
                    transparent
                  />
                </mesh>
                <pointLight
                  position={[0, 0, 0]}
                  intensity={intensity * 2}
                  distance={2}
                  color={progress > 0.7 ? '#ff3333' : '#ffaa00'}
                />
              </>
            )
          })()}
          {/* Percentage label */}
          <Text
            position={[0, 0, 0.35]}
            fontSize={0.12}
            color="#ffaa00"
            anchorX="center"
            anchorY="center"
            fontWeight="bold"
          >
            {Math.round(persistTimerProgress * 100)}%
          </Text>
          <Text
            position={[0, -0.55, 0]}
            fontSize={0.1}
            color="#ffaa00"
            anchorX="center"
            anchorY="center"
          >
            PERSIST TIMER
          </Text>
        </group>
      )}

      {/* ZERO WINDOW PROBE (yellow sphere traveling to server) */}
      {probePosition >= 0 && probePosition <= 1 && (
        (() => {
          const px = CLIENT_X + probePosition * (SERVER_X - CLIENT_X)
          const py = 0.4
          const probePulse = Math.sin(now * 6) * 0.3 + 0.7
          return (
            <group position={[px, py, 0]}>
              <mesh>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshPhongMaterial
                  color="#ffcc00"
                  emissive="#ffaa00"
                  emissiveIntensity={1.2 * probePulse}
                  shininess={100}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.22, 16, 16]} />
                <meshBasicMaterial color="#ffdd00" wireframe transparent opacity={0.5 * probePulse} />
              </mesh>
              <pointLight position={[0, 0, 0]} intensity={3 * probePulse} distance={2} color="#ffcc00" />
              <Text
                position={[0, 0.35, 0]}
                fontSize={0.1}
                color="#ffdd00"
                anchorX="center"
                anchorY="center"
                fontWeight="bold"
              >
                PROBE (1 Byte)
              </Text>
            </group>
          )
        })()
      )}

      {/* PROBE ACK (green/red sphere traveling back to client) */}
      {probeAckPosition >= 0 && probeAckPosition <= 1 && (
        (() => {
          const ax = CLIENT_X + probeAckPosition * (SERVER_X - CLIENT_X)
          const ay = -0.5
          const isRecovery = probeAckRwnd > 0
          const ackColor = isRecovery ? '#00ff66' : '#ff4444'
          const ackEmissive = isRecovery ? '#00dd44' : '#ff2222'
          const ackPulse = Math.sin(now * 4) * 0.3 + 0.7
          return (
            <group position={[ax, ay, 0]}>
              <mesh>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshPhongMaterial
                  color={ackColor}
                  emissive={ackEmissive}
                  emissiveIntensity={1.0 * ackPulse}
                  shininess={100}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshBasicMaterial color={ackColor} wireframe transparent opacity={0.4 * ackPulse} />
              </mesh>
              <pointLight position={[0, 0, 0]} intensity={4 * ackPulse} distance={3} color={ackColor} />
              <Text
                position={[0, -0.55, 0]}
                fontSize={0.14}
                color={ackColor}
                anchorX="center"
                anchorY="top"
                fontWeight="bold"
              >
                {isRecovery ? `ACK ${frozenAtOffset + 1} | WIN: ${probeAckRwnd}` : `ACK ${frozenAtOffset + 1} | WIN: 0`}
              </Text>
            </group>
          )
        })()
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* QUEUE LABEL */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Text
        position={[(getSegmentX(0) + getSegmentX(TOTAL_SEGMENTS - 1)) / 2, QUEUE_Y - 0.35, 0]}
        fontSize={0.11}
        color="#64748b"
        anchorX="center"
        anchorY="top"
      >
        Data Segments (1-20)
      </Text>
    </group>
  )
}
