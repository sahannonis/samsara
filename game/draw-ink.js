/* ---------- Samsara: the ink drawing ----------
   Everything that paints the screen. The game's rules, physics and saving never draw; this file only reads
   the game's state and draws it with the 2D canvas, in ink. A three.js drawing will sit beside it later and
   draw the same state with painted layers, light and depth. build.py puts this file into the game at DRAW. */
const FD = '"Rubik Mono One","Arial Black",sans-serif', FH = '"Kalam","Comic Sans MS",cursive', FM = '"DM Mono",ui-monospace,monospace';
const HUT = LEVEL.places.hut;
const HINTS = LEVEL.hints;
let ctx = mainCtx;
// at night, living things are drawn on their own layer and given a pale moonlit edge so they stand out
const uLayer = document.createElement('canvas'), uctx = uLayer.getContext('2d');
let unitsPending = false;
function drawDog() {
  const x = DOG.x, g = DOG.gy, fed = life && life.fedDog, ph = clock * (fed ? 10 : 2);
  ctx.strokeStyle = INK2; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  if (fed) { ctx.ellipse(x, g - 7, 15, 6, 0, 0, Math.PI * 2); ctx.moveTo(x + 13, g - 9); ctx.lineTo(x + 20, g - 15); ctx.moveTo(x - 15, g - 7); ctx.lineTo(x - 22, g - 12 + Math.sin(ph) * 4); }
  else { ctx.moveTo(x - 14, g - 14); ctx.lineTo(x + 10, g - 15); ctx.moveTo(x - 12, g - 14); ctx.lineTo(x - 14, g); ctx.moveTo(x - 8, g - 14); ctx.lineTo(x - 7, g); ctx.moveTo(x + 6, g - 15); ctx.lineTo(x + 5, g); ctx.moveTo(x + 9, g - 15); ctx.lineTo(x + 11, g); ctx.moveTo(x + 10, g - 15); ctx.lineTo(x + 17, g - 22); ctx.moveTo(x - 14, g - 14); ctx.lineTo(x - 20, g - 9); for (let i = 0; i < 3; i++) { ctx.moveTo(x - 6 + i * 5, g - 15); ctx.lineTo(x - 7 + i * 5, g - 11); } }
  ctx.stroke(); ctx.fillStyle = INK2; ctx.beginPath(); ctx.ellipse(fed ? x + 21 : x + 19, fed ? g - 15 : g - 23, 5, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
}
function drawDebt() {
  if (!soul.debt || !life.debtGhost) return;
  const d = soul.debt, kind = d.kind; ctx.save(); ctx.globalAlpha = 0.45 + 0.15 * Math.sin(clock * 2);
  if (kind === 'pride' || kind === 'lie') stick(d.x, d.gy, POSE.idle(clock), -1, PENCIL, P.looks.build, { hair: P.looks.hair, robe: P.looks.robe });
  else if (kind === 'greed') { ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(d.x, d.gy - 40, 14, 20, 0, 0, Math.PI * 2); ctx.moveTo(d.x - 14, d.gy - 36); ctx.quadraticCurveTo(d.x - 26, d.gy - 10, d.x - 8, d.gy); ctx.moveTo(d.x + 14, d.gy - 36); ctx.quadraticCurveTo(d.x + 26, d.gy - 10, d.x + 8, d.gy); ctx.moveTo(d.x - 3, d.gy - 30); ctx.lineTo(d.x + 3, d.gy - 30); ctx.stroke(); }
  else stick(d.x, d.gy, POSE.kneel(), -1, PENCIL, 3, { hollow: true });
  ctx.restore();
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
function drawSeat() {
  const x = SEAT.x, g = SEAT.gy; ctx.strokeStyle = INK; ctx.fillStyle = PAPER; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(x, g - 6, 28, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = -Math.PI + i / 7 * Math.PI; ctx.moveTo(x + Math.cos(a) * 14, g - 12 + Math.sin(a) * 8); ctx.quadraticCurveTo(x + Math.cos(a) * 26, g - 14 + Math.sin(a) * 22, x + Math.cos(a) * 30, g - 10 + Math.sin(a) * 12); } ctx.stroke();
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

function drawStone(st) {
  const x = st.x, g = st.gy, night = isNight();
  ctx.fillStyle = st.k === 'moon' && night && !soul.spells.has('tide') ? '#f3f0e7' : PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 18, g); ctx.lineTo(x - 15, g - 48); ctx.quadraticCurveTo(x, g - 62, x + 15, g - 48); ctx.lineTo(x + 18, g); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (st.k === 'sun') { const hot = sunAlt() >= 20 && !soul.spells.has('surya'); ctx.arc(x, g - 34, 6, 0, Math.PI * 2); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(x + Math.cos(a) * 9, g - 34 + Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a) * 13, g - 34 + Math.sin(a) * 13); } ctx.stroke(); if (hot) { ctx.strokeStyle = RED; ctx.beginPath(); ctx.arc(x, g - 34, 22 + Math.sin(clock * 3) * 3, 0, Math.PI * 2); ctx.stroke(); } }
  else if (st.k === 'moon') { ctx.arc(x, g - 34, 9, 0.6, Math.PI * 2 - 0.6); ctx.stroke(); if (night && !soul.spells.has('tide')) { ctx.strokeStyle = PENCIL; ctx.beginPath(); ctx.arc(x, g - 34, 22 + Math.sin(clock * 3) * 3, 0, Math.PI * 2); ctx.stroke(); } }
  else { for (let i = 0; i < 4; i++) { ctx.moveTo(x - 9, g - 42 + i * 8); ctx.lineTo(x + 9 - (i % 2) * 6, g - 42 + i * 8); } ctx.stroke(); }
}
function drawForge(f) {
  const x = f.x, g = f.gy;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(x - 26, g - 36, 22, 36); hatch(x - 26, g - 36, 22, 36, 5); ctx.strokeRect(x - 26, g - 36, 22, 36);
  const fl = 8 + Math.sin(clock * 11 + x) * 2; ctx.fillStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 15, g - 38 - fl * 1.8); ctx.quadraticCurveTo(x - 6, g - 40, x - 15, g - 36); ctx.quadraticCurveTo(x - 24, g - 40, x - 15, g - 38 - fl * 1.8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(x + 2, g - 26); ctx.lineTo(x + 34, g - 26); ctx.lineTo(x + 28, g - 18); ctx.lineTo(x + 8, g - 18); ctx.closePath(); ctx.fill(); ctx.fillRect(x + 13, g - 18, 10, 18); ctx.fillRect(x + 6, g - 4, 24, 4);
  ctx.font = `12px ${FD}`; ctx.fillStyle = PENCIL; ctx.textAlign = 'center'; ctx.fillText('FORGE', x + 4, g - 70);
}
/* ---------- the real sky: the Sun, Moon and stars for the player's own place and time ---------- */
const HORIZON = 400;
function skyXY(b) { const a = b.alt * Math.PI / 180, z = b.az * Math.PI / 180; let x = -Math.cos(a) * Math.sin(z); if (SKY.lat < 0) x = -x; return { x: W / 2 + x * W * 0.47, y: HORIZON - Math.sin(a) * (HORIZON - 165) }; }
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
  if (V3.on()) return;
  paintSky(); if (!skyCv.width || !skyCv.height) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-over'; ctx.drawImage(skyCv, 0, 0); ctx.restore();
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
const chestOpen = c => !!c.opened;
function drawHome() {
  const x = HOME.x, g = HOME.gy;
  ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(x - 22, g - 26, 44, 26); hatch(x - 22, g - 26, 44, 26, 5); ctx.strokeRect(x - 22, g - 26, 44, 26);
  ctx.beginPath(); ctx.moveTo(x - 24, g - 26); ctx.quadraticCurveTo(x, g - 42, x + 24, g - 26); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, g - 14); for (let i = 1; i <= 4; i++) ctx.lineTo(x - 10 + i * 5, g - 14 + (i % 2 ? 3 : -2)); ctx.stroke();
  ctx.font = `11px ${FD}`; ctx.fillStyle = PENCIL; ctx.textAlign = 'center'; ctx.fillText('YOUR CHEST', x, g - 50);
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
  const painted = V3.on();
  // far hills
  if (!painted) { ctx.save(); ctx.translate(-camX * 0.3, -camY * 0.3); ctx.strokeStyle = FAINT; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -200; x < LW * 0.4 + W; x += 40) ctx.lineTo(x, 520 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.017) * 14);
  ctx.stroke(); ctx.restore(); }
  ctx.save(); ctx.translate(-camX, -camY);
  if (!painted) {
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
  } else for (const c of CRUMBLES) if (visible(c) && c.state === 'gone') { ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(239,231,212,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(c.x + 3, c.y, c.w - 6, c.h); ctx.restore(); }
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
  if (!painted) for (const w of WATERS) if (visible(w)) {
    ctx.fillStyle = `rgba(${Math.round(140 - 90 * colorK)},${Math.round(137 + 3 * colorK)},${Math.round(127 + 80 * colorK)},${0.22 + 0.1 * colorK})`; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.2; ctx.beginPath(); for (let y = w.y + 30; y < w.y + w.h; y += 34) for (let x = w.x + ((y * 3) % 50); x < w.x + w.w - 20; x += 90) { ctx.moveTo(x, y); ctx.lineTo(x + 18, y); } ctx.stroke();
    if (w.top) { ctx.strokeStyle = INK2; ctx.lineWidth = 2; ctx.beginPath(); for (let x = w.x; x <= w.x + w.w; x += 8) { const yy = w.y + Math.sin(x * 0.05 + clock * 3) * 2.5; if (pointSolid(x, w.y + 4) || pointSolid(x - 8, w.y + 4)) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
  }
  for (const n of NODES) if (n.k === 'petal' && visible({ x: n.x - 20, y: n.gy - 30, w: 40, h: 40 })) drawNode(n);
  // false walls hide what is behind them
  for (const f of FAKES) if (visible(f)) {
    const see = f.found || has('bead') || pathAt('jnana') >= 1;
    if (!painted) { ctx.save(); ctx.globalAlpha = overlap(P, f) ? 0.25 : see ? 0.55 : 1;
    ctx.fillStyle = PAPER; ctx.fillRect(f.x, f.y, f.w, f.h); hatch(f.x, f.y, f.w, f.h, 13); ctx.restore(); }
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
function playerPose(p) {
  const feet = p.y + p.h;
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
  return { pose, ay };
}
function drawPlayerBody(p) {
  const cx = (p.x + p.w / 2), feet = p.y + p.h, { pose, ay } = playerPose(p);
  const painted = V3.on() && !p.mount && p === P && V3.joints();
  ctx.save(); if (p.dead) { ctx.translate(cx, feet); ctx.rotate(-p.face * Math.min(1, p.deadT * 2) * Math.PI / 2); ctx.translate(-cx, -feet); ctx.globalAlpha = Math.max(0.2, 1 - p.deadT * 0.5); }
  if (p.mount) drawHorse(cx, feet, p.face, p.run * 0.6, Math.abs(p.vx) > 25 && p.onG, { saddle: true, ink: p.hitT > 0 ? PENCIL : INK });
  if (p.shieldT > 0) { ctx.fillStyle = PAPER; const sx = cx + p.face * (p.mount ? 40 : 26) - 9; ctx.fillRect(sx, feet - 70, 18, 70); hatch(sx, feet - 70, 18, 70, 5); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(sx, feet - 70, 18, 70); }
  if (p.plunge) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(cx + i * 10, p.y - 10); ctx.lineTo(cx + i * 10, p.y - 40); } ctx.stroke(); }
  const robe = p.garb.body === 'robe' && p.rollT <= 0 && p.onG && !p.crouch && !p.inWater && !p.mount;
  // painted: the body, cloth, garb, torch and weapon are drawn by three.js; the ink adds only the marks and rings
  const r = painted ? V3.joints() : stick(p.mount ? cx - p.face * 6 : cx, ay, pose, p.face, INK, p.looks.build, { hair: p.garb.head === 'helm' || p.garb.head === 'hat' ? 0 : p.looks.hair, robe, eye: true });
  if (!painted) {
  // soul mark: scarf
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(r.neck.x, r.neck.y + 2); for (let i = 1; i <= 4; i++) ctx.lineTo(r.neck.x - p.face * i * 6, r.neck.y + 2 + i * (p.glide ? 0.5 : p.mount && Math.abs(p.vx) > 200 ? 0.3 : 2.5) + Math.sin(clock * 12 + i) * 1.5); ctx.stroke();
  drawGarb(p, r);
  }
  if (soul.mark && !p.dead) drawMark(soul.mark, r.neck.x + (r.hip.x - r.neck.x) * 0.32, r.neck.y + (r.hip.y - r.neck.y) * 0.32, 0.6, PAPER);
  if (p.glide && !p.dead) { ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r.hB.x - p.face * 6, r.hB.y); ctx.quadraticCurveTo(cx, r.head.y - 40, r.hF.x + p.face * 6, r.hF.y); ctx.quadraticCurveTo(cx, r.head.y - 22, r.hB.x - p.face * 6, r.hB.y); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, r.head.y - 30); ctx.lineTo(cx, r.head.y - 22); ctx.stroke(); }
  if (p.torch.lit && !p.dead && !painted) { const tx = r.hB.x, ty = r.hB.y; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx - p.face * 4, ty - 14); ctx.stroke(); const fl = 7 + Math.sin(clock * 15) * 2, fx0 = tx - p.face * 4, fy0 = ty - 15; ctx.fillStyle = PAPER; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(fx0, fy0 - fl * 1.6); ctx.quadraticCurveTo(fx0 + 6, fy0 - 2, fx0, fy0 + 1); ctx.quadraticCurveTo(fx0 - 6, fy0 - 2, fx0, fy0 - fl * 1.6); ctx.fill(); ctx.stroke(); }
  if (!painted && !p.dead && !p.ladder && !p.hang && p.climbT <= 0 && !(p.inWater && !p.onG) && !p.glide) drawWeapon(p, r);
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
  if (savedFx > 0) { ctx.save(); ctx.globalAlpha = clamp(savedFx, 0, 1) * 0.8; ctx.font = `10px ${FD}`; ctx.fillStyle = INK2; ctx.textAlign = 'right'; ctx.fillText('SAVED', W - 18, H - 14); ctx.restore(); }
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
  const painted = V3.on();
  if (!painted) { ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.beginPath(); for (let y = 40 - (camY * 0.5) % 34; y < H; y += 34) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); } ctx.stroke(); }
  if (!P) return;
  if (mode === 'meditate' && MED) { drawMed(); return; }
  if (mode === 'map') { drawMap(); cv.style.cursor = mapHits.some(m => P.visited.has(m.i) && Math.hypot(mouse.x - m.x, mouse.y - m.y) < 18) ? 'pointer' : 'default'; return; }
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) * 0.6 : 0;
  if (painted) V3.frame(sx, sy);
  ctx.save(); ctx.translate(sx, sy); drawWorld(); ctx.restore();
  drawSkyBehind();
  if (unitsPending && (!uLayer.width || !uLayer.height)) unitsPending = false;
  if (unitsPending) { unitsPending = false; const g = mainCtx; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.shadowColor = 'rgba(251,250,246,0.95)'; g.shadowBlur = 6 * scale; g.drawImage(uLayer, 0, 0); g.shadowBlur = 2 * scale; g.drawImage(uLayer, 0, 0); g.restore(); }
  drawDark(); drawOverDark();
  drawHUD();
  cv.style.cursor = mode === 'play' && mouse.in ? 'none' : mode === 'map' && mapHits.some(m => P.visited.has(m.i) && Math.hypot(mouse.x - m.x, mouse.y - m.y) < 18) ? 'pointer' : 'default';
  if (mode === 'play' && mouse.in) { const dkc = darkAt(mouse.x + camX, mouse.y + camY); ctx.strokeStyle = dkc ? PAPER : INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, Math.PI * 2); ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x - 5, mouse.y); ctx.moveTo(mouse.x + 5, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y); ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y - 5); ctx.moveTo(mouse.x, mouse.y + 5); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke(); }
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

// draw a soul mark into a small canvas of its own (the creation screen's mark buttons)
function drawMarkInto(cv2, mk) { const g = cv2.getContext('2d'), old = ctx; ctx = g; g.setTransform(2, 0, 0, 2, 0, 0); drawMark(mk, 11, 11, 1, INK); ctx = old; }
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
