import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { navigateTo } from '#app';
import type { Mixtape, CassetteLength, JCard } from '~/types';
import { useUiStore } from '~/stores/ui';
import { useAuthStore } from '~/stores/auth';
import { generateId } from '~/utils/timeUtils';
import { DEFAULT_MIXTAPE_TITLE, isMixtapeUntitled } from '~/utils/mixtapeTitle';
import { findProfanity, PROFANITY_MESSAGE } from '~/utils/profanity';
import {
  saveMixtape,
  isCloudId,
  toggleMixtapePublic,
  enableMixtapeShare,
  disableMixtapeShare,
} from '~/utils/database';
import {
  loadMixtapeFromLocal,
  saveMixtapeToLocal,
  loadActiveCardFromLocal,
  saveActiveCardToLocal,
  loadMixtapeDirtyFromLocal,
  saveMixtapeDirtyToLocal,
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

// Public tapes show up on Explore for everyone, so their user-written text
// (not the Spotify track names) has to pass the profanity check. Returns the
// offending field label, or null when clean.
function publicProfanity(m: Mixtape): string | null {
  return findProfanity({ 'mixtape title': m.title, 'dedication': m.dedicatedTo });
}

/** Current working mixtape + active designer card. Replaces useAppMixtapeState. */
export const useMixtapeStore = defineStore('mixtape', () => {
  const ui = useUiStore();
  const auth = useAuthStore();

  const mixtape = ref<Mixtape>(blankMixtape());
  const activeCard = ref<JCard | null>(null);
  const isSaving = ref(false);
  // True while the draft has edits the cloud hasn't seen. Persisted so a
  // reload doesn't silently forget that a tape was never saved.
  const dirty = ref(false);

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
    dirty.value = loadMixtapeDirtyFromLocal();
    watch(mixtape, (v) => saveMixtapeToLocal(v), { deep: true });
    watch(activeCard, (v) => saveActiveCardToLocal(v), { deep: true });
    watch(dirty, (v) => saveMixtapeDirtyToLocal(v));
  }

  // Worth warning about: unsaved edits on a tape that actually has content.
  function hasUnsavedChanges(): boolean {
    const m = mixtape.value;
    return dirty.value && (m.sideA.length > 0 || m.sideB.length > 0 || !isMixtapeUntitled(m.title));
  }

  // Apply a content patch and, if the current mixtape started as an unedited
  // copy, re-derive isCopy from whether it still matches the original content
  // (so add-then-remove, or any edit reverted by hand, stays flagged as a copy).
  function updateMixtape(patch: Partial<Mixtape>) {
    const next: Mixtape = { ...mixtape.value, ...patch, updatedAt: new Date().toISOString() };
    if (copySignature !== null) next.isCopy = contentSignature(next) === copySignature;
    mixtape.value = next;
    dirty.value = true;
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
    // An already-public tape can't be renamed into something profane.
    const profane = mixtape.value.isPublic ? publicProfanity(mixtape.value) : null;
    if (profane) {
      ui.showToast(PROFANITY_MESSAGE(profane), 'error');
      return false;
    }
    isSaving.value = true;
    try {
      mixtape.value = await saveMixtape(mixtape.value, auth.user.id);
      trackCopySignature(mixtape.value);
      dirty.value = false;
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
    dirty.value = false;
    navigateTo('/mixtape');
    ui.showToast('New mixtape created', 'success');
  }

  function loadMixtape(loaded: Mixtape) {
    mixtape.value = loaded;
    trackCopySignature(mixtape.value);
    // A cloud tape starts clean; a local draft or a fresh copy from Explore isn't in the cloud yet.
    dirty.value = !isCloudId(loaded.id) || loaded.isCopy === true;
    navigateTo('/mixtape');
    ui.showToast('Mixtape loaded', 'success');
  }

  // Returns whether the change went through, so callers with an optimistic
  // UI can roll back when it's refused (profanity) or fails.
  async function togglePublic(tape: Mixtape, makePublic: boolean): Promise<boolean> {
    const profane = makePublic ? publicProfanity(tape) : null;
    if (profane) {
      ui.showToast(PROFANITY_MESSAGE(profane), 'error');
      return false;
    }
    try {
      await toggleMixtapePublic(tape.id, makePublic);
      if (mixtape.value.id === tape.id) mixtape.value = { ...mixtape.value, isPublic: makePublic };
      if (makePublic) {
        // Going public is a share: hand over the explore link right away.
        ui.openSuccessModal({
          title: 'Mixtape is now public',
          trigger: 'share',
          link: { url: `${window.location.origin}/explore/${tape.id}`, openLabel: 'Open public page' },
          note: 'It now shows up on the Explore page. Anyone with this link can view it.',
          fallbackToast: 'Mixtape is now public',
        });
      } else {
        ui.showToast('Mixtape is now private', 'success');
      }
      return true;
    } catch (err) {
      console.error('Toggle public failed:', err);
      ui.showToast('Failed to update visibility', 'error');
      return false;
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
    dirty,
    hasUnsavedChanges,
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
