/**
 * Traversal Logic - Bridge between Protocol Calculations and Animation
 * Provides utilities for network simulation, bitstream generation, and timeline creation
 */

/**
 * NetworkSimulation class - simulates network transmission
 */
export class NetworkSimulation {
  constructor(protocolStack) {
    this.protocolStack = protocolStack
    this.status = 'idle' // idle, transmitting, received, error
    this.progress = 0
    this.startTime = null
  }

  start() {
    this.status = 'transmitting'
    this.startTime = Date.now()
    this.progress = 0
  }

  update(elapsedMs) {
    if (this.status !== 'transmitting') return

    const totalDelay = this.protocolStack.layers.physical.delays?.total || 
                      this.protocolStack.layers.physical.totalDelay || 0
    const totalDelayMs = totalDelay * 1000

    this.progress = Math.min(1, elapsedMs / totalDelayMs)

    if (this.progress >= 1) {
      this.status = 'received'
    }
  }

  getProgress() {
    return this.progress
  }

  getStatus() {
    return this.status
  }

  reset() {
    this.status = 'idle'
    this.progress = 0
    this.startTime = null
  }
}

/**
 * Generate traversal timeline with phases
 */
export function generateTraversalTimeline({
  sourceNode,
  destNode,
  numHops = 2,
  totalDelay = 0.01,
  wireLength = 500,
}) {
  const delays = {
    transmission: totalDelay * 0.3, // 30% transmission
    propagation: totalDelay * 0.5,  // 50% propagation
    processing: totalDelay * 0.2,   // 20% processing
  }

  const phases = [
    {
      name: 'load_transmission',
      description: 'Loading frame onto wire',
      duration: delays.transmission,
      progress: 0,
    },
    {
      name: 'propagation',
      description: 'Propagating through medium',
      duration: delays.propagation,
      progress: 0,
    },
    {
      name: 'processing',
      description: 'Processing at intermediate nodes',
      duration: delays.processing,
      progress: 0,
    },
    {
      name: 'reassembly',
      description: 'Reassembling at receiver',
      duration: delays.transmission,
      progress: 0,
    },
  ]

  const timeline = {
    sourceNode,
    destNode,
    numHops,
    totalDuration: totalDelay,
    totalDurationMs: totalDelay * 1000,
    wireLength,
    phases,
    currentPhase: 0,
  }

  return timeline
}

/**
 * Generate bitstream from protocol data
 */
export function generateBitstream(bitStreamData = '') {
  // If bitStreamData is already a string of bits, use it
  // Otherwise generate a default bitstream
  
  if (bitStreamData && typeof bitStreamData === 'string') {
    return bitStreamData.split('').map((bit, idx) => ({
      value: bit,
      color: bit === '1' ? '#22c55e' : '#64748b',
      index: idx,
    }))
  }

  // Generate default 32-bit pattern (4 rows of 8 bits)
  const defaultBits = '11010110110101101010101010101010'
  
  return defaultBits.split('').map((bit, idx) => ({
    value: bit,
    color: bit === '1' ? '#22c55e' : '#64748b',
    index: idx,
  }))
}

/**
 * Calculate bitstream progress based on animation progress
 */
export function calculateBitstreamProgress(animationProgress, totalBits) {
  // Show more bits as animation progresses
  return Math.ceil(animationProgress * totalBits * 2)
}

/**
 * Get animation phase info at a given progress
 */
export function getAnimationPhaseAtProgress(timeline, progress) {
  if (!timeline) return null

  const totalDuration = timeline.totalDuration
  let accumulatedTime = 0

  for (const phase of timeline.phases) {
    const phaseStart = accumulatedTime / totalDuration
    const phaseEnd = (accumulatedTime + phase.duration) / totalDuration

    if (progress >= phaseStart && progress < phaseEnd) {
      const phaseProgress = (progress - phaseStart) / (phaseEnd - phaseStart)
      return {
        phase: phase.name,
        description: phase.description,
        progress: phaseProgress,
        phaseIndex: timeline.phases.indexOf(phase),
      }
    }

    accumulatedTime += phase.duration
  }

  // After all phases
  return {
    phase: 'complete',
    description: 'Transmission complete',
    progress: 1,
    phaseIndex: timeline.phases.length - 1,
  }
}

/**
 * Get frame position along path
 */
export function getFramePositionAlongPath(sourcePos, destPos, progress) {
  const [sx, sy, sz] = sourcePos
  const [dx, dy, dz] = destPos

  const x = sx + (dx - sx) * progress
  const y = sy + (dy - sy) * progress
  const z = sz + (dz - sz) * progress

  return [x, y, z]
}

/**
 * Create router node at intermediate position
 */
export function createRouterAtPosition(progress) {
  // Router appears at 50% of journey for processing phase
  if (progress >= 0.35 && progress <= 0.65) {
    return {
      visible: true,
      progress: (progress - 0.35) / 0.3, // Normalize to 0-1 within processing phase
    }
  }

  return { visible: false, progress: 0 }
}

/**
 * Calculate bit error injection for simulation
 */
export function injectBitErrors(bitstream, errorRate = 0.02) {
  return bitstream.map((bit) => {
    if (Math.random() < errorRate) {
      return {
        ...bit,
        value: bit.value === '1' ? '0' : '1',
        corrupted: true,
        color: '#ef4444', // Show corrupted bits in red
      }
    }
    return bit
  })
}

/**
 * Calculate TTL decrement at router
 */
export function decrementTTL(ttl) {
  return Math.max(0, ttl - 1)
}

/**
 * Validate if frame will reach destination
 */
export function validateFrameReachability(ttl, numHops) {
  return ttl > numHops
}

/**
 * Get transmission speed based on medium
 */
export function getTransmissionSpeed(medium = 'ethernet-cable') {
  const speeds = {
    'fiber-cable': 0.67, // ~2/3 speed of light
    'ethernet-cable': 0.77, // copper speed
    'wireless-link': 1, // approximate signal speed
  }
  return speeds[medium] || speeds['ethernet-cable']
}

/**
 * Format delay value for display
 */
export function formatDelay(delayMs) {
  if (delayMs < 0.001) {
    return `${(delayMs * 1000000).toFixed(2)}µs`
  }
  if (delayMs < 1) {
    return `${(delayMs * 1000).toFixed(3)}ms`
  }
  return `${delayMs.toFixed(2)}s`
}

/**
 * Calculate optimal animation speed based on actual delay
 */
export function calculateAnimationSpeed(actualDelayMs, targetDisplayMs = 3000) {
  // If actual delay is 5ms but we want to display it in 3 seconds
  // speed multiplier = 3000ms / 5ms = 600x
  return Math.max(1, targetDisplayMs / actualDelayMs)
}

export default {
  NetworkSimulation,
  generateTraversalTimeline,
  generateBitstream,
  calculateBitstreamProgress,
  getAnimationPhaseAtProgress,
  getFramePositionAlongPath,
  createRouterAtPosition,
  injectBitErrors,
  decrementTTL,
  validateFrameReachability,
  getTransmissionSpeed,
  formatDelay,
  calculateAnimationSpeed,
}
