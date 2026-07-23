<script setup lang="ts">
import { computed } from 'vue'
import type { Tile, Team } from '@/types'

const props = defineProps<{
  tile: Tile
  teamsOnTile: Team[]
}>()

const emit = defineEmits<{
  click: [tile: Tile]
}>()

const tierClass = computed(() => `tier-${props.tile.tier}`)
const isAvailable = computed(() => !!(props.tile.name || props.tile.description))

function handleClick() {
  if (!isAvailable.value) return
  emit('click', props.tile)
}
</script>

<template>
  <div
    class="board-tile"
    :class="[
      tierClass,
      { 'board-tile--occupied': teamsOnTile.length > 0, 'board-tile--unavailable': !isAvailable },
    ]"
    :role="isAvailable ? 'button' : undefined"
    :tabindex="isAvailable ? 0 : -1"
    :aria-label="isAvailable ? `Tile ${tile.id}: ${tile.name}` : `Tile ${tile.id}`"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <span class="board-tile__number">{{ tile.id }}</span>
    <img
      v-if="tile.image"
      :src="`/images/tiles/${tile.image}`"
      :alt="tile.name"
      class="board-tile__image"
    />
  </div>
</template>

<style scoped>
.board-tile {
  position: relative;
  background: var(--tile-bg, var(--osrs-panel));
  border: 1px solid var(--tile-border, var(--osrs-border));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 3px;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
  overflow: hidden;
  aspect-ratio: 1;
}

.board-tile:hover,
.board-tile:focus-visible {
  background: var(--osrs-panel-hover);
  border-color: var(--osrs-border-light);
  outline: none;
  z-index: 1;
}

.board-tile--occupied {
  border-color: var(--osrs-border-gold);
}

.board-tile--unavailable {
  cursor: default;
}

.board-tile--unavailable:hover,
.board-tile--unavailable:focus-visible {
  background: var(--tile-bg, var(--osrs-panel));
  border-color: var(--tile-border, var(--osrs-border));
}

.board-tile__number {
  font-family: var(--font-display);
  font-size: 0.45rem;
  color: var(--tile-text, var(--osrs-text-muted));
  line-height: 1;
  user-select: none;
  position: relative;
  z-index: 1;
}

.board-tile__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
}
</style>
