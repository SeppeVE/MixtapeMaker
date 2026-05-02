import { useState } from 'react';
import { JCardDesign } from './JCardDesigner';

interface JCardEditorProps {
  design: JCardDesign;
  onDesignChange: (updates: Partial<JCardDesign>) => void;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 14 14" fill="none"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
  >
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Section = ({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="jcard-section">
      <button className="jcard-section-toggle" onClick={() => setOpen(o => !o)}>
        <span className="jcard-section-toggle-label">
          <span className="jcard-section-icon">{icon}</span>
          {title}
        </span>
        <ChevronIcon open={open} />
      </button>
      {open && <div className="jcard-section-body">{children}</div>}
    </div>
  );
};

const JCardEditor = ({ design, onDesignChange }: JCardEditorProps) => {
  const templates = [
    { id: 'classic', name: 'Classic', description: 'Clean and minimal' },
    { id: 'vintage', name: 'Vintage', description: 'Retro cassette vibes' },
    { id: 'modern', name: 'Modern', description: 'Bold and contemporary' }
  ];

  const colorPresets = [
    { name: 'Cream', bg: '#f8f6f0', text: '#2c2c2c', accent: '#d4524a' },
    { name: 'Midnight', bg: '#1a1a1a', text: '#ffffff', accent: '#ff6b6b' },
    { name: 'Ocean', bg: '#e8f4f8', text: '#1a365d', accent: '#3182ce' },
    { name: 'Sunset', bg: '#fff5f5', text: '#742a2a', accent: '#ed8936' },
    { name: 'Forest', bg: '#f0fff4', text: '#1a202c', accent: '#38a169' }
  ];

  const fontOptions = [
    { id: 'system', name: 'System' },
    { id: 'display', name: 'Display' },
    { id: 'monospace', name: 'Mono' }
  ];

  return (
    <div className="jcard-editor">
      <div className="jcard-editor-header">
        <span>Design</span>
      </div>

      {/* Template */}
      <Section title="Template" icon="🎨" defaultOpen={true}>
        <div className="jcard-template-grid">
          {templates.map(template => (
            <button
              key={template.id}
              className={`jcard-template-card ${design.template === template.id ? 'active' : ''}`}
              onClick={() => onDesignChange({ template: template.id })}
            >
              <div className="jcard-template-name">{template.name}</div>
              <div className="jcard-template-desc">{template.description}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Colors */}
      <Section title="Colors" icon="🖌️" defaultOpen={true}>
        <div className="jcard-color-grid">
          {colorPresets.map((preset, index) => (
            <button
              key={index}
              className="jcard-color-preset"
              title={preset.name}
              onClick={() => onDesignChange({
                backgroundColor: preset.bg,
                textColor: preset.text,
                accentColor: preset.accent
              })}
            >
              <div className="jcard-color-preview">
                <div className="jcard-color-bg" style={{ backgroundColor: preset.bg }} />
                <div className="jcard-color-accent" style={{ backgroundColor: preset.accent }} />
              </div>
              <div className="jcard-color-name">{preset.name}</div>
            </button>
          ))}
        </div>
        <div className="jcard-color-controls">
          <div className="jcard-color-control">
            <label>Background</label>
            <input
              type="color"
              value={design.backgroundColor}
              onChange={(e) => onDesignChange({ backgroundColor: e.target.value })}
            />
          </div>
          <div className="jcard-color-control">
            <label>Text</label>
            <input
              type="color"
              value={design.textColor}
              onChange={(e) => onDesignChange({ textColor: e.target.value })}
            />
          </div>
          <div className="jcard-color-control">
            <label>Accent</label>
            <input
              type="color"
              value={design.accentColor}
              onChange={(e) => onDesignChange({ accentColor: e.target.value })}
            />
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section title="Typography" icon="Aa" defaultOpen={false}>
        <div className="jcard-control">
          <label>Font</label>
          <select
            value={design.fontFamily}
            onChange={(e) => onDesignChange({ fontFamily: e.target.value })}
          >
            {fontOptions.map(font => (
              <option key={font.id} value={font.id}>{font.name}</option>
            ))}
          </select>
        </div>
        <div className="jcard-control" style={{ marginTop: 10 }}>
          <div className="jcard-slider-row">
            <label>Font Size</label>
            <span className="jcard-slider-value">{design.fontSize}px</span>
          </div>
          <input
            type="range" min="6" max="16" step="1"
            value={design.fontSize}
            onChange={(e) => onDesignChange({ fontSize: parseInt(e.target.value) })}
            className="jcard-slider"
          />
          <div className="jcard-presets">
            <button onClick={() => onDesignChange({ fontSize: 8 })}>Small</button>
            <button onClick={() => onDesignChange({ fontSize: 10 })}>Medium</button>
            <button onClick={() => onDesignChange({ fontSize: 12 })}>Large</button>
          </div>
        </div>
      </Section>

      {/* Zoom */}
      <Section title="Zoom" icon="🔍" defaultOpen={false}>
        <div className="jcard-slider-row">
          <label>Scale</label>
          <span className="jcard-slider-value">{Math.round(design.scale * 100)}%</span>
        </div>
        <input
          type="range" min="0.5" max="2.0" step="0.1"
          value={design.scale}
          onChange={(e) => onDesignChange({ scale: parseFloat(e.target.value) })}
          className="jcard-slider"
        />
        <div className="jcard-presets">
          <button onClick={() => onDesignChange({ scale: 0.75 })}>75%</button>
          <button onClick={() => onDesignChange({ scale: 1.0 })}>100%</button>
          <button onClick={() => onDesignChange({ scale: 1.5 })}>150%</button>
        </div>
      </Section>

      {/* Options */}
      <Section title="Options" icon="⚙️" defaultOpen={false}>
        <div className="jcard-options">
          <label className="jcard-checkbox">
            <input
              type="checkbox"
              checked={design.useNormalBack}
              onChange={(e) => onDesignChange({ useNormalBack: e.target.checked })}
            />
            <span>Full track listing on back</span>
          </label>
          <label className="jcard-checkbox">
            <input
              type="checkbox"
              checked={design.showAlbumCovers}
              onChange={(e) => onDesignChange({ showAlbumCovers: e.target.checked })}
            />
            <span>Show album covers</span>
          </label>
        </div>
      </Section>
    </div>
  );
};

export default JCardEditor;