import { useState, useEffect } from 'react';
import { AnimatedKana } from '../components/AnimatedKana';

export const StrokeOrderModal = ({ paths, strokes, targetKanji, settings, isKogaki = false, onClose }) => {
  const [key, setKey] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!paths) return;
    setAutoPlay(false);
    const t = setTimeout(() => {
      setAutoPlay(true);
      setKey(k => k + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [paths]);

  const handleReplay = () => {
    setAutoPlay(false);
    setTimeout(() => {
      setAutoPlay(true);
      setKey(k => k + 1);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[#fdfbf7] rounded-3xl shadow-2xl p-6 mx-4 flex flex-col items-center gap-4"
        style={{
          width: isKogaki ? 260 : undefined,
          maxWidth: isKogaki ? 260 : 512,
          animation: 'modal-pop-in 0.2s cubic-bezier(0.34,1.4,0.64,1) forwards'
        }}>
        <div style={{ width: isKogaki ? 180 : 320, maxWidth: '100%' }}>
          {paths ? (
            <AnimatedKana
              key={key}
              paths={paths}
              strokes={strokes}
              settings={settings}
              isKogaki={isKogaki}
              autoPlay={autoPlay}
              hideReplayButton={true}
              onComplete={() => {}}
            />
          ) : (
            <div className="flex items-center justify-center h-[200px] text-stone-400 text-sm">よみこみちゅう…</div>
          )}
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={handleReplay} disabled={!paths}
            className="flex-1 py-3 rounded-2xl font-bold border-2 border-sky-300 bg-sky-50 text-sky-700 active:scale-95 transition-all shadow-sm disabled:opacity-40 text-sm">
            もういっかい
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl font-bold bg-amber-400 text-white border-2 border-amber-500 active:scale-95 transition-all shadow-md text-sm">
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};
