export type Tier = 1 | 2 | 3

export interface ChallengeLootEntry {
  name?: string
  nameStartsWith?: string[]
  nameEndsIn?: string
  count?: number
  monster?: string
}

export interface ChallengeClueReward {
  min_gp: number
  max_gp: number
}

export interface ChallengeClue {
  tier: string
  reward?: ChallengeClueReward
}

export type ChallengeType =
  | 'item'
  | 'collection_any'
  | 'collection_all'
  | 'value'
  | 'value_collection'
  | 'kc'

export interface ChallengeData {
  category: 'loot' | 'clue'
  type: ChallengeType
  difficulty_tier: number
  disallowOnKc: number
  count?: number
  loot?: ChallengeLootEntry[]
  clue?: ChallengeClue
  source?: string
  gp?: number
  minGp?: number
  maxGp?: number
}

export interface Tile {
  id: number
  tier: Tier
  name: string
  description: string
  image?: string
  skill?: string
  challengeData?: ChallengeData
}

export interface TeamTaskProgress {
  tileId: number
  completionPercentage: number
  isCompleted: boolean
}

export interface PlayerAccount {
  playerId: number
  name: string
  gold: number
  items: number
  actions: number
}

export interface TeamMember {
  displayName: string
  accounts: PlayerAccount[]
}

export interface Team {
  id: string
  name: string
  logoPath: string
  color: string
  position: number
  taskProgress: TeamTaskProgress[]
  members: TeamMember[]
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
}

export interface BoardConfig {
  columns: number
  rows: number
  totalTiles: number
}

export interface RollHistoryEntry {
  id: number
  teamId: string
  teamName: string
  teamColor: string
  roll: number | null
  fromPosition: number
  toPosition: number
  finalPosition: number
  snakeOrLadder?: { type: 'snake' | 'ladder' }
  timestamp: Date
}

export interface ActivityEntry {
  id: number
  player: string
  action: string
  timestamp: Date
  isDeath?: boolean
}
