import type { ActivityEntry } from '@/types'

interface RawActivityEntryBase {
  playerName: string
  timestamp: string
}

export interface RawLootEntry extends RawActivityEntryBase {
  eventTypeFromDink: 'LOOT'
  source: string
}

export interface RawClueEntry extends RawActivityEntryBase {
  eventTypeFromDink: 'CLUE'
  source: string
}

export interface RawKillCountEntry extends RawActivityEntryBase {
  eventTypeFromDink: 'KILL_COUNT'
  source: string
}

export interface RawPetEntry extends RawActivityEntryBase {
  eventTypeFromDink: 'PET'
  petName: string
}

export type RawActivityEntry = RawLootEntry | RawClueEntry | RawKillCountEntry | RawPetEntry

function formatAction(raw: RawActivityEntry): string {
  switch (raw.eventTypeFromDink) {
    case 'LOOT':
      return `got loot from ${raw.source}`
    case 'CLUE':
      return `completed a ${raw.source} clue`
    case 'KILL_COUNT':
      return `conquered ${raw.source}`
    case 'PET':
      return `received a pet: ${raw.petName}`
  }
}

export function parseActivityEntry(raw: RawActivityEntry): ActivityEntry {
  return {
    id: Date.parse(raw.timestamp),
    player: raw.playerName,
    action: formatAction(raw),
    timestamp: new Date(raw.timestamp),
  }
}

export function parseActivityInitial(raw: RawActivityEntry[]): ActivityEntry[] {
  return [...raw]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .map(parseActivityEntry)
}
