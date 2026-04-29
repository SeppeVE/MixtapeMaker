import { useId } from 'react';

interface CassetteSVGProps {
  /** Tape title shown on the label — omit for a decorative placeholder */
  title?: string;
  /** Which side is active — drives badge colour */
  side?: 'A' | 'B';
  /** Hub / accent colour for the reels */
  accentColor?: string;
  /** Enable the gentle floating animation (default true) */
  float?: boolean;
}

const CassetteSVG = ({
  title,
  side = 'A',
  accentColor = '#D4A935',
  float = true,
}: CassetteSVGProps) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `label-clip-${uid}`;
  const isUntitled = !title || title === 'Untitled Mixtape';
  const badgeColor = side === 'A' ? '#D4A935' : '#B4A0C7';

  return (
    <div className={float ? 'lp-cassette-float' : undefined} style={{ lineHeight: 0 }}>
      <svg
        width="100%"
        viewBox="0 0 300 195"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(6px 6px 0 #2A1E28)', display: 'block' }}
      >
        {/* Body */}
        <rect x="2" y="2" width="296" height="191" rx="10" fill="#EFE8D6" stroke="#2A1E28" strokeWidth="3.5" />
        <rect x="10" y="10" width="280" height="175" rx="6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

        {/* Label area */}
        <rect x="14" y="14" width="272" height="88" rx="4" fill="#5B2838" stroke="#2A1E28" strokeWidth="2.5" />
        <rect x="20" y="20" width="260" height="76" rx="2" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

        {/* Title — real text or placeholder bars */}
        {isUntitled ? (
          <rect x="26" y="28" width="130" height="7" rx="2" fill="rgba(255,255,255,0.35)" />
        ) : (
          <>
            <clipPath id={clipId}>
              <rect x="26" y="22" width="172" height="16" />
            </clipPath>
            <text
              x="26" y="36"
              fontFamily="monospace"
              fontSize="11"
              fontWeight="700"
              fill="rgba(255,255,255,0.92)"
              clipPath={`url(#${clipId})`}
            >
              {title}
            </text>
          </>
        )}

        {/* Decorative lines */}
        <rect x="26" y="43" width="90"  height="4" rx="2" fill="rgba(255,255,255,0.3)" />
        <rect x="26" y="55" width="60"  height="3" rx="2" fill="rgba(255,255,255,0.2)" />
        <rect x="26" y="65" width="110" height="3" rx="2" fill="rgba(255,255,255,0.15)" />
        <rect x="26" y="75" width="75"  height="3" rx="2" fill="rgba(255,255,255,0.15)" />

        {/* Side badge */}
        <rect x="208" y="24" width="66" height="24" rx="2" fill={badgeColor} stroke="#2A1E28" strokeWidth="2" />
        <text x="241" y="40" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill="#2A1E28">
          SIDE {side}
        </text>

        {/* Mechanism window */}
        <rect x="14"  y="112" width="272" height="70" rx="4" fill="#2A1E28" stroke="#2A1E28" strokeWidth="2" />
        <rect x="80"  y="118" width="140" height="58" rx="4" fill="#1a1218" stroke="#4A3A48" strokeWidth="1.5" />

        {/* Tape line — animated */}
        <path
          d="M 90 158 Q 150 138 210 158"
          stroke="#3a2a38"
          strokeWidth="3"
          fill="none"
          className="lp-tape-line"
        />

        {/* Left reel */}
        <g transform="translate(44 148)">
          <g className="lp-reel">
            <circle r="26" fill="#DDD2B8" stroke="#2A1E28" strokeWidth="2.5" />
            <circle r="10" fill={accentColor} stroke="#2A1E28" strokeWidth="2" />
            <line x1="0" y1="-24" x2="0"  y2="24"  stroke="#2A1E28" strokeWidth="2" />
            <line x1="-24" y1="0" x2="24" y2="0"   stroke="#2A1E28" strokeWidth="2" />
            <line x1="-17" y1="-17" x2="17" y2="17" stroke="#2A1E28" strokeWidth="2" />
            <line x1="17"  y1="-17" x2="-17" y2="17" stroke="#2A1E28" strokeWidth="2" />
            <circle r="4" fill="#5B2838" stroke="#2A1E28" strokeWidth="1.5" />
          </g>
        </g>

        {/* Right reel */}
        <g transform="translate(256 148)">
          <g className="lp-reel">
            <circle r="26" fill="#DDD2B8" stroke="#2A1E28" strokeWidth="2.5" />
            <circle r="10" fill={accentColor} stroke="#2A1E28" strokeWidth="2" />
            <line x1="0" y1="-24" x2="0"  y2="24"  stroke="#2A1E28" strokeWidth="2" />
            <line x1="-24" y1="0" x2="24" y2="0"   stroke="#2A1E28" strokeWidth="2" />
            <line x1="-17" y1="-17" x2="17" y2="17" stroke="#2A1E28" strokeWidth="2" />
            <line x1="17"  y1="-17" x2="-17" y2="17" stroke="#2A1E28" strokeWidth="2" />
            <circle r="4" fill="#5B2838" stroke="#2A1E28" strokeWidth="1.5" />
          </g>
        </g>

        {/* Bottom rail */}
        <rect x="14" y="186" width="272" height="4" rx="2" fill="#DDD2B8" stroke="#2A1E28" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default CassetteSVG;
