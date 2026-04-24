import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Text } from '@react-three/drei'
import gsap from 'gsap'

const responses = {
  ls: 'bin  boot  home  etc  var',
  pwd: '/home/netadmin',
  whoami: 'netadmin',
  date: new Date().toUTCString(),
  help: 'Available: ls, pwd, whoami, date, help, clear',
}

function EndpointNode({ position, label, isOn, tint }) {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y += 0.003
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.03
  })

  return (
    <group ref={ref} position={position}>
      <mesh>
        <boxGeometry args={[1.1, 2.1, 0.9]} />
        <meshStandardMaterial color={isOn ? tint : '#334155'} emissive={isOn ? tint : '#1f2937'} emissiveIntensity={isOn ? 0.45 : 0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0.5]}>
        <planeGeometry args={[0.72, 0.45]} />
        <meshStandardMaterial color="#0b1220" emissive={isOn ? '#16a34a' : '#374151'} emissiveIntensity={isOn ? 0.7 : 0.25} />
      </mesh>
      <Text position={[0, -1.35, 0]} fontSize={0.18} color="#ffffff" anchorX="center" anchorY="middle">
        {label}
      </Text>
      <mesh>
        <sphereGeometry args={[1.25, 20, 20]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.12} transparent opacity={isOn ? 0.14 : 0.06} />
      </mesh>
    </group>
  )
}

function TelnetPacket({ x, y, label, color }) {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.z += 0.03
    ref.current.position.y = y + Math.sin(state.clock.elapsedTime * 5) * 0.05
  })

  return (
    <group ref={ref} position={[x, y, 0]}>
      <mesh>
        <boxGeometry args={[0.55, 0.32, 0.28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} />
      </mesh>
      <Text position={[0, 0, 0.18]} fontSize={0.1} color="#ffffff" anchorX="center" anchorY="middle">
        {label}
      </Text>
      <mesh>
        <sphereGeometry args={[0.4, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

function TelnetPanel({ phase, connected, authenticated, logs, onConnect, onDisconnect, onLogin, onCommand }) {
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const [panelPos, setPanelPos] = useState({ x: -340, y: 130 })
  const [user, setUser] = useState('admin')
  const [pass, setPass] = useState('')
  const [cmd, setCmd] = useState('')

  const onMouseDown = useCallback(
    (event) => {
      dragRef.current = {
        dragging: true,
        offsetX: event.clientX - panelPos.x,
        offsetY: event.clientY - panelPos.y,
      }
    },
    [panelPos.x, panelPos.y]
  )

  const onMouseMove = useCallback((event) => {
    if (!dragRef.current.dragging) return
    setPanelPos({
      x: event.clientX - dragRef.current.offsetX,
      y: event.clientY - dragRef.current.offsetY,
    })
  }, [])

  const onMouseUp = useCallback(() => {
    dragRef.current.dragging = false
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const runLogin = useCallback(() => {
    onLogin(user, pass)
    setPass('')
  }, [onLogin, pass, user])

  const sendCommand = useCallback(() => {
    if (!cmd.trim()) return
    onCommand(cmd.trim())
    setCmd('')
  }, [cmd, onCommand])

  const phaseLabel = useMemo(() => {
    if (phase === 'idle') return 'Idle'
    if (phase === 'connecting') return 'Connecting'
    if (phase === 'awaiting-login') return 'Awaiting Login'
    return 'Session Active'
  }, [phase])

  return (
    <Html position={[0, 3.5, 0]} scale={0.8} distanceFactor={1.2}>
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'fixed',
          left: `${panelPos.x}px`,
          top: `${panelPos.y}px`,
          width: '380px',
          borderRadius: '14px',
          border: '1px solid rgba(34, 197, 94, 0.45)',
          background: 'linear-gradient(140deg, rgba(3, 7, 18, 0.97), rgba(15, 23, 42, 0.95))',
          boxShadow: '0 18px 42px rgba(0,0,0,0.45)',
          color: '#e2e8f0',
          padding: '14px',
          fontFamily: 'Consolas, monospace',
          cursor: 'grab',
          userSelect: 'none',
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <strong style={{ letterSpacing: '0.08em', color: '#34d399' }}>TELNET / TCP 23</strong>
          <span style={{ fontSize: '11px', color: connected ? '#22c55e' : '#ef4444' }}>{phaseLabel}</span>
        </div>

        <div style={{ marginBottom: '8px', fontSize: '11px', color: '#fca5a5' }}>
          Warning: Telnet sends credentials and commands as plain text.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={connected ? onDisconnect : onConnect}
            disabled={phase === 'connecting'}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: connected ? '#ef4444' : '#10b981',
              color: '#fff',
              cursor: phase === 'connecting' ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
          >
            {connected ? 'Disconnect' : 'Connect'}
          </button>
          <button
            type="button"
            onClick={() => onCommand('help')}
            disabled={!authenticated}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(96, 165, 250, 0.5)',
              background: 'rgba(30, 41, 59, 0.95)',
              color: '#bfdbfe',
              cursor: authenticated ? 'pointer' : 'not-allowed',
              fontWeight: 700,
            }}
          >
            Quick Help
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            disabled={!connected || authenticated}
            placeholder="username"
            style={{ borderRadius: '7px', border: '1px solid #334155', background: '#0f172a', color: '#d1fae5', padding: '7px' }}
          />
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            disabled={!connected || authenticated}
            placeholder="password"
            type="password"
            style={{ borderRadius: '7px', border: '1px solid #334155', background: '#0f172a', color: '#d1fae5', padding: '7px' }}
          />
          <button
            type="button"
            onClick={runLogin}
            disabled={!connected || authenticated || phase !== 'awaiting-login'}
            style={{
              padding: '7px 10px',
              borderRadius: '7px',
              border: 'none',
              background: '#f59e0b',
              color: '#111827',
              fontWeight: 700,
              cursor: connected && !authenticated && phase === 'awaiting-login' ? 'pointer' : 'not-allowed',
            }}
          >
            Login
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendCommand()
            }}
            disabled={!authenticated}
            placeholder="type command"
            style={{ flex: 1, borderRadius: '7px', border: '1px solid #334155', background: '#0f172a', color: '#d1fae5', padding: '7px' }}
          />
          <button
            type="button"
            onClick={sendCommand}
            disabled={!authenticated}
            style={{
              padding: '7px 12px',
              borderRadius: '7px',
              border: 'none',
              background: '#34d399',
              color: '#082f24',
              fontWeight: 700,
              cursor: authenticated ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </div>

        <div style={{ maxHeight: '170px', overflowY: 'auto', borderRadius: '9px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(2,6,23,0.75)', padding: '8px' }}>
          {logs.map((item, i) => (
            <div key={`${item.dir}-${i}`} style={{ fontSize: '11px', marginBottom: '6px', lineHeight: 1.35 }}>
              <div style={{ color: item.dir === 'C' ? '#fbbf24' : '#86efac' }}>{item.dir === 'C' ? 'C>' : 'S>'} {item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </Html>
  )
}

export default function TelnetViz() {
  const [phase, setPhase] = useState('idle')
  const [connected, setConnected] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [packet, setPacket] = useState(null)
  const [logs, setLogs] = useState([
    { dir: 'S', text: 'Telnet client ready. Use Connect to begin.' },
  ])
  const timelineRef = useRef(null)

  const addLog = useCallback((dir, text) => {
    setLogs((prev) => [...prev.slice(-14), { dir, text }])
  }, [])

  const animatePacket = useCallback((label, color, y, toServer, duration = 0.9) => {
    if (timelineRef.current) timelineRef.current.kill()
    const tl = gsap.timeline()
    timelineRef.current = tl

    const startX = toServer ? -5 : 5
    const endX = toServer ? 5 : -5
    setPacket({ x: startX, y, label, color })

    tl.to(
      { x: startX },
      {
        x: endX,
        duration,
        ease: 'power1.inOut',
        onUpdate: function () {
          setPacket((prev) => (prev ? { ...prev, x: this.targets()[0].x } : prev))
        },
      }
    )

    tl.call(() => {
      setPacket(null)
    })

    return tl
  }, [])

  const onConnect = useCallback(() => {
    if (connected || phase === 'connecting') return

    setPhase('connecting')
    addLog('C', 'CONNECT tcp/23')
    const tl1 = animatePacket('SYN', '#38bdf8', 0.18, true, 1.0)

    tl1.call(() => {
      addLog('S', 'SYN-ACK')
      const tl2 = animatePacket('ACK', '#34d399', -0.18, false, 0.8)
      tl2.call(() => {
        setConnected(true)
        setPhase('awaiting-login')
        addLog('S', 'login:')
      })
    })
  }, [addLog, animatePacket, connected, phase])

  const onDisconnect = useCallback(() => {
    if (!connected) return
    setConnected(false)
    setAuthenticated(false)
    setPhase('idle')
    if (timelineRef.current) timelineRef.current.kill()
    setPacket(null)
    addLog('C', 'QUIT')
    addLog('S', 'Connection closed by foreign host.')
  }, [addLog, connected])

  const onLogin = useCallback(
    (user, pass) => {
      if (!connected || phase !== 'awaiting-login') return
      addLog('C', `USER ${user}`)
      const tlUser = animatePacket('USER', '#f59e0b', 0.22, true, 0.7)
      tlUser.call(() => {
        addLog('C', `PASS ${'*'.repeat(Math.max(pass.length, 3))}`)
        const tlPass = animatePacket('PASS', '#f97316', -0.22, true, 0.8)
        tlPass.call(() => {
          const ok = user.trim().length > 0 && pass.trim().length >= 3
          if (ok) {
            setAuthenticated(true)
            setPhase('session')
            addLog('S', '230 Login successful. Welcome to remote shell.')
          } else {
            addLog('S', '530 Login incorrect. Try again.')
          }
        })
      })
    },
    [addLog, animatePacket, connected, phase]
  )

  const onCommand = useCallback(
    (cmd) => {
      if (!authenticated && cmd !== 'help') return
      addLog('C', cmd)

      if (cmd === 'clear') {
        setLogs([{ dir: 'S', text: 'Screen cleared.' }])
        return
      }

      const response = responses[cmd] ?? `command not found: ${cmd}`
      const tlOut = animatePacket(cmd.toUpperCase().slice(0, 8), '#22d3ee', 0.22, true, 0.75)
      tlOut.call(() => {
        const tlIn = animatePacket('RSP', '#34d399', -0.22, false, 0.75)
        tlIn.call(() => {
          addLog('S', response)
        })
      })
    },
    [addLog, animatePacket, authenticated]
  )

  useEffect(() => {
    return () => {
      if (timelineRef.current) timelineRef.current.kill()
    }
  }, [])

  return (
    <>
      <group>
        <EndpointNode position={[-5, 0, 0]} label="CLIENT TERMINAL" isOn={connected} tint="#0ea5e9" />
        <EndpointNode position={[5, 0, 0]} label="REMOTE HOST" isOn={connected} tint="#10b981" />

        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-5, 0, 0, 5, 0, 0])} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={connected ? '#22c55e' : '#64748b'} linewidth={2} transparent opacity={0.8} />
        </line>

        <Text position={[0, 0.38, 0]} fontSize={0.14} color={connected ? '#22c55e' : '#94a3b8'} anchorX="center" anchorY="middle">
          {connected ? 'PLAINTEXT TELNET STREAM (TCP 23)' : 'NO ACTIVE SESSION'}
        </Text>

        {packet && <TelnetPacket x={packet.x} y={packet.y} label={packet.label} color={packet.color} />}

        <Text position={[0, -2.55, 0]} fontSize={0.19} color={authenticated ? '#34d399' : connected ? '#fbbf24' : '#ef4444'} anchorX="center">
          {authenticated ? 'AUTHENTICATED REMOTE SHELL' : connected ? 'CONNECTED - LOGIN REQUIRED' : 'SESSION CLOSED'}
        </Text>
      </group>

      <TelnetPanel
        phase={phase}
        connected={connected}
        authenticated={authenticated}
        logs={logs}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        onLogin={onLogin}
        onCommand={onCommand}
      />
    </>
  )
}
