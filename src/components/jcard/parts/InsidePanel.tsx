import React from 'react';
import { JCardContent } from '../../../types';

interface Props {
  content: JCardContent;
  sanitizedContent: string;
  flapIndex: number; // 0-based
  label?: string;
}

const InsidePanel = ({ content, sanitizedContent, flapIndex, label }: Props) => {
  const isEmpty =
    !sanitizedContent ||
    sanitizedContent === '<p><br></p>' ||
    sanitizedContent.trim() === '';

  // Use insideContinuousBackground if set, fall back to continuousBackground for old cards
  const isContinuous = content.insideContinuousBackground ?? content.continuousBackground;

  const imgUrl = content.insideFlapImageUrls?.[flapIndex];
  const isFull = content.insideFlapImageFulls?.[flapIndex] ?? false;
  const behind = content.insideFlapImageBehindContents?.[flapIndex] ?? false;

  const bg: React.CSSProperties = {
    backgroundColor: isContinuous
      ? 'transparent'
      : content.insideBackgroundImageUrl ? 'transparent' : (content.backgroundColor || '#ffffff'),
    backgroundImage: !isContinuous && content.insideBackgroundImageUrl
      ? `url(${content.insideBackgroundImageUrl})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  };

  const imgStyle: React.CSSProperties = {
    position: behind ? 'absolute' : 'relative',
    zIndex: behind ? 1 : undefined,
    top: 0, left: 0, width: '100%',
    height: isFull ? '100%' : 'auto',
    aspectRatio: isFull ? undefined : '1 / 1',
    backgroundImage: imgUrl ? `url(${imgUrl})` : undefined,
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
    display: imgUrl ? 'block' : 'none',
  };

  const textStyle: React.CSSProperties = {
    flex: isFull && !behind ? 0 : 1,
    padding: '1.5mm', overflow: 'hidden', fontSize: '2.8mm', lineHeight: 1.3,
    position: behind ? 'absolute' : 'relative',
    zIndex: behind ? 10 : undefined,
    top: behind ? 0 : undefined, left: behind ? 0 : undefined,
    width: behind ? '100%' : undefined, height: behind ? '100%' : undefined,
    display: isFull && !behind ? 'none' : 'block',
  };

  return (
    <div style={bg}>
      {imgUrl && <div style={imgStyle} />}
      {!isEmpty ? (
        <div style={textStyle} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      ) : label ? (
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            right: 4,
            fontSize: '2mm',
            color: 'rgba(0,0,0,0.15)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {/* {label} */}
        </span>
      ) : null}
    </div>
  );
};

export default InsidePanel;
