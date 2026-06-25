import { useState } from 'react';
import { AnimatedKana } from './AnimatedKana';

export const SettingsSidebar = ({ settings, onSave, onClose, svgPaths, targetKanji }) => {
  const [local, setLocal] = useState({ ...settings });
  const [previewTrigger, setPreviewTrigger] = useState(0);

  const set = (key, val) => {
    let next = { ...local, [key]: val };
    if (key === 'partColor') {
      if (val === true  && (next.strokeColor === 'mono' || next.strokeColor === 'single')) next.strokeColor = 'multi';
      if (val === false && (next.strokeColor === 'multi' || next.strokeColor === 'pastel')) next.strokeColor = 'mono';
    }
    setLocal(next);
    onSave(next);
  };

  const isHaptic = local.visualStyle === 'haptic' || local.visualStyle === 'haptic-dark';

  const strokeOptions = local.partColor
    ? [
        { id: 'multi',  label: 'カラフル', emoji: '🌈' },
        { id: 'pastel', label: 'パステル',  emoji: '🌸' },
      ]
    : [
        { id: 'mono',   label: 'しろくろ',   emoji: '⬛' },
        { id: 'single', label: 'いっしょく', emoji: '🔵' },
      ];

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
          <span className="font-bold text-stone-700 text-sm">👁 みため・せってい</span>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 font-bold text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
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

          <Row label="🎨 色">
            <div className="flex gap-1.5 flex-wrap">
              {strokeOptions.map(opt => (
                <button key={opt.id} onClick={() => set('strokeColor', opt.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 text-xs font-bold transition-all
                    ${local.strokeColor === opt.id
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-stone-100 bg-stone-50 text-stone-500'}`}>
                  <span>{opt.emoji}</span><span>{opt.label}</span>
                </button>
              ))}
            </div>
          </Row>

          <div className={`mb-3 transition-opacity ${isHaptic ? 'opacity-30 pointer-events-none' : ''}`}>
            <div className="text-xs text-stone-500 mb-1.5">
              📋 おてほん 下レイヤー
              {isHaptic && <span className="ml-1 text-[10px] text-stone-400">（ぷっくり時は非表示）</span>}
            </div>
            <BtnGroup cols={3} current={local.guideLayerOpacity || 'soft'} onSelect={v => set('guideLayerOpacity', v)}
              options={[
                { id: 'none',   label: 'なし' },
                { id: 'soft',   label: 'うっすら' },
                { id: 'strong', label: 'しっかり' },
              ]}/>
          </div>

          <Row label={`⏱ ふでの速さ　${speedLabel(local.animSpeed ?? 1300)}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm">🐇</span>
              <input type="range" min="300" max="2500" step="100" value={local.animSpeed ?? 1300}
                onChange={e => set('animSpeed', parseInt(e.target.value))}
                className="flex-1"/>
              <span className="text-sm">🐢</span>
            </div>
          </Row>

          {svgPaths && targetKanji && (
            <div className="mb-3">
              <div className="text-xs text-stone-500 mb-1.5">▶ さいせいしてみる</div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 shrink-0">
                  <AnimatedKana
                    paths={svgPaths}
                    strokes={targetKanji.strokes}
                    settings={{ ...local, _playTrigger: previewTrigger }}
                    onComplete={() => {}}
                    isKogaki={['ゃ','ゅ','ょ','っ'].includes(targetKanji.char)}
                    trickyStroke={targetKanji.trickyStroke}
                    onStatusChange={() => {}}
                  />
                </div>
                <button
                  onClick={() => setPreviewTrigger(t => t + 1)}
                  className="flex-1 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold shadow-sm active:scale-95 hover:bg-sky-600 transition-all"
                >
                  ▶ さいせい
                </button>
              </div>
            </div>
          )}

          <Row label="🔗 なぞりも同期して描画">
            <BtnGroup cols={2} current={local.syncTrace ?? false} onSelect={v => set('syncTrace', v)}
              options={[
                { id: true,  label: 'する' },
                { id: false, label: 'しない' },
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

          <div className="border-t border-stone-100 my-1"/>
          <div className="text-[10px] font-bold text-stone-400 tracking-widest mb-2 uppercase">れんしゅう</div>

          <Row label="📝 なぞりガイドのこさ">
            <BtnGroup cols={3} current={local.guideOpacity || 'soft'} onSelect={v => set('guideOpacity', v)}
              options={[
                { id: 'none',   label: 'なし' },
                { id: 'soft',   label: 'うっすら' },
                { id: 'strong', label: 'しっかり' },
              ]}/>
          </Row>

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

          <Row label="🟨 カラーマス">
            <BtnGroup cols={2} current={local.masuStyle || 'none'} onSelect={v => set('masuStyle', v)}
              options={[
                { id: 'none',  label: 'なし' },
                { id: 'color', label: 'カラー' },
              ]}/>
          </Row>

          {local.partColor && (
            <Row label="🔍 部品の細かさ">
              <BtnGroup cols={2} current={local.groupLevel ?? 'large'} onSelect={v => set('groupLevel', v)}
                options={[
                  { id: 'large', emoji: '🟦', label: 'おおきく' },
                  { id: 'small', emoji: '🔷', label: 'こまかく' },
                ]}/>
            </Row>
          )}
        </div>
      </div>
    </>
  );
};
