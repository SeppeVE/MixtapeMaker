import CassetteSVG from '../tape/CassetteSVG';

interface HeroSectionProps {
  onNewMixtape: () => void;
  onOpenJCards: () => void;
}

const HeroSection = ({ onNewMixtape, onOpenJCards }: HeroSectionProps) => (
  <section className="lp-hero" id="hero">
    {/* Dither background */}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06,
      backgroundImage: "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%235B2838'/%3E%3Crect width='2' height='2' fill='%23EFE8D6'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23EFE8D6'/%3E%3C/svg%3E\")",
    }} />

    {/* Geometric floaters */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <polygon points="80,60 130,140 30,140"   fill="#D4A935" stroke="#2A1E28" strokeWidth="2" opacity="0.35" />
        <polygon points="900,80 960,190 840,190"  fill="#B4A0C7" stroke="#2A1E28" strokeWidth="2" opacity="0.25" />
        <rect x="1000" y="300" width="48" height="48" fill="#8FC9B7" stroke="#2A1E28" strokeWidth="2" opacity="0.3" transform="rotate(18,1024,324)" />
        <circle cx="120" cy="480" r="32" fill="none" stroke="#D4A935" strokeWidth="2" opacity="0.2" />
        <polygon points="1100,500 1130,460 1160,500 1130,540" fill="#5B2838" stroke="#2A1E28" strokeWidth="2" opacity="0.4" />
        <rect x="60" y="350" width="30" height="30" fill="#A8C4A2" stroke="#2A1E28" strokeWidth="2" opacity="0.25" transform="rotate(30,75,365)" />
      </svg>
    </div>

    <div className="lp-hero-inner">
      {/* Left: copy */}
      <div className="lp-hero-left">
        <div className="lp-hero-eyebrow icon-button"><span className='icon'>◆</span><span>MIXTAPE MAKER</span></div>

        <div className="lp-hero-headline">
          MIX.<br />DESIGN.<br /><span className='lp-hero-headline-accent'>ENJOY.</span>
        </div>

        <p className="lp-hero-sub">
          Build perfect mixtapes with auto length calculation, then design beautiful
          print-ready J-cards. No account needed — just press play.
        </p>

        <div className="lp-hero-ctas">
          <button className="lp-btn lp-btn-mustard lp-btn-lg icon-button" onClick={onNewMixtape}><span className='icon'>▶</span><span>Make a Tape</span></button>
          <button className="lp-btn lp-btn-paper lp-btn-lg icon-button" onClick={onOpenJCards}><span className='icon'>✦</span><span>Design a J-Card</span></button>
        </div>

        <div className="lp-hero-note">Free to use · No sign-in · Works in your browser</div>
      </div>

      {/* Right: animated cassette */}
      <div className="lp-hero-right">
        <CassetteSVG />
      </div>
    </div>
  </section>
);

export default HeroSection;
