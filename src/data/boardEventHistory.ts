import type { RollHistoryEntry, Team } from '@/types'

export interface RawBoardEventHistoryEntry {
  teamId: number
  previousTile: number
  newTile: number
  eventType: string
  rolled?: number
  timestamp: string
}

export interface ParsedBoardEventHistory {
  entries: RollHistoryEntry[]
  positions: Record<string, number>
}

export function parseBoardEventHistory(
  raw: RawBoardEventHistoryEntry[],
  teams: Team[],
): ParsedBoardEventHistory {
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const sorted = [...raw].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))

  const positions: Record<string, number> = {}
  const pending = new Map<string, RawBoardEventHistoryEntry>()
  const entries: RollHistoryEntry[] = []
  let nextId = 1

  function toRollHistoryEntry(
    team: Team,
    rollEntry: RawBoardEventHistoryEntry,
    finalTile: number,
    snakeOrLadder?: RollHistoryEntry['snakeOrLadder'],
  ): RollHistoryEntry {
    return {
      id: nextId++,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      roll: rollEntry.rolled ?? 0,
      fromPosition: rollEntry.previousTile,
      toPosition: rollEntry.newTile,
      finalPosition: finalTile,
      snakeOrLadder,
      timestamp: new Date(rollEntry.timestamp),
    }
  }

  function flushPending(teamId: string) {
    const rollEntry = pending.get(teamId)
    if (!rollEntry) return
    const team = teamById.get(teamId)
    if (team) entries.push(toRollHistoryEntry(team, rollEntry, rollEntry.newTile))
    pending.delete(teamId)
  }

  for (const item of sorted) {
    const teamId = String(item.teamId)
    const team = teamById.get(teamId)
    if (!team) continue

    positions[teamId] = item.newTile

    const type = item.eventType.toLowerCase()

    if (type === 'initial') continue

    if (type === 'roll') {
      flushPending(teamId)
      pending.set(teamId, item)
      continue
    }

    const rollEntry = pending.get(teamId)
    if (rollEntry && rollEntry.newTile === item.previousTile) {
      entries.push(
        toRollHistoryEntry(team, rollEntry, item.newTile, {
          type: type === 'ladder' ? 'ladder' : 'snake',
        }),
      )
      pending.delete(teamId)
    }
  }

  for (const teamId of pending.keys()) {
    flushPending(teamId)
  }

  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return { entries, positions }
}
