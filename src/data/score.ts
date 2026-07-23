export interface RawScorePlayerEntry {
  playerId: number
  teamId: number
  dropCount: number
  gpCount: number
  actionCount: number
}

export interface RawScoreTeamEntry {
  teamId: number
  teamName: string
  dropCount: number
  gpCount: number
  actionCount: number
}

export interface RawScoreGlobal {
  dropCount: number
  gpCount: number
  actionCount: number
}

export interface RawScoreInitial {
  players: RawScorePlayerEntry[]
  teams: RawScoreTeamEntry[]
  global: RawScoreGlobal
}
