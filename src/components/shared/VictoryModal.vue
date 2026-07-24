<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { gameStore } from '@/stores/gameStore'

const winningTeam = computed(() =>
  gameStore.state.teams.find((t) => t.id === gameStore.state.winnerTeamId),
)

const show = computed(() => !!winningTeam.value && !gameStore.state.victoryDismissed)

function close() {
  gameStore.dismissVictory()
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null
let launchTimer: number | null = null

const FIREWORK_COLORS = ['#f2c94c', '#27ae60', '#eb5757', '#2f80ed', '#f2fbe9']
const GRAVITY = 0.03
const PARTICLE_COUNT = 40

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
}

let particles: Particle[] = []

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

function spawnFirework() {
  const canvas = canvasRef.value
  if (!canvas) return

  const x = Math.random() * canvas.width
  const y = Math.random() * canvas.height * 0.5 + 40
  const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]!

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT
    const speed = 1.5 + Math.random() * 2.5
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0,
      maxLife: 50 + Math.random() * 20,
    })
  }
}

function tick() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  particles = particles.filter((p) => p.life < p.maxLife)

  for (const p of particles) {
    p.vy += GRAVITY
    p.x += p.vx
    p.y += p.vy
    p.life++

    ctx.globalAlpha = Math.max(1 - p.life / p.maxLife, 0)
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  rafId = requestAnimationFrame(tick)
}

function startFireworks() {
  const canvas = canvasRef.value
  if (!canvas) return

  resizeCanvas()
  ctx = canvas.getContext('2d')
  window.addEventListener('resize', resizeCanvas)

  spawnFirework()
  launchTimer = window.setInterval(spawnFirework, 700)
  rafId = requestAnimationFrame(tick)
}

function stopFireworks() {
  if (launchTimer !== null) {
    clearInterval(launchTimer)
    launchTimer = null
  }
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  window.removeEventListener('resize', resizeCanvas)
  particles = []
}

watch(
  show,
  async (isVisible) => {
    if (isVisible) {
      await nextTick()
      startFireworks()
    } else {
      stopFireworks()
    }
  },
  { immediate: true },
)

onUnmounted(stopFireworks)
</script>

<template>
  <Teleport to="body">
    <Transition name="victory">
      <div v-if="show && winningTeam" class="victory-backdrop">
        <canvas ref="canvasRef" class="victory-backdrop__fireworks" aria-hidden="true" />

        <div class="victory-modal" role="dialog" aria-label="Victory">
          <button class="victory-modal__close" aria-label="Close" @click="close">✕</button>

          <p class="victory-modal__eyebrow">Victory!</p>

          <img
            v-if="winningTeam.logoPath"
            :src="winningTeam.logoPath"
            :alt="winningTeam.name"
            class="victory-modal__logo"
          />

          <h1 class="victory-modal__team-name">{{ winningTeam.name }}</h1>

          <p class="victory-modal__subtitle">has completed the board!</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.victory-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.victory-backdrop__fireworks {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.victory-modal {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: var(--osrs-panel);
  border: 2px solid var(--osrs-border-gold);
  border-radius: var(--border-radius);
  padding: 2.5rem 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow:
    0 0 60px rgba(39, 174, 96, 0.35),
    0 8px 32px rgba(0, 0, 0, 0.8);
}

.victory-modal__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: 1px solid var(--osrs-border);
  color: var(--osrs-text-muted);
  cursor: pointer;
  padding: 0.3rem 0.7rem;
  border-radius: var(--border-radius);
  font-size: 0.95rem;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.victory-modal__close:hover {
  color: var(--osrs-text-bright);
  border-color: var(--osrs-border-light);
}

.victory-modal__eyebrow {
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--osrs-gold);
  letter-spacing: 0.05em;
}

.victory-modal__logo {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 50%;
  border: 3px solid var(--osrs-border-gold);
  box-shadow: 0 0 30px rgba(39, 174, 96, 0.45);
}

.victory-modal__team-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--osrs-text-bright);
  line-height: 1.4;
}

.victory-modal__subtitle {
  font-size: 1.05rem;
  color: var(--osrs-text);
}

.victory-enter-active,
.victory-leave-active {
  transition: opacity var(--transition-normal);
}

.victory-enter-active .victory-modal,
.victory-leave-active .victory-modal {
  transition: transform var(--transition-normal);
}

.victory-enter-from,
.victory-leave-to {
  opacity: 0;
}

.victory-enter-from .victory-modal,
.victory-leave-to .victory-modal {
  transform: scale(0.9);
}
</style>
