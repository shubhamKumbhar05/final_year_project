import useNetworkStore from '../../store/useNetworkStore'

// ── OSI layer definitions ────────────────────────────────────────────────────
const LAYERS = [
  { num: 7, name: 'Application',  abbr: 'APP',  proto: 'HTTP · DNS · FTP',   color: '#ff6b6b', dim: '#3a1010' },
  { num: 6, name: 'Presentation', abbr: 'PRES', proto: 'TLS · JPEG · ASCII', color: '#ff9f43', dim: '#2e1a08' },
  { num: 5, name: 'Session',      abbr: 'SESS', proto: 'RPC · NetBIOS',      color: '#f9ca24', dim: '#2a2308' },
  { num: 4, name: 'Transport',    abbr: 'TRAN', proto: 'TCP · UDP',          color: '#6ab04c', dim: '#0f2010' },
  { num: 3, name: 'Network',      abbr: 'NET',  proto: 'IP · ICMP · OSPF',  color: '#22a6b3', dim: '#07202a' },
  { num: 2, name: 'Data Link',    abbr: 'DL',   proto: 'Ethernet · MAC',     color: '#7ed6df', dim: '#0e2830' },
  { num: 1, name: 'Physical',     abbr: 'PHY',  proto: 'Bits · NIC · Cable', color: '#a29bfe', dim: '#18143a' },
]

// Log entry colours by kind
const LOG_KIND_CLS = {
  header:  'text-cyan-400 font-bold',
  step:    'text-white font-semibold',
  encap:   'text-blue-300',
  decap:   'text-emerald-300',
  transit: 'text-amber-300',
  success: 'text-emerald-400',
  complete:'text-cyan-300 font-bold',
}

function DirectionBadge({ direction }) {
  if (!direction) return null
  const map = {
    encap:   { label: '↓ ENCAPSULATION', cls: 'bg-blue-900/50 text-blue-300 border-blue-700/60' },
    decap:   { label: '↑ DECAPSULATION', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60' },
    transit: { label: '→ IN TRANSIT',    cls: 'bg-amber-900/50 text-amber-300 border-amber-700/60' },
  }
  const d = map[direction]
  if (!d) return null
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border tracking-widest ${d.cls}`}>
      {d.label}
    </span>
  )
}

function StatusBadge({ status, type }) {
  if (status === 'idle') return (
    <span className="text-[9px] text-slate-500 uppercase tracking-widest">IDLE</span>
  )
  if (status === 'running') {
    const label = type === 'tcp-handshake' ? 'TCP HANDSHAKE' : 'ICMP PING'
    return (
      <span className="text-[9px] text-cyan-400 uppercase tracking-widest animate-pulse">{label}</span>
    )
  }
  return (
    <span className="text-[9px] text-emerald-400 uppercase tracking-widest">COMPLETE ✓</span>
  )
}

// ── Main panel ───────────────────────────────────────────────────────────────
export default function OSIPanel() {
  const sim = useNetworkStore((s) => s.sim)

  return (
    <div className="absolute top-16 right-5 w-64 pointer-events-none select-none
                    bg-[#040d18]/92 border border-cyan-900/40 rounded-xl
                    shadow-[0_0_28px_#00ffcc10] backdrop-blur-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-900/40">
        <span className="text-[10px] font-bold text-cyan-600 tracking-widest uppercase">
          OSI Model
        </span>
        <StatusBadge status={sim.status} type={sim.type} />
      </div>

      {/* ── Direction indicator ────────────────────────────────────── */}
      <div className="px-3 py-1.5 min-h-[28px] flex items-center">
        <DirectionBadge direction={sim.direction} />
      </div>

      {/* ── Layer stack ────────────────────────────────────────────── */}
      <div className="px-2 pb-2 space-y-0.5">
        {LAYERS.map((l) => {
          const isActive = sim.activeLayer === l.num
          return (
            <div
              key={l.num}
              className="flex items-center gap-2 px-1.5 py-1 rounded transition-all duration-150"
              style={{
                background: isActive ? l.dim : 'transparent',
                border: `1px solid ${isActive ? l.color + '66' : 'transparent'}`,
                boxShadow: isActive ? `0 0 10px ${l.color}30` : 'none',
              }}
            >
              {/* Layer number */}
              <span
                className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold flex-shrink-0 transition-all duration-150"
                style={{
                  background: isActive ? l.color + '33' : '#0a1a2a',
                  color: isActive ? l.color : '#334455',
                  border: `1px solid ${isActive ? l.color + '88' : '#112233'}`,
                }}
              >
                {l.num}
              </span>

              {/* Layer name + protocols */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] font-semibold leading-none transition-colors duration-150"
                  style={{ color: isActive ? l.color : '#445566' }}
                >
                  {l.name}
                </p>
                <p className="text-[8px] text-slate-600 leading-none mt-0.5 truncate">
                  {l.proto}
                </p>
              </div>

              {/* Active pulse dot */}
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                  style={{ background: l.color }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Simulation log ─────────────────────────────────────────── */}
      {sim.log.length > 0 && (
        <div className="border-t border-cyan-900/30 px-3 py-2">
          <p className="text-[9px] text-cyan-800 uppercase tracking-widest mb-1.5 font-bold">
            Event Log
          </p>
          <div className="space-y-0.5 max-h-36 overflow-hidden">
            {sim.log.slice(0, 8).map((entry) => (
              <p
                key={entry.id}
                className={`text-[9px] leading-tight truncate font-mono ${LOG_KIND_CLS[entry.kind] ?? 'text-slate-400'}`}
              >
                {entry.text}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
