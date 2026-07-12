<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import BottomTabBar from '@/components/shared/BottomTabBar.vue'
import { sseService } from '@/services/sseService'

onMounted(() => sseService.connect())
onUnmounted(() => sseService.disconnect())
</script>

<template>
  <div class="app-shell">
    <main class="app-content">
      <RouterView />
    </main>
    <BottomTabBar />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* The tab bar is fixed (so it stays reachable even on tall/scrollable
 * pages like Leaderboard), which takes it out of flex flow — reserve the
 * same space here so it doesn't cover the last bit of page content. */
@media (max-width: 768px) {
  .app-content {
    padding-bottom: calc(var(--bottom-tabbar-height) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
