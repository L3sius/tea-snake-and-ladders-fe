# TEA Snakes & Ladders FE

Vue 3 + TypeScript + Vite frontend for the TEA clan's OSRS Snakes & Ladders event.

## Stack
- Vue 3 (Composition API, `<script setup>`)
- TypeScript
- Vite + vite-plugin-vue-devtools
- Vue Router (hash history)
- No Pinia — plain reactive store in `src/stores/gameStore.ts`
- Prettier (no semicolons, single quotes, 100-char print width)

## Commands
```bash
npm run dev        # dev server
npm run build      # type-check + build
npm run type-check # vue-tsc only
npm run format     # prettier src/
```

## Project Structure
```
src/
├── assets/main.css         # global CSS variables & OSRS theme
├── components/
│   ├── board/
│   │   ├── GameBoard.vue   # 9x9 CSS grid board
│   │   ├── BoardTile.vue   # individual clickable tile
│   │   ├── TeamToken.vue   # circular team marker
│   │   └── TileModal.vue   # tile detail modal (Teleport)
│   ├── dice/
│   │   └── DiceRoll.vue    # animated dice roll overlay
│   └── shared/
│       └── NavBar.vue
├── data/
│   ├── boardConfig.ts      # 9x9 board, tier ranges, snakes/ladders, grid helpers
│   ├── tiles.ts            # tile definitions (populate with real tasks)
│   └── teams.ts            # initial team list (update before event)
├── router/index.ts
├── services/sseService.ts  # SSE connection (auto-reconnect on error)
├── stores/gameStore.ts     # reactive state: teams, activeDiceRoll, connected
├── types/index.ts          # shared TypeScript interfaces
└── views/
    ├── BoardView.vue       # main live board page
    ├── LeaderboardView.vue
    ├── EventInfoView.vue
    └── DevView.vue         # mock dice rolls / board updates without a backend
```

## Board Layout
- 9×9 = 81 tiles, snaking left→right on odd rows (from bottom), right→left on even rows
- Tier 1: tiles 1–24, Tier 2: 25–51, Tier 3: 52–81
- Board background image: `/public/images/board.png` (upload custom artwork here)
- Team logos: `/public/images/teams/<filename>.png`

## Environment Variables
```
VITE_SSE_URL=http://localhost:3000/events   # SSE endpoint (default)
```

## Coding Conventions
- SFC order: `<script setup>` → `<template>` → `<style scoped>`
- CSS: scoped per component, global vars in `main.css`. BEM-ish class names.
- No comments unless the WHY is non-obvious
- No Pinia unless complexity demands it
- Always ask before adding new dependencies
- Responsive design — mobile breakpoint at 768px and 480px
- Follow Vue recommended style guide: https://vuejs.org/style-guide/rules-recommended.html
