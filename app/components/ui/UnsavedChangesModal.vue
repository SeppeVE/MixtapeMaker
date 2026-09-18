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
