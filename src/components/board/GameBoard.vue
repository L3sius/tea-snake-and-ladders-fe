<script setup lang="ts">
import { computed, ref } from 'vue'
import BoardTile from './BoardTile.vue'
import TeamToken from './TeamToken.vue'
import TileModal from './TileModal.vue'
import DiceRoll from '@/components/dice/DiceRoll.vue'
import { tiles } from '@/data/tiles'
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

// ── Snake bodies ──
// Coordinates are in grid units (the SVG's viewBox is `0 0 cols rows`), so
// this only ever needs computing once — the curve's own geometry never
// changes on resize, only the CSS scaling of the whole SVG does. The ribbon
// (fill shape, taper baked into its geometry) and head angle are both
// computed analytically in buildSnakeRibbon — synchronous, no rendered DOM
// element required, unlike the earlier getPointAtLength-based approach.
interface SnakeBody {
  from: number
  to: number
  d: string
  gradientId: string
  patternId: string
  head: { x: number; y: number }
  tail: { x: number; y: number }
  headAngleDeg: number
  // Overall head→tail angle (not the local curve tangent) — used to spin
  // the scale-texture pattern so its grain runs with the snake rather than
  // always sitting at its source image's default orientation.
  patternAngleDeg: number
  color: SnakeColorVariant
}

function toPoint(tileId: number) {
  const { cx, cy } = getTileGridCenter(tileId)
  return { x: cx, y: cy }
}

// A snake/ladder endpoint landing dead-center covers that tile's own
// artwork — nudging it toward a corner instead keeps the art visible while
// still clearly landing on that tile. Which corner is picked
// deterministically from the tile's own id, so it's stable across
// re-renders and varies a little between tiles instead of every endpoint
// sitting in the same relative spot. 0.3 (out of a max of 0.5 to the exact
// corner) stays safely inside the tile rather than crowding its edge.
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

// snake_pattern.png is currently an isotropic bump texture (no directional
// grain to align, unlike an earlier version of this asset), so there's
// nothing to correct for — kept as a named constant rather than removed so
// a future directional texture only needs this one value changed again.
const PATTERN_IMAGE_GRAIN_OFFSET_DEG = 0

const snakeBodies = computed<SnakeBody[]>(() =>
  boardConfig.snakes.map((snake) => {
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

const SNAKE_HEAD_SIZE = 0.7 // grid units — fits within one tile, no overlap
// The source art's default facing, in degrees, so the computed body tangent
// can be corrected to match it. 0 assumes the head faces along +X (right)
// when unrotated — adjust once the real art's default orientation is known.
const SNAKE_HEAD_BASE_ANGLE_DEG = 0

function snakeHeadTransform(snake: SnakeBody): string {
  const angle = snake.headAngleDeg - SNAKE_HEAD_BASE_ANGLE_DEG
  const half = SNAKE_HEAD_SIZE / 2
  return `translate(${snake.head.x} ${snake.head.y}) rotate(${angle}) translate(${-half} ${-half})`
}

// ── Ladder bodies ──
// A ladder is rigid and straight — its shape needs no per-render sampling
// or curve math, unlike a snake, so this is a plain synchronous transform
// of boardConfig.ladders.
interface LadderBody {
  from: number
  to: number
  rails: [Segment, Segment]
  rungs: Segment[]
  angleDeg: number
  patternId: string
  head: { x: number; y: number }
}

// Unlike a snake's tail (any corner reads fine, so it's picked from a
// per-tile seed), a ladder's two ends need to lean toward *each other* —
// otherwise a randomly-picked far corner makes the ladder look like it
// overshoots its own tile or points away from where it's actually headed.
// So each end always offsets toward whichever of its own corners faces the
// other end, never the opposite one.
function toFacingCornerPoint(tileId: number, towardX: number, towardY: number) {
  const center = toPoint(tileId)
  const dirX = towardX >= 0 ? 1 : -1
  const dirY = towardY >= 0 ? 1 : -1
  return { x: center.x + dirX * CORNER_OFFSET, y: center.y + dirY * CORNER_OFFSET }
}

const ladderBodies = computed<LadderBody[]>(() =>
  boardConfig.ladders.map((ladder) => {
    const fromCenter = toPoint(ladder.from)
    const toCenter = toPoint(ladder.to)
    const dx = toCenter.x - fromCenter.x
    const dy = toCenter.y - fromCenter.y
    // The feet image below is positioned from this same `head` point, so it
    // moves together with the rails rather than being left behind at the
    // old tile center.
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

const LADDER_FEET_WIDTH = 0.6 // grid units
// nick_feet.png is 1453x960px — keeping its aspect ratio so the feet don't
// look stretched.
const LADDER_FEET_HEIGHT = LADDER_FEET_WIDTH / (1453 / 960)
// The source photo's default facing, in degrees, so the ladder's incline
// angle can be corrected to match it — same idea as SNAKE_HEAD_BASE_ANGLE_DEG.
// -90 because the photo's feet face "up" (toes toward the top of the
// image) by default, and boardConfig.angleDeg for a straight-up ladder is
// -90 (SVG's Y axis points down, so "climbing up" is negative Y).
const LADDER_FEET_BASE_ANGLE_DEG = -90
// Nudges the feet sideways in the *image's own* frame (applied before the
// rotation below), so "left" stays relative to that ladder's own incline
// instead of the page's absolute left — the two feet in the photo aren't
// perfectly centered around its midline, so this re-centers them relative
// to the rails regardless of which way a given ladder is angled on screen.
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
        :viewBox="`0 0 ${boardConfig.columns} ${boardConfig.rows}`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <!-- One gradient per snake (exact head/tail coords, not a shared
               objectBoundingBox gradient) so the fade always runs true to
               that snake's actual direction regardless of orientation. -->
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

          <!-- Real scale texture (one of SNAKE_COLOR_VARIANTS' patternHref
               images per color), one pattern instance per snake so each can
               rotate independently to that snake's overall direction.
               patternUnits="userSpaceOnUse" ties the tile size to the same
               grid-unit coordinate space as everything else, so it doesn't
               need recalculating on resize either. Square tile (0.35x0.35)
               to match the source images' shared 1:1 aspect ratio
               (1254x1254px) so the bumps stay round instead of stretching
               into ovals. -->
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

          <!-- Real wood texture (ladder_pattern.png), one pattern instance
               per ladder so each can rotate to that ladder's own incline.
               Its grain already runs along the image's own width, matching
               atan2's "0° = +X" convention, so (unlike the snake pattern)
               no rotation offset correction is needed. Tile size keeps the
               source image's ~1.5 aspect ratio (612x408px). -->
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

        <!-- Ladders: two straight, parallel wood-textured rails (a rigid
             ladder shouldn't wiggle like a snake) connected by evenly-spaced
             rungs, plus a feet image at the bottom rotated to the ladder's
             incline. -->
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

        <!-- Snakes: a single filled ribbon shape whose width tapers
             continuously along its length (baked into the geometry itself
             in buildSnakeRibbon, not faked with layered strokes) — filled
             with the real scale texture, outlined with a thin head-to-tail
             gradient stroke for definition, plus a head image rotated to
             the curve's exact analytic tangent at that end. -->
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

/* Both share one opacity so a future adjustment only needs changing here,
 * not kept in sync across two separate rules. Hovering brings a snake or
 * ladder to full opacity so it can be inspected clearly — this only takes
 * effect on the body shapes below (and the head/feet images), since
 * .board-overlay itself is pointer-events: none (so clicks still reach the
 * tiles underneath); each shape re-enables pointer-events on just its own
 * painted area, not a bounding box, so hover follows the actual outline —
 * except the head/feet images, which are raster (no path to test against),
 * so their whole rectangle counts, same as hovering any small icon. */
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

/* The ribbon's taper is baked into its own geometry (see buildSnakeRibbon),
 * so this is just paint — pattern fill for the scale texture, a thin
 * gradient-stroked outline for definition against the board. */
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
