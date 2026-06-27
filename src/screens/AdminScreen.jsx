import { useRef, useState, useEffect } from 'react';
import { db } from '../lib/db';
import { speak } from '../lib/speech';
import { Hand, Sparkles, Lock, SettingsIcon } from '../components/Icons';
import { COLOR_OPTIONS, DURATION_OPTIONS } from '../data/kanaData';

export const AdminScreen = ({ onBack, settings, saveSettings }) => {
  const fileInputRef = useRef(null);
  const [jaVoices, setJaVoices] = useState([]);

  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      const ja = all.filter(v => v.lang.startsWith('ja'));
      setJaVoices(ja);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const IPAD_ONLY_VOICES = ['Kyoko', 'O-ren', 'Hattori', 'Otoya'];

  const handleExport = async () => {
    try {
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        users: await db.users.toArray(),
        settings: await db.settings.toArray(),
        practices: await db.practices.toArray(),
        bestShots: await db.bestShots.toArray(),
        readWords: await db.readWords.toArray()
      };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toLocaleDateString('ja-JP').replace(/\//g, '');
      a.download = `hiragana_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('バックアップデータをほぞんしました！');
    } catch (e) {
      console.error('エクスポートに失敗しました:', e);
      alert('エラーがおきました。');
    }
  };

  const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

  const validateTable = (arr, tableLabel, requiredKeys) => {
    if (!Array.isArray(arr)) throw new Error(`「${tableLabel}」のデータ形式が正しくありません。`);
    for (const item of arr) {
      if (!isPlainObject(item)) throw new Error(`「${tableLabel}」に不正なデータが含まれています。`);
      for (const key of requiredKeys) {
        if (!(key in item)) throw new Error(`「${tableLabel}」のデータに必要な項目（${key}）がありません。`);
      }
    }
  };

  const validateBackupData = (data) => {
    if (!isPlainObject(data) || !data.version || !Array.isArray(data.users) || !Array.isArray(data.settings)) {
      return { ok: false, reason: '正しいファイルを選んでね。' };
    }
    try {
      validateTable(data.users, 'users', ['name', 'icon', 'color']);
      validateTable(data.settings, 'settings', ['userId']);
      if (data.practices !== undefined) validateTable(data.practices, 'practices', ['userId', 'char']);
      if (data.bestShots !== undefined) validateTable(data.bestShots, 'bestShots', ['userId', 'char']);
      if (data.readWords !== undefined) validateTable(data.readWords, 'readWords', ['userId', 'wordId']);
    } catch (err) {
      return { ok: false, reason: err.message };
    }
    return { ok: true };
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isMigration = window.confirm(
      '【かくにん】\nちがうタブレットへ データをうつしますか？\n' +
      '（「はい」をえらぶと、新しい端末用にIDを書き換えて移植します）'
    );
    if (!window.confirm('データを読み込みます。いまのデータはすべて消えて上書きされますが、いいですか？\n（もとに戻すことはできません）')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const validation = validateBackupData(data);
        if (!validation.ok) { alert(validation.reason); return; }
        if (isMigration && data.users) {
          data.users = data.users.map(u => ({ ...u, profileId: crypto.randomUUID() }));
        }
        await db.transaction('rw', db.users, db.settings, db.practices, db.bestShots, db.readWords, async () => {
          if (data.users)     { await db.users.clear();     await db.users.bulkPut(data.users); }
          if (data.settings)  { await db.settings.clear();  await db.settings.bulkPut(data.settings); }
          if (data.practices) { await db.practices.clear(); await db.practices.bulkPut(data.practices); }
          if (data.bestShots) { await db.bestShots.clear(); await db.bestShots.bulkPut(data.bestShots); }
          if (data.readWords) { await db.readWords.clear(); await db.readWords.bulkPut(data.readWords); }
        });
        alert(isMigration ? 'データの移植がおわりました！アプリを再起動します。' : 'データのふくげんがおわりました！アプリを再起動します。');
        window.location.reload();
      } catch (err) {
        console.error('インポートに失敗しました:', err);
        alert('データがこわれているか、読み込めませんでした。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-[#fdfbf7] min-h-screen animate-fade-in">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <button onClick={onBack} className="text-stone-500 flex items-center gap-1 bg-stone-100 px-4 py-2 rounded-full font-bold hover:bg-stone-200 transition-colors">
          ↩️ もどる
        </button>
        <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6"/> 管理・設定画面
        </h2>
        <div className="w-24"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-green-800 flex items-center gap-2">🔊 おしゃべりの声</h3>
            <p className="text-xs text-green-600 mb-3">文字やことばを読むときの声をえらべます。</p>
            {jaVoices.length === 0 ? (
              <p className="text-xs text-stone-400 font-bold">このデバイスでは音声が見つかりませんでした。</p>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { saveSettings({...settings, voiceName: ''}); speak('こんにちは'); }}
                  className={`px-4 py-2.5 rounded-lg font-bold border-2 transition-all text-left text-sm ${!settings.voiceName ? 'border-green-500 bg-green-400 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}
                >
                  🤖 デフォルト（じどうせんたく）
                </button>
                {jaVoices.map(v => {
                  const isIpadOnly = IPAD_ONLY_VOICES.some(n => v.name.includes(n));
                  const isSelected = settings.voiceName === v.name;
                  return (
                    <button key={v.name}
                      onClick={() => { saveSettings({...settings, voiceName: v.name}); speak('こんにちは', {}, v.name); }}
                      className={`px-4 py-2.5 rounded-lg font-bold border-2 transition-all text-left text-sm flex items-center justify-between gap-2 ${isSelected ? 'border-green-500 bg-green-400 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}
                    >
                      <span>🗣 {v.name}</span>
                      <span className="flex gap-1 flex-wrap justify-end">
                        {isIpadOnly && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-600'}`}>iPad専用</span>}
                        {!v.localService && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/30 text-white' : 'bg-stone-100 text-stone-500'}`}>オンライン</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Hand className="w-5 h-5 text-stone-500"/> ききうで（利き手）</h3>
            <div className="flex gap-2">
              <button onClick={() => saveSettings({...settings, hand: 'right'})} className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${settings.hand === 'right' || !settings.hand ? 'border-sky-500 bg-sky-400 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}>みぎきき</button>
              <button onClick={() => saveSettings({...settings, hand: 'left'})} className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${settings.hand === 'left' ? 'border-sky-500 bg-sky-400 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}>ひだりきき</button>
            </div>
          </div>

          <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-teal-800 flex items-center gap-1">✏️ 起動時の運筆ウォームアップ</h3>
            <p className="text-xs text-teal-600 mb-3">プロフィール選択後に、横棒・縦線・ぐるぐるの運筆練習をします。</p>
            <div className="flex gap-2">
              <button onClick={() => saveSettings({...settings, warmupEnabled: true})}  className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${settings.warmupEnabled !== false ? 'border-teal-500 bg-teal-400 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}>ON</button>
              <button onClick={() => saveSettings({...settings, warmupEnabled: false})} className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${settings.warmupEnabled === false  ? 'border-stone-500 bg-stone-500 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}>OFF</button>
            </div>
          </div>

<div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-amber-800 flex items-center gap-1"><Sparkles className="w-4 h-4"/> NEW✨マークの表示期間</h3>
            <p className="text-xs text-amber-600 mb-3">「さいきんかけたもじ」セクションにも同じ期間が使われます。</p>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.val} onClick={() => saveSettings({...settings, newDuration: opt.val})}
                  className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${settings.newDuration === opt.val ? 'border-amber-500 bg-amber-400 text-white shadow-md' : 'border-stone-300 bg-white text-stone-600'}`}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-yellow-800 flex items-center gap-2">⭐ きょうのもくひょう</h3>
            <p className="text-xs text-yellow-700 mb-3">1日に何こ集めたらながれぼしを出すか決めます。</p>
            <div className="flex gap-2 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => saveSettings({...settings, dailyGoal: n})}
                  className="w-10 h-10 rounded-lg font-bold border-2 transition-all text-sm"
                  style={(settings.dailyGoal ?? 5) === n
                    ? { borderColor: '#eab308', backgroundColor: '#fefce8', color: '#713f12' }
                    : { borderColor: '#d6d3d1', backgroundColor: 'white', color: '#78716c' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-indigo-800 flex items-center gap-2">🎯 れんしゅうの ながれ</h3>
            <p className="text-xs text-indigo-600 mb-3">各モードの目標回数を設定します。すべてのモードが完了すると、なかから1枚えらべます。0回にするとそのモードをスキップします。</p>
            {[
              { key: 'strokeCheckTarget',    label: '筆順確認',  emoji: '✨',   activeStyle: { borderColor: '#f59e0b', backgroundColor: '#fffbeb', color: '#92400e' }, defaultVal: 1, onlyZeroOrOne: true },
              { key: 'traceAllTarget',       label: 'ぜんぶ',    emoji: '✏️',   activeStyle: { borderColor: '#0ea5e9', backgroundColor: '#e0f2fe', color: '#0369a1' }, defaultVal: 1 },
              { key: 'traceBlueTarget',      label: 'いちぶ',    emoji: '🟦',   activeStyle: { borderColor: '#3b82f6', backgroundColor: '#eff6ff', color: '#1d4ed8' }, defaultVal: 1 },
              { key: 'tenTarget',            label: 'てん',      emoji: '⚫️',  activeStyle: { borderColor: '#f97316', backgroundColor: '#fff7ed', color: '#c2410c' }, defaultVal: 1 },
              { key: 'blankTarget',          label: 'おてほん',  emoji: '👁️',  activeStyle: { borderColor: '#22c55e', backgroundColor: '#dcfce7', color: '#15803d' }, defaultVal: 1 },
              { key: 'traceBlueHiddenTarget',label: 'いちぶ🙈',  emoji: '🟦🙈', activeStyle: { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff', color: '#0369a1' }, defaultVal: 0 },
              { key: 'testTarget',           label: 'ぜんぶ🙈',  emoji: '🙈',   activeStyle: { borderColor: '#a855f7', backgroundColor: '#f3e8ff', color: '#7e22ce' }, defaultVal: 1 },
            ].map(({ key, label, emoji, activeStyle, defaultVal, onlyZeroOrOne }) => (
              <div key={key} className="flex items-center gap-3 mb-2">
                <span className="w-20 text-sm font-bold text-stone-600">{emoji} {label}</span>
                <div className="flex gap-1.5">
                  {(onlyZeroOrOne ? [0, 1] : [0, 1, 2, 3, 5]).map(num => {
                    const isActive = (settings[key] ?? defaultVal) === num;
                    return (
                      <button key={num}
                        onClick={() => saveSettings({...settings, [key]: num})}
                        className="w-9 h-9 rounded-lg font-bold border-2 transition-all text-sm"
                        style={isActive ? activeStyle : { borderColor: '#d6d3d1', backgroundColor: 'white', color: '#78716c' }}
                      >
                        {num === 0 ? 'なし' : `${num}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-purple-800 flex items-center gap-1"><Sparkles className="w-4 h-4"/> コレクションの「登録ライン」</h3>
            <p className="text-xs text-purple-600 mb-1">どの書き方で仕上げた時に、一覧（コレクション）へ追加するかを決めます。</p>
            <p className="text-xs text-purple-400 mb-3">※後で変更しても、過去にかざった文字は消えません</p>
            {(() => {
              const hasBlank    = (settings.blankTarget          ?? 1) > 0;
              const hasHidden   = (settings.traceBlueHiddenTarget ?? 0) > 0;
              const hasTest     = (settings.testTarget            ?? 1) > 0;
              const lvl2ok = hasBlank || hasHidden || hasTest;
              const lvl3ok = hasHidden || hasTest;
              const disabledCls = 'border-stone-200 bg-stone-50 text-stone-300 cursor-not-allowed';
              const activeCls   = 'border-purple-500 bg-purple-400 text-white shadow-md';
              const normalCls   = 'border-stone-300 bg-white text-stone-600 hover:border-purple-300';
              return (
                <div className="flex flex-col gap-2">
                  <button onClick={() => saveSettings({...settings, completionLevel: 1})}
                    className={`px-4 py-3 rounded-lg font-bold border-2 transition-all text-left ${settings.completionLevel === 1 || !settings.completionLevel ? activeCls : normalCls}`}>
                    1： なぞり・てん・おてほん・みないで（どれでもOK）
                  </button>
                  <button onClick={() => lvl2ok && saveSettings({...settings, completionLevel: 2})}
                    disabled={!lvl2ok}
                    className={`px-4 py-3 rounded-lg font-bold border-2 transition-all text-left ${!lvl2ok ? disabledCls : settings.completionLevel === 2 ? activeCls : normalCls}`}>
                    2： おてほん・みないで（自力で書けたらOK）
                    {!lvl2ok && <span className="block text-[11px] font-normal mt-0.5 text-stone-400">※ おてほん か みないでモードを追加してください</span>}
                  </button>
                  <button onClick={() => lvl3ok && saveSettings({...settings, completionLevel: 3})}
                    disabled={!lvl3ok}
                    className={`px-4 py-3 rounded-lg font-bold border-2 transition-all text-left ${!lvl3ok ? disabledCls : settings.completionLevel === 3 ? activeCls : normalCls}`}>
                    3： みないで（見本なしで書けたらOK）
                    {!lvl3ok && <span className="block text-[11px] font-normal mt-0.5 text-stone-400">※ みないでモードを追加してください</span>}
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
            <h3 className="font-bold text-lg mb-3">各モードの枠の色設定</h3>
            <div className="space-y-6">
              {[
                { key: 'traceColor',           label: '「✏️ぜんぶ」モードのいろ',    fallback: 'bg-red-400'    },
                { key: 'traceBlueColor',       label: '「🟦いちぶ」モードのいろ',    fallback: 'bg-orange-400' },
                { key: 'tenColor',             label: '「⚫️てん」モードのいろ',      fallback: 'bg-orange-400' },
                { key: 'blankColor',           label: '「👁️おてほん」モードのいろ',  fallback: 'bg-green-400'  },
                { key: 'traceBlueHiddenColor', label: '「🟦🙈いちぶ🙈」モードのいろ', fallback: 'bg-sky-400'    },
                { key: 'testColor',            label: '「🙈ぜんぶ🙈」モードのいろ',  fallback: 'bg-purple-400' },
              ].map(({ key, label, fallback }) => (
                <div key={key}>
                  <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${COLOR_OPTIONS.find(c => c.id === settings[key])?.bg || fallback}`}></div> {label}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_OPTIONS.map(color => (
                      <button key={`${key}-${color.id}`} onClick={() => saveSettings({...settings, [key]: color.id})}
                        className={`w-full h-10 rounded-lg border-4 transition-all ${color.bg} ${settings[key] === color.id ? 'border-stone-400 scale-105 shadow-md' : 'border-transparent hover:border-stone-300'}`}></button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
            <h3 className="font-bold text-lg mb-1 text-red-800 flex items-center gap-1"><Lock className="w-4 h-4"/> データのおまもり（バックアップと復元）</h3>
            <p className="text-xs text-red-600 mb-3 leading-relaxed">これまでに集めた文字や設定をファイルに保存します。<br/>データが消えてしまった時や、別のタブレットにお引越しする時に使えます。</p>
            <div className="flex gap-4">
              <button onClick={handleExport} className="flex-1 py-3 rounded-lg font-bold bg-white border-2 border-red-300 text-red-700 hover:bg-red-100 transition-all shadow-sm">
                データをほぞんする<br/><span className="text-[10px] font-normal">（書き出し）</span>
              </button>
              <button onClick={() => fileInputRef.current.click()} className="flex-1 py-3 rounded-lg font-bold bg-red-400 border-2 border-red-500 text-white hover:bg-red-500 transition-all shadow-sm">
                データをふくげんする<br/><span className="text-[10px] font-normal">（読み込み）</span>
              </button>
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
            </div>
          </div>

          <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 shadow-sm">
            <h3 className="font-bold text-lg mb-2 text-sky-800 flex items-center gap-2">📱 タブレットを乗り換えるとき</h3>
            <div className="space-y-3 text-sm text-sky-700">
              {[
                { n: 1, text: <span>いまの端末で<strong>「データをほぞんする」</strong>を押して、ファイルをダウンロードしてね</span> },
                { n: 2, text: <span>あたらしい端末にファイルを移して、<strong>「データをふくげんする」</strong>で読み込んでね</span> },
                { n: 3, text: <span>集めた文字やれんしゅうデータが、そのままうつるよ！</span> },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-2 items-start">
                  <span className="shrink-0 font-bold bg-sky-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{n}</span>
                  <p>{text}</p>
                </div>
              ))}
              <div className="p-3 bg-white rounded-lg border border-sky-200 text-xs text-stone-500 leading-relaxed">
                ⚠️ ふくげんすると、いまのデータはすべて上書きされるよ。大事なデータは先にほぞんしてね。
              </div>
            </div>
          </div>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-lg mb-3 text-stone-700 flex items-center gap-2">📄 このアプリについて</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { name: 'Klee One / Yuji Boku', note: '（Google Fonts）', license: 'SIL Open Font License 1.1' },
                { name: 'KanjiVG', note: '© Ulrich Apel', license: 'Creative Commons Attribution-ShareAlike 3.0' },
                { name: 'React 18', note: '© Meta Platforms, Inc.', license: 'MIT License' },
                { name: 'Tailwind CSS', note: '', license: 'MIT License' },
                { name: 'Dexie.js', note: '', license: 'Apache License 2.0' },
              ].map(({ name, note, license }) => (
                <div key={name} className="bg-white rounded-lg border border-stone-200 px-3 py-2">
                  <span className="font-bold text-stone-600">{name}</span>
                  {note && <span className="ml-2 text-stone-400">{note}</span>}
                  <p className="text-stone-400 mt-0.5">{license}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
