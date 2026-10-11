/* ================= core: constants, screen, input, sound, save ================= */
const W = 960, H = 540, GROUND = 460, GRAV = 1900;
const INK = '#121212', INK2 = '#33322d', PENCIL = '#9a988f', RULE = '#ebe9e1', PAPER = '#fbfaf6', RED = '#d7262c', HATCH = '#cfcdc4', FAINT = '#e2e0d7';
const FD = '"Rubik Mono One","Arial Black",Impact,sans-serif';
const FH = '"Kalam","Comic Sans MS",cursive';

const $ = id => document.getElementById(id);
const frame = $('frame'), cv = $('game'), ctx = cv.getContext('2d');
const touchEl = $('touch'), legend = $('legend'), rotateNote = $('rotate');

const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && 'ontouchstart' in window);
if (isTouch) { touchEl.hidden = false; legend.hidden = true; }
const KEY = isTouch ? { atk: 'HIT', shot: 'SHOT', dash: 'DASH', ult: 'ULT', jump: 'JUMP' } : { atk: 'J', shot: 'K', dash: 'L', ult: 'U', jump: 'W' };

let scale = 1;
function fit() {
  const portrait = isTouch && innerHeight > innerWidth;
  rotateNote.hidden = !portrait;
  const extra = (legend.hidden ? 0 : legend.offsetHeight + 12) + (rotateNote.hidden ? 0 : rotateNote.offsetHeight + 12);
  const availW = document.documentElement.clientWidth - 32;
  const availH = innerHeight - 32 - extra;
  const w = Math.max(260, Math.min(availW, availH * 16 / 9, 1280));
  frame.style.width = w + 'px';
  const h = w * 9 / 16, dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  scale = cv.width / W;
  const tb = Math.round(Math.max(44, Math.min(84, h * 0.17)));
  frame.style.setProperty('--tb', tb + 'px');
  layoutTouch(tb);
}
function layoutTouch(tb) {
  const g = Math.round(tb * 0.2), m = Math.round(tb * 0.2);
  const set = (a, l, r, b) => { const el = touchEl.querySelector(`[data-a="${a}"]`); el.style.left = l == null ? '' : l + 'px'; el.style.right = r == null ? '' : r + 'px'; el.style.bottom = b + 'px'; };
  set('left', m, null, m); set('right', m + tb + g, null, m);
  set('jump', null, m, m); set('attack', null, m + tb + g, m);
  set('dash', null, m, m + tb + g); set('shoot', null, m + tb + g, m + tb + g);
  set('ult', null, m, m + 2 * (tb + g));
}
addEventListener('resize', fit);

/* ---------- input ---------- */
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'down', KeyS: 'down', KeyJ: 'attack', KeyX: 'attack', KeyK: 'shoot', KeyC: 'shoot', KeyL: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyU: 'ult', KeyI: 'ult' };
const held = {}, pressed = {};
const press = a => { if (!held[a]) pressed[a] = true; held[a] = true; };
const release = a => { held[a] = false; };
function clearInput() { for (const k in held) held[k] = false; for (const k in pressed) pressed[k] = false; touchEl.querySelectorAll('.on').forEach(b => b.classList.remove('on')); }

addEventListener('keydown', e => {
  unlockAudio();
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'play') { pause(); e.preventDefault(); return; }
    if (mode === 'paused') { resume(); e.preventDefault(); return; }
  }
  if (e.code === 'KeyM') { toggleMute(); return; }
  const a = KEYMAP[e.code];
  if (mode === 'play') { if (a) { e.preventDefault(); if (!e.repeat) press(a); } return; }
  if (a === 'attack' && !e.repeat) {
    const ov = [...document.querySelectorAll('.overlay')].find(o => !o.hidden);
    const b = ov && ov.querySelector('.primary');
    if (b && !b.hidden) { e.preventDefault(); b.click(); }
  }
});
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) release(a); });
addEventListener('blur', () => { clearInput(); if (mode === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') pause(); });

touchEl.querySelectorAll('button').forEach(b => {
  const a = b.dataset.a;
  const on = e => { e.preventDefault(); unlockAudio(); try { b.setPointerCapture(e.pointerId); } catch (_) {} b.classList.add('on'); if (mode === 'play') press(a); };
  const off = () => { b.classList.remove('on'); release(a); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off);
  b.addEventListener('lostpointercapture', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
});

/* ---------- sound (made in code) ---------- */
let actx = null, muted = false;
function unlockAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
}
function tone(f1, f2, dur, type = 'square', vol = 0.05, delay = 0) {
  if (!actx || muted) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.03);
}
let noiseBuf = null;
function noise(dur, vol = 0.08, freq = 1200, type = 'lowpass', delay = 0) {
  if (!actx || muted) return;
  if (!noiseBuf) { noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate * 1.2), actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = actx.currentTime + delay, s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(actx.destination); s.start(t); s.stop(t + dur + 0.03);
}
const SFX = {
  jump: () => tone(330, 620, 0.09, 'square', 0.03),
  djump: () => tone(460, 900, 0.1, 'square', 0.025),
  swing: () => noise(0.07, 0.05, 3200, 'highpass'),
  hit: () => { tone(190, 60, 0.11, 'square', 0.05); noise(0.08, 0.08, 900); },
  heavy: () => { tone(150, 40, 0.18, 'sawtooth', 0.06); noise(0.15, 0.12, 700); },
  shoot: () => tone(980, 320, 0.07, 'square', 0.025),
  dash: () => noise(0.15, 0.06, 1800, 'bandpass'),
  hurt: () => tone(420, 110, 0.22, 'sawtooth', 0.06),
  kill: () => { noise(0.25, 0.1, 600); tone(200, 50, 0.25, 'triangle', 0.06); },
  slam: () => { noise(0.5, 0.22, 260); tone(90, 30, 0.45, 'sine', 0.25); },
  boom: () => { noise(0.6, 0.25, 500); tone(70, 25, 0.5, 'sine', 0.2); },
  pickup: () => { tone(620, 620, 0.06, 'square', 0.03); tone(930, 930, 0.09, 'square', 0.03, 0.06); },
  roar: () => { tone(120, 60, 0.8, 'sawtooth', 0.07); noise(0.7, 0.07, 400); },
  flag: () => { tone(523, 523, 0.08, 'square', 0.03); tone(784, 784, 0.14, 'square', 0.03, 0.08); },
  warn: () => tone(880, 880, 0.06, 'square', 0.02),
  block: () => { tone(1500, 900, 0.06, 'square', 0.03); noise(0.05, 0.05, 4000, 'highpass'); },
  door: () => { tone(220, 110, 0.5, 'triangle', 0.06); noise(0.4, 0.05, 300); },
  laser: () => tone(1200, 600, 0.25, 'sawtooth', 0.025),
  cast: () => { tone(110, 55, 1.6, 'sawtooth', 0.05); tone(165, 82, 1.6, 'triangle', 0.05); noise(1.4, 0.04, 300); },
  ult: () => { noise(0.9, 0.25, 900); tone(220, 40, 0.9, 'sawtooth', 0.09); tone(330, 990, 0.3, 'square', 0.04); },
  slash: () => { noise(0.1, 0.1, 5000, 'highpass'); tone(700, 200, 0.08, 'square', 0.03); },
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'square', 0.035, i * 0.13)),
};
function speak(text) {
  if (muted) return;
  try {
    const s = window.speechSynthesis; if (!s || !window.SpeechSynthesisUtterance) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92; u.pitch = 0.35; u.volume = 0.9;
    s.speak(u);
  } catch (_) {}
}
function toggleMute() {
  muted = !muted;
  const b = $('btnSound');
  b.setAttribute('aria-pressed', String(muted));
  b.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on');
  b.textContent = muted ? '×' : '♪';
  if (muted) { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (_) {} }
}
$('btnSound').addEventListener('click', () => { unlockAudio(); toggleMute(); });

/* ---------- helpers ---------- */
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = t => { const s = Math.floor(t); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function circleRect(cx, cy, r, b) { const nx = clamp(cx, b.x, b.x + b.w), ny = clamp(cy, b.y, b.y + b.h); return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- save ---------- */
const SAVE_KEY = 'inktower.v2';
function freshSave() { return { reached: 1, cur: 1, picks: {}, best: 0 }; }
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.reached) return Object.assign(freshSave(), s); } catch (_) {}
  return freshSave();
}
let save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }

/* ---------- shared game state ---------- */
let world, player, bosses = [];
let cam = { x: 0, y: 0 }, shake = 0, hitstop = 0, slowT = 0, clock = 0;
let particles = [], ghosts = [], bullets = [], shots = [], zones = [], waves = [], floaters = [], rings = [], spears = [], slashes = [];
let mode = 'menu', scene = 'level', curFloor = 1;
let fade = 0, fadeDir = 0, fadeCb = null;
let runTime = 0, floorTime = 0, deaths = 0, floorDeaths = 0;
let cp = { scene: 'level', x: 80, y: GROUND };
let introT = 0, introMax = 1, clearPending = -1;
let cast = null, ultFx = {};
let stats = {};
