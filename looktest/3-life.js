/* ===== part 3: places, cloth, water, grass, particles ===== */
const PLAY = new THREE.Group(); scene.add(PLAY);   // things on (or just behind) the path, parallax 1

/* ---------- a soft dot and other small pictures for particles ---------- */
const DOT = paint(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const LEAF = paint(64, 64, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, 32); g.quadraticCurveTo(30, 4, 58, 32); g.quadraticCurveTo(30, 60, 6, 32); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 32); g.lineTo(56, 32); g.stroke(); });
const PETAL = paint(64, 64, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(32, 32, 26, 15, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(40, 32, 10, 8, 0, 0, TAU); g.fill(); });
const STREAK = paint(16, 128, (g) => { const r = g.createLinearGradient(0, 0, 0, 128); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(5, 0, 6, 128); });
const RING = paint(128, 64, (g) => { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.beginPath(); g.ellipse(64, 32, 58, 22, 0, 0, TAU); g.stroke(); });

/* ---------- particles: many small pictures drawn in one go ---------- */
class Particles {
  constructor(max, tex, o = {}) {
    this.max = max; this.list = []; this.o = o;
    const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.setIndex(base.index); g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
    this.P = new Float32Array(max * 4); this.S = new Float32Array(max * 2); this.C = new Float32Array(max * 4);
    g.setAttribute('iP', new THREE.InstancedBufferAttribute(this.P, 4)); g.setAttribute('iS', new THREE.InstancedBufferAttribute(this.S, 2)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(this.C, 4));
    g.instanceCount = 0; this.g = g;
    this.mat = new THREE.ShaderMaterial({ uniforms: { ...U, map: { value: tex }, uLit: { value: o.lit ? 1 : 0 }, uEmit: { value: o.emit ?? 0 } }, transparent: true, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute vec4 iP; attribute vec2 iS; attribute vec4 iC; varying vec2 vUv; varying vec4 vC;
        void main(){ vUv = uv; vC = iC; float c = cos(iP.w), s = sin(iP.w); vec2 q = vec2(position.x * iS.x, position.y * iS.y); q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
          gl_Position = projectionMatrix * viewMatrix * vec4(iP.x + q.x, iP.y + q.y, iP.z, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform float uLit, uEmit; uniform vec3 uAmb, uLightCol; varying vec2 vUv; varying vec4 vC;
        void main(){ vec4 t = texture2D(map, vUv); vec3 c = vC.rgb * t.rgb; if (uLit > 0.5) c = c * (uAmb * 0.85 + uLightCol * 0.25); c *= 1.0 + uEmit; gl_FragColor = vec4(c, t.a * vC.a); }` });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = o.order ?? 30; scene.add(this.mesh);
  }
  add(p) { if (this.list.length < this.max * Q.parts) this.list.push(Object.assign({ x: 0, y: 0, z: 0, vx: 0, vy: 0, r: 0, vr: 0, w: 10, h: 10, life: 1, age: 0, c: [1, 1, 1], a: 1 }, p)); }
  update(dt, fn) {
    const L = this.list; let n = 0;
    for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.age += dt; if (fn) fn(p, dt); else { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; } if (p.age >= p.life || p.dead) L.splice(i, 1); }
    for (const p of L) { if (n >= this.max) break; const k = n * 4, fade = p.fade ? p.fade(p) : Math.min(1, p.age / 0.2, (p.life - p.age) / 0.6);
      this.P[k] = p.x; this.P[k + 1] = p.y; this.P[k + 2] = p.z; this.P[k + 3] = p.r; this.S[n * 2] = p.w; this.S[n * 2 + 1] = p.h; this.C[k] = p.c[0]; this.C[k + 1] = p.c[1]; this.C[k + 2] = p.c[2]; this.C[k + 3] = p.a * clamp(fade, 0, 1); n++; }
    this.g.instanceCount = n; for (const a of ['iP', 'iS', 'iC']) this.g.attributes[a].needsUpdate = true;
  }
}
const FX = {
  leaves: new Particles(260, LEAF, { lit: true, order: 40 }), petals: new Particles(220, PETAL, { lit: true, order: 41 }), dust: new Particles(140, DOT, { lit: true, order: 25 }),
  rain: new Particles(1400, STREAK, { add: true, order: 50 }), splash: new Particles(240, RING, { add: true, order: 26 }), flies: new Particles(120, DOT, { add: true, emit: 2.6, order: 45 }),
  embers: new Particles(160, DOT, { add: true, emit: 2.2, order: 44 }), gusts: new Particles(60, STREAK, { add: true, order: 48 }), sparks: new Particles(80, DOT, { add: true, emit: 3, order: 46 }),
};

/* ---------- cloth: chains and sheets that swing by simple physics (verlet) ---------- */
class Chain {
  constructor(n, seg, x, y) { this.seg = seg; this.p = Array.from({ length: n }, (_, i) => ({ x, y: y - i * seg, px: x, py: y - i * seg })); }
  step(dt, ax, ay, wind, gravity = -900, damp = 0.985, floor = -1e9) {
    const p = this.p; p[0].x = ax; p[0].y = ay; p[0].px = ax; p[0].py = ay;
    for (let i = 1; i < p.length; i++) { const q = p[i], vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp; q.px = q.x; q.py = q.y;
      const wv = wind * (0.6 + 0.4 * Math.sin(U.uTime.value * 3.1 + i * 0.7 + q.x * 0.01)); q.x += vx + wv * dt * dt * 60; q.y += vy + gravity * dt * dt + Math.sin(U.uTime.value * 5 + i) * Math.abs(wind) * dt * dt * 10; if (q.y < floor) q.y = floor; }
    for (let k = 0; k < 6; k++) for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - this.seg) / d; if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; } }
  }
}
/* a ribbon drawn along a chain (scarf, hair, robe tails) */
function ribbonMat(col) { return new THREE.ShaderMaterial({ uniforms: { ...U, uColor: { value: hex(col) } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform vec3 uColor, uAmb, uLightCol; uniform float uTime; varying vec2 vUv; void main(){ float fold = 0.82 + 0.18 * sin(vUv.x * 18.0 + uTime * 2.0); float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
    vec3 c = uColor * (uAmb * 0.9 * fold + uLightCol * 0.22 * (1.0 - vUv.y)); gl_FragColor = vec4(c, 0.96 * mix(0.6, 1.0, edge)); }` }); }
class Ribbon {
  constructor(chain, w0, w1, col, order) { this.c = chain; this.w0 = w0; this.w1 = w1; const n = chain.p.length; this.pos = new Float32Array(n * 2 * 3); const uv = new Float32Array(n * 2 * 2), idx = [];
    for (let i = 0; i < n; i++) { uv.set([i / (n - 1), 0, i / (n - 1), 1], i * 4); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); this.g = g;
    this.mesh = new THREE.Mesh(g, ribbonMat(col)); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; }
  update(z) { const p = this.c.p, n = p.length;
    for (let i = 0; i < n; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l, w = lerp(this.w0, this.w1, i / (n - 1)) / 2;
      this.pos.set([p[i].x + nx * w, p[i].y + ny * w, z, p[i].x - nx * w, p[i].y - ny * w, z], i * 6); }
    this.g.attributes.position.needsUpdate = true; }
}
/* a cloth sheet: a grid of points pinned along the top, for banners */
class Sheet {
  constructor(cols, rows, w, h, x, y, tex) { this.cols = cols; this.rows = rows; this.sx = w / (cols - 1); this.sy = h / (rows - 1); this.x = x; this.y = y; this.p = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const px = x + c * this.sx, py = y - r * this.sy; this.p.push({ x: px, y: py, px, py, pin: r === 0 }); }
    const g = new THREE.PlaneGeometry(w, h, cols - 1, rows - 1); this.g = g; this.mesh = new THREE.Mesh(g, spriteMat(tex, { rim: 0.6 })); this.mesh.material.side = THREE.DoubleSide; this.mesh.frustumCulled = false; }
  step(dt, wind) { const P = this.p, cols = this.cols, t = U.uTime.value;
    for (const q of P) { if (q.pin) continue; const vx = (q.x - q.px) * 0.97, vy = (q.y - q.py) * 0.97; q.px = q.x; q.py = q.y; const wv = wind * (0.7 + 0.5 * Math.sin(t * 2.3 + q.y * 0.02 + q.x * 0.01)) + Math.sin(t * 7 + q.y * 0.05) * wind * 0.3; q.x += vx + wv * dt * dt * 120; q.y += vy - 700 * dt * dt + Math.cos(t * 4 + q.x * 0.04) * Math.abs(wind) * dt * dt * 60; }
    for (let k = 0; k < 5; k++) for (let r = 0; r < this.rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c; if (c < cols - 1) this.link(P[i], P[i + 1], this.sx); if (r < this.rows - 1) this.link(P[i], P[i + cols], this.sy); }
    const pos = this.g.attributes.position; for (let i = 0; i < P.length; i++) pos.setXYZ(i, P[i].x, P[i].y, 0); pos.needsUpdate = true; }
  link(a, b, L) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - L) / d; if (a.pin) { b.x -= dx * f; b.y -= dy * f; } else if (b.pin) { a.x += dx * f; a.y += dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; } }
}

/* ---------- the shrine: roof, pillars, a bell that swings, a fire, glowing lanterns, banners ---------- */
const SHRINE_X = 1000;
const BELL = { x: SHRINE_X, y: 330, a: 0, va: 0 };
{
  const tex = paint(1024, 1024, (g) => { seed = 41;
    g.fillStyle = '#2b241e'; g.fillRect(100, 900, 824, 124); g.fillStyle = '#4a4036'; g.fillRect(130, 880, 764, 40); g.fillStyle = '#3a312a'; g.fillRect(170, 940, 684, 84);
    g.fillStyle = '#5a2a20'; for (const x of [230, 400, 624, 794]) g.fillRect(x - 18, 360, 36, 520);
    g.fillStyle = '#3c2219'; for (const x of [230, 400, 624, 794]) g.fillRect(x - 18, 360, 8, 520);
    g.fillStyle = '#2e2620'; g.fillRect(190, 330, 644, 60); g.fillStyle = '#6d4a2a'; g.fillRect(190, 380, 644, 14);
    g.fillStyle = '#1f2128'; g.beginPath(); g.moveTo(30, 360); g.quadraticCurveTo(250, 300, 512, 120); g.quadraticCurveTo(774, 300, 994, 360); g.quadraticCurveTo(774, 280, 512, 200); g.quadraticCurveTo(250, 280, 30, 360); g.fill();
    g.fillStyle = '#2b2e36'; g.beginPath(); g.moveTo(80, 330); g.quadraticCurveTo(300, 270, 512, 150); g.quadraticCurveTo(724, 270, 944, 330); g.lineTo(944, 340); g.quadraticCurveTo(724, 300, 512, 200); g.quadraticCurveTo(300, 300, 80, 340); g.fill();
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(10,10,14,0.5)'; g.lineWidth = 2; g.beginPath(); const x = 120 + i * 20; g.moveTo(x, 330 - Math.abs(512 - x) * -0.05); g.lineTo(512 + (x - 512) * 0.4, 200); g.stroke(); }
    g.fillStyle = '#c99a3a'; g.fillRect(500, 70, 24, 70); g.beginPath(); g.arc(512, 66, 16, 0, TAU); g.fill();
    // the offering table and the altar flame stand
    g.fillStyle = '#3a2a20'; g.fillRect(420, 760, 184, 24); g.fillRect(436, 784, 20, 96); g.fillRect(568, 784, 20, 96);
    g.fillStyle = '#7a6040'; g.fillRect(470, 720, 84, 40); strokes(g, 1024, 1024, 300, '#120e0b', 30, 0.18, -1.3); });
  const glow = paint(1024, 1024, (g) => { for (const [x, y] of [[300, 520], [724, 520]]) { const r = g.createRadialGradient(x, y, 2, x, y, 40); r.addColorStop(0, 'rgba(255,220,150,1)'); r.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = r; g.fillRect(x - 40, y - 40, 80, 80); }
    g.fillStyle = '#ffd38a'; g.fillRect(484, 700, 56, 20); });
  const s = sprite(tex, 640, 640, { ax: 0.5, ay: 0, rim: 0.9 }); s.position.set(SHRINE_X, -40, -30); s.renderOrder = 5; PLAY.add(s);
  const gl = sprite(glow, 640, 640, { ax: 0.5, ay: 0, rim: 0, tint: '#000000', emit: 0.6, nightEmit: 1.2, add: true }); gl.position.set(SHRINE_X, -40, -29); gl.renderOrder = 6; PLAY.add(gl); gl.userData.flicker = true;
  // lanterns hanging under the eaves, as small swinging glows
  const lan = paint(64, 128, (g) => { g.fillStyle = '#2a1a12'; g.fillRect(30, 0, 4, 30); g.fillStyle = '#c84a2a'; g.beginPath(); g.ellipse(32, 70, 22, 34, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd890'; g.beginPath(); g.ellipse(32, 70, 12, 24, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1a12'; g.fillRect(20, 100, 24, 8); });
  for (const dx of [-250, 250]) { const l = sprite(lan, 40, 80, { ax: 0.5, ay: 1, rim: 0.4, emit: 0.25, nightEmit: 0.9 }); l.position.set(SHRINE_X + dx, 330, -25); l.renderOrder = 7; PLAY.add(l); l.userData.lantern = { a: 0, va: 0, x: SHRINE_X + dx }; }
}
const BELL_MESH = (() => { const t = paint(128, 192, (g) => { g.fillStyle = '#2a1a12'; g.fillRect(60, 0, 8, 50); const r = g.createLinearGradient(0, 50, 128, 50); r.addColorStop(0, '#7a5a20'); r.addColorStop(0.45, '#e8c060'); r.addColorStop(1, '#6a4a18'); g.fillStyle = r; g.beginPath(); g.moveTo(34, 60); g.quadraticCurveTo(64, 36, 94, 60); g.lineTo(110, 170); g.lineTo(18, 170); g.closePath(); g.fill(); g.fillStyle = '#5a3a10'; g.fillRect(14, 166, 100, 10); g.fillStyle = '#3a2a10'; g.beginPath(); g.arc(64, 182, 9, 0, TAU); g.fill(); });
  const m = sprite(t, 56, 84, { ax: 0.5, ay: 1, rim: 1.0, emit: 0.05 }); m.position.set(BELL.x, BELL.y, -24); m.renderOrder = 8; PLAY.add(m); return m; })();
/* the fire in front of the shrine: a living flame, embers rising */
const FLAME = new THREE.Mesh(new THREE.PlaneGeometry(70, 120), new THREE.ShaderMaterial({ uniforms: { ...U }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime, uWind; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){ vec2 p = vUv; p.x += (p.y * p.y) * (uWind * 0.35) * sin(uTime * 3.0); float s = n(vec2(p.x * 5.0, p.y * 4.0 - uTime * 3.2)) * 0.6 + n(vec2(p.x * 11.0, p.y * 9.0 - uTime * 5.0)) * 0.4;
    float shape = smoothstep(0.5, 0.0, abs(p.x - 0.5) * (1.6 + p.y * 1.8)) * smoothstep(1.0, 0.1, p.y + s * 0.35);
    vec3 c = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.85, 0.4), shape) * shape * 3.2; gl_FragColor = vec4(c, shape); }` }));
FLAME.geometry.translate(0, 60, 0); FLAME.position.set(SHRINE_X, 46, -20); FLAME.renderOrder = 9; PLAY.add(FLAME);
{ const bowl = sprite(paint(128, 96, (g) => { g.fillStyle = '#3a3028'; g.beginPath(); g.moveTo(8, 20); g.lineTo(120, 20); g.lineTo(96, 70); g.lineTo(32, 70); g.closePath(); g.fill(); g.fillRect(52, 70, 24, 26); g.fillStyle = '#5a4a3c'; g.fillRect(8, 16, 112, 8); }), 90, 68, { ax: 0.5, ay: 0, rim: 1 }); bowl.position.set(SHRINE_X, 0, -19); bowl.renderOrder = 10; PLAY.add(bowl); }
/* banners: cloth that the wind takes */
const BANNER_TEX = paint(128, 512, (g) => { g.fillStyle = '#8a2a20'; g.fillRect(0, 0, 128, 512); g.fillStyle = '#c9963a'; g.fillRect(0, 0, 128, 14); g.fillRect(0, 498, 128, 14); g.strokeStyle = '#d8b050'; g.lineWidth = 5; g.beginPath(); g.arc(64, 160, 30, 0, TAU); g.moveTo(64, 120); g.lineTo(64, 200); g.moveTo(24, 160); g.lineTo(104, 160); g.stroke();
  g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.moveTo(64 + Math.cos(a) * 36, 300 + Math.sin(a) * 36); g.lineTo(64 + Math.cos(a) * 14, 300 + Math.sin(a) * 14); } g.stroke(); strokes(g, 128, 512, 60, '#4a120e', 30, 0.3, 1.3); });
const SHEETS = [];
{ const pole = paint(16, 256, (g) => { g.fillStyle = '#2a1e16'; g.fillRect(4, 0, 8, 256); g.fillStyle = '#c9963a'; g.fillRect(2, 0, 12, 8); });
  for (const bx of [SHRINE_X - 390, SHRINE_X + 360]) { const p = sprite(pole, 12, 420, { ax: 0.5, ay: 0, rim: 1 }); p.position.set(bx, 0, -15); p.renderOrder = 11; PLAY.add(p);
    const arm = sprite(pole, 70, 8, { ax: 0, ay: 0.5, rim: 1 }); arm.position.set(bx, 410, -15); arm.renderOrder = 11; PLAY.add(arm);
    const sh = new Sheet(5, 12, 52, 190, bx + 8, 405, BANNER_TEX); sh.mesh.position.z = -14; sh.mesh.renderOrder = 12; PLAY.add(sh.mesh); SHEETS.push(sh); } }
/* prayer flags on a rope between the shrine and the old tree */
const FLAGS = { rope: null, flags: [], ribbon: null };
{ const ax = SHRINE_X + 380, bx = 1720, ay = 360, by = 380, n = 16; const ch = new Chain(n, (bx - ax) / (n - 1) * 1.02, ax, ay); ch.p.forEach((q, i) => { q.x = q.px = lerp(ax, bx, i / (n - 1)); q.y = q.py = lerp(ay, by, i / (n - 1)); }); FLAGS.rope = ch; FLAGS.end = { x: bx, y: by };
  FLAGS.ribbon = new Ribbon(ch, 2.2, 2.2, '#2a2018', 13); FLAGS.ribbon.mesh.position.z = 0; PLAY.add(FLAGS.ribbon.mesh);
  const cols = ['#3a6fb0', '#e8e2d0', '#b8382c', '#3e8a4a', '#e0b030'];
  for (let i = 1; i < n - 1; i++) { const t = paint(64, 80, (g) => { g.fillStyle = cols[i % 5]; g.fillRect(4, 0, 56, 72); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(14, 16 + k * 12); g.lineTo(50, 16 + k * 12); g.stroke(); } });
    const f = sprite(t, 30, 38, { ax: 0.5, ay: 1, rim: 0.7, sway: 0 }); f.material.side = THREE.DoubleSide; f.position.z = -12.5; f.renderOrder = 13; PLAY.add(f); FLAGS.flags.push({ m: f, i, a: 0, va: 0 }); } }

/* ---------- the old blossom tree, and the deer beneath it ---------- */
const BLOSSOM_X = 1820;
const BLOSSOM = makeTree('blossom', 640, 760); BLOSSOM.position.set(BLOSSOM_X, -6, -40); BLOSSOM.children.forEach(c => c.renderOrder = 4); PLAY.add(BLOSSOM);
const DEER = { x: 2050, y: 0, face: -1, mode: 'graze', t: 0, head: 0, vx: 0, vy: 0, hop: 0, home: 2050 };
const DEER_G = new THREE.Group(); DEER_G.position.set(DEER.x, 0, -8); PLAY.add(DEER_G);
{
  const body = paint(512, 384, (g) => { g.fillStyle = '#b89a72'; g.beginPath(); g.ellipse(250, 170, 150, 62, 0, 0, TAU); g.fill(); g.fillStyle = '#e8d8b8'; g.beginPath(); g.ellipse(250, 200, 120, 24, 0, 0, TAU); g.fill();
    g.fillStyle = '#f2e6cc'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(170 + rnd(0, 170), 140 + rnd(0, 40), rnd(4, 7), 0, TAU); g.fill(); }
    g.strokeStyle = '#8a6c48'; g.lineCap = 'round'; g.lineWidth = 15; g.beginPath(); for (const x of [150, 175, 330, 355]) { g.moveTo(x, 200); g.lineTo(x + (x > 250 ? 6 : -4), 290); g.lineTo(x + (x > 250 ? 2 : -2), 372); } g.stroke();
    g.fillStyle = '#3a2a1a'; for (const x of [146, 173, 333, 357]) g.fillRect(x - 8, 364, 16, 14); g.fillStyle = '#e8d8b8'; g.beginPath(); g.ellipse(102, 150, 18, 26, -0.4, 0, TAU); g.fill(); strokes(g, 512, 384, 60, '#5a4028', 24, 0.15, -0.4); });
  const head = paint(256, 320, (g) => { g.fillStyle = '#b89a72'; g.beginPath(); g.moveTo(60, 300); g.quadraticCurveTo(70, 200, 120, 170); g.lineTo(150, 186); g.quadraticCurveTo(110, 230, 110, 300); g.fill();
    g.beginPath(); g.ellipse(160, 168, 40, 24, 0.35, 0, TAU); g.fill(); g.fillStyle = '#2a1a12'; g.beginPath(); g.arc(190, 182, 6, 0, TAU); g.fill(); g.beginPath(); g.arc(150, 158, 4, 0, TAU); g.fill();
    g.strokeStyle = '#d9b760'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(130, 150); g.quadraticCurveTo(120, 90, 90, 40); g.moveTo(118, 100); g.lineTo(80, 84); g.moveTo(108, 64); g.lineTo(130, 30); g.moveTo(140, 146); g.quadraticCurveTo(160, 80, 150, 20); g.moveTo(152, 90); g.lineTo(186, 66); g.stroke();
    g.fillStyle = '#a88a62'; g.beginPath(); g.ellipse(118, 162, 10, 22, -1.1, 0, TAU); g.fill(); });
  const glow = paint(256, 320, (g) => { g.strokeStyle = '#bfe4ff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(130, 150); g.quadraticCurveTo(120, 90, 90, 40); g.moveTo(118, 100); g.lineTo(80, 84); g.moveTo(108, 64); g.lineTo(130, 30); g.moveTo(140, 146); g.quadraticCurveTo(160, 80, 150, 20); g.moveTo(152, 90); g.lineTo(186, 66); g.stroke(); });
  const b = sprite(body, 230, 172, { ax: 0.5, ay: 0, rim: 1.1 }); b.renderOrder = 15; DEER_G.add(b);
  const hg = new THREE.Group(); hg.position.set(-58, 90, 1); DEER_G.add(hg); DEER.headG = hg;
  const h = sprite(head, 120, 150, { ax: 0.32, ay: 0.06, rim: 1.1 }); h.renderOrder = 16; hg.add(h);
  const hgl = sprite(glow, 120, 150, { ax: 0.32, ay: 0.06, rim: 0, tint: '#000000', nightEmit: 1.6, emit: 0.04, add: true }); hgl.renderOrder = 17; hg.add(hgl);
  DEER.bodyM = b;
}

/* ---------- stone lanterns along the forest path, a gate, old ruins ---------- */
const STONE_LANTERNS = [3240, 3520, 4400 - 160, 5150];
{ const t = paint(128, 256, (g) => { g.fillStyle = '#5a554c'; g.fillRect(44, 150, 40, 106); g.fillRect(24, 236, 80, 20); g.fillRect(28, 130, 72, 22); g.fillStyle = '#3a3630'; g.fillRect(34, 80, 60, 52); g.fillStyle = '#6a645a'; g.beginPath(); g.moveTo(10, 84); g.quadraticCurveTo(64, 40, 118, 84); g.fill(); g.fillRect(56, 30, 16, 20); strokes(g, 128, 256, 40, '#1a1814', 20, 0.3, -1.4); g.fillStyle = '#1a1612'; g.fillRect(48, 94, 32, 30); });
  const glow = paint(128, 256, (g) => { const r = g.createRadialGradient(64, 109, 2, 64, 109, 26); r.addColorStop(0, 'rgba(255,220,150,1)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(30, 80, 68, 60); });
  for (const x of STONE_LANTERNS) { const s = sprite(t, 64, 128, { ax: 0.5, ay: 0, rim: 1 }); s.position.set(x, -2, -10); s.renderOrder = 14; PLAY.add(s); const gl = sprite(glow, 64, 128, { ax: 0.5, ay: 0, rim: 0, tint: '#000000', emit: 0.15, nightEmit: 1.3, add: true }); gl.position.set(x, -2, -9); gl.renderOrder = 15; PLAY.add(gl); gl.userData.flicker = true; } }
{ const torii = paint(512, 512, (g) => { g.fillStyle = '#9a2e22'; g.fillRect(110, 120, 34, 392); g.fillRect(368, 120, 34, 392); g.fillRect(70, 170, 372, 26); g.fillStyle = '#1e1e22'; g.beginPath(); g.moveTo(20, 110); g.quadraticCurveTo(256, 70, 492, 110); g.lineTo(482, 132); g.quadraticCurveTo(256, 96, 30, 132); g.closePath(); g.fill(); g.fillStyle = '#7a2218'; g.fillRect(110, 120, 8, 392); g.fillRect(368, 120, 8, 392); strokes(g, 512, 512, 80, '#2a0a06', 30, 0.25, -1.4); });
  const s = sprite(torii, 420, 420, { ax: 0.5, ay: 0, rim: 1 }); s.position.set(4420, -4, -26); s.renderOrder = 4; PLAY.add(s);
  const ruin = paint(1024, 512, (g) => { g.fillStyle = '#4a4640'; for (const [x, h] of [[90, 380], [300, 250], [520, 420], [760, 180]]) { g.fillRect(x, 512 - h, 80, h); g.fillStyle = '#5c574f'; g.fillRect(x - 10, 512 - h - 18, 100, 22); g.fillStyle = '#4a4640'; }
    g.fillRect(50, 470, 900, 42); g.fillStyle = '#5a7a3e'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(rnd(40, 980), rnd(80, 500), rnd(4, 14), 0, TAU); g.fill(); } strokes(g, 1024, 512, 220, '#1a1814', 26, 0.25, -1.4); });
  const r = sprite(ruin, 900, 450, { ax: 0.5, ay: 0, rim: 1 }); r.position.set(4980, -8, -45); r.renderOrder = 3; PLAY.add(r); }

/* ---------- grass: thousands of blades that sway with the wind and part around you ---------- */
const GRASS = (() => {
  const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]), 3)); blade.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
  const make = (n, z, hMin, hMax, order) => { const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', blade.attributes.position); g.setAttribute('uv', blade.attributes.uv); const A = new Float32Array(n * 4); let k = 0;
    for (let i = 0; i < n; i++) { const x = rr(-400, WORLD_W + 400); if (x > 2240 && x < 2960) continue; A.set([x, rr(hMin, hMax), rr(4, 9), Math.random()], k * 4); k++; }
    g.setAttribute('iB', new THREE.InstancedBufferAttribute(A, 4)); g.instanceCount = k;
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...U }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 iB; uniform float uTime, uWind, uGust; uniform vec3 uPlayer; varying float vH; varying float vS;
        void main(){ vH = uv.y; vS = iB.w; float h = iB.y * uv.y; vec2 p = vec2(iB.x + position.x * iB.z, h);
          float s = sin(uTime * 2.1 + iB.x * 0.02) * 0.5 + sin(uTime * 4.7 + iB.x * 0.07 + iB.w * 6.0) * 0.25;
          float bend = (s * (0.3 + uWind) + uWind * 0.8 + uGust * 2.0) * uv.y * uv.y * iB.y * 0.35;
          float d = iB.x - uPlayer.x; float push = exp(-d * d / 1800.0) * step(uPlayer.y, 30.0) * sign(d) * 18.0 * uv.y;
          p.x += bend + push; p.y -= abs(push) * 0.3;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, ${z.toFixed(1)}, 1.0); }`,
      fragmentShader: `uniform vec3 uAmb, uLightCol; varying float vH; varying float vS; void main(){ vec3 root = vec3(0.16, 0.22, 0.10), tip = mix(vec3(0.42, 0.56, 0.24), vec3(0.62, 0.58, 0.28), vS * 0.6);
        vec3 c = mix(root, tip, vH); c = c * uAmb * 0.95 + c * uLightCol * vH * 0.35; gl_FragColor = vec4(c, 1.0); }` }));
    m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };
  return [make(5000, -4, 14, 40, 18), make(2600, 6, 8, 22, 60)];
})();

/* ---------- the pond: it mirrors the world above it, and ripples when you wade or when rain falls ---------- */
const POND = { x0: 2250, x1: 2950, top: 14 };
const RIPS = Array.from({ length: 16 }, () => new THREE.Vector4(0, -100, 0, 0)); let ripI = 0;
function ripple(x, s = 1) { RIPS[ripI].set(x, U.uTime.value, s, 0); ripI = (ripI + 1) % RIPS.length; }
const WATER = new THREE.Mesh(new THREE.PlaneGeometry(POND.x1 - POND.x0, 110), new THREE.ShaderMaterial({
  uniforms: { ...U, tPrev: { value: null }, uRes: { value: new THREE.Vector2(4, 4) }, uLine: { value: 0.2 }, uRips: { value: RIPS }, uSunScr: { value: new THREE.Vector2(0.5, 0.8) }, uSunVis: { value: 1 } },
  transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D tPrev; uniform vec2 uRes, uSunScr; uniform float uLine, uTime, uWind, uRain, uSunVis; uniform vec4 uRips[16]; uniform vec3 uAmb, uHazeCol, uLightCol; varying vec2 vUv; varying vec3 vW;
    void main(){ vec2 s = gl_FragCoord.xy / uRes; float depth = 1.0 - vUv.y;
      float wave = sin(vW.x * 0.045 + uTime * 1.6) * 0.5 + sin(vW.x * 0.11 - uTime * 2.3) * 0.3;
      float ring = 0.0;
      for (int i = 0; i < 16; i++) { vec4 r = uRips[i]; float age = uTime - r.y; if (age < 0.0 || age > 2.2) continue; float d = length(vec2(vW.x - r.x, (vUv.y - 1.0) * 120.0 * 3.0)); float rad = age * 90.0 * r.z;
        ring += smoothstep(6.0, 0.0, abs(d - rad)) * (1.0 - age / 2.2) * r.z; }
      vec2 ruv = vec2(s.x + (wave * 0.003 + ring * 0.004) * (0.4 + depth), 2.0 * uLine - s.y + wave * 0.004 * depth);
      vec3 refl = texture2D(tPrev, clamp(ruv, 0.001, 0.999)).rgb;
      vec3 deep = mix(vec3(0.05, 0.12, 0.16), uHazeCol * 0.35, 0.3) * (0.4 + 0.6 * uAmb);
      float fres = mix(0.85, 0.25, smoothstep(0.0, 1.0, depth));
      vec3 c = mix(deep, refl * vec3(0.82, 0.92, 1.0), fres);
      c += uLightCol * pow(max(0.0, sin(vW.x * 0.09 + uTime * 2.0 + wave * 3.0)), 30.0) * (1.0 - depth) * 0.6 * uSunVis;
      c += vec3(0.9) * ring * 0.18 * (0.4 + uAmb);
      float top = smoothstep(0.0, 0.02, 1.0 - vUv.y); c += vec3(0.85, 0.9, 1.0) * (1.0 - top) * 0.35 * (0.4 + uAmb);
      float ends = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x); float shore = 1.0 - ends;
      c = mix(c, vec3(0.32, 0.28, 0.22) * (0.5 + 0.5 * uAmb), shore * 0.5 * depth);
      gl_FragColor = vec4(c, mix(0.96, 0.82, 1.0 - depth) * mix(0.25, 1.0, ends)); }` }));
WATER.geometry.translate((POND.x1 - POND.x0) / 2, -110 / 2 + POND.top, 0); WATER.position.set(POND.x0, 0, 8); WATER.renderOrder = 70; scene.add(WATER);

/* ---------- mist that drifts across the land ---------- */
function mistMat(alpha) { return new THREE.ShaderMaterial({ uniforms: { ...U, uA: { value: alpha } }, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uTime, uWind, uA, uRain; uniform vec3 uHazeCol, uAmb; varying vec2 vUv; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * n(p); p *= 2.1; a *= 0.5; } return s; }
    void main(){ vec2 p = vW.xy * 0.0016 + vec2(uTime * (0.01 + uWind * 0.05), 0.0); float m = fbm(p) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
      vec3 c = mix(uHazeCol, vec3(1.0), 0.35) * (0.45 + 0.55 * uAmb); gl_FragColor = vec4(c, m * (uA + uRain * 0.15)); }` }); }
const MISTS = [];
{ const a = new THREE.Mesh(new THREE.PlaneGeometry(5200, 520), mistMat(0.5)); a.geometry.translate(2600, 150, 0); place(a, -600, 40, 0.5); a.renderOrder = 0; scene.add(a); MISTS.push(a);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(9000, 260), mistMat(0.28)); b.geometry.translate(4300, 80, 0); b.position.set(-1500, -60, 40); b.renderOrder = 75; scene.add(b); MISTS.push(b); }

/* ---------- the front layer: dark leaves and ferns close to the eye (parallax 1.35) ---------- */
{ const leaves = paint(512, 512, (g) => { for (let i = 0; i < 60; i++) { const x = rnd(0, 512), y = rnd(0, 300), a = rnd(0, TAU), s = rnd(30, 70); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `hsl(${rnd(90, 120)},25%,${rnd(8, 16)}%)`; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.5, -s * 0.35, s, 0); g.quadraticCurveTo(s * 0.5, s * 0.35, 0, 0); g.fill(); g.restore(); }
    g.strokeStyle = '#120e0a'; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 40); g.quadraticCurveTo(200, 120, 460, 60); g.stroke(); });
  const fern = paint(512, 384, (g) => { for (let k = 0; k < 9; k++) { const bx = rnd(30, 480); g.strokeStyle = `hsl(${rnd(90, 120)},22%,${rnd(7, 13)}%)`; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, 384); const tx = bx + rnd(-120, 120), ty = rnd(40, 160); g.quadraticCurveTo(bx, ty + 80, tx, ty); g.stroke();
      for (let i = 0; i < 14; i++) { const t = i / 14, x = lerp(bx, tx, t), y = lerp(384, ty, t); g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26 * (1 - t), y - 14); g.moveTo(x, y); g.lineTo(x + 26 * (1 - t), y - 14); g.stroke(); } } });
  const F = 1.35;
  for (const [u, v, w, h, tex, ay] of [[200, 860, 900, 700, leaves, 0.4], [2300, 880, 800, 640, leaves, 0.4], [4300, 860, 900, 700, leaves, 0.4], [700, -150, 460, 340, fern, 0], [2100, -160, 420, 300, fern, 0], [3600, -150, 460, 340, fern, 0], [5200, -150, 440, 330, fern, 0], [6500, -150, 440, 330, fern, 0]]) {
    const s = sprite(tex, w, h, { ax: 0.5, ay, rim: 0.5, sway: 0.6 }); place(s, u, v, F); s.renderOrder = 90; scene.add(s); SWAYERS.push(s); }
}

/* ---------- soft shadows on the ground, long when the sun is low ---------- */
const SHADOW_TEX = paint(128, 64, (g) => { const r = g.createRadialGradient(64, 32, 2, 64, 32, 60); r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.save(); g.scale(1, 0.5); g.fillRect(0, 0, 128, 128); g.restore(); });
function shadow(w) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.25), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, opacity: 0.5 })); m.renderOrder = 19; scene.add(m); return m; }
