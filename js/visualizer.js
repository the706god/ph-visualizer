import { state, $, FORMATS, PREVIEW_SCALE, getFreqDataForFrame } from './state.js';
import { updatePlayerTime } from './ui.js';

const canvas = $("#mainCanvas");
const ctx = canvas.getContext("2d");

// Offscreen canvas for background caching
const bgCanvas = document.createElement("canvas");
const bgCtx = bgCanvas.getContext("2d");
let bgCacheValid = false;

function hexToRgba(hex, alpha) {
  if (!hex) return 'rgba(100,100,100,' + alpha + ')';
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function darkenColor(hex, factor) {
  if (!hex) return "#000";
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return '#' + r.toString(16).padStart(2,"0") + g.toString(16).padStart(2,"0") + b.toString(16).padStart(2,"0");
}

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function wrapText(context, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  words.forEach(word => {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function invalidateBgCache() {
  bgCacheValid = false;
}

function renderBackground(w, h, p) {
  bgCanvas.width = w;
  bgCanvas.height = h;

  const bgGrad = bgCtx.createLinearGradient(0, 0, w * 0.3, h);
  bgGrad.addColorStop(0, p[3] || "#111");
  bgGrad.addColorStop(0.5, p[4] || "#0a0a0a");
  bgGrad.addColorStop(1, darkenColor(p[3] || "#111", 0.5));
  bgCtx.fillStyle = bgGrad;
  bgCtx.fillRect(0, 0, w, h);

  if (state.bgImage) {
    bgCtx.save();
    if (state.bgBlur > 0) {
      bgCtx.filter = 'blur(' + state.bgBlur + 'px)';
    }
    bgCtx.globalAlpha = state.bgOpacity / 100;
    const imgRatio = state.bgImage.width / state.bgImage.height;
    const canvasRatio = w / h;
    let sx = 0, sy = 0, sw = state.bgImage.width, sh = state.bgImage.height;
    if (imgRatio > canvasRatio) {
      sw = state.bgImage.height * canvasRatio;
      sx = (state.bgImage.width - sw) / 2;
    } else {
      sh = state.bgImage.width / canvasRatio;
      sy = (state.bgImage.height - sh) / 2;
    }
    bgCtx.drawImage(state.bgImage, sx, sy, sw, sh, 0, 0, w, h);
    bgCtx.filter = 'none';
    
    if (state.bgDarken > 0) {
      bgCtx.globalAlpha = state.bgDarken / 100;
      bgCtx.fillStyle = '#000000';
      bgCtx.fillRect(0, 0, w, h);
    }
    bgCtx.globalAlpha = 1;
    bgCtx.restore();
  }

  // Scanline texture
  bgCtx.globalAlpha = 0.03;
  for (let i = 0; i < h; i += 2) {
    bgCtx.fillStyle = i % 4 === 0 ? "#fff" : "#000";
    bgCtx.fillRect(0, i, w, 1);
  }
  bgCtx.globalAlpha = 1;

  bgCacheValid = true;
}

export function initParticles() {
  const { w, h } = FORMATS[state.format];
  state.particles = [];
  for (let i = 0; i < 60; i++) {
    state.particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.3 - 0.2,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.3 + 0.05,
    });
  }
}

function updateParticles() {
  const { w, h } = FORMATS[state.format];
  state.particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = w;
    if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h;
    if (p.y > h) p.y = 0;
  });
}

export function renderCanvas(exportMode = false, timestamp = null, freqOverride = null) {
  const { w, h } = FORMATS[state.format];
  const scale = exportMode ? 1 : PREVIEW_SCALE;
  const cw = w * scale;
  const ch = h * scale;

  canvas.width = cw;
  canvas.height = ch;
  ctx.save();
  ctx.scale(scale, scale);

  const p = state.palette;

  if (!bgCacheValid) {
    renderBackground(w, h, p);
  }
  ctx.drawImage(bgCanvas, 0, 0);

  // Accent glow
  const glowGrad = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.6);
  glowGrad.addColorStop(0, hexToRgba(p[0], 0.12));
  glowGrad.addColorStop(0.5, hexToRgba(p[1] || p[0], 0.05));
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, w, h);

  // Particles
  if (state.animations.particles) {
    updateParticles();
    state.particles.forEach(pt => {
      ctx.globalAlpha = pt.opacity;
      ctx.fillStyle = p[0];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  let reveal = 1;
  if (timestamp && state.revealStartTime) {
    reveal = Math.min(1, (timestamp - state.revealStartTime) / 2000);
  }

  // Waveform visualizer
  if (state.animations.waveform) {
    let dataArray = freqOverride;
    
    // LIVE VISUALIZER FIX: Use the offline FFT calculation based on current playback time
    // This ensures parity with export and avoids browser CORS/autoplay bugs with AnalyserNode
    if (!dataArray && state.isPlaying && state.audioBuffer) {
      const curTime = state.audioElement.currentTime;
      const fps = 30; // match export fps
      const frameIdx = Math.floor(curTime * fps);
      dataArray = getFreqDataForFrame(frameIdx, fps);
    }

    if (dataArray && dataArray.length > 0) {
      const barCount = 64;
      const barWidth = w / barCount;
      const waveY = h * 0.72;
      const maxBarH = h * 0.15;

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor(i * dataArray.length / barCount);
        const val = dataArray[idx] / 255;
        const barH = val * maxBarH;

        const barGrad = ctx.createLinearGradient(0, waveY - barH, 0, waveY);
        barGrad.addColorStop(0, hexToRgba(p[0], 0.9));
        barGrad.addColorStop(0.6, hexToRgba(p[1] || p[0], 0.4));
        barGrad.addColorStop(1, hexToRgba(p[0], 0.1));

        ctx.fillStyle = barGrad;
        const x = i * barWidth + 1;
        const bw = barWidth - 2;

        ctx.beginPath();
        ctx.roundRect(x, waveY - barH, bw, barH, [2, 2, 0, 0]);
        ctx.fill();

        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, waveY + 2, bw, barH * 0.35);
        ctx.globalAlpha = 1;
      }
    } else if (state.mood) {
      const barCount = 64;
      const barWidth = w / barCount;
      const waveY = h * 0.72;
      const maxBarH = h * 0.08;
      for (let i = 0; i < barCount; i++) {
        const val = (Math.sin(i * 0.3) * 0.3 + 0.4) * state.energy;
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = p[0];
        ctx.fillRect(i * barWidth + 1, waveY - val * maxBarH, barWidth - 2, val * maxBarH);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Decorative line
  ctx.strokeStyle = hexToRgba(p[0], 0.3);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.15);
  ctx.lineTo(w * 0.9, h * 0.15);
  ctx.stroke();

  // Quote
  const textRevealAlpha = state.animations.textReveal ? easeOut(reveal) : 1;
  const textSlide = state.animations.textReveal ? (1 - easeOut(reveal)) * 30 : 0;

  if (state.quote) {
    ctx.globalAlpha = textRevealAlpha;
    ctx.fillStyle = "#f5f0eb";
    ctx.textAlign = "left";

    const quoteX = w * 0.1;
    const quoteMaxW = w * 0.8;
    const fontSize = state.format === "1:1" ? 38 : 42;
    ctx.font = 'italic 300 ' + fontSize + 'px "Playfair Display", serif';

    const lines = wrapText(ctx, '“' + state.quote + '”', quoteMaxW);
    const lineHeight = fontSize * 1.5;
    const startY = h * 0.35 + textSlide;

    lines.forEach((line, i) => ctx.fillText(line, quoteX, startY + i * lineHeight));

    if (state.attribution) {
      ctx.font = '500 ' + Math.floor(fontSize * 0.32) + 'px "Inter", sans-serif';
      ctx.fillStyle = hexToRgba(p[0], 0.8);
      ctx.fillText("— " + state.attribution.toUpperCase(), quoteX, startY + lines.length * lineHeight + 30);
    }
    ctx.globalAlpha = 1;
  }

  // Logo
  if (state.logoImage) {
    const logoRevealAlpha = state.animations.logoReveal ? easeOut(reveal) : 1;
    const logoAnimScale = state.animations.logoReveal ? 0.9 + easeOut(reveal) * 0.1 : 1;
    ctx.globalAlpha = logoRevealAlpha;

    const logoMaxW = w * (state.logoSize / 100);
    const logoRatio = state.logoImage.width / state.logoImage.height;
    const logoW = logoMaxW;
    const logoH = logoMaxW / logoRatio;

    const logoX = w * (state.logoPosX / 100);
    const logoY = h * (state.logoPosY / 100);

    ctx.save();
    ctx.translate(logoX + logoW / 2, logoY);
    ctx.scale(logoAnimScale, logoAnimScale);

    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.drawImage(state.logoImage, -logoW / 2, -logoH / 2, logoW, logoH);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.drawImage(state.logoImage, -logoW / 2, -logoH / 2, logoW, logoH);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Bottom line
  ctx.strokeStyle = hexToRgba(p[0], 0.2);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h * 0.88);
  ctx.lineTo(w * 0.9, h * 0.88);
  ctx.stroke();

  ctx.restore();
}

export function animate(timestamp) {
  if (!state.exporting) {
    renderCanvas(false, timestamp);
    updatePlayerTime();
  }
  requestAnimationFrame(animate);
}
