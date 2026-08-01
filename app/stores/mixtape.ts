import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { navigateTo } from '#app';
import type { Mixtape, CassetteLength, JCard } from '~/types';
import { useUiStore } from '~/stores/ui';
import { useAuthStore } from '~/stores/auth';
import { generateId } from '~/utils/timeUtils';
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

function blankMixtape(): Mixtape {
  return {
    id: generateId(),
    title: 'Untitled Mixtape',
    cassetteLength: 90 as CassetteLength,
    sideA: [],
    sideB: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
  };
}

/** Current working mixtape + active designer card. Replaces useAppMixtapeState. */
export const useMixtapeStore = defineStore('mixtape', () => {
  const ui = useUiStore();
  const auth = useAuthStore();

  const mixtape = ref<Mixtape>(blankMixtape());
  const activeCard = ref<JCard | null>(null);
  const isSaving = ref(false);

  // Client-only: hydrate from localStorage and persist on change. The app pages
  // that use this store are client-rendered (ssr:false), so this runs on the client.
  if (import.meta.client) {
    const stored = loadMixtapeFromLocal();
    if (stored) mixtape.value = stored;
    activeCard.value = loadActiveCardFromLocal();
    watch(mixtape, (v) => saveMixtapeToLocal(v), { deep: true });
    watch(activeCard, (v) => saveActiveCardToLocal(v), { deep: true });
  }

  async function save() {
    if (!auth.user) {
      ui.openAuth();
      return;
    }
    isSaving.value = true;
    try {
      mixtape.value = await saveMixtape(mixtape.value, auth.user.id);
      ui.showToast('Mixtape saved to cloud', 'success');
    } catch (err) {
      console.error('Save failed:', err);
      ui.showToast('Failed to save mixtape', 'error');
    } finally {
      isSaving.value = false;
    }
  }

  function newMixtape() {
    mixtape.value = blankMixtape();
    navigateTo('/mixtape');
    ui.showToast('New mixtape created', 'success');
  }

  function loadMixtape(loaded: Mixtape) {
    mixtape.value = loaded;
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
    save,
    newMixtape,
    loadMixtape,
    togglePublic,
    enableShare,
    disableShare,
    openDesigner,
  };
});
