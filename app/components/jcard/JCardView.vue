<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { JCard, JCardContent, Mixtape } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useRoute } from 'vue-router';
import { useMixtapeStore } from '~/stores/mixtape';
import { useUnsavedStore } from '~/stores/unsaved';
import { isCloudId } from '~/utils/database';
import { generateId } from '~/utils/timeUtils';
import { buildBlankJCardContent, applyMixtapeToJCard } from '~/utils/jcardDefaults';
import { registerCustomFonts } from '~/utils/fontManager';
import { saveJCardToLocal, deleteJCardFromLocal } from '~/utils/localStorage';
import { loadJCard, createJCard, updateJCard } from '~/utils/jcardDatabase';
import { scheduleJCardRender, flushJCardRenders } from '~/utils/jcardRenders';
import { containsProfanity, PROFANITY_MESSAGE } from '~/utils/profanity';
import IconSettings from '~icons/material-symbols/settings-rounded';

const props = defineProps<{
  initialCard: JCard | null;
  currentMixtape: Mixtape | null;
}>();

const auth = useAuthStore();
const ui = useUiStore();
const mixtapeStore = useMixtapeStore();
const unsaved = useUnsavedStore();

const COALESCE_MS = 600;
const MAX_HISTORY = 20;

// Content fingerprint used to tell whether a copy is still an exact duplicate
// of the card it came from (so edit-then-undo doesn't "unlock" it). A card has
// no track list to summarise the way a mixtape does, so this is the design itself.
function contentSignature(c: JCard): string {
  return JSON.stringify({ title: c.title, content: c.content });
}

function makeBlank(userId: string, mixtape: Mixtape | null): JCard {
  const content = mixtape
    ? applyMixtapeToJCard(buildBlankJCardContent(), mixtape, { overwriteCover: true })
    : buildBlankJCardContent();
  return {
    id: generateId(),
    title: mixtape ? `${mixtape.title} — J-Card` : 'Untitled J-Card',
    userId,
    mixtapeId: mixtape?.id ?? null,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Seed once.
const seed = props.initialCard ?? makeBlank(auth.user?.id ?? 'local', props.currentMixtape);
const card = ref<JCard>(seed);
const isSaving = ref(false);
// Edits made this session that the cloud hasn't confirmed yet. Cleared only by
// a successful cloud write, so signed-out editing stays "unsaved".
const cloudDirty = ref(false);

// The card being designed has to live in the store, not only in this
// component. The store is what persists `jcard-active`, and what seeds this
// component when it mounts — so without this write-back a reload (or browser
// back) re-seeds from whatever was open when the designer was *entered*,
// throwing away every edit since. On "New Card" that's nothing at all, so the
// designer came back blank while the library, which reads the `jcards` key
// that autosave does write, still listed the work.
watch(card, (c) => { mixtapeStore.activeCard = c; });

onMounted(() => {
  unsaved.register('jcard', {
    path: useRoute().path,
    kind: 'J-card',
    title: () => card.value.title,
    dirty: () => cloudDirty.value,
    save: async () => {
      if (!auth.user) {
        ui.openAuth();
        return false;
      }
      if (timer) clearTimeout(timer);
      return doSave(card.value, true);
    },
  });
});
onBeforeUnmount(() => {
  unsaved.unregister('jcard');
  // Render any card saved in the last few seconds now instead of waiting it out.
  flushJCardRenders();
});

// Non-reactive internals (mutating these must NOT trigger a re-render).
let timer: ReturnType<typeof setTimeout> | null = null;
// "The cloud already has a row for this id." Only a UUID id can be one: local
// drafts carry a timestamp id from generateId(), and `jcards.id` is a uuid
// column, so querying it with one errors rather than simply missing. Seeding
// this from `!!initialCard` alone was wrong the moment a local draft was
// reopened — and now that a reload re-seeds from the stored card, it would be
// wrong every time.
let persisted = !!props.initialCard && isCloudId(props.initialCard.id);
// Signature of the untouched copy this card started as, or null when it isn't
// tracking a copy at all.
const copySignature: string | null = seed.isCopy ? contentSignature(seed) : null;
let histStack: JCard[] = [seed];
let histIdx = 0;
let lastPushMs = 0;

const canUndo = ref(false);
const canRedo = ref(false);

// Re-register custom fonts when the card's font list changes.
watch(
  () => card.value.content.customFonts,
  (fonts) => { if (fonts?.length) registerCustomFonts(fonts).catch(console.error); },
  { immediate: true },
);

// Resolves true when the cloud now holds `target` (false when signed out or the sync failed).
async function doSave(target: JCard, feedback: boolean): Promise<boolean> {
  isSaving.value = true;
  const localOk = saveJCardToLocal(target); // always persist locally first
  let cloudOk = false;
  // A card that reached neither the browser nor the cloud is gone the moment
  // this tab closes, so never report that one as saved.
  const report = () => {
    if (!feedback) return;
    if (cloudOk || localOk) ui.showToast('J-card saved', 'success');
    else ui.showToast('Could not save — this card is too big for offline storage. Sign in to save it to the cloud.', 'error');
  };
  try {
    if (auth.user) {
      // isCopy rides along on every write: without it a copy edited into
      // something original would stay flagged in the cloud for good.
      const patch = {
        title: target.title,
        content: target.content,
        mixtapeId: target.mixtapeId ?? null,
        isPublic: target.isPublic ?? false,
        isCopy: target.isCopy ?? false,
      };
      let saved: JCard;
      if (persisted) {
        saved = await updateJCard(target.id, patch);
      } else if (isCloudId(target.id)) {
        // A UUID we haven't confirmed yet — a cloud card reopened in a fresh
        // session. It may or may not still be there.
        const exists = await loadJCard(target.id);
        saved = exists
          ? await updateJCard(target.id, patch)
          : await createJCard(auth.user.id, { ...patch, id: target.id, copiedFromId: target.copiedFromId ?? null });
      } else {
        // A local draft reaching the cloud for the first time: let Postgres
        // mint the UUID and adopt it below, dropping the local-id entry so the
        // library doesn't list the card twice.
        saved = await createJCard(auth.user.id, { ...patch, copiedFromId: target.copiedFromId ?? null });
        deleteJCardFromLocal(target.id);
      }
      persisted = true;
      card.value = { ...card.value, id: saved.id, updatedAt: saved.updatedAt };
      // Pre-render it for the 3D library once the edits settle (in the background).
      scheduleJCardRender({ id: saved.id, userId: auth.user.id, content: target.content });
      if (saved.id !== target.id) saveJCardToLocal({ ...target, id: saved.id, updatedAt: saved.updatedAt });
      // Only mark clean if no further edit was queued while the request was in flight.
      if (target === lastScheduled) cloudDirty.value = false;
      cloudOk = true;
    }
    report();
  } catch (e) {
    console.error('Supabase sync failed:', e);
    report();
  } finally {
    isSaving.value = false;
  }
  return cloudOk;
}

let lastScheduled: JCard | null = null;
function schedule(updated: JCard) {
  lastScheduled = updated;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => doSave(updated, false), 1200);
}

function pushHistory(newCard: JCard) {
  const now = Date.now();
  const base = histStack.slice(0, histIdx + 1);
  let next: JCard[];
  if (now - lastPushMs < COALESCE_MS && base.length > 0) {
    next = [...base.slice(0, -1), newCard];
  } else {
    next = [...base, newCard];
  }
  next = next.slice(-MAX_HISTORY);
  histStack = next;
  histIdx = next.length - 1;
  lastPushMs = now;
  canUndo.value = histIdx > 0;
  canRedo.value = false;
}

function undo() {
  if (histIdx <= 0) return;
  histIdx--;
  lastPushMs = 0;
  const prev = histStack[histIdx];
  card.value = prev;
  cloudDirty.value = true;
  schedule(prev);
  canUndo.value = histIdx > 0;
  canRedo.value = true;
}

function redo() {
  if (histIdx >= histStack.length - 1) return;
  histIdx++;
  lastPushMs = 0;
  const nextCard = histStack[histIdx];
  card.value = nextCard;
  cloudDirty.value = true;
  schedule(nextCard);
  canUndo.value = true;
  canRedo.value = histIdx < histStack.length - 1;
}

// Keyboard shortcuts — skipped inside a contenteditable so Tiptap keeps its own undo.
useEventListener(typeof document !== 'undefined' ? document : null, 'keydown', (e: KeyboardEvent) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const active = document.activeElement as HTMLElement | null;
  if (active?.contentEditable === 'true') return;
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
  else if (e.key === 'y') { e.preventDefault(); redo(); }
});

function update(partial: Partial<JCard>) {
  const updated = { ...card.value, ...partial, updatedAt: new Date().toISOString() };
  // A card that started as a copy stops being one the moment its design
  // actually differs from the original — and becomes one again if the user
  // undoes their way back to it.
  if (copySignature !== null) updated.isCopy = contentSignature(updated) === copySignature;
  card.value = updated;
  cloudDirty.value = true;
  pushHistory(updated);
  schedule(updated);
}

function setPublic(isPublic: boolean) {
  // Explore filters unedited copies out anyway — refuse here so the toggle
  // can't look like it worked.
  if (isPublic && card.value.isCopy) {
    ui.showToast('Make it your own first — unedited copies stay private', 'error');
    return;
  }
  if (isPublic && containsProfanity(card.value.title)) {
    ui.showToast(PROFANITY_MESSAGE('card title'), 'error');
    return;
  }
  update({ isPublic });
}

function saveNow() {
  if (timer) clearTimeout(timer);
  lastScheduled = card.value;
  doSave(card.value, true);
}
</script>

<template>
  <div class="jcard-view">
    <!-- Sub-toolbar -->
    <div class="jcard-view-toolbar">
      <h2 class="jcard-view-title">{{ card.title || 'Untitled J-Card' }}</h2>
      <div class="jcard-history-btns">
        <button class="btn" :disabled="!canUndo" title="Undo (⌘Z)" @click="undo">↩</button>
        <button class="btn" :disabled="!canRedo" title="Redo (⌘⇧Z)" @click="redo">↪</button>
      </div>
      <button class="btn btn-primary" :disabled="isSaving" @click="saveNow">
        {{ isSaving ? 'Saving…' : 'Save' }}
      </button>
    </div>

    <!-- 2-column body -->
    <div class="jcard-view-body">
      <div class="jcard-view-main">
        <div class="jcard-view-preview">
          <JCardPreview :content="card.content" label="▧ Outside" />
          <JCardInsidePreview :content="card.content" label="◧ Inside" />
        </div>
      </div>

      <aside class="jcard-view-right">
        <span class="jcard-col-label"><IconSettings class="icon-inline" aria-hidden="true" /> Settings</span>
        <JCardSettings
          :card="card"
          :current-mixtape="currentMixtape"
          :sections="['info', 'presets', 'layout', 'fonts', 'flaps', 'background', 'spine', 'back', 'mixtape', 'export']"
          @title-change="(title: string) => update({ title })"
          @content-change="(content: JCardContent) => update({ content })"
          @mixtape-link="(mixtapeId: string | null) => update({ mixtapeId })"
          @public-change="setPublic"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ── Full-height 3-column designer ── */
.jcard-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Toolbar */
.jcard-view-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--color-paper);
  border-bottom: 2px solid var(--color-text);
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  z-index: 2;
}

.jcard-history-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.jcard-history-btns .btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.jcard-view-title {
  flex: 1;
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

/* 2-column body */
.jcard-view-body {
  display: grid;
  grid-template-columns: 1fr 500px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Main: preview + front panel stacked */
.jcard-view-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* Top: live preview */
.jcard-view-preview {
  flex: 1;
  overflow: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

/* Right: all settings + content */
.jcard-view-right {
  border-left: 2px solid var(--color-text);
  overflow-y: auto;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--color-paper);
}

/* Column section labels */
.jcard-col-label {
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--color-mustard);
  color: var(--color-text);
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow);
  padding: 4px 14px 2px;
  align-self: flex-start;
}

@media screen and (max-width: 768px) {
  /* Switch from fixed-height to natural-scroll */
    .jcard-view {
      height: auto;
      overflow: visible;
    }

  .jcard-view-body {
      grid-template-columns: 1fr;
      overflow: visible;
      min-height: unset;
    }

  .jcard-view-main {
      overflow: visible;
      min-height: unset;
    }

  .jcard-view-preview {
      overflow: visible;
      min-height: unset;
      padding: 12px;
    }

  /* Settings panel: full width, no left border, natural height */
    .jcard-view-right {
      border-left: none;
      border-top: 2px solid var(--color-text);
      overflow-y: visible;
    }
}
</style>
