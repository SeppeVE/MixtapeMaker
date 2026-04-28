import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import pencilIcon from '../../../assets/images/icons/pencil.svg';
import '../../styles/Header.css';

interface HeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onNewMixtape: () => void;
  onSave: () => void;
  onOpenLibrary: () => void;
  onOpenAuth: () => void;
}

const Header = ({
  title,
  onTitleChange,
  onNewMixtape,
  onSave,
  onOpenLibrary,
  onOpenAuth,
}: HeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const { user, signOut } = useAuth();

  const handleSaveTitle = () => {
    onTitleChange(editTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(title);
      setIsEditing(false);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="title-section">
          {isEditing ? (
            <div className="title-container editing">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={handleKeyDown}
                className="title-input"
                autoFocus
              />
            </div>
          ) : (
            <div className="title-container" onClick={() => setIsEditing(true)}>
              <h1 className="title">{title}</h1>
              <img src={pencilIcon} alt="Edit title" className="pencil-icon" />
            </div>
          )}
        </div>
        <div className="header-actions">
          {user ? (
            <>
              <button onClick={onOpenLibrary} className="btn btn-secondary">
                My Library
              </button>
              <button onClick={onNewMixtape} className="btn btn-secondary">
                New Mixtape
              </button>
              <button onClick={onSave} className="btn btn-primary">
                Save to Cloud
              </button>
              <button onClick={signOut} className="btn btn-secondary">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={onNewMixtape} className="btn btn-secondary">
                New Mixtape
              </button>
              <button onClick={onOpenAuth} className="btn btn-primary">
                Sign In / Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
