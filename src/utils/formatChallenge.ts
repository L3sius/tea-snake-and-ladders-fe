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

function lootLabel(entry: ChallengeLootEntry): string {
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

  if (entry.monster) label = `${label} (${entry.monster})`
  return label
}

function lootIdentifier(entry: ChallengeLootEntry): string {
  const raw = entry.name ?? entry.nameEndsIn ?? entry.nameStartsWith?.[0] ?? ''
  return raw.toLowerCase()
}

export interface RequirementLine {
  text: string
  obtained?: number
  needed?: number
  satisfied?: boolean
}

export interface ChallengeRequirement {
  clueLabel?: string
  heading: string
  lines: RequirementLine[]
  summary?: { obtained: number; needed: number }
  obtainedLines?: RequirementLine[]
}

function lootLines(
  loot: ChallengeLootEntry[],
  progress: Record<string, number> | undefined,
): RequirementLine[] {
  return loot.map((entry) => {
    const label = lootLabel(entry)
    const needed = entry.count ?? 1

    if (!progress) {
      const text = needed > 1 ? `${needed}x ${label}` : label
      return { text }
    }

    const obtained = progress[lootIdentifier(entry)] ?? 0
    const text = needed > 1 ? `${obtained}/${needed} ${label}` : label
    return { text, obtained, needed, satisfied: obtained >= needed }
  })
}

export function formatChallengeRequirement(
  challenge: ChallengeData,
  progress?: Record<string, number>,
): ChallengeRequirement {
  const clueLabel = challenge.clue ? `${titleCase(challenge.clue.tier)} clue` : undefined
  const loot = challenge.loot ?? []

  switch (challenge.type) {
    case 'item':
      return { clueLabel, heading: 'Requires', lines: lootLines(loot, progress) }

    case 'collection_all':
      return { clueLabel, heading: 'Obtain all of', lines: lootLines(loot, progress) }

    case 'collection_any': {
      const needed = challenge.count && challenge.count > 1 ? challenge.count : 1
      const heading = needed > 1 ? `Obtain any ${needed} of` : 'Obtain any of'
      const lines = lootLines(loot, undefined)

      let summary: ChallengeRequirement['summary']
      let obtainedLines: RequirementLine[] | undefined
      if (progress) {
        const obtained = loot.reduce(
          (sum, entry) => sum + (progress[lootIdentifier(entry)] ?? 0),
          0,
        )
        summary = { obtained, needed }
        obtainedLines = loot.flatMap((entry) => {
          const qty = progress[lootIdentifier(entry)] ?? 0
          return qty > 0 ? [{ text: `${qty}x ${lootLabel(entry)}`, obtained: qty }] : []
        })
      }

      return { clueLabel, heading, lines, summary, obtainedLines }
    }

    case 'value_collection': {
      const target = challenge.gp
      const text = target !== undefined ? `Collect ${formatGp(target)}` : ''
      const source = challenge.source ? ` from ${challenge.source}` : ''
      const lines = text ? [{ text: `${text}${source}` }] : []

      let summary: ChallengeRequirement['summary']
      if (progress && challenge.source !== undefined && target !== undefined) {
        summary = { obtained: progress[challenge.source.toLowerCase()] ?? 0, needed: target }
      }
      return { clueLabel, heading: 'Requires', lines, summary }
    }

    case 'value': {
      const reward = challenge.clue?.reward
      const range = formatGpRange(
        reward?.min_gp ?? challenge.minGp,
        reward?.max_gp ?? challenge.maxGp,
      )
      const source = challenge.source ? ` from ${challenge.source}` : ''
      return { clueLabel, heading: 'Requires', lines: range ? [{ text: `${range}${source}` }] : [] }
    }

    case 'kc': {
      const source = challenge.source ? ` ${challenge.source}` : ''
      return {
        clueLabel,
        heading: 'Requires',
        lines: [{ text: `${challenge.count ?? '?'}x${source}` }],
      }
    }
  }
}
