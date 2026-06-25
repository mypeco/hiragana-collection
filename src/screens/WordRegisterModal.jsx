import { useState, useMemo } from 'react';
import { getAudioContext } from '../lib/audio';
import { speakWithSettings } from '../lib/speech';
import { SvgStroke } from '../components/SvgStroke';

const isTargetChar = (char) => /[぀-ゟ一-龯]/.test(char);

export const WordRegisterModal = ({ wordObj, bestShots, onComplete, settings }) => {
  const allChars = wordObj.word.split('');
  const targetIndices = allChars.reduce((acc, c, i) => { if (isTargetChar(c)) acc.push(i); return acc; }, []);
  const [filled, setFilled] = useState([]);
  const [celebrating, setCelebrating] = useState(false);
  const [slotAnimating, setSlotAnimating] = useState(null);
  const [rejectedChar, setRejectedChar] = useState(null);

  const charCount = {};
  targetIndices.forEach(i => { charCount[allChars[i]] = (charCount[allChars[i]] || 0) + 1; });
  const charFilled = {};
  filled.forEach(i => { const c = allChars[i]; charFilled[c] = (charFilled[c] || 0) + 1; });
  const uniqueTargetChars = [...new Set(targetIndices.map(i => allChars[i]))];

  const nextSlotIdx  = filled.length < targetIndices.length ? targetIndices[filled.length] : null;
  const nextRequired = nextSlotIdx !== null ? allChars[nextSlotIdx] : null;

  const scattered = useMemo(() => {
    const n = uniqueTargetChars.length;
    return uniqueTargetChars.map((_, i) => {
      const seed = wordObj.word.charCodeAt(i % wordObj.word.length) + i * 37;
      const pseudo  = (seed * 9301 + 49297) % 233280 / 233280;
      const pseudo2 = ((seed + 17) * 9301 + 49297) % 233280 / 233280;
      const angle = (i / n) * Math.PI * 2 + pseudo * 1.2 - 0.6;
      const r = 60 + pseudo2 * 36;
      return { x: Math.cos(angle) * r, y: Math.sin(angle) * r * 0.55, rot: (pseudo - 0.5) * 22 };
    });
  }, [wordObj.word]);

  const playPinpon = () => {
    try {
      const ac = getAudioContext();
      [[1320, 0], [990, 0.22]].forEach(([freq, delay]) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, ac.currentTime + delay);
        g.gain.setValueAtTime(0.28, ac.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.18);
        o.start(ac.currentTime + delay);
        o.stop(ac.currentTime + delay + 0.2);
      });
    } catch(e) {}
  };

  const playReject = () => {
    try {
      const ac = getAudioContext();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(180, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.12);
      g.gain.setValueAtTime(0.12, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.14);
      o.start(); o.stop(ac.currentTime + 0.15);
    } catch(e) {}
  };

  const handleTapCard = (char) => {
    if (celebrating) return;
    const usedAll = (charFilled[char] || 0) >= charCount[char];
    if (usedAll) return;

    if (char !== nextRequired) {
      if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
      playReject();
      setRejectedChar(char);
      setTimeout(() => setRejectedChar(null), 420);
      return;
    }

    if (navigator.vibrate) navigator.vibrate(30);
    speakWithSettings(char, settings, { rate: 0.8, pitch: 1.2 });

    setSlotAnimating(nextSlotIdx);
    setTimeout(() => setSlotAnimating(null), 400);

    const newFilled = [...filled, nextSlotIdx];
    setFilled(newFilled);

    if (newFilled.length === targetIndices.length) {
      if (navigator.vibrate) navigator.vibrate([50, 60, 80, 60, 120]);
      setTimeout(() => {
        setCelebrating(true);
        if (window.speechSynthesis && settings.voiceEnabled !== false) {
          const utter = new SpeechSynthesisUtterance(wordObj.word);
          utter.lang = 'ja-JP';
          utter.rate = 0.75;
          utter.pitch = 1.1;
          if (settings.voiceName) {
            const v = window.speechSynthesis.getVoices().find(v => v.name === settings.voiceName);
            if (v) utter.voice = v;
          }
          utter.onend = () => { setTimeout(playPinpon, 120); };
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utter);
        } else {
          setTimeout(playPinpon, 200);
        }
      }, 350);
      setTimeout(() => onComplete(), 2800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#fdfbf7] rounded-3xl shadow-2xl overflow-hidden animate-bounce-in my-auto"
        style={{ paddingBottom: '24px', maxHeight: '90vh', overflowY: celebrating ? 'hidden' : 'auto' }}>

        <div className="w-full h-2 bg-gradient-to-r from-amber-300 via-orange-300 to-amber-300"/>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-stone-300 rounded-full"/>
        </div>

        <div className="px-6 pb-8 pt-2">
          <div className="text-center mb-5">
            <p className="text-xs font-bold text-amber-500 tracking-widest mb-1">✨ あたらしい ことば ✨</p>
            <div className="text-6xl mb-1">{wordObj.icon}</div>
            <div className="text-3xl font-kyokasho text-stone-800 tracking-widest font-bold">{wordObj.word}</div>
          </div>

          <div className="flex justify-center gap-3 mb-2">
            {allChars.map((c, i) => {
              if (!isTargetChar(c)) {
                return <div key={i} className="w-14 h-14 flex items-center justify-center text-2xl font-kyokasho text-stone-500 font-bold">{c}</div>;
              }
              const isFilled = filled.includes(i);
              const isNext   = i === nextSlotIdx;
              const shot = bestShots[c];
              return (
                <div key={i} className={`w-14 h-14 rounded-2xl border-4 transition-all duration-300 overflow-hidden
                  ${isFilled  ? 'border-amber-400 bg-white shadow-lg'
                  : isNext    ? 'border-amber-400 bg-amber-50 shadow-md animate-unlock-glow'
                  :             'border-dashed border-amber-200 bg-amber-50/40'}`}>
                  {isFilled && shot ? (
                    <div className={slotAnimating === i ? 'animate-slot-pop w-full h-full' : 'w-full h-full'}>
                      <SvgStroke strokes={shot.strokes} strokeWidth={9} color="#78350f"/>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-200 text-2xl font-kyokasho select-none">{c}</div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-stone-400 font-bold mb-2">
            {nextRequired ? `👆 「${nextRequired}」を さがして タップ！` : ''}
          </p>

          <div className="relative mx-auto" style={{ width: '260px', height: '180px' }}>
            {uniqueTargetChars.map((char, ci) => {
              const shot = bestShots[char];
              const usedAll = (charFilled[char] || 0) >= charCount[char];
              const pos = scattered[ci] || { x: 0, y: 0, rot: 0 };
              const isRejected = rejectedChar === char;
              return (
                <button key={char}
                  onClick={() => handleTapCard(char)}
                  disabled={usedAll}
                  style={{
                    position: 'absolute',
                    left:  `calc(50% + ${pos.x}px - 32px)`,
                    top:   `calc(50% + ${pos.y}px - 32px)`,
                    transform: `rotate(${isRejected ? 0 : pos.rot}deg)`,
                    animation: isRejected ? 'puzzle-shake 0.38s ease-in-out' : 'none',
                    zIndex: usedAll ? 0 : 1,
                  }}
                  className={`w-16 h-16 rounded-xl border-2 p-1 transition-all
                    ${usedAll
                      ? 'opacity-20 grayscale cursor-not-allowed border-stone-200 bg-stone-50'
                      : isRejected
                        ? 'border-red-400 bg-red-50 shadow-md scale-95'
                        : 'border-amber-400 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-90 cursor-pointer'}`}>
                  {shot && <SvgStroke strokes={shot.strokes} strokeWidth={9} color="#78350f"/>}
                  {usedAll && (
                    <div className="absolute inset-0 flex items-center justify-center text-green-500 text-2xl">✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {celebrating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-50 animate-celebrate-in z-20 rounded-3xl">
            <div className="text-7xl mb-3" style={{ animation: 'bounce 0.6s infinite' }}>{wordObj.icon}</div>
            <div className="text-4xl font-kyokasho text-amber-800 tracking-widest font-bold mb-2">{wordObj.word}</div>
            <div className="text-lg font-bold text-amber-600 mb-4">ことばずかん に とうろく！</div>
            <div className="flex gap-2 text-3xl animate-bounce-in">
              {['🌟','✨','🎊','✨','🌟'].map((e, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.1}s`, display:'inline-block', animation: 'bounce 0.8s infinite' }}>{e}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
