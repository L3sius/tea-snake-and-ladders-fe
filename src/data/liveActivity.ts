import type { ActivityEntry } from '@/types'
import mockLiveActivity from './mockLiveActivity.json'

export interface RawLiveActivityEntry {
  name: string
  event: string
  timestamp: string
}

export type RawLiveActivity = Record<string, RawLiveActivityEntry>

export function fetchLiveActivity(): RawLiveActivity {
  return mockLiveActivity as RawLiveActivity
}

export function parseLiveActivity(raw: RawLiveActivity): ActivityEntry[] {
  const sequenceKeys = Object.keys(raw).sort((a, b) => Number(a) - Number(b))

  return sequenceKeys
    .map((seqKey) => {
      const entry = raw[seqKey]!
      return {
        id: Number(seqKey),
        player: entry.name,
        action: entry.event,
        timestamp: new Date(entry.timestamp),
      }
    })
    .reverse()
}
