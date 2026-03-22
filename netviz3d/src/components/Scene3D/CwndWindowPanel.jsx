import React from 'react'
import { motion } from 'framer-motion' // eslint-disable-line no-unused-vars

/**
 * CwndWindowPanel - Screen Overlay Component
 * Displays the congestion window visualization as a fixed UI overlay
 * Stays on screen while 3D scene rotates
 */
export default function CwndWindowPanel({ 
  cwnd = 1, 
  ssthresh = 8, 
  maxCwnd = 25, 
  stateColor = '#9ca3af',
  bottomOffset = 220,
}) {
  // Scale values to the active max range and clamp to avoid overflow artifacts.
  const rangeMax = Math.max(1, maxCwnd)
  const safeCwnd = Math.min(rangeMax, Math.max(0, cwnd))
  const safeSsthresh = Math.min(rangeMax, Math.max(0, ssthresh))
  const thresholdPercent = (safeSsthresh / rangeMax) * 100
  const maxPercent = (maxCwnd / rangeMax) * 100
  const cwndPercent = (safeCwnd / rangeMax) * 100

  return (
    <motion.div
      className="fixed left-1/2 transform -translate-x-1/2 z-20 pointer-events-none w-4/5"
      style={{ bottom: `${bottomOffset}px` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
    >
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-950/95 border-3 border-cyan-500/50 rounded-xl p-4 shadow-2xl w-full backdrop-blur-md">
        {/* Main Window Visualization */}
        <div className="relative bg-gradient-to-b from-slate-800 via-slate-800/80 to-slate-900 rounded-lg overflow-hidden border-2 border-slate-700/50 p-3 mb-3 h-16">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/10 via-transparent to-blue-900/10 pointer-events-none"></div>
          
          {/* Scale grid background */}
          <div className="absolute inset-0 flex opacity-30">
            {[0, 5, 10, 15, 20, 25].map((num) => (
              <div
                key={`grid-${num}`}
                className="flex-1 border-r border-slate-600/40 last:border-r-0"
              ></div>
            ))}
          </div>

          {/* Relative positioning container */}
          <div className="relative h-full flex items-center">
            {/* cwnd Bar - Grows from left to right */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 rounded-r-md"
              animate={{
                width: `${cwndPercent}%`,
                opacity: cwndPercent > 0 ? 1 : 0.3,
              }}
              transition={{
                type: 'spring',
                stiffness: 50,
                damping: 12,
                mass: 0.8,
              }}
              style={{
                left: 0,
                height: '75%',
                background: `linear-gradient(90deg, ${stateColor}, ${stateColor}dd)`,
                filter: `drop-shadow(0 0 15px ${stateColor}99)`,
              }}
            >
              {/* Inner shimmer effect */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-r-md"
                animate={{
                  x: ['0%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              {/* cwnd Value Label */}
              <motion.div 
                className="absolute inset-0 flex items-center justify-end pr-4 text-white font-bold text-xl font-mono"
                animate={{
                  scale: cwnd > 8 ? 1.1 : 1,
                  textShadow: `0 0 12px ${stateColor}`,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
              >
                {Math.round(cwnd)}
              </motion.div>
            </motion.div>

            {/* Threshold Line - Yellow */}
            <motion.div
              className="absolute top-0 bottom-0 rounded-full"
              animate={{
                left: `calc(${thresholdPercent}% - 3px)`,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 20,
              }}
              style={{
                width: '6px',
                background: 'linear-gradient(to bottom, rgba(253, 224, 71, 0.3), rgba(253, 224, 71, 0.9))',
                boxShadow: '0 0 20px rgba(253, 224, 71, 0.9), inset 0 0 10px rgba(253, 224, 71, 0.6)',
                borderLeft: '2px solid rgba(253, 224, 71, 1)',
                borderRight: '2px solid rgba(253, 224, 71, 1)',
              }}
            />

            {/* Max Line - Red */}
            <motion.div
              className="absolute top-0 bottom-0 rounded-full"
              animate={{
                left: `calc(${maxPercent}% - 3px)`,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 20,
              }}
              style={{
                width: '6px',
                background: 'linear-gradient(to bottom, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.9))',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.9), inset 0 0 10px rgba(239, 68, 68, 0.6)',
                borderLeft: '2px solid rgba(239, 68, 68, 1)',
                borderRight: '2px solid rgba(239, 68, 68, 1)',
              }}
            />
          </div>

          {/* Scale Numbers at Bottom */}
          <div className="absolute bottom-2 left-0 right-0 flex text-xs font-mono text-slate-400/80 px-2">
            {[0, 5, 10, 15, 20, 25].map((num) => (
              <motion.div 
                key={`label-${num}`} 
                className="flex-1 text-center"
                animate={{
                  opacity: num <= cwnd ? 1 : 0.6,
                  scale: num <= cwnd ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {num}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legend and Values */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {/* cwnd Value */}
          <motion.div 
            className="rounded-lg p-1 text-center"
            animate={{
              borderColor: `${stateColor}aa`,
              boxShadow: `0 0 15px ${stateColor}40, inset 0 0 10px ${stateColor}15`,
              backgroundColor: `${stateColor}15`,
            }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 15,
            }}
            style={{
              border: `2px solid ${stateColor}40`,
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <motion.div 
                className="text-sm font-bold text-cyan-300 font-mono"
                animate={{
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 10,
                }}
                key={Math.round(cwnd)}
              >
                {Math.round(cwnd)}
              </motion.div>
              <div className="text-xs text-cyan-400 font-semibold">CWND</div>
            </div>
          </motion.div>

          {/* Threshold Value */}
          <motion.div 
            className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 rounded-lg p-1 border-2 border-yellow-400/60 text-center"
            animate={{
              boxShadow: cwnd >= ssthresh ? '0 0 20px rgba(250, 204, 21, 0.6)' : '0 0 10px rgba(250, 204, 21, 0.3)',
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="text-sm font-bold text-yellow-400 font-mono">{ssthresh}</div>
              <div className="text-xs text-yellow-400 font-semibold">THRESHOLD</div>
            </div>
          </motion.div>

          {/* Max Value */}
          <motion.div 
            className="bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-lg p-1 border-2 border-red-400/60 text-center"
            animate={{
              boxShadow: cwnd >= maxCwnd ? '0 0 25px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.3)',
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-center gap-1">
              <div className="text-sm font-bold text-red-400 font-mono">{maxCwnd}</div>
              <div className="text-xs text-red-400 font-semibold">MAX LIMIT</div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
