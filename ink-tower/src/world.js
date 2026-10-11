/* ================= world: physics, traps, floors ================= */
function baseWorld(kind, floor) {
  return { kind, floor, w: W, top: 0, bottom: H + 150, t: 0, solids: [], oneways: [], movers: [], crumbles: [], spikes: [], saws: [], lasers: [], fallers: [],
    enemies: [], pickups: [], flags: [], decals: [], hints: [], door: null, ink: null, dynSolids: [], ceiling: false, spawn: { x: 80, y: GROUND } };
}

function landCheck(b, p, prevBottom) {
  if (b.x + b.w > p.x && b.x < p.x + p.w && prevBottom <= p.y + 0.5 && b.y + b.h >= p.y) { b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.standOn = p; return true; }
  return false;
}
function moveBody(b, dt) {
  const S1 = world.solids, S2 = world.dynSolids;
  b.x += b.vx * dt; b.hitWall = false;
  for (let k = 0; k < 2; k++) {
    for (const s of (k ? S2 : S1)) if (overlap(b, s)) {
      if (b.vx > 0) b.x = s.x - b.w; else if (b.vx < 0) b.x = s.x + s.w;
      else if (k) { b.x = (b.x + b.w / 2 < s.x + s.w / 2) ? s.x - b.w : s.x + s.w; } else continue;
      b.vx = 0; b.hitWall = true;
    }
  }
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt; b.onGround = false; b.ride = null; b.standOn = null;
  for (let k = 0; k < 2; k++) {
    for (const s of (k ? S2 : S1)) if (overlap(b, s)) {
      if (b.vy >= 0) { b.y = s.y - b.h; b.onGround = true; b.standOn = s; } else b.y = s.y + s.h;
      b.vy = 0;
    }
  }
  if (b.vy >= 0 && !(b.dropT > 0) && !b.noOneway) {
    for (const p of world.oneways) landCheck(b, p, prevBottom);
    for (const m of world.movers) if (landCheck(b, m, prevBottom)) b.ride = m;
    for (const c of world.crumbles) if (c.state !== 'gone') landCheck(b, c, prevBottom);
  }
}
function pointSolid(x, y) {
  for (const s of world.solids) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  for (const s of world.dynSolids) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  for (const p of world.oneways) if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + 10) return true;
  for (const p of world.movers) if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + 10) return true;
  for (const p of world.crumbles) if (p.state !== 'gone' && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + 10) return true;
  return false;
}
function wallSolid(x, y) {
  for (const s of world.solids) if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  return false;
}
const groundAheadDir = (e, dir) => !e.onGround || pointSolid(dir > 0 ? e.x + e.w + 4 : e.x - 4, e.y + e.h + 6);
const groundAhead = e => groundAheadDir(e, e.face);
const onOneway = p => p.standOn && !world.solids.includes(p.standOn) && !world.dynSolids.includes(p.standOn);

/* ---------- traps ---------- */
const fallerRect = f => ({ x: f.x, y: f.y, w: f.w, h: f.h });
function laserBox(l) { return l.vert ? { x: l.x - 7, y: l.y, w: 14, h: l.len } : { x: l.x, y: l.y - 7, w: l.len, h: 14 }; }
function updateTraps(dt) {
  const w = world, p = player;
  w.t += dt;
  for (const m of w.movers) {
    const a = Math.sin((w.t / m.period) * Math.PI * 2 + m.phase);
    const nx = m.x0 + m.ax * a, ny = m.y0 + m.ay * a;
    m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny;
  }
  if (p.ride) { p.x += p.ride.dx; p.y += p.ride.dy; }
  for (const e of w.enemies) if (e.ride) { e.x += e.ride.dx; e.y += e.ride.dy; }

  for (const c of w.crumbles) {
    if (c.state === 'solid') { if (p.onGround && p.standOn === c) { c.state = 'shake'; c.t = 0.45; } }
    else if (c.state === 'shake') { c.t -= dt; if (c.t <= 0) { c.state = 'gone'; c.t = 3; burst(c.x + c.w / 2, c.y + 4, 12, INK2, 0, 160); SFX.kill(); } }
    else { c.t -= dt; if (c.t <= 0) c.state = 'solid'; }
  }
  for (const s of w.spikes) {
    if (!p.dead && p.vy >= -50 && overlap(p, { x: s.x + 3, y: s.y - 15, w: s.w - 6, h: 15 })) { hurtPlayer(1, p.vx >= 0 ? -1 : 1); p.vy = -540; }
  }
  for (const s of w.saws) {
    const a = Math.sin((w.t / s.period) * Math.PI * 2 + s.phase);
    s.x = s.cx + s.ax * a; s.y = s.cy + s.ay * a; s.rot = (s.rot || 0) + dt * 12;
    if (!p.dead && circleRect(s.x, s.y, s.r - 4, p)) hurtPlayer(1, Math.sign(p.x + p.w / 2 - s.x) || 1);
  }
  for (const l of w.lasers) {
    const cyc = ((w.t + l.offset) % l.period + l.period) % l.period;
    const prev = l.mode;
    l.mode = cyc >= l.period - l.on ? 'on' : cyc >= l.period - l.on - 0.75 ? 'warn' : 'off';
    if (l.mode === 'on' && prev !== 'on' && Math.abs(l.x - p.x) < 900 && Math.abs(l.y - p.y) < 700) SFX.laser();
    if (l.mode === 'on' && !p.dead && overlap(laserBox(l), p)) hurtPlayer(1, p.vx >= 0 ? -1 : 1);
  }
  for (const f of w.fallers) {
    switch (f.state) {
      case 'wait': { const px = p.x + p.w / 2; if (px > f.x - 26 && px < f.x + f.w + 26 && p.y > f.y) { f.state = 'shake'; f.t = 0.42; SFX.warn(); } break; }
      case 'shake': f.t -= dt; if (f.t <= 0) { f.state = 'fall'; f.vy = 0; } break;
      case 'fall':
        f.vy = Math.min(f.vy + 2600 * dt, 1400); f.y += f.vy * dt;
        if (overlap(fallerRect(f), p)) hurtPlayer(1, p.x + p.w / 2 < f.x + f.w / 2 ? -1 : 1);
        if (f.y + f.h >= f.floorY) {
          f.y = f.floorY - f.h; f.state = 'rest'; f.t = 1.5; shake = Math.max(shake, 6); SFX.slam(); dust(f.x + f.w / 2, f.floorY, 10);
          if (overlap(fallerRect(f), p)) { p.x = p.x + p.w / 2 < f.x + f.w / 2 ? f.x - p.w : f.x + f.w; }
        }
        break;
      case 'rest': f.t -= dt; if (f.t <= 0) f.state = 'rise'; break;
      case 'rise': f.y -= 140 * dt; if (f.y <= f.y0) { f.y = f.y0; f.state = 'cool'; f.t = 0.9; } break;
      case 'cool': f.t -= dt; if (f.t <= 0) f.state = 'wait'; break;
    }
  }
  if (w.ink) {
    const k = w.ink;
    if (k.wait > 0) k.wait -= dt;
    else if (k.on) { k.y -= k.speed * dt; k.speed = Math.min(k.max, k.speed + dt * 0.35); }
    if (!k.on && p.y + p.h < k.startY - 30) k.on = true;
    if (!p.dead && p.y + p.h > k.y + 6) inkDeath();
  }
}
function rebuildDyn() {
  const d = world.dynSolids; d.length = 0;
  for (const f of world.fallers) if (f.state === 'rest') d.push(fallerRect(f));
  for (const b of bosses) if (b.def.solids && b.state !== 'dead') b.def.solids(b, d);
}

/* ---------- floor builders ---------- */
function LB(floor, kind = 'level') {
  const w = baseWorld(kind, floor);
  const a = {
    ground(x0, x1) { w.solids.push({ x: x0, y: GROUND, w: x1 - x0, h: 100, ground: true }); },
    block(x, wd, h, base = GROUND) { w.solids.push({ x, y: base - h, w: wd, h }); },
    plat(x, y, wd) { w.oneways.push({ x, y, w: wd }); },
    mover(x, y, wd, ax, ay, period, phase = 0) { w.movers.push({ x, y, w: wd, h: 10, x0: x, y0: y, ax, ay, period, phase, dx: 0, dy: 0 }); },
    crumble(x, y, wd) { w.crumbles.push({ x, y, w: wd, h: 10, state: 'solid', t: 0 }); },
    spikes(x, wd, y = GROUND) { w.spikes.push({ x, y, w: wd }); },
    saw(x, y, r, ax = 0, ay = 0, period = 3, phase = 0) { w.saws.push({ cx: x, cy: y, x, y, r, ax, ay, period, phase }); },
    laser(x, y, len, vert, period, on, offset = 0) { w.lasers.push({ x, y, len, vert, period, on, offset, mode: 'off' }); },
    faller(x, wd = 90, floorY = GROUND) { w.fallers.push({ x, w: wd, h: 38, y0: 36, y: 36, floorY, state: 'wait', t: 0, vy: 0 }); },
    e(type, x, surf = GROUND, elite = false) { w.enemies.push(makeEnemy(type, x, surf, floor, elite)); },
    flag(x, y = GROUND) { w.flags.push({ x, y, active: false }); },
    door(x, y = GROUND) { w.door = { x, y: y - 120, w: 76, h: 120 }; },
    hint(x, y, parts) { w.hints.push({ x, y, parts }); },
    end(L) {
      w.w = L;
      w.solids.push({ x: -60, y: -600, w: 60, h: 1400, wall: true }, { x: L, y: -600, w: 60, h: 1400, wall: true });
    },
  };
  return [w, a];
}
const K = k => ({ k });
const T = t => ({ t });

function buildFloor(n) {
  const fn = [null, floor1, floor2, floor3, floor4, floor5, floor6, floor7, floor8, floor9, floor10][n];
  return fn();
}
function floor1() {
  const [w, a] = LB(1);
  a.ground(0, 4300); a.end(4300);
  a.block(560, 96, 56); a.block(2470, 120, 92); a.block(3270, 80, 60);
  a.plat(2700, 338, 230); a.plat(3420, 330, 210);
  w.enemies.push(makeEnemy('dummy', 960, GROUND, 1, false));
  [1700, 2280, 2360, 3020, 3110, 3700, 3780, 3870].forEach(x => a.e('grunt', x));
  a.e('grunt', 2790, 338); a.e('grunt', 3500, 330);
  a.flag(2150);
  a.hint(80, 300, isTouch ? [K('◀'), K('▶'), T('move')] : [K('A'), K('D'), T('or arrows to move')]);
  a.hint(420, 280, isTouch ? [K('JUMP'), T('jump. Tap again in the air to double jump')] : [K('W'), T('or'), K('SPACE'), T('jump. Press again in the air to double jump')]);
  a.hint(760, 320, [K(KEY.atk), T('attack. Press 3 times for a combo')]);
  a.hint(1250, 300, [K(KEY.shot), T('shoot. It aims at the closest enemy in front of you')]);
  a.hint(1830, 280, [K(KEY.dash), T("dash. You can't be hit while dashing")]);
  a.hint(2230, 240, [T('A red flash means an attack is coming. Get out of the way.')]);
  a.hint(3000, 220, [T('Hits fill your ink meter. When it is full, press'), K(KEY.ult), T('for INK STORM')]);
  a.door(4130);
  return w;
}
function floor2() {
  const [w, a] = LB(2);
  a.ground(0, 760); a.ground(940, 1500); a.ground(1660, 2200); a.ground(2420, 3000); a.ground(3200, 4500); a.end(4500);
  a.hint(90, 300, [T('Gaps are new. Fall in and you lose a heart.')]);
  a.e('grunt', 520);
  a.hint(960, 260, [T('Jumpers crouch, then leap at you. Move when they crouch.')]);
  a.e('jumper', 1250); a.e('jumper', 1400);
  a.e('jumper', 1900); a.e('grunt', 2050); a.flag(1720);
  a.plat(2250, 370, 110);
  a.block(2600, 90, 60); a.e('jumper', 2800); a.e('jumper', 2920);
  a.plat(3060, 360, 90);
  a.e('grunt', 3400); a.e('jumper', 3600); a.e('grunt', 3800); a.e('jumper', 3950);
  a.door(4250);
  return w;
}
function floor3() {
  const [w, a] = LB(3);
  a.ground(0, 1700); a.ground(1880, 2700); a.ground(2860, 4600); a.end(4600);
  a.hint(80, 300, [T('Spikes hurt. Jump over them.')]); a.spikes(480, 84);
  a.hint(640, 240, [T('Throwers lob rocks from far away. Get close or shoot them.')]);
  a.e('thrower', 900); a.spikes(1080, 100);
  a.e('grunt', 1250); a.block(1450, 120, 70); a.e('thrower', 1495, GROUND - 70);
  a.flag(1960); a.spikes(2150, 120); a.e('jumper', 2350); a.e('thrower', 2600);
  a.spikes(3000, 64); a.spikes(3220, 64); a.e('thrower', 3380); a.e('grunt', 3520); a.e('jumper', 3640);
  a.spikes(3900, 90); a.e('thrower', 4100); a.e('grunt', 4200);
  a.door(4370);
  return w;
}
function floor4() {
  const [w, a] = LB(4);
  a.ground(0, 800); a.ground(1300, 2000); a.ground(2500, 3300); a.ground(3700, 4800); a.end(4800);
  a.hint(80, 290, [T('Shield guys block from the front. Get behind them, or kick (third hit) to break the guard.')]);
  a.e('shield', 620);
  a.hint(820, 220, [T('Moving platforms carry you. Time the jump.')]);
  a.mover(880, 400, 110, 140, 0, 4);
  a.flag(1380); a.e('grunt', 1520); a.e('shield', 1780); a.e('thrower', 1950);
  a.mover(2070, 390, 100, 0, 70, 3); a.mover(2300, 340, 100, 70, 0, 3.4, 1.6);
  a.spikes(2700, 80); a.e('shield', 2950); a.e('jumper', 3120);
  a.mover(3390, 370, 110, 100, 0, 3.2);
  a.e('shield', 3900); a.e('thrower', 4100); a.e('shield', 4250);
  a.door(4560);
  return w;
}
function floor5() {
  const [w, a] = LB(5);
  a.ground(0, 1500); a.ground(1700, 3400); a.ground(3820, 4800); a.end(4800);
  a.hint(80, 300, [T('Flyers swoop at you. Your shot aims up at them.')]);
  a.e('flyer', 620); a.e('flyer', 920);
  a.hint(1060, 300, [T('Hanging blocks drop when you walk under them.')]);
  a.faller(1160); a.faller(1300);
  a.plat(1560, 380, 90);
  a.e('shield', 1900); a.e('flyer', 2100); a.flag(1760);
  a.faller(2400); a.faller(2520); a.faller(2640); a.e('grunt', 2760);
  a.spikes(2920, 80); a.e('flyer', 3050); a.e('thrower', 3220);
  a.mover(3470, 380, 110, 100, 0, 3.4);
  a.faller(4000); a.faller(4150); a.e('flyer', 4100); a.e('jumper', 4300);
  a.door(4560);
  return w;
}
function floor6() {
  const [w, a] = LB(6);
  a.ground(0, 900); a.ground(1500, 2300); a.ground(2900, 3800); a.ground(4200, 5000); a.end(5000);
  a.hint(80, 300, [T('Bombers throw bombs. A red blink means it is about to blow.')]);
  a.block(640, 110, 60); a.e('bomber', 680, GROUND - 60);
  a.hint(930, 250, [T('Cracked floors break after you step on them. Keep moving.')]);
  a.crumble(960, 400, 110); a.crumble(1140, 370, 110); a.crumble(1320, 400, 110);
  a.flag(1580); a.e('grunt', 1720); a.e('jumper', 1860); a.plat(2000, 340, 160); a.e('bomber', 2060, 340);
  a.crumble(2370, 390, 100); a.mover(2540, 360, 100, 0, 60, 3); a.crumble(2730, 390, 100);
  a.spikes(3050, 80); a.block(3250, 120, 80); a.e('bomber', 3290, GROUND - 80); a.e('shield', 3500); a.e('flyer', 3620);
  a.crumble(3860, 400, 110); a.crumble(4040, 400, 110);
  a.e('bomber', 4400); a.e('grunt', 4520); a.e('jumper', 4620);
  a.door(4790);
  return w;
}
function floor7() {
  const [w, a] = LB(7);
  a.ground(0, 1500); a.ground(1700, 2600); a.ground(3000, 5000); a.end(5000);
  a.hint(80, 300, [T('Ninjas dash through you. Dash through them first, or jump.')]);
  a.e('ninja', 700);
  a.hint(880, 250, [T('Saws spin and slide. Time your jump.')]);
  a.saw(1050, 432, 26, 120, 0, 3); a.saw(1320, 300, 30, 0, 110, 2.6);
  a.saw(1600, 300, 26, 0, 70, 2);
  a.flag(1780); a.e('ninja', 1950); a.e('thrower', 2150); a.saw(2350, 432, 26, 140, 0, 2.8);
  a.mover(2660, 380, 110, 110, 0, 3); a.saw(2810, 240, 24);
  a.e('ninja', 3200); a.plat(3350, 330, 140); a.e('bomber', 3400, 330);
  a.saw(3700, 432, 28, 150, 0, 2.4); a.e('ninja', 3920); a.e('shield', 4100); a.e('flyer', 4220);
  a.saw(4420, 300, 30, 0, 120, 2.2);
  a.door(4720);
  return w;
}
function floor8() {
  const [w, a] = LB(8);
  a.ground(0, 1500); a.ground(1700, 2600); a.ground(2900, 5200); a.end(5200);
  a.hint(80, 300, [T('Heavies hit for 2 hearts. Lasers flash red before they fire.')]);
  a.e('heavy', 720);
  a.laser(1000, 0, GROUND, true, 2.4, 0.9, 0); a.laser(1250, 0, GROUND, true, 2.4, 0.9, 1.2);
  a.plat(1560, 380, 90);
  a.flag(1780); a.e('heavy', 1950); a.e('ninja', 2150); a.laser(2350, 0, GROUND, true, 2, 0.8, 0.4);
  a.hint(2380, 250, [T('High beam: stay on the ground. Low beam: jump it.')]);
  a.laser(2420, 380, 170, false, 2.6, 1.0, 0);
  a.mover(2660, 380, 110, 90, 0, 3);
  a.laser(2980, 440, 260, false, 2.8, 1.0, 0.5);
  a.e('heavy', 3350); a.e('thrower', 3550); a.e('flyer', 3650);
  a.laser(3820, 0, GROUND, true, 2.6, 0.9, 0); a.laser(3970, 0, GROUND, true, 2.6, 0.9, 0.9); a.laser(4120, 0, GROUND, true, 2.6, 0.9, 1.8);
  a.e('heavy', 4330); a.e('ninja', 4470); a.spikes(4620, 80);
  a.door(4930);
  return w;
}
function floor9() {
  const [w, a] = LB(9);
  a.ground(0, 1400); a.ground(1800, 2800); a.ground(3200, 4400); a.ground(4700, 5600); a.end(5600);
  a.hint(80, 300, [T('Horned enemies are elites. Tougher, faster, quicker to attack.')]);
  a.e('grunt', 620, GROUND, true); a.e('jumper', 820, GROUND, true);
  a.spikes(1000, 80); a.saw(1220, 432, 26, 110, 0, 2.4);
  a.crumble(1460, 400, 100); a.mover(1610, 370, 100, 60, 0, 2.6);
  a.flag(1880); a.e('shield', 2020, GROUND, true); a.block(2150, 100, 70); a.e('thrower', 2190, GROUND - 70, true);
  a.faller(2400); a.faller(2520); a.e('flyer', 2520, GROUND, true);
  a.mover(2860, 380, 110, 100, 0, 3); a.saw(3010, 250, 24);
  a.laser(3350, 0, GROUND, true, 2.4, 0.9, 0); a.laser(3500, 0, GROUND, true, 2.4, 0.9, 1.2);
  a.e('ninja', 3650, GROUND, true); a.block(3760, 110, 70); a.e('bomber', 3800, GROUND - 70, true); a.e('heavy', 4120, GROUND, true);
  a.crumble(4460, 400, 100); a.crumble(4600, 380, 100);
  a.spikes(4800, 70); a.e('heavy', 4960); a.e('ninja', 5120, GROUND, true);
  a.door(5370);
  return w;
}
function floor10() {
  const [w, a] = LB(10, 'climb');
  w.w = W; w.top = -3300; w.bottom = H + 400;
  w.solids.push({ x: -60, y: -4000, w: 80, h: 5000, wall: true }, { x: 940, y: -4000, w: 80, h: 5000, wall: true }, { x: 0, y: GROUND, w: W, h: 100, ground: true });
  const xs = [140, 420, 700, 420, 140, 380, 660, 760, 480, 200, 120, 400, 680, 520, 260, 330, 600, 780, 500, 220, 100, 380, 660, 440, 200, 460, 720, 520, 260, 120, 400, 640, 420, 330];
  const rows = [];
  xs.forEach((x, i) => {
    const y = 360 - 100 * i;
    rows.push({ x, y });
    if (i === 15) { a.plat(x, y, 300); a.flag(x + 150, y); return; }
    if (i === 33) { a.plat(x, y, 300); a.door(x + 112, y); return; }
    if (i % 4 === 3) a.mover(x, y, 160, 50, 0, 3 + (i % 3) * 0.4, i);
    else if (i % 5 === 2 && i > 4) a.crumble(x, y, 160);
    else a.plat(x, y, 160);
  });
  const en = { 2: 'thrower', 6: 'grunt', 9: 'bomber', 12: 'jumper', 17: 'ninja', 19: 'thrower', 21: 'shield', 25: 'bomber', 27: 'ninja', 29: 'heavy', 31: 'thrower' };
  for (const i in en) { const r = rows[i]; a.e(en[i], r.x + 70, r.y, +i > 15); }
  a.e('flyer', 480, rows[8].y + 150); a.e('flyer', 300, rows[23].y + 150, true); a.e('flyer', 640, rows[30].y + 150, true);
  [11, 24].forEach(i => a.laser(20, rows[i].y - 70, 920, false, 3.4, 1.0, i * 0.3));
  a.hint(260, 300, [T('The ink is rising. Climb!')]);
  w.ink = { y: GROUND + 60, startY: GROUND, speed: 30, max: 46, on: false, wait: 0 };
  return w;
}

/* ---------- boss arenas ---------- */
function buildArena(n) {
  const w = baseWorld('arena', n);
  w.solids.push({ x: -40, y: -600, w: 60, h: 1400, wall: true }, { x: 940, y: -600, w: 60, h: 1400, wall: true }, { x: 0, y: GROUND, w: W, h: 100, ground: true });
  const P = (x, y, wd) => w.oneways.push({ x, y, w: wd });
  switch (n) {
    case 1: P(20, 330, 150); P(790, 330, 150); break;
    case 2: P(90, 330, 160); P(400, 250, 160); P(710, 330, 160); break;
    case 3: P(20, 340, 130); P(810, 340, 130); break;
    case 4: P(110, 320, 130); P(720, 320, 130); break;
    case 5: break;
    case 6: P(170, 330, 150); P(640, 330, 150); break;
    case 7: w.ceiling = true; w.solids.push({ x: 0, y: -600, w: W, h: 648, ceil: true }); break;
    case 8: P(120, 350, 130); P(710, 350, 130); break;
    case 9: break;
    case 10: P(20, 330, 150); P(790, 330, 150); P(400, 240, 160); break;
  }
  return w;
}
