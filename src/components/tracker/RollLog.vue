<script setup lang="ts">
import { ref, computed } from 'vue'
import { gameStore } from '@/stores/gameStore'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import type { RollHistoryEntry } from '@/types'

const rollHistory = computed(() => gameStore.state.rollHistory)
const teams = computed(() => gameStore.state.teams)

const historyIndex = computed(() => gameStore.state.historyIndex)
const isLive = computed(() => historyIndex.value === null)
const activeEntryIndex = computed(() =>
  isLive.value ? -1 : rollHistory.value.length - historyIndex.value!,
)
const canGoPrev = computed(() =>
  isLive.value ? rollHistory.value.length > 0 : historyIndex.value! > 0,
)
const canGoNext = computed(() => !isLive.value)
const historyLabel = computed(() => {
  if (isLive.value) return 'Live'
  if (historyIndex.value === 0) return 'Game start'
  return `Roll ${historyIndex.value} / ${rollHistory.value.length}`
})

const selectedTeamId = ref<string | null>(null)

function toggleTeamFilter(teamId: string) {
  selectedTeamId.value = selectedTeamId.value === teamId ? null : teamId
}

interface LoggedRoll {
  entry: RollHistoryEntry
  idx: number
}

const filteredEntries = computed<LoggedRoll[]>(() => {
  const withIndex = rollHistory.value.map((entry, idx) => ({ entry, idx }))
  if (!selectedTeamId.value) return withIndex
  return withIndex.filter((r) => r.entry.teamId === selectedTeamId.value)
})

interface DayGroup {
  label: string
  rolls: LoggedRoll[]
}

function dayLabel(date: Date): string {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfEntryDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startOfToday.getTime() - startOfEntryDay.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const groupedEntries = computed<DayGroup[]>(() => {
  const groups: DayGroup[] = []
  for (const roll of filteredEntries.value) {
    const label = dayLabel(roll.entry.timestamp)
    const current = groups[groups.length - 1]
    if (current && current.label === label) current.rolls.push(roll)
    else groups.push({ label, rolls: [roll] })
  }
  return groups
})

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="roll-log">
    <div class="roll-log__body">
      <img src="/images/logo.png" alt="" class="roll-log__logo" />

      <div v-if="rollHistory.length === 0" class="tracker-empty">
        No rolls yet. Hit "Roll Dice" to start!
      </div>

      <template v-else>
        <div class="history-nav">
          <button
            class="history-nav__btn"
            :disabled="!canGoPrev"
            @click="gameStore.stepHistoryPrev()"
          >
            ◀ Prev
          </button>
          <button
            class="history-nav__label"
            :class="{ 'history-nav__label--live': isLive }"
            :disabled="isLive"
            @click="gameStore.jumpToLive()"
          >
            {{ historyLabel }}
          </button>
          <button
            class="history-nav__btn"
            :disabled="!canGoNext"
            @click="gameStore.stepHistoryNext()"
          >
            Next ▶
          </button>
        </div>

        <div class="team-filter">
          <button
            class="team-filter__chip"
            :class="{ 'team-filter__chip--active': selectedTeamId === null }"
            @click="selectedTeamId = null"
          >
            All
          </button>
          <button
            v-for="team in teams"
            :key="team.id"
            class="team-filter__chip"
            :class="{ 'team-filter__chip--active': selectedTeamId === team.id }"
            :style="
              selectedTeamId === team.id ? { borderColor: team.color, color: team.color } : {}
            "
            @click="toggleTeamFilter(team.id)"
          >
            <span class="team-filter__dot" :style="{ background: team.color }" />
            <span class="team-filter__chip-name">{{ team.name }}</span>
          </button>
        </div>

        <div v-if="filteredEntries.length === 0" class="tracker-empty">
          No rolls yet for this team.
        </div>

        <div v-else class="roll-groups">
          <div v-for="group in groupedEntries" :key="group.label" class="roll-group">
            <div class="roll-group__label">{{ group.label }}</div>
            <ul class="roll-list">
              <li
                v-for="{ entry, idx } in group.rolls"
                :key="entry.id"
                class="roll-entry"
                :class="{ 'roll-entry--active': idx === activeEntryIndex }"
                @click="gameStore.viewRollAt(idx)"
              >
                <div class="roll-entry__line1">
                  <span class="roll-entry__team" :style="{ color: entry.teamColor }">{{
                    entry.teamName
                  }}</span>
                  <template v-if="entry.roll !== null">
                    <span class="roll-entry__verb"> rolled a </span>
                    <strong class="roll-entry__roll" :style="{ color: entry.teamColor }">{{
                      entry.roll
                    }}</strong>
                  </template>
                  <span v-else class="roll-entry__verb"> climbed a ladder</span>
                  <span class="roll-entry__time">
                    {{ formatTime(entry.timestamp) }} ·
                    {{ formatRelativeTime(entry.timestamp) }} ago
                  </span>
                </div>
                <div class="roll-entry__line2">
                  <template v-if="entry.roll === null">
                    <span class="roll-entry__climb">Climbed from </span>
                    <strong>{{ entry.fromPosition }}</strong>
                    <span class="roll-entry__climb"> to </span>
                    <strong>{{ entry.finalPosition }}</strong>
                  </template>
                  <template v-else>
                    <span>Moved from </span>
                    <strong>{{ entry.fromPosition }}</strong>
                    <span> to </span>
                    <strong>{{ entry.toPosition }}</strong>
                    <template v-if="entry.snakeOrLadder">
                      <span
                        :class="
                          entry.snakeOrLadder.type === 'ladder'
                            ? 'roll-entry__climb'
                            : 'roll-entry__fall'
                        "
                      >
                        {{
                          entry.snakeOrLadder.type === 'ladder'
                            ? ' and climbed to '
                            : ' and fell to '
                        }}
                        <strong>{{ entry.finalPosition }}</strong>
                      </span>
                    </template>
                  </template>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.roll-log {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.roll-log__body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 0.4rem 0;
}

.roll-log__logo {
  display: block;
  max-width: 320px;
  width: 100%;
  margin: 0.5rem auto 0.25rem;
  margin-top: 0;
}

.tracker-empty {
  padding: 1rem;
  font-size: 0.95rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

.history-nav {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--osrs-border);
  flex-shrink: 0;
}

.history-nav__btn {
  flex-shrink: 0;
  padding: 0.3rem 0.5rem;
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--osrs-text);
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.history-nav__btn:hover:not(:disabled) {
  color: var(--osrs-gold);
  border-color: var(--osrs-border-gold);
}

.history-nav__btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.history-nav__label {
  flex: 1;
  padding: 0.3rem 0.4rem;
  font-family: var(--font-display);
  font-size: 0.5rem;
  text-align: center;
  color: var(--osrs-gold);
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border-gold);
  border-radius: var(--border-radius);
  cursor: pointer;
  white-space: nowrap;
}

.history-nav__label--live {
  color: var(--osrs-green);
  border-color: var(--osrs-border);
  cursor: default;
}

.team-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--osrs-border);
  flex-shrink: 0;
}

.team-filter__chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 140px;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  color: var(--osrs-text-muted);
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.team-filter__chip-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-filter__chip:hover {
  background: var(--osrs-panel-hover);
}

.team-filter__chip--active {
  color: var(--osrs-gold);
  border-color: var(--osrs-border-gold);
  background: var(--osrs-panel-hover);
}

.team-filter__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.roll-groups {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-bottom: 0.4rem;
}

.roll-group__label {
  position: sticky;
  top: 0;
  padding: 0.3rem 0.75rem;
  font-family: var(--font-display);
  font-size: 0.52rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--osrs-text-muted);
  background: var(--osrs-panel);
  z-index: 1;
}

.roll-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.2rem 0.5rem 0;
}

.roll-entry {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  border-left: 3px solid var(--osrs-border);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
  animation: log-slide-in 0.2s ease-out;
}

.roll-entry:hover {
  background: var(--osrs-panel-hover);
}

.roll-entry--active {
  border-color: var(--osrs-border-gold);
  border-left-color: var(--osrs-gold);
  background: var(--osrs-panel-hover);
}

.roll-entry__line1 {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.98rem;
}

.roll-entry__team {
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roll-entry__verb {
  color: var(--osrs-text-muted);
  flex-shrink: 0;
  white-space: nowrap;
}

.roll-entry__roll {
  flex-shrink: 0;
  white-space: nowrap;
}

.roll-entry__time {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 0.46rem;
  color: var(--osrs-text-muted);
  flex-shrink: 0;
}

.roll-entry__line2 {
  font-size: 0.92rem;
  color: var(--osrs-text-muted);
  line-height: 1.4;
}

.roll-entry__line2 strong {
  color: var(--osrs-text);
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

@keyframes log-slide-in {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
