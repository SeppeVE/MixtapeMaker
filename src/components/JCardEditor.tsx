import { JCardDesign } from './JCardDesigner';

interface JCardEditorProps {
  design: JCardDesign;
  onDesignChange: (updates: Partial<JCardDesign>) => void;
}

const JCardEditor = ({ design, onDesignChange }: JCardEditorProps) => {
  const templates = [
    { id: 'classic', name: 'Classic', description: 'Clean and minimal' },
    { id: 'vintage', name: 'Vintage', description: 'Retro cassette vibes' },
    { id: 'modern', name: 'Modern', description: 'Bold and contemporary' }
  ];

  const colorPresets = [
    { name: 'Cream Classic', bg: '#f8f6f0', text: '#2c2c2c', accent: '#d4524a' },
    { name: 'Midnight', bg: '#1a1a1a', text: '#ffffff', accent: '#ff6b6b' },
    { name: 'Ocean Blue', bg: '#e8f4f8', text: '#1a365d', accent: '#3182ce' },
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
      <div className="jcard-editor-header">Design Controls</div>

      {/* Templates */}
      <div className="jcard-section">
        <div className="jcard-section-title">Template</div>
        <div className="jcard-template-grid">
          {templates.map(template => (
            <div
              key={template.id}
              className={`jcard-template-card ${design.template === template.id ? 'active' : ''}`}
              onClick={() => onDesignChange({ template: template.id })}
            >
              <div className="jcard-template-name">{template.name}</div>
              <div className="jcard-template-desc">{template.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Color Presets */}
      <div className="jcard-section">
        <div className="jcard-section-title">Color Schemes</div>
        <div className="jcard-color-grid">
          {colorPresets.map((preset, index) => (
            <div
              key={index}
              className="jcard-color-preset"
              onClick={() => onDesignChange({
                backgroundColor: preset.bg,
                textColor: preset.text,
                accentColor: preset.accent
              })}
            >
              <div className="jcard-color-preview">
                <div
                  className="jcard-color-bg"
                  style={{ backgroundColor: preset.bg }}
                />
                <div
                  className="jcard-color-accent"
                  style={{ backgroundColor: preset.accent }}
                />
              </div>
              <div className="jcard-color-name">{preset.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="jcard-section">
        <div className="jcard-section-title">Custom Colors</div>
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
      </div>

      {/* Typography */}
      <div className="jcard-section">
        <div className="jcard-section-title">Typography</div>
        <div className="jcard-font-controls">
          <div className="jcard-control">
            <label>Font Family</label>
            <select
              value={design.fontFamily}
              onChange={(e) => onDesignChange({ fontFamily: e.target.value })}
            >
              {fontOptions.map(font => (
                <option key={font.id} value={font.id}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>
          <div className="jcard-control">
            <label>Font Size: {design.fontSize}px</label>
            <input
              type="range"
              min="6"
              max="16"
              step="1"
              value={design.fontSize}
              onChange={(e) => onDesignChange({ fontSize: parseInt(e.target.value) })}
              className="jcard-font-slider"
            />
            <div className="jcard-font-presets">
              <button onClick={() => onDesignChange({ fontSize: 8 })}>Small</button>
              <button onClick={() => onDesignChange({ fontSize: 10 })}>Medium</button>
              <button onClick={() => onDesignChange({ fontSize: 12 })}>Large</button>
            </div>
          </div>
        </div>
      </div>

      {/* View Options */}
      <div className="jcard-section">
        <div className="jcard-section-title">View</div>
        <div className="jcard-zoom-control">
          <label>Zoom: {Math.round(design.scale * 100)}%</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={design.scale}
            onChange={(e) => onDesignChange({ scale: parseFloat(e.target.value) })}
            className="jcard-zoom-slider"
          />
          <div className="jcard-zoom-presets">
            <button onClick={() => onDesignChange({ scale: 0.75 })}>75%</button>
            <button onClick={() => onDesignChange({ scale: 1.0 })}>100%</button>
            <button onClick={() => onDesignChange({ scale: 1.5 })}>150%</button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="jcard-section">
        <div className="jcard-section-title">Options</div>
        <div className="jcard-options">
          <label className="jcard-checkbox">
            <input
              type="checkbox"
              checked={design.useNormalBack}
              onChange={(e) => onDesignChange({ useNormalBack: e.target.checked })}
            />
            Use normal back (full track listings)
          </label>
          <label className="jcard-checkbox">
            <input
              type="checkbox"
              checked={design.showAlbumCovers}
              onChange={(e) => onDesignChange({ showAlbumCovers: e.target.checked })}
            />
            Show album covers
          </label>
        </div>
      </div>
    </div>
  );
};

export default JCardEditor;