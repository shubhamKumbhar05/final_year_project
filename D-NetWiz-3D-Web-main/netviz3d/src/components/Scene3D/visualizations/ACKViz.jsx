import React from 'react'
import { useFrame } from '@react-three/fiber'
import { useRef, useState, useEffect } from 'react'
import { Text } from '@react-three/drei'

const MAX_SEGMENTS = 5 // Limit transmission to 5 segments for clean visualization

function ACKViz({ isRunning = false, onMessage, resetTrigger = 0, packetLossEnabled = false, ackLossEnabled = false }) {
  const groupRef = useRef(null)
  const timeRef = useRef(0)
  
  // Animation state - STOP-AND-WAIT protocol
  const [nextSequenceNumber, setNextSequenceNumber] = useState(1) // Track which segment to send next
  const [currentSegment, setCurrentSegment] = useState(null) // Segment currently being transmitted
  const [ackReceived, setAckReceived] = useState([]) // ACK packets in transit
  const [serverFlashIntensity, setServerFlashIntensity] = useState(0) // Server glow
  const [animationTime, setAnimationTime] = useState(0) // For pulsing
  const [successAnimations, setSuccessAnimations] = useState(new Map()) // Ghost clearing animation
  const [removingSegment, setRemovingSegment] = useState(null) // Segment being removed with animation
  const [removalStartTime, setRemovalStartTime] = useState(0) // When removal animation started
  
  // Phase 4: Timeout & Retransmission (packetLossEnabled comes from prop)
  const [retransmittingSegments, setRetransmittingSegments] = useState([]) // Segments being retransmitted
  const [timeoutTimers, setTimeoutTimers] = useState(new Map()) // Timeout progress per segment (0-1)
  
  // Phase 5: Transmission limit tracking
  const [transmissionComplete, setTransmissionComplete] = useState(false) // Flag when all segments sent
  const completionMessageShownRef = useRef(false) // Ensure completion message shown only once
  
  // Phase 6: Lost ACK & Duplicate Handling
  const [duplicateDetectedSegments, setDuplicateDetectedSegments] = useState([]) // Duplicate packets showing discard animation
  const lastReceivedSeqRef = useRef(new Map()) // Server tracks last received sequence per segment ID
  const ackLossMessageShownRef = useRef(new Set()) // Track ACK loss messages shown
  const duplicateRetransmitCountRef = useRef(new Map()) // Track how many times a segment was retransmitted due to ACK loss
  const retransmitCountRef = useRef(new Map()) // Track how many times each segment has been retransmitted (attempt number)
  const pendingRecoveryAcksRef = useRef([]) // ACKs waiting to be sent after removal animation
  
  // Refs for tracking
  const processedSegmentsRef = useRef(new Set()) // Segments that generated ACKs
  const messageShownRef = useRef(new Set()) // Segments that showed messages
  const lastClearedTimeRef = useRef(0) // Track when last segment was cleared
  const timeoutStartRef = useRef(new Map()) // When timeout timer started for each segment - stores { startTime, seqNum }
  const lostSegmentsRef = useRef(new Set()) // Which segments have been lost once already
  const statusMessageShownRef = useRef(new Set()) // Track which status messages were shown to avoid duplicates
  const pendingAckMessageShownRef = useRef(new Set()) // Track when pending ACK messages are shown

  // Handle reset
  useEffect(() => {
    // Defer state updates to prevent cascading renders
    const resetStates = () => {
      // Reset time reference
      timeRef.current = 0
      
      // Reset all animation state
      setNextSequenceNumber(1)
      setCurrentSegment(null)
      setAckReceived([])
      setSuccessAnimations(new Map())
      setRemovingSegment(null)
      setRemovalStartTime(0)
      setRetransmittingSegments([])
      setTimeoutTimers(new Map())
      setTransmissionComplete(false)
      setAnimationTime(0)
      setServerFlashIntensity(0)
      setDuplicateDetectedSegments([])
      
      // Reset all refs
      completionMessageShownRef.current = false
      lastReceivedSeqRef.current.clear()
      ackLossMessageShownRef.current.clear()
      duplicateRetransmitCountRef.current.clear()
      retransmitCountRef.current.clear()
      pendingRecoveryAcksRef.current = []
      processedSegmentsRef.current.clear()
      messageShownRef.current.clear()
      lastClearedTimeRef.current = 0
      timeoutStartRef.current.clear()
      lostSegmentsRef.current.clear()
      statusMessageShownRef.current.clear()
      pendingAckMessageShownRef.current.clear()
    }
    
    // Queue state updates to next tick to prevent cascading renders
    queueMicrotask(resetStates)
  }, [resetTrigger])

  useFrame((state, delta) => {
    timeRef.current += delta
    setAnimationTime(timeRef.current)
    
    if (!isRunning) return

    // ═══════════════════════════════════════════════════════════════════
    // STEP 1: Send next segment if we're not waiting for an ACK
    // Phase 5: Respect MAX_SEGMENTS limit to prevent continuous cycling
    // ═══════════════════════════════════════════════════════════════════
    if (currentSegment === null && nextSequenceNumber > 0 && nextSequenceNumber <= MAX_SEGMENTS) {
      // Ready to send new segment - wait until pause time has elapsed
      if (timeRef.current >= lastClearedTimeRef.current) {
        const seqNum = String(nextSequenceNumber).padStart(3, '0')
        const newSegment = {
          id: `seg-${nextSequenceNumber}`,
          position: 0,
          seqNum: seqNum,
          spawnTime: timeRef.current
        }
        setCurrentSegment(newSegment)
        setNextSequenceNumber(nextSequenceNumber + 1)
        
        // Send status message when next segment is ready (after recovery pause)
        if (onMessage && !statusMessageShownRef.current.has(`sending-${seqNum}`)) {
          statusMessageShownRef.current.add(`sending-${seqNum}`)
          onMessage(`📤 [CLIENT] Sending Data Segment (Seq ${seqNum})...`)
        }
      }
    }
    
    // PHASE 5: Show completion message when all segments have been sent and processed
    if (nextSequenceNumber > MAX_SEGMENTS && currentSegment === null && ackReceived.length === 0 && 
        retransmittingSegments.length === 0) {
      if (!transmissionComplete) {
        setTransmissionComplete(true)
      }
      
      if (!completionMessageShownRef.current && onMessage) {
        completionMessageShownRef.current = true
        onMessage(`✅ Transmission Complete! All ${MAX_SEGMENTS} segments successfully delivered.`)
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 2: Move current segment toward server
    // ═══════════════════════════════════════════════════════════════════
    if (currentSegment !== null) {
      setCurrentSegment(prev => {
        if (!prev) return null
        
        const updated = {
          ...prev,
          position: Math.min(prev.position + 0.00695, 1) // Updated speed: Original segment reaches 50% in 1.2s (slowed 1.5x for better understanding)
        }

        // Show initial send status when segment moves
        if (updated.position > 0.05 && !statusMessageShownRef.current.has(`sent-${prev.id}`)) {
          statusMessageShownRef.current.add(`sent-${prev.id}`)
          if (onMessage) {
            onMessage(`📤 Ghost Copy Created in Send Buffer (Seq ${prev.seqNum})`)
          }
        }

        // ═══════════════════════════════════════════════════════════════════
        // PHASE 4: Packet Loss - Make segment disappear at 50% if enabled
        // ═══════════════════════════════════════════════════════════════════
        if (packetLossEnabled && updated.position >= 0.5 && !lostSegmentsRef.current.has(prev.id)) {
          lostSegmentsRef.current.add(prev.id)
          // Start timeout timer for this segment (packet lost midway) - store both start time and seqNum
          timeoutStartRef.current.set(prev.id, { startTime: timeRef.current, seqNum: prev.seqNum })
          
          // CRITICAL: Pause timing depends on mode:
          // Phase 4 ONLY: Set 6.0s pause (timeout + retransmit + ACK travel)
          // Combined (both enabled): Set 18.0s pause (TWO timeouts + TWO retransmits + ACK loss + removal animation)
          if (!ackLossEnabled) {
            // Phase 4: timeout (6.75s) + retransmit travel (0.9s) + ACK travel (0.9s) + buffer (0.45s) = 9.0s
            lastClearedTimeRef.current = timeRef.current + 9.0
          } else {
            // Combined mode: Pause for both retransmit cycles + duplicate removal animation
            // Timeout 1 (6.75s) + retrans 1 (0.9s) + ACK lost (1.2s) + timeout 2 (6.75s) + retrans 2 (0.9s) + duplicate removal (3.3s) + ACK sent (2.8s + 0.9s) + buffer (0.45s) ≈ 27.0s
            lastClearedTimeRef.current = timeRef.current + 27.0
          }
        }

        // Collision: Segment reaches server (position >= 0.95)
        // IMPORTANT: Skip collision if packet was lost (packet loss simulation - Phase 4 & Combined mode)
        // In combined mode, original segment must NOT reach server so retransmits are not detected as duplicates prematurely
        if (updated.position >= 0.95 && !processedSegmentsRef.current.has(prev.id) && !lostSegmentsRef.current.has(prev.id)) {
          processedSegmentsRef.current.add(prev.id)
          
          // CRITICAL: Only add to lastReceivedSeqRef in modes where original packet successfully reaches server
          // Skip in: Phase 4 (packetLossEnabled only) and Combined (both enabled)
          // Only add in: Normal mode and Phase 6 (ackLossEnabled only where original reaches successfully)
          if (!packetLossEnabled) {
            // Normal or Phase 6 only: Track this as the last received sequence
            lastReceivedSeqRef.current.set(`seg-${prev.seqNum}`, {
              id: prev.id,
              seqNum: prev.seqNum,
              receivedTime: timeRef.current
            })
          }
          
          // CRITICAL: Start timeout for ACK arrival (used for both Phase 4 & Phase 6)
          // This ensures client waits for ACK, and if it doesn't arrive (Phase 6), triggers retransmission
          if (!timeoutStartRef.current.has(prev.id)) {
            timeoutStartRef.current.set(prev.id, { startTime: timeRef.current, seqNum: prev.seqNum })
          }
          
          // Server flashes green immediately
          setServerFlashIntensity(1)
          
          // Spawn ACK packet
          // ACK seqNum acknowledges the received segment + 1
          const ackSeqNum = String(parseInt(prev.seqNum) + 1).padStart(3, '0')
          const ackPacket = {
            id: `ack-${prev.id}`,
            position: 1,
            seqNum: ackSeqNum,
            sourceSegmentId: prev.id,
            sourceSegmentSeqNum: prev.seqNum,
            spawnTime: timeRef.current,
            willBeLost: ackLossEnabled // Phase 6: Mark if this ACK should be lost
          }
          setAckReceived(prev => [...prev, ackPacket])
          
          // Show clear message that ACK is being sent
          if (onMessage && !statusMessageShownRef.current.has(`ack-sent-${prev.id}`)) {
            statusMessageShownRef.current.add(`ack-sent-${prev.id}`)
            if (ackLossEnabled) {
              onMessage(`2️⃣ [SERVER] Received Segment (Seq ${prev.seqNum}) → Sending ACK (will be lost in transit)...`)
            } else {
              onMessage(`2️⃣ [SERVER] Received Segment (Seq ${prev.seqNum}) → Sending ACK...`)
            }
          }
        }

        return updated
      })
    }

    // ═══════════════════════════════════════════════════════════════════
    // STEP 3: Move ACK packets back toward client
    // ═══════════════════════════════════════════════════════════════════
    setAckReceived(prev => {
      const updated = prev.map(ack => {
        // Calculate new position based on whether this ACK is lost or normal
        let newPos
        if (ack.lostTime) {
          // Lost ACK: pause → fade → move
          const timeSinceLoss = timeRef.current - ack.lostTime
          const pauseDuration = 0.6
          const fadeStartTransition = 0.1
          const fadeDuration = 1.4
          const totalFadeTime = pauseDuration + fadeStartTransition + fadeDuration
          const moveSpeed = 0.01111  // ACK speed: reaches 50% in 0.75s (slowed 1.5x)
          
          if (timeSinceLoss < totalFadeTime) {
            newPos = ack.position  // Frozen during pause and fade
          } else {
            newPos = Math.max(ack.position - moveSpeed, 0)  // Move while transparent with smooth speed
          }
        } else {
          // Normal ACK: move continuously with smooth speed
          newPos = Math.max(ack.position - 0.01111, 0) // ACK travel speed: reaches 50% in 0.75s (slowed 1.5x)
        }
        
        // Phase 6: Check if ACK should be lost at midway point
        // ACKs must travel visibly for at least halfway (position 0.5) before being marked as lost
        // This ensures users see the ACK being sent before it disappears
        if (ack.willBeLost && !ack.lostTime && newPos < 0.5) {
          // Log the loss clearly so user sees what happened
          if (onMessage && !ackLossMessageShownRef.current.has(`ack-lost-${ack.id}`)) {
            ackLossMessageShownRef.current.add(`ack-lost-${ack.id}`)
            onMessage(`3️⃣ [NETWORK] ACK Lost! Segment ${ack.sourceSegmentSeqNum}'s ACK disappeared at midway point → Client won't receive confirmation`)
          }
          
          // IMPORTANT: In Phase 6, when ACK is lost, DON'T trigger removal animation here
          // The removal animation should only happen when the RETRANSMITTED segment arrives as a duplicate
          // Just set pause timer to wait for timeout and retransmission to complete
          // Timeline: timeout (4.5s) + retransmit travel (0.6s) + duplicate animation (2.0s) + recovery ACK delay (2.8s) = ~10s
          if (!lastClearedTimeRef.current || timeRef.current >= lastClearedTimeRef.current) {
            lastClearedTimeRef.current = timeRef.current + 15.0  // Slowed pause for Phase 6 (1.5x)
          }
          
          return {
            ...ack,
            position: newPos,
            lostTime: timeRef.current,
            fadeProgress: 0
          }
        }
        
        // Update fade progress for lost ACKs
        if (ack.lostTime && !ack.fadeProgress && ack.fadeProgress !== 0) {
          return {
            ...ack,
            position: newPos,
            fadeProgress: 0
          }
        }
        
        // Progress fade animation for lost ACKs
        // Phase 1 (0-0.6s): Pause at loss point, no fade
        // Phase 2 (0.6-2.1s): Fade out in place with smooth easing
        // Phase 3 (2.1s+): Move toward client while fully transparent
        if (ack.lostTime) {
          const timeSinceLoss = timeRef.current - ack.lostTime
          const pauseDuration = 0.6    // Hold packet visible for 0.6s
          const fadeStartTransition = 0.1  // Smooth 0.1s transition from pause to fade
          const fadeDuration = 1.4     // Fade over 1.4s (smoother than 1.5s)
          
          // Easing functions for smooth transitions
          const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
          const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
          
          let fadeProgress = 0
          if (timeSinceLoss < pauseDuration) {
            // Phase 1: Pause phase - packet visible, no fade
            fadeProgress = 0
          } else if (timeSinceLoss < pauseDuration + fadeStartTransition) {
            // Transition: Smooth start of fade
            const transitionProgress = (timeSinceLoss - pauseDuration) / fadeStartTransition
            fadeProgress = easeOutCubic(transitionProgress) * 0.05  // Gentle start
          } else {
            // Phase 2 & 3: Main fade phase - smooth exponential fade
            const timeSinceFadeStart = timeSinceLoss - pauseDuration - fadeStartTransition
            const fadeProgressRaw = Math.min(timeSinceFadeStart / fadeDuration, 1)
            fadeProgress = 0.05 + easeInOutCubic(fadeProgressRaw) * 0.95  // Smooth curve from 0.05 to 1.0
          }
          
          return {
            ...ack,
            position: newPos,
            fadeProgress: Math.min(fadeProgress, 1)
          }
        }
        
        return {
          ...ack,
          position: newPos
        }
      })

      // Collision: ACK reaches client (position < 0.05)
      updated.forEach(ack => {
        // Phase 6: Skip collision if this ACK has been marked as lost
        if (ack.lostTime) {
          return // Skip processing this lost ACK
        }

        if (ack.position < 0.05 && !successAnimations.has(ack.sourceSegmentId)) {
          // Mark ghost copy for clearing animation
          setSuccessAnimations(prev => {
            const newMap = new Map(prev)
            newMap.set(ack.sourceSegmentId, timeRef.current)
            return newMap
          })

          // Show UI message ONCE
          if (!messageShownRef.current.has(ack.sourceSegmentId)) {
            messageShownRef.current.add(ack.sourceSegmentId)
            
            // Phase 6: Check if this is a recovery ACK (after duplicate was detected)
            if (duplicateRetransmitCountRef.current.get(ack.sourceSegmentSeqNum) > 0) {
              if (onMessage) {
                onMessage(`6️⃣ [CLIENT] Received Recovery ACK (Seq ${ack.sourceSegmentSeqNum}) → Confirmed! → Ready to send next segment...`)
              }
              duplicateRetransmitCountRef.current.delete(ack.sourceSegmentSeqNum)
            } else if (onMessage) {
              onMessage(`✓ [CLIENT] Received ACK (Seq ${ack.sourceSegmentSeqNum}) → Segment confirmed → Ready to send next segment...`)
            }
          }

          // Clear timeout timer when ACK arrives (Phase 4)
          timeoutStartRef.current.delete(ack.sourceSegmentId)
          setTimeoutTimers(prev => {
            const newTimers = new Map(prev)
            newTimers.delete(ack.sourceSegmentId)
            return newTimers
          })

          // Start removal animation for current segment
          if (currentSegment) {
            setRemovingSegment(currentSegment)
            setRemovalStartTime(timeRef.current)
          }
          // Don't clear currentSegment yet - let animation complete first
        }
      })

      // Keep ACKs that are still in transit or completing fade animation
      return updated.filter(ack => {
        if (!ack.lostTime) {
          // Normal ACK: keep if still moving toward client
          return ack.position > 0
        } else {
          // Lost ACK: keep during:
          // Phase 1 (0-0.6s): Pause at loss point
          // Phase 2 (0.6-2.1s): Fade in place
          // Phase 3 (2.1s+): Move toward client while transparent
          // Keep as long as it hasn't reached client (position > 0) or still fading
          return ack.position > 0 || (ack.fadeProgress || 0) < 1.2
        }
      })
    })

    // Fade server flash with smooth easing
    if (serverFlashIntensity > 0) {
      // Smooth decay using exponential easing for natural fade
      setServerFlashIntensity(prev => Math.max(prev - delta * 2.5, 0))
    }

    // Handle removal animation completion
    // Duration: 2.0s (duplicate removal animation) + 0.8s (pause message) + 0.5s (buffer) = 3.3s
    if (removingSegment && timeRef.current - removalStartTime > 3.3) {
      // Animation complete - set minimum pause timer to allow recovery ACK to be sent and processed
      // Duration: 2.8s (recovery ACK delay - already counted in pause set at duplicate detection)
      //         + 0.9s (ACK travel with 1.5x slowdown)
      //         + 0.5s (buffer)
      // CRITICAL: Don't override if a longer pause is already set (e.g., from combined mode detection)
      const nextPauseTime = timeRef.current + 2.8 + 0.9 + 0.5  // 4.2s minimum
      if (!lastClearedTimeRef.current || nextPauseTime > lastClearedTimeRef.current) {
        lastClearedTimeRef.current = nextPauseTime
      }
      setCurrentSegment(null)
      setRemovingSegment(null)
      
      // CRITICAL: Clean up completed duplicate packets from state to prevent label persistence
      setDuplicateDetectedSegments(prev => 
        prev.filter(dupPkt => {
          const timeSinceDetected = timeRef.current - dupPkt.detectedTime
          const totalDuration = 2.0
          const discardProgress = Math.min(timeSinceDetected / totalDuration, 1)
          // Keep only duplicates still animating (progress < 1.0)
          // Remove completed animations (progress >= 1.0)
          return discardProgress < 1.0
        })
      )
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4 & 6: Timeout & Retransmission Logic
    // Works for BOTH packetLossEnabled AND ackLossEnabled
    // ═══════════════════════════════════════════════════════════════════
    if (packetLossEnabled || ackLossEnabled) {
      // Update timeout timers for segments waiting for ACK
      timeoutStartRef.current.forEach((timeoutInfo, segmentId) => {
        const startTime = typeof timeoutInfo === 'object' ? timeoutInfo.startTime : timeoutInfo
        const seqNum = typeof timeoutInfo === 'object' ? timeoutInfo.seqNum : currentSegment?.seqNum || '000'
        
        const elapsed = timeRef.current - startTime
        const timeoutDuration = 6.75 // Slowed timeout (6.75s) - 1.5x slower for better understanding
        const progress = Math.min(elapsed / timeoutDuration, 1)
        
        setTimeoutTimers(prev => {
          const newTimers = new Map(prev)
          newTimers.set(segmentId, progress)
          return newTimers
        })

        // Trigger retransmission if timeout reached and not already retransmitting
        // In Phase 6 (ACK Loss): segment already processed but ACK was lost, so retransmit
        // In Phase 4 (Packet Loss): segment never reached server, retransmit from client
        // Only prevent multiple retransmits that are CURRENTLY IN FLIGHT
        if (progress >= 1 && !retransmittingSegments.some(rs => rs.sourceId === segmentId)) {
                // Show timeout message when it fires
                if (onMessage && !statusMessageShownRef.current.has(`timeout-${segmentId}`)) {
                  statusMessageShownRef.current.add(`timeout-${segmentId}`)
                  onMessage(`⏱️ [CLIENT] Timeout! No ACK received → Retransmitting Segment ${seqNum}...`)
                }
          
          // Track retransmit attempt count for this segment
          const currentAttempt = (retransmitCountRef.current.get(seqNum) || 0) + 1
          retransmitCountRef.current.set(seqNum, currentAttempt)
          
          // Show which retransmit attempt this is
          if (onMessage && !statusMessageShownRef.current.has(`retrans-attempt-${seqNum}-${currentAttempt}`)) {
            statusMessageShownRef.current.add(`retrans-attempt-${seqNum}-${currentAttempt}`)
            const attemptLabel = currentAttempt === 1 ? '1st Retransmit' : `${currentAttempt}${currentAttempt === 2 ? 'nd' : 'rd'} Retransmit`
            onMessage(`📤 [CLIENT] ${attemptLabel} of Segment ${seqNum}...`)
          }
          
          // Create retransmitted segment - use the stored seqNum, not the current segment's seqNum
          const retransmittedPkt = {
            id: `retrans-${segmentId}-${timeRef.current}`,
            sourceId: segmentId,
            position: 0,
            seqNum: seqNum,  // Use the stored sequence number from when timeout was set
            spawnTime: timeRef.current,
            retransmitAttempt: currentAttempt  // Mark which retransmit attempt this is (1st, 2nd, etc.)
          }
          setRetransmittingSegments(prev => [...prev, retransmittedPkt])
          
          // CRITICAL: Set a NEW timeout for this retransmit's ACK
          // The timeout starts from when the retransmit is sent (spawnTime)
          // If no ACK arrives within 4.5s, another timeout will trigger for another retransmit
          timeoutStartRef.current.set(segmentId, { startTime: timeRef.current, seqNum: seqNum })
        }
      })

      // Move retransmitted packets
      setRetransmittingSegments(prev => {
        return prev.map(pkt => ({
          ...pkt,
          position: Math.min(pkt.position + 0.01761, 1) // Speed: Retransmits reach server in 0.9s (slowed 1.5x)
        })).filter(pkt => {
          // Check if packet reached server
          if (pkt.position >= 0.95 && !pkt.processed) {
            // Mark as processed to prevent duplicate detection multiple times
            pkt.processed = true
            // Check if this is a duplicate
            const isDuplicate = lastReceivedSeqRef.current.has(`seg-${pkt.seqNum}`)
            
            // CRITICAL: In combined mode, only show duplicate detection on SECOND+ retransmit, not first
            // First retransmit should NOT trigger duplicate animation even if isDuplicate appears true
            const shouldShowDuplicateAnimation = isDuplicate && (pkt.retransmitAttempt > 1 || !packetLossEnabled)
            
            if (shouldShowDuplicateAnimation) {
              // CRITICAL: Only show duplicate detection animation in Phase 6 (ackLossEnabled mode)
              // In Phase 4 (packet loss only), never show duplicate animation - just send ACK silently
              if (ackLossEnabled) {
                // Phase 6: This is a duplicate - add to duplicate detection animation
                setDuplicateDetectedSegments(prev => [...prev, {
                  id: pkt.id,
                  seqNum: pkt.seqNum,
                  position: 4.8, // At server position
                  detectedTime: timeRef.current
                }])
                
                // CRITICAL: Set explicit pause for combined mode when duplicate detected
                // Pause duration must cover: removal animation (3.3s) + ACK delay (2.8s) + ACK travel (0.9s) + buffer (0.5s) = 7.5s
                // This ensures NO new segment is sent until recovery ACK is received by client
                if (packetLossEnabled && ackLossEnabled) {
                  // Combined mode: Set comprehensive pause
                  const pauseDuration = 3.3 + 2.8 + 0.9 + 0.5 // 7.5s total
                  if (!lastClearedTimeRef.current || timeRef.current + pauseDuration > lastClearedTimeRef.current) {
                    lastClearedTimeRef.current = timeRef.current + pauseDuration
                    if (onMessage && !ackLossMessageShownRef.current.has(`pause-set-${pkt.seqNum}`)) {
                      ackLossMessageShownRef.current.add(`pause-set-${pkt.seqNum}`)
                      onMessage(`⏸️ [PROTOCOL] Recovery in progress → Pausing transmission until ACK recovery complete (7.5s)...`)
                    }
                  }
                }
                
                // IMPORTANT: Trigger removal animation timing so pause timer is set after animation completes
                // This allows recovery ACK to be sent and next segment to be scheduled properly
                if (!removingSegment) {
                  setRemovingSegment(pkt)
                  setRemovalStartTime(timeRef.current)
                }
                
                // Show duplicate detection message
                if (onMessage && !ackLossMessageShownRef.current.has(`duplicate-${pkt.seqNum}`)) {
                  ackLossMessageShownRef.current.add(`duplicate-${pkt.seqNum}`)
                  onMessage(`4️⃣ [SERVER] Duplicate Detected! Segment ${pkt.seqNum} already received → Discarding duplicate and preparing recovery ACK...`)
                }
                
                // CRITICAL: Clear timeout to prevent 3rd retransmit
                timeoutStartRef.current.delete(pkt.sourceId)
              }

              // Increment retransmit count for this sequence
              const curCount = duplicateRetransmitCountRef.current.get(pkt.seqNum) || 0
              duplicateRetransmitCountRef.current.set(pkt.seqNum, curCount + 1)
              
              // CRITICAL: Only queue recovery ACK in Phase 6 (ackLossEnabled mode)
              // In Phase 4 (packet loss only), never queue recovery ACK
              if (ackLossEnabled) {
                // CRITICAL: Check if recovery ACK for this segment already queued (prevent 2nd recovery ACK)
                const ackAlreadyQueued = pendingRecoveryAcksRef.current.some(ack => 
                  ack.sourceSegmentSeqNum === pkt.seqNum
                )
                
                if (!ackAlreadyQueued) {
                  // Phase 6 UPGRADE: Delay ACK sending until after removal animation completes + pause
                  // Duration: removal animation (2.0s) + pause (0.8s) = 2.8s total before ACK sent
                  // ACK seqNum acknowledges the received segment + 1
                  const ackSeqNum = String(parseInt(pkt.seqNum) + 1).padStart(3, '0')
                  const pendingAck = {
                    id: `ack-recovery-${pkt.seqNum}-${pkt.id}`,
                    seqNum: ackSeqNum,
                    sourceSegmentId: pkt.sourceId,
                    sourceSegmentSeqNum: pkt.seqNum,
                    duplicateDetectedTime: timeRef.current,
                    sendDelay: 2.8, // Wait 2.8s (2.0s removal + 0.8s pause) before sending
                    willBeLost: false,
                    isSent: false
                  }
                  pendingRecoveryAcksRef.current.push(pendingAck)
                  
                  if (onMessage && !ackLossMessageShownRef.current.has(`recovery-ack-${pkt.seqNum}`)) {
                    ackLossMessageShownRef.current.add(`recovery-ack-${pkt.seqNum}`)
                    onMessage(`🔙 [SERVER] Preparing recovery ACK for Segment ${pkt.seqNum}...`)
                  }
                }
              } else if (!ackLossEnabled) {
                // Phase 4: Even if marked as duplicate, send immediate ACK without showing animation
                // This is a fallback in case somehow a duplicate is detected (shouldn't normally happen)
                if (!lastReceivedSeqRef.current.has(`seg-${pkt.seqNum}`)) {
                  lastReceivedSeqRef.current.set(`seg-${pkt.seqNum}`, {
                    id: pkt.id,
                    seqNum: pkt.seqNum,
                    receivedTime: timeRef.current
                  })
                }
                
                // Server flashes green
                setServerFlashIntensity(1)
                
                // Create immediate ACK for successfully received retransmitted segment
                const ackSeqNum = String(parseInt(pkt.seqNum) + 1).padStart(3, '0')
                const ackPacket = {
                  id: `ack-retrans-${pkt.sourceId}`,
                  position: 1,
                  seqNum: ackSeqNum,
                  sourceSegmentId: pkt.sourceId,
                  sourceSegmentSeqNum: pkt.seqNum,
                  spawnTime: timeRef.current,
                  willBeLost: false
                }
                setAckReceived(prev => [...prev, ackPacket])
                
                if (onMessage && !statusMessageShownRef.current.has(`ack-retrans-${pkt.seqNum}`)) {
                  statusMessageShownRef.current.add(`ack-retrans-${pkt.seqNum}`)
                  onMessage(`2️⃣ [SERVER] Received 2nd Retransmit (Seq ${pkt.seqNum}) → Sending ACK...`)
                }
              }
            } else if (ackLossEnabled && (!isDuplicate || pkt.retransmitAttempt === 1)) {
              // COMBINED MODE + PHASE 6: First retransmit with ACK loss (or non-duplicate in Phase 6)
              // This is the first retransmit in Phase 6 (ACK loss only) or combined (both enabled)
              // In combined mode: first retransmit arrives, sends ACK that will be lost
              // In Phase 6: original reached server, then its retransmit arrives and is treated as first attempt
              // CRITICAL: Only track in lastReceivedSeqRef after first retransmit in combined mode
              // ALSO: Only create ACK ONCE per retransmit attempt
              const ackCreatedKey = `ack-created-${pkt.seqNum}-attempt${pkt.retransmitAttempt}`
              if (!statusMessageShownRef.current.has(ackCreatedKey) && !lastReceivedSeqRef.current.has(`seg-${pkt.seqNum}`)) {
                lastReceivedSeqRef.current.set(`seg-${pkt.seqNum}`, {
                  id: pkt.id,
                  seqNum: pkt.seqNum,
                  receivedTime: timeRef.current
                })
                
                statusMessageShownRef.current.add(ackCreatedKey)
                
                // Server flashes green
                setServerFlashIntensity(1)
                
                // Create ACK that will be lost (for both Phase 6 and Combined modes)
                const ackSeqNum = String(parseInt(pkt.seqNum) + 1).padStart(3, '0')
                const ackPacket = {
                  id: `ack-loss-${pkt.sourceId}`,
                  position: 1,
                  seqNum: ackSeqNum,
                  sourceSegmentId: pkt.sourceId,
                  sourceSegmentSeqNum: pkt.seqNum,
                  spawnTime: timeRef.current,
                  willBeLost: true, // CRITICAL: Mark for loss in Phase 6 or Combined
                  isRecoveryAck: false
                }
                setAckReceived(prev => [...prev, ackPacket])
                
                if (onMessage && !statusMessageShownRef.current.has(`ack-loss-${pkt.seqNum}`)) {
                  statusMessageShownRef.current.add(`ack-loss-${pkt.seqNum}`)
                  if (packetLossEnabled) {
                    // Combined mode message
                    onMessage(`2️⃣ [SERVER] Received 1st Retransmit (Seq ${pkt.seqNum}) → Sending ACK (will be lost in transit)...`)
                  } else {
                    // Phase 6 only message
                    onMessage(`2️⃣ [SERVER] Received Segment (Seq ${pkt.seqNum}) → Sending ACK (will be lost in transit)...`)
                  }
                }
              }
            } else if (!ackLossEnabled) {
              // Phase 4 ONLY: Retransmitted packet successfully reached server, create immediate ACK
              // This only happens in packetLossEnabled mode when ackLossEnabled is false
              // In Phase 6 (ackLossEnabled), the packet would be a duplicate, so we don't reach here
              lastReceivedSeqRef.current.set(`seg-${pkt.seqNum}`, {
                id: pkt.id,
                seqNum: pkt.seqNum,
                receivedTime: timeRef.current
              })
              
              // Server flashes green
              setServerFlashIntensity(1)
              
              // Create immediate ACK for successfully received retransmitted segment
              const ackSeqNum = String(parseInt(pkt.seqNum) + 1).padStart(3, '0')
              const ackPacket = {
                id: `ack-retrans-${pkt.sourceId}`,
                position: 1,
                seqNum: ackSeqNum,
                sourceSegmentId: pkt.sourceId,
                sourceSegmentSeqNum: pkt.seqNum,
                spawnTime: timeRef.current,
                willBeLost: false
              }
              setAckReceived(prev => [...prev, ackPacket])
              
              if (onMessage && !statusMessageShownRef.current.has(`ack-retrans-${pkt.seqNum}`)) {
                statusMessageShownRef.current.add(`ack-retrans-${pkt.seqNum}`)
                onMessage(`✅ Retransmitted Segment Received! Sending ACK for Seq ${pkt.seqNum}...`)
              }
            }
          }
          return pkt.position < 1
        })
      })
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 6 UPGRADE: Process Pending Recovery ACKs after removal animation
    // ═══════════════════════════════════════════════════════════════════
    const acksToSend = []
    const acksToKeep = []
    
    for (const ack of pendingRecoveryAcksRef.current) {
      if (!ack.isSent) {
        const timeSinceDetected = timeRef.current - ack.duplicateDetectedTime
        
        // Check if it's time to send this ACK
        if (timeSinceDetected >= ack.sendDelay) {
          // Time to send the ACK - show message once
          if (!pendingAckMessageShownRef.current.has(ack.id)) {
            pendingAckMessageShownRef.current.add(ack.id)
            if (onMessage) {
              onMessage(`5️⃣ [SERVER] Sending Recovery ACK (Seq ${ack.sourceSegmentSeqNum}) → Transmission resumes after client receives this...`)
            }
          }
          
          // Create the actual ACK packet to be sent
          const newAckPacket = {
            id: ack.id,
            position: 1,
            seqNum: ack.seqNum,
            sourceSegmentId: ack.sourceSegmentId,
            sourceSegmentSeqNum: ack.sourceSegmentSeqNum,
            spawnTime: timeRef.current,
            willBeLost: false,
            isRecoveryAck: true // Mark as recovery ACK
          }
          acksToSend.push(newAckPacket)
        } else {
          acksToKeep.push(ack)
        }
      }
    }
    
    // Update pending ACKs ref
    pendingRecoveryAcksRef.current = acksToKeep
    
    // Add any ACKs that are ready to send
    if (acksToSend.length > 0) {
      setAckReceived(prev => [...prev, ...acksToSend])
    }
  })

  return (
    <group ref={groupRef}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CLIENT NODE (Left, x = -4) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group position={[-4, 0, 0]}>
        {/* Main client cube */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial 
            color="#00ffff" 
            emissive="#00ffff" 
            emissiveIntensity={0.6}
            shininess={80}
          />
        </mesh>

        {/* Client glow ring */}
        <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.08, 16, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
        </mesh>

        {/* Client light */}
        <pointLight 
          position={[0, 0, 0]} 
          intensity={2} 
          distance={2.5} 
          color="#00ffff" 
        />

        {/* Label */}
        <Text
          position={[0, -1.2, 0]}
          fontSize={0.4}
          color="#00ffff"
          anchorX="center"
          anchorY="top"
        >
          CLIENT
        </Text>
      </group>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEND BUFFER (Compact Wireframe Box) - Appears on START */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group position={[-4, 1.2, 0]}>
        {/* Buffer box - Fully transparent by default, visible when running */}
        <mesh>
          <boxGeometry args={[0.9, 1.1, 0.9]} />
          <meshBasicMaterial 
            color="#3b82f6" 
            wireframe={true}
            transparent={true}
            opacity={isRunning ? 0.7 : 0}
          />
        </mesh>

        {/* Label - Only visible when animation running */}
        {isRunning && (
          <Text
            position={[0, 0.35, 0]}
            fontSize={0.28}
            color="#00eeff"
            anchorX="center"
            anchorY="center"
            fontWeight="bold"
          >
            Send Buffer
          </Text>
        )}

        {/* Only show segment waiting for ACK when animation is running - disappears when ACK received */}
        {isRunning && (removingSegment ? (
          // Removal animation - fade out and shrink
          <group position={[0, -0.1, 0]}>
            {(() => {
              const removalProgress = Math.min((animationTime - removalStartTime) / 0.9, 1)
              const opacity = Math.max(0.6 - removalProgress * 0.8, 0)
              const scale = 1 - removalProgress * 0.3
              
              return (
                <>
                  {/* Segment copy fading out */}
                  <group scale={[scale, scale, scale]}>
                    <mesh>
                      <boxGeometry args={[0.5, 0.28, 0.5]} />
                      <meshPhongMaterial
                        color="#22ff00"
                        emissive="#22ff00"
                        emissiveIntensity={1.2}
                        transparent={true}
                        opacity={opacity}
                      />
                    </mesh>

                    {/* Outline glowing bright as it disappears */}
                    <mesh>
                      <boxGeometry args={[0.55, 0.33, 0.55]} />
                      <meshBasicMaterial
                        color="#4fffaa"
                        wireframe={true}
                        transparent={true}
                        opacity={Math.max(0.9 - removalProgress, 0)}
                      />
                    </mesh>

                    {/* Green glow light during removal */}
                    {opacity > 0 && (
                      <pointLight 
                        position={[0, 0, 0]} 
                        intensity={2 * (1 - removalProgress)}
                        distance={1.5} 
                        color="#22ff00" 
                      />
                    )}
                  </group>
                </>
              )
            })()}
          </group>
        ) : currentSegment ? (
          // Normal state - waiting for ACK
          <group position={[0, -0.1, 0]}>
            {/* Segment copy in buffer */}
            <mesh>
              <boxGeometry args={[0.5, 0.28, 0.5]} />
              <meshPhongMaterial
                color="#1e5a7a"
                emissive="#003366"
                emissiveIntensity={0.5}
                transparent={true}
                opacity={0.6}
              />
            </mesh>

            {/* Outline */}
            <mesh>
              <boxGeometry args={[0.55, 0.33, 0.55]} />
              <meshBasicMaterial
                color="#00ffff"
                wireframe={true}
                transparent={true}
                opacity={0.8}
              />
            </mesh>

            {/* Label - sequence number */}
            <Text
              position={[0, 0, 0.3]}
              fontSize={0.18}
              color="#00ffff"
              anchorX="center"
              anchorY="center"
              fontWeight="bold"
            >
              Seq {currentSegment.seqNum}
            </Text>

            {/* Pulsing indicator */}
            <pointLight 
              position={[0, 0, 0]} 
              intensity={0.8 + Math.sin(animationTime * 2) * 0.4}  // Slower pulse for clarity
              distance={1.5} 
              color="#00ffff" 
            />

            {/* PHASE 4 & 6: Timeout Timer - Circular progress indicator */}
            {(packetLossEnabled || ackLossEnabled) && timeoutTimers.get(currentSegment.id) !== undefined && (
              <>
                {/* Timeout timer background circle - orange/red */}
                <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.35, 0.08, 16, 100, 0, Math.PI * 2]} />
                  <meshBasicMaterial color="#ff6600" opacity={0.4} transparent />
                </mesh>

                {/* Timeout timer progress circle - glowing red as it fills */}
                {(() => {
                  const progress = timeoutTimers.get(currentSegment.id) || 0
                  const angle = Math.PI * 2 * progress
                  const intensity = 0.5 + progress * 1.5
                  return (
                    <>
                      <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, angle]}>
                        <torusGeometry args={[0.35, 0.08, 16, 100, 0, angle]} />
                        <meshBasicMaterial 
                          color={progress > 0.7 ? '#ff3333' : '#ffaa00'} 
                          opacity={intensity} 
                          transparent 
                        />
                      </mesh>
                      <pointLight
                        position={[0, 0.6, 0]}
                        intensity={intensity * 2}
                        distance={2}
                        color={progress > 0.7 ? '#ff3333' : '#ffaa00'}
                      />
                    </>
                  )
                })()}

                {/* Timeout label */}
                <Text
                  position={[0, 0.6, 0.35]}
                  fontSize={0.12}
                  color="#ffaa00"
                  anchorX="center"
                  anchorY="center"
                  fontWeight="bold"
                >
                  {Math.round((timeoutTimers.get(currentSegment.id) || 0) * 100)}%
                </Text>
              </>
            )}
          </group>
        ) : null)}
      </group>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONNECTION CABLE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group>
        {/* Main transmission line */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 8, 32]} />
          <meshPhongMaterial 
            color="#00ffff" 
            emissive="#00ffff" 
            emissiveIntensity={1}
            metalness={0.5}
            roughness={0.2}
          />
        </mesh>

        {/* Insulation */}
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 8, 32]} />
          <meshPhongMaterial 
            color="#0099dd" 
            emissive="#0099dd"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Glow */}
        <pointLight 
          position={[0, 0, 0]} 
          intensity={2} 
          distance={5} 
          color="#00ffff" 
        />
      </group>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACTIVE DATA PACKET traveling to server */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {currentSegment && (
        <group position={[-4 + currentSegment.position * 8, 0.5, 0]}>
          {(() => {
            // PHASE 4: Calculate opacity for packet loss
            const shouldBeInvisible = packetLossEnabled && currentSegment.position >= 0.5
            const opacity = shouldBeInvisible ? 0 : 1
            
            return (
              <>
                {/* Data cube - Bright green (invisible if packet lost) */}
                <mesh>
                  <boxGeometry args={[0.5, 0.5, 0.5]} />
                  <meshPhongMaterial
                    color="#22ff00"
                    emissive="#22ff00"
                    emissiveIntensity={1.3}
                    shininess={100}
                    metalness={0.6}
                    transparent={true}
                    opacity={opacity}
                  />
                </mesh>

                {/* Outline */}
                <mesh>
                  <boxGeometry args={[0.55, 0.55, 0.55]} />
                  <meshBasicMaterial
                    color="#4fffaa"
                    wireframe={true}
                    transparent={true}
                    opacity={opacity * 0.8}
                  />
                </mesh>

                {/* Light */}
                {opacity > 0 && (
                  <pointLight 
                    position={[0, 0, 0]} 
                    intensity={2.5} 
                    distance={2} 
                    color="#22ff00" 
                  />
                )}

                {/* Label */}
                <Text
                  position={[0, 0.6, 0.3]}
                  fontSize={0.18}
                  color="#ffffff"
                  anchorX="center"
                  anchorY="center"
                  fontWeight="bold"
                >
                  Seq {currentSegment.seqNum}
                </Text>
              </>
            )
          })()}
        </group>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SERVER NODE (Right, x = 4) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <group position={[4, 0, 0]}>
        {/* Server cube - flashes green on collision */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhongMaterial 
            color={serverFlashIntensity > 0 ? '#22ff00' : '#ffaa00'}
            emissive={serverFlashIntensity > 0 ? '#22ff00' : '#ffaa00'}
            emissiveIntensity={0.6 + serverFlashIntensity * 2}
            shininess={80}
          />
        </mesh>

        {/* Glow ring */}
        <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.08, 16, 32]} />
          <meshBasicMaterial 
            color={serverFlashIntensity > 0 ? '#22ff00' : '#ffaa00'} 
            transparent 
            opacity={0.9 + serverFlashIntensity * 0.5}
          />
        </mesh>

        {/* Flash light */}
        {serverFlashIntensity > 0 && (
          <pointLight 
            position={[0, 0.5, 0.8]} 
            intensity={8 * serverFlashIntensity} 
            distance={6} 
            color="#22ff00"
          />
        )}

        {/* Label */}
        <Text
          position={[0, -1.2, 0]}
          fontSize={0.4}
          color={serverFlashIntensity > 0 ? '#ccffcc' : '#ffdd00'}
          anchorX="center"
          anchorY="top"
        >
          SERVER
        </Text>

        {/* ACK indicator */}
        {serverFlashIntensity > 0.3 && (
          <Text
            position={[0, 0.7, 0]}
            fontSize={0.3}
            color="#ccffcc"
            anchorX="center"
            anchorY="center"
            fontWeight="bold"
          >
            ACK!
          </Text>
        )}
      </group>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACK PACKETS traveling back to client */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {ackReceived.map((ack) => {
        const x = -4 + ack.position * 8
        const pulseIntensity = Math.sin(animationTime * 3 + ack.id.charCodeAt(0)) * 0.3 + 0.7  // Slower pulse
        
        // Phase 6: Shared ACK opacity for sphere, glow, and label.
        // This keeps label fade perfectly synchronized with packet fade.
        const isLost = ack.lostTime !== undefined
        const ackFadeProgress = ack.fadeProgress || 0
        const ackVisualOpacity = isLost ? Math.max(0, 1 - ackFadeProgress) : 1
        const shouldRenderAckLabel = ackVisualOpacity > 0.02

        // Mesh opacity uses the same shared value for smooth synchronized fade.
        const meshOpacity = ackVisualOpacity
        const emissiveIntensity = (1.2 + pulseIntensity * 0.8) * meshOpacity
        
        return (
          <group key={`ack-${ack.id}`} position={[x, -0.5, 0]}>
            {/* ACK sphere - Bright green pulsing (or fading if lost) */}
            <mesh>
              <sphereGeometry args={[0.4, 32, 32]} />
              <meshPhongMaterial
                color="#00bb00"
                emissive="#00bb00"
                emissiveIntensity={emissiveIntensity}
                shininess={100}
                metalness={0.5}
                transparent={true}
                opacity={meshOpacity}
              />
            </mesh>

            {/* Outer glow - More visible, shows travel path */}
            <mesh>
              <sphereGeometry args={[0.6, 32, 32]} />
              <meshBasicMaterial
                color="#00dd00"
                wireframe={true}
                transparent={true}
                opacity={(0.8 * pulseIntensity) * meshOpacity}
              />
            </mesh>

            {/* Core - brightness indicator */}
            <mesh>
              <sphereGeometry args={[0.35, 24, 24]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent={true}
                opacity={(0.4 * pulseIntensity) * meshOpacity}
              />
            </mesh>

            {/* Lights - visible along entire journey */}
            <pointLight 
              position={[0, 0, 0]} 
              intensity={Math.max(0.5, 5 * pulseIntensity * meshOpacity)} 
              distance={4} 
              color="#00bb00" 
            />

            <pointLight 
              position={[0.2, 0.2, 0.2]} 
              intensity={Math.max(0.3, 3 * pulseIntensity * meshOpacity)} 
              distance={3} 
              color="#00dd00" 
            />

            {/* Label - visible with ACK packet, then fully hidden when ACK fades out */}
            {shouldRenderAckLabel && (
              <Text
                position={[0, -1.0, 0]}
                fontSize={0.2}
                color={ack.isRecoveryAck ? "#ffcc00" : "#11ff33"}
                anchorX="center"
                anchorY="bottom"
                fontWeight="bold"
                fillOpacity={ackVisualOpacity}
                strokeOpacity={ackVisualOpacity}
                opacity={ackVisualOpacity}
              >
                {ack.isRecoveryAck ? `🔄 Recovery ACK: ${ack.seqNum}` : `ACK: ${ack.seqNum}`}
              </Text>
            )}
            
            {/* Recovery ACK indicator - glows brighter */}
            {ack.isRecoveryAck && (
              <pointLight 
                position={[0, 0, 0]} 
                intensity={Math.max(0.8, 6 * pulseIntensity * meshOpacity)} 
                distance={5} 
                color="#ffcc00" 
              />
            )}
          </group>
        )
      })}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE 4: RETRANSMITTED PACKETS (After timeout) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {retransmittingSegments.map((pkt) => (
        <group key={`retrans-${pkt.id}`} position={[-4 + pkt.position * 8, 0.5, 0]}>
          {/* Retransmitted packet - Yellow/orange to show it's a retry */}
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshPhongMaterial
              color="#ffaa00"
              emissive="#ff8800"
              emissiveIntensity={1.2}
              shininess={80}
              metalness={0.5}
            />
          </mesh>

          {/* Outline - Orange glow */}
          <mesh>
            <boxGeometry args={[0.55, 0.55, 0.55]} />
            <meshBasicMaterial
              color="#ffdd00"
              wireframe={true}
              opacity={0.8}
            />
          </mesh>

          {/* Light */}
          <pointLight 
            position={[0, 0, 0]} 
            intensity={2.5} 
            distance={2} 
            color="#ffaa00" 
          />

          {/* Label - showing it's a retransmission */}
          <Text
            position={[0, 0.6, 0.3]}
            fontSize={0.16}
            color="#ffffff"
            anchorX="center"
            anchorY="center"
            fontWeight="bold"
          >
            RETRY {pkt.seqNum}
          </Text>
        </group>
      ))}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PHASE 6: DUPLICATE DETECTED PACKETS (Discarding animation) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {duplicateDetectedSegments.map((dupPkt) => {
        const timeSinceDetected = animationTime - dupPkt.detectedTime
        const totalDuration = 2.0 // Extended to 2.0s for slower animation
        const discardProgress = Math.min(timeSinceDetected / totalDuration, 1)
        
        // Easing functions for smooth animations
        const easeInCubic = (t) => t * t * t
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
        const easeInOutCubic = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const easeInQuart = (t) => t * t * t * t
        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4)
        
        // Three phases: detection (0-0.6s), warning (0.6-1.3s), discard (0.8-2.0s)
        
        // Smoother opacity with extended duration (starts later, fades out slowly)
        const opacityPhase = Math.max((timeSinceDetected - 0.8) / 1.2, 0)
        const opacity = Math.max(1 - easeOutQuart(opacityPhase), 0)
        
        // Smooth scale: gentle stretch then gradual shrink with easing
        const scalePhase = Math.min(Math.max((timeSinceDetected - 0.4) / 1.6, 0), 1)
        const scaleEased = 1 + easeInCubic(Math.min(scalePhase * 0.25, 0.12)) - easeOutCubic(Math.max(scalePhase - 0.2, 0)) * 0.7
        const scale = Math.max(scaleEased, 0.05)
        
        // Smooth rotation with gentle acceleration
        const rotationPhase = Math.min(Math.max((timeSinceDetected - 0.5) / 1.5, 0), 1)
        const rotationAmount = easeInCubic(rotationPhase) * Math.PI * 6 // Slower buildup
        
        // Smooth color transition: blue → red over longer duration
        const colorPhase = Math.max((timeSinceDetected - 0.4) / 1.4, 0)
        const redIntensity = easeInOutCubic(Math.min(colorPhase, 1))
        
        // Remove after animation completes
        if (discardProgress >= 1) {
          return null
        }
        
        // Extended message fade timing: fade-in (0-0.3s), hold (0.3-0.65s), fade-out (0.65-1.0s)
        const messageFadeIn = Math.min(timeSinceDetected / 0.3, 1)
        const messageFadeOut = Math.max((timeSinceDetected - 0.65) / 0.35, 0)
        const messageOpacity = easeOutQuart(messageFadeIn) * (1 - easeInCubic(messageFadeOut))
        
        return (
          <group key={`duplicate-${dupPkt.id}`} position={[4, 0.5, 0]}>
            {/* Phase 1: Detection message at server with smooth fade (0-0.7s) */}
            {messageOpacity > 0.01 && (
              <Text
                position={[0, -1.5, 0]}
                fontSize={0.18}
                color="#ffaa00"
                anchorX="center"
                anchorY="center"
                fontWeight="bold"
                maxWidth={2}
                transparent={true}
                opacity={messageOpacity}
              >
                "I have this already"
              </Text>
            )}
            
            {/* Duplicate packet - Smooth color and glow transitions */}
            <group scale={[scale, scale, scale]} rotation={[rotationAmount, rotationAmount, rotationAmount]}>
              <mesh>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshPhongMaterial
                  color={`hsl(${240 - redIntensity * 240}, 100%, 50%)`} // Blue -> Red with easing
                  emissive={`hsl(${240 - redIntensity * 240}, 100%, ${30 + redIntensity * 20}%)`} // Brighter as red
                  emissiveIntensity={0.6 + redIntensity * 1.5} // Smoother glow buildup
                  transparent={true}
                  opacity={opacity}
                  shininess={Math.max(30, 60 - redIntensity * 35)} // Loses shine as gets red-hot
                  metalness={0.2 + redIntensity * 0.4}
                  roughness={0.3 - redIntensity * 0.15} // Gets smoother as heated
                />
              </mesh>

              {/* Outline - Smooth color and opacity transitions */}
              <mesh>
                <boxGeometry args={[0.55, 0.55, 0.55]} />
                <meshBasicMaterial
                  color={`hsl(${240 - redIntensity * 240}, 100%, ${60 - redIntensity * 10}%)`}
                  wireframe={true}
                  transparent={true}
                  opacity={opacity * (0.6 + redIntensity * 0.6)} // Outline gets brighter as red
                />
              </mesh>
            </group>

            {/* Light effects - Smoother transitions with easing */}
            {opacity > 0.05 && (
              <>
                {/* Main light - smooth transition from blue to red */}
                <pointLight 
                  position={[0, 0, 0]} 
                  intensity={2.0 * opacity * (1 + redIntensity * 1.2)} 
                  distance={3.8} 
                  color={`hsl(${240 - redIntensity * 240}, 100%, 50%)`}
                />
                
                {/* Red glow light - appears and intensifies during removal */}
                {redIntensity > 0.15 && (
                  <pointLight 
                    position={[0, 0.3, 0.3]} 
                    intensity={easeInQuart(Math.max(redIntensity - 0.1, 0)) * 3.5 * opacity} 
                    distance={4.0} 
                    color="#ff5555"
                  />
                )}
                
                {/* Destructive flare - intensifies at end of removal */}
                {redIntensity > 0.5 && opacity > 0.2 && (
                  <pointLight 
                    position={[0, 0.2, -0.2]} 
                    intensity={easeInQuart(Math.min(redIntensity - 0.45, 0.55)) * 4.0 * opacity} 
                    distance={4.2} 
                    color="#ff6644"
                  />
                )}
                
                {/* Final vanish glow - bright flare during final fade out */}
                {redIntensity > 0.8 && opacity < 0.4 && (
                  <pointLight 
                    position={[0, 0, 0]} 
                    intensity={easeOutQuart(1 - opacity) * 3.0}
                    distance={3.5} 
                    color="#ffaa66"
                  />
                )}
              </>
            )}

            {/* Label phases with smooth transitions - ALL labels with proper fade-in/out */}
            
            {/* Phase 1: "I have this already" - Initial detection message */}
            {(() => {
              const labelStart = 0.05
              const fadeInDuration = 0.2
              const holdStart = labelStart + fadeInDuration  // 0.25s
              const holdDuration = 0.4
              const fadeOutStart = holdStart + holdDuration  // 0.65s
              const fadeOutDuration = 0.3
              const labelEnd = fadeOutStart + fadeOutDuration  // 0.95s
              
              if (timeSinceDetected < labelStart || timeSinceDetected > labelEnd) return null
              
              let labelOpacity = 0
              if (timeSinceDetected < holdStart) {
                // Fade in
                labelOpacity = easeOutCubic((timeSinceDetected - labelStart) / fadeInDuration)
              } else if (timeSinceDetected < fadeOutStart) {
                // Hold
                labelOpacity = 1
              } else {
                // Fade out
                labelOpacity = 1 - easeInCubic((timeSinceDetected - fadeOutStart) / fadeOutDuration)
              }
              
              return labelOpacity > 0.02 ? (
                <Text
                  position={[0, -1.5, 0]}
                  fontSize={0.18}
                  color="#ffaa00"
                  anchorX="center"
                  anchorY="center"
                  fontWeight="bold"
                  maxWidth={2}
                  transparent={true}
                  fillOpacity={labelOpacity}
                  strokeOpacity={labelOpacity}
                  opacity={labelOpacity}
                >
                  "I have this already"
                </Text>
              ) : null
            })()}
            
            {/* Phase 2: "⚡ Removing..." - Active removal message */}
            {(() => {
              const labelStart = 0.35
              const fadeInDuration = 0.15
              const holdStart = labelStart + fadeInDuration  // 0.5s
              const holdDuration = 0.6
              const fadeOutStart = holdStart + holdDuration  // 1.1s
              const fadeOutDuration = 0.25
              const labelEnd = fadeOutStart + fadeOutDuration  // 1.35s
              
              if (timeSinceDetected < labelStart || timeSinceDetected > labelEnd) return null
              
              let labelOpacity = 0
              if (timeSinceDetected < holdStart) {
                // Fade in
                labelOpacity = easeOutCubic((timeSinceDetected - labelStart) / fadeInDuration)
              } else if (timeSinceDetected < fadeOutStart) {
                // Hold with pulse effect
                labelOpacity = 0.85 + Math.sin((timeSinceDetected - holdStart) * 3) * 0.1
              } else {
                // Fade out
                labelOpacity = 1 - easeInCubic((timeSinceDetected - fadeOutStart) / fadeOutDuration)
              }
              
              return labelOpacity > 0.02 ? (
                <Text
                  position={[0, 1.2, 0.3]}
                  fontSize={0.15}
                  color="#ff6644"
                  anchorX="center"
                  anchorY="center"
                  fontWeight="bold"
                  transparent={true}
                  fillOpacity={labelOpacity}
                  strokeOpacity={labelOpacity}
                  opacity={labelOpacity}
                >
                  ⚡ Removing...
                </Text>
              ) : null
            })()}
            
            {/* Phase 3: "✓ Removed duplicate packet" - Confirmation message */}
            {(() => {
              const labelStart = 1.3
              const fadeInDuration = 0.15
              const holdStart = labelStart + fadeInDuration  // 1.45s
              const holdDuration = 0.35
              const fadeOutStart = holdStart + holdDuration  // 1.8s
              const fadeOutDuration = 0.15
              const labelEnd = fadeOutStart + fadeOutDuration  // 1.95s (ends BEFORE parent removal at 2.0s)
              
              if (timeSinceDetected < labelStart || timeSinceDetected > labelEnd) return null
              
              let labelOpacity = 0
              if (timeSinceDetected < holdStart) {
                // Fade in
                labelOpacity = easeOutCubic((timeSinceDetected - labelStart) / fadeInDuration)
              } else if (timeSinceDetected < fadeOutStart) {
                // Hold with gentle glow
                labelOpacity = 0.9 + Math.sin((timeSinceDetected - holdStart) * 3) * 0.08
              } else {
                // Fade out COMPLETELY
                labelOpacity = 1 - easeInCubic((timeSinceDetected - fadeOutStart) / fadeOutDuration)
              }
              
              return labelOpacity > 0.02 ? (
                <Text
                  position={[0, 0.9, 0.3]}
                  fontSize={0.17}
                  color="#4caf50"
                  anchorX="center"
                  anchorY="center"
                  fontWeight="bold"
                  transparent={true}
                  fillOpacity={labelOpacity}
                  strokeOpacity={labelOpacity}
                  opacity={labelOpacity}
                >
                  ✓ Removed duplicate packet
                </Text>
              ) : null
            })()}
          </group>
        )
      })}
    </group>
  )
}

export default ACKViz
