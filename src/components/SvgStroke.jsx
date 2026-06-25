export const SvgStroke = ({ strokes, strokeWidth = 5, color = 'black' }) => {
  if (!strokes || strokes.length === 0) return null;
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full pointer-events-none">
      {strokes.map((stroke, i) => {
        if (!stroke || stroke.length === 0) return null;
        const d = `M ${stroke[0].x} ${stroke[0].y} ` + stroke.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        return <path key={i} d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </svg>
  );
};
