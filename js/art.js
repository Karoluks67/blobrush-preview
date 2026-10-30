/* art: viskas piešiama kodu - pikselių žemėlapiai (rankomis) ir paprasti stačiakampiai. Gleivės, kepurės, akmenukai, bokštai,
   mama gleivė (paleidimo „pompa"), vartai, druskos luitai, burbulai, pasaulių žemės ir sienos. Sprite'ai talpinami drobėse (greitis). */
'use strict';
const OUT = '#0B0A10';

/* ---------- Pikselių žemėlapiai ---------- */
function drawMap(rows, x, y, pal, flip) {
  const w = rows[0].length;
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < w; c++) {
    const ch = rows[r][c]; if (ch === '.') continue; const col = pal[ch]; if (!col) continue;
    ctx.fillStyle = col; ctx.fillRect(Math.round(x + (flip ? w - 1 - c : c)), Math.round(y + r), 1, 1);
  }
}
function mapCanvas(rows, pal, flip) {   // pikselių žemėlapis -> drobė
  const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
  const keep = ctx; ctx = c.getContext('2d'); try { drawMap(rows, 0, 0, pal, flip); } finally { ctx = keep; } return c;
}

/* ---------- Gleivės: 4 dydžiai (S 1 gyvybė, M 2-4, L 5-9, XL - didžioji) × 2 kadrai (stovi / šuolio suspaudimas) ---------- */
const BLOB_M = {
  S: [['..kkk..', '.kwggk.', 'kwggggk', 'kggEgEk', 'kdggggk', '.kkkkk.'],
      ['.......', '.kkkkk.', 'kwggggk', 'kggEgEk', 'kddddgk', '.kkkkk.']],
  M: [['..kkkkk..', '.kwwgggk.', 'kwggggggk', 'kgggEgEgk', 'kgggEgEgk', 'kdggggggk', 'kddddddgk', '.kkkkkkk.'],
      ['.........', '..kkkkk..', '.kwwggggk', 'kwgggEgEk', 'kggggEgEk', 'kdggggggk', 'kddddddgk', '.kkkkkkk.']],
  L: [['....kkkkk....', '..kkwwgggkk..', '.kwwgggggggk.', 'kwggggggggggk', 'kgggggwEgwEgk', 'kgggggEEgEEgk', 'kgggggggggggk', 'kgggggggmmggk', 'kddgggggggddk', 'kdddddddddddk', '.kkkkkkkkkkk.'],
      ['.............', '....kkkkk....', '..kkwwgggkk..', '.kwwgggggggk.', 'kwggggwEgwEgk', 'kgggggEEgEEgk', 'kgggggggggggk', 'kgggggggmmggk', 'kddgggggggddk', 'kdddddddddddk', '.kkkkkkkkkkk.']],
  X: [['......kkkkk......', '....kkwwgggkk....', '...kwwgggggggk...', '..kwggggggggggk..', '.kgggggggwEgwEgk.', '.kgggggggEEgEEgk.', 'kggggggggEEgEEggk', 'kggggggppgggggppk', 'kggggggggmmmggggk', 'kdgggggggmrmgggdk', 'kddgggggggggggddk', 'kdddddddddddddddk', '.kkkkkkkkkkkkkkk.'],
      ['.................', '....kkkkkkkkk....', '...kwwgggggggk...', '..kwggggggggggk..', '.kgggggggwEgwEgk.', '.kgggggggEEgEEgk.', 'kggggggggEEgEEggk', 'kggggggppgggggppk', 'kggggggggmmmggggk', 'kdgggggggmrmgggdk', 'kddgggggggggggddk', 'kdddddddddddddddk', '.kkkkkkkkkkkkkkk.']],
};
/* spalvos (kosmetika): pagrindinė, šviesa, šešėlis, kontūras */
const BLOB_COLS = [
  { g: '#7BE34A', w: '#D9FFB0', d: '#3FA43A', k: '#123A1C' },   // žalia
  { g: '#FF7AB8', w: '#FFD2E6', d: '#D6407E', k: '#4A1030' },   // rožinė
  { g: '#5AB8FF', w: '#CDEBFF', d: '#2F78D6', k: '#0E2650' },   // mėlyna
  { g: '#FFB13A', w: '#FFE6B0', d: '#D9701E', k: '#4A2208' },   // oranžinė
  { g: '#B07AFF', w: '#E6D2FF', d: '#7046D0', k: '#26104A' },   // violetinė
  { g: '#FFE04A', w: '#FFF8C8', d: '#D6A41E', k: '#4A3608' },   // auksinė
];
const BLOB_COST = [0, 80, 80, 120, 160, 400];
/* kepurės (piešiamos ant gleivės viršaus; o - kontūras) */
const HATS = [
  null,
  { m: ['..o..', '.oyo.', '.oro.', 'oyyro'], c: { o: OUT, y: '#FFE04A', r: '#FF4A6A' }, cost: 60 },     // gimtadienio kepurė
  { m: ['o.o.o', 'oyoyo', 'oyyyo', 'ooooo'], c: { o: OUT, y: '#FFD23A' }, cost: 150 },                 // karūna
  { m: ['.o.o.', 'opwpo', '.opo.', '..o..'], c: { o: OUT, p: '#FF8AC0', w: '#FFF6A8' }, cost: 60 },     // gėlė
  { m: ['.ooo.', 'obbbo', 'owwwo'], c: { o: OUT, b: '#4A6AFF', w: '#E8ECFF' }, cost: 80 },             // kepurytė
  { m: ['..oo...', '.obbo..', 'oooooo.', 'obbbbbo', 'ooooooo'], c: { o: OUT, b: '#8A5A2E' }, cost: 120 },   // kaubojaus
  { m: ['.ooo.', 'ow.wo', '.ooo.'], c: { o: '#FFE88A', w: '#FFFFFF' }, cost: 200 },                   // aureolė
  { m: ['o...o', 'op.po', 'ooooo'], c: { o: OUT, p: '#FF9AB8' }, cost: 100 },                                 // katės ausytės
];
const SPR = new Map();
function blobSprite(sz, f, col, hat) {
  const key = sz + f + col + '_' + hat; let c = SPR.get(key); if (c) return c;
  const P = BLOB_COLS[col] || BLOB_COLS[0], m = BLOB_M[sz][f] && BLOB_M[sz][f].length ? BLOB_M[sz][f] : BLOB_M[sz][0];
  const H = hat ? HATS[hat] : null, hh = H ? H.m.length - 1 : 0, w = m[0].length, h = m.length + hh;
  c = document.createElement('canvas'); c.width = Math.max(w, H ? H.m[0].length : 0); c.height = h;
  const keep = ctx; ctx = c.getContext('2d');
  try {
    drawMap(m, 0, hh, { k: P.k, g: P.g, w: P.w, d: P.d, E: OUT, m: '#5A1020', r: '#FF6A7A', p: '#FF9AB8' });
    if (H) { let top = 0; while (top < m.length && m[top].indexOf('k') < 0) top++; const mid = Math.floor(w / 2);
      drawMap(H.m, mid - Math.floor(H.m[0].length / 2) + (sz === 'S' ? 0 : 1), hh + top - H.m.length + 1, H.c); }
  } finally { ctx = keep; }
  SPR.set(key, c); return c;
}
const blobSize = hp => hp >= 10 ? 'X' : hp >= 5 ? 'L' : hp >= 2 ? 'M' : 'S';
/* x, y - gleivės pado vidurys */
function drawBlob(x, y, hp, f, col, hat, hop) { const c = blobSprite(blobSize(hp), f, col, hat); ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height - (hop || 0))); }

/* ---------- Akmenukai (priešai): mažas, vidutinis, riedulys. Spalvos pagal pasaulį ---------- */
const ROCK_M = {
  S: [['..kkk..', '.khhrk.', 'khrrrrk', 'kbErbEk', 'krrrrsk', '.kkkkk.'], ['.......', '.kkkkk.', 'khhrrrk', 'kbErbEk', 'krrrrsk', '.kkkkk.']],
  M: [['...kkkkk...', '..khhrrrk..', '.khrrrrrrk.', 'khrbbrrbbrk', 'krrrErrErrk', 'krrrrrrrrrk', 'krrrkkkrrsk', 'ksrrrrrrssk', '.ksssssssk.', '..kkkkkkk..'],
      ['...........', '...kkkkk...', '.kkhhrrrkk.', 'khrrrrrrrrk', 'krrbbrrbbrk', 'krrrErrErrk', 'krrrkkkrrsk', 'ksrrrrrrssk', '.ksssssssk.', '..kkkkkkk..']],
  L: [['....kkkkkkk....', '..kkhhhrrrrkk..', '.khhrrrrrrrrrk.', '.khrrrrrrrrrrk.', 'khrrbbbrrbbbrrk', 'krrrrEErrEErrrk', 'krrrrEErrEErrrk', 'krrrrrrrrrrrrsk', 'krrrrkkkkkrrrsk', 'ksrrrrrrrrrrssk', 'kssrrrrrrrrsssk', '.ksssssssssssk.', '..kkkkkkkkkkk..'], []],
};
ROCK_M.L[1] = ['...............'].concat(ROCK_M.L[0].slice(0, 2), ROCK_M.L[0].slice(4));
function rockSprite(sz, f, w) {
  const key = 'r' + sz + f + w; let c = SPR.get(key); if (c) return c; const W = WORLD[w];
  c = mapCanvas(ROCK_M[sz][f], { k: OUT, h: W.rockH, r: W.rock, s: W.rockS, b: '#2A2230', E: '#FFE36B' }, true);
  SPR.set(key, c); return c;
}
function drawRock(x, y, sz, f, w) { const c = rockSprite(sz, f, w); ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height)); }

/* ---------- Pasauliai: žemė, sienos, akmenukų ir bokšto spalvos ---------- */
const WORLD = [
  { key: 'meadow', g0: '#5DB04A', g1: '#4E9C40', g2: '#78C65A', gD: '#3E8434', acc: '#FFE36B', acc2: '#FF8AC0', node: '#9BE36A', deep: '#2E6A2A',
    rock: '#9A98A8', rockH: '#C8C6D2', rockS: '#6A6878', wall: ['#2E7A34', '#4FA84A', '#1C5226'], tower: ['#8A8898', '#B4B2C2', '#5E5C6E'], sky: '#9BE3FF' },
  { key: 'desert', g0: '#E6BC78', g1: '#D6A862', g2: '#F2D398', gD: '#B8874A', acc: '#7AC35A', acc2: '#FF7A5A', node: '#FFD27A', deep: '#9A6A34',
    rock: '#C8885A', rockH: '#E6B07E', rockS: '#94603C', wall: ['#B87A44', '#D69A5E', '#7E4E2A'], tower: ['#B07A4E', '#D69E6E', '#7A5032'], sky: '#FFE6A8' },
  { key: 'snow', g0: '#E8F2FA', g1: '#D2E2F0', g2: '#FFFFFF', gD: '#AEC6DC', acc: '#7AD0F5', acc2: '#FF6A6A', node: '#BDE8FF', deep: '#7A9AB8',
    rock: '#8EA6C0', rockH: '#C6DAEC', rockS: '#5E7894', wall: ['#7ACBEA', '#BFEAFA', '#3E86B0'], tower: ['#8EA0B8', '#C2D2E4', '#5E6E88'], sky: '#CDEBFF' },
  { key: 'candy', g0: '#FFC2DE', g1: '#F7AACB', g2: '#FFE0EE', gD: '#E080AC', acc: '#7AE0FF', acc2: '#FFE04A', node: '#FFB2D6', deep: '#B0507E',
    rock: '#A86A4A', rockH: '#D69A72', rockS: '#7A4630', wall: ['#7A4A2E', '#A86E48', '#4E2A18'], tower: ['#8E5A3E', '#C08A62', '#5E3622'], sky: '#FFE0F0' },
  { key: 'volcano', g0: '#4A3030', g1: '#3E2626', g2: '#5E3C38', gD: '#2A1A1A', acc: '#FF7A2A', acc2: '#FFD24A', node: '#FF8A4A', deep: '#2A0C0A',
    rock: '#8A7A82', rockH: '#B8A6AE', rockS: '#5A4A52', wall: ['#2E2228', '#4E3E46', '#1A1216'], tower: ['#4E4048', '#726068', '#2E242A'], sky: '#FF9A5A' },
  { key: 'space', g0: '#2A2A4A', g1: '#22223E', g2: '#3A3A62', gD: '#18182E', acc: '#7AF0FF', acc2: '#FF7AE0', node: '#A88AFF', deep: '#100E22',
    rock: '#8A8AA8', rockH: '#B8B8D2', rockS: '#5A5A7A', wall: ['#4A5A7A', '#7A8AAA', '#2A344A'], tower: ['#6A6A8A', '#9A9ABA', '#44445E'], sky: '#1A1A36' },
];
const WN = WORLD.length;

/* Žemė: tekstūra pagal pasaulį (piešiama į g, plotas w×h) */
function groundArt(g, w, W, h, ww) {
  const R = (x, y, a, b, c) => { g.fillStyle = c; g.fillRect(x, y, a, b); };
  ww = ww || GW; h = h || GH; R(0, 0, ww, h, W.g0);
  const n = Math.floor(ww * h / 60);
  if (W.key === 'meadow') {
    for (let i = 0; i < n; i++) { const x = Math.floor(hash(i, 1, w) * ww), y = Math.floor(hash(i, 2, w) * h), v = hash(i, 3, w);
      if (v < .45) R(x, y, 1, 2, W.g1); else if (v < .8) { R(x, y, 1, 1, W.g2); R(x + 1, y - 1, 1, 1, W.g2); } else if (v < .83) { R(x, y, 2, 2, hash(i, 4, w) < .5 ? W.acc : W.acc2); R(x, y, 1, 1, '#FFFFFF'); } }
    for (let i = 0; i < 14; i++) { const x = Math.floor(hash(i, 5, w) * ww), y = Math.floor(hash(i, 6, w) * h); for (let k = 0; k < 18; k++) R(x + Math.floor(hash(i, k, 7) * 30), y + Math.floor(hash(i, k, 8) * 14), 2, 1, W.g1); }
  } else if (W.key === 'desert') {
    for (let y = 0; y < h; y += 7) for (let x = 0; x < ww; x += 2) { const yy = y + Math.round(Math.sin(x / 11 + y * .7) * 2); if (hash(x, y, 3) < .55) R(x, yy, 2, 1, W.g1); }
    for (let i = 0; i < n / 3; i++) R(Math.floor(hash(i, 1, 9) * ww), Math.floor(hash(i, 2, 9) * h), 1, 1, hash(i, 3, 9) < .5 ? W.g2 : W.gD);
  } else if (W.key === 'snow') {
    for (let i = 0; i < n; i++) { const x = Math.floor(hash(i, 1, 4) * ww), y = Math.floor(hash(i, 2, 4) * h); R(x, y, 2, 1, hash(i, 3, 4) < .6 ? W.g1 : W.g2); }
    for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 5, 4) * ww), y = Math.floor(hash(i, 6, 4) * h); R(x, y, 1, 1, '#FFFFFF'); R(x - 1, y + 1, 3, 1, W.g1); }
  } else if (W.key === 'candy') {
    for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < ww; x += 16) R(x, y, 8, 8, W.g1);   // šachmatų pyragas
    for (let i = 0; i < n / 4; i++) { const x = Math.floor(hash(i, 1, 5) * ww), y = Math.floor(hash(i, 2, 5) * h); R(x, y, 2, 1, ['#FFFFFF', '#7AE0FF', '#FFE04A', '#9BE36A'][Math.floor(hash(i, 3, 5) * 4)]); }   // pabarstukai
  } else if (W.key === 'volcano') {
    for (let i = 0; i < n; i++) R(Math.floor(hash(i, 1, 6) * ww), Math.floor(hash(i, 2, 6) * h), 2, 1, hash(i, 3, 6) < .5 ? W.g1 : W.g2);
    for (let k = 0; k < 7; k++) { let x = Math.floor(hash(k, 1, 7) * ww), y = Math.floor(hash(k, 2, 7) * h); for (let s = 0; s < 22; s++) { R(x, y, 1, 1, '#C8401A'); if (s % 3 === 0) R(x, y, 1, 1, '#FF8A3A'); x += 1; y += hash(k, s, 8) < .5 ? 1 : -1; } }   // įkaitę plyšiai
  } else {
    for (let i = 0; i < n; i++) R(Math.floor(hash(i, 1, 10) * ww), Math.floor(hash(i, 2, 10) * h), 1, 1, hash(i, 3, 10) < .5 ? W.g1 : W.g2);
    for (let i = 0; i < 16; i++) { const x = Math.floor(hash(i, 4, 10) * ww), y = Math.floor(hash(i, 5, 10) * h), r = 3 + Math.floor(hash(i, 6, 10) * 6);   // krateriai
      for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const d = Math.hypot(a, b); if (d <= r) R(x + a, y + b, 1, 1, d > r - 1 ? (b < 0 ? W.gD : W.g2) : W.g1); } }
  }
}
/* Siena (stačiakampis) - pasaulio stiliumi, su kontūru ir apšvietimu iš viršaus */
function wallArt(g, x, y, w, h, W, wi) {
  const R = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(x + a, y + b, c, d); };
  const [mid, hi, lo] = W.wall;
  R(-1, -1, w + 2, h + 3, OUT); R(0, 0, w, h + 1, lo); R(0, 0, w, h - 2, mid);
  if (W.key === 'meadow') {   // gyvatvorė: lapų kuokštai
    for (let yy = 0; yy < h - 3; yy += 3) for (let xx = (yy / 3 % 2) * 2; xx < w; xx += 4) { R(xx, yy, 2, 2, hi); if (hash(xx + x, yy + y, 2) < .12) R(xx + 1, yy, 1, 1, W.acc2); }
    R(0, 0, w, 1, '#8ADA6A');
  } else if (W.key === 'desert') {   // smiltainio plytos
    for (let yy = 0; yy < h - 2; yy += 5) { R(0, yy, w, 1, hi); for (let xx = (yy / 5 % 2) * 4; xx < w; xx += 8) R(xx, yy + 1, 1, 4, lo); }
  } else if (W.key === 'snow') {   // ledo luitai
    R(0, 0, w, 2, '#FFFFFF'); for (let i = 0; i < w * h / 30; i++) R(Math.floor(hash(i, x, y) * w), 2 + Math.floor(hash(i, y, x) * (h - 5)), 2, 1, hi);
  } else if (W.key === 'candy') {   // šokolado plytelės
    for (let yy = 0; yy < h - 3; yy += 6) for (let xx = 0; xx < w; xx += 6) { R(xx + 1, yy + 1, 4, 4, hi); R(xx + 1, yy + 1, 4, 1, '#C89068'); }
  } else if (W.key === 'volcano') {   // bazaltas su žarijomis
    for (let yy = 0; yy < h - 3; yy += 4) for (let xx = (yy / 4 % 2) * 3; xx < w; xx += 6) R(xx, yy, 4, 1, hi);
    for (let i = 0; i < w * h / 80; i++) R(Math.floor(hash(i, x, 1) * w), Math.floor(hash(i, y, 2) * (h - 3)), 1, 1, '#FF6A2A');
  } else {   // metalinės plokštės su kniedėmis
    R(0, 0, w, 1, hi); for (let yy = 4; yy < h - 3; yy += 8) R(0, yy, w, 1, lo); for (let yy = 1; yy < h - 3; yy += 8) { R(1, yy, 1, 1, hi); R(w - 2, yy, 1, 1, hi); }
  }
}

/* ---------- Mama gleivė - paleidimo „pompa" kairėje (22×20) ---------- */
const MAMA = ['.......kkkkkkk.......', '.....kkwwgggggkk.....', '....kwwgggggggggk....', '...kwggggggggggggk...', '..kwggggggggggggggk..', '.kgggggggggwEggwEggk.', '.kgggggggggEEggEEggk.', 'kggggggggggEEggEEgggk', 'kggggggggppggggggppgk', 'kggggggggggggmmmggggk', 'kdgggggggggggmrmgggdk', 'kddgggggggggggmgggddk', 'kdddgggggggggggggdddk', 'kdddddddddddddddddddk', '.kkkkkkkkkkkkkkkkkkk.'];
const MAMA_OPEN = ['.......kkkkkkk.......', '.....kkwwgggggkk.....', '....kwwgggggggggk....', '...kwggggggggggggk...', '..kwggggggggggggggk..', '.kgggggggggwEggwEggk.', '.kgggggggggEEggEEggk.', 'kggggggggggEEggEEgggk', 'kggggggggppggggggppgk', 'kgggggggggggmmmmmgggk', 'kdggggggggggmrrrmggdk', 'kddggggggggggmmmggddk', 'kdddgggggggggggggdddk', 'kdddddddddddddddddddk', '.kkkkkkkkkkkkkkkkkkk.'];
function drawMama(x, y, col, open, sq, blink) {
  const P = BLOB_COLS[col] || BLOB_COLS[0], pal = { k: P.k, g: P.g, w: P.w, d: P.d, E: OUT, m: '#5A1020', r: '#FF6A7A', p: '#FF9AB8' };
  const key = 'mama' + col + (open ? 1 : 0) + (blink ? 1 : 0); let c = SPR.get(key);
  if (!c) { let m = open ? MAMA_OPEN : MAMA; if (blink) m = m.map((r, i) => i === 5 || i === 6 ? r.replace(/[Ew]/g, 'g') : r); c = mapCanvas(m, pal); SPR.set(key, c); }
  const w = c.width + Math.round(sq * 2), h = c.height - Math.round(sq * 2);
  ctx.drawImage(c, Math.round(x - w / 2), Math.round(y - h), w, h);
  /* kaspinas */
  drawMap(['ooo.ooo', 'obboobo', 'obbbbbo', 'obboobo', 'ooo.ooo'], Math.round(x - 1), Math.round(y - h - 3), { o: OUT, b: '#FF5A8A' });
}

/* ---------- Akmenukų tvirtovė dešinėje (pagal pasaulį); dmg 0..1 - įtrūkimai ---------- */
function towerArt(g, W, dmg, wi) {
  const R = (a, b, c, d, col) => { g.fillStyle = col; g.fillRect(a, b, c, d); };
  const [mid, hi, lo] = W.tower, w = 40, h = 92;
  R(0, 10, w, h - 10, OUT); R(1, 11, w - 2, h - 12, mid);
  for (let yy = 14; yy < h - 4; yy += 7) { R(1, yy, w - 2, 1, lo); for (let xx = (yy / 7 % 2) * 6 + 2; xx < w - 2; xx += 12) R(xx, yy + 1, 1, 6, lo); R(1, yy + 1, w - 2, 1, hi); }
  for (let i = 0; i < 4; i++) { R(i * 11, 0, 8, 12, OUT); R(i * 11 + 1, 1, 6, 10, mid); R(i * 11 + 1, 1, 6, 2, hi); }   // dantys
  R(1, 11, 2, h - 12, hi);
  /* pikti „langai-akys" ir durys-burna */
  R(8, 30, 9, 6, OUT); R(23, 30, 9, 6, OUT); R(9, 32, 7, 3, '#FFD24A'); R(24, 32, 7, 3, '#FFD24A'); R(7, 27, 10, 2, OUT); R(23, 27, 10, 2, OUT); R(9, 26, 6, 1, OUT); R(25, 26, 6, 1, OUT);
  R(12, h - 30, 16, 28, OUT); R(13, h - 29, 14, 27, '#2A1A1A'); for (let i = 0; i < 4; i++) R(13 + i * 4, h - 29, 2, 4, '#E8E0D0');   // dantytos durys
  if (W.key === 'snow') { R(0, 0, w, 3, '#FFFFFF'); R(0, 10, w, 2, '#FFFFFF'); }
  if (W.key === 'candy') for (let i = 0; i < 12; i++) R(2 + Math.floor(hash(i, 1, 3) * (w - 4)), 40 + Math.floor(hash(i, 2, 3) * 20), 2, 1, ['#FF8AC0', '#7AE0FF', '#FFE04A'][i % 3]);
  if (W.key === 'volcano') for (let i = 0; i < 8; i++) R(2 + Math.floor(hash(i, 1, 4) * (w - 4)), 14 + Math.floor(hash(i, 2, 4) * 60), 1, 3, '#FF6A2A');
  if (W.key === 'space') { R(18, -10, 1, 10, OUT); R(16, -12, 5, 3, '#7AF0FF'); }
  else { R(19, -14, 1, 14, OUT); R(20, -14, 9, 6, '#E0443A'); R(20, -14, 9, 1, '#FF7A6A'); }   // vėliava
  /* įtrūkimai */
  const n = Math.floor(dmg * 10);
  for (let k = 0; k < n; k++) { let x = 3 + Math.floor(hash(k, wi, 11) * (w - 8)), y = 14 + Math.floor(hash(k, wi, 12) * (h - 24)); for (let s = 0; s < 7; s++) { R(x, y, 1, 1, OUT); x += hash(k, s, 13) < .5 ? 1 : -1; y += 1; } }
}
const TOWER_C = {};
function towerCanvas(w, dmg) {
  const step = Math.min(10, Math.floor(dmg * 10)), key = w + '_' + step; if (TOWER_C[key]) return TOWER_C[key];
  const c = document.createElement('canvas'); c.width = 40; c.height = 108; const g = c.getContext('2d'); g.translate(0, 16); towerArt(g, WORLD[w], step / 10, w);
  return TOWER_C[key] = c;
}

/* ---------- Vartai: du stulpeliai ir švytintis laukas su kylančiais šviesos taškais; ženklas (×2, +5, -1) - atskirai, virš gleivių ---------- */
function drawGate(x, y, h, good, label, t, flash) {
  const c1 = good ? '#5AE0FF' : '#FF6A6A', c2 = good ? '#E6FBFF' : '#FFE0E0';
  ctx.globalAlpha = .28 + Math.min(.45, flash * 1.8); ctx.fillStyle = c1; ctx.fillRect(x - 3, y, 7, h);
  ctx.globalAlpha = .4 + Math.min(.4, flash * 1.6); ctx.fillRect(x - 1, y, 3, h);
  ctx.globalAlpha = .85; ctx.fillStyle = c2;
  for (let i = 0; i < Math.ceil(h / 8); i++) { const yy = h - 1 - Math.floor((t * 26 + i * 8 + x * .7) % h); ctx.fillRect(x - 2 + (i * 2 + x) % 5, y + yy, 1, 2); }
  ctx.globalAlpha = 1;
  const lit = Math.floor(t * 3 + x) % 2;
  for (const py of [y - 3, y + h - 3]) { ctx.fillStyle = OUT; ctx.fillRect(x - 3, py - 1, 7, 8); ctx.fillStyle = good ? '#2F9AD6' : '#C83A3A'; ctx.fillRect(x - 2, py, 5, 6); ctx.fillStyle = c2; ctx.fillRect(x - 2, py, 5, 1); ctx.fillRect(x - 2, py, 1, 3);
    ctx.fillStyle = lit ? '#FFFFFF' : c1; ctx.fillRect(x, py + 2, 1, 2); }
}
function drawGateSign(x, y, h, good, label, bump, sc) {
  sc = sc || 2; const tw = textW(label, sc), bw = tw + (sc > 1 ? 8 : 6), bh = sc > 1 ? 20 : 13, bx = Math.round(x - bw / 2), by = Math.round(y + h / 2) - (bh >> 1) - (bump > 0 ? (sc > 1 ? 2 : 1) : 0);
  ctx.fillStyle = OUT; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 3);
  ctx.fillStyle = bump > 0 ? (good ? '#2A80B6' : '#A8303C') : (good ? '#1E6A9A' : '#8A2430'); ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(bx, by, bw, sc); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx, by + bh - sc, bw, sc);
  text(label, x, by + (sc > 1 ? 3 : 2), sc, '#FFFFFF', .5);
}
/* druskos luitas: baltai kristalinis, skaičius - kiek gleivių sugers */
function drawSalt(x, y, w, h, hp, hp0, t) {
  const k = hp / hp0; ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, w + 2, h + 3); ctx.fillStyle = '#B8C2D2'; ctx.fillRect(x, y, w, h + 1); ctx.fillStyle = '#E8EEF6'; ctx.fillRect(x, y, w, h - 2);
  for (let i = 0; i < w * h / 14; i++) { const a = Math.floor(hash(i, x, 1) * (w - 2)), b = Math.floor(hash(i, y, 2) * (h - 3)); ctx.fillStyle = hash(i, 3, 3) < .5 ? '#FFFFFF' : '#C8D2E2'; ctx.fillRect(x + a, y + b, 2, 2); }
  const cr = Math.floor((1 - k) * 6); for (let j = 0; j < cr; j++) { let a = x + 2 + Math.floor(hash(j, x, 5) * (w - 4)), b = y + 1; ctx.fillStyle = '#7A869A'; for (let s = 0; s < h - 3; s++) { ctx.fillRect(a, b + s, 1, 1); a += hash(j, s, 6) < .5 ? 1 : -1; a = clamp(a, x + 1, x + w - 2); } }
  text(hp, x + w / 2, y + h / 2 - 4, 1, '#3A4458', .5, '#FFFFFF');
}
/* burbulas su gleivėmis viduje: +N */
function drawBubble(x, y, n, t, col) {
  const r = 8 + Math.round(Math.sin(t * 3) * .6);
  for (let a = -r - 1; a <= r + 1; a++) for (let b = -r - 1; b <= r + 1; b++) { const d = Math.hypot(a, b); if (d > r + .5 && d <= r + 1.5) { ctx.fillStyle = OUT; ctx.fillRect(x + a, y + b, 1, 1); } else if (d > r - .5 && d <= r + .5) { ctx.fillStyle = '#E6F6FF'; ctx.fillRect(x + a, y + b, 1, 1); } }
  ctx.globalAlpha = .28; ctx.fillStyle = '#9BDFFF'; for (let b = -r + 1; b < r; b++) { const hw = Math.floor(Math.sqrt(r * r - b * b)) - 1; ctx.fillRect(x - hw, y + b, hw * 2 + 1, 1); } ctx.globalAlpha = 1;
  drawBlob(x, y + 4, 1, Math.floor(t * 3) % 2, col, 0); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 5, y - 5, 2, 1); ctx.fillRect(x - 5, y - 4, 1, 1);
  text('+' + n, x, y - r - 11, 1, '#FFFFFF', .5);
}
/* želė trampliukas (nukreipia aukštyn/žemyn), garų srovė (stumia), ledas (greitina), portalas */
function drawJelly(x, y, w, h, dir, t) {   // želė kubas: drebanti viršaus linija, blizgesys, rodyklės kryptimi
  const wob = k => Math.round(Math.sin(t * 7 + k * .5) * 1.2);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 1, y + h + 1, w, 3);
  for (let xx = 0; xx < w; xx++) { const top = y + 2 + wob(xx) * (xx > 1 && xx < w - 2 ? 1 : 0);
    ctx.fillStyle = OUT; ctx.fillRect(x + xx, top - 1, 1, y + h + 1 - top + 1);
    if (xx === 0 || xx === w - 1) continue;
    ctx.fillStyle = '#E04A8A'; ctx.fillRect(x + xx, top, 1, y + h - top); ctx.fillStyle = '#FF7AB8'; ctx.fillRect(x + xx, top, 1, y + h - top - 3); ctx.fillStyle = '#FFC2DE'; ctx.fillRect(x + xx, top, 1, 1); }
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x + 3, y + 5, 2, 5); ctx.fillRect(x + 3, y + 12, 2, 2);
  const o = Math.floor(t * 5) % 3, cx = x + Math.round(w / 2);   // rodyklės kyla kryptimi
  for (let i = 0; i < 2; i++) { const cy = y + Math.round(h / 2) + dir * (i * 5 - 3 - o); ctx.fillStyle = i === 0 ? '#FFFFFF' : '#FFC2DE';
    for (let k = 0; k < 5; k++) { ctx.fillRect(cx - k - 1, cy - dir * k + dir * 4, 2, 1); ctx.fillRect(cx + k - 1, cy - dir * k + dir * 4, 2, 1); } }
}
function drawPush(x, y, w, h, vx, vy, t, W) {   // garų anga (grotelės) ir kamuoliukais kylantys garai
  const up = vy < 0, gy = up ? y + h - 6 : y, hot = W.key === 'volcano';
  ctx.fillStyle = OUT; ctx.fillRect(x + 4, gy, w - 8, 6); ctx.fillStyle = hot ? '#3A2A2A' : '#4A5A6A'; ctx.fillRect(x + 5, gy + 1, w - 10, 4);
  for (let xx = x + 7; xx < x + w - 7; xx += 4) { ctx.fillStyle = hot ? '#FF7A2A' : '#9ADFFF'; ctx.fillRect(xx, gy + 2, 2, 2); }
  const n = Math.max(6, Math.round(w * h / 160));
  for (let i = 0; i < n; i++) { const life = (t * .9 + hash(i, x, 3)) % 1, px = x + 6 + hash(i, y, 4) * (w - 12) + Math.sin(t * 3 + i) * 2, py = up ? gy - life * (h - 6) : gy + 6 + life * (h - 6);
    const r = 2 + Math.round(life * 3), a = life < .15 ? life / .15 : 1 - (life - .15) / .85; if (a <= .05) continue;
    ctx.globalAlpha = a * .9; const X = Math.round(px), Y = Math.round(py);
    ctx.fillStyle = hot ? '#A8908A' : '#9AB6CC'; ctx.fillRect(X - r, Y - r + 2, r * 2 + 1, r * 2 - 1); ctx.fillRect(X - r + 1, Y - r + 1, r * 2 - 1, r * 2 + 1);
    ctx.fillStyle = hot ? '#D8C8C2' : '#DCEAF4'; ctx.fillRect(X - r, Y - r + 1, r * 2 + 1, r * 2 - 1); ctx.fillRect(X - r + 1, Y - r, r * 2 - 1, r * 2 + 1);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(X - r + 1, Y - r + 1, r, r - 1); }
  ctx.globalAlpha = 1;
}
function drawIce(x, y, w, h, t) {   // ledo lopas: nelygūs kraštai, įtrūkimai, bėgantis blizgesys
  const edge = (i, k) => Math.round(hash(i, k, 21) * 2);
  for (let xx = 0; xx < w; xx++) { const a = edge(x + xx >> 2, 1), b = edge(x + xx >> 2, 2); ctx.fillStyle = '#5E9ACA'; ctx.fillRect(x + xx, y + a - 1, 1, h - a - b + 2); if (xx === 0 || xx === w - 1) continue; ctx.fillStyle = '#A8DCF6'; ctx.fillRect(x + xx, y + a, 1, h - a - b); ctx.fillStyle = '#D6F2FF'; ctx.fillRect(x + xx, y + a, 1, 1); }
  for (let i = 0; i < w * h / 70; i++) { ctx.fillStyle = '#E6F8FF'; ctx.fillRect(x + 2 + Math.floor(hash(i, x, 1) * (w - 10)), y + 3 + Math.floor(hash(i, y, 2) * (h - 6)), 5, 1); }
  for (let k = 0; k < 3; k++) { let cx = x + 6 + Math.floor(hash(k, x, 5) * (w - 12)); const cy = y + 3; ctx.fillStyle = '#7AB6DA'; for (let s = 0; s < h - 6; s++) { ctx.fillRect(cx, cy + s, 1, 1); cx += hash(k, s, 6) < .5 ? 1 : -1; } }
  const s = Math.floor(t * 50) % (w + h * 2); ctx.fillStyle = '#FFFFFF'; for (let i = 3; i < h - 3; i++) { const xx = s - i; if (xx >= 2 && xx < w - 3) ctx.fillRect(x + xx, y + i, 2, 1); }
}
function drawPortal(x, y, t, col) {
  for (let i = 0; i < 3; i++) { const r = 9 - i * 3; for (let a = 0; a < 20; a++) { const q = a / 20 * TAU + t * (2 + i) * (i % 2 ? -1 : 1); ctx.fillStyle = i === 0 ? OUT : i === 1 ? col : '#FFFFFF'; ctx.fillRect(Math.round(x + Math.cos(q) * r), Math.round(y + Math.sin(q) * r * .8), 2, 2); } }
}

/* ---------- Bosas: didelis apvalus akmenų milžinas (šešėliavimas iš viršaus kairės, 3 tonai + kontūras), pasaulio puošmena ---------- */
const BOSS_C = {};
function bossBody(w) {
  if (BOSS_C[w]) return BOSS_C[w]; const W = WORLD[w], c = document.createElement('canvas'); c.width = 36; c.height = 32; const g = c.getContext('2d');
  const P = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); }, cx = 17.5, cy = 17, rx = 16, ry = 14;
  const ins = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 36; x++) { if (!ins(x, y)) continue;
    if (!ins(x - 1, y) || !ins(x + 1, y) || !ins(x, y - 1) || !ins(x, y + 1)) { P(x, y, OUT); continue; }
    const nx = (x - cx) / rx, ny = (y - cy) / ry, l = -nx * .55 - ny * .75 + (hash(x >> 2, y >> 2, w) - .5) * .35;
    P(x, y, l > .35 ? W.rockH : l > -.35 ? W.rock : W.rockS); }
  for (let k = 0; k < 6; k++) { let x = 6 + Math.floor(hash(k, w, 31) * 24), y = 6 + Math.floor(hash(k, w, 32) * 16); for (let s = 0; s < 4; s++) { if (ins(x, y)) P(x, y, W.rockS); x += hash(k, s, 33) < .5 ? 1 : 0; y++; } }
  if (W.key === 'meadow') for (let x = 9; x < 27; x++) { const t = 3 + Math.round(Math.sin(x * .9) * 1.2); for (let y = t; y < t + 3; y++) if (ins(x, y + 1)) P(x, y, y === t ? '#9BE36A' : '#4FA84A'); }
  if (W.key === 'snow') for (let x = 6; x < 30; x++) for (let y = 2; y < 7; y++) if (ins(x, y + 1) && y < 4 + Math.round(Math.sin(x) * 1.5)) P(x, y, '#FFFFFF');
  if (W.key === 'candy') for (let k = 0; k < 14; k++) { const x = 7 + Math.floor(hash(k, 1, 41) * 22), y = 4 + Math.floor(hash(k, 2, 41) * 8); if (ins(x, y) && ins(x + 1, y)) { g.fillStyle = ['#FF8AC0', '#7AE0FF', '#FFE04A', '#FFFFFF'][k % 4]; g.fillRect(x, y, 2, 1); } }
  if (W.key === 'volcano') for (let k = 0; k < 4; k++) { let x = 8 + k * 6, y = 5 + (k % 2) * 3; for (let s = 0; s < 6; s++) { if (ins(x, y)) P(x, y, s % 2 ? '#FFB43A' : '#FF6A2A'); y++; x += (s + k) % 3 === 0 ? 1 : 0; } }
  if (W.key === 'desert') { g.fillStyle = OUT; g.fillRect(8, 2, 20, 4); g.fillStyle = '#E0443A'; g.fillRect(9, 3, 18, 2); g.fillStyle = '#FF7A6A'; g.fillRect(9, 3, 18, 1); }
  if (W.key === 'space') for (let k = 0; k < 3; k++) { const x = 9 + k * 8, y = 6 + (k % 2) * 4; P(x, y, OUT); P(x + 1, y, W.rockS); P(x, y + 1, W.rockS); }
  return BOSS_C[w] = c;
}
function drawBossArt(x, y, w, t, hit, mood) {
  const W = WORLD[w], c = bossBody(w), st = Math.floor(t * 3) % 2, R = (a, b, ww, hh, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, ww, hh); };
  R(-17, -2, 34, 4, 'rgba(0,0,0,.25)');
  R(-12, -5 + st, 9, 6 - st, OUT); R(-11, -5 + st, 7, 4 - st, W.rockS); R(3, -4 - st, 9, 5 + st, OUT); R(4, -4 - st, 7, 3 + st, W.rockS);
  const arm = (ax, ph) => { const ay = -20 + Math.round(Math.sin(t * 4 + ph) * 2); R(ax - 1, ay - 1, 8, 12, OUT); R(ax, ay, 6, 10, W.rock); R(ax, ay, 6, 2, W.rockH); R(ax, ay + 8, 6, 2, W.rockS); };
  arm(-23, 0); arm(17, 3);
  ctx.drawImage(c, Math.round(x - 18), Math.round(y - 33));
  const fy = y - 20; R(-9, fy - 3, 7, 2, OUT); R(3, fy - 3, 7, 2, OUT); R(-8, fy - 4, 3, 1, OUT); R(6, fy - 4, 3, 1, OUT);
  R(-8, fy, 5, 4, OUT); R(4, fy, 5, 4, OUT); R(-7, fy + 1, 3, 2, '#FFE36B'); R(5, fy + 1, 3, 2, '#FFE36B'); R(-7, fy + 1, 1, 1, '#FFFFFF'); R(5, fy + 1, 1, 1, '#FFFFFF');
  const open = mood === 'roar'; R(-6, fy + 8, 13, open ? 6 : 4, OUT); R(-5, fy + 9, 11, open ? 4 : 2, '#5A1020'); for (let i = 0; i < 4; i++) R(-5 + i * 3, fy + 9, 2, 1, '#E8E0D0');
  if (hit > 0) { ctx.globalAlpha = .35; ctx.fillStyle = '#FFFFFF'; for (let yy = 0; yy < 28; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((yy - 14) / 14) ** 2)) * 15); ctx.fillRect(x - hw, y - 31 + yy, hw * 2, 1); } ctx.globalAlpha = 1; }
}

/* ---------- Aplinkos gyvumas: drugeliai, vėjo brūkšniai, snaigės, pabarstukai, žarijos, mirksinčios žvaigždės ---------- */
const AMB_BF = ['#FF9AB8', '#FFE36B', '#FFFFFF', '#B8A6FF', '#FFB46A'];
function drawAmbient(w, t) {
  const key = WORLD[w].key, H = (i, k) => hash(i, w, 50 + k);
  if (key === 'meadow') for (let i = 0; i < 5; i++) {
    const x = Math.round((H(i, 1) * 540 + t * (7 + H(i, 3) * 9)) % 540) - 30, y = Math.round(44 + H(i, 2) * 200 + Math.sin(t * 1.4 + i * 2) * 9), f = Math.floor(t * 9 + i) % 2;
    ctx.fillStyle = AMB_BF[i]; if (f) { ctx.fillRect(x - 3, y - 2, 3, 2); ctx.fillRect(x + 1, y - 2, 3, 2); ctx.fillRect(x - 2, y, 2, 1); ctx.fillRect(x + 1, y, 2, 1); } else { ctx.fillRect(x - 1, y - 3, 1, 3); ctx.fillRect(x + 1, y - 3, 1, 3); }
    ctx.fillStyle = OUT; ctx.fillRect(x, y - 2, 1, 3); }
  else if (key === 'desert') for (let i = 0; i < 9; i++) {
    const x = Math.round((H(i, 1) * 600 + t * (110 + H(i, 3) * 70)) % 600) - 60, y = Math.round(36 + H(i, 2) * 224), len = 6 + Math.round(H(i, 3) * 10);
    ctx.fillStyle = 'rgba(255,244,214,.55)'; ctx.fillRect(x, y, len, 1); ctx.fillStyle = 'rgba(255,244,214,.3)'; ctx.fillRect(x + len, y, 4, 1); }
  else if (key === 'snow' || key === 'candy') for (let i = 0; i < 34; i++) {
    const x = Math.round((H(i, 1) * 500 + Math.sin(t * .9 + i) * 10 + t * 5) % 500) - 10, y = Math.round((H(i, 2) * 290 + t * (12 + H(i, 3) * 14)) % 290) - 6;
    if (key === 'snow') { ctx.fillStyle = H(i, 4) < .3 ? '#C6DAEC' : '#FFFFFF'; const s = H(i, 3) > .7 ? 2 : 1; ctx.fillRect(x, y, s, s); }
    else { ctx.fillStyle = CANDY_SP[i % 4]; if (Math.floor(t * 4 + i) % 2) ctx.fillRect(x, y, 2, 1); else ctx.fillRect(x, y, 1, 2); } }
  else if (key === 'volcano') for (let i = 0; i < 22; i++) {
    const x = Math.round(H(i, 1) * 480 + Math.sin(t * 2 + i) * 5), y = Math.round(272 - (H(i, 2) * 300 + t * (18 + H(i, 3) * 26)) % 300), fl = Math.floor(t * 8 + i) % 3;
    ctx.fillStyle = fl === 0 ? '#FFE36B' : fl === 1 ? '#FFB43A' : '#FF6A2A'; ctx.fillRect(x, y, 1, 1); if (H(i, 4) > .75) ctx.fillRect(x, y + 1, 1, 1); }
  else if (key === 'space') {
    for (let i = 0; i < 18; i++) { const x = Math.round(H(i, 1) * 470 + 5), y = Math.round(34 + H(i, 2) * 228), b = Math.sin(t * 2.2 + i * 2.7);
      if (b > .75) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } else if (b > 0) { ctx.fillStyle = '#B8B8E8'; ctx.fillRect(x, y, 1, 1); } }
    const p = (t % 7) / 1.1; if (p < 1) { const x = Math.round(80 + p * 300), y = Math.round(40 + p * 60); for (let j = 0; j < 10; j++) { ctx.globalAlpha = 1 - j / 10; ctx.fillStyle = j < 2 ? '#FFFFFF' : '#BDF6FF'; ctx.fillRect(x - j * 3, y - j, 3, 1); } ctx.globalAlpha = 1; }
  }
}
const CANDY_SP = ['#FF8AC0', '#7AE0FF', '#FFE04A', '#FFFFFF'];
/* baltas sprite'o siluetas (smūgio blyksniui) */
const WHITE_C = new Map();
function whiteOf(c) { let w = WHITE_C.get(c); if (w) return w; w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const g = w.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w.width, w.height); WHITE_C.set(c, w); return w; }
