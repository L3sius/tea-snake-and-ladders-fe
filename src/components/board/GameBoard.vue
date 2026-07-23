<script setup lang="ts">
import { computed, ref } from 'vue'
import BoardTile from './BoardTile.vue'
import TeamToken from './TeamToken.vue'
import TileModal from './TileModal.vue'
import DiceRoll from '@/components/dice/DiceRoll.vue'
import {
  boardConfig,
  getTilePosition,
  getTileSvgCenter,
  getTileGridCenter,
} from '@/data/boardConfig'
import { buildSnakeRibbon } from '@/utils/snakeCurve'
import { buildLadderShape, type Segment } from '@/utils/ladderShape'
import { getSnakeColor, type SnakeColorVariant } from '@/utils/snakeColors'
import { gameStore, SPECIAL_TRANSITION_MS } from '@/stores/gameStore'
import type { Tile, Team } from '@/types'

const selectedTile = ref<Tile | null>(null)
const activeDiceRoll = computed(() => gameStore.state.activeDiceRoll)
const teams = computed(() => gameStore.state.teams)
const tiles = computed(() => gameStore.state.tiles)

function isTeamTileCompleted(team: Team): boolean {
  return gameStore.getTeamProgressOnTile(team.id, team.position)?.isCompleted ?? false
}

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

const TOKEN_SIZE_FRACTION = 0.62
const TOKEN_SIZE_PERCENT = (100 / boardConfig.columns) * TOKEN_SIZE_FRACTION

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

interface SnakeBody {
  from: number
  to: number
  d: string
  gradientId: string
  patternId: string
  head: { x: number; y: number }
  tail: { x: number; y: number }
  headAngleDeg: number
  patternAngleDeg: number
  color: SnakeColorVariant
}

function toPoint(tileId: number) {
  const { cx, cy } = getTileGridCenter(tileId)
  return { x: cx, y: cy }
}

const CORNER_OFFSET = 0.3
const CORNER_DIRECTIONS = [
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
]

function toCornerPoint(tileId: number, seed: number) {
  const center = toPoint(tileId)
  const dir = CORNER_DIRECTIONS[seed % CORNER_DIRECTIONS.length]!
  return { x: center.x + dir.x * CORNER_OFFSET, y: center.y + dir.y * CORNER_OFFSET }
}

const PATTERN_IMAGE_GRAIN_OFFSET_DEG = 0

const snakeBodies = computed<SnakeBody[]>(() =>
  gameStore.state.snakes.map((snake) => {
    const head = toPoint(snake.from)
    const tail = toCornerPoint(snake.to, snake.to)
    const ribbon = buildSnakeRibbon(head, tail, snake.from)
    const angleDeg = (Math.atan2(tail.y - head.y, tail.x - head.x) * 180) / Math.PI
    const color = getSnakeColor(snake.from)
    return {
      from: snake.from,
      to: snake.to,
      d: ribbon.d,
      gradientId: `snake-gradient-${snake.from}`,
      patternId: `snake-pattern-${snake.from}`,
      head,
      tail,
      headAngleDeg: ribbon.headAngleDeg,
      patternAngleDeg: angleDeg - PATTERN_IMAGE_GRAIN_OFFSET_DEG,
      color,
    }
  }),
)

const SNAKE_HEAD_SIZE = 0.7
const SNAKE_HEAD_BASE_ANGLE_DEG = 0

function snakeHeadTransform(snake: SnakeBody): string {
  const angle = snake.headAngleDeg - SNAKE_HEAD_BASE_ANGLE_DEG
  const half = SNAKE_HEAD_SIZE / 2
  return `translate(${snake.head.x} ${snake.head.y}) rotate(${angle}) translate(${-half} ${-half})`
}

interface LadderBody {
  from: number
  to: number
  rails: [Segment, Segment]
  rungs: Segment[]
  angleDeg: number
  patternId: string
  head: { x: number; y: number }
}

function toFacingCornerPoint(tileId: number, towardX: number, towardY: number) {
  const center = toPoint(tileId)
  const dirX = towardX >= 0 ? 1 : -1
  const dirY = towardY >= 0 ? 1 : -1
  return { x: center.x + dirX * CORNER_OFFSET, y: center.y + dirY * CORNER_OFFSET }
}

const ladderBodies = computed<LadderBody[]>(() =>
  gameStore.state.ladders.map((ladder) => {
    const fromCenter = toPoint(ladder.from)
    const toCenter = toPoint(ladder.to)
    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y
    const head = toFacingCornerPoint(ladder.from, dx, dy)
    const tail = toFacingCornerPoint(ladder.to, -dx, -dy)
    const shape = buildLadderShape(head, tail)
    return {
      from: ladder.from,
      to: ladder.to,
      rails: shape.rails,
      rungs: shape.rungs,
      angleDeg: shape.angleDeg,
      patternId: `ladder-pattern-${ladder.from}`,
      head,
    }
  }),
)

const LADDER_FEET_WIDTH = 0.6
const LADDER_FEET_HEIGHT = LADDER_FEET_WIDTH / (1453 / 960)
const LADDER_FEET_BASE_ANGLE_DEG = -90
const LADDER_FEET_SIDE_OFFSET = -0.03

function ladderFeetTransform(ladder: LadderBody): string {
  const angle = ladder.angleDeg - LADDER_FEET_BASE_ANGLE_DEG
  const halfW = LADDER_FEET_WIDTH / 2
  const halfH = LADDER_FEET_HEIGHT / 2
  return `translate(${ladder.head.x} ${ladder.head.y}) rotate(${angle}) translate(${-halfW + LADDER_FEET_SIDE_OFFSET} ${-halfH})`
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

      <div class="token-overlay" aria-hidden="true">
        <div
          v-for="team in teams"
          :key="team.id"
          class="token-overlay__token"
          :style="tokenStyle(team)"
        >
          <TeamToken
            :team="team"
            size="sm"
            :completed="isTeamTileCompleted(team)"
            :style="{ width: '100%', height: '100%' }"
          />
        </div>
      </div>

      <svg
        class="board-overlay"
        :viewBox="`0 0 ${boardConfig.columns} ${boardConfig.rows}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            v-for="snake in snakeBodies"
            :id="snake.gradientId"
            :key="`grad-${snake.from}`"
            gradientUnits="userSpaceOnUse"
            :x1="snake.head.x"
            :y1="snake.head.y"
            :x2="snake.tail.x"
            :y2="snake.tail.y"
          >
            <stop offset="0%" :stop-color="snake.color.gradientStart" />
            <stop offset="100%" :stop-color="snake.color.gradientEnd" />
          </linearGradient>

          <pattern
            v-for="snake in snakeBodies"
            :id="snake.patternId"
            :key="`pattern-${snake.from}`"
            patternUnits="userSpaceOnUse"
            width="0.35"
            height="0.35"
            :patternTransform="`rotate(${snake.patternAngleDeg})`"
          >
            <image :href="snake.color.patternHref" x="0" y="0" width="0.35" height="0.35" />
          </pattern>

          <pattern
            v-for="ladder in ladderBodies"
            :id="ladder.patternId"
            :key="`lpattern-${ladder.from}`"
            patternUnits="userSpaceOnUse"
            width="0.25"
            height="0.167"
            :patternTransform="`rotate(${ladder.angleDeg})`"
          >
            <image href="/images/ladder_pattern.png" x="0" y="0" width="0.25" height="0.167" />
          </pattern>
        </defs>

        <g v-for="ladder in ladderBodies" :key="`ladder-${ladder.from}`" class="ladder">
          <line
            v-for="(rail, i) in ladder.rails"
            :key="`rail-${i}`"
            :x1="rail.from.x"
            :y1="rail.from.y"
            :x2="rail.to.x"
            :y2="rail.to.y"
            class="ladder__rail"
            :style="{ stroke: `url(#${ladder.patternId})` }"
          />
          <line
            v-for="(rung, i) in ladder.rungs"
            :key="`rung-${i}`"
            :x1="rung.from.x"
            :y1="rung.from.y"
            :x2="rung.to.x"
            :y2="rung.to.y"
            class="ladder__rung"
            :style="{ stroke: `url(#${ladder.patternId})` }"
          />
          <image
            href="/images/nick_feet.png"
            :width="LADDER_FEET_WIDTH"
            :height="LADDER_FEET_HEIGHT"
            :transform="ladderFeetTransform(ladder)"
            class="ladder__feet"
          />
        </g>

        <g v-for="snake in snakeBodies" :key="`snake-${snake.from}`" class="snake">
          <path
            :d="snake.d"
            class="snake__ribbon"
            :style="{ fill: `url(#${snake.patternId})`, stroke: `url(#${snake.gradientId})` }"
          />
          <image
            :href="snake.color.headHref"
            :width="SNAKE_HEAD_SIZE"
            :height="SNAKE_HEAD_SIZE"
            :transform="snakeHeadTransform(snake)"
            class="snake__head"
          />
        </g>
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

.snake,
.ladder {
  opacity: 0.4;
  transition: opacity var(--transition-fast);
}

.snake:hover,
.ladder:hover {
  opacity: 1;
}

.ladder__rail,
.ladder__rung {
  pointer-events: stroke;
}

.snake__head,
.ladder__feet {
  pointer-events: auto;
}

.ladder__rail {
  stroke-width: 0.08;
  stroke-linecap: round;
}

.ladder__rung {
  stroke-width: 0.05;
  stroke-linecap: round;
}

.snake__ribbon {
  stroke-width: 0.022;
  stroke-linejoin: round;
  pointer-events: auto;
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
