import { Analytics } from '@vercel/analytics/react';
import AuthModal from './components/auth/AuthModal';
import Toast from './components/ui/Toast';
import { useAppMixtapeState } from './hooks/useAppMixtapeState';
import { AppRoutes } from './routes';
import './styles/App.css';

function App() {
  const {
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
    isCloudId,
    openDesigner,
    navigate,
  } = useAppMixtapeState();

  return (
    <>
      <AppRoutes
        mixtape={mixtape}
        setMixtape={setMixtape}
        activeCard={activeCard}
        isSaving={isSaving}
        handleSave={handleSave}
        handleNewMixtape={handleNewMixtape}
        handleLoadMixtape={handleLoadMixtape}
        handleTogglePublic={handleTogglePublic}
        handleEnableShare={handleEnableShare}
        isCloudId={isCloudId}
        openDesigner={openDesigner}
        showToast={showToast}
        setIsAuthModalOpen={setIsAuthModalOpen}
        navigate={navigate}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Analytics />
    </>
  );
}

export default App;
