export interface RawChallengeProgressEntry {
  teamId: number
  tileId: number
  completionPercentage: number
  isTileCompleted: boolean
  progress?: Record<string, number>
}
