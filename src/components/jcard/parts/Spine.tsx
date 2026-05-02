import { JCardContent } from '../../../types';

interface Props { content: JCardContent; sanitizedTop: string; sanitizedCenter: string; sanitizedBottom: string; }

const Spine = ({ content, sanitizedTop, sanitizedCenter, sanitizedBottom }: Props) => {
  const rot = content.isReversed ? 'rotate(-90deg)' : 'rotate(90deg)';
  const bg: React.CSSProperties = {
    backgroundColor: content.continuousBackground
      ? 'transparent'
      : content.backgroundImageUrl ? 'transparent' : content.backgroundColor,
    backgroundImage: !content.continuousBackground && content.backgroundImageUrl
      ? `url(${content.backgroundImageUrl})`
      : undefined,
    backgroundSize: 'cover', backgroundPosition: 'center',
    width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
  };
  const base: React.CSSProperties = { position: 'absolute', whiteSpace: 'nowrap', fontSize: '2.5mm', lineHeight: 1.3, left: '50%' };
  const topStyle: React.CSSProperties = { ...base, top: '1.5mm', transformOrigin: content.isReversed ? 'right center' : 'left center', transform: content.isReversed ? `translateX(-100%) ${rot}` : `translateX(0) ${rot}` };
  const midStyle: React.CSSProperties = { ...base, top: '50%', transformOrigin: 'center center', transform: `translateX(-50%) translateY(-50%) ${rot}` };
  const btmStyle: React.CSSProperties = { ...base, bottom: '1.5mm', transformOrigin: content.isReversed ? 'left center' : 'right center', transform: content.isReversed ? `translateX(0) ${rot}` : `translateX(-100%) ${rot}` };
  return (
    <div style={bg}>
      <div style={topStyle} dangerouslySetInnerHTML={{ __html: sanitizedTop }} />
      <div style={midStyle} dangerouslySetInnerHTML={{ __html: sanitizedCenter }} />
      <div style={btmStyle} dangerouslySetInnerHTML={{ __html: sanitizedBottom }} />
    </div>
  );
};
export default Spine;
