const API_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export class DiceRollError extends Error {}

export async function postDiceRoll(teamId: string): Promise<number> {
  const res = await fetch(`${API_URL}/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new DiceRollError(body?.message ?? `Dice roll request failed (${res.status}).`)
  }

  return (await res.json()) as number
}
