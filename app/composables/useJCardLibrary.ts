import type { JCard } from '~/types';
import { listJCards, deleteJCard, upsertJCard } from '~/utils/jcardDatabase';
import { loadJCardsFromLocal, deleteJCardFromLocal, saveJCardToLocal } from '~/utils/localStorage';

export type StorageStatus = 'local' | 'cloud' | 'synced';
export type ToastFn = (msg: string, type: 'success' | 'error' | 'info') => void;

export function useJCardLibrary(showToast: ToastFn, onOpenAuth: () => void) {
  const { user } = useAuthState();
  const allCards = ref<JCard[]>([]);
  const localCards = ref<JCard[]>([]);
  const cloudCardIds = ref<Set<string>>(new Set());
  const loading = ref(true);
  const error = ref<string | null>(null);
  const uploadingIds = ref<Set<string>>(new Set());

  const loadCards = () => {
    loading.value = true;
    error.value = null;
    const local = loadJCardsFromLocal();
    localCards.value = local;
    if (user.value) {
      listJCards(user.value.id)
        .then((cloud) => {
          const ids = new Set(cloud.map((c) => c.id));
          cloudCardIds.value = ids;
          const merged = [...cloud];
          for (const card of local) {
            if (!ids.has(card.id)) merged.push(card);
          }
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          allCards.value = merged;
        })
        .catch(() => {
          error.value = 'Failed to load cloud cards — showing local only';
          allCards.value = local;
        })
        .finally(() => {
          loading.value = false;
        });
    } else {
      allCards.value = local;
      loading.value = false;
    }
  };

  watch(user, () => loadCards(), { immediate: true });

  const cardStatus = (card: JCard): StorageStatus => {
    const inCloud = cloudCardIds.value.has(card.id);
    const inLocal = localCards.value.some((c) => c.id === card.id);
    if (inCloud && inLocal) return 'synced';
    if (inCloud) return 'cloud';
    return 'local';
  };

  const uploadCard = async (card: JCard) => {
    if (!user.value) {
      onOpenAuth();
      return;
    }
    uploadingIds.value = new Set(uploadingIds.value).add(card.id);
    try {
      const synced = await upsertJCard(card, user.value.id);
      if (synced.id !== card.id) deleteJCardFromLocal(card.id);
      saveJCardToLocal(synced);
      allCards.value = allCards.value.map((c) => (c.id === card.id ? synced : c));
      const ids = new Set(cloudCardIds.value);
      ids.delete(card.id);
      ids.add(synced.id);
      cloudCardIds.value = ids;
      localCards.value = [...localCards.value.filter((c) => c.id !== card.id), synced];
      showToast('Card saved to cloud ☁', 'success');
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      const s = new Set(uploadingIds.value);
      s.delete(card.id);
      uploadingIds.value = s;
    }
  };

  const deleteCard = async (card: JCard) => {
    if (!window.confirm(`Delete "${card.title || 'Untitled'}"?`)) return;
    try {
      const status = cardStatus(card);
      if (status === 'cloud' || status === 'synced') await deleteJCard(card.id);
      if (status === 'local' || status === 'synced') deleteJCardFromLocal(card.id);
      allCards.value = allCards.value.filter((c) => c.id !== card.id);
      const s = new Set(cloudCardIds.value);
      s.delete(card.id);
      cloudCardIds.value = s;
      showToast('Card deleted', 'info');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  return {
    allCards,
    loading,
    error,
    uploadingIds,
    loadCards,
    cardStatus,
    uploadCard,
    deleteCard,
    user,
  };
}

export type JCardLibraryState = ReturnType<typeof useJCardLibrary>;
