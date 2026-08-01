<script setup lang="ts">
import { ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { JCard, JCardContent, Mixtape } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { generateId } from '~/utils/timeUtils';
import { buildBlankJCardContent, applyMixtapeToJCard } from '~/utils/jcardDefaults';
import { registerCustomFonts } from '~/utils/fontManager';
import { saveJCardToLocal } from '~/utils/localStorage';
import { loadJCard, createJCard, updateJCard } from '~/utils/jcardDatabase';

const props = defineProps<{
  initialCard: JCard | null;
  currentMixtape: Mixtape | null;
}>();

const auth = useAuthStore();
const ui = useUiStore();

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

async function doSave(target: JCard, feedback: boolean) {
  isSaving.value = true;
  saveJCardToLocal(target); // always persist locally first
  try {
    if (auth.user) {
      let saved: JCard;
      if (persisted) {
        saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
      } else {
        const exists = await loadJCard(target.id);
        if (exists) {
          persisted = true;
          saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
        } else {
          saved = await createJCard(auth.user.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
          persisted = true;
        }
      }
      card.value = { ...card.value, id: saved.id, updatedAt: saved.updatedAt };
    }
    if (feedback) ui.showToast('J-card saved', 'success');
  } catch (e) {
    console.error('Supabase sync failed (card is still saved locally):', e);
    if (feedback) ui.showToast('J-card saved', 'success');
  } finally {
    isSaving.value = false;
  }
}

function schedule(updated: JCard) {
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
  pushHistory(updated);
  schedule(updated);
}

function saveNow() {
  if (timer) clearTimeout(timer);
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
          <span class="jcard-col-label">▧ Outside</span>
          <JCardPreview :content="card.content" />
          <span class="jcard-col-label" style="margin-top:8px">◧ Inside</span>
          <JCardInsidePreview :content="card.content" />
        </div>
      </div>

      <aside class="jcard-view-right">
        <span class="jcard-col-label">⚙ Settings</span>
        <JCardSettings
          :card="card"
          :current-mixtape="currentMixtape"
          :sections="['info', 'presets', 'layout', 'fonts', 'flaps', 'background', 'spine', 'back', 'mixtape', 'export']"
          @title-change="(title: string) => update({ title })"
          @content-change="(content: JCardContent) => update({ content })"
          @mixtape-link="(mixtapeId: string | null) => update({ mixtapeId })"
        />
      </aside>
    </div>
  </div>
</template>
