let _audioCtx = null;

export const getAudioContext = () => {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
};

export const playSharan = () => {
  try {
    const ac = getAudioContext();
    const notes = [1800, 2400, 3000, 3800, 2800, 3500];
    notes.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'triangle';
      const t = ac.currentTime + i * 0.055;
      o.frequency.setValueAtTime(freq * 0.85, t);
      o.frequency.exponentialRampToValueAtTime(freq * 1.1, t + 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.25);
    });
  } catch(e) {}
};
