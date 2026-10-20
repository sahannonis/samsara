/* ===== part 4: the traveler, the sky, controls, sound and the frame ===== */

/* ---------- the traveler: a cut-out body moved by code ---------- */
const BODY = { thigh: 36, shin: 34, torso: 50, upper: 28, fore: 27, hipH: 72 };
function part(w, h, fn, ay = 1) { const t = paint(Math.max(16, w * 4), Math.max(16, h * 4), (g, W, H) => { g.scale(W / w, H / h); fn(g, w, h); }); const s = sprite(t, w, h, { ax: 0.5, ay, rim: 1.2 }); return s; }
const ROBE = '#22293a', ROBE2 = '#171c28', SKIN = '#c89a72', HAT = '#b08a4c', SASH = '#9c2e28';
const RIG = new THREE.Group(); scene.add(RIG);
const PARTS = {};
function limb(name, w, len, col, order, tip) { const s = part(w, len, (g) => { g.fillStyle = col; g.beginPath(); g.roundRect(w * 0.1, 0, w * 0.8, len, w * 0.4); g.fill(); if (tip) tip(g, w, len); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1; g.stroke(); }); s.renderOrder = order; RIG.add(s); PARTS[name] = s; return s; }
limb('uaB', 12, BODY.upper, ROBE2, 50); limb('faB', 10, BODY.fore, ROBE2, 50, (g, w, l) => { g.fillStyle = '#9a7556'; g.beginPath(); g.arc(w / 2, l - 3, 4, 0, TAU); g.fill(); });
limb('thB', 15, BODY.thigh, ROBE2, 51); limb('shB', 12, BODY.shin, '#141820', 51, (g, w, l) => { g.fillStyle = '#2a1c14'; g.fillRect(0, l - 6, w + 6, 6); });
PARTS.torso = part(34, BODY.torso + 6, (g, w, h) => { g.fillStyle = ROBE; g.beginPath(); g.moveTo(4, h); g.lineTo(2, 18); g.quadraticCurveTo(w / 2, 0, w - 2, 18); g.lineTo(w - 4, h); g.closePath(); g.fill(); g.fillStyle = SASH; g.fillRect(3, h - 16, w - 6, 7); g.fillStyle = '#2e3850'; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 6, h - 18); g.lineTo(w / 2 + 4, h - 18); g.fill(); }, 0); PARTS.torso.renderOrder = 53; RIG.add(PARTS.torso);
PARTS.skirt = part(40, 30, (g, w, h) => { g.fillStyle = ROBE; g.beginPath(); g.moveTo(6, 0); g.lineTo(w - 6, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(w / 2 - 1, 2, 2, h - 2); }); PARTS.skirt.renderOrder = 54; RIG.add(PARTS.skirt);
limb('thF', 15, BODY.thigh, ROBE, 55); limb('shF', 12, BODY.shin, '#1a1f2a', 55, (g, w, l) => { g.fillStyle = '#3a281c'; g.fillRect(0, l - 6, w + 6, 6); });
PARTS.head = part(22, 26, (g, w, h) => { g.fillStyle = SKIN; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2.2, h / 2.1, 0, 0, TAU); g.fill(); g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(w / 2 - 3, h / 2 - 4, w / 2.3, h / 2.6, 0, Math.PI, TAU); g.fill(); g.fillRect(2, h / 2 - 4, 6, 10); g.fillStyle = '#1a1410'; g.fillRect(w - 7, h / 2 - 2, 3, 3); }, 0.5); PARTS.head.renderOrder = 57; RIG.add(PARTS.head);
PARTS.hat = part(64, 22, (g, w, h) => { g.fillStyle = HAT; g.beginPath(); g.moveTo(0, h - 3); g.quadraticCurveTo(w / 2, -h * 0.9, w, h - 3); g.quadraticCurveTo(w / 2, h - 8, 0, h - 3); g.fill(); g.strokeStyle = 'rgba(60,40,10,0.5)'; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(w / 2, 1); g.lineTo(i * w / 8, h - 4); g.stroke(); } }, 0); PARTS.hat.renderOrder = 58; RIG.add(PARTS.hat);
PARTS.sword = part(8, 78, (g, w, h) => { g.fillStyle = '#2a1a12'; g.fillRect(2, 0, 4, 16); g.fillStyle = '#c9963a'; g.fillRect(0, 15, 8, 3); const r = g.createLinearGradient(0, 0, w, 0); r.addColorStop(0, '#9aa4ae'); r.addColorStop(0.5, '#f2f6fa'); r.addColorStop(1, '#7a848e'); g.fillStyle = r; g.beginPath(); g.moveTo(2, 18); g.lineTo(6, 18); g.lineTo(5.5, h - 6); g.lineTo(3, h); g.lineTo(2, 18); g.fill(); }, 1); PARTS.sword.renderOrder = 59; RIG.add(PARTS.sword);
limb('uaF', 12, BODY.upper, ROBE, 60); limb('faF', 10, BODY.fore, ROBE, 60, (g, w, l) => { g.fillStyle = SKIN; g.beginPath(); g.arc(w / 2, l - 3, 4.2, 0, TAU); g.fill(); });
// the soul mark: a red scarf. And hair, and the tails of the robe, all on physics
const SCARF = new Chain(9, 6.5, 0, 0), HAIR = new Chain(6, 6, 0, 0), TAILF = new Chain(6, 7, 0, 0), TAILB = new Chain(6, 7, 0, 0);
const RIBS = [new Ribbon(SCARF, 8, 3, '#b8322c', 52), new Ribbon(HAIR, 6, 1.5, '#16110d', 56), new Ribbon(TAILB, 16, 10, ROBE2, 49), new Ribbon(TAILF, 16, 10, ROBE, 54.5)];
for (const r of RIBS) scene.add(r.mesh);
const PL = { x: 300, y: 0, vx: 0, vy: 0, face: 1, onG: true, run: false, phase: 0, roll: 0, atk: 0, combo: 0, land: 0, coyote: 0, jbuf: 0, inWater: false, stepT: 0 };
const POSE = { lean: 0, head: 0, uaF: 0.2, faF: 0.4, uaB: -0.1, faB: 0.2, thF: 0, shF: 0, thB: 0, shB: 0, bob: 0, spin: 0, sword: 0.2 };
const SHADOWS = { pl: shadow(70), deer: shadow(170) };
const TRAIL = { pts: [], mesh: null };
{ const n = 24; const pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), idx = []; for (let i = 0; i < n; i++) { uv.set([i / (n - 1), 0, i / (n - 1), 1], i * 4); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  TRAIL.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float a = vUv.x * vUv.x * smoothstep(0.0, 0.6, vUv.y) * uA; gl_FragColor = vec4(vec3(1.4, 1.35, 1.2) * a, a); }` }));
  TRAIL.mesh.frustumCulled = false; TRAIL.mesh.renderOrder = 65; scene.add(TRAIL.mesh); TRAIL.n = n; }

const rot = (a, l) => [Math.sin(a) * l, -Math.cos(a) * l];   // angle 0 points down, positive swings forward
function targetPose(t) {
  const p = PL.phase, P = {};
  const speed = Math.abs(PL.vx);
  if (PL.roll > 0) { const k = 1 - PL.roll / 0.5; Object.assign(P, { lean: 0.9, head: 0.5, uaF: 1.2, faF: 1.8, uaB: 1.0, faB: 1.7, thF: 1.7, shF: 2.3, thB: 1.5, shB: 2.2, bob: -34, spin: -TAU * smooth(0, 1, k), sword: 0.2 }); return P; }
  if (PL.atk > 0) { const c = PL.combo, k = 1 - PL.atk / 0.34, sw = smooth(0.15, 0.55, k);
    const swings = [[3.3, 0.5], [0.3, 2.4], [2.6, 1.2]], [a0, a1] = swings[(c - 1) % 3];
    Object.assign(P, { lean: 0.15 + 0.15 * sw, head: 0.1, uaF: lerp(a0, a1, sw), faF: lerp(0.5, 0.05, sw), uaB: lerp(-0.6, 0.6, sw), faB: 0.6, thF: 0.55, shF: 0.25, thB: -0.45, shB: 0.35, bob: -6, spin: 0, sword: 0.05 }); return P; }
  if (!PL.onG) { if (PL.vy > 80) Object.assign(P, { lean: 0.12, head: -0.15, uaF: -0.7, faF: 1.1, uaB: 0.9, faB: 0.6, thF: 1.0, shF: 1.4, thB: -0.1, shB: 0.8, bob: 0, spin: 0, sword: 0.3 });
    else Object.assign(P, { lean: 0.05, head: 0.2, uaF: 1.3, faF: 0.3, uaB: 1.0, faB: 0.4, thF: 0.35, shF: 0.5, thB: -0.35, shB: 0.7, bob: 0, spin: 0, sword: 0.4 }); return P; }
  if (speed > 20) { const r = PL.run ? 1 : 0; const A = lerp(0.48, 0.95, r), Kn = lerp(0.7, 1.5, r);
    Object.assign(P, { lean: lerp(0.06, 0.32, r), head: lerp(0.0, -0.12, r), uaF: -lerp(0.35, 0.95, r) * Math.sin(p) + lerp(0.1, 0.3, r), faF: lerp(0.3, 1.3, r) + 0.2 * Math.sin(p), uaB: lerp(0.35, 0.95, r) * Math.sin(p) + lerp(0.0, 0.2, r), faB: lerp(0.3, 1.2, r) - 0.2 * Math.sin(p),
      thF: A * Math.sin(p) + r * 0.15, shF: Kn * Math.max(0, Math.sin(p + 1.7)) + 0.1, thB: A * Math.sin(p + Math.PI) + r * 0.15, shB: Kn * Math.max(0, Math.sin(p + Math.PI + 1.7)) + 0.1, bob: -Math.abs(Math.cos(p)) * lerp(3, 8, r) + lerp(1, 3, r), spin: 0, sword: lerp(0.3, 0.9, r) }); }
  else { const b = Math.sin(t * 2.0); Object.assign(P, { lean: 0.02, head: 0.05 * Math.sin(t * 0.7), uaF: 0.18 + b * 0.03, faF: 0.45, uaB: -0.08 - b * 0.02, faB: 0.25, thF: 0.08, shF: 0.06, thB: -0.1, shB: 0.08, bob: b * 1.2, spin: 0, sword: 0.35 }); }
  if (PL.land > 0) { const k = PL.land / 0.18; P.bob -= 14 * k; P.thF += 0.6 * k; P.shF += 1.1 * k; P.thB += 0.4 * k; P.shB += 1.0 * k; P.lean += 0.2 * k; }
  return P;
}
function poseRig(dt, t) {
  const tg = targetPose(t), k = 1 - Math.exp(-dt * (PL.atk > 0 || PL.roll > 0 ? 30 : 16));
  for (const key in POSE) POSE[key] = key === 'spin' && PL.roll <= 0 ? lerp(POSE.spin, 0, 1) : lerp(POSE[key], tg[key], key === 'spin' ? 1 : k);
  const P = POSE, f = PL.face;
  RIG.position.set(PL.x, PL.y, 0); RIG.scale.x = f;
  const cy = 46; // spin around the body's middle when rolling
  const R = (x, y) => { const c = Math.cos(P.spin), s = Math.sin(P.spin); y -= cy; return [x * c - y * s, x * s + y * c + cy]; };
  const hip = [0, BODY.hipH + P.bob];
  const lean = P.lean, neck = [hip[0] + Math.sin(lean) * BODY.torso, hip[1] + Math.cos(lean) * BODY.torso];
  const sh = [hip[0] + Math.sin(lean) * BODY.torso * 0.86, hip[1] + Math.cos(lean) * BODY.torso * 0.86];
  const set = (m, xy, ang) => { const [x, y] = R(xy[0], xy[1]); m.position.set(x, y, 0); m.rotation.z = ang + P.spin; };
  set(PARTS.torso, hip, -lean); set(PARTS.skirt, [hip[0], hip[1] + 4], -lean * 0.3);
  const legs = (th, shn, tn, sn) => { const k1 = rot(th, BODY.thigh), knee = [hip[0] + k1[0], hip[1] + k1[1]]; set(PARTS[tn], hip, th); set(PARTS[sn], knee, th - shn); };
  legs(P.thF, P.shF, 'thF', 'shF'); legs(P.thB, P.shB, 'thB', 'shB');
  const arms = (ua, fa, un, fn) => { const e1 = rot(ua, BODY.upper), elbow = [sh[0] + e1[0], sh[1] + e1[1]]; set(PARTS[un], sh, ua); set(PARTS[fn], elbow, ua + fa); const e2 = rot(ua + fa, BODY.fore - 3); return [elbow[0] + e2[0], elbow[1] + e2[1], ua + fa]; };
  arms(P.uaB, P.faB, 'uaB', 'faB'); const hand = arms(P.uaF, P.faF, 'uaF', 'faF');
  const head = [neck[0] + Math.sin(lean + P.head) * 13, neck[1] + Math.cos(lean + P.head) * 13];
  set(PARTS.head, head, -(lean + P.head) * 0.6); set(PARTS.hat, [head[0], head[1] + 6], -(lean + P.head) * 0.6);
  const sa = hand[2] + P.sword;   // the blade carries on from the forearm, the way a held sword does
  set(PARTS.sword, [hand[0], hand[1]], sa);
  // world points for cloth and the slash trail
  const W = (xy) => { const [x, y] = R(xy[0], xy[1]); return [PL.x + x * f, PL.y + y]; };
  const tl = rot(sa, 74), tipL = [hand[0] + tl[0], hand[1] + tl[1]];
  return { neck: W([neck[0] - 4, neck[1] - 2]), headBack: W([head[0] - 9, head[1] + 2]), hip: W([hip[0] - 2, hip[1] - 2]), hand: W([hand[0], hand[1]]), tip: W(tipL) };
}

/* ---------- the sky: the real Sun and Moon, from Astronomy Engine ---------- */
const SKY = { lat: 6.93, lon: 79.86, place: 'Colombo', offsetH: 0, dayRun: false, dayT: 0, last: 0, cache: null };
const PAL = [ // by the Sun's height: sky top, sky bottom, ambient light, sun or moon light
  [-18, '#070a1c', '#141a3a', '#3a4478', '#7d8fd8'], [-8, '#0c1430', '#2b2f5e', '#48508a', '#8a9ae0'], [-3, '#262c5a', '#c8705a', '#7a6a92', '#f0905a'],
  [3, '#4a6fae', '#f2a46a', '#c49a8a', '#ffb070'], [10, '#4f86c6', '#dcc6a0', '#e8dccb', '#ffe2b8'], [30, '#3f80cf', '#b8dcf0', '#ffffff', '#fff6e8'], [90, '#3f80cf', '#b8dcf0', '#ffffff', '#fffaf0'] ];
function palAt(alt) { let i = 0; while (i < PAL.length - 2 && alt > PAL[i + 1][0]) i++; const a = PAL[i], b = PAL[i + 1], t = clamp((alt - a[0]) / (b[0] - a[0]), 0, 1); return [1, 2, 3, 4].map(k => mixC(hex(a[k]), hex(b[k]), t)); }
function skyRead() {
  const now = Date.now() + SKY.offsetH * 3600e3 + SKY.dayT * 3600e3;
  if (SKY.cache && Math.abs(now - SKY.last) < (SKY.dayRun ? 0 : 20000)) return SKY.cache;
  const A = window.Astronomy, d = new Date(now); let sun = { alt: 40, az: 180 }, moon = { alt: -10, az: 90 }, phase = 90;
  try { const obs = new A.Observer(SKY.lat, SKY.lon, 0); const pos = b => { const eq = A.Equator(b, d, obs, true, true), hz = A.Horizon(d, obs, eq.ra, eq.dec, 'normal'); return { alt: hz.altitude, az: hz.azimuth }; };
    sun = pos(A.Body.Sun); moon = pos(A.Body.Moon); phase = A.MoonPhase(d); } catch (e) {}
  SKY.last = now; SKY.cache = { d, sun, moon, phase, illum: (1 - Math.cos(phase * Math.PI / 180)) / 2, waxing: phase < 180 }; return SKY.cache;
}
// facing south, as in the game: east on the left, west on the right
const skyX = az => 0.5 + clamp(((az + 360) % 360 - 180) / 95, -1.15, 1.15) * 0.45, skyY = alt => 0.24 + (alt / 70) * 0.7;
let MOOD = { color: 0, target: 0 };
function applySky(dt) {
  const k = skyRead(), sAlt = k.sun.alt, night = smooth(2, -10, sAlt);
  const [top, bot, amb, lc] = palAt(sAlt);
  const rain = U.uRain.value; amb.multiplyScalar(1 - rain * 0.35);
  SKYU.uTop.value.copy(top).lerp(hex('#3a3e48'), rain * 0.6); SKYU.uBot.value.copy(bot).lerp(hex('#5a5e66'), rain * 0.6);
  SKYU.uSun.value.set(skyX(k.sun.az), skyY(sAlt)); SKYU.uMoon.value.set(skyX(k.moon.az), skyY(k.moon.alt));
  SKYU.uSunVis.value = smooth(-4, 2, sAlt); SKYU.uMoonVis.value = smooth(-4, 2, k.moon.alt) * (0.35 + 0.65 * night); SKYU.uPhase.value = k.illum; SKYU.uWaxing.value = k.waxing ? 1 : 0;
  SKYU.uStars.value = night; SKYU.uSunCol.value.copy(lc);
  U.uAmb.value.copy(amb); U.uHazeCol.value.copy(bot).lerp(top, 0.25); U.uNight.value = night;
  // the light comes from the sun by day and from the moon by night, from where they really are
  const useSun = sAlt > -4, src = useSun ? k.sun : k.moon, sx = skyX(src.az) - 0.5, sy = skyY(src.alt) - 0.32;
  const L = Math.hypot(sx, sy) || 1; U.uLightDir.value.set(sx / L, sy / L);
  const strength = useSun ? smooth(-4, 12, sAlt) : smooth(-4, 10, k.moon.alt) * (0.25 + 0.75 * k.illum) * 0.7;
  U.uLightCol.value.copy(useSun ? lc : hex('#9fb4ff')).multiplyScalar(strength * (1 - rain * 0.7));
  POST.rays.uniforms.uStrength.value = Q.rays ? (useSun ? 0.55 * smooth(-2, 6, sAlt) * (1 - smooth(25, 55, sAlt) * 0.6) : 0.25 * k.illum * smooth(0, 10, k.moon.alt)) * (1 - rain) : 0;
  POST.rays.uniforms.uSun.value.set(skyX(src.az), skyY(src.alt));
  POST.final.uniforms.uNight.value = night;
  // the shadow falls away from the light, longer when it is low
  const lowness = 1 - clamp(src.alt / 60, 0, 1), sh = strength * 0.65;
  for (const [m, x, w] of [[SHADOWS.pl, PL.x, 70], [SHADOWS.deer, DEER.x, 170]]) { m.position.set(x - U.uLightDir.value.x * (10 + lowness * 60) * (PL.y > 0 && m === SHADOWS.pl ? 1 : 1), 1, -3); m.scale.set(1 + lowness * 1.8, 1, 1); m.material.opacity = sh * (m === SHADOWS.pl ? clamp(1 - PL.y / 300, 0, 1) : 1); }
  const hh = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('skyLine').textContent = `${SKY.place} · ${k.d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${hh(k.d)} · Sun ${sAlt >= 0 ? sAlt.toFixed(0) + '° up' : (-sAlt).toFixed(0) + '° below'} · Moon ${(k.illum * 100).toFixed(0)}% full${k.moon.alt > 0 ? ', up' : ', down'}`;
  return k;
}

/* ---------- controls: keyboard, mouse and touch ---------- */
const held = {}, pressed = {};
const KEYMAP = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ShiftLeft: 'run', ShiftRight: 'run', KeyJ: 'atk', KeyL: 'roll', KeyK: 'roll', KeyE: 'use', KeyG: 'gust', KeyR: 'rain' };
addEventListener('keydown', e => { const a = KEYMAP[e.code]; if (!a) return; e.preventDefault(); if (!held[a]) pressed[a] = true; held[a] = true; wakeAudio(); });
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) held[a] = false; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) { pressed.atk = true; wakeAudio(); } });
if (isTouch) { $('touch').classList.add('show'); const tb = (id, a, tap) => { const el = $(id); el.addEventListener('touchstart', e => { e.preventDefault(); held[a] = true; pressed[a] = true; wakeAudio(); }, { passive: false }); el.addEventListener('touchend', e => { e.preventDefault(); held[a] = false; }, { passive: false }); };
  tb('tL', 'left'); tb('tR', 'right'); tb('tJ', 'jump'); tb('tA', 'atk'); tb('tRo', 'roll'); }

/* ---------- sound: wind, rain, footsteps, the bell, all made on the fly ---------- */
let AC = null, SND = { on: false };
function wakeAudio() { if (AC || !SND.on) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const noise = () => { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
  SND.windF = AC.createBiquadFilter(); SND.windF.type = 'bandpass'; SND.windF.frequency.value = 400; SND.windF.Q.value = 0.6; SND.windG = AC.createGain(); SND.windG.gain.value = 0; noise().connect(SND.windF).connect(SND.windG).connect(AC.destination);
  SND.rainF = AC.createBiquadFilter(); SND.rainF.type = 'highpass'; SND.rainF.frequency.value = 1800; SND.rainG = AC.createGain(); SND.rainG.gain.value = 0; noise().connect(SND.rainF).connect(SND.rainG).connect(AC.destination);
  SND.fireG = AC.createGain(); SND.fireG.gain.value = 0; const ff = AC.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 900; noise().connect(ff).connect(SND.fireG).connect(AC.destination); } catch (e) { AC = null; } }
function tone(f, dur, vol = 0.1, type = 'sine', partials = [1]) { if (!AC) return; const t0 = AC.currentTime; for (const [i, m] of partials.entries()) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f * m; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol / (i + 1), t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / (1 + i * 0.4)); o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur); } }
function thump(vol = 0.05, f = 120) { if (!AC) return; const t0 = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.4, t0 + 0.12); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14); o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + 0.15); }
function soundTick() { if (!AC) return; const w = U.uWind.value + U.uGust.value; SND.windG.gain.value = lerp(SND.windG.gain.value, 0.02 + w * 0.07, 0.05); SND.windF.frequency.value = 300 + w * 500; SND.rainG.gain.value = lerp(SND.rainG.gain.value, U.uRain.value * 0.12, 0.05);
  SND.fireG.gain.value = lerp(SND.fireG.gain.value, Math.max(0, 1 - Math.abs(PL.x - SHRINE_X) / 600) * 0.05, 0.1); }

/* ---------- the panel ---------- */
const STATE = { gust: 0, nextGust: 6, raining: false, rain: 0, flash: 0, nextFlash: 8, fpsT: 0, fpsN: 0 };
function setMood(m) { if (m === 'ink') { MOOD.target = 0; SKY.offsetH = hourOffsetFor(13); } if (m === 'day') { MOOD.target = 1; SKY.offsetH = hourOffsetFor(15.5); } if (m === 'night') { MOOD.target = 1; SKY.offsetH = hourOffsetFor(22); }
  SKY.dayRun = false; SKY.dayT = 0; SKY.cache = null; $('bDay').classList.remove('on'); $('bNow').classList.toggle('on', false); $('sTime').value = SKY.offsetH; $('hrs').textContent = SKY.offsetH.toFixed(1); $('sColor').value = MOOD.target; ['mInk', 'mDay', 'mNight'].forEach(id => $(id).classList.toggle('on', id === { ink: 'mInk', day: 'mDay', night: 'mNight' }[m])); }
function hourOffsetFor(h) { const now = new Date(), local = (now.getUTCHours() + now.getUTCMinutes() / 60 + SKY.lon / 15 + 24) % 24; let d = h - local; if (d > 12) d -= 24; if (d < -12) d += 24; return d; }
$('mInk').onclick = () => setMood('ink'); $('mDay').onclick = () => setMood('day'); $('mNight').onclick = () => setMood('night');
$('sColor').oninput = e => { MOOD.target = +e.target.value; MOOD.color = MOOD.target; };
$('sTime').oninput = e => { SKY.offsetH = +e.target.value; SKY.dayRun = false; SKY.cache = null; $('hrs').textContent = SKY.offsetH.toFixed(1); $('bNow').classList.remove('on'); $('bDay').classList.remove('on'); };
$('bNow').onclick = () => { SKY.offsetH = 0; SKY.dayRun = false; SKY.dayT = 0; SKY.cache = null; $('sTime').value = 0; $('hrs').textContent = '0'; $('bNow').classList.add('on'); $('bDay').classList.remove('on'); };
$('bDay').onclick = () => { SKY.dayRun = !SKY.dayRun; $('bDay').classList.toggle('on', SKY.dayRun); $('bNow').classList.remove('on'); };
$('bLoc').onclick = () => { navigator.geolocation && navigator.geolocation.getCurrentPosition(p => { SKY.lat = p.coords.latitude; SKY.lon = p.coords.longitude; SKY.place = 'Your place'; SKY.cache = null; }, () => { $('skyLine').textContent = 'Your location was not shared, so the sky stays over Colombo.'; }); };
$('sWind').oninput = e => { U.uWind.value = +e.target.value; };
$('bGust').onclick = () => { pressed.gust = true; }; $('bRain').onclick = () => { pressed.rain = true; };
$('bSound').onclick = () => { SND.on = !SND.on; $('bSound').textContent = SND.on ? 'SOUND ON' : 'SOUND OFF'; $('bSound').classList.toggle('on', SND.on); if (SND.on) wakeAudio(); else if (AC) { AC.close(); AC = null; } };
$('qHigh').onclick = () => { setQuality('pc'); $('qHigh').classList.add('on'); $('qPhone').classList.remove('on'); }; $('qPhone').onclick = () => { setQuality('phone'); $('qPhone').classList.add('on'); $('qHigh').classList.remove('on'); };
$('panelHead').onclick = () => $('panel').classList.toggle('closed');
if (isTouch) $('panel').classList.add('closed');

/* ---------- the world's moving parts, every frame ---------- */
function groundAt(x, y, vy) { let g = 0; for (const L of LEDGES) if (x > L.x0 && x < L.x1 && y >= L.y - 2 && L.y > g) { if (vy <= 0 || y >= L.y) g = L.y; } return g; }
function stepPlayer(dt) {
  const mx = (held.right ? 1 : 0) - (held.left ? 1 : 0); PL.run = !!held.run;
  if (PL.roll > 0) { PL.roll -= dt; PL.vx = PL.face * 640; if (PL.roll <= 0) PL.roll = 0; }
  else if (PL.atk > 0) { PL.atk -= dt; PL.vx *= Math.pow(0.002, dt); if (PL.atk < 0.14 && pressed.atk && PL.combo < 3) { PL.combo++; PL.atk = 0.34; swingFx(); } if (PL.atk <= 0) { PL.atk = 0; PL.combo = 0; } }
  else { const target = mx * (PL.run ? 520 : 240) * (PL.inWater ? 0.6 : 1); PL.vx = lerp(PL.vx, target, 1 - Math.exp(-dt * (PL.onG ? 12 : 4))); if (mx) PL.face = mx;
    if (pressed.atk) { PL.combo = 1; PL.atk = 0.34; swingFx(); } else if (pressed.roll && PL.onG) { PL.roll = 0.5; dustBurst(PL.x, 10, -PL.face); thump(0.04, 90); } }
  if (pressed.jump) PL.jbuf = 0.14; PL.jbuf -= dt; PL.coyote -= dt;
  if (PL.jbuf > 0 && (PL.onG || PL.coyote > 0) && PL.roll <= 0) { PL.vy = 920; PL.onG = false; PL.coyote = 0; PL.jbuf = 0; dustBurst(PL.x, 4, 0); thump(0.03, 160); }
  if (!held.jump && PL.vy > 300) PL.vy -= 3600 * dt;   // short hop when let go early
  PL.vy -= 2600 * dt; PL.x = clamp(PL.x + PL.vx * dt, 60, WORLD_W - 60); const ny = PL.y + PL.vy * dt;
  const gnd = groundAt(PL.x, PL.y, PL.vy);
  if (ny <= gnd && PL.vy <= 0) { if (!PL.onG && PL.vy < -500) { PL.land = 0.18; dustBurst(PL.x, gnd + 4, 0, 10); thump(0.06, 80); if (PL.inWater) { splashBurst(PL.x, 14); ripple(PL.x, 1.6); } } PL.y = gnd; PL.vy = 0; PL.onG = true; }
  else { if (PL.onG && ny < gnd - 1) PL.coyote = 0.1; PL.y = ny; PL.onG = PL.y <= gnd + 0.01 && PL.vy <= 0; }
  if (PL.land > 0) PL.land -= dt;
  PL.inWater = PL.x > POND.x0 + 10 && PL.x < POND.x1 - 10 && PL.y < 20;
  const sp = Math.abs(PL.vx); if (PL.onG && sp > 20 && PL.roll <= 0) { PL.phase += dt * sp / (PL.run ? 52 : 34);
    PL.stepT -= dt * sp / 100; if (PL.stepT <= 0) { PL.stepT = PL.run ? 0.75 : 1.0; if (PL.inWater) { splashBurst(PL.x + PL.face * 10, 6); ripple(PL.x, 0.8); tone(900 + Math.random() * 300, 0.12, 0.02, 'triangle'); } else { if (PL.run) dustBurst(PL.x - PL.face * 10, 4, -PL.face, 3); thump(0.018, 140 + Math.random() * 40); } } }
  U.uPlayer.value.set(PL.x, PL.y, 0);
}
function swingFx() { TRAIL.pts = []; TRAIL.on = 0.3; tone(320, 0.12, 0.025, 'sawtooth', [1]); const near = Math.abs(PL.x + PL.face * 60 - BELL.x) < 90 && PL.y + 120 > BELL.y - 90; if (near) ringBell(PL.face * 2.2);
  for (const L of STONE_LANTERNS) if (Math.abs(PL.x + PL.face * 50 - L) < 40 && PL.y < 60) { for (let i = 0; i < 10; i++) FX.sparks.add({ x: L, y: 70 + rr(-10, 30), z: -4, vx: rr(-200, 200), vy: rr(50, 300), w: 6, h: 6, life: rr(0.2, 0.5), c: [1, 0.8, 0.4] }); tone(1400, 0.15, 0.02, 'square'); } }
function ringBell(push) { BELL.va += push; tone(392, 3.2, 0.12, 'sine', [1, 2.76, 5.4, 8.9]); for (let i = 0; i < 14; i++) FX.sparks.add({ x: BELL.x, y: BELL.y - 70, z: -20, vx: rr(-120, 120), vy: rr(-60, 140), w: 5, h: 5, life: rr(0.3, 0.7), c: [1, 0.85, 0.5] }); }
function dustBurst(x, y, dir, n = 6) { for (let i = 0; i < n; i++) FX.dust.add({ x: x + rr(-14, 14), y: y + rr(0, 6), z: 2, vx: dir * rr(20, 120) + rr(-40, 40), vy: rr(10, 70), w: rr(18, 34), h: rr(18, 34), life: rr(0.4, 0.8), c: [0.62, 0.55, 0.46], a: 0.5, grow: rr(30, 60) }); }
function splashBurst(x, y) { for (let i = 0; i < 8; i++) FX.sparks.add({ x: x + rr(-10, 10), y, z: 9, vx: rr(-120, 120), vy: rr(120, 320), w: 5, h: 8, life: rr(0.3, 0.6), c: [0.75, 0.85, 0.95], g: true }); }
function stepDeer(dt, t) {
  const d = PL.x - DEER.x, close = Math.abs(d) < 300, alarm = close && (PL.run || PL.atk > 0 || PL.roll > 0);
  if (DEER.mode !== 'flee' && alarm) { DEER.mode = 'flee'; DEER.face = d > 0 ? -1 : 1; DEER.t = 0; DEER.target = clamp(DEER.x + DEER.face * 900, 1500, 3200); }
  if (DEER.mode === 'flee') { DEER.t += dt; DEER.x += DEER.face * 520 * dt; DEER.hop = Math.abs(Math.sin(DEER.t * 7)) * 46; DEER.head = lerp(DEER.head, -0.25, 0.2);
    if ((DEER.face > 0 && DEER.x >= DEER.target) || (DEER.face < 0 && DEER.x <= DEER.target) || DEER.x < 1500 || DEER.x > 3200) { DEER.mode = 'wary'; DEER.t = 0; DEER.hop = 0; } }
  else if (DEER.mode === 'wary') { DEER.t += dt; DEER.head = lerp(DEER.head, -0.3, 0.05); DEER.face = d > 0 ? 1 : -1; if (DEER.t > 4 && !close) { DEER.mode = 'walk'; DEER.face = DEER.home > DEER.x ? 1 : -1; } }
  else if (DEER.mode === 'walk') { DEER.x += DEER.face * 60 * dt; DEER.hop = Math.abs(Math.sin(t * 6)) * 3; if (Math.abs(DEER.x - DEER.home) < 20) DEER.mode = 'graze'; }
  else { DEER.hop = 0; const cyc = (t % 7) / 7; const down = cyc < 0.55; DEER.head = lerp(DEER.head, down ? 0.75 : (close ? -0.3 : -0.05), 0.04); if (close) DEER.face = d > 0 ? 1 : -1; }
  DEER_G.position.set(DEER.x, DEER.hop, -8); DEER_G.scale.x = DEER.face < 0 ? 1 : -1; DEER.headG.rotation.z = -DEER.head * 0.9 + Math.sin(t * 9) * 0.02 * (DEER.mode === 'graze' ? 1 : 0);
}
function stepWorld(dt, t, pts) {
  // wind and gusts
  STATE.nextGust -= dt; if (pressed.gust || STATE.nextGust <= 0) { STATE.gust = 1; STATE.nextGust = rr(9, 18); for (let i = 0; i < 14; i++) FX.gusts.add({ x: camera.position.x - viewW * 0.6 + rr(0, viewW * 0.4), y: rr(40, 700), z: rr(-40, 40), vx: rr(1400, 2000), vy: rr(-20, 20), r: Math.PI / 2, w: 3, h: rr(160, 320), life: rr(0.6, 1.1), c: [0.8, 0.85, 0.9], a: 0.35 }); if (AC) tone(180, 1.4, 0.03, 'sine', [1]); }
  STATE.gust = Math.max(0, STATE.gust - dt * 0.55); U.uGust.value = Math.sin(Math.min(1, STATE.gust) * Math.PI) * 0.9;
  const wind = U.uWind.value + U.uGust.value * 1.4 + Math.sin(t * 0.4) * 0.08;
  // rain, and now and then lightning
  if (pressed.rain) { STATE.raining = !STATE.raining; $('bRain').classList.toggle('on', STATE.raining); }
  STATE.rain = lerp(STATE.rain, STATE.raining ? 1 : 0, 1 - Math.exp(-dt * 0.8)); U.uRain.value = STATE.rain; POST.final.uniforms.uRain.value = STATE.rain;
  if (STATE.rain > 0.05) { const n = Math.floor(STATE.rain * 900 * dt * Q.parts * 3); for (let i = 0; i < n; i++) { const z = rr(-300, 300), x = camera.position.x + rr(-viewW * 0.8, viewW * 0.8); FX.rain.add({ x, y: 1100, z, vx: -wind * 260, vy: -1700, r: Math.atan2(wind * 260, 1700), w: 2.2, h: rr(40, 70), life: 1.2, c: [0.7, 0.75, 0.85], a: 0.45, rain: true }); } }
  if (STATE.rain > 0.7) { STATE.nextFlash -= dt; if (STATE.nextFlash <= 0) { STATE.flash = 1; STATE.nextFlash = rr(9, 20); setTimeout(() => tone(55, 2.5, 0.12, 'sawtooth', [1, 1.5]), 600); } }
  STATE.flash = Math.max(0, STATE.flash - dt * 3); POST.final.uniforms.uFlash.value = STATE.flash > 0.6 ? 0.55 : STATE.flash * 0.3;
  // leaves from the trees, petals from the old tree
  if (Math.random() < dt * (2 + wind * 6) * Q.parts) { const x = camera.position.x + rr(-viewW * 0.5, viewW * 0.7); const gold = Math.random() < 0.4; FX.leaves.add({ x, y: rr(500, 900), z: rr(-60, 80), vx: 0, vy: -60, r: rr(0, TAU), vr: rr(-3, 3), w: 14, h: 9, life: 14, c: gold ? [0.95, 0.75, 0.3] : [0.5, 0.7, 0.3], seed: Math.random() * 10 }); }
  if (Math.abs(camera.position.x - BLOSSOM_X) < viewW && Math.random() < dt * (5 + wind * 10) * Q.parts) FX.petals.add({ x: BLOSSOM_X + rr(-260, 260), y: rr(420, 720), z: rr(-50, 30), vx: 0, vy: -40, r: rr(0, TAU), vr: rr(-4, 4), w: 9, h: 6, life: 12, c: [1, 0.78, 0.84], seed: Math.random() * 10 });
  const flutter = (p, dt) => { p.vx = lerp(p.vx, wind * 220 + Math.sin(p.age * 2.2 + p.seed) * 50, dt * 1.5); p.vy = lerp(p.vy, -50 + Math.sin(p.age * 3.1 + p.seed) * 30, dt * 2); p.vr += Math.sin(p.age * 2 + p.seed) * dt * 4;
    if (p.y > 1) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.h2 = Math.abs(Math.cos(p.age * 3 + p.seed)); } else { p.y = 1; if (!p.rest) { p.rest = true; p.life = p.age + 4; if (p.x > POND.x0 && p.x < POND.x1) ripple(p.x, 0.3); } } };
  FX.leaves.update(dt, flutter); FX.petals.update(dt, flutter);
  FX.rain.update(dt, (p, dt) => { p.x += p.vx * dt; p.y += p.vy * dt; const floorY = p.z > 20 ? -40 : 0; if (p.y < floorY + 4) { p.dead = true; if (Math.random() < 0.25) { const inPond = p.x > POND.x0 && p.x < POND.x1 && p.z > -40; if (inPond && Math.random() < 0.5) ripple(p.x, 0.35); else FX.splash.add({ x: p.x, y: floorY + 3, z: p.z, w: 6, h: 3, life: 0.35, c: [0.8, 0.85, 0.95], a: 0.5, grow: 30 }); } } });
  FX.splash.update(dt, (p, dt) => { p.w += p.grow * dt; p.h += p.grow * 0.4 * dt; });
  FX.dust.update(dt, (p, dt) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.95; p.w += p.grow * dt; p.h += p.grow * dt; });
  FX.gusts.update(dt); FX.sparks.update(dt, (p, dt) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= (p.g ? 1200 : 300) * dt; });
  // embers from the shrine fire, rising and drifting with the wind
  if (Math.random() < dt * 14 * Q.parts) FX.embers.add({ x: SHRINE_X + rr(-14, 14), y: 90, z: -18, vx: rr(-20, 20), vy: rr(60, 140), w: rr(3, 6), h: rr(3, 6), life: rr(1.2, 2.6), c: [1, rr(0.4, 0.7), 0.15], seed: Math.random() * 9 });
  FX.embers.update(dt, (p, dt) => { p.x += (p.vx + wind * 90 + Math.sin(p.age * 4 + p.seed) * 25) * dt; p.y += p.vy * dt; p.a = 0.6 + 0.4 * Math.sin(p.age * 20 + p.seed); });
  // fireflies at night, near the grass and the forest
  const night = U.uNight.value; if (night > 0.3 && FX.flies.list.length < 90 * night * Q.parts) FX.flies.add({ x: camera.position.x + rr(-viewW * 0.6, viewW * 0.6), y: rr(20, 260), z: rr(-80, 30), w: 9, h: 9, life: rr(6, 12), c: [0.9, 1, 0.5], seed: Math.random() * 20 });
  FX.flies.update(dt, (p, dt) => { p.x += (Math.sin(p.age * 0.9 + p.seed) * 40 + wind * 30) * dt; p.y += Math.cos(p.age * 1.3 + p.seed * 2) * 25 * dt; p.a = (0.5 + 0.5 * Math.sin(p.age * 3 + p.seed)) * night; });
  // cloth: banners, prayer flags, the scarf, hair and robe
  for (const s of SHEETS) s.step(Math.min(dt, 1 / 30), wind * 1.3);
  FLAGS.rope.step(Math.min(dt, 1 / 30), FLAGS.rope.p[0].x, FLAGS.rope.p[0].y, wind * 0.6, -500, 0.98); { const p = FLAGS.rope.p, e = p[p.length - 1]; e.x = e.px = FLAGS.end.x; e.y = e.py = FLAGS.end.y; } FLAGS.ribbon.update(-12);
  for (const f of FLAGS.flags) { const q = FLAGS.rope.p[f.i]; f.va += (-(f.a) * 30 - f.va * 3 + (wind * 2.2 + Math.sin(t * 5 + f.i) * wind) * 6) * dt; f.a += f.va * dt; f.m.position.set(q.x, q.y, -12.5); f.m.rotation.z = clamp(f.a, -1.3, 1.3) * -0.5; f.m.scale.x = 1 - Math.abs(Math.sin(t * 4 + f.i)) * 0.2 * wind; }
  const pv = PL.vx; const dts = Math.min(dt, 1 / 30);
  SCARF.step(dts, pts.neck[0], pts.neck[1], -pv * 0.03 + wind * 1.3, -1150, 0.965, PL.y + 2); HAIR.step(dts, pts.headBack[0], pts.headBack[1], -pv * 0.03 + wind * 1.5, -900, 0.97);
  TAILF.step(dts, pts.hip[0] + PL.face * 6, pts.hip[1], -pv * 0.02 + wind * 1.2, -1400, 0.95, PL.y + 1); TAILB.step(dts, pts.hip[0] - PL.face * 8, pts.hip[1], -pv * 0.025 + wind * 1.4, -1400, 0.95, PL.y + 1);
  RIBS[0].update(-0.8); RIBS[1].update(0.6); RIBS[2].update(-1); RIBS[3].update(0.3);
  // the sword's trail
  if (PL.atk > 0) { TRAIL.pts.unshift([pts.tip[0], pts.tip[1], pts.hand[0], pts.hand[1]]); if (TRAIL.pts.length > TRAIL.n) TRAIL.pts.pop(); }
  TRAIL.on = Math.max(0, (TRAIL.on || 0) - dt); TRAIL.mesh.material.uniforms.uA.value = PL.atk > 0 ? 1 : TRAIL.on * 3;
  { const pos = TRAIL.mesh.geometry.attributes.position, n = TRAIL.n; for (let i = 0; i < n; i++) { const q = TRAIL.pts[Math.min(i, TRAIL.pts.length - 1)] || [pts.tip[0], pts.tip[1], pts.hand[0], pts.hand[1]]; const tx = q[0], ty = q[1], hx = lerp(q[2], q[0], 0.35), hy = lerp(q[3], q[1], 0.35);
    pos.setXYZ(n * 2 - 2 - i * 2, tx, ty, 2); pos.setXYZ(n * 2 - 1 - i * 2, hx, hy, 2); } pos.needsUpdate = true; }
  // the bell, lanterns and banners' poles
  BELL.va += (-BELL.a * 18 - BELL.va * 1.2 + wind * 0.6 * Math.sin(t * 1.7)) * dt; BELL.a += BELL.va * dt; BELL_MESH.rotation.z = BELL.a * 0.35;
  if (pressed.use && Math.abs(PL.x - BELL.x) < 160) ringBell(PL.face * 1.6);
  PLAY.traverse(o => { const L = o.userData.lantern; if (L) { L.va += (-L.a * 10 - L.va * 1.5 + wind * Math.sin(t * 1.3 + L.x) * 1.2) * dt; L.a += L.va * dt; o.rotation.z = L.a * 0.3; }
    if (o.userData.flicker && o.material) o.material.uniforms.uEmit.value = (o.material.uniforms.uEmit.value * 0 + 0.15 + 0.5 * (N1(t * 6 + o.position.x) - 0.3)); });
  stepDeer(dt, t);
  // the water: what it reflects, and where the waterline sits on screen
  { const v = new THREE.Vector3(POND.x0, POND.top, 8).project(camera); WATER.material.uniforms.uLine.value = v.y * 0.5 + 0.5; WATER.material.uniforms.uRes.value.set(SCREEN.w, SCREEN.h); WATER.material.uniforms.uSunVis.value = SKYU.uSunVis.value + SKYU.uMoonVis.value * 0.5; }
}

/* ---------- the frame ---------- */
let last = performance.now(), T = 0, camX = 900, camY = CAM_Y0;
setQuality(Q.name); if (Q.name === 'phone') { $('qPhone').classList.add('on'); $('qHigh').classList.remove('on'); }
setMood('ink'); MOOD.color = 0;
function frame(now, fixedDt) {
  const dt = fixedDt ?? clamp((now - last) / 1000, 0, 0.05); last = Math.max(last, now); T += dt; U.uTime.value = T;
  if (SKY.dayRun) { SKY.dayT += dt * 0.8; SKY.cache = null; }
  MOOD.color = lerp(MOOD.color, MOOD.target, 1 - Math.exp(-dt * 1.6)); POST.final.uniforms.uColor.value = MOOD.color;
  stepPlayer(dt); const pts = poseRig(dt, T); applySky(dt); stepWorld(dt, T, pts); soundTick();
  for (const k in pressed) pressed[k] = false;
  // the camera follows, a little ahead of where you face, and breathes back from you when you run
  const lookX = clamp(PL.x + PL.face * 140, viewW / 2, WORLD_W - viewW / 2); camX = lerp(camX, lookX, 1 - Math.exp(-dt * 3)); camY = lerp(camY, CAM_Y0 + Math.max(0, PL.y - 60) * 0.6, 1 - Math.exp(-dt * 3));
  const zoom = 1 + (PL.run && Math.abs(PL.vx) > 300 ? 0.04 : 0) + STATE.gust * 0.01; camera.position.set(camX, camY, D * lerp(camera.position.z / D || 1, zoom, 0.05)); camera.lookAt(camX, camY, 0);
  skyMat.uniforms.uRes.value.set(SCREEN.w, SCREEN.h); skyMat.uniforms.uCam.value = camX;
  // draw: the sky, then the world (with the water reading last frame's picture), then the glow, rays and final look
  WATER.material.uniforms.tPrev.value = rtB.texture;
  renderer.setRenderTarget(rtA); renderer.clear(); fsQuad.material = skyMat; renderer.render(fsScene, fsCam); renderer.render(scene, camera);
  POST.bright.uniforms.tScene.value = rtA.texture; pass(POST.bright, rtBright);
  POST.blur.uniforms.tIn.value = rtBright.texture; POST.blur.uniforms.uDir.value.set(1 / rtBlur1.width, 0); pass(POST.blur, rtBlur1);
  for (let i = 0; i < 3; i++) { POST.blur.uniforms.tIn.value = rtBlur1.texture; POST.blur.uniforms.uDir.value.set(0, (1 + i) / rtBlur1.height); pass(POST.blur, rtBlur2); POST.blur.uniforms.tIn.value = rtBlur2.texture; POST.blur.uniforms.uDir.value.set((1 + i) / rtBlur1.width, 0); pass(POST.blur, rtBlur1); }
  POST.rays.uniforms.tIn.value = rtBright.texture; pass(POST.rays, rtRays);
  Object.assign(POST.final.uniforms, {}); POST.final.uniforms.tScene.value = rtA.texture; POST.final.uniforms.tBloom.value = rtBlur1.texture; POST.final.uniforms.tRays.value = rtRays.texture; POST.final.uniforms.uTime.value = T; POST.final.uniforms.uRes.value.set(SCREEN.w, SCREEN.h);
  pass(POST.final, null);
  [rtA, rtB] = [rtB, rtA];
  STATE.fpsN++; STATE.fpsT += dt; if (STATE.fpsT > 0.5) { $('fps').textContent = Math.round(STATE.fpsN / STATE.fpsT) + ' FPS'; STATE.fpsN = 0; STATE.fpsT = 0; }
  $('where').textContent = PL.x < 700 ? 'The village' : PL.x < 1500 ? 'The shrine' : PL.x < 2250 ? 'The old blossom tree' : PL.x < 2950 ? 'The pond' : PL.x < 4300 ? 'The forest path' : 'The gate and the old ruins';
  if (!window.__frozen && fixedDt === undefined) requestAnimationFrame(frame);
}
loading.remove();
window.__look = { PL, held, pressed, SKY, MOOD, STATE, U, setMood, camera, DEER, SCARF, TRAIL, FX, frame: (n = 1) => { for (let i = 0; i < n; i++) frame(last, 1 / 60); }, freeze: v => { window.__frozen = v; if (!v) { last = performance.now(); requestAnimationFrame(frame); } } };
requestAnimationFrame(frame);
