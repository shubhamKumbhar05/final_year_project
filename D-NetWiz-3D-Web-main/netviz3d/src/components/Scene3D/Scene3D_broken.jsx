/* eslint-disable no-unused-vars */
import React, { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
/* eslint-enable no-unused-vars */
import ConceptVisualizations from './ConceptVisualizations'
import { getConceptInfo } from '../../data/conceptNames'

/**
 * Phase 5: Scene3D
 * Full-screen 3D visualization panel for OSI concepts.
 * Triggered by clicking "View 3D" in OSIExplorer.
 */
export default function Scene3D({ selectedConceptId, selectedLayerId, onBack }) {
  const concept = getConceptInfo(selectedConceptId)
  const [triggerScenario, setTriggerScenario] = useState(null)
  const [triggerClosing, setTriggerClosing] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('Ready')
  const [segmentPhase, setSegmentPhase] = useState(1)
  const [inOrderMode, setInOrderMode] = useState(true) // Default: in-order transmission
  const [processStep, setProcessStep] = useState(0) // 0: Start, 1: Attach Header, 2: Send Segment, 3: Complete
  const [ackIsRunning, setAckIsRunning] = useState(false) // ACK visualization: pause/play
  const [ackUiMessage, setAckUiMessage] = useState('') // ACK visualization: feedback message
  const [ackResetTrigger, setAckResetTrigger] = useState(0) // ACK visualization: reset trigger
  const [packetLossEnabled, setPacketLossEnabled] = useState(false) // Phase 4: Simulate packet loss
  const [isSegmentationPanelMinimized, setIsSegmentationPanelMinimized] = useState(false) // Segmentation panel minimize state
  const isTCPConcept = selectedConceptId === 'trans-tcp-conn'
  const isSegmentationConcept = selectedConceptId === 'trans-segmentation'
  const isACKConcept = selectedConceptId === 'trans-ack'
  const orbitControlsRef = useRef(null)

  const handleTriggerScenario = (scenario) => {
    // First clear the trigger
    setTriggerScenario(null)
    // Then set it after a brief moment to ensure a fresh re-render
    setTimeout(() => {
      setTriggerScenario(scenario)
    }, 50)
  }

  const handleTriggerClosing = () => {
    // Trigger closing handshake
    setTriggerClosing(null)
    setTimeout(() => {
      setTriggerClosing(true)
    }, 50)
  }

  const handleSegmentationPhase = (phase) => {
    if (phase === 1) {
      // RESTART button - always allowed
      setSegmentPhase(1)
      setProcessStep(0)
    } else if (phase === 2 && processStep === 0) {
      // START PROCESS - only clickable when processStep === 0
      setSegmentPhase(2)
      setProcessStep(1)
    } else if (phase === 3 && processStep === 1) {
      // ATTACH HEADERS - only clickable when processStep === 1
      setSegmentPhase(3)
      setProcessStep(2)
    } else if (phase === 4 && processStep === 2) {
      // SEND SEGMENTS - only clickable when processStep === 2
      setSegmentPhase(4)
      setProcessStep(3)
    }
  }

  const handleACKStartStop = () => {
    // START only - no pause functionality
    if (!ackIsRunning) {
      setAckIsRunning(true)
    }
  }

  const handleACKReset = () => {
    setAckIsRunning(false)
    setAckUiMessage('')
    setAckResetTrigger(prev => prev + 1)
  }

  const setACKUiMessage = (message) => {
    setAckUiMessage(message)
  }

  // Reset triggerClosing and triggerScenario after animation completes (8 seconds)
  useEffect(() => {
    if (triggerClosing) {
      const timer = setTimeout(() => {
        setTriggerClosing(null)
        setTriggerScenario(null)
      }, 8500)
      return () => clearTimeout(timer)
    }
  }, [triggerClosing])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 w-full h-screen bg-slate-950 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Canvas Container */}
        <div className="w-full h-full">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-950 to-blue-950/20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-500/30 border-t-cyan-500 mx-auto mb-4"></div>
                <p className="text-cyan-400 text-lg font-semibold">Loading Visualization...</p>
              </div>
            </div>
          }>
            <Canvas
              camera={{ position: [0, 0.5, 8.5], fov: 54 }}
              className="w-full h-full"
              style={{ background: '#0f172a' }}
            >
              <color attach="background" args={['#0f172a']} />
              <PerspectiveCamera makeDefault position={[0, 0.5, 8.5]} fov={54} />
              <OrbitControls
                ref={orbitControlsRef}
                enableZoom={true}
                enablePan={true}
                enableRotate={true}
                autoRotate={true}
                autoRotateSpeed={2}
                onStart={() => {
                  // Stop auto-rotation when user starts interacting
                  if (orbitControlsRef.current) {
                    orbitControlsRef.current.autoRotate = false
                  }
                }}
              />
              
              {/* Lighting */}
              <ambientLight intensity={0.8} />
              <pointLight position={[10, 10, 10]} intensity={1.5} />
              <pointLight position={[-10, -10, 5]} intensity={1} color="#00ffff" />
              
              {/* Concept Visualization */}
              <Suspense fallback={null}>
                <ConceptVisualizations
                  layerId={selectedLayerId}
                  conceptId={selectedConceptId}
                  triggerScenario={isTCPConcept ? triggerScenario : undefined}
                  triggerClosing={isTCPConcept ? triggerClosing : undefined}
                  onStateUpdate={isTCPConcept ? setConnectionStatus : undefined}
                  segmentPhase={isSegmentationConcept ? segmentPhase : undefined}
                  inOrderMode={isSegmentationConcept ? inOrderMode : undefined}
                  ackIsRunning={isACKConcept ? ackIsRunning : undefined}
                  onACKMessage={isACKConcept ? setACKUiMessage : undefined}
                  ackResetTrigger={isACKConcept ? ackResetTrigger : undefined}
                  packetLossEnabled={isACKConcept ? packetLossEnabled : undefined}
                />
              </Suspense>
            </Canvas>
          </Suspense>
        </div>

        {/* UI Overlay */}
        <motion.div
          className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Title and Info - Top Left */}
          <div className="text-white pointer-events-auto">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{concept.icon}</span>
              <div>
                <h1 className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text">
                  {concept.name}
                </h1>
                <p className="text-cyan-200/60 text-sm font-medium mt-1">
                  {concept.layer} Layer • {concept.fullName}
                </p>
              </div>
            </div>
          </div>

          {/* Back Button - Top Right */}
          <motion.button
            onClick={onBack}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                       border border-cyan-400/50 text-cyan-300 font-semibold
                       hover:from-cyan-500/40 hover:to-blue-500/40 hover:border-cyan-300
                       transition-all duration-300 pointer-events-auto
                       flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </motion.button>
        </motion.div>

        {/* Control Panel - For TCP Concept */}
        {isTCPConcept && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-8 z-10 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="max-w-5xl mx-auto">
              {/* Status Message */}
              <div className="mb-6 p-4 rounded-lg bg-slate-900/50 border border-cyan-500/30">
                <p className="text-cyan-300 font-semibold text-center">
                  {connectionStatus || 'Ready'}
                </p>
              </div>

              {/* Control Buttons */}
              <div className="flex flex-nowrap gap-3 justify-center items-center pointer-events-auto overflow-x-auto px-4 md:px-8">
                <motion.button
                  onClick={() => handleTriggerScenario('success')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-500/30 to-emerald-500/30 
                             border border-green-400/60 text-green-300 font-semibold text-sm whitespace-nowrap
                             hover:from-green-500/50 hover:to-emerald-500/50 hover:border-green-300
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>✅</span> Successful Handshake
                </motion.button>

                <motion.button
                  onClick={() => handleTriggerScenario('timeout')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500/30 to-orange-500/30 
                             border border-yellow-400/60 text-yellow-300 font-semibold text-sm whitespace-nowrap
                             hover:from-yellow-500/50 hover:to-orange-500/50 hover:border-yellow-300
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>⏱️</span> Timeout Scenario
                </motion.button>

                <motion.button
                  onClick={() => handleTriggerScenario('refused')}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-red-500/30 to-rose-500/30 
                             border border-red-400/60 text-red-300 font-semibold text-sm whitespace-nowrap
                             hover:from-red-500/50 hover:to-rose-500/50 hover:border-red-300
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>❌</span> Connection Refused
                </motion.button>

                {/* Divider */}
                <div className="h-8 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent mx-2"></div>

                {/* Closing Handshake Button */}
                <motion.button
                  onClick={handleTriggerClosing}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500/30 to-pink-500/30 
                             border border-purple-400/60 text-purple-300 font-semibold text-sm whitespace-nowrap
                             hover:from-purple-500/50 hover:to-pink-500/50 hover:border-purple-300
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>👋</span> Close Connection (4-Way)
                </motion.button>
              </div>

              {/* Description */}
              <p className="text-cyan-200/60 text-sm leading-relaxed font-light mt-6 text-center">
                Use your mouse to rotate, scroll to zoom, and drag to pan. Click buttons to visualize TCP connection scenarios.
              </p>
            </div>
          </motion.div>
        )}

        {/* Control Panel - For Segmentation Concept */}
        {isSegmentationConcept && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-8 z-10 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="max-w-5xl mx-auto">
              {/* Control Buttons */}
              <div className="flex flex-nowrap gap-3 justify-center items-center pointer-events-auto overflow-x-auto px-4 md:px-8">
                {/* START PROCESS Button */}
                <motion.button
                  onClick={() => handleSegmentationPhase(2)}
                  disabled={processStep !== 0}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0 ${
                    processStep === 0
                      ? 'bg-gradient-to-r from-amber-500/40 to-amber-500/30 border border-amber-400/80 text-amber-200 hover:from-amber-500/50 hover:to-amber-500/40 cursor-pointer shadow-lg shadow-amber-500/20'
                      : 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-400/20 text-amber-300/30 cursor-not-allowed opacity-50'
                  }`}
                  whileHover={processStep === 0 ? { scale: 1.05 } : {}}
                  whileTap={processStep === 0 ? { scale: 0.95 } : {}}
                >
                  <span>▶</span> START PROCESS
                </motion.button>

                {/* ATTACH HEADERS Button */}
                <motion.button
                  onClick={() => handleSegmentationPhase(3)}
                  disabled={processStep !== 1}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0 ${
                    processStep === 1
                      ? 'bg-gradient-to-r from-blue-500/40 to-blue-500/30 border border-blue-400/80 text-blue-200 hover:from-blue-500/50 hover:to-blue-500/40 cursor-pointer shadow-lg shadow-blue-500/20'
                      : 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-400/20 text-blue-300/30 cursor-not-allowed opacity-50'
                  }`}
                  whileHover={processStep === 1 ? { scale: 1.05 } : {}}
                  whileTap={processStep === 1 ? { scale: 0.95 } : {}}
                >
                  <span>🔷</span> ATTACH HEADERS
                </motion.button>

                {/* SEND SEGMENTS Button */}
                <motion.button
                  onClick={() => handleSegmentationPhase(4)}
                  disabled={processStep !== 2}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0 ${
                    processStep === 2
                      ? 'bg-gradient-to-r from-green-500/40 to-green-500/30 border border-green-400/80 text-green-200 hover:from-green-500/50 hover:to-green-500/40 cursor-pointer shadow-lg shadow-green-500/20'
                      : 'bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-400/20 text-green-300/30 cursor-not-allowed opacity-50'
                  }`}
                  whileHover={processStep === 2 ? { scale: 1.05 } : {}}
                  whileTap={processStep === 2 ? { scale: 0.95 } : {}}
                >
                  <span>📤</span> SEND SEGMENTS
                </motion.button>

                {/* IN-ORDER / OUT-OF-ORDER Toggle Button - ALWAYS CLICKABLE */}
                <motion.button
                  onClick={() => setInOrderMode(!inOrderMode)}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0 ${
                    inOrderMode
                      ? 'bg-gradient-to-r from-emerald-500/40 to-emerald-500/30 border border-emerald-400/80 text-emerald-200 hover:from-emerald-500/50 hover:to-emerald-500/40 shadow-lg shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-emerald-500/40 to-emerald-500/30 border border-emerald-400/80 text-emerald-200 hover:from-emerald-500/50 hover:to-emerald-500/40 shadow-lg shadow-emerald-500/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{inOrderMode ? '📤' : '🔀'}</span> {inOrderMode ? 'IN-ORDER' : 'OUT-OF-ORDER'}
                </motion.button>

                {/* RESTART Button - ALWAYS CLICKABLE */}
                <motion.button
                  onClick={() => handleSegmentationPhase(1)}
                  className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap
                             transition-all duration-300 flex items-center gap-2 flex-shrink-0 
                             bg-gradient-to-r from-red-500/40 to-red-500/30 border border-red-400/80 text-red-200 
                             hover:from-red-500/50 hover:to-red-500/40 shadow-lg shadow-red-500/20`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>↺</span> RESTART
                </motion.button>
              </div>

              {/* Description */}
              <p className="text-cyan-200/60 text-sm leading-relaxed font-light mt-6 text-center">
                Use your mouse to rotate, scroll to zoom, and drag to pan. Click buttons to visualize TCP segmentation process.
              </p>
            </div>
          </motion.div>
        )}

        {/* Control Panel - For ACK Concept (Phase 3: Memory Cleanup) */}
        {isACKConcept && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-10 z-10 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="max-w-6xl mx-auto">
              {/* Message Display Area - Enhanced Spacing */}
              {ackUiMessage && (
                <motion.div 
                  className="mb-14 p-5 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-green-300 font-semibold text-center text-xl">
                    {ackUiMessage}
                  </p>
                </motion.div>
              )}

              {/* Control Buttons - Organized Layout */}
              <div className="flex flex-col w-full gap-0 pointer-events-auto">
                {/* Main Control Button Row - Start, Reset, Packet Loss */}
                <div className="flex flex-wrap gap-4 justify-center items-center px-4">
                  {/* START Button */}
                  <motion.button
                    onClick={handleACKStartStop}
                    disabled={ackIsRunning}
                    className={`px-10 py-4 rounded-lg font-bold text-base whitespace-nowrap
                               transition-all duration-300 flex items-center gap-3 flex-shrink-0 ${
                      ackIsRunning
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-400/30 text-green-300 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-green-500/40 to-emerald-500/30 border border-green-400/80 text-green-200 hover:from-green-500/50 hover:to-emerald-500/40 shadow-lg shadow-green-500/20'
                    }`}
                    whileHover={ackIsRunning ? {} : { scale: 1.05 }}
                    whileTap={ackIsRunning ? {} : { scale: 0.95 }}
                  >
                    <span className="text-xl">▶️</span>
                    START
                  </motion.button>

                  {/* RESET Button */}
                  <motion.button
                    onClick={handleACKReset}
                    className="px-10 py-4 rounded-lg bg-gradient-to-r from-cyan-500/40 to-blue-500/30 
                               border border-cyan-400/80 text-cyan-200 font-bold text-base whitespace-nowrap
                               hover:from-cyan-500/50 hover:to-blue-500/40 
                               transition-all duration-300 flex items-center gap-3 flex-shrink-0 shadow-lg shadow-cyan-500/20"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-xl">↺</span> RESET
                  </motion.button>

                  {/* Simulate Packet Loss Toggle - Phase 4 */}
                  <motion.button
                    onClick={() => setPacketLossEnabled(!packetLossEnabled)}
                    className={`px-10 py-4 rounded-lg font-bold text-base whitespace-nowrap
                               transition-all duration-300 flex items-center gap-3 flex-shrink-0 ${
                      packetLossEnabled
                        ? 'bg-gradient-to-r from-orange-500/40 to-red-500/30 border border-orange-400/80 text-orange-200 hover:from-orange-500/50 hover:to-red-500/40 shadow-lg shadow-orange-500/20'
                        : 'bg-gradient-to-r from-slate-600/40 to-slate-700/30 border border-slate-400/50 text-slate-300 hover:from-slate-600/50 hover:to-slate-700/40 shadow-lg shadow-slate-600/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="text-xl">{packetLossEnabled ? '⚠️' : '📦'}</span>
                    {packetLossEnabled ? 'PACKET LOSS ON' : 'PACKET LOSS OFF'}
                  </motion.button>
                </div>

                {/* Description - Close to buttons */}
                <p className="text-cyan-200/60 text-sm leading-relaxed font-light text-center px-4 mt-2">
                  Use your mouse to rotate, scroll to zoom, and drag to pan. Click the START button to visualize the TCP ACK process.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Panel - For Non-TCP/Non-Segmentation/Non-ACK Concepts */}
        {!isTCPConcept && !isSegmentationConcept && !isACKConcept && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-8 z-10 pointer-events-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="max-w-3xl mx-auto">
              <p className="text-cyan-200/80 text-sm leading-relaxed font-light">
                Use your mouse to rotate, scroll to zoom, and drag to pan. Explore the interactive 3D model of this network concept.
              </p>
            </div>
          </motion.div>
        )}

        {/* Concept Badge - Bottom Right Corner */}
        <motion.div
          className="absolute bottom-8 right-8 z-10 pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div className="px-6 py-4 rounded-xl bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950/90 border border-cyan-500/30 backdrop-blur-sm shadow-2xl">
            <div className="flex flex-col items-end gap-2">
              <div className="text-2xl">{concept.icon}</div>
              <div className="text-right">
                <p className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider">
                  {concept.layer}
                </p>
                <p className="text-sm font-bold text-white mt-1">
                  {concept.name}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* TCP Segmentation Info Panel - Top Right */}
        {isSegmentationConcept && segmentPhase >= 3 && (
          <motion.div
            key="tcp-panel"
            className="absolute top-[80px] right-6 z-30 pointer-events-auto"
            initial={{ opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div 
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(100,200,255,0.6)',
                borderRadius: '12px',
                padding: '12px',
                width: '320px',
                maxHeight: isSegmentationPanelMinimized ? '60px' : '520px',
                overflowY: isSegmentationPanelMinimized ? 'hidden' : 'auto',
                color: '#e0f2fe',
                boxShadow: '0 0 30px rgba(56,189,248,0.5), 0 12px 32px rgba(0,0,0,0.85)',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.5',
                scrollBehavior: 'smooth',
                transition: 'max-height 0.4s ease-in-out',
              }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
                fontWeight: '900',
                marginBottom: '8px',
                paddingBottom: '6px',
                borderBottom: '2px solid rgba(56,189,248,0.6)',
                color: '#38bdf8',
                letterSpacing: '1px',
              }}>
                <span>🔗 TCP SEGMENTATION</span>
                <motion.button
                  onClick={() => setIsSegmentationPanelMinimized(!isSegmentationPanelMinimized)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(100,200,255,0.2))',
                    border: '1.5px solid rgba(56,189,248,0.6)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: '#38bdf8',
                    fontSize: '12px',
                    fontWeight: '900',
                    transition: 'all 0.2s ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.5), rgba(100,200,255,0.4))'
                    e.target.style.boxShadow = '0 0 15px rgba(56,189,248,0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.3), rgba(100,200,255,0.2))'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  {isSegmentationPanelMinimized ? '▼' : '▲'}
                </motion.button>
              </div>

              {!isSegmentationPanelMinimized && (
                <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '6px', padding: '8px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '900', color: '#34d399', marginBottom: '4px' }}>Phase {segmentPhase}</div>
                    <div>Mode: {inOrderMode ? 'In-Order' : 'Out-of-Order'}</div>
                    <div>Segments: 4 × 1460 bytes</div>
                  </div>

                  <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '8px' }}>
                    <div style={{ fontWeight: '900', color: '#93c5fd', marginBottom: '4px' }}>How Segmentation Works</div>
                    <div>Data is split into segments with sequence numbers for reliable delivery.</div>
                    <div style={{ marginTop: '4px', fontSize: '9px', color: '#a5f3fc' }}>
                      Seg1: SEQ=1-1460 | Seg2: SEQ=1461-2920 | Seg3: SEQ=2921-4380 | Seg4: SEQ=4381-5840
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

              <div style={{
                background: 'rgba(14,165,233,0.15)',
                border: '1px solid rgba(56,189,248,0.4)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#34d399', marginBottom: '4px' }}>
                  📍 CURRENT PHASE
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {segmentPhase === 1 && '➊ Data Block: 5840 bytes ready'}
                  {segmentPhase === 2 && '➋ Cutting: Splitting into segments...'}
                  {segmentPhase === 3 && '➌ Headers: TCP headers attached to segments'}
                  {segmentPhase === 4 && `➍ Transmission: Segments ${inOrderMode ? '[1,2,3,4]' : '[1,3,2,4]'} → server`}
                  {segmentPhase >= 5 && '➎ Out-of-Order: Segments arrive [1,3,2,4], buffer reorders to [1,2,3,4]'}
                </div>
              </div>

              {/* Transmission Mode Indicator */}
              <div style={{
                background: inOrderMode 
                  ? 'rgba(52,211,153,0.15)' 
                  : 'rgba(249,115,22,0.15)',
                border: inOrderMode
                  ? '1px solid rgba(52,211,153,0.4)'
                  : '1px solid rgba(249,115,22,0.4)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: '900', 
                  color: inOrderMode ? '#6ee7b7' : '#fed7aa',
                  marginBottom: '4px' 
                }}>
                  ⚙️ TRANSMISSION MODE
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                  {inOrderMode 
                    ? '✓ IN-ORDER: [1,2,3,4] sequential delivery' 
                    : '⚠️ OUT-OF-ORDER: [1,3,2,4] with buffering'}
                </div>
              </div>

              {/* Protocol Statistics */}
              <div style={{
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#d8b4fe', marginBottom: '4px' }}>
                  📊 SEGMENTATION DATA
                </div>
                <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div>Original Size: <strong style={{color: '#a5f3fc'}}>5840 bytes</strong></div>
                  <div>Segment Size: <strong style={{color: '#a5f3fc'}}>1460 bytes</strong> (MSS)</div>
                  <div>Total Segments: <strong style={{color: '#a5f3fc'}}>4</strong></div>
                  <div>Header Size: <strong style={{color: '#a5f3fc'}}>20-60 bytes</strong>/segment</div>
                </div>
              </div>

              {/* Key Fields Legend */}
              <div style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#93c5fd', marginBottom: '4px' }}>
                  🔑 HEADER FIELDS (DETAILS)
                </div>
                <div style={{ fontSize: '9px', color: '#cbd5e1', lineHeight: '1.8' }}>
                  <div><strong>SEQ (Sequence Number):</strong> Byte position in stream</div>
                  <div><strong>LEN (Payload Length):</strong> Data bytes in segment</div>
                  <div><strong>ACK (Acknowledgment):</strong> Next expected byte</div>
                  <div><strong>FLG (Flags):</strong> A=ACK, P=PUSH</div>
                </div>

                <div style={{
                  marginTop: '6px',
                  paddingTop: '4px',
                  borderTop: '1px solid rgba(59,130,246,0.35)',
                  fontSize: '9px',
                  color: '#e2e8f0',
                  lineHeight: '1.6',
                }}>
                  <div><strong>Per-Segment Byte Range:</strong></div>
                  <div>Start = (segmentIndex × 1460) + 1</div>
                  <div>End = (segmentIndex + 1) × 1460</div>
                  <div style={{ marginTop: '4px', color: '#a5f3fc' }}>
                    Example: Segment 1 → Bytes 1-1460, SEQ=1, ACK=1461
                  </div>
                </div>
              </div>

              {/* Why Segmentation */}
              <div style={{
                background: 'rgba(251,146,60,0.1)',
                border: '1px solid rgba(251,146,60,0.3)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#fed7aa', marginBottom: '4px' }}>
                  ❓ WHY SEGMENT?
                </div>
                <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div>✓ <strong>MTU Limit:</strong> Networks limit packet size</div>
                  <div>✓ <strong>Error Recovery:</strong> Resend only bad segments</div>
                  <div>✓ <strong>Congestion Control:</strong> Manage flow rate</div>
                  <div>✓ <strong>Ordering:</strong> Sequence # reassembles data</div>
                </div>
              </div>

              {/* Runtime Status - Real-time Animation Events - ALWAYS VISIBLE */}
              <div style={{
                background: segmentPhase >= 5 ? 'rgba(168,85,247,0.12)' : 'rgba(14,165,233,0.08)',
                border: segmentPhase >= 5 ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(56,189,248,0.3)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: segmentPhase >= 5 ? '#e9d5ff' : '#34d399', marginBottom: '6px' }}>
                  {segmentPhase >= 5 ? '⚡ RUNTIME EVENTS' : '📋 CURRENT PROGRESS'}
                </div>
                  <div style={{ fontSize: '9px', color: '#cbd5e1', lineHeight: '1.8' }}>
                  {segmentPhase < 5 ? (
                    <>
                      {segmentPhase < 2 && <div>1️⃣ <strong>Click START PROCESS</strong> to begin segmentation</div>}
                      {segmentPhase >= 2 && segmentPhase < 3 && <div>2️⃣ <strong>Click ATTACH HEADERS</strong> to add TCP headers</div>}
                      {segmentPhase >= 3 && segmentPhase < 4 && <div>3️⃣ <strong>Click SEND SEGMENTS</strong> to start transmission</div>}
                      {segmentPhase >= 4 && segmentPhase < 5 && <div>4️⃣ <strong>Toggle OUT-OF-ORDER mode</strong> or watch transmission</div>}
                    </>
                  ) : (
                    <>
                      <div>📤 <strong>Segment 0:</strong> Traveling to slot</div>
                      <div>🔴 <strong>Segment 2:</strong> Arrived (ERROR!)</div>
                      <div>⏸️ <strong>Segment 1:</strong> Buffering...</div>
                      <div>🟢 <strong>Segment 1:</strong> Now arrived</div>
                      <div>📊 <strong>Verification:</strong> Glow sequence</div>
                      <div>✅ <strong>Assembly:</strong> Processing...</div>
                    </>
                  )}
                </div>
                <div style={{
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: segmentPhase >= 5 ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(56,189,248,0.3)',
                  fontSize: '8px',
                  color: '#a5f3fc',
                  background: 'rgba(6,182,212,0.08)',
                  padding: '4px 6px',
                  borderRadius: '3px',
                }}>
                  <strong>💡 Tip:</strong> {segmentPhase >= 5 ? 'Watch the slot colors change and the buffer show verification with glowing segments!' : 'Use the control buttons below to progress through each segmentation phase'}
                </div>
              </div>

              {/* Why Out-of-Order Happens - Network Paths */}
              {segmentPhase >= 5 && (
                <div style={{
                  background: 'rgba(251,146,60,0.12)',
                  border: '1px solid rgba(251,146,60,0.4)',
                  borderRadius: '6px',
                  padding: '8px',
                  marginBottom: '8px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: '#fed7aa', marginBottom: '6px' }}>
                    🌐 WHY OUT-OF-ORDER HAPPENS
                  </div>
                  <div style={{ fontSize: '9px', color: '#cbd5e1', lineHeight: '1.75' }}>
                    <div><strong>Different Paths:</strong></div>
                    <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                      Segments travel different routes → speeds vary
                    </div>
                    
                    <div><strong>Speed Differences:</strong></div>
                    <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                      Segment 3 (faster path) arrives before Segment 2 (slower)
                    </div>

                    <div style={{ 
                      padding: '6px', 
                      background: 'rgba(249,115,22,0.15)', 
                      borderRadius: '4px',
                      marginTop: '6px',
                      borderLeft: '3px solid #fed7aa',
                    }}>
                      <strong>🔍 Detection by SEQ #:</strong>
                      <div style={{ marginTop: '4px', fontSize: '8px' }}>
                        Server checks Sequence Numbers. Seg 3's SEQ=2921 arrives but Seg 2 (SEQ=1461) is missing!
                      </div>
                    </div>

                    <div style={{ 
                      padding: '6px', 
                      background: 'rgba(59,130,246,0.12)', 
                      borderRadius: '4px',
                      marginTop: '6px',
                      borderLeft: '3px solid #93c5fd',
                    }}>
                      <strong>📦 Buffer "Hole":</strong>
                      <div style={{ marginTop: '4px', fontSize: '8px' }}>
                        Seg 3 waits in buffer. Seg 1 holds data. Gap left for Seg 2.
                      </div>
                    </div>

                    <div style={{ 
                      padding: '6px', 
                      background: 'rgba(34,197,94,0.12)', 
                      borderRadius: '4px',
                      marginTop: '6px',
                      borderLeft: '3px solid #86efac',
                    }}>
                      <strong>✅ Gap Filled & Snap:</strong>
                      <div style={{ marginTop: '4px', fontSize: '8px' }}>
                        Seg 2 arrives → Fills the hole. Chain [1-2-3-4] complete!
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Out-of-Order Flow - ALWAYS VISIBLE */}
              <div style={{
                background: segmentPhase >= 5 ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
                border: segmentPhase >= 5 ? '2px solid rgba(168,85,247,0.5)' : '1px solid rgba(168,85,247,0.3)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#d8b4fe', marginBottom: '8px' }}>
                  {segmentPhase < 5 ? '📚 OUT-OF-ORDER CONCEPT (How It Works)' : '🎯 OUT-OF-ORDER COMPLETE FLOW [1 → 3 → 2 → 4]'}
                </div>
                
                {segmentPhase < 5 ? (
                  <div style={{ fontSize: '8px', color: '#cbd5e1', lineHeight: '2' }}>
                    <div style={{ marginBottom: '6px', color: '#fed7aa' }}>
                      <strong>What happens when segments arrive out of order?</strong>
                    </div>
                    <div style={{
                      padding: '4px',
                      background: 'rgba(59,130,246,0.1)',
                      borderLeft: '2px solid #60a5fa',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#60a5fa'}}>① Segment 1</strong> arrives → Slot 1 ✓
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(239,68,68,0.1)',
                      borderLeft: '2px solid #fca5a5',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#fca5a5'}}>② Segment 3</strong> arrives before Segment 2 🔴
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(168,85,247,0.1)',
                      borderLeft: '2px solid #c084fc',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#c084fc'}}>⏸️ Server WAITS</strong> for missing Segment 2
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(34,197,94,0.1)',
                      borderLeft: '2px solid #4ade80',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#4ade80'}}>③ Segment 2</strong> finally arrives 🟢 GAP FILLED!
                    </div>

                    <div style={{
                      padding: '5px',
                      background: 'rgba(34,197,94,0.15)',
                      borderLeft: '3px solid #22c55e',
                      borderRadius: '3px',
                      marginTop: '4px',
                    }}>
                      <strong style={{color: '#22c55e'}}>✅ VERIFICATION & ASSEMBLY</strong><br/>
                      <span style={{fontSize: '7px'}}>Check all segments → Snap together → Done!</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '8px', color: '#cbd5e1', lineHeight: '2' }}>
                    <div style={{
                      padding: '4px',
                      background: 'rgba(59,130,246,0.1)',
                      borderLeft: '2px solid #60a5fa',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#60a5fa'}}>① SEG 1 (SEQ=1)</strong> arrives → Slot 1 ✓
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(239,68,68,0.1)',
                      borderLeft: '2px solid #fca5a5',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#fca5a5'}}>② SEG 3 (SEQ=2921)</strong> arrives → Slot 3 🔴 OUT OF ORDER!
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(168,85,247,0.1)',
                      borderLeft: '2px solid #c084fc',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#c084fc'}}>⏸️ HOLE IN SLOT 2!</strong> → Server WAITS (pulsing glow)
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(34,197,94,0.1)',
                      borderLeft: '2px solid #4ade80',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#4ade80'}}>③ SEG 2 (SEQ=1461)</strong> arrives → Slot 2 🟢 GAP FILLED!
                    </div>

                    <div style={{
                      padding: '4px',
                      background: 'rgba(34,197,94,0.1)',
                      borderLeft: '2px solid #86efac',
                      marginBottom: '4px',
                    }}>
                      <strong style={{color: '#86efac'}}>④ SEG 4 (SEQ=4381)</strong> arrives → Slot 4 ✓
                    </div>

                    <div style={{
                      padding: '5px',
                      background: 'rgba(34,197,94,0.15)',
                      borderLeft: '3px solid #22c55e',
                      borderRadius: '3px',
                    }}>
                      <strong style={{color: '#22c55e'}}>✅ VERIFICATION & ASSEMBLY</strong><br/>
                      <span style={{fontSize: '7px'}}>All slots glowing ✓ → [1-2-3-4] complete → Snap together (5840 bytes) → Deliver to app</span>
                    </div>
                  </div>
                )}
              </div>

              {/* COMPLETE FLOW SECTION */}
              <div style={{
                background: segmentPhase < 5 ? 'rgba(34,197,94,0.12)' : 'rgba(168,85,247,0.12)',
                border: segmentPhase < 5 ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(168,85,247,0.4)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: '900', 
                  color: segmentPhase < 5 ? '#86efac' : '#d8b4fe', 
                  marginBottom: '6px' 
                }}>
                  📦 COMPLETE FLOW: [1 → 3 → 2 → 4]
                </div>

                <div style={{ fontSize: '9px', color: '#cbd5e1', lineHeight: '1.75' }}>
                  {/* IN-ORDER MODE */}
                  {segmentPhase < 5 && (
                    <>
                      <div style={{ 
                        padding: '6px', 
                        background: 'rgba(34,197,94,0.15)', 
                        borderRadius: '4px',
                        marginBottom: '6px',
                        borderLeft: '3px solid #86efac',
                      }}>
                        <strong>IN-ORDER MODE - Sequential Filling</strong>
                        <div style={{ marginTop: '4px', fontSize: '8px' }}>
                          ✓ Slots fill perfectly in order [1→2→3→4]
                        </div>
                      </div>

                      <div style={{ 
                        padding: '6px', 
                        background: 'rgba(34,197,94,0.1)', 
                        borderRadius: '4px',
                        marginBottom: '6px',
                        border: '1px solid rgba(34,197,94,0.3)',
                        fontFamily: 'monospace',
                        fontSize: '8px',
                      }}>
                        <div>🟩 Slot 1: [SEG 1] → FILLED ✓</div>
                        <div>🟩 Slot 2: [SEG 2] → FILLED ✓</div>
                        <div>🟩 Slot 3: [SEG 3] → FILLED ✓</div>
                        <div>🟩 Slot 4: [SEG 4] → FILLED ✓</div>
                      </div>

                      <div style={{ 
                        padding: '6px', 
                        background: 'rgba(34,197,94,0.15)', 
                        borderRadius: '4px',
                        borderLeft: '3px solid #86efac',
                      }}>
                        <strong>No Waiting Needed:</strong>
                        <div style={{ marginTop: '4px', fontSize: '8px' }}>
                          All segments present in correct order → Immediate reassembly → Application receives complete data
                        </div>
                      </div>
                    </>
                  )}

                  {/* OUT-OF-ORDER MODE */}
                  {segmentPhase >= 5 && (
                    <>
                      {/* INNER BUFFER VISUALIZATION - Fades Out Completely at 25s */}
                      <motion.div
                        initial={{ opacity: 1, visibility: 'visible', display: 'block' }}
                        animate={{ opacity: 0, visibility: 'hidden', display: 'none' }}
                        transition={{ delay: 25, duration: 1.5, ease: 'easeOut' }}
                        style={{ pointerEvents: 'none', overflow: 'hidden', position: 'absolute', width: 0, height: 0 }}
                      >
                      
                      {/* Header */}
                      <div style={{ 
                        padding: '10px', 
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.15))', 
                        borderRadius: '6px',
                        marginBottom: '10px',
                        border: '2px solid rgba(168,85,247,0.5)',
                        borderLeft: '5px solid #d8b4fe',
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: '900', color: '#d8b4fe', marginBottom: '4px' }}>
                          🌐 OUT-OF-ORDER FLOW: [1 → 3 → 2 → 4]
                        </div>
                        <div style={{ fontSize: '8px', color: '#cbd5e1', lineHeight: '1.5' }}>
                          Watch how the server receives segments in WRONG order and uses buffer slots to reassemble them correctly using SEQ numbers
                        </div>
                      </div>

                      {/* STEPS 1-5: Buffer Visualization */}

                      {/* STEP 1: Segment 1 arrives FIRST */}
                      <div style={{ 
                        padding: '8px', 
                        background: 'rgba(59,130,246,0.12)', 
                        borderRadius: '5px',
                        marginBottom: '8px',
                        border: '2px solid rgba(59,130,246,0.4)',
                        borderLeft: '4px solid #60a5fa',
                      }}>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#60a5fa', 
                          marginBottom: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          ① SEGMENT 1 ARRIVES FIRST (SEQ=1)
                        </div>
                        <div style={{ fontSize: '8px', color: '#cbd5e1', marginBottom: '5px' }}>
                          Network Path A (faster) delivers Segment 1 first
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '8px', 
                          color: '#cbd5e1',
                          background: 'rgba(59,130,246,0.08)',
                          padding: '4px',
                          borderRadius: '3px',
                          border: '1px solid rgba(59,130,246,0.2)',
                        }}>
                          <div>🟦 <span style={{background: '#00D4FF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #0088CC', boxShadow: '0 0 8px rgba(0,212,255,0.8)'}}>[1]</span>: [SEG 1 (1460 bytes)] ✓ RECEIVED</div>
                          <div>⬜ <span style={{background: '#D946EF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #A855F7', boxShadow: '0 0 8px rgba(217,70,239,0.8)'}}>[2]</span>: [EMPTY]</div>
                          <div>⬜ <span style={{background: '#FF9500', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #D97706', boxShadow: '0 0 8px rgba(255,149,0,0.8)'}}>[3]</span>: [EMPTY]</div>
                          <div>⬜ <span style={{background: '#22C55E', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #16A34A', boxShadow: '0 0 8px rgba(34,197,94,0.8)'}}>[4]</span>: [EMPTY]</div>
                        </div>
                        <div style={{ fontSize: '8px', color: '#a5f3fc', marginTop: '3px', fontStyle: 'italic' }}>
                          What's next? Server waits for Segment 2 (SEQ=1461)...
                        </div>
                      </div>

                      {/* STEP 2: Segment 3 arrives OUT OF ORDER - Creates the HOLE! */}
                      <div style={{ 
                        padding: '8px', 
                        background: 'rgba(239,68,68,0.14)', 
                        borderRadius: '5px',
                        marginBottom: '8px',
                        border: '2px solid rgba(239,68,68,0.4)',
                        borderLeft: '4px solid #fca5a5',
                      }}>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#fca5a5', 
                          marginBottom: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          ⚠️ SEGMENT 3 ARRIVES (TOO EARLY!) - SEQ=2921
                        </div>
                        <div style={{ fontSize: '8px', color: '#fed7aa', marginBottom: '5px' }}>
                          Network Path C (faster route) overtakes Segment 2! This shouldn't arrive yet!
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '8px', 
                          color: '#cbd5e1',
                          background: 'rgba(239,68,68,0.08)',
                          padding: '4px',
                          borderRadius: '3px',
                          border: '1px solid rgba(239,68,68,0.2)',
                        }}>
                          <div>🟦 <span style={{background: '#00D4FF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #0088CC', boxShadow: '0 0 8px rgba(0,212,255,0.8)'}}>[1]</span>: [SEG 1] ✓ WAITING...</div>
                          <div>⬜ <span style={{background: '#D946EF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #A855F7', boxShadow: '0 0 8px rgba(217,70,239,0.8)'}}>[2]</span>: [EMPTY] ← <span style={{color: '#fca5a5', fontWeight: 'bold'}}>🔴 MISSING SEGMENT 2!</span></div>
                          <div>🟥 <span style={{background: '#FF9500', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #D97706', boxShadow: '0 0 8px rgba(255,149,0,0.8)'}}>[3]</span>: [SEG 3] ← <span style={{color: '#fca5a5', fontWeight: 'bold'}}>WRONG ORDER!</span></div>
                          <div>⬜ <span style={{background: '#22C55E', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #16A34A', boxShadow: '0 0 8px rgba(34,197,94,0.8)'}}>[4]</span>: [EMPTY]</div>
                        </div>
                        <div style={{ 
                          fontSize: '8px', 
                          color: '#fca5a5', 
                          marginTop: '4px',
                          background: 'rgba(239,68,68,0.1)',
                          padding: '4px',
                          borderRadius: '3px',
                          borderLeft: '2px solid #fca5a5',
                        }}>
                          <strong>🔴 PROBLEM DETECTED:</strong><br/>
                          Server checks: "Is SEQ 2921 in right order?" NO! Between SEQ 1 and 2921 should be SEQ 1461 (Segment 2)!<br/>
                          Result: <strong>HOLE in Slot 2</strong> - Cannot reassemble yet!
                        </div>
                      </div>

                      {/* STEP 3: WAITING PHASE - Server Pauses */}
                      <div style={{ 
                        padding: '8px', 
                        background: 'rgba(168,85,247,0.12)', 
                        borderRadius: '5px',
                        marginBottom: '8px',
                        border: '2px solid rgba(168,85,247,0.4)',
                        borderLeft: '4px solid #c084fc',
                      }}>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#c084fc', 
                          marginBottom: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          ⏸️ WAITING PHASE - INCOMPLETE CHAIN (BUFFER HOLDS DATA)
                        </div>
                        <div style={{ fontSize: '8px', color: '#cbd5e1', marginBottom: '5px' }}>
                          This is the PULSING/BLINKING you see in the animation! Server is saying: "I'm waiting..."
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '8px', 
                          color: '#cbd5e1',
                          background: 'rgba(168,85,247,0.08)',
                          padding: '4px',
                          borderRadius: '3px',
                          border: '1px solid rgba(168,85,247,0.2)',
                        }}>
                          <div>🟦 <span style={{background: '#00D4FF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #0088CC', boxShadow: '0 0 8px rgba(0,212,255,0.8)'}}>[1]</span>: [SEG 1] ⏸️ <span style={{color: '#c084fc', fontWeight: 'bold'}}>PULSING/BLINKING...</span></div>
                          <div>⬜ <span style={{background: '#D946EF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #A855F7', boxShadow: '0 0 8px rgba(217,70,239,0.8)'}}>[2]</span>: [EMPTY] ← WHERE IS SEGMENT 2??</div>
                          <div>🟨 <span style={{background: '#FF9500', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #D97706', boxShadow: '0 0 8px rgba(255,149,0,0.8)'}}>[3]</span>: [SEG 3] Held in buffer...</div>
                          <div>⬜ <span style={{background: '#22C55E', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #16A34A', boxShadow: '0 0 8px rgba(34,197,94,0.8)'}}>[4]</span>: [EMPTY]</div>
                        </div>
                        <div style={{ 
                          fontSize: '8px', 
                          color: '#cbd5e1', 
                          marginTop: '4px',
                          background: 'rgba(168,85,247,0.1)',
                          padding: '4px',
                          borderRadius: '3px',
                          borderLeft: '2px solid #c084fc',
                        }}>
                          <strong>❌ Current Status:</strong><br/>
                          Chain is: [1 → ? → 3] BROKEN! <br/>
                          Cannot deliver data until Segment 2 (SEQ=1461) arrives and fills the gap!
                        </div>
                      </div>

                      {/* STEP 4: Segment 2 FINALLY Arrives - GAP FILLED! */}
                      <div style={{ 
                        padding: '8px', 
                        background: 'rgba(34,197,94,0.14)', 
                        borderRadius: '5px',
                        marginBottom: '8px',
                        border: '3px solid rgba(34,197,94,0.5)',
                        borderLeft: '4px solid #4ade80',
                      }}>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#4ade80', 
                          marginBottom: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          🟢 SEGMENT 2 FINALLY ARRIVES! (SEQ=1461) - GAP FILLED! 🎉
                        </div>
                        <div style={{ fontSize: '8px', color: '#86efac', marginBottom: '5px' }}>
                          After waiting, Network Path B finally arrives! This is what triggers the GREEN BLINK in animation!
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '8px', 
                          color: '#cbd5e1',
                          background: 'rgba(34,197,94,0.08)',
                          padding: '4px',
                          borderRadius: '3px',
                          border: '1px solid rgba(34,197,94,0.2)',
                        }}>
                          <div>🟩 <span style={{background: '#00D4FF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #0088CC', boxShadow: '0 0 8px rgba(0,212,255,0.8)'}}>[1]</span>: [SEG 1] ✓ SEQ=1 (1460 bytes)</div>
                          <div>🟩 <span style={{background: '#D946EF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #A855F7', boxShadow: '0 0 8px rgba(217,70,239,0.8)'}}>[2]</span>: [SEG 2] ✓ SEQ=1461 (1460 bytes) ← <span style={{color: '#4ade80', fontWeight: 'bold'}}>HOLE FILLED! 🎯</span></div>
                          <div>🟩 <span style={{background: '#FF9500', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #D97706', boxShadow: '0 0 8px rgba(255,149,0,0.8)'}}>[3]</span>: [SEG 3] ✓ SEQ=2921 (1460 bytes)</div>
                          <div>⬜ <span style={{background: '#22C55E', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #16A34A', boxShadow: '0 0 8px rgba(34,197,94,0.8)'}}>[4]</span>: [EMPTY] (waiting for Seg 4)</div>
                        </div>
                        <div style={{ 
                          fontSize: '8px', 
                          color: '#4ade80', 
                          marginTop: '4px',
                          background: 'rgba(34,197,94,0.1)',
                          padding: '4px',
                          borderRadius: '3px',
                          borderLeft: '2px solid #4ade80',
                        }}>
                          <strong>✅ IMPORTANT:</strong><br/>
                          Chain now [1→2→3] is COMPLETE! But Segment 4 still expected. Server continues buffering...
                        </div>
                      </div>

                      {/* STEP 5: Segment 4 arrives - COMPLETE CHAIN READY */}
                      <div style={{ 
                        padding: '8px', 
                        background: 'rgba(34,197,94,0.12)', 
                        borderRadius: '5px',
                        marginBottom: '8px',
                        border: '3px solid rgba(34,197,94,0.4)',
                        borderLeft: '4px solid #86efac',
                      }}>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#86efac', 
                          marginBottom: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          ✅ SEGMENT 4 ARRIVES - ALL SLOTS FILLED!
                        </div>
                        <div style={{ fontSize: '8px', color: '#cbd5e1', marginBottom: '5px' }}>
                          Last segment arrives. Complete chain [1-2-3-4] is now ready for verification!
                        </div>
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '8px', 
                          color: '#cbd5e1',
                          background: 'rgba(34,197,94,0.08)',
                          padding: '4px',
                          borderRadius: '3px',
                          border: '1px solid rgba(34,197,94,0.2)',
                        }}>
                          <div>🟩 <span style={{background: '#00D4FF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #0088CC', boxShadow: '0 0 8px rgba(0,212,255,0.8)'}}>[1]</span>: [SEG 1] ✓ SEQ=1, 1460 bytes</div>
                          <div>🟩 <span style={{background: '#D946EF', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #A855F7', boxShadow: '0 0 8px rgba(217,70,239,0.8)'}}>[2]</span>: [SEG 2] ✓ SEQ=1461, 1460 bytes</div>
                          <div>🟩 <span style={{background: '#FF9500', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #D97706', boxShadow: '0 0 8px rgba(255,149,0,0.8)'}}>[3]</span>: [SEG 3] ✓ SEQ=2921, 1460 bytes</div>
                          <div>🟩 <span style={{background: '#22C55E', color: '#000', fontWeight: '900', fontSize: '12px', padding: '3px 7px', borderRadius: '5px', display: 'inline-block', border: '3px solid #16A34A', boxShadow: '0 0 8px rgba(34,197,94,0.8)'}}>[4]</span>: [SEG 4] ✓ SEQ=4381, 1459 bytes</div>
                        </div>
                        <div style={{ 
                          fontSize: '8px', 
                          color: '#86efac', 
                          marginTop: '4px',
                          background: 'rgba(34,197,94,0.1)',
                          padding: '4px',
                          borderRadius: '3px',
                          borderLeft: '2px solid #86efac',
                        }}>
                          <strong>🎯 CHAIN COMPLETE:</strong><br/>
                          [1→2→3→4] = 1460 + 1460 + 1460 + 1459 = 5840 bytes ✓<br/>
                          Ready for verification phase!
                        </div>
                      </div>

                      {/* Close entire buffer visualization fade-out wrapper */}
                      </motion.div>

                      {/* STEP 6: VERIFICATION & ASSEMBLY - Fades In AFTER buffer is completely hidden */}
                      <motion.div
                        initial={{ opacity: 0, visibility: 'hidden' }}
                        animate={{ opacity: 1, visibility: 'visible' }}
                        transition={{ delay: 26.5, duration: 1.5, ease: 'easeIn' }}
                        style={{ position: 'relative', zIndex: 10 }}
                      >
                      <div style={{ 
                        padding: '10px', 
                        background: 'rgba(34,197,94,0.15)', 
                        borderRadius: '5px',
                        border: '3px solid rgba(34,197,94,0.5)',
                        borderLeft: '4px solid #22c55e',
                        position: 'relative',
                        zIndex: 10,
                      }}>
                        <div style={{ 
                          fontSize: '9px', 
                          fontWeight: 'bold', 
                          color: '#22c55e', 
                          marginBottom: '3px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}>
                          🔄 VERIFICATION & ASSEMBLY PHASE
                        </div>
                        <div style={{ fontSize: '8px', color: '#cbd5e1', marginBottom: '6px' }}>
                          Server double-checks all segments then "snaps" them together into original data
                        </div>

                        <div style={{ 
                          background: 'rgba(34,197,94,0.1)', 
                          padding: '4px', 
                          borderRadius: '3px',
                          marginBottom: '4px',
                          color: '#cbd5e1',
                          fontSize: '8px',
                        }}>
                          <strong>✓ Verification Glow (See animation):</strong><br/>
                          Server glows Slot 1 → Slot 2 → Slot 3 → Slot 4 (checks each!)
                        </div>

                        <div style={{ 
                          background: 'rgba(34,197,94,0.1)', 
                          padding: '4px', 
                          borderRadius: '3px',
                          marginBottom: '4px',
                          fontFamily: 'monospace',
                          color: '#86efac',
                          fontSize: '8px',
                        }}>
                          <strong>⚡ Reassemble (Snap Together):</strong><br/>
                          [1-1460] + [1461-2920] + [2921-4380] + [4381-5840]<br/>
                          = <strong style={{color: '#4ade80'}}>5840 BYTES COMPLETE!</strong>
                        </div>

                        <div style={{ 
                          background: 'rgba(34,197,94,0.1)', 
                          padding: '5px', 
                          borderRadius: '3px',
                          borderLeft: '3px solid #22c55e',
                          color: '#86efac',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          marginTop: '4px',
                        }}>
                          ✅ DELIVERY: Send reassembled data to Application Layer! 🎉
                        </div>
                      </div>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>

              {/* TCP Reassembly - Detailed Steps */}
              <div style={{
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '6px',
                padding: '8px',
                marginBottom: '8px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '900', color: '#86efac', marginBottom: '6px' }}>
                  🔄 REASSEMBLY PROCESS
                </div>
                
                {/* Reassembly Steps */}
                <div style={{ fontSize: '9px', color: '#cbd5e1', lineHeight: '1.8' }}>
                  {segmentPhase < 5 && (
                    <>
                      <div style={{ marginBottom: '4px', color: '#a5f3fc' }}>
                        <strong>Standard Sequential:</strong>
                      </div>
                      <div style={{ marginBottom: '6px', padding: '4px', background: 'rgba(34,197,94,0.1)', borderRadius: '4px' }}>
                        <strong>✓ Segment Arrival: [1,2,3,4]</strong>
                      </div>
                      <div><strong>1.</strong> Seg 1 arrives (SEQ=1) → Slot 1</div>
                      <div><strong>2.</strong> Seg 2 arrives (SEQ=1461) → Slot 2</div>
                      <div><strong>3.</strong> Seg 3 arrives (SEQ=2921) → Slot 3</div>
                      <div><strong>4.</strong> Seg 4 arrives (SEQ=4381) → Slot 4</div>
                      <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(34,197,94,0.3)' }}>
                        <strong>Result:</strong>
                      </div>
                      <div><strong>5.</strong> No gaps! Chain [1→2→3→4] ✓</div>
                      <div><strong>6.</strong> Immediate reassembly</div>
                      <div><strong>7.</strong> Pass to application</div>
                    </>
                  )}
                  
                  {segmentPhase >= 5 && (
                    <>
                      <div style={{ marginBottom: '4px', color: '#fed7aa' }}>
                        <strong>OUT-OF-ORDER Handling:</strong>
                      </div>
                      <div style={{ marginBottom: '6px', padding: '4px', background: 'rgba(249,115,22,0.1)', borderRadius: '4px' }}>
                        <strong>⚠️ Segment Arrival: [1,3,2,4]</strong>
                      </div>
                      <div><strong>1.</strong> Seg 1 arrives → Slot 1 ✓</div>
                      <div><strong>2.</strong> Seg 3 arrives → Slot 3 (out-of-order!) 🔴</div>
                      <div><strong>3.</strong> Buffer detects missing Seg 2</div>
                      <div><strong>4.</strong> Seg 1 waits in buffer (pulsing) ⏸️</div>
                      <div><strong>5.</strong> Seg 2 arrives → Slot 2 🟢</div>
                      <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(34,197,94,0.5)' }}>
                        <strong>Verification Phase:</strong>
                      </div>
                      <div><strong>6.</strong> Glow check: Seg 1,2,3,4 ✓</div>
                      <div><strong>7.</strong> Reordered: [1,2,3,4]</div>
                      <div><strong>8.</strong> Reassemble & deliver</div>
                    </>
                  )}
                </div>

                {/* Sequence Number Range */}
                {segmentPhase >= 5 && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(34,197,94,0.4)',
                    fontSize: '9px',
                    color: '#a5f3fc',
                    background: 'rgba(6,182,212,0.08)',
                    borderRadius: '4px',
                    padding: '4px 6px',
                  }}>
                    <strong>SEQ Number Mapping:</strong>
                    <div>Seg 1: SEQ=1, LEN=1460</div>
                    <div>Seg 2: SEQ=1461, LEN=1460</div>
                    <div>Seg 3: SEQ=2921, LEN=1460</div>
                    <div>Seg 4: SEQ=4381, LEN=1459</div>
                  </div>
                )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    )
  )
}
