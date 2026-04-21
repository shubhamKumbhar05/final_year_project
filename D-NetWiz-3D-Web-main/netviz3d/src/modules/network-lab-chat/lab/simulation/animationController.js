import { getLayerMeta } from './osiLayers'

export function getLayerColor(layerId) {
  return getLayerMeta(layerId)?.color || '#22d3ee'
}

export function getStepDurationMs(step, errorToggles) {
  const base = 1200

  if (step.type === 'event' && step.severity === 'error') {
    return 1700
  }

  if (errorToggles.highLatency) {
    return base + 900
  }

  if (errorToggles.congestion) {
    return base + 400
  }

  return base
}

export function getPacketAnimationSpeed(step, errorToggles) {
  const isTransit = step?.type === 'transit'
  if (!isTransit) return 0.06

  if (errorToggles.highLatency) return 0.04
  if (errorToggles.congestion) return 0.05
  return 0.09
}
