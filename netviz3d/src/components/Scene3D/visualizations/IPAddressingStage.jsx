import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import gsap from 'gsap'
import { ipToBits, ipToBinaryString, isValidMask, maskToNetworkBits, parseIp } from '../../../utils/ipAddressUtils'

/**
 * Complete IPv4 Addressing Visualization (Phases 1-5)
 * Phase 1: 32-bit binary visualization
 * Phase 2: Subnet mask divider animation
 * Phase 3: Network neighborhood grouping with color coding
 * Phase 4: Router and packet animation with AND operation
 * Phase 5: Network ID extraction
 */
export default function IPAddressingStage({
  ipAddress = '192.168.1.10',
  subnetMask = '255.255.255.0',
  showNetworkTrigger = 0,
  sendPacketSameNetworkTrigger = 0,
  sendPacketDiffNetworkTrigger = 0,
  resetTrigger = 0,
  onAnimatingChange,
}) {
  const groupRef = useRef(null)
  const binaryGroupRef = useRef(null)
  const scalpelRef = useRef(null)
  const dividerCoreRef = useRef(null)
  const cutPulseRef = useRef(null)
  const bitRefs = useRef([])
  const bitMaterialRefs = useRef([])
  const pcGroupRef = useRef(null)
  const pcRefs = useRef([])
  const pcMaterialRefs = useRef([])
  const hostLabelRefs = useRef([])
  const routerRef = useRef(null)
  const packetRef = useRef(null)
  const packetMaterialRef = useRef(null)
  const andPanelRef = useRef(null)
  const andIpBitRefs = useRef([])
  const andMaskBitRefs = useRef([])
  const andResultBitRefs = useRef([])
  
  // Animation state management
  const animationTimelineRef = useRef(null)
  const packetTimelineRef = useRef(null)
  const showNetworkTimelineRef = useRef(null)
  const andBitsTimelineRef = useRef(null)
  
  const [showPCs, setShowPCs] = useState(false)
  const [showRouter, setShowRouter] = useState(false)
  const [binaryOpacity, setBinaryOpacity] = useState(1)
  const [packetDestinationIp, setPacketDestinationIp] = useState('10.0.0.30')
  const [andOperationVisible, setAndOperationVisible] = useState(false)
  const [extractedNetworkId, setExtractedNetworkId] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  const leftNetworkHosts = ['192.168.1.10', '192.168.1.11', '192.168.1.12']
  const rightNetworkHosts = ['10.0.0.30', '10.0.0.31', '10.0.0.32']
  const leftNetworkX = [-6.3, -4.95, -3.6]
  const rightNetworkX = [3.55, 4.9, 6.25]

  const bitStartX = -5.425
  const bitSpacing = 0.35

  const octets = useMemo(() => parseIp(ipAddress), [ipAddress])
  const bits = useMemo(() => ipToBits(ipAddress), [ipAddress])
  const binaryDisplay = useMemo(() => ipToBinaryString(ipAddress), [ipAddress])
  const maskIsValid = useMemo(() => isValidMask(subnetMask), [subnetMask])
  const networkBits = useMemo(() => maskToNetworkBits(subnetMask), [subnetMask])
  const dividerX = useMemo(() => bitStartX + (networkBits - 0.5) * bitSpacing, [networkBits])
  const andIpBits = useMemo(() => ipToBits(packetDestinationIp), [packetDestinationIp])
  const andMaskBits = useMemo(() => ipToBits(subnetMask), [subnetMask])
  const andResultBits = useMemo(() => ipToBits(extractedNetworkId || '0.0.0.0'), [extractedNetworkId])
  const andBitStartX = -1.7
  const andBitSpacing = 0.11
  const andBitFontSize = 0.07

  // Calculate network ID and host ID
  const calculateNetworkId = (ip, mask) => {
    const ipOctets = parseIp(ip)
    const maskOctets = parseIp(mask)
    const networkOctets = ipOctets.map((octet, index) => octet & maskOctets[index])
    return networkOctets.join('.')
  }

  const networkId = useMemo(() => calculateNetworkId(ipAddress, subnetMask), [ipAddress, subnetMask])
  const destNetworkId = useMemo(() => calculateNetworkId(packetDestinationIp, subnetMask), [packetDestinationIp, subnetMask])
  const packetReachesCorrectNetwork = networkId === destNetworkId

  // Get random PC position for packet start
  const getRandomPcPosition = () => {
    const pcIndex = Math.floor(Math.random() * 3)
    const x = pcIndex === 0 ? -6.3 : pcIndex === 1 ? -4.95 : -3.6
    return { x, pcIndex }
  }

  const animateAndBitDrop = () => {
    if (andBitsTimelineRef.current) {
      andBitsTimelineRef.current.kill()
      andBitsTimelineRef.current = null
    }

    const ipY = 0.62
    const maskY = -0.02
    const resultY = -0.72

    andIpBitRefs.current.forEach((bitRef) => {
      if (!bitRef) return
      gsap.set(bitRef.position, { y: ipY })
      gsap.set(bitRef.scale, { x: 1, y: 1, z: 1 })
    })

    andMaskBitRefs.current.forEach((bitRef) => {
      if (!bitRef) return
      gsap.set(bitRef.position, { y: maskY })
      gsap.set(bitRef.scale, { x: 1, y: 1, z: 1 })
    })

    andResultBitRefs.current.forEach((bitRef) => {
      if (!bitRef) return
      gsap.set(bitRef.position, { y: resultY })
      gsap.set(bitRef.scale, { x: 0.2, y: 0.2, z: 0.2 })
    })

    const timeline = gsap.timeline()
    andBitsTimelineRef.current = timeline

    andResultBitRefs.current.forEach((resultRef, index) => {
      const ipRef = andIpBitRefs.current[index]
      const maskRef = andMaskBitRefs.current[index]
      if (!resultRef || !ipRef || !maskRef) return

      const step = index * 0.02

      timeline.to(ipRef.position, { y: resultY + 0.1, duration: 0.28, ease: 'power2.in' }, step)
      timeline.to(maskRef.position, { y: resultY - 0.1, duration: 0.28, ease: 'power2.in' }, step)
      timeline.to(resultRef.scale, { x: 1, y: 1, z: 1, duration: 0.2, ease: 'back.out(1.8)' }, step + 0.16)
      timeline.to(ipRef.position, { y: ipY, duration: 0.18, ease: 'power2.out' }, step + 0.32)
      timeline.to(maskRef.position, { y: maskY, duration: 0.18, ease: 'power2.out' }, step + 0.32)
    })
  }

  // Phase 2: Divider animation - fades out after completion
  useEffect(() => {
    if (!scalpelRef.current || !maskIsValid) return

    // Kill previous timeline
    if (animationTimelineRef.current) {
      animationTimelineRef.current.kill()
    }

    const dividerMaterials = [dividerCoreRef.current?.material].filter(Boolean)

    gsap.set(scalpelRef.current.position, { x: dividerX, y: 2.15 })
    gsap.set(dividerMaterials, { opacity: 0, emissiveIntensity: 0.7 })
    if (cutPulseRef.current) {
      gsap.set(cutPulseRef.current.scale, { y: 0.01 })
      gsap.set(cutPulseRef.current.material, { opacity: 0 })
    }

    const timeline = gsap.timeline()
    animationTimelineRef.current = timeline

    // Step 1: divider drops in
    timeline.to(scalpelRef.current.position, { y: 1.22, duration: 0.2, ease: 'power3.out' }, 0)
    timeline.to(dividerMaterials, { opacity: 0.92, emissiveIntensity: 1.05, duration: 0.2, ease: 'sine.out' }, 0)

    // Step 2: pulse downward
    if (cutPulseRef.current) {
      timeline.to(cutPulseRef.current.material, { opacity: 0.32, duration: 0.12, ease: 'power2.out' }, 0.2)
      timeline.to(cutPulseRef.current.scale, { y: 1, duration: 0.4, ease: 'power2.out' }, 0.2)
      timeline.to(cutPulseRef.current.material, { opacity: 0, duration: 0.08 }, 0.52)
    }

    // Bit color transitions
    bitRefs.current.forEach((ref, index) => {
      if (!ref) return
      const isNetworkBit = index < networkBits
      const oneColor = isNetworkBit ? '#3b82f6' : '#facc15'
      const zeroColor = isNetworkBit ? '#1e3a8a' : '#854d0e'
      const targetColor = bits[index] === '1' ? oneColor : zeroColor

      timeline.to(ref.scale, { x: isNetworkBit ? 1.1 : 1, y: isNetworkBit ? 1.1 : 1, z: isNetworkBit ? 1.1 : 1, duration: 0.4, ease: 'power2.out' }, 0.2)

      const bitMaterial = bitMaterialRefs.current[index]
      if (bitMaterial) {
        timeline.to(bitMaterial.color, {
          r: Number.parseInt(targetColor.slice(1, 3), 16) / 255,
          g: Number.parseInt(targetColor.slice(3, 5), 16) / 255,
          b: Number.parseInt(targetColor.slice(5, 7), 16) / 255,
          duration: 0.4,
          ease: 'power2.out',
        }, 0.2)
        timeline.to(bitMaterial.emissive, {
          r: Number.parseInt(targetColor.slice(1, 3), 16) / 255,
          g: Number.parseInt(targetColor.slice(3, 5), 16) / 255,
          b: Number.parseInt(targetColor.slice(5, 7), 16) / 255,
          duration: 0.4,
          ease: 'power2.out',
        }, 0.2)
        timeline.to(bitMaterial, { emissiveIntensity: isNetworkBit ? 1.05 : 0.78, duration: 0.4, ease: 'power2.out' }, 0.2)
      }
    })

    // Step 3: confirmation brighten
    timeline.to(dividerMaterials, { emissiveIntensity: 1.2, duration: 0.08, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.6)

    // Step 4: fade out divider
    timeline.to(scalpelRef.current.position, { y: 1.5, duration: 0.2, ease: 'power2.in' }, 0.8)
    timeline.to(dividerMaterials, { opacity: 0, emissiveIntensity: 0.7, duration: 0.2, ease: 'power2.in' }, 0.8)

    return () => {
      // Cleanup handled by ref, don't kill here as it might still be running
    }
  }, [dividerX, maskIsValid, networkBits, bits, subnetMask])

  // Phase 3: Show network PCs with purple/pink colors
  useEffect(() => {
    if (!showNetworkTrigger) {
      setShowPCs(false)
      return
    }

    // Show PCs immediately with fade effect
    setShowPCs(true)

    // Kill previous show network timeline
    if (showNetworkTimelineRef.current) {
      showNetworkTimelineRef.current.kill()
    }

    const timeline = gsap.timeline()
    showNetworkTimelineRef.current = timeline

    // Glow PCs with their respective colors
    pcRefs.current.forEach((ref, index) => {
      if (!ref) return
      const mat = pcMaterialRefs.current[index]
      if (!mat) return

      timeline.to(ref.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0)
      timeline.to(mat, { emissiveIntensity: 1.6, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0)
    })

    hostLabelRefs.current.forEach((ref, index) => {
      if (!ref) return
      timeline.fromTo(ref, { opacity: 1 }, { opacity: 0.15, duration: 0.12, repeat: 5, yoyo: true, ease: 'power1.inOut' }, 0.05 + index * 0.05)
    })
  }, [showNetworkTrigger])

  // Phase 4 & 5: Send packet and show routing/AND operation
  useEffect(() => {
    if (sendPacketSameNetworkTrigger) {
      triggerPacketAnimation('same')
    }
  }, [sendPacketSameNetworkTrigger])

  useEffect(() => {
    if (sendPacketDiffNetworkTrigger) {
      triggerPacketAnimation('different')
    }
  }, [sendPacketDiffNetworkTrigger])

  const triggerPacketAnimation = (routeType) => {
    // Guard: Prevent animation spam
    if (isAnimating) {
      console.warn('[IPAddressViz] Animation already in progress, ignoring request')
      return
    }

    // Kill any existing packet animation
    if (packetTimelineRef.current) {
      packetTimelineRef.current.kill()
      packetTimelineRef.current = null
    }

    // Ensure PCs are visible
    if (!showPCs) {
      setShowPCs(true)
    }

    setIsAnimating(true)
    setShowRouter(true)
    // Do NOT show AND panel yet - it will appear when packet reaches router

    const timeline = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false)
        console.log('[IPAddressViz] Packet animation complete')
      },
    })

    packetTimelineRef.current = timeline

    if (!packetRef.current) {
      console.error('[IPAddressViz] Packet ref is null, aborting animation')
      setIsAnimating(false)
      return
    }

    const { x: startX, pcIndex } = getRandomPcPosition()

    const isSameNetwork = routeType === 'same'
    const sourcePcIndex = pcIndex

    let destPcIndex = 0
    if (isSameNetwork) {
      const candidateIndices = [0, 1, 2].filter((index) => index !== sourcePcIndex)
      destPcIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)]
    } else {
      destPcIndex = Math.floor(Math.random() * 3)
    }

    const destination = isSameNetwork ? leftNetworkHosts[destPcIndex] : rightNetworkHosts[destPcIndex]
    const finalDestX = isSameNetwork ? leftNetworkX[destPcIndex] : rightNetworkX[destPcIndex]
    const destX = isSameNetwork ? -4.95 : 4.9

    // Keep visualized destination data in sync with the actual destination host.
    setPacketDestinationIp(destination)

    // Step 1: Initialize packet at random PC (visible on screen)
    gsap.set(packetRef.current.position, { x: startX, y: 1.5, z: 0.5 })
    gsap.set(packetRef.current.scale, { x: 0.3, y: 0.3, z: 0.3 })
    if (andPanelRef.current) {
      gsap.set(andPanelRef.current.scale, { x: 0, y: 0, z: 0 })
    }
    console.log(`[IPAddressViz] Packet spawned at PC (x=${startX})`)

    // Step 2: Animate packet from PC to router (center)
    timeline.to(
      packetRef.current.position,
      {
        x: 0,
        y: 1.5,
        z: 0.5,
        duration: 1.0,
        ease: 'power2.inOut',
      },
      0
    )

    // Step 3: Pause at router for AND operation (AFTER packet arrives)
    timeline.add('atRouter', 1.0)

    // Step 4: Show AND panel and calculate network ID (when packet is at router)
    timeline.call(() => {
      setAndOperationVisible(true)
      setExtractedNetworkId(calculateNetworkId(destination, subnetMask))
      console.log(`[IPAddressViz] AND panel shown at router. Destination: ${destination}`)
    }, null, 'atRouter')

    timeline.call(() => {
      animateAndBitDrop()
    }, null, 'atRouter+=0.08')

    // Animate AND panel scale-in
    if (andPanelRef.current) {
      timeline.to(andPanelRef.current.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(1.6)' }, 'atRouter')
    }

    // Step 5: Pause for readability
    timeline.to({}, { duration: 1.2 }, 'atRouter')

    // Step 6: Animate packet from router to destination network
    timeline.to(
      packetRef.current.position,
      {
        x: destX,
        y: 1.5,
        z: 0.5,
        duration: 1.25,
        ease: 'power2.inOut',
      },
      'atRouter+=1.2'
    )

    // Step 7: Move from network edge to the exact destination host.
    timeline.to(
      packetRef.current.position,
      {
        x: finalDestX,
        y: 1.5,
        z: 0.5,
        duration: 0.75,
        ease: 'power2.out',
      },
      'atRouter+=2.45'
    )

    // Keep packet at destination briefly so the end state is clearly visible
    timeline.to({}, { duration: 0.65 }, 'atRouter+=3.2')

    console.log(`[IPAddressViz] Packet routing to ${destination} (${isSameNetwork ? 'SAME NETWORK (left)' : 'DIFFERENT NETWORK (right)'})`)
  }

  // Reset all animations and state
  useEffect(() => {
    if (resetTrigger) {
      console.log('[IPAddressViz] Reset triggered')

      // Kill all active timelines
      if (animationTimelineRef.current) {
        animationTimelineRef.current.kill()
        animationTimelineRef.current = null
      }
      if (packetTimelineRef.current) {
        packetTimelineRef.current.kill()
        packetTimelineRef.current = null
      }
      if (showNetworkTimelineRef.current) {
        showNetworkTimelineRef.current.kill()
        showNetworkTimelineRef.current = null
      }
      if (andBitsTimelineRef.current) {
        andBitsTimelineRef.current.kill()
        andBitsTimelineRef.current = null
      }

      // Clear entire GSAP timeline
      gsap.globalTimeline.clear()

      // Kill all remaining GSAP animations on these objects
      gsap.killTweensOf(packetRef.current)
      gsap.killTweensOf(packetRef.current?.position)
      gsap.killTweensOf(packetRef.current?.scale)
      gsap.killTweensOf(scalpelRef.current)
      gsap.killTweensOf(pcRefs.current)
      gsap.killTweensOf(bitRefs.current)
      gsap.killTweensOf(andPanelRef.current)
      gsap.killTweensOf(andPanelRef.current?.scale)
      gsap.killTweensOf(andIpBitRefs.current)
      gsap.killTweensOf(andMaskBitRefs.current)
      gsap.killTweensOf(andResultBitRefs.current)

      // Reset state
      setShowPCs(false)
      setShowRouter(false)
      setAndOperationVisible(false)
      setExtractedNetworkId('')
      setIsAnimating(false)

      // Reset packet position safely (visible on scene)
      if (packetRef.current) {
        gsap.set(packetRef.current.position, { x: 0, y: 1.5, z: 0.5 })
        gsap.set(packetRef.current.scale, { x: 0.3, y: 0.3, z: 0.3 })
      }

      // Reset AND panel scale to 0
      if (andPanelRef.current) {
        gsap.set(andPanelRef.current.scale, { x: 0, y: 0, z: 0 })
      }

      if (scalpelRef.current) {
        gsap.set(scalpelRef.current.position, { x: dividerX, y: 2.15 })
      }

      if (dividerCoreRef.current) {
        gsap.set(dividerCoreRef.current.material, { opacity: 0 })
      }

      if (cutPulseRef.current) {
        gsap.set(cutPulseRef.current.scale, { y: 0.01 })
        gsap.set(cutPulseRef.current.material, { opacity: 0 })
      }

      // Reset bit colors and scales
      bitRefs.current.forEach((ref, index) => {
        if (ref) {
          gsap.set(ref.scale, { x: 1, y: 1, z: 1 })
          const mat = bitMaterialRefs.current[index]
          if (mat) {
            gsap.set(mat, { emissiveIntensity: 0.4 })
          }
        }
      })

      // Reset PC materials
      pcMaterialRefs.current.forEach((mat) => {
        if (mat) {
          gsap.set(mat, { emissiveIntensity: 0.8 })
        }
      })

      console.log('[IPAddressViz] Reset complete')
    }
  }, [resetTrigger, dividerX])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.06
    }
  })

  // Cleanup on unmount: kill all timelines
  useEffect(() => {
    return () => {
      console.log('[IPAddressViz] Component unmounting, cleaning up animations')
      if (animationTimelineRef.current) {
        animationTimelineRef.current.kill()
      }
      if (packetTimelineRef.current) {
        packetTimelineRef.current.kill()
      }
      if (showNetworkTimelineRef.current) {
        showNetworkTimelineRef.current.kill()
      }
      if (andBitsTimelineRef.current) {
        andBitsTimelineRef.current.kill()
      }
      // Kill all GSAP animations
      gsap.killTweensOf(packetRef.current)
      gsap.killTweensOf(packetRef.current?.position)
      gsap.killTweensOf(packetRef.current?.scale)
      gsap.killTweensOf(scalpelRef.current)
      gsap.killTweensOf(pcRefs.current)
      gsap.killTweensOf(bitRefs.current)
      gsap.killTweensOf(andPanelRef.current?.scale)
      gsap.killTweensOf(andIpBitRefs.current)
      gsap.killTweensOf(andMaskBitRefs.current)
      gsap.killTweensOf(andResultBitRefs.current)
    }
  }, [])

  // Notify parent when animation state changes
  useEffect(() => {
    if (onAnimatingChange) {
      onAnimatingChange(isAnimating)
    }
  }, [isAnimating, onAnimatingChange])

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {/* Phase 1: Binary Visualization Group - Only visible when network is NOT shown */}
      {!showPCs && (
        <group ref={binaryGroupRef}>
          {/* Phase 1: Title and IP display */}
          <Text position={[0, 4, 0]} fontSize={0.36} color="#7dd3fc" anchorX="center">
            Anatomy of an IPv4 Address
          </Text>
          <Text position={[0, 3.35, 0]} fontSize={0.28} color="#e2e8f0" anchorX="center">
            {octets.join(' . ')}
          </Text>
          <Text position={[0, 2.8, 0]} fontSize={0.2} color="#94a3b8" anchorX="center">
            {binaryDisplay}
          </Text>

          {/* Phase 1: Octet labels */}
          {[0, 1, 2, 3].map((octetIndex) => (
            <Text
              key={`octet-label-${octetIndex}`}
              position={[-5.425 + octetIndex * 3.72, 1.95, 0]}
              fontSize={0.16}
              color="#cbd5e1"
              anchorX="center"
            >
              Octet {octetIndex + 1}
            </Text>
          ))}

          {/* Phase 1: Bit spheres */}
          {bits.map((bit, index) => {
            const x = bitStartX + index * bitSpacing

            return (
              <group
                key={`bit-${index}`}
                position={[x, 1, 0]}
                ref={(node) => {
                  bitRefs.current[index] = node
                }}
              >
                <mesh>
                  <sphereGeometry args={[0.11, 16, 16]} />
                  <meshStandardMaterial
                    color="#475569"
                    emissive="#475569"
                    emissiveIntensity={0.4}
                    ref={(node) => {
                      bitMaterialRefs.current[index] = node
                    }}
                  />
                </mesh>
                <Text position={[0, -0.28, 0]} fontSize={0.1} color="#e2e8f0" anchorX="center">
                  {bit}
                </Text>
              </group>
            )
          })}

          {/* Phase 1: Octet separators */}
          {[1, 2, 3].map((split) => (
            <mesh key={`split-${split}`} position={[-5.425 + split * 2.8 - 0.17, 1, 0]}>
              <boxGeometry args={[0.03, 0.6, 0.03]} />
              <meshStandardMaterial color="#64748b" emissive="#64748b" emissiveIntensity={0.4} />
            </mesh>
          ))}

          {/* Phase 2: Pulse cylinder and divider */}
          <mesh ref={cutPulseRef} position={[dividerX, 0.45, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.55, 14]} />
            <meshStandardMaterial color="#dbeafe" emissive="#93c5fd" transparent opacity={0} emissiveIntensity={0.95} />
          </mesh>

          <group ref={scalpelRef} position={[dividerX, 1.22, 0]}>
            <mesh ref={dividerCoreRef}>
              <boxGeometry args={[0.026, 1.45, 0.02]} />
              <meshStandardMaterial color="#60a5fa" emissive="#60a5fa" emissiveIntensity={1.12} transparent opacity={0} />
            </mesh>
          </group>

          {/* Phase 2: Network and Host ID labels */}
          <Text position={[-3.5, 2.3, 0]} fontSize={0.2} color="#60a5fa" anchorX="center">
            Network ID ({networkBits} bits)
          </Text>
          <Text position={[3.5, 2.3, 0]} fontSize={0.2} color="#fde047" anchorX="center">
            Host ID ({32 - networkBits} bits)
          </Text>

          <Text position={[0, -0.05, 0]} fontSize={0.18} color="#f8fafc" anchorX="center">
            Subnet Mask: {subnetMask}
          </Text>
        </group>
      )}

      {/* Phase 3: Network labels */}
      {showPCs && (
        <>
          <Text position={[-4.5, 3.5, 0]} fontSize={0.2} color="#d946ef" anchorX="center" fontWeight="bold">
            Network 192.168.1.x
          </Text>
          <Text position={[4.5, 3.5, 0]} fontSize={0.2} color="#ec4899" anchorX="center" fontWeight="bold">
            Network 10.0.0.x
          </Text>
        </>
      )}

      {/* Phase 3: PCs with purple/pink colors - Centered at y: 1.5 */}
      {showPCs && (
        <group ref={pcGroupRef}>
          {[0, 1, 2].map((i) => {
            const x = -6.3 + i * 1.35
            const host = `${i + 10}`
            return (
              <group
                key={`pc-left-${i}`}
                position={[x, 1.5, 0]}
                ref={(node) => {
                  pcRefs.current[i] = node
                }}
              >
                <mesh>
                  <boxGeometry args={[0.5, 0.38, 0.38]} />
                  <meshStandardMaterial
                    color="#9333ea"
                    emissive="#7e22ce"
                    emissiveIntensity={0.8}
                    ref={(node) => {
                      pcMaterialRefs.current[i] = node
                    }}
                  />
                </mesh>
                <Text position={[0, -0.42, 0]} fontSize={0.11} color="#e9d5ff" anchorX="center">
                  PC-L{i + 1}
                </Text>
                <Text
                  position={[0, -0.6, 0]}
                  fontSize={0.1}
                  color="#d8b4fe"
                  anchorX="center"
                  ref={(node) => {
                    hostLabelRefs.current[i] = node
                  }}
                >
                  Host .{host}
                </Text>
              </group>
            )
          })}

          {[0, 1, 2].map((i) => {
            const x = 3.55 + i * 1.35
            const host = `${i + 30}`
            return (
              <group
                key={`pc-right-${i}`}
                position={[x, 1.5, 0]}
                ref={(node) => {
                  pcRefs.current[3 + i] = node
                }}
              >
                <mesh>
                  <boxGeometry args={[0.5, 0.38, 0.38]} />
                  <meshStandardMaterial
                    color="#ec4899"
                    emissive="#be185d"
                    emissiveIntensity={0.8}
                    ref={(node) => {
                      pcMaterialRefs.current[3 + i] = node
                    }}
                  />
                </mesh>
                <Text position={[0, -0.42, 0]} fontSize={0.11} color="#fbcfe8" anchorX="center">
                  PC-R{i + 1}
                </Text>
                <Text
                  position={[0, -0.6, 0]}
                  fontSize={0.1}
                  color="#f8bbd0"
                  anchorX="center"
                  ref={(node) => {
                    hostLabelRefs.current[3 + i] = node
                  }}
                >
                  Host .{host}
                </Text>
              </group>
            )
          })}
        </group>
      )}

      {/* Phase 4: Router in the middle */}
      {showRouter && (
        <group ref={routerRef} position={[0, 1.5, 0]}>
          <mesh>
            <boxGeometry args={[0.8, 0.6, 0.6]} />
            <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={1.2} />
          </mesh>
          <Text position={[0, 0, 0.4]} fontSize={0.15} color="#e0f2fe" anchorX="center" anchorY="middle">
            ROUTER
          </Text>
        </group>
      )}

      {/* Phase 4: Packet */}
      <mesh ref={packetRef} position={[0, 1.5, 0.5]} visible={showRouter}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={1.5}
          ref={packetMaterialRef}
        />
      </mesh>

      {/* Phase 5: AND Operation Side Panel */}
      <group ref={andPanelRef} position={[0, 3.9, 0]} scale={[0, 0, 0]} visible={andOperationVisible}>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[4.1, 3.4, 0.02]} />
            <meshStandardMaterial color="#1e1b4b" emissive="#0f172a" emissiveIntensity={0.8} />
          </mesh>

          <Text position={[0, 1.4, 0]} fontSize={0.16} color="#818cf8" anchorX="center" fontWeight="bold">
            AND Operation
          </Text>

          {/* Row 1: Destination IP (Binary) */}
          <Text position={[0, 0.9, 0]} fontSize={0.09} color="#c7d2fe" anchorX="center">
            Dest IP (binary):
          </Text>
          {andIpBits.map((bit, index) => (
            <Text
              key={`and-ip-bit-${index}`}
              position={[andBitStartX + index * andBitSpacing, 0.62, 0.02]}
              fontSize={andBitFontSize}
              color="#a5f3fc"
              anchorX="center"
              fontFamily="monospace"
              outlineWidth={0.003}
              outlineColor="#020617"
              ref={(node) => {
                andIpBitRefs.current[index] = node
              }}
            >
              {bit}
            </Text>
          ))}

          {/* Row 2: Subnet Mask (Binary) */}
          <Text position={[0, 0.25, 0]} fontSize={0.09} color="#c7d2fe" anchorX="center">
            AND Mask (binary):
          </Text>
          {andMaskBits.map((bit, index) => (
            <Text
              key={`and-mask-bit-${index}`}
              position={[andBitStartX + index * andBitSpacing, -0.02, 0.02]}
              fontSize={andBitFontSize}
              color="#a5f3fc"
              anchorX="center"
              fontFamily="monospace"
              outlineWidth={0.003}
              outlineColor="#020617"
              ref={(node) => {
                andMaskBitRefs.current[index] = node
              }}
            >
              {bit}
            </Text>
          ))}

          {/* Row 3: Result (Network ID in Binary) */}
          <Text position={[0, -0.4, 0]} fontSize={0.09} color="#86efac" anchorX="center" fontWeight="bold">
            = Network ID (binary):
          </Text>
          {andResultBits.map((bit, index) => (
            <Text
              key={`and-result-bit-${index}`}
              position={[andBitStartX + index * andBitSpacing, -0.72, 0.02]}
              fontSize={andBitFontSize}
              color="#86efac"
              anchorX="center"
              fontFamily="monospace"
              outlineWidth={0.003}
              outlineColor="#020617"
              ref={(node) => {
                andResultBitRefs.current[index] = node
              }}
            >
              {bit}
            </Text>
          ))}

          <Text position={[0, -0.98, 0]} fontSize={0.1} color="#bfdbfe" anchorX="center">
            Network ID (decimal): {extractedNetworkId || '0.0.0.0'}
          </Text>

          {/* Display match result */}
          <Text
            position={[0, -1.26, 0]}
            fontSize={0.1}
            color={packetReachesCorrectNetwork ? '#86efac' : '#f87171'}
            anchorX="center"
            fontWeight="bold"
          >
            {packetReachesCorrectNetwork ? '✓ Same Network' : '✗ Different Network'}
          </Text>
        </group>

      {!maskIsValid && (
        <Text position={[0, -0.45, 0]} fontSize={0.15} color="#f87171" anchorX="center">
          Invalid subnet mask.
        </Text>
      )}
    </group>
  )
}
