/**
 * Calculation Dashboard
 * Displays:
 * - Live protocol calculations log
 * - Delay breakdown visualization
 * - Header information
 * - Segmentation details
 */

import React from 'react'
import * as THREE from 'three'

/**
 * Delay breakdown bar chart
 */
export function DelayBreakdownChart({ protocolData }) {
  if (!protocolData || !protocolData.layers || !protocolData.layers.physical) return null

  const delays = protocolData.layers.physical.delays || {}
  const total = protocolData.layers.physical.total?.delayMs || protocolData.summary?.delays?.total || 0.001

  // Prevent division by zero
  const safeTotal = Math.max(total, 0.001)

  const percentages = {
    transmission: ((delays.transmission || 0) / safeTotal * 100).toFixed(1),
    propagation: ((delays.propagation || 0) / safeTotal * 100).toFixed(1),
    processing: ((delays.processing || 0) / safeTotal * 100).toFixed(1),
    queue: ((delays.queue || 0) / safeTotal * 100).toFixed(1),
  }

  return (
    <div style={{ width: '100%', marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
        🕐 Delay Breakdown ({safeTotal.toFixed(4)}ms total)
      </div>

      {/* Transmission delay bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#fbbf24' }}>Transmission (d_trans):</span>
          <span style={{ color: '#fbbf24' }}>
            {(delays.transmission || 0).toFixed(4)}ms ({percentages.transmission}%)
          </span>
        </div>
        <div style={{ background: '#334155', height: '12px', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              height: '100%',
              width: `${Math.min(95, parseFloat(percentages.transmission)) || 1}%`,
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          Physical transmission rate calculation
        </div>
      </div>

      {/* Propagation delay bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#60a5fa' }}>Propagation (d_prop):</span>
          <span style={{ color: '#60a5fa' }}>
            {(delays.propagation || 0).toFixed(4)}ms ({percentages.propagation}%)
          </span>
        </div>
        <div style={{ background: '#334155', height: '12px', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
              height: '100%',
              width: `${Math.min(95, parseFloat(percentages.propagation)) || 1}%`,
            }}
          />
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          Physical distance via fiber: ~100km at 2/3 light speed
        </div>
      </div>

      {/* Processing delay bar */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#22c55e' }}>Processing (d_proc):</span>
          <span style={{ color: '#22c55e' }}>
            {(delays.processing || 0).toFixed(4)}ms ({percentages.processing}%)
          </span>
        </div>
        <div style={{ background: '#334155', height: '12px', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              height: '100%',
              width: `${Math.min(95, parseFloat(percentages.processing)) || 1}%`,
            }}
          />
        </div>
      </div>

      {/* Queue delay bar (usually 0) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
          <span style={{ color: '#8b5cf6' }}>Queue (d_queue):</span>
          <span style={{ color: '#8b5cf6' }}>
            {(delays.queue || 0).toFixed(4)}ms ({percentages.queue}%)
          </span>
        </div>
        <div style={{ background: '#334155', height: '12px', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
              height: '100%',
              width: `${Math.min(95, parseFloat(percentages.queue)) || 0.5}%`,
            }}
          />
        </div>
      </div>

      {/* Total */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px',
          background: '#1e293b',
          borderLeft: '3px solid #88ff00',
          borderRadius: '4px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
          <span style={{ color: '#88ff00' }}>Total End-to-End Delay:</span>
          <span style={{ color: '#fbbf24' }}>{safeTotal.toFixed(4)}ms</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Segmentation details
 */
export function SegmentationTable({ protocolData }) {
  if (!protocolData || !protocolData.layers || !protocolData.layers.transport) return null

  const transport = protocolData.layers.transport || {}
  const segments = transport.segments || []
  const mss = transport.mss || 1460
  const totalSegments = protocolData.summary?.totalSegments || segments.length

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
        📦 Segmentation (L4)
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ background: '#334155' }}>
            <th style={{ padding: '6px', textAlign: 'left', color: '#e2e8f0' }}>Segment</th>
            <th style={{ padding: '6px', textAlign: 'left', color: '#e2e8f0' }}>Seq #</th>
            <th style={{ padding: '6px', textAlign: 'left', color: '#e2e8f0' }}>Size</th>
            <th style={{ padding: '6px', textAlign: 'left', color: '#e2e8f0' }}>Port</th>
          </tr>
        </thead>
        <tbody>
          {segments.slice(0, 5).map((seg, idx) => (
            <tr
              key={idx}
              style={{
                background: idx % 2 === 0 ? '#1e293b' : '#0f172a',
                borderBottom: '1px solid #334155',
              }}
            >
              <td style={{ padding: '6px', color: '#60a5fa' }}>#{seg.segmentId || idx}</td>
              <td style={{ padding: '6px', color: '#94a3b8', fontFamily: 'monospace' }}>
                {seg.sequenceNumber || (idx * mss)}
              </td>
              <td style={{ padding: '6px', color: '#94a3b8' }}>{seg.length || mss}B</td>
              <td style={{ padding: '6px', color: '#94a3b8', fontFamily: 'monospace' }}>
                {seg.sourcePort || 5000}→{seg.destinationPort || 80}
              </td>
            </tr>
          ))}
          {segments.length > 5 && (
            <tr style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <td colSpan="4" style={{ padding: '6px', color: '#64748b', textAlign: 'center' }}>
                ... and {segments.length - 5} more segments
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div
        style={{
          marginTop: '8px',
          padding: '8px',
          background: '#1e293b',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#94a3b8',
        }}
      >
        Total: {totalSegments} segments × {mss}B MSS = {(totalSegments * mss)}B payload
      </div>
    </div>
  )
}

/**
 * Routing Information
 */
export function RoutingInfo({ protocolData }) {
  if (!protocolData) return null

  const network = protocolData.layers.network
  const routing = network

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
        🗺️ Routing (L3)
      </div>

      <div style={{ background: '#1e293b', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #22c55e' }}>
        <div style={{ marginBottom: '6px', color: '#94a3b8' }}>
          <span style={{ color: '#22c55e' }}>Source:</span> {routing.sourceIP}
        </div>
        <div style={{ marginBottom: '6px', color: '#94a3b8' }}>
          <span style={{ color: '#22c55e' }}>Destination:</span> {routing.destinationIP}
        </div>
        <div style={{ marginBottom: '6px', color: '#94a3b8' }}>
          <span style={{ color: '#22c55e' }}>Subnet Mask:</span> {routing.subnetMask}
        </div>
        <div
          style={{
            marginBottom: '6px',
            padding: '8px',
            background: '#0f172a',
            borderRadius: '3px',
            color: routing.isLocal ? '#22c55e' : '#f97316',
          }}
        >
          <span style={{ fontWeight: 'bold' }}>Routing Decision:</span> {routing.routingDecision}
        </div>
        <div style={{ marginBottom: '6px', fontSize: '10px', color: '#64748b' }}>
          <span style={{ color: '#8b5cf6' }}>Source Network:</span> {routing.sourceNetwork}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>
          <span style={{ color: '#8b5cf6' }}>Dest Network:</span> {routing.destinationNetwork}
        </div>
      </div>
    </div>
  )
}

/**
 * CRC Calculation Details
 */
export function CRCCalculation({ protocolData }) {
  if (!protocolData) return null

  const datalink = protocolData.layers.datalink
  const userInput = protocolData.config.userInput

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
        🔐 CRC Calculation (L2)
      </div>

      <div style={{ background: '#1e293b', padding: '10px', borderRadius: '4px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>Input Data:</div>
          <div
            style={{
              background: '#0f172a',
              padding: '6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              color: '#fbbf24',
              fontSize: '10px',
              wordBreak: 'break-all',
            }}
          >
            "{userInput.substring(0, 50)}{userInput.length > 50 ? '...' : ''}"
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>CRC32 Polynomial:</div>
          <div
            style={{
              background: '#0f172a',
              padding: '6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              color: '#60a5fa',
              fontSize: '10px',
            }}
          >
            0xEDB88320
          </div>
        </div>

        <div
          style={{
            background: '#0f172a',
            padding: '8px',
            borderRadius: '3px',
            borderLeft: '3px solid #22c55e',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>Result:</div>
          <div
            style={{
              fontFamily: 'monospace',
              color: '#22c55e',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {datalink.crc32}
          </div>
        </div>

        <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b' }}>
          CRC32 detects single-bit and multi-bit errors with high probability
        </div>
      </div>
    </div>
  )
}

/**
 * Bit Stuffing Visualization
 */
export function BitStuffingViz({ protocolData }) {
  if (!protocolData) return null

  const stuffing = protocolData.layers.datalink.bitStuffing

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
        🔗 Bit Stuffing (L2)
      </div>

      <div style={{ background: '#1e293b', padding: '10px', borderRadius: '4px' }}>
        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>Original Binary:</div>
          <div
            style={{
              background: '#0f172a',
              padding: '6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              color: '#60a5fa',
              fontSize: '9px',
              wordBreak: 'break-all',
              maxHeight: '60px',
              overflow: 'auto',
            }}
          >
            {stuffing.originalBinary}
          </div>
          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
            {stuffing.originalLength} bits
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '2px' }}>After Bit Stuffing:</div>
          <div
            style={{
              background: '#0f172a',
              padding: '6px',
              borderRadius: '3px',
              fontFamily: 'monospace',
              color: '#22c55e',
              fontSize: '9px',
              wordBreak: 'break-all',
              maxHeight: '60px',
              overflow: 'auto',
            }}
          >
            {stuffing.stuffedBinary}
          </div>
          <div style={{ color: '#64748b', fontSize: '10px', marginTop: '2px' }}>
            {stuffing.stuffedLength} bits (+{stuffing.overhead} stuff bits)
          </div>
        </div>

        <div
          style={{
            background: '#0f172a',
            padding: '8px',
            borderRadius: '3px',
            display: 'flex',
            justifyContent: 'space-around',
            fontSize: '11px',
          }}
        >
          <div>
            <div style={{ color: '#94a3b8' }}>Overhead:</div>
            <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{stuffing.framingOverhead}%</div>
          </div>
          <div>
            <div style={{ color: '#94a3b8' }}>Efficiency:</div>
            <div style={{ color: '#22c55e', fontWeight: 'bold' }}>
              {(100 - parseFloat(stuffing.framingOverhead)).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Complete Calculation Dashboard
 */
export function CalculationDashboard({ protocolData, calculationHistory = [], isMinimized = false, onToggleMinimize = () => {} }) {
  if (!protocolData) {
    return (
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #475569',
          padding: '16px',
          borderRadius: '8px',
          color: '#94a3b8',
        }}
      >
        No calculations yet. Send data to generate calculations.
      </div>
    )
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div
        onClick={onToggleMinimize}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#1e293b',
          border: '2px solid #88ff00',
          padding: '12px 16px',
          borderRadius: '8px',
          color: '#88ff00',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 50,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease',
        }}
      >
        📊 Calculation Dashboard ▲
      </div>
    )
  }

  // Expanded view
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#0f172a',
        border: '2px solid #334155',
        borderRadius: '12px',
        padding: '20px',
        color: '#e2e8f0',
        maxHeight: '600px',
        width: '420px',
        overflowY: 'auto',
        fontFamily: "'Courier New', monospace",
        zIndex: 50,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Header with minimize button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #334155',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#88ff00' }}>
          ⚙️ Protocol Calculations
        </div>
        <button
          onClick={onToggleMinimize}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            color: '#94a3b8',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#334155'
            e.target.style.color = '#e2e8f0'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.color = '#94a3b8'
          }}
        >
          ▼ Minimize
        </button>
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
        🕐 {new Date(protocolData.calculations.timestamp).toLocaleTimeString()}
      </div>

      {/* Main sections */}
      <DelayBreakdownChart protocolData={protocolData} />
      <SegmentationTable protocolData={protocolData} />
      <RoutingInfo protocolData={protocolData} />
      <CRCCalculation protocolData={protocolData} />
      <BitStuffingViz protocolData={protocolData} />

      {/* Summary statistics */}
      <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#e2e8f0' }}>
          📊 Summary Statistics
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {/* Payload size */}
          <div
            style={{
              background: '#1e293b',
              padding: '10px',
              borderRadius: '4px',
              borderLeft: '3px solid #60a5fa',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>Payload Size</div>
            <div style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 'bold' }}>
              {protocolData.summary.bytes.payload} bytes
            </div>
          </div>

          {/* Total frame size */}
          <div
            style={{
              background: '#1e293b',
              padding: '10px',
              borderRadius: '4px',
              borderLeft: '3px solid #8b5cf6',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>Total Frame Size</div>
            <div style={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 'bold' }}>
              {protocolData.summary.bytes.totalFrame} bytes
            </div>
          </div>

          {/* Total delay */}
          <div
            style={{
              background: '#1e293b',
              padding: '10px',
              borderRadius: '4px',
              borderLeft: '3px solid #fbbf24',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>Total Delay</div>
            <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' }}>
              {protocolData.summary.delays.total.toFixed(2)} ms
            </div>
          </div>

          {/* Segments */}
          <div
            style={{
              background: '#1e293b',
              padding: '10px',
              borderRadius: '4px',
              borderLeft: '3px solid #22c55e',
            }}
          >
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>Total Segments</div>
            <div style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>
              {protocolData.summary.totalSegments}
            </div>
          </div>
        </div>
      </div>

      {/* Calculation history */}
      {calculationHistory.length > 0 && (
        <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#88ff00' }}>
            📜 Calculation History ({calculationHistory.length})
          </div>
          <div
            style={{
              background: '#1e293b',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '10px',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            {calculationHistory.map((calc, idx) => (
              <div
                key={idx}
                style={{
                  padding: '4px',
                  borderBottom: '1px solid #334155',
                  color: '#94a3b8',
                }}
              >
                {idx + 1}. {calc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default {
  DelayBreakdownChart,
  SegmentationTable,
  RoutingInfo,
  CRCCalculation,
  BitStuffingViz,
  CalculationDashboard,
}
