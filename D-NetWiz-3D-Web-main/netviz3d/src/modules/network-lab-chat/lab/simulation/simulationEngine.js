import {
  ENCAPSULATION_ORDER,
  DECAPSULATION_ORDER,
  applyEncapsulationLayer,
  applyDecapsulationLayer,
  getLayerMeta,
} from './osiLayers'

function clonePacket(packet) {
  return JSON.parse(JSON.stringify(packet))
}

export function buildAdjacency(nodes, edges) {
  const graph = {}
  nodes.forEach((node) => {
    graph[node.id] = []
  })

  edges.forEach((edge) => {
    if (!graph[edge.source] || !graph[edge.target]) return
    graph[edge.source].push(edge.target)
    graph[edge.target].push(edge.source)
  })

  return graph
}

export function bfsPath(sourceId, destinationId, graph) {
  if (!sourceId || !destinationId) return []
  if (sourceId === destinationId) return [sourceId]

  const queue = [[sourceId]]
  const visited = new Set([sourceId])

  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]
    const neighbors = graph[current] || []

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue
      const nextPath = [...path, neighbor]
      if (neighbor === destinationId) return nextPath
      visited.add(neighbor)
      queue.push(nextPath)
    }
  }

  return []
}

function findPathEdgeIds(pathNodeIds, edges) {
  const edgeIds = []
  for (let i = 0; i < pathNodeIds.length - 1; i += 1) {
    const a = pathNodeIds[i]
    const b = pathNodeIds[i + 1]
    const edge = edges.find((candidate) => {
      return (
        (candidate.source === a && candidate.target === b)
        || (candidate.source === b && candidate.target === a)
      )
    })
    if (edge) edgeIds.push(edge.id)
  }
  return edgeIds
}

function eventSteps(errorToggles, pathNodeIds, pathEdgeIds) {
  const steps = []
  if (errorToggles.highLatency) {
    steps.push({
      type: 'event',
      layerId: 'network',
      title: 'High Latency Detected',
      description: 'Transmission delay increased; packet animation slows down.',
      pathNodeIds,
      activeEdgeIds: pathEdgeIds,
      severity: 'warning',
    })
  }
  if (errorToggles.congestion) {
    steps.push({
      type: 'event',
      layerId: 'transport',
      title: 'Congestion Window Reduced',
      description: 'Traffic congestion detected; transport layer throttling flow.',
      pathNodeIds,
      activeEdgeIds: pathEdgeIds,
      severity: 'warning',
    })
  }
  if (errorToggles.packetLoss) {
    steps.push({
      type: 'event',
      layerId: 'datalink',
      title: 'Packet Loss Event',
      description: 'Frame drop observed on link; retransmission required.',
      pathNodeIds,
      activeEdgeIds: pathEdgeIds,
      severity: 'error',
    })
  }
  return steps
}

function createBasePacket(input) {
  return {
    applicationData: {
      dataType: input.dataType,
      payload: input.payload,
    },
    presentationData: null,
    sessionInfo: null,
    segment: null,
    packet: null,
    frame: null,
    bits: null,
  }
}

export function createSimulationPlan({
  mode,
  selectedLayer,
  input,
  sourceNode,
  destinationNode,
  nodes,
  edges,
  errorToggles,
}) {
  const graph = buildAdjacency(nodes, edges)
  const pathNodeIds = bfsPath(sourceNode?.id, destinationNode?.id, graph)
  if (!sourceNode || !destinationNode || pathNodeIds.length === 0) {
    return {
      valid: false,
      reason: 'No valid route between source and destination.',
      steps: [],
      pathNodeIds: [],
      pathEdgeIds: [],
    }
  }

  const pathEdgeIds = findPathEdgeIds(pathNodeIds, edges)
  const context = { input, sourceNode, destinationNode }

  let packet = createBasePacket(input)
  const steps = []

  const activeEncapsulationOrder = mode === 'layer' ? [selectedLayer] : ENCAPSULATION_ORDER
  const activeDecapsulationOrder = mode === 'layer' ? [selectedLayer] : DECAPSULATION_ORDER

  activeEncapsulationOrder.forEach((layerId) => {
    packet = applyEncapsulationLayer(packet, layerId, context)
    const meta = getLayerMeta(layerId)

    steps.push({
      type: 'encapsulation',
      layerId,
      title: `${meta?.name || layerId} Encapsulation`,
      description: `Sender processes ${meta?.name || layerId} and adds layer-specific headers/metadata.`,
      packetState: clonePacket(packet),
      currentNodeId: sourceNode.id,
      pathNodeIds,
      activeEdgeIds: [],
    })
  })

  steps.push({
    type: 'transit',
    layerId: 'physical',
    title: 'Packet Transit',
    description: `Packet traveling from ${sourceNode.config.name} to ${destinationNode.config.name}.`,
    packetState: clonePacket(packet),
    currentNodeId: null,
    pathNodeIds,
    activeEdgeIds: pathEdgeIds,
  })

  steps.push(...eventSteps(errorToggles, pathNodeIds, pathEdgeIds).map((step) => ({
    ...step,
    packetState: clonePacket(packet),
    currentNodeId: null,
  })))

  activeDecapsulationOrder.forEach((layerId) => {
    packet = applyDecapsulationLayer(packet, layerId)
    const meta = getLayerMeta(layerId)

    steps.push({
      type: 'decapsulation',
      layerId,
      title: `${meta?.name || layerId} Decapsulation`,
      description: `Receiver processes ${meta?.name || layerId} and removes layer metadata.`,
      packetState: clonePacket(packet),
      currentNodeId: destinationNode.id,
      pathNodeIds,
      activeEdgeIds: [],
    })
  })

  return {
    valid: true,
    reason: '',
    steps,
    pathNodeIds,
    pathEdgeIds,
  }
}
