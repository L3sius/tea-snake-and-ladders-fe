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

// Token size as a fraction of one tile's width — relative to the board, not
// a fixed px, so it stays proportionate whether the board renders small
// (mobile) or large (desktop, now that it has no max-width cap).
const TOKEN_SIZE_FRACTION = 0.62
const TOKEN_SIZE_PERCENT = (100 / boardConfig.columns) * TOKEN_SIZE_FRACTION

// Teams sharing a tile line up in a row, heavily overlapping — only a
// sliver of each token peeks out from behind the next — instead of being
// pinned to fixed grid slots. Also fixes a bug where offsets were keyed off
// each team's position in the *global* team list rather than its position
// among the teams actually sharing that tile.
const TOKEN_OVERLAP_STEP = 0.14

function tokenStyle(team: Team) {
  const pos = gameStore.state.displayedPositions[team.id] ?? team.position
  const { cx, cy } = getTileSvgCenter(pos)
  const tileTeams = teamsByTile.value.get(pos) ?? [team]
  const indexInTile = tileTeams.findIndex((t) => t.id === team.id)
  const centeredIndex = indexInTile - (tileTeams.length - 1) / 2
  const offsetXPercent = centeredIndex * TOKEN_OVERLAP_STEP * 100
  const isSpecial = !!gameStore.state.specialMoving[team.id]
  return {
    left: `${cx}%`,
    top: `${cy}%`,
    width: `${TOKEN_SIZE_PERCENT}%`,
    height: `${TOKEN_SIZE_PERCENT}%`,
    transform: `translate(calc(-50% + ${offsetXPercent}%), -50%)`,
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
          v-for="team in teams"
          :key="team.id"
          class="token-overlay__token"
          :style="tokenStyle(team)"
        >
          <TeamToken :team="team" size="sm" :style="{ width: '100%', height: '100%' }" />
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
