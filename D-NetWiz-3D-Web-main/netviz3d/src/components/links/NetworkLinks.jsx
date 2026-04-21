import { useMemo } from 'react'
import Link from './Link'
import useNetworkStore from '../../store/useNetworkStore'

/*
 * Reads the node + link arrays from the store, builds a position
 * lookup map, then renders one <Link> per connection.
 */
export default function NetworkLinks() {
  const nodes = useNetworkStore((s) => s.nodes)
  const links = useNetworkStore((s) => s.links)

  // node id → position  (recomputed only when nodes array changes)
  const posMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.position])),
    [nodes],
  )

  return (
    <>
      {links.map((link) => {
        const start = posMap.get(link.from)
        const end   = posMap.get(link.to)
        if (!start || !end) return null

        return (
          <Link
            key={link.id}
            id={link.id}
            start={start}
            end={end}
            type={link.type}
          />
        )
      })}
    </>
  )
}
