<script setup lang="ts">
import type { Team } from '@/types'
import TeamToken from '@/components/board/TeamToken.vue'

defineProps<{
  team: Team | null
}>()

const emit = defineEmits<{
  close: []
}>()

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="team" class="modal-backdrop" @click="handleBackdropClick">
        <div class="modal" role="dialog" :aria-label="`${team.name} members`">
          <header class="modal__header">
            <div class="modal__team">
              <TeamToken :team="team" size="lg" />
              <h2 class="modal__title">{{ team.name }}</h2>
            </div>
            <button class="modal__close" aria-label="Close" @click="emit('close')">✕</button>
          </header>

          <div class="modal__body">
            <h3 class="modal__section-title">Members</h3>
            <ul v-if="team.members.length > 0" class="modal__member-list">
              <li v-for="member in team.members" :key="member" class="modal__member">
                {{ member }}
              </li>
            </ul>
            <p v-else class="modal__no-members">No members listed yet.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal {
  background: var(--osrs-panel);
  border: 2px solid var(--osrs-border-light);
  border-radius: var(--border-radius);
  width: 100%;
  max-width: 360px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--osrs-border);
  background: var(--osrs-panel-light);
}

.modal__team {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal__title {
  font-family: var(--font-display);
  font-size: 0.65rem;
  color: var(--osrs-gold);
}

.modal__close {
  background: none;
  border: 1px solid var(--osrs-border);
  color: var(--osrs-text-muted);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: var(--border-radius);
  font-size: 0.75rem;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.modal__close:hover {
  color: var(--osrs-text-bright);
  border-color: var(--osrs-border-light);
}

.modal__body {
  padding: 1rem;
}

.modal__section-title {
  font-family: var(--font-display);
  font-size: 0.5rem;
  color: var(--osrs-text-muted);
  margin-bottom: 0.6rem;
  text-transform: uppercase;
}

.modal__member-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.modal__member {
  padding: 0.5rem 0.6rem;
  font-size: 0.9rem;
  color: var(--osrs-text-bright);
  background: var(--osrs-panel-light);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
}

.modal__no-members {
  font-size: 0.85rem;
  color: var(--osrs-text-muted);
  font-style: italic;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: translateY(-16px) scale(0.97);
}
</style>
