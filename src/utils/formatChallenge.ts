import type { ChallengeData, ChallengeLootEntry } from '@/types'

const NO_GP_CAP = 2_147_483_648

function formatGp(amount: number): string {
  return `${amount.toLocaleString('en-GB')} gp`
}

function formatGpRange(minGp?: number, maxGp?: number): string {
  if (minGp === undefined) return ''
  if (maxGp === undefined || maxGp >= NO_GP_CAP) return `${formatGp(minGp)}+`
  return `${formatGp(minGp)} – ${formatGp(maxGp)}`
}

function titleCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

function formatLootEntry(entry: ChallengeLootEntry): string {
  let label: string
  if (entry.name) {
    label = entry.name
  } else if (entry.nameStartsWith && entry.nameEndsIn) {
    label = `Any ${entry.nameStartsWith.join('/')} ${entry.nameEndsIn}`
  } else if (entry.nameEndsIn) {
    label = `Any ${entry.nameEndsIn}`
  } else if (entry.nameStartsWith) {
    label = `Any ${entry.nameStartsWith.join('/')} item`
  } else {
    label = 'Unknown item'
  }

  if (entry.count && entry.count > 1) label = `${entry.count}x ${label}`
  if (entry.monster) label = `${label} (${entry.monster})`
  return label
}

export interface ChallengeRequirement {
  clueLabel?: string
  heading: string
  items: string[]
}

export function formatChallengeRequirement(challenge: ChallengeData): ChallengeRequirement {
  const clueLabel = challenge.clue ? `${titleCase(challenge.clue.tier)} clue` : undefined
  const loot = challenge.loot ?? []

  switch (challenge.type) {
    case 'item':
      return { clueLabel, heading: 'Requires', items: loot.map(formatLootEntry) }

    case 'collection_all':
      return { clueLabel, heading: 'Obtain all of', items: loot.map(formatLootEntry) }

    case 'collection_any': {
      const count = challenge.count && challenge.count > 1 ? challenge.count : 1
      const heading = count > 1 ? `Obtain any ${count} of` : 'Obtain any of'
      return { clueLabel, heading, items: loot.map(formatLootEntry) }
    }

    case 'value_collection': {
      const item = challenge.gp !== undefined ? `Collect ${formatGp(challenge.gp)}` : ''
      const source = challenge.source ? ` from ${challenge.source}` : ''
      return { clueLabel, heading: 'Requires', items: item ? [`${item}${source}`] : [] }
    }

    case 'value': {
      const reward = challenge.clue?.reward
      const range = formatGpRange(
        reward?.min_gp ?? challenge.minGp,
        reward?.max_gp ?? challenge.maxGp,
      )
      const source = challenge.source ? ` from ${challenge.source}` : ''
      return { clueLabel, heading: 'Requires', items: range ? [`${range}${source}`] : [] }
    }

    case 'kc': {
      const source = challenge.source ? ` ${challenge.source}` : ''
      return { clueLabel, heading: 'Requires', items: [`${challenge.count ?? '?'}x${source}`] }
    }
  }
}
