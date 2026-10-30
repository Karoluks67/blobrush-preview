/* game: lygio simuliacija (be piešimo, kad botas galėtų žaisti be naršyklės). Fiksuotas žingsnis DT, pastovus atsitiktinumas (rng).
   Mama gleivė kairėje šaudo gleives į dešinę; vartai ×N jas skaido, druska sugeria, burbulai prideda; akmenukai eina iš tvirtovės.
   Laimima sugriovus tvirtovę; pralaimima, kai akmenukai 3 kartus pasiekia mamą. */
'use strict';
const DT = 1 / 60;
const FY0 = 30, FY1 = 264;          // laukas (viršuje - HUD juosta)
const PX = 26;                       // mamos x
const TX = 436, TY0 = 98, TY1 = 190; // tvirtovės priekis ir aukštis (smūgio zona)
const MAXB = 520;                    // daugiau gleivių nebus - vietoj naujos stiprėja esama (didesnė)
const SPEED = 62;
/* pastovus atsitiktinumas: botas ir žaidėjas mato tą patį lygį */
let SEED = 1;
const rng = () => { SEED = SEED + 0x6D2B79F5 | 0; let t = Math.imul(SEED ^ SEED >>> 15, 1 | SEED); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a, b) => a + rng() * (b - a);

/* patobulinimai: šaudymo greitis, didžiosios gleivės įkrova, „dviguba" gleivė */
const UP = {
  rate: { max: 5, cost: [40, 90, 180, 320, 520], val: l => 5 + l * .9 },
  big: { max: 5, cost: [50, 110, 200, 340, 540], val: l => 34 - l * 3.5 },
  power: { max: 5, cost: [60, 130, 240, 380, 600], val: l => l * .07 },
};

let L = null, LV = 0, fx = [], shake = 0, flash = 0;
/* smūgio svoris: hitStop - trumpas sustingimas, slow - sulėtėjimas (realiu laiku, mažina ui.frame; botui įtakos neturi) */
let hitStop = 0, slow = 0;
const stopFor = (h, s) => { hitStop = Math.max(hitStop, h); if (s) slow = Math.max(slow, s); };
function startLevel(i, opts) {
  opts = opts || {}; LV = i; const D = LEVELS[i]; SEED = (i + 1) * 7919;
  const up = opts.up || save.up;
  L = {
    D, w: D.w, t: 0, blobs: [], rocks: [], gates: [], salts: [], bubbles: [], walls: D.walls || [], jellies: D.jelly || [], pushes: D.push || [], ices: D.ice || [], portals: D.portal || [],
    tower: { hp: D.hp, hp0: D.hp, ghost: D.hp, hit: 0, sq: 0, dmg: 0, dmgT: 0, spawnT: D.first ?? 4, wave: 0 }, boss: null,
    mama: { y: (FY0 + FY1) / 2, vy: 0, fireT: 0, open: 0, sq: 0 }, hearts: 3, heartFx: 0,
    meter: 0, need: UP.big.val(up.big), rate: UP.rate.val(up.rate), power: UP.power.val(up.power),
    fired: 0, made: 0, popped: 0, chain: 0, chainT: 0, win: 0, lose: 0, coins: 0, nextId: 1, cache: null, grid: new Map(), stats: { maxB: 0 },
  };
  for (const g of D.gates || []) L.gates.push(Object.assign({ fl: 0, id: L.gates.length }, g, { y0: g.y }));
  /* didelis ženklas, jei šalia nėra kitų vartų (kitaip ženklai užliptų vienas ant kito) */
  for (const g of L.gates) { const am = g2 => g2.move ? g2.move[0] : 0; g.sc = L.gates.some(o => o !== g && Math.abs(o.x - g.x) < 42 && Math.abs(o.y0 + o.h / 2 - g.y0 - g.h / 2) < 30 + am(o) + am(g)) ? 1 : 2; }
  for (const s of D.salt || []) L.salts.push(Object.assign({ hp0: s.hp }, s));
  for (const b of D.bubbles || []) L.bubbles.push(Object.assign({}, b));
  if (D.boss) L.boss = { x: TX - 30, y: (TY0 + TY1) / 2 + 8, hp: D.boss.hp, hp0: D.boss.hp, sp: D.boss.sp || 7, hit: 0, t: 0, throwT: 3, kind: D.w };
  fx = []; shake = 0; flash = 0; hitStop = 0; slow = 0;
}
const gateY = g => g.move ? g.y0 + Math.sin(L.t * g.move[1] + (g.move[2] || 0)) * g.move[0] : g.y0;
const gateGood = g => g.v[0] === 'x' || g.v[0] === '+';
const gateLabel = g => g.v[0] === 'x' ? '×' + g.v.slice(1) : g.v;

/* ---------- Gleivės ---------- */
function addBlob(x, y, hp, passed, vy) {
  if (L.blobs.length >= MAXB) {   // per daug - stiprinama artimiausia
    let best = null, bd = 1e9; for (let i = L.blobs.length - 1; i >= Math.max(0, L.blobs.length - 40); i--) { const b = L.blobs[i], d = Math.abs(b.x - x) + Math.abs(b.y - y); if (d < bd) { bd = d; best = b; } }
    if (best) best.hp = Math.min(30, best.hp + hp); return null;
  }
  const b = { id: L.nextId++, x, y, px: x, vy: vy || 0, hp, passed: passed ? passed.slice() : [], ph: rng() * 6, big: hp >= 10, bt: L.t };
  L.blobs.push(b); L.made++; return b;
}
function fire(big) {
  const m = L.mama;
  if (big) { addBlob(PX + 12, m.y, 12, null, 0); L.meter = 0; m.open = .4; m.sq = 1; m.kick = 1; shake = Math.max(shake, .3); stopFor(.05); sfx('big'); burstAt(PX + 14, m.y - 6, 'goo', 14); burstAt(PX + 16, m.y - 6, 'ring', 1); return; }
  const hp = rng() < L.power ? 2 : 1;
  addBlob(PX + 12, m.y + rr(-2, 2), hp, null, rr(-6, 6)); L.fired++; m.open = .12; m.sq = .4; m.kick = Math.max(m.kick || 0, .5); sfx('shoot');
}
function hitRect(b, r, pad) { return b.x > r.x - pad && b.x < r.x + r.w + pad && b.y > r.y - pad && b.y < r.y + r.h + pad; }
function stepBlobs(dt) {
  const B = L.blobs, grid = L.grid; grid.clear();
  for (const b of B) { const k = (b.x >> 3) * 64 + (b.y >> 3); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(b); }
  for (const b of B) {
    if (b.dead) continue; b.px = b.x;
    let sp = SPEED * (b.big ? .7 : 1), vx = sp, vy = b.vy;
    for (const z of L.ices) if (hitRect(b, z, 0)) { vx *= 1.8; }
    for (const z of L.pushes) if (hitRect(b, z, 0)) { vx += z.vx; vy += z.vy * dt * 4; }
    /* artėjant prie tvirtovės - sukama į ją */
    const tcy = (TY0 + TY1) / 2;
    if (b.x > TX - 120) { const want = clamp(tcy - b.y, -30, 30); vy += (want - vy) * dt * 2.5; }
    vy *= Math.exp(-dt * 1.5);
    /* atsistūmimas nuo kaimynų (minia nesusikloja į vieną tašką) */
    const gx = b.x >> 3, gy = b.y >> 3; let push = 0;
    for (let i = -1; i <= 1; i++) { const a = grid.get(gx * 64 + gy + i); if (!a) continue; for (const o of a) { if (o === b) continue; const d = b.y - o.y, dx = Math.abs(b.x - o.x); if (dx < 4 && Math.abs(d) < 4) push += d === 0 ? (b.id > o.id ? 1 : -1) : Math.sign(d) * (4 - Math.abs(d)); } }
    vy += clamp(push, -6, 6) * 20 * dt;
    b.vy = vy;
    let nx = b.x + vx * dt, ny = b.y + vy * dt;
    /* sienos: atsitrenkus slenkama į artimesnį kraštą */
    for (const w of L.walls) if (nx > w.x - 2 && nx < w.x + w.w + 2 && ny > w.y - 2 && ny < w.y + w.h + 3) {
      if (b.x <= w.x - 2) { nx = w.x - 2; const up = (ny - w.y) < (w.y + w.h - ny); ny += (up ? -1 : 1) * SPEED * dt; b.vy = up ? -20 : 20; }
      else { ny = ny < w.y + w.h / 2 ? w.y - 2 : w.y + w.h + 3; b.vy = 0; }
    }
    for (const j of L.jellies) if (hitRect({ x: nx, y: ny }, j, 0)) { b.vy = j.dir * 70; if (!b.jl) { sfx('boing'); b.jl = 1; } } else b.jl = 0;
    for (const p of L.portals) if (Math.hypot(nx - p.x, ny - p.y) < 6 && !b.warp) { nx = p.x2; ny = p.y2; b.px = nx - 1; b.warp = 1; sfx('warp'); burstAt(p.x, p.y, 'spark', 3); burstAt(p.x2, p.y2, 'spark', 3); }
    b.x = nx; b.y = clamp(ny, FY0 + 4, FY1 - 1);
    if (b.big && Math.random() < .35) burstAt(b.x - 6, b.y - 2, 'drip', 1);
    /* vartai: kertant x liniją aukščio ribose */
    for (const g of L.gates) {
      if (b.px < g.x && b.x >= g.x && b.passed.indexOf(g.id) < 0) { const gy = gateY(g);
        if (b.y >= gy && b.y <= gy + g.h) { b.passed.push(g.id); g.fl = .25; applyGate(b, g); } }
    }
    if (b.dead) continue;
    /* druska */
    for (const s of L.salts) if (s.hp > 0 && hitRect(b, s, 1)) { const d = Math.min(s.hp, b.hp); s.hp -= d; b.hp -= d; s.fl = .12; sfx('salt'); if (s.hp <= 0) { burstAt(s.x + s.w / 2, s.y + s.h / 2, 'salt', 18); sfx('crack'); } if (b.hp <= 0) { b.dead = 1; burstAt(b.x, b.y - 3, 'goo', 3); } break; }
    if (b.dead) continue;
    /* burbulai */
    for (const u of L.bubbles) if (!u.done && Math.hypot(b.x - u.x, b.y - 2 - u.y) < 10) { u.done = 1; sfx('bubble'); burstAt(u.x, u.y, 'ring', 1); for (let i = 0; i < u.n; i++) addBlob(u.x + rr(-6, 6), u.y + rr(-6, 6), 1, b.passed, rr(-25, 25)); }
    /* tvirtovė */
    if (b.x >= TX && b.y > TY0 - 6 && b.y < TY1 + 6) { hurtTower(b.hp, b.x, b.y); b.dead = 1; }
    else if (b.x > GW + 4) b.dead = 1;
  }
  L.blobs = B.filter(b => !b.dead);
  if (L.blobs.length > L.stats.maxB) L.stats.maxB = L.blobs.length;
}
function applyGate(b, g) {
  const t = g.v[0], n = +g.v.slice(1);
  g.bump = .14;
  if (t === 'x') { for (let i = 1; i < n; i++) addBlob(b.x + 1, b.y + (i % 2 ? -3 : 3) * Math.ceil(i / 2), b.hp, b.passed, (i % 2 ? -1 : 1) * rr(14, 30)); g.cnt = (g.cnt || 0) + n - 1; chainUp(); }
  else if (t === '+') { for (let i = 0; i < n; i++) addBlob(b.x + 1 + rr(0, 3), b.y + rr(-5, 5), 1, b.passed, rr(-25, 25)); g.cnt = (g.cnt || 0) + n; chainUp(); }
  else if (t === '-') { g.cnt = (g.cnt || 0) - Math.min(n, b.hp); b.hp -= n; if (b.hp <= 0) { b.dead = 1; burstAt(b.x, b.y - 3, 'goo', 5); sfx('pop'); } }
  if (t !== '-') burstAt(b.x, b.y - 3, 'spark', 1);
}
/* skaidymų grandinė: kuo daugiau skaidymų iš eilės, tuo aukštesnis garsas */
function chainUp() { if (L.t - L.chainT > .5) L.chain = 0; L.chain = Math.min(14, L.chain + .25); L.chainT = L.t; sfx('split', 1 + Math.floor(L.chain) * .055);
}
function hurtTower(d, x, y) {
  const T = L.tower; if (L.boss && L.boss.hp > 0) d = Math.ceil(d / 2);   // kol bosas gyvas, tvirtovė saugoma
  T.hp = Math.max(0, T.hp - d); T.hit = .12; T.dmg += d; sfx('tower'); burstAt(x, y - 3, 'goo', 2); if (rng() < .3) burstAt(x + 4, y - 4, 'chip', 1);
  if (d >= 6) { T.sq = 1; T.fl = .08; shake = Math.max(shake, .3); stopFor(.06); burstAt(x + 2, y - 6, 'ring', 1); burstAt(TX + 12, y - 10, 'brick', 5); }
  if (T.hp <= 0 && !L.win) { L.win = .001; sfx('win'); shake = .7; flash = .1; stopFor(.16, 1); towerBoom(); }
}

/* tvirtovė griūva: plytos, dulkių kamuoliai, konfeti */
function towerBoom() {
  for (let i = 0; i < 10; i++) burstAt(TX + 20 + (Math.random() - .5) * 30, TY0 + Math.random() * 90, 'brick', 4);
  for (let i = 0; i < 12; i++) burstAt(TX + 4 + Math.random() * 36, TY1 + 4 - Math.random() * 20, 'puff', 1);
  burstAt(TX + 20, TY0 + 40, 'conf', 70); burstAt(TX + 20, TY0 + 40, 'ring', 1);
}

/* ---------- Akmenukai ---------- */
const ROCK_K = { S: { hp: 1, sp: 24, r: 3 }, M: { hp: 5, sp: 18, r: 5 }, L: { hp: 14, sp: 12, r: 7 } };
function spawnRock(sz, y) { const K = ROCK_K[sz]; L.rocks.push({ sz, x: TX - 4, y, hp: K.hp, sp: K.sp * rr(.9, 1.1), r: K.r, hit: 0, ph: rng() * 6, vy: 0 }); }
function stepTower(dt) {
  const T = L.tower, D = L.D; T.hit -= dt; if (L.win) return;
  T.spawnT -= dt * (1 + (1 - T.hp / T.hp0) * (D.rage || .6));   // kuo labiau sugriauta, tuo greičiau siunčia
  if (T.spawnT <= 0) { const W = D.waves[T.wave % D.waves.length]; T.wave++; T.spawnT = D.every;
    const ys = []; for (const g of W) for (let i = 0; i < g[1]; i++) ys.push(g[0]);
    ys.forEach((sz, i) => spawnRock(sz, clamp((TY0 + TY1) / 2 + (i - (ys.length - 1) / 2) * 9 + rr(-3, 3), FY0 + 8, FY1 - 4)));
  }
}
function stepRocks(dt) {
  const grid = L.grid;
  for (const r of L.rocks) {
    r.hit -= dt; let vx = -r.sp, vy = r.vy;
    /* eina link mamos aukščio, bet lėtai (galima numatyti) */
    if (r.x < 240) vy += clamp(L.mama.y - r.y, -12, 12) * dt * .6; vy *= Math.exp(-dt * .5);
    let nx = r.x + vx * dt, ny = r.y + vy * dt;
    for (const w of L.walls) if (nx > w.x - r.r && nx < w.x + w.w + r.r && ny > w.y - 2 && ny < w.y + w.h + r.r) {
      if (r.x >= w.x + w.w + r.r) { nx = w.x + w.w + r.r; const up = (ny - w.y) < (w.y + w.h - ny); ny += (up ? -1 : 1) * r.sp * dt * 1.4; } else { ny = ny < w.y + w.h / 2 ? w.y - 2 : w.y + w.h + r.r; }
    }
    r.vy = vy; r.x = nx; r.y = clamp(ny, FY0 + 6, FY1 - 1);
    /* susidūrimai su gleivėmis */
    const gx = r.x >> 3, gy = r.y >> 3, R = 1 + (r.r >> 3);
    for (let i = -R - 1; i <= R; i++) for (let j = -R - 1; j <= R; j++) { const a = grid.get((gx + i) * 64 + gy + j); if (!a) continue;
      for (const b of a) { if (b.dead || r.hp <= 0) continue; const br = b.hp >= 10 ? 8 : b.hp >= 5 ? 6 : b.hp >= 2 ? 4 : 3;
        if (Math.abs(b.x - r.x) < br + r.r && Math.abs(b.y - r.y) < br + r.r) { const d = Math.min(b.hp, r.hp); b.hp -= d; r.hp -= d; r.hit = .1;
          if (b.hp <= 0) { b.dead = 1; burstAt(b.x, b.y - 3, 'goo', 4); sfx('pop'); } else if (b.big) { r.x += 3; }
          if (r.hp <= 0) { burstAt(r.x, r.y - r.r, 'chip', r.sz === 'S' ? 4 : 9); burstAt(r.x, r.y - 2, 'puff', r.sz === 'S' ? 1 : 3); sfx('crack'); L.popped++;
            if (b.big || r.sz === 'L') { shake = Math.max(shake, .15); burstAt(r.x, r.y - r.r, 'ring', 1); } } } } }
    if (r.hp > 0 && r.x < PX + 8) { r.hp = 0; L.hearts--; L.heartFx = 1; shake = .45; flash = .12; stopFor(.08); sfx('heart'); burstAt(PX + 4, r.y - 4, 'chip', 8); burstAt(PX + 4, r.y - 6, 'puff', 3);
      if (L.hearts <= 0 && !L.win) { L.lose = .001; sfx('lose'); } }
  }
  L.rocks = L.rocks.filter(r => r.hp > 0);
}
/* bosas: didelis akmenų milžinas eina link mamos, kol jis gyvas - tvirtovė gauna pusę žalos */
function stepBoss(dt) {
  const B = L.boss; if (!B || B.hp <= 0) return; B.t += dt; B.hit -= dt;
  B.x -= B.sp * dt; B.y += Math.sin(B.t * .7) * 10 * dt;
  B.throwT -= dt; if (B.throwT <= 0) { B.throwT = L.D.boss.th || 4; for (let i = 0; i < (L.D.boss.n || 3); i++) L.rocks.push({ sz: 'S', x: B.x - 12, y: clamp(B.y - 10 + (i - 1) * 10, FY0 + 6, FY1 - 2), hp: 1, sp: 28, r: 3, hit: 0, ph: i, vy: (i - 1) * 8 }); sfx('grr'); }
  const grid = L.grid, gx = B.x >> 3, gy = (B.y - 10) >> 3;
  for (let i = -3; i <= 2; i++) for (let j = -3; j <= 2; j++) { const a = grid.get((gx + i) * 64 + gy + j); if (!a) continue;
    for (const b of a) { if (b.dead) continue; if (Math.abs(b.x - B.x) < 18 && b.y > B.y - 30 && b.y < B.y + 4) { const d = Math.min(b.hp, B.hp); b.hp -= d; B.hp -= d; B.hit = .08; B.dmg = (B.dmg || 0) + d; if (b.hp <= 0) { b.dead = 1; burstAt(b.x, b.y - 3, 'goo', 3); sfx('pop'); } } } }
  if (B.hp <= 0) { sfx('boss'); shake = .8; flash = .12; stopFor(.18, .6); for (let i = 0; i < 6; i++) burstAt(B.x + rr(-12, 12), B.y - rr(0, 24), 'chip', 8); for (let i = 0; i < 8; i++) burstAt(B.x + (Math.random() - .5) * 30, B.y - Math.random() * 20, 'puff', 1); burstAt(B.x, B.y - 16, 'conf', 40); burstAt(B.x, B.y - 16, 'ring', 1); L.popped += 10; }
  if (B.x < PX + 14) { L.hearts = 0; L.heartFx = 1; L.lose = .001; sfx('lose'); B.hp = 0; }
}

/* ---------- Vienas žingsnis: in - valdymas {y (tikslas), fire, big} ---------- */
function step(dt, inp) {
  if (L.win || L.lose) { L.win && (L.win += dt); L.lose && (L.lose += dt); stepParticles(fx, dt); L.blobs.forEach(b => { b.x += SPEED * dt * .5; }); L.blobs = L.blobs.filter(b => b.x < GW + 4); return; }
  L.t += dt; const m = L.mama;
  /* mama slenka link tikslo */
  const ty = clamp(inp.y, FY0 + 22, FY1 - 2), d = ty - m.y; m.vy = clamp(d * 12, -260, 260); m.y += m.vy * dt; m.open -= dt; m.sq = Math.max(0, m.sq - dt * 4);
  m.fireT -= dt; if (inp.fire && m.fireT <= 0) { m.fireT = 1 / L.rate; fire(false); }
  if (inp.big && L.meter >= L.need) fire(true);
  for (const g of L.gates) { g.fl -= dt; g.bump = Math.max(0, (g.bump || 0) - dt); g.ct = (g.ct || 0) - dt;
    if (g.cnt && g.ct <= 0) { fx.push({ k: 'num', s: (g.cnt > 0 ? '+' : '') + g.cnt, x: g.x, y: gateY(g) - 14, vy: -24, t: .7, max: .7, c: g.cnt > 0 ? (WORLD[L.w].key === 'snow' ? '#2A80B6' : '#BDF6FF') : (WORLD[L.w].key === 'snow' ? '#C83A3A' : '#FF9A9A'), sc: g.cnt >= 30 ? 2 : 1 }); g.cnt = 0; g.ct = .3; } }
  for (const s of L.salts) s.fl = (s.fl || 0) - dt;
  { const T = L.tower; T.sq = Math.max(0, T.sq - dt * 5); T.fl = Math.max(0, (T.fl || 0) - dt); T.ghost = Math.max(T.hp, T.ghost - Math.max(4, (T.ghost - T.hp) * 2.5) * dt); T.dmgT -= dt;
    if (T.dmg > 0 && T.dmgT <= 0) { fx.push({ k: 'num', s: '-' + T.dmg, x: TX + 18 + (Math.random() - .5) * 16, y: TY0 - 4 + Math.random() * 30, vy: -30, t: .6, max: .6, c: T.dmg >= 10 ? '#FFD24A' : WORLD[L.w].key === 'snow' ? '#3A4458' : '#FFFFFF', sc: T.dmg >= 10 ? 2 : 1 }); T.sq = Math.max(T.sq, Math.min(1, .3 + T.dmg * .05)); T.fl = .06; T.dmg = 0; T.dmgT = .25; }
    if (T.hp / T.hp0 < .35 && Math.random() < dt * 4) burstAt(TX + 8 + Math.random() * 26, TY0 - 10, 'smoke', 1); }
  if (L.boss && L.boss.hp > 0 && L.boss.dmg && Math.random() < dt * 5) { const B = L.boss; fx.push({ k: 'num', s: '-' + B.dmg, x: B.x + (Math.random() - .5) * 20, y: B.y - 46, vy: -26, t: .55, max: .55, c: '#FFFFFF', sc: 1 }); B.dmg = 0; }
  m.kick = Math.max(0, (m.kick || 0) - dt * 6);
  stepBlobs(dt); stepTower(dt); stepRocks(dt); stepBoss(dt);
  /* didžiosios gleivės įkrova: nuo kiekvienos gleivės, kuri pasiekė tvirtovę ar sudaužė akmenuką */
  L.meter = Math.min(L.need, L.meter + dt * 1.2 + (L.made - (L.madePrev || 0)) * .05); L.madePrev = L.made;
  L.heartFx = Math.max(0, L.heartFx - dt); shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
  stepParticles(fx, dt);
}

/* ---------- Dalelės ---------- */
function burstAt(x, y, k, n) {
  if (typeof state !== 'undefined' && state === 'solve') return;
  const col = BLOB_COLS[save.color] || BLOB_COLS[0];
  if (fx.length > 700 && k !== 'conf') return;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = 30 + Math.random() * 90;
    if (k === 'goo') fx.push({ k: 'px', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: .3 + Math.random() * .3, max: .6, c: Math.random() < .5 ? col.g : col.w, g: 1 });
    else if (k === 'chip') fx.push({ k: 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, t: .4 + Math.random() * .4, max: .8, c: pick([WORLD[L ? L.w : 0].rock, WORLD[L ? L.w : 0].rockH, WORLD[L ? L.w : 0].rockS]), g: 1 });
    else if (k === 'salt') fx.push({ k: 'px', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, t: .4 + Math.random() * .3, max: .7, c: Math.random() < .5 ? '#FFFFFF' : '#C8D2E2', g: 1 });
    else if (k === 'spark') fx.push({ k: 'star', x: x + (Math.random() - .5) * 6, y: y + (Math.random() - .5) * 6, vx: 0, vy: -20, t: .25, max: .25 });
    else if (k === 'ring') fx.push({ k: 'ring', x, y, t: .3, max: .3 });
    else if (k === 'drip') fx.push({ k: 'px', x: x + (Math.random() - .5) * 6, y, vx: -10, vy: -20, t: .35, max: .35, c: Math.random() < .5 ? col.g : col.d, g: 1 });
    else if (k === 'puff') fx.push({ k: 'puff', x: x + (Math.random() - .5) * 8, y, vx: (Math.random() - .5) * 30, vy: -14 - Math.random() * 14, t: .5 + Math.random() * .3, max: .8, c: WORLD[L ? L.w : 0].key });
    else if (k === 'smoke') fx.push({ k: 'puff', x, y, vx: 6 + Math.random() * 6, vy: -16, t: 1, max: 1, c: 'smoke' });
    else if (k === 'brick') { const W = WORLD[L ? L.w : 0]; fx.push({ k: 'brick', x, y, vx: Math.cos(a) * v * 1.2, vy: -60 - Math.random() * 90, t: .7 + Math.random() * .4, max: 1.1, c: pick(W.tower || [W.rock]), g: 1, r: Math.random() < .5 }); }
    else if (k === 'conf') fx.push({ k: 'conf', x, y, vx: Math.cos(a) * v * 1.6, vy: -80 - Math.random() * 140, t: 1.4 + Math.random() * .9, max: 2.3, c: pick(CONF_C), ph: Math.random() * 6, g: .35 });
  }
}
const CONF_C = ['#FFD24A', '#FF5A8A', '#5AE0FF', '#7BE34A', '#B07AFF', '#FFFFFF'];
function stepParticles(list, dt) {
  for (const p of list) { p.t -= dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; if (p.g) p.vy += 420 * p.g * dt; if (p.k === 'px' || p.k === 'chip' || p.k === 'brick') p.vx *= Math.exp(-dt * 3);
    if (p.k === 'conf') { p.vx *= Math.exp(-dt * 2.2); p.vy = Math.min(p.vy, 38); p.x += Math.sin(p.t * 9 + p.ph) * 22 * dt; }
    if (p.k === 'puff') { p.vx *= Math.exp(-dt * 2); p.vy *= Math.exp(-dt * 1.5); } }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].t <= 0) list.splice(i, 1);
}
const PUFF_C = { meadow: ['#9A8A6A', '#D8CCAA', '#F4ECD4'], desert: ['#B08A50', '#E8CC90', '#FFF0C8'], snow: ['#9AB6CC', '#E2EEF8', '#FFFFFF'], candy: ['#C878A8', '#FFC8E4', '#FFF0FA'],
  volcano: ['#4A3A3A', '#7A6A6A', '#A89898'], space: ['#5A5A8A', '#9A9ACA', '#D8D8F8'], smoke: ['#3A3440', '#6A6270', '#9A92A0'] };
function drawParticles(list) {
  for (const p of list) { const k = p.t / p.max, x = Math.round(p.x), y = Math.round(p.y);
    if (p.k === 'px') { ctx.fillStyle = p.c; const s = k > .5 ? 2 : 1; ctx.fillRect(x, y, s, s); }
    else if (p.k === 'chip') { ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, 4, 4); ctx.fillStyle = p.c; ctx.fillRect(x, y, 2, 2); }
    else if (p.k === 'ring') { const R = Math.round((1 - k) * 16); ctx.fillStyle = '#E6F6FF'; for (let a = 0; a < 20; a++) { const q = a / 20 * TAU; ctx.fillRect(Math.round(p.x + Math.cos(q) * R), Math.round(p.y + Math.sin(q) * R), 1, 1); } }
    else if (p.k === 'star') { ctx.fillStyle = k > .5 ? '#FFFFFF' : '#BDF6FF'; ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1); }
    else if (p.k === 'num') { const e = p.max - p.t, pop = e < .08 ? -2 : 0; ctx.globalAlpha = Math.min(1, k * 3); text(p.s, x, y + pop, p.sc || 1, p.c, .5); ctx.globalAlpha = 1; }
    else if (p.k === 'brick') { ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, p.r ? 6 : 5, p.r ? 4 : 5); ctx.fillStyle = p.c; ctx.fillRect(x, y, p.r ? 4 : 3, p.r ? 2 : 3); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, p.r ? 4 : 3, 1); }
    else if (p.k === 'conf') { ctx.fillStyle = p.c; if (Math.floor(p.t * 12 + p.ph) % 2) ctx.fillRect(x, y, 2, 1); else ctx.fillRect(x, y, 1, 2); }
    else if (p.k === 'puff') {   /* dulkių / dūmų kamuoliukas: šešėlis apačioje, šviesa viršuje (ne plokščias diskas) */
      const PC = PUFF_C[p.c] || PUFF_C.meadow, r = 1 + Math.round((1 - k) * 3); ctx.globalAlpha = Math.min(1, k * 2.2);
      ctx.fillStyle = PC[0]; ctx.fillRect(x - r, y - r + 1, r * 2 + 1, r * 2); ctx.fillRect(x - r + 1, y - r, r * 2 - 1, r * 2 + 2);
      ctx.fillStyle = PC[1]; ctx.fillRect(x - r, y - r, r * 2, r * 2 - 1); ctx.fillRect(x - r + 1, y - r - 1, r * 2 - 2, r * 2);
      ctx.fillStyle = PC[2]; ctx.fillRect(x - r + 1, y - r, Math.max(1, r - 1), Math.max(1, r - 1)); ctx.globalAlpha = 1; }
  }
}
