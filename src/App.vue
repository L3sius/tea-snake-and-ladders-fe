<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BottomTabBar from '@/components/shared/BottomTabBar.vue'
import { sseService } from '@/services/sseService'
import { gameStore } from '@/stores/gameStore'

const router = useRouter()
const route = useRoute()

onMounted(async () => {
  await gameStore.loadTeams()
  sseService.connect()
})
onUnmounted(() => sseService.disconnect())

const MOBILE_QUERY = '(max-width: 768px)'

watch(
  () => gameStore.state.activeDiceRoll,
  (event) => {
    if (!event) return
    if (!window.matchMedia(MOBILE_QUERY).matches) return
    if (route.path !== '/') router.push('/')
  },
)
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

@media (max-width: 768px) {
  .app-content {
    padding-bottom: calc(var(--bottom-tabbar-height) + env(safe-area-inset-bottom, 0px));
  }
}
</style>
