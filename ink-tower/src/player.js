/* ================= player, upgrades, ultimates ================= */
const ATK = [null,
  { dur: 0.2, a0: 0.035, a1: 0.12, dmg: 1, reach: 46, yo: 10, hh: 24, kb: 150, stun: 0.28 },
  { dur: 0.2, a0: 0.035, a1: 0.12, dmg: 1, reach: 46, yo: 10, hh: 24, kb: 170, stun: 0.28 },
  { dur: 0.32, a0: 0.08, a1: 0.19, dmg: 2, reach: 56, yo: 20, hh: 30, kb: 430, stun: 0.55, heavy: true }];

const ULTS = {
  storm: { name: 'INK STORM', chant: 'Black rain, hear me. Fall on all who stand.', learn: 0, how: `Fill the ink meter, then press ${KEY.ult}.` },
  last: { name: 'LAST STAND', chant: 'Not here. Not yet. Not like this.', learn: 2, how: 'Fires by itself when you drop to 1 heart. Once per life.' },
  cuts: { name: 'THOUSAND CUTS', chant: 'One breath. One blade. One thousand cuts.', learn: 4, how: `Land a 15-hit combo without getting hit, then press ${KEY.ult}.` },
  page: { name: 'FINAL PAGE', chant: 'Every story ends. I write your last line.', learn: 7, how: `When a boss is under a quarter health and your meter is full, press ${KEY.ult}.` },
};
const knows = k => ULTS[k].learn < curFloor;
const CUTS_NEED = 15;

const UPGRADES = {
  heart: { name: '+1 Heart', desc: 'One more heart, and it starts full.', max: 3 },
  heavy: { name: 'Heavy Hands', desc: 'All your hits do 30% more damage.', max: 3 },
  triple: { name: 'Triple Shot', desc: 'Your shot fires three ink bullets in a fan.', max: 1 },
  quickdash: { name: 'Quick Dash', desc: 'Dash comes back almost twice as fast.', max: 1 },
  vampire: { name: 'Ink Drinker', desc: 'Every 20 hits you land heals 1 heart.', max: 1 },
  well: { name: 'Deep Well', desc: 'Your ink meter fills 40% faster.', max: 2 },
  iron: { name: 'Iron Skin', desc: 'You stay safe 50% longer after getting hit.', max: 1 },
  airstep: { name: 'Air Step', desc: 'One more jump in the air. Triple jump.', max: 1 },
  kickwave: { name: 'Kick Wave', desc: 'Your third combo hit sends an ink wave along the floor.', max: 1 },
  shield: { name: 'Ink Shield', desc: 'Blocks one hit. Comes back after 20 seconds.', max: 1 },
};
function upgradeCounts(n) { const c = {}; for (const f in save.picks) if (+f < n) { const id = save.picks[f]; c[id] = (c[id] || 0) + 1; } return c; }
function computeStats(n) {
  const c = upgradeCounts(n);
  stats = { maxHp: 5 + (c.heart || 0), dmgMul: 1 + 0.3 * (c.heavy || 0), triple: !!c.triple, dashCd: c.quickdash ? 0.27 : 0.5, vampire: !!c.vampire,
    meterMul: 1 + 0.4 * (c.well || 0), invMul: c.iron ? 1.5 : 1, airJumps: c.airstep ? 2 : 1, kickwave: !!c.kickwave, shield: !!c.shield, counts: c };
}

function makePlayer(x, y) {
  const p = { x, y, w: 22, h: 52, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, airJumps: stats.airJumps, airDash: true, dashT: 0, dashCd: 0, ghostT: 0,
    atk: { step: 0, t: 0, queued: false, hit: new Set(), waved: false }, lastStep: 0, since: 9, shootCd: 0, shootPose: 0, hp: stats.maxHp, maxHp: stats.maxHp, inv: 0, hurtT: 0,
    dead: false, deadT: 0, runPhase: 0, dropT: 0, neck: null, scarf: [], safe: { x, y }, meter: 0, combo: 0, comboT: 0, hitCount: 0,
    lastStandUsed: false, lsT: 0, shieldT: stats.shield ? 0 : -1, slowT: 0, ride: null, standOn: null };
  for (let i = 0; i < 5; i++) p.scarf.push({ x: x + 11, y: y + 15 });
  return p;
}
function gainMeter(v) { player.meter = Math.min(100, player.meter + v * stats.meterMul); }
function registerHit(meterGain) {
  const p = player;
  p.combo++; p.comboT = 2.5; gainMeter(meterGain);
  if (knows('cuts') && p.combo === CUTS_NEED) { floater(p.x + p.w / 2, p.y - 24, 'THOUSAND CUTS READY'); SFX.flag(); }
  if (stats.vampire) { p.hitCount++; if (p.hitCount % 20 === 0 && p.hp < p.maxHp) { p.hp++; floater(p.x + p.w / 2, p.y - 10, '+1'); SFX.pickup(); } }
}
function startAttack(p, step) {
  p.atk.step = step; p.atk.t = 0; p.atk.queued = false; p.atk.hit = new Set(); p.atk.waved = false; SFX.swing();
  if (p.onGround) p.vx = p.face * (step === 3 ? 230 : 150);
}

/* ---------- targeting & damage ---------- */
function targets() {
  const t = [];
  for (const e of world.enemies) if (e.alive) t.push(e);
  for (const b of bosses) if (b.state !== 'dead' && b.state !== 'intro' && !b.hidden) t.push(b);
  return t;
}
const hurtbox = o => (o.def && o.def.hurt) ? o.def.hurt(o) : o;
const onScreen = h => h.x + h.w > cam.x && h.x < cam.x + W && h.y + h.h > cam.y && h.y < cam.y + H;
function dealDamage(o, dmg, dir, opts) {
  dmg *= stats.dmgMul * (player.lsT > 0 ? 2 : 1);
  const ok = o.def ? damageBoss(o, dmg, dir, opts) : hitEnemy(o, dmg, dir, opts);
  if (ok && opts.src !== 'ult') registerHit(opts.src === 'shot' ? 2 : 5);
  return ok;
}
function doHits(p, A) {
  const box = { x: p.face > 0 ? p.x + p.w - 4 : p.x + 4 - A.reach, y: p.y + A.yo, w: A.reach, h: A.hh };
  for (const t of targets()) {
    if (p.atk.hit.has(t)) continue;
    const hb = hurtbox(t);
    if (!hb || !overlap(box, hb)) continue;
    p.atk.hit.add(t);
    const cx = p.face > 0 ? Math.max(box.x + 10, hb.x) : Math.min(box.x + box.w - 10, hb.x + hb.w);
    const ok = dealDamage(t, A.dmg, p.face, { kb: A.kb, stun: A.stun, heavy: A.heavy, src: 'melee', fromX: p.x + p.w / 2 });
    if (ok) {
      burst(cx, box.y + box.h / 2, A.heavy ? 14 : 7, INK, p.face, A.heavy ? 320 : 220);
      hitstop = Math.max(hitstop, A.heavy ? 0.09 : 0.05); shake = Math.max(shake, A.heavy ? 7 : 3);
      A.heavy ? SFX.heavy() : SFX.hit();
    } else hitstop = Math.max(hitstop, 0.04);
  }
  for (const s of shots) if (s.destructible && s.alive && circleRect(s.x, s.y, s.r, box)) { s.alive = false; burst(s.x, s.y, 8, INK, p.face, 200); gainMeter(2); SFX.hit(); }
  if (A.heavy && stats.kickwave && !p.atk.waved && p.onGround) {
    p.atk.waved = true;
    bullets.push({ kind: 'wave', x: p.face > 0 ? p.x + p.w : p.x - 26, y: p.y + p.h - 26, w: 26, h: 26, vx: p.face * 540, vy: 0, life: 0.7, dmg: 2, pierce: true, hit: new Set() });
  }
}
function aimDir(p) {
  const sx = p.x + p.w / 2 + p.face * 14, sy = p.y + 18;
  let best = null, bd = 1e9;
  for (const t of targets()) {
    if (t.type === 'dummy') continue;
    const h = hurtbox(t); if (!h) continue;
    const dx = h.x + h.w / 2 - sx, dy = h.y + h.h / 2 - sy;
    if (Math.sign(dx) !== p.face && Math.abs(dx) > 4) continue;
    const d = Math.hypot(dx, dy); if (d > 580) continue;
    if (Math.atan2(Math.abs(dy), Math.abs(dx)) > 1.05) continue;
    if (d < bd) { bd = d; best = { dx, dy, d }; }
  }
  return best ? { x: best.dx / best.d, y: best.dy / best.d } : { x: p.face, y: 0 };
}
function fireShot(p) {
  p.shootCd = 0.38; p.shootPose = 0.16; SFX.shoot();
  const d = aimDir(p), base = Math.atan2(d.y, d.x);
  const sx = p.x + p.w / 2 + p.face * 16, sy = p.y + 18;
  const angs = stats.triple ? [-0.16, 0, 0.16] : [0];
  for (const a of angs) bullets.push({ kind: 'shot', x: sx - 7, y: sy - 2, w: 14, h: 4, vx: Math.cos(base + a) * 780, vy: Math.sin(base + a) * 780, life: 0.8, dmg: 1 });
  burst(sx, sy, 3, INK, p.face, 120);
}
function updateBullets(dt) {
  for (const b of bullets) {
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.kind === 'wave') {
      if (!pointSolid(b.x + b.w / 2, b.y + b.h + 4) || wallSolid(b.x + (b.vx > 0 ? b.w : 0), b.y + b.h / 2)) b.life = 0;
      if (Math.random() < dt * 40) dust(b.x + b.w / 2, b.y + b.h, 1);
    } else if (wallSolid(b.x + b.w / 2, b.y + b.h / 2) || world.dynSolids.some(s => overlap(b, s))) { b.life = 0; burst(b.x + b.w / 2, b.y, 4, INK, -Math.sign(b.vx), 120); continue; }
    if (b.life <= 0) continue;
    for (const s of shots) if (s.destructible && s.alive && circleRect(s.x, s.y, s.r, b)) { s.alive = false; b.life = b.pierce ? b.life : 0; burst(s.x, s.y, 8, INK, 0, 200); gainMeter(2); }
    for (const t of targets()) {
      const hb = hurtbox(t); if (!hb || !overlap(b, hb)) continue;
      if (b.pierce) { if (b.hit.has(t)) continue; b.hit.add(t); }
      dealDamage(t, b.dmg, Math.sign(b.vx) || 1, { kb: 90, stun: 0.16, src: 'shot', fromX: b.x + b.w / 2 - Math.sign(b.vx) * 30 });
      burst(b.x + b.w / 2, b.y, 5, INK, Math.sign(b.vx), 200); SFX.hit();
      if (!b.pierce) { b.life = 0; break; }
    }
  }
  bullets = bullets.filter(b => b.life > 0);
}

/* ---------- getting hurt ---------- */
function hurtPlayer(dmg, dir) {
  const p = player;
  if (p.dead || p.inv > 0 || p.dashT > 0 || p.lsT > 0 || cast || ultFx.cuts) return false;
  if (p.shieldT === 0) {
    p.shieldT = 20; p.inv = 0.6; floater(p.x + p.w / 2, p.y - 12, 'SHIELD'); SFX.block();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; particles.push({ x: p.x + p.w / 2 + Math.cos(a) * 30, y: p.y + p.h / 2 + Math.sin(a) * 34, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.35, r: 2, color: INK, nograv: true }); }
    return true;
  }
  p.inv = 1.1 * stats.invMul; p.hurtT = 0.28; p.vx = dir * 320; p.vy = -330; p.atk.step = 0;
  p.combo = 0; gainMeter(8);
  shake = Math.max(shake, 9); hitstop = 0.1; SFX.hurt();
  burst(p.x + p.w / 2, p.y + p.h * 0.4, 14, RED, dir);
  loseHearts(dmg);
  return true;
}
function loseHearts(dmg) {
  const p = player;
  p.hp -= dmg;
  if (p.hp <= 1 && knows('last') && !p.lastStandUsed) { p.hp = Math.max(p.hp, 1); p.lastStandUsed = true; startCast('last'); return; }
  if (p.hp <= 0) { p.hp = 0; killPlayer(); }
}
function killPlayer() { const p = player; if (p.dead) return; p.dead = true; p.deadT = 0; deaths++; floorDeaths++; }
function inkDeath() { const p = player; burst(p.x + p.w / 2, p.y + p.h, 30, INK, 0, 300); SFX.kill(); p.hp = 0; killPlayer(); }

/* ---------- player update ---------- */
function updatePlayer(dt) {
  const p = player;
  p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.dashCd = Math.max(0, p.dashCd - dt);
  p.shootCd = Math.max(0, p.shootCd - dt); p.shootPose = Math.max(0, p.shootPose - dt); p.dropT = Math.max(0, p.dropT - dt); p.since += dt;
  p.slowT = Math.max(0, p.slowT - dt); p.lsT = Math.max(0, p.lsT - dt);
  if (p.shieldT > 0) { p.shieldT = Math.max(0, p.shieldT - dt); if (p.shieldT === 0) floater(p.x + p.w / 2, p.y - 12, 'SHIELD READY'); }
  if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
  if (p.lsT > 0 && Math.random() < dt * 30) particles.push({ x: p.x + rnd(0, p.w), y: p.y + rnd(0, p.h), vx: rnd(-30, 30), vy: -rnd(60, 160), life: 0.5, r: rnd(1.5, 3), color: INK, nograv: true });

  if (p.dead) { p.deadT += dt; p.vx *= Math.pow(0.05, dt); p.vy = Math.min(p.vy + GRAV * dt, 1100); moveBody(p, dt); updateScarf(p, dt); return; }

  const slow = p.slowT > 0 ? 0.45 : 1;
  const mx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (p.dashT > 0) {
    p.dashT -= dt; p.vx = p.face * 640; p.vy = 0;
    p.ghostT -= dt; if (p.ghostT <= 0) { p.ghostT = 0.028; ghosts.push({ x: p.x + p.w / 2, y: p.y + p.h, face: p.face, life: 0.22 }); }
    moveBody(p, dt);
    if (p.dashT <= 0) p.vx = p.face * 260;
    updateScarf(p, dt); return;
  }

  if (pressed.jump) p.jumpBuf = 0.13; else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (p.onGround) { p.coyote = 0.1; p.airJumps = stats.airJumps; p.airDash = true; } else p.coyote = Math.max(0, p.coyote - dt);
  const ctrl = p.hurtT <= 0;

  if (ctrl && p.jumpBuf > 0) {
    if (held.down && p.onGround && onOneway(p)) { p.dropT = 0.25; p.jumpBuf = 0; p.y += 2; }
    else if (p.coyote > 0) { p.vy = -650 * (slow < 1 ? 0.82 : 1); p.coyote = 0; p.jumpBuf = 0; SFX.jump(); dust(p.x + p.w / 2, p.y + p.h, 6); }
    else if (p.airJumps > 0) {
      p.vy = -590 * (slow < 1 ? 0.82 : 1); p.airJumps--; p.jumpBuf = 0; SFX.djump();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; particles.push({ x: p.x + p.w / 2, y: p.y + p.h, vx: Math.cos(a) * 140, vy: Math.sin(a) * 40, life: 0.25, r: 1.6, color: PENCIL, nograv: true }); }
    }
  }
  if (p.vy < 0 && !held.jump) p.vy += GRAV * 1.3 * dt;

  let target = ctrl ? mx * 275 * slow : p.vx;
  if (p.atk.step && p.onGround) target *= 0.25;
  if (ctrl) p.vx += (target - p.vx) * Math.min(1, dt * (p.onGround ? 16 : 9)); else p.vx *= Math.pow(0.2, dt);
  if (ctrl && mx && !p.atk.step) p.face = mx;

  if (ctrl && pressed.ult) tryUlt();
  if (cast) return;
  if (ctrl && pressed.dash && p.dashCd <= 0 && (p.onGround || p.airDash)) {
    if (mx) p.face = mx;
    p.dashT = 0.17; p.dashCd = stats.dashCd; if (!p.onGround) p.airDash = false; p.atk.step = 0; p.ghostT = 0; p.slowT = 0; SFX.dash();
  } else if (ctrl && pressed.attack) {
    if (p.atk.step) { if (p.atk.step < 3) p.atk.queued = true; }
    else startAttack(p, (p.since < 0.32 && p.lastStep > 0 && p.lastStep < 3) ? p.lastStep + 1 : 1);
  }
  if (ctrl && pressed.shoot && p.shootCd <= 0 && !p.atk.step && p.dashT <= 0) fireShot(p);

  if (p.atk.step) {
    const A = ATK[p.atk.step]; p.atk.t += dt;
    if (p.atk.t >= A.a0 && p.atk.t <= A.a1) doHits(p, A);
    if (p.atk.t >= A.dur) { const s = p.atk.step; p.lastStep = s; p.since = 0; if (p.atk.queued && s < 3) startAttack(p, s + 1); else p.atk.step = 0; }
  }

  p.vy = Math.min(p.vy + GRAV * dt, 1100);
  const wasG = p.onGround, vyB = p.vy;
  moveBody(p, dt);
  if (!wasG && p.onGround && vyB > 520) dust(p.x + p.w / 2, p.y + p.h, 7);
  if (p.onGround && Math.abs(p.vx) > 40) { p.runPhase += dt * Math.abs(p.vx) * 0.045; if (Math.random() < dt * 6) dust(p.x + p.w / 2 - p.face * 6, p.y + p.h, 1); }
  if (p.onGround && p.standOn && !p.ride && (world.solids.includes(p.standOn) || world.oneways.includes(p.standOn)) && !world.spikes.some(s => p.x + p.w > s.x - 30 && p.x < s.x + s.w + 30 && Math.abs(s.y - (p.y + p.h)) < 4)) p.safe = { x: p.x, y: p.y };

  if (p.y > world.bottom && !world.ink) {
    shake = 8; SFX.hurt(); floater(p.safe.x + 11, p.safe.y - 20, '-1');
    p.x = p.safe.x; p.y = p.safe.y - 4; p.vx = 0; p.vy = 0; p.inv = 1.2;
    loseHearts(1);
  }
  updateScarf(p, dt);
}
function updateScarf(p, dt) {
  const root = p.neck || { x: p.x + p.w / 2, y: p.y + 15 };
  const pts = p.scarf; pts[0].x = root.x; pts[0].y = root.y;
  const k = 1 - Math.pow(0.0004, dt);
  for (let i = 1; i < pts.length; i++) {
    const tx = pts[i - 1].x - p.face * 5.2 - p.vx * 0.006;
    const ty = pts[i - 1].y + 2.6 + Math.sin(clock * 14 + i * 0.9) * (0.6 + Math.min(1.6, Math.abs(p.vx) / 200)) - Math.min(0, p.vy) * 0.002;
    pts[i].x += (tx - pts[i].x) * k; pts[i].y += (ty - pts[i].y) * k;
    const ddx = pts[i].x - pts[i - 1].x, ddy = pts[i].y - pts[i - 1].y, d = Math.hypot(ddx, ddy), seg = 6;
    if (d > seg) { pts[i].x = pts[i - 1].x + ddx / d * seg; pts[i].y = pts[i - 1].y + ddy / d * seg; }
  }
}

/* ---------- ultimates ---------- */
function readyUlt() {
  const p = player; if (!p || p.dead) return null;
  if (knows('page') && p.meter >= 100 && bosses.some(b => b.state !== 'dead' && b.state !== 'intro' && b.hp <= b.maxHp * 0.25)) return 'page';
  if (knows('cuts') && p.combo >= CUTS_NEED) return 'cuts';
  if (p.meter >= 100) return 'storm';
  return null;
}
function tryUlt() {
  if (cast || ultFx.cuts || ultFx.storm || ultFx.page) return;
  const k = readyUlt();
  if (!k) { floater(player.x + player.w / 2, player.y - 14, player.meter < 100 ? 'INK ' + Math.floor(player.meter) + '%' : 'NOT READY', PENCIL); return; }
  startCast(k);
}
function startCast(k) {
  const u = ULTS[k], p = player;
  cast = { k, t: 0, dur: 0.35 + u.chant.length * 0.03 + 0.85 };
  p.atk.step = 0; p.dashT = 0; p.vx = 0;
  if (k === 'storm' || k === 'page') p.meter = 0;
  if (k === 'cuts') p.combo = 0;
  SFX.cast(); speak(u.chant + ' ' + u.name.toLowerCase());
}
function finishCast() {
  const k = cast.k, p = player; cast = null; SFX.ult(); shake = Math.max(shake, 12);
  p.inv = Math.max(p.inv, 0.6);
  if (k === 'storm') ultFx.storm = { t: 1.8, tick: 0 };
  else if (k === 'cuts') startCuts();
  else if (k === 'last') { p.hp = Math.max(p.hp, 2); p.lsT = 6; p.inv = 0; floater(p.x + p.w / 2, p.y - 20, 'DOUBLE DAMAGE'); }
  else if (k === 'page') ultFx.page = { t: 0, hit: false };
  for (let i = 0; i < 40; i++) { const a = rnd(0, Math.PI * 2), s = rnd(200, 520); particles.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.7), r: rnd(1.5, 4), color: INK, nograv: true }); }
}
function startCuts() {
  const p = player;
  const list = targets().filter(t => t.type !== 'dummy' && onScreen(hurtbox(t)))
    .sort((a, b) => Math.abs(hurtbox(a).x - p.x) - Math.abs(hurtbox(b).x - p.x)).slice(0, 10);
  ultFx.cuts = { list, i: 0, t: 0, home: { x: p.x, y: p.y }, n: Math.max(list.length * 2, 6) };
}
function updateUltFx(dt) {
  const f = ultFx, p = player;
  if (f.storm) {
    f.storm.t -= dt; f.storm.tick -= dt;
    const n = Math.ceil(dt * 110);
    for (let i = 0; i < n; i++) spears.push({ x: cam.x + rnd(0, W), y: cam.y - rnd(20, 120), vy: rnd(1300, 1800), len: rnd(26, 48) });
    if (f.storm.tick <= 0) {
      f.storm.tick = 0.12;
      for (const t of targets()) {
        const h = hurtbox(t); if (!h || !onScreen(h) || t.type === 'dummy') continue;
        dealDamage(t, 1.3, Math.sign(h.x + h.w / 2 - p.x) || 1, { kb: 40, stun: 0.2, src: 'ult' });
        burst(h.x + h.w / 2, h.y + rnd(0, h.h), 4, INK, 0, 200);
      }
      shake = Math.max(shake, 5); SFX.hit();
    }
    if (f.storm.t <= 0) f.storm = null;
  }
  if (f.cuts) {
    const c = f.cuts; c.t -= dt;
    p.vx = 0; p.vy = 0; p.inv = Math.max(p.inv, 0.5);
    if (c.t <= 0) {
      c.t = 0.075;
      if (c.i < c.n) {
        const tgt = c.list.length ? c.list[c.i % c.list.length] : null;
        const alive = tgt && (tgt.def ? tgt.state !== 'dead' : tgt.alive);
        if (alive) {
          const h = hurtbox(tgt), side = c.i % 2 ? 1 : -1;
          p.x = clamp(h.x + h.w / 2 + side * (h.w / 2 + 22) - p.w / 2, cam.x + 24, cam.x + W - 24 - p.w);
          p.y = h.y + h.h / 2 - p.h / 2; p.face = -side;
          dealDamage(tgt, tgt.def ? 4 : 5, -side, { kb: 60, stun: 0.35, src: 'ult' });
          slashes.push({ x: h.x + h.w / 2, y: h.y + h.h / 2, a: rnd(0, Math.PI), t: 0.28, len: 70 + h.h * 0.5 });
          burst(h.x + h.w / 2, h.y + h.h / 2, 8, INK, -side, 260);
          hitstop = 0.025;
        } else slashes.push({ x: cam.x + rnd(120, W - 120), y: cam.y + rnd(120, H - 160), a: rnd(0, Math.PI), t: 0.28, len: 90 });
        ghosts.push({ x: p.x + p.w / 2, y: p.y + p.h, face: p.face, life: 0.3 });
        SFX.slash(); shake = Math.max(shake, 4); c.i++;
      } else { p.x = c.home.x; p.y = c.home.y; f.cuts = null; floater(p.x + p.w / 2, p.y - 20, 'THOUSAND CUTS'); }
    }
  }
  if (f.page) {
    f.page.t += dt;
    if (!f.page.hit && f.page.t >= 0.32) {
      f.page.hit = true; shake = 24; hitstop = 0.15; SFX.boom();
      for (const b of bosses) if (b.state !== 'dead' && b.state !== 'intro') damageBoss(b, b.maxHp * 0.3, 1, { src: 'ult', kb: 0, stun: 1 });
      for (const e of world.enemies) if (e.alive && e.type !== 'dummy' && onScreen(e)) hitEnemy(e, 999, 1, { src: 'ult', kb: 200, stun: 1 });
    }
    if (f.page.t > 1.1) f.page = null;
  }
  for (const s of spears) {
    s.y += s.vy * dt;
    if (s.y > cam.y + H + 60 || pointSolid(s.x, s.y)) { s.dead = true; if (Math.random() < 0.3) burst(s.x, s.y, 2, INK, 0, 90); }
  }
  spears = spears.filter(s => !s.dead);
  for (const s of slashes) s.t -= dt; slashes = slashes.filter(s => s.t > 0);
}
