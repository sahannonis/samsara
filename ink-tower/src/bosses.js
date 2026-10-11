/* ================= bosses ================= */
const BOSS_INFO = [null,
  { name: 'THE BRUTE', tip: 'When his eyes turn red, he is about to attack.' },
  { name: 'THE ARCHER', tip: 'When arrows go up, stand between the red marks.' },
  { name: 'THE TWINS', tip: 'Beat one and the other gets angry.' },
  { name: 'THE NINJA', tip: 'Later on, only the real one takes damage.' },
  { name: 'THE SHIELD KNIGHT', tip: 'Hit him from behind, or when his sword gets stuck.' },
  { name: 'THE BOMBER', tip: 'Red blinking means it is about to blow.' },
  { name: 'THE SPIDER', tip: 'Hit it when it drops to the floor.' },
  { name: 'THE INK MAGE', tip: 'Low beam: jump. High beam: stay on the ground.' },
  { name: 'THE GIANT', tip: 'Stand on his hand after a slam. Hit the open eye.' },
  { name: 'THE SHADOW', tip: 'It knows every move you have seen.' },
];
function mkBoss(def, o) {
  const b = Object.assign({ def, vx: 0, vy: 0, face: -1, state: 'intro', t: introMax, flash: 0, onGround: true, phase: 1, phases: [], deadT: 0, noOneway: true,
    solidBody: false, danger: false, roared: false, hidden: false, redEye: false, cool: 0, halfDrop: false }, o);
  b.maxHp = b.hp; b.chip = b.hp; return b;
}
const bcx = b => b.x + b.w / 2;
const pcx = () => player.x + player.w / 2;
function faceP(b) { const d = pcx() - bcx(b); if (Math.abs(d) > 2) b.face = Math.sign(d); }
function tele(b, state, t) { b.state = state; b.t = t; SFX.warn(); }
function bossPhysics(b, dt) { b.vy = Math.min(b.vy + GRAV * dt, 1300); moveBody(b, dt); b.x = clamp(b.x, 20, 940 - b.w); }
function puffAt(x, y) { for (let i = 0; i < 14; i++) particles.push({ x: x + rnd(-10, 10), y: y + rnd(-20, 20), vx: rnd(-160, 160), vy: rnd(-160, 60), life: rnd(0.25, 0.5), r: rnd(2, 5), color: PENCIL, nograv: true }); }
function bghost(b, ink = INK) { b.gT = (b.gT || 0) - 1 / 60; if (b.gT <= 0) { b.gT = 0.03; ghosts.push({ x: bcx(b), y: b.y + b.h, face: b.face, life: 0.2, ink }); } }

function updateBosses(dt) {
  for (const b of bosses) {
    b.flash = Math.max(0, b.flash - dt); b.chip += (b.hp - b.chip) * Math.min(1, dt * 2.5); b.cool = Math.max(0, b.cool - dt);
    if (b.state === 'dead') {
      b.deadT += dt;
      if (b.def.deadUpdate) b.def.deadUpdate(b, dt); else { if (b.onGround) b.vx *= Math.pow(0.02, dt); bossPhysics(b, dt); }
      continue;
    }
    if (b.state === 'intro' || b.state === 'roar') {
      b.t -= dt; if (!b.def.noFace) faceP(b);
      if (b.state === 'intro' && !b.roared && b.t < introMax - 0.5) { b.roared = true; SFX.roar(); shake = 10; }
      if (b.t <= 0) { b.state = 'idle'; b.t = 0.4; }
      b.vx *= Math.pow(0.01, dt);
      if (b.def.idleAnim) b.def.idleAnim(b, dt); else if (!b.kinematic) bossPhysics(b, dt);
      continue;
    }
    b.danger = false;
    b.def.update(b, dt);
    if (!b.kinematic) bossPhysics(b, dt);
    bossContact(b);
  }
  if (bosses.length && clearPending < 0 && bosses.every(b => b.state === 'dead')) clearPending = 2.6;
}
function bossContact(b) {
  const p = player; if (p.dead || b.hidden || !overlap(b, p)) return;
  if (b.danger) { hurtPlayer(b.contactDmg || 1, Math.sign(pcx() - bcx(b)) || b.face); return; }
  if (b.solidBody && p.dashT <= 0) {
    const left = b.x - p.w, right = b.x + b.w;
    let nx = pcx() < bcx(b) ? left : right;
    if (nx < 20) nx = right; if (nx + p.w > 940) nx = left;
    p.x = nx;
  }
}
function damageBoss(b, dmg, dir, o) {
  if (b.state === 'intro' || b.state === 'dead' || b.state === 'roar' || b.hidden) return false;
  if (o.src !== 'ult' && b.def.block && b.def.block(b, o)) {
    const h = hurtbox(b); sparks(h.x + h.w / 2, h.y + h.h / 3); SFX.block();
    if (Math.random() < 0.5) floater(h.x + h.w / 2, h.y - 10, 'BLOCK', PENCIL);
    return false;
  }
  const m = (b.state === 'stunned' || b.vuln) ? 1.5 : 1;
  b.hp -= dmg * m; b.flash = 0.12;
  if (b.def.onHit) b.def.onHit(b, o);
  if (!b.halfDrop && b.hp <= b.maxHp * 0.5 && b.hp > 0) { b.halfDrop = true; heartFall(480); }
  const h = hurtbox(b);
  if (b.hp <= 0) {
    b.hp = 0; b.state = 'dead'; b.deadT = 0; b.hidden = false; b.vx = dir * 90; b.vy = -200; b.danger = false;
    slowT = 1.3; shake = 22; SFX.kill(); SFX.slam(); clearHostile();
    burst(h.x + h.w / 2, h.y + h.h * 0.4, 70, INK, dir, 420); splat(h.x + h.w / 2, GROUND);
    if (b.def.onDeath) b.def.onDeath(b);
    return true;
  }
  if (b.phase - 1 < b.phases.length && b.hp <= b.maxHp * b.phases[b.phase - 1]) {
    b.phase++; b.state = 'roar'; b.t = 1.1; b.vx = 0; b.hidden = false; clearHostile(); SFX.roar(); shake = 14;
    floater(h.x + h.w / 2, h.y - 24, 'PHASE ' + b.phase, RED);
    if (b.def.onPhase) b.def.onPhase(b);
  }
  return true;
}
function bstick(b, pose, o = {}) {
  const dead = b.state === 'dead';
  const rot = dead ? -b.face * Math.min(1, b.deadT * 1.6) * Math.PI / 2 : 0;
  const red = b.redEye || ((b.state === 'intro' || b.state === 'roar') && b.roared);
  return drawStick(Object.assign({ x: bcx(b), y: b.y + b.h, face: b.face, pose, ink: b.flash > 0 ? PENCIL : INK, head: 'fill', eye: 'boss', eyeColor: red ? RED : PAPER,
    grounded: b.onGround && !dead, rot, s: b.h / 52, lw: 3.6 }, o));
}
function basePose(b, map = {}) {
  if (map[b.state]) return map[b.state]();
  if (b.state === 'dead') return POSES.hurt();
  if (b.state === 'roar' || (b.state === 'intro' && b.roared)) return POSES.roar(clock);
  if (!b.onGround && !b.kinematic) return b.vy < 0 ? POSES.jump() : POSES.fall();
  if (Math.abs(b.vx) > 8) return POSES.run((b.stepT = (b.stepT || 0) + Math.abs(b.vx) * 0.0006));
  return POSES.idle(clock);
}
function arrowRain(n) {
  const slots = []; for (let x = 70; x <= 890; x += 82) slots.push(x);
  shuffle(slots);
  for (let i = 0; i < n; i++) for (const o of [-14, 0, 14]) skyDrop(slots[i] + o, 1.0 + rnd(0, 0.12), 'arrow');
}

/* ---------- 1. The Brute ---------- */
const BRUTE = {
  make: () => mkBoss(BRUTE, { x: 700, y: GROUND - 118, w: 56, h: 118, hp: 44, solidBody: true, last: [] }),
  update(b, dt) {
    const p = player, bc = bcx(b), pc = pcx(), dx = pc - bc, L = 20, R = 940 - b.w, angry = b.hp <= b.maxHp * 0.5;
    const toIdle = () => { b.state = 'idle'; b.t = angry ? rnd(0.45, 0.8) : rnd(0.75, 1.2); };
    switch (b.state) {
      case 'idle':
        b.t -= dt; faceP(b); b.vx = Math.abs(dx) > 140 ? b.face * (angry ? 95 : 70) : 0;
        if (b.t <= 0 && !p.dead) {
          let m = Math.abs(dx) < 130 ? (Math.random() < 0.6 ? 'punch' : 'slam') : (Math.random() < 0.5 ? 'charge' : 'slam');
          const l = b.last; if (l.length >= 2 && l[l.length - 1] === m && l[l.length - 2] === m) m = m === 'charge' ? 'slam' : 'charge';
          l.push(m); if (l.length > 4) l.shift();
          if (m === 'punch') tele(b, 'punchWind', angry ? 0.36 : 0.46); else if (m === 'charge') tele(b, 'chargeWind', angry ? 0.58 : 0.72); else tele(b, 'slamWind', angry ? 0.3 : 0.42);
        }
        break;
      case 'chargeWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'charge'; SFX.dash(); } break;
      case 'charge':
        b.vx = b.face * (angry ? 640 : 560); if (Math.random() < dt * 30) dust(b.face > 0 ? b.x : b.x + b.w, GROUND, 2);
        if ((b.face > 0 && b.x >= R - 1) || (b.face < 0 && b.x <= L + 1)) {
          b.state = 'stunned'; b.t = angry ? 1.0 : 1.35; b.vx = -b.face * 140; b.vy = -260; shake = 15; SFX.slam();
          burst(b.face > 0 ? 940 : 20, GROUND - 80, 24, INK, -b.face, 280); floater(bc, b.y - 20, 'STUNNED');
        }
        break;
      case 'stunned': b.t -= dt; if (b.onGround) b.vx *= Math.pow(0.01, dt); if (b.t <= 0) toIdle(); break;
      case 'slamWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'slamAir'; b.airT = 0; b.target = clamp(pc, L + b.w / 2, R + b.w / 2); b.vx = clamp((b.target - bc) / 0.86, -540, 540); b.vy = -820; SFX.jump(); } break;
      case 'slamAir':
        b.airT += dt;
        if (b.onGround && b.airT > 0.12) {
          b.state = 'slamLand'; b.t = 0.55; b.vx = 0; shake = 16; SFX.slam();
          const spd = angry ? 540 : 430; waves.push(mkWave(bc - 18, GROUND, -1, spd, 900, 30), mkWave(bc + 18, GROUND, 1, spd, 900, 30)); dust(bc, GROUND, 18);
        }
        break;
      case 'slamLand': b.t -= dt; b.vx = 0; if (b.t <= 0) toIdle(); break;
      case 'punchWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'punch'; b.t = 0.2; b.hitDone = false; b.vx = b.face * 260; SFX.swing(); } break;
      case 'punch': {
        b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w - 6 : b.x - 78, y: b.y + 34, w: 84, h: 46 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) b.hitDone = true;
        if (b.t <= 0) { b.state = 'recover'; b.t = 0.55; } break;
      }
      case 'recover': b.t -= dt; b.vx *= Math.pow(0.001, dt); if (b.t <= 0) toIdle(); break;
    }
    b.danger = b.state === 'charge' || (b.state === 'slamAir' && b.vy > 0);
    b.redEye = ['chargeWind', 'slamWind', 'punchWind', 'charge', 'slamAir', 'punch'].includes(b.state);
  },
  draw(b) {
    const bc = bcx(b);
    if (b.state === 'chargeWind') { const endX = b.face > 0 ? 940 : 20; dashedLine(bc + b.face * 30, GROUND - 6, endX, GROUND - 6, RED, 4, [16, 12]); }
    if (b.state === 'slamAir') { const pu = 1 + Math.sin(clock * 20) * 0.12; ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(b.target, GROUND - 2, 44 * pu, 9 * pu, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (b.state === 'charge') { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i < 5; i++) { const y = b.y + 20 + i * 20, x = b.face > 0 ? b.x - 10 : b.x + b.w + 10; ctx.moveTo(x, y); ctx.lineTo(x - b.face * rnd(30, 70), y); } ctx.stroke(); }
    const pose = basePose(b, { chargeWind: POSES.crouch, slamWind: POSES.crouch, slamLand: POSES.crouch, charge: POSES.dash, punchWind: POSES.wind, punch: POSES.p1, recover: POSES.idle.bind(null, clock), stunned: () => POSES.stun(clock), slamAir: () => b.vy < 0 ? POSES.jump() : POSES.fall() });
    const jx = (b.state === 'chargeWind' || b.state === 'punchWind') ? rnd(-2, 2) : 0;
    const r = bstick(b, pose, { x: bc + jx, lw: 7, torso: 2.2, hair: true });
    if (b.state === 'punchWind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 6 + (1 - b.t / 0.46) * 12, 0, Math.PI * 2); ctx.fill(); }
    if (b.state === 'punch') redSwipe(r.hF.x, r.hF.y, b.face, 40, 5);
    if (b.state === 'stunned') stars(r.head);
  },
};
function stars(h) { ctx.fillStyle = INK; for (let i = 0; i < 3; i++) { const a = clock * 6 + i * 2.1; ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * (h.r + 10), h.y - h.r - 8 + Math.sin(a) * 6, 4, 0, Math.PI * 2); ctx.fill(); } }

/* ---------- 2. The Archer ---------- */
const SPOTS2 = [{ x: 170, y: 330 }, { x: 480, y: 250 }, { x: 790, y: 330 }, { x: 480, y: GROUND }];
function archerHop(b) {
  const opts = [0, 1, 2, 3].filter(i => i !== b.spot);
  opts.sort((a, c) => Math.abs(SPOTS2[c].x - pcx()) - Math.abs(SPOTS2[a].x - pcx()));
  b.spot = opts[Math.random() < 0.7 ? 0 : 1];
  b.state = 'hop'; b.ht = 0; b.hd = 0.6; b.hf = { x: bcx(b), y: b.y + b.h }; b.hto = SPOTS2[b.spot]; SFX.jump();
}
function archerFire(b, at, ang) {
  const sx = bcx(b) + b.face * 14, sy = b.y + 18, a = Math.atan2(at.y - sy, at.x - sx) + ang;
  shot({ kind: 'arrow', x: sx, y: sy, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, r: 5, solidStop: true, life: 2 }); SFX.shoot();
}
const ARCHER = {
  make: () => mkBoss(ARCHER, { x: 790 - 12, y: 330 - 56, w: 24, h: 56, hp: 50, noOneway: false, spot: 2, hits: 0 }),
  update(b, dt) {
    const p = player, angry = b.hp <= b.maxHp * 0.5, k = angry ? 0.75 : 1;
    if (b.state !== 'hop') faceP(b);
    switch (b.state) {
      case 'idle':
        b.vx = 0; b.t -= dt;
        if (b.t <= 0 && !p.dead) {
          const adx = Math.abs(pcx() - bcx(b)), ady = Math.abs(p.y + p.h - (b.y + b.h));
          if (adx < 70 && ady < 50) tele(b, 'kickWind', 0.32 * k);
          else if (b.hits >= 3) archerHop(b);
          else { const r = Math.random(); if (r < 0.38) tele(b, 'aim', 0.8 * k); else if (r < 0.64) tele(b, 'volley', 0.72 * k); else if (r < 0.84) tele(b, 'rainUp', 0.55); else archerHop(b); }
        }
        break;
      case 'aim': case 'volley':
        b.t -= dt; if (b.t > 0.22) b.aimAt = { x: pcx(), y: p.y + p.h * 0.45 };
        if (b.t <= 0) {
          (b.state === 'aim' ? [0] : [-0.18, 0, 0.18]).forEach(a => archerFire(b, b.aimAt, a));
          if (b.state === 'volley' && angry && !b.second) { b.second = true; b.t = 0.42; SFX.warn(); }
          else { b.second = false; b.state = 'idle'; b.t = angry ? 0.5 : 0.85; }
        }
        break;
      case 'rainUp':
        b.t -= dt;
        if (b.t <= 0) { for (let i = 0; i < 5; i++) shot({ kind: 'arrow', x: bcx(b) + rnd(-8, 8), y: b.y, vx: rnd(-60, 60), vy: -1300, r: 3, life: 0.5, dmg: 0 }); arrowRain(angry ? 6 : 5); b.state = 'idle'; b.t = 1.3 * k; }
        break;
      case 'hop': {
        b.ht += dt / b.hd; const u = Math.min(1, b.ht);
        b.x = lerp(b.hf.x, b.hto.x, u) - b.w / 2; b.y = lerp(b.hf.y, b.hto.y, u) - Math.sin(Math.PI * u) * 150 - b.h; b.vx = 0; b.vy = 0;
        if (u >= 1) { b.state = 'idle'; b.t = 0.35 * k; b.hits = 0; b.onGround = true; }
        break;
      }
      case 'kickWind': b.t -= dt; if (b.t <= 0) { b.state = 'kick'; b.t = 0.16; b.hitDone = false; SFX.swing(); } break;
      case 'kick': {
        b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w : b.x - 46, y: b.y + 20, w: 46, h: 30 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) { b.hitDone = true; p.vx = b.face * 520; }
        if (b.t <= 0) archerHop(b); break;
      }
    }
    b.kinematic = b.state === 'hop';
    b.redEye = ['aim', 'volley', 'rainUp', 'kickWind', 'kick'].includes(b.state);
  },
  onHit(b) { b.hits++; },
  draw(b) {
    const aiming = b.state === 'aim' || b.state === 'volley';
    const pose = basePose(b, { aim: POSES.shoot, volley: POSES.shoot, rainUp: POSES.cast.bind(null, clock), hop: POSES.jump, kickWind: POSES.wind, kick: POSES.kick });
    const r = bstick(b, pose, { lw: 3.8 });
    ctx.fillStyle = b.flash > 0 ? PENCIL : INK; ctx.beginPath(); ctx.moveTo(r.head.x - b.face * 9, r.head.y + 4); ctx.lineTo(r.head.x + b.face * 2, r.head.y - 13); ctx.lineTo(r.head.x + b.face * 9, r.head.y - 2); ctx.closePath(); ctx.fill();
    if (b.state !== 'dead') {
      const hx = r.hF.x, hy = r.hF.y;
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); const a0 = b.face > 0 ? -1.15 : Math.PI - 1.15;
      ctx.arc(hx - b.face * 8, hy, 18, a0, a0 + 2.3); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - b.face * 8 + Math.cos(a0) * 18, hy + Math.sin(a0) * 18); ctx.lineTo(aiming ? hx - b.face * 16 : hx - b.face * 8 + Math.cos(a0) * 18, hy); ctx.lineTo(hx - b.face * 8 + Math.cos(a0 + 2.3) * 18, hy + Math.sin(a0 + 2.3) * 18); ctx.stroke();
    }
    if (aiming && b.aimAt) { if (b.t > 0.22) dashedLine(r.hF.x, r.hF.y, b.aimAt.x, b.aimAt.y, RED, 1.5, [6, 8]); else { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(r.hF.x, r.hF.y); ctx.lineTo(b.aimAt.x, b.aimAt.y); ctx.stroke(); } }
    if (b.state === 'kick') redSwipe(bcx(b) + b.face * 30, b.y + 34, b.face, 22);
  },
};

/* ---------- 3. The Twins ---------- */
const ROK = {
  make: () => mkBoss(ROK, { name: 'ROK', x: 620, y: GROUND - 72, w: 30, h: 72, hp: 34, solidBody: true }),
  update(b, dt) {
    const p = player, dx = pcx() - bcx(b), adx = Math.abs(dx), enr = b.partner && b.partner.state === 'dead';
    if (enr && !b.enraged) { b.enraged = true; floater(bcx(b), b.y - 20, 'ENRAGED', RED); SFX.roar(); shake = 10; }
    const k = enr ? 0.65 : 1, sp = enr ? 1.4 : 1;
    switch (b.state) {
      case 'idle':
        faceP(b); b.t -= dt; b.vx = adx > 90 ? b.face * 110 * sp : 0;
        if (b.t <= 0 && !p.dead) { if (adx < 90) tele(b, 'upWind', 0.42 * k); else tele(b, 'dashWind', 0.55 * k); }
        break;
      case 'dashWind': b.vx = 0; b.t -= dt; if (b.t <= 0) { b.state = 'dash'; b.t = 0.55; b.hitDone = false; SFX.dash(); } break;
      case 'dash': {
        b.vx = b.face * 560 * sp; b.t -= dt; bghost(b, INK2);
        const hb = { x: b.face > 0 ? b.x + b.w - 6 : b.x - 30, y: b.y + 14, w: 36, h: 36 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) b.hitDone = true;
        if (b.t <= 0 || b.hitWall) {
          if (enr && !b.didDouble) { b.didDouble = true; faceP(b); tele(b, 'dashWind', 0.3); }
          else { b.didDouble = false; b.state = 'cool'; b.t = 0.6 * k; }
        }
        break;
      }
      case 'upWind': b.vx = 0; b.t -= dt; if (b.t <= 0) { b.state = 'upper'; b.t = 0.2; b.hitDone = false; SFX.swing(); } break;
      case 'upper': {
        b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w - 6 : b.x - 50, y: b.y - 30, w: 56, h: 74 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) { b.hitDone = true; p.vy = -620; }
        if (b.t <= 0) { b.state = 'cool'; b.t = 0.7 * k; } break;
      }
      case 'cool': b.t -= dt; b.vx *= Math.pow(0.01, dt); if (b.t <= 0) { b.state = 'idle'; b.t = rnd(0.4, 0.8) * k; } break;
    }
    b.redEye = enr || ['dashWind', 'dash', 'upWind', 'upper'].includes(b.state);
  },
  draw(b) {
    const pose = basePose(b, { dashWind: POSES.crouch, dash: POSES.dash, upWind: POSES.crouch, upper: () => ({ lean: -0.1, aF: [3.0, 3.1], aB: [0.3, 1.2], lF: [0.3, 0.1], lB: [-0.3, -0.1] }) });
    const r = bstick(b, pose, { lw: 5.5, torso: 1.8, hair: true });
    if (b.state === 'dashWind') { dashedLine(bcx(b) + b.face * 24, GROUND - 6, bcx(b) + b.face * 330, GROUND - 6, RED, 3); ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 8, 0, Math.PI * 2); ctx.fill(); }
    if (b.state === 'upWind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 9, 0, Math.PI * 2); ctx.fill(); }
    if (b.state === 'upper') redSwipe(r.hF.x, r.hF.y + 20, b.face, 34, 4);
  },
};
const PELL = {
  make: () => mkBoss(PELL, { name: 'PELL', x: 830, y: GROUND - 58, w: 24, h: 58, hp: 34, air: 0 }),
  update(b, dt) {
    const p = player, dx = pcx() - bcx(b), adx = Math.abs(dx), enr = b.partner && b.partner.state === 'dead';
    if (enr && !b.enraged) { b.enraged = true; floater(bcx(b), b.y - 20, 'ENRAGED', RED); SFX.roar(); shake = 10; }
    const k = enr ? 0.65 : 1;
    switch (b.state) {
      case 'idle':
        faceP(b); b.t -= dt;
        if (adx < 130 && b.onGround && b.cool <= 0) { b.state = 'leap'; b.air = 0; b.vy = -640; b.vx = -b.face * 340; b.onGround = false; b.cool = 1.5; SFX.jump(); break; }
        b.vx = adx < 260 ? -b.face * 100 : adx > 420 ? b.face * 100 : 0;
        if (b.t <= 0 && !p.dead) tele(b, 'throwWind', 0.55 * k);
        break;
      case 'leap': b.air += dt; if (b.onGround && b.air > 0.12) { b.state = 'idle'; b.t = 0.3; b.vx = 0; } break;
      case 'throwWind':
        b.vx = 0; b.t -= dt;
        if (b.t <= 0) { const offs = enr ? [-90, 0, 90] : [0]; offs.forEach(o => lob(bcx(b) + b.face * 10, b.y + 8, clamp(pcx() + o, 40, 920), p.y + p.h / 2, 'rock', { r: 9 })); SFX.swing(); b.state = 'idle'; b.t = rnd(0.9, 1.4) * k; }
        break;
    }
    b.redEye = enr || b.state === 'throwWind';
  },
  draw(b) {
    const r = bstick(b, basePose(b, { throwWind: POSES.throw, leap: POSES.jump }), { lw: 4 });
    ctx.strokeStyle = b.flash > 0 ? PENCIL : INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.head.x - b.face * r.head.r, r.head.y - 4);
    ctx.quadraticCurveTo(r.head.x - b.face * (r.head.r + 14), r.head.y - 2, r.head.x - b.face * (r.head.r + 10), r.head.y + 18 + Math.sin(clock * 6) * 3); ctx.stroke();
    if (b.state === 'throwWind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 9, 0, Math.PI * 2); ctx.fill(); }
  },
};

/* ---------- 4. The Ninja ---------- */
function spawnClones(b) {
  const have = world.enemies.filter(e => e.type === 'clone' && e.alive).length;
  for (let i = have; i < 2; i++) {
    const x = clamp(i === 0 ? 120 : 800 + rnd(-40, 40), 40, 900);
    const e = makeEnemy('clone', x, GROUND, 4, false); e.hp = 1; e.maxHp = 1; e.t = rnd(0.8, 1.5); e.home = x;
    world.enemies.push(e); puffAt(x + 11, GROUND - 30);
  }
}
const NINJA = {
  make: () => mkBoss(NINJA, { x: 760, y: GROUND - 54, w: 22, h: 54, hp: 60, phases: [0.5], noOneway: false, cloneT: 0 }),
  update(b, dt) {
    const p = player, ph2 = b.phase >= 2, k = ph2 ? 0.8 : 1, adx = Math.abs(pcx() - bcx(b));
    if (ph2) { b.cloneT -= dt; if (b.cloneT <= 0) { b.cloneT = 9; spawnClones(b); } }
    switch (b.state) {
      case 'idle':
        faceP(b); b.t -= dt; b.vx = adx < 150 ? -b.face * 180 : adx > 320 ? b.face * 200 : 0;
        if (b.t <= 0 && !p.dead) {
          const r = Math.random();
          if (r < 0.36) { b.state = 'vanish'; b.t = 0.25; puffAt(bcx(b), b.y + b.h / 2); SFX.dash(); }
          else if (r < 0.7) { faceP(b); tele(b, 'dashWind', 0.5 * k); }
          else tele(b, 'throwWind', 0.42 * k);
        }
        break;
      case 'vanish': b.t -= dt; b.hidden = true; b.vx = 0; if (b.t <= 0) { b.mark = { x: clamp(pcx() - p.face * 60, 50, 910) }; b.state = 'mark'; b.t = 0.5 * k; SFX.warn(); } break;
      case 'mark': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.x = b.mark.x - b.w / 2; b.y = GROUND - b.h; b.vy = 0; b.hidden = false; faceP(b); puffAt(bcx(b), b.y + b.h / 2); b.state = 'slash'; b.t = 0.18; b.hitDone = false; SFX.slash(); } break;
      case 'slash': {
        b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w - 4 : b.x - 52, y: b.y + 6, w: 56, h: 40 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) b.hitDone = true;
        if (b.t <= 0) { b.state = 'cool'; b.t = 0.55 * k; } break;
      }
      case 'dashWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'dash'; b.t = 1.0; SFX.dash(); } break;
      case 'dash':
        b.t -= dt; b.vx = b.face * 900; bghost(b);
        if (b.hitWall || b.t <= 0 || (b.face > 0 && b.x >= 940 - b.w - 1) || (b.face < 0 && b.x <= 21)) { b.state = 'cool'; b.t = 0.5 * k; b.vx = 0; }
        break;
      case 'throwWind':
        b.t -= dt; b.vx = 0;
        if (b.t <= 0) {
          const sx = bcx(b), sy = b.y + 18, a0 = Math.atan2(p.y + p.h / 2 - sy, pcx() - sx);
          for (const a of (ph2 ? [-0.2, -0.07, 0.07, 0.2] : [-0.12, 0, 0.12])) shot({ kind: 'shuriken', x: sx, y: sy, vx: Math.cos(a0 + a) * 520, vy: Math.sin(a0 + a) * 520, r: 7, solidStop: true, life: 2.5 });
          SFX.shoot(); b.state = 'cool'; b.t = 0.6 * k;
        }
        break;
      case 'cool': b.t -= dt; b.vx *= Math.pow(0.001, dt); if (b.t <= 0) { b.state = 'idle'; b.t = rnd(0.4, 0.8) * k; } break;
    }
    b.danger = b.state === 'dash';
    b.redEye = ['dashWind', 'dash', 'throwWind', 'slash'].includes(b.state);
  },
  onPhase(b) { b.cloneT = 1.2; },
  onDeath() { for (const e of world.enemies) if (e.type === 'clone' && e.alive) { e.alive = false; puffAt(e.x + 11, e.y + 26); } },
  draw(b) {
    if (b.state === 'mark' && b.mark) {
      const x = b.mark.x; ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 12, GROUND - 40); ctx.lineTo(x + 12, GROUND - 16); ctx.moveTo(x + 12, GROUND - 40); ctx.lineTo(x - 12, GROUND - 16); ctx.stroke();
    }
    if (b.hidden && b.state !== 'dead') return;
    if (b.state === 'dashWind') dashedLine(bcx(b), b.y + 30, b.face > 0 ? 940 : 20, b.y + 30, RED, 3);
    const pose = basePose(b, { dashWind: POSES.crouch, dash: POSES.dash, throwWind: POSES.throw, slash: POSES.p1 });
    const r = bstick(b, pose, { eye: 'player', eyeColor: b.redEye ? RED : PAPER, lw: 3.6 });
    ctx.strokeStyle = b.flash > 0 ? PENCIL : INK; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(r.head.x - b.face * r.head.r, r.head.y - 2); ctx.lineTo(r.head.x - b.face * (r.head.r + 16), r.head.y + Math.sin(clock * 12) * 4);
    ctx.moveTo(r.head.x - b.face * r.head.r, r.head.y - 1); ctx.lineTo(r.head.x - b.face * (r.head.r + 13), r.head.y + 8 + Math.sin(clock * 12 + 1) * 4);
    ctx.moveTo(r.neck.x - b.face * 10, r.neck.y - 6); ctx.lineTo(r.hip.x + b.face * 10, r.hip.y + 4); ctx.stroke();
    if (b.state === 'slash') redSwipe(r.hF.x, r.hF.y, b.face, 30, 4);
  },
};

/* ---------- 5. The Shield Knight ---------- */
const KNIGHT = {
  make: () => mkBoss(KNIGHT, { x: 720, y: GROUND - 96, w: 40, h: 96, hp: 70, phases: [0.5], solidBody: true, shieldOut: false, turnT: 0 }),
  update(b, dt) {
    const p = player, ph2 = b.phase >= 2, k = ph2 ? 0.8 : 1, dx = pcx() - bcx(b), adx = Math.abs(dx);
    switch (b.state) {
      case 'idle': {
        b.t -= dt; const want = Math.sign(dx) || b.face;
        if (want !== b.face) { b.turnT += dt; b.vx = 0; if (b.turnT > (ph2 ? 0.3 : 0.55)) { b.face = want; b.turnT = 0; } }
        else { b.turnT = 0; b.vx = adx > 110 ? b.face * 65 : 0; }
        if (b.t <= 0 && want === b.face && !p.dead) {
          if (adx < 120) tele(b, 'bashWind', 0.5 * k);
          else if (ph2 && !b.shieldOut && Math.random() < 0.45) tele(b, 'throwWind', 0.55 * k);
          else tele(b, 'overWind', 0.75 * k);
        }
        break;
      }
      case 'bashWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'bash'; b.t = 0.22; b.hitDone = false; b.vx = b.face * 380; SFX.swing(); } break;
      case 'bash': {
        b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w - 6 : b.x - 44, y: b.y + 10, w: 50, h: b.h - 14 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) b.hitDone = true;
        if (b.t <= 0) { b.state = 'cool'; b.t = 0.6 * k; } break;
      }
      case 'overWind':
        b.t -= dt; b.vx = b.face * 40;
        if (b.t <= 0) {
          b.state = 'over'; b.t = 0.25; SFX.slam(); shake = 12;
          const fx = b.face > 0 ? b.x + b.w : b.x - 120;
          if (overlap({ x: fx, y: b.y, w: 120, h: b.h }, p)) hurtPlayer(1, b.face);
          waves.push(mkWave(b.face > 0 ? b.x + b.w + 120 : b.x - 120, GROUND, b.face, 430, 700, 28));
          dust(b.face > 0 ? b.x + b.w + 60 : b.x - 60, GROUND, 12);
        }
        break;
      case 'over': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'stuck'; b.t = 1.3; floater(bcx(b), b.y - 14, 'OPEN!'); } break;
      case 'stuck': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'idle'; b.t = 0.4; } break;
      case 'throwWind':
        b.t -= dt; b.vx = 0;
        if (b.t <= 0) { b.shieldOut = true; shot({ kind: 'boomer', x: bcx(b) + b.face * 30, y: b.y + b.h * 0.45, vx: b.face * 620, vy: 0, dir: b.face, acc: 600, outT: 0.75, spd: 560, r: 22, pierce: true, owner: b, life: 6 }); SFX.dash(); b.state = 'cool'; b.t = 0.9; }
        break;
      case 'cool': b.t -= dt; b.vx *= Math.pow(0.001, dt); if (b.t <= 0) { b.state = 'idle'; b.t = rnd(0.5, 0.9) * k; } break;
    }
    b.vuln = b.state === 'stuck';
    b.redEye = ['bashWind', 'bash', 'overWind', 'over', 'throwWind'].includes(b.state);
  },
  block(b, o) {
    if (b.shieldOut || b.state === 'stuck' || b.state === 'over') return false;
    const fx = o.fromX != null ? o.fromX : pcx();
    return Math.sign(fx - bcx(b)) === b.face;
  },
  onDeath() { shots = shots.filter(s => s.kind !== 'boomer'); },
  draw(b) {
    const raised = b.state === 'overWind';
    const pose = basePose(b, { bashWind: POSES.crouch, bash: POSES.p1, overWind: () => ({ lean: -0.15, aF: [2.9, 3.1], aB: [0.4, 1.4], lF: [0.35, 0.1], lB: [-0.35, -0.1] }), over: POSES.crouch, stuck: POSES.crouch, throwWind: POSES.throw });
    const r = bstick(b, pose, { lw: 6, torso: 2.1 });
    const ink = b.flash > 0 ? PENCIL : INK;
    ctx.fillStyle = PAPER; ctx.fillRect(r.head.x - r.head.r * 0.2 + (b.face > 0 ? 0 : -r.head.r * 0.8), r.head.y - 3, r.head.r, 3);
    let swX = r.hF.x, swY = r.hF.y, tipX, tipY;
    if (raised) { tipX = swX - b.face * 10; tipY = swY - 70; }
    else if (b.state === 'over' || b.state === 'stuck') { tipX = bcx(b) + b.face * 110; tipY = GROUND + 6; }
    else { tipX = swX + b.face * 44; tipY = swY - 30; }
    if (b.state !== 'dead') {
      ctx.strokeStyle = raised ? RED : ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(swX, swY); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(swX - 8, swY + 4); ctx.lineTo(swX + 8, swY - 4); ctx.stroke();
    }
    if (!b.shieldOut && b.state !== 'dead') {
      const low = b.state === 'stuck' || b.state === 'over';
      const sx = bcx(b) + b.face * (b.state === 'bash' ? 34 : 26), sy = low ? b.y + 56 : b.y + 22;
      const sh = { x: sx - 9, y: sy, w: 18, h: low ? 40 : 60 };
      ctx.fillStyle = PAPER; ctx.fillRect(sh.x, sh.y, sh.w, sh.h); hatch(sh, 5, INK2, 1);
      ctx.strokeStyle = (b.state === 'bashWind' || b.state === 'bash') ? RED : ink; ctx.lineWidth = 3.5; ctx.strokeRect(sh.x, sh.y, sh.w, sh.h);
    }
    if (b.state === 'stuck') stars(r.head);
  },
};

/* ---------- 6. The Bomber ---------- */
const BOMBER = {
  make: () => mkBoss(BOMBER, { x: 720, y: GROUND - 66, w: 32, h: 66, hp: 70, phases: [0.5], noOneway: false, skyT: 3, air: 0 }),
  update(b, dt) {
    const p = player, ph2 = b.phase >= 2, k = ph2 ? 0.8 : 1;
    if (ph2) { b.skyT -= dt; if (b.skyT <= 0) { b.skyT = 2.6; [pcx(), rnd(60, 900), rnd(60, 900)].forEach((x, i) => skyDrop(clamp(x, 40, 920), 0.9 + i * 0.15, 'skybomb')); } }
    switch (b.state) {
      case 'idle':
        faceP(b); b.vx = 0; b.t -= dt;
        if (b.t <= 0 && !p.dead) {
          const mines = shots.filter(s => s.kind === 'mine').length, r = Math.random();
          if (r < 0.35) tele(b, 'lobWind', 0.5 * k);
          else if (r < 0.58 && mines < 5) tele(b, 'mineWind', 0.45 * k);
          else if (r < 0.8) tele(b, 'rollWind', 0.55 * k);
          else { b.state = 'hop'; b.air = 0; b.vy = -720; b.onGround = false; const tx = pcx() < 480 ? rnd(560, 880) : rnd(80, 400); b.vx = (tx - bcx(b)) / 0.76; SFX.jump(); }
        }
        break;
      case 'lobWind':
        b.t -= dt;
        if (b.t <= 0) { (ph2 ? [-160, -80, 0, 80, 160] : [-90, 0, 90]).forEach(o => lob(bcx(b) + b.face * 12, b.y + 10, clamp(pcx() + o, 40, 920), GROUND - 10, 'bomb', { fuse: 1.5 + rnd(0, 0.3), r: 9, er: 58 })); SFX.swing(); b.state = 'idle'; b.t = 1.0 * k; }
        break;
      case 'mineWind':
        b.t -= dt;
        if (b.t <= 0) { [-150, 0, 150].forEach(o => lob(bcx(b), b.y + 10, clamp(pcx() + o + rnd(-30, 30), 50, 910), GROUND - 8, 'mine', { r: 8, life: 7 })); SFX.swing(); b.state = 'idle'; b.t = 0.9 * k; }
        break;
      case 'rollWind':
        b.t -= dt;
        if (b.t <= 0) { shot({ kind: 'roller', x: bcx(b) + b.face * 34, y: GROUND - 18, vx: b.face * (ph2 ? 360 : 300), vy: 0, g: GRAV, r: 18, er: 80, life: 5 }); SFX.swing(); b.state = 'idle'; b.t = 1.1 * k; }
        break;
      case 'hop': b.air += dt; if (b.onGround && b.air > 0.12) { b.vx = 0; b.state = 'idle'; b.t = 0.4; dust(bcx(b), b.y + b.h, 8); } break;
    }
    b.redEye = ['lobWind', 'mineWind', 'rollWind'].includes(b.state);
  },
  draw(b) {
    const r = bstick(b, basePose(b, { lobWind: POSES.throw, mineWind: POSES.throw, rollWind: POSES.crouch, hop: POSES.jump }), { lw: 4.5 });
    if (b.state !== 'dead') {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(r.hip.x + b.face * 3, r.hip.y - 12, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.hip.x + b.face * 3, r.hip.y - 27); ctx.quadraticCurveTo(r.hip.x + b.face * 12, r.hip.y - 36, r.hip.x + b.face * 6, r.hip.y - 42); ctx.stroke();
      ctx.fillStyle = (clock * 6 | 0) % 2 ? RED : PAPER; ctx.beginPath(); ctx.arc(r.hip.x + b.face * 6, r.hip.y - 43, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAPER; ctx.fillRect(r.hip.x + b.face * 3 - 7, r.hip.y - 14, 14, 3);
    }
    if (b.state === 'lobWind' || b.state === 'mineWind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 9, 0, Math.PI * 2); ctx.fill(); }
    if (b.state === 'rollWind') dashedLine(bcx(b) + b.face * 30, GROUND - 6, b.face > 0 ? 940 : 20, GROUND - 6, RED, 3);
  },
};

/* ---------- 7. The Spider ---------- */
function perim(u) { u = clamp(u, 0, 1600); if (u < 360) return { x: 40, y: 430 - u, s: 'L' }; if (u < 1240) return { x: 40 + (u - 360), y: 70, s: 'C' }; return { x: 920, y: 70 + (u - 1240), s: 'R' }; }
function spiderTarget() { const r = Math.random(); if (r < 0.45) return 360 + clamp(pcx() - 40, 40, 840); if (r < 0.72) return rnd(10, 250); return rnd(1350, 1590); }
function spRect(b) { b.x = b.cx - 23; b.y = b.cy - 23; }
const SPIDER = {
  make() { const b = mkBoss(SPIDER, { x: 0, y: 0, w: 46, h: 46, hp: 80, phases: [0.5], kinematic: true, u: 1500, surf: 'R', cx: 920, cy: 330, tu: 1100, walk: 0, noFace: true }); spRect(b); return b; },
  update(b, dt) {
    const p = player, ph2 = b.phase >= 2, k = ph2 ? 0.8 : 1, spd = ph2 ? 360 : 280;
    const go = () => { b.state = 'crawl'; b.tu = spiderTarget(); };
    switch (b.state) {
      case 'idle': go(); break;
      case 'crawl': {
        const d = b.tu - b.u, st = Math.min(Math.abs(d), spd * dt);
        b.u += Math.sign(d) * st; const P = perim(b.u); b.cx = P.x; b.cy = P.y; b.surf = P.s; b.walk += st * 0.08;
        if (Math.abs(b.tu - b.u) < 1 && !p.dead) {
          if (b.surf === 'C' && Math.abs(pcx() - b.cx) < 110 && Math.random() < 0.7) tele(b, 'dropWind', 0.55 * k);
          else { const r = Math.random(); if (r < 0.45) tele(b, 'webWind', 0.45 * k); else if (r < 0.7 && b.surf === 'C') tele(b, 'dripWind', 0.38 * k); else go(); }
        }
        break;
      }
      case 'webWind':
        b.t -= dt;
        if (b.t <= 0) { const a0 = Math.atan2(p.y + p.h / 2 - b.cy, pcx() - b.cx); for (const a of (ph2 ? [-0.18, 0, 0.18] : [0])) shot({ kind: 'web', x: b.cx, y: b.cy, vx: Math.cos(a0 + a) * 430, vy: Math.sin(a0 + a) * 430, r: 10, life: 3, solidStop: true, dmg: 0 }); SFX.shoot(); go(); }
        break;
      case 'dripWind':
        b.t -= dt;
        if (b.t <= 0) { for (const o of [-60, 0, 60]) shot({ kind: 'drip', x: b.cx, y: b.cy + 20, vx: o * 1.3, vy: 0, g: GRAV * 0.8, r: 6, solidStop: true, life: 3 }); go(); }
        break;
      case 'dropWind': b.t -= dt; if (b.t <= 0) { b.state = 'drop'; b.vy = 0; b.surf = 'G'; } break;
      case 'drop':
        b.vy = Math.min(b.vy + 2600 * dt, 1400); b.cy += b.vy * dt;
        if (b.cy >= GROUND - 24) { b.cy = GROUND - 24; b.state = 'grounded'; b.t = 1.6; shake = 12; SFX.slam(); dust(b.cx, GROUND, 14); floater(b.cx, b.cy - 40, 'HIT IT!'); }
        break;
      case 'grounded': b.t -= dt; if (b.t <= 0) { if (ph2) { b.face = Math.sign(pcx() - b.cx) || 1; tele(b, 'lungeWind', 0.4); } else b.state = 'return'; } break;
      case 'lungeWind': b.t -= dt; b.face = Math.sign(pcx() - b.cx) || 1; if (b.t <= 0) { b.state = 'lunge'; b.t = 0.6; b.hitDone = false; SFX.dash(); } break;
      case 'lunge':
        b.t -= dt; b.cx = clamp(b.cx + b.face * 620 * dt, 40, 920); b.walk += dt * 20; spRect(b);
        if (!b.hitDone && overlap(b, p) && hurtPlayer(1, b.face)) { b.hitDone = true; p.vx = b.face * 560; p.vy = -560; floater(pcx(), p.y - 10, 'GRABBED'); }
        if (b.t <= 0) b.state = 'return';
        break;
      case 'return': {
        const tx = b.cx < 480 ? 40 : 920, st = Math.min(Math.abs(tx - b.cx), 300 * dt);
        b.cx += Math.sign(tx - b.cx) * st; b.walk += st * 0.08;
        if (Math.abs(tx - b.cx) < 1) { b.u = tx === 40 ? 0 : 1600; const P = perim(b.u); b.cx = P.x; b.cy = P.y; b.surf = P.s; go(); }
        break;
      }
    }
    b.vuln = b.state === 'grounded';
    b.redEye = ['webWind', 'dripWind', 'dropWind', 'drop', 'lungeWind', 'lunge'].includes(b.state);
    b.danger = b.state === 'drop';
    spRect(b);
  },
  idleAnim(b) { spRect(b); },
  deadUpdate(b, dt) { b.vy = Math.min(b.vy + GRAV * dt, 1200); b.cy = Math.min(GROUND - 20, b.cy + b.vy * dt); spRect(b); },
  draw(b) {
    const x = b.cx, y = b.cy, ink = b.flash > 0 ? PENCIL : INK;
    if (b.state === 'dropWind') dashedLine(x, y + 24, x, GROUND, RED, 3);
    if (b.state === 'lungeWind') dashedLine(x, GROUND - 6, x + b.face * 300, GROUND - 6, RED, 3);
    if (b.surf === 'C' || b.state === 'dropWind') { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 48); ctx.lineTo(x, y); ctx.stroke(); }
    let nx = 0, ny = 1;
    if (b.state !== 'dead') { if (b.surf === 'L') { nx = 1; ny = 0; } else if (b.surf === 'R') { nx = -1; ny = 0; } else if (b.surf === 'C') { nx = 0; ny = 1; } else { nx = 0; ny = -1; } }
    const tx = -ny, ty = nx;
    ctx.strokeStyle = ink; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
      const along = (i - 1.5) * 10, sw = Math.sin(b.walk + i * 1.7 + (sd > 0 ? 0 : Math.PI)) * 5;
      const k1x = x + tx * along * 1.6 + sd * tx * 6 - nx * 18, k1y = y + ty * along * 1.6 + sd * ty * 6 - ny * 18;
      ctx.beginPath(); ctx.moveTo(x + tx * along * 0.4, y + ty * along * 0.4);
      ctx.lineTo(k1x + tx * sw, k1y + ty * sw);
      ctx.lineTo(x + tx * (along * 2.4 + sw) - nx * 28 * (b.state === 'dead' ? -0.3 : 1) + sd * tx * 4, y + ty * (along * 2.4 + sw) - ny * 28 * (b.state === 'dead' ? -0.3 : 1));
      ctx.stroke();
    }
    ctx.fillStyle = ink; ctx.beginPath(); ctx.ellipse(x + nx * 4, y + ny * 4, 20, 16, Math.atan2(ty, tx), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + nx * 18 + tx * 0, y + ny * 18, 9, 0, Math.PI * 2); ctx.fill();
    const red = b.redEye || ((b.state === 'intro' || b.state === 'roar') && b.roared);
    ctx.fillStyle = red ? RED : PAPER;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(x + nx * 22 + tx * s * 4, y + ny * 22 + ty * s * 4, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - nx * 6 + tx * -8, y - ny * 6 + ty * -8); ctx.lineTo(x - nx * 6 + tx * 8, y - ny * 6 + ty * 8); ctx.stroke();
    if (b.state === 'grounded') stars({ x, y: y - 10, r: 14 });
  },
};

/* ---------- 8. The Ink Mage ---------- */
const MPTS = [{ x: 180, y: 300 }, { x: 780, y: 300 }, { x: 480, y: 205 }, { x: 320, y: 385 }, { x: 640, y: 385 }];
const MAGE = {
  make() { const b = mkBoss(MAGE, { x: 768, y: 272, w: 24, h: 56, hp: 90, phases: [0.66, 0.33], kinematic: true, pt: 1, bx: 780, by: 300, n: 0 }); return b; },
  idleAnim(b) { b.x = b.bx - b.w / 2; b.y = b.by - b.h / 2 + Math.sin(clock * 2.4) * 6; },
  update(b, dt) {
    const p = player, ph = b.phase, k = ph >= 3 ? 0.75 : ph >= 2 ? 0.88 : 1;
    MAGE.idleAnim(b); if (!b.hidden) faceP(b);
    switch (b.state) {
      case 'idle':
        b.t -= dt;
        if (b.t <= 0 && !p.dead) {
          const opts = ['fire', 'fire', 'orb', 'pool', 'tele']; if (ph >= 2) opts.push('ring', 'ring'); if (ph >= 3) opts.push('beam', 'beam', 'sweep');
          const m = pick(opts);
          if (m === 'tele') { b.state = 'tele'; b.t = 0.4; puffAt(b.bx, b.by); b.hidden = true; SFX.dash(); }
          else if (m === 'beam') { const low = Math.random() < 0.5; zone({ x: 20, y: low ? GROUND - 40 : GROUND - 158, w: 920, h: low ? 40 : 96, warn: 1.0, on: 0.45, style: 'beam' }); b.state = 'castWait'; b.t = 1.5; SFX.warn(); }
          else if (m === 'sweep') { b.sweepX = pcx() < 480 ? 900 : 60; tele(b, 'sweepWind', 0.8 * k); }
          else tele(b, m + 'Wind', { fire: 0.5, orb: 0.6, pool: 0.45, ring: 0.7 }[m] * k);
        }
        break;
      case 'tele':
        b.t -= dt;
        if (b.t <= 0) {
          const opts = MPTS.map((q, i) => i).filter(i => i !== b.pt);
          opts.sort((a, c) => Math.abs(MPTS[c].x - pcx()) - Math.abs(MPTS[a].x - pcx()));
          b.pt = opts[Math.random() < 0.6 ? 0 : Math.floor(rnd(1, opts.length))];
          b.bx = MPTS[b.pt].x; b.by = MPTS[b.pt].y; MAGE.idleAnim(b); b.hidden = false; puffAt(b.bx, b.by); b.state = 'idle'; b.t = 0.5 * k;
        }
        break;
      case 'fireWind': b.t -= dt; if (b.t <= 0) { b.state = 'fire'; b.n = ph >= 2 ? 4 : 3; b.t = 0; } break;
      case 'fire':
        b.t -= dt;
        if (b.t <= 0) {
          if (b.n > 0) { b.n--; b.t = 0.15; const sx = b.bx + b.face * 16, sy = b.by - 6, a = Math.atan2(p.y + p.h / 2 - sy, pcx() - sx); shot({ kind: 'fire', x: sx, y: sy, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, r: 9, solidStop: true, life: 3 }); SFX.shoot(); }
          else { b.state = 'idle'; b.t = 0.8 * k; }
        }
        break;
      case 'orbWind': b.t -= dt; if (b.t <= 0) { for (const o of [-1, 1]) shot({ kind: 'orb', x: b.bx + o * 30, y: b.by - 20, vx: o * 120, vy: -80, spd: ph >= 3 ? 200 : 170, r: 11, life: 5.5, destructible: true }); b.state = 'idle'; b.t = 0.9 * k; } break;
      case 'poolWind': b.t -= dt; if (b.t <= 0) { for (const o of [-150, 0, 150]) { const x = clamp(pcx() + o, 70, 890); zone({ x: x - 55, y: GROUND - 14, w: 110, h: 14, warn: 0.9, on: 4, style: 'pool' }); } b.state = 'idle'; b.t = 0.8 * k; } break;
      case 'ringWind':
        b.t -= dt;
        if (b.t <= 0) { const n = 16, gap = Math.floor(rnd(0, n)); for (let i = 0; i < n; i++) { if (i === gap || i === (gap + 1) % n) continue; const a = i / n * Math.PI * 2; shot({ kind: 'fire', x: b.bx, y: b.by, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 8, solidStop: true, life: 4 }); } SFX.shoot(); b.state = 'idle'; b.t = 1.0 * k; }
        break;
      case 'sweepWind': b.t -= dt; if (b.t <= 0) { shot({ kind: 'vbeam', x: b.sweepX, vx: (b.sweepX > 480 ? -1 : 1) * 480, top: 40, life: 4 }); SFX.laser(); b.state = 'idle'; b.t = 1.6 * k; } break;
      case 'castWait': b.t -= dt; if (b.t <= 0) { b.state = 'idle'; b.t = 0.6 * k; } break;
    }
    b.redEye = b.state.endsWith('Wind') || b.state === 'fire' || b.state === 'castWait';
  },
  draw(b) {
    if (b.state === 'sweepWind') dashedLine(b.sweepX, 40, b.sweepX, GROUND, RED, 4, [14, 10]);
    if (b.hidden && b.state !== 'dead') return;
    const casting = b.redEye;
    const pose = b.state === 'dead' ? POSES.hurt() : casting ? POSES.cast(clock) : { lean: 0.02, aF: [0.9, 1.6], aB: [-0.3, 0.2], lF: [0, 0], lB: [0, 0] };
    const r = bstick(b, pose, { robe: true, lw: 3.8, grounded: false });
    const ink = b.flash > 0 ? PENCIL : INK;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(r.head.x - 10, r.head.y + 4); ctx.lineTo(r.head.x - b.face * 4, r.head.y - 22); ctx.lineTo(r.head.x + 10, r.head.y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = casting ? RED : PAPER; ctx.fillRect(r.head.x + b.face * 1, r.head.y - 2, b.face * 5, 3);
    if (b.state !== 'dead') {
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.hB.x, r.hB.y + 26); ctx.lineTo(r.hB.x, r.hB.y - 30); ctx.stroke();
      ctx.fillStyle = casting ? RED : INK; ctx.beginPath(); ctx.arc(r.hB.x, r.hB.y - 34, 6 + (casting ? Math.sin(clock * 20) * 1.5 : 0), 0, Math.PI * 2); ctx.fill();
    }
  },
};

/* ---------- 9. The Giant ---------- */
function giantHand(side) { const hx = side < 0 ? 150 : 810; return { side, x: hx, y: 300, hx, hy: 300, w: 120, h: 64, state: 'rest', t: 0, vy: 0, tx: hx, dir: 1 }; }
const handRect = h => ({ x: h.x - h.w / 2, y: h.y - h.h, w: h.w, h: h.h });
function updateHand(b, h, dt) {
  const p = player, m = x => Math.min(1, dt * x);
  switch (h.state) {
    case 'rest': h.x += (h.hx - h.x) * m(4); h.y += (h.hy + Math.sin(clock * 1.5 + h.side) * 6 - h.y) * m(4); break;
    case 'raise': h.t -= dt; if (h.t > 0.25) h.tx = clamp(pcx(), 110, 850); h.x += (h.tx - h.x) * m(7); h.y += (200 - h.y) * m(6); if (h.t <= 0) { h.state = 'fall'; h.vy = 0; } break;
    case 'fall':
      h.vy = Math.min(h.vy + 3600 * dt, 1800); h.y += h.vy * dt;
      if (overlap(handRect(h), p)) hurtPlayer(1, Math.sign(pcx() - h.x) || 1);
      if (h.y >= GROUND) {
        h.y = GROUND; h.state = 'down'; h.t = 1.9; shake = 16; SFX.slam(); dust(h.x, GROUND, 16);
        b.eyeT = Math.max(b.eyeT, 2.0); floater(480, 250, 'EYE OPEN');
        if (b.phase >= 2) waves.push(mkWave(h.x - 72, GROUND, -1, 380, 500, 24), mkWave(h.x + 72, GROUND, 1, 380, 500, 24));
        const r = handRect(h); if (overlap(r, p)) { hurtPlayer(1, Math.sign(pcx() - h.x) || 1); p.x = pcx() < h.x ? r.x - p.w : r.x + r.w; }
      }
      break;
    case 'down': h.t -= dt; if (h.t <= 0) h.state = 'return'; break;
    case 'return': h.x += (h.hx - h.x) * m(3.5); h.y += (h.hy - h.y) * m(3.5); if (Math.abs(h.y - h.hy) < 4 && Math.abs(h.x - h.hx) < 4) h.state = 'rest'; break;
    case 'sweepPrep': h.t -= dt; h.x += (h.tx - h.x) * m(5); h.y += (GROUND - h.y) * m(5); if (h.t <= 0) { h.y = GROUND; h.state = 'sweep'; h.dir = h.tx < 480 ? 1 : -1; SFX.dash(); } break;
    case 'sweep':
      h.x += h.dir * (b.phase >= 3 ? 780 : 650) * dt;
      if (overlap(handRect(h), p)) hurtPlayer(1, h.dir);
      if (Math.random() < dt * 30) dust(h.x - h.dir * 50, GROUND, 2);
      if ((h.dir > 0 && h.x > 880) || (h.dir < 0 && h.x < 80)) h.state = 'return';
      break;
    case 'clapPrep': h.t -= dt; h.x += (h.tx - h.x) * m(6); h.y += (392 - h.y) * m(6); if (h.t <= 0) h.state = 'clap'; break;
    case 'clap': {
      h.x += -h.side * 1200 * dt;
      if (overlap(handRect(h), p)) hurtPlayer(1, -h.side);
      const stop = h.side < 0 ? 420 : 540;
      if ((h.side < 0 && h.x >= stop) || (h.side > 0 && h.x <= stop)) { h.x = stop; h.state = 'down'; h.t = 0.9; if (h.side < 0) { shake = 16; SFX.slam(); b.eyeT = Math.max(b.eyeT, 1.6); burst(480, 360, 20, INK, 0, 300); } }
      break;
    }
  }
}
const GIANT_MOVES = {
  slam(b, k) { const h = b.hands.slice().sort((a, c) => Math.abs(a.x - pcx()) - Math.abs(c.x - pcx()))[0]; h.state = 'raise'; h.t = 0.7 * k; h.tx = clamp(pcx(), 110, 850); SFX.warn(); },
  sweep(b, k) { const h = pick(b.hands); h.state = 'sweepPrep'; h.t = 0.75 * k; h.tx = h.side < 0 ? 90 : 870; SFX.warn(); },
  clap(b, k) { for (const h of b.hands) { h.state = 'clapPrep'; h.t = 0.8 * k; h.tx = h.side < 0 ? 90 : 870; } zone({ x: 20, y: 328, w: 920, h: 64, warn: 0.8 * k, on: 0.01, dmg: 0, style: 'band' }); SFX.warn(); },
  rocks(b) { const xs = [pcx(), rnd(60, 900), rnd(60, 900), rnd(60, 900), rnd(60, 900)]; xs.forEach((x, i) => skyDrop(clamp(x, 40, 920), 0.9 + i * 0.12, 'rock')); SFX.warn(); },
  laser(b) { b.state = 'laserCharge'; b.t = 0.9; SFX.warn(); },
};
const GIANT = {
  make: () => mkBoss(GIANT, { x: 415, y: 118, w: 130, h: 82, hp: 110, phases: [0.66, 0.33], kinematic: true, eyeT: 0, hands: [giantHand(-1), giantHand(1)], noFace: true }),
  idleAnim(b, dt) { for (const h of b.hands) updateHand(b, h, dt); },
  update(b, dt) {
    const p = player, ph = b.phase, k = ph >= 3 ? 0.75 : ph >= 2 ? 0.87 : 1;
    b.eyeT = Math.max(0, b.eyeT - dt);
    for (const h of b.hands) updateHand(b, h, dt);
    switch (b.state) {
      case 'idle':
        b.t -= dt;
        if (b.t <= 0 && !p.dead && b.hands.every(h => h.state === 'rest')) {
          const opts = ['slam', 'slam', 'sweep']; if (ph >= 2) opts.push('clap', 'rocks'); if (ph >= 3) opts.push('laser', 'slam');
          const m = pick(opts); GIANT_MOVES[m](b, k);
          if (b.state === 'idle') { b.state = 'busy'; b.t = 1.0; }
        }
        break;
      case 'busy': b.t -= dt; if (b.t <= 0 && b.hands.every(h => h.state === 'rest')) { b.state = 'idle'; b.t = 0.6 * k; } break;
      case 'laserCharge':
        b.t -= dt;
        if (b.t <= 0) { const start = pcx() < 480 ? 900 : 60; shot({ kind: 'vbeam', x: start, vx: (start > 480 ? -1 : 1) * 420, top: 200, life: 4 }); SFX.laser(); b.eyeT = 2.6; b.state = 'busy'; b.t = 2.4; }
        break;
    }
    b.redEye = b.state === 'laserCharge';
  },
  block(b) { return b.eyeT <= 0; },
  solids(b, d) { if (b.hands) for (const h of b.hands) if (h.state === 'down') d.push(handRect(h)); },
  deadUpdate(b, dt) { for (const h of b.hands) { h.y = Math.min(GROUND, h.y + 300 * dt); } },
  draw(b) {
    const dead = b.state === 'dead', sink = dead ? Math.min(160, b.deadT * 70) : 0;
    ctx.save(); if (dead) ctx.globalAlpha = Math.max(0.15, 1 - b.deadT * 0.3);
    const hx = 480, hy = 165 + sink, R = 105, ink = b.flash > 0 ? PENCIL : INK;
    ctx.strokeStyle = ink; ctx.lineWidth = 6;
    for (const h of b.hands) {
      const sx = h.side < 0 ? 340 : 620, sy = 250 + sink;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + h.x) / 2 + h.side * 40, Math.min(sy, h.y - 120), h.x, h.y - h.h + 6); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(300, 300 + sink); ctx.quadraticCurveTo(480, 200 + sink, 660, 300 + sink); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.clip(); hatch({ x: hx - R, y: hy + 20, w: R * 2, h: R }, 8, HATCH, 1.2); ctx.restore();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hx - 70, hy - 50); ctx.lineTo(hx - 18, hy - 32); ctx.moveTo(hx + 70, hy - 50); ctx.lineTo(hx + 18, hy - 32); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx - 40, hy + 62); ctx.quadraticCurveTo(hx, hy + 50, hx + 40, hy + 62); ctx.stroke();
    const open = b.eyeT > 0 || b.state === 'laserCharge' || dead;
    if (open) {
      ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(hx, hy, 58, 32, 0, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 4; ctx.stroke();
      const px = clamp((pcx() - hx) * 0.05, -32, 32), py = clamp((player.y - hy) * 0.03, -10, 12);
      ctx.fillStyle = b.redEye ? RED : ink; ctx.beginPath(); ctx.arc(hx + px, hy + py, b.redEye ? 20 : 15, 0, Math.PI * 2); ctx.fill();
      if (b.eyeT > 0 && b.eyeT < 0.5 && (clock * 10 | 0) % 2) { ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(hx, hy, 64, 38, 0, 0, Math.PI * 2); ctx.stroke(); }
    } else { ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hx - 56, hy); ctx.quadraticCurveTo(hx, hy + 22, hx + 56, hy); ctx.stroke(); }
    ctx.restore();
    for (const h of b.hands) {
      const r = handRect(h);
      if (h.state === 'raise') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(h.x, GROUND - 2, 60, 10, 0, 0, Math.PI * 2); ctx.stroke(); bang(h.x, GROUND - 24, 22); }
      if (h.state === 'sweepPrep') dashedLine(h.x, GROUND - 20, h.tx < 480 ? 920 : 40, GROUND - 20, RED, 3);
      ctx.fillStyle = PAPER; ctx.strokeStyle = b.flash > 0 ? PENCIL : INK; ctx.lineWidth = 5;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, 18); else ctx.rect(r.x, r.y, r.w, r.h); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(r.x + i * r.w / 4, r.y + 8); ctx.lineTo(r.x + i * r.w / 4, r.y + 30); } ctx.stroke();
      if (h.state === 'fall' || h.state === 'sweep' || h.state === 'clap') { ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.strokeRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6); }
    }
  },
};

/* ---------- 10. The Shadow ---------- */
const SH_CASTS = {
  rain: { name: 'ARCHER RAIN', t: 0.5, cool: 1.0, fn: () => arrowRain(6) },
  boomer: { name: 'SHIELD THROW', t: 0.45, cool: 0.7, fn: b => shot({ kind: 'boomer', x: bcx(b) + b.face * 20, y: b.y + 24, vx: b.face * 620, vy: 0, dir: b.face, acc: 600, outT: 0.75, spd: 560, r: 16, pierce: true, owner: b, life: 6, red: true }) },
  rocks: { name: 'TWIN ROCKS', t: 0.45, cool: 0.8, fn: b => { for (const o of [-80, 0, 80]) lob(bcx(b), b.y + 8, clamp(pcx() + o, 40, 920), player.y + player.h / 2, 'rock'); } },
  bombs: { name: 'BOMB LOB', t: 0.45, cool: 0.9, fn: b => { for (const o of [-90, 0, 90]) lob(bcx(b), b.y + 8, clamp(pcx() + o, 40, 920), GROUND - 10, 'bomb', { fuse: 1.4, r: 9, er: 56 }); } },
  web: { name: 'SPIDER WEB', t: 0.4, cool: 0.6, fn: b => { const sx = bcx(b), sy = b.y + 20, a0 = Math.atan2(player.y + player.h / 2 - sy, pcx() - sx); for (const a of [-0.16, 0, 0.16]) shot({ kind: 'web', x: sx, y: sy, vx: Math.cos(a0 + a) * 430, vy: Math.sin(a0 + a) * 430, r: 10, life: 3, solidStop: true, dmg: 0 }); } },
  orbs: { name: 'MAGE ORBS', t: 0.5, cool: 0.8, fn: b => { for (const o of [-1, 1]) shot({ kind: 'orb', x: bcx(b) + o * 24, y: b.y, vx: o * 120, vy: -100, spd: 190, r: 11, life: 5, destructible: true }); } },
  beam: { name: 'MAGE BEAM', t: 0.3, cool: 1.4, fn: () => { const low = Math.random() < 0.5; zone({ x: 20, y: low ? GROUND - 40 : GROUND - 158, w: 920, h: low ? 40 : 96, warn: 1.0, on: 0.45, style: 'beam' }); } },
  hand: { name: 'GIANT HAND', t: 0.35, cool: 1.1, fn: () => { const x = clamp(pcx(), 80, 880); zone({ x: x - 65, y: 40, w: 130, h: GROUND - 40, warn: 0.85, on: 0.25, style: 'hand' }); } },
};
function shadowChoose(b, adx, k) {
  const ph = b.phase;
  const base = adx < 100 ? ['combo', 'combo', 'dash', 'shoot'] : ['shoot', 'dash', 'shoot'];
  let opts = base.slice();
  if (ph >= 2) opts = opts.concat(['charge', 'rain', 'tele', 'boomer', 'rocks']);
  if (ph >= 3) opts = opts.concat(['bombs', 'web', 'orbs', 'beam', 'hand', 'bombs', 'hand']);
  const m = pick(opts);
  const say = t => floater(bcx(b), b.y - 22, t, RED);
  switch (m) {
    case 'combo': tele(b, 'comboWind', 0.3 * k); break;
    case 'shoot': tele(b, 'shootWind', 0.3 * k); break;
    case 'dash': faceP(b); tele(b, 'dashWind', 0.4 * k); break;
    case 'charge': faceP(b); tele(b, 'chargeWind', 0.6 * k); say('BRUTE CHARGE'); break;
    case 'tele': b.state = 'vanish'; b.t = 0.25; puffAt(bcx(b), b.y + b.h / 2); say('NINJA STEP'); SFX.dash(); break;
    default: { const c = SH_CASTS[m]; b.state = 'cast'; b.t = c.t * k; b.castFn = c.fn; b.castCool = c.cool; say(c.name); SFX.warn(); }
  }
}
const SHADOW = {
  make() { const b = mkBoss(SHADOW, { x: 800, y: GROUND - 52, w: 22, h: 52, hp: 120, phases: [0.66, 0.33], noOneway: false, airJ: 1, dodgeCd: 0, scarf: [], step: 0 }); for (let i = 0; i < 5; i++) b.scarf.push({ x: 811, y: GROUND - 37 }); return b; },
  update(b, dt) {
    const p = player, ph = b.phase, k = ph >= 3 ? 0.8 : ph >= 2 ? 0.9 : 1, dx = pcx() - bcx(b), adx = Math.abs(dx);
    b.dodgeCd = Math.max(0, b.dodgeCd - dt); if (b.onGround) b.airJ = 1;
    switch (b.state) {
      case 'idle': {
        faceP(b); b.t -= dt;
        const pyB = p.y + p.h, byB = b.y + b.h;
        b.vx = adx > 70 ? b.face * 250 : 0;
        if (pyB < byB - 60 && b.onGround && Math.random() < dt * 3) { b.vy = -660; SFX.jump(); }
        else if (!b.onGround && b.vy > 0 && pyB < byB - 40 && b.airJ > 0) { b.airJ--; b.vy = -600; }
        if (p.atk.step && adx < 80 && b.dodgeCd <= 0 && Math.random() < dt * 6) { b.state = 'dodge'; b.t = 0.2; b.vx = -b.face * 640; b.dodgeCd = 1.6; SFX.dash(); break; }
        if (b.t <= 0 && !p.dead) shadowChoose(b, adx, k);
        break;
      }
      case 'dodge': b.t -= dt; b.vy = 0; b.vx = -b.face * 640; bghost(b, INK2); if (b.t <= 0) { b.state = 'idle'; b.t = 0.3; } break;
      case 'comboWind': b.vx = 0; b.t -= dt; if (b.t <= 0) { b.state = 'combo'; b.step = 1; b.t = 0.2; b.hitDone = false; SFX.swing(); } break;
      case 'combo': {
        b.t -= dt; b.vx = b.face * 60;
        const reach = b.step === 3 ? 56 : 46, hb = { x: b.face > 0 ? b.x + b.w - 4 : b.x + 4 - reach, y: b.y + (b.step === 3 ? 20 : 10), w: reach, h: 28 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) { b.hitDone = true; if (b.step === 3) p.vx = b.face * 520; }
        if (b.t <= 0) { if (b.step < 3) { b.step++; b.t = b.step === 3 ? 0.28 : 0.2; b.hitDone = false; SFX.swing(); } else { b.state = 'cool'; b.t = 0.5 * k; } }
        break;
      }
      case 'shootWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'shoot'; b.n = 3; b.t = 0; } break;
      case 'shoot':
        b.t -= dt; b.vx = 0;
        if (b.t <= 0) {
          if (b.n-- > 0) { b.t = 0.13; const sx = bcx(b) + b.face * 14, sy = b.y + 18, a = Math.atan2(p.y + p.h / 2 - sy, pcx() - sx); shot({ kind: 'bolt', x: sx, y: sy, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, r: 5, solidStop: true, life: 2 }); SFX.shoot(); }
          else { b.state = 'cool'; b.t = 0.4 * k; }
        }
        break;
      case 'dashWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'dash'; b.t = 0.32; SFX.dash(); } break;
      case 'dash': b.t -= dt; b.vx = b.face * 700; b.vy = 0; bghost(b, INK2); if (b.t <= 0 || b.hitWall) { b.state = 'cool'; b.t = 0.4; } break;
      case 'chargeWind': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.state = 'charge'; SFX.dash(); } break;
      case 'charge':
        b.vx = b.face * 620; bghost(b, INK2);
        if (b.hitWall || b.x <= 21 || b.x >= 940 - b.w - 1) { b.state = 'cool'; b.t = 0.8; shake = 10; SFX.slam(); b.vx = -b.face * 120; b.vy = -200; }
        break;
      case 'vanish': b.t -= dt; b.hidden = true; b.vx = 0; if (b.t <= 0) { b.mark = { x: clamp(pcx() - p.face * 60, 40, 920) }; b.state = 'mark'; b.t = 0.45 * k; SFX.warn(); } break;
      case 'mark': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.x = b.mark.x - b.w / 2; b.y = GROUND - b.h; b.vy = 0; b.hidden = false; faceP(b); puffAt(bcx(b), b.y + b.h / 2); b.state = 'slash'; b.t = 0.18; b.hitDone = false; SFX.slash(); } break;
      case 'slash': {
        b.t -= dt; const hb = { x: b.face > 0 ? b.x + b.w - 4 : b.x - 52, y: b.y + 6, w: 56, h: 40 };
        if (!b.hitDone && overlap(hb, p) && hurtPlayer(1, b.face)) b.hitDone = true;
        if (b.t <= 0) { b.state = 'cool'; b.t = 0.5 * k; } break;
      }
      case 'cast': b.t -= dt; b.vx = 0; if (b.t <= 0) { b.castFn(b); b.state = 'cool'; b.t = b.castCool * k; } break;
      case 'cool': b.t -= dt; if (b.onGround) b.vx *= Math.pow(0.001, dt); if (b.t <= 0) { b.state = 'idle'; b.t = rnd(0.35, 0.7) * k; } break;
    }
    b.danger = b.state === 'dash' || b.state === 'charge';
    b.redEye = true;
    const root = b.neck || { x: bcx(b), y: b.y + 15 }, pts = b.scarf; pts[0].x = root.x; pts[0].y = root.y;
    for (let i = 1; i < pts.length; i++) {
      const tx = pts[i - 1].x - b.face * 5.2 - b.vx * 0.006, ty = pts[i - 1].y + 2.6 + Math.sin(clock * 14 + i) * 1.2;
      pts[i].x += (tx - pts[i].x) * 0.35; pts[i].y += (ty - pts[i].y) * 0.35;
      const ddx = pts[i].x - pts[i - 1].x, ddy = pts[i].y - pts[i - 1].y, d = Math.hypot(ddx, ddy); if (d > 6) { pts[i].x = pts[i - 1].x + ddx / d * 6; pts[i].y = pts[i - 1].y + ddy / d * 6; }
    }
  },
  draw(b) {
    if (b.state === 'mark' && b.mark) { const x = b.mark.x; ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 12, GROUND - 40); ctx.lineTo(x + 12, GROUND - 16); ctx.moveTo(x + 12, GROUND - 40); ctx.lineTo(x - 12, GROUND - 16); ctx.stroke(); }
    if (b.hidden && b.state !== 'dead') return;
    if (b.state === 'dashWind' || b.state === 'chargeWind') dashedLine(bcx(b), b.y + 30, bcx(b) + b.face * (b.state === 'chargeWind' ? 900 : 230), b.y + 30, RED, 3);
    if (b.state !== 'dead') { const pts = b.scarf; ctx.strokeStyle = RED; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
    const step = b.step;
    const pose = basePose(b, { comboWind: POSES.wind, combo: () => step === 1 ? POSES.p1() : step === 2 ? POSES.p2() : POSES.kick(), shootWind: POSES.shoot, shoot: POSES.shoot, dashWind: POSES.crouch, dash: POSES.dash, dodge: POSES.dash, chargeWind: POSES.crouch, charge: POSES.dash, slash: POSES.p1, cast: POSES.cast.bind(null, clock) });
    const jx = Math.random() < 0.06 ? rnd(-3, 3) : 0;
    const r = bstick(b, pose, { x: bcx(b) + jx, eye: 'player', eyeColor: RED, lw: 3.6 });
    b.neck = r.neck;
    if (b.state === 'comboWind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 6, 0, Math.PI * 2); ctx.fill(); }
    if (b.state === 'combo' || b.state === 'slash') redSwipe(r.hF.x, r.hF.y, b.face, 24, 3);
  },
};

const BOSS_DEFS = [null,
  () => [BRUTE.make()], () => [ARCHER.make()],
  () => { const a = ROK.make(), c = PELL.make(); a.partner = c; c.partner = a; return [a, c]; },
  () => [NINJA.make()], () => [KNIGHT.make()], () => [BOMBER.make()], () => [SPIDER.make()], () => [MAGE.make()], () => [GIANT.make()], () => [SHADOW.make()]];
