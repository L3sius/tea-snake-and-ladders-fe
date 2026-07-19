import type { ActivityEntry } from '@/types'
import mockLiveActivity from './mockLiveActivity.json'

// Wire format for the `getLiveActivity` SSE payload — keyed by sequence
// number, each a plain display-only entry (no team/account linkage).
export interface RawLiveActivityEntry {
  name: string
  event: string
  timestamp: string
}

export type RawLiveActivity = Record<string, RawLiveActivityEntry>

// TEMP: stands in for the real `getLiveActivity` SSE call until it exists —
// same seam pattern as fetchLogHistory in logHistory.ts.
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
    .reverse() // newest-first, matching rollHistory's convention
}
