<script setup lang="ts">
import GameBoard from '@/components/board/GameBoard.vue'
import ActivityTracker from '@/components/tracker/ActivityTracker.vue'
import RollLog from '@/components/tracker/RollLog.vue'
</script>

<template>
  <div class="board-view">
    <ActivityTracker class="board-view__tracker" hide-roll-log-tab />

    <div class="board-view__main">
      <GameBoard />
    </div>

    <RollLog class="board-view__rolllog osrs-panel" />
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

.board-view__tracker,
.board-view__rolllog {
  position: sticky;
  top: 1rem;
  display: flex;
  height: calc(100vh - 2rem);
}

.board-view__tracker {
  flex: 0 0 25%;
}

.board-view__rolllog {
  flex: 0 0 20%;
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

  .board-view__tracker,
  .board-view__rolllog {
    display: none;
  }

  .board-view__main {
    width: 100%;
  }
}
</style>
