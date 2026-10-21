/* ===== Samsara · the painted look (three.js), from build 24 =====
   The world drawn with three.js instead of ink: the real sky, painted far and near layers at real depths, rock,
   planks, ladders and water made from the level's own shapes, grass that sways and parts, leaves, fireflies, embers,
   and the traveler as a cut-out body moved by the game's own poses, with cloth and hair on physics.
   Then glow, light rays, the ink-to-color filter (the first realization), the night grade and paper grain.
   The rules never change: this file only reads the game. Props, foes and words still come from the ink drawing,
   on the clear canvas above; they move to this file in the next builds. If WebGL is missing, the ink drawing stays. */
const V3 = { ready: false, failed: false, booting: false, why: '', rain: false, stats: {} };
V3.want = () => SETTINGS.look === 'painted';
V3.on = () => V3.ready && !V3.failed && V3.want() && !!P && mode !== 'map';   // from build 29 the painted look also shows meditation, in the world
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

/*GLB*/
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
    uL: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 1, 0)) }, uLC: { value: Array.from({ length: 8 }, () => new THREE.Color(1, 0.7, 0.4)) },
  };
  /* warm lights (fires, the torch, lanterns, hot stone) that light what is near them, most at night */
  const LIGHTS = `uniform vec4 uL[8]; uniform vec3 uLC[8];
    vec3 lightAt(vec3 w){ vec3 s = vec3(0.0); for (int i = 0; i < 8; i++) { vec4 L = uL[i]; if (L.w <= 0.0) continue; float d = length(w.xy - L.xy); float f = clamp(1.0 - d / L.z, 0.0, 1.0); s += uLC[i] * L.w * f * f; }
      return s * (1.0 - smoothstep(30.0, 140.0, abs(w.z))); }`;

  /* the painted-sprite material (see the look test): lit on the side the light comes from, hazed with distance */
  const SPRITE_VERT = `
uniform float uTime, uWind, uGust, uSway, uSwayPhase; varying vec2 vUv; varying vec3 vW3;
void main(){
  vUv = uv; vec3 p = position;
  if (uSway > 0.0) { float hh = pow(max(uv.y, 0.0), 1.6); vec4 w0 = modelMatrix * vec4(p, 1.0);
    float s = sin(uTime * 1.3 + w0.x * 0.004 + uSwayPhase) * 0.6 + sin(uTime * 2.9 + w0.x * 0.011 + uSwayPhase * 2.0) * 0.25;
    p.x += (s * (0.35 + uWind) + uWind * 0.9 + uGust * 2.2) * uSway * hh * 22.0; p.y -= abs(s) * uSway * hh * 3.0; }
  vec4 wp = modelMatrix * vec4(p, 1.0); vW3 = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const SPRITE_FRAG = `
uniform sampler2D map; uniform vec2 uTexel, uLightDir; uniform vec3 uLightCol, uAmb, uHazeCol, uTint; uniform float uRim, uHaze, uEmit, uOpacity, uNightEmit, uNight, uRain, uFlip;
varying vec2 vUv; varying vec3 vW3;
${LIGHTS}
void main(){
  vec4 t = texture2D(map, vUv); if (t.a < 0.02) discard;
  vec3 base = t.rgb * uTint;
  float edge = clamp(t.a - texture2D(map, vUv + vec2(uLightDir.x * uFlip, uLightDir.y) * uTexel * 7.0).a, 0.0, 1.0);
  vec3 col = base * uAmb + base * uLightCol * edge * uRim * 1.6 + uLightCol * edge * uRim * 0.08;
  col *= 1.0 - uRain * 0.25;
  col += base * lightAt(vW3) * (0.3 + uNight * 1.2) * (1.0 - uHaze);
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
    varying vec3 vW3; void main(){ vL = aL; vS = aS; vK = aK; vec4 w = modelMatrix * vec4(position, 1.0); vW = vec2(w.x, -w.y); vW3 = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const TERRAIN_FRAG = `uniform float uTime, uOpacity, uNight; uniform vec3 uAmb, uLightCol; uniform vec2 uLightDir; varying vec2 vL; varying vec2 vS; varying vec2 vK; varying vec2 vW; varying vec3 vW3;
    ${NOISE}
    ${LIGHTS}
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
      vec3 lit = col * uAmb + col * uLightCol * 0.45 * lip * max(0.1, uLightDir.y) + col * lightAt(vW3) * (0.35 + uNight * 1.3) + emit;
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
        vertexShader: `attribute vec4 iB; uniform float uTime, uWind, uGust; uniform vec3 uPlayer; varying float vH; varying float vS; varying vec3 vW3;
          void main(){ vH = uv.y; vS = iB.w; float hh = iB.z * uv.y; float wdt = 3.0 + iB.w * 3.0; vec2 p = vec2(iB.x + position.x * wdt, -iB.y + hh);
            float s = sin(uTime * 2.1 + iB.x * 0.02) * 0.5 + sin(uTime * 4.7 + iB.x * 0.07 + iB.w * 6.0) * 0.25;
            float bend = (s * (0.3 + uWind) + uWind * 0.8 + uGust * 2.0) * uv.y * uv.y * iB.z * 0.35;
            float dx = iB.x - uPlayer.x; float near = step(abs(uPlayer.y + iB.y), 14.0); float push = exp(-dx * dx / 260.0) * near * sign(dx) * 9.0 * uv.y;
            p.x += bend + push; p.y -= abs(push) * 0.3; vW3 = vec3(p, ${z.toFixed(1)});
            gl_Position = projectionMatrix * viewMatrix * vec4(p, ${z.toFixed(1)}, 1.0); }`,
        fragmentShader: `uniform vec3 uAmb, uLightCol; uniform float uNight; varying float vH; varying float vS; varying vec3 vW3; ${LIGHTS} void main(){ vec3 root = vec3(0.16, 0.22, 0.10), tip = mix(vec3(0.42, 0.56, 0.24), vec3(0.62, 0.58, 0.28), vS * 0.6);
          vec3 c = mix(root, tip, vH) * ${shade.toFixed(2)}; c = c * uAmb * 0.95 + c * uLightCol * vH * 0.35 + c * lightAt(vW3) * (0.4 + uNight * 1.3); gl_FragColor = vec4(c, 1.0); }` }));
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

  /* ---------- places: shrines with a living fire, lanterns, banners and a bell; the hut, chests and pots ---------- */
  class Sheet {   // a cloth sheet pinned along the top, for banners (from the look test)
    constructor(cols, rows, w, h, x, y, tex) { this.cols = cols; this.rows = rows; this.sx = w / (cols - 1); this.sy = h / (rows - 1); this.p = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const px = x + c * this.sx, py = y - r * this.sy; this.p.push({ x: px, y: py, px, py, pin: r === 0 }); }
      const g = new THREE.PlaneGeometry(w, h, cols - 1, rows - 1); this.g = g; this.mesh = new THREE.Mesh(g, spriteMat(BANNER_TEX, { rim: 0.6 })); this.mesh.frustumCulled = false; }
    step(dt, wind) { const P2 = this.p, cols = this.cols, t = U.uTime.value;
      for (const q of P2) { if (q.pin) continue; const vx = (q.x - q.px) * 0.97, vy = (q.y - q.py) * 0.97; q.px = q.x; q.py = q.y; const wv = wind * (0.7 + 0.5 * Math.sin(t * 2.3 + q.y * 0.05 + q.x * 0.02)) + Math.sin(t * 7 + q.y * 0.1) * wind * 0.3; q.x += vx + wv * dt * dt * 50; q.y += vy - 300 * dt * dt + Math.cos(t * 4 + q.x * 0.08) * Math.abs(wind) * dt * dt * 25; }
      for (let k = 0; k < 5; k++) for (let r = 0; r < this.rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c; if (c < cols - 1) this.link(P2[i], P2[i + 1], this.sx); if (r < this.rows - 1) this.link(P2[i], P2[i + cols], this.sy); }
      const pos = this.g.attributes.position; for (let i = 0; i < P2.length; i++) pos.setXYZ(i, P2[i].x, P2[i].y, 0); pos.needsUpdate = true; }
    link(a, b, L) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - L) / d; if (a.pin) { b.x -= dx * f; b.y -= dy * f; } else if (b.pin) { a.x += dx * f; a.y += dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; } }
  }
  const BANNER_TEX = paint(128, 512, (g) => { seed = 61; g.fillStyle = '#8a2a20'; g.fillRect(0, 0, 128, 512); g.fillStyle = '#c9963a'; g.fillRect(0, 0, 128, 14); g.fillRect(0, 498, 128, 14); g.strokeStyle = '#d8b050'; g.lineWidth = 5; g.beginPath(); g.arc(64, 160, 30, 0, TAU); g.moveTo(64, 120); g.lineTo(64, 200); g.moveTo(24, 160); g.lineTo(104, 160); g.stroke();
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.moveTo(64 + Math.cos(a) * 36, 300 + Math.sin(a) * 36); g.lineTo(64 + Math.cos(a) * 14, 300 + Math.sin(a) * 14); } g.stroke(); strokes(g, 128, 512, 60, '#4a120e', 30, 0.3, 1.3); });
  const SHRINE_TEX = paint(1024, 1024, (g) => { seed = 41;
    g.fillStyle = '#2b241e'; g.fillRect(100, 900, 824, 124); g.fillStyle = '#4a4036'; g.fillRect(130, 880, 764, 40); g.fillStyle = '#3a312a'; g.fillRect(170, 940, 684, 84);
    g.fillStyle = '#5a2a20'; for (const x of [230, 400, 624, 794]) g.fillRect(x - 18, 360, 36, 520);
    g.fillStyle = '#3c2219'; for (const x of [230, 400, 624, 794]) g.fillRect(x - 18, 360, 8, 520);
    g.fillStyle = '#2e2620'; g.fillRect(190, 330, 644, 60); g.fillStyle = '#6d4a2a'; g.fillRect(190, 380, 644, 14);
    g.fillStyle = '#1f2128'; g.beginPath(); g.moveTo(30, 360); g.quadraticCurveTo(250, 300, 512, 120); g.quadraticCurveTo(774, 300, 994, 360); g.quadraticCurveTo(774, 280, 512, 200); g.quadraticCurveTo(250, 280, 30, 360); g.fill();
    g.fillStyle = '#2b2e36'; g.beginPath(); g.moveTo(80, 330); g.quadraticCurveTo(300, 270, 512, 150); g.quadraticCurveTo(724, 270, 944, 330); g.lineTo(944, 340); g.quadraticCurveTo(724, 300, 512, 200); g.quadraticCurveTo(300, 300, 80, 340); g.fill();
    for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(10,10,14,0.5)'; g.lineWidth = 2; g.beginPath(); const x = 120 + i * 20; g.moveTo(x, 330 - Math.abs(512 - x) * -0.05); g.lineTo(512 + (x - 512) * 0.4, 200); g.stroke(); }
    g.fillStyle = '#c99a3a'; g.fillRect(500, 70, 24, 70); g.beginPath(); g.arc(512, 66, 16, 0, TAU); g.fill();
    g.fillStyle = '#3a2a20'; g.fillRect(420, 760, 184, 24); g.fillRect(436, 784, 20, 96); g.fillRect(568, 784, 20, 96); g.fillStyle = '#7a6040'; g.fillRect(470, 720, 84, 40); strokes(g, 1024, 1024, 300, '#120e0b', 30, 0.18, -1.3); });
  const SHRINE_GLOW = paint(1024, 1024, (g) => { for (const [x, y] of [[300, 520], [724, 520]]) { const r = g.createRadialGradient(x, y, 2, x, y, 40); r.addColorStop(0, 'rgba(255,220,150,1)'); r.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = r; g.fillRect(x - 40, y - 40, 80, 80); } g.fillStyle = '#ffd38a'; g.fillRect(484, 700, 56, 20); });
  const LANTERN = paint(64, 128, (g) => { g.fillStyle = '#2a1a12'; g.fillRect(30, 0, 4, 30); g.fillStyle = '#c84a2a'; g.beginPath(); g.ellipse(32, 70, 22, 34, 0, 0, TAU); g.fill(); g.fillStyle = '#ffd890'; g.beginPath(); g.ellipse(32, 70, 12, 24, 0, 0, TAU); g.fill(); g.fillStyle = '#2a1a12'; g.fillRect(20, 100, 24, 8); });
  const BELL_TEX = paint(128, 192, (g) => { g.fillStyle = '#2a1a12'; g.fillRect(60, 0, 8, 50); const r = g.createLinearGradient(0, 50, 128, 50); r.addColorStop(0, '#7a5a20'); r.addColorStop(0.45, '#e8c060'); r.addColorStop(1, '#6a4a18'); g.fillStyle = r; g.beginPath(); g.moveTo(34, 60); g.quadraticCurveTo(64, 36, 94, 60); g.lineTo(110, 170); g.lineTo(18, 170); g.closePath(); g.fill(); g.fillStyle = '#5a3a10'; g.fillRect(14, 166, 100, 10); g.fillStyle = '#3a2a10'; g.beginPath(); g.arc(64, 182, 9, 0, TAU); g.fill(); });
  const BOWL = paint(128, 96, (g) => { g.fillStyle = '#3a3028'; g.beginPath(); g.moveTo(8, 20); g.lineTo(120, 20); g.lineTo(96, 70); g.lineTo(32, 70); g.closePath(); g.fill(); g.fillRect(52, 70, 24, 26); g.fillStyle = '#5a4a3c'; g.fillRect(8, 16, 112, 8); });
  const POLE = paint(16, 256, (g) => { g.fillStyle = '#2a1e16'; g.fillRect(4, 0, 8, 256); g.fillStyle = '#c9963a'; g.fillRect(2, 0, 12, 8); });
  const FLAME_MAT = new THREE.ShaderMaterial({ uniforms: { ...U, uSize: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uTime, uWind, uRain; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){ vec2 p = vUv; p.x += (p.y * p.y) * (uWind * 0.35) * sin(uTime * 3.0); float s = n(vec2(p.x * 5.0, p.y * 4.0 - uTime * 3.2)) * 0.6 + n(vec2(p.x * 11.0, p.y * 9.0 - uTime * 5.0)) * 0.4;
        float shape = smoothstep(0.5, 0.0, abs(p.x - 0.5) * (1.6 + p.y * 1.8)) * smoothstep(1.0, 0.1, p.y + s * 0.35) * (1.0 - uRain * 0.3);
        vec3 c = mix(vec3(1.0, 0.25, 0.05), vec3(1.0, 0.85, 0.4), shape) * shape * 3.2; gl_FragColor = vec4(c, shape); }` });
  const SHRINE_M = SHRINES.map((sh, i) => {
    const x = sh.x, gy = sh.gy, S2 = 230, o = { x, gy, sheets: [], lanterns: [], bell: { a: 0, va: 0 } };
    const body = sprite(SHRINE_TEX, S2, S2, { ax: 0.5, ay: 0, rim: 0.9, order: 26 }); body.position.set(x, -gy - 12, 0); scene.add(body);
    const gl = sprite(SHRINE_GLOW, S2, S2, { ax: 0.5, ay: 0, rim: 0, tint: '#000000', emit: 0.6, nightEmit: 1.2, add: true, order: 26.1 }); gl.position.set(x, -gy - 12, 0); scene.add(gl); o.glow = gl;
    for (const dx of [-62, 62]) { const l = sprite(LANTERN, 12, 24, { ax: 0.5, ay: 1, rim: 0.4, emit: 0.25, nightEmit: 0.9, order: 26.3 }); l.position.set(x + dx, -gy + 150, 0); scene.add(l); o.lanterns.push({ m: l, a: 0, va: 0, x: x + dx }); }
    const bell = sprite(BELL_TEX, 16, 24, { ax: 0.5, ay: 1, rim: 1.0, emit: 0.05, order: 26.4 }); bell.position.set(x, -gy + 128, 0); scene.add(bell); o.bellM = bell;
    const bowl = sprite(BOWL, 30, 22, { ax: 0.5, ay: 0, rim: 1, order: 28.6 }); bowl.position.set(x, -gy, 0); scene.add(bowl);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(26, 44), FLAME_MAT); fl.geometry.translate(0, 22, 0); fl.position.set(x, -gy + 15, 0); fl.renderOrder = 28.7; fl.frustumCulled = false; scene.add(fl); o.flame = fl;
    for (const bx of [x - 128, x + 116]) { const p = sprite(POLE, 5, 150, { ax: 0.5, ay: 0, rim: 1, order: 26.5 }); p.position.set(bx, -gy, 0); scene.add(p); const arm = sprite(POLE, 26, 3, { ax: 0, ay: 0.5, rim: 1, order: 26.5 }); arm.position.set(bx, -gy + 146, 0); scene.add(arm);
      const shc = new Sheet(4, 9, 18, 64, bx + 3, -gy + 144, BANNER_TEX); shc.mesh.renderOrder = 26.6; scene.add(shc.mesh); o.sheets.push(shc); }
    return o;
  });
  const HUT_TEX = paint(512, 384, (g) => { seed = 17; g.fillStyle = '#3b2c22'; g.fillRect(70, 150, 372, 234); g.fillStyle = '#6b5240'; g.fillRect(84, 165, 344, 219); g.fillStyle = '#241a14'; for (let i = 0; i < 6; i++) g.fillRect(84 + i * 69, 165, 6, 219);
    g.fillStyle = '#4a3a2a'; g.beginPath(); g.moveTo(20, 170); g.quadraticCurveTo(140, 120, 256, 30); g.quadraticCurveTo(372, 120, 492, 170); g.lineTo(470, 182); g.quadraticCurveTo(372, 140, 256, 70); g.quadraticCurveTo(140, 140, 42, 182); g.closePath(); g.fill();
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${170 + srnd(-20, 20)},${140 + srnd(-20, 20)},${70},0.5)`; g.lineWidth = 2; const x = 40 + i * 7.3; g.beginPath(); g.moveTo(256, 40); g.lineTo(x, 175); g.stroke(); }
    g.fillStyle = '#1a120e'; g.fillRect(150, 230, 60, 70); g.fillRect(302, 230, 60, 70); g.fillRect(222, 262, 68, 122); strokes(g, 512, 384, 120, '#100b08', 26, 0.2, -0.3); });
  const HUT_GLOW = paint(512, 384, (g) => { g.fillStyle = '#ffc870'; g.fillRect(156, 236, 48, 58); g.fillRect(308, 236, 48, 58); });
  { const h = sprite(HUT_TEX, 180, 135, { ax: 0.5, ay: 0, rim: 0.8, order: 26 }); h.position.set(HUT.x, -HUT.gy - 2, 0); scene.add(h); const hg = sprite(HUT_GLOW, 180, 135, { ax: 0.5, ay: 0, rim: 0, tint: '#000000', nightEmit: 1.5, add: true, order: 26.1 }); hg.position.set(HUT.x, -HUT.gy - 2, 0); scene.add(hg); }
  const CHEST_TEX = paint(128, 80, (g) => { g.fillStyle = '#4a3020'; g.fillRect(4, 8, 120, 70); g.fillStyle = '#6b4a2e'; for (let i = 0; i < 4; i++) g.fillRect(8, 12 + i * 16, 112, 12); g.fillStyle = '#3a3e44'; g.fillRect(4, 8, 120, 6); g.fillRect(20, 8, 8, 70); g.fillRect(100, 8, 8, 70); g.fillStyle = '#c9963a'; g.fillRect(56, 18, 16, 18); g.fillStyle = '#2a1a10'; g.fillRect(62, 26, 4, 8); });
  const LID_TEX = paint(128, 40, (g) => { g.fillStyle = '#5a3a24'; g.beginPath(); g.moveTo(4, 40); g.lineTo(4, 14); g.quadraticCurveTo(64, -6, 124, 14); g.lineTo(124, 40); g.closePath(); g.fill(); g.fillStyle = '#3a3e44'; g.fillRect(20, 4, 8, 36); g.fillRect(100, 4, 8, 36); g.fillRect(4, 34, 120, 6); });
  const SEAL_TEX = paint(64, 64, (g) => { g.strokeStyle = '#e8e2d0'; g.lineWidth = 4; g.beginPath(); g.arc(32, 32, 24, 0, TAU); g.moveTo(32, 12); g.lineTo(32, 52); g.moveTo(12, 32); g.lineTo(52, 32); g.stroke(); });
  const CHEST_M = CHESTS.map(c => { const b = sprite(CHEST_TEX, 34, 21, { ax: 0.5, ay: 0, rim: 0.9, order: 27 }); b.position.set(c.x, -c.gy, 0); scene.add(b);
    const lidG = new THREE.Group(); lidG.position.set(c.x - 17, -c.gy + 20, 0); scene.add(lidG); const lid = sprite(LID_TEX, 34, 10, { ax: 0, ay: 0.4, rim: 0.9, order: 27.1 }); lidG.add(lid);
    let seal = null; if (c.sealed) { seal = sprite(SEAL_TEX, 16, 16, { ax: 0.5, ay: 0.5, rim: 0, emit: 0.8, tint: '#bfe4ff', add: true, order: 27.2 }); seal.position.set(c.x, -c.gy + 44, 0); scene.add(seal); }
    return { c, lidG, seal, a: 0 }; });
  const POT_TEX = paint(64, 64, (g) => { const r = g.createLinearGradient(8, 0, 56, 0); r.addColorStop(0, '#5a3020'); r.addColorStop(0.45, '#a8643c'); r.addColorStop(1, '#4a2818'); g.fillStyle = r; g.beginPath(); g.moveTo(24, 6); g.lineTo(40, 6); g.quadraticCurveTo(62, 30, 46, 62); g.lineTo(18, 62); g.quadraticCurveTo(2, 30, 24, 6); g.fill(); g.fillStyle = '#3a2016'; g.fillRect(22, 4, 20, 5); g.strokeStyle = 'rgba(230,200,150,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 30); g.quadraticCurveTo(32, 36, 52, 30); g.stroke(); });
  const POT_M = POT_SPOTS.map(([x, gy], i) => { const m = sprite(POT_TEX, 28, 30, { ax: 0.5, ay: 0, rim: 0.9, order: 27 }); m.position.set(x, -gy, 0); scene.add(m); return { i, m }; });   // pots are made again each life: read them by place

  /* ---------- the ink world that is not painted yet, drawn into the picture behind the traveler ---------- */
  const INK_TEX = new THREE.CanvasTexture(document.createElement('canvas')); INK_TEX.minFilter = THREE.LinearFilter; INK_TEX.generateMipmaps = false;
  const INK_M = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShaderMaterial({ uniforms: { ...U, map: { value: INK_TEX } }, transparent: true, depthWrite: false, depthTest: false,
    vertexShader: `varying vec2 vUv; varying vec3 vW3; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW3 = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 uAmb, uLightCol; uniform float uNight; varying vec2 vUv; varying vec3 vW3; ${LIGHTS}
      void main(){ vec4 t = texture2D(map, vUv); if (t.a < 0.01) discard; vec3 c = t.rgb / max(t.a, 0.001); c = c * (uAmb * 0.85 + 0.15) + c * lightAt(vW3) * (0.3 + uNight); gl_FragColor = vec4(c, t.a); }` }));
  INK_M.renderOrder = 30; INK_M.frustumCulled = false; scene.add(INK_M);
  V3.inkLayer = () => INK_TEX.image;

  /* ---------- weather: it comes and goes on its own (rules do not change yet) ---------- */
  const WEATHER = { kinds: { clear: { wind: 0.22, rain: 0, mist: 0, cloud: 0.3 }, windy: { wind: 0.8, rain: 0, mist: 0, cloud: 0.55 }, mist: { wind: 0.12, rain: 0, mist: 1, cloud: 0.6 }, rain: { wind: 0.45, rain: 0.7, mist: 0.3, cloud: 0.9 }, storm: { wind: 0.95, rain: 1, mist: 0.2, cloud: 1 } },
    kind: 'clear', t: rr(70, 160), wind: 0.22, rain: 0, mist: 0, cloud: 0.3, forced: null };
  function pickWeather() { const r = Math.random(); return r < 0.45 ? 'clear' : r < 0.65 ? 'windy' : r < 0.75 ? 'mist' : r < 0.92 ? 'rain' : 'storm'; }
  const MIST_FRONT = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.6, 230), mistMat(0)); MIST_FRONT.renderOrder = 75; MIST_FRONT.frustumCulled = false; scene.add(MIST_FRONT);
  V3.setWeather = (k, now) => { WEATHER.forced = k; if (k) { WEATHER.kind = k; WEATHER.t = 1e9; if (now) Object.assign(WEATHER, WEATHER.kinds[k]); } else WEATHER.t = 0; };
  V3.weather = () => ({ kind: WEATHER.kind, wind: +WEATHER.wind.toFixed(2), rain: +WEATHER.rain.toFixed(2), mist: +WEATHER.mist.toFixed(2) });

  /* ---------- sound of the world: wind, rain, fire near shrines, thunder (made on the fly, on the game's own audio) ---------- */
  const SND = { on: false };
  function soundTick(nearFire) {
    if (SETTINGS.amb === 'off' || navigator.webdriver) { if (SND.on) { SND.master.gain.value = 0; } return; }
    if (!SND.on) { if (!actx) return; try { const AC = actx, len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const noise = () => { const s2 = AC.createBufferSource(); s2.buffer = buf; s2.loop = true; s2.start(); return s2; };
      SND.master = AC.createGain(); SND.master.gain.value = 1; SND.master.connect(AC.destination);
      SND.windF = AC.createBiquadFilter(); SND.windF.type = 'bandpass'; SND.windF.frequency.value = 400; SND.windF.Q.value = 0.6; SND.windG = AC.createGain(); SND.windG.gain.value = 0; noise().connect(SND.windF).connect(SND.windG).connect(SND.master);
      SND.rainF = AC.createBiquadFilter(); SND.rainF.type = 'highpass'; SND.rainF.frequency.value = 1800; SND.rainG = AC.createGain(); SND.rainG.gain.value = 0; noise().connect(SND.rainF).connect(SND.rainG).connect(SND.master);
      SND.fireG = AC.createGain(); SND.fireG.gain.value = 0; const ff = AC.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 900; noise().connect(ff).connect(SND.fireG).connect(SND.master); SND.on = true; } catch (e) { SND.on = false; return; } }
    SND.master.gain.value = mode === 'play' ? 1 : 0.3;
    const w = U.uWind.value + U.uGust.value, inCave = DARKS.some(d => pcx() > d.x && pcx() < d.x + d.w);
    SND.windG.gain.value = lerp(SND.windG.gain.value, (0.015 + w * 0.05) * (inCave ? 0.4 : 1), 0.05); SND.windF.frequency.value = 300 + w * 500;
    SND.rainG.gain.value = lerp(SND.rainG.gain.value, U.uRain.value * 0.09 * (inCave ? 0.3 : 1), 0.05);
    SND.fireG.gain.value = lerp(SND.fireG.gain.value, nearFire * 0.05, 0.1);
  }
  function thunder() { if (!SND.on || !actx) return; const AC = actx, t0 = AC.currentTime + 0.5 + Math.random(); for (const [f, v] of [[55, 0.12], [82, 0.06]]) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.6, t0 + 2.4); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5); o.connect(g).connect(SND.master); o.start(t0); o.stop(t0 + 2.6); } }

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

  /* ---------- the night horse: Sahan's painted parts (art/horse), cut out and moved by code ----------
     The parts face left: +x in the horse's own space is toward its tail. Angles of the legs: 0 hangs straight down,
     positive swings forward (toward the head). The mane and tail flow by a wave inside the picture, stronger at speed. */
  const ART = /*ART*/null;
  const HK = 0.19;                                // part pixels to game units
  const HAIR_VERT = `
uniform float uTime, uWind, uHairAmp, uFlow, uKind, uSeed; varying vec2 vUv; varying vec3 vW3;
float hairW(vec2 uv){ float u = uv.x, v = 1.0 - uv.y;
  if (uKind < 1.5) return max(smoothstep(0.48, 0.95, u) * (0.35 + 0.65 * smoothstep(0.1, 0.9, v)), smoothstep(0.72, 1.0, v) * smoothstep(0.3, 0.6, u));
  if (uKind < 2.5) return smoothstep(0.25, 1.0, u) * (1.0 - smoothstep(0.3, 0.62, v)) + (1.0 - smoothstep(0.0, 0.22, v)) * 0.4;
  return smoothstep(0.05, 0.95, distance(vec2(u, v), vec2(0.12, 0.18))); }
void main(){
  vUv = uv; vec3 p = position;
  if (uKind > 0.5) { float w = hairW(uv), u = uv.x, v = 1.0 - uv.y;
    float wave = sin(uTime * 3.1 + v * 9.0 + u * 5.0 + uSeed) * 0.6 + sin(uTime * 5.3 + v * 17.0 + uSeed * 2.0) * 0.3;
    p.x += (wave * uHairAmp + uFlow * 5.0) * w; p.y += (cos(uTime * 2.7 + u * 7.0 + uSeed) * uHairAmp * 0.5 + uFlow * 1.5) * w; }
  vec4 wp = modelMatrix * vec4(p, 1.0); vW3 = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
  const HORSE = { g: new THREE.Group(), mats: [], ph: 0, lastX: null, speed: 0, nod: 0, neck: 0, head: 0, tail: 0, tailV: 0, by: 0, tuck: 0, seat: new THREE.Object3D(), on: false };
  scene.add(HORSE.g);
  function hPart(name, pu, pv, o = {}) {
    const a = ART.horse[name], img = new Image(), tex = new THREE.Texture(img); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
    img.onload = () => { tex.needsUpdate = true; }; img.src = a.src;
    const W2 = a.w * HK, H2 = a.h * HK, seg = o.kind ? 18 : 1, geo = new THREE.PlaneGeometry(W2, H2, seg, seg); geo.translate(W2 * (0.5 - pu), H2 * (pv - 0.5), 0);
    const mat = spriteMat(tex, { rim: 0.35, order: o.order }); mat.uniforms.uTexel.value.set(0.35 / a.w, 0.35 / a.h);
    if (o.kind) { mat.vertexShader = HAIR_VERT; Object.assign(mat.uniforms, { uHairAmp: { value: 1 }, uFlow: { value: 0 }, uKind: { value: o.kind }, uSeed: { value: Math.random() * 6 } }); }
    if (o.far) mat.uniforms.uTint.value.setScalar(0.62);
    const m = new THREE.Mesh(geo, mat); m.renderOrder = o.order; m.frustumCulled = false; HORSE.mats.push(mat); return m;
  }
  const HB = { body: null, neckG: new THREE.Group(), headG: new THREE.Group(), tailG: new THREE.Group(), bodyG: new THREE.Group(), legs: {} };
  if (ART && ART.horse) {
    const B2 = { w: ART.horse.body.w * HK, h: ART.horse.body.h * HK }, at = (u, v) => [(u - 0.5) * B2.w, (0.5 - v) * B2.h];
    HORSE.g.add(HB.bodyG);
    HB.body = hPart('body', 0.5, 0.5, { order: 47 }); HB.bodyG.add(HB.body);
    HB.neckG.position.set(...at(0.13, 0.26), 0); HB.bodyG.add(HB.neckG); HB.neckG.add(hPart('neck', 0.65, 0.82, { order: 48.4, kind: 2 }));
    const N2 = ART.horse.neck; HB.headG.position.set((0.15 - 0.65) * N2.w * HK, (0.82 - 0.3) * N2.h * HK, 0); HB.neckG.add(HB.headG); HB.headG.add(hPart('head', 0.52, 0.42, { order: 48.6, kind: 1 }));
    HB.tailG.position.set(...at(0.93, 0.2), 0); HB.bodyG.add(HB.tailG); HB.tailG.add(hPart('tail', 0.12, 0.18, { order: 46, kind: 3 }));
    HORSE.seat.position.set(...at(0.44, 0.06), 0); HB.bodyG.add(HORSE.seat);
    // legs: near legs in front of the body, far legs behind it and in shade
    for (const [id, u, v, front, far] of [['FR', 0.27, 0.6, true, true], ['BR', 0.84, 0.55, false, true], ['FL', 0.2, 0.6, true, false], ['BL', 0.78, 0.55, false, false]]) {
      const th = ART.horse[`leg${id}_thigh`], sh = ART.horse[`leg${id}_shin`], up = ART.horse[`leg${id}_thigh`];
      const top = new THREE.Group(); top.position.set(...at(u, v), 0); HB.bodyG.add(top);
      const order = far ? 45 + (front ? 0.2 : 0) : 48 + (front ? 0.2 : 0);
      top.add(hPart(`leg${id}_thigh`, 0.5, 0.08 / 0.57, { order, far }));
      const knee = new THREE.Group(); knee.position.set(0, -(0.5 - 0.08) * (up.h / 0.57) * HK, 0); top.add(knee);
      knee.add(hPart(`leg${id}_shin`, 0.5, (0.44 - 0.36) / 0.64, { order: order + 0.1, far }));
      const shinLen = (0.97 - 0.44) * (sh.h / 0.64) * HK, thighLen = (0.5 - 0.08) * (up.h / 0.57) * HK;
      HB.legs[id] = { top, knee, front, far, len: thighLen + shinLen, thighLen, shinLen, topY: at(u, v)[1], a: 0, k: 0 };
    }
    HORSE.stand = Math.max(...Object.values(HB.legs).map(L => L.len)) - at(0.5, 0.6)[1];   // body centre height when standing
  }
  /* the horse as frames (build 26): Sahan's idle, walk, run and jump drawn whole, played by speed and the jump's rise and fall.
     The cut-out horse above stays, behind a test switch, to compare. */
  const HF = { mesh: null, meta: null, mode: 'frames', anim: 'idle', f: 0, dist: 0, K: 1 };
  if (ART && ART.horseFrames) {
    const a = ART.horseFrames, M = a.meta, img = new Image(), tex = new THREE.Texture(img); tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;
    img.onload = () => { tex.needsUpdate = true; }; img.src = a.src; HF.meta = M;
    const med = M.anims.idle.map(f => f.saddle[1]).sort((x, y) => x - y)[M.anims.idle.length >> 1]; HF.K = 54 / med;   // the back stands 54 high, as the cut-out horse
    const [CW, CH] = M.cell, Wd = CW * HF.K, Hd = CH * HF.K, geo = new THREE.PlaneGeometry(Wd, Hd);
    geo.translate(Wd / 2 - M.anchor[0] * HF.K, Hd / 2 - (CH - M.anchor[1]) * HF.K, 0);
    const mat = spriteMat(tex, { rim: 0.3, order: 47 }); mat.uniforms.uTexel.value.set(0.35 / a.w, 0.35 / a.h);
    HF.mesh = new THREE.Mesh(geo, mat); HF.mesh.renderOrder = 47; HF.mesh.frustumCulled = false; HORSE.g.add(HF.mesh); HORSE.mats.push(mat);
    HF.setCell = k => { const c = k % M.cols, r = Math.floor(k / M.cols), u0 = c * CW / a.w, u1 = (c + 1) * CW / a.w, v1 = 1 - r * CH / a.h, v0 = 1 - (r + 1) * CH / a.h, uv = geo.attributes.uv;
      uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true; };
    HF.setCell(0);
  }
  function frameHorse(s, dt, sp) {   // which frame to show, and where the saddle is
    const A = HF.meta.anims, t = clock;
    let anim = s.air ? 'jump' : sp < 40 ? 'idle' : sp < 480 ? 'walk' : 'run', f;   // riding is a walk, Shift is the gallop
    if (anim === 'jump') { const vy = s.ridden ? P.vy : 0; f = clamp(Math.round((vy + 650) / 1300 * (A.jump.length - 1)), 0, A.jump.length - 1); }
    else if (anim === 'idle') f = Math.floor(t * 5) % A.idle.length;
    else { if (anim !== HF.anim) HF.dist = 0; HF.dist += sp * dt; const stride = anim === 'walk' ? 200 : 270; f = Math.floor((HF.dist / stride) * A[anim].length) % A[anim].length; }
    HF.anim = anim; HF.f = f; const fr = A[anim][f]; HF.setCell(fr.cell);
    return { x: s.x + s.face * fr.saddle[0] * HF.K - s.face * 3, y: s.gy - fr.saddle[1] * HF.K + 2 };
  }
  let seatF = null;
  const HSHADOW = new THREE.Mesh(new THREE.PlaneGeometry(90, 12), new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false, depthTest: false, opacity: 0.5 })); HSHADOW.renderOrder = 25; HSHADOW.frustumCulled = false; scene.add(HSHADOW);
  function horseNow() { // where the horse is and what it is doing, read from the game
    const h = horse; if (!h || !HB.body) return null;
    if (P.mount) return { x: pcx(), gy: P.y + P.h, face: P.face, air: !P.onG, alpha: 1, graze: false, ridden: true, hurt: P.hitT > 0 };
    if (h.state === 'ridden' || h.state === 'away' || (h.state === 'fled' && h.fleeT <= 0)) return null;
    const fl = h.state === 'fled';
    return { x: fl ? h.fleeX : h.x, gy: h.gy, face: h.face, air: false, alpha: fl ? h.fleeT / 1.4 : h.arriveT > 0 ? 1 - h.arriveT / 0.8 : 1, graze: !fl && Math.sin(h.graze * 0.5) > -0.3, ridden: false, wild: h.state === 'wild', fled: fl };
  }
  function poseHorse(dt, wind) {
    const s = horseNow(); HORSE.on = !!s; HORSE.g.visible = !!s; HSHADOW.visible = !!s; if (!s) { HORSE.lastX = null; return; }
    const t = clock, dx = HORSE.lastX === null ? 0 : s.x - HORSE.lastX; HORSE.lastX = s.x;
    if (dt > 0) HORSE.speed = lerp(HORSE.speed, Math.min(Math.abs(dx) / dt, 900), 1 - Math.exp(-dt * 8));
    const framed = HF.mode === 'frames' && !!HF.mesh; HB.bodyG.visible = !framed; if (HF.mesh) HF.mesh.visible = framed;
    seatF = framed ? frameHorse(s, dt, HORSE.speed) : null;
    const sp = HORSE.speed, moving = sp > 40 && !s.air, gal = sp > 470 ? 1 : smooth(320, 470, sp), sn = clamp(sp / 600, 0, 1);
    if (moving) HORSE.ph += dt * sp / lerp(62, 105, gal) * TAU;
    const ph = HORSE.ph, k = dt > 0 ? 1 - Math.exp(-dt * 14) : 1;
    HORSE.tuck = lerp(HORSE.tuck, s.air ? 1 : 0, k);
    const gait = gal > 0.5 ? { BL: 0, BR: 0.1, FL: 0.48, FR: 0.6 } : { BL: 0, FL: 0.25, BR: 0.5, FR: 0.75 };
    for (const id in HB.legs) { const L = HB.legs[id], f = ph + gait[id] * TAU, A = moving ? lerp(0.32, 0.7, gal) : 0, K = moving ? lerp(0.9, 1.5, gal) : 0;
      let a = A * Math.sin(f) + (L.front ? 0 : 0.14), kn = Math.max(0, Math.sin(f + 1.3)) * K;
      if (!moving && !s.air) { a = (L.front ? 0.02 : 0.16) + (s.graze && L.front ? 0.08 : 0) + Math.sin(t * 0.7 + gait[id] * 9) * 0.01; kn = L.front ? 0 : 0.22; }
      a = lerp(a, L.front ? 1.1 : -0.55, HORSE.tuck); kn = lerp(kn, L.front ? 1.9 : -0.1, HORSE.tuck);
      L.a = lerp(L.a, a, k); L.k = lerp(L.k, kn, k);
      L.top.rotation.z = -L.a; L.knee.rotation.z = L.front ? L.k : -L.k * 0.6; }
    // the body rides on the lowest hoof, so the legs always meet the ground (a little lift in the gallop's flight)
    let reach = 0; for (const id in HB.legs) { const L = HB.legs[id], shin = L.front ? L.a - L.k : L.a + L.k * 0.6; reach = Math.max(reach, L.thighLen * Math.cos(L.a) + L.shinLen * Math.cos(shin) - L.topY); }
    const bob = moving ? Math.max(0, Math.sin(ph * 2 + 0.6)) * lerp(0.6, 2.2, gal) : Math.sin(t * 1.3) * 0.3;
    HB.bodyG.position.set(0, (s.air ? HORSE.stand : reach) + bob - 1, 0);
    HB.bodyG.rotation.z = moving ? Math.sin(ph) * 0.05 * gal : 0;
    const neckT = s.graze ? 1.05 : s.air ? -0.12 : moving ? Math.sin(ph * (gal > 0.5 ? 1 : 2)) * lerp(0.04, 0.12, gal) - 0.04 * gal : Math.sin(t * 1.1) * 0.03;
    HORSE.neck = lerp(HORSE.neck, neckT, dt > 0 ? 1 - Math.exp(-dt * 5) : 1); HB.neckG.rotation.z = HORSE.neck;
    HORSE.head = lerp(HORSE.head, s.graze ? -0.35 + Math.sin(t * 3) * 0.04 : moving ? Math.sin(ph + 1) * 0.05 : 0, dt > 0 ? 1 - Math.exp(-dt * 6) : 1); HB.headG.rotation.z = HORSE.head;
    // the tail: on a spring, lifting at a gallop and swinging with the stride
    const tailT = sn * 0.55 + (s.air ? 0.3 : 0) + Math.sin(t * 1.7) * 0.06 + (moving ? Math.sin(ph * 2) * 0.08 * gal : 0);
    HORSE.tailV += ((tailT - HORSE.tail) * 40 - HORSE.tailV * 6) * Math.min(dt, 0.05); HORSE.tail += HORSE.tailV * Math.min(dt, 0.05); HB.tailG.rotation.z = HORSE.tail;
    for (const m of HORSE.mats) { m.uniforms.uOpacity.value = s.alpha * (s.hurt && Math.floor(t * 16) % 2 ? 0.55 : 1); m.uniforms.uFlip.value = -s.face; if (m.uniforms.uHairAmp) { m.uniforms.uHairAmp.value = 0.8 + sn * 2.6 + wind * 0.8; m.uniforms.uFlow.value = sn * 1.2 + wind * 0.3; } }
    if (HF.mesh) HF.mesh.material.uniforms.uFlip.value = s.face;
    HORSE.g.position.set(s.x, -s.gy, 0); HORSE.g.scale.set(-s.face, 1, 1); if (HF.mesh) HF.mesh.scale.x = -1;   // the parts face left, the frames face right
    HORSE.g.updateMatrixWorld(true);
    HSHADOW.position.set(s.x, -s.gy + 1, 0); HSHADOW.material.opacity = (s.air ? 0.25 : 0.5) * s.alpha;
  }
  const _seat = new THREE.Vector3();
  V3.horseSeat = () => { if (!HORSE.on) return null; if (seatF) return seatF; HORSE.seat.getWorldPosition(_seat); return { x: _seat.x, y: -_seat.y }; };
  V3.horseMode = m => { if (m) HF.mode = m; return HF.mode; };
  V3.horseFrame = () => ({ mode: HF.mode, anim: HF.anim, f: HF.f });
  V3.horseState = () => ({ on: HORSE.on, speed: Math.round(HORSE.speed), neck: +HORSE.neck.toFixed(2), tail: +HORSE.tail.toFixed(2), legs: Object.fromEntries(Object.entries(HB.legs).map(([k, L]) => [k, +L.a.toFixed(2)])) });

  /* ---------- the traveler in 3D (build 27, a test): a rigged model from a .glb, played by the game's own state ----------
     Looping moves (idle, walk, run) play by speed; the others are scrubbed by the game's own timers, so a cut is always
     exactly as long as the rules say (jump by its rise and fall, slash by the attack, roll by the roll, death by the fall). */
  const GLB = makeGLB(THREE);
  const B3 = { on: false, want: true, lastParry: 0, lastSwap: 0, parryDur: 0.2, swapDur: 0.4, wrap: new THREE.Group(), model: null, mixer: null, acts: {}, w: {}, t: {}, yaw: Math.PI / 2, mats: [], bones: {}, name: '', clipNames: [], lastRollT: 0, rollDur: 0.5 };
  B3.wrap.visible = false; B3.tilt = new THREE.Group(); B3.tilt.add(B3.wrap); scene.add(B3.tilt);
  function bodyMat(m) {
    return new THREE.ShaderMaterial({
      uniforms: { ...U, map: { value: m.map }, uHasMap: { value: m.map ? 1 : 0 }, uColor: { value: new THREE.Vector4(...m.color) }, uOpacity: { value: 1 } },
      vertexShader: `
        #include <common>
        #include <skinning_pars_vertex>
        varying vec2 vUv; varying vec3 vN; varying vec3 vW3;
        void main(){
          vUv = uv;
          #include <skinbase_vertex>
          #include <beginnormal_vertex>
          #include <skinnormal_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          vec4 wp = modelMatrix * vec4(transformed, 1.0); vW3 = wp.xyz;
          vN = normalize(mat3(modelMatrix) * objectNormal);
          gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform sampler2D map; uniform float uHasMap, uOpacity, uNight; uniform vec4 uColor; uniform vec3 uAmb, uLightCol; uniform vec2 uLightDir; varying vec2 vUv; varying vec3 vN; varying vec3 vW3; ${LIGHTS}
        void main(){ vec4 base = uColor; if (uHasMap > 0.5) base *= texture2D(map, vUv); if (base.a < 0.35) discard;
          vec3 N = normalize(vN); vec3 L = normalize(vec3(uLightDir.x, uLightDir.y, 0.75));
          float d = dot(N, L); float band = smoothstep(-0.15, 0.2, d) * 0.6 + smoothstep(0.45, 0.62, d) * 0.4;   // two soft painted steps of light
          float rim = pow(1.0 - abs(N.z), 3.0);
          vec3 c = base.rgb * (uAmb * (0.5 + 0.3 * band) + uLightCol * band * 0.55) + uLightCol * rim * 0.22 * smoothstep(-0.2, 0.3, d) + base.rgb * lightAt(vW3) * (0.35 + uNight * 1.2);
          gl_FragColor = vec4(c, uOpacity); }`,
      transparent: true, depthTest: true, depthWrite: true, side: m.double ? THREE.DoubleSide : THREE.FrontSide });
  }
  const keyOf = s => String(s).toLowerCase().replace(/\.glb$/, '').replace(/^.*\|/, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  async function load3D(files) {   // files: [{ name, buf }]. The first with a skinned body is the body; every animation is a move, named by its file
    let model = null; const clips = {};
    for (const f of files) {
      const r = await GLB.parse(f.buf);
      if (!model && r.skinned.length) model = r;
      r.clips.forEach((c, i) => { const k = r.clips.length > 1 ? keyOf(c.name) || `${keyOf(f.name)}_${i}` : keyOf(f.name); clips[k] = c; });
    }
    if (!model) throw new Error('none of the files has a rigged body');
    // replace what was there
    if (B3.model) { B3.wrap.remove(B3.model.scene); B3.mixer && B3.mixer.stopAllAction(); }
    B3.model = model; B3.mats = []; B3.acts = {}; B3.w = {}; B3.t = {}; B3.bones = {};
    for (const m of model.meshes) { m.material = bodyMat(m.userData.mat); m.renderOrder = 55; B3.mats.push(m.material); if (/weapon|sword|bow|shield/i.test(m.name)) m.visible = false; }   // the game shows its own weapons
    model.scene.traverse(o => { if (o.isBone) B3.bones[o.name] = o; });
    const find = (...words) => Object.values(B3.bones).find(b => words.every(w => b.name.toLowerCase().includes(w.toLowerCase())));
    const hips = find('hips') || Object.values(B3.bones)[0];
    B3.joint = { hips, head: find('head') || hips, neck: find('neck') || find('head') || hips, sh: find('spine2') || find('spine') || hips,
      hF: find('right', 'hand') || find('hand') || hips, hB: find('left', 'hand') || find('hand') || hips, fF: find('right', 'foot') || hips, fB: find('left', 'foot') || hips };
    const end = w => Object.values(B3.bones).find(b => b.name.toLowerCase().endsWith(w)) || null;   // arm and leg bones, for poses the moves do not have (build 30)
    Object.assign(B3.joint, { uaL: end('leftarm'), faL: end('leftforearm'), uaR: end('rightarm'), faR: end('rightforearm'), ulL: end('leftupleg'), lgL: end('leftleg'), ulR: end('rightupleg'), lgR: end('rightleg') });
    // keep the body over its place: no root motion along the ground (the game moves the body), and none upward in a
    // jump (the game lifts the body). Worked out in true world directions: Blender often turns and shrinks the skeleton
    model.scene.updateMatrixWorld(true);
    const pq = new THREE.Quaternion(); if (hips.parent) hips.parent.getWorldQuaternion(pq); const iq = pq.clone().invert();
    const rest = hips.position.clone().applyQuaternion(pq), v3 = new THREE.Vector3();
    for (const [k, c] of Object.entries(clips)) for (const tr of c.tracks) if (tr.name === `${hips.name}.position`) for (let i = 0; i < tr.values.length; i += 3) {
      v3.set(tr.values[i], tr.values[i + 1], tr.values[i + 2]).applyQuaternion(pq); v3.x = rest.x; v3.z = rest.z; if (k.includes('jump')) v3.y = rest.y;
      v3.applyQuaternion(iq); tr.values[i] = v3.x; tr.values[i + 1] = v3.y; tr.values[i + 2] = v3.z; }
    B3.wrap.add(model.scene); holdWeapons();
    B3.mixer = new THREE.AnimationMixer(model.scene);
    for (const [k, c] of Object.entries(clips)) { const a = B3.mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); B3.acts[k] = a; B3.w[k] = 0; B3.t[k] = 0; }
    B3.clipNames = Object.keys(clips); B3.name = files[0] && files[0].name;
    // measure it standing (first idle frame, or the bind pose): scale it to the traveler's height, feet on the ground
    const first = B3.acts[pickKey(['idle'])]; if (first) { first.setEffectiveWeight(1); first.time = 0; }
    B3.tilt.position.set(0, 0, 0); B3.tilt.rotation.set(0, 0, 0); B3.tilt.scale.set(1, 1, 1); B3.wrap.scale.setScalar(1); B3.wrap.position.set(0, 0, 0); B3.wrap.rotation.set(0, 0, 0); B3.mixer.update(0); B3.tilt.updateMatrixWorld(true);
    let y0 = Infinity, y1 = -Infinity; const v = new THREE.Vector3(); for (const b of Object.values(B3.bones)) { b.getWorldPosition(v); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const hgt = Math.max(1e-3, y1 - y0); B3.scale = 60 / (hgt * 1.04); B3.foot = y0 - hgt * 0.015;
    if (first) first.setEffectiveWeight(0);
    B3.on = true; return { body: model.meshes.length, moves: B3.clipNames, bones: Object.keys(B3.bones).length };
  }
  /* weapons in the 3D hands (build 29): made by code, held by the hand bones; the blade runs along the grip's +Y */
  function weapon3D() {
    const M = c => bodyMat({ color: c, map: null, alpha: 'OPAQUE', double: false });
    const steel = M([0.78, 0.8, 0.84, 1]), dark = M([0.16, 0.11, 0.08, 1]), gold = M([0.78, 0.6, 0.24, 1]), wood = M([0.36, 0.24, 0.14, 1]), pale = M([0.92, 0.96, 1.0, 1]), iron = M([0.42, 0.44, 0.48, 1]);
    const box = (w, h, d, mat, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; return m; };
    const cyl = (r, h, mat, y, r2) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 ?? r, r, h, 8), mat); m.position.y = y; return m; };
    const G = (...parts) => { const g = new THREE.Group(); for (const p of parts) g.add(p); return g; };
    const W3 = {
      blade: G(cyl(0.9, 8, dark, 0), box(7, 1.2, 2, gold, 4.4), box(2.2, 30, 0.6, steel, 20), cyl(1.1, 4, steel, 37, 0.01)),
      empty: G(cyl(0.9, 8, pale, 0), box(7, 1.2, 2, pale, 4.4), box(2.4, 33, 0.6, pale, 21.5), cyl(1.2, 4, pale, 40, 0.01)),
      mace: G(cyl(0.9, 28, wood, 9), (() => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 0), iron); m.position.y = 24; return m; })()),
      spear: G(cyl(0.8, 66, wood, 14), cyl(1.6, 9, steel, 51.5, 0.01)),
      staff: G(cyl(0.9, 62, wood, 0), cyl(1.2, 3, gold, 30), cyl(1.2, 3, gold, -30)),
      daggerF: G(cyl(0.7, 5, dark, 0), box(4, 0.8, 1.4, gold, 2.8), box(1.5, 14, 0.5, steel, 10)),
      daggerB: G(cyl(0.7, 5, dark, 0), box(4, 0.8, 1.4, gold, 2.8), box(1.5, 13, 0.5, steel, 9.5)),
    };
    // a bow (build 30): its belly bulges along +X, which is turned toward the target; the string runs tip, nock, tip and the
    // back hand pulls the nock; an arrow sits on the string while it is drawn
    const bowOf = (len, mat) => { const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, -len, 0), new THREE.Vector3(9, 0, 0), new THREE.Vector3(0, len, 0)); const g = G(new THREE.Mesh(new THREE.TubeGeometry(c, 18, 0.8, 5), mat));
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -len, 0, 0, 0, 0, 0, len, 0]), 3));
      const str = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xe8e0c8, transparent: true })); str.frustumCulled = false; g.add(str);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(30, 0.7, 0.7).translate(15, 0, 0), wood), head = new THREE.Mesh(new THREE.ConeGeometry(1.3, 4, 5).rotateZ(-Math.PI / 2).translate(31, 0, 0), iron);
      const fl = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 0.3).translate(2.5, 0, 0), M([0.86, 0.82, 0.7, 1])), arrow = G(shaft, head, fl); arrow.visible = false; g.add(arrow);
      Object.assign(g.userData, { len, str, arrow }); return g; };
    W3.bow = bowOf(22, wood); W3.longbow = bowOf(31, M([0.86, 0.8, 0.66, 1]));
    for (const k in W3) W3[k].traverse(o => { if (o.isMesh || o.isLine) { o.renderOrder = 55.5; o.frustumCulled = false; } });
    return W3;
  }
  function holdWeapons() {   // put each weapon on a grip under its hand; the grip cancels the skeleton's scale so weapons are sized in game units
    const W3 = weapon3D(), grip = (bone) => { const g = new THREE.Group(); bone.add(g); return g; };
    B3.grip = { F: grip(B3.joint.hF), B: grip(B3.joint.hB) }; B3.w3 = W3;
    for (const k of ['blade', 'empty', 'mace', 'spear', 'staff', 'daggerF']) { W3[k].visible = false; B3.grip.F.add(W3[k]); }
    W3.daggerB.visible = false; B3.grip.B.add(W3.daggerB);
    // the bows are placed in the world each frame at the front hand (build 30), so they always face the target the right way
    if (!B3.bowG) { B3.bowG = new THREE.Group(); scene.add(B3.bowG); } B3.bowG.clear(); for (const k of ['bow', 'longbow']) { W3[k].visible = false; B3.bowG.add(W3[k]); }
    // the torch (build 30): a stick with the living flame of the cut-out torch, held upright in the hand
    if (!B3.t3) { const st = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.8, 22, 6).translate(0, 6, 0), bodyMat({ color: [0.3, 0.19, 0.11, 1], map: null, alpha: 'OPAQUE', double: false }));
      const wrapT = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.4, 4, 6).translate(0, 16, 0), bodyMat({ color: [0.5, 0.36, 0.22, 1], map: null, alpha: 'OPAQUE', double: false }));
      const fm = new THREE.ShaderMaterial({ uniforms: { ...U, uOpacity: { value: 1 } }, vertexShader: TORCH.flame.material.vertexShader, fragmentShader: TORCH.flame.material.fragmentShader, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending });
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(22 * RS * 1.15, 34 * RS * 1.15).translate(0, 15 * RS * 1.15 + 15, 0), fm);
      st.renderOrder = wrapT.renderOrder = 55.4; fl.renderOrder = 55.8; for (const m of [st, wrapT, fl]) m.frustumCulled = false;
      B3.t3 = new THREE.Group(); B3.t3.add(st, wrapT, fl); B3.t3.userData = { mats: [st.material, wrapT.material, fm] }; B3.t3.visible = false; scene.add(B3.t3); }
    setGrip(B3.gripRot || [0, 0, -Math.PI / 2]);
  }
  /* turning bones for poses the moves do not have (build 30): the torch arm, the legs astride the horse, the chest toward the aim */
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _d = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), ZAX = new THREE.Vector3(0, 0, 1);
  // three.js only writes a bone when the move's value changes, so a held pose would keep our turn from the frame before and
  // add to it: every bone we turn is put back to the move's own pose before the next frame
  const KEPT = new Map(), keep = b => { if (!KEPT.has(b)) KEPT.set(b, b.quaternion.clone()); };
  function restoreKept() { for (const [b, q] of KEPT) b.quaternion.copy(q); KEPT.clear(); }
  function aimBone(bone, child, dir, w) {   // turn a bone, in world terms, so it points at its child along dir; w blends from the move's own pose
    if (!bone || !child || !bone.parent || w <= 0.001) return; keep(bone);
    bone.getWorldPosition(_v1); child.getWorldPosition(_v2); _v2.sub(_v1); if (_v2.lengthSq() < 1e-12) return; _v2.normalize();
    _q1.setFromUnitVectors(_v2, _v3.copy(dir).normalize()); bone.getWorldQuaternion(_q2); _q1.multiply(_q2);
    bone.parent.getWorldQuaternion(_q3); _q3.invert().multiply(_q1); bone.quaternion.slerp(_q3, Math.min(1, w)); bone.updateMatrixWorld(true);
  }
  function turnBone(bone, axis, ang) {   // turn a bone about a world axis
    if (!bone || !bone.parent || Math.abs(ang) < 1e-4) return; keep(bone);
    _q1.setFromAxisAngle(axis, ang); bone.getWorldQuaternion(_q2); _q1.multiply(_q2); bone.parent.getWorldQuaternion(_q3); _q3.invert().multiply(_q1); bone.quaternion.copy(_q3); bone.updateMatrixWorld(true);
  }
  function setGrip(r) { B3.gripRot = r; if (!B3.grip) return; for (const g of Object.values(B3.grip)) g.rotation.set(r[0], r[1], r[2]); }
  function showWeapons(p, drawing, pulled) {
    if (!B3.w3) return; const id = curW().id, W3 = B3.w3, show = !p.dead && !p.ladder && !p.hang && p.climbT <= 0 && !(p.inWater && !p.onG) && !p.glide && mode !== 'meditate';
    for (const k in W3) W3[k].visible = false; if (!show) return;
    if (id === 'daggers') { W3.daggerF.visible = true; W3.daggerB.visible = !p.torch.lit; } else if (W3[id]) W3[id].visible = true; else W3.blade.visible = true;
    // the grips cancel the body's scale, so a weapon is the same size on any model
    const sc = new THREE.Vector3(); for (const g of Object.values(B3.grip)) { g.parent.getWorldScale(sc); g.scale.setScalar(1 / Math.max(1e-6, sc.x)); }
    const bw = (id === 'bow' || id === 'longbow') && W3[id]; if (!bw) return;
    // the bow in the front (left) hand: the belly toward the target, upright and tipped a little forward when carried
    B3.joint.hB.getWorldPosition(_v1); const fw = p.face;
    const ang = drawing ? (mouse.in ? Math.atan2(-(aimY() - -_v1.y), aimX() - _v1.x) : fw > 0 ? 0 : Math.PI) : fw > 0 ? -0.22 : Math.PI + 0.22;
    B3.bowG.position.set(_v1.x, _v1.y + (drawing ? 0 : bw.userData.len * 0.25), _v1.z); B3.bowG.rotation.set(0, 0, ang); B3.bowG.updateMatrixWorld(true);
    let nx = 0; if (pulled) { B3.joint.hF.getWorldPosition(_v2); B3.bowG.worldToLocal(_v2); nx = clamp(_v2.x, -34, 0); }   // the back hand pulls the string; let go, it snaps back
    const pos = bw.userData.str.geometry.attributes.position; pos.setX(1, nx); pos.needsUpdate = true;
    bw.userData.arrow.visible = !!pulled; bw.userData.arrow.position.set(nx, 0, 0);
  }
  function pickKey(words) { for (const w of words) { const k = B3.clipNames.find(n => n === w) || B3.clipNames.find(n => n.includes(w)); if (k) return k; } return null; }
  function pose3D(dt) {
    const p = P, sitK = pickKey(['sit_idle', 'sitting', 'sit']), show = B3.on && B3.want && (!p.mount || !!sitK); B3.wrap.visible = show; if (B3.t3) B3.t3.visible = false; if (B3.bowG) B3.bowG.visible = show; if (!show) return false;
    const idle = pickKey(['idle', 'stand', 'breath']) || B3.clipNames[0];
    if (p.rollT > B3.lastRollT + 0.01) B3.rollDur = Math.max(0.2, p.rollT); B3.lastRollT = p.rollT;
    let key = idle, scrub = null, speed = 1, fast = false;
    const sp = Math.abs(p.vx), K = (...w) => pickKey(w), wid = curW().id, bow = wid === 'bow' || wid === 'longbow', S = B3.sp || (B3.sp = { t: 0 });
    // short timed pieces (build 29): setting off, sliding to a stop, turning at a run. Each plays a part of its move, then hands back
    const startPiece = (k, dur, a0, a1, lockYaw) => { if (K(k)) Object.assign(S, { key: K(k), t: 0, dur, a0, a1, lockYaw: lockYaw ?? null }); };
    if (dt > 0) {
      const moving = p.onG && sp > 20 && !p.crouch && !p.atk && p.rollT <= 0 && !p.inWater && !p.mount;
      if (p.mount) S.key = null;
      else if (p.face !== B3.lastFace && p.onG && (B3.lastSp || 0) > 190 && !p.crouch && !p.atk) startPiece('run_turn', 0.42, 0.05, 0.95, B3.lastFace > 0 ? Math.PI / 2 : -Math.PI / 2);
      else if (moving && (B3.lastSp || 0) < 15 && !S.key) startPiece('start_walk', 0.42, 0.0, 0.42);
      else if (!p.mount && p.onG && sp > 180 && !held.left && !held.right && !p.atk && p.rollT <= 0 && !p.crouch && !S.key) startPiece('run_stop', 0.55, 0.08, 0.6);   // let go at a run: slide to a stop
      if (S.key) { S.t += dt; const cut = p.dead || p.rollT > 0 || p.atk || !p.onG || p.hitT > 0 || (S.key === K('start_walk') && sp < 15) || (S.key === K('run_stop') && (held.left || held.right)); if (S.t >= S.dur || cut) S.key = null; }
    }
    B3.lastFace = p.face; B3.lastSp = sp;
    if (p.parryT > B3.lastParry + 0.01) B3.parryDur = Math.max(0.1, p.parryT); B3.lastParry = p.parryT;
    if (p.swapT > B3.lastSwap + 0.01) B3.swapDur = Math.max(0.1, p.swapT); B3.lastSwap = p.swapT;
    if (p.climbT > 0 && !B3.climbing) { B3.climbing = true; B3.climbWater = !!p.inWater; } if (p.climbT <= 0) B3.climbing = false;
    // Draw Arrow: reach to the quiver (0 to 0.3), nock (to 0.6), pull to full draw at its last frame; the charge plays it from the reach
    const drawing = bow && (p.charging || (p.atk && p.atk.bow && p.atk.t < 0.18)), pull = bow && p.charging, drawK = () => 0.25 + 0.75 * Math.min(1, p.charge / (wid === 'longbow' ? 1 : 0.7));
    const slashK = K('slash', 'attack', 'sword', 'swing'), slashing = p.atk && !p.atk.bow && slashK;
    if (p.dead && K('death', 'dying', 'die')) { key = K('death', 'dying', 'die'); scrub = Math.min(1, p.deadT / 1.6); }
    else if (p.mount) {   // on horseback (build 30): seated, legs astride (below); cuts and the bow play from the saddle
      if (slashing) { key = (p.atk.heavy && K('heavy')) || slashK; scrub = clamp(p.atk.t / Math.max(0.05, p.atk.dur), 0, 1); fast = true; }
      else if (bow && p.atk && p.atk.bow && K('bow_draw')) { key = K('bow_draw'); scrub = 1; fast = true; }
      else if (bow && p.charging && K('bow_draw')) { key = K('bow_draw'); scrub = drawK(); }
      else key = sitK;
    }
    else if (mode === 'meditate' && K('meditate', 'sit_pose', 'pray')) { key = K('meditate', 'sit_pose', 'pray'); scrub = 0.5; }
    else if (p.climbT > 0 && K('ledge_climb', 'climb_up')) { const w = B3.climbWater && K('swim_out'); key = w || K('ledge_climb', 'climb_up'); const k = 1 - p.climbT / 0.24; scrub = w ? 0.45 + 0.5 * k : 0.25 + 0.7 * k; fast = true; }
    else if (p.hang && K('ledge_climb', 'climb_up')) { key = K('ledge_climb', 'climb_up'); scrub = 0.06 + Math.sin(clock * 2) * 0.01; }
    else if (p.ladder && K('ladder', 'climbing')) { key = K('ladder', 'climbing'); speed = p.vy < 0 ? 1.3 : p.vy > 0 ? -1.3 : 0; }
    else if (p.rollT > 0 && K('roll', 'dodge')) { key = K('roll', 'dodge'); scrub = 1 - p.rollT / B3.rollDur; fast = true; }
    else if (p.parryT > 0 && K('block', 'parry')) { key = K('block', 'parry'); scrub = 0.1 + 0.45 * (1 - p.parryT / (B3.parryDur || 0.2)); fast = true; }
    else if (p.atk && !p.atk.bow && K('slash', 'attack', 'sword', 'swing')) { key = (p.atk.heavy && K('heavy')) || K('slash', 'attack', 'sword', 'swing'); scrub = clamp(p.atk.t / Math.max(0.05, p.atk.dur), 0, 1); fast = true; }
    else if (bow && p.swapT > 0 && K('bow_equip')) { key = K('bow_equip'); scrub = 1 - p.swapT / (B3.swapDur || 0.4); fast = true; }
    else if (bow && p.atk && p.atk.bow && K('bow_draw')) { key = K('bow_draw'); scrub = 1; fast = true; }   // the shot: held at full draw while the arm follows through, then back
    else if (bow && p.charging && sp > 20 && p.onG && K('aim_walk')) { const back = Math.sign(p.vx) !== p.face; key = (back && K('aim_walk_back')) || K('aim_walk'); speed = (back ? -1 : 1) * Math.max(0.6, sp / 90) * (back && K('aim_walk_back') ? -1 : 1); }
    else if (bow && p.charging && K('bow_draw')) { key = K('bow_draw'); scrub = drawK(); }
    else if (p.inWater && !p.onG && K('swim', 'tread')) { const mv = sp > 30 || held.up || held.down; key = (mv && K('swim')) || K('tread') || K('swim'); speed = mv ? Math.max(0.7, sp / 170) : 1; }
    else if (!p.onG && !p.inWater && K('jump')) { key = K('jump'); scrub = 0.3 + 0.45 * clamp((p.vy + 700) / 1400, 0, 1); }
    else if (p.crouch && p.onG && K('crouch_idle', 'crouch')) { const mv = sp > 15 && K('crouch_walk'); key = mv || K('crouch_idle', 'crouch'); speed = mv ? Math.max(0.6, sp / 110) : 1; }
    else if (S.key) { key = S.key; scrub = S.a0 + (S.a1 - S.a0) * clamp(S.t / S.dur, 0, 1); }
    else if (sp > 20 && p.onG && (K('walk') || K('run'))) key = 'move';   // walk and run blended by speed, below
    const rate = 1 - Math.exp(-dt * (fast ? 28 : 11)), walkK = pickKey(['walk']), runK = pickKey(['run', 'sprint']);
    // one stride for both: the walk and the run share a phase, so their feet stay in step while they blend
    const wr = walkK && runK ? smooth(170, 250, sp) : runK ? 1 : 0, dW = walkK ? B3.acts[walkK].getClip().duration : 1, dR = runK ? B3.acts[runK].getClip().duration : 1;
    if (key === 'move') B3.ph = ((B3.ph || 0) + dt * lerp((sp / 150) / dW, (sp / 270) / dR, wr)) % 1;
    const target = k => key === 'move' ? (k === walkK ? 1 - wr : k === runK ? wr : 0) : (k === key ? 1 : 0);
    for (const k of B3.clipNames) { const a = B3.acts[k], d = a.getClip().duration || 1;
      B3.w[k] = dt > 0 ? lerp(B3.w[k], target(k), rate) : target(k);
      if (key === 'move' && (k === walkK || k === runK)) B3.t[k] = B3.ph * d;
      else if (k === key && scrub !== null) B3.t[k] = scrub * d * 0.999; else if (k === key) B3.t[k] = (((B3.t[k] + dt * speed) % d) + d) % d;
      a.enabled = true; a.setEffectiveWeight(B3.w[k]); a.time = B3.t[k]; }
    B3.key = key === 'move' ? (wr > 0.5 ? runK : walkK) : key; restoreKept(); B3.mixer.update(0);
    // facing: turn through the front, the way a body really turns
    const yawT = p.face > 0 ? Math.PI / 2 : -Math.PI / 2, turning = S.key && S.lockYaw !== null && key === S.key;
    if (turning) B3.yaw = S.lockYaw; else if (B3.wasTurning) { B3.yaw = yawT; for (const k of B3.clipNames) B3.w[k] = k === key || key === 'move' ? B3.w[k] : 0; } else B3.yaw = dt > 0 ? lerp(B3.yaw, yawT, 1 - Math.exp(-dt * 14)) : yawT;
    B3.wasTurning = turning;
    const ay = p.inWater && !p.onG ? p.y + 34 : p.y + p.h, seat = p.mount && V3.horseSeat ? V3.horseSeat() : null;
    const sq = 1 - 0.1 * Math.sin(Math.min(1, FEEL.squash) * Math.PI / 2) + 0.06 * FEEL.stretch, step = key === pickKey(['slash', 'attack', 'sword', 'swing']) && scrub !== null ? Math.sin(Math.min(1, scrub * 1.6) * Math.PI) * 7 : 0;
    const ride = seat ? clamp(Math.abs(HORSE.speed || 0) / 480, 0, 1) : 0;
    B3.tilt.position.set(pcx() + p.face * step, -ay, 0); B3.tilt.rotation.set(0, 0, seat ? -p.face * 0.16 * ride : -p.face * FEEL.lean * 0.8); B3.tilt.scale.set(1 + (seat ? 0 : 0.06 * FEEL.squash), seat ? 1 : sq, 1);   // lean into speed, squash on landing, step into a cut
    B3.wrap.scale.setScalar(B3.scale); B3.wrap.rotation.set(0, B3.yaw, 0); B3.wrap.position.set(0, -B3.foot * B3.scale, 0); B3.tilt.updateMatrixWorld(true);
    // poses the moves do not have (build 30), laid over the move
    const JB = B3.joint, fw = p.face;
    if (seat) {   // astride the saddle: thighs down and forward round the horse's sides, shins hanging to the stirrups
      JB.hips.getWorldPosition(_v3); const hz = _v3.z;
      for (const [ul, lg, ft] of [[JB.ulL, JB.lgL, JB.fB], [JB.ulR, JB.lgR, JB.fF]]) { if (!ul || !lg) continue; ul.getWorldPosition(_v3); const side = Math.sign(_v3.z - hz) || 1;
        aimBone(ul, lg, _d.set(fw * 0.62, -0.74, side * 0.34), 1); aimBone(lg, ft, _d.set(-fw * 0.08, -1, side * 0.06), 1); }
      if (!slashing && !drawing && !(p.atk && p.atk.bow)) for (const [ua, fa, h] of [[JB.uaL, JB.faL, JB.hB], [JB.uaR, JB.faR, JB.hF]]) { aimBone(ua, fa, _d.set(fw * 0.4, -0.92, 0), 0.85); aimBone(fa, h, _d.set(fw * 0.96, -0.1, 0), 0.85); }   // hands forward at the reins
    }
    const DBG = V3._dbg || {};
    if (drawing && mouse.in && JB.sh && !DBG.noAim) {   // the chest turns up or down toward the aim, and both arms go with it
      JB.sh.getWorldPosition(_v3); const e = clamp(Math.atan2(-(aimY() - -_v3.y), Math.abs(aimX() - _v3.x)), -0.85, 0.85);
      B3.aimE = dt > 0 ? lerp(B3.aimE || 0, e, 1 - Math.exp(-dt * 18)) : e; turnBone(JB.sh, ZAX, fw * B3.aimE);
    } else B3.aimE = 0;
    // the torch: held up and forward in the front hand (with the bow, in the drawing hand, so the bow hand stays free)
    const tOn = p.torch.lit && !p.dead, tHand = bow ? JB.hF : JB.hB;
    const tArm = tOn && !p.ladder && !p.hang && p.climbT <= 0 && !(p.inWater && !p.onG) && p.rollT <= 0 && mode !== 'meditate' && !(bow && (drawing || p.atk || p.swapT > 0));
    B3.torchW = dt > 0 ? lerp(B3.torchW || 0, tArm ? 1 : 0, 1 - Math.exp(-dt * 12)) : (tArm ? 1 : 0);
    if (B3.torchW > 0.01 && !DBG.noTorchArm) { const [ua, fa] = bow ? [JB.uaR, JB.faR] : [JB.uaL, JB.faL]; aimBone(ua, fa, _d.set(fw * 0.3, -0.95, 0), B3.torchW); aimBone(fa, tHand, _d.set(fw * 0.72, 0.7, 0), B3.torchW); }
    if (seat) {   // the hips sit on the saddle, wherever the move put them
      JB.hips.getWorldPosition(_v3); B3.tilt.position.x += seat.x - _v3.x; B3.tilt.position.y += -(seat.y - 4) - _v3.y; B3.tilt.updateMatrixWorld(true);
    }
    const a = bodyAlpha(p); for (const m of B3.mats) m.uniforms.uOpacity.value = a; B3.wrap.visible = a > 0.01; if (B3.bowG) B3.bowG.visible = B3.wrap.visible; showWeapons(p, drawing, pull && (p.charge || 0) > 0.12);
    if (B3.t3) { B3.t3.visible = tOn && B3.wrap.visible; if (tOn) { tHand.getWorldPosition(_v3); B3.t3.position.copy(_v3); B3.t3.rotation.set(0, 0, -fw * (0.2 + 0.25 * (1 - B3.torchW))); for (const m of B3.t3.userData.mats) m.uniforms.uOpacity.value = a; } }
    const v = new THREE.Vector3(), G = b => { b.getWorldPosition(v); return { x: v.x, y: -v.y }; };
    J = { hF: G(B3.joint.hF), hB: G(tOn ? tHand : B3.joint.hB), head: G(B3.joint.head), neck: G(B3.joint.neck), hip: G(B3.joint.hips), sh: G(B3.joint.sh), fF: G(B3.joint.fF), fB: G(B3.joint.fB), hr: 6.5, tip: G(B3.joint.hF), robe: false, act: false, id: curW().id };
    return true;
  }
  V3.load3D = async files => { const r = await load3D(files); return r; };
  V3.setGrip = r => setGrip(r);
  V3._B3 = () => B3;   // for the tests
  V3.use3D = on => { B3.want = on; return B3.on && B3.want; };
  V3.body3D = () => ({ on: B3.on && B3.want && B3.wrap.visible, name: B3.name, moves: B3.clipNames, key: B3.key, yaw: +B3.yaw.toFixed(2), scale: +(B3.scale || 0).toFixed(2) });
  // Sahan's files, packed into the page when they are in art/characters (build.py)
  if (ART && ART.body3d) (async () => { try { const files = await Promise.all(Object.entries(ART.body3d).map(async ([name, src]) => ({ name, buf: await (await fetch(src)).arrayBuffer() }))); await load3D(files); } catch (e) { console.warn('3D body', e); } })();

  /* the rig's pose: the ink body's own joint angles (0 points down, positive swings forward) */
  const rot = (a, l) => [Math.sin(a) * l, -Math.cos(a) * l];
  const PS = { lean: 0, aF0: 0.25, aF1: 0.45, aB0: -0.2, aB1: 0.05, lF0: 0.14, lF1: 0.02, lB0: -0.14, lB1: -0.02, bob: 0, wpn: 0.6 };
  let J = null;   // the last joints, in game units, for the ink layer's extras
  /* life in the moves (build 28): how the body leans into speeding up and slowing down, squashes when it lands, stretches
     when it leaves the ground, and flips round on a turn. Read from the game each frame, shared by both bodies */
  const FEEL = { vx: 0, acc: 0, wasG: true, vy: 0, squash: 0, stretch: 0, face: 1, turn: 1, lean: 0 };
  function feel(dt) {
    const p = P; if (dt <= 0) return FEEL;
    const a = (p.vx - FEEL.vx) / dt; FEEL.vx = p.vx; FEEL.acc = lerp(FEEL.acc, clamp(a, -3000, 3000), 1 - Math.exp(-dt * 10));
    if (p.onG && !FEEL.wasG) FEEL.squash = clamp(FEEL.vy / 900, 0.25, 1);   // the harder the landing, the deeper the squash
    if (!p.onG && FEEL.wasG && p.vy < -200) FEEL.stretch = 1;
    FEEL.wasG = p.onG; FEEL.vy = p.vy;
    FEEL.squash = Math.max(0, FEEL.squash - dt * 6); FEEL.stretch = Math.max(0, FEEL.stretch - dt * 5);
    if (p.face !== FEEL.face) { FEEL.face = p.face; FEEL.turn = -1; } FEEL.turn = Math.min(1, FEEL.turn + dt / 0.09);
    const run = p.onG && !p.atk && p.rollT <= 0 && Math.abs(p.vx) > 20;
    FEEL.lean = lerp(FEEL.lean, run || p.onG ? clamp(FEEL.acc * p.face / 2600, -0.16, 0.22) : 0, 1 - Math.exp(-dt * 8));
    return FEEL;
  }
  /* swings: real arcs. A cut alternates down and up within a quick chain; a heavy blow comes from behind the head.
     The blade leads (eased out fast) and the arm follows, the body leans into it and the feet open into a lunge.
     Each: upper arm, forearm and blade angles at the start and the end, the lean, and the back arm (balance). */
  const SWINGS = {
    down: { u: [2.7, 1.05], f: [3.3, 0.75], w: [3.95, 0.5], lean: [-0.06, 0.34], b: [[-0.5, -0.15], [0.85, 1.35]] },
    up: { u: [-0.25, 2.45], f: [0.15, 2.85], w: [-0.55, 3.15], lean: [0.32, 0.04], b: [[0.9, 1.3], [-0.55, -0.2]] },
    heavy: { u: [3.05, 0.9], f: [3.55, 0.45], w: [4.35, 0.12], lean: [-0.18, 0.52], b: [[-0.95, -0.45], [1.0, 1.6]] },
  };
  const SW = { last: null, n: 0, lastT: -9 };
  function swingPose(p, rest) {
    const a = p.atk, id = curW().id;
    if (!a || a.bow || id === 'spear' || a.thrust || (id === 'staff' && a.spin)) return null;
    if (a !== SW.last) { SW.last = a; SW.n = clock - SW.lastT < 0.8 ? SW.n + 1 : 0; SW.lastT = clock; SW.from = { w: PS.wpn, u: SW.u ?? rest.u, f: SW.f ?? rest.f, lean: PS.lean }; }   // the wind-up starts from where the blade is held now (a charge holds it high)
    const from = SW.from;
    const S = a.heavy ? SWINGS.heavy : SW.n % 2 ? SWINGS.up : SWINGS.down, t = a.t, a0 = Math.max(0.03, a.a0), a1 = a.a1 + 0.04, dur = Math.max(a1 + 0.05, a.dur);
    let w, u, f, lean, kb, act = false, lunge;
    if (t < a0) { const k = smooth(0, 1, t / a0); w = lerp(from.w, S.w[0], k); u = lerp(from.u, S.u[0], k); f = lerp(from.f, S.f[0], k); lean = lerp(from.lean, S.lean[0], k); kb = 0; lunge = k * 0.3; }
    else if (t <= a1) { const k = (t - a0) / (a1 - a0), kw = 1 - Math.pow(1 - k, 3), ka = smooth(0, 1, k); w = lerp(S.w[0], S.w[1], kw); u = lerp(S.u[0], S.u[1], ka); f = lerp(S.f[0], S.f[1], kw); lean = lerp(S.lean[0], S.lean[1], ka); kb = ka; act = true; lunge = 0.3 + 0.7 * ka; }
    else { const k = smooth(0, 1, (t - a1) / (dur - a1)); w = lerp(S.w[1], rest.w, k); u = lerp(S.u[1], rest.u, k); f = lerp(S.f[1], rest.f, k); lean = lerp(S.lean[1], rest.lean, k); kb = 1 - k; lunge = 1 - k; }
    const bu = lerp(S.b[0][0], S.b[1][0], kb), bf = lerp(S.b[0][1], S.b[1][1], kb);
    const body = { lean, aB0: bu, aB1: bf };
    if (p.onG && !p.mount && !p.crouch) Object.assign(body, { lF0: lerp(0.15, 0.62, lunge), lF1: lerp(0.05, 0.35, lunge), lB0: lerp(-0.15, -0.5, lunge), lB1: lerp(-0.05, -0.28, lunge) });
    return { w, ua: u, fa: f, act, body, direct: true };
  }
  function weaponAngle(p, fa) { // where the held weapon points (rig angle), and how the arms move with it
    const id = curW().id, a = p.atk;
    if (p.plunge) return { w: 0.05 };
    if (id === 'bow' || id === 'longbow') {   // the bow's belly faces the target, the front arm points at it, the back hand draws to the chin
      const dx = aimX() - pcx(), dy = aimY() - (p.y + 16), w = mouse.in ? Math.atan2(dx * p.face, dy) : Math.PI / 2 - 0.05;
      const drawing = p.charging || (a && a.bow && a.t < 0.18), aiming = drawing || mouse.in;
      if (!aiming) return { w: fa + 0.2 };
      return { w, ua: w, fa: w, aim: true, direct: true, body: drawing ? { aB0: w + 2.45, aB1: w + 0.15 } : null };
    }
    const sw = swingPose(p, { w: fa + 0.32, u: PS.aF0, f: PS.aF1, lean: PS.lean }); if (sw) return sw;
    if (a && !a.bow) { const t = a.t, a0 = a.a0, a1 = a.a1 + 0.05;
      if (id === 'spear' || a.thrust) { const k = t < a0 ? smooth(0, 1, t / a0) * 0.3 : t < a1 ? 1 : Math.max(0, 1 - (t - a1) / 0.15); return { w: Math.PI / 2 - 0.05, ua: lerp(1.0, 1.55, k), fa: lerp(1.2, 1.57, k), push: k, act: t >= a0 && t <= a1, direct: true, body: { lean: lerp(0.05, 0.32, k), aB0: lerp(-0.3, -0.8, k), aB1: lerp(0.2, -0.4, k), ...(p.onG && !p.mount ? { lF0: lerp(0.2, 0.7, k), lF1: lerp(0.1, 0.4, k), lB0: lerp(-0.2, -0.55, k), lB1: lerp(-0.1, -0.3, k) } : {}) } }; }
      if (id === 'staff' && a.spin && t >= a0 && t <= a1) return { w: t * 24, ua: 1.6, fa: 1.8, act: true, direct: true };
    }
    if (p.charging) return { w: id === 'spear' ? Math.PI / 2 : 4.1, ua: id === 'spear' ? 1.0 : 2.9, fa: id === 'spear' ? 1.2 : 3.4, body: id === 'spear' ? null : { lean: -0.12, aB0: -0.7, aB1: -0.3 } };
    if (id === 'spear') return { w: Math.PI - 0.25 };
    if (id === 'staff') return { w: 2.5 };
    if (p.crouch) return { w: fa + 0.7 };
    return { w: fa + 0.32 };
  }
  function poseRig(dt) {
    const p = P, { pose, ay } = playerPose(p), robe = p.garb.body === 'robe' && p.rollT <= 0 && p.onG && !p.crouch && !p.inWater;
    const k = 1 - Math.exp(-dt * (p.atk || p.rollT > 0 ? 34 : 18));
    const tg = { lean: pose.lean, aF0: pose.aF[0], aF1: pose.aF[1], aB0: pose.aB[0], aB1: pose.aB[1], lF0: pose.lF[0], lF1: pose.lF[1], lB0: pose.lB[0], lB1: pose.lB[1] };
    const sp = Math.abs(p.vx), moving = p.onG && sp > 20 && !p.atk && p.rollT <= 0 && !p.crouch && !p.mount && !p.ladder && !p.hang && !(p.inWater && !p.onG);
    if (moving) { const k = clamp(sp / 270, 0.35, 1.1);   // a walk swings little, a run swings wide and leans
      for (const key of ['lF0', 'lF1', 'lB0', 'lB1']) tg[key] *= lerp(0.55, 1.05, k); tg.aF0 *= lerp(0.5, 1.1, k); tg.aB0 *= lerp(0.5, 1.1, k); tg.aF1 = lerp(0.35, tg.aF1, k); tg.aB1 = lerp(0.3, tg.aB1, k);
      tg.lean = lerp(0.05, 0.34, clamp((sp - 120) / 160, 0, 1)); }
    tg.lean += FEEL.lean;
    const wa = weaponAngle(p, PS.aF1);
    if (wa.body) Object.assign(tg, wa.body);
    for (const key in tg) PS[key] = dt > 0 && !(wa.direct && wa.body && key in wa.body && wa.act) ? lerp(PS[key], tg[key], k) : tg[key];
    const ua = wa.ua ?? PS.aF0, fa = wa.fa ?? PS.aF1; SW.u = ua; SW.f = fa;
    PS.wpn = wa.direct || dt <= 0 ? wa.w : lerp(PS.wpn, wa.w, 1 - Math.exp(-dt * 22));
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
    const seat = p.mount && V3.horseSeat ? V3.horseSeat() : null;
    const fx0 = seat ? seat.x : pcx(), fy0 = seat ? seat.y + hipH * RS - 2 : ay;
    const sq = 1 - 0.12 * Math.sin(Math.min(1, FEEL.squash) * Math.PI / 2) + 0.07 * FEEL.stretch, wd = 1 + 0.08 * FEEL.squash - 0.04 * FEEL.stretch, flip = p.dead ? 1 : FEEL.turn < 1 ? Math.max(0.08, Math.abs(FEEL.turn)) : 1;
    RIG.position.set(fx0, -fy0, 0); RIG.scale.set(p.face * RS * wd * flip, RS * sq, 1);   // squash on landing, stretch on leaving, a quick flip on a turn RIG.rotation.z = p.dead ? p.face * Math.min(1, p.deadT * 2) * Math.PI / 2 : 0;
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
  function bodyAlpha(p) { let a = 1; if (p.inkT > 0) a = 0.3; else if (p.inv > 0 && !p.dead && Math.floor(p.inv * 16) % 2 === 0) a = 0; else if (p.unseenT > 0) a = 0.28; if (p.dead) a *= Math.max(0.2, 1 - p.deadT * 0.5); return a; }
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
    // the weather drifts from one kind to the next; each change eases in over a while
    WEATHER.t -= dt; if (WEATHER.t <= 0 && !WEATHER.forced) { WEATHER.kind = pickWeather(); WEATHER.t = rr(90, 240); }
    if (V3.rain && !WEATHER.forced) { WEATHER.forced = 'rain'; WEATHER.kind = 'rain'; }   // the old test switch
    { const K = WEATHER.kinds[WEATHER.kind], e = 1 - Math.exp(-dt * 0.35); for (const k of ['wind', 'rain', 'mist', 'cloud']) WEATHER[k] = lerp(WEATHER[k], K[k], e); }
    U.uWind.value = WEATHER.wind; SKYU.uCloud.value = WEATHER.cloud;
    const wz = windAt(pcx(), p.y + p.h / 2), wind = U.uWind.value + U.uGust.value * 1.4 + Math.sin(t * 0.4) * 0.08;
    ST.rain = WEATHER.rain; U.uRain.value = ST.rain;
    MIST_FRONT.position.set(camX + W / 2, -(camY + H * 0.8), 0); MIST_FRONT.material.uniforms.uA.value = WEATHER.mist * 0.55;
    if (ST.rain > 0.05) { const n = Math.floor(ST.rain * 500 * dt * Q.parts * 3); for (let i = 0; i < n; i++) FX.rain.add({ x: camX + rr(-100, W + 100), y: -(camY - 40), z: rr(-160, 160), vx: -wind * 140, vy: -900, r: Math.atan2(wind * 140, 900), w: 1.2, h: rr(22, 38), life: 1.4, c: [0.7, 0.75, 0.85], a: 0.45 }); }
    if (ST.rain > 0.85 && WEATHER.kind === 'storm') { ST.nextFlash -= dt; if (ST.nextFlash <= 0) { ST.flash = 1; ST.nextFlash = rr(8, 20); thunder(); } }
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
    // shrines: fire, lanterns, banners and the bell; chests open, pots break
    let nearFire = 0;
    SHRINE_M.forEach((o, i) => { const seen = visible({ x: o.x - 160, y: o.gy - 240, w: 320, h: 260 }); nearFire = Math.max(nearFire, 1 - clamp(Math.hypot(pcx() - o.x, (P.y + P.h) - o.gy) / 380, 0, 1));
      const cur = P.shrine === i; o.flame.scale.set(cur ? 1.15 : 0.8, (cur ? 1.15 : 0.8) * (1 - ST.rain * 0.2), 1); o.glow.material.uniforms.uEmit.value = 0.2 + 0.45 * (N1(t * 6 + i * 3) - 0.3);
      if (!seen || dt <= 0) return;
      for (const L of o.lanterns) { L.va += (-L.a * 10 - L.va * 1.5 + wind * Math.sin(t * 1.3 + L.x) * 1.2) * dt; L.a += L.va * dt; L.m.rotation.z = L.a * 0.3; }
      if (pressed.use && nearShrine() === i) o.bell.va += P.face * 2.4;
      o.bell.va += (-o.bell.a * 18 - o.bell.va * 1.2 + wind * 0.6 * Math.sin(t * 1.7 + i)) * dt; o.bell.a += o.bell.va * dt; o.bellM.rotation.z = o.bell.a * 0.35;
      for (const shc of o.sheets) shc.step(Math.min(dt, 1 / 30), wind * 1.3); });
    for (const o of CHEST_M) { const open = !!o.c.opened; o.a = lerp(o.a, open ? 1.1 : 0, dt > 0 ? 1 - Math.exp(-dt * 10) : 1); o.lidG.rotation.z = o.a; if (o.seal) { o.seal.visible = !open; o.seal.material.uniforms.uEmit.value = 0.6 + 0.3 * Math.sin(t * 2); } }
    for (const o of POT_M) o.m.visible = !!pots[o.i] && !pots[o.i].broken;
    // the lights: the nearest fires, the torch, lanterns and hot stone
    { const cand = [], cx = camX + W / 2, cy = camY + H / 2, add = (x, y, r, i, c) => cand.push({ x, y, r, i, c, d: Math.hypot(x - cx, y - cy) });
      SHRINE_M.forEach((o, i) => { const f = 0.85 + 0.15 * N1(t * 7 + i * 5); add(o.x, o.gy - 20, 210, 1.1 * f * (1 - ST.rain * 0.25), [1, 0.62, 0.3]); for (const L of o.lanterns) add(L.x, o.gy - 140, 70, 0.55, [1, 0.55, 0.3]); });
      if (P.torch.lit && !P.dead && J) add(J.hB.x, J.hB.y - 14, 200, 1.25 * (0.9 + 0.1 * N1(t * 11)), [1, 0.6, 0.28]);
      for (const sh of shots) if (sh.fire || sh.kind === 'ember') add(sh.x, sh.y, 110, 0.9, [1, 0.5, 0.2]);
      for (const sd of SOLIDS) if (sd.surf === 'hot') for (let x = sd.x + 60; x < sd.x + sd.w; x += 160) add(x, sd.y, 150, 0.8 * (0.85 + 0.15 * Math.sin(t * 2 + x)), [1, 0.3, 0.08]);
      cand.sort((a, b) => a.d - b.d);
      for (let i = 0; i < 8; i++) { const L = cand[i]; if (L && L.d < 900) { U.uL.value[i].set(L.x, -L.y, L.r, L.i); U.uLC.value[i].setRGB(...L.c); } else U.uL.value[i].w = 0; } }
    soundTick(nearFire);
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
  function render3(sx, sy, dt, ink) {
    resize(); if (!SCREEN.w) return;
    INK_M.visible = !!ink; if (ink) { if (INK_TEX.image !== ink) { INK_TEX.image = ink; INK_TEX.dispose(); } INK_TEX.needsUpdate = true; INK_M.position.set(camX + W / 2 + sx, -(camY + H / 2 + sy), 0); }
    U.uTime.value = clock; U.uPlayer.value.set(pcx(), -(P.y + P.h), 0);
    const sk = applySky();
    ST.color = lerp(ST.color, colorK, 1 - Math.exp(-Math.max(dt, 0.016) * 4)); POST.final.uniforms.uColor.value = colorK >= 1 ? 1 : ST.color;
    POST.final.uniforms.uHurt.value = P.hitT > 0 ? 0.6 : Math.max(0, POST.final.uniforms.uHurt.value - dt * 2);
    const dtA = hitstop > 0 ? 0 : dt; feel(dtA);   // bodies freeze for the heartbeat when a blow lands
    poseHorse(dtA, U.uWind.value + U.uGust.value); let j = poseRig(dtA); dressRig(P);
    const in3D = pose3D(dtA); if (in3D) j = J;
    const alpha = bodyAlpha(P); RIG.visible = alpha > 0.01 && !in3D; for (const m of RIGM) m.uniforms.uOpacity.value = alpha; for (const m of RIB_MATS) m.uniforms.uOpacity.value = alpha;
    for (const m of RIGM) if (m.uniforms.uFlip) m.uniforms.uFlip.value = P.face;
    for (const r of Object.values(RIBS)) if (V3._hide || (in3D && r !== RIBS.scarf)) r.mesh.visible = false;
    for (const k of ['thB', 'shB', 'footB']) if (P.mount) PART[k].visible = false;   // the far leg is behind the horse
    step(dt);
    // the shadow falls away from the light, longer when it is low
    const g = groundUnder(pcx(), P.y + P.h);
    if (g !== null) { const lift = g - (P.y + P.h), lowness = 1 - clamp(sk.srcAlt / 60, 0, 1); SHADOW.visible = true; SHADOW.position.set(pcx() - U.uLightDir.value.x * (3 + lowness * 20), -g + 1, 0); SHADOW.scale.set(1 + lowness * 1.8, 1, 1); SHADOW.material.opacity = sk.strength * 0.6 * clamp(1 - lift / 160, 0, 1) * alpha; } else SHADOW.visible = false;
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
  V3.frame = (sx = 0, sy = 0, ink = null) => {
    if (!P) return; if (!J) poseRig(0);
    const dt = lastClock === null ? 1 / 60 : clamp(clock - lastClock, 0, 0.05); lastClock = clock;
    try { render3(sx, sy, dt, ink); frames++; V3.stats = { frames, leaves: FX.leavesB.list.length + FX.leavesF.list.length, embers: FX.embers.list.length, flies: FX.flies.list.length, dust: FX.dust.list.length, rain: FX.rain.list.length, w: SCREEN.w, h: SCREEN.h }; }
    catch (e) { V3.failed = true; V3.why = e.message; console.error(e); lookShow(); }
  };
  V3.hideRibs = v => { V3._hide = v; }; V3.joints = () => J; V3.cloth = () => ({ scarf: SCARF.p.map(q => [q.x, q.y]), tailF: TAILF.p.map(q => [q.x, q.y]), pos: Array.from(RIBS.scarf.pos.slice(0, 12)), mins: Object.fromEntries(Object.entries(RIBS).map(([k, r]) => [k, Math.min(...Array.from(r.pos).filter((v, i) => i % 3 === 0))])), trail: Math.min(...Array.from(TRAIL.mesh.geometry.attributes.position.array).filter((v, i) => i % 3 === 0)) });
  V3.pose = () => ({ ...PS });
  V3.renderer = renderer; V3.lights = () => U.uL.value.filter(v => v.w > 0).length; V3.ripple = ripple; V3.setDpr = d => { Q.dpr = d; SCREEN.w = 0; };
}
