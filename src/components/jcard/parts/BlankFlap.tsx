import { JCardContent } from '../../../types';

interface Props { content: JCardContent; flapNumber: number; }

const BlankFlap = ({ content, flapNumber }: Props) => (
  <div style={{
    backgroundColor: content.backgroundImageUrl ? 'transparent' : content.backgroundColor,
    backgroundImage: content.backgroundImageUrl ? `url(${content.backgroundImageUrl})` : undefined,
    backgroundSize: 'cover', backgroundPosition: 'center',
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <span style={{ fontSize: '2mm', color: 'rgba(0,0,0,0.12)', userSelect: 'none' }}>flap {flapNumber}</span>
  </div>
);
export default BlankFlap;
