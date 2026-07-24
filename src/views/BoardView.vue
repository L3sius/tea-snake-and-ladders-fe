<script setup lang="ts">
import { ref } from 'vue'
import GameBoard from '@/components/board/GameBoard.vue'
import ActivityTracker from '@/components/tracker/ActivityTracker.vue'
import RollLog from '@/components/tracker/RollLog.vue'

const trackerCollapsed = ref(false)
const rollLogCollapsed = ref(false)
</script>

<template>
  <div class="board-view">
    <div
      class="board-view__side board-view__side--left"
      :class="{ 'board-view__side--collapsed': trackerCollapsed }"
    >
      <ActivityTracker v-show="!trackerCollapsed" class="board-view__tracker" hide-roll-log-tab />
      <button
        class="board-view__collapse-btn"
        :aria-label="trackerCollapsed ? 'Expand activity tracker' : 'Collapse activity tracker'"
        @click="trackerCollapsed = !trackerCollapsed"
      >
        {{ trackerCollapsed ? '▶' : '◀' }}
      </button>
    </div>

    <div class="board-view__main">
      <GameBoard />
    </div>

    <div
      class="board-view__side board-view__side--right"
      :class="{ 'board-view__side--collapsed': rollLogCollapsed }"
    >
      <button
        class="board-view__collapse-btn"
        :aria-label="rollLogCollapsed ? 'Expand roll log' : 'Collapse roll log'"
        @click="rollLogCollapsed = !rollLogCollapsed"
      >
        {{ rollLogCollapsed ? '◀' : '▶' }}
      </button>
      <RollLog v-show="!rollLogCollapsed" class="board-view__rolllog osrs-panel" />
    </div>
  </div>
</template>

<style scoped>
.board-view {
  flex: 1;
  display: flex;
  gap: 1rem;
  padding: 1rem;
  align-items: flex-start;
  min-height: 0;
  overflow: hidden;
}

.board-view__side {
  position: sticky;
  top: 1rem;
  display: flex;
  height: calc(100vh - 2rem);
  min-width: 0;
  transition: flex-basis var(--transition-normal);
}

.board-view__side--left {
  flex: 0 0 25%;
}

.board-view__side--right {
  flex: 0 0 20%;
}

.board-view__side--left.board-view__side--collapsed,
.board-view__side--right.board-view__side--collapsed {
  flex: 0 0 auto;
}

.board-view__tracker,
.board-view__rolllog {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.board-view__collapse-btn {
  flex-shrink: 0;
  width: 1.5rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  color: var(--osrs-text-muted);
  cursor: pointer;
  font-size: 0.75rem;
  border-radius: var(--border-radius);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.board-view__collapse-btn:hover {
  color: var(--osrs-gold);
  border-color: var(--osrs-border-gold);
}

.board-view__main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .board-view {
    padding: 0;
    overflow: auto;
    align-items: center;
  }

  .board-view__side {
    display: none;
  }

  .board-view__main {
    width: 100%;
  }
}
</style>
