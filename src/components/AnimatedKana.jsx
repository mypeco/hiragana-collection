import { useState, useRef, useEffect } from 'react';
import { PART_COLORS, PASTEL_COLORS } from '../data/kanaData';
import { KanaPath } from './KanaPath';
import { MasuBg } from './MasuBg';
import { Play } from './Icons';

export const AnimatedKana = ({
  paths, strokes, settings, onComplete, isKogaki, trickyStroke,
  playRef, onStatusChange, onStrokeChange,
  autoPlay = false, hideReplayButton = false,
}) => {
  const [status, setStatus] = useState('idle');
  const [currentStroke, setCurrentStroke] = useState(-1);

  const visualStyle = settings?.visualStyle  || 'flat';
  const animSpeed   = settings?.animSpeed    ?? 1300;
  const strokeColor = settings?.strokeColor  || 'mono';
  const partColor   = settings?.partColor    ?? true;
  const groupLevel  = settings?.groupLevel   ?? 'large';

  const isHaptic = visualStyle === 'haptic' || visualStyle === 'haptic-dark';
  const isDark   = visualStyle === 'haptic-dark';
  const monoColor = isDark ? '#e8e4d8' : '#1f2937';

  const resolveGroupId = (p) =>
    groupLevel === 'small' ? (p.subId ?? p.groupId) : p.groupId;

  const getStrokeColor = (groupId) => {
    if (strokeColor === 'pastel') return PASTEL_COLORS[groupId % PASTEL_COLORS.length];
    if (strokeColor === 'single') return '#378ADD';
    if (strokeColor === 'multi')
      return partColor ? PART_COLORS[groupId % PART_COLORS.length] : monoColor;
    return (strokeColor === 'mono' && partColor)
      ? PART_COLORS[groupId % PART_COLORS.length]
      : monoColor;
  };

  const play = () => {
    if (status !== 'playing') { setStatus('playing'); setCurrentStroke(0); }
  };

  if (playRef) playRef.current = play;

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => { setStatus('idle'); setCurrentStroke(-1); }, [paths]);

  useEffect(() => {
    if (autoPlay) { setStatus('playing'); setCurrentStroke(0); }
  }, []);

  useEffect(() => {
    if (onStatusChange) onStatusChange(status);
  }, [status]);

  useEffect(() => {
    if (onStrokeChange) onStrokeChange(currentStroke);
  }, [currentStroke]);

  useEffect(() => {
    if (status === 'playing') {
      if (currentStroke < paths.length) {
        const timer = setTimeout(() => setCurrentStroke(prev => prev + 1), animSpeed);
        return () => clearTimeout(timer);
      } else {
        setStatus('done');
        if (onCompleteRef.current) onCompleteRef.current();
        const resetTimer = setTimeout(() => { setStatus('idle'); setCurrentStroke(-1); }, 2000);
        return () => clearTimeout(resetTimer);
      }
    }
  }, [status, currentStroke, paths.length, animSpeed]);

  const svgViewBox = isKogaki ? '4 4 101 101' : '0 0 109 109';
  const containerClass = isKogaki
    ? 'absolute pointer-events-none select-none z-10'
    : 'absolute inset-0 flex items-center justify-center p-2';
  const containerStyle = isKogaki
    ? { left: '-8%', bottom: '0%', width: '66%', height: '66%' }
    : {};

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className={`w-full aspect-square rounded-xl shadow-md border-4 flex items-center justify-center relative overflow-hidden ${isDark ? 'bg-[#111110] border-stone-700' : 'bg-white border-orange-200'}`}>
        <MasuBg masuStyle={settings?.masuStyle} dark={isDark} />
        <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
          {settings?.showExampleCross !== false && (
            <>
              <div className={`absolute top-1/2 w-full border-t-2 border-dashed ${isDark ? 'border-stone-600' : 'border-red-300'}`}></div>
              <div className={`absolute left-1/2 h-full border-l-2 border-dashed ${isDark ? 'border-stone-600' : 'border-red-300'}`}></div>
            </>
          )}
        </div>
        <span className={`absolute top-1 left-1 text-[10px] px-1 rounded border z-20 font-bold ${isDark ? 'text-stone-400 bg-stone-800 border-stone-600' : 'text-red-500 bg-white border-red-200'}`}>{strokes}かく</span>

        <div className={containerClass} style={containerStyle}>
          <svg viewBox={svgViewBox} className="w-full h-full relative z-10">
            {isHaptic && (
              <defs>
                <filter id="hapticF" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="4.5" result="blur"/>
                  <feSpecularLighting in="blur" surfaceScale="2" specularConstant="1.0" specularExponent="22" lightingColor="white" result="spec">
                    <feDistantLight azimuth="230" elevation="62"/>
                  </feSpecularLighting>
                  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut"/>
                  <feBlend in="SourceGraphic" in2="specOut" mode="screen"/>
                </filter>
              </defs>
            )}
            {/* ガイド層（再生中のhapticは非表示） */}
            {!(isHaptic && status === 'playing') && paths.map((p, i) => {
              const gid = resolveGroupId(p);
              const guideColor = getStrokeColor(gid);
              const op = (partColor || strokeColor === 'pastel' || strokeColor === 'single') ? '0.28' : '0.55';
              return (
                <path key={`guide-${i}`} d={p.d} className="stroke-path" strokeWidth="6"
                  stroke={guideColor} opacity={op} />
              );
            })}
            {/* アニメーション層 */}
            {paths.map((p, i) => {
              let pathStatus = 'undrawn';
              if (status === 'idle' || status === 'done') pathStatus = 'drawn';
              else if (status === 'playing') {
                if (i < currentStroke) pathStatus = 'drawn';
                else if (i === currentStroke) pathStatus = 'animating';
              }
              const gid = resolveGroupId(p);
              const drawnColor = getStrokeColor(gid);
              const strokeW = isHaptic ? (pathStatus === 'animating' ? '7' : '6') : '5';
              const animatingColor = (strokeColor === 'mono' && isHaptic) ? monoColor
                : (partColor && strokeColor !== 'single') ? drawnColor
                : '#f97316';
              return (
                <KanaPath key={`stroke-${i}`} d={p.d} status={pathStatus}
                  strokeWidth={strokeW} drawnColor={drawnColor}
                  filter={isHaptic ? 'url(#hapticF)' : undefined}
                  animatingColor={animatingColor}
                  animDuration={animSpeed}
                />
              );
            })}
            {/* 筆順番号 */}
            {paths.map((p, i) => {
              const m = p.d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
              if (!m) return null;
              const cx = parseFloat(m[1]);
              const cy = parseFloat(m[2]);
              const isDone = status === 'idle' || status === 'done' || (status === 'playing' && i < currentStroke);
              const isActive = status === 'playing' && i === currentStroke;
              if (!isDone && !isActive) return null;
              return (
                <text key={`num-${i}`} x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  fontSize="5" fontWeight="bold" fill={isDark ? '#c0bcb0' : '#1f2937'} opacity="0.6" style={{ userSelect: 'none' }}>
                  {i + 1}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {!hideReplayButton && (
        <button onClick={play} disabled={status === 'playing'}
          className={`relative flex items-center justify-center gap-1.5 w-full py-2 rounded-full font-bold shadow-sm transition-transform
            ${status === 'playing'
              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
              : `bg-sky-500 text-white active:scale-95 hover:bg-sky-600 shadow-md${trickyStroke ? ' border-[5px] border-red-500 shadow-red-200/50' : ''}`}`}>
          {trickyStroke && status !== 'playing' && (
            <span className="absolute -top-3 -right-3 text-3xl leading-none drop-shadow-md animate-bounce">⚠️</span>
          )}
          <Play className="w-4 h-4 fill-current" />
          <span className="text-xs">{status === 'playing' ? 'さいせいちゅう' : trickyStroke ? 'かきじゅん注意！' : 'さいせい'}</span>
        </button>
      )}
    </div>
  );
};
