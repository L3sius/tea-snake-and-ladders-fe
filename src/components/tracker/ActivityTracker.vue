<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gameStore } from '@/stores/gameStore'
import { mockActivities } from '@/data/mockActivity'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import TeamToken from '@/components/board/TeamToken.vue'
import RollLog from './RollLog.vue'
import TeamModal from './TeamModal.vue'
import type { Team } from '@/types'

const props = defineProps<{
  // Desktop shows Roll Log as its own always-visible column instead —
  // set by BoardView so the tab isn't duplicated there.
  hideRollLogTab?: boolean
}>()

type Tab = 'live' | 'log' | 'leaderboard' | 'dev'
const activeTab = ref<Tab>('live')

// --- Leaderboard tab ---
const rankedTeams = computed(() =>
  [...gameStore.state.teams].sort((a, b) => b.position - a.position),
)

function rankLabel(index: number): string {
  if (index === 0) return '1st'
  if (index === 1) return '2nd'
  if (index === 2) return '3rd'
  return `${index + 1}th`
}

const rollsMadeByTeam = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of gameStore.state.rollHistory) {
    counts.set(entry.teamId, (counts.get(entry.teamId) ?? 0) + 1)
  }
  return counts
})

const selectedTeam = ref<Team | null>(null)

// --- Dev Tools tab ---
// Temporary: stands in for real dice rolls until the backend drives them.
const connected = computed(() => gameStore.state.connected)
const currentTeam = computed(() => gameStore.state.teams[gameStore.state.currentTeamIndex])
const forcedRoll = ref<number | null>(null)

const tick = ref(0)
let tickInterval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tickInterval = setInterval(() => tick.value++, 60_000)
})
onUnmounted(() => {
  clearInterval(tickInterval)
})

const waitingLabel = computed(() => {
  void tick.value
  const lastRoll = gameStore.state.rollHistory[0]
  return lastRoll ? `waiting ${formatRelativeTime(lastRoll.timestamp)}` : null
})

function rollDice() {
  gameStore.rollForCurrentTeam()
}

function forceRoll() {
  gameStore.rollForCurrentTeam(forcedRoll.value ?? undefined)
}

function resetTeams() {
  if (!window.confirm('Reset the whole board? This clears every roll and all task progress.')) {
    return
  }
  gameStore.resetAll()
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
        v-if="!props.hideRollLogTab"
        class="tracker-tab"
        :class="{ 'tracker-tab--active': activeTab === 'log' }"
        @click="activeTab = 'log'"
      >
        Roll Log
      </button>
      <button
        class="tracker-tab"
        :class="{ 'tracker-tab--active': activeTab === 'leaderboard' }"
        @click="activeTab = 'leaderboard'"
      >
        Leaderboard
      </button>
      <button
        class="tracker-tab"
        :class="{ 'tracker-tab--active': activeTab === 'dev' }"
        @click="activeTab = 'dev'"
      >
        Dev Tools
      </button>
    </div>

    <div class="tracker-body">
      <!-- Live Updates -->
      <ul v-if="activeTab === 'live'" class="live-list">
        <li v-for="entry in mockActivities" :key="entry.id" class="live-entry">
          <span class="live-entry__age">{{ formatRelativeTime(entry.timestamp) }}</span>
          <span class="live-entry__player">{{ entry.player }}</span>
          <span class="live-entry__action"> {{ entry.action }}</span>
        </li>
      </ul>

      <!-- Roll Log (mobile-only tab — desktop shows it as its own column) -->
      <RollLog v-else-if="activeTab === 'log'" />

      <!-- Leaderboard -->
      <div v-else-if="activeTab === 'leaderboard'" class="leaderboard-table">
        <div class="leaderboard-table__header">
          <span>Rank</span>
          <span>Team Name</span>
          <span>Tile</span>
          <span>Rolls</span>
        </div>

        <button
          v-for="(team, index) in rankedTeams"
          :key="team.id"
          class="leaderboard-table__row"
          :class="{ 'leaderboard-table__row--top': index < 3 }"
          @click="selectedTeam = team"
        >
          <span class="rank-label" :class="`rank-label--${index + 1}`">
            {{ rankLabel(index) }}
          </span>
          <div class="team-cell">
            <TeamToken :team="team" size="sm" />
            <span class="team-cell__name">{{ team.name }}</span>
          </div>
          <span class="tile-cell">{{ team.position }}</span>
          <span class="tasks-cell">{{ rollsMadeByTeam.get(team.id) ?? 0 }}</span>
        </button>
      </div>

      <!-- Dev Tools -->
      <div v-else class="dev-tools">
        <p class="dev-tools__notice">
          Temporary — stands in for the real backend-driven rolls. Will be removed once that's wired
          up.
        </p>

        <div class="dev-tools__status">
          <span
            class="status-dot"
            :class="connected ? 'status-dot--live' : 'status-dot--offline'"
          />
          <span class="status-label">{{ connected ? 'LIVE' : 'OFFLINE' }}</span>
        </div>

        <div v-if="currentTeam" class="turn-indicator">
          <span class="turn-indicator__dot" :style="{ background: currentTeam.color }" />
          <span class="turn-indicator__label">{{ currentTeam.name }}</span>
          <span v-if="waitingLabel" class="turn-indicator__waiting">{{ waitingLabel }}</span>
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
    </div>

    <TeamModal :team="selectedTeam" @close="selectedTeam = null" />
  </div>
</template>

<style scoped>
.activity-tracker {
  display: flex;
  flex-direction: column;
  flex: 1;
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
  font-size: 0.52rem;
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
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
  padding: 0.4rem 0;
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
  font-size: 0.95rem;
  border-bottom: 1px solid var(--osrs-border);
  line-height: 1.4;
}

.live-entry:last-child {
  border-bottom: none;
}

.live-entry__age {
  font-family: var(--font-display);
  font-size: 0.46rem;
  color: var(--osrs-text-muted);
  flex-shrink: 0;
  width: 2.6rem;
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

/* ── Leaderboard ──
 * Columns are kept deliberately compact — this now lives inside a sidebar
 * (or a mobile page), never the wide standalone page it used to be. */
.leaderboard-table {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
}

.leaderboard-table__header {
  display: grid;
  grid-template-columns: 38px 1fr 42px 42px;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  font-family: var(--font-display);
  font-size: 0.52rem;
  color: var(--osrs-text-muted);
  border-bottom: 1px solid var(--osrs-border);
}

.leaderboard-table__row {
  display: grid;
  grid-template-columns: 38px 1fr 42px 42px;
  gap: 0.4rem;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  transition: border-color var(--transition-fast);
}

.leaderboard-table__row:hover {
  border-color: var(--osrs-border-light);
}

.leaderboard-table__row--top {
  border-color: var(--osrs-border-gold);
}

.rank-label {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text-muted);
}

.rank-label--1 {
  color: var(--osrs-gold);
}
.rank-label--2 {
  color: #c0c0c0;
}
.rank-label--3 {
  color: #cd7f32;
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.team-cell__name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--osrs-text-bright);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-cell,
.tasks-cell {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text);
}

/* ── Dev Tools ── */
.dev-tools {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.dev-tools__notice {
  font-size: 0.9rem;
  color: var(--osrs-text-muted);
  font-style: italic;
  line-height: 1.5;
}

.dev-tools__status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  font-size: 0.52rem;
  color: var(--osrs-text-muted);
}

.turn-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
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
  font-size: 0.52rem;
  color: var(--osrs-text);
  white-space: nowrap;
}

.turn-indicator__waiting {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 0.46rem;
  color: var(--osrs-text-muted);
  white-space: nowrap;
}

.nav-btn {
  width: 100%;
  padding: 0.5rem 0.9rem;
  font-family: var(--font-display);
  font-size: 0.52rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  border: 1px solid;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.nav-btn--roll {
  background: var(--osrs-panel-light);
  border-color: var(--osrs-border-gold);
  color: var(--osrs-gold);
}

.nav-btn--roll:hover {
  background: #16382a;
  border-color: var(--osrs-gold);
}

.force-roll {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.force-roll__input {
  width: 66px;
  flex-shrink: 0;
  padding: 0.5rem 0.4rem;
  font-family: var(--font-display);
  font-size: 0.52rem;
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
  flex: 1;
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

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>
