import { boardConfig } from './boardConfig'
import type { Tile, Snake, Ladder, Tier, ChallengeData } from '@/types'

export interface RawBoardInitialTile {
  tileId: number
  isStart?: boolean
  isFinish?: boolean
  variation?: string
  description?: string
  difficulty: 'easy' | 'medium' | 'hard'
  image?: string
  ladderTo?: number
  snakeTo?: number
  challengeData?: ChallengeData
}

const DIFFICULTY_TIER: Record<RawBoardInitialTile['difficulty'], Tier> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

export function buildBlankTiles(): Tile[] {
  return Array.from({ length: boardConfig.totalTiles }, (_, i) => ({
    id: i + 1,
    tier: 1,
    name: '',
    description: '',
  }))
}

export function parseTileEntry(entry: RawBoardInitialTile): Tile {
  const image = entry.image
    ? `${entry.difficulty}/${entry.image}`
    : entry.snakeTo !== undefined
      ? `${entry.difficulty}/background.png`
      : undefined

  return {
    id: entry.tileId,
    tier: DIFFICULTY_TIER[entry.difficulty] ?? 1,
    name: entry.variation ?? '',
    description: entry.description ?? '',
    image,
    challengeData: entry.challengeData,
  }
}

export interface ParsedBoardInitial {
  tiles: Tile[]
  snakes: Snake[]
  ladders: Ladder[]
}

export function parseBoardInitial(raw: RawBoardInitialTile[]): ParsedBoardInitial {
  const byId = new Map(raw.map((t) => [t.tileId, t]))
  const snakes: Snake[] = []
  const ladders: Ladder[] = []

  const tiles: Tile[] = Array.from({ length: boardConfig.totalTiles }, (_, i) => {
    const id = i + 1
    const entry = byId.get(id)
    if (!entry) return { id, tier: 1, name: '', description: '' }

    if (entry.snakeTo !== undefined) snakes.push({ from: id, to: entry.snakeTo })
    if (entry.ladderTo !== undefined) ladders.push({ from: id, to: entry.ladderTo })

    return parseTileEntry(entry)
  })

  return { tiles, snakes, ladders }
}
