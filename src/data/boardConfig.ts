import type { BoardConfig } from '@/types'

export const boardConfig: BoardConfig = {
  columns: 10,
  rows: 10,
  totalTiles: 100,
  tiers: [
    { tier: 1, from: 1, to: 24 },
    { tier: 2, from: 25, to: 70 },
    { tier: 3, from: 71, to: 100 },
  ],
  snakes: [
    { from: 98, to: 78 },
    { from: 95, to: 73 },
    { from: 93, to: 73 },
    { from: 87, to: 24 },
    { from: 64, to: 60 },
    { from: 62, to: 19 },
    { from: 56, to: 53 },
    { from: 49, to: 11 },
    { from: 47, to: 26 },
    { from: 16, to: 6 },
  ],
  ladders: [
    { from: 4, to: 14 },
    { from: 9, to: 31 },
    { from: 20, to: 38 },
    { from: 21, to: 42 },
    { from: 36, to: 44 },
    { from: 51, to: 67 },
    { from: 71, to: 91 },
    { from: 80, to: 100 },
  ],
}

export function getTilePosition(tileId: number): { row: number; col: number } {
  const rowFromBottom = Math.ceil(tileId / boardConfig.columns)
  const posInRow = (tileId - 1) % boardConfig.columns

  const col = rowFromBottom % 2 !== 0 ? posInRow + 1 : boardConfig.columns - posInRow
  const row = boardConfig.rows - rowFromBottom + 1

  return { row, col }
}

export function getTileId(row: number, col: number): number {
  const rowFromBottom = boardConfig.rows - row + 1
  const posInRow = rowFromBottom % 2 !== 0 ? col - 1 : boardConfig.columns - col
  return (rowFromBottom - 1) * boardConfig.columns + posInRow + 1
}

export function getTier(tileId: number): 1 | 2 | 3 {
  for (const tier of boardConfig.tiers) {
    if (tileId >= tier.from && tileId <= tier.to) return tier.tier
  }
  return 3
}

export function getTileSvgCenter(tileId: number): { cx: number; cy: number } {
  const { col, row } = getTilePosition(tileId)
  return {
    cx: ((col - 0.5) / boardConfig.columns) * 100,
    cy: ((row - 0.5) / boardConfig.rows) * 100,
  }
}

export function getTileGridCenter(tileId: number): { cx: number; cy: number } {
  const { col, row } = getTilePosition(tileId)
  return { cx: col - 0.5, cy: row - 0.5 }
}
