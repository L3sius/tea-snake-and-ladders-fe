import { gameStore } from '@/stores/gameStore'
import type { RawBoardInitialTile } from '@/data/boardInitial'
import type { RawBoardEventHistoryEntry } from '@/data/boardEventHistory'
import type { RawActivityEntry } from '@/data/liveActivity'
import type { RawScoreInitial, RawScorePlayerEntry } from '@/data/score'
import type { RawChallengeProgressEntry } from '@/data/challengeProgress'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const SSE_URL = `${API_BASE_URL.replace(/\/$/, '')}/events`;

interface RawBoardEventUpdate {
  teamId: number
  previousTile: number
  newTile: number
  eventType: string
  rolled: number
  timestamp: string
}

let eventSource: EventSource | null = null

function connect() {
  if (eventSource) return

  eventSource = new EventSource(SSE_URL)

  eventSource.addEventListener('open', () => {
    gameStore.setConnected(true)
  })

  eventSource.addEventListener('board-initial', (e: MessageEvent) => {
    try {
      const raw: RawBoardInitialTile[] = JSON.parse(e.data)
      gameStore.applyBoardInitial(raw)
    } catch { }
  })

  eventSource.addEventListener('board-event-initial', (e: MessageEvent) => {
    try {
      const raw: RawBoardEventHistoryEntry[] = JSON.parse(e.data)
      gameStore.applyBoardEventInitial(raw)
    } catch { }
  })

  eventSource.addEventListener('board-update', (e: MessageEvent) => {
    try {
      const raw: RawBoardInitialTile = JSON.parse(e.data)
      gameStore.applyBoardUpdate(raw)
    } catch { }
  })

  eventSource.addEventListener('board-event-update', (e: MessageEvent) => {
    try {
      const update: RawBoardEventUpdate = JSON.parse(e.data)
      gameStore.applyBoardEventUpdate({
        teamId: String(update.teamId),
        previousTile: update.previousTile,
        newTile: update.newTile,
        eventType: update.eventType,
        rolled: update.rolled,
        timestamp: update.timestamp,
      })
    } catch { }
  })

  eventSource.addEventListener('action-initial', (e: MessageEvent) => {
    try {
      const raw: RawActivityEntry[] = JSON.parse(e.data)
      gameStore.applyActivityInitial(raw)
    } catch { }
  })

  eventSource.addEventListener('action-feed-update', (e: MessageEvent) => {
    try {
      const raw: RawActivityEntry = JSON.parse(e.data)
      gameStore.applyActivityUpdate(raw)
    } catch { }
  })

  eventSource.addEventListener('score-initial', (e: MessageEvent) => {
    try {
      const raw: RawScoreInitial = JSON.parse(e.data)
      gameStore.applyScoreInitial(raw)
    } catch { }
  })

  eventSource.addEventListener('score-update', (e: MessageEvent) => {
    try {
      const raw: RawScorePlayerEntry = JSON.parse(e.data)
      gameStore.applyScoreUpdate(raw)
    } catch { }
  })

  eventSource.addEventListener('challenge-progress-initial', (e: MessageEvent) => {
    try {
      const raw: RawChallengeProgressEntry[] = JSON.parse(e.data)
      gameStore.applyChallengeProgressInitial(raw)
    } catch { }
  })

  eventSource.addEventListener('challenge-progress-update', (e: MessageEvent) => {
    try {
      const raw: RawChallengeProgressEntry = JSON.parse(e.data)
      gameStore.applyChallengeProgressUpdate(raw)
    } catch { }
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
