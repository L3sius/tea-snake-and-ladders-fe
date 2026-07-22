export interface Point {
  x: number
  y: number
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WIGGLE_MIDPOINTS = 4
const WIGGLE_AMPLITUDE_RATIO = 0.12

export function buildWigglePoints(from: Point, to: Point, seed: number): Point[] {
  const random = mulberry32(seed)
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const normalX = length === 0 ? 0 : -dy / length
  const normalY = length === 0 ? 0 : dx / length
  const amplitude = length * WIGGLE_AMPLITUDE_RATIO

  const points: Point[] = [from]
  for (let i = 1; i <= WIGGLE_MIDPOINTS; i++) {
    const t = i / (WIGGLE_MIDPOINTS + 1)
    const baseX = from.x + dx * t
    const baseY = from.y + dy * t
    const side = i % 2 === 0 ? 1 : -1
    const offset = side * amplitude * (0.6 + random() * 0.4)
    points.push({ x: baseX + normalX * offset, y: baseY + normalY * offset })
  }
  points.push(to)
  return points
}

interface BezierSegment {
  p0: Point
  p1: Point
  p2: Point
  p3: Point
}

function catmullRomSegments(points: Point[]): BezierSegment[] {
  if (points.length < 2) return []
  if (points.length === 2) {
    const [p0, p1] = points as [Point, Point]
    return [{ p0, p1: p0, p2: p1, p3: p1 }]
  }

  const segments: BezierSegment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const prev = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const next = points[i + 2] ?? p2

    segments.push({
      p0: p1,
      p1: { x: p1.x + (p2.x - prev.x) / 6, y: p1.y + (p2.y - prev.y) / 6 },
      p2: { x: p2.x - (next.x - p1.x) / 6, y: p2.y - (next.y - p1.y) / 6 },
      p3: p2,
    })
  }
  return segments
}

function evalBezier(seg: BezierSegment, t: number): Point {
  const mt = 1 - t
  return {
    x:
      mt * mt * mt * seg.p0.x +
      3 * mt * mt * t * seg.p1.x +
      3 * mt * t * t * seg.p2.x +
      t * t * t * seg.p3.x,
    y:
      mt * mt * mt * seg.p0.y +
      3 * mt * mt * t * seg.p1.y +
      3 * mt * t * t * seg.p2.y +
      t * t * t * seg.p3.y,
  }
}

function evalBezierTangent(seg: BezierSegment, t: number): Point {
  const mt = 1 - t
  return {
    x:
      3 * mt * mt * (seg.p1.x - seg.p0.x) +
      6 * mt * t * (seg.p2.x - seg.p1.x) +
      3 * t * t * (seg.p3.x - seg.p2.x),
    y:
      3 * mt * mt * (seg.p1.y - seg.p0.y) +
      6 * mt * t * (seg.p2.y - seg.p1.y) +
      3 * t * t * (seg.p3.y - seg.p2.y),
  }
}

interface CurveSample {
  point: Point
  tangentAngleDeg: number
}

function sampleCurve(segments: BezierSegment[], count: number): CurveSample[] {
  if (segments.length === 0) return []
  const samples: CurveSample[] = []
  const steps = count - 1
  for (let i = 0; i <= steps; i++) {
    const globalT = (i / steps) * segments.length
    const segIndex = Math.min(Math.floor(globalT), segments.length - 1)
    const localT = globalT - segIndex
    const seg = segments[segIndex]!
    const tangent = evalBezierTangent(seg, localT)
    samples.push({
      point: evalBezier(seg, localT),
      tangentAngleDeg: (Math.atan2(tangent.y, tangent.x) * 180) / Math.PI,
    })
  }
  return samples
}

const RIBBON_SAMPLES = 48
const HEAD_WIDTH = 0.3
const TAIL_WIDTH = 0.05
const TAPER_EASE_POWER = 1.6

export interface SnakeRibbon {
  d: string
  headPoint: Point
  headAngleDeg: number
}

export function buildSnakeRibbon(from: Point, to: Point, seed: number): SnakeRibbon {
  const segments = catmullRomSegments(buildWigglePoints(from, to, seed))
  const samples = sampleCurve(segments, RIBBON_SAMPLES)
  if (samples.length === 0) {
    return { d: '', headPoint: from, headAngleDeg: 0 }
  }

  const left: Point[] = []
  const right: Point[] = []
  const n = samples.length

  for (let i = 0; i < n; i++) {
    const { point, tangentAngleDeg } = samples[i]!
    const t = i / (n - 1)
    const width = TAIL_WIDTH + (HEAD_WIDTH - TAIL_WIDTH) * Math.pow(1 - t, TAPER_EASE_POWER)
    const rad = (tangentAngleDeg * Math.PI) / 180
    const nx = -Math.sin(rad)
    const ny = Math.cos(rad)
    const half = width / 2
    left.push({ x: point.x + nx * half, y: point.y + ny * half })
    right.push({ x: point.x - nx * half, y: point.y - ny * half })
  }

  const lastSample = samples[n - 1]!
  const lastRad = (lastSample.tangentAngleDeg * Math.PI) / 180
  const tailBulge = TAIL_WIDTH * 0.9
  const tailTip = {
    x: lastSample.point.x + Math.cos(lastRad) * tailBulge,
    y: lastSample.point.y + Math.sin(lastRad) * tailBulge,
  }

  let d = `M ${left[0]!.x} ${left[0]!.y}`
  for (const p of left.slice(1)) d += ` L ${p.x} ${p.y}`
  d += ` Q ${tailTip.x} ${tailTip.y}, ${right[n - 1]!.x} ${right[n - 1]!.y}`
  for (let i = right.length - 2; i >= 0; i--) d += ` L ${right[i]!.x} ${right[i]!.y}`
  d += ' Z'

  return { d, headPoint: samples[0]!.point, headAngleDeg: samples[0]!.tangentAngleDeg }
}
