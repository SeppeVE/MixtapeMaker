import { useState } from 'react';
import { Mixtape } from '../types';
import JCardCanvas from './JCardCanvas';
import JCardEditor from './JCardEditor';
import '../../assets/styles/JCardDesigner.css';

interface JCardDesignerProps {
  mixtape: Mixtape;
  onBack: () => void;
}

export interface JCardDesign {
  template: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  showAlbumCovers: boolean;
  useNormalBack: boolean;
  scale: number;
  fontSize: number;
}

const JCardDesigner = ({ mixtape, onBack }: JCardDesignerProps) => {
  const [design, setDesign] = useState<JCardDesign>({
    template: 'classic',
    backgroundColor: '#f8f6f0',
    textColor: '#2c2c2c',
    accentColor: '#d4524a',
    fontFamily: 'system',
    showAlbumCovers: true,
    useNormalBack: false,
    scale: 1.0,
    fontSize: 10, // Base font size in px
  });

  const handleDesignChange = (updates: Partial<JCardDesign>) => {
    setDesign(prev => ({ ...prev, ...updates }));
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting j-card...', { mixtape, design });
  };

  return (
    <div className="jcard-designer">
      {/* Header */}
      <div className="jcard-header">
        <button className="jcard-back-btn" onClick={onBack}>
          ← Back to Editor
        </button>
        <div className="jcard-header-title">
          <span className="jcard-header-label">J-Card Designer</span>
          <span className="jcard-header-mixtape">{mixtape.title}</span>
        </div>
        <div className="jcard-header-actions">
          <button className="btn" onClick={handleExport}>
            💾 Export PDF
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="jcard-content">
        {/* Canvas Preview */}
        <div className="jcard-canvas-container">
          <JCardCanvas mixtape={mixtape} design={design} />
        </div>

        {/* Design Controls */}
        <div className="jcard-editor-container">
          <JCardEditor design={design} onDesignChange={handleDesignChange} />
        </div>
      </div>
    </div>
  );
};

export default JCardDesigner;