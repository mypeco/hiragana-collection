import { useState, useRef, useEffect, useCallback } from 'react';
import { getAudioContext } from '../lib/audio';

const GUIDE_PATHS = {
  h_ltr:      { d: 'M 12,50 L 88,50', dashLen: 80,  arrow: [[80,43],[88,50],[80,57]] },
  h_rtl:      { d: 'M 88,50 L 12,50', dashLen: 80,  arrow: [[20,43],[12,50],[20,57]] },
  v_down:     { d: 'M 50,12 L 50,88', dashLen: 80,  arrow: [[43,80],[50,88],[57,80]] },
  zigzag:     { d: 'M 5,62 L 20,28 L 35,62 L 50,28 L 65,62 L 80,28 L 95,62', dashLen: 220 },
  circle_cw:  { d: 'M 50.0,50.0 L 50.3,50.0 L 50.6,50.2 L 50.8,50.3 L 51.0,50.6 L 51.2,50.9 L 51.3,51.3 L 51.3,51.7 L 51.2,52.1 L 51.0,52.5 L 50.8,52.9 L 50.4,53.3 L 50.0,53.6 L 49.5,53.9 L 48.9,54.1 L 48.3,54.2 L 47.6,54.2 L 46.9,54.0 L 46.2,53.8 L 45.5,53.5 L 44.8,53.0 L 44.2,52.4 L 43.6,51.7 L 43.2,50.9 L 42.8,50.0 L 42.6,49.0 L 42.5,48.0 L 42.5,46.9 L 42.7,45.8 L 43.1,44.7 L 43.6,43.6 L 44.3,42.6 L 45.2,41.7 L 46.2,40.9 L 47.4,40.1 L 48.6,39.6 L 50.0,39.2 L 51.4,39.0 L 53.0,39.0 L 54.5,39.2 L 56.0,39.6 L 57.5,40.2 L 58.9,41.1 L 60.2,42.1 L 61.4,43.4 L 62.5,44.8 L 63.3,46.4 L 64.0,48.2 L 64.4,50.0 L 64.6,51.9 L 64.5,53.9 L 64.1,55.9 L 63.5,57.8 L 62.6,59.7 L 61.5,61.5 L 60.0,63.1 L 58.4,64.5 L 56.5,65.8 L 54.5,66.8 L 52.3,67.5 L 50.0,68.0 L 47.6,68.1 L 45.2,68.0 L 42.8,67.5 L 40.4,66.6 L 38.1,65.5 L 36.0,64.0 L 34.1,62.2 L 32.3,60.2 L 30.9,57.9 L 29.7,55.4 L 28.9,52.8 L 28.4,50.0 L 28.3,47.1 L 28.6,44.3 L 29.2,41.4 L 30.3,38.6 L 31.7,35.9 L 33.5,33.5 L 35.6,31.2 L 38.0,29.2 L 40.7,27.5 L 43.6,26.2 L 46.7,25.3 L 50.0,24.8 L 53.3,24.7 L 56.7,25.1 L 60.0,25.9 L 63.2,27.1 L 66.3,28.8 L 69.1,30.9 L 71.7,33.4 L 73.9,36.2 L 75.8,39.3 L 77.2,42.7 L 78.3,46.3 L 78.8,50.0 L 78.9,53.8 L 78.4,57.6 L 77.4,61.4 L 76.0,65.0 L 74.0,68.4 L 71.6,71.6 L 68.8,74.5 L 65.6,77.0 L 62.1,79.1 L 58.2,80.7 L 54.2,81.8 L 50.0,82.4 L 45.7,82.4 L 41.5,81.9 L 37.3,80.8 L 33.2,79.1 L 29.4,76.9 L 25.8,74.2 L 22.6,71.0 L 19.9,67.4 L 17.6,63.4 L 15.8,59.2 L 14.6,54.7 L 14.0,50.0', dashLen: 292 },
  circle_ccw: { d: 'M 50.0,50.0 L 50.3,50.0 L 50.6,49.8 L 50.8,49.7 L 51.0,49.4 L 51.2,49.1 L 51.3,48.7 L 51.3,48.3 L 51.2,47.9 L 51.0,47.5 L 50.8,47.1 L 50.4,46.7 L 50.0,46.4 L 49.5,46.1 L 48.9,45.9 L 48.3,45.8 L 47.6,45.8 L 46.9,46.0 L 46.2,46.2 L 45.5,46.5 L 44.8,47.0 L 44.2,47.6 L 43.6,48.3 L 43.2,49.1 L 42.8,50.0 L 42.6,51.0 L 42.5,52.0 L 42.5,53.1 L 42.7,54.2 L 43.1,55.3 L 43.6,56.4 L 44.3,57.4 L 45.2,58.3 L 46.2,59.1 L 47.4,59.9 L 48.6,60.4 L 50.0,60.8 L 51.4,61.0 L 53.0,61.0 L 54.5,60.8 L 56.0,60.4 L 57.5,59.8 L 58.9,58.9 L 60.2,57.9 L 61.4,56.6 L 62.5,55.2 L 63.3,53.6 L 64.0,51.8 L 64.4,50.0 L 64.6,48.1 L 64.5,46.1 L 64.1,44.1 L 63.5,42.2 L 62.6,40.3 L 61.5,38.5 L 60.0,36.9 L 58.4,35.5 L 56.5,34.2 L 54.5,33.2 L 52.3,32.5 L 50.0,32.0 L 47.6,31.9 L 45.2,32.0 L 42.8,32.5 L 40.4,33.4 L 38.1,34.5 L 36.0,36.0 L 34.1,37.8 L 32.3,39.8 L 30.9,42.1 L 29.7,44.6 L 28.9,47.2 L 28.4,50.0 L 28.3,52.9 L 28.6,55.7 L 29.2,58.6 L 30.3,61.4 L 31.7,64.1 L 33.5,66.5 L 35.6,68.8 L 38.0,70.8 L 40.7,72.5 L 43.6,73.8 L 46.7,74.7 L 50.0,75.2 L 53.3,75.3 L 56.7,74.9 L 60.0,74.1 L 63.2,72.9 L 66.3,71.2 L 69.1,69.1 L 71.7,66.6 L 73.9,63.8 L 75.8,60.7 L 77.2,57.3 L 78.3,53.7 L 78.8,50.0 L 78.9,46.2 L 78.4,42.4 L 77.4,38.6 L 76.0,35.0 L 74.0,31.6 L 71.6,28.4 L 68.8,25.5 L 65.6,23.0 L 62.1,20.9 L 58.2,19.3 L 54.2,18.2 L 50.0,17.6 L 45.7,17.6 L 41.5,18.1 L 37.3,19.2 L 33.2,20.9 L 29.4,23.1 L 25.8,25.8 L 22.6,29.0 L 19.9,32.6 L 17.6,36.6 L 15.8,40.8 L 14.6,45.3 L 14.0,50.0', dashLen: 292 },
};

export const WarmupScreen = ({ hand, bgColor, onComplete }) => {
  const isRight = (hand || 'right') === 'right';

  const EXERCISES = [
    { id: 'h1',  label: isRight ? 'よこに ながーく →' : '← よこに ながーく', sub: '👍 おやゆびで うごかしてね',     count: 3, guide: isRight ? 'h_ltr' : 'h_rtl', color: '#38bdf8' },
    { id: 'v1',  label: 'たてに ながーく ↓',                                   sub: '☝️ ひとさしゆびで うごかしてね', count: 3, guide: 'v_down',      color: '#4ade80' },
    { id: 'h2',  label: isRight ? '← ぎゃくむきに' : 'ぎゃくむきに →',        sub: '🤏 さんぼんゆびで うごかしてね', count: 3, guide: isRight ? 'h_rtl' : 'h_ltr', color: '#fb923c' },
    { id: 'zz',  label: 'ギザギザ ～',                                          sub: '',                               count: 3, guide: 'zigzag',      color: '#f472b6' },
    { id: 'cw',  label: 'ぐるぐる 🌀',                                          sub: '',                               count: 1, guide: 'circle_cw',   color: '#a78bfa' },
    { id: 'ccw', label: 'ぎゃくぐるぐる 🌀',                                    sub: '',                               count: 1, guide: 'circle_ccw',  color: '#f59e0b' },
  ];

  const [exIdx, setExIdx] = useState(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [exiting, setExiting] = useState(false);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentEx = EXERCISES[exIdx];
  const gp = GUIDE_PATHS[currentEx.guide];

  const adjustCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (Math.abs(canvas.width - rect.width * dpr) > 1 || canvas.width === 0) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 10;
      ctxRef.current = ctx;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(adjustCanvas, 100);
    const canvas = canvasRef.current;
    const prevent = (e) => { if (e.target === canvas) e.preventDefault(); };
    document.body.addEventListener('touchmove', prevent, { passive: false });
    return () => { clearTimeout(t); document.body.removeEventListener('touchmove', prevent); };
  }, [exIdx, adjustCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onStart = (e) => {
    if (flash) return;
    adjustCanvas();
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const onMove = (e) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const onEnd = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    ctxRef.current.closePath();

    const next = strokeCount + 1;
    setFlash(true);
    try {
      const ac = getAudioContext();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(480 + next * 110, ac.currentTime);
      g.gain.setValueAtTime(0.18, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);
      o.start(); o.stop(ac.currentTime + 0.25);
    } catch(err) {}

    setTimeout(() => {
      setFlash(false);
      const canvas = canvasRef.current;
      if (ctxRef.current && canvas) ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);

      if (next >= currentEx.count) {
        if (exIdx + 1 >= EXERCISES.length) {
          try {
            const ac = getAudioContext();
            const fanfare = [
              { freq: 523, t: 0,    dur: 0.12 },
              { freq: 659, t: 0.11, dur: 0.12 },
              { freq: 784, t: 0.22, dur: 0.12 },
              { freq: 1047,t: 0.33, dur: 0.28 },
              { freq: 880, t: 0.38, dur: 0.18 },
              { freq: 1047,t: 0.52, dur: 0.45 },
            ];
            fanfare.forEach(({ freq, t, dur }) => {
              const o = ac.createOscillator(); const g = ac.createGain();
              o.connect(g); g.connect(ac.destination);
              o.type = 'triangle';
              o.frequency.setValueAtTime(freq, ac.currentTime + t);
              g.gain.setValueAtTime(0, ac.currentTime + t);
              g.gain.linearRampToValueAtTime(0.22, ac.currentTime + t + 0.02);
              g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + dur);
              o.start(ac.currentTime + t);
              o.stop(ac.currentTime + t + dur + 0.05);
            });
          } catch(err) {}
          setExiting(true);
          setTimeout(onComplete, 1200);
        } else {
          setExIdx(prev => prev + 1);
          setStrokeCount(0);
        }
      } else {
        setStrokeCount(next);
      }
    }, 380);
  };

  const doneCount = exIdx + (flash && strokeCount + 1 >= currentEx.count ? 1 : 0);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: bgColor || '#fdfbf7' }}>

      <div className="flex gap-2.5 mb-6">
        {EXERCISES.map((ex, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i < doneCount ? '#4ade80' : i === exIdx ? ex.color : '#e7e5e4',
              transform: i === exIdx ? 'scale(1.35)' : 'scale(1)',
              boxShadow: i === exIdx ? `0 0 0 3px ${ex.color}44` : 'none',
            }} />
        ))}
      </div>

      <div className="text-center mb-5 px-6" style={{ minHeight: '5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="text-2xl sm:text-3xl font-bold text-stone-700 font-kyokasho tracking-wide">
          {currentEx.label}
        </div>
        {currentEx.sub && <div className="text-sm text-stone-400 mt-1.5">{currentEx.sub}</div>}
      </div>

      <div className="relative rounded-3xl overflow-hidden transition-all duration-200"
        style={{
          width: 'min(72vw, 300px)', height: 'min(72vw, 300px)',
          border: `4px solid ${flash ? '#4ade80' : currentEx.color}`,
          boxShadow: flash ? '0 0 0 6px #4ade8033' : `0 4px 20px ${currentEx.color}44`,
          transform: flash ? 'scale(1.03)' : 'scale(1)',
          background: 'white',
        }}>

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ opacity: 0.12 }}>
          <path d={gp.d} fill="none" stroke="#94a3b8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ opacity: 0.22 }}>
          <defs>
            <style>{`
              @keyframes wgu-${currentEx.id} {
                0%   { stroke-dashoffset: ${gp.dashLen}; }
                85%  { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: 0; }
              }
              .wgu-${currentEx.id} {
                stroke-dasharray: ${gp.dashLen};
                stroke-dashoffset: ${gp.dashLen};
                animation: wgu-${currentEx.id} 2s ease-in-out infinite;
              }
            `}</style>
          </defs>
          <path className={`wgu-${currentEx.id}`}
            d={gp.d} fill="none" stroke={currentEx.color}
            strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          {gp.arrow && (
            <polygon points={gp.arrow.map(p => p.join(',')).join(' ')}
              fill={currentEx.color} opacity="0.55" />
          )}
        </svg>

        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.12 }}>
          <div className="absolute top-1/2 w-full border-t-2 border-dashed border-stone-500" />
          <div className="absolute left-1/2 h-full border-l-2 border-dashed border-stone-500" />
        </div>

        <canvas ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none z-10"
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        />

        {flash && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            style={{ background: '#4ade8018' }}>
            <span className="text-5xl drop-shadow">✅</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-5 items-center" style={{ height: '1.5rem' }}>
        {Array.from({ length: currentEx.count }).map((_, i) => (
          <div key={i} className="w-5 h-5 rounded-full border-2 transition-all duration-300"
            style={{
              backgroundColor: i < strokeCount ? currentEx.color : 'transparent',
              borderColor:     i < strokeCount ? currentEx.color : '#d6d3d1',
              transform: flash && i === strokeCount - 1 ? 'scale(1.5)' : 'scale(1)',
            }} />
        ))}
      </div>

      <button
        onClick={() => { setExiting(true); setTimeout(onComplete, 400); }}
        className="absolute bottom-6 right-6 text-xs text-stone-300 hover:text-stone-500 transition-colors px-3 py-1.5 rounded-full border border-stone-200 hover:border-stone-300"
        style={{ background: 'rgba(255,255,255,0.6)' }}
      >
        とばす
      </button>
    </div>
  );
};
