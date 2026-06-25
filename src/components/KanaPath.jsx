import { useRef, useState, useEffect } from 'react';

export const KanaPath = ({ d, status, strokeWidth = '5', drawnColor = '#1f2937', filter, animatingColor = '#f97316', animDuration, pathOpacity }) => {
  const pathRef = useRef(null);
  const [length, setLength] = useState(200);

  useEffect(() => {
    if (pathRef.current) {
      const actualLength = pathRef.current.getTotalLength();
      if (actualLength > 0) setLength(actualLength);
    }
  }, [d]);

  const dynamicStyle = { '--path-length': length, strokeDasharray: length };
  if (status !== 'animating') dynamicStyle.strokeDashoffset = status === 'drawn' ? 0 : length;
  if (status === 'animating' && animDuration) dynamicStyle.animation = `draw ${animDuration}ms ease-out forwards`;
  if (pathOpacity !== undefined) dynamicStyle.opacity = pathOpacity;

  let strokeColor = 'transparent';
  if (status === 'drawn') strokeColor = drawnColor;
  if (status === 'animating') strokeColor = animatingColor;

  return (
    <path
      ref={pathRef}
      d={d}
      filter={filter}
      className={`stroke-path ${status === 'animating' ? 'stroke-animating' : ''}`}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      style={dynamicStyle}
    />
  );
};
