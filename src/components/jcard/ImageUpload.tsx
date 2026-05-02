import { useState, useRef } from 'react';
import { uploadJCardImage } from '../../utils/supabaseImages';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/jcard/ImageUpload.css';

interface ImageUploadProps {
  label: string;
  currentUrl?: string;
  imageType: 'cover' | 'background';
  cardId?: string;
  onChange: (url: string | null) => void;
}

const ImageUpload = ({ label, currentUrl, imageType, cardId, onChange }: ImageUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WEBP…)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadJCardImage(
        file,
        user?.id ?? 'local',
        imageType,
        cardId,
      );
      onChange(url);
    } catch (e) {
      setError('Upload failed — try again');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const filename = currentUrl
    ? decodeURIComponent(currentUrl.split('/').pop()?.split('?')[0] ?? '')
    : null;

  return (
    <div className="img-upload-root">
      <span className="settings-label">{label}</span>

      <div
        className={`img-upload-drop${dragOver ? ' drag-over' : ''}${currentUrl ? ' has-image' : ''}${uploading ? ' uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
      >
        {/* Preview thumbnail */}
        {currentUrl && (
          <div
            className="img-upload-thumb"
            style={{ backgroundImage: `url(${currentUrl})` }}
          />
        )}

        <div className="img-upload-drop-text">
          {uploading ? (
            <span className="img-upload-spinner">Uploading…</span>
          ) : currentUrl ? (
            <>
              <strong>✓ {filename}</strong>
              <span>Click or drag to replace</span>
            </>
          ) : (
            <>
              <strong>{dragOver ? 'Drop it!' : 'Drag & drop'}</strong>
              <span>or click to choose file</span>
              <span className="img-upload-hint">JPG · PNG · WEBP · up to 10 MB</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleInput}
          disabled={uploading}
        />
      </div>

      {currentUrl && (
        <button
          className="btn btn-secondary img-upload-remove"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          disabled={uploading}
        >
          Remove image
        </button>
      )}

      {error && <p className="img-upload-error">{error}</p>}
    </div>
  );
};

export default ImageUpload;
