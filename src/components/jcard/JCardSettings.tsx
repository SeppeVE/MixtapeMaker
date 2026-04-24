import React from 'react';
import { JCardContent, JCard, Mixtape } from '../../types';
import ContentEditor from './ContentEditor';
import MixtapeLinkPicker from './MixtapeLinkPicker';
import ImageUpload from './ImageUpload';
import { exportJCardToPDF } from '../../utils/jcardPdf';
import './JCardSettings.css';

export type Section = 'info' | 'mixtape' | 'layout' | 'background' | 'cover' | 'spine' | 'back' | 'export';

// Colors for each section's title bar — defined at module level (stable reference)
const SECTION_COLORS: Record<Section, { bg: string; fg: string }> = {
  info:       { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
  layout:     { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  background: { bg: 'var(--color-mustard)', fg: 'var(--color-text)'  },
  cover:      { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  export:     { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
  mixtape:    { bg: 'var(--color-accent)',  fg: 'var(--color-paper)' },
  spine:      { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  back:       { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
};

const COLOR_PRESETS = [
  '#EFE8D6', '#FAF6EB', '#2A1E28', '#4A3A48',
  '#A8C4A2', '#8FC9B7', '#3D5A47',
  '#5B2838', '#D4A935', '#B4A0C7',
];

// ─── Block is defined OUTSIDE the settings component so React never sees a new
//     component type on re-render. Moving it inside would cause all Tiptap editors
//     to unmount/remount on every keystroke.
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
  const { content } = card;

  const patch = (partial: Partial<JCardContent>) =>
    onContentChange({ ...content, ...partial });

  const [openSections, setOpenSections] = React.useState<Set<Section>>(
    new Set(['info', 'layout', 'cover', 'spine', 'back', 'export', 'mixtape', 'background'] as Section[]),
  );

  const toggle = React.useCallback((s: Section) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    }),
  []);

  const isOpen    = React.useCallback((s: Section) => openSections.has(s), [openSections]);
  const isVisible = React.useCallback((s: Section) => !visibleSections || visibleSections.includes(s), [visibleSections]);

  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportJCardToPDF(content, card.title || 'jcard');
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const blockProps = { isVisible, isOpen, onToggle: toggle };

  return (
    <div className="jcard-settings">

      <Block id="info" label="✎ Card info" {...blockProps}>
        <label className="settings-label">Title</label>
        <input
          className="settings-input"
          value={card.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="My J-Card"
        />
      </Block>

      <Block id="layout" label="▣ Layout" {...blockProps}>
        <label className="settings-checkbox-label">
          <input
            type="checkbox"
            checked={content.isReversed}
            onChange={(e) => patch({ isReversed: e.target.checked })}
          />
          Reverse card (flip left/right)
        </label>
        <label className="settings-checkbox-label">
          <input
            type="checkbox"
            checked={content.shortBack}
            onChange={(e) => patch({ shortBack: e.target.checked })}
          />
          Short back panel (10 mm)
        </label>
        <label className="settings-label" style={{ marginTop: 6 }}>
          Flaps: {content.flaps}
        </label>
        <input
          type="range"
          min={1}
          max={6}
          value={content.flaps}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10) as 1 | 2 | 3 | 4 | 5 | 6;
            patch({ flaps: v });
          }}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 10, opacity: 0.6 }}>
          {[1,2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
        </div>
      </Block>

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
      </Block>

      <Block id="cover" label="✎ Front panel" {...blockProps}>
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
              <input
                type="checkbox"
                checked={content.isFullCoverImage}
                onChange={(e) => patch({ isFullCoverImage: e.target.checked })}
              />
              Fill panel with image
            </label>
            <label className="settings-checkbox-label">
              <input
                type="checkbox"
                checked={content.coverImageBehindContent}
                onChange={(e) => patch({ coverImageBehindContent: e.target.checked })}
              />
              Show text over image
            </label>
          </div>
        )}
        <label className="settings-label" style={{ marginTop: 10 }}>Cover text</label>
        <ContentEditor
          value={content.coverContent}
          onChange={(html) => patch({ coverContent: html })}
          placeholder="Title, artist, year…"
        />
      </Block>

      <Block id="export" label="▧ Export" {...blockProps}>
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

      <Block id="mixtape" label="♯ Tracklist" {...blockProps}>
        <MixtapeLinkPicker
          mixtapeId={card.mixtapeId}
          currentMixtape={currentMixtape}
          content={content}
          onLinkChange={onMixtapeLink}
          onContentChange={onContentChange}
        />
      </Block>

      <Block id="spine" label="✉ Spine" {...blockProps}>
        <label className="settings-label">Top</label>
        <ContentEditor
          value={content.spineTopContent}
          onChange={(html) => patch({ spineTopContent: html })}
          placeholder="Mixtape title"
          minHeight="40px"
        />
        <label className="settings-label" style={{ marginTop: 8 }}>Center</label>
        <ContentEditor
          value={content.spineCenterContent}
          onChange={(html) => patch({ spineCenterContent: html })}
          placeholder="Side A / Side B"
          minHeight="40px"
        />
        <label className="settings-label" style={{ marginTop: 8 }}>Bottom</label>
        <ContentEditor
          value={content.spineBottomContent}
          onChange={(html) => patch({ spineBottomContent: html })}
          placeholder="90 min"
          minHeight="40px"
        />
      </Block>

      <Block id="back" label="◫ Back panel" {...blockProps}>
        <label className="settings-label">Left column (Side A)</label>
        <ContentEditor
          value={content.backLeftContent}
          onChange={(html) => patch({ backLeftContent: html })}
          placeholder="Side A tracks…"
          minHeight="80px"
        />
        <label className="settings-label" style={{ marginTop: 8 }}>Right column (Side B)</label>
        <ContentEditor
          value={content.backRightContent}
          onChange={(html) => patch({ backRightContent: html })}
          placeholder="Side B tracks…"
          minHeight="80px"
        />
      </Block>

    </div>
  );
};

export default JCardSettings;
