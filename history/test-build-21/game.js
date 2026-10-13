(() => {
'use strict';
const $ = id => document.getElementById(id);
const W = 960, H = 540, GRAV = 2000, LW = 13700, LH = 1400, PH = 52, CH = 34, BREATH = 8, TORCH = 60, KNIVES = 5;
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
// the trial road, past the wall that is not there: three test bosses, each guarding a spell
S(9800, 760, 1650, 640); S(11450, 760, 130, 640, 'hot'); S(11580, 760, 540, 640); S(12120, 760, 130, 640, 'hot'); S(12250, 760, 1450, 640);
O(11640, 650, 120); O(11930, 650, 120); O(11785, 555, 120);
S(13600, 0, 100, 760);
const ARENAS = [
  { id: 'chief', l: 10250, r: 11050, gy: 760, name: 'THE GRASPING CHIEF', who: 'The Grasping Chief', sub: 'A lesser boss (test stand-in)', seeds: 250, gift: 'quake', giftHow: 'The Grasping Chief falls, and its slam is yours now.' },
  { id: 'wraith', l: 11450, r: 12250, gy: 760, name: 'THE EMBER WRAITH', who: 'The Ember Wraith', sub: 'A lesser boss (test stand-in)', seeds: 300, gift: 'wisps', giftHow: 'The Ember Wraith breaks apart, and its little fires follow you now.' },
  { id: 'masked', l: 12650, r: 13450, gy: 760, name: 'THE MASKED ONE', who: 'The Masked One', sub: 'A great boss (test stand-in)', seeds: 500, gift: 'inkstep', giftHow: 'The mask cracks. The way it moved through ink is yours now.' },
];
ARENAS.forEach(a => { a.fight = false; a.hit = false; a.gates = [{ x: a.l - 24, y: a.gy - 320, w: 24, h: 320 }, { x: a.r, y: a.gy - 320, w: 24, h: 320 }]; });

const SHRINES = [
  { x: 180, gy: 1000, name: 'Village shrine' }, { x: 2960, gy: 790, name: 'Plateau shrine' }, { x: 5900, gy: 1020, name: 'Pool shrine' },
  { x: 7300, gy: 560, name: 'Cave mouth shrine' }, { x: 9450, gy: 760, name: 'End shrine' },
  { x: 10140, gy: 760, name: 'Trial shrine' }, { x: 11250, gy: 760, name: 'Second trial shrine' }, { x: 12450, gy: 760, name: 'Last trial shrine' },
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
  [9500, 600, 'Or do they? The far wall looks thin.'],
  [10120, 512, 'The trial road. Each one ahead guards a gift.'],
  [10120, 546, 'Bosses do not beg, and they see through Unseen.'],
  [11300, 660, 'It flies. Arrows, knives and spells reach it. Rain puts out its fire.'],
  [12520, 660, 'It parries. Do not swing at its guard; a heavy blow breaks it.'],
];
const ZONES = [[0, 'THE VILLAGE', 'Rest, talk, and find your first relic'], [1300, 'THE LOW TUNNEL', 'Crawl'], [2140, 'THE PLANKS', 'Up, through and over'], [2780, 'THE PLATEAU', 'Ledges and a ladder'],
  [4350, 'MUD AND ICE', 'The ground changes how you move'], [5200, 'THE POOL', 'Breath matters'], [6040, 'THE CHIMNEY', 'Walls you can climb, with the right charm'], [6600, 'THE WIND GAP', 'Too far to jump'],
  [7500, 'THE DARK', 'Light, fire and false walls'], [8800, 'THE ARENA', 'The end of the proving grounds'], [9800, 'THE TRIAL ROAD', 'Three test bosses, each guarding a spell']];

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
let ctx = mainCtx;
// at night, living things are drawn on their own layer and given a pale moonlit edge so they stand out
const uLayer = document.createElement('canvas'), uctx = uLayer.getContext('2d');
let unitsPending = false;
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
const soul = { chants: new Set(['agni']), spells: new Set(['ignite', 'shield', 'restore']), ranks: {}, kills: 0, home: null, karma: 0, deeds: [], lives: [], memories: { gift: 0, spared: 0, slain: 0 }, bodies: [], soulRelics: new Set(), bossKills: {}, tablets: new Set(), realized: new Set(), understood: new Set(), dhyana: 0, bossFalls: 0, paths: { jnana: 0, bhakti: 0, karma: 0, dhyana: 0, alone: 0 }, pathLives: {}, pathStep: { jnana: 0, bhakti: 0, karma: 0, dhyana: 0, alone: 0 }, teacher: null, aloneClosed: false, arts: new Set() };
let life = null, P = null, foes = [], shots = [], fx = [], floaters = [], shades = [], drops = [], pots = [];
let shake = 0, hitstop = 0, clock = 0, banner = null, pendingDeath = 0, zoneTag = null;
const villager = { x: 560, gy: 1000, helped: false, talkT: 0, line: '' };
const has = id => P.equip.includes(id);
const pcx = () => P.x + P.w / 2;
const wears = id => P.garb.head === id || P.garb.body === id || P.garb.feet === id;
const inHand = id => WEAPONS[P.slots[P.slotIdx]].id === id;

function newLife(birth) {
  life = { n: soul.lives.length + 1, birth, deeds: [], end: null, start: Date.now(), bossDown: new Set(), intents: [], kills: 0 };
  soul.lives.push(life);
  const b = birth, noMana = b.tier === 0;
  const manaMax = [0, 40, 60, 80, 100][b.tier];
  const sr = [...soul.soulRelics];
  P = { x: SHRINES[0].x + 40, y: SHRINES[0].gy - PH, w: 22, h: PH, vx: 0, vy: 0, face: 1, onG: true, groundS: null, hp: 100, hpMax: 100, st: noMana ? 125 : 100, stMax: noMana ? 125 : 100, stDelay: 0,
    mana: manaMax, manaMax, prana: 3, pranaMax: 3, lotus: 3, lotusMax: 3, seeds: 0, slots: [0, 2], slotIdx: 0, swapT: 0, mT: 0, mDown: false, chargeSrc: null, bufLight: 0,
    chantSlots: noMana ? 5 : 3, prepared: new Set(CHANTS.filter(c => soul.chants.has(c.id)).slice(0, noMana ? 5 : 3).map(c => c.id)), scrolls: {}, arrows: { iron: 0, ember: 0, ink: 0 }, arrowKind: 'reed', wordSlots: noMana ? [null, null, null, null] : Array.from({ length: [0, 1, 2, 3, 4][b.tier] }, (_, i) => (WORDS.filter(w => soul.spells.has(w.id))[i] || {}).id || null),
    atk: null, charge: 0, charging: false, rollT: 0, rollIF: 0, parryT: 0, parryCd: 0, healT: 0, hitT: 0, inv: 0, shieldT: 0, riposte: 0, dead: false, deadT: 0,
    dmgMul: noMana ? 1.15 : 1, looks: b.looks, school: b.school, noMana, run: 0,
    stBase: noMana ? 125 : 100, visited: new Set([0]), weapons: new Set([0, 2]), stats: birthStats(b), stats0: birthStats(b), skills: new Set(), skillPending: null, wtier: {}, mats: { wood: 0, iron: 0, ink: 0, petal: 0, ember: 0 }, knivesMax: KNIVES, torchMax: TORCH, made: new Set(), manaTierMax: manaMax, garb: { head: null, body: 'wrap', feet: 'sandals' }, garbOwned: new Set(['wrap', 'sandals']), loadMax: 20, combo: 0, comboT: 0, rollV: 0, mount: false, trampleCd: 0,
    relics: new Set(sr), equip: sr.concat([null, null, null, null]).slice(0, 4), shrine: 0, safe: { x: SHRINES[0].x + 40, y: SHRINES[0].gy },
    jumpsLeft: 0, jumping: false, coy: 0, jbuf: 0, dropT: 0, grabCd: 0, kickT: 0, clingMem: 0, clingDir: 0, cling: 0, hang: null, climbT: 0, climb: null, ladder: null, glide: false, plunge: false, landT: 0,
    inWater: false, headUnder: false, breath: BREATH, burnT: 0, crouch: false, torch: { fuel: TORCH, lit: false }, knives: KNIVES, knifeCd: 0, zones: new Set(), zone: -1 };
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
  renderLives();
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
const DOG = { x: 880, gy: 1000 };
function feedDog() {
  if (life.fedDog) { floater(DOG.x, DOG.gy - 40, 'THE DOG SLEEPS, FED', PENCIL); return; }
  if (P.lotus <= 0) { floater(DOG.x, DOG.gy - 40, 'THE DOG WATCHES YOUR EMPTY HANDS', PENCIL); return; }
  P.lotus--; life.fedDog = true; const knew = (soul.dogLives || 0) > 0; soul.dogLives = (soul.dogLives || 0) + 1;
  deed('You gave your lotus to a hungry dog.', 1, { kind: 'gift' }); walk('bhakti', knew ? 2 : 1);
  floater(DOG.x, DOG.gy - 40, knew ? 'THE DOG KNOWS YOU, THOUGH YOU HAVE A NEW FACE' : 'THE DOG EATS, AND WAGS ITS TAIL', INK2);
}
function drawDog() {
  const x = DOG.x, g = DOG.gy, fed = life && life.fedDog, ph = clock * (fed ? 10 : 2);
  ctx.strokeStyle = INK2; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  if (fed) { ctx.ellipse(x, g - 7, 15, 6, 0, 0, Math.PI * 2); ctx.moveTo(x + 13, g - 9); ctx.lineTo(x + 20, g - 15); ctx.moveTo(x - 15, g - 7); ctx.lineTo(x - 22, g - 12 + Math.sin(ph) * 4); }
  else { ctx.moveTo(x - 14, g - 14); ctx.lineTo(x + 10, g - 15); ctx.moveTo(x - 12, g - 14); ctx.lineTo(x - 14, g); ctx.moveTo(x - 8, g - 14); ctx.lineTo(x - 7, g); ctx.moveTo(x + 6, g - 15); ctx.lineTo(x + 5, g); ctx.moveTo(x + 9, g - 15); ctx.lineTo(x + 11, g); ctx.moveTo(x + 10, g - 15); ctx.lineTo(x + 17, g - 22); ctx.moveTo(x - 14, g - 14); ctx.lineTo(x - 20, g - 9); for (let i = 0; i < 3; i++) { ctx.moveTo(x - 6 + i * 5, g - 15); ctx.lineTo(x - 7 + i * 5, g - 11); } }
  ctx.stroke(); ctx.fillStyle = INK2; ctx.beginPath(); ctx.ellipse(fed ? x + 21 : x + 19, fed ? g - 15 : g - 23, 5, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
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
function drawDebt() {
  if (!soul.debt || !life.debtGhost) return;
  const d = soul.debt, kind = d.kind; ctx.save(); ctx.globalAlpha = 0.45 + 0.15 * Math.sin(clock * 2);
  if (kind === 'pride' || kind === 'lie') stick(d.x, d.gy, POSE.idle(clock), -1, PENCIL, P.looks.build, { hair: P.looks.hair, robe: P.looks.robe });
  else if (kind === 'greed') { ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(d.x, d.gy - 40, 14, 20, 0, 0, Math.PI * 2); ctx.moveTo(d.x - 14, d.gy - 36); ctx.quadraticCurveTo(d.x - 26, d.gy - 10, d.x - 8, d.gy); ctx.moveTo(d.x + 14, d.gy - 36); ctx.quadraticCurveTo(d.x + 26, d.gy - 10, d.x + 8, d.gy); ctx.moveTo(d.x - 3, d.gy - 30); ctx.lineTo(d.x + 3, d.gy - 30); ctx.stroke(); }
  else stick(d.x, d.gy, POSE.kneel(), -1, PENCIL, 3, { hollow: true });
  ctx.restore();
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
const TEACHER = { x: 6025, gy: 1020 };
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
function drawTeacher() {
  const x = TEACHER.x, g = TEACHER.gy;
  // a reed mat and a begging bowl, in the shade of the overhang
  ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.fillStyle = PAPER; ctx.fillRect(x - 30, g - 4, 60, 4); ctx.strokeRect(x - 30, g - 4, 60, 4);
  ctx.beginPath(); for (let i = -24; i <= 24; i += 8) { ctx.moveTo(x + i, g - 4); ctx.lineTo(x + i, g); } ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 26 - 14, g - 6, 7, 0, Math.PI); ctx.fill(); ctx.stroke();
  stick(x, g - 3, POSE.sit(), -1, INK2, 3, { robe: true, hair: 3, s: 1.05 });
  if (soul.teacher) { ctx.fillStyle = INK2; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + 16 + i * 5, g - 9, 1.8, 0, Math.PI * 2); ctx.fill(); } }
}
/* the seat of clear seeing: inside the false wall near the End shrine, only for those who see clearly */
const SEAT = { x: 9780, gy: 760 };
const seatShown = () => pathAt('jnana') >= 3;
const nearSeat = () => seatShown() && Math.abs(pcx() - SEAT.x) < 34 && Math.abs(P.y + P.h - SEAT.gy) < 40;
function drawSeat() {
  const x = SEAT.x, g = SEAT.gy; ctx.strokeStyle = INK; ctx.fillStyle = PAPER; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(x, g - 6, 28, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI + i / 7 * Math.PI; ctx.moveTo(x + Math.cos(a) * 14, g - 12 + Math.sin(a) * 8); ctx.quadraticCurveTo(x + Math.cos(a) * 26, g - 14 + Math.sin(a) * 22, x + Math.cos(a) * 30, g - 10 + Math.sin(a) * 12); } ctx.stroke();
}

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
// a Sovereign alone feels foes beyond the edge of sight
function drawSenses() {
  if (wayOf() !== 'Sovereign' || !aloneNow() || P.dead) return;
  for (const f of foes) {
    if (!f.alive || f.hidden || f.state === 'kneel') continue;
    const fx0 = f.x + (f.w || 24) / 2 - camX, fy0 = f.y + (f.h || 52) / 2 - camY;
    if (fx0 > -10 && fx0 < W + 10 && fy0 > -10 && fy0 < H + 10) continue;
    const d = fx0 < 0 ? -fx0 : fx0 > W ? fx0 - W : 0, dv = fy0 < 0 ? -fy0 : fy0 > H ? fy0 - H : 0; if (d > 700 || dv > 400) continue;
    const x = clamp(fx0, 14, W - 14), y = clamp(fy0, 160, H - 90), a = 1 - Math.max(d, dv) / 760, s = f.boss ? 13 : 9;
    ctx.save(); ctx.globalAlpha = clamp(a, 0.35, 0.95); ctx.fillStyle = f.boss ? RED : INK; ctx.beginPath();
    if (fx0 < 0) { ctx.moveTo(x - 4, y); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y + s); }
    else if (fx0 > W) { ctx.moveTo(x + 4, y); ctx.lineTo(x - s, y - s); ctx.lineTo(x - s, y + s); }
    else if (fy0 < 0) { ctx.moveTo(x, y - 4); ctx.lineTo(x - s, y + s); ctx.lineTo(x + s, y + s); }
    else { ctx.moveTo(x, y + 4); ctx.lineTo(x - s, y - s); ctx.lineTo(x + s, y - s); }
    ctx.closePath(); ctx.strokeStyle = PAPER; ctx.lineWidth = 3; ctx.stroke(); ctx.fill(); ctx.restore();
  }
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
  for (const f of FAKES) if (overlap(P, f) && !f.found) { f.found = true; walk('jnana', 2); floater(cx, P.y - 30, 'THE WALL WAS NEVER THERE', INK2); tone(700, 300, 0.4, 'sine', 0.04); }
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
    if (!gone) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, g - 40); ctx.lineTo(x - 16, g - 60); ctx.moveTo(x, g - 50); ctx.lineTo(x + 14, g - 66); ctx.stroke(); ctx.fillStyle = tint(PAPER, '#bcd99c'); ctx.beginPath(); ctx.arc(x - 12, g - 72, 20, 0, Math.PI * 2); ctx.arc(x + 12, g - 76, 18, 0, Math.PI * 2); ctx.arc(x, g - 90, 18, 0, Math.PI * 2); ctx.fill(); ctx.save(); ctx.clip(); hatch(x - 34, g - 112, 68, 60, 5, tint(INK2, '#3e7a36'), 1); ctx.restore(); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x - 12, g - 72, 20, 0.8, 4.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 12, g - 76, 18, -1.6, 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x, g - 90, 18, 3.6, 6.0); ctx.stroke(); }
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
const STONES = [{ k: 'speak', x: 3570, gy: 1100 }, { k: 'moon', x: 6550, gy: 560 }, { k: 'sun', x: 2850, gy: 790 }];
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
function drawStone(st) {
  const x = st.x, g = st.gy, night = isNight();
  ctx.fillStyle = st.k === 'moon' && night && !soul.spells.has('tide') ? '#f3f0e7' : PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 18, g); ctx.lineTo(x - 15, g - 48); ctx.quadraticCurveTo(x, g - 62, x + 15, g - 48); ctx.lineTo(x + 18, g); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (st.k === 'sun') { const hot = sunAlt() >= 20 && !soul.spells.has('surya'); ctx.arc(x, g - 34, 6, 0, Math.PI * 2); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * 9, g - 34 + Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 13, g - 34 + Math.sin(a) * 13); } ctx.stroke(); if (hot) { ctx.strokeStyle = RED; ctx.beginPath(); ctx.arc(x, g - 34, 22 + Math.sin(clock * 3) * 3, 0, Math.PI * 2); ctx.stroke(); } }
  else if (st.k === 'moon') { ctx.arc(x, g - 34, 9, 0.6, Math.PI * 2 - 0.6); ctx.stroke(); if (night && !soul.spells.has('tide')) { ctx.strokeStyle = PENCIL; ctx.beginPath(); ctx.arc(x, g - 34, 22 + Math.sin(clock * 3) * 3, 0, Math.PI * 2); ctx.stroke(); } }
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
/* ---------- the real sky: the Sun, Moon and stars for the player's own place and time ---------- */
const HORIZON = 400;
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
function skyXY(b) { const a = b.alt * Math.PI / 180, z = b.az * Math.PI / 180; let x = -Math.cos(a) * Math.sin(z); if (SKY.lat < 0) x = -x; return { x: W / 2 + x * W * 0.47, y: HORIZON - Math.sin(a) * (HORIZON - 165) }; }
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
const dirOf = az => COMPASS[Math.round(((az % 360) + 360) % 360 / 45) % 8];
function localTimeText(d) { try { return new Intl.DateTimeFormat('en-GB', { timeZone: SKY.tz, hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(d); } catch (_) { return d.toUTCString().slice(5, 22); } }
const STARS = Array.from({ length: 90 }, (_, i) => { const r1 = Math.sin(i * 12.9898) * 43758.5453, r2 = Math.sin(i * 78.233) * 12543.123, r3 = Math.sin(i * 39.425) * 9871.77; return { r: 120 + (r1 - Math.floor(r1)) * 640, a: (r2 - Math.floor(r2)) * Math.PI * 2, b: 0.4 + (r3 - Math.floor(r3)) * 0.6, big: (r3 - Math.floor(r3)) > 0.88 }; });
const skyCv = document.createElement('canvas'), sctx = skyCv.getContext('2d');
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
function paintSky() {
  if (skyCv.width !== cv.width || skyCv.height !== cv.height) { skyCv.width = cv.width; skyCv.height = cv.height; }
  const k = skyState(), c = sctx, d = k.dark, south = SKY.lat >= 0;
  c.setTransform(scale, 0, 0, scale, 0, 0); c.clearRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, 0, HORIZON + 80); g.addColorStop(0, mix(tint('#fbfaf6', '#9fc4e6'), tint('#121211', '#0c1430'), d)); g.addColorStop(1, mix(tint('#fbfaf6', '#f1ede0'), tint('#3d3b35', '#2b3256'), d)); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // dawn and dusk glow on the Sun's side
  if (k.sun.alt > -14 && k.sun.alt < 12) { const sp = skyXY({ alt: 0, az: k.sun.az }), a = 0.55 * (1 - Math.abs(k.sun.alt + 1) / 13); const rg = c.createRadialGradient(sp.x, HORIZON, 10, sp.x, HORIZON, 520); rg.addColorStop(0, `rgba(${Math.round(214 + 26 * colorK)},${Math.round(196 - 70 * colorK)},${Math.round(170 - 90 * colorK)},${Math.max(0, a * (1 + 0.4 * colorK))})`); rg.addColorStop(1, 'rgba(214,196,170,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H); }
  // stars wheel around the hidden pole as the real sidereal time turns
  const sa = clamp((-4 - k.sun.alt) / 10, 0, 1);
  if (sa > 0) { const px = W / 2, py = HORIZON + Math.sin(Math.abs(SKY.lat) * Math.PI / 180) * (HORIZON - 46) + 60, ang = (south ? 1 : -1) * k.lst / 24 * Math.PI * 2;
    for (const st of STARS) { const x = px + Math.cos(st.a + ang) * st.r * 1.3, y = py + Math.sin(st.a + ang) * st.r; if (y > HORIZON - 4 || y < 0 || x < 0 || x > W) continue; c.globalAlpha = sa * st.b * (0.75 + 0.25 * Math.sin(clock * 2 + st.a * 7)); c.fillStyle = '#f3f0e7'; c.fillRect(x, y, st.big ? 2.5 : 1.6, st.big ? 2.5 : 1.6); }
    c.globalAlpha = 1; }
  // the Moon in its real phase
  if (k.moon.alt > -1) { const m = skyXY(k.moon), r = 17, lit = (k.waxing ? 1 : -1) * (south ? 1 : -1), kx = Math.cos(k.phase * Math.PI / 180) * r;
    c.globalAlpha = 0.45 + 0.55 * d; c.fillStyle = mix('#cfcbc0', '#3d3b35', d); c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fbfaf6'; c.beginPath(); c.arc(m.x, m.y, r, -Math.PI / 2, Math.PI / 2, lit < 0); c.fill();
    c.fillStyle = k.illum > 0.5 ? '#fbfaf6' : mix('#cfcbc0', '#3d3b35', d); c.beginPath(); c.ellipse(m.x, m.y, Math.abs(kx), r, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = mix('#8c897f', '#151513', 1 - d); c.lineWidth = 1.5; c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
  // the Sun
  if (k.sun.alt > -2) { const sp = skyXY(k.sun), r = k.sun.alt < 8 ? 24 : 19;
    c.strokeStyle = '#151513'; c.lineWidth = 2.2; c.fillStyle = tint('#fbfaf6', '#ffd36b'); c.beginPath(); c.arc(sp.x, sp.y, r, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + clock * 0.1; c.moveTo(sp.x + Math.cos(a) * (r + 6), sp.y + Math.sin(a) * (r + 6)); c.lineTo(sp.x + Math.cos(a) * (r + (i % 2 ? 12 : 17)), sp.y + Math.sin(a) * (r + (i % 2 ? 12 : 17))); } c.stroke(); }
  // where the directions are on the horizon
  c.font = `11px ${FD}`; c.textAlign = 'center'; c.fillStyle = mix('#8c897f', '#b9b6ac', d);
  const lbl = south ? [['E', 0.03], ['S', 0.5], ['W', 0.97]] : [['W', 0.03], ['N', 0.5], ['E', 0.97]];
  for (const [t, f] of lbl) c.fillText(t, W * f + (f < 0.1 ? 10 : f > 0.9 ? -10 : 0), HORIZON - 8);
}
function drawSkyBehind() {
  const k = skyState();
  if (k.dark > 0) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(21,21,19,${k.dark * 0.42})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  paintSky(); if (!skyCv.width || !skyCv.height) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-over'; ctx.drawImage(skyCv, 0, 0); ctx.restore();
}
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
const INSCRIPTIONS = [{ id: 'jala', x: 5590, gy: 1340 }, { id: 'vayu', x: 6255, gy: 560 }, { id: 'prithvi', x: 1480, gy: 1000 }, { id: 'akasha', x: 3840, gy: 1340 }, { id: 'deva', x: 8960, gy: 760 }, { id: 'asura', x: 9180, gy: 760 }, { id: 'preta', x: 3950, gy: 1100 }, { id: 'tiryak', x: 820, gy: 1000 }, { id: 'naraka', x: 7830, gy: 760 }];
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
function drawSummons() {
  for (const sm of SUMMONS) {
    if (sm.id === 'naraka') continue;
    ctx.save(); ctx.globalAlpha = 0.85;
    if (sm.id === 'deva') { ctx.strokeStyle = INK2; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + clock; ctx.moveTo(sm.x + Math.cos(a) * 16, sm.y - 34 + Math.sin(a) * 16); ctx.lineTo(sm.x + Math.cos(a) * 24, sm.y - 34 + Math.sin(a) * 24); } ctx.stroke(); stick(sm.x, sm.y + 10, POSE.glide(), sm.face, INK2, 3, { hollow: true }); }
    else if (sm.id === 'asura') { const r = stick(sm.x, sm.y + 34, sm.swing > 0 ? POSE.strike() : POSE.idle(clock), sm.face, INK2, 5, { s: 1.45, eye: true, eyeC: RED }); ctx.strokeStyle = INK2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + sm.face * 46, r.hF.y - (sm.swing > 0 ? 0 : 34)); ctx.stroke(); }
    else if (sm.id === 'preta') { ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sm.x, sm.y - 16, 9, 12, 0, 0, Math.PI * 2); ctx.moveTo(sm.x - 9, sm.y - 14); ctx.quadraticCurveTo(sm.x - 12, sm.y + 18, sm.x - 2 + Math.sin(clock * 6) * 4, sm.y + 26); ctx.moveTo(sm.x + 9, sm.y - 14); ctx.quadraticCurveTo(sm.x + 12, sm.y + 18, sm.x + 2 + Math.sin(clock * 6 + 1) * 4, sm.y + 26); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sm.x, sm.y - 12, 2.5, 0, Math.PI * 2); ctx.fill(); }
    else if (sm.id === 'tiryak') { ctx.translate(sm.x, sm.y + 10); ctx.scale(sm.face, 1); ctx.strokeStyle = INK2; ctx.fillStyle = PAPER; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 24, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(26, -6, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 8, -9); ctx.lineTo(i * 8 + 3, 9); } const ph = clock * 16; for (const [lx, o] of [[-16, 0], [-10, 2], [12, 1], [18, 3]]) { ctx.moveTo(lx, 8); ctx.lineTo(lx + Math.sin(ph + o) * 7, 20); } ctx.moveTo(-24, -2); ctx.quadraticCurveTo(-38, -14, -34, -24); ctx.stroke(); }
    ctx.restore();
  }
}
function drawInscription(q) {
  const x = q.x, g = q.gy, known = soul.chants.has(q.id);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.fillRect(x - 16, g - 40, 32, 40); hatch(x - 16, g - 40, 32, 40, 9); ctx.strokeRect(x - 16, g - 40, 32, 40);
  ctx.strokeStyle = known ? PENCIL : INK; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(x - 10, g - 32 + i * 8); ctx.lineTo(x + 10 - (i % 2) * 7, g - 32 + i * 8); } ctx.stroke();
  if (!known) { ctx.strokeStyle = PENCIL; ctx.beginPath(); ctx.arc(x, g - 20, 26 + Math.sin(clock * 2.5) * 2, 0, Math.PI * 2); ctx.stroke(); }
}
function readInscription(q) {
  const c = CHANT(q.id); banner = null; mode = 'stone'; clearHeld();
  $('gearIn').innerHTML = `<span class="eyebrow">A carved chant · Esc to leave</span><h2>${esc(c.name)}</h2><p class="hand">“${esc(c.line)}”</p><p>${esc(c.what)}${c.offer ? ` Offering: ${esc(costText(c.offer))}.` : ''}</p>
    <div class="row">${soul.chants.has(c.id) ? '<span class="note">You already know this chant.</span>' : '<button class="btn" id="learnChant" type="button">Learn it</button>'}</div><p class="note">Press C during play, choose the chant, then speak the line (hold V if you use push to talk). With the mic off, hold C instead.</p>`;
  $('ovGear').hidden = false;
  const b = $('learnChant'); if (b) b.addEventListener('click', () => { soul.chants.add(c.id); const room = P.prepared.size < P.chantSlots; if (room) P.prepared.add(c.id); closePanel(); SFX.relic(); banner = { t: 3.6, top: `A NEW CHANT: ${c.name.toUpperCase()}`, sub: `“${c.line}”. ${room ? 'Press C to chant it.' : `Your ${P.chantSlots} chant slots are full. Prepare it at a shrine (Tab, Chants).`}` }; });
}
function drawChantHUD() {
  if (!CHS) return;
  ctx.save(); ctx.textAlign = 'center';
  if (CHS.state === 'pick') {
    const list = CHS.list, h = 48 + Math.max(1, list.length) * 20, x0 = W / 2 - 220; ctx.fillStyle = 'rgba(251,250,246,0.95)'; ctx.fillRect(x0, 120, 440, h); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x0, 120, 440, h);
    ctx.font = `12px ${FD}`; ctx.fillStyle = INK; ctx.fillText(CHS.page === 'bless' ? 'BLESS YOUR WEAPON · C FOR SUMMONS' : 'SUMMON · C TO CLOSE', W / 2, 142);
    ctx.font = `15px ${FH}`; ctx.textAlign = 'left';
    if (!list.length) { ctx.fillStyle = PENCIL; ctx.fillText('You know none yet. Look for carved chants.', x0 + 20, 166); }
    list.forEach((c, i) => { const why = chantBlocked(c); ctx.fillStyle = why ? PENCIL : INK; ctx.fillText(`${i + 1}  ${c.name}${c.offer ? ` · offer ${costText(c.offer)}` : ''}${why && c.kind === 'summon' ? ' · not now' : ''}`, x0 + 20, 166 + i * 20); });
  } else {
    const ws = CHS.c.words, x0 = 120, w = W - 240; ctx.fillStyle = 'rgba(251,250,246,0.95)'; ctx.fillRect(x0, 118, w, 86); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x0, 118, w, 86);
    ctx.font = `11px ${FD}`; ctx.fillStyle = INK2; ctx.fillText(`${CHS.c.name.toUpperCase()}${CHS.shrine ? ' · AT A SHRINE, STRONGER' : ''}`, W / 2, 136);
    ctx.font = `21px ${FH}`; const parts = ws.map((t, i) => ({ t, on: CHS.matched[i] })); const total = parts.reduce((a, q) => a + ctx.measureText(q.t + ' ').width, 0); let x = W / 2 - total / 2; ctx.textAlign = 'left';
    for (const q of parts) { ctx.fillStyle = q.on ? INK : PENCIL; ctx.fillText(q.t, x, 166); if (q.on) { ctx.fillRect(x, 170, ctx.measureText(q.t).width, 2); } x += ctx.measureText(q.t + ' ').width; }
    ctx.textAlign = 'center'; ctx.font = `13px ${FH}`; ctx.fillStyle = INK2;
    ctx.fillText(CHS.hold > 0 ? 'Keep holding C (no voice: 85%)' : micMode === 'off' ? 'Mic is off: hold C for 3 seconds (85%)' : micMode === 'ptt' ? (pttHeld ? 'Listening… speak the line' : 'Hold V and speak the line · or hold C (85%)') : 'Speak the line · or hold C (85%)', W / 2, 192);
    ctx.fillStyle = FAINT; ctx.fillRect(x0 + 10, 198, w - 20, 3); ctx.fillStyle = INK; ctx.fillRect(x0 + 10, 198, (w - 20) * Math.max(0, 1 - CHS.t / CHS.limit), 3);
  }
  ctx.restore();
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
function drawMagic() {
  drawSummons();
  for (const q of INSCRIPTIONS) if (visible({ x: q.x - 30, y: q.gy - 60, w: 60, h: 60 })) drawInscription(q);
  for (const t of TEMPS) { if (!visible(t)) continue; const h = t.h * t.rise, y = t.y + t.h - h, fade = t.t < 1.5 && Math.floor(t.t * 8) % 2 === 0;
    ctx.globalAlpha = fade ? 0.5 : 1; ctx.fillStyle = PAPER; ctx.fillRect(t.x, y, t.w, h); hatch(t.x, y, t.w, h, 7, INK2, 1); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(t.x + 1.5, y + 1.5, t.w - 3, h - 3);
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t.x + 14, y + 20); ctx.lineTo(t.x + 24, y + 44); ctx.lineTo(t.x + 18, y + 70); ctx.stroke(); ctx.globalAlpha = 1; }
  for (const r of RAINS) { if (!visible({ x: r.x, y: camY, w: r.w, h: H })) continue; ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.4; ctx.globalAlpha = Math.min(1, r.t); ctx.beginPath();
    for (let i = 0; i < 60; i++) { const x = r.x + ((i * 53 + clock * 40) % r.w), y = camY + ((i * 97 + clock * 900) % (H + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 16); } ctx.stroke();
    ctx.fillStyle = 'rgba(140,137,127,0.12)'; ctx.fillRect(r.x, camY, r.w, H); ctx.globalAlpha = 1; }
  if (ALLY) { const a = ALLY; ctx.save(); ctx.globalAlpha = 0.55 + 0.15 * Math.sin(clock * 6); const pose = a.swing > 0 ? POSE.strike() : POSE.idle(clock); const r = stick(a.x, a.y + 26, pose, a.face, PENCIL, a.looks.build, { hair: a.looks.hair });
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + a.face * 30, r.hF.y - (a.swing > 0 ? 0 : 24)); ctx.stroke(); ctx.restore(); }
  for (const v of WAVES) { if (!visible({ x: v.x - 60, y: v.gy - 60, w: 120, h: 60 })) continue; const col = v.fire ? RED : v.hostile ? INK : INK2;
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { const x = v.x - v.dir * i * 11, h = v.h * (1 - i * 0.17) * (0.85 + 0.15 * Math.sin(clock * 30 + i)); ctx.beginPath(); ctx.moveTo(x - 7, v.gy); ctx.lineTo(x + v.dir * 3, v.gy - h); ctx.lineTo(x + 7, v.gy); ctx.closePath(); if (v.fire && i % 2) { ctx.fillStyle = INK; ctx.fill(); ctx.fillStyle = col; } else ctx.fill(); } }
  for (const w of WISPS) { const fl = 1 + 0.25 * Math.sin(clock * 20 + w.a * 5); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(w.x, w.y, 4.5 * fl, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(w.x - 6, w.y + 2); ctx.quadraticCurveTo(w.x, w.y - 16 * fl, w.x + 6, w.y + 2); ctx.arc(w.x, w.y + 1, 6, 0, Math.PI); ctx.stroke(); }
  if (P.shaniT > 0) { ctx.strokeStyle = INK2; ctx.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const rr = 60 + ((clock * 60 + i * 80) % 240); ctx.globalAlpha = 0.5 * (1 - (rr - 60) / 240); ctx.beginPath(); ctx.arc(pcx(), P.y + P.h / 2, rr, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
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
  life.ask = { id: a.id, name: a.who, t: 2.5 };
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
const HORSE_HOME = { x: 720, gy: 1000 };
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
const CHESTS = [
  { x: 380, gy: 1000, kind: 'garb', id: 'hat' }, { x: 925, gy: 900, kind: 'garb', id: 'leather' }, { x: 990, gy: 1000, kind: 'weapon', id: 1 },
  { x: 2400, gy: 810, kind: 'weapon', id: 3 }, { x: 3120, gy: 790, kind: 'weapon', id: 4 }, { x: 4220, gy: 1100, kind: 'weapon', id: 5 },
  { x: 4385, gy: 955, kind: 'garb', id: 'boots' }, { x: 4825, gy: 955, kind: 'garb', id: 'cleats' }, { x: 5790, gy: 1020, kind: 'garb', id: 'helm' },
  { x: 2200, gy: 720, kind: 'spell', id: 'gust' }, { x: 2050, gy: 1000, kind: 'spell', id: 'pillar' }, { x: 7178, gy: 560, kind: 'spell', id: 'monsoon' }, { x: 8700, gy: 760, kind: 'spell', id: 'embers' }, { x: 9670, gy: 760, kind: 'spell', id: 'starfall' },
  { x: 11150, gy: 760, kind: 'weapon', id: 6, sealed: true }, { x: 12330, gy: 760, kind: 'weapon', id: 7, sealed: true },
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
function drawHome() {
  const x = HOME.x, g = HOME.gy;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(x - 22, g - 26, 44, 26); hatch(x - 22, g - 26, 44, 26, 5); ctx.strokeRect(x - 22, g - 26, 44, 26);
  ctx.beginPath(); ctx.moveTo(x - 24, g - 26); ctx.quadraticCurveTo(x, g - 42, x + 24, g - 26); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, g - 14); for (let i = 1; i <= 4; i++) ctx.lineTo(x - 10 + i * 5, g - 14 + (i % 2 ? 3 : -2)); ctx.stroke();
  ctx.font = `11px ${FD}`; ctx.fillStyle = PENCIL; ctx.textAlign = 'center'; ctx.fillText('YOUR CHEST', x, g - 50);
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
  wakeAtShrine();
  banner = { t: 2.6, top: 'YOU FELL', sub: `${P.why} You wake at the ${SHRINES[P.shrine].name.toLowerCase()}. Prana left: ${P.prana}.` };
}
function wakeAtShrine() {
  const s = SHRINES[P.shrine];
  Object.assign(P, { x: s.x + 40, y: s.gy - PH, h: PH, w: 22, mount: false, vx: 0, vy: 0, hp: P.hpMax, st: P.stMax, mana: P.manaMax, lotus: P.lotusMax, breath: BREATH, dead: false, deadT: 0, atk: null, charging: false, rollT: 0, healT: 0, hitT: 0, inv: 1, shieldT: 0,
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
  const homeLine = invEmpty(soul.home) ? '' : ' What you left in your own chest by the village shrine waits for your next life.';
  const horseLine = horse.state !== 'wild' ? ' The horse you befriended goes back to the wild.' : '';
  const seen = life.deeds.filter(d => d.seen), unseen = life.deeds.filter(d => !d.seen).length;
  const deeds = seen.length ? seen.map(d => `<li>${esc(d.text)}</li>`).join('') : '<li>No one saw much of this life.</li>';
  const frags = fragmentsOf(), can = keepCount(); let chosen = [];
  const offer = n > 1 ? 'The wheel lets you choose your next life.' : k <= -2 ? 'The wheel chooses, and it does not choose gently.' : 'The wheel chooses your next life.';
  const relLine = (lost.length ? `Your relics (${lost.map(id => RELICS[id].name).join(', ')}) fall back to where you found them. ` : '') + (kept.length ? `The ${kept.map(id => RELICS[id].name).join(', ')} stays with your soul.` : '');
  const R = REALMS[lean];
  $('deathIn').innerHTML = `
    <span class="eyebrow" style="color:#b9b6ac">Prana spent · Life ${life.n} ends</span>
    <h2>${esc(P.why)}</h2>
    <p class="hand">The wheel weighs this life. ${esc(verdict(lk))}</p>
    <ul class="deeds">${deeds}</ul>
    ${unseen ? `<p class="hand">And ${unseen === 1 ? 'one thing' : unseen + ' things'} no one saw. The wheel saw ${unseen === 1 ? 'it' : 'them'}.</p>` : ''}
    <p class="hand">Your soul leans toward ${esc(R[0])}: ${esc(R[1])}${lean !== 'human' ? ' Those realms are not open yet; for now you are born human again.' : ''}</p>
    ${relLine ? `<p class="hand">${esc(relLine)}</p>` : ''}
    <p class="hand">Your level, skills and materials stay with this body. Weapons and garments you carried go back to the chests they came from.${esc(homeLine)}${esc(horseLine)}</p>
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
  [...$('deathIn').querySelectorAll('.card')].forEach(el => el.addEventListener('click', () => { soul.carry = chosen.map(i => frags[i]); $('ovDeath').hidden = true; newLife(births[+el.dataset.i]); mode = 'play'; if (micMode === 'always') startRec(); }));
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
toolBtn('tLived', () => { soul.testLived = true; soul.dhyana = Math.max(soul.dhyana || 0, 2); banner = { t: 3, top: 'THE LESSON, LIVED', sub: 'Test tool: the game now counts the first lesson as lived (as if you had been reborn, beaten a boss and fallen to one, and sat in stillness twice). One deep stillness at a shrine brings the question.' }; });
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
    <span>${l.deeds.filter(d => d.seen).length ? l.deeds.filter(d => d.seen).map(d => esc(d.text)).join(' ') : 'Nothing anyone saw yet.'}${l.deeds.some(d => !d.seen) ? ' And things no one saw.' : ''}</span>
    ${l.end ? `<span class="m">Ended: ${esc(l.end)}</span>` : ''}</div>`).join('');
}

/* ---------- gear (Tab) & map (M) ---------- */
function openGear() { mode = 'gear'; clearHeld(); renderGear(); $('ovGear').hidden = false; }
function closePanel() { $('ovGear').hidden = true; mode = 'play'; clearHeld(); }
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
  for (const n of NAVAGRAHA) { const nx = X(n.x), ny = Y(n.gy) - 10; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 9; i++) { const a2 = i / 9 * Math.PI * 2; ctx.moveTo(nx + Math.cos(a2) * 3, ny + Math.sin(a2) * 3); ctx.lineTo(nx + Math.cos(a2) * 7, ny + Math.sin(a2) * 7); } ctx.stroke(); }
  for (const t of TABLETS) if (!soul.tablets.has(t.id) && P.zones.size > 6) { ctx.fillStyle = PENCIL; ctx.fillRect(X(t.x) - 2, Y(t.gy) - 9, 4, 7); }
  for (const a of ARENAS) { const bx = X((a.l + a.r) / 2), by = Y(a.gy) - 14, down = life.bossDown.has(a.id); ctx.strokeStyle = down ? PENCIL : RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by - 7); ctx.lineTo(bx + 6, by); ctx.lineTo(bx, by + 7); ctx.lineTo(bx - 6, by); ctx.closePath(); ctx.stroke(); if (!down) { ctx.fillStyle = RED; ctx.fillRect(bx - 1.5, by - 1.5, 3, 3); } }
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
  ctx.fillText(`◇ boss (red: still waiting in this life) · ✳ the nine stones · Relics found: ${P.relics.size} of ${Object.keys(RELICS).length} · Chests opened: ${CHESTS.filter(chestOpen).length} of ${CHESTS.length}`, 30, ly + 22);
}

/* ---------- update ---------- */
function update(dt) {
  clock += dt;
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
  ctx.fillStyle = tint(PAPER, '#eadcbd'); ctx.fillRect(s.x, s.y, s.w, s.h); hatch(s.x, s.y, s.w, s.h, 13, tint(HATCH, '#bf9f6a'));
  if (colorK > 0 && !s.surf && !pointSolid(s.x + s.w / 2, s.y - 3)) { ctx.globalAlpha = colorK; ctx.fillStyle = '#6fa356'; ctx.fillRect(s.x, s.y, s.w, 6); ctx.globalAlpha = 1; }
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
  drawArenas();
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
  for (const b of soul.bodies) if (!b.taken && b.life !== life.n) { ctx.save(); ctx.globalAlpha = 0.85; const rb = stick(b.x, b.y, POSE.kneel(), 1, PENCIL, b.looks.build, { hair: b.looks.hair, robe: b.looks.robe });  if (soul.mark) drawMark(soul.mark, rb.neck.x + (rb.hip.x - rb.neck.x) * 0.32, rb.neck.y + (rb.hip.y - rb.neck.y) * 0.32, 0.6, PAPER); ctx.restore(); ctx.font = `15px ${FH}`; ctx.fillStyle = PENCIL; ctx.fillText('a body you once wore', b.x, b.y - 70); }
  for (const s of shades) if (!s.taken) { ctx.fillStyle = INK; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clock * 4); ctx.beginPath(); ctx.ellipse(s.x, s.y - 30, 10, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.font = `14px ${FH}`; ctx.fillStyle = INK2; ctx.fillText(`${s.seeds} seeds`, s.x, s.y - 66); }
  drawMagic();
  for (const n of NODES) if (n.k !== 'petal' && visible({ x: n.x - 40, y: n.gy - 120, w: 80, h: 120 })) drawNode(n);
  for (const f of FORGES) if (visible({ x: f.x - 40, y: f.gy - 80, w: 80, h: 80 })) drawForge(f);
  for (const st of STONES) if (visible({ x: st.x - 30, y: st.gy - 70, w: 60, h: 70 })) drawStone(st);
  for (const n of NAVAGRAHA) if (visible({ x: n.x - 130, y: n.gy - 150, w: 260, h: 150 })) drawStones(n);
  if (visible({ x: DOG.x - 40, y: DOG.gy - 40, w: 80, h: 40 })) drawDog();
  if (visible({ x: TEACHER.x - 60, y: TEACHER.gy - 90, w: 120, h: 100 })) drawTeacher();
  if (seatShown() && visible({ x: SEAT.x - 40, y: SEAT.gy - 50, w: 80, h: 50 })) drawSeat();
  if (soul.debt && life.debtGhost && visible({ x: soul.debt.x - 40, y: soul.debt.gy - 80, w: 80, h: 80 })) drawDebt();
  for (const t of TABLETS) if (visible({ x: t.x - 30, y: t.gy - 60, w: 60, h: 60 })) drawTablet(t);
  if (visible({ x: HOME.x - 40, y: HOME.gy - 60, w: 80, h: 60 })) drawHome();
  for (const c of CHESTS) if (visible({ x: c.x - 24, y: c.gy - 40, w: 48, h: 40 })) {
    const open = chestOpen(c); ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.fillRect(c.x - 17, c.gy - 20, 34, 20); hatch(c.x - 17, c.gy - 20, 34, 20, 6); ctx.strokeRect(c.x - 17, c.gy - 20, 34, 20);
    ctx.save(); ctx.translate(c.x - 17, c.gy - 20); if (open) ctx.rotate(-1.1); ctx.fillStyle = PAPER; ctx.fillRect(0, -8, 34, 8); ctx.strokeRect(0, -8, 34, 8); ctx.restore();
    if (!open) { ctx.fillStyle = INK; ctx.fillRect(c.x - 3, c.gy - 16, 6, 7); }
    if (c.sealed && !open) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.gy - 44, 9, 0, Math.PI * 2); ctx.stroke(); }
  }
  const nightUnits = skyState().dark > 0.25;
  if (nightUnits) { if (uLayer.width !== cv.width || uLayer.height !== cv.height) { uLayer.width = cv.width; uLayer.height = cv.height; } const m = ctx.getTransform(); uctx.setTransform(1, 0, 0, 1, 0, 0); uctx.clearRect(0, 0, uLayer.width, uLayer.height); uctx.setTransform(m); ctx = uctx; }
  // villager
  stick(villager.x, villager.gy, POSE.sit(), -1, INK2, 3, { hollow: true, s: 0.95 });
  if (!villager.helped && life.n === 1) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(villager.x + 4, villager.gy - 26, 4, 0, Math.PI * 2); ctx.fill(); }
  if (villager.talkT > 0) speech(villager.x, villager.gy - 110, villager.line);
  if (horse && horse.state !== 'ridden' && horse.state !== 'away' && !(horse.state === 'fled' && horse.fleeT <= 0)) {
    const fl = horse.state === 'fled', hx = fl ? horse.fleeX : horse.x;
    if (visible({ x: hx - 60, y: horse.gy - 90, w: 120, h: 90 })) drawHorse(hx, horse.gy, horse.face, clock * 14, fl, { alpha: fl ? horse.fleeT / 1.4 : horse.arriveT > 0 ? 1 - horse.arriveT / 0.8 : 1, graze: !fl && Math.sin(horse.graze * 0.5) > -0.3, saddle: horse.state !== 'wild', ink: horse.state === 'wild' ? INK2 : INK });
  }
  for (const f of foes) if (f.alive && visible(f, 80)) drawFoe(f);
  for (const s of shots) {
    if (s.windcut) { ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x - Math.sign(s.vx) * 10, s.y, 14, -1.1, 1.1); if (s.vx < 0) { ctx.beginPath(); ctx.arc(s.x + 10, s.y, 14, Math.PI - 1.1, Math.PI + 1.1); } ctx.stroke(); continue; }
    if (s.arrow || s.knife) { const a = s.knife ? s.spin : Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = s.knife ? 3 : 2.5; ctx.beginPath(); ctx.moveTo(s.knife ? -10 : -26, 0); ctx.lineTo(s.knife ? 8 : 0, 0); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.restore(); }
    if (s.arrow && s.kind && s.kind !== 'reed') { ctx.fillStyle = s.kind === 'ember' ? RED : INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.kind === 'iron' ? 3.5 : 3, 0, Math.PI * 2); ctx.fill(); if (s.kind === 'ember' && Math.random() < 0.5) fx.push({ k: 'flame', x: s.x, y: s.y, vx: 0, vy: -30, life: 0.2 }); if (s.kind === 'ink' && Math.random() < 0.5) fx.push({ k: 'ink', x: s.x, y: s.y, vx: 0, vy: 20, life: 0.3 }); }
    else { const sp = Math.hypot(s.vx, s.vy) || 1; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); for (let i = 1; i < 4; i++) { ctx.globalAlpha = 0.5 / i; ctx.beginPath(); ctx.arc(s.x - s.vx / sp * i * 12, s.y - s.vy / sp * i * 12, s.r * (1 - i * 0.18), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  drawPlayer();
  if (nightUnits) { ctx = mainCtx; unitsPending = true; }
  // water over the player
  for (const w of WATERS) if (visible(w)) {
    ctx.fillStyle = `rgba(${Math.round(140 - 90 * colorK)},${Math.round(137 + 3 * colorK)},${Math.round(127 + 80 * colorK)},${0.22 + 0.1 * colorK})`; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.2; ctx.beginPath(); for (let y = w.y + 30; y < w.y + w.h; y += 34) for (let x = w.x + ((y * 3) % 50); x < w.x + w.w - 20; x += 90) { ctx.moveTo(x, y); ctx.lineTo(x + 18, y); } ctx.stroke();
    if (w.top) { ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); for (let x = w.x; x <= w.x + w.w; x += 8) { const yy = w.y + Math.sin(x * 0.05 + clock * 3) * 2.5; if (pointSolid(x, w.y + 4) || pointSolid(x - 8, w.y + 4)) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
  }
  for (const n of NODES) if (n.k === 'petal' && visible({ x: n.x - 20, y: n.gy - 30, w: 40, h: 40 })) drawNode(n);
  // false walls hide what is behind them
  for (const f of FAKES) if (visible(f)) {
    const see = f.found || has('bead') || pathAt('jnana') >= 1;
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
    else if (f.k === 'beam') { const k = f.life / 0.6, top = camY - 20; ctx.fillStyle = 'rgba(251,250,246,0.9)'; ctx.fillRect(f.x - 28 * k - 6, top, 56 * k + 12, f.y - top); ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); for (const sx of [-1, 1]) { ctx.moveTo(f.x + sx * (28 * k + 6), top); ctx.lineTo(f.x + sx * (28 * k + 6), f.y); } for (let y = top + ((clock * 900) % 40); y < f.y; y += 40) { ctx.moveTo(f.x - 10, y); ctx.lineTo(f.x + 10, y + 14); } ctx.stroke(); ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(f.x, f.y, 40 * k + 10, 7, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (f.k === 'bolt') { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < f.pts.length - 1; i++) { const [ax, ay] = f.pts[i], [bx, by] = f.pts[i + 1]; ctx.moveTo(ax, ay); for (let j = 1; j <= 5; j++) { const t = j / 5; ctx.lineTo(ax + (bx - ax) * t + (j < 5 ? rnd(-10, 10) : 0), ay + (by - ay) * t + (j < 5 ? rnd(-10, 10) : 0)); } } ctx.stroke(); ctx.strokeStyle = PAPER; ctx.lineWidth = 1; ctx.stroke(); }
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
  { const q = nearInscription(); if (q) { ctx.fillStyle = INK2; ctx.fillText(soul.chants.has(q.id) ? 'E: read the chant again' : 'E: read the carved chant', q.x, q.gy - 70); } }
  if (Math.abs(pcx() - DOG.x) < 60 && Math.abs(P.y + P.h - DOG.gy) < 50 && !P.mount) { ctx.fillStyle = INK2; ctx.fillText(life.fedDog ? 'A dog, asleep and fed' : 'E: give the hungry dog your lotus', DOG.x, DOG.gy - 44); }
  if (nearDebt()) { const D = DEBTS[soul.debt.kind]; ctx.fillStyle = INK2; ctx.fillText(`${D.who}. ${D.ask} (E)`, soul.debt.x, soul.debt.gy - 96); }
  if (nearTeacher() && !P.mount) { ctx.fillStyle = INK2; ctx.fillText(soul.teacher ? 'E: go to your teacher' : 'E: sit with the teacher', TEACHER.x, TEACHER.gy - 66); }
  if (nearSeat() && !P.mount) { ctx.fillStyle = INK2; ctx.fillText('E: sit on the seat of clear seeing', SEAT.x, SEAT.gy - 70); }
  if (nearStones() && !P.mount) { const n = nearStones(); ctx.fillStyle = INK2; ctx.fillText('E: sit before the nine stones', n.x, n.gy - 158); }
  { const t = nearTablet(); if (t) { ctx.fillStyle = darkAt(t.x, t.gy - 60) ? '#b9b6ac' : INK2; ctx.fillText(soul.tablets.has(t.id) ? 'A tablet you have read' : 'E: read the tablet', t.x, t.gy - 60); } }
  { const st = nearStone(); if (st) { ctx.fillStyle = INK2; ctx.fillText(st.k === 'moon' ? 'E: touch the moon stone' : st.k === 'sun' ? 'E: touch the sun stone' : 'E: listen to the stone', st.x, st.gy - 80); } }
  if (nearForge() >= 0 && !P.mount) { const f = FORGES[nearForge()]; ctx.fillStyle = INK2; ctx.fillText('E: use the forge', f.x + 4, f.gy - 92); }
  if (Math.abs(pcx() - HOME.x) < 60 && Math.abs(P.y + P.h - HOME.gy) < 50) { ctx.fillStyle = INK2; ctx.fillText('E: your chest · it keeps things across lives', HOME.x, HOME.gy - 70); }
  for (const c of CHESTS) if (Math.abs(pcx() - c.x) < 60 && Math.abs(P.y + P.h - c.gy) < 50) { ctx.fillStyle = darkAt(c.x, c.gy - 50) ? '#b9b6ac' : INK2; ctx.fillText(c.sealed && !P.noMana && !chestOpen(c) ? 'Sealed: it opens only for a body born with no mana' : chestOpen(c) ? (invEmpty(c.inv) ? 'E: an empty chest' : 'E: look inside') : 'E: open', c.x, c.gy - 40); }
  if (Math.abs(P.x - villager.x) < 90 && Math.abs(P.y + P.h - villager.gy) < 60) { ctx.fillStyle = INK2; ctx.fillText('E: talk', villager.x, villager.gy - 92); }
  if (P.breath < BREATH && !P.dead) { const n = 8, left = Math.ceil(P.breath / BREATH * n); for (let i = 0; i < n; i++) { const bx = pcx() - (n - 1) * 5 + i * 10, by = P.y - 16; ctx.strokeStyle = left <= 2 ? RED : INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2); if (i < left) { ctx.fillStyle = PAPER; ctx.fill(); } ctx.stroke(); } }
  for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = `13px ${FD}`; ctx.fillStyle = darkAt(f.x, f.y) && f.c !== RED ? '#d8d5cb' : f.c; ctx.textAlign = 'center'; const hw = ctx.measureText(f.t).width / 2 + 12; ctx.fillText(f.t, clamp(f.x, camX + hw, camX + W - hw), f.y); }
  ctx.globalAlpha = 1; ctx.restore();
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
  if (dk.width && dk.height) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(dk, 0, 0); ctx.restore(); }
}
function wrapText(text, maxW) { const out = []; let cur = ''; for (const w of String(text).split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
function speech(x, y, text) {
  ctx.font = `17px ${FH}`; const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 300) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur);
  const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24, bh = lines.length * 22 + 14, bx = x - bw / 2, by = y - bh;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = INK; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 24 + i * 22)); ctx.textAlign = 'center';
}
function drawArenas() {
  for (const a of ARENAS) {
    if (!visible({ x: a.l - 60, y: a.gy - 340, w: a.r - a.l + 120, h: 340 })) continue;
    for (const g of a.gates) {
      if (a.fight) { ctx.fillStyle = 'rgba(21,21,19,0.82)'; ctx.fillRect(g.x, g.y, g.w, g.h); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 6; i++) { const yy = g.y + ((clock * 60 + i * 57) % g.h); ctx.moveTo(g.x + 4, yy); ctx.quadraticCurveTo(g.x + g.w / 2 + Math.sin(clock * 3 + i) * 6, yy - 14, g.x + g.w - 4, yy - 28); } ctx.stroke(); }
      else if (!life.bossDown.has(a.id)) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.save(); ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(g.x + g.w / 2, a.gy); ctx.lineTo(g.x + g.w / 2, a.gy - 150); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.fillRect(g.x - 4, a.gy - 34, g.w + 8, 34); hatch(g.x - 4, a.gy - 34, g.w + 8, 34, 6); ctx.strokeRect(g.x - 4, a.gy - 34, g.w + 8, 34);
    }
  }
}
function drawBoss(B) {
  const cx = B.x + B.w / 2, ink = B.flash > 0 ? PENCIL : B.state === 'dying' ? PENCIL : INK2, st = B.state;
  if (B.hidden) { ctx.fillStyle = INK; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(cx, B.y + B.h - 4, 18, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; return; }
  if (st === 'dying') ctx.globalAlpha = clamp(B.t / 1.6, 0.15, 1);
  const warn = (txt, y, col = RED) => { ctx.fillStyle = col; ctx.font = `20px ${FD}`; ctx.textAlign = 'center'; ctx.fillText(txt, cx, y); };
  if (B.boss === 'chief') {
    const pose = st === 'wind' || st === 'gwind' || st === 'crouch' ? POSE.wind() : st === 'swing' || st === 'gdash' || st === 'land' ? POSE.strike() : st === 'stag' || st === 'recover' ? POSE.hurt() : st === 'air' ? POSE.jump() : st === 'roar' ? POSE.parry() : Math.abs(B.vx) > 10 ? POSE.run(clock * 6) : POSE.idle(clock);
    const r = stick(cx, B.y + B.h, pose, B.face, ink, 5, { hollow: true, s: 1.75 });
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(r.head.x + i * 4.5, r.head.y - r.hr + 2); ctx.lineTo(r.head.x + i * 5.5, r.head.y - r.hr - 9 - (i === 0 ? 5 : 0)); } ctx.stroke();
    const club = st === 'swing' && B.cur && B.cur.heavy ? [r.hF.x + B.face * 6, r.hF.y - 4, r.hF.x + B.face * 70, r.hF.y + 30] : st === 'wind' ? [r.hF.x, r.hF.y, r.hF.x - B.face * 30, r.hF.y - 54] : [r.hF.x, r.hF.y, r.hF.x + B.face * 46, r.hF.y - 30];
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(club[0], club[1]); ctx.lineTo(club[2], club[3]); ctx.stroke(); ctx.beginPath(); ctx.arc(club[2], club[3], 7, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
    if (st === 'wind') warn(B.cur && B.cur.heavy ? '!!' : '!', r.head.y - 26);
    if (st === 'gwind') { warn('GRAB', r.head.y - 28); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, B.y + B.h / 2, 56 + Math.sin(clock * 20) * 4, 0, Math.PI * 2); ctx.stroke(); }
    if (st === 'crouch') { warn('↑', r.head.y - 26); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pcx() - 30, B.ar.gy + 4); ctx.lineTo(pcx() + 30, B.ar.gy + 4); ctx.stroke(); }
    if (st === 'swing') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + B.face * 30, B.y + B.h * 0.45, 52, B.face > 0 ? -1.2 : Math.PI - 1.2, B.face > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); }
  } else if (B.boss === 'wraith') {
    const cy = B.y + B.h / 2, fl = Math.sin(clock * 14) * 3, glow = st === 'owind' || st === 'dwind' || st === 'rwind';
    ctx.fillStyle = 'rgba(196,37,43,0.18)'; if (glow) { ctx.beginPath(); ctx.arc(cx, cy, 40 + Math.sin(clock * 24) * 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = PAPER; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 17, cy + 6); ctx.quadraticCurveTo(cx - 20, cy - 26, cx - 4 + fl, cy - 40); ctx.quadraticCurveTo(cx + 2, cy - 26, cx + 9, cy - 34 - fl); ctx.quadraticCurveTo(cx + 22, cy - 14, cx + 17, cy + 6);
    ctx.quadraticCurveTo(cx + 10, cy + 22, cx + B.face * -10, cy + 30 + fl); ctx.quadraticCurveTo(cx - 8, cy + 20, cx - 17, cy + 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    hatch(cx - 14, cy - 10, 28, 24, 7, HATCH, 1);
    ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx + B.face * 5 - 4, cy - 6, 3, 0, Math.PI * 2); ctx.arc(cx + B.face * 5 + 5, cy - 6, 3, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = i % 2 ? RED : INK; ctx.beginPath(); ctx.arc(cx + Math.sin(clock * 5 + i * 2) * 14, cy + 30 + i * 7 + fl, 3 - i * 0.6, 0, Math.PI * 2); ctx.fill(); }
    if (st === 'dwind') { ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(B.tx, B.ty); ctx.stroke(); ctx.restore(); warn('!', B.y - 14); }
    if (st === 'rwind') warn('↑', B.y - 14);
  } else {
    const pose = st === 'wind' || st === 'lwind' || st === 'counter' ? POSE.wind() : st === 'swing' || st === 'lunge' ? POSE.strike() : st === 'stag' || st === 'recover' ? POSE.hurt() : st === 'guard' ? POSE.parry() : Math.abs(B.vx) > 10 ? POSE.run(clock * 10) : POSE.idle(clock);
    const r = stick(cx, B.y + B.h, pose, B.face, ink, 3.5, { s: 1.08 });
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(r.head.x + B.face * 1.5, r.head.y, r.hr * 0.85, r.hr * 1.15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillRect(r.head.x + B.face * 1 - 4, r.head.y - 2, 3, 1.6); ctx.fillRect(r.head.x + B.face * 1 + 1.5, r.head.y - 2, 3, 1.6);
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath();
    if (st === 'guard') { ctx.moveTo(r.hF.x - B.face * 6, r.hF.y - 30); ctx.lineTo(r.hF.x + B.face * 8, r.hF.y + 22); }
    else if (st === 'swing' || st === 'lunge') { ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + B.face * 52, r.hF.y + 2); }
    else { ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + B.face * 38, r.hF.y - 24); }
    ctx.stroke();
    if (st === 'guard') { ctx.fillStyle = INK; ctx.font = `11px ${FD}`; ctx.textAlign = 'center'; ctx.fillText('GUARD', cx, r.head.y - 22); }
    if (st === 'wind' || st === 'lwind') warn('!', r.head.y - 18);
    if (st === 'counter') warn('!', r.head.y - 18);
    if (st === 'swing' || st === 'lunge') { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, B.y + B.h * 0.42); ctx.lineTo(cx + B.face * 70, B.y + B.h * 0.42); ctx.stroke(); }
  }
  if (st === 'stag') { ctx.font = `12px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('OPEN', cx, B.y - 26); }
  if (B.calmT > 0) { ctx.strokeStyle = INK2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, B.y - 14, 12, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawBossBar() {
  const B = bossNow(); if (!B) return;
  const w = 460, x = (W - w) / 2, y = H - 78;
  ctx.fillStyle = 'rgba(251,250,246,0.88)'; ctx.fillRect(x - 10, y - 22, w + 20, 34);
  ctx.font = `11px ${FD}`; ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.fillText(B.name, x, y - 7);
  ctx.textAlign = 'right'; ctx.fillStyle = PENCIL; ctx.fillText(B.ar.sub.toUpperCase(), x + w, y - 7);
  ctx.fillStyle = FAINT; ctx.fillRect(x, y, w, 8); ctx.fillStyle = RED; ctx.fillRect(x, y, w * clamp(B.hp / B.hpMax, 0, 1), 8);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 8);
  ctx.fillStyle = INK2; ctx.fillRect(x, y + 9, w * clamp(B.poise / B.poiseMax, 0, 1) * 0.3, 2);
}
function drawFoe(f) {
  if (f.boss) return drawBoss(f);
  const ink = f.flash > 0 ? PENCIL : INK2, cx = f.x + 12, g = f.gy;
  const pose = f.state === 'kneel' ? POSE.kneel() : f.state === 'wind' ? POSE.wind() : f.state === 'swing' ? POSE.strike() : f.state === 'stun' || f.state === 'stag' ? POSE.hurt() : Math.abs(f.vx) > 10 ? POSE.run(clock * 8 + f.home) : POSE.idle(clock + f.home);
  const r = f.mirror ? stick(cx, g, pose, f.face, f.flash > 0 ? HATCH : PENCIL, P.looks.build, { hair: P.looks.hair }) : stick(cx, g, pose, f.face, ink, 3, { hollow: true, s: f.high ? 1.15 : 1 });
  if (f.mirror && pathAt('jnana') >= 2) { ctx.font = `12px ${FD}`; ctx.fillStyle = RED; ctx.textAlign = 'center'; ctx.fillText('FALSE', cx, g - 82); ctx.strokeStyle = RED; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, g - 30, 40, 0, Math.PI * 2); ctx.stroke(); }
  if (f.calmT > 0 || f.peace) { ctx.strokeStyle = INK2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, f.y - 16, 10, 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
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
  else if (id === 'empty') { const a = act ? 0 : ang; blade(hx, hy, 42, a, 4.5, true); ctx.save(); ctx.translate(hx, hy); ctx.scale(p.face, 1); ctx.rotate(a); ctx.strokeStyle = PAPER; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(36, 0); ctx.stroke(); ctx.restore(); }
  else if (id === 'daggers') { blade(hx, hy, 18, act ? 0.2 : ang + 0.6, 2.5, true); if (!p.torch.lit) blade(r.hB.x, r.hB.y, 16, act ? -0.4 : ang + 1.2, 2.5, true); }
  else if ((id === 'bow' || id === 'longbow') && !p.glide) {
    const ax = aimX() - hx, ayy = aimY() - hy, a = mouse.in ? Math.atan2(ayy, ax) : (p.face > 0 ? 0 : Math.PI), LB = id === 'longbow', BR = LB ? 34 : 22, pull = p.charging ? p.charge / (LB ? 1 : 0.7) : 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-4, 0, BR, -1.2, 1.2); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4 + Math.cos(-1.2) * BR, Math.sin(-1.2) * BR); ctx.lineTo(-10 - pull * 14, 0); ctx.lineTo(-4 + Math.cos(1.2) * BR, Math.sin(1.2) * BR); ctx.stroke();
    if (p.charging) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10 - pull * 14, 0); ctx.lineTo(LB ? 30 : 20, 0); ctx.stroke(); if (LB && p.charge >= 0.95) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(32, 0, 3.5, 0, Math.PI * 2); ctx.fill(); } }
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
  if (p.ironT > 0 && !p.dead) { const cx = p.x + p.w / 2; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 26, p.y + p.h + 2); ctx.lineTo(cx + 26, p.y + p.h + 2); for (let i = -2; i <= 2; i++) { ctx.moveTo(cx + i * 11, p.y + p.h + 2); ctx.lineTo(cx + i * 13, p.y + p.h + 12); } ctx.stroke(); ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.strokeRect(cx - 22, p.y - 8, 44, p.h + 10); ctx.setLineDash([]); }
  if (p.inkT > 0) { ctx.save(); ctx.globalAlpha = 0.3; drawPlayerBody(p); ctx.restore(); return; }
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
  if (soul.mark && !p.dead) drawMark(soul.mark, r.neck.x + (r.hip.x - r.neck.x) * 0.32, r.neck.y + (r.hip.y - r.neck.y) * 0.32, 0.6, PAPER);
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
    if (P.noMana) { const id = P.wordSlots[i]; if (!id) return { label: 'EMPTY', on: false }; if (id.startsWith('art:')) { const A = ARTS[id.slice(4)], cd = (P.artCd || {})[id.slice(4)] || 0; return { label: A.short, sub: cd > 0 ? `${cd.toFixed(1)}s` : `${A.st} stamina`, on: cd <= 0 && P.st > 0 }; } const n = P.scrolls[id] || 0, w = SPELL(id); if (!n && P.spark && soul.spells.has(id)) return { label: w.short, sub: `${spellCost(w)} spark`, on: P.mana >= spellCost(w) && !needsMissing(w, true) }; return { label: w.short, sub: `scroll ×${n}`, on: n > 0 && !needsMissing(w, true) }; }
    const id = P.wordSlots[i]; if (!id) return { label: i < P.wordSlots.length ? 'EMPTY' : 'LOCKED', on: false };
    const w = SPELL(id), miss = needsMissing(w); return { label: w.short, sub: miss ? 'not now' : `${spellCost(w)} mana`, on: !miss && P.mana >= spellCost(w) };
  }
  if (i === 4) return { label: 'TORCH', sub: P.torch.lit ? `lit · ${Math.ceil(P.torch.fuel)}s` : `${Math.ceil(P.torch.fuel)}s`, on: P.torch.fuel > 0, lit: P.torch.lit };
  if (i === 5) return { label: 'KNIFE', sub: `× ${P.knives}`, on: P.knives > 0 };
  if (i === 6) return { label: 'LOTUS', sub: `${P.lotus}/${P.lotusMax}`, on: P.lotus > 0 };
  const hs = horse.state; return { label: 'BELL', sub: hs === 'wild' ? 'no mount' : hs === 'ridden' ? 'riding' : hs === 'fled' ? 'hurt' : 'call', on: hs !== 'wild' && hs !== 'fled', lit: hs === 'ridden' };
}
function drawHUD() {
  const p = P; drawSenses();
  const bar = (x, y, w, v, max, label, col = INK) => { ctx.font = `10px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 4); ctx.fillStyle = FAINT; ctx.fillRect(x, y, w, 10); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(v / max, 0, 1), 10); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 10); };
  const plate = (x, y, w, h) => { ctx.fillStyle = 'rgba(251,250,246,0.88)'; ctx.fillRect(x, y, w, h); };
  plate(10, 6, 378, 136);
  bar(20, 26, 200, p.hp, p.hpMax, 'HEALTH');
  bar(20, 52, 200 * p.stMax / 100, p.st, p.stMax, 'STAMINA', INK2);
  if (p.manaMax) bar(20, 78, 200 * p.manaMax / 100, p.mana, p.manaMax, p.spark ? 'MANA · A SPARK' : `MANA · ${life.birth.school || ''}`, PENCIL); else { ctx.font = `10px ${FD}`; ctx.fillStyle = PENCIL; ctx.fillText(`NO MANA · ${Object.values(p.scrolls).reduce((a, n) => a + n, 0)} SCROLLS`, 20, 84); }
  ctx.font = `10px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText('PRANA', 300, 22);
  for (let i = 0; i < p.pranaMax; i++) { ctx.beginPath(); ctx.arc(308 + i * 22, 34, 7, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = INK; if (i < p.prana) { ctx.fillStyle = INK; ctx.fill(); } else ctx.stroke(); }
  ctx.fillStyle = INK; ctx.fillText(`LOTUS ${p.lotus}/${p.lotusMax}`, 300, 62); ctx.fillText(`SEEDS ${p.seeds}`, 300, 80);
  ctx.fillText('RELICS', 20, 106);
  for (let i = 0; i < 4; i++) { const bx = 20 + i * 32, by = 110; ctx.fillStyle = PAPER; ctx.fillRect(bx, by, 28, 28); ctx.strokeStyle = p.equip[i] ? INK : FAINT; ctx.lineWidth = 2; ctx.strokeRect(bx, by, 28, 28); if (p.equip[i]) relicIcon(p.equip[i], bx + 14, by + 14, 0.85); }
  ctx.fillStyle = PENCIL; ctx.fillText(`${p.relics.size}/7 FOUND`, 156, 128);
  // right box: short lines, and the box grows to fit them so nothing spills out
  const LD = loadNow(), other = WEAPONS[p.slots[1 - p.slotIdx]].name.toUpperCase();
  const timers = [p.bless ? `${CHANT(p.bless.el).name.split(' ')[0].toUpperCase()} ${Math.ceil(p.bless.t)}s` : '', ...SUMMONS.map(sm => `${sm.id.toUpperCase()} ${Math.ceil(sm.t)}s`)].filter(Boolean);
  const RL = [
    [`${soul.name ? soul.name.toUpperCase() + ' · ' : ''}LIFE ${life.n} · LV ${levelOf()}`, INK],
    [`${curW().name.toUpperCase()} ${TIER_NAME[tierOf(p.slots[p.slotIdx])]} · Q: ${other}`, INK],
    [micMode === 'off' ? 'MIC OFF · KEYS 1 TO 4' : micMode === 'ptt' ? (pttHeld ? (micReady ? 'LISTENING' : 'MIC STARTING…') : 'HOLD V TO SPEAK') : (recOn ? 'MIC ON · SPEAK A WORD' : 'MIC STARTING…'), PENCIL],
    [`LOAD ${LD.full ? 'PACK FULL' : LD.cls.toUpperCase()} · PACK ${Math.round(LD.pack)}/${P.packMax}`, LD.cls === 'over' || LD.full ? RED : INK2],
    [`PROTECTION ${protNow()}% · ${isNight() ? 'NIGHT' : 'DAY'}`, INK2],
    [`${wayOf().toUpperCase()} · ${aloneNow() ? 'ALONE' : 'WITH ' + companions()}${moonRegen() > 1 && P.manaMax ? ' · FULL MOON' : moonStamina() > 1 ? ' · NEW MOON' : ''}`, (wayOf() === 'Sovereign' && aloneNow()) || (wayOf() === 'Sangha' && !aloneNow()) ? INK : PENCIL],
  ];
  if (curW().long) RL.push([`ARROWS: ${ARROWS[p.arrowKind].name.toUpperCase()}${p.arrowKind === 'reed' ? '' : ' ×' + p.arrows[p.arrowKind]} · R CHANGES`, INK]);
  if (timers.length) RL.push([timers.join(' · '), INK]);
  RL.push(['TAB · M · C: CHANT', PENCIL]);
  ctx.font = `10px ${FD}`;
  const rw = Math.max(240, ...RL.map(l => ctx.measureText(l[0]).width)) + 24, rh = 12 + RL.length * 16 + (p.mount ? 20 : 0);
  plate(W - 10 - rw, 6, rw, rh);
  ctx.textAlign = 'right'; RL.forEach(([t, c], i) => { ctx.fillStyle = c; ctx.fillText(t, W - 20, 22 + i * 16); });
  if (p.mount) { const yb = 14 + RL.length * 16; ctx.textAlign = 'left'; bar(W - 220, yb, 200, horse.hp, horse.hpMax, '', INK2); ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.fillText('HORSE', W - 226, yb + 9); }
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
    ctx.font = `18px ${FH}`; const lines = wrapText(banner.sub, W - 120), bh = 84 + lines.length * 24, by = 196 - bh / 2;
    ctx.fillStyle = INK; ctx.fillRect(0, by, W, bh); ctx.fillStyle = PAPER; ctx.textAlign = 'center';
    let fs = 28; ctx.font = `${fs}px ${FD}`; while (ctx.measureText(banner.top).width > W - 80 && fs > 14) { fs -= 2; ctx.font = `${fs}px ${FD}`; }
    ctx.fillText(banner.top, W / 2, by + 44); ctx.font = `18px ${FH}`; lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 74 + i * 24));
    if (SETTINGS.msg === 'stay') { ctx.font = `9px ${FD}`; ctx.fillStyle = '#b9b6ac'; ctx.fillText('ENTER OR CLICK TO CLOSE', W / 2, by + bh - 8); }
    else if (banner.t0) { ctx.fillStyle = '#5c5a53'; ctx.fillRect(W / 2 - 120, by + bh - 6, 240, 2); ctx.fillStyle = PAPER; ctx.fillRect(W / 2 - 120, by + bh - 6, 240 * clamp(banner.t / banner.t0, 0, 1), 2); }
    ctx.globalAlpha = 1;
  }
  drawBossBar();
  drawChantHUD();

}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H); if (!P || mode === 'map') { ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); }
  ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.beginPath(); for (let y = 40 - (camY * 0.5) % 34; y < H; y += 34) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); } ctx.stroke();
  if (!P) return;
  if (mode === 'meditate' && MED) { drawMed(); return; }
  if (mode === 'map') { drawMap(); cv.style.cursor = mapHits.some(m => P.visited.has(m.i) && Math.hypot(mouse.x - m.x, mouse.y - m.y) < 18) ? 'pointer' : 'default'; return; }
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) * 0.6 : 0;
  ctx.save(); ctx.translate(sx, sy); drawWorld(); ctx.restore();
  drawSkyBehind();
  if (unitsPending && (!uLayer.width || !uLayer.height)) unitsPending = false;
  if (unitsPending) { unitsPending = false; const g = mainCtx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.shadowColor = 'rgba(251,250,246,0.95)'; g.shadowBlur = 6 * scale; g.drawImage(uLayer, 0, 0); g.shadowBlur = 2 * scale; g.drawImage(uLayer, 0, 0); g.restore(); }
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
    else if (soul.dhyana >= 3 || soul.testLived) life.riddleAt = 2;
  }
}
function livedMind() { return !!soul.testLived || (soul.lives.length >= 2 && Object.values(soul.bossKills).some(v => v > 0) && (soul.bossFalls || 0) > 0 && (soul.dhyana || 0) >= 3); }
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
function drawMed() {
  const M = MED; ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const ph = medPhase(Math.min(M.t, MED_CYCLES * 16 - 0.001)), cx = W / 2, cy = 250, ideal = ph.i === 0 ? ph.k : ph.i === 1 ? 1 : ph.i === 2 ? 1 - ph.k : 0;
  const rough = 1 - M.calm / 100 + (M.stir > 0 ? 0.6 : 0);
  // the pond
  ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.4;
  for (let r = 0; r < 7; r++) { ctx.beginPath(); for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.06) { const rr = 40 + r * 34 + ((M.t * 18) % 34) + Math.sin(a * 7 + M.t * 3 + r) * rough * 9, x = cx + Math.cos(a) * rr * 1.9, y = 420 + Math.sin(a) * rr * 0.32; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.globalAlpha = 1 - r / 7; ctx.stroke(); }
  ctx.globalAlpha = 1;
  // the guide circle and your own breath
  ctx.strokeStyle = HATCH; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(cx, cy, 40 + ideal * 80, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, 40 + M.breath * 80, 0, Math.PI * 2); ctx.stroke();
  const old = ctx; stick(cx, 352, POSE.sit(), 1, INK, P.looks.build, { hair: P.looks.hair, robe: P.looks.robe, s: 1.4 });
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `20px ${FD}`; ctx.fillText(ph.p[1].toUpperCase(), cx, 92);
  ctx.font = `15px ${FH}`; ctx.fillStyle = INK2; ctx.fillText(ph.p[0] === 'in' || ph.p[0] === 'full' ? 'Hold Space' : 'Let go of Space', cx, 116);
  if (life.birth && life.birth.inward) { ctx.font = `13px ${FH}`; ctx.fillStyle = PENCIL; ctx.fillText(life.birth.inward > 1 ? 'This body is deeply turned inward: stillness comes very easily.' : 'This body is turned inward: stillness comes easily.', cx, 138); }
  // thoughts
  for (const th of M.thoughts) {
    const a = th.state === 'followed' ? 1 : clamp(Math.min(th.t, th.life - th.t), 0, 1), big = th.state === 'followed';
    ctx.globalAlpha = a * (big ? 1 : 0.8); ctx.fillStyle = big ? INK : 'rgba(21,21,19,0.12)'; ctx.beginPath(); ctx.ellipse(th.x, th.y, big ? 200 : 120, big ? 40 : 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = big ? PAPER : INK2; ctx.font = `${big ? 18 : 15}px ${FH}`; ctx.fillText(th.text, th.x, th.y + 5);
    if (th.state === 'drift' && th.t > 2 && th.t < 5.5) { ctx.font = `11px ${FD}`; ctx.fillStyle = RED; ctx.fillText('E: LOOK CLOSER', th.x, th.y + 46); }
    ctx.globalAlpha = 1;
  }
  // calm and time
  const bw = 300, bx = cx - bw / 2; ctx.fillStyle = FAINT; ctx.fillRect(bx, H - 52, bw, 8); ctx.fillStyle = INK; ctx.fillRect(bx, H - 52, bw * M.calm / 100, 8); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(bx, H - 52, bw, 8);
  ctx.fillStyle = PENCIL; ctx.fillRect(bx + bw * 0.7, H - 56, 2, 16);
  ctx.font = `10px ${FD}`; ctx.fillStyle = INK2; ctx.fillText(`CALM · BREATH ${Math.min(MED_CYCLES, ph.cyc + 1)} OF ${MED_CYCLES} · ESC TO STAND UP`, cx, H - 62);
  if (M.msg) { ctx.font = `16px ${FH}`; ctx.fillStyle = INK2; ctx.globalAlpha = clamp(M.msg.t, 0, 1); ctx.fillText(M.msg.text, cx, H - 82); ctx.globalAlpha = 1; }
}
/* the first color: when the mind is realized, the ink world slowly takes color */
const hexMix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const tint = (gray, col) => colorK > 0 ? hexMix(gray, col, colorK) : gray;

/* ---------- the nine stones (Phase 3): Navagraha readings ----------
   Two readings: the one who dreams (the player's real birth against the real sky of today, once a real day)
   and this body (the chart of the current life, once a life). Calculations are standard Vedic ones:
   tara bala, the Moon's transit from the natal Moon, the day lord; with tablets, Saturn, Jupiter and Rahu
   from the natal Moon (Sade Sati included) and the Vimshottari periods. The telling is parable, not prediction. */
const NAVAGRAHA = [{ x: 9935, gy: 760 }];
const TABLETS = [{ id: 'wanderers', x: 4600, gy: 1340, name: 'Tablet of the slow wanderers', what: 'Saturn, Jupiter, Rahu and Ketu: the long seasons.' }, { id: 'periods', x: 13540, gy: 760, name: 'Tablet of the periods', what: 'The Vimshottari periods: the seasons of a whole life.' }];
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
  on('stBody', () => { if (!canPay(BODY_COST)) return; const r = readBody(); if (!r) return; r.boon = fitBoon({ ...r.boon, src: 'body' }); pay(BODY_COST); life.bodyRead = r; P.boons = (P.boons || []).filter(b => b.src !== 'body'); P.boons.push({ src: 'body', ...r.boon }); stonesGlow(); renderStones('body'); });
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
const GLYPHS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
function drawStones(n) {
  ctx.save(); ctx.translate(n.x, n.gy); ctx.scale(1.35, 1.35); const x = 0, g = 0;
  // a small pillared roof over the nine
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-74, -14); ctx.lineTo(-74, -78); ctx.moveTo(74, -14); ctx.lineTo(74, -78); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(-92, -78); ctx.lineTo(0, -104); ctx.lineTo(92, -78); ctx.closePath(); ctx.fill(); ctx.stroke(); hatch(-60, -90, 120, 10, 6, HATCH, 1);
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.fillRect(x - 78, g - 14, 156, 14); hatch(x - 78, g - 14, 156, 14, 6); ctx.strokeRect(x - 78, g - 14, 156, 14);
  for (let i = 0; i < 9; i++) {
    const row = Math.floor(i / 3), col = i % 3, sx = x - 54 + col * 54 + (row - 1) * 8, sy = g - 14 - row * 4, h = 30 + (i === 4 ? 10 : 0);
    ctx.globalAlpha = row === 0 ? 1 : row === 1 ? 0.8 : 0.6;
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(sx - 9, sy); ctx.lineTo(sx - 8, sy - h + 6); ctx.quadraticCurveTo(sx, sy - h - 4, sx + 8, sy - h + 6); ctx.lineTo(sx + 9, sy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); const gy2 = sy - h / 2 - 2, gl = GLYPHS[i];
    if (gl === 'sun') { ctx.arc(sx, gy2, 4, 0, Math.PI * 2); ctx.moveTo(sx + 1, gy2); ctx.arc(sx, gy2, 1, 0, Math.PI * 2); }
    else if (gl === 'moon') { ctx.arc(sx, gy2, 4.5, 0.8, Math.PI * 2 - 0.8); }
    else if (gl === 'mars') { ctx.arc(sx - 1, gy2 + 1, 3.5, 0, Math.PI * 2); ctx.moveTo(sx + 2, gy2 - 2); ctx.lineTo(sx + 5, gy2 - 5); }
    else if (gl === 'mercury') { ctx.arc(sx, gy2, 3, 0, Math.PI * 2); ctx.moveTo(sx, gy2 + 3); ctx.lineTo(sx, gy2 + 7); }
    else if (gl === 'jupiter') { ctx.moveTo(sx - 4, gy2 - 4); ctx.quadraticCurveTo(sx, gy2 - 4, sx - 3, gy2 + 1); ctx.lineTo(sx + 4, gy2 + 1); ctx.moveTo(sx + 2, gy2 - 4); ctx.lineTo(sx + 2, gy2 + 5); }
    else if (gl === 'venus') { ctx.arc(sx, gy2 - 2, 3, 0, Math.PI * 2); ctx.moveTo(sx, gy2 + 1); ctx.lineTo(sx, gy2 + 6); ctx.moveTo(sx - 2.5, gy2 + 4); ctx.lineTo(sx + 2.5, gy2 + 4); }
    else if (gl === 'saturn') { ctx.moveTo(sx - 3, gy2 - 5); ctx.lineTo(sx - 3, gy2 + 4); ctx.quadraticCurveTo(sx + 4, gy2 - 1, sx + 2, gy2 + 5); ctx.moveTo(sx - 5, gy2 - 3); ctx.lineTo(sx - 1, gy2 - 3); }
    else if (gl === 'rahu') { ctx.arc(sx - 2.5, gy2, 2.5, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(sx + 2.5, gy2, 2.5, Math.PI * 1.5, Math.PI * 0.5, true); }
    else { ctx.arc(sx, gy2, 3.5, Math.PI, 0); ctx.moveTo(sx - 3.5, gy2); ctx.lineTo(sx - 3.5, gy2 + 4); ctx.moveTo(sx + 3.5, gy2); ctx.lineTo(sx + 3.5, gy2 + 4); }
    ctx.stroke(); ctx.lineWidth = 2.5; ctx.globalAlpha = 1;
  }
  if (READS.day === todayKey() && READS.soul) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, g - 50, 56 + Math.sin(clock * 2) * 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  ctx.restore();
}
function drawTablet(t) {
  if (soul.tablets.has(t.id)) ctx.globalAlpha = 0.5;
  const x = t.x, g = t.gy; ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - 16, g); ctx.lineTo(x - 13, g - 40); ctx.lineTo(x + 13, g - 40); ctx.lineTo(x + 16, g); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5, b = -Math.PI / 2 + (i + 1) * Math.PI * 4 / 5; ctx.moveTo(x + Math.cos(a) * 7, g - 26 + Math.sin(a) * 7); ctx.lineTo(x + Math.cos(b) * 7, g - 26 + Math.sin(b) * 7); } ctx.moveTo(x - 8, g - 12); ctx.lineTo(x + 8, g - 12); ctx.moveTo(x - 6, g - 8); ctx.lineTo(x + 6, g - 8); ctx.stroke();
  if (!soul.tablets.has(t.id)) { ctx.strokeStyle = PENCIL; ctx.beginPath(); ctx.arc(x, g - 26, 16 + Math.sin(clock * 3) * 2, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 1;
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
function drawMark(id, x, y, s = 1, col = INK, fill = null) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.fillStyle = fill || col; ctx.lineWidth = 1.6 / Math.max(0.5, s) * Math.min(1, s * 1.4); ctx.lineCap = 'round'; ctx.beginPath();
  if (id === 'lotus') { ctx.ellipse(0, -3, 2.6, 6, 0, 0, Math.PI * 2); ctx.moveTo(-1, 2); ctx.ellipse(-4.6, -0.6, 2.2, 5, -0.9, 0, Math.PI * 2); ctx.moveTo(6.6, -0.6); ctx.ellipse(4.6, -0.6, 2.2, 5, 0.9, 0, Math.PI * 2); ctx.moveTo(-7, 4); ctx.lineTo(7, 4); }
  else if (id === 'spiral') { for (let a = 0; a < Math.PI * 5; a += 0.2) { const r = 0.6 + a * 0.45; const px = Math.cos(a) * r, py = Math.sin(a) * r; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } }
  else if (id === 'eye') { ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -7, 8, 0); ctx.quadraticCurveTo(0, 7, -8, 0); ctx.moveTo(2.6, 0); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); }
  else if (id === 'crescent') { ctx.arc(0, 0, 7, 0.9, Math.PI * 2 - 0.9); ctx.arc(3.2, 0, 5, Math.PI * 2 - 1.15, 1.15, true); ctx.closePath(); }
  else if (id === 'flame') { ctx.moveTo(0, -8); ctx.quadraticCurveTo(7, -1, 4, 5); ctx.quadraticCurveTo(0, 9, -4, 5); ctx.quadraticCurveTo(-7, -1, 0, -8); ctx.moveTo(0, -1); ctx.quadraticCurveTo(2.5, 2, 0, 5); }
  else if (id === 'knot') { ctx.rect(-4.5, -4.5, 9, 9); ctx.moveTo(-4.5, 0); ctx.lineTo(-8, 0); ctx.moveTo(4.5, 0); ctx.lineTo(8, 0); ctx.moveTo(0, -4.5); ctx.lineTo(0, -8); ctx.moveTo(0, 4.5); ctx.lineTo(0, 8); ctx.moveTo(-4.5, -1.5); ctx.lineTo(4.5, -1.5); ctx.moveTo(-4.5, 1.5); ctx.lineTo(4.5, 1.5); }
  if (fill) ctx.fill(); ctx.stroke(); ctx.restore();
}
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
    el.querySelectorAll('[data-mk]').forEach(cv2 => { const g = cv2.getContext('2d'), old = ctx; ctx = g; g.setTransform(2, 0, 0, 2, 0, 0); drawMark(cv2.dataset.mk, 11, 11, 1, INK); ctx = old; });
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
function drawPreview() {
  if (mode !== 'create' || !CR || CR.step !== 2) return;
  const cv2 = $('crPrev'); if (!cv2) return;
  const g = cv2.getContext('2d'), old = ctx; ctx = g;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv2.width, cv2.height); g.setTransform(3, 0, 0, 3, 0, 0);
  g.strokeStyle = RULE; g.lineWidth = 0.5; g.beginPath(); for (let y = 12; y < 134; y += 12) { g.moveTo(0, y); g.lineTo(120, y); } g.stroke();
  g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.moveTo(10, 118); g.lineTo(110, 118); g.stroke();
  const t = performance.now() / 1000, r = stick(60, 118, POSE.idle(t), 1, INK, CR.looks.build, { hair: CR.looks.hair, robe: CR.looks.robe, eye: true, s: 1.9 });
  drawMark(CR.mark, r.neck.x + (r.hip.x - r.neck.x) * 0.32 + 0.5, r.neck.y + (r.hip.y - r.neck.y) * 0.32, 0.55, INK, PAPER);
  ctx.font = `9px ${FH}`; ctx.fillStyle = INK2; ctx.textAlign = 'center'; ctx.fillText(CR.name || 'Nameless', 60, 131);
  ctx = old; requestAnimationFrame(drawPreview);
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
  newLife(b); mode = 'play';
  banner = { t: 4.2, top: `LIFE 1${soul.name ? ' · ' + soul.name.toUpperCase() : ''}`, sub: b.real ? `Born ${b.local} in ${b.place}. ${b.lagna} rising, Moon in ${b.moon}. ${b.tier ? `${b.tierName} mana${b.school ? ', ' + b.school : ''}` : 'No mana: its own way'}.` : `Born ${b.local} in ${b.place} · ${b.lagna} lagna` };
  if (micMode === 'always') startRec();
  tone(330, 660, 0.3, 'sine', 0.04);
}
for (const id in HEARD) { const w = SPELL(id); if (w) for (const ph of HEARD[id]) if (!w.alias.includes(ph)) w.alias.push(ph); }
setTimeout(loadPlaces, 300);
$('setMsg').value = SETTINGS.msg; $('setMsg').addEventListener('change', e => { SETTINGS.msg = e.target.value; saveSettings(); e.target.blur(); });
$('btnMicCheck').addEventListener('click', e => { e.currentTarget.blur(); micCheck(); });
$('btnBegin').addEventListener('click', () => { if (MC) { try { MC.stop(); } catch (_) {} MC = null; }
  setMicMode($('micStart').value); $('ovStart').hidden = true; openCreate();
});
$('btnQuick').addEventListener('click', () => { if (MC) { try { MC.stop(); } catch (_) {} MC = null; }
  setMicMode($('micStart').value);
  $('ovStart').hidden = true; if (!soul.mark) soul.mark = (SELF && SELF.mark) || 'lotus'; newLife(makeBirth()); mode = 'play';
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
  get horse() { return horse; }, SCHOOLS, WAYS, wayOf: () => wayOf(), aloneNow: () => aloneNow(), companions: () => companions(), wayBoon: k => wayBoon(k), schoolBoon: k => schoolBoon(k), moonRegen: () => moonRegen(), moonStamina: () => moonStamina(), staminaGrowth: () => staminaGrowth(), set moonTest(v) { moonTest = v; }, manaGrowth: () => manaGrowth(), bodyHTML: () => bodyHTML(), finishMed: () => finishMed(), PATHS, PATH_STEPS, walk: (k, n) => walk(k, n), pathAt: k => pathAt(k), ARTS, useArt: a => useArt(a), TEACHER, TASKS, openTeacher: () => openTeacher(), SEAT, roadsHTML: () => roadsHTML(), roadBoon: k => roadBoon(k), keepCount: () => keepCount(), SETTINGS, get banner2() { return banner; }, inwardOf: c => inwardOf(c), get MED() { return MED; }, openMeditation: i => openMeditation(i), get colorK() { return colorK; }, livedMind: () => livedMind(), openRiddle: () => openRiddle(), RIDDLES, readSoul: t => readSoul(t), readBody: () => readBody(), soulChart: () => soulChart(), NAVAGRAHA, TABLETS, get READS() { return READS; }, boonV: k => boonV(k), applyDayBoon: () => applyDayBoon(), openStones: () => openStones(), E, realBirth: (d, t, c) => realBirth(d, t, c), findCities: q => findCities(q), placesCount: () => CITIES.length, get CR() { return CR; }, gainScroll: (id, n) => gainScroll(id, n), get shots() { return shots; }, get banner() { return banner; }, get BQ() { return BQ; }, openChestAt: x => openChest(CHESTS.find(c => c.x === x)), get CHESTS_() { return CHESTS; }, ARENAS, get WAVES() { return WAVES; }, get WISPS() { return WISPS; }, bossNow: () => bossNow(), hurtFoe: (f, d, h) => hurtFoe(f, d, !!h), hurtPlayer: (d) => hurtPlayer(d, { x: 0, w: 0 }, false), get life() { return life; }, lifeKarma: () => lifeKarma(), set autoAsk(v) { autoAsk = v; }, realmLean: () => realmLean(), DOG, nearDebt: () => nearDebt(), witnesses: t => witnesses(t), begChance: () => begChance(), spawnFoes: () => spawnFoes(), sunAlt: () => sunAlt(), frontFoe: (r, d) => frontFoe(r, d), get CHS() { return CHS; }, get SUMMONS() { return SUMMONS; }, CHANTS, chantHeard: t => chantHeard(t), matchWords: (a, b) => matchWords(a, b), readInscription: id => readInscription(INSCRIPTIONS.find(q => q.id === id)), SKY, skyState: () => skyState(), skyText: () => skyText(), skyFast: v => skyFast(v), cast: (id, pw) => castWord(SPELL(id), pw || 1), learnSpell: id => learnSpell(id), setNight: v => { nightOverride = v; }, get TEMPS() { return TEMPS; }, get RAINS() { return RAINS; }, get ALLY() { return ALLY; }, answerStone: t => answerStone(t), useStone: k => useStone(STONES.find(s => s.k === k)), travelTo: i => travelTo(i), packWeight: () => packWeight(), openContainer: (inv, n, h) => openContainer(inv, n, h), HOME, moveItem: (inv, sp, t) => moveItem(inv, sp, t), NODES, levelOf: () => levelOf(), openShrine: i => openShrine(i), openForge: () => openForge(), applyStats: f => applyStats(f), wMul: w => wMul(w), CHESTS, WEAPONS, GARB, loadNow: () => loadNow(), protNow: () => protNow(), mount: () => mount(), callHorse: f => callHorse(f),
  held, pressed, released, mouse, freeze(v) { frozen = v; },
  run(n, keys = {}, press = {}) { Object.assign(held, keys); for (let i = 0; i < n; i++) { if (i === 0) for (const k in press) { pressed[k] = true; if (press[k] === 'tap') held[k] = true; } update(1 / 60); for (const k in pressed) pressed[k] = false; for (const k in released) released[k] = false; if (i === 0) for (const k in press) if (press[k] === 'tap') { held[k] = false; } } for (const k in keys) held[k] = false; render(); },
};
})();
