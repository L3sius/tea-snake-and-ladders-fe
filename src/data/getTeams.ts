import type { Team, TeamMember } from '@/types'
import mockGetTeams from './mockGetTeams.json'
import { teamPresentation } from './teamPresentation'

export interface RawTeam {
  id: number
  name: string
  members: TeamMember[]
}

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
