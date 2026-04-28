import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { JCardContent } from '../../types';
import { FLAPS_MM, BACK_FULL_MM, BACK_SHORT_MM, SPINE_MM } from './dimensions';
import { migrateJCardContent } from '../../utils/jcardDefaults';
import BackPanel from './parts/BackPanel';
import Spine from './parts/Spine';
import CoverFlap from './parts/CoverFlap';
import ContentFlap from './parts/ContentFlap';
import '../../styles/jcard/jcard.css';
import '../../styles/jcard/JCardPreview.css';

const ALLOWED_TAGS = ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','u','s','br','span'];
const ALLOWED_ATTR = ['style','class'];

function san(html: string) {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p>\u00a0<\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
}

const FLAP_WIDTHS = ['65mm','63.5mm','61.5mm','61.5mm','62mm','63.5mm'];

interface Props { content: JCardContent; }

const JCardPreview = ({ content: rawContent }: Props) => {
  const content = migrateJCardContent(rawContent);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [actual, setActual] = useState(false);

  const totalWidthMm =
    (content.shortBack ? BACK_SHORT_MM : BACK_FULL_MM) +
    SPINE_MM +
    FLAPS_MM.slice(0, content.flaps).reduce((a, b) => a + b, 0);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el || actual) return;
    const compute = () => {
      const px = el.offsetWidth - 48;
      const natural = totalWidthMm * (96 / 25.4);
      setScale(Math.min(px / natural, 1));
    };
    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(el);
    return () => obs.disconnect();
  }, [totalWidthMm, actual]);

  const [s, setS] = useState({
    flaps: Array(6).fill('') as string[],
    spineTop: '', spineMid: '', spineBot: '', backLeft: '', backRight: '',
  });

  useEffect(() => {
    setS({
      flaps: content.flapContents.map(san),
      spineTop: san(content.spineTopContent),
      spineMid: san(content.spineCenterContent),
      spineBot: san(content.spineBottomContent),
      backLeft: san(content.backLeftContent),
      backRight: san(content.backRightContent),
    });
  }, [
    // join so deps are stable primitives
    content.flapContents.join('||'),
    content.spineTopContent, content.spineCenterContent, content.spineBottomContent,
    content.backLeftContent, content.backRightContent,
  ]);

  const continuousBgStyle: React.CSSProperties | undefined = content.continuousBackground
    ? {
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundColor: content.backgroundImageUrl ? 'transparent' : content.backgroundColor,
        backgroundImage: content.backgroundImageUrl ? `url(${content.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div className="jcard-preview-root">
      <div className="jcard-preview-bar">
        <span className="jcard-preview-dim">{totalWidthMm.toFixed(1)} × 102 mm</span>
        <button
          className={`btn jcard-actual-btn${actual ? ' active' : ''}`}
          onClick={() => setActual(v => !v)}
        >{actual ? 'Scale to fit' : 'Actual size'}</button>
      </div>

      <div
        ref={wrapperRef}
        className="jcard-preview-wrapper"
        style={{ height: actual ? undefined : `calc(102mm * ${scale} + 48px)` }}
      >
        <div
          className={`jcard${content.isReversed ? ' reversed' : ''}`}
          style={{ transform: actual ? 'none' : `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {content.continuousBackground && <div style={continuousBgStyle} />}
          <div className={`jcard-part jcard-back${content.shortBack ? ' short' : ''}`} style={{ position: 'relative', zIndex: 1 }}>
            <BackPanel content={content} sanitizedLeft={s.backLeft} sanitizedRight={s.backRight} />
          </div>
          <div className="jcard-part jcard-spine" style={{ position: 'relative', zIndex: 1 }}>
            <Spine content={content} sanitizedTop={s.spineTop} sanitizedCenter={s.spineMid} sanitizedBottom={s.spineBot} />
          </div>
          {Array.from({ length: content.flaps }, (_, i) => (
            <div key={i} className="jcard-part" style={{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
              {i === 0
                ? <CoverFlap content={content} sanitizedCover={s.flaps[0]} />
                : <ContentFlap content={content} sanitizedContent={s.flaps[i]} flapNumber={i + 1} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JCardPreview;
