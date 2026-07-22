import { state, $, $$, QUOTES } from './state.js';
import { handleAudioFile, togglePlayback } from './audio.js';
import { renderCanvas, invalidateBgCache, initParticles } from './visualizer.js';
import { selectRandomQuote, loadPersonalQuote } from './main.js';

// DOM Elements
const audioZone = $("#audioZone");
const audioInput = $("#audioInput");
const logoZone = $("#logoZone");
const logoInput = $("#logoInput");
const bgZone = $("#bgZone");
const bgInput = $("#bgInput");

export function initUI() {
  // Audio Upload
  audioZone.addEventListener("click", () => audioInput.click());
  audioZone.addEventListener("dragover", (e) => { e.preventDefault(); audioZone.classList.add("active"); });
  audioZone.addEventListener("dragleave", () => audioZone.classList.remove("active"));
  audioZone.addEventListener("drop", (e) => {
    e.preventDefault();
    audioZone.classList.remove("active");
    if (e.dataTransfer.files[0]) handleAudioFile(e.dataTransfer.files[0]);
  });
  audioInput.addEventListener("change", (e) => { if (e.target.files[0]) handleAudioFile(e.target.files[0]); });

  // Player controls
  $("#playPauseBtn").addEventListener("click", togglePlayback);
  $("#seekBar").addEventListener("input", () => {
    if (state.audioElement.src) {
      state.audioElement.currentTime = parseFloat($("#seekBar").value);
    }
  });

  $("#audioRemove").addEventListener("click", () => {
    state.audioElement.pause();
    state.audioElement.removeAttribute('src');
    state.audioFile = null;
    state.audioBuffer = null;
    state.isPlaying = false;
    state.mood = null;
    $("#playerTransport").classList.remove("visible");
    audioZone.style.display = "";
    $("#moodDisplay").classList.remove("visible");
    $("#analyzing").classList.remove("visible");
    updateExportButtons();
  });

  $("#exportFullLength").addEventListener("click", () => {
    if (state.audioElement && state.audioElement.duration) {
      $("#exportDuration").value = Math.floor(state.audioElement.duration);
    }
  });

  // Logo Upload
  logoZone.addEventListener("click", () => logoInput.click());
  logoZone.addEventListener("dragover", (e) => { e.preventDefault(); logoZone.classList.add("active"); });
  logoZone.addEventListener("dragleave", () => logoZone.classList.remove("active"));
  logoZone.addEventListener("drop", (e) => {
    e.preventDefault();
    logoZone.classList.remove("active");
    if (e.dataTransfer.files[0]) handleLogoFile(e.dataTransfer.files[0]);
  });
  logoInput.addEventListener("change", (e) => { if (e.target.files[0]) handleLogoFile(e.target.files[0]); });

  // Logo sliders
  $("#logoSize").addEventListener("input", () => { state.logoSize = parseInt($("#logoSize").value); renderCanvas(); });
  $("#logoPosX").addEventListener("input", () => { state.logoPosX = parseInt($("#logoPosX").value); renderCanvas(); });
  $("#logoPosY").addEventListener("input", () => { state.logoPosY = parseInt($("#logoPosY").value); renderCanvas(); });

  // Background Upload
  bgZone.addEventListener("click", () => bgInput.click());
  bgZone.addEventListener("dragover", (e) => { e.preventDefault(); bgZone.classList.add("active"); });
  bgZone.addEventListener("dragleave", () => bgZone.classList.remove("active"));
  bgZone.addEventListener("drop", (e) => {
    e.preventDefault();
    bgZone.classList.remove("active");
    if (e.dataTransfer.files[0]) handleBgFile(e.dataTransfer.files[0]);
  });
  bgInput.addEventListener("change", (e) => { if (e.target.files[0]) handleBgFile(e.target.files[0]); });

  $("#bgRemove").addEventListener("click", () => {
    state.bgImage = null;
    $("#bgPreview").classList.remove("visible");
    $("#bgControls").classList.remove("visible");
    bgZone.style.display = "";
    invalidateBgCache();
    renderCanvas();
  });

  // Background controls
  $("#bgOpacity").addEventListener("input", () => { state.bgOpacity = parseInt($("#bgOpacity").value); invalidateBgCache(); renderCanvas(); });
  $("#bgBlur").addEventListener("input", () => { state.bgBlur = parseInt($("#bgBlur").value); invalidateBgCache(); renderCanvas(); });
  $("#bgDarken").addEventListener("input", () => { state.bgDarken = parseInt($("#bgDarken").value); invalidateBgCache(); renderCanvas(); });

  // AI Image generation via Pollinations.ai
  $("#bgGenerate").addEventListener("click", async () => {
    const prompt = $("#bgPrompt").value.trim();
    if (!prompt) return;

    const btn = $("#bgGenerate");
    btn.disabled = true;
    btn.textContent = "Generating...";
    btn.classList.add("generating");

    const w = state.format === "1:1" ? 1080 : 1080;
    const h = state.format === "1:1" ? 1080 : 1920;
    const encodedPrompt = encodeURIComponent(prompt + ", cinematic, high quality, dark moody atmosphere");
    const url = 'https://image.pollinations.ai/prompt/' + encodedPrompt + '?width=' + w + '&height=' + h + '&nologo=true&seed=' + Math.floor(Math.random() * 99999);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      loadBgFromURL(objectURL);
    } catch (err) {
      console.error("Image generation failed:", err);
      loadBgFromURL(url);
    }

    btn.disabled = false;
    btn.textContent = "Generate";
    btn.classList.remove("generating");
  });

  // Quotes
  $$(".quote-category").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".quote-category").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeCategory = btn.dataset.cat;
      if (btn.dataset.cat === "personal") loadPersonalQuote();
      else selectRandomQuote(btn.dataset.cat);
    });
  });

  $("#quoteText").addEventListener("input", () => { state.quote = $("#quoteText").value; renderCanvas(); });
  $("#quoteAttribution").addEventListener("input", () => { state.attribution = $("#quoteAttribution").value.replace(/^—\s*/, ""); renderCanvas(); });

  $("#shuffleQuote").addEventListener("click", () => {
    if (state.activeCategory === "personal") loadPersonalQuote();
    else selectRandomQuote(state.activeCategory);
  });
  
  $("#saveToBank").addEventListener("click", () => {
    const text = $("#quoteText").value.trim();
    if (text && !state.personalBank.includes(text)) {
      state.personalBank.push(text);
      localStorage.setItem("ph_quote_bank", JSON.stringify(state.personalBank));
    }
  });

  // Bank modal
  $("#openBank").addEventListener("click", () => { renderBankList(); $("#bankModal").classList.add("visible"); });
  $("#bankClose").addEventListener("click", () => $("#bankModal").classList.remove("visible"));
  $("#bankModal").addEventListener("click", (e) => { if (e.target === $("#bankModal")) $("#bankModal").classList.remove("visible"); });
  $("#bankAddBtn").addEventListener("click", () => {
    const text = $("#bankNewQuote").value.trim();
    if (text) {
      state.personalBank.push(text);
      localStorage.setItem("ph_quote_bank", JSON.stringify(state.personalBank));
      $("#bankNewQuote").value = "";
      renderBankList();
    }
  });

  // Format & Animation toggles
  $$(".format-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".format-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.format = btn.dataset.format;
      initParticles();
      invalidateBgCache();
      renderCanvas();
    });
  });

  $$(".toggle-switch").forEach(sw => {
    sw.addEventListener("click", () => {
      sw.classList.toggle("on");
      state.animations[sw.dataset.toggle] = sw.classList.contains("on");
      renderCanvas();
    });
  });

  $$(".render-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".render-mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.renderMode = btn.dataset.mode;
    });
  });

  // Presets
  $("#savePreset").addEventListener("click", savePreset);

  // Palettes
  $$(".palette-swatch").forEach((sw, i) => {
    sw.addEventListener("input", (e) => {
      state.palette[i] = e.target.value;
      invalidateBgCache();
      renderCanvas();
    });
  });

  renderLogoLibrary();
  renderPresets();
}

function handleLogoFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataURL = e.target.result;
    loadLogoFromDataURL(dataURL, true);
  };
  reader.readAsDataURL(file);
}

export function loadLogoFromDataURL(dataURL, addToLibrary) {
  const img = new Image();
  img.onload = () => {
    state.logoImage = img;
    state.logoDataURL = dataURL;
    logoZone.innerHTML = '<img class="logo-preview" src="' + dataURL + '"><div class="upload-text" style="font-size:0.65rem;color:var(--text-muted)">Logo loaded. Click to replace.</div>';
    logoZone.classList.add("has-file");
    $("#logoControls").classList.add("visible");

    if (addToLibrary && !state.logoLibrary.includes(dataURL)) {
      if (state.logoLibrary.length >= 10) state.logoLibrary.shift();
      state.logoLibrary.push(dataURL);
      localStorage.setItem("ph_logo_library", JSON.stringify(state.logoLibrary));
      renderLogoLibrary();
    }
    highlightActiveLogoInLibrary();
    renderCanvas();
  };
  img.src = dataURL;
}

function renderLogoLibrary() {
  const container = $("#logoLibrary");
  container.innerHTML = "";
  state.logoLibrary.forEach((dataURL, i) => {
    const item = document.createElement("div");
    item.className = "logo-lib-item";
    if (state.logoDataURL === dataURL) item.classList.add("active");
    item.innerHTML = '<img src="' + dataURL + '"><button class="logo-lib-delete">&times;</button>';
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("logo-lib-delete")) return;
      loadLogoFromDataURL(dataURL, false);
    });
    item.querySelector(".logo-lib-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      state.logoLibrary.splice(i, 1);
      localStorage.setItem("ph_logo_library", JSON.stringify(state.logoLibrary));
      renderLogoLibrary();
    });
    container.appendChild(item);
  });
}

function highlightActiveLogoInLibrary() {
  $$(".logo-lib-item").forEach(item => {
    const img = item.querySelector("img");
    item.classList.toggle("active", img && img.src === state.logoDataURL);
  });
}

function handleBgFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => loadBgFromURL(e.target.result);
  reader.readAsDataURL(file);
}

function loadBgFromURL(src) {
  const img = new Image();
  if (src.startsWith('http') && !src.startsWith('blob:')) {
    img.crossOrigin = "anonymous";
  }
  
  img.onload = () => {
    state.bgImage = img;
    $("#bgPreviewImg").src = src;
    $("#bgPreview").classList.add("visible");
    $("#bgControls").classList.add("visible");
    bgZone.style.display = "none";
    invalidateBgCache();
    renderCanvas();
  };
  img.onerror = () => {
    const proxyImg = new Image();
    if (src.startsWith('http') && !src.startsWith('blob:')) {
      proxyImg.crossOrigin = "anonymous";
    }
    proxyImg.onload = () => {
      state.bgImage = proxyImg;
      $("#bgPreviewImg").src = src;
      $("#bgPreview").classList.add("visible");
      $("#bgControls").classList.add("visible");
      bgZone.style.display = "none";
      invalidateBgCache();
      renderCanvas();
    };
    proxyImg.src = src;
  };
  img.src = src;
}

export function updateMoodDisplay() {
  $("#moodDisplay").classList.add("visible");
  $("#moodLabel").textContent = state.mood.charAt(0).toUpperCase() + state.mood.slice(1);
  $("#meterEnergy").style.width = (state.energy * 100) + "%";
  $("#meterWarmth").style.width = (state.warmth * 100) + "%";
  $("#meterDarkness").style.width = (state.darkness * 100) + "%";
  $("#meterTempo").style.width = (state.tempo * 100) + "%";
  $$(".palette-swatch").forEach((sw, i) => {
    if (state.palette[i]) sw.value = state.palette[i];
  });
}

export function updatePlayerTime() {
  if (!state.audioElement.src) return;
  const cur = state.audioElement.currentTime || 0;
  const dur = state.audioElement.duration || 0;
  
  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  $("#playerTime").textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
  if (!state.exporting) {
    $("#seekBar").value = cur;
    $("#seekBar").max = dur;
  }
}

export function updateExportButtons() {
  const ok = state.mood !== null;
  $("#exportImage").disabled = !ok;
  $("#exportVideo").disabled = !ok;
}

function renderBankList() {
  const list = $("#bankList");
  list.innerHTML = "";
  state.personalBank.forEach((q, i) => {
    const item = document.createElement("div");
    item.className = "bank-quote-item";
    item.innerHTML = '<span class="bank-quote-text">“' + q + '”</span><button class="bank-quote-delete" data-i="' + i + '">&times;</button>';
    item.querySelector(".bank-quote-text").addEventListener("click", () => {
      state.quote = q;
      state.attribution = "PERSONAL";
      $("#quoteText").value = q;
      $("#quoteAttribution").value = "— PERSONAL";
      $("#bankModal").classList.remove("visible");
      renderCanvas();
    });
    item.querySelector(".bank-quote-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      state.personalBank.splice(i, 1);
      localStorage.setItem("ph_quote_bank", JSON.stringify(state.personalBank));
      renderBankList();
    });
    list.appendChild(item);
  });
}

function savePreset() {
  const name = prompt("Preset name:");
  if (!name || !name.trim()) return;
  const preset = {
    name: name.trim(),
    format: state.format,
    quote: state.quote,
    attribution: state.attribution,
    activeCategory: state.activeCategory,
    animations: { ...state.animations },
    logoSize: state.logoSize,
    logoPosX: state.logoPosX,
    logoPosY: state.logoPosY,
    logoDataURL: state.logoDataURL,
    renderMode: state.renderMode,
  };
  state.presets.push(preset);
  localStorage.setItem("ph_presets", JSON.stringify(state.presets));
  renderPresets();
}

function loadPreset(preset) {
  state.format = preset.format || "9:16";
  $$(".format-btn").forEach(b => b.classList.toggle("active", b.dataset.format === state.format));

  state.quote = preset.quote || "";
  state.attribution = preset.attribution || "";
  $("#quoteText").value = state.quote;
  $("#quoteAttribution").value = state.attribution ? "— " + state.attribution : "";

  if (preset.activeCategory) {
    state.activeCategory = preset.activeCategory;
    $$(".quote-category").forEach(b => b.classList.toggle("active", b.dataset.cat === state.activeCategory));
  }

  if (preset.animations) {
    state.animations = { ...preset.animations };
    $$(".toggle-switch").forEach(sw => {
      sw.classList.toggle("on", !!state.animations[sw.dataset.toggle]);
    });
  }

  state.logoSize = preset.logoSize || 30;
  state.logoPosX = preset.logoPosX || 10;
  state.logoPosY = preset.logoPosY || 90;
  $("#logoSize").value = state.logoSize;
  $("#logoPosX").value = state.logoPosX;
  $("#logoPosY").value = state.logoPosY;

  state.renderMode = preset.renderMode || "silent";
  $$(".render-mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === state.renderMode));

  if (preset.logoDataURL) {
    loadLogoFromDataURL(preset.logoDataURL, false);
  }

  initParticles();
  invalidateBgCache();
  renderCanvas();
}

function renderPresets() {
  const bar = $("#presetsBar");
  bar.innerHTML = "";
  state.presets.forEach((p, i) => {
    const chip = document.createElement("button");
    chip.className = "preset-chip";
    chip.innerHTML = p.name + '<span class="preset-delete">&times;</span>';
    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("preset-delete")) {
        state.presets.splice(i, 1);
        localStorage.setItem("ph_presets", JSON.stringify(state.presets));
        renderPresets();
        return;
      }
      loadPreset(p);
    });
    bar.appendChild(chip);
  });
}
