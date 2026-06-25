import { SvgStroke } from './SvgStroke';

export const ShotDisplay = ({ shot, strokeWidth = 8, color = '#374151', hintStrokeWidth = 8 }) => {
  if (!shot) return null;
  const hd = shot.hintData;
  return (
    <div className="w-full h-full relative">
      {hd && (
        <div className="absolute inset-0">
          {hd.type === 'trace' && hd.paths && (
            <svg viewBox="0 0 109 109" className="w-full h-full pointer-events-none">
              {hd.paths.map((p, i) => (
                <path key={i} d={p.d} fill="none"
                  stroke={p.gid === 0 ? '#0284c7' : p.gid === 1 ? '#16a34a' : '#9ca3af'}
                  strokeWidth={hintStrokeWidth * 0.54}
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
              ))}
            </svg>
          )}
          {hd.type === 'dot' && hd.dots && (
            <svg viewBox="0 0 109 109" className="w-full h-full pointer-events-none">
              {hd.dots.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={1.2}
                  fill={d.gid === 0 ? '#0284c7' : '#16a34a'} opacity="0.8" />
              ))}
            </svg>
          )}
        </div>
      )}
      <SvgStroke strokes={shot.strokes} strokeWidth={strokeWidth} color={color} />
    </div>
  );
};
