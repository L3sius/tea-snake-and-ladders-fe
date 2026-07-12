<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { name: 'Board', path: '/', label: 'Board', icon: '🎲' },
  { name: 'Activity', path: '/activity', label: 'Activity', icon: '📜' },
] as const
</script>

<template>
  <nav class="bottom-tab-bar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      :to="tab.path"
      class="bottom-tab-bar__tab"
      :class="{ 'bottom-tab-bar__tab--active': route.name === tab.name }"
    >
      <span class="bottom-tab-bar__icon">{{ tab.icon }}</span>
      <span class="bottom-tab-bar__label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-tab-bar {
  display: none;
}

@media (max-width: 768px) {
  .bottom-tab-bar {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    height: calc(var(--bottom-tabbar-height) + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--osrs-panel);
    border-top: 2px solid var(--osrs-border);
  }
}

.bottom-tab-bar__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  color: var(--osrs-text-muted);
}

.bottom-tab-bar__tab--active {
  color: var(--osrs-gold);
}

.bottom-tab-bar__icon {
  font-size: 1.1rem;
  line-height: 1;
}

.bottom-tab-bar__label {
  font-family: var(--font-display);
  font-size: 0.38rem;
  letter-spacing: 0.02em;
}
</style>
