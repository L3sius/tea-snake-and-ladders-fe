export interface Point {
  x: number
  y: number
}

export interface Segment {
  from: Point
  to: Point
}

export interface LadderShape {
  rails: [Segment, Segment]
  rungs: Segment[]
  angleDeg: number
}

const RAIL_HALF_SPACING = 0.13
const RUNG_SPACING = 0.31

export function buildLadderShape(from: Point, to: Point): LadderShape {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const dirX = length === 0 ? 0 : dx / length
  const dirY = length === 0 ? 0 : dy / length
  const normalX = -dirY
  const normalY = dirX

  function offset(p: Point, side: 1 | -1): Point {
    return {
      x: p.x + normalX * RAIL_HALF_SPACING * side,
      y: p.y + normalY * RAIL_HALF_SPACING * side,
    }
  }

  const rails: [Segment, Segment] = [
    { from: offset(from, 1), to: offset(to, 1) },
    { from: offset(from, -1), to: offset(to, -1) },
  ]

  const rungs: Segment[] = []
  const inset = RUNG_SPACING / 2
  for (let d = inset; d < length - inset / 2; d += RUNG_SPACING) {
    const center = { x: from.x + dirX * d, y: from.y + dirY * d }
    rungs.push({ from: offset(center, 1), to: offset(center, -1) })
  }

  return { rails, rungs, angleDeg }
}
