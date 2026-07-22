import type { RollHistoryEntry, Team } from '@/types'
import mockLogHistory from './mockLogHistory.json'

export interface RawLogEntry {
  previous_tile: number
  current_tile: number
  roll: number
  timestamp: string
  event?: 'snake' | 'ladder'
}

export type RawLogHistory = Record<string, Record<string, RawLogEntry>>

export function fetchLogHistory(): RawLogHistory {
  return mockLogHistory as RawLogHistory
}

interface FlatLogEntry {
  teamId: string
  data: RawLogEntry
  isStart: boolean
  isSlide: boolean
}

function flattenLogHistory(raw: RawLogHistory): FlatLogEntry[] {
  const sequenceKeys = Object.keys(raw).sort((a, b) => Number(a) - Number(b))
  const flat: FlatLogEntry[] = []

  for (const seqKey of sequenceKeys) {
    const teamEntries = raw[seqKey]!
    for (const teamId of Object.keys(teamEntries)) {
      const data = teamEntries[teamId]!
      const isStart = !data.event && data.roll === 0 && data.previous_tile === data.current_tile
      const isSlide = !!data.event
      flat.push({ teamId, data, isStart, isSlide })
    }
  }

  return flat
}

interface PendingRoll {
  entry: FlatLogEntry
  flatIndex: number
}

function toRollHistoryEntry(
  team: Team,
  roll: FlatLogEntry,
  finalTile: number,
  snakeOrLadder?: RollHistoryEntry['snakeOrLadder'],
): RollHistoryEntry {
  return {
    id: Date.parse(roll.data.timestamp),
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    roll: roll.data.roll,
    fromPosition: roll.data.previous_tile,
    toPosition: roll.data.current_tile,
    finalPosition: finalTile,
    snakeOrLadder,
    timestamp: new Date(roll.data.timestamp),
  }
}

export function parseLogHistory(raw: RawLogHistory, teams: Team[]): RollHistoryEntry[] {
  const flat = flattenLogHistory(raw)
  const teamById = new Map(teams.map((t) => [t.id, t]))
  const pending = new Map<string, PendingRoll>()
  const resolved: { flatIndex: number; entry: RollHistoryEntry }[] = []

  function flushPending(teamId: string, team: Team) {
    const pendingRoll = pending.get(teamId)
    if (!pendingRoll) return
    resolved.push({
      flatIndex: pendingRoll.flatIndex,
      entry: toRollHistoryEntry(team, pendingRoll.entry, pendingRoll.entry.data.current_tile),
    })
    pending.delete(teamId)
  }

  for (let i = 0; i < flat.length; i++) {
    const entry = flat[i]!
    const team = teamById.get(entry.teamId)
    if (!team) continue

    team.position = entry.data.current_tile

    if (entry.isStart) continue

    if (entry.isSlide) {
      const pendingRoll = pending.get(entry.teamId)
      if (pendingRoll && pendingRoll.entry.data.current_tile === entry.data.previous_tile) {
        resolved.push({
          flatIndex: pendingRoll.flatIndex,
          entry: toRollHistoryEntry(team, pendingRoll.entry, entry.data.current_tile, {
            type: entry.data.event === 'ladder' ? 'ladder' : 'snake',
          }),
        })
        pending.delete(entry.teamId)
      }
      continue
    }

    flushPending(entry.teamId, team)
    pending.set(entry.teamId, { entry, flatIndex: i })
  }

  for (const teamId of pending.keys()) {
    flushPending(teamId, teamById.get(teamId)!)
  }

  return resolved.sort((a, b) => b.flatIndex - a.flatIndex).map((r) => r.entry)
}
