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
  /* ActivityTracker/RollLog's own root sets `flex: 1` (flex-basis: 0%) for
   * when they fill a lone container — `width` alone can't override that
   * (flex-basis wins over width whenever it isn't `auto`), so the flex
   * shorthand has to be reset here explicitly or all three columns end up
   * splitting the row evenly regardless of this width. */
  flex: 0 0 20%;
  position: sticky;
  top: 1rem;
  display: flex;
  height: calc(100vh - 2rem);
}

.board-view__main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
}

/* Below this width the Activity Tracker and Roll Log live on their own
 * full-screen tabs (reached via the bottom tab bar) instead of side
 * columns, so the board gets the whole screen to itself. */
@media (max-width: 768px) {
  .board-view {
    padding: 0;
    overflow: auto;
    /* The board is width-bound on narrow phones (it can only be as tall as
     * it is wide), so it rarely fills the full viewport height — center it
     * instead of pinning it to the top, so the leftover space reads as
     * intentional breathing room rather than a layout gap. */
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
