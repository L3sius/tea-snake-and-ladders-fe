export type Tier = 1 | 2 | 3

export interface Tile {
  id: number
  tier: Tier
  name: string
  description: string
  skill?: string
  requiredDrops?: number
}

export interface TeamTaskProgress {
  tileId: number
  dropsCollected: number
}

export interface Team {
  id: string
  name: string
  logoPath: string
  color: string
  position: number
  taskProgress: TeamTaskProgress[]
}

export interface Snake {
  from: number
  to: number
}

export interface Ladder {
  from: number
  to: number
}

export interface DiceRollEvent {
  teamId: string
  roll: number
  fromPosition: number
  toPosition: number
  snakeOrLadder?: { type: 'snake' | 'ladder'; finalPosition: number }
}

export interface BoardConfig {
  columns: number
  rows: number
  totalTiles: number
  tiers: { tier: Tier; from: number; to: number }[]
  snakes: Snake[]
  ladders: Ladder[]
}

export interface RollHistoryEntry {
  id: number
  teamId: string
  teamName: string
  teamColor: string
  roll: number
  fromPosition: number
  toPosition: number
  finalPosition: number
  snakeOrLadder?: { type: 'snake' | 'ladder' }
  timestamp: Date
}
