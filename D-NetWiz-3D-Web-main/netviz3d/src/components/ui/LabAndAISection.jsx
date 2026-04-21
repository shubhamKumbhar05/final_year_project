import React from 'react'
import { motion } from 'framer-motion'

/**
 * Lab and AI Information Section
 * Full screen interactive section
 * Provides info about AI Chatbot and Network Lab features in a single centered section
 */
export default function LabAndAISection({ onLabSelect }) {
  return (
    <motion.div
      className="relative w-screen h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ── Background Grid Pattern ──────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-3"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid-section" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00FFFF" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-section)" />
      </svg>

      {/* ── Animated Glow Orbs ───────────────────────────────────────────── */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-5 animate-pulse"></div>

      {/* ── Main Content Container ────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-3xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          className="text-center space-y-6 mb-16"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="space-y-3">
            <motion.h2
              className="text-6xl md:text-7xl font-black tracking-tighter leading-tight"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
                Explore & Create
              </span>
            </motion.h2>
            
            <motion.div
              className="inline-block mx-auto"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full" />
            </motion.div>
          </div>

          <motion.p
            className="text-lg md:text-xl font-semibold text-cyan-200 max-w-lg mx-auto leading-relaxed tracking-wide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Advanced tools for <span className="text-purple-300 font-bold">network learning</span> and <span className="text-cyan-300 font-bold">design</span>
          </motion.p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="relative w-full max-w-5xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {/* Content */}
          <div className="space-y-12">
            {/* Combined Features Section */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {/* Unified Content */}
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Unified Description */}
                <div className="text-center space-y-4">
                  <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-purple-300 via-cyan-300 to-cyan-300 bg-clip-text">
                    Intelligent Learning & Network Creation
                  </h3>

                  <p className="text-base md:text-lg text-cyan-300/85 leading-relaxed max-w-2xl mx-auto">
                    Combine the power of <span className="font-bold text-purple-300">Convai Chat</span>, our AI assistant that provides real-time answers about network concepts, explains complex protocols, and guides you through networking challenges, with <span className="font-bold text-cyan-300">Network Lab</span>, where you can build custom network topologies in immersive 3D space by dragging and dropping components to design architectures and see how your configurations come to life instantly.
                  </p>

                  {/* Combined Features List */}
                  <div className="flex flex-wrap justify-center gap-6 pt-4 text-xs font-semibold">
                    <div className="text-purple-400/80">
                      Real-time Q&A · Concept Explanations · Interactive Guidance
                    </div>
                    <span className="text-cyan-500/50">·</span>
                    <div className="text-cyan-400/80">
                      3D Visualization · Drag & Drop Builder · Real-time Simulation
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Launch Button */}
            <motion.div
              className="flex justify-center pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <motion.button
                onClick={onLabSelect}
                whileHover={{
                  scale: 1.08,
                  y: -5,
                  boxShadow: '0 0 60px rgba(34, 211, 238, 0.8)',
                }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-14 py-4 rounded-lg bg-cyan-500/10 backdrop-blur-xl hover:shadow-[0_0_60px_#22d3eecc] transition-all duration-300 overflow-hidden cursor-pointer"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-cyan-400/10 opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />

                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  animate={{
                    background: [
                      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)',
                    ],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />

                <div className="relative z-10 flex items-center gap-3">
                  <span className="text-lg font-black tracking-tight text-cyan-300">
                    Launch Network Lab
                  </span>
                  <motion.span
                    animate={{ x: 0 }}
                    whileHover={{ x: 8 }}
                    className="text-2xl font-bold text-cyan-300"
                  >
                    →
                  </motion.span>
                </div>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
