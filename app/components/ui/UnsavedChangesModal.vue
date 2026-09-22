<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUnsavedStore } from '~/stores/unsaved';
import { useAuthStore } from '~/stores/auth';
import IconCloud from '~icons/ic/baseline-wb-cloudy';
import IconWarning from '~icons/material-symbols/warning-rounded';

// Styled replacement for the browser's "Leave site?" prompt, used for in-app
// navigation. Opened by the router guard (see plugins/unsaved.client.ts).
const unsaved = useUnsavedStore();
const auth = useAuthStore();
const router = useRouter();

const sources = computed(() => unsaved.pending?.sources ?? []);
const canSave = computed(() => sources.value.every((s) => !!s.save));

const summary = computed(() => {
  const parts = sources.value.map((s) => {
    const title = s.title().trim();
    return title ? `your ${s.kind} “${title}”` : `your ${s.kind}`;
  });
  return parts.length <= 1 ? parts[0] ?? '' : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
});

function leave() {
  const to = unsaved.approve();
  if (to) router.push(to);
}

async function saveAndLeave() {
  const ok = await unsaved.saveAll();
  if (ok) leave();
  // On failure the save itself has already toasted why (name it, sign in, …); stay put.
}
</script>

<template>
  <div v-if="unsaved.pending" class="modal-overlay unsaved-overlay" @click="unsaved.stay()">
    <div
      class="unsaved-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      aria-describedby="unsaved-body"
      @click.stop
    >
      <div class="unsaved-tape" aria-hidden="true" />
      <div class="unsaved-head">
        <IconWarning class="unsaved-icon" aria-hidden="true" />
        <h2 id="unsaved-title" class="unsaved-title">Unsaved changes</h2>
      </div>

      <div class="unsaved-body">
        <p id="unsaved-body" class="unsaved-text">
          {{ summary ? summary.charAt(0).toUpperCase() + summary.slice(1) : 'Your work' }}
          {{ sources.length > 1 ? 'have' : 'has' }} changes that aren't saved to the cloud.
          If you leave now they'll only exist in this browser and won't be on your other devices.
        </p>
        <p v-if="!auth.user" class="unsaved-hint">
          You're not signed in — saving to the cloud will ask you to sign in first.
        </p>

        <div class="unsaved-actions">
          <button class="lp-btn lp-btn-mustard" :disabled="unsaved.saving" @click="unsaved.stay()">← Stay here</button>
          <button v-if="canSave" class="lp-btn lp-btn-forest" :disabled="unsaved.saving" @click="saveAndLeave">
            <IconCloud v-if="!unsaved.saving" class="icon-inline" aria-hidden="true" />
            {{ unsaved.saving ? 'Saving…' : 'Save & leave' }}
          </button>
          <button class="unsaved-leave" :disabled="unsaved.saving" @click="leave">Leave without saving</button>
        </div>
      </div>
      <div class="unsaved-tape" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
/* Vue scopes @keyframes names in a scoped block, so unsaved-shake and
   unsaved-blink stop being global identifiers. */
.unsaved-overlay {
  z-index: 1100;                         /* above the auth/feedback modals */
  background: rgba(42, 30, 40, 0.78);
}

.unsaved-modal {
  width: min(480px, 92vw);
  background: var(--color-paper);
  border: 3px solid var(--color-text);
  box-shadow: var(--shadow-lg), 0 0 0 6px rgba(212, 169, 53, 0.35);
  position: relative;
  animation: unsaved-shake 0.42s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes unsaved-shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
  40%, 60% { transform: translate3d(6px, 0, 0); }
}

/* Hazard tape */
.unsaved-tape {
  height: 12px;
  background: repeating-linear-gradient(
    -45deg,
    var(--color-mustard) 0 14px,
    var(--color-text) 14px 28px
  );
  border-bottom: 2px solid var(--color-text);
}
.unsaved-tape:last-child {
  border-bottom: none;
  border-top: 2px solid var(--color-text);
}

.unsaved-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px 8px;
  background: var(--color-primary);
  color: var(--color-paper);
  border-bottom: 2px solid var(--color-text);
}

.unsaved-icon {
  font-size: 26px;
  line-height: 1;
  color: var(--color-mustard);
  animation: unsaved-blink 1.1s steps(2, start) infinite;
}
@keyframes unsaved-blink {
  to { visibility: hidden; }
}

.unsaved-title {
  font-family: var(--font-display);
  font-weight: normal;
  font-size: 28px;
  letter-spacing: 1.5px;
  line-height: 1;
  margin: 0;
  text-transform: uppercase;
}

.unsaved-body {
  padding: 18px 18px 20px;
}

.unsaved-text {
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0 0 8px;
}

.unsaved-hint {
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-text-light);
  opacity: 0.85;
  margin: 0;
}

.unsaved-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
}
.unsaved-actions .lp-btn {
  font-size: 18px;
}

.unsaved-leave {
  margin-left: auto;
  background: none;
  border: none;
  padding: 6px 2px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
}
.unsaved-leave:hover:not(:disabled) { color: var(--color-text); }
.unsaved-leave:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 600px) {
  .unsaved-actions .lp-btn {
    flex: 1 1 100%;
    justify-content: center;
  }
  .unsaved-leave {
    margin: 4px auto 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .unsaved-modal { animation: none; }
    .unsaved-icon { animation: none; }
  }
}
@media (prefers-reduced-motion: reduce) {
  .unsaved-modal { animation: none; }
  .unsaved-icon { animation: none; }
}
</style>
