import { useMemo } from 'react'
import Packet from './Packet'
import useNetworkStore from '../../store/useNetworkStore'

// Packet colour follows link type; falls back to cyan for ad-hoc paths
const PACKET_COLOURS = {
  lan:     '#00aaff',
  wan:     '#ffcc44',
  dmz:     '#ff5577',
  default: '#00ffcc',
}

export default function PacketManager() {
  const packets = useNetworkStore((s) => s.packets)
  const nodes   = useNetworkStore((s) => s.nodes)
  const links   = useNetworkStore((s) => s.links)

  // node id → position
  const posMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.position])),
    [nodes],
  )

  // "fromId|toId" → link type  (both directions)
  const linkTypeMap = useMemo(() => {
    const m = new Map()
    links.forEach((l) => {
      m.set(`${l.from}|${l.to}`, l.type)
      m.set(`${l.to}|${l.from}`, l.type)
    })
    return m
  }, [links])

  return (
    <>
      {packets.map((pkt) => {
        const fromPos = posMap.get(pkt.fromId)
        const toPos   = posMap.get(pkt.toId)
        if (!fromPos || !toPos) return null

        const linkType = linkTypeMap.get(`${pkt.fromId}|${pkt.toId}`) ?? 'default'
        const color    = pkt.color ?? PACKET_COLOURS[linkType]

        return (
          <Packet
            key={pkt.id}
            id={pkt.id}
            fromPos={fromPos}
            toPos={toPos}
            color={color}
          />
        )
      })}
    </>
  )
}
