/* ================= effects, enemy shots, enemies ================= */
function burst(x, y, n, color = INK, dir = 0, spd = 260) {
  for (let i = 0; i < n; i++) particles.push({ x, y, vx: rnd(-1, 1) * spd + dir * spd * 0.7, vy: -rnd(40, spd * 1.2), life: rnd(0.35, 0.9), r: rnd(1.4, 4.2), color });
  if (particles.length > 700) particles.splice(0, particles.length - 700);
}
function dust(x, y, n = 5) { for (let i = 0; i < n; i++) particles.push({ x: x + rnd(-8, 8), y: y - 1, vx: rnd(-90, 90), vy: -rnd(20, 90), life: rnd(0.2, 0.45), r: rnd(1, 2.4), color: PENCIL }); }
function sparks(x, y) { for (let i = 0; i < 8; i++) particles.push({ x, y, vx: rnd(-220, 220), vy: rnd(-260, 40), life: rnd(0.15, 0.3), r: rnd(1, 2), color: INK }); }
function splat(x, surf) {
  const blobs = []; for (let i = 0; i < 7; i++) blobs.push({ dx: rnd(-26, 26), rx: rnd(3, 11), ry: rnd(1.5, 3.5) });
  world.decals.push({ x, y: surf, blobs }); if (world.decals.length > 60) world.decals.shift();
}
function floater(x, y, txt, color = INK) { floaters.push({ x, y, txt, t: 1.0, color }); }
function heartFall(x) { world.pickups.push({ x: x - 8, y: cam.y - 30, w: 16, h: 15, vx: 0, vy: 0, t: 0 }); floater(x, cam.y + 120, 'A HEART FELL'); }
function explode(x, y, r, dmg = 1) {
  rings.push({ x, y, r, t: 0.35 });
  burst(x, y, 22, INK, 0, 340); burst(x, y, 6, RED, 0, 240);
  shake = Math.max(shake, 10); SFX.boom();
  if (!player.dead && circleRect(x, y, r, player)) hurtPlayer(dmg, Math.sign(player.x + player.w / 2 - x) || 1);
}
function mkWave(x, y, dir, spd, range, h = 26, dmg = 1) { return { x, y, dir, spd, range, h, w: 26, dmg }; }
function updateWaves(dt) {
  for (const w of waves) {
    const step = w.spd * dt; w.x += w.dir * step; w.range -= step;
    if (w.range <= 0 || wallSolid(w.x + w.dir * 14, w.y - 8) || !pointSolid(w.x, w.y + 4)) w.dead = true;
    if (!w.dead && overlap({ x: w.x - w.w / 2, y: w.y - w.h, w: w.w, h: w.h }, player)) hurtPlayer(w.dmg, w.dir);
    if (Math.random() < dt * 40) dust(w.x, w.y, 1);
  }
  waves = waves.filter(w => !w.dead);
}

/* ---------- enemy projectiles ---------- */
function shot(o) { const s = Object.assign({ vx: 0, vy: 0, g: 0, r: 6, life: 5, dmg: 1, kind: 'rock', t: 0, alive: true, wait: 0 }, o); shots.push(s); return s; }
function skyDrop(x, delay, kind = 'arrow') {
  const fall = kind === 'arrow' ? 1500 : 1000;
  const top = cam.y - 40;
  shot({ kind, x, y: top, vy: fall, wait: delay - (GROUND - top) / fall, mark: true, markT: delay, r: kind === 'arrow' ? 6 : 10, solidStop: true, explodeOnHit: kind === 'skybomb', er: 60, life: 6 });
}
function lob(sx, sy, tx, ty, kind, o = {}) {
  const T = clamp(Math.abs(tx - sx) / 420, 0.55, 1.15), g = GRAV * 0.7;
  return shot(Object.assign({ kind, x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy) / T - 0.5 * g * T, g, r: 7, solidStop: kind === 'rock' }, o));
}
function updateShots(dt) {
  const p = player;
  for (const s of shots) {
    if (!s.alive) continue;
    if (s.markT != null) s.markT -= dt;
    if (s.wait > 0) { s.wait -= dt; continue; }
    s.t += dt; s.life -= dt;
    if (s.kind === 'orb') {
      const dx = p.x + p.w / 2 - s.x, dy = p.y + p.h / 2 - s.y, d = Math.hypot(dx, dy) || 1;
      s.vx += (dx / d * s.spd - s.vx) * Math.min(1, dt * 1.5); s.vy += (dy / d * s.spd - s.vy) * Math.min(1, dt * 1.5);
    }
    if (s.kind === 'boomer') {
      const o = s.owner;
      if (s.t < s.outT) s.vx -= s.dir * s.acc * dt;
      else {
        const tx = o ? o.x + o.w / 2 : s.x, ty = o ? o.y + o.h * 0.45 : s.y, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy) || 1;
        s.vx = dx / d * s.spd; s.vy = dy / d * s.spd;
        if (d < 30 || !o || o.state === 'dead') { s.alive = false; if (o) o.shieldOut = false; continue; }
      }
    }
    if (s.kind === 'vbeam') {
      s.x += s.vx * dt;
      if (s.x < 30 || s.x > 930) s.alive = false;
      if (overlap({ x: s.x - 16, y: s.top, w: 32, h: GROUND - s.top }, p)) hurtPlayer(1, Math.sign(s.vx) || 1);
      continue;
    }
    const nx = s.x + s.vx * dt;
    let ny = s.y + (s.vy + s.g * dt) * dt;
    s.vy += s.g * dt;
    if (s.kind === 'bomb' || s.kind === 'roller') {
      if (pointSolid(nx, ny + s.r)) {
        if (s.kind === 'roller') { s.vy = 0; ny = s.y; }
        else { s.vy = -Math.abs(s.vy) * 0.42; s.vx *= 0.7; ny = s.y; if (Math.abs(s.vy) < 70) { s.vy = 0; s.g = 0; } }
      }
      if (s.kind === 'roller' && (wallSolid(nx + Math.sign(s.vx) * s.r, s.y) || s.life <= 0)) { explode(s.x, s.y, s.er || 80, s.dmg); s.alive = false; continue; }
      if (s.kind === 'bomb' && s.g === 0 && !pointSolid(s.x, s.y + s.r + 2)) s.g = GRAV * 0.7;
    }
    if (s.kind === 'mine') {
      if (!s.landed && pointSolid(nx, ny + s.r)) { s.landed = true; s.vx = 0; s.vy = 0; s.g = 0; ny = s.y; s.arm = 0.6; }
      if (s.landed) { s.arm -= dt; if (s.arm <= 0 && circleRect(s.x, s.y, 26, p)) { explode(s.x, s.y, 54, 1); s.alive = false; continue; } }
    }
    s.x = nx; s.y = ny;
    if (s.fuse != null) { s.fuse -= dt; if (s.fuse <= 0) { explode(s.x, s.y, s.er || 56, s.dmg); s.alive = false; continue; } }
    if (s.solidStop && (wallSolid(s.x, s.y) || pointSolid(s.x, s.y + s.r * 0.5))) {
      s.alive = false;
      if (s.explodeOnHit) explode(s.x, s.y, s.er || 60, s.dmg); else burst(s.x, s.y, 5, s.kind === 'drip' ? RED : INK, 0, 140);
      continue;
    }
    if (s.kind !== 'mine' && s.kind !== 'bomb' && !p.dead && circleRect(s.x, s.y, s.r, p)) {
      if (s.kind === 'web') { if (p.dashT <= 0 && !cast) { p.slowT = 2.4; floater(p.x + p.w / 2, p.y - 12, 'SLOWED'); s.alive = false; } }
      else if (s.kind === 'roller') { explode(s.x, s.y, s.er || 80, s.dmg); s.alive = false; }
      else if (s.explodeOnHit) { explode(s.x, s.y, s.er || 60, s.dmg); s.alive = false; }
      else if (hurtPlayer(s.dmg, Math.sign(s.vx) || 1) && !s.pierce) s.alive = false;
    }
    if (s.life <= 0) { if (s.kind === 'mine') explode(s.x, s.y, 54, 1); s.alive = false; }
    if (s.y > world.bottom + 200) s.alive = false;
  }
  shots = shots.filter(s => s.alive);
}
function zone(o) { zones.push(Object.assign({ t: 0, warn: 0.8, on: 0.4, dmg: 1, style: 'band' }, o)); }
function updateZones(dt) {
  for (const z of zones) {
    z.t += dt;
    if (z.t >= z.warn && !z.fired) { z.fired = true; if (z.style === 'beam' || z.style === 'band') SFX.laser(); if (z.style === 'hand') { shake = 14; SFX.slam(); dust(z.x + z.w / 2, GROUND, 14); } }
    if (z.t >= z.warn && z.t < z.warn + z.on && !player.dead && overlap(z, player)) hurtPlayer(z.dmg, Math.sign(player.x + player.w / 2 - (z.x + z.w / 2)) || 1);
  }
  zones = zones.filter(z => z.t < z.warn + z.on);
}
function clearHostile() { shots = shots.filter(s => s.kind === 'boomer'); zones = []; waves = []; }

/* ---------- enemies ---------- */
const ETYPES = {
  grunt: { w: 22, h: 52, hp: 4, spd: 130 },
  jumper: { w: 22, h: 50, hp: 3, spd: 110 },
  thrower: { w: 22, h: 52, hp: 3, spd: 90 },
  shield: { w: 26, h: 56, hp: 5, spd: 70 },
  flyer: { w: 30, h: 24, hp: 2, spd: 120, fly: true },
  bomber: { w: 28, h: 54, hp: 3, spd: 60 },
  ninja: { w: 22, h: 52, hp: 4, spd: 220 },
  heavy: { w: 34, h: 78, hp: 10, spd: 60, heavyBody: true },
  dummy: { w: 26, h: 58, hp: 1e9, spd: 0 },
  clone: { w: 22, h: 54, hp: 1, spd: 200 },
};
function makeEnemy(type, x, surf, floor, elite) {
  const d = ETYPES[type];
  const hpM = (1 + (floor - 1) * 0.07) * (elite ? 1.6 : 1), spM = (1 + (floor - 1) * 0.03) * (elite ? 1.25 : 1);
  const e = { type, x, y: surf - d.h, w: d.w, h: d.h, vx: 0, vy: 0, face: -1, hp: Math.round(d.hp * hpM), state: 'idle', t: rnd(0, 1), home: x, homeSurf: surf,
    flash: 0, alive: true, onGround: false, phase: Math.random() * 6, patrol: false, hitDone: false, elite, spd: d.spd * spM,
    tel: Math.max(0.65, (1 - (floor - 1) * 0.03) * (elite ? 0.8 : 1)), cool: 0, fly: !!d.fly, heavyBody: !!d.heavyBody, wob: 0, wobDir: 1 };
  e.maxHp = e.hp;
  if (e.fly) { e.y = surf - 150 - rnd(0, 40); e.homeY = e.y; }
  return e;
}
function resetEnemy(e) {
  e.x = e.home; e.y = e.fly ? e.homeY : e.homeSurf - e.h; e.vx = e.vy = 0; e.hp = e.maxHp; e.state = 'idle'; e.t = 0; e.flash = 0; e.cool = 0;
}
function pinfo(e) {
  const p = player, dx = (p.x + p.w / 2) - (e.x + e.w / 2), dy = (p.y + p.h) - (e.y + e.h);
  return { dx, dy, adx: Math.abs(dx), ady: Math.abs(dy), alive: !p.dead };
}
function patrol(e, dt) {
  e.t -= dt;
  if (e.t <= 0) { e.t = rnd(1.2, 2.6); e.face = Math.random() < 0.5 ? -1 : 1; e.patrol = Math.random() < 0.6; }
  if (Math.abs(e.x - e.home) > 90) e.face = Math.sign(e.home - e.x);
  e.vx = e.patrol ? e.face * e.spd * 0.42 : 0;
  if (!groundAhead(e)) { e.vx = 0; e.face *= -1; }
}
function chaseWalk(e, spd) { e.vx = e.face * spd; if (!groundAhead(e)) e.vx = 0; }
const meleeBox = (e, reach, yo, hh) => ({ x: e.face > 0 ? e.x + e.w - 2 : e.x + 2 - reach, y: e.y + yo, w: reach, h: hh });

const EUPD = {
  grunt(e, dt) {
    const I = pinfo(e);
    switch (e.state) {
      case 'wind': e.t -= dt; e.vx = 0; if (e.t <= 0) { e.state = 'punch'; e.t = 0.14; e.hitDone = false; e.vx = e.face * 90; SFX.swing(); } break;
      case 'punch': e.t -= dt; if (!e.hitDone && overlap(meleeBox(e, 42, 8, 26), player) && hurtPlayer(1, e.face)) e.hitDone = true; if (e.t <= 0) { e.state = 'cool'; e.t = 0.75 * e.tel; } break;
      case 'cool': e.t -= dt; e.vx *= Math.pow(0.001, dt); if (e.t <= 0) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 430 && I.ady < 110) {
          e.state = 'chase'; e.face = Math.sign(I.dx) || e.face;
          if (I.adx < 44 && I.ady < 40) { e.state = 'wind'; e.t = 0.42 * e.tel; e.vx = 0; SFX.warn(); } else chaseWalk(e, e.spd);
        } else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  jumper(e, dt) {
    const I = pinfo(e);
    switch (e.state) {
      case 'crouch': e.t -= dt; e.vx = 0; if (e.t <= 0) { e.state = 'leap'; e.vy = -640; e.vx = clamp(I.dx / 0.85, -380, 380); e.face = Math.sign(I.dx) || e.face; e.onGround = false; e.air = 0; SFX.jump(); } break;
      case 'leap': e.air += dt; if (overlap(e, player)) hurtPlayer(1, e.face); if (e.onGround && e.air > 0.1) { e.state = 'rest'; e.t = 0.7 * e.tel; e.vx = 0; dust(e.x + e.w / 2, e.y + e.h, 6); } break;
      case 'rest': e.t -= dt; e.vx *= Math.pow(0.001, dt); if (e.t <= 0) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 380 && I.ady < 160) {
          e.state = 'chase'; e.face = Math.sign(I.dx) || e.face;
          if (I.adx < 300 && e.onGround && e.cool <= 0) { e.state = 'crouch'; e.t = 0.45 * e.tel; e.cool = 1.2; SFX.warn(); } else chaseWalk(e, e.spd);
        } else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  thrower(e, dt) {
    const I = pinfo(e);
    switch (e.state) {
      case 'wind': e.t -= dt; e.vx = 0; if (e.t <= 0) {
        const p = player; lob(e.x + e.w / 2 + e.face * 10, e.y + 8, p.x + p.w / 2, p.y + p.h / 2, 'rock'); SFX.swing();
        e.state = 'cool'; e.t = 1.3 * e.tel + 0.3; } break;
      case 'cool': e.t -= dt; e.vx *= Math.pow(0.01, dt); if (e.t <= 0) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 520 && I.ady < 240) {
          e.state = 'chase'; e.face = Math.sign(I.dx) || e.face;
          if (I.adx < 190) { e.vx = -e.face * e.spd; if (!groundAheadDir(e, -e.face)) e.vx = 0; }
          else if (I.adx > 440) chaseWalk(e, e.spd);
          else { e.vx = 0; e.state = 'wind'; e.t = 0.55 * e.tel; SFX.warn(); }
        } else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  shield(e, dt) {
    const I = pinfo(e);
    switch (e.state) {
      case 'wind': e.t -= dt; e.vx = 0; if (e.t <= 0) { e.state = 'bash'; e.t = 0.18; e.hitDone = false; e.vx = e.face * 320; SFX.swing(); } break;
      case 'bash': e.t -= dt; if (!e.hitDone && overlap(meleeBox(e, 40, 4, e.h - 8), player) && hurtPlayer(1, e.face)) e.hitDone = true; if (e.t <= 0) { e.state = 'cool'; e.t = 0.8; } break;
      case 'cool': e.t -= dt; e.vx *= Math.pow(0.001, dt); if (e.t <= 0) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 420 && I.ady < 110) {
          e.state = 'chase'; const want = Math.sign(I.dx) || e.face;
          if (want !== e.face) { e.turnT = (e.turnT || 0) + dt; e.vx = 0; if (e.turnT > 0.55 * e.tel) { e.face = want; e.turnT = 0; } }
          else { e.turnT = 0; if (I.adx < 58 && I.ady < 40) { e.state = 'wind'; e.t = 0.45 * e.tel; SFX.warn(); } else chaseWalk(e, e.spd); }
        } else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  flyer(e, dt) {
    const I = pinfo(e), p = player;
    switch (e.state) {
      case 'aim': e.t -= dt; e.vx *= 0.9; e.vy *= 0.9;
        if (e.t <= 0.2 && !e.locked) e.locked = { x: p.x + p.w / 2, y: p.y + p.h / 2 };
        if (e.t <= 0) { const L = e.locked || { x: p.x, y: p.y }, dx = L.x - (e.x + e.w / 2), dy = L.y - (e.y + e.h / 2), d = Math.hypot(dx, dy) || 1;
          e.vx = dx / d * 560; e.vy = dy / d * 560; e.state = 'dive'; e.t = 0.8; e.locked = null; SFX.dash(); }
        break;
      case 'dive': e.t -= dt; if (overlap(e, p)) hurtPlayer(1, Math.sign(e.vx) || 1); if (e.t <= 0 || pointSolid(e.x + e.w / 2, e.y + e.h)) { e.state = 'rise'; e.t = 1.0; } break;
      case 'rise': e.t -= dt; e.vx += ((e.home - e.x) * 0.8 - e.vx) * Math.min(1, dt * 3); e.vy += ((e.homeY - e.y) * 1.5 - e.vy) * Math.min(1, dt * 4); if (e.t <= 0) { e.state = 'idle'; e.cool = 1.2 * e.tel; } break;
      default: {
        e.phase += dt; const tx = e.home + Math.sin(e.phase * 0.9) * 70, ty = e.homeY + Math.sin(e.phase * 2.1) * 18;
        e.vx = (tx - e.x) * 2; e.vy = (ty - e.y) * 3; e.face = Math.sign(I.dx) || e.face;
        const d = Math.hypot(I.dx, (p.y + p.h / 2) - (e.y + e.h / 2));
        if (I.alive && d < 380 && e.cool <= 0) { e.state = 'aim'; e.t = 0.6 * e.tel; e.locked = null; SFX.warn(); }
      }
    }
  },
  bomber(e, dt) {
    const I = pinfo(e);
    switch (e.state) {
      case 'wind': e.t -= dt; e.vx = 0; if (e.t <= 0) {
        const p = player; lob(e.x + e.w / 2 + e.face * 10, e.y + 6, p.x + p.w / 2 + rnd(-20, 20), p.y + p.h, 'bomb', { fuse: 1.4, r: 8, er: 56, solidStop: false }); SFX.swing();
        e.state = 'cool'; e.t = 1.8 * e.tel; } break;
      case 'cool': e.t -= dt; e.vx *= Math.pow(0.01, dt); if (e.t <= 0) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 500 && I.ady < 240) { e.state = 'chase'; e.face = Math.sign(I.dx) || e.face; e.vx = 0; e.state = 'wind'; e.t = 0.55 * e.tel; SFX.warn(); }
        else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  ninja(e, dt) {
    const I = pinfo(e), p = player;
    switch (e.state) {
      case 'aim': e.t -= dt; e.vx = 0; if (e.t <= 0) { e.state = 'dash'; e.t = 0.34; e.hitDone = false; SFX.dash(); } break;
      case 'dash':
        e.t -= dt; e.vx = e.face * 720; if (!groundAhead(e)) { e.vx = 0; e.t = 0; }
        e.ghostT = (e.ghostT || 0) - dt; if (e.ghostT <= 0) { e.ghostT = 0.03; ghosts.push({ x: e.x + e.w / 2, y: e.y + e.h, face: e.face, life: 0.2, ink: INK2 }); }
        if (!e.hitDone && overlap(e, p) && hurtPlayer(1, e.face)) e.hitDone = true;
        if (e.t <= 0) { e.state = 'cool'; e.t = 0.8 * e.tel; } break;
      case 'cool': e.t -= dt; e.vx *= Math.pow(0.001, dt); if (e.t <= 0) e.state = 'chase'; break;
      case 'flip': e.t += dt; if (e.onGround && e.t > 0.15) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 460 && I.ady < 110) {
          e.state = 'chase'; e.face = Math.sign(I.dx) || e.face;
          if (p.atk.step && I.adx < 80 && e.onGround && e.cool <= 0 && Math.random() < dt * 4) { e.state = 'flip'; e.t = 0; e.vx = -e.face * 330; e.vy = -480; e.onGround = false; e.cool = 1.2; break; }
          if (I.adx < 320 && e.cool <= 0 && I.ady < 40) { e.state = 'aim'; e.t = 0.38 * e.tel; e.cool = 1.4; SFX.warn(); }
          else if (I.adx > 140) chaseWalk(e, e.spd); else e.vx = 0;
        } else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  heavy(e, dt) {
    const I = pinfo(e);
    switch (e.state) {
      case 'wind': e.t -= dt; e.vx = 0; if (e.t <= 0) {
        e.state = 'pound'; e.t = 0.5; shake = Math.max(shake, 10); SFX.slam();
        const cx = e.x + e.w / 2, gy = e.y + e.h;
        if (overlap({ x: cx - 80, y: gy - 44, w: 160, h: 44 }, player)) hurtPlayer(2, Math.sign(player.x - cx) || 1);
        waves.push(mkWave(cx - 34, gy, -1, 330, 210, 22, 1), mkWave(cx + 34, gy, 1, 330, 210, 22, 1)); dust(cx, gy, 14);
      } break;
      case 'pound': e.t -= dt; if (e.t <= 0) { e.state = 'cool'; e.t = 0.9 * e.tel; } break;
      case 'cool': e.t -= dt; e.vx *= Math.pow(0.01, dt); if (e.t <= 0) e.state = 'chase'; break;
      default:
        if (I.alive && I.adx < 420 && I.ady < 120) {
          e.state = 'chase'; e.face = Math.sign(I.dx) || e.face;
          if (I.adx < 85 && I.ady < 60) { e.state = 'wind'; e.t = 0.7 * e.tel; SFX.warn(); } else chaseWalk(e, e.spd);
        } else { e.state = 'idle'; patrol(e, dt); }
    }
  },
  clone(e, dt) {
    const I = pinfo(e), p = player;
    switch (e.state) {
      case 'aim': e.t -= dt; e.vx = 0; if (e.t <= 0) { e.state = 'dash'; e.t = 0.6; e.hitDone = false; SFX.dash(); } break;
      case 'dash':
        e.t -= dt; e.vx = e.face * 780;
        if (!e.hitDone && overlap(e, p) && hurtPlayer(1, e.face)) e.hitDone = true;
        if (e.t <= 0 || e.hitWall) { e.state = 'idle'; e.t = rnd(1.0, 1.8); e.vx = 0; } break;
      default:
        e.t -= dt; e.face = Math.sign(I.dx) || e.face; e.vx = I.adx > 200 ? e.face * 140 : 0;
        if (e.t <= 0 && I.alive) { e.state = 'aim'; e.t = 0.5; SFX.warn(); }
    }
  },
  dummy() {},
};
function updateEnemy(e, dt) {
  e.flash = Math.max(0, e.flash - dt); e.cool = Math.max(0, e.cool - dt);
  if (e.type === 'dummy') { e.wob = Math.max(0, e.wob - dt * 1.6); return; }
  e.phase += dt * Math.abs(e.vx) * 0.05;
  if (e.state === 'stun') { e.t -= dt; e.vx *= Math.pow(0.02, dt); if (e.fly) e.vy *= Math.pow(0.05, dt); if (e.t <= 0) e.state = 'chase'; }
  else EUPD[e.type](e, dt);
  if (!e.fly) { e.vy = Math.min(e.vy + GRAV * dt, 1100); moveBody(e, dt); }
  else { e.x += e.vx * dt; e.y += e.vy * dt; }
  if (e.y > world.bottom) e.alive = false;
}
function hitEnemy(e, dmg, dir, o) {
  const cx = e.x + e.w / 2;
  if (e.type === 'dummy') { e.wob = 1; e.wobDir = dir; e.flash = 0.1; if (o.heavy) floater(cx, e.y - 16, 'COMBO!'); return true; }
  if (e.type === 'shield' && o.src !== 'ult' && e.state !== 'stun' && Math.sign((o.fromX != null ? o.fromX : player.x) - cx) === e.face) {
    sparks(cx + e.face * 14, e.y + 20); SFX.block(); e.vx = -e.face * 60;
    if (o.heavy) { e.state = 'stun'; e.t = 0.75; floater(cx, e.y - 14, 'GUARD BROKEN'); } else floater(cx, e.y - 14, 'BLOCK', PENCIL);
    return false;
  }
  e.hp -= dmg; e.flash = 0.12;
  if (e.type === 'clone') { killEnemy(e, dir); return true; }
  if (!e.heavyBody || o.heavy || o.src === 'ult') {
    e.state = 'stun'; e.t = e.heavyBody ? 0.3 : o.stun; e.vx = dir * o.kb * (e.heavyBody ? 0.25 : 1);
    if (o.heavy && !e.heavyBody && !e.fly) e.vy = -260;
    if (e.fly) e.vy = -120;
  }
  if (e.hp <= 0) killEnemy(e, dir);
  return true;
}
function killEnemy(e, dir) {
  e.alive = false;
  if (e.type === 'clone') { burst(e.x + e.w / 2, e.y + e.h / 2, 16, PENCIL, dir, 220); floater(e.x + e.w / 2, e.y - 12, 'FAKE', PENCIL); SFX.block(); return; }
  SFX.kill(); shake = Math.max(shake, 6);
  burst(e.x + e.w / 2, e.y + e.h * 0.4, 26, INK, dir, 300);
  if (e.onGround) splat(e.x + e.w / 2, e.y + e.h);
  gainMeter(10);
  const chance = player.hp < player.maxHp ? 0.3 : 0.1;
  if (Math.random() < chance) world.pickups.push({ x: e.x + e.w / 2 - 8, y: e.y + 10, w: 16, h: 15, vx: 0, vy: -320, t: 0 });
}
