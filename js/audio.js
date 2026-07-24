import { state, $, MOOD_PALETTES } from './state.js';
import { updateMoodDisplay, updatePlayerTime, updateExportButtons } from './ui.js';
import { renderCanvas, initParticles } from './visualizer.js';
import { selectMoodQuote } from './main.js'; // or another central file

// Initialize Web Audio API graph exactly ONCE
export function initWebAudio() {
  if (state.audioContext) return;
  state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  state.analyserNode = state.audioContext.createAnalyser();
  state.analyserNode.fftSize = 256;

  // Create MediaElementSource and connect it
  state.sourceNode = state.audioContext.createMediaElementSource(state.audioElement);
  state.sourceNode.connect(state.analyserNode);
  state.analyserNode.connect(state.audioContext.destination);
}

export async function handleAudioFile(file) {
  state.audioFile = file;
  $("#audioZone").style.display = "none";
  $("#playerTransport").classList.add("visible");
  $("#trackName").textContent = file.name;
  $("#analyzing").classList.add("visible");

  // Reset and load the new file into the singleton audio element
  state.audioElement.pause();
  state.audioElement.src = URL.createObjectURL(file);
  state.audioElement.load();

  state.audioElement.onended = () => {
    state.isPlaying = false;
    $("#playPauseBtn").innerHTML = "&#9654;";
  };

  state.audioElement.onloadedmetadata = () => {
    $("#seekBar").max = state.audioElement.duration;
    updatePlayerTime();
    $("#exportDuration").value = Math.min(15, Math.floor(state.audioElement.duration));
  };

  // Decode offline for mood analysis
  initWebAudio(); // ensure context exists to decode
  const arrayBuffer = await file.arrayBuffer();
  state.audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer.slice(0));
  analyzeAudio(state.audioBuffer);
}

export function analyzeAudio(buffer) {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const duration = buffer.duration;

  let rms = 0;
  for (let i = 0; i < data.length; i++) rms += data[i] * data[i];
  rms = Math.sqrt(rms / data.length);
  const energy = Math.min(1, rms * 5);

  const fftSize = 2048;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtx(1, buffer.length, sampleRate);

  const source = offlineCtx.createBufferSource();
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = fftSize;
  source.buffer = buffer;
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  offlineCtx.startRendering().then(() => {
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    let lowSum = 0, midSum = 0, highSum = 0;
    const binCount = freqData.length;
    const lowEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.5);

    for (let i = 0; i < binCount; i++) {
      if (i < lowEnd) lowSum += freqData[i];
      else if (i < midEnd) midSum += freqData[i];
      else highSum += freqData[i];
    }

    const total = lowSum + midSum + highSum || 1;
    const warmth = (lowSum + midSum * 0.5) / total;
    const darkness = lowSum / total;

    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) zeroCrossings++;
    }
    const zcr = zeroCrossings / duration;
    const tempoEstimate = Math.min(1, zcr / 200);

    let mood;
    if (energy > 0.6 && warmth < 0.4) mood = "fiery";
    else if (energy > 0.5 && warmth > 0.5) mood = "euphoric";
    else if (energy < 0.35 && darkness > 0.5) mood = "melancholic";
    else if (energy < 0.35 && darkness < 0.4) mood = "serene";
    else if (darkness > 0.55) mood = "dark";
    else mood = "triumphant";

    state.energy = energy;
    state.warmth = warmth;
    state.darkness = darkness;
    state.tempo = tempoEstimate;
    state.mood = mood;
    state.palette = [...MOOD_PALETTES[mood]];

    updateMoodDisplay();
    selectMoodQuote();
    initParticles();
    updateExportButtons();
    renderCanvas();

    $("#analyzing").classList.remove("visible");
  });
}

export function togglePlayback() {
  if (!state.audioElement.src) return;

  // Browsers require a user gesture to resume the AudioContext
  if (state.audioContext && state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }

  if (state.isPlaying) {
    state.audioElement.pause();
    state.isPlaying = false;
    $("#playPauseBtn").innerHTML = "&#9654;";
  } else {
    state.audioElement.play().then(() => {
      state.isPlaying = true;
      state.revealStartTime = performance.now();
      $("#playPauseBtn").innerHTML = "&#10074;&#10074;";
    }).catch(err => console.error("Playback failed:", err));
  }
}
