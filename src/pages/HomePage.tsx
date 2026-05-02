import { useState, useEffect } from 'react';
import { Mixtape } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadMixtapes } from '../utils/database';
import NavBar from '../components/ui/NavBar';
import TapeStrip from '../components/home/TapeStrip';
import HeroSection from '../components/home/HeroSection';
import FeatureBar from '../components/home/FeatureBar';
import MixtapeSection from '../components/home/MixtapeSection';
import JCardSection from '../components/home/JCardSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import CtaSection from '../components/home/CtaSection';
import HomeFooter from '../components/home/HomeFooter';
import '../styles/LandingPage.css';

interface HomePageProps {
  onNewMixtape: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
  onOpenLibrary: () => void;
  onOpenAuth: () => void;
  onOpenJCards: () => void;
}

const HomePage = ({ onNewMixtape, onLoadMixtape, onOpenLibrary, onOpenAuth, onOpenJCards }: HomePageProps) => {
  const { user } = useAuth();
  const [recentTapes, setRecentTapes] = useState<Mixtape[]>([]);

  useEffect(() => {
    if (!user) { setRecentTapes([]); return; }
    loadMixtapes(user.id)
      .then(tapes => setRecentTapes(tapes.slice(0, 3)))
      .catch(() => {});
  }, [user]);

  return (
    <div className="lp-page">
      <NavBar
        onGoHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onOpenAuth={onOpenAuth}
        onNewMixtape={onNewMixtape}
        onOpenLibrary={onOpenLibrary}
        onOpenJCards={onOpenJCards}
      >
        <a href="#mixtape"      className="lp-nav-link">Mixtape</a>
        <a href="#jcard"        className="lp-nav-link">J-Card</a>
        <a href="#how-it-works" className="lp-nav-link">How it works</a>
      </NavBar>

      <TapeStrip />

      <HeroSection onNewMixtape={onNewMixtape} onOpenJCards={onOpenJCards} />

      <FeatureBar />

      <MixtapeSection onNewMixtape={onNewMixtape} />

      <JCardSection onOpenJCards={onOpenJCards} />

      <HowItWorksSection />

      <CtaSection
        onNewMixtape={onNewMixtape}
        onOpenJCards={onOpenJCards}
        onLoadMixtape={onLoadMixtape}
        user={user}
        recentTapes={recentTapes}
      />

      <HomeFooter onNewMixtape={onNewMixtape} onOpenJCards={onOpenJCards} />
    </div>
  );
};

export default HomePage;
