import type { Mixtape, CassetteLength, JCard } from '~/types';
import { generateId } from '~/utils/timeUtils';
import { saveActiveCardToLocal } from '~/utils/localStorage';
import {
  saveMixtape,
  toggleMixtapePublic,
  enableMixtapeShare,
  disableMixtapeShare,
  isCloudId,
} from '~/utils/database';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastState {
  message: string;
  type: ToastType;
}

export function blankMixtape(): Mixtape {
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

export function useAppMixtapeState() {
  const { user } = useAuthState();

  const isAuthModalOpen = useState<boolean>('app-auth-modal-open', () => false);
  const toast = useState<ToastState | null>('app-toast', () => null);
  const isSaving = useState<boolean>('app-is-saving', () => false);
  // Drafts are restored from localStorage by plugins/app-state.client.ts,
  // which also persists every change back to localStorage.
  const activeCard = useState<JCard | null>('app-active-card', () => null);
  const mixtape = useState<Mixtape>('app-mixtape', blankMixtape);

  const setMixtape = (m: Mixtape) => {
    mixtape.value = m;
  };

  const showToast = (message: string, type: ToastType) => {
    toast.value = { message, type };
  };

  const handleSave = async () => {
    if (!user.value) {
      isAuthModalOpen.value = true;
      return;
    }
    isSaving.value = true;
    try {
      const saved = await saveMixtape(mixtape.value, user.value.id);
      mixtape.value = saved;
      showToast('Mixtape saved to cloud', 'success');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Failed to save mixtape', 'error');
    } finally {
      isSaving.value = false;
    }
  };

  const handleNewMixtape = () => {
    mixtape.value = blankMixtape();
    navigateTo('/mixtape');
    showToast('New mixtape created', 'success');
  };

  const handleLoadMixtape = (loaded: Mixtape) => {
    mixtape.value = loaded;
    navigateTo('/mixtape');
    showToast('Mixtape loaded', 'success');
  };

  const handleTogglePublic = async (mixtapeId: string, isPublic: boolean) => {
    try {
      await toggleMixtapePublic(mixtapeId, isPublic);
      if (mixtape.value.id === mixtapeId) mixtape.value = { ...mixtape.value, isPublic };
      showToast(isPublic ? 'Mixtape is now public' : 'Mixtape is now private', 'success');
    } catch (err) {
      console.error('Toggle public failed:', err);
      showToast('Failed to update visibility', 'error');
    }
  };

  const handleEnableShare = async (mixtapeId: string): Promise<string> => {
    const token = await enableMixtapeShare(mixtapeId);
    if (mixtape.value.id === mixtapeId) mixtape.value = { ...mixtape.value, shareToken: token };
    return token;
  };

  const handleDisableShare = async (mixtapeId: string): Promise<void> => {
    await disableMixtapeShare(mixtapeId);
    if (mixtape.value.id === mixtapeId) mixtape.value = { ...mixtape.value, shareToken: null };
  };

  const openDesigner = (card: JCard | null) => {
    activeCard.value = card;
    saveActiveCardToLocal(card);
    navigateTo('/cards/designer');
  };

  return {
    mixtape,
    setMixtape,
    activeCard,
    isAuthModalOpen,
    toast,
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
  };
}
