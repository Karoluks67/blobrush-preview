/* ui: pagrindinis ciklas, žaidimo piešimas, HUD (lygis, tvirtovės juosta, širdys, monetos, didžiosios gleivės mygtukas),
   pauzė, pergalės/pralaimėjimo langai, parduotuvė (patobulinimai, kepurės, spalvos), valdymas */
'use strict';
const LEVELS = LEVELS_ALL;
const COL = { panel: '#1E1A30', panel2: '#2C2648', edge: '#4E4478', txt: '#F6F2FF', dim: '#9A90C0', acc: '#FFD24A', red: '#FF5A6A', good: '#7BE34A', coin: '#FFD24A', btn: '#3E8A2E' };
let state = 'boot', stT = 0, gt = 0, bootDone = false, res = null, kbY = null;

/* ---------- UI elementai ---------- */
function panel(x, y, w, h, c, e) { ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, w + 2, h + 3); ctx.fillStyle = e || COL.edge; ctx.fillRect(x, y, w, h); ctx.fillStyle = c || COL.panel; ctx.fillRect(x + 1, y + 1, w - 2, h - 2); }
let padSel = null;
function btn(x, y, w, h, label, col, fn, sc, id, dis) {
  const hv = !dis && hover && hover.x === x && hover.y === y, sel = padSel === id && id !== undefined, oy = hv ? -1 : 0;
  panel(x, y + oy, w, h, dis ? '#2A2636' : hv || sel ? lighten(col || COL.panel2) : col || COL.panel2, sel ? COL.acc : dis ? '#3A3448' : COL.edge);
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(x + 1, y + 1 + oy, w - 2, 1); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 1, y + h - 3 + oy, w - 2, 2);
  if (label !== null) { const s = fitSc(label, w - 8, sc || 1); text(label, x + w / 2, y + h / 2 - 3 * s - 1 + oy, s, dis ? '#6A6480' : COL.txt, .5); }
  if (!dis) button(x, y, w, h, fn, id);
}
const LIGHT = {}; function lighten(c) { if (LIGHT[c]) return LIGHT[c]; const n = parseInt(c.slice(1), 16), f = v => Math.min(255, Math.round(v * 1.25 + 14)); return LIGHT[c] = '#' + [n >> 16, n >> 8 & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join(''); }
function coinIcon(x, y) { drawMap(['.ooo.', 'oyywo', 'oyyyo', 'oyyyo', '.ooo.'].map((r, i) => i === 0 ? '.ooo.' : r), x, y, { o: '#7A4A08', y: COL.coin, w: '#FFF6C8' }); }
function heartIcon(x, y, on) { drawMap(['.oo.oo.', 'orrorro', 'orwrrro', 'orrrrro', '.orrro.', '..oro..', '...o...'], x, y, on ? { o: OUT, r: '#FF4A6A', w: '#FFC2CC' } : { o: OUT, r: '#3A3448', w: '#4A4458' }); }
function starIcon(x, y, on, big) {
  const m = big ? ['....o....', '...oyo...', '...oyo...', 'oooyyyooo', 'oyyywyyyo', '.oyyyyyo.', '..oyyyo..', '.oyyoyyo.', '.oyo.oyo.', '.oo...oo.'] : ['..o..', '.oyo.', 'oyyyo', '.oyo.', 'o.o.o'];
  drawMap(m, x, y, on ? { o: OUT, y: '#FFD24A', w: '#FFF6C8' } : { o: OUT, y: '#3A3448', w: '#4A4458' });
}
function adIcon(x, y) { drawMap(['oooooooo', 'owwwwwwo', 'owwrwwwo', 'owwrrwwo', 'owwrwwwo', 'owwwwwwo', 'oooooooo'], x, y, { o: OUT, w: '#F6F2FF', r: '#E0443A' }); }
function lvName(i) { return (Math.floor(i / 10) + 1) + '-' + (i % 10 + 1); }

/* ---------- Lygio fonas (žemė, sienos, mamos takas) - į talpyklą ---------- */
function bakeLevel() {
  const W = WORLD[L.w], c = document.createElement('canvas'); c.width = GW; c.height = GH; const g = c.getContext('2d');
  groundArt(g, L.w, W);
  /* mamos takas: išmintas griovelis su gleivių pėdsakais */
  g.fillStyle = W.gD; g.fillRect(PX - 9, FY0 + 2, 18, FY1 - FY0); g.fillStyle = W.g1; g.fillRect(PX - 8, FY0 + 2, 16, FY1 - FY0 - 1);
  for (let y = FY0 + 6; y < FY1; y += 9) { g.fillStyle = 'rgba(123,227,74,.25)'; g.fillRect(PX - 3 + (y % 2), y, 5, 2); }
  /* tvirtovės šešėlis ir „aikštė" */
  g.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 6; i++) g.fillRect(TX - 4 + i, TY1 + 3 + i, 44 - i, 2);   // tvirtovės šešėlis
  for (const w of L.walls) wallArt(g, w.x, Math.max(FY0 - 2, w.y), w.w, Math.min(FY1, w.y + w.h) - Math.max(FY0 - 2, w.y), W, L.w);
  /* pakraščių šešėlis */
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, GH - 3, GW, 3);
  L.cache = c;
}
function drawPlay(dt) {
  const W = WORLD[L.w]; if (!L.cache) bakeLevel();
  ctx.fillStyle = W.gD; ctx.fillRect(0, 0, GW, GH);
  ctx.save(); if (shake > 0) ctx.translate(Math.round(rnd(-2, 2) * shake * 4), Math.round(rnd(-2, 2) * shake * 4));
  ctx.drawImage(L.cache, 0, 0);
  for (const z of L.ices) drawIce(z.x, z.y, z.w, z.h, gt);
  for (const z of L.pushes) drawPush(z.x, z.y, z.w, z.h, z.vx, z.vy, gt, W);
  for (const j of L.jellies) drawJelly(j.x, j.y, j.w, j.h, j.dir, gt);
  for (const p of L.portals) { drawPortal(p.x, p.y, gt, '#B07AFF'); drawPortal(p.x2, p.y2, -gt, '#7AF0FF'); }
  for (const s of L.salts) if (s.hp > 0) drawSalt(s.x + (s.fl > 0 ? 1 : 0), s.y, s.w, s.h, s.hp, s.hp0, gt);
  for (const g of L.gates) drawGate(g.x, Math.round(gateY(g)), g.h, gateGood(g), gateLabel(g), gt, Math.max(0, g.fl));
  /* taikiklis: bėgantys taškeliai iš mamos burnos - matyti, kur skris gleivės */
  if (!L.win && !L.lose) { const my = Math.round(L.mama.y) - 6; for (let i = 0; i < 8; i++) { const d = (i * 9 + gt * 46) % 72; ctx.globalAlpha = .7 * (1 - d / 72); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(PX + 16 + Math.round(d), my, 2, 1); } ctx.globalAlpha = 1; }
  for (const u of L.bubbles) if (!u.done) drawBubble(u.x, Math.round(u.y + Math.sin(gt * 2 + u.x) * 1.5), u.n, gt, save.color);
  /* tvirtovė (dreba nuo smūgių) */
  const T = L.tower, tc = towerCanvas(L.w, 1 - T.hp / T.hp0), low = T.hp / T.hp0 < .25 && Math.floor(gt * 14) % 5 === 0, jx = T.hit > 0 ? (Math.floor(gt * 50) % 2 ? 1 : -1) : low ? (Math.floor(gt * 31) % 2 ? 1 : -1) : 0;
  if (!(L.win > .25)) { const sw = 40 + Math.round(T.sq * 4), sh = 108 - Math.round(T.sq * 5), tx = TX - 2 - Math.round((sw - 40) / 2) + jx, ty = TY0 - 14 + 108 - sh;
    ctx.drawImage(tc, tx, ty, sw, sh); if (T.fl > 0) { ctx.globalAlpha = .55; ctx.drawImage(whiteOf(tc), tx, ty, sw, sh); ctx.globalAlpha = 1; } }
  else { const k = Math.min(1, (L.win - .25) * 1.6); ctx.drawImage(tc, 0, 0, 40, 108 * (1 - k), TX - 2 + rnd(-1, 1), TY0 - 14 + 108 * k, 40, 108 * (1 - k)); }
  /* gleivės ir akmenukai pagal gylį */
  const list = [];
  for (const b of L.blobs) list.push(b); for (const r of L.rocks) list.push(r);
  list.sort((a, b) => a.y - b.y);
  const col = save.color, hat = save.hat;
  /* šešėliai po gleivėmis ir akmenukais (atskiras praėjimas, kad nekristų ant kaimynų) */
  ctx.fillStyle = 'rgba(0,0,0,.17)';
  for (const o of list) { const sw = o.sz ? o.r * 2 : o.hp >= 10 ? 14 : o.hp >= 5 ? 10 : o.hp >= 2 ? 7 : 5; ctx.fillRect(Math.round(o.x - sw / 2), Math.round(o.y) - 1, sw, 2); }
  for (const o of list) {
    if (o.sz) { const f = Math.floor(gt * 5 + o.ph) % 2; drawRock(o.x, o.y, o.sz, f, L.w); if (o.hit > 0) { const c = rockSprite(o.sz, 0, L.w); ctx.globalAlpha = .5; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(Math.round(o.x - c.width / 2) + 1, Math.round(o.y - c.height) + 1, c.width - 2, c.height - 2); ctx.globalAlpha = 1; } }
    else { const ph = gt * (L.win ? 14 : 9) + o.ph, f = Math.sin(ph) < -.6 ? 1 : 0, age = L.t - (o.bt || 0), amp = L.win ? 4 : o.hp >= 10 ? 1 : 2;
      if (age < .08) drawBlob(o.x, o.y, o.hp >= 10 ? 5 : 1, 1, col, hat, 2);   /* ką tik gimusi - iššoka */
      else drawBlob(o.x, o.y, o.hp, f, col, hat, f ? 0 : Math.round(Math.max(0, Math.sin(ph)) * amp)); }
  }
  if (L.boss && L.boss.hp > 0) drawBoss(L.boss, W);
  for (const g of L.gates) drawGateSign(g.x, Math.round(gateY(g)), g.h, gateGood(g), gateLabel(g), g.bump || 0, g.sc);
  drawMama(PX - Math.round((L.mama.kick || 0) * 2), Math.round(L.mama.y), save.color, L.mama.open > 0, L.mama.sq, (gt % 3.4) < .12);
  drawAmbient(L.w, gt);
  drawParticles(fx);
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${(flash * 1.5).toFixed(2)})`; ctx.fillRect(0, 0, GW, GH); }
  if (L.heartFx > 0) { ctx.fillStyle = `rgba(255,40,70,${(L.heartFx * .25).toFixed(2)})`; ctx.fillRect(0, 0, GW, GH); }
}
/* bosas: didelis akmenų milžinas (pasaulio spalvomis), su gyvybių juosta */
function drawBoss(B, W) {
  drawBossArt(Math.round(B.x), Math.round(B.y), L.w, B.t, B.hit, B.throwT < .5 ? 'roar' : '');
  const x = Math.round(B.x), y = Math.round(B.y), k = B.hp / B.hp0; ctx.fillStyle = OUT; ctx.fillRect(x - 17, y - 41, 34, 5); ctx.fillStyle = '#3A2A3A'; ctx.fillRect(x - 16, y - 40, 32, 3); ctx.fillStyle = '#FF5A6A'; ctx.fillRect(x - 16, y - 40, Math.round(32 * k), 3);
}
/* ---------- HUD ---------- */
const BIGB = [GW - 42, GH - 40, 34, 32];
let hudN = 0, hudB = 0;   /* dešinėje apačioje - kairėje juda mama */
function drawHud() {
  /* viršutinė juosta */
  ctx.fillStyle = 'rgba(14,12,26,.82)'; ctx.fillRect(0, 0, GW, 22); ctx.fillStyle = OUT; ctx.fillRect(0, 22, GW, 1);
  text(T('level') + ' ' + lvName(LV), 8, 6, 1, COL.txt, 0);
  for (let i = 0; i < 3; i++) { const lost = i === L.hearts && L.heartFx > 0, jx = lost ? Math.round(Math.sin(gt * 70) * 2 * L.heartFx) : 0; heartIcon(104 + i * 10 + jx, 7 - (lost ? Math.round(L.heartFx * 3) : 0), i < L.hearts || (lost && L.heartFx > .5)); }
  /* tvirtovės juosta */
  const T0 = L.tower, k = T0.hp / T0.hp0, bx = 150, bw = 180;
  ctx.fillStyle = OUT; ctx.fillRect(bx - 1, 5, bw + 2, 12); ctx.fillStyle = '#3A2A3A'; ctx.fillRect(bx, 6, bw, 10);
  ctx.fillStyle = '#FFF0E0'; ctx.fillRect(bx, 6, Math.round(bw * T0.ghost / T0.hp0), 10);
  ctx.fillStyle = T0.fl > 0 ? '#FFC2CC' : '#FF5A6A'; ctx.fillRect(bx, 6, Math.round(bw * k), 10); ctx.fillStyle = '#FF9AA6'; ctx.fillRect(bx, 6, Math.round(bw * k), 2);
  text(T0.hp, bx + bw / 2, 7, 1, '#FFFFFF', .5);
  drawMap(['k.k.k', 'kkkkk', 'krkrk', 'kkkkk', 'kk.kk'], bx - 9, 7, { k: OUT, r: '#FFD24A' });
  /* gleivių skaičius (žaidime monetos nesikeičia - rodoma minia) */
  const n = L.blobs.length; if (n > hudN) hudB = .12; hudN = n; hudB = Math.max(0, hudB - 1 / 60);
  ctx.drawImage(blobSprite('M', 0, save.color, 0), 342, 5 - (hudB > 0 ? 1 : 0)); text(n, 354, 7 - (hudB > 0 ? 1 : 0), 1, hudB > 0 ? '#FFFFFF' : COL.good, 0);
  btn(GW - 24, 2, 20, 18, 'II', COL.panel2, pauseGame, 1);
  /* didžiosios gleivės mygtukas su įkrovos juosta */
  const [x, y0b, w, h] = BIGB, ready = L.meter >= L.need, p = L.meter / L.need, y = ready ? y0b - Math.round(Math.abs(Math.sin(gt * 5)) * 3) : y0b;
  if (ready && Math.random() < .15) fx.push({ k: 'star', x: x + Math.random() * w, y: y + Math.random() * h, vx: 0, vy: -20, t: .25, max: .25 });
  panel(x, y, w, h, ready ? (Math.floor(gt * 4) % 2 ? '#3E8A2E' : '#4FA83A') : COL.panel);
  const fh = Math.round((h - 2) * p); ctx.fillStyle = ready ? 'rgba(255,255,255,.1)' : 'rgba(123,227,74,.35)'; ctx.fillRect(x + 1, y + h - 1 - fh, w - 2, fh);
  const c = blobSprite('L', ready ? Math.floor(gt * 6) % 2 : 0, save.color, save.hat); ctx.globalAlpha = ready ? 1 : .55; ctx.drawImage(c, x + Math.round((w - c.width) / 2), y + 4 + (c.height < 14 ? 2 : 0)); ctx.globalAlpha = 1;
  if (!touchUI) text('E', x + w - 6, y + h - 9, 1, COL.dim, .5);
  if (ready) button(x, y0b - 3, w, h + 3, () => { inpBig = true; });
  /* mokymo užrašai */
  const D = L.D;
  if (L.t < 6 && LV === 0) tip(T('tAim'), 70);
  else if (D.tut === 2 && L.t < 7) tip(T('tRed'), 70);
  else if (D.tut === 3 && L.t < 7) tip(T('tBubble'), 70);
  else if (LV % 10 === 0 && LV > 0 && L.t < 5) tip(T('feat')[L.w], 70);
  if (ready && L.t < 60 && !save.bigSeen) tip(touchUI ? T('tBig').replace(/\s*\(E\)/, '') : T('tBig'), GH - 64);
  if (L.boss && L.boss.hp > 0 && L.t < 3) { const s = Math.floor(gt * 6) % 2; text(T('boss'), 240, 100, 3, s ? COL.red : '#FFFFFF', .5); }
  if (L.t < 1.4) { const kk = L.t < .2 ? smooth(L.t / .2) : L.t > 1.1 ? 1 - smooth((L.t - 1.1) / .3) : 1, ww = Math.round(220 * kk), yy = 110;
    ctx.fillStyle = OUT; ctx.fillRect(240 - ww / 2 - 1, yy - 1, ww + 2, 36); ctx.fillStyle = COL.panel; ctx.fillRect(240 - ww / 2, yy, ww, 34); ctx.fillStyle = WORLD[L.w].node; ctx.fillRect(240 - ww / 2, yy, ww, 1); ctx.fillRect(240 - ww / 2, yy + 33, ww, 1);
    if (kk > .8) { text(lvName(LV), 240, yy + 5, 2, COL.txt, .5); const nm = T('wn')[L.w]; text(nm, 240, yy + 22, fitSc(nm, 200, 1), WORLD[L.w].node, .5); } }
}
function tip(s, y) { const sc = fitSc(s, 440, 1), w = textW(s, sc) + 14; ctx.fillStyle = 'rgba(14,12,26,.75)'; ctx.fillRect(240 - w / 2, y - 3, w, 15); text(s, 240, y, sc, COL.txt, .5); }

/* ---------- Valdymas žaidime ---------- */
let inpBig = false;
function playInput(dt) {
  if (window.AUTOBOT) return botInput('smart');
  const m = L.mama; let y = m.y;
  if (kbY === null) kbY = m.y;
  const kd = (keys.ArrowUp || keys.KeyW ? -1 : 0) + (keys.ArrowDown || keys.KeyS ? 1 : 0) + (PAD ? PAD.y : 0);
  if (kd) { kbY = clamp(kbY + kd * 190 * dt, FY0 + 22, FY1 - 2); y = kbY; ptr.y = null; }
  else if (ptr.mouse && ptr.y !== null) { y = ptr.y + 8; kbY = y; }
  else if (!ptr.mouse && ptr.down) { kbY = clamp(kbY + ptr.dy * 1.25, FY0 + 22, FY1 - 2); ptr.dy = 0; y = kbY; }
  else y = kbY;
  const big = inpBig || keys.KeyE || keys.Space || keys.ShiftLeft || keys.Enter || (PAD && PAD.big); inpBig = false;
  if (big && L.meter >= L.need) save.bigSeen = 1;
  return { y, fire: true, big };
}

/* ---------- Pergalė / pralaimėjimas ---------- */
function finishLevel() {
  const win = !!L.win, D = LEVELS[LV];
  if (win) { const st = L.hearts, prev = save.stars[D.id] || 0; save.stars[D.id] = Math.max(prev, st); save.unlocked = Math.max(save.unlocked, LV + 2);
    const c = 20 + LV * 4 + st * 5 + (prev ? 0 : 15); res = { win, coins: c, stars: st, first: !prev, t: 0, shown: 0, dbl: false }; }
  else res = { win, coins: Math.max(5, L.popped), stars: 0, t: 0, shown: 0, dbl: false };
  save.coins += res.coins; save.pops = (save.pops || 0) + L.popped; persist();
  state = 'result'; stT = 0; resFx = []; Poki.stop();
}
function drawResult(dt) {
  drawPlay(0); res.t += dt; ctx.fillStyle = 'rgba(10,8,20,.62)'; ctx.fillRect(0, 0, GW, GH);
  const k = smooth(res.t / .35), y0 = Math.round(40 - (1 - k) * 30);
  panel(120, y0, 240, 196, COL.panel, COL.edge); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(121, y0 + 1, 238, 2);
  if (res.win) {
    text(T('win'), 240, y0 + 12, fitSc(T('win'), 220, 3), COL.acc, .5);
    if (!res.conf) { res.conf = 1; for (let i = 0; i < 80; i++) resFx.push({ k: 'conf', x: rnd(120, 360), y: rnd(-30, 10), vx: rnd(-40, 40), vy: rnd(0, 60), t: rnd(1.6, 2.8), max: 2.8, c: pick(CONF_C), ph: rnd(0, 6), g: .3 }); }
    for (let i = 0; i < 3; i++) { const t0 = .4 + i * .25, on = i < res.stars && res.t > t0, e = res.t - t0, s = on && e < .09 ? 3 : 2, cx = 210 + i * 30, cy = y0 + 50 + (i === 1 ? -5 : 0);
      bigSprite(() => starIcon(19, 19, on, true), cx - 23.5 * s, cy - 24 * s, s);
      if (on && res.t - dt <= t0) { sfx('star', 1 + i * .12); for (let j = 0; j < 12; j++) { const a = j / 12 * TAU; resFx.push({ k: 'star', x: cx, y: cy, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, t: .35, max: .35 }); } } }
    bigSprite(() => { drawMama(20, 24 - Math.round(Math.abs(Math.sin(gt * 6)) * 3), save.color, Math.floor(gt * 3) % 2, Math.max(0, Math.sin(gt * 8)) * .6, false); }, 132, y0 + 58, 2);
  } else {
    text(T('lose'), 240, y0 + 12, fitSc(T('lose'), 220, 3), COL.red, .5);
    const tip2 = T('tips')[LV % T('tips').length]; text(tip2, 240, y0 + 52, fitSc(tip2, 220, 1), COL.dim, .5);
  }
  /* monetos skaičiuojamos */
  const target = res.coins * (res.dbl ? 2 : 1); if (res.shown < target && res.t > .6) { res.shown = Math.min(target, res.shown + Math.max(1, Math.ceil(target * dt * 1.6))); if (Math.floor(res.t * 20) % 2) sfx('coin', 1 + res.shown / target * .6); }
  coinIcon(214, y0 + 82); text('+' + res.shown, 224, y0 + 81, 2, COL.coin, 0);
  if (!res.dbl) { btn(296, y0 + 76, 58, 20, T('x2'), '#8A5A10', doubleCoins, 1, 9); adIcon(300, y0 + 82); }
  if (res.win) { btn(180, y0 + 108, 120, 28, LV + 1 < LEVELS.length ? T('next') : T('map'), COL.btn, nextLevel, 2, 0); btn(180, y0 + 142, 58, 20, T('retry'), COL.panel2, retryLevel, 1, 1); btn(242, y0 + 142, 58, 20, T('map'), COL.panel2, () => toMap(), 1, 2); }
  else { btn(180, y0 + 108, 120, 28, T('retry'), COL.btn, retryLevel, 2, 0); btn(180, y0 + 142, 58, 20, T('shop'), '#8A5A10', () => openShop('result'), 1, 1); btn(242, y0 + 142, 58, 20, T('map'), COL.panel2, () => toMap(), 1, 2); }
  coinIcon(186, y0 + 172); text(save.coins, 196, y0 + 171, 1, COL.coin, 0);
  if (res.win) shine(180, y0 + 108, 120, 28, gt);
  stepParticles(resFx, dt); drawParticles(resFx);
}
let resFx = [];
/* blizgesio juosta per mygtuką (kviečia spausti) */
function shine(x, y, w, h, t) {
  const p = (t % 2.4) / .55; if (p > 1) return; const sx = Math.round(x - 12 + p * (w + 24));
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.3)';
  for (let i = 0; i < h; i++) ctx.fillRect(sx - (i >> 1), y + i, 5, 1); ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < h; i++) ctx.fillRect(sx + 7 - (i >> 1), y + i, 2, 1);
  ctx.restore();
}
function doubleCoins() { if (res.dbl) return; Poki.rewarded().then(ok => { if (ok && !res.dbl) { res.dbl = true; save.coins += res.coins; persist(); sfx('buy'); } }); }
function nextLevel() {
  const n = LV + 1; state = 'wait';
  Poki.commercial().then(() => { if (n >= LEVELS.length) { wipe(() => { state = 'theEnd'; stT = 0; }); return; } if (n % 10 === 0) { wipe(() => { state = 'worldClear'; stT = 0; }); return; } wipe(() => playLevel(n)); });
}
function retryLevel() { state = 'wait'; Poki.commercial().then(() => wipe(() => playLevel(LV))); }
function playLevel(i) { startLevel(i); state = 'play'; stT = 0; kbY = null; ptr.dy = 0; Poki.start(); }
function pauseGame() { if (state !== 'play') return; state = 'pause'; Poki.stop(); }
function resumeGame() { state = 'play'; Poki.start(); }
function onBlur() { if (state === 'play' && !L.win && !L.lose) pauseGame(); }
function drawPause() {
  ctx.fillStyle = 'rgba(10,8,20,.72)'; ctx.fillRect(0, 0, GW, GH);
  text(T('paused'), 240, 50, 3, COL.txt, .5);
  btn(170, 88, 140, 28, T('resume'), COL.btn, resumeGame, 2, 0);
  btn(170, 124, 140, 22, T('restart'), COL.panel2, () => { state = 'wait'; Poki.commercial().then(() => wipe(() => playLevel(LV))); }, 1, 1);
  btn(170, 152, 140, 22, T('map'), COL.panel2, () => toMap(), 1, 2);
  btn(170, 180, 140, 22, T('settings'), COL.panel2, () => openSettings('pause'), 1, 3);
}
function toMap() { Poki.stop(); wipe(() => { state = 'map'; mapW = clamp(Math.floor(Math.min(LV, save.unlocked - 1) / 10), 0, WN - 1); mapSel = clamp(Math.min(save.unlocked - 1, LEVELS.length - 1) - mapW * 10, 0, 9); if (LV >= mapW * 10 && LV < mapW * 10 + 10) mapSel = Math.min(9, LV % 10 + (save.unlocked > LV + 1 ? 1 : 0)); mapWalk = null; }); }

/* ---------- Parduotuvė: patobulinimai, kepurės, spalvos ---------- */
let SHOP_FROM = 'title', shopTab = 0, freeT = 0;
function openShop(from) { SHOP_FROM = from || state; wipe(() => { state = 'shop'; }); }
function closeShop() { wipe(() => { state = SHOP_FROM === 'result' ? 'map' : SHOP_FROM; if (state === 'map') toMapNow(); }); }
function toMapNow() { mapW = clamp(Math.floor((save.unlocked - 1) / 10), 0, WN - 1); mapSel = clamp(save.unlocked - 1 - mapW * 10, 0, 9); mapWalk = null; }
function buy(cost, fn) { if (save.coins < cost) { sfx('nope'); shopShake = .3; return; } save.coins -= cost; fn(); persist(); sfx('buy'); for (let i = 0; i < 10; i++) shopFx.push({ k: 'star', x: rnd(200, 280), y: rnd(60, 120), vx: rnd(-30, 30), vy: rnd(-60, -10), t: .5, max: .5 }); }
let shopShake = 0, shopFx = [];
function drawShop(dt) {
  drawMenuBg(dt); shopShake = Math.max(0, shopShake - dt); freeT = Math.max(0, freeT - dt);
  panel(24, 8, 432, 256, COL.panel, COL.edge);
  text(T('shop'), 240, 16, 2, COL.acc, .5);
  const sx = shopShake > 0 ? Math.round(Math.sin(gt * 60) * 2) : 0; coinIcon(372 + sx, 18); text(save.coins, 382 + sx, 17, 1, COL.coin, 0);
  btn(32, 14, 54, 18, T('back'), COL.panel2, closeShop, 1, 90);
  /* kortelės */
  const tabs = [T('upgrades'), T('hats'), T('colors')];
  tabs.forEach((s, i) => { const x = 40 + i * 136, on = shopTab === i; panel(x, 38, 128, 18, on ? '#3E3468' : COL.panel2, on ? COL.acc : COL.edge); text(s, x + 64, 42, fitSc(s, 120, 1), on ? COL.acc : COL.txt, .5); button(x, 38, 128, 18, () => { shopTab = i; }); });
  /* peržiūra kairėje */
  panel(40, 64, 104, 150, '#16122A'); ctx.fillStyle = WORLD[0].g0; ctx.fillRect(41, 160, 102, 53); ctx.fillStyle = WORLD[0].g1; for (let i = 0; i < 30; i++) ctx.fillRect(41 + Math.floor(hash(i, 1, 1) * 100), 161 + Math.floor(hash(i, 2, 1) * 50), 2, 1);
  bigSprite(() => { drawMama(20, 26, save.color, Math.floor(gt * 2) % 4 === 0, Math.max(0, Math.sin(gt * 4)) * .3, (gt % 3) < .1); }, 52, 98, 2);
  for (let i = 0; i < 4; i++) { const bx = 56 + i * 20 + Math.round(Math.sin(gt * 3 + i) * 2); drawBlob(bx, 200 + (i % 2) * 6, 1, Math.floor(gt * 6 + i) % 2, save.color, save.hat); }
  const right = 152;
  if (shopTab === 0) {
    ['rate', 'big', 'power'].forEach((k, i) => { const y = 66 + i * 50, U = UP[k], lv = save.up[k];
      panel(right, y, 296, 44, COL.panel2); text(T('up_' + k), right + 8, y + 6, 1, COL.txt, 0); text(T('upd_' + k), right + 8, y + 19, fitSc(T('upd_' + k), 170, 1), COL.dim, 0);
      for (let p = 0; p < U.max; p++) { ctx.fillStyle = OUT; ctx.fillRect(right + 8 + p * 14, y + 31, 12, 7); ctx.fillStyle = p < lv ? COL.good : '#3A3458'; ctx.fillRect(right + 9 + p * 14, y + 32, 10, 5); }
      if (lv >= U.max) text(T('max'), right + 250, y + 18, 1, COL.good, .5);
      else { const c = U.cost[lv]; btn(right + 200, y + 10, 88, 24, null, save.coins >= c ? COL.btn : '#4A3A3A', () => buy(c, () => { save.up[k]++; }), 1, 10 + i); coinIcon(right + 214, y + 19); text(c, right + 224, y + 18, 1, save.coins >= c ? '#FFFFFF' : '#C89A9A', 0); } });
    /* nemokamos monetos už reklamą */
    btn(right, 222, 296, 26, null, freeT > 0 ? '#2A2636' : '#8A5A10', () => { if (freeT > 0) return; Poki.rewarded().then(ok => { if (ok) { save.coins += 60; persist(); sfx('buy'); freeT = 90; } }); }, 1, 20);
    if (freeT <= 0) adIcon(right + 80, 231); coinIcon(right + 96, 232); text(freeT > 0 ? Math.ceil(freeT) + 's' : T('free'), right + 106, 231, 1, freeT > 0 ? COL.dim : '#FFFFFF', 0);
  } else if (shopTab === 1) {
    HATS.forEach((H, i) => { const x = right + (i % 4) * 74, y = 66 + Math.floor(i / 4) * 78, own = save.hats.indexOf(i) >= 0, on = save.hat === i;
      panel(x, y, 68, 72, on ? '#3E3468' : COL.panel2, on ? COL.acc : COL.edge);
      bigSprite(() => drawBlob(24, 30, 1, Math.floor(gt * 4 + i) % 2, save.color, i), x + 34 - 24 * 3, y + 42 - 30 * 3, 3);
      if (on) text(T('worn'), x + 34, y + 58, 1, COL.acc, .5);
      else if (own) btn(x + 6, y + 52, 56, 16, T('wear'), COL.panel, () => { save.hat = i; persist(); }, 1, 30 + i);
      else { btn(x + 6, y + 52, 56, 16, null, save.coins >= H.cost ? COL.btn : '#4A3A3A', () => buy(H.cost, () => { save.hats.push(i); save.hat = i; }), 1, 30 + i); coinIcon(x + 14, y + 57); text(H.cost, x + 23, y + 56, 1, '#FFFFFF', 0); } });
  } else {
    BLOB_COLS.forEach((C, i) => { const x = right + (i % 3) * 98, y = 66 + Math.floor(i / 3) * 78, own = i === 0 || (save.cols || []).indexOf(i) >= 0, on = save.color === i;
      panel(x, y, 92, 72, on ? '#3E3468' : COL.panel2, on ? COL.acc : COL.edge);
      bigSprite(() => drawBlob(24, 30, 1, Math.floor(gt * 4 + i) % 2, i, save.hat), x + 46 - 24 * 3, y + 42 - 30 * 3, 3);
      if (on) text(T('worn'), x + 46, y + 58, 1, COL.acc, .5);
      else if (own) btn(x + 10, y + 52, 72, 16, T('wear'), COL.panel, () => { save.color = i; persist(); SPR.clear(); }, 1, 40 + i);
      else { btn(x + 10, y + 52, 72, 16, null, save.coins >= BLOB_COST[i] ? COL.btn : '#4A3A3A', () => buy(BLOB_COST[i], () => { save.cols = (save.cols || []).concat(i); save.color = i; }), 1, 40 + i); coinIcon(x + 26, y + 57); text(BLOB_COST[i], x + 35, y + 56, 1, '#FFFFFF', 0); } });
  }
  stepParticles(shopFx, dt); drawParticles(shopFx);
}

/* ---------- Klaviatūra meniu ---------- */
function onKey(k) {
  if (state === 'boot' || WIPE) return;
  if (state === 'settings') { if (k === 'Escape') closeSettings(); return; }
  if (state === 'shop') { if (k === 'Escape') closeShop(); else if (k === 'ArrowRight' || k === 'KeyD') shopTab = (shopTab + 1) % 3; else if (k === 'ArrowLeft' || k === 'KeyA') shopTab = (shopTab + 2) % 3; return; }
  if (state === 'map') { if (k === 'ArrowRight' || k === 'KeyD') mapMove(1); else if (k === 'ArrowLeft' || k === 'KeyA') mapMove(-1); else if (k === 'ArrowUp' || k === 'KeyW' || k === 'PageUp') mapWorld(1); else if (k === 'ArrowDown' || k === 'KeyS' || k === 'PageDown') mapWorld(-1); else if (['Space', 'Enter'].includes(k)) mapClick(mapSel); else if (k === 'Escape') wipe(() => { state = 'title'; }); return; }
  if (state === 'play') { if (k === 'Escape' || k === 'KeyP') pauseGame(); return; }
  if (state === 'pause' && (k === 'Escape' || k === 'KeyP')) { resumeGame(); return; }
  if (state === 'result' && res.t > .8) { if (k === 'Enter' || k === 'Space') res.win ? nextLevel() : retryLevel(); else if (k === 'Escape') toMap(); return; }
  if (state === 'title' && ['Space', 'Enter'].includes(k)) startGame();
  if ((state === 'worldClear' || state === 'theEnd') && stT > 1 && ['Space', 'Enter', 'Escape'].includes(k)) toMap();
}
function startGame() { const i = Math.min(LEVELS.length - 1, Math.max(0, save.unlocked - 1)); wipe(() => playLevel(i)); }

/* ---------- Pagrindinis ciklas ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(.05, (now - last) / 1000); last = now; gt += dt; stT += dt;
  BTN = BTN_NEXT; BTN_NEXT = []; PAD = padRead();
  if (PAD && padPress('start')) { if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame(); else if (state === 'title') startGame(); else if (state === 'map') mapClick(mapSel); }
  if (PAD && state === 'map' && !mapWalk) { if (PAD.x > 0 && !(padPrev.x > 0)) mapMove(1); else if (PAD.x < 0 && !(padPrev.x < 0)) mapMove(-1); if (padPress('ok')) mapClick(mapSel); if (padPress('back')) wipe(() => { state = 'title'; }); }
  if (PAD && padPress('ok') && state === 'title') startGame();
  if (PAD && padPress('ok') && state === 'result' && res.t > .8) res.win ? nextLevel() : retryLevel();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state === 'boot') { if (drawIntro(dt)) { state = 'title'; anyInput = false; } }
  else if (state === 'title') drawTitle(dt);
  else if (state === 'map') drawMapScreen(dt);
  else if (state === 'shop') drawShop(dt);
  else if (state === 'settings') { drawSettingsBehind(dt); drawSettings(dt); }
  else if (state === 'play' || state === 'pause') {
    if (state === 'play') { const inp = playInput(dt), ts = hitStop > 0 ? 0 : slow > 0 ? .35 : 1; hitStop = Math.max(0, hitStop - dt); if (!hitStop) slow = Math.max(0, slow - dt);
      acc += dt * ts; while (acc >= DT) { step(DT, inp); inp.big = false; acc -= DT; }
      if ((L.win > 1.6 || L.lose > 1.2) && state === 'play') finishLevel(); }
    drawPlay(dt); drawHud(); if (state === 'pause') drawPause();
  }
  else if (state === 'result') drawResult(dt);
  else if (state === 'wait') drawPlay(0);
  else if (state === 'worldClear') drawWorldClear(dt);
  else if (state === 'theEnd') drawTheEnd(dt);
  drawWipe(dt);
  if (Poki.adShow) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, GW, GH); text('AD (LOCAL TEST)', 240, 130, 2, '#fff', .5); }
  padPrev = PAD ? Object.assign({}, PAD) : {};
  present();
}
async function boot() {
  requestAnimationFrame(frame);
  loadSave(); langInit();
  let font = null; try { [font] = await Promise.all([loadJson('assets/font.json'), Poki.init()]); } catch (_) { }
  if (font) fontInit(font);
  bootDone = true; Poki.loaded();
}
if (!/[?&]solver/.test(location.search)) boot();
