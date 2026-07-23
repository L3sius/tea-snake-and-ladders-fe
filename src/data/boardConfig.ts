import type { BoardConfig } from '@/types'

export const boardConfig: BoardConfig = {
  columns: 10,
  rows: 10,
  totalTiles: 100,
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
