/* ================= flow, overlays, loop ================= */
function resetFx() {
  particles = []; ghosts = []; bullets = []; shots = []; zones = []; waves = []; floaters = []; rings = []; spears = []; slashes = [];
  shake = 0; hitstop = 0; slowT = 0; cast = null; ultFx = {}; clearPending = -1;
}
function startFloor(n) {
  curFloor = n; computeStats(n);
  world = buildFloor(n); bosses = []; scene = world.kind === 'climb' ? 'climb' : 'level';
  player = makePlayer(80, GROUND - 52);
  if (scene === 'climb') { player.x = 460; }
  cp = { scene, x: player.x, y: GROUND, meter: 0 };
  floorTime = 0; floorDeaths = 0; introT = 0;
  resetFx(); cam.x = 0; cam.y = 0;
  if (scene === 'climb') cam.y = clamp(player.y - H * 0.55, world.top, 0);
}
function enterArena(retry) {
  const meter = retry ? (cp.meter || 0) : (player ? player.meter : 0);
  world = buildArena(curFloor); scene = 'arena';
  introMax = retry ? 1.3 : 2.4; introT = introMax;
  bosses = BOSS_DEFS[curFloor]();
  for (const b of bosses) b.t = introMax;
  player = makePlayer(120, GROUND - 52); player.meter = meter;
  cp = { scene: 'arena', meter };
  resetFx(); cam.x = 0; cam.y = 0;
}
function respawn() {
  if (cp.scene === 'arena') { enterArena(true); return; }
  const keepMeter = 0;
  player = makePlayer(cp.x, cp.y - 52); player.meter = keepMeter;
  for (const e of world.enemies) {
    if (e.type === 'clone') e.alive = false;
    else if (e.alive) resetEnemy(e);
  }
  for (const f of world.fallers) { f.y = f.y0; f.state = 'wait'; }
  if (world.ink) { world.ink.y = cp.y + 420; world.ink.on = false; world.ink.wait = 0; world.ink.startY = cp.y; world.ink.speed = 30; }
  resetFx();
  if (scene === 'climb') cam.y = clamp(player.y - H * 0.55, world.top, 0);
  else cam.x = clamp(cp.x - W * 0.42, 0, world.w - W);
}

/* ---------- step ---------- */
function step(dt) {
  if (fadeDir !== 0) { updateFade(dt); return true; }
  if (cast) { cast.t += dt; for (const q of particles) { q.life -= dt * 0.3; } if (cast.t >= cast.dur) finishCast(); return true; }
  if (hitstop > 0) { hitstop -= dt; return false; }
  if (slowT > 0) { slowT -= dt; dt *= 0.35; }
  if (!bosses.length || bosses.some(b => b.state !== 'dead')) { runTime += dt; floorTime += dt; }
  if (introT > 0) introT -= dt;

  rebuildDyn();
  updateTraps(dt);
  if (!ultFx.cuts) updatePlayer(dt);
  if (cast) return true;
  updateUltFx(dt);
  for (const e of world.enemies) if (e.alive) updateEnemy(e, dt);
  world.enemies = world.enemies.filter(e => e.alive || e.type !== 'clone');
  updateBosses(dt);
  updateBullets(dt);
  updateShots(dt);
  updateZones(dt);
  updateWaves(dt);

  for (const h of world.pickups) {
    h.t += dt; h.vy = Math.min(h.vy + GRAV * 0.7 * dt, 700); moveBody(h, dt);
    if (overlap(h, player) && !player.dead) { h.taken = true; if (player.hp < player.maxHp) { player.hp++; floater(h.x + 8, h.y - 8, '+1'); } else { gainMeter(15); floater(h.x + 8, h.y - 8, '+INK'); } SFX.pickup(); }
  }
  world.pickups = world.pickups.filter(h => !h.taken && h.y < world.bottom);

  for (const f of world.flags) {
    if (f.active || player.dead) continue;
    const near = world.kind === 'climb' ? (player.y + player.h <= f.y + 4 && Math.abs(pcx() - f.x) < 160) : (player.x > f.x - 10 && player.y > f.y - 300);
    if (near) {
      f.active = true; cp = { scene, x: f.x - 11, y: f.y, meter: 0 }; SFX.flag(); floater(f.x + 20, f.y - 120, 'CHECKPOINT');
      if (player.hp < player.maxHp) { player.hp = player.maxHp; floater(f.x + 20, f.y - 140, 'HEARTS FULL'); }
    }
  }
  if (world.door && !player.dead && overlap(player, world.door) && fadeDir === 0) { SFX.door(); startFade(() => enterArena(false)); }

  for (const q of particles) {
    q.life -= dt; if (!q.nograv) q.vy += GRAV * 0.55 * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (!q.nograv && q.vy > 0 && q.y > GROUND - 2 && q.y < GROUND + 8 && scene !== 'climb') { q.y = GROUND - 1; q.vy = 0; q.vx *= 0.8; }
  }
  particles = particles.filter(q => q.life > 0);
  for (const g of ghosts) g.life -= dt; ghosts = ghosts.filter(g => g.life > 0);
  for (const f of floaters) { f.t -= dt; f.y -= 40 * dt; } floaters = floaters.filter(f => f.t > 0);
  for (const r of rings) r.t -= dt; rings = rings.filter(r => r.t > 0);

  if (scene === 'climb') {
    cam.x = 0;
    cam.y += (player.y - H * 0.55 - cam.y) * Math.min(1, dt * 5);
    cam.y = clamp(cam.y, world.top, 0);
  } else if (scene === 'level') {
    const tx = pcx() - W * 0.42 + player.face * 40;
    cam.x += (tx - cam.x) * Math.min(1, dt * 6); cam.x = clamp(cam.x, 0, world.w - W); cam.y = 0;
  } else { cam.x = 0; cam.y = 0; }
  shake = Math.max(0, shake * Math.pow(0.004, dt) - dt * 6);

  if (clearPending > 0) { clearPending -= dt; if (clearPending <= 0 && mode === 'play') showClear(); }
  if (player.dead && player.deadT > 1.1 && mode === 'play') showDeath();
  return true;
}
function startFade(cb) { fadeDir = 1; fadeCb = cb; }
function updateFade(dt) {
  fade += fadeDir * dt * 3.2;
  if (fadeDir > 0 && fade >= 1) { fade = 1; fadeDir = -1; if (fadeCb) { const c = fadeCb; fadeCb = null; c(); } }
  else if (fadeDir < 0 && fade <= 0) { fade = 0; fadeDir = 0; }
}

/* ---------- overlays ---------- */
const ovs = { menu: $('ovMenu'), pause: $('ovPause'), dead: $('ovDead'), clear: $('ovClear'), win: $('ovWin') };
function showOnly(name) {
  for (const k in ovs) ovs[k].hidden = k !== name;
  $('btnPause').hidden = name !== null;
  if (name) { ovs[name].scrollTop = 0; const b = ovs[name].querySelector('.primary, .card'); if (b && !isTouch) setTimeout(() => b.focus({ preventScroll: true }), 30); }
}
function play() { mode = 'play'; clearInput(); showOnly(null); }
function pause() { mode = 'paused'; clearInput(); showOnly('pause'); }
function resume() { play(); }
function showDeath() {
  mode = 'dead'; clearInput();
  $('deadMsg').textContent = scene === 'arena' ? `${BOSS_INFO[curFloor].name} gets full health back too. Watch for red.` : world.ink ? 'The ink caught you. Back to the last checkpoint.' : 'Back to the last checkpoint.';
  showOnly('dead');
}
function showClear() {
  const n = curFloor;
  if (n >= 10) { showWin(); return; }
  mode = 'clear'; clearInput(); SFX.win();
  $('clearTag').textContent = BOSS_INFO[n].name + (n === 3 ? ' are down' : ' is down');
  $('clearTitle').textContent = `Floor ${n} cleared`;
  $('clearStats').textContent = `Floor time ${fmtTime(floorTime)} · Deaths ${floorDeaths} · Total ${fmtTime(runTime)}`;
  const learn = Object.values(ULTS).find(u => u.learn === n);
  $('learned').hidden = !learn;
  if (learn) { $('learnedName').textContent = learn.name; $('learnedChant').textContent = '“' + learn.chant + '”'; $('learnedHow').textContent = learn.how; }
  const c = upgradeCounts(n + 1);
  const avail = Object.keys(UPGRADES).filter(id => (c[id] || 0) < UPGRADES[id].max && id !== save.picks[n]);
  const two = shuffle(avail).slice(0, 2);
  const cards = $('cards'); cards.textContent = '';
  for (const id of two) {
    const u = UPGRADES[id], btn = document.createElement('button');
    btn.className = 'card'; btn.type = 'button';
    const b = document.createElement('b'); b.textContent = u.name + ((c[id] || 0) ? ` (${(c[id] || 0) + 1})` : '');
    const s = document.createElement('span'); s.textContent = u.desc;
    btn.append(b, s);
    btn.addEventListener('click', () => pickUpgrade(n, id));
    cards.append(btn);
  }
  save.reached = Math.max(save.reached, n + 1); save.cur = n + 1; writeSave();
  showOnly('clear');
}
function pickUpgrade(n, id) {
  save.picks[n] = id; save.reached = Math.max(save.reached, n + 1); save.cur = n + 1; writeSave();
  startFloor(n + 1); play();
}
function showWin() {
  mode = 'win'; clearInput(); SFX.win();
  save.reached = 10; save.cur = 10;
  if (!save.best || runTime < save.best) save.best = runTime;
  writeSave();
  $('winStats').textContent = `Total time ${fmtTime(runTime)} · Deaths ${deaths}` + (save.best ? ` · Best ${fmtTime(save.best)}` : '');
  showOnly('win');
}
let newArmed = 0;
function buildMenu() {
  const has = save.reached > 1 || Object.keys(save.picks).length > 0;
  const cont = $('btnContinue'), nw = $('btnNew');
  cont.textContent = has ? `Continue · Floor ${save.cur}` : 'Start climbing';
  nw.hidden = !has; nw.textContent = 'New game'; newArmed = 0;
  $('floorsWrap').hidden = !has;
  const fl = $('floors'); fl.textContent = '';
  for (let i = 1; i <= 10; i++) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = String(i);
    b.disabled = i > save.reached; b.setAttribute('aria-label', i > save.reached ? `Floor ${i}, locked` : `Play floor ${i}`);
    b.addEventListener('click', () => { unlockAudio(); runTime = 0; deaths = 0; save.cur = i; writeSave(); startFloor(i); play(); });
    fl.append(b);
  }
}
function toMenu() {
  mode = 'menu'; clearInput();
  try { window.speechSynthesis && speechSynthesis.cancel(); } catch (_) {}
  startFloor(save.cur); buildMenu(); showOnly('menu');
}
$('btnContinue').addEventListener('click', () => { unlockAudio(); runTime = 0; deaths = 0; startFloor(save.cur); play(); });
$('btnNew').addEventListener('click', () => {
  if (!newArmed) { newArmed = 1; $('btnNew').textContent = 'Tap again to erase progress'; setTimeout(() => { if (newArmed) { newArmed = 0; $('btnNew').textContent = 'New game'; } }, 3500); return; }
  newArmed = 0; save = freshSave(); writeSave(); runTime = 0; deaths = 0; startFloor(1); play();
});
$('btnResume').addEventListener('click', () => resume());
$('btnRestart').addEventListener('click', () => { startFloor(curFloor); play(); });
$('btnRetry').addEventListener('click', () => { respawn(); play(); });
$('btnMenu1').addEventListener('click', toMenu);
$('btnMenu2').addEventListener('click', toMenu);
$('btnWinMenu').addEventListener('click', toMenu);
$('btnPause').addEventListener('click', () => { if (mode === 'play') pause(); });

/* ---------- loop ---------- */
let last = performance.now();
function loop(now) {
  const raw = Math.min(0.033, (now - last) / 1000); last = now; clock += raw;
  let ran = true;
  if (mode === 'play') ran = step(raw);
  try { render(); } catch (err) { console.error(err); }
  if (ran) for (const k in pressed) pressed[k] = false;
  requestAnimationFrame(loop);
}

startFloor(save.cur);
buildMenu();
fit();
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('20px Kalam'), document.fonts.load('20px "Rubik Mono One"')]).catch(() => {});
requestAnimationFrame(loop);
