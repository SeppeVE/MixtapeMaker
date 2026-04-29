const STRIP_A = ['#D4A935','#5B2838','#8FC9B7','#B4A0C7','#A8C4A2','#3D5A47','#D4A935','#5B2838','#8FC9B7','#B4A0C7','#A8C4A2','#3D5A47'];
const STRIP_B = ['#3D5A47','#A8C4A2','#B4A0C7','#8FC9B7','#5B2838','#D4A935','#3D5A47','#A8C4A2','#B4A0C7','#8FC9B7','#5B2838','#D4A935'];

interface TapeStripProps {
  reverse?: boolean;
}

const TapeStrip = ({ reverse = false }: TapeStripProps) => (
  <div className="lp-tape-strip">
    {(reverse ? STRIP_B : STRIP_A).map((c, i) => (
      <span key={i} style={{ background: c }} />
    ))}
  </div>
);

export default TapeStrip;
