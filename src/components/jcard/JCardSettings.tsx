import React from 'react';
import { JCardContent, JCard, Mixtape, CustomFont } from '../../types';
import { migrateJCardContent } from '../../utils/jcardDefaults';
import { JCARD_PRESETS } from '../../utils/jcardPresets';
import ContentEditor from './ContentEditor';
import MixtapeLinkPicker from './MixtapeLinkPicker';
import ImageUpload from './ImageUpload';
import { exportJCardToPDF } from '../../utils/jcardPdf';
import { readFileAsBase64, fontNameFromFile, mimeTypeFromFile, registerCustomFonts } from '../../utils/fontManager';
import '../../styles/jcard/JCardSettings.css';

export type Section = 'info' | 'layout' | 'flaps' | 'background' | 'fonts' | 'spine' | 'back' | 'inside' | 'mixtape' | 'export' | 'presets';

const SECTION_COLORS: Record<Section, { bg: string; fg: string }> = {
  info:       { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
  layout:     { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  flaps:      { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  background: { bg: 'var(--color-mustard)', fg: 'var(--color-text)'  },
  fonts:      { bg: 'var(--color-mustard)', fg: 'var(--color-text)'  },
  spine:      { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  back:       { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  inside:     { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  mixtape:    { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
  export:     { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
  presets:    { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
};

const COLOR_PRESETS = [
  '#EFE8D6', '#FAF6EB', '#2A1E28', '#4A3A48',
  '#A8C4A2', '#8FC9B7', '#3D5A47',
  '#5B2838', '#D4A935', '#B4A0C7',
];

// ─── Block must live at module level — never inside a render function ─────────
interface BlockProps {
  id: Section;
  label: string;
  children: React.ReactNode;
  isVisible: (s: Section) => boolean;
  isOpen: (s: Section) => boolean;
  onToggle: (s: Section) => void;
}

const Block = ({ id, label, children, isVisible, isOpen, onToggle }: BlockProps) => {
  if (!isVisible(id)) return null;
  const { bg, fg } = SECTION_COLORS[id];
  return (
    <div className="settings-block">
      <button
        className="settings-heading"
        style={{ background: bg, color: fg }}
        onClick={() => onToggle(id)}
      >
        <span>{label}</span>
        <span style={{ fontSize: 14, opacity: 0.8 }}>{isOpen(id) ? '▲' : '▼'}</span>
      </button>
      {isOpen(id) && <div className="settings-body">{children}</div>}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface JCardSettingsProps {
  card: JCard;
  currentMixtape: Mixtape | null;
  onTitleChange: (title: string) => void;
  onContentChange: (content: JCardContent) => void;
  onMixtapeLink: (mixtapeId: string | null) => void;
  sections?: Section[];
}

const JCardSettings = ({
  card,
  currentMixtape,
  onTitleChange,
  onContentChange,
  onMixtapeLink,
  sections: visibleSections,
}: JCardSettingsProps) => {
  // Always work on a migrated card so old coverContent cards don't lose data
  const content = migrateJCardContent(card.content);

  const patch = (partial: Partial<JCardContent>) =>
    onContentChange({ ...content, ...partial });

  const patchFlap = (index: number, html: string) => {
    const next = [...content.flapContents];
    while (next.length < 6) next.push('');
    next[index] = html;
    patch({ flapContents: next });
  };

  const [openSections, setOpenSections] = React.useState<Set<Section>>(
    new Set(['info', 'layout', 'flaps', 'background', 'fonts', 'spine', 'back', 'inside', 'mixtape', 'export'] as Section[]),
  );
  const [activeFlap, setActiveFlap] = React.useState(0);
  const [exporting, setExporting] = React.useState(false);
  const [fontUploading, setFontUploading] = React.useState(false);
  const fontInputRef = React.useRef<HTMLInputElement>(null);

  const customFonts: CustomFont[] = content.customFonts ?? [];
  const customFontNames = customFonts.map(f => f.name);

  const MAX_FONTS     = 3;
  const WARN_SIZE_KB  = 200;
  const [fontWarning, setFontWarning] = React.useState<string | null>(null);

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-uploaded after deletion
    e.target.value = '';
    setFontWarning(null);

    if (customFonts.length >= MAX_FONTS) {
      setFontWarning(`Max ${MAX_FONTS} fonts per card. Remove one first.`);
      return;
    }

    const sizeKb = file.size / 1024;
    if (sizeKb > WARN_SIZE_KB) {
      setFontWarning(`${file.name} is ${Math.round(sizeKb)} KB — large fonts increase save size.`);
      // Not a hard block, just a heads-up; continue uploading.
    }

    setFontUploading(true);
    try {
      const name     = fontNameFromFile(file);
      const data     = await readFileAsBase64(file);
      const mimeType = mimeTypeFromFile(file);
      const newFont: CustomFont = { name, data, mimeType };
      // Register immediately so it's available in the editor right away
      await registerCustomFonts([newFont]);
      patch({ customFonts: [...customFonts, newFont] });
    } catch (err) {
      console.error('Font upload failed:', err);
      setFontWarning('Upload failed — the file may be corrupt.');
    } finally {
      setFontUploading(false);
    }
  };

  const removeFont = (name: string) => {
    patch({ customFonts: customFonts.filter(f => f.name !== name) });
  };

  // Keep activeFlap in bounds if user reduces flap count
  React.useEffect(() => {
    if (activeFlap >= content.flaps) setActiveFlap(content.flaps - 1);
  }, [content.flaps, activeFlap]);

  const toggle = React.useCallback((s: Section) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    }), []);

  const isOpen    = React.useCallback((s: Section) => openSections.has(s), [openSections]);
  const isVisible = React.useCallback((s: Section) => !visibleSections || visibleSections.includes(s), [visibleSections]);

  const handleExport = async () => {
    setExporting(true);
    try { await exportJCardToPDF(content, card.title || 'jcard'); }
    catch (e) { console.error(e); }
    finally { setExporting(false); }
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = JCARD_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    if (!confirm(`Apply the "${preset.label}" preset? This will overwrite your current design.`)) return;
    onContentChange({ ...content, ...preset.content } as typeof content);
  };

  const blockProps = { isVisible, isOpen, onToggle: toggle };
  const flapLabel = (i: number) => i === 0 ? 'Cover' : `Flap ${i + 1}`;

  return (
    <div className="jcard-settings">

      {/* ── 1. Card info ─────────────────────────────────────── */}
      <Block id="info" label="✎ Card info" {...blockProps}>
        <label className="settings-label">Title</label>
        <input
          className="settings-input"
          value={card.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="My J-Card"
        />
      </Block>

      {/* ── 1b. Presets ──────────────────────────────────────── */}
      <Block id="presets" label="✦ Presets" {...blockProps}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, opacity: 0.7, margin: '0 0 8px' }}>
          Applying a preset overwrites your current design. Use ↩ Undo to revert.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {JCARD_PRESETS.map(preset => (
            <button
              key={preset.id}
              className="btn"
              style={{ justifyContent: 'flex-start', gap: 8, padding: '5px 10px' }}
              onClick={() => handleApplyPreset(preset.id)}
            >
              <span>{preset.emoji}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12 }}>{preset.label}</span>
            </button>
          ))}
        </div>
      </Block>

      {/* ── 2. Layout ────────────────────────────────────────── */}
      <Block id="layout" label="▣ Layout" {...blockProps}>
        <label className="settings-checkbox-label">
          <input type="checkbox" checked={content.isReversed} onChange={(e) => patch({ isReversed: e.target.checked })} />
          Reverse card (flip left/right)
        </label>
        <label className="settings-checkbox-label">
          <input type="checkbox" checked={content.shortBack} onChange={(e) => patch({ shortBack: e.target.checked })} />
          Short back panel (10 mm)
        </label>
        <label className="settings-label" style={{ marginTop: 6 }}>Flaps: {content.flaps}</label>
        <input
          type="range" min={1} max={6} value={content.flaps}
          onChange={(e) => patch({ flaps: parseInt(e.target.value, 10) as 1|2|3|4|5|6 })}
          className="settings-range"
        />
        <div className="settings-range-ticks">
          {[1,2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
        </div>
        {!content.shortBack && content.flaps > 2 && (
          <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}>
            ⚠ Tall back + {content.flaps} flaps — this card may not fit a standard cassette case. Consider enabling "Short back panel" or reducing flap count.
          </p>
        )}
      </Block>

      {/* ── 3. Fonts ─────────────────────────────────────────── */}
      <Block id="fonts" label="Aa Fonts" {...blockProps}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, opacity: 0.7, margin: '0 0 8px' }}>
          9 default fonts are always available in the text editors.
          Upload up to 3 of your own <b>.woff2</b>, <b>.otf</b>, or <b>.ttf</b> files to add more.
        </p>

        {/* Uploaded fonts list */}
        {customFonts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {customFonts.map(f => (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', border: '1.5px solid var(--color-text)', background: 'var(--color-paper)' }}>
                <span style={{ fontFamily: f.name, fontSize: '1.25rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, opacity: 0.5, flexShrink: 0 }}>
                  custom
                </span>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '1px 5px', minWidth: 0, flexShrink: 0 }}
                  onClick={() => removeFont(f.name)}
                  title={`Remove ${f.name}`}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Warning / error message */}
        {fontWarning && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, margin: '0 0 6px', color: 'var(--color-accent)' }}>
            ⚠ {fontWarning}
          </p>
        )}

        {/* Upload button */}
        <input
          ref={fontInputRef}
          type="file"
          accept=".woff2,.woff,.otf,.ttf"
          style={{ display: 'none' }}
          onChange={handleFontUpload}
        />
        <button
          className="btn"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={fontUploading || customFonts.length >= MAX_FONTS}
          onClick={() => { setFontWarning(null); fontInputRef.current?.click(); }}
        >
          {fontUploading ? 'Loading…' : `+ Upload font (.woff2 / .otf / .ttf)${customFonts.length >= MAX_FONTS ? ' — limit reached' : ''}`}
        </button>
      </Block>

      {/* ── 4. Flap editors ──────────────────────────────────── */}
      <Block id="flaps" label="✎ Flaps" {...blockProps}>
        {/* Tab strip */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: content.flaps }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`btn${activeFlap === i ? ' active' : ''}`}
              style={{ fontSize: '0.8rem', padding: '4px 8px', minWidth: 0 }}
              onClick={() => setActiveFlap(i)}
            >
              {flapLabel(i)}
            </button>
          ))}
        </div>

        {/* Cover flap (index 0) — includes image options */}
        {activeFlap === 0 && (
          <>
            <ImageUpload
              label="Cover image"
              currentUrl={content.coverImageUrl}
              imageType="cover"
              cardId={card.id}
              onChange={(url) => patch({ coverImageUrl: url ?? undefined })}
            />
            {content.coverImageUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                <label className="settings-checkbox-label">
                  <input type="checkbox" checked={content.isFullCoverImage} onChange={(e) => patch({ isFullCoverImage: e.target.checked })} />
                  Fill panel with image
                </label>
                <label className="settings-checkbox-label">
                  <input type="checkbox" checked={content.coverImageBehindContent} onChange={(e) => patch({ coverImageBehindContent: e.target.checked })} />
                  Show text over image
                </label>
              </div>
            )}
          </>
        )}

        {/* Editor for whichever flap is active */}
        <label className="settings-label" style={{ marginTop: 10 }}>Text &#40;shift + enter for new line&#41;</label>
        <ContentEditor
          key={activeFlap}
          value={content.flapContents[activeFlap] ?? ''}
          onChange={(html) => patchFlap(activeFlap, html)}
          placeholder={activeFlap === 0 ? 'Title, artist, year…' : `Flap ${activeFlap + 1} content…`}
          minHeight={activeFlap === 0 ? '80px' : '60px'}
          customFontNames={customFontNames}
        />
      </Block>

      {/* ── 4. Background ────────────────────────────────────── */}
      <Block id="background" label="▢ Background" {...blockProps}>
        <label className="settings-label">Color</label>
        <div className="settings-swatch-row" style={{ marginBottom: 6 }}>
          {COLOR_PRESETS.map((c) => (
            <div
              key={c}
              className={`settings-swatch${content.backgroundColor === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => patch({ backgroundColor: c })}
              title={c}
            />
          ))}
          <input
            type="color"
            value={content.backgroundColor}
            onChange={(e) => patch({ backgroundColor: e.target.value })}
            style={{ width: 22, height: 22, border: '2px solid var(--color-text)', cursor: 'pointer', padding: 0 }}
          />
        </div>
        <ImageUpload
          label="Background image"
          currentUrl={content.backgroundImageUrl}
          imageType="background"
          cardId={card.id}
          onChange={(url) => patch({ backgroundImageUrl: url ?? undefined })}
        />
        <label className="settings-checkbox-label" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={!!content.continuousBackground}
            onChange={(e) => patch({ continuousBackground: e.target.checked })}
          />
          Stretch image across all panels
        </label>
      </Block>

      {/* ── 5. Spine ─────────────────────────────────────────── */}
      <Block id="spine" label="✉ Spine" {...blockProps}>
        <label className="settings-label">Top</label>
        <ContentEditor value={content.spineTopContent} onChange={(html) => patch({ spineTopContent: html })} placeholder="Mixtape title" minHeight="40px" customFontNames={customFontNames} />
        <label className="settings-label" style={{ marginTop: 8 }}>Center</label>
        <ContentEditor value={content.spineCenterContent} onChange={(html) => patch({ spineCenterContent: html })} placeholder="Side A / Side B" minHeight="40px" customFontNames={customFontNames} />
        <label className="settings-label" style={{ marginTop: 8 }}>Bottom</label>
        <ContentEditor value={content.spineBottomContent} onChange={(html) => patch({ spineBottomContent: html })} placeholder="90 min" minHeight="40px" customFontNames={customFontNames} />
      </Block>

      {/* ── 6. Back panel ────────────────────────────────────── */}
      <Block id="back" label="◫ Back panel" {...blockProps}>
        <label className="settings-label">Left column (Side A)</label>
        <ContentEditor value={content.backLeftContent} onChange={(html) => patch({ backLeftContent: html })} placeholder="Side A tracks…" minHeight="80px" customFontNames={customFontNames} />
        <label className="settings-label" style={{ marginTop: 8 }}>Right column (Side B)</label>
        <ContentEditor value={content.backRightContent} onChange={(html) => patch({ backRightContent: html })} placeholder="Side B tracks…" minHeight="80px" customFontNames={customFontNames} />
      </Block>

      {/* ── 6b. Inside (double-sided print) ─────────────────── */}
      <Block id="inside" label="◧ Inside" {...blockProps}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, opacity: 0.7, margin: '0 0 8px' }}>
          Printed on the reverse side of the card when exporting a double-sided PDF.
          Great for a full tracklist or liner notes.
        </p>
        <ContentEditor
          value={content.insideContent ?? ''}
          onChange={(html) => patch({ insideContent: html })}
          placeholder="Track listing, liner notes…"
          minHeight="120px"
          customFontNames={customFontNames}
        />
      </Block>

      {/* ── 7. Tracklist (linked mixtape) ────────────────────── */}
      <Block id="mixtape" label="♯ Tracklist" {...blockProps}>
        <MixtapeLinkPicker
          mixtapeId={card.mixtapeId}
          currentMixtape={currentMixtape}
          content={content}
          onLinkChange={onMixtapeLink}
          onContentChange={onContentChange}
        />
      </Block>

      {/* ── 8. Export ────────────────────────────────────────── */}
      <Block id="export" label="▧ Export" {...blockProps}>
        <label className="settings-checkbox-label" style={{ marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={!!content.showCutGuides}
            onChange={(e) => patch({ showCutGuides: e.target.checked })}
          />
          Show fold / cut guides
        </label>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Generating…' : '▤ Export PDF'}
        </button>
        <p style={{ fontSize: 10, color: 'var(--color-text-light)', marginTop: 6, fontFamily: 'var(--font-body)' }}>
          Print at 100% / Actual size for correct dimensions.
        </p>
      </Block>

    </div>
  );
};

export default JCardSettings;