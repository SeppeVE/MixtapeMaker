import { forwardRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { JCardContent } from '../../types';
import { migrateJCardContent } from '../../utils/jcardDefaults';
import { liftListColors } from '../../utils/htmlUtils';
import Spine from './parts/Spine';
import InsideBackPanel from './parts/InsideBackPanel';
import InsidePanel from './parts/InsidePanel';
import '../../styles/jcard/jcard.css';

const ALLOWED_TAGS = ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','u','s','br','span'];
const ALLOWED_ATTR = ['style','class'];
const FLAP_WIDTHS = ['65mm','63.5mm','61.5mm','61.5mm','62mm','63.5mm'];

function san(html: string): string {
  if (typeof window === 'undefined') return html;
  const clean = DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
  return liftListColors(clean);
}

interface Props { content: JCardContent; }

const JCardInsidePrintable = forwardRef<HTMLDivElement, Props>(({ content: rawContent }, ref) => {
  const content = migrateJCardContent(rawContent);

  const s = useMemo(() => {
    const flaps = content.insideFlapContents ?? Array(6).fill('');
    return {
      flaps: flaps.map(san),
      spine: san(content.insideSpineContent ?? ''),
      back:  san(content.insideBackContent  ?? ''),
    };
  }, [
    (content.insideFlapContents ?? []).join('||'),
    content.insideSpineContent,
    content.insideBackContent,
  ]);

  const classes = ['jcard', 'jcard-printable', content.isReversed ? 'reversed' : '']
    .filter(Boolean).join(' ');

  const reversedFlapIndices = Array.from({ length: content.flaps }, (_, i) => content.flaps - 1 - i);

  const continuousInsideBgStyle: React.CSSProperties | undefined = content.continuousBackground
    ? {
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundColor: content.insideBackgroundImageUrl ? 'transparent' : content.backgroundColor,
        backgroundImage: content.insideBackgroundImageUrl
          ? `url(${content.insideBackgroundImageUrl})`
          : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }
    : undefined;

  const insideContent = { ...content, backgroundImageUrl: content.insideBackgroundImageUrl };

  return (
    <div ref={ref} className={classes}>
      {content.continuousBackground && <div style={continuousInsideBgStyle} />}

      {reversedFlapIndices.map(i => (
        <div
          key={i}
          className="jcard-part"
          style={{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}
        >
          <InsidePanel content={content} sanitizedContent={s.flaps[i]} />
        </div>
      ))}

      <div className="jcard-part jcard-spine" style={{ position: 'relative', zIndex: 1 }}>
        <Spine
          content={insideContent}
          sanitizedTop=""
          sanitizedCenter={s.spine}
          sanitizedBottom=""
        />
      </div>

      <div
        className={`jcard-part jcard-back${content.shortBack ? ' short' : ''}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <InsideBackPanel content={content} sanitizedContent={s.back} />
      </div>
    </div>
  );
});

JCardInsidePrintable.displayName = 'JCardInsidePrintable';
export default JCardInsidePrintable;
