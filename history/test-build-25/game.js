(() => {
'use strict';
const $ = id => document.getElementById(id);
const LEVEL = /*LEVEL*/null;
const W = 960, H = 540, GRAV = 2000, LW = LEVEL.size.w, LH = LEVEL.size.h, PH = 52, CH = 34, BREATH = 8, TORCH = 60, KNIVES = 5;
const INK = '#151513', INK2 = '#3d3b35', PENCIL = '#8c897f', PAPER = '#fbfaf6', RULE = '#ebe8de', FAINT = '#e2ded3', RED = '#c4252b', HATCH = '#cfcbc0';
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const inR = (x, y, r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

/* ---------- star engine ---------- */
const E = window.Astronomy && window.createStarEngine ? createStarEngine(window.Astronomy) : null;
if (!E) $('libNote').textContent = 'The star library did not load (no internet?). Births will be random instead of real charts.';
const PLACES = [
  ['Colombo', 6.932, 79.858, 'Asia/Colombo'], ['Kandy', 7.291, 80.636, 'Asia/Colombo'], ['Jaffna', 9.668, 80.007, 'Asia/Colombo'], ['Chennai', 13.083, 80.270, 'Asia/Kolkata'],
  ['Varanasi', 25.318, 82.974, 'Asia/Kolkata'], ['Kathmandu', 27.717, 85.324, 'Asia/Kathmandu'], ['Bangkok', 13.756, 100.502, 'Asia/Bangkok'], ['Kyoto', 35.012, 135.768, 'Asia/Tokyo'],
  ['Cairo', 30.044, 31.236, 'Africa/Cairo'], ['Nairobi', -1.286, 36.817, 'Africa/Nairobi'], ['London', 51.507, -0.128, 'Europe/London'], ['Toronto', 43.653, -79.383, 'America/Toronto'],
  ['Mexico City', 19.433, -99.133, 'America/Mexico_City'], ['Lima', -12.046, -77.043, 'America/Lima'], ['Sydney', -33.869, 151.209, 'Australia/Sydney'], ['Reykjavik', 64.147, -21.942, 'Atlantic/Reykjavik'],
];
const SKILLS = {
  light_feet: { name: 'Light feet', what: 'Rolls cost 25% less stamina.' },
  iron_lungs: { name: 'Iron lungs', what: 'Your breath lasts twice as long.' },
  killing_edge: { name: 'Killing edge', what: 'Ripostes do 3 times the damage instead of 2.' },
  second_wind: { name: 'Second wind', what: 'A clean parry gives back 12 health.' },
  strong_back: { name: 'Strong back', what: 'Carry 6 more load.' },
  forager: { name: 'Forager', what: 'Gathering gives one extra material.' },
};
const SKILL_LEVELS = { 5: ['light_feet', 'iron_lungs', 'killing_edge'], 10: ['second_wind', 'strong_back', 'forager'] };
const SCHOOL_PERK = { Agni: 'Agni school: Ignite hits 25% harder, and burning ground cannot hurt you', Jala: 'Jala school: Restore heals 40% more, and your lotus 15% more', Vayu: 'Vayu school: rolls cost 30% less stamina, and you walk 8% faster', Prithvi: 'Prithvi school: Shield lasts twice as long, and blows are 5% lighter', Akasha: 'Akasha school: mana returns 50% faster, and spells grow in rank faster' };
// how turned inward a chart is, in the old way of reading: a strong Jupiter (the teacher), Ketu in the houses of
// release (12th, 4th, 8th) or of dharma (9th), and planets in the twelfth, the house of moksha. 0 to 2
function inwardOf(c) {
  const J = c.by.Jupiter, K = c.by.Ketu; let s = 0;
  if (J.dignity === 'exalted' || J.dignity === 'own sign') s += 1; if ([1, 5, 9, 12].includes(J.house)) s += 0.5;
  if (K.house === 12) s += 1; else if ([4, 8, 9].includes(K.house)) s += 0.5;
  s += Math.min(1, 0.35 * c.planets.filter(p => p.house === 12 && p.name !== 'Ketu').length);
  return s >= 2 ? 2 : s >= 1 ? 1 : 0;
}
function makeBirth() {
  const now = Date.now(), yr = 365.25 * 864e5;
  const ms = now - rnd(18, 64) * yr, pl = PLACES[Math.floor(Math.random() * PLACES.length)];
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: pl[3], day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const looks = { hair: Math.floor(Math.random() * 4), build: [3.4, 4.2, 5.2][Math.floor(Math.random() * 3)], robe: Math.random() < 0.4 };
  const age = Math.floor((now - ms) / yr);
  if (!E) {
    const tier = Math.floor(Math.random() * 5), schools = ['Agni', 'Jala', 'Vayu', 'Prithvi', 'Akasha'];
    return { ms, geo: { lat: pl[1], lon: pl[2] }, place: pl[0], local, age, looks, lagna: '—', moon: '—', tier, tierName: ['None', 'Low', 'Medium', 'High', 'Great'][tier], school: tier ? schools[Math.floor(Math.random() * 5)] : null, style: 'Balanced', region: 'Unknown lands', people: 'Unknown people' };
  }
  const c = E.chart(ms, pl[1], pl[2]), g = E.game(c);
  const fortune = c.planets.filter(p => p.dignity === 'exalted' || p.dignity === 'own sign').length - 0.5 * c.planets.filter(p => p.dignity === 'debilitated').length + ([1, 4, 7, 10].includes(c.by.Jupiter.house) ? 1 : 0) + ([1, 4, 7, 10].includes(c.by.Venus.house) ? 0.5 : 0) + ([1, 5, 9].includes(c.by.Moon.house) ? 0.5 : 0);
  return { fortune, inward: inwardOf(c), ms, geo: { lat: pl[1], lon: pl[2] }, place: pl[0], local, age, looks, lagna: E.SIGNS[c.lagna.sign].en, moon: `${E.SIGNS[c.by.Moon.sign].en}, ${c.by.Moon.nakName}`, tier: g.manaTierIndex, tierName: g.manaTier, school: g.school ? g.school.id : null, style: g.social.split(':')[0], styleFull: g.social, why: g.why, region: g.region, people: g.civilization };
}
const STATS = {
  vit: { name: 'Vitality', what: '+8 health' },
  end: { name: 'Endurance', what: '+6 stamina and +2 load' },
  str: { name: 'Strength', what: 'Harder hits with blade, mace and spear' },
  agi: { name: 'Agility', what: 'Harder hits with daggers, bow, knives and staff; slightly faster rolls' },
  foc: { name: 'Focus', what: '+6 mana and stronger battle words, or faster stamina return in a body with no mana' },
};
const SCHOOL_STAT = { Agni: 'str', Jala: 'vit', Vayu: 'agi', Prithvi: 'end', Akasha: 'foc' };
function birthStats(b) {
  const st = { vit: 10, end: 10, str: 10, agi: 10, foc: 10 };
  if (b.school) st[SCHOOL_STAT[b.school]] += 2;
  if (b.tier === 0) { st.str++; st.end++; st.vit++; }
  if (b.style === 'Sovereign') st.str++;
  return st;
}
function perks(b) {
  const out = [];
  const bs = birthStats(b), up = Object.keys(bs).filter(k => bs[k] > 10).map(k => `${STATS[k].name} ${bs[k]}`);
  if (up.length) out.push('Starts with ' + up.join(', '));
  if (b.tier === 0) out.push('No mana: no battle words, but 25% more stamina and 15% more damage');
  else out.push(`${b.tierName} mana: ${[0, 40, 60, 80, 100][b.tier]} max`);
  if (b.school) out.push(SCHOOL_PERK[b.school]);
  if (b.style === 'Sovereign') out.push('Sovereign: alone, 10% more damage, one more prana, and wider senses');
  if (b.style === 'Sangha') out.push('Sangha: with others beside you, harder blows, wounds that close, and longer callings');
  if (b.style === 'Balanced') out.push('Balanced: a little stronger alone, and callings stay a little longer');
  if (b.inward) out.push(b.inward > 1 ? 'Deeply turned inward (Jupiter, Ketu and the twelfth house): stillness comes very easily' : 'Turned inward (Jupiter, Ketu or the twelfth house): stillness comes easily');
  return out;
}

/* ---------- the proving grounds ---------- */
const SOLIDS = [], ONEWAYS = [], LADDERS = [], WATERS = [], WINDS = [], DARKS = [], CRUMBLES = [], FAKES = [];
// the world is read from its level file: collision shapes here, places further down
{ const C = LEVEL.collision;
  for (const s of C.solids) SOLIDS.push({ k: 'solid', ...s });
  for (const o of C.oneways) ONEWAYS.push({ k: 'oneway', ...o, h: 10 });
  LADDERS.push(...C.ladders.map(l => ({ ...l }))); WATERS.push(...C.waters.map(w => ({ ...w }))); WINDS.push(...C.winds.map(w => ({ ...w }))); DARKS.push(...C.darks.map(d => ({ ...d })));
  for (const c of C.crumbles) CRUMBLES.push({ k: 'crumble', ...c, state: 'solid', t: 0 });
  for (const f of C.fakes) FAKES.push({ ...f, found: false }); }
const ARENAS = LEVEL.arenas;
ARENAS.forEach(a => { a.fight = false; a.hit = false; a.gates = [{ x: a.l - 24, y: a.gy - 320, w: 24, h: 320 }, { x: a.r, y: a.gy - 320, w: 24, h: 320 }]; });

const SHRINES = LEVEL.shrines;
const FOE_SPAWNS = LEVEL.foes;
const RELICS = {
  garuda: { name: 'Garuda feather', what: 'Jump again in the air.' },
  gecko: { name: 'Gecko charm', what: 'Cling to walls and kick off them.' },
  kite: { name: 'Kite cloth', what: 'Hold jump while falling to glide. Wind lifts a glider.' },
  naga: { name: 'Naga scale', what: 'Breathe under water and swim faster.' },
  bead: { name: 'Rudraksha bead', what: 'See what is false. More light in the dark. Soul relic: it stays with you across lives.', soul: true },
  ember: { name: 'Ember of Agni', what: 'Walk on burning ground.' },
  tortoise: { name: 'Tortoise shell', what: 'A wider window to parry.' },
};
const RELIC_SPOTS = LEVEL.relics;
const POT_SPOTS = LEVEL.pots;
const ZONES = LEVEL.zones;

function blocked(b) {
  for (const s of SOLIDS) if (overlap(b, s)) return s;
  for (const c of CRUMBLES) if (c.state !== 'gone' && overlap(b, c)) return c;
  for (const t of TEMPS) if (overlap(b, { x: t.x, y: t.y + t.h * (1 - t.rise), w: t.w, h: t.h * t.rise })) return t;
  for (const a of ARENAS) if (a.fight) for (const g of a.gates) if (overlap(b, g)) return g;
  return null;
}
function pointSolid(x, y) {
  for (const s of SOLIDS) if (inR(x, y, s)) return s;
  for (const c of CRUMBLES) if (c.state !== 'gone' && inR(x, y, c)) return c;
  for (const t of TEMPS) if (inR(x, y, t)) return t;
  for (const a of ARENAS) if (a.fight) for (const g of a.gates) if (inR(x, y, g)) return g;
  return null;
}
const waterAt = (x, y) => WATERS.find(w => inR(x, y, w));
const windAt = (x, y) => WINDS.find(w => inR(x, y, w));
const darkAt = (x, y) => DARKS.some(d => inR(x, y, d));
// outlines only where a block meets open air, so joined blocks read as one rock
const EDGES = [];
(function buildEdges() {
  const STEP = 8, solidAt = (x, y) => SOLIDS.some(s => inR(x, y, s));
  for (const s of SOLIDS) {
    const sides = [[s.x, s.y, s.x + s.w, s.y, 0, -2], [s.x, s.y + s.h, s.x + s.w, s.y + s.h, 0, 2], [s.x, s.y, s.x, s.y + s.h, -2, 0], [s.x + s.w, s.y, s.x + s.w, s.y + s.h, 2, 0]];
    for (const [ax, ay, bx, by, ox, oy] of sides) {
      const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(len / STEP)), ux = (bx - ax) / len, uy = (by - ay) / len;
      let start = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        const open = i < n && !solidAt(px + ux * len / n / 2 + ox, py + uy * len / n / 2 + oy);
        if (open && start === null) start = [px, py];
        if (!open && start) { EDGES.push([start[0], start[1], px, py]); start = null; }
      }
    }
  }
})();

/* ---------- canvas & input ---------- */
const cv = $('cv'), mainCtx = cv.getContext('2d');
const dk = document.createElement('canvas'), dctx = dk.getContext('2d');
let scale = 1;
function fit() { const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); dk.width = cv.width; dk.height = cv.height; scale = cv.width / W; }
addEventListener('resize', fit);
const KEYS = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', Space: 'jump', KeyS: 'down', ArrowDown: 'down', KeyJ: 'light', KeyK: 'heavy', KeyL: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll', KeyI: 'parry', KeyF: 'heal', KeyQ: 'swap', KeyE: 'use', KeyV: 'talk', KeyC: 'chant', KeyR: 'arrow' };
for (let i = 1; i <= 8; i++) KEYS['Digit' + i] = 'h' + i;
const held = {}, pressed = {}, released = {};
let mode = 'start';
addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT' || (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox')) return;
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'play') openGear(); else if (mode === 'gear') closePanel(); return; }
  if (mode === 'map' && /^Digit[1-9]$/.test(e.code)) { travelTo(+e.code.slice(5) - 1); return; }
  if (e.code === 'KeyM' && !e.repeat) { if (mode === 'play') { mode = 'map'; clearHeld(); } else if (mode === 'map') closePanel(); return; }
  if (e.code === 'Escape' && mode === 'meditate') { leaveMeditation(); return; }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && mode === 'play' && banner) { closeBanner(); e.preventDefault(); return; }
  if (e.code === 'Escape') { if (mode === 'gear' || mode === 'map' || mode === 'shrine' || mode === 'forge' || mode === 'chest' || mode === 'stone') { closePanel(); return; } if (mode === 'play') { mode = 'pause'; $('ovPause').hidden = false; } else if (mode === 'pause') resume(); return; }
  const a = KEYS[e.code]; if (!a) return;
  if (mode === 'play' || mode === 'meditate') e.preventDefault();
  if (e.repeat) return;
  if (!held[a]) pressed[a] = true; held[a] = true;
});
addEventListener('keyup', e => { const a = KEYS[e.code]; if (!a) return; if (mode === 'play') e.preventDefault(); held[a] = false; released[a] = true; });
addEventListener('blur', () => { for (const k in held) held[k] = false; if (mode === 'play') { mode = 'pause'; $('ovPause').hidden = false; } });
function clearHeld() { for (const k in held) held[k] = false; }
function resume() { mode = 'play'; $('ovPause').hidden = true; clearHeld(); }
const mouse = { x: W / 2, y: H / 2, in: false };
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * W; mouse.y = (e.clientY - r.top) / r.height * H; mouse.in = true; });
cv.addEventListener('mouseleave', () => { mouse.in = false; });
cv.addEventListener('mousedown', e => {
  if (banner && mode === 'play' && e.button === 0) { const r = cv.getBoundingClientRect(), my = (e.clientY - r.top) / r.height * H, bh = 70 + 24 * 3; if (Math.abs(my - 196) < bh / 2 + 30) { closeBanner(); e.preventDefault(); return; } }
  if (mode === 'map') { const h = mapHits.find(m => Math.hypot(mouse.x - m.x, mouse.y - m.y) < 18); if (h) travelTo(h.i); return; }
  if (mode !== 'play') return;
  e.preventDefault();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  if (e.button === 0) { if (!held.mouseL) pressed.mouseL = true; held.mouseL = true; }
  if (e.button === 2) pressed.parry = true;
});
addEventListener('mouseup', e => { if (e.button === 0 && held.mouseL) { held.mouseL = false; released.mouseL = true; } });
$('frame').addEventListener('contextmenu', e => e.preventDefault());
let camX = 0, camY = 0;
const aimX = () => mouse.x + camX, aimY = () => mouse.y + camY;
function faceAim() { if (mouse.in) P.face = aimX() > P.x + P.w / 2 ? 1 : -1; }
$('btnResume').addEventListener('click', resume);
$('btnTitle').addEventListener('click', () => toTitle());

/* ---------- sound ---------- */
let actx = null;
function tone(f1, f2, d, type = 'square', v = 0.04, delay = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.05);
  } catch (_) {}
}
const SFX = { swing: () => tone(1400, 500, 0.07, 'triangle', 0.03), hit: () => tone(180, 60, 0.12, 'square', 0.05), heavy: () => tone(120, 40, 0.2, 'sawtooth', 0.06), roll: () => tone(600, 250, 0.12, 'triangle', 0.03), parry: () => { tone(1800, 1200, 0.08, 'square', 0.04); tone(2400, 1600, 0.12, 'square', 0.03, 0.05); }, hurt: () => tone(420, 110, 0.25, 'sawtooth', 0.06), warn: () => tone(880, 880, 0.06, 'square', 0.02), drink: () => tone(500, 900, 0.3, 'sine', 0.05), word: () => { tone(220, 60, 0.4, 'sawtooth', 0.05); tone(330, 990, 0.2, 'square', 0.03); }, death: () => tone(200, 40, 1.4, 'sawtooth', 0.06), rest: () => [392, 523, 659].forEach((f, i) => tone(f, f, 0.25, 'sine', 0.04, i * 0.12)),
  jump: () => tone(300, 520, 0.08, 'triangle', 0.02), air: () => tone(500, 1100, 0.12, 'sine', 0.03), splash: () => tone(900, 120, 0.25, 'triangle', 0.03), thud: () => tone(110, 40, 0.3, 'sine', 0.12), crack: () => tone(300, 90, 0.18, 'square', 0.03), relic: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.3, 'sine', 0.04, i * 0.1)), throw: () => tone(1200, 400, 0.08, 'triangle', 0.03), grab: () => tone(700, 500, 0.05, 'square', 0.02) };

/* ---------- battle words & speech ---------- */
const WORDS = [
  { id: 'ignite', say: 'Ignite', short: 'IGNITE', school: 'Agni', cost: 20, what: 'A fire bolt where you aim.', how: 'You were born knowing it.', alias: ['ignite', 'ignites', 'ignited', 'ignight', 'ignyte', 'agnite', 'in night', 'ignore it'] },
  { id: 'shield', say: 'Shield', short: 'SHIELD', school: 'Prithvi', cost: 25, what: 'A stone guard that blocks the next hit.', how: 'You were born knowing it.', alias: ['shield', 'shields', 'sheild', 'sealed', 'shelled', 'she yield', 'shiel', 'shilled'] },
  { id: 'restore', say: 'Restore', short: 'RESTORE', school: 'Jala', cost: 30, what: 'Heals you a little at once.', how: 'You were born knowing it.', alias: ['restore', 'restores', 'restored', 'restoring', 're store', 'the store', 'we store', 'distore'] },
  { id: 'gust', say: 'Gust', short: 'GUST', school: 'Vayu', cost: 15, what: 'Wind throws foes back. Cast it in the air to lift yourself higher.', how: 'High up on the planks.', alias: ['gust', 'gusts', 'guest', 'gast', 'gusty', 'gassed'] },
  { id: 'pillar', say: 'Pillar', short: 'PILLAR', school: 'Prithvi', cost: 30, what: 'Stone rises where you aim and stays for 8 seconds. Stand on it to reach higher places.', how: 'Below the planks, near the high wall.', alias: ['pillar', 'pillars', 'piller', 'pilla', 'peeler', 'pillow'] },
  { id: 'monsoon', say: 'Monsoon', short: 'MONSOON', school: 'Jala', cost: 35, what: 'Rain falls where you aim for 6 seconds. Foes slow down, and burning ground under it is safe to cross.', how: 'At the mouth of the dark.', alias: ['monsoon', 'mon soon', 'monsun', 'man soon', 'monsoons', 'mansoon'] },
  { id: 'unseen', say: 'Unseen', short: 'UNSEEN', school: 'Akasha', cost: 25, what: 'You turn to ink and foes lose you for 5 seconds, 8 at night. Attacking ends it. Bosses see through it.', how: 'Someone you helped may teach you.', alias: ['unseen', 'un seen', 'unscene', 'on seen', 'and seen', 'unsean'] },
  { id: 'embers', say: 'Ember rain', short: 'EMBERS', school: 'Agni', cost: 30, what: 'Fire falls along the ground in front of you.', how: 'Past the crumbling bridge.', alias: ['ember rain', 'ember', 'embers', 'amber rain', 'member rain', 'amber'] },
  { id: 'echo', say: 'Echo', short: 'ECHO', school: 'Akasha', cost: 40, needs: { life: 2 }, what: 'A shade of one of your past lives fights beside you for 10 seconds.', how: 'Find a body you once wore.', alias: ['echo', 'eco', 'echoes', 'ekko', 'akko', 'ecco'] },
  { id: 'grasp', say: 'Grasp', short: 'GRASP', school: null, cost: 20, what: "Greed's own spell. Pull a foe to you and take some of its seeds. Using it weighs a little on karma.", how: 'The Grasping carry it. Defeat them.', alias: ['grasp', 'grasped', 'gasp', 'crasp', 'graps', 'grasps'] },
  { id: 'shani', say: 'Shani', short: 'SHANI', school: null, cost: 45, needs: { focus: 14 }, what: 'The weight of Saturn: everything near you slows down for 6 seconds, and you slow a little too.', how: 'A speaking stone below the plateau asks a question.', alias: ['shani', 'shanni', 'sani', 'shaney', 'saturn', 'shanee'] },
  { id: 'tide', say: 'Chandra', short: 'TIDE', school: null, cost: 30, what: "The Moon's tide heals you over 6 seconds. It is stronger the fuller the real Moon is tonight.", how: 'A stone above the wind gap wakes at night.', alias: ['chandra', 'chandr', 'candra', 'chandler', 'chander', 'tide'] },
  { id: 'starfall', say: 'Starfall', short: 'STARFALL', school: 'Akasha', cost: 50, needs: { night: true, focus: 12 }, what: 'Starlight strikes every foe you can see. Only at night where you are.', how: 'Behind a wall that is not there.', alias: ['starfall', 'star fall', 'star full', 'starful', 'stall fall'] },
  { id: 'quake', say: 'Quake', short: 'QUAKE', school: 'Prithvi', cost: 35, boss: 'chief', what: 'Slam the ground: two waves of stone run out along the floor both ways and knock foes off their feet. Only on the ground.', how: 'Won from the Grasping Chief on the trial road. It is its own move.', alias: ['quake', 'quakes', 'kweak', 'earthquake', 'quaked', 'quaker', 'qwake'] },
  { id: 'wisps', say: 'Wisps', short: 'WISPS', school: 'Agni', cost: 40, boss: 'wraith', what: 'Three wisps of fire circle you for 12 seconds and fly at foes that come near, setting them burning.', how: 'Won from the Ember Wraith on the trial road. It is its own fire.', alias: ['wisps', 'wisp', 'whisps', 'whisp', 'wasps', 'lisps', 'wispy'] },
  { id: 'inkstep', say: 'Ink step', short: 'STEP', school: 'Akasha', cost: 20, boss: 'masked', what: 'Melt into ink and step up to 200 paces toward where you aim, through foes but not through walls. Nothing touches you as you go. Stepping through the Masked One cuts it.', how: 'Won from the Masked One at the end of the trial road. It is how it moved.', alias: ['ink step', 'inkstep', 'in step', 'ink steps', 'inc step', 'ink stop', 'inks step', 'instep'] },
  { id: 'surya', say: 'Surya', short: 'SURYA', school: null, cost: 45, needs: { day: true }, what: 'Sunlight strikes down where you aim. The higher the real Sun stands where you are, the harder it burns. Only while the Sun is up.', how: 'A stone on the plateau wakes when the real Sun stands high.', alias: ['surya', 'suriya', 'soorya', 'sorry a', 'suria', 'surya dev', 'sooriya'] },
  { id: 'karuna', say: 'Karuna', short: 'KARUNA', school: null, cost: 25, what: 'Compassion: the foe in front of you lowers its weapon for 8 seconds. A boss only hesitates. Striking one you calmed weighs on karma.', how: 'Spare three who beg for mercy in one life.', alias: ['karuna', 'caruna', 'karoona', 'corona', 'karina', 'car una', 'karunaa'] },
  { id: 'vajra', say: 'Vajra', short: 'VAJRA', school: 'Vayu', cost: 40, what: "Indra's lightning strikes the nearest foe in front of you and jumps to two more.", how: 'Beat a boss without being hit once.', alias: ['vajra', 'vajara', 'vadra', 'vazra', 'vajrah', 'vachra', 'bajra'] },
  { id: 'firewind', say: 'Fire wind', short: 'FIREWIND', school: 'Agni', cost: 35, what: 'A blast of fire in front of you that throws foes back.', how: 'Join two spells you know at a shrine.', alias: ['fire wind', 'firewind', 'fire win', 'far wind', 'fire when'] },
];
const SPELL = id => WORDS.find(w => w.id === id);
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
const phon = w => w.replace(/ph/g, 'f').replace(/th/g, 't').replace(/ck/g, 'k').replace(/v/g, 'w').replace(/z/g, 's').replace(/[aeiouy]+/g, 'a').replace(/(.)\1+/g, '$1');
const sim = (a, b) => { const pa = phon(a), pb = phon(b); return 1 - lev(pa, pb) / Math.max(pa.length, pb.length, 1); };
function findWord(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const one = tokens[i], two = i + 1 < tokens.length ? one + ' ' + tokens[i + 1] : null;
    for (const w of WORDS) if (w.alias.includes(one) || (two && w.alias.includes(two)) || sim(one.replace(/ /g, ''), w.id) >= 0.8) return { w, at: i };
  }
  return null;
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
// the game learns how this player's voice comes out of the recogniser, per spell, and keeps it in this browser
const HEARD_KEY = 'samsara.heard'; let HEARD = {}, lastMiss = null;
try { HEARD = JSON.parse(localStorage.getItem(HEARD_KEY)) || {}; } catch (_) { HEARD = {}; }
function saveHeard() { try { localStorage.setItem(HEARD_KEY, JSON.stringify(HEARD)); } catch (_) {} }
function cleanPhrase(t) { return String(t).toLowerCase().replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function learnAlias(id, phrase) {
  const ph = cleanPhrase(phrase), w = SPELL(id); if (!w || !ph || ph.split(' ').length > 2) return false;
  if (WORDS.some(x => x.alias.includes(ph))) return false;
  (HEARD[id] = HEARD[id] || []).push(ph); if (HEARD[id].length > 6) { const old = HEARD[id].shift(); w.alias = w.alias.filter(a => a !== old); }
  w.alias.push(ph); saveHeard(); return true;
}
function forgetHeard(id) { const w = SPELL(id), list = HEARD[id] || []; w.alias = w.alias.filter(a => !list.includes(a)); delete HEARD[id]; saveHeard(); }
let micMode = 'ptt', rec = null, recOn = false, pttHeld = false, lastWordAt = {}, voiceLines = [], micReady = false, pttRelease = -1e9;
function setMicMode(m) {
  micMode = m; $('micMode').value = m; $('micStart').value = m;
  if (m !== 'always') stopRec();
  if (m === 'always' && mode === 'play') startRec();
}
$('micMode').addEventListener('change', e => setMicMode(e.target.value));
$('micStart').addEventListener('change', e => setMicMode(e.target.value));
function voiceLog(text, hit) {
  voiceLines.unshift({ text, hit }); voiceLines = voiceLines.slice(0, 6);
  $('voiceLog').innerHTML = voiceLines.map(l => `<span class="${l.hit ? 'hit' : 'miss'}">${esc(l.text)}</span>`).join('');
}
let MC = null;
function micCheck() {
  const out = $('micCheckMsg');
  if (!SR) { out.textContent = 'This browser cannot hear speech. Use Chrome or Edge, or play with the mic off: every spell and chant still works from the keys.'; return; }
  if (MC) return;
  const words = ['ignite', 'shield', 'restore'].map(SPELL), log = []; let k = 0;
  const show = tail => { out.innerHTML = log.map(l => `<span style="display:block">${l}</span>`).join('') + (tail ? `<span style="display:block">${tail}</span>` : ''); };
  const ask = () => show(`Say <b>${words[k].say}</b> once, clearly.`);
  let r; try { r = new SR(); } catch (_) { out.textContent = 'The microphone could not start.'; return; }
  r.lang = 'en-IN'; r.continuous = true; r.interimResults = false; r.maxAlternatives = 3; MC = r; ask();
  r.onresult = e => {
    const res = e.results[e.results.length - 1]; if (!res || res.isFinal === false) return;
    const heard = cleanPhrase(res[0].transcript), f = findWord(heard.split(' ').filter(Boolean)), want = words[k];
    if (f && f.w.id === want.id) log.push(`✓ ${esc(want.say)}: heard “${esc(heard)}”`);
    else if (f) { show(`That sounded like ${esc(f.w.say)}. Say <b>${esc(want.say)}</b> again.`); return; }
    else if (learnAlias(want.id, heard)) log.push(`✓ ${esc(want.say)}: heard “${esc(heard)}”, and I will remember that is how you say it`);
    else { show(`I heard “${esc(heard)}”. Say <b>${esc(want.say)}</b> again, a little slower.`); return; }
    k++; if (k < words.length) ask(); else { show('Your mic works. You are ready to play.'); try { r.stop(); } catch (_) {} MC = null; }
  };
  r.onerror = e => { show({ 'not-allowed': 'The microphone is blocked. Allow it in the address bar, then try again.', network: 'The speech service could not be reached. It needs the internet in this browser.', 'audio-capture': 'No microphone was found.', 'no-speech': 'I heard nothing. Try again a little closer to the mic.' }[e.error] || `The mic stopped (${esc(e.error)}).`); MC = null; };
  r.onend = () => { MC = null; };
  try { r.start(); } catch (_) { MC = null; }
}
function startRec() {
  if (!SR || recOn) return;
  rec = new SR(); rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
  const used = new Map();
  rec.onaudiostart = () => { micReady = true; };
  rec.onresult = e => {
    if (micMode === 'off' || (micMode === 'ptt' && !pttHeld && performance.now() - pttRelease > 450)) return;
    if (CHS && CHS.state === 'chant') { if (CHS.base === null) CHS.base = e.resultIndex; const toks = []; const tk = t => t.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean); for (let i = CHS.base; i < e.results.length; i++) { const one = tk(e.results[i][0].transcript); toks.push(...one); chantHeard(one); } chantHeard(toks); for (let i = CHS.base; i < e.results.length; i++) for (let a = 1; a < e.results[i].length; a++) chantHeard(e.results[i][a].transcript.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean)); const last = e.results[e.results.length - 1]; if (last.isFinal) voiceLog(`heard “${last[0].transcript.trim()}” (chant)`, true); return; }
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      for (let a = 0; a < r.length; a++) {
        const toks = r[a].transcript.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
        if (P && nearStone() && nearStone().k === 'speak' && !soul.spells.has('shani') && answerStone(toks.join(' '))) { voiceLog(`heard “${r[a].transcript.trim()}” → the stone answers`, true); break; }
        let start = used.get(i) || 0; if (toks.length < start) start = 0; const found = findWord(toks.slice(start));
        if (found) {
          used.set(i, start + found.at + 1);
          const now = performance.now();
          if (now - (lastWordAt[found.w.id] || 0) > 700) { lastWordAt[found.w.id] = now; castWord(found.w, 1); voiceLog(`heard “${r[a].transcript.trim()}” → ${found.w.say}`, true); }
          break;
        }
        if (a === 0 && r.isFinal && toks.length) { voiceLog(`heard “${r[a].transcript.trim()}” (no battle word)`, false); if (toks.length <= 2) lastMiss = { ph: toks.join(' '), t: performance.now() }; }
      }
    }
  };
  rec.onerror = e => { const m = { 'not-allowed': 'Microphone blocked. Allow it in the address bar.', network: 'Speech service unreachable (needs internet).', 'audio-capture': 'No microphone found.' }[e.error]; if (m) { voiceLog(m, false); if (e.error !== 'network') setMicMode('off'); } };
  rec.onend = () => { recOn = false; micReady = false; if (mode === 'play' && (micMode === 'always' || (micMode === 'ptt' && pttHeld))) startRec(); };
  try { rec.start(); recOn = true; } catch (_) { recOn = false; }
}
function stopRec() { try { rec && rec.stop(); } catch (_) {} }

/* ---------- state ---------- */
const SOUL0 = () => ({ chants: new Set(['agni']), spells: new Set(['ignite', 'shield', 'restore']), ranks: {}, kills: 0, home: null, karma: 0, deeds: [], lives: [], memories: { gift: 0, spared: 0, slain: 0 }, bodies: [], soulRelics: new Set(), bossKills: {}, tablets: new Set(), realized: new Set(), understood: new Set(), dhyana: 0, bossFalls: 0, paths: { jnana: 0, bhakti: 0, karma: 0, dhyana: 0, alone: 0 }, pathLives: {}, pathStep: { jnana: 0, bhakti: 0, karma: 0, dhyana: 0, alone: 0 }, teacher: null, aloneClosed: false, arts: new Set() });
const soul = SOUL0();
let life = null, P = null, foes = [], shots = [], fx = [], floaters = [], shades = [], drops = [], pots = [];
let shake = 0, hitstop = 0, clock = 0, banner = null, pendingDeath = 0, zoneTag = null;
const villager = { ...LEVEL.people.villager, helped: false, talkT: 0, line: '' };
const has = id => P.equip.includes(id);
const pcx = () => P.x + P.w / 2;
const wears = id => P.garb.head === id || P.garb.body === id || P.garb.feet === id;
const inHand = id => WEAPONS[P.slots[P.slotIdx]].id === id;

// a fresh body for a birth (also used to rebuild a body from a save, before the saved values are laid over it)
function makeP(birth) {
  const b = birth, noMana = b.tier === 0;
  const manaMax = [0, 40, 60, 80, 100][b.tier];
  const sr = [...soul.soulRelics];
  return { x: SHRINES[0].x + 40, y: SHRINES[0].gy - PH, w: 22, h: PH, vx: 0, vy: 0, face: 1, onG: true, groundS: null, hp: 100, hpMax: 100, st: noMana ? 125 : 100, stMax: noMana ? 125 : 100, stDelay: 0,
    mana: manaMax, manaMax, prana: 3, pranaMax: 3, lotus: 3, lotusMax: 3, seeds: 0, slots: [0, 2], slotIdx: 0, swapT: 0, mT: 0, mDown: false, chargeSrc: null, bufLight: 0,
    chantSlots: noMana ? 5 : 3, prepared: new Set(CHANTS.filter(c => soul.chants.has(c.id)).slice(0, noMana ? 5 : 3).map(c => c.id)), scrolls: {}, arrows: { iron: 0, ember: 0, ink: 0 }, arrowKind: 'reed', wordSlots: noMana ? [null, null, null, null] : Array.from({ length: [0, 1, 2, 3, 4][b.tier] }, (_, i) => (WORDS.filter(w => soul.spells.has(w.id))[i] || {}).id || null),
    atk: null, charge: 0, charging: false, rollT: 0, rollIF: 0, parryT: 0, parryCd: 0, healT: 0, hitT: 0, inv: 0, shieldT: 0, riposte: 0, dead: false, deadT: 0,
    dmgMul: noMana ? 1.15 : 1, looks: b.looks, school: b.school, noMana, run: 0,
    stBase: noMana ? 125 : 100, visited: new Set([0]), weapons: new Set([0, 2]), stats: birthStats(b), stats0: birthStats(b), skills: new Set(), skillPending: null, wtier: {}, mats: { wood: 0, iron: 0, ink: 0, petal: 0, ember: 0 }, knivesMax: KNIVES, torchMax: TORCH, made: new Set(), manaTierMax: manaMax, garb: { head: null, body: 'wrap', feet: 'sandals' }, garbOwned: new Set(['wrap', 'sandals']), loadMax: 20, combo: 0, comboT: 0, rollV: 0, mount: false, trampleCd: 0,
    relics: new Set(sr), equip: sr.concat([null, null, null, null]).slice(0, 4), shrine: 0, safe: { x: SHRINES[0].x + 40, y: SHRINES[0].gy },
    jumpsLeft: 0, jumping: false, coy: 0, jbuf: 0, dropT: 0, grabCd: 0, kickT: 0, clingMem: 0, clingDir: 0, cling: 0, hang: null, climbT: 0, climb: null, ladder: null, glide: false, plunge: false, landT: 0,
    inWater: false, headUnder: false, breath: BREATH, burnT: 0, crouch: false, torch: { fuel: TORCH, lit: false }, knives: KNIVES, knifeCd: 0, zones: new Set(), zone: -1 };
}
function newLife(birth) {
  life = { n: soul.lives.length + 1, birth, deeds: [], end: null, start: Date.now(), bossDown: new Set(), intents: [], kills: 0 };
  soul.lives.push(life);
  const b = birth, noMana = b.tier === 0;
  P = makeP(b);
  applyStats(true); P.boons = []; applyDayBoon();
  const carried = applyCarry();
  if (soul.debt && !soul.debt.paid) {
    life.debtGhost = true; P.lotusMax = Math.max(1, P.lotusMax - 1); P.lotus = Math.min(P.lotus, P.lotusMax);
    // born near the one you wronged: wake at the shrine nearest to it
    let si = 0, bd = 1e9; SHRINES.forEach((sh, i) => { const dd = Math.abs(sh.x - soul.debt.x) + Math.abs(sh.gy - soul.debt.gy) * 2; if (dd < bd) { bd = dd; si = i; } });
    const sh = SHRINES[si]; P.x = sh.x + 40; P.y = sh.gy - PH; P.shrine = si; P.visited.add(si); P.safe = { x: sh.x + 40, y: sh.gy };
  }
  life.carried = carried;
  if (pathAt('bhakti') >= 1) { P.lotusMax++; P.lotus++; }
  if (b.style === 'Sovereign') { P.pranaMax++; P.prana++; }
  P.artCd = {}; P.ironT = 0; P.stepT = 0; P.spark = false;
  if (P.noMana) for (const a of ART_FOR_STEP) if (soul.arts.has(a)) putArt(a);
  resetNodes();
  if (!soul.home) soul.home = emptyInv();
  newHorse(); resetChests();
  TEMPS = []; RAINS = []; ALLY = null; CHS = null; SUMMONS = []; ECHO_HITS = []; WAVES = []; WISPS = []; BQ = [];
  pots = POT_SPOTS.map(([x, gy, seeds]) => ({ x, gy, seeds, broken: false }));
  FAKES.forEach(f => f.found = false);
  drops = []; shots = []; resetCrumbles(); spawnFoes();
  snapCam();
  banner = { t: 3.2, top: `LIFE ${life.n}`, sub: `Born ${b.local} in ${b.place} · ${b.lagna} lagna${life.carried.length ? ` · You carry: ${life.carried.join(', ')}` : ''}` };
  if (life.debtGhost) showBanner({ t: 4.6, top: 'A DEBT FOLLOWS YOU', sub: `${DEBTS[soul.debt.kind].who} waits near where it happened. Until it is settled, you carry one lotus less.` });
  renderLives(); $('lifeLabel').textContent = `Life ${life.n}`;
}
function spawnFoes() {
  foes = FOE_SPAWNS.map(makeFoe); if (soul.karma >= 5) for (const f of foes) if (Math.random() < 0.25) f.peace = true;
  for (const a of ARENAS) { a.fight = false; a.hit = false; if (!life.bossDown.has(a.id)) foes.push(makeBoss(a)); }
  WAVES = WAVES.filter(v => !v.hostile);
}
function resetCrumbles() { CRUMBLES.forEach(c => { c.state = 'solid'; c.t = 0; }); }
function camTarget() { return [clamp(P.x + P.w / 2 - W * 0.45 + P.face * 40, 0, LW - W), clamp(P.y + P.h / 2 - H * 0.56, 0, LH - H)]; }
function snapCam() { [camX, camY] = camTarget(); }

/* ---------- deeds & karma ---------- */
/* ---------- karma 2 (Phase 3): a hidden ledger, witnesses, intentions, the world's reactions ---------- */
function witnesses(target) {
  let n = 0; const fy = P.y + P.h;
  if (target !== villager && Math.abs(villager.x - pcx()) < 420 && Math.abs(villager.gy - fy) < 200) n++;
  for (const f of foes) if (f.alive && f !== target && f.state !== 'kneel' && Math.abs(f.x - pcx()) < 420 && Math.abs(f.gy - fy) < 200) n++;
  return n;
}
// deeds no one sees weigh twice. The player never sees a number: only a faint sign around them
function deed(text, weight, o = {}) {
  const seen = o.fixed ? true : witnesses(o.target) > 0, w = seen ? weight : weight * 2;
  const d = { text, weight: w, seen, kind: o.kind || null, x: Math.round(pcx()), gy: Math.round(P.y + P.h) };
  life.deeds.push(d); soul.deeds.push({ ...d, life: life.n }); soul.karma += w;
  if (w > 0 && ['gift', 'mercy', 'repaid', 'true'].includes(d.kind)) walk('karma', seen ? 1 : 2);
  if (!o.quiet) {
    if (w > 0) { for (let i = 0; i < 3; i++) fx.push({ k: 'ring', big: i === 0, x: pcx(), y: P.y + P.h - i * 16, life: 0.35 }); tone(660, 990, 0.5, 'sine', 0.02); }
    else { for (let i = 0; i < 12; i++) fx.push({ k: 'ink', x: pcx() + rnd(-14, 14), y: P.y + rnd(0, 20), vx: rnd(-10, 10), vy: rnd(40, 90), life: rnd(0.5, 0.9) }); tone(140, 90, 0.6, 'sine', 0.035); }
  }
  renderLives(); saveSoon();
}
const lifeKarma = () => life.deeds.reduce((a, d) => a + d.weight, 0);
const INTENTS = [
  ['gift', 'For what it guarded'], ['way', 'It stood in my way'], ['protect', 'So it would harm no one else'], ['could', 'Because I could'],
];
let autoAsk = null;
function openAsk() {
  const q = life.ask; life.ask = null; if (!q) return;
  if (autoAsk) { life.intents.push({ boss: q.id, why: autoAsk }); return; }
  banner = null; mode = 'ask'; clearHeld();
  $('gearIn').innerHTML = `<span class="eyebrow">The wheel asks</span><h2>Why did you fight ${esc(q.name)}?</h2>
    <p class="hand">There is no wrong answer to give. There is only the answer you give.</p>
    <div class="choices">${INTENTS.map(([k, t]) => `<button class="choice" type="button" data-why="${k}"><b>${esc(t)}</b></button>`).join('')}</div>`;
  $('ovGear').hidden = false;
  $('gearIn').querySelectorAll('[data-why]').forEach(b => b.addEventListener('click', () => {
    const why = b.dataset.why; life.intents.push({ boss: q.id, why });
    if (why === 'could') deed(`You fought ${q.name} because you could.`, -1, { kind: 'pride', fixed: true, quiet: true });
    closePanel(); floater(pcx(), P.y - 40, 'The wheel turns, and says nothing.', INK2);
  }));
}
// at the end of a life: do the words given after bosses agree with what the hands did?
function weighWords() {
  if (!life.intents.some(i => i.why === 'protect')) return;
  const cruel = life.deeds.some(d => d.kind === 'slain' || d.kind === 'calm'), kind = life.deeds.some(d => d.kind === 'mercy' || d.kind === 'gift');
  if (cruel) deed('You said you fought to protect others, but your hands were cruel.', -2, { kind: 'lie', fixed: true, quiet: true });
  else if (kind) deed('You said you fought to protect others, and your hands agreed.', 1, { kind: 'true', fixed: true, quiet: true });
}
const begChance = () => soul.karma >= 5 ? 0.8 : soul.karma <= -3 ? 0 : 0.55;
/* the hungry dog by the village: a small kindness that costs you something */
const DOG = LEVEL.people.dog;
function feedDog() {
  if (life.fedDog) { floater(DOG.x, DOG.gy - 40, 'THE DOG SLEEPS, FED', PENCIL); return; }
  if (P.lotus <= 0) { floater(DOG.x, DOG.gy - 40, 'THE DOG WATCHES YOUR EMPTY HANDS', PENCIL); return; }
  P.lotus--; life.fedDog = true; const knew = (soul.dogLives || 0) > 0; soul.dogLives = (soul.dogLives || 0) + 1;
  deed('You gave your lotus to a hungry dog.', 1, { kind: 'gift' }); walk('bhakti', knew ? 2 : 1);
  floater(DOG.x, DOG.gy - 40, knew ? 'THE DOG KNOWS YOU, THOUGH YOU HAVE A NEW FACE' : 'THE DOG EATS, AND WAGS ITS TAIL', INK2);
}
/* ---------- rebirth 2: realms, how much choice, fragments to keep, debts to repay ---------- */
const REALMS = {
  deva: ['the realm of the devas', 'Bright and easy, where merit is spent like light, and the shining ones forget to look for the way out.'],
  asura: ['the realm of the asuras', 'Strong and proud, where every victory makes someone else’s seem larger.'],
  human: ['the human realm', 'The middle way: enough joy to want, enough sorrow to wake. The rarest place to be born, and the best place to see clearly.'],
  tiryak: ['the realm of animals', 'Where life is lived by hunger and fear, and kindness, when it comes, is never forgotten.'],
  preta: ['the realm of hungry ghosts', 'Where the belly is a mountain and the mouth a needle’s eye; nothing is ever enough.'],
  naraka: ['the realm of hells', 'Where what was done returns, until it is worn away.'],
};
function realmLean() {
  const k = soul.karma, greed = life.deeds.filter(d => d.kind === 'greed').length, pride = life.intents.filter(i => i.why === 'could').length + (life.kills > 25 ? 1 : 0);
  if (k >= 12) return 'deva'; if (k >= 3 && pride) return 'asura'; if (k <= -6) return 'naraka'; if (greed && k < 2) return 'preta'; if (k <= -2) return 'tiryak'; return 'human';
}
function verdict(lk) {
  return lk >= 4 ? 'This life was light. It rose like smoke from a clean fire.' : lk >= 1 ? 'This life leaned toward the good.' : lk === 0 ? 'This life weighed little either way.' : lk >= -3 ? 'This life left a weight behind.' : 'This life was heavy. The wheel turns slowly under it.';
}
function fragmentsOf() {
  const out = [];
  for (const id of P.skills) out.push({ kind: 'skill', id, name: `The skill: ${SKILLS[id].name}`, what: SKILLS[id].what });
  for (const k of Object.keys(P.stats)) if (P.stats[k] > P.stats0[k]) out.push({ kind: 'stat', id: k, name: `+1 ${STATS[k].name}`, what: 'One point of what this body trained, carried into the next.' });
  for (const wi of Object.keys(P.wtier)) if (P.wtier[wi] > 1) out.push({ kind: 'tier', id: +wi, tier: P.wtier[wi], name: `${WEAPONS[wi].name}, ${TIER_NAME[P.wtier[wi]]}`, what: 'The temper of this weapon: whenever you hold it again, it is this strong.' });
  const sc = Object.keys(P.scrolls || {}).filter(id => P.scrolls[id] > 0).sort((a, b) => P.scrolls[b] - P.scrolls[a])[0];
  if (sc) out.push({ kind: 'scrolls', id: sc, n: Math.min(3, P.scrolls[sc]), name: `${Math.min(3, P.scrolls[sc])} scrolls of ${SPELL(sc).say}`, what: 'Scrolls folded small enough to carry through death.' });
  return out;
}
const keepCount = () => (soul.karma >= 5 ? 2 : soul.karma >= -1 ? 1 : 0) + (pathAt('karma') >= 3 ? 1 : 0);
function applyCarry() {
  const got = [];
  for (const f of soul.carry || []) {
    if (f.kind === 'skill') { P.skills.add(f.id); got.push(SKILLS[f.id].name); }
    if (f.kind === 'stat') { P.stats[f.id]++; P.stats0[f.id]++; got.push(`+1 ${STATS[f.id].name}`); }
    if (f.kind === 'tier') { P.wtier[f.id] = Math.max(P.wtier[f.id] || 1, f.tier); got.push(`${WEAPONS[f.id].name} ${TIER_NAME[f.tier]}`); }
    if (f.kind === 'scrolls') { P.scrolls[f.id] = (P.scrolls[f.id] || 0) + f.n; if (P.noMana && !P.wordSlots.includes(f.id)) { const i = P.wordSlots.indexOf(null); if (i >= 0) P.wordSlots[i] = f.id; } got.push(`${f.n} scrolls of ${SPELL(f.id).say}`); }
  }
  soul.carry = []; if (got.length) applyStats(true);
  return got;
}
const DEBTS = {
  slain: { who: 'The spirit of one you cut down while it begged', ask: 'It cannot rest. Sit with it, and offer it a lotus.', pay: 'lotus', done: 'You sat with the spirit of one you cut down, and gave it your lotus. It rests now.' },
  calm: { who: 'One you struck after you had calmed it', ask: 'It waits, wary, for a gentleness it was promised. Offer it a lotus.', pay: 'lotus', done: 'You kept the promise your calm had made. It walks into the ink, at peace.' },
  greed: { who: 'A hungry ghost that remembers what greed took', ask: 'It holds out its hands. Give it 30 seeds.', pay: 'seeds', done: 'You gave back what greed had taken. The hungry ghost is, for a moment, full.' },
  pride: { who: 'Your own reflection, unwilling to look at you', ask: 'It waits for one honest word.', pay: 'word', done: 'You said it: you were wrong. Your reflection looks at you at last.' },
  lie: { who: 'Your own reflection, unwilling to look at you', ask: 'It waits for one honest word.', pay: 'word', done: 'You said it: your words and your hands did not agree. Your reflection looks at you at last.' },
};
function debtFrom() {
  if (lifeKarma() > -2 && soul.karma > -2) return null;
  for (const kind of ['slain', 'calm', 'greed', 'lie', 'pride']) { const d = life.deeds.slice().reverse().find(x => x.kind === kind); if (d) return { kind, x: d.x, gy: d.gy }; }
  return null;
}
const nearDebt = () => soul.debt && life.debtGhost && !soul.debt.paid && Math.abs(pcx() - soul.debt.x) < 60 && Math.abs(P.y + P.h - soul.debt.gy) < 50;
function payDebt() {
  const D = DEBTS[soul.debt.kind];
  if (D.pay === 'lotus') { if (P.lotus <= 0) { floater(soul.debt.x, soul.debt.gy - 60, 'YOU HAVE NO LOTUS TO OFFER', PENCIL); return; } P.lotus--; }
  if (D.pay === 'seeds') { if (P.seeds < 30) { floater(soul.debt.x, soul.debt.gy - 60, 'YOU HAVE TOO FEW SEEDS', PENCIL); return; } P.seeds -= 30; }
  if (D.pay === 'word') {
    banner = null; mode = 'ask'; clearHeld();
    $('gearIn').innerHTML = `<span class="eyebrow">A debt</span><h2>${esc(D.who)}</h2><p class="hand">${esc(D.ask)}</p><div class="choices"><button class="choice" type="button" id="dWord"><b>I was wrong.</b></button><button class="choice" type="button" id="dLeave"><b>Not yet.</b></button></div>`;
    $('ovGear').hidden = false; $('dWord').addEventListener('click', () => { closePanel(); settleDebt(); }); $('dLeave').addEventListener('click', () => closePanel()); return;
  }
  settleDebt();
}
function settleDebt() {
  const D = DEBTS[soul.debt.kind]; soul.debt.paid = true; life.debtGhost = false;
  P.lotusMax += 1; deed(D.done, 2, { kind: 'repaid', fixed: true });
  for (let i = 0; i < 30; i++) fx.push({ k: 'ink', x: soul.debt.x + rnd(-14, 14), y: soul.debt.gy - rnd(0, 50), vx: rnd(-20, 20), vy: -rnd(30, 90), life: rnd(0.6, 1.2) });
  showBanner({ t: 4, top: 'THE DEBT IS PAID', sub: `${D.done} The weight lifts: you can carry your full lotus again.` });
  soul.debt = null;
}
/* ---------- the five paths (Phase 3) ----------
   Five roads to realization, walked by deeds, never by words. How far you are is hidden: shrines only give a feeling.
   Each road has three steps, each step gives a small gift, and the third step (the end of the road) needs the road
   to have been walked in more than one life. A body with no mana that walks the road of right action learns body
   arts; one that walks the road of stillness to its end may, very rarely, wake a spark of mana.
   Bowing to a teacher opens the road of love and closes the road walked alone for the whole soul. */
const PATHS = {
  jnana: { name: 'Jnana', road: 'the road of knowing', feel: 'You see a little more of what is there, and a little less of what is not.',
    gifts: ['False walls show themselves faintly to you, in every life.', 'What is false is marked for you: a copy is a copy, and you see it.', 'Nothing disguised fools you: in a riddle one false answer fades away, and a seat hidden in a false wall near the End shrine shows itself, where stillness comes easily.'] },
  bhakti: { name: 'Bhakti', road: 'the road of love', feel: 'Somewhere, someone remembers you kindly.',
    gifts: ['Those who love you remember you: you carry one lotus more, in every life.', 'Your lotus heals 20% more.', 'You are never alone: once in each life, a blow that would end you leaves you standing.'] },
  karma: { name: 'Karma', road: 'the road of right action', feel: 'Your hands are learning to do right without asking anything back.',
    gifts: ['Mercy steadies you: sparing one who begs gives you back health and stamina.', 'Without hate: while this life holds no cruelty, your blows land 8% harder.', 'The weight is lighter: you keep one memory more between lives.'] },
  dhyana: { name: 'Dhyana', road: 'the road of stillness', feel: 'The water in you settles faster than it used to.',
    gifts: ['Calm comes sooner when you sit in stillness.', 'The breath feeds you: mana returns 15% faster (in a body with no mana, stamina does).', 'Stillness holds you: 10% more mana in every body that has it. In a body with no mana, a deep stillness may, very rarely, wake a spark.'] },
  alone: { name: 'The solitary path', road: 'the road walked alone', feel: 'You have learned to lean on nothing.',
    gifts: ['Your own two feet: 6% more damage against bosses.', 'Nothing to lean on: 10 more stamina, in every body.', 'Alone, and whole: every blow you take is 10% lighter.'] },
};
const PATH_KEYS = ['jnana', 'bhakti', 'karma', 'dhyana', 'alone'], PATH_STEPS = [4, 10, 18], SPARK_MANA = 24, SPARK_CHANCE = 0.12;
const capF = t => t.charAt(0).toUpperCase() + t.slice(1);
const pathAt = k => (k === 'alone' && soul.aloneClosed) ? 0 : (soul.pathStep && soul.pathStep[k]) || 0;
function walk(k, n) {
  if (!soul.paths || !n || !life) return; if (k === 'alone' && soul.aloneClosed) return;
  if (k === 'bhakti' && wayOf() === 'Sangha') n = Math.ceil(n * 1.5);
  soul.paths[k] += n; const L = soul.pathLives[k] = soul.pathLives[k] || []; if (!L.includes(life.n)) L.push(life.n);
  checkPath(k);
}
function checkPath(k) {
  for (;;) {
    const s = soul.pathStep[k]; if (s >= 3 || soul.paths[k] < PATH_STEPS[s]) return;
    if (s === 2 && (soul.pathLives[k] || []).length < 2) return;   // a road is never walked to its end in a single life
    soul.pathStep[k] = s + 1; stepGift(k, s + 1);
  }
}
function stepGift(k, step) {
  const R = PATHS[k], end = step === 3; let extra = '';
  if (k === 'bhakti' && step === 1) { P.lotusMax++; P.lotus++; }
  if (k === 'alone' && step === 2) { applyStats(false); P.stMax = P.stBase; }
  if (k === 'dhyana' && step === 3) applyStats(false);
  if (k === 'karma') { const a = ART_FOR_STEP[step - 1]; soul.arts.add(a); if (P.noMana) { putArt(a); extra = ` And this body, born with no mana, learns a body art: ${ARTS[a].name}. ${ARTS[a].what}`; } }
  showBanner({ t: 6, top: end ? 'A ROAD WALKED TO ITS END' : 'A ROAD UNDER YOUR FEET', sub: `${capF(R.road)} ${end ? 'is walked to its end' : 'is a little more worn'}. ${R.feel} ${R.gifts[step - 1]}${extra}` });
  for (let i = 0; i < 4; i++) fx.push({ k: 'ring', big: i === 0, x: pcx(), y: P.y + P.h - i * 14, life: 0.35 });
  tone(440, 660, 0.8, 'sine', 0.04); if (end) tone(554, 880, 1.2, 'sine', 0.03, 0.3);
}
// small gifts from the roads, folded into the same numbers as the readings' blessings
function roadBoon(k) {
  if (!soul.pathStep || !P) return 0; let v = 0;
  if (k === 'heal' && pathAt('bhakti') >= 2) v += 0.2;
  if (k === 'dmg' && pathAt('karma') >= 2 && life && !life.deeds.some(d => d.kind === 'slain' || d.kind === 'calm')) v += 0.08;
  if (k === 'mana' && pathAt('dhyana') >= 2) v += 0.15;
  if (k === 'st' && P.noMana && pathAt('dhyana') >= 2) v += 0.15;
  if (k === 'prot' && pathAt('alone') >= 3) v += 0.1;
  return v;
}
// what a shrine lets you feel: never a number
function roadWord(k) {
  if (k === 'alone' && soul.aloneClosed) return 'closed behind you when you bowed to a teacher. It does not open again for this soul.';
  const v = soul.paths[k], s = pathAt(k); if (!v) return null;
  if (s >= 3) return 'is walked to its end.';
  const base = s === 2 ? 'is worn deep under your feet' : s === 1 ? 'is a trodden track' : v >= 2 ? 'shows a few of your footprints' : 'is a faint line in the grass';
  const near = v >= PATH_STEPS[s] * 0.75;
  if (s === 2 && v >= PATH_STEPS[2] && (soul.pathLives[k] || []).length < 2) return `${base}, but it will not end in a single life.`;
  return `${base}${near ? ', and you feel it turning somewhere close ahead' : ''}.`;
}
function roadsHTML() {
  const lines = PATH_KEYS.map(k => { const w = roadWord(k); return w ? `<span>${capF(PATHS[k].road)} ${w}</span>` : null; }).filter(Boolean);
  const gifts = PATH_KEYS.flatMap(k => PATHS[k].gifts.slice(0, pathAt(k)));
  if (soul.arts.size) gifts.push(`Body arts, for a body with no mana: ${ART_FOR_STEP.filter(a => soul.arts.has(a)).map(a => ARTS[a].name).join(', ')}.`);
  return `<span class="lbl">Your feet · the roads you walk</span><div class="stats">${lines.length ? lines.join('') : '<span>No road is worn yet. Roads are walked by what you do, never by what you say.</span>'}</div>${gifts.length ? `<span class="lbl">What the roads have given you</span><div class="stats">${gifts.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}`;
}
/* body arts: for a body born with no mana, on keys 1 to 4, paid with stamina */
const ARTS = {
  breath: { name: 'Breath strike', short: 'BREATH', st: 30, cd: 2.2, what: 'A short lunge and an open palm, driven by the whole breath. Small damage, but it breaks poise three times as fast as a blade and throws foes back.' },
  iron: { name: 'Iron stance', short: 'IRON', st: 35, cd: 7, what: 'Root yourself for a moment and a half: blows lose 80% of their force and cannot knock you back. You cannot walk while rooted.' },
  emptystep: { name: 'Empty step', short: 'STEP', st: 40, cd: 5, what: 'Step through your enemies like wind through grass: nothing touches you while you pass, and every foe you pass through is struck.' },
};
const ART_FOR_STEP = ['breath', 'iron', 'emptystep'];
function putArt(a) { const id = 'art:' + a; if (P.wordSlots.includes(id)) return; const i = P.wordSlots.indexOf(null); if (i >= 0) P.wordSlots[i] = id; }
function useArt(a) {
  const A = ARTS[a]; if (!A || !P.noMana || !soul.arts.has(a) || P.dead || mode !== 'play') return;
  if (P.artCd[a] > 0) { floater(pcx(), P.y - 30, `${A.name.toUpperCase()} RESTS · ${P.artCd[a].toFixed(1)}s`, PENCIL); return; }
  if (P.mount || P.inWater) { floater(pcx(), P.y - 30, 'NOT HERE', PENCIL); return; }
  if (P.st <= 0) { floater(pcx(), P.y - 30, 'NO STAMINA', PENCIL); return; }
  if (P.hitT > 0 || P.rollT > 0) return;
  faceAim(); spend(A.st); P.artCd[a] = A.cd; P.unseenT = 0; P.atk = null; P.charging = false;
  const dmg = (a === 'breath' ? 16 : 18) * P.dmgMul * (1 + boonV('dmg'));
  if (a === 'breath') {
    P.rollT = 0.12; P.rollIF = 0; P.rollV = 420;
    for (const f of foes) { if (!f.alive || f.hidden || f.state === 'kneel') continue; const dx = (f.x + f.w / 2 - pcx()) * P.face; if (dx < -10 || dx > 115 || Math.abs(f.y + f.h / 2 - (P.y + P.h / 2)) > 70) continue; hurtFoe(f, dmg, true, { poiseMul: 3, knock: 440, stun: 0.9, melee: true }); }
    shake = 6; for (let i = 0; i < 3; i++) fx.push({ k: 'ring', x: pcx() + P.face * (40 + i * 22), y: P.y + 24, life: 0.25 }); tone(180, 90, 0.25, 'triangle', 0.06);
  }
  if (a === 'iron') { P.ironT = 1.5; P.vx = 0; tone(90, 70, 0.4, 'square', 0.04); burst(pcx(), P.y + P.h, 10, INK2, 120); }
  if (a === 'emptystep') { P.rollT = 0.32; P.rollIF = 0.36; P.rollV = 820; P.stepT = 0.34; P.stepHit = new Set(); P.stepDmg = dmg; tone(900, 300, 0.3, 'sine', 0.04); }
  floater(pcx(), P.y - 34, A.name.toUpperCase());
}
function tickArts(dt) {
  if (!P.artCd) return; for (const k in P.artCd) if (P.artCd[k] > 0) P.artCd[k] = Math.max(0, P.artCd[k] - dt);
  if (P.ironT > 0) P.ironT = Math.max(0, P.ironT - dt);
  if (P.stepT > 0) {
    P.stepT -= dt; const box = { x: P.x - 14, y: P.y - 10, w: P.w + 28, h: P.h + 20 };
    for (let i = 0; i < 2; i++) fx.push({ k: 'leaf', x: pcx() - P.face * rnd(0, 30), y: P.y + rnd(4, P.h), vx: -P.face * rnd(20, 80), vy: -rnd(0, 30), life: 0.4 });
    for (const f of foes) { if (!f.alive || f.hidden || f.state === 'kneel' || P.stepHit.has(f)) continue; if (overlap(box, f)) { P.stepHit.add(f); hurtFoe(f, P.stepDmg, false, { knock: 200, stun: 0.5, melee: true }); } }
  }
}
/* the teacher, in the shade of the overhang by the pool shrine */
const TEACHER = LEVEL.people.teacher;
const TASKS = [
  { ask: 'Bring me one lotus petal from the flowers on the road. Not for me: for the shrine.', can: () => P.mats.petal >= 1, pay: () => { P.mats.petal--; }, not: 'You carry no petal.' },
  { ask: 'There is a hungry dog by the village. Feed it, in this life, and come back to me.', can: () => !!life.fedDog, not: 'The dog is still hungry in this life.' },
  { ask: 'Sit in deep stillness at any shrine, and come back to me.', can: () => !!life.deepMed, not: 'You have not sat in deep stillness in this life.' },
  { ask: 'Leave thirty seeds with me. I will give them to the poor of the village.', can: () => P.seeds >= 30, pay: () => { P.seeds -= 30; }, not: 'You carry fewer than thirty seeds.' },
  { ask: 'Spare one who begs you for mercy, and come back.', can: () => life.deeds.some(d => d.kind === 'mercy'), not: 'You have not spared anyone in this life.' },
];
const nearTeacher = () => Math.abs(pcx() - TEACHER.x) < 60 && Math.abs(P.y + P.h - TEACHER.gy) < 40;
function teacherLine(T) {
  if (T.since < life.n && !life.metTeacher) return 'You have a new face. I know you anyway.';
  if (T.served >= 6) return 'You serve as if no one were watching. That is the whole of it.';
  if (T.served >= 3) return 'You come back. That is most of the teaching.';
  return 'Small things, done fully. That is how the road is walked.';
}
function openTeacher() {
  banner = null; mode = 'ask'; clearHeld(); const T = soul.teacher;
  if (!T) {
    $('gearIn').innerHTML = `<span class="eyebrow">By the pool shrine, in the shade of the rock</span><h2>A teacher sits here</h2>
      <p class="hand">“I can walk beside you, if you will serve. I will ask small things. In return, you will not walk this wheel without a friend.”</p>
      <p>Hear this first: one who bows to a teacher never walks the road alone again. Not in this life, and not in any life after.${soul.paths.alone ? ' What the road walked alone has given you so far will be gone.' : ''}</p>
      <div class="choices"><button class="choice" type="button" id="teBow"><b>Bow, and serve</b><span>The road of love opens. The road walked alone closes for this soul, for good.</span></button><button class="choice" type="button" id="teGo"><b>Walk on alone</b><span>Nothing is lost. The teacher will still be here.</span></button></div>`;
  } else {
    const task = TASKS[T.task % TASKS.length], done = task.can(), tired = (life.served || 0) >= 2;
    $('gearIn').innerHTML = `<span class="eyebrow">Your teacher · you have served ${T.served} time${T.served === 1 ? '' : 's'}</span><h2>${tired ? '“Enough for this life.”' : `“${esc(task.ask)}”`}</h2>
      <p class="hand">${tired ? 'Go and live it. Come back to me in another body; I will know you.' : esc(teacherLine(T))}</p>
      <div class="choices">${tired ? '' : `<button class="choice" type="button" id="teDone"${done ? '' : ' disabled'}><b>${done ? 'It is done' : 'Not done yet'}</b><span>${done ? 'Tell your teacher.' : esc(task.not)}</span></button>`}<button class="choice" type="button" id="teGo"><b>Go</b></button></div>`;
    life.metTeacher = true;
  }
  $('ovGear').hidden = false;
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('teGo', () => closePanel());
  on('teBow', () => { soul.teacher = { task: 0, served: 0, since: life.n }; soul.aloneClosed = true; life.metTeacher = true; applyStats(false); P.stMax = Math.min(P.stMax, P.stBase); closePanel(); walk('bhakti', 1);
    showBanner({ t: 5.5, top: 'YOU BOWED', sub: 'The teacher smiles and says nothing for a long while. The road of love opens under your feet; the road walked alone closes behind you, for this soul, for good. Come back when you want to serve.' }); SFX.relic(); });
  on('teDone', () => { const task = TASKS[T.task % TASKS.length]; if (!task.can()) return; if (task.pay) task.pay(); T.served++; T.task++; life.served = (life.served || 0) + 1; closePanel(); walk('bhakti', 2);
    floater(TEACHER.x, TEACHER.gy - 90, 'YOUR TEACHER NODS', INK2); for (let i = 0; i < 3; i++) fx.push({ k: 'ring', big: i === 0, x: pcx(), y: P.y + P.h - i * 16, life: 0.35 }); tone(523, 659, 0.5, 'sine', 0.03); });
}
/* the seat of clear seeing: inside the false wall near the End shrine, only for those who see clearly */
const SEAT = LEVEL.places.seat;
const seatShown = () => pathAt('jnana') >= 3;
const nearSeat = () => seatShown() && Math.abs(pcx() - SEAT.x) < 34 && Math.abs(P.y + P.h - SEAT.gy) < 40;
/* ---------- mana, schools and the way of play, read from the chart (Phase 3) ----------
   The chart already sets how much mana a body has, its school and its way. Here each school gets its own
   signature, mana grows a little with stillness and realization and swells under a full Moon, and the way of
   play matters: a Sovereign is stronger alone, a Sangha stronger with others, a Balanced body a little of both.
   Until co-op, "others" are the beings you call and the shade of a past life fighting beside you. */
const SCHOOLS = {
  Agni: { el: 'Fire', planet: 'Mars', style: 'attack and burning', sig: 'Ignite hits 25% harder, and burning ground cannot hurt you.' },
  Jala: { el: 'Water', planet: 'Venus', style: 'healing, flow and illusion', sig: 'Restore heals 40% more, and your lotus heals 15% more.' },
  Vayu: { el: 'Air', planet: 'Saturn', style: 'speed, movement and wind', sig: 'Rolls cost 30% less stamina, and you walk 8% faster.' },
  Prithvi: { el: 'Earth', planet: 'Mercury', style: 'shields, stone and the ground', sig: 'Shield lasts twice as long, and every blow you take is 5% lighter.' },
  Akasha: { el: 'Ether', planet: 'Jupiter', style: 'sound, space and time; the rarest', sig: 'Mana returns 50% faster, and your spells grow in rank half again as fast.' },
};
const SCHOOL_ALL = 'Spells of your own school cost 20% less and hit 15% harder. Spells of other schools cost 25% more.';
const WAYS = {
  Sovereign: { short: 'stronger alone', alone: ['10% more damage', 'one more prana in this life', 'wider senses: you feel foes beyond what you can see'], together: [], from: 'a strong 1st and 10th house, with a strong Sun or Mars' },
  Sangha: { short: 'stronger with others', alone: [], together: ['beings you call stay 40% longer and strike 25% harder', 'while someone fights beside you, your blows land 10% harder and your wounds slowly close', 'bonds grow faster: the road of love is walked half again as fast'], from: 'a strong 7th and 11th house, the houses of partners and friends' },
  Balanced: { short: 'strong either way', alone: ['5% more damage'], together: ['beings you call stay 20% longer'], from: 'neither side of the chart outweighs the other' },
};
const wayOf = () => (life && life.birth && WAYS[life.birth.style]) ? life.birth.style : 'Balanced';
const companions = () => SUMMONS.filter(s => s.t > 0).length + (ALLY ? 1 : 0);
const aloneNow = () => companions() === 0;
function wayBoon(k) {
  if (!P || !life) return 0; const w = wayOf(), alone = aloneNow();
  if (k === 'dmg') return w === 'Sovereign' ? (alone ? 0.10 : 0) : w === 'Balanced' ? (alone ? 0.05 : 0) : (alone ? 0 : 0.10);
  return 0;
}
function schoolBoon(k) {
  if (!P || !P.school || P.noMana) return 0;
  if (k === 'heal' && P.school === 'Jala') return 0.15;
  if (k === 'prot' && P.school === 'Prithvi') return 0.05;
  return 0;
}
const summonLast = () => ({ Sangha: 1.4, Balanced: 1.2 })[wayOf()] || 1;
const summonPow = () => wayOf() === 'Sangha' ? 1.25 : 1;
let moonTest = null;
const moonIllum = () => moonTest !== null ? moonTest : (skyState().illum || 0);
const moonRegen = () => moonIllum() >= 0.85 ? 1.25 : 1;
// a body with no mana is the empty one: it is strongest under a dark sky
const moonStamina = () => P && P.noMana && moonIllum() <= 0.15 ? 1.25 : 1;
// and stillness grows its stamina instead (up to +15 a body), the first realization +8 for every such body after
const staminaGrowth = () => P && P.noMana ? (life && life.medSt || 0) + (soul.realized && soul.realized.has('mind') ? 8 : 0) : 0;
// mana grows a little with each deep stillness (up to +10 a body) and with the first realization (+5 every body)
const manaGrowth = () => (life && life.medMana || 0) + (soul.realized && soul.realized.has('mind') ? 5 : 0);
function tickWay(dt) {
  if (wayOf() === 'Sangha' && !aloneNow() && !P.dead && P.hp < P.hpMax) P.hp = Math.min(P.hpMax, P.hp + 2 * dt);
}
const pct = v => `${Math.round(v * 100)}%`;
function bodyHTML() {
  const b = life.birth, why = b.why, w = wayOf(), Wd = WAYS[w], alone = aloneNow(), sc = P.school && SCHOOLS[P.school];
  const manaLines = P.noMana && !P.spark ? `<span>This body was born with no mana. It is its own way, not a weaker one: more stamina and damage, scrolls, body arts, and weapons only it can hold.</span>`
    : `<span>${b.tierName} mana · ${P.manaMax} at most${manaGrowth() ? ` (stillness and realization have added ${manaGrowth()})` : ''}${P.spark ? ' · a spark woke in this body' : ''}.</span>`;
  const reasons = why && why.mana ? why.mana.filter(r => r[1] > 0.05).sort((x, y) => y[1] - x[1]).map(r => `<span>${esc(r[0])}${r[1] >= 1 ? ' · a large part' : r[1] >= 0.5 ? ' · a fair part' : ' · a small part'}</span>`).join('') : '<span>This body\'s chart could not be read in detail.</span>';
  const nextTier = why && why.next !== null && why.next !== undefined && b.tier < 4 ? `<span class="m">A little more light in the chart and this body would have reached ${['Low', 'Medium', 'High', 'Great'][b.tier]} mana.</span>` : '';
  const schoolBox = sc ? `<span><b>${P.school}</b> · ${sc.el} · ${esc(sc.style)}</span><span>${esc(sc.sig)}</span><span>${esc(SCHOOL_ALL)}</span>${why && why.schools ? `<span class="m">Chosen by the strongest of the element planets: ${esc(why.schools[0].where)}. Next strongest: ${esc(why.schools[1].id)} (${esc(why.schools[1].where)}).</span>` : ''}` : '<span>No school: a body without mana belongs to none.</span>';
  const moon = moonIllum(), empty = P.noMana && !P.spark;
  const moonLine = empty ? `<span>Tonight's Moon is ${pct(moon)} full where you are${moonStamina() > 1 ? ': new, or nearly. A body with no mana is the empty one, and it is strongest under a dark sky: stamina returns 25% faster.' : '. A body with no mana is strongest under a dark sky: near the new Moon, stamina returns 25% faster.'}</span>`
    : `<span>Tonight's Moon is ${pct(moon)} full where you are${moonRegen() > 1 ? ': full, so mana returns 25% faster for everyone who has it.' : '. When it is full, mana returns 25% faster for everyone who has it.'}</span>`;
  const growLine = empty ? `<span>Each deep stillness grows this body's stamina a little (up to 15 more${life.medSt ? `; ${life.medSt} so far` : ''}); the first realization adds 8 to every body with no mana after.</span>`
    : `<span>Each deep stillness grows this body's mana a little (up to 10 more); the first realization adds 5 to every body after.</span>`;
  const wayList = (arr, on) => arr.map(t => `<span>${on ? '● ' : '○ '}${esc(t)}</span>`).join('');
  const sw = why && why.social ? `<span class="m">Partners and friends: ${esc(why.social.groupSays)}. Self and deeds: ${esc(why.social.soloSays)}.</span>` : '';
  return `<div class="gear"><div class="gcol">
      <span class="lbl">This body · born ${esc(b.local)} in ${esc(b.place)} · ${esc(b.lagna)} lagna</span>
      <span class="lbl">${empty ? 'No mana · what the chart gave instead' : 'Mana · what the chart gave'}</span><div class="stats">${manaLines}${P.noMana && !P.spark ? '' : reasons}${P.noMana ? '' : nextTier}</div>
      <span class="lbl">The sky now</span><div class="stats">${moonLine}${growLine}</div>
      ${empty ? `<span class="lbl">In place of a school</span><div class="stats"><span>No school: a body without mana belongs to none. In its place: chants it can still say (five prepared, not three), scrolls, body arts on the road of right action, the Forest Kin who answer only it, and the Empty edge and Empty longbow.</span></div></div>` : `<span class="lbl">School</span><div class="stats">${schoolBox}</div></div>`}
    <div class="gcol"><span class="lbl">Way of play · ${w}: ${Wd.short}</span><div class="stats"><span>From the chart: ${esc(Wd.from)}.</span>${sw}
      <span>Right now you are ${alone ? 'alone' : `with ${companions()} beside you`}.</span></div>
      ${Wd.alone.length ? `<span class="lbl">Alone${alone ? ' · now' : ''}</span><div class="stats">${wayList(Wd.alone, alone)}</div>` : ''}
      ${Wd.together.length ? `<span class="lbl">With others${alone ? '' : ' · now'}</span><div class="stats">${wayList(Wd.together, !alone)}</div>` : ''}
      <p class="note">Until co-op comes, the others are the beings you call with chants and the shade of a past life (Echo). Playing together with friends, guiding them as a Sovereign, and matching charts come with co-op.</p></div></div>`;
}

/* ---------- saving (build 22) ----------
   Souls-like: one save per soul, written on its own (no save to reload). Three soul slots on this device.
   It saves when you rest, fall, die, are born, beat a boss, do a deed that counts, close a panel, every 20
   seconds of play, and when the page is hidden or closed. Coming back, you wake at the last shrine you
   rested at, with what you carried; foes return as after a rest, and a fight in progress starts over.
   A death is saved the moment it happens, with the births on offer, so leaving the page cannot undo it.
   The real birth is only kept in a save when the player chose to keep it (this device, or later Steam Cloud). */
const BUILD = 25, SAVE_V = 1, SLOTS = 3, SLOT_KEY = i => `samsara.soul.${i}`;
let slot = null, saveT = 0, saveClock = 0, savedFx = 0, saveFail = false;
// automated tests never write saves unless they ask to
const canWrite = () => { try { return !navigator.webdriver || localStorage.getItem('samsara.testSave') === '1'; } catch (_) { return false; } };
const P_SKIP = ['groundS', 'hang', 'ladder', 'climb', 'atk', 'stepHit', 'charging', 'chargeSrc', 'mDown', 'bufLight'];
const packJSON = o => JSON.stringify(o, (k, v) => v instanceof Set ? { $set: [...v] } : v);
const unpackJSON = t => JSON.parse(t, (k, v) => v && typeof v === 'object' && Array.isArray(v.$set) && Object.keys(v).length === 1 ? new Set(v.$set) : v);
const keepsBirth = () => { const st = (soul.self && soul.self.store) || (SELF && SELF.store); return st === 'device' || st === 'cloud'; };
function redactBirth(b) {
  if (!b || !b.real) return b;
  return { ...b, kept: false, ms: null, geo: null, place: 'a place not kept', local: 'a birth not kept', offset: '', chart: null, lagnaWindow: null, moonNote: '', sun: null, moon: 'not kept', lagna: 'not kept', age: null };
}
function snapshot() {
  const keep = keepsBirth();
  const s = { ...soul, lives: soul.lives.map(l => keep ? l : { ...l, birth: redactBirth(l.birth) }), self: keep ? soul.self : null };
  const p = {}; for (const k in P) if (!P_SKIP.includes(k)) p[k] = P[k];
  const world = { villager: { helped: villager.helped, idx: villager.idx }, horse: { ...horse }, chests: CHESTS.map(c => ({ opened: c.opened, inv: c.inv })), pots: pots.map(q => q.broken), fakes: FAKES.map(f => f.found), shades };
  return { v: SAVE_V, build: BUILD, at: Date.now(), summary: { name: soul.name, mark: soul.mark, life: life.n, lives: soul.lives.length, level: levelOf(), shrine: SHRINES[P.shrine || 0].name, dead: !!soul.pending }, soul: s, P: p, world };
}
function saveNow() {
  if (slot === null || !life || !P || !canWrite()) return false;
  try { localStorage.setItem(SLOT_KEY(slot), packJSON(snapshot())); savedFx = 1.6; saveFail = false; return true; }
  catch (e) { if (!saveFail) { saveFail = true; showBanner({ t: 5, top: 'COULD NOT SAVE', sub: 'This browser would not keep your soul (storage may be full or blocked). Export it from the title screen to keep a copy.' }); } return false; }
}
const saveSoon = () => { saveT = saveT > 0 ? Math.min(saveT, 1) : 1; };
function tickSave(dt) {
  if (savedFx > 0) savedFx -= dt;
  if (slot === null || mode === 'start' || mode === 'create') return;
  if (saveT > 0) { saveT -= dt; if (saveT <= 0) saveNow(); }
  if (mode === 'play') { saveClock += dt; if (saveClock >= 20) { saveClock = 0; saveNow(); } }
}
function readSlot(i) { try { const raw = localStorage.getItem(SLOT_KEY(i)); return raw ? unpackJSON(raw) : null; } catch (_) { return null; } }
const freeSlot = () => { for (let i = 0; i < SLOTS; i++) if (!readSlot(i)) return i; return -1; };
// a new soul in the first free slot: a clean wheel
function freshSoul(i) {
  for (const k of Object.keys(soul)) delete soul[k]; Object.assign(soul, SOUL0());
  villager.helped = false; villager.idx = undefined; villager.talkT = 0; colorK = 0; slot = i; saveFail = false;
}
function loadSoul(i) {
  const S = readSlot(i); if (!S || !S.soul || !S.P) return false;
  for (const k of Object.keys(soul)) delete soul[k]; Object.assign(soul, SOUL0(), S.soul);
  if (!(soul.lives && soul.lives.length)) return false;
  slot = i; life = soul.lives[soul.lives.length - 1];
  P = makeP(life.birth); Object.assign(P, S.P);
  const W0 = S.world || {};
  if (W0.villager) { villager.helped = !!W0.villager.helped; villager.idx = W0.villager.idx; }
  newHorse(); if (W0.horse) Object.assign(horse, W0.horse); if (horse.state === 'ridden') horse.state = 'away';
  CHESTS.forEach((c, j) => { const w = (W0.chests || [])[j]; if (w) { c.opened = w.opened; c.inv = w.inv || emptyInv(); } });
  pots = POT_SPOTS.map(([x, gy, seeds], j) => ({ x, gy, seeds, broken: !!(W0.pots || [])[j] }));
  FAKES.forEach((f, j) => { f.found = !!(W0.fakes || [])[j]; });
  shades = W0.shades || [];
  TEMPS = []; RAINS = []; ALLY = null; CHS = null; SUMMONS = []; ECHO_HITS = []; WAVES = []; WISPS = []; BQ = []; drops = []; shots = []; fx = []; floaters = [];
  resetNodes(); resetCrumbles(); spawnFoes();
  colorK = realized('mind') ? 1 : 0;
  // you wake at the last shrine you rested at, with what you carried
  const sh = SHRINES[P.shrine || 0];
  Object.assign(P, { fallTop: null, x: sh.x + 40, y: sh.gy - PH, h: PH, w: 22, vx: 0, vy: 0, mount: false, hang: null, ladder: null, climb: null, climbT: 0, atk: null, charging: false, rollT: 0, rollIF: 0, healT: 0, hitT: 0, inv: 1, glide: false, plunge: false, cling: 0, inWater: false, headUnder: false, breath: BREATH, stepT: 0, ironT: 0 });
  P.torch = Object.assign({ fuel: P.torchMax, lit: false }, P.torch, { lit: false });
  snapCam(); renderLives(); $('lifeLabel').textContent = `Life ${life.n}`;
  if (soul.pending) { P.dead = true; showDeath(soul.pending); return true; }
  mode = 'play';
  if (P.dead) { pendingDeath = 0.05; return true; }   // left while falling: the fall still counts
  banner = { t: 3.6, top: `LIFE ${life.n}${soul.name ? ' · ' + soul.name.toUpperCase() : ''}`, sub: `You wake at the ${sh.name.toLowerCase()}, with what you carried. ${soul.lives.length > 1 ? `This soul has lived ${soul.lives.length} lives.` : 'This is its first life.'}` };
  return true;
}
function exportSoul(i) {
  const S = readSlot(i); if (!S) return;
  const name = (S.summary && S.summary.name ? S.summary.name : `soul-${i + 1}`).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const blob = new Blob([localStorage.getItem(SLOT_KEY(i))], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `samsara-${name}-life-${S.summary ? S.summary.life : 1}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importSoul(text) {
  let S; try { S = unpackJSON(text); } catch (_) { return 'That file is not a Samsara soul.'; }
  if (!S || !S.soul || !S.P || !S.v) return 'That file is not a Samsara soul.';
  if (S.v > SAVE_V) return 'That soul comes from a newer build of the game.';
  const i = freeSlot(); if (i < 0) return 'All three soul slots are full. Let one go first.';
  try { localStorage.setItem(SLOT_KEY(i), text); } catch (_) { return 'This browser would not keep it.'; }
  return null;
}
let delArm = null;
function renderSlots(msg) {
  const el = $('slots'); if (!el) return;
  const rows = [];
  for (let i = 0; i < SLOTS; i++) {
    const S = readSlot(i), m = S && S.summary;
    rows.push(m ? `<div class="slotcard"><div><b>${esc(m.name || `Soul ${i + 1}`)}</b><span>Life ${m.life}${m.lives > 1 ? ` · ${m.lives} lives lived` : ''} · level ${m.level} · ${m.dead ? 'between lives' : esc(m.shrine)}</span><span class="m">Last played ${new Date(S.at).toLocaleString()}${S.build ? ` · build ${S.build}` : ''}</span></div>
      <div class="row"><button class="btn sm" type="button" data-cont="${i}">Continue</button><button class="btn ghost sm" type="button" data-exp="${i}">Export</button><button class="btn ghost sm" type="button" data-del="${i}">${delArm === i ? 'Press again to let it go' : 'Let it go'}</button></div></div>`
      : `<div class="slotcard empty"><div><b>Empty</b><span>A new soul begins here.</span></div></div>`);
  }
  const full = freeSlot() < 0;
  el.innerHTML = `<span class="lbl">Your souls · saved on this device, on their own</span>${rows.join('')}
    <div class="row"><button class="btn ghost sm" type="button" id="btnImport">Bring a soul from a file</button><input type="file" id="importFile" accept=".json,application/json" hidden></div>
    ${full ? '<p class="note">All three slots hold a soul. Let one go to begin a new one.</p>' : ''}${msg ? `<p class="note">${esc(msg)}</p>` : ''}`;
  $('btnBegin').disabled = full; $('btnQuick').disabled = full;
  el.querySelectorAll('[data-cont]').forEach(b => b.addEventListener('click', () => { startPlay(() => loadSoul(+b.dataset.cont)); }));
  el.querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', () => exportSoul(+b.dataset.exp)));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.del; if (delArm === i) { try { localStorage.removeItem(SLOT_KEY(i)); } catch (_) {} delArm = null; renderSlots('The soul was let go.'); } else { delArm = i; renderSlots(); } }));
  $('btnImport').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { const err = importSoul(t); renderSlots(err || 'The soul is here. Press Continue.'); }); });
}
function startPlay(go) {
  if (MC) { try { MC.stop(); } catch (_) {} MC = null; }
  setMicMode($('micStart').value); $('ovStart').hidden = true;
  const ok = go(); if (ok === false) { $('ovStart').hidden = false; renderSlots('That soul could not be read.'); return; }
  if (micMode === 'always') startRec();
  tone(330, 660, 0.3, 'sine', 0.04);
}
function toTitle() {
  saveNow(); stopRec(); mode = 'start'; $('ovPause').hidden = true; $('ovGear').hidden = true; $('ovDeath').hidden = true; banner = null; BQ = [];
  delArm = null; renderSlots('Your soul is saved.'); $('ovStart').hidden = false;
}
addEventListener('pagehide', () => { saveNow(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

/* ---------- effects ---------- */
function floater(x, y, t, c = INK) { floaters.push({ x, y, t, c, life: 1.2 }); }
function burst(x, y, n, c = INK, spd = 260) { for (let i = 0; i < n; i++) fx.push({ k: 'dot', x, y, vx: rnd(-1, 1) * spd, vy: -rnd(40, spd * 1.2), life: rnd(0.3, 0.8), c }); }
function puff(x, y) { fx.push({ k: 'ring', x, y, life: 0.3 }); for (let i = 0; i < 6; i++) fx.push({ k: 'dot', x: x + rnd(-10, 10), y, vx: rnd(-80, 80), vy: rnd(10, 60), life: 0.3, c: PENCIL }); }

/* ---------- relics ---------- */
function pickRelic(id) {
  P.relics.add(id); if (RELICS[id].soul) soul.soulRelics.add(id);
  const free = P.equip.indexOf(null);
  if (free >= 0) P.equip[free] = id;
  SFX.relic(); burst(pcx(), P.y + 10, 18, INK2, 200);
  banner = { t: 3.4, top: RELICS[id].name.toUpperCase(), sub: RELICS[id].what + (free >= 0 ? ' (Tab to change relics)' : ' Your 4 relic slots are full: swap one in Tab.') };
}

/* ---------- player ---------- */
const WEAPONS = [
  { id: 'blade', name: 'Blade', weight: 3, perk: 'Balanced. Quick cuts, short reach.', light: { dmg: 12, st: 14, dur: 0.30, a0: 0.08, a1: 0.17, reach: 50 }, heavy: { dmg: 30, st: 30, dur: 0.5, a0: 0.18, a1: 0.3, reach: 60 } },
  { id: 'mace', name: 'Mace', weight: 7, perk: 'Slow, heavy blows. Foes stay stunned much longer.', light: { dmg: 22, st: 24, dur: 0.52, a0: 0.24, a1: 0.34, reach: 58, stun: 1.0 }, heavy: { dmg: 52, st: 42, dur: 0.75, a0: 0.36, a1: 0.5, reach: 68, stun: 1.6 } },
  { id: 'bow', name: 'Bow', bow: true, weight: 2, perk: 'Aim with the mouse. Hold to draw a stronger shot.', light: { dmg: 10, st: 10, dur: 0.32, speed: 950 }, heavy: { dmg: 22, st: 22, dur: 0.4, speed: 1350 } },
  { id: 'spear', name: 'Spear', weight: 4, perk: 'The longest reach. The heavy thrust lunges forward. From a galloping horse it hits far harder.', light: { dmg: 15, st: 16, dur: 0.38, a0: 0.12, a1: 0.2, reach: 86, thrust: true }, heavy: { dmg: 34, st: 32, dur: 0.6, a0: 0.22, a1: 0.36, reach: 96, thrust: true, lunge: 420 } },
  { id: 'staff', name: 'Staff', weight: 2, perk: 'Hits in front and behind. The heavy spin throws foes away. Mana returns 50% faster while you hold it (in a body with no mana, stamina returns 25% faster).', light: { dmg: 10, st: 12, dur: 0.34, a0: 0.1, a1: 0.2, reach: 60, both: true }, heavy: { dmg: 22, st: 26, dur: 0.62, a0: 0.16, a1: 0.46, reach: 72, both: true, spin: true, knock: 460 } },
  { id: 'daggers', name: 'Twin daggers', weight: 1.5, perk: 'Very fast. Every third cut hits twice as hard. Hits from behind do 2.5 times the damage. Rolls cost less.', light: { dmg: 7, st: 8, dur: 0.2, a0: 0.04, a1: 0.11, reach: 42 }, heavy: { dmg: 7, st: 24, dur: 0.55, a0: 0.08, a1: 0.48, reach: 46, multi: 0.1 } },
  { id: 'empty', name: 'Empty edge', nomana: true, weight: 3, perk: 'Only a body born with no mana can hold it. Against bosses it cuts 40% deeper and breaks their poise twice as fast. Chant blessings on it last half as long again.', light: { dmg: 13, st: 13, dur: 0.30, a0: 0.08, a1: 0.17, reach: 54 }, heavy: { dmg: 32, st: 30, dur: 0.5, a0: 0.18, a1: 0.3, reach: 64 } },
  { id: 'longbow', name: 'Empty longbow', nomana: true, bow: true, long: true, weight: 3, perk: 'Only a body born with no mana can draw it. Hold longer for a full draw that flies flat and passes through foes. It shoots four kinds of arrow (R picks): reed, iron, ember and ink.', light: { dmg: 13, st: 12, dur: 0.42, speed: 1100 }, heavy: { dmg: 30, st: 26, dur: 0.5, speed: 1650 } },
];
const GARB = {
  hat: { slot: 'head', name: 'Straw hat', prot: 2, weight: 0.5, what: 'Light. Keeps the sun off.' },
  helm: { slot: 'head', name: 'Iron helm', prot: 10, weight: 3, what: 'Solid protection for the head.' },
  band: { slot: 'head', name: 'Focus band', prot: 1, weight: 0.3, what: '15 more stamina.' },
  wrap: { slot: 'body', name: 'Cloth wrap', prot: 4, weight: 1, what: 'What you were born into.' },
  leather: { slot: 'body', name: 'Leather jerkin', prot: 14, weight: 4, what: 'Good protection, still light.' },
  mail: { slot: 'body', name: 'Iron mail', prot: 28, weight: 9, what: 'Heavy protection. You sink in water.' },
  robe: { slot: 'body', name: 'Monk robe', prot: 5, weight: 1.5, what: 'Mana returns 50% faster (in a body with no mana, stamina returns 25% faster).' },
  sandals: { slot: 'feet', name: 'Sandals', prot: 1, weight: 0.3, what: 'Barely there.' },
  boots: { slot: 'feet', name: 'Marsh boots', prot: 5, weight: 2, what: 'Mud barely slows you.' },
  cleats: { slot: 'feet', name: 'Ice cleats', prot: 3, weight: 1, what: 'You grip on ice.' },
};
const SLOT_NAMES = { head: 'Head', body: 'Body', feet: 'Feet' };
const LOADS = { light: { roll: 440, dur: 0.34, iF: 0.26, st: 0.9, walk: 1, say: 'Light: long, fast rolls' }, medium: { roll: 380, dur: 0.36, iF: 0.24, st: 1, walk: 1, say: 'Medium: normal rolls' }, heavy: { roll: 300, dur: 0.42, iF: 0.18, st: 1.3, walk: 0.92, say: 'Heavy: short, slow rolls that cost more' }, over: { roll: 0, dur: 0, iF: 0, st: 0, walk: 0.75, say: 'Too heavy: you cannot roll and you walk slowly' } };
function loadNow() { const w = P.slots.reduce((a, i) => a + WEAPONS[i].weight, 0) + ['head', 'body', 'feet'].reduce((a, k) => a + (P.garb[k] ? GARB[P.garb[k]].weight : 0), 0), r = w / P.loadMax; const pk = packWeight(), full = pk > P.packMax + 1e-9; const cls = full ? 'over' : r <= 0.35 ? 'light' : r <= 0.7 ? 'medium' : r <= 1 ? 'heavy' : 'over'; return Object.assign({ w, r, cls, pack: pk, full }, LOADS[cls], full ? { say: 'Your pack is too full: you cannot roll and you walk slowly. Leave something in a chest.' } : {}); }
const protNow = () => ['head', 'body', 'feet'].reduce((a, k) => a + (P.garb[k] ? GARB[P.garb[k]].prot : 0), 0) + Math.round(boonV('prot') * 100);
const LEVEL_COST = lv => Math.round(50 * Math.pow(1.15, lv - 1));
const levelOf = () => 1 + Object.keys(P.stats).reduce((a, k) => a + P.stats[k] - P.stats0[k], 0);
function applyStats(fill) {
  const s = P.stats, oldHp = P.hpMax || 100, oldMana = P.manaMax || 0;
  P.hpMax = 100 + (s.vit - 10) * 8;
  P.stBase = (P.noMana ? 125 : 100) + (s.end - 10) * 6 + (pathAt('alone') >= 2 ? 10 : 0) + staminaGrowth();
  P.loadMax = 20 + (s.end - 10) * 2 + (P.skills.has('strong_back') ? 6 : 0);
  P.packMax = 30 + (s.end - 10) * 3 + (P.skills.has('strong_back') ? 6 : 0);
  P.manaMax = P.manaTierMax ? Math.round((P.manaTierMax + (s.foc - 10) * 6 + manaGrowth()) * (pathAt('dhyana') >= 3 ? 1.1 : 1)) : P.spark ? SPARK_MANA : 0;
  if (fill) { P.hp = P.hpMax; P.mana = P.manaMax; P.st = P.stBase; P.stMax = P.stBase; }
  else { P.hp += Math.max(0, P.hpMax - oldHp); P.mana += Math.max(0, P.manaMax - oldMana); }
}
const SCALE = { blade: { str: 0.5, agi: 0.5 }, mace: { str: 1 }, bow: { agi: 1 }, spear: { str: 0.8, agi: 0.2 }, staff: { agi: 0.4, foc: 0.6 }, daggers: { agi: 1 }, empty: { end: 0.6, agi: 0.4 }, longbow: { agi: 0.6, end: 0.4 }, knife: { agi: 1 } };
const TIER_MUL = [1, 1, 1.15, 1.35], TIER_NAME = ['', 'I', 'II', 'III'];
const tierOf = wi => P.wtier[wi] || 1;
function statMul(id) { const sc = SCALE[id] || {}; let m = 1; for (const k in sc) m += 0.04 * sc[k] * (P.stats[k] - 10); return m; }
function wMul(W8) { return statMul(W8.id) * TIER_MUL[tierOf(WEAPONS.indexOf(W8))]; }
function curW() { return WEAPONS[P.slots[P.slotIdx]]; }
function aimVec(sx, sy) { let dx = aimX() - sx, dy = aimY() - sy; if (!mouse.in) { dx = P.face; dy = 0; } const d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
const ARROWS = { reed: { name: 'Reed', what: 'Endless. A full draw passes through two foes.' }, iron: { name: 'Iron', what: 'Hits half again as hard and breaks a boss\'s poise three times as fast. A full draw passes through every foe.' }, ember: { name: 'Ember', what: 'Bursts into fire: foes around it burn.' }, ink: { name: 'Ink', what: 'Pins a foe in place for 2 seconds. A boss only slows.' } };
const ARROW_W = 0.05;
function shootArrow(spec, mult, full) {
  const W8 = curW(), sx = pcx() + P.face * 14, sy = P.y + Math.min(18, P.h * 0.4), [ux, uy] = aimVec(sx, sy), v = spec.speed * (0.8 + 0.2 * mult);
  const s = { arrow: true, x: sx, y: sy, vx: ux * v, vy: uy * v, g: W8.long ? (full ? 120 : 320) : 520, life: W8.long ? 2 : 1.6, dmg: spec.dmg * mult * P.dmgMul * wMul(W8), r: 6, kind: 'reed', pierce: 0, hit: new Set() };
  if (W8.long) {
    let k = P.arrowKind || 'reed'; if (k !== 'reed' && !(P.arrows[k] > 0)) k = 'reed';
    if (k !== 'reed') { P.arrows[k]--; if (!P.arrows[k]) { P.arrowKind = 'reed'; floater(pcx(), P.y - 44, `NO ${ARROWS[k].name.toUpperCase()} ARROWS LEFT`, PENCIL); } }
    s.kind = k; if (full) s.pierce = k === 'iron' ? 99 : k === 'reed' ? 2 : 0;
  }
  shots.push(s); tone(full ? 1200 : 900, 300, full ? 0.14 : 0.08, 'triangle', 0.03);
}
function arrowHit(s, t) {
  if (s.kind === 'iron') { hurtFoe(t, s.dmg * 1.5, true, { poiseMul: 3, knock: 200 }); return; }
  if (s.kind === 'ember') { hurtFoe(t, s.dmg, false); t.burnT = 3; for (const f of foes) if (f !== t && f.alive && f.state !== 'kneel' && !f.hidden && Math.hypot(f.x + f.w / 2 - s.x, f.y + f.h / 2 - s.y) < 80) { hurtFoe(f, s.dmg * 0.5, false); f.burnT = 3; } for (let i = 0; i < 16; i++) fx.push({ k: 'flame', x: s.x + rnd(-20, 20), y: s.y + rnd(-14, 14), vx: rnd(-120, 120), vy: -rnd(30, 140), life: rnd(0.3, 0.6) }); tone(200, 80, 0.3, 'sawtooth', 0.04); return; }
  if (s.kind === 'ink') { hurtFoe(t, s.dmg * 0.7, false); if (t.boss) { t.pinT = 2; floater(t.x + t.w / 2, t.y - 30, 'SLOWED', INK2); } else if (t.alive && t.state !== 'kneel') { t.state = 'stun'; t.t = 2; t.vx = 0; floater(t.x + 12, t.y - 24, 'PINNED', INK2); } for (let i = 0; i < 10; i++) fx.push({ k: 'ink', x: s.x + rnd(-8, 8), y: s.y + rnd(-8, 8), vx: rnd(-40, 40), vy: rnd(-20, 60), life: 0.6 }); return; }
  hurtFoe(t, s.dmg, false);
}
function throwKnife() {
  if (P.knives <= 0) { floater(pcx(), P.y - 20, 'NO KNIVES', PENCIL); return; }
  if (P.knifeCd > 0) return;
  faceAim(); const sx = pcx() + P.face * 10, sy = P.y + Math.min(16, P.h * 0.4), [ux, uy] = aimVec(sx, sy);
  shots.push({ knife: true, x: sx, y: sy, vx: ux * 900, vy: uy * 900, g: 350, life: 3, dmg: 14 * P.dmgMul * statMul('knife'), r: 6, spin: 0 });
  P.knives--; P.knifeCd = 0.3; SFX.throw();
}
function spend(n) { if (P.st <= 0) return false; P.st -= n; P.stDelay = 0.7; return true; }
function lightAttack(W8) {
  P.unseenT = 0;
  spend(W8.light.st);
  if (W8.bow) { shootArrow(W8.light, 1); P.atk = { t: 0, dur: W8.light.dur, a0: 99, a1: 99, bow: true, hit: new Set() }; }
  else {
    P.atk = Object.assign({ t: 0, hit: new Set(), heavy: false }, W8.light, { daggers: W8.id === 'daggers', dmg: W8.light.dmg * wMul(W8) }); SFX.swing();
    if (P.bless && P.bless.el === 'vayu') { const f = 0.72; P.atk.dur *= f; P.atk.a0 *= f; P.atk.a1 *= f; const sx = pcx() + P.face * 24; shots.push({ windcut: true, x: sx, y: P.y + Math.min(20, P.h * 0.5), vx: P.face * 760, vy: 0, life: 0.35, dmg: 6 * P.bless.pow * P.dmgMul, r: 9 }); }
    if (W8.id === 'daggers') { P.combo = P.comboT > 0 ? P.combo % 3 + 1 : 1; P.comboT = W8.light.dur + 0.4; if (P.combo === 3) P.atk.combo3 = true; }
  }
}
function busy() { return (CHS && CHS.state === 'chant') || P.atk || P.rollT > 0 || P.healT > 0 || P.hitT > 0 || P.swapT > 0 || P.dead || P.plunge || P.landT > 0; }
function setH(h) {
  if (P.h === h) return true;
  const ny = P.y + P.h - h;
  if (h > P.h && blocked({ x: P.x, y: ny, w: P.w, h })) return false;
  P.y = ny; P.h = h; return true;
}
function touching(dir) { return blocked({ x: dir > 0 ? P.x + P.w : P.x - 2, y: P.y + 6, w: 2, h: P.h - 12 }); }
function ladderAt() { for (const L of LADDERS) if (P.x + P.w > L.x - 4 && P.x < L.x + L.w + 4 && P.y + P.h > L.y - 6 && P.y < L.y + L.h) return L; return null; }
function tryLedge(dir) {
  const probe = { x: dir > 0 ? P.x + P.w : P.x - 3, y: P.y, w: 3, h: 30 };
  for (const s of SOLIDS) {
    if (!overlap(probe, s) || s.y < P.y - 4 || s.y > P.y + 24 || s.w < P.w + 4) continue;
    const tx = dir > 0 ? s.x + 2 : s.x + s.w - P.w - 2;
    if (blocked({ x: tx, y: s.y - CH, w: P.w, h: CH })) continue;
    const hx = dir > 0 ? s.x - P.w : s.x + s.w, hy = s.y + 2;
    if (blocked({ x: hx, y: hy, w: P.w, h: P.h })) continue;
    P.hang = { s, dir }; P.x = hx; P.y = hy; P.vx = 0; P.vy = 0; P.glide = false; P.jumping = false; P.cling = 0; P.face = dir;
    P.jumpsLeft = has('garuda') ? 1 : 0; SFX.grab(); return true;
  }
  return false;
}
function moveP(dt) {
  P.x = clamp(P.x + P.vx * dt, 0, LW - P.w);
  let hit = blocked(P), g = 0;
  const dx = Math.sign(P.vx);
  while (hit && g++ < 4) {
    if (dx > 0) P.x = hit.x - P.w; else if (dx < 0) P.x = hit.x + hit.w;
    else { const l = P.x + P.w - hit.x, r = hit.x + hit.w - P.x; P.x += l < r ? -l : r; }
    P.vx = 0; hit = blocked(P);
  }
  const prevB = P.y + P.h, dy = Math.sign(P.vy);
  P.y += P.vy * dt; P.onG = false; P.groundS = null;
  hit = blocked(P); g = 0;
  while (hit && g++ < 4) {
    if (dy >= 0) { P.y = hit.y - P.h; P.onG = true; P.groundS = hit; } else P.y = hit.y + hit.h;
    P.vy = 0; hit = blocked(P);
  }
  if (P.vy >= 0 && P.dropT <= 0 && !P.ladder) for (const o of ONEWAYS) {
    if (P.x + P.w > o.x && P.x < o.x + o.w && prevB <= o.y + 2 && P.y + P.h >= o.y) { P.y = o.y - P.h; P.vy = 0; P.onG = true; P.groundS = o; }
  }
}
function updatePlayer(dt) {
  for (const k of ['inv', 'rollIF', 'parryT', 'parryCd', 'shieldT', 'riposte', 'hitT', 'swapT', 'dropT', 'grabCd', 'kickT', 'coy', 'jbuf', 'clingMem', 'knifeCd', 'landT', 'comboT', 'trampleCd']) P[k] = Math.max(0, P[k] - dt);
  P.stMax = P.stBase + (wears('band') ? 15 : 0); P.st = Math.min(P.st, P.stMax);
  if (P.stDelay > 0) P.stDelay -= dt; else P.st = Math.min(P.stMax, P.st + 48 * (P.noMana ? (1 + 0.04 * (P.stats.foc - 10)) * (inHand('staff') ? 1.25 : 1) * (wears('robe') ? 1.25 : 1) * moonStamina() : 1) * (1 + boonV('st')) * dt);
  if (P.manaMax) P.mana = Math.min(P.manaMax, P.mana + (P.school === 'Akasha' ? 6 : 4) * (inHand('staff') ? 1.5 : 1) * (wears('robe') ? 1.5 : 1) * (1 + boonV('mana')) * moonRegen() * dt);
  if (P.torch.lit) { P.torch.fuel -= dt; if (P.torch.fuel <= 0) { P.torch.fuel = 0; P.torch.lit = false; floater(pcx(), P.y - 24, 'THE TORCH BURNS OUT', PENCIL); } }
  if (P.dead) { P.deadT += dt; P.vx *= 0.9; return; }
  const W8 = curW(), mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (held.mouseL) P.mT += dt;
  if (pressed.mouseL) { P.mDown = true; P.mT = 0; }
  if (released.mouseL) { if (P.mDown && !P.charging) P.bufLight = 0.3; P.mDown = false; }
  P.bufLight = Math.max(0, P.bufLight - dt);
  const L = P.mount ? null : ladderAt(), wJump = !L && !P.inWater;
  const jp = pressed.jump || (pressed.up && wJump), jh = held.jump || (held.up && wJump), jr = released.jump || (released.up && wJump);
  if (jp) P.jbuf = 0.12;

  // hanging from a ledge
  if (P.hang) {
    const { s, dir } = P.hang; P.vx = 0; P.vy = 0; P.face = dir;
    if (pressed.up || (pressed.jump && mx !== -dir)) {
      const tx = dir > 0 ? s.x + 2 : s.x + s.w - P.w - 2, th = blocked({ x: tx, y: s.y - PH, w: P.w, h: PH }) ? CH : PH;
      P.climb = { x0: P.x, y0: P.y, x1: tx, y1: s.y - th, h: th }; P.climbT = 0.24; P.hang = null;
    } else if (pressed.down) { P.hang = null; P.grabCd = 0.35; }
    else if (pressed.jump && mx === -dir) { P.hang = null; P.vy = -600; P.vx = -dir * 260; P.face = -dir; P.grabCd = 0.25; P.kickT = 0.12; P.jumping = true; SFX.jump(); }
    return;
  }
  if (P.climbT > 0) {
    P.climbT -= dt; const c = P.climb, k = 1 - Math.max(0, P.climbT) / 0.24;
    P.y = c.y0 + (c.y1 + c.h - PH - c.y0) * Math.min(1, k * 1.6); P.x = c.x0 + (c.x1 - c.x0) * Math.max(0, (k - 0.4) / 0.6);
    if (P.climbT <= 0) { P.climbT = 0; P.x = c.x1; P.h = c.h; P.y = c.y1; P.onG = true; P.vy = 0; }
    return;
  }
  // ladders
  if (!P.ladder && L && P.hitT <= 0 && !P.atk && P.rollT <= 0 && !P.plunge && (pressed.up || (held.up && !P.onG) || (pressed.down && P.onG && P.y + P.h <= L.y + 4))) {
    setH(PH); P.ladder = L; P.vx = 0; P.vy = 0; P.glide = false; P.charging = false; P.x = L.x + L.w / 2 - P.w / 2; if (P.y + P.h <= L.y + 4) P.y += 6;
  }
  if (P.ladder) { ladderStep(dt, mx); afterMove(dt, mx, true); return; }

  if (pressed.chant && !CHS && !P.dead && !P.mount) openChantPick(); else if (CHS) chantStep(dt, mx);
  tickArts(dt); tickWay(dt);
  if (P.healT > 0) { P.healT -= dt; if (P.healT <= 0) { const hv = Math.round(40 * (1 + boonV('heal'))); P.hp = Math.min(P.hpMax, P.hp + hv); floater(pcx(), P.y - 20, `+${hv}`); } }
  if (P.atk) { const A = P.atk; A.t += dt; if (A.t >= A.a0 && A.t <= A.a1) doHits(A); if (A.t >= A.dur) P.atk = null; }
  if (!busy()) {
    if (pressed.roll && P.onG && !P.inWater && P.st > 0 && !P.mount) { const LD = loadNow(); if (LD.cls === 'over') floater(pcx(), P.y - 20, 'TOO HEAVY TO ROLL', PENCIL); else { if (mx) P.face = mx; spend(22 * (P.school === 'Vayu' ? 0.7 : 1) * (inHand('daggers') ? 0.7 : 1) * (P.skills.has('light_feet') ? 0.75 : 1) * LD.st); P.rollT = LD.dur; P.rollIF = LD.iF; P.rollV = LD.roll * (1 + 0.01 * (P.stats.agi - 10)); P.charging = false; P.mDown = false; SFX.roll(); } }
    else if (!P.onG && !P.inWater && !P.mount && held.down && (pressed.mouseL || pressed.light)) { P.plunge = true; P.mDown = false; P.bufLight = 0; P.charging = false; P.vx = 0; P.glide = false; SFX.air(); }
    else if ((pressed.light || P.bufLight > 0) && P.st > 0) { if (P.bufLight > 0) faceAim(); P.bufLight = 0; lightAttack(W8); }
    else if (pressed.heavy && P.st > 0) { P.charging = true; P.charge = 0; P.chargeSrc = 'key'; }
    else if (P.mDown && held.mouseL && P.mT > 0.2 && P.st > 0) { faceAim(); P.charging = true; P.charge = 0; P.chargeSrc = 'mouse'; P.mDown = false; }
    else if (pressed.parry && P.parryCd <= 0 && P.st > 0) { faceAim(); spend(10); P.parryT = has('tortoise') ? 0.32 : 0.2; P.parryCd = 0.55; }
    else if (pressed.heal || pressed.h7) { if (P.lotus > 0) { P.lotus--; P.healT = 1.0; SFX.drink(); } else floater(pcx(), P.y - 20, 'NO LOTUS', PENCIL); }
    else if (pressed.swap) { P.slotIdx = 1 - P.slotIdx; P.swapT = 0.4; floater(pcx(), P.y - 20, curW().name.toUpperCase()); }
    else if (pressed.use) use();
    for (let i = 0; i < 4; i++) if (pressed['h' + (i + 1)]) {
      const id = P.wordSlots[i];
      if (id && id.startsWith('art:')) useArt(id.slice(4));
      else if (id) { castWord(WORDS.find(w => w.id === id), 0.8); if (lastMiss && micMode !== 'off' && performance.now() - lastMiss.t < 3000) { if (learnAlias(id, lastMiss.ph)) { floater(pcx(), P.y - 50, `NOW I HEAR “${lastMiss.ph.toUpperCase()}” AS ${SPELL(id).say.toUpperCase()}`, INK2); voiceLog(`learned: “${lastMiss.ph}” means ${SPELL(id).say}`, true); } lastMiss = null; } }
      else if (P.noMana) floater(pcx(), P.y - 30, 'NO SCROLL ON THIS KEY', PENCIL);
      else floater(pcx(), P.y - 30, i < P.wordSlots.length ? 'EMPTY SLOT' : 'MORE MANA OPENS THIS SLOT', PENCIL);
    }
    if (pressed.h5) { if (P.torch.fuel > 0) { P.torch.lit = !P.torch.lit; tone(P.torch.lit ? 400 : 300, P.torch.lit ? 800 : 150, 0.15, 'triangle', 0.03); } else floater(pcx(), P.y - 24, 'NO FUEL · REST TO REFILL', PENCIL); }
    if (pressed.h6) throwKnife();
    if (pressed.arrow) { if (!curW().long) floater(pcx(), P.y - 30, 'ONLY THE EMPTY LONGBOW TAKES OTHER ARROWS', PENCIL); else { const ks = ['reed', 'iron', 'ember', 'ink'].filter(k => k === 'reed' || P.arrows[k] > 0), i2 = ks.indexOf(P.arrowKind || 'reed'); P.arrowKind = ks[(i2 + 1) % ks.length]; floater(pcx(), P.y - 30, `${ARROWS[P.arrowKind].name.toUpperCase()} ARROWS${P.arrowKind === 'reed' ? '' : ' ×' + P.arrows[P.arrowKind]}`); tone(700, 900, 0.05, 'triangle', 0.03); } }
    if (pressed.h8) callHorse();
  }
  if (P.charging) {
    const cmax = W8.long ? 1 : 0.7; P.charge = Math.min(cmax, P.charge + dt);
    if (P.chargeSrc === 'mouse') faceAim();
    const letGo = P.chargeSrc === 'mouse' ? !held.mouseL : !held.heavy;
    if (letGo || P.hitT > 0) {
      P.charging = false;
      if (P.hitT <= 0 && spend(W8.heavy.st)) { P.unseenT = 0;
        const m = W8.long ? 1 + P.charge * 0.9 : 1 + P.charge / 0.7 * 0.5;
        if (W8.bow) { shootArrow(W8.heavy, m, W8.long && P.charge >= 0.95); P.atk = { t: 0, dur: W8.heavy.dur, a0: 99, a1: 99, bow: true, heavy: true, hit: new Set() }; }
        else { P.atk = Object.assign({ t: 0, hit: new Set(), heavy: true }, W8.heavy, { dmg: W8.heavy.dmg * m * wMul(W8), daggers: W8.id === 'daggers' }); if (P.mount) delete P.atk.lunge; SFX.swing(); }
      }
    }
  }
  // crouch (and rolling keeps you low)
  if (!P.mount) { if (P.rollT > 0 || (P.onG && held.down && !P.inWater)) setH(CH); else if (P.h !== PH) setH(PH); }
  P.crouch = !P.mount && P.h === CH && P.rollT <= 0;
  // horizontal
  const surf = P.onG && P.groundS ? P.groundS.surf : null;
  const LD = loadNow();
  let tgt = mx * 250 * LD.walk * (P.shaniT > 0 ? 0.7 : 1) * (P.school === 'Vayu' && !P.noMana ? 1.08 : 1);
  if (P.charging) tgt = mx * 90;
  if (P.crouch) tgt = mx * 110;
  if (surf === 'mud') tgt *= wears('boots') ? 0.8 : 0.45;
  if (P.glide) tgt = mx * 270;
  if (P.inWater) tgt = mx * (has('naga') ? 260 : 170);
  if (P.mount) rideMove(dt, mx, surf);
  else if (P.rollT > 0) { P.rollT -= dt; P.vx = P.face * P.rollV * (surf === 'mud' && !wears('boots') ? 0.6 : 1); if (P.rollT <= 0) P.rollT = 0; }
  else if (P.hitT > 0 || P.kickT > 0) P.vx *= Math.max(0, 1 - 2 * dt);
  else if (P.plunge) P.vx = 0;
  else if (P.healT > 0 || P.landT > 0 || P.ironT > 0 || (CHS && CHS.state === 'chant')) P.vx = 0;
  else if (P.atk && P.atk.lunge && P.onG && P.atk.t >= P.atk.a0 - 0.08 && P.atk.t < P.atk.a1) P.vx = P.face * P.atk.lunge;
  else if (P.atk && P.onG) P.vx *= 0.8;
  else if (surf === 'ice') P.vx += (tgt - P.vx) * Math.min(1, dt * (wears('cleats') ? 12 : 2.2));
  else if (!P.onG && !P.inWater) P.vx += (tgt - P.vx) * Math.min(1, dt * 14);
  else P.vx = tgt;
  if (mx && (!P.atk || P.mount) && !P.charging && P.rollT <= 0 && P.hitT <= 0 && P.kickT <= 0 && !P.plunge) P.face = mx;
  if (P.onG) P.horseJumped = false;
  // jumping
  if ((jp || P.jbuf > 0) && P.hitT <= 0 && !P.plunge && P.healT <= 0) {
    if (P.inWater) { if (jp && !P.headUnder) { P.vy = -680; P.jbuf = 0; P.jumping = true; SFX.splash(); } }
    else if (P.onG && held.down && P.groundS && P.groundS.k === 'oneway') { P.dropT = 0.25; P.onG = false; P.jbuf = 0; P.y += 1; }
    else if (P.onG || P.coy > 0) { P.horseJumped = false; P.vy = (P.mount ? -780 : -720) * (surf === 'mud' ? (wears('boots') || P.mount ? 0.88 : 0.7) : 1); P.onG = false; P.coy = 0; P.jbuf = 0; P.jumping = true; SFX.jump(); }
    else if (P.mount) { if (jp && horse.perk === 'double jump' && !P.horseJumped) { P.vy = -700; P.horseJumped = true; P.jbuf = 0; puff(pcx(), P.y + P.h); for (let i = 0; i < 8; i++) fx.push({ k: 'dot', x: pcx() + rnd(-20, 20), y: P.y + P.h, vx: rnd(-80, 80), vy: rnd(20, 120), life: 0.4, c: INK2 }); SFX.air(); } }
    else if (jp && P.clingMem > 0 && has('gecko')) { P.vy = -690; P.vx = -P.clingDir * 340; P.kickT = 0.17; P.face = -P.clingDir; P.cling = 0; P.clingMem = 0; P.jbuf = 0; P.jumping = true; P.jumpsLeft = has('garuda') ? 1 : 0; puff(P.x + (P.clingDir > 0 ? P.w : 0), P.y + 30); SFX.jump(); }
    else if (jp && P.jumpsLeft > 0 && has('garuda')) { P.vy = -640; P.jumpsLeft--; P.jbuf = 0; P.jumping = true; P.glide = false; puff(pcx(), P.y + P.h); SFX.air(); }
  }
  if (jr && P.jumping && P.vy < -200) { P.vy *= 0.5; P.jumping = false; }
  // gliding
  const canGlide = !P.mount && has('kite') && jh && !P.onG && !P.inWater && !P.cling && !P.plunge && P.hitT <= 0;
  P.glide = canGlide && (P.glide || P.vy > 0);
  // vertical forces
  if (P.inWater) {
    P.vy += (P.headUnder ? (wears('mail') ? 160 : -350) : 600) * dt;
    if (held.up || held.jump) P.vy -= 1300 * dt;
    if (held.down) P.vy += 1100 * dt;
    P.vy *= Math.max(0, 1 - 2.5 * dt); P.vy = clamp(P.vy, -300, 320);
  } else {
    P.vy += GRAV * dt;
    if (windAt(P.x + P.w / 2, P.y + P.h / 2)) { P.vy -= (P.glide ? 3400 : 700) * dt; if (P.glide) P.vy = Math.max(P.vy, -420); }
    if (P.glide) P.vy = Math.min(P.vy, 115);
    if (P.cling) P.vy = Math.min(P.vy, 90);
    if (P.plunge) P.vy = 1150;
    P.vy = Math.min(P.vy, 1200);
  }
  const wasG = P.onG;
  moveP(dt);
  trackFall(wasG);
  if (P.onG && !wasG) { const plunged = P.plunge; if (P.plunge) plungeLand(); P.jumping = false; P.glide = false; landFall(plunged); }
  if (P.onG) { P.jumpsLeft = has('garuda') ? 1 : 0; P.coy = 0.1; P.cling = 0; }
  if (P.onG && P.groundS && P.groundS.k === 'crumble' && P.groundS.state === 'solid') { P.groundS.state = 'shake'; P.groundS.t = P.mount ? 0.25 : 0.45; SFX.crack(); }
  // ledges and walls
  if (!P.mount && !P.onG && P.vy >= 0 && mx && !P.inWater && P.grabCd <= 0 && !P.plunge && P.h === PH && P.hitT <= 0 && !P.atk && P.kickT <= 0 && tryLedge(mx)) return;
  if (!P.mount && has('gecko') && !P.onG && !P.inWater && mx && !P.plunge && P.vy > -120 && P.kickT <= 0 && touching(mx)) { if (!P.cling) SFX.grab(); P.cling = mx; P.clingDir = mx; P.clingMem = 0.14; P.glide = false; P.vy = Math.min(P.vy, 90); }
  else P.cling = 0;
  afterMove(dt, mx, false);
}
function ladderStep(dt, mx) {
  const L = P.ladder; P.vx = 0; P.x = L.x + L.w / 2 - P.w / 2;
  P.vy = held.up ? -190 : held.down ? 190 : 0; if (P.vy) P.climbPh = (P.climbPh || 0) + dt * 10;
  P.y += P.vy * dt; P.onG = false;
  const hit = blocked(P);
  if (hit) { if (P.vy > 0) { P.y = hit.y - P.h; P.ladder = null; P.onG = true; P.groundS = hit; } else P.y = hit.y + hit.h; }
  if (P.ladder && P.y + P.h <= L.y) { P.y = L.y - P.h; P.ladder = null; P.onG = true; P.vy = 0; }
  else if (P.ladder && P.y >= L.y + L.h) { P.ladder = null; }
  if (P.ladder && pressed.jump) { P.ladder = null; P.vy = -520; P.vx = mx * 250; P.jumping = true; SFX.jump(); }
}
function afterMove(dt, mx, onLadder) {
  const cx = P.x + P.w / 2;
  const wasIn = P.inWater;
  P.inWater = !onLadder && !!waterAt(cx, P.y + P.h / 2); P.headUnder = !!waterAt(cx, P.y + 8);
  if (P.inWater !== wasIn && Math.abs(P.vy) > 120) { SFX.splash(); for (let i = 0; i < 10; i++) fx.push({ k: 'dot', x: cx + rnd(-14, 14), y: P.y + P.h / 2, vx: rnd(-120, 120), vy: -rnd(80, 260), life: 0.5, c: PENCIL }); }
  if (P.inWater && P.mount) { dismount(true); floater(pcx(), P.y - 30, 'THE HORSE THROWS YOU AND BOLTS', RED); }
  if (P.inWater) { P.plunge = false; P.glide = false; P.cling = 0; P.jumpsLeft = 0; }
  if (P.headUnder && !has('naga')) {
    P.breath = Math.max(0, P.breath - dt * (P.skills.has('iron_lungs') ? 0.5 : 1));
    if (P.breath <= 0) { P.hp -= 15 * dt; if (Math.random() < dt * 6) fx.push({ k: 'bub', x: cx, y: P.y + 6, vx: 0, vy: -60, life: 0.7 }); if (P.hp <= 0) { P.hp = 0; fall('The water took your breath.'); return; } }
  } else P.breath = Math.min(BREATH, P.breath + 4 * dt);
  if (P.headUnder && Math.random() < dt * 2) fx.push({ k: 'bub', x: cx + P.face * 6, y: P.y + 6, vx: 0, vy: -50, life: 1 });
  // burning ground
  if (P.onG && P.groundS && P.groundS.surf === 'hot' && P.mount && !has('ember') && !rainAt(cx)) { horse.hp -= 25 * dt; if (Math.random() < dt * 4) burst(cx, P.y + P.h, 3, RED, 120); if (horse.hp <= 0) { dismount(true); floater(cx, P.y - 30, 'THE HORSE IS BURNED AND BOLTS', RED); } }
  else if (P.onG && P.groundS && P.groundS.surf === 'hot' && !has('ember') && P.school !== 'Agni' && !rainAt(cx)) {
    P.hp -= 25 * dt; P.burnT += dt;
    if (P.burnT > 0.25) { P.burnT = 0; burst(cx, P.y + P.h, 3, RED, 120); }
    if (P.hp <= 0) { P.hp = 0; fall('The burning ground took you.'); return; }
  }
  if (P.onG && P.groundS && P.groundS.k === 'solid' && P.groundS.surf !== 'hot') P.safe = { x: P.x, y: P.y + P.h };
  if (P.y > LH + 60) { P.hp = 0; fall('You fell into the dark.', true); return; }
  if (P.mount && P.onG && Math.abs(P.vx) > 330 && P.trampleCd <= 0) for (const f of foes) if (f.alive && f.state !== 'kneel' && overlap(P, f)) { hurtFoe(f, 10 * P.dmgMul, true, { knock: 380, stun: 0.6 }); floater(f.x + 12, f.y - 20, 'TRAMPLED'); P.trampleCd = 0.5; shake = 6; }
  if (P.onG && Math.abs(P.vx) > 20) P.run += dt * Math.abs(P.vx) * 0.045;
  if (P.inWater && (mx || held.up || held.down)) P.run += dt * 7;
  // pickups
  const fy = P.y + P.h;
  for (const s of shades) if (!s.taken && Math.abs(cx - s.x) < 30 && Math.abs(fy - s.y) < 70) { s.taken = true; P.seeds += s.seeds; floater(s.x, s.y - 80, `+${s.seeds} seeds recovered`); tone(500, 1000, 0.2, 'sine', 0.04); }
  for (const b of soul.bodies) if (!b.taken && b.life !== life.n && Math.abs(cx - b.x) < 30 && Math.abs(fy - b.y) < 70) { b.taken = true; learnSpell('echo', 'A memory returns: you have fought beside yourself before.'); floater(b.x, b.y - 90, `A body you wore in life ${b.life}.`); tone(300, 600, 0.6, 'sine', 0.04); }
  for (const [id, x, gy] of RELIC_SPOTS) if (!P.relics.has(id) && !relicStored(id) && Math.abs(cx - x) < 28 && Math.abs(fy - gy) < 50) pickRelic(id);
  for (const d of drops) if (!d.taken && Math.abs(cx - d.x) < 26 && d.y > P.y - 10 && d.y < fy + 24) { d.taken = true; P.knives = Math.min(P.knivesMax, P.knives + 1); tone(1300, 1600, 0.05, 'triangle', 0.02); }
  drops = drops.filter(d => !d.taken);
  for (const n of NODES) if (n.k === 'petal' && n.hp > 0 && overlap(P, nodeBox(n))) hitNode(n, 1);
  for (const n of NODES) if (n.shake > 0) n.shake -= dt;
  for (const f of FAKES) if (overlap(P, f) && !f.found) { f.found = true; walk('jnana', 2); floater(cx, P.y - 30, 'THE WALL WAS NEVER THERE', INK2); tone(700, 300, 0.4, 'sine', 0.04); }
  // zones
  let z = 0; for (let i = 0; i < ZONES.length; i++) if (P.x >= ZONES[i][0]) z = i;
  if (z !== P.zone) { P.zone = z; if (!P.zones.has(z)) { P.zones.add(z); zoneTag = { t: 3.2, name: ZONES[z][1], sub: ZONES[z][2] }; } }
}
/* fall damage (Sahan, after build 23): only real heights hurt. A drop of about eight body heights is free; past that
   it hurts more the higher you fell, and from about nineteen body heights it kills. Water always catches you. Gliding,
   climbing, hanging and clinging start the count again. A roll just as you land, or a plunge, takes half the hurt.
   On the horse, the horse takes the fall. */
const FALL_SAFE = 420, FALL_DEADLY = 1000;
function trackFall(wasG) {
  const feet = P.y + P.h;
  if (P.onG) { if (wasG) P.fallTop = feet; return; }   // the landing frame keeps the height it fell from
  if (P.inWater || P.glide || P.ladder || P.hang || P.climbT > 0 || P.cling || windAt(pcx(), P.y + P.h / 2)) { P.fallTop = feet; return; }   // water, cloth, holds and winds all catch you
  if (wasG || P.fallTop === undefined || P.fallTop === null) P.fallTop = feet;
  P.fallTop = Math.min(P.fallTop, feet);
  if (held.roll || pressed.roll) P.rollLand = 0.25; else if (P.rollLand > 0) P.rollLand -= 1 / 60;
}
function landFall(plunged) {
  if (P.fallTop === null || P.fallTop === undefined) { P.fallTop = P.y + P.h; P.fallFree = false; return; }
  const drop = (P.y + P.h) - P.fallTop, roll = P.rollLand > 0; P.fallTop = P.y + P.h; P.rollLand = 0;
  if (P.fallFree) { P.fallFree = false; return; }
  if (drop > 300) { P.landT = Math.max(P.landT, drop > FALL_SAFE ? 0.4 : 0.22); shake = Math.max(shake, drop > FALL_SAFE ? 10 : 5); for (let i = 0; i < 10; i++) fx.push({ k: 'dot', x: pcx() + rnd(-24, 24), y: P.y + P.h - 2, vx: rnd(-200, 200), vy: -rnd(40, 160), life: rnd(0.3, 0.5), c: INK2 }); }
  if (drop <= FALL_SAFE) return;
  const soft = plunged || roll, k = Math.pow(clamp((drop - FALL_SAFE) / (FALL_DEADLY - FALL_SAFE), 0, 1), 1.3);
  if (P.mount) { horse.hp -= horse.hpMax * k * (soft ? 0.5 : 1); floater(pcx(), P.y - 30, 'YOUR HORSE TAKES THE FALL', INK2); if (horse.hp <= 0) dismount(true); return; }
  if (drop >= FALL_DEADLY * (soft ? 1.6 : 1)) { floater(pcx(), P.y - 30, 'TOO FAR TO FALL', RED); fall('The fall was too far.'); return; }
  const dmg = Math.max(1, Math.round(P.hpMax * k * (soft ? 0.5 : 1)));
  P.hp = Math.max(0, P.hp - dmg); SFX.hurt(); burst(pcx(), P.y + P.h - 6, 10, RED);
  if (soft) { P.rollT = Math.max(P.rollT, 0.3); P.rollV = 260; floater(pcx(), P.y - 30, `YOU ROLL AS YOU LAND · −${dmg}`, INK2); }
  else floater(pcx(), P.y - 30, `THE FALL HURTS · −${dmg}${P.hp > 0 && !soft ? ' · ROLL AS YOU LAND' : ''}`, RED);
  if (P.hp <= 0) fall('The fall was too far.');
}
function plungeLand() {
  P.plunge = false; P.landT = 0.18; shake = 9; hitstop = 0.05; SFX.thud();
  const cx = P.x + P.w / 2, fy = P.y + P.h;
  for (let i = 0; i < 14; i++) fx.push({ k: 'dot', x: cx + rnd(-30, 30), y: fy - 2, vx: rnd(-260, 260), vy: -rnd(60, 260), life: rnd(0.3, 0.6), c: INK2 });
  fx.push({ k: 'ring', x: cx, y: fy, life: 0.35, big: true });
  for (const f of foes) if (f.alive && f.state !== 'kneel' && Math.abs(f.x + f.w / 2 - cx) < 110 && Math.abs(f.gy - fy) < 50) hurtFoe(f, 26 * P.dmgMul, true);
  for (const p of pots) if (!p.broken && Math.abs(p.x - cx) < 80 && Math.abs(p.gy - fy) < 40) breakPot(p);
  for (const n of NODES) if (n.hp > 0 && n.k !== 'petal' && Math.abs(n.x - cx) < 80 && Math.abs(n.gy - fy) < 40) hitNode(n, 2);
  if (P.groundS && P.groundS.k === 'crumble') { P.groundS.state = 'gone'; P.groundS.t = 3; burst(P.groundS.x + 40, P.groundS.y, 14, INK2); }
}
/* ---------- gathering ---------- */
const MATS = { wood: 'Wood', iron: 'Iron ore', ink: 'Grasping ink', petal: 'Lotus petals', ember: 'Ember stones' };
const MAT_WHERE = { wood: 'strike trees', iron: 'strike ore rocks', ink: 'left by Grasping you defeat', petal: 'lotus flowers on water', ember: 'red stones in the dark' };
const NODES = LEVEL.nodes;
const NODE_HP = { tree: 3, ore: 3, ember: 2, petal: 1 }, NODE_GIVES = { tree: ['wood', 2], ore: ['iron', 2], ember: ['ember', 1], petal: ['petal', 1] };
function resetNodes() { NODES.forEach(n => { n.hp = NODE_HP[n.k]; n.shake = 0; }); }
function nodeBox(n) { return n.k === 'tree' ? { x: n.x - 14, y: n.gy - 90, w: 28, h: 90 } : n.k === 'petal' ? { x: n.x - 16, y: n.gy - 12, w: 32, h: 24 } : { x: n.x - 17, y: n.gy - 24, w: 34, h: 24 }; }
function gain(mat, n, x, y) { n = Math.max(0, Math.min(n, Math.floor((P.packMax - packWeight()) / MAT_W[mat] + 1e-9))); if (!n) { floater(x, y, 'YOUR PACK IS FULL', PENCIL); return; } P.mats[mat] += n; floater(x, y, `+${n} ${MATS[mat].toUpperCase()}`, INK2); tone(700, 1000, 0.08, 'triangle', 0.03); }
function hitNode(n, dmg) {
  n.hp -= dmg; n.shake = 0.2; burst(n.x, n.gy - (n.k === 'tree' ? 50 : 14), 6, n.k === 'ember' ? RED : INK2, 160); tone(n.k === 'tree' ? 260 : 900, n.k === 'tree' ? 180 : 500, 0.06, 'square', 0.03);
  if (n.hp <= 0) { const [m, q] = NODE_GIVES[n.k]; gain(m, q + (P.skills.has('forager') ? 1 : 0), n.x, n.gy - (n.k === 'tree' ? 100 : 40)); }
}
/* ---------- forges, the shrine panel and the forge panel ---------- */
const STONES = LEVEL.stones;
const nearStone = () => STONES.find(st => Math.abs(pcx() - st.x) < 50 && Math.abs(P.y + P.h - st.gy) < 40);
const SHANI_ANSWERS = ['shani', 'sani', 'saturn', 'shanaishchara', 'shanaischara', 'shanidev', 'shani dev', 'sanidev'];
function answerStone(text) {
  const t = String(text).toLowerCase().replace(/[^a-z ]/g, ' ');
  if (SHANI_ANSWERS.some(a => t.split(/\s+/).includes(a) || t.replace(/ /g, '').includes(a.replace(/ /g, '')))) { closePanel(); learnSpell('shani', 'The stone hears its name and gives up its weight.'); return true; }
  return false;
}
function useStone(st) {
  if (st.k === 'sun') {
    if (soul.spells.has('surya')) { floater(st.x, st.gy - 60, 'THE STONE HAS GIVEN WHAT IT HAD', PENCIL); return; }
    const alt = sunAlt();
    if (alt < 20) { floater(st.x, st.gy - 60, alt <= 0 ? 'THE STONE IS DARK · IT WAITS FOR THE SUN TO STAND HIGH' : `THE SUN IS ONLY ${Math.round(alt)}° UP · THE STONE WANTS IT HIGHER`, PENCIL); return; }
    learnSpell('surya', `With the real Sun ${Math.round(alt)}° above you, the stone burns white.`); return;
  }
  if (st.k === 'moon') {
    if (soul.spells.has('tide')) { floater(st.x, st.gy - 60, 'THE STONE HAS GIVEN WHAT IT HAD', PENCIL); return; }
    if (!isNight()) { floater(st.x, st.gy - 60, 'THE STONE IS COLD BY DAY · COME BACK WHEN IT IS NIGHT WHERE YOU ARE', PENCIL); return; }
    learnSpell('tide', 'Under the night sky the stone glows with moonlight.'); return;
  }
  if (soul.spells.has('shani')) { floater(st.x, st.gy - 60, 'THE STONE IS SILENT NOW', PENCIL); return; }
  banner = null; mode = 'stone'; clearHeld();
  $('gearIn').innerHTML = `<span class="eyebrow">A speaking stone · Esc to leave</span><h2>The stone asks</h2>
    <p class="hand">“I am the slowest wanderer of the sky. I carry the weight of every deed and give each its due, in time. Say my name.”</p>
    <div class="row"><input id="stoneIn" type="text" autocomplete="off" placeholder="Type the name" style="font:16px var(--f-mono);padding:10px;border:1.5px solid var(--ink);background:var(--paper)"><button class="btn" id="stoneGo" type="button">Answer</button></div>
    <p class="note">Or close this, stand by the stone, hold V and say it aloud.</p><p class="note" id="stoneMsg"></p>`;
  $('ovGear').hidden = false;
  const go = () => { if (!answerStone($('stoneIn').value)) $('stoneMsg').textContent = 'The stone stays silent. That is not its name.'; };
  $('stoneGo').addEventListener('click', go); $('stoneIn').addEventListener('keydown', e => { if (e.key === 'Enter') go(); e.stopPropagation(); });
  setTimeout(() => $('stoneIn').focus(), 30);
}
const FORGES = LEVEL.forges;
const nearForge = () => FORGES.findIndex(f => Math.abs(pcx() - f.x) < 60 && Math.abs(P.y + P.h - f.gy) < 40);
const costText = c => Object.keys(c).map(k => k === 'seeds' ? `${c[k]} seeds` : `${c[k]} ${MATS[k].toLowerCase()}`).join(' · ');
const canPay = c => Object.keys(c).every(k => (k === 'seeds' ? P.seeds : P.mats[k]) >= c[k]);
function pay(c) { for (const k in c) { if (k === 'seeds') P.seeds -= c[k]; else P.mats[k] -= c[k]; } }
const TIER_COST = { 2: { iron: 3, wood: 2, ink: 2, seeds: 80 }, 3: { iron: 5, ink: 4, ember: 2, seeds: 200 } };
const MAKES = [
  { id: 'knives', name: 'Two more ink knives', what: 'Carry 7 knives instead of 5.', cost: { iron: 3, wood: 1 }, at: 'forge', once: true, done: () => { P.knivesMax += 2; P.knives += 2; } },
  { id: 'torch', name: 'Ember-core torch', what: 'The torch burns 40 seconds longer.', cost: { wood: 2, ember: 1 }, at: 'forge', once: true, done: () => { P.torchMax += 40; P.torch.fuel = P.torchMax; } },
  { id: 'arr_iron', name: 'Five iron arrows', what: ARROWS.iron.what, cost: { iron: 1, wood: 1 }, at: 'forge', once: false, show: () => P.noMana || P.weapons.has(7), done: () => { P.arrows.iron += 5; } },
  { id: 'arr_ember', name: 'Five ember arrows', what: ARROWS.ember.what, cost: { ember: 1, wood: 1 }, at: 'forge', once: false, show: () => P.noMana || P.weapons.has(7), done: () => { P.arrows.ember += 5; } },
  { id: 'arr_ink', name: 'Five ink arrows', what: ARROWS.ink.what, cost: { ink: 2, wood: 1 }, at: 'forge', once: false, show: () => P.noMana || P.weapons.has(7), done: () => { P.arrows.ink += 5; } },
  { id: 'lotus', name: 'Grow a lotus', what: 'Carry one more lotus (up to 6).', cost: { petal: 3, seeds: 40 }, at: 'shrine', once: false, ok: () => P.lotusMax < 6, done: () => { P.lotusMax++; P.lotus = P.lotusMax; } },
];
const matsLine = () => Object.keys(MATS).map(k => `<span>${MATS[k]}: ${P.mats[k]} <span class="note">(${MAT_WHERE[k]})</span></span>`).join('');
function makeHTML(at) {
  return MAKES.filter(m => m.at === at && (!m.show || m.show())).map(m => { const done = m.once && P.made.has(m.id), able = !done && canPay(m.cost) && (!m.ok || m.ok());
    return `<div class="item"><b>${m.name}</b><span>${m.what}</span><span class="m">${done ? 'Made' : costText(m.cost)}</span><div class="row"><button class="btn ghost sm" type="button" data-make="${m.id}"${able ? '' : ' disabled'}>${done ? 'Done' : 'Make'}</button></div></div>`; }).join('');
}
function bindMakes(rerender) { $('gearIn').querySelectorAll('[data-make]').forEach(bt => bt.addEventListener('click', () => { const m = MAKES.find(x => x.id === bt.dataset.make); if (!canPay(m.cost)) return; pay(m.cost); m.done(); P.made.add(m.id); SFX.relic(); rerender(); })); }
function openShrine(i) { banner = null; mode = 'shrine'; clearHeld(); renderShrine(i); $('ovGear').hidden = false; }
function renderShrine(i) {
  const lv = levelOf(), cost = LEVEL_COST(lv), pend = P.skillPending, W8 = curW();
  const rows = Object.keys(STATS).map(k => `<div class="item statrow"><div><b>${STATS[k].name} ${P.stats[k]}</b><span>${STATS[k].what}</span></div><button class="btn sm" type="button" data-up="${k}"${P.seeds >= cost && !pend ? '' : ' disabled'}>+1</button></div>`).join('');
  const skillBox = pend ? `<div class="stats"><span><b>Level ${pend}: choose a skill</b> (one only, it stays with this body)</span></div>${SKILL_LEVELS[pend].map(id => `<div class="item"><b>${SKILLS[id].name}</b><span>${SKILLS[id].what}</span><div class="row"><button class="btn sm" type="button" data-skill="${id}">Choose</button></div></div>`).join('')}` : '';
  const skills = P.skills.size ? [...P.skills].map(id => `${SKILLS[id].name}: ${SKILLS[id].what}`).join('<br>') : 'None yet. You choose one at level 5 and one at level 10.';
  $('gearIn').innerHTML = `
    <span class="eyebrow">${esc(SHRINES[i].name)} · rested · Esc to leave</span><h2>Shrine</h2>
    <div class="gear">
      <div class="gcol"><span class="lbl">Level ${lv} · you carry ${P.seeds} seeds · the next point costs ${cost}</span>
        ${skillBox}${rows}
        <div class="stats"><span>Health ${P.hpMax} · Stamina ${P.stBase}${P.manaMax ? ` · Mana ${P.manaMax}` : ''} · Load ${P.loadMax}</span><span>${esc(W8.name)} ${TIER_NAME[tierOf(P.slots[P.slotIdx])]}: ${Math.round((wMul(W8) - 1) * 100)}% extra damage from stats and tier</span></div></div>
      <div class="gcol"><div class="row"><button class="btn sm" type="button" id="shrineMed">Sit in stillness</button><button class="btn sm" type="button" id="shrineSpells">Spells on your keys</button><button class="btn sm" type="button" id="shrineChants">Prepare chants</button></div>
        <p class="note">Stillness: hold Space to breathe in, let go to breathe out, with the guide. Let thoughts pass. About a minute; it cannot be rushed.</p>
        ${roadsHTML()}
        <span class="lbl">Skills</span><div class="stats"><span>${skills}</span></div>
        <span class="lbl">Shrine offering</span><div class="inv">${makeHTML('shrine')}<div class="item"><b>Leave seeds for whoever comes after</b><span>Fifty seeds left at the shrine, for a stranger you will never meet.</span><div class="row"><button class="btn ghost sm" type="button" id="dana"${P.seeds >= 50 && !life.dana ? '' : ' disabled'}>${life.dana ? 'Left' : 'Leave 50 seeds'}</button></div></div></div>
        <span class="lbl">Join spells</span><div class="inv"><div class="item"><b>Ignite + Gust → Fire wind</b><span>${SPELL('firewind').what}</span><span class="m">${soul.spells.has('firewind') ? 'Already joined' : `Needs Ignite and Gust · ${costText({ ember: 1, seeds: 40 })}`}</span><div class="row"><button class="btn ghost sm" type="button" id="joinFW"${!soul.spells.has('firewind') && soul.spells.has('ignite') && soul.spells.has('gust') && canPay({ ember: 1, seeds: 40 }) ? '' : ' disabled'}>Join</button></div></div></div>
        ${P.noMana ? `<span class="lbl">Write a scroll · ${costText(SCRIBE_COST)} each · only a body with no mana has the stillness for it</span><div class="inv">${[...soul.spells].map(id => `<div class="item"><b>${SPELL(id).say}</b><span class="m">You carry ${P.scrolls[id] || 0}</span><div class="row"><button class="btn ghost sm" type="button" data-scribe="${id}"${canPay(SCRIBE_COST) ? '' : ' disabled'}>Write one</button></div></div>`).join('')}</div>` : ''}
        <span class="lbl">Materials</span><div class="stats">${matsLine()}</div>
        <p class="note">Weapons are tempered at a forge: one in the village, one in the arena. Levels, skills and materials belong to this body; a new life starts again from its birth.</p></div>
    </div>`;
  $('gearIn').querySelectorAll('[data-up]').forEach(bt => bt.addEventListener('click', () => {
    const c = LEVEL_COST(levelOf()); if (P.seeds < c || P.skillPending) return;
    P.seeds -= c; P.stats[bt.dataset.up]++; applyStats(false); tone(523, 784, 0.25, 'sine', 0.04);
    const nl = levelOf(); if (SKILL_LEVELS[nl] && !SKILL_LEVELS[nl].some(id => P.skills.has(id))) P.skillPending = nl;
    renderShrine(i);
  }));
  $('gearIn').querySelectorAll('[data-skill]').forEach(bt => bt.addEventListener('click', () => { P.skills.add(bt.dataset.skill); P.skillPending = null; applyStats(false); SFX.relic(); renderShrine(i); }));
  bindMakes(() => renderShrine(i));
  $('gearIn').querySelectorAll('[data-scribe]').forEach(bt => bt.addEventListener('click', () => { if (!canPay(SCRIBE_COST)) return; pay(SCRIBE_COST); P.scrolls[bt.dataset.scribe] = (P.scrolls[bt.dataset.scribe] || 0) + 1; if (!P.wordSlots.includes(bt.dataset.scribe)) { const f = P.wordSlots.indexOf(null); if (f >= 0) P.wordSlots[f] = bt.dataset.scribe; } tone(600, 900, 0.2, 'triangle', 0.04); renderShrine(i); }));
  $('shrineMed').addEventListener('click', () => openMeditation(i));
  $('shrineSpells').addEventListener('click', () => { gearView = 'spells'; mode = 'gear'; renderGear(); });
  $('shrineChants').addEventListener('click', () => { gearView = 'chants'; mode = 'gear'; renderGear(); });
  const dn = $('dana'); if (dn) dn.addEventListener('click', () => { if (P.seeds < 50 || life.dana) return; P.seeds -= 50; life.dana = true; closePanel(); deed('You left seeds at a shrine for a stranger.', 1, { kind: 'gift' }); });
  const jf = $('joinFW'); if (jf) jf.addEventListener('click', () => { if (!canPay({ ember: 1, seeds: 40 })) return; pay({ ember: 1, seeds: 40 }); closePanel(); learnSpell('firewind', 'At the shrine, fire and wind become one.'); });
}
function openForge() { banner = null; mode = 'forge'; clearHeld(); renderForge(); $('ovGear').hidden = false; }
function renderForge() {
  const owned = [...P.weapons].sort((a, b) => a - b);
  const temper = owned.map(wi => { const w = WEAPONS[wi], t = tierOf(wi), next = t + 1, c = TIER_COST[next];
    return `<div class="item"><b>${w.name} · Tier ${TIER_NAME[t]}</b><span>${t >= 3 ? 'Fully tempered.' : `Tier ${TIER_NAME[next]}: ${Math.round(TIER_MUL[next] * 100 - 100)}% more damage than Tier I.`}</span>${c ? `<span class="m">${costText(c)}</span>` : ''}<div class="row"><button class="btn ghost sm" type="button" data-tier="${wi}"${c && canPay(c) ? '' : ' disabled'}>${t >= 3 ? 'Done' : 'Temper'}</button></div></div>`; }).join('');
  $('gearIn').innerHTML = `
    <span class="eyebrow">Forge · Esc to leave</span><h2>Forge</h2>
    <div class="gear">
      <div class="gcol"><span class="lbl">Temper your weapons · you carry ${P.seeds} seeds</span><div class="inv">${temper}</div></div>
      <div class="gcol"><span class="lbl">Make</span><div class="inv">${makeHTML('forge')}</div>
        <span class="lbl">Materials</span><div class="stats">${matsLine()}</div></div>
    </div>`;
  $('gearIn').querySelectorAll('[data-tier]').forEach(bt => bt.addEventListener('click', () => { const wi = +bt.dataset.tier, c = TIER_COST[tierOf(wi) + 1]; if (!c || !canPay(c)) return; pay(c); P.wtier[wi] = tierOf(wi) + 1; [600, 900, 1200].forEach((f, i) => tone(f, f * 0.7, 0.12, 'square', 0.03, i * 0.12)); renderForge(); }));
  bindMakes(renderForge);
}
function breakPot(p) { p.broken = true; P.seeds += p.seeds; floater(p.x, p.gy - 40, `+${p.seeds} seeds`); burst(p.x, p.gy - 14, 14, INK2, 200); SFX.crack(); }
function doHits(A) {
  if (A.multi && A.t - (A.lastReset || 0) >= A.multi) { A.hit.clear(); A.lastReset = A.t; }
  const reach = A.reach + (P.mount ? 18 : 0), by = P.mount ? P.y + 22 : P.y + 6, bh = P.mount ? 44 : Math.min(34, P.h);
  const box = A.both ? { x: P.x - reach + 4, y: by, w: P.w + reach * 2 - 8, h: bh } : { x: P.face > 0 ? P.x + P.w - 4 : P.x + 4 - reach, y: by, w: reach, h: bh };
  for (const t of foes) {
    if (!t.alive || A.hit.has(t) || !overlap(box, t)) continue;
    A.hit.add(t);
    let dmg = A.dmg * P.dmgMul * (1 + boonV('dmg'));
    if (P.riposte > 0 || t.stag > 0) { dmg *= P.skills.has('killing_edge') ? 3 : 2; floater(t.x + t.w / 2, t.y - 20, 'RIPOSTE'); P.riposte = 0; }
    if (A.combo3) { dmg *= 2; floater(t.x + t.w / 2, t.y - 34, 'THIRD CUT', INK2); }
    if (A.daggers && t.face === P.face && t.state !== 'kneel') { dmg *= 2.5; floater(t.x + t.w / 2, t.y - 20, 'FROM BEHIND'); }
    if (A.thrust && P.mount && Math.abs(P.vx) > 250) { dmg *= 1 + Math.abs(P.vx) / 430; floater(t.x + t.w / 2, t.y - 20, 'CHARGE'); }
    if (P.bless) dmg = blessHit(t, dmg, A.heavy);
    hurtFoe(t, dmg, A.heavy, { stun: (A.stun || (A.heavy ? 0.6 : 0.3)) * (P.bless && P.bless.el === 'prithvi' ? 1.8 : 1), knock: (A.knock || (A.heavy ? 260 : 120)) * (P.bless && P.bless.el === 'prithvi' ? 1.6 : 1), melee: true });
    hitstop = A.heavy ? 0.09 : 0.05; shake = A.heavy ? 8 : 4;
  }
  for (const p of pots) if (!p.broken && overlap(box, { x: p.x - 12, y: p.gy - 28, w: 24, h: 28 })) breakPot(p);
  for (const n of NODES) if (n.hp > 0 && !A.hit.has(n) && overlap(box, nodeBox(n))) { A.hit.add(n); hitNode(n, A.heavy ? 2 : 1); }
}
function blessHit(t, dmg, heavy) {
  const b = P.bless, pw = clamp(b.pow, 0.5, 1.2);
  if (b.el === 'agni') { dmg *= 1.25 + 0.2 * pw; t.burnT = 3; }
  if (b.el === 'jala') { const h = dmg * 0.18 * pw; P.hp = Math.min(P.hpMax, P.hp + h); }
  if (b.el === 'akasha') ECHO_HITS.push({ f: t, t: 0.3, dmg: dmg * 0.5 * pw });
  if (b.el === 'prithvi' && heavy) for (const f of foes) if (f !== t && f.alive && f.state !== 'kneel' && Math.abs(f.x - t.x) < 90 && Math.abs(f.gy - t.gy) < 40) hurtFoe(f, dmg * 0.4, false, { stun: 0.8 });
  return dmg;
}
function hurtFoe(t, dmg, heavy, o = {}) {
  if (t.boss) { bossHurt(t, dmg, heavy, o); return; }
  if (t.calmT > 0) { t.calmT = 0; if (!life.brokeCalm) { life.brokeCalm = true; deed('You struck one you had calmed.', -1, { kind: 'calm', target: t }); } }
  if (t.peace) { t.peace = false; deed('You struck one who meant you no harm.', -1, { kind: 'calm', target: t }); }
  if (t.state === 'kneel') { t.alive = false; burst(t.x + 12, t.y + 20, 22); SFX.hit(); deed('You struck down one who begged for mercy.', -2, { kind: 'slain', target: t }); soul.memories.slain++; P.seeds += 10; return; }
  t.hp -= dmg; t.flash = 0.12; burst(t.x + 12, t.y + 20, 6); heavy ? SFX.heavy() : SFX.hit();
  t.vx = (t.x + t.w / 2 > pcx() ? 1 : -1) * (o.knock || (heavy ? 260 : 120)); t.state = 'stun'; t.t = o.stun || (heavy ? 0.6 : 0.3);
  if (t.hp <= 0) {
    if (t.hp > -10 && Math.random() < begChance()) { t.hp = 1; t.state = 'kneel'; t.kneelT = 0; t.awayT = 0; t.vx = 0; floater(t.x + 12, t.y - 20, 'IT BEGS', INK2); }
    else { t.alive = false; burst(t.x + 12, t.y + 20, 22); P.seeds += 25; floater(t.x + 12, t.y - 10, '+25 seeds'); gain('ink', 1, t.x + 12, t.y - 28); soul.kills++; life.kills = (life.kills || 0) + 1; if (P.noMana && Math.random() < 0.08) { const known = [...soul.spells]; gainScroll(known[Math.floor(Math.random() * known.length)], 1, t.x + 12, t.y - 46); } if (!soul.spells.has('grasp') && (Math.random() < 0.15 || soul.kills >= 6)) learnSpell('grasp', 'The Grasping you struck down let go of something it was holding.'); }
  }
}
function hurtPlayer(d, src, melee) {
  if (CHS && CHS.state === 'chant' && !(P.dead || P.rollIF > 0 || P.inv > 0)) { if (!(melee && P.parryT > 0) && !(P.shieldT > 0)) cancelChant('THE HIT BREAKS YOUR CHANT'); }
  if (P.dead || P.rollIF > 0 || P.inv > 0 || P.climbT > 0) { if (P.rollIF > 0) floater(pcx(), P.y - 20, 'DODGED', PENCIL); return 'dodge'; }
  if (melee && P.parryT > 0) { P.parryT = 0; SFX.parry(); floater(pcx(), P.y - 24, 'PARRY'); if (P.skills.has('second_wind')) { P.hp = Math.min(P.hpMax, P.hp + 12); floater(pcx(), P.y - 40, '+12'); } if (src.boss) bossParried(src); else { src.stag = 1.1; src.state = 'stag'; src.t = src.stag; } P.riposte = 1.4; hitstop = 0.12; shake = 6; for (let i = 0; i < 10; i++) fx.push({ k: 'spark', x: pcx() + P.face * 20, y: P.y + 20, vx: rnd(-300, 300), vy: rnd(-300, 50), life: 0.25 }); return 'parry'; }
  if (P.shieldT > 0) { P.shieldT = 0; floater(pcx(), P.y - 24, 'BLOCKED'); tone(1500, 900, 0.06, 'square', 0.03); burst(pcx() + P.face * 26, P.y + 30, 10, PENCIL); return 'block'; }
  d *= 1 - protNow() / 100;
  const rooted = P.ironT > 0; if (rooted) { d *= 0.2; burst(pcx() + P.face * 18, P.y + 26, 8, PENCIL); }
  if (P.mount) { horse.hp -= d * 0.6; d *= 0.4; }
  for (const a of ARENAS) if (a.fight) a.hit = true;
  P.hp = Math.max(0, P.hp - d);
  if (P.hp <= 0 && pathAt('bhakti') >= 3 && !life.heldBack) { life.heldBack = true; P.hp = Math.round(P.hpMax * 0.3); P.inv = 1.2; floater(pcx(), P.y - 50, 'SOMEONE WHO LOVES YOU HOLDS YOU BACK', INK2); for (let i = 0; i < 3; i++) fx.push({ k: 'ring', big: i === 0, x: pcx(), y: P.y + P.h - i * 16, life: 0.35 }); tone(523, 784, 0.6, 'sine', 0.04); }
  if (rooted && P.hp > 0) { P.hitT = 0.08; P.inv = 0.3; shake = 4; SFX.hurt(); return 'hit'; }
  P.hitT = 0.32; P.inv = 0.45; P.atk = null; P.charging = false; P.healT = 0;
  P.hang = null; P.ladder = null; P.plunge = false; P.glide = false; P.cling = 0;
  const away = pcx() < src.x + src.w / 2 ? -1 : 1;
  if (P.mount) { P.vx = away * 120; P.vy = -120; if (horse.hp <= 0) { dismount(true); floater(pcx(), P.y - 30, 'YOUR HORSE IS HURT AND RUNS OFF', RED); } }
  else { P.vx = away * 260; P.vy = -260; }
  shake = 9; hitstop = 0.08; SFX.hurt();
  burst(pcx(), P.y + 20, 12, RED);
  if (P.hp <= 0) fall(src.who ? `${src.who} struck you down.` : src.mirror ? 'Your own ink struck you down.' : 'The Grasping struck you down.');
  return 'hit';
}
let nightOverride = null;
const SKY = { lat: 6.932, lon: 79.858, tz: 'Asia/Colombo', name: 'Colombo', offset: 0, speed: 0, t0: 0, cache: null, cacheReal: -1e9 };
(function initSky() {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('samsara.sky') || 'null'); } catch (_) {}
  if (saved && isFinite(saved.lat) && isFinite(saved.lon)) { Object.assign(SKY, { lat: saved.lat, lon: saved.lon, tz: saved.tz || SKY.tz, name: saved.name || 'Saved place' }); return; }
  let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) {}
  const p = PLACES.find(q => q[3] === tz);
  if (p) Object.assign(SKY, { lat: p[1], lon: p[2], tz, name: p[0] });
  else { const off = -new Date().getTimezoneOffset() / 60; Object.assign(SKY, { lat: 20, lon: off * 15, tz, name: `${tz} (guessed from your timezone)` }); }
})();
function saveSky() { try { localStorage.setItem('samsara.sky', JSON.stringify({ lat: SKY.lat, lon: SKY.lon, tz: SKY.tz, name: SKY.name })); } catch (_) {} SKY.cache = null; }
function skyDate() { return new Date(Date.now() + SKY.offset + (SKY.speed ? (performance.now() - SKY.t0) * SKY.speed : 0)); }
function skyFast(on) { if (on && !SKY.speed) { SKY.t0 = performance.now(); SKY.speed = 720; } else if (!on && SKY.speed) { SKY.offset += (performance.now() - SKY.t0) * SKY.speed; SKY.speed = 0; } SKY.cache = null; }
function skyState() {
  if (SKY.cache && performance.now() - SKY.cacheReal < (SKY.speed ? 40 : 500)) return SKY.cache;
  const d = skyDate(); let sun, moon, phase, lst = 0;
  try {
    const A = window.Astronomy, obs = new A.Observer(SKY.lat, SKY.lon, 0);
    const pos = b => { const eq = A.Equator(b, d, obs, true, true), hz = A.Horizon(d, obs, eq.ra, eq.dec, 'normal'); return { alt: hz.altitude, az: hz.azimuth }; };
    sun = pos(A.Body.Sun); moon = pos(A.Body.Moon); phase = A.MoonPhase(d); lst = (A.SiderealTime(d) + SKY.lon / 15 + 48) % 24;
  } catch (_) {
    const h = d.getUTCHours() + d.getUTCMinutes() / 60 + SKY.lon / 15;
    sun = { alt: 70 * Math.sin((h - 6) / 12 * Math.PI), az: ((h - 6) / 12) * 180 + 90 }; moon = { alt: -20, az: 0 }; phase = 90; lst = h;
  }
  const illum = (1 - Math.cos(phase * Math.PI / 180)) / 2;
  SKY.cache = { d, sun, moon, phase, illum, waxing: phase < 180, lst, dark: clamp((4 - sun.alt) / 16, 0, 1) }; SKY.cacheReal = performance.now();
  return SKY.cache;
}
function sunAlt() { if (nightOverride !== null) return nightOverride ? -30 : 55; return skyState().sun.alt; }
function isNight() { if (nightOverride !== null) return nightOverride; return skyState().sun.alt < -6; }
function moonLight() { const k = skyState(); return { illum: k.illum, waxing: k.waxing }; }
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const dirOf = az => COMPASS[Math.round(((az % 360) + 360) % 360 / 45) % 8];
function localTimeText(d) { try { return new Intl.DateTimeFormat('en-GB', { timeZone: SKY.tz, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(d); } catch (_) { return d.toUTCString().slice(5, 22); } }
function skyText() {
  const k = skyState(), up = b => b.alt > 0;
  const sun = up(k.sun) ? `the Sun is ${Math.round(k.sun.alt)}° high in the ${dirOf(k.sun.az)}` : `the Sun is ${Math.round(-k.sun.alt)}° below the ${dirOf(k.sun.az)} horizon`;
  const moon = `the Moon is ${Math.round(k.illum * 100)}% full and ${k.waxing ? 'growing' : 'shrinking'}, ${up(k.moon) ? `${Math.round(k.moon.alt)}° high in the ${dirOf(k.moon.az)}` : 'below the horizon'}`;
  return `${SKY.name} · ${localTimeText(k.d)}${SKY.offset || SKY.speed ? ' (moved by the time buttons)' : ''} · ${isNight() ? 'night' : k.sun.alt < 4 ? 'twilight' : 'day'}: ${sun}; ${moon}.`;
}
function bindSkyPanel() {
  const sel = $('skyPlace'); if (!sel) return;
  sel.innerHTML = `<option value="here">${esc(SKY.name)} (current)</option>` + PLACES.map((q, i) => `<option value="${i}">${q[0]}</option>`).join('');
  sel.addEventListener('change', () => { const v = sel.value; if (v !== 'here') { const q = PLACES[+v]; Object.assign(SKY, { lat: q[1], lon: q[2], tz: q[3], name: q[0] }); saveSky(); $('skyLat').value = SKY.lat; $('skyLon').value = SKY.lon; } });
  $('skyLat').value = SKY.lat; $('skyLon').value = SKY.lon;
  $('skySet').addEventListener('click', () => { const la = parseFloat($('skyLat').value), lo = parseFloat($('skyLon').value); if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { $('skyMsg').textContent = 'Latitude goes from -90 to 90 and longitude from -180 to 180.'; return; } let tz = SKY.tz; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) {} Object.assign(SKY, { lat: la, lon: lo, tz, name: `${la.toFixed(2)}, ${lo.toFixed(2)}` }); saveSky(); $('skyMsg').textContent = 'Place set. It stays on this device only.'; });
  $('skyGeo').addEventListener('click', () => {
    if (!navigator.geolocation) { $('skyMsg').textContent = 'This browser cannot share a location. Pick a city or type it in.'; return; }
    $('skyMsg').textContent = 'Asking your browser…';
    navigator.geolocation.getCurrentPosition(pos => { let tz = SKY.tz; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) {} Object.assign(SKY, { lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), tz, name: 'Your location' }); saveSky(); $('skyLat').value = SKY.lat; $('skyLon').value = SKY.lon; $('skyMsg').textContent = 'Using your location. It stays on this device only.'; },
      () => { $('skyMsg').textContent = 'The browser did not share a location. Pick a city or type it in.'; }, { timeout: 10000 });
  });
  const shift = h => { SKY.offset += h * 3600e3; SKY.cache = null; };
  $('skyM6').addEventListener('click', () => shift(-6)); $('skyM1').addEventListener('click', () => shift(-1)); $('skyP1').addEventListener('click', () => shift(1)); $('skyP6').addEventListener('click', () => shift(6));
  $('skyNowBtn').addEventListener('click', () => { skyFast(false); SKY.offset = 0; SKY.cache = null; $('skyFast').textContent = 'Watch a day pass'; });
  $('skyFast').addEventListener('click', () => { skyFast(!SKY.speed); $('skyFast').textContent = SKY.speed ? 'Stop the fast sky' : 'Watch a day pass'; });
  setInterval(() => { $('skyNow').textContent = skyText(); }, 500);
}
bindSkyPanel();
const spellCost = w => Math.round(w.cost * (w.school && P.school ? (w.school === P.school ? 0.8 : 1.25) : 1));
const rankOf = id => { const n = soul.ranks[id] || 0; return n >= 30 ? 3 : n >= 10 ? 2 : 1; };
function needsMissing(w, scroll) {
  const n = w.needs || {};
  if (scroll === undefined) scroll = P.noMana;
  if (n.focus && !scroll && P.stats.foc < n.focus) return `NEEDS FOCUS ${n.focus}`;
  if (n.night && !isNight()) return 'ONLY AT NIGHT';
  if (n.day && sunAlt() <= 0) return 'ONLY WHILE THE SUN IS UP';
  if (n.life && life.n < n.life) return 'NEEDS A PAST LIFE';
  return null;
}
function learnSpell(id, how) {
  if (soul.spells.has(id)) return false;
  soul.spells.add(id); const w = SPELL(id), free = P.noMana ? -1 : P.wordSlots.indexOf(null);
  if (free >= 0) P.wordSlots[free] = id;
  SFX.relic(); for (let i = 0; i < 24; i++) fx.push({ k: 'ink', x: pcx() + rnd(-30, 30), y: P.y + rnd(-20, P.h), vx: rnd(-30, 30), vy: -rnd(30, 90), life: rnd(0.5, 1.1) });
  showBanner({ t: 4.2, top: `A NEW SPELL: ${w.say.toUpperCase()}`, sub: `${how ? how + ' ' : ''}${w.what} ${P.noMana ? 'This body has no mana, but your soul keeps it for lives that do. Scrolls of it can be read in this one.' : `Say "${w.say}" aloud, or put it on keys 1 to 4 in Tab.${free >= 0 ? ` It is on key ${free + 1}.` : ''}`}` });
  return true;
}
let BQ = [];
const SET_KEY = 'samsara.settings'; let SETTINGS = { msg: 'fade' };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem(SET_KEY)) || {}); } catch (_) {}
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SETTINGS)); } catch (_) {} }
// enough time to read a message: about a quarter second a word, never less than it asked for
const readTime = b => 2 + String((b.top || '') + ' ' + (b.sub || '')).split(/\s+/).length * 0.27;
function closeBanner() { if (!banner) return false; banner = null; return true; }
const SCROLL_W = 0.1, SCRIBE_COST = { ink: 3, seeds: 20 };
function gainScroll(id, n, x, y) {
  P.scrolls[id] = (P.scrolls[id] || 0) + n;
  if (!P.wordSlots.includes(id)) { const free = P.wordSlots.indexOf(null); if (free >= 0) P.wordSlots[free] = id; }
  floater(x ?? pcx(), y ?? P.y - 40, `+${n} SCROLL${n > 1 ? 'S' : ''} OF ${SPELL(id).say.toUpperCase()}`, INK);
  if (!soul.memories.scroll) { soul.memories.scroll = 1; showBanner({ t: 4.4, top: 'A SCROLL', sub: `A body born with no mana cannot cast, but it can read. A scroll is one cast of ${SPELL(id).say} with no mana needed. Press its key (1 to 4) or say "${SPELL(id).say}" aloud. Write more at a shrine with Grasping ink.` }); }
}
function showBanner(b) { if (banner && banner.t > 0.6 && !banner.minor) BQ.push(b); else banner = b; }
function frontFoe(range, dyMax, skipBoss) { let best = null, bd = 1e9; for (const f of foes) { if (!f.alive || f.state === 'kneel' || f.hidden || (skipBoss && f.boss)) continue; const dx = (f.x + f.w / 2 - pcx()) * P.face; if (dx < -20 || dx > range || Math.abs(f.y + f.h / 2 - (P.y + P.h / 2)) > dyMax) continue; if (dx < bd) { bd = dx; best = f; } } return best; }
function groundBelow(x, y0) { for (let y = Math.max(0, y0); y < y0 + 520 && y < LH; y += 4) if (pointSolid(x, y)) return y; return null; }
function graspTarget() { let best = null, bd = 1e9; for (const f of foes) { if (!f.alive || f.state === 'kneel' || f.boss) continue; const dx = (f.x + 12 - pcx()) * P.face; if (dx < 0 || dx > 340 || Math.abs(f.gy - (P.y + P.h)) > 110) continue; if (dx < bd) { bd = dx; best = f; } } return best; }
function castWord(w, power) {
  if (P.dead || mode !== 'play') return;
  const spark = P.noMana && P.spark && !(P.scrolls[w.id] > 0) && soul.spells.has(w.id), scroll = P.noMana && !spark;
  if (scroll && !(P.scrolls[w.id] > 0)) { floater(pcx(), P.y - 30, `NO SCROLL OF ${w.say.toUpperCase()}`, PENCIL); return; }
  if (!scroll && !soul.spells.has(w.id)) { floater(pcx(), P.y - 30, `YOU DO NOT KNOW ${w.say.toUpperCase()} YET`, PENCIL); return; }
  if (!scroll && !P.wordSlots.includes(w.id)) { floater(pcx(), P.y - 30, `${w.say.toUpperCase()} IS NOT ON YOUR KEYS (TAB)`, PENCIL); return; }
  const why = needsMissing(w, scroll); if (why) { floater(pcx(), P.y - 30, why, PENCIL); return; }
  const cost = scroll ? 0 : spellCost(w);
  if (!scroll && P.mana < cost) { floater(pcx(), P.y - 30, 'NOT ENOUGH MANA', PENCIL); return; }
  faceAim();
  if (P.hitT > 0 || P.rollT > 0) return;
  let ax = mouse.in ? aimX() : pcx() + P.face * 160, ay = mouse.in ? aimY() : P.y;
  let pillarY = null, gt = null;
  if (w.id === 'pillar') { pillarY = groundBelow(ax, ay); if (pillarY === null || TEMPS.filter(t => t.pillar).length >= 2 && false) { floater(pcx(), P.y - 30, 'NO GROUND THERE', PENCIL); return; } }
  if (w.id === 'grasp') { gt = graspTarget(); if (!gt) { floater(pcx(), P.y - 30, 'NOTHING TO GRASP', PENCIL); return; } }
  if (w.id === 'quake' && !P.onG) { floater(pcx(), P.y - 30, 'ONLY ON THE GROUND', PENCIL); return; }
  if (w.id === 'karuna') { gt = frontFoe(320, 120); if (!gt) { floater(pcx(), P.y - 30, 'NO ONE IN FRONT OF YOU TO CALM', PENCIL); return; } }
  if (w.id === 'vajra') { gt = frontFoe(380, 170); if (!gt) { floater(pcx(), P.y - 30, 'NO FOE IN REACH', PENCIL); return; } }
  P.mana -= cost; SFX.word(); shake = 5;
  const rk = rankOf(w.id);
  power *= (1 + boonV('spell')) * (1 + wayBoon('dmg'));
  if (scroll) { P.scrolls[w.id]--; power *= 1.15; for (let i = 0; i < 10; i++) fx.push({ k: 'leaf', x: pcx() + P.face * 14 + rnd(-8, 8), y: P.y + 14 + rnd(-6, 6), vx: rnd(-40, 40), vy: -rnd(30, 80), life: 0.7 }); }
  else { power *= (1 + 0.04 * (P.stats.foc - 10)) * [1, 1, 1.2, 1.4][rk] * (w.school && w.school === P.school ? 1.15 : 1);
    soul.ranks[w.id] = (soul.ranks[w.id] || 0) + (P.school === 'Akasha' ? 1.5 : 1); if (rankOf(w.id) > rk) floater(pcx(), P.y - 52, `${w.say.toUpperCase()} GROWS STRONGER`, INK2); }
  if (w.id !== 'unseen') P.unseenT = 0;
  floater(pcx(), P.y - 34, scroll ? `SCROLL · ${w.say.toUpperCase()} · ${P.scrolls[w.id]} LEFT` : `${w.say.toUpperCase()} · ${Math.round(power * 100)}%`);
  const cx = pcx(), dmgMul = P.dmgMul;
  if (w.id === 'ignite') { const dmg = 28 * power * (P.school === 'Agni' ? 1.25 : 1) * dmgMul; const sx = cx + P.face * 20, sy = P.y + Math.min(18, P.h * 0.45), [ux, uy] = aimVec(sx, sy); shots.push({ fire: true, x: sx, y: sy, vx: ux * 640, vy: uy * 640, life: 1.2, dmg, r: 10 }); }
  if (w.id === 'shield') { P.shieldT = (P.school === 'Prithvi' ? 6 : 3) * (power >= 1 ? 1 : 0.85); }
  if (w.id === 'restore') { const h = Math.round(26 * power * (P.school === 'Jala' ? 1.4 : 1)); P.hp = Math.min(P.hpMax, P.hp + h); floater(cx, P.y - 14, `+${h}`); for (let i = 0; i < 12; i++) fx.push({ k: 'leaf', x: P.x + rnd(-10, 30), y: P.y + rnd(0, P.h), vx: 0, vy: -rnd(40, 90), life: 0.8 }); }
  if (w.id === 'gust') {
    for (const f of foes) if (f.alive && f.state !== 'kneel') { const dx = (f.x + 12 - cx) * P.face; if (dx > -10 && dx < 180 && Math.abs(f.gy - (P.y + P.h)) < 100) hurtFoe(f, 6 * power * dmgMul, false, { knock: 560, stun: 0.9 }); }
    if (!P.onG && !P.inWater) { P.vy = Math.min(P.vy, -600); P.vx += P.face * 140; }
    for (let i = 0; i < 14; i++) fx.push({ k: 'wind', x: cx + P.face * rnd(10, 60), y: P.y + rnd(0, P.h), vx: P.face * rnd(300, 520), vy: rnd(-30, 30), life: rnd(0.25, 0.45) });
  }
  if (w.id === 'pillar') {
    if (TEMPS.length >= 2) TEMPS.shift();
    const t = { pillar: true, x: ax - 28, y: pillarY - 110, w: 56, h: 110, t: 8 * power, rise: 0 };
    TEMPS.push(t); burst(ax, pillarY, 16, INK2, 200); tone(80, 160, 0.5, 'sawtooth', 0.05);
    if (overlap(P, t)) { P.y = t.y - P.h; P.vy = 0; }
  }
  if (w.id === 'monsoon') { RAINS.push({ x: ax - 190, w: 380, t: 6 * power }); tone(2000, 400, 1.2, 'sawtooth', 0.01); }
  if (w.id === 'unseen') { P.unseenT = (isNight() ? 8 : 5) * power; for (const f of foes) if (f.alive && (f.state === 'chase' || f.state === 'wind')) { f.state = 'idle'; f.vx = 0; } }
  if (w.id === 'embers') { for (let i = 0; i < 7; i++) shots.push({ fire: true, ember: true, x: cx + P.face * (70 + i * 46), y: P.y - 240 - i * 38, vx: P.face * 30, vy: 620, life: 1.8, dmg: 16 * power * dmgMul, r: 9 }); }
  if (w.id === 'echo') { const past = soul.bodies.filter(b => b.life !== life.n).pop(); ALLY = { x: cx - P.face * 30, y: P.y + P.h - 26, t: 10 * power, cd: 0, looks: past ? past.looks : P.looks, power }; for (let i = 0; i < 20; i++) fx.push({ k: 'ink', x: ALLY.x + rnd(-15, 15), y: ALLY.y + rnd(-30, 20), vx: rnd(-20, 20), vy: -rnd(10, 60), life: 0.8 }); }
  if (w.id === 'grasp') {
    gt.x = clamp(cx + P.face * 34 - 12, gt.l, gt.r - gt.w); gt.state = 'stun'; gt.t = 1.1; gt.vx = 0; gt.flash = 0.2;
    P.seeds += 10; floater(gt.x + 12, gt.y - 24, '+10 SEEDS TAKEN', RED);
    for (let i = 0; i < 10; i++) fx.push({ k: 'ink', x: gt.x + 12 + rnd(-10, 10), y: gt.y + rnd(0, 40), vx: -P.face * rnd(100, 240), vy: rnd(-40, 40), life: 0.4 });
    if (!life.grasped) { life.grasped = true; deed('You used greed’s own spell.', -1, { kind: 'greed', target: gt }); }
  }
  if (w.id === 'shani') { P.shaniT = 6 * power; tone(60, 40, 1.5, 'sine', 0.12); shake = 10; }
  if (w.id === 'tide') { const m = moonLight(), mul = 0.5 + 2 * m.illum; P.tideT = 6; P.tideRate = 32 * mul * power / 6; floater(cx, P.y - 52, `THE MOON IS ${Math.round(m.illum * 100)}% FULL`, INK2); }
  if (w.id === 'starfall') { let n = 0; for (const f of foes) if (f.alive && f.state !== 'kneel' && visible(f, 0)) { hurtFoe(f, 30 * power * dmgMul, true); n++; for (let i = 0; i < 6; i++) fx.push({ k: 'star', x: f.x + 12 + rnd(-6, 6), y: f.y - 200 + i * 30, vx: 0, vy: 900, life: 0.25 }); } if (!n) floater(cx, P.y - 52, 'NO FOE IN SIGHT', PENCIL); shake = 12; }
  if (w.id === 'quake') {
    const gy = P.y + P.h; for (const d of [-1, 1]) WAVES.push({ x: cx + d * 18, dir: d, gy, sp: 430, left: 420 * clamp(power, 0.8, 1.4), dmg: 22 * power * dmgMul, h: 36, hit: new Set() });
    shake = 12; burst(cx, gy, 22, INK2, 240); tone(70, 40, 0.5, 'sawtooth', 0.08);
  }
  if (w.id === 'wisps') { WISPS = [0, 1, 2].map(i => ({ a: i * 2.094, t: 12 * power, x: cx, y: P.y + 18, tg: null, dmg: 14 * power * dmgMul })); tone(500, 900, 0.3, 'triangle', 0.04); }
  if (w.id === 'inkstep') {
    const [ux, uy] = mouse.in ? aimVec(cx, P.y + P.h / 2) : [P.face, 0], dist = 200 * clamp(power, 0.8, 1.4), ox = P.x, oy = P.y;
    let nx = P.x, ny = P.y; const cut = new Set(); for (let d = 8; d <= dist; d += 8) { const tx = P.x + ux * d, ty = P.y + uy * d; if (tx < 0 || tx > LW - P.w || ty < 0 || blocked({ x: tx, y: ty, w: P.w, h: P.h })) break; nx = tx; ny = ty; for (const f of foes) if (f.boss && f.ar.gift === 'inkstep' && f.alive && !f.hidden && overlap({ x: tx, y: ty, w: P.w, h: P.h }, f)) cut.add(f); }
    for (const f of cut) hurtFoe(f, 30 * power * dmgMul, true, { spell: 'inkstep' });
    for (let i = 0; i < 14; i++) { const k = i / 13; fx.push({ k: 'ink', x: ox + P.w / 2 + (nx - ox) * k + rnd(-6, 6), y: oy + P.h / 2 + (ny - oy) * k + rnd(-14, 14), vx: rnd(-20, 20), vy: -rnd(10, 50), life: rnd(0.4, 0.8) }); }
    P.x = nx; P.y = ny; P.vy = Math.min(0, P.vy) * 0.3; P.vx = ux * 120; P.inv = Math.max(P.inv, 0.35); P.inkT = 0.35; P.hang = null; P.ladder = null; P.cling = 0; P.glide = false; P.grabbed = 0;
    tone(900, 200, 0.18, 'sine', 0.05);
  }
  if (w.id === 'surya') {
    const alt = sunAlt(), k = Math.sin(clamp(alt, 0, 90) * Math.PI / 180), dmg = (18 + 42 * k) * power * dmgMul; let n = 0;
    for (const f of foes) if (f.alive && f.state !== 'kneel' && !f.hidden && Math.abs(f.x + f.w / 2 - ax) < 56 && visible(f, 0)) { hurtFoe(f, dmg, true); f.burnT = 2; n++; }
    fx.push({ k: 'beam', x: ax, y: groundBelow(ax, camY) ?? camY + H, life: 0.6 }); shake = 8; tone(1800, 600, 0.5, 'triangle', 0.05);
    floater(cx, P.y - 52, `THE SUN IS ${Math.round(alt)}° HIGH`, INK2);
  }
  if (w.id === 'karuna') {
    gt.calmT = (gt.boss ? 2 : 8) * power; gt.vx = 0; if (!gt.boss && gt.state !== 'stun') gt.state = 'idle';
    floater(gt.x + gt.w / 2, gt.y - 24, gt.boss ? 'IT HESITATES' : 'IT LOWERS ITS WEAPON', INK2);
    for (let i = 0; i < 12; i++) fx.push({ k: 'leaf', x: gt.x + gt.w / 2 + rnd(-16, 16), y: gt.y + rnd(0, gt.h), vx: 0, vy: -rnd(20, 60), life: 1 });
  }
  if (w.id === 'vajra') {
    const chain = [gt]; while (chain.length < 3) { const c = chain[chain.length - 1]; let nb = null, bd = 230; for (const f of foes) if (f.alive && f.state !== 'kneel' && !f.hidden && !chain.includes(f)) { const d = Math.hypot(f.x - c.x, f.y - c.y); if (d < bd) { bd = d; nb = f; } } if (!nb) break; chain.push(nb); }
    const pts = [[cx + P.face * 14, P.y + 16]]; chain.forEach((f, i) => { pts.push([f.x + f.w / 2, f.y + f.h / 2]); hurtFoe(f, [24, 18, 12][i] * power * dmgMul, false, { stun: 0.5 }); });
    fx.push({ k: 'bolt', pts, x: 0, y: 0, life: 0.3 }); shake = 9; tone(2400, 80, 0.25, 'sawtooth', 0.06);
  }
  if (w.id === 'firewind') {
    for (const f of foes) if (f.alive && f.state !== 'kneel') { const dx = (f.x + 12 - cx) * P.face; if (dx > -10 && dx < 210 && Math.abs(f.gy - (P.y + P.h)) < 110) hurtFoe(f, 20 * power * dmgMul, true, { knock: 440, stun: 0.8 }); }
    for (let i = 0; i < 26; i++) fx.push({ k: 'flame', x: cx + P.face * rnd(10, 40), y: P.y + rnd(5, P.h - 5), vx: P.face * rnd(260, 520), vy: rnd(-80, 40), life: rnd(0.3, 0.5) });
  }
}
let TEMPS = [], RAINS = [], ALLY = null, WAVES = [], WISPS = [];
/* ---------- chants: weapon blessings and summoning rituals, spoken aloud, no mana needed ---------- */
const CHANTS = [
  { id: 'agni', kind: 'bless', name: 'Agni blessing', line: 'Fire of the first morning, burn what binds me', what: 'Your weapon burns: it hits harder and sets foes burning.', how: 'You were born knowing it.' },
  { id: 'jala', kind: 'bless', name: 'Jala blessing', line: 'Water remembers every wound, let it close', what: 'Every hit you land heals you a little.', how: 'Carved on the floor of the pool.' },
  { id: 'vayu', kind: 'bless', name: 'Vayu blessing', line: 'Wind without a home, carry me now', what: 'You strike faster, and quick strikes send a small wind cut.', how: 'Carved at the edge of the wind gap.' },
  { id: 'prithvi', kind: 'bless', name: 'Prithvi blessing', line: 'Mountain under my feet, stand before me', what: 'Your hits stun far longer and throw foes back. Heavy hits shake the ground.', how: 'Carved low in the low tunnel.' },
  { id: 'akasha', kind: 'bless', name: 'Akasha blessing', line: 'Silence holds every sound, let the sky open', what: 'Every hit lands again a moment later, at half strength.', how: 'Carved at the far end of the long tunnel.' },
  { id: 'deva', kind: 'summon', name: 'Call the Shining Ones', line: 'Shining ones above the clouds, come down and stand with me', what: 'A deva stays above you for 20 seconds, healing you and guarding you from a hit now and then.', offer: { petal: 1 }, needs: 'good', how: 'Carved where the arena begins.' },
  { id: 'asura', kind: 'summon', name: 'Call the Proud Ones', line: 'Proud ones who never kneel, fight beside me now', what: 'An asura fights for you for 20 seconds. When it leaves, it takes its price in seeds.', offer: { ink: 2 }, how: 'Carved in the arena, near the forge.' },
  { id: 'preta', kind: 'summon', name: 'Call the Hungry Ones', line: 'Hungry ones who are never full, eat from my enemies', what: 'A hungry ghost drifts to your foes for 20 seconds, draining them and bringing you their seeds.', offer: { seeds: 30 }, how: 'Carved on the lower floor below the plateau.' },
  { id: 'tiryak', kind: 'summon', name: 'Call the Forest Kin', line: 'Brothers of the forest, run with me', what: 'A spirit tiger hunts beside you for 20 seconds. It only answers a body born with no mana.', offer: { wood: 1 }, needs: 'nomana', how: 'Carved near the horse in the village.' },
  { id: 'naraka', kind: 'summon', name: 'Call the Burning Ones', line: 'Burning ones below the earth, rise and break them', what: 'Fire bursts up under every foe you can see for 5 seconds. It burns you too.', offer: { ember: 1 }, how: 'Carved in the dark, by the burning ground.' },
];
CHANTS.forEach(c => { c.words = c.line.toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean); });
const CHANT = id => CHANTS.find(c => c.id === id);
const INSCRIPTIONS = LEVEL.inscriptions;
const nearInscription = () => INSCRIPTIONS.find(q => Math.abs(pcx() - q.x) < 40 && Math.abs(P.y + P.h - q.gy) < 40);
let CHS = null, SUMMONS = [], ECHO_HITS = [];
function matchWords(target, heard) {
  const out = target.map(() => false); let j = 0;
  for (let i = 0; i < target.length; i++) {
    let best = -1, bs = 0;
    for (let k = j; k < Math.min(heard.length, j + 8); k++) { const sc = sim(target[i], heard[k]); if (sc > bs) { bs = sc; best = k; } }
    if (bs >= (target[i].length <= 3 ? 0.5 : 0.62)) { out[i] = true; j = best + 1; }
  }
  return out;
}
function chantBlocked(c) {
  if (c.needs === 'good' && soul.karma < 0) return 'THE SHINING ONES DO NOT ANSWER WHILE YOUR KARMA IS IN DEBT';
  if (c.needs === 'nomana' && !P.noMana) return 'THE FOREST KIN ONLY ANSWER A BODY BORN WITH NO MANA';
  if (c.kind === 'summon' && P.summoned && P.summoned.has(c.id)) return 'THEY ALREADY CAME · REST AT A SHRINE TO CALL THEM AGAIN';
  if (c.kind === 'summon' && SUMMONS.length) return 'ONE CALLING AT A TIME';
  if (c.offer && !canPay(c.offer)) return `THEY ASK FOR AN OFFERING: ${costText(c.offer).toUpperCase()}`;
  return null;
}
function openChantPick() {
  if (CHS && CHS.state === 'chant') return;
  const page = !CHS ? 'bless' : CHS.page === 'bless' ? 'summon' : null;
  if (!page) { CHS = null; return; }
  CHS = { state: 'pick', page, list: CHANTS.filter(c => c.kind === page && soul.chants.has(c.id) && P.prepared.has(c.id)) };
}
function startChant(c) {
  const why = chantBlocked(c); if (why) { floater(pcx(), P.y - 30, why, PENCIL); CHS = null; return; }
  const shrine = nearShrine() >= 0;
  CHS = { state: 'chant', c, t: 0, limit: c.words.length * 0.75 + 3.5, matched: c.words.map(() => false), base: null, hold: 0, shrine };
  P.atk = null; P.charging = false; SFX.drink(); banner = null; zoneTag = null;
  if (micMode === 'ptt' && !pttHeld) floater(pcx(), P.y - 40, 'HOLD V AND SPEAK', INK2);
}
function chantHeard(tokens) {
  if (!CHS || CHS.state !== 'chant') return;
  const tw = CHS.c.words; let m = matchWords(tw, tokens);
  // starting the line over: try again from every place the first word comes back
  for (let k = 1; k < tokens.length; k++) if (sim(tokens[k], tw[0]) >= 0.62) { const m2 = matchWords(tw, tokens.slice(k)); m = m.map((v, i) => v || m2[i]); }
  CHS.matched = CHS.matched.map((v, i) => v || m[i]);
}
function cancelChant(why) { if (!CHS) return; if (CHS.state === 'chant' && why) floater(pcx(), P.y - 40, why, RED); CHS = null; }
function chantStep(dt, mx) {
  if (!CHS) return;
  if (CHS.state === 'pick') {
    for (let i = 0; i < 9; i++) if (pressed['h' + (i + 1)]) { pressed['h' + (i + 1)] = false; const c = CHS.list[i]; if (c) startChant(c); else CHS = null; return; }
    if (pressed.chant) openChantPick();
    return;
  }
  CHS.t += dt;
  if (mx || pressed.jump || pressed.roll) { cancelChant('YOU STOP CHANTING'); return; }
  // without a voice: hold C. It takes 3 seconds and gives 85% of a clean spoken chant
  if (held.chant) CHS.hold += dt;
  else if (CHS.hold > 0) { if (CHS.hold < 0.25 && micMode !== 'off') cancelChant('YOU STOP CHANTING'); else cancelChant('YOU LET GO TOO SOON'); return; }
  if (CHS.hold > 0) { const need = 3, n = Math.floor(CHS.c.words.length * Math.min(1, CHS.hold / need)); CHS.matched = CHS.matched.map((v, i) => v || i < n); if (CHS.hold >= need) { CHS.silent = true; finishChant(0.85, 1); return; } }
  const k = CHS.matched.filter(Boolean).length / CHS.matched.length;
  if (k >= 0.999) { finishChant(1, CHS.t <= CHS.c.words.length * 0.5 + 2 ? 1 : 0.9); return; }
  if (CHS.t >= CHS.limit) { if (k >= 0.5) finishChant(k, 0.85); else cancelChant('THE CHANT FADES · TOO FEW WORDS WERE HEARD'); }
}
function finishChant(clean, pace) {
  const c = CHS.c, shrine = CHS.shrine; let pw = clean * pace * (shrine ? 1.2 : 1) * (1 + boonV('chant')); CHS = null;
  if (c.offer) { if (!canPay(c.offer)) { floater(pcx(), P.y - 30, 'THE OFFERING IS GONE', PENCIL); return; } pay(c.offer); }
  SFX.word(); shake = 6; for (let i = 0; i < 26; i++) fx.push({ k: 'ink', x: pcx() + rnd(-30, 30), y: P.y + rnd(-10, P.h), vx: rnd(-40, 40), vy: -rnd(30, 110), life: rnd(0.5, 1.2) });
  floater(pcx(), P.y - 44, `${c.name.toUpperCase()} · ${Math.round(pw * 100)}%`);
  voiceLog(`chant: ${c.name} at ${Math.round(pw * 100)}%`, true);
  if (c.kind === 'bless') { P.bless = { el: c.id, t: (30 + 60 * clamp(pw, 0, 1.2)) * (shrine ? 1.5 : 1) * (inHand('empty') ? 1.5 : 1), pow: pw }; return; }
  P.summoned = P.summoned || new Set(); P.summoned.add(c.id);
  const sm = { id: c.id, x: pcx() - P.face * 40, y: P.y + 10, t: (c.id === 'naraka' ? 5 : 20) * summonLast(), cd: 0.5, pow: pw * summonPow(), face: P.face, swing: 0 };
  SUMMONS.push(sm); tone(110, 330, 1.2, 'sine', 0.06);
  banner = { t: 2.4, top: c.name.toUpperCase(), sub: c.what };
}
const nearestFoe = (x, y, r) => { let best = null, bd = r; for (const f of foes) if (f.alive && f.state !== 'kneel') { const d = Math.hypot(f.x + 12 - x, f.y + 26 - y); if (d < bd) { bd = d; best = f; } } return best; };
function updateChants(dt) {
  if (P.bless) { P.bless.t -= dt; if (P.bless.t <= 0) { floater(pcx(), P.y - 30, 'THE BLESSING FADES', PENCIL); P.bless = null; }
    else if (Math.random() < dt * 14) { const el = P.bless.el, hx = pcx() + P.face * 22, hy = P.y + (P.h > 40 ? 20 : 12); fx.push(el === 'agni' ? { k: 'flame', x: hx + rnd(-6, 6), y: hy, vx: rnd(-10, 10), vy: -rnd(40, 90), life: 0.35 } : el === 'jala' ? { k: 'bub', x: hx, y: hy, vx: 0, vy: 50, life: 0.5 } : el === 'vayu' ? { k: 'wind', x: hx, y: hy + rnd(-8, 8), vx: P.face * 200, vy: 0, life: 0.2 } : el === 'prithvi' ? { k: 'dot', x: hx, y: hy, vx: rnd(-40, 40), vy: -rnd(20, 80), life: 0.4, c: INK2 } : { k: 'ring', x: hx, y: hy, life: 0.35 }); } }
  for (const e of ECHO_HITS) { e.t -= dt; if (e.t <= 0 && e.f.alive) { hurtFoe(e.f, e.dmg, false, { echo: true }); for (let i = 0; i < 6; i++) fx.push({ k: 'ring', x: e.f.x + 12, y: e.f.y + 26, life: 0.3 }); } }
  ECHO_HITS = ECHO_HITS.filter(e => e.t > 0);
  for (const f of foes) if (f.alive && f.burnT > 0) { f.burnT -= dt; f.hp = Math.max(1, f.hp - 5 * dt); if (Math.random() < dt * 10) fx.push({ k: 'flame', x: f.x + rnd(4, 20), y: f.y + rnd(10, 40), vx: 0, vy: -60, life: 0.3 }); }
  for (const sm of SUMMONS) {
    sm.t -= dt; sm.cd -= dt; if (sm.swing > 0) sm.swing -= dt;
    const tg = nearestFoe(sm.x, sm.y, 460);
    if (sm.id === 'deva') { const tx = pcx() - P.face * 26, ty = P.y - 48 + Math.sin(clock * 2) * 6; sm.x += (tx - sm.x) * Math.min(1, dt * 4); sm.y += (ty - sm.y) * Math.min(1, dt * 4); P.hp = Math.min(P.hpMax, P.hp + 4 * sm.pow * dt); if (sm.cd <= 0) { sm.cd = 6; P.shieldT = Math.max(P.shieldT, 1.6); floater(sm.x, sm.y - 20, 'THE DEVA GUARDS YOU', INK2); } }
    else if (sm.id === 'naraka') { if (sm.cd <= 0) { sm.cd = 1; let n = 0; for (const f of foes) if (f.alive && f.state !== 'kneel' && visible(f, 0)) { hurtFoe(f, 18 * sm.pow, true); n++; for (let i = 0; i < 12; i++) fx.push({ k: 'flame', x: f.x + 12 + rnd(-10, 10), y: f.gy - rnd(0, 20), vx: rnd(-20, 20), vy: -rnd(200, 420), life: 0.45 }); } if (n) { P.hp = Math.max(1, P.hp - 3); floater(pcx(), P.y - 20, 'THE FIRE BURNS YOU TOO', RED); } } }
    else {
      const sp = sm.id === 'tiryak' ? 420 : sm.id === 'preta' ? 150 : 230;
      const tx = tg ? tg.x + 12 - Math.sign(tg.x + 12 - sm.x || 1) * (sm.id === 'preta' ? 6 : 30) : pcx() - P.face * 44, ty = tg ? tg.y + 26 : P.y + P.h - 30 + Math.sin(clock * 3) * 4;
      const dx = tx - sm.x, dy = ty - sm.y, d = Math.hypot(dx, dy) || 1, v = Math.min(sp, d * 6); sm.x += dx / d * v * dt; sm.y += dy / d * v * dt; sm.face = (tg ? tg.x + 12 : pcx()) > sm.x ? 1 : -1;
      if (tg && d < 48) {
        if (sm.id === 'asura' && sm.cd <= 0) { sm.cd = 0.9; sm.swing = 0.25; hurtFoe(tg, 14 * sm.pow * P.dmgMul, true); }
        if (sm.id === 'tiryak' && sm.cd <= 0) { sm.cd = 1.1; sm.swing = 0.3; hurtFoe(tg, 15 * sm.pow * P.dmgMul, true, { knock: 420 }); }
        if (sm.id === 'preta') { const drain = 6 * sm.pow * dt; tg.hp -= drain; sm.acc = (sm.acc || 0) + drain; if (sm.acc >= 2) { sm.acc -= 2; P.seeds++; } if (tg.hp <= 0) { tg.hp = 1; hurtFoe(tg, 5, false); } }
      }
    }
    if (sm.t <= 0) {
      if (sm.id === 'asura') { const take = Math.min(30, P.seeds); P.seeds -= take; floater(pcx(), P.y - 30, `THE ASURA TAKES ITS PRICE · ${take} SEEDS`, RED); }
      for (let i = 0; i < 18; i++) fx.push({ k: 'ink', x: sm.x + rnd(-14, 14), y: sm.y + rnd(-30, 20), vx: rnd(-20, 20), vy: -rnd(20, 60), life: 0.8 });
    }
  }
  SUMMONS = SUMMONS.filter(sm => sm.t > 0);
}
function readInscription(q) {
  const c = CHANT(q.id); banner = null; mode = 'stone'; clearHeld();
  $('gearIn').innerHTML = `<span class="eyebrow">A carved chant · Esc to leave</span><h2>${esc(c.name)}</h2><p class="hand">“${esc(c.line)}”</p><p>${esc(c.what)}${c.offer ? ` Offering: ${esc(costText(c.offer))}.` : ''}</p>
    <div class="row">${soul.chants.has(c.id) ? '<span class="note">You already know this chant.</span>' : '<button class="btn" id="learnChant" type="button">Learn it</button>'}</div><p class="note">Press C during play, choose the chant, then speak the line (hold V if you use push to talk). With the mic off, hold C instead.</p>`;
  $('ovGear').hidden = false;
  const b = $('learnChant'); if (b) b.addEventListener('click', () => { soul.chants.add(c.id); const room = P.prepared.size < P.chantSlots; if (room) P.prepared.add(c.id); closePanel(); SFX.relic(); banner = { t: 3.6, top: `A NEW CHANT: ${c.name.toUpperCase()}`, sub: `“${c.line}”. ${room ? 'Press C to chant it.' : `Your ${P.chantSlots} chant slots are full. Prepare it at a shrine (Tab, Chants).`}` }; });
}
const rainAt = x => RAINS.some(r => x > r.x && x < r.x + r.w);
function updateMagic(dt) {
  for (const t of TEMPS) { t.t -= dt; t.rise = Math.min(1, t.rise + dt * 6); }
  TEMPS = TEMPS.filter(t => { if (t.t <= 0) { burst(t.x + 28, t.y + 20, 14, INK2, 160); return false; } return true; });
  for (const r of RAINS) r.t -= dt; RAINS = RAINS.filter(r => r.t > 0);
  if (P.unseenT > 0) P.unseenT -= dt;
  if (P.shaniT > 0) P.shaniT -= dt;
  if (P.inkT > 0) P.inkT -= dt;
  for (const v of WAVES) {
    const st = v.sp * dt; v.x += v.dir * st; v.left -= st;
    if (v.left <= 0 || pointSolid(v.x + v.dir * 6, v.gy - 12) || !pointSolid(v.x, v.gy + 4)) { v.left = 0; continue; }
    if (v.hostile) { if (!v.hitP && !P.dead && P.y + P.h > v.gy - v.h && P.y < v.gy && Math.abs(pcx() - v.x) < 16) { v.hitP = true; if (P.noMana && P.parryT > 0) { v.left = 0; P.parryT = 0; SFX.parry(); floater(pcx(), P.y - 30, 'BROKEN'); burst(v.x, v.gy, 14, v.fire ? RED : INK2, 200); continue; } hurtPlayer(v.dmg, { x: v.x - v.dir * 30, w: 0, who: v.who }, false); } }
    else for (const f of foes) if (f.alive && !v.hit.has(f) && f.state !== 'kneel' && !f.hidden && Math.abs(f.x + f.w / 2 - v.x) < f.w / 2 + 12 && f.y + f.h > v.gy - v.h && f.y + f.h < v.gy + 30) { v.hit.add(f); hurtFoe(f, v.dmg, true, { stun: 0.8, knock: 60, spell: 'quake' }); }
  }
  WAVES = WAVES.filter(v => v.left > 0);
  for (const w of WISPS) {
    w.t -= dt;
    if (w.tg && (!w.tg.alive || w.tg.hidden || w.tg.calmT > 0)) w.tg = null;
    if (!w.tg) { let bd = 260; for (const f of foes) if (f.alive && f.state !== 'kneel' && !f.hidden && !(f.calmT > 0) && f.state !== 'wait') { const d = Math.hypot(f.x + f.w / 2 - w.x, f.y + f.h / 2 - w.y); if (d < bd) { bd = d; w.tg = f; } } }
    if (w.tg) { const f = w.tg, dx = f.x + f.w / 2 - w.x, dy = f.y + f.h / 2 - w.y, d = Math.hypot(dx, dy) || 1; w.x += dx / d * 470 * dt; w.y += dy / d * 470 * dt; if (d < 14 + f.w / 2) { hurtFoe(f, w.dmg, false, { spell: 'wisps' }); f.burnT = 2; w.t = 0; burst(w.x, w.y, 8, RED, 160); } }
    else { w.a += dt * 3.2; const tx = pcx() + Math.cos(w.a) * 34, ty = P.y + 18 + Math.sin(w.a) * 16; w.x += (tx - w.x) * Math.min(1, dt * 10); w.y += (ty - w.y) * Math.min(1, dt * 10); }
  }
  WISPS = WISPS.filter(w => w.t > 0);
  if (P.tideT > 0) { P.tideT -= dt; P.hp = Math.min(P.hpMax, P.hp + P.tideRate * dt); if (Math.random() < dt * 8) fx.push({ k: 'bub', x: pcx() + rnd(-12, 12), y: P.y + P.h, vx: 0, vy: -70, life: 0.8 }); }
  if (ALLY) {
    const a = ALLY; a.t -= dt; a.cd -= dt;
    let tg = null, bd = 1e9; for (const f of foes) if (f.alive && f.state !== 'kneel') { const d = Math.hypot(f.x + 12 - a.x, f.y + 26 - a.y); if (d < 420 && d < bd) { bd = d; tg = f; } }
    const tx = tg ? tg.x + 12 - Math.sign(tg.x + 12 - a.x || 1) * 26 : pcx() - P.face * 34, ty = tg ? tg.y + 26 : P.y + P.h - 30 + Math.sin(clock * 3) * 4;
    a.face = (tg ? tg.x + 12 : pcx()) > a.x ? 1 : -1;
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(260, d * 6);
    a.x += dx / d * sp * dt; a.y += dy / d * sp * dt;
    if (tg && bd < 46 && a.cd <= 0) { a.cd = 0.6; a.swing = 0.18; hurtFoe(tg, 10 * a.power * P.dmgMul, false); }
    if (a.swing > 0) a.swing -= dt;
    if (a.t <= 0) { for (let i = 0; i < 16; i++) fx.push({ k: 'ink', x: a.x + rnd(-12, 12), y: a.y + rnd(-30, 20), vx: rnd(-20, 20), vy: -rnd(20, 60), life: 0.8 }); ALLY = null; }
  }
}
function nearShrine() { const cx = P.x + P.w / 2, fy = P.y + P.h; return SHRINES.findIndex(s => Math.abs(cx - s.x) < 70 && Math.abs(fy - s.gy) < 40); }
function use() {
  const sh = nearShrine();
  if (sh >= 0) { if (P.mount) dismount(false); rest(sh); openShrine(sh); return; }
  if (nearForge() >= 0 && !P.mount) { openForge(); return; }
  { const st = nearStone(); if (st && !P.mount) { useStone(st); return; } }
  { const q = nearInscription(); if (q && !P.mount) { readInscription(q); return; } }
  if (nearStones() && !P.mount) { openStones(); return; }
  if (nearDebt() && !P.mount) { payDebt(); return; }
  if (Math.abs(pcx() - DOG.x) < 50 && Math.abs(P.y + P.h - DOG.gy) < 40 && !P.mount) { feedDog(); return; }
  { const t = nearTablet(); if (t && !P.mount) { readTablet(t); return; } }
  if (nearTeacher() && !P.mount) { openTeacher(); return; }
  if (nearSeat() && !P.mount) { openMeditation(-1, 62); return; }
  const cx = pcx(), fy = P.y + P.h;
  if (P.mount) { if (P.onG) dismount(false); return; }
  if (horse.state !== 'away' && horse.state !== 'fled' && Math.abs(cx - horse.x) < 56 && Math.abs(fy - horse.gy) < 40 && P.onG) {
    if (horse.state === 'wild') {
      if (P.lotus > 0) { P.lotus--; horse.state = 'idle'; horse.trust = 1; SFX.relic(); banner = { t: 4, top: 'THE HORSE TRUSTS YOU', sub: 'A stand-in for taming, which we design later. E to ride. Press 8 to call it on open ground.' }; }
      else { floater(horse.x, horse.gy - 80, 'THE HORSE SNIFFS YOUR EMPTY HANDS', PENCIL); }
    } else mount();
    return;
  }
  if (Math.abs(cx - HOME.x) < 40 && Math.abs(fy - HOME.gy) < 40 && !P.mount) { openContainer(soul.home, 'Your chest', true); return; }
  const ci = CHESTS.findIndex(c => Math.abs(cx - c.x) < 40 && Math.abs(fy - c.gy) < 40);
  if (ci >= 0) { openChest(CHESTS[ci]); return; }
  if (Math.abs(P.x - villager.x) < 70 && Math.abs(P.y + P.h - villager.gy) < 40) {
    if (!villager.helped && life.n === 1 && !soul.memories.gift) {
      if (P.lotus > 0) { P.lotus--; villager.helped = true; soul.memories.gift++; deed('You gave your lotus to the wounded villager.', 2, { kind: 'gift', target: villager }); villager.line = 'Thank you, stranger. I will not forget this.'; villager.talkT = 4; }
      else { villager.line = 'Please… a lotus… (you have none)'; villager.talkT = 3; }
    } else talkVillager();
  }
}
function talkVillager() {
  const m = soul.memories, lines = [];
  if (life.n > 1) {
    if (m.gift) lines.push('A stranger gave me their lotus when I was dying. I never learned their name. You have their look about you.');
    if (m.spared) lines.push('Some of the Grasping came back and put down their sticks. Someone showed them mercy on the old road.');
    if (m.slain) lines.push('They say a cruel one cut down those who begged for mercy. Be careful out there.');
  }
  if (soul.karma >= 5) lines.unshift('You have a calm about you, stranger. Even the Grasping seem to lower their sticks when you pass.');
  else if (soul.karma <= -3) lines.unshift('Something heavy follows you, stranger. I can almost see it over your shoulder.');
  if (soul.debt && !soul.debt.paid) lines.unshift('Someone waits for you out there. Someone you owe. I do not know how I know.');
  lines.push('There is a feather on the plank by the hut. My grandmother said it fell from Garuda himself.');
  if ((villager.helped || soul.memories.gift) && !soul.spells.has('unseen')) { villager.line = 'You gave when you had little. Let me give you something back: my mother taught me how to go unseen.'; villager.talkT = 5; learnSpell('unseen', 'The villager teaches you.'); return; }
  lines.push('That horse has grazed by my hut for years. It only trusts someone who gives it something.');
  lines.push('The road east is a proving ground. Planks, ledges, a pool, a chimney, and the dark at the end.');
  if (!villager.helped && life.n === 1) lines.unshift('Please… a lotus… I am hurt. (Press E to give one)');
  villager.idx = ((villager.idx ?? -1) + 1) % lines.length; villager.line = lines[villager.idx]; villager.talkT = 5;
}
function rest(i) {
  P.hp = P.hpMax; P.lotus = P.lotusMax; P.st = P.stMax; P.mana = P.manaMax; P.breath = BREATH; P.torch.fuel = P.torchMax; P.knives = P.knivesMax; P.shrine = i; P.visited.add(i); SFX.rest();
  drops = []; spawnFoes(); shots = []; resetCrumbles(); resetNodes(); P.summoned = new Set();
  if (horse.state !== 'wild') { horse.hp = horse.hpMax; if (horse.state === 'fled') horse.state = 'away'; }
  saveSoon();
  banner = { t: 2.4, top: 'RESTED', sub: `${SHRINES[i].name}. If you fall, you wake here. The Grasping return, and so do trees, ore and flowers.` };
}

/* ---------- foes ---------- */
function foeHitbox(f) {
  if (f.high) return { x: f.face > 0 ? f.x + f.w - 6 : f.x - 58, y: f.gy - 60, w: 64, h: 22 };
  return { x: f.face > 0 ? f.x + f.w : f.x - 44, y: f.y + 8, w: 44, h: 30 };
}
function updateFoes(dt0) {
  for (const f of foes) {
    if (!f.alive) continue;
    let dt = dt0; if (P.shaniT > 0 && Math.abs(f.x - P.x) < 460) dt *= f.boss ? 0.6 : 0.3; if (rainAt(f.x + 12)) dt *= 0.55;
    f.flash = Math.max(0, f.flash - dt);
    if (f.pinT > 0) { f.pinT -= dt0; dt *= 0.5; }
    if (f.boss) { updateBoss(f, dt); continue; }
    if (f.calmT > 0 && f.state !== 'kneel') { f.calmT -= dt; f.vx = 0; if (f.state !== 'stun') f.state = 'idle'; else { f.t -= dt; if (f.t <= 0) f.state = 'idle'; } continue; }
    const dx = pcx() - (f.x + 12), adx = Math.abs(dx);
    switch (f.state) {
      case 'kneel':
        f.kneelT += dt;
        if (adx > 160) f.awayT += dt;
        if (f.awayT > 2.2 || (f.kneelT > 3 && !P.atk)) { f.alive = false; life.spared = (life.spared || 0) + 1; if (life.spared <= 3) deed('You spared one who begged for mercy.', 1, { kind: 'mercy', target: f }); if (pathAt('karma') >= 1) { P.hp = Math.min(P.hpMax, P.hp + 20); P.st = Math.min(P.stMax, P.st + 30); floater(pcx(), P.y - 40, 'MERCY STEADIES YOU', INK2); } soul.memories.spared++; if (life.spared >= 3 && !soul.spells.has('karuna')) learnSpell('karuna', 'You spared three who begged for mercy in one life. Mercy becomes a spell.'); for (let i = 0; i < 16; i++) fx.push({ k: 'ink', x: f.x + 12, y: f.y + rnd(0, f.h), vx: rnd(-20, 20), vy: -rnd(20, 70), life: 1 }); floater(f.x + 12, f.y - 16, 'It walks into the ink.', INK2); }
        break;
      case 'stun': case 'stag': f.t -= dt; f.vx *= 0.9; if (f.t <= 0) { f.state = 'chase'; f.stag = 0; } break;
      case 'wind': f.t -= dt; f.vx = 0; if (f.t <= 0) { f.state = 'swing'; f.t = f.high ? 0.2 : 0.16; f.hitDone = false; f.vx = f.face * 120; SFX.swing(); } break;
      case 'swing': {
        f.t -= dt;
        if (!f.hitDone && overlap(foeHitbox(f), P)) { f.hitDone = true; hurtPlayer(f.high ? 18 : 14, f, true); }
        if (f.t <= 0 && f.state === 'swing') { f.state = 'cool'; f.t = 0.8; } break;
      }
      case 'cool': f.t -= dt; f.vx *= 0.85; if (f.t <= 0) f.state = 'chase'; break;
      default:
        if (!P.dead && !(P.unseenT > 0) && !f.peace && adx < 420 && Math.abs(P.y + P.h - f.gy) < 110) {
          f.state = 'chase'; f.face = Math.sign(dx) || f.face;
          if (adx < (f.high ? 64 : 52)) { f.state = 'wind'; f.t = f.high ? 0.6 : 0.5; SFX.warn(); } else f.vx = f.face * 95;
        } else { f.vx = 0; f.state = 'idle'; }
    }
    f.x = clamp(f.x + f.vx * dt * (f.mud ? 0.5 : 1), f.l, f.r - f.w);
    for (const t of TEMPS) if (overlap(f, t)) { f.x = f.x + 12 < t.x + t.w / 2 ? t.x - f.w : t.x + t.w; f.vx = 0; }
  }
}
/* ---------- bosses (test stand-ins: who they are and how you find them is still to be planned) ---------- */
const CHIEF_COMBO = [{ wind: 0.55, act: 0.18, dmg: 16, reach: 78 }, { wind: 0.38, act: 0.18, dmg: 16, reach: 78 }, { wind: 0.8, act: 0.24, dmg: 28, reach: 96, heavy: true }];
const MASK_CUTS = [{ wind: 0.34, act: 0.12, dmg: 12, reach: 62 }, { wind: 0.22, act: 0.12, dmg: 12, reach: 62 }];
const MASK_BEHIND = [{ wind: 0.42, act: 0.14, dmg: 14, reach: 66 }];
function makeFoe(s) { const h = s.high ? 60 : 52; return { x: s.x, gy: s.gy, l: s.l, r: s.r, high: !!s.high, mud: !!s.mud, y: s.gy - h, w: 24, h, vx: 0, face: -1, hp: s.hp || (s.high ? 50 : 36), hpMax: s.hp || (s.high ? 50 : 36), state: 'idle', t: rnd(0, 1), home: s.x, flash: 0, stag: 0, kneelT: 0, awayT: 0, alive: true, hitDone: false, arena: s.arena || null, mirror: !!s.mirror }; }
function makeBoss(a) {
  const k = { chief: { w: 40, h: 92, hp: 420, poise: 100 }, wraith: { w: 34, h: 46, hp: 320, poise: 70, fly: true }, masked: { w: 24, h: 56, hp: 520, poise: 110 } }[a.id];
  const x = a.l + (a.r - a.l) * 0.68 - k.w / 2;
  return { boss: a.id, ar: a, name: a.name, who: a.who, alive: true, x, y: a.gy - k.h - (k.fly ? 170 : 0), w: k.w, h: k.h, gy: a.gy, l: a.l, r: a.r, hp: k.hp, hpMax: k.hp, poise: k.poise, poiseMax: k.poise, fly: !!k.fly,
    vx: 0, vy: 0, face: -1, state: 'wait', t: 0, cd: 1, phase: 1, stag: 0, calmT: 0, burnT: 0, flash: 0, stolen: 0, side: 1, sideT: 0, hitDone: false, hidden: false, home: x, sinceHit: 9 };
}
const bossNow = () => foes.find(f => f.boss && f.alive && f.ar.fight);
function startFight(a, B) {
  a.fight = true; a.hit = false; B.state = 'intro'; B.t = 1.3;
  zoneTag = { name: a.name, sub: a.sub, t: 3.4 }; tone(110, 55, 0.9, 'sawtooth', 0.06); shake = 6;
  if (!soul.understood.has('mind') && !soul.heardClue) { soul.heardClue = true; setTimeout(() => { if (a.fight) floater(pcx(), P.y - 70, 'Do not sway toward the thoughts. Stay with your breath.', INK2); }, 1600); }
  if (P.mount) { dismount(false); horse.state = 'away'; floater(pcx(), P.y - 46, 'YOUR HORSE WILL NOT COME IN', PENCIL); }
  for (const g of a.gates) if (overlap(P, g)) P.x = g.x < a.l ? a.l + 2 : a.r - P.w - 2;
  floater(pcx(), P.y - 30, 'THE WAY CLOSES BEHIND YOU', RED);
}
function bossStrike(B, dmg, reach, parryable, high) {
  if (B.hitDone) return;
  const box = { x: B.face > 0 ? B.x + B.w - 4 : B.x + 4 - reach, y: high ? B.y : B.y + B.h * 0.2, w: reach, h: high ? B.h : B.h * 0.6 };
  if (overlap(box, P)) { B.hitDone = true; hurtPlayer(dmg, B, parryable); }
}
function bossSeq(B, seq, sp) { B.seqL = seq; B.si = 0; B.sp = sp; B.cur = seq[0]; B.state = 'wind'; B.t = B.cur.wind * sp; SFX.warn(); }
function nextSeq(B) { B.si++; if (B.seqL && B.si < B.seqL.length) { B.cur = B.seqL[B.si]; B.state = 'wind'; B.t = B.cur.wind * B.sp; } else { B.state = 'cool'; B.t = B.boss === 'masked' ? 0.6 : 0.9; B.cd = B.boss === 'masked' ? 0.7 : 1.1; } }
function bossStagger(B) { B.state = 'stag'; B.t = 2.2; B.stag = 2.2; B.poise = B.poiseMax; B.vx = 0; B.vy = 0; B.seqL = null; B.hidden = false; if (B.fly) B.y = B.ar.gy - B.h; floater(B.x + B.w / 2, B.y - 24, 'OPEN'); tone(300, 120, 0.3, 'square', 0.05); }
function bossParried(B) { B.hitDone = true; B.poise -= 50; if (B.poise <= 0 || B.state === 'dive') { bossStagger(B); return; } B.state = 'recover'; B.t = 0.7; B.seqL = null; B.vx = -B.face * 120; }
function bossHurt(B, dmg, heavy, o) {
  if (B.hidden || B.state === 'dying') return;
  if (pathAt('alone') >= 1) dmg *= 1.06;
  if (B.state === 'wait') { const a = B.ar; if (pcx() > a.l && pcx() < a.r && Math.abs(P.y + P.h - a.gy) < 260) startFight(a, B); else { floater(B.x + B.w / 2, B.y - 20, 'IT WAITS FOR YOU TO COME IN', PENCIL); return; } }
  if (B.state === 'guard') {
    const near = Math.abs(pcx() - (B.x + B.w / 2)) < 130;
    if (heavy && near && !o.echo) { floater(B.x + B.w / 2, B.y - 40, 'GUARD BROKEN', INK); bossStagger(B); return; }
    floater(B.x + B.w / 2, B.y - 30, near ? 'COUNTERED' : 'DEFLECTED', RED); tone(1700, 1200, 0.05, 'square', 0.04); for (let i = 0; i < 6; i++) fx.push({ k: 'spark', x: B.x + B.w / 2 - B.face * -14, y: B.y + 22, vx: rnd(-260, 260), vy: rnd(-260, 40), life: 0.2 });
    if (near) { B.state = 'counter'; B.t = 0.1; }
    return;
  }
  if (B.calmT > 0) { B.calmT = 0; if (!life.brokeCalm) { life.brokeCalm = true; deed('You struck one you had calmed.', -1, { kind: 'calm', target: B }); } }
  const edge = o.melee && inHand('empty'); if (edge) dmg *= 1.4;
  if (o.spell && o.spell === B.ar.gift && (soul.bossKills[B.boss] || 0) > 0) { dmg *= 3; floater(B.x + B.w / 2, B.y - 44, 'ITS OWN MOVE', RED); }
  B.hp -= dmg; B.flash = 0.12; B.sinceHit = 0; burst(B.x + B.w / 2, B.y + B.h / 2, 7); heavy ? SFX.heavy() : SFX.hit();
  if (B.state === 'stag') B.stag = 0;
  else { B.poise -= ((heavy ? 26 : 10) + ((o.knock || 0) > 300 ? 8 : 0)) * (edge ? 2 : 1) * (o.poiseMul || 1); if (B.poise <= 0 && B.state !== 'intro') bossStagger(B); }
  if (B.hp <= 0) { B.hp = 0; B.state = 'dying'; B.t = 1.6; B.vx = 0; B.vy = 0; B.hidden = false; shake = 14; tone(200, 30, 1.4, 'sawtooth', 0.07);
    for (const f of foes) if (f.arena === B.ar.id && f.alive) { f.alive = false; for (let i = 0; i < 12; i++) fx.push({ k: 'ink', x: f.x + 12, y: f.y + rnd(0, f.h), vx: rnd(-20, 20), vy: -rnd(20, 70), life: 0.9 }); } }
}
function bossGone(B) {
  B.alive = false; const a = B.ar, again = (soul.bossKills[a.id] || 0) > 0; a.fight = false; life.bossDown.add(a.id); soul.bossKills[a.id] = (soul.bossKills[a.id] || 0) + 1;
  for (let i = 0; i < 60; i++) fx.push({ k: 'ink', x: B.x + rnd(0, B.w), y: B.y + rnd(0, B.h), vx: rnd(-90, 90), vy: -rnd(30, 160), life: rnd(0.6, 1.4) });
  const seeds = (again ? 0 : a.seeds) + B.stolen; P.seeds += seeds; if (seeds) floater(B.x + B.w / 2, B.y - 20, `+${seeds} seeds`);
  banner = null;
  if (again) showBanner({ t: 3.4, top: `${a.name} FALLS AGAIN`, sub: `You beat it in a past life, and it has nothing left to give you${B.stolen ? `. You take back the ${B.stolen} seeds it took` : ''}. The way opens.` });
  else showBanner({ t: 3.4, top: `${a.name} FALLS`, sub: `+${seeds} seeds${B.stolen ? ', with what it took from you' : ''}. The way opens. In your next life it waits here again, with nothing more to give.` });
  if (!soul.spells.has(a.gift)) learnSpell(a.gift, a.giftHow);
  if (P.noMana) gainScroll(a.gift, 3, pcx(), P.y - 60);
  life.ask = { id: a.id, name: a.who, t: 2.5 }; saveSoon();
  walk('alone', again ? 2 : 3);
  if (!a.hit) { if (!soul.spells.has('vajra')) learnSpell('vajra', 'Not one blow touched you. The sky noticed.'); else floater(pcx(), P.y - 66, 'NOT ONE BLOW TOUCHED YOU', INK2); }
}
function bossPhys(B, dt) {
  const G = B.ar.gy;
  if (B.fly) {
    B.y += B.vy * dt; if (B.state === 'stag' || B.state === 'grounded' || B.state === 'dying' && B.y + B.h > G - 4) B.y = G - B.h;
    B.y = clamp(B.y, G - 330, G - B.h);
  } else if (B.state === 'air') { B.vy += GRAV * dt; B.y += B.vy * dt; if (B.y + B.h >= G && B.vy > 0) { B.y = G - B.h; B.vy = 0; chiefLand(B); } }
  else B.y = G - B.h;
  B.x = clamp(B.x + B.vx * dt, B.l, B.r - B.w);
  B.gy = B.fly ? B.y + B.h : G;
}
function chiefLand(B) {
  B.state = 'land'; B.t = 0.7; shake = 13; burst(B.x + B.w / 2, B.ar.gy, 26, INK2, 260); tone(60, 30, 0.5, 'sawtooth', 0.08);
  for (const d of [-1, 1]) WAVES.push({ x: B.x + B.w / 2 + d * 24, dir: d, gy: B.ar.gy, sp: B.phase > 1 ? 480 : 390, left: 560, dmg: B.phase > 1 ? 16 : 14, h: 30, hostile: true, who: B.who });
  if (Math.abs(pcx() - (B.x + B.w / 2)) < 50 && P.y + P.h > B.y) hurtPlayer(22, B, false);
}
function wraithOrbs(B) {
  const n = B.phase > 1 ? 5 : 3, cx = B.x + B.w / 2, cy = B.y + B.h / 2;
  for (let i = 0; i < n; i++) { const T = 0.8 + i * 0.15, g = 900, tx = pcx() + (i - (n - 1) / 2) * 46, ty = P.y + P.h / 2; shots.push({ hostile: true, fire: true, x: cx, y: cy, vx: (tx - cx) / T, vy: (ty - cy) / T - 0.5 * g * T, g, life: 3, dmg: 12, r: 9, src: B }); }
  tone(400, 900, 0.25, 'sawtooth', 0.04);
}
function updateBoss(B, dt) {
  const a = B.ar, G = a.gy, cx = B.x + B.w / 2, dx = pcx() - cx, ad = Math.abs(dx);
  if (B.state === 'dying') { B.t -= dt; B.vx = 0; if (B.fly) B.vy = 260; bossPhys(B, dt); if (B.t <= 0) bossGone(B); return; }
  if (B.state === 'wait') {
    B.face = dx < 0 ? -1 : 1; if (B.fly) { B.vy = (G - 190 + Math.sin(clock * 2) * 14 - (B.y + B.h / 2)) * 2; bossPhys(B, dt); }
    if (!P.dead && pcx() > a.l + 40 && pcx() < a.r - 40 && Math.abs(P.y + P.h - G) < 260) startFight(a, B);
    return;
  }
  B.sinceHit += dt; if (B.sinceHit > 2 && B.state !== 'stag') B.poise = Math.min(B.poiseMax, B.poise + 10 * dt);
  if (B.calmT > 0 && B.state !== 'stag' && B.state !== 'intro') { B.calmT -= dt; B.vx *= 0.8; B.vy *= 0.8; B.hidden = false; if (B.state !== 'idle') { B.state = 'idle'; B.seqL = null; } bossPhys(B, dt); return; }
  if (B.state === 'intro') { B.t -= dt; B.vx = 0; B.vy = 0; if (B.t <= 0) { B.state = 'idle'; B.cd = 0.5; } bossPhys(B, dt); return; }
  if (P.dead) { B.vx *= 0.9; B.vy *= 0.9; bossPhys(B, dt); return; }
  if (B.phase === 1 && B.hp < B.hpMax * 0.5 && ['idle', 'cool'].includes(B.state)) {
    B.phase = 2; B.state = 'roar'; B.t = 1.2; B.vx = 0; B.vy = 0; shake = 10; tone(90, 45, 1, 'sawtooth', 0.07);
    floater(cx, B.y - 30, B.boss === 'chief' ? 'IT CALLS ITS KIN' : B.boss === 'masked' ? 'IT SHOWS YOU YOUR OWN FACE' : 'IT BURNS BRIGHTER', RED);
    if (B.boss === 'chief') for (const x of [a.l + 60, a.r - 84]) foes.push(makeFoe({ x, gy: G, l: a.l, r: a.r, arena: a.id }));
    if (B.boss === 'masked') { const m = makeFoe({ x: clamp(pcx() + P.face * 140, a.l + 10, a.r - 40), gy: G, l: a.l, r: a.r, arena: a.id, hp: 60, mirror: true }); foes.push(m); for (let i = 0; i < 20; i++) fx.push({ k: 'ink', x: m.x + 12, y: m.y + rnd(0, 52), vx: rnd(-30, 30), vy: -rnd(20, 80), life: 0.8 }); }
  }
  const sp = B.phase > 1 ? (B.boss === 'masked' ? 0.85 : 0.8) : 1;
  switch (B.state) {
    case 'wind': B.t -= dt; B.vx = 0; if (B.t <= 0) { B.state = 'swing'; B.t = B.cur.act; B.hitDone = false; B.vx = B.face * (B.boss === 'masked' ? 220 : 160); SFX.swing(); } break;
    case 'swing': B.t -= dt; bossStrike(B, B.cur.dmg, B.cur.reach, !B.cur.unparry, B.cur.heavy); if (B.t <= 0 && B.state === 'swing') nextSeq(B); break;
    case 'stag': case 'recover': case 'cool': case 'roar': B.t -= dt; B.vx *= 0.85; B.vy *= 0.85; if (B.state === 'stag') B.stag = Math.min(B.stag, B.t); if (B.t <= 0) { B.state = 'idle'; B.stag = 0; B.cd = Math.max(B.cd, 0.3); } break;
    default:
      if (B.boss === 'chief') thinkChief(B, dt, cx, dx, ad, sp);
      else if (B.boss === 'wraith') thinkWraith(B, dt, cx, sp);
      else thinkMasked(B, dt, cx, dx, ad, sp);
  }
  bossPhys(B, dt);
}
function thinkChief(B, dt, cx, dx, ad, sp) {
  switch (B.state) {
    case 'idle': B.face = Math.sign(dx) || B.face; B.cd -= dt;
      if (B.cd <= 0) { if (ad < 120) bossSeq(B, CHIEF_COMBO, sp); else if (ad < 430 && Math.random() < 0.45) { B.state = 'gwind'; B.t = 0.75 * sp; SFX.warn(); } else { B.state = 'crouch'; B.t = 0.55 * sp; SFX.warn(); } }
      else B.vx = ad > 90 ? B.face * (B.phase > 1 ? 110 : 85) : 0; break;
    case 'gwind': B.t -= dt; B.vx = 0; if (B.t <= 0) { B.state = 'gdash'; B.t = 0.55; B.hitDone = false; B.vx = B.face * 440; } break;
    case 'gdash': B.t -= dt;
      if (!B.hitDone && overlap(B, P)) { B.hitDone = true; if (hurtPlayer(20, B, false) === 'hit') { const s2 = Math.min(30, P.seeds); if (s2) { P.seeds -= s2; B.stolen += s2; floater(pcx(), P.y - 40, `IT TAKES ${s2} SEEDS`, RED); } } }
      if (B.t <= 0) { B.state = 'cool'; B.t = 0.9; B.cd = 1; } break;
    case 'crouch': B.t -= dt; B.vx = 0; if (B.t <= 0) { const T = 0.78; B.state = 'air'; B.vy = -780; B.vx = clamp((pcx() - cx) / T, -620, 620); } break;
    case 'land': B.t -= dt; B.vx = 0; if (B.t <= 0) { B.state = 'idle'; B.cd = 0.9; } break;
  }
}
function thinkWraith(B, dt, cx, sp) {
  const G = B.ar.gy, cy = B.y + B.h / 2;
  switch (B.state) {
    case 'idle': {
      B.cd -= dt; if (clock > B.sideT) { B.side = -B.side; B.sideT = clock + rnd(2.5, 4); }
      const tx = clamp(pcx() + B.side * 150, B.l + 40, B.r - 40), ty = G - 190 + Math.sin(clock * 2.2) * 18;
      B.vx = clamp((tx - cx) * 2, -230, 230); B.vy = clamp((ty - cy) * 3, -220, 220); B.face = pcx() < cx ? -1 : 1;
      if (B.cd <= 0) { const r = Math.random(); if (B.phase > 1 && r < 0.3) { B.state = 'rwind'; B.t = 0.9; B.tx = (B.l + B.r) / 2; SFX.warn(); } else if (r < 0.62) { B.state = 'owind'; B.t = 0.6 * sp; } else { B.state = 'dwind'; B.t = 0.7 * sp; B.tx = pcx(); B.ty = P.y + P.h - 22; SFX.warn(); } }
      break; }
    case 'owind': B.t -= dt; B.vx *= 0.9; B.vy *= 0.9; if (B.t <= 0) { wraithOrbs(B); B.state = 'idle'; B.cd = B.phase > 1 ? 1.1 : 1.6; } break;
    case 'dwind': B.t -= dt; B.vx = 0; B.vy = 0; if (B.t <= 0) { B.state = 'dive'; B.hitDone = false; } break;
    case 'dive': { const ddx = B.tx - cx, ddy = B.ty - cy, d = Math.hypot(ddx, ddy) || 1; B.vx = ddx / d * 820; B.vy = ddy / d * 820; B.face = ddx < 0 ? -1 : 1;
      if (!B.hitDone && overlap(B, P)) { B.hitDone = true; hurtPlayer(18, B, true); }
      if (B.state === 'dive' && (d < 24 || B.y + B.h >= G - 2)) { B.state = 'grounded'; B.t = 1.3; B.vx = 0; B.vy = 0; B.y = G - B.h; shake = 6; burst(cx, G, 14, INK2, 200); }
      break; }
    case 'grounded': B.t -= dt; B.vx = 0; B.vy = 0; if (B.t <= 0) { B.state = 'idle'; B.cd = 0.8; B.vy = -200; } break;
    case 'rwind': B.t -= dt; B.vx = clamp((B.tx - cx) * 4, -420, 420); B.vy = clamp((G - B.h / 2 - cy) * 4, -420, 520);
      if (B.t <= 0) { B.y = G - B.h; B.vx = 0; B.vy = 0; for (const d of [-1, 1]) WAVES.push({ x: cx + d * 22, dir: d, gy: G, sp: 360, left: 700, dmg: 12, h: 26, hostile: true, fire: true, who: B.who }); B.state = 'grounded'; B.t = 1; shake = 8; tone(300, 80, 0.5, 'sawtooth', 0.05); }
      break;
  }
}
function thinkMasked(B, dt, cx, dx, ad, sp) {
  switch (B.state) {
    case 'idle': { B.face = Math.sign(dx) || B.face; B.cd -= dt; const want = 130;
      B.vx = ad > want + 30 ? B.face * (B.phase > 1 ? 240 : 200) : ad < want - 40 ? -B.face * 150 : 0;
      if (B.cd <= 0) { const r = Math.random();
        if (ad < 100 && r < 0.45) bossSeq(B, MASK_CUTS, sp);
        else if (r < 0.62 && (P.atk || P.charging || ad < 170)) { B.state = 'guard'; B.t = 1.1; B.vx = 0; }
        else if (r < (B.phase > 1 ? 0.9 : 0.82)) { B.state = 'vanish'; B.t = 0.45; B.hidden = true; B.vx = 0; for (let i = 0; i < 18; i++) fx.push({ k: 'ink', x: cx + rnd(-12, 12), y: B.y + rnd(0, B.h), vx: rnd(-30, 30), vy: -rnd(20, 80), life: 0.7 }); tone(700, 150, 0.2, 'sine', 0.05); }
        else { B.state = 'back'; B.t = 0.25; B.vx = -B.face * 280; } }
      break; }
    case 'back': B.t -= dt; if (B.t <= 0) { B.state = 'lwind'; B.t = 0.5 * sp; B.vx = 0; SFX.warn(); } break;
    case 'lwind': B.t -= dt; B.face = Math.sign(dx) || B.face; if (B.t <= 0) { B.state = 'lunge'; B.t = 0.28; B.hitDone = false; B.vx = B.face * 900; SFX.swing(); } break;
    case 'lunge': B.t -= dt; bossStrike(B, 20, 44, true); if (B.t <= 0 && B.state === 'lunge') { B.state = 'cool'; B.t = 0.7; B.cd = 0.8; B.vx = 0; } break;
    case 'vanish': B.t -= dt; if (B.t <= 0) { B.hidden = false; B.x = clamp(pcx() - P.face * 70 - B.w / 2, B.l, B.r - B.w); B.face = pcx() < B.x + B.w / 2 ? -1 : 1; for (let i = 0; i < 18; i++) fx.push({ k: 'ink', x: B.x + 12 + rnd(-12, 12), y: B.y + rnd(0, B.h), vx: rnd(-30, 30), vy: -rnd(20, 80), life: 0.7 }); bossSeq(B, MASK_BEHIND, sp); } break;
    case 'guard': B.t -= dt; B.vx = 0; B.face = Math.sign(dx) || B.face; if (B.t <= 0) { B.state = 'idle'; B.cd = 0.3; } break;
    case 'counter': B.t -= dt; if (B.t <= 0) { B.cur = { act: 0.16, dmg: 18, reach: 76, unparry: true }; B.seqL = [B.cur]; B.si = 0; B.sp = 1; B.state = 'swing'; B.t = 0.16; B.hitDone = false; B.vx = B.face * 120; SFX.swing(); } break;
  }
}
function updateCrumbles(dt) {
  for (const c of CRUMBLES) {
    if (c.state === 'shake') { c.t -= dt; if (c.t <= 0) { c.state = 'gone'; c.t = 3; burst(c.x + 40, c.y + 4, 10, INK2, 140); SFX.crack(); } }
    else if (c.state === 'gone') { c.t -= dt; if (c.t <= 0 && !overlap(c, P)) c.state = 'solid'; }
  }
}

/* ---------- projectiles ---------- */
const circle = (s, b) => { const nx = clamp(s.x, b.x, b.x + b.w), ny = clamp(s.y, b.y, b.y + b.h); return (s.x - nx) ** 2 + (s.y - ny) ** 2 < s.r * s.r; };
function updateShots(dt) {
  for (const s of shots) {
    s.life -= dt; const px = s.x, py = s.y;
    if (s.g) s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.knife) s.spin += dt * 24;
    if (s.life <= 0 && s.knife) { P.knives = Math.min(P.knivesMax, P.knives + 1); continue; }
    if (pointSolid(s.x, s.y) || s.y > LH + 40) {
      s.life = 0; const a = Math.atan2(s.vy, s.vx);
      if (s.arrow) fx.push({ k: 'stuck', x: s.x, y: s.y, a, life: 2.5 });
      else if (s.knife) { if (s.y < LH) drops.push({ x: px, y: py, a }); else P.knives = Math.min(P.knivesMax, P.knives + 1); }
      else burst(s.x, s.y, 10);
      continue;
    }
    if (s.fire && (waterAt(s.x, s.y) || (s.hostile && rainAt(s.x)))) { s.life = 0; for (let i = 0; i < 8; i++) fx.push({ k: 'bub', x: s.x + rnd(-8, 8), y: s.y, vx: 0, vy: -rnd(40, 90), life: 0.6 }); continue; }
    if (s.hostile) { if (!P.dead && circle(s, P)) { if (P.noMana && P.parryT > 0) { s.hostile = false; s.reflected = true; s.vx = -s.vx * 1.15; s.vy = -Math.abs(s.vy) * 0.5 - 300; s.g = 500; s.dmg *= 2.5; s.life = 2.5; P.parryT = 0; SFX.parry(); floater(pcx(), P.y - 30, 'TURNED BACK'); hitstop = 0.06; for (let i = 0; i < 10; i++) fx.push({ k: 'spark', x: s.x, y: s.y, vx: rnd(-300, 300), vy: rnd(-300, 50), life: 0.25 }); continue; } if (hurtPlayer(s.dmg, s.src || { x: s.x, w: 0 }, false) !== 'dodge') { s.life = 0; burst(s.x, s.y, 10, RED); } } continue; }
    let done = false;
    for (const t of foes) if (t.alive && t.state !== 'kneel' && !t.hidden && !(s.hit && s.hit.has(t)) && circle(s, t)) { if (s.arrow) arrowHit(s, t); else hurtFoe(t, s.dmg, false); burst(s.x, s.y, 12); if (s.pierce > 0) { s.pierce--; s.hit.add(t); continue; } s.life = 0; if (s.knife) drops.push({ x: t.x + 12, y: t.gy - 4, a: s.vx > 0 ? 0.3 : Math.PI - 0.3 }); done = true; break; }
    if (done) continue;
    for (const p of pots) if (!p.broken && circle(s, { x: p.x - 12, y: p.gy - 28, w: 24, h: 28 })) { breakPot(p); s.life = 0; if (s.knife) drops.push({ x: p.x, y: p.gy - 4, a: 0 }); break; }
  }
  shots = shots.filter(s => s.life > 0);
}

/* ---------- the horse ---------- */
const HORSE_HOME = LEVEL.places.horse;
let horse = null;
function newHorse() { horse = { perk: 'double jump', x: HORSE_HOME.x, gy: HORSE_HOME.gy, face: -1, state: 'wild', hp: 120, hpMax: 120, arriveT: 0, fleeT: 0, fleeX: 0, graze: 0 }; }
function mount() {
  const box = { x: horse.x - 22, y: horse.gy - 80, w: 44, h: 80 };
  if (blocked(box)) { floater(horse.x, horse.gy - 90, 'NO ROOM TO MOUNT HERE', PENCIL); return; }
  Object.assign(P, { mount: true, x: box.x, y: box.y, w: 44, h: 80, vx: 0, atk: null, charging: false, face: horse.face });
  horse.state = 'ridden'; tone(300, 500, 0.15, 'triangle', 0.03);
}
function dismount(thrown) {
  const cx = pcx(), fy = P.y + P.h;
  P.mount = false; horse.x = cx; horse.gy = fy; horse.face = P.face;
  if (thrown) { horse.state = 'fled'; horse.fleeT = 1.4; horse.fleeX = cx; } else horse.state = 'idle';
  P.w = 22; P.h = PH; P.y = fy - PH; P.x = cx - 11 - P.face * 30;
  if (blocked(P)) P.x = cx - 11;
  if (thrown) { P.hitT = 0.4; P.vy = -300; P.vx = -P.face * 200; }
}
function rideMove(dt, mx, surf) {
  const gallop = held.roll && mx && P.st > 0 && P.onG;
  if (gallop) { P.st -= 24 * dt; P.stDelay = 0.4; }
  let tgt = mx * (gallop ? 600 : 400);
  if (surf === 'mud') tgt *= 0.6;
  // the horse will not walk into water
  if (P.onG && Math.sign(tgt) === P.face) { const ax = pcx() + P.face * 40; for (let y = P.y + P.h + 4; y < P.y + P.h + 260; y += 20) { if (waterAt(ax, y)) { tgt = 0; if (Math.abs(P.vx) > 60) floater(pcx(), P.y - 20, 'THE HORSE WILL NOT GO INTO THE WATER', PENCIL); P.vx = 0; break; } if (pointSolid(ax, y)) break; } }
  const k = surf === 'ice' ? 1.2 : P.onG ? 3.2 : 1.4;
  if (P.hitT > 0) P.vx *= Math.max(0, 1 - 2 * dt); else P.vx += (tgt - P.vx) * Math.min(1, dt * k);
  if (Math.abs(P.vx) > 30) P.face = Math.sign(P.vx);
}
function openGround() {
  if (!P.onG || P.inWater || darkAt(pcx(), P.y + 10)) return false;
  return !blocked({ x: P.x - 40, y: P.y - 150, w: P.w + 80, h: 140 });
}
function callHorse(force) {
  if (horse.state === 'wild') { floater(pcx(), P.y - 30, 'NO MOUNT ANSWERS THE BELL YET', PENCIL); return; }
  if (P.mount) { floater(pcx(), P.y - 30, 'YOU ARE ALREADY RIDING', PENCIL); return; }
  if (horse.state === 'fled') { floater(pcx(), P.y - 30, 'YOUR HORSE IS HURT · REST AT A SHRINE', PENCIL); return; }
  if (!force && !openGround()) { floater(pcx(), P.y - 30, 'THE BELL IS NOT HEARD HERE · OPEN GROUND ONLY', PENCIL); return; }
  const fy = P.y + P.h, cx = pcx();
  for (const off of [-45, 45, -90, 90, 0]) {
    const x = cx + off * P.face;
    if (!blocked({ x: x - 22, y: fy - 80, w: 44, h: 79 }) && pointSolid(x, fy + 4)) {
      Object.assign(horse, { x, gy: fy, face: P.face, state: 'idle', arriveT: 0.8 });
      [1320, 1760, 2200].forEach((f, i) => tone(f, f * 0.98, 0.7, 'sine', 0.03, i * 0.05));
      for (let i = 0; i < 26; i++) fx.push({ k: 'ink', x: x + rnd(-30, 30), y: fy - rnd(0, 60), vx: rnd(-40, 40), vy: rnd(-60, 20), life: rnd(0.4, 0.9) });
      floater(x, fy - 100, 'IT RIDES OUT OF THE INK', INK2); return;
    }
  }
  floater(cx, P.y - 30, 'NO ROOM FOR THE HORSE HERE', PENCIL);
}
function updateHorse(dt) {
  if (horse.arriveT > 0) horse.arriveT -= dt;
  if (horse.state === 'fled' && horse.fleeT > 0) { horse.fleeT -= dt; horse.fleeX += horse.face * 420 * dt; }
  horse.graze += dt;
}

/* ---------- chests ---------- */
const CHESTS = LEVEL.chests;
/* ---------- carrying: the pack, world chests and your own chest ---------- */
const emptyInv = () => ({ weapons: new Set(), garb: new Set(), relics: new Set(), mats: { wood: 0, iron: 0, ink: 0, petal: 0, ember: 0 }, wtier: {} });
const HOME = LEVEL.places.home;
const MAT_W = { wood: 1, iron: 1.5, ink: 0.2, petal: 0.2, ember: 0.5 }, RELIC_W = 0.3;
const invEmpty = v => !v.weapons.size && !v.garb.size && !v.relics.size && !Object.values(v.mats).some(Boolean);
const relicStored = id => soul.home.relics.has(id) || CHESTS.some(c => c.inv && c.inv.relics.has(id));
function resetChests() {
  for (const c of CHESTS) {
    if (c.kind === 'spell') { c.inv = emptyInv(); c.opened = soul.spells.has(c.id) && !P.noMana; continue; }
    c.inv = emptyInv(); c.opened = false;
    const atHome = c.kind === 'weapon' ? soul.home.weapons.has(c.id) : soul.home.garb.has(c.id);
    if (!atHome) (c.kind === 'weapon' ? c.inv.weapons : c.inv.garb).add(c.id);
  }
}
function packWeight() {
  let w = 0;
  for (const wi of P.weapons) if (!P.slots.includes(wi)) w += WEAPONS[wi].weight;
  for (const id of P.garbOwned) if (P.garb[GARB[id].slot] !== id) w += GARB[id].weight;
  for (const id of P.relics) if (!P.equip.includes(id)) w += RELIC_W;
  for (const k in P.mats) w += P.mats[k] * MAT_W[k];
  for (const k in P.scrolls) w += P.scrolls[k] * SCROLL_W;
  for (const k in P.arrows) w += P.arrows[k] * ARROW_W;
  return w;
}
const room = w => packWeight() + w <= P.packMax + 1e-9;
let openInv = null;
function openContainer(inv, name, home) { banner = null; mode = 'chest'; clearHeld(); openInv = { inv, name, home }; renderChest(); $('ovGear').hidden = false; SFX.relic(); }
function renderChest() {
  const { inv, name, home } = openInv, pw = packWeight();
  const btn = (txt, attr, ok, why) => `<button class="btn ghost sm" type="button" ${attr}${ok ? '' : ' disabled'}>${ok ? txt : why}</button>`;
  const row = (label, sub, w, btns) => `<div class="item"><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}<span class="m">Weight ${w}</span><div class="row">${btns}</div></div>`;
  const C = [], Pk = [];
  for (const wi of inv.weapons) { const w = WEAPONS[wi], dup = P.weapons.has(wi); C.push(row(`${w.name} · Tier ${TIER_NAME[inv.wtier[wi] || 1]}`, w.perk, w.weight, dup ? btn('Swap with yours', `data-swap="${wi}"`, !P.slots.includes(wi) || true, '') : btn('Take', `data-take="weapon:${wi}"`, room(w.weight), 'Too heavy'))); }
  for (const id of inv.garb) { const g = GARB[id]; C.push(row(g.name, `${SLOT_NAMES[g.slot]} · ${g.what}`, g.weight, btn('Take', `data-take="garb:${id}"`, !P.garbOwned.has(id) && room(g.weight), P.garbOwned.has(id) ? 'You have one' : 'Too heavy'))); }
  for (const id of inv.relics) C.push(row(RELICS[id].name, RELICS[id].what, RELIC_W, btn('Take', `data-take="relic:${id}"`, room(RELIC_W), 'Too heavy')));
  for (const k in inv.mats) if (inv.mats[k]) C.push(row(`${MATS[k]} × ${inv.mats[k]}`, '', `${MAT_W[k]} each`, btn('Take 1', `data-take="mat:${k}:1"`, room(MAT_W[k]), 'Too heavy') + btn('Take all', `data-take="mat:${k}:all"`, room(MAT_W[k]), 'Too heavy')));
  for (const wi of [...P.weapons].sort((a, b) => a - b)) { const w = WEAPONS[wi], hand = P.slots.includes(wi); Pk.push(row(`${w.name} · Tier ${TIER_NAME[tierOf(wi)]}`, hand ? 'In your hands' : '', w.weight, btn('Put in', `data-put="weapon:${wi}"`, !hand && !inv.weapons.has(wi), hand ? 'In your hands' : 'Already one inside'))); }
  for (const id of P.garbOwned) { const g = GARB[id], worn = P.garb[g.slot] === id; Pk.push(row(g.name, worn ? 'Worn' : SLOT_NAMES[g.slot], g.weight, btn('Put in', `data-put="garb:${id}"`, !worn && !inv.garb.has(id), worn ? 'Worn' : 'Already one inside'))); }
  for (const id of P.relics) { const on = P.equip.includes(id), soulR = RELICS[id].soul; Pk.push(row(RELICS[id].name, on ? 'Worn' : '', RELIC_W, btn('Put in', `data-put="relic:${id}"`, !on && !soulR, soulR ? 'Stays with your soul' : 'Worn'))); }
  for (const k in P.mats) if (P.mats[k]) Pk.push(row(`${MATS[k]} × ${P.mats[k]}`, '', `${MAT_W[k]} each`, btn('Put 1', `data-put="mat:${k}:1"`, true, '') + btn('Put all', `data-put="mat:${k}:all"`, true, '')));
  $('gearIn').innerHTML = `
    <span class="eyebrow">${home ? 'Kept across lives · ' : ''}Esc to close</span><h2>${esc(name)}</h2>
    ${home ? '<p class="note">Whatever you leave in your own chest waits here for your next life. Everything else you carry is lost when a life ends.</p>' : '<p class="note">Take what you want and leave what you do not need. Things left here stay for the rest of this life.</p>'}
    <div class="stats" style="width:100%;max-width:640px"><span>Your pack: ${pw.toFixed(1)} of ${P.packMax} (what you carry but are not holding or wearing)</span><span class="meter"><i style="width:${Math.min(100, pw / P.packMax * 100)}%"></i></span></div>
    <div class="gear">
      <div class="gcol"><span class="lbl">Inside</span>${C.length ? `<div class="row" style="justify-content:flex-start"><button class="btn sm" type="button" id="takeAll">Take everything that fits</button></div>` : ''}<div class="inv">${C.join('') || '<p class="note">Empty.</p>'}</div></div>
      <div class="gcol"><span class="lbl">You carry</span><div class="inv">${Pk.join('') || '<p class="note">Nothing.</p>'}</div></div>
    </div>`;
  const q = sel => $('gearIn').querySelectorAll(sel);
  q('[data-take]').forEach(b => b.addEventListener('click', () => { moveItem(inv, b.dataset.take, true); renderChest(); }));
  q('[data-put]').forEach(b => b.addEventListener('click', () => { moveItem(inv, b.dataset.put, false); renderChest(); }));
  q('[data-swap]').forEach(b => b.addEventListener('click', () => { const wi = +b.dataset.swap, t = inv.wtier[wi] || 1; inv.wtier[wi] = tierOf(wi); P.wtier[wi] = t; renderChest(); }));
  const ta = $('takeAll'); if (ta) ta.addEventListener('click', () => {
    for (const wi of [...inv.weapons]) if (!P.weapons.has(wi) && room(WEAPONS[wi].weight)) moveItem(inv, `weapon:${wi}`, true);
    for (const id of [...inv.garb]) if (!P.garbOwned.has(id) && room(GARB[id].weight)) moveItem(inv, `garb:${id}`, true);
    for (const id of [...inv.relics]) if (room(RELIC_W)) moveItem(inv, `relic:${id}`, true);
    for (const k in inv.mats) if (inv.mats[k]) moveItem(inv, `mat:${k}:all`, true);
    renderChest();
  });
}
function moveItem(inv, spec, take) {
  const [kind, id, n] = spec.split(':'), from = take ? inv : null;
  if (kind === 'weapon') { const wi = +id;
    if (take) { if (P.weapons.has(wi) || !room(WEAPONS[wi].weight)) return; P.weapons.add(wi); P.wtier[wi] = Math.max(inv.wtier[wi] || 1, P.wtier[wi] || 1); delete inv.wtier[wi]; inv.weapons.delete(wi); }
    else { if (P.slots.includes(wi) || inv.weapons.has(wi)) return; inv.weapons.add(wi); inv.wtier[wi] = tierOf(wi); delete P.wtier[wi]; P.weapons.delete(wi); } }
  if (kind === 'garb') {
    if (take) { if (P.garbOwned.has(id) || !room(GARB[id].weight)) return; P.garbOwned.add(id); inv.garb.delete(id); }
    else { if (P.garb[GARB[id].slot] === id || inv.garb.has(id)) return; inv.garb.add(id); P.garbOwned.delete(id); } }
  if (kind === 'relic') {
    if (take) { if (!room(RELIC_W)) return; P.relics.add(id); inv.relics.delete(id); }
    else { if (P.equip.includes(id) || RELICS[id].soul) return; inv.relics.add(id); P.relics.delete(id); } }
  if (kind === 'mat') {
    const src = take ? inv.mats : P.mats, dst = take ? P.mats : inv.mats;
    let q = n === 'all' ? src[id] : Math.min(1, src[id]);
    if (take) q = Math.min(q, Math.floor((P.packMax - packWeight()) / MAT_W[id] + 1e-9));
    q = Math.max(0, q); src[id] -= q; dst[id] += q;
  }
  tone(take ? 800 : 500, take ? 1100 : 350, 0.06, 'triangle', 0.03);
}
function openChest(c) {
  if (c.sealed && !P.noMana) { floater(c.x, c.gy - 50, 'SEALED · IT WILL NOT OPEN FOR ONE WHO HOLDS MANA', PENCIL); return; }
  if (c.kind === 'spell' && P.noMana) { if (!c.opened) { c.opened = true; if (!soul.spells.has(c.id)) learnSpell(c.id, 'A palm-leaf scroll lies in the chest.'); gainScroll(c.id, 2, c.x, c.gy - 50); } else floater(c.x, c.gy - 50, 'AN EMPTY CHEST', PENCIL); return; }
  if (c.kind === 'spell') { if (!c.opened) { c.opened = true; learnSpell(c.id, 'A palm-leaf scroll lies in the chest.'); } else floater(c.x, c.gy - 50, 'AN EMPTY CHEST', PENCIL); return; }
  if (c.sealed && c.id === 7 && !c.opened) { P.arrows.iron += 5; P.arrows.ember += 5; P.arrows.ink += 5; floater(c.x, c.gy - 60, 'A QUIVER LIES WITH IT: 5 IRON, 5 EMBER, 5 INK ARROWS'); }
  c.opened = true; openContainer(c.inv, c.kind === 'weapon' ? 'A chest' : 'A chest'); }

/* ---------- falling & true death ---------- */
function fall(why, useSafe) {
  if (P.dead) return;
  if (ARENAS.some(a => a.fight)) soul.bossFalls = (soul.bossFalls || 0) + 1;
  if (P.mount) dismount(true);
  CHS = null; P.bless = null;
  P.dead = true; P.deadT = 0; P.why = why; P.fellSafe = !!useSafe; P.hang = null; P.ladder = null; P.torch.lit = false; SFX.death();
  pendingDeath = 1.4;
}
function afterFall() {
  P.prana--;
  const spot = P.fellSafe ? { x: P.safe.x + 11, y: P.safe.y } : { x: pcx(), y: P.y + P.h };
  shades.forEach(s => s.taken = true);
  if (P.seeds > 0) shades.push({ x: spot.x, y: spot.y, seeds: P.seeds, taken: false });
  P.seeds = 0;
  if (P.prana <= 0) { trueDeath(spot); return; }
  wakeAtShrine(); saveSoon();
  banner = { t: 2.6, top: 'YOU FELL', sub: `${P.why} You wake at the ${SHRINES[P.shrine].name.toLowerCase()}. Prana left: ${P.prana}.` };
}
function wakeAtShrine() {
  const s = SHRINES[P.shrine];
  Object.assign(P, { fallTop: null, x: s.x + 40, y: s.gy - PH, h: PH, w: 22, mount: false, vx: 0, vy: 0, hp: P.hpMax, st: P.stMax, mana: P.manaMax, lotus: P.lotusMax, breath: BREATH, dead: false, deadT: 0, atk: null, charging: false, rollT: 0, healT: 0, hitT: 0, inv: 1, shieldT: 0,
    hang: null, climbT: 0, ladder: null, glide: false, plunge: false, cling: 0, inWater: false, headUnder: false, knives: P.knivesMax, torch: { fuel: P.torchMax, lit: false } });
  drops = []; spawnFoes(); shots = []; resetCrumbles(); snapCam(); TEMPS = []; RAINS = []; ALLY = null; CHS = null; SUMMONS = []; ECHO_HITS = []; WAVES = []; WISPS = []; P.bless = null; P.unseenT = 0; P.shaniT = 0; P.tideT = 0;
}
function trueDeath(spot) {
  mode = 'death'; stopRec(); banner = null; zoneTag = null;
  weighWords();
  life.end = P.why; life.endedAt = Date.now();
  soul.bodies.push({ x: spot.x, y: spot.y, life: life.n, looks: P.looks, taken: false });
  const k = soul.karma, lk = lifeKarma(), lean = realmLean(); life.realm = lean;
  // how much choice, and how fortunate the births on offer are, follow karma (fortune is read from each real chart)
  const n = k >= 8 ? 3 : k >= 3 ? 2 : 1, pool = Array.from({ length: 10 }, makeBirth).sort((a, b) => (b.fortune || 0) - (a.fortune || 0));
  const births = k >= 3 ? pool.slice(0, n).sort(() => Math.random() - 0.5) : k <= -2 ? [pool[pool.length - 1]] : [pool[Math.floor(Math.random() * pool.length)]];
  const debt = debtFrom(); if (debt && (!soul.debt || soul.debt.paid)) soul.debt = debt;
  const lost = [...P.relics].filter(id => !RELICS[id].soul), kept = [...P.relics].filter(id => RELICS[id].soul);
  // the death and the births on offer are kept with the soul at once, so leaving the page cannot undo a death
  soul.pending = { why: P.why, lifeN: life.n, k, lk, lean, n, births, frags: fragmentsOf(), can: keepCount(),
    homeLine: invEmpty(soul.home) ? '' : ' What you left in your own chest by the village shrine waits for your next life.',
    horseLine: horse.state !== 'wild' ? ' The horse you befriended goes back to the wild.' : '',
    seen: life.deeds.filter(d => d.seen).map(d => d.text), unseen: life.deeds.filter(d => !d.seen).length,
    relLine: (lost.length ? `Your relics (${lost.map(id => RELICS[id].name).join(', ')}) fall back to where you found them. ` : '') + (kept.length ? `The ${kept.map(id => RELICS[id].name).join(', ')} stays with your soul.` : '') };
  saveNow();
  showDeath(soul.pending);
}
function showDeath(D) {
  mode = 'death'; stopRec(); banner = null;
  const { n, k, births, frags, can } = D; let chosen = [];
  const deeds = D.seen.length ? D.seen.map(t => `<li>${esc(t)}</li>`).join('') : '<li>No one saw much of this life.</li>';
  const offer = n > 1 ? 'The wheel lets you choose your next life.' : k <= -2 ? 'The wheel chooses, and it does not choose gently.' : 'The wheel chooses your next life.';
  const R = REALMS[D.lean];
  $('deathIn').innerHTML = `
    <span class="eyebrow" style="color:#b9b6ac">Prana spent · Life ${D.lifeN} ends</span>
    <h2>${esc(D.why)}</h2>
    <p class="hand">The wheel weighs this life. ${esc(verdict(D.lk))}</p>
    <ul class="deeds">${deeds}</ul>
    ${D.unseen ? `<p class="hand">And ${D.unseen === 1 ? 'one thing' : D.unseen + ' things'} no one saw. The wheel saw ${D.unseen === 1 ? 'it' : 'them'}.</p>` : ''}
    <p class="hand">Your soul leans toward ${esc(R[0])}: ${esc(R[1])}${D.lean !== 'human' ? ' Those realms are not open yet; for now you are born human again.' : ''}</p>
    ${D.relLine ? `<p class="hand">${esc(D.relLine)}</p>` : ''}
    <p class="hand">Your level, skills and materials stay with this body. Weapons and garments you carried go back to the chests they came from.${esc(D.homeLine)}${esc(D.horseLine)}</p>
    <span class="lbl" style="color:#b9b6ac">What you carry through · ${can === 0 ? 'your deeds weigh too much to carry anything this time' : `choose ${can === 1 ? 'one' : 'up to two'}`}</span>
    <div class="frags">${frags.length ? frags.map((f, i) => `<button class="frag" type="button" data-frag="${i}"${can ? '' : ' disabled'}><b>${esc(f.name)}</b><span>${esc(f.what)}</span></button>`).join('') : '<p class="hand">Nothing from this life is ready to be carried: no skill learned, no stat trained, no weapon tempered.</p>'}</div>
    ${soul.debt && !soul.debt.paid ? `<p class="hand" style="color:#e46a6e">A debt follows you: ${esc(DEBTS[soul.debt.kind].who.toLowerCase())}. You will be born near where it happened.</p>` : ''}
    <p>${offer}</p>
    <div class="cards">${births.map((b, i) => `<button class="card" type="button" data-i="${i}">
      <b>${n > 1 ? 'LIFE ' + String.fromCharCode(65 + i) : 'YOUR NEXT LIFE'}</b>
      <span class="r">Born ${esc(b.local)}, ${esc(b.place)}<br>Age now ${b.age} · ${esc(b.lagna)} lagna<br>Moon: ${esc(b.moon)}<br>Mana: ${b.tierName}${b.school ? ' · ' + b.school : ''} · ${b.style}</span>
      <span class="perk">${esc(b.region)}. ${esc(b.people)}.</span>
      <span class="perk">${perks(b).map(esc).join('<br>')}</span>
    </button>`).join('')}</div>
    <p class="hand" style="color:#b9b6ac">${n > 1 ? 'Pick one.' : 'Press the card to be born.'} Your soul mark, and what you learned, come with you.</p>`;
  $('ovDeath').hidden = false;
  [...$('deathIn').querySelectorAll('.frag')].forEach(el => el.addEventListener('click', () => { const i = +el.dataset.frag; if (chosen.includes(i)) chosen = chosen.filter(x => x !== i); else if (chosen.length < can) chosen.push(i); else if (can === 1) chosen = [i]; [...$('deathIn').querySelectorAll('.frag')].forEach(e2 => e2.classList.toggle('on', chosen.includes(+e2.dataset.frag))); }));
  [...$('deathIn').querySelectorAll('.card')].forEach(el => el.addEventListener('click', () => { soul.carry = chosen.map(i => frags[i]); soul.pending = null; $('ovDeath').hidden = true; newLife(births[+el.dataset.i]); mode = 'play'; saveNow(); if (micMode === 'always') startRec(); }));
  setTimeout(() => $('deathIn').querySelector('.card')?.focus(), 50);
  renderLives();
}
function toolBtn(id, fn) { $(id).addEventListener('click', e => { e.currentTarget.blur(); if (mode === 'play' && P && !P.dead) fn(); }); }
toolBtn('tEnd', () => { P.prana = 1; fall('You let this life go.'); });
toolBtn('tRelics', () => {
  Object.keys(RELICS).forEach(id => { P.relics.add(id); if (RELICS[id].soul) soul.soulRelics.add(id); });
  P.equip = ['garuda', 'gecko', 'kite', 'bead'];
  banner = { t: 2.6, top: 'EVERY RELIC', sub: 'Test tool: you carry all seven. Feather, gecko, kite and bead are on. Swap in Tab.' };
});
toolBtn('tChants', () => { CHANTS.forEach(c => { soul.chants.add(c.id); P.prepared.add(c.id); }); P.mats.petal += 2; P.mats.ink += 4; P.mats.wood += 2; P.mats.ember += 2; P.seeds += 60; banner = { t: 2.6, top: 'EVERY CHANT', sub: 'Test tool: you know all ten chants, all are prepared (past the slot limit), and you carry offerings for the summons. Press C to chant.' }; });
toolBtn('tSpells', () => { for (const w of WORDS) soul.spells.add(w.id); P.stats.foc = Math.max(P.stats.foc, 14); applyStats(false); banner = { t: 2.6, top: 'EVERY SPELL', sub: `Test tool: you know all ${WORDS.length} spells and your Focus is at least 14. Put them on keys 1 to 4 in Tab, on the Spells page.` }; });
toolBtn('tEmpty', () => {
  if (P.noMana) return;
  P.noMana = true; P.manaTierMax = 0; P.mana = 0; P.school = null; P.dmgMul *= 1.15; P.wordSlots = [null, null, null, null];
  life.birth = Object.assign({}, life.birth, { tier: 0, tierName: 'None', school: null }); applyStats(false); P.stMax = P.stBase;
  for (const c of CHESTS) if (c.kind === 'spell') c.opened = false;
  banner = { t: 3, top: 'NO MANA IN THIS BODY', sub: 'Test tool: this body now has no mana. Spell chests hold scrolls for it, bosses leave scrolls of their move, it can turn magic back with a parry, and the sealed chest on the trial road opens for it.' };
});
toolBtn('tWay', () => { const ws = ['Sovereign', 'Sangha', 'Balanced'], nw = ws[(ws.indexOf(wayOf()) + 1) % 3]; const was = wayOf(); life.birth = Object.assign({}, life.birth, { style: nw, styleFull: `${nw}: ${WAYS[nw].short}` }); if (was === 'Sovereign') { P.pranaMax--; P.prana = Math.min(P.prana, P.pranaMax); } if (nw === 'Sovereign') { P.pranaMax++; P.prana++; } banner = { t: 3, top: nw.toUpperCase(), sub: `Test tool: this body's way is now ${nw}, ${WAYS[nw].short}. See it in Tab, on the Body page.` }; });
toolBtn('tSchool', () => { if (P.noMana) return; const ks = Object.keys(SCHOOLS), nk = ks[(ks.indexOf(P.school) + 1) % ks.length]; P.school = nk; life.birth = Object.assign({}, life.birth, { school: nk }); banner = { t: 3, top: `${nk.toUpperCase()} SCHOOL`, sub: `Test tool: this body now belongs to the ${nk} school. ${SCHOOLS[nk].sig}` }; });
toolBtn('tMoon', () => { moonTest = moonTest === null ? 1 : moonTest === 1 ? 0 : null; banner = { t: 2.6, top: moonTest === 1 ? 'A FULL MOON' : moonTest === 0 ? 'A NEW MOON' : 'THE REAL MOON', sub: moonTest === null ? 'Test tool: the Moon follows the real sky again.' : 'Test tool: the Moon is set by hand (full Moon helps mana; new Moon helps a body with no mana).' }; });
toolBtn('tPaths', () => {
  for (const k of PATH_KEYS) { if (k === 'alone' && soul.aloneClosed) continue; const s = soul.pathStep[k]; if (s >= 3) continue; const L = soul.pathLives[k] = soul.pathLives[k] || []; if (s === 2 && L.length < 2) L.push(-1); soul.paths[k] = Math.max(soul.paths[k], PATH_STEPS[s] - 1); walk(k, 1); }
  BQ = []; banner = { t: 4, top: 'EVERY ROAD, ONE STEP', sub: `Test tool: each road you can still walk took one step (the third counts as if walked in another life too). Steps now: ${PATH_KEYS.map(k => `${PATHS[k].name} ${pathAt(k)}`).join(' · ')}${soul.aloneClosed ? ' (alone: closed)' : ''}. Rest at a shrine to feel them.` };
});
toolBtn('tTeacher', () => { if (ARENAS.some(a => a.fight)) return; if (P.mount) dismount(false); P.x = TEACHER.x - 40; P.y = TEACHER.gy - PH; P.vx = P.vy = 0; P.hang = null; P.ladder = null; snapCam(); P.mats.petal += 1; P.seeds += 40; banner = { t: 3, top: 'THE TEACHER', sub: 'Test tool: you stand by the teacher at the pool shrine, with a petal and 40 seeds. Press E.' }; });
toolBtn('tLived', () => { soul.testLived = true; banner = { t: 3, top: 'THE LESSON, LIVED', sub: 'Test tool: the game now counts the first lesson as lived (as if you had beaten the first boss and sat in stillness the right way). One deep stillness at a shrine brings the question.' }; });
toolBtn('tColor', () => { if (!realized('mind')) { soul.understood.add('mind'); soul.realized.add('mind'); } colorK = colorK > 0 ? 0 : 1; banner = { t: 2.4, top: colorK ? 'COLOR' : 'INK', sub: 'Test tool: the first color, on or off, without the riddle.' }; });
toolBtn('tStones', () => { if (ARENAS.some(a => a.fight)) return; if (P.mount) dismount(false); P.x = NAVAGRAHA[0].x - 40; P.y = NAVAGRAHA[0].gy - PH; P.vx = P.vy = 0; P.hang = null; P.ladder = null; P.visited.add(5); snapCam(); P.mats.petal += 2; P.mats.ember += 1; P.seeds += 100; banner = { t: 3, top: 'THE NINE STONES', sub: 'Test tool: you stand before them with an offering for each reading (100 seeds, 2 petals, 1 ember stone). Press E.' }; });
toolBtn('tTablets', () => { TABLETS.forEach(t => soul.tablets.add(t.id)); banner = { t: 2.6, top: 'BOTH TABLETS', sub: 'Test tool: the stones can now read the long seasons and the periods of your life.' }; });
toolBtn('tReadReset', () => { READS = {}; saveReads(); life.bodyRead = null; P.boons = []; banner = { t: 2.4, top: 'THE STONES FORGET', sub: 'Test tool: today\'s reading and this body\'s reading are cleared, so you can read again.' }; });
toolBtn('tBoss', () => {
  if (ARENAS.some(a => a.fight)) return;
  if (P.mount) dismount(false);
  const i = ARENAS.findIndex(a => !life.bossDown.has(a.id)), a = ARENAS[i < 0 ? 0 : i], si = 5 + ARENAS.indexOf(a);
  if (i < 0) life.bossDown.clear();
  const s2 = SHRINES[si]; Object.assign(P, { x: s2.x + 40, y: s2.gy - PH, h: PH, vx: 0, vy: 0, hang: null, ladder: null }); rest(si);
  P.x = a.l - 110; snapCam(); banner = { t: 2.6, top: a.name, sub: 'Test tool: you rested at the shrine before it and stand at its gate. Walk in to begin. If you fall, you wake at that shrine.' };
});
toolBtn('tNight', () => { SKY.offset += 12 * 3600e3; SKY.cache = null; banner = { t: 2.4, top: isNight() ? 'NIGHT' : 'DAY', sub: 'Test tool: the sky moved 12 hours. Use the Sky buttons under the game to move it back, or press Now.' }; });
toolBtn('tRich', () => {
  P.seeds += 1000; Object.keys(P.mats).forEach(k => P.mats[k] += 6);
  banner = { t: 2.6, top: 'SEEDS AND MATERIALS', sub: 'Test tool: 1000 seeds and 6 of every material. Rest at a shrine to level up; use a forge to temper.' };
});
toolBtn('tGear', () => {
  WEAPONS.forEach((w, i) => P.weapons.add(i)); Object.keys(GARB).forEach(id => P.garbOwned.add(id));
  banner = { t: 2.6, top: 'ALL WEAPONS AND GARMENTS', sub: 'Test tool: everything is in your pack. Change them in Tab.' };
});
toolBtn('tHorse', () => {
  if (P.mount) return;
  horse.state = 'away'; horse.hp = horse.hpMax; callHorse(true);
});
const WEATHER_ORDER = ['clear', 'windy', 'mist', 'rain', 'storm', null]; let weatherTry = 0;
toolBtn('tWeather', () => {   // the painted look's weather: step through each kind, then back to the weather choosing itself
  if (!V3.ready) { banner = { t: 2.4, top: 'WEATHER', sub: 'Weather is part of the painted look. Choose Painted under Settings.' }; return; }
  const k = WEATHER_ORDER[weatherTry++ % WEATHER_ORDER.length]; V3.setWeather(k);
  banner = { t: 2.2, top: 'WEATHER', sub: k ? `Test tool: ${k}.` : 'Test tool: the weather chooses itself again.' };
});
let fallTry = 0;
toolBtn('tFall', () => {   // lift the player high above where they stand, to feel the fall
  if (P.mount) dismount(false);
  const H4 = [380, 600, 850, 1150], h = H4[fallTry++ % H4.length];
  P.y = Math.max(-400, P.y - h); P.vx = P.vy = 0; P.onG = false; P.hang = null; P.ladder = null; P.fallTop = null; P.fallFree = false;
  floater(pcx(), P.y + P.h + 20, `A DROP OF ${h}`, PENCIL);
});
toolBtn('tShrine', () => {
  if (P.mount) dismount(false);
  const i = (P.shrine + 1) % SHRINES.length, s = SHRINES[i];
  P.x = s.x + 40; P.y = s.gy - PH; P.h = PH; P.vx = P.vy = 0; P.hang = null; P.ladder = null; P.fallTop = null; rest(i); snapCam();
});

/* ---------- soul record panel ---------- */
function renderLives() {
  $('lives').innerHTML = soul.lives.slice().reverse().map(l => `<div class="life"><b>LIFE ${l.n}${l.end ? '' : ' · NOW'}</b>
    <span class="m">Born ${esc(l.birth.local)}, ${esc(l.birth.place)} · ${esc(l.birth.lagna)} lagna · Moon ${esc(l.birth.moon)}</span>
    <span class="m">Mana ${l.birth.tierName}${l.birth.school ? ' (' + l.birth.school + ')' : ''} · ${l.birth.style} · ${esc(l.birth.region)}</span>
    <span>${l.deeds.filter(d => d.seen).length ? l.deeds.filter(d => d.seen).map(d => esc(d.text)).join(' ') : 'Nothing anyone saw yet.'}${l.deeds.some(d => !d.seen) ? ' And things no one saw.' : ''}</span>
    ${l.end ? `<span class="m">Ended: ${esc(l.end)}</span>` : ''}</div>`).join('');
}

/* ---------- gear (Tab) & map (M) ---------- */
function openGear() { mode = 'gear'; clearHeld(); renderGear(); $('ovGear').hidden = false; }
function closePanel() { $('ovGear').hidden = true; mode = 'play'; clearHeld(); saveSoon(); }
let gearView = 'gear';
function renderChantBook() {
  const card = c => { const why = chantBlocked(c); return `<div class="item"><b>${c.name}</b><span class="hand">“${esc(c.line)}”</span><span>${esc(c.what)}</span><span class="m">${c.offer ? `Offering: ${esc(costText(c.offer))}` : 'No offering'}${c.needs === 'good' ? ' · needs karma not in debt' : c.needs === 'nomana' ? ' · only for a body born with no mana' : ''}${why ? ` · now: ${esc(why.toLowerCase())}` : ''}</span></div>`; };
  const known = CHANTS.filter(c => soul.chants.has(c.id)), unknown = CHANTS.filter(c => !soul.chants.has(c.id)), atS = nearShrine() >= 0;
  const prep = c => `<div class="row">${P.prepared.has(c.id) ? `<span class="m">Prepared</span><button class="btn ghost sm" type="button" data-prep="${c.id}"${atS ? '' : ' disabled'}>Put away</button>` : `<button class="btn ghost sm" type="button" data-prep="${c.id}"${atS && P.prepared.size < P.chantSlots ? '' : ' disabled'}>Prepare</button>`}</div>`;
  const card0 = card; const cardP = c => card0(c).replace(/<\/div>$/, prep(c) + '</div>');
  return `<div class="gear"><div class="gcol"><span class="lbl">Chants you know · ${known.length} of ${CHANTS.length} · ${P.prepared.size} of ${P.chantSlots} prepared${P.noMana ? ' (a body with no mana holds five)' : ''}</span>
      <div class="stats"><span>Only prepared chants come up when you press C. ${atS ? 'You are at a shrine: prepare or put away chants here.' : 'Change which chants are prepared while standing at a shrine.'}</span></div>
      <div class="stats"><span>Press C in play: first the weapon blessings, press C again for summons. Choose with a number, then speak the line.</span><span>Clean, steady words make it stronger. Chanting at a shrine makes it stronger and longer. A hit breaks the chant. Without your voice (any mic setting), hold C for three seconds instead: the chant comes out at 85%.</span><span>Summons answer once, then wait until you rest at a shrine.</span></div>
      <div class="inv">${known.map(cardP).join('')}</div></div>
    <div class="gcol"><span class="lbl">Chants still carved somewhere</span><div class="inv">${unknown.length ? unknown.map(c => `<div class="item"><b>?</b><span class="hand">${esc(c.how)}</span></div>`).join('') : '<p class="note">You know every chant in the proving grounds.</p>'}</div></div></div>`;
}
function renderSpellBook() {
  const known = WORDS.filter(w => soul.spells.has(w.id)), unknown = WORDS.filter(w => !soul.spells.has(w.id));
  const sc = WORDS.filter(w => (P.scrolls[w.id] || 0) > 0 || P.wordSlots.includes(w.id) || (P.spark && soul.spells.has(w.id))), atS = nearShrine() >= 0, arts = ART_FOR_STEP.filter(a => soul.arts.has(a));
  const keys = P.noMana ? `<p class="note">This body was born with no mana, so it cannot cast. It reads scrolls instead: one scroll, one cast, no mana and no Focus needed. Scrolls come from spell chests, bosses and the Grasping, and you can write them at a shrine with Grasping ink. What you learn stays with your soul for lives with mana.${P.spark ? ' But a spark woke in it during stillness: with no scroll, a key casts what you know from the spark’s small mana, for the rest of this life.' : ''}${soul.arts.size ? ' Body arts go on these keys too, paid with stamina.' : ''}</p>` + P.wordSlots.map((id, i) => `<label class="wslot"><span class="lbl">Key ${i + 1}</span><select data-ws="${i}"><option value="">— empty —</option>${arts.map(a => `<option value="art:${a}"${'art:' + a === id ? ' selected' : ''}>Body art: ${ARTS[a].name} · ${ARTS[a].st} stamina</option>`).join('')}${sc.map(w => `<option value="${w.id}"${w.id === id ? ' selected' : ''}>${w.say} · scroll ×${P.scrolls[w.id] || 0}${P.spark && soul.spells.has(w.id) ? ` · or ${spellCost(w)} spark` : ''}</option>`).join('')}</select></label>`).join('') + (arts.length ? `<span class="lbl">Body arts · techniques a caster never gets</span><div class="inv">${arts.map(a => `<div class="item"><b>${ARTS[a].name}</b><span>${ARTS[a].what}</span><span class="m">${ARTS[a].st} stamina · rests ${ARTS[a].cd} seconds</span></div>`).join('')}</div>` : '') : P.wordSlots.map((id, i) => `<label class="wslot"><span class="lbl">Key ${i + 1}</span><select data-ws="${i}"${atS ? '' : ' disabled'}><option value="">— empty —</option>${known.map(w => `<option value="${w.id}"${w.id === id ? ' selected' : ''}>${w.say} · ${spellCost(w)} mana</option>`).join('')}</select></label>`).join('') + (P.wordSlots.length < 4 ? `<p class="note">${4 - P.wordSlots.length} key${P.wordSlots.length === 3 ? '' : 's'} locked: this body's ${life.birth.tierName} mana opens ${P.wordSlots.length}.</p>` : '');
  const card = w => { const miss = needsMissing(w), rk = rankOf(w.id), n = soul.ranks[w.id] || 0, next = rk === 1 ? 10 : rk === 2 ? 30 : null;
    const sch = w.school ? `${w.school}${P.school ? (w.school === P.school ? ' · your school, cheaper' : ' · another school, dearer') : ''}` : 'No school';
    const req = w.needs ? Object.entries(w.needs).map(([k, v]) => k === 'focus' ? `Focus ${v}` : k === 'night' ? 'night only' : 'a past life').join(', ') : '';
    return `<div class="item"><b>${w.say} · rank ${rk}</b><span>${w.what}</span><span class="m">${sch} · ${spellCost(w)} mana${req ? ` · needs ${req}` : ''}${miss ? ` · ${miss.toLowerCase()}` : ''}</span><span class="m">Cast ${Math.floor(n)} time${Math.floor(n) === 1 ? '' : 's'}${next ? ` · rank ${rk + 1} at ${next}` : ' · full strength'}</span></div>`; };
  const m = moonLight();
  return `
    <div class="gear">
      <div class="gcol"><span class="lbl">On your keys · say a spell aloud for 100%, press its key for 80%</span>${P.noMana ? '' : `<p class="note">${atS ? 'You are at a shrine: change which spells sit on your keys.' : 'Spells on your keys are changed at a shrine. Stand at one and open Tab.'}</p>`}${keys}
        ${Object.keys(HEARD).length ? `<span class="lbl">Your voice · how the game has learned to hear you</span><div class="inv">${Object.keys(HEARD).filter(id => SPELL(id)).map(id => `<div class="item"><b>${SPELL(id).say}</b><span class="hand">${HEARD[id].map(h => `“${esc(h)}”`).join(', ')}</span><div class="row"><button class="btn ghost sm" type="button" data-forget="${id}">Forget these</button></div></div>`).join('')}</div>` : ''}
        <div class="stats"><span>${esc(skyText())}</span><span>Spells of your birth school cost less; spells of other schools cost more. Spells grow stronger the more you cast them.</span></div>
        <span class="lbl">Spells you know · ${known.length} of ${WORDS.length} · they stay with your soul</span><div class="inv">${known.map(card).join('')}</div></div>
      <div class="gcol"><span class="lbl">Spells still out there</span><div class="inv">${unknown.length ? unknown.map(w => `<div class="item"><b>?</b><span class="hand">${esc(w.how)}</span></div>`).join('') : '<p class="note">You know every spell in the proving grounds.</p>'}</div></div>
    </div>`;
}
function renderGear() {
  const b = life.birth, full = !P.equip.includes(null), LD = loadNow();
  const quiver = () => `<span class="m"><b>Arrows</b> · now: ${ARROWS[P.arrowKind].name}${P.arrowKind === 'reed' ? '' : ' ×' + P.arrows[P.arrowKind]} (R changes)</span>${['reed', 'iron', 'ember', 'ink'].map(k => `<span class="m">${ARROWS[k].name} ${k === 'reed' ? '· endless' : '×' + P.arrows[k]} · ${ARROWS[k].what}</span>`).join('')}<span class="m">More are made at a forge.</span>`;
  const slot = i => { const w = WEAPONS[P.slots[i]]; return `<div class="slot${P.slotIdx === i ? ' cur' : ''}"><span class="lbl">Hand ${i + 1}${P.slotIdx === i ? ' · in use' : ''}</span><b>${w.name}</b><span>${w.perk}</span><span class="m">Weight ${w.weight}</span>${w.long ? quiver() : ''}</div>`; };
  const owned = [...P.weapons].sort((x, y) => x - y);
  const inv = owned.map(wi => { const w = WEAPONS[wi]; return `<div class="item"><b>${w.name}</b><span class="m">Light ${w.light.dmg} · Heavy ${w.heavy.dmg} · Stamina ${w.light.st}/${w.heavy.st} · Weight ${w.weight} · Tier I</span><div class="row"><button class="btn ghost sm" type="button" data-w="${wi}" data-s="0"${w.nomana && !P.noMana ? ' disabled' : ''}>Hand 1</button><button class="btn ghost sm" type="button" data-w="${wi}" data-s="1"${w.nomana && !P.noMana ? ' disabled' : ''}>Hand 2</button>${w.nomana && !P.noMana ? '<span class="m">It slips from hands that hold mana.</span>' : ''}</div>${w.long ? `<span class="m">Arrows: iron ×${P.arrows.iron} · ember ×${P.arrows.ember} · ink ×${P.arrows.ink} · reed endless</span>` : ''}</div>`; }).join('') + (owned.length < WEAPONS.length ? `<p class="note">${WEAPONS.length - owned.length} more weapon${WEAPONS.length - owned.length === 1 ? '' : 's'} hidden in chests on the road.</p>` : '');
  const gslots = ['head', 'body', 'feet'].map(k => { const id = P.garb[k], g = id && GARB[id]; return `<div class="slot"><span class="lbl">${SLOT_NAMES[k]}</span>${g ? `<b>${g.name}</b><span>${g.what}</span><span class="m">Protection ${g.prot}% · Weight ${g.weight}</span><div class="row"><button class="btn ghost sm" type="button" data-goff="${k}">Take off</button></div>` : '<span class="note">Nothing</span>'}</div>`; }).join('');
  const gcar = [...P.garbOwned].filter(id => P.garb[GARB[id].slot] !== id);
  const ginv = gcar.length ? gcar.map(id => { const g = GARB[id]; return `<div class="item"><b>${g.name}</b><span>${SLOT_NAMES[g.slot]} · ${g.what}</span><span class="m">Protection ${g.prot}% · Weight ${g.weight}</span><div class="row"><button class="btn ghost sm" type="button" data-gon="${id}">Wear</button></div></div>`; }).join('') : `<p class="note">Garments you find but do not wear wait here. Found ${P.garbOwned.size} of ${Object.keys(GARB).length}.</p>`;
  const rslots = [0, 1, 2, 3].map(i => { const id = P.equip[i]; return `<div class="slot"><span class="lbl">Relic ${i + 1}</span>${id ? `<b>${RELICS[id].name}</b><span>${RELICS[id].what}</span><div class="row"><button class="btn ghost sm" type="button" data-off="${i}">Take off</button></div>` : '<span class="note">Empty</span>'}</div>`; }).join('');
  const carried = [...P.relics].filter(id => !P.equip.includes(id));
  const rinv = carried.length ? carried.map(id => `<div class="item"><b>${RELICS[id].name}</b><span>${RELICS[id].what}</span><div class="row"><button class="btn ghost sm" type="button" data-on="${id}"${full ? ' disabled' : ''}>${full ? 'Slots full' : 'Put on'}</button></div></div>`).join('') : `<p class="note">Relics you find but do not wear wait here. Found ${P.relics.size} of ${Object.keys(RELICS).length}.</p>`;
  const words = P.noMana ? '<p class="note">This body has no mana: keys 1 to 4 hold scrolls (Spells page).</p>' : P.wordSlots.map((id, i) => `<label class="wslot"><span class="lbl">Key ${i + 1}</span><select data-ws="${i}">${WORDS.map(w => `<option value="${w.id}"${w.id === id ? ' selected' : ''}>${w.say} · ${w.cost} mana</option>`).join('')}</select></label>`).join('');
  const hs = horse.state, horseLine = hs === 'wild' ? 'No mount yet. A wild horse grazes by the hut.' : hs === 'ridden' ? `Riding · horse health ${Math.round(horse.hp)}/${horse.hpMax}` : hs === 'fled' ? 'Your horse is hurt and ran off. Rest at a shrine.' : `Befriended · horse health ${Math.round(horse.hp)}/${horse.hpMax}`;
  $('gearIn').innerHTML = `
    <span class="eyebrow">Life ${life.n} · Tab or Esc to close</span><h2>${gearView === 'spells' ? 'Spells' : gearView === 'chants' ? 'Chants' : gearView === 'body' ? 'This body' : 'Gear'}</h2>
    <div class="row"><button class="btn sm${gearView === 'gear' ? '' : ' ghost'}" type="button" data-view="gear">Gear</button><button class="btn sm${gearView === 'spells' ? '' : ' ghost'}" type="button" data-view="spells">Spells</button><button class="btn sm${gearView === 'chants' ? '' : ' ghost'}" type="button" data-view="chants">Chants</button><button class="btn sm${gearView === 'body' ? '' : ' ghost'}" type="button" data-view="body">Body</button></div>
    ${gearView === 'spells' ? renderSpellBook() : gearView === 'chants' ? renderChantBook() : gearView === 'body' ? bodyHTML() : `<div class="gear">
      <div class="gcol">
        <span class="lbl">Load · what you carry in your hands and wear</span>
        <div class="stats"><span>${LD.w.toFixed(1)} of ${P.loadMax} · ${LD.cls.toUpperCase()}</span><span class="meter"><i style="width:${Math.min(100, LD.r * 100)}%"></i><b style="left:35%"></b><b style="left:70%"></b></span><span>${LD.say}</span><span>Pack ${LD.pack.toFixed(1)} of ${P.packMax}: weapons you are not holding, garments you are not wearing, spare relics and materials.</span></div>
        <span class="lbl">In your hands (Q switches)</span><div class="slots">${slot(0)}${slot(1)}</div>
        <span class="lbl">Weapons</span><div class="inv">${inv}</div>
        <span class="lbl">Garments · protection ${protNow()}%</span><div class="slots three">${gslots}</div>
        <span class="lbl">Carried garments</span><div class="inv">${ginv}</div></div>
      <div class="gcol"><span class="lbl">Relics · 4 slots</span><div class="slots">${rslots}</div>
        <span class="lbl">Carried relics</span><div class="inv">${rinv}</div>
        <span class="lbl">Hotbar</span>
        <div class="stats"><span>1 to 4 · ${P.noMana ? 'scrolls (this body has no mana)' : 'spells'} (${P.noMana ? `${Object.values(P.scrolls).reduce((a, n) => a + n, 0)} carried` : `${b.tierName} mana opens ${P.wordSlots.length}`})</span><span>5 · torch (${Math.ceil(P.torch.fuel)}s of fuel)</span><span>6 · ink knife (${P.knives}/${P.knivesMax})</span><span>7 · lotus (${P.lotus}/${P.lotusMax})</span><span>8 · mount bell: ${esc(horseLine)}</span></div>
        <p class="note">Spells are on the Spells page.</p>
        <span class="lbl">This body</span>
        <div class="stats"><span>Born ${esc(b.local)}, ${esc(b.place)}</span><span>${esc(b.lagna)} lagna · Moon ${esc(b.moon)}</span><span>${esc(b.region)} · ${esc(b.people)}</span><span>${perks(b).map(esc).join(' · ')}</span>
        <span>Health ${Math.round(P.hp)}/${P.hpMax} · Stamina ${P.stMax}${P.manaMax ? ` · Mana ${P.manaMax}` : ''} · Prana ${P.prana}/${P.pranaMax}</span><span>Lotus ${P.lotus}/${P.lotusMax} · Seeds ${P.seeds}</span></div></div>
    </div>`}`;
  $('gearIn').querySelectorAll('[data-view]').forEach(bt => bt.addEventListener('click', () => { gearView = bt.dataset.view; renderGear(); }));
  const q = sel => $('gearIn').querySelectorAll(sel);
  q('[data-w]').forEach(bt => bt.addEventListener('click', () => { const wi = +bt.dataset.w, s = +bt.dataset.s, other = 1 - s; if (WEAPONS[wi].nomana && !P.noMana) return; if (P.slots[other] === wi) P.slots[other] = P.slots[s]; P.slots[s] = wi; renderGear(); }));
  q('[data-goff]').forEach(bt => bt.addEventListener('click', () => { P.garb[bt.dataset.goff] = null; renderGear(); }));
  q('[data-gon]').forEach(bt => bt.addEventListener('click', () => { const id = bt.dataset.gon; P.garb[GARB[id].slot] = id; renderGear(); }));
  q('[data-off]').forEach(bt => bt.addEventListener('click', () => { P.equip[+bt.dataset.off] = null; renderGear(); }));
  q('[data-on]').forEach(bt => bt.addEventListener('click', () => { const i = P.equip.indexOf(null); if (i >= 0) P.equip[i] = bt.dataset.on; renderGear(); }));
  q('[data-prep]').forEach(bt => bt.addEventListener('click', () => { if (nearShrine() < 0) return; const id = bt.dataset.prep; if (P.prepared.has(id)) P.prepared.delete(id); else if (P.prepared.size < P.chantSlots) P.prepared.add(id); renderGear(); }));
  q('[data-forget]').forEach(bt => bt.addEventListener('click', () => { forgetHeard(bt.dataset.forget); renderGear(); }));
  q('[data-ws]').forEach(se => se.addEventListener('change', () => { if (!P.noMana && nearShrine() < 0) { renderGear(); return; } const i = +se.dataset.ws, v = se.value || null, j = v ? P.wordSlots.indexOf(v) : -1; if (j >= 0 && j !== i) P.wordSlots[j] = P.wordSlots[i]; P.wordSlots[i] = v; renderGear(); }));
}
let mapHits = [], mapMsg = null;
function danger() { return ARENAS.some(a => a.fight) || foes.some(f => f.alive && (f.state === 'chase' || f.state === 'wind' || f.state === 'swing') && Math.abs(f.x - P.x) < 520 && Math.abs(f.gy - (P.y + P.h)) < 160); }
function travelTo(i) {
  if (i < 0 || i >= SHRINES.length || !P || P.dead) return;
  if (!P.visited.has(i)) { mapMsg = { t: clock + 2.5, text: 'You have not rested at that shrine in this life.' }; return; }
  if (danger()) { mapMsg = { t: clock + 2.5, text: ARENAS.some(a => a.fight) ? 'There is no leaving a boss fight. Win, or fall.' : 'The Grasping are hunting you. Get away from them first.' }; return; }
  if (P.mount) dismount(false);
  if (horse.state === 'idle') horse.state = 'away';
  const s = SHRINES[i]; Object.assign(P, { fallTop: null, x: s.x + 40, y: s.gy - PH, h: PH, w: 22, vx: 0, vy: 0, hang: null, ladder: null, climbT: 0, glide: false, plunge: false, cling: 0 });
  $('ovGear').hidden = true; mode = 'play'; clearHeld(); rest(i); snapCam();
  for (let k = 0; k < 30; k++) fx.push({ k: 'ink', x: pcx() + rnd(-20, 20), y: P.y + rnd(0, P.h), vx: rnd(-40, 40), vy: -rnd(20, 80), life: rnd(0.4, 1) });
  banner = { t: 2.6, top: 'YOU TRAVEL', sub: `${s.name}. You arrive rested. If your horse was with you, ring the bell to call it again.` };
}
/* ---------- update ---------- */
function update(dt) {
  clock += dt; tickSave(dt);
  if (banner) {
    if (!banner._r) { banner._r = true; banner.t0 = banner.t = Math.max(banner.t, readTime(banner)); }
    if (SETTINGS.msg !== 'stay') { banner.t -= dt; if (banner.t <= 0) banner = null; } else banner.t = Math.max(banner.t, 1);
  }
  if (!banner && BQ.length && mode === 'play') banner = BQ.shift();
  if (life && life.ask && mode === 'play') { life.ask.t -= dt; if (life.ask.t <= 0 && !banner && !BQ.length) openAsk(); }
  if (zoneTag) { zoneTag.t -= dt; if (zoneTag.t <= 0) zoneTag = null; }
  if (villager.talkT > 0) villager.talkT -= dt;
  if (hitstop > 0) { hitstop -= dt; return; }
  if (pendingDeath > 0) { pendingDeath -= dt; P.deadT += dt; if (pendingDeath <= 0) afterFall(); }
  if (mode === 'meditate') { updateMed(dt); return; }
  if (colorK > 0 && colorK < 1) colorK = Math.min(1, colorK + dt / 6);
  if (life && life.riddleAt != null && mode === 'play') { life.riddleAt -= dt; if (life.riddleAt <= 0 && !banner && !BQ.length) openRiddle(); }
  if (mode !== 'play') return;
  if (micMode === 'ptt') {
    if (pressed.talk) { pttHeld = true; startRec(); }
    if (released.talk) { pttHeld = false; pttRelease = performance.now(); setTimeout(() => { if (!pttHeld && micMode === 'ptt') stopRec(); }, 500); }
  }
  updatePlayer(dt); updateFoes(dt); updateShots(dt); updateCrumbles(dt); updateHorse(dt); updateMagic(dt); updateChants(dt);
  for (const f of fx) { f.life -= dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.k === 'dot') f.vy += 900 * dt; }
  fx = fx.filter(f => f.life > 0);
  for (const f of floaters) { f.life -= dt; f.y -= 34 * dt; } floaters = floaters.filter(f => f.life > 0);
  const [tx, ty] = camTarget();
  camX += (tx - camX) * Math.min(1, dt * 5); camY += (ty - camY) * Math.min(1, dt * 4.5);
  shake = Math.max(0, shake - dt * 30);
}

const visible = (r, m = 40) => r.x < camX + W + m && r.x + r.w > camX - m && r.y < camY + H + m && r.y + r.h > camY - m;
let last = performance.now(), frozen = false;
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (!frozen) update(dt); render();
  for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false;
  requestAnimationFrame(loop);
}
/* ---------- meditation and the first realization (Phase 3) ----------
   Meditation is a breathing puzzle: hold Space to breathe in, keep holding, let go to breathe out, stay empty.
   Thoughts drift in; following one (E) breaks the calm, letting it pass deepens it. It cannot be rushed.
   Realization: a riddle at the end of a deep stillness. A right answer is "understood"; it is "realized" only
   when the lesson has been lived. The first lesson: it is all in your mind. Its lived part: you have been
   reborn, you have both beaten a boss and fallen to one, and you have sat in deep stillness three times. */
const MED_PHASES = [['in', 'Breathe in', 4], ['full', 'Hold', 4], ['out', 'Breathe out', 4], ['empty', 'Rest', 4]], MED_CYCLES = 4;
let MED = null, colorK = 0;
const realized = id => soul.realized && soul.realized.has(id);
const COLOR = () => colorK;
function thoughtPool() {
  const t = ['Did I leave something in the chest?', 'The next boss will be harder.', 'More seeds. I need more seeds.', 'What if I fall again?', 'Is this even working?', 'I should be fighting, not sitting.', P.noMana ? 'Who would I be if I had been born with mana?' : 'Who would I be with more mana?', 'The stones said something about me.', 'Was that dog fed?', 'Am I doing this right?'];
  if (life.end || soul.lives.length > 1) t.push('I remember dying.');
  if (soul.bodies.length) t.push('That body by the road was me.');
  if (soul.name) t.push(`${soul.name}. Is that really my name?`);
  if (life.deeds.some(d => d.weight < 0)) t.push('I did something I am not proud of.');
  return t;
}
function openMeditation(i, calm0) {
  banner = null; $('ovGear').hidden = true; mode = 'meditate'; clearHeld();
  MED = { shrine: i, t: 0, calm: calm0 || 40, breath: 0, thoughts: [], nextT: 4, pool: thoughtPool().sort(() => Math.random() - 0.5), stir: 0, msg: null, done: false, followed: 0, passed: 0 };
}
function medPhase(t) { const cyc = Math.floor(t / 16), w = t % 16, i = Math.floor(w / 4); return { cyc, i, k: (w % 4) / 4, p: MED_PHASES[i] }; }
function updateMed(dt) {
  const M = MED; if (!M || M.done) return;
  M.t += dt;
  const ph = medPhase(M.t), want = ph.p[0] === 'in' || ph.p[0] === 'full', grace = ph.k < 0.12 && (ph.i === 0 || ph.i === 2);
  const hold = !!held.jump;
  M.breath = clamp(M.breath + (hold ? 1 : -1) * dt / 4, 0, 1);
  const inw = (life.birth && life.birth.inward) || 0;
  if (!grace) M.calm = clamp(M.calm + (hold === want ? 2.4 * (1 + 0.2 * inw) * (pathAt('dhyana') >= 1 ? 1.25 : 1) : -9 * (1 - 0.15 * inw)) * dt, 0, 100);
  // fidgeting stirs the water
  if (pressed.left || pressed.right || pressed.light || pressed.heavy || pressed.roll || pressed.parry) { M.calm = Math.max(0, M.calm - 6); M.stir = 0.6; M.msg = { t: 2, text: 'You stirred.' }; }
  if (M.stir > 0) M.stir -= dt;
  // thoughts drift in
  M.nextT -= dt;
  if (M.nextT <= 0 && M.t < MED_CYCLES * 16 - 8) { M.nextT = rnd(5, 8) * (1 + 0.3 * ((life.birth && life.birth.inward) || 0)); const side = Math.random() < 0.5 ? -1 : 1; M.thoughts.push({ text: M.pool[(M.passed + M.followed) % M.pool.length], x: W / 2 + side * 420, y: rnd(150, 330), dir: -side, t: 0, life: 7, state: 'drift' }); }
  for (const th of M.thoughts) {
    th.t += dt; if (th.state === 'drift') th.x += th.dir * 80 * dt;
    const near = th.state === 'drift' && th.t > 2 && th.t < 5.5;
    if (near && pressed.use) { th.state = 'followed'; th.t = 0; th.life = 2.2; M.calm = Math.max(0, M.calm - 25); M.followed++; M.msg = { t: 2.4, text: 'You followed it, and lost the breath.' }; tone(200, 120, 0.4, 'sine', 0.04); }
    if (th.state === 'drift' && th.t >= th.life) { th.state = 'gone'; M.calm = Math.min(100, M.calm + 6); M.passed++; M.msg = { t: 1.6, text: 'It passes.' }; }
    if (th.state === 'followed' && th.t >= th.life) th.state = 'gone';
  }
  M.thoughts = M.thoughts.filter(th => th.state !== 'gone');
  if (M.msg) { M.msg.t -= dt; if (M.msg.t <= 0) M.msg = null; }
  if (M.t >= MED_CYCLES * 16) finishMed();
}
function leaveMeditation() { MED = null; mode = 'play'; clearHeld(); floater(pcx(), P.y - 30, 'YOU STAND UP', PENCIL); }
function finishMed() {
  const M = MED; M.done = true; const deep = M.calm >= 70;
  P.mana = P.manaMax; mode = 'play'; MED = null; clearHeld();
  if (!deep) { walk('dhyana', 1); showBanner({ t: 3.4, top: 'YOUR MIND WANDERED', sub: `Calm ${Math.round(M.calm)} of 100. ${P.manaMax ? 'Your mana returns.' : 'Your breath steadies.'} Stillness comes to those who keep the breath and let the thoughts pass.` }); return; }
  soul.dhyana = (soul.dhyana || 0) + 1; life.deepMed = true;
  if (M.followed === 0 && M.passed >= 1 && bossBeaten()) soul.cleanStill = true;   // done right, after the first boss: no thought followed, at least one let pass
  let grew = false; if (P.manaTierMax && (life.medMana || 0) < 10) { life.medMana = (life.medMana || 0) + 2; applyStats(false); grew = true; }
  else if (P.noMana && (life.medSt || 0) < 15) { life.medSt = (life.medSt || 0) + 3; applyStats(false); P.stMax = P.stBase; grew = true; }
  const gifts = [P.manaMax ? 'your mana returns' : 'your breath is your own again'];
  if (P.noMana && !P.spark && pathAt('dhyana') >= 3 && (soul.testSpark || Math.random() < SPARK_CHANCE)) { soul.testSpark = false; P.spark = true; applyStats(false); P.mana = P.manaMax; gifts.push('and something that was never in this body wakes: a spark of mana, small and real, for the rest of this life (keys 1 to 4 can now cast what you know, even with no scroll)'); }
  if (grew) gifts.push(P.noMana ? `this body's stamina grows a little (${P.stBase} now)` : `this body's mana grows a little (${P.manaMax} now)`);
  if (!life.medPrana && P.prana < P.pranaMax) { life.medPrana = true; P.prana++; gifts.push('one prana returns'); }
  if (!life.clearEyes) { life.clearEyes = true; FAKES.forEach(f => f.found = true); gifts.push('your eyes are clearer: what is false in the walls shows itself for the rest of this life'); }
  showBanner({ t: 4.4, top: 'STILLNESS', sub: `Calm ${Math.round(M.calm)} of 100. ${gifts.join('; ').replace(/^./, c => c.toUpperCase())}. Deep stillness ${soul.dhyana} time${soul.dhyana === 1 ? '' : 's'} for this soul.` });
  for (let i = 0; i < 30; i++) fx.push({ k: 'ring', x: pcx(), y: P.y + P.h, life: 0.3 });
  walk('dhyana', 3); walk('alone', 1);
  if (!realized('mind')) {
    if (soul.understood.has('mind')) { if (livedMind()) realize(); }
    else if (bossBeaten() || soul.testLived) life.riddleAt = 2;
  }
}
// the lore (Sahan, Oct 2026): the first lesson is not hard but tricky. It is lived by doing the meditation right,
// letting the thoughts pass and staying with the breath, once the first boss has been faced and beaten.
const bossBeaten = () => Object.values(soul.bossKills).some(v => v > 0);
function livedMind() { return !!soul.testLived || (bossBeaten() && !!soul.cleanStill); }
const RIDDLES = [
  { q: 'A rope lies on a dark path, and a traveller takes it for a snake. His fear is real; his heart pounds. Where does the snake live?', a: ['In the rope', 'In the dark', 'In the mind that sees it', 'In the grass nearby'], r: 2 },
  { q: 'Two travellers cross the same river. One calls it a blessing, the other a curse. Where are the blessing and the curse?', a: ['In the river', 'In the ones who cross it', 'In the sky above it', 'In the gods of the river'], r: 1 },
  { q: 'You have won, and you have fallen. Which of the two was you?', a: ['The one who won', 'The one who fell', 'Whichever the wheel decides', 'Neither: both passed before the one who watched'], r: 3 },
  { q: 'Heat and cold, praise and blame, gain and loss: they come, and they go. What stays?', a: ['The heat', 'The praise', 'The one who notices them come and go', 'Nothing at all'], r: 2 },
  { q: 'An enemy struck you, and you burned with anger for three days. The blow lasted a moment. What hurt you for the other three days?', a: ['The enemy', 'The blow', 'Your own mind, holding it', 'The wheel'], r: 2 },
];
function openRiddle() {
  life.riddleAt = null; soul.asked = soul.asked || [];
  const left = RIDDLES.map((r, i) => i).filter(i => !soul.asked.includes(i)), i = (left.length ? left : RIDDLES.map((r, j) => j))[Math.floor(Math.random() * (left.length || RIDDLES.length))];
  soul.asked.push(i); const R = RIDDLES[i], fade = pathAt('jnana') >= 3 ? R.a.map((t, j) => j).filter(j => j !== R.r)[Math.floor(Math.random() * 3)] : -1;
  banner = null; mode = 'ask'; clearHeld();
  $('gearIn').innerHTML = `<span class="eyebrow">At the end of the stillness, a question rises</span><h2>${esc(R.q)}</h2>
    <div class="choices">${R.a.map((t, j) => `<button class="choice${j === fade ? ' faded' : ''}" type="button" data-ans="${j}"${j === fade ? ' disabled' : ''}><b>${esc(t)}</b></button>`).join('')}</div>${fade >= 0 ? '<p class="note">One answer has faded: you see that it is false.</p>' : ''}
    <p class="note">There is no hurry. A wrong answer loses nothing; the question will return in another form.</p>`;
  $('ovGear').hidden = false;
  $('gearIn').querySelectorAll('[data-ans]').forEach(b => b.addEventListener('click', () => {
    closePanel(); const right = +b.dataset.ans === R.r;
    if (!right) { showBanner({ t: 3.4, top: 'THE QUESTION SINKS BACK', sub: 'Nothing is lost. It will rise again, in another form, in another stillness.' }); return; }
    soul.understood.add('mind'); walk('jnana', 3);
    if (livedMind()) realize();
    else showBanner({ t: 5, top: 'YOU UNDERSTOOD', sub: 'It is all in your mind. You see it, the way one sees a map of a country never walked. The words are yours now (chants and spells are 5% stronger), but the world stays in ink. When you have lived it, the stillness will tell you.' });
  }));
}
function realize() {
  soul.understood.add('mind'); soul.realized.add('mind'); colorK = colorK || 0.001; walk('jnana', 3); applyStats(false); if (P.noMana) P.stMax = P.stBase;
  showBanner({ t: 6, top: 'YOU REALIZED', sub: 'It is all in your mind. The winning and the falling, the friend and the enemy, the snake and the rope: all of it passed before the one who watches. And as the knot loosens, color begins to come back into the world.' });
  for (let i = 0; i < 60; i++) fx.push({ k: 'ink', x: pcx() + rnd(-200, 200), y: P.y + rnd(-200, 60), vx: rnd(-60, 60), vy: -rnd(40, 160), life: rnd(0.8, 2) });
  tone(392, 784, 2.5, 'sine', 0.05); tone(523, 1046, 2.5, 'sine', 0.03, 0.4);
}
/* ---------- the nine stones (Phase 3): Navagraha readings ----------
   Two readings: the one who dreams (the player's real birth against the real sky of today, once a real day)
   and this body (the chart of the current life, once a life). Calculations are standard Vedic ones:
   tara bala, the Moon's transit from the natal Moon, the day lord; with tablets, Saturn, Jupiter and Rahu
   from the natal Moon (Sade Sati included) and the Vimshottari periods. The telling is parable, not prediction. */
const NAVAGRAHA = LEVEL.navagraha;
const TABLETS = LEVEL.tablets;
const SOUL_COST = { seeds: 60, petal: 1, ember: 1 }, BODY_COST = { seeds: 40, petal: 1 };
const READ_KEY = 'samsara.readings';
const HOUSE_WORDS = ['', 'the self and the body', 'money, food and family', 'courage, effort and siblings', 'home, mother and the heart’s rest', 'ideas, children and play', 'struggle, work and health', 'partners and others', 'change and what is hidden', 'fortune, teachers and faith', 'work and your name in the world', 'gains and friends', 'letting go, spending, sleep and far places'];
const the = l => (l === 'Sun' || l === 'Moon' ? 'the ' + l : l), The = l => (l === 'Sun' || l === 'Moon' ? 'The ' + l : l);
const ORD = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const TARAS = [
  ['Janma', 'the birth star', 'mixed', 'The Moon walks over the star you were born under. Days like this turn the eye inward. A potter who stares at his own hands too long forgets the clay: look, then work.'],
  ['Sampat', 'wealth', 'good', 'A day of small gathering. The farmer who picks up one grain more than he drops does not go hungry. What comes today comes quietly; notice it.'],
  ['Vipat', 'danger', 'hard', 'The path is narrower today. A careful traveller steps where the last foot stepped. It is not a day for leaps you would not take on a better one.'],
  ['Kshema', 'well-being', 'good', 'A day that holds you. Even the river rests in its bend. Mend what is worn.'],
  ['Pratyak', 'obstacle', 'hard', 'Something stands in the road today, as a stone stands in a stream. The stream does not argue with the stone. It goes around.'],
  ['Sadhana', 'accomplishment', 'good', 'A day for work begun long ago. The arrow flies from a thousand days of drawing the bow. Finish something.'],
  ['Naidhana', 'the hard star', 'hard', 'The oldest of the hard stars. The old ones said: on such a day speak softly, sign nothing in haste, and walk home before dark. Be gentle with yourself and with others.'],
  ['Mitra', 'a friend', 'good', 'A friendly star. A hand is open to you today. The shy guest goes home hungry.'],
  ['Parama Mitra', 'the best of friends', 'good', 'The best of friends walks beside you. What you begin with a good heart today has the wind behind it.'],
];
const MOON_HOUSE = ['', 'The Moon is on your own Moon: feelings run close to the skin today.', 'The Moon passes the house of food and family: eat well, and speak kindly at the table.', 'The Moon passes the house of courage: effort comes easier.', 'The Moon passes the house of the heart’s rest: a quiet unease may visit; tend your home.', 'The Moon passes the house of ideas and play: the mind wanders, sometimes to good places.', 'The Moon passes the house of struggle, and struggle goes your way: a good day to clear what blocks you.', 'The Moon passes the house of others: company is good today.', 'The Moon passes the eighth house, the hidden one: rest more than usual; the body speaks quietly before it speaks loudly.', 'The Moon passes the house of grace: an elder or a teacher may have a word for you.', 'The Moon passes the house of work: a good day to be seen doing it.', 'The Moon passes the house of gains: small good things arrive.', 'The Moon passes the house of letting go: spend carefully, sleep early.'];
const DAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SATURN_FROM_MOON = {
  12: ['Sade Sati begins', 'Saturn has come to the door before your Moon. This is the first part of Sade Sati, the seven and a half slow years. The tradition says this season tests what was built carelessly and spares what was built well. Watch the purse in small ways: a leaking jar empties without a sound.'],
  1: ['the heart of Sade Sati', 'Saturn sits on your Moon: the heart of Sade Sati. The mind may feel heavy, like walking in wet sand. Rest is not weakness. The body is a lamp, and this season asks you to tend its oil.'],
  2: ['Sade Sati ends', 'Saturn is leaving your Moon: the last part of Sade Sati. The tradition says what was learned in the dark is kept. Words weigh more now; speak kindly at the family table, and count before you spend.'],
  4: ['Saturn below your Moon', 'Saturn stands in the fourth from your Moon. Home and the heart’s rest ask for care. A house is mended one tile at a time.'],
  8: ['Saturn in the eighth from your Moon', 'Saturn stands in the eighth from your Moon, a place the old ones watched closely. Take the long road over the short one that crosses thin ice. Check twice what you would check once: the body, the road, the papers.'],
  3: ['a helpful Saturn', 'Saturn walks a helpful road for you. Slow effort pays now, like a well dug deeper that finds water.'],
  6: ['a helpful Saturn', 'Saturn walks a helpful road for you: steady work wins over what has been in your way.'],
  11: ['a helpful Saturn', 'Saturn walks the house of gains: what you have built slowly begins to give back.'],
  5: ['Saturn in the fifth', 'Saturn walks through the house of ideas and children. Plans ripen late; do not pull the fruit green.'],
  7: ['Saturn in the seventh', 'Saturn walks through the house of others. Partnerships ask for patience; the ones that last are tested first.'],
  9: ['Saturn in the ninth', 'Saturn walks through the house of teachers. Old beliefs are weighed; keep the ones that still hold water.'],
  10: ['Saturn in the tenth', 'Saturn walks through the house of work. The load is heavier, but what you lift now stays lifted.'],
};
const GOOD_JUP = [2, 5, 7, 9, 11];
const LORD_THEME = { Sun: 'the self standing up: your name, your father, those who lead', Moon: 'the mind and the home: the tide rises and falls', Mars: 'fire and effort: courage, quarrels and building', Mercury: 'words, learning and trade', Jupiter: 'teachers, growth and faith', Venus: 'beauty, love, comfort and art', Saturn: 'work, patience and what lasts', Rahu: 'hunger and new roads, often far from home', Ketu: 'letting go, the spirit, and endings that set you free' };
const LORD_PARABLE = { Sun: 'A lamp is lit so that others can see by it.', Moon: 'The sea does not apologise for its tides.', Mars: 'Iron is shaped only while it is hot.', Mercury: 'The merchant who listens sells more than the one who shouts.', Jupiter: 'The tree that bends to the gardener bears fruit.', Venus: 'A garden is a kind of patience you can smell.', Saturn: 'The mountain is not in a hurry, and it is still there.', Rahu: 'Hunger builds roads; it does not always know where they go.', Ketu: 'The snake leaves its skin and does not look back.' };
const WEAK_AT = { Sun: 'standing tall', Moon: 'a calm mind', Mars: 'courage', Mercury: 'clever words', Jupiter: 'good guidance', Venus: 'comfort and ease', Saturn: 'patience', Rahu: 'ambition', Ketu: 'letting go' };
const BOONS = { dmg: 'your blows land harder', prot: 'harm touches you less', st: 'your breath returns faster', heal: 'lotus heals more', mana: 'mana returns faster', chant: 'chants are stronger', spell: 'spells and scrolls are stronger' };
const DAY_BOON = { Sun: ['dmg', 0.06], Moon: ['heal', 0.2], Mars: ['dmg', 0.1], Mercury: ['st', 0.12], Jupiter: ['mana', 0.2], Venus: ['chant', 0.1], Saturn: ['prot', 0.08] };
const BODY_BOON = { Sun: ['dmg', 0.06], Moon: ['heal', 0.2], Mars: ['dmg', 0.08], Mercury: ['st', 0.12], Jupiter: ['mana', 0.2], Venus: ['chant', 0.1], Saturn: ['prot', 0.06], Rahu: ['dmg', 0.06], Ketu: ['spell', 0.1] };
const boonV = k => (P && P.boons ? P.boons.filter(b => b.kind === k).reduce((a, b) => a + b.v, 0) : 0) + ((k === 'spell' || k === 'chant') && soul.understood && soul.understood.has('mind') ? 0.05 : 0) + roadBoon(k) + wayBoon(k) + schoolBoon(k);
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
let READS = {}; try { READS = JSON.parse(localStorage.getItem(READ_KEY)) || {}; } catch (_) { READS = {}; }
function saveReads() { try { localStorage.setItem(READ_KEY, JSON.stringify(READS)); } catch (_) {} }
function fitBoon(b) {
  if (!P || !P.noMana) return b;
  if (b.kind === 'mana') return { kind: 'st', v: 0.12, text: 'This body holds no mana, so the gift turns to breath: stamina returns 12% faster' + (b.src === 'body' ? ' for the rest of this life.' : ' until midnight.') };
  if (b.kind === 'spell') return { kind: 'chant', v: 0.1, text: 'This body holds no mana, so the gift turns to voice: chants are 10% stronger' + (b.src === 'body' ? ' for the rest of this life.' : ' until midnight.') };
  return b;
}
function applyDayBoon() { if (!P) return; P.boons = (P.boons || []).filter(b => b.src !== 'day'); if (READS.day === todayKey() && READS.boon) P.boons.push({ src: 'day', ...fitBoon(READS.boon) }); }
function strengthOf(p) { let s = 1; if (p.dignity === 'exalted') s += 2; else if (p.dignity === 'own sign') s += 1.5; else if (p.dignity === 'debilitated') s -= 1; if ([1, 4, 7, 10].includes(p.house)) s += 1; if ([1, 5, 9].includes(p.house)) s += 0.75; if ([6, 8, 12].includes(p.house)) s -= 0.5; return s; }
function soulChart() {
  // the player's own birth: from this session, or from what was kept
  const src = soul.self && soul.self.date ? soul.self : SELF && SELF.date ? { date: SELF.date, time: SELF.time, city: SELF.city } : null;
  if (!src || !E) return null;
  const [y, mo, d] = src.date.split('-').map(Number), known = !!src.time, [h, mi] = known ? src.time.split(':').map(Number) : [12, 0];
  const utc = E.localToUTC(y, mo, d, h, mi, src.city.tz).utc, c = E.chart(utc, src.city.lat, src.city.lon);
  if (!known) { const ls = c.by.Moon.sign; c.lagna = E.describe(ls * 30); c.planets.forEach(p => { p.house = ((p.sign - ls + 12) % 12) + 1; }); }
  return { c, utc, known, src };
}
function readSoul(now = Date.now()) {
  const sc = soulChart(); if (!sc) return null;
  const { c, utc, known } = sc, nat = c.by.Moon, T = E.chart(now, SKY.lat, SKY.lon), tm = T.by.Moon;
  const tara = (((tm.nak - nat.nak) % 27) + 27) % 27 % 9, TR = TARAS[tara];
  const fromMoon = p => (((p.sign - nat.sign) % 12) + 12) % 12 + 1;
  const mh = fromMoon(tm), dow = new Date(now).getDay(), lord = DAY_LORD[dow];
  const out = { when: now, who: birthLine(sc.src), sections: [], tara: TR[0], taraKind: TR[2], moonHouse: mh, dayLord: lord };
  out.sections.push({ title: 'Today', calc: `Today's Moon is in ${tm.nakName} (${E.SIGNS[tm.sign].en}), the ${ORD(tara + 1)} star counted from your birth star ${nat.nakName}: ${TR[0]}, ${TR[1]}. It walks the ${ORD(mh)} house from your Moon. It is ${DAY_NAME[dow]}, the day of ${the(lord)} (${E.SANSKRIT[lord]}).`, text: `${TR[3]} ${MOON_HOUSE[mh]}` });
  if (soul.tablets.has('wanderers')) {
    const sh = fromMoon(T.by.Saturn), jh = fromMoon(T.by.Jupiter), rh = fromMoon(T.by.Rahu), kh = fromMoon(T.by.Ketu), S = SATURN_FROM_MOON[sh];
    out.sadeSati = [12, 1, 2].includes(sh); out.saturnHouse = sh; out.jupiterHouse = jh;
    out.sections.push({ title: 'This season', calc: `Saturn is in ${E.SIGNS[T.by.Saturn.sign].en}, the ${ORD(sh)} from your Moon (${S[0]}). Jupiter is in ${E.SIGNS[T.by.Jupiter.sign].en}, the ${ORD(jh)} from your Moon. Rahu is in the ${ORD(rh)}, Ketu in the ${ORD(kh)}.`,
      text: `${S[1]} ${GOOD_JUP.includes(jh) ? 'Jupiter, the teacher, looks kindly on your Moon: doors that seemed shut may only be resting.' : 'Jupiter walks a quieter road for you; its gifts come by way of lessons.'} Rahu stirs a hunger in the house of ${HOUSE_WORDS[rh]}; Ketu, across from it, asks you to loosen your grip on ${HOUSE_WORDS[kh]}.` });
  }
  if (soul.tablets.has('periods')) {
    const dd = E.dashas(utc, nat.lon), at = E.dashaAt(dd, now);
    if (at) {
      const md = at.md, ad = at.ad, mdP = c.by[md.lord], adP = c.by[ad.lord], f = ms => new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(ms));
      const nxt = md.sub[md.sub.indexOf(ad) + 1] || null;
      out.md = md.lord; out.ad = ad.lord;
      out.sections.push({ title: 'The season of your life', calc: `You are in the great period of ${the(md.lord)} (${f(md.start)} to ${f(md.end)}), and within it the period of ${the(ad.lord)} (until ${f(ad.end)}). In your chart ${the(md.lord)} sits in the ${ORD(mdP.house)} house${known ? '' : ' counted from the Moon'}, and ${the(ad.lord)} in the ${ORD(adP.house)}.${known ? '' : ' Without the hour of birth these periods may be off by months or even years.'}`,
        text: `The great period is the season; the small one is the weather inside it. Yours is a time of ${LORD_THEME[md.lord]}, turned toward ${HOUSE_WORDS[mdP.house]}. Inside it, ${the(ad.lord)} brings ${LORD_THEME[ad.lord]}, turned toward ${HOUSE_WORDS[adP.house]}. ${LORD_PARABLE[ad.lord]}${nxt ? ` The weather turns in ${f(nxt.start)}, when ${the(nxt.lord)} begins.` : ''}` });
    }
  }
  const boon = TR[2] === 'hard' ? { kind: 'prot', v: 0.1, text: 'For a narrow day the stones lend you a guard: harm touches you 10% less until midnight.' } : TR[2] === 'mixed' ? { kind: 'st', v: 0.1, text: 'On your own star the stones steady your breath: stamina returns 10% faster until midnight.' } : (() => { const [k, v] = DAY_BOON[lord]; return { kind: k, v, text: `On ${the(lord)}'s day, under a friendly star, ${BOONS[k]} (${Math.round(v * 100)}%) until midnight.` }; })();
  out.boon = boon;
  return out;
}
function readBody() {
  const b = life.birth, geo = b.geo; if (!E || !geo) return null;
  const c = E.chart(b.ms, geo.lat, geo.lon), ps = c.planets.slice().sort((a, b2) => strengthOf(b2) - strengthOf(a)), top = ps[0], low = ps[ps.length - 1];
  const [k, v] = BODY_BOON[top.name];
  const why = p => `${p.dignity && p.dignity !== 'neutral' ? p.dignity + ', ' : ''}in the ${ORD(p.house)} house`;
  return { top: top.name, low: low.name, boon: { kind: k, v, text: `For the rest of this life, ${BOONS[k]} (${Math.round(v * 100)}%).` },
    sections: [{ title: 'This body', calc: `This body was born ${b.local} in ${b.place}. ${The(top.name)} stands tallest in its chart (${why(top)}); ${the(low.name)} stands lowest (${why(low)}).`,
      text: `${The(top.name)} is the strong one in this body: ${LORD_THEME[top.name]}. ${LORD_PARABLE[top.name]} ${The(low.name)} is faint here, so ${WEAK_AT[low.name]} will not come easily in this life; what does not come easily can still be earned.` }] };
}
let lastReading = null;
function birthLine(src) { const [y, mo, d] = src.date.split('-').map(Number); const day = new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); return `${day}${src.time ? ', ' + src.time : ' (hour unknown)'}, ${[src.city.name, src.city.country].filter(Boolean).join(', ')}`; }
function openStones() {
  banner = null; mode = 'stone'; clearHeld(); renderStones(); $('ovGear').hidden = false;
}
function readingHTML(r, who) {
  const gift = who === 'soul' ? fitBoon(r.boon) : r.boon;
  return `<div class="reading">${r.sections.map(s => `<div class="rsec"><span class="lbl">${esc(s.title)}</span><span class="calc">${esc(s.calc)}</span><p class="hand">${esc(s.text)}</p></div>`).join('')}
    <div class="rsec gift"><span class="lbl">The stones' gift</span><p>${esc(gift.text)}</p></div></div>`;
}
function renderStones(view) {
  const day = todayKey(), readToday = READS.day === day && READS.soul, bodyDone = !!life.bodyRead, sc = soulChart();
  const locked = TABLETS.filter(t => !soul.tablets.has(t.id));
  if (view === 'soul' && READS.soul) {
    $('gearIn').innerHTML = `<span class="eyebrow">The nine stones · the one who dreams · Esc to leave</span><h2>What the stones say to you</h2>${READS.soul.who ? `<p class="note">Read from your own birth: ${esc(READS.soul.who)}</p>` : ''}${readingHTML(READS.soul, 'soul')}
      ${locked.length ? `<p class="note">The stones are quiet about the longer seasons. ${locked.map(t => esc(t.name)).join(' and ')} would let them say more.</p>` : ''}
      <p class="note">The stones speak in the old way: tradition to reflect on, not a promise of what will happen. What you do with it is yours.</p><div class="row"><button class="btn ghost" type="button" id="stBack">Back to the stones</button></div>`;
    $('stBack').addEventListener('click', () => renderStones()); return;
  }
  if (view === 'body' && life.bodyRead) {
    $('gearIn').innerHTML = `<span class="eyebrow">The nine stones · this body · Esc to leave</span><h2>What the stones say of this body</h2>${readingHTML(life.bodyRead, 'body')}
      <p class="note">This reading is of the body you wear in the game, not of you.</p><div class="row"><button class="btn ghost" type="button" id="stBack">Back to the stones</button></div>`;
    $('stBack').addEventListener('click', () => renderStones()); return;
  }
  const soulBox = !sc ? `<p>The stones can only read you if they know the moment you were born.</p><div class="row"><button class="btn" type="button" id="stTell">Tell them your birth</button></div>`
    : readToday ? `<p>The stones have spoken to you today. Come back tomorrow: the sky will have moved.</p><span class="m">They know you as born ${esc(birthLine(sc.src))}.</span><div class="row"><button class="btn ghost" type="button" id="stSoulAgain">Read again what they said</button></div>`
    : `<p>Your own birth, read against the sky of today.</p><span class="m">The stones know you as born ${esc(birthLine(sc.src))}. <button class="link" type="button" id="stFix">That is not right</button></span><span class="m">Offering: ${esc(costText(SOUL_COST))} · once a day</span><div class="row"><button class="btn" type="button" id="stSoul"${canPay(SOUL_COST) ? '' : ' disabled'}>Make the offering</button></div>${canPay(SOUL_COST) ? '' : '<span class="m">You do not have the offering yet. Seeds come from the Grasping; petals from lotus flowers on water; ember stones from the hot rocks in the dark.</span>'}`;
  const bodyBox = bodyDone ? `<p>The stones have read this body. They read each body once.</p><div class="row"><button class="btn ghost" type="button" id="stBodyAgain">Read again what they said</button></div>`
    : `<p>The chart of the body you wear in this life (life ${life.n}).</p><span class="m">Offering: ${esc(costText(BODY_COST))} · once a life</span><div class="row"><button class="btn" type="button" id="stBody"${canPay(BODY_COST) ? '' : ' disabled'}>Make the offering</button></div>`;
  $('gearIn').innerHTML = `<span class="eyebrow">The nine stones · Navagraha · Esc to leave</span><h2>The nine stones</h2>
    <p class="hand">Nine stones for the nine wanderers of the sky: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu. Bring an offering, and they will read.</p>
    <p class="note">The one who dreams is you, the player: your own birth, whichever life you are in now. This body is the life you wear now, life ${life.n}, and each body is read only once.</p>
    <div class="gear"><div class="gcol"><span class="lbl">The one who dreams · you</span><div class="item">${soulBox}</div></div>
      <div class="gcol"><span class="lbl">This body · life ${life.n}</span><div class="item">${bodyBox}</div></div></div>
    <div class="stats"><span><b>Tablets</b> ${soul.tablets.size} of ${TABLETS.length} found · ${TABLETS.map(t => `${soul.tablets.has(t.id) ? '✓' : '·'} ${esc(t.name)}: ${esc(t.what)}`).join(' · ')}</span>
      ${P.boons && P.boons.length ? `<span><b>Gifts on you</b> ${P.boons.map(b => esc(b.text)).join(' ')}</span>` : ''}</div>
    <p class="note">You carry ${P.seeds} seeds, ${P.mats.petal} lotus petals and ${P.mats.ember} ember stones. The stones speak in the old way: tradition to reflect on, not a promise of what will happen.</p>`;
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('stSoul', () => { if (!canPay(SOUL_COST)) return; const r = readSoul(); if (!r) return; pay(SOUL_COST); walk('jnana', 1); READS = { day, soul: r, boon: r.boon }; saveReads(); applyDayBoon(); stonesGlow(); renderStones('soul'); });
  on('stFix', () => { $('ovGear').hidden = true; openCreate({ forStones: true }); });
  on('stSoulAgain', () => renderStones('soul'));
  on('stBody', () => { if (!canPay(BODY_COST)) return; const r = readBody(); if (!r) { $('gearIn').querySelector('h2').insertAdjacentHTML('afterend', '<p class="note">This body was born at your own real birth, which you chose not to keep, so the stones cannot read this body in this session.</p>'); return; } r.boon = fitBoon({ ...r.boon, src: 'body' }); pay(BODY_COST); life.bodyRead = r; P.boons = (P.boons || []).filter(b => b.src !== 'body'); P.boons.push({ src: 'body', ...r.boon }); stonesGlow(); renderStones('body'); });
  on('stBodyAgain', () => renderStones('body'));
  on('stTell', () => { $('ovGear').hidden = true; openCreate({ forStones: true }); });
}
function stonesGlow() { SFX.relic(); for (const n of NAVAGRAHA) for (let i = 0; i < 30; i++) fx.push({ k: 'star', x: n.x + rnd(-60, 60), y: n.gy - rnd(20, 120), vx: 0, vy: -40, life: rnd(0.4, 1) }); }
const nearStones = () => NAVAGRAHA.find(n => Math.abs(pcx() - n.x) < 70 && Math.abs(P.y + P.h - n.gy) < 40);
const nearTablet = () => TABLETS.find(t => Math.abs(pcx() - t.x) < 40 && Math.abs(P.y + P.h - t.gy) < 50);
function readTablet(t) {
  if (soul.tablets.has(t.id)) { floater(t.x, t.gy - 50, 'YOU HAVE READ THIS TABLET', PENCIL); return; }
  soul.tablets.add(t.id); SFX.relic(); walk('jnana', 2);
  showBanner({ t: 4.4, top: t.name.toUpperCase(), sub: `${t.what} The nine stones can now say more when they read you. Tablets stay with your soul.` });
}
/* ---------- character creation (Phase 3): your birth moment, your body, your soul mark ---------- */
// ~172,000 birthplaces packed into the page (see tools/build-places.js); time zones for any other point come from tz-lookup
/*TZLOOKUP*/
const PLACES_GZ = '/*PLACES*/';
const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let CITIES = [], placesReady = null;
function loadPlaces() {
  if (placesReady) return placesReady;
  placesReady = (async () => {
    if (PLACES_GZ.startsWith('/*') || typeof DecompressionStream === 'undefined') return;
    const bin = Uint8Array.from(atob(PLACES_GZ), ch => ch.charCodeAt(0));
    const txt = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const L = txt.split('\n'), TZ = L[0].split('|').slice(1), AD = L[1].split('|').slice(1), out = [];
    let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (_) {}
    let i = 2;
    for (; i < L.length && L[i] !== '='; i++) { const r = L[i].split('|'); out.push({ name: r[0], prov: r[1], country: r[2], lat: +r[3], lon: +r[4], tz: TZ[parseInt(r[5], 36)] }); }
    let cc = '', cn = '';
    for (i++; i < L.length; i++) { const l = L[i]; if (l[0] === '#') { cc = l.slice(1); try { cn = dn ? dn.of(cc) : cc; } catch (_) { cn = cc; } continue; } const r = l.split('|'); out.push({ name: r[0], prov: AD[parseInt(r[1], 36)], country: cn, lat: +r[2], lon: +r[3], tz: TZ[parseInt(r[4], 36)] }); }
    for (const c of out) { c.n = fold(c.name); c.key = fold(c.name + ' ' + c.prov + ' ' + c.country); }
    CITIES = out;
  })().catch(() => {});
  return placesReady;
}
const tzAt = (lat, lon) => { try { return typeof tzlookup === 'function' ? tzlookup(lat, lon) : null; } catch (_) { return null; } };
function parseCoords(t) {
  const m = String(t).toUpperCase().match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?[\s,;]+(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/); if (!m) return null;
  let lat = +m[1], lon = +m[3]; if (m[2] === 'S') lat = -Math.abs(lat); if (m[4] === 'W') lon = -Math.abs(lon);
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}
async function searchOnline(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('search failed');
  return (await r.json()).map(x => { const parts = String(x.display_name).split(',').map(t => t.trim()), lat = +x.lat, lon = +x.lon; return { name: parts[0], prov: parts.slice(1, -1).slice(-2).join(', '), country: parts[parts.length - 1] || '', lat, lon, tz: tzAt(lat, lon), online: true }; }).filter(c => c.tz);
}
const SELF_KEY = 'samsara.self';
let SELF = null; try { SELF = JSON.parse(localStorage.getItem(SELF_KEY)); } catch (_) { SELF = null; }
const MARKS = { lotus: 'Lotus', spiral: 'Spiral', eye: 'Open eye', crescent: 'Crescent', flame: 'Flame', knot: 'Endless knot' };
const BUILDS = [[3.4, 'Slender'], [4.2, 'Middling'], [5.2, 'Strong']];
const HAIRS = ['Shaved', 'Short', 'Long', 'Topknot'];
function findCities(q) {
  q = fold(q.trim()); if (q.length < 2) return [];
  const starts = [], has = [];
  for (const c of CITIES) { if (c.n.startsWith(q)) starts.push(c); else if (has.length < 8 && c.key.includes(q)) has.push(c); if (starts.length >= 8) break; }
  return starts.concat(has).slice(0, 8);
}
// a real birth: the chart of the moment the player was born, or (time unknown) the day read from the Moon
function realBirth(date, time, city) {
  if (!E) return null;
  const [y, mo, d] = date.split('-').map(Number), known = !!time, [h, mi] = known ? time.split(':').map(Number) : [12, 0];
  const { utc, offset } = E.localToUTC(y, mo, d, h, mi, city.tz);
  const c = E.chart(utc, city.lat, city.lon);
  let moonNote = '';
  if (!known) {
    const ls = c.by.Moon.sign; c.lagna = Object.assign(E.describe(ls * 30), { chandra: true }); c.planets.forEach(p => { p.house = ((p.sign - ls + 12) % 12) + 1; });
    const m0 = E.chart(E.localToUTC(y, mo, d, 0, 1, city.tz).utc, city.lat, city.lon).by.Moon, m1 = E.chart(E.localToUTC(y, mo, d, 23, 59, city.tz).utc, city.lat, city.lon).by.Moon;
    if (m0.nak !== m1.nak) moonNote = `That day the Moon moved from ${m0.nakName} into ${m1.nakName}; without the hour, midday is used.`;
  }
  const g = E.game(c), now = Date.now(), yr = 365.25 * 864e5, inward = inwardOf(c);
  const where = [city.name, city.country].filter(Boolean).join(', ');
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: city.tz, day: 'numeric', month: 'short', year: 'numeric', ...(known ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(utc));
  return { inward, ms: utc, geo: { lat: city.lat, lon: city.lon }, real: true, timeKnown: known, place: where, local: known ? local : `${local} (hour unknown)`, offset: E.fmtOffset(offset), age: Math.floor((now - utc) / yr), looks: null,
    lagna: `${E.SIGNS[c.lagna.sign].en}${known ? '' : ' (from the Moon)'}`, moon: `${E.SIGNS[c.by.Moon.sign].en}, ${c.by.Moon.nakName}`, sun: E.SIGNS[c.by.Sun.sign].en, moonNote,
    tier: g.manaTierIndex, tierName: g.manaTier, school: g.school ? g.school.id : null, style: g.social.split(':')[0], styleFull: g.social, why: g.why, region: g.region, people: g.civilization,
    lagnaWindow: known ? c.lagnaWindow : null, chart: { lagna: c.lagna.sign, moonLon: c.by.Moon.lon, utc } };
}
let CR = null;
function openCreate(o = {}) {
  mode = 'create'; clearHeld(); banner = null;
  const s = SELF || {};
  CR = { forStones: !!o.forStones, step: 1, kind: s.date ? (s.time ? 'real' : 'day') : o.forStones ? 'real' : null, date: s.date || '', time: s.time || '', city: s.city || null, q: s.city ? s.city.name : '', birth: null, err: '',
    looks: s.looks || { hair: 1, build: 4.2, robe: false }, mark: s.mark || 'lotus', name: s.name || '', store: s.store || null, online: null, coords: false, ll: '', llName: '' };
  $('ovCreate').hidden = false; renderCreate(); if (!CITIES.length) loadPlaces().then(() => { if (CR && CR.step === 1) renderCreate(); });
}
function birthCard(b) {
  const line = (k, v) => `<span><b>${k}</b> ${esc(v)}</span>`;
  return `<div class="stats">${b.real ? line('Born', `${b.local} in ${b.place} · ${b.offset}`) : line('Born', `${b.local} in ${b.place}`)}
    ${line(b.real && !b.timeKnown ? 'Rising sign' : 'Lagna (rising sign)', b.lagna)}${b.sun ? line('Sun', b.sun) : ''}${line('Moon', b.moon)}
    ${line('Mana', `${b.tierName}${b.school ? ' · ' + b.school + ' school' : ''}`)}${line('Way', b.styleFull || b.style)}${line('Land', b.region)}${line('People', b.people)}
    ${b.moonNote ? `<span>${esc(b.moonNote)}</span>` : ''}${b.lagnaWindow && b.lagnaWindow.fwd !== null && Math.min(b.lagnaWindow.back, b.lagnaWindow.fwd) < 15 ? `<span>The rising sign changes within ${Math.min(b.lagnaWindow.back, b.lagnaWindow.fwd)} minutes of this time. If your time is not exact, it may differ.</span>` : ''}</div>
    <div class="stats">${perks(b).map(p => `<span>${esc(p)}</span>`).join('')}</div>`;
}
function renderCreate() {
  const c = CR, el = $('createIn'), step = c.step, real = c.kind === 'real' || c.kind === 'day';
  const steps = c.forStones ? ['Your birth', '', 'Keeping it'] : ['Your birth', 'Your body', ...(real ? ['Keeping it'] : [])];
  const head = `<span class="eyebrow">${c.forStones ? `For the nine stones · ${steps[step - 1]}` : `Before your first life · step ${step} of ${steps.length} · ${steps[step - 1]}`}</span>`;
  if (step === 1) {
    const choice = (k, t, d) => `<button class="choice${c.kind === k ? ' on' : ''}" type="button" data-kind="${k}"><b>${t}</b><span>${d}</span></button>`;
    const cityList = c.kind && c.kind !== 'wheel' && !c.city ? (c.online && c.online.results ? c.online.results : findCities(c.q)).filter(x => !c.city || x !== c.city) : [];
    const noMatch = c.q.trim().length >= 2 && !c.city && !findCities(c.q).length;
    el.innerHTML = `${head}<h2>When were you born?</h2>
      <p>Your first life begins at a real moment under the real sky. The stars at that moment shape your body: its mana, its school of magic, and where it comes from.</p>
      <div class="choices">${choice('real', 'My real birth', 'The day, the hour and the place you were born.')}${choice('day', 'I know the day, not the hour', 'Without the hour the rising sign is unknown, so the chart is read from the Moon, as the tradition does.')}${c.forStones ? '' : choice('wheel', 'Let the wheel decide', 'A real moment from the past, chosen for you.')}</div>
      ${real ? `<div class="form">
        <label class="field"><span class="lbl">Date of birth</span><input id="crDate" type="date" min="1900-01-01" max="${new Date().toISOString().slice(0, 10)}" value="${esc(c.date)}"></label>
        ${c.kind === 'real' ? `<label class="field"><span class="lbl">Time of birth (local clock)</span><input id="crTime" type="time" value="${esc(c.time)}"></label>` : ''}
        <label class="field wide"><span class="lbl">Place of birth</span><input id="crCity" type="text" autocomplete="off" placeholder="Start typing a town or city" value="${esc(c.q)}">
          ${c.city ? `<span class="m">✓ ${esc([c.city.name, c.city.prov, c.city.country].filter(Boolean).join(', '))} · ${esc(c.city.tz)} · <button class="link" type="button" id="crChange">change</button></span>` : ''}
          ${!CITIES.length && placesReady ? '<span class="m">Loading the list of places…</span>' : ''}
          ${noMatch && !(c.online && c.online.results) ? `<span class="m">“${esc(c.q.trim())}” is not on the list of ${CITIES.length.toLocaleString('en')} places.</span>` : ''}
          ${cityList.length ? `<span class="clist">${cityList.map((x, i) => `<button type="button" data-city="${i}">${esc(x.name)}<i>${esc([x.prov, x.country].filter(Boolean).join(', '))}</i></button>`).join('')}</span>` : ''}
          ${c.online && c.online.results ? `<span class="m">Results from OpenStreetMap (© OpenStreetMap contributors). <button class="link" type="button" id="crOffline">Back to the built-in list</button></span>` : ''}
          ${c.online && c.online.busy ? '<span class="m">Searching OpenStreetMap…</span>' : ''}${c.online && c.online.err ? `<span class="m err">${esc(c.online.err)}</span>` : ''}
          ${!c.city ? `<span class="m">Not on the list? <button class="link" type="button" id="crOnline">Search online</button> (sends the name you typed to OpenStreetMap) · <button class="link" type="button" id="crCoords">Enter coordinates</button> · or pick the nearest town: a few kilometres moves the chart by only seconds.</span>` : ''}
          ${c.coords && !c.city ? `<span class="coords"><input id="crLL" type="text" placeholder="Latitude, longitude, e.g. 7.031, 79.921" value="${esc(c.ll)}"><input id="crLLName" type="text" placeholder="Name of the place (optional)" value="${esc(c.llName)}"><button class="btn ghost sm" type="button" id="crLLGo">Use these</button></span><span class="m">Copy them from any map: in Google Maps, press and hold on the place. The time zone is found from the coordinates.</span>` : ''}</label>
        </div>
        <div class="row"><button class="btn ghost" id="crCast" type="button">Read my chart</button></div>` : ''}
      ${c.kind === 'wheel' && !c.birth ? '<div class="row"><button class="btn ghost" id="crCast" type="button">Turn the wheel</button></div>' : ''}
      ${c.err ? `<p class="err">${esc(c.err)}</p>` : ''}
      ${c.birth ? `<span class="lbl">${c.birth.real ? 'Your chart' : 'The moment the wheel chose'}</span>${birthCard(c.birth)}` : ''}
      <div class="row">${c.forStones ? '<button class="btn ghost" id="crCancel" type="button">Back to the stones</button>' : ''}<button class="btn" id="crNext" type="button"${c.birth ? '' : ' disabled'}>${c.forStones ? 'Next: keeping your birth' : 'Next: your body'}</button></div>
      <p class="note">This uses the sidereal zodiac (Lahiri), as in Vedic astrology. The birth time you enter is your local clock time; past time zone changes are taken care of.</p>`;
    el.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { c.kind = b.dataset.kind; c.birth = null; c.err = ''; renderCreate(); }));
    const keep = () => { if ($('crDate')) c.date = $('crDate').value; if ($('crTime')) c.time = $('crTime').value; };
    const ci = $('crCity'); if (ci) { ci.addEventListener('input', () => { keep(); c.q = ci.value; c.city = null; c.birth = null; const pos = ci.selectionStart; renderCreate(); const n = $('crCity'); n.focus(); n.setSelectionRange(pos, pos); }); ci.addEventListener('keydown', e => e.stopPropagation()); }
    el.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
    el.querySelectorAll('[data-city]').forEach(b => b.addEventListener('click', () => { keep(); c.city = cityList[+b.dataset.city]; c.q = c.city.name; c.online = null; c.birth = null; renderCreate(); }));
    const chg = $('crChange'); if (chg) chg.addEventListener('click', () => { c.city = null; c.birth = null; c.q = ''; renderCreate(); setTimeout(() => $('crCity') && $('crCity').focus(), 0); });
    const on = $('crOnline'); if (on) on.addEventListener('click', () => { keep(); if (c.q.trim().length < 2) { c.online = { err: 'Type the name of the place first.' }; renderCreate(); return; } c.online = { busy: true }; renderCreate();
      searchOnline(c.q.trim()).then(res => { c.online = res.length ? { results: res } : { err: 'OpenStreetMap found nothing by that name. Try another spelling, or enter coordinates.' }; renderCreate(); }).catch(() => { c.online = { err: 'The online search could not be reached. Check the internet, or enter coordinates instead.' }; renderCreate(); }); });
    const off = $('crOffline'); if (off) off.addEventListener('click', () => { c.online = null; renderCreate(); });
    const co = $('crCoords'); if (co) co.addEventListener('click', () => { keep(); c.coords = true; renderCreate(); });
    const llg = $('crLLGo'); if (llg) llg.addEventListener('click', () => { keep(); c.ll = $('crLL').value; c.llName = $('crLLName').value; const p = parseCoords(c.ll), tz = p && tzAt(p.lat, p.lon);
      if (!p) { c.err = 'Those do not look like coordinates. Write them like 7.031, 79.921.'; renderCreate(); return; } if (!tz) { c.err = 'No time zone was found for that point.'; renderCreate(); return; }
      c.err = ''; c.city = { name: c.llName.trim() || `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`, prov: c.llName.trim() ? `${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}` : '', country: '', lat: p.lat, lon: p.lon, tz }; c.q = c.city.name; c.birth = null; renderCreate(); });
    ['crDate', 'crTime'].forEach(id => { const i = $(id); if (i) i.addEventListener('change', () => { keep(); c.birth = null; }); });
    const cast = $('crCast'); if (cast) cast.addEventListener('click', () => {
      keep(); c.err = '';
      if (c.kind === 'wheel') { c.birth = makeBirth(); renderCreate(); return; }
      if (!E) { c.err = 'The star library did not load (no internet?), so a real chart cannot be read. Let the wheel decide for now.'; renderCreate(); return; }
      if (!c.date) c.err = 'Enter the date you were born.'; else if (c.kind === 'real' && !c.time) c.err = 'Enter the time you were born, or choose "I know the day, not the hour".'; else if (!c.city) c.err = 'Choose your place of birth from the list.';
      else if (new Date(c.date) > new Date()) c.err = 'That date has not come yet.';
      if (!c.err) c.birth = realBirth(c.date, c.kind === 'real' ? c.time : null, c.city);
      renderCreate();
    });
    $('crNext').addEventListener('click', () => { if (!c.birth) return; c.step = c.forStones ? 3 : 2; renderCreate(); });
    const cc = $('crCancel'); if (cc) cc.addEventListener('click', () => { $('ovCreate').hidden = true; CR = null; openStones(); });
    return;
  }
  if (step === 2) {
    const pick = (attr, val, label, on) => `<button class="choice sm${on ? ' on' : ''}" type="button" data-${attr}="${val}">${label}</button>`;
    el.innerHTML = `${head}<h2>Your body, and the mark of your soul</h2>
      <p>This body is yours for one life. When it ends you are born again into another, chosen by your karma. Only the soul mark stays the same in every life: it is how you will know your own past bodies.</p>
      <div class="create2"><div class="prev"><canvas id="crPrev" width="360" height="400" aria-label="Your body"></canvas></div>
      <div class="form left">
        <label class="field wide"><span class="lbl">A name for your soul (optional)</span><input id="crName" type="text" maxlength="24" placeholder="Nameless" value="${esc(c.name)}"></label>
        <span class="lbl">Build</span><div class="pickrow">${BUILDS.map(([v, n]) => pick('build', v, n, c.looks.build === v)).join('')}</div>
        <span class="lbl">Hair</span><div class="pickrow">${HAIRS.map((n, i) => pick('hair', i, n, c.looks.hair === i)).join('')}</div>
        <span class="lbl">Clothing</span><div class="pickrow">${pick('robe', 0, 'Wrap and legs', !c.looks.robe)}${pick('robe', 1, 'Long robe', c.looks.robe)}</div>
        <span class="lbl">Soul mark · it stays with you in every life</span><div class="pickrow marks">${Object.keys(MARKS).map(k => `<button class="choice sm mk${c.mark === k ? ' on' : ''}" type="button" data-mark="${k}"><canvas width="44" height="44" data-mk="${k}"></canvas>${MARKS[k]}</button>`).join('')}</div>
      </div></div>
      <div class="row"><button class="btn ghost" id="crBack" type="button">Back</button><button class="btn" id="crNext" type="button">${real ? 'Next: keeping your birth' : 'Be born'}</button></div>`;
    const nm = $('crName'); nm.addEventListener('input', () => { c.name = nm.value; }); nm.addEventListener('keydown', e => e.stopPropagation());
    el.querySelectorAll('[data-build]').forEach(b => b.addEventListener('click', () => { c.looks.build = +b.dataset.build; renderCreate(); }));
    el.querySelectorAll('[data-hair]').forEach(b => b.addEventListener('click', () => { c.looks.hair = +b.dataset.hair; renderCreate(); }));
    el.querySelectorAll('[data-robe]').forEach(b => b.addEventListener('click', () => { c.looks.robe = b.dataset.robe === '1'; renderCreate(); }));
    el.querySelectorAll('[data-mark]').forEach(b => b.addEventListener('click', () => { c.mark = b.dataset.mark; renderCreate(); }));
    el.querySelectorAll('[data-mk]').forEach(cv2 => drawMarkInto(cv2, cv2.dataset.mk));
    $('crBack').addEventListener('click', () => { c.step = 1; renderCreate(); });
    $('crNext').addEventListener('click', () => { if (real) { c.step = 3; renderCreate(); } else finishCreate(); });
    requestAnimationFrame(drawPreview);
    return;
  }
  const opt = (k, t, d) => `<button class="choice${c.store === k ? ' on' : ''}" type="button" data-store="${k}"><b>${t}</b><span>${d}</span></button>`;
  el.innerHTML = `${head}<h2>Keeping your birth</h2>
    <p>Your date, time and place of birth are personal. The game uses them for your first life and, later, for readings of the sky at shrines. Choose where they are kept. You can change this later.</p>
    <div class="choices">${opt('cloud', 'Keep it with my saves', 'In this test build: kept in this browser. On Steam: kept in your own Steam Cloud, private to your account, so it follows you to any computer.')}
      ${opt('device', 'Keep it on this device only', 'Never sent anywhere. If this device is lost or reset, it is gone, and the game will ask for it again.')}
      ${opt('none', 'Do not keep it', 'Used for this first life only. Readings later in the game will ask for it each time.')}</div>
    <p class="note">Your name, body and soul mark are kept either way. Nothing is ever shared with other players.</p>
    <div class="row"><button class="btn ghost" id="crBack" type="button">Back</button><button class="btn" id="crBorn" type="button"${c.store ? '' : ' disabled'}>${c.forStones ? 'Give it to the stones' : 'Be born'}</button></div>`;
  el.querySelectorAll('[data-store]').forEach(b => b.addEventListener('click', () => { c.store = b.dataset.store; renderCreate(); }));
  $('crBack').addEventListener('click', () => { c.step = c.forStones ? 1 : 2; renderCreate(); });
  $('crBorn').addEventListener('click', () => { if (c.store) finishCreate(); });
}
function finishCreate() {
  const c = CR, b = c.birth;
  if (c.forStones) {
    soul.self = { date: c.date, time: c.kind === 'real' ? c.time : null, city: c.city, chart: b.chart, store: c.store };
    const save = Object.assign({}, SELF || {}, { store: c.store });
    if (c.store !== 'none') Object.assign(save, { date: c.date, time: c.kind === 'real' ? c.time : null, city: { name: c.city.name, prov: c.city.prov, country: c.city.country, lat: c.city.lat, lon: c.city.lon, tz: c.city.tz } });
    else { delete save.date; delete save.time; delete save.city; }
    try { localStorage.setItem(SELF_KEY, JSON.stringify(save)); SELF = save; } catch (_) {}
    $('ovCreate').hidden = true; CR = null; openStones(); return;
  }
  b.looks = { ...c.looks };
  soul.name = c.name.trim() || null; soul.mark = c.mark;
  const keepBirth = b.real && c.store !== 'none';
  soul.self = b.real ? { date: c.date, time: c.kind === 'real' ? c.time : null, city: c.city, chart: b.chart, store: c.store } : null;
  const save = { name: soul.name, looks: c.looks, mark: c.mark, store: b.real ? c.store : (SELF && SELF.store) || null };
  if (keepBirth) Object.assign(save, { date: c.date, time: c.kind === 'real' ? c.time : null, city: { name: c.city.name, prov: c.city.prov, country: c.city.country, lat: c.city.lat, lon: c.city.lon, tz: c.city.tz } });
  else if (!b.real && SELF && SELF.date && SELF.store !== 'none') Object.assign(save, { date: SELF.date, time: SELF.time, city: SELF.city });
  try { localStorage.setItem(SELF_KEY, JSON.stringify(save)); SELF = save; } catch (_) {}
  $('ovCreate').hidden = true; CR = null;
  newLife(b); mode = 'play'; saveNow();
  banner = { t: 4.2, top: `LIFE 1${soul.name ? ' · ' + soul.name.toUpperCase() : ''}`, sub: b.real ? `Born ${b.local} in ${b.place}. ${b.lagna} rising, Moon in ${b.moon}. ${b.tier ? `${b.tierName} mana${b.school ? ', ' + b.school : ''}` : 'No mana: its own way'}.` : `Born ${b.local} in ${b.place} · ${b.lagna} lagna` };
  if (micMode === 'always') startRec();
  tone(330, 660, 0.3, 'sine', 0.04);
}
for (const id in HEARD) { const w = SPELL(id); if (w) for (const ph of HEARD[id]) if (!w.alias.includes(ph)) w.alias.push(ph); }
setTimeout(loadPlaces, 300);
/*DRAW3*/
$('setMsg').value = SETTINGS.msg; $('setMsg').addEventListener('change', e => { SETTINGS.msg = e.target.value; saveSettings(); e.target.blur(); });
if (!SETTINGS.amb) SETTINGS.amb = 'on'; $('setAmb').value = SETTINGS.amb; $('setAmb').addEventListener('change', e => { SETTINGS.amb = e.target.value; saveSettings(); e.target.blur(); });
$('setLook').value = SETTINGS.look; $('setLook').addEventListener('change', e => { SETTINGS.look = e.target.value; saveSettings(); e.target.blur(); if (V3.want()) bootThree(); lookShow(); });
if (V3.want()) bootThree(); lookShow();
$('btnMicCheck').addEventListener('click', e => { e.currentTarget.blur(); micCheck(); });
$('btnBegin').addEventListener('click', () => { const i = freeSlot(); if (i < 0) return; if (MC) { try { MC.stop(); } catch (_) {} MC = null; }
  setMicMode($('micStart').value); $('ovStart').hidden = true; freshSoul(i); openCreate();
});
$('btnQuick').addEventListener('click', () => { if (MC) { try { MC.stop(); } catch (_) {} MC = null; }
  setMicMode($('micStart').value);
  const fs = freeSlot(); if (fs < 0) return; freshSoul(fs);
  $('ovStart').hidden = true; if (!soul.mark) soul.mark = (SELF && SELF.mark) || 'lotus'; newLife(makeBirth()); mode = 'play'; saveNow();
  if (micMode === 'always') startRec();
  tone(330, 660, 0.3, 'sine', 0.04);
});
/* ---------- the drawing: everything that paints the screen lives in draw-ink.js (and later a three.js version) ---------- */
/*DRAW*/
renderSlots(); fit(); requestAnimationFrame(loop);
window.__life = {
  get P() { return P; }, get soul() { return soul; }, get mode() { return mode; }, get foes() { return foes; }, get cam() { return [camX, camY]; }, get pots() { return pots; },
  SHRINES, CRUMBLES, FAKES, RELICS, castWord, WORDS, findWord, fall, setMicMode, step: dt => update(dt),
  put(x, y) { P.x = x; P.y = y - P.h; P.vx = 0; P.vy = 0; P.onG = false; P.fallTop = null; P.fallFree = true; P.dead = false; P.hang = null; P.ladder = null; P.climbT = 0; snapCam(); },
  equip(list) { list.forEach(id => P.relics.add(id)); P.equip = list.concat([null, null, null, null]).slice(0, 4); },
  noFoes() { foes.forEach(f => f.alive = false); },
  get horse() { return horse; }, mouse, get camX() { return camX; }, get camY() { return camY; }, V3, setLook(v) { SETTINGS.look = v; $('setLook').value = v; if (V3.want()) bootThree(); lookShow(); }, FALL_SAFE, FALL_DEADLY, saveNow: () => saveNow(), loadSoul: i => loadSoul(i), readSlot: i => readSlot(i), snapshot: () => snapshot(), get slot() { return slot; }, toTitle: () => toTitle(), importSoul: t => importSoul(t), freeSlot: () => freeSlot(), renderSlots: m => renderSlots(m), SCHOOLS, WAYS, wayOf: () => wayOf(), aloneNow: () => aloneNow(), companions: () => companions(), wayBoon: k => wayBoon(k), schoolBoon: k => schoolBoon(k), moonRegen: () => moonRegen(), moonStamina: () => moonStamina(), staminaGrowth: () => staminaGrowth(), set moonTest(v) { moonTest = v; }, manaGrowth: () => manaGrowth(), bodyHTML: () => bodyHTML(), finishMed: () => finishMed(), PATHS, PATH_STEPS, walk: (k, n) => walk(k, n), pathAt: k => pathAt(k), ARTS, useArt: a => useArt(a), TEACHER, TASKS, openTeacher: () => openTeacher(), SEAT, roadsHTML: () => roadsHTML(), roadBoon: k => roadBoon(k), keepCount: () => keepCount(), SETTINGS, get banner2() { return banner; }, inwardOf: c => inwardOf(c), get MED() { return MED; }, openMeditation: i => openMeditation(i), get colorK() { return colorK; }, livedMind: () => livedMind(), openRiddle: () => openRiddle(), RIDDLES, readSoul: t => readSoul(t), readBody: () => readBody(), soulChart: () => soulChart(), NAVAGRAHA, TABLETS, get READS() { return READS; }, boonV: k => boonV(k), applyDayBoon: () => applyDayBoon(), openStones: () => openStones(), E, realBirth: (d, t, c) => realBirth(d, t, c), findCities: q => findCities(q), placesCount: () => CITIES.length, get CR() { return CR; }, gainScroll: (id, n) => gainScroll(id, n), get shots() { return shots; }, get banner() { return banner; }, get BQ() { return BQ; }, openChestAt: x => openChest(CHESTS.find(c => c.x === x)), get CHESTS_() { return CHESTS; }, ARENAS, get WAVES() { return WAVES; }, get WISPS() { return WISPS; }, bossNow: () => bossNow(), hurtFoe: (f, d, h) => hurtFoe(f, d, !!h), hurtPlayer: (d) => hurtPlayer(d, { x: 0, w: 0 }, false), get life() { return life; }, lifeKarma: () => lifeKarma(), set autoAsk(v) { autoAsk = v; }, realmLean: () => realmLean(), DOG, nearDebt: () => nearDebt(), witnesses: t => witnesses(t), begChance: () => begChance(), spawnFoes: () => spawnFoes(), sunAlt: () => sunAlt(), frontFoe: (r, d) => frontFoe(r, d), get CHS() { return CHS; }, get SUMMONS() { return SUMMONS; }, CHANTS, chantHeard: t => chantHeard(t), matchWords: (a, b) => matchWords(a, b), readInscription: id => readInscription(INSCRIPTIONS.find(q => q.id === id)), SKY, skyState: () => skyState(), skyText: () => skyText(), skyFast: v => skyFast(v), cast: (id, pw) => castWord(SPELL(id), pw || 1), learnSpell: id => learnSpell(id), setNight: v => { nightOverride = v; }, get TEMPS() { return TEMPS; }, get RAINS() { return RAINS; }, get ALLY() { return ALLY; }, answerStone: t => answerStone(t), useStone: k => useStone(STONES.find(s => s.k === k)), travelTo: i => travelTo(i), packWeight: () => packWeight(), openContainer: (inv, n, h) => openContainer(inv, n, h), HOME, moveItem: (inv, sp, t) => moveItem(inv, sp, t), NODES, levelOf: () => levelOf(), openShrine: i => openShrine(i), openForge: () => openForge(), applyStats: f => applyStats(f), wMul: w => wMul(w), CHESTS, WEAPONS, GARB, loadNow: () => loadNow(), protNow: () => protNow(), mount: () => mount(), callHorse: f => callHorse(f),
  held, pressed, released, mouse, freeze(v) { frozen = v; },
  run(n, keys = {}, press = {}) { Object.assign(held, keys); for (let i = 0; i < n; i++) { if (i === 0) for (const k in press) { pressed[k] = true; if (press[k] === 'tap') held[k] = true; } update(1 / 60); for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false; if (i === 0) for (const k in press) if (press[k] === 'tap') { held[k] = false; } } for (const k in keys) held[k] = false; render(); },
};
})();
