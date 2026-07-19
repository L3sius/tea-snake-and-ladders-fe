import type { Team, TeamMember } from '@/types'
import mockGetTeams from './mockGetTeams.json'
import { teamPresentation } from './teamPresentation'

// Wire format for the `getTeams` REST response — id/name/members only.
// color/logoPath are frontend-owned (see teamPresentation.ts) and never
// sent by the backend.
export interface RawTeam {
  id: number
  name: string
  members: TeamMember[]
}

// TEMP: stands in for the real `getTeams` REST call until it exists — same
// seam pattern as fetchLogHistory in logHistory.ts.
export function fetchTeams(): RawTeam[] {
  return mockGetTeams as RawTeam[]
}

export function parseTeams(raw: RawTeam[]): Team[] {
  return raw.map((t) => {
    const presentation = teamPresentation[t.id]
    return {
      id: String(t.id),
      name: t.name,
      logoPath: presentation?.logoPath ?? '',
      color: presentation?.color ?? '#888888',
      position: 1,
      taskProgress: [],
      members: t.members,
    }
  })
}
