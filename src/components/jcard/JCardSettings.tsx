import React from 'react';
import { JCardContent, JCard, Mixtape } from '../../types';
import ContentEditor from './ContentEditor';
import MixtapeLinkPicker from './MixtapeLinkPicker';
import ImageUpload from './ImageUpload';
import { exportJCardToPDF } from '../../utils/jcardPdf';
import './JCardSettings.css';

interface JCardSettingsProps {
  card: JCard;
  currentMixtape: Mixtape | null;
  onTitleChange: (title: string) => void;
  onContentChange: (content: JCardContent) => void;
  onMixtapeLink: (mixtapeId: string | null) => void;
}

type Section = 'info' | 'mixtape' | 'layout' | 'background' | 'cover' | 'spine' | 'back' | 'export';

const JCardSettings = ({
  card,
  currentMixtape,
  onTitleChange,
  onContentChange,
  onMixtapeLink,
}: JCardSettingsProps) => {
  const { content } = card;

  const patch = (partial: Partial<JCardContent>) =>
    onContentChange({ ...content, ...partial });

  const [openSections, setOpenSections] = React.useState<Set<Section>>(
    new Set(['info', 'layout', 'cover', 'spine', 'back', 'export']),
  );

  const toggle = (s: Section) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  const isOpen = (s: Section) => openSections.has(s);

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

  return (
    <div className="jcard-settings">

      {/* ── Card info ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('info')}>
          <span>Card info</span>
          <span>{isOpen('info') ? '▲' : '▼'}</span>
        </button>
        {isOpen('info') && (
          <div className="settings-body">
            <label className="settings-label">Title</label>
            <input
              className="settings-input"
              value={card.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="My J-Card"
            />
          </div>
        )}
      </div>

      {/* ── Linked mixtape ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('mixtape')}>
          <span>Linked mixtape</span>
          <span>{isOpen('mixtape') ? '▲' : '▼'}</span>
        </button>
        {isOpen('mixtape') && (
          <div className="settings-body">
            <MixtapeLinkPicker
              mixtapeId={card.mixtapeId}
              currentMixtape={currentMixtape}
              content={content}
              onLinkChange={onMixtapeLink}
              onContentChange={onContentChange}
            />
          </div>
        )}
      </div>

      {/* ── Layout ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('layout')}>
          <span>Layout</span>
          <span>{isOpen('layout') ? '▲' : '▼'}</span>
        </button>
        {isOpen('layout') && (
          <div className="settings-body">
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
            <label className="settings-label" style={{ marginTop: 8 }}>
              Number of flaps (1–6)
            </label>
            <input
              className="settings-input"
              type="number"
              min={1}
              max={6}
              value={content.flaps}
              onChange={(e) => {
                const v = Math.max(1, Math.min(6, parseInt(e.target.value, 10) || 1));
                patch({ flaps: v as 1 | 2 | 3 | 4 | 5 | 6 });
              }}
            />
          </div>
        )}
      </div>

      {/* ── Background ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('background')}>
          <span>Background</span>
          <span>{isOpen('background') ? '▲' : '▼'}</span>
        </button>
        {isOpen('background') && (
          <div className="settings-body">
            <label className="settings-label">Background color</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={content.backgroundColor}
                onChange={(e) => patch({ backgroundColor: e.target.value })}
                style={{ width: 40, height: 32, border: '2px solid var(--color-border)', borderRadius: 4, cursor: 'pointer' }}
              />
              <input
                className="settings-input"
                value={content.backgroundColor}
                onChange={(e) => patch({ backgroundColor: e.target.value })}
                placeholder="#ffffff"
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <ImageUpload
                label="Background image"
                currentUrl={content.backgroundImageUrl}
                imageType="background"
                cardId={card.id}
                onChange={(url) => patch({ backgroundImageUrl: url ?? undefined })}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Front panel ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('cover')}>
          <span>Front panel</span>
          <span>{isOpen('cover') ? '▲' : '▼'}</span>
        </button>
        {isOpen('cover') && (
          <div className="settings-body">
            <ImageUpload
              label="Cover image"
              currentUrl={content.coverImageUrl}
              imageType="cover"
              cardId={card.id}
              onChange={(url) => patch({ coverImageUrl: url ?? undefined })}
            />
            {content.coverImageUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
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
            <label className="settings-label" style={{ marginTop: 12 }}>Cover text</label>
            <ContentEditor
              value={content.coverContent}
              onChange={(html) => patch({ coverContent: html })}
              placeholder="Title, artist, year…"
            />
          </div>
        )}
      </div>

      {/* ── Spine ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('spine')}>
          <span>Spine</span>
          <span>{isOpen('spine') ? '▲' : '▼'}</span>
        </button>
        {isOpen('spine') && (
          <div className="settings-body">
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
          </div>
        )}
      </div>

      {/* ── Back panel ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('back')}>
          <span>Back panel</span>
          <span>{isOpen('back') ? '▲' : '▼'}</span>
        </button>
        {isOpen('back') && (
          <div className="settings-body">
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
          </div>
        )}
      </div>

      {/* ── Export ── */}
      <div className="settings-block">
        <button className="settings-heading" onClick={() => toggle('export')}>
          <span>Export</span>
          <span>{isOpen('export') ? '▲' : '▼'}</span>
        </button>
        {isOpen('export') && (
          <div className="settings-body">
            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? 'Generating PDF…' : '📄 Export as PDF'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--color-text-light)', marginTop: 6 }}>
              Print at 100% / Actual size for correct dimensions.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default JCardSettings;
