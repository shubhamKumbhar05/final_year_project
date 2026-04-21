/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
/* eslint-enable no-unused-vars */
import { OSI_LAYERS, getLayerById } from '../../data/osiLayers'
import ConceptButton from './ConceptButton'

/**
 * OSI Explorer - Two Column Layout
 * Left: OSI Layer buttons
 * Right: Concepts for selected layer
 * 
 * Props:
 * - selectedLayer: Initial layer ID to display (from parent)
 * - onBack: Callback to return to menu
 * - onView3D: Callback to navigate to 3D visualization (receives conceptId)
 */
export default function OSIExplorer({ selectedLayer: initialLayer, onBack, onView3D }) {
  const [selectedLayer, setSelectedLayer] = useState(initialLayer || 'network')
  const [selectedConcept, setSelectedConcept] = useState(null)

  const colorMap = {
    application: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', hover: 'hover:bg-green-500/20' },
    presentation: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', hover: 'hover:bg-pink-500/20' },
    session: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', hover: 'hover:bg-rose-500/20' },
    transport: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', hover: 'hover:bg-purple-500/20' },
    network: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', hover: 'hover:bg-blue-500/20' },
    datalink: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', hover: 'hover:bg-amber-500/20' },
    physical: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', hover: 'hover:bg-yellow-500/20' },
  }

  const currentLayer = getLayerById(selectedLayer)
  const currentLayerColors = currentLayer ? (colorMap[currentLayer.id] || colorMap.network) : colorMap.network

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="relative min-h-screen w-full bg-[#050505] flex"
    >
      {/* ── LEFT SIDEBAR: OSI Layers ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full md:w-72 bg-[#050505]/80 border-r border-cyan-900/20 p-4 md:p-6 space-y-4 flex flex-col overflow-x-hidden"
      >
        <h2 className="text-2xl font-bold text-cyan-400 mb-8 tracking-tight">
          OSI Layers
        </h2>

        <div className="space-y-3">
          {OSI_LAYERS.map((layer) => {
            const colors = colorMap[layer.id] || { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', hover: 'hover:bg-cyan-500/20' }
            const isSelected = selectedLayer === layer.id

            return (
              <motion.button
                key={layer.id}
                onClick={() => {
                  setSelectedLayer(layer.id)
                  setSelectedConcept(null)
                }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full
                  text-left
                  p-4
                  rounded-lg
                  border-2
                  transition-all
                  duration-200
                  ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ${colors.text} shadow-[0_0_15px_rgba(255,255,255,0.1)]`
                      : `border-cyan-900/30 text-cyan-400/70 ${colors.hover}`
                  }
                `}
              >
                <div className="space-y-1">
                  <h3 className="font-bold text-base">
                    {layer.name}
                  </h3>
                  <p className="text-xs opacity-60 line-clamp-1">
                    {layer.description}
                  </p>
                  <span className="text-xs opacity-50">
                    {layer.concepts.length} concepts
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* ── RIGHT PANEL: Concepts ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeInOut' }}
        className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden"
      >
        <AnimatePresence mode="wait">
          {currentLayer && (
            <motion.div
              key={currentLayer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* ── Header with Back Button ────────────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="space-y-4"
              >
                {onBack && (
                  <motion.button
                    onClick={onBack}
                    whileHover={{ x: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium mb-4"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Menu
                  </motion.button>
                )}
                <div>
                  <h2 className={`text-3xl md:text-4xl font-black tracking-tight mb-3 ${currentLayerColors.text}`}>
                    {currentLayer.name}
                  </h2>
                  <p className="text-cyan-200/70 text-sm md:text-base leading-relaxed">
                    {currentLayer.description}
                  </p>
                </div>
              </motion.div>

              {/* ── Concepts Grid ────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="space-y-8"
              >
                {/* Concepts Section Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-8 rounded-full ${currentLayerColors.bg}`}></div>
                    <h3 className={`text-2xl font-black tracking-tight ${currentLayerColors.text}`}>
                      {currentLayer.concepts.length} Concepts to Explore
                    </h3>
                  </div>
                  <div className="h-px bg-gradient-to-r from-cyan-500/30 via-cyan-500/10 to-transparent"></div>
                </motion.div>

                {/* Concepts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentLayer.concepts.map((concept, index) => (
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
                          layerColor={currentLayerColors.text}
                          isActive={selectedConcept === concept.id}
                          onClick={(id) => setSelectedConcept(selectedConcept === id ? null : id)}
                        />
                      </motion.div>
                    ))}
                </div>

                {/* ── Detail Display ────────────────────────────────── */}
                {selectedConcept && (
                  <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -30, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`
                      mt-10
                      p-4 md:p-8
                      rounded-xl
                      border-2
                      ${currentLayerColors.border}
                      ${currentLayerColors.bg}
                      backdrop-blur-xl
                      space-y-6
                      shadow-[0_0_40px_rgba(0,0,0,0.3)]
                    `}
                  >
                    {(() => {
                      const concept = currentLayer.concepts.find(c => c.id === selectedConcept)
                      return concept ? (
                        <>
                          {/* Title */}
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, duration: 0.3 }}
                          >
                            <h4 className={`text-3xl font-black tracking-tight ${currentLayerColors.text}`}>
                              {concept.name}
                            </h4>
                          </motion.div>

                          {/* Concept Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-6">
                            {/* Meaning */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2, duration: 0.3 }}
                              className="p-5 rounded-lg bg-cyan-900/20 border border-cyan-700/30"
                            >
                              <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${currentLayerColors.text}`}>
                                📖 Meaning
                              </p>
                              <p className="text-cyan-200/90 text-sm leading-relaxed">
                                {concept.meaning}
                              </p>
                            </motion.div>

                            {/* Example */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.25, duration: 0.3 }}
                              className="p-5 rounded-lg bg-cyan-900/20 border border-cyan-700/30"
                            >
                              <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${currentLayerColors.text}`}>
                                💡 Example
                              </p>
                              <p className="text-cyan-200/90 text-sm leading-relaxed">
                                {concept.example}
                              </p>
                            </motion.div>

                            {/* Visualization Goal */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3, duration: 0.3 }}
                              className="p-5 rounded-lg bg-cyan-900/20 border border-cyan-700/30"
                            >
                              <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${currentLayerColors.text}`}>
                                🎯 Visual Goal
                              </p>
                              <p className="text-cyan-200/90 text-sm leading-relaxed">
                                {concept.visualGoal}
                              </p>
                            </motion.div>
                          </div>

                          {/* View 3D Button */}
                          {onView3D && (
                            <motion.button
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.35, duration: 0.3 }}
                              onClick={() => onView3D(selectedConcept)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`
                                w-full
                                mt-6
                                px-6 py-3 rounded-lg
                                font-semibold text-white
                                transition-all duration-300
                                flex items-center justify-center gap-2
                                ${currentLayerColors.bg}
                                border-2 ${currentLayerColors.border}
                                ${currentLayerColors.hover}
                              `}
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              View 3D Visualization
                            </motion.button>
                          )}
                        </>
                      ) : null
                    })()}
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
