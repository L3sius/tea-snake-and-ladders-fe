<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const DINK_CONFIG_URL = 'https://api.tea-osrs.com/config'
const copied = ref(false)

function copyUrl() {
  navigator.clipboard.writeText(DINK_CONFIG_URL).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="faq">
      <div v-if="open" class="faq-backdrop" @click="handleBackdropClick">
        <div class="faq-modal" role="dialog" aria-label="Dink setup guide">
          <button class="faq-close" aria-label="Close" @click="emit('close')">✕</button>

          <h2 class="faq-title">Setup Guide</h2>
          <p class="faq-subtitle">How to connect the Dink plugin</p>

          <ol class="faq-steps">
            <li>Install <strong>Dink</strong> from the RuneLite Plugin Hub.</li>
            <li>Open <strong>Dink Settings → Advanced</strong>.</li>
            <li>
              Paste the dynamic config URL:
              <button class="faq-code" @click="copyUrl">
                <code>{{ DINK_CONFIG_URL }}</code>
                <span class="faq-copy-hint">{{ copied ? 'Copied!' : 'Click to copy' }}</span>
              </button>
            </li>
            <li>Set <strong>Import policy</strong> to <strong>Overwrite Webhooks</strong>.</li>
            <li>Turn the Dink plugin <strong>off</strong>, then back <strong>on</strong>.</li>
            <li>Close the settings panel using the <strong>'&lt;'</strong> back arrow.</li>
          </ol>

          <p class="faq-note">
            ⚠ Manually changing Dink settings afterward may cause your actions to be tracked
            incorrectly.
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.faq-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.faq-modal {
  position: relative;
  width: 100%;
  max-width: 480px;
  padding: 1.75rem;
  background: var(--osrs-panel);
  border: 2px solid var(--osrs-border-gold);
  border-radius: var(--border-radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
}

.faq-close {
  position: absolute;
  top: 0.75rem;
  right: 0.9rem;
  background: none;
  border: 1px solid var(--osrs-border);
  color: var(--osrs-text-muted);
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  border-radius: var(--border-radius);
  font-size: 0.9rem;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.faq-close:hover {
  color: var(--osrs-text-bright);
  border-color: var(--osrs-border-light);
}

.faq-title {
  font-family: var(--font-display);
  font-size: 0.9rem;
  color: var(--osrs-gold);
  margin-bottom: 0.4rem;
}

.faq-subtitle {
  font-size: 0.95rem;
  color: var(--osrs-text-muted);
  margin-bottom: 1.25rem;
}

.faq-steps {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding-left: 1.25rem;
  color: var(--osrs-text);
  font-size: 1rem;
  line-height: 1.5;
}

.faq-steps strong {
  color: var(--osrs-text-bright);
  font-weight: 600;
}

.faq-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: var(--osrs-bg);
  border: 1px solid var(--osrs-border);
  border-radius: var(--border-radius);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color var(--transition-fast);
}

.faq-code:hover {
  border-color: var(--osrs-border-gold);
}

.faq-code code {
  font-family: var(--font-display);
  font-size: 0.6rem;
  color: var(--osrs-gold);
  word-break: break-all;
}

.faq-copy-hint {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--osrs-text-muted);
}

.faq-note {
  margin-top: 1.25rem;
  padding: 0.65rem;
  font-size: 0.9rem;
  font-style: italic;
  color: var(--osrs-text-muted);
  background: var(--osrs-panel-light);
  border-left: 3px solid var(--osrs-border-gold);
}

.faq-enter-active,
.faq-leave-active {
  transition: opacity var(--transition-normal);
}

.faq-enter-active .faq-modal,
.faq-leave-active .faq-modal {
  transition: transform var(--transition-normal);
}

.faq-enter-from,
.faq-leave-to {
  opacity: 0;
}

.faq-enter-from .faq-modal,
.faq-leave-to .faq-modal {
  transform: translateY(-16px) scale(0.97);
}
</style>
