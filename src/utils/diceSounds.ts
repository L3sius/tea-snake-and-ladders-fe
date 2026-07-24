export interface DiceSoundVariant {
  src: string
  weight: number
}

export const DICE_SOUND_VARIANTS: DiceSoundVariant[] = [
  { src: '/sounds/dice_roll_common_default.mp3', weight: 80 },
  { src: '/sounds/dice_roll_rare_dying.wav', weight: 5 },
  { src: '/sounds/dice_roll_rare_voice_1.ogg', weight: 5 },
  { src: '/sounds/dice_roll_rare_voice_2.ogg', weight: 5 },
  { src: '/sounds/dice_roll_rare_voice_3.ogg', weight: 5 },
]

const DICE_SOUND_SPECIAL_ONE = '/sounds/dice_roll_special_one.ogg'

export function pickDiceSound(roll: number): string {
  if (roll === 1) return DICE_SOUND_SPECIAL_ONE

  const total = DICE_SOUND_VARIANTS.reduce((sum, v) => sum + v.weight, 0)
  let pick = Math.random() * total
  for (const variant of DICE_SOUND_VARIANTS) {
    if (pick < variant.weight) return variant.src
    pick -= variant.weight
  }
  return DICE_SOUND_VARIANTS[0]!.src
}
