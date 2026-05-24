<script setup lang="ts">
import { boardConfig } from '@/data/boardConfig'

const tiers = [
  {
    tier: 1,
    label: 'Tier 1 — Easy',
    range: '1–24',
    description: 'Beginner tasks. Great for warming up and getting your team on the board.',
  },
  {
    tier: 2,
    label: 'Tier 2 — Medium',
    range: '25–51',
    description: 'Intermediate challenges. Expect some grinding and coordination.',
  },
  {
    tier: 3,
    label: 'Tier 3 — Hard',
    range: '52–81',
    description: 'End-game content. Only the most prepared teams will reach these tiles.',
  },
]
</script>

<template>
  <div class="event-info-view">
    <div class="event-info-view__content">
      <div class="osrs-panel">
        <h1 class="osrs-title" style="margin-bottom: 1rem">Event Info</h1>
        <p class="event-info-view__intro">
          Welcome to TEA Snakes &amp; Ladders! Roll dice, complete OSRS tasks, and race across the
          {{ boardConfig.totalTiles }}-tile board. Land on a ladder to leap ahead, or watch out for
          snakes that send you back!
        </p>
      </div>

      <div class="osrs-panel">
        <h2 class="osrs-title" style="margin-bottom: 0.75rem">How It Works</h2>
        <ol class="rules-list">
          <li>Each team takes turns rolling the dice.</li>
          <li>Your team advances the rolled number of tiles.</li>
          <li>To move, your team must complete the task on the tile you land on.</li>
          <li>Landing on a <strong class="highlight-green">ladder</strong> advances you further.</li>
          <li>Landing on a <strong class="highlight-red">snake</strong> sends you back.</li>
          <li>First team to reach or pass tile {{ boardConfig.totalTiles }} wins!</li>
        </ol>
      </div>

      <div class="tiers-grid">
        <div
          v-for="tier in tiers"
          :key="tier.tier"
          class="osrs-panel tier-card"
          :class="`tier-${tier.tier}`"
        >
          <h3 class="tier-card__title">{{ tier.label }}</h3>
          <span class="tier-card__range">Tiles {{ tier.range }}</span>
          <p class="tier-card__desc">{{ tier.description }}</p>
        </div>
      </div>

      <div class="osrs-panel">
        <h2 class="osrs-title" style="margin-bottom: 0.75rem">Snakes &amp; Ladders</h2>
        <div class="specials-grid">
          <div class="specials-grid__col">
            <h3 class="specials-grid__label highlight-green">Ladders</h3>
            <ul class="specials-list">
              <li v-for="ladder in boardConfig.ladders" :key="ladder.from">
                Tile {{ ladder.from }} → {{ ladder.to }}
              </li>
            </ul>
          </div>
          <div class="specials-grid__col">
            <h3 class="specials-grid__label highlight-red">Snakes</h3>
            <ul class="specials-list">
              <li v-for="snake in boardConfig.snakes" :key="snake.from">
                Tile {{ snake.from }} → {{ snake.to }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.event-info-view {
  flex: 1;
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.event-info-view__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-info-view__intro {
  font-size: 0.95rem;
  color: var(--osrs-text);
  line-height: 1.7;
  margin-top: 0.5rem;
}

.rules-list {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--osrs-text);
  line-height: 1.6;
}

.highlight-green { color: var(--osrs-green); }
.highlight-red { color: var(--osrs-red); }

.tiers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.tier-card {
  border-color: var(--tile-border);
  background: var(--tile-bg);
}

.tier-card__title {
  font-family: var(--font-display);
  font-size: 0.6rem;
  color: var(--tile-text);
  margin-bottom: 0.25rem;
}

.tier-card__range {
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--osrs-text-muted);
  display: block;
  margin-bottom: 0.5rem;
}

.tier-card__desc {
  font-size: 0.85rem;
  color: var(--osrs-text);
  line-height: 1.6;
}

.specials-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
}

.specials-grid__label {
  font-family: var(--font-display);
  font-size: 0.55rem;
  margin-bottom: 0.5rem;
}

.specials-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--osrs-text);
}
</style>
