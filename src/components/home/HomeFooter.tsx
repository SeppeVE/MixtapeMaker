import { useNavigate } from 'react-router-dom';
import TapeStrip from './TapeStrip';
import '../../styles/utilities.css';

interface HomeFooterProps {
  onNewMixtape?: () => void;
  onOpenJCards?: () => void;
}

const CassetteIcon = () => (
  <svg width="18" height="12" viewBox="0 0 20 14" fill="none" className="align-middle">
    <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
    <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
    <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
    <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
  </svg>
);

const BuyMeCoffee = () => (
  <a href="https://www.buymeacoffee.com/seppe.ve" target="_blank" rel="noreferrer" className="height-max-content">
    <img
      src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
      alt="Buy Me a Coffee"
      className="footer-logo"
    />
  </a>
);

const ContactButton = () => (
  <a href="mailto:contact@mixtape-maker.com" className="lp-btn lp-btn-paper footer-btn">
    ✉ Contact
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
        <div className="footer-btn-group">
          <button className="lp-btn lp-btn-paper footer-btn" onClick={handleNewMixtape}>Mixtape Editor</button>
          <button className="lp-btn lp-btn-plum footer-btn" onClick={handleOpenJCards}>J-Card Designer</button>
          <ContactButton />
        </div>
        <BuyMeCoffee />
      </footer>
    </>
  );
};

export default HomeFooter;
