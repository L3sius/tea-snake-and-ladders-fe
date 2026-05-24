<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { gameStore } from '@/stores/gameStore'

const route = useRoute()
const connected = computed(() => gameStore.state.connected)
const currentTeam = computed(() => gameStore.state.teams[gameStore.state.currentTeamIndex])
const forcedRoll = ref<number | null>(null)

const navLinks = [
  { name: 'Board', path: '/', label: 'Board' },
  { name: 'Leaderboard', path: '/leaderboard', label: 'Leaderboard' },
  { name: 'EventInfo', path: '/info', label: 'Event Info' },
]

function rollDice() {
  gameStore.rollForCurrentTeam()
}

function forceRoll() {
  gameStore.rollForCurrentTeam(forcedRoll.value ?? undefined)
}

function resetTeams() {
  gameStore.resetAll()
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar__brand osrs-title">TEA S&amp;L</div>

    <ul class="navbar__links">
      <li v-for="link in navLinks" :key="link.name">
        <RouterLink
          :to="link.path"
          class="navbar__link"
          :class="{ 'navbar__link--active': route.name === link.name }"
        >
          {{ link.label }}
        </RouterLink>
      </li>
    </ul>

    <div class="navbar__controls">
      <div v-if="currentTeam" class="turn-indicator">
        <span
          class="turn-indicator__dot"
          :style="{ background: currentTeam.color }"
        />
        <span class="turn-indicator__label">{{ currentTeam.name }}</span>
      </div>

      <button class="nav-btn nav-btn--roll" @click="rollDice">Roll Dice</button>

      <div class="force-roll">
        <input
          v-model.number="forcedRoll"
          type="number"
          min="1"
          max="6"
          placeholder="1-6"
          class="force-roll__input"
        />
        <button class="nav-btn nav-btn--force" @click="forceRoll">Force</button>
      </div>

      <button class="nav-btn nav-btn--reset" @click="resetTeams">Reset</button>
    </div>

    <div class="navbar__status">
      <span class="status-dot" :class="connected ? 'status-dot--live' : 'status-dot--offline'" />
      <span class="status-label">{{ connected ? 'LIVE' : 'OFFLINE' }}</span>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.6rem 1.25rem;
  background: var(--osrs-panel);
  border-bottom: 2px solid var(--osrs-border);
  flex-wrap: wrap;
}

.navbar__brand {
  font-size: 0.6rem;
  white-space: nowrap;
  color: var(--osrs-gold);
  flex-shrink: 0;
}

.navbar__links {
  display: flex;
  gap: 0.2rem;
  list-style: none;
}

.navbar__link {
  display: block;
  padding: 0.35rem 0.75rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--osrs-text-muted);
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.navbar__link:hover,
.navbar__link--active {
  color: var(--osrs-text-bright);
  border-color: var(--osrs-border);
  background: var(--osrs-panel-hover);
}

.navbar__link--active {
  color: var(--osrs-gold);
  border-color: var(--osrs-border-light);
}

.navbar__controls {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-left: auto;
  padding-left: 0.75rem;
  border-left: 1px solid var(--osrs-border);
}

.turn-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
}

.turn-indicator__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.turn-indicator__label {
  font-family: var(--font-display);
  font-size: 0.45rem;
  color: var(--osrs-text);
  white-space: nowrap;
}

.nav-btn {
  padding: 0.35rem 0.9rem;
  font-family: var(--font-display);
  font-size: 0.45rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  border: 1px solid;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
  white-space: nowrap;
}

.nav-btn--roll {
  background: var(--osrs-panel-light);
  border-color: var(--osrs-border-gold);
  color: var(--osrs-gold);
}

.nav-btn--roll:hover {
  background: #3d2e00;
  border-color: var(--osrs-gold);
}

.force-roll {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.force-roll__input {
  width: 48px;
  padding: 0.35rem 0.4rem;
  font-family: var(--font-display);
  font-size: 0.45rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  color: var(--osrs-text);
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.force-roll__input::-webkit-inner-spin-button,
.force-roll__input::-webkit-outer-spin-button {
  appearance: none;
}

.force-roll__input:focus {
  outline: none;
  border-color: var(--osrs-border-gold);
}

.nav-btn--force {
  background: var(--osrs-panel-light);
  border-color: var(--osrs-border-light);
  color: var(--osrs-text);
}

.nav-btn--force:hover {
  background: var(--osrs-panel-hover);
  border-color: var(--osrs-border-gold);
  color: var(--osrs-gold);
}

.nav-btn--reset {
  background: var(--osrs-panel-light);
  border-color: var(--osrs-border);
  color: var(--osrs-text-muted);
}

.nav-btn--reset:hover {
  background: #3a1010;
  border-color: var(--osrs-red);
  color: var(--osrs-red);
}

.navbar__status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--osrs-border);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot--live {
  background: var(--osrs-green);
  box-shadow: 0 0 6px var(--osrs-green);
  animation: pulse 2s ease infinite;
}

.status-dot--offline {
  background: var(--osrs-red);
}

.status-label {
  font-family: var(--font-display);
  font-size: 0.45rem;
  color: var(--osrs-text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (max-width: 900px) {
  .navbar__brand {
    display: none;
  }
}

@media (max-width: 640px) {
  .navbar {
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
  }

  .turn-indicator__label {
    display: none;
  }
}
</style>
