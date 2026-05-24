import type { BoardConfig } from '@/types'

export const boardConfig: BoardConfig = {
  columns: 9,
  rows: 9,
  totalTiles: 81,
  tiers: [
    { tier: 1, from: 1, to: 24 },
    { tier: 2, from: 25, to: 51 },
    { tier: 3, from: 52, to: 81 },
  ],
  snakes: [
    { from: 62, to: 19 },
    { from: 47, to: 28 },
    { from: 74, to: 53 },
  ],
  ladders: [
    { from: 4, to: 14 },
    { from: 33, to: 44 },
    { from: 58, to: 71 },
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
