import { JCardContent } from '../../../types';

interface Props { content: JCardContent; sanitizedLeft: string; sanitizedRight: string; }

const BackPanel = ({ content, sanitizedLeft, sanitizedRight }: Props) => {
  const rot = content.isReversed ? 'rotate(-90deg)' : 'rotate(90deg)';
  const bg: React.CSSProperties = {
    backgroundColor: content.backgroundImageUrl ? 'transparent' : content.backgroundColor,
    backgroundImage: content.backgroundImageUrl ? `url(${content.backgroundImageUrl})` : undefined,
    backgroundSize: 'cover', backgroundPosition: 'center',
    width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
  };
  const topStyle: React.CSSProperties = {
    position: 'absolute', top: 0, left: '50%', whiteSpace: 'nowrap', fontSize: '2.5mm', lineHeight: 1.3,
    transformOrigin: content.isReversed ? 'right center' : 'left center',
    transform: content.isReversed ? `translateX(-100%) ${rot}` : `translateX(0) ${rot}`,
  };
  const btmStyle: React.CSSProperties = {
    position: 'absolute', bottom: 0, left: '50%', whiteSpace: 'nowrap', fontSize: '2.5mm', lineHeight: 1.3,
    transformOrigin: content.isReversed ? 'left center' : 'right center',
    transform: content.isReversed ? `translateX(0) ${rot}` : `translateX(-100%) ${rot}`,
  };
  const topHtml = content.isReversed ? sanitizedRight : sanitizedLeft;
  const btmHtml = content.isReversed ? sanitizedLeft  : sanitizedRight;
  return (
    <div style={bg}>
      <div style={topStyle} dangerouslySetInnerHTML={{ __html: topHtml }} />
      <div style={btmStyle} dangerouslySetInnerHTML={{ __html: btmHtml }} />
    </div>
  );
};
export default BackPanel;
