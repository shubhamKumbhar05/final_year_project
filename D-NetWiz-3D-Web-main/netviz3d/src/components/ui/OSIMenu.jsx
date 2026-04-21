/* eslint-disable no-unused-vars */
import React from 'react'
import { motion } from 'framer-motion'
/* eslint-enable no-unused-vars */
import { OSI_LAYERS } from '../../data/osiLayers'

/**
 * OSI Layers Menu - Center Screen Hub
 * Shows all 4 OSI layers as a beautiful interactive menu
 */
export default function OSIMenu({ onLayerSelect }) {
  const colorMap = {
    application: {
      text: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/40',
      glow: 'shadow-[0_0_30px_#10b98140]',
      hoverGlow: 'hover:shadow-[0_0_50px_#10b981cc]',
      gradient: 'from-green-600/20 to-green-400/5',
    },
    presentation: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/40',
      glow: 'shadow-[0_0_30px_#ec489940]',
      hoverGlow: 'hover:shadow-[0_0_50px_#ec4899cc]',
      gradient: 'from-pink-600/20 to-pink-400/5',
    },
    session: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/40',
      glow: 'shadow-[0_0_30px_#f4355e40]',
      hoverGlow: 'hover:shadow-[0_0_50px_#f4355ecc]',
      gradient: 'from-rose-600/20 to-rose-400/5',
    },
    transport: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/40',
      glow: 'shadow-[0_0_30px_#a855f740]',
      hoverGlow: 'hover:shadow-[0_0_50px_#a855f7cc]',
      gradient: 'from-purple-600/20 to-purple-400/5',
    },
    network: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/40',
      glow: 'shadow-[0_0_30px_#3b82f640]',
      hoverGlow: 'hover:shadow-[0_0_50px_#3b82f6cc]',
      gradient: 'from-blue-600/20 to-blue-400/5',
    },
    datalink: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/40',
      glow: 'shadow-[0_0_30px_#f59e0b40]',
      hoverGlow: 'hover:shadow-[0_0_50px_#f59e0bcc]',
      gradient: 'from-amber-600/20 to-amber-400/5',
    },
    physical: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/40',
      glow: 'shadow-[0_0_30px_#eab30840]',
      hoverGlow: 'hover:shadow-[0_0_50px_#eab308cc]',
      gradient: 'from-yellow-600/20 to-yellow-400/5',
    },
    lab: {
      text: 'text-cyan-300',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-400/60',
      glow: 'shadow-[0_0_30px_#22d3ee50]',
      hoverGlow: 'hover:shadow-[0_0_55px_#22d3eecc]',
      gradient: 'from-cyan-500/30 to-blue-400/5',
    },
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="relative min-h-screen w-full bg-[#050505] overflow-hidden flex flex-col items-center justify-center p-6"
    >
      {/* ── Background Grid Pattern ──────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-3"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid-menu" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00FFFF" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-menu)" />
      </svg>

      {/* ── Subtle Glow Orbs ──────────────────────────────────────────────– */}
      <div className="absolute top-40 left-20 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-5"></div>
      <div className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-5"></div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-auto px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-cyan-400">
            Choose Your Layer
          </h2>
          <p className="text-cyan-300/60 text-sm md:text-base max-w-xl mx-auto">
            Select an OSI layer to explore its concepts and protocols
          </p>
        </div>

        {/* Layers Grid - Single Column */}
        <motion.div
          className="grid grid-cols-1 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {OSI_LAYERS.map((layer) => {
            const colors = colorMap[layer.id] || {
              text: 'text-cyan-400',
              bg: 'bg-cyan-500/10',
              border: 'border-cyan-500/40',
              glow: 'shadow-[0_0_30px_#06b6d440]',
              hoverGlow: 'hover:shadow-[0_0_50px_#06b6d4cc]',
              gradient: 'from-cyan-600/20 to-cyan-400/5',
            }

            return (
              <motion.button
                key={layer.id}
                onClick={() => onLayerSelect(layer.id)}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative
                  group
                  p-5
                  rounded-lg
                  border-2
                  ${colors.border}
                  ${colors.bg}
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  ${colors.hoverGlow}
                  cursor-pointer
                  overflow-hidden
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Content */}
                <div className="relative z-10 space-y-3 text-left">
                  {/* Layer Badge */}
                  <div className="inline-block">
                    <span className={`text-xs font-bold tracking-widest uppercase ${colors.text} opacity-70`}>
                      Layer {layer.number}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-xl font-black tracking-tight ${colors.text}`}>
                    {layer.name}
                  </h3>

                  {/* Description */}
                  <p className="text-cyan-300/70 text-xs md:text-sm leading-relaxed line-clamp-2">
                    {layer.description}
                  </p>

                  {/* Concepts Count */}
                  <div className="flex items-center justify-between pt-3 border-t border-cyan-900/30">
                    <span className="text-xs text-cyan-400/60 tracking-widest uppercase font-bold">
                      {layer.concepts.length} Concepts
                    </span>
                    <motion.span
                      animate={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      className={`text-lg font-bold ${colors.text}`}
                    >
                      →
                    </motion.span>
                  </div>
                </div>

                {/* Hover Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      background: [
                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                      ],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Bottom Hint */}
        <motion.p
          className="text-center text-cyan-400/50 text-xs md:text-sm tracking-widest uppercase mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Click any layer to begin exploring
        </motion.p>
      </motion.div>
    </motion.div>
  )
}
