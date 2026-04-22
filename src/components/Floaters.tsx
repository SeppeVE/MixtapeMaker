import '../../assets/styles/Floaters.css';

const INK = '#2A1E28';

const SHAPES_A = [
  { type: 'triangle', x: 7,  y: 22, size: 38, rot: -15, color: '#5B2838' },
  { type: 'sphere',   x: 88, y: 20, size: 32, rot: 0,   color: '#D4A935' },
  { type: 'cube',     x: 11, y: 74, size: 44, rot: 10,  color: '#5B2838' },
  { type: 'diamond',  x: 93, y: 68, size: 28, rot: 0,   color: '#D4A935' },
  { type: 'square',   x: 54, y: 88, size: 22, rot: 25,  color: '#5B2838' },
  { type: 'triangle', x: 79, y: 8,  size: 34, rot: 20,  color: '#3D5A47' },
  { type: 'sphere',   x: 41, y: 11, size: 20, rot: 0,   color: '#5B2838' },
  { type: 'cube',     x: 68, y: 84, size: 28, rot: -8,  color: '#D4A935' },
];

const SHAPES_B = [
  { type: 'sphere',   x: 6,  y: 18, size: 36, rot: 0,   color: '#5B2838' },
  { type: 'triangle', x: 90, y: 25, size: 30, rot: 12,  color: '#D4A935' },
  { type: 'diamond',  x: 14, y: 76, size: 32, rot: 0,   color: '#D4A935' },
  { type: 'cube',     x: 91, y: 65, size: 40, rot: -5,  color: '#5B2838' },
  { type: 'square',   x: 48, y: 86, size: 24, rot: -20, color: '#5B2838' },
  { type: 'sphere',   x: 75, y: 10, size: 26, rot: 0,   color: '#D4A935' },
  { type: 'triangle', x: 38, y: 9,  size: 22, rot: -8,  color: '#5B2838' },
  { type: 'diamond',  x: 65, y: 82, size: 30, rot: 15,  color: '#3D5A47' },
];

interface ShapeData {
  type: string;
  size: number;
  rot: number;
  color: string;
}

function ShapeSvg({ type, size, rot, color }: ShapeData) {
  const h = size / 2;
  const style = { transform: `rotate(${rot}deg)`, transformOrigin: 'center', display: 'block' };

  if (type === 'sphere') return (
    <svg width={size} height={size} viewBox={`${-h} ${-h} ${size} ${size}`} style={style}>
      <circle r={h - 1} fill={color} stroke={INK} strokeWidth={2} />
      <path
        d={`M ${-h + 5} -3 a ${h - 5} ${h / 2.5} 0 0 1 ${size - 10} 0`}
        fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={1.5}
      />
    </svg>
  );

  if (type === 'triangle') return (
    <svg width={size} height={size} viewBox={`${-h} ${-h} ${size} ${size}`} style={style}>
      <polygon points={`0,${-h} ${h},${h} ${-h},${h}`} fill={color} stroke={INK} strokeWidth={2} />
    </svg>
  );

  if (type === 'cube') {
    const d = h;
    return (
      <svg width={size} height={size} viewBox={`${-h} ${-h} ${size} ${size}`} style={style}>
        <polygon points={`${-d},${-d * .5} 0,${-d} ${d},${-d * .5} 0,0`} fill="#EFE8D6" stroke={INK} strokeWidth={2} />
        <polygon points={`${-d},${-d * .5} ${-d},${d * .5} 0,${d} 0,0`} fill={color} stroke={INK} strokeWidth={2} />
        <polygon points={`0,0 0,${d} ${d},${d * .5} ${d},${-d * .5}`} fill="#4A3A48" stroke={INK} strokeWidth={2} />
      </svg>
    );
  }

  if (type === 'diamond') return (
    <svg width={size} height={size} viewBox={`${-h} ${-h} ${size} ${size}`} style={style}>
      <polygon points={`0,${-h} ${h},0 0,${h} ${-h},0`} fill={color} stroke={INK} strokeWidth={2} />
    </svg>
  );

  // square
  return (
    <svg width={size} height={size} viewBox={`${-h} ${-h} ${size} ${size}`} style={style}>
      <rect x={-h} y={-h} width={size} height={size} fill={color} stroke={INK} strokeWidth={2} />
    </svg>
  );
}

export default function Floaters({ sideA }: { sideA: boolean }) {
  const shapes = sideA ? SHAPES_A : SHAPES_B;
  return (
    <div className="floaters" aria-hidden="true">
      {shapes.map((s, i) => (
        <div
          key={i}
          className="floater"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <ShapeSvg type={s.type} size={s.size} rot={s.rot} color={s.color} />
        </div>
      ))}
    </div>
  );
}
