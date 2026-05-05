import { useAuth } from '../../contexts/AuthContext';
import '../../styles/NavBar.css';

interface NavBarProps {
  onGoHome: () => void;
  onOpenAuth: () => void;
  children?: React.ReactNode;       // middle section: nav links, breadcrumb, etc.
  onNewMixtape?: () => void;        // renders "Make a Tape" button when provided
  onOpenLibrary?: () => void;       // renders "Library" button when provided
  onOpenJCards?: () => void;        // renders "J-Cards" button when provided
  onSave?: () => void;              // renders "Save" button when provided
  isSaving?: boolean;
}

const NavBar = ({
  onGoHome,
  onOpenAuth,
  children,
  onNewMixtape,
  onOpenLibrary,
  onOpenJCards,
  onSave,
  isSaving = false,
}: NavBarProps) => {
  const { user, signOut } = useAuth();

  return (
    <nav className="lp-nav">

      {/* Logo */}
      <button className="lp-logo" onClick={onGoHome}>
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
          <rect x="1" y="1" width="18" height="12" rx="2" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
          <circle cx="6" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
          <circle cx="14" cy="8" r="2.5" stroke="#2A1E28" strokeWidth="1.5" fill="none" />
          <rect x="4" y="10.5" width="12" height="1" fill="#2A1E28" />
        </svg>
        <span className='lp-logo-text'>
          Mixtape Maker
        </span>
      </button>

      {/* Middle slot */}
      {children && (
        <div className="lp-nav-links">
          {children}
        </div>
      )}

      {/* Right CTAs */}
      <div className="lp-nav-ctas">
        {user && <span className="lp-nav-user">●● {user.email?.split('@')[0]}</span>}
        {onOpenLibrary && (
          <button className="lp-btn lp-btn-paper" onClick={onOpenLibrary}>Library</button>
        )}
        {onSave && (
          <button className="lp-btn lp-btn-paper" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        )}
        {user ? (
          <button className="lp-btn lp-btn-paper" onClick={signOut}>Sign Out</button>
        ) : (
          <button className="lp-btn lp-btn-paper" onClick={onOpenAuth}>Sign In</button>
        )}
      </div>

    </nav>
  );
};

export default NavBar;
