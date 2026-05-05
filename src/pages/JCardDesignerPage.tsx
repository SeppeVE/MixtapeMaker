import { useNavigate } from 'react-router-dom';
import { JCard, Mixtape } from '../types';
import NavBar from '../components/ui/NavBar';
import JCardView from '../components/jcard/JCardView';
import '../styles/jcard/JCardView.css';
import HomeFooter from '../components/home/HomeFooter';

interface JCardDesignerPageProps {
  activeCard: JCard | null;
  mixtape: Mixtape;
  onOpenAuth: () => void;
  onOpenLibrary: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const JCardDesignerPage = ({ activeCard, mixtape, onOpenAuth, onOpenLibrary, showToast }: JCardDesignerPageProps) => {
  const navigate = useNavigate();

  return (
    <div className="editor editor-side-a" style={{ overflowY: 'auto' }}>
      <NavBar
        onGoHome={() => navigate('/')}
        onOpenAuth={onOpenAuth}
        onOpenLibrary={onOpenLibrary}
      >
        <button className="lp-nav-link" onClick={() => navigate(-1)}>Back</button>
        <span className="lp-nav-sep">/</span>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-text)' }}>
          Designer
        </span>
      </NavBar>
      <div className="designer-mobile-warning">
        This designer is built for desktop — layout and editing work best on a wider screen.
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <JCardView
          initialCard={activeCard}
          currentMixtape={mixtape}
          onBack={() => navigate('/cards')}
          showToast={showToast}
        />
      </div>
      <div className="jcard-page-footer">
        <HomeFooter />
      </div>
    </div>
  );
};

export default JCardDesignerPage;
