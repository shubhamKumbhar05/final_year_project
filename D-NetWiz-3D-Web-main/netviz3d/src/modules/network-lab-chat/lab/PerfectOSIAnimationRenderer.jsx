/**
 * Perfect OSI Animation Renderer
 * Complete example implementation showing all three phases
 * Ready to integrate into LabBuilder3D.jsx
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html, Line, Text } from '@react-three/drei'
import * as THREE from 'three'

// Import the new OSI animation modules
import {
  generateCompleteOSIAnimationSteps,
  calculateAnimationTiming,
  getStepExplanation,
} from './simulation/osiAnimationController'
import {
  PDUBox,
  EncapsulationVisualizer,
  HeaderInfoDisplay,
  TransportHeaderDisplay,
  NetworkHeaderDisplay,
  DataLinkHeaderDisplay,
} from './simulation/layerVisualizer'
import {
  GhostPeerConnection,
  PeerCommunicationStack,
  DeencapsulationVisualization,
  LayerIsolationVisualization,
} from './simulation/peerCommunication'

/**
 * Main animation component
 * Orchestrates all three phases with proper visualization
 */
export function PerfectOSIAnimationRenderer({
  sourceNode = null,
  destinationNode = null,
  simulationInput = {},
  errorToggles = {},
  onPhaseChange = () => {},
}) {
  // ============ STATE MANAGEMENT ============
  const [animationPlan, setAnimationPlan] = useState(null)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0) // 0=encap, 1=peer, 2=decap
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [showExplanations, setShowExplanations] = useState(true)

  // ============ GENERATE ANIMATION PLAN ============
  useEffect(() => {
    if (!sourceNode || !destinationNode) return

    const plan = generateCompleteOSIAnimationSteps({
      sourceNode,
      destinationNode,
      input: simulationInput,
      errorToggles,
    })

    setAnimationPlan(plan)
    setCurrentPhaseIndex(0)
    setCurrentStepIndex(0)
    onPhaseChange({
      phase: 'initialization',
      message: 'OSI Animation ready',
    })
  }, [sourceNode, destinationNode, simulationInput])

  // ============ ANIMATION LOOP ============
  useEffect(() => {
    if (!isPlaying || !animationPlan) return

    const currentPhase = animationPlan.phases[currentPhaseIndex]
    if (!currentPhase) return

    const currentStep = currentPhase.steps[currentStepIndex]
    const duration = calculateAnimationTiming(currentStep, errorToggles)
    const adjustedDuration = duration / speed

    const timer = setTimeout(() => {
      if (currentStepIndex < currentPhase.steps.length - 1) {
        // Next step in current phase
        setCurrentStepIndex(currentStepIndex + 1)
      } else if (currentPhaseIndex < 2) {
        // Move to next phase
        setCurrentPhaseIndex(currentPhaseIndex + 1)
        setCurrentStepIndex(0)
        onPhaseChange({
          phase: animationPlan.phases[currentPhaseIndex + 1].phase,
          title: animationPlan.phases[currentPhaseIndex + 1].title,
        })
      } else {
        // Animation complete
        setIsPlaying(false)
        onPhaseChange({
          phase: 'complete',
          message: 'OSI animation sequence complete!',
        })
      }
    }, adjustedDuration)

    return () => clearTimeout(timer)
  }, [isPlaying, currentPhaseIndex, currentStepIndex, speed, animationPlan, errorToggles])

  // ============ CONTROL HANDLERS ============
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleNextStep = useCallback(() => {
    const currentPhase = animationPlan.phases[currentPhaseIndex]
    if (currentStepIndex < currentPhase.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else if (currentPhaseIndex < 2) {
      setCurrentPhaseIndex(currentPhaseIndex + 1)
      setCurrentStepIndex(0)
    }
  }, [animationPlan, currentPhaseIndex, currentStepIndex])

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    } else if (currentPhaseIndex > 0) {
      const prevPhase = animationPlan.phases[currentPhaseIndex - 1]
      setCurrentPhaseIndex(currentPhaseIndex - 1)
      setCurrentStepIndex(prevPhase.steps.length - 1)
    }
  }, [animationPlan, currentPhaseIndex, currentStepIndex])

  const handleReset = useCallback(() => {
    setCurrentPhaseIndex(0)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [])

  const handlePhaseJump = useCallback((phaseIndex) => {
    setCurrentPhaseIndex(phaseIndex)
    setCurrentStepIndex(0)
    setIsPlaying(false)
  }, [])

  // ============ RENDER LOGIC ============
  if (!animationPlan) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
        <div className="text-white text-center">
          <p className="mb-2">Loading OSI Animation...</p>
          <p className="text-sm text-gray-400">
            Please select both source and destination devices
          </p>
        </div>
      </div>
    )
  }

  const currentPhase = animationPlan.phases[currentPhaseIndex]
  const currentStep = currentPhase.steps[currentStepIndex]
  const phaseTitle = currentPhase.title
  const phaseDescription = currentPhase.description

  return (
    <div className="w-full h-full flex flex-col bg-slate-950">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <Canvas camera={{ position: [0, 2, 5], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />

          {/* Phase 1: Encapsulation Visualization */}
          {currentPhaseIndex === 0 && (
            <group>
              {/* Sender side */}
              <group position={[-3, 0, 0]}>
                <Text position={[0, 3, 0]} fontSize={0.3} color="#fff">
                  {sourceNode?.config?.name || 'Sender'}
                </Text>
                <EncapsulationVisualizer
                  packet={currentStep}
                  activeLayer={currentStep.layerId}
                  position={[0, 0, 0]}
                />
              </group>

              {/* Arrow showing downward flow */}
              <Line
                points={[[-3, -2, 0], [-3, -4, 0]]}
                color="#999"
                lineWidth={2}
              />

              {/* Wire/Physical medium */}
              <Line
                points={[[-3, -5, 0], [3, -5, 0]]}
                color="#666"
                lineWidth={3}
              />

              {/* Header information on right */}
              {currentStep.headers && (
                <HeaderInfoDisplay pdu={currentStep} position={[1, 0, 0]} />
              )}

              {/* Layer-specific detailed info */}
              {currentStep.layerId === 'transport' && currentStep.headers && (
                <TransportHeaderDisplay
                  segment={currentStep.headers}
                  position={[1, -2, 0]}
                />
              )}
              {currentStep.layerId === 'network' && currentStep.headers && (
                <NetworkHeaderDisplay
                  packet={currentStep.headers}
                  position={[1, -2, 0]}
                />
              )}
              {currentStep.layerId === 'datalink' && currentStep.headers && (
                <DataLinkHeaderDisplay
                  frame={currentStep.headers}
                  position={[1, -2, 0]}
                />
              )}
            </group>
          )}

          {/* Phase 2: Peer Communication Visualization */}
          {currentPhaseIndex === 1 && (
            <group>
              {/* Sender position */}
              <group position={[-4, 0, 0]}>
                <Text position={[0, 4, 0]} fontSize={0.3} color="#fff">
                  {sourceNode?.config?.name || 'Sender'}
                </Text>
              </group>

              {/* OSI Stack at sender */}
              <LayerIsolationVisualization
                activeLayer={currentStep.layerId}
                position={[-4, 0, 0]}
              />

              {/* Receiver position */}
              <group position={[4, 0, 0]}>
                <Text position={[0, 4, 0]} fontSize={0.3} color="#fff">
                  {destinationNode?.config?.name || 'Receiver'}
                </Text>
              </group>

              {/* OSI Stack at receiver */}
              <LayerIsolationVisualization
                activeLayer={currentStep.layerId}
                position={[4, 0, 0]}
              />

              {/* Ghost peer connections */}
              <PeerCommunicationStack
                senderPos={[-4, 0, 0]}
                receiverPos={[4, 0, 0]}
                activeLayer={currentStep.layerId}
                showAll={false}
              />
            </group>
          )}

          {/* Phase 3: Decapsulation Visualization */}
          {currentPhaseIndex === 2 && (
            <group>
              {/* Receiver side - showing header stripping */}
              <group position={[3, 0, 0]}>
                <Text position={[0, 3, 0]} fontSize={0.3} color="#fff">
                  {destinationNode?.config?.name || 'Receiver'}
                </Text>

                {/* Show decapsulation process */}
                <DeencapsulationVisualization
                  currentLayer={currentStep.layerId}
                  position={[0, 1, 0]}
                />

                {/* Display what's being stripped */}
                {currentStep.visualization?.stripHeader && (
                  <Text
                    position={[0, -1, 0]}
                    fontSize={0.25}
                    color="#22c55e"
                    anchorX="center"
                  >
                    ✓ Header stripped
                  </Text>
                )}

                {currentStep.visualization?.stripTrailer && (
                  <Text
                    position={[0, -1.3, 0]}
                    fontSize={0.25}
                    color="#22c55e"
                    anchorX="center"
                  >
                    ✓ Trailer stripped
                  </Text>
                )}
              </group>

              {/* Encapsulation hierarchy diagram */}
              <EncapsulationVisualizer
                packet={currentStep}
                activeLayer={currentStep.layerId}
                position={[-3, 0, 0]}
              />
            </group>
          )}

          <OrbitControls />
        </Canvas>

        {/* Step Information Overlay */}
        <div className="absolute top-4 left-4 bg-slate-800 bg-opacity-90 p-4 rounded text-white max-w-sm">
          <h2 className="text-lg font-bold mb-2">{phaseTitle}</h2>
          <p className="text-sm text-gray-300 mb-3">{phaseDescription}</p>
          <p className="text-xs font-mono bg-slate-900 p-2 rounded mb-2">
            Phase {currentPhaseIndex + 1} of 3 | Step {currentStepIndex + 1} of{' '}
            {currentPhase.steps.length}
          </p>
          <p className="text-xs text-yellow-300 font-bold mb-2">
            {currentStep.title}
          </p>
          {showExplanations && (
            <p className="text-xs text-gray-400">{currentStep.description}</p>
          )}
        </div>

        {/* Phase Indicator */}
        <div className="absolute top-4 right-4 flex gap-2">
          {animationPlan.phases.map((phase, idx) => (
            <button
              key={idx}
              onClick={() => handlePhaseJump(idx)}
              className={`px-3 py-2 rounded text-sm font-bold transition ${
                idx === currentPhaseIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
              }`}
            >
              Phase {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-slate-900 border-t border-slate-700 p-4">
        {/* Phase info */}
        <div className="mb-4 text-white text-sm">
          <p className="font-bold">{phaseTitle}</p>
          <p className="text-gray-400">{phaseDescription}</p>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition"
            title="Reset animation"
          >
            ⟲ Reset
          </button>

          <button
            onClick={handlePrevStep}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            title="Previous step"
          >
            ← Previous
          </button>

          <button
            onClick={handlePlayPause}
            className={`px-6 py-2 font-bold text-white rounded transition ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button
            onClick={handleNextStep}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            title="Next step"
          >
            Next →
          </button>

          {/* Speed control */}
          <div className="flex items-center gap-2">
            <label className="text-white text-sm">Speed:</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="px-2 py-1 bg-slate-800 text-white rounded text-sm"
            >
              <option value={0.5}>0.5x</option>
              <option value={1.0}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2x</option>
            </select>
          </div>

          {/* Show explanations toggle */}
          <button
            onClick={() => setShowExplanations(!showExplanations)}
            className={`px-4 py-2 rounded transition ${
              showExplanations
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
            title="Toggle explanations"
          >
            {showExplanations ? '💬 Hide' : '💬 Show'} Notes
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-700 rounded h-2">
          <div
            className="bg-blue-600 h-full rounded transition-all"
            style={{
              width: `${
                ((currentPhaseIndex * 100) / 3 +
                  ((currentStepIndex + 1) / currentPhase.steps.length / 3) * 100) %
                100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default PerfectOSIAnimationRenderer
