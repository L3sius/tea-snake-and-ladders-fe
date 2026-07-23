import { reactive, nextTick } from 'vue'
import { parseTeams } from '@/data/getTeams'
import {
  buildBlankTiles,
  parseBoardInitial,
  parseTileEntry,
  type RawBoardInitialTile,
} from '@/data/boardInitial'
import { parseBoardEventHistory, type RawBoardEventHistoryEntry } from '@/data/boardEventHistory'
import {
  parseActivityEntry,
  parseActivityInitial,
  type RawActivityEntry,
} from '@/data/liveActivity'
import type { RawScoreInitial, RawScorePlayerEntry } from '@/data/score'
import type { RawChallengeProgressEntry } from '@/data/challengeProgress'
import { postDiceRoll, DiceRollError } from '@/services/diceService'
import { fetchTeams } from '@/services/teamsService'
import type {
  Team,
  Tile,
  Snake,
  Ladder,
  DiceRollEvent,
  TeamTaskProgress,
  RollHistoryEntry,
  ActivityEntry,
  PlayerAccount,
} from '@/types'

const OVERLAY_MS = 3500
const STEP_MS = 200
const LAND_PAUSE_MS = 400
export const SPECIAL_TRANSITION_MS = 1000
export const ROLL_COOLDOWN_MS = 10_000

interface GameState {
  teams: Team[]
  tiles: Tile[]
  snakes: Snake[]
  ladders: Ladder[]
  activeDiceRoll: DiceRollEvent | null
  connected: boolean
  rollHistory: RollHistoryEntry[]
  liveActivity: ActivityEntry[]
  displayedPositions: Record<string, number>
  specialMoving: Record<string, boolean>
  historyIndex: number | null
  rollCooldownUntil: number | null
  rolling: boolean
  rollError: string | null
}

let baseTeams: Team[] = []

const state = reactive<GameState>({
  teams: [],
  tiles: buildBlankTiles(),
  snakes: [],
  ladders: [],
  activeDiceRoll: null,
  connected: false,
  rollHistory: [],
  liveActivity: [],
  displayedPositions: {},
  specialMoving: {},
  historyIndex: null,
  rollCooldownUntil: null,
  rolling: false,
  rollError: null,
})

async function loadTeams() {
  try {
    const raw = await fetchTeams()
    const teams = parseTeams(raw)
    baseTeams = teams
    setTeams(structuredClone(teams))
  } catch {}
}

function applyBoardInitial(raw: RawBoardInitialTile[]) {
  const parsed = parseBoardInitial(raw)
  state.tiles = parsed.tiles
  state.snakes = parsed.snakes
  state.ladders = parsed.ladders
}

function applyTileUpdateNow(raw: RawBoardInitialTile) {
  const tile = parseTileEntry(raw)
  const index = state.tiles.findIndex((t) => t.id === tile.id)
  if (index !== -1) state.tiles[index] = tile
  else state.tiles.push(tile)

  if (raw.snakeTo !== undefined && !state.snakes.some((s) => s.from === raw.tileId)) {
    state.snakes.push({ from: raw.tileId, to: raw.snakeTo })
  }
  if (raw.ladderTo !== undefined && !state.ladders.some((l) => l.from === raw.tileId)) {
    state.ladders.push({ from: raw.tileId, to: raw.ladderTo })
  }
}

const revealHeldTiles = new Set<number>()
const pendingTileUpdates = new Map<number, RawBoardInitialTile>()

function applyBoardUpdate(raw: RawBoardInitialTile) {
  if (revealHeldTiles.has(raw.tileId)) {
    pendingTileUpdates.set(raw.tileId, raw)
    return
  }
  applyTileUpdateNow(raw)
}

function releaseTileReveal(tileId: number) {
  revealHeldTiles.delete(tileId)
  const pending = pendingTileUpdates.get(tileId)
  if (pending) {
    pendingTileUpdates.delete(tileId)
    applyTileUpdateNow(pending)
  }
}

function applyBoardEventInitial(raw: RawBoardEventHistoryEntry[]) {
  const parsed = parseBoardEventHistory(raw, state.teams)
  state.rollHistory = parsed.entries
  for (const team of state.teams) {
    const pos = parsed.positions[team.id]
    if (pos !== undefined) {
      team.position = pos
      state.displayedPositions[team.id] = pos
    }
  }
}

function applyActivityInitial(raw: RawActivityEntry[]) {
  state.liveActivity = parseActivityInitial(raw)
}

function applyActivityUpdate(raw: RawActivityEntry) {
  state.liveActivity.unshift(parseActivityEntry(raw))
}

function findAccount(playerId: number): PlayerAccount | undefined {
  for (const team of state.teams) {
    for (const member of team.members) {
      const account = member.accounts.find((a) => a.playerId === playerId)
      if (account) return account
    }
  }
  return undefined
}

function applyScoreInitial(raw: RawScoreInitial) {
  for (const entry of raw.players) {
    const account = findAccount(entry.playerId)
    if (!account) continue
    account.items = entry.dropCount
    account.gold = entry.gpCount
    account.actions = entry.actionCount
  }
}

function applyScoreUpdate(entry: RawScorePlayerEntry) {
  const account = findAccount(entry.playerId)
  if (!account) return
  account.items += entry.dropCount
  account.gold += entry.gpCount
  account.actions += entry.actionCount
}

function canRoll(): boolean {
  return (
    !state.rolling && (state.rollCooldownUntil === null || Date.now() >= state.rollCooldownUntil)
  )
}

function clearRollError() {
  state.rollError = null
}

const animVersion: Record<string, number> = {}

function applyDiceRoll(event: DiceRollEvent) {
  if (state.historyIndex !== null) return

  state.activeDiceRoll = event

  setTimeout(() => {
    state.activeDiceRoll = null
  }, OVERLAY_MS)
}

interface BoardEventUpdate {
  teamId: string
  previousTile: number
  newTile: number
  eventType: string
  rolled: number
  timestamp: string
}

function findSlideDestination(tileId: number): number | undefined {
  return (
    state.snakes.find((s) => s.from === tileId)?.to ??
    state.ladders.find((l) => l.from === tileId)?.to
  )
}

const pendingRollByTeam = new Map<string, BoardEventUpdate>()

function applyBoardEventUpdate(update: BoardEventUpdate) {
  const team = state.teams.find((t) => t.id === update.teamId)
  if (!team) return

  const type = update.eventType.toLowerCase()

  if (type !== 'roll') {
    const pendingRoll = pendingRollByTeam.get(team.id)
    if (pendingRoll && pendingRoll.newTile === update.previousTile) {
      state.rollHistory.unshift({
        id: Date.now(),
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        roll: pendingRoll.rolled,
        fromPosition: pendingRoll.previousTile,
        toPosition: pendingRoll.newTile,
        finalPosition: update.newTile,
        snakeOrLadder: { type: type === 'ladder' ? 'ladder' : 'snake' },
        timestamp: new Date(pendingRoll.timestamp),
      })
      pendingRollByTeam.delete(team.id)
    }
    team.position = update.newTile
    if (state.historyIndex !== null) jumpToLive()
    return
  }

  const slideTo = findSlideDestination(update.newTile)
  const finalTile = slideTo ?? update.newTile

  team.position = finalTile

  if (slideTo !== undefined) {
    pendingRollByTeam.set(team.id, update)
  } else {
    state.rollHistory.unshift({
      id: Date.now(),
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      roll: update.rolled,
      fromPosition: update.previousTile,
      toPosition: update.newTile,
      finalPosition: update.newTile,
      timestamp: new Date(update.timestamp),
    })
  }

  if (state.historyIndex !== null) jumpToLive()

  applyDiceRoll({ teamId: team.id, roll: update.rolled })

  animVersion[team.id] = (animVersion[team.id] ?? 0) + 1
  const myVersion = animVersion[team.id]!

  revealHeldTiles.add(update.newTile)
  if (slideTo !== undefined) revealHeldTiles.add(finalTile)

  state.displayedPositions[team.id] = update.previousTile
  setTimeout(() => {
    if (animVersion[team.id] !== myVersion) {
      releaseTileReveal(update.newTile)
      if (slideTo !== undefined) releaseTileReveal(finalTile)
      return
    }
    crawlToken(team.id, myVersion, update.previousTile, update.newTile, () => {
      releaseTileReveal(update.newTile)
      if (slideTo === undefined) return

      state.specialMoving[team.id] = true
      nextTick().then(() => {
        if (animVersion[team.id] !== myVersion) {
          releaseTileReveal(finalTile)
          return
        }
        state.displayedPositions[team.id] = finalTile
        setTimeout(() => {
          if (animVersion[team.id] === myVersion) delete state.specialMoving[team.id]
          releaseTileReveal(finalTile)
        }, SPECIAL_TRANSITION_MS + 100)
      })
    })
  }, OVERLAY_MS)
}

function glideTokenTo(teamId: string, target: number) {
  animVersion[teamId] = (animVersion[teamId] ?? 0) + 1
  delete state.specialMoving[teamId]
  state.displayedPositions[teamId] = target
}

function snapshotPositions(rollsApplied: number): Record<string, number> {
  const positions: Record<string, number> = Object.fromEntries(
    baseTeams.map((t) => [t.id, t.position]),
  )
  const chronological = [...state.rollHistory].reverse()
  for (let i = 0; i < rollsApplied; i++) {
    const entry = chronological[i]
    if (entry) positions[entry.teamId] = entry.finalPosition
  }
  return positions
}

function glideToSnapshot(rollsApplied: number) {
  const snapshot = snapshotPositions(rollsApplied)
  for (const team of state.teams) {
    glideTokenTo(team.id, snapshot[team.id] ?? team.position)
  }
}

function crawlToken(
  teamId: string,
  myVersion: number,
  from: number,
  to: number,
  onDone?: () => void,
) {
  const direction = to > from ? 1 : -1
  let current = from

  function step() {
    if (animVersion[teamId] !== myVersion) return
    current += direction
    state.displayedPositions[teamId] = current
    if (current !== to) {
      setTimeout(step, STEP_MS)
    } else {
      onDone?.()
    }
  }

  if (current === to) onDone?.()
  else setTimeout(step, STEP_MS)
}

function animateRollForward(entry: RollHistoryEntry) {
  const { teamId, fromPosition, toPosition, finalPosition } = entry
  animVersion[teamId] = (animVersion[teamId] ?? 0) + 1
  const myVersion = animVersion[teamId]

  crawlToken(teamId, myVersion, fromPosition, toPosition, () => {
    if (finalPosition === toPosition) return
    setTimeout(async () => {
      if (animVersion[teamId] !== myVersion) return
      state.specialMoving[teamId] = true
      await nextTick()
      if (animVersion[teamId] !== myVersion) return
      state.displayedPositions[teamId] = finalPosition
      setTimeout(() => {
        if (animVersion[teamId] !== myVersion) return
        delete state.specialMoving[teamId]
      }, SPECIAL_TRANSITION_MS + 100)
    }, LAND_PAUSE_MS)
  })
}

function animateRollBackward(entry: RollHistoryEntry) {
  const { teamId, fromPosition, toPosition, finalPosition } = entry
  animVersion[teamId] = (animVersion[teamId] ?? 0) + 1
  const myVersion = animVersion[teamId]

  function crawlBack() {
    crawlToken(teamId, myVersion, toPosition, fromPosition)
  }

  if (finalPosition === toPosition) {
    crawlBack()
    return
  }

  state.specialMoving[teamId] = true
  nextTick().then(() => {
    if (animVersion[teamId] !== myVersion) return
    state.displayedPositions[teamId] = toPosition
    setTimeout(() => {
      if (animVersion[teamId] !== myVersion) return
      delete state.specialMoving[teamId]
      crawlBack()
    }, SPECIAL_TRANSITION_MS + 100)
  })
}

function stepHistoryPrev() {
  const total = state.rollHistory.length
  if (total === 0) return

  const chronological = [...state.rollHistory].reverse()

  if (state.historyIndex === null) {
    state.historyIndex = total - 1
    animateRollBackward(chronological[total - 1]!)
  } else if (state.historyIndex > 0) {
    const undone = chronological[state.historyIndex - 1]!
    state.historyIndex -= 1
    animateRollBackward(undone)
  }
}

function stepHistoryNext() {
  if (state.historyIndex === null) return

  const total = state.rollHistory.length
  if (state.historyIndex >= total) {
    jumpToLive()
    return
  }

  const chronological = [...state.rollHistory].reverse()
  const applied = chronological[state.historyIndex]!
  state.historyIndex += 1
  animateRollForward(applied)
}

function viewRollAt(logIndex: number) {
  const total = state.rollHistory.length
  state.historyIndex = total - logIndex
  glideToSnapshot(state.historyIndex)
}

function jumpToLive() {
  state.historyIndex = null
  for (const team of state.teams) {
    glideTokenTo(team.id, team.position)
  }
}

async function rollForTeam(teamId: string) {
  if (!canRoll()) return

  const team = state.teams.find((t) => t.id === teamId)
  if (!team) return

  state.rolling = true
  state.rollError = null

  try {
    await postDiceRoll(teamId)
  } catch (err) {
    state.rollError = err instanceof DiceRollError ? err.message : 'Failed to roll dice.'
    return
  } finally {
    state.rolling = false
  }

  state.rollCooldownUntil = Date.now() + ROLL_COOLDOWN_MS
}

function resetAll() {
  for (const id in animVersion) {
    animVersion[id] = (animVersion[id] ?? 0) + 1
  }
  state.teams.forEach((t) => {
    t.position = 1
    t.taskProgress = []
    state.displayedPositions[t.id] = 1
    delete state.specialMoving[t.id]
  })
  state.rollHistory = []
  state.historyIndex = null
  state.rollCooldownUntil = null
}

function updateTaskProgress(
  teamId: string,
  tileId: number,
  completionPercentage: number,
  isCompleted: boolean,
) {
  const team = state.teams.find((t) => t.id === teamId)
  if (!team) return

  const existing = team.taskProgress.find((p) => p.tileId === tileId)
  if (existing) {
    existing.completionPercentage = completionPercentage
    existing.isCompleted = isCompleted
  } else {
    team.taskProgress.push({ tileId, completionPercentage, isCompleted })
  }
}

function getTeamProgressOnTile(teamId: string, tileId: number): TeamTaskProgress | undefined {
  const team = state.teams.find((t) => t.id === teamId)
  return team?.taskProgress.find((p) => p.tileId === tileId)
}

function applyChallengeProgressEntry(entry: RawChallengeProgressEntry) {
  updateTaskProgress(
    String(entry.teamId),
    entry.tileId,
    entry.completionPercentage,
    entry.isTileCompleted,
  )
}

function applyChallengeProgressInitial(raw: RawChallengeProgressEntry[]) {
  for (const entry of raw) applyChallengeProgressEntry(entry)
}

function applyChallengeProgressUpdate(entry: RawChallengeProgressEntry) {
  applyChallengeProgressEntry(entry)
}

function setConnected(value: boolean) {
  state.connected = value
}

function setTeams(teams: Team[]) {
  state.teams = teams
  for (const team of teams) {
    if (!(team.id in state.displayedPositions)) {
      state.displayedPositions[team.id] = team.position
    }
  }
}

export const gameStore = {
  state,
  loadTeams,
  applyBoardInitial,
  applyBoardUpdate,
  applyBoardEventInitial,
  applyBoardEventUpdate,
  applyActivityInitial,
  applyActivityUpdate,
  applyScoreInitial,
  applyScoreUpdate,
  applyChallengeProgressInitial,
  applyChallengeProgressUpdate,
  rollForTeam,
  canRoll,
  clearRollError,
  resetAll,
  updateTaskProgress,
  getTeamProgressOnTile,
  setConnected,
  setTeams,
  stepHistoryPrev,
  stepHistoryNext,
  viewRollAt,
  jumpToLive,
}
