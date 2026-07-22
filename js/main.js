import { state, $, QUOTES, MOOD_QUOTE_MAP } from './state.js';
import { initUI } from './ui.js';
import { animate, initParticles, renderCanvas } from './visualizer.js';
import { setupExportButtons } from './export.js';

export function selectRandomQuote(category) {
  const pool = QUOTES[category];
  if (!pool || pool.length === 0) return;
  const q = pool[Math.floor(Math.random() * pool.length)];
  state.quote = q.text;
  state.attribution = q.attr;
  $("#quoteText").value = q.text;
  $("#quoteAttribution").value = "— " + q.attr;
  renderCanvas();
}

export function loadPersonalQuote() {
  if (state.personalBank.length === 0) {
    state.quote = "Add your own quotes to the personal bank...";
    state.attribution = "YOU";
    $("#quoteText").value = state.quote;
    $("#quoteAttribution").value = "— YOU";
    return;
  }
  const q = state.personalBank[Math.floor(Math.random() * state.personalBank.length)];
  state.quote = q;
  state.attribution = "PERSONAL";
  $("#quoteText").value = q;
  $("#quoteAttribution").value = "— PERSONAL";
  renderCanvas();
}

export function selectMoodQuote() {
  if (!state.mood) return;
  const cats = MOOD_QUOTE_MAP[state.mood] || ["prompthaus"];
  const cat = cats[0];
  const buttons = document.querySelectorAll(".quote-category");
  if (buttons.length) {
    buttons.forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
  }
  state.activeCategory = cat;
  selectRandomQuote(cat);
}

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  setupExportButtons();
  initParticles();
  renderCanvas();
  requestAnimationFrame(animate);
});
