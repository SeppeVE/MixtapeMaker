import { JCardContent } from '../../../types';

interface Props {
  content: JCardContent;
  sanitizedContent: string;
  flapNumber: number;
}

const ContentFlap = ({ content, sanitizedContent, flapNumber: _flapNumber }: Props) => {
  const bg: React.CSSProperties = {
    backgroundColor: content.continuousBackground
      ? 'transparent'
      : content.backgroundImageUrl
        ? 'transparent'
        : content.backgroundColor,
    backgroundImage:
      !content.continuousBackground && content.backgroundImageUrl
        ? `url(${content.backgroundImageUrl})`
        : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  const isEmpty = !sanitizedContent || sanitizedContent === '<p><br></p>' || sanitizedContent.trim() === '';

  return (
    <div style={bg}>
      {!isEmpty ? (
        <div
          style={{ padding: '1.5mm', fontSize: '2.8mm', lineHeight: 1.3, overflow: 'hidden', height: '100%' }}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      ) : (
        <span style={{ position: 'absolute', bottom: 4, right: 6, fontSize: '2mm', color: 'rgba(0,0,0,0.12)', userSelect: 'none' }}>
          {/* flap {flapNumber} */}
        </span>
      )}
    </div>
  );
};

export default ContentFlap;
