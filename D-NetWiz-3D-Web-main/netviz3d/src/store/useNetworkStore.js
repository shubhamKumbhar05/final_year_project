import { create } from 'zustand'

/*
 * Network topology used across all phases.
 * Each node has:
 *   id       – unique key
 *   type     – 'pc' | 'router' | 'server'
 *   position – [x, y, z]  (y=0 so models sit on the grid)
 *   ip       – IPv4 address displayed as a label
 *   hostname – short name displayed below the IP
 */
const INITIAL_NODES = [
  // ── Core router (centre of the "star") ─────────────────────────────
  {
    id: 'router-core',
    type: 'router',
    position: [0, 0, 0],
    ip: '192.168.1.1',
    hostname: 'ROUTER-CORE',
  },
  // ── Edge router (deeper in the network) ────────────────────────────
  {
    id: 'router-edge',
    type: 'router',
    position: [0, 0, -10],
    ip: '10.0.0.1',
    hostname: 'ROUTER-EDGE',
  },
  // ── Workstations (left wing) ────────────────────────────────────────
  {
    id: 'pc-1',
    type: 'pc',
    position: [-9, 0, 3],
    ip: '192.168.1.10',
    hostname: 'WS-ALPHA',
  },
  {
    id: 'pc-2',
    type: 'pc',
    position: [-9, 0, -3],
    ip: '192.168.1.11',
    hostname: 'WS-BETA',
  },
  // ── Workstations (right wing) ───────────────────────────────────────
  {
    id: 'pc-3',
    type: 'pc',
    position: [9, 0, 3],
    ip: '192.168.1.12',
    hostname: 'WS-GAMMA',
  },
  {
    id: 'pc-4',
    type: 'pc',
    position: [9, 0, -3],
    ip: '192.168.1.13',
    hostname: 'WS-DELTA',
  },
  // ── Server (back-right) ─────────────────────────────────────────────
  {
    id: 'server-1',
    type: 'server',
    position: [5, 0, -10],
    ip: '192.168.1.100',
    hostname: 'SRV-MAIN',
  },
]

/*
 * Links between nodes.
 * Each link has:
 *   id   – unique key
 *   from – source node id
 *   to   – target node id
 *   type – 'lan' | 'wan' | 'dmz'  (used for colour coding)
 */
const INITIAL_LINKS = [
  // LAN — workstations to core router
  { id: 'link-pc1-core',   from: 'pc-1',       to: 'router-core', type: 'lan' },
  { id: 'link-pc2-core',   from: 'pc-2',       to: 'router-core', type: 'lan' },
  { id: 'link-pc3-core',   from: 'pc-3',       to: 'router-core', type: 'lan' },
  { id: 'link-pc4-core',   from: 'pc-4',       to: 'router-core', type: 'lan' },
  // WAN — core router to edge router
  { id: 'link-core-edge',  from: 'router-core', to: 'router-edge', type: 'wan' },
  // DMZ — edge router to server
  { id: 'link-edge-srv',   from: 'router-edge', to: 'server-1',    type: 'dmz' },
]

const INITIAL_SIM = {
  status: 'idle',     // 'idle' | 'running' | 'complete'
  type: null,         // 'tcp-handshake' | 'ping' | null
  activeLayer: null,  // 1-7  null = none highlighted
  direction: null,    // 'encap' | 'decap' | 'transit' | null
  log: [],            // [{ id, text, layer, kind }]  – newest first, max 12
}

const useNetworkStore = create((set) => ({
  nodes: INITIAL_NODES,
  links: INITIAL_LINKS,
  selectedNodeId: null,
  hoveredLinkId: null,

  // ── Packets ──────────────────────────────────────────────────────────────
  // color is optional; simulation passes explicit hex, free-send uses link type
  packets: [],

  sendPacket: (fromId, toId, color = null) =>
    set((state) => ({
      packets: [
        ...state.packets,
        { id: `pkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, fromId, toId, color },
      ],
    })),

  removePacket: (id) =>
    set((state) => ({
      packets: state.packets.filter((p) => p.id !== id),
    })),

  clearPackets: () => set({ packets: [] }),

  // ── Nodes ─────────────────────────────────────────────────────────────────
  selectNode: (id) =>
    set((state) => ({
      selectedNodeId: state.selectedNodeId === id ? null : id,
    })),

  deselectAll: () => set({ selectedNodeId: null }),

  // ── Links ─────────────────────────────────────────────────────────────────
  setHoveredLink: (id) => set({ hoveredLinkId: id }),
  clearHoveredLink: () => set({ hoveredLinkId: null }),

  // ── Simulation ────────────────────────────────────────────────────────────
  sim: INITIAL_SIM,

  // Patch any sim fields (status, activeLayer, direction, type …)
  setSimStatus: (patch) =>
    set((state) => ({ sim: { ...state.sim, ...patch } })),

  // Prepend a log entry; trim to 12
  addSimLog: (entry) =>
    set((state) => ({
      sim: {
        ...state.sim,
        log: [
          { id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ...entry },
          ...state.sim.log,
        ].slice(0, 12),
      },
    })),

  resetSim: () => set({ sim: INITIAL_SIM }),
}))

export default useNetworkStore
