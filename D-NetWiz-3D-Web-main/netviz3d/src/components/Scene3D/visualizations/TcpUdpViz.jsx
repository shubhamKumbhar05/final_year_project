import React, { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

// ═══════════════════════════════════════════════════════════════════
// TCP vs UDP VISUALIZATION
// Safety vs Speed - interactive comparison
// ═══════════════════════════════════════════════════════════════════

const TOTAL_PACKETS = 9
const PACKET_SIZE = 0.28 // Increased for bigger segment packets
const PACKET_GAP = 0.28

// Layout
const CLIENT_X = -5
const SERVER_X = 5
const STACK_Y = -1.2

// Speeds
const HANDSHAKE_SPEED = 0.006 // Slower handshake for smoothness
const TCP_PACKET_SPEED = 0.0035 // Slower TCP packet speed
const UDP_PACKET_SPEED = 0.018 // Faster UDP packet speed for animation
const ACK_SPEED = 0.005 // Slower ACK speed
const TCP_BATCH_SIZE = 3
const TCP_BATCH_STAGGER = 0.65 // Increased spacing between sent segment packets
const TCP_SEND_PAUSE = 0.7 // Pause before sending each batch
const UDP_SPAWN_INTERVAL = 0.25
const POST_ACK_PAUSE = 0.8

// Retransmission
const RETRANSMIT_TIMEOUT = 2.0

export default function TcpUdpViz({ isRunning = false, isTCP = true, onMessage, resetTrigger = 0, simulateLoss = false }) {
  const timeRef = useRef(0)
  const onMessageRef = useRef(onMessage)
  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  // Render state
  const [renderState, setRenderState] = useState({
    time: 0,
    // TCP state
    tcpPhase: 'idle',
    tcpHandshake: [],
    tcpFlying: [],
    tcpAcks: [],
    tcpDelivered: 0,
    tcpServerFlash: 0,
    tcpClientFlash: 0,
    tcpTimeout: -1,
    tcpRetransmit: null,
    tcpLostId: -1,
    // Phase 2: TCP state machine
    tcpClientState: 'CLOSED',
    tcpServerState: 'LISTEN',
    tcpHandshakeStep: 0,
    tcpConnectionEstablished: false,
    tcpEstablishedFlash: 0,
    // Phase 3: Sliding window
    tcpWindowNumber: 0,
    tcpTotalWindows: Math.ceil(TOTAL_PACKETS / TCP_BATCH_SIZE),
    tcpCumulativeAck: 0,
    tcpWindowSlideFlash: 0,
    // Phase 4: Loss tracking
    tcpLossCount: 0,
    tcpLossGhosts: [],
    tcpDupAckCount: 0,
    tcpRecoveredCount: 0,
    // UDP state
    udpPhase: 'idle',
    udpFlying: [],
    udpDelivered: 0,
    udpMissing: new Set(),
    udpServerFlash: 0,
    udpSkipPhase: 0,
    // Phase 3: UDP speed
    udpSentCount: 0,
    udpThroughput: 0,
    // Phase 4: UDP loss tracking
    udpLossCount: 0,
    udpLossGhosts: [],
    // Stats
    tcpLatency: 0,
    udpLatency: 0,
    tcpReliability: 100,
    udpReliability: 100,
  })

  // ── Ref-based animation state ──
  // TCP refs
  const tcpPhaseRef = useRef('idle')
  const tcpHandshakeRef = useRef([])
  const tcpFlyingRef = useRef([])
  const tcpAcksRef = useRef([])
  const tcpDeliveredRef = useRef(0)
  const tcpNextBatchStart = useRef(0)
  const tcpBurstCount = useRef(0)
  const tcpBurstArrived = useRef(0)
  const tcpAckSent = useRef(false)
  const tcpPauseUntil = useRef(0)
  const tcpServerFlash = useRef(0)
  const tcpClientFlash = useRef(0)
  const tcpCompleteShown = useRef(false)
  // Phase 2: TCP state machine tracking
  const tcpClientStateRef = useRef('CLOSED')
  const tcpServerStateRef = useRef('LISTEN')
  const tcpHandshakeStepRef = useRef(0)
  const tcpConnectionEstablishedRef = useRef(false)
  const tcpEstablishedFlashRef = useRef(0)
  // Phase 3: Sliding window tracking
  const tcpWindowNumber = useRef(0)
  const tcpCumulativeAck = useRef(0)
  const tcpWindowSlideFlash = useRef(0)
  // TCP loss
  const tcpLossTriggered = useRef(false)
  const tcpLostPacketId = useRef(-1)
  const tcpTimeoutStart = useRef(-1)
  const tcpTimeoutProgress = useRef(-1)
  const tcpRetransmitPacket = useRef(null)
  const tcpWaitingForRetransmitAck = useRef(false)
  const simulateLossRef = useRef(false)
  // Phase 4: Enhanced loss tracking
  const tcpLossCount = useRef(0)
  const tcpLossGhosts = useRef([])
  const tcpDupAckCount = useRef(0)
  const tcpRecoveredCount = useRef(0)

  // UDP refs
  const udpPhaseRef = useRef('idle')
  const udpFlyingRef = useRef([])
  const udpDeliveredRef = useRef(0)
  const udpNextSpawn = useRef(0)
  const udpSpawnIndex = useRef(0)
  const udpServerFlash = useRef(0)
  const udpMissingRef = useRef(new Set())
  const udpLossTriggered = useRef(false)
  const udpCompleteShown = useRef(false)
  // Phase 4: UDP multi-loss tracking
  const udpLossCount = useRef(0)
  const udpLossGhosts = useRef([])
  const udpSecondLossAllowed = useRef(false)
  // Phase 2: UDP skip handshake
  const udpSkipPhaseRef = useRef(0)
  const udpSkipTime = useRef(0)
  // Phase 3: UDP speed tracking
  const udpStreamStartTime = useRef(0)
  const udpSentCount = useRef(0)

  const msgShown = useRef(new Set())

  // Sync prop refs
  useEffect(() => { simulateLossRef.current = simulateLoss }, [simulateLoss])

  // Reset
  useEffect(() => {
    const resetAll = () => {
      timeRef.current = 0
      tcpPhaseRef.current = 'idle'
      tcpHandshakeRef.current = []
      tcpFlyingRef.current = []
      tcpAcksRef.current = []
      tcpDeliveredRef.current = 0
      tcpNextBatchStart.current = 0
      tcpBurstCount.current = 0
      tcpBurstArrived.current = 0
      tcpAckSent.current = false
      tcpPauseUntil.current = 0
      tcpServerFlash.current = 0
      tcpClientFlash.current = 0
      tcpCompleteShown.current = false
      tcpClientStateRef.current = 'CLOSED'
      tcpServerStateRef.current = 'LISTEN'
      tcpHandshakeStepRef.current = 0
      tcpConnectionEstablishedRef.current = false
      tcpEstablishedFlashRef.current = 0
      tcpWindowNumber.current = 0
      tcpCumulativeAck.current = 0
      tcpWindowSlideFlash.current = 0
      tcpLossTriggered.current = false
      tcpLostPacketId.current = -1
      tcpTimeoutStart.current = -1
      tcpTimeoutProgress.current = -1
      tcpRetransmitPacket.current = null
      tcpWaitingForRetransmitAck.current = false
      simulateLossRef.current = false
      tcpLossCount.current = 0
      tcpLossGhosts.current = []
      tcpDupAckCount.current = 0
      tcpRecoveredCount.current = 0
      udpPhaseRef.current = 'idle'
      udpFlyingRef.current = []
      udpDeliveredRef.current = 0
      udpNextSpawn.current = 0
      udpSpawnIndex.current = 0
      udpServerFlash.current = 0
      udpMissingRef.current = new Set()
      udpLossTriggered.current = false
      udpCompleteShown.current = false
      udpLossCount.current = 0
      udpLossGhosts.current = []
      udpSecondLossAllowed.current = false
      udpSkipPhaseRef.current = 0
      udpSkipTime.current = 0
      udpStreamStartTime.current = 0
      udpSentCount.current = 0
      msgShown.current.clear()
      setRenderState({
        time: 0, tcpPhase: 'idle', tcpHandshake: [], tcpFlying: [], tcpAcks: [],
        tcpDelivered: 0, tcpServerFlash: 0, tcpClientFlash: 0, tcpTimeout: -1,
        tcpRetransmit: null, tcpLostId: -1,
        tcpClientState: 'CLOSED', tcpServerState: 'LISTEN', tcpHandshakeStep: 0,
        tcpConnectionEstablished: false, tcpEstablishedFlash: 0,
        tcpWindowNumber: 0, tcpTotalWindows: Math.ceil(TOTAL_PACKETS / TCP_BATCH_SIZE),
        tcpCumulativeAck: 0, tcpWindowSlideFlash: 0,
        tcpLossCount: 0, tcpLossGhosts: [], tcpDupAckCount: 0, tcpRecoveredCount: 0,
        udpPhase: 'idle', udpFlying: [], udpDelivered: 0, udpMissing: new Set(),
        udpServerFlash: 0, udpSkipPhase: 0, udpSentCount: 0, udpThroughput: 0,
        udpLossCount: 0, udpLossGhosts: [],
        tcpLatency: 0, udpLatency: 0, tcpReliability: 100, udpReliability: 100,
      })
    }
    queueMicrotask(resetAll)
  }, [resetTrigger])

  // ═══════════════════════════════════════════════════════════════
  // ANIMATION LOOP
  // ═══════════════════════════════════════════════════════════════
  useFrame((_, delta) => {
    timeRef.current += delta
    const now = timeRef.current

    if (!isRunning) {
      setRenderState(prev => prev.time === now ? prev : { ...prev, time: now })
      return
    }

    const sendMsg = (key, text) => {
      if (onMessageRef.current && !msgShown.current.has(key)) {
        msgShown.current.add(key)
        onMessageRef.current(text)
      }
    }

    // ─── TCP ANIMATION ───
    if (isTCP) {
    const tcpPhase = tcpPhaseRef.current

    // Phase: Handshake
    if (tcpPhase === 'idle') {
      tcpPhaseRef.current = 'handshake-syn'
      tcpClientStateRef.current = 'SYN_SENT'
      tcpServerStateRef.current = 'LISTEN'
      tcpHandshakeStepRef.current = 1
      tcpHandshakeRef.current = [{
        id: 'syn', label: 'SYN', sublabel: 'SEQ=0', position: 0, direction: 1, arrived: false, color: '#60a5fa'
      }]
      sendMsg('tcp-syn', '[TCP] Step 1/3 - Client -> SYN (SEQ=0): Requesting connection...')
    }

    if (tcpPhase === 'handshake-syn') {
      const hs = tcpHandshakeRef.current
      const syn = hs.find(h => h.id === 'syn')
      if (syn && !syn.arrived) {
        syn.position = Math.min(syn.position + HANDSHAKE_SPEED, 1)
        if (syn.position >= 0.98) {
          syn.arrived = true
          syn.position = 1
          tcpServerFlash.current = 1
          tcpServerStateRef.current = 'SYN_RECEIVED'
          tcpHandshakeStepRef.current = 2
          tcpPhaseRef.current = 'handshake-synack'
          tcpHandshakeRef.current = [...hs, {
            id: 'synack', label: 'SYN-ACK', sublabel: 'SEQ=0 ACK=1', position: 1, direction: -1, arrived: false, color: '#34d399'
          }]
          sendMsg('tcp-synack', '[TCP] Step 2/3 - Server -> SYN-ACK (SEQ=0, ACK=1): Connection accepted, confirming...')
        }
      }
    }

    if (tcpPhase === 'handshake-synack') {
      const hs = tcpHandshakeRef.current
      const synack = hs.find(h => h.id === 'synack')
      if (synack && !synack.arrived) {
        synack.position = Math.max(synack.position - HANDSHAKE_SPEED, 0)
        if (synack.position <= 0.02) {
          synack.arrived = true
          synack.position = 0
          tcpClientFlash.current = 1
          tcpHandshakeStepRef.current = 3
          tcpPhaseRef.current = 'handshake-ack'
          tcpHandshakeRef.current = [...hs, {
            id: 'ack', label: 'ACK', sublabel: 'SEQ=1 ACK=1', position: 0, direction: 1, arrived: false, color: '#a78bfa'
          }]
          sendMsg('tcp-ack', '[TCP] Step 3/3 - Client -> ACK (SEQ=1, ACK=1): Final confirmation sent!')
        }
      }
    }

    if (tcpPhase === 'handshake-ack') {
      const hs = tcpHandshakeRef.current
      const ack = hs.find(h => h.id === 'ack')
      if (ack && !ack.arrived) {
        ack.position = Math.min(ack.position + HANDSHAKE_SPEED, 1)
        if (ack.position >= 0.98) {
          ack.arrived = true
          ack.position = 1
          tcpServerFlash.current = 1
          tcpClientStateRef.current = 'ESTABLISHED'
          tcpServerStateRef.current = 'ESTABLISHED'
          tcpConnectionEstablishedRef.current = true
          tcpEstablishedFlashRef.current = 1
          tcpPhaseRef.current = 'tcp-idle'
          tcpPauseUntil.current = now + 1.2
          sendMsg('tcp-connected', '[TCP] 3-Way Handshake COMPLETE! Connection ESTABLISHED - Virtual circuit ready for data.')
        }
      }
    }

    // TCP: Batch sending with sliding window
    if (tcpPhase === 'tcp-idle' && now >= tcpPauseUntil.current) {
      if (tcpDeliveredRef.current >= TOTAL_PACKETS) {
        tcpPhaseRef.current = 'tcp-complete'
      } else {
        // Add pause before sending batch
        if (!tcpPauseUntil.current || now >= tcpPauseUntil.current + TCP_SEND_PAUSE) {
          const start = tcpNextBatchStart.current
          const batchSize = Math.min(TCP_BATCH_SIZE, TOTAL_PACKETS - start)
          tcpWindowNumber.current++
          const totalWindows = Math.ceil(TOTAL_PACKETS / TCP_BATCH_SIZE)
          const newFlying = []
          for (let i = 0; i < batchSize; i++) {
            newFlying.push({
              id: `tcp-pkt-${start + i}`,
              index: start + i,
              seqNum: start + i + 1,
              position: 0,
              spawnTime: now + i * TCP_BATCH_STAGGER,
              arrived: false,
              arrivalTime: 0,
              lost: false,
            })
          }
          tcpFlyingRef.current = [...tcpFlyingRef.current, ...newFlying]
          tcpBurstCount.current = batchSize
          tcpBurstArrived.current = 0
          tcpAckSent.current = false
          tcpPhaseRef.current = 'tcp-sending'
          sendMsg('tcp-batch-' + start, '[TCP] Window ' + tcpWindowNumber.current + '/' + totalWindows + ': Sending SEQ ' + (start + 1) + '-' + (start + batchSize) + ' (Batch size: ' + batchSize + ')')
        }
      }
    }

    // Move TCP packets
    if (tcpPhase === 'tcp-sending' || tcpPhase === 'tcp-wait-ack') {
      const pkts = tcpFlyingRef.current
      for (let i = 0; i < pkts.length; i++) {
        const pkt = pkts[i]
        if (pkt.arrived || pkt.lost || now < pkt.spawnTime) continue
        pkt.position = Math.min(pkt.position + TCP_PACKET_SPEED, 1)

        // Simulate loss: first unarrived packet in window 2 and 4
        if (simulateLossRef.current && !tcpLossTriggered.current && pkt.position >= 0.45 && pkt.position < 0.55) {
          const windowNum = tcpWindowNumber.current
          // Lose a packet in window 2
          if (windowNum === 2 && tcpLossCount.current < 1) {
            tcpLossTriggered.current = true
            pkt.lost = true
            pkt.lostPosition = pkt.position
            tcpLostPacketId.current = pkt.index
            tcpLossCount.current++
            // Add loss ghost
            const ghostX = CLIENT_X + 0.8 + (SERVER_X - CLIENT_X - 1.6) * pkt.position
            tcpLossGhosts.current = [...tcpLossGhosts.current, {
              id: 'tcp-ghost-' + pkt.index,
              x: ghostX,
              packetNum: pkt.index + 1,
              time: now,
            }]
            sendMsg('tcp-loss-' + pkt.index, '[TCP] PACKET ' + (pkt.index + 1) + ' LOST at midpoint! (Loss #' + tcpLossCount.current + ') Server will send Duplicate ACKs...')
          }
        }

        if (pkt.position >= 0.98 && !pkt.arrived && !pkt.lost) {
          pkt.arrived = true
          pkt.arrivalTime = now
          pkt.position = 1
          tcpBurstArrived.current++
          tcpServerFlash.current = 1
        }
      }
      // Clean up old arrived packets
      tcpFlyingRef.current = pkts.filter(p => !(p.arrived && now - p.arrivalTime > 0.6) && !p.lost)
    }

    // TCP: All burst arrived (or some lost) -> send ACK or handle loss
    if (tcpPhase === 'tcp-sending') {
      const allDone = tcpFlyingRef.current.filter(p => now >= p.spawnTime).every(p => p.arrived || p.lost)
      if (allDone && tcpBurstCount.current > 0 && !tcpAckSent.current) {
        tcpAckSent.current = true

        // Check if any packet was lost
        if (tcpLostPacketId.current >= 0 && !tcpWaitingForRetransmitAck.current) {
          // Phase 4: Server detects gap, sends 3 Duplicate ACKs -> Fast Retransmit
          tcpDupAckCount.current = 3
          tcpPhaseRef.current = 'tcp-dup-acks'
          // Send 3 duplicate ACKs back to client
          const dupAckNum = tcpCumulativeAck.current > 0 ? tcpCumulativeAck.current : tcpNextBatchStart.current
          const dupAcks = [0, 1, 2].map((i) => ({
            id: `tcp-dupack-${now}-${i}`,
            position: 1,
            arrived: false,
            arrivalTime: 0,
            batchEnd: tcpNextBatchStart.current,
            ackNum: dupAckNum,
            isDupAck: true,
            dupIndex: i + 1,
            spawnDelay: i * 0.3,
            spawnTime: now + i * 0.3,
          }))
          tcpAcksRef.current = [...tcpAcksRef.current, ...dupAcks]
          sendMsg('tcp-dup-ack-start-' + tcpLostPacketId.current, '[TCP] Server detected gap! Sending 3 Duplicate ACKs (ACK=' + dupAckNum + ') to trigger Fast Retransmit...')
        } else {
          // Normal ACK with cumulative ACK number
          tcpDeliveredRef.current += tcpBurstArrived.current
          const cumAck = tcpNextBatchStart.current + tcpBurstCount.current
          tcpCumulativeAck.current = cumAck
          tcpPhaseRef.current = 'tcp-wait-ack'
          tcpAcksRef.current = [...tcpAcksRef.current, {
            id: `tcp-ack-${now}`, position: 1, arrived: false, arrivalTime: 0,
            batchEnd: cumAck, ackNum: cumAck
          }]
          sendMsg('tcp-ack-sent-' + tcpNextBatchStart.current, '[TCP] Server -> ACK=' + cumAck + ': Confirmed SEQ 1-' + cumAck + ' (' + tcpBurstArrived.current + ' packets in window)')
        }
      }
    }

    // Phase 4: Move duplicate ACKs and trigger fast retransmit
    if (tcpPhase === 'tcp-dup-acks') {
      const acks = tcpAcksRef.current
      let arrivedDupCount = 0
      for (let i = 0; i < acks.length; i++) {
        const ack = acks[i]
        if (!ack.isDupAck || ack.arrived) {
          if (ack.isDupAck && ack.arrived) arrivedDupCount++
          continue
        }
        if (now < ack.spawnTime) continue
        ack.position = Math.max(ack.position - ACK_SPEED, 0)
        if (ack.position <= 0.02) {
          ack.arrived = true
          ack.arrivalTime = now
          tcpClientFlash.current = 1
          arrivedDupCount++
          sendMsg('tcp-dupack-' + ack.dupIndex, '[TCP] Duplicate ACK #' + ack.dupIndex + '/3 received (ACK=' + ack.ackNum + ')')
        }
      }
      // After all 3 dup ACKs arrive -> fast retransmit (skip timeout!)
      if (arrivedDupCount >= 3) {
        const lostIdx = tcpLostPacketId.current
        tcpRetransmitPacket.current = {
          id: `tcp-retransmit-${lostIdx}`,
          index: lostIdx,
          seqNum: lostIdx + 1,
          position: 0,
          spawnTime: now,
          arrived: false,
          arrivalTime: 0,
          lost: false,
          isRetransmit: true,
        }
        tcpFlyingRef.current = [...tcpFlyingRef.current, tcpRetransmitPacket.current]
        tcpPhaseRef.current = 'tcp-retransmitting'
        tcpWaitingForRetransmitAck.current = true
        // Clean dup acks
        tcpAcksRef.current = tcpAcksRef.current.filter(a => !a.isDupAck)
        sendMsg('tcp-fast-retransmit-' + lostIdx, '[TCP] FAST RETRANSMIT! 3 Dup ACKs received -> Immediately resending Packet ' + (lostIdx + 1) + ' (no timeout wait!)')
      }
    }

    // TCP: Timeout -> retransmit (fallback if dup ACKs don't work)
    if (tcpPhase === 'tcp-timeout') {
      const elapsed = now - tcpTimeoutStart.current
      tcpTimeoutProgress.current = Math.min(elapsed / RETRANSMIT_TIMEOUT, 1)

      if (tcpTimeoutProgress.current >= 1) {
        // Retransmit the lost packet
        const lostIdx = tcpLostPacketId.current
        tcpRetransmitPacket.current = {
          id: `tcp-retransmit-${lostIdx}`,
          index: lostIdx,
          position: 0,
          spawnTime: now,
          arrived: false,
          arrivalTime: 0,
          lost: false,
          isRetransmit: true,
        }
        tcpFlyingRef.current = [...tcpFlyingRef.current, tcpRetransmitPacket.current]
        tcpPhaseRef.current = 'tcp-retransmitting'
        tcpWaitingForRetransmitAck.current = true
        sendMsg('tcp-retransmit-' + lostIdx, '[TCP] Retransmitting Packet ' + (lostIdx + 1) + '...')
      }
    }

    // TCP: Move retransmitted packet
    if (tcpPhase === 'tcp-retransmitting') {
      const pkts = tcpFlyingRef.current
      const retrans = pkts.find(p => p.isRetransmit && !p.arrived)
      if (retrans) {
        retrans.position = Math.min(retrans.position + TCP_PACKET_SPEED, 1)
        if (retrans.position >= 0.98) {
          retrans.arrived = true
          retrans.arrivalTime = now
          retrans.position = 1
          tcpServerFlash.current = 1
          tcpRecoveredCount.current++
          tcpDeliveredRef.current += tcpBurstArrived.current + 1
          // Send ACK for retransmitted packet with cumulative number
          const retransCumAck = tcpNextBatchStart.current + tcpBurstCount.current
          tcpCumulativeAck.current = retransCumAck
          tcpAcksRef.current = [...tcpAcksRef.current, {
            id: `tcp-retrans-ack-${now}`, position: 1, arrived: false, arrivalTime: 0,
            batchEnd: retransCumAck, ackNum: retransCumAck
          }]
          tcpPhaseRef.current = 'tcp-wait-ack'
          sendMsg('tcp-retrans-ack', '[TCP] Server -> ACK=' + retransCumAck + ': Retransmitted Packet ' + (tcpLostPacketId.current + 1) + ' received! Window slides...')
        }
      }
    }

    // Move TCP ACKs back
    const tcpAckArr = tcpAcksRef.current
    for (let i = 0; i < tcpAckArr.length; i++) {
      const ack = tcpAckArr[i]
      if (ack.arrived) continue
      ack.position = Math.max(ack.position - ACK_SPEED, 0)
      if (ack.position <= 0.02) {
        ack.arrived = true
        ack.arrivalTime = now
        tcpClientFlash.current = 1
        tcpNextBatchStart.current = ack.batchEnd
        tcpLostPacketId.current = -1
        tcpLossTriggered.current = false
        tcpWaitingForRetransmitAck.current = false
        tcpTimeoutStart.current = -1
        tcpTimeoutProgress.current = -1
        tcpRetransmitPacket.current = null
        tcpPhaseRef.current = 'tcp-idle'
        tcpPauseUntil.current = now + POST_ACK_PAUSE
        tcpWindowSlideFlash.current = 1
        sendMsg('tcp-ack-recv-' + ack.batchEnd, '[TCP] Client received ACK=' + ack.batchEnd + '. Window slides forward to SEQ ' + (ack.batchEnd + 1) + '...')
      }
    }
    tcpAcksRef.current = tcpAckArr.filter(a => !(a.arrived && now - a.arrivalTime > 0.5))

    // TCP complete
    if (tcpPhase === 'tcp-complete' && !tcpCompleteShown.current) {
      tcpCompleteShown.current = true
      sendMsg('tcp-done', '[TCP] All ' + TOTAL_PACKETS + ' packets delivered reliably! 100% data integrity.')
    }
    } // end isTCP

    // ─── UDP ANIMATION ───
    if (!isTCP) {
    const udpPhase = udpPhaseRef.current

    // Phase 2: UDP skip-handshake animation
    if (udpPhase === 'idle') {
      udpPhaseRef.current = 'udp-skip'
      udpSkipPhaseRef.current = 1
      udpSkipTime.current = now
      sendMsg('udp-skip-1', '[UDP] No handshake needed! No connection setup - just fire!')
    }

    if (udpPhase === 'udp-skip') {
      const elapsed = now - udpSkipTime.current
      if (elapsed >= 1.5) {
        udpSkipPhaseRef.current = 2
        udpPhaseRef.current = 'udp-streaming'
        udpNextSpawn.current = now
        udpSpawnIndex.current = 0
        udpStreamStartTime.current = now
        udpSentCount.current = 0
        sendMsg('udp-start', '[UDP] Streaming data immediately - no guarantees, maximum speed!')
      }
    }

    // UDP: Spawn packets continuously
    if (udpPhase === 'udp-streaming' && now >= udpNextSpawn.current && udpSpawnIndex.current < TOTAL_PACKETS) {
      const idx = udpSpawnIndex.current
      udpFlyingRef.current = [...udpFlyingRef.current, {
        id: `udp-pkt-${idx}`,
        index: idx,
        position: 0,
        spawnTime: now,
        arrived: false,
        arrivalTime: 0,
        lost: false,
      }]
      udpSpawnIndex.current++
      udpSentCount.current++
      udpNextSpawn.current = now + UDP_SPAWN_INTERVAL
    }

    // Move UDP packets
    const udpPkts = udpFlyingRef.current
    for (let i = 0; i < udpPkts.length; i++) {
      const pkt = udpPkts[i]
      if (pkt.arrived || pkt.lost) continue
      pkt.position = Math.min(pkt.position + UDP_PACKET_SPEED, 1)

      // Phase 4: Multi-loss simulation — lose packets at ~33% and ~66% through stream
      if (simulateLossRef.current && pkt.position >= 0.45 && pkt.position < 0.55) {
        const shouldLose = (!udpLossTriggered.current && pkt.index >= 2 && pkt.index <= 3) ||
          (udpLossTriggered.current && !udpSecondLossAllowed.current && pkt.index >= 5 && pkt.index <= 6)
        if (shouldLose) {
          if (!udpLossTriggered.current) udpLossTriggered.current = true
          else udpSecondLossAllowed.current = true
          pkt.lost = true
          udpLossCount.current++
          udpMissingRef.current = new Set([...udpMissingRef.current, pkt.index])
          // Add loss ghost
          const ghostX = CLIENT_X + 0.8 + (SERVER_X - CLIENT_X - 1.6) * pkt.position
          udpLossGhosts.current = [...udpLossGhosts.current, {
            id: 'udp-ghost-' + pkt.index,
            x: ghostX,
            packetNum: pkt.index + 1,
            time: now,
          }]
          sendMsg('udp-loss-' + pkt.index, '[UDP] Packet ' + (pkt.index + 1) + ' LOST! (Loss #' + udpLossCount.current + ') No retransmission — sender keeps firing!')
        }
      }

      if (pkt.position >= 0.98 && !pkt.arrived && !pkt.lost) {
        pkt.arrived = true
        pkt.arrivalTime = now
        pkt.position = 1
        udpDeliveredRef.current++
        udpServerFlash.current = 1
      }
    }
    udpFlyingRef.current = udpPkts.filter(p => !(p.arrived && now - p.arrivalTime > 0.6) && !p.lost)

    // UDP complete
    if (udpPhase === 'udp-streaming' && udpSpawnIndex.current >= TOTAL_PACKETS && udpFlyingRef.current.filter(p => !p.arrived && !p.lost).length === 0) {
      if (!udpCompleteShown.current) {
        udpCompleteShown.current = true
        const missing = udpMissingRef.current.size
        if (missing > 0) {
          sendMsg('udp-done', '[UDP] Streaming complete! ' + (TOTAL_PACKETS - missing) + '/' + TOTAL_PACKETS + ' received. ' + missing + ' packet(s) MISSING - data corrupted!')
        } else {
          sendMsg('udp-done', '[UDP] Streaming complete! All ' + TOTAL_PACKETS + ' packets received.')
        }
        udpPhaseRef.current = 'udp-complete'
      }
    }
    } // end !isTCP

    // Fade flashes
    if (tcpServerFlash.current > 0) tcpServerFlash.current = Math.max(tcpServerFlash.current - delta * 2.5, 0)
    if (tcpClientFlash.current > 0) tcpClientFlash.current = Math.max(tcpClientFlash.current - delta * 2.5, 0)
    if (udpServerFlash.current > 0) udpServerFlash.current = Math.max(udpServerFlash.current - delta * 2.5, 0)
    if (tcpEstablishedFlashRef.current > 0) tcpEstablishedFlashRef.current = Math.max(tcpEstablishedFlashRef.current - delta * 0.8, 0)
    if (tcpWindowSlideFlash.current > 0) tcpWindowSlideFlash.current = Math.max(tcpWindowSlideFlash.current - delta * 1.5, 0)

    // ── Stats calculation ──
    const tcpTotalSent = tcpNextBatchStart.current
    const udpMissCount = udpMissingRef.current.size
    const tcpRel = 100
    const udpRel = udpSpawnIndex.current > 0 ? Math.round(((udpSpawnIndex.current - udpMissCount) / udpSpawnIndex.current) * 100) : 100

    // ── Sync render state ──
    setRenderState({
      time: now,
      tcpPhase: tcpPhaseRef.current,
      tcpHandshake: [...tcpHandshakeRef.current],
      tcpFlying: [...tcpFlyingRef.current],
      tcpAcks: [...tcpAcksRef.current],
      tcpDelivered: tcpDeliveredRef.current,
      tcpServerFlash: tcpServerFlash.current,
      tcpClientFlash: tcpClientFlash.current,
      tcpTimeout: tcpTimeoutProgress.current,
      tcpRetransmit: tcpRetransmitPacket.current,
      tcpLostId: tcpLostPacketId.current,
      tcpClientState: tcpClientStateRef.current,
      tcpServerState: tcpServerStateRef.current,
      tcpHandshakeStep: tcpHandshakeStepRef.current,
      tcpConnectionEstablished: tcpConnectionEstablishedRef.current,
      tcpEstablishedFlash: tcpEstablishedFlashRef.current,
      tcpWindowNumber: tcpWindowNumber.current,
      tcpTotalWindows: Math.ceil(TOTAL_PACKETS / TCP_BATCH_SIZE),
      tcpCumulativeAck: tcpCumulativeAck.current,
      tcpWindowSlideFlash: tcpWindowSlideFlash.current,
      tcpLossCount: tcpLossCount.current,
      tcpLossGhosts: [...tcpLossGhosts.current],
      tcpDupAckCount: tcpDupAckCount.current,
      tcpRecoveredCount: tcpRecoveredCount.current,
      udpPhase: udpPhaseRef.current,
      udpFlying: [...udpFlyingRef.current],
      udpDelivered: udpDeliveredRef.current,
      udpMissing: new Set(udpMissingRef.current),
      udpServerFlash: udpServerFlash.current,
      udpSkipPhase: udpSkipPhaseRef.current,
      udpSentCount: udpSentCount.current,
      udpLossCount: udpLossCount.current,
      udpLossGhosts: [...udpLossGhosts.current],
      udpThroughput: udpStreamStartTime.current > 0 && now > udpStreamStartTime.current
        ? Math.round(udpSentCount.current / (now - udpStreamStartTime.current) * 10) / 10
        : 0,
      tcpLatency: tcpPhaseRef.current === 'tcp-complete' ? 0 : (tcpTotalSent > 0 ? Math.round(tcpTotalSent / TOTAL_PACKETS * 100) : 0),
      udpLatency: udpSpawnIndex.current > 0 ? Math.round(udpSpawnIndex.current / TOTAL_PACKETS * 100) : 0,
      tcpReliability: tcpRel,
      udpReliability: udpRel,
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  const {
    time,
    tcpHandshake,
    tcpFlying,
    tcpAcks,
    tcpDelivered,
    tcpServerFlash: tcpSFlash,
    tcpClientFlash: tcpCFlash,
    tcpTimeout,
    udpFlying,
    udpDelivered,
    udpMissing,
    udpServerFlash: udpSFlash,
    tcpLossCount: tcpLostCount,
    tcpLossGhosts: tcpGhosts,
    tcpRecoveredCount: tcpRecovered,
    udpSkipPhase,
    udpLossGhosts: udpGhosts,
    tcpEstablishedFlash,
    tcpConnectionEstablished
  } = renderState

  const pulse = 0.5 + Math.sin(time * 3) * 0.5

  return (
    <group position={[0, 0.3, 0]}>

      {/* ═══ TCP MODE ═══ */}
      {isTCP && (
        <group position={[0, 0, 0]}>

          {/* Established celebration flash */}
          {tcpEstablishedFlash > 0 && (
            <group position={[0, 1.8, 0]}>
              <Text position={[0, 0, 0]} fontSize={0.28} color="#34d399" anchorX="center" fontWeight="bold">
                CONNECTION ESTABLISHED
              </Text>
              <pointLight position={[0, 0, 0]} intensity={tcpEstablishedFlash * 5} distance={8} color="#34d399" />
            </group>
          )}

          // ...existing code...

          // ...existing code...

          // ...existing code...

          {/* Client Node */}
          <group position={[CLIENT_X, 0.5, 0]}>
            <mesh>
              <boxGeometry args={[1.2, 1.6, 0.8]} />
              <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.3 + tcpCFlash * 0.7} transparent opacity={0.75} />
            </mesh>
            <Text position={[0, -1.2, 0]} fontSize={0.22} color="#67e8f9" anchorX="center" fontWeight="bold">
              CLIENT
            </Text>
            // ...existing code...
            {/* Client data stack (unsent - inside cube) */}
            {Array.from({ length: Math.max(0, TOTAL_PACKETS - tcpDelivered) }, (_, i) => (
              <mesh key={`tcp-stack-${i}`} position={[0, -0.55 + i * 0.12, 0.2]}>
                <boxGeometry args={[0.7, 0.08, 0.15]} />
                <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>

          {/* Server Node */}
          <group position={[SERVER_X, 0.5, 0]}>
            <mesh>
              <boxGeometry args={[1.2, 1.6, 0.8]} />
              <meshStandardMaterial color="#ca8a04" emissive="#a16207" emissiveIntensity={0.3 + tcpSFlash * 0.7} transparent opacity={0.75} />
            </mesh>
            <Text position={[0, -1.2, 0]} fontSize={0.22} color="#fde047" anchorX="center" fontWeight="bold">
              SERVER
            </Text>
            // ...existing code...
            {/* Received stack (inside cube) */}
            {Array.from({ length: tcpDelivered }, (_, i) => (
              <mesh key={`tcp-recv-${i}`} position={[0, -0.55 + i * 0.12, 0.35]}>
                <boxGeometry args={[0.75, 0.09, 0.12]} />
                <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={1.2} />
              </mesh>
            ))}
            <Text position={[0, 0.65, 0.41]} fontSize={0.14} color="#fde047" anchorX="center" fontWeight="bold">
              {tcpDelivered}/{TOTAL_PACKETS}
            </Text>
          </group>

          {/* Connection tunnel (appears after handshake) */}
          {tcpConnectionEstablished && (
            <group>
              {/* Solid glowing pipe */}
              <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.06, 0.06, SERVER_X - CLIENT_X - 1.4, 16]} />
                <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={0.6} transparent opacity={0.7} />
              </mesh>
              {/* Outer glow tube */}
              <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.12, 0.12, SERVER_X - CLIENT_X - 1.4, 16]} />
                <meshStandardMaterial color="#1e40af" emissive="#3b82f6" emissiveIntensity={0.3} transparent opacity={0.15} />
              </mesh>
              <Text position={[0, 0.85, 0]} fontSize={0.1} color="#60a5fa" anchorX="center">
                VIRTUAL CIRCUIT
              </Text>
            </group>
          )}

          {/* Pre-connection dashed line (during handshake) */}
          {!tcpConnectionEstablished && (
            <>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                <mesh key={`tcp-dash-${i}`} position={[CLIENT_X + 1.4 + i * 1.05, 0.5, 0]}>
                  <boxGeometry args={[0.55, 0.015, 0.015]} />
                  <meshStandardMaterial color="#3b82f6" emissive="#60a5fa" emissiveIntensity={0.2} transparent opacity={0.25} />
                </mesh>
              ))}
              <Text position={[0, 0.85, 0]} fontSize={0.1} color="#475569" anchorX="center">
                ESTABLISHING CONNECTION...
              </Text>
            </>
          )}

          {/* Handshake pulses with sublabels */}
          {tcpHandshake.map(hs => {
            if (hs.arrived) return null
            const x = CLIENT_X + 0.8 + (SERVER_X - CLIENT_X - 1.6) * hs.position
            return (
              <group key={hs.id} position={[x, 0.5, 0]}>
                <mesh>
                  <sphereGeometry args={[0.22, 16, 16]} />
                  <meshStandardMaterial color={hs.color} emissive={hs.color} emissiveIntensity={1.2} />
                </mesh>
                {/* Main label */}
                <Text position={[0, 0.45, 0]} fontSize={0.19} color={hs.color} anchorX="center" fontWeight="bold">
                  {hs.label}
                </Text>
                {/* Seq/Ack sublabel */}
                {hs.sublabel && (
                  <Text position={[0, -0.38, 0]} fontSize={0.13} color={hs.color} anchorX="center">
                    {hs.sublabel}
                  </Text>
                )}
                <pointLight position={[0, 0, 0]} intensity={2.5} distance={2} color={hs.color} />
                {/* Trail glow */}
                <mesh>
                  <sphereGeometry args={[0.25, 8, 8]} />
                  <meshBasicMaterial color={hs.color} transparent opacity={0.15} />
                </mesh>
              </group>
            )
          })}

          {/* Flying TCP packets with sequence numbers */}
          {tcpFlying.map(pkt => {
            if (pkt.arrived || pkt.lost || time < pkt.spawnTime) return null
            const x = CLIENT_X + 0.8 + (SERVER_X - CLIENT_X - 1.6) * pkt.position
            return (
              <group key={pkt.id} position={[x, 0.5, 0]}>
                <mesh>
                  <boxGeometry args={[PACKET_SIZE * 1.45, PACKET_SIZE * 1.45, PACKET_SIZE * 1.45]} />
                  <meshStandardMaterial
                    color={pkt.isRetransmit ? '#f59e0b' : '#60a5fa'}
                    emissive={pkt.isRetransmit ? '#ea580c' : '#3b82f6'}
                    emissiveIntensity={0.8}
                  />
                </mesh>
                <Text position={[0, 0.38, 0]} fontSize={0.13} color="#e0f2fe" anchorX="center" fontWeight="bold">
                  {pkt.isRetransmit ? 'RESEND' : 'SEQ=' + (pkt.seqNum || pkt.index + 1)}
                </Text>
                <Text position={[0, -0.36, 0]} fontSize={0.1} color="#93c5fd" anchorX="center">
                  {'#' + (pkt.index + 1)}
                </Text>
              </group>
            )
          })}

          {/* TCP ACK pulses with cumulative ACK number */}
          {tcpAcks.map(ack => {
            if (ack.arrived) return null
            if (ack.isDupAck && time < ack.spawnTime) return null
            const x = CLIENT_X + 0.8 + (SERVER_X - CLIENT_X - 1.6) * ack.position
            const isDup = ack.isDupAck
            return (
              <group key={ack.id} position={[x, isDup ? 0.5 + (ack.dupIndex - 2) * 0.25 : 0.5, 0]}>
                <mesh>
                  <sphereGeometry args={[isDup ? 0.14 : 0.18, 16, 16]} />
                  <meshStandardMaterial
                    color={isDup ? '#f97316' : '#34d399'}
                    emissive={isDup ? '#ea580c' : '#10b981'}
                    emissiveIntensity={1.2}
                  />
                </mesh>
                <Text position={[0, 0.3, 0]} fontSize={isDup ? 0.12 : 0.15} color={isDup ? '#fdba74' : '#6ee7b7'} anchorX="center" fontWeight="bold">
                  {isDup ? 'DUP ACK #' + ack.dupIndex : 'ACK=' + (ack.ackNum || '')}
                </Text>
                {!isDup && (
                  <Text position={[0, -0.32, 0]} fontSize={0.11} color="#a7f3d0" anchorX="center">
                    {'Confirmed 1-' + (ack.ackNum || '')}
                  </Text>
                )}
                <pointLight position={[0, 0, 0]} intensity={isDup ? 1.5 : 2} distance={1.5} color={isDup ? '#f97316' : '#34d399'} />
              </group>
            )
          })}

          {/* TCP Timeout ring */}
          {tcpTimeout >= 0 && tcpTimeout < 1 && (
            <group position={[CLIENT_X, 2.5, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.4, 0.09, 16, 100, 0, Math.PI * 2]} />
                <meshBasicMaterial color="#ff6600" opacity={0.4} transparent />
              </mesh>
              {(() => {
                const progress = tcpTimeout
                const angle = Math.PI * 2 * progress
                const intensity = 0.5 + progress * 1.5
                return (
                  <>
                    <mesh rotation={[Math.PI / 2, 0, angle]}>
                      <torusGeometry args={[0.4, 0.09, 16, 100, 0, angle]} />
                      <meshBasicMaterial color={progress > 0.7 ? '#ff3333' : '#ffaa00'} opacity={intensity} transparent />
                    </mesh>
                    <pointLight position={[0, 0, 0]} intensity={intensity * 2} distance={2.5} color={progress > 0.7 ? '#ff3333' : '#ffaa00'} />
                  </>
                )
              })()}
              <Text position={[0, 0, 0.4]} fontSize={0.14} color="#ffaa00" anchorX="center" fontWeight="bold">
                {Math.round(tcpTimeout * 100)}%
              </Text>
              <Text position={[0, -0.6, 0]} fontSize={0.11} color="#ffaa00" anchorX="center">
                TIMEOUT
              </Text>
            </group>
          )}

          {/* Phase 4: Danger Zone (visible when loss is enabled) */}
          {simulateLoss && tcpConnectionEstablished && (
            <group position={[0, 0.5, 0.3]}>
              <mesh>
                <planeGeometry args={[2.5, 0.8]} />
                <meshBasicMaterial color="#7f1d1d" transparent opacity={0.15 + pulse * 0.1} />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.1} color="#fca5a5" anchorX="center">
                DANGER ZONE
              </Text>
            </group>
          )}

          {/* Phase 4: Loss Ghost Markers */}
          {tcpGhosts.map(ghost => (
            <group key={ghost.id} position={[ghost.x, 0.5, 0]}>
              {/* Ghost outline */}
              <mesh>
                <sphereGeometry args={[0.18, 16, 16]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.25 + pulse * 0.15} wireframe />
              </mesh>
              {/* X mark */}
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.25, 0.04, 0.04]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.25, 0.04, 0.04]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
              </mesh>
              <Text position={[0, -0.3, 0]} fontSize={0.07} color="#fca5a5" anchorX="center">
                {'PKT ' + ghost.packetNum + ' LOST'}
              </Text>
            </group>
          ))}

          {/* Phase 4: Loss & Recovery Counter */}
          {tcpLostCount > 0 && (
            <group position={[CLIENT_X, -2.6, 0]}>
              <mesh>
                <planeGeometry args={[2.4, 0.7]} />
                <meshBasicMaterial color="#1e293b" transparent opacity={0.9} />
              </mesh>
              <Text position={[0, 0.12, 0.01]} fontSize={0.12} color="#ef4444" anchorX="center" fontWeight="bold">
                {'LOST: ' + tcpLostCount + '  |  RECOVERED: ' + tcpRecovered}
              </Text>
              <Text position={[0, -0.12, 0.01]} fontSize={0.09} color="#6ee7b7" anchorX="center">
                {tcpRecovered >= tcpLostCount ? 'All losses recovered!' : 'Fast Retransmit active...'}
              </Text>
            </group>
          )}

        </group>
      )}

      {/* ═══ UDP MODE ═══ */}
      {!isTCP && (
        <group position={[0, 0, 0]}>

          {/* Skip-Handshake Phase Visual */}
          {udpSkipPhase === 1 && (
            <group position={[0, 2.0, 0]}>
              {/* Crossed-out handshake text */}
              <Text position={[0, 0, 0]} fontSize={0.26} color="#ef4444" anchorX="center" fontWeight="bold">
                NO HANDSHAKE NEEDED
              </Text>
              <Text position={[0, -0.32, 0]} fontSize={0.14} color="#fbbf24" anchorX="center">
                Skipping connection setup... sending immediately!
              </Text>
              {/* X mark over center */}
              <mesh position={[0, -0.65, 0]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[1.0, 0.05, 0.05]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
              </mesh>
              <mesh position={[0, -0.65, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[1.0, 0.05, 0.05]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
              </mesh>
              <pointLight position={[0, 0, 0]} intensity={3} distance={6} color="#f59e0b" />
            </group>
          )}

          {/* Client Node */}
          <group position={[CLIENT_X, 0.5, 0]}>
            <mesh>
              <boxGeometry args={[1.2, 1.6, 0.8]} />
              <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.3} transparent opacity={0.75} />
            </mesh>
            <Text position={[0, -1.2, 0]} fontSize={0.22} color="#67e8f9" anchorX="center" fontWeight="bold">
              CLIENT
            </Text>
            // ...existing code...
            {/* Client data stack (inside cube) */}
            {Array.from({ length: Math.max(0, TOTAL_PACKETS - (renderState.udpPhase === 'udp-complete' ? TOTAL_PACKETS : udpFlying.length + udpDelivered)) }, (_, i) => (
              <mesh key={`udp-stack-${i}`} position={[0, -0.55 + i * 0.12, 0.2]}>
                <boxGeometry args={[0.7, 0.08, 0.15]} />
                <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>

          {/* Server Node */}
          <group position={[SERVER_X, 0.5, 0]}>
            <mesh>
              <boxGeometry args={[1.2, 1.6, 0.8]} />
              <meshStandardMaterial color="#ca8a04" emissive="#a16207" emissiveIntensity={0.3 + udpSFlash * 0.7} transparent opacity={0.75} />
            </mesh>
            <Text position={[0, -1.2, 0]} fontSize={0.22} color="#fde047" anchorX="center" fontWeight="bold">
              SERVER
            </Text>
            // ...existing code...
            {/* Received stack with gaps for missing (inside cube) */}
            {Array.from({ length: TOTAL_PACKETS }, (_, i) => {
              if (i >= udpDelivered + udpMissing.size) return null
              const isMissing = udpMissing.has(i)
              return (
                <mesh key={`udp-recv-${i}`} position={[0, -0.55 + i * 0.12, 0.35]}>
                  <boxGeometry args={[0.75, 0.09, 0.12]} />
                  <meshStandardMaterial
                    color={isMissing ? '#fca5a5' : '#fef08a'}
                    emissive={isMissing ? '#ef4444' : '#facc15'}
                    emissiveIntensity={isMissing ? 1.0 + pulse * 0.5 : 1.2}
                    transparent
                    opacity={isMissing ? 0.5 : 1}
                  />
                </mesh>
              )
            })}
            <Text position={[0, 0.65, 0.41]} fontSize={0.14} color="#fde047" anchorX="center" fontWeight="bold">
              {udpDelivered}/{TOTAL_PACKETS}
            </Text>
          </group>

          {/* Connection line (dashed - no persistent connection) */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <mesh key={`udp-line-${i}`} position={[CLIENT_X + 1.4 + i * 1.05, 0.5, 0]}>
              <boxGeometry args={[0.55, 0.025, 0.025]} />
              <meshStandardMaterial color="#f59e0b" emissive="#fbbf24" emissiveIntensity={0.3} transparent opacity={0.35} />
            </mesh>
          ))}
          <Text position={[0, 0.85, 0]} fontSize={0.1} color="#f59e0b" anchorX="center">
            NO CONNECTION (FIRE AND FORGET)
          </Text>

          {/* Flying UDP packets with unordered variation */}
          {udpFlying.map(pkt => {
            if (pkt.arrived || pkt.lost) return null
            const x = CLIENT_X + 0.8 + (SERVER_X - CLIENT_X - 1.6) * pkt.position
            // Slight Y offset for unordered feel
            const yOff = Math.sin(pkt.index * 2.7 + 0.5) * 0.15
            return (
              <group key={pkt.id} position={[x, 0.5 + yOff, 0]}>
                <mesh>
                  <sphereGeometry args={[PACKET_SIZE * 0.7, 12, 12]} />
                  <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
                </mesh>
                <Text position={[0, 0.32, 0]} fontSize={0.09} color="#fef3c7" anchorX="center">
                  {pkt.index + 1}
                </Text>
              </group>
            )
          })}

          {/* Streaming speed indicator */}
          {renderState.udpPhase === 'udp-streaming' && (
            <group position={[0, 2.0, 0]}>
              // ...existing code...
            </group>
          )}

          // ...existing code...

          {/* Missing data warning */}
          {udpMissing.size > 0 && (
            <group position={[SERVER_X, 2.5, 0]}>
              <Text position={[0, 0, 0]} fontSize={0.18} color="#ef4444" anchorX="center" fontWeight="bold">
                {udpMissing.size} MISSING
              </Text>
              <Text position={[0, -0.25, 0]} fontSize={0.11} color="#fca5a5" anchorX="center">
                Data permanently lost!
              </Text>
            </group>
          )}

          {/* Phase 4: Danger Zone for UDP */}
          {simulateLoss && renderState.udpPhase === 'udp-streaming' && (
            <group position={[0, 0.5, 0.3]}>
              <mesh>
                <planeGeometry args={[2.5, 0.8]} />
                <meshBasicMaterial color="#7f1d1d" transparent opacity={0.15 + pulse * 0.1} />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.1} color="#fca5a5" anchorX="center">
                DANGER ZONE
              </Text>
            </group>
          )}

          {/* Phase 4: UDP Loss Ghost Markers */}
          {udpGhosts.map(ghost => (
            <group key={ghost.id} position={[ghost.x, 0.5, 0]}>
              <mesh>
                <sphereGeometry args={[0.14, 16, 16]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.25 + pulse * 0.15} wireframe />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.2, 0.03, 0.03]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.2, 0.03, 0.03]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
              </mesh>
              <Text position={[0, -0.25, 0]} fontSize={0.06} color="#fca5a5" anchorX="center">
                {'#' + ghost.packetNum + ' GONE'}
              </Text>
            </group>
          ))}

          {/* Phase 4: UDP Damage Counter */}
          // UDP loss counter and recovery text removed for clean look

        </group>
      )}

      {/* Ambient scene lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 5, 3]} intensity={1.5} distance={15} color={isTCP ? '#e0f2fe' : '#fef3c7'} />
    </group>
  )
}
