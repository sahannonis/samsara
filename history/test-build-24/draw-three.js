/* ===== Samsara · the painted look (three.js), from build 24 =====
   The world drawn with three.js instead of ink: the real sky, painted far and near layers at real depths, rock,
   planks, ladders and water made from the level's own shapes, grass that sways and parts, leaves, fireflies, embers,
   and the traveler as a cut-out body moved by the game's own poses, with cloth and hair on physics.
   Then glow, light rays, the ink-to-color filter (the first realization), the night grade and paper grain.
   The rules never change: this file only reads the game. Props, foes and words still come from the ink drawing,
   on the clear canvas above; they move to this file in the next builds. If WebGL is missing, the ink drawing stays. */
const V3 = { ready: false, failed: false, booting: false, why: '', rain: false, stats: {} };
V3.want = () => SETTINGS.look === 'painted';
V3.on = () => V3.ready && !V3.failed && V3.want() && !!P && mode !== 'map' && mode !== 'meditate';
V3.riderInk = () => !!(P && P.mount);   // on horseback the ink body and horse are drawn, for now
if (!SETTINGS.look) { let t = null; try { t = localStorage.getItem('samsara.testLook'); } catch (_) {} SETTINGS.look = navigator.webdriver ? (t || 'ink') : 'painted'; }
function bootThree() {
  if (V3.ready || V3.booting || V3.failed) return; V3.booting = true;
  const src = document.getElementById('threeSrc'), glc = document.getElementById('gl');
  if (!src || !glc || src.textContent.length < 1000) { V3.failed = true; V3.why = 'three.js is not in this page'; V3.booting = false; return; }
  const url = URL.createObjectURL(new Blob([src.textContent], { type: 'text/javascript' }));
  import(url).then(THREE => { try { makeV3(THREE); V3.ready = true; } catch (e) { V3.failed = true; V3.why = e.message; console.error(e); } V3.booting = false; lookShow(); })
    .catch(e => { V3.failed = true; V3.why = e.message; V3.booting = false; console.error(e); lookShow(); });
}
function lookShow() {
  const glc = document.getElementById('gl'); if (glc) glc.style.display = V3.want() && V3.ready && !V3.failed ? 'block' : 'none';
  const n = document.getElementById('setLookNote'); if (n) n.textContent = V3.want() ? (V3.failed ? 'Your browser could not start WebGL, so the ink drawing stays. ' + V3.why : V3.ready ? 'Painted with three.js. The ink world turns to color with the first realization.' : 'Loading the painted world…') : 'The hand-drawn ink world.';
}

function makeV3(THREE) {
  THREE.ColorManagement.enabled = false;
  const glc = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 is needed');
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.autoClear = false;
  const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let seed = 7; const srnd = (a = 0, b = 1) => { seed = (seed * 16807) % 2147483647; return a + (b - a) * ((seed - 1) / 2147483646); };
  const rr = (a = 0, b = 1) => a + (b - a) * Math.random();
  const N1 = (() => { const p = Array.from({ length: 512 }, () => Math.random()); return x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(p[i & 511], p[(i + 1) & 511], u); }; })();
  // periodic noise, so painted layers tile without a seam: x in [0, 1)
  const NP = (() => { const p = Array.from({ length: 4096 }, () => Math.random()); return (x, cells) => { const X = x * cells, i = Math.floor(X), f = X - i, u = f * f * (3 - 2 * f); return lerp(p[((i % cells) + cells) % cells + cells], p[(((i + 1) % cells) + cells) % cells + cells], u); }; })();
  const fbmP = (x, cells, o = 5) => { let s = 0, a = 0.5; for (let i = 0; i < o; i++) { s += a * NP(x, cells << i); a *= 0.5; } return s; };
  const hex = h => new THREE.Color(h);

  /* quality */
  const Q = { dpr: Math.min(devicePixelRatio || 1, 2), parts: 1, rays: true, bloomDiv: 2 };
  if (matchMedia('(pointer: coarse)').matches) Object.assign(Q, { dpr: 1, parts: 0.45, rays: false, bloomDiv: 4 });
  if (navigator.webdriver) Q.dpr = 0.5;   // headless tests draw in software: a smaller picture keeps them quick

  /* camera: the view is W x H world units at the gameplay plane (z = 0). Three's y goes up, the game's goes down */
  const FOV = 30, D = (H / 2) / Math.tan(FOV * Math.PI / 360);
  const camera = new THREE.PerspectiveCamera(FOV, W / H, 10, 90000); camera.position.set(W / 2, -H / 2, D);
  const scene = new THREE.Scene();
  const depthOf = f => D * (1 / f - 1);
  /* place a thing at parallax f: (gx, gy) is where it shows when the camera's middle is at (rcx, rcy), all game units */
  function place(obj, gx, gy, f, rcx, rcy) { obj.position.set(rcx + (gx - rcx) / f, -(rcy + (gy - rcy) / f), -depthOf(f)); obj.scale.setScalar(1 / f); return obj; }

  /* off-screen pictures */
  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  let rtA = new THREE.WebGLRenderTarget(4, 4, rtOpts), rtB = new THREE.WebGLRenderTarget(4, 4, rtOpts);
  const half = () => new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtBright = half(), rtBlur1 = half(), rtBlur2 = half(), rtRays = half();
  const SCREEN = { w: 0, h: 0 };
  function resize() {
    const r = glc.getBoundingClientRect(); if (!r.width || !r.height) return;
    const pw = Math.max(4, Math.round(r.width * Q.dpr)), ph = Math.max(4, Math.round(r.height * Q.dpr));
    if (pw === SCREEN.w && ph === SCREEN.h) return; SCREEN.w = pw; SCREEN.h = ph;
    renderer.setPixelRatio(1); renderer.setSize(pw, ph, false);
    camera.aspect = pw / ph; camera.updateProjectionMatrix();
    rtA.setSize(pw, ph); rtB.setSize(pw, ph);
    const bd = Q.bloomDiv; rtBright.setSize(Math.max(1, pw / bd | 0), Math.max(1, ph / bd | 0));
    rtBlur1.setSize(Math.max(1, pw / (bd * 2) | 0), Math.max(1, ph / (bd * 2) | 0)); rtBlur2.setSize(rtBlur1.width, rtBlur1.height); rtRays.setSize(rtBlur1.width, rtBlur1.height);
  }
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), fsScene = new THREE.Scene();
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); fsQuad.frustumCulled = false; fsScene.add(fsQuad);
  function pass(mat, target) { fsQuad.material = mat; renderer.setRenderTarget(target); renderer.clear(); renderer.render(fsScene, fsCam); }
  const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
  const NOISE = `float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n2(p); p *= 2.03; a *= 0.5; } return s; }`;

  /* shared light of the world, set every frame from the real sky */
  const U = {
    uTime: { value: 0 }, uWind: { value: 0.3 }, uGust: { value: 0 }, uPlayer: { value: new THREE.Vector3() },
    uLightDir: { value: new THREE.Vector2(0.5, 0.8) }, uLightCol: { value: new THREE.Color(1, 0.95, 0.85) }, uAmb: { value: new THREE.Color(1, 1, 1) },
    uHazeCol: { value: new THREE.Color(0.7, 0.8, 0.9) }, uNight: { value: 0 }, uRain: { value: 0 },
  };

  /* the painted-sprite material (see the look test): lit on the side the light comes from, hazed with distance */
  const SPRITE_VERT = `
uniform float uTime, uWind, uGust, uSway, uSwayPhase; varying vec2 vUv;
void main(){
  vUv = uv; vec3 p = position;
  if (uSway > 0.0) { float hh = pow(max(uv.y, 0.0), 1.6); vec4 w0 = modelMatrix * vec4(p, 1.0);
    float s = sin(uTime * 1.3 + w0.x * 0.004 + uSwayPhase) * 0.6 + sin(uTime * 2.9 + w0.x * 0.011 + uSwayPhase * 2.0) * 0.25;
    p.x += (s * (0.35 + uWind) + uWind * 0.9 + uGust * 2.2) * uSway * hh * 22.0; p.y -= abs(s) * uSway * hh * 3.0; }
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0); }`;
  const SPRITE_FRAG = `
uniform sampler2D map; uniform vec2 uTexel, uLightDir; uniform vec3 uLightCol, uAmb, uHazeCol, uTint; uniform float uRim, uHaze, uEmit, uOpacity, uNightEmit, uNight, uRain, uFlip;
varying vec2 vUv;
void main(){
  vec4 t = texture2D(map, vUv); if (t.a < 0.02) discard;
  vec3 base = t.rgb * uTint;
  float edge = clamp(t.a - texture2D(map, vUv + vec2(uLightDir.x * uFlip, uLightDir.y) * uTexel * 7.0).a, 0.0, 1.0);
  vec3 col = base * uAmb + base * uLightCol * edge * uRim * 1.6 + uLightCol * edge * uRim * 0.08;
  col *= 1.0 - uRain * 0.25;
  col = mix(col, uHazeCol, uHaze);
  col += t.rgb * uTint * (uEmit + uNightEmit * uNight) * 2.2;
  gl_FragColor = vec4(col, t.a * uOpacity); }`;
  function spriteMat(tex, o = {}) {
    const img = tex.image || { width: 64, height: 64 };
    return new THREE.ShaderMaterial({
      uniforms: { ...U, map: { value: tex }, uTexel: { value: new THREE.Vector2(1 / img.width, 1 / img.height) }, uRim: { value: o.rim ?? 0.9 }, uHaze: { value: o.haze ?? 0 }, uEmit: { value: o.emit ?? 0 }, uNightEmit: { value: o.nightEmit ?? 0 },
        uOpacity: { value: o.opacity ?? 1 }, uTint: { value: o.tint ? hex(o.tint) : new THREE.Color(1, 1, 1) }, uSway: { value: o.sway ?? 0 }, uSwayPhase: { value: o.phase ?? Math.random() * 6 }, uFlip: { value: 1 } },
      vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
  }
  function paint(w, h, fn, o = {}) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; if (o.wrapX) t.wrapS = THREE.RepeatWrapping; if (o.wrapY) t.wrapT = THREE.RepeatWrapping; return t; }
  function sprite(tex, w, h, o = {}) { const g = new THREE.PlaneGeometry(w, h); g.translate(w * (0.5 - (o.ax ?? 0.5)), h * (0.5 - (o.ay ?? 0)), 0); const m = new THREE.Mesh(g, spriteMat(tex, o)); m.renderOrder = o.order ?? 0; m.frustumCulled = false; return m; }
  function strokes(g, w, h, n, col, len, alpha, ang = -0.7) { g.save(); g.strokeStyle = col; g.globalAlpha = alpha; g.lineCap = 'round'; for (let i = 0; i < n; i++) { const x = srnd(0, w), y = srnd(0, h), l = srnd(len * 0.4, len); g.lineWidth = srnd(1, 3.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); g.stroke(); } g.restore(); }
  function treeBlob(g, cx, cy, r, colA, colB, n = 26) { for (let i = 0; i < n; i++) { const a = srnd(0, TAU), d = srnd(0, r * 0.8), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7, r2 = srnd(r * 0.25, r * 0.5); const gr = g.createRadialGradient(x - r2 * 0.3, y - r2 * 0.4, 1, x, y, r2); gr.addColorStop(0, colA); gr.addColorStop(1, colB); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r2, 0, TAU); g.fill(); } }
  function pagoda(g, cx, by, s, wall, roof) { g.save(); g.translate(cx, by); g.scale(s, s); let y = 0, w = 120;
    for (let i = 0; i < 4; i++) { const th = 34 - i * 3; g.fillStyle = wall; g.fillRect(-w * 0.36, y - th, w * 0.72, th);
      g.fillStyle = roof; g.beginPath(); g.moveTo(-w * 0.62, y - th + 4); g.quadraticCurveTo(-w * 0.3, y - th - 6, 0, y - th - 18); g.quadraticCurveTo(w * 0.3, y - th - 6, w * 0.62, y - th + 4); g.quadraticCurveTo(w * 0.4, y - th - 2, 0, y - th - 6); g.quadraticCurveTo(-w * 0.4, y - th - 2, -w * 0.62, y - th + 4); g.fill(); y -= th + 12; w *= 0.8; }
    g.fillStyle = roof; g.fillRect(-2, y - 26, 4, 30); g.restore(); }
  // a ridge line that tiles: x runs over the whole width once
  function ridgeP(g, w, h, y0, amp, cells, off) { g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 4) { const u = x / w, y = y0 - amp * (fbmP((u + off) % 1, cells) * 1.6 - 0.3) - amp * 0.6 * Math.pow(Math.max(0, NP((u + off * 3) % 1, Math.max(2, cells >> 2)) - 0.55), 2) * 4; g.lineTo(x, y); } g.lineTo(w, h); g.closePath(); }

  /* ---------- the last pass ---------- */
  const POST = {
    bright: new THREE.ShaderMaterial({ uniforms: { tScene: { value: null }, uThresh: { value: 0.82 } }, vertexShader: FS_VERT, depthTest: false,
      fragmentShader: `uniform sampler2D tScene; uniform float uThresh; varying vec2 vUv; void main(){ vec3 c = texture2D(tScene, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uThresh, uThresh + 0.6, l), 1.0); }` }),
    blur: new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: FS_VERT, depthTest: false,
      fragmentShader: `uniform sampler2D tIn; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 s = texture2D(tIn, vUv).rgb * 0.2270270270;
        s += texture2D(tIn, vUv + uDir * 1.3846153846).rgb * 0.3162162162; s += texture2D(tIn, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
        s += texture2D(tIn, vUv + uDir * 3.2307692308).rgb * 0.0702702703; s += texture2D(tIn, vUv - uDir * 3.2307692308).rgb * 0.0702702703; gl_FragColor = vec4(s, 1.0); }` }),
    rays: new THREE.ShaderMaterial({ uniforms: { tIn: { value: null }, uSun: { value: new THREE.Vector2(0.5, 0.8) }, uStrength: { value: 0 } }, vertexShader: FS_VERT, depthTest: false,
      fragmentShader: `uniform sampler2D tIn; uniform vec2 uSun; uniform float uStrength; varying vec2 vUv; void main(){ vec2 d = (vUv - uSun) / 28.0; vec2 uv = vUv; vec3 s = vec3(0.0); float w = 1.0;
        for (int i = 0; i < 28; i++) { uv -= d; s += texture2D(tIn, uv).rgb * w; w *= 0.955; } gl_FragColor = vec4(s / 28.0 * uStrength, 1.0); }` }),
    final: new THREE.ShaderMaterial({ depthTest: false,
      uniforms: { tScene: { value: null }, tBloom: { value: null }, tRays: { value: null }, uRes: { value: new THREE.Vector2(4, 4) }, uColor: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 }, uBloom: { value: 1.1 }, uFlash: { value: 0 }, uHurt: { value: 0 } },
      vertexShader: FS_VERT,
      fragmentShader: `
uniform sampler2D tScene, tBloom, tRays; uniform vec2 uRes; uniform float uColor, uNight, uTime, uBloom, uFlash, uHurt; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec2 px = 1.0 / uRes;
  vec3 sc = texture2D(tScene, vUv).rgb, bl = texture2D(tBloom, vUv).rgb, ry = texture2D(tRays, vUv).rgb;
  vec3 col = sc + bl * uBloom + ry;
  float l00 = lum(texture2D(tScene, vUv + px * vec2(-1.5, -1.5)).rgb), l20 = lum(texture2D(tScene, vUv + px * vec2(1.5, -1.5)).rgb);
  float l02 = lum(texture2D(tScene, vUv + px * vec2(-1.5, 1.5)).rgb), l22 = lum(texture2D(tScene, vUv + px * vec2(1.5, 1.5)).rgb);
  float edge = clamp((abs(l00 - l22) + abs(l20 - l02)) * 2.2, 0.0, 1.0);
  float grain = h(vUv * uRes + fract(uTime * 7.0) * 100.0);
  float fiber = h(floor(vUv * uRes / 3.0)) * 0.5 + h(floor(vUv * uRes / 11.0)) * 0.5;
  float l = lum(aces(col * 1.05));
  vec3 paper = vec3(0.93, 0.87, 0.74) * (0.9 + 0.1 * fiber);
  vec3 ink = mix(vec3(0.10, 0.08, 0.05), paper, smoothstep(0.03, 0.92, pow(l, 0.85)));
  ink = mix(ink, ink * vec3(0.92, 0.85, 0.72), 0.4);
  ink *= 1.0 - edge * 0.55;
  ink += vec3(1.0, 0.72, 0.30) * lum(bl * uBloom + ry) * 1.25;
  vec3 c = aces(col * 1.12);
  float g = lum(c); c = mix(vec3(g), c, 1.12);
  c = mix(c, c * vec3(0.78, 0.84, 1.22) + vec3(0.02, 0.0, 0.05), uNight * 0.55);
  c *= 1.0 - edge * 0.12;
  vec3 outc = mix(ink, c, uColor);
  vec2 q = vUv - 0.5; outc *= 1.0 - dot(q, q) * 0.55;
  outc = mix(outc, outc * vec3(1.0, 0.55, 0.5), uHurt * smoothstep(0.15, 0.7, length(q)));
  outc += (grain - 0.5) * 0.035;
  outc = mix(outc, vec3(0.92, 0.95, 1.0), uFlash);
  gl_FragColor = vec4(outc, 1.0); }` }),
  };

  /* ---------- the sky ---------- */
  const SKYU = { uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uSun: { value: new THREE.Vector2(0.5, 0.8) }, uMoon: { value: new THREE.Vector2(0.3, 0.7) },
    uSunVis: { value: 1 }, uMoonVis: { value: 0 }, uPhase: { value: 0.5 }, uWaxing: { value: 1 }, uStars: { value: 0 }, uCloud: { value: 0.45 }, uSunCol: { value: new THREE.Color(1, 0.9, 0.7) } };
  const skyMat = new THREE.ShaderMaterial({ uniforms: { ...U, ...SKYU, uRes: { value: new THREE.Vector2(4, 4) }, uCam: { value: 0 } }, vertexShader: FS_VERT, depthWrite: false, depthTest: false,
    fragmentShader: `
uniform vec3 uTop, uBot, uSunCol, uAmb; uniform vec2 uSun, uMoon, uRes; uniform float uSunVis, uMoonVis, uPhase, uWaxing, uStars, uCloud, uTime, uWind, uRain, uCam; varying vec2 vUv;
${NOISE}
void main(){
  float asp = uRes.x / uRes.y; vec2 p = vec2(vUv.x * asp, vUv.y);
  vec3 col = mix(uBot, uTop, smoothstep(0.12, 0.95, vUv.y));
  vec2 sp = floor(p * 220.0 + vec2(uCam * 0.004, 0.0)); float st = step(0.9965, h(sp)) * (0.6 + 0.4 * sin(uTime * 3.0 + h(sp) * 50.0));
  col += vec3(0.85, 0.9, 1.0) * st * uStars * smoothstep(0.25, 0.6, vUv.y) * (1.0 - uRain);
  vec2 sd = vec2((vUv.x - uSun.x) * asp, vUv.y - uSun.y); float sr = length(sd);
  col += uSunCol * (smoothstep(0.034, 0.028, sr) * 5.0 + exp(-sr * 9.0) * 0.55 + exp(-sr * 3.0) * 0.18) * uSunVis * (1.0 - uRain * 0.85);
  vec2 md = vec2((vUv.x - uMoon.x) * asp, vUv.y - uMoon.y); float mr = length(md), disc = smoothstep(0.026, 0.022, mr);
  float k = cos(uPhase * 3.14159265); float term = md.x * (uWaxing > 0.5 ? -1.0 : 1.0) / 0.024; float lit = smoothstep(-0.15, 0.15, (term + k * sqrt(max(0.0, 1.0 - pow(md.y / 0.024, 2.0)))) * -1.0);
  float shade = 1.0 - (1.0 - lit) * 0.88; vec3 mcol = vec3(0.92, 0.94, 1.0) * (0.8 + 0.2 * fbm(md * 140.0));
  col = mix(col, mcol * shade * 1.6, disc * uMoonVis * (1.0 - uRain * 0.7)); col += vec3(0.6, 0.7, 1.0) * exp(-mr * 14.0) * 0.35 * uMoonVis * uPhase;
  vec2 cp = vec2(p.x * 1.6 + uTime * (0.006 + uWind * 0.03) + uCam * 0.00012, p.y * 3.2);
  float cl = smoothstep(0.52 - uCloud * 0.25 - uRain * 0.3, 0.85, fbm(cp)) * smoothstep(0.25, 0.55, vUv.y);
  vec3 ccol = mix(uBot * 1.1, vec3(1.0), 0.35) * (0.55 + 0.45 * uAmb) + uSunCol * 0.25 * uSunVis; ccol = mix(ccol, vec3(0.32, 0.34, 0.38) * (0.4 + uAmb * 0.6), uRain);
  col = mix(col, ccol, cl * 0.85);
  col = mix(col, vec3(0.30, 0.32, 0.36) * (0.35 + uAmb * 0.65), uRain * 0.55);
  gl_FragColor = vec4(col, 1.0); }` });

  /* ---------- far and mid: painted layers that tile along the whole land ---------- */
  const REF = { cx: W / 2, cy: 942 };   // the camera's middle when standing on the first ground (y 1000)
  function layer(tex, tileW, tileH, f, bottomY, o) {
    const span = (LW * f + W) + 800, extra = 2400, geo = new THREE.PlaneGeometry(span, tileH + extra);
    geo.translate(span / 2, (tileH + extra) / 2 - extra, 0);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setX(i, uv.getX(i) * span / tileW); uv.setY(i, uv.getY(i) * (tileH + extra) / tileH - extra / tileH); }
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.Mesh(geo, spriteMat(tex, o)); m.material.uniforms.uTexel.value.set(1 / tex.image.width, 1 / tex.image.height); m.frustumCulled = false; m.renderOrder = o.order;
    place(m, -400, bottomY, f, REF.cx, REF.cy); scene.add(m); return m;
  }
  { // far mountains and temples on the heights
    const TW = 2048, TH = 640;
    const tex = paint(TW, TH, (g) => { seed = 11;
      const back = g.createLinearGradient(0, 120, 0, TH); back.addColorStop(0, '#8fa2b8'); back.addColorStop(1, '#9aabbe');
      ridgeP(g, TW, TH, 330, 210, 6, 0.1); g.fillStyle = back; g.fill(); strokes(g, TW, TH * 0.6, 500, '#6f8299', 60, 0.09);
      const front = g.createLinearGradient(0, 220, 0, TH); front.addColorStop(0, '#5f7085'); front.addColorStop(1, '#7d8ea2');
      ridgeP(g, TW, TH, 450, 170, 9, 0.6); g.fillStyle = front; g.fill(); strokes(g, TW, TH, 700, '#3f4d5e', 45, 0.08);
      pagoda(g, 1320, 380, 0.62, '#4a5464', '#2f3742'); pagoda(g, 560, 420, 0.42, '#4a5464', '#2f3742'); });
    const glow = paint(TW, TH, (g) => { g.fillStyle = '#ffd890'; for (const [cx, by, s] of [[1320, 380, 0.62], [560, 420, 0.42]]) { let y = 0, w = 120; for (let i = 0; i < 4; i++) { const th = 34 - i * 3; for (let k = -1; k <= 1; k++) g.fillRect(cx + (k * w * 0.18 - 4) * s, by + (y - th * 0.75) * s, 8 * s, th * 0.45 * s); y -= th + 12; w *= 0.8; } } });
    layer(tex, 1000, 312, 0.12, 1000, { rim: 0.5, haze: 0.42, order: 0 });
    layer(glow, 1000, 312, 0.12, 1000, { rim: 0, nightEmit: 1.4, tint: '#000000', add: true, order: 1 });
  }
  { // mid: forested hills, pagodas and far roofs
    const TW = 2048, TH = 560;
    const tex = paint(TW, TH, (g) => { seed = 23;
      const hill = g.createLinearGradient(0, 160, 0, TH); hill.addColorStop(0, '#5e7a5c'); hill.addColorStop(1, '#2e4434');
      ridgeP(g, TW, TH, 330, 150, 5, 0.3); g.fillStyle = hill; g.fill();
      for (let i = 0; i < 110; i++) { const x = srnd(30, TW - 30), y = 270 + srnd(0, 220); treeBlob(g, x, y, srnd(18, 34), '#6f9168', '#2b4130', 8); }
      strokes(g, TW, TH, 400, '#1f2f24', 30, 0.12, -1.2);
      pagoda(g, 900, 310, 0.5, '#6a5546', '#3a2c25'); pagoda(g, 380, 340, 0.38, '#6a5546', '#3a2c25');
      for (let i = 0; i < 9; i++) { const x = 1500 + i * 34 + srnd(-8, 8), y = 370 + srnd(-10, 10); g.fillStyle = '#5a4436'; g.fillRect(x, y, 26, 16); g.fillStyle = '#33261f'; g.beginPath(); g.moveTo(x - 6, y + 2); g.quadraticCurveTo(x + 13, y - 14, x + 32, y + 2); g.fill(); }
      g.fillStyle = '#2e4434'; g.fillRect(0, TH - 40, TW, 40); });
    const glow = paint(TW, TH, (g) => { g.fillStyle = '#ffcf80'; for (let i = 0; i < 9; i++) g.fillRect(1506 + i * 34, 376, 6, 6); for (const [cx, by, s] of [[900, 310, 0.5], [380, 340, 0.38]]) g.fillRect(cx - 4 * s * 2, by - 28 * s, 16 * s, 12 * s); });
    layer(tex, 1000, 273, 0.35, 1030, { rim: 0.7, haze: 0.24, order: 2 });
    layer(glow, 1000, 273, 0.35, 1030, { rim: 0, nightEmit: 1.6, tint: '#000000', add: true, order: 3 });
  }
  /* mist between the hills and the path */
  function mistMat(alpha) { return new THREE.ShaderMaterial({ uniforms: { ...U, uA: { value: alpha } }, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uTime, uWind, uA, uRain; uniform vec3 uHazeCol, uAmb; varying vec2 vUv; varying vec3 vW; ${NOISE}
      void main(){ vec2 p = vW.xy * 0.0016 + vec2(uTime * (0.01 + uWind * 0.05), 0.0); float m = fbm(p) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
        vec3 c = mix(uHazeCol, vec3(1.0), 0.35) * (0.45 + 0.55 * uAmb); gl_FragColor = vec4(c, m * (uA + uRain * 0.15)); }` }); }
  { const span = LW * 0.5 + W + 1600, a = new THREE.Mesh(new THREE.PlaneGeometry(span, 420), mistMat(0.45)); a.geometry.translate(span / 2, 210, 0); place(a, -800, 1060, 0.5, REF.cx, REF.cy); a.renderOrder = 4; a.frustumCulled = false; scene.add(a); }

  /* ground lookups from the level */
  const tops = []; // exposed tops: { x0, x1, y, s }
  for (const s of SOLIDS) { let run = null; for (let x = s.x; x <= s.x + s.w; x += 8) { const open = x < s.x + s.w && !pointSolid(Math.min(x + 4, s.x + s.w - 1), s.y - 3); if (open && !run) run = { x0: x, y: s.y, s }; if (!open && run) { run.x1 = x; tops.push(run); run = null; } } if (run) { run.x1 = s.x + s.w; tops.push(run); } }
  const floorAt = x => { let best = null; for (const t of tops) if (x >= t.x0 && x <= t.x1 && t.s.h > 60 && (best === null || t.y > best)) best = t.y; return best; };
  const inDark = x => DARKS.some(d => x > d.x - 100 && x < d.x + d.w + 100);
  const inWaterX = x => WATERS.some(w => x > w.x - 60 && x < w.x + w.w + 60);

  /* ---------- near: houses, trees and walls behind the path (parallax 0.75), grounded where the land is ---------- */
  const SWAYERS = [];
  function makeTree(kind, w, h, order) {
    const trunk = paint(256, 512, (g) => { g.fillStyle = kind === 'blossom' ? '#3b2a22' : '#2f2620'; g.beginPath(); g.moveTo(110, 512); g.bezierCurveTo(120, 380, 90, 300, 118, 180); g.lineTo(140, 180); g.bezierCurveTo(130, 300, 160, 380, 150, 512); g.fill();
      g.lineWidth = 9; g.strokeStyle = g.fillStyle; g.lineCap = 'round'; g.beginPath(); g.moveTo(125, 260); g.quadraticCurveTo(70, 200, 40, 170); g.moveTo(132, 230); g.quadraticCurveTo(190, 180, 215, 150); g.stroke(); strokes(g, 256, 512, 40, '#120d0a', 30, 0.3, -1.4); });
    const crown = paint(512, 512, (g) => { seed = (Math.random() * 1e6) | 0; const A = kind === 'blossom' ? '#f6b8c8' : kind === 'gold' ? '#e8c45a' : '#6f9a58', B = kind === 'blossom' ? '#b0506e' : kind === 'gold' ? '#8a6a20' : '#2f4f2a';
      treeBlob(g, 256, 230, 190, A, B, 60); treeBlob(g, 150, 290, 110, A, B, 22); treeBlob(g, 370, 280, 120, A, B, 22); });
    const grp = new THREE.Group();
    const t = sprite(trunk, w * 0.5, h, { ax: 0.5, ay: 0, rim: 0.9, order }); const c = sprite(crown, w, w, { ax: 0.5, ay: 0.5, rim: 1.0, sway: 1.0, order: order + 0.1 }); c.position.set(0, h * 0.75, 1);
    grp.add(t, c); SWAYERS.push(c); return grp;
  }
  function makeHouse(w, h, glowCol, order) {
    const tex = paint(512, 384, (g) => { g.fillStyle = '#3b2c22'; g.fillRect(70, 150, 372, 234); g.fillStyle = '#6b5240'; g.fillRect(84, 165, 344, 219); g.fillStyle = '#241a14'; for (let i = 0; i < 6; i++) g.fillRect(84 + i * 69, 165, 6, 219);
      g.fillStyle = '#2a1f19'; g.beginPath(); g.moveTo(20, 170); g.quadraticCurveTo(140, 120, 256, 40); g.quadraticCurveTo(372, 120, 492, 170); g.quadraticCurveTo(372, 140, 256, 90); g.quadraticCurveTo(140, 140, 20, 170); g.fill();
      g.fillStyle = '#1a120e'; g.fillRect(150, 230, 70, 90); g.fillRect(300, 230, 70, 90); g.fillRect(232, 270, 48, 114); strokes(g, 512, 384, 120, '#100b08', 26, 0.2, -0.3); });
    const glow = paint(512, 384, (g) => { g.fillStyle = glowCol; g.fillRect(156, 236, 58, 78); g.fillRect(306, 236, 58, 78); });
    const grp = new THREE.Group(); const s = sprite(tex, w, h, { ax: 0.5, ay: 0, rim: 0.8, order }); const gl = sprite(glow, w, h, { ax: 0.5, ay: 0, rim: 0, tint: '#000000', nightEmit: 1.5, add: true, order: order + 0.1 }); gl.position.z = 1; grp.add(s, gl); return grp;
  }
  const ROCKS = paint(512, 256, (g) => { seed = 77; for (let i = 0; i < 9; i++) { const x = srnd(20, 440), w = srnd(70, 150), h = srnd(60, 190); g.fillStyle = `hsl(28,${srnd(6, 12)}%,${srnd(18, 30)}%)`; g.beginPath(); g.moveTo(x, 256); g.lineTo(x + w * 0.1, 256 - h); g.lineTo(x + w * 0.6, 256 - h - srnd(0, 30)); g.lineTo(x + w, 256); g.fill(); } strokes(g, 512, 256, 120, '#0d0b08', 22, 0.3, -1.2); });
  {
    seed = 5; const F = 0.75; let x = 260, k = 0;
    while (x < LW - 100) {
      const gy = floorAt(x); x += 0;
      if (gy !== null && !inWaterX(x)) {
        const cx = x + 0.05 * W, cy = gy - 58, grp = new THREE.Group(), order = 6 + (k % 7) * 0.01;
        let o;
        if (inDark(x)) { o = sprite(ROCKS, 520, 260, { ax: 0.5, ay: 0, rim: 0.6, order }); }
        else { const r = srnd(); o = r < 0.18 ? makeHouse(srnd(380, 520), srnd(290, 390), srnd() < 0.5 ? '#ffc870' : '#ffb860', order) : r < 0.32 ? sprite(ROCKS, 520, 260, { ax: 0.5, ay: 0, rim: 0.8, order }) : makeTree(r < 0.45 ? 'gold' : r < 0.5 ? 'blossom' : 'green', srnd(320, 460), srnd(440, 620), order); }
        grp.add(o); place(grp, x, gy + 70, F, cx, cy); scene.add(grp); k++;
      }
      x += srnd(380, 720);
    }
  }
  /* the front layer: dark ferns close to the eye (parallax 1.35), low at the screen's foot */
  { const fern = paint(512, 384, (g) => { seed = 91; for (let k = 0; k < 9; k++) { const bx = srnd(30, 480); g.strokeStyle = `hsl(${srnd(90, 120)},22%,${srnd(7, 13)}%)`; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, 384); const tx = bx + srnd(-120, 120), ty = srnd(40, 160); g.quadraticCurveTo(bx, ty + 80, tx, ty); g.stroke();
      for (let i = 0; i < 14; i++) { const t = i / 14, x = lerp(bx, tx, t), y = lerp(384, ty, t); g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 26 * (1 - t), y - 14); g.moveTo(x, y); g.lineTo(x + 26 * (1 - t), y - 14); g.stroke(); } } });
    const F = 1.35; seed = 13;
    for (let x = 900; x < LW; x += srnd(1300, 2100)) { const gy = floorAt(x); if (gy === null || inDark(x)) continue; const s = sprite(fern, 300, 220, { ax: 0.5, ay: 0, rim: 0.5, sway: 0.6, order: 90 }); place(s, x, gy + 150, F, x + 0.05 * W, gy - 58); scene.add(s); SWAYERS.push(s); }
  }

  /* ---------- the land itself: rock, earth, grass lips, mud, ice and hot stone, from the level's shapes ---------- */
  const SURF = { mud: 1, ice: 2, hot: 3 };
  const TERRAIN_VERT = `attribute vec2 aL; attribute vec2 aS; attribute vec2 aK; varying vec2 vL; varying vec2 vS; varying vec2 vK; varying vec2 vW;
    void main(){ vL = aL; vS = aS; vK = aK; vec4 w = modelMatrix * vec4(position, 1.0); vW = vec2(w.x, -w.y); gl_Position = projectionMatrix * viewMatrix * w; }`;
  const TERRAIN_FRAG = `uniform float uTime, uOpacity; uniform vec3 uAmb, uLightCol; uniform vec2 uLightDir; varying vec2 vL; varying vec2 vS; varying vec2 vK; varying vec2 vW;
    ${NOISE}
    void main(){
      float d = vL.y, kind = vK.x, top = vK.y; vec2 p = vW;
      float strata = fbm(vec2(p.x * 0.004, p.y * 0.03)), rough = fbm(p * 0.035);
      vec3 col = mix(vec3(0.19, 0.16, 0.13), vec3(0.38, 0.32, 0.25), smoothstep(0.3, 0.8, strata * 0.6 + rough * 0.5));
      float peb = smoothstep(0.74, 0.8, n2(p * 0.07)); col = mix(col, col * 1.3 + 0.02, peb * 0.5);
      float crack = smoothstep(0.03, 0.0, abs(n2(p * vec2(0.02, 0.05)) - 0.5)); col *= 1.0 - crack * 0.35;
      col *= mix(1.0, 0.42, smoothstep(10.0, 300.0, d));
      float side = min(vL.x, vS.x - vL.x); col *= mix(0.55, 1.0, smoothstep(0.0, 9.0, side));
      col *= mix(0.6, 1.0, smoothstep(0.0, 7.0, vS.y - d));
      vec3 emit = vec3(0.0); float lip = 0.0;
      if (top > 0.5) {
        float rag = (n2(vec2(p.x * 0.08, 3.0)) - 0.5) * 5.0;
        if (kind < 0.5) {
          float soil = smoothstep(20.0 + rag, 11.0 + rag, d); col = mix(col, vec3(0.30, 0.22, 0.15) * (0.8 + 0.4 * rough), soil);
          float grass = smoothstep(7.0 + rag * 0.6, 3.0 + rag * 0.6, d); col = mix(col, mix(vec3(0.27, 0.38, 0.15), vec3(0.46, 0.56, 0.22), n2(p * 0.2)), grass); lip = soil;
        } else if (kind < 1.5) {
          float m = smoothstep(18.0, 9.0, d + rag); col = mix(col, vec3(0.15, 0.11, 0.08) * (0.8 + 0.4 * n2(p * 0.3)), m);
          col += uLightCol * pow(n2(vec2(p.x * 0.05 + uTime * 0.2, d * 0.3)), 8.0) * m * 0.6; lip = m;
        } else if (kind < 2.5) {
          float ic = smoothstep(16.0, 12.0, d); vec3 icec = mix(vec3(0.62, 0.78, 0.9), vec3(0.95, 0.98, 1.0), n2(p * vec2(0.03, 0.4)));
          icec += vec3(0.4) * smoothstep(0.02, 0.0, abs(fract((p.x - p.y) * 0.03) - 0.5) - 0.47); col = mix(col, icec, ic); lip = ic;
        } else {
          float ht = smoothstep(20.0, 6.0, d); float cr = smoothstep(0.07, 0.0, abs(n2(p * 0.06) - 0.5)) + smoothstep(0.05, 0.0, abs(n2(p * 0.13 + 7.0) - 0.5)) * 0.6;
          col = mix(col, vec3(0.16, 0.07, 0.05), ht); emit = vec3(1.0, 0.32, 0.07) * (1.4 + 0.6 * sin(uTime * 2.0 + p.x * 0.05)) * cr * ht; lip = ht;
        }
      }
      vec3 lit = col * uAmb + col * uLightCol * 0.45 * lip * max(0.1, uLightDir.y) + emit;
      gl_FragColor = vec4(lit, uOpacity); }`;
  function terrainMat() { return new THREE.ShaderMaterial({ uniforms: { ...U, uOpacity: { value: 1 } }, vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG, transparent: true, depthWrite: false, depthTest: false }); }
  function rectGeo(list) { // list of { x, y, w, h, x0, x1 (the strip), kind, top }
    const pos = [], aL = [], aS = [], aK = [], idx = []; let n = 0;
    for (const r of list) { const xs = [r.x0 ?? r.x, r.x1 ?? r.x + r.w]; for (const [vx, vy] of [[xs[0], r.y], [xs[1], r.y], [xs[0], r.y + r.h], [xs[1], r.y + r.h]]) { pos.push(vx, -vy, 0); aL.push(vx - r.x, vy - r.y); aS.push(r.w, r.h); aK.push(r.kind, r.top); }
      idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); n += 4; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aL', new THREE.Float32BufferAttribute(aL, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 2)); g.setAttribute('aK', new THREE.Float32BufferAttribute(aK, 2)); g.setIndex(idx); return g;
  }
  { const strips = [];
    for (const s of SOLIDS) { let x = s.x; const runs = tops.filter(t => t.s === s).sort((a, b) => a.x0 - b.x0);
      for (const t of runs) { if (t.x0 > x) strips.push({ ...s, x0: x, x1: t.x0, kind: SURF[s.surf] || 0, top: 0 }); strips.push({ ...s, x0: t.x0, x1: t.x1, kind: SURF[s.surf] || 0, top: 1 }); x = t.x1; }
      if (x < s.x + s.w) strips.push({ ...s, x0: x, x1: s.x + s.w, kind: SURF[s.surf] || 0, top: 0 }); }
    const m = new THREE.Mesh(rectGeo(strips), terrainMat()); m.renderOrder = 20; m.frustumCulled = false; scene.add(m); }
  const FAKE_M = FAKES.map(f => { const m = new THREE.Mesh(rectGeo([{ ...f, kind: 0, top: 0 }]), terrainMat()); m.renderOrder = 72; m.frustumCulled = false; scene.add(m); return { f, m }; });
  /* planks, ladders, crumbling stones */
  const PLANK = paint(512, 64, (g) => { seed = 31; g.fillStyle = '#4a3322'; g.fillRect(0, 0, 512, 64); for (let i = 0; i < 4; i++) { g.fillStyle = `hsl(26,${srnd(30, 40)}%,${srnd(22, 30)}%)`; g.fillRect(i * 128 + 2, 4, 124, 30); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * 128, 4, 3, 30); }
    g.fillStyle = '#6b4d32'; g.fillRect(0, 2, 512, 4); g.fillStyle = '#2a1c12'; g.fillRect(0, 34, 512, 10); strokes(g, 512, 40, 160, '#1a110a', 40, 0.25, 0.02); g.fillStyle = '#2a1c12'; for (let x = 40; x < 512; x += 128) { g.save(); g.translate(x, 40); g.rotate(0.6); g.fillRect(0, 0, 8, 34); g.restore(); } }, { wrapX: true });
  for (const o of ONEWAYS) { const geo = new THREE.PlaneGeometry(o.w + 8, 28); geo.translate((o.w + 8) / 2 - 4, -14, 0); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (o.w + 8) / 160); const m = new THREE.Mesh(geo, spriteMat(PLANK, { rim: 0.8 })); m.position.set(o.x, -o.y, 0); m.renderOrder = 22; m.frustumCulled = false; scene.add(m); }
  const LADDER = paint(64, 128, (g) => { g.fillStyle = '#4a3322'; g.fillRect(4, 0, 9, 128); g.fillRect(51, 0, 9, 128); g.fillStyle = '#6b4d32'; g.fillRect(4, 0, 3, 128); g.fillRect(51, 0, 3, 128); g.fillStyle = '#3a2618'; for (const y of [20, 84]) { g.fillRect(8, y, 48, 8); } g.fillStyle = '#7a5a3a'; for (const y of [20, 84]) g.fillRect(8, y, 48, 2); }, { wrapY: true });
  for (const L of LADDERS) { const geo = new THREE.PlaneGeometry(L.w + 6, L.h); geo.translate((L.w + 6) / 2 - 3, -L.h / 2, 0); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * L.h / 88); const m = new THREE.Mesh(geo, spriteMat(LADDER, { rim: 0.8 })); m.position.set(L.x, -L.y, 0); m.renderOrder = 23; m.frustumCulled = false; scene.add(m); }
  const CRUMB = paint(128, 32, (g) => { g.fillStyle = '#4c443a'; g.beginPath(); g.roundRect(2, 2, 124, 28, 5); g.fill(); g.fillStyle = '#6a6052'; g.fillRect(4, 2, 120, 5); g.strokeStyle = '#1a1612'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(52, 2); g.lineTo(62, 14); g.lineTo(54, 30); g.moveTo(90, 2); g.lineTo(84, 16); g.stroke(); });
  const CRUMB_M = CRUMBLES.map(c => { const m = sprite(CRUMB, c.w - 2, c.h + 4, { ax: 0, ay: 1, rim: 0.9, order: 22 }); scene.add(m); return { c, m }; });

  /* ---------- grass on the open earth: blades that sway and part around you ---------- */
  { const blade = new THREE.BufferGeometry(); blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]), 3)); blade.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0.5, 1]), 2));
    const make = (dens, hMin, hMax, order, z, shade) => { const A = []; for (const t of tops) { if (t.s.surf || t.s.h < 40) continue; for (let x = t.x0 + 3; x < t.x1 - 3; x += rr(2, 4) / dens) { if (WATERS.some(w => x > w.x && x < w.x + w.w && t.y >= w.y - 4 && t.y <= w.y + w.h)) continue; A.push(x, t.y + 2, rr(hMin, hMax), Math.random()); } }
      const n = A.length / 4, g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', blade.attributes.position); g.setAttribute('uv', blade.attributes.uv); g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(A), 4)); g.instanceCount = n;
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { ...U }, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
        vertexShader: `attribute vec4 iB; uniform float uTime, uWind, uGust; uniform vec3 uPlayer; varying float vH; varying float vS;
          void main(){ vH = uv.y; vS = iB.w; float hh = iB.z * uv.y; float wdt = 3.0 + iB.w * 3.0; vec2 p = vec2(iB.x + position.x * wdt, -iB.y + hh);
            float s = sin(uTime * 2.1 + iB.x * 0.02) * 0.5 + sin(uTime * 4.7 + iB.x * 0.07 + iB.w * 6.0) * 0.25;
            float bend = (s * (0.3 + uWind) + uWind * 0.8 + uGust * 2.0) * uv.y * uv.y * iB.z * 0.35;
            float dx = iB.x - uPlayer.x; float near = step(abs(uPlayer.y + iB.y), 14.0); float push = exp(-dx * dx / 260.0) * near * sign(dx) * 9.0 * uv.y;
            p.x += bend + push; p.y -= abs(push) * 0.3;
            gl_Position = projectionMatrix * viewMatrix * vec4(p, ${z.toFixed(1)}, 1.0); }`,
        fragmentShader: `uniform vec3 uAmb, uLightCol; varying float vH; varying float vS; void main(){ vec3 root = vec3(0.16, 0.22, 0.10), tip = mix(vec3(0.42, 0.56, 0.24), vec3(0.62, 0.58, 0.28), vS * 0.6);
          vec3 c = mix(root, tip, vH) * ${shade.toFixed(2)}; c = c * uAmb * 0.95 + c * uLightCol * vH * 0.35; gl_FragColor = vec4(c, 1.0); }` }));
      m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };
    make(0.9, 7, 16, 24, -2, 0.8); make(0.45, 4, 9, 74, 2, 1.0); }

  /* ---------- water: it mirrors the world above it, and ripples where you wade ---------- */
  const RIPS = Array.from({ length: 16 }, () => new THREE.Vector4(0, -100, 0, 0)); let ripI = 0;
  function ripple(x, s = 1) { RIPS[ripI].set(x, U.uTime.value, s, 0); ripI = (ripI + 1) % RIPS.length; }
  const WATER_M = WATERS.map(w => {
    const mat = new THREE.ShaderMaterial({ uniforms: { ...U, tPrev: { value: null }, uRes: { value: new THREE.Vector2(4, 4) }, uLine: { value: 0.2 }, uRips: { value: RIPS }, uSunVis: { value: 1 }, uTop: { value: w.top ? 1 : 0 }, uH: { value: w.h } },
      transparent: true, depthWrite: false, depthTest: false,
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D tPrev; uniform vec2 uRes; uniform float uLine, uTime, uWind, uRain, uSunVis, uTop, uH; uniform vec4 uRips[16]; uniform vec3 uAmb, uHazeCol, uLightCol; varying vec2 vUv; varying vec3 vW;
        void main(){ vec2 s = gl_FragCoord.xy / uRes; float depth = (1.0 - vUv.y) * uH; float dk = smoothstep(0.0, 160.0, depth);
          float wave = sin(vW.x * 0.045 + uTime * 1.6) * 0.5 + sin(vW.x * 0.11 - uTime * 2.3) * 0.3;
          float ring = 0.0;
          for (int i = 0; i < 16; i++) { vec4 r = uRips[i]; float age = uTime - r.y; if (age < 0.0 || age > 2.2) continue; float d = length(vec2(vW.x - r.x, depth * 3.0)); float rad = age * 60.0 * r.z;
            ring += smoothstep(4.0, 0.0, abs(d - rad)) * (1.0 - age / 2.2) * r.z * (1.0 - smoothstep(0.0, 40.0, depth)); }
          vec3 deep = mix(vec3(0.05, 0.12, 0.16), uHazeCol * 0.35, 0.3) * (0.4 + 0.6 * uAmb);
          vec3 c = deep;
          if (uTop > 0.5) { vec2 ruv = vec2(s.x + (wave * 0.003 + ring * 0.004) * (0.4 + dk), 2.0 * uLine - s.y + wave * 0.004 * dk);
            vec3 refl = texture2D(tPrev, clamp(ruv, 0.001, 0.999)).rgb; float fres = mix(0.8, 0.12, dk); c = mix(deep, refl * vec3(0.82, 0.92, 1.0), fres);
            c += uLightCol * pow(max(0.0, sin(vW.x * 0.09 + uTime * 2.0 + wave * 3.0)), 30.0) * (1.0 - smoothstep(0.0, 30.0, depth)) * 0.6 * uSunVis;
            c += vec3(0.9) * ring * 0.2 * (0.4 + uAmb);
            c += vec3(0.85, 0.9, 1.0) * (1.0 - smoothstep(0.0, 2.5, depth)) * 0.35 * (0.4 + uAmb); }
          float caust = pow(n(vW.xy * 0.03 + vec2(uTime * 0.3, 0.0)), 6.0); c += uLightCol * caust * 0.15 * (1.0 - dk);
          gl_FragColor = vec4(c, mix(0.55, 0.9, dk)); }
        float hh(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }`.replace('void main(){ vec2 s', 'float hq(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); } float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hq(i), hq(i+vec2(1,0)), f.x), mix(hq(i+vec2(0,1)), hq(i+vec2(1,1)), f.x), f.y); }\n        void main(){ vec2 s') });
    const geo = new THREE.PlaneGeometry(w.w, w.h); geo.translate(w.w / 2, -w.h / 2, 0); const m = new THREE.Mesh(geo, mat); m.position.set(w.x, -w.y, 0); m.renderOrder = 70; m.frustumCulled = false; scene.add(m);
    return { w, m };
  });

  /* ---------- particles ---------- */
  const DOT = paint(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const LEAF = paint(64, 64, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, 32); g.quadraticCurveTo(30, 4, 58, 32); g.quadraticCurveTo(30, 60, 6, 32); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 32); g.lineTo(56, 32); g.stroke(); });
  const STREAK = paint(16, 128, (g) => { const r = g.createLinearGradient(0, 0, 0, 128); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.7, 'rgba(255,255,255,0.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(5, 0, 6, 128); });
  const RING = paint(128, 64, (g) => { g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.beginPath(); g.ellipse(64, 32, 58, 22, 0, 0, TAU); g.stroke(); });
  class Particles {
    constructor(max, tex, o = {}) {
      this.max = max; this.list = [];
      const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.setIndex(base.index); g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
      this.P = new Float32Array(max * 4); this.S = new Float32Array(max * 2); this.C = new Float32Array(max * 4);
      g.setAttribute('iP', new THREE.InstancedBufferAttribute(this.P, 4)); g.setAttribute('iS', new THREE.InstancedBufferAttribute(this.S, 2)); g.setAttribute('iC', new THREE.InstancedBufferAttribute(this.C, 4)); g.instanceCount = 0; this.g = g;
      this.mat = new THREE.ShaderMaterial({ uniforms: { ...U, map: { value: tex }, uLit: { value: o.lit ? 1 : 0 }, uEmit: { value: o.emit ?? 0 } }, transparent: true, depthWrite: false, depthTest: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
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
      for (const p of L) { if (n >= this.max) break; const k = n * 4, fade = Math.min(1, p.age / 0.2, (p.life - p.age) / 0.6);
        this.P[k] = p.x; this.P[k + 1] = p.y; this.P[k + 2] = p.z; this.P[k + 3] = p.r; this.S[n * 2] = p.w; this.S[n * 2 + 1] = p.h; this.C[k] = p.c[0]; this.C[k + 1] = p.c[1]; this.C[k + 2] = p.c[2]; this.C[k + 3] = p.a * clamp(fade, 0, 1); n++; }
      this.g.instanceCount = n; for (const a of ['iP', 'iS', 'iC']) this.g.attributes[a].needsUpdate = true;
    }
  }
  const FX = {
    leavesB: new Particles(160, LEAF, { lit: true, order: 15 }), leavesF: new Particles(120, LEAF, { lit: true, order: 80 }), dust: new Particles(140, DOT, { lit: true, order: 26 }),
    rain: new Particles(1400, STREAK, { add: true, order: 85 }), splash: new Particles(240, RING, { add: true, order: 71 }), flies: new Particles(120, DOT, { add: true, emit: 2.6, order: 45 }),
    embers: new Particles(220, DOT, { add: true, emit: 2.2, order: 44 }), gusts: new Particles(80, STREAK, { add: true, order: 48 }), sparks: new Particles(120, DOT, { add: true, emit: 3, order: 66 }),
    glow: new Particles(40, DOT, { add: true, emit: 1.2, order: 43 }),
  };

  /* ---------- cloth on physics ---------- */
  class Chain {
    constructor(n, seg) { this.seg = seg; this.p = Array.from({ length: n }, () => ({ x: 0, y: 0, px: 0, py: 0 })); this.fresh = true; }
    step(dt, ax, ay, wind, gravity, damp = 0.985, floor = -1e9) {
      const p = this.p; if (this.fresh || Math.hypot(p[0].x - ax, p[0].y - ay) > this.seg * 6) { this.fresh = false; p.forEach((q, i) => { q.x = q.px = ax; q.y = q.py = ay - i * this.seg; }); }   // new, or after a jump through space: the cloth starts again
      p[0].x = ax; p[0].y = ay; p[0].px = ax; p[0].py = ay;
      for (let i = 1; i < p.length; i++) { const q = p[i], vx = (q.x - q.px) * damp, vy = (q.y - q.py) * damp; q.px = q.x; q.py = q.y;
        const wv = wind * (0.6 + 0.4 * Math.sin(U.uTime.value * 3.1 + i * 0.7 + q.x * 0.01)); q.x += vx + wv * dt * dt * 60; q.y += vy + gravity * dt * dt + Math.sin(U.uTime.value * 5 + i) * Math.abs(wind) * dt * dt * 10; if (q.y < floor) q.y = floor; }
      for (let k = 0; k < 6; k++) for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - this.seg) / d; if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; } }
    }
  }
  const RIB_MATS = [];
  function ribbonMat(col) { const m = new THREE.ShaderMaterial({ uniforms: { ...U, uColor: { value: hex(col) }, uOpacity: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor, uAmb, uLightCol; uniform float uTime, uOpacity; varying vec2 vUv; void main(){ float fold = 0.82 + 0.18 * sin(vUv.x * 18.0 + uTime * 2.0); float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
      vec3 c = uColor * (uAmb * 0.9 * fold + uLightCol * 0.22 * (1.0 - vUv.y)); gl_FragColor = vec4(c, 0.96 * mix(0.6, 1.0, edge) * uOpacity); }` }); RIB_MATS.push(m); return m; }
  class Ribbon {
    constructor(chain, w0, w1, col, order) { this.c = chain; this.w0 = w0; this.w1 = w1; const n = chain.p.length; this.pos = new Float32Array(n * 2 * 3); const uv = new Float32Array(n * 2 * 2), idx = [];
      for (let i = 0; i < n; i++) { uv.set([i / (n - 1), 0, i / (n - 1), 1], i * 4); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); this.g = g;
      this.mesh = new THREE.Mesh(g, ribbonMat(col)); this.mesh.frustumCulled = false; this.mesh.renderOrder = order; scene.add(this.mesh); }
    update() { const p = this.c.p, n = p.length;
      for (let i = 0; i < n; i++) { const a = p[Math.max(0, i - 1)], b = p[Math.min(n - 1, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l, w = lerp(this.w0, this.w1, i / (n - 1)) / 2;
        this.pos.set([p[i].x + nx * w, p[i].y + ny * w, 0, p[i].x - nx * w, p[i].y - ny * w, 0], i * 6); }
      this.g.attributes.position.needsUpdate = true; }
  }

  /* ---------- the traveler: a cut-out body moved by the game's own poses ---------- */
  const RS = 0.38;                 // rig units to game units
  const B = { thigh: 36, shin: 34, torso: 50, upper: 28, fore: 27, neck: 15 };
  const SKIN = '#c89a72';
  const RIG = new THREE.Group(); scene.add(RIG);
  const RIGM = [];                 // every material of the body, for fading
  function part(w, h, fn, o = {}) { const t = paint(Math.max(16, w * 4), Math.max(16, h * 4), (g, W2, H2) => { g.scale(W2 / w, H2 / h); fn(g, w, h); }); const s = sprite(t, w, h, { ax: o.ax ?? 0.5, ay: o.ay ?? 1, rim: 0.45, ...o }); s.material.uniforms.uTexel.value.multiplyScalar(0.35); RIG.add(s); RIGM.push(s.material); return s; }
  const shadeX = (g, w, h, a = 0.28) => { const r = g.createLinearGradient(0, 0, w, 0); r.addColorStop(0, `rgba(0,0,0,${a})`); r.addColorStop(0.45, 'rgba(0,0,0,0)'); r.addColorStop(1, `rgba(0,0,0,${a * 0.8})`); g.fillStyle = r; g.fillRect(0, 0, w, h); };
  const cloth = (w0, len, order) => { const w = w0 * 1.3; return part(w, len, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(w * 0.08, 0, w * 0.84, len, w * 0.42); g.fill(); g.save(); g.clip(); shadeX(g, w, len); g.restore(); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1; g.beginPath(); g.roundRect(w * 0.08 + 0.5, 0.5, w * 0.84 - 1, len - 1, w * 0.42); g.stroke(); }, { order }); };
  const PART = {
    uaB: cloth(12, B.upper, 50), faB: cloth(10, B.fore, 50), handB: part(10, 10, (g) => { g.fillStyle = '#9a7556'; g.beginPath(); g.arc(5, 5, 4.4, 0, TAU); g.fill(); }, { ay: 0.5, order: 50.1 }),
    thB: cloth(15, B.thigh, 51), shB: cloth(12, B.shin, 51),
    footB: part(20, 9, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(2, 0); g.lineTo(10, 0); g.quadraticCurveTo(20, 2, 19, 9); g.lineTo(1, 9); g.closePath(); g.fill(); }, { ax: 0.3, ay: 1, order: 51.1 }),
    torso: part(40, B.torso + 6, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(4, h); g.lineTo(2, 18); g.quadraticCurveTo(w / 2, 0, w - 2, 18); g.lineTo(w - 4, h); g.closePath(); g.fill(); g.save(); g.clip(); shadeX(g, w, h, 0.22); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(3, h - 16, w - 6, 7); g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 6, h - 18); g.lineTo(w / 2 + 4, h - 18); g.fill(); g.restore(); }, { ay: 0, order: 53 }),
    skirt: part(40, 30, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(6, 0); g.lineTo(w - 6, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(w / 2 - 1, 2, 2, h - 2); }, { order: 54 }),
    robe: part(48, 74, (g, w, h) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(10, 0); g.lineTo(w - 10, 0); g.quadraticCurveTo(w, h * 0.6, w - 2, h); g.lineTo(2, h); g.quadraticCurveTo(0, h * 0.6, 10, 0); g.closePath(); g.fill(); g.save(); g.clip(); shadeX(g, w, h, 0.25); g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1.5; for (const x of [16, 26, 34]) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x + (x - 24) * 0.5, h); g.stroke(); } g.restore(); }, { order: 55.5 }),
    thF: cloth(15, B.thigh, 55), shF: cloth(12, B.shin, 55),
    footF: part(20, 9, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(2, 0); g.lineTo(10, 0); g.quadraticCurveTo(20, 2, 19, 9); g.lineTo(1, 9); g.closePath(); g.fill(); }, { ax: 0.3, ay: 1, order: 55.1 }),
    hat: part(64, 22, (g, w, h) => { g.fillStyle = '#b08a4c'; g.beginPath(); g.moveTo(0, h - 3); g.quadraticCurveTo(w / 2, -h * 0.9, w, h - 3); g.quadraticCurveTo(w / 2, h - 8, 0, h - 3); g.fill(); g.strokeStyle = 'rgba(60,40,10,0.5)'; g.lineWidth = 1; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(w / 2, 1); g.lineTo(i * w / 8, h - 4); g.stroke(); } }, { ay: 0, order: 58 }),
    helm: part(30, 26, (g, w, h) => { const r = g.createLinearGradient(0, 0, w, 0); r.addColorStop(0, '#5a6068'); r.addColorStop(0.45, '#c8ced6'); r.addColorStop(1, '#4a5058'); g.fillStyle = r; g.beginPath(); g.arc(w / 2, h, w / 2, Math.PI, TAU); g.fill(); g.fillStyle = '#3a3e44'; g.fillRect(0, h - 5, w, 5); g.fillRect(w / 2 - 2, 0, 4, 6); }, { ay: 0, order: 58 }),
    sword: null,
    uaF: cloth(12, B.upper, 60), faF: cloth(10, B.fore, 60), handF: part(10, 10, (g) => { g.fillStyle = SKIN; g.beginPath(); g.arc(5, 5, 4.6, 0, TAU); g.fill(); }, { ay: 0.5, order: 61 }),
  };
  const HEADS = [0, 1, 2, 3].map(hair => part(24, 28, (g, w, h) => {
    g.fillStyle = SKIN; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2.2, h / 2.1, 0, 0, TAU); g.fill();
    g.fillStyle = '#1a1410'; g.beginPath(); g.ellipse(w / 2 - 3, h / 2 - 4, w / 2.3, h / 2.6, 0, Math.PI, TAU); g.fill(); g.fillRect(2, h / 2 - 4, 6, 10);
    if (hair === 1) { g.beginPath(); for (let i = 0; i < 4; i++) { const x = 3 + i * 5; g.moveTo(x, 6); g.lineTo(x - 4, -1 + (i % 2) * 2); g.lineTo(x + 4, 4); } g.fill(); }
    if (hair === 3) { g.beginPath(); g.arc(w / 2 - 6, 3, 5, 0, TAU); g.fill(); }
    g.fillStyle = '#1a1410'; g.fillRect(w - 7, h / 2 - 2, 3, 3);
  }, { ay: 0.5, order: 57 }));
  HEADS.forEach(hd => hd.renderOrder = 57);
  PART.handB.renderOrder = 50.1; PART.handF.renderOrder = 61;
  /* weapons, drawn pointing down from the grip */
  function weapon(w, h, grip, fn, o = {}) { const m = part(w, h, fn, { ay: 1 - grip / h, order: 59, ...o }); m.visible = false; return m; }
  const steel = (g, x0, x1) => { const r = g.createLinearGradient(x0, 0, x1, 0); r.addColorStop(0, '#9aa4ae'); r.addColorStop(0.5, '#f2f6fa'); r.addColorStop(1, '#7a848e'); return r; };
  const WPN = {
    blade: weapon(10, 84, 8, (g, w, h) => { g.fillStyle = '#2a1a12'; g.fillRect(3, 0, 4, 16); g.fillStyle = '#c9963a'; g.fillRect(0, 15, 10, 3); g.fillStyle = steel(g, 2, 8); g.beginPath(); g.moveTo(2.5, 18); g.lineTo(7.5, 18); g.lineTo(7, h - 7); g.lineTo(4, h); g.lineTo(2.5, 18); g.fill(); }),
    empty: weapon(12, 92, 8, (g, w, h) => { g.fillStyle = '#e8e2d0'; g.fillRect(4, 0, 4, 16); g.fillStyle = '#ffffff'; g.fillRect(0, 15, 12, 3); const r = g.createLinearGradient(2, 0, 10, 0); r.addColorStop(0, 'rgba(200,225,255,0.6)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(180,210,255,0.6)'); g.fillStyle = r; g.beginPath(); g.moveTo(3, 18); g.lineTo(9, 18); g.lineTo(8.5, h - 8); g.lineTo(5, h); g.lineTo(3, 18); g.fill(); }, { emit: 0.55 }),
    mace: weapon(26, 92, 10, (g, w, h) => { g.fillStyle = '#4a3322'; g.fillRect(10, 0, 6, 70); g.fillStyle = '#2a1c12'; g.fillRect(9, 0, 8, 14); const r = g.createRadialGradient(11, 76, 2, 13, 78, 14); r.addColorStop(0, '#c8ced6'); r.addColorStop(1, '#3a3e44'); g.fillStyle = r; g.beginPath(); g.arc(13, 78, 12, 0, TAU); g.fill(); g.fillStyle = '#2a2e34'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.arc(13 + Math.cos(a) * 12, 78 + Math.sin(a) * 12, 2.6, 0, TAU); g.fill(); } }),
    spear: weapon(14, 196, 54, (g, w, h) => { g.fillStyle = '#5a3d26'; g.fillRect(5, 0, 4, 168); g.fillStyle = '#b8322c'; g.fillRect(4, 160, 6, 6); g.fillStyle = steel(g, 1, 13); g.beginPath(); g.moveTo(7, h); g.lineTo(1, 172); g.lineTo(7, 164); g.lineTo(13, 172); g.closePath(); g.fill(); }),
    staff: weapon(10, 184, 92, (g, w, h) => { g.fillStyle = '#6a4a2c'; g.fillRect(3, 0, 4, h); g.fillStyle = '#c9963a'; g.fillRect(2, 0, 6, 10); g.fillRect(2, h - 10, 6, 10); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(3, 0, 1.5, h); }),
    daggerF: weapon(8, 46, 6, (g, w, h) => { g.fillStyle = '#2a1a12'; g.fillRect(2.5, 0, 3, 10); g.fillStyle = '#c9963a'; g.fillRect(0, 9, 8, 2.5); g.fillStyle = steel(g, 1, 7); g.beginPath(); g.moveTo(1.5, 11); g.lineTo(6.5, 11); g.lineTo(4, h); g.closePath(); g.fill(); }),
    daggerB: weapon(8, 42, 6, (g, w, h) => { g.fillStyle = '#2a1a12'; g.fillRect(2.5, 0, 3, 10); g.fillStyle = '#c9963a'; g.fillRect(0, 9, 8, 2.5); g.fillStyle = steel(g, 1, 7); g.beginPath(); g.moveTo(1.5, 11); g.lineTo(6.5, 11); g.lineTo(4, h); g.closePath(); g.fill(); }, { order: 50.05 }),
  };
  const bowTex = (w, drawn, light) => (g, W2, H2) => { const top = 18, belly = H2 - 6, mid = W2 / 2; g.strokeStyle = light ? '#e8e2d0' : '#5a3d26'; g.lineWidth = light ? 3.2 : 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(2, top); g.quadraticCurveTo(mid, belly + 6, W2 - 2, top); g.stroke();
    g.strokeStyle = '#d8d0b8'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, top); g.lineTo(mid, drawn ? 1 : top); g.lineTo(W2 - 2, top); g.stroke();
    if (drawn) { g.strokeStyle = '#4a3322'; g.lineWidth = 2; g.beginPath(); g.moveTo(mid, 1); g.lineTo(mid, H2); g.stroke(); g.fillStyle = '#9aa4ae'; g.beginPath(); g.moveTo(mid, H2); g.lineTo(mid - 3, H2 - 7); g.lineTo(mid + 3, H2 - 7); g.fill(); } };
  WPN.bow = weapon(70, 44, 36, bowTex(70, false)); WPN.bowDrawn = weapon(70, 44, 36, bowTex(70, true));
  WPN.longbow = weapon(110, 52, 44, bowTex(110, false, true), { emit: 0.3 }); WPN.longbowDrawn = weapon(110, 52, 44, bowTex(110, true, true), { emit: 0.3 });
  const TORCH = { stick: part(6, 26, (g) => { g.fillStyle = '#3a2618'; g.fillRect(1, 0, 4, 26); g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, 6, 5); }, { ay: 0, order: 49.5 }),
    flame: new THREE.Mesh(new THREE.PlaneGeometry(22, 34), new THREE.ShaderMaterial({ uniforms: { ...U, uOpacity: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime, uWind, uOpacity; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){ vec2 p = vUv; p.x += (p.y * p.y) * (uWind * 0.35) * sin(uTime * 3.0); float s = n(vec2(p.x * 5.0, p.y * 4.0 - uTime * 4.2)) * 0.6 + n(vec2(p.x * 11.0, p.y * 9.0 - uTime * 6.0)) * 0.4;
          float shape = smoothstep(0.5, 0.0, abs(p.x - 0.5) * (1.6 + p.y * 1.8)) * smoothstep(1.0, 0.1, p.y + s * 0.35);
          vec3 c = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.85, 0.4), shape) * shape * 3.2; gl_FragColor = vec4(c * uOpacity, shape * uOpacity); }` })) };
  TORCH.flame.geometry.translate(0, 15, 0); TORCH.flame.renderOrder = 49.6; TORCH.flame.frustumCulled = false; RIG.add(TORCH.flame); RIGM.push(TORCH.flame.material);
  const SCARF = new Chain(9, 6.5 * RS * 1.3), HAIR = new Chain(6, 6 * RS * 1.3), BAND = new Chain(5, 5 * RS * 1.3), TAILF = new Chain(6, 7 * RS * 1.3), TAILB = new Chain(6, 7 * RS * 1.3);
  const RIBS = { scarf: new Ribbon(SCARF, 11 * RS, 4 * RS, '#b8322c', 52), hair: new Ribbon(HAIR, 6 * RS, 1.5 * RS, '#16110d', 56), band: new Ribbon(BAND, 3 * RS, 1.4 * RS, '#e8e2d0', 58.5), tailB: new Ribbon(TAILB, 16 * RS, 10 * RS, '#ffffff', 49), tailF: new Ribbon(TAILF, 16 * RS, 10 * RS, '#ffffff', 54.5) };
  const TRAIL = { pts: [], n: 22, on: 0 };
  { const n = TRAIL.n, pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), idx = []; for (let i = 0; i < n; i++) { uv.set([i / (n - 1), 0, i / (n - 1), 1], i * 4); if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    TRAIL.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 }, uCol: { value: new THREE.Color(1.4, 1.35, 1.2) } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uA; uniform vec3 uCol; varying vec2 vUv; void main(){ float a = vUv.x * vUv.x * smoothstep(0.0, 0.6, vUv.y) * uA; gl_FragColor = vec4(uCol * a, a); }` }));
    TRAIL.mesh.frustumCulled = false; TRAIL.mesh.renderOrder = 65; scene.add(TRAIL.mesh); }
  const SHADOW_TEX = paint(128, 64, (g) => { const r = g.createRadialGradient(64, 32, 2, 64, 32, 60); r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.save(); g.scale(1, 0.5); g.fillRect(0, 0, 128, 128); g.restore(); });
  const SHADOW = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, depthTest: false, opacity: 0.5 })); SHADOW.renderOrder = 25; SHADOW.frustumCulled = false; scene.add(SHADOW);
  const GARB_COL = { none: '#2e3548', wrap: '#4e3220', leather: '#5e3e24', mail: '#8e959e', robe: '#c0702c' };
  const FEET_COL = { none: '#3a281c', sandals: '#8a6a40', boots: '#3a2416', cleats: '#4a4e56' };
  const WPN_ANY = Object.values(WPN);

  /* the rig's pose: the ink body's own joint angles (0 points down, positive swings forward) */
  const rot = (a, l) => [Math.sin(a) * l, -Math.cos(a) * l];
  const PS = { lean: 0, aF0: 0.25, aF1: 0.45, aB0: -0.2, aB1: 0.05, lF0: 0.14, lF1: 0.02, lB0: -0.14, lB1: -0.02, bob: 0, wpn: 0.6 };
  let J = null;   // the last joints, in game units, for the ink layer's extras
  function weaponAngle(p, fa) { // where the held weapon points (rig angle), and how the front arm moves with it
    const id = curW().id, a = p.atk;
    if (p.plunge) return { w: 0.05 };
    if (id === 'bow' || id === 'longbow') { const dx = aimX() - pcx(), dy = aimY() - (p.y + 18); return { w: mouse.in ? Math.atan2(dx * p.face, dy) + Math.PI : Math.PI / 2 + Math.PI, aim: true }; }
    if (a && !a.bow) { const t = a.t, a0 = a.a0, a1 = a.a1 + 0.05;
      if (id === 'spear' || a.thrust) { const k = t < a0 ? t / a0 : t < a1 ? 1 : Math.max(0, 1 - (t - a1) / 0.15); return { w: Math.PI / 2 - 0.05, ua: lerp(1.0, 1.55, k), fa: lerp(1.2, 1.57, k), push: k }; }
      if (id === 'staff' && a.spin && t >= a0 && t <= a1) return { w: t * 24, ua: 1.6, fa: 1.8 };
      if (t < a0) { const k = smooth(0, 1, t / Math.max(0.01, a0)); return { w: lerp(fa + 0.3, a.heavy ? 3.6 : 3.3, k), ua: lerp(PS.aF0, 2.9, k), fa: lerp(PS.aF1, 3.2, k) }; }
      if (t <= a1) { const k = smooth(0, 1, (t - a0) / Math.max(0.01, a1 - a0)); return { w: lerp(a.heavy ? 3.6 : 3.3, 0.4, k), ua: lerp(2.9, 0.7, k), fa: lerp(3.2, 0.5, k), act: true }; }
      const k = clamp((t - a1) / 0.12, 0, 1); return { w: lerp(0.4, fa + 0.3, k), ua: lerp(0.7, PS.aF0, k), fa: lerp(0.5, PS.aF1, k) }; }
    if (p.charging) return { w: id === 'spear' ? Math.PI / 2 : 3.7, ua: 2.8, fa: 3.3 };
    if (id === 'spear') return { w: Math.PI - 0.25 };
    if (id === 'staff') return { w: 2.5 };
    if (p.crouch) return { w: fa + 0.7 };
    return { w: fa + 0.32 };
  }
  function poseRig(dt) {
    const p = P, { pose, ay } = playerPose(p), robe = p.garb.body === 'robe' && p.rollT <= 0 && p.onG && !p.crouch && !p.inWater;
    const k = 1 - Math.exp(-dt * (p.atk || p.rollT > 0 ? 34 : 18));
    const tg = { lean: pose.lean, aF0: pose.aF[0], aF1: pose.aF[1], aB0: pose.aB[0], aB1: pose.aB[1], lF0: pose.lF[0], lF1: pose.lF[1], lB0: pose.lB[0], lB1: pose.lB[1] };
    for (const key in tg) PS[key] = dt > 0 ? lerp(PS[key], tg[key], k) : tg[key];
    const wa = weaponAngle(p, PS.aF1);
    const ua = wa.ua ?? PS.aF0, fa = wa.fa ?? PS.aF1;
    PS.wpn = wa.act || wa.aim || dt <= 0 ? wa.w : lerp(PS.wpn, wa.w, 1 - Math.exp(-dt * 22));
    const legH = (a, b) => Math.cos(a) * B.thigh + Math.cos(b) * B.shin;
    const hipH = robe ? 66 : Math.max(legH(PS.lF0, PS.lF1), legH(PS.lB0, PS.lB1), 12);
    const hip = [0, hipH], lean = PS.lean;
    const neck = [Math.sin(lean) * B.torso, hip[1] + Math.cos(lean) * B.torso], sh = [Math.sin(lean) * B.torso * 0.86, hip[1] + Math.cos(lean) * B.torso * 0.86];
    const set = (m, xy, a) => { m.position.set(xy[0], xy[1], 0); m.rotation.z = a; };
    set(PART.torso, hip, -lean); set(PART.skirt, [hip[0], hip[1] + 4], -lean * 0.3); set(PART.robe, [hip[0], hip[1] + 6], -lean * 0.2);
    const leg = (th, sn, tn, snn, fn) => { const k1 = rot(th, B.thigh), knee = [hip[0] + k1[0], hip[1] + k1[1]], k2 = rot(sn, B.shin), foot = [knee[0] + k2[0], knee[1] + k2[1]]; set(PART[tn], hip, th); set(PART[snn], knee, sn); set(PART[fn], [foot[0], foot[1] + 4], p.onG && !p.inWater ? 0 : sn * 0.5 - 0.3); return foot; };
    const fF = leg(PS.lF0, PS.lF1, 'thF', 'shF', 'footF'), fB = leg(PS.lB0, PS.lB1, 'thB', 'shB', 'footB');
    const arm = (u, f, un, fn, hn, push = 0) => { const s0 = [sh[0] + push * 8, sh[1]], e1 = rot(u, B.upper), elbow = [s0[0] + e1[0], s0[1] + e1[1]], e2 = rot(f, B.fore - 3), hand = [elbow[0] + e2[0], elbow[1] + e2[1]]; set(PART[un], s0, u); set(PART[fn], elbow, f); set(PART[hn], hand, 0); return hand; };
    const hB = arm(PS.aB0, PS.aB1, 'uaB', 'faB', 'handB'), hF = arm(ua, fa, 'uaF', 'faF', 'handF', wa.push || 0);
    const head = [neck[0] + Math.sin(lean) * B.neck, neck[1] + Math.cos(lean) * B.neck];
    const hd = HEADS[p.looks.hair] || HEADS[0]; HEADS.forEach(x => x.visible = x === hd); set(hd, head, -lean * 0.6);
    set(PART.hat, [head[0], head[1] + 6], -lean * 0.6); set(PART.helm, [head[0] - 1, head[1] - 2], -lean * 0.6);
    // weapons
    const id = curW().id, show = !p.dead && !p.ladder && !p.hang && p.climbT <= 0 && !(p.inWater && !p.onG) && !p.glide;
    for (const m of WPN_ANY) m.visible = false;
    let main = null;
    if (show) {
      if (id === 'daggers') { main = WPN.daggerF; if (!p.torch.lit) { WPN.daggerB.visible = true; set(WPN.daggerB, hB, PS.aB1 + 0.5); } }
      else if (id === 'bow' || id === 'longbow') main = p.charging ? WPN[id + 'Drawn'] : WPN[id];
      else main = WPN[id] || WPN.blade;
      main.visible = true; set(main, hF, PS.wpn);
    }
    TORCH.stick.visible = TORCH.flame.visible = p.torch.lit && !p.dead; if (p.torch.lit) { set(TORCH.stick, [hB[0], hB[1] - 6], -0.25); TORCH.flame.position.set(hB[0] - 6, hB[1] + 18, 0); }
    // the whole body: placed at the feet, mirrored by facing, tipped over when dead
    const fx0 = pcx() - (p.mount ? p.face * 6 : 0), fy0 = ay;
    RIG.position.set(fx0, -fy0, 0); RIG.scale.set(p.face * RS, RS, 1); RIG.rotation.z = p.dead ? p.face * Math.min(1, p.deadT * 2) * Math.PI / 2 : 0;
    const c = Math.cos(RIG.rotation.z), s = Math.sin(RIG.rotation.z);
    const G = (xy) => { const lx = xy[0] * p.face * RS, ly = xy[1] * RS; return { x: fx0 + lx * c - ly * s, y: fy0 - (lx * s + ly * c) }; };
    const tip = rot(PS.wpn, main === WPN.spear ? 140 : main === WPN.staff ? 90 : main === WPN.mace ? 80 : 74);
    J = { hF: G(hF), hB: G(hB), head: G(head), neck: G(neck), hip: G(hip), sh: G(sh), fF: G(fF), fB: G(fB), hr: 6.5, tip: G([hF[0] + tip[0], hF[1] + tip[1]]), robe, act: !!wa.act, id };
    return J;
  }
  function dressRig(p) {
    const G = p.garb, body = GARB_COL[G.body] || GARB_COL.none, dark = hex(body).multiplyScalar(0.78), feet = FEET_COL[G.feet] || FEET_COL.none, wide = clamp(p.looks.build / 4.2, 0.85, 1.2);
    for (const k of ['torso', 'skirt', 'robe', 'uaF', 'faF', 'thF', 'shF']) PART[k].material.uniforms.uTint.value.set(body);
    for (const k of ['uaB', 'faB', 'thB', 'shB']) PART[k].material.uniforms.uTint.value.copy(dark);
    if (G.body === 'mail') for (const k of ['thF', 'shF', 'thB', 'shB']) PART[k].material.uniforms.uTint.value.set('#4a4038');
    for (const k of ['footF', 'footB']) PART[k].material.uniforms.uTint.value.set(feet);
    PART.torso.scale.x = wide; PART.skirt.scale.x = wide;
    const robe = J && J.robe; PART.robe.visible = robe; PART.skirt.visible = !robe;
    for (const k of ['thF', 'shF', 'thB', 'shB', 'footF', 'footB']) PART[k].visible = !robe || p.inWater;
    PART.hat.visible = G.head === 'hat'; PART.helm.visible = G.head === 'helm';
    RIBS.tailF.mesh.material.uniforms.uColor.value.set(body); RIBS.tailB.mesh.material.uniforms.uColor.value.copy(dark);
    RIBS.tailF.mesh.visible = RIBS.tailB.mesh.visible = G.body === 'robe' || p.looks.robe;
    RIBS.hair.mesh.visible = p.looks.hair === 2 && G.head !== 'helm' && G.head !== 'hat';
    RIBS.band.mesh.visible = G.head === 'band';
  }
  function bodyAlpha(p) { let a = 1; if (p.inkT > 0) a = 0.3; else if (p.inv > 0 && !p.dead && Math.floor(p.inv * 16) % 2 === 0) a = 0; else if (p.unseenT > 0) a = 0.28; if (p.dead) a *= Math.max(0.2, 1 - p.deadT * 0.5); if (p.mount) a = 0; return a; }
  function groundUnder(x, y) { let g = null; for (const s of SOLIDS) if (x >= s.x && x <= s.x + s.w && s.y >= y - 2 && (g === null || s.y < g)) g = s.y; for (const o of ONEWAYS) if (x >= o.x && x <= o.x + o.w && o.y >= y - 2 && (g === null || o.y < g)) g = o.y; return g; }

  /* ---------- the sky's light, from the game's own sky ---------- */
  const PAL = [[-18, '#070a1c', '#141a3a', '#3a4478', '#7d8fd8'], [-8, '#0c1430', '#2b2f5e', '#48508a', '#8a9ae0'], [-3, '#262c5a', '#c8705a', '#7a6a92', '#f0905a'],
    [3, '#4a6fae', '#f2a46a', '#c49a8a', '#ffb070'], [10, '#4f86c6', '#dcc6a0', '#e8dccb', '#ffe2b8'], [30, '#3f80cf', '#b8dcf0', '#ffffff', '#fff6e8'], [90, '#3f80cf', '#b8dcf0', '#ffffff', '#fffaf0']];
  function palAt(alt) { let i = 0; while (i < PAL.length - 2 && alt > PAL[i + 1][0]) i++; const a = PAL[i], b = PAL[i + 1], t = clamp((alt - a[0]) / (b[0] - a[0]), 0, 1); return [1, 2, 3, 4].map(k => hex(a[k]).lerp(hex(b[k]), t)); }
  const skyX = az => { let x = clamp(((az + 360) % 360 - 180) / 95, -1.15, 1.15); if (SKY.lat < 0) x = -x; return 0.5 + x * 0.45; }, skyY = alt => 0.24 + (alt / 70) * 0.7;
  function applySky() {
    const k = skyState(), sAlt = sunAlt(), mAlt = nightOverride !== null ? (nightOverride ? 40 : -10) : k.moon.alt, night = smooth(2, -10, sAlt);
    const sunAz = nightOverride !== null ? 160 : k.sun.az, moonAz = nightOverride !== null ? 200 : k.moon.az;
    const [top, bot, amb, lc] = palAt(sAlt); const rain = U.uRain.value; amb.multiplyScalar(1 - rain * 0.35);
    const dk = DARKS.find(d => pcx() > d.x && pcx() < d.x + d.w); const cave = dk ? clamp(Math.min(pcx() - dk.x, dk.x + dk.w - pcx()) / 180, 0, 1) : 0;
    amb.multiplyScalar(1 - cave * 0.55);
    SKYU.uTop.value.copy(top).lerp(hex('#3a3e48'), rain * 0.6); SKYU.uBot.value.copy(bot).lerp(hex('#5a5e66'), rain * 0.6);
    SKYU.uSun.value.set(skyX(sunAz), skyY(sAlt)); SKYU.uMoon.value.set(skyX(moonAz), skyY(mAlt));
    SKYU.uSunVis.value = smooth(-4, 2, sAlt); SKYU.uMoonVis.value = smooth(-4, 2, mAlt) * (0.35 + 0.65 * night); SKYU.uPhase.value = k.illum; SKYU.uWaxing.value = k.waxing ? 1 : 0;
    SKYU.uStars.value = night; SKYU.uSunCol.value.copy(lc);
    U.uAmb.value.copy(amb); U.uHazeCol.value.copy(bot).lerp(top, 0.25); U.uNight.value = night;
    const useSun = sAlt > -4, srcAz = useSun ? sunAz : moonAz, srcAlt = useSun ? sAlt : mAlt, sx = skyX(srcAz) - 0.5, sy = skyY(srcAlt) - 0.32;
    const L = Math.hypot(sx, sy) || 1; U.uLightDir.value.set(sx / L, sy / L);
    const strength = (useSun ? smooth(-4, 12, sAlt) : smooth(-4, 10, mAlt) * (0.25 + 0.75 * k.illum) * 0.7) * (1 - cave * 0.8);
    U.uLightCol.value.copy(useSun ? lc : hex('#9fb4ff')).multiplyScalar(strength * (1 - rain * 0.7));
    POST.rays.uniforms.uStrength.value = Q.rays ? (useSun ? 0.5 * smooth(-2, 6, sAlt) * (1 - smooth(25, 55, sAlt) * 0.6) : 0.22 * k.illum * smooth(0, 10, mAlt)) * (1 - rain) * (1 - cave) : 0;
    POST.rays.uniforms.uSun.value.set(skyX(srcAz), skyY(srcAlt));
    POST.final.uniforms.uNight.value = night;
    return { strength, srcAlt, night };
  }

  /* ---------- every frame ---------- */
  const ST = { last: null, gust: 0, nextGust: 6, rain: 0, flash: 0, nextFlash: 9, wasG: true, wasWater: false, lastVy: 0, step: 0, color: colorK };
  function step(dt) {
    const t = clock, p = P;
    ST.nextGust -= dt; if (ST.nextGust <= 0) { ST.gust = 1; ST.nextGust = rr(9, 18); for (let i = 0; i < 12; i++) FX.gusts.add({ x: camX - 200 + rr(0, W * 0.5), y: -(camY + rr(20, H - 20)), z: rr(-30, 30), vx: rr(900, 1400), vy: rr(-15, 15), r: Math.PI / 2, w: 2, h: rr(90, 180), life: rr(0.6, 1.1), c: [0.85, 0.88, 0.92], a: 0.3 }); }
    ST.gust = Math.max(0, ST.gust - dt * 0.55); U.uGust.value = Math.sin(Math.min(1, ST.gust) * Math.PI) * 0.9;
    const wz = windAt(pcx(), p.y + p.h / 2), wind = U.uWind.value + U.uGust.value * 1.4 + Math.sin(t * 0.4) * 0.08;
    // rain (a test tool for now; weather joins play in a later build)
    ST.rain = lerp(ST.rain, V3.rain ? 1 : 0, 1 - Math.exp(-dt * 0.8)); U.uRain.value = ST.rain;
    if (ST.rain > 0.05) { const n = Math.floor(ST.rain * 500 * dt * Q.parts * 3); for (let i = 0; i < n; i++) FX.rain.add({ x: camX + rr(-100, W + 100), y: -(camY - 40), z: rr(-160, 160), vx: -wind * 140, vy: -900, r: Math.atan2(wind * 140, 900), w: 1.2, h: rr(22, 38), life: 1.4, c: [0.7, 0.75, 0.85], a: 0.45 }); }
    if (ST.rain > 0.7) { ST.nextFlash -= dt; if (ST.nextFlash <= 0) { ST.flash = 1; ST.nextFlash = rr(9, 20); } }
    ST.flash = Math.max(0, ST.flash - dt * 3); POST.final.uniforms.uFlash.value = ST.flash > 0.6 ? 0.55 : ST.flash * 0.3;
    // leaves, and fireflies at night, around where you are
    if (Math.random() < dt * (1.6 + wind * 5) * Q.parts) { const front = Math.random() < 0.4, gold = Math.random() < 0.4; (front ? FX.leavesF : FX.leavesB).add({ x: camX + rr(-100, W + 200), y: -(camY - 20), z: front ? rr(4, 40) : rr(-60, -6), vy: -40, r: rr(0, TAU), vr: rr(-3, 3), w: 6, h: 4, life: 14, c: gold ? [0.95, 0.75, 0.3] : [0.5, 0.7, 0.3], seed: Math.random() * 10 }); }
    const flutter = (q, dt) => { q.vx = lerp(q.vx, wind * 120 + Math.sin(q.age * 2.2 + q.seed) * 30, dt * 1.5); q.vy = lerp(q.vy, -34 + Math.sin(q.age * 3.1 + q.seed) * 18, dt * 2); q.vr += Math.sin(q.age * 2 + q.seed) * dt * 4;
      if (!q.rest) { q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; if (pointSolid(q.x, -q.y)) { q.rest = true; q.life = q.age + 4; const w = WATERS.find(w => q.x > w.x && q.x < w.x + w.w && Math.abs(-q.y - w.y) < 10); if (w) ripple(q.x, 0.25); } } };
    FX.leavesB.update(dt, flutter); FX.leavesF.update(dt, flutter);
    const night = U.uNight.value; if (night > 0.3 && FX.flies.list.length < 50 * night * Q.parts) { const x = camX + rr(-50, W + 50), gy = floorAt(x); if (gy !== null && !inDark(x)) FX.flies.add({ x, y: -(gy - rr(10, 140)), z: rr(-40, 20), w: 4.5, h: 4.5, life: rr(6, 12), c: [0.9, 1, 0.5], seed: Math.random() * 20 }); }
    FX.flies.update(dt, (q, dt) => { q.x += (Math.sin(q.age * 0.9 + q.seed) * 20 + wind * 15) * dt; q.y += Math.cos(q.age * 1.3 + q.seed * 2) * 12 * dt; q.a = (0.5 + 0.5 * Math.sin(q.age * 3 + q.seed)) * night; });
    // wind zones: streaks rising up the draught
    for (const w of WINDS) if (visible(w, 100) && Math.random() < dt * 30 * Q.parts) FX.gusts.add({ x: w.x + rr(10, w.w - 10), y: -(w.y + w.h - rr(0, 60)), z: rr(-20, 20), vx: rr(-10, 10), vy: rr(380, 620), r: 0, w: 1.6, h: rr(30, 70), life: w.h / 520, c: [0.9, 0.92, 0.95], a: 0.28 });
    FX.gusts.update(dt);
    // embers and warm light at the shrines, heat off hot stone
    SHRINES.forEach((s, i) => { if (!visible({ x: s.x - 60, y: s.gy - 200, w: 120, h: 200 })) return; if (Math.random() < dt * 9 * Q.parts) FX.embers.add({ x: s.x + rr(-6, 6), y: -(s.gy - 30), z: 1, vx: rr(-10, 10), vy: rr(30, 70), w: rr(1.5, 3), h: rr(1.5, 3), life: rr(1.2, 2.4), c: [1, rr(0.4, 0.7), 0.15], seed: Math.random() * 9 }); });
    for (const s of SOLIDS) if (s.surf === 'hot' && visible(s) && Math.random() < dt * s.w / 40 * Q.parts) FX.embers.add({ x: s.x + rr(0, s.w), y: -(s.y + 2), z: 1, vx: rr(-6, 6), vy: rr(20, 60), w: rr(1.5, 3), h: rr(1.5, 3), life: rr(0.8, 1.8), c: [1, rr(0.3, 0.6), 0.1], seed: Math.random() * 9 });
    FX.embers.update(dt, (q, dt) => { q.x += (q.vx + wind * 40 + Math.sin(q.age * 4 + q.seed) * 12) * dt; q.y += q.vy * dt; q.a = 0.6 + 0.4 * Math.sin(q.age * 20 + q.seed); });
    FX.glow.list.length = 0; SHRINES.forEach((s, i) => { if (visible({ x: s.x - 100, y: s.gy - 200, w: 200, h: 200 })) FX.glow.add({ x: s.x, y: -(s.gy - 34), z: 0, w: 90, h: 90, life: 1e9, age: 1, c: [1, 0.62, 0.25], a: (P.shrine === i ? 0.55 : 0.32) * (0.85 + 0.15 * N1(t * 6 + i)) }); });
    if (p.torch.lit && !p.dead && J) FX.glow.add({ x: J.hB.x, y: -(J.hB.y - 14), z: 0, w: 110, h: 110, life: 1e9, age: 1, c: [1, 0.6, 0.25], a: 0.4 * (0.85 + 0.15 * N1(t * 9)) });
    FX.glow.update(0);
    // the body: dust when you land or run, splashes and ripples in water
    const feet = p.y + p.h;
    if (p.onG && !ST.wasG && ST.lastVy > 420) { for (let i = 0; i < 8; i++) FX.dust.add({ x: pcx() + rr(-10, 10), y: -(feet - rr(0, 3)), z: 2, vx: rr(-70, 70), vy: rr(4, 30), w: rr(8, 15), h: rr(8, 15), life: rr(0.4, 0.8), c: [0.62, 0.55, 0.46], a: 0.5, grow: rr(14, 26) }); }
    if (p.onG && Math.abs(p.vx) > 200 && !p.inWater) { ST.step -= dt * Math.abs(p.vx) / 100; if (ST.step <= 0) { ST.step = 0.9; FX.dust.add({ x: pcx() - p.face * 6, y: -(feet - 1), z: 2, vx: -p.face * rr(10, 50), vy: rr(4, 20), w: rr(6, 10), h: rr(6, 10), life: rr(0.3, 0.6), c: [0.62, 0.55, 0.46], a: 0.35, grow: rr(10, 20) }); } }
    if (p.rollT > 0 && p.onG && Math.random() < dt * 20) FX.dust.add({ x: pcx(), y: -(feet - 1), z: 2, vx: -p.face * rr(20, 60), vy: rr(4, 20), w: rr(6, 12), h: rr(6, 12), life: rr(0.3, 0.6), c: [0.62, 0.55, 0.46], a: 0.4, grow: rr(10, 20) });
    if (p.inWater !== ST.wasWater) { const w = WATERS.find(w => pcx() > w.x && pcx() < w.x + w.w); if (w && w.top) { ripple(pcx(), 1.4); for (let i = 0; i < 10; i++) FX.sparks.add({ x: pcx() + rr(-8, 8), y: -w.y, z: 3, vx: rr(-80, 80), vy: rr(80, 220), w: 2.5, h: 4, life: rr(0.3, 0.6), c: [0.75, 0.85, 0.95], g: true }); } }
    if (p.inWater && Math.abs(p.vx) > 40 && Math.random() < dt * 4) { const w = WATERS.find(w => pcx() > w.x && pcx() < w.x + w.w); if (w && w.top && Math.abs(p.y - w.y) < 40) ripple(pcx(), 0.7); }
    ST.wasG = p.onG; ST.wasWater = p.inWater; ST.lastVy = p.vy;
    FX.dust.update(dt, (q, dt) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.95; q.w += q.grow * dt; q.h += q.grow * dt; });
    FX.rain.update(dt, (q, dt) => { q.x += q.vx * dt; q.y += q.vy * dt; if (pointSolid(q.x, -q.y)) { q.dead = true; if (Math.random() < 0.25) FX.splash.add({ x: q.x, y: q.y + 1, z: q.z, w: 3, h: 1.5, life: 0.35, c: [0.8, 0.85, 0.95], a: 0.5, grow: 16 }); } else { const w = WATERS.find(w => w.top && q.x > w.x && q.x < w.x + w.w && Math.abs(-q.y - w.y) < 6); if (w) { q.dead = true; if (Math.random() < 0.3) ripple(q.x, 0.3); } } });
    FX.splash.update(dt, (q, dt) => { q.w += q.grow * dt; q.h += q.grow * 0.4 * dt; });
    FX.sparks.update(dt, (q, dt) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= (q.g ? 900 : 200) * dt; });
    // hits throw sparks: read the ink world's own sparks
    for (const f of fx) if (f.k === 'spark' && !f._v3) { f._v3 = true; FX.sparks.add({ x: f.x, y: -f.y, z: 4, vx: (f.vx || 0) * 0.8, vy: -(f.vy || 0) * 0.8, w: 3, h: 3, life: 0.35, c: [1, 0.85, 0.5] }); }
    // cloth
    const pv = p.vx, dts = Math.min(dt, 1 / 30), j = J;
    if (j && dts > 0) {
      const flo = -(feet) + 1, wd = wz ? 2.5 : 0;
      SCARF.step(dts, j.neck.x - p.face * 1.2, -(j.neck.y + 1.5), -pv * 0.03 + wind * 1.3, -480 * (wz ? -0.6 : 1), 0.965, flo);
      HAIR.step(dts, j.head.x - p.face * 3, -(j.head.y + 1), -pv * 0.03 + wind * 1.5, -380, 0.97);
      BAND.step(dts, j.head.x - p.face * 3.5, -(j.head.y - 1.2), -pv * 0.035 + wind * 1.6, -260, 0.96);
      TAILF.step(dts, j.hip.x + p.face * 2, -(j.hip.y), -pv * 0.02 + wind * 1.2, -560 + wd * 200, 0.95, flo);
      TAILB.step(dts, j.hip.x - p.face * 3, -(j.hip.y), -pv * 0.025 + wind * 1.4, -560 + wd * 200, 0.95, flo);
      for (const r of Object.values(RIBS)) r.update();
      // the weapon's trail
      if (j.act) { TRAIL.pts.unshift([j.tip.x, -j.tip.y, j.hF.x, -j.hF.y]); if (TRAIL.pts.length > TRAIL.n) TRAIL.pts.pop(); TRAIL.on = 0.25; } else { TRAIL.on = Math.max(0, TRAIL.on - dt); if (TRAIL.on <= 0) TRAIL.pts.length = 0; }
      TRAIL.mesh.material.uniforms.uA.value = j.act ? 1 : TRAIL.on * 3; TRAIL.mesh.material.uniforms.uCol.value.set(j.id === 'empty' ? 1.0 : 1.4, j.id === 'empty' ? 1.3 : 1.35, j.id === 'empty' ? 1.6 : 1.2);
      { const pos = TRAIL.mesh.geometry.attributes.position, n = TRAIL.n; for (let i = 0; i < n; i++) { const q = TRAIL.pts[Math.min(i, TRAIL.pts.length - 1)] || [j.tip.x, -j.tip.y, j.hF.x, -j.hF.y]; pos.setXYZ(n * 2 - 2 - i * 2, q[0], q[1], 0); pos.setXYZ(n * 2 - 1 - i * 2, lerp(q[2], q[0], 0.35), lerp(q[3], q[1], 0.35), 0); } pos.needsUpdate = true; }
    }
    // crumbling stones and false walls
    for (const { c, m } of CRUMB_M) { m.visible = c.state !== 'gone'; const sh = c.state === 'shake'; m.position.set(c.x + 1 + (sh ? rr(-1.5, 1.5) : 0), -(c.y + (sh ? rr(0, 1.5) : 0)), 0); }
    for (const { f, m } of FAKE_M) { const see = f.found || has('bead') || pathAt('jnana') >= 1; m.material.uniforms.uOpacity.value = overlap(P, f) ? 0.25 : see ? 0.55 : 1; }
  }
  function render3(sx, sy, dt) {
    resize(); if (!SCREEN.w) return;
    U.uTime.value = clock; U.uPlayer.value.set(pcx(), -(P.y + P.h), 0);
    const sk = applySky();
    ST.color = lerp(ST.color, colorK, 1 - Math.exp(-Math.max(dt, 0.016) * 4)); POST.final.uniforms.uColor.value = colorK >= 1 ? 1 : ST.color;
    POST.final.uniforms.uHurt.value = P.hitT > 0 ? 0.6 : Math.max(0, POST.final.uniforms.uHurt.value - dt * 2);
    const j = poseRig(dt); dressRig(P);
    const alpha = bodyAlpha(P); RIG.visible = alpha > 0.01; for (const m of RIGM) m.uniforms.uOpacity.value = alpha; for (const m of RIB_MATS) m.uniforms.uOpacity.value = alpha;
    for (const m of RIGM) if (m.uniforms.uFlip) m.uniforms.uFlip.value = P.face;
    for (const r of Object.values(RIBS)) if (P.mount || V3._hide) r.mesh.visible = false;
    TRAIL.mesh.visible = !P.mount;
    step(dt);
    // the shadow falls away from the light, longer when it is low
    const g = groundUnder(pcx(), P.y + P.h);
    if (g !== null && !P.mount) { const lift = g - (P.y + P.h), lowness = 1 - clamp(sk.srcAlt / 60, 0, 1); SHADOW.visible = true; SHADOW.position.set(pcx() - U.uLightDir.value.x * (3 + lowness * 20), -g + 1, 0); SHADOW.scale.set(1 + lowness * 1.8, 1, 1); SHADOW.material.opacity = sk.strength * 0.6 * clamp(1 - lift / 160, 0, 1) * alpha; } else SHADOW.visible = false;
    // the camera: the game's own, with its shake
    camera.position.set(camX + W / 2 + sx, -(camY + H / 2 + sy), D); camera.lookAt(camX + W / 2 + sx, -(camY + H / 2 + sy), 0);
    skyMat.uniforms.uRes.value.set(SCREEN.w, SCREEN.h); skyMat.uniforms.uCam.value = camX;
    for (const { w, m } of WATER_M) { const v = new THREE.Vector3(w.x, -w.y, 0).project(camera); m.material.uniforms.uLine.value = v.y * 0.5 + 0.5; m.material.uniforms.uRes.value.set(SCREEN.w, SCREEN.h); m.material.uniforms.uSunVis.value = SKYU.uSunVis.value + SKYU.uMoonVis.value * 0.5; m.material.uniforms.tPrev.value = rtB.texture; }
    renderer.setRenderTarget(rtA); renderer.clear(); fsQuad.material = skyMat; renderer.render(fsScene, fsCam); renderer.render(scene, camera);
    POST.bright.uniforms.tScene.value = rtA.texture; pass(POST.bright, rtBright);
    POST.blur.uniforms.tIn.value = rtBright.texture; POST.blur.uniforms.uDir.value.set(1 / rtBlur1.width, 0); pass(POST.blur, rtBlur1);
    for (let i = 0; i < 3; i++) { POST.blur.uniforms.tIn.value = rtBlur1.texture; POST.blur.uniforms.uDir.value.set(0, (1 + i) / rtBlur1.height); pass(POST.blur, rtBlur2); POST.blur.uniforms.tIn.value = rtBlur2.texture; POST.blur.uniforms.uDir.value.set((1 + i) / rtBlur1.width, 0); pass(POST.blur, rtBlur1); }
    POST.rays.uniforms.tIn.value = rtBright.texture; pass(POST.rays, rtRays);
    const F = POST.final.uniforms; F.tScene.value = rtA.texture; F.tBloom.value = rtBlur1.texture; F.tRays.value = rtRays.texture; F.uTime.value = clock; F.uRes.value.set(SCREEN.w, SCREEN.h);
    pass(POST.final, null);
    [rtA, rtB] = [rtB, rtA];
  }
  let lastClock = null, frames = 0;
  V3.frame = (sx = 0, sy = 0) => {
    if (!P) return; if (!J) poseRig(0);
    const dt = lastClock === null ? 1 / 60 : clamp(clock - lastClock, 0, 0.05); lastClock = clock;
    try { render3(sx, sy, dt); frames++; V3.stats = { frames, leaves: FX.leavesB.list.length + FX.leavesF.list.length, embers: FX.embers.list.length, flies: FX.flies.list.length, dust: FX.dust.list.length, rain: FX.rain.list.length, w: SCREEN.w, h: SCREEN.h }; }
    catch (e) { V3.failed = true; V3.why = e.message; console.error(e); lookShow(); }
  };
  V3.hideRibs = v => { V3._hide = v; }; V3.joints = () => J; V3.cloth = () => ({ scarf: SCARF.p.map(q => [q.x, q.y]), tailF: TAILF.p.map(q => [q.x, q.y]), pos: Array.from(RIBS.scarf.pos.slice(0, 12)), mins: Object.fromEntries(Object.entries(RIBS).map(([k, r]) => [k, Math.min(...Array.from(r.pos).filter((v, i) => i % 3 === 0))])), trail: Math.min(...Array.from(TRAIL.mesh.geometry.attributes.position.array).filter((v, i) => i % 3 === 0)) });
  V3.pose = () => ({ ...PS });
  V3.renderer = renderer; V3.ripple = ripple; V3.setDpr = d => { Q.dpr = d; SCREEN.w = 0; };
}
