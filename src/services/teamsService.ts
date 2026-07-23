import type { RawTeam } from '@/data/getTeams'

const API_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export async function fetchTeams(): Promise<RawTeam[]> {
  const res = await fetch(`${API_URL}/teams`)
  if (!res.ok) {
    throw new Error(`Failed to fetch teams (${res.status}).`)
  }
  return (await res.json()) as RawTeam[]
}
