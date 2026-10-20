/* ===== Samsara look test · part 1: the core =====
   One flat 2D world (gameplay on z = 0) seen through a real perspective camera, with painted layers placed at real
   depths. Everything is drawn into an off-screen picture, then glow, light rays, the ink-to-color filter, the night
   grade and the paper grain are laid over it in one last pass. Colors are used as they are (no color management),
   the way a painter thinks of them. */
THREE.ColorManagement.enabled = false;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
let seed = 7; const rnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * ((seed - 1) / 2147483646); };
const rr = (a = 0, b = 1) => a + (b - a) * Math.random();
// smooth 1D value noise, for ridges, wind and flicker
const N1 = (() => { const p = Array.from({ length: 512 }, () => Math.random()); return x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(p[i & 511], p[(i + 1) & 511], u); }; })();
const fbm1 = (x, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * N1(x * f); f *= 2; a *= 0.5; } return s; };
const hex = h => new THREE.Color(h);
const mixC = (a, b, t) => a.clone().lerp(b, t);

/* quality: a PC picture, or a lighter one for phones */
const isTouch = matchMedia('(pointer: coarse)').matches;
const Q = { name: isTouch ? 'phone' : 'pc' };
function setQuality(name) { Q.name = name; Q.dpr = name === 'phone' ? 1 : Math.min(devicePixelRatio || 1, 2); Q.parts = name === 'phone' ? 0.45 : 1; Q.rays = name !== 'phone'; Q.bloomDiv = name === 'phone' ? 4 : 2; resize(); }

/* renderer and camera: the view is always 1080 world units tall at the gameplay plane */
const canvas = $('cv');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = false;
const VIEW_H = 1080, FOV = 30, D = (VIEW_H / 2) / Math.tan(FOV * Math.PI / 360);
const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 10, 60000);
camera.position.set(0, 0, D);
const scene = new THREE.Scene();
const CAM_Y0 = 330;            // the camera's resting height above the ground line
let viewW = 1920;
const WORLD_W = 5600;

/* a layer with parallax factor f: placed at a real depth so the perspective camera moves it by f;
   u, v are "layer pixels": where the thing sits on screen when the camera is at the start */
const depthOf = f => D * (1 / f - 1);
function place(obj, u, v, f) { obj.position.set(u / f, CAM_Y0 + (v - CAM_Y0) / f, -depthOf(f)); obj.scale.setScalar(1 / f); obj.userData.f = f; return obj; }

/* off-screen pictures */
const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
let rtA = new THREE.WebGLRenderTarget(4, 4, rtOpts), rtB = new THREE.WebGLRenderTarget(4, 4, rtOpts);
const rtBright = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
const rtBlur1 = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
const rtBlur2 = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
const rtRays = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
const SCREEN = { w: 4, h: 4 };
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setPixelRatio(Q.dpr || 1); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); viewW = VIEW_H * camera.aspect;
  const pw = Math.floor(w * (Q.dpr || 1)), ph = Math.floor(h * (Q.dpr || 1)); SCREEN.w = pw; SCREEN.h = ph;
  rtA.setSize(pw, ph); rtB.setSize(pw, ph);
  const bd = Q.bloomDiv || 2; rtBright.setSize(Math.max(1, pw / bd | 0), Math.max(1, ph / bd | 0));
  rtBlur1.setSize(Math.max(1, pw / (bd * 2) | 0), Math.max(1, ph / (bd * 2) | 0)); rtBlur2.setSize(rtBlur1.width, rtBlur1.height); rtRays.setSize(rtBlur1.width, rtBlur1.height);
  if (typeof POST !== 'undefined') for (const m of Object.values(POST)) if (m.uniforms.uRes) m.uniforms.uRes.value.set(pw, ph);
}
addEventListener('resize', resize);

/* one full-screen triangle pass */
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene();
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); fsScene.add(fsQuad);
function pass(mat, target) { fsQuad.material = mat; renderer.setRenderTarget(target); renderer.clear(); renderer.render(fsScene, fsCam); }
const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

/* shared uniforms: the light of the world, set every frame from the real sky */
const U = {
  uTime: { value: 0 }, uWind: { value: 0.35 }, uGust: { value: 0 }, uPlayer: { value: new THREE.Vector3() },
  uLightDir: { value: new THREE.Vector2(0.5, 0.8) }, uLightCol: { value: new THREE.Color(1, 0.95, 0.85) }, uAmb: { value: new THREE.Color(1, 1, 1) },
  uHazeCol: { value: new THREE.Color(0.7, 0.8, 0.9) }, uNight: { value: 0 }, uRain: { value: 0 },
};

/* the painted-sprite material: a picture lit from the side the light comes from. The edge facing the light
   (found by looking at the picture's own outline) catches the sun or moon; far layers fade into the haze;
   glow pictures shine on their own (and feed the bloom); trees, grass and cloth can sway in the wind. */
const SPRITE_VERT = `
uniform float uTime, uWind, uGust, uSway, uSwayPhase; uniform vec3 uPlayer; varying vec2 vUv; varying vec3 vWorld;
void main(){
  vUv = uv; vec3 p = position;
  if (uSway > 0.0) { float h = pow(max(uv.y, 0.0), 1.6); vec4 w0 = modelMatrix * vec4(p, 1.0);
    float s = sin(uTime * 1.3 + w0.x * 0.004 + uSwayPhase) * 0.6 + sin(uTime * 2.9 + w0.x * 0.011 + uSwayPhase * 2.0) * 0.25;
    p.x += (s * (0.35 + uWind) + uWind * 0.9 + uGust * 2.2) * uSway * h * 22.0; p.y -= abs(s) * uSway * h * 3.0; }
  vec4 w = modelMatrix * vec4(p, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SPRITE_FRAG = `
uniform sampler2D map; uniform vec2 uTexel, uLightDir; uniform vec3 uLightCol, uAmb, uHazeCol, uTint; uniform float uRim, uHaze, uEmit, uOpacity, uNightEmit, uNight, uRain;
varying vec2 vUv; varying vec3 vWorld;
void main(){
  vec4 t = texture2D(map, vUv); if (t.a < 0.02) discard;
  vec3 base = t.rgb * uTint;
  float edge = clamp(t.a - texture2D(map, vUv + uLightDir * uTexel * 7.0).a, 0.0, 1.0);
  vec3 col = base * uAmb + base * uLightCol * edge * uRim * 1.6 + uLightCol * edge * uRim * 0.08;
  col *= 1.0 - uRain * 0.25;
  col = mix(col, uHazeCol, uHaze);
  col += t.rgb * (uEmit + uNightEmit * uNight) * 2.2;
  gl_FragColor = vec4(col, t.a * uOpacity); }`;
function spriteMat(tex, o = {}) {
  const img = tex.image || { width: 64, height: 64 };
  return new THREE.ShaderMaterial({
    uniforms: { ...U, map: { value: tex }, uTexel: { value: new THREE.Vector2(1 / img.width, 1 / img.height) }, uRim: { value: o.rim ?? 0.9 }, uHaze: { value: o.haze ?? 0 }, uEmit: { value: o.emit ?? 0 }, uNightEmit: { value: o.nightEmit ?? 0 },
      uOpacity: { value: o.opacity ?? 1 }, uTint: { value: o.tint ? hex(o.tint) : new THREE.Color(1, 1, 1) }, uSway: { value: o.sway ?? 0 }, uSwayPhase: { value: o.phase ?? Math.random() * 6 } },
    vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}
/* a canvas painting as a texture */
function paint(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; return t; }
/* a sprite: a plane whose anchor is at (ax, ay) of its size (0.5, 0 = bottom middle) */
function sprite(tex, w, h, o = {}) {
  const g = new THREE.PlaneGeometry(w, h); g.translate(w * (0.5 - (o.ax ?? 0.5)), h * (0.5 - (o.ay ?? 0)), 0);
  const m = new THREE.Mesh(g, spriteMat(tex, o)); m.renderOrder = o.order ?? 0; return m;
}

/* ---------- the last pass: glow, rays, ink or color, night, grain ---------- */
const POST = {
  bright: new THREE.ShaderMaterial({ uniforms: { tScene: { value: null }, uThresh: { value: 0.82 } }, vertexShader: FS_VERT,
    fragmentShader: `uniform sampler2D tScene; uniform float uThresh; varying vec2 vUv; void main(){ vec3 c = texture2D(tScene, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThresh, uThresh + 0.6, l), 1.0); }` }),
  blur: new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: FS_VERT,
    fragmentShader: `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s = texture2D(tIn, vUv).rgb * 0.2270270270;
      s += texture2D(tIn, vUv + uDir * 1.3846153846).rgb * 0.3162162162; s += texture2D(tIn, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
      s += texture2D(tIn, vUv + uDir * 3.2307692308).rgb * 0.0702702703; s += texture2D(tIn, vUv - uDir * 3.2307692308).rgb * 0.0702702703; gl_FragColor = vec4(s, 1.0); }` }),
  rays: new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.8) }, uStrength: { value: 0 } }, vertexShader: FS_VERT,
    fragmentShader: `uniform sampler2D tIn; uniform vec2 uSun; uniform float uStrength; varying vec2 vUv; void main(){ vec2 d = (vUv - uSun) / 28.0; vec2 uv = vUv; vec3 s = vec3(0.0); float w = 1.0;
      for (int i = 0; i < 28; i++) { uv -= d; s += texture2D(tIn, uv).rgb * w; w *= 0.955; } gl_FragColor = vec4(s / 28.0 * uStrength, 1.0); }` }),
  final: new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, tBloom: { value: null }, tRays: { value: null }, uRes: { value: new THREE.Vector2(4, 4) }, uColor: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 }, uBloom: { value: 1.1 }, uFlash: { value: 0 }, uRain: { value: 0 } },
    vertexShader: FS_VERT,
    fragmentShader: `
uniform sampler2D tScene, tBloom, tRays; uniform vec2 uRes; uniform float uColor, uNight, uTime, uBloom, uFlash, uRain; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec2 px = 1.0 / uRes;
  vec3 sc = texture2D(tScene, vUv).rgb, bl = texture2D(tBloom, vUv).rgb, ry = texture2D(tRays, vUv).rgb;
  vec3 col = sc + bl * uBloom + ry;
  // ink lines: where the picture changes sharply, the brush darkens
  float l00 = lum(texture2D(tScene, vUv + px * vec2(-1.5, -1.5)).rgb), l20 = lum(texture2D(tScene, vUv + px * vec2(1.5, -1.5)).rgb);
  float l02 = lum(texture2D(tScene, vUv + px * vec2(-1.5, 1.5)).rgb), l22 = lum(texture2D(tScene, vUv + px * vec2(1.5, 1.5)).rgb);
  float edge = clamp((abs(l00 - l22) + abs(l20 - l02)) * 2.2, 0.0, 1.0);
  float grain = h(vUv * uRes + fract(uTime * 7.0) * 100.0);
  float fiber = h(floor(vUv * uRes / 3.0)) * 0.5 + h(floor(vUv * uRes / 11.0)) * 0.5;
  // the ink world: a sepia wash on old paper, with gold light where things glow (the first mood)
  float l = lum(aces(col * 1.05));
  vec3 paper = vec3(0.93, 0.87, 0.74) * (0.9 + 0.1 * fiber);
  vec3 inkc = vec3(0.10, 0.08, 0.05);
  vec3 ink = mix(inkc, paper, smoothstep(0.03, 0.92, pow(l, 0.85)));
  ink = mix(ink, ink * vec3(0.92, 0.85, 0.72), 0.4);
  ink *= 1.0 - edge * 0.55;
  float glow = lum(bl * uBloom + ry);
  ink += vec3(1.0, 0.72, 0.30) * glow * 1.25;
  // color: the world as it is, toned, with night leaning blue and violet (the third mood)
  vec3 c = aces(col * 1.12);
  float g = lum(c); c = mix(vec3(g), c, 1.12);
  c = mix(c, c * vec3(0.78, 0.84, 1.22) + vec3(0.02, 0.0, 0.05), uNight * 0.55);
  c *= 1.0 - edge * 0.12;
  vec3 outc = mix(ink, c, uColor);
  // vignette, grain, lightning
  vec2 q = vUv - 0.5; outc *= 1.0 - dot(q, q) * 0.55;
  outc += (grain - 0.5) * 0.035;
  outc = mix(outc, vec3(0.92, 0.95, 1.0), uFlash);
  gl_FragColor = vec4(outc, 1.0); }` }),
};
