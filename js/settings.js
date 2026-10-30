/* settings: nustatymų langas kaip populiariuose Poki žaidimuose - garsų jungiklis, kalbų tinklelis su pikselinėmis vėliavėlėmis;
   piktogramos (krumpliaratis, garsiakalbis) kampuose */
'use strict';
let SET_FROM = 'title';
function openSettings(from) { SET_FROM = from || state; state = 'settings'; }
function closeSettings() { state = SET_FROM === 'pause' ? 'pause' : SET_FROM; }
function drawSettingsBehind(dt) {
  if (SET_FROM === 'pause') { drawPlay(0); drawHud(); }
  else if (SET_FROM === 'map') drawMapScreen(0);
  else drawTitle(dt);
  BTN_NEXT = [];   // už lango esantys mygtukai neveikia
  ctx.fillStyle = 'rgba(7,6,11,.74)'; ctx.fillRect(0, 0, GW, GH);
}
/* jungiklis: pikselinis „slankiklis" */
function toggle(x, y, on, fn) {
  const hv = hover && hover.x === x && hover.y === y;
  ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, 34, 18); ctx.fillStyle = on ? '#4FA83A' : '#4A4458'; ctx.fillRect(x, y, 32, 16);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + 12, 32, 4);
  const kx = on ? x + 17 : x + 1; ctx.fillStyle = OUT; ctx.fillRect(kx - 1, y - 1, 16, 18); ctx.fillStyle = hv ? '#FFFFFF' : '#E8E4F4'; ctx.fillRect(kx, y, 14, 16); ctx.fillStyle = '#B8B2CC'; ctx.fillRect(kx, y + 13, 14, 3);
  button(x, y, 32, 16, fn);
}
/* vėliavėlės 12×8 */
const FLAG = {
  en: g => { g('#1E3A8A', 0, 0, 12, 8); g('#FFFFFF', 5, 0, 2, 8); g('#FFFFFF', 0, 3, 12, 2); g('#D22F27', 5, 0, 2, 8, 1); g('#D22F27', 0, 3, 12, 2, 1); g('#FFFFFF', 0, 0, 2, 1); g('#FFFFFF', 10, 7, 2, 1); },
  lt: g => { g('#FDB913', 0, 0, 12, 3); g('#006A44', 0, 3, 12, 2); g('#C1272D', 0, 5, 12, 3); },
  ru: g => { g('#FFFFFF', 0, 0, 12, 3); g('#0039A6', 0, 3, 12, 2); g('#D52B1E', 0, 5, 12, 3); },
  es: g => { g('#C60B1E', 0, 0, 12, 2); g('#FFC400', 0, 2, 12, 4); g('#C60B1E', 0, 6, 12, 2); },
  pt: g => { g('#046A38', 0, 0, 5, 8); g('#DA291C', 5, 0, 7, 8); g('#FFE900', 4, 3, 2, 2); },
  fr: g => { g('#0055A4', 0, 0, 4, 8); g('#FFFFFF', 4, 0, 4, 8); g('#EF4135', 8, 0, 4, 8); },
  de: g => { g('#111111', 0, 0, 12, 3); g('#DD0000', 0, 3, 12, 2); g('#FFCE00', 0, 5, 12, 3); },
  it: g => { g('#009246', 0, 0, 4, 8); g('#FFFFFF', 4, 0, 4, 8); g('#CE2B37', 8, 0, 4, 8); },
  pl: g => { g('#FFFFFF', 0, 0, 12, 4); g('#DC143C', 0, 4, 12, 4); },
  tr: g => { g('#E30A17', 0, 0, 12, 8); g('#FFFFFF', 3, 2, 3, 4); g('#E30A17', 4, 2, 2, 4); g('#FFFFFF', 7, 3, 1, 2); },
};
function drawFlag(l, x, y) {
  ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, 14, 10);
  FLAG[l]((c, a, b, w, h, thin) => { ctx.fillStyle = c; if (thin) { if (w > h) ctx.fillRect(x + a, y + b + .5 | 0, w, 1); else ctx.fillRect(x + a + .5 | 0, y + b, 1, h); } else ctx.fillRect(x + a, y + b, w, h); });
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, 12, 1);
}
function drawSettings(dt) {
  panel(84, 18, 312, 236, COL.panel, COL.edge); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(85, 19, 310, 2);
  iconGear(96, 26, true); text(T('settings'), 240, 28, 2, COL.txt, .5);
  /* garsai */
  iconSpeaker(104, 60, save.sfx !== false); text(T('sounds'), 124, 63, 1, COL.txt, 0); toggle(214, 58, save.sfx !== false, () => { save.sfx = save.sfx === false; persist(); setVol(); });
  /* kalbos: 2 stulpeliai × 5 */
  text(T('language'), 104, 92, 1, COL.dim, 0);
  LANG_ORDER.forEach((l, i) => { const x = 100 + (i % 2) * 142, y = 104 + Math.floor(i / 2) * 24, on = l === LANG, hv = hover && hover.x === x && hover.y === y;
    panel(x, y, 136, 18, on ? '#3E3468' : hv ? '#342C56' : COL.panel2, on ? COL.acc : COL.edge);
    drawFlag(l, x + 5, y + 5); text(LANGS[l].lang, x + 24, y + 5, 1, on ? COL.acc : COL.txt, 0);
    button(x, y, 136, 18, () => langSet(l)); });
  btn(190, 238 - 4, 100, 18, T('back'), COL.btn, closeSettings, 1);
}
/* ---------- Piktogramos (pikselių žemėlapiai) ---------- */
const IC = {
  gear: ['....kk....', '.k.kwwk.k.', 'kwkwwwwkwk', '.kwwkkwwk.', 'kwwk..kwwk', 'kwwk..kwwk', '.kwwkkwwk.', 'kwkwwwwkwk', '.k.kwwk.k.', '....kk....'],
  spk: ['....k.....', '...kk.....', 'kkkwk.....', 'kwwwk.....', 'kwwwk.....', 'kkkwk.....', '...kk.....', '....k.....'],
};
function iconGear(x, y, big) { drawMap(IC.gear, x, y, { k: OUT, w: '#C9C2D8' }); }
function iconSpeaker(x, y, on) {
  drawMap(IC.spk, x, y, { k: OUT, w: '#E8E4F4' }); ctx.fillStyle = on ? '#E8E4F4' : '#E0443A';
  if (on) { ctx.fillRect(x + 6, y + 2, 1, 4); ctx.fillRect(x + 8, y + 1, 1, 6); } else { for (let i = 0; i < 4; i++) { ctx.fillRect(x + 6 + i, y + 2 + i, 1, 1); ctx.fillRect(x + 9 - i, y + 2 + i, 1, 1); } }
}
/* kampų piktogramų mygtukai (titulinis, žemėlapis) */
function iconBtn(x, y, kind, fn) {
  const hv = hover && hover.x === x && hover.y === y; panel(x, y + (hv ? -1 : 0), 22, 20, hv ? '#3E3468' : COL.panel2);
  if (kind === 'gear') iconGear(x + 6, y + 5 + (hv ? -1 : 0)); else if (kind === 'snd') iconSpeaker(x + 6, y + 6 + (hv ? -1 : 0), save.sfx !== false);
  button(x, y, 22, 20, fn);
}
function quickMute() { save.sfx = save.sfx === false; persist(); setVol(); }
