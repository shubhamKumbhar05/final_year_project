const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

const DEVICE_TYPE_MAP = {
  pc: 'pc',
  laptop: 'laptop',
  server: 'server',
  printer: 'printer',
  phone: 'ip-phone',
  'ip phone': 'ip-phone',
  iot: 'iot-device',
  'iot device': 'iot-device',
  router: 'router',
  switch: 'switch',
  hub: 'hub',
  'access point': 'access-point',
  ap: 'access-point',
  firewall: 'firewall',
  dns: 'dns-server',
  dhcp: 'dhcp-server',
  modem: 'modem',
}

function pickDeviceType(text, fallback = 'pc') {
  const lower = text.toLowerCase()
  for (const [token, mapped] of Object.entries(DEVICE_TYPE_MAP)) {
    if (lower.includes(token)) return mapped
  }
  return fallback
}

function pickCount(prompt, fallback) {
  const match = prompt.match(/(\d{1,2})\s*(pc|node|nodes|computer|computers|device|devices)/i)
  if (!match) return fallback
  const n = Number(match[1])
  if (Number.isNaN(n)) return fallback
  return clamp(n, 2, 12)
}

function findType(prompt) {
  const p = prompt.toLowerCase()
  if (p.includes('ring')) return 'ring'
  if (p.includes('mesh')) return 'mesh'
  if (p.includes('bus')) return 'bus'
  if (p.includes('tree')) return 'tree'
  if (p.includes('star')) return 'star'
  if (p.includes('lan')) return 'lan'
  return null
}

function starTopology(count) {
  const nodes = [{ type: 'router', name: 'ROUTER-1', x: 0, z: 0 }]
  const edges = []
  const radius = 8
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    nodes.push({ type: 'pc', name: `PC-${i + 1}`, x, z })
    edges.push({ from: 0, to: i + 1, media: 'ethernet-cable' })
  }
  return { nodes, edges }
}

function ringTopology(count) {
  const nodes = []
  const edges = []
  const radius = 9
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    nodes.push({ type: 'pc', name: `PC-${i + 1}`, x, z })
  }
  for (let i = 0; i < count; i += 1) {
    edges.push({ from: i, to: (i + 1) % count, media: 'ethernet-cable' })
  }
  return { nodes, edges }
}

function meshTopology(count) {
  const nodes = []
  const edges = []
  const radius = 8
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count
    nodes.push({
      type: 'pc',
      name: `PC-${i + 1}`,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    })
  }

  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      edges.push({ from: i, to: j, media: 'ethernet-cable' })
    }
  }
  return { nodes, edges }
}

function busTopology(count) {
  const nodes = []
  const edges = []
  const startX = -10
  const step = 20 / Math.max(1, count - 1)
  for (let i = 0; i < count; i += 1) {
    const x = startX + step * i
    nodes.push({ type: 'pc', name: `PC-${i + 1}`, x, z: 0 })
    if (i > 0) {
      edges.push({ from: i - 1, to: i, media: 'ethernet-cable' })
    }
  }
  return { nodes, edges }
}

function treeTopology(count) {
  const level1 = Math.max(2, Math.ceil(count / 2))
  const level2 = count
  const nodes = [{ type: 'router', name: 'CORE-ROUTER', x: 0, z: -6 }]
  const edges = []

  for (let i = 0; i < level1; i += 1) {
    const x = -8 + (16 * i) / Math.max(1, level1 - 1)
    nodes.push({ type: 'switch', name: `SW-${i + 1}`, x, z: 0 })
    edges.push({ from: 0, to: i + 1, media: 'fiber-cable' })
  }

  for (let j = 0; j < level2; j += 1) {
    const x = -10 + (20 * j) / Math.max(1, level2 - 1)
    const nodeIndex = nodes.push({ type: 'pc', name: `PC-${j + 1}`, x, z: 7 }) - 1
    const parentSwitch = 1 + (j % level1)
    edges.push({ from: parentSwitch, to: nodeIndex, media: 'ethernet-cable' })
  }

  return { nodes, edges }
}

function lanTemplate() {
  const nodes = [
    { type: 'router', name: 'R1', x: 0, z: -6 },
    { type: 'switch', name: 'SW1', x: 0, z: -1 },
    { type: 'pc', name: 'PC-1', x: -6, z: 6 },
    { type: 'pc', name: 'PC-2', x: -2, z: 6 },
    { type: 'pc', name: 'PC-3', x: 2, z: 6 },
    { type: 'pc', name: 'PC-4', x: 6, z: 6 },
    { type: 'dhcp-server', name: 'DHCP-1', x: -5, z: 2 },
    { type: 'dns-server', name: 'DNS-1', x: 5, z: 2 },
  ]

  const edges = [
    { from: 0, to: 1, media: 'fiber-cable' },
    { from: 1, to: 2, media: 'ethernet-cable' },
    { from: 1, to: 3, media: 'ethernet-cable' },
    { from: 1, to: 4, media: 'ethernet-cable' },
    { from: 1, to: 5, media: 'ethernet-cable' },
    { from: 1, to: 6, media: 'ethernet-cable' },
    { from: 1, to: 7, media: 'ethernet-cable' },
  ]

  return { nodes, edges }
}

function shapeFor(type, count) {
  if (type === 'ring') return ringTopology(count)
  if (type === 'mesh') return meshTopology(Math.min(count, 6))
  if (type === 'bus') return busTopology(count)
  if (type === 'tree') return treeTopology(count)
  if (type === 'star') return starTopology(count)
  return lanTemplate()
}

export function generateTopologyFromPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return null
  const normalized = prompt.toLowerCase()

  const hasBuildIntent = /(build|create|generate|make|design|setup)/i.test(normalized)
  const shape = findType(normalized)
  const mentionsTopology = /topology|network|lan|wan|lab/i.test(normalized)

  if (!hasBuildIntent && !shape && !mentionsTopology) return null

  const count = pickCount(normalized, 5)
  const type = shape || (normalized.includes('lan') ? 'lan' : 'star')
  const template = shapeFor(type, count)

  return {
    name: `${type.toUpperCase()} Topology`,
    type,
    nodes: template.nodes,
    edges: template.edges,
    summary: `Generated ${type} topology with ${template.nodes.length} nodes and ${template.edges.length} links.`,
  }
}

function parseConnectCommand(prompt) {
  const match = prompt.match(/connect\s+([a-z0-9\-_ ]+)\s+(?:to|with)\s+([a-z0-9\-_ ]+)/i)
  if (!match) return null
  return {
    mode: 'modify',
    operations: [{
      type: 'connect',
      a: match[1].trim(),
      b: match[2].trim(),
      media: prompt.toLowerCase().includes('fiber') ? 'fiber-cable' : prompt.toLowerCase().includes('wireless') ? 'wireless-link' : 'ethernet-cable',
    }],
    summary: `Connecting ${match[1].trim()} to ${match[2].trim()}.`,
  }
}

function parseDisconnectCommand(prompt) {
  const match = prompt.match(/(?:disconnect|remove link between)\s+([a-z0-9\-_ ]+)\s+(?:and|from|to)\s+([a-z0-9\-_ ]+)/i)
  if (!match) return null
  return {
    mode: 'modify',
    operations: [{
      type: 'disconnect',
      a: match[1].trim(),
      b: match[2].trim(),
    }],
    summary: `Disconnecting ${match[1].trim()} and ${match[2].trim()}.`,
  }
}

function parseRenameCommand(prompt) {
  const match = prompt.match(/rename\s+([a-z0-9\-_ ]+)\s+(?:to|as)\s+([a-z0-9\-_ ]+)/i)
  if (!match) return null
  return {
    mode: 'modify',
    operations: [{
      type: 'rename',
      target: match[1].trim(),
      newName: match[2].trim(),
    }],
    summary: `Renaming ${match[1].trim()} to ${match[2].trim()}.`,
  }
}

function parseIpUpdateCommand(prompt) {
  const ipMatch = prompt.match(/(\d{1,3}(?:\.\d{1,3}){3})/)
  if (!ipMatch) return null
  const targetMatch = prompt.match(/(?:set|change|update)\s+(?:ip(?:\s+address)?\s+(?:of|for)\s+)?([a-z0-9\-_ ]+)\s+(?:to|as)/i)
  if (!targetMatch) return null

  return {
    mode: 'modify',
    operations: [{
      type: 'set-config',
      target: targetMatch[1].trim(),
      key: 'ipAddress',
      value: ipMatch[1],
    }],
    summary: `Updating IP of ${targetMatch[1].trim()} to ${ipMatch[1]}.`,
  }
}

function parseAddCommand(prompt) {
  const isAdd = /(add|insert|place)/i.test(prompt)
  if (!isAdd) return null

  const numMatch = prompt.match(/(\d{1,2})\s+/)
  const count = numMatch ? clamp(Number(numMatch[1]), 1, 10) : 1
  const type = pickDeviceType(prompt)

  return {
    mode: 'modify',
    operations: [{
      type: 'add',
      deviceType: type,
      count,
    }],
    summary: `Adding ${count} ${type} node(s).`,
  }
}

function parseRemoveCommand(prompt) {
  if (!/(remove|delete)/i.test(prompt)) return null

  const namedMatch = prompt.match(/(?:remove|delete)\s+([a-z0-9\-_ ]+)/i)
  if (namedMatch && /pc|router|switch|server|firewall|hub|modem|dns|dhcp|node/i.test(namedMatch[1])) {
    return {
      mode: 'modify',
      operations: [{
        type: 'remove',
        target: namedMatch[1].trim(),
      }],
      summary: `Removing ${namedMatch[1].trim()}.`,
    }
  }

  const countMatch = prompt.match(/(\d{1,2})\s+/)
  const count = countMatch ? clamp(Number(countMatch[1]), 1, 10) : 1
  const type = pickDeviceType(prompt, null)
  if (!type) return null

  return {
    mode: 'modify',
    operations: [{
      type: 'remove-type',
      deviceType: type,
      count,
    }],
    summary: `Removing ${count} ${type} node(s).`,
  }
}

function parseSubnetMaskCommand(prompt) {
  // Match patterns like "set subnet mask of PC-1 to 255.255.0.0"
  const maskMatch = prompt.match(/(\d{1,3}(?:\.\d{1,3}){3})/)
  if (!maskMatch) return null
  
  const isSubnetCmd = /subnet\s+(?:mask)?/i.test(prompt)
  if (!isSubnetCmd) return null

  const targetMatch = prompt.match(/(?:of|for)\s+([a-z0-9\-_ ]+)(?:\s|$)/i)
  if (!targetMatch) return null

  return {
    mode: 'modify',
    operations: [{
      type: 'set-config',
      target: targetMatch[1].trim(),
      key: 'subnetMask',
      value: maskMatch[1],
    }],
    summary: `Updating subnet mask of ${targetMatch[1].trim()} to ${maskMatch[1]}.`,
  }
}

function parseStatusCommand(prompt) {
  // Match patterns like "set PC-1 status to active" or "make router offline"
  const statusMatch = prompt.match(/(active|inactive|online|offline|up|down)/i)
  if (!statusMatch) return null

  const targetMatch = prompt.match(/(?:set|change|make|mark)\s+([a-z0-9\-_ ]+)\s+(?:as|to|)?\s*(?:status\s+)?/i)
  if (!targetMatch) return null

  const statusValue = statusMatch[1].toLowerCase()
  const normalizedStatus = ['inactive', 'offline', 'down'].includes(statusValue) ? 'inactive' : 'active'

  return {
    mode: 'modify',
    operations: [{
      type: 'set-config',
      target: targetMatch[1].trim(),
      key: 'status',
      value: normalizedStatus,
    }],
    summary: `Setting ${targetMatch[1].trim()} status to ${normalizedStatus}.`,
  }
}

function parseDeviceTypeChangeCommand(prompt) {
  // Match patterns like "change PC-1 type to server" or "convert PC-1 to router"
  const isTypeChange = /(change|convert|set)\s+.*\s+(?:type|to)\s+/i.test(prompt)
  if (!isTypeChange) return null

  const targetMatch = prompt.match(/(change|convert|set)\s+([a-z0-9\-_ ]+)\s+(?:type\s+)?(?:to|as)\s+/i)
  if (!targetMatch) return null

  const afterTarget = prompt.substring(prompt.indexOf(targetMatch[2]) + targetMatch[2].length)
  const newTypeMatch = afterTarget.match(/(?:to\s+|as\s+)?([a-z0-9\-_ ]+)(?:\s|$)/i)
  if (!newTypeMatch) return null

  const newType = pickDeviceType(newTypeMatch[1], null)
  if (!newType) return null

  return {
    mode: 'modify',
    operations: [{
      type: 'change-type',
      target: targetMatch[2].trim(),
      newType,
    }],
    summary: `Changing ${targetMatch[2].trim()} type to ${newType}.`,
  }
}

function parseMacAddressCommand(prompt) {
  // Match MAC address patterns: XX:XX:XX:XX:XX:XX
  const macMatch = prompt.match(/([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/i)
  if (!macMatch) return null

  const isMacCmd = /(?:set|change|update|assign).*(?:mac|address)/i.test(prompt)
  if (!isMacCmd) return null

  const targetMatch = prompt.match(/(?:of|for|on)\s+([a-z0-9\-_ ]+)/i)
  if (!targetMatch) return null

  return {
    mode: 'modify',
    operations: [{
      type: 'set-config',
      target: targetMatch[1].trim(),
      key: 'macAddress',
      value: macMatch[0],
    }],
    summary: `Updating MAC address of ${targetMatch[1].trim()} to ${macMatch[0]}.`,
  }
}

function parseBatchConfigCommand(prompt) {
  // Match patterns like "configure PC-1: IP 192.168.1.50, subnet 255.255.255.0, hostname ServerA"
  if (!/(configure|setup|set up|config)\s+([a-z0-9\-_ ]+)\s*:/i.test(prompt)) return null

  const targetMatch = prompt.match(/(configure|setup|set up|config)\s+([a-z0-9\-_ ]+)\s*:/i)
  if (!targetMatch) return null

  const target = targetMatch[2].trim()
  const configString = prompt.substring(prompt.indexOf(':') + 1)
  
  const operations = []

  // Parse IP
  const ipMatch = configString.match(/ip\s+(?:address\s+)?(\d{1,3}(?:\.\d{1,3}){3})/i)
  if (ipMatch) {
    operations.push({
      type: 'set-config',
      target,
      key: 'ipAddress',
      value: ipMatch[1],
    })
  }

  // Parse Subnet Mask
  const subnetMatch = configString.match(/subnet(?:\s+mask)?\s+(\d{1,3}(?:\.\d{1,3}){3})/i)
  if (subnetMatch) {
    operations.push({
      type: 'set-config',
      target,
      key: 'subnetMask',
      value: subnetMatch[1],
    })
  }

  // Parse Hostname/Name
  const nameMatch = configString.match(/(?:hostname|name)\s+([a-z0-9\-_]+)/i)
  if (nameMatch) {
    operations.push({
      type: 'rename',
      target,
      newName: nameMatch[1],
    })
  }

  // Parse MAC Address
  const macMatch = configString.match(/(?:mac|address)\s+([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}/i)
  if (macMatch) {
    operations.push({
      type: 'set-config',
      target,
      key: 'macAddress',
      value: macMatch[0],
    })
  }

  if (operations.length === 0) return null

  return {
    mode: 'modify',
    operations,
    summary: `Configuring ${target} with ${operations.length} setting(s).`,
  }
}

export function generateTopologyCommandFromPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return null

  const creators = [
    parseBatchConfigCommand,
    parseConnectCommand,
    parseDisconnectCommand,
    parseRenameCommand,
    parseSubnetMaskCommand,
    parseStatusCommand,
    parseMacAddressCommand,
    parseDeviceTypeChangeCommand,
    parseIpUpdateCommand,
    parseAddCommand,
    parseRemoveCommand,
  ]

  for (const parser of creators) {
    const parsed = parser(prompt)
    if (parsed) return parsed
  }

  const generated = generateTopologyFromPrompt(prompt)
  if (!generated) return null

  return {
    mode: 'replace',
    topology: generated,
    summary: generated.summary,
  }
}
