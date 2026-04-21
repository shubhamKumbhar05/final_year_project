import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Hero from './components/ui/Hero'
import OSIMenu from './components/ui/OSIMenu'
import OSIExplorer from './components/ui/OSIExplorer'
import LabAndAISection from './modules/network-lab-chat/ui/LabAndAISection'
import Scene3D from './components/Scene3D/Scene3D'
import ConvaiChat from './modules/network-lab-chat/chatbot/ConvaiChat'
import LabBuilder3D from './modules/network-lab-chat/lab/LabBuilder3D'

/**
 * NetViz3D Dashboard - Complete Layout
 * 
 * Flow:
 * 1. Full-screen Hero section
 * 2. OSI Layers Menu (centered) - default view
 * 3. Two-column OSI Explorer (when layer selected)
 * 4. 3D Visualization (Phase 5) - triggered by "View 3D" button
 * 5. Network Lab - opened in same page like other visualizations
 */
export default function App() {
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [view3D, setView3D] = useState(false)
  const [selectedConceptId, setSelectedConceptId] = useState(null)

  const handleLayerSelect = (layerId) => {
    setSelectedLayer(layerId)
  }

  const handleBackToMenu = () => {
    setSelectedLayer(null)
  }

  const handleBackFromLab = () => {
    setSelectedLayer(null)
  }

  const handleView3D = (conceptId) => {
    setSelectedConceptId(conceptId)
    setView3D(true)
  }

  const handleBack3D = () => {
    setView3D(false)
    setSelectedConceptId(null)
  }

  return (
    <div className="w-screen bg-[#050505] text-white overflow-x-hidden">
      {/* ── Phase 1: Full-Screen Hero (Hidden when Lab is active) ──── */}
      {selectedLayer !== 'lab' && <Hero />}

      {/* ── Phase 5: 3D Visualization Mode ────────────────────────── */}
      <AnimatePresence mode="wait">
        {view3D && (
          <Scene3D
            key="scene3d"
            selectedConceptId={selectedConceptId}
            selectedLayerId={selectedLayer}
            onBack={handleBack3D}
          />
        )}
      </AnimatePresence>

      {/* ── Conditional Rendering: Menu or Explorer ────────────────── */}
      <AnimatePresence mode="wait">
        {!view3D && (
          <>
            {!selectedLayer ? (
              // Show OSI Menu by default
              <OSIMenu key="menu" onLayerSelect={handleLayerSelect} />
            ) : selectedLayer === 'lab' ? (
              <LabBuilder3D key="lab" onBack={handleBackFromLab} />
            ) : (
              // Show Explorer when layer is selected
              <OSIExplorer
                key="explorer"
                selectedLayer={selectedLayer}
                onBack={handleBackToMenu}
                onView3D={handleView3D}
              />
            )}
          </>
        )}
      </AnimatePresence>

      {/* ── Lab and AI Info Section (Always Visible) ──────────────── */}
      {!view3D && selectedLayer !== 'lab' && (
        <LabAndAISection onLabSelect={() => handleLayerSelect('lab')} />
      )}

      {/* ── Convai Chat Assistant ──────────────────────────────────── */}
      <ConvaiChat />
    </div>
  )
}
