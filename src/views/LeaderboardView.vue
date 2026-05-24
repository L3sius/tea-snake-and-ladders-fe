<script setup lang="ts">
import TeamToken from '@/components/board/TeamToken.vue'
import { gameStore } from '@/stores/gameStore'
import { computed } from 'vue'

const rankedTeams = computed(() =>
  [...gameStore.state.teams].sort((a, b) => b.position - a.position),
)

const rankLabel = (index: number) => {
  if (index === 0) return '1st'
  if (index === 1) return '2nd'
  if (index === 2) return '3rd'
  return `${index + 1}th`
}
</script>

<template>
  <div class="leaderboard-view">
    <div class="osrs-panel leaderboard-panel">
      <h1 class="osrs-title leaderboard-panel__title">Leaderboard</h1>

      <div class="leaderboard-table">
        <div class="leaderboard-table__header">
          <span>Rank</span>
          <span>Team</span>
          <span>Tile</span>
          <span>Tasks Done</span>
        </div>

        <div
          v-for="(team, index) in rankedTeams"
          :key="team.id"
          class="leaderboard-table__row"
          :class="{ 'leaderboard-table__row--top': index < 3 }"
        >
          <span class="rank-label" :class="`rank-label--${index + 1}`">
            {{ rankLabel(index) }}
          </span>
          <div class="team-cell">
            <TeamToken :team="team" size="md" />
            <span class="team-cell__name">{{ team.name }}</span>
          </div>
          <span class="tile-cell">{{ team.position }}</span>
          <span class="tasks-cell">
            {{ team.taskProgress.length }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-view {
  flex: 1;
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.leaderboard-panel__title {
  margin-bottom: 1.25rem;
}

.leaderboard-table {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.leaderboard-table__header {
  display: grid;
  grid-template-columns: 60px 1fr 80px 100px;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--osrs-text-muted);
  border-bottom: 1px solid var(--osrs-border);
}

.leaderboard-table__row {
  display: grid;
  grid-template-columns: 60px 1fr 80px 100px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  transition: border-color var(--transition-fast);
}

.leaderboard-table__row:hover {
  border-color: var(--osrs-border-light);
}

.leaderboard-table__row--top {
  border-color: var(--osrs-border);
}

.rank-label {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text-muted);
}

.rank-label--1 { color: var(--osrs-gold); }
.rank-label--2 { color: #c0c0c0; }
.rank-label--3 { color: #cd7f32; }

.team-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.team-cell__name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--osrs-text-bright);
}

.tile-cell,
.tasks-cell {
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: var(--osrs-text);
}

@media (max-width: 480px) {
  .leaderboard-table__header,
  .leaderboard-table__row {
    grid-template-columns: 50px 1fr 60px;
  }

  .tasks-cell,
  .leaderboard-table__header span:last-child {
    display: none;
  }
}
</style>
