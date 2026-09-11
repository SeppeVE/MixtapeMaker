import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { navigateTo } from '#app';
import type { Mixtape, CassetteLength, JCard } from '~/types';
import { useUiStore } from '~/stores/ui';
import { useAuthStore } from '~/stores/auth';
import { generateId } from '~/utils/timeUtils';
import { DEFAULT_MIXTAPE_TITLE, isMixtapeUntitled } from '~/utils/mixtapeTitle';
import {
  saveMixtape,
  toggleMixtapePublic,
  enableMixtapeShare,
  disableMixtapeShare,
} from '~/utils/database';
import {
  loadMixtapeFromLocal,
  saveMixtapeToLocal,
  loadActiveCardFromLocal,
  saveActiveCardToLocal,
} from '~/utils/localStorage';

// Content fingerprint used to detect whether a copy is still an exact duplicate
// of its source (e.g. add-then-remove-again should not "unlock" it).
function contentSignature(m: Mixtape): string {
  return JSON.stringify({
    title: m.title,
    dedicatedTo: m.dedicatedTo ?? '',
    cassetteLength: m.cassetteLength,
    sideA: m.sideA.map((s) => s.id),
    sideB: m.sideB.map((s) => s.id),
  });
}

function blankMixtape(): Mixtape {
  return {
    id: generateId(),
    title: DEFAULT_MIXTAPE_TITLE,
    cassetteLength: 90 as CassetteLength,
    sideA: [],
    sideB: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    isCopy: false,
  };
}

/** Current working mixtape + active designer card. Replaces useAppMixtapeState. */
export const useMixtapeStore = defineStore('mixtape', () => {
  const ui = useUiStore();
  const auth = useAuthStore();

  const mixtape = ref<Mixtape>(blankMixtape());
  const activeCard = ref<JCard | null>(null);
  const isSaving = ref(false);

  // Signature of the untouched copy, captured whenever the current mixtape is
  // (or becomes) an unedited copy. Null once it's not tracking a copy at all.
  let copySignature: string | null = null;
  function trackCopySignature(m: Mixtape) {
    copySignature = m.isCopy ? contentSignature(m) : null;
  }
  trackCopySignature(mixtape.value);

  // Client-only: hydrate from localStorage and persist on change. The app pages
  // that use this store are client-rendered (ssr:false), so this runs on the client.
  if (import.meta.client) {
    const stored = loadMixtapeFromLocal();
    if (stored) mixtape.value = stored;
    trackCopySignature(mixtape.value);
    activeCard.value = loadActiveCardFromLocal();
    watch(mixtape, (v) => saveMixtapeToLocal(v), { deep: true });
    watch(activeCard, (v) => saveActiveCardToLocal(v), { deep: true });
  }

  // Apply a content patch and, if the current mixtape started as an unedited
  // copy, re-derive isCopy from whether it still matches the original content
  // (so add-then-remove, or any edit reverted by hand, stays flagged as a copy).
  function updateMixtape(patch: Partial<Mixtape>) {
    const next: Mixtape = { ...mixtape.value, ...patch, updatedAt: new Date().toISOString() };
    if (copySignature !== null) next.isCopy = contentSignature(next) === copySignature;
    mixtape.value = next;
  }

  // Returns whether the mixtape was actually saved, so callers can react to a
  // blocked or failed attempt (e.g. prompt the user to fix the title).
  async function save(): Promise<boolean> {
    if (!auth.user) {
      ui.openAuth();
      return false;
    }
    if (isMixtapeUntitled(mixtape.value.title)) {
      ui.showToast('Give your mixtape a name before saving to the cloud', 'error');
      return false;
    }
    isSaving.value = true;
    try {
      mixtape.value = await saveMixtape(mixtape.value, auth.user.id);
      trackCopySignature(mixtape.value);
      ui.showToast('Mixtape saved to cloud', 'success');
      return true;
    } catch (err) {
      console.error('Save failed:', err);
      ui.showToast('Failed to save mixtape', 'error');
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  function newMixtape() {
    mixtape.value = blankMixtape();
    trackCopySignature(mixtape.value);
    navigateTo('/mixtape');
    ui.showToast('New mixtape created', 'success');
  }

  function loadMixtape(loaded: Mixtape) {
    mixtape.value = loaded;
    trackCopySignature(mixtape.value);
    navigateTo('/mixtape');
    ui.showToast('Mixtape loaded', 'success');
  }

  async function togglePublic(mixtapeId: string, makePublic: boolean) {
    try {
      await toggleMixtapePublic(mixtapeId, makePublic);
      if (mixtape.value.id === mixtapeId) mixtape.value = { ...mixtape.value, isPublic: makePublic };
      ui.showToast(makePublic ? 'Mixtape is now public' : 'Mixtape is now private', 'success');
    } catch (err) {
      console.error('Toggle public failed:', err);
      ui.showToast('Failed to update visibility', 'error');
    }
  }

  async function enableShare(mixtapeId: string): Promise<string> {
    const token = await enableMixtapeShare(mixtapeId);
    if (mixtape.value.id === mixtapeId) mixtape.value = { ...mixtape.value, shareToken: token };
    return token;
  }

  async function disableShare(mixtapeId: string): Promise<void> {
    await disableMixtapeShare(mixtapeId);
    if (mixtape.value.id === mixtapeId) mixtape.value = { ...mixtape.value, shareToken: null };
  }

  function openDesigner(card: JCard | null) {
    activeCard.value = card;
    saveActiveCardToLocal(card);
    navigateTo('/cards/designer');
  }

  return {
    mixtape,
    activeCard,
    isSaving,
    updateMixtape,
    save,
    newMixtape,
    loadMixtape,
    togglePublic,
    enableShare,
    disableShare,
    openDesigner,
  };
});
