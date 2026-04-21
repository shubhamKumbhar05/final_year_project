# Lab and Chatbot Refactoring Plan
## Complete File Migration & Import Update Mapping

---

## FILES_TO_COPY

### Lab Files (2 files)
- `src/components/lab/LabBuilder3D.jsx` → `src/modules/network-lab-chat/lab/LabBuilder3D.jsx`
- `src/components/lab/PerfectOSIAnimationRenderer.jsx` → `src/modules/network-lab-chat/lab/PerfectOSIAnimationRenderer.jsx`

### Simulation Files (14 files)
- `src/components/lab/simulation/animationController.js` → `src/modules/network-lab-chat/lab/simulation/animationController.js`
- `src/components/lab/simulation/calculationDashboard.jsx` → `src/modules/network-lab-chat/lab/simulation/calculationDashboard.jsx`
- `src/components/lab/simulation/layerVisualizer.jsx` → `src/modules/network-lab-chat/lab/simulation/layerVisualizer.jsx`
- `src/components/lab/simulation/nestedEncapsulation.jsx` → `src/modules/network-lab-chat/lab/simulation/nestedEncapsulation.jsx`
- `src/components/lab/simulation/osiAnimationController.js` → `src/modules/network-lab-chat/lab/simulation/osiAnimationController.js`
- `src/components/lab/simulation/osiLayers.js` → `src/modules/network-lab-chat/lab/simulation/osiLayers.js`
- `src/components/lab/simulation/pduEncapsulation.js` → `src/modules/network-lab-chat/lab/simulation/pduEncapsulation.js`
- `src/components/lab/simulation/peerCommunication.jsx` → `src/modules/network-lab-chat/lab/simulation/peerCommunication.jsx`
- `src/components/lab/simulation/protocolCalculationEngine.js` → `src/modules/network-lab-chat/lab/simulation/protocolCalculationEngine.js`
- `src/components/lab/simulation/receiverValidation.jsx` → `src/modules/network-lab-chat/lab/simulation/receiverValidation.jsx`
- `src/components/lab/simulation/simulationEngine.js` → `src/modules/network-lab-chat/lab/simulation/simulationEngine.js`
- `src/components/lab/simulation/topologyGenerator.js` → `src/modules/network-lab-chat/lab/simulation/topologyGenerator.js`
- `src/components/lab/simulation/traversalLogic.js` → `src/modules/network-lab-chat/lab/simulation/traversalLogic.js`
- `src/components/lab/simulation/traversalTimeline.jsx` → `src/modules/network-lab-chat/lab/simulation/traversalTimeline.jsx`

### Chatbot Files (1 file)
- `src/components/ConvaiChat.jsx` → `src/modules/network-lab-chat/chatbot/ConvaiChat.jsx`

### Chatbot Services (1 file)
- `src/services/convaiService.js` → `src/modules/network-lab-chat/chatbot/services/convaiService.js`

### UI Files (1 file)
- `src/components/ui/LabAndAISection.jsx` → `src/modules/network-lab-chat/ui/LabAndAISection.jsx`

---

## IMPORT_UPDATES_NEEDED

### 1. LabBuilder3D.jsx
**Location:** `src/components/lab/LabBuilder3D.jsx` → `src/modules/network-lab-chat/lab/LabBuilder3D.jsx`

Current imports (all relative to `./simulation/`):
```javascript
import { OSI_LAYERS } from './simulation/osiLayers'
import { createSimulationPlan, buildAdjacency } from './simulation/simulationEngine'
import { getLayerColor, getPacketAnimationSpeed, getStepDurationMs } from './simulation/animationController'
import { calculateCompleteProtocolStack } from './simulation/protocolCalculationEngine'
import { NestedEncapsulationStack } from './simulation/nestedEncapsulation'
import { NetworkSimulation, generateTraversalTimeline, generateBitstream } from './simulation/traversalLogic'
import { CompleteDecapsulation, ReceiverConsole } from './simulation/receiverValidation'
import { CalculationDashboard } from './simulation/calculationDashboard'
```

**After migration (imports remain the same - relative paths preserved):**
```javascript
import { OSI_LAYERS } from './simulation/osiLayers'
import { createSimulationPlan, buildAdjacency } from './simulation/simulationEngine'
import { getLayerColor, getPacketAnimationSpeed, getStepDurationMs } from './simulation/animationController'
import { calculateCompleteProtocolStack } from './simulation/protocolCalculationEngine'
import { NestedEncapsulationStack } from './simulation/nestedEncapsulation'
import { NetworkSimulation, generateTraversalTimeline, generateBitstream } from './simulation/traversalLogic'
import { CompleteDecapsulation, ReceiverConsole } from './simulation/receiverValidation'
import { CalculationDashboard } from './simulation/calculationDashboard'
```

---

### 2. PerfectOSIAnimationRenderer.jsx
**Location:** `src/components/lab/PerfectOSIAnimationRenderer.jsx` → `src/modules/network-lab-chat/lab/PerfectOSIAnimationRenderer.jsx`

**ISSUE IDENTIFIED:** File is using incorrect relative paths (`../simulation/` instead of `./simulation/`)

Current imports (BROKEN):
```javascript
import {
  generateCompleteOSIAnimationSteps,
  calculateAnimationTiming,
  getStepExplanation,
} from '../simulation/osiAnimationController'
import {
  PDUBox,
  EncapsulationVisualizer,
  HeaderInfoDisplay,
  TransportHeaderDisplay,
  NetworkHeaderDisplay,
  DataLinkHeaderDisplay,
} from '../simulation/layerVisualizer'
import {
  GhostPeerConnection,
  PeerCommunicationStack,
  DeencapsulationVisualization,
  LayerIsolationVisualization,
} from '../simulation/peerCommunication'
```

**After migration (FIX PATHS):**
```javascript
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

---

### 3. ConvaiChat.jsx
**Location:** `src/components/ConvaiChat.jsx` → `src/modules/network-lab-chat/chatbot/ConvaiChat.jsx`

Current imports:
```javascript
import { sendMessage, initializeSession } from '../services/convaiService'
import { generateTopologyCommandFromPrompt } from './lab/simulation/topologyGenerator'
```

**After migration:**
```javascript
import { sendMessage, initializeSession } from './services/convaiService'
import { generateTopologyCommandFromPrompt } from '../lab/simulation/topologyGenerator'
```

---

### 4. App.jsx
**Location:** `src/App.jsx` (NO MOVE - remains at root)

Current imports:
```javascript
import ConvaiChat from './components/ConvaiChat'
import LabBuilder3D from './components/lab/LabBuilder3D'
```

**After migration:**
```javascript
import ConvaiChat from './modules/network-lab-chat/chatbot/ConvaiChat'
import LabBuilder3D from './modules/network-lab-chat/lab/LabBuilder3D'
```

---

### 5. LabAndAISection.jsx
**Location:** `src/components/ui/LabAndAISection.jsx` → `src/modules/network-lab-chat/ui/LabAndAISection.jsx`

**Check:** Need to verify if it has imports. From inspection, no internal imports detected. If it imports from App or other components, those would need update.

---

### 6. Simulation File Internal Imports

#### animationController.js
**Current:**
```javascript
import { getLayerMeta } from './osiLayers'
```
**After migration:** No change needed (relative path preserved)

---

#### osiAnimationController.js
**Current:**
```javascript
import {
  PDU_LAYER_CONFIG,
  ENCAPSULATION_ANIMATION_SEQUENCE,
  DECAPSULATION_ANIMATION_SEQUENCE,
} from './pduEncapsulation'
```
**After migration:** No change needed (relative path preserved)

---

#### receiverValidation.jsx
**Current:**
```javascript
import { bitsToString, calculateCRC32 } from './protocolCalculationEngine'
```
**After migration:** No change needed (relative path preserved)

---

#### traversalTimeline.jsx
**Current:**
```javascript
import { stringToBits, bitsToString } from './protocolCalculationEngine'
```
**After migration:** No change needed (relative path preserved)

---

#### simulationEngine.js
**Current:**
```javascript
import {
  ENCAPSULATION_ORDER,
  DECAPSULATION_ORDER,
  applyEncapsulationLayer,
  applyDecapsulationLayer,
  getLayerMeta,
} from './osiLayers'
```
**After migration:** No change needed (relative path preserved)

---

### 7. Services Migration: convaiService.js
**Location:** `src/services/convaiService.js` → `src/modules/network-lab-chat/chatbot/services/convaiService.js`

**Check:** Need to verify internal structure. If it uses relative imports to root-level services, those paths would need adjustment.

---

## SPECIAL_CASES

### 1. PerfectOSIAnimationRenderer.jsx - Path Bug
- **Issue:** Uses `../simulation/` instead of `./simulation/`
- **Impact:** Currently references wrong paths (would fail if file were moved)
- **Action:** MUST fix to `./simulation/` during migration
- **Severity:** HIGH - Code is currently broken

### 2. OSIMenu.jsx and other UI files
- **Note:** OSIMenu.jsx remains in `src/components/ui/` and should NOT be moved
- **Only LabAndAISection.jsx moves** from ui folder to `src/modules/network-lab-chat/ui/`
- **Impact:** OSIMenu maintains same import from data folder

### 3. Root-level server.js
- **Action:** NO CHANGE - remains at root as specified

### 4. Circular dependency potential
- **Check:** ConvaiChat imports from topologyGenerator (which is in lab/simulation)
- **Status:** Safe - unidirectional dependency (chatbot → lab, not vice versa)
- **After move:** Path becomes `../lab/simulation/topologyGenerator`

### 5. Data folder references
- **Note:** Some files may reference `src/data/osiLayers.js`
- **Status:** These should NOT change (data folder is shared, not moving)
- **OSIMenu.jsx imports:** `from '../../data/osiLayers'` - remains valid

### 6. Store references
- **Note:** Files may reference `src/store/useNetworkStore.js`
- **Status:** These should NOT change (store is shared, not moving)

---

## IMPORT PATH REFERENCE GUIDE

### From LabBuilder3D (new location: src/modules/network-lab-chat/lab/)
- To simulation files: `./simulation/*` ✓ (same structure)

### From ConvaiChat (new location: src/modules/network-lab-chat/chatbot/)
- To services: `./services/convaiService` ✓ (new location)
- To lab simulation: `../lab/simulation/topologyGenerator` ✓ (up one, then into lab)

### From App.jsx (location: src/)
- To LabBuilder3D: `./modules/network-lab-chat/lab/LabBuilder3D` ✓
- To ConvaiChat: `./modules/network-lab-chat/chatbot/ConvaiChat` ✓

### From simulation files (location: src/modules/network-lab-chat/lab/simulation/)
- To each other: `./[otherFile]` ✓ (same folder structure)

---

## SUMMARY STATISTICS

| Category | Count |
|----------|-------|
| Files to copy | 19 |
| Files needing import updates | 5 |
| Files with internal cross-refs | 5 |
| Critical bugs to fix | 1 (PerfectOSIAnimationRenderer) |
| Path corrections required | 3 (PerfectOSIAnimationRenderer imports) |
| Relative paths staying same | 8+ (simulation internal) |
| Relative paths needing updates | 5 |

---

## MIGRATION CHECKLIST

- [ ] Create `/src/modules/network-lab-chat/lab/` directory
- [ ] Create `/src/modules/network-lab-chat/lab/simulation/` directory
- [ ] Create `/src/modules/network-lab-chat/chatbot/` directory
- [ ] Create `/src/modules/network-lab-chat/chatbot/services/` directory
- [ ] Create `/src/modules/network-lab-chat/ui/` directory
- [ ] Copy all 14 simulation files
- [ ] Copy LabBuilder3D.jsx (no import changes needed)
- [ ] Copy PerfectOSIAnimationRenderer.jsx (FIX imports: ../simulation/ → ./simulation/)
- [ ] Copy ConvaiChat.jsx (UPDATE imports: services and topologyGenerator paths)
- [ ] Copy convaiService.js (check for any internal path updates)
- [ ] Copy LabAndAISection.jsx (verify no broken imports)
- [ ] Update App.jsx imports (ConvaiChat and LabBuilder3D paths)
- [ ] Verify all relative imports in simulation files
- [ ] Test all import paths with IDE intellisense
- [ ] Run build/compilation to verify no import errors
- [ ] Delete old directories (after verification)
