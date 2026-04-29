import { useNavigate } from 'react-router-dom';
import { JCard, Mixtape } from '../types';
import NavBar from '../components/ui/NavBar';
import JCardView from '../components/jcard/JCardView';

interface JCardDesignerPageProps {
  activeCard: JCard | null;
  mixtape: Mixtape;
  onOpenAuth: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const JCardDesignerPage = ({ activeCard, mixtape, onOpenAuth, showToast }: JCardDesignerPageProps) => {
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
          Designer
        </span>
      </NavBar>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <JCardView
          initialCard={activeCard}
          currentMixtape={mixtape}
          onBack={() => navigate('/cards')}
          showToast={showToast}
        />
      </div>
    </div>
  );
};

export default JCardDesignerPage;
