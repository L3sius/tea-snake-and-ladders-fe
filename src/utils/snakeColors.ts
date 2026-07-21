// One entry per available color combo a snake can be rendered in — shared
// between GameBoard (body/head on the board overlay) and TileModal (the
// head tile's detail view), so the same snake always shows the same color
// in both places.
export interface SnakeColorVariant {
  headHref: string
  patternHref: string
  gradientStart: string
  gradientEnd: string
}

export const SNAKE_COLOR_VARIANTS: SnakeColorVariant[] = [
  {
    headHref: '/images/snake_head_green.png',
    patternHref: '/images/snake_pattern_green.png',
    gradientStart: '#3fd67a',
    gradientEnd: '#0b3d1f',
  },
  {
    headHref: '/images/snake_head_pink.png',
    patternHref: '/images/snake_pattern_pink.png',
    gradientStart: '#e84fc9',
    gradientEnd: '#4a0e42',
  },
  {
    headHref: '/images/snake_head_blue.png',
    patternHref: '/images/snake_pattern_blue.png',
    gradientStart: '#3fb6f0',
    gradientEnd: '#0b2b4a',
  },
]

// Deterministic per-snake pick, seeded by the snake's own `from` tile id —
// same seed dimension GameBoard already uses for that snake's wiggle shape.
export function getSnakeColor(fromTileId: number): SnakeColorVariant {
  return SNAKE_COLOR_VARIANTS[fromTileId % SNAKE_COLOR_VARIANTS.length]!
}
