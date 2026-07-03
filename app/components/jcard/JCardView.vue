<script setup lang="ts">
import type { JCard, JCardContent, Mixtape } from '~/types';
import { buildBlankJCardContent, applyMixtapeToJCard } from '~/utils/jcardDefaults';
import { generateId } from '~/utils/timeUtils';
import { saveJCardToLocal } from '~/utils/localStorage';
import { createJCard, updateJCard, loadJCard } from '~/utils/jcardDatabase';
import { registerCustomFonts } from '~/utils/fontManager';
import '~/assets/styles/jcard/JCardView.css';

const props = defineProps<{
  initialCard: JCard | null;
  currentMixtape: Mixtape | null;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}>();

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

// ─── History helpers ────────────────────────────────────────────────────────
const COALESCE_MS = 600;
const MAX_HISTORY = 20;

// ────────────────────────────────────────────────────────────────────────────

const { user } = useAuth();
const seed = props.initialCard ?? makeBlank(user.value?.id ?? 'local', props.currentMixtape);
const card = ref<JCard>(seed);
const isSaving = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let persisted = !!props.initialCard;

// ── Undo / redo stack (plain vars → no spurious re-renders for stack internals) ──
let histStack: JCard[] = [seed];
let histIdx = 0;
let lastPushMs = 0;
const canUndo = ref(false);
const canRedo = ref(false);

// Re-register custom fonts whenever the card's font list changes so the
// preview and editors always have them available (e.g. after opening an
// existing card that has stored fonts).
watch(
  () => card.value.content.customFonts,
  (fonts) => {
    if (fonts?.length) registerCustomFonts(fonts).catch(console.error);
  },
  { immediate: true }
);

const doSave = async (target: JCard, feedback: boolean) => {
  isSaving.value = true;
  // Always persist to localStorage first — this guarantees the card is never lost.
  saveJCardToLocal(target);
  try {
    if (user.value) {
      // Also sync to Supabase when logged in.
      let saved: JCard;
      if (persisted) {
        saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
      } else {
        const exists = await loadJCard(target.id);
        if (exists) {
          persisted = true;
          saved = await updateJCard(target.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
        } else {
          saved = await createJCard(user.value.id, { title: target.title, content: target.content, mixtapeId: target.mixtapeId ?? null });
          persisted = true;
        }
      }
      card.value = { ...card.value, id: saved.id, updatedAt: saved.updatedAt };
    }
    if (feedback) props.showToast('J-card saved', 'success');
  } catch (e) {
    console.error('Supabase sync failed (card is still saved locally):', e);
    // Don't show an error — card is safely in localStorage.
    if (feedback) props.showToast('J-card saved', 'success');
  } finally {
    isSaving.value = false;
  }
};

const schedule = (updated: JCard) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => doSave(updated, false), 1200);
};

// ── History mutations ──────────────────────────────────────────────────────
const pushHistory = (newCard: JCard) => {
  const now = Date.now();
  const base = histStack.slice(0, histIdx + 1);
  let next: JCard[];
  if (now - lastPushMs < COALESCE_MS && base.length > 0) {
    // Coalesce rapid edits: replace the current tip instead of adding a new entry.
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
};

const undo = () => {
  if (histIdx <= 0) return;
  histIdx--;
  lastPushMs = 0; // break coalescing after navigation
  const prev = histStack[histIdx]!;
  card.value = prev;
  schedule(prev);
  canUndo.value = histIdx > 0;
  canRedo.value = true;
};

const redo = () => {
  if (histIdx >= histStack.length - 1) return;
  histIdx++;
  lastPushMs = 0;
  const next = histStack[histIdx]!;
  card.value = next;
  schedule(next);
  canUndo.value = true;
  canRedo.value = histIdx < histStack.length - 1;
};

// Keyboard shortcuts — Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z.
// Skipped when focus is inside a contenteditable so Tiptap's own
// per-editor undo still works for fine-grained text edits.
const keyHandler = (e: KeyboardEvent) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  const active = document.activeElement as HTMLElement | null;
  if (active?.contentEditable === 'true') return; // let Tiptap handle it
  if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  else if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
  else if (e.key === 'y') { e.preventDefault(); redo(); }
};
onMounted(() => document.addEventListener('keydown', keyHandler));
onUnmounted(() => document.removeEventListener('keydown', keyHandler));

const update = (partial: Partial<JCard>) => {
  const updated = { ...card.value, ...partial, updatedAt: new Date().toISOString() };
  card.value = updated;
  pushHistory(updated);
  schedule(updated);
};

const saveNow = () => {
  if (timer) clearTimeout(timer);
  doSave(card.value, true);
};
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
      <!-- MAIN — outside + inside previews -->
      <div class="jcard-view-main">
        <div class="jcard-view-preview">
          <span class="jcard-col-label">▧ Outside</span>
          <JCardPreview :content="card.content" />
          <span class="jcard-col-label" style="margin-top: 8px">◧ Inside</span>
          <JCardInsidePreview :content="card.content" />
        </div>
      </div>

      <!-- RIGHT — all settings + content -->
      <aside class="jcard-view-right">
        <span class="jcard-col-label">⚙ Settings</span>
        <JCardSettings
          :card="card"
          :current-mixtape="currentMixtape"
          :on-title-change="(title) => update({ title })"
          :on-content-change="(content: JCardContent) => update({ content })"
          :on-mixtape-link="(mixtapeId) => update({ mixtapeId })"
          :sections="['info', 'presets', 'layout', 'fonts', 'flaps', 'background', 'spine', 'back', 'mixtape', 'export']"
        />
      </aside>
    </div>
  </div>
</template>
