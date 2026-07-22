export const QUOTES = {
  prompthaus: [
    { text: "Luxury is not a price point. It is a point of view.", attr: "PROMPTHAUS" },
    { text: "The algorithm rewards those who refuse to beg for attention.", attr: "PROMPTHAUS" },
    { text: "Build in silence. Let the work enter the room before you do.", attr: "PROMPTHAUS" },
    { text: "Taste is not taught. It is survived.", attr: "PROMPTHAUS" },
    { text: "Every empire begins with a single prompt.", attr: "PROMPTHAUS" },
    { text: "Move quiet. Build loud.", attr: "PROMPTHAUS" },
    { text: "They will study what you refused to explain.", attr: "PROMPTHAUS" },
    { text: "The future belongs to those who design it.", attr: "PROMPTHAUS" },
    { text: "Elegance is the elimination of everything unnecessary.", attr: "PROMPTHAUS" },
    { text: "Create what the culture will need before it knows it needs it.", attr: "PROMPTHAUS" },
    { text: "Your taste is your moat.", attr: "PROMPTHAUS" },
    { text: "Discipline is the bridge between vision and empire.", attr: "PROMPTHAUS" },
  ],
  napoleon: [
    { text: "Whatever the mind can conceive and believe, it can achieve.", attr: "NAPOLEON HILL" },
    { text: "Strength and growth come only through continuous effort and struggle.", attr: "NAPOLEON HILL" },
    { text: "The starting point of all achievement is desire.", attr: "NAPOLEON HILL" },
    { text: "Every adversity carries with it the seed of an equal or greater benefit.", attr: "NAPOLEON HILL" },
    { text: "Don't wait. The time will never be just right.", attr: "NAPOLEON HILL" },
    { text: "Set your mind on a definite goal and observe how quickly the world stands aside to let you pass.", attr: "NAPOLEON HILL" },
    { text: "Patience, persistence and perspiration make an unbeatable combination for success.", attr: "NAPOLEON HILL" },
    { text: "If you cannot do great things, do small things in a great way.", attr: "NAPOLEON HILL" },
  ],
  "48laws": [
    { text: "Never outshine the master.", attr: "LAW 1" },
    { text: "Conceal your intentions.", attr: "LAW 3" },
    { text: "Always say less than necessary.", attr: "LAW 4" },
    { text: "So much depends on reputation — guard it with your life.", attr: "LAW 5" },
    { text: "Court attention at all costs.", attr: "LAW 6" },
    { text: "Make other people come to you — use bait if necessary.", attr: "LAW 8" },
    { text: "Win through your actions, never through argument.", attr: "LAW 9" },
    { text: "Plan all the way to the end.", attr: "LAW 29" },
    { text: "Make your accomplishments seem effortless.", attr: "LAW 30" },
    { text: "Master the art of timing.", attr: "LAW 35" },
    { text: "Assume formlessness.", attr: "LAW 48" },
  ],
  godin: [
    { text: "People do not buy goods and services. They buy relations, stories, and magic.", attr: "SETH GODIN" },
    { text: "Art is what we call the thing an artist does. It is not the medium.", attr: "SETH GODIN" },
    { text: "Instead of wondering when your next vacation is, set up a life you don't need to escape from.", attr: "SETH GODIN" },
    { text: "The only way to get what you are worth is to stand out, to exert emotional labor, to be seen as indispensable.", attr: "SETH GODIN" },
    { text: "In a crowded marketplace, fitting in is failing.", attr: "SETH GODIN" },
    { text: "The cost of being wrong is less than the cost of doing nothing.", attr: "SETH GODIN" },
    { text: "Change almost never fails because it is too early. It almost always fails because it is too late.", attr: "SETH GODIN" },
  ],
  chinese: [
    { text: "The best time to plant a tree was twenty years ago. The second best time is now.", attr: "CHINESE PROVERB" },
    { text: "A journey of a thousand miles begins with a single step.", attr: "CHINESE PROVERB" },
    { text: "He who asks is a fool for five minutes. He who does not ask remains a fool forever.", attr: "CHINESE PROVERB" },
    { text: "When the winds of change blow, some people build walls and others build windmills.", attr: "CHINESE PROVERB" },
    { text: "A gem is not polished without friction, nor a person perfected without trials.", attr: "CHINESE PROVERB" },
    { text: "The person who moves a mountain begins by carrying away small stones.", attr: "CHINESE PROVERB" },
    { text: "Be not afraid of growing slowly. Be afraid only of standing still.", attr: "CHINESE PROVERB" },
    { text: "A book holds a house of gold.", attr: "CHINESE PROVERB" },
  ],
};

export const MOOD_QUOTE_MAP = {
  fiery: ["prompthaus", "48laws", "napoleon"],
  euphoric: ["prompthaus", "godin", "napoleon"],
  melancholic: ["chinese", "prompthaus", "napoleon"],
  serene: ["chinese", "godin", "prompthaus"],
  dark: ["48laws", "prompthaus", "chinese"],
  triumphant: ["napoleon", "prompthaus", "48laws"],
};

export const MOOD_PALETTES = {
  fiery:      ["#c41e2a", "#e85d04", "#ffba08", "#1a0a0a", "#2b0d0d"],
  euphoric:   ["#ff006e", "#fb5607", "#ffbe0b", "#3a0ca3", "#0d001a"],
  melancholic:["#264653", "#2a6f97", "#468faf", "#1b1b2f", "#0d0d1a"],
  serene:     ["#606c38", "#778da9", "#dda15e", "#1a1a2e", "#0d0d14"],
  dark:       ["#1a1423", "#2d1b3d", "#441a4a", "#6b2d5b", "#0a0a0f"],
  triumphant: ["#d4a418", "#c9a227", "#f5cb5c", "#1a1505", "#2d2409"],
};

export const FORMATS = {
  "9:16": { w: 1080, h: 1920 },
  "1:1":  { w: 1080, h: 1080 },
};

export const PREVIEW_SCALE = 0.35;

export const state = {
  audioFile: null,
  audioBuffer: null,
  audioElement: new Audio(),
  audioContext: null,
  analyserNode: null,
  sourceNode: null,
  isPlaying: false,
  logoImage: null,
  logoDataURL: null,
  logoSize: 30,
  logoPosX: 10,
  logoPosY: 90,
  mood: null,
  energy: 0,
  warmth: 0,
  darkness: 0,
  tempo: 0,
  palette: ["#333", "#444", "#555", "#222", "#111"],
  format: "9:16",
  quote: "",
  attribution: "",
  activeCategory: "prompthaus",
  personalBank: JSON.parse(localStorage.getItem("ph_quote_bank") || "[]"),
  animations: { waveform: true, particles: true, logoReveal: true, textReveal: true },
  particles: [],
  revealStartTime: null,
  exporting: false,
  bgImage: null,
  bgOpacity: 40,
  bgBlur: 4,
  bgDarken: 40,
  renderMode: "silent",
  logoLibrary: JSON.parse(localStorage.getItem("ph_logo_library") || "[]"),
  presets: JSON.parse(localStorage.getItem("ph_presets") || "[]"),
};

export const $ = (s) => document.querySelector(s);
export const $$ = (s) => document.querySelectorAll(s);

// Helper for offline FFT and live FFT fallback
export function getFreqDataForFrame(frameIdx, fps) {
  if (!state.audioBuffer) return null;
  const channelData = state.audioBuffer.getChannelData(0);
  const samplesPerFrame = Math.floor(state.audioBuffer.sampleRate / fps);
  const startSample = frameIdx * samplesPerFrame;
  const fftSize = 256;
  const halfFFT = fftSize / 2;
  const freqData = new Uint8Array(halfFFT);

  if (startSample < 0 || startSample + fftSize > channelData.length) return freqData;

  const real = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    const sample = channelData[startSample + i] || 0;
    const win = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    real[i] = sample * win;
  }

  for (let k = 0; k < halfFFT; k++) {
    let re = 0, im = 0;
    for (let n = 0; n < fftSize; n++) {
      const angle = -2 * Math.PI * k * n / fftSize;
      re += real[n] * Math.cos(angle);
      im += real[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / fftSize;
    freqData[k] = Math.min(255, Math.floor(mag * 512));
  }
  return freqData;
}
