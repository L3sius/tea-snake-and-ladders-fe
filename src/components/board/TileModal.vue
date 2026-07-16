<script setup lang="ts">
import { computed } from 'vue'
import type { Tile, Team } from '@/types'
import { gameStore } from '@/stores/gameStore'
import TeamToken from './TeamToken.vue'

const props = defineProps<{
  tile: Tile | null
}>()

const emit = defineEmits<{
  close: []
}>()

const tile = computed(() => props.tile)

const tierLabel: Record<1 | 2 | 3, string> = {
  1: 'Tier 1 — Easy',
  2: 'Tier 2 — Medium',
  3: 'Tier 3 — Hard',
}

// The snake tiles' "image" is just a generic board-tile background filler,
// not an actual reward — showing it in the modal would be misleading.
const showImage = computed(
  () => !!tile.value?.image && !tile.value.image.endsWith('/background.png'),
)

const teamsOnTile = computed<Team[]>(() => {
  if (!tile.value) return []
  return gameStore.state.teams.filter((t) => t.position === tile.value!.id)
})

function getProgress(team: Team): { collected: number; required: number } {
  if (!tile.value) return { collected: 0, required: 1 }
  const progress = gameStore.getTeamProgressOnTile(team.id, tile.value.id)
  return {
    collected: progress?.dropsCollected ?? 0,
    required: tile.value.requiredDrops ?? 1,
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
              <img
                v-if="showImage"
                :src="`/images/tiles/${tile.image}`"
                :alt="tile.name"
                class="modal__image"
              />
              <p class="modal__description">{{ tile.description }}</p>
            </div>

            <div v-if="(tile.requiredDrops ?? 1) > 1" class="modal__drops-info">
              Requires <strong>{{ tile.requiredDrops }} drops</strong>
            </div>

            <div v-if="teamsOnTile.length > 0" class="modal__teams">
              <h3 class="modal__section-title">Teams on this tile</h3>
              <div v-for="team in teamsOnTile" :key="team.id" class="modal__team-row">
                <TeamToken :team="team" size="md" />
                <div class="modal__team-info">
                  <span class="modal__team-name">{{ team.name }}</span>
                  <div class="modal__progress-row">
                    <div class="modal__progress-bar-wrap">
                      <div
                        class="modal__progress-bar"
                        :style="{
                          width: `${(getProgress(team).collected / getProgress(team).required) * 100}%`,
                          borderColor: team.color,
                        }"
                      />
                    </div>
                    <span class="modal__progress-label">
                      {{ getProgress(team).collected }} / {{ getProgress(team).required }}
                    </span>
                  </div>
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
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

.modal__header {
  padding: 1rem;
  border-bottom: 1px solid var(--tile-border, var(--osrs-border));
  background: var(--tile-bg, var(--osrs-panel-light));
}

.modal__header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.modal__tier-badge {
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--tile-text, var(--osrs-text-muted));
}

.modal__close {
  background: none;
  border: 1px solid var(--osrs-border);
  color: var(--osrs-text-muted);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
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
  font-size: 0.7rem;
  color: var(--osrs-gold);
  line-height: 1.4;
}

.modal__tile-id {
  color: var(--osrs-text-muted);
  margin-right: 0.5rem;
}

.modal__skill {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: var(--tile-text, var(--osrs-text-muted));
}

.modal__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal__task {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.modal__image {
  flex-shrink: 0;
  width: 210px;
  height: 210px;
  object-fit: contain;
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  background: var(--osrs-bg);
  padding: 8px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.modal__description {
  flex: 1;
  font-size: 0.9rem;
  color: var(--osrs-text);
  line-height: 1.6;
  align-self: center;
}

/* The bigger image needs more room than it can share with the description
 * text on a narrow phone screen — stack them instead of squeezing both
 * into one row. */
@media (max-width: 480px) {
  .modal__task {
    flex-direction: column;
    align-items: center;
  }

  .modal__description {
    align-self: stretch;
  }
}

.modal__drops-info {
  font-size: 0.85rem;
  color: var(--osrs-gold);
  padding: 0.5rem;
  background: var(--osrs-panel-light);
  border-left: 3px solid var(--osrs-border-gold);
}

.modal__section-title {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text-muted);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.modal__teams {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal__team-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
}

.modal__team-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.modal__team-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--osrs-text-bright);
}

.modal__progress-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal__progress-bar-wrap {
  flex: 1;
  height: 12px;
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
  font-size: 0.45rem;
  color: var(--osrs-text-muted);
  white-space: nowrap;
}

.modal__no-teams {
  font-size: 0.85rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

/* Transition */
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
