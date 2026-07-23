import { gameStore } from '@/stores/gameStore'
import type { DiceRollEvent, Team } from '@/types'

const SSE_URL = import.meta.env.VITE_SSE_URL ?? 'http://localhost:8080/api/events'

let eventSource: EventSource | null = null

function connect() {
  if (eventSource) return

  eventSource = new EventSource(SSE_URL)

  eventSource.addEventListener('open', () => {
    gameStore.setConnected(true)
  })

  eventSource.addEventListener('dice_rolled', (e: MessageEvent) => {
    try {
      const event: DiceRollEvent = JSON.parse(e.data)
      gameStore.applyDiceRoll(event)
    } catch {}
  })

  eventSource.addEventListener('board_updated', (e: MessageEvent) => {
    try {
      const teams: Team[] = JSON.parse(e.data)
      gameStore.setTeams(teams)
    } catch {}
  })

  eventSource.addEventListener('task_progress', (e: MessageEvent) => {
    try {
      const { teamId, tileId, dropsCollected } = JSON.parse(e.data)
      gameStore.updateTaskProgress(teamId, tileId, dropsCollected)
    } catch {}
  })

  eventSource.addEventListener('error', () => {
    gameStore.setConnected(false)
    eventSource?.close()
    eventSource = null
    setTimeout(connect, 5000)
  })
}

function disconnect() {
  eventSource?.close()
  eventSource = null
  gameStore.setConnected(false)
}

export const sseService = { connect, disconnect }
