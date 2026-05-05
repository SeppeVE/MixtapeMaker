import { useNavigate } from 'react-router-dom';
import TapeStrip from './TapeStrip';

interface HomeFooterProps {
  onNewMixtape?: () => void;
  onOpenJCards?: () => void;
}

const CassetteIcon = () => (
  <svg width="18" height="12" viewBox="0 0 20 14" fill="none" style={{ verticalAlign: 'middle' }}>
    <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
    <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
    <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
    <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
  </svg>
);

const BuyMeCoffee = () => (
  <a href="https://www.buymeacoffee.com/seppe.ve" target="_blank" rel="noreferrer" style={{height: 'max-content'}}>
    <img
      src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
      alt="Buy Me a Coffee"
      style={{ height: '40px', width: '150px', transform: 'translateY(3px)' }}
    />
  </a>
);

const HomeFooter = ({ onNewMixtape, onOpenJCards }: HomeFooterProps) => {
  const navigate = useNavigate();
  const handleNewMixtape = onNewMixtape ?? (() => navigate('/editor'));
  const handleOpenJCards = onOpenJCards ?? (() => navigate('/cards/designer'));

  return (
    <>
      <TapeStrip reverse />
      <footer className="lp-footer">
        <div className="lp-foot-logo">
          <CassetteIcon /> CASSETTE
        </div>
        <div className="lp-foot-note">Make mixtapes. Design J-cards. Press play.</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="lp-btn lp-btn-paper" style={{ fontSize: '15px', padding: '3px 12px 1px' }} onClick={handleNewMixtape}>Mixtape Editor</button>
          <button className="lp-btn lp-btn-plum"  style={{ fontSize: '15px', padding: '3px 12px 1px' }} onClick={handleOpenJCards}>J-Card Designer</button>
        </div>
        <BuyMeCoffee />
      </footer>
    </>
  );
};

export default HomeFooter;
