<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useUiStore } from '~/stores/ui';
import { useSupportStore } from '~/stores/support';
import { SUPPORT_URL } from '~/utils/supportPrompt';
import { trackEvent } from '~/utils/analytics';
import IconCheck from '~icons/material-symbols/check-rounded';
import IconCoffee from '~icons/material-symbols/coffee-rounded';

// Self-contained, mirrors FeedbackModal: driven by the ui store. Fires after an
// action has succeeded and never blocks it. The coffee block at the bottom is
// gated by the support store; the modal itself is not (see ui.openSuccessModal).
const ui = useUiStore();
const support = useSupportStore();

const modal = computed(() => ui.successModal);

// Keyed by URL rather than a single boolean so several links (one per side)
// can each show their own "Copied" feedback independently.
const copiedUrl = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

watch(modal, (m) => {
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedUrl.value = m?.copied && m.link ? m.link.url : null;
});
onBeforeUnmount(() => { if (copiedTimer) clearTimeout(copiedTimer); });

function close() {
  ui.closeSuccessModal();
}

useEventListener(typeof document !== 'undefined' ? document : null, 'keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape' && modal.value) close();
});

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    copiedUrl.value = url;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => { copiedUrl.value = null; }, 2500);
  } catch {
    ui.showToast('Could not copy — select the link and copy it by hand', 'error');
  }
}

function selectAll(e: FocusEvent) {
  (e.target as HTMLInputElement).select();
}

// Clicking the coffee link is what marks a donor (180-day cooldown); the link
// itself opens in a new tab so the modal stays where it was.
function handleSupportClick() {
  if (!modal.value) return;
  support.markSupportBlockClicked();
  trackEvent('support_block_clicked', { trigger: modal.value.trigger });
}

// "Don't show this again" is distinct from closing (×): only this opts out.
function handleSupportOptOut() {
  if (!modal.value) return;
  support.optOutOfSupportBlock();
  trackEvent('support_block_opted_out', { trigger: modal.value.trigger });
  ui.hideSupportBlock();
}

function handleChecklistOptOut() {
  support.optOutOfPrintChecklist();
  trackEvent('print_checklist_opted_out');
  ui.hideChecklist();
}
</script>

<template>
  <div v-if="modal" class="modal-overlay" @click="close">
    <div
      class="modal-content success-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="modal.title"
      @click.stop
    >
      <button class="modal-close" aria-label="Close" @click="close">×</button>

      <h2 class="success-modal-heading"><IconCheck class="icon-inline" aria-hidden="true" /> {{ modal.title }}</h2>

      <p v-if="modal.note" class="success-modal-note">{{ modal.note }}</p>

      <ul v-if="modal.facts?.length" class="success-modal-facts">
        <li v-for="fact in modal.facts" :key="fact">{{ fact }}</li>
      </ul>

      <div v-if="modal.link" class="success-modal-link">
        <input
          class="success-modal-url"
          type="text"
          readonly
          :value="modal.link.url"
          aria-label="Link"
          @focus="selectAll"
        />
        <div class="success-modal-actions">
          <a
            class="btn btn-primary"
            :href="modal.link.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ modal.link.openLabel }} ↗
          </a>
          <button type="button" class="btn" @click="copyLink(modal.link.url)">
            <IconCheck v-if="copiedUrl === modal.link.url" class="icon-inline" aria-hidden="true" />
            {{ copiedUrl === modal.link.url ? 'Copied' : 'Copy link' }}
          </button>
        </div>
      </div>

      <div v-for="l in modal.links" :key="l.url" class="success-modal-link">
        <input
          class="success-modal-url"
          type="text"
          readonly
          :value="l.url"
          aria-label="Link"
          @focus="selectAll"
        />
        <div class="success-modal-actions">
          <a
            class="btn btn-primary"
            :href="l.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ l.openLabel }} ↗
          </a>
          <button type="button" class="btn" @click="copyLink(l.url)">
            <IconCheck v-if="copiedUrl === l.url" class="icon-inline" aria-hidden="true" />
            {{ copiedUrl === l.url ? 'Copied' : 'Copy link' }}
          </button>
        </div>
      </div>

      <div v-if="modal.showChecklist && modal.checklist" class="success-modal-checklist">
        <div class="success-modal-checklist-head">{{ modal.checklist.heading }}</div>
        <ul>
          <li v-for="item in modal.checklist.items" :key="item">{{ item }}</li>
        </ul>
        <button type="button" class="success-modal-mute" @click="handleChecklistOptOut">
          Don't show this checklist again
        </button>
      </div>

      <button v-if="!modal.link && !modal.links?.length" type="button" class="btn btn-primary success-modal-done" @click="close">
        Done
      </button>

      <div v-if="modal.showSupport" class="success-modal-support">
        <p class="success-modal-support-text">
          Thanks for using Mixtape Maker — it's free and ad-free.
          If you liked it, consider buying me a coffee <IconCoffee class="icon-inline" aria-hidden="true" />
        </p>
        <div class="success-modal-support-row">
          <a
            class="lp-btn lp-btn-mustard success-modal-coffee"
            :href="SUPPORT_URL"
            target="_blank"
            rel="noopener noreferrer"
            @click="handleSupportClick"
          >
            <IconCoffee class="icon-inline" aria-hidden="true" /> Buy me a coffee
          </a>
          <button type="button" class="success-modal-mute" @click="handleSupportOptOut">
            Don't show this again
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
