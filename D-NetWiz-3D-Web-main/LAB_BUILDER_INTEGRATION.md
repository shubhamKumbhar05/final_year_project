# LabBuilder3D Integration - Step by Step

## 📌 How to Integrate the Perfect OSI Animation into LabBuilder3D.jsx

This guide shows exactly where to add code in LabBuilder3D.jsx to enable the logically perfect OSI animation.

## Step 1: Add Imports (Top of LabBuilder3D.jsx)

After existing imports, add:

```javascript
// ✨ NEW: Perfect OSI Animation imports
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
```

## Step 2: Add State Variables

In the LabBuilder3D main function component, after existing useState calls, add:

```javascript
// ✨ NEW: OSI Animation state
const [osiAnimationPlan, setOsiAnimationPlan] = useState(null)
const [osiPhaseIndex, setOsiPhaseIndex] = useState(0)        // 0=encap, 1=peer, 2=decap
const [osiStepIndex, setOsiStepIndex] = useState(0)
const [osiIsPlaying, setOsiIsPlaying] = useState(false)
const [osiAnimationSpeed, setOsiAnimationSpeed] = useState(1.0)
const [osiShowMode, setOsiShowMode] = useState(null)         // 'perfect-osi' or null
```

## Step 3: Add Animation Generation Effect

After other useEffect hooks, add:

```javascript
// ✨ NEW: Generate perfect OSI animation when nodes/input change
useEffect(() => {
  // Only generate if we're in perfect OSI mode and have source/dest
  if (osiShowMode !== 'perfect-osi' || !selectedSourceNode || !selectedDestinationNode) {
    setOsiAnimationPlan(null)
    return
  }

  try {
    const plan = generateCompleteOSIAnimationSteps({
      sourceNode: selectedSourceNode,
      destinationNode: selectedDestinationNode,
      input: {
        protocol: simulationInput.protocol || 'TCP',
        port: simulationInput.port || 49152,
        packetSize: simulationInput.packetSize || 256,
        payload: simulationInput.payload || 'Test Data',
        dataType: simulationInput.dataType || 'HTTP Request',
      },
      errorToggles,
    })

    setOsiAnimationPlan(plan)
    setOsiPhaseIndex(0)
    setOsiStepIndex(0)
    setOsiIsPlaying(false)
  } catch (error) {
    console.error('Failed to generate OSI animation:', error)
  }
}, [osiShowMode, selectedSourceNode, selectedDestinationNode, simulationInput, errorToggles])
```

## Step 4: Add Animation Loop

Add a useEffect for animation playback:

```javascript
// ✨ NEW: OSI animation playback loop
useEffect(() => {
  if (!osiIsPlaying || !osiAnimationPlan) return

  const currentPhase = osiAnimationPlan.phases[osiPhaseIndex]
  if (!currentPhase || !currentPhase.steps[osiStepIndex]) return

  const currentStep = currentPhase.steps[osiStepIndex]
  const baseDuration = currentStep.duration || 1000
  const adjustedDuration = calculateAnimationTiming(currentStep, errorToggles)
  const finalDuration = adjustedDuration / osiAnimationSpeed

  const timer = setTimeout(() => {
    // Try to advance to next step
    if (osiStepIndex < currentPhase.steps.length - 1) {
      // Next step in current phase
      setOsiStepIndex(osiStepIndex + 1)
    } else if (osiPhaseIndex < 2) {
      // Move to next phase
      setOsiPhaseIndex(osiPhaseIndex + 1)
      setOsiStepIndex(0)
    } else {
      // Animation complete
      setOsiIsPlaying(false)
      console.log('✅ OSI Animation sequence complete!')
    }
  }, finalDuration)

  return () => clearTimeout(timer)
}, [osiIsPlaying, osiPhaseIndex, osiStepIndex, osiAnimationPlan, osiAnimationSpeed, errorToggles])
```

## Step 5: Add Control Functions

Add these functions to LabBuilder3D:

```javascript
// ✨ NEW: OSI Animation control functions
const handleOsiPlayPause = useCallback(() => {
  setOsiIsPlaying(!osiIsPlaying)
}, [osiIsPlaying])

const handleOsiNextStep = useCallback(() => {
  if (!osiAnimationPlan) return

  const currentPhase = osiAnimationPlan.phases[osiPhaseIndex]
  if (osiStepIndex < currentPhase.steps.length - 1) {
    setOsiStepIndex(osiStepIndex + 1)
  } else if (osiPhaseIndex < 2) {
    setOsiPhaseIndex(osiPhaseIndex + 1)
    setOsiStepIndex(0)
  }
}, [osiAnimationPlan, osiPhaseIndex, osiStepIndex])

const handleOsiPrevStep = useCallback(() => {
  if (osiStepIndex > 0) {
    setOsiStepIndex(osiStepIndex - 1)
  } else if (osiPhaseIndex > 0) {
    const prevPhase = osiAnimationPlan.phases[osiPhaseIndex - 1]
    setOsiPhaseIndex(osiPhaseIndex - 1)
    setOsiStepIndex(prevPhase.steps.length - 1)
  }
}, [osiAnimationPlan, osiPhaseIndex, osiStepIndex])

const handleOsiReset = useCallback(() => {
  setOsiPhaseIndex(0)
  setOsiStepIndex(0)
  setOsiIsPlaying(false)
}, [])

const handleOsiPhaseJump = useCallback((phaseIndex) => {
  setOsiPhaseIndex(phaseIndex)
  setOsiStepIndex(0)
  setOsiIsPlaying(false)
}, [])

const handleOsiModeToggle = useCallback((mode) => {
  setOsiShowMode(osiShowMode === mode ? null : mode)
  handleOsiReset()
}, [osiShowMode])
```

## Step 6: Add Rendering Component

Find the existing Canvas component in your render section and add the OSI animation rendering inside it:

```javascript
{/* ✨ NEW: Perfect OSI Animation Rendering */}
{osiShowMode === 'perfect-osi' && osiAnimationPlan && (
  <group>
    {(() => {
      const currentPhase = osiAnimationPlan.phases[osiPhaseIndex]
      const currentStep = currentPhase.steps[osiStepIndex]

      // Phase 1: Encapsulation Visualization
      if (osiPhaseIndex === 0) {
        return (
          <group>
            {/* Sender node on left */}
            <group position={[-4, 0, 0]}>
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial color="#22c55e" />
              </mesh>
              <Html
                position={[0, 1.2, 0]}
                center
                occlude="blurred"
              >
                <div className="text-white text-xs bg-slate-800 px-2 py-1 rounded">
                  {selectedSourceNode?.config?.name || 'Sender'}
                </div>
              </Html>
            </group>

            {/* PDU encapsulation stack in center-left */}
            <EncapsulationVisualizer
              packet={currentStep}
              activeLayer={currentStep.layerId}
              position={[-2, 0, 0]}
            />

            {/* Header information on right */}
            {currentStep.headers && (
              <group position={[2, 0, 0]}>
                <HeaderInfoDisplay
                  pdu={currentStep}
                  position={[0, 1, 0]}
                />

                {currentStep.layerId === 'transport' && (
                  <TransportHeaderDisplay
                    segment={currentStep.headers}
                    position={[0, -1, 0]}
                  />
                )}

                {currentStep.layerId === 'network' && (
                  <NetworkHeaderDisplay
                    packet={currentStep.headers}
                    position={[0, -1, 0]}
                  />
                )}

                {currentStep.layerId === 'datalink' && (
                  <DataLinkHeaderDisplay
                    frame={currentStep.headers}
                    position={[0, -1, 0]}
                  />
                )}
              </group>
            )}

            {/* Information text */}
            <Html position={[-5, 3, 0]} occlude="blurred">
              <div className="text-white text-sm bg-slate-800 bg-opacity-90 p-3 rounded w-80">
                <p className="font-bold mb-1">{currentStep.title}</p>
                <p className="text-xs text-gray-300">{currentStep.description}</p>
              </div>
            </Html>
          </group>
        )
      }

      // Phase 2: Peer Communication Visualization
      if (osiPhaseIndex === 1) {
        return (
          <group>
            {/* Sender stack */}
            <group position={[-4, 0, 0]}>
              <Html position={[0, 3, 0]} occlude="blurred">
                <div className="text-white text-xs bg-slate-800 px-2 py-1 rounded">
                  {selectedSourceNode?.config?.name || 'Sender'}
                </div>
              </Html>
              <LayerIsolationVisualization
                activeLayer={currentStep.layerId}
                position={[0, 0, 0]}
              />
            </group>

            {/* Receiver stack */}
            <group position={[4, 0, 0]}>
              <Html position={[0, 3, 0]} occlude="blurred">
                <div className="text-white text-xs bg-slate-800 px-2 py-1 rounded">
                  {selectedDestinationNode?.config?.name || 'Receiver'}
                </div>
              </Html>
              <LayerIsolationVisualization
                activeLayer={currentStep.layerId}
                position={[0, 0, 0]}
              />
            </group>

            {/* Ghost peer connections */}
            <PeerCommunicationStack
              senderPos={[-4, 0, 0]}
              receiverPos={[4, 0, 0]}
              activeLayer={currentStep.layerId}
              showAll={false}
            />

            {/* Explanation */}
            <Html position={[0, -4, 0]} occlude="blurred">
              <div className="text-white text-sm bg-slate-800 bg-opacity-90 p-3 rounded w-96 text-center">
                <p className="font-bold mb-1">{currentStep.title}</p>
                <p className="text-xs text-gray-300">
                  Layer {currentStep.layerId} at Sender only communicates with 
                  Layer {currentStep.layerId} at Receiver
                </p>
              </div>
            </Html>
          </group>
        )
      }

      // Phase 3: Decapsulation Visualization
      if (osiPhaseIndex === 2) {
        return (
          <group>
            {/* Receiver node on right */}
            <group position={[4, 0, 0]}>
              <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial color="#3b82f6" />
              </mesh>
              <Html position={[0, 1.2, 0]} center occlude="blurred">
                <div className="text-white text-xs bg-slate-800 px-2 py-1 rounded">
                  {selectedDestinationNode?.config?.name || 'Receiver'}
                </div>
              </Html>
            </group>

            {/* PDU hierarchy on left */}
            <EncapsulationVisualizer
              packet={currentStep}
              activeLayer={currentStep.layerId}
              position={[-2, 0, 0]}
            />

            {/* Decapsulation process on right */}
            <group position={[2.5, 0, 0]}>
              <DeencapsulationVisualization
                currentLayer={currentStep.layerId}
                position={[0, 1, 0]}
              />
            </group>

            {/* Information text */}
            <Html position={[0, -3, 0]} occlude="blurred">
              <div className="text-white text-sm bg-slate-800 bg-opacity-90 p-3 rounded w-80">
                <p className="font-bold mb-1">{currentStep.title}</p>
                <p className="text-xs text-gray-300">{currentStep.description}</p>
              </div>
            </Html>
          </group>
        )
      }
    })()}

    {/* Phase indicators */}
    <Html position={[0, 5, 0]} occlude="blurred">
      <div className="flex gap-2">
        {osiAnimationPlan.phases.map((phase, idx) => (
          <button
            key={idx}
            onClick={() => handleOsiPhaseJump(idx)}
            className={`px-3 py-1 rounded text-xs font-bold transition ${
              idx === osiPhaseIndex
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Phase {idx + 1}
          </button>
        ))}
      </div>
    </Html>
  </group>
)}
```

## Step 7: Add UI Controls

Add a new section in your UI for OSI animation controls. Find where simulation controls are rendered and add:

```javascript
{/* ✨ NEW: Perfect OSI Animation Controls */}
<div className="mt-4 p-4 bg-slate-800 rounded border border-slate-700">
  <h3 className="text-white font-bold mb-3">Perfect OSI Animation</h3>

  {/* Mode toggle */}
  <button
    onClick={() => handleOsiModeToggle('perfect-osi')}
    className={`w-full px-4 py-2 rounded mb-3 font-bold transition ${
      osiShowMode === 'perfect-osi'
        ? 'bg-purple-600 text-white'
        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
    }`}
  >
    {osiShowMode === 'perfect-osi' ? '✓ Perfect OSI Mode' : 'Enable Perfect OSI'}
  </button>

  {osiShowMode === 'perfect-osi' && osiAnimationPlan && (
    <>
      {/* Playback controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleOsiReset}
          className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition"
        >
          ⟲ Reset
        </button>

        <button
          onClick={handleOsiPrevStep}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
        >
          ← Previous
        </button>

        <button
          onClick={handleOsiPlayPause}
          className={`flex-1 px-3 py-2 font-bold text-white rounded text-sm transition ${
            osiIsPlaying
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {osiIsPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <button
          onClick={handleOsiNextStep}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
        >
          Next →
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-white text-sm">Speed:</label>
        <select
          value={osiAnimationSpeed}
          onChange={(e) => setOsiAnimationSpeed(Number(e.target.value))}
          className="flex-1 px-2 py-1 bg-slate-700 text-white rounded text-sm"
        >
          <option value={0.5}>0.5x (Slow)</option>
          <option value={1.0}>1x (Normal)</option>
          <option value={1.5}>1.5x (Fast)</option>
          <option value={2.0}>2x (Very Fast)</option>
        </select>
      </div>

      {/* Progress */}
      <div className="text-white text-xs mb-2">
        Phase {osiPhaseIndex + 1}/3 | Step {osiStepIndex + 1}/{osiAnimationPlan.phases[osiPhaseIndex].steps.length}
      </div>

      <div className="w-full bg-slate-700 rounded h-2">
        <div
          className="bg-blue-600 h-full rounded transition-all"
          style={{
            width: `${
              ((osiPhaseIndex * 100) / 3 +
                ((osiStepIndex + 1) / osiAnimationPlan.phases[osiPhaseIndex].steps.length / 3) * 100) %
              100
            }%`,
          }}
        />
      </div>
    </>
  )}
</div>
```

## Step 8: Verify & Test

1. **Check imports** - Ensure all modules are imported correctly
2. **Verify state** - All OSI state variables should initialize properly
3. **Test generation** - Select source/dest nodes, enable perfect OSI mode
4. **Test playback** - Click Play, verify animation sequence
5. **Test controls** - Try Previous/Next/Reset buttons
6. **Test phases** - Verify Phase 1→2→3 progression
7. **Test errors** - Toggle error conditions and verify timing adjusts

## 🎯 Summary of Changes

| Item | What to Add | Where |
|------|-----------|-------|
| Imports | 12 new imports from 4 modules | Top of file |
| State | 6 new useState hooks | Component body |
| Effects | 2 new useEffect hooks | Component body |
| Functions | 7 new callback functions | Component body |
| Render | OSI animation group rendering | Inside Canvas |
| Controls | Complete OSI control section | In UI area |

## ✅ Checklist Before Deployment

- [ ] All imports added and correct
- [ ] All state variables initialize
- [ ] Animation generation triggering
- [ ] Phase progression working
- [ ] Controls responsive
- [ ] All three phases render correctly
- [ ] Colors matching specification
- [ ] Timing adjusts for errors
- [ ] No console errors
- [ ] Performance acceptable (60 FPS)

## 🚀 You're Ready!

The perfect OSI animation is now integrated into your LabBuilder3D component. The animation will:

✅ Show proper PDU encapsulation/decapsulation
✅ Display peer communication logically
✅ Use consistent color coding
✅ Respond to error toggles
✅ Allow full playback control
✅ Provide detailed explanations

Enjoy your logically perfect OSI animation! 🎉
