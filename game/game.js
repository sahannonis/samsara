(() => {
'use strict';
const $ = id => document.getElementById(id);
const W = 960, H = 540, GRAV = 2000, LW = 9800, LH = 1400, PH = 52, CH = 34, BREATH = 8, TORCH = 60, KNIVES = 5;
const INK = '#151513', INK2 = '#3d3b35', PENCIL = '#8c897f', PAPER = '#fbfaf6', RULE = '#ebe8de', FAINT = '#e2ded3', RED = '#c4252b', HATCH = '#cfcbc0';
const FD = '"Rubik Mono One","Arial Black",sans-serif', FH = '"Kalam","Comic Sans MS",cursive', FM = '"DM Mono",ui-monospace,monospace';
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
const SCHOOL_PERK = { Agni: 'Ignite hits 25% harder. Burning ground cannot hurt you', Jala: 'Restore heals 40% more', Vayu: 'Rolls cost 30% less stamina', Prithvi: 'Shield lasts twice as long', Akasha: 'Mana returns 50% faster' };
function makeBirth() {
  const now = Date.now(), yr = 365.25 * 864e5;
  const ms = now - rnd(18, 64) * yr, pl = PLACES[Math.floor(Math.random() * PLACES.length)];
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: pl[3], day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  const looks = { hair: Math.floor(Math.random() * 4), build: [3.4, 4.2, 5.2][Math.floor(Math.random() * 3)], robe: Math.random() < 0.4 };
  const age = Math.floor((now - ms) / yr);
  if (!E) {
    const tier = Math.floor(Math.random() * 5), schools = ['Agni', 'Jala', 'Vayu', 'Prithvi', 'Akasha'];
    return { ms, place: pl[0], local, age, looks, lagna: '—', moon: '—', tier, tierName: ['None', 'Low', 'Medium', 'High', 'Great'][tier], school: tier ? schools[Math.floor(Math.random() * 5)] : null, style: 'Balanced', region: 'Unknown lands', people: 'Unknown people' };
  }
  const c = E.chart(ms, pl[1], pl[2]), g = E.game(c);
  return { ms, place: pl[0], local, age, looks, lagna: E.SIGNS[c.lagna.sign].en, moon: `${E.SIGNS[c.by.Moon.sign].en}, ${c.by.Moon.nakName}`, tier: g.manaTierIndex, tierName: g.manaTier, school: g.school ? g.school.id : null, style: g.social.split(':')[0], region: g.region, people: g.civilization };
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
  if (b.style === 'Sovereign') out.push('Sovereign: 10% more damage alone');
  return out;
}

/* ---------- the proving grounds ---------- */
const SOLIDS = [], ONEWAYS = [], LADDERS = [], WATERS = [], WINDS = [], DARKS = [], CRUMBLES = [], FAKES = [];
const S = (x, y, w, h, surf) => SOLIDS.push({ k: 'solid', x, y, w, h, surf });
const O = (x, y, w) => ONEWAYS.push({ k: 'oneway', x, y, w, h: 10 });
// village, low tunnel, planks
S(0, 1000, 2780, 400);
S(1350, 640, 400, 320);
O(800, 900, 140);
O(2150, 900, 150); O(2330, 810, 140); O(2180, 720, 130);
// plateau, ladder, lower floor, the long tunnel
S(2780, 790, 670, 610);
LADDERS.push({ x: 3452, y: 790, w: 24, h: 310 }); O(3450, 790, 44);
S(3450, 1100, 900, 160);
S(3450, 1260, 250, 80);
S(3450, 1340, 2300, 60);
// cliff top: mud and ice
S(4350, 955, 150, 305); S(4500, 955, 300, 305, 'mud'); S(4800, 955, 50, 305); S(4850, 955, 350, 305, 'ice');
// the pool
WATERS.push({ x: 5200, y: 1050, w: 550, h: 290, top: true }, { x: 3700, y: 1260, w: 1500, h: 80 });
S(5440, 620, 80, 630);
// bank and chimney
S(5750, 1020, 470, 380);
S(6040, 300, 60, 650);
// wind gap
S(6220, 560, 380, 840);
WINDS.push({ x: 6640, y: 220, w: 470, h: 1180 });
S(7150, 560, 350, 840);
// the dark
S(7500, 300, 1300, 180);
S(7500, 560, 150, 840); S(7650, 660, 150, 740); S(7800, 760, 50, 640); S(7850, 760, 300, 640, 'hot');
for (let i = 0; i < 5; i++) CRUMBLES.push({ k: 'crumble', x: 8150 + i * 80, y: 760, w: 80, h: 16, state: 'solid', t: 0 });
S(8550, 760, 1250, 640);
S(9600, 0, 200, 660);
FAKES.push({ x: 9600, y: 660, w: 200, h: 100, found: false });
DARKS.push({ x: 7500, y: 0, w: 1300, h: 1400 });

const SHRINES = [
  { x: 180, gy: 1000, name: 'Village shrine' }, { x: 2960, gy: 790, name: 'Plateau shrine' }, { x: 5900, gy: 1020, name: 'Pool shrine' },
  { x: 7300, gy: 560, name: 'Cave mouth shrine' }, { x: 9450, gy: 760, name: 'End shrine' },
];
const HUT = { x: 470, gy: 1000 };
const FOE_SPAWNS = [
  { x: 1180, gy: 1000, l: 1040, r: 1345 },
  { x: 1950, gy: 1000, l: 1770, r: 2130, high: true },
  { x: 2560, gy: 1000, l: 2420, r: 2775 },
  { x: 3220, gy: 790, l: 3040, r: 3445 },
  { x: 3800, gy: 1100, l: 3500, r: 4020 },
  { x: 4120, gy: 1100, l: 3980, r: 4345 },
  { x: 4650, gy: 955, l: 4510, r: 4800, mud: true },
  { x: 8000, gy: 760, l: 7810, r: 8145 },
  { x: 9000, gy: 760, l: 8820, r: 9340 },
  { x: 9200, gy: 760, l: 8820, r: 9340, high: true },
];
const RELICS = {
  garuda: { name: 'Garuda feather', what: 'Jump again in the air.' },
  gecko: { name: 'Gecko charm', what: 'Cling to walls and kick off them.' },
  kite: { name: 'Kite cloth', what: 'Hold jump while falling to glide. Wind lifts a glider.' },
  naga: { name: 'Naga scale', what: 'Breathe under water and swim faster.' },
  bead: { name: 'Rudraksha bead', what: 'See what is false. More light in the dark. Soul relic: it stays with you across lives.', soul: true },
  ember: { name: 'Ember of Agni', what: 'Walk on burning ground.' },
  tortoise: { name: 'Tortoise shell', what: 'A wider window to parry.' },
};
const RELIC_SPOTS = [['garuda', 870, 900], ['bead', 4440, 955], ['ember', 3760, 1340], ['naga', 5330, 1340], ['gecko', 6160, 1020], ['kite', 6470, 560], ['tortoise', 9730, 760]];
const POT_SPOTS = [[2240, 720, 40], [3520, 1100, 20], [7720, 660, 30], [5650, 1340, 25]];
const HINTS = [
  [640, 800, 'Strike trees and ore to gather.'],
  [150, 790, 'The forge tempers weapons.'],
  [330, 870, 'A and D to walk. Space to jump.'],
  [870, 830, 'Jump up onto the plank.'],
  [1200, 880, 'Too low to stand. Hold S to crawl.'],
  [1950, 870, 'This one swings high. Duck under it with S.'],
  [2290, 650, 'On a plank, S + Space drops you through.'],
  [2600, 870, 'Too high for one jump. Jump again in the air.'],
  [3300, 700, 'The ladder: W and S climb.'],
  [4060, 1010, 'Jump at the cliff and hold toward it to grab the edge. W climbs.'],
  [4650, 880, 'Mud is slow and heavy.'],
  [5030, 880, 'Ice keeps you sliding.'],
  [5330, 990, 'W swims up, S dives. Watch your breath.'],
  [5000, 1225, 'A long way on one breath…'],
  [6170, 900, 'Hold toward a wall to cling. Space kicks off.'],
  [6870, 470, 'Hold Space as you fall to glide. The wind lifts a glider.'],
  [7330, 440, 'Dark ahead. Press 5 to light the torch.'],
  [8000, 700, 'The ground burns.'],
  [8350, 700, 'The bridge crumbles. Keep moving.'],
  [9050, 660, 'Rest at the shrine. The proving grounds end here.'],
];
const ZONES = [[0, 'THE VILLAGE', 'Rest, talk, and find your first relic'], [1300, 'THE LOW TUNNEL', 'Crawl'], [2140, 'THE PLANKS', 'Up, through and over'], [2780, 'THE PLATEAU', 'Ledges and a ladder'],
  [4350, 'MUD AND ICE', 'The ground changes how you move'], [5200, 'THE POOL', 'Breath matters'], [6040, 'THE CHIMNEY', 'Walls you can climb, with the right charm'], [6600, 'THE WIND GAP', 'Too far to jump'],
  [7500, 'THE DARK', 'Light, fire and false walls'], [8800, 'THE ARENA', 'The end of the proving grounds']];

function blocked(b) {
  for (const s of SOLIDS) if (overlap(b, s)) return s;
  for (const c of CRUMBLES) if (c.state !== 'gone' && overlap(b, c)) return c;
  for (const t of TEMPS) if (overlap(b, { x: t.x, y: t.y + t.h * (1 - t.rise), w: t.w, h: t.h * t.rise })) return t;
  return null;
}
function pointSolid(x, y) {
  for (const s of SOLIDS) if (inR(x, y, s)) return s;
  for (const c of CRUMBLES) if (c.state !== 'gone' && inR(x, y, c)) return c;
  for (const t of TEMPS) if (inR(x, y, t)) return t;
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
const cv = $('cv'), ctx = cv.getContext('2d');
const dk = document.createElement('canvas'), dctx = dk.getContext('2d');
let scale = 1;
function fit() { const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); dk.width = cv.width; dk.height = cv.height; scale = cv.width / W; }
addEventListener('resize', fit);
const KEYS = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', Space: 'jump', KeyS: 'down', ArrowDown: 'down', KeyJ: 'light', KeyK: 'heavy', KeyL: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll', KeyI: 'parry', KeyF: 'heal', KeyQ: 'swap', KeyE: 'use', KeyV: 'talk' };
for (let i = 1; i <= 8; i++) KEYS['Digit' + i] = 'h' + i;
const held = {}, pressed = {}, released = {};
let mode = 'start';
addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT' || (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox')) return;
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'play') openGear(); else if (mode === 'gear') closePanel(); return; }
  if (mode === 'map' && /^Digit[1-9]$/.test(e.code)) { travelTo(+e.code.slice(5) - 1); return; }
  if (e.code === 'KeyM' && !e.repeat) { if (mode === 'play') { mode = 'map'; clearHeld(); } else if (mode === 'map') closePanel(); return; }
  if (e.code === 'Escape') { if (mode === 'gear' || mode === 'map' || mode === 'shrine' || mode === 'forge' || mode === 'chest' || mode === 'stone') { closePanel(); return; } if (mode === 'play') { mode = 'pause'; $('ovPause').hidden = false; } else if (mode === 'pause') resume(); return; }
  const a = KEYS[e.code]; if (!a) return;
  if (mode === 'play') e.preventDefault();
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
  { id: 'unseen', say: 'Unseen', short: 'UNSEEN', school: 'Akasha', cost: 25, what: 'You turn to ink and foes lose you for 5 seconds, 8 at night. Attacking ends it.', how: 'Someone you helped may teach you.', alias: ['unseen', 'un seen', 'unscene', 'on seen', 'and seen', 'unsean'] },
  { id: 'embers', say: 'Ember rain', short: 'EMBERS', school: 'Agni', cost: 30, what: 'Fire falls along the ground in front of you.', how: 'Past the crumbling bridge.', alias: ['ember rain', 'ember', 'embers', 'amber rain', 'member rain', 'amber'] },
  { id: 'echo', say: 'Echo', short: 'ECHO', school: 'Akasha', cost: 40, needs: { life: 2 }, what: 'A shade of one of your past lives fights beside you for 10 seconds.', how: 'Find a body you once wore.', alias: ['echo', 'eco', 'echoes', 'ekko', 'akko', 'ecco'] },
  { id: 'grasp', say: 'Grasp', short: 'GRASP', school: null, cost: 20, what: "Greed's own spell. Pull a foe to you and take some of its seeds. Using it weighs a little on karma.", how: 'The Grasping carry it. Defeat them.', alias: ['grasp', 'grasped', 'gasp', 'crasp', 'graps', 'grasps'] },
  { id: 'shani', say: 'Shani', short: 'SHANI', school: null, cost: 45, needs: { focus: 14 }, what: 'The weight of Saturn: everything near you slows down for 6 seconds, and you slow a little too.', how: 'A speaking stone below the plateau asks a question.', alias: ['shani', 'shanni', 'sani', 'shaney', 'saturn', 'shanee'] },
  { id: 'tide', say: 'Chandra', short: 'TIDE', school: null, cost: 30, what: "The Moon's tide heals you over 6 seconds. It is stronger the fuller the real Moon is tonight.", how: 'A stone above the wind gap wakes at night.', alias: ['chandra', 'chandr', 'candra', 'chandler', 'chander', 'tide'] },
  { id: 'starfall', say: 'Starfall', short: 'STARFALL', school: 'Akasha', cost: 50, needs: { night: true, focus: 12 }, what: 'Starlight strikes every foe you can see. Only at night where you are.', how: 'Behind a wall that is not there.', alias: ['starfall', 'star fall', 'star full', 'starful', 'stall fall'] },
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
function startRec() {
  if (!SR || recOn) return;
  rec = new SR(); rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 3;
  const used = new Map();
  rec.onaudiostart = () => { micReady = true; };
  rec.onresult = e => {
    if (micMode === 'off' || (micMode === 'ptt' && !pttHeld && performance.now() - pttRelease > 450)) return;
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
        if (a === 0 && r.isFinal && toks.length) voiceLog(`heard “${r[a].transcript.trim()}” (no battle word)`, false);
      }
    }
  };
  rec.onerror = e => { const m = { 'not-allowed': 'Microphone blocked. Allow it in the address bar.', network: 'Speech service unreachable (needs internet).', 'audio-capture': 'No microphone found.' }[e.error]; if (m) { voiceLog(m, false); if (e.error !== 'network') setMicMode('off'); } };
  rec.onend = () => { recOn = false; micReady = false; if (mode === 'play' && (micMode === 'always' || (micMode === 'ptt' && pttHeld))) startRec(); };
  try { rec.start(); recOn = true; } catch (_) { recOn = false; }
}
function stopRec() { try { rec && rec.stop(); } catch (_) {} }

/* ---------- state ---------- */
const soul = { spells: new Set(['ignite', 'shield', 'restore']), ranks: {}, kills: 0, home: null, karma: 0, deeds: [], lives: [], memories: { gift: 0, spared: 0, slain: 0 }, bodies: [], soulRelics: new Set() };
let life = null, P = null, foes = [], shots = [], fx = [], floaters = [], shades = [], drops = [], pots = [];
let shake = 0, hitstop = 0, clock = 0, banner = null, pendingDeath = 0, zoneTag = null;
const villager = { x: 560, gy: 1000, helped: false, talkT: 0, line: '' };
const has = id => P.equip.includes(id);
const pcx = () => P.x + P.w / 2;
const wears = id => P.garb.head === id || P.garb.body === id || P.garb.feet === id;
const inHand = id => WEAPONS[P.slots[P.slotIdx]].id === id;

function newLife(birth) {
  life = { n: soul.lives.length + 1, birth, deeds: [], end: null, start: Date.now() };
  soul.lives.push(life);
  const b = birth, noMana = b.tier === 0;
  const manaMax = [0, 40, 60, 80, 100][b.tier];
  const sr = [...soul.soulRelics];
  P = { x: SHRINES[0].x + 40, y: SHRINES[0].gy - PH, w: 22, h: PH, vx: 0, vy: 0, face: 1, onG: true, groundS: null, hp: 100, hpMax: 100, st: noMana ? 125 : 100, stMax: noMana ? 125 : 100, stDelay: 0,
    mana: manaMax, manaMax, prana: 3, pranaMax: 3, lotus: 3, lotusMax: 3, seeds: 0, slots: [0, 2], slotIdx: 0, swapT: 0, mT: 0, mDown: false, chargeSrc: null, bufLight: 0,
    wordSlots: Array.from({ length: [0, 1, 2, 3, 4][b.tier] }, (_, i) => (WORDS.filter(w => soul.spells.has(w.id))[i] || {}).id || null),
    atk: null, charge: 0, charging: false, rollT: 0, rollIF: 0, parryT: 0, parryCd: 0, healT: 0, hitT: 0, inv: 0, shieldT: 0, riposte: 0, dead: false, deadT: 0,
    dmgMul: (noMana ? 1.15 : 1) * (b.style === 'Sovereign' ? 1.1 : 1), looks: b.looks, school: b.school, noMana, run: 0,
    stBase: noMana ? 125 : 100, visited: new Set([0]), weapons: new Set([0, 2]), stats: birthStats(b), stats0: birthStats(b), skills: new Set(), skillPending: null, wtier: {}, mats: { wood: 0, iron: 0, ink: 0, petal: 0, ember: 0 }, knivesMax: KNIVES, torchMax: TORCH, made: new Set(), manaTierMax: manaMax, garb: { head: null, body: 'wrap', feet: 'sandals' }, garbOwned: new Set(['wrap', 'sandals']), loadMax: 20, combo: 0, comboT: 0, rollV: 0, mount: false, trampleCd: 0,
    relics: new Set(sr), equip: sr.concat([null, null, null, null]).slice(0, 4), shrine: 0, safe: { x: SHRINES[0].x + 40, y: SHRINES[0].gy },
    jumpsLeft: 0, jumping: false, coy: 0, jbuf: 0, dropT: 0, grabCd: 0, kickT: 0, clingMem: 0, clingDir: 0, cling: 0, hang: null, climbT: 0, climb: null, ladder: null, glide: false, plunge: false, landT: 0,
    inWater: false, headUnder: false, breath: BREATH, burnT: 0, crouch: false, torch: { fuel: TORCH, lit: false }, knives: KNIVES, knifeCd: 0, zones: new Set(), zone: -1 };
  applyStats(true);
  resetNodes();
  if (!soul.home) soul.home = emptyInv();
  newHorse(); resetChests();
  TEMPS = []; RAINS = []; ALLY = null;
  pots = POT_SPOTS.map(([x, gy, seeds]) => ({ x, gy, seeds, broken: false }));
  FAKES.forEach(f => f.found = false);
  drops = []; shots = []; resetCrumbles(); spawnFoes();
  snapCam();
  banner = { t: 3.2, top: `LIFE ${life.n}`, sub: `Born ${b.local} in ${b.place} · ${b.lagna} lagna` };
  renderLives(); $('lifeLabel').textContent = `Life ${life.n}`;
}
function spawnFoes() {
  foes = FOE_SPAWNS.map(s => { const h = s.high ? 60 : 52; return { x: s.x, gy: s.gy, l: s.l, r: s.r, high: !!s.high, mud: !!s.mud, y: s.gy - h, w: 24, h, vx: 0, face: -1, hp: s.high ? 50 : 36, hpMax: s.high ? 50 : 36, state: 'idle', t: rnd(0, 1), home: s.x, flash: 0, stag: 0, kneelT: 0, awayT: 0, alive: true, hitDone: false }; });
}
function resetCrumbles() { CRUMBLES.forEach(c => { c.state = 'solid'; c.t = 0; }); }
function camTarget() { return [clamp(P.x + P.w / 2 - W * 0.45 + P.face * 40, 0, LW - W), clamp(P.y + P.h / 2 - H * 0.56, 0, LH - H)]; }
function snapCam() { [camX, camY] = camTarget(); }

/* ---------- deeds & karma ---------- */
function deed(text, weight) { life.deeds.push({ text, weight }); soul.deeds.push({ text, weight, life: life.n }); soul.karma += weight; floater(pcx(), P.y - 30, 'The wheel notices.', weight > 0 ? INK2 : RED); renderLives(); }

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
  { id: 'staff', name: 'Staff', weight: 2, perk: 'Hits in front and behind. The heavy spin throws foes away. Mana returns 50% faster while you hold it.', light: { dmg: 10, st: 12, dur: 0.34, a0: 0.1, a1: 0.2, reach: 60, both: true }, heavy: { dmg: 22, st: 26, dur: 0.62, a0: 0.16, a1: 0.46, reach: 72, both: true, spin: true, knock: 460 } },
  { id: 'daggers', name: 'Twin daggers', weight: 1.5, perk: 'Very fast. Every third cut hits twice as hard. Hits from behind do 2.5 times the damage. Rolls cost less.', light: { dmg: 7, st: 8, dur: 0.2, a0: 0.04, a1: 0.11, reach: 42 }, heavy: { dmg: 7, st: 24, dur: 0.55, a0: 0.08, a1: 0.48, reach: 46, multi: 0.1 } },
];
const GARB = {
  hat: { slot: 'head', name: 'Straw hat', prot: 2, weight: 0.5, what: 'Light. Keeps the sun off.' },
  helm: { slot: 'head', name: 'Iron helm', prot: 10, weight: 3, what: 'Solid protection for the head.' },
  band: { slot: 'head', name: 'Focus band', prot: 1, weight: 0.3, what: '15 more stamina.' },
  wrap: { slot: 'body', name: 'Cloth wrap', prot: 4, weight: 1, what: 'What you were born into.' },
  leather: { slot: 'body', name: 'Leather jerkin', prot: 14, weight: 4, what: 'Good protection, still light.' },
  mail: { slot: 'body', name: 'Iron mail', prot: 28, weight: 9, what: 'Heavy protection. You sink in water.' },
  robe: { slot: 'body', name: 'Monk robe', prot: 5, weight: 1.5, what: 'Mana returns 50% faster.' },
  sandals: { slot: 'feet', name: 'Sandals', prot: 1, weight: 0.3, what: 'Barely there.' },
  boots: { slot: 'feet', name: 'Marsh boots', prot: 5, weight: 2, what: 'Mud barely slows you.' },
  cleats: { slot: 'feet', name: 'Ice cleats', prot: 3, weight: 1, what: 'You grip on ice.' },
};
const SLOT_NAMES = { head: 'Head', body: 'Body', feet: 'Feet' };
const LOADS = { light: { roll: 440, dur: 0.34, iF: 0.26, st: 0.9, walk: 1, say: 'Light: long, fast rolls' }, medium: { roll: 380, dur: 0.36, iF: 0.24, st: 1, walk: 1, say: 'Medium: normal rolls' }, heavy: { roll: 300, dur: 0.42, iF: 0.18, st: 1.3, walk: 0.92, say: 'Heavy: short, slow rolls that cost more' }, over: { roll: 0, dur: 0, iF: 0, st: 0, walk: 0.75, say: 'Too heavy: you cannot roll and you walk slowly' } };
function loadNow() { const w = P.slots.reduce((a, i) => a + WEAPONS[i].weight, 0) + ['head', 'body', 'feet'].reduce((a, k) => a + (P.garb[k] ? GARB[P.garb[k]].weight : 0), 0), r = w / P.loadMax; const pk = packWeight(), full = pk > P.packMax + 1e-9; const cls = full ? 'over' : r <= 0.35 ? 'light' : r <= 0.7 ? 'medium' : r <= 1 ? 'heavy' : 'over'; return Object.assign({ w, r, cls, pack: pk, full }, LOADS[cls], full ? { say: 'Your pack is too full: you cannot roll and you walk slowly. Leave something in a chest.' } : {}); }
const protNow = () => ['head', 'body', 'feet'].reduce((a, k) => a + (P.garb[k] ? GARB[P.garb[k]].prot : 0), 0);
const LEVEL_COST = lv => Math.round(50 * Math.pow(1.15, lv - 1));
const levelOf = () => 1 + Object.keys(P.stats).reduce((a, k) => a + P.stats[k] - P.stats0[k], 0);
function applyStats(fill) {
  const s = P.stats, oldHp = P.hpMax || 100, oldMana = P.manaMax || 0;
  P.hpMax = 100 + (s.vit - 10) * 8;
  P.stBase = (P.noMana ? 125 : 100) + (s.end - 10) * 6;
  P.loadMax = 20 + (s.end - 10) * 2 + (P.skills.has('strong_back') ? 6 : 0);
  P.packMax = 30 + (s.end - 10) * 3 + (P.skills.has('strong_back') ? 6 : 0);
  P.manaMax = P.manaTierMax ? P.manaTierMax + (s.foc - 10) * 6 : 0;
  if (fill) { P.hp = P.hpMax; P.mana = P.manaMax; P.st = P.stBase; P.stMax = P.stBase; }
  else { P.hp += Math.max(0, P.hpMax - oldHp); P.mana += Math.max(0, P.manaMax - oldMana); }
}
const SCALE = { blade: { str: 0.5, agi: 0.5 }, mace: { str: 1 }, bow: { agi: 1 }, spear: { str: 0.8, agi: 0.2 }, staff: { agi: 0.4, foc: 0.6 }, daggers: { agi: 1 }, knife: { agi: 1 } };
const TIER_MUL = [1, 1, 1.15, 1.35], TIER_NAME = ['', 'I', 'II', 'III'];
const tierOf = wi => P.wtier[wi] || 1;
function statMul(id) { const sc = SCALE[id] || {}; let m = 1; for (const k in sc) m += 0.04 * sc[k] * (P.stats[k] - 10); return m; }
function wMul(W8) { return statMul(W8.id) * TIER_MUL[tierOf(WEAPONS.indexOf(W8))]; }
function curW() { return WEAPONS[P.slots[P.slotIdx]]; }
function aimVec(sx, sy) { let dx = aimX() - sx, dy = aimY() - sy; if (!mouse.in) { dx = P.face; dy = 0; } const d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
function shootArrow(spec, mult) {
  const sx = pcx() + P.face * 14, sy = P.y + Math.min(18, P.h * 0.4), [ux, uy] = aimVec(sx, sy), v = spec.speed * (0.8 + 0.2 * mult);
  shots.push({ arrow: true, x: sx, y: sy, vx: ux * v, vy: uy * v, g: 520, life: 1.6, dmg: spec.dmg * mult * P.dmgMul * wMul(WEAPONS[2]), r: 6 });
  tone(900, 300, 0.08, 'triangle', 0.03);
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
    if (W8.id === 'daggers') { P.combo = P.comboT > 0 ? P.combo % 3 + 1 : 1; P.comboT = W8.light.dur + 0.4; if (P.combo === 3) P.atk.combo3 = true; }
  }
}
function busy() { return P.atk || P.rollT > 0 || P.healT > 0 || P.hitT > 0 || P.swapT > 0 || P.dead || P.plunge || P.landT > 0; }
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
  if (P.stDelay > 0) P.stDelay -= dt; else P.st = Math.min(P.stMax, P.st + 48 * (P.noMana ? 1 + 0.04 * (P.stats.foc - 10) : 1) * dt);
  if (P.manaMax) P.mana = Math.min(P.manaMax, P.mana + (P.school === 'Akasha' ? 6 : 4) * (inHand('staff') ? 1.5 : 1) * (wears('robe') ? 1.5 : 1) * dt);
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

  if (P.healT > 0) { P.healT -= dt; if (P.healT <= 0) { P.hp = Math.min(P.hpMax, P.hp + 40); floater(pcx(), P.y - 20, '+40'); } }
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
      if (P.noMana) floater(pcx(), P.y - 30, 'NO MANA IN THIS LIFE', PENCIL);
      else if (id) castWord(WORDS.find(w => w.id === id), 0.8);
      else floater(pcx(), P.y - 30, i < P.wordSlots.length ? 'EMPTY SLOT' : 'MORE MANA OPENS THIS SLOT', PENCIL);
    }
    if (pressed.h5) { if (P.torch.fuel > 0) { P.torch.lit = !P.torch.lit; tone(P.torch.lit ? 400 : 300, P.torch.lit ? 800 : 150, 0.15, 'triangle', 0.03); } else floater(pcx(), P.y - 24, 'NO FUEL · REST TO REFILL', PENCIL); }
    if (pressed.h6) throwKnife();
    if (pressed.h8) callHorse();
  }
  if (P.charging) {
    P.charge = Math.min(0.7, P.charge + dt);
    if (P.chargeSrc === 'mouse') faceAim();
    const letGo = P.chargeSrc === 'mouse' ? !held.mouseL : !held.heavy;
    if (letGo || P.hitT > 0) {
      P.charging = false;
      if (P.hitT <= 0 && spend(W8.heavy.st)) { P.unseenT = 0;
        const m = 1 + P.charge / 0.7 * 0.5;
        if (W8.bow) { shootArrow(W8.heavy, m); P.atk = { t: 0, dur: W8.heavy.dur, a0: 99, a1: 99, bow: true, heavy: true, hit: new Set() }; }
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
  let tgt = mx * 250 * LD.walk * (P.shaniT > 0 ? 0.7 : 1);
  if (P.charging) tgt = mx * 90;
  if (P.crouch) tgt = mx * 110;
  if (surf === 'mud') tgt *= wears('boots') ? 0.8 : 0.45;
  if (P.glide) tgt = mx * 270;
  if (P.inWater) tgt = mx * (has('naga') ? 260 : 170);
  if (P.mount) rideMove(dt, mx, surf);
  else if (P.rollT > 0) { P.rollT -= dt; P.vx = P.face * P.rollV * (surf === 'mud' && !wears('boots') ? 0.6 : 1); if (P.rollT <= 0) P.rollT = 0; }
  else if (P.hitT > 0 || P.kickT > 0) P.vx *= Math.max(0, 1 - 2 * dt);
  else if (P.plunge) P.vx = 0;
  else if (P.healT > 0 || P.landT > 0) P.vx = 0;
  else if (P.atk && P.atk.lunge && P.onG && P.atk.t >= P.atk.a0 - 0.08 && P.atk.t < P.atk.a1) P.vx = P.face * P.atk.lunge;
  else if (P.atk && P.onG) P.vx *= 0.8;
  else if (surf === 'ice') P.vx += (tgt - P.vx) * Math.min(1, dt * (wears('cleats') ? 12 : 2.2));
  else if (!P.onG && !P.inWater) P.vx += (tgt - P.vx) * Math.min(1, dt * 14);
  else P.vx = tgt;
  if (mx && (!P.atk || P.mount) && !P.charging && P.rollT <= 0 && P.hitT <= 0 && P.kickT <= 0 && !P.plunge) P.face = mx;
  // jumping
  if ((jp || P.jbuf > 0) && P.hitT <= 0 && !P.plunge && P.healT <= 0) {
    if (P.inWater) { if (jp && !P.headUnder) { P.vy = -680; P.jbuf = 0; P.jumping = true; SFX.splash(); } }
    else if (P.onG && held.down && P.groundS && P.groundS.k === 'oneway') { P.dropT = 0.25; P.onG = false; P.jbuf = 0; P.y += 1; }
    else if (P.onG || P.coy > 0) { P.vy = (P.mount ? -780 : -720) * (surf === 'mud' ? (wears('boots') || P.mount ? 0.88 : 0.7) : 1); P.onG = false; P.coy = 0; P.jbuf = 0; P.jumping = true; SFX.jump(); }
    else if (P.mount) { /* a horse cannot jump in the air */ }
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
  if (P.onG && !wasG) { if (P.plunge) plungeLand(); P.jumping = false; P.glide = false; }
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
  for (const f of FAKES) if (overlap(P, f) && !f.found) { f.found = true; floater(cx, P.y - 30, 'THE WALL WAS NEVER THERE', INK2); tone(700, 300, 0.4, 'sine', 0.04); }
  // zones
  let z = 0; for (let i = 0; i < ZONES.length; i++) if (P.x >= ZONES[i][0]) z = i;
  if (z !== P.zone) { P.zone = z; if (!P.zones.has(z)) { P.zones.add(z); zoneTag = { t: 3.2, name: ZONES[z][1], sub: ZONES[z][2] }; } }
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
const NODES = [
  { k: 'tree', x: 640, gy: 1000 }, { k: 'tree', x: 1270, gy: 1000 }, { k: 'tree', x: 2840, gy: 790 }, { k: 'tree', x: 8900, gy: 760 },
  { k: 'ore', x: 1600, gy: 1000 }, { k: 'ore', x: 3300, gy: 790 }, { k: 'ore', x: 3650, gy: 1100 }, { k: 'ore', x: 6200, gy: 1020 }, { k: 'ore', x: 7560, gy: 560 },
  { k: 'ember', x: 7670, gy: 660 }, { k: 'ember', x: 8620, gy: 760 }, { k: 'ember', x: 9520, gy: 760 },
  { k: 'petal', x: 5290, gy: 1050 }, { k: 'petal', x: 5620, gy: 1050 }, { k: 'petal', x: 4400, gy: 1300 }, { k: 'petal', x: 3820, gy: 1300 },
];
const NODE_HP = { tree: 3, ore: 3, ember: 2, petal: 1 }, NODE_GIVES = { tree: ['wood', 2], ore: ['iron', 2], ember: ['ember', 1], petal: ['petal', 1] };
function resetNodes() { NODES.forEach(n => { n.hp = NODE_HP[n.k]; n.shake = 0; }); }
function nodeBox(n) { return n.k === 'tree' ? { x: n.x - 14, y: n.gy - 90, w: 28, h: 90 } : n.k === 'petal' ? { x: n.x - 16, y: n.gy - 12, w: 32, h: 24 } : { x: n.x - 17, y: n.gy - 24, w: 34, h: 24 }; }
function gain(mat, n, x, y) { n = Math.max(0, Math.min(n, Math.floor((P.packMax - packWeight()) / MAT_W[mat] + 1e-9))); if (!n) { floater(x, y, 'YOUR PACK IS FULL', PENCIL); return; } P.mats[mat] += n; floater(x, y, `+${n} ${MATS[mat].toUpperCase()}`, INK2); tone(700, 1000, 0.08, 'triangle', 0.03); }
function hitNode(n, dmg) {
  n.hp -= dmg; n.shake = 0.2; burst(n.x, n.gy - (n.k === 'tree' ? 50 : 14), 6, n.k === 'ember' ? RED : INK2, 160); tone(n.k === 'tree' ? 260 : 900, n.k === 'tree' ? 180 : 500, 0.06, 'square', 0.03);
  if (n.hp <= 0) { const [m, q] = NODE_GIVES[n.k]; gain(m, q + (P.skills.has('forager') ? 1 : 0), n.x, n.gy - (n.k === 'tree' ? 100 : 40)); }
}
function drawNode(n) {
  const sx = n.shake > 0 ? Math.sin(clock * 80) * 2 : 0, x = n.x + sx, g = n.gy, gone = n.hp <= 0;
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineCap = 'round';
  if (n.k === 'tree') {
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, g); ctx.lineTo(x, g - (gone ? 16 : 60)); ctx.stroke();
    if (!gone) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, g - 40); ctx.lineTo(x - 16, g - 60); ctx.moveTo(x, g - 50); ctx.lineTo(x + 14, g - 66); ctx.stroke(); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(x - 12, g - 72, 20, 0, Math.PI * 2); ctx.arc(x + 12, g - 76, 18, 0, Math.PI * 2); ctx.arc(x, g - 90, 18, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.clip(); hatch(x - 34, g - 112, 68, 60, 5, INK2, 1); ctx.restore(); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x - 12, g - 72, 20, 0.8, 4.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 12, g - 76, 18, -1.6, 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x, g - 90, 18, 3.6, 6.0); ctx.stroke(); }
    else { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, g - 16); ctx.lineTo(x + 4, g - 16); ctx.stroke(); }
  } else if (n.k === 'ore' || n.k === 'ember') {
    if (gone) { ctx.fillStyle = PENCIL; for (const o of [-10, -2, 7]) { ctx.beginPath(); ctx.arc(x + o, g - 3, 3, 0, Math.PI * 2); ctx.fill(); } return; }
    ctx.fillStyle = PAPER; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 18, g); ctx.lineTo(x - 13, g - 16); ctx.lineTo(x - 2, g - 24); ctx.lineTo(x + 12, g - 18); ctx.lineTo(x + 18, g); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (n.k === 'ore') { ctx.fillStyle = INK; for (const [ox, oy] of [[-8, -9], [0, -16], [6, -7], [10, -13], [-3, -5]]) ctx.fillRect(x + ox, g + oy, 3, 3); }
    else { ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(x - 4, g - 4); ctx.lineTo(x, g - 20); ctx.lineTo(x + 5, g - 4); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 6, g - 4); ctx.lineTo(x + 10, g - 14); ctx.lineTo(x + 13, g - 4); ctx.closePath(); ctx.fill(); }
  } else if (n.k === 'petal' && !gone) {
    const y = g + Math.sin(clock * 2 + n.x) * 2; ctx.fillStyle = PAPER; ctx.lineWidth = 1.8;
    for (const a of [-0.9, -0.3, 0.3, 0.9]) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -8, 4, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.ellipse(x, y + 2, 14, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

/* ---------- forges, the shrine panel and the forge panel ---------- */
const STONES = [{ k: 'speak', x: 3570, gy: 1100 }, { k: 'moon', x: 6550, gy: 560 }];
const nearStone = () => STONES.find(st => Math.abs(pcx() - st.x) < 50 && Math.abs(P.y + P.h - st.gy) < 40);
const SHANI_ANSWERS = ['shani', 'sani', 'saturn', 'shanaishchara', 'shanaischara', 'shanidev', 'shani dev', 'sanidev'];
function answerStone(text) {
  const t = String(text).toLowerCase().replace(/[^a-z ]/g, ' ');
  if (SHANI_ANSWERS.some(a => t.split(/\s+/).includes(a) || t.replace(/ /g, '').includes(a.replace(/ /g, '')))) { closePanel(); learnSpell('shani', 'The stone hears its name and gives up its weight.'); return true; }
  return false;
}
function useStone(st) {
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
function drawStone(st) {
  const x = st.x, g = st.gy, night = isNight();
  ctx.fillStyle = st.k === 'moon' && night && !soul.spells.has('tide') ? '#f3f0e7' : PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 18, g); ctx.lineTo(x - 15, g - 48); ctx.quadraticCurveTo(x, g - 62, x + 15, g - 48); ctx.lineTo(x + 18, g); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (st.k === 'moon') { ctx.arc(x, g - 34, 9, 0.6, Math.PI * 2 - 0.6); ctx.stroke(); if (night && !soul.spells.has('tide')) { ctx.strokeStyle = PENCIL; ctx.beginPath(); ctx.arc(x, g - 34, 22 + Math.sin(clock * 3) * 3, 0, Math.PI * 2); ctx.stroke(); } }
  else { for (let i = 0; i < 4; i++) { ctx.moveTo(x - 9, g - 42 + i * 8); ctx.lineTo(x + 9 - (i % 2) * 6, g - 42 + i * 8); } ctx.stroke(); }
}
const FORGES = [{ x: 70, gy: 1000 }, { x: 9290, gy: 760 }];
const nearForge = () => FORGES.findIndex(f => Math.abs(pcx() - f.x) < 60 && Math.abs(P.y + P.h - f.gy) < 40);
const costText = c => Object.keys(c).map(k => k === 'seeds' ? `${c[k]} seeds` : `${c[k]} ${MATS[k].toLowerCase()}`).join(' · ');
const canPay = c => Object.keys(c).every(k => (k === 'seeds' ? P.seeds : P.mats[k]) >= c[k]);
function pay(c) { for (const k in c) { if (k === 'seeds') P.seeds -= c[k]; else P.mats[k] -= c[k]; } }
const TIER_COST = { 2: { iron: 3, wood: 2, ink: 2, seeds: 80 }, 3: { iron: 5, ink: 4, ember: 2, seeds: 200 } };
const MAKES = [
  { id: 'knives', name: 'Two more ink knives', what: 'Carry 7 knives instead of 5.', cost: { iron: 3, wood: 1 }, at: 'forge', once: true, done: () => { P.knivesMax += 2; P.knives += 2; } },
  { id: 'torch', name: 'Ember-core torch', what: 'The torch burns 40 seconds longer.', cost: { wood: 2, ember: 1 }, at: 'forge', once: true, done: () => { P.torchMax += 40; P.torch.fuel = P.torchMax; } },
  { id: 'lotus', name: 'Grow a lotus', what: 'Carry one more lotus (up to 6).', cost: { petal: 3, seeds: 40 }, at: 'shrine', once: false, ok: () => P.lotusMax < 6, done: () => { P.lotusMax++; P.lotus = P.lotusMax; } },
];
const matsLine = () => Object.keys(MATS).map(k => `<span>${MATS[k]}: ${P.mats[k]} <span class="note">(${MAT_WHERE[k]})</span></span>`).join('');
function makeHTML(at) {
  return MAKES.filter(m => m.at === at).map(m => { const done = m.once && P.made.has(m.id), able = !done && canPay(m.cost) && (!m.ok || m.ok());
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
        <div class="stats"><span>Health ${P.hpMax} · Stamina ${P.stBase} · Mana ${P.manaMax} · Load ${P.loadMax}</span><span>${esc(W8.name)} ${TIER_NAME[tierOf(P.slots[P.slotIdx])]}: ${Math.round((wMul(W8) - 1) * 100)}% extra damage from stats and tier</span></div></div>
      <div class="gcol"><span class="lbl">Skills</span><div class="stats"><span>${skills}</span></div>
        <span class="lbl">Shrine offering</span><div class="inv">${makeHTML('shrine')}</div>
        <span class="lbl">Join spells</span><div class="inv"><div class="item"><b>Ignite + Gust → Fire wind</b><span>${SPELL('firewind').what}</span><span class="m">${soul.spells.has('firewind') ? 'Already joined' : `Needs Ignite and Gust · ${costText({ ember: 1, seeds: 40 })}`}</span><div class="row"><button class="btn ghost sm" type="button" id="joinFW"${!soul.spells.has('firewind') && soul.spells.has('ignite') && soul.spells.has('gust') && canPay({ ember: 1, seeds: 40 }) ? '' : ' disabled'}>Join</button></div></div></div>
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
function drawForge(f) {
  const x = f.x, g = f.gy;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(x - 26, g - 36, 22, 36); hatch(x - 26, g - 36, 22, 36, 5); ctx.strokeRect(x - 26, g - 36, 22, 36);
  const fl = 8 + Math.sin(clock * 11 + x) * 2; ctx.fillStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 15, g - 38 - fl * 1.8); ctx.quadraticCurveTo(x - 6, g - 40, x - 15, g - 36); ctx.quadraticCurveTo(x - 24, g - 40, x - 15, g - 38 - fl * 1.8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x + 2, g - 26); ctx.lineTo(x + 34, g - 26); ctx.lineTo(x + 28, g - 18); ctx.lineTo(x + 8, g - 18); ctx.closePath(); ctx.fill(); ctx.fillRect(x + 13, g - 18, 10, 18); ctx.fillRect(x + 6, g - 4, 24, 4);
  ctx.font = `12px ${FD}`; ctx.fillStyle = PENCIL; ctx.textAlign = 'center'; ctx.fillText('FORGE', x + 4, g - 70);
}
function breakPot(p) { p.broken = true; P.seeds += p.seeds; floater(p.x, p.gy - 40, `+${p.seeds} seeds`); burst(p.x, p.gy - 14, 14, INK2, 200); SFX.crack(); }
function doHits(A) {
  if (A.multi && A.t - (A.lastReset || 0) >= A.multi) { A.hit.clear(); A.lastReset = A.t; }
  const reach = A.reach + (P.mount ? 18 : 0), by = P.mount ? P.y + 22 : P.y + 6, bh = P.mount ? 44 : Math.min(34, P.h);
  const box = A.both ? { x: P.x - reach + 4, y: by, w: P.w + reach * 2 - 8, h: bh } : { x: P.face > 0 ? P.x + P.w - 4 : P.x + 4 - reach, y: by, w: reach, h: bh };
  for (const t of foes) {
    if (!t.alive || A.hit.has(t) || !overlap(box, t)) continue;
    A.hit.add(t);
    let dmg = A.dmg * P.dmgMul;
    if (P.riposte > 0 || t.stag > 0) { dmg *= P.skills.has('killing_edge') ? 3 : 2; floater(t.x + t.w / 2, t.y - 20, 'RIPOSTE'); P.riposte = 0; }
    if (A.combo3) { dmg *= 2; floater(t.x + t.w / 2, t.y - 34, 'THIRD CUT', INK2); }
    if (A.daggers && t.face === P.face && t.state !== 'kneel') { dmg *= 2.5; floater(t.x + t.w / 2, t.y - 20, 'FROM BEHIND'); }
    if (A.thrust && P.mount && Math.abs(P.vx) > 250) { dmg *= 1 + Math.abs(P.vx) / 430; floater(t.x + t.w / 2, t.y - 20, 'CHARGE'); }
    hurtFoe(t, dmg, A.heavy, { stun: A.stun, knock: A.knock });
    hitstop = A.heavy ? 0.09 : 0.05; shake = A.heavy ? 8 : 4;
  }
  for (const p of pots) if (!p.broken && overlap(box, { x: p.x - 12, y: p.gy - 28, w: 24, h: 28 })) breakPot(p);
  for (const n of NODES) if (n.hp > 0 && !A.hit.has(n) && overlap(box, nodeBox(n))) { A.hit.add(n); hitNode(n, A.heavy ? 2 : 1); }
}
function hurtFoe(t, dmg, heavy, o = {}) {
  if (t.state === 'kneel') { t.alive = false; burst(t.x + 12, t.y + 20, 22); SFX.hit(); deed('You struck down one who begged for mercy.', -2); soul.memories.slain++; P.seeds += 10; return; }
  t.hp -= dmg; t.flash = 0.12; burst(t.x + 12, t.y + 20, 6); heavy ? SFX.heavy() : SFX.hit();
  t.vx = (t.x + t.w / 2 > pcx() ? 1 : -1) * (o.knock || (heavy ? 260 : 120)); t.state = 'stun'; t.t = o.stun || (heavy ? 0.6 : 0.3);
  if (t.hp <= 0) {
    if (t.hp > -10 && Math.random() < 0.55) { t.hp = 1; t.state = 'kneel'; t.kneelT = 0; t.awayT = 0; t.vx = 0; floater(t.x + 12, t.y - 20, 'IT BEGS', INK2); }
    else { t.alive = false; burst(t.x + 12, t.y + 20, 22); P.seeds += 25; floater(t.x + 12, t.y - 10, '+25 seeds'); gain('ink', 1, t.x + 12, t.y - 28); soul.kills++; if (!soul.spells.has('grasp') && (Math.random() < 0.15 || soul.kills >= 6)) learnSpell('grasp', 'The Grasping you struck down let go of something it was holding.'); }
  }
}
function hurtPlayer(d, src, melee) {
  if (P.dead || P.rollIF > 0 || P.inv > 0 || P.climbT > 0) { if (P.rollIF > 0) floater(pcx(), P.y - 20, 'DODGED', PENCIL); return 'dodge'; }
  if (melee && P.parryT > 0) { P.parryT = 0; SFX.parry(); floater(pcx(), P.y - 24, 'PARRY'); if (P.skills.has('second_wind')) { P.hp = Math.min(P.hpMax, P.hp + 12); floater(pcx(), P.y - 40, '+12'); } src.stag = 1.1; src.state = 'stag'; src.t = src.stag; P.riposte = 1.4; hitstop = 0.12; shake = 6; for (let i = 0; i < 10; i++) fx.push({ k: 'spark', x: pcx() + P.face * 20, y: P.y + 20, vx: rnd(-300, 300), vy: rnd(-300, 50), life: 0.25 }); return 'parry'; }
  if (P.shieldT > 0) { P.shieldT = 0; floater(pcx(), P.y - 24, 'BLOCKED'); tone(1500, 900, 0.06, 'square', 0.03); burst(pcx() + P.face * 26, P.y + 30, 10, PENCIL); return 'block'; }
  d *= 1 - protNow() / 100;
  if (P.mount) { horse.hp -= d * 0.6; d *= 0.4; }
  P.hp = Math.max(0, P.hp - d); P.hitT = 0.32; P.inv = 0.45; P.atk = null; P.charging = false; P.healT = 0;
  P.hang = null; P.ladder = null; P.plunge = false; P.glide = false; P.cling = 0;
  const away = pcx() < src.x + src.w / 2 ? -1 : 1;
  if (P.mount) { P.vx = away * 120; P.vy = -120; if (horse.hp <= 0) { dismount(true); floater(pcx(), P.y - 30, 'YOUR HORSE IS HURT AND RUNS OFF', RED); } }
  else { P.vx = away * 260; P.vy = -260; }
  shake = 9; hitstop = 0.08; SFX.hurt();
  burst(pcx(), P.y + 20, 12, RED);
  if (P.hp <= 0) fall('The Grasping struck you down.');
  return 'hit';
}
let nightOverride = null;
function isNight() { if (nightOverride !== null) return nightOverride; const h = new Date().getHours(); return h >= 19 || h < 6; }
function moonLight() { try { const ph = window.Astronomy.MoonPhase(new Date()) * Math.PI / 180; return { illum: (1 - Math.cos(ph)) / 2, waxing: ph < Math.PI }; } catch (_) { return { illum: 0.5, waxing: true }; } }
const spellCost = w => Math.round(w.cost * (w.school && P.school ? (w.school === P.school ? 0.8 : 1.25) : 1));
const rankOf = id => { const n = soul.ranks[id] || 0; return n >= 30 ? 3 : n >= 10 ? 2 : 1; };
function needsMissing(w) {
  const n = w.needs || {};
  if (n.focus && P.stats.foc < n.focus) return `NEEDS FOCUS ${n.focus}`;
  if (n.night && !isNight()) return 'ONLY AT NIGHT';
  if (n.life && life.n < n.life) return 'NEEDS A PAST LIFE';
  return null;
}
function learnSpell(id, how) {
  if (soul.spells.has(id)) return false;
  soul.spells.add(id); const w = SPELL(id), free = P.wordSlots.indexOf(null);
  if (free >= 0) P.wordSlots[free] = id;
  SFX.relic(); for (let i = 0; i < 24; i++) fx.push({ k: 'ink', x: pcx() + rnd(-30, 30), y: P.y + rnd(-20, P.h), vx: rnd(-30, 30), vy: -rnd(30, 90), life: rnd(0.5, 1.1) });
  banner = { t: 4.2, top: `A NEW SPELL: ${w.say.toUpperCase()}`, sub: `${how ? how + ' ' : ''}${w.what} Say "${w.say}" aloud, or put it on keys 1 to 4 in Tab.${free >= 0 ? ` It is on key ${free + 1}.` : ''}` };
  return true;
}
function groundBelow(x, y0) { for (let y = Math.max(0, y0); y < y0 + 520 && y < LH; y += 4) if (pointSolid(x, y)) return y; return null; }
function graspTarget() { let best = null, bd = 1e9; for (const f of foes) { if (!f.alive || f.state === 'kneel') continue; const dx = (f.x + 12 - pcx()) * P.face; if (dx < 0 || dx > 340 || Math.abs(f.gy - (P.y + P.h)) > 110) continue; if (dx < bd) { bd = dx; best = f; } } return best; }
function castWord(w, power) {
  if (P.dead || mode !== 'play') return;
  if (P.noMana) { floater(pcx(), P.y - 30, 'NO MANA IN THIS LIFE', PENCIL); return; }
  if (!soul.spells.has(w.id)) { floater(pcx(), P.y - 30, `YOU DO NOT KNOW ${w.say.toUpperCase()} YET`, PENCIL); return; }
  if (!P.wordSlots.includes(w.id)) { floater(pcx(), P.y - 30, `${w.say.toUpperCase()} IS NOT ON YOUR KEYS (TAB)`, PENCIL); return; }
  const why = needsMissing(w); if (why) { floater(pcx(), P.y - 30, why, PENCIL); return; }
  const cost = spellCost(w);
  if (P.mana < cost) { floater(pcx(), P.y - 30, 'NOT ENOUGH MANA', PENCIL); return; }
  faceAim();
  if (P.hitT > 0 || P.rollT > 0) return;
  let ax = mouse.in ? aimX() : pcx() + P.face * 160, ay = mouse.in ? aimY() : P.y;
  let pillarY = null, gt = null;
  if (w.id === 'pillar') { pillarY = groundBelow(ax, ay); if (pillarY === null || TEMPS.filter(t => t.pillar).length >= 2 && false) { floater(pcx(), P.y - 30, 'NO GROUND THERE', PENCIL); return; } }
  if (w.id === 'grasp') { gt = graspTarget(); if (!gt) { floater(pcx(), P.y - 30, 'NOTHING TO GRASP', PENCIL); return; } }
  P.mana -= cost; SFX.word(); shake = 5;
  const rk = rankOf(w.id); power *= (1 + 0.04 * (P.stats.foc - 10)) * [1, 1, 1.2, 1.4][rk];
  soul.ranks[w.id] = (soul.ranks[w.id] || 0) + 1; if (rankOf(w.id) > rk) floater(pcx(), P.y - 52, `${w.say.toUpperCase()} GROWS STRONGER`, INK2);
  if (w.id !== 'unseen') P.unseenT = 0;
  floater(pcx(), P.y - 34, `${w.say.toUpperCase()} · ${Math.round(power * 100)}%`);
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
    if (!life.grasped) { life.grasped = true; deed('You used greed’s own spell.', -1); }
  }
  if (w.id === 'shani') { P.shaniT = 6 * power; tone(60, 40, 1.5, 'sine', 0.12); shake = 10; }
  if (w.id === 'tide') { const m = moonLight(), mul = 0.5 + 2 * m.illum; P.tideT = 6; P.tideRate = 32 * mul * power / 6; floater(cx, P.y - 52, `THE MOON IS ${Math.round(m.illum * 100)}% FULL`, INK2); }
  if (w.id === 'starfall') { let n = 0; for (const f of foes) if (f.alive && f.state !== 'kneel' && visible(f, 0)) { hurtFoe(f, 30 * power * dmgMul, true); n++; for (let i = 0; i < 6; i++) fx.push({ k: 'star', x: f.x + 12 + rnd(-6, 6), y: f.y - 200 + i * 30, vx: 0, vy: 900, life: 0.25 }); } if (!n) floater(cx, P.y - 52, 'NO FOE IN SIGHT', PENCIL); shake = 12; }
  if (w.id === 'firewind') {
    for (const f of foes) if (f.alive && f.state !== 'kneel') { const dx = (f.x + 12 - cx) * P.face; if (dx > -10 && dx < 210 && Math.abs(f.gy - (P.y + P.h)) < 110) hurtFoe(f, 20 * power * dmgMul, true, { knock: 440, stun: 0.8 }); }
    for (let i = 0; i < 26; i++) fx.push({ k: 'flame', x: cx + P.face * rnd(10, 40), y: P.y + rnd(5, P.h - 5), vx: P.face * rnd(260, 520), vy: rnd(-80, 40), life: rnd(0.3, 0.5) });
  }
}
let TEMPS = [], RAINS = [], ALLY = null;
const rainAt = x => RAINS.some(r => x > r.x && x < r.x + r.w);
function updateMagic(dt) {
  for (const t of TEMPS) { t.t -= dt; t.rise = Math.min(1, t.rise + dt * 6); }
  TEMPS = TEMPS.filter(t => { if (t.t <= 0) { burst(t.x + 28, t.y + 20, 14, INK2, 160); return false; } return true; });
  for (const r of RAINS) r.t -= dt; RAINS = RAINS.filter(r => r.t > 0);
  if (P.unseenT > 0) P.unseenT -= dt;
  if (P.shaniT > 0) P.shaniT -= dt;
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
function drawMagic() {
  for (const t of TEMPS) { if (!visible(t)) continue; const h = t.h * t.rise, y = t.y + t.h - h, fade = t.t < 1.5 && Math.floor(t.t * 8) % 2 === 0;
    ctx.globalAlpha = fade ? 0.5 : 1; ctx.fillStyle = PAPER; ctx.fillRect(t.x, y, t.w, h); hatch(t.x, y, t.w, h, 7, INK2, 1); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(t.x + 1.5, y + 1.5, t.w - 3, h - 3);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x + 14, y + 20); ctx.lineTo(t.x + 24, y + 44); ctx.lineTo(t.x + 18, y + 70); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const r of RAINS) { if (!visible({ x: r.x, y: camY, w: r.w, h: H })) continue; ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.4; ctx.globalAlpha = Math.min(1, r.t); ctx.beginPath();
    for (let i = 0; i < 60; i++) { const x = r.x + ((i * 53 + clock * 40) % r.w), y = camY + ((i * 97 + clock * 900) % (H + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); } ctx.stroke();
    ctx.fillStyle = 'rgba(140,137,127,0.12)'; ctx.fillRect(r.x, camY, r.w, H); ctx.globalAlpha = 1; }
  if (ALLY) { const a = ALLY; ctx.save(); ctx.globalAlpha = 0.55 + 0.15 * Math.sin(clock * 6); const pose = a.swing > 0 ? POSE.strike() : POSE.idle(clock); const r = stick(a.x, a.y + 26, pose, a.face, PENCIL, a.looks.build, { hair: a.looks.hair });
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + a.face * 30, r.hF.y - (a.swing > 0 ? 0 : 24)); ctx.stroke(); ctx.restore(); }
  if (P.shaniT > 0) { ctx.strokeStyle = INK2; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const rr = 60 + ((clock * 60 + i * 80) % 240); ctx.globalAlpha = 0.5 * (1 - (rr - 60) / 240); ctx.beginPath(); ctx.arc(pcx(), P.y + P.h / 2, rr, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
}
function nearShrine() { const cx = P.x + P.w / 2, fy = P.y + P.h; return SHRINES.findIndex(s => Math.abs(cx - s.x) < 70 && Math.abs(fy - s.gy) < 40); }
function use() {
  const sh = nearShrine();
  if (sh >= 0) { if (P.mount) dismount(false); rest(sh); openShrine(sh); return; }
  if (nearForge() >= 0 && !P.mount) { openForge(); return; }
  { const st = nearStone(); if (st && !P.mount) { useStone(st); return; } }
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
      if (P.lotus > 0) { P.lotus--; villager.helped = true; soul.memories.gift++; deed('You gave your lotus to the wounded villager.', 2); villager.line = 'Thank you, stranger. I will not forget this.'; villager.talkT = 4; }
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
  lines.push('There is a feather on the plank by the hut. My grandmother said it fell from Garuda himself.');
  if ((villager.helped || soul.memories.gift) && !soul.spells.has('unseen')) { villager.line = 'You gave when you had little. Let me give you something back: my mother taught me how to go unseen.'; villager.talkT = 5; learnSpell('unseen', 'The villager teaches you.'); return; }
  lines.push('That horse has grazed by my hut for years. It only trusts someone who gives it something.');
  lines.push('The road east is a proving ground. Planks, ledges, a pool, a chimney, and the dark at the end.');
  if (!villager.helped && life.n === 1) lines.unshift('Please… a lotus… I am hurt. (Press E to give one)');
  villager.idx = ((villager.idx ?? -1) + 1) % lines.length; villager.line = lines[villager.idx]; villager.talkT = 5;
}
function rest(i) {
  P.hp = P.hpMax; P.lotus = P.lotusMax; P.st = P.stMax; P.mana = P.manaMax; P.breath = BREATH; P.torch.fuel = P.torchMax; P.knives = P.knivesMax; P.shrine = i; P.visited.add(i); SFX.rest();
  drops = []; spawnFoes(); shots = []; resetCrumbles(); resetNodes();
  if (horse.state !== 'wild') { horse.hp = horse.hpMax; if (horse.state === 'fled') horse.state = 'away'; }
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
    let dt = dt0; if (P.shaniT > 0 && Math.abs(f.x - P.x) < 460) dt *= 0.3; if (rainAt(f.x + 12)) dt *= 0.55;
    f.flash = Math.max(0, f.flash - dt);
    const dx = pcx() - (f.x + 12), adx = Math.abs(dx);
    switch (f.state) {
      case 'kneel':
        f.kneelT += dt;
        if (adx > 160) f.awayT += dt;
        if (f.awayT > 2.2 || (f.kneelT > 3 && !P.atk)) { f.alive = false; life.spared = (life.spared || 0) + 1; if (life.spared <= 3) deed('You spared one who begged for mercy.', 1); soul.memories.spared++; for (let i = 0; i < 16; i++) fx.push({ k: 'ink', x: f.x + 12, y: f.y + rnd(0, f.h), vx: rnd(-20, 20), vy: -rnd(20, 70), life: 1 }); floater(f.x + 12, f.y - 16, 'It walks into the ink.', INK2); }
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
        if (!P.dead && !(P.unseenT > 0) && adx < 420 && Math.abs(P.y + P.h - f.gy) < 110) {
          f.state = 'chase'; f.face = Math.sign(dx) || f.face;
          if (adx < (f.high ? 64 : 52)) { f.state = 'wind'; f.t = f.high ? 0.6 : 0.5; SFX.warn(); } else f.vx = f.face * 95;
        } else { f.vx = 0; f.state = 'idle'; }
    }
    f.x = clamp(f.x + f.vx * dt * (f.mud ? 0.5 : 1), f.l, f.r - f.w);
    for (const t of TEMPS) if (overlap(f, t)) { f.x = f.x + 12 < t.x + t.w / 2 ? t.x - f.w : t.x + t.w; f.vx = 0; }
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
    if (s.fire && waterAt(s.x, s.y)) { s.life = 0; for (let i = 0; i < 8; i++) fx.push({ k: 'bub', x: s.x + rnd(-8, 8), y: s.y, vx: 0, vy: -rnd(40, 90), life: 0.6 }); continue; }
    let done = false;
    for (const t of foes) if (t.alive && t.state !== 'kneel' && circle(s, t)) { hurtFoe(t, s.dmg, false); s.life = 0; burst(s.x, s.y, 12); if (s.knife) drops.push({ x: t.x + 12, y: t.gy - 4, a: s.vx > 0 ? 0.3 : Math.PI - 0.3 }); done = true; break; }
    if (done) continue;
    for (const p of pots) if (!p.broken && circle(s, { x: p.x - 12, y: p.gy - 28, w: 24, h: 28 })) { breakPot(p); s.life = 0; if (s.knife) drops.push({ x: p.x, y: p.gy - 4, a: 0 }); break; }
  }
  shots = shots.filter(s => s.life > 0);
}

/* ---------- the horse ---------- */
const HORSE_HOME = { x: 720, gy: 1000 };
let horse = null;
function newHorse() { horse = { x: HORSE_HOME.x, gy: HORSE_HOME.gy, face: -1, state: 'wild', hp: 120, hpMax: 120, arriveT: 0, fleeT: 0, fleeX: 0, graze: 0 }; }
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
const CHESTS = [
  { x: 380, gy: 1000, kind: 'garb', id: 'hat' }, { x: 925, gy: 900, kind: 'garb', id: 'leather' }, { x: 990, gy: 1000, kind: 'weapon', id: 1 },
  { x: 2400, gy: 810, kind: 'weapon', id: 3 }, { x: 3120, gy: 790, kind: 'weapon', id: 4 }, { x: 4220, gy: 1100, kind: 'weapon', id: 5 },
  { x: 4385, gy: 955, kind: 'garb', id: 'boots' }, { x: 4825, gy: 955, kind: 'garb', id: 'cleats' }, { x: 5790, gy: 1020, kind: 'garb', id: 'helm' },
  { x: 2200, gy: 720, kind: 'spell', id: 'gust' }, { x: 2050, gy: 1000, kind: 'spell', id: 'pillar' }, { x: 7178, gy: 560, kind: 'spell', id: 'monsoon' }, { x: 8700, gy: 760, kind: 'spell', id: 'embers' }, { x: 9670, gy: 760, kind: 'spell', id: 'starfall' },
  { x: 6330, gy: 560, kind: 'garb', id: 'band' }, { x: 7440, gy: 560, kind: 'garb', id: 'robe' }, { x: 9100, gy: 760, kind: 'garb', id: 'mail' },
];
const chestOpen = c => !!c.opened;
/* ---------- carrying: the pack, world chests and your own chest ---------- */
const emptyInv = () => ({ weapons: new Set(), garb: new Set(), relics: new Set(), mats: { wood: 0, iron: 0, ink: 0, petal: 0, ember: 0 }, wtier: {} });
const HOME = { x: 280, gy: 1000 };
const MAT_W = { wood: 1, iron: 1.5, ink: 0.2, petal: 0.2, ember: 0.5 }, RELIC_W = 0.3;
const invEmpty = v => !v.weapons.size && !v.garb.size && !v.relics.size && !Object.values(v.mats).some(Boolean);
const relicStored = id => soul.home.relics.has(id) || CHESTS.some(c => c.inv && c.inv.relics.has(id));
function resetChests() {
  for (const c of CHESTS) {
    if (c.kind === 'spell') { c.inv = emptyInv(); c.opened = soul.spells.has(c.id); continue; }
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
    if (take) { if (P.weapons.has(wi) || !room(WEAPONS[wi].weight)) return; P.weapons.add(wi); P.wtier[wi] = inv.wtier[wi] || 1; delete inv.wtier[wi]; inv.weapons.delete(wi); }
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
function drawHome() {
  const x = HOME.x, g = HOME.gy;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(x - 22, g - 26, 44, 26); hatch(x - 22, g - 26, 44, 26, 5); ctx.strokeRect(x - 22, g - 26, 44, 26);
  ctx.beginPath(); ctx.moveTo(x - 24, g - 26); ctx.quadraticCurveTo(x, g - 42, x + 24, g - 26); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, g - 14); for (let i = 1; i <= 4; i++) ctx.lineTo(x - 10 + i * 5, g - 14 + (i % 2 ? 3 : -2)); ctx.stroke();
  ctx.font = `11px ${FD}`; ctx.fillStyle = PENCIL; ctx.textAlign = 'center'; ctx.fillText('YOUR CHEST', x, g - 50);
}
function openChest(c) {
  if (c.kind === 'spell') { if (!c.opened) { c.opened = true; learnSpell(c.id, 'A palm-leaf scroll lies in the chest.'); } else floater(c.x, c.gy - 50, 'AN EMPTY CHEST', PENCIL); return; }
  c.opened = true; openContainer(c.inv, c.kind === 'weapon' ? 'A chest' : 'A chest'); }

/* ---------- falling & true death ---------- */
function fall(why, useSafe) {
  if (P.dead) return;
  if (P.mount) dismount(true);
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
  wakeAtShrine();
  banner = { t: 2.6, top: 'YOU FELL', sub: `${P.why} You wake at the ${SHRINES[P.shrine].name.toLowerCase()}. Prana left: ${P.prana}.` };
}
function wakeAtShrine() {
  const s = SHRINES[P.shrine];
  Object.assign(P, { x: s.x + 40, y: s.gy - PH, h: PH, w: 22, mount: false, vx: 0, vy: 0, hp: P.hpMax, st: P.stMax, mana: P.manaMax, lotus: P.lotusMax, breath: BREATH, dead: false, deadT: 0, atk: null, charging: false, rollT: 0, healT: 0, hitT: 0, inv: 1, shieldT: 0,
    hang: null, climbT: 0, ladder: null, glide: false, plunge: false, cling: 0, inWater: false, headUnder: false, knives: P.knivesMax, torch: { fuel: P.torchMax, lit: false } });
  drops = []; spawnFoes(); shots = []; resetCrumbles(); snapCam(); TEMPS = []; RAINS = []; ALLY = null; P.unseenT = 0; P.shaniT = 0; P.tideT = 0;
}
function trueDeath(spot) {
  mode = 'death'; stopRec(); banner = null; zoneTag = null;
  life.end = P.why; life.endedAt = Date.now();
  soul.bodies.push({ x: spot.x, y: spot.y, life: life.n, looks: P.looks, taken: false });
  const k = soul.karma, choices = k >= 3 ? 3 : 1, debt = k < 0;
  const births = Array.from({ length: choices }, makeBirth);
  const lost = [...P.relics].filter(id => !RELICS[id].soul), kept = [...P.relics].filter(id => RELICS[id].soul);
  const homeLine = invEmpty(soul.home) ? '' : ' What you left in your own chest by the village shrine waits for your next life.';
  const gearFound = 1, horseLine = horse.state !== 'wild' ? ' The horse you befriended goes back to the wild.' : '';
  const deeds = life.deeds.length ? life.deeds.map(d => `<li class="${d.weight < 0 ? 'bad' : ''}">${esc(d.text)}</li>`).join('') : '<li>You passed through this life leaving little trace.</li>';
  const offer = choices > 1 ? 'Your merit is heavy. The wheel lets you choose your next life.' : debt ? 'Your deeds weigh on you. There is no choice this time, and a debt follows you.' : 'The wheel chooses your next life.';
  const relLine = (lost.length ? `Your relics (${lost.map(id => RELICS[id].name).join(', ')}) fall back to where you found them. ` : '') + (kept.length ? `The ${kept.map(id => RELICS[id].name).join(', ')} stays with your soul.` : '');
  $('deathIn').innerHTML = `
    <span class="eyebrow" style="color:#b9b6ac">Prana spent · Life ${life.n} ends</span>
    <h2>${esc(P.why)}</h2>
    <p class="hand">The wheel weighs this life.</p>
    <ul class="deeds">${deeds}</ul>
    ${relLine ? `<p class="hand">${esc(relLine)}</p>` : ''}
    ${true ? `<p class="hand">Your level, skills and materials stay with this body. Weapons and garments you carried go back to the chests they came from.${esc(homeLine)}${esc(horseLine)}</p>` : ''}
    <p>${offer}</p>
    ${debt ? '<p class="hand">Karmic debt: you are born near the one you wronged. (A quest to make it right comes in a later build.)</p>' : ''}
    <div class="cards">${births.map((b, i) => `<button class="card" type="button" data-i="${i}">
      <b>${choices > 1 ? 'LIFE ' + String.fromCharCode(65 + i) : 'YOUR NEXT LIFE'}</b>
      <span class="r">Born ${esc(b.local)}, ${esc(b.place)}<br>Age now ${b.age} · ${esc(b.lagna)} lagna<br>Moon: ${esc(b.moon)}<br>Mana: ${b.tierName}${b.school ? ' · ' + b.school : ''} · ${b.style}</span>
      <span class="perk">${esc(b.region)}. ${esc(b.people)}.</span>
      <span class="perk">${perks(b).map(esc).join('<br>')}</span>
    </button>`).join('')}</div>
    <p class="hand" style="color:#b9b6ac">${choices > 1 ? 'Pick one.' : 'Press the card to be born.'} Your soul mark, karma and what you learned come with you.</p>`;
  $('ovDeath').hidden = false;
  [...$('deathIn').querySelectorAll('.card')].forEach(el => el.addEventListener('click', () => { $('ovDeath').hidden = true; newLife(births[+el.dataset.i]); mode = 'play'; if (micMode === 'always') startRec(); }));
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
toolBtn('tSpells', () => { for (const w of WORDS) soul.spells.add(w.id); P.stats.foc = Math.max(P.stats.foc, 14); applyStats(false); banner = { t: 2.6, top: 'EVERY SPELL', sub: 'Test tool: you know all fourteen spells and your Focus is at least 14. Put them on keys 1 to 4 in Tab, on the Spells page.' }; });
toolBtn('tNight', () => { nightOverride = nightOverride === null ? !isNight() : nightOverride ? false : null; banner = { t: 2, top: nightOverride === null ? 'REAL CLOCK' : nightOverride ? 'NIGHT' : 'DAY', sub: nightOverride === null ? 'Day and night follow your own clock again.' : 'Test tool: day and night are forced until you press it again.' }; });
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
toolBtn('tShrine', () => {
  if (P.mount) dismount(false);
  const i = (P.shrine + 1) % SHRINES.length, s = SHRINES[i];
  P.x = s.x + 40; P.y = s.gy - PH; P.h = PH; P.vx = P.vy = 0; P.hang = null; P.ladder = null; rest(i); snapCam();
});

/* ---------- soul record panel ---------- */
function renderLives() {
  $('lives').innerHTML = soul.lives.slice().reverse().map(l => `<div class="life"><b>LIFE ${l.n}${l.end ? '' : ' · NOW'}</b>
    <span class="m">Born ${esc(l.birth.local)}, ${esc(l.birth.place)} · ${esc(l.birth.lagna)} lagna · Moon ${esc(l.birth.moon)}</span>
    <span class="m">Mana ${l.birth.tierName}${l.birth.school ? ' (' + l.birth.school + ')' : ''} · ${l.birth.style} · ${esc(l.birth.region)}</span>
    <span>${l.deeds.length ? l.deeds.map(d => esc(d.text)).join(' ') : 'No deeds yet.'}</span>
    ${l.end ? `<span class="m">Ended: ${esc(l.end)}</span>` : ''}</div>`).join('');
}

/* ---------- gear (Tab) & map (M) ---------- */
function openGear() { mode = 'gear'; clearHeld(); renderGear(); $('ovGear').hidden = false; }
function closePanel() { $('ovGear').hidden = true; mode = 'play'; clearHeld(); }
let gearView = 'gear';
function renderSpellBook() {
  const known = WORDS.filter(w => soul.spells.has(w.id)), unknown = WORDS.filter(w => !soul.spells.has(w.id));
  const keys = P.noMana ? '<p class="note">This body was born with no mana, so it cannot cast. What you have learned stays with your soul for the next life.</p>' : P.wordSlots.map((id, i) => `<label class="wslot"><span class="lbl">Key ${i + 1}</span><select data-ws="${i}"><option value="">— empty —</option>${known.map(w => `<option value="${w.id}"${w.id === id ? ' selected' : ''}>${w.say} · ${spellCost(w)} mana</option>`).join('')}</select></label>`).join('') + (P.wordSlots.length < 4 ? `<p class="note">${4 - P.wordSlots.length} key${P.wordSlots.length === 3 ? '' : 's'} locked: this body's ${life.birth.tierName} mana opens ${P.wordSlots.length}.</p>` : '');
  const card = w => { const miss = needsMissing(w), rk = rankOf(w.id), n = soul.ranks[w.id] || 0, next = rk === 1 ? 10 : rk === 2 ? 30 : null;
    const sch = w.school ? `${w.school}${P.school ? (w.school === P.school ? ' · your school, cheaper' : ' · another school, dearer') : ''}` : 'No school';
    const req = w.needs ? Object.entries(w.needs).map(([k, v]) => k === 'focus' ? `Focus ${v}` : k === 'night' ? 'night only' : 'a past life').join(', ') : '';
    return `<div class="item"><b>${w.say} · rank ${rk}</b><span>${w.what}</span><span class="m">${sch} · ${spellCost(w)} mana${req ? ` · needs ${req}` : ''}${miss ? ` · ${miss.toLowerCase()}` : ''}</span><span class="m">Cast ${n} time${n === 1 ? '' : 's'}${next ? ` · rank ${rk + 1} at ${next}` : ' · full strength'}</span></div>`; };
  const m = moonLight();
  return `
    <div class="gear">
      <div class="gcol"><span class="lbl">On your keys · say a spell aloud for 100%, press its key for 80%</span>${keys}
        <div class="stats"><span>It is ${isNight() ? 'night' : 'day'} where you are${nightOverride !== null ? ' (test tool)' : ''}. The real Moon is ${Math.round(m.illum * 100)}% full and ${m.waxing ? 'growing' : 'shrinking'}.</span><span>Spells of your birth school cost less; spells of other schools cost more. Spells grow stronger the more you cast them.</span></div>
        <span class="lbl">Spells you know · ${known.length} of ${WORDS.length} · they stay with your soul</span><div class="inv">${known.map(card).join('')}</div></div>
      <div class="gcol"><span class="lbl">Spells still out there</span><div class="inv">${unknown.length ? unknown.map(w => `<div class="item"><b>?</b><span class="hand">${esc(w.how)}</span></div>`).join('') : '<p class="note">You know every spell in the proving grounds.</p>'}</div></div>
    </div>`;
}
function renderGear() {
  const b = life.birth, full = !P.equip.includes(null), LD = loadNow();
  const slot = i => { const w = WEAPONS[P.slots[i]]; return `<div class="slot${P.slotIdx === i ? ' cur' : ''}"><span class="lbl">Hand ${i + 1}${P.slotIdx === i ? ' · in use' : ''}</span><b>${w.name}</b><span>${w.perk}</span><span class="m">Weight ${w.weight}</span></div>`; };
  const owned = [...P.weapons].sort((x, y) => x - y);
  const inv = owned.map(wi => { const w = WEAPONS[wi]; return `<div class="item"><b>${w.name}</b><span class="m">Light ${w.light.dmg} · Heavy ${w.heavy.dmg} · Stamina ${w.light.st}/${w.heavy.st} · Weight ${w.weight} · Tier I</span><div class="row"><button class="btn ghost sm" type="button" data-w="${wi}" data-s="0">Hand 1</button><button class="btn ghost sm" type="button" data-w="${wi}" data-s="1">Hand 2</button></div></div>`; }).join('') + (owned.length < WEAPONS.length ? `<p class="note">${WEAPONS.length - owned.length} more weapon${WEAPONS.length - owned.length === 1 ? '' : 's'} hidden in chests on the road.</p>` : '');
  const gslots = ['head', 'body', 'feet'].map(k => { const id = P.garb[k], g = id && GARB[id]; return `<div class="slot"><span class="lbl">${SLOT_NAMES[k]}</span>${g ? `<b>${g.name}</b><span>${g.what}</span><span class="m">Protection ${g.prot}% · Weight ${g.weight}</span><div class="row"><button class="btn ghost sm" type="button" data-goff="${k}">Take off</button></div>` : '<span class="note">Nothing</span>'}</div>`; }).join('');
  const gcar = [...P.garbOwned].filter(id => P.garb[GARB[id].slot] !== id);
  const ginv = gcar.length ? gcar.map(id => { const g = GARB[id]; return `<div class="item"><b>${g.name}</b><span>${SLOT_NAMES[g.slot]} · ${g.what}</span><span class="m">Protection ${g.prot}% · Weight ${g.weight}</span><div class="row"><button class="btn ghost sm" type="button" data-gon="${id}">Wear</button></div></div>`; }).join('') : `<p class="note">Garments you find but do not wear wait here. Found ${P.garbOwned.size} of ${Object.keys(GARB).length}.</p>`;
  const rslots = [0, 1, 2, 3].map(i => { const id = P.equip[i]; return `<div class="slot"><span class="lbl">Relic ${i + 1}</span>${id ? `<b>${RELICS[id].name}</b><span>${RELICS[id].what}</span><div class="row"><button class="btn ghost sm" type="button" data-off="${i}">Take off</button></div>` : '<span class="note">Empty</span>'}</div>`; }).join('');
  const carried = [...P.relics].filter(id => !P.equip.includes(id));
  const rinv = carried.length ? carried.map(id => `<div class="item"><b>${RELICS[id].name}</b><span>${RELICS[id].what}</span><div class="row"><button class="btn ghost sm" type="button" data-on="${id}"${full ? ' disabled' : ''}>${full ? 'Slots full' : 'Put on'}</button></div></div>`).join('') : `<p class="note">Relics you find but do not wear wait here. Found ${P.relics.size} of ${Object.keys(RELICS).length}.</p>`;
  const words = P.noMana ? '<p class="note">This body has no mana, so keys 1 to 4 stay empty.</p>' : P.wordSlots.map((id, i) => `<label class="wslot"><span class="lbl">Key ${i + 1}</span><select data-ws="${i}">${WORDS.map(w => `<option value="${w.id}"${w.id === id ? ' selected' : ''}>${w.say} · ${w.cost} mana</option>`).join('')}</select></label>`).join('');
  const hs = horse.state, horseLine = hs === 'wild' ? 'No mount yet. A wild horse grazes by the hut.' : hs === 'ridden' ? `Riding · horse health ${Math.round(horse.hp)}/${horse.hpMax}` : hs === 'fled' ? 'Your horse is hurt and ran off. Rest at a shrine.' : `Befriended · horse health ${Math.round(horse.hp)}/${horse.hpMax}`;
  $('gearIn').innerHTML = `
    <span class="eyebrow">Life ${life.n} · Tab or Esc to close</span><h2>${gearView === 'spells' ? 'Spells' : 'Gear'}</h2>
    <div class="row"><button class="btn sm${gearView === 'gear' ? '' : ' ghost'}" type="button" data-view="gear">Gear</button><button class="btn sm${gearView === 'spells' ? '' : ' ghost'}" type="button" data-view="spells">Spells</button></div>
    ${gearView === 'spells' ? renderSpellBook() : `<div class="gear">
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
        <div class="stats"><span>1 to 4 · spells (${P.noMana ? 'none in this body' : `${b.tierName} mana opens ${P.wordSlots.length}`})</span><span>5 · torch (${Math.ceil(P.torch.fuel)}s of fuel)</span><span>6 · ink knife (${P.knives}/${P.knivesMax})</span><span>7 · lotus (${P.lotus}/${P.lotusMax})</span><span>8 · mount bell: ${esc(horseLine)}</span></div>
        <p class="note">Spells are on the Spells page.</p>
        <span class="lbl">This body</span>
        <div class="stats"><span>Born ${esc(b.local)}, ${esc(b.place)}</span><span>${esc(b.lagna)} lagna · Moon ${esc(b.moon)}</span><span>${esc(b.region)} · ${esc(b.people)}</span><span>${perks(b).map(esc).join(' · ')}</span>
        <span>Health ${Math.round(P.hp)}/${P.hpMax} · Stamina ${P.stMax} · Mana ${P.manaMax} · Prana ${P.prana}/${P.pranaMax}</span><span>Lotus ${P.lotus}/${P.lotusMax} · Seeds ${P.seeds}</span></div></div>
    </div>`}`;
  $('gearIn').querySelectorAll('[data-view]').forEach(bt => bt.addEventListener('click', () => { gearView = bt.dataset.view; renderGear(); }));
  const q = sel => $('gearIn').querySelectorAll(sel);
  q('[data-w]').forEach(bt => bt.addEventListener('click', () => { const wi = +bt.dataset.w, s = +bt.dataset.s, other = 1 - s; if (P.slots[other] === wi) P.slots[other] = P.slots[s]; P.slots[s] = wi; renderGear(); }));
  q('[data-goff]').forEach(bt => bt.addEventListener('click', () => { P.garb[bt.dataset.goff] = null; renderGear(); }));
  q('[data-gon]').forEach(bt => bt.addEventListener('click', () => { const id = bt.dataset.gon; P.garb[GARB[id].slot] = id; renderGear(); }));
  q('[data-off]').forEach(bt => bt.addEventListener('click', () => { P.equip[+bt.dataset.off] = null; renderGear(); }));
  q('[data-on]').forEach(bt => bt.addEventListener('click', () => { const i = P.equip.indexOf(null); if (i >= 0) P.equip[i] = bt.dataset.on; renderGear(); }));
  q('[data-ws]').forEach(se => se.addEventListener('change', () => { const i = +se.dataset.ws, v = se.value || null, j = v ? P.wordSlots.indexOf(v) : -1; if (j >= 0 && j !== i) P.wordSlots[j] = P.wordSlots[i]; P.wordSlots[i] = v; renderGear(); }));
}
let mapHits = [], mapMsg = null;
function danger() { return foes.some(f => f.alive && (f.state === 'chase' || f.state === 'wind' || f.state === 'swing') && Math.abs(f.x - P.x) < 520 && Math.abs(f.gy - (P.y + P.h)) < 160); }
function travelTo(i) {
  if (i < 0 || i >= SHRINES.length || !P || P.dead) return;
  if (!P.visited.has(i)) { mapMsg = { t: clock + 2.5, text: 'You have not rested at that shrine in this life.' }; return; }
  if (danger()) { mapMsg = { t: clock + 2.5, text: 'The Grasping are hunting you. Get away from them first.' }; return; }
  if (P.mount) dismount(false);
  if (horse.state === 'idle') horse.state = 'away';
  const s = SHRINES[i]; Object.assign(P, { x: s.x + 40, y: s.gy - PH, h: PH, w: 22, vx: 0, vy: 0, hang: null, ladder: null, climbT: 0, glide: false, plunge: false, cling: 0 });
  $('ovGear').hidden = true; mode = 'play'; clearHeld(); rest(i); snapCam();
  for (let k = 0; k < 30; k++) fx.push({ k: 'ink', x: pcx() + rnd(-20, 20), y: P.y + rnd(0, P.h), vx: rnd(-40, 40), vy: -rnd(20, 80), life: rnd(0.4, 1) });
  banner = { t: 2.6, top: 'YOU TRAVEL', sub: `${s.name}. You arrive rested. If your horse was with you, ring the bell to call it again.` };
}
function drawMap() {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `22px ${FD}`; ctx.fillText('THE PROVING GROUNDS', W / 2, 52);
  ctx.font = `16px ${FH}`; ctx.fillStyle = INK2; ctx.fillText('Click a shrine you have rested at (or press its number) to travel there · M or Esc to close', W / 2, 78);
  if (mapMsg && mapMsg.t > clock) { ctx.font = `16px ${FH}`; ctx.fillStyle = RED; ctx.fillText(mapMsg.text, W / 2, 104); }
  const x0 = 30, y0 = 150, kx = (W - 60) / LW, ky = 300 / LH, X = x => x0 + x * kx, Y = y => y0 + y * ky;
  for (const d of DARKS) { ctx.fillStyle = 'rgba(21,21,19,0.10)'; ctx.fillRect(X(d.x), Y(d.y), d.w * kx, d.h * ky); }
  for (const w of WINDS) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 4; i++) { const ax = X(w.x + w.w * (i + 0.5) / 4); ctx.moveTo(ax, Y(1300)); ctx.lineTo(ax, Y(700)); ctx.moveTo(ax - 4, Y(700) + 6); ctx.lineTo(ax, Y(700)); ctx.lineTo(ax + 4, Y(700) + 6); } ctx.stroke(); }
  ctx.fillStyle = INK2; for (const s of SOLIDS) ctx.fillRect(X(s.x), Y(s.y), Math.max(1, s.w * kx), Math.max(1, s.h * ky));
  for (const s of SOLIDS) if (s.surf) { ctx.fillStyle = s.surf === 'hot' ? RED : s.surf === 'ice' ? PAPER : PENCIL; ctx.fillRect(X(s.x), Y(s.y), s.w * kx, 3); }
  for (const w of WATERS) { ctx.fillStyle = 'rgba(140,137,127,0.45)'; ctx.fillRect(X(w.x), Y(w.y), w.w * kx, w.h * ky); }
  ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); for (const o of ONEWAYS) { ctx.moveTo(X(o.x), Y(o.y)); ctx.lineTo(X(o.x + o.w), Y(o.y)); } for (const c of CRUMBLES) { ctx.moveTo(X(c.x) + 1, Y(c.y)); ctx.lineTo(X(c.x + c.w) - 1, Y(c.y)); } ctx.stroke();
  ctx.strokeStyle = INK2; ctx.lineWidth = 1; for (const l of LADDERS) { ctx.strokeRect(X(l.x), Y(l.y), Math.max(2, l.w * kx), l.h * ky); }
  for (const f of FAKES) { if (f.found || has('bead')) { ctx.fillStyle = PAPER; ctx.fillRect(X(f.x), Y(f.y), f.w * kx, f.h * ky); ctx.save(); ctx.setLineDash([3, 2]); ctx.strokeStyle = INK2; ctx.strokeRect(X(f.x), Y(f.y), f.w * kx, f.h * ky); ctx.restore(); } else { ctx.fillStyle = INK2; ctx.fillRect(X(f.x), Y(f.y), f.w * kx, f.h * ky); } }
  ctx.font = `14px ${FH}`; ctx.fillStyle = INK2; ctx.textAlign = 'left';
  ZONES.forEach(([zx, name], i) => { const tx = X(zx) + 2; ctx.fillStyle = P.zones.has(i) ? INK : PENCIL; ctx.fillText(name.replace('THE ', '').toLowerCase(), tx, y0 - 22 - (i % 2) * 16); ctx.strokeStyle = FAINT; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(zx), y0 - 18 - (i % 2) * 16); ctx.lineTo(X(zx), y0); ctx.stroke(); });
  mapHits = [];
  SHRINES.forEach((s, i) => { const sx = X(s.x), sy = Y(s.gy), seen = P.visited.has(i), hov = Math.hypot(mouse.x - sx, mouse.y - (sy - 10)) < 18; mapHits.push({ i, x: sx, y: sy - 10 });
    ctx.font = `12px ${FD}`; ctx.textAlign = 'center'; ctx.fillStyle = seen ? INK : PENCIL; ctx.fillText(seen ? String(i + 1) : '?', sx, sy + 16);
    if (seen && hov) { ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 10, 15, 0, Math.PI * 2); ctx.stroke(); ctx.font = `15px ${FH}`; ctx.fillStyle = INK; ctx.fillText(s.name + ' · click to travel', clamp(sx, 150, W - 150), sy - 30); }
    ctx.fillStyle = i === P.shrine ? INK : PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy - 16); ctx.lineTo(sx - 6, sy - 4); ctx.lineTo(sx + 6, sy - 4); ctx.closePath(); ctx.fill(); ctx.stroke(); });
  for (const f of FORGES) { ctx.fillStyle = INK; ctx.fillRect(X(f.x) - 5, Y(f.gy) - 7, 10, 5); ctx.fillRect(X(f.x) - 2, Y(f.gy) - 3, 4, 3); }
  for (const c of CHESTS) if (!chestOpen(c)) { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.fillRect(X(c.x) - 4, Y(c.gy) - 8, 8, 7); ctx.strokeRect(X(c.x) - 4, Y(c.gy) - 8, 8, 7); }
  if (horse.state === 'wild' || horse.state === 'idle') { ctx.font = `13px ${FH}`; ctx.fillStyle = INK2; ctx.textAlign = 'center'; ctx.fillText('horse', X(horse.x), Y(horse.gy) - 6); }
  for (const [id, x, gy] of RELIC_SPOTS) if (!P.relics.has(id) && !relicStored(id)) { const rx = X(x), ry = Y(gy) - 12; ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(rx, ry, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); relicIcon(id, rx, ry, 0.6); }
  for (const s of shades) if (!s.taken) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(X(s.x), Y(s.y) - 6, 3, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  for (const bd of soul.bodies) if (!bd.taken && bd.life !== life.n) { const bx = X(bd.x), by = Y(bd.y) - 6; ctx.strokeStyle = PENCIL; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(bx - 5, by - 5); ctx.lineTo(bx + 5, by + 5); ctx.moveTo(bx + 5, by - 5); ctx.lineTo(bx - 5, by + 5); ctx.stroke(); }
  const px = X(pcx()), py = Y(P.y);
  ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 7, py - 13); ctx.lineTo(px + 7, py - 13); ctx.closePath(); ctx.fill(); ctx.font = `10px ${FD}`; ctx.textAlign = 'center'; ctx.fillText('YOU', px, py - 18);
  ctx.textAlign = 'left'; ctx.font = `15px ${FH}`; ctx.fillStyle = INK2;
  const ly = 492; ctx.fillText('▲ shrine (filled: you wake here)    ◯ relic still waiting    ▫ chest    ▬ forge    ● your seeds    ✕ a body from a past life    red line: burning ground', 30, ly);
  ctx.fillText(`Relics found: ${P.relics.size} of ${Object.keys(RELICS).length} · Chests opened: ${CHESTS.filter(chestOpen).length} of ${CHESTS.length}`, 30, ly + 22);
}

/* ---------- update ---------- */
function update(dt) {
  clock += dt;
  if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
  if (zoneTag) { zoneTag.t -= dt; if (zoneTag.t <= 0) zoneTag = null; }
  if (villager.talkT > 0) villager.talkT -= dt;
  if (hitstop > 0) { hitstop -= dt; return; }
  if (pendingDeath > 0) { pendingDeath -= dt; P.deadT += dt; if (pendingDeath <= 0) afterFall(); }
  if (mode !== 'play') return;
  if (micMode === 'ptt') {
    if (pressed.talk) { pttHeld = true; startRec(); }
    if (released.talk) { pttHeld = false; pttRelease = performance.now(); setTimeout(() => { if (!pttHeld && micMode === 'ptt') stopRec(); }, 500); }
  }
  updatePlayer(dt); updateFoes(dt); updateShots(dt); updateCrumbles(dt); updateHorse(dt); updateMagic(dt);
  for (const f of fx) { f.life -= dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.k === 'dot') f.vy += 900 * dt; }
  fx = fx.filter(f => f.life > 0);
  for (const f of floaters) { f.life -= dt; f.y -= 34 * dt; } floaters = floaters.filter(f => f.life > 0);
  const [tx, ty] = camTarget();
  camX += (tx - camX) * Math.min(1, dt * 5); camY += (ty - camY) * Math.min(1, dt * 4.5);
  shake = Math.max(0, shake - dt * 30);
}

/* ---------- drawing ---------- */
const POSE = {
  idle: t => ({ lean: 0.04 + Math.sin(t * 2.2) * 0.02, aF: [0.25, 0.45], aB: [-0.2, 0.05], lF: [0.14, 0.02], lB: [-0.14, -0.02] }),
  run: ph => { const s = Math.sin(ph), c = Math.cos(ph); return { lean: 0.2, lF: [s * 0.8, s * 0.8 - 0.25 - 0.7 * Math.max(0, -c)], lB: [-s * 0.8, -s * 0.8 - 0.25 - 0.7 * Math.max(0, c)], aF: [-s * 0.9, -s * 0.9 + 1.1], aB: [s * 0.9, s * 0.9 + 1.1] }; },
  jump: () => ({ lean: 0.08, lF: [0.8, -0.15], lB: [-0.25, -0.95], aF: [2.5, 2.9], aB: [-2.1, -2.6] }),
  wind: () => ({ lean: -0.2, aF: [-1.2, 0.1], aB: [0.8, 1.7], lF: [0.42, 0.12], lB: [-0.42, -0.2] }),
  strike: () => ({ lean: 0.25, aF: [1.6, 1.5], aB: [0.6, 2.0], lF: [0.55, 0.25], lB: [-0.45, -0.15] }),
  roll: () => ({ lean: 1.2, lF: [1.4, -0.6], lB: [1.0, -0.8], aF: [1.2, 2.2], aB: [1.0, 2.0] }),
  parry: () => ({ lean: -0.05, aF: [2.0, 2.9], aB: [1.2, 2.4], lF: [0.35, 0.1], lB: [-0.35, -0.1] }),
  drink: () => ({ lean: -0.15, aF: [2.6, 3.0], aB: [-0.2, 0.1], lF: [0.15, 0.02], lB: [-0.15, -0.02] }),
  hurt: () => ({ lean: -0.38, aF: [2.6, 2.2], aB: [-2.4, -2.8], lF: [0.45, 0.15], lB: [-0.2, 0.25] }),
  kneel: () => ({ lean: 0.5, aF: [2.9, 3.0], aB: [2.7, 3.0], lF: [1.5, -1.4], lB: [0.2, -1.6] }),
  sit: () => ({ lean: -0.1, aF: [0.9, 1.4], aB: [0.6, 1.2], lF: [1.55, -1.3], lB: [1.45, -1.2] }),
  crouch: ph => ({ lean: 0.85, aF: [1.1, 1.9], aB: [0.6, 1.4], lF: [1.3 + Math.sin(ph) * 0.25, -0.9], lB: [0.5 - Math.sin(ph) * 0.25, -1.3] }),
  hang: t => ({ lean: 0.08, aF: [2.55, 2.75], aB: [2.4, 2.65], lF: [0.25 + Math.sin(t * 3) * 0.08, 0.1], lB: [-0.1, -0.2] }),
  climb: ph => ({ lean: 0.0, aF: [2.6 + Math.sin(ph) * 0.4, 3.0], aB: [2.6 - Math.sin(ph) * 0.4, 3.0], lF: [0.6 + Math.sin(ph) * 0.4, -0.6], lB: [0.6 - Math.sin(ph) * 0.4, -0.6] }),
  swim: ph => ({ lean: 1.35, aF: [2.6 + Math.sin(ph) * 0.6, 2.8], aB: [2.2 - Math.sin(ph) * 0.6, 2.6], lF: [-1.2 + Math.sin(ph * 1.5) * 0.25, -1.4], lB: [-1.5 - Math.sin(ph * 1.5) * 0.25, -1.6] }),
  cling: () => ({ lean: -0.1, aF: [2.7, 2.9], aB: [2.4, 2.8], lF: [0.9, -0.3], lB: [0.3, -0.5] }),
  glide: () => ({ lean: 0.1, aF: [2.6, 2.9], aB: [-2.6, -2.9], lF: [0.3, 0.1], lB: [-0.4, -0.3] }),
  plunge: () => ({ lean: 0.2, aF: [0.3, 0.1], aB: [-0.4, -0.2], lF: [1.6, -1.0], lB: [1.2, -1.4] }),
};
function stick(x, y, pose, face, ink, lw, opt = {}) {
  const s = opt.s || 1, L1 = 10.5 * s, L2 = 9.5 * s, A1 = 10 * s, A2 = 9.5 * s, hr = 6.5 * s * (opt.hs || 1);
  const ext = l => Math.cos(l[0]) * L1 + Math.cos(l[1]) * L2;
  const hipY = opt.robe ? -20 * s : -Math.max(ext(pose.lF), ext(pose.lB));
  const hip = { x, y: y + hipY }, neck = { x: x + Math.sin(pose.lean) * face * 18 * s, y: hip.y - Math.cos(pose.lean) * 18 * s };
  const head = { x: neck.x + Math.sin(pose.lean) * face * (hr + 1.5 * s), y: neck.y - Math.cos(pose.lean) * (hr + 1.5 * s) };
  const sh = { x: hip.x + (neck.x - hip.x) * 0.86, y: hip.y + (neck.y - hip.y) * 0.86 };
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const limb = (r, a, l1, l2) => { const k = { x: r.x + Math.sin(a[0]) * face * l1, y: r.y + Math.cos(a[0]) * l1 }, e = { x: k.x + Math.sin(a[1]) * face * l2, y: k.y + Math.cos(a[1]) * l2 }; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(k.x, k.y); ctx.lineTo(e.x, e.y); ctx.stroke(); return e; };
  if (opt.robe) { ctx.beginPath(); ctx.moveTo(hip.x - 4 * s, hip.y - 6 * s); ctx.lineTo(hip.x + 4 * s, hip.y - 6 * s); ctx.lineTo(hip.x + 11 * s, y); ctx.lineTo(hip.x - 11 * s, y); ctx.closePath(); ctx.fill(); }
  let fB = null, fF = null;
  if (!opt.robe) fB = limb(hip, pose.lB, L1, L2);
  const hB = limb(sh, pose.aB, A1, A2);
  ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(neck.x, neck.y); ctx.stroke();
  if (!opt.robe) fF = limb(hip, pose.lF, L1, L2);
  const hF = limb(sh, pose.aF, A1, A2);
  ctx.beginPath(); ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
  if (opt.hollow) { ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); } else ctx.fill();
  if (opt.hair === 1) { ctx.lineWidth = lw * 0.6; ctx.beginPath(); for (let i = -1; i <= 1; i++) { const a = -Math.PI / 2 + i * 0.5 - face * 0.3; ctx.moveTo(head.x + Math.cos(a) * hr, head.y + Math.sin(a) * hr); ctx.lineTo(head.x + Math.cos(a - face * 0.3) * hr * 1.7, head.y + Math.sin(a - face * 0.3) * hr * 1.7); } ctx.stroke(); }
  if (opt.hair === 2) { ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(head.x - face * hr * 0.6, head.y - hr * 0.6); ctx.quadraticCurveTo(head.x - face * hr * 2.2, head.y, head.x - face * hr * 1.6, head.y + hr * 2.4); ctx.stroke(); }
  if (opt.hair === 3) { ctx.beginPath(); ctx.arc(head.x - face * hr * 0.2, head.y - hr * 1.1, hr * 0.55, 0, Math.PI * 2); ctx.fill(); }
  if (opt.eye) { ctx.fillStyle = opt.eyeC || PAPER; ctx.fillRect(head.x + face * hr * 0.15, head.y - hr * 0.32, face * hr * 0.6, hr * 0.3); }
  return { hF, hB, head, neck, hip, sh, fF, fB, hr };
}
function hatch(x, y, w, h, gap = 13, c = HATCH, lw = 1.2) {
  const x0 = Math.max(x, camX - 4), x1 = Math.min(x + w, camX + W + 4), y0 = Math.max(y, camY - 4), y1 = Math.min(y + h, camY + H + 4);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
  for (let k = Math.floor((x0 + y0) / gap) * gap; k <= x1 + y1; k += gap) { ctx.moveTo(k - y0, y0); ctx.lineTo(k - y1, y1); }
  ctx.stroke(); ctx.restore();
}
const visible = (r, m = 40) => r.x < camX + W + m && r.x + r.w > camX - m && r.y < camY + H + m && r.y + r.h > camY - m;
function relicIcon(id, x, y, s = 1, c = INK) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (id === 'garuda') { ctx.moveTo(-7, 10); ctx.quadraticCurveTo(-1, 0, 7, -11); ctx.stroke(); ctx.beginPath(); for (let i = 1; i < 5; i++) { const t = i / 5, px = -7 + 14 * t, py = 10 - 21 * t + Math.sin(t * Math.PI) * 4; ctx.moveTo(px, py); ctx.lineTo(px - 7, py - 2); ctx.moveTo(px, py); ctx.lineTo(px + 4, py + 5); } ctx.lineWidth = 1.4; ctx.stroke(); }
  else if (id === 'gecko') { ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(9, -1, 3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-7, -7); ctx.moveTo(-4, 0); ctx.lineTo(-7, 7); ctx.moveTo(4, 0); ctx.lineTo(7, -7); ctx.moveTo(4, 0); ctx.lineTo(7, 7); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(-14, 0, -12, 6); ctx.stroke(); }
  else if (id === 'kite') { ctx.moveTo(0, -11); ctx.lineTo(8, -2); ctx.lineTo(0, 7); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 7); ctx.moveTo(-8, -2); ctx.lineTo(8, -2); ctx.moveTo(0, 7); ctx.quadraticCurveTo(4, 10, 0, 13); ctx.quadraticCurveTo(-4, 15, 0, 18); ctx.lineWidth = 1.4; ctx.stroke(); }
  else if (id === 'naga') { ctx.moveTo(-10, 5); ctx.quadraticCurveTo(0, -16, 10, 5); ctx.quadraticCurveTo(0, 1, -10, 5); ctx.fill(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-5, 1); ctx.quadraticCurveTo(0, -8, 5, 1); ctx.stroke(); }
  else if (id === 'bead') { ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAPER; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.arc(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 1.3, 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill(); }
  else if (id === 'ember') { ctx.moveTo(0, -12); ctx.quadraticCurveTo(10, 0, 0, 10); ctx.quadraticCurveTo(-10, 0, 0, -12); ctx.fill(); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(4, 4, 0, 7); ctx.quadraticCurveTo(-4, 4, 0, -2); ctx.fill(); }
  else if (id === 'tortoise') { ctx.arc(0, 3, 10, Math.PI, 0); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-3, -3); ctx.lineTo(3, -3); ctx.lineTo(5, 3); ctx.moveTo(-3, -3); ctx.lineTo(-6, -5); ctx.moveTo(3, -3); ctx.lineTo(6, -5); ctx.moveTo(10, 2); ctx.lineTo(14, 0); ctx.moveTo(-7, 3); ctx.lineTo(-8, 7); ctx.moveTo(7, 3); ctx.lineTo(8, 7); ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.restore();
}
function drawShrine(s, i) {
  const sx = s.x, g = s.gy, cur = P.shrine === i;
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx - 46, g); ctx.lineTo(sx - 46, g - 120); ctx.moveTo(sx + 46, g); ctx.lineTo(sx + 46, g - 120); ctx.moveTo(sx - 70, g - 120); ctx.quadraticCurveTo(sx, g - 140, sx + 70, g - 120); ctx.moveTo(sx - 56, g - 98); ctx.lineTo(sx + 56, g - 98); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(sx, g - 8, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
  const flame = (cur ? 10 : 6) + Math.sin(clock * 9 + i) * 2; ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, g - 14 - flame * 2); ctx.quadraticCurveTo(sx + 8, g - 16, sx, g - 12); ctx.quadraticCurveTo(sx - 8, g - 16, sx, g - 14 - flame * 2); ctx.fill(); ctx.stroke();
  ctx.font = `12px ${FD}`; ctx.fillStyle = cur ? INK : PENCIL; ctx.textAlign = 'center'; ctx.fillText(s.name.toUpperCase(), sx, g - 146);
}
function drawSolid(s) {
  ctx.fillStyle = PAPER; ctx.fillRect(s.x, s.y, s.w, s.h); hatch(s.x, s.y, s.w, s.h, 13);
  if (s.surf === 'mud') { ctx.fillStyle = INK2; for (let x = s.x + 4; x < s.x + s.w; x += 7) for (let k = 0; k < 3; k++) { const yy = s.y + 3 + k * 5 + ((x * 7 + k * 13) % 4); ctx.fillRect(x + ((k * 3) % 5), yy, 2, 2); } ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); for (let x = s.x; x <= s.x + s.w; x += 10) ctx.lineTo(x, s.y + 2 + Math.sin(x * 0.2 + clock * 1.5) * 1.5); ctx.stroke(); }
  if (s.surf === 'ice') { ctx.fillStyle = PAPER; ctx.fillRect(s.x, s.y, s.w, 14); ctx.strokeStyle = INK2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x, s.y + 14); ctx.lineTo(s.x + s.w, s.y + 14); for (let x = s.x + 20; x < s.x + s.w; x += 46) { ctx.moveTo(x, s.y + 11); ctx.lineTo(x + 14, s.y + 4); ctx.moveTo(x + 8, s.y + 12); ctx.lineTo(x + 16, s.y + 8); } ctx.stroke(); }
  if (s.surf === 'hot') { hatch(s.x, s.y, s.w, 16, 5, RED, 1.4); ctx.strokeStyle = RED; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = s.x + 12; x < s.x + s.w; x += 30) { const ph = (clock * 1.2 + x * 0.013) % 1, yy = s.y - 4 - ph * 26; ctx.globalAlpha = 1 - ph; ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 4, yy - 5, x, yy - 10); } ctx.stroke(); ctx.globalAlpha = 1; }
}
function drawWorld() {
  // far hills
  ctx.save(); ctx.translate(-camX * 0.3, -camY * 0.3); ctx.strokeStyle = FAINT; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -200; x < LW * 0.4 + W; x += 40) ctx.lineTo(x, 520 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.017) * 14);
  ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-camX, -camY);
  // wind
  for (const w of WINDS) if (visible(w)) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 18; i++) { const x = w.x + 20 + (i * 97) % (w.w - 40), y = w.y + w.h - ((clock * 170 + i * 137) % w.h); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 12, x, y - 24); ctx.moveTo(x - 4, y - 18); ctx.lineTo(x, y - 24); ctx.lineTo(x + 5, y - 19); } ctx.stroke(); }
  // terrain
  for (const s of SOLIDS) if (visible(s)) drawSolid(s);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
  for (const e of EDGES) { if (Math.max(e[0], e[2]) < camX - 10 || Math.min(e[0], e[2]) > camX + W + 10 || Math.max(e[1], e[3]) < camY - 10 || Math.min(e[1], e[3]) > camY + H + 10) continue; ctx.moveTo(e[0], e[1]); ctx.lineTo(e[2], e[3]); }
  ctx.stroke();
  for (const o of ONEWAYS) if (visible(o)) { ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(o.x, o.y + 2); ctx.lineTo(o.x + o.w, o.y + 2); ctx.stroke(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(o.x + 2, o.y + 8); ctx.lineTo(o.x + o.w - 2, o.y + 8); for (let x = o.x + 12; x < o.x + o.w; x += 34) { ctx.moveTo(x, o.y + 8); ctx.lineTo(x + 10, o.y + 24); } ctx.stroke(); }
  for (const L of LADDERS) if (visible(L)) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L.x + 3, L.y); ctx.lineTo(L.x + 3, L.y + L.h); ctx.moveTo(L.x + L.w - 3, L.y); ctx.lineTo(L.x + L.w - 3, L.y + L.h); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); for (let y = L.y + 14; y < L.y + L.h; y += 22) { ctx.moveTo(L.x + 3, y); ctx.lineTo(L.x + L.w - 3, y); } ctx.stroke(); }
  for (const c of CRUMBLES) if (visible(c)) {
    if (c.state === 'gone') { ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.strokeRect(c.x + 3, c.y, c.w - 6, c.h); ctx.restore(); continue; }
    const ox = c.state === 'shake' ? rnd(-2, 2) : 0, oy = c.state === 'shake' ? rnd(0, 2) : 0;
    ctx.fillStyle = PAPER; ctx.fillRect(c.x + 2 + ox, c.y + oy, c.w - 4, c.h); hatch(c.x + 2 + ox, c.y + oy, c.w - 4, c.h, 6);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(c.x + 2 + ox, c.y + oy, c.w - 4, c.h);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x + 30 + ox, c.y + oy); ctx.lineTo(c.x + 36 + ox, c.y + 8 + oy); ctx.lineTo(c.x + 30 + ox, c.y + c.h + oy); ctx.stroke();
  }
  // props
  SHRINES.forEach((s, i) => { if (visible({ x: s.x - 80, y: s.gy - 160, w: 160, h: 160 })) drawShrine(s, i); });
  const hx = HUT.x, hg = HUT.gy; ctx.fillStyle = PAPER; ctx.fillRect(hx - 60, hg - 90, 120, 90); hatch(hx - 60, hg - 90, 120, 90, 9); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(hx - 60, hg - 90, 120, 90);
  ctx.beginPath(); ctx.moveTo(hx - 80, hg - 88); ctx.lineTo(hx, hg - 150); ctx.lineTo(hx + 80, hg - 88); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(hx - 16, hg - 52, 32, 52);
  for (const [id, x, gy] of RELIC_SPOTS) {
    if (!visible({ x: x - 30, y: gy - 70, w: 60, h: 70 })) continue;
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.fillRect(x - 15, gy - 12, 30, 12); ctx.strokeRect(x - 15, gy - 12, 30, 12);
    if (P.relics.has(id) || relicStored(id)) continue;
    const by = gy - 36 + Math.sin(clock * 2.5 + x) * 4;
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, by, 16 + Math.sin(clock * 3) * 2, 0, Math.PI * 2); ctx.stroke();
    relicIcon(id, x, by, 1);
  }
  for (const p of pots) if (!p.broken && visible({ x: p.x - 20, y: p.gy - 40, w: 40, h: 40 })) { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x - 6, p.gy - 28); ctx.lineTo(p.x + 6, p.gy - 28); ctx.quadraticCurveTo(p.x + 16, p.gy - 14, p.x + 8, p.gy); ctx.lineTo(p.x - 8, p.gy); ctx.quadraticCurveTo(p.x - 16, p.gy - 14, p.x - 6, p.gy - 28); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x - 11, p.gy - 14); ctx.lineTo((p.x + p.w / 2), p.gy - 14); ctx.lineWidth = 1.5; ctx.stroke(); }
  for (const d of drops) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.restore(); }
  // past bodies & shades
  ctx.textAlign = 'center';
  for (const b of soul.bodies) if (!b.taken && b.life !== life.n) { ctx.save(); ctx.globalAlpha = 0.85; stick(b.x, b.y, POSE.kneel(), 1, PENCIL, b.looks.build, { hair: b.looks.hair, robe: b.looks.robe }); ctx.restore(); ctx.font = `15px ${FH}`; ctx.fillStyle = PENCIL; ctx.fillText('a body you once wore', b.x, b.y - 70); }
  for (const s of shades) if (!s.taken) { ctx.fillStyle = INK; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clock * 4); ctx.beginPath(); ctx.ellipse(s.x, s.y - 30, 10, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.font = `14px ${FH}`; ctx.fillStyle = INK2; ctx.fillText(`${s.seeds} seeds`, s.x, s.y - 66); }
  // villager
  stick(villager.x, villager.gy, POSE.sit(), -1, INK2, 3, { hollow: true, s: 0.95 });
  if (!villager.helped && life.n === 1) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(villager.x + 4, villager.gy - 26, 4, 0, Math.PI * 2); ctx.fill(); }
  if (villager.talkT > 0) speech(villager.x, villager.gy - 110, villager.line);
  drawMagic();
  for (const n of NODES) if (n.k !== 'petal' && visible({ x: n.x - 40, y: n.gy - 120, w: 80, h: 120 })) drawNode(n);
  for (const f of FORGES) if (visible({ x: f.x - 40, y: f.gy - 80, w: 80, h: 80 })) drawForge(f);
  for (const st of STONES) if (visible({ x: st.x - 30, y: st.gy - 70, w: 60, h: 70 })) drawStone(st);
  if (visible({ x: HOME.x - 40, y: HOME.gy - 60, w: 80, h: 60 })) drawHome();
  for (const c of CHESTS) if (visible({ x: c.x - 24, y: c.gy - 40, w: 48, h: 40 })) {
    const open = chestOpen(c); ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.fillRect(c.x - 17, c.gy - 20, 34, 20); hatch(c.x - 17, c.gy - 20, 34, 20, 6); ctx.strokeRect(c.x - 17, c.gy - 20, 34, 20);
    ctx.save(); ctx.translate(c.x - 17, c.gy - 20); if (open) ctx.rotate(-1.1); ctx.fillStyle = PAPER; ctx.fillRect(0, -8, 34, 8); ctx.strokeRect(0, -8, 34, 8); ctx.restore();
    if (!open) { ctx.fillStyle = INK; ctx.fillRect(c.x - 3, c.gy - 16, 6, 7); }
  }
  if (horse && horse.state !== 'ridden' && horse.state !== 'away' && !(horse.state === 'fled' && horse.fleeT <= 0)) {
    const fl = horse.state === 'fled', hx = fl ? horse.fleeX : horse.x;
    if (visible({ x: hx - 60, y: horse.gy - 90, w: 120, h: 90 })) drawHorse(hx, horse.gy, horse.face, clock * 14, fl, { alpha: fl ? horse.fleeT / 1.4 : horse.arriveT > 0 ? 1 - horse.arriveT / 0.8 : 1, graze: !fl && Math.sin(horse.graze * 0.5) > -0.3, saddle: horse.state !== 'wild', ink: horse.state === 'wild' ? INK2 : INK });
  }
  for (const f of foes) if (f.alive && visible(f, 80)) drawFoe(f);
  for (const s of shots) {
    if (s.arrow || s.knife) { const a = s.knife ? s.spin : Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = s.knife ? 3 : 2.5; ctx.beginPath(); ctx.moveTo(s.knife ? -10 : -26, 0); ctx.lineTo(s.knife ? 8 : 0, 0); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore(); }
    else { const sp = Math.hypot(s.vx, s.vy) || 1; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); for (let i = 1; i < 4; i++) { ctx.globalAlpha = 0.5 / i; ctx.beginPath(); ctx.arc(s.x - s.vx / sp * i * 12, s.y - s.vy / sp * i * 12, s.r * (1 - i * 0.18), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  drawPlayer();
  // water over the player
  for (const w of WATERS) if (visible(w)) {
    ctx.fillStyle = 'rgba(140,137,127,0.22)'; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.2; ctx.beginPath(); for (let y = w.y + 30; y < w.y + w.h; y += 34) for (let x = w.x + ((y * 3) % 50); x < w.x + w.w - 20; x += 90) { ctx.moveTo(x, y); ctx.lineTo(x + 18, y); } ctx.stroke();
    if (w.top) { ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); for (let x = w.x; x <= w.x + w.w; x += 8) { const yy = w.y + Math.sin(x * 0.05 + clock * 3) * 2.5; if (pointSolid(x, w.y + 4) || pointSolid(x - 8, w.y + 4)) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
  }
  for (const n of NODES) if (n.k === 'petal' && visible({ x: n.x - 20, y: n.gy - 30, w: 40, h: 40 })) drawNode(n);
  // false walls hide what is behind them
  for (const f of FAKES) if (visible(f)) {
    const see = f.found || has('bead');
    ctx.save(); ctx.globalAlpha = overlap(P, f) ? 0.25 : see ? 0.55 : 1;
    ctx.fillStyle = PAPER; ctx.fillRect(f.x, f.y, f.w, f.h); hatch(f.x, f.y, f.w, f.h, 13); ctx.restore();
    if (see) { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.strokeRect(f.x + 1, f.y + 1, f.w - 2, f.h - 2); ctx.restore(); }
  }
  for (const f of fx) {
    ctx.globalAlpha = Math.min(1, f.life * 2.5);
    if (f.k === 'spark') { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03); ctx.stroke(); }
    else if (f.k === 'stuck') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.restore(); }
    else if (f.k === 'leaf') { ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, 4, 2, clock * 3, 0, Math.PI * 2); ctx.stroke(); }
    else if (f.k === 'ring') { const k = 1 - f.life / 0.35, r = (f.big ? 20 : 8) + k * (f.big ? 90 : 30); ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (f.k === 'wind') { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.05, f.y); ctx.stroke(); }
    else if (f.k === 'flame') { ctx.fillStyle = Math.random() < 0.3 ? RED : INK; ctx.beginPath(); ctx.arc(f.x, f.y, 3 + f.life * 6, 0, Math.PI * 2); ctx.fill(); }
    else if (f.k === 'star') { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - 40); ctx.stroke(); }
    else if (f.k === 'bub') { ctx.strokeStyle = INK2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(f.x + Math.sin(f.life * 9) * 3, f.y, 3, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = f.c || INK; ctx.beginPath(); ctx.arc(f.x, f.y, f.k === 'ink' ? 4 : 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function drawOverDark() {
  // text that should read even in the dark: hints, floaters, the villager's words, the breath meter
  ctx.save(); ctx.translate(-camX, -camY);
  for (const s of SOLIDS) if (s.surf === 'hot' && visible(s) && darkAt(s.x + 1, s.y + 1)) { hatch(s.x, s.y, s.w, 16, 5, RED, 1.4); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y + 1); ctx.lineTo(s.x + s.w, s.y + 1); for (let x = s.x + 12; x < s.x + s.w; x += 30) { const ph = (clock * 1.2 + x * 0.013) % 1, yy = s.y - 4 - ph * 26; ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 4, yy - 5, x, yy - 10); } ctx.stroke(); }
  ctx.textAlign = 'center'; ctx.font = `19px ${FH}`;
  for (const [x, y, t] of HINTS) { if (x < camX - 300 || x > camX + W + 300 || y < camY - 40 || y > camY + H + 40) continue; ctx.fillStyle = darkAt(x, y) ? '#b9b6ac' : INK2; ctx.fillText(t, x, y); }
  const sh = nearShrine(); if (sh >= 0 && !P.dead) { ctx.fillStyle = darkAt(SHRINES[sh].x, SHRINES[sh].gy - 170) ? '#b9b6ac' : INK2; ctx.fillText('E: rest and level up', SHRINES[sh].x, SHRINES[sh].gy - 170); }
  if (!P.mount && horse && (horse.state === 'wild' || horse.state === 'idle') && Math.abs(pcx() - horse.x) < 70 && Math.abs(P.y + P.h - horse.gy) < 50) { ctx.fillStyle = INK2; ctx.fillText(horse.state === 'wild' ? 'E: offer the horse a lotus' : 'E: ride', horse.x, horse.gy - 96); }
  else if (P.mount && P.onG && Math.abs(P.vx) < 40) { ctx.fillStyle = INK2; ctx.fillText('E: get down · Shift: gallop', pcx(), P.y - 26); }
  { const st = nearStone(); if (st) { ctx.fillStyle = INK2; ctx.fillText(st.k === 'moon' ? 'E: touch the moon stone' : 'E: listen to the stone', st.x, st.gy - 80); } }
  if (nearForge() >= 0 && !P.mount) { const f = FORGES[nearForge()]; ctx.fillStyle = INK2; ctx.fillText('E: use the forge', f.x + 4, f.gy - 92); }
  if (Math.abs(pcx() - HOME.x) < 60 && Math.abs(P.y + P.h - HOME.gy) < 50) { ctx.fillStyle = INK2; ctx.fillText('E: your chest · it keeps things across lives', HOME.x, HOME.gy - 70); }
  for (const c of CHESTS) if (Math.abs(pcx() - c.x) < 60 && Math.abs(P.y + P.h - c.gy) < 50) { ctx.fillStyle = darkAt(c.x, c.gy - 50) ? '#b9b6ac' : INK2; ctx.fillText(chestOpen(c) ? (invEmpty(c.inv) ? 'E: an empty chest' : 'E: look inside') : 'E: open', c.x, c.gy - 40); }
  if (Math.abs(P.x - villager.x) < 90 && Math.abs(P.y + P.h - villager.gy) < 60) { ctx.fillStyle = INK2; ctx.fillText('E: talk', villager.x, villager.gy - 92); }
  if (P.breath < BREATH && !P.dead) { const n = 8, left = Math.ceil(P.breath / BREATH * n); for (let i = 0; i < n; i++) { const bx = pcx() - (n - 1) * 5 + i * 10, by = P.y - 16; ctx.strokeStyle = left <= 2 ? RED : INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2); if (i < left) { ctx.fillStyle = PAPER; ctx.fill(); } ctx.stroke(); } }
  for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = `13px ${FD}`; ctx.fillStyle = darkAt(f.x, f.y) && f.c !== RED ? '#d8d5cb' : f.c; ctx.textAlign = 'center'; const hw = ctx.measureText(f.t).width / 2 + 12; ctx.fillText(f.t, clamp(f.x, camX + hw, camX + W - hw), f.y); }
  ctx.globalAlpha = 1; ctx.restore();
}
function drawNight() {
  ctx.save(); ctx.fillStyle = 'rgba(21,21,19,0.22)'; ctx.fillRect(0, 0, W, H);
  const m = moonLight(), mx = 690, my = 128 - camY * 0.05, r = 16;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // the dark part of the Moon: a half disc plus an ellipse whose width follows the phase
  const k = 1 - 2 * m.illum, side = m.waxing ? -1 : 1; ctx.fillStyle = INK2; ctx.beginPath(); ctx.arc(mx, my, r - 1, Math.PI / 2, Math.PI * 1.5, side > 0); ctx.ellipse(mx, my, Math.abs(k) * (r - 1), r - 1, 0, Math.PI * 1.5, Math.PI / 2, (k > 0) === (side > 0)); ctx.fill();
  ctx.fillStyle = PAPER; for (let i = 0; i < 18; i++) { const sx = (i * 173 - camX * 0.05) % W, sy = 30 + (i * 61) % 160; ctx.globalAlpha = 0.4 + 0.4 * Math.sin(clock * 2 + i); ctx.fillRect((sx + W) % W, sy, 2, 2); }
  ctx.restore();
}
function lightR() { return 80 + (P.torch.lit ? 170 : 0) + (has('bead') ? 60 : 0); }
function drawDark() {
  const vis = DARKS.filter(d => visible(d, 0));
  if (!vis.length) return;
  dctx.setTransform(scale, 0, 0, scale, 0, 0); dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
  for (const d of vis) {
    const x = d.x - camX, y = d.y - camY, F = 180;
    const g = dctx.createLinearGradient(x, 0, x + d.w, 0), a = 'rgba(21,21,19,0.95)', z = 'rgba(21,21,19,0)';
    g.addColorStop(0, z); g.addColorStop(F / d.w, a); g.addColorStop(1 - F / d.w, a); g.addColorStop(1, z);
    dctx.fillStyle = g; dctx.fillRect(x, y, d.w, d.h);
  }
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const g = dctx.createRadialGradient(x, y, r * 0.3, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill(); };
  if (!P.dead || P.deadT < 1) hole(pcx() - camX, P.y + 20 - camY, lightR() * (P.torch.lit ? 1 + Math.sin(clock * 13) * 0.02 : 1));
  for (const s of shots) if (s.fire) hole(s.x - camX, s.y - camY, 90);
  for (const s of SHRINES) if (darkAt(s.x, s.gy - 20)) hole(s.x - camX, s.gy - 30 - camY, 140);
  dctx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dk, 0, 0); ctx.restore();
}
function wrapText(text, maxW) { const out = []; let cur = ''; for (const w of String(text).split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
function speech(x, y, text) {
  ctx.font = `17px ${FH}`; const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 300) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur);
  const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24, bh = lines.length * 22 + 14, bx = x - bw / 2, by = y - bh;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = INK; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 24 + i * 22)); ctx.textAlign = 'center';
}
function drawFoe(f) {
  const ink = f.flash > 0 ? PENCIL : INK2, cx = f.x + 12, g = f.gy;
  const pose = f.state === 'kneel' ? POSE.kneel() : f.state === 'wind' ? POSE.wind() : f.state === 'swing' ? POSE.strike() : f.state === 'stun' || f.state === 'stag' ? POSE.hurt() : Math.abs(f.vx) > 10 ? POSE.run(clock * 8 + f.home) : POSE.idle(clock + f.home);
  const r = stick(cx, g, pose, f.face, ink, 3, { hollow: true, s: f.high ? 1.15 : 1 });
  if (f.high && f.state !== 'kneel') {
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.beginPath();
    if (f.state === 'wind') { ctx.moveTo(cx - f.face * 40, r.head.y - 14); ctx.lineTo(cx + f.face * 22, r.head.y - 20); }
    else if (f.state === 'swing') { ctx.moveTo(cx, g - 50); ctx.lineTo(cx + f.face * 64, g - 50); }
    else { ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + f.face * 10, r.hF.y - 44); }
    ctx.stroke();
    if (f.state === 'wind') { const hb = foeHitbox(f); ctx.save(); ctx.strokeStyle = RED; ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h); ctx.restore(); ctx.fillStyle = RED; ctx.font = `20px ${FD}`; ctx.textAlign = 'center'; ctx.fillText('!', r.head.x, r.head.y - 22); }
    if (f.state === 'swing') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, g - 56); ctx.lineTo(cx + f.face * 66, g - 56); ctx.moveTo(cx, g - 44); ctx.lineTo(cx + f.face * 66, g - 44); ctx.stroke(); }
  } else {
    if (f.state !== 'kneel') { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + f.face * 22, r.hF.y - 18); ctx.stroke(); }
    if (f.state === 'wind') { ctx.fillStyle = RED; ctx.font = `20px ${FD}`; ctx.textAlign = 'center'; ctx.fillText('!', r.head.x, r.head.y - 16); ctx.beginPath(); ctx.arc(r.hF.x + f.face * 22, r.hF.y - 18, 5, 0, Math.PI * 2); ctx.fill(); }
    if (f.state === 'swing') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + f.face * 20, f.y + 22, 30, f.face > 0 ? -1 : Math.PI - 1, f.face > 0 ? 1 : Math.PI + 1); ctx.stroke(); }
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(r.hB.x, r.hB.y); ctx.lineTo(r.hB.x + i * 4, r.hB.y + 7); } ctx.stroke();
  if (f.state === 'stag') { ctx.font = `12px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('OPEN', cx, f.y - 18); }
  if (f.state !== 'kneel' && f.hp < f.hpMax) { ctx.fillStyle = FAINT; ctx.fillRect(cx - 16, f.y - 10, 32, 4); ctx.fillStyle = INK; ctx.fillRect(cx - 16, f.y - 10, 32 * Math.max(0, f.hp) / f.hpMax, 4); }
}
function drawHorse(x, g, face, ph, moving, opt = {}) {
  ctx.save(); ctx.globalAlpha *= opt.alpha ?? 1; ctx.translate(x, g); ctx.scale(face, 1);
  const ink = opt.ink || INK, by = -42, graze = opt.graze;
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // legs: two pairs, each two segments
  const leg = (hx, off, far) => {
    const a = moving ? Math.sin(ph + off) * 0.7 : 0.05 * Math.sin(off), k = moving ? Math.max(0, Math.sin(ph + off + 1.2)) * 0.9 : 0.1;
    const kx = hx + Math.sin(a) * 15, ky = by + 8 + Math.cos(a) * 15, fx = kx + Math.sin(a - k) * 16, fy = ky + Math.cos(a - k) * 16;
    ctx.lineWidth = far ? 3 : 4; ctx.globalAlpha *= far ? 0.7 : 1; ctx.beginPath(); ctx.moveTo(hx, by + 6); ctx.lineTo(kx, ky); ctx.lineTo(fx, Math.min(fy, 0)); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(fx - 2, Math.min(fy, 0)); ctx.lineTo(fx + 3, Math.min(fy, 0)); ctx.stroke(); ctx.globalAlpha /= far ? 0.7 : 1;
  };
  leg(-20, Math.PI, true); leg(18, 0.6, true);
  // tail
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-30, by - 4); ctx.quadraticCurveTo(-44, by + (moving ? -6 : 4) + Math.sin(clock * 6) * 3, -46, by + 22); ctx.moveTo(-30, by - 2); ctx.quadraticCurveTo(-40, by + 8, -40, by + 24); ctx.stroke();
  // body
  ctx.beginPath(); ctx.ellipse(0, by, 32, 13, 0, 0, Math.PI * 2); ctx.fill();
  // neck and head
  const nx = graze ? 34 : 30, ny = graze ? by + 18 : by - 26, hx = graze ? 42 : 40, hy = graze ? by + 30 : by - 30;
  ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(20, by - 4); ctx.lineTo(nx, ny); ctx.stroke();
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(graze ? 1.3 : 0.55); ctx.beginPath(); ctx.ellipse(0, 0, 12, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(hx - 2, hy - (graze ? -2 : 3), 1.8, 0, Math.PI * 2); ctx.fill();
  if (!graze) { ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(nx - 4, ny - 4); ctx.lineTo(nx - 6, ny - 12); ctx.stroke(); }
  // mane
  ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 5; i++) { const t = i / 5, mx0 = 20 + (nx - 20) * t, my0 = by - 8 + (ny - by + 4) * t; ctx.moveTo(mx0 - 4, my0); ctx.lineTo(mx0 - 12 - (moving ? 6 : 0), my0 + 2 + Math.sin(clock * 8 + i) * 1.5); } ctx.stroke();
  leg(-16, Math.PI + 0.6, false); leg(22, 0, false);
  if (opt.saddle) { ctx.fillStyle = PAPER; ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(-2, by - 11, 13, 4, 0, Math.PI, 0); ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
function drawWeapon(p, r) {
  const wi = p.slots[p.slotIdx], id = WEAPONS[wi].id, hx = r.hF.x, hy = r.hF.y, act = p.atk && p.atk.t >= p.atk.a0 && p.atk.t <= p.atk.a1 + 0.05;
  const ang = p.plunge ? 1.45 : act ? 0 : p.charging ? -1.9 : p.crouch ? -0.25 : p.mount ? -0.8 : -1.2;
  const blade = (x, y, len, a, lw, guard) => { ctx.save(); ctx.translate(x, y); ctx.scale(p.face, 1); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke(); if (guard) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -5); ctx.lineTo(4, 5); ctx.stroke(); } ctx.restore(); };
  if (id === 'blade') blade(hx, hy, 38, ang, 3, true);
  else if (id === 'mace') { ctx.save(); ctx.translate(hx, hy); ctx.scale(p.face, 1); ctx.rotate(ang); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(32, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  else if (id === 'spear') { const push = act ? 16 : 0, a = act ? 0 : p.charging ? -0.2 : ang; ctx.save(); ctx.translate(hx, hy); ctx.scale(p.face, 1); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16 + push - (p.charging ? 10 : 0), 0); ctx.lineTo(56 + push, 0); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(68 + push, 0); ctx.lineTo(54 + push, -5); ctx.lineTo(54 + push, 5); ctx.closePath(); ctx.fill(); ctx.restore(); }
  else if (id === 'staff') { const a = p.atk && p.atk.spin && act ? p.atk.t * 24 : act ? 0.15 : ang + 0.3; ctx.save(); ctx.translate(hx, hy); ctx.scale(p.face, 1); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(32, 0); ctx.stroke(); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(-27, 0); ctx.moveTo(27, 0); ctx.lineTo(32, 0); ctx.stroke(); ctx.restore(); }
  else if (id === 'daggers') { blade(hx, hy, 18, act ? 0.2 : ang + 0.6, 2.5, true); if (!p.torch.lit) blade(r.hB.x, r.hB.y, 16, act ? -0.4 : ang + 1.2, 2.5, true); }
  else if (id === 'bow' && !p.glide) {
    const ax = aimX() - hx, ayy = aimY() - hy, a = mouse.in ? Math.atan2(ayy, ax) : (p.face > 0 ? 0 : Math.PI), pull = p.charging ? p.charge / 0.7 : 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-4, 0, 22, -1.2, 1.2); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4 + Math.cos(-1.2) * 22, Math.sin(-1.2) * 22); ctx.lineTo(-10 - pull * 14, 0); ctx.lineTo(-4 + Math.cos(1.2) * 22, Math.sin(1.2) * 22); ctx.stroke();
    if (p.charging) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10 - pull * 14, 0); ctx.lineTo(20, 0); ctx.stroke(); }
    ctx.restore();
  }
  // swing marks
  if (act && !p.atk.bow) {
    const cx = p.x + p.w / 2, y0 = p.mount ? p.y + 38 : p.y + Math.min(24, p.h * 0.55), reach = p.atk.reach + (p.mount ? 18 : 0);
    ctx.strokeStyle = INK; ctx.lineWidth = p.atk.heavy ? 4 : 2;
    if (p.atk.thrust) { ctx.beginPath(); ctx.moveTo(cx + p.face * 20, y0 - 4); ctx.lineTo(cx + p.face * (p.w / 2 + reach), y0 - 4); ctx.moveTo(cx + p.face * 30, y0 + 2); ctx.lineTo(cx + p.face * (p.w / 2 + reach - 16), y0 + 2); ctx.stroke(); }
    else if (p.atk.both) { for (const d of [-1, 1]) { const a0 = d > 0 ? -1.1 : Math.PI - 1.1; ctx.beginPath(); ctx.arc(cx + d * 14, y0, reach * 0.7, a0, a0 + 2.2); ctx.stroke(); } }
    else { const a0 = p.face > 0 ? -1.1 : Math.PI - 1.1; ctx.beginPath(); ctx.arc(cx + p.face * 18, y0, reach * 0.7, a0, a0 + 2.2); ctx.stroke(); }
  }
}
function drawGarb(p, r) {
  const b = p.looks.build, G = p.garb;
  // body
  if (G.body === 'leather' || G.body === 'mail' || G.body === 'wrap') {
    const ax = r.hip.x, ay = r.hip.y, bx = r.sh.x, by = r.sh.y, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, wd = G.body === 'mail' ? 6 : G.body === 'leather' ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(ax + nx * wd, ay + ny * wd); ctx.lineTo(bx + nx * wd, by + ny * wd); ctx.lineTo(bx - nx * wd, by - ny * wd); ctx.lineTo(ax - nx * wd, ay - ny * wd); ctx.closePath();
    if (G.body === 'mail') { ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); ctx.save(); ctx.clip(); ctx.strokeStyle = INK2; ctx.lineWidth = 1; ctx.beginPath(); for (let k = -20; k < 20; k += 4) { ctx.moveTo(ax + k, ay - 20); ctx.lineTo(ax + k + 20, ay + 2); } ctx.stroke(); ctx.restore(); }
    else if (G.body === 'leather') { ctx.fillStyle = INK2; ctx.fill(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax + nx * wd + dx * 0.2, ay + ny * wd + dy * 0.2); ctx.lineTo(ax - nx * wd + dx * 0.2, ay - ny * wd + dy * 0.2); ctx.stroke(); }
    else { ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + nx * 2, by + ny * 2); ctx.lineTo(ax - nx * 2 + dx * 0.3, ay - ny * 2 + dy * 0.3); ctx.stroke(); }
  }
  // feet
  for (const f of [r.fF, r.fB]) { if (!f) continue;
    if (G.feet === 'boots') { ctx.strokeStyle = INK; ctx.lineWidth = b + 3; ctx.beginPath(); ctx.moveTo(f.x, f.y - 6); ctx.lineTo(f.x, f.y); ctx.lineTo(f.x + p.face * 4, f.y); ctx.stroke(); }
    if (G.feet === 'cleats') { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); for (const o of [-3, 0, 3]) { ctx.moveTo(f.x + o, f.y); ctx.lineTo(f.x + o, f.y + 3); } ctx.stroke(); }
  }
  // head
  const h = r.head, hr = r.hr, f = p.face;
  if (G.head === 'hat') { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x - 14, h.y - hr * 0.55); ctx.lineTo(h.x + 14, h.y - hr * 0.55); ctx.lineTo(h.x, h.y - hr * 2.1); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(h.x - 7, h.y - hr * 1.0); ctx.lineTo(h.x + 7, h.y - hr * 1.0); ctx.lineWidth = 1; ctx.stroke(); }
  if (G.head === 'helm') { ctx.fillStyle = INK2; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, hr + 2.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(h.x - hr - 1, h.y - 2); ctx.lineTo(h.x + hr + 1, h.y - 2); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, h.y - hr - 2); ctx.lineTo(h.x - f * 3, h.y - hr - 8); ctx.stroke(); }
  if (G.head === 'band') { ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x - hr, h.y - hr * 0.35); ctx.lineTo(h.x + hr, h.y - hr * 0.35); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x - f * hr, h.y - hr * 0.35); for (let i = 1; i <= 3; i++) ctx.lineTo(h.x - f * (hr + i * 5), h.y - hr * 0.35 + i * 2 + Math.sin(clock * 10 + i) * 1.5); ctx.stroke(); }
}
function drawPlayer() {
  const p = P; if (!p) return;
  if (p.inv > 0 && !p.dead && Math.floor(p.inv * 16) % 2 === 0) return;
  if (p.unseenT > 0) { ctx.save(); ctx.globalAlpha = 0.28; drawPlayerBody(p); ctx.restore(); if (Math.random() < 0.3) fx.push({ k: 'ink', x: (p.x + p.w / 2) + rnd(-10, 10), y: p.y + rnd(0, p.h), vx: rnd(-10, 10), vy: -rnd(10, 40), life: 0.6 }); return; }
  drawPlayerBody(p);
}
function drawPlayerBody(p) {
  const cx = (p.x + p.w / 2), feet = p.y + p.h;
  let pose, ay = feet;
  if (p.dead || p.hitT > 0) pose = POSE.hurt();
  else if (p.hang) pose = POSE.hang(clock);
  else if (p.climbT > 0) pose = POSE.crouch(0);
  else if (p.ladder) pose = POSE.climb(p.climbPh || 0);
  else if (p.rollT > 0) pose = POSE.roll();
  else if (p.healT > 0) pose = POSE.drink();
  else if (p.parryT > 0) pose = POSE.parry();
  else if (p.atk) pose = p.atk.t < p.atk.a0 ? POSE.wind() : POSE.strike();
  else if (p.charging) pose = POSE.wind();
  else if (p.plunge) pose = POSE.plunge();
  else if (p.inWater && !p.onG) { pose = POSE.swim(p.run); ay = p.y + 34; }
  else if (p.cling) pose = POSE.cling();
  else if (p.glide) pose = POSE.glide();
  else if (p.crouch) pose = POSE.crouch(Math.abs(p.vx) > 10 ? p.run : 0);
  else if (p.mount) pose = POSE.idle(clock);
  else if (!p.onG) pose = POSE.jump();
  else if (Math.abs(p.vx) > 20) pose = POSE.run(p.run);
  else pose = POSE.idle(clock);
  if (p.mount) { pose = Object.assign({}, pose, { lean: (pose.lean || 0) * 0.6 + (Math.abs(p.vx) > 300 ? 0.25 : 0.05), lF: [1.25, 0.15], lB: [1.0, 0.3] }); ay = feet - 57 + 13 + (Math.abs(p.vx) > 40 && p.onG ? Math.abs(Math.sin(p.run * 0.6)) * -3 : 0); }
  ctx.save(); if (p.dead) { ctx.translate(cx, feet); ctx.rotate(-p.face * Math.min(1, p.deadT * 2) * Math.PI / 2); ctx.translate(-cx, -feet); ctx.globalAlpha = Math.max(0.2, 1 - p.deadT * 0.5); }
  if (p.mount) drawHorse(cx, feet, p.face, p.run * 0.6, Math.abs(p.vx) > 25 && p.onG, { saddle: true, ink: p.hitT > 0 ? PENCIL : INK });
  if (p.shieldT > 0) { ctx.fillStyle = PAPER; const sx = cx + p.face * (p.mount ? 40 : 26) - 9; ctx.fillRect(sx, feet - 70, 18, 70); hatch(sx, feet - 70, 18, 70, 5); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(sx, feet - 70, 18, 70); }
  if (p.plunge) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(cx + i * 10, p.y - 10); ctx.lineTo(cx + i * 10, p.y - 40); } ctx.stroke(); }
  const robe = p.garb.body === 'robe' && p.rollT <= 0 && p.onG && !p.crouch && !p.inWater && !p.mount;
  const r = stick(p.mount ? cx - p.face * 6 : cx, ay, pose, p.face, INK, p.looks.build, { hair: p.garb.head === 'helm' || p.garb.head === 'hat' ? 0 : p.looks.hair, robe, eye: true });
  // soul mark: scarf
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(r.neck.x, r.neck.y + 2); for (let i = 1; i <= 4; i++) ctx.lineTo(r.neck.x - p.face * i * 6, r.neck.y + 2 + i * (p.glide ? 0.5 : p.mount && Math.abs(p.vx) > 200 ? 0.3 : 2.5) + Math.sin(clock * 12 + i) * 1.5); ctx.stroke();
  drawGarb(p, r);
  if (p.glide && !p.dead) { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r.hB.x - p.face * 6, r.hB.y); ctx.quadraticCurveTo(cx, r.head.y - 40, r.hF.x + p.face * 6, r.hF.y); ctx.quadraticCurveTo(cx, r.head.y - 22, r.hB.x - p.face * 6, r.hB.y); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, r.head.y - 30); ctx.lineTo(cx, r.head.y - 22); ctx.stroke(); }
  if (p.torch.lit && !p.dead) { const tx = r.hB.x, ty = r.hB.y; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx - p.face * 4, ty - 14); ctx.stroke(); const fl = 7 + Math.sin(clock * 15) * 2, fx0 = tx - p.face * 4, fy0 = ty - 15; ctx.fillStyle = PAPER; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(fx0, fy0 - fl * 1.6); ctx.quadraticCurveTo(fx0 + 6, fy0 - 2, fx0, fy0 + 1); ctx.quadraticCurveTo(fx0 - 6, fy0 - 2, fx0, fy0 - fl * 1.6); ctx.fill(); ctx.stroke(); }
  if (!p.dead && !p.ladder && !p.hang && p.climbT <= 0 && !(p.inWater && !p.onG) && !p.glide) drawWeapon(p, r);
  if (!p.dead) {
    if (p.charging) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, p.mount ? p.y + 30 : p.y + p.h / 2, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.charge / 0.7); ctx.stroke(); }
    if (p.parryT > 0) { ctx.strokeStyle = INK; ctx.lineWidth = has('tortoise') ? 4 : 3; ctx.beginPath(); ctx.arc(cx + p.face * 14, p.y + 22, has('tortoise') ? 32 : 26, p.face > 0 ? -1.2 : Math.PI - 1.2, p.face > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); }
  }
  if (micMode === 'ptt' && pttHeld && !p.dead) { ctx.strokeStyle = micReady ? INK : PENCIL; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { const rr = 30 + ((clock * 50 + i * 18) % 36); ctx.globalAlpha = 1 - (rr - 30) / 36; ctx.beginPath(); ctx.arc(r.head.x, r.head.y, rr, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
  ctx.restore();
}
function hotbarInfo(i) {
  if (i < 4) {
    if (P.noMana) return { label: '—', on: false };
    const id = P.wordSlots[i]; if (!id) return { label: i < P.wordSlots.length ? 'EMPTY' : 'LOCKED', on: false };
    const w = SPELL(id), miss = needsMissing(w); return { label: w.short, sub: miss ? 'not now' : `${spellCost(w)} mana`, on: !miss && P.mana >= spellCost(w) };
  }
  if (i === 4) return { label: 'TORCH', sub: P.torch.lit ? `lit · ${Math.ceil(P.torch.fuel)}s` : `${Math.ceil(P.torch.fuel)}s`, on: P.torch.fuel > 0, lit: P.torch.lit };
  if (i === 5) return { label: 'KNIFE', sub: `× ${P.knives}`, on: P.knives > 0 };
  if (i === 6) return { label: 'LOTUS', sub: `${P.lotus}/${P.lotusMax}`, on: P.lotus > 0 };
  const hs = horse.state; return { label: 'BELL', sub: hs === 'wild' ? 'no mount' : hs === 'ridden' ? 'riding' : hs === 'fled' ? 'hurt' : 'call', on: hs !== 'wild' && hs !== 'fled', lit: hs === 'ridden' };
}
function drawHUD() {
  const p = P;
  const bar = (x, y, w, v, max, label, col = INK) => { ctx.font = `10px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 4); ctx.fillStyle = FAINT; ctx.fillRect(x, y, w, 10); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(v / max, 0, 1), 10); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 10); };
  const plate = (x, y, w, h) => { ctx.fillStyle = 'rgba(251,250,246,0.88)'; ctx.fillRect(x, y, w, h); };
  plate(10, 6, 378, 136); plate(W - 330, 6, 320, p.mount ? 92 : 74);
  bar(20, 26, 200, p.hp, p.hpMax, 'HEALTH');
  bar(20, 52, 200 * p.stMax / 100, p.st, p.stMax, 'STAMINA', INK2);
  if (p.manaMax) bar(20, 78, 200 * p.manaMax / 100, p.mana, p.manaMax, `MANA · ${life.birth.school || ''}`, PENCIL); else { ctx.font = `10px ${FD}`; ctx.fillStyle = PENCIL; ctx.fillText('NO MANA IN THIS LIFE', 20, 84); }
  ctx.font = `10px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText('PRANA', 300, 22);
  for (let i = 0; i < p.pranaMax; i++) { ctx.beginPath(); ctx.arc(308 + i * 22, 34, 7, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = INK; if (i < p.prana) { ctx.fillStyle = INK; ctx.fill(); } else ctx.stroke(); }
  ctx.fillStyle = INK; ctx.fillText(`LOTUS ${p.lotus}/${p.lotusMax}`, 300, 62); ctx.fillText(`SEEDS ${p.seeds}`, 300, 80);
  ctx.fillText('RELICS', 20, 106);
  for (let i = 0; i < 4; i++) { const bx = 20 + i * 32, by = 110; ctx.fillStyle = PAPER; ctx.fillRect(bx, by, 28, 28); ctx.strokeStyle = p.equip[i] ? INK : FAINT; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 28, 28); if (p.equip[i]) relicIcon(p.equip[i], bx + 14, by + 14, 0.85); }
  ctx.fillStyle = PENCIL; ctx.fillText(`${p.relics.size}/7 FOUND`, 156, 128);
  ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.fillText(`LIFE ${life.n} · LV ${levelOf()} · ${curW().name.toUpperCase()} ${TIER_NAME[tierOf(p.slots[p.slotIdx])]} (Q: ${WEAPONS[p.slots[1 - p.slotIdx]].name.toUpperCase()})`, W - 20, 22);
  ctx.fillStyle = PENCIL; ctx.fillText(micMode === 'off' ? 'MIC OFF · KEYS 1 TO 4' : micMode === 'ptt' ? (pttHeld ? (micReady ? 'LISTENING' : 'MIC STARTING…') : 'HOLD V TO SPEAK') : (recOn ? 'MIC ON · SPEAK A WORD' : 'MIC STARTING…'), W - 20, 40);
  ctx.fillText(`TAB: GEAR · M: MAP · ${isNight() ? 'NIGHT' : 'DAY'}`, W - 20, 56);
  const LD = loadNow(); ctx.fillStyle = LD.cls === 'over' ? RED : INK2; ctx.fillText(`LOAD ${LD.full ? 'PACK FULL' : LD.cls.toUpperCase()} · PACK ${Math.round(LD.pack)}/${P.packMax} · PROTECTION ${protNow()}%`, W - 20, 72);
  if (p.mount) { ctx.textAlign = 'left'; bar(W - 220, 84, 200, horse.hp, horse.hpMax, '', INK2); ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.fillText('HORSE', W - 226, 93); }
  // hotbar
  const bw = 54, gap = 6, total = 8 * bw + 7 * gap, x0 = (W - total) / 2, y0 = H - 50;
  plate(x0 - 6, y0 - 6, total + 12, 50);
  for (let i = 0; i < 8; i++) {
    const info = hotbarInfo(i), bx = x0 + i * (bw + gap);
    ctx.fillStyle = info.lit ? INK : PAPER; ctx.fillRect(bx, y0, bw, 38); ctx.strokeStyle = info.on ? INK : HATCH; ctx.lineWidth = 2; ctx.strokeRect(bx, y0, bw, 38);
    if (i === 3) { ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + bw + gap / 2, y0 + 4); ctx.lineTo(bx + bw + gap / 2, y0 + 34); ctx.stroke(); }
    ctx.textAlign = 'left'; ctx.font = `9px ${FD}`; ctx.fillStyle = info.lit ? PAPER : info.on ? INK : PENCIL; ctx.fillText(String(i + 1), bx + 4, y0 + 11);
    ctx.textAlign = 'center'; ctx.font = `${info.label.length > 6 ? 8 : 9}px ${FD}`; ctx.fillText(info.label, bx + bw / 2, y0 + 23);
    if (info.sub) { ctx.font = `9px ${FM}`; ctx.fillText(info.sub, bx + bw / 2, y0 + 34); }
  }
  if (zoneTag) { const a = clamp(Math.min(zoneTag.t * 1.5, (3.2 - zoneTag.t) * 4, 1), 0, 1); ctx.globalAlpha = a; ctx.textAlign = 'center'; const zx = 509; plate(zx - 115, 6, 230, 56); ctx.fillStyle = INK; ctx.font = `13px ${FD}`; ctx.fillText(zoneTag.name, zx, 28); ctx.font = `14px ${FH}`; ctx.fillStyle = INK2; ctx.fillText(zoneTag.sub, zx, 50); ctx.globalAlpha = 1; }
  if (banner) {
    const a = clamp(Math.min(banner.t * 2, 1), 0, 1); ctx.globalAlpha = a;
    ctx.font = `18px ${FH}`; const lines = wrapText(banner.sub, W - 120), bh = 70 + lines.length * 24, by = 196 - bh / 2;
    ctx.fillStyle = INK; ctx.fillRect(0, by, W, bh); ctx.fillStyle = PAPER; ctx.textAlign = 'center';
    let fs = 28; ctx.font = `${fs}px ${FD}`; while (ctx.measureText(banner.top).width > W - 80 && fs > 14) { fs -= 2; ctx.font = `${fs}px ${FD}`; }
    ctx.fillText(banner.top, W / 2, by + 44); ctx.font = `18px ${FH}`; lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 74 + i * 24)); ctx.globalAlpha = 1;
  }
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.beginPath(); for (let y = 40 - (camY * 0.5) % 34; y < H; y += 34) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); } ctx.stroke();
  if (!P) return;
  if (mode === 'map') { drawMap(); cv.style.cursor = mapHits.some(m => P.visited.has(m.i) && Math.hypot(mouse.x - m.x, mouse.y - m.y) < 18) ? 'pointer' : 'default'; return; }
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) * 0.6 : 0;
  ctx.save(); ctx.translate(sx, sy); drawWorld(); ctx.restore();
  if (isNight()) drawNight();
  drawDark(); drawOverDark();
  drawHUD();
  cv.style.cursor = mode === 'play' && mouse.in ? 'none' : mode === 'map' && mapHits.some(m => P.visited.has(m.i) && Math.hypot(mouse.x - m.x, mouse.y - m.y) < 18) ? 'pointer' : 'default';
  if (mode === 'play' && mouse.in) { const dkc = darkAt(mouse.x + camX, mouse.y + camY); ctx.strokeStyle = dkc ? PAPER : INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2); ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y); ctx.moveTo(mouse.x + 5, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y); ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y - 5); ctx.moveTo(mouse.x, mouse.y + 5); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke(); }
}
let last = performance.now(), frozen = false;
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (!frozen) update(dt); render();
  for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false;
  requestAnimationFrame(loop);
}
$('btnBegin').addEventListener('click', () => {
  setMicMode($('micStart').value);
  $('ovStart').hidden = true; newLife(makeBirth()); mode = 'play';
  if (micMode === 'always') startRec();
  tone(330, 660, 0.3, 'sine', 0.04);
});
fit(); requestAnimationFrame(loop);
window.__life = {
  get P() { return P; }, get soul() { return soul; }, get mode() { return mode; }, get foes() { return foes; }, get cam() { return [camX, camY]; }, get pots() { return pots; },
  SHRINES, CRUMBLES, FAKES, RELICS, castWord, WORDS, findWord, fall, setMicMode, step: dt => update(dt),
  put(x, y) { P.x = x; P.y = y - P.h; P.vx = 0; P.vy = 0; P.onG = false; P.dead = false; P.hang = null; P.ladder = null; P.climbT = 0; snapCam(); },
  equip(list) { list.forEach(id => P.relics.add(id)); P.equip = list.concat([null, null, null, null]).slice(0, 4); },
  noFoes() { foes.forEach(f => f.alive = false); },
  get horse() { return horse; }, cast: (id, pw) => castWord(SPELL(id), pw || 1), learnSpell: id => learnSpell(id), setNight: v => { nightOverride = v; }, get TEMPS() { return TEMPS; }, get RAINS() { return RAINS; }, get ALLY() { return ALLY; }, answerStone: t => answerStone(t), useStone: k => useStone(STONES.find(s => s.k === k)), travelTo: i => travelTo(i), packWeight: () => packWeight(), openContainer: (inv, n, h) => openContainer(inv, n, h), HOME, moveItem: (inv, sp, t) => moveItem(inv, sp, t), NODES, levelOf: () => levelOf(), openShrine: i => openShrine(i), openForge: () => openForge(), applyStats: f => applyStats(f), wMul: w => wMul(w), CHESTS, WEAPONS, GARB, loadNow: () => loadNow(), protNow: () => protNow(), mount: () => mount(), callHorse: f => callHorse(f),
  held, pressed, released, mouse, freeze(v) { frozen = v; },
  run(n, keys = {}, press = {}) { Object.assign(held, keys); for (let i = 0; i < n; i++) { if (i === 0) for (const k in press) { pressed[k] = true; if (press[k] === 'tap') held[k] = true; } update(1 / 60); for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false; if (i === 0) for (const k in press) if (press[k] === 'tap') { held[k] = false; } } for (const k in keys) held[k] = false; render(); },
};
})();
