import type { Team, TeamMember } from '@/types'
import { teamPresentation } from './teamPresentation'

export interface RawAlt {
  playerId: number
  playerName: string
}

export interface RawPlayer {
  playerId: number
  playerName: string
  alts: RawAlt[]
}

export interface RawTeam {
  teamId: number
  teamName: string
  players: RawPlayer[]
}

function toMember(player: RawPlayer): TeamMember {
  return {
    displayName: player.playerName,
    accounts: [
      { playerId: player.playerId, name: player.playerName, gold: 0, items: 0, actions: 0 },
      ...player.alts.map((alt) => ({
        playerId: alt.playerId,
        name: alt.playerName,
        gold: 0,
        items: 0,
        actions: 0,
      })),
    ],
  }
}

export function parseTeams(raw: RawTeam[]): Team[] {
  return raw.map((t) => {
    const presentation = teamPresentation[t.teamId]
    return {
      id: String(t.teamId),
      name: t.teamName,
      logoPath: presentation?.logoPath ?? '',
      color: presentation?.color ?? '#888888',
      position: 1,
      taskProgress: [],
      members: t.players.map(toMember),
    }
  })
}
