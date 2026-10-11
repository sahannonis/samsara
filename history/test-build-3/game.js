(() => {
'use strict';
const $ = id => document.getElementById(id);
const W = 960, H = 540, GROUND = 460, LW = 3400, GRAV = 2000;
const INK = '#151513', INK2 = '#3d3b35', PENCIL = '#8c897f', PAPER = '#fbfaf6', RULE = '#ebe8de', FAINT = '#e2ded3', RED = '#c4252b', HATCH = '#cfcbc0';
const FD = '"Rubik Mono One","Arial Black",sans-serif', FH = '"Kalam","Comic Sans MS",cursive', FM = '"DM Mono",ui-monospace,monospace';
const PIT = { x: 1500, w: 130 };
const SHRINE_X = 180, HUT_X = 470, VILLAGER_X = 560, ARENA = { l: 2520, r: 3340 };
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* ---------- star engine ---------- */
const E = window.Astronomy && window.createStarEngine ? createStarEngine(window.Astronomy) : null;
if (!E) $('libNote').textContent = 'The star library did not load (no internet?). Births will be random instead of real charts.';
const PLACES = [
  ['Colombo', 6.932, 79.858, 'Asia/Colombo'], ['Kandy', 7.291, 80.636, 'Asia/Colombo'], ['Jaffna', 9.668, 80.007, 'Asia/Colombo'], ['Chennai', 13.083, 80.270, 'Asia/Kolkata'],
  ['Varanasi', 25.318, 82.974, 'Asia/Kolkata'], ['Kathmandu', 27.717, 85.324, 'Asia/Kathmandu'], ['Bangkok', 13.756, 100.502, 'Asia/Bangkok'], ['Kyoto', 35.012, 135.768, 'Asia/Tokyo'],
  ['Cairo', 30.044, 31.236, 'Africa/Cairo'], ['Nairobi', -1.286, 36.817, 'Africa/Nairobi'], ['London', 51.507, -0.128, 'Europe/London'], ['Toronto', 43.653, -79.383, 'America/Toronto'],
  ['Mexico City', 19.433, -99.133, 'America/Mexico_City'], ['Lima', -12.046, -77.043, 'America/Lima'], ['Sydney', -33.869, 151.209, 'Australia/Sydney'], ['Reykjavik', 64.147, -21.942, 'Atlantic/Reykjavik'],
];
const SCHOOL_PERK = { Agni: 'Ignite hits 25% harder', Jala: 'Restore heals 40% more', Vayu: 'Rolls cost 30% less stamina', Prithvi: 'Shield lasts twice as long', Akasha: 'Mana returns 50% faster' };
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
function perks(b) {
  const out = [];
  if (b.tier === 0) out.push('No mana: no battle words, but 25% more stamina and 15% more damage');
  else out.push(`${b.tierName} mana: ${[0, 40, 60, 80, 100][b.tier]} max`);
  if (b.school) out.push(SCHOOL_PERK[b.school]);
  if (b.style === 'Sovereign') out.push('Sovereign: 10% more damage alone');
  return out;
}

/* ---------- canvas & input ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let scale = 1;
function fit() { const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); scale = cv.width / W; }
addEventListener('resize', fit);
const KEYS = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'jump', ArrowUp: 'jump', Space: 'jump', KeyJ: 'light', KeyK: 'heavy', KeyL: 'roll', ShiftLeft: 'roll', KeyI: 'parry', KeyF: 'heal', KeyQ: 'swap', KeyE: 'use', Digit1: 'w1', Digit2: 'w2', Digit3: 'w3', KeyV: 'talk', ShiftRight: 'roll' };
const held = {}, pressed = {}, released = {};
let mode = 'start';
addEventListener('keydown', e => {
  if (e.target.tagName === 'SELECT') return;
  if (e.code === 'Tab') { e.preventDefault(); if (mode === 'play') openGear(); else if (mode === 'gear') closePanel(); return; }
  if (e.code === 'KeyM' && !e.repeat) { if (mode === 'play') { mode = 'map'; clearHeld(); } else if (mode === 'map') closePanel(); return; }
  if (e.code === 'Escape') { if (mode === 'gear' || mode === 'map') { closePanel(); return; } if (mode === 'play') { mode = 'pause'; $('ovPause').hidden = false; } else if (mode === 'pause') resume(); return; }
  const a = KEYS[e.code]; if (!a) return;
  if (mode === 'play') e.preventDefault();
  if (e.repeat) return;
  if (!held[a]) pressed[a] = true; held[a] = true;
});
addEventListener('keyup', e => { const a = KEYS[e.code]; if (!a) return; held[a] = false; released[a] = true; });
addEventListener('blur', () => { for (const k in held) held[k] = false; if (mode === 'play') { mode = 'pause'; $('ovPause').hidden = false; } });
function clearHeld() { for (const k in held) held[k] = false; }
function resume() { mode = 'play'; $('ovPause').hidden = true; clearHeld(); }
const mouse = { x: W / 2, y: H / 2, in: false };
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * W; mouse.y = (e.clientY - r.top) / r.height * H; mouse.in = true; });
cv.addEventListener('mouseleave', () => { mouse.in = false; });
cv.addEventListener('mousedown', e => {
  if (mode !== 'play') return;
  e.preventDefault();
  if (e.button === 0) { if (!held.mouseL) pressed.mouseL = true; held.mouseL = true; }
  if (e.button === 2) pressed.parry = true;
});
addEventListener('mouseup', e => { if (e.button === 0 && held.mouseL) { held.mouseL = false; released.mouseL = true; } });
$('frame').addEventListener('contextmenu', e => e.preventDefault());
const aimX = () => mouse.x + cam, aimY = () => mouse.y;
function faceAim() { if (mouse.in) P.face = aimX() > P.x + 11 ? 1 : -1; }
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
const SFX = { swing: () => tone(1400, 500, 0.07, 'triangle', 0.03), hit: () => tone(180, 60, 0.12, 'square', 0.05), heavy: () => tone(120, 40, 0.2, 'sawtooth', 0.06), roll: () => tone(600, 250, 0.12, 'triangle', 0.03), parry: () => { tone(1800, 1200, 0.08, 'square', 0.04); tone(2400, 1600, 0.12, 'square', 0.03, 0.05); }, hurt: () => tone(420, 110, 0.25, 'sawtooth', 0.06), warn: () => tone(880, 880, 0.06, 'square', 0.02), drink: () => tone(500, 900, 0.3, 'sine', 0.05), word: () => { tone(220, 60, 0.4, 'sawtooth', 0.05); tone(330, 990, 0.2, 'square', 0.03); }, slam: () => tone(90, 30, 0.45, 'sine', 0.22), death: () => tone(200, 40, 1.4, 'sawtooth', 0.06), rest: () => [392, 523, 659].forEach((f, i) => tone(f, f, 0.25, 'sine', 0.04, i * 0.12)) };

/* ---------- battle words & speech ---------- */
const WORDS = [
  { id: 'ignite', say: 'Ignite', key: 'w1', cost: 20, alias: ['ignite', 'ignites', 'ignited', 'ignight', 'ignyte', 'agnite', 'in night', 'ignore it'] },
  { id: 'shield', say: 'Shield', key: 'w2', cost: 25, alias: ['shield', 'shields', 'sheild', 'sealed', 'shelled', 'she yield', 'shiel', 'shilled'] },
  { id: 'restore', say: 'Restore', key: 'w3', cost: 30, alias: ['restore', 'restores', 'restored', 'restoring', 're store', 'the store', 'we store', 'distore'] },
];
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = Array.from({ length: n + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
const phon = w => w.replace(/ph/g, 'f').replace(/th/g, 't').replace(/ck/g, 'k').replace(/v/g, 'w').replace(/z/g, 's').replace(/[aeiouy]+/g, 'a').replace(/(.)\1+/g, '$1');
const sim = (a, b) => { const pa = phon(a), pb = phon(b); return 1 - lev(pa, pb) / Math.max(pa.length, pb.length, 1); };
function findWord(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const one = tokens[i], two = i + 1 < tokens.length ? one + ' ' + tokens[i + 1] : null;
    for (const w of WORDS) {
      if (w.alias.includes(one) || (two && w.alias.includes(two)) || sim(one.replace(/ /g, ''), w.id) >= 0.8) return { w, at: i };
    }
  }
  return null;
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let micMode = 'ptt', rec = null, recOn = false, pttHeld = false, lastWordAt = {}, voiceLines = [];
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
let micReady = false, pttRelease = -1e9;

/* ---------- state ---------- */
const soul = { karma: 0, deeds: [], lives: [], memories: { gift: 0, spared: 0, slain: 0, bossDown: false, hoard: null }, bodies: [] };
let life = null, P = null, foes = [], boss = null, shots = [], fx = [], floaters = [], shades = [];
let cam = 0, shake = 0, hitstop = 0, clock = 0, banner = null, pendingDeath = 0;
const villager = { x: VILLAGER_X, helped: false, talkT: 0, line: '' };

function newLife(birth) {
  life = { n: soul.lives.length + 1, birth, deeds: [], end: null, start: Date.now() };
  soul.lives.push(life);
  const b = birth, noMana = b.tier === 0;
  const manaMax = [0, 40, 60, 80, 100][b.tier];
  P = { x: SHRINE_X + 40, y: GROUND - 52, w: 22, h: 52, vx: 0, vy: 0, face: 1, onG: true, hp: 100, hpMax: 100, st: noMana ? 125 : 100, stMax: noMana ? 125 : 100, stDelay: 0,
    mana: manaMax, manaMax, prana: 3, pranaMax: 3, lotus: 3, lotusMax: 3, seeds: 0, slots: [0, 2], slotIdx: 0, swapT: 0, mT: 0, mDown: false, chargeSrc: null,
    wordSlots: WORDS.slice(0, [0, 1, 2, 3, 3][b.tier]).map(w => w.id),
    atk: null, charge: 0, charging: false, rollT: 0, rollIF: 0, parryT: 0, parryCd: 0, healT: 0, hitT: 0, inv: 0, shieldT: 0, riposte: 0, dead: false, deadT: 0,
    dmgMul: (noMana ? 1.15 : 1) * (b.style === 'Sovereign' ? 1.1 : 1), looks: b.looks, school: b.school, noMana, run: 0 };
  spawnFoes(); boss = soul.memories.bossDown ? null : makeBoss();
  cam = 0; banner = { t: 3.2, top: `LIFE ${life.n}`, sub: `Born ${b.local} in ${b.place} · ${b.lagna} lagna` };
  renderLives(); $('lifeLabel').textContent = `Life ${life.n}`;
}
function spawnFoes() {
  foes = [880, 1130, 1840, 2120, 2300].map(x => ({ x, y: GROUND - 52, w: 24, h: 52, vx: 0, face: -1, hp: 36, hpMax: 36, state: 'idle', t: rnd(0, 1), home: x, flash: 0, stag: 0, kneelT: 0, awayT: 0, alive: true, hitDone: false }));
}
function makeBoss() { return { x: 3040, y: GROUND - 130, w: 70, h: 130, vx: 0, vy: 0, face: -1, hp: 420, hpMax: 420, state: 'sleep', t: 0, flash: 0, stag: 0, phase: 1, hitDone: false, awake: false, kneel: false }; }

/* ---------- deeds & karma ---------- */
function deed(text, weight) { life.deeds.push({ text, weight }); soul.deeds.push({ text, weight, life: life.n }); soul.karma += weight; floater(P.x + 11, P.y - 30, weight > 0 ? 'The wheel notices.' : 'The wheel notices.', weight > 0 ? INK2 : RED); renderLives(); }

/* ---------- effects ---------- */
function floater(x, y, t, c = INK) { floaters.push({ x, y, t, c, life: 1.2 }); }
function burst(x, y, n, c = INK, spd = 260) { for (let i = 0; i < n; i++) fx.push({ k: 'dot', x, y, vx: rnd(-1, 1) * spd, vy: -rnd(40, spd * 1.2), life: rnd(0.3, 0.8), c }); }

/* ---------- player ---------- */
const WEAPONS = [
  { name: 'Blade', light: { dmg: 12, st: 14, dur: 0.30, a0: 0.08, a1: 0.17, reach: 50 }, heavy: { dmg: 30, st: 30, dur: 0.5, a0: 0.18, a1: 0.3, reach: 60 }, rollMul: 1 },
  { name: 'Mace', light: { dmg: 22, st: 24, dur: 0.52, a0: 0.24, a1: 0.34, reach: 58 }, heavy: { dmg: 52, st: 42, dur: 0.75, a0: 0.36, a1: 0.5, reach: 68 }, rollMul: 0.8 },
  { name: 'Bow', bow: true, light: { dmg: 10, st: 10, dur: 0.32, speed: 950 }, heavy: { dmg: 22, st: 22, dur: 0.4, speed: 1350 }, rollMul: 1.05 },
];
const WDESC = ['Fast cuts, short reach.', 'Slow, heavy blows. Rolls are slower.', 'Aim with the mouse. Hold to draw a stronger shot.'];
function curW() { return WEAPONS[P.slots[P.slotIdx]]; }
function shootArrow(spec, mult) {
  const sx = P.x + 11 + P.face * 14, sy = P.y + 18, dx = aimX() - sx, dy = aimY() - sy, d = Math.hypot(dx, dy) || 1;
  const v = spec.speed * (0.8 + 0.2 * mult);
  shots.push({ arrow: true, x: sx, y: sy, vx: dx / d * v, vy: dy / d * v, g: 520, life: 1.6, dmg: spec.dmg * mult * P.dmgMul, r: 6 });
  tone(900, 300, 0.08, 'triangle', 0.03);
}
function spend(n) { if (P.st <= 0) return false; P.st -= n; P.stDelay = 0.7; return true; }
function lightAttack(W8) {
  spend(W8.light.st);
  if (W8.bow) { shootArrow(W8.light, 1); P.atk = { t: 0, dur: W8.light.dur, a0: 99, a1: 99, bow: true, hit: new Set() }; }
  else { P.atk = Object.assign({ t: 0, hit: new Set(), heavy: false }, W8.light); SFX.swing(); }
}
function busy() { return P.atk || P.rollT > 0 || P.healT > 0 || P.hitT > 0 || P.swapT > 0 || P.dead; }
function updatePlayer(dt) {
  P.inv = Math.max(0, P.inv - dt); P.rollIF = Math.max(0, P.rollIF - dt); P.parryT = Math.max(0, P.parryT - dt); P.parryCd = Math.max(0, P.parryCd - dt);
  P.shieldT = Math.max(0, P.shieldT - dt); P.riposte = Math.max(0, P.riposte - dt); P.hitT = Math.max(0, P.hitT - dt); P.swapT = Math.max(0, P.swapT - dt);
  if (P.stDelay > 0) P.stDelay -= dt; else P.st = Math.min(P.stMax, P.st + 48 * dt);
  if (P.manaMax) P.mana = Math.min(P.manaMax, P.mana + (P.school === 'Akasha' ? 6 : 4) * dt);
  if (P.dead) { P.deadT += dt; P.vx *= 0.9; return; }
  const W8 = curW(), mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (held.mouseL) P.mT += dt;
  if (pressed.mouseL) { P.mDown = true; P.mT = 0; }
  if (released.mouseL) { if (P.mDown && !P.charging) P.bufLight = 0.3; P.mDown = false; }
  P.bufLight = Math.max(0, (P.bufLight || 0) - dt);
  // heal
  if (P.healT > 0) { P.healT -= dt; P.vx = 0; if (P.healT <= 0) { P.hp = Math.min(P.hpMax, P.hp + 40); floater(P.x + 11, P.y - 20, '+40'); } }
  // roll
  if (P.rollT > 0) { P.rollT -= dt; P.vx = P.face * 420 * W8.rollMul; }
  // attack
  if (P.atk) {
    const A = P.atk; A.t += dt;
    if (A.t >= A.a0 && A.t <= A.a1) doHits(A);
    if (A.t >= A.dur) P.atk = null;
    P.vx *= 0.8;
  }
  if (!busy()) {
    P.vx = mx * (P.charging ? 90 : 250); if (mx) P.face = mx;
    if (pressed.jump && P.onG) { P.vy = -720; P.onG = false; }
    if (pressed.roll && P.st > 0) { if (mx) P.face = mx; spend(22 * (P.school === 'Vayu' ? 0.7 : 1)); P.rollT = 0.36; P.rollIF = 0.26; P.charging = false; P.mDown = false; SFX.roll(); }
    else if ((pressed.light || P.bufLight > 0) && P.st > 0) { if (P.bufLight > 0) faceAim(); P.bufLight = 0; lightAttack(W8); }
    else if (pressed.heavy && P.st > 0) { P.charging = true; P.charge = 0; P.chargeSrc = 'key'; }
    else if (P.mDown && held.mouseL && P.mT > 0.2 && P.st > 0) { faceAim(); P.charging = true; P.charge = 0; P.chargeSrc = 'mouse'; P.mDown = false; }
    else if (pressed.parry && P.parryCd <= 0 && P.st > 0) { faceAim(); spend(10); P.parryT = 0.2; P.parryCd = 0.55; }
    else if (pressed.heal) { if (P.lotus > 0) { P.lotus--; P.healT = 1.0; SFX.drink(); } else floater(P.x + 11, P.y - 20, 'NO LOTUS', PENCIL); }
    else if (pressed.swap) { P.slotIdx = 1 - P.slotIdx; P.swapT = 0.4; floater(P.x + 11, P.y - 20, curW().name.toUpperCase()); }
    else if (pressed.use) use();
    ['w1', 'w2', 'w3'].forEach((k, i) => { if (pressed[k]) { const id = P.wordSlots[i]; if (id) castWord(WORDS.find(w => w.id === id), 0.8); else if (!P.noMana) floater(P.x + 11, P.y - 30, 'EMPTY SLOT', PENCIL); } });
  }
  if (P.charging) {
    P.charge = Math.min(0.7, P.charge + dt);
    if (P.chargeSrc === 'mouse') faceAim();
    const let_go = P.chargeSrc === 'mouse' ? !held.mouseL : !held.heavy;
    if (let_go || P.hitT > 0) {
      P.charging = false;
      if (P.hitT <= 0 && spend(W8.heavy.st)) {
        const m = 1 + P.charge / 0.7 * 0.5;
        if (W8.bow) { shootArrow(W8.heavy, m); P.atk = { t: 0, dur: W8.heavy.dur, a0: 99, a1: 99, bow: true, heavy: true, hit: new Set() }; }
        else { P.atk = Object.assign({ t: 0, hit: new Set(), heavy: true }, W8.heavy, { dmg: W8.heavy.dmg * m }); SFX.swing(); }
      }
    }
  }
  // physics
  P.vy = Math.min(P.vy + GRAV * dt, 1200);
  P.x += P.vx * dt; P.y += P.vy * dt;
  const lim = boss && boss.awake && boss.hp > 0 ? [ARENA.l, ARENA.r - P.w] : [20, LW - 20 - P.w];
  P.x = clamp(P.x, lim[0], lim[1]);
  const overPit = P.x + P.w / 2 > PIT.x && P.x + P.w / 2 < PIT.x + PIT.w;
  if (!overPit && P.y + P.h >= GROUND && P.y + P.h - P.vy * dt <= GROUND + 8) { P.y = GROUND - P.h; P.vy = 0; P.onG = true; } else if (P.y + P.h < GROUND - 1 || overPit) P.onG = false;
  if (P.y > H + 120) { P.hp = 0; fall('You fell into the dark.'); }
  if (Math.abs(P.vx) > 20 && P.onG) P.run += dt * Math.abs(P.vx) * 0.045;
  // pickups: shades of past falls
  for (const s of shades) if (!s.taken && Math.abs(P.x - s.x) < 30) { s.taken = true; P.seeds += s.seeds; floater(s.x, GROUND - 80, `+${s.seeds} seeds recovered`); tone(500, 1000, 0.2, 'sine', 0.04); }
  for (const b of soul.bodies) if (!b.taken && b.life !== life.n && Math.abs(P.x - b.x) < 30) { b.taken = true; P.seeds += b.seeds; if (b.lotus) { P.lotusMax = Math.min(5, P.lotusMax); } floater(b.x, GROUND - 90, `Your past body. ${b.seeds} seeds.`); tone(300, 600, 0.6, 'sine', 0.04); }
}
function doHits(A) {
  const box = { x: P.face > 0 ? P.x + P.w - 4 : P.x + 4 - A.reach, y: P.y + 6, w: A.reach, h: 34 };
  const targets = foes.filter(f => f.alive);
  if (boss && boss.awake && boss.hp > 0) targets.push(boss);
  for (const t of targets) {
    if (A.hit.has(t) || !overlap(box, t)) continue;
    A.hit.add(t);
    let dmg = A.dmg * P.dmgMul;
    if (P.riposte > 0 || t.stag > 0) { dmg *= 2; floater(t.x + t.w / 2, t.y - 20, 'RIPOSTE'); P.riposte = 0; }
    hurtFoe(t, dmg, A.heavy);
    hitstop = A.heavy ? 0.09 : 0.05; shake = A.heavy ? 8 : 4;
  }
}
function hurtFoe(t, dmg, heavy) {
  if (t === boss) {
    if (boss.kneel) return;
    boss.hp = Math.max(0, boss.hp - dmg); boss.flash = 0.12; burst(t.x + t.w / 2, t.y + 50, heavy ? 14 : 7);
    heavy ? SFX.heavy() : SFX.hit();
    if (boss.phase === 1 && boss.hp <= boss.hpMax * 0.5) { boss.phase = 2; floater(boss.x + 35, boss.y - 30, 'IT CLUTCHES ITS HOARD', RED); boss.state = 'roar'; boss.t = 1; }
    if (boss.hp <= 0) bossDown();
    return;
  }
  if (t.state === 'kneel') { t.alive = false; burst(t.x + 12, t.y + 20, 22); SFX.hit(); deed('You struck down one who begged for mercy.', -2); soul.memories.slain++; P.seeds += 10; return; }
  t.hp -= dmg; t.flash = 0.12; burst(t.x + 12, t.y + 20, 6); heavy ? SFX.heavy() : SFX.hit();
  t.vx = (t.x > P.x ? 1 : -1) * (heavy ? 260 : 120); t.state = 'stun'; t.t = heavy ? 0.6 : 0.3;
  if (t.hp <= 0) {
    if (t.hp > -10 && Math.random() < 0.55) { t.hp = 1; t.state = 'kneel'; t.kneelT = 0; t.awayT = 0; t.vx = 0; floater(t.x + 12, t.y - 20, 'IT BEGS', INK2); }
    else { t.alive = false; burst(t.x + 12, t.y + 20, 22); P.seeds += 25; floater(t.x + 12, t.y - 10, '+25 seeds'); }
  }
}
function hurtPlayer(d, src, melee) {
  if (P.dead || P.rollIF > 0 || P.inv > 0) { if (P.rollIF > 0) floater(P.x + 11, P.y - 20, 'DODGED', PENCIL); return 'dodge'; }
  if (melee && P.parryT > 0) { P.parryT = 0; SFX.parry(); floater(P.x + 11, P.y - 24, 'PARRY'); src.stag = src === boss ? 1.4 : 1.1; src.state = 'stag'; src.t = src.stag; P.riposte = 1.4; hitstop = 0.12; shake = 6; for (let i = 0; i < 10; i++) fx.push({ k: 'spark', x: P.x + 11 + P.face * 20, y: P.y + 20, vx: rnd(-300, 300), vy: rnd(-300, 50), life: 0.25 }); return 'parry'; }
  if (P.shieldT > 0) { P.shieldT = 0; floater(P.x + 11, P.y - 24, 'BLOCKED'); tone(1500, 900, 0.06, 'square', 0.03); burst(P.x + 11 + P.face * 26, P.y + 30, 10, PENCIL); return 'block'; }
  P.hp = Math.max(0, P.hp - d); P.hitT = 0.32; P.inv = 0.45; P.atk = null; P.charging = false; P.healT = 0;
  P.vx = (P.x + 11 < src.x + src.w / 2 ? -1 : 1) * 260; P.vy = -260; shake = 9; hitstop = 0.08; SFX.hurt();
  burst(P.x + 11, P.y + 20, 12, RED);
  if (P.hp <= 0) fall(src === boss ? 'The Hoarder struck you down.' : 'The Grasping struck you down.');
  return 'hit';
}
function castWord(w, power) {
  if (P.dead || mode !== 'play') return;
  if (P.noMana) { floater(P.x + 11, P.y - 30, 'NO MANA IN THIS LIFE', PENCIL); return; }
  if (!P.wordSlots.includes(w.id)) { floater(P.x + 11, P.y - 30, `${w.say.toUpperCase()} IS NOT IN YOUR SLOTS (TAB)`, PENCIL); return; }
  if (P.mana < w.cost) { floater(P.x + 11, P.y - 30, 'NOT ENOUGH MANA', PENCIL); return; }
  faceAim();
  if (P.hitT > 0 || P.rollT > 0) return;
  P.mana -= w.cost; SFX.word(); shake = 5;
  floater(P.x + 11, P.y - 34, `${w.say.toUpperCase()} · ${Math.round(power * 100)}%`);
  if (w.id === 'ignite') { const dmg = 28 * power * (P.school === 'Agni' ? 1.25 : 1) * P.dmgMul; const sx = P.x + 11 + P.face * 20, sy = P.y + 18; let dx = aimX() - sx, dy = aimY() - sy; if (!mouse.in) { dx = P.face; dy = 0; } const d = Math.hypot(dx, dy) || 1; shots.push({ x: sx, y: sy, vx: dx / d * 640, vy: dy / d * 640, life: 1.2, dmg, r: 10 }); }
  if (w.id === 'shield') { P.shieldT = (P.school === 'Prithvi' ? 6 : 3) * (power >= 1 ? 1 : 0.85); }
  if (w.id === 'restore') { const h = Math.round(26 * power * (P.school === 'Jala' ? 1.4 : 1)); P.hp = Math.min(P.hpMax, P.hp + h); floater(P.x + 11, P.y - 14, `+${h}`); for (let i = 0; i < 12; i++) fx.push({ k: 'leaf', x: P.x + rnd(-10, 30), y: P.y + rnd(0, 50), vx: 0, vy: -rnd(40, 90), life: 0.8 }); }
}
function use() {
  if (Math.abs(P.x - SHRINE_X) < 70) { rest(); return; }
  if (Math.abs(P.x - villager.x) < 70) {
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
    if (m.bossDown) lines.push(m.hoard === 'took' ? 'The Hoarder is gone. Whoever broke it took its whole hoard.' : 'The Hoarder is gone. Whoever broke it left the hoard where it lay. Strange.');
  }
  if (!lines.length) lines.push(villager.helped ? 'The road east is dangerous. The Hoarder waits at its end.' : 'Please… a lotus… I am hurt. (Press E to give one)');
  villager.idx = ((villager.idx || 0) + 1) % lines.length; villager.line = lines[villager.idx]; villager.talkT = 5;
}
function rest() {
  P.hp = P.hpMax; P.lotus = P.lotusMax; P.st = P.stMax; P.mana = P.manaMax; SFX.rest();
  spawnFoes(); shots = [];
  if (boss && boss.hp > 0) { boss = makeBoss(); }
  banner = { t: 2, top: 'RESTED', sub: 'Health and lotus restored. The Grasping return to the road.' };
}

/* ---------- foes ---------- */
function updateFoes(dt) {
  for (const f of foes) {
    if (!f.alive) continue;
    f.flash = Math.max(0, f.flash - dt);
    const dx = P.x + 11 - (f.x + 12), adx = Math.abs(dx);
    switch (f.state) {
      case 'kneel':
        f.kneelT += dt;
        if (adx > 160) f.awayT += dt;
        if (f.awayT > 2.2 || (f.kneelT > 3 && !P.atk)) { f.alive = false; life.spared = (life.spared || 0) + 1; if (life.spared <= 3) deed('You spared one who begged for mercy.', 1); soul.memories.spared++; for (let i = 0; i < 16; i++) fx.push({ k: 'ink', x: f.x + 12, y: f.y + rnd(0, 52), vx: rnd(-20, 20), vy: -rnd(20, 70), life: 1 }); floater(f.x + 12, f.y - 16, 'It walks into the ink.', INK2); }
        break;
      case 'stun': case 'stag': f.t -= dt; f.vx *= 0.9; if (f.t <= 0) { f.state = 'chase'; f.stag = 0; } break;
      case 'wind': f.t -= dt; f.vx = 0; if (f.t <= 0) { f.state = 'swing'; f.t = 0.16; f.hitDone = false; f.vx = f.face * 120; SFX.swing(); } break;
      case 'swing': {
        f.t -= dt; const hb = { x: f.face > 0 ? f.x + f.w : f.x - 44, y: f.y + 8, w: 44, h: 30 };
        if (!f.hitDone && overlap(hb, P)) { f.hitDone = true; hurtPlayer(14, f, true); }
        if (f.t <= 0 && f.state === 'swing') { f.state = 'cool'; f.t = 0.8; } break;
      }
      case 'cool': f.t -= dt; f.vx *= 0.85; if (f.t <= 0) f.state = 'chase'; break;
      default:
        if (!P.dead && adx < 420 && Math.abs(P.y - f.y) < 90) {
          f.state = 'chase'; f.face = Math.sign(dx) || f.face;
          if (adx < 52) { f.state = 'wind'; f.t = 0.5; SFX.warn(); } else f.vx = f.face * 95;
        } else { f.vx = 0; f.state = 'idle'; }
    }
    f.x += f.vx * dt;
    if (f.x + f.w / 2 > PIT.x - 10 && f.x + f.w / 2 < PIT.x + PIT.w + 10) f.x = f.home < PIT.x ? PIT.x - 10 - f.w / 2 : PIT.x + PIT.w + 10 - f.w / 2;
  }
}

/* ---------- the Hoarder ---------- */
function updateBoss(dt) {
  const b = boss; if (!b) return;
  b.flash = Math.max(0, b.flash - dt);
  if (!b.awake) { if (P.x > ARENA.l + 140) { b.awake = true; b.state = 'roar'; b.t = 1.4; banner = { t: 2.2, top: 'THE HOARDER', sub: 'A sin of greed, given a body' }; SFX.slam(); shake = 10; } return; }
  if (b.kneel || b.hp <= 0) return;
  const bc = b.x + b.w / 2, dx = P.x + 11 - bc, adx = Math.abs(dx), k = b.phase === 2 ? 0.8 : 1;
  switch (b.state) {
    case 'roar': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'idle'; b.t = 0.6; } break;
    case 'stag': b.t -= dt; b.vx *= 0.9; if (b.t <= 0) { b.state = 'idle'; b.t = 0.5; b.stag = 0; } break;
    case 'idle':
      b.t -= dt; b.face = Math.sign(dx) || b.face; b.vx = adx > 140 ? b.face * 80 : 0;
      if (b.t <= 0 && !P.dead) {
        const r = Math.random();
        if (adx < 150 && r < 0.45) { b.state = 'swingW'; b.t = 0.65 * k; }
        else if (r < 0.7) { b.state = 'coinW'; b.t = 0.55 * k; }
        else if (b.phase === 2 && r < 0.85) { b.state = 'slamW'; b.t = 0.6 * k; }
        else { b.state = 'grabW'; b.t = 0.75 * k; }
        SFX.warn();
      }
      break;
    case 'swingW': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'swing'; b.t = 0.22; b.hitDone = false; SFX.swing(); } break;
    case 'swing': { b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w - 10 : b.x - 120, y: b.y + 30, w: 130, h: 90 }; if (!b.hitDone && overlap(hb, P)) { b.hitDone = true; hurtPlayer(26, b, true); } if (b.t <= 0 && b.state === 'swing') { b.state = 'idle'; b.t = 0.9 * k; } break; }
    case 'coinW': b.t -= dt; b.vx = 0; if (b.t <= 0) { const n = b.phase === 2 ? 5 : 3; for (let i = 0; i < n; i++) { const tx = P.x + 11 + (i - (n - 1) / 2) * 70, T = 0.75, sx = bc + b.face * 20, sy = b.y + 30; shots.push({ coin: true, x: sx, y: sy, vx: (tx - sx) / T, vy: (GROUND - 10 - sy) / T - 0.5 * GRAV * 0.7 * T, g: GRAV * 0.7, life: 2, dmg: 12, r: 9 }); } b.state = 'idle'; b.t = 1.0 * k; } break;
    case 'grabW': b.t -= dt; b.vx = 0; b.face = Math.sign(dx) || b.face; if (b.t <= 0) { b.state = 'grab'; b.t = 0.45; b.hitDone = false; } break;
    case 'grab': {
      b.t -= dt; b.vx = b.face * 560;
      if (!b.hitDone && overlap(b, P)) { b.hitDone = true; const r = hurtPlayer(15, b, true); if (r === 'hit' && P.lotus > 0) { P.lotus--; floater(P.x + 11, P.y - 40, 'IT TOOK A LOTUS', RED); } }
      if (b.t <= 0 && b.state === 'grab') { b.state = 'idle'; b.t = 0.8 * k; b.vx = 0; } break;
    }
    case 'slamW': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'slam'; b.t = 0.5; shake = 14; SFX.slam(); for (const d of [-1, 1]) shots.push({ wave: true, x: bc + d * 50, y: GROUND - 24, vx: d * 420, life: 1.6, dmg: 18, r: 14 }); } break;
    case 'slam': b.t -= dt; if (b.t <= 0) { b.state = 'idle'; b.t = 0.9; } break;
  }
  b.x = clamp(b.x + b.vx * dt, ARENA.l + 10, ARENA.r - b.w - 10);
  if (b.state !== 'grab' && overlap(b, P) && P.rollIF <= 0) P.x = P.x + 11 < bc ? b.x - P.w : b.x + b.w;
}
function bossDown() {
  boss.kneel = true; boss.state = 'kneel'; boss.vx = 0; slowFor(0.8); SFX.slam(); shake = 16;
  setTimeout(() => {
    mode = 'choice';
    $('choiceIn').innerHTML = `<span class="eyebrow">The Hoarder kneels</span><h2>“Take it… take all of it. Only let me keep a little.”</h2><p>Its sack of seeds spills at your feet.</p><div class="row"><button class="btn" id="cTake" type="button">Take the hoard (+200 seeds)</button><button class="btn ghost" id="cLeave" type="button">Leave it</button></div>`;
    $('ovChoice').hidden = false;
    $('cTake').onclick = () => { P.seeds += 200; soul.memories.hoard = 'took'; deed('You took the Hoarder’s whole hoard.', -1); endBoss(); };
    $('cLeave').onclick = () => { soul.memories.hoard = 'left'; deed('You left the hoard where it lay.', 2); endBoss(); };
    $('cTake').focus();
  }, 900);
}
function endBoss() { $('ovChoice').hidden = true; soul.memories.bossDown = true; burst(boss.x + 35, boss.y + 60, 60, INK, 380); boss = null; mode = 'play'; banner = { t: 2.4, top: 'THE HOARDER IS BROKEN', sub: 'The road is quiet. Your life goes on.' }; }
let slowT = 0; function slowFor(t) { slowT = t; }

/* ---------- projectiles ---------- */
function updateShots(dt) {
  for (const s of shots) {
    s.life -= dt; s.x += s.vx * dt; if (s.g) { s.vy += s.g * dt; s.y += s.vy * dt; } else if (s.vy) s.y += s.vy * dt;
    if (!s.coin && !s.wave && s.y > GROUND - 2 && !(s.x > PIT.x && s.x < PIT.x + PIT.w)) { s.life = 0; if (s.arrow) fx.push({ k: 'stuck', x: s.x, y: GROUND, a: Math.atan2(s.vy, s.vx), life: 2.5 }); continue; }
    if (s.coin && s.y >= GROUND - 6) { s.life = 0; burst(s.x, GROUND - 4, 5, PENCIL, 120); continue; }
    if (s.coin || s.wave) { if (circle(s, P)) { const r = hurtPlayer(s.dmg, boss || { x: s.x, w: 0 }, false); if (r !== 'dodge') s.life = 0; } continue; }
    const tg = foes.filter(f => f.alive && f.state !== 'kneel'); if (boss && boss.awake && !boss.kneel) tg.push(boss);
    for (const t of tg) if (circle(s, t)) { hurtFoe(t, s.dmg, false); s.life = 0; burst(s.x, s.y, 12); break; }
  }
  shots = shots.filter(s => s.life > 0);
}
const circle = (s, b) => { const nx = clamp(s.x, b.x, b.x + b.w), ny = clamp(s.y, b.y, b.y + b.h); return (s.x - nx) ** 2 + (s.y - ny) ** 2 < s.r * s.r; };

/* ---------- falling & true death ---------- */
function fall(why) {
  if (P.dead) return;
  P.dead = true; P.deadT = 0; P.why = why; SFX.death();
  pendingDeath = 1.4;
}
function afterFall() {
  P.prana--;
  const spot = P.y > GROUND ? (P.x < PIT.x + PIT.w / 2 ? PIT.x - 30 : PIT.x + PIT.w + 30) : P.x;
  shades.forEach(s => s.taken = true);
  if (P.seeds > 0) shades.push({ x: spot, seeds: P.seeds, taken: false });
  P.seeds = 0;
  if (P.prana <= 0) { trueDeath(spot); return; }
  const prev = P; newBodySameLife(prev);
  banner = { t: 2.6, top: 'YOU FELL', sub: `${P.why} You wake at the shrine. Prana left: ${P.prana}.` };
}
function newBodySameLife(prev) {
  Object.assign(prev, { x: SHRINE_X + 40, y: GROUND - 52, vx: 0, vy: 0, hp: prev.hpMax, st: prev.stMax, mana: prev.manaMax, lotus: prev.lotusMax, dead: false, deadT: 0, atk: null, charging: false, rollT: 0, healT: 0, hitT: 0, inv: 1, shieldT: 0 });
  spawnFoes(); shots = []; if (boss && boss.hp > 0) boss = makeBoss();
}
function trueDeath(spot) {
  mode = 'death'; stopRec(); banner = null;
  life.end = P.why; life.endedAt = Date.now();
  soul.bodies.push({ x: spot, seeds: 0, life: life.n, looks: P.looks, taken: false });
  const k = soul.karma;
  const choices = k >= 3 ? 3 : 1;
  const debt = k < 0;
  const births = Array.from({ length: choices }, makeBirth);
  const deeds = life.deeds.length ? life.deeds.map(d => `<li class="${d.weight < 0 ? 'bad' : ''}">${esc(d.text)}</li>`).join('') : '<li>You passed through this life leaving little trace.</li>';
  const offer = choices > 1 ? 'Your merit is heavy. The wheel lets you choose your next life.' : debt ? 'Your deeds weigh on you. There is no choice this time, and a debt follows you.' : 'The wheel chooses your next life.';
  $('deathIn').innerHTML = `
    <span class="eyebrow" style="color:#b9b6ac">Prana spent · Life ${life.n} ends</span>
    <h2>${esc(P.why)}</h2>
    <p class="hand">The wheel weighs this life.</p>
    <ul class="deeds">${deeds}</ul>
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
$('tEnd').addEventListener('click', () => { if (mode === 'play' && P && !P.dead) { P.prana = 1; fall('You let this life go.'); } });
$('tBoss').addEventListener('click', () => { if (mode === 'play') { soul.memories.bossDown = false; boss = makeBoss(); banner = { t: 2, top: 'THE HOARDER RETURNS', sub: 'Test tool: the boss is back at the end of the road.' }; } });

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
function renderGear() {
  const b = life.birth;
  const slot = i => `<div class="slot${P.slotIdx === i ? ' cur' : ''}"><span class="lbl">Slot ${i + 1}${P.slotIdx === i ? ' · in hand' : ''}</span><b>${WEAPONS[P.slots[i]].name}</b><span>${WDESC[P.slots[i]]}</span></div>`;
  const inv = WEAPONS.map((w, wi) => `<div class="item"><b>${w.name}</b><span>${WDESC[wi]}</span><span class="m">Light ${w.light.dmg} dmg · Heavy ${w.heavy.dmg} dmg · Stamina ${w.light.st}/${w.heavy.st}</span><div class="row"><button class="btn ghost sm" type="button" data-w="${wi}" data-s="0">Slot 1</button><button class="btn ghost sm" type="button" data-w="${wi}" data-s="1">Slot 2</button></div></div>`).join('');
  const words = P.noMana ? '<p class="note">This body has no mana, so it has no word slots.</p>' : P.wordSlots.map((id, i) => `<label class="wslot"><span class="lbl">Word slot ${i + 1} (key ${i + 1})</span><select data-ws="${i}">${WORDS.map(w => `<option value="${w.id}"${w.id === id ? ' selected' : ''}>${w.say} · ${w.cost} mana</option>`).join('')}</select></label>`).join('');
  $('gearIn').innerHTML = `
    <span class="eyebrow">Life ${life.n} · Tab or Esc to close</span><h2>Gear</h2>
    <div class="gear">
      <div class="gcol"><span class="lbl">In your hands (Q switches)</span><div class="slots">${slot(0)}${slot(1)}</div>
        <span class="lbl">Carried weapons</span><div class="inv">${inv}</div></div>
      <div class="gcol"><span class="lbl">${P.noMana ? 'Battle words · no mana in this body' : `Battle words · ${b.tierName} mana gives ${P.wordSlots.length} slot${P.wordSlots.length === 1 ? '' : 's'}`}</span>${words}
        <span class="lbl">This body</span>
        <div class="stats"><span>Born ${esc(b.local)}, ${esc(b.place)}</span><span>${esc(b.lagna)} lagna · Moon ${esc(b.moon)}</span><span>${esc(b.region)} · ${esc(b.people)}</span><span>${perks(b).map(esc).join(' · ')}</span>
        <span>Health ${Math.round(P.hp)}/${P.hpMax} · Stamina ${P.stMax} · Mana ${P.manaMax} · Prana ${P.prana}/${P.pranaMax}</span><span>Lotus ${P.lotus}/${P.lotusMax} · Seeds ${P.seeds}</span></div></div>
    </div>`;
  $('gearIn').querySelectorAll('[data-w]').forEach(bt => bt.addEventListener('click', () => {
    const wi = +bt.dataset.w, s = +bt.dataset.s, other = 1 - s;
    if (P.slots[other] === wi) P.slots[other] = P.slots[s];
    P.slots[s] = wi; renderGear();
  }));
  $('gearIn').querySelectorAll('[data-ws]').forEach(se => se.addEventListener('change', () => {
    const i = +se.dataset.ws, v = se.value, j = P.wordSlots.indexOf(v);
    if (j >= 0 && j !== i) P.wordSlots[j] = P.wordSlots[i];
    P.wordSlots[i] = v; renderGear();
  }));
}
function drawMap() {
  const camSave = cam; cam = 0;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.font = `22px ${FD}`; ctx.fillText('THE OLD ROAD', W / 2, 70);
  ctx.font = `16px ${FH}`; ctx.fillStyle = INK2; ctx.fillText('M or Esc to close', W / 2, 98);
  const x0 = 60, x1 = 900, y = 300, X = wx => x0 + (x1 - x0) * wx / LW;
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(PIT.x), y); ctx.moveTo(X(PIT.x + PIT.w), y); ctx.lineTo(X(LW), y); ctx.stroke();
  hatch(x0, y + 4, X(PIT.x) - x0, 30, 8); hatch(X(PIT.x + PIT.w), y + 4, x1 - X(PIT.x + PIT.w), 30, 8);
  const mark = (wx, label, sub, h = 40) => { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(wx), y); ctx.lineTo(X(wx), y - h); ctx.stroke(); ctx.fillStyle = INK; ctx.font = `11px ${FD}`; ctx.fillText(label, X(wx), y - h - 20); if (sub) { ctx.font = `14px ${FH}`; ctx.fillStyle = INK2; ctx.fillText(sub, X(wx), y - h - 4); } };
  mark(SHRINE_X, 'SHRINE', 'rest here', 50); mark(HUT_X + 40, 'VILLAGE', villager.helped || soul.memories.gift ? 'the villager you helped' : 'a wounded villager', 90);
  mark(PIT.x + PIT.w / 2, 'THE DROP', 'a fall costs prana', 50); mark(ARENA.l + 300, boss ? 'THE HOARDER' : 'EMPTY ARENA', boss ? 'greed given a body' : 'you broke it', 70);
  for (const s of shades) if (!s.taken) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(X(s.x), y + 52, 4, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.font = `13px ${FH}`; ctx.fillText(`${s.seeds} seeds`, X(s.x), y + 78); }
  for (const bd of soul.bodies) if (!bd.taken && bd.life !== life.n) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(bd.x) - 6, y + 46); ctx.lineTo(X(bd.x) + 6, y + 58); ctx.moveTo(X(bd.x) + 6, y + 46); ctx.lineTo(X(bd.x) - 6, y + 58); ctx.stroke(); ctx.font = `13px ${FH}`; ctx.fillStyle = PENCIL; ctx.fillText(`your body from life ${bd.life}`, X(bd.x), y + 78); }
  const px = X(P.x + 11); ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(px, y - 8); ctx.lineTo(px - 8, y - 22); ctx.lineTo(px + 8, y - 22); ctx.closePath(); ctx.fill(); ctx.font = `11px ${FD}`; ctx.fillText('YOU', px, y - 28);
  ctx.font = `16px ${FH}`; ctx.fillStyle = INK2; ctx.fillText('Later builds: the whole world, other realms, and portals that open with the real sky.', W / 2, 460);
  cam = camSave;
}

/* ---------- update ---------- */
function update(dt) {
  clock += dt;
  if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
  if (villager.talkT > 0) villager.talkT -= dt;
  if (hitstop > 0) { hitstop -= dt; return; }
  if (slowT > 0) { slowT -= dt; dt *= 0.35; }
  if (pendingDeath > 0) { pendingDeath -= dt; P.deadT += dt; if (pendingDeath <= 0) afterFall(); }
  if (mode !== 'play') return;
  // push to talk
  if (micMode === 'ptt') {
    if (pressed.talk) { pttHeld = true; startRec(); }
    if (released.talk) { pttHeld = false; pttRelease = performance.now(); setTimeout(() => { if (!pttHeld && micMode === 'ptt') stopRec(); }, 500); }
  }
  updatePlayer(dt); updateFoes(dt); updateBoss(dt); updateShots(dt);
  for (const f of fx) { f.life -= dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.k === 'dot') f.vy += 900 * dt; }
  fx = fx.filter(f => f.life > 0);
  for (const f of floaters) { f.life -= dt; f.y -= 34 * dt; } floaters = floaters.filter(f => f.life > 0);
  const tx = P.x - W * 0.4; cam += (tx - cam) * Math.min(1, dt * 5); cam = clamp(cam, 0, LW - W);
  if (boss && boss.awake && boss.hp > 0) cam = clamp(cam, ARENA.l - 40, ARENA.r - W + 40);
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
  else limb(hip, pose.lB, L1, L2);
  const hB = limb(sh, pose.aB, A1, A2);
  ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(neck.x, neck.y); ctx.stroke();
  if (!opt.robe) limb(hip, pose.lF, L1, L2);
  const hF = limb(sh, pose.aF, A1, A2);
  ctx.beginPath(); ctx.arc(head.x, head.y, hr, 0, Math.PI * 2);
  if (opt.hollow) { ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke(); } else ctx.fill();
  if (opt.hair === 1) { ctx.lineWidth = lw * 0.6; ctx.beginPath(); for (let i = -1; i <= 1; i++) { const a = -Math.PI / 2 + i * 0.5 - face * 0.3; ctx.moveTo(head.x + Math.cos(a) * hr, head.y + Math.sin(a) * hr); ctx.lineTo(head.x + Math.cos(a - face * 0.3) * hr * 1.7, head.y + Math.sin(a - face * 0.3) * hr * 1.7); } ctx.stroke(); }
  if (opt.hair === 2) { ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(head.x - face * hr * 0.6, head.y - hr * 0.6); ctx.quadraticCurveTo(head.x - face * hr * 2.2, head.y, head.x - face * hr * 1.6, head.y + hr * 2.4); ctx.stroke(); }
  if (opt.hair === 3) { ctx.beginPath(); ctx.arc(head.x - face * hr * 0.2, head.y - hr * 1.1, hr * 0.55, 0, Math.PI * 2); ctx.fill(); }
  if (opt.eye) { ctx.fillStyle = opt.eyeC || PAPER; ctx.fillRect(head.x + face * hr * 0.15, head.y - hr * 0.32, face * hr * 0.6, hr * 0.3); }
  return { hF, hB, head, neck, hip };
}
function hatch(x, y, w, h, gap = 12, c = HATCH) { const x0 = Math.max(x, cam - 20), x1 = Math.min(x + w, cam + W + 20); if (x1 <= x0) return; ctx.save(); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, h); ctx.clip(); ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.beginPath(); for (let k = Math.floor((x0 - h) / gap) * gap; k < x1; k += gap) { ctx.moveTo(k, y + h); ctx.lineTo(k + h, y); } ctx.stroke(); ctx.restore(); }
function drawWorld() {
  // far hills (parallax)
  ctx.save(); ctx.translate(-cam * 0.3, 0); ctx.strokeStyle = FAINT; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -200; x < LW * 0.4 + W; x += 40) ctx.lineTo(x, 300 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.017) * 14);
  ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(-cam, 0);
  // ground with pit
  hatch(0, GROUND, PIT.x, H - GROUND, 13); hatch(PIT.x + PIT.w, GROUND, LW - PIT.x - PIT.w, H - GROUND, 13);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND + 1.5); ctx.lineTo(PIT.x, GROUND + 1.5); ctx.lineTo(PIT.x, H); ctx.moveTo(PIT.x + PIT.w, H); ctx.lineTo(PIT.x + PIT.w, GROUND + 1.5); ctx.lineTo(LW, GROUND + 1.5); ctx.stroke();
  // shrine
  const sx = SHRINE_X; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx - 46, GROUND); ctx.lineTo(sx - 46, GROUND - 120); ctx.moveTo(sx + 46, GROUND); ctx.lineTo(sx + 46, GROUND - 120); ctx.moveTo(sx - 70, GROUND - 120); ctx.quadraticCurveTo(sx, GROUND - 140, sx + 70, GROUND - 120); ctx.moveTo(sx - 56, GROUND - 98); ctx.lineTo(sx + 56, GROUND - 98); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(sx, GROUND - 8, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
  const flame = 8 + Math.sin(clock * 9) * 2; ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, GROUND - 14 - flame * 2); ctx.quadraticCurveTo(sx + 8, GROUND - 16, sx, GROUND - 12); ctx.quadraticCurveTo(sx - 8, GROUND - 16, sx, GROUND - 14 - flame * 2); ctx.fill(); ctx.stroke();
  // hut
  const hx = HUT_X; ctx.fillStyle = PAPER; ctx.fillRect(hx - 60, GROUND - 90, 120, 90); hatch(hx - 60, GROUND - 90, 120, 90, 9); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(hx - 60, GROUND - 90, 120, 90);
  ctx.beginPath(); ctx.moveTo(hx - 80, GROUND - 88); ctx.lineTo(hx, GROUND - 150); ctx.lineTo(hx + 80, GROUND - 88); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(hx - 16, GROUND - 52, 32, 52);
  // road posts
  for (let x = 760; x < 2480; x += 260) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x, GROUND - 40); ctx.stroke(); }
  // arena gate
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ARENA.l, GROUND); ctx.lineTo(ARENA.l, GROUND - 170); ctx.moveTo(ARENA.l - 30, GROUND - 170); ctx.lineTo(ARENA.l + 30, GROUND - 170); ctx.stroke();
  ctx.font = `13px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(boss ? 'THE HOARDER' : 'EMPTY ROAD', ARENA.l, GROUND - 184);
  // hints
  ctx.font = `19px ${FH}`; ctx.fillStyle = INK2; ctx.textAlign = 'center';
  if (Math.abs(P.x - SHRINE_X) < 90) ctx.fillText('E: rest at the shrine', sx, GROUND - 160);
  if (Math.abs(P.x - VILLAGER_X) < 90) ctx.fillText('E: talk', VILLAGER_X, GROUND - 92);
  ctx.fillText('Hold left click for a heavy blow. Right click to parry just as they strike.', 980, 230);
  ctx.fillText('Mercy: walk away from one who begs.', 1300, 270);
  // past bodies & shades
  for (const b of soul.bodies) if (!b.taken && b.life !== life.n) { ctx.save(); ctx.globalAlpha = 0.85; stick(b.x, GROUND, POSE.kneel(), 1, PENCIL, b.looks.build, { hair: b.looks.hair, robe: b.looks.robe }); ctx.restore(); ctx.font = `15px ${FH}`; ctx.fillStyle = PENCIL; ctx.fillText('a body you once wore', b.x, GROUND - 70); }
  for (const s of shades) if (!s.taken) { ctx.fillStyle = INK; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clock * 4); ctx.beginPath(); ctx.ellipse(s.x, GROUND - 30, 10, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.font = `14px ${FH}`; ctx.fillStyle = INK2; ctx.fillText(`${s.seeds} seeds`, s.x, GROUND - 66); }
  // villager
  stick(villager.x, GROUND, POSE.sit(), -1, INK2, 3, { hollow: true, s: 0.95 });
  if (!villager.helped && life.n === 1) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(villager.x + 4, GROUND - 26, 4, 0, Math.PI * 2); ctx.fill(); }
  if (villager.talkT > 0) speech(villager.x, GROUND - 110, villager.line);
  // foes
  for (const f of foes) if (f.alive) drawFoe(f);
  if (boss) drawBoss();
  // shots
  for (const s of shots) {
    if (s.coin) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
    else if (s.wave) { ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(s.x - 18, GROUND); ctx.lineTo(s.x, GROUND - 28); ctx.lineTo(s.x + 18, GROUND); ctx.fill(); }
    else if (s.arrow) { const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(0, 0); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-31, -4); ctx.moveTo(-26, 0); ctx.lineTo(-31, 4); ctx.stroke(); ctx.restore(); }
    else { const sp = Math.hypot(s.vx, s.vy) || 1; ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); for (let i = 1; i < 4; i++) { ctx.globalAlpha = 0.5 / i; ctx.beginPath(); ctx.arc(s.x - s.vx / sp * i * 12, s.y - s.vy / sp * i * 12, s.r * (1 - i * 0.18), 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
  }
  drawPlayer();
  for (const f of fx) {
    ctx.globalAlpha = Math.min(1, f.life * 2.5);
    if (f.k === 'spark') { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03); ctx.stroke(); }
    else if (f.k === 'stuck') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.restore(); }
    else if (f.k === 'leaf') { ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y, 4, 2, clock * 3, 0, Math.PI * 2); ctx.stroke(); }
    else { ctx.fillStyle = f.c || INK; ctx.beginPath(); ctx.arc(f.x, f.y, f.k === 'ink' ? 4 : 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.life * 2); ctx.font = `13px ${FD}`; ctx.fillStyle = f.c; ctx.textAlign = 'center'; ctx.fillText(f.t, f.x, f.y); }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function speech(x, y, text) {
  ctx.font = `17px ${FH}`; const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 300) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur);
  const bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24, bh = lines.length * 22 + 14, bx = x - bw / 2, by = y - bh;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = INK; ctx.textAlign = 'left'; lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 24 + i * 22));
}
function drawFoe(f) {
  const ink = f.flash > 0 ? PENCIL : INK2, cx = f.x + 12;
  const pose = f.state === 'kneel' ? POSE.kneel() : f.state === 'wind' ? POSE.wind() : f.state === 'swing' ? POSE.strike() : f.state === 'stun' || f.state === 'stag' ? POSE.hurt() : Math.abs(f.vx) > 10 ? POSE.run(clock * 8 + f.home) : POSE.idle(clock + f.home);
  const r = stick(cx, GROUND, pose, f.face, ink, 3, { hollow: true });
  // grasping fingers + stick
  if (f.state !== 'kneel') { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + f.face * 22, r.hF.y - 18); ctx.stroke(); }
  ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(r.hB.x, r.hB.y); ctx.lineTo(r.hB.x + i * 4, r.hB.y + 7); } ctx.stroke();
  if (f.state === 'wind') { ctx.fillStyle = RED; ctx.font = `20px ${FD}`; ctx.textAlign = 'center'; ctx.fillText('!', r.head.x, r.head.y - 16); ctx.beginPath(); ctx.arc(r.hF.x + f.face * 22, r.hF.y - 18, 5, 0, Math.PI * 2); ctx.fill(); }
  if (f.state === 'swing') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + f.face * 20, f.y + 22, 30, f.face > 0 ? -1 : Math.PI - 1, f.face > 0 ? 1 : Math.PI + 1); ctx.stroke(); }
  if (f.state === 'stag') { ctx.font = `12px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('OPEN', cx, f.y - 18); }
  if (f.state !== 'kneel' && f.hp < f.hpMax) { ctx.fillStyle = FAINT; ctx.fillRect(cx - 16, f.y - 10, 32, 4); ctx.fillStyle = INK; ctx.fillRect(cx - 16, f.y - 10, 32 * Math.max(0, f.hp) / f.hpMax, 4); }
}
function drawBoss() {
  const b = boss, bc = b.x + b.w / 2, ink = b.flash > 0 ? PENCIL : INK;
  const wind = /W$/.test(b.state), lean = b.kneel ? 0.9 : wind ? -0.3 : b.state === 'swing' ? 0.5 : 0.45;
  // sack
  const sackX = bc - b.face * 46, sackY = GROUND - 70 - (b.state === 'swingW' ? 50 : 0);
  ctx.fillStyle = PAPER; ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sackX, sackY, 44, 50, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); hatch(sackX - 44, sackY - 50, 88, 100, 7);
  ctx.beginPath(); ctx.ellipse(sackX, sackY, 44, 50, 0, 0, Math.PI * 2); ctx.stroke();
  const pose = b.kneel ? POSE.kneel() : b.state === 'grab' ? { lean: 0.9, aF: [1.6, 1.5], aB: [1.3, 1.4], lF: [0.8, 0.2], lB: [-0.7, -0.2] } : wind ? POSE.wind() : b.state === 'swing' || b.state === 'slam' ? POSE.strike() : b.state === 'stag' ? POSE.hurt() : Math.abs(b.vx) > 5 ? POSE.run(clock * 5) : { lean, aF: [0.6, 1.0], aB: [-0.4, 0.4], lF: [0.3, 0.05], lB: [-0.3, -0.05] };
  const r = stick(bc, GROUND, pose, b.face, ink, 7, { s: 2.4, eye: true, eyeC: wind || b.state === 'grab' ? RED : PAPER });
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(r.hF.x + b.face * 12 + i * 4, r.hF.y + 14); } ctx.stroke();
  if (b.state === 'swingW') { ctx.save(); ctx.strokeStyle = RED; ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeRect(b.face > 0 ? b.x + b.w - 10 : b.x - 120, b.y + 30, 130, 90); ctx.restore(); }
  if (b.state === 'grabW') { ctx.save(); ctx.strokeStyle = RED; ctx.setLineDash([12, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bc, GROUND - 8); ctx.lineTo(bc + b.face * 260, GROUND - 8); ctx.stroke(); ctx.restore(); }
  if (b.state === 'coinW' || b.state === 'slamW') { ctx.fillStyle = RED; ctx.font = `26px ${FD}`; ctx.textAlign = 'center'; ctx.fillText('!', r.head.x, r.head.y - 26); }
  if (b.state === 'stag') { ctx.font = `13px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('OPEN', bc, b.y - 10); }
}
function drawPlayer() {
  const p = P; if (!p) return;
  if (p.inv > 0 && !p.dead && Math.floor(p.inv * 16) % 2 === 0) return;
  const cx = p.x + 11;
  let pose;
  if (p.dead) pose = POSE.hurt(); else if (p.hitT > 0) pose = POSE.hurt(); else if (p.rollT > 0) pose = POSE.roll(); else if (p.healT > 0) pose = POSE.drink(); else if (p.parryT > 0) pose = POSE.parry();
  else if (p.atk) pose = p.atk.t < p.atk.a0 ? POSE.wind() : POSE.strike(); else if (p.charging) pose = POSE.wind(); else if (!p.onG) pose = POSE.jump(); else if (Math.abs(p.vx) > 20) pose = POSE.run(p.run); else pose = POSE.idle(clock);
  ctx.save(); if (p.dead) { ctx.translate(cx, GROUND); ctx.rotate(-p.face * Math.min(1, p.deadT * 2) * Math.PI / 2); ctx.translate(-cx, -GROUND); ctx.globalAlpha = Math.max(0.2, 1 - p.deadT * 0.5); }
  if (p.shieldT > 0) { ctx.fillStyle = PAPER; const sx = cx + p.face * 26 - 9; ctx.fillRect(sx, GROUND - 70, 18, 70); hatch(sx, GROUND - 70, 18, 70, 5); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(sx, GROUND - 70, 18, 70); }
  // soul mark: scarf
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.beginPath(); const ny = p.y + 15; ctx.moveTo(cx, ny); for (let i = 1; i <= 4; i++) ctx.lineTo(cx - p.face * i * 6, ny + i * 2.5 + Math.sin(clock * 12 + i) * 1.5); ctx.stroke();
  const r = stick(cx, p.y + p.h, pose, p.face, INK, p.looks.build, { hair: p.looks.hair, robe: p.looks.robe && p.rollT <= 0 && p.onG, eye: true });
  // weapon
  if (!p.dead) {
    const wi = p.slots[p.slotIdx], w = wi === 1, hx = r.hF.x, hy = r.hF.y, ang = p.atk && p.atk.t >= p.atk.a0 ? 0 : p.charging ? -1.9 : -1.2;
    if (wi !== 2) { ctx.save(); ctx.translate(hx, hy); ctx.scale(p.face, 1); ctx.rotate(ang); ctx.strokeStyle = INK; ctx.lineWidth = w ? 5 : 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w ? 30 : 38, 0); ctx.stroke();
    if (w) { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(32, 0, 9, 0, Math.PI * 2); ctx.fill(); } else { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(4, 6); ctx.stroke(); }
    ctx.restore(); }
    if (wi === 2) {
      const ax = aimX() - hx, ay = aimY() - hy, a = mouse.in ? Math.atan2(ay, ax) : (p.face > 0 ? 0 : Math.PI), pull = p.charging ? p.charge / 0.7 : 0;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-4, 0, 22, -1.2, 1.2); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4 + Math.cos(-1.2) * 22, Math.sin(-1.2) * 22); ctx.lineTo(-10 - pull * 14, 0); ctx.lineTo(-4 + Math.cos(1.2) * 22, Math.sin(1.2) * 22); ctx.stroke();
      if (p.charging) { ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10 - pull * 14, 0); ctx.lineTo(20, 0); ctx.stroke(); }
      ctx.restore();
    }
    if (p.atk && p.atk.t >= p.atk.a0 && p.atk.t <= p.atk.a1 + 0.05) { ctx.strokeStyle = INK; ctx.lineWidth = p.atk.heavy ? 4 : 2; ctx.beginPath(); const a0 = p.face > 0 ? -1.1 : Math.PI - 1.1; ctx.arc(cx + p.face * 18, p.y + 24, p.atk.reach * 0.7, a0, a0 + 2.2); ctx.stroke(); }
    if (p.charging) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, p.y + 26, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.charge / 0.7); ctx.stroke(); }
    if (p.parryT > 0) { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + p.face * 14, p.y + 22, 26, p.face > 0 ? -1.2 : Math.PI - 1.2, p.face > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke(); }
    if (micMode === 'ptt' && pttHeld) { ctx.strokeStyle = micReady ? INK : PENCIL; ctx.lineWidth = 2; for (let i = 0; i < 2; i++) { const rr = 30 + ((clock * 50 + i * 18) % 36); ctx.globalAlpha = 1 - (rr - 30) / 36; ctx.beginPath(); ctx.arc(r.head.x, r.head.y, rr, 0, Math.PI * 2); ctx.stroke(); } ctx.globalAlpha = 1; }
  }
  ctx.restore();
}
function drawHUD() {
  const p = P;
  const bar = (x, y, w, v, max, label, col = INK) => { ctx.font = `10px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText(label, x, y - 4); ctx.fillStyle = FAINT; ctx.fillRect(x, y, w, 10); ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(v / max, 0, 1), 10); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, 10); };
  bar(20, 26, 200, p.hp, p.hpMax, 'HEALTH');
  bar(20, 52, 200 * p.stMax / 100, p.st, p.stMax, 'STAMINA', INK2);
  if (p.manaMax) bar(20, 78, 200 * p.manaMax / 100, p.mana, p.manaMax, `MANA · ${life.birth.school || ''}`, PENCIL); else { ctx.font = `10px ${FD}`; ctx.fillStyle = PENCIL; ctx.fillText('NO MANA IN THIS LIFE', 20, 84); }
  ctx.font = `10px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.fillText('PRANA', 300, 22);
  for (let i = 0; i < p.pranaMax; i++) { ctx.beginPath(); ctx.arc(308 + i * 22, 34, 7, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = INK; if (i < p.prana) { ctx.fillStyle = INK; ctx.fill(); } else ctx.stroke(); }
  ctx.fillText(`LOTUS ${p.lotus}/${p.lotusMax}`, 300, 62); ctx.fillText(`SEEDS ${p.seeds}`, 300, 80);
  ctx.textAlign = 'right'; ctx.fillText(`LIFE ${life.n} · ${curW().name.toUpperCase()} (Q: ${WEAPONS[p.slots[1 - p.slotIdx]].name.toUpperCase()})`, W - 20, 22);
  ctx.fillStyle = PENCIL; ctx.fillText(micMode === 'off' ? 'MIC OFF · 1 2 3' : micMode === 'ptt' ? (pttHeld ? (micReady ? 'LISTENING' : 'MIC STARTING…') : 'HOLD V TO SPEAK') : (recOn ? 'MIC ON · SPEAK A WORD' : 'MIC STARTING…'), W - 20, 40);
  if (!p.noMana) { p.wordSlots.forEach((id, i) => { const w = WORDS.find(x => x.id === id); ctx.fillStyle = w && p.mana >= w.cost ? INK : PENCIL; ctx.fillText(w ? `${i + 1} ${w.say.toUpperCase()} ${w.cost}` : `${i + 1} EMPTY`, W - 20, 60 + i * 16); }); ctx.fillStyle = PENCIL; ctx.fillText('TAB: GEAR · M: MAP', W - 20, 64 + p.wordSlots.length * 16); }
  if (boss && boss.awake && !boss.kneel) { const bw = 420, bx = W / 2 - bw / 2, by = H - 34; ctx.textAlign = 'center'; ctx.font = `13px ${FD}`; ctx.fillStyle = INK; ctx.fillText('THE HOARDER', W / 2, by - 6); ctx.fillStyle = FAINT; ctx.fillRect(bx, by, bw, 12); ctx.fillStyle = INK2; ctx.fillRect(bx, by, bw * boss.hp / boss.hpMax, 12); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 12); ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by + 12); ctx.stroke(); }
  if (banner) { const a = clamp(Math.min(banner.t * 2, 1), 0, 1); ctx.globalAlpha = a; ctx.fillStyle = INK; ctx.fillRect(0, 196, W, 96); ctx.fillStyle = PAPER; ctx.textAlign = 'center'; ctx.font = `30px ${FD}`; ctx.fillText(banner.top, W / 2, 240); ctx.font = `18px ${FH}`; ctx.fillText(banner.sub, W / 2, 270); ctx.globalAlpha = 1; }
}
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.beginPath(); for (let y = 40; y < GROUND; y += 34) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); } ctx.stroke();
  if (!P) return;
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) * 0.6 : 0;
  if (mode === 'map') { drawMap(); return; }
  ctx.save(); ctx.translate(sx, sy); drawWorld(); ctx.restore();
  drawHUD();
  cv.style.cursor = mode === 'play' && mouse.in ? 'none' : 'default';
  if (mode === 'play' && mouse.in) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2); ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y); ctx.moveTo(mouse.x + 5, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y); ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y - 5); ctx.moveTo(mouse.x, mouse.y + 5); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke(); }
}
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  update(dt); render();
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
window.__life = { get P() { return P; }, get boss() { return boss; }, get soul() { return soul; }, get mode() { return mode; }, get foes() { return foes; }, castWord, WORDS, findWord, fall, setMicMode, step: dt => update(dt) };
})();
