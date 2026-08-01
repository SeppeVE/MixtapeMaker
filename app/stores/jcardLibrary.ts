import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { JCard } from '~/types';
import { useUiStore } from '~/stores/ui';
import { useAuthStore } from '~/stores/auth';
import { loadJCardsFromLocal, deleteJCardFromLocal, saveJCardToLocal } from '~/utils/localStorage';
import { listJCards, upsertJCard, deleteJCard } from '~/utils/jcardDatabase';

export type StorageStatus = 'local' | 'cloud' | 'synced';

/** J-card library: merges localStorage + Supabase cards. Replaces useJCardLibrary. */
export const useJCardLibraryStore = defineStore('jcardLibrary', () => {
  const ui = useUiStore();
  const auth = useAuthStore();

  const allCards = ref<JCard[]>([]);
  const localCards = ref<JCard[]>([]);
  const cloudCardIds = ref<Set<string>>(new Set());
  const loading = ref(true);
  const error = ref<string | null>(null);
  const uploadingIds = ref<Set<string>>(new Set());

  async function loadCards() {
    loading.value = true;
    error.value = null;
    const local = loadJCardsFromLocal();
    localCards.value = local;

    if (auth.user) {
      try {
        const cloud = await listJCards(auth.user.id);
        const ids = new Set(cloud.map((c) => c.id));
        cloudCardIds.value = ids;
        const merged = [...cloud];
        for (const card of local) {
          if (!ids.has(card.id)) merged.push(card);
        }
        merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        allCards.value = merged;
      } catch {
        error.value = 'Failed to load cloud cards — showing local only';
        allCards.value = local;
      } finally {
        loading.value = false;
      }
    } else {
      allCards.value = local;
      loading.value = false;
    }
  }

  function cardStatus(card: JCard): StorageStatus {
    const inCloud = cloudCardIds.value.has(card.id);
    const inLocal = localCards.value.some((c) => c.id === card.id);
    if (inCloud && inLocal) return 'synced';
    if (inCloud) return 'cloud';
    return 'local';
  }

  async function uploadCard(card: JCard) {
    if (!auth.user) {
      ui.openAuth();
      return;
    }
    uploadingIds.value = new Set(uploadingIds.value).add(card.id);
    try {
      const synced = await upsertJCard(card, auth.user.id);
      if (synced.id !== card.id) deleteJCardFromLocal(card.id);
      saveJCardToLocal(synced);
      allCards.value = allCards.value.map((c) => (c.id === card.id ? synced : c));
      const cloudIds = new Set(cloudCardIds.value);
      cloudIds.delete(card.id);
      cloudIds.add(synced.id);
      cloudCardIds.value = cloudIds;
      localCards.value = [...localCards.value.filter((c) => c.id !== card.id), synced];
      ui.showToast('Card saved to cloud ☁', 'success');
    } catch {
      ui.showToast('Upload failed', 'error');
    } finally {
      const ids = new Set(uploadingIds.value);
      ids.delete(card.id);
      uploadingIds.value = ids;
    }
  }

  async function deleteCard(card: JCard) {
    if (!window.confirm(`Delete "${card.title || 'Untitled'}"?`)) return;
    try {
      const status = cardStatus(card);
      if (status === 'cloud' || status === 'synced') await deleteJCard(card.id);
      if (status === 'local' || status === 'synced') deleteJCardFromLocal(card.id);
      allCards.value = allCards.value.filter((c) => c.id !== card.id);
      const cloudIds = new Set(cloudCardIds.value);
      cloudIds.delete(card.id);
      cloudCardIds.value = cloudIds;
      ui.showToast('Card deleted', 'info');
    } catch {
      ui.showToast('Failed to delete', 'error');
    }
  }

  return {
    allCards,
    localCards,
    cloudCardIds,
    loading,
    error,
    uploadingIds,
    loadCards,
    cardStatus,
    uploadCard,
    deleteCard,
  };
});
