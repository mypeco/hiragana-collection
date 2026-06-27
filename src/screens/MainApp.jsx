import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../lib/db';
import { playSharan } from '../lib/audio';
import { speakWithSettings } from '../lib/speech';
import { KANA_DATA, WORD_DATA, COLOR_OPTIONS, SEION_TABLE, DAKUON_YOUON_TABLE } from '../data/kanaData';
import { SvgStroke } from '../components/SvgStroke';
import { Sparkles, Check, GridIcon, BookOpen, X } from '../components/Icons';
import { AdminScreen } from './AdminScreen';
import { PracticeStudio } from './PracticeStudio';
import { VisualSettingScreen } from './VisualSettingScreen';
import { StarShowerOverlay } from './StarShowerOverlay';
import { WordRegisterModal } from './WordRegisterModal';

const isTargetChar = (char) => /[぀-ゟ一-龯]/.test(char);

const emitParticles = async (targetElement) => {
  const rect = targetElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  targetElement.animate([
    { transform: 'scale(1)' }, { transform: 'scale(0.8)' }, { transform: 'scale(1)' }
  ], { duration: 400, easing: 'ease-out' });
  const COUNT = 40;
  const stars = [];
  const starClipPath = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
  for (let i = 0; i < COUNT; i++) {
    const star = document.createElement('div');
    star.style.position = 'fixed';
    star.style.left = `${centerX}px`;
    star.style.top = `${centerY}px`;
    star.style.width = '12px';
    star.style.height = '12px';
    star.style.webkitClipPath = starClipPath;
    star.style.clipPath = starClipPath;
    star.style.pointerEvents = 'none';
    star.style.zIndex = '9999';
    const hue = 30 + Math.random() * 25;
    star.style.backgroundColor = `hsl(${hue}, 90%, 60%)`;
    document.body.appendChild(star);
    stars.push(star);
  }
  const animations = stars.map(star => {
    const angle = 360 * Math.random();
    const dist = 60 + Math.random() * 80;
    const size = 0.5 + Math.random() * 2;
    return star.animate([
      { transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(0px) scale(${size})`, opacity: 1 },
      { transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${dist}px) scale(${size})`, opacity: 0 }
    ], { duration: 600 + 400 * Math.random(), easing: 'ease-out', fill: 'forwards' });
  });
  await Promise.all(animations.map(a => a.finished));
  stars.forEach(star => star.remove());
};

const emitEmojiParticles = (e, emoji) => {
  if (navigator.vibrate) navigator.vibrate(30);
  const rect = e.currentTarget.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  const COUNT = 5;
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement('div');
    el.innerText = emoji;
    el.style.position = 'fixed';
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.fontSize = `${24 + Math.random() * 16}px`;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '9999';
    el.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))';
    document.body.appendChild(el);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const velocity = 80 + Math.random() * 60;
    const duration = 1000 + Math.random() * 500;
    el.animate([
      { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(angle) * velocity}px), calc(-50% + ${Math.sin(angle) * velocity}px)) scale(2.0)`, opacity: 1, offset: 0.7 },
      { transform: `translate(calc(-50% + ${Math.cos(angle) * velocity * 1.2}px), calc(-50% + ${Math.sin(angle) * velocity * 1.2}px)) scale(2.2)`, opacity: 0 }
    ], { duration, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => el.remove(), duration);
  }
};

export const MainApp = ({ currentUser, onLogout }) => {
  const [view, setView] = useState('grid');
  const [prevView, setPrevView] = useState('grid');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [bestShots, setBestShots] = useState({});
  const [settings, setSettings] = useState({
    warmupEnabled: true,
    traceColor: 'red', traceBlueColor: 'orange', tenColor: 'green', blankColor: 'emerald', traceBlueHiddenColor: 'sky', testColor: 'purple',
    newDuration: 7, partColor: true, requireGuide: true, hand: 'right', hallOfFame: [], hallOfFame2: [],
    soundEnabled: true, voiceEnabled: true,
    strokeCheckTarget: 1, traceAllTarget: 1, traceBlueTarget: 1, tenTarget: 1, blankTarget: 1, traceBlueHiddenTarget: 0, testTarget: 1,
    visualStyle: 'flat', animSpeed: 1300, strokeColor: 'mono', guideOpacity: 'soft', guideLayerOpacity: 'soft',
    showExampleCross: true, showCanvasCross: true, syncTrace: false
  });
  const [newWordAlert, setNewWordAlert] = useState(null);
  const [wordRegisterTarget, setWordRegisterTarget] = useState(null);
  const [pendingWordQueue, setPendingWordQueue] = useState([]);
  const [starCelebration, setStarCelebration] = useState(null);
  const prevTotalRef = useRef(null);
  const [readWords, setReadWords] = useState([]);
  const readWordsRef = useRef([]);
  const longPressTimerRef = useRef(null);
  const isLongPressedRef = useRef(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const saveSettingsWrapper = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await db.settings.put({ userId: currentUser.id, ...newSettings });
  }, [currentUser.id]);

  const addHallOfFame = (char) => {
    const isEmoji = !isTargetChar(char);
    if (!isEmoji && !bestShots[char]) {
      alert('まだ れんしゅうしていない もじは かざれないよ！\nさきに れんしゅうしてね 🎉');
      return;
    }
    if (navigator.vibrate) navigator.vibrate(50);
    const current = settings.hallOfFame || [];
    if (current.length < 4) {
      saveSettingsWrapper({ ...settings, hallOfFame: [...current, char] });
    } else {
      alert('かざれるのは 4枚 までだよ！');
    }
  };

  const removeHallOfFame = (indexToRemove) => {
    if (navigator.vibrate) navigator.vibrate(50);
    const current = settings.hallOfFame || [];
    saveSettingsWrapper({ ...settings, hallOfFame: current.filter((_, i) => i !== indexToRemove) });
  };

  const handleTouchStart = (char, e, onLongPressOverride) => {
    setIsScrolling(false);
    isLongPressedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      (onLongPressOverride || addHallOfFame)(char);
    }, 500);
  };

  const handleTouchMove = () => {
    setIsScrolling(true);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = (kanjiItem, e) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressedRef.current && !isScrolling && kanjiItem) {
      speakWithSettings(kanjiItem.char, settings);
      setSelectedKanji(kanjiItem);
      setView('practice');
    }
  };

  useEffect(() => {
    const load = async () => {
      const savedSettings = await db.settings.get(currentUser.id);
      if (savedSettings) setSettings(prev => ({ ...prev, ...savedSettings }));
      const shots = await db.bestShots.where('userId').equals(currentUser.id).toArray();
      if (shots.length > 0) {
        const map = {};
        shots.forEach(s => map[s.char] = s);
        setBestShots(map);
        prevTotalRef.current = shots.length;
        const reads = await db.readWords.where('userId').equals(currentUser.id).toArray();
        const readIds = reads.map(r => r.wordId);
        setReadWords(readIds);
        readWordsRef.current = readIds;
      }
    };
    load();
  }, [currentUser]);

  const getUnlockedWords = (shotsMap) => {
    return WORD_DATA.filter(w => {
      const charsOnly = w.word.split('').filter(isTargetChar);
      return charsOnly.length > 0 && charsOnly.every(char => shotsMap[char]);
    });
  };

  const saveBestShot = async (char, practiceObj) => {
    const nextShots = { ...bestShots, [char]: practiceObj };
    await db.bestShots.put({ userId: currentUser.id, char, ...practiceObj });
    setBestShots(nextShots);
    await db.practices.where({ userId: currentUser.id, char }).delete();
  };

  const handleWordRegistered = async (wordId) => {
    await db.readWords.put({ userId: currentUser.id, wordId });
    setReadWords(prev => {
      const next = [...prev, wordId];
      readWordsRef.current = next;
      return next;
    });
    setWordRegisterTarget(null);
    if (pendingWordQueue.length > 1) {
      const remaining = pendingWordQueue.slice(1);
      setPendingWordQueue(remaining);
      setTimeout(() => setWordRegisterTarget(remaining[0]), 350);
    } else {
      setPendingWordQueue([]);
    }
  };

  const handleSaveComplete = (char, practiceType) => {
    if (activeTab === 'words') setActiveTab('hiragana');
    setView('grid');

    const isNewChar = !bestShots[char];
    const newTotal = Object.keys(bestShots).length + (isNewChar ? 1 : 0);
    if (prevTotalRef.current === null) prevTotalRef.current = newTotal - 1;
    prevTotalRef.current = newTotal;

    const updatedShots = { ...bestShots, [char]: { ...(bestShots[char] || {}), type: practiceType } };
    const traceHex = COLOR_OPTIONS.find(c => c.id === (settings.traceColor || 'sky'))?.hex  || '#38bdf8';
    const blankHex = COLOR_OPTIONS.find(c => c.id === (settings.blankColor || 'green'))?.hex || '#4ade80';
    const testHex  = COLOR_OPTIONS.find(c => c.id === (settings.testColor  || 'purple'))?.hex || '#c084fc';
    const makeColorPalette = (shots) => {
      const tc = Object.values(shots).filter(s => s.type === 'traceAll' || s.type === 'trace').length;
      const bc = Object.values(shots).filter(s => s.type === 'blank').length;
      const sc = Object.values(shots).filter(s => s.type === 'test').length;
      return [{ hex: traceHex, count: tc }, { hex: blankHex, count: bc }, { hex: testHex, count: sc }];
    };

    // 全部コレクション達成（特別パーティクル）
    if (newTotal >= KANA_DATA.length) {
      if (navigator.vibrate) navigator.vibrate([60, 50, 80, 50, 120, 50, 200]);
      setTimeout(() => setStarCelebration({ milestone: KANA_DATA.length, isFinal: true, starColorPalette: makeColorPalette(updatedShots) }), 700);
      const newSettings = { ...settings, todayGoalFired: true };
      setSettings(newSettings);
      db.settings.put({ userId: currentUser.id, ...newSettings });
      return;
    }

    // きょうのもくひょう達成チェック（新しい文字のときだけ）
    if (isNewChar) {
      const today = new Date().toLocaleDateString('ja-JP');
      const isToday = settings.todayDate === today;
      const prevCount = isToday ? (settings.todayCount ?? 0) : 0;
      const newCount = prevCount + 1;
      const dailyGoal = settings.dailyGoal ?? 5;
      const alreadyFired = isToday && (settings.todayGoalFired ?? false);

      const newSettings = { ...settings, todayCount: newCount, todayDate: today, todayGoalFired: alreadyFired || newCount >= dailyGoal };
      setSettings(newSettings);
      db.settings.put({ userId: currentUser.id, ...newSettings });

      if (!alreadyFired && newCount >= dailyGoal) {
        if (navigator.vibrate) navigator.vibrate([60, 50, 80, 50, 120, 50, 200]);
        setTimeout(() => setStarCelebration({ milestone: dailyGoal, isFinal: false, starColorPalette: makeColorPalette(updatedShots) }), 700);
        return;
      }
    }

    const wordAlertDelay = hitMilestone ? 4800 : 300;
    setTimeout(() => {
      setBestShots(currentShots => {
        const newlyUnlocked = WORD_DATA.filter(w => {
          if (readWordsRef.current.includes(w.id)) return false;
          const charsOnly = w.word.split('').filter(c => isTargetChar(c));
          if (charsOnly.length === 0) return false;
          const wasUnlocked = charsOnly.filter(c => c !== char).every(c => currentShots[c]);
          const isNowUnlocked = charsOnly.every(c => currentShots[c]);
          return wasUnlocked && isNowUnlocked;
        });
        if (newlyUnlocked.length > 0) setNewWordAlert(newlyUnlocked);
        return currentShots;
      });
    }, wordAlertDelay);

    setTimeout(() => {
      let targetId = `kanji-item-${char}`;
      if (activeTab === 'home') targetId = `col-new-${char}`;
      const el = document.getElementById(targetId);
      if (el) {
        const duration = 800;
        const targetY = el.getBoundingClientRect().top + window.scrollY - (window.innerHeight / 2) + (el.offsetHeight / 2);
        const startY = window.scrollY;
        const diff = targetY - startY;
        let startTime = null;
        const easeOut = (t) => 1 - (--t) * t * t * t;
        const step = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progress = timestamp - startTime;
          const percent = Math.min(progress / duration, 1);
          window.scrollTo(0, startY + diff * easeOut(percent));
          if (progress < duration) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        document.querySelectorAll('.highlight-saved').forEach(node => {
          node.classList.remove('ring-4', 'ring-amber-400', 'bg-amber-50', 'shadow-xl', 'highlight-saved');
        });
        el.classList.add('ring-4', 'ring-amber-400', 'bg-amber-50', 'shadow-xl', 'highlight-saved');
        setTimeout(() => {
          emitParticles(el);
          if (settings.soundEnabled !== false) playSharan();
        }, duration);
      }
    }, 150);
  };

  const handleWordClick = async (wordObj, e) => {
    speakWithSettings(wordObj.word, settings);
    if (!readWords.includes(wordObj.id)) {
      setWordRegisterTarget({ ...wordObj, pendingShots: bestShots });
    } else {
      emitEmojiParticles(e, wordObj.icon);
    }
  };

  const totalCollected = Object.keys(bestShots).length;
  const durationMs = (settings.newDuration || 7) * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const replayStarCelebration = () => {
    if (totalCollected < KANA_DATA.length) return;
    const traceHex = COLOR_OPTIONS.find(c => c.id === (settings.traceColor || 'sky'))?.hex  || '#38bdf8';
    const blankHex = COLOR_OPTIONS.find(c => c.id === (settings.blankColor || 'green'))?.hex || '#4ade80';
    const testHex  = COLOR_OPTIONS.find(c => c.id === (settings.testColor  || 'purple'))?.hex || '#c084fc';
    const traceCount = Object.values(bestShots).filter(s => s.type === 'traceAll' || s.type === 'trace').length;
    const blankCount = Object.values(bestShots).filter(s => s.type === 'blank').length;
    const testCount  = Object.values(bestShots).filter(s => s.type === 'test').length;
    setStarCelebration({ milestone: KANA_DATA.length, isFinal: true,
      starColorPalette: [
        { hex: traceHex, count: traceCount },
        { hex: blankHex, count: blankCount },
        { hex: testHex,  count: testCount  },
      ]
    });
  };

  const sortedWords = useMemo(() => {
    return [...WORD_DATA].map((wordObj, index) => {
      const charsOnly = wordObj.word.split('').filter(isTargetChar);
      const isUnlocked = charsOnly.length > 0 && charsOnly.every(char => bestShots[char]);
      let isNew = false;
      let latestTimestamp = 0;
      if (isUnlocked) {
        latestTimestamp = Math.max(...charsOnly.map(char => bestShots[char].timestamp));
        if (now - latestTimestamp < durationMs) isNew = true;
      }
      return { ...wordObj, isUnlocked, isNew, originalIndex: index, latestTimestamp };
    }).sort((a, b) => {
      const getScore = (item) => {
        if (item.isUnlocked && item.isNew) return 3;
        if (item.isUnlocked && !item.isNew) return 2;
        return 1;
      };
      const scoreDiff = getScore(b) - getScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.isUnlocked && b.isUnlocked) return b.latestTimestamp - a.latestTimestamp;
      return a.originalIndex - b.originalIndex;
    });
  }, [bestShots, durationMs, now]);

  const newKanjis = useMemo(() => {
    const currentTime = Date.now();
    const news = [];
    KANA_DATA.forEach(kanji => {
      const shot = bestShots[kanji.char];
      if (shot) {
        const isNew = shot.timestamp && (currentTime - shot.timestamp < durationMs);
        if (isNew) news.push({ ...kanji, shot });
      }
    });
    news.sort((a, b) => b.shot.timestamp - a.shot.timestamp);
    return news;
  }, [bestShots, durationMs]);

  const getKanaThemeColor = (shotType) => {
    if (shotType === 'traceAll' || shotType === 'trace') return COLOR_OPTIONS.find(c => c.id === settings.traceColor)?.class || COLOR_OPTIONS[0].class;
    if (shotType === 'ten' || shotType === 'hint') return COLOR_OPTIONS.find(c => c.id === settings.tenColor)?.class || COLOR_OPTIONS[1].class;
    if (shotType === 'blank') return COLOR_OPTIONS.find(c => c.id === settings.blankColor)?.class || COLOR_OPTIONS[2].class;
    return COLOR_OPTIONS.find(c => c.id === settings.testColor)?.class || COLOR_OPTIONS[3].class;
  };

  const renderKanaTable = (tableData, onLongPress, selectedList) => {
    const longPressCallback = onLongPress || null;
    const selected = selectedList !== undefined ? selectedList : (settings.hallOfFame || []);
    return (
      <div className="overflow-x-auto pb-4 pt-3 w-full flex justify-center">
        <div className="flex flex-row-reverse justify-end gap-1.5 sm:gap-2 min-w-max px-2">
          {tableData.map((col, colIdx) => (
            <div key={`col-${colIdx}`} className="flex flex-col gap-1.5 sm:gap-2">
              {col.map((char, rowIdx) => {
                if (char === null) {
                  return <div key={`empty-${colIdx}-${rowIdx}`} className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16"></div>;
                }
                const kanjiData = KANA_DATA.find(k => k.char === char);
                if (!kanjiData) {
                  const isEmoji = !isTargetChar(char);
                  if (isEmoji) {
                    const isSelectedEmoji = selected.includes(char);
                    return (
                      <div key={`emoji-${char}-${colIdx}`}
                        onClick={() => (longPressCallback || addHallOfFame)(char)}
                        onContextMenu={e => e.preventDefault()}
                        className={`relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg cursor-pointer hover:scale-110 shadow-sm flex items-center justify-center transition-all select-none bg-amber-50 border-2 ${isSelectedEmoji ? 'border-amber-400 ring-2 ring-amber-400 ring-offset-1' : 'border-amber-100 hover:border-amber-300'}`}>
                        <span className="text-2xl md:text-3xl pointer-events-none">{char}</span>
                        {isSelectedEmoji && <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-md z-20 pointer-events-none"><Check className="w-2 h-2"/></div>}
                      </div>
                    );
                  }
                  return (
                    <div key={`und-${char}`} className="w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 border-2 border-dashed border-stone-200 bg-stone-50/50 rounded-lg flex items-center justify-center text-stone-300 font-kyokasho opacity-60">
                      <span className="text-lg md:text-2xl">{char}</span>
                    </div>
                  );
                }
                const shot = bestShots[char];
                const isNewKanji = shot?.timestamp && (Date.now() - shot.timestamp < durationMs);
                const isSelected = selected.includes(char);
                let colorClass = 'border-2 border-dashed border-stone-300 bg-[#f4f1eb] text-stone-400';
                let displayContent;
                let bgLightHex = null;
                if (shot) {
                  const themeColor = getKanaThemeColor(shot.type);
                  const isTen = (shot.type === 'ten' || shot.type === 'hint');
                  bgLightHex = isTen ? (COLOR_OPTIONS.find(c => c.id === settings.tenColor)?.bgLight || '#fffbf3') : null;
                  colorClass = `${themeColor} border-2 shadow-sm`;
                  if (isSelected) colorClass += ' ring-2 ring-amber-400 ring-offset-1';
                  displayContent = (
                    <div className="w-full h-full overflow-hidden rounded p-0.5 pointer-events-none relative">
                      <SvgStroke strokes={shot.strokes} strokeWidth={8} color="#4B5563" />
                    </div>
                  );
                } else {
                  displayContent = <span className="text-xl md:text-2xl font-kyokasho pointer-events-none">{char}</span>;
                }
                return (
                  <div key={`table-${char}`} id={`kanji-item-${char}`}
                    onPointerDown={e => handleTouchStart(char, e, longPressCallback)}
                    onPointerMove={handleTouchMove}
                    onPointerUp={e => handleTouchEnd(kanjiData, e)}
                    onPointerLeave={e => handleTouchEnd(kanjiData, e)}
                    onContextMenu={e => e.preventDefault()}
                    className={`relative w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg cursor-pointer hover:scale-110 shadow-sm flex items-center justify-center transition-all select-none ${colorClass}`}
                    style={bgLightHex ? { backgroundColor: bgLightHex } : undefined}
                  >
                    {isNewKanji && <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-br z-20 shadow-sm pointer-events-none">NEW</div>}
                    {isSelected && <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 shadow-md z-20 pointer-events-none"><Check className="w-2 h-2"/></div>}
                    {displayContent}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (view === 'admin') return <AdminScreen onBack={() => setView(prevView || 'grid')} settings={settings} saveSettings={saveSettingsWrapper} />;
  if (view === 'visualSetting') return <VisualSettingScreen settings={settings} saveSettings={saveSettingsWrapper} onBack={() => setView(prevView || 'grid')} />;
  if (view === 'practice') return (
    <PracticeStudio currentUser={currentUser} targetKanji={selectedKanji} settings={settings}
      onBack={() => setView('grid')} onSaveBest={saveBestShot} onSaveComplete={handleSaveComplete}
      onOpenAdmin={() => { setPrevView('practice'); setView('admin'); }}
      onToggleSound={() => saveSettingsWrapper({ ...settings, soundEnabled: !(settings.soundEnabled !== false) })}
      onToggleVoice={() => saveSettingsWrapper({ ...settings, voiceEnabled: !(settings.voiceEnabled !== false) })}
      onSaveSettings={saveSettingsWrapper}
    />
  );

  const unlockedWords = getUnlockedWords(bestShots);
  const unreadCount = unlockedWords.filter(w => !readWords.includes(w.id)).length;

  return (
    <div className="p-4 max-w-4xl mx-auto min-h-screen relative pt-20 animate-fade-in">

      {starCelebration && (
        <StarShowerOverlay milestone={starCelebration.milestone} isFinal={starCelebration.isFinal}
          starColorPalette={starCelebration.starColorPalette} onDismiss={() => setStarCelebration(null)} />
      )}

      {wordRegisterTarget && (
        <WordRegisterModal wordObj={wordRegisterTarget} bestShots={wordRegisterTarget.pendingShots || bestShots}
          onComplete={() => handleWordRegistered(wordRegisterTarget.id)} settings={settings} />
      )}

      <div className="absolute top-4 left-0 w-full px-4 flex justify-between items-center gap-2 z-40">
        <div className="flex gap-2 shrink-0">
          <button onClick={onLogout} title="だれがあそぶ？"
            className={`shrink-0 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-sm border-2 ${currentUser.color.class} ${currentUser.color.border} active:scale-95 transition-transform font-bold text-xl sm:text-2xl`}>
            {currentUser.icon}
          </button>
          <button onClick={() => setView('admin')} title="せってい"
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-white shadow-sm rounded-lg font-bold border-2 border-[#e8e4db] hover:bg-stone-50 active:scale-95 transition-transform">
            <span className="text-lg sm:text-xl leading-none">⚙️</span>
          </button>
        </div>

        <div className="flex justify-center flex-1 min-w-0">
          <div className="relative flex bg-white border-2 border-[#e8e4db] p-1 rounded-full shadow-sm overflow-hidden">
            <div className={`absolute top-1 bottom-1 w-16 sm:w-24 rounded-full transition-all duration-500 ease-[cubic-bezier(0.165,0.84,0.44,1)] shadow-sm z-0 bg-[#ece8df]
              ${activeTab === 'home'     ? 'translate-x-0 opacity-100' : ''}
              ${activeTab === 'hiragana' ? 'translate-x-full opacity-100' : ''}
              ${activeTab === 'words'    ? 'translate-x-[200%] opacity-100' : ''}
            `}></div>
            <button onClick={() => { setActiveTab('home'); window.scrollTo(0, 0); }}
              className={`relative flex-shrink-0 flex items-center justify-center gap-1 w-16 sm:w-24 py-1.5 rounded-full font-bold text-[11px] sm:text-sm transition-colors duration-300 z-10 ${activeTab === 'home' ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
              <span className="text-xs sm:text-sm">🏠</span><span className="whitespace-nowrap">ホーム</span>
            </button>
            <button onClick={() => { setActiveTab('hiragana'); window.scrollTo(0, 0); }}
              className={`relative flex-shrink-0 flex items-center justify-center gap-1 w-16 sm:w-24 py-1.5 rounded-full font-bold text-[11px] sm:text-sm transition-colors duration-300 z-10 ${activeTab === 'hiragana' ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
              <GridIcon className="w-3.5 h-3.5 shrink-0"/> <span className="whitespace-nowrap">ひらがな</span>
            </button>
            <button onClick={() => { setActiveTab('words'); window.scrollTo(0, 0); }}
              className={`relative flex-shrink-0 flex items-center justify-center gap-1 w-16 sm:w-24 py-1.5 rounded-full font-bold text-[11px] sm:text-sm transition-colors duration-300 z-10 ${activeTab === 'words' ? 'text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
              <BookOpen className="w-3.5 h-3.5 shrink-0"/> <span className="whitespace-nowrap">ことばずかん</span>
              {unreadCount > 0 && <span className="absolute top-0 right-0.5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm">{unreadCount}</span>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => saveSettingsWrapper({ ...settings, soundEnabled: !(settings.soundEnabled !== false) })}
            className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-sm border-2 border-stone-200 bg-white active:scale-95 transition-transform text-xl">
            {settings.soundEnabled !== false ? '🔔' : '🔕'}
          </button>
          <button onClick={() => saveSettingsWrapper({ ...settings, voiceEnabled: !(settings.voiceEnabled !== false) })}
            className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full shadow-sm border-2 border-stone-200 bg-white active:scale-95 transition-transform text-xl">
            {settings.voiceEnabled !== false ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {newWordAlert && newWordAlert.length > 0 && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4">
          <div className="w-full max-w-sm animate-bounce-in">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-300 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📖</span>
                <p className="text-amber-800 font-bold text-sm leading-snug font-kyokasho">あたらしい ことばが みつかったよ！</p>
              </div>
              {newWordAlert.length > 1 && (
                <div className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                  {newWordAlert.length}こ の あたらしいことば ✨
                </div>
              )}
              <div className="flex gap-3 w-full">
                <button onClick={() => {
                  const queue = newWordAlert.map(w => ({ ...w, pendingShots: bestShots }));
                  setNewWordAlert(null);
                  setActiveTab('words');
                  window.scrollTo(0, 0);
                  setPendingWordQueue(queue);
                  setWordRegisterTarget(queue[0]);
                }} className="flex-1 py-2.5 rounded-full font-bold text-white bg-amber-400 border-2 border-amber-500 shadow-md active:scale-95 transition-transform text-sm">
                  📖 みてみる
                </button>
                <button onClick={() => setNewWordAlert(null)}
                  className="flex-1 py-2.5 rounded-full font-bold text-stone-500 bg-white border-2 border-stone-200 shadow-sm active:scale-95 transition-transform text-sm">
                  とじる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="flex flex-col gap-8 pb-12 w-full animate-fade-in">
          <div className="flex justify-center w-full mt-2 mb-4">
            <div className="relative inline-block mt-6">
              <span className="absolute -top-7 -left-3 text-2xl animate-bounce" style={{ animationDuration: '2.2s' }}>⭐</span>
              <span className="absolute -top-5 -right-5 text-xl animate-bounce" style={{ animationDuration: '1.8s', animationDelay: '0.5s' }}>✨</span>
              <span className="absolute bottom-2 -right-3 text-lg animate-bounce" style={{ animationDuration: '2.6s', animationDelay: '1s' }}>🌟</span>
              <h2 className="text-5xl md:text-7xl text-stone-800 font-bold tracking-widest drop-shadow-md relative z-10"
                style={{ fontFamily: "'Yuji Boku', serif" }}>ひらがなコレクション</h2>
              <svg className="absolute -bottom-2 md:-bottom-6 -left-[5%] w-[110%] h-12 md:h-20 text-amber-500 z-0 pointer-events-none"
                viewBox="0 0 100 40" preserveAspectRatio="none">
                <path d="M2,25 C20,22 50,24 95,20 C98,19 100,22 95,25 C50,30 20,28 0,32 C-2,33 0,26 2,25 Z" fill="currentColor" opacity="0.3" />
                <path d="M10,30 C30,28 60,30 85,26 C87,25 86,28 80,29 C50,34 30,32 8,36 C6,37 8,31 10,30 Z" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
          </div>

          {(() => {
            const isFinal = totalCollected >= KANA_DATA.length;
            const today = new Date().toLocaleDateString('ja-JP');
            const isToday = settings.todayDate === today;
            const todayCount = isToday ? (settings.todayCount ?? 0) : 0;
            const dailyGoal = settings.dailyGoal ?? 5;
            const goalReached = isToday && (settings.todayGoalFired ?? false);
            const remaining = Math.max(dailyGoal - todayCount, 0);
            return (
              <div className={`w-full max-w-xs mx-auto rounded-2xl px-5 py-4 border-2 shadow-sm transition-all text-center
                ${isFinal
                  ? 'bg-gradient-to-b from-amber-50 to-yellow-50 border-amber-300 cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 animate-unlock-glow'
                  : goalReached
                    ? 'bg-gradient-to-b from-yellow-50 to-amber-50 border-yellow-300'
                    : 'bg-white border-amber-100'}`}
                onClick={isFinal ? replayStarCelebration : undefined}>
                {isFinal ? (
                  <>
                    <div className="text-2xl mb-1">🎊</div>
                    <div className="text-sm font-bold text-amber-600 font-kyokasho">ぜんぶ あつめたよ！</div>
                    <div className="mt-2 text-[11px] font-bold text-amber-500 animate-pulse">
                      ⭐ タップして ほしを ふらせよう！ ⭐
                    </div>
                  </>
                ) : goalReached ? (
                  <>
                    <div className="text-xl mb-1">🌟</div>
                    <div className="text-sm font-bold text-yellow-700 font-kyokasho">きょうのもくひょう たっせい！</div>
                    <div className="text-[10px] text-stone-400 mt-2">{totalCollected} / {KANA_DATA.length}こ あつめた</div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] font-bold text-amber-400 mb-1">⭐ きょうのながれぼしまで</div>
                    <div className="text-4xl font-bold text-amber-500 font-kyokasho leading-none">
                      あと <span className="text-5xl text-orange-500">{remaining}</span> こ
                    </div>
                    <div className="flex justify-center gap-1 mt-2">
                      {[...Array(dailyGoal)].map((_, i) => (
                        <span key={i} className={`text-sm transition-all ${i < todayCount ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
                      ))}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1">{totalCollected} / {KANA_DATA.length}こ あつめた</div>
                  </>
                )}
              </div>
            );
          })()}

          <div className="w-full flex justify-center gap-3 md:gap-5 flex-wrap">
            {[
              { border: '#FF6B6B', bg: '#fff', deco: ['◆','◆'], label: '🌟', rotate: '-rotate-2' },
              { border: '#FFD93D', bg: '#fff', deco: ['★','★'], label: '⭐', rotate: 'rotate-1' },
              { border: '#6BCB77', bg: '#fff', deco: ['●','●'], label: '🍀', rotate: '-rotate-1' },
              { border: '#4D96FF', bg: '#fff', deco: ['▲','▲'], label: '💙', rotate: 'rotate-2' },
            ].map((theme, index) => {
              const char = settings.hallOfFame?.[index];
              const shot = char ? bestShots[char] : null;
              const isEmoji = char && !isTargetChar(char);
              const hasContent = isEmoji || !!shot;
              return (
                <div key={`frame-${index}`} className="flex flex-col items-center gap-2">
                  <div className={`w-24 h-24 md:w-32 md:h-32 relative cursor-pointer transition-all duration-300 hover:scale-110 hover:-translate-y-2 ${theme.rotate}`}
                    style={{ background: theme.bg, border: `5px solid ${theme.border}`, borderRadius: 16, boxShadow: `4px 4px 0px ${theme.border}` }}>
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-1.5 py-0.5 rounded-t-[10px]"
                      style={{ background: theme.border, height: 20 }}>
                      <span className="text-white text-[9px] font-black">{theme.deco[0]}</span>
                      <span className="text-white text-[8px] font-bold opacity-80">{index + 1}</span>
                      <span className="text-white text-[9px] font-black">{theme.deco[1]}</span>
                    </div>
                    <div className="w-full h-full flex items-center justify-center" style={{ paddingTop: 20, paddingBottom: 4, paddingLeft: 4, paddingRight: 4 }}>
                      {hasContent ? (
                        isEmoji
                          ? <span className="text-5xl md:text-6xl leading-none">{char}</span>
                          : <div className="w-full h-full relative"><SvgStroke strokes={shot.strokes} strokeWidth={12} color="#1F2937" /></div>
                      ) : (
                        <div className="flex flex-col items-center gap-1 select-none opacity-30">
                          <span className="text-2xl">{theme.label}</span>
                          <span className="text-[9px] font-bold font-kyokasho">あき</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalCollected === 0 && (
            <div className="text-center py-6 animate-fade-in">
              <div className="text-5xl mb-3 animate-bounce">✏️</div>
              <p className="text-stone-600 font-bold text-base font-kyokasho leading-loose">「ひらがな」タブから<br/>れんしゅうしてみよう！</p>
              <p className="text-stone-400 text-sm mt-2">かけた もじが ここに あつまるよ ✨</p>
            </div>
          )}

          {newKanjis.length > 0 && (
            <div className="rounded-3xl border-4 border-amber-400 shadow-xl relative overflow-visible mt-4 max-w-4xl mx-auto w-full"
              style={{ background: 'linear-gradient(135deg, #fef3c7, #ffedd5, #fef9ee)', boxShadow: '0 4px 24px rgba(251,191,36,0.3), 0 0 0 2px #fde68a' }}>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-sm font-black px-6 py-2 rounded-full shadow-lg z-10 flex items-center gap-2"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316, #ef4444)', letterSpacing: '0.05em' }}>
                <span className="animate-bounce inline-block" style={{ animationDuration: '1.2s' }}>✨</span>
                さいきん かけた もじ
                <span className="animate-bounce inline-block" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }}>✨</span>
              </div>
              <div className="pt-7 pb-4 px-4">
                <div className="text-center mb-3">
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
                    📅 さいきん {settings.newDuration || 7}にち かけたもじ
                  </span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 md:gap-2.5">
                  {newKanjis.map(item => {
                    const themeColor = getKanaThemeColor(item.shot.type);
                    const isTen = (item.shot.type === 'ten' || item.shot.type === 'hint');
                    const bgLightHex = isTen ? (COLOR_OPTIONS.find(c => c.id === settings.tenColor)?.bgLight || '#fffbf3') : null;
                    return (
                      <div key={`col-new-${item.char}`} id={`col-new-${item.char}`}
                        onClick={() => { setSelectedKanji(item); setView('practice'); }}
                        className={`relative aspect-square rounded-xl cursor-pointer hover:scale-115 hover:-translate-y-1 shadow-md flex items-center justify-center transition-all border-2 ${themeColor}`}
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)', ...(bgLightHex ? { backgroundColor: bgLightHex } : { backgroundColor: 'white' }) }}>
                        <div className="w-full h-full overflow-hidden rounded-lg p-0.5 pointer-events-none relative">
                          <SvgStroke strokes={item.shot.strokes} strokeWidth={8} color="#1F2937" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'hiragana' && (
        <div className="flex flex-col gap-6 pb-12 w-full animate-fade-in">
<div className="rounded-2xl p-4 border-2 border-amber-100 shadow-sm sticky top-20 z-30 backdrop-blur-sm"
            style={{ background: 'linear-gradient(135deg, #fffbeb, #fff7ed)' }}>
            <h3 className="text-center text-amber-600 font-bold text-xs mb-3 flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3"/> ギャラリーにかざる 4まい <Sparkles className="w-3 h-3"/>
            </h3>
            <div className="flex justify-center gap-2 md:gap-3">
              {[
                { bg: '#fff0f6', border: '#ffb8d9', star: '🌸' },
                { bg: '#fffbe6', border: '#ffd666', star: '⭐' },
                { bg: '#f0fff4', border: '#87e8a1', star: '🍀' },
                { bg: '#f3f0ff', border: '#c3afe8', star: '🌟' },
              ].map((theme, index) => {
                const char = settings.hallOfFame?.[index];
                const shot = char ? bestShots[char] : null;
                const isEmoji = char && !isTargetChar(char);
                const hasContent = isEmoji || !!shot;
                return (
                  <div key={`tray-${index}`}
                    className="w-14 h-14 md:w-20 md:h-20 rounded-xl flex items-center justify-center relative shrink-0 transition-transform hover:scale-105"
                    style={{ background: theme.bg, border: `3px solid ${theme.border}` }}>
                    {hasContent ? (
                      <>
                        {isEmoji
                          ? <span className="text-3xl md:text-4xl">{char}</span>
                          : <div className="w-full h-full relative p-1"><SvgStroke strokes={shot.strokes} strokeWidth={12} color="#1F2937" /></div>
                        }
                        <button onClick={() => removeHallOfFame(index)}
                          className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-md hover:scale-110 active:scale-95 z-40 border-2"
                          style={{ borderColor: theme.border }}>
                          <X className="w-3 h-3 md:w-4 md:h-4" style={{ color: theme.border }}/>
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center opacity-40">
                        <span className="text-xl">{theme.star}</span>
                        <span className="text-[8px] font-bold font-kyokasho mt-0.5">あき</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[10px] text-stone-400 mt-3 font-bold flex items-center justify-center gap-1">
              したの ひょうから
              <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[10px]">ながおし</span>
              してね！
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border-2 border-sky-100 w-full">
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-2xl">🌸</span>
              <h3 className="font-bold text-sky-600 text-center tracking-widest text-lg">あいうえお</h3>
              <span className="text-2xl">🌸</span>
            </div>
            {renderKanaTable(SEION_TABLE)}
          </div>

          <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border-2 border-purple-100 w-full">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">⚡</span>
              <h3 className="font-bold text-purple-600 text-center tracking-widest text-lg">てんてん・まる・ちいさいもじ</h3>
              <span className="text-2xl">⚡</span>
            </div>
            <p className="text-center text-[10px] text-stone-400 mb-4 font-bold flex items-center justify-center gap-1">
              ひらがなは <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">ながおし</span>、
              えもじは <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">タップ</span>
              で ギャラリーに かざれるよ！
            </p>
            {renderKanaTable(DAKUON_YOUON_TABLE, addHallOfFame, settings.hallOfFame || [])}
          </div>
        </div>
      )}

      {activeTab === 'words' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-12">
          {sortedWords.length === 0 && (
            <div className="col-span-2 sm:col-span-3 text-center py-10">
              <div className="text-4xl mb-2">🔍</div>
              <div className="text-stone-400 font-bold">みつかりませんでした</div>
            </div>
          )}
          {sortedWords.map(wordObj => {
            const isUnread = wordObj.isUnlocked && !readWords.includes(wordObj.id);
            if (wordObj.isUnlocked) {
              return (
                <div key={wordObj.id} onClick={e => handleWordClick(wordObj, e)}
                  className={`relative rounded-2xl text-center cursor-pointer hover:scale-105 hover:-translate-y-1 transition-all overflow-hidden group border-2
                    ${isUnread
                      ? 'bg-gradient-to-b from-amber-50 to-white border-amber-400 shadow-lg animate-unlock-glow'
                      : 'bg-white border-amber-200 shadow-sm'}`}>
                  <div className={`w-full h-2.5 ${isUnread ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400' : 'bg-gradient-to-r from-amber-300 to-orange-300'}`}/>
                  {wordObj.isNew && !isUnread && (
                    <div className="absolute top-2.5 left-0 text-white text-[9px] font-bold px-2 py-0.5 rounded-r-full shadow-sm z-20"
                      style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}>NEW✨</div>
                  )}
                  {isUnread && <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm z-20" />}
                  <div className="p-3 pt-2">
                    <div className={`text-4xl mt-1 transition-transform ${isUnread ? 'animate-bounce' : 'group-hover:scale-110'}`}
                      style={isUnread ? { animationDuration: '1.8s' } : {}}>
                      {wordObj.icon}
                    </div>
                    <div className="text-2xl font-kyokasho text-stone-800 tracking-widest mt-2 leading-snug">{wordObj.word}</div>
                    {isUnread ? (
                      <div className="mt-2.5 mb-1">
                        <div className="inline-flex items-center gap-1 bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md animate-pulse">
                          🔓 タップして とうろく！
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-1 mt-2.5 flex-wrap">
                        {wordObj.word.split('').map((char, i) => {
                          if (!isTargetChar(char)) return (
                            <div key={i} className="w-7 h-7 rounded-lg border border-stone-200 flex items-center justify-center text-stone-500 bg-stone-50 text-xs font-kyokasho shrink-0">{char}</div>
                          );
                          return (
                            <div key={i}
                              onClick={e => { e.stopPropagation(); speakWithSettings(char, settings, { rate: 0.8, pitch: 1.2 }); }}
                              className="w-7 h-7 rounded-lg border-2 border-amber-200 bg-amber-50 overflow-hidden shrink-0 cursor-pointer hover:border-amber-400 hover:scale-110 transition-transform active:scale-95 relative">
                              <SvgStroke strokes={bestShots[char].strokes} strokeWidth={8} color="#92400e"/>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            } else {
              const charsNeeded = wordObj.word.split('').filter(c => isTargetChar(c) && !bestShots[c]);
              return (
                <div key={wordObj.id} className="relative bg-stone-50 rounded-2xl text-center overflow-hidden border-2 border-dashed border-stone-200">
                  <div className="w-full h-2.5 bg-stone-200"/>
                  <div className="p-3 pt-2">
                    <div className="text-3xl opacity-20 mt-1">🔒</div>
                    <div className="text-2xl font-kyokasho text-stone-300 tracking-widest mt-2">{wordObj.word.replace(/[぀-ゟ一-龯]/g, '？')}</div>
                    {charsNeeded.length > 0 && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-2 py-1.5 inline-block">
                        <span className="text-[10px] font-bold text-amber-600">
                          あと <span className="text-sm text-amber-700">{charsNeeded.length}</span> もじ！
                        </span>
                      </div>
                    )}
                    <div className="flex justify-center gap-1 mt-2 flex-wrap">
                      {wordObj.word.split('').map((char, i) => {
                        if (!isTargetChar(char)) return (
                          <div key={i} className="w-7 h-7 rounded-lg border border-transparent flex items-center justify-center text-stone-300 text-xs font-kyokasho shrink-0">{char}</div>
                        );
                        return bestShots[char] ? (
                          <div key={i} className="w-7 h-7 rounded-lg border-2 border-amber-200 bg-amber-50 overflow-hidden shrink-0 pointer-events-none relative">
                            <SvgStroke strokes={bestShots[char].strokes} strokeWidth={8} color="#92400e"/>
                          </div>
                        ) : (
                          <div key={i}
                            onClick={e => {
                              e.stopPropagation();
                              const targetK = KANA_DATA.find(k => k.char === char);
                              if (targetK) { speakWithSettings(char, settings); setSelectedKanji(targetK); setView('practice'); }
                            }}
                            className="w-7 h-7 rounded-lg border-2 border-dashed border-amber-300 flex items-center justify-center bg-amber-50 text-amber-500 text-sm font-kyokasho shrink-0 cursor-pointer hover:bg-amber-100 hover:scale-110 transition-transform shadow-sm">
                            {char}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};
