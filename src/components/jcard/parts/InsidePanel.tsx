import React from 'react';
import { JCardContent } from '../../../types';

interface Props {
  content: JCardContent;
  sanitizedContent: string;
  label?: string;
}

const InsidePanel = ({ content, sanitizedContent, label }: Props) => {
  const isEmpty =
    !sanitizedContent ||
    sanitizedContent === '<p><br></p>' ||
    sanitizedContent.trim() === '';

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
    overflow: 'hidden',
    position: 'relative',
  };

  return (
    <div style={bg}>
      {!isEmpty ? (
        <div
          style={{
            padding: '1.5mm',
            fontSize: '2.8mm',
            lineHeight: 1.3,
            overflow: 'hidden',
            height: '100%',
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
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
          {label}
        </span>
      ) : null}
    </div>
  );
};

export default InsidePanel;
