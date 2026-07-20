<script setup lang="ts">
import { computed } from 'vue'
import { gameStore } from '@/stores/gameStore'
import type { DiceRollEvent } from '@/types'

const props = defineProps<{
  event: DiceRollEvent
}>()

const team = computed(() => gameStore.state.teams.find((t) => t.id === props.event.teamId))

const faceDots: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 28],
    [72, 28],
    [28, 50],
    [72, 50],
    [28, 72],
    [72, 72],
  ],
}

// Standard opposite pairs: 1↔6, 2↔5, 3↔4
// CSS face position: front=1, back=6, right=3, left=4, top=2, bottom=5
const faces = [
  { cls: 'front', num: 1 },
  { cls: 'back', num: 6 },
  { cls: 'right', num: 3 },
  { cls: 'left', num: 4 },
  { cls: 'top', num: 2 },
  { cls: 'bottom', num: 5 },
]

const moveSummary = computed(() => {
  if (props.event.snakeOrLadder) {
    const { type, finalPosition } = props.event.snakeOrLadder
    return type === 'snake'
      ? `Snake! Slid down to ${finalPosition}`
      : `Ladder! Climbed up to ${finalPosition}`
  }
  return `Moved to tile ${props.event.toPosition}`
})
</script>

<template>
  <div class="dice-overlay">
    <div class="dice-roll-card">
      <div v-if="team" class="dice-roll-card__team">
        <span class="dice-roll-card__team-name">{{ team.name }}</span>
      </div>

      <div class="dice-scene">
        <div class="dice-cube" :class="`roll-to-${event.roll}`">
          <div v-for="face in faces" :key="face.cls" :class="`dice-face dice-face--${face.cls}`">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle
                v-for="([cx, cy], i) in faceDots[face.num]"
                :key="i"
                :cx="cx"
                :cy="cy"
                r="9"
                fill="#1b3320"
              />
            </svg>
          </div>
        </div>
      </div>

      <p class="dice-roll-card__summary" :class="event.snakeOrLadder?.type">
        {{ moveSummary }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.dice-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  pointer-events: none;
}

.dice-roll-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  background: var(--osrs-panel);
  border: 2px solid var(--osrs-border-gold);
  border-radius: var(--border-radius);
  padding: 1.5rem 2rem;
  box-shadow:
    0 0 40px rgba(39, 174, 96, 0.25),
    0 8px 32px rgba(0, 0, 0, 0.8);
  animation: card-pop 0.3s ease-out both;
}

.dice-roll-card__team {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.dice-roll-card__team-name {
  font-family: var(--font-display);
  font-size: 0.65rem;
  color: var(--osrs-gold);
}

/* ── 3-D cube ── */
.dice-scene {
  perspective: 480px;
  perspective-origin: 50% 45%;
  width: 110px;
  height: 110px;
}

.dice-cube {
  width: 110px;
  height: 110px;
  position: relative;
  transform-style: preserve-3d;
}

.dice-face {
  position: absolute;
  width: 110px;
  height: 110px;
  background: #f2fbe9;
  border-radius: 8px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.14);
}

.dice-face svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/*
 * Each face is pushed 55 px (half the cube side) outward along its own local Z.
 * Opposite-pair layout (standard dice): 1↔6  2↔5  3↔4
 *   front  = 1  →  translateZ(55px)
 *   back   = 6  →  rotateY(180deg)  translateZ(55px)
 *   right  = 3  →  rotateY(90deg)   translateZ(55px)   visible from the right
 *   left   = 4  →  rotateY(-90deg)  translateZ(55px)   visible from the left
 *   top    = 2  →  rotateX(90deg)   translateZ(55px)   visible from above
 *   bottom = 5  →  rotateX(-90deg)  translateZ(55px)   visible from below
 *
 * To reveal a face the CUBE rotates by the inverse of that face's transform:
 *   face 1 → rotateY(720deg)   (2 full turns, lands on front)
 *   face 2 → rotateX(630deg)   (720 − 90)
 *   face 3 → rotateY(630deg)   (720 − 90)
 *   face 4 → rotateY(810deg)   (720 + 90)
 *   face 5 → rotateX(810deg)   (720 + 90)
 *   face 6 → rotateY(900deg)   (720 + 180)
 */
.dice-face--front {
  transform: translateZ(55px);
}
.dice-face--back {
  transform: rotateY(180deg) translateZ(55px);
}
.dice-face--right {
  transform: rotateY(90deg) translateZ(55px);
}
.dice-face--left {
  transform: rotateY(-90deg) translateZ(55px);
}
.dice-face--top {
  transform: rotateX(90deg) translateZ(55px);
}
.dice-face--bottom {
  transform: rotateX(-90deg) translateZ(55px);
}

/* ── Roll animations ──
 * Only rotateX / rotateY — no rotateZ.
 * Faces 1, 3, 4, 6 roll horizontally (Y-axis).
 * Faces 2, 5       roll vertically   (X-axis).
 * A small secondary-axis wobble (≤ 10°) makes it feel physical.
 * animation-timing-function: ease-out gives fast start → gradual stop.
 */

.roll-to-1 {
  animation: roll-to-1 2.8s ease-out both;
}
.roll-to-2 {
  animation: roll-to-2 2.8s ease-out both;
}
.roll-to-3 {
  animation: roll-to-3 2.8s ease-out both;
}
.roll-to-4 {
  animation: roll-to-4 2.8s ease-out both;
}
.roll-to-5 {
  animation: roll-to-5 2.8s ease-out both;
}
.roll-to-6 {
  animation: roll-to-6 2.8s ease-out both;
}

/* Both axes move throughout — the die tumbles freely in 3D.
 * Final frame brings the correct face to front (no rotateZ anywhere).
 * End values: face1=X720 Y720, face2=X630 Y720, face3=X720 Y630,
 *             face4=X720 Y810, face5=X810 Y720, face6=X720 Y900     */

@keyframes roll-to-1 {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotateX(320deg) rotateY(220deg);
  }
  40% {
    transform: rotateX(580deg) rotateY(470deg);
  }
  60% {
    transform: rotateX(672deg) rotateY(590deg);
  }
  80% {
    transform: rotateX(708deg) rotateY(665deg);
  }
  100% {
    transform: rotateX(720deg) rotateY(720deg);
  }
}

@keyframes roll-to-2 {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotateX(260deg) rotateY(240deg);
  }
  40% {
    transform: rotateX(470deg) rotateY(490deg);
  }
  60% {
    transform: rotateX(560deg) rotateY(625deg);
  }
  80% {
    transform: rotateX(602deg) rotateY(692deg);
  }
  100% {
    transform: rotateX(630deg) rotateY(720deg);
  }
}

@keyframes roll-to-3 {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotateX(230deg) rotateY(215deg);
  }
  40% {
    transform: rotateX(490deg) rotateY(450deg);
  }
  60% {
    transform: rotateX(641deg) rotateY(558deg);
  }
  80% {
    transform: rotateX(702deg) rotateY(602deg);
  }
  100% {
    transform: rotateX(720deg) rotateY(630deg);
  }
}

@keyframes roll-to-4 {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotateX(250deg) rotateY(270deg);
  }
  40% {
    transform: rotateX(500deg) rotateY(540deg);
  }
  60% {
    transform: rotateX(645deg) rotateY(698deg);
  }
  80% {
    transform: rotateX(703deg) rotateY(764deg);
  }
  100% {
    transform: rotateX(720deg) rotateY(810deg);
  }
}

@keyframes roll-to-5 {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotateX(285deg) rotateY(235deg);
  }
  40% {
    transform: rotateX(550deg) rotateY(485deg);
  }
  60% {
    transform: rotateX(699deg) rotateY(620deg);
  }
  80% {
    transform: rotateX(769deg) rotateY(692deg);
  }
  100% {
    transform: rotateX(810deg) rotateY(720deg);
  }
}

@keyframes roll-to-6 {
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  20% {
    transform: rotateX(255deg) rotateY(300deg);
  }
  40% {
    transform: rotateX(510deg) rotateY(600deg);
  }
  60% {
    transform: rotateX(651deg) rotateY(762deg);
  }
  80% {
    transform: rotateX(703deg) rotateY(851deg);
  }
  100% {
    transform: rotateX(720deg) rotateY(900deg);
  }
}

.dice-roll-card__summary {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text);
  text-align: center;
  animation: summary-reveal 0.4s ease-out 2.8s both;
}

.dice-roll-card__summary.snake {
  color: var(--osrs-red);
}
.dice-roll-card__summary.ladder {
  color: var(--osrs-green);
}

@keyframes card-pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes summary-reveal {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
