import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Mixtape, CassetteLength, JCard } from './types';
import { generateId } from './utils/timeUtils';
import { saveMixtapeToLocal, loadMixtapeFromLocal, saveActiveCardToLocal, loadActiveCardFromLocal } from './utils/localStorage';
import { saveMixtape } from './utils/database';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/auth/AuthModal';
import Toast from './components/ui/Toast';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import EditorPage from './pages/EditorPage';
import JCardLibraryPage from './pages/JCardLibraryPage';
import JCardDesignerPage from './pages/JCardDesignerPage';
import './styles/App.css';

// ── Shared state that multiple routes need access to ──────────────────────────

function App() {
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
    }
  );

  // Persist every change to localStorage so the draft survives a refresh
  useEffect(() => { saveMixtapeToLocal(mixtape); }, [mixtape]);

  // Persist active card so the designer survives a refresh
  useEffect(() => { saveActiveCardToLocal(activeCard); }, [activeCard]);

  // ── Shared handlers ───────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'error' | 'info') =>
    setToast({ message, type });

  const handleSave = async () => {
    if (!user) { setIsAuthModalOpen(true); return; }
    setIsSaving(true);
    try {
      await saveMixtape(mixtape, user.id);
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
    });
    navigate('/editor');
    showToast('New mixtape created', 'success');
  };

  const handleLoadMixtape = (loaded: Mixtape) => {
    setMixtape(loaded);
    navigate('/editor');
    showToast('Mixtape loaded', 'success');
  };

  const openDesigner = (card: JCard | null) => {
    setActiveCard(card);
    saveActiveCardToLocal(card);
    navigate('/cards/designer');
  };

  // ── Routes ────────────────────────────────────────────────────────────────

  return (
    <>
      <Routes>

        <Route path="/" element={
          <HomePage
            onNewMixtape={handleNewMixtape}
            onLoadMixtape={handleLoadMixtape}
            onOpenLibrary={() => navigate('/library')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenJCards={() => navigate('/cards/designer')}
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

        <Route path="/editor" element={
          <EditorPage
            mixtape={mixtape}
            onMixtapeChange={setMixtape}
            isSaving={isSaving}
            onSave={handleSave}
            onNewMixtape={handleNewMixtape}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenLibrary={() => navigate('/library')}
          />
        } />

        <Route path="/cards" element={
          <JCardLibraryPage
            onOpenCard={openDesigner}
            onNewCard={() => openDesigner(null)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            showToast={showToast}
          />
        } />

        <Route path="/cards/designer" element={
          <JCardDesignerPage
            activeCard={activeCard}
            mixtape={mixtape}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            showToast={showToast}
          />
        } />

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

export default App;
t App;
