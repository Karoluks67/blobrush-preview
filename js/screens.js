/* screens: įžanga, titulinis (gyva scena - botas žaidžia lygį už meniu), pasaulių žemėlapis (takas per peizažą, mama gleivė eina,
   gale - akmenukų tvirtovė), pasaulio pabaiga, žaidimo pabaiga, pikselinė apskritimo užuolaida */
'use strict';

/* ---------- Pikselinė apskritimo užuolaida tarp ekranų ---------- */
let WIPE = null;
function wipe(fn, cx, cy) { if (WIPE) return; WIPE = { t: 0, fn, cx: cx ?? GW / 2, cy: cy ?? GH / 2, done: false }; sfx('whoosh'); }
function drawWipe(dt) {
  if (!WIPE) return; WIPE.t += dt; const D = .3, Rm = Math.hypot(GW, GH);
  if (!WIPE.done && WIPE.t >= D) { WIPE.done = true; WIPE.fn(); if (state === 'play' && L) { WIPE.cx = PX; WIPE.cy = L.mama.y - 8; } }
  const k = WIPE.t < D ? 1 - smooth(WIPE.t / D) : smooth((WIPE.t - D) / D), R = Math.round(k * Rm);
  ctx.fillStyle = '#0E0B1A';
  for (let y = 0; y < GH; y += 2) { const dy = y + 1 - WIPE.cy, hw = R > Math.abs(dy) ? Math.round(Math.sqrt(R * R - dy * dy) / 2) * 2 : -1;
    if (hw < 0) ctx.fillRect(0, y, GW, 2); else { const x0 = Math.round(WIPE.cx - hw), x1 = Math.round(WIPE.cx + hw); ctx.fillRect(0, y, Math.max(0, x0), 2); ctx.fillRect(x1, y, GW - x1, 2); } }
  if (WIPE.t >= D * 2) WIPE = null;
}
/* sprite'o padidinimas: fn piešia į 48×48 drobę, ji padidinama s kartų (pikseliai aštrūs) */
const BIG = document.createElement('canvas'); BIG.width = 48; BIG.height = 48; const BIGX = BIG.getContext('2d');
function bigSprite(fn, x, y, s) {
  BIGX.clearRect(0, 0, 48, 48); const keep = ctx; ctx = BIGX; try { fn(); } finally { ctx = keep; }
  ctx.imageSmoothingEnabled = false; ctx.drawImage(BIG, 0, 0, 48, 48, Math.round(x), Math.round(y), 48 * s, 48 * s);
}

/* ---------- BLOB RUSH logotipas: kampuotos raidės, žalios gleivės su varvekliais ---------- */
const LOGO_M = {
  B: ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '#####.'], L: ['##....', '##....', '##....', '##....', '##....', '##....', '######'],
  O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'], R: ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##'],
  U: ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'], S: ['.#####', '##....', '##....', '.####.', '....##', '....##', '#####.'],
  H: ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'], ' ': ['..', '..', '..', '..', '..', '..', '..'],
};
const LOGO_C = ['#E6FFB0', '#B8F27A', '#8FE35A', '#6CD04A', '#52B83E', '#3FA03A', '#2E8634'];
function drawLogo(cx, y, s, t, word) {
  word = word || 'BLOB RUSH'; const tot = [...word].reduce((a, ch) => a + (LOGO_M[ch][0].length + 1) * s, -s);
  for (const pass of [0, 1, 2, 3]) { let x = Math.round(cx - tot / 2);
    [...word].forEach((ch, i) => { const m = LOGO_M[ch], wob = Math.round(Math.sin(t * 3 + i * .8) * 1.5);
      for (let r = 0; r < 7; r++) for (let c = 0; c < m[r].length; c++) { if (m[r][c] !== '#') continue; const px = x + c * s, py = y + r * s + wob;
        if (pass === 0) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px + 2, py + 3, s, s); }
        else if (pass === 1) { ctx.fillStyle = OUT; ctx.fillRect(px - 2, py - 2, s + 4, s + 4); }
        else if (pass === 2) { ctx.fillStyle = LOGO_C[r]; ctx.fillRect(px, py, s, s); if (r === 0 || m[r - 1][c] !== '#') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(px, py, s, 1); } }
        else if (r === 6 || m[r + 1][c] !== '#') {   // varvekliai po raidėmis
          const v = hash(i, c, 3); if (v < .45) { const len = Math.round((2 + v * 8) * (1 + Math.sin(t * 1.6 + i + c) * .25)); ctx.fillStyle = OUT; ctx.fillRect(px + 1, py + s, s - 2 + 2, len + 1); ctx.fillStyle = LOGO_C[6]; ctx.fillRect(px + 2, py + s, s - 2, len); ctx.fillStyle = LOGO_C[4]; ctx.fillRect(px + 2, py + s + len - 1, s - 2, 1); } } }
      x += (m[0].length + 1) * s; }); }
}

/* ---------- Meniu fonas: pievos žemė su lėtai bėgančiomis gleivėmis ---------- */
let MENU_BG = null, menuBlobs = [];
function drawMenuBg(dt) {
  if (!MENU_BG) { MENU_BG = document.createElement('canvas'); MENU_BG.width = GW; MENU_BG.height = GH; groundArt(MENU_BG.getContext('2d'), 0, WORLD[0]); }
  ctx.drawImage(MENU_BG, 0, 0);
  if (menuBlobs.length < 14 && Math.random() < dt * 3) menuBlobs.push({ x: -8, y: rnd(30, 266), sp: rnd(30, 50), ph: rnd(0, 6), hp: Math.random() < .15 ? 3 : 1 });
  for (const b of menuBlobs) b.x += b.sp * dt; menuBlobs = menuBlobs.filter(b => b.x < GW + 10);
  for (const b of menuBlobs) drawBlob(b.x, b.y, b.hp, Math.floor(gt * 6 + b.ph) % 2, save.color, save.hat);
  ctx.fillStyle = 'rgba(14,11,26,.35)'; ctx.fillRect(0, 0, GW, GH);
}

/* ---------- Titulinis: botas žaidžia lygį už meniu ---------- */
let titleLv = -1, titleT = 0;
function drawTitle(dt) {
  if (titleLv < 0 || !L || L.win > 2 || L.lose > 2 || L.t > 50 || titleLv !== LV) { titleLv = [4, 15, 26, 36, 44, 57][Math.floor(Math.random() * 6)]; startLevel(titleLv, { up: { rate: 3, big: 3, power: 2 } }); BOT = { y: MIDY, t: 0, ph: 0 }; }
  titleT += dt; const keepS = save.sfx; save.sfx = false; setVol();
  const st = state; state = 'demo';
  acc += dt; while (acc >= DT) { step(DT, botInput('smart')); acc -= DT; }
  state = st; save.sfx = keepS; setVol();
  drawPlay(dt);
  ctx.fillStyle = 'rgba(14,11,26,.5)'; ctx.fillRect(0, 0, GW, GH);
  drawLogo(240, 22, 6, gt);
  btn(170, 104, 140, 32, T('play'), COL.btn, startGame, 3, 0);
  btn(170, 144, 68, 24, T('levels'), COL.panel2, () => wipe(() => { state = 'map'; toMapNow(); }), 1, 1);
  btn(242, 144, 68, 24, T('shop'), '#8A5A10', () => openShop('title'), 1, 2);
  if (save.unlocked > 1) { const n = Object.values(save.stars).reduce((a, b) => a + b, 0); starIcon(210, 180); text(n + ' / 180', 220, 180, 1, COL.acc, 0); }
  coinIcon(8, GH - 16); text(save.coins, 18, GH - 17, 1, COL.coin, 0);
  iconBtn(GW - 30, 8, 'gear', () => openSettings('title')); iconBtn(GW - 56, 8, 'snd', quickMute);
  if (!touchUI) text(T('hintKb'), 240, GH - 16, 1, COL.dim, .5);
}

/* ---------- Pasaulių žemėlapis ---------- */
const MAPN = [[44, 214], [88, 186], [132, 212], [180, 188], [222, 156], [268, 176], [314, 150], [352, 180], [394, 152], [436, 112]];
let mapSel = 0, mapW = 0, mapWalk = null, MAP_BG = {}, mapFx = [];
const mapNodes = w => MAPN.map(([x, y], i) => [x + Math.round((hash(i, w, 9) - .5) * 10), y + Math.round((hash(i, w, 10) - .5) * 10)]);
function mapBg(w) {
  if (MAP_BG[w]) return MAP_BG[w]; const W = WORLD[w], c = document.createElement('canvas'); c.width = GW; c.height = GH; const g = c.getContext('2d');
  groundArt(g, w, W);
  const N = mapNodes(w), pts = [];
  for (let i = 0; i < N.length - 1; i++) { const p0 = N[Math.max(0, i - 1)], p1 = N[i], p2 = N[i + 1], p3 = N[Math.min(N.length - 1, i + 2)];
    for (let s = 0; s < 1; s += .02) { const t2 = s * s, t3 = t2 * s, f = (a, b, c2, d) => .5 * (2 * b + (-a + c2) * s + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3); pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); } }
  for (const [x, y] of pts) { g.fillStyle = W.deep; g.fillRect(Math.round(x) - 4, Math.round(y) - 2, 9, 6); }
  for (const [x, y] of pts) { g.fillStyle = W.gD; g.fillRect(Math.round(x) - 3, Math.round(y) - 2, 7, 4); }
  pts.forEach(([x, y], k) => { if (k % 5 === 0) { g.fillStyle = W.g2; g.fillRect(Math.round(x), Math.round(y) - 1, 2, 1); } });
  const far = (x, y) => pts.every(p => Math.hypot(p[0] - x, p[1] - y) > 18) && y > 50 && Math.hypot(x - 436, y - 112) > 34;
  const props = []; for (let i = 0; i < 300; i++) { const x = 8 + Math.floor(hash(i, w, 5) * (GW - 16)), y = 50 + Math.floor(hash(i, w, 6) * (GH - 56)); if (!far(x, y) || props.some(q => Math.hypot(q[0] - x, q[1] - y) < 15)) continue; props.push([x, y, i]); }
  props.sort((a, b) => a[1] - b[1]); for (const [x, y, i] of props) mapProp(g, w, x, y, i);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, GW, 2); g.fillRect(0, GH - 2, GW, 2); g.fillRect(0, 0, 2, GH); g.fillRect(GW - 2, 0, 2, GH);
  return MAP_BG[w] = c;
}
/* peizažo objektai pagal pasaulį */
function mapProp(g, w, x, y, i) {
  const W = WORLD[w], R = (a, b, ww, hh, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, ww, hh); }, v = hash(i, w, 8);
  R(-6, 0, 13, 2, 'rgba(0,0,0,.18)');
  if (w === 0) { if (v < .55) { const h = 12 + Math.floor(v * 10); R(-1, -4, 3, 5, '#6A4A2C'); R(-7, -h, 15, h - 3, OUT); R(-6, -h + 1, 13, h - 5, W.wall[0]); R(-5, -h + 1, 6, 4, W.wall[1]); R(-6, -6, 13, 2, W.wall[2]); R(3, -h + 6, 2, 2, W.acc2); }
    else if (v < .8) { R(-3, -4, 7, 5, OUT); R(-2, -4, 5, 3, '#E0443A'); R(-1, -1, 3, 2, '#F0E6D0'); R(-1, -3, 1, 1, '#FFFFFF'); }
    else { R(-4, -2, 2, 2, W.acc); R(1, -3, 2, 2, W.acc2); R(3, -1, 2, 2, '#FFFFFF'); } }
  else if (w === 1) { if (v < .5) { R(-2, -14, 5, 15, OUT); R(-1, -13, 3, 14, '#5A9A3A'); R(-1, -13, 1, 14, '#8ACA5A'); R(-6, -9, 4, 2, OUT); R(-6, -11, 2, 4, OUT); R(-5, -10, 1, 2, '#5A9A3A'); R(3, -7, 4, 2, OUT); R(5, -10, 2, 5, OUT); R(5, -9, 1, 3, '#5A9A3A'); if (v < .15) R(0, -15, 2, 2, '#FF7A9A'); }
    else if (v < .8) { R(-9, -2, 19, 4, W.gD); R(-6, -4, 13, 2, W.g1); R(-3, -5, 7, 1, W.g2); } else { R(-3, -2, 7, 3, '#E9D9B0'); R(-2, -3, 2, 1, '#E9D9B0'); R(2, -3, 2, 1, '#E9D9B0'); } }
  else if (w === 2) { if (v < .6) { R(-1, -1, 3, 3, '#4A3424'); R(-6, -9, 13, 9, OUT); R(-5, -8, 11, 7, '#2E6A4A'); R(-4, -13, 9, 5, OUT); R(-3, -12, 7, 4, '#2E6A4A'); R(-2, -16, 5, 4, OUT); R(-1, -15, 3, 3, '#2E6A4A'); R(-1, -16, 3, 1, '#FFFFFF'); R(-3, -12, 7, 1, '#FFFFFF'); R(-5, -8, 11, 1, '#FFFFFF'); }
    else if (v < .75) { R(-4, -6, 9, 7, OUT); R(-3, -5, 7, 5, '#FFFFFF'); R(-3, -12, 7, 7, OUT); R(-2, -11, 5, 5, '#FFFFFF'); R(-1, -9, 1, 1, OUT); R(1, -9, 1, 1, OUT); R(0, -8, 2, 1, '#FF8A3A'); R(-3, -6, 7, 1, '#E0443A'); }
    else { R(-6, -1, 13, 3, '#9ED8F5'); R(-4, -1, 8, 1, '#E6F8FF'); } }
  else if (w === 3) { if (v < .45) { R(0, -10, 1, 11, '#F4F1FF'); R(-4, -16, 9, 8, OUT); R(-3, -15, 7, 6, W.acc2 === '#FFE04A' ? '#FF7AB8' : W.acc2); R(-2, -14, 2, 2, '#FFFFFF'); R(1, -12, 2, 2, '#7AE0FF'); }
    else if (v < .75) { R(-4, -8, 9, 9, OUT); R(-3, -7, 7, 3, '#FFF6FF'); R(-3, -4, 7, 4, '#C8885A'); R(-3, -4, 1, 4, '#E0A878'); R(-1, -9, 3, 2, '#E0443A'); R(-2, -7, 1, 1, '#7AE0FF'); }
    else { R(-1, -12, 3, 13, OUT); R(0, -11, 1, 12, '#FFFFFF'); for (let k = 0; k < 4; k++) R(0, -11 + k * 3, 1, 1, '#E0443A'); R(0, -13, 3, 1, OUT); R(2, -12, 2, 3, OUT); R(2, -11, 1, 1, '#E0443A'); } }
  else if (w === 4) { if (v < .45) { R(-5, -6, 11, 7, OUT); R(-4, -5, 9, 5, W.wall[1]); R(-4, -5, 9, 1, '#86727A'); R(-1, -3, 1, 2, '#FF6A2A'); }
    else if (v < .75) { R(-7, -1, 15, 4, OUT); R(-6, 0, 13, 2, '#C8401A'); R(-4, 0, 5, 1, '#FFD24A'); }
    else { R(-2, -9, 5, 10, OUT); R(-1, -8, 3, 9, '#4E3E46'); R(-1, -11, 3, 3, 'rgba(200,190,190,.6)'); R(0, -14, 2, 3, 'rgba(200,190,190,.4)'); } }
  else { if (v < .5) { const c2 = v < .25 ? W.acc : W.acc2, hh = 8 + Math.floor(v * 10); R(-2, -hh, 5, hh + 1, OUT); R(-1, -hh + 1, 3, hh - 1, c2); R(-1, -hh + 1, 1, hh - 1, '#FFFFFF'); R(2, -5, 4, 6, OUT); R(3, -4, 2, 4, c2); }
    else if (v < .8) { R(-5, -1, 11, 4, OUT); R(-4, 0, 9, 2, W.gD); R(-3, 0, 4, 1, W.g2); }
    else { R(-1, -1, 2, 2, '#FFFFFF'); R(-3, 0, 1, 1, '#7AF0FF'); } }
}
function nodeOpen(n) { return n < LEVELS.length && n < save.unlocked; }
function drawMapScreen(dt) {
  const W = WORLD[mapW], N = mapNodes(mapW);
  ctx.drawImage(mapBg(mapW), 0, 0);
  /* tvirtovė gale */
  const [cxp, cyp] = N[9]; const tc = towerCanvas(mapW, 0); ctx.drawImage(tc, 0, 0, 40, 108, cxp - 10, cyp - 52, 20, 54);
  N.forEach(([x, y], i) => { const n = mapW * 10 + i, open = nodeOpen(n), st = save.stars[LEVELS[n].id] || 0, cur = i === mapSel;
    if (i === 9) { if (cur) { const p = Math.floor(gt * 4) % 2; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 12 - p, y + 4, 3, 1); ctx.fillRect(x + 10 + p, y + 4, 3, 1); } button(x - 14, y - 50, 28, 56, () => mapClick(i)); if (st) for (let s = 0; s < 3; s++) starIcon(x - 9 + s * 6, y + 6, s < st); return; }
    ctx.fillStyle = OUT; ctx.fillRect(x - 8, y - 5, 17, 12); ctx.fillRect(x - 7, y - 6, 15, 14);
    ctx.fillStyle = open ? (st ? '#FFD24A' : W.node) : '#4A4458'; ctx.fillRect(x - 7, y - 5, 15, 10); ctx.fillRect(x - 6, y - 6, 13, 12);
    ctx.fillStyle = open ? (st ? '#B07A1A' : W.deep) : '#2E2A38'; ctx.fillRect(x - 7, y + 4, 15, 2); ctx.fillRect(x - 6, y + 6, 13, 1);
    if (open) text(i + 1, x + 1, y - 3, 1, st ? '#5A3A0A' : OUT, .5, null);
    else { ctx.fillStyle = '#7A7290'; ctx.fillRect(x - 2, y - 1, 5, 4); ctx.fillRect(x - 1, y - 3, 1, 2); ctx.fillRect(x + 1, y - 3, 1, 2); }
    if (st) for (let s = 0; s < 3; s++) starIcon(x - 8 + s * 6, y + 9, s < st);
    if (cur) { const p = Math.floor(gt * 4) % 2; ctx.fillStyle = '#FFFFFF'; for (const [a, b] of [[-10, -8], [10, -8], [-10, 8], [10, 8]]) ctx.fillRect(x + a - (a < 0 ? p : -p), y + b, 2, 1); }
    button(x - 16, y - 16, 32, 32, () => mapClick(i)); });
  /* mama eina taku */
  let ax, ay;
  if (mapWalk) { mapWalk.t += dt * 4; const k = smooth(mapWalk.t), a = N[mapWalk.from], b = N[mapWalk.to]; ax = lerp(a[0], b[0], k); ay = lerp(a[1], b[1], k) - Math.abs(Math.sin(k * Math.PI * 3)) * 4; if (mapWalk.t >= 1) mapWalk = null; }
  else { [ax, ay] = N[mapSel]; ay -= Math.abs(Math.sin(gt * 3)) * 2; }
  if (mapSel === 9 && !mapWalk) ax -= 22;
  drawMama(Math.round(ax), Math.round(ay - 4), save.color, false, mapWalk ? .4 : 0, (gt % 3.2) < .1);
  /* antraštė */
  ctx.fillStyle = OUT; ctx.fillRect(118, 5, 244, 33); ctx.fillRect(110, 12, 8, 20); ctx.fillRect(362, 12, 8, 20);
  ctx.fillStyle = W.deep; ctx.fillRect(111, 13, 7, 18); ctx.fillRect(362, 13, 7, 18); ctx.fillStyle = COL.panel; ctx.fillRect(119, 6, 242, 31); ctx.fillStyle = W.node; ctx.fillRect(119, 6, 242, 1); ctx.fillRect(119, 36, 242, 1);
  text(T('wn')[mapW], 240, 10, fitSc(T('wn')[mapW], 224, 2), W.node, .5); text(T('world') + ' ' + (mapW + 1) + ' / ' + WN, 240, 27, 1, COL.dim, .5);
  if (mapW > 0) btn(80, 10, 24, 24, '<', COL.panel2, () => mapWorld(-1), 2);
  if (mapW < WN - 1) btn(376, 10, 24, 24, '>', nodeOpen((mapW + 1) * 10) ? COL.panel2 : '#2A2636', () => mapWorld(1), 2);
  btn(8, 8, 60, 20, T('menu'), COL.panel2, () => wipe(() => { state = 'title'; }), 1);
  btn(GW - 66, 8, 58, 20, T('shop'), '#8A5A10', () => openShop('map'), 1);
  /* apačioje: pasirinktas lygis ir ŽAISTI */
  const n = mapW * 10 + mapSel, open = nodeOpen(n);
  panel(8, GH - 30, 150, 22, COL.panel); text(T('level') + ' ' + lvName(n) + (mapSel === 9 ? '  ' + T('boss') : ''), 16, GH - 24, 1, mapSel === 9 ? COL.red : COL.txt, 0);
  coinIcon(170, GH - 23); text(save.coins, 180, GH - 24, 1, COL.coin, 0);
  if (open) btn(GW - 110, GH - 34, 102, 28, T('play'), COL.btn, () => wipe(() => playLevel(n)), 2);
  stepParticles(mapFx, dt); drawParticles(mapFx);
}
function mapClick(i) {
  const n = mapW * 10 + i; if (i === mapSel && !mapWalk) { if (nodeOpen(n)) wipe(() => playLevel(n)); return; }
  if (!nodeOpen(n)) { sfx('nope'); return; }
  mapWalk = { from: mapSel, to: i, t: 0 }; mapSel = i; sfx('step');
}
function mapMove(d) { const i = mapSel + d; if (i < 0 || i > 9) { if (i > 9 && mapW < WN - 1 && nodeOpen((mapW + 1) * 10)) mapWorld(1); else if (i < 0 && mapW > 0) mapWorld(-1); return; } if (!nodeOpen(mapW * 10 + i)) { sfx('nope'); return; } mapWalk = { from: mapSel, to: i, t: 0 }; mapSel = i; sfx('step'); }
function mapWorld(d) { const w = mapW + d; if (w < 0 || w >= WN) return; if (d > 0 && !nodeOpen(w * 10)) { sfx('nope'); return; } wipe(() => { mapW = w; mapSel = 0; mapWalk = null; while (mapSel < 9 && nodeOpen(w * 10 + mapSel + 1)) mapSel++; }); }

/* ---------- Įžanga ---------- */
let introT = 0;
function drawIntro(dt) {
  introT += dt; ctx.fillStyle = '#16122A'; ctx.fillRect(0, 0, GW, GH);
  if (FONT.white) { const k = smooth(introT / .4); ctx.globalAlpha = k; drawLogo(240, 96 - Math.round((1 - k) * 20), 6, gt); ctx.globalAlpha = 1; }
  for (let i = 0; i < 7; i++) { const x = -20 + ((introT * 120 + i * 70) % 520); drawBlob(x, 214 + (i % 2) * 6, 1, Math.floor(gt * 8 + i) % 2, 0, 0); }
  return bootDone && (introT > 2.0 || anyInput && introT > .3);
}
function drawWorldClear(dt) {
  const w = clamp(Math.floor(LV / 10), 0, WN - 1); ctx.drawImage(mapBg(w), 0, 0); ctx.fillStyle = 'rgba(14,11,26,.55)'; ctx.fillRect(0, 0, GW, GH);
  text(T('worldClear'), 240, 46, fitSc(T('worldClear'), 440, 3), COL.acc, .5);
  bigSprite(() => drawMama(24, 30, save.color, Math.floor(gt * 3) % 2, Math.max(0, Math.sin(gt * 8)) * .7, false), 192, 70, 2);
  if (Math.random() < dt * 20) mapFx.push({ k: 'star', x: rnd(40, 440), y: rnd(20, 120), vx: 0, vy: 30, t: .8, max: .8 }); stepParticles(mapFx, dt); drawParticles(mapFx);
  btn(180, 190, 120, 28, T('next'), COL.btn, () => { wipe(() => { state = 'map'; mapW = Math.min(WN - 1, w + 1); mapSel = 0; mapWalk = null; }); }, 2, 0);
}
function drawTheEnd(dt) {
  drawMenuBg(dt); text(T('theEnd'), 240, 40, fitSc(T('theEnd'), 440, 3), COL.acc, .5);
  const n = Object.values(save.stars).reduce((a, b) => a + b, 0); starIcon(214, 80, true, true); text(n + ' / 180', 230, 82, 2, COL.acc, 0);
  bigSprite(() => drawMama(24, 30, save.color, Math.floor(gt * 3) % 2, Math.max(0, Math.sin(gt * 8)) * .7, false), 192, 100, 2);
  if (Math.random() < dt * 20) mapFx.push({ k: 'star', x: rnd(40, 440), y: rnd(20, 120), vx: 0, vy: 30, t: .8, max: .8 }); stepParticles(mapFx, dt); drawParticles(mapFx);
  btn(180, 214, 120, 26, T('map'), COL.btn, () => toMap(), 2, 0);
}
