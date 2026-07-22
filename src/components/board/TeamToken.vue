<script setup lang="ts">
import type { Team } from '@/types'

defineProps<{
  team: Team
  size?: 'sm' | 'md' | 'lg' | 'fill'
  completed?: boolean
}>()
</script>

<template>
  <div
    class="team-token"
    :class="[`team-token--${size ?? 'md'}`, { 'team-token--completed': completed }]"
    :style="{ borderColor: team.color, '--pulse-color': team.color }"
    :title="team.name"
  >
    <div class="team-token__clip">
      <img
        v-if="team.logoPath"
        :src="team.logoPath"
        :alt="team.name"
        class="team-token__logo"
        draggable="false"
      />
      <span v-else class="team-token__initial">{{ team.name.charAt(0) }}</span>
    </div>
  </div>
</template>

<style scoped>
.team-token {
  position: relative;
  border-radius: 50%;
  border: 2px solid;
  background: var(--osrs-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.team-token__clip {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-token--completed::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 2px solid var(--pulse-color);
  animation: team-token-pulse 1.6s ease-out infinite;
  pointer-events: none;
}

@keyframes team-token-pulse {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }

  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.team-token--sm {
  width: 26px;
  height: 26px;
}

.team-token--md {
  width: 32px;
  height: 32px;
}

.team-token--lg {
  width: 48px;
  height: 48px;
}

.team-token--fill {
  width: 100%;
  height: 100%;
  border-width: 3px;
  border-radius: 12px;
}

.team-token--fill .team-token__logo {
  object-fit: contain;
}

.team-token__logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-token__initial {
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--osrs-text-bright);
  user-select: none;
}
</style>
