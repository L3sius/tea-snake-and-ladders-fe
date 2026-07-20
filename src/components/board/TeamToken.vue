<script setup lang="ts">
import type { Team } from '@/types'

defineProps<{
  team: Team
  size?: 'sm' | 'md' | 'lg' | 'fill'
}>()
</script>

<template>
  <div
    class="team-token"
    :class="`team-token--${size ?? 'md'}`"
    :style="{ borderColor: team.color }"
    :title="team.name"
  >
    <img
      v-if="team.logoPath"
      :src="team.logoPath"
      :alt="team.name"
      class="team-token__logo"
      draggable="false"
    />
    <span v-else class="team-token__initial">{{ team.name.charAt(0) }}</span>
  </div>
</template>

<style scoped>
.team-token {
  border-radius: 50%;
  border: 2px solid;
  background: var(--osrs-panel);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
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

/* Sized entirely by the parent — e.g. a container with a fixed max-width
 * and aspect-ratio: 1, so the logo fills the space it's given responsively
 * instead of a fixed pixel size (see .team-preview__logo). A plain rounded
 * rectangle rather than the circular badge the other sizes use — this is a
 * large hero image, not a small badge, so it shows the whole logo uncropped
 * instead of cutting it into a circle. */
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
