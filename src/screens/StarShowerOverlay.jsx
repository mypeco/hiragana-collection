import { useRef, useEffect } from 'react';
import { getAudioContext } from '../lib/audio';

export const StarShowerOverlay = ({ milestone, isFinal, onDismiss, starColorPalette }) => {
  const canvasRef = useRef(null);
  const animRef  = useRef(null);

  const playMilestoneSound = (isFinal) => {
    try {
      const ac = getAudioContext();
      if (isFinal) {
        const notes = [
          { freq: 523, t: 0 }, { freq: 659, t: 0.1 }, { freq: 784, t: 0.2 },
          { freq: 1047, t: 0.35 }, { freq: 1319, t: 0.5 }, { freq: 1568, t: 0.65 }, { freq: 2093, t: 0.85 }, { freq: 2093, t: 1.1 },
        ];
        notes.forEach(({ freq, t }) => {
          const o = ac.createOscillator(); const g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, ac.currentTime + t);
          g.gain.setValueAtTime(0, ac.currentTime + t);
          g.gain.linearRampToValueAtTime(0.28, ac.currentTime + t + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.45);
          o.start(ac.currentTime + t);
          o.stop(ac.currentTime + t + 0.5);
        });
      } else {
        const notes = milestone === 70 ? [659, 784, 1047, 1319] : [659, 784, 1047];
        notes.forEach((freq, i) => {
          const o = ac.createOscillator(); const g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.type = 'triangle';
          const t = ac.currentTime + i * 0.09;
          o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.2, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
          o.start(t); o.stop(t + 0.38);
        });
      }
    } catch(e) {}
  };

  useEffect(() => {
    playMilestoneSound(isFinal);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const lighten = (hex, amt) => {
      const r = Math.min(255, parseInt(hex.slice(1,3), 16) + amt);
      const g = Math.min(255, parseInt(hex.slice(3,5), 16) + amt);
      const b = Math.min(255, parseInt(hex.slice(5,7), 16) + amt);
      return `rgb(${r},${g},${b})`;
    };
    const palette = starColorPalette || [
      { hex: '#38bdf8', count: Math.floor(milestone / 3) },
      { hex: '#4ade80', count: Math.floor(milestone / 3) },
      { hex: '#c084fc', count: milestone - Math.floor(milestone / 3) * 2 },
    ];
    const starColors = [];
    palette.forEach(({ hex, count: c }) => {
      for (let i = 0; i < c; i++) starColors.push(Math.random() < 0.25 ? lighten(hex, 80) : hex);
    });
    while (starColors.length < milestone) starColors.push('#FFD700');
    for (let i = starColors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [starColors[i], starColors[j]] = [starColors[j], starColors[i]];
    }

    const count = milestone;
    const stars = Array.from({ length: count }, (_, idx) => ({
      x:        Math.random() * W,
      y:        -30 - Math.random() * H * 0.8,
      size:     isFinal ? (Math.random() * 50 + 30) : (Math.random() * 14 + 8),
      speed:    isFinal ? (Math.random() * 2 + 4)  : (Math.random() * 3.5 + 2.5),
      color:    starColors[idx % starColors.length],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.08,
      settled:  false,
      settledY: H - (Math.random() * 30 + 10),
      swayOff:  Math.random() * Math.PI * 2,
      swayAmp:  Math.random() * 1.5 + 0.3,
    }));

    const startTime = Date.now();

    const drawStar = (cx, cy, size, color, rot, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur  = size * 0.9;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerA = (i * 4 * Math.PI / 5) - Math.PI / 2;
        const innerA = outerA + (2 * Math.PI / 10);
        if (i === 0) ctx.moveTo(Math.cos(outerA) * size, Math.sin(outerA) * size);
        else         ctx.lineTo(Math.cos(outerA) * size, Math.sin(outerA) * size);
        ctx.lineTo(Math.cos(innerA) * size * 0.4, Math.sin(innerA) * size * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      const elapsed = Date.now() - startTime;
      const t = elapsed / 1000;

      if (isFinal) {
        ctx.fillStyle = 'rgba(0, 0, 15, 0.6)';
        ctx.fillRect(0, 0, W, H);
        stars.forEach(star => {
          if (!star.settled) {
            star.y += star.speed;
            star.rotation += star.rotSpeed;
            if (star.y >= star.settledY) star.settled = true;
          }
          drawStar(star.x, star.settled ? star.settledY : star.y, star.size, star.color, star.rotation, 1);
        });
      } else {
        stars.forEach(star => {
          star.y += star.speed;
          star.x += Math.sin(t * 3 + star.swayOff) * star.swayAmp;
          star.rotation += star.rotSpeed;
          if (star.y > H + 20) { star.y = -20; star.x = Math.random() * W; }
          const alpha = elapsed > 2500 ? Math.max(0, 1 - (elapsed - 2500) / 1500) : 1;
          drawStar(star.x, star.y, star.size, star.color, star.rotation, alpha);
        });
        if (elapsed >= 4000) { onDismiss(); return; }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const milestoneText = milestone === 70 ? 'あと５つ！！⭐' : `${milestone}こ あつめたよ！🌟`;

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 9000, pointerEvents: isFinal ? 'auto' : 'none' }}
      onClick={isFinal ? onDismiss : undefined}
    >
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />

      {isFinal ? (
        <div className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none" style={{ paddingTop: '10vh' }}>
          <div className="text-center animate-bounce-in px-6">
            <div style={{ fontSize:'5rem', filter:'drop-shadow(0 0 18px gold)', animation:'bounce 0.7s infinite' }}>🎊</div>
            <div className="font-bold font-kyokasho mt-3 mb-2 animate-bounce-in"
              style={{ fontSize:'clamp(2rem,8vw,3.5rem)', color:'#FFD700', textShadow:'0 3px 14px rgba(0,0,0,0.9), 0 0 30px rgba(255,215,0,0.6)' }}>
              おめでとう！！
            </div>
            <div className="font-bold font-kyokasho"
              style={{ fontSize:'clamp(1rem,4vw,1.5rem)', color:'#FFF9C4', textShadow:'0 2px 10px rgba(0,0,0,0.9)' }}>
              ひらがな ７５こ ぜんぶ あつめたよ！
            </div>
            <div className="mt-5 font-bold"
              style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.55)', textShadow:'0 1px 5px rgba(0,0,0,0.9)' }}>
              タップして とじる
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top:'30%', transform:'translateY(-50%)' }}>
          <div className="animate-bounce-in">
            <div className="font-bold font-kyokasho px-7 py-4 rounded-2xl"
              style={{ fontSize:'clamp(1.4rem,6vw,2.2rem)', color:'#FFFFFF',
                textShadow:'0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,215,0,0.7)',
                background:'rgba(0,0,0,0.32)', backdropFilter:'blur(4px)' }}>
              {milestoneText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
