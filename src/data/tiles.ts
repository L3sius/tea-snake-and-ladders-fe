import type { Tile } from '@/types'

export const tiles: Tile[] = Array.from({ length: 81 }, (_, i) => ({
  id: i + 1,
  tier: i + 1 <= 24 ? 1 : i + 1 <= 51 ? 2 : 3,
  name: `Task ${i + 1}`,
  description: 'Task description coming soon.',
  skill: undefined,
  requiredDrops: 1,
}))

export function getTileById(id: number): Tile | undefined {
  return tiles.find((t) => t.id === id)
}
