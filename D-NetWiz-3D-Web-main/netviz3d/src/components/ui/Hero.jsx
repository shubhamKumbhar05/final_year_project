import React from 'react'
import { motion } from 'framer-motion'

/**
 * Phase 1: Hero Section
 * Full-screen landing page with futuristic design.
 */
export default function Hero() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  }

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: 'easeOut' },
    },
  }

  return (
    <div className="relative h-screen w-full bg-gradient-to-b from-slate-950 via-blue-950/20 to-slate-950 overflow-hidden flex flex-col items-center justify-center">
      {/* ── Animated Gradient Background ─────────────────────────────────── */}
      <div className="absolute inset-0 w-full h-full">
        {/* Top-left glow */}
        <motion.div
          className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl"
          animate={{
            opacity: [0.05, 0.15, 0.05],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        ></motion.div>

        {/* Bottom-right glow */}
        <motion.div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl"
          animate={{
            opacity: [0.05, 0.12, 0.05],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        ></motion.div>

        {/* Center ambient glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl"
          animate={{
            opacity: [0.03, 0.08, 0.03],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        ></motion.div>
      </div>

      {/* ── Background Grid Pattern ──────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00FFFF" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* ── Floating Accent Lines ─────────────────────────────────────────── */}
      <motion.div
        className="absolute top-1/3 left-0 w-96 h-1 bg-gradient-to-r from-cyan-500 to-transparent"
        animate={{
          opacity: [0.2, 0.5, 0.2],
          x: [-100, 100, -100],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      ></motion.div>

      <motion.div
        className="absolute bottom-1/3 right-0 w-96 h-1 bg-gradient-to-l from-blue-500 to-transparent"
        animate={{
          opacity: [0.2, 0.5, 0.2],
          x: [100, -100, 100],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      ></motion.div>

      {/* ── Hero Content (Centered) ──────────────────────────────────────── */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center px-6 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Accent Bar Above Title */}
        <motion.div
          className="mb-8 flex items-center gap-4"
          variants={itemVariants}
        >
          <div className="h-px w-12 bg-gradient-to-r from-cyan-500 to-transparent"></div>
          <span className="text-sm font-semibold tracking-widest text-cyan-400 uppercase">
            Network Visualization Platform
          </span>
          <div className="h-px w-12 bg-gradient-to-l from-blue-500 to-transparent"></div>
        </motion.div>

        {/* Main Title */}
        <motion.div
          variants={titleVariants}
          className="mb-8"
        >
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-tighter mb-4
                         bg-gradient-to-br from-cyan-300 via-blue-300 to-purple-300
                         bg-clip-text text-transparent
                         [text-shadow:_0_0_30px_#00ffffaa,_0_0_60px_#0088ff55]
                         drop-shadow-2xl">
            NetViz3D
          </h1>
          <motion.div
            className="h-1 w-32 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 mx-auto rounded-full"
            animate={{
              boxShadow: ['0 0 20px #00ffff', '0 0 40px #0088ff', '0 0 20px #00ffff'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          ></motion.div>
        </motion.div>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl lg:text-2xl text-cyan-100/90 mb-12
                     max-w-3xl leading-relaxed font-light tracking-wide
                     drop-shadow-lg"
        >
          Explore the <span className="text-cyan-300 font-semibold">OSI Model</span> in a stunning 3D environment with <span className="text-blue-300 font-semibold">interactive protocols</span> and <span className="text-purple-300 font-semibold">network visualization</span>
        </motion.p>



        {/* Stats Section */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-3 gap-8 mb-20 text-center"
        >
          {[
            { number: '7', label: 'OSI Layers' },
            { number: '28+', label: 'Concepts' },
            { number: '∞', label: 'Possibilities' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              className="px-4"
              whileHover={{ y: -5 }}
            >
              <p className="text-3xl sm:text-4xl font-black text-cyan-400 mb-2">{stat.number}</p>
              <p className="text-xs sm:text-sm text-cyan-200/70 uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ y: [0, 10, 0] }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="flex flex-col items-center gap-2 mt-8"
        >
          <svg
            className="w-6 h-6 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* ── Decorative Corner Elements ────────────────────────────────────── */}
      <motion.div
        className="absolute top-10 right-10 w-20 h-20 border border-cyan-500/20 rounded-lg"
        animate={{
          rotate: [0, 5, -5, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 6, repeat: Infinity }}
      ></motion.div>

      <motion.div
        className="absolute bottom-20 left-10 w-16 h-16 border border-blue-500/20 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity }}
      ></motion.div>
    </div>
  )
}

