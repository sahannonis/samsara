/* ===== part 2: the sky and the painted world =====
   The sky is drawn by code from the real Sun and Moon. Everything else is stand-in painting made by code on canvases,
   one picture per layer or prop, so real art can replace each one later without touching anything else. */

/* ---------- the sky ---------- */
const SKYU = { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uSun: { value: new THREE.Vector2(0.5, 0.8) }, uMoon: { value: new THREE.Vector2(0.3, 0.7) },
  uSunVis: { value: 1 }, uMoonVis: { value: 0 }, uPhase: { value: 0.5 }, uWaxing: { value: 1 }, uStars: { value: 0 }, uCloud: { value: 0.45 }, uSunCol: { value: new THREE.Color(1, 0.9, 0.7) } };
const skyMat = new THREE.ShaderMaterial({ uniforms: { ...U, ...SKYU, uRes: { value: new THREE.Vector2(4, 4) }, uCam: { value: 0 } }, vertexShader: FS_VERT, depthWrite: false, depthTest: false,
  fragmentShader: `
uniform vec3 uTop, uBot, uSunCol, uAmb; uniform vec2 uSun, uMoon, uRes; uniform float uSunVis, uMoonVis, uPhase, uWaxing, uStars, uCloud, uTime, uWind, uRain, uCam; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  float asp = uRes.x / uRes.y; vec2 p = vec2(vUv.x * asp, vUv.y);
  vec3 col = mix(uBot, uTop, smoothstep(0.12, 0.95, vUv.y));
  // stars, twinkling
  vec2 sp = floor(p * 220.0 + vec2(uCam * 0.004, 0.0)); float st = step(0.9965, h(sp)) * (0.6 + 0.4 * sin(uTime * 3.0 + h(sp) * 50.0));
  col += vec3(0.85, 0.9, 1.0) * st * uStars * smoothstep(0.25, 0.6, vUv.y) * (1.0 - uRain);
  // the sun, its glow
  vec2 sd = vec2((vUv.x - uSun.x) * asp, vUv.y - uSun.y); float sr = length(sd);
  col += uSunCol * (smoothstep(0.034, 0.028, sr) * 5.0 + exp(-sr * 9.0) * 0.55 + exp(-sr * 3.0) * 0.18) * uSunVis * (1.0 - uRain * 0.85);
  // the moon, with its real phase
  vec2 md = vec2((vUv.x - uMoon.x) * asp, vUv.y - uMoon.y); float mr = length(md), disc = smoothstep(0.026, 0.022, mr);
  float k = cos(uPhase * 3.14159265) ; float term = md.x * (uWaxing > 0.5 ? -1.0 : 1.0) / 0.024; float lit = smoothstep(-0.15, 0.15, (term + k * sqrt(max(0.0, 1.0 - pow(md.y / 0.024, 2.0)))) * -1.0);
  float shade = 1.0 - (1.0 - lit) * 0.88; vec3 mcol = vec3(0.92, 0.94, 1.0) * (0.8 + 0.2 * fbm(md * 140.0));
  col = mix(col, mcol * shade * 1.6, disc * uMoonVis * (1.0 - uRain * 0.7)); col += vec3(0.6, 0.7, 1.0) * exp(-mr * 14.0) * 0.35 * uMoonVis * uPhase;
  // clouds, drifting with the wind, lit by the sun or moon
  vec2 cp = vec2(p.x * 1.6 + uTime * (0.006 + uWind * 0.03) + uCam * 0.00012, p.y * 3.2);
  float cl = smoothstep(0.52 - uCloud * 0.25 - uRain * 0.3, 0.85, fbm(cp)) * smoothstep(0.25, 0.55, vUv.y);
  vec3 ccol = mix(uBot * 1.1, vec3(1.0), 0.35) * (0.55 + 0.45 * uAmb) + uSunCol * 0.25 * uSunVis; ccol = mix(ccol, vec3(0.32, 0.34, 0.38) * (0.4 + uAmb * 0.6), uRain);
  col = mix(col, ccol, cl * 0.85);
  col = mix(col, vec3(0.30, 0.32, 0.36) * (0.35 + uAmb * 0.65), uRain * 0.55);
  gl_FragColor = vec4(col, 1.0); }` });

/* ---------- painting helpers ---------- */
function ridge(g, w, h, y0, amp, freq, s) { g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) { const y = y0 - amp * (fbm1(x * freq + s, 5) * 1.6 - 0.3) - amp * 0.6 * Math.pow(Math.max(0, N1(x * freq * 0.35 + s * 3) - 0.55), 2) * 4; g.lineTo(x, y); } g.lineTo(w, h); g.closePath(); }
function strokes(g, w, h, n, col, len, alpha, ang = -0.7) { g.save(); g.strokeStyle = col; g.globalAlpha = alpha; g.lineCap = 'round'; for (let i = 0; i < n; i++) { const x = rnd(0, w), y = rnd(0, h), l = rnd(len * 0.4, len); g.lineWidth = rnd(1, 3.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); g.stroke(); } g.restore(); }
function pagoda(g, cx, by, s, wall, roof, glow) {
  g.save(); g.translate(cx, by); g.scale(s, s);
  const tiers = 4; let y = 0, w = 120;
  for (let i = 0; i < tiers; i++) {
    const th = 34 - i * 3; g.fillStyle = wall; g.fillRect(-w * 0.36, y - th, w * 0.72, th);
    if (glow) { g.fillStyle = glow; for (let k = -1; k <= 1; k++) g.fillRect(k * w * 0.18 - 4, y - th * 0.75, 8, th * 0.45); }
    g.fillStyle = roof; g.beginPath(); g.moveTo(-w * 0.62, y - th + 4); g.quadraticCurveTo(-w * 0.3, y - th - 6, 0, y - th - 18); g.quadraticCurveTo(w * 0.3, y - th - 6, w * 0.62, y - th + 4); g.quadraticCurveTo(w * 0.4, y - th - 2, 0, y - th - 6); g.quadraticCurveTo(-w * 0.4, y - th - 2, -w * 0.62, y - th + 4); g.fill();
    y -= th + 12; w *= 0.8;
  }
  g.fillStyle = roof; g.fillRect(-2, y - 26, 4, 30); g.restore();
}
function treeBlob(g, cx, cy, r, colA, colB, n = 26) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), d = rnd(0, r * 0.8), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7, rr2 = rnd(r * 0.25, r * 0.5); const gr = g.createRadialGradient(x - rr2 * 0.3, y - rr2 * 0.4, 1, x, y, rr2); gr.addColorStop(0, colA); gr.addColorStop(1, colB); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr2, 0, TAU); g.fill(); } }

/* ---------- far: mountains and a temple on the heights (parallax 0.12) ---------- */
const FAR = new THREE.Group(); scene.add(FAR);
{
  const W = 2048, H = 640;
  const tex = paint(W, H, (g) => {
    seed = 11;
    const back = g.createLinearGradient(0, 120, 0, H); back.addColorStop(0, '#8fa2b8'); back.addColorStop(1, 'rgba(170,185,200,0)');
    ridge(g, W, H, 330, 210, 0.0042, 3); g.fillStyle = back; g.fill();
    strokes(g, W, H * 0.6, 500, '#6f8299', 60, 0.09);
    const front = g.createLinearGradient(0, 220, 0, H); front.addColorStop(0, '#5f7085'); front.addColorStop(0.7, 'rgba(120,135,150,0.4)'); front.addColorStop(1, 'rgba(150,165,180,0)');
    ridge(g, W, H, 450, 170, 0.006, 40); g.fillStyle = front; g.fill();
    strokes(g, W, H, 700, '#3f4d5e', 45, 0.08);
    // a temple on a peak, its windows lit at night
    pagoda(g, 1320, 372, 0.62, '#4a5464', '#2f3742', null);
    pagoda(g, 560, 410, 0.42, '#4a5464', '#2f3742', null);
  });
  const glowTex = paint(W, H, (g) => { g.fillStyle = '#ffd890'; for (const [cx, by, s] of [[1320, 372, 0.62], [560, 410, 0.42]]) { let y = 0, w = 120; for (let i = 0; i < 4; i++) { const th = 34 - i * 3; for (let k = -1; k <= 1; k++) g.fillRect(cx + (k * w * 0.18 - 4) * s, by + (y - th * 0.75) * s, 8 * s, th * 0.45 * s); y -= th + 12; w *= 0.8; } } });
  const far = sprite(tex, 3600, 1125, { ax: 0, ay: 0, rim: 0.5, haze: 0.42 }); place(far, -900, 120, 0.12); FAR.add(far);
  const farGlow = sprite(glowTex, 3600, 1125, { ax: 0, ay: 0, rim: 0, nightEmit: 1.4, tint: '#000000', add: true }); place(farGlow, -900, 120, 0.12); farGlow.position.z += 1; FAR.add(farGlow);
}

/* ---------- mid: forested hills, a village of roofs, and a waterfall (parallax 0.35) ---------- */
const MID = new THREE.Group(); scene.add(MID);
{
  const W = 2048, H = 560;
  const tex = paint(W, H, (g) => {
    seed = 23;
    const hill = g.createLinearGradient(0, 160, 0, H); hill.addColorStop(0, '#5e7a5c'); hill.addColorStop(1, '#2e4434');
    ridge(g, W, H, 330, 150, 0.0035, 9); g.fillStyle = hill; g.fill();
    for (let i = 0; i < 90; i++) { const x = rnd(0, W), y = 260 + rnd(0, 200); treeBlob(g, x, y, rnd(18, 34), '#6f9168', '#2b4130', 8); }
    // a cliff for the waterfall
    g.fillStyle = '#4c5650'; g.beginPath(); g.moveTo(1460, H); g.lineTo(1470, 180); g.quadraticCurveTo(1530, 150, 1600, 190); g.lineTo(1640, H); g.fill();
    strokes(g, W, H, 400, '#1f2f24', 30, 0.12, -1.2);
    pagoda(g, 900, 300, 0.5, '#6a5546', '#3a2c25', null); pagoda(g, 380, 330, 0.38, '#6a5546', '#3a2c25', null);
    // village roofs far off
    for (let i = 0; i < 9; i++) { const x = 1700 + i * 34 + rnd(-8, 8), y = 360 + rnd(-10, 10); g.fillStyle = '#5a4436'; g.fillRect(x, y, 26, 16); g.fillStyle = '#33261f'; g.beginPath(); g.moveTo(x - 6, y + 2); g.quadraticCurveTo(x + 13, y - 14, x + 32, y + 2); g.fill(); }
  });
  const glowTex = paint(W, H, (g) => { g.fillStyle = '#ffcf80'; for (let i = 0; i < 9; i++) g.fillRect(1706 + i * 34, 366, 6, 6); for (const [cx, by, s] of [[900, 300, 0.5], [380, 330, 0.38]]) g.fillRect(cx - 4 * s * 2, by - 28 * s, 16 * s, 12 * s); });
  const mid = sprite(tex, 4600, 1258, { ax: 0, ay: 0, rim: 0.7, haze: 0.24 }); place(mid, -900, 40, 0.35); MID.add(mid);
  const midGlow = sprite(glowTex, 4600, 1258, { ax: 0, ay: 0, rim: 0, nightEmit: 1.6, tint: '#000000', add: true }); place(midGlow, -900, 40, 0.35); midGlow.position.z += 1; MID.add(midGlow);
}
/* the waterfall: falling streaks and a cloud of spray, all moving */
const WATERFALL = new THREE.ShaderMaterial({ uniforms: { ...U }, transparent: true, depthWrite: false, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uTime; uniform vec3 uAmb, uHazeCol; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){ float x = vUv.x, y = vUv.y; float edge = smoothstep(0.0, 0.18, x) * smoothstep(1.0, 0.82, x);
    float s = n(vec2(x * 26.0, y * 3.0 + uTime * 2.6)) * 0.6 + n(vec2(x * 60.0, y * 8.0 + uTime * 4.0)) * 0.4;
    float a = edge * (0.55 + 0.45 * s) * smoothstep(0.0, 0.08, y + 0.02);
    vec3 c = mix(vec3(0.75, 0.85, 0.9), vec3(1.0), s) * (0.5 + 0.6 * uAmb); c = mix(c, uHazeCol, 0.25);
    gl_FragColor = vec4(c, a * 0.85); }` });
{ const wf = new THREE.Mesh(new THREE.PlaneGeometry(70, 470), WATERFALL); wf.geometry.translate(0, 235, 0); place(wf, -900 + 1550 * 4600 / 2048 - 30, 40 + (560 - 520) * 1258 / 560 - 20, 0.35); wf.position.z += 2; MID.add(wf);
  const spray = sprite(paint(256, 128, (g) => { const gr = g.createRadialGradient(128, 90, 4, 128, 90, 120); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }), 340, 170, { rim: 0, haze: 0.3, opacity: 0.6 });
  place(spray, -900 + 1550 * 4600 / 2048 - 30, 40 + 70, 0.35); spray.position.z += 3; MID.add(spray); spray.userData.pulse = true; }

/* ---------- near: houses, trees and walls behind the path (parallax 0.72) ---------- */
const NEAR = new THREE.Group(); scene.add(NEAR);
const SWAYERS = [];
function makeTree(kind, w, h) {
  const trunk = paint(256, 512, (g) => { g.fillStyle = kind === 'blossom' ? '#3b2a22' : '#2f2620'; g.beginPath(); g.moveTo(110, 512); g.bezierCurveTo(120, 380, 90, 300, 118, 180); g.lineTo(140, 180); g.bezierCurveTo(130, 300, 160, 380, 150, 512); g.fill();
    g.lineWidth = 9; g.strokeStyle = g.fillStyle; g.lineCap = 'round'; g.beginPath(); g.moveTo(125, 260); g.quadraticCurveTo(70, 200, 40, 170); g.moveTo(132, 230); g.quadraticCurveTo(190, 180, 215, 150); g.stroke(); strokes(g, 256, 512, 40, '#120d0a', 30, 0.3, -1.4); });
  const crown = paint(512, 512, (g) => { seed = (Math.random() * 1e6) | 0; const A = kind === 'blossom' ? '#f6b8c8' : kind === 'gold' ? '#e8c45a' : '#6f9a58', B = kind === 'blossom' ? '#b0506e' : kind === 'gold' ? '#8a6a20' : '#2f4f2a';
    treeBlob(g, 256, 230, 190, A, B, 60); treeBlob(g, 150, 290, 110, A, B, 22); treeBlob(g, 370, 280, 120, A, B, 22); });
  const grp = new THREE.Group();
  const t = sprite(trunk, w * 0.5, h, { ax: 0.5, ay: 0, rim: 0.9 }); const c = sprite(crown, w, w, { ax: 0.5, ay: 0.5, rim: 1.0, sway: 1.0 }); c.position.set(0, h * 0.75, 1);
  grp.add(t, c); SWAYERS.push(c); return grp;
}
function makeHouse(w, h, glowCol) {
  const tex = paint(512, 384, (g) => { g.fillStyle = '#3b2c22'; g.fillRect(70, 150, 372, 234); g.fillStyle = '#6b5240'; g.fillRect(84, 165, 344, 219); g.fillStyle = '#241a14'; for (let i = 0; i < 6; i++) g.fillRect(84 + i * 69, 165, 6, 219);
    g.fillStyle = '#2a1f19'; g.beginPath(); g.moveTo(20, 170); g.quadraticCurveTo(140, 120, 256, 40); g.quadraticCurveTo(372, 120, 492, 170); g.quadraticCurveTo(372, 140, 256, 90); g.quadraticCurveTo(140, 140, 20, 170); g.fill();
    g.fillStyle = '#1a120e'; g.fillRect(150, 230, 70, 90); g.fillRect(300, 230, 70, 90); g.fillRect(232, 270, 48, 114); strokes(g, 512, 384, 120, '#100b08', 26, 0.2, -0.3); });
  const glow = paint(512, 384, (g) => { g.fillStyle = glowCol; g.fillRect(156, 236, 58, 78); g.fillRect(306, 236, 58, 78); });
  const grp = new THREE.Group(); const s = sprite(tex, w, h, { ax: 0.5, ay: 0, rim: 0.8 }); const gl = sprite(glow, w, h, { ax: 0.5, ay: 0, rim: 0, tint: '#000000', nightEmit: 1.5, add: true }); gl.position.z = 1; grp.add(s, gl); return grp;
}
{
  seed = 5;
  const F = 0.72;
  const add = (o, u, v = 0) => { place(o, u, v, F); NEAR.add(o); return o; };
  add(makeHouse(520, 390, '#ffc870'), 120, 10); add(makeHouse(440, 330, '#ffb860'), 520, 20);
  for (const [u, k, s] of [[900, 'green', 1], [1180, 'gold', 0.9], [1700, 'green', 1.2], [2300, 'green', 1.0], [2700, 'gold', 1.1], [3100, 'green', 1.3], [3400, 'green', 1.0], [3700, 'gold', 1.2], [4100, 'green', 1.1]]) add(makeTree(k, 380 * s, 520 * s), u, 0);
  // a low stone wall behind the path
  const wall = paint(1024, 128, (g) => { for (let i = 0; i < 26; i++) { const x = i * 40 + rnd(-4, 4), y = 40 + rnd(-8, 8); g.fillStyle = `hsl(30,8%,${28 + rnd(-5, 8)}%)`; g.beginPath(); g.roundRect(x, y, 42, 88, 8); g.fill(); } strokes(g, 1024, 128, 90, '#1a1612', 20, 0.25, 0.2); });
  add(sprite(wall, 1600, 200, { ax: 0, ay: 0, rim: 0.7 }), 1900, -10); add(sprite(wall, 1600, 200, { ax: 0, ay: 0, rim: 0.7 }), 3300, -10);
}

/* ---------- the ground you walk on (parallax 1) ---------- */
const GROUND_TEX = paint(512, 512, (g) => { seed = 3;
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#5b4a38'); gr.addColorStop(0.15, '#46392c'); gr.addColorStop(1, '#1e1914'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 22; i++) { const x = (i * 23 + rnd(0, 10)) % 512, w = rnd(30, 60); g.fillStyle = `hsl(32,10%,${30 + rnd(-4, 8)}%)`; g.beginPath(); g.roundRect(x, rnd(4, 18), w, rnd(16, 26), 6); g.fill(); }
  g.fillStyle = '#4f6b39'; g.fillRect(0, 0, 512, 6);
  strokes(g, 512, 512, 260, '#0f0c09', 24, 0.18, 0.3); strokes(g, 512, 512, 120, '#7a6650', 14, 0.12, -0.3);
  for (let i = 0; i < 14; i++) { g.strokeStyle = 'rgba(30,22,16,0.6)'; g.lineWidth = rnd(2, 5); g.beginPath(); const x = rnd(0, 512); g.moveTo(x, 40); g.bezierCurveTo(x + rnd(-40, 40), 120, x + rnd(-60, 60), 200, x + rnd(-80, 80), 300); g.stroke(); } });
GROUND_TEX.wrapS = THREE.RepeatWrapping;
{
  const gw = WORLD_W + 2400, geo = new THREE.PlaneGeometry(gw, 760); geo.translate(gw / 2 - 1200, -380, 0);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * gw / 520);
  const m = new THREE.Mesh(geo, spriteMat(GROUND_TEX, { rim: 0.4 })); m.material.uniforms.uTexel.value.set(1 / 512, 1 / 512); m.position.z = -2; m.renderOrder = 2; scene.add(m);
}
/* stone ledges to jump onto */
const LEDGES = [{ x0: 3720, x1: 3900, y: 120 }, { x0: 4020, x1: 4220, y: 240 }, { x0: 4560, x1: 4900, y: 150 }, { x0: 650, x1: 760, y: 60 }];
{
  const tex = paint(512, 160, (g) => { g.fillStyle = '#3c352e'; g.beginPath(); g.roundRect(4, 10, 504, 146, 18); g.fill(); g.fillStyle = '#5c5246'; g.beginPath(); g.roundRect(4, 4, 504, 34, 12); g.fill(); g.fillStyle = '#5a7a3e'; g.fillRect(12, 2, 488, 6); strokes(g, 512, 160, 80, '#15110d', 26, 0.3, 0.4); });
  for (const L of LEDGES) { const s = sprite(tex, L.x1 - L.x0 + 30, 120, { ax: 0, ay: 1, rim: 0.9 }); s.position.set(L.x0 - 15, L.y + 8, -1); s.renderOrder = 3; scene.add(s); }
}
