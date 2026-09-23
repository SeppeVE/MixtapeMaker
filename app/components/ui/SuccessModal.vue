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

<style scoped>
/* .modal-overlay / .modal-content / .modal-close stay global (AuthModal.css);
   .btn and .icon-inline stay global (App.css) — the rules below only reach
   them through an owned ancestor, on elements in this component. */
.success-modal {
  max-width: 440px;
}

.success-modal-note {
  font-size: 12px;
  color: var(--color-text-light);
  line-height: 1.4;
  margin: 0 0 var(--spacing-sm);
}

.success-modal-facts {
  list-style: none;
  margin: 0 0 var(--spacing-md);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1.25;
  color: var(--color-text);
}

.success-modal-facts li::before {
  content: '▸ ';
  opacity: 0.5;
}

/* ── Link + actions ── */
.success-modal-link {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.success-modal-url {
  width: 100%;
  padding: 7px 10px;
  border: 2px solid var(--color-text);
  background: var(--color-white);
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-text);
  box-shadow: var(--bevel-in);
  text-overflow: ellipsis;
}

.success-modal-url:focus {
  outline: none;
  background: rgba(212, 169, 53, 0.1);
}

.success-modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.success-modal-actions .btn {
  flex: 1 1 auto;
  justify-content: center;
}

/* ── Print checklist ── */
.success-modal-checklist {
  border: 2px solid var(--color-text);
  background: var(--color-white);
  box-shadow: var(--shadow-sm);
  padding: 10px 12px;
  margin-bottom: var(--spacing-md);
}

.success-modal-checklist-head {
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1;
  margin-bottom: 6px;
}

.success-modal-checklist ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text);
}

.success-modal-checklist .success-modal-mute {
  margin-top: 8px;
}

.success-modal-done {
  width: 100%;
  justify-content: center;
}

/* ── "Don't show this again" — a text link, never a button that competes ── */
.success-modal-mute {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text-light);
  opacity: 0.7;
  text-decoration: underline;
}
.success-modal-mute:hover { opacity: 1; }

/* ── Coffee footer ── */
.success-modal-support {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 2px dashed rgba(42, 30, 40, 0.25);
}

.success-modal-support-text {
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-light);
  margin: 0 0 var(--spacing-sm);
}

.success-modal-support-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.success-modal-coffee {
  font-size: 17px;
  padding: 4px 14px 2px;
  box-shadow: var(--shadow-sm);
}
.success-modal-coffee:hover { box-shadow: 4px 4px 0 var(--color-text); }

/* Heading with a leading icon. */
.success-modal-heading {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* The coffee icon sits mid-sentence, so it overrides .icon-inline's
   display:block. Nested under the paragraph to out-specify .icon-inline
   (0-1-0) explicitly rather than leaning on stylesheet import order. */
.success-modal-support-text .icon-inline {
  display: inline-block;
  vertical-align: -0.2em;
}
</style>
