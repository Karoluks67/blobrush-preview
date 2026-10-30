/* levels: 60 lygių (6 pasauliai × 10). Pirmi trys - rankomis (mokymas), kiti sudėliojami iš stulpelių raštų su pastoviu atsitiktinumu.
   Kiekvienas pasaulis atneša savo kliūtį: 1 sienos ir burbulai, 2 druska ir judantys vartai, 3 ledas, 4 želė trampliukai,
   5 garų srovės, 6 portalai. Kiekvieno pasaulio 10-as lygis - bosas. Kiekvienam lygiui botas parenka geriausią iš kelių išdėstymų (seed) ir nustato tvirtovės gyvybes: node tools/check.js calib. */
'use strict';
const MIDY = 147;
function genLevel(i, seed) {
  const w = Math.floor(i / 10), k = i % 10, boss = k === 9; let s = 1; seed = seed || 0;
  const R = () => hash(s++, i * 31 + seed, 77), RI = (a, b) => a + Math.floor(R() * (b - a + 1)), P = a => a[Math.floor(R() * a.length)];
  const D = { w, gates: [], walls: [], salt: [], bubbles: [], jelly: [], push: [], ice: [], portal: [] };
  const lvl = i + 1, tier = Math.min(1, i / 55);
  /* vertės: kuo toliau, tuo daugiau ×3 ir raudonų vartų */
  const good = () => R() < .25 + tier * .3 ? 'x3' : R() < .3 ? '+' + RI(4, 8 + w * 2) : 'x2';
  const bad = () => R() < .5 ? '-1' : '-' + RI(2, 3);
  const nCols = boss ? 2 : 2 + (k >= 3 ? 1 : 0) + (k >= 6 && w >= 1 ? 1 : 0);
  const x0 = 92, x1 = boss ? 250 : 300, xs = []; for (let c = 0; c < nCols; c++) xs.push(Math.round(x0 + (x1 - x0) * (nCols === 1 ? .5 : c / (nCols - 1))));
  const feat = ['wallgap', 'bubbles', 'salt', 'ice', 'jelly', 'push', 'portal'];
  const used = {};
  xs.forEach((x, c) => {
    /* pasaulio kliūtis atsiranda bent viename stulpelyje (nuo 2-o pasaulio lygio), kiti - vartų raštai */
    let pat; const featC = w >= 1 && c === 1 % nCols && !boss;
    if (featC) pat = feat[w + 1]; else pat = P(w === 0 ? ['pair', 'pair', 'triple', 'wallgap', 'bubbles', 'mover'] : ['pair', 'triple', 'wallgap', 'mover', 'mover', 'bubbles', w >= 1 ? 'salt' : 'pair']);
    if ((pat === used.last && pat !== 'pair') || (pat === 'salt' && used.salt)) pat = 'pair'; used.last = pat; if (pat === 'salt') used.salt = 1;
    if (pat === 'pair') { const a = R() < .5; const h = RI(62, 80); D.gates.push({ x, y: MIDY - h - 4, h, v: a ? good() : (R() < .5 + tier * .4 ? bad() : 'x2') }, { x, y: MIDY + 4, h, v: a ? (R() < .5 + tier * .4 ? bad() : '+' + RI(3, 6)) : good() }); }
    else if (pat === 'triple') { const h = 56, ys = [FY0 + 14, MIDY - h / 2, FY1 - 14 - h], vs = [good(), R() < .6 ? bad() : good(), 'x2']; for (let j = vs.length - 1; j > 0; j--) { const q = Math.floor(R() * (j + 1)); [vs[j], vs[q]] = [vs[q], vs[j]]; } ys.forEach((y, j) => D.gates.push({ x, y: Math.round(y), h, v: vs[j] })); }
    else if (pat === 'wallgap') { const gh = RI(44, 60), gy = RI(FY0 + 30, FY1 - 30 - gh); D.walls.push({ x: x - 5, y: FY0 - 4, w: 10, h: gy - FY0 + 2 }, { x: x - 5, y: gy + gh + 4, w: 10, h: FY1 - gy - gh }); D.gates.push({ x: x + 14, y: gy, h: gh + 2, v: R() < .5 ? 'x3' : 'x2' }); }
    else if (pat === 'mover') { const h = RI(50, 66); D.gates.push({ x, y: MIDY - h / 2, h, v: R() < .4 ? 'x3' : 'x2', move: [RI(50, 76), .7 + R() * .6 + tier * .5, R() * 6] }); if (R() < .5 + tier * .3) D.gates.push({ x: x + 22, y: MIDY - 20, h: 40, v: bad(), move: [70, .9 + tier * .6, R() * 6 + 3] }); }
    else if (pat === 'bubbles') { const n = RI(2, 3); for (let j = 0; j < n; j++) D.bubbles.push({ x: x + RI(-10, 10), y: Math.round(FY0 + 30 + (FY1 - FY0 - 60) * (j + .5) / n) + RI(-8, 8), n: RI(5, 8 + w * 3) }); }
    else if (pat === 'salt') { const gy = RI(FY0 + 26, FY1 - 80), gh = 50, hp = RI(10, 18) + w * 6 + k;
      D.salt.push({ x: x - 7, y: FY0 + 2, w: 14, h: gy - FY0 - 4, hp }, { x: x - 7, y: gy + gh + 2, w: 14, h: FY1 - gy - gh - 2, hp: hp + RI(-3, 6) });
      D.gates.push({ x: x + 16, y: gy, h: gh, v: good() }); }
    else if (pat === 'ice') { const y = RI(FY0 + 30, FY1 - 60); D.ice.push({ x: x - 50, y, w: 110, h: 28 }); D.gates.push({ x: x + 30, y: y - 6, h: 40, v: 'x2' }); D.gates.push({ x: x - 10, y: y > MIDY ? FY0 + 20 : FY1 - 80, h: 60, v: good() }); }
    else if (pat === 'jelly') { const up = R() < .5, y = up ? MIDY + 20 : MIDY - 50; D.jelly.push({ x: x - 26, y, w: 34, h: 30, dir: up ? -1 : 1 });
      D.gates.push({ x: x + 34, y: up ? FY0 + 20 : FY1 - 76, h: 56, v: P(['x3', 'x3', 'x2']) }); D.gates.push({ x: x + 34, y: up ? MIDY + 10 : MIDY - 66, h: 56, v: bad() }); }
    else if (pat === 'push') { const y = RI(FY0 + 20, FY1 - 100); D.push.push({ x: x - 22, y, w: 44, h: 80, vx: 0, vy: R() < .5 ? -60 : 60 }); D.gates.push({ x: x + 34, y: FY0 + 14, h: 70, v: good() }, { x: x + 34, y: FY1 - 84, h: 70, v: good() }); D.gates.push({ x: x + 34, y: MIDY - 26, h: 52, v: bad() }); }
    else if (pat === 'portal') { const yA = R() < .5 ? FY0 + 34 : FY1 - 30; D.portal.push({ x: x - 20, y: yA, x2: x + 70, y2: MIDY + RI(-30, 30) }); D.gates.push({ x: x + 90, y: MIDY - 40, h: 80, v: 'x3' }); D.gates.push({ x, y: yA > MIDY ? FY0 + 14 : FY1 - 84, h: 70, v: good() }); }
  });
  /* gynėjai: kas kiek sekundžių ir kokie būriai */
  D.every = +(Math.max(3.4, 7.2 - i * .055 - w * .1)).toFixed(2); D.first = boss ? 3 : 5; D.rage = .6 + tier * .5;
  const S = 2 + Math.floor(i / 7), M = Math.floor((i - 4) / 9), Lg = Math.floor((i - 20) / 14);
  D.waves = [[['S', S]], [['S', Math.max(1, S - 1)], ['M', Math.max(0, M)]], [['S', S + 1]], [['M', Math.max(0, M) + (i > 30 ? 1 : 0)], ['L', Math.max(0, Lg)], ['S', 1]]];
  D.hp = Math.round((110 + i * 30) * (1 + w * .2) / 10) * 10;
  if (boss) D.boss = { hp: 120 + w * 110, sp: 4 + w * .4, th: 4.5 - w * .25, n: 2 + Math.floor(w / 2) };
  return D;
}
/* mokymo lygiai: vieni vartai, paskui pasirinkimas, paskui siena */
const LV_HAND = [
  { w: 0, hp: 60, every: 9, first: 7, rage: .2, waves: [[['S', 2]]], gates: [{ x: 170, y: MIDY - 70, h: 140, v: 'x2' }], tut: 1 },
  { w: 0, hp: 110, every: 8, first: 6, rage: .3, waves: [[['S', 2]], [['S', 3]]], gates: [{ x: 140, y: FY0 + 16, h: 90, v: 'x2' }, { x: 140, y: MIDY + 8, h: 90, v: '-1' }, { x: 260, y: MIDY - 50, h: 100, v: 'x2' }], tut: 2 },
  { w: 0, hp: 170, every: 7.5, first: 5, rage: .4, waves: [[['S', 3]], [['S', 2], ['M', 1]]], walls: [{ x: 150, y: FY0 - 4, w: 10, h: 70 }, { x: 150, y: FY1 - 70, w: 10, h: 74 }],
    gates: [{ x: 168, y: FY0 + 72, h: 92, v: 'x3' }, { x: 280, y: FY0 + 20, h: 80, v: 'x2' }, { x: 280, y: FY1 - 100, h: 80, v: 'x2' }], bubbles: [{ x: 90, y: FY0 + 40, n: 6 }], tut: 3 },
];
/* boto kalibracija (node tools/check.js calib): tvirtovės gyvybės pagal lygio „pralaidumą" ir gynėjų tempas, kad protingas botas
   be patobulinimų laimėtų per ~22-66 s neprarasdamas širdžių. Generuojama automatiškai - nekeisti ranka. */
/*TUNE*/const TUNE = {3:{seed:7,hp:940},
  4:{seed:5,hp:670},
  5:{seed:4,hp:1010},
  6:{seed:7,hp:2560},
  7:{seed:1,hp:2130},
  8:{seed:7,hp:1590},
  9:{seed:0,hp:290},
  10:{seed:0,hp:1750},
  11:{seed:5,hp:1350},
  12:{seed:2,hp:510},
  13:{seed:0,hp:2020},
  14:{seed:6,hp:2450},
  15:{seed:1,hp:1560},
  16:{seed:4,hp:1040},
  17:{seed:0,hp:1370},
  18:{seed:2,hp:2160},
  19:{seed:2,hp:950},
  20:{seed:0,hp:550},
  21:{seed:4,hp:800},
  22:{seed:7,hp:2350},
  23:{seed:6,hp:970},
  24:{seed:3,hp:1240},
  25:{seed:3,hp:950},
  26:{seed:6,hp:1230},
  27:{seed:3,hp:1380},
  28:{seed:0,hp:2380},
  29:{seed:1,hp:240},
  30:{seed:1,hp:590},
  31:{seed:0,hp:760},
  32:{seed:1,hp:700},
  33:{seed:3,hp:460},
  34:{seed:2,hp:1750},
  35:{seed:0,hp:1300},
  36:{seed:2,hp:740},
  37:{seed:2,hp:430},
  38:{seed:5,hp:1410},
  39:{seed:7,hp:1120},
  40:{seed:0,hp:1020},
  41:{seed:4,hp:1700},
  42:{seed:5,hp:470},
  43:{seed:7,hp:1500},
  44:{seed:0,hp:1710},
  45:{seed:3,hp:2160},
  46:{seed:3,hp:5920},
  47:{seed:5,hp:1120},
  48:{seed:3,hp:1150,every:4.78},
  49:{seed:0,hp:90,every:4.73,boss:{hp:560,sp:5.6,th:4.2,n:4}},
  50:{seed:4,hp:650,every:5.22},
  51:{seed:5,hp:880,every:5.14},
  52:{seed:2,hp:1390,every:4.42},
  53:{seed:5,hp:2950,every:4.36},
  54:{seed:3,hp:1770},
  55:{seed:7,hp:2640},
  56:{seed:7,hp:1830},
  57:{seed:2,hp:2370},
  58:{seed:2,hp:2600,every:4.65},
  59:{seed:3,hp:140}};/*TUNE*/
const LEVELS_ALL = [];
for (let i = 0; i < 60; i++) { const T = TUNE[i] || {}, D = i < LV_HAND.length ? LV_HAND[i] : genLevel(i, T.seed); Object.assign(D, T); D.id = 'L' + (i + 1); LEVELS_ALL.push(D); }
