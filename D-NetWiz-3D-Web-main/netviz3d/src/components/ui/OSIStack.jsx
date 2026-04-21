/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { motion } from 'framer-motion'
/* eslint-enable no-unused-vars */
import { OSI_LAYERS } from '../../data/osiLayers'
import OSILayerCard from './OSILayerCard'

/**
 * Phase 3: OSI Stack Component (Updated)
 * Displays all 4 OSI layer cards with expandable concept grids.
 * 
 * Features:
 * - Vertical accordion layout
 * - Glassmorphism cards with hover effects
 * - Expandable concept grids for each layer
 * - Smooth animations with Framer Motion
 * - Concept selection tracking
 */
export default function OSIStack({ onLayerClick, onConceptSelect }) {
  const [expandedLayer, setExpandedLayer] = useState(null)
  const [selectedConcept, setSelectedConcept] = useState(null)

  const handleCardClick = (layerId) => {
    // Toggle expansion
    setExpandedLayer(expandedLayer === layerId ? null : layerId)
    if (onLayerClick) {
      onLayerClick(layerId)
    }
  }

  const handleConceptClick = (conceptId) => {
    // Toggle concept selection
    setSelectedConcept(selectedConcept === conceptId ? null : conceptId)
    if (onConceptSelect) {
      onConceptSelect(conceptId)
    }
  }

  return (
    <div id="osi-stack" className="relative w-full bg-[#050505] py-20 px-4">
      {/* ── Section header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto mb-16 text-center"
      >
        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4
                       bg-gradient-to-r from-cyan-400 to-blue-300
                       bg-clip-text text-transparent">
          The OSI Stack
        </h2>
        <p className="text-cyan-200/70 text-lg max-w-2xl mx-auto">
          Click on any layer to explore its concepts and prepare for 3D visualization
        </p>
      </motion.div>

      {/* ── Cards container ────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto space-y-0">
        {OSI_LAYERS.map((layer, index) => (
          <OSILayerCard
            key={layer.id}
            layer={layer}
            index={index}
            isExpanded={expandedLayer === layer.id}
            onCardClick={handleCardClick}
            onConceptClick={handleConceptClick}
            selectedConcept={selectedConcept}
          />
        ))}
      </div>

      {/* ── Bottom hint ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        viewport={{ once: true }}
        className="mt-20 text-center text-cyan-400/50 text-sm tracking-widest uppercase"
      >
        Scroll down to explore each layer • Click cards to expand
      </motion.div>

      {/* ── Gradient divider ────────────────────────────────────────────── */}
      <div className="mt-16 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </div>
  )
}
