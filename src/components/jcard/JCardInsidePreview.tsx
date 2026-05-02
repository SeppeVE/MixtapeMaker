import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { JCardContent } from '../../types';
import { computeWidthMm, JCARD_HEIGHT_MM, BACK_FULL_MM, BACK_SHORT_MM, SPINE_MM } from './dimensions';
import { migrateJCardContent } from '../../utils/jcardDefaults';
import { liftListColors } from '../../utils/htmlUtils';
import Spine from './parts/Spine';
import InsideBackPanel from './parts/InsideBackPanel';
import InsidePanel from './parts/InsidePanel';
import '../../styles/jcard/jcard.css';
import '../../styles/jcard/JCardPreview.css';

const ALLOWED_TAGS = ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','u','s','br','span'];
const ALLOWED_ATTR = ['style','class'];
const FLAP_WIDTHS = ['65mm','63.5mm','61.5mm','61.5mm','62mm','63.5mm'];

function san(html: string) {
  if (typeof window === 'undefined') return html;
  const clean = DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
  return liftListColors(clean);
}

interface Props { content: JCardContent; }

const JCardInsidePreview = ({ content: rawContent }: Props) => {
  const content = migrateJCardContent(rawContent);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [actual, setActual] = useState(false);

  const widthMm = computeWidthMm(content);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el || actual) return;
    const compute = () => {
      const px = el.offsetWidth - 48;
      const natural = widthMm * (96 / 25.4);
      setScale(Math.min(px / natural, 1));
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(el);
    return () => obs.disconnect();
  }, [widthMm, actual]);

  const [s, setS] = useState({
    flaps: Array(6).fill('') as string[],
    spine: '',
    back: '',
  });

  useEffect(() => {
    const flaps = content.insideFlapContents ?? Array(6).fill('');
    setS({
      flaps: flaps.map(san),
      spine: san(content.insideSpineContent ?? ''),
      back:  san(content.insideBackContent  ?? ''),
    });
  }, [
    (content.insideFlapContents ?? []).join('||'),
    content.insideSpineContent,
    content.insideBackContent,
  ]);

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
    <div className="jcard-preview-root">
      <div className="jcard-preview-bar">
        <span className="jcard-preview-dim">
          {widthMm.toFixed(1)} x {JCARD_HEIGHT_MM} mm
          <span style={{ marginLeft: 6, opacity: 0.55, fontSize: 11, fontFamily: 'var(--font-body)' }}>
            inside - PDF page 2
          </span>
        </span>
        <button
          className={`btn jcard-actual-btn${actual ? ' active' : ''}`}
          onClick={() => setActual(v => !v)}
        >{actual ? 'Scale to fit' : 'Actual size'}</button>
      </div>

      <div
        ref={wrapperRef}
        className="jcard-preview-wrapper"
        style={{ height: actual ? undefined : `calc(${JCARD_HEIGHT_MM}mm * ${scale} + 48px)` }}
      >
        <div
          className={`jcard${content.isReversed ? ' reversed' : ''}`}
          style={{
            transform: actual ? 'none' : `scale(${scale})`,
            transformOrigin: 'top left',
            opacity: 1,
          }}
        >
          {content.continuousBackground && <div style={continuousInsideBgStyle} />}

          {reversedFlapIndices.map(i => (
            <div
              key={i}
              className="jcard-part"
              style={{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}
            >
              <InsidePanel
                content={content}
                sanitizedContent={s.flaps[i]}
                label={i === 0 ? 'cover inside' : `flap ${i + 1} inside`}
              />
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
            <InsideBackPanel
              content={content}
              sanitizedContent={s.back}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: 9,
          fontFamily: 'var(--font-display)',
          opacity: 0.45,
          gap: 0,
          overflow: 'hidden',
          paddingLeft: 2,
        }}
      >
        {reversedFlapIndices.map(i => (
          <span
            key={i}
            style={{
              width: `calc(${FLAP_WIDTHS[i]} * ${actual ? 1 : scale})`,
              flexShrink: 0,
              textAlign: 'center',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {i === 0 ? 'cover' : `flap ${i + 1}`}
          </span>
        ))}
        <span
          style={{
            width: `calc(${SPINE_MM}mm * ${actual ? 1 : scale})`,
            flexShrink: 0,
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          spine
        </span>
        <span
          style={{
            width: `calc(${content.shortBack ? BACK_SHORT_MM : BACK_FULL_MM}mm * ${actual ? 1 : scale})`,
            flexShrink: 0,
            textAlign: 'center',
          }}
        >
          back
        </span>
      </div>
    </div>
  );
};

export default JCardInsidePreview;
