import React, { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const SEGMENT_COLORS = [
  { main: '#22c55e', emissive: '#16a34a' },
  { main: '#f59e0b', emissive: '#d97706' },
  { main: '#a78bfa', emissive: '#7c3aed' },
  { main: '#22d3ee', emissive: '#0891b2' },
]

const SEGMENT_SPACING = 0.95
const DATA_BLOCK_Y = 0.8
const SERVER_POSITION = [4.5, DATA_BLOCK_Y, 0] // Server on the right side
const SEGMENT_POSITIONS = [
  [-SEGMENT_SPACING * 1.8, DATA_BLOCK_Y, 0],
  [-SEGMENT_SPACING * 0.6, DATA_BLOCK_Y, 0],
  [SEGMENT_SPACING * 0.6, DATA_BLOCK_Y, 0],
  [SEGMENT_SPACING * 1.8, DATA_BLOCK_Y, 0],
]

const ANIMATION_CONFIG = {
  laser: { duration: 2.5, ease: 'power2.inOut' },
  fadeOut: { duration: 1.0, delay: 2.5, ease: 'power2.in' },
  segmentsAppear: 3.5,  // After fade completes
  segmentSlide: { duration: 1.2, ease: 'power2.out' },
  segmentStagger: 0.12,
  headerDelay: 0.4,
  headerDuration: 0.6,
  // Phase 4: Transmission - SMOOTH & PARALLEL
  transmission: { 
    duration: 1.8, // Faster travel for smoother feeling
    stagger: 0.1, // Reduced stagger for parallel transmission feel instead of sequential
    ease: 'power2.inOut',
    arcHeight: 0.6, // Increased arc for more visible, smooth trajectory
  },
  reassembly: { 
    duration: 4.0, // VERY SLOW reassembly for Phase 5 merge - matches new 4s merge timing
    ease: 'back.out(1.7)',
    scaleDelay: 0.3,
  },
  successFlash: { duration: 0.8, ease: 'power2.inOut' },
  // Phase 5: Out-of-Order Error Handling with SLOW detailed visualization
  phase5: {
    // SLOW AND CLEAR TIMING FOR PERFECT UNDERSTANDING
    // Segment 0 (labeled "1"): travels immediately [0-3.0s]
    // Segment 2 (labeled "3"): starts after pause [3.5-6.5s] - arrives out of order
    // Segment 1 (labeled "2"): enters waiting phase [3.5-6.5s] then travels [7.0-10.0s]
    // Segment 3 (labeled "4"): travels afterward [10.5-13.5s]
    // Pause all segments visible [13.5-14.5s] before scanning
    // Scanning phase to verify order [14.5-21.0s] with SLOW glow sequence
    // Pause before merge [21.0-22.0s]
    // Merge and reassemble [22.0-25.0s]
    // TOTAL ANIMATION: ~25 seconds
    
    outOfOrderSequence: [0, 2, 1, 3], // Segments arrive as 1, 3, 2, 4 (0-indexed: 0, 2, 1, 3)
    
    // Individual timing for each segment travel - MUCH SLOWER
    segmentTravelTimings: [
      { index: 0, startDelay: 0.0, duration: 3.0 },      // Segment 0 (1) - 3.0s travel
      { index: 2, startDelay: 3.5, duration: 3.0 },      // Segment 2 (3) - 0.5s pause, then 3.0s travel (OUT OF ORDER!)
      { index: 1, startDelay: 7.0, duration: 3.0, waitingStart: 3.5, waitingEnd: 6.5 }, // Segment 1 (2) - 3.0s wait, then 3.0s travel
      { index: 3, startDelay: 10.5, duration: 3.0 },     // Segment 3 (4) - 1.0s pause, then 3.0s travel
    ],
    
    slotTravelDuration: 3.0, // Each segment takes 3 full seconds to travel
    waitingIndicationDuration: 3.0, // Segment waits for 3 seconds with pulsing glow
    
    // Scanning phase - VERY SLOW verification with clear visual pauses for perfect understanding
    pauseBeforeScanningDuration: 2.0, // Extended pause to see all segments clearly in place [13.5-15.5s]
    scanningStartDelay: 15.5, // Scanning starts after all segments settled
    scanningPauseDuration: 0.5, // Small pause between scanning steps
    scanningPhaseDuration: 8.0, // VERY LONG scanning duration [15.5-23.5s] for clarity
    glowDuration: 1.2, // VERY LONG individual glow per segment (1.2s) - easy to see
    glowDelay: 1.2, // VERY LONG spacing between glows (1.2s) - time to process
    
    // Merge and final reassembly - with longer pauses for understanding
    pauseBeforeMergeDuration: 2.0, // Extended pause after scanning [23.5-25.5s] - let user see result
    mergeDuration: 4.0, // VERY SLOW merge (4.0s) - gradual assembly
    labelDisplayDuration: 5.0, // Show result longer
  },
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * DataBlock - Initial data cube (Phase 1)
 */
function DataBlock({ opacity }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (!meshRef.current || opacity <= 0) return
    const t = state.clock.elapsedTime
    
    meshRef.current.rotation.y += 0.008
    meshRef.current.rotation.x = Math.sin(t * 0.35) * 0.15
    meshRef.current.material.emissiveIntensity = 0.4 + Math.sin(t * 2.5) * 0.25
  })

  if (opacity <= 0) return null

  return (
    <group position={[0, DATA_BLOCK_Y, 0]}>
      {/* Main cube */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshPhongMaterial
          color="#a855f7"
          emissive="#9333ea"
          emissiveIntensity={0.5}
          shininess={160}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Enhanced glow effect */}
      <mesh>
        <boxGeometry args={[1.65, 1.65, 1.65]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.08 * opacity}
          depthWrite={false}
        />
      </mesh>

      {/* Label */}
      {opacity > 0.2 && (
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.6), rgba(147,51,234,0.45))',
            backdropFilter: 'blur(16px)',
            border: '2px solid #a855f7',
            borderRadius: '8px',
            padding: '6px 14px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '900',
            fontFamily: 'monospace',
            letterSpacing: '1px',
            opacity: Math.min(opacity * 1.8, 1),
            boxShadow: '0 0 20px rgba(168,85,247,0.8), 0 4px 12px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
            textShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 24px rgba(168,85,247,0.9)',
          }}>
            🔄 DATA · 5840B
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * BufferShelf - Displays 4 compact placeholder slots in horizontal order inside a large cubic server buffer box
 */
function BufferShelf({ bufferSlots, glowingSegments, errorSlots = [], bufferErrorActive = false, showWaitingLabel = false, bufferSuccessActive = false, successSlots = [] }) {
  // Position slots in 2x2 grid inside cubic server buffer (same size as server)
  const SLOT_SIZE = 0.56 // Larger slot boxes to better fill buffer
  const BUFFER_SIZE = 1.5 // Same size as server main block (1.5 × 1.5 × 1.5)
  const SERVER_BUFFER_X = SERVER_POSITION[0]
  const SERVER_BUFFER_Y = SERVER_POSITION[1] // Aligned with server main box
  const SERVER_BUFFER_Z = SERVER_POSITION[2]

  // 2x2 grid arrangement with proper spacing for visual separation
  const GRID_SPACING = 0.12 // Reduced spacing to center slots away from buffer edges
  const OFFSET = (SLOT_SIZE + GRID_SPACING) / 2 // Distance from center
  const slotPositions = [
    [SERVER_BUFFER_X - OFFSET, SERVER_BUFFER_Y + OFFSET, SERVER_BUFFER_Z], // Slot 1 (top-left)
    [SERVER_BUFFER_X + OFFSET, SERVER_BUFFER_Y + OFFSET, SERVER_BUFFER_Z], // Slot 2 (top-right)
    [SERVER_BUFFER_X - OFFSET, SERVER_BUFFER_Y - OFFSET, SERVER_BUFFER_Z], // Slot 3 (bottom-left)
    [SERVER_BUFFER_X + OFFSET, SERVER_BUFFER_Y - OFFSET, SERVER_BUFFER_Z], // Slot 4 (bottom-right)
  ]

  return (
    <group>
      {/* Buffer Box - Completely invisible (only slots visible) */}
      <mesh position={[SERVER_BUFFER_X, SERVER_BUFFER_Y, SERVER_BUFFER_Z]}>
        <boxGeometry args={[BUFFER_SIZE, BUFFER_SIZE, BUFFER_SIZE]} />
        <meshBasicMaterial
          color={bufferErrorActive ? '#ef4444' : '#06b6d4'}
          transparent
          opacity={0}
          wireframe={false}
          depthWrite={false}
        />
      </mesh>

      {/* Buffer Box Border - Removed for clean visualization */}

      {/* Render slots */}
      {slotPositions.map((pos, slotIdx) => {
        const segment = bufferSlots[slotIdx]
        const isGlowing = glowingSegments.includes(slotIdx)
        const isError = errorSlots.includes(slotIdx)

        return (
          <group key={`buffer-slot-${slotIdx}`} position={pos}>
            {/* Slot background/placeholder with error color */}
            <mesh>
              <boxGeometry args={[SLOT_SIZE, SLOT_SIZE, SLOT_SIZE]} />
              <meshBasicMaterial
                color={isError ? '#7f1d1d' : '#0f172a'}
                transparent
                opacity={isError ? 0.8 : 0.50}
                wireframe={true}
                depthWrite={false}
              />
            </mesh>

            {/* Slot edge highlight - sharp and clear, RED when error */}
            <mesh>
              <edgesGeometry args={[new THREE.BoxGeometry(SLOT_SIZE, SLOT_SIZE, SLOT_SIZE)]} />
              <lineBasicMaterial 
                color={isError ? '#ef4444' : '#1e293b'} 
                linewidth={isError ? 6 : 3.5} 
                transparent 
                opacity={isError ? 1 : 0.90} 
              />
            </mesh>

            {/* RED ERROR GLOW - Strong aura around slot */}
            {isError && (
              <group>
                {/* Inner error glow */}
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 1.08, SLOT_SIZE * 1.08, SLOT_SIZE * 1.08]} />
                  <meshBasicMaterial
                    color="#ef4444"
                    transparent
                    opacity={0.4}
                    depthWrite={false}
                  />
                </mesh>

                {/* Outer error glow layer */}
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 1.25, SLOT_SIZE * 1.25, SLOT_SIZE * 1.25]} />
                  <meshBasicMaterial
                    color="#ef4444"
                    transparent
                    opacity={0.25}
                    depthWrite={false}
                  />
                </mesh>

                {/* Outer outer glow - fading aura */}
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 1.45, SLOT_SIZE * 1.45, SLOT_SIZE * 1.45]} />
                  <meshBasicMaterial
                    color="#ef4444"
                    transparent
                    opacity={0.1}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            )}

            {/* GREEN SUCCESS GLOW - Shows when segment successfully arrives */}
            {successSlots.includes(slotIdx) && (
              <group>
                {/* Inner success glow */}
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 1.10, SLOT_SIZE * 1.10, SLOT_SIZE * 1.10]} />
                  <meshBasicMaterial
                    color="#10b981"
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                  />
                </mesh>

                {/* Middle success glow layer */}
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 1.28, SLOT_SIZE * 1.28, SLOT_SIZE * 1.28]} />
                  <meshBasicMaterial
                    color="#10b981"
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                  />
                </mesh>

                {/* Outer success glow - fading aura */}
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 1.50, SLOT_SIZE * 1.50, SLOT_SIZE * 1.50]} />
                  <meshBasicMaterial
                    color="#10b981"
                    transparent
                    opacity={0.15}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            )}

            {/* Filled segment */}
            {segment && (
              <group>
                <mesh>
                  <boxGeometry args={[SLOT_SIZE * 0.83, SLOT_SIZE * 0.83, SLOT_SIZE * 0.83]} />
                  <meshPhongMaterial
                    color={segment.color.main}
                    emissive={segment.color.main}
                    emissiveIntensity={isGlowing ? 1.35 : 0.8}
                    shininess={165}
                    transparent
                    opacity={1}
                  />
                </mesh>

                {/* Enhanced glow effect when validating */}
                {isGlowing && (
                  <group>
                    {/* Inner glow */}
                    <mesh>
                      <boxGeometry args={[SLOT_SIZE * 1.05, SLOT_SIZE * 1.05, SLOT_SIZE * 1.05]} />
                      <meshBasicMaterial
                        color={segment.color.main}
                        transparent
                        opacity={1}
                        depthWrite={false}
                      />
                    </mesh>

                    {/* Outer glow layer */}
                    <mesh>
                      <boxGeometry args={[SLOT_SIZE * 1.16, SLOT_SIZE * 1.16, SLOT_SIZE * 1.16]} />
                      <meshBasicMaterial
                        color={segment.color.main}
                        transparent
                        opacity={0.5}
                        depthWrite={false}
                      />
                    </mesh>
                  </group>
                )}

                {/* Segment number label - inside box */}
                <Html position={[0, 0, 0]}>
                  <div style={{
                    color: segment.color.main,
                    fontSize: '15px',
                    fontWeight: '900',
                    fontFamily: 'monospace',
                    letterSpacing: '0.5px',
                    textShadow: `0 0 12px ${segment.color.main}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {segment.originalSequenceNum}
                  </div>
                </Html>
              </group>
            )}

            {/* Slot number indicator - inside box for empty slots */}
            {!segment && (
              <Html position={[0, 0, 0]}>
                <div style={{
                  color: '#64748b',
                  fontSize: '12px',
                  fontWeight: '700',
                  fontFamily: 'monospace',
                  opacity: 0.65,
                  textShadow: '0 0 4px rgba(100,116,139,0.5)',
                }}>
                  [{slotIdx + 1}]
                </div>
              </Html>
            )}

            {/* WAITING PHASE LABEL - Show on slot 1 when waiting for segment 1 */}
            {!segment && slotIdx === 1 && showWaitingLabel && (
              <Html position={[0, 1.0, 0]} center style={{ pointerEvents: 'none' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.7), rgba(220,38,38,0.55))',
                  backdropFilter: 'blur(16px)',
                  border: '2px solid #ef4444',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '900',
                  fontFamily: 'monospace',
                  letterSpacing: '0.6px',
                  boxShadow: '0 0 24px rgba(239,68,68,0.9), 0 6px 16px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 14px rgba(255,255,255,0.9), 0 0 28px rgba(239,68,68,0.95)',
                }}>
                  ⏸️ WAITING FOR SEG 2
                </div>
              </Html>
            )}
          </group>
        )
      })}

      {/* Buffer label at top */}
      <Html position={[SERVER_BUFFER_X, SERVER_BUFFER_Y + 1.3, SERVER_BUFFER_Z]}>
        <div style={{
          color: bufferSuccessActive ? '#10b981' : (bufferErrorActive ? '#ef4444' : '#06b6d4'),
          fontSize: '10px',
          fontWeight: '900',
          fontFamily: 'monospace',
          letterSpacing: '1px',
          background: bufferSuccessActive ? 'rgba(16,185,129,0.15)' : (bufferErrorActive ? 'rgba(127,29,29,0.8)' : 'rgba(15,23,42,0.8)'),
          padding: '4px 8px',
          borderRadius: '4px',
          border: bufferSuccessActive ? '2px solid rgba(16,185,129,0.8)' : (bufferErrorActive ? '1px solid rgba(239,68,68,0.8)' : '1px solid rgba(6,182,212,0.5)'),
          whiteSpace: 'nowrap',
          textShadow: bufferSuccessActive ? '0 0 16px rgba(16,185,129,1), 0 0 32px rgba(34,197,94,0.8)' : (bufferErrorActive ? '0 0 10px rgba(239,68,68,0.8)' : 'none'),
          boxShadow: bufferSuccessActive ? '0 0 20px rgba(16,185,129,0.6), inset 0 0 10px rgba(34,197,94,0.3)' : 'none',
          transition: 'all 0.2s ease-in-out',
        }}>
          {bufferSuccessActive ? '✅ WAITING PHASE ENDED' : (bufferErrorActive ? '⚠️ BUFFER ERROR' : 'SERVER BUFFER')}
        </div>
      </Html>
    </group>
  )
}

/**
 * ReorderLabelText - Shows the reordering result above server buffer
 */
function ReorderLabelText({ visible }) {
  const SERVER_BUFFER_X = SERVER_POSITION[0]
  const SERVER_BUFFER_Y = SERVER_POSITION[1]

  return (
    <group>
      {visible && (
        <Html position={[SERVER_BUFFER_X, SERVER_BUFFER_Y + 1.2, 0]} scale={[0.75, 0.75, 0.75]} center>
          <div style={{
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,71,102,0.95))',
            backdropFilter: 'blur(20px)',
            border: '2px solid #34d399',
            borderRadius: '12px',
            padding: '14px 28px',
            textAlign: 'center',
            color: '#34d399',
            fontSize: '14px',
            fontWeight: '900',
            fontFamily: 'monospace',
            letterSpacing: '1.5px',
            boxShadow: '0 0 40px rgba(52,211,153,0.8), 0 0 60px rgba(52,211,153,0.4), 0 12px 32px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            position: 'relative',
          }}>
            <div style={{ marginBottom: '3px', fontSize: '11px', color: '#cbd5e1' }}>✓ Reordered</div>
            <div style={{ fontSize: '13px' }}>[1,3,2,4] → [1,2,3,4]</div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * ServerCube - Receiver/destination for segments (Phase 4+)
 */
function ServerCube({ visible, showReassembled, successFlash }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const animationRef = useRef(null)
  const [flashOpacity, setFlashOpacity] = useState(0)
  const [cubeOpacity, setCubeOpacity] = useState(0)
  const [cubeScale, setCubeScale] = useState(0)

  // Fade in/out animation when visible changes
  useEffect(() => {
    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill()
    }

    if (visible) {
      animationRef.current = gsap.to({ opacity: cubeOpacity }, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: function() {
          setCubeOpacity(this.targets()[0].opacity)
        },
      })
    } else {
      // Fade out smoothly when hidden
      animationRef.current = gsap.to({ opacity: cubeOpacity }, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onUpdate: function() {
          setCubeOpacity(this.targets()[0].opacity)
        },
      })
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  // Reassembly animation - scale up with bounce
  useEffect(() => {
    if (showReassembled) {
      gsap.to({ scale: 0 }, {
        scale: 1,
        duration: ANIMATION_CONFIG.reassembly.duration,
        ease: ANIMATION_CONFIG.reassembly.ease,
        onUpdate: function() {
          setCubeScale(this.targets()[0].scale)
        },
      })
    } else {
      setCubeScale(0)
    }
  }, [showReassembled])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    
    // Gentle rotation
    meshRef.current.rotation.y += 0.005
    meshRef.current.rotation.x = Math.sin(t * 0.25) * 0.1
    
    if (showReassembled) {
      meshRef.current.material.emissiveIntensity = 0.4 + Math.sin(t * 2.0) * 0.2
    }
  })

  // Success flash animation
  useEffect(() => {
    if (successFlash) {
      gsap.to({ opacity: 0 }, {
        opacity: 1,
        duration: ANIMATION_CONFIG.successFlash.duration / 2,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
        onUpdate: function() {
          setFlashOpacity(this.targets()[0].opacity)
        },
      })
    }
  }, [successFlash])

  if (cubeOpacity === 0) return null

  return (
    <group position={SERVER_POSITION}>
      {/* Server placeholder - waiting state (before reassembly) */}
      {!showReassembled && (
        <mesh>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshBasicMaterial
            color="#64748b"
            transparent
            opacity={0.3 * cubeOpacity}
            wireframe={true}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Server cube - appears when reassembled */}
      {showReassembled && cubeScale > 0 && (
        <group ref={groupRef} scale={cubeScale}>
          <mesh ref={meshRef} castShadow receiveShadow>
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshPhongMaterial
              color="#a855f7"
              emissive="#9333ea"
              emissiveIntensity={0.5}
              shininess={160}
            />
          </mesh>

          {/* Glow effect */}
          <mesh>
            <boxGeometry args={[1.65, 1.65, 1.65]} />
            <meshBasicMaterial
              color="#a855f7"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>

          {/* Success flash - green glow */}
          {flashOpacity > 0 && (
            <mesh>
              <boxGeometry args={[2.2, 2.2, 2.2]} />
              <meshBasicMaterial
                color="#22c55e"
                transparent
                opacity={flashOpacity * 0.5}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Server label */}
      <Html position={[0, showReassembled ? 1.2 : 0.6, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: showReassembled 
            ? 'linear-gradient(135deg, rgba(34,197,94,0.8), rgba(22,163,74,0.55))'
            : 'linear-gradient(135deg, rgba(100,116,139,0.6), rgba(71,85,105,0.45))',
          backdropFilter: 'blur(16px)',
          border: showReassembled ? '2px solid #22c55e' : '2px solid #64748b',
          borderRadius: '8px',
          padding: '6px 14px',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: '900',
          fontFamily: 'monospace',
          letterSpacing: '1px',
          opacity: cubeOpacity,
          boxShadow: showReassembled 
            ? '0 0 20px rgba(34,197,94,0.8), 0 4px 12px rgba(0,0,0,0.7)'
            : '0 0 12px rgba(100,116,139,0.5), 0 4px 8px rgba(0,0,0,0.6)',
          whiteSpace: 'nowrap',
          textShadow: showReassembled 
            ? '0 0 12px rgba(34,197,94,0.9)' 
            : '0 0 8px rgba(148,163,184,0.7)',
        }}>
          {showReassembled ? '✓ SERVER · COMPLETE' : '📥 SERVER'}
        </div>
      </Html>
    </group>
  )
}

/**
 * ConnectionLine - Visual path between source and server (Phase 4+)
 */
function ConnectionLine({ visible }) {
  const animationRef = useRef(null)
  const [lineOpacity, setLineOpacity] = useState(0)

  useEffect(() => {
    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill()
    }

    if (visible) {
      animationRef.current = gsap.to({ opacity: lineOpacity }, {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: function() {
          setLineOpacity(this.targets()[0].opacity)
        },
      })
    } else {
      // Fade out smoothly when hidden
      animationRef.current = gsap.to({ opacity: lineOpacity }, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onUpdate: function() {
          setLineOpacity(this.targets()[0].opacity)
        },
      })
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (lineOpacity === 0) return null

  const startPoint = [0, DATA_BLOCK_Y, 0]
  const endPoint = SERVER_POSITION

  return (
    <Line
      points={[startPoint, endPoint]}
      color="#38bdf8"
      lineWidth={2}
      dashed
      dashSize={0.15}
      gapSize={0.15}
      opacity={0.4 * lineOpacity}
      transparent
    />
  )
}

/**
 * LaserLine - Solid square cutting plane (Phase 2)
 */
function LaserLine({ isActive, progress, opacity = 1 }) {
  if (!isActive || progress <= 0 || opacity <= 0) return null

  const progressClamped = Math.min(progress, 1)
  const planeY = 0.85 - progressClamped * 1.7
  const glow = Math.sin(progressClamped * Math.PI) * 0.7 + 0.6
  const pulse = Math.sin(progressClamped * Math.PI * 3) * 0.2 + 0.85

  return (
    <group position={[0, DATA_BLOCK_Y, 0]}>
      {/* Solid horizontal laser plane */}
      <mesh position={[0, planeY, 0]}>
        <boxGeometry args={[1.6, 0.06, 1.6]} />
        <meshBasicMaterial
          color="#ff1111"
          transparent
          opacity={glow * pulse * 0.95 * opacity}
          fog={false}
        />
      </mesh>

      {/* Inner glow shell */}
      <mesh position={[0, planeY, 0]}>
        <boxGeometry args={[1.75, 0.12, 1.75]} />
        <meshBasicMaterial
          color="#ff6655"
          transparent
          opacity={glow * 0.45 * opacity}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Outer glow shell */}
      <mesh position={[0, planeY, 0]}>
        <boxGeometry args={[1.95, 0.18, 1.95]} />
        <meshBasicMaterial
          color="#ff9999"
          transparent
          opacity={glow * 0.25 * opacity}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Segment - Individual data segment with optional TCP header (Phase 2/3)
 */
function Segment({ index, position, color, showHeader }) {
  const groupRef = useRef()
  const segmentMeshRef = useRef()
  const headerRef = useRef()
  const [segmentX, setSegmentX] = useState(0) // Start from center
  const [segmentOpacity, setSegmentOpacity] = useState(0)
  const [headerScale, setHeaderScale] = useState(0)
  const [headerY, setHeaderY] = useState(1.0)

  // Slide animation from center to final position
  useEffect(() => {
    const delay = index * ANIMATION_CONFIG.segmentStagger
    
    gsap.to({ x: 0, opacity: 0 }, {
      x: position[0],
      opacity: 1,
      duration: ANIMATION_CONFIG.segmentSlide.duration,
      delay: delay,
      ease: ANIMATION_CONFIG.segmentSlide.ease,
      onUpdate: function() {
        setSegmentX(this.targets()[0].x)
        setSegmentOpacity(this.targets()[0].opacity)
      },
    })
  }, [index, position])

  // Header attachment animation
  useEffect(() => {
    if (showHeader) {
      gsap.to({ scale: 0, y: 1.0 }, {
        scale: 1,
        y: 0.48,
        duration: ANIMATION_CONFIG.headerDuration,
        delay: ANIMATION_CONFIG.headerDelay + index * 0.08,
        ease: 'back.out(1.7)',
        onUpdate: function() {
          setHeaderScale(this.targets()[0].scale)
          setHeaderY(this.targets()[0].y)
        },
      })
    } else {
      setHeaderScale(0)
      setHeaderY(1.0)
    }
  }, [showHeader, index])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    
    if (groupRef.current) {
      // Gentle floating at final position
      groupRef.current.position.y = position[1] + Math.sin(t * 0.8 + index * 0.9) * 0.04
    }
    
    if (segmentMeshRef.current) {
      segmentMeshRef.current.material.emissiveIntensity = 0.32 + Math.sin(t * 1.2 + index) * 0.15
    }
    
    if (headerRef.current && showHeader) {
      headerRef.current.material.emissiveIntensity = 0.6 + Math.sin(t * 2.2 + index) * 0.3
    }
  })

  const payloadSize = 1460
  const seqNum = index * payloadSize + 1
  const ackNum = seqNum + payloadSize

  if (segmentOpacity === 0) return null

  return (
    <group ref={groupRef} position={[segmentX, position[1], position[2]]}>
      {/* Segment body - smaller piece */}
      <mesh ref={segmentMeshRef} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshPhongMaterial
          color={color.main}
          emissive={color.emissive}
          emissiveIntensity={0.35}
          shininess={130}
          transparent
          opacity={segmentOpacity}
        />
      </mesh>

      {/* Enhanced glow shell - more vibrant */}
      <mesh>
        <boxGeometry args={[0.82, 0.82, 0.82]} />
        <meshBasicMaterial
          color={color.main}
          transparent
          opacity={0.18 * segmentOpacity}
          depthWrite={false}
        />
      </mesh>

      {/* TCP Header (Phase 3) */}
      {showHeader && headerScale > 0 && (
        <group scale={headerScale}>
          <mesh ref={headerRef} position={[0, headerY, 0.40]}>
            <boxGeometry args={[0.64, 0.24, 0.18]} />
            <meshPhongMaterial
              color="#0ea5e9"
              emissive="#0284c7"
              emissiveIntensity={0.6}
              shininess={150}
            />
          </mesh>
          
          {/* Header attachment glow effect */}
          <mesh position={[0, headerY, 0.40]}>
            <boxGeometry args={[0.72, 0.30, 0.24]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.18 * headerScale}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Segment label */}
      <Html position={[0, -0.62, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.88)',
          color: color.main,
          padding: '5px 12px',
          borderRadius: '6px',
          border: `1.5px solid ${color.main}`,
          fontSize: '9px',
          fontWeight: '900',
          fontFamily: 'monospace',
          letterSpacing: '0.6px',
          boxShadow: `0 0 12px ${color.main}77, 0 4px 10px rgba(0,0,0,0.9)`,
          textShadow: `0 0 6px ${color.main}`,
          opacity: segmentOpacity,
        }}>
          SEG {index + 1}
        </div>
      </Html>

      {/* TCP Header label (Phase 3) */}
      {showHeader && (
        <Html position={[0, 0.95, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(2,132,199,0.8), rgba(6,182,212,0.45))',
            backdropFilter: 'blur(16px)',
            border: '2px solid #38bdf8',
            borderRadius: '12px',
            padding: '3px 4px',
            color: '#e0f2fe',
            boxShadow: '0 0 18px rgba(56,189,248,0.95), 0 8px 20px rgba(0,0,0,0.85)',
            letterSpacing: '0px',
            textShadow: '0 0 8px rgba(125,211,252,1)',
            fontFamily: 'monospace',
            minWidth: '100px',
            maxWidth: '110px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* TCP Header Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0px',
              fontSize: '8px',
              fontWeight: '900',
              marginBottom: '2px',
              paddingBottom: '2px',
              borderBottom: '1.5px solid rgba(56,189,248,0.5)',
              color: '#a5f3fc',
              letterSpacing: '2px',
              width: '100%',
            }}>
              TCP HEADER
            </div>

            {/* Segment Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1px',
              width: '100%',
            }}>
              <span style={{
                background: 'rgba(16,185,129,0.4)',
                border: '1px solid #10b981',
                borderRadius: '3px',
                padding: '1px 5px',
                color: '#34d399',
                fontWeight: '900',
                fontSize: '7px',
              }}>SEGMENT {index + 1} / 4</span>
            </div>

            {/* Header Fields */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              marginTop: '2px',
              fontSize: '7px',
              fontWeight: '800',
              width: '100%',
              alignItems: 'center',
              letterSpacing: '2px',
            }}>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>SEQ</span>
                <span style={{ color: '#ffffff' }}>{seqNum}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>LEN</span>
                <span style={{ color: '#a5f3fc' }}>{payloadSize}B</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>ACK</span>
                <span style={{ color: '#ffffff' }}>{ackNum}</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#7dd3fc' }}>FLG</span>
                <span style={{ color: '#34d399' }}>A,P</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * FlowConnector - Horizontal separation line showing split from center
 */
function FlowConnector({ segmentPosition, color, index }) {
  const [lineOpacity, setLineOpacity] = useState(0)

  useEffect(() => {
    const delay = index * ANIMATION_CONFIG.segmentStagger
    gsap.to({ opacity: 0 }, {
      opacity: 1,
      duration: 0.8,
      delay: delay,
      ease: 'power2.out',
      onUpdate: function() {
        setLineOpacity(this.targets()[0].opacity)
      },
    })
  }, [index])

  if (lineOpacity === 0) return null

  // Simple horizontal line from center to segment
  const centerPoint = [0, DATA_BLOCK_Y, 0]
  const segmentPoint = [segmentPosition[0], DATA_BLOCK_Y, 0]

  return (
    <group>
      {/* Connection line */}
      <Line
        points={[centerPoint, segmentPoint]}
        color={color.main}
        lineWidth={2.5}
        transparent
        opacity={0.5 * lineOpacity}
        dashed
        dashScale={2}
        dashSize={0.15}
        gapSize={0.1}
      />

      {/* Glowing core */}
      <Line
        points={[centerPoint, segmentPoint]}
        color={color.main}
        lineWidth={1.2}
        transparent
        opacity={0.8 * lineOpacity}
      />
    </group>
  )
}

/**
 * TravelingSegment - Segment traveling from source to server (Phase 4)
 */
function TravelingSegment({ index, startPosition, color, onReachServer }) {
  const meshRef = useRef()
  const [position, setPosition] = useState(startPosition)
  const [opacity, setOpacity] = useState(1)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const delay = index * ANIMATION_CONFIG.transmission.stagger
    const duration = ANIMATION_CONFIG.transmission.duration
    const arcHeight = ANIMATION_CONFIG.transmission.arcHeight

    // Travel from start to server with arc
    gsap.to({ 
      x: startPosition[0], 
      y: startPosition[1], 
      z: startPosition[2],
      progress: 0
    }, {
      x: SERVER_POSITION[0],
      y: SERVER_POSITION[1],
      z: SERVER_POSITION[2],
      progress: 1,
      duration: duration,
      delay: delay,
      ease: ANIMATION_CONFIG.transmission.ease,
      onUpdate: function() {
        const prog = this.targets()[0].progress
        const x = this.targets()[0].x
        const y = this.targets()[0].y
        const z = this.targets()[0].z
        
        // Add arc to Y position (parabolic curve)
        const arcY = y + Math.sin(prog * Math.PI) * arcHeight
        
        setPosition([x, arcY, z])
      },
      onComplete: () => {
        // Smooth fade-out and scale when reaching server
        gsap.to({ op: 1, sc: 1 }, {
          op: 0,
          sc: 0.3,
          duration: 0.6, // Smoother fade instead of abrupt disappearance
          ease: 'power2.in',
          onUpdate: function() {
            setOpacity(this.targets()[0].op)
            setScale(this.targets()[0].sc)
          },
          onComplete: () => {
            if (onReachServer) onReachServer(index)
          }
        })
      }
    })
  }, [index, startPosition, onReachServer])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    
    // Rotate during travel
    meshRef.current.rotation.y = t * 3 + index
    meshRef.current.rotation.x = Math.sin(t * 2) * 0.3
    
    if (meshRef.current.material) {
      meshRef.current.material.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.2
    }
  })

  if (opacity === 0) return null

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshPhongMaterial
          color={color.main}
          emissive={color.main}
          emissiveIntensity={0.6}
          shininess={130}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Travel glow - more prominent */}
      <mesh>
        <boxGeometry args={[0.85, 0.85, 0.85]} />
        <meshBasicMaterial
          color={color.main}
          transparent
          opacity={0.35 * opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Phase5TravelingSegment - Animate segment from source to buffer slot
 */
function Phase5TravelingSegment({ segmentId, startPosition, color, targetSlotIndex, onArriveAtSlot }) {
  const meshRef = useRef()
  const [state, setState] = useState('waiting-to-start')
  const [position, setPosition] = useState(startPosition)
  const animRef = useRef(null)
  const stateRef = useRef('waiting-to-start')

  console.log(`[Seg ${segmentId}] Mounted - startPos:`, startPosition, 'targetSlot:', targetSlotIndex)

  // Calculate target slot position (memoized)
  const targetPosition = React.useMemo(() => {
    const SLOT_SIZE = 0.56
    const SBX = SERVER_POSITION[0]
    const SBY = SERVER_POSITION[1]
    const SBZ = SERVER_POSITION[2]
    const GRID_SPACING = 0.12
    const OFF = (SLOT_SIZE + GRID_SPACING) / 2
    
    const slotPos = [
      [SBX - OFF, SBY + OFF, SBZ],
      [SBX + OFF, SBY + OFF, SBZ],
      [SBX - OFF, SBY - OFF, SBZ],
      [SBX + OFF, SBY - OFF, SBZ],
    ]
    return slotPos[targetSlotIndex]
  }, [targetSlotIndex])

  // Get timing configuration for this segment (memoized)
  const timing = React.useMemo(() => {
    return ANIMATION_CONFIG.phase5.segmentTravelTimings.find(t => t.index === segmentId)
  }, [segmentId])

  // Main animation effect
  useEffect(() => {
    if (!timing) {
      console.warn(`No timing config for segment ${segmentId}`)
      return
    }

    console.log(`[Seg ${segmentId}] Animation starting. Timing:`, timing)

    const timers = []
    const arcHeight = ANIMATION_CONFIG.transmission?.arcHeight || 0.3

    // Kill any existing animation
    if (animRef.current) {
      console.log(`[Seg ${segmentId}] Killing existing animation`)
      animRef.current.kill()
      animRef.current = null
    }

    const performTravel = () => {
      console.log(`[Seg ${segmentId}] performTravel: animating from`, startPosition, 'to', targetPosition)
      
      // Create GSAP animation
      animRef.current = gsap.to(
        { progress: 0 },
        {
          progress: 1,
          duration: timing.duration,
          ease: 'power2.inOut',
          onUpdate: function() {
            const prog = this.targets()[0].progress
            const x = startPosition[0] + (targetPosition[0] - startPosition[0]) * prog
            const y = startPosition[1] + (targetPosition[1] - startPosition[1]) * prog
            const z = startPosition[2] + (targetPosition[2] - startPosition[2]) * prog
            const arcY = y + Math.sin(prog * Math.PI) * arcHeight

            // Log position updates at key points
            if (prog === 0 || prog === 0.5 || Math.abs(prog - 1) < 0.01) {
              console.log(`[Seg ${segmentId}] Animation prog=${prog.toFixed(2)}, pos=[${x.toFixed(2)}, ${arcY.toFixed(2)}, ${z.toFixed(2)}]`)
            }
            
            setPosition([x, arcY, z])
          },
          onComplete: () => {
            console.log(`[Seg ${segmentId}] Animation complete, calling onArriveAtSlot`)
            stateRef.current = 'arrived'
            setState('arrived')
            setPosition(targetPosition)
            
            if (onArriveAtSlot) {
              console.log(`[Seg ${segmentId}] Calling onArriveAtSlot(${segmentId}, ${targetSlotIndex})`)
              onArriveAtSlot(segmentId, targetSlotIndex)
            }
          }
        }
      )
    }

    // Handle timing based on waiting phase
    if (timing.waitingStart !== undefined && timing.waitingEnd !== undefined) {
      // Segment has a waiting phase
      const waitStartMs = timing.waitingStart * 1000
      const travelStartMs = timing.startDelay * 1000

      console.log(`[Seg ${segmentId}] Has waiting phase. waitStart=${waitStartMs}ms, travelStart=${travelStartMs}ms`)

      // Start waiting state
      const waitTimer = setTimeout(() => {
        console.log(`[Seg ${segmentId}] Wait phase triggered, state→waiting`)
        stateRef.current = 'waiting'
        setState('waiting')
      }, waitStartMs)
      timers.push(waitTimer)

      // Then start traveling
      const travelTimer = setTimeout(() => {
        console.log(`[Seg ${segmentId}] Travel phase triggered, state→traveling`)
        stateRef.current = 'traveling'
        setState('traveling')
        performTravel()
      }, travelStartMs)
      timers.push(travelTimer)
    } else {
      // No waiting - travel immediately at scheduled delay
      const travelDelayMs = timing.startDelay * 1000

      console.log(`[Seg ${segmentId}] No waiting phase. travelDelay=${travelDelayMs}ms`)

      const travelTimer = setTimeout(() => {
        console.log(`[Seg ${segmentId}] Travel triggered, state→traveling`)
        stateRef.current = 'traveling'
        setState('traveling')
        performTravel()
      }, travelDelayMs)
      timers.push(travelTimer)
    }

    // Cleanup function
    return () => {
      console.log(`[Seg ${segmentId}] Cleanup - clearing ${timers.length} timers`)
      timers.forEach(timer => clearTimeout(timer))
      if (animRef.current) {
        animRef.current.kill()
        animRef.current = null
      }
    }
  }, [timing, segmentId, startPosition, targetPosition, onArriveAtSlot, targetSlotIndex])

  // Update ref when state changes
  useEffect(() => {
    console.log(`[Seg ${segmentId}] State changed:`, state)
    stateRef.current = state
  }, [state, segmentId])

  // Animation frame updates (rotation and glow)
  useFrame((frameState) => {
    if (!meshRef.current) return

    const t = frameState.clock.elapsedTime

    // Rotation based on state
    if (state === 'waiting' || state === 'waiting-to-start') {
      meshRef.current.rotation.y = t * 3 + segmentId * 0.5
      meshRef.current.rotation.x = Math.sin(t * 2) * 0.2
    } else {
      meshRef.current.rotation.y = t * 2.5 + segmentId * 0.3
      meshRef.current.rotation.x = Math.sin(t * 1.5) * 0.15
    }

    // Glow effect
    if (meshRef.current.material) {
      if (state === 'waiting') {
        meshRef.current.material.emissiveIntensity = 1.3 + Math.sin(t * 4) * 0.4
      } else if (state === 'traveling' || state === 'waiting-to-start') {
        meshRef.current.material.emissiveIntensity = 0.8 + Math.sin(t * 3) * 0.2
      } else {
        meshRef.current.material.emissiveIntensity = 0.6
      }
    }
  })

  // Render waiting state
  if (state === 'waiting') {
    return (
      <group position={startPosition}>
        <mesh ref={meshRef} castShadow>
          <boxGeometry args={[0.56, 0.56, 0.56]} />
          <meshPhongMaterial
            color={color.main}
            emissive={color.main}
            emissiveIntensity={1.3}
            shininess={130}
            transparent
            opacity={1}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.70, 0.70, 0.70]} />
          <meshBasicMaterial color={color.main} transparent opacity={0.5} depthWrite={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.85, 0.85, 0.85]} />
          <meshBasicMaterial color={color.main} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  // Render waiting-to-start state (initial appearance)
  if (state === 'waiting-to-start') {
    return (
      <group position={startPosition}>
        <mesh ref={meshRef} castShadow>
          <boxGeometry args={[0.56, 0.56, 0.56]} />
          <meshPhongMaterial
            color={color.main}
            emissive={color.main}
            emissiveIntensity={0.8}
            shininess={130}
            transparent
            opacity={1}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[0.70, 0.70, 0.70]} />
          <meshBasicMaterial color={color.main} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      </group>
    )
  }

  // Render traveling/arrived state (at animated position)
  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.56, 0.56, 0.56]} />
        <meshPhongMaterial
          color={color.main}
          emissive={color.main}
          emissiveIntensity={0.8}
          shininess={130}
          transparent
          opacity={1}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[0.70, 0.70, 0.70]} />
        <meshBasicMaterial color={color.main} transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SegmentationStage - TCP Segmentation Visualization
 * 
 * Controlled component that responds to external phase changes:
 * - Phase 1: Shows data block
 * - Phase 2: Animates laser cutting and reveals segments
 * - Phase 3: Attaches TCP headers to segments
 * - Phase 4: Segments travel to server and reassemble (in-order if inOrderMode=true)
 * - Phase 5: Segments arrive out-of-order and are buffered/reordered
 * 
 * @param {number} externalPhase - Current phase (1, 2, 3, 4, or 5) controlled by parent
 * @param {boolean} inOrderMode - If true, Phase 4 shows normal transmission; if false, goes to Phase 5
 */
export default function SegmentationStage({ externalPhase = 1, inOrderMode = true }) {
  // Animation state
  const [cubeOpacity, setCubeOpacity] = useState(1)
  const [laserProgress, setLaserProgress] = useState(0)
  const [laserOpacity, setLaserOpacity] = useState(1)
  const [segmentsVisible, setSegmentsVisible] = useState(false)
  const [segmentKey, setSegmentKey] = useState(0) // Force re-render segments
  
  // Phase 4 state
  const [travelingSegments, setTravelingSegments] = useState([])
  const [_segmentsArrived, setSegmentsArrived] = useState(0)
  const [showReassembled, setShowReassembled] = useState(false)
  const [successFlash, setSuccessFlash] = useState(0)
  const [showServerCube, setShowServerCube] = useState(false)
  const [showConnectionLine, setShowConnectionLine] = useState(false)
  const [hideSourceSegments, setHideSourceSegments] = useState(false)
  
  // Phase 5 state
  const [phase5Active, setPhase5Active] = useState(false)
  const [bufferSlots, setBufferSlots] = useState([null, null, null, null]) // [slot1, slot2, slot3, slot4]
  const [_arrivedOrder, setArrivedOrder] = useState([])
  const [glowingSegments, setGlowingSegments] = useState([])
  const [_isMerging, setIsMerging] = useState(false)
  const [_waitingSegmentId, setWaitingSegmentId] = useState(null) // Track which segment is waiting (for debugging)
  const [_isScanning, setIsScanning] = useState(false) // Scanning phase state
  const [_scanningOrder, setScanningOrder] = useState([])
  
  // Out-of-order error effects
  const [errorSlots, setErrorSlots] = useState([])
  const [bufferErrorActive, setBufferErrorActive] = useState(false)
  const [showWaitingLabel, setShowWaitingLabel] = useState(false) // For future use // Order to scan in: [0, 1, 2, 3]
  const [bufferSuccessActive, setBufferSuccessActive] = useState(false) // Green glow when waiting phase ends
  const [successSlots, setSuccessSlots] = useState([]) // Slots with success glow when segment arrives
  
  // Track previous phase to detect changes
  const prevPhaseRef = useRef(externalPhase)
  const travelingSegmentsRef = useRef([])

  // Respond to phase changes with animations
  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = externalPhase

    // Phase 1: Reset everything with smooth transition
    if (externalPhase === 1) {
      gsap.to({ opacity: 1 }, {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: function() {
          setCubeOpacity(this.targets()[0].opacity)
        },
      })
      setLaserProgress(0)
      setLaserOpacity(1)
      setSegmentsVisible(false)
      setSegmentKey(prev => prev + 1) // Reset segment animations
      
      // Reset Phase 4 state
      setTravelingSegments([])
      setSegmentsArrived(0)
      setShowReassembled(false)
      setSuccessFlash(0)
      setShowServerCube(false)
      setShowConnectionLine(false)
      setHideSourceSegments(false)
      
      // Reset Phase 5 state
      setPhase5Active(false)
      setBufferSlots([null, null, null, null])
      setArrivedOrder([])
      setGlowingSegments([])
      setIsMerging(false)
      setWaitingSegmentId(null)
      setIsScanning(false)
      setScanningOrder([])
      
      // Reset error and success states
      setErrorSlots([])
      setBufferErrorActive(false)
      setShowWaitingLabel(false)
      setBufferSuccessActive(false)
      setSuccessSlots([])
      return
    }

    // Phase 2: Trigger segmentation animation (only if coming from phase 1)
    if (externalPhase === 2 && prevPhase === 1) {
      setSegmentsVisible(false)
      const timeline = gsap.timeline()

      // Step 1: Laser cutting animation completes (0s -> 2.5s)
      timeline.to({ progress: 0 }, {
        progress: 1,
        duration: ANIMATION_CONFIG.laser.duration,
        ease: ANIMATION_CONFIG.laser.ease,
        onUpdate: function() {
          setLaserProgress(this.targets()[0].progress)
        },
      }, 0)

      // Step 2: After laser completes, fade out both laser and cube together (2.5s -> 3.5s)
      timeline.to({ laserOp: 1, cubeOp: 1 }, {
        laserOp: 0,
        cubeOp: 0,
        duration: ANIMATION_CONFIG.fadeOut.duration,
        ease: ANIMATION_CONFIG.fadeOut.ease,
        onUpdate: function() {
          setLaserOpacity(this.targets()[0].laserOp)
          setCubeOpacity(this.targets()[0].cubeOp)
        },
      }, ANIMATION_CONFIG.fadeOut.delay)

      // Step 3: After fade completes, show segments and they slide out (at 3.5s)
      timeline.add(() => setSegmentsVisible(true), ANIMATION_CONFIG.segmentsAppear)
    }

    // Phase 3: Headers are shown via prop, no animation needed here

    // Phase 4: Transmission and reassembly with sequential animations
    if (externalPhase === 4 && prevPhase === 3) {
      // If out-of-order mode, go directly to Phase 5
      if (!inOrderMode) {
        console.log(`[Phase4→5] Entering Phase 5 (OUT-OF-ORDER mode)`)
        
        setPhase5Active(true)
        setBufferSlots([null, null, null, null])
        setArrivedOrder([])
        setGlowingSegments([])
        setIsMerging(false)
        setShowServerCube(false)
        setShowConnectionLine(false)
        setShowReassembled(false)
        setWaitingSegmentId(null)
        setIsScanning(false)
        setScanningOrder([])
        setHideSourceSegments(true) // ✅ HIDE SOURCE SEGMENTS DURING PHASE 5
        
        // Reset error and success states for fresh animation
        setErrorSlots([])
        setBufferErrorActive(false)
        setShowWaitingLabel(false)
        setBufferSuccessActive(false)
        setSuccessSlots([])

        // Start Phase 5 transmission with detailed out-of-order sequence
        // ✅ CREATE SEGMENTS IMMEDIATELY (no 500ms delay) so animations start on time
        const phase5Sequence = ANIMATION_CONFIG.phase5.outOfOrderSequence
        const phase5Segments = phase5Sequence.map(originalIndex => ({
          id: originalIndex,
          originalSequenceNum: originalIndex + 1, // 1-based sequence
          startPosition: SEGMENT_POSITIONS[originalIndex],
          color: SEGMENT_COLORS[originalIndex],
        }))
        
        console.log(`[Phase4→5] Created ${phase5Segments.length} segments:`, phase5Segments.map(s => `S${s.id}`))
        console.log(`[Phase4→5] Segment details:`, phase5Segments)
        
        setTravelingSegments(phase5Segments)
        return
      }

      // Normal in-order Phase 4 - SMOOTH TRANSMISSION
      // Reset Phase 4 state
      setTravelingSegments([])
      setSegmentsArrived(0)
      setShowReassembled(false)
      setSuccessFlash(0)
      setShowServerCube(false)
      setShowConnectionLine(false)
      setHideSourceSegments(false)

      // Step 1: Immediately show server cube for context
      setTimeout(() => {
        setShowServerCube(true)
      }, 50) // Faster appearance

      // Step 2: Show connection line quickly after server cube
      setTimeout(() => {
        setShowConnectionLine(true)
      }, 300) // Reduced delay for smooth progression

      // Step 3: Hide source segments and start transmission together for smooth transition
      setTimeout(() => {
        setHideSourceSegments(true)
        
        // Start all segments traveling in parallel with reduced stagger
        const segments = SEGMENT_POSITIONS.map((pos, i) => ({
          id: i,
          startPosition: pos,
          color: SEGMENT_COLORS[i],
        }))
        setTravelingSegments(segments)
      }, 600) // Smoother entry point after brief setup phase
    }

    // Phase 5: Out-of-Order Transmission
    if (externalPhase === 5 && prevPhase === 4) {
      // Only run this if we didn't already set up Phase 5 in the Phase 4→5 block
      // Skip it if inOrderMode is false (already handled by Phase 4→5 block)
      if (inOrderMode) {
        console.log(`[Phase 5] Entering Phase 5 from Phase 4 (in-order branch)`)
        
        setPhase5Active(true)
        setBufferSlots([null, null, null, null])
        setArrivedOrder([])
        setGlowingSegments([])
        setIsMerging(false)
        setWaitingSegmentId(null)
        setIsScanning(false)
        setScanningOrder([])
        setHideSourceSegments(true)

        // Hide the original reassembled cube and connection line
        setShowServerCube(false)
        setShowConnectionLine(false)
        setShowReassembled(false)
        setTravelingSegments([])

        // Start Phase 5 transmission with detailed timing
        setTimeout(() => {
          const phase5Sequence = ANIMATION_CONFIG.phase5.outOfOrderSequence
          const phase5Segments = phase5Sequence.map(originalIndex => ({
            id: originalIndex,
            originalSequenceNum: originalIndex + 1, // 1-based sequence
            startPosition: SEGMENT_POSITIONS[originalIndex],
            color: SEGMENT_COLORS[originalIndex],
          }))
          setTravelingSegments(phase5Segments)
          
          // Mark segment 1 as waiting - it will wait before traveling
          setWaitingSegmentId(1)
        }, 500)
      } else {
        // Out-of-order mode was already activated in Phase 4→5 block
        // Nothing more to do here, segments are already traveling
        console.log(`[Phase 5] Phase 5 already active from Phase 4→5 transition (out-of-order mode)`)
      }
    }
  }, [externalPhase, inOrderMode])

  // Handle segment arrival at server (Phase 4)
  const handleSegmentReachServer = () => {
    setSegmentsArrived(prev => {
      const newCount = prev + 1
      
      // If all segments arrived, trigger reassembly with smooth transition
      if (newCount === 4) {
        // Immediate transition to reassembly (minimal delay) for smooth flow
        setTimeout(() => {
          setTravelingSegments([])
          setShowReassembled(true)
          
          // Trigger success flash during reassembly
          setTimeout(() => {
            setSuccessFlash(prev => prev + 1)
          }, ANIMATION_CONFIG.reassembly.scaleDelay * 1000)
        }, 100) // Minimal delay for smooth visual transition
      }
      
      return newCount
    })
  }

  // Update ref when travelingSegments changes
  useEffect(() => {
    travelingSegmentsRef.current = travelingSegments
  }, [travelingSegments])

  // Merge animation - triggered after scanning complete (VERY SLOW 4-second merge for understanding)
  const startMergeAnimation = React.useCallback(() => {
    const mergeConfig = ANIMATION_CONFIG.phase5
    
    setIsMerging(true)
    setIsScanning(false)
    console.log(`[MERGE START] Starting merge animation, waiting ${mergeConfig.pauseBeforeMergeDuration}s before reassembly begins`)

    // Hide traveling segments
    setTravelingSegments([])
    
    // EXTENDED PAUSE before merge - user sees all segments have been verified
    setTimeout(() => {
      console.log(`[MERGE EXECUTE] Pause complete, now assembling data block (${mergeConfig.mergeDuration}s merge)`)
      
      // Show the reassembled cube with VERY SLOW transition
      setShowServerCube(true)
      setShowReassembled(true)
      setBufferSlots([null, null, null, null])
      
      // Trigger success flash after merge completes
      setTimeout(() => {
        console.log(`[MERGE COMPLETE] Assembly complete, showing success indicator`)
        setSuccessFlash(prev => prev + 1)
      }, mergeConfig.mergeDuration * 1000) // Success flash after merge animation
    }, mergeConfig.pauseBeforeMergeDuration * 1000) // Extended pause before merge starts

    setIsMerging(false)
  }, [])

  // Glow sequence animation (scanning/verification phase) - VERY SLOW VERSION for clarity
  const startGlowSequence = React.useCallback(() => {
    const glowConfig = ANIMATION_CONFIG.phase5
    
    // EXTENDED PAUSE BEFORE SCANNING - let all segments settle and user understand the state
    console.log(`[SCANNING PAUSE] Waiting ${glowConfig.pauseBeforeScanningDuration}s before verification starts`)
    setTimeout(() => {
      setIsScanning(true)
      console.log(`[SCANNING START] Beginning verification glow sequence`)
      
      // Scan in correct order [0, 1, 2, 3] to verify reordering
      // Each segment glows for 1.2s with 1.2s spacing = very slow for perfect understanding
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          console.log(`[GLOW] Segment ${i} starting glow (${glowConfig.glowDuration}s)`)
          setGlowingSegments(prev => [...prev, i])
          
          setTimeout(() => {
            console.log(`[GLOW END] Segment ${i} glow ending`)
            setGlowingSegments(prev => prev.filter(idx => idx !== i))
          }, glowConfig.glowDuration * 1000)
        }, i * (glowConfig.glowDuration + glowConfig.glowDelay) * 1000)
      }

      // After scanning complete, trigger merge (pauseBeforeMergeDuration is handled in startMergeAnimation)
      setTimeout(() => {
        console.log(`[SCANNING COMPLETE] All segments verified, triggering merge animation`)
        startMergeAnimation()
      }, (4 * (glowConfig.glowDuration + glowConfig.glowDelay)) * 1000)
    }, glowConfig.pauseBeforeScanningDuration * 1000)
  }, [startMergeAnimation])

  // Handle segment arrival at buffer slot (Phase 5)
  const handlePhase5SegmentArrive = React.useCallback((segmentId, slotIndex) => {
    // Find the arriving segment in travelingSegments using ref
    const arrivingSegment = travelingSegmentsRef.current.find(seg => seg.id === segmentId)
    
    if (!arrivingSegment) return

    // Update buffer slot
    setBufferSlots(prev => {
      const newSlots = [...prev]
      newSlots[slotIndex] = arrivingSegment
      return newSlots
    })

    // Track arrival order
    setArrivedOrder(prev => {
      const newOrder = [...prev, arrivingSegment.id]

      // CHECK FOR OUT-OF-ORDER CONDITION
      // Out-of-order happens when segment 2 (index 2) arrives before segment 1 (index 1)
      if (segmentId === 2 && !newOrder.includes(1)) {
        console.log('[OUT-OF-ORDER] Segment 2 arrived before Segment 1 - TRIGGERING ERROR EFFECTS')
        
        // Show waiting label on segment 1 slot
        setShowWaitingLabel(true)
        
        // Blink slot 1 (index 1) RED 2 times with 1-second animation timing
        setTimeout(() => {
          // Blink 1: Visible for 500ms
          setErrorSlots([1])
          setTimeout(() => {
            setErrorSlots([])
            // Gap for 500ms (1 second total per blink)
            setTimeout(() => {
              // Blink 2: Visible for 500ms
              setErrorSlots([1])
              setTimeout(() => {
                setErrorSlots([])
              }, 500)
            }, 500)
          }, 500)
        }, 100)
        
        // Blink buffer RED 1 time with 1-second animation (500ms on, 500ms off)
        setTimeout(() => {
          setBufferErrorActive(true)
          setTimeout(() => {
            setBufferErrorActive(false)
          }, 500)
        }, 700)
      }

      // CLEAR WAITING LABEL when segment 1 finally arrives and show SUCCESS EFFECT ON SLOT
      if (segmentId === 1) {
        console.log('[SEGMENT 1 ARRIVED] Clearing waiting phase label and triggering slot success effect')
        setShowWaitingLabel(false)
        
        // Show SUCCESS GREEN GLOW on the slot itself (slot index 1)
        setSuccessSlots([slotIndex])
        
        // Blink slot GREEN 2 times with 1-second animation timing (success indicator)
        setTimeout(() => {
          setSuccessSlots([slotIndex])
          // Visible for 500ms
          setTimeout(() => {
            setSuccessSlots([])
            // Gap for 500ms (1 second total per blink)
            setTimeout(() => {
              // Second blink: Visible for 500ms
              setSuccessSlots([slotIndex])
              setTimeout(() => {
                setSuccessSlots([])
              }, 500)
            }, 500)
          }, 500)
        }, 100)
      }

      // If all 4 segments arrived, start glow sequence
      if (newOrder.length === 4) {
        setTimeout(() => {
          startGlowSequence()
        }, 500)
      }

      return newOrder
    })
  }, [startGlowSequence])

  // Render phases
  const showDataBlock = externalPhase === 1 || cubeOpacity > 0
  const showLaser = externalPhase === 2 && laserOpacity > 0
  const showSegments = (externalPhase === 3 || (externalPhase === 4 && !hideSourceSegments) || (externalPhase < 3 && segmentsVisible)) && !phase5Active
  const showHeaders = externalPhase === 3
  
  // Map arrival sequence to slot indices
  // Out-of-order sequence: [1,3,2,4] (1-indexed) = [0,2,1,3] (0-indexed)
  // Segment 0 (1) goes to Slot 0
  // Segment 2 (3) goes to Slot 2
  // Segment 1 (2) goes to Slot 1
  // Segment 3 (4) goes to Slot 3
  const getPhase5SlotIndex = (segmentId) => {
    const phase5Mapping = { 0: 0, 2: 2, 1: 1, 3: 3 }
    const slotIdx = phase5Mapping[segmentId] !== undefined ? phase5Mapping[segmentId] : segmentId
    console.log(`[getPhase5SlotIndex] Segment ${segmentId} → Slot ${slotIdx}`)
    return slotIdx
  }

  return (
    <group>
      {/* Phase 1: Data Block */}
      {showDataBlock && <DataBlock opacity={cubeOpacity} />}

      {/* Phase 2: Laser Animation */}
      {showLaser && <LaserLine isActive={true} progress={laserProgress} opacity={laserOpacity} />}

      {/* Phase 2-3: Segments at source */}
      {showSegments && SEGMENT_POSITIONS.map((pos, i) => (
        <Segment
          key={`segment-${segmentKey}-${i}`}
          index={i}
          position={pos}
          color={SEGMENT_COLORS[i]}
          showHeader={showHeaders}
        />
      ))}

      {/* Phase 2-3: Flow connectors */}
      {showSegments && SEGMENT_POSITIONS.map((pos, i) => (
        <FlowConnector
          key={`connector-${segmentKey}-${i}`}
          segmentPosition={pos}
          color={SEGMENT_COLORS[i]}
          index={i}
        />
      ))}

      {/* Phase 4: Connection line */}
      {showConnectionLine && <ConnectionLine visible={true} />}

      {/* Phase 4: Server cube */}
      {showServerCube && (
        <ServerCube 
          visible={true} 
          showReassembled={showReassembled}
          successFlash={successFlash}
        />
      )}

      {/* Phase 4: Traveling segments */}
      {!phase5Active && travelingSegments.map((segment) => (
        <TravelingSegment
          key={`traveling-${segment.id}`}
          index={segment.id}
          startPosition={segment.startPosition}
          color={segment.color}
          onReachServer={handleSegmentReachServer}
        />
      ))}

      {/* Phase 5: Buffer shelf with slots */}
      {phase5Active && <BufferShelf bufferSlots={bufferSlots} glowingSegments={glowingSegments} errorSlots={errorSlots} bufferErrorActive={bufferErrorActive} showWaitingLabel={showWaitingLabel} bufferSuccessActive={bufferSuccessActive} successSlots={successSlots} />}

      {/* Phase 5: Traveling segments to buffer slots */}
      {phase5Active && (
        <>
          {travelingSegments.length > 0 && console.log(`[RENDER] Phase 5 segments: ${travelingSegments.map(s => `S${s.id}`).join(', ')}`)}
          {travelingSegments.map((segment) => {
            console.log(`[RENDER] Rendering Phase5TravelingSegment for segment ${segment.id}`)
            return (
              <Phase5TravelingSegment
                key={`phase5-traveling-${segment.id}`}
                segmentId={segment.id}
                startPosition={segment.startPosition}
                color={segment.color}
                targetSlotIndex={getPhase5SlotIndex(segment.id)}
                onArriveAtSlot={handlePhase5SegmentArrive}
              />
            )
          })}
        </>
      )}
    </group>
  )
}
