import { reactive, nextTick } from 'vue'
import { fetchTeams, parseTeams } from '@/data/getTeams'
import { boardConfig } from '@/data/boardConfig'
import { fetchLogHistory, parseLogHistory } from '@/data/logHistory'
import { postDiceRoll, DiceRollError } from '@/services/diceService'
import type { Team, DiceRollEvent, TeamTaskProgress, RollHistoryEntry } from '@/types'

const OVERLAY_MS = 3500
const STEP_MS = 200
const LAND_PAUSE_MS = 400
export const SPECIAL_TRANSITION_MS = 1000
export const ROLL_COOLDOWN_MS = 10_000

interface GameState {
  teams: Team[]
  activeDiceRoll: DiceRollEvent | null
  connected: boolean
  rollHistory: RollHistoryEntry[]
  displayedPositions: Record<string, number>
  specialMoving: Record<string, boolean>
  historyIndex: number | null
  rollCooldownUntil: number | null
  rolling: boolean
  rollError: string | null
}

const baseTeams = parseTeams(fetchTeams())

const seededTeams = structuredClone(baseTeams)
const seededHistory = parseLogHistory(fetchLogHistory(), seededTeams)

const state = reactive<GameState>({
  teams: seededTeams,
  activeDiceRoll: null,
  connected: false,
  rollHistory: seededHistory,
  displayedPositions: Object.fromEntries(seededTeams.map((t) => [t.id, t.position])),
  specialMoving: {},
  historyIndex: null,
  rollCooldownUntil: null,
  rolling: false,
  rollError: null,
})

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
  const team = state.teams.find((t) => t.id === event.teamId)
  if (!team) return

  const finalPosition = event.snakeOrLadder?.finalPosition ?? event.toPosition
  team.position = finalPosition

  if (state.historyIndex !== null) return

  state.activeDiceRoll = event

  setTimeout(() => {
    state.activeDiceRoll = null
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

function animateToken(teamId: string, from: number, toRaw: number, finalPos: number) {
  animVersion[teamId] = (animVersion[teamId] ?? 0) + 1
  const myVersion = animVersion[teamId]

  state.displayedPositions[teamId] = from

  let current = from

  function step() {
    if (animVersion[teamId] !== myVersion) return

    current++
    state.displayedPositions[teamId] = current

    if (current < toRaw) {
      setTimeout(step, STEP_MS)
    } else if (finalPos !== toRaw) {
      setTimeout(async () => {
        if (animVersion[teamId] !== myVersion) return

        state.specialMoving[teamId] = true
        await nextTick()

        if (animVersion[teamId] !== myVersion) return
        state.displayedPositions[teamId] = finalPos

        setTimeout(() => {
          if (animVersion[teamId] !== myVersion) return
          delete state.specialMoving[teamId]
        }, SPECIAL_TRANSITION_MS + 100)
      }, LAND_PAUSE_MS)
    }
  }

  setTimeout(step, OVERLAY_MS)
}

async function rollForTeam(teamId: string) {
  if (!canRoll()) return

  const team = state.teams.find((t) => t.id === teamId)
  if (!team) return

  state.rolling = true
  state.rollError = null

  let roll: number
  try {
    roll = await postDiceRoll(teamId)
  } catch (err) {
    state.rollError = err instanceof DiceRollError ? err.message : 'Failed to roll dice.'
    return
  } finally {
    state.rolling = false
  }

  const fromPosition = team.position
  const rawToPosition = Math.min(fromPosition + roll, boardConfig.totalTiles)

  const snake = boardConfig.snakes.find((s) => s.from === rawToPosition)
  const ladder = boardConfig.ladders.find((l) => l.from === rawToPosition)

  const event: DiceRollEvent = {
    teamId: team.id,
    roll,
    fromPosition,
    toPosition: rawToPosition,
    snakeOrLadder: snake
      ? { type: 'snake', finalPosition: snake.to }
      : ladder
        ? { type: 'ladder', finalPosition: ladder.to }
        : undefined,
  }

  applyDiceRoll(event)

  if (state.historyIndex === null) {
    animateToken(
      team.id,
      fromPosition,
      rawToPosition,
      event.snakeOrLadder?.finalPosition ?? rawToPosition,
    )
  }

  state.rollHistory.unshift({
    id: Date.now(),
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    roll,
    fromPosition,
    toPosition: rawToPosition,
    finalPosition: event.snakeOrLadder?.finalPosition ?? rawToPosition,
    snakeOrLadder: event.snakeOrLadder ? { type: event.snakeOrLadder.type } : undefined,
    timestamp: new Date(),
  })

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

function updateTaskProgress(teamId: string, tileId: number, dropsCollected: number) {
  const team = state.teams.find((t) => t.id === teamId)
  if (!team) return

  const existing = team.taskProgress.find((p) => p.tileId === tileId)
  if (existing) {
    existing.dropsCollected = dropsCollected
  } else {
    team.taskProgress.push({ tileId, dropsCollected })
  }
}

function getTeamProgressOnTile(teamId: string, tileId: number): TeamTaskProgress | undefined {
  const team = state.teams.find((t) => t.id === teamId)
  return team?.taskProgress.find((p) => p.tileId === tileId)
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
  applyDiceRoll,
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
