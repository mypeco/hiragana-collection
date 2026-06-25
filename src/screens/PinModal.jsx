import { useState } from 'react';

const PARENT_PIN = '2012';

export const PinModal = ({ onSuccess, onClose }) => {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  const press = (digit) => {
    if (input.length >= PARENT_PIN.length) return;
    const next = input + digit;
    setInput(next);
    if (next.length === PARENT_PIN.length) {
      if (next === PARENT_PIN) {
        setTimeout(() => onSuccess(), 150);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setInput(''); }, 500);
      }
    }
  };
  const back = () => setInput(s => s.slice(0, -1));
  const keys = ['1','2','3','4','5','6','7','8','9'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-xs p-6 ${shake ? 'animate-shake' : ''}`}>
        <div className="flex flex-col items-center mb-4">
          <span className="text-4xl mb-1">🔒</span>
          <h3 className="font-bold text-lg text-stone-700">ほごしゃのかくにん</h3>
          <p className="text-xs text-stone-400 mt-1">あんしょうばんごうを いれてね</p>
        </div>
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: PARENT_PIN.length }).map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < input.length ? 'bg-sky-500 border-sky-500' : 'bg-transparent border-stone-300'}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {keys.map(k => (
            <button key={k} onClick={() => press(k)}
              className="h-14 rounded-2xl bg-stone-100 text-2xl font-bold text-stone-700 active:scale-95 active:bg-sky-100 transition-all">
              {k}
            </button>
          ))}
          <button onClick={onClose} className="h-14 rounded-2xl text-sm font-bold text-stone-400 active:scale-95 transition-all">とじる</button>
          <button onClick={() => press('0')} className="h-14 rounded-2xl bg-stone-100 text-2xl font-bold text-stone-700 active:scale-95 active:bg-sky-100 transition-all">0</button>
          <button onClick={back} className="h-14 rounded-2xl text-2xl text-stone-400 active:scale-95 transition-all">⌫</button>
        </div>
      </div>
    </div>
  );
};
