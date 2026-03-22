import React from 'react'
import ApplicationLayerViz from './visualizations/ApplicationLayerViz'
import PresentationLayerViz from './visualizations/PresentationLayerViz'
import SessionLayerViz from './visualizations/SessionLayerViz'
import TransportLayerViz from './visualizations/TransportLayerViz'
import NetworkLayerViz from './visualizations/NetworkLayerViz'
import DataLinkLayerViz from './visualizations/DataLinkLayerViz'
import PhysicalLayerViz from './visualizations/PhysicalLayerViz'
import { getLayerById } from '../../data/osiLayers'

/**
 * ConceptVisualizations
 * Router component that displays the appropriate 3D model
 * based on the selected layer and concept.
 */
export default function ConceptVisualizations({ layerId, conceptId, triggerScenario, triggerClosing, onStateUpdate, segmentPhase, inOrderMode, ackIsRunning, onACKMessage, ackResetTrigger, packetLossEnabled, ackLossEnabled, flowControlIsRunning, onFlowControlMessage, flowControlResetTrigger, flowControlDrainSpeed, flowControlSimulateFullBuffer, flowControlClearBuffer, tcpUdpIsRunning, tcpUdpIsTCP, onTcpUdpMessage, tcpUdpResetTrigger, tcpUdpSimulateLoss, ipFragIsAttempting, ipFragDFEnabled, ipFragOutOfOrder, ipFragShowICMPError }) {
  const visualizations = {
    1: ApplicationLayerViz,      // Application Layer
    2: PresentationLayerViz,     // Presentation Layer
    3: SessionLayerViz,          // Session Layer
    4: TransportLayerViz,        // Transport Layer
    5: NetworkLayerViz,          // Network Layer
    6: DataLinkLayerViz,         // Data Link Layer
    7: PhysicalLayerViz,         // Physical Layer
    // Also support string IDs
    application: ApplicationLayerViz,
    presentation: PresentationLayerViz,
    session: SessionLayerViz,
    transport: TransportLayerViz,
    network: NetworkLayerViz,
    datalink: DataLinkLayerViz,
    physical: PhysicalLayerViz,
  }

  // Get the visualization component - support both numeric and string IDs
  let VisualizationComponent = visualizations[layerId]
  
  // If not found and layerId is a string, try to get the layer and use its number
  if (!VisualizationComponent && typeof layerId === 'string') {
    const layer = getLayerById(layerId)
    if (layer) {
      VisualizationComponent = visualizations[layer.number]
    }
  }

  // Default fallback
  VisualizationComponent = VisualizationComponent || ApplicationLayerViz

  return <VisualizationComponent conceptId={conceptId} triggerScenario={triggerScenario} triggerClosing={triggerClosing} onStateUpdate={onStateUpdate} segmentPhase={segmentPhase} inOrderMode={inOrderMode} ackIsRunning={ackIsRunning} onACKMessage={onACKMessage} ackResetTrigger={ackResetTrigger} packetLossEnabled={packetLossEnabled} ackLossEnabled={ackLossEnabled} flowControlIsRunning={flowControlIsRunning} onFlowControlMessage={onFlowControlMessage} flowControlResetTrigger={flowControlResetTrigger} flowControlDrainSpeed={flowControlDrainSpeed} flowControlSimulateFullBuffer={flowControlSimulateFullBuffer} flowControlClearBuffer={flowControlClearBuffer} tcpUdpIsRunning={tcpUdpIsRunning} tcpUdpIsTCP={tcpUdpIsTCP} onTcpUdpMessage={onTcpUdpMessage} tcpUdpResetTrigger={tcpUdpResetTrigger} tcpUdpSimulateLoss={tcpUdpSimulateLoss} ipFragIsAttempting={ipFragIsAttempting} ipFragDFEnabled={ipFragDFEnabled} ipFragOutOfOrder={ipFragOutOfOrder} ipFragShowICMPError={ipFragShowICMPError} />
}
