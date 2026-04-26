import { forwardRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { JCardContent } from '../../types';
import BackPanel from './parts/BackPanel';
import Spine from './parts/Spine';
import CoverFlap from './parts/CoverFlap';
import BlankFlap from './parts/BlankFlap';
import './jcard.css';

const ALLOWED_TAGS = ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','u','s','br','span'];
const ALLOWED_ATTR = ['style','class'];

function san(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
}

const FLAP_WIDTHS = ['65mm','63.5mm','61.5mm','61.5mm','62mm','63.5mm'];

interface Props { content: JCardContent; }

/**
 * A 1:1, chrome-less version of the j-card used as the source for PDF export.
 * Renders the EXACT same BackPanel/Spine/CoverFlap/BlankFlap parts the
 * on-screen designer uses, so whatever you see in the live preview is what
 * gets snapshotted into the PDF.
 *
 * Differences vs JCardPreview: no toolbar, no scaling wrapper, outer card
 * border + box-shadow are stripped (those are screen chrome).
 */
const JCardPrintable = forwardRef<HTMLDivElement, Props>(({ content }, ref) => {
  const s = useMemo(() => ({
    cover:    san(content.coverContent),
    spineTop: san(content.spineTopContent),
    spineMid: san(content.spineCenterContent),
    spineBot: san(content.spineBottomContent),
    backLeft: san(content.backLeftContent),
    backRight:san(content.backRightContent),
  }), [
    content.coverContent,
    content.spineTopContent,
    content.spineCenterContent,
    content.spineBottomContent,
    content.backLeftContent,
    content.backRightContent,
  ]);

  return (
    <div
      ref={ref}
      className={`jcard jcard-printable${content.isReversed ? ' reversed' : ''}`}
    >
      <div className={`jcard-part jcard-back${content.shortBack ? ' short' : ''}`}>
        <BackPanel content={content} sanitizedLeft={s.backLeft} sanitizedRight={s.backRight} />
      </div>
      <div className="jcard-part jcard-spine">
        <Spine content={content} sanitizedTop={s.spineTop} sanitizedCenter={s.spineMid} sanitizedBottom={s.spineBot} />
      </div>
      {Array.from({ length: content.flaps }, (_, i) => (
        <div
          key={i}
          className="jcard-part"
          style={{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative' }}
        >
          {i === 0
            ? <CoverFlap content={content} sanitizedCover={s.cover} />
            : <BlankFlap content={content} flapNumber={i + 1} />}
        </div>
      ))}
    </div>
  );
});

JCardPrintable.displayName = 'JCardPrintable';

export default JCardPrintable;
