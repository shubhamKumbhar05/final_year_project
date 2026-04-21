/* eslint-disable no-unused-vars */
import React from 'react'
import { motion } from 'framer-motion'
/* eslint-enable no-unused-vars */

/**
 * Phase 3: Concept Button Component
 * A clickable button representing a single OSI concept.
 * 
 * Features:
 * - Compact button styling with hover effects
 * - Layer-specific color accent
 * - Selection state (active/inactive)
 * - Smooth animations on interaction
 */
export default function ConceptButton({
  concept,
  layerColor,
  isActive,
  onClick,
}) {
  // Map layer colors to their full opacity versions
  const colorStyles = {
    'text-green-400': { bg: 'bg-green-500/20', glow: 'shadow-[0_0_15px_#10b98140]' },
    'text-purple-400': { bg: 'bg-purple-500/20', glow: 'shadow-[0_0_15px_#a855f740]' },
    'text-blue-400': { bg: 'bg-blue-500/20', glow: 'shadow-[0_0_15px_#3b82f640]' },
    'text-amber-400': { bg: 'bg-amber-500/20', glow: 'shadow-[0_0_15px_#f59e0b40]' },
  }

  const activeStyles = colorStyles[layerColor] || colorStyles['text-cyan-400']

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick?.(concept.id)}
      className={`
        relative
        px-4
        py-2.5
        rounded-lg
        border
        text-sm
        font-semibold
        tracking-wide
        transition-all
        duration-200
        group
        w-full
        text-left
        ${
          isActive
            ? `${layerColor} border-opacity-100 ${activeStyles.bg} ${activeStyles.glow}`
            : `border-cyan-900/40 text-cyan-200/80 hover:border-cyan-600/60 hover:text-cyan-300 hover:bg-cyan-900/10`
        }
      `}
    >
      {/* Content wrapper */}
      <span className="relative z-10 flex items-center gap-2">
        {/* Icon indicator */}
        <span
          className={`
            w-1.5
            h-1.5
            rounded-full
            flex-shrink-0
            transition-all
            duration-200
            ${
              isActive
                ? 'bg-current scale-100'
                : `bg-cyan-600/50 scale-75 group-hover:scale-90`
            }
          `}
        />
        {/* Concept name */}
        <span className="truncate">{concept.name}</span>
      </span>
    </motion.button>
  )
}

