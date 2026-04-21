# OSI Layer Animation - Integration Guide

## Overview

The new OSI Animation system implements a **logically perfect** protocol data unit (PDU) encapsulation and decapsulation visualization with three distinct phases:

1. **Phase 1: Encapsulation** - Data flows downward through layers
2. **Phase 2: Peer Communication** - Logical layer-to-layer communication
3. **Phase 3: Decapsulation** - Receiver unwraps headers layer by layer

## Architecture

### Core Modules

#### 1. **pduEncapsulation.js**
Defines the PDU structure and animation sequences with proper color coding:
- `PDU_LAYER_CONFIG` - Color and metadata for each layer
- `createEncapsulatedPDU()` - Creates properly nested PDU structures
- `ENCAPSULATION_ANIMATION_SEQUENCE` - Step-by-step animation timeline
- `DECAPSULATION_ANIMATION_SEQUENCE` - Reverse process animation

**Color Scheme:**
- **L7-L5 (Application → Session)**: Gold (#fbbf24) - Raw Data
- **L4 (Transport)**: Blue (#60a5fa) - TCP/UDP Header
- **L3 (Network)**: Green (#22c55e) - IP Header
- **L2 (Data Link)**: Purple (#8b5cf6) - Ethernet Header/Trailer
- **L1 (Physical)**: Gray (#6b7280) - Bitstream

#### 2. **layerVisualizer.jsx**
React-Three-Fiber components for rendering PDU visuals:
- `PDUBox` - Renders a single PDU as a colored box with label
- `EncapsulationVisualizer` - Shows complete nesting hierarchy
- `HeaderInfoDisplay` - Displays header fields specific to layer
- `AnimatedPDUTransition` - Animates PDU movement
- `TransportHeaderDisplay` - Shows L4 ports
- `NetworkHeaderDisplay` - Shows L3 IP addresses
- `DataLinkHeaderDisplay` - Shows L2 MAC addresses

#### 3. **peerCommunication.jsx**
Visualizes Phase 2 with ghost connections:
- `GhostPeerConnection` - Horizontal dashed line between peers
- `PeerCommunicationStack` - All layers' peer connections
- `DeencapsulationVisualization` - Shows header stripping
- `LayerIsolationVisualization` - Highlights current layer

#### 4. **osiAnimationController.js**
Orchestrates all three phases with proper timing:
- `generateCompleteOSIAnimationSteps()` - Creates full animation sequence
- `calculateAnimationTiming()` - Handles error-based timing adjustments
- `getStepVisualState()` - Determines render state for each step
- `getStepExplanation()` - Human-readable descriptive text

## Usage Example

```javascript
import { generateCompleteOSIAnimationSteps } from './simulation/osiAnimationController'
import { PeerCommunicationStack, LayerIsolationVisualization } from './simulation/peerCommunication'
import { PDUBox, HeaderInfoDisplay } from './simulation/layerVisualizer'

// Generate animation steps
const animationPlan = generateCompleteOSIAnimationSteps({
  sourceNode: senderDevice,
  destinationNode: receiverDevice,
  input: {
    protocol: 'TCP',
    port: 49152,
    packetSize: 256,
    payload: 'Hello World',
  },
  errorToggles: {
    highLatency: false,
    packetLoss: false,
  },
})

// animationPlan contains three phases:
// - encapsulationPhase: L7→L1 wrapping
// - peerPhase: Logical peer communication
// - decapsulationPhase: L1→L7 unwrapping
```

## Integration with LabBuilder3D

### Step 1: Import in LabBuilder3D.jsx

```javascript
import { generateCompleteOSIAnimationSteps } from './simulation/osiAnimationController'
import {
  PDUBox,
  EncapsulationVisualizer,
  HeaderInfoDisplay,
} from './simulation/layerVisualizer'
import {
  PeerCommunicationStack,
  LayerIsolationVisualization,
} from './simulation/peerCommunication'
```

### Step 2: Create Animation State

```javascript
const [currentPhase, setCurrentPhase] = useState('encapsulation')
const [currentStepIndex, setCurrentStepIndex] = useState(0)
const [animationPlan, setAnimationPlan] = useState(null)

useEffect(() => {
  if (sourceNode && destinationNode) {
    const plan = generateCompleteOSIAnimationSteps({
      sourceNode,
      destinationNode,
      input: simulationInput,
      errorToggles,
    })
    setAnimationPlan(plan)
  }
}, [sourceNode, destinationNode, simulationInput])
```

### Step 3: Render Based on Phase

```javascript
function renderAnimation() {
  if (!animationPlan) return null

  const currentPhaseData =
    currentPhase === 'encapsulation'
      ? animationPlan.phases[0]
      : currentPhase === 'peer'
      ? animationPlan.phases[1]
      : animationPlan.phases[2]

  const currentStep = currentPhaseData.steps[currentStepIndex]

  return (
    <group>
      {/* Phase 1: Show PDU nesting */}
      {currentPhase === 'encapsulation' && (
        <EncapsulationVisualizer
          packet={currentPacket}
          activeLayer={currentStep.layerId}
          position={[-2, 0, 0]}
        />
      )}

      {/* Phase 2: Show peer connections */}
      {currentPhase === 'peer' && (
        <PeerCommunicationStack
          senderPos={senderPos}
          receiverPos={receiverPos}
          activeLayer={currentStep.layerId}
        />
      )}

      {/* Phase 3: Show decapsulation */}
      {currentPhase === 'decapsulation' && (
        <LayerIsolationVisualization
          activeLayer={currentStep.layerId}
        />
      )}

      {/* Header information display */}
      {currentStep.headers && (
        <HeaderInfoDisplay
          pdu={currentStep}
          position={[2, 0, 0]}
        />
      )}
    </group>
  )
}
```

### Step 4: Add Controls

```javascript
function handleNextStep() {
  const phaseData = animationPlan.phases[phaseIndex]

  if (currentStepIndex < phaseData.steps.length - 1) {
    setCurrentStepIndex(currentStepIndex + 1)
  } else if (phaseIndex < 2) {
    // Move to next phase
    setPhaseIndex(phaseIndex + 1)
    setCurrentStepIndex(0)
  }
}
```

## Animation Sequence Details

### Phase 1: Encapsulation (Downward, L7→L1)

```
1. Application Layer (L7)
   └─ Gold "Data Block" appears
      Duration: 1000ms

2. Presentation Layer (L6)
   └─ Data remains with encoding info
      Duration: 800ms

3. Session Layer (L5)
   └─ Data with session ID
      Duration: 800ms

4. Transport Layer (L4) ⭐ KEY TRANSFORMATION
   └─ Blue TCP/UDP Header wraps Data → "SEGMENT PDU"
      Shows: Src/Dest Ports, Seq#, Ack#
      Duration: 1200ms

5. Network Layer (L3) ⭐ KEY TRANSFORMATION
   └─ Green IP Header wraps Segment → "PACKET PDU"
      Shows: Src/Dest IP, TTL
      Duration: 1200ms

6. Data Link Layer (L2) ⭐ KEY TRANSFORMATION
   └─ Purple Ethernet Header+Trailer wrap Packet → "FRAME PDU"
      Shows: Src/Dest MAC, EtherType, FCS
      Duration: 1200ms

7. Physical Layer (L1)
   └─ Frame → Bitstream (1s and 0s)
      Duration: 1000ms
```

### Phase 2: Peer-to-Peer Communication

For each layer:
- Draw horizontal dashed line between sender and receiver
- Label: "Layer N ↔ Layer N"
- Message: "Only peers understand each other's headers"

### Phase 3: Decapsulation (Upward, L1→L7)

```
1. Physical Layer (L1)
   └─ Bitstream received, reassemble to Frame
      Duration: 1000ms

2. Data Link Layer (L2)
   └─ ✓ MAC address VALID
      Strip Purple Header+Trailer
      → PACKET PDU revealed
      Duration: 1200ms

3. Network Layer (L3)
   └─ ✓ IP address VALID
      Strip Green Header
      → SEGMENT PDU revealed
      Duration: 1200ms

4. Transport Layer (L4)
   └─ ✓ Port/Seq VALID
      Strip Blue Header, Reassemble Segments
      → Original GOLD DATA BLOCK
      Duration: 1200ms

5. Session, Presentation, Application (L5-L7)
   └─ Final Data delivered in original form
      Duration: 800-1000ms each
```

## Key Visual Principles

### 1. **Nesting Effect**
- Each layer's PDU clearly contains the previous layer's PDU
- NOT replaced, but WRAPPED
- Visual hierarchy must be clear

### 2. **Color Consistency**
- Every header uses its assigned color throughout
- Headers shown with their layer's color
- Payload shown in different color to distinguish

### 3. **Header Display**
When a PDU is wrapped, show:
- Layer name
- PDU type (Data, Segment, Packet, Frame, Bits)
- All relevant header fields:
  - L4: Ports, Sequence, Acknowledgment
  - L3: IP Addresses, TTL
  - L2: MAC Addresses, EtherType, FCS
  - L1: Medium info, speed

### 4. **Ghost Connections**
- Dashed horizontal lines (opacity: 0.6)
- Only between same layers
- Active only during Phase 2
- Visual feedback that "layers only talk to peers"

## Error Handling

### MAC Mismatch
During decapsulation at L2, if MAC doesn't match:
- Flash red error indicator
- Show message: "MAC address doesn't match - Frame discarded"
- Animation pauses for review

### IP Mismatch
During decapsulation at L3, if IP doesn't match:
- Flash error indicator
- Show message: "IP address doesn't match or needs routing"
- May continue to L2 (hop) or terminate

### Packet Loss
During transmission (Phase 1→Phase 3 transition):
- Show packet "disappearing"
- Indicate retransmission required
- Reset encapsulation sequence

## Timing Adjustments

```javascript
// Base duration
60ms per step

// Adjustments
if (errorToggles.highLatency) × 1.5
if (errorToggles.congestion && phase1) × 1.2
if (errorToggles.packetLoss && phase3) × 1.3
```

## UI Callout Text

### Phase 1 Encapsulation Descriptions

```
L7 → L5: Raw data flows through application layers
L4: ⭐ Data is SEGMENTED and wrapped with TCP/UDP header
L3: ⭐ Segments are PACKETIZED with IP header
L2: ⭐ Packets are FRAMED with Ethernet header+trailer
L1: ⭐ Frame is converted to bitstream for transmission
```

### Phase 2 Descriptions

```
"Layer 4 at Sender only 'speaks' with Layer 4 at Receiver.
They understand each other via ports and sequence numbers.
Peer communication shows logical, not physical, connections."
```

### Phase 3 Descriptions

```
L1: Bitstream reassembled to Frame ✓
L2: MAC valid? YES → Strip header/trailer
L3: IP valid? YES → Strip header
L4: Ports valid? YES → Reassemble segments
L5-L7: Original data delivered to application ✓
```

## Testing Checklist

- [ ] Encapsulation flows smoothly top-down
- [ ] Each PDU properly nested, not replaced
- [ ] Colors consistent throughout
- [ ] Headers display correct information
- [ ] Peer connections show only during Phase 2
- [ ] Decapsulation flows smoothly bottom-up
- [ ] Error states show correctly
- [ ] Timing adjusts based on error toggles
- [ ] Original data matches final delivered data

## Advanced Features (Optional)

1. **Segment Animation**: Show how data is split into segments during L4
2. **MAC Learning**: Display MAC address lookup during L2
3. **Routing Table**: Show route lookup during L3
4. **Retransmission**: Animate packet loss and retry
5. **Concurrent Flows**: Show multiple flows with different colors
6. **Wireshark-style View**: Hex-dump style packet display

## Files Reference

```
src/components/lab/simulation/
├── pduEncapsulation.js           (Core PDU definitions)
├── layerVisualizer.jsx           (3D rendering components)
├── peerCommunication.jsx         (Phase 2 visualization)
├── osiAnimationController.js     (Orchestration & timing)
├── osiLayers.js                  (Existing - compatibility)
└── animationController.js        (Existing - integration)
```

## Next Steps

1. Import the modules into LabBuilder3D.jsx
2. Create animation state management hooks
3. Implement phase progression logic
4. Add UI controls for play/pause/step
5. Add phase indicators
6. Test all three phases end-to-end
7. Add error simulation toggles
8. Create tutorial/guided walkthrough
