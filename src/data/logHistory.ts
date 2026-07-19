import type { RollHistoryEntry, Team } from '@/types'
import mockLogHistory from './mockLogHistory.json'

// Wire format for the `log_history` SSE payload (see project discussion —
// keyed by sequence number, each entry keyed by team id). One physical dice
// roll that lands on a snake/ladder is logged as TWO consecutive entries:
// the roll itself, then a separate slide entry with `event` set.
export interface RawLogEntry {
  previous_tile: number
  current_tile: number
  roll: number
  timestamp: string
  event?: 'snake' | 'ladder'
}

export type RawLogHistory = Record<string, Record<string, RawLogEntry>>

// TEMP: stands in for the real backend call until log_history is actually
// wired up (REST GET and/or SSE). Everything downstream of this — parsing,
// replay, the store — is unaware it's mock data, so swapping this one
// function for a real fetch later is the only change needed.
export function fetchLogHistory(): RawLogHistory {
  return mockLogHistory as RawLogHistory
}

interface FlatLogEntry {
  teamId: string
  data: RawLogEntry
  isStart: boolean
  isSlide: boolean
}

// Flattens the sequence-keyed/team-keyed nesting into a single chronological
// list — sorted explicitly by the numeric sequence key rather than trusting
// object key iteration order.
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

// Replays the log to (a) move every team to its true latest tile and
// (b) build the Roll Log's history array. A roll entry is merged with its
// team's slide entry (if any) into one RollHistoryEntry — but the slide
// isn't guaranteed to be the very next entry in the log, since another
// team's turn can land in between. So instead of only checking the next
// entry, each team's most recent unresolved roll is held in `pending` until
// either a matching slide arrives (merge) or that team rolls again
// (finalize as a plain roll — no slide was coming).
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

    // Every entry (start, roll, or slide) reflects the team's tile at that
    // point in time — walking them in order always leaves `position` at the
    // latest one seen.
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

    // A new roll for this team — any previously pending roll never got a
    // matching slide, so finalize it as a plain roll before tracking this one.
    flushPending(entry.teamId, team)
    pending.set(entry.teamId, { entry, flatIndex: i })
  }

  // Any rolls still pending at the end of the log never got a slide either.
  for (const teamId of pending.keys()) {
    flushPending(teamId, teamById.get(teamId)!)
  }

  return resolved
    .sort((a, b) => b.flatIndex - a.flatIndex) // newest-first, by when each roll actually happened
    .map((r) => r.entry)
}
