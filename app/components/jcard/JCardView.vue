<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { JCard, JCardContent, Mixtape } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useRoute } from 'vue-router';
import { useUnsavedStore } from '~/stores/unsaved';
import { generateId } from '~/utils/timeUtils';
import { buildBlankJCardContent, applyMixtapeToJCard } from '~/utils/jcardDefaults';
import { registerCustomFonts } from '~/utils/fontManager';
import { saveJCardToLocal } from '~/utils/localStorage';
import { loadJCard, createJCard, updateJCard } from '~/utils/jcardDatabase';
import { containsProfanity, PROFANITY_MESSAGE } from '~/utils/profanity';
import IconSettings from '~icons/material-symbols/settings-rounded';

const props = defineProps<{
  initialCard: JCard | null;
  currentMixtape: Mixtape | null;
}>();

const auth = useAuthStore();
const ui = useUiStore();
const unsaved = useUnsavedStore();

const COALESCE_MS = 600;
const MAX_HISTORY = 20;

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
onBeforeUnmount(() => unsaved.unregister('jcard'));

// Non-reactive internals (mutating these must NOT trigger a re-render).
let timer: ReturnType<typeof setTimeout> | null = null;
let persisted = !!props.initialCard;
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
  saveJCardToLocal(target); // always persist locally first
  let cloudOk = false;
  try {
    if (auth.user) {
      let saved: JCard;
      if (persisted) {
        saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null, isPublic: target.isPublic ?? false });
      } else {
        const exists = await loadJCard(target.id);
        if (exists) {
          persisted = true;
          saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null, isPublic: target.isPublic ?? false });
        } else {
          saved = await createJCard(auth.user.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null, isPublic: target.isPublic ?? false });
          persisted = true;
        }
      }
      card.value = { ...card.value, id: saved.id, updatedAt: saved.updatedAt };
      // Only mark clean if no further edit was queued while the request was in flight.
      if (target === lastScheduled) cloudDirty.value = false;
      cloudOk = true;
    }
    if (feedback) ui.showToast('J-card saved', 'success');
  } catch (e) {
    console.error('Supabase sync failed (card is still saved locally):', e);
    if (feedback) ui.showToast('J-card saved', 'success');
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
  card.value = updated;
  cloudDirty.value = true;
  pushHistory(updated);
  schedule(updated);
}

function setPublic(isPublic: boolean) {
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
        <span class="jcard-col-label" style="display:inline-flex;align-items:center;gap:5px"><IconSettings class="icon-inline" aria-hidden="true" /> Settings</span>
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
