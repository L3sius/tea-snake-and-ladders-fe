import { reactive, nextTick } from 'vue'
import { initialTeams } from '@/data/teams'
import { boardConfig } from '@/data/boardConfig'
import type { Team, DiceRollEvent, TeamTaskProgress, RollHistoryEntry } from '@/types'

const OVERLAY_MS = 3500
const STEP_MS = 200
const LAND_PAUSE_MS = 400
export const SPECIAL_TRANSITION_MS = 1000

interface GameState {
  teams: Team[]
  activeDiceRoll: DiceRollEvent | null
  connected: boolean
  currentTeamIndex: number
  rollHistory: RollHistoryEntry[]
  displayedPositions: Record<string, number>
  specialMoving: Record<string, boolean>
}

const state = reactive<GameState>({
  teams: structuredClone(initialTeams),
  activeDiceRoll: null,
  connected: false,
  currentTeamIndex: 0,
  rollHistory: [],
  displayedPositions: Object.fromEntries(initialTeams.map((t) => [t.id, t.position])),
  specialMoving: {},
})

const animVersion: Record<string, number> = {}

function applyDiceRoll(event: DiceRollEvent) {
  const team = state.teams.find((t) => t.id === event.teamId)
  if (!team) return

  state.activeDiceRoll = event

  const finalPosition = event.snakeOrLadder?.finalPosition ?? event.toPosition
  team.position = finalPosition

  setTimeout(() => {
    state.activeDiceRoll = null
  }, OVERLAY_MS)
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
      // Pause briefly on the snake/ladder tile so the player sees it land
      setTimeout(async () => {
        if (animVersion[teamId] !== myVersion) return

        // Set the special (long) transition BEFORE the position changes,
        // so Vue flushes the transition-duration style update first.
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

function rollForCurrentTeam(forcedRoll?: number) {
  const team = state.teams[state.currentTeamIndex]
  if (!team) return

  const roll =
    forcedRoll !== undefined && forcedRoll >= 1 && forcedRoll <= 6
      ? forcedRoll
      : Math.ceil(Math.random() * 6)

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
  animateToken(
    team.id,
    fromPosition,
    rawToPosition,
    event.snakeOrLadder?.finalPosition ?? rawToPosition,
  )

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

  state.currentTeamIndex = (state.currentTeamIndex + 1) % state.teams.length
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
  state.currentTeamIndex = 0
  state.rollHistory = []
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
  rollForCurrentTeam,
  resetAll,
  updateTaskProgress,
  getTeamProgressOnTile,
  setConnected,
  setTeams,
}
