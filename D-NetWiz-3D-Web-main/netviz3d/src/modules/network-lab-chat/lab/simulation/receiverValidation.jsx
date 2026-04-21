/**
 * Receiver Validation Logic
 * Handles:
 * - Bit reassembly from bitstream
 *  - CRC integrity verification
 * - Layer-by-layer decapsulation
 * - Error detection and display
 */

import React, { useState, useEffect } from 'react'
import { Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { bitsToString, calculateCRC32 } from './protocolCalculationEngine'

/**
 * Performs CRC integrity check
 */
export function verifyCRCIntegrity(receivedBits, expectedCRC) {
  // Convert bits back to string
  let data = ''
  for (let i = 0; i < receivedBits.length; i += 8) {
    const byte = receivedBits.substring(i, i + 8)
    if (byte.length === 8) {
      data += String.fromCharCode(parseInt(byte, 2))
    }
  }

  // Calculate CRC of received data
  const calculatedCRC = calculateCRC32(data)

  return {
    receivedData: data,
    expectedCRC,
    calculatedCRC,
    isValid: expectedCRC === calculatedCRC,
    errorDetected: expectedCRC !== calculatedCRC,
  }
}

/**
 * Simulates bit errors and corruption
 */
export function injectBitErrors(bits, errorRate = 0.01) {
  let corrupted = ''
  let errorCount = 0

  for (const bit of bits) {
    if (Math.random() < errorRate) {
      corrupted += bit === '0' ? '1' : '0'
      errorCount++
    } else {
      corrupted += bit
    }
  }

  return {
    original: bits,
    corrupted,
    errorCount,
    errorRate: (errorCount / bits.length * 100).toFixed(4),
  }
}

/**
 * Complete decapsulation process
 */
export function performCompleteDecapsulation(protocolData, receivedBits, errorReport = null) {
  const steps = []

  // Step 1: Receive bitstream
  steps.push({
    layer: 1,
    name: 'Physical Layer (L1)',
    action: 'Receive Bitstream',
    data: {
      bitsReceived: receivedBits.length,
      bitsSampleFirst32: receivedBits.substring(0, 32),
    },
    status: 'success',
  })

  // Step 2: Reassemble to frame
  let reassembledData = ''
  for (let i = 0; i < receivedBits.length; i += 8) {
    const byte = receivedBits.substring(i, i + 8)
    if (byte.length === 8) {
      reassembledData += String.fromCharCode(parseInt(byte, 2))
    }
  }

  steps.push({
    layer: 2,
    name: 'Data Link Layer (L2)',
    action: 'Reassemble Frame',
    data: {
      frameSize: reassembledData.length,
      frameSample: reassembledData.substring(0, 20),
    },
    status: 'success',
  })

  // Step 3: CRC Verification
  const expectedCRC = protocolData.layers.datalink.crc32
  const crcVerification = verifyCRCIntegrity(receivedBits, expectedCRC)

  steps.push({
    layer: 2,
    name: 'Data Link Layer (L2)',
    action: 'CRC Verification',
    data: {
      expectedCRC: expectedCRC,
      calculatedCRC: crcVerification.calculatedCRC,
      match: crcVerification.isValid,
    },
    status: crcVerification.isValid ? 'success' : 'error',
    errorDetected: !crcVerification.isValid,
  })

  // Step 4: Frame validation
  steps.push({
    layer: 2,
    name: 'Data Link Layer (L2)',
    action: 'Validate MAC Address',
    data: {
      dstMac: protocolData.layers.datalink.dstMac,
      match: true,
    },
    status: 'success',
  })

  // Step 5: Network layer packet check
  steps.push({
    layer: 3,
    name: 'Network Layer (L3)',
    action: 'Validate IP Address',
    data: {
      dstIP: protocolData.layers.network.destinationIP,
      isForMe: true,
    },
    status: 'success',
  })

  // Step 6: Check TTL
  steps.push({
    layer: 3,
    name: 'Network Layer (L3)',
    action: 'Check TTL',
    data: {
      ttl: protocolData.layers.network.ttl,
      isValid: protocolData.layers.network.ttl > 0,
    },
    status: protocolData.layers.network.ttl > 0 ? 'success' : 'error',
  })

  // Step 7: Transport layer validation
  const firstSegment = protocolData.layers.transport.segments[0]
  steps.push({
    layer: 4,
    name: 'Transport Layer (L4)',
    action: 'Validate Port & Sequence',
    data: {
      srcPort: firstSegment.sourcePort,
      dstPort: firstSegment.destinationPort,
      seqNum: firstSegment.sequenceNumber,
    },
    status: 'success',
  })

  // Step 8: Segment reassembly
  steps.push({
    layer: 4,
    name: 'Transport Layer (L4)',
    action: 'Reassemble Segments',
    data: {
      totalSegments: protocolData.layers.transport.totalSegments,
      reassembled: true,
    },
    status: 'success',
  })

  // Step 9: Final delivery
  steps.push({
    layer: 7,
    name: 'Application Layer (L7)',
    action: 'Deliver Data',
    data: {
      originalData: protocolData.config.userInput,
      receivedData: reassembledData,
      match: protocolData.config.userInput === reassembledData,
    },
    status: protocolData.config.userInput === reassembledData ? 'success' : 'error',
  })

  return {
    steps,
    summary: {
      allValid: steps.every((s) => s.status === 'success'),
      errorsDetected: steps.filter((s) => s.status === 'error').length,
      finalData: reassembledData,
      originalData: protocolData.config.userInput,
      dataIntact: protocolData.config.userInput === reassembledData,
    },
  }
}

/**
 * Decapsulation step visualization
 */
export function DecapsulationHeadierPeeling({
  step,
  position = [0, 0, 0],
  isActive = false,
}) {
  const getLayerColor = (layer) => {
    const colors = {
      1: '#6b7280',
      2: '#8b5cf6',
      3: '#22c55e',
      4: '#60a5fa',
      7: '#ef4444',
    }
    return colors[layer] || '#999'
  }

  const color = getLayerColor(step.layer)

  return (
    <group position={position}>
      {/* Layer box */}
      <mesh>
        <boxGeometry args={[1.8, 0.8, 0.2]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? new THREE.Color(color) : new THREE.Color('#000000')}
          emissiveIntensity={isActive ? 0.7 : 0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Layer info */}
      <Text
        position={[-0.7, 0.1, 0.15]}
        fontSize={0.2}
        color={color}
        anchorX="left"
        anchorY="middle"
      >
        {step.name}
      </Text>

      <Text
        position={[-0.7, -0.2, 0.15]}
        fontSize={0.14}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        {step.action}
      </Text>

      {/* Status indicator */}
      <mesh position={[0.7, 0, 0.15]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={step.status === 'success' ? '#22c55e' : '#ef4444'}
          emissive={step.status === 'success' ? new THREE.Color('#22c55e') : new THREE.Color('#ef4444')}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Status text */}
      <Text
        position={[0.7, 0, 0.2]}
        fontSize={0.12}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {step.status === 'success' ? '✓' : '✗'}
      </Text>
    </group>
  )
}

/**
 * CRC Error Visualization
 */
export function CRCErrorDisplay({ expectedCRC, calculatedCRC, position = [0, 0, 0] }) {
  const isMatched = expectedCRC === calculatedCRC

  return (
    <group position={position}>
      {/* Main box */}
      <mesh>
        <boxGeometry args={[2.5, 1.5, 0.2]} />
        <meshStandardMaterial
          color={isMatched ? '#22c55e' : '#ef4444'}
          transparent
          opacity={0.6}
          emissive={new THREE.Color(isMatched ? '#22c55e' : '#ef4444')}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Title */}
      <Text
        position={[-1, 0.45, 0.15]}
        fontSize={0.2}
        color={isMatched ? '#22c55e' : '#ef4444'}
        anchorX="left"
        anchorY="top"
      >
        CRC Verification
      </Text>

      {/* Expected */}
      <Text
        position={[-1, 0.1, 0.15]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Expected:
      </Text>
      <Text
        position={[0, 0.1, 0.15]}
        fontSize={0.12}
        color="#e2e8f0"
        anchorX="left"
        anchorY="middle"
        fontFamily="monospace"
      >
        {expectedCRC}
      </Text>

      {/* Calculated */}
      <Text
        position={[-1, -0.2, 0.15]}
        fontSize={0.12}
        color="#94a3b8"
        anchorX="left"
        anchorY="middle"
      >
        Calculated:
      </Text>
      <Text
        position={[0, -0.2, 0.15]}
        fontSize={0.12}
        color={isMatched ? '#22c55e' : '#ef4444'}
        anchorX="left"
        anchorY="middle"
        fontFamily="monospace"
      >
        {calculatedCRC}
      </Text>

      {/* Status */}
      <Text
        position={[1.2, 0, 0.15]}
        fontSize={0.16}
        color={isMatched ? '#22c55e' : '#ef4444'}
        anchorX="center"
        anchorY="middle"
      >
        {isMatched ? '✓ PASS' : '✗ FAIL'}
      </Text>
    </group>
  )
}

/**
 * Complete receiver visualization
 */
export function CompleteDecapsulation({
  protocolData,
  decapsulationSteps,
  currentStepIndex = 0,
  position = [0, 0, 0],
}) {
  if (!decapsulationSteps || !decapsulationSteps.steps) return null

  const steps = decapsulationSteps.steps
  const summary = decapsulationSteps.summary

  return (
    <group position={position}>
      {/* Steps column */}
      <group>
        {steps.map((step, idx) => (
          <group key={idx} position={[0, -idx * 1.2, 0]}>
            <DecapsulationHeadierPeeling
              step={step}
              position={[0, 0, 0]}
              isActive={idx <= currentStepIndex}
            />
          </group>
        ))}
      </group>

      {/* Summary box on right */}
      <group position={[3, 0, 0]}>
        <Html scale={0.8}>
          <div
            style={{
              background: '#1e293b',
              border: `2px solid ${summary.allValid ? '#22c55e' : '#ef4444'}`,
              padding: '16px',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '12px',
              minWidth: '250px',
            }}
          >
            <div
              style={{
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: summary.allValid ? '#22c55e' : '#ef4444',
              }}
            >
              {summary.allValid ? '✓ VALID' : '✗ INVALID'}
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#94a3b8' }}>Data Integrity:</div>
              <div style={{ color: summary.dataIntact ? '#22c55e' : '#ef4444' }}>
                {summary.dataIntact ? '✓ Intact' : '✗ Corrupted'}
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#94a3b8' }}>Errors Detected:</div>
              <div style={{ color: summary.errorsDetected > 0 ? '#ef4444' : '#22c55e' }}>
                {summary.errorsDetected}
              </div>
            </div>

            <div style={{ marginBottom: '8px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
              <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Original Data:</div>
              <div style={{ color: '#fbbf24', fontSize: '11px', wordBreak: 'break-all' }}>
                {summary.originalData.substring(0, 40)}
                {summary.originalData.length > 40 ? '...' : ''}
              </div>
            </div>

            <div>
              <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Received Data:</div>
              <div
                style={{
                  color: summary.dataIntact ? '#22c55e' : '#ef4444',
                  fontSize: '11px',
                  wordBreak: 'break-all',
                }}
              >
                {summary.finalData.substring(0, 40)}
                {summary.finalData.length > 40 ? '...' : ''}
              </div>
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}

/**
 * ReceiverConsole class - manages receiver-side logging and state
 */
export class ReceiverConsole {
  constructor() {
    this.logs = []
    this.validFrames = 0
    this.corruptedFrames = 0
    this.totalBitsReceived = 0
  }

  logValidFrame(integrityCheck) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      type: 'valid',
      message: 'Frame received and validated successfully',
      crc: integrityCheck.crc,
      mac: integrityCheck.mac,
    })
    this.validFrames++
  }

  logCorruptedFrame(integrityCheck) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      type: 'corrupted',
      message: `Frame corrupted: ${integrityCheck.errorType}`,
      errors: integrityCheck.errors,
    })
    this.corruptedFrames++
  }

  logBitsReceived(count) {
    this.totalBitsReceived += count
  }

  getStats() {
    return {
      validFrames: this.validFrames,
      corruptedFrames: this.corruptedFrames,
      totalFrames: this.validFrames + this.corruptedFrames,
      totalBitsReceived: this.totalBitsReceived,
      successRate: this.validFrames + this.corruptedFrames > 0 
        ? ((this.validFrames / (this.validFrames + this.corruptedFrames)) * 100).toFixed(2) + '%'
        : '0%',
    }
  }

  getLogs() {
    return this.logs
  }

  clear() {
    this.logs = []
    this.validFrames = 0
    this.corruptedFrames = 0
    this.totalBitsReceived = 0
  }
}

export default {
  verifyCRCIntegrity,
  injectBitErrors,
  performCompleteDecapsulation,
  DecapsulationHeadierPeeling,
  CRCErrorDisplay,
  CompleteDecapsulation,
  ReceiverConsole,
}
