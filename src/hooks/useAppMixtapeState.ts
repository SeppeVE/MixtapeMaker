import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mixtape, CassetteLength, JCard } from '../types';
import { generateId } from '../utils/timeUtils';
import {
  saveMixtapeToLocal,
  loadMixtapeFromLocal,
  saveActiveCardToLocal,
  loadActiveCardFromLocal,
} from '../utils/localStorage';
import { saveMixtape, toggleMixtapePublic, enableMixtapeShare, disableMixtapeShare, isCloudId } from '../utils/database';
import { useAuth } from '../contexts/AuthContext';

export function useAppMixtapeState() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCard, setActiveCard] = useState<JCard | null>(() => loadActiveCardFromLocal());

  const [mixtape, setMixtape] = useState<Mixtape>(() =>
    loadMixtapeFromLocal() ?? {
      id: generateId(),
      title: 'Untitled Mixtape',
      cassetteLength: 90 as CassetteLength,
      sideA: [],
      sideB: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
    }
  );

  useEffect(() => { saveMixtapeToLocal(mixtape); }, [mixtape]);
  useEffect(() => { saveActiveCardToLocal(activeCard); }, [activeCard]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const handleSave = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsSaving(true);
    try {
      const saved = await saveMixtape(mixtape, user.id);
      setMixtape(saved);
      showToast('Mixtape saved to cloud', 'success');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Failed to save mixtape', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewMixtape = () => {
    setMixtape({
      id: generateId(),
      title: 'Untitled Mixtape',
      cassetteLength: 90 as CassetteLength,
      sideA: [],
      sideB: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
    });
    navigate('/mixtape');
    showToast('New mixtape created', 'success');
  };

  const handleLoadMixtape = (loaded: Mixtape) => {
    setMixtape(loaded);
    navigate('/mixtape');
    showToast('Mixtape loaded', 'success');
  };

  const handleTogglePublic = async (mixtapeId: string, isPublic: boolean) => {
    try {
      await toggleMixtapePublic(mixtapeId, isPublic);
      if (mixtape.id === mixtapeId) setMixtape({ ...mixtape, isPublic });
      showToast(isPublic ? 'Mixtape is now public' : 'Mixtape is now private', 'success');
    } catch (err) {
      console.error('Toggle public failed:', err);
      showToast('Failed to update visibility', 'error');
    }
  };

  const handleEnableShare = async (mixtapeId: string): Promise<string> => {
    const token = await enableMixtapeShare(mixtapeId);
    if (mixtape.id === mixtapeId) setMixtape({ ...mixtape, shareToken: token });
    return token;
  };

  const handleDisableShare = async (mixtapeId: string): Promise<void> => {
    await disableMixtapeShare(mixtapeId);
    if (mixtape.id === mixtapeId) setMixtape({ ...mixtape, shareToken: null });
  };

  const openDesigner = (card: JCard | null) => {
    setActiveCard(card);
    saveActiveCardToLocal(card);
    navigate('/cards/designer');
  };

  return {
    mixtape,
    setMixtape,
    activeCard,
    isAuthModalOpen,
    setIsAuthModalOpen,
    toast,
    setToast,
    isSaving,
    showToast,
    handleSave,
    handleNewMixtape,
    handleLoadMixtape,
    handleTogglePublic,
    handleEnableShare,
    handleDisableShare,
    isCloudId,
    openDesigner,
    navigate,
  };
}
