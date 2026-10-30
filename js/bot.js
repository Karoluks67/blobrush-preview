/* Botas: žaidžia lygį per tą pačią simuliaciją (js/game.js). Naudojamas lygių patikrai (tools/check.js) ir titulinio ekrano scenai.
   smart - kas 0,2 s įvertina kiekvieną taikymo aukštį (vartų sandauga, sienos, druska, burbulai, portalai) ir gina mamą nuo artimų akmenukų;
   casual - taiko lėtai banguojant (kaip neatidus žaidėjas). */
'use strict';
function aimValue(y) {
  let v = 1, x = PX + 12, t = L.t;
  const cols = [];
  for (const g of L.gates) cols.push({ x: g.x, g }); for (const w of L.walls) cols.push({ x: w.x - 2, w }); for (const s of L.salts) if (s.hp > 0) cols.push({ x: s.x, s });
  for (const u of L.bubbles) if (!u.done) cols.push({ x: u.x - 8, u }); for (const p of L.portals) cols.push({ x: p.x, p });
  cols.sort((a, b) => a.x - b.x);
  for (const c of cols) { if (c.x < x - .5) continue; const tt = t + (c.x - PX) / SPEED;
    if (c.g) { const gy = c.g.move ? c.g.y0 + Math.sin(tt * c.g.move[1] + (c.g.move[2] || 0)) * c.g.move[0] : c.g.y0;
      if (y >= gy + 2 && y <= gy + c.g.h - 2) { const t0 = c.g.v[0], n = +c.g.v.slice(1); if (t0 === 'x') v *= n; else if (t0 === '+') v += n * .35; else v *= .15; } }
    else if (c.w && y > c.w.y - 2 && y < c.w.y + c.w.h + 3) { y = (y - c.w.y) < (c.w.y + c.w.h - y) ? c.w.y - 3 : c.w.y + c.w.h + 4; }
    else if (c.s && y > c.s.y - 1 && y < c.s.y + c.s.h + 1) v *= Math.max(.05, 1 - c.s.hp / 40);
    else if (c.u && Math.abs(y - 2 - c.u.y) < 9) v += c.u.n * .5;
    else if (c.p && Math.abs(y - c.p.y) < 6) { y = c.p.y2; x = c.p.x2; }
  }
  return v;
}
let BOT = { y: MIDY, t: 0, ph: 0 };
function botInput(kind) {
  const B = BOT; B.t -= DT;
  if (kind === 'casual') { B.ph += DT; return { y: MIDY + Math.sin(B.ph * .45) * 90, fire: true, big: L.meter >= L.need }; }
  if (B.t <= 0) { B.t = .2;
    let best = MIDY, bv = -1; for (let y = FY0 + 24; y <= FY1 - 4; y += 4) { const v = aimValue(y) - Math.abs(y - L.mama.y) * .0008; if (v > bv) { bv = v; best = y; } }
    /* gynyba: artimiausias akmenukas */
    let thr = null; for (const r of L.rocks) if (r.x < 150 + (r.sz === 'L' ? 60 : 0) && (!thr || r.x < thr.x)) thr = r;
    if (L.boss && L.boss.hp > 0 && L.boss.x < 170) thr = { y: L.boss.y - 10 };
    B.y = thr ? thr.y : best; }
  return { y: B.y, fire: true, big: L.meter >= L.need };
}
function botPlay(i, kind, up, maxT) {
  startLevel(i, { up }); BOT = { y: MIDY, t: 0, ph: 0 }; maxT = maxT || 240;
  while (!L.win && !L.lose && L.t < maxT) step(DT, botInput(kind));
  return { lv: i + 1, kind, win: !!L.win, t: Math.round(L.t), hearts: L.hearts, tower: Math.round(100 * L.tower.hp / L.tower.hp0), maxB: L.stats.maxB, boss: L.boss ? L.boss.hp : null };
}
