import { Routes, Route, Navigate } from 'react-router-dom';
import { Mixtape, JCard } from './types';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import MixtapeEditorPage from './pages/MixtapeEditorPage';
import JCardDesignerPage from './pages/JCardDesignerPage';
import SpotifyCallback from './pages/SpotifyCallback';
import ExplorePage from './pages/ExplorePage';
import PublicMixtapePage, { SharedMixtapePage } from './pages/PublicMixtapePage';

export interface AppRoutesProps {
  mixtape: Mixtape;
  setMixtape: (mixtape: Mixtape) => void;
  activeCard: JCard | null;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleNewMixtape: () => void;
  handleLoadMixtape: (mixtape: Mixtape) => void;
  handleTogglePublic: (mixtapeId: string, isPublic: boolean) => Promise<void>;
  handleEnableShare: (mixtapeId: string) => Promise<string>;
  handleDisableShare: (mixtapeId: string) => Promise<void>;
  isCloudId: (id: string) => boolean;
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
  handleTogglePublic,
  handleEnableShare,
  handleDisableShare,
  isCloudId,
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
          onTogglePublic={handleTogglePublic}
          onEnableShare={handleEnableShare}
          onDisableShare={handleDisableShare}
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
          onTogglePublic={handleTogglePublic}
          isCloudId={isCloudId}
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

      <Route path="/explore" element={
        <ExplorePage
          onGoHome={() => navigate('/')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLibrary={() => navigate('/library')}
          onOpenMixtape={(id) => navigate(`/explore/${id}`)}
        />
      } />

      <Route path="/explore/:id" element={
        <PublicMixtapePage
          onGoHome={() => navigate('/')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLibrary={() => navigate('/library')}
          onLoadMixtape={handleLoadMixtape}
          showToast={showToast}
        />
      } />

      <Route path="/share/:token" element={
        <SharedMixtapePage
          onGoHome={() => navigate('/')}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenLibrary={() => navigate('/library')}
          onLoadMixtape={handleLoadMixtape}
          showToast={showToast}
        />
      } />

      <Route path="/spotify-callback" element={<SpotifyCallback />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
