<script setup lang="ts">
import GameBoard from '@/components/board/GameBoard.vue'
import ActivityTracker from '@/components/tracker/ActivityTracker.vue'
</script>

<template>
  <div class="board-view">
    <ActivityTracker class="board-view__tracker" />

    <div class="board-view__main">
      <GameBoard />
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

.board-view__tracker {
  width: 320px;
  flex-shrink: 0;
  position: sticky;
  top: 1rem;
}

.board-view__main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
}

@media (max-width: 900px) {
  .board-view {
    flex-direction: column;
    overflow: auto;
  }

  .board-view__tracker {
    width: 100%;
    position: static;
    height: 340px;
  }
}
</style>
