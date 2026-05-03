import { JCardContent } from '../../../types';

interface Props {
  content: JCardContent;
  sanitizedContent: string;
  flapIndex: number; // 0-based index into flapContents (0 = cover, handled by CoverFlap)
}

const ContentFlap = ({ content, sanitizedContent, flapIndex }: Props) => {
  const imgUrl = content.flapImageUrls?.[flapIndex];
  const isFull = content.flapImageFulls?.[flapIndex] ?? false;
  const behind = content.flapImageBehindContents?.[flapIndex] ?? false;

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

  const isEmpty = !sanitizedContent || sanitizedContent === '<p><br></p>' || sanitizedContent.trim() === '';

  return (
    <div style={bg}>
      {imgUrl && <div style={imgStyle} />}
      {(!isEmpty || behind) ? (
        <div style={textStyle} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      ) : (
        <div style={textStyle} />
      )}
    </div>
  );
};

export default ContentFlap;
