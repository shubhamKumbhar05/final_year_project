/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
/* eslint-enable no-unused-vars */
import { getLayerById } from '../../data/osiLayers'
import ConceptButton from './ConceptButton'

/**
 * Phase 4: Concepts Display Panel
 * Shows all concepts for the selected layer only.
 * other layers remain hidden.
 */
export default function ConceptsPanel({ selectedLayerId, onConceptSelect, selectedConcept }) {
  const layer = getLayerById(selectedLayerId)
  
  if (!layer) return null

  const colorMap = {
    application: { text: 'text-green-400', layerColor: 'text-green-400' },
    transport: { text: 'text-purple-400', layerColor: 'text-purple-400' },
    network: { text: 'text-blue-400', layerColor: 'text-blue-400' },
    datalink: { text: 'text-amber-400', layerColor: 'text-amber-400' },
  }

  const colors = colorMap[layer.id]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={layer.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="w-full bg-[#050505]/50 border-b border-cyan-900/20"
      >
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
          {/* ── Header ────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="space-y-3"
          >
            <div className="flex items-baseline justify-between">
              <h2 className={`text-4xl font-black tracking-tight ${colors.text}`}>
                {layer.name}
              </h2>
              <span className={`text-sm opacity-60 ${colors.text}`}>
                Layer {layer.number}
              </span>
            </div>
            <p className="text-cyan-200/70 text-lg leading-relaxed max-w-2xl">
              {layer.description}
            </p>
          </motion.div>

          {/* ── Concepts Grid ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="space-y-4"
          >
            <h3 className={`text-lg font-bold ${colors.text}`}>
              {layer.concepts.length} Concepts to Explore
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {layer.concepts.map((concept, index) => (
                <motion.div
                  key={concept.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.2 + index * 0.05,
                    duration: 0.3,
                  }}
                >
                  <ConceptButton
                    concept={concept}
                    layerColor={colors.layerColor}
                    isActive={selectedConcept === concept.id}
                    onClick={onConceptSelect}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Helper hint ────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="text-sm text-cyan-300/50 italic border-t border-cyan-900/20 pt-6"
          >
            ↓ Click any concept button to view its details below
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
