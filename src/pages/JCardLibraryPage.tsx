import { useNavigate } from 'react-router-dom';
import { JCard } from '../types';
import NavBar from '../components/ui/NavBar';
import JCardLibrary from './JCardLibrary';

interface JCardLibraryPageProps {
  onOpenCard: (card: JCard) => void;
  onNewCard: () => void;
  onOpenAuth: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const JCardLibraryPage = ({ onOpenCard, onNewCard, onOpenAuth, showToast }: JCardLibraryPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="editor editor-side-a" style={{ overflowY: 'auto' }}>
      <NavBar
        onGoHome={() => navigate('/')}
        onOpenAuth={onOpenAuth}
      >
        <button className="lp-nav-link" onClick={() => navigate(-1)}>◀ Back</button>
        <span className="lp-nav-sep">/</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text)' }}>
          🎴 J-Cards
        </span>
      </NavBar>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <JCardLibrary
          onOpenCard={onOpenCard}
          onNewCard={onNewCard}
          showToast={showToast}
        />
      </div>
    </div>
  );
};

export default JCardLibraryPage;
