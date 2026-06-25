let _cachedVoices = [];

const loadVoices = () => {
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) _cachedVoices = v;
};

if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export const getVoices = () => {
  if (_cachedVoices.length === 0) loadVoices();
  return _cachedVoices;
};

export const speak = (text, { rate = 0.85, pitch = 1.1 } = {}, voiceNameOverride) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = rate;
  utter.pitch = pitch;
  if (voiceNameOverride !== undefined) {
    const v = getVoices().find(v => v.name === voiceNameOverride);
    if (v) utter.voice = v;
  }
  window.speechSynthesis.speak(utter);
};

export const speakWithSettings = (text, settings, opts = {}) => {
  if (!window.speechSynthesis) return;
  if (settings.voiceEnabled === false) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = opts.rate || 0.85;
  utter.pitch = opts.pitch || 1.1;
  if (settings.voiceName) {
    const v = getVoices().find(v => v.name === settings.voiceName);
    if (v) utter.voice = v;
  }
  window.speechSynthesis.speak(utter);
};
