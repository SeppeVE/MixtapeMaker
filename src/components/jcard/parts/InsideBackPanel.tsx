import React from 'react';
import { JCardContent } from '../../../types';

interface Props {
  content: JCardContent;
  sanitizedContent: string;
}

const InsideBackPanel = ({ content, sanitizedContent }: Props) => {
  const isRev = content.isReversed;

  const bg: React.CSSProperties = {
    backgroundColor: content.continuousBackground
      ? 'transparent'
      : content.insideBackgroundImageUrl ? 'transparent' : (content.backgroundColor || '#ffffff'),
    backgroundImage: !content.continuousBackground && content.insideBackgroundImageUrl
      ? `url(${content.insideBackgroundImageUrl})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 'var(--jcard-height)',
    height: content.shortBack ? 'var(--w-back-short)' : 'var(--w-back-full)',
    transformOrigin: '0 0',
    transform: isRev
      ? 'rotate(-90deg) translateX(-100%)'
      : 'rotate(90deg) translateY(-100%)',
    boxSizing: 'border-box',
    padding: '1.5mm',
    fontSize: '2.5mm',
    lineHeight: 1.3,
    overflow: 'hidden',
  };

  return (
    <div style={bg}>
      <div style={containerStyle} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
    </div>
  );
};

export default InsideBackPanel;
