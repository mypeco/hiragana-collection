import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/db';
import { getAudioContext } from '../lib/audio';
import { speakWithSettings } from '../lib/speech';
import { fetchKanaVGPaths } from '../lib/kanaVG';
import { COLOR_OPTIONS, PART_COLORS, PASTEL_COLORS } from '../data/kanaData';
import { AnimatedKana } from '../components/AnimatedKana';
import { KanaPath } from '../components/KanaPath';
import { SvgStroke } from '../components/SvgStroke';
import { ShotDisplay } from '../components/ShotDisplay';
import { MasuBg } from '../components/MasuBg';
import { SettingsSidebar } from '../components/SettingsSidebar';
import { StrokeOrderModal } from './StrokeOrderModal';
import { PinModal } from './PinModal';
import { Play, Loader, Lock, Unlock, Eraser, Undo, SettingsIcon } from '../components/Icons';

export const PracticeStudio = ({ currentUser, targetKanji, settings, onBack, onSaveBest, onSaveComplete, onOpenAdmin, onToggleSound, onToggleVoice, onSaveSettings }) => {
  const [isGuideWatched, setIsGuideWatched] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showStrokeModal, setShowStrokeModal] = useState(false);
  const [strokeCheckDone, setStrokeCheckDone] = useState(false);
  const [syncStrokeIndex, setSyncStrokeIndex] = useState(-1);
  const [isUndoWaiting, setIsUndoWaiting] = useState(false);
  const [hintAnim, setHintAnim] = useState(false);
  const isFirstUndoRef = useRef(true);
  const hand = settings.hand || 'right';
  const isKogaki = ['ゃ','ゅ','ょ','っ'].includes(targetKanji.char);

  const canvasSize = settings.canvasSize ?? 'medium';
  const canvasSizeClass = canvasSize === 'large' ? 'w-64 md:w-80 max-w-[42vw]' : canvasSize === 'small' ? 'w-44 md:w-64 max-w-[35vw]' : 'w-56 md:w-72 max-w-[38vw]';
  const refSizeClass    = canvasSize === 'large' ? 'w-48 md:w-64 max-w-[32vw]' : canvasSize === 'small' ? 'w-32 md:w-48 max-w-[26vw]' : 'w-40 md:w-56 max-w-[29vw]';

  const strokeCheckTarget    = settings.strokeCheckTarget    ?? 1;
  const traceAllTarget       = settings.traceAllTarget       ?? 1;
  const traceBlueTarget      = settings.traceBlueTarget      ?? 0;
  const tenTarget            = settings.tenTarget            ?? 1;
  const blankTarget          = settings.blankTarget          ?? 1;
  const traceBlueHiddenTarget = settings.traceBlueHiddenTarget ?? 0;
  const testTarget           = settings.testTarget           ?? 1;

  const firstMode = (() => {
    if (traceAllTarget       > 0) return 'traceAll';
    if (traceBlueTarget      > 0) return 'traceBlue';
    if (tenTarget            > 0) return 'ten';
    if (blankTarget          > 0) return 'blank';
    if (traceBlueHiddenTarget > 0) return 'traceBlueHidden';
    if (testTarget           > 0) return 'test';
    return 'traceAll';
  })();

  const [practiceMode, setPracticeMode] = useState(firstMode);

  const isHiddenMode = practiceMode === 'test' || practiceMode === 'traceBlueHidden';
  const isTestMode   = isHiddenMode;

  const [strokeWarning, setStrokeWarning] = useState(false);
  const [practices, setPractices] = useState([]);
  const [pastBest, setPastBest] = useState(null);

  const sessionLogs = useMemo(() => ({
    traceAll:        practices.filter(p => p.type === 'traceAll' || p.type === 'trace').length,
    traceBlue:       practices.filter(p => p.type === 'traceBlue').length,
    ten:             practices.filter(p => p.type === 'ten' || p.type === 'hint').length,
    blank:           practices.filter(p => p.type === 'blank').length,
    traceBlueHidden: practices.filter(p => p.type === 'traceBlueHidden').length,
    test:            practices.filter(p => p.type === 'test').length,
  }), [practices]);

  const [isAnimating, setIsAnimating] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [svgPaths, setSvgPaths] = useState(null);
  const [isLoadingPaths, setIsLoadingPaths] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [isFlowDone, setIsFlowDone] = useState(false);
  const isFlowDoneRef = useRef(false);

  const isCanvasLocked = false;

  const [flyingCard, setFlyingCard] = useState({ active: false, image: null, startX: 0, startY: 0, tx: 0, ty: 0, flying: false });

  const allStrokesRef = useRef([]);
  const currentStrokeRef = useRef([]);
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const canvasContainerRef = useRef(null);
  const practicesStripRef = useRef(null);
  const kanaPlayRef = useRef(null);
  const [kanaStatus, setKanaStatus] = useState('idle');

  const practiceModeRef = useRef(practiceMode);
  const traceAllTargetRef       = useRef(0);
  const traceBlueTargetRef      = useRef(0);
  const tenTargetRef            = useRef(0);
  const blankTargetRef          = useRef(0);
  const traceBlueHiddenTargetRef = useRef(0);
  const testTargetRef           = useRef(0);

  useEffect(() => { practiceModeRef.current = practiceMode; }, [practiceMode]);
  useEffect(() => {
    traceAllTargetRef.current        = traceAllTarget;
    traceBlueTargetRef.current       = traceBlueTarget;
    tenTargetRef.current             = tenTarget;
    blankTargetRef.current           = blankTarget;
    traceBlueHiddenTargetRef.current = traceBlueHiddenTarget;
    testTargetRef.current            = testTarget;
  }, [traceAllTarget, traceBlueTarget, tenTarget, blankTarget, traceBlueHiddenTarget, testTarget]);

  const isGoalReached =
    (traceAllTarget        === 0 || sessionLogs.traceAll        >= traceAllTarget) &&
    (traceBlueTarget       === 0 || sessionLogs.traceBlue       >= traceBlueTarget) &&
    (tenTarget             === 0 || sessionLogs.ten             >= tenTarget) &&
    (blankTarget           === 0 || sessionLogs.blank           >= blankTarget) &&
    (traceBlueHiddenTarget === 0 || sessionLogs.traceBlueHidden >= traceBlueHiddenTarget) &&
    (testTarget            === 0 || sessionLogs.test            >= testTarget);

  useEffect(() => {
    const loadData = async () => {
      const savedPractices = await db.practices.where({ userId: currentUser.id, char: targetKanji.char }).toArray();
      setPractices(savedPractices);
      const best = await db.bestShots.get({ userId: currentUser.id, char: targetKanji.char });
      setPastBest(best || null);
    };
    loadData();
  }, [targetKanji.char, currentUser.id]);

  // StrokeOrderModal を初回自動表示
  useEffect(() => {
    if (strokeCheckTarget > 0 && !strokeCheckDone && svgPaths) {
      setShowStrokeModal(true);
    }
  }, [svgPaths, strokeCheckTarget]);

  const adjustCanvasSize = () => {
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
      ctx.strokeStyle = '#333';
      ctx.lineWidth = settings.traceWidth ?? 8;
      contextRef.current = ctx;
    }
  };

  useEffect(() => {
    setTimeout(adjustCanvasSize, 150);
    const canvas = canvasRef.current;
    const prevent = (e) => e.target === canvas && e.preventDefault();
    document.body.addEventListener('touchmove', prevent, { passive: false });
    return () => document.body.removeEventListener('touchmove', prevent);
  }, [targetKanji]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const normX = (rawX / rect.width) * 200;
    const normY = (rawY / rect.height) * 200;
    return { rawX, rawY, normX, normY };
  };

  const start = (e) => {
    if (!practiceModeRef.current) return;
    adjustCanvasSize();
    const { rawX, rawY, normX, normY } = getPos(e);
    contextRef.current.beginPath();
    contextRef.current.moveTo(rawX, rawY);
    isDrawingRef.current = true;
    if (!hasDrawn) setHasDrawn(true);
    currentStrokeRef.current = [{ x: Math.round(normX), y: Math.round(normY) }];
  };

  const move = (e) => {
    if (!isDrawingRef.current) return;
    const { rawX, rawY, normX, normY } = getPos(e);
    contextRef.current.lineTo(rawX, rawY);
    contextRef.current.stroke();
    const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    if (!lastPoint || Math.hypot(lastPoint.x - normX, lastPoint.y - normY) > 2) {
      currentStrokeRef.current.push({ x: Math.round(normX), y: Math.round(normY) });
    }
  };

  const end = () => {
    if (!isDrawingRef.current) return;
    contextRef.current.closePath();
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 0) {
      allStrokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = [];
    }
  };

  const clear = () => {
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
    allStrokesRef.current = [];
    currentStrokeRef.current = [];
    isFirstUndoRef.current = true;
  };

  const undo = () => {
    if (allStrokesRef.current.length === 0) return;
    // 初回アンドゥは300ms真っ白にしてから再描画
    if (isFirstUndoRef.current) {
      isFirstUndoRef.current = false;
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setIsUndoWaiting(true);
      setTimeout(() => {
        allStrokesRef.current = allStrokesRef.current.slice(0, -1);
        redrawCanvas();
        setIsUndoWaiting(false);
        if (allStrokesRef.current.length === 0) setHasDrawn(false);
      }, 300);
      return;
    }
    allStrokesRef.current = allStrokesRef.current.slice(0, -1);
    redrawCanvas();
    if (allStrokesRef.current.length === 0) setHasDrawn(false);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    const logicalW = canvas.width / dpr;
    const logicalH = canvas.height / dpr;
    allStrokesRef.current.forEach(stroke => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x / 200 * logicalW, stroke[0].y / 200 * logicalH);
      stroke.forEach(pt => ctx.lineTo(pt.x / 200 * logicalW, pt.y / 200 * logicalH));
      ctx.stroke();
      ctx.closePath();
    });
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPaths(true);
    fetchKanaVGPaths(targetKanji.char).then(paths => {
      if (isMounted) { setSvgPaths(paths); setIsLoadingPaths(false); }
    });
    return () => { isMounted = false; };
  }, [targetKanji.char]);

  const playDoneSound = () => {
    try {
      const ac = getAudioContext();
      const notes = [2400, 3200, 4100];
      notes.forEach((freq, i) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'triangle';
        const t = ac.currentTime + i * 0.07;
        o.frequency.setValueAtTime(freq * 0.7, t);
        o.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
        o.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.start(t); o.stop(t + 0.2);
      });
      const o2 = ac.createOscillator(); const g2 = ac.createGain();
      o2.connect(g2); g2.connect(ac.destination);
      o2.type = 'sine';
      const t2 = ac.currentTime + 0.5;
      o2.frequency.setValueAtTime(700, t2);
      o2.frequency.exponentialRampToValueAtTime(450, t2 + 0.15);
      g2.gain.setValueAtTime(0.35, t2);
      g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.2);
      o2.start(t2); o2.stop(t2 + 0.22);
    } catch(e) {}
  };

  const buildHintData = (mode, paths) => {
    if (!paths) return null;
    if (mode === 'traceAll' || mode === 'trace') {
      return { type: 'trace', paths: paths.map(p => ({ d: p.d, gid: p.groupId })) };
    }
    if (mode === 'traceBlue') {
      const bluePaths = paths.filter(p => p.groupId === 0);
      return { type: 'trace', paths: bluePaths.map(p => ({ d: p.d, gid: p.groupId })) };
    }
    if (mode === 'ten' || mode === 'hint') {
      const firstPath = paths[0];
      if (!firstPath) return null;
      const m = firstPath.d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
      if (!m) return null;
      return { type: 'dot', dots: [{ cx: parseFloat(m[1]), cy: parseFloat(m[2]), gid: 0 }] };
    }
    return null;
  };

  const handleFinish = async (skipCheck = false) => {
    if(isAnimating || !hasDrawn) return;
    if (!practiceMode) return;

    if (!skipCheck) {
      const actualStrokes = allStrokesRef.current.length;
      const requiredStrokes = targetKanji.strokes - 1;
      if (actualStrokes < requiredStrokes) {
        setStrokeWarning(true);
        return;
      }
    }

    const strokes = [...allStrokesRef.current];
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const currentLogs = { ...sessionLogs, [practiceMode]: sessionLogs[practiceMode] + 1 };

    setIsAnimating(true);

    const hintData = buildHintData(practiceMode, svgPaths);

    const newPractice = {
      userId: currentUser.id, char: targetKanji.char, image: dataUrl,
      strokes, type: practiceMode, hintData, logs: currentLogs, timestamp: Date.now()
    };

    const id = await db.practices.add(newPractice);
    setStrokeWarning(false);

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const stripRect = practicesStripRef.current ? practicesStripRef.current.getBoundingClientRect() : null;
    const targetCardW = 80;
    const scale = targetCardW / canvasRect.width;
    const srcCX = canvasRect.left + canvasRect.width / 2;
    const srcCY = canvasRect.top + canvasRect.height / 2;
    let destCX = srcCX, destCY = srcCY - 140;
    if (stripRect) {
      destCX = stripRect.left + 48 + targetCardW / 2;
      destCY = stripRect.top + stripRect.height / 2;
    }
    const tx = destCX - srcCX;
    const ty = destCY - srcCY;

    if (settings.soundEnabled !== false) playDoneSound();
    setFlyingCard({ active: true, image: dataUrl, startX: canvasRect.left, startY: canvasRect.top, w: canvasRect.width, h: canvasRect.height, tx, ty, scale, flying: false });

    requestAnimationFrame(() => requestAnimationFrame(() => {
      setFlyingCard(prev => ({ ...prev, flying: true }));
    }));

    setTimeout(() => {
      setFlyingCard({ active: false, image: null, startX: 0, startY: 0, w: 60, h: 60, tx: 0, ty: 0, scale: 1, flying: false });
      setPractices(prev => [{ ...newPractice, id }, ...prev]);
      setIsAnimating(false);
      setHasDrawn(false);
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      allStrokesRef.current = [];
      currentStrokeRef.current = [];
      isFirstUndoRef.current = true;

      const mode = practiceModeRef.current;
      const tAT  = traceAllTargetRef.current;
      const tBT  = traceBlueTargetRef.current;
      const teT  = tenTargetRef.current;
      const bT   = blankTargetRef.current;
      const tBHT = traceBlueHiddenTargetRef.current;
      const tS   = testTargetRef.current;

      const nextMode = (() => {
        if (mode === 'traceAll' && tAT > 0 && currentLogs.traceAll >= tAT) {
          if (tBT  > 0) return 'traceBlue';
          if (teT  > 0) return 'ten';
          if (bT   > 0) return 'blank';
          if (tBHT > 0) return 'traceBlueHidden';
          if (tS   > 0) return 'test';
        }
        if (mode === 'traceBlue' && tBT > 0 && currentLogs.traceBlue >= tBT) {
          if (teT  > 0) return 'ten';
          if (bT   > 0) return 'blank';
          if (tBHT > 0) return 'traceBlueHidden';
          if (tS   > 0) return 'test';
        }
        if ((mode === 'ten' || mode === 'hint') && teT > 0 && currentLogs.ten >= teT) {
          if (bT   > 0) return 'blank';
          if (tBHT > 0) return 'traceBlueHidden';
          if (tS   > 0) return 'test';
        }
        if (mode === 'blank' && bT > 0 && currentLogs.blank >= bT) {
          if (tBHT > 0) return 'traceBlueHidden';
          if (tS   > 0) return 'test';
        }
        if (mode === 'traceBlueHidden' && tBHT > 0 && currentLogs.traceBlueHidden >= tBHT) {
          if (tS > 0) return 'test';
        }
        return null;
      })();

      const allDone =
        (tAT  === 0 || currentLogs.traceAll        >= tAT)  &&
        (tBT  === 0 || currentLogs.traceBlue        >= tBT)  &&
        (teT  === 0 || currentLogs.ten              >= teT)  &&
        (bT   === 0 || currentLogs.blank            >= bT)   &&
        (tBHT === 0 || currentLogs.traceBlueHidden  >= tBHT) &&
        (tS   === 0 || currentLogs.test             >= tS);

      if (isFlowDoneRef.current) {
        // フロー完了後の自由練習 → モードはそのまま
      } else if (allDone) {
        setPracticeMode(null);
        setIsFlowDone(true);
        isFlowDoneRef.current = true;
      } else if (nextMode) {
        setPracticeMode(nextMode);
      }
    }, 800);
  };

  const completionLevel = settings.completionLevel || 1;
  const canSelect = (type) => {
    if (completionLevel === 3 && type !== 'test') return false;
    if (completionLevel === 2 && (type === 'traceAll' || type === 'trace' || type === 'traceBlue' || type === 'ten' || type === 'hint' || type === 'traceBlueHidden')) return false;
    return true;
  };

  const traceTheme      = COLOR_OPTIONS.find(c=>c.id===settings.traceColor)           || COLOR_OPTIONS[0];
  const traceBlueTheme  = COLOR_OPTIONS.find(c=>c.id===settings.traceBlueColor)        || COLOR_OPTIONS[3];
  const tenTheme        = COLOR_OPTIONS.find(c=>c.id===settings.tenColor)              || COLOR_OPTIONS[1];
  const blankTheme      = COLOR_OPTIONS.find(c=>c.id===settings.blankColor)            || COLOR_OPTIONS[2];
  const traceBlueHiddenTheme = COLOR_OPTIONS.find(c=>c.id===settings.traceBlueHiddenColor) || COLOR_OPTIONS[4];
  const testTheme       = COLOR_OPTIONS.find(c=>c.id===settings.testColor)             || COLOR_OPTIONS[3];

  const borderColor = !practiceMode ? '#d6d3d1' :
    (practiceMode === 'trace' || practiceMode === 'traceAll') ? traceTheme.hex :
    practiceMode === 'traceBlue'       ? traceBlueTheme.hex :
    (practiceMode === 'ten' || practiceMode === 'hint') ? tenTheme.hex :
    practiceMode === 'blank'           ? blankTheme.hex :
    practiceMode === 'traceBlueHidden' ? traceBlueHiddenTheme.hex :
    testTheme.hex;

  const modeThemeOf = (type) => {
    if (type === 'traceAll' || type === 'trace') return traceTheme;
    if (type === 'traceBlue') return traceBlueTheme;
    if (type === 'ten' || type === 'hint') return tenTheme;
    if (type === 'blank') return blankTheme;
    if (type === 'traceBlueHidden') return traceBlueHiddenTheme;
    return testTheme;
  };

  const modeLabelOf = (type) => {
    if (type === 'traceAll' || type === 'trace') return '✏️ぜんぶ';
    if (type === 'traceBlue') return '🟦いちぶ';
    if (type === 'ten' || type === 'hint') return '⚫️てん';
    if (type === 'blank') return '👁️おてほん';
    if (type === 'traceBlueHidden') return '🟦🙈いちぶ';
    if (type === 'test') return '🙈ぜんぶ';
    return type;
  };

  const unlockText = completionLevel === 3 ? '「みないで」からえらぼう！' :
    completionLevel === 2 ? '「おてほん」「みないで」からえらぼう！' : 'えらべるよ！';

  // traceBlue用パス
  const bluePaths = useMemo(() =>
    svgPaths ? svgPaths.filter(p => p.groupId === 0) : null,
  [svgPaths]);

  return (
    <>
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto bg-[#fdfbf7] overflow-hidden animate-fade-in">
      <div className="pt-3 pb-2 flex flex-col items-center z-10 shrink-0 transition-colors duration-500">

        <div className="w-full flex justify-between items-start mb-2 px-3 gap-2">
          <div className="flex flex-col gap-2 shrink-0">
            <button onClick={onBack} className="text-stone-500 flex items-center gap-1 text-sm bg-white px-3 py-1.5 rounded-full mt-1 hover:bg-amber-50 border border-stone-200 shadow-sm active:scale-95 transition-all"><span className="text-base leading-none">↩️</span> もどる</button>
            <button onClick={() => setShowPinModal(true)} className="text-stone-500 flex items-center justify-center text-xl bg-white w-10 h-10 rounded-full hover:bg-amber-50 border border-stone-200 shadow-sm active:scale-95 transition-all leading-none">⚙️</button>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-3 md:gap-6 bg-white px-4 py-3 md:px-8 md:py-4 rounded-3xl shadow-md border-2 border-amber-200 max-w-2xl w-full">
              <div className={`relative shrink-0 pr-3 md:pr-6 py-1 md:py-2 ${isTestMode ? 'border-transparent' : 'border-r-2 border-dashed border-stone-200'}`}>
                <div className="text-4xl sm:text-5xl md:text-6xl font-kyokasho text-stone-800 font-bold leading-none tracking-widest">【{targetKanji.char}】</div>
                {isTestMode && (
                  <div className="absolute -left-2 -right-3 md:-right-4 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 z-10 border border-stone-200 shadow-inner"
                    style={{top: '-6px', bottom: '-6px'}}>
                    <span className="text-2xl md:text-3xl grayscale opacity-50">🙈</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <span className="text-4xl sm:text-5xl md:text-6xl shrink-0 drop-shadow-sm">{targetKanji.icon}</span>
                <div className="relative flex-1 min-w-0">
                  <span className="text-xl sm:text-2xl md:text-3xl font-kyokasho text-stone-700 font-bold tracking-widest break-words leading-tight">
                    {targetKanji.word}
                  </span>
                  {isTestMode && (
                    <div className="absolute -left-2 -right-2 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 z-10 border border-stone-200 shadow-inner"
                      style={{top: '-6px', bottom: '-6px'}}>
                      <span className="text-xl md:text-2xl grayscale opacity-50">🙈</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 items-center mt-1">
            <button onClick={onToggleSound} title={settings.soundEnabled !== false ? 'こうかおんをけす' : 'こうかおんをならす'}
              className="flex items-center justify-center text-xl bg-white w-10 h-10 rounded-full hover:bg-amber-50 border border-stone-200 shadow-sm active:scale-95 transition-all leading-none">
              {settings.soundEnabled !== false ? '🔔' : '🔕'}
            </button>
            <button onClick={onToggleVoice} title={settings.voiceEnabled !== false ? 'おしゃべりをけす' : 'おしゃべりをならす'}
              className="flex items-center justify-center text-xl bg-white w-10 h-10 rounded-full hover:bg-amber-50 border border-stone-200 shadow-sm active:scale-95 transition-all leading-none">
              {settings.voiceEnabled !== false ? '🔊' : '🔇'}
            </button>
            <button onClick={() => setShowSidebar(true)} title="みためをかえる"
              className="flex items-center justify-center text-xl bg-white w-10 h-10 rounded-full hover:bg-amber-50 border border-stone-200 shadow-sm active:scale-95 transition-all leading-none">
              👁
            </button>
          </div>
        </div>

        <div ref={practicesStripRef} className={`w-[95%] h-36 md:h-44 rounded-2xl p-3 md:p-4 flex gap-3 overflow-x-auto relative items-center transition-all duration-500 ${isGoalReached ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-amber-400 shadow-lg' : 'bg-white border-4 border-amber-200 shadow-sm'}`}
          style={isGoalReached ? { boxShadow: '0 0 0 4px #fde68a44, 0 4px 24px #fbbf2420' } : {}}>

          {practices.length === 0 && !pastBest && (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-amber-400">
              <span className="text-3xl opacity-50">✍️</span>
              <span className="text-sm font-bold text-amber-500/70">かいた文字がここに集まるよ！</span>
            </div>
          )}

          {isGoalReached && (practices.length > 0 || pastBest) && (
            <div className="absolute top-0 left-0 text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-br-xl z-20 flex items-center gap-1 shadow"
              style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}>
              <Unlock className="w-3 h-3 md:w-4 md:h-4"/> {unlockText}
            </div>
          )}

          {!isGoalReached && (
            <div className="absolute top-0 left-0 bg-stone-500/80 text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-br-xl z-20 flex items-center gap-1.5 shadow">
              <Lock className="w-3 h-3 shrink-0"/>
              {traceAllTarget > 0 && <span className={`px-1 py-0.5 rounded ${sessionLogs.traceAll >= traceAllTarget ? 'text-green-300' : 'text-white/80'}`}>✏️{sessionLogs.traceAll}/{traceAllTarget}</span>}
              {traceBlueTarget > 0 && <span className={`px-1 py-0.5 rounded ${sessionLogs.traceBlue >= traceBlueTarget ? 'text-green-300' : 'text-white/80'}`}>🟦{sessionLogs.traceBlue}/{traceBlueTarget}</span>}
              {tenTarget > 0 && <span className={`px-1 py-0.5 rounded ${sessionLogs.ten >= tenTarget ? 'text-green-300' : 'text-white/80'}`}>⚫️{sessionLogs.ten}/{tenTarget}</span>}
              {blankTarget > 0 && <span className={`px-1 py-0.5 rounded ${sessionLogs.blank >= blankTarget ? 'text-green-300' : 'text-white/80'}`}>👁️{sessionLogs.blank}/{blankTarget}</span>}
              {traceBlueHiddenTarget > 0 && <span className={`px-1 py-0.5 rounded ${sessionLogs.traceBlueHidden >= traceBlueHiddenTarget ? 'text-green-300' : 'text-white/80'}`}>🟦🙈{sessionLogs.traceBlueHidden}/{traceBlueHiddenTarget}</span>}
              {testTarget > 0 && <span className={`px-1 py-0.5 rounded ${sessionLogs.test >= testTarget ? 'text-green-300' : 'text-white/80'}`}>🙈{sessionLogs.test}/{testTarget}</span>}
            </div>
          )}

          {practices.map((p, i) => {
            const isSelectable = canSelect(p.type);
            const colorTheme = modeThemeOf(p.type);
            return (
              <div key={p.id}
                onClick={() => {
                  if (isGoalReached && isSelectable && !savingId) {
                    setSavingId(p.id);
                    speakWithSettings(targetKanji.char, settings);
                    if (navigator.vibrate) navigator.vibrate([30, 50]);
                    setTimeout(async () => {
                      await onSaveBest(targetKanji.char, p);
                      onSaveComplete(targetKanji.char, p.type);
                    }, 500);
                  }
                }}
                className={`flex-shrink-0 w-20 h-20 md:w-28 md:h-28 bg-white rounded-xl border-2 p-1 transition-all duration-300 relative mt-4 shadow-sm
                  ${isGoalReached && isSelectable && !savingId ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl ' + colorTheme.class : ''}
                  ${savingId === p.id ? 'scale-90 ring-4 shadow-inner z-50 opacity-90 ' + colorTheme.class : ''}
                  ${savingId && savingId !== p.id ? 'opacity-0 scale-50' : ''}
                  ${!isGoalReached || !isSelectable ? 'opacity-40 grayscale border-stone-200' + (!isSelectable && isGoalReached ? ' cursor-not-allowed' : '') : ''}`}>
                <div className="w-full h-full p-1 relative">
                  <ShotDisplay shot={p} strokeWidth={10} color="#374151" hintStrokeWidth={8} />
                  {isTestMode && (
                    <div className="absolute inset-1 bg-stone-100/95 backdrop-blur-sm rounded-lg flex items-center justify-center z-10 border border-stone-200">
                      <span className="text-2xl grayscale opacity-50">🙈</span>
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 border rounded-full whitespace-nowrap shadow-sm"
                  style={{ color: colorTheme.hex, borderColor: colorTheme.hex + '66', backgroundColor: colorTheme.hex + '11' }}>
                  {modeLabelOf(p.type)}
                </span>
              </div>
            );
          })}

          {pastBest && (() => {
            const isSelectable = canSelect(pastBest.type);
            const colorTheme = modeThemeOf(pastBest.type);
            const pbId = 'pastBest';
            return (
              <div key={pbId}
                onClick={() => {
                  if (isGoalReached && isSelectable && !savingId) {
                    setSavingId(pbId);
                    speakWithSettings(targetKanji.char, settings);
                    if (navigator.vibrate) navigator.vibrate([30, 50]);
                    setTimeout(async () => {
                      await onSaveBest(targetKanji.char, pastBest);
                      onSaveComplete(targetKanji.char, pastBest.type);
                    }, 500);
                  }
                }}
                className={`flex-shrink-0 w-20 h-20 md:w-28 md:h-28 bg-white rounded-xl border-2 p-1 transition-all duration-300 relative mt-4 shadow-sm
                  ${isGoalReached && isSelectable && !savingId ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl ' + colorTheme.class : ''}
                  ${savingId === pbId ? 'scale-90 ring-4 shadow-inner z-50 opacity-90 ' + colorTheme.class : ''}
                  ${savingId && savingId !== pbId ? 'opacity-0 scale-50' : ''}
                  ${!isGoalReached || !isSelectable ? 'opacity-40 grayscale border-stone-200' + (!isSelectable && isGoalReached ? ' cursor-not-allowed' : '') : ''}`}>
                <div className="w-full h-full p-1 relative">
                  <ShotDisplay shot={pastBest} strokeWidth={10} color="#374151" hintStrokeWidth={8} />
                </div>
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 border rounded-full whitespace-nowrap shadow-sm"
                  style={{ color: colorTheme.hex, borderColor: colorTheme.hex + '66', backgroundColor: colorTheme.hex + '11' }}>
                  まえ
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-2 md:p-4 w-full">
        <div className="mt-auto flex flex-col items-center w-full">

          <div className="flex justify-center mb-2 overflow-x-auto">
            <div className="flex bg-white rounded-full shadow-sm border p-0.5 overflow-hidden">
              {[
                traceAllTarget        > 0 ? { mode: 'traceAll',        label: '✏️ぜんぶ',   theme: traceTheme           } : null,
                traceBlueTarget       > 0 ? { mode: 'traceBlue',       label: '🟦いちぶ',   theme: traceBlueTheme       } : null,
                tenTarget             > 0 ? { mode: 'ten',             label: '⚫️てん',     theme: tenTheme             } : null,
                blankTarget           > 0 ? { mode: 'blank',           label: '👁️おてほん', theme: blankTheme           } : null,
                traceBlueHiddenTarget > 0 ? { mode: 'traceBlueHidden', label: '🟦🙈いちぶ', theme: traceBlueHiddenTheme } : null,
                testTarget            > 0 ? { mode: 'test',            label: '🙈ぜんぶ',   theme: testTheme            } : null,
              ].filter(Boolean).map(({ mode, label, theme }) => (
                <button key={mode} onClick={() => !hasDrawn && setPracticeMode(mode)} disabled={hasDrawn}
                  className={`relative px-3 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all ${practiceMode !== mode ? 'text-gray-400 hover:bg-gray-50' : ''} ${hasDrawn ? 'opacity-30 cursor-not-allowed' : ''}`}
                  style={practiceMode === mode ? { backgroundColor: `${theme.hex}22`, color: theme.hex } : {}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex items-end justify-center gap-4 md:gap-10 w-full px-4 pb-2 ${hand === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>

            <div className={`${refSizeClass} shrink-0 self-center flex flex-col gap-1.5`}>
              <div className="h-9" aria-hidden="true"/>
              <div className="relative w-full aspect-square">
                {isTestMode && (
                  <div className="absolute inset-0 z-30 bg-gray-100 rounded-xl flex flex-col items-center justify-center border-4 border-gray-200 shadow-inner">
                    <span className="text-4xl mb-2 grayscale opacity-50">🙈</span>
                    <span className="text-gray-400 font-bold text-xs md:text-sm text-center">みないで<br/>かけるかな？</span>
                  </div>
                )}
                {isLoadingPaths ? (
                  <div className="w-full h-full bg-white rounded-xl shadow-md border-4 border-orange-200 flex flex-col items-center justify-center text-sky-400">
                    <Loader className="w-8 h-8 mb-2" />
                  </div>
                ) : svgPaths ? (
                  <AnimatedKana paths={svgPaths} strokes={targetKanji.strokes} settings={settings}
                    onComplete={() => setIsGuideWatched(true)} isKogaki={isKogaki}
                    trickyStroke={targetKanji.trickyStroke} playRef={kanaPlayRef}
                    onStatusChange={setKanaStatus} onStrokeChange={setSyncStrokeIndex}
                    hideReplayButton={true} />
                ) : (
                  <div className="w-full h-full bg-white rounded-xl shadow-md border-4 border-orange-200 relative select-none">
                    <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
                      <div className="absolute top-1/2 w-full border-t-2 border-dashed border-red-300"></div>
                      <div className="absolute left-1/2 h-full border-l-2 border-dashed border-red-300"></div>
                    </div>
                    <span className="absolute top-1 left-1 text-[10px] text-red-500 bg-white px-1 rounded border border-red-200 z-20 font-bold">{targetKanji.strokes}かく</span>
                    <div className={`absolute font-kyokasho text-black leading-none flex items-center justify-center ${isKogaki ? '' : 'inset-0'}`}
                      style={isKogaki ? {left:'-8%', bottom:'0%', width:'66%', height:'66%', fontSize:'4.5rem'} : {fontSize:'8rem'}}>
                      <span>{targetKanji.char}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative flex items-center gap-1.5 h-9">
                {targetKanji.trickyStroke && kanaStatus !== 'playing' && svgPaths && (
                  <span className="absolute right-0 translate-x-1 top-1 -translate-y-1 text-2xl drop-shadow-md animate-bounce z-40">⚠️</span>
                )}
                <button
                  onClick={() => kanaPlayRef.current?.()}
                  disabled={kanaStatus === 'playing' || isLoadingPaths || !svgPaths}
                  className={`relative flex items-center justify-center gap-1.5 flex-1 h-full rounded-full font-bold transition-all shadow-md
                    ${kanaStatus === 'playing' || isLoadingPaths || !svgPaths
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none'
                      : targetKanji.trickyStroke
                        ? 'bg-red-50 text-red-600 border-4 border-red-500 hover:bg-red-100 active:scale-95'
                        : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95'}`}
                >
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span className="text-xs whitespace-nowrap">
                    {kanaStatus === 'playing' ? 'さいせいちゅう' : targetKanji.trickyStroke ? 'かきじゅんちゅうい！' : 'さいせい'}
                  </span>
                </button>
              </div>
            </div>

            <div ref={canvasContainerRef} className={`relative group ${canvasSizeClass} shrink-0 self-center`}>
              <div className="relative w-full aspect-square bg-white rounded-2xl shadow-xl border-4 overflow-hidden cursor-crosshair transition-colors duration-300" style={{ borderColor }}>
                <MasuBg masuStyle={settings.masuStyle} />

                {/* traceAll / traceBlue ガイド */}
                {(practiceMode === 'traceAll' || practiceMode === 'traceBlue' || practiceMode === 'traceBlueHidden') && svgPaths && (() => {
                  const go = settings.guideOpacity || 'soft';
                  if (go === 'none') return null;
                  const op = go === 'strong' ? 0.55 : 0.30;
                  const isSyncing = settings.syncTrace && kanaStatus === 'playing';
                  const displayPaths = (practiceMode === 'traceBlue' || practiceMode === 'traceBlueHidden') ? bluePaths : svgPaths;
                  return (
                    <div className={isKogaki ? 'absolute pointer-events-none select-none z-0' : 'absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 p-4'}
                      style={isKogaki ? {left:'-8%', bottom:'0%', width:'66%', height:'66%'} : {}}>
                      <svg viewBox={isKogaki ? '4 4 101 101' : '0 0 109 109'} className="w-full h-full" style={{opacity: op}}>
                        {displayPaths.map((p, i) => {
                          const sc = settings.strokeColor || 'mono';
                          const pc = settings.partColor ?? true;
                          const guideColor = sc === 'pastel' ? PASTEL_COLORS[p.groupId % PASTEL_COLORS.length]
                            : sc === 'single' ? '#378ADD'
                            : pc ? PART_COLORS[p.groupId % PART_COLORS.length] : '#e5e7eb';
                          const baseOpacity = (pc || sc === 'pastel' || sc === 'single') ? 0.4 : 1;
                          if (isSyncing && practiceMode === 'traceAll') {
                            let pathStatus = 'undrawn';
                            if (i < syncStrokeIndex) pathStatus = 'drawn';
                            else if (i === syncStrokeIndex) pathStatus = 'animating';
                            if (pathStatus === 'undrawn') return null;
                            return <KanaPath key={i} d={p.d} status={pathStatus}
                              strokeWidth={settings.traceWidth ?? 6} drawnColor={guideColor}
                              animatingColor={guideColor} animDuration={settings.animSpeed ?? 1300} pathOpacity={baseOpacity} />;
                          }
                          return <path key={i} d={p.d} fill="none" strokeWidth={settings.traceWidth ?? 6}
                            stroke={guideColor} opacity={baseOpacity} strokeLinecap="round" strokeLinejoin="round" />;
                        })}
                      </svg>
                    </div>
                  );
                })()}

                {/* ten ガイド */}
                {(practiceMode === 'ten' || practiceMode === 'hint') && svgPaths && (() => {
                  const firstPath = svgPaths[0];
                  if (!firstPath) return null;
                  const m = firstPath.d.match(/M\s*([\d.]+)[,\s]+([\d.]+)/);
                  if (!m) return null;
                  return (
                    <div className={isKogaki ? 'absolute pointer-events-none select-none z-0' : 'absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 p-4'}
                      style={isKogaki ? {left:'-8%', bottom:'0%', width:'66%', height:'66%'} : {}}>
                      <svg viewBox={isKogaki ? '4 4 101 101' : '0 0 109 109'} className="w-full h-full">
                        <circle cx={parseFloat(m[1])} cy={parseFloat(m[2])} r={2.5} fill="#1f2937" opacity="0.9" />
                      </svg>
                    </div>
                  );
                })()}

                {/* traceBlueHidden / test の「ちらみ」ヒント */}
                {isHiddenMode && hintAnim && svgPaths && (() => {
                  return (
                    <div className="absolute inset-0 pointer-events-none select-none z-20 p-4 flex items-center justify-center animate-fade-in">
                      <svg viewBox="0 0 109 109" className="w-full h-full opacity-50">
                        {svgPaths.map((p, i) => (
                          <path key={i} d={p.d} fill="none" strokeWidth="6" stroke="#0284c7"
                            strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                      </svg>
                    </div>
                  );
                })()}

                {settings.showCanvasCross !== false && (
                  <div className="absolute inset-0 pointer-events-none opacity-50 z-0">
                    <div className="absolute top-1/2 w-full border-t-2 border-dashed border-red-300"></div>
                    <div className="absolute left-1/2 h-full border-l-2 border-dashed border-red-300"></div>
                  </div>
                )}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none z-10"
                  onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                  onTouchStart={start} onTouchMove={move} onTouchEnd={end} />

                {isUndoWaiting && (
                  <div className="absolute inset-0 z-30 bg-white/90 rounded-2xl flex items-center justify-center pointer-events-none" />
                )}

                {!practiceMode && (
                  <div className="absolute inset-0 z-30 bg-stone-100/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl animate-fade-in">
                    <span className="text-4xl mb-3">🎉</span>
                    <span className="text-stone-600 font-bold text-sm text-center px-5 py-3 bg-white/90 rounded-2xl shadow-sm leading-relaxed">
                      もっと かいてみる？<br/>モードをえらんでね 👆
                    </span>
                  </div>
                )}
              </div>

              {/* ちらみボタン（隠しモード時） */}
              {isHiddenMode && (
                <button
                  onTouchStart={() => setHintAnim(true)}
                  onTouchEnd={() => setHintAnim(false)}
                  onMouseDown={() => setHintAnim(true)}
                  onMouseUp={() => setHintAnim(false)}
                  onMouseLeave={() => setHintAnim(false)}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-40 bg-sky-100 border-2 border-sky-300 text-sky-700 text-xs font-bold px-4 py-1.5 rounded-full shadow active:scale-95 select-none">
                  👀 ちらみ
                </button>
              )}
            </div>

            <div className={`flex items-start gap-2 shrink-0 self-end pb-2 ${hand === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex flex-col items-center gap-3 md:gap-5 relative">
                <button onClick={undo} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                    <Undo className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <span className="text-[10px] md:text-xs font-bold">とりけし</span>
                </button>
                <button onClick={clear} className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                    <Eraser className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <span className="text-[10px] md:text-xs font-bold">けす</span>
                </button>
                <div className="w-14 md:w-20 h-28 md:h-36" aria-hidden="true" />

                {strokeWarning && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border-4 border-red-200 p-6 w-full max-w-sm animate-bounce-in text-center">
                      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                      </div>
                      <div className="text-red-500 font-bold mb-2 text-lg">画数がちがうみたい！</div>
                      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        この字は <strong className="text-lg text-gray-800">{targetKanji.strokes}かく</strong> だよ。<br/>
                        （いま書いたのは {allStrokesRef.current.length}かく）<br/>
                        もう一回 書いてみる？
                      </p>
                      <div className="flex gap-3">
                        <button onClick={() => { setStrokeWarning(false); clear(); }} className="flex-1 bg-sky-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-sky-600 active:scale-95 transition-all">かきなおす</button>
                        <button onClick={() => handleFinish(true)} className="flex-1 bg-gray-100 text-gray-500 font-bold py-3 rounded-xl hover:bg-gray-200 active:scale-95 transition-all text-sm">このままにする</button>
                      </div>
                    </div>
                  </div>
                )}

                {flyingCard.active && (
                  <div style={{
                    position: 'fixed', left: flyingCard.startX, top: flyingCard.startY,
                    width: flyingCard.w, height: flyingCard.h, zIndex: 9999, pointerEvents: 'none',
                    borderRadius: 16, border: '3px solid #fbbf24', overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transformOrigin: 'center center',
                    opacity: flyingCard.flying ? 0 : 1,
                    transform: flyingCard.flying
                      ? `translate(${flyingCard.tx}px, ${flyingCard.ty}px) rotate(360deg) scale(${flyingCard.scale})`
                      : 'translate(0,0) rotate(0deg) scale(1)',
                    transition: flyingCard.flying
                      ? 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.38s ease-in 0.1s'
                      : 'none',
                  }}>
                    <img src={flyingCard.image} style={{width:'100%',height:'100%',objectFit:'contain',background:'white'}} />
                  </div>
                )}
              </div>

              <button
                onClick={() => handleFinish(false)}
                disabled={isAnimating || !hasDrawn}
                className={`flex flex-col items-center justify-center w-14 md:w-20 h-28 md:h-36 rounded-2xl shadow-md border-2 transition-all select-none touch-none gap-1 bg-gradient-to-t from-sky-400 to-sky-300 border-sky-200 text-white ${hasDrawn && !isAnimating ? 'hover:brightness-105 active:scale-95 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              >
                <span className="font-black leading-none" style={{display:'inline-block',transform:'rotate(-90deg)',opacity:0.95,fontSize:'1.1rem',letterSpacing:'-3px'}}>〉〉</span>
                <span className="text-sm md:text-base font-bold tracking-widest leading-tight py-1">できた</span>
                <span className="font-black leading-none" style={{display:'inline-block',transform:'rotate(-90deg)',opacity:0.3,fontSize:'1.1rem',letterSpacing:'-3px'}}>〉〉</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showSidebar && (
      <SettingsSidebar
        settings={settings}
        onSave={onSaveSettings}
        onClose={() => setShowSidebar(false)}
        svgPaths={svgPaths}
        targetKanji={targetKanji}
      />
    )}

    {showStrokeModal && (
      <StrokeOrderModal
        paths={svgPaths}
        strokes={targetKanji.strokes}
        targetKanji={targetKanji}
        settings={settings}
        isKogaki={isKogaki}
        onClose={() => { setShowStrokeModal(false); setStrokeCheckDone(true); }}
      />
    )}

    {showPinModal && (
      <PinModal
        onSuccess={() => { setShowPinModal(false); onOpenAdmin(); }}
        onClose={() => setShowPinModal(false)}
      />
    )}
    </>
  );
};
