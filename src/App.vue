<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import NavBar from '@/components/shared/NavBar.vue'
import { sseService } from '@/services/sseService'

onMounted(() => sseService.connect())
onUnmounted(() => sseService.disconnect())
</script>

<template>
  <div class="app-shell">
    <NavBar />
    <main class="app-content">
      <RouterView />
    </main>
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
}
</style>
