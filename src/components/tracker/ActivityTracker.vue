<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gameStore } from '@/stores/gameStore'
import { fetchLiveActivity, parseLiveActivity } from '@/data/liveActivity'
import { formatRelativeTime } from '@/utils/formatRelativeTime'
import { formatNumber } from '@/utils/formatNumber'
import TeamToken from '@/components/board/TeamToken.vue'
import RollLog from './RollLog.vue'
import type { Team, TeamMember } from '@/types'

const props = defineProps<{
  // Desktop shows Roll Log as its own always-visible column instead —
  // set by BoardView so the tab isn't duplicated there.
  hideRollLogTab?: boolean
}>()

type Tab = 'live' | 'log' | 'leaderboard' | 'stats' | 'roll'
const activeTab = ref<Tab>('live')

// --- Live Updates tab ---
// TEMP: mocked until getLiveActivity exists — see liveActivity.ts.
const liveActivity = parseLiveActivity(fetchLiveActivity())

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

// Leaderboard has no click-to-expand (it's meant to be fully visible at a
// glance), so alts are just listed alongside the player's name instead.
function altAccountNames(member: TeamMember): string[] {
  return member.accounts.filter((a) => a.name !== member.displayName).map((a) => a.name)
}

// --- Stats tab ---
// Rosters are capped at 8 players per team, so the full gold-sorted list is
// always shown — no teaser/expand needed.
interface TeamStats {
  team: Team
  gold: number
  items: number
  actions: number
}

// A player's gold/items is the sum across every account (main + alts) they
// control — see PlayerAccount/TeamMember in types/index.ts.
function memberTotals(member: TeamMember): { gold: number; items: number } {
  return member.accounts.reduce(
    (acc, a) => ({ gold: acc.gold + a.gold, items: acc.items + a.items }),
    { gold: 0, items: 0 },
  )
}

// POC: "actions generated" — counts liveActivity entries per player. Real
// version will come from getGlobalStats pre-summed; for now this is derived
// client-side from the mock feed, same pattern as rolls-made from
// log_history. liveActivity's `player` may name an alt account rather than
// the display name, so entries are attributed via the account -> owner map
// below rather than a plain name match.
const accountOwner = computed(() => {
  const map = new Map<string, { teamId: string; displayName: string }>()
  for (const team of gameStore.state.teams) {
    for (const member of team.members) {
      for (const account of member.accounts) {
        map.set(account.name, { teamId: team.id, displayName: member.displayName })
      }
    }
  }
  return map
})

const actionsByMember = computed(() => {
  const counts = new Map<string, number>() // keyed by memberKey(teamId, displayName)
  for (const entry of liveActivity) {
    const owner = accountOwner.value.get(entry.player)
    if (!owner) continue
    const key = memberKey(owner.teamId, owner.displayName)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
})

function memberActions(teamId: string, displayName: string): number {
  return actionsByMember.value.get(memberKey(teamId, displayName)) ?? 0
}

const teamStats = computed<TeamStats[]>(() => {
  return gameStore.state.teams
    .map((team) => {
      const totals = team.members.reduce(
        (acc, m) => {
          const member = memberTotals(m)
          return {
            gold: acc.gold + member.gold,
            items: acc.items + member.items,
            actions: acc.actions + memberActions(team.id, m.displayName),
          }
        },
        { gold: 0, items: 0, actions: 0 },
      )
      return { team, gold: totals.gold, items: totals.items, actions: totals.actions }
    })
    .sort((a, b) => b.gold - a.gold)
})

const grandTotals = computed(() =>
  teamStats.value.reduce(
    (acc, t) => ({
      gold: acc.gold + t.gold,
      items: acc.items + t.items,
      actions: acc.actions + t.actions,
    }),
    { gold: 0, items: 0, actions: 0 },
  ),
)

function sortedMembers(team: Team) {
  return [...team.members].sort((a, b) => memberTotals(b).gold - memberTotals(a).gold)
}

// Scoped to a team, since display names aren't globally unique — used to key
// the actionsByMember lookup above.
function memberKey(teamId: string, displayName: string): string {
  return `${teamId}::${displayName}`
}

// --- Roll Dice tab ---
// This is the real dice-roll trigger — any team can roll anytime, no
// authorization, picked here from the team tabs. A real backend would
// reject a roll for a team that hasn't completed its current tile's task;
// this mock never checks that.
const selectedTeamId = ref(gameStore.state.teams[0]?.id ?? '')
const selectedTeam = computed(() =>
  gameStore.state.teams.find((t) => t.id === selectedTeamId.value),
)

// Ticks while mounted so the cooldown countdown below stays live.
const now = ref(Date.now())
let cooldownInterval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  cooldownInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
})
onUnmounted(() => {
  clearInterval(cooldownInterval)
})

// Anti-spam cooldown is global (any roll locks out every team), not just
// the selected one — see rollCooldownUntil in gameStore.
const cooldownSecondsLeft = computed(() => {
  const until = gameStore.state.rollCooldownUntil
  if (until === null) return 0
  return Math.max(0, Math.ceil((until - now.value) / 1000))
})
const onCooldown = computed(() => cooldownSecondsLeft.value > 0)

function rollDice() {
  // Clicking Roll Dice is a clear signal the user wants to see it happen —
  // jump to live first so the overlay/animation actually plays, rather than
  // landing silently the way an unrelated roll would while browsing history.
  gameStore.jumpToLive()
  gameStore.rollForTeam(selectedTeamId.value)
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
        :class="{ 'tracker-tab--active': activeTab === 'stats' }"
        @click="activeTab = 'stats'"
      >
        Stats
      </button>
      <button
        class="tracker-tab"
        :class="{ 'tracker-tab--active': activeTab === 'roll' }"
        @click="activeTab = 'roll'"
      >
        Roll Dice
      </button>
    </div>

    <div class="tracker-body">
      <!-- Live Updates -->
      <ul v-if="activeTab === 'live'" class="live-list">
        <li v-for="entry in liveActivity" :key="entry.id" class="live-entry">
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
          <span></span>
          <span class="stats-table__header-name"></span>
          <span class="stats-table__header-num">Tile</span>
          <span class="stats-table__header-num">Rolls</span>
        </div>

        <div v-for="(team, index) in rankedTeams" :key="team.id" class="stats-team">
          <div
            class="leaderboard-table__row leaderboard-table__row--static"
            :class="{ 'leaderboard-table__row--top': index < 3 }"
          >
            <span class="rank-label" :class="`rank-label--${index + 1}`">
              {{ rankLabel(index) }}
            </span>
            <div class="team-cell">
              <TeamToken :team="team" size="sm" />
              <span class="team-cell__name" :style="{ color: team.color }">{{ team.name }}</span>
            </div>
            <span class="tile-cell">{{ team.position }}</span>
            <span class="tasks-cell">{{ rollsMadeByTeam.get(team.id) ?? 0 }}</span>
          </div>

          <ul class="stats-members">
            <li v-for="member in team.members" :key="member.displayName" class="leaderboard-member">
              {{ member.displayName }}
              <span v-if="altAccountNames(member).length > 0" class="leaderboard-member__alts">
                (alt{{ altAccountNames(member).length > 1 ? 's' : '' }}:
                {{ altAccountNames(member).join(', ') }})
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Stats -->
      <div v-else-if="activeTab === 'stats'" class="stats-panel">
        <div class="stats-summary">
          <div class="stats-summary__stat">
            <span class="stats-summary__value">{{ formatNumber(grandTotals.gold) }}</span>
            <span class="stats-summary__label">Event Gold</span>
          </div>
          <div class="stats-summary__stat">
            <span class="stats-summary__value">{{ formatNumber(grandTotals.items) }}</span>
            <span class="stats-summary__label">Event Items</span>
          </div>
          <div class="stats-summary__stat">
            <span class="stats-summary__value">{{ formatNumber(grandTotals.actions) }}</span>
            <span class="stats-summary__label">Actions Taken</span>
          </div>
        </div>

        <div class="leaderboard-table">
          <div class="leaderboard-table__header stats-table__header">
            <span></span>
            <span class="stats-table__header-name"></span>
            <span class="stats-table__header-num">Gold</span>
            <span class="stats-table__header-num">Items</span>
            <span class="stats-table__header-num">Actions</span>
          </div>

          <div v-for="(stat, index) in teamStats" :key="stat.team.id" class="stats-team">
            <div
              class="leaderboard-table__row stats-table__row leaderboard-table__row--static"
              :class="{ 'leaderboard-table__row--top': index < 3 }"
            >
              <span class="rank-label" :class="`rank-label--${index + 1}`">
                {{ rankLabel(index) }}
              </span>
              <div class="team-cell">
                <TeamToken :team="stat.team" size="sm" />
                <span class="team-cell__name" :style="{ color: stat.team.color }">{{
                  stat.team.name
                }}</span>
              </div>
              <span class="tile-cell">{{ formatNumber(stat.gold) }}</span>
              <span class="tasks-cell">{{ formatNumber(stat.items) }}</span>
              <span class="tasks-cell">{{ formatNumber(stat.actions) }}</span>
            </div>

            <ul class="stats-members">
              <li
                v-for="member in sortedMembers(stat.team)"
                :key="member.displayName"
                class="stats-member"
              >
                <span class="stats-member__name">
                  {{ member.displayName }}
                  <span v-if="altAccountNames(member).length > 0" class="stats-member__alts">
                    (+{{ altAccountNames(member).join(', ') }})
                  </span>
                </span>
                <span class="stats-member__stat">{{
                  formatNumber(memberTotals(member).gold)
                }}</span>
                <span class="stats-member__stat">{{
                  formatNumber(memberTotals(member).items)
                }}</span>
                <span class="stats-member__stat">{{
                  formatNumber(memberActions(stat.team.id, member.displayName))
                }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Roll Dice -->
      <div v-else class="roll-tab">
        <div class="roll-panel">
          <div class="team-tabs">
            <button
              v-for="team in gameStore.state.teams"
              :key="team.id"
              class="team-tab-chip"
              :class="{ 'team-tab-chip--active': team.id === selectedTeamId }"
              :style="team.id === selectedTeamId ? { '--chip-color': team.color } : undefined"
              @click="selectedTeamId = team.id"
            >
              {{ team.name }}
            </button>
          </div>

          <div
            v-if="selectedTeam"
            class="team-preview"
            :style="{ '--preview-color': selectedTeam.color }"
          >
            <div class="team-preview__logo">
              <TeamToken :team="selectedTeam" size="fill" />
            </div>
            <span class="team-preview__name">{{ selectedTeam.name }}</span>
          </div>

          <button class="roll-btn" :disabled="onCooldown" @click="rollDice">
            {{ onCooldown ? `ROLL DICE · ${cooldownSecondsLeft}s` : 'ROLL DICE' }}
          </button>
        </div>
      </div>
    </div>
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

/* On a phone-width screen, 5 tabs with nowrap labels don't fit in one row —
 * flex items default to min-width: auto, so instead of shrinking they just
 * push the row past the screen edge. Let it scroll horizontally instead,
 * with each tab kept at its natural (readable) width. Desktop's sidebar is
 * wide enough that this never kicks in there. */
@media (max-width: 768px) {
  .tracker-tabs {
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tracker-tabs::-webkit-scrollbar {
    display: none;
  }

  .tracker-tab {
    flex: 0 0 auto;
  }
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
  grid-template-columns: 38px 1fr 50px 50px;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  font-family: var(--font-display);
  font-size: 0.52rem;
  color: var(--osrs-text-muted);
  border-bottom: 1px solid var(--osrs-border);
}

/* A divider line rather than relying on right-aligned text spacing — a
 * fixed border + padding-left gives a consistent gap after each divider
 * regardless of the column's width, unlike right-aligning words of
 * different lengths into columns of different widths (which was the
 * previous "smushed" look on the narrower columns). */
.stats-table__header-num {
  text-align: center;
}

/* Grid items default to min-width: auto, which floors this cell at its own
 * text's min-content width — same fix as .team-cell below, but that one
 * only covers the value rows, not this header label. Without it, the
 * header can overflow its container even when the row underneath doesn't. */
.stats-table__header-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leaderboard-table__row {
  display: grid;
  grid-template-columns: 38px 1fr 50px 50px;
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

/* Leaderboard rows are display-only now (members list underneath instead of
 * a click-to-open modal) — cancel the clickable cursor/hover the shared
 * .leaderboard-table__row styling implies. */
.leaderboard-table__row--static {
  cursor: default;
}

.leaderboard-table__row--static:hover {
  border-color: var(--osrs-border);
}

.leaderboard-member {
  padding: 0.3rem 0.5rem;
  font-size: 1.1rem;
  color: var(--osrs-text-muted);
  background: var(--osrs-panel-hover);
  border-radius: var(--border-radius);
}

.leaderboard-member__alts {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--osrs-text-muted);
  opacity: 0.75;
}

/* ── Stats ──
 * Reuses the leaderboard table styles (same shape of data: rank, team,
 * numeric columns) but the Gold column needs more room than a tile
 * number or roll count ever did. */
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.stats-summary {
  display: flex;
  gap: 0.6rem;
  padding: 0.4rem 0.5rem 0;
}

.stats-summary__stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.75rem 0.5rem;
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border-gold);
  border-radius: var(--border-radius);
}

.stats-summary__value {
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--osrs-gold);
}

.stats-summary__label {
  font-family: var(--font-display);
  font-size: 0.4rem;
  color: var(--osrs-text-muted);
  text-transform: uppercase;
}

.stats-table__header,
.stats-table__row {
  grid-template-columns: 38px 1fr 85px 55px 55px;
}

.stats-team {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stats-members {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stats-member {
  display: grid;
  /* Matches the gold/items/actions column widths on .stats-table__row above,
   * so the numbers line up vertically between team and member rows. */
  grid-template-columns: 1fr 85px 55px 55px;
  gap: 0.4rem;
  align-items: center;
  padding: 0.3rem 0.5rem;
  background: var(--osrs-panel-hover);
  border-radius: var(--border-radius);
}

.stats-member__name {
  font-size: 0.8rem;
  color: var(--osrs-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-member__alts {
  font-size: 0.9rem;
  font-style: italic;
  color: var(--osrs-text-muted);
  opacity: 0.75;
}

.stats-member__stat {
  font-family: var(--font-display);
  font-size: 0.6rem;
  color: var(--osrs-text);
  text-align: center;
  white-space: nowrap;
}

.rank-label {
  font-family: var(--font-display);
  font-size: 0.55rem;
  text-align: center;
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
  font-size: 1.1rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tile-cell,
.tasks-cell {
  font-family: var(--font-display);
  font-size: 0.6rem;
  color: var(--osrs-text);
  text-align: center;
  white-space: nowrap;
}

/* ── Roll Dice ──
 * Deliberately breaks from the rest of the app's sharp 2px pixel-UI radius —
 * this is the one interactive "hero" action on this tab, so it gets a
 * softer, more contemporary card treatment instead. */
.roll-tab {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.roll-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem;
  background: linear-gradient(160deg, var(--osrs-panel-light), var(--osrs-panel));
  border: 1px solid var(--osrs-border);
  border-radius: 16px;
}

.team-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.team-tab-chip {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.8rem;
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--osrs-text-muted);
  background: var(--osrs-panel);
  border: 1px solid var(--osrs-border);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.team-tab-chip:hover {
  color: var(--osrs-text-bright);
  transform: translateY(-1px);
}

.team-tab-chip--active {
  color: var(--osrs-text-bright);
  background: var(--osrs-panel-hover);
  border-color: var(--chip-color, var(--osrs-border-gold));
  box-shadow: 0 0 0 1px var(--chip-color, var(--osrs-border-gold)) inset;
}

.team-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.5rem 1rem;
  background: radial-gradient(circle at 50% 0%, var(--osrs-panel-hover), var(--osrs-panel) 70%);
  border: 1px solid var(--preview-color, var(--osrs-border));
  border-radius: 14px;
  box-shadow: 0 0 24px -8px var(--preview-color, transparent);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

/* Fills as much of the preview card as it can, up to a sensible cap — see
 * .team-token--fill, which lets this container fully control the size. */
.team-preview__logo {
  width: min(100%, 220px);
  aspect-ratio: 1;
}

.team-preview__name {
  font-family: var(--font-body);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--osrs-text-bright);
}

.roll-btn {
  width: 100%;
  padding: 0.9rem;
  font-family: var(--font-body);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--osrs-bg);
  background: linear-gradient(135deg, var(--osrs-green), var(--osrs-border-light));
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 4px 16px -4px rgba(39, 174, 96, 0.6);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
}

.roll-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px -4px rgba(39, 174, 96, 0.75);
}

.roll-btn:active:not(:disabled) {
  transform: translateY(0);
}

.roll-btn:disabled {
  cursor: not-allowed;
  color: var(--osrs-text-muted);
  background: var(--osrs-panel-light);
  box-shadow: none;
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
