import { useState, useEffect } from 'react';
import { AnimatedKana } from '../components/AnimatedKana';

export const StrokeOrderModal = ({ paths, strokes, targetKanji, settings, onClose }) => {
  const [key, setKey] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!paths) return;
    setAutoPlay(false);
    const t = setTimeout(() => {
      setAutoPlay(true);
      setKey(k => k + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [paths]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 120);
  };

  const handleReplay = () => {
    setAutoPlay(false);
    setTimeout(() => {
      setAutoPlay(true);
      setKey(k => k + 1);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: `${isClosing ? 'fade-out' : 'fade-in'} ${isClosing ? '0.12s' : '0.22s'} ease-out forwards` }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 bg-[#fdfbf7] rounded-3xl shadow-2xl p-6 mx-4 w-full max-w-lg flex flex-col items-center gap-4">
        <div className="w-full max-w-[320px]">
          {paths ? (
            <AnimatedKana
              key={key}
              paths={paths}
              strokes={strokes}
              settings={settings}
              autoPlay={autoPlay}
              hideReplayButton={true}
              onComplete={() => {}}
            />
          ) : (
            <div className="flex items-center justify-center h-[320px] text-stone-400 text-sm">よみこみちゅう…</div>
          )}
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={handleReplay} disabled={!paths}
            className="flex-1 py-3 rounded-2xl font-bold border-2 border-sky-300 bg-sky-50 text-sky-700 active:scale-95 transition-all shadow-sm disabled:opacity-40">
            もういっかい
          </button>
          <button onClick={handleClose}
            className="flex-1 py-3 rounded-2xl font-bold bg-amber-400 text-white border-2 border-amber-500 active:scale-95 transition-all shadow-md">
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};
