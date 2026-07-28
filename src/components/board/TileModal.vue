<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Tile, Team } from '@/types'
import { gameStore } from '@/stores/gameStore'
import { getSnakeColor } from '@/utils/snakeColors'
import { formatDuration } from '@/utils/formatDuration'
import { formatChallengeRequirement, type ChallengeRequirement } from '@/utils/formatChallenge'
import TeamToken from './TeamToken.vue'

const props = defineProps<{
  tile: Tile | null
}>()

const emit = defineEmits<{
  close: []
}>()

const tile = computed(() => props.tile)

const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => clearInterval(tickInterval))

function timeOnTile(team: Team): string | null {
  if (!tile.value) return null
  const arrival = gameStore.getTeamArrivalTime(team.id, tile.value.id)
  if (!arrival) return null
  return formatDuration(now.value - arrival.getTime())
}

const tierLabel: Record<1 | 2 | 3, string> = {
  1: 'Tier 1 — Easy',
  2: 'Tier 2 — Medium',
  3: 'Tier 3 — Hard',
}

const snakeColor = computed(() => {
  if (!tile.value) return null
  const snake = gameStore.state.snakes.find((s) => s.from === tile.value!.id)
  return snake ? getSnakeColor(snake.from) : null
})

const showImage = computed(
  () => !!tile.value?.image && !tile.value.image.endsWith('/background.png'),
)

const requirement = computed(() =>
  tile.value?.challengeData ? formatChallengeRequirement(tile.value.challengeData) : null,
)

const REQUIREMENT_COLLAPSE_THRESHOLD = 8
const requirementExpanded = ref(false)
watch(
  () => tile.value?.id,
  () => {
    requirementExpanded.value = false
  },
)

const visibleRequirementLines = computed(() => {
  if (!requirement.value) return []
  if (
    requirementExpanded.value ||
    requirement.value.lines.length <= REQUIREMENT_COLLAPSE_THRESHOLD
  ) {
    return requirement.value.lines
  }
  return requirement.value.lines.slice(0, REQUIREMENT_COLLAPSE_THRESHOLD)
})

const PROGRESS_CHECKLIST_TYPES = new Set([
  'item',
  'collection_all',
  'collection_any',
  'value_collection',
])

function teamChecklist(team: Team): ChallengeRequirement | null {
  const challenge = tile.value?.challengeData
  if (!challenge || !PROGRESS_CHECKLIST_TYPES.has(challenge.type)) return null

  const progress = gameStore.getTeamProgressOnTile(team.id, tile.value!.id)?.progress
  if (!progress) return null

  return formatChallengeRequirement(challenge, progress)
}

const teamsOnTile = computed<Team[]>(() => {
  if (!tile.value) return []
  return gameStore.state.teams.filter((t) => t.position === tile.value!.id)
})

function getProgress(team: Team): { percentage: number; isCompleted: boolean } {
  if (!tile.value) return { percentage: 0, isCompleted: false }
  const progress = gameStore.getTeamProgressOnTile(team.id, tile.value.id)
  return {
    percentage: progress?.completionPercentage ?? 0,
    isCompleted: progress?.isCompleted ?? false,
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="tile" class="modal-backdrop" @click="handleBackdropClick">
        <div class="modal" role="dialog" :aria-label="`Tile ${tile.id} details`">
          <header class="modal__header" :class="`tier-${tile.tier}`">
            <div class="modal__header-top">
              <span class="modal__tier-badge">{{ tierLabel[tile.tier] }}</span>
              <button class="modal__close" aria-label="Close" @click="emit('close')">✕</button>
            </div>
            <h2 class="modal__title">
              <span class="modal__tile-id">#{{ tile.id }}</span>
              {{ tile.name }}
            </h2>
            <p v-if="tile.skill" class="modal__skill">{{ tile.skill }}</p>
          </header>

          <div class="modal__body">
            <div class="modal__task">
              <div v-if="snakeColor" class="modal__snake-visual">
                <img :src="`/images/tiles/${tile.image}`" alt="" class="modal__image" />
                <img :src="snakeColor.headHref" alt="" class="modal__snake-head" />
              </div>
              <img
                v-else-if="showImage"
                :src="`/images/tiles/${tile.image}`"
                :alt="tile.name"
                class="modal__image"
              />
              <p class="modal__description">{{ tile.description }}</p>
            </div>

            <div v-if="requirement" class="modal__requirement">
              <span v-if="requirement.clueLabel" class="modal__requirement-clue">
                {{ requirement.clueLabel }}
              </span>
              <p
                v-if="requirement.lines.length === 1"
                class="modal__requirement-heading modal__requirement-heading--inline"
              >
                {{ requirement.heading }}:
                <span class="modal__requirement-value">{{ requirement.lines[0]!.text }}</span>
              </p>

              <template v-else-if="requirement.lines.length > 1">
                <p class="modal__requirement-heading">{{ requirement.heading }}:</p>
                <ul class="modal__requirement-list">
                  <li v-for="(line, index) in visibleRequirementLines" :key="index">
                    {{ line.text }}
                  </li>
                </ul>
                <button
                  v-if="requirement.lines.length > REQUIREMENT_COLLAPSE_THRESHOLD"
                  class="modal__requirement-toggle"
                  @click="requirementExpanded = !requirementExpanded"
                >
                  {{ requirementExpanded ? 'Show less' : `Show all (${requirement.lines.length})` }}
                </button>
              </template>
            </div>

            <div v-if="teamsOnTile.length > 0" class="modal__teams">
              <h3 class="modal__section-title">Teams on this tile</h3>
              <div v-for="team in teamsOnTile" :key="team.id" class="modal__team-row">
                <TeamToken :team="team" size="lg" />
                <div class="modal__team-info">
                  <span class="modal__team-name">{{ team.name }}</span>
                  <span v-if="timeOnTile(team)" class="modal__time-on-tile">
                    On this tile for {{ timeOnTile(team) }}
                  </span>
                  <div class="modal__progress-row">
                    <div class="modal__progress-bar-wrap">
                      <div
                        class="modal__progress-bar"
                        :style="{
                          width: `${getProgress(team).percentage}%`,
                          color: team.color,
                        }"
                      />
                    </div>
                    <span class="modal__progress-label">
                      {{
                        getProgress(team).isCompleted
                          ? 'Completed'
                          : `${getProgress(team).percentage}%`
                      }}
                    </span>
                  </div>

                  <template
                    v-for="checklist in [teamChecklist(team)]"
                    :key="`${team.id}-checklist`"
                  >
                    <div
                      v-if="
                        checklist &&
                        tile.challengeData?.type === 'value_collection' &&
                        checklist.summary
                      "
                      class="modal__checklist-bar"
                    >
                      <div class="modal__progress-bar-wrap">
                        <div
                          class="modal__progress-bar"
                          :style="{
                            width: `${Math.min(100, (checklist.summary.obtained / checklist.summary.needed) * 100)}%`,
                            color: team.color,
                          }"
                        />
                      </div>
                      <span class="modal__progress-label">
                        {{ checklist.summary.obtained.toLocaleString() }} /
                        {{ checklist.summary.needed.toLocaleString() }} gp
                      </span>
                    </div>

                    <div v-else-if="checklist" class="modal__checklist">
                      <span v-if="checklist.summary" class="modal__checklist-summary">
                        {{ checklist.summary.obtained }}/{{ checklist.summary.needed }} obtained
                      </span>

                      <template v-if="tile.challengeData?.type === 'collection_any'">
                        <div
                          v-for="(line, index) in checklist.obtainedLines"
                          :key="index"
                          class="modal__checklist-line modal__checklist-line--done"
                        >
                          <span class="modal__checklist-text">{{ line.text }}</span>
                        </div>
                        <p
                          v-if="!checklist.obtainedLines || checklist.obtainedLines.length === 0"
                          class="modal__checklist-empty"
                        >
                          Nothing obtained yet
                        </p>
                      </template>

                      <template v-else>
                        <div
                          v-for="(line, index) in checklist.lines"
                          :key="index"
                          class="modal__checklist-line"
                          :class="{ 'modal__checklist-line--done': line.satisfied }"
                        >
                          <span class="modal__checklist-check">{{
                            line.satisfied ? '✓' : '○'
                          }}</span>
                          <span class="modal__checklist-text">{{ line.text }}</span>
                        </div>
                      </template>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <p v-else class="modal__no-teams">No teams currently on this tile.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  background: var(--osrs-panel);
  border: 2px solid var(--osrs-border-light);
  border-radius: var(--border-radius);
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

.modal__header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--tile-border, var(--osrs-border));
  background: var(--tile-bg, var(--osrs-panel-light));
}

.modal__header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal__tier-badge {
  font-family: var(--font-display);
  font-size: 0.65rem;
  color: var(--tile-text, var(--osrs-text-muted));
}

.modal__close {
  background: none;
  border: 1px solid var(--osrs-border);
  color: var(--osrs-text-muted);
  cursor: pointer;
  padding: 0.3rem 0.7rem;
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.modal__close:hover {
  color: var(--osrs-text-bright);
  border-color: var(--osrs-border-light);
}

.modal__title {
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: var(--osrs-gold);
  line-height: 1.4;
}

.modal__tile-id {
  color: var(--osrs-text-muted);
  margin-right: 0.5rem;
}

.modal__skill {
  margin-top: 0.35rem;
  font-size: 1rem;
  color: var(--tile-text, var(--osrs-text-muted));
}

.modal__body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal__task {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.modal__image {
  flex-shrink: 0;
  width: 300px;
  height: 300px;
  object-fit: contain;
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  background: var(--osrs-bg);
  padding: 10px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.modal__snake-visual {
  position: relative;
  flex-shrink: 0;
  width: 300px;
  height: 300px;
}

.modal__snake-visual .modal__image {
  padding: 0;
}

.modal__snake-head {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 55%;
  height: 55%;
  object-fit: contain;
}

.modal__description {
  flex: 1;
  font-size: 1.1rem;
  color: var(--osrs-text);
  line-height: 1.6;
  align-self: center;
}

@media (max-width: 680px) {
  .modal__task {
    flex-direction: column;
    align-items: center;
  }

  .modal__description {
    align-self: stretch;
  }
}

.modal__requirement {
  padding: 0.65rem 0.75rem;
  background: var(--osrs-panel-light);
  border-left: 3px solid var(--osrs-border-gold);
}

.modal__requirement-clue {
  display: inline-block;
  font-family: var(--font-display);
  font-size: 0.6rem;
  color: var(--osrs-gold);
  text-transform: uppercase;
  margin-bottom: 0.4rem;
}

.modal__requirement-heading {
  font-size: 1rem;
  color: var(--osrs-gold);
  margin-bottom: 0.3rem;
}

.modal__requirement-heading--inline {
  margin-bottom: 0;
}

.modal__requirement-value {
  color: var(--osrs-text);
}

.modal__requirement-list {
  list-style: disc;
  padding-left: 1.2rem;
  font-size: 0.95rem;
  color: var(--osrs-text);
  line-height: 1.5;
}

.modal__requirement-toggle {
  margin-top: 0.5rem;
  background: none;
  border: none;
  padding: 0;
  font-size: 0.85rem;
  color: var(--osrs-gold);
  text-decoration: underline;
  cursor: pointer;
}

.modal__requirement-toggle:hover {
  color: var(--osrs-text-bright);
}

.modal__section-title {
  font-family: var(--font-display);
  font-size: 0.7rem;
  color: var(--osrs-text-muted);
  margin-bottom: 0.6rem;
  text-transform: uppercase;
}

.modal__teams {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.modal__team-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
}

.modal__team-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.modal__team-name {
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--osrs-text-bright);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal__time-on-tile {
  font-size: 0.85rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

.modal__progress-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.modal__progress-bar-wrap {
  flex: 1;
  height: 16px;
  background: var(--osrs-bg);
  border: 1px solid var(--osrs-border);
  border-radius: 1px;
  overflow: hidden;
}

.modal__progress-bar {
  height: 100%;
  background: currentColor;
  border-right: 2px solid;
  transition: width var(--transition-normal);
  min-width: 2px;
}

.modal__progress-label {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text-muted);
  white-space: nowrap;
}

.modal__no-teams {
  font-size: 1rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

.modal__checklist-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.modal__checklist {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.modal__checklist-summary {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text-muted);
  margin-bottom: 0.15rem;
}

.modal__checklist-empty {
  font-size: 0.85rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

.modal__checklist-line {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: var(--osrs-text-muted);
}

.modal__checklist-line--done {
  color: var(--osrs-text);
}

.modal__checklist-check {
  flex-shrink: 0;
  color: var(--osrs-text-muted);
}

.modal__checklist-line--done .modal__checklist-check {
  color: var(--osrs-green);
}

.modal__checklist-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(-16px) scale(0.97);
}
</style>
