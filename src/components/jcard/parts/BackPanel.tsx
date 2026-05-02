import { JCardContent } from '../../../types';

interface Props { content: JCardContent; sanitizedLeft: string; sanitizedRight: string; }

// The old approach rotated individual text divs using `transformOrigin: left center`.
// The pivot sits at the vertical centre of the element, so when lines are added and
// the element grows taller, the pivot shifts — dragging the rotated block to a
// different position every time the user types a newline.
//
// Fix: rotate ONE fixed-size container that spans the entire panel. Inside it, text
// is laid out with normal flexbox (no transform on the text elements themselves),
// so adding lines never changes any pivot point.
//
// Geometry (non-reversed, rotate +90°):
//   Container own size: width = --jcard-height (102mm), height = panel width
//   After rotate(90deg) translateY(-100%) with transform-origin 0 0:
//     container-left  → panel top
//     container-right → panel bottom
//     container-top   → panel right edge
//     container-bottom→ panel left edge
//   → flexDirection: row, alignItems: center puts text centred in panel width ✓
//
// Reversed (rotate -90°):
//   transform: rotate(-90deg) translateX(-100%)
//     container-right → panel top
//     container-left  → panel bottom
//   → flexDirection: row-reverse keeps topHtml at panel top ✓

const BackPanel = ({ content, sanitizedLeft, sanitizedRight }: Props) => {
  const isRev = content.isReversed;

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

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    // In its own coord space the container is 102mm wide × panel-width tall.
    // After rotation it visually fills the panel (panel-width wide × 102mm tall).
    // height must equal the back panel's WIDTH (not its height), so that
    // translateY(-100%) shifts by exactly the panel width.
    width: 'var(--jcard-height)',
    height: content.shortBack ? 'var(--w-back-short)' : 'var(--w-back-full)',
    transformOrigin: '0 0',
    transform: isRev
      ? 'rotate(-90deg) translateX(-100%)'
      : 'rotate(90deg) translateY(-100%)',
    display: 'flex',
    flexDirection: isRev ? 'row-reverse' : 'row',
    alignItems: 'center',        // centres text in the panel's width
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    padding: '0 1.5mm',          // 1.5mm gap at panel top and bottom
    fontSize: '2.5mm',
    lineHeight: 1.3,
    gap: '2mm',
  };

  const textStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    maxWidth: '47%',             // keep top/bottom text from colliding
    overflow: 'hidden',
  };

  const topHtml = isRev ? sanitizedRight : sanitizedLeft;
  const btmHtml = isRev ? sanitizedLeft  : sanitizedRight;

  return (
    <div style={bg}>
      <div style={containerStyle}>
        <div style={textStyle} dangerouslySetInnerHTML={{ __html: topHtml }} />
        <div style={textStyle} dangerouslySetInnerHTML={{ __html: btmHtml }} />
      </div>
    </div>
  );
};

export default BackPanel;
