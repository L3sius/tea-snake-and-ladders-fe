<script setup lang="ts">
import { ref, computed } from 'vue'
import { gameStore } from '@/stores/gameStore'
import { mockActivities } from '@/data/mockActivity'

type Tab = 'live' | 'log'
const activeTab = ref<Tab>('live')
const rollHistory = computed(() => gameStore.state.rollHistory)

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatAge(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h`
}
</script>

<template>
  <div class="activity-tracker osrs-panel">
    <div class="tracker-tabs">
      <button
        class="tracker-tab"
        :class="{ 'tracker-tab--active': activeTab === 'live' }"
        @click="activeTab = 'live'"
      >
        <span class="tracker-tab__live-dot" />
        Live Updates
      </button>
      <button
        class="tracker-tab"
        :class="{ 'tracker-tab--active': activeTab === 'log' }"
        @click="activeTab = 'log'"
      >
        Roll Log
      </button>
    </div>

    <div class="tracker-body">
      <!-- Live Updates -->
      <ul v-if="activeTab === 'live'" class="live-list">
        <li v-for="entry in mockActivities" :key="entry.id" class="live-entry">
          <span class="live-entry__age">{{ formatAge(entry.timestamp) }}</span>
          <span class="live-entry__player">{{ entry.player }}</span>
          <span class="live-entry__action"> {{ entry.action }}</span>
        </li>
      </ul>

      <!-- Roll Log -->
      <template v-else>
        <div v-if="rollHistory.length === 0" class="tracker-empty">
          No rolls yet. Hit "Roll Dice" to start!
        </div>

        <ul v-else class="roll-list">
          <li v-for="entry in rollHistory" :key="entry.id" class="roll-entry">
            <div class="roll-entry__line1">
              <span class="roll-entry__dot" :style="{ background: entry.teamColor }" />
              <span class="roll-entry__team">{{ entry.teamName }}</span>
              <span class="roll-entry__verb"> rolled a </span>
              <strong class="roll-entry__roll">{{ entry.roll }}</strong>
              <span class="roll-entry__time">{{ formatTime(entry.timestamp) }}</span>
            </div>
            <div class="roll-entry__line2">
              <span>Moved from </span>
              <strong>{{ entry.fromPosition }}</strong>
              <span> to </span>
              <strong class="roll-entry__dest">{{ entry.toPosition }}</strong>
              <template v-if="entry.snakeOrLadder">
                <span :class="entry.snakeOrLadder.type === 'ladder' ? 'roll-entry__climb' : 'roll-entry__fall'">
                  {{ entry.snakeOrLadder.type === 'ladder' ? ' and climbed to ' : ' and fell to ' }}
                  <strong>{{ entry.finalPosition }}</strong>
                </span>
              </template>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.activity-tracker {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 86px);
  min-height: 0;
}

/* ── Tabs ── */
.tracker-tabs {
  display: flex;
  gap: 2px;
  padding: 0.5rem 0.5rem 0;
  flex-shrink: 0;
  border-bottom: 1px solid var(--osrs-border);
}

.tracker-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.4rem 0.6rem;
  font-family: var(--font-display);
  font-size: 0.42rem;
  color: var(--osrs-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
  white-space: nowrap;
}

.tracker-tab:hover {
  color: var(--osrs-text);
  background: var(--osrs-panel-hover);
}

.tracker-tab--active {
  color: var(--osrs-gold);
  background: var(--osrs-panel-light);
  border-color: var(--osrs-border);
}

.tracker-tab__live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--osrs-green);
  box-shadow: 0 0 5px var(--osrs-green);
  animation: pulse 2s ease infinite;
  flex-shrink: 0;
}

/* ── Body ── */
.tracker-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0.4rem 0;
}

.tracker-empty {
  padding: 1rem;
  font-size: 0.8rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

/* ── Live list ── */
.live-list {
  list-style: none;
  display: flex;
  flex-direction: column;
}

.live-entry {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  padding: 0.28rem 0.75rem;
  font-size: 0.78rem;
  border-bottom: 1px solid var(--osrs-border);
  line-height: 1.4;
}

.live-entry:last-child {
  border-bottom: none;
}

.live-entry__age {
  font-family: var(--font-display);
  font-size: 0.36rem;
  color: var(--osrs-text-muted);
  flex-shrink: 0;
  width: 2.2rem;
  text-align: right;
}

.live-entry__player {
  font-weight: 600;
  color: var(--osrs-gold);
  white-space: nowrap;
  flex-shrink: 0;
}

.live-entry__action {
  color: var(--osrs-text-muted);
}

/* ── Roll list ── */
.roll-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.4rem 0.5rem;
}

.roll-entry {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.6rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  border-left: 3px solid var(--osrs-border);
  animation: log-slide-in 0.2s ease-out;
}

.roll-entry__line1 {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
}

.roll-entry__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.roll-entry__team {
  font-weight: 600;
  color: var(--osrs-text-bright);
}

.roll-entry__verb {
  color: var(--osrs-text-muted);
}

.roll-entry__roll {
  color: var(--osrs-gold);
}

.roll-entry__time {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 0.36rem;
  color: var(--osrs-text-muted);
  flex-shrink: 0;
}

.roll-entry__line2 {
  font-size: 0.78rem;
  color: var(--osrs-text-muted);
  padding-left: 1.75rem;
  line-height: 1.4;
}

.roll-entry__line2 strong {
  color: var(--osrs-text);
}

.roll-entry__dest {
  color: var(--osrs-gold) !important;
}

.roll-entry__climb {
  color: var(--osrs-green);
}

.roll-entry__climb strong {
  color: var(--osrs-green) !important;
}

.roll-entry__fall {
  color: var(--osrs-red);
}

.roll-entry__fall strong {
  color: var(--osrs-red) !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

@keyframes log-slide-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
</style>
