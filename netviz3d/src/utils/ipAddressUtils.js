/**
 * IP Address Utility Functions
 * Provides parsing, validation, and conversion utilities for IPv4 addressing
 */

/**
 * Parse an IPv4 address string into an array of 4 octets
 * @param {string} ip - IPv4 address (e.g., '192.168.1.10')
 * @returns {number[]} Array of 4 octet values
 */
export const parseIp = (ip) => {
  return ip.split('.').map(octet => {
    const num = parseInt(octet, 10)
    return isNaN(num) ? 0 : Math.max(0, Math.min(255, num))
  })
}

/**
 * Convert an IPv4 address to a 32-bit binary string
 * @param {string} ip - IPv4 address
 * @returns {string} Binary representation (e.g., '11000000101010000000000100001010')
 */
export const ipToBinaryString = (ip) => {
  const octets = parseIp(ip)
  return octets.map(octet => octet.toString(2).padStart(8, '0')).join('')
}

/**
 * Convert an IPv4 address to an array of individual bits
 * @param {string} ip - IPv4 address
 * @returns {string[]} Array of '0' and '1' characters
 */
export const ipToBits = (ip) => {
  return ipToBinaryString(ip).split('')
}

/**
 * Validate if a string is a valid IPv4 address
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IPv4 format
 */
export const isValidIp = (ip) => {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  
  return parts.every(part => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255
  })
}

/**
 * Validate if a string is a valid subnet mask
 * Mask must have contiguous 1s followed by contiguous 0s
 * @param {string} mask - Subnet mask to validate
 * @returns {boolean} True if valid subnet mask
 */
export const isValidMask = (mask) => {
  if (!isValidIp(mask)) return false
  
  const binary = ipToBinaryString(mask)
  // Check for contiguous 1s followed by contiguous 0s
  const hasContiguousBits = /^1*0*$/.test(binary)
  
  return hasContiguousBits
}

/**
 * Get the number of network bits in a subnet mask
 * @param {string} mask - Subnet mask
 * @returns {number} Number of 1-bits (network bits)
 */
export const maskToNetworkBits = (mask) => {
  if (!isValidMask(mask)) return 0
  
  const binary = ipToBinaryString(mask)
  let count = 0
  
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === '1') {
      count++
    } else {
      break
    }
  }
  
  return count
}

/**
 * Calculate the network address from an IP and subnet mask
 * @param {string} ip - IPv4 address
 * @param {string} mask - Subnet mask
 * @returns {string} Network address
 */
export const calculateNetworkId = (ip, mask) => {
  const ipOctets = parseIp(ip)
  const maskOctets = parseIp(mask)
  const networkOctets = ipOctets.map((octet, index) => octet & maskOctets[index])
  return networkOctets.join('.')
}

/**
 * Calculate the broadcast address from network ID and subnet mask
 * @param {string} networkId - Network address
 * @param {string} mask - Subnet mask
 * @returns {string} Broadcast address
 */
export const calculateBroadcastId = (networkId, mask) => {
  const netOctets = parseIp(networkId)
  const maskOctets = parseIp(mask)
  const broadcastOctets = netOctets.map((octet, index) => octet | (~maskOctets[index] & 0xFF))
  return broadcastOctets.join('.')
}

/**
 * Calculate the first usable host address
 * @param {string} networkId - Network address
 * @returns {string} First host address
 */
export const calculateFirstHost = (networkId) => {
  const octets = parseIp(networkId)
  octets[3] = Math.min(octets[3] + 1, 255)
  return octets.join('.')
}

/**
 * Calculate the last usable host address
 * @param {string} broadcastId - Broadcast address
 * @returns {string} Last host address
 */
export const calculateLastHost = (broadcastId) => {
  const octets = parseIp(broadcastId)
  octets[3] = Math.max(octets[3] - 1, 0)
  return octets.join('.')
}

/**
 * Calculate the number of usable hosts in a network
 * @param {string} mask - Subnet mask
 * @returns {number} Number of usable host addresses
 */
export const calculateUsableHosts = (mask) => {
  if (!isValidMask(mask)) return 0
  
  const networkBits = maskToNetworkBits(mask)
  const hostBits = 32 - networkBits
  
  // Subtract 2 for network and broadcast addresses (except for /31 and /32)
  if (hostBits === 0) return 1
  if (hostBits === 1) return 0
  
  return Math.pow(2, hostBits) - 2
}

/**
 * Check if an IP is in the same network as another IP
 * @param {string} ip1 - First IP address
 * @param {string} ip2 - Second IP address
 * @param {string} mask - Subnet mask
 * @returns {boolean} True if both IPs are in the same network
 */
export const isSameNetwork = (ip1, ip2, mask) => {
  const net1 = calculateNetworkId(ip1, mask)
  const net2 = calculateNetworkId(ip2, mask)
  return net1 === net2
}

/**
 * Perform bitwise AND operation on IP and mask to get network ID
 * @param {string} ip - IPv4 address
 * @param {string} mask - Subnet mask
 * @returns {string[]} Array of result bits
 */
export const performAndOperation = (ip, mask) => {
  const ipBits = ipToBits(ip)
  const maskBits = ipToBits(mask)
  
  return ipBits.map((bit, index) => (parseInt(bit) & parseInt(maskBits[index])).toString())
}

/**
 * Convert an array of bits to an IPv4 address
 * @param {string[]} bits - Array of '0' and '1' characters (32 bits)
 * @returns {string} IPv4 address
 */
export const bitsToIp = (bits) => {
  if (bits.length !== 32) return '0.0.0.0'
  
  const octets = []
  for (let i = 0; i < 4; i++) {
    const octetBits = bits.slice(i * 8, (i + 1) * 8).join('')
    octets.push(parseInt(octetBits, 2))
  }
  
  return octets.join('.')
}

/**
 * Get CIDR notation from subnet mask
 * @param {string} mask - Subnet mask
 * @returns {string} CIDR notation (e.g., '/24')
 */
export const maskToCIDR = (mask) => {
  const networkBits = maskToNetworkBits(mask)
  return `/${networkBits}`
}

/**
 * Generate CIDR notation from IP and mask
 * @param {string} ip - IPv4 address
 * @param {string} mask - Subnet mask
 * @returns {string} CIDR notation (e.g., '192.168.1.0/24')
 */
export const generateCIDR = (ip, mask) => {
  const networkId = calculateNetworkId(ip, mask)
  const cidr = maskToCIDR(mask)
  return `${networkId}${cidr}`
}

/**
 * Break down an IP address into its components
 * @param {string} ip - IPv4 address
 * @param {string} mask - Subnet mask
 * @returns {object} Object with network ID, broadcast, first host, last host, and usable hosts
 */
export const analyzeIpAddress = (ip, mask) => {
  if (!isValidIp(ip) || !isValidMask(mask)) {
    return {
      valid: false,
      ip,
      mask,
    }
  }
  
  const networkId = calculateNetworkId(ip, mask)
  const broadcastId = calculateBroadcastId(networkId, mask)
  const firstHost = calculateFirstHost(networkId)
  const lastHost = calculateLastHost(broadcastId)
  const usableHosts = calculateUsableHosts(mask)
  const networkBits = maskToNetworkBits(mask)
  const cidr = generateCIDR(ip, mask)
  
  return {
    valid: true,
    ip,
    mask,
    networkId,
    broadcastId,
    firstHost,
    lastHost,
    usableHosts,
    networkBits,
    hostBits: 32 - networkBits,
    cidr,
  }
}
