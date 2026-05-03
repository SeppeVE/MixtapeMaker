import { useId } from 'react';

interface CassetteSVGProps {
  title?: string;
  side?: 'A' | 'B';
  accentColor?: string;
  float?: boolean;
}

const CassetteSVG = ({
  title,
  side = 'A',
  accentColor = '#B4A0C7',
  float = true,
}: CassetteSVGProps) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `label-clip-${uid}`;
  const isUntitled = !title || title === 'Untitled Mixtape';

  // 5-pointed star polygon relative to hub centre (r_out=13, r_in=5)
  const starPts = '0,-13 2.9,-4 12.4,-4 4.8,1.5 7.6,10.5 0,5 -7.6,10.5 -4.8,1.5 -12.4,-4 -2.9,-4';
  const screws: [number, number][] = [[15, 15], [285, 15], [15, 179], [285, 179]];
  const beads = [35, 47, 59, 71, 83];

  return (
    <div className={float ? 'lp-cassette-float' : undefined} style={{ lineHeight: 0 }}>
      <svg
        width="100%"
        viewBox="0 0 300 195"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(6px 6px 0 #2A1E28)', display: 'block' }}
      >
        {/* Shell */}
        <rect x="2" y="2" width="296" height="191" rx="10"
          fill="#D4A935" stroke="#2A1E28" strokeWidth="3.5" />
        <rect x="5" y="5" width="290" height="185" rx="8"
          fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        <rect x="4" y="4" width="292" height="187" rx="9"
          fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />

        {/* Left grippers */}
        {beads.map((cy, i) => (
          <circle key={i} cx="10" cy={cy} r="4" fill="#2A1E28" />
        ))}

        {/* Label area */}
        <rect x="27" y="16" width="246" height="114" rx="6"
          fill="#A8C4A2" stroke="#2A1E28" strokeWidth="2.5" />
        <rect x="29" y="18" width="242" height="110" rx="4"
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

        {/* Write-in section */}
        <rect x="33" y="22" width="234" height="33" rx="2"
          fill="rgba(255,255,255,0.72)" />

        {/* Side letter */}
        <text x="41" y="47" fontFamily="monospace" fontSize="20"
          fontWeight="900" fill="#5B2838">
          {side}
        </text>

        {/* Title or placeholder bars */}
        {isUntitled ? (
          <>
            <rect x="66" y="28" width="115" height="6" rx="2"
              fill="rgba(42,30,40,0.25)" />
            <rect x="66" y="39" width="78" height="5" rx="2"
              fill="rgba(42,30,40,0.18)" />
          </>
        ) : (
          <>
            <clipPath id={clipId}>
              <rect x="66" y="22" width="190" height="33" />
            </clipPath>
            <text x="66" y="43" fontFamily="monospace" fontSize="9"
              fontWeight="700" fill="#2A1E28"
              clipPath={`url(#${clipId})`}>
              {title}
            </text>
          </>
        )}

        {/* Divider below write-in */}
        <line x1="33" y1="55" x2="267" y2="55"
          stroke="#5B2838" strokeWidth="2" />

        {/* Hub window */}
        <rect x="50" y="61" width="200" height="52" rx="3"
          fill="#2A1E28" stroke="#2A1E28" strokeWidth="1.5" />
        <rect x="52" y="63" width="196" height="48" rx="2"
          fill="none" stroke="#4A3A48" strokeWidth="1" />

        {/* Tape pack */}
        <rect x="107" y="69" width="86" height="34" rx="3"
          fill="#5B2838" opacity="0.85" />

        {/* Tape line - animated */}
        <path d="M 84 97 Q 150 85 216 97"
          stroke="#3a2a38" strokeWidth="3" fill="none"
          className="lp-tape-line" />

        {/* Left reel */}
        <g transform="translate(84 87)">
          <g className="lp-reel">
            <circle r="19" fill="#EFE8D6" stroke="#2A1E28" strokeWidth="2" />
            <polygon points={starPts} fill={accentColor} />
            <circle r="4" fill="#5B2838" stroke="#2A1E28" strokeWidth="1.5" />
          </g>
        </g>

        {/* Right reel */}
        <g transform="translate(216 87)">
          <g className="lp-reel">
            <circle r="19" fill="#EFE8D6" stroke="#2A1E28" strokeWidth="2" />
            <polygon points={starPts} fill={accentColor} />
            <circle r="4" fill="#5B2838" stroke="#2A1E28" strokeWidth="1.5" />
          </g>
        </g>

        {/* Chin trapezoid */}
        <polygon points="73,142 227,142 244,191 56,191"
          fill="#2A2020" stroke="#2A1E28" strokeWidth="1.5" />
        <line x1="73" y1="142" x2="227" y2="142"
          stroke="#2A1E28" strokeWidth="2.5" />

        {/* Chin holes */}
        <circle cx="86" cy="168" r="6"
          fill="rgba(255,255,255,1)" stroke="#2A1E28" strokeWidth="1.5" />
        <circle cx="118" cy="169" r="6"
          fill="rgba(255,255,255,1)" stroke="#2A1E28" strokeWidth="1.5" />
        <circle cx="150" cy="170" r="7"
          fill="#DDD2B8" stroke="#2A1E28" strokeWidth="1.5" />
        <text x="150" y="175" textAnchor="middle"
          fontSize="9" fontWeight="bold" fill="#2A1E28">
          {'+'}
        </text>
        <circle cx="182" cy="169" r="6"
          fill="rgba(255,255,255,1)" stroke="#2A1E28" strokeWidth="1.5" />
        <circle cx="214" cy="168" r="6"
          fill="rgba(255,255,255,1)" stroke="#2A1E28" strokeWidth="1.5" />

        {/* Corner screws - drawn last so they sit on top */}
        {screws.map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="7"
              fill="#DDD2B8" stroke="#2A1E28" strokeWidth="1.5" />
            <text x={cx} y={cy + 4} textAnchor="middle"
              fontSize="9" fontWeight="bold" fill="#2A1E28">
              {'+'}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default CassetteSVG;
