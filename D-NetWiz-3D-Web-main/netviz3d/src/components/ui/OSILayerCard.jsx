/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
/* eslint-enable no-unused-vars */
import ConceptButton from './ConceptButton'

/**
 * Phase 3: OSI Layer Card Component (Updated)
 * Interactive card representing a single OSI layer with expandable concept grid.
 * 
 * Features:
 * - Glassmorphism styling (semi-transparent, blurred)
 * - Layer-specific color glow on hover
 * - Accordion expansion to reveal concept grid
 * - Smooth animations with Framer Motion
 * - Responsive concept button grid
 */
export default function OSILayerCard({
  layer,
  index,
  isExpanded,
  onCardClick,
  onConceptClick,
  selectedConcept,
  style,
}) {
  const [isHovered, setIsHovered] = useState(false)

  const colorMap = {
    application: {
      text: 'text-green-400',
      border: 'border-green-500/30',
      glow: 'shadow-[0_0_30px_#10b98180]',
      hoverGlow: 'hover:shadow-[0_0_50px_#10b981cc]',
      number: 'text-green-500/60',
      bg: 'bg-green-500',
      bgLight: 'bg-green-500/10',
    },
    transport: {
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      glow: 'shadow-[0_0_30px_#a855f780]',
      hoverGlow: 'hover:shadow-[0_0_50px_#a855f7cc]',
      number: 'text-purple-500/60',
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-500/10',
    },
    network: {
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      glow: 'shadow-[0_0_30px_#3b82f680]',
      hoverGlow: 'hover:shadow-[0_0_50px_#3b82f6cc]',
      number: 'text-blue-500/60',
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-500/10',
    },
    datalink: {
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      glow: 'shadow-[0_0_30px_#f59e0b80]',
      hoverGlow: 'hover:shadow-[0_0_50px_#f59e0bcc]',
      number: 'text-amber-500/60',
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-500/10',
    },
  }

  const colors = colorMap[layer.id] || colorMap.application

  return (
    <motion.div
      style={style}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
      viewport={{ once: false, margin: '-100px' }}
      className="w-full"
    >
      {/* ── Main Layer Card ────────────────────────────────────────── */}
      <div
        onClick={() => onCardClick(layer.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative
          group
          cursor-pointer
          p-8
          rounded-2xl
          border-2
          ${colors.border}
          bg-[#050505]/40
          backdrop-blur-xl
          transition-all
          duration-300
          ${colors.hoverGlow}
          ${isHovered ? colors.glow : ''}
          hover:border-opacity-70
          overflow-hidden
          ${isExpanded ? 'rounded-b-none border-b-0' : ''}
        `}
      >
        {/* ── Background glow effect ─────────────────────────────── */}
        <motion.div
          className={`
            absolute
            inset-0
            ${layer.id === 'application' && 'bg-gradient-to-br from-green-500/5 to-transparent'}
            ${layer.id === 'transport' && 'bg-gradient-to-br from-purple-500/5 to-transparent'}
            ${layer.id === 'network' && 'bg-gradient-to-br from-blue-500/5 to-transparent'}
            ${layer.id === 'datalink' && 'bg-gradient-to-br from-amber-500/5 to-transparent'}
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-300
            pointer-events-none
          `}
        />

        {/* ── Content ────────────────────────────────────────────── */}
        <div className="relative z-10 space-y-4">
          {/* Layer number and name */}
          <div className="flex items-baseline justify-between">
            <h3 className={`text-3xl font-bold tracking-tight ${colors.text}`}>
              {layer.name}
            </h3>
            <span className={`text-5xl font-black opacity-20 ${colors.number}`}>
              Layer {layer.number}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-cyan-200/70 leading-relaxed max-w-md">
            {layer.description}
          </p>

          {/* Number of concepts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
              {layer.concepts.length} concepts
            </span>
            <motion.span
              animate={isHovered ? { x: 5, rotate: isExpanded ? 90 : 0 } : { x: 0, rotate: 0 }}
              className={`${colors.text} font-bold text-base`}
            >
              {isExpanded ? '∨' : '→'}
            </motion.span>
          </div>
        </div>

        {/* ── Expanded indicator ─────────────────────────────────── */}
        {isExpanded && (
          <div className={`
            absolute
            top-4
            right-4
            w-2
            h-2
            rounded-full
            ${colors.text}
            animate-pulse
          `} />
        )}
      </div>

      {/* ── Accordion Expansion: Concept Grid ──────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`
              w-full
              border-2
              border-t-0
              ${colors.border}
              bg-[#050505]/20
              backdrop-blur-xl
              rounded-b-2xl
              overflow-hidden
            `}
          >
            <div className="p-6 space-y-6">
              {/* ── Grid header ────────────────────────────────────── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex items-center justify-between"
              >
                <h4 className={`text-lg font-bold ${colors.text}`}>
                  Explore Concepts
                </h4>
                <span className="text-xs text-cyan-400/50 tracking-widest uppercase">
                  Click to select
                </span>
              </motion.div>

              {/* ── Concept buttons grid ────────────────────────── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {layer.concepts.map((concept, conceptIndex) => (
                  <motion.div
                    key={concept.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.2 + conceptIndex * 0.05,
                      duration: 0.3,
                    }}
                  >
                    <ConceptButton
                      concept={concept}
                      layerColor={colors.text.includes('green')
                        ? 'text-green-400'
                        : colors.text.includes('purple')
                          ? 'text-purple-400'
                          : colors.text.includes('blue')
                            ? 'text-blue-400'
                            : 'text-amber-400'}
                      isActive={selectedConcept === concept.id}
                      onClick={onConceptClick}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* ── Helper text ────────────────────────────────── */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-xs text-cyan-300/50 text-center pt-2 border-t border-cyan-900/20"
              >
                Select a concept to view its meaning, example, and visualization goal
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
