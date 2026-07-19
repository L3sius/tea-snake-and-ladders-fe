# TEA Snakes & Ladders — Frontend

Live event board for the TEA clan's OSRS Snakes & Ladders competition. Teams race across a 9×9 board completing OSRS tasks, advancing when tasks are accomplished and sliding back (or leaping forward) on snakes and ladders.

---

## Tech stack

| | |
|---|---|
| Framework | Vue 3 — Composition API, `<script setup>` |
| Language | TypeScript |
| Build | Vite |
| Routing | Vue Router (hash history) |
| State | Plain `reactive()` store — no Pinia |
| Realtime | Server-Sent Events (SSE) |
| Styling | Scoped CSS, OSRS pixel-art theme, Press Start 2P font |

---

## Getting started

```bash
npm install
npm run dev       # dev server → http://localhost:5173
npm run build     # type-check + production build
npm run type-check
npm run format    # prettier
```

---

## Environment variables

Create a `.env.local` file in the project root:

```env
VITE_SSE_URL=http://localhost:3000/events
```

The default value is `http://localhost:3000/events`. The frontend connects automatically on load and reconnects on disconnect.

---

## Project structure

```
src/
├── assets/
│   └── main.css                 # Global CSS variables & OSRS theme
├── components/
│   ├── board/
│   │   ├── GameBoard.vue        # 9×9 CSS grid + SVG snake/ladder overlay + token overlay
│   │   ├── BoardTile.vue        # Clickable tile (tier colour, occupied highlight)
│   │   ├── TeamToken.vue        # Circular team marker (logo or initial)
│   │   └── TileModal.vue        # Tile detail modal (Teleport to body)
│   ├── dice/
│   │   └── DiceRoll.vue         # 3-D CSS cube dice animation overlay
│   ├── shared/
│   │   └── NavBar.vue           # Top nav, Roll Dice / Force / Reset dev controls
│   └── tracker/
│       └── ActivityTracker.vue  # Left sidebar — Live Updates + Roll Log tabs
├── data/
│   ├── boardConfig.ts           # Board dimensions, tier ranges, snakes & ladders, grid helpers
│   ├── mockGetTeams.json        # Mock getTeams response (id/name/members) — swap for the real endpoint later
│   ├── getTeams.ts              # Parses the getTeams response into Team[]
│   ├── teamPresentation.ts      # Frontend-owned color/logo per team id (never sent by getTeams)
│   ├── mockLogHistory.json      # Mock log_history response — swap for the real endpoint later
│   ├── logHistory.ts            # Parses log_history into RollHistoryEntry[] and team positions
│   ├── mockLiveActivity.json    # Mock getLiveActivity response — swap for the real endpoint later
│   ├── liveActivity.ts          # Parses getLiveActivity into ActivityEntry[]
│   └── tiles.ts                 # Tile definitions — add task names/descriptions here
├── router/
│   └── index.ts
├── services/
│   └── sseService.ts            # SSE connection with auto-reconnect
├── stores/
│   └── gameStore.ts             # Reactive state: teams, positions, dice roll, history
├── types/
│   └── index.ts                 # Shared TypeScript interfaces
└── views/
    ├── BoardView.vue            # Main live board page
    ├── LeaderboardView.vue
    └── EventInfoView.vue
```

---

## Board layout

- **9 × 9 grid** — 81 tiles total, snaking left→right on odd rows from the bottom
- **3 tiers** — Tier 1: tiles 1–24 · Tier 2: 25–51 · Tier 3: 52–81
- **Board background** — place custom artwork at `/public/images/board.png`
- **Snakes & ladders** — configured in `src/data/boardConfig.ts`; drawn as SVG lines over the board

---

## Before the event — checklist

### Teams

Roster (id, name, members/accounts) comes from the `getTeams` endpoint — mocked in
`src/data/mockGetTeams.json` until the real backend exists. Edit that file to add real teams:

```json
{
  "id": 1,
  "name": "Actual Team Name",
  "members": [
    { "displayName": "PlayerOne", "accounts": [{ "name": "PlayerOne", "gold": 0, "items": 0 }] }
  ]
}
```

Color and logo are frontend-owned and not part of `getTeams` — set them per team id in
`src/data/teamPresentation.ts`:

```ts
1: { color: '#e74c3c', logoPath: '/images/teams/team1.png' },  // place PNG in public/images/teams/
```

### Tiles / tasks

Edit `src/data/tiles.ts` — add a `name` and `description` for each tile. These appear in the click-to-open tile modal.

### Snakes & ladders

Edit the `snakes` and `ladders` arrays in `src/data/boardConfig.ts`:

```ts
snakes:  [{ from: 62, to: 19 }, ...],
ladders: [{ from: 4,  to: 14 }, ...],
```

### Backend SSE events

The SSE service (`src/services/sseService.ts`) listens for these event types on `VITE_SSE_URL`:

| Event | Payload |
|---|---|
| `dice_rolled` | `DiceRollEvent` — triggers dice animation and token movement |
| `board_updated` | `{ teams: Team[] }` — full state sync |
| `task_progress` | `{ teamId, tileId, dropsCollected }` — updates task progress bars |

---

## Token animation

Tokens are absolutely positioned over the board using CSS `left`/`top` percentages that map to the same coordinate space as the SVG snake/ladder lines. Transitions are `0.22s ease` for normal steps and `1s cubic-bezier` for snake/ladder slides — the token visually follows the drawn line.

---

## Dice

3-D CSS cube with `transform-style: preserve-3d`. Six keyframe animations (`roll-to-1` … `roll-to-6`) rotate the cube on X and Y axes only (no Z tilt). Each animation ends with the exact face matching the roll result facing the viewer. Duration: 2.8 s with `ease-out`.
