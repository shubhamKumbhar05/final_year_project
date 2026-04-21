/* eslint-disable no-unused-vars */
import React from 'react'
import { motion } from 'framer-motion'
/* eslint-enable no-unused-vars */
import { OSI_LAYERS } from '../../data/osiLayers'

/**
 * Phase 4: OSI Layer Tabs Component
 * Compact tab buttons for layer selection.
 * Only one layer's concepts displayed at a time.
 */
export default function OSILayerTabs({ selectedLayer, onLayerSelect }) {
  const colorMap = {
    application: { bg: 'bg-green-500/20', border: 'border-green-500/50', text: 'text-green-400', hover: 'hover:bg-green-500/30' },
    transport: { bg: 'bg-purple-500/20', border: 'border-purple-500/50', text: 'text-purple-400', hover: 'hover:bg-purple-500/30' },
    network: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', hover: 'hover:bg-blue-500/30' },
    datalink: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', hover: 'hover:bg-amber-500/30' },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-[#050505] border-b border-cyan-900/20 sticky top-0 z-40 backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap gap-3 items-center justify-center md:justify-start">
        {OSI_LAYERS.map((layer) => {
          const colors = colorMap[layer.id]
          const isSelected = selectedLayer === layer.id

          return (
            <motion.button
              key={layer.id}
              onClick={() => onLayerSelect(layer.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className={`
                px-6
                py-3
                rounded-lg
                border-2
                font-bold
                tracking-wide
                transition-all
                duration-200
                ${
                  isSelected
                    ? `${colors.bg} ${colors.border} ${colors.text} shadow-[0_0_20px_rgba(255,255,255,0.1)]`
                    : `border-cyan-900/30 text-cyan-400/70 hover:border-cyan-600/50 hover:text-cyan-300 ${colors.hover}`
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60">Layer {layer.number}</span>
                <span className="hidden sm:inline">{layer.name}</span>
                <span className="sm:hidden">{layer.name.split(' ')[0]}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
