/* eslint-disable no-unused-vars */
import React from 'react'
import { motion } from 'framer-motion'
/* eslint-enable no-unused-vars */
import { isValidIp, isValidMask } from '../../utils/ipAddressUtils'

export default function IPAddressingControlPanel({
  ipAddress,
  subnetMask,
  onIpChange,
  onMaskChange,
  onShowNetwork,
  onSendToSameNetwork,
  onSendToDifferentNetwork,
  onReset,
  isAnimating = false,
}) {
  const ipIsValid = isValidIp(ipAddress)
  const maskIsValid = isValidMask(subnetMask)
  const isInputValid = ipIsValid && maskIsValid

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent p-8 z-10 pointer-events-none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.45 }}
      role="region"
      aria-label="IP Addressing Control Panel"
    >
      <div className="max-w-5xl mx-auto pointer-events-auto rounded-2xl border border-cyan-500/30 bg-slate-900/70 backdrop-blur-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* IPv4 Address Input */}
          <div className="flex flex-col">
            <label htmlFor="ipv4-input" className="text-cyan-200 text-sm font-semibold mb-2">
              IPv4 Address
            </label>
            <input
              id="ipv4-input"
              type="text"
              value={ipAddress}
              onChange={(event) => onIpChange(event.target.value)}
              placeholder="192.168.1.10"
              disabled={isAnimating}
              aria-label="IPv4 Address input"
              aria-describedby="ipv4-status"
              className={`w-full rounded-lg border px-4 py-2.5 text-slate-100 outline-none transition ${
                isAnimating
                  ? 'border-slate-600/30 bg-slate-950/40 cursor-not-allowed'
                  : ipIsValid
                    ? 'border-emerald-500/60 bg-slate-950/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-rose-500/60 bg-slate-950/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
              }`}
            />
            <p
              id="ipv4-status"
              className={`mt-2 text-xs transition ${
                ipIsValid ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'
              }`}
            >
              {ipIsValid ? '✓ Valid IPv4 address' : '✗ Invalid format (e.g., 192.168.1.10)'}
            </p>
          </div>

          {/* Subnet Mask Input */}
          <div className="flex flex-col">
            <label htmlFor="mask-input" className="text-cyan-200 text-sm font-semibold mb-2">
              Subnet Mask
            </label>
            <input
              id="mask-input"
              type="text"
              value={subnetMask}
              onChange={(event) => onMaskChange(event.target.value)}
              placeholder="255.255.255.0"
              disabled={isAnimating}
              aria-label="Subnet Mask input"
              aria-describedby="mask-status"
              className={`w-full rounded-lg border px-4 py-2.5 text-slate-100 outline-none transition ${
                isAnimating
                  ? 'border-slate-600/30 bg-slate-950/40 cursor-not-allowed'
                  : maskIsValid
                    ? 'border-emerald-500/60 bg-slate-950/60 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-rose-500/60 bg-slate-950/60 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20'
              }`}
            />
            <p
              id="mask-status"
              className={`mt-2 text-xs transition ${
                maskIsValid ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'
              }`}
            >
              {maskIsValid ? '✓ Valid subnet mask' : '✗ Must use contiguous 1s then 0s (e.g., 255.255.255.0)'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onShowNetwork}
            disabled={isAnimating || !isInputValid}
            aria-label="Show Network - Visualize network grouping"
            className="inline-flex items-center gap-2 rounded-lg border border-purple-400/50 bg-purple-500/20 px-4 py-2.5 text-sm font-semibold text-purple-100 transition duration-200 hover:enabled:bg-purple-500/35 hover:enabled:border-purple-300/70 active:enabled:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>🎯</span>
            Show Network
          </button>
          <button
            type="button"
            onClick={onSendToSameNetwork}
            disabled={isAnimating || !isInputValid}
            aria-label="Send to Same Network - Route packet within same network"
            className="inline-flex items-center gap-2 rounded-lg border border-pink-400/50 bg-pink-500/20 px-4 py-2.5 text-sm font-semibold text-pink-100 transition duration-200 hover:enabled:bg-pink-500/35 hover:enabled:border-pink-300/70 active:enabled:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>→</span>
            Send (Same)
          </button>
          <button
            type="button"
            onClick={onSendToDifferentNetwork}
            disabled={isAnimating || !isInputValid}
            aria-label="Send to Different Network - Route packet across networks"
            className="inline-flex items-center gap-2 rounded-lg border border-rose-400/50 bg-rose-500/20 px-4 py-2.5 text-sm font-semibold text-rose-100 transition duration-200 hover:enabled:bg-rose-500/35 hover:enabled:border-rose-300/70 active:enabled:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>↔️</span>
            Send (Diff)
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isAnimating}
            aria-label="Reset Animation - Clear all animations and reset state"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-400/50 bg-slate-500/20 px-4 py-2.5 text-sm font-semibold text-slate-100 transition duration-200 hover:enabled:bg-slate-500/35 hover:enabled:border-slate-300/70 active:enabled:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>🔄</span>
            Reset
          </button>
        </div>

        <div className="mt-6 px-4 py-3 rounded-lg bg-slate-800/40 border border-cyan-500/20">
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            <span className="font-semibold text-cyan-300">Phases:</span> 1️⃣ Binary bits | 2️⃣ Subnet divider | 3️⃣ Network grouping | 4️⃣ Packet routing | 5️⃣ AND operation
          </p>
          {!isInputValid && (
            <p className="text-xs text-amber-300/90 mt-2">
              ⚠️ Please enter valid IP address and subnet mask to enable animations
            </p>
          )}
          {isAnimating && (
            <p className="text-xs text-cyan-300/90 mt-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              Animation in progress...
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
