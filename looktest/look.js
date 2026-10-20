/* Samsara look test: the game's look drawn with three.js.
   Gameplay stays on one flat plane (z = 0). The world is built from flat painted layers at real depths, so the
   camera's movement gives true parallax. Light, weather, cloth, hair, water and the ink-to-color filter are all
   made by code. Every painted thing here is a stand-in drawn with the 2D canvas, to be replaced by real art
   following the Art guide (same layers, same sizes). */
const THREE = await import(URL.createObjectURL(new Blob([document.getElementById('threeSrc').textContent], { type: 'text/javascript' })));
const $ = id => document.getElementById(id);
window.addEventListener('error', e => { $('err').textContent = String(e.message || e); });

/* ---------- basics ---------- */
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
let LOW = false;            // light mode for phones: half the effects, lower resolution
const VIEW_H = 600, FOV = 32, D = (VIEW_H / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const LEVEL_L = 0, LEVEL_R = 4300;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 40000);
camera.position.set(300, 170, D);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// a seeded random, so the stand-in painting is the same every time
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// smooth 1D noise for ridgelines
function noise1(seed) { const r = rng(seed), v = Array.from({ length: 512 }, r); return x => { const i = Math.floor(x), f = x - i, a = v[((i % 512) + 512) % 512], b = v[(((i + 1) % 512) + 512) % 512], t = f * f * (3 - 2 * f); return a + (b - a) * t; }; }
const fbm1 = (n, x, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f); a *= 0.5; f *= 2.03; } return s; };

/* ---------- shared light and weather, read by every material ---------- */
const U = {
  uTime: { value: 0 }, uWind: { value: 0.3 }, uAmb: { value: new THREE.Color(1, 1, 1) }, uFogCol: { value: new THREE.Color(0.8, 0.85, 0.9) },
  uNight: { value: 0 }, uRain: { value: 0 }, uPlayer: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color(1, 0.95, 0.85) },
};
const NIGHT_GLOWS = [];   // glows that wake as the light goes: windows, lanterns
// how far a layer is: points at depth z appear (D / (D - z)) as large and move that much as fast
const depthK = z => (D - z) / D;
// world y for a layer at depth z that should appear at a screen height (units from the screen's middle) for the usual camera height
const CAM_Y0 = 170;
const atScreen = (z, sy) => CAM_Y0 + sy * depthK(z);

/* ---------- materials ---------- */
const VS_SPRITE = `
uniform float uTime; uniform float uWind; uniform float uSway; uniform float uPhase;
varying vec2 vUv;
void main() {
  vUv = uv; vec4 p = vec4(position, 1.0);
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  #endif
  vec4 wp = modelMatrix * p;
  float bend = uSway * pow(uv.y, 2.0);
  float w = uWind + 0.35 * sin(uTime * 1.6 + uPhase + wp.x * 0.004) + 0.12 * sin(uTime * 3.7 + uPhase * 2.3);
  p.x += bend * w; p.y -= bend * abs(w) * 0.12;
  gl_Position = projectionMatrix * modelViewMatrix * p;
}`;
const FS_SPRITE = `
uniform sampler2D map; uniform vec3 uAmb; uniform vec3 uFogCol; uniform float uFog; uniform float uDark; uniform vec3 uTint; uniform float uOpacity; uniform float uNight;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vUv); if (t.a < 0.015) discard;
  vec3 c = t.rgb * uTint * uAmb * (1.0 - uDark);
  c = mix(c, uFogCol, uFog * (1.0 - 0.25 * uNight));
  gl_FragColor = vec4(c, t.a * uOpacity);
}`;
function spriteMat(map, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, map: { value: map }, uSway: { value: o.sway || 0 }, uPhase: { value: o.phase ?? Math.random() * 6 }, uFog: { value: o.fog || 0 }, uDark: { value: o.dark || 0 }, uTint: { value: new THREE.Color(o.tint || 0xffffff) }, uOpacity: { value: o.opacity ?? 1 } },
    vertexShader: VS_SPRITE, fragmentShader: FS_SPRITE, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
// glow: a soft additive light, bright enough to bloom
const FS_GLOW = `
uniform vec3 uColor; uniform float uPower; uniform float uTime; uniform float uFlicker; uniform float uNight;
varying vec2 vUv;
void main() {
  float d = length(vUv * 2.0 - 1.0); if (d > 1.0) discard;
  float f = 1.0 + uFlicker * (0.12 * sin(uTime * 13.0) + 0.08 * sin(uTime * 23.0 + 1.3));
  float a = pow(1.0 - d, 2.2) * uPower * f;
  gl_FragColor = vec4(uColor * a, 1.0);
}`;
function glowMat(color, power, o = {}) {
  return new THREE.ShaderMaterial({ uniforms: { ...U, uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uFlicker: { value: o.flicker || 0 } },
    vertexShader: VS_SPRITE.replace('uniform float uSway; uniform float uPhase;', 'const float uSway = 0.0; const float uPhase = 0.0;'), fragmentShader: FS_GLOW,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}
// a canvas painted by code, used as a texture
function paint(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; return t;
}
function plane(w, h, mat, x, y, z, anchorBottom = true) {
  const g = new THREE.PlaneGeometry(w, h); if (anchorBottom) g.translate(0, h / 2, 0);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); scene.add(m); return m;
}

/* ---------- the painted layers (stand-ins) ---------- */
// a layer at depth z must be wide enough that the camera never sees its edges
const layerSpan = z => { const vw = VIEW_H * (16 / 9) * depthK(z); return [LEVEL_L - vw * 0.62, LEVEL_R + vw * 0.62]; };
function pagoda(g, x, base, s, col, tiers = 5) {
  g.fillStyle = col;
  let y = base, w = 60 * s;
  for (let i = 0; i < tiers; i++) {
    const th = (22 - i * 1.5) * s, rw = w * 1.35;
    g.fillRect(x - w * 0.32, y - th, w * 0.64, th);                     // the storey
    g.beginPath(); g.moveTo(x - rw / 2 - 8 * s, y - th + 2 * s);         // the roof with lifted eaves
    g.quadraticCurveTo(x - rw * 0.25, y - th - 4 * s, x, y - th - 9 * s);
    g.quadraticCurveTo(x + rw * 0.25, y - th - 4 * s, x + rw / 2 + 8 * s, y - th + 2 * s);
    g.lineTo(x + rw / 2 - 2 * s, y - th + 6 * s); g.lineTo(x - rw / 2 + 2 * s, y - th + 6 * s); g.closePath(); g.fill();
    y -= th + 6 * s; w *= 0.84;
  }
  g.fillRect(x - 1.5 * s, y - 26 * s, 3 * s, 26 * s);                   // the spire
}
function treeClump(g, x, y, r, c1, c2, seed) {
  const R = rng(seed);
  for (let i = 0; i < 14; i++) { const a = R() * Math.PI * 2, d = R() * r * 0.75, rr = r * (0.35 + R() * 0.45); const gr = g.createRadialGradient(x + Math.cos(a) * d - rr * 0.3, y + Math.sin(a) * d * 0.7 - rr * 0.3, rr * 0.1, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rr); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, rr, 0, Math.PI * 2); g.fill(); }
}
function mountainLayer(z, o) {
  const [x0, x1] = layerSpan(z), W = x1 - x0, k = depthK(z);
  const baseY = atScreen(z, o.baseScreen), H = o.height * k + 900 * k;   // tall enough to reach below the screen
  const tw = 4096, th = 1024, n = noise1(o.seed), n2 = noise1(o.seed + 7);
  const tex = paint(tw, th, (g) => {
    const top = th * (o.height * k / H);               // where the ridge base sits in the texture
    for (let band = 0; band < o.bands; band++) {
      const f = band / Math.max(1, o.bands - 1), col = o.cols[band];
      g.fillStyle = col; g.beginPath(); g.moveTo(0, th);
      for (let px = 0; px <= tw; px += 4) {
        const wx = px / tw * W / k, h = fbm1(n, wx / o.scale + band * 13) * 0.9 + 0.25 * fbm1(n2, wx / (o.scale * 0.35) + band * 3);
        const peak = Math.pow(h, o.sharp) * top * (1 - f * 0.35) * 1.15;
        g.lineTo(px, top - peak + f * top * 0.28);
      }
      g.lineTo(tw, th); g.closePath(); g.fill();
      // haze at the foot of each ridge
      const hz = g.createLinearGradient(0, top * (0.55 + f * 0.25), 0, top + 40); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, o.haze); g.fillStyle = hz; g.fillRect(0, top * 0.4, tw, th);
    }
    if (o.pagodas) { const R = rng(o.seed + 3); g.globalAlpha = 0.9; for (let i = 0; i < o.pagodas; i++) { const px = R() * tw; const wx = px / tw * W / k; const h = fbm1(n, wx / o.scale) * 0.9 + 0.25 * fbm1(n2, wx / (o.scale * 0.35)); const y = top - Math.pow(h, o.sharp) * top * 1.15 + 6; pagoda(g, px, y, o.pagodaS * (0.7 + R() * 0.5), o.pagodaCol, 3 + Math.floor(R() * 4)); } g.globalAlpha = 1; }
  });
  const m = plane(W, H, spriteMat(tex, { fog: o.fog }), (x0 + x1) / 2, baseY - (H - o.height * k), z);
  return m;
}
// far: distant peaks and temples in haze; middle: forested ridges; both painted in full color
mountainLayer(-11000, { seed: 11, baseScreen: -20, height: 230, bands: 3, scale: 380, sharp: 1.6, cols: ['#8fa7b8', '#7c93a6', '#6b8296'], haze: 'rgba(214,226,232,0.9)', fog: 0.35, pagodas: 7, pagodaS: 1.1, pagodaCol: '#5f7488' });
mountainLayer(-5200, { seed: 23, baseScreen: -45, height: 200, bands: 3, scale: 300, sharp: 1.25, cols: ['#5f7f6a', '#4f6f5c', '#40604f'], haze: 'rgba(190,210,205,0.75)', fog: 0.2, pagodas: 5, pagodaS: 1.6, pagodaCol: '#3a4f45' });
// the middle distance: a temple complex and forest
{
  const z = -2000, [x0, x1] = layerSpan(z), W = x1 - x0, k = depthK(z), H = 560 * k, baseY = atScreen(z, -95) - 140 * k;
  const tex = paint(4096, 1024, (g, tw, th) => {
    const sx = tw / W, ground = th * 0.86, R = rng(5);
    // forest band
    for (let x = -40; x < tw + 40; x += 22) treeClump(g, x + R() * 10, ground - 40 - R() * 60, 46 + R() * 30, '#4d7a54', '#2f5238', 100 + x);
    // temples
    for (const [wx, s, tiers] of [[700, 3.0, 7], [1900, 2.2, 5], [3400, 3.4, 9], [4600, 2.4, 5]]) { const px = (wx - x0) * sx; if (px < 0 || px > tw) continue; g.fillStyle = '#6a4632'; g.fillRect(px - 120, ground - 30, 240, 30); pagoda(g, px, ground - 30, s, '#7a4f38', tiers); g.fillStyle = 'rgba(255,214,140,0.85)'; for (let i = 0; i < tiers; i++) g.fillRect(px - 6, ground - 44 - i * 26 * s * 0.9, 12, 8); }
    g.fillStyle = '#35503b'; g.fillRect(0, ground, tw, th - ground);
  });
  plane(W, H, spriteMat(tex, { fog: 0.14 }), (x0 + x1) / 2, baseY, z);
}
// near: village houses, walls and big trees just behind the path
const NEAR_Z = -520;
{
  const z = NEAR_Z, k = depthK(z), base = -40 * k;
  const R = rng(9);
  for (let i = 0; i < 9; i++) {
    const wx = -300 + i * 560 + R() * 180, w = 260 + R() * 120, h = 150 + R() * 70;
    const tex = paint(512, 384, (g, tw, th) => {
      const roofH = th * 0.38;
      g.fillStyle = '#d9c7a6'; g.fillRect(tw * 0.12, roofH, tw * 0.76, th - roofH);                       // plaster walls
      g.fillStyle = '#6d4a33'; for (let p = 0; p < 4; p++) g.fillRect(tw * 0.12 + p * tw * 0.253, roofH, 10, th - roofH);
      g.fillStyle = '#7d2e24'; g.beginPath(); g.moveTo(0, roofH + 10); g.quadraticCurveTo(tw * 0.3, roofH - 10, tw * 0.5, 8); g.quadraticCurveTo(tw * 0.7, roofH - 10, tw, roofH + 10); g.lineTo(tw * 0.9, roofH + 22); g.lineTo(tw * 0.1, roofH + 22); g.closePath(); g.fill();
      g.strokeStyle = '#4a1d17'; g.lineWidth = 3; for (let rx = 20; rx < tw; rx += 18) { g.beginPath(); g.moveTo(rx, roofH + 14); g.lineTo(tw * 0.5 + (rx - tw * 0.5) * 0.2, 12); g.stroke(); }
      g.fillStyle = '#3b2a20'; g.fillRect(tw * 0.42, th * 0.62, tw * 0.16, th * 0.38);                       // door
      g.fillStyle = '#2b211a'; g.fillRect(tw * 0.2, th * 0.55, tw * 0.13, th * 0.16); g.fillRect(tw * 0.67, th * 0.55, tw * 0.13, th * 0.16);
    });
    plane(w * k, h * k, spriteMat(tex, { fog: 0.06 }), wx, base, z - i);
    // its windows glow at night: a separate glow piece, as the Art guide asks
    for (const fx of [-0.235, 0.235]) { const gm = plane(70 * k, 70 * k, glowMat(0xffb35a, 0.0), wx + fx * w * k, base + h * k * 0.32, z - i + 2, false); NIGHT_GLOWS.push({ m: gm, p: 1.1 }); }
  }
  // big background trees between the houses, swaying
  for (let i = 0; i < 7; i++) {
    const wx = -100 + i * 720 + R() * 200, s = 1 + R() * 0.4;
    const trunk = paint(256, 512, (g, tw, th) => { const gr = g.createLinearGradient(0, 0, tw, 0); gr.addColorStop(0, '#3d2c22'); gr.addColorStop(0.5, '#5a4232'); gr.addColorStop(1, '#2f221a'); g.fillStyle = gr; g.beginPath(); g.moveTo(tw * 0.42, th); g.lineTo(tw * 0.46, th * 0.2); g.lineTo(tw * 0.54, th * 0.2); g.lineTo(tw * 0.6, th); g.fill(); });
    plane(60 * s * k, 280 * s * k, spriteMat(trunk, { fog: 0.05, sway: 6 }), wx, base, z - 12);
    const canopy = paint(512, 400, (g, tw, th) => treeClump(g, tw / 2, th * 0.55, 150, '#6c9a4c', '#2d5a2c', 40 + i));
    plane(330 * s * k, 260 * s * k, spriteMat(canopy, { fog: 0.05, sway: 22 }), wx, base + 200 * s * k, z - 11);
  }
}

/* ---------- the ground you walk on ---------- */
const WATER = { x0: 2200, x1: 2700, y: -14 };
function terrain(x) {
  if (x > WATER.x0 && x < WATER.x1) { const e = Math.min(smooth(WATER.x0, WATER.x0 + 90, x), 1 - smooth(WATER.x1 - 90, WATER.x1, x)); return -100 * e; }
  return 0;
}
// stone steps up to a terrace, and down again (one-way: you land on their tops)
const LEDGES = [{ x0: 3060, x1: 3160, y: 40 }, { x0: 3160, x1: 3260, y: 80 }, { x0: 3260, x1: 3900, y: 120 }, { x0: 3900, x1: 4000, y: 60 }];
const groundAt = (x, fromY) => { let g = terrain(x); for (const L of LEDGES) if (x >= L.x0 && x <= L.x1 && fromY >= L.y - 6 && L.y > g) g = L.y; return g; };
{
  const xs = []; for (let x = -1200; x <= 5600; x += 8) xs.push(x);
  const pos = [], top = [], idx = [];
  xs.forEach((x, i) => { const t = terrain(x); pos.push(x, t, 0, x, -1400, 0); top.push(t, t); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...U, uWaterY: { value: WATER.y }, uPool: { value: new THREE.Vector2(WATER.x0, WATER.x1) } },
    vertexShader: `attribute float aTop; varying float vTop; varying vec2 vW; void main(){ vTop = aTop; vW = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uAmb; uniform float uWaterY; uniform vec2 uPool; varying float vTop; varying vec2 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float d = vTop - vW.y; vec3 c;
        float nn = n(vW * vec2(0.05, 0.08)) * 0.6 + n(vW * 0.21) * 0.4;
        if (d < 9.0 + nn * 4.0) c = mix(vec3(0.42, 0.58, 0.25), vec3(0.27, 0.42, 0.18), nn) * (0.9 + 0.2 * smoothstep(3.0, 0.0, d));
        else if (d < 16.0 + nn * 4.0) c = vec3(0.17, 0.13, 0.09);
        else {
          float strata = n(vec2(vW.x * 0.006, vW.y * 0.045)) * 0.5 + n(vW * 0.03) * 0.5;
          c = mix(vec3(0.45, 0.34, 0.25), vec3(0.33, 0.24, 0.17), strata);
          vec2 cell = floor(vW / vec2(46.0, 30.0)); vec2 f = fract(vW / vec2(46.0, 30.0)) - 0.5; float st = h(cell);
          if (st > 0.72 && length(f * vec2(1.0, 1.3)) < 0.32) c = mix(vec3(0.55, 0.52, 0.47), vec3(0.38, 0.36, 0.33), n(vW * 0.4));
          c *= mix(1.0, 0.45, smoothstep(30.0, 420.0, d));
        }
        if (vW.x > uPool.x && vW.x < uPool.y && vW.y < uWaterY) c = mix(c, vec3(0.08, 0.2, 0.22), 0.55);
        gl_FragColor = vec4(c * uAmb, 1.0);
      }` }));
  m.position.z = 0; m.renderOrder = 1; scene.add(m);
}
// the stone steps, painted
for (const L of LEDGES) {
  const w = L.x1 - L.x0, h = L.y + 40;
  const tex = paint(256, 256, (g, tw, th) => {
    g.fillStyle = '#8a8378'; g.fillRect(0, 0, tw, th);
    const R = rng(L.x0); for (let y = 0; y < th; y += 40) for (let x = (y / 40) % 2 ? -30 : 0; x < tw; x += 64) { g.fillStyle = `rgb(${120 + R() * 30},${114 + R() * 28},${104 + R() * 25})`; g.fillRect(x + 2, y + 2, 60, 36); }
    g.fillStyle = '#5d7d3b'; g.fillRect(0, 0, tw, 10); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 10, tw, 6);
  });
  plane(w, h, spriteMat(tex), (L.x0 + L.x1) / 2, L.y - h, -2);
}

/* ---------- cloth: banners and prayer flags hang and move by physics ---------- */
class Cloth {
  constructor(cols, rows, w, h, ox, oy, z, tex) {
    this.c = cols; this.r = rows; this.sx = w / (cols - 1); this.sy = h / (rows - 1); this.ox = ox; this.oy = oy;
    this.p = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = ox + i * this.sx - w / 2, y = oy - j * this.sy; this.p.push({ x, y, px: x, py: y, pin: j === 0 }); }
    this.geo = new THREE.PlaneGeometry(w, h, cols - 1, rows - 1); this.mesh = new THREE.Mesh(this.geo, spriteMat(tex)); this.mesh.position.z = z; this.mesh.frustumCulled = false; scene.add(this.mesh);
  }
  step(dt, wind, t) {
    const g = -620, P = this.p;
    for (let k = 0; k < P.length; k++) { const q = P[k]; if (q.pin) continue; const fl = Math.sin(t * 3.1 + q.y * 0.05 + k * 0.7) * 0.5 + Math.sin(t * 5.7 + k) * 0.25;
      const ax = (wind * 240 + fl * 90 * (0.3 + Math.abs(wind))) , vx = (q.x - q.px) * 0.985, vy = (q.y - q.py) * 0.985; q.px = q.x; q.py = q.y; q.x += vx + ax * dt * dt; q.y += vy + g * dt * dt; }
    for (let it = 0; it < 4; it++) {
      for (let j = 0; j < this.r; j++) for (let i = 0; i < this.c; i++) { const a = P[j * this.c + i];
        if (i + 1 < this.c) this.link(a, P[j * this.c + i + 1], this.sx); if (j + 1 < this.r) this.link(a, P[(j + 1) * this.c + i], this.sy); }
    }
    const pos = this.geo.attributes.position; for (let k = 0; k < P.length; k++) pos.setXYZ(k, P[k].x, P[k].y, Math.sin(k * 1.3) * 0.5); pos.needsUpdate = true;
  }
  link(a, b, len) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - len) / d * 0.5; if (!a.pin) { a.x += dx * f; a.y += dy * f; } if (!b.pin) { b.x -= dx * f; b.y -= dy * f; } }
}
const CLOTHS = [];
// a chain of points: ropes, scarves, hair, tails (verlet)
class Chain {
  constructor(n, seg, x, y) { this.n = n; this.seg = seg; this.p = Array.from({ length: n }, (_, i) => ({ x, y: y - i * seg, px: x, py: y - i * seg })); }
  step(dt, ax, ay, grav = -900, damp = 0.96, stiff = 0) {
    const P = this.p; P[0].x = ax; P[0].y = ay; P[0].px = ax; P[0].py = ay;
    for (let i = 1; i < this.n; i++) { const q = P[i], vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp; q.px = q.x; q.py = q.y; q.x += vx + (U.uWind.value * 180 + Math.sin(U.uTime.value * 4 + i) * 30) * dt * dt; q.y += vy + grav * dt * dt; }
    for (let it = 0; it < 5; it++) for (let i = 1; i < this.n; i++) { const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - this.seg) / d; if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; } }
  }
}
// a ribbon drawn along a chain, tapering
function ribbon(color, width, n, z, taper = 1) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 2 * 3), 3));
  const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...U, uCol: { value: new THREE.Color(color) } }, vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform vec3 uCol; uniform vec3 uAmb; void main(){ gl_FragColor = vec4(uCol * uAmb, 1.0); }`, side: THREE.DoubleSide }));
  m.frustumCulled = false; m.position.z = z; scene.add(m);
  m.update = (pts, wFn) => { const pos = g.attributes.position; for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1; const w = (wFn ? wFn(i / (n - 1)) : width * (1 - (i / (n - 1)) * taper * 0.85)) / 2; pos.setXYZ(i * 2, pts[i].x - dy / d * w, pts[i].y + dx / d * w, 0); pos.setXYZ(i * 2 + 1, pts[i].x + dy / d * w, pts[i].y - dx / d * w, 0); } pos.needsUpdate = true; };
  return m;
}

/* ---------- the shrine ---------- */
const SHRINE = { x: 900, z: -34 };
{
  const tex = paint(512, 512, (g, tw, th) => {
    g.fillStyle = '#7d776c'; g.fillRect(40, th - 60, tw - 80, 60); g.fillStyle = '#6a645a'; g.fillRect(20, th - 24, tw - 40, 24);
    g.fillStyle = '#9b2b22'; g.fillRect(90, 150, 26, th - 210); g.fillRect(tw - 116, 150, 26, th - 210);           // pillars
    g.fillStyle = '#6e1d17'; g.fillRect(80, 170, tw - 160, 16);                                                       // beam
    g.fillStyle = '#3b2b25'; g.beginPath(); g.moveTo(10, 160); g.quadraticCurveTo(tw * 0.3, 120, tw / 2, 40); g.quadraticCurveTo(tw * 0.7, 120, tw - 10, 160); g.lineTo(tw - 40, 178); g.lineTo(40, 178); g.closePath(); g.fill();
    g.fillStyle = '#c99a3c'; g.fillRect(tw / 2 - 4, 30, 8, 22);
    g.fillStyle = '#4b4239'; g.fillRect(tw / 2 - 46, th - 110, 92, 50); g.fillStyle = '#2e2822'; g.beginPath(); g.ellipse(tw / 2, th - 112, 50, 12, 0, 0, Math.PI * 2); g.fill();   // the fire bowl
  });
  plane(260, 260, spriteMat(tex), SHRINE.x, 0, SHRINE.z);
  // fire, embers and its light
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(46, 70).translate(0, 35, 0), new THREE.ShaderMaterial({ uniforms: { ...U },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uWind; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec2 uv = vUv; uv.x += (uv.y * uv.y) * (uWind * 0.12 + 0.05 * sin(uTime * 6.0)); float x = (uv.x - 0.5) * 2.0;
        float nz = n(vec2(uv.x * 6.0, uv.y * 4.0 - uTime * 3.2)) * 0.6 + n(vec2(uv.x * 13.0, uv.y * 9.0 - uTime * 6.0)) * 0.4;
        float shape = 1.0 - smoothstep(0.0, 1.0, abs(x) / max(0.05, (1.0 - uv.y) * 0.9)) ; float f = shape * smoothstep(1.0, 0.1, uv.y + nz * 0.45);
        vec3 c = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.92, 0.55), smoothstep(0.35, 0.9, f)); gl_FragColor = vec4(c * f * 1.9, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flame.position.set(SHRINE.x, 112, SHRINE.z + 3); scene.add(flame);
  const fg = plane(260, 260, glowMat(0xff9a3c, 0.55, { flicker: 1 }), SHRINE.x, 130, SHRINE.z + 4, false); NIGHT_GLOWS.push({ m: fg, p: 0.9, day: 0.35 });
  const pool = plane(420, 90, glowMat(0xff8a30, 0.35, { flicker: 1 }), SHRINE.x, 8, 6, false); NIGHT_GLOWS.push({ m: pool, p: 0.55, day: 0.12 });
  // two banners hang from the beam
  const banTex = paint(128, 512, (g, tw, th) => { g.fillStyle = '#a3241c'; g.fillRect(0, 0, tw, th); g.fillStyle = '#d8a440'; g.fillRect(6, 6, tw - 12, 6); g.fillRect(6, th - 14, tw - 12, 6); g.strokeStyle = '#e9c060'; g.lineWidth = 6; g.beginPath(); g.arc(tw / 2, th * 0.35, 30, 0, Math.PI * 2); g.moveTo(tw / 2, th * 0.35 - 44); g.lineTo(tw / 2, th * 0.35 + 44); g.moveTo(tw / 2 - 44, th * 0.35); g.lineTo(tw / 2 + 44, th * 0.35); g.stroke(); });
  for (const dx of [-74, 74]) CLOTHS.push(new Cloth(6, 16, 34, 120, SHRINE.x + dx, 172, SHRINE.z + 6, banTex));
}
// the bell sways in the wind
const BELL = { a: 0, v: 0, mesh: null };
{
  const tex = paint(64, 96, (g) => { g.strokeStyle = '#5a4630'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 0); g.lineTo(32, 26); g.stroke(); g.fillStyle = '#b8862e'; g.beginPath(); g.moveTo(14, 80); g.quadraticCurveTo(14, 30, 32, 28); g.quadraticCurveTo(50, 30, 50, 80); g.closePath(); g.fill(); g.fillStyle = '#7a561c'; g.fillRect(12, 78, 40, 6); });
  const geo = new THREE.PlaneGeometry(22, 33).translate(0, -16.5, 0); BELL.mesh = new THREE.Mesh(geo, spriteMat(tex)); BELL.mesh.position.set(SHRINE.x, 186, SHRINE.z + 5); scene.add(BELL.mesh);
}
// prayer flags on a rope between two posts
const FLAGS = { rope: null, mesh: null, n: 16, x0: 1180, x1: 1460, y: 168 };
{
  const postTex = paint(32, 256, (g, tw, th) => { g.fillStyle = '#4c3828'; g.fillRect(10, 0, 12, th); });
  plane(10, 175, spriteMat(postTex), FLAGS.x0, 0, -60); plane(10, 175, spriteMat(postTex), FLAGS.x1, 0, -60);
  FLAGS.rope = new Chain(FLAGS.n, (FLAGS.x1 - FLAGS.x0) / (FLAGS.n - 1) * 1.04, FLAGS.x0, FLAGS.y);
  FLAGS.rope.p.forEach((q, i) => { q.x = q.px = FLAGS.x0 + i * (FLAGS.x1 - FLAGS.x0) / (FLAGS.n - 1); q.y = q.py = FLAGS.y; });
  const cols = ['#2f5fa8', '#f2efe6', '#b8302a', '#3d8a45', '#e2b437'];
  const tex = paint(320, 64, (g) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 64 + 2, 2, 60, 60); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.strokeRect(i * 64 + 14, 14, 36, 36); }));
  const nF = FLAGS.n - 2, pos = new Float32Array(nF * 4 * 3), uv = [], idx = [];
  for (let i = 0; i < nF; i++) { const c = i % 5, u0 = c / 5, u1 = (c + 1) / 5; uv.push(u0, 1, u1, 1, u0, 0, u1, 0); const a = i * 4; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  FLAGS.mesh = new THREE.Mesh(g, spriteMat(tex)); FLAGS.mesh.position.z = -58; FLAGS.mesh.frustumCulled = false; scene.add(FLAGS.mesh);
  FLAGS.ropeMesh = ribbon(0x3a2c20, 1.6, FLAGS.n, -59, 0);
}
function stepFlags(dt) {
  const R = FLAGS.rope, P = R.p, last = P.length - 1;
  for (let i = 1; i < last; i++) { const q = P[i], vx = (q.x - q.px) * 0.97, vy = (q.y - q.py) * 0.97; q.px = q.x; q.py = q.y; q.x += vx + U.uWind.value * 60 * dt * dt; q.y += vy - 500 * dt * dt; }
  for (let it = 0; it < 6; it++) { P[0].x = FLAGS.x0; P[0].y = FLAGS.y; P[last].x = FLAGS.x1; P[last].y = FLAGS.y; for (let i = 1; i <= last; i++) { const a = P[i - 1], b = P[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - R.seg) / d * 0.5; if (i - 1 !== 0) { a.x += dx * f; a.y += dy * f; } if (i !== last) { b.x -= dx * f; b.y -= dy * f; } } }
  const pos = FLAGS.mesh.geometry.attributes.position, w = U.uWind.value, t = U.uTime.value;
  for (let i = 0; i < P.length - 2; i++) { const a = P[i + 1], b = P[i + 2] || P[i + 1]; const sw = (w * 14 + Math.sin(t * 3 + i * 0.9) * 4); const hgt = 18;
    pos.setXYZ(i * 4, a.x, a.y, 0); pos.setXYZ(i * 4 + 1, b.x - 2, b.y, 0); pos.setXYZ(i * 4 + 2, a.x + sw, a.y - hgt + Math.abs(sw) * 0.3, 0); pos.setXYZ(i * 4 + 3, b.x - 2 + sw, b.y - hgt + Math.abs(sw) * 0.3, 0); }
  pos.needsUpdate = true; FLAGS.ropeMesh.update(P);
}

/* ---------- stone lanterns ---------- */
const LANTERNS = [[420, 0], [1360, 0], [2080, 0], [3330, 120], [3860, 120], [4120, 0]];
{
  const tex = paint(64, 128, (g) => { g.fillStyle = '#8a857b'; g.fillRect(24, 70, 16, 58); g.fillRect(14, 120, 36, 8); g.fillRect(16, 50, 32, 22); g.fillStyle = '#ffd38a'; g.fillRect(24, 56, 16, 10); g.fillStyle = '#6e695f'; g.beginPath(); g.moveTo(6, 52); g.lineTo(32, 30); g.lineTo(58, 52); g.closePath(); g.fill(); g.fillRect(29, 22, 6, 10); });
  for (const [x, y] of LANTERNS) { plane(30, 60, spriteMat(tex), x, y, -14); const gl = plane(110, 110, glowMat(0xffc070, 0.0, { flicker: 0.6 }), x, y + 30, -12, false); NIGHT_GLOWS.push({ m: gl, p: 0.85, day: 0.05 }); const pl = plane(170, 40, glowMat(0xffa850, 0.0, { flicker: 0.5 }), x, y + 3, 8, false); NIGHT_GLOWS.push({ m: pl, p: 0.4 }); }
}

/* ---------- trees on the path: trunk and leaf clumps apart, so the wind moves the leaves ---------- */
function bigTree(x, z, o) {
  const s = o.s || 1, trunk = paint(512, 768, (g, tw, th) => {
    const gr = g.createLinearGradient(tw * 0.35, 0, tw * 0.65, 0); gr.addColorStop(0, '#3a291e'); gr.addColorStop(0.45, '#6b4e38'); gr.addColorStop(1, '#2d2018'); g.fillStyle = gr; g.strokeStyle = gr;
    g.beginPath(); g.moveTo(tw * 0.36, th); g.bezierCurveTo(tw * 0.42, th * 0.7, tw * 0.4, th * 0.45, tw * 0.46, th * 0.3); g.lineTo(tw * 0.56, th * 0.3); g.bezierCurveTo(tw * 0.58, th * 0.5, tw * 0.56, th * 0.75, tw * 0.66, th); g.closePath(); g.fill();
    g.lineCap = 'round'; for (const [x1, y1, x2, y2, w] of [[0.48, 0.42, 0.2, 0.22, 20], [0.52, 0.38, 0.84, 0.2, 18], [0.5, 0.3, 0.42, 0.08, 14], [0.5, 0.33, 0.66, 0.1, 12]]) { g.lineWidth = w; g.beginPath(); g.moveTo(tw * x1, th * y1); g.quadraticCurveTo(tw * (x1 + x2) / 2, th * Math.min(y1, y2) - 20, tw * x2, th * y2); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(tw / 2, th - 6, tw * 0.25, 10, 0, 0, Math.PI * 2); g.fill();
  });
  plane(330 * s, 500 * s, spriteMat(trunk, { sway: 4 }), x, -4, z);
  const clumps = [];
  for (const [dx, dy, r] of [[-110, 420, 120], [100, 430, 125], [0, 480, 130], [-160, 360, 95], [170, 370, 100], [-40, 380, 110], [60, 390, 105]]) {
    const tex = paint(320, 320, (g, tw, th) => treeClump(g, tw / 2, th / 2, tw * 0.36, o.c1, o.c2, Math.round(x + dx)));
    const m = plane(r * 2.3 * s, r * 2.3 * s, spriteMat(tex, { sway: 26, phase: dx * 0.01 }), x + dx * s, (dy - r) * s, z + 2 + Math.random() * 3);
    clumps.push({ x: x + dx * s, y: dy * s, r: r * s });
  }
  return { x, z, clumps, leaf: o.leaf };
}
const TREES = [bigTree(1650, -46, { c1: '#8ab654', c2: '#2f5f2c', leaf: [[0.55, 0.68, 0.25], [0.78, 0.7, 0.24], [0.62, 0.45, 0.16]] }), bigTree(2960, -52, { s: 0.85, c1: '#f2b8c6', c2: '#a8546c', leaf: [[0.98, 0.76, 0.82], [0.95, 0.62, 0.72], [1, 0.88, 0.9]] })];

/* ---------- grass: thousands of blades, each bending with the wind and away from your feet ---------- */
let GRASS;
function makeGrass(count) {
  if (GRASS) { scene.remove(GRASS); GRASS.geometry.dispose(); }
  const geo = new THREE.PlaneGeometry(1, 1, 1, 4).translate(0, 0.5, 0);
  const cols = new Float32Array(count * 3), ph = new Float32Array(count);
  const mesh = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ uniforms: { ...U },
    vertexShader: `attribute vec3 aCol; attribute float aPhase; uniform float uTime; uniform float uWind; uniform vec3 uPlayer; varying vec3 vCol; varying float vT;
      void main(){ vec3 p = position; float t = uv.y; p.x *= (1.0 - t * 0.85);
        vec4 wp = instanceMatrix * vec4(p, 1.0); vec4 base = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0); float hgt = wp.y - base.y;
        float w = uWind * 0.9 + 0.32 * sin(uTime * 2.1 + aPhase + base.x * 0.02) + 0.14 * sin(uTime * 4.3 + aPhase * 1.7);
        float dx = base.x - uPlayer.x; float near = exp(-dx * dx / 700.0) * step(abs(base.y - uPlayer.y), 30.0); float push = near * sign(dx) * 2.2;
        wp.x += (w + push) * t * t * hgt * 0.55; wp.y -= abs(w + push) * t * t * hgt * 0.14;
        vCol = aCol; vT = t; gl_Position = projectionMatrix * viewMatrix * modelMatrix * wp; }`,
    fragmentShader: `uniform vec3 uAmb; varying vec3 vCol; varying float vT; void main(){ gl_FragColor = vec4(vCol * (0.5 + 0.6 * vT) * uAmb, 1.0); }`, side: THREE.DoubleSide }), count);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), R = rng(77); let i = 0;
  while (i < count) {
    const x = -700 + R() * 5600; let y = terrain(x);
    if (x > WATER.x0 + 40 && x < WATER.x1 - 40) continue;
    let onLedge = false; for (const L of LEDGES) if (x > L.x0 + 4 && x < L.x1 - 4 && R() < 0.5) { y = L.y; onLedge = true; }
    if (!onLedge && LEDGES.some(L => x > L.x0 && x < L.x1)) continue;
    const z = -30 + R() * 58, h = 9 + R() * 16 + (R() < 0.08 ? 14 : 0), w = 2.2 + R() * 1.8;
    M.compose(new THREE.Vector3(x, y - 1, z), q, new THREE.Vector3(w, h, 1)); mesh.setMatrixAt(i, M);
    const c = R(); cols.set(c < 0.6 ? [0.36 + R() * 0.1, 0.55 + R() * 0.12, 0.22] : c < 0.9 ? [0.48, 0.6, 0.24] : [0.75, 0.68, 0.3], i * 3); ph[i] = R() * 6.28; i++;
  }
  geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(cols, 3)); geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1));
  mesh.frustumCulled = false; scene.add(mesh); GRASS = mesh;
}
makeGrass(2600);

/* ---------- the player: cut-out parts on a skeleton (how the Art guide's parts will be used) ---------- */
function partTex(w, h, base, dark, light, o = {}) {
  return paint(64, 128, (g, tw, th) => {
    const gr = g.createLinearGradient(0, 0, tw, 0); gr.addColorStop(0, dark); gr.addColorStop(0.55, base); gr.addColorStop(1, light);
    g.fillStyle = gr; const r = tw * 0.45; g.beginPath(); g.moveTo(r, 0); g.lineTo(tw - r, 0); g.quadraticCurveTo(tw, 0, tw, r); g.lineTo(tw, th - r); g.quadraticCurveTo(tw, th, tw - r, th); g.lineTo(r, th); g.quadraticCurveTo(0, th, 0, th - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.fill();
    if (o.band) { g.fillStyle = o.band; g.fillRect(0, th * o.bandAt, tw, th * 0.12); }
  });
}
const SK = { skin: ['#c99a72', '#8e6346', '#e2b892'], robe: ['#2d3a5c', '#1b2238', '#41527e'], robeB: ['#232d48', '#141a2c', '#33405f'], pants: ['#3a3128', '#221c16', '#4e4335'] };
function limb(len, w, tex, z) {
  const geo = new THREE.PlaneGeometry(w, len + w * 0.6).translate(0, -len / 2, 0);
  const m = new THREE.Mesh(geo, spriteMat(tex)); m.position.z = z; const grp = new THREE.Group(); grp.add(m); return grp;
}
const RIG = {};
const PL = { x: 300, y: 0, vx: 0, vy: 0, face: 1, onG: true, coyote: 0, jumpHeld: false, landT: 0, rollT: 0, atkT: 0, atkN: 0, atkHit: false, phase: 0, inWater: false, stepAcc: 0 };
{
  const root = new THREE.Group(); root.position.set(PL.x, 0, 0); scene.add(root); RIG.root = root;
  const hip = new THREE.Group(); root.add(hip); RIG.hip = hip;
  const T = { torso: partTex(22, 30, ...SK.robe, { band: '#a3241c', bandAt: 0.78 }), head: paint(64, 64, (g) => { const gr = g.createRadialGradient(26, 24, 4, 32, 32, 30); gr.addColorStop(0, '#e6bd95'); gr.addColorStop(1, '#9a6c4c'); g.fillStyle = gr; g.beginPath(); g.ellipse(32, 32, 26, 29, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#17120f'; g.beginPath(); g.ellipse(26, 22, 27, 18, -0.3, Math.PI * 0.95, Math.PI * 2.1); g.fill(); g.fillStyle = '#2b1d16'; g.fillRect(44, 32, 5, 4); }),
    ua: partTex(9, 16, ...SK.robe), fa: partTex(8, 14, ...SK.skin), uaB: partTex(9, 16, ...SK.robeB), faB: partTex(8, 14, '#a57a58', '#704c34', '#b88d6a'),
    th: partTex(11, 18, ...SK.pants), sh: partTex(9, 18, ...SK.pants), thB: partTex(11, 18, '#2c251e', '#18130f', '#3b3228'), ft: partTex(7, 10, '#2b2118', '#1a130d', '#3d3024'),
    skirt: paint(64, 96, (g, tw, th) => { const gr = g.createLinearGradient(0, 0, tw, 0); gr.addColorStop(0, '#1b2238'); gr.addColorStop(0.6, '#2d3a5c'); gr.addColorStop(1, '#41527e'); g.fillStyle = gr; g.beginPath(); g.moveTo(tw * 0.2, 0); g.lineTo(tw * 0.8, 0); g.lineTo(tw, th); g.lineTo(0, th); g.closePath(); g.fill(); }) };
  // legs (back first, so they draw behind)
  const mkLeg = (front) => { const z = front ? 2 : -3; const th = limb(17, 11, front ? T.th : T.thB, z), sh = limb(17, 9, front ? T.sh : T.thB, z), ft = limb(8, 7, T.ft, z);
    sh.position.y = -17; th.add(sh); ft.position.y = -17; sh.add(ft); ft.children[0].rotation.z = Math.PI / 2; ft.children[0].position.x = 3; hip.add(th); return { th, sh, ft }; };
  RIG.legB = mkLeg(false); RIG.legF = mkLeg(true);
  const skirt = new THREE.Mesh(new THREE.PlaneGeometry(24, 22).translate(0, -11, 0), spriteMat(T.skirt)); skirt.position.set(0, 2, 1.5); RIG.skirtG = new THREE.Group(); RIG.skirtG.add(skirt); hip.add(RIG.skirtG);
  const torso = new THREE.Group(); hip.add(torso); RIG.torso = torso;
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(22, 34).translate(0, 15, 0), spriteMat(T.torso)); tm.position.z = 0; torso.add(tm);
  const head = new THREE.Group(); head.position.y = 31; torso.add(head); RIG.head = head;
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(19, 20).translate(1, 9, 0), spriteMat(T.head)); hm.position.z = 1; head.add(hm);
  const mkArm = (front) => { const z = front ? 4 : -4; const ua = limb(14, 9, front ? T.ua : T.uaB, z), fa = limb(13, 8, front ? T.fa : T.faB, z); fa.position.y = -14; ua.add(fa); ua.position.set(front ? 2 : -2, 26, 0); torso.add(ua); return { ua, fa }; };
  RIG.armB = mkArm(false); RIG.armF = mkArm(true);
  // the blade, held in the front hand
  const blade = paint(32, 256, (g, tw, th) => { const gr = g.createLinearGradient(0, 0, tw, 0); gr.addColorStop(0, '#9aa3ad'); gr.addColorStop(0.5, '#eef3f7'); gr.addColorStop(1, '#7f8892'); g.fillStyle = gr; g.beginPath(); g.moveTo(tw / 2, 0); g.lineTo(tw * 0.8, 20); g.lineTo(tw * 0.75, th * 0.8); g.lineTo(tw * 0.25, th * 0.8); g.lineTo(tw * 0.2, 20); g.closePath(); g.fill(); g.fillStyle = '#c4973d'; g.fillRect(0, th * 0.8, tw, 10); g.fillStyle = '#2a1d14'; g.fillRect(tw * 0.32, th * 0.8 + 10, tw * 0.36, th * 0.2 - 10); });
  const sword = new THREE.Group(); const sm = new THREE.Mesh(new THREE.PlaneGeometry(6, 54).translate(0, 22, 0), spriteMat(blade)); sm.position.z = 5; sword.add(sm); sword.position.y = -13; RIG.armF.fa.add(sword); RIG.sword = sword;
  RIG.tip = new THREE.Object3D(); RIG.tip.position.y = 48; sword.add(RIG.tip); RIG.hilt = new THREE.Object3D(); RIG.hilt.position.y = 6; sword.add(RIG.hilt);
  RIG.neck = new THREE.Object3D(); RIG.neck.position.set(-3, 27, 0); torso.add(RIG.neck);
  RIG.hairA = new THREE.Object3D(); RIG.hairA.position.set(-8, 14, 0); head.add(RIG.hairA);
  RIG.sash = new THREE.Object3D(); RIG.sash.position.set(-9, 4, 0); torso.add(RIG.sash);
  // contact shadow, stretched away from the sun
  RIG.shadow = plane(60, 14, new THREE.ShaderMaterial({ uniforms: { uA: { value: 0.35 } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float d = length((vUv - 0.5) * 2.0); gl_FragColor = vec4(0.0, 0.0, 0.0, uA * pow(max(0.0, 1.0 - d), 1.6)); }`, transparent: true, depthWrite: false }), 0, 1, -0.5, false);
}
// scarf, hair and sash: chains that trail and swing
const SCARF = new Chain(13, 5.2, 0, 0), HAIR = [new Chain(7, 3.6, 0, 0), new Chain(6, 3.2, 0, 0)], SASH = new Chain(6, 4, 0, 0);
const scarfMesh = ribbon(0xc03a2a, 7, 13, -5, 0.7), hairMesh = [ribbon(0x15100c, 5, 7, -2, 0.9), ribbon(0x1d1612, 4, 6, -2.5, 0.9)], sashMesh = ribbon(0xa3241c, 4, 6, -1, 0.6);
// the sword's trail, a ribbon of the blade's recent path that fades
const TRAIL = { n: 14, pts: [], mesh: null };
{
  const n = TRAIL.n, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 2 * 3), 3)); g.setAttribute('aA', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 1));
  const idx = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } g.setIndex(idx);
  TRAIL.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: `attribute float aA; varying float vA; void main(){ vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0, 0.93, 0.75) * vA * 1.4, 1.0); }`, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  TRAIL.mesh.frustumCulled = false; TRAIL.mesh.position.z = 6; scene.add(TRAIL.mesh);
}
// poses: angles for each joint. Limbs hang at 0; positive swings forward. The current pose eases toward the target,
// so every change of movement blends smoothly instead of snapping.
const POSE_KEYS = ['hipY', 'lean', 'head', 'uaF', 'faF', 'uaB', 'faB', 'thF', 'shF', 'thB', 'shB', 'ftF', 'ftB', 'sword', 'rot', 'sq'];
const CUR = Object.fromEntries(POSE_KEYS.map(k => [k, k === 'sq' ? 1 : 0]));
function targetPose(t) {
  const P = PL, b = Math.sin(t * 2.2), sp = Math.min(1, Math.abs(P.vx) / 270);
  let p = { hipY: 0, lean: 0.05 + b * 0.012, head: -0.03, uaF: 0.18 + b * 0.03, faF: 0.5, uaB: -0.1, faB: 0.3, thF: 0.08, shF: -0.08, thB: -0.07, shB: -0.05, ftF: 0, ftB: 0, sword: 2.2, rot: 0, sq: 1 + b * 0.008 };
  if (P.rollT > 0) { const q = 1 - P.rollT / 0.46, e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
    return { ...p, hipY: -16 * Math.sin(q * Math.PI) - 2, lean: 0.9, head: -0.6, uaF: 1.6, faF: 1.6, uaB: 1.4, faB: 1.5, thF: 1.9, shF: -2.4, thB: 1.7, shB: -2.3, ftF: 0.6, ftB: 0.6, sword: 2.6, rot: -Math.PI * 2 * e, sq: 1 }; }
  if (!P.onG) {
    if (P.vy > 0) p = { ...p, hipY: 2, lean: 0.12, head: 0.05, uaF: 1.5, faF: 0.4, uaB: -0.9, faB: 0.5, thF: 1.05, shF: -1.35, thB: -0.25, shB: -0.55, ftF: 0.3, sword: 1.6 };
    else p = { ...p, hipY: 0, lean: 0.05, head: 0.1, uaF: 1.9 + Math.sin(t * 9) * 0.12, faF: 0.3, uaB: -1.6 + Math.sin(t * 9 + 1) * 0.12, faB: 0.3, thF: 0.35, shF: -0.35, thB: -0.15, shB: -0.7, sword: 1.4 };
  } else if (sp > 0.05) {
    const ph = P.phase, s = Math.sin(ph), c = Math.cos(ph), k = sp;
    p = { ...p, hipY: -2.5 * k + 3.2 * k * Math.abs(c), lean: 0.1 + 0.2 * k, head: -0.1 * k,
      thF: 0.85 * s * k, thB: -0.85 * s * k, shF: -0.25 - 1.15 * Math.max(0, -c) * k, shB: -0.25 - 1.15 * Math.max(0, c) * k,
      ftF: 0.25 * s * k, ftB: -0.25 * s * k, uaF: -0.75 * s * k + 0.15, uaB: 0.75 * s * k - 0.1, faF: 0.6 + 0.6 * k, faB: 0.5 + 0.6 * k, sword: 2.0 };
    if (P.inWater) { p.lean += 0.15; p.uaF += 0.6; p.uaB += 0.4; }
  }
  if (P.landT > 0) { const k = P.landT / 0.2; p = { ...p, hipY: p.hipY - 10 * k, lean: p.lean + 0.35 * k, thF: p.thF + 0.95 * k, shF: p.shF - 1.5 * k, thB: p.thB + 0.6 * k, shB: p.shB - 1.2 * k, uaF: p.uaF + 0.4 * k, sq: 1 - 0.06 * k }; }
  if (P.atkT > 0) {
    const t0 = 0.42 - P.atkT;   // time since the strike began
    const second = P.atkN % 2 === 1;
    const wind = !second ? { uaF: 2.7, faF: 0.5, sword: 1.0, lean: -0.08, thF: 0.3, shF: -0.3, thB: -0.2 } : { uaF: -0.6, faF: 0.9, sword: 2.6, lean: 0.05, thF: 0.2, shF: -0.2, thB: -0.3 };
    const hit = !second ? { uaF: -0.35, faF: 0.15, sword: 1.75, lean: 0.38, thF: 0.75, shF: -0.55, thB: -0.6, shB: -0.4, head: 0.1 } : { uaF: 2.2, faF: 0.2, sword: 0.9, lean: 0.3, thF: 0.7, shF: -0.5, thB: -0.55, shB: -0.4, head: -0.1 };
    const f = t0 < 0.09 ? wind : t0 < 0.2 ? hit : null;
    if (f) p = { ...p, ...f, uaB: -0.7, faB: 0.4, hipY: -3 };
    else { const k = (t0 - 0.2) / 0.22; p = { ...p, ...Object.fromEntries(Object.entries(hit).map(([key, v]) => [key, lerp(v, p[key], k)])), uaB: -0.5 }; }
  }
  return p;
}
function applyPose(dt, t) {
  const tp = targetPose(t), fast = PL.atkT > 0 && PL.atkT < 0.33 && PL.atkT > 0.22 ? 42 : PL.atkT > 0 ? 26 : 15, k = 1 - Math.exp(-dt * fast);
  for (const key of POSE_KEYS) { if (key === 'rot' && PL.rollT <= 0) { CUR.rot = 0; continue; } CUR[key] = key === 'rot' ? tp.rot : lerp(CUR[key], tp[key], k); }
  const c = CUR, R = RIG;
  R.root.position.set(PL.x, PL.y, 0); R.root.scale.set(PL.face, c.sq, 1);
  R.hip.position.y = 35 + c.hipY; R.hip.rotation.z = c.rot;
  R.torso.rotation.z = -c.lean; R.head.rotation.z = -c.head + c.lean * 0.4;
  R.legF.th.rotation.z = c.thF; R.legF.sh.rotation.z = c.shF; R.legF.ft.rotation.z = c.ftF - c.shF * 0.3;
  R.legB.th.rotation.z = c.thB; R.legB.sh.rotation.z = c.shB; R.legB.ft.rotation.z = c.ftB - c.shB * 0.3;
  R.armF.ua.rotation.z = c.uaF + c.lean; R.armF.fa.rotation.z = c.faF; R.armB.ua.rotation.z = c.uaB + c.lean; R.armB.fa.rotation.z = c.faB;
  R.sword.rotation.z = c.sword;
  R.skirtG.rotation.z = (c.thF + c.thB) * 0.25 + c.lean * 0.3 - PL.vx / 270 * 0.12 * PL.face;
}
const WP = new THREE.Vector3();
const wpos = o => o.getWorldPosition(WP);
function stepSecondary(dt) {
  const n = wpos(RIG.neck); SCARF.step(dt, n.x, n.y, -700, 0.93); scarfMesh.update(SCARF.p);
  const h = wpos(RIG.hairA); HAIR[0].step(dt, h.x, h.y, -800, 0.9); HAIR[1].step(dt, h.x + PL.face * 2, h.y + 2, -800, 0.9);
  hairMesh[0].update(HAIR[0].p); hairMesh[1].update(HAIR[1].p);
  const s = wpos(RIG.sash); SASH.step(dt, s.x, s.y, -900, 0.92); sashMesh.update(SASH.p);
  // the trail follows the blade only while it strikes
  const striking = PL.atkT > 0.08 && PL.atkT < 0.36;
  const tip = wpos(RIG.tip).clone(), hilt = wpos(RIG.hilt).clone();
  TRAIL.pts.unshift({ tip, hilt, a: striking ? 1 : 0 }); if (TRAIL.pts.length > TRAIL.n) TRAIL.pts.pop();
  const pos = TRAIL.mesh.geometry.attributes.position, al = TRAIL.mesh.geometry.attributes.aA;
  for (let i = 0; i < TRAIL.n; i++) { const q = TRAIL.pts[Math.min(i, TRAIL.pts.length - 1)], f = (1 - i / TRAIL.n) * q.a; pos.setXYZ(i * 2, q.tip.x, q.tip.y, 0); pos.setXYZ(i * 2 + 1, lerp(q.hilt.x, q.tip.x, 0.35), lerp(q.hilt.y, q.tip.y, 0.35), 0); al.setX(i * 2, f); al.setX(i * 2 + 1, 0); }
  pos.needsUpdate = true; al.needsUpdate = true;
}

/* ---------- the deva horse: fell from the world of the devas (Sahan's first mount), grazing, glowing ---------- */
const HORSE = { x: 1860, z: -18, t: 0, graze: 0 };
{
  const grp = new THREE.Group(); grp.position.set(HORSE.x, 0, HORSE.z); grp.scale.x = -1; scene.add(grp); HORSE.g = grp;
  const pearl = (w, h) => paint(128, 128, (g, tw, th) => { const gr = g.createRadialGradient(tw * 0.4, th * 0.35, 5, tw / 2, th / 2, tw * 0.55); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.7, '#e8dcc4'); gr.addColorStop(1, '#c7b48e'); g.fillStyle = gr; g.beginPath(); g.ellipse(tw / 2, th / 2, tw / 2 - 2, th / 2 - 2, 0, 0, Math.PI * 2); g.fill(); });
  const bodyM = new THREE.Mesh(new THREE.PlaneGeometry(120, 56), spriteMat(pearl())); bodyM.position.set(0, 82, 0); grp.add(bodyM); HORSE.body = bodyM;
  const legTex = partTex(10, 30, '#efe6d2', '#c7b48e', '#fffaf0');
  const mkLeg = (x, z, ph) => { const up = limb(30, 13, legTex, z), lo = limb(30, 10, legTex, z); lo.position.y = -30; up.add(lo); up.position.set(x, 70, 0); grp.add(up); return { up, lo, ph }; };
  HORSE.legs = [mkLeg(-40, -2, 0), mkLeg(38, -2, 1.5), mkLeg(-34, 2, 3), mkLeg(44, 2, 4.5)];
  const neck = new THREE.Group(); neck.position.set(46, 96, 1); grp.add(neck); HORSE.neck = neck;
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(30, 62).translate(0, 26, 0), spriteMat(partTex(30, 62, '#f2e8d4', '#cdbb95', '#fffaf0'))); neck.add(nm);
  const head = new THREE.Group(); head.position.y = 54; neck.add(head); HORSE.head = head;
  const hmesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 52).translate(0, -18, 0), spriteMat(partTex(26, 52, '#f5ecd9', '#cdbb95', '#fffaf0'))); hmesh.rotation.z = -1.0; head.add(hmesh);
  const ear = new THREE.Mesh(new THREE.PlaneGeometry(7, 14).translate(0, 7, 0), spriteMat(partTex(7, 14, '#efe6d2', '#c7b48e', '#fffaf0'))); ear.position.set(-4, 6, 1); head.add(ear); HORSE.ear = ear;
  HORSE.maneA = Array.from({ length: 4 }, (_, i) => { const o = new THREE.Object3D(); o.position.set(-12, 10 + i * 13, 0); neck.add(o); return o; });
  HORSE.mane = HORSE.maneA.map(() => new Chain(5, 4, 0, 0)); HORSE.maneMesh = HORSE.mane.map(() => ribbon(0xf0d79a, 4.5, 5, HORSE.z - 1, 0.8));
  HORSE.tailA = new THREE.Object3D(); HORSE.tailA.position.set(-58, 96, 0); grp.add(HORSE.tailA); HORSE.tail = new Chain(9, 6, 0, 0); HORSE.tailMesh = ribbon(0xf3dfa8, 9, 9, HORSE.z - 3, 0.75);
  const halo = plane(260, 200, glowMat(0xffe7b0, 0.22), HORSE.x, 90, HORSE.z - 6, false); HORSE.halo = halo;
}
function stepHorse(dt, t) {
  const H = HORSE; H.t += dt;
  const cyc = (H.t % 11) / 11, down = cyc < 0.15 ? smooth(0, 0.15, cyc) : cyc < 0.62 ? 1 : 1 - smooth(0.62, 0.78, cyc);   // graze, then look up
  H.neck.rotation.z = lerp(-0.45, -2.15, down) + Math.sin(t * 1.3) * 0.03; H.head.rotation.z = lerp(0.2, 0.9, down) + (down > 0.9 ? Math.sin(t * 7) * 0.05 : 0);
  H.body.scale.y = 1 + Math.sin(t * 1.8) * 0.015; H.ear.rotation.z = Math.sin(t * 0.7) > 0.96 ? -0.6 : 0;
  for (const L of H.legs) { const shift = Math.sin(t * 0.6 + L.ph) * 0.05; L.up.rotation.z = shift; L.lo.rotation.z = -shift * 0.6 + (Math.sin(t * 0.33 + L.ph) > 0.985 ? -0.5 : 0); }
  H.maneA.forEach((a, i) => { const p = wpos(a); H.mane[i].step(dt, p.x, p.y, -500, 0.9); H.maneMesh[i].update(H.mane[i].p); });
  const tp = wpos(H.tailA); H.tail.step(dt, tp.x, tp.y, -520 + Math.sin(t * 2.2) * 200, 0.94); H.tailMesh.update(H.tail.p);
  H.halo.material.uniforms.uPower.value = 0.16 + 0.42 * U.uNight.value + Math.sin(t * 1.4) * 0.03;
  if (Math.random() < dt * (2 + 6 * U.uNight.value)) spawnGlow('mote', H.x + rnd(-60, 60), rnd(40, 140), H.z + 4, rnd(-8, 8), rnd(10, 30), [1, 0.9, 0.6], rnd(1.6, 3), rnd(2, 3.5));
}

/* ---------- a training post to strike ---------- */
const DUMMY = { x: 3600, y: 120, a: 0, va: 0, flash: 0 };
{
  const tex = paint(128, 256, (g, tw, th) => { g.fillStyle = '#5b4330'; g.fillRect(tw / 2 - 6, 60, 12, th - 60); g.fillStyle = '#c9a962'; g.beginPath(); g.ellipse(tw / 2, 120, 30, 55, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#7d5f2c'; g.lineWidth = 4; for (let y = 80; y < 170; y += 16) { g.beginPath(); g.moveTo(tw / 2 - 28, y); g.lineTo(tw / 2 + 28, y + 6); g.stroke(); } g.fillStyle = '#d8bb78'; g.beginPath(); g.arc(tw / 2, 50, 22, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5b4330'; g.fillRect(tw / 2 - 40, 96, 80, 8); });
  const geo = new THREE.PlaneGeometry(60, 120).translate(0, 60, 0); DUMMY.m = new THREE.Mesh(geo, spriteMat(tex)); DUMMY.m.position.set(DUMMY.x, DUMMY.y, -6); scene.add(DUMMY.m);
}
