import { useState, useEffect, useCallback } from 'react';
import { JCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { listJCards, deleteJCard, upsertJCard } from '../utils/jcardDatabase';
import { loadJCardsFromLocal, deleteJCardFromLocal, saveJCardToLocal } from '../utils/localStorage';

export type StorageStatus = 'local' | 'cloud' | 'synced';
export type ToastFn = (msg: string, type: 'success' | 'error' | 'info') => void;

export function useJCardLibrary(showToast: ToastFn, onOpenAuth: () => void) {
  const { user } = useAuth();
  const [allCards, setAllCards] = useState<JCard[]>([]);
  const [localCards, setLocalCards] = useState<JCard[]>([]);
  const [cloudCardIds, setCloudCardIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  const loadCards = useCallback(() => {
    setLoading(true);
    setError(null);
    const local = loadJCardsFromLocal();
    setLocalCards(local);
    if (user) {
      listJCards(user.id)
        .then(cloud => {
          const ids = new Set(cloud.map(c => c.id));
          setCloudCardIds(ids);
          const merged = [...cloud];
          for (const card of local) {
            if (!ids.has(card.id)) merged.push(card);
          }
          merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setAllCards(merged);
        })
        .catch(() => {
          setError('Failed to load cloud cards — showing local only');
          setAllCards(local);
        })
        .finally(() => setLoading(false));
    } else {
      setAllCards(local);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const cardStatus = (card: JCard): StorageStatus => {
    const inCloud = cloudCardIds.has(card.id);
    const inLocal = localCards.some(c => c.id === card.id);
    if (inCloud && inLocal) return 'synced';
    if (inCloud) return 'cloud';
    return 'local';
  };

  const uploadCard = async (card: JCard) => {
    if (!user) { onOpenAuth(); return; }
    setUploadingIds(prev => new Set(prev).add(card.id));
    try {
      const synced = await upsertJCard(card, user.id);
      if (synced.id !== card.id) deleteJCardFromLocal(card.id);
      saveJCardToLocal(synced);
      setAllCards(prev => prev.map(c => c.id === card.id ? synced : c));
      setCloudCardIds(prev => { const s = new Set(prev); s.delete(card.id); s.add(synced.id); return s; });
      setLocalCards(prev => { const without = prev.filter(c => c.id !== card.id); return [...without, synced]; });
      showToast('Card saved to cloud ☁', 'success');
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingIds(prev => { const s = new Set(prev); s.delete(card.id); return s; });
    }
  };

  const deleteCard = async (card: JCard) => {
    if (!window.confirm(`Delete "${card.title || 'Untitled'}"?`)) return;
    try {
      const status = cardStatus(card);
      if (status === 'cloud' || status === 'synced') await deleteJCard(card.id);
      if (status === 'local' || status === 'synced') deleteJCardFromLocal(card.id);
      setAllCards(prev => prev.filter(c => c.id !== card.id));
      setCloudCardIds(prev => { const s = new Set(prev); s.delete(card.id); return s; });
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
