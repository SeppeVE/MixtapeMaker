import { forwardRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { JCardContent } from '../../types';
import { migrateJCardContent } from '../../utils/jcardDefaults';
import { liftListColors } from '../../utils/htmlUtils';
import BackPanel from './parts/BackPanel';
import Spine from './parts/Spine';
import CoverFlap from './parts/CoverFlap';
import ContentFlap from './parts/ContentFlap';
import '../../styles/jcard/jcard.css';

const ALLOWED_TAGS = ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','u','s','br','span'];
const ALLOWED_ATTR = ['style','class'];

function san(html: string): string {
  if (typeof window === 'undefined') return html;
  const clean = DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
  return liftListColors(clean);
}

const FLAP_WIDTHS = ['65mm','63.5mm','61.5mm','61.5mm','62mm','63.5mm'];

interface Props { content: JCardContent; }

const JCardPrintable = forwardRef<HTMLDivElement, Props>(({ content: rawContent }, ref) => {
  const content = migrateJCardContent(rawContent);

  const s = useMemo(() => ({
    flaps: content.flapContents.map(san),
    spineTop: san(content.spineTopContent),
    spineMid: san(content.spineCenterContent),
    spineBot: san(content.spineBottomContent),
    backLeft: san(content.backLeftContent),
    backRight: san(content.backRightContent),
  }), [
    content.flapContents.join('||'),
    content.spineTopContent,
    content.spineCenterContent,
    content.spineBottomContent,
    content.backLeftContent,
    content.backRightContent,
  ]);

  const continuousBgStyle: React.CSSProperties | undefined = content.continuousBackground
    ? {
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundColor: content.backgroundImageUrl ? 'transparent' : content.backgroundColor,
        backgroundImage: content.backgroundImageUrl ? `url(${content.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }
    : undefined;

  const classes = [
    'jcard',
    'jcard-printable',
    content.isReversed ? 'reversed' : '',
    content.showCutGuides ? 'show-guides' : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes}>
      {content.continuousBackground && <div style={continuousBgStyle} />}
      <div className={`jcard-part jcard-back${content.shortBack ? ' short' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
        <BackPanel content={content} sanitizedLeft={s.backLeft} sanitizedRight={s.backRight} />
      </div>
      <div className="jcard-part jcard-spine" style={{ position: 'relative', zIndex: 1 }}>
        <Spine content={content} sanitizedTop={s.spineTop} sanitizedCenter={s.spineMid} sanitizedBottom={s.spineBot} />
      </div>
      {Array.from({ length: content.flaps }, (_, i) => (
        <div
          key={i}
          className="jcard-part"
          style={{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}
        >
          {i === 0
            ? <CoverFlap content={content} sanitizedCover={s.flaps[0]} />
            : <ContentFlap content={content} sanitizedContent={s.flaps[i]} flapIndex={i} />}
        </div>
      ))}
    </div>
  );
});

JCardPrintable.displayName = 'JCardPrintable';

export default JCardPrintable;
