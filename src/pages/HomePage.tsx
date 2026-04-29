import { useState, useEffect } from 'react';
import { Mixtape } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { loadMixtapes } from '../utils/database';
import NavBar from '../components/ui/NavBar';
import CassetteSVG from '../components/tape/CassetteSVG';
import '../styles/LandingPage.css';

interface HomePageProps {
  onNewMixtape: () => void;
  onLoadMixtape: (mixtape: Mixtape) => void;
  onOpenLibrary: () => void;
  onOpenAuth: () => void;
  onOpenJCards: () => void;
}

// ── Tape strip decoration ────────────────────────────────────────
const STRIP_A = ['#D4A935','#5B2838','#8FC9B7','#B4A0C7','#A8C4A2','#3D5A47','#D4A935','#5B2838','#8FC9B7','#B4A0C7','#A8C4A2','#3D5A47'];
const STRIP_B = ['#3D5A47','#A8C4A2','#B4A0C7','#8FC9B7','#5B2838','#D4A935','#3D5A47','#A8C4A2','#B4A0C7','#8FC9B7','#5B2838','#D4A935'];

const TapeStrip = ({ reverse = false }) => (
  <div className="lp-tape-strip">
    {(reverse ? STRIP_B : STRIP_A).map((c, i) => (
      <span key={i} style={{ background: c }} />
    ))}
  </div>
);

// ── Cassette SVG (reels animated, tape flowing, whole thing floating) ────────
// CassetteSVG is now a shared component — imported above

// ── Song list mock — mirrors the actual TapeSide component ───────────────────
const MOCK_SONGS_A = [
  { title: 'Fade Into You',      artist: 'Mazzy Star',      dur: '3:35', pct: 31 },
  { title: 'Dreams',             artist: 'Fleetwood Mac',   dur: '4:14', pct: 37 },
  { title: 'The Chain',          artist: 'Fleetwood Mac',   dur: '4:30', pct: 40 },
  { title: 'Running Up That Hill', artist: 'Kate Bush',     dur: '5:02', pct: 45 },
];

const MixtapeEditorMock = () => (
  <div className="lp-mock-window lp-shadow-lg">
    {/* App-style title bar */}
    <div style={{
      background: 'var(--color-text)',
      color: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '4px 8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
    }}>
      <div className="lp-mock-close" style={{ background: 'var(--color-paper)' }}>×</div>
      <span style={{ opacity: 0.6 }}>◀ Library</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span>Summer Drive '94</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', background: 'var(--color-forest)', color: 'var(--color-paper)', padding: '1px 8px' }}>🎴 J-Cards</span>
      <span style={{ background: 'var(--color-plum)', color: 'var(--color-paper)', padding: '2px 10px 1px', fontFamily: 'var(--font-display)', fontSize: '14px' }}>Save</span>
    </div>

    {/* TapeSide: side header */}
    <div style={{
      background: 'var(--color-forest)',
      color: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '5px 8px 4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '0.3px' }}>◀ SIDE A</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', opacity: 0.85 }}>17:21 / 30:00</span>
    </div>

    {/* Song list */}
    <div style={{
      background: 'var(--color-seafoam)',
      padding: '7px',
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    }}>
      {MOCK_SONGS_A.map((song, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--color-paper)',
          border: '2px solid var(--color-text)',
          boxShadow: '2px 2px 0 var(--color-text)',
        }}>
          {/* Number tab — floppy notch style */}
          <div style={{
            background: 'var(--color-forest)',
            color: 'var(--color-paper)',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            minWidth: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '2px solid var(--color-text)',
            padding: '5px 4px',
            position: 'relative',
            flexShrink: 0,
          }}>
            {i + 1}
            {/* notch cutout */}
            <div style={{
              position: 'absolute',
              top: 0, right: 0,
              width: '6px', height: '6px',
              background: 'var(--color-seafoam)',
              borderLeft: '1.5px solid var(--color-text)',
              borderBottom: '1.5px solid var(--color-text)',
            }} />
          </div>

          {/* Song info */}
          <div style={{
            flex: 1,
            padding: '5px 9px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}>
            <div style={{ fontWeight: 700, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song.title}
            </div>
            <div style={{ color: 'var(--color-text-light)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
              {song.artist}
            </div>
          </div>

          {/* Duration */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--color-text)',
            opacity: 0.7,
            flexShrink: 0,
          }}>
            {song.dur}
          </div>
        </div>
      ))}

      {/* Ghost "add" row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--color-paper)',
        border: '2px dashed rgba(42,30,40,0.25)',
        padding: '6px 9px',
        opacity: 0.45,
        gap: '8px',
      }}>
        <div style={{
          minWidth: '30px',
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '16px',
          opacity: 0.5,
        }}>+</div>
        <span style={{ fontSize: '11px', fontStyle: 'italic' }}>add a track…</span>
      </div>
    </div>

    {/* Tape meter footer */}
    <div style={{
      borderTop: '2px solid var(--color-text)',
      background: 'var(--color-paper)',
      padding: '7px 10px 8px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontSize: '15px',
        lineHeight: 1,
        marginBottom: '5px',
      }}>
        <span style={{ opacity: 0.7 }}>Used: 17:21</span>
        <span style={{ color: 'var(--color-forest)' }}>12:39 free</span>
      </div>
      {/* fill bar */}
      <div style={{
        height: '16px',
        background: 'var(--color-white)',
        border: '2px solid var(--color-text)',
        boxShadow: 'inset -1px -1px 0 rgba(255,255,255,.5), inset 1px 1px 0 rgba(0,0,0,.35)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: '58%',
          background: 'var(--color-plum)',
          backgroundImage: 'repeating-linear-gradient(-45deg, transparent 0px, transparent 3px, rgba(0,0,0,.18) 3px, rgba(0,0,0,.18) 6px)',
        }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
          {[...Array(9)].map((_, j) => (
            <div key={j} style={{ flex: 1, borderRight: '1px solid rgba(42,30,40,.28)' }} />
          ))}
        </div>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontSize: '11px',
        opacity: 0.55,
        marginTop: '3px',
      }}>
        <span>0:00</span>
        <span>C-60 (30:00 / side)</span>
        <span>30:00</span>
      </div>
    </div>
  </div>
);

// ── J-Card mock — mirrors the actual JCardView / JCardPreview ────────────────
const JCardMock = () => (
  <div style={{ boxShadow: '8px 8px 0 var(--color-text)', border: '2.5px solid var(--color-text)' }}>
    {/* Toolbar matching actual jcard-view-toolbar */}
    <div style={{
      background: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '6px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-display)',
      fontSize: '18px',
    }}>
      <div className="lp-mock-close" style={{ background: 'var(--color-paper)' }}>×</div>
      <span style={{ opacity: 0.5 }}>◀ Editor</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span>✦ J-Cards</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', background: 'var(--color-mustard)', color: 'var(--color-text)', padding: '2px 12px 1px', border: '1.5px solid var(--color-text)', boxShadow: '2px 2px 0 var(--color-text)' }}>↓ Export PDF</span>
    </div>

    {/* Card library row */}
    <div style={{
      background: 'var(--color-paper)',
      borderBottom: '2px solid var(--color-text)',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', background: 'var(--color-mustard)', color: 'var(--color-text)', padding: '2px 10px 1px', border: '1.5px solid var(--color-text)', boxShadow: '2px 2px 0 var(--color-text)', cursor: 'default' }}>✦ J-Cards</span>
      <div style={{ flex: 1 }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', opacity: 0.5 }}>+ New Card</span>
    </div>

    {/* J-Card preview area */}
    <div style={{ background: '#e8e0cc', padding: '16px' }}>
      {/* The actual J-card */}
      <div style={{
        display: 'flex',
        border: '2px solid var(--color-text)',
        boxShadow: '4px 4px 0 var(--color-text)',
        background: 'var(--color-paper)',
      }}>

        {/* Spine — vertical title like the actual app */}
        <div style={{
          width: '34px',
          background: 'var(--color-plum)',
          borderRight: '2px solid var(--color-text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          writingMode: 'vertical-rl',
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          letterSpacing: '2px',
          color: 'var(--color-paper)',
          padding: '10px 0',
          flexShrink: 0,
          userSelect: 'none',
        }}>
          SUMMER DRIVE '94
        </div>

        {/* Front/cover flap */}
        <div style={{
          flex: 1.15,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid var(--color-text)',
          minHeight: '200px',
        }}>
          {/* Cover art area — matches CoverFlap */}
          <div style={{
            flex: 1,
            background: 'var(--color-text-light)',
            backgroundImage: [
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px)',
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 8px)',
            ].join(', '),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '12px',
            minHeight: '130px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle art placeholder lines */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '6px', opacity: 0.15 }}>
              {[80, 60, 50, 70, 45].map((w, k) => (
                <div key={k} style={{ width: `${w}%`, height: '3px', background: 'white', borderRadius: '2px' }} />
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              cover art
            </div>
          </div>
          {/* Title / meta strip */}
          <div style={{
            padding: '7px 10px',
            borderTop: '2px solid var(--color-text)',
            background: 'var(--color-paper)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', letterSpacing: '0.5px', color: 'var(--color-text)', lineHeight: 1.2 }}>
              Summer Drive '94
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '9px', color: 'var(--color-text-light)', opacity: 0.7 }}>Mixed by Seppe</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', background: 'var(--color-mustard)', color: 'var(--color-text)', padding: '0px 5px', border: '1px solid var(--color-text)' }}>C-60</span>
            </div>
          </div>
        </div>

        {/* Back panel — track list, matching JCardCanvas back-normal */}
        <div style={{
          flex: 1,
          padding: '9px',
          background: '#FAF6EB',
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          color: 'var(--color-text-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px', marginBottom: '3px', color: 'var(--color-plum)' }}>
            SIDE A (17:21)
          </div>
          {[
            '1. Fade Into You — 3:35',
            '2. Dreams — 4:14',
            '3. The Chain — 4:30',
            '4. Running Up That Hill — 5:02',
          ].map((t, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--color-paper-dk)', paddingBottom: '2px' }}>{t}</div>
          ))}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', letterSpacing: '1px', marginTop: '5px', marginBottom: '3px', color: 'var(--color-plum)' }}>
            SIDE B (18:05)
          </div>
          {[
            '1. Blue — 3:12',
            '2. Heroes — 6:07',
            '3. Maps — 3:40',
            '4. Lovefool — 3:01',
          ].map((t, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--color-paper-dk)', paddingBottom: '2px' }}>{t}</div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', opacity: 0.4, fontSize: '9px' }}>
            <span>Apr 2026</span>
            <span>🅼 CASSETTE</span>
          </div>
        </div>
      </div>

      {/* Export buttons matching actual app */}
      <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
        <div className="lp-btn lp-btn-plum" style={{ fontSize: '16px', padding: '4px 14px 2px', cursor: 'default', boxShadow: '2px 2px 0 var(--color-text)' }}>↓ Export PDF</div>
        <div className="lp-btn lp-btn-paper" style={{ fontSize: '16px', padding: '4px 14px 2px', cursor: 'default', boxShadow: '2px 2px 0 var(--color-text)' }}>↓ Export PNG</div>
      </div>
    </div>
  </div>
);


// ═══════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════

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

      {/* ── NAV ── */}
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

      {/* ── HERO ── */}
      <section className="lp-hero" id="hero">
        {/* dither bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06,
          backgroundImage: "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%235B2838'/%3E%3Crect width='2' height='2' fill='%23EFE8D6'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%23EFE8D6'/%3E%3C/svg%3E\")",
        }} />

        {/* geometric floaters */}
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
            <div className="lp-hero-eyebrow">◆ FOR CASSETTE ENTHUSIASTS</div>

            <div className="lp-hero-headline">
              MIX.<br />DESIGN.<br /><em>REWIND.</em>
            </div>

            <p className="lp-hero-sub">
              Build perfect mixtapes with auto length calculation, then design beautiful
              print-ready J-cards. No account needed — just press play.
            </p>

            <div className="lp-hero-ctas">
              <button className="lp-btn lp-btn-mustard lp-btn-lg" onClick={onNewMixtape}>▶ Make a Tape</button>
              <button className="lp-btn lp-btn-paper   lp-btn-lg" onClick={onOpenJCards}>✦ Design a J-Card</button>
            </div>

            <div className="lp-hero-note">Free to use · No sign-in · Works in your browser</div>
          </div>

          {/* Right: animated cassette */}
          <div className="lp-hero-right">
            <CassetteSVG />
          </div>
        </div>
      </section>

      {/* ── FEATURE BAR ── */}
      <div className="lp-feature-bar">
        <div className="lp-feature-bar-inner">
          {[
            { icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h10M8 3v10" stroke="#EFE8D6" strokeWidth="2"/></svg>,                    label: 'Auto length calculation' },
            { icon: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="8" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><line x1="2" y1="7" x2="14" y2="7" stroke="#EFE8D6" strokeWidth="1"/></svg>, label: 'Side A & B balancing' },
            { icon: <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><rect x="4" y="4" width="8" height="5" fill="#EFE8D6" fillOpacity="0.4"/></svg>, label: 'J-Card designer' },
            { icon: <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 13 L3 6 L8 3 L13 6 L13 13 Z" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><rect x="6" y="9" width="4" height="4" fill="#EFE8D6" fillOpacity="0.5"/></svg>, label: 'Print-ready export' },
            { icon: <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" stroke="#EFE8D6" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="#EFE8D6" fillOpacity="0.5"/></svg>,                 label: 'No account needed' },
          ].map(({ icon, label }, i) => (
            <div key={i} className="lp-feature-pill">
              <div className="lp-pill-icon">{icon}</div>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── MIXTAPE SECTION ── */}
      <section id="mixtape" className="lp-section" style={{ background: 'var(--color-paper)', borderBottom: '3px solid var(--color-text)' }}>
        {/* geo deco */}
        <div style={{ position: 'absolute', top: '40px', right: '60px', width: '80px', height: '80px', border: '2px solid var(--color-sage)', opacity: 0.35, transform: 'rotate(12deg)', pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: '60px', left: '40px', opacity: 0.25, pointerEvents: 'none', zIndex: 1 }}>
          <svg width="60" height="60"><polygon points="30,4 56,52 4,52" fill="none" stroke="#3D5A47" strokeWidth="2" /></svg>
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: "url(\"data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23EFE8D6'/%3E%3Crect width='2' height='2' fill='%232A1E28'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%232A1E28'/%3E%3C/svg%3E\")", pointerEvents: 'none', zIndex: 0 }} />

        <div className="lp-section-inner">
          <div className="lp-split">
            {/* Text */}
            <div className="lp-split-text">
              <div className="lp-section-label" style={{ color: 'var(--color-text-light)' }}>Feature 01</div>
              <div className="lp-section-title" style={{ color: 'var(--color-plum)' }}>The Mixtape<br />Editor.</div>
              <p className="lp-section-body" style={{ color: 'var(--color-text-light)' }}>
                Add tracks to Side A and Side B, enter run times, and watch the length bar fill
                up in real time. Cassette tells you exactly how much tape you have left — no more
                cutting songs short.
              </p>
              <ul className="lp-feature-list" style={{ color: 'var(--color-text-light)' }}>
                <li>Drag-and-drop track ordering for both sides</li>
                <li>Real-time tape fill meter with over-length warnings</li>
                <li>Supports C-46, C-60, C-90, and custom tape lengths</li>
                <li>Import from Spotify or enter tracks manually</li>
              </ul>
              <div>
                <button className="lp-btn lp-btn-forest" style={{ fontSize: '22px', padding: '7px 22px 4px' }} onClick={onNewMixtape}>
                  ▶ Try the Mixtape Editor →
                </button>
              </div>
            </div>

            {/* Mock */}
            <div className="lp-split-visual">
              <MixtapeEditorMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── J-CARD SECTION ── */}
      <section id="jcard" className="lp-section" style={{ background: 'var(--color-sage)', borderBottom: '3px solid var(--color-text)' }}>
        <div style={{ position: 'absolute', top: '50px', left: '80px', opacity: 0.3, pointerEvents: 'none', zIndex: 1 }}>
          <svg width="70" height="70"><polygon points="35,2 68,62 2,62" fill="none" stroke="#2A1E28" strokeWidth="2" /></svg>
        </div>
        <div style={{ position: 'absolute', bottom: '40px', right: '50px', width: '60px', height: '60px', border: '2px solid var(--color-text)', opacity: 0.2, transform: 'rotate(20deg)', pointerEvents: 'none', zIndex: 1 }} />

        <div className="lp-section-inner">
          <div className="lp-split lp-split-reverse">
            {/* Text */}
            <div className="lp-split-text">
              <div className="lp-section-label" style={{ color: 'var(--color-forest)' }}>Feature 02</div>
              <div className="lp-section-title" style={{ color: 'var(--color-text)' }}>The J-Card<br />Designer.</div>
              <p className="lp-section-body" style={{ color: 'var(--color-text-light)' }}>
                Every great mixtape deserves a proper J-card. Upload cover art, style the spine
                with your tape's title, lay out the track list on the back, and export a
                perfectly-sized PDF ready to fold and slip in the case.
              </p>
              <ul className="lp-feature-list" style={{ color: 'var(--color-text-light)' }}>
                <li>Full J-card template: spine, front and back panels</li>
                <li>Upload your own cover art or use a built-in layout</li>
                <li>Auto-imports track list from your mixtape</li>
                <li>Export as print-ready PDF or high-res PNG</li>
              </ul>
              <div>
                <button className="lp-btn lp-btn-plum" style={{ fontSize: '22px', padding: '7px 22px 4px' }} onClick={onOpenJCards}>
                  ✦ Design your J-Card →
                </button>
              </div>
            </div>

            {/* Mock */}
            <div className="lp-split-visual">
              <JCardMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-how">
        <div className="lp-section-inner">
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <div className="lp-section-label" style={{ color: 'var(--color-mustard)', letterSpacing: '3px' }}>Process</div>
            <div className="lp-section-title" style={{ color: 'var(--color-paper)', marginTop: '8px' }}>How it works.</div>
          </div>
          <div className="lp-steps-grid">
            <div className="lp-step">
              <div className="lp-step-number">01</div>
              <div className="lp-step-title">Build your tracklist</div>
              <p className="lp-step-desc">
                Add songs to Side A and Side B, enter their run times, and watch the tape fill
                meter update as you go. Cassette flags you when a side is full.
              </p>
              <div className="lp-step-tag">Mixtape Editor</div>
            </div>
            <div className="lp-step">
              <div className="lp-step-number">02</div>
              <div className="lp-step-title">Fine-tune the sequence</div>
              <p className="lp-step-desc">
                Rearrange tracks by dragging them up and down. Balance both sides so neither ends
                with dead air. Obsess over the running order — it matters.
              </p>
              <div className="lp-step-tag">Mixtape Editor</div>
            </div>
            <div className="lp-step">
              <div className="lp-step-number">03</div>
              <div className="lp-step-title">Design your J-Card</div>
              <p className="lp-step-desc">
                Switch to the J-Card designer, upload cover art, add your title and tracklist,
                style the spine — then export a print-ready PDF sized to fold into a standard
                cassette case.
              </p>
              <div className="lp-step-tag">J-Card Designer</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-section-inner">
          <div className="lp-cta-inner">
            <div className="lp-cta-headline">Ready to<br />make a tape?</div>

            <div className="lp-cta-cards">
              <button className="lp-cta-card" onClick={onNewMixtape}>
                <div className="lp-cta-card-head" style={{ background: 'var(--color-forest)' }}>
                  <div className="lp-cta-card-icon">📼</div>
                  <div className="lp-cta-card-title">Mixtape Editor</div>
                  <p className="lp-cta-card-desc">Build, balance, and perfect your track list with real-time tape length calculation.</p>
                </div>
                <div className="lp-cta-card-foot">
                  <span>Start mixing</span>
                  <span>→</span>
                </div>
              </button>

              <button className="lp-cta-card" onClick={onOpenJCards}>
                <div className="lp-cta-card-head" style={{ background: 'var(--color-plum)' }}>
                  <div className="lp-cta-card-icon">🃏</div>
                  <div className="lp-cta-card-title">J-Card Designer</div>
                  <p className="lp-cta-card-desc">Upload cover art, style the spine and back panel, and export a print-ready PDF.</p>
                </div>
                <div className="lp-cta-card-foot">
                  <span>Start designing</span>
                  <span>→</span>
                </div>
              </button>
            </div>

            <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '1px', opacity: 0.5, color: 'var(--color-text)' }}>
              No account · No cost · 100% in your browser
            </div>

            {/* Recent tapes for signed-in users */}
            {user && recentTapes.length > 0 && (
              <div className="lp-recent">
                <div className="lp-recent-heading">⌯ Your Recent Tapes</div>
                <div className="lp-recent-row">
                  {recentTapes.map(tape => (
                    <div key={tape.id} className="lp-tape-card" onClick={() => onLoadMixtape(tape)}>
                      <div className="lp-tape-card-top">
                        <span className="lp-tape-card-title">{tape.title}</span>
                        <span className="lp-tape-card-len">C{tape.cassetteLength}</span>
                      </div>
                      <div className="lp-tape-card-body">
                        A · {tape.sideA.length} trk<br />
                        B · {tape.sideB.length} trk
                      </div>
                      <div className="lp-tape-card-footer">
                        <span className="lp-tape-card-action">▶ Load</span>
                        <span className="lp-tape-card-date">
                          {new Date(tape.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <TapeStrip reverse />
      <footer className="lp-footer">
        <div className="lp-foot-logo">
          <svg width="18" height="12" viewBox="0 0 20 14" fill="none" style={{ verticalAlign: 'middle' }}>
            <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
            <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
            <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
          </svg>
          CASSETTE
        </div>
        <div className="lp-foot-note">Make mixtapes. Design J-cards. Press play.</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="lp-btn lp-btn-paper" style={{ fontSize: '15px', padding: '3px 12px 1px' }} onClick={onNewMixtape}>Mixtape Editor</button>
          <button className="lp-btn lp-btn-plum"  style={{ fontSize: '15px', padding: '3px 12px 1px' }} onClick={onOpenJCards}>J-Card Designer</button>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
