/**
 * Traversal Timeline Animation Controller
 * Handles frame travel from sender to receiver with:
 * - Bitstream animation at L1
 * - Propagation delay
 * - Router processing
 * - Real-world timing based on calculations
 */

import React, { useEffect, useState } from 'react'
import { Line, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { stringToBits, bitsToString } from './protocolCalculationEngine'

/**
 * Bitstream representation - animated 1s and 0s
 */
export function BitstreamAnimation({
  payload,
  progress = 0, // 0 to 1
  position = [0, 0, 0],
  isActive = false,
}) {
  // Convert to bits
  const bits = stringToBits(payload)
  const bitsPerRow = 32
  const totalRows = Math.ceil(bits.length / bitsPerRow)

  // Determine how many bits to show based on progress
  const bitsToShow = Math.floor((bits.length) * progress)

  const displayBits = bits.substring(0, bitsToShow)

  return (
    <group position={position}>
      {/* Title */}
      <Text
        position={[0, totalRows * 0.4 + 0.3, 0]}
        fontSize={0.25}
        color="#6b7280"
        anchorX="center"
      >
        BITSTREAM (L1): {displayBits.length} / {bits.length} bits
      </Text>

      {/* Bits display */}
      <group position={[0, 0, 0]}>
        {displayBits.split('').map((bit, idx) => {
          const row = Math.floor(idx / bitsPerRow)
          const col = idx % bitsPerRow
          const xPos = (col - bitsPerRow / 2) * 0.15
          const yPos = -row * 0.4

          return (
            <group key={idx} position={[xPos, yPos, 0]}>
              {/* Bit box */}
              <mesh>
                <boxGeometry args={[0.12, 0.12, 0.02]} />
                <meshStandardMaterial
                  color={bit === '1' ? '#fbbf24' : '#3b82f6'}
                  emissive={bit === '1' ? new THREE.Color('#fbbf24') : new THREE.Color('#000000')}
                  emissiveIntensity={isActive && idx === displayBits.length - 1 ? 0.8 : 0}
                />
              </mesh>

              {/* Bit text */}
              <Text
                position={[0, 0, 0.02]}
                fontSize={0.08}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
              >
                {bit}
              </Text>
            </group>
          )
        })}
      </group>

      {/* Progress indicators */}
      {isActive && (
        <>
          <Text
            position={[0, -totalRows * 0.4 - 0.3, 0]}
            fontSize={0.12}
            color="#88ff00"
            anchorX="center"
          >
            Transmitting: {(progress * 100).toFixed(1)}%
          </Text>
        </>
      )}
    </group>
  )
}

/**
 * Physical wire connecting sender and receiver
 */
export function Wire({
  senderPos = [-5, 0, 0],
  receiverPos = [5, 0, 0],
  frameProgress = 0, // 0 to 1
  bitStreamProgress = 0, // 0 to 1 for bitstream animation
  wireMaterialColor = '#404040',
}) {
  const startX = senderPos[0]
  const endX = receiverPos[0]
  const wireLength = endX - startX

  // Current position of frame on wire
  const currentX = startX + wireLength * frameProgress

  return (
    <group>
      {/* Wire itself */}
      <Line
        points={[senderPos, receiverPos]}
        color={wireMaterialColor}
        lineWidth={8}
      />

      {/* Wire glow effect when transmitting */}
      <Line
        points={[senderPos, [currentX, senderPos[1], senderPos[2]]]}
        color="#88ff00"
        lineWidth={4}
        opacity={frameProgress < 1 ? 0.6 : 0}
      />

      {/* Frame position indicator - shows where frame is on wire */}
      {frameProgress > 0 && frameProgress < 1 && (
        <group position={[currentX, senderPos[1], senderPos[2]]}>
          {/* Glow sphere at frame position */}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#88ff00"
              emissiveIntensity={0.8}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Progress label */}
          <Html position={[0, 0.5, 0]} scale={0.8}>
            <div
              style={{
                background: '#1e293b',
                border: '1px solid #88ff00',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                color: '#88ff00',
              }}
            >
              Frame on wire: {(frameProgress * 100).toFixed(0)}%
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}

/**
 * Router node - processes packets
 */
export function Router({
  position = [0, 0, 0],
  isProcessing = false,
  ttl = 64,
}) {
  return (
    <group position={position}>
      {/* Router device */}
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial
          color="#f97316"
          emissive={isProcessing ? new THREE.Color('#f97316') : new THREE.Color('#000000')}
          emissiveIntensity={isProcessing ? 0.8 : 0.2}
        />
      </mesh>

      {/* Router label */}
      <Text
        position={[0, -0.6, 0]}
        fontSize={0.2}
        color="#f97316"
        anchorX="center"
        anchorY="top"
      >
        ROUTER
      </Text>

      {/* Processing indicator */}
      {isProcessing && (
        <>
          <Text
            position={[0, 0, 0.4]}
            fontSize={0.15}
            color="#fbbf24"
            anchorX="center"
            anchorY="middle"
          >
            Processing...
          </Text>
          <Text
            position={[0, -0.15, 0.4]}
            fontSize={0.12}
            color="#94a3b8"
            anchorX="center"
            anchorY="middle"
          >
            {`TTL: ${ttl - 1}→${ttl}`}
          </Text>
        </>
      )}
    </group>
  )
}

/**
 * Timeline controller component
 * Manages the entire traversal animation
 */
export class TraversalTimeline {
  constructor(protocolData, errorInjection = null) {
    this.protocolData = protocolData
    this.errorInjection = errorInjection || { errors: 0 }

    // Extract timing information
    const { timeline, summary } = protocolData
    this.frameLoadTime = timeline.frameLoadTime // Time to load onto wire (transmission delay)
    this.propagationTime = timeline.propagationTime // Time on wire
    this.processingTime = timeline.processingTime // Processing at hops
    this.totalTime = timeline.totalTime

    // Animation phases
    this.phases = [
      {
        name: 'frame_load',
        duration: this.frameLoadTime,
        description: 'Loading frame onto wire',
      },
      {
        name: 'propagation',
        duration: this.propagationTime,
        description: 'Frame traveling on wire',
      },
      {
        name: 'processing',
        duration: this.processingTime,
        description: 'Router processing',
      },
      {
        name: 'reassembly',
        duration: this.frameLoadTime,
        description: 'Reassembling at receiver',
      },
    ]

    // Calculate cumulative times
    this.phaseTimes = {}
    let cumulativeTime = 0
    this.phases.forEach((phase) => {
      this.phaseTimes[phase.name] = {
        start: cumulativeTime,
        end: cumulativeTime + phase.duration,
        duration: phase.duration,
      }
      cumulativeTime += phase.duration
    })

    this.animationTotalTime = cumulativeTime
  }

  getCurrentPhase(elapsedTime) {
    for (const phase of this.phases) {
      const timing = this.phaseTimes[phase.name]
      if (elapsedTime >= timing.start && elapsedTime <= timing.end) {
        const phaseProgress = (elapsedTime - timing.start) / phase.duration
        return {
          phase: phase.name,
          progress: phaseProgress,
          description: phase.description,
        }
      }
    }

    return {
      phase: 'complete',
      progress: 1,
      description: 'Animation complete',
    }
  }

  getFrameProgress(elapsedTime) {
    // Frame progress on wire (0 to 1)
    const propagationStart = this.phaseTimes.frame_load.end
    const propagationEnd = propagationStart + this.propagationTime

    if (elapsedTime < propagationStart) return 0
    if (elapsedTime > propagationEnd) return 1

    return (elapsedTime - propagationStart) / this.propagationTime
  }

  getBitstreamProgress(elapsedTime) {
    // Bitstream animation progress (0 to 1)
    const frameLoadStart = this.phaseTimes.frame_load.start
    const frameLoadEnd = this.phaseTimes.frame_load.end

    if (elapsedTime < frameLoadStart) return 0
    if (elapsedTime > frameLoadEnd) return 1

    return (elapsedTime - frameLoadStart) / this.frameLoadTime
  }

  getAnimationState(elapsedTime) {
    const totalProgress = Math.min(elapsedTime / this.animationTotalTime, 1)
    const currentPhase = this.getCurrentPhase(elapsedTime)
    const frameProgress = this.getFrameProgress(elapsedTime)
    const bitstreamProgress = this.getBitstreamProgress(elapsedTime)

    return {
      totalProgress,
      currentPhase,
      frameProgress, // Position on wire
      bitstreamProgress, // Bitstream loading animation
      elapsedTime,
      totalAnimationTime: this.animationTotalTime,
      isComplete: totalProgress >= 1,
    }
  }

  getDelayBreakdown() {
    return {
      transmission: this.frameLoadTime,
      propagation: this.propagationTime,
      processing: this.processingTime,
      total: this.totalTime,
      percentages: {
        transmission: (this.frameLoadTime / this.totalTime * 100).toFixed(1),
        propagation: (this.propagationTime / this.totalTime * 100).toFixed(1),
        processing: (this.processingTime / this.totalTime * 100).toFixed(1),
      },
    }
  }
}

/**
 * React component for animated traversal
 */
export function AnimatedTraversal({
  protocolData,
  isPlaying = false,
  speed = 1,
  senderPos = [-5, 0, 0],
  receiverPos = [5, 0, 0],
  onPhaseChange = null,
  onComplete = null,
}) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [timeline] = useState(() => new TraversalTimeline(protocolData))
  const [state, setState] = useState(() => timeline.getAnimationState(0))

  useEffect(() => {
    if (!isPlaying) return

    let animationFrameId
    let lastTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const deltaTime = (now - lastTime) / 1000 * speed // Convert to seconds and apply speed
      lastTime = now

      setElapsedTime((prev) => {
        const newTime = prev + deltaTime
        const newState = timeline.getAnimationState(newTime)
        setState(newState)

        if (onPhaseChange && newState.currentPhase) {
          onPhaseChange(newState)
        }

        if (newState.isComplete && onComplete) {
          onComplete(newState)
        }

        return newTime
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPlaying, speed, timeline, onPhaseChange, onComplete])

  const { frameProgress, bitstreamProgress, currentPhase } = state
  const payload = protocolData.config.userInput

  return (
    <group>
      {/* Sender node */}
      <mesh position={senderPos}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={0.5} />
      </mesh>
      <Text position={[senderPos[0], senderPos[1] - 0.7, senderPos[2]]} fontSize={0.2} color="#34d399">
        SENDER
      </Text>

      {/* Bitstream animation at sender (phase 1) */}
      {currentPhase.phase === 'frame_load' && (
        <BitstreamAnimation
          payload={payload}
          progress={bitstreamProgress}
          position={[senderPos[0], senderPos[1] + 1, senderPos[2]]}
          isActive={true}
        />
      )}

      {/* Wire with frame */}
      <Wire
        senderPos={senderPos}
        receiverPos={receiverPos}
        frameProgress={frameProgress}
        bitStreamProgress={bitstreamProgress}
      />

      {/* Router in middle (simulated) */}
      {currentPhase.phase === 'processing' && (
        <Router
          position={[(senderPos[0] + receiverPos[0]) / 2, senderPos[1], senderPos[2]]}
          isProcessing={true}
          ttl={protocolData.layers.network.ttl}
        />
      )}

      {/* Receiver node */}
      <mesh position={receiverPos}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive={frameProgress > 0.9 ? new THREE.Color('#60a5fa') : new THREE.Color('#1e40af')}
          emissiveIntensity={frameProgress > 0.9 ? 0.7 : 0.2}
        />
      </mesh>
      <Text position={[receiverPos[0], receiverPos[1] - 0.7, receiverPos[2]]} fontSize={0.2} color="#60a5fa">
        RECEIVER
      </Text>

      {/* Status display */}
      <Html position={[0, 3, 0]} scale={1}>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #60a5fa',
            padding: '12px 16px',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '12px',
            minWidth: '250px',
          }}
        >
          <div style={{ marginBottom: '8px', color: '#60a5fa', fontWeight: 'bold' }}>
            {currentPhase.description}
          </div>
          <div style={{ marginBottom: '4px', color: '#94a3b8' }}>
            Phase: {currentPhase.phase}
          </div>
          <div style={{ marginBottom: '4px', color: '#94a3b8' }}>
            Progress: {(state.totalProgress * 100).toFixed(1)}%
          </div>
          <div style={{ color: '#94a3b8' }}>
            Time: {state.elapsedTime.toFixed(2)}ms / {state.totalAnimationTime.toFixed(2)}ms
          </div>
        </div>
      </Html>

      {/* Delay breakdown info */}
      <Html position={[0, -3, 0]} scale={0.9}>
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #8b5cf6',
            padding: '10px 14px',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '11px',
          }}
        >
          <div style={{ marginBottom: '6px', color: '#8b5cf6', fontWeight: 'bold' }}>
            Delay Breakdown
          </div>
          <div style={{ marginBottom: '2px' }}>
            Transmission: {timeline.frameLoadTime.toFixed(2)}ms
          </div>
          <div style={{ marginBottom: '2px' }}>
            Propagation: {timeline.propagationTime.toFixed(2)}ms
          </div>
          <div style={{ marginBottom: '2px' }}>
            Processing: {timeline.processingTime.toFixed(2)}ms
          </div>
          <div style={{ fontWeight: 'bold', color: '#fbbf24', marginTop: '6px' }}>
            Total: {timeline.totalTime.toFixed(2)}ms
          </div>
        </div>
      </Html>
    </group>
  )
}

export default {
  TraversalTimeline,
  AnimatedTraversal,
  BitstreamAnimation,
  Wire,
  Router,
}
