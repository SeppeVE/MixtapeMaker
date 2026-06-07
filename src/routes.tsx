import { Routes, Route, Navigate } from 'react-router-dom';
import { Mixtape, JCard } from './types';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import MixtapeEditorPage from './pages/MixtapeEditorPage';
import JCardDesignerPage from './pages/JCardDesignerPage';

export interface AppRoutesProps {
  mixtape: Mixtape;
  setMixtape: (mixtape: Mixtape) => void;
  activeCard: JCard | null;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleNewMixtape: () => void;
  handleLoadMixtape: (mixtape: Mixtape) => void;
  openDesigner: (card: JCard | null) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  setIsAuthModalOpen: (open: boolean) => void;
  navigate: (path: string) => void;
}

export function AppRoutes({
  mixtape,
  setMixtape,
  activeCard,
  isSaving,
  handleSave,
  handleNewMixtape,
  handleLoadMixtape,
  openDesigner,
  showToast,
  setIsAuthModalOpen,
  navigate,
}: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={
        <HomePage
          onNewMixtape={handleNewMixtape}
          onLoadMixtape={handleLoadMixtape}
          onOpenLibrary={() => navigate('/library')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenJCards={() => navigate('/library?tab=jcards')}
        />
      } />

      <Route path="/library" element={
        <LibraryPage
          currentDraft={mixtape}
          onLoadMixtape={handleLoadMixtape}
          onSaveDraftToCloud={handleSave}
          isSavingDraft={isSaving}
          onGoHome={() => navigate('/')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenCard={openDesigner}
          onNewCard={() => openDesigner(null)}
          onNewMixtape={handleNewMixtape}
          showToast={showToast}
        />
      } />

      <Route path="/mixtape" element={
        <MixtapeEditorPage
          mixtape={mixtape}
          onMixtapeChange={setMixtape}
          isSaving={isSaving}
          onSave={handleSave}
          onNewMixtape={handleNewMixtape}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLibrary={() => navigate('/library')}
        />
      } />

      <Route path="/editor" element={<Navigate to="/mixtape" replace />} />

      <Route path="/cards" element={<Navigate to="/library?tab=jcards" replace />} />

      <Route path="/cards/designer" element={
        <JCardDesignerPage
          activeCard={activeCard}
          mixtape={mixtape}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLibrary={() => navigate('/library')}
          showToast={showToast}
        />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
