/*
 * Pure async simulation sequences.
 * Each exported function receives:  { sendPacket, setSimStatus, addSimLog }
 * which are Zustand actions — no React dependencies in this file.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── OSI labels used in log messages ─────────────────────────────────────────
const LAYER_NAME = {
  7: 'Application',
  6: 'Presentation',
  5: 'Session',
  4: 'Transport',
  3: 'Network',
  2: 'Data Link',
  1: 'Physical',
}

// What each layer adds/strips per protocol
const ENCAP_MSG = {
  tcp: {
    7: 'HTTP request data assembled',
    6: 'Payload encoded (UTF-8 / TLS)',
    5: 'Session token attached',
    4: (flag) => `TCP header: SRC/DST port, SEQ, flags=[${flag}]`,
    3: 'IP header: SRC 192.168.1.10 → DST 192.168.1.100',
    2: 'Ethernet frame: MAC addresses + FCS appended',
    1: 'Frame serialised → electrical/optical signals',
  },
  icmp: {
    7: 'ICMP Echo Request created (type=8)',
    6: '— passthrough (no encryption) —',
    5: '— passthrough (connectionless) —',
    4: '— passthrough (UDP/ICMP, no port) —',
    3: 'IP header: type=ICMP, TTL=64',
    2: 'Ethernet frame: MAC addresses + FCS appended',
    1: 'Frame serialised → electrical/optical signals',
  },
}

const DECAP_MSG = {
  tcp: {
    1: 'Signals converted back to digital bits',
    2: 'FCS verified ✓  MAC accepted  frame stripped',
    3: 'IP header read  routing decision made  stripped',
    4: (flag) => `TCP ${flag} received  port matched  ACKed`,
    5: 'Session state updated',
    6: 'Payload decoded / decrypted',
    7: 'HTTP payload delivered to application',
  },
  icmp: {
    1: 'Signals converted back to digital bits',
    2: 'FCS verified ✓  MAC accepted  frame stripped',
    3: 'IP header read  ICMP type identified',
    4: '— passthrough —',
    5: '— passthrough —',
    6: '— passthrough —',
    7: (label) => `ICMP ${label} processed`,
  },
}

// ── helpers ──────────────────────────────────────────────────────────────────
async function encapsulate(proto, flag, { setSimStatus, addSimLog }) {
  for (let layer = 7; layer >= 1; layer--) {
    await sleep(145)
    setSimStatus({ activeLayer: layer, direction: 'encap' })
    const raw = ENCAP_MSG[proto][layer]
    const text = typeof raw === 'function' ? raw(flag) : raw
    addSimLog({ text: `↓ L${layer} ${LAYER_NAME[layer]}: ${text}`, layer, kind: 'encap' })
  }
}

async function decapsulate(proto, flag, { setSimStatus, addSimLog }) {
  for (let layer = 1; layer <= 7; layer++) {
    await sleep(120)
    setSimStatus({ activeLayer: layer, direction: 'decap' })
    const raw = DECAP_MSG[proto][layer]
    const text = typeof raw === 'function' ? raw(flag) : raw
    addSimLog({ text: `↑ L${layer} ${LAYER_NAME[layer]}: ${text}`, layer, kind: 'decap' })
  }
}

// ── TCP 3-Way Handshake ───────────────────────────────────────────────────────
export async function runTCPHandshake(fromId, toId, actions) {
  const { sendPacket, setSimStatus, addSimLog } = actions

  setSimStatus({ status: 'running', type: 'tcp-handshake', activeLayer: null })
  addSimLog({ text: '┌─── TCP 3-WAY HANDSHAKE ───┐', kind: 'header' })
  await sleep(200)

  // ── SYN ─────────────────────────────────────────────────────────────
  addSimLog({ text: '● Step 1/3 — SYN', kind: 'step' })
  await encapsulate('tcp', 'SYN', actions)
  sendPacket(fromId, toId, '#00ff88')            // green
  setSimStatus({ activeLayer: null, direction: 'transit' })
  addSimLog({ text: '  ▶ SYN packet in transit…', kind: 'transit' })
  await sleep(2750)                               // packet travel time

  await decapsulate('tcp', 'SYN', actions)
  addSimLog({ text: '  ✓ SYN received', kind: 'success' })
  await sleep(350)

  // ── SYN-ACK ─────────────────────────────────────────────────────────
  addSimLog({ text: '● Step 2/3 — SYN-ACK', kind: 'step' })
  await encapsulate('tcp', 'SYN,ACK', actions)
  sendPacket(toId, fromId, '#00aaff')            // blue
  setSimStatus({ activeLayer: null, direction: 'transit' })
  addSimLog({ text: '  ◀ SYN-ACK in transit…', kind: 'transit' })
  await sleep(2750)

  await decapsulate('tcp', 'SYN-ACK', actions)
  addSimLog({ text: '  ✓ SYN-ACK received', kind: 'success' })
  await sleep(350)

  // ── ACK ─────────────────────────────────────────────────────────────
  addSimLog({ text: '● Step 3/3 — ACK', kind: 'step' })
  await encapsulate('tcp', 'ACK', actions)
  sendPacket(fromId, toId, '#bb44ff')            // violet
  setSimStatus({ activeLayer: null, direction: 'transit' })
  addSimLog({ text: '  ▶ ACK in transit…', kind: 'transit' })
  await sleep(2750)

  await decapsulate('tcp', 'ACK', actions)
  addSimLog({ text: '└─── CONNECTION ESTABLISHED ✓', kind: 'complete' })
  setSimStatus({ status: 'complete', activeLayer: null, direction: null })
}

// ── ICMP Ping ────────────────────────────────────────────────────────────────
export async function runPing(fromId, toId, actions) {
  const { sendPacket, setSimStatus, addSimLog } = actions

  setSimStatus({ status: 'running', type: 'ping', activeLayer: null })
  addSimLog({ text: '┌─────── ICMP PING ────────┐', kind: 'header' })
  await sleep(200)

  // Echo Request
  addSimLog({ text: '● Echo Request', kind: 'step' })
  await encapsulate('icmp', 'Request', actions)
  sendPacket(fromId, toId, '#00ffcc')            // cyan
  setSimStatus({ activeLayer: null, direction: 'transit' })
  addSimLog({ text: '  ▶ Echo Request in transit…', kind: 'transit' })
  await sleep(2750)

  await decapsulate('icmp', 'Echo Request', actions)
  addSimLog({ text: '  ✓ Echo Request received', kind: 'success' })
  await sleep(350)

  // Echo Reply
  addSimLog({ text: '● Echo Reply', kind: 'step' })
  await encapsulate('icmp', 'Reply', actions)
  sendPacket(toId, fromId, '#ff9f43')            // amber
  setSimStatus({ activeLayer: null, direction: 'transit' })
  addSimLog({ text: '  ◀ Echo Reply in transit…', kind: 'transit' })
  await sleep(2750)

  await decapsulate('icmp', 'Echo Reply', actions)
  addSimLog({ text: '└────── PING SUCCESS ✓ ───┘', kind: 'complete' })
  setSimStatus({ status: 'complete', activeLayer: null, direction: null })
}
