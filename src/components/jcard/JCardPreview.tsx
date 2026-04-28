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

/** Wait for all image URLs and document fonts to be ready. */
function waitForAssets(content: JCardContent): Promise<void> {
  const urls = [content.backgroundImageUrl, content.coverImageUrl]
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  const imagePromises = urls.map(url => new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  }));

  const fontPromise: Promise<void> =
    (document as any).fonts?.ready?.then(() => undefined) ?? Promise.resolve();

  return Promise.all([fontPromise, ...imagePromises]).then(() => undefined);
}

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
  const [isReady, setIsReady] = useState(false);

  // Wait for fonts + images before revealing the card so it never flashes
  // a half-loaded state. The card stays mounted so scale calculation works.
  useEffect(() => {
    let cancelled = false;
    setIsReady(false);
    waitForAssets(content).then(() => { if (!cancelled) setIsReady(true); });
    return () => { cancelled = true; };
  // Only re-gate when the actual image URLs change, not on every edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.backgroundImageUrl, content.coverImageUrl]);

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
        {!isReady && (
          <div className="jcard-loader">
            <svg className="jcard-loader-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="40 20" />
            </svg>
            <span className="jcard-loader-label">Loading card…</span>
          </div>
        )}
        <div
          className={`jcard${content.isReversed ? ' reversed' : ''}`}
          style={{
            transform: actual ? 'none' : `scale(${scale})`,
            transformOrigin: 'top left',
            opacity: isReady ? 1 : 0,
            transition: isReady ? 'opacity 0.35s ease' : 'none',
          }}
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
