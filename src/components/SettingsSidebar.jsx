import { useState } from 'react';

export const SettingsSidebar = ({ settings, onSave, onClose }) => {
  const [local, setLocal] = useState({ ...settings });

  const set = (key, val) => {
    let next = { ...local, [key]: val };
    if (key === 'partColor') {
      next.strokeColor = val ? 'multi' : 'mono';
    }
    setLocal(next);
    onSave(next);
  };

  const speedLabel = (v) =>
    v <= 500 ? 'はやい' : v <= 900 ? 'ちょっとはやい' : v <= 1400 ? 'ふつう' : v <= 2000 ? 'ゆっくり' : 'とてもゆっくり';

  const Row = ({ label, children }) => (
    <div className="mb-3">
      <div className="text-xs text-stone-500 mb-1.5">{label}</div>
      {children}
    </div>
  );

  const BtnGroup = ({ options, current, onSelect, cols = 3 }) => (
    <div className={`grid gap-1.5 grid-cols-${cols}`}>
      {options.map(opt => (
        <button key={String(opt.id ?? opt.val)} onClick={() => onSelect(opt.id ?? opt.val)}
          className={`py-2 rounded-lg border-2 text-xs font-bold transition-all flex items-center justify-center gap-1
            ${current === (opt.id ?? opt.val)
              ? 'border-sky-400 bg-sky-50 text-sky-700'
              : 'border-stone-100 bg-stone-50 text-stone-500'}`}>
          {opt.emoji && <span>{opt.emoji}</span>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}/>
      <div className="fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
          <span className="font-bold text-stone-700 text-sm">⚙️ せってい</span>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 font-bold text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

          {/* ── みため ── */}
          <div>
            <div className="text-[10px] font-bold text-stone-400 tracking-widest mb-2 uppercase">みため</div>

            <Row label="👁 見た目">
              <BtnGroup cols={3} current={local.visualStyle || 'flat'} onSelect={v => set('visualStyle', v)}
                options={[
                  { id: 'flat',        emoji: '📄', label: 'ふつう' },
                  { id: 'haptic',      emoji: '✨', label: 'ぷっくり' },
                  { id: 'haptic-dark', emoji: '🌙', label: 'ぷっくり黒' },
                ]}/>
            </Row>

            <Row label="🌈 部品の色分け">
              <BtnGroup cols={2} current={local.partColor} onSelect={v => set('partColor', v)}
                options={[
                  { id: true,  label: 'あり' },
                  { id: false, label: 'なし' },
                ]}/>
            </Row>


<Row label={`⏱ ふでの速さ　${speedLabel(local.animSpeed ?? 1300)}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">🐇</span>
                <input type="range" min="300" max="2500" step="100" value={local.animSpeed ?? 1300}
                  onChange={e => set('animSpeed', parseInt(e.target.value))}
                  className="flex-1"/>
                <span className="text-sm">🐢</span>
              </div>
            </Row>

            <Row label="🟨 カラーマス">
              <BtnGroup cols={2} current={local.masuStyle || 'none'} onSelect={v => set('masuStyle', v)}
                options={[
                  { id: 'none',  label: 'なし' },
                  { id: 'color', label: 'カラー' },
                ]}/>
            </Row>

            <Row label="➕ 十字線">
              <div className="space-y-1.5">
                {[
                  { key: 'showExampleCross', label: 'おてほん' },
                  { key: 'showCanvasCross',  label: 'キャンバス' },
                ].map(({ key, label }) => {
                  const on = local[key] !== false;
                  return (
                    <button key={key}
                      onClick={() => set(key, !on)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all
                        ${on ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-stone-100 bg-stone-50 text-stone-400'}`}>
                      <span>{label}</span>
                      <span>{on ? 'あり ✓' : 'なし'}</span>
                    </button>
                  );
                })}
              </div>
            </Row>
          </div>

          <div className="border-t border-stone-100"/>

          {/* ── れんしゅう ── */}
          <div>
            <div className="text-[10px] font-bold text-stone-400 tracking-widest mb-2 uppercase">れんしゅう</div>

            <Row label="✏️ なぞりの太さ">
              <BtnGroup cols={3} current={local.traceWidth ?? 6} onSelect={v => set('traceWidth', v)}
                options={[
                  { id: 3,  label: 'ほそい' },
                  { id: 6,  label: 'ふつう' },
                  { id: 10, label: 'ふとい' },
                ]}/>
            </Row>

            <Row label="📐 キャンバスの大きさ">
              <BtnGroup cols={3} current={local.canvasSize ?? 'medium'} onSelect={v => set('canvasSize', v)}
                options={[
                  { id: 'small',  label: 'ちいさい' },
                  { id: 'medium', label: 'ふつう' },
                  { id: 'large',  label: 'おおきい' },
                ]}/>
            </Row>
          </div>
        </div>
      </div>
    </>
  );
};
