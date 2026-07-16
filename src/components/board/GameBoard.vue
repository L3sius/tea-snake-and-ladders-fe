<script setup lang="ts">
import { computed, ref } from 'vue'
import BoardTile from './BoardTile.vue'
import TeamToken from './TeamToken.vue'
import TileModal from './TileModal.vue'
import DiceRoll from '@/components/dice/DiceRoll.vue'
import { tiles } from '@/data/tiles'
import { boardConfig, getTilePosition, getTileSvgCenter } from '@/data/boardConfig'
import { gameStore, SPECIAL_TRANSITION_MS } from '@/stores/gameStore'
import type { Tile, Team } from '@/types'

const selectedTile = ref<Tile | null>(null)
const activeDiceRoll = computed(() => gameStore.state.activeDiceRoll)
const teams = computed(() => gameStore.state.teams)

// Map<tileId, Team[]> — O(1) per tile lookup, recomputes only when positions change
const teamsByTile = computed(() => {
  const map = new Map<number, Team[]>()
  for (const team of gameStore.state.teams) {
    const pos = gameStore.state.displayedPositions[team.id] ?? team.position
    const bucket = map.get(pos)
    if (bucket) bucket.push(team)
    else map.set(pos, [team])
  }
  return map
})

// 3×2 grid offsets — supports up to 6 teams on the same tile without overlap
const TOKEN_OFFSETS = [
  { x: -13, y: -9 },
  { x: 0, y: -9 },
  { x: 13, y: -9 },
  { x: -13, y: 9 },
  { x: 0, y: 9 },
  { x: 13, y: 9 },
]

function tokenStyle(team: Team, teamIndex: number) {
  const pos = gameStore.state.displayedPositions[team.id] ?? team.position
  const { cx, cy } = getTileSvgCenter(pos)
  const offset = TOKEN_OFFSETS[teamIndex % TOKEN_OFFSETS.length]!
  const isSpecial = !!gameStore.state.specialMoving[team.id]
  return {
    left: `${cx}%`,
    top: `${cy}%`,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    transition: isSpecial
      ? `left ${SPECIAL_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1), top ${SPECIAL_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'left 0.22s ease, top 0.22s ease',
  }
}

function handleTileClick(tile: Tile) {
  selectedTile.value = tile
}

function closeModal() {
  selectedTile.value = null
}
</script>

<template>
  <div class="game-board-wrapper">
    <div
      class="game-board"
      :style="{
        '--cols': boardConfig.columns,
        '--rows': boardConfig.rows,
      }"
    >
      <BoardTile
        v-for="tile in tiles"
        :key="tile.id"
        :tile="tile"
        :teams-on-tile="teamsByTile.get(tile.id) ?? []"
        class="game-board__tile"
        :style="{
          gridColumn: getTilePosition(tile.id).col,
          gridRow: getTilePosition(tile.id).row,
        }"
        @click="handleTileClick"
      />

      <!-- Token overlay — absolutely positioned over the grid, z-index above SVG lines -->
      <div class="token-overlay" aria-hidden="true">
        <div
          v-for="(team, index) in teams"
          :key="team.id"
          class="token-overlay__token"
          :style="tokenStyle(team, index)"
        >
          <TeamToken :team="team" size="sm" />
        </div>
      </div>

      <svg
        class="board-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="board-ladder-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#8B4513" />
          </marker>
          <marker
            id="board-snake-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#27ae60" />
          </marker>
        </defs>

        <line
          v-for="ladder in boardConfig.ladders"
          :key="`ladder-${ladder.from}`"
          :x1="getTileSvgCenter(ladder.from).cx"
          :y1="getTileSvgCenter(ladder.from).cy"
          :x2="getTileSvgCenter(ladder.to).cx"
          :y2="getTileSvgCenter(ladder.to).cy"
          stroke="#8B4513"
          stroke-width="1.8"
          stroke-linecap="round"
          marker-end="url(#board-ladder-arrow)"
          opacity="0.2"
        />

        <line
          v-for="snake in boardConfig.snakes"
          :key="`snake-${snake.from}`"
          :x1="getTileSvgCenter(snake.from).cx"
          :y1="getTileSvgCenter(snake.from).cy"
          :x2="getTileSvgCenter(snake.to).cx"
          :y2="getTileSvgCenter(snake.to).cy"
          stroke="#27ae60"
          stroke-width="1.8"
          stroke-linecap="round"
          marker-end="url(#board-snake-arrow)"
          opacity="0.2"
        />
      </svg>
    </div>

    <Transition name="fade">
      <DiceRoll v-if="activeDiceRoll" :event="activeDiceRoll" />
    </Transition>

    <TileModal :tile="selectedTile" @close="closeModal" />
  </div>
</template>

<style scoped>
.game-board-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}

/* There's no navbar anymore — the only vertical chrome to account for is
 * BoardView's own padding (2rem, top+bottom). No fixed max-width cap here —
 * height and the column's own width already bound it to whatever actually
 * fits, so a cap on top of those only ever makes it smaller for no reason. */
.game-board {
  display: grid;
  grid-template-columns: repeat(var(--cols, 9), 1fr);
  grid-template-rows: repeat(var(--rows, 9), 1fr);
  width: min(calc(100vh - 2rem), 100%);
  aspect-ratio: 1;
  border: 2px solid var(--osrs-border-light);
  background: var(--osrs-bg-alt);
  position: relative;
}

/* BoardView has no padding on mobile, but the bottom tab bar still eats
 * into the viewport there. */
@media (max-width: 768px) {
  .game-board {
    width: min(calc(100vh - var(--bottom-tabbar-height)), 100%, 960px);
  }
}

.game-board__tile {
  z-index: 1;
}

.token-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}

.token-overlay__token {
  position: absolute;
  pointer-events: none;
}

.board-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
