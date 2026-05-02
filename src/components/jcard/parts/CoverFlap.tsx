import { JCardContent } from '../../../types';

interface Props { content: JCardContent; sanitizedCover: string; }

const CoverFlap = ({ content, sanitizedCover }: Props) => {
  const bg: React.CSSProperties = {
    backgroundColor: content.continuousBackground
      ? 'transparent'
      : content.backgroundImageUrl ? 'transparent' : content.backgroundColor,
    backgroundImage: !content.continuousBackground && content.backgroundImageUrl
      ? `url(${content.backgroundImageUrl})`
      : undefined,
    backgroundSize: 'cover', backgroundPosition: 'center',
    width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  };
  const imgStyle: React.CSSProperties = {
    position: content.coverImageBehindContent ? 'absolute' : 'relative',
    zIndex: content.coverImageBehindContent ? 1 : undefined,
    top: 0, left: 0, width: '100%',
    height: content.isFullCoverImage ? '100%' : 'auto',
    aspectRatio: content.isFullCoverImage ? undefined : '1 / 1',
    backgroundImage: content.coverImageUrl ? `url(${content.coverImageUrl})` : undefined,
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
    display: content.coverImageUrl ? 'block' : 'none',
  };
  const textStyle: React.CSSProperties = {
    flex: content.isFullCoverImage && !content.coverImageBehindContent ? 0 : 1,
    padding: '1.5mm', overflow: 'hidden', fontSize: '2.8mm', lineHeight: 1.3,
    position: content.coverImageBehindContent ? 'absolute' : 'relative',
    zIndex: content.coverImageBehindContent ? 10 : undefined,
    top: content.coverImageBehindContent ? 0 : undefined, left: content.coverImageBehindContent ? 0 : undefined,
    width: content.coverImageBehindContent ? '100%' : undefined, height: content.coverImageBehindContent ? '100%' : undefined,
    display: content.isFullCoverImage && !content.coverImageBehindContent ? 'none' : 'block',
  };
  return (
    <div style={bg}>
      {content.coverImageUrl && <div style={imgStyle} />}
      <div style={textStyle} dangerouslySetInnerHTML={{ __html: sanitizedCover }} />
    </div>
  );
};
export default CoverFlap;
