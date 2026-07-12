import type { Tile } from '@/types'
import rawTaskData from './tasks.json'

interface TaskEntry {
  variation: string
  description: string
  image?: string
}

const taskData = rawTaskData as TaskEntry[]

export const tiles: Tile[] = Array.from({ length: 100 }, (_, i) => {
  const id = i + 1
  const tier = id <= 24 ? 1 : id <= 70 ? 2 : 3
  const task = taskData[i]!
  return {
    id,
    tier,
    name: task.variation,
    description: task.description,
    image: task.image ?? undefined,
    skill: undefined,
    requiredDrops: 1,
  }
})

export function getTileById(id: number): Tile | undefined {
  return tiles.find((t) => t.id === id)
}
