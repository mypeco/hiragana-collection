export const MasuBg = ({ masuStyle, dark = false }) => {
  if (!masuStyle || masuStyle === 'none' || dark) return null;
  return (
    <div className="absolute inset-0 pointer-events-none z-0 rounded-inherit overflow-hidden">
      <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <rect x="0"  y="0"  width="50" height="50" fill="#fef9c3"/>
        <rect x="50" y="0"  width="50" height="50" fill="#dbeafe"/>
        <rect x="0"  y="50" width="50" height="50" fill="#fce7f3"/>
        <rect x="50" y="50" width="50" height="50" fill="#dcfce7"/>
      </svg>
    </div>
  );
};
