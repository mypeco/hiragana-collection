import { useState } from 'react';

export const VisualSettingScreen = ({ settings, saveSettings, onBack }) => {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState({
    visualStyle:  settings.visualStyle  || 'flat',
    animSpeed:    settings.animSpeed    ?? 1300,
    strokeColor:  settings.strokeColor  || 'mono',
    guideOpacity: settings.guideOpacity || 'soft',
  });

  const STEPS = [
    {
      id: 'visualStyle', icon: '👁', title: 'どんなふうに見たい？',
      options: [
        { id: 'flat',        emoji: '📄', label: 'ふつう',         desc: 'シンプルに見る',         bg: '#f5f2ec', ink: '#2c2c2a' },
        { id: 'haptic',      emoji: '✨', label: 'ぷっくり',       desc: 'もりあがって見える',     bg: '#f5f2ec', ink: '#2c2c2a' },
        { id: 'haptic-dark', emoji: '🌙', label: 'ぷっくり（黒）', desc: 'くらい背景でくっきり',   bg: '#111110', ink: '#e8e4d8' },
      ]
    },
    {
      id: 'animSpeed', icon: '✏️', title: 'ふでのはやさは？',
      type: 'slider',
    },
    {
      id: 'strokeColor', icon: '🎨', title: 'いろはどうする？',
      options: [
        { id: 'mono',   emoji: '⬛', label: 'しろくろ',   desc: 'すっきりモノクロ' },
        { id: 'multi',  emoji: '🌈', label: 'カラフル',   desc: '部品ごとに色が変わる' },
        { id: 'pastel', emoji: '🌸', label: 'パステル',   desc: 'やさしいいろ' },
        { id: 'single', emoji: '🔵', label: 'いっしょく', desc: 'ひとつのいろ' },
      ]
    },
    {
      id: 'guideOpacity', icon: '🗺', title: 'ガイドはいる？',
      options: [
        { id: 'none',   emoji: '🚫', label: 'なし',     desc: '自由に書く' },
        { id: 'soft',   emoji: '👻', label: 'うっすら', desc: 'ぼんやり見える' },
        { id: 'strong', emoji: '📌', label: 'しっかり', desc: 'はっきり見える' },
      ]
    },
  ];

  const speedLabel = (v) =>
    v <= 500  ? 'はやい' :
    v <= 900  ? 'ちょっとはやい' :
    v <= 1400 ? 'ふつう' :
    v <= 2000 ? 'ゆっくり' : 'とてもゆっくり';

  const cur = STEPS[step];

  const handleSave = () => {
    saveSettings({ ...settings, ...sel });
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center px-4 py-6 animate-fade-in">
      <div className="w-full max-w-sm flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-stone-200 shadow-sm text-stone-500 font-bold text-lg active:scale-95">←</button>
        <div className="flex-1 text-center">
          <div className="text-lg font-bold text-stone-700">みため・せってい</div>
          <div className="flex justify-center gap-2 mt-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-sky-400 scale-125' : i < step ? 'bg-sky-200' : 'bg-stone-200'}`}/>
            ))}
          </div>
        </div>
        <div className="w-10"/>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-stone-100 p-5 mb-4">
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">{cur.icon}</div>
          <div className="text-base font-bold text-stone-700">{cur.title}</div>
        </div>

        {cur.type === 'slider' ? (
          <div className="px-2">
            <div className="text-center text-2xl font-bold text-sky-500 mb-1">{speedLabel(sel.animSpeed)}</div>
            <div className="text-center text-xs text-stone-400 mb-4">({sel.animSpeed}ms)</div>
            <div className="flex items-center gap-3">
              <span className="text-lg">🐇</span>
              <input type="range" min="300" max="2500" step="100" value={sel.animSpeed}
                onChange={e => setSel(s => ({...s, animSpeed: parseInt(e.target.value)}))}
                className="flex-1"/>
              <span className="text-lg">🐢</span>
            </div>
            <div className="flex justify-between text-xs text-stone-400 mt-1 px-1">
              <span>はやい</span><span>ゆっくり</span>
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 ${cur.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {cur.options.map(opt => {
              const isOn = sel[cur.id] === opt.id;
              return (
                <button key={opt.id} onClick={() => setSel(s => ({...s, [cur.id]: opt.id}))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all active:scale-95 ${isOn ? 'border-sky-400 bg-sky-50' : 'border-stone-100 bg-stone-50'}`}>
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className={`text-sm font-bold ${isOn ? 'text-sky-600' : 'text-stone-600'}`}>{opt.label}</span>
                  <span className="text-[10px] text-stone-400 text-center leading-tight">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full max-w-sm flex gap-3">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : onBack()}
          className="flex-1 py-3 rounded-xl border-2 border-stone-200 bg-white text-stone-500 font-bold active:scale-95">
          ← もどる
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex-1 py-3 rounded-xl bg-sky-500 text-white font-bold shadow-sm active:scale-95">
            つぎへ →
          </button>
        ) : (
          <button onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-amber-400 text-white font-bold shadow-sm active:scale-95">
            ✨ きめた！
          </button>
        )}
      </div>

      <div className="mt-3 text-xs text-stone-400 text-center">
        {step + 1} / {STEPS.length}ステップ
      </div>
    </div>
  );
};
