/* core: drobė (480×272 žaidimo pikselių, sveikas mastelis), įvestis (pelė, lietimas, klaviatūra, pultelis), pikselinis šriftas, garsas, išsaugojimas, Poki SDK */
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const smooth = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
/* Pastovus atsitiktinumas (piešiniams: ta pati plytelė visada atrodo vienodai) */
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/* ---------- Drobė: viskas piešiama 480×272 drobėje (30×17 plytelių po 16 px), paskui padidinama sveiku skaičiumi ---------- */
const GW = 480, GH = 272, TS = 16, COLS = 30, ROWS = 17;
const cv = document.getElementById('c'), cx2 = cv.getContext('2d');
const lo = document.createElement('canvas'); lo.width = GW; lo.height = GH;
let ctx = lo.getContext('2d');   // piešimo kontekstas (laikinai keičiamas didinamiems sprite'ams)
let K = 2;
function resize() {
  const vw = innerWidth, vh = innerHeight, dpr = Math.min(3, devicePixelRatio || 1);
  const pw = vw * dpr, ph = vh * dpr;
  K = Math.max(1, Math.floor(Math.min(pw / GW, ph / GH)));   // sveikas mastelis - pikseliai aštrūs
  if (Math.min(pw / GW, ph / GH) - K > .35 && pw / GW < 3) K = Math.min(pw / GW, ph / GH);   // mažas ekranas: geriau trupmeninis nei didelis rėmas
  const w = Math.floor(GW * K), h = Math.floor(GH * K);
  cv.width = w; cv.height = h; cv.style.width = w / dpr + 'px'; cv.style.height = h / dpr + 'px';
  cv.style.left = Math.floor((vw - w / dpr) / 2) + 'px'; cv.style.top = Math.floor((vh - h / dpr) / 2) + 'px';
  ctx.imageSmoothingEnabled = false; cx2.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();
function present() { cx2.imageSmoothingEnabled = false; cx2.drawImage(lo, 0, 0, cv.width, cv.height); }
function loadJson(src) { return fetch(src).then(r => r.json()); }

/* ---------- Pikselinis šriftas (5×10, 2 eilutės diakritikams) ---------- */
const FONT = { at: {}, idx: {}, white: null, data: null };
function fontInit(data) {
  FONT.data = data; const keys = Object.keys(data); const c = document.createElement('canvas'); c.width = keys.length * 6; c.height = 10;
  const g = c.getContext('2d'); g.fillStyle = '#fff';
  keys.forEach((k, i) => { FONT.idx[k] = i; data[k].forEach((row, y) => { for (let x = 0; x < 5; x++) if ((row >> (4 - x)) & 1) g.fillRect(i * 6 + x, y, 1, 1); }); });
  FONT.white = c;
}
function fontCol(col) {
  if (FONT.at[col]) return FONT.at[col];
  const c = document.createElement('canvas'); c.width = FONT.white.width; c.height = 10; const g = c.getContext('2d');
  g.drawImage(FONT.white, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, 10);
  return FONT.at[col] = c;
}
const textW = (s, sc) => { s = String(s); return s.length ? (s.length * 6 - 1) * (sc || 1) : 0; };
const glyphOf = ch => { let k = FONT.idx[ch]; if (k === undefined) k = FONT.idx[ch.normalize('NFD')[0]]; return k; };
/* al: 0 kairė, .5 centras, 1 dešinė; y - raidės viršus; sh - šešėlio spalva (null - be šešėlio) */
function text(s, x, y, sc, col, al, sh) {
  if (!FONT.white) return; sc = sc || 1; s = String(s).toUpperCase(); x = Math.round(x - textW(s, sc) * (al || 0)); y = Math.round(y);
  if (sh !== null) drawStr(fontCol(sh || '#0B0A10'), s, x, y + sc, sc);
  drawStr(fontCol(col || '#fff'), s, x, y, sc);
}
const fitSc = (s, w, sc) => { s = String(s); while (sc > 1 && textW(s, sc) > w) sc--; return sc; };
function drawStr(atl, s, x, y, sc) {
  for (let i = 0; i < s.length; i++) { const k = glyphOf(s[i]); if (k !== undefined && s[i] !== ' ') ctx.drawImage(atl, k * 6, 0, 5, 10, x + i * 6 * sc, y - 2 * sc, 5 * sc, 10 * sc); }
}

/* ---------- Įvestis: pelė (taikymas aukščiu, laikyti - šaudyti), lietimas (vilkti pirštu - taikymas, laikyti - šaudyti), klaviatūra, pultelis ---------- */
const keys = {};
let touchUI = matchMedia('(pointer: coarse)').matches;
/* ptr: down - laikoma (šaudoma); y - pelės aukštis; dy - lietimo poslinkis nuo paskutinio kadro */
const ptr = { down: false, id: null, y: null, ly: 0, dy: 0, x: 0, mouse: false };
let PAD = null, padPrev = {};
function padRead() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const g of gps) { if (!g || !g.connected) continue;
    const b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > .5));
    let y = g.axes[1] || 0; if (Math.abs(y) < .25) y = 0; if (!y) y = (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
    let x = g.axes[0] || 0; if (Math.abs(x) < .35) x = 0; if (!x) x = (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
    const p = { x, y, fire: b(0) || b(7), big: b(2) || b(3) || b(5), start: b(9), back: b(8) || b(1), up: y < -.6, down: y > .6, ok: b(0) };
    p.active = !!(p.x || p.y || p.fire || p.big || p.start || p.back); if (p.active) return p; }
  return null;
}
const padPress = k => PAD && PAD[k] && !padPrev[k];
let BTN = [], BTN_NEXT = [], anyInput = false, hover = null;
const toLo = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * GW, (e.clientY - r.top) / r.height * GH]; };
function button(x, y, w, h, fn, id) { BTN_NEXT.push({ x, y, w, h, fn, id }); }
function hitBtn(px, py) { for (let i = BTN.length - 1; i >= 0; i--) { const b = BTN[i]; if (px >= b.x && py >= b.y && px < b.x + b.w && py < b.y + b.h) return b; } return null; }
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); try { window.focus(); } catch (_) { } audioInit(); anyInput = true;
  touchUI = e.pointerType === 'touch' || e.pointerType === 'pen';
  const [px, py] = toLo(e);
  const b = hitBtn(px, py); if (b) { sfx('click'); b.fn(); return; }
  if (ptr.down) return;   // antras pirštas nieko nekeičia
  ptr.down = true; ptr.id = e.pointerId; ptr.ly = py; ptr.x = px; ptr.mouse = e.pointerType === 'mouse'; if (ptr.mouse) ptr.y = py;
  try { cv.setPointerCapture(e.pointerId); } catch (_) { }
});
cv.addEventListener('pointermove', e => {
  const [px, py] = toLo(e); hover = hitBtn(px, py);
  if (e.pointerType === 'mouse') { ptr.y = py; ptr.mouse = true; }
  if (ptr.down && e.pointerId === ptr.id && !ptr.mouse) { ptr.dy += py - ptr.ly; ptr.ly = py; }
});
function ptrUp(e) { if (e.pointerId === ptr.id) { ptr.down = false; ptr.id = null; } }
cv.addEventListener('pointerup', ptrUp); cv.addEventListener('pointercancel', ptrUp);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = null; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  audioInit(); anyInput = true; if (!keys[e.code]) onKey(e.code); keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; ptr.down = false; ptr.id = null; onBlur(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) onBlur(); });

/* ---------- Garsas: viskas sintezuojama (0 baitų) ---------- */
let AC = null, master = null, sfxBus = null, muted = false, adMute = false;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); sfxBus = AC.createGain(); sfxBus.connect(master); setVol(); } catch (_) { AC = null; }
}
function setVol() { if (!master) return; master.gain.value = adMute ? 0 : .5; sfxBus.gain.value = save && save.sfx === false ? 0 : 1; }
let noiseBuf = null;
function noise(dur, f0, f1, vol, type, delay) {
  if (!AC) return; const t = AC.currentTime + (delay || 0);
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; const fl = AC.createBiquadFilter(); fl.type = type || 'lowpass';
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur);
}
function tone(f, dur, vol, type, f2, delay) {
  if (!AC) return; const t = AC.currentTime + (delay || 0); const o = AC.createOscillator(); o.type = type || 'square';
  o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur);
}
const SFX_T = {};
function sfx(k) {
  const now = performance.now(); if (SFX_T[k] && now - SFX_T[k] < (k === 'pop' || k === 'split' ? 55 : 40)) return; SFX_T[k] = now;
  switch (k) {
    case 'shoot': tone(rnd(520, 640), .05, .035, 'triangle', 260); break;
    case 'split': tone(rnd(700, 820), .06, .045, 'sine', 1300); break;
    case 'pop': noise(.05, 2200, 700, .06, 'bandpass'); tone(rnd(380, 460), .04, .03, 'sine', 180); break;
    case 'hit': noise(.06, 900, 300, .1); break;
    case 'crack': noise(.12, 1500, 200, .16); tone(140, .08, .06, 'square', 80); break;
    case 'tower': noise(.1, 500, 120, .2); tone(90, .1, .08, 'sine', 60); break;
    case 'bubble': [600, 900, 1200].forEach((f, i) => tone(f, .06, .05, 'sine', f * 1.2, i * .04)); break;
    case 'salt': noise(.08, 4000, 1600, .06, 'highpass'); break;
    case 'heart': tone(300, .2, .09, 'square', 110); noise(.2, 800, 100, .15); break;
    case 'big': tone(140, .3, .1, 'sine', 420); noise(.25, 300, 1200, .08, 'bandpass'); break;
    case 'boing': tone(220, .12, .06, 'sine', 520); break;
    case 'warp': tone(900, .15, .05, 'triangle', 200); break;
    case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .14, .08, 'square', null, i * .08)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, .18, .07, 'triangle', null, i * .12)); break;
    case 'coin': tone(988, .05, .05, 'square'); tone(1318, .09, .05, 'square', null, .05); break;
    case 'buy': [659, 880, 1175].forEach((f, i) => tone(f, .08, .07, 'square', null, i * .05)); break;
    case 'click': tone(660, .04, .06, 'square'); break;
    case 'nope': tone(220, .08, .06, 'square'); tone(160, .12, .06, 'square', null, .08); break;
    case 'step': noise(.03, 1400, 600, .035, 'bandpass'); break;
    case 'whoosh': noise(.3, 300, 2400, .07, 'bandpass'); break;
    case 'star': [784, 988, 1318, 1568].forEach((f, i) => tone(f, .1, .07, 'square', null, i * .05)); break;
    case 'grr': tone(110, .25, .08, 'sawtooth', 80); break;
    case 'boss': tone(70, .5, .14, 'sawtooth', 50); noise(.4, 300, 80, .2); break;
  }
}

/* ---------- Išsaugojimas: localStorage su try/catch (inkognito - žaidžiama be įrašo) ---------- */
const SAVE_KEY = /[?&](shots|solver|test)/.test(location.search) ? 'blobrush_test' : 'blobrush_v1';   // įrankių kortelės neliečia žaidėjo įrašo
let save = null;
function loadSave() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (_) { }
  save = Object.assign({ v: 1, stars: {}, unlocked: 1, sfx: true, lang: null, coins: 0, up: { rate: 0, big: 0, power: 0 }, hats: [0], hat: 0, color: 0, pops: 0 }, s || {});
  save.up = Object.assign({ rate: 0, big: 0, power: 0 }, save.up);
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } }

/* ---------- Poki SDK: tikras Poki puslapyje; kitaip - vietinis pakaitalas (bandymams, „reklama" 1 s) ---------- */
const Poki = {
  sdk: null, playing: false, adShow: 0,
  init() {
    this.sdk = window.PokiSDK || null;
    if (!this.sdk) { console.log('[poki] SDK nėra - vietinis režimas'); return Promise.resolve(); }
    return this.sdk.init().catch(() => { });   // reklamų blokatorius - žaidžiama toliau
  },
  loaded() { this.sdk && this.sdk.gameLoadingFinished(); },
  start() { if (this.playing) return; this.playing = true; this.sdk ? this.sdk.gameplayStart() : console.log('[poki] gameplayStart'); },
  stop() { if (!this.playing) return; this.playing = false; this.sdk ? this.sdk.gameplayStop() : console.log('[poki] gameplayStop'); },
  commercial() {
    this.stop();
    if (!this.sdk) { console.log('[poki] commercialBreak'); return this.fake(.6); }
    return this.sdk.commercialBreak(() => { adMute = true; setVol(); }).then(() => { adMute = false; setVol(); });
  },
  rewarded() {
    this.stop();
    if (!this.sdk) { console.log('[poki] rewardedBreak'); return this.fake(1.2).then(() => true); }
    return this.sdk.rewardedBreak({ size: 'small', onStart: () => { adMute = true; setVol(); } }).then(ok => { adMute = false; setVol(); return !!ok; });
  },
  fake(t) { adMute = true; setVol(); this.adShow = t; return new Promise(ok => setTimeout(() => { adMute = false; setVol(); this.adShow = 0; ok(); }, t * 1000)); }
};
