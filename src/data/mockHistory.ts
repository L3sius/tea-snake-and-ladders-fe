import type { RollHistoryEntry, Team } from '@/types'
import { boardConfig } from './boardConfig'

// Fixed dice sequence for two full round-robin rounds — picked so the mock
// game includes a ladder climb, a ladder-into-snake swing, and a tier
// crossing, giving the history scrubber something interesting to show.
const MOCK_ROLLS = [3, 6, 2, 5, 4, 6, 2, 6, 6, 4, 6, 5]

// Spread across ~a week, matching the async multi-day pace of the real
// event (a "turn" waits on a task being finished in-game), so the day
// grouping and "waiting Xh" indicators have something realistic to show.
const ROLL_GAP_MS = 14 * 60 * 60 * 1000

export function buildMockHistory(teams: Team[]): { rollHistory: RollHistoryEntry[] } {
  const rollHistory: RollHistoryEntry[] = []
  const totalRolls = teams.length * 2
  const now = Date.now()

  for (let i = 0; i < totalRolls; i++) {
    const team = teams[i % teams.length]!
    const roll = MOCK_ROLLS[i % MOCK_ROLLS.length]!

    const fromPosition = team.position
    const toPosition = Math.min(fromPosition + roll, boardConfig.totalTiles)
    const snake = boardConfig.snakes.find((s) => s.from === toPosition)
    const ladder = boardConfig.ladders.find((l) => l.from === toPosition)
    const snakeOrLadder = snake
      ? ({ type: 'snake' } as const)
      : ladder
        ? ({ type: 'ladder' } as const)
        : undefined
    const finalPosition = snake?.to ?? ladder?.to ?? toPosition

    team.position = finalPosition

    rollHistory.push({
      id: now - (totalRolls - i) * 1000,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      roll,
      fromPosition,
      toPosition,
      finalPosition,
      snakeOrLadder,
      timestamp: new Date(now - (totalRolls - i) * ROLL_GAP_MS),
    })
  }

  return { rollHistory: rollHistory.reverse() }
}
