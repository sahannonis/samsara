/* ================= drawing ================= */
const POSES = {
  idle: t => ({ lean: 0.04 + Math.sin(t * 2.2) * 0.02, aF: [0.22, 0.42], aB: [-0.18, 0.05], lF: [0.12, 0.02], lB: [-0.12, -0.02] }),
  run: ph => { const s = Math.sin(ph), c = Math.cos(ph), tF = s * 0.8, tB = -s * 0.8;
    return { lean: 0.2, lF: [tF, tF - 0.25 - 0.7 * Math.max(0, -c)], lB: [tB, tB - 0.25 - 0.7 * Math.max(0, c)], aF: [-s * 0.9, -s * 0.9 + 1.1], aB: [s * 0.9, s * 0.9 + 1.1] }; },
  jump: () => ({ lean: 0.08, lF: [0.8, -0.15], lB: [-0.25, -0.95], aF: [2.5, 2.9], aB: [-2.1, -2.6] }),
  fall: () => ({ lean: 0.02, lF: [0.35, 0.05], lB: [-0.3, 0.15], aF: [1.9, 2.3], aB: [-1.9, -2.3] }),
  p1: () => ({ lean: 0.16, aF: [1.57, 1.57], aB: [0.45, 2.0], lF: [0.45, 0.2], lB: [-0.42, -0.1] }),
  p2: () => ({ lean: 0.22, aB: [1.57, 1.57], aF: [0.55, 2.1], lF: [0.5, 0.25], lB: [-0.45, -0.15] }),
  kick: () => ({ lean: -0.32, lF: [1.62, 1.62], lB: [-0.12, 0.04], aF: [-0.9, -0.4], aB: [-1.7, -1.2] }),
  shoot: () => ({ lean: 0.05, aF: [1.57, 1.57], aB: [0.35, 1.3], lF: [0.2, 0.05], lB: [-0.2, -0.05] }),
  dash: () => ({ lean: 0.6, lF: [0.95, 0.25], lB: [-0.95, -0.45], aF: [-1.35, -1.0], aB: [-1.65, -1.25] }),
  hurt: () => ({ lean: -0.38, aF: [2.6, 2.2], aB: [-2.4, -2.85], lF: [0.45, 0.15], lB: [-0.2, 0.25] }),
  wind: () => ({ lean: -0.18, aF: [-1.1, 0.2], aB: [0.8, 1.7], lF: [0.42, 0.12], lB: [-0.42, -0.2] }),
  crouch: () => ({ lean: 0.32, aF: [0.6, 1.4], aB: [-0.4, 0.6], lF: [0.95, -0.35], lB: [-0.55, 0.45] }),
  stun: t => ({ lean: -0.1 + Math.sin(t * 9) * 0.08, aF: [0.1, 0.05], aB: [-0.1, -0.05], lF: [0.25, -0.1], lB: [-0.25, 0.1] }),
  roar: t => ({ lean: -0.22, aF: [2.3 + Math.sin(t * 30) * 0.08, 2.7], aB: [-2.3, -2.7], lF: [0.4, 0.1], lB: [-0.4, -0.1] }),
  cast: t => ({ lean: -0.05, aF: [2.9, 3.05 + Math.sin(t * 8) * 0.05], aB: [-2.9, -3.05], lF: [0.25, 0.05], lB: [-0.25, -0.05] }),
  throw: () => ({ lean: 0.15, aF: [2.2, 1.6], aB: [0.2, 0.6], lF: [0.4, 0.15], lB: [-0.35, -0.1] }),
};
function drawStick(o) {
  const c = ctx, s = o.s || 1, f = o.face, P = o.pose;
  const L1 = 10.5 * s, L2 = 9.5 * s, A1 = 10 * s, A2 = 9.5 * s;
  c.save(); c.translate(o.x, o.y); if (o.rot) c.rotate(o.rot); if (o.alpha != null) c.globalAlpha *= o.alpha;
  let hipY = -20 * s;
  if (o.grounded && !o.robe) { const ext = l => Math.cos(l[0]) * L1 + Math.cos(l[1]) * L2; hipY = -Math.max(ext(P.lF), ext(P.lB)); }
  const hip = { x: 0, y: hipY }, lean = P.lean;
  const neck = { x: Math.sin(lean) * f * 18 * s, y: hipY - Math.cos(lean) * 18 * s };
  const hr = 6.5 * s * (o.headScale || 1);
  const head = { x: neck.x + Math.sin(lean) * f * (hr + 1.5 * s), y: neck.y - Math.cos(lean) * (hr + 1.5 * s) };
  const sh = { x: hip.x + (neck.x - hip.x) * 0.86, y: hip.y + (neck.y - hip.y) * 0.86 };
  c.strokeStyle = o.ink; c.fillStyle = o.ink; c.lineWidth = o.lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const limb = (r, a, l1, l2) => {
    const k = { x: r.x + Math.sin(a[0]) * f * l1, y: r.y + Math.cos(a[0]) * l1 };
    const e = { x: k.x + Math.sin(a[1]) * f * l2, y: k.y + Math.cos(a[1]) * l2 };
    c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(k.x, k.y); c.lineTo(e.x, e.y); c.stroke(); return e;
  };
  if (o.robe) { c.beginPath(); c.moveTo(hip.x - 5 * s, hip.y - 8 * s); c.lineTo(hip.x + 5 * s, hip.y - 8 * s); c.lineTo(hip.x + 13 * s, 0); c.lineTo(hip.x - 13 * s, 0); c.closePath(); c.fill(); }
  else limb(hip, P.lB, L1, L2);
  const hB = limb(sh, P.aB, A1, A2);
  c.lineWidth = o.lw * (o.torso || 1); c.beginPath(); c.moveTo(hip.x, hip.y); c.lineTo(neck.x, neck.y); c.stroke(); c.lineWidth = o.lw;
  if (!o.robe) limb(hip, P.lF, L1, L2);
  const hF = limb(sh, P.aF, A1, A2);
  c.beginPath(); c.arc(head.x, head.y, hr, 0, Math.PI * 2);
  if (o.head === 'fill') c.fill(); else { c.fillStyle = PAPER; c.fill(); c.stroke(); }
  if (o.hair) {
    c.lineWidth = o.lw * 0.7; c.beginPath();
    for (let i = -1; i <= 1; i++) { const a = -Math.PI / 2 + i * 0.5 - f * 0.25; c.moveTo(head.x + Math.cos(a) * hr * 0.9, head.y + Math.sin(a) * hr * 0.9); c.lineTo(head.x + Math.cos(a - f * 0.3) * hr * 1.6, head.y + Math.sin(a - f * 0.3) * hr * 1.6); }
    c.stroke();
  }
  if (o.eye === 'player') { c.fillStyle = o.eyeColor || PAPER; c.fillRect(head.x + f * hr * 0.15, head.y - hr * 0.32, f * hr * 0.6, hr * 0.3); }
  else if (o.eye === 'grunt') { c.fillStyle = o.ink; c.beginPath(); c.arc(head.x + f * hr * 0.45, head.y - hr * 0.1, Math.max(1.2, hr * 0.17), 0, Math.PI * 2); c.fill(); }
  else if (o.eye === 'boss') {
    c.fillStyle = o.eyeColor || PAPER;
    for (const k of [0.08, 0.55]) {
      c.beginPath(); const ex = head.x + f * hr * k, ey = head.y - hr * 0.12;
      c.moveTo(ex, ey); c.lineTo(ex + f * hr * 0.34, ey + hr * 0.06 * (k > 0.3 ? -1 : 1) - hr * 0.08); c.lineTo(ex + f * hr * 0.34, ey + hr * 0.2); c.lineTo(ex, ey + hr * 0.22); c.closePath(); c.fill();
    }
  }
  c.restore();
  const W2 = p => ({ x: o.x + p.x, y: o.y + p.y });
  return { hF: W2(hF), hB: W2(hB), head: { x: o.x + head.x, y: o.y + head.y, r: hr }, neck: W2(neck), hip: W2(hip) };
}
function horns(h) {
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(h.x - h.r * 0.6, h.y - h.r * 0.7); ctx.lineTo(h.x - h.r * 1.0, h.y - h.r * 1.9);
  ctx.moveTo(h.x + h.r * 0.6, h.y - h.r * 0.7); ctx.lineTo(h.x + h.r * 1.0, h.y - h.r * 1.9); ctx.stroke();
}
function heart(cx, y, s, fill) {
  ctx.beginPath();
  ctx.moveTo(cx, y + s * 0.28);
  ctx.bezierCurveTo(cx, y, cx - s * 0.5, y, cx - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(cx - s * 0.5, y + s * 0.6, cx, y + s * 0.72, cx, y + s * 0.95);
  ctx.bezierCurveTo(cx, y + s * 0.72, cx + s * 0.5, y + s * 0.6, cx + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(cx + s * 0.5, y, cx, y, cx, y + s * 0.28);
  ctx.closePath(); if (fill) ctx.fill(); else ctx.stroke();
}
function redSwipe(x, y, face, r, lw = 3) {
  ctx.strokeStyle = RED; ctx.lineWidth = lw; ctx.beginPath();
  ctx.arc(x - face * r * 0.4, y, r, face > 0 ? -0.9 : Math.PI - 0.9, face > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
}
function bang(x, y, size = 20) { ctx.fillStyle = RED; ctx.font = `${size}px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('!', x, y); }
function dashedLine(x1, y1, x2, y2, color = RED, lw = 3, dash = [12, 10]) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.lineDashOffset = -clock * 60;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

/* ---------- background & world ---------- */
function hatch(r, gap = 12, color = HATCH, lw = 1.2) {
  const x0 = Math.max(r.x, cam.x - 20), x1 = Math.min(r.x + r.w, cam.x + W + 20);
  const y0 = Math.max(r.y, cam.y - 20), y1 = Math.min(r.y + r.h, cam.y + H + 20);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath();
  const hgt = y1 - y0;
  for (let x = Math.floor((x0 - hgt) / gap) * gap; x < x1; x += gap) { ctx.moveTo(x, y1); ctx.lineTo(x + hgt, y0); }
  ctx.stroke(); ctx.restore();
}
function drawBackground() {
  ctx.strokeStyle = RULE; ctx.lineWidth = 1; ctx.beginPath();
  const oy = ((-cam.y * 0.5) % 34 + 34) % 34;
  for (let y = oy + 12; y < H; y += 34) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  const off = (cam.x * 0.35) % 520;
  ctx.strokeStyle = FAINT; ctx.lineWidth = 1.5;
  for (let i = -1; i < 3; i++) {
    const x = i * 520 - off + 140;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.moveTo(x + 46, 0); ctx.lineTo(x + 46, H); ctx.stroke();
    const oy2 = ((-cam.y * 0.35) % 40 + 40) % 40;
    ctx.beginPath(); for (let y = oy2 - 40; y < H; y += 40) { ctx.moveTo(x, y); ctx.lineTo(x + 46, y + 14); } ctx.stroke();
  }
  ctx.save(); ctx.font = `300px ${FD}`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.strokeStyle = FAINT; ctx.lineWidth = 2;
  ctx.strokeText(String(curFloor).padStart(2, '0'), W - 40, 380);
  ctx.restore();
}
function drawHint(h) {
  let x = h.x; const y = h.y;
  for (const part of h.parts) {
    if (part.k) {
      ctx.font = `13px ${FD}`; const tw = ctx.measureText(part.k).width; const bw = Math.max(28, tw + 16);
      ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y - 21, bw, 28, 4); else ctx.rect(x, y - 21, bw, 28); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 3, y + 10); ctx.lineTo(x + bw + 1, y + 10); ctx.lineTo(x + bw + 3, y - 18); ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(part.k, x + bw / 2, y - 6);
      x += bw + 10;
    } else {
      ctx.font = `21px ${FH}`; ctx.fillStyle = INK2; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(part.t, x, y - 5); x += ctx.measureText(part.t).width + 10;
    }
  }
}
const vis = (x, w, pad = 40) => x + w > cam.x - pad && x < cam.x + W + pad;
function drawWorld() {
  const wd = world;
  for (const d of wd.decals) {
    ctx.fillStyle = INK; ctx.globalAlpha = 0.85;
    for (const b of d.blobs) { ctx.beginPath(); ctx.ellipse(d.x + b.dx, d.y - 1, b.rx, b.ry, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  for (const h of wd.hints) if (h.x < cam.x + W && h.x + 900 > cam.x) drawHint(h);
  for (const f of wd.flags) {
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - 96); ctx.stroke();
    const wv = Math.sin(clock * 5) * 4;
    ctx.beginPath(); ctx.moveTo(f.x, f.y - 96); ctx.quadraticCurveTo(f.x + 22, f.y - 92 + wv, f.x + 44, f.y - 84); ctx.lineTo(f.x, f.y - 70); ctx.closePath();
    ctx.lineWidth = 2.5; ctx.fillStyle = f.active ? INK : PAPER; ctx.fill(); ctx.stroke();
  }
  const d = wd.door;
  if (d) {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(d.x, d.y + d.h); ctx.lineTo(d.x, d.y + d.w / 2); ctx.arc(d.x + d.w / 2, d.y + d.w / 2, d.w / 2, Math.PI, 0); ctx.lineTo(d.x + d.w, d.y + d.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(d.x - 12, d.y + d.h); ctx.lineTo(d.x - 12, d.y + d.w / 2 - 4); ctx.arc(d.x + d.w / 2, d.y + d.w / 2 - 4, d.w / 2 + 12, Math.PI, 0); ctx.lineTo(d.x + d.w + 12, d.y + d.h); ctx.stroke();
    if ((clock % 3.2) > 0.12) { ctx.fillStyle = RED; ctx.fillRect(d.x + 24, d.y + 56, 8, 4); ctx.fillRect(d.x + 44, d.y + 56, 8, 4); }
    ctx.font = `14px ${FD}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(BOSS_INFO[curFloor].name, d.x + d.w / 2, d.y - 28);
    ctx.font = `17px ${FH}`; ctx.fillStyle = INK2; ctx.fillText('walk in when ready', d.x + d.w / 2, d.y - 8);
  }
  for (const s of wd.solids) {
    if (!vis(s.x, s.w, 10)) continue;
    if (s.ground) { hatch(s, 13); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y + 1.5); ctx.lineTo(s.x + s.w, s.y + 1.5); ctx.stroke(); }
    else if (s.ceil) { ctx.fillStyle = PAPER; ctx.fillRect(s.x, s.y, s.w, s.h); hatch(s, 10); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, s.y + s.h - 1.5); ctx.lineTo(W, s.y + s.h - 1.5); ctx.stroke(); }
    else if (s.wall) { ctx.fillStyle = PAPER; ctx.fillRect(s.x, s.y, s.w, s.h); hatch(s, 9); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); const ex = s.x > 100 ? s.x + 1.5 : s.x + s.w - 1.5; ctx.moveTo(ex, s.y); ctx.lineTo(ex, s.y + s.h); ctx.stroke(); }
    else {
      ctx.fillStyle = PAPER; ctx.fillRect(s.x, s.y, s.w, s.h); hatch(s, 9);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(s.x + 1.5, s.y + 1.5, s.w - 3, s.h - 1.5);
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x + 6, s.y + 6); ctx.lineTo(s.x + s.w - 6, s.y + s.h - 4); ctx.moveTo(s.x + s.w - 6, s.y + 6); ctx.lineTo(s.x + 6, s.y + s.h - 4); ctx.stroke();
    }
  }
  const shelf = (o, ink = INK) => {
    ctx.strokeStyle = ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(o.x + 2, o.y + 2); ctx.lineTo(o.x + o.w - 2, o.y + 2); ctx.stroke();
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = o.x + 6; x < o.x + o.w - 4; x += 10) { ctx.moveTo(x, o.y + 6); ctx.lineTo(x - 5, o.y + 13); }
    ctx.stroke();
  };
  for (const o of wd.oneways) if (vis(o.x, o.w)) shelf(o);
  for (const m of wd.movers) {
    if (!vis(m.x - Math.abs(m.ax), m.w + 2 * Math.abs(m.ax))) continue;
    ctx.save(); ctx.strokeStyle = FAINT; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath();
    ctx.moveTo(m.x0 - m.ax + m.w / 2, m.y0 - m.ay + 6); ctx.lineTo(m.x0 + m.ax + m.w / 2, m.y0 + m.ay + 6); ctx.stroke(); ctx.restore();
    shelf(m);
    ctx.fillStyle = INK; for (const k of [0.2, 0.8]) { ctx.beginPath(); ctx.arc(m.x + m.w * k, m.y + 10, 3.5, 0, Math.PI * 2); ctx.fill(); }
  }
  for (const c of wd.crumbles) {
    if (!vis(c.x, c.w)) continue;
    if (c.state === 'gone') { ctx.save(); ctx.strokeStyle = FAINT; ctx.setLineDash([5, 6]); ctx.lineWidth = 2; ctx.strokeRect(c.x, c.y, c.w, 8); ctx.restore(); continue; }
    const jx = c.state === 'shake' ? rnd(-2, 2) : 0;
    ctx.save(); ctx.translate(jx, 0); shelf(c);
    ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = c.x + 18; x < c.x + c.w - 8; x += 26) { ctx.moveTo(x, c.y - 1); ctx.lineTo(x + 5, c.y + 5); }
    ctx.stroke(); ctx.restore();
  }
  for (const s of wd.spikes) {
    if (!vis(s.x, s.w)) continue;
    const n = Math.max(1, Math.floor(s.w / 14)), sw = s.w / n;
    for (let i = 0; i < n; i++) {
      const x = s.x + i * sw;
      ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x + sw / 2, s.y - 16); ctx.lineTo(x + sw, s.y); ctx.closePath();
      ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(x + sw / 2 - 3, s.y - 10); ctx.lineTo(x + sw / 2, s.y - 16); ctx.lineTo(x + sw / 2 + 3, s.y - 10); ctx.closePath(); ctx.fill();
    }
  }
  for (const s of wd.saws) {
    if (!vis(s.x - s.r, s.r * 2, 160)) continue;
    if (s.ax || s.ay) { ctx.save(); ctx.strokeStyle = FAINT; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(s.cx - s.ax, s.cy - s.ay); ctx.lineTo(s.cx + s.ax, s.cy + s.ay); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0);
    ctx.beginPath(); const n = 12;
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? s.r * 0.78 : s.r; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fillStyle = RED; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s.r * 0.55, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    ctx.restore();
  }
  for (const l of wd.lasers) {
    const b = laserBox(l); if (!vis(b.x, b.w)) continue;
    ctx.fillStyle = INK;
    if (l.vert) { ctx.fillRect(l.x - 12, l.y, 24, 12); } else { ctx.fillRect(l.x - 4, l.y - 10, 12, 20); ctx.fillRect(l.x + l.len - 8, l.y - 10, 12, 20); }
    if (l.mode === 'warn') { if (l.vert) dashedLine(l.x, l.y + 12, l.x, l.y + l.len, RED, 2, [8, 8]); else dashedLine(l.x + 8, l.y, l.x + l.len - 8, l.y, RED, 2, [8, 8]); }
    else if (l.mode === 'on') {
      ctx.fillStyle = RED; const j = rnd(-1, 1);
      if (l.vert) { ctx.fillRect(l.x - 6 + j, l.y + 12, 12, l.len - 12); ctx.fillStyle = PAPER; ctx.fillRect(l.x - 1.5, l.y + 12, 3, l.len - 12); }
      else { ctx.fillRect(l.x + 8, l.y - 6 + j, l.len - 16, 12); ctx.fillStyle = PAPER; ctx.fillRect(l.x + 8, l.y - 1.5, l.len - 16, 3); }
    }
  }
  for (const f of wd.fallers) {
    if (!vis(f.x, f.w)) continue;
    const jx = f.state === 'shake' ? rnd(-3, 3) : 0;
    ctx.strokeStyle = PENCIL; ctx.lineWidth = 2; ctx.beginPath();
    if (f.state !== 'fall' && f.state !== 'rest') { ctx.moveTo(f.x + 12, cam.y); ctx.lineTo(f.x + 12, f.y); ctx.moveTo(f.x + f.w - 12, cam.y); ctx.lineTo(f.x + f.w - 12, f.y); }
    ctx.stroke();
    const r = { x: f.x + jx, y: f.y, w: f.w, h: f.h };
    ctx.fillStyle = PAPER; ctx.fillRect(r.x, r.y, r.w, r.h); hatch(r, 6, INK2, 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
    if (f.state === 'shake' || f.state === 'fall') { ctx.fillStyle = RED; ctx.fillRect(r.x, r.y + r.h - 4, r.w, 4); bang(r.x + r.w / 2, r.y + r.h + 26, 22); }
  }
  for (const h of wd.pickups) { ctx.fillStyle = INK; heart(h.x + 8, h.y + Math.sin(h.t * 5) * 2, 16, true); }
  if (wd.ink) {
    const k = wd.ink, y = k.y;
    if (y < cam.y + H + 20) {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(0, cam.y + H + 50);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.03 + clock * 3) * 6 + Math.sin(x * 0.07 - clock * 2) * 3);
      ctx.lineTo(W, cam.y + H + 50); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= W; x += 20) { const yy = y - 3 + Math.sin(x * 0.03 + clock * 3) * 6 + Math.sin(x * 0.07 - clock * 2) * 3; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    }
  }
}

/* ---------- enemies ---------- */
function drawEnemy(e) {
  const ink = e.flash > 0 ? PENCIL : INK2, cx = e.x + e.w / 2, by = e.y + e.h;
  const st = e.state, base = { x: cx, y: by, s: 1, face: e.face, lw: 3, ink, head: 'hollow', eye: 'grunt', grounded: e.onGround && st !== 'stun' };
  const walkPose = () => (Math.abs(e.vx) > 10 && e.onGround) ? POSES.run(e.phase) : (!e.onGround ? POSES.fall() : POSES.idle(clock + e.home));
  let r;
  switch (e.type) {
    case 'dummy': drawDummy(e); return;
    case 'grunt':
      r = drawStick(Object.assign(base, { pose: st === 'stun' ? POSES.hurt() : st === 'wind' ? POSES.wind() : st === 'punch' ? POSES.p1() : walkPose() }));
      if (st === 'wind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 3 + (1 - e.t / (0.42 * e.tel)) * 6, 0, Math.PI * 2); ctx.fill(); bang(r.head.x, r.head.y - 14); }
      if (st === 'punch') redSwipe(r.hF.x, r.hF.y, e.face, 18);
      break;
    case 'jumper':
      r = drawStick(Object.assign(base, { pose: st === 'stun' ? POSES.hurt() : st === 'crouch' ? POSES.crouch() : st === 'leap' ? POSES.jump() : walkPose(), s: 50 / 52 }));
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.head.x - 3, r.head.y - r.head.r); ctx.lineTo(r.head.x - 7, r.head.y - r.head.r - 9); ctx.moveTo(r.head.x + 3, r.head.y - r.head.r); ctx.lineTo(r.head.x + 7, r.head.y - r.head.r - 9); ctx.stroke();
      if (st === 'crouch') bang(r.head.x, r.head.y - 18);
      if (st === 'leap') { ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.strokeRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4); }
      break;
    case 'thrower':
      r = drawStick(Object.assign(base, { pose: st === 'stun' ? POSES.hurt() : st === 'wind' ? POSES.throw() : walkPose() }));
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.head.x - 8, r.head.y - 5); ctx.lineTo(r.head.x + e.face * 12, r.head.y - 5); ctx.stroke();
      if (st === 'wind') { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 7, 0, Math.PI * 2); ctx.fill(); bang(r.head.x, r.head.y - 14); }
      break;
    case 'shield': {
      r = drawStick(Object.assign(base, { pose: st === 'stun' ? POSES.hurt() : st === 'wind' ? POSES.wind() : st === 'bash' ? POSES.p1() : walkPose(), s: 56 / 52 }));
      const sx = cx + e.face * (st === 'bash' ? 20 : 15), sy = e.y + 8, sh = { x: sx - 6, y: sy, w: 12, h: 40 };
      if (st !== 'stun') {
        ctx.fillStyle = PAPER; ctx.fillRect(sh.x, sh.y, sh.w, sh.h); hatch(sh, 5, INK2, 1);
        ctx.strokeStyle = st === 'wind' || st === 'bash' ? RED : INK; ctx.lineWidth = 3; ctx.strokeRect(sh.x, sh.y, sh.w, sh.h);
      }
      if (st === 'wind') bang(r.head.x, r.head.y - 14);
      break;
    }
    case 'flyer': {
      const fy = e.y + e.h / 2, flap = Math.sin(clock * 18 + e.home) * 8;
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 4, fy); ctx.lineTo(cx - 12, fy - 6 - flap); ctx.lineTo(cx - 18, fy - 2 - flap * 0.5); ctx.lineTo(cx - 24, fy - 10 - flap);
      ctx.moveTo(cx + 4, fy); ctx.lineTo(cx + 12, fy - 6 - flap); ctx.lineTo(cx + 18, fy - 2 - flap * 0.5); ctx.lineTo(cx + 24, fy - 10 - flap); ctx.stroke();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx, fy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = st === 'aim' || st === 'dive' ? RED : PAPER; ctx.fillRect(cx + e.face * 1, fy - 3, e.face * 5, 3);
      r = { head: { x: cx, y: fy, r: 7 } };
      if (st === 'aim' && e.locked) dashedLine(cx, fy, e.locked.x, e.locked.y, RED, 2);
      if (st === 'aim') bang(cx, fy - 14, 18);
      break;
    }
    case 'bomber': {
      r = drawStick(Object.assign(base, { pose: st === 'stun' ? POSES.hurt() : st === 'wind' ? POSES.throw() : walkPose(), s: 54 / 52 }));
      ctx.fillStyle = PAPER; ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx - e.face * 2, by - 30, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (st === 'wind') { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = (clock * 10 | 0) % 2 ? RED : PAPER; ctx.beginPath(); ctx.arc(r.hF.x, r.hF.y - 9, 3, 0, Math.PI * 2); ctx.fill(); bang(r.head.x, r.head.y - 14); }
      break;
    }
    case 'ninja': case 'clone': {
      const isClone = e.type === 'clone';
      if (isClone && Math.sin(clock * 7 + e.home) > 0.93) return;
      r = drawStick(Object.assign(base, { ink: isClone ? INK : ink, head: 'fill', eye: 'player', s: e.h / 52, pose: st === 'stun' ? POSES.hurt() : st === 'aim' ? POSES.crouch() : st === 'dash' ? POSES.dash() : st === 'flip' ? POSES.jump() : walkPose() }));
      ctx.strokeStyle = isClone ? INK : ink; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(r.head.x - e.face * r.head.r, r.head.y - 2); ctx.lineTo(r.head.x - e.face * (r.head.r + 12), r.head.y + Math.sin(clock * 12) * 3);
      ctx.moveTo(r.head.x - e.face * r.head.r, r.head.y - 1); ctx.lineTo(r.head.x - e.face * (r.head.r + 10), r.head.y + 6 + Math.sin(clock * 12 + 1) * 3); ctx.stroke();
      if (st === 'aim') { dashedLine(cx, by - 6, cx + e.face * (isClone ? 900 : 260), by - 6, RED, 3); bang(r.head.x, r.head.y - 14); }
      break;
    }
    case 'heavy': {
      r = drawStick(Object.assign(base, { s: 1.5, lw: 4.6, torso: 1.8, head: 'fill', eye: 'boss', eyeColor: st === 'wind' ? RED : PAPER, ink: e.flash > 0 ? PENCIL : INK,
        pose: st === 'stun' ? POSES.hurt() : st === 'wind' ? POSES.roar(clock) : st === 'pound' ? POSES.crouch() : walkPose() }));
      if (st === 'wind') { ctx.fillStyle = RED; for (const hh of [r.hF, r.hB]) { ctx.beginPath(); ctx.arc(hh.x, hh.y, 7, 0, Math.PI * 2); ctx.fill(); } ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(cx - 80, by - 44, 160, 44); ctx.restore(); }
      break;
    }
  }
  if (r && e.elite && r.head) horns(r.head);
  if (e.hp < e.maxHp && e.type !== 'clone') {
    const n = Math.min(e.maxHp, 12), wpx = Math.min(6.5, 72 / n);
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < Math.ceil(e.hp / e.maxHp * n) ? INK : FAINT; ctx.fillRect(cx - n * wpx / 2 + i * wpx, e.y - 14, wpx - 1.5, 3); }
  }
}
function drawDummy(e) {
  const bx = e.x + e.w / 2, by = e.y + e.h;
  const ang = Math.sin(clock * 22) * e.wob * 0.35 * e.wobDir;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
  ctx.strokeStyle = e.flash > 0 ? PENCIL : INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.moveTo(0, 0); ctx.lineTo(0, -24); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.ellipse(0, -36, 13, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-9, -36); ctx.lineTo(9, -36); ctx.moveTo(-7, -29); ctx.lineTo(7, -29); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -60, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-4, -63); ctx.lineTo(-1, -60); ctx.moveTo(-1, -63); ctx.lineTo(-4, -60); ctx.moveTo(1, -63); ctx.lineTo(4, -60); ctx.moveTo(4, -63); ctx.lineTo(1, -60); ctx.stroke();
  ctx.restore();
}

/* ---------- projectiles, zones, effects ---------- */
function drawShots() {
  for (const s of shots) {
    if (s.mark && s.wait > -0.5 && s.alive) {
      const k = clamp(1 - (s.markT || 0) / 1.2, 0, 1);
      ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, GROUND - 2, 7 + k * 5, 3, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x, GROUND - 12 - k * 10); ctx.lineTo(s.x, GROUND - 6); ctx.stroke();
    }
    if (s.wait > 0) continue;
    switch (s.kind) {
      case 'rock': ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); break;
      case 'arrow': case 'bolt': {
        const a = Math.atan2(s.vy, s.vx), L = s.kind === 'arrow' ? 24 : 16;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
        ctx.strokeStyle = s.kind === 'arrow' ? INK : RED; ctx.lineWidth = s.kind === 'arrow' ? 2.5 : 4; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
        if (s.kind === 'arrow') { ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L - 4, -4); ctx.moveTo(-L, 0); ctx.lineTo(-L - 4, 4); ctx.stroke(); }
        ctx.restore(); break;
      }
      case 'shuriken': {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.t * 18); ctx.fillStyle = RED; ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? 3 : 9; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); break;
      }
      case 'fire': ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = RED; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'orb': { const pr = s.r + Math.sin(s.t * 10) * 2; ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, pr, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5, 0, Math.PI * 2); ctx.fill(); break; }
      case 'web': {
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + s.t * 2; ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r); }
        ctx.stroke(); ctx.strokeStyle = RED; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2); ctx.stroke(); break;
      }
      case 'bomb': case 'skybomb': {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        const blink = s.fuse != null ? (s.fuse < 0.6 ? (clock * 14 | 0) % 2 : (clock * 4 | 0) % 2) : 1;
        ctx.fillStyle = blink ? RED : PAPER; ctx.beginPath(); ctx.arc(s.x + 3, s.y - s.r - 3, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x, s.y - s.r); ctx.lineTo(s.x + 3, s.y - s.r - 3); ctx.stroke(); break;
      }
      case 'mine': {
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(s.x, s.y + 2, s.r + 2, Math.PI, 0); ctx.closePath(); ctx.fill();
        if (!s.landed || (clock * 3 | 0) % 2) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(s.x, s.y - s.r + 1, 3, 0, Math.PI * 2); ctx.fill(); } break;
      }
      case 'roller': {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.x * 0.06);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = RED; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-s.r * 0.8, 0); ctx.lineTo(s.r * 0.8, 0); ctx.stroke(); ctx.restore(); break;
      }
      case 'boomer': {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.t * 16);
        if (s.red) { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, s.r * 0.4, 0, Math.PI * 2); ctx.fill(); }
        else { const r = { x: -s.r * 0.35, y: -s.r, w: s.r * 0.7, h: s.r * 2 }; ctx.fillStyle = PAPER; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.strokeRect(r.x, r.y, r.w, r.h); }
        ctx.restore(); break;
      }
      case 'drip': ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(s.x, s.y - s.r * 1.8); ctx.quadraticCurveTo(s.x + s.r, s.y, s.x, s.y + s.r); ctx.quadraticCurveTo(s.x - s.r, s.y, s.x, s.y - s.r * 1.8); ctx.fill(); break;
      case 'vbeam': {
        ctx.fillStyle = RED; const j = rnd(-2, 2); ctx.fillRect(s.x - 16 + j, s.top, 32, GROUND - s.top);
        ctx.fillStyle = PAPER; ctx.fillRect(s.x - 3, s.top, 6, GROUND - s.top); break;
      }
    }
  }
}
function drawZones() {
  for (const z of zones) {
    const warn = z.t < z.warn, k = clamp(z.t / z.warn, 0, 1);
    if (z.style === 'pool') {
      if (warn) { ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(z.x + z.w / 2, GROUND - 2, z.w / 2 * (0.4 + 0.6 * k), 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      else { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(z.x + z.w / 2, GROUND - 2, z.w / 2, 8 + Math.sin(clock * 6) * 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x + z.w / 2, GROUND - 4, z.w / 2 - 4, 5, 0, Math.PI, 0); ctx.stroke();
        if (Math.random() < 0.2) particles.push({ x: z.x + rnd(10, z.w - 10), y: GROUND - 6, vx: 0, vy: -rnd(40, 90), life: 0.4, r: 2, color: INK, nograv: true }); }
    } else if (z.style === 'hand') {
      if (warn) { ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(z.x + z.w / 2, GROUND - 2, z.w / 2, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); bang(z.x + z.w / 2, GROUND - 40, 26); }
      else { const hy = GROUND - 70; ctx.fillStyle = INK; ctx.fillRect(z.x + 20, z.y, z.w - 40, hy - z.y); if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(z.x, hy, z.w, 70, 16); ctx.fill(); } else ctx.fillRect(z.x, hy, z.w, 70);
        ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(z.x + i * z.w / 4, hy + 8); ctx.lineTo(z.x + i * z.w / 4, hy + 40); } ctx.stroke(); }
    } else {
      if (warn) { ctx.save(); ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -clock * 50; ctx.strokeRect(z.x, z.y, z.w, z.h); ctx.globalAlpha = 0.08 + 0.1 * k; ctx.fillStyle = RED; ctx.fillRect(z.x, z.y, z.w, z.h); ctx.restore(); }
      else if (z.dmg > 0) { ctx.fillStyle = RED; ctx.fillRect(z.x, z.y + rnd(-1, 1), z.w, z.h); ctx.fillStyle = PAPER; ctx.fillRect(z.x, z.y + z.h / 2 - 2, z.w, 4); }
    }
  }
}
function drawWaves() {
  for (const w of waves) {
    const x = w.x, h = w.h, y = w.y;
    ctx.fillStyle = RED; ctx.beginPath(); ctx.moveTo(x - w.w / 2 - 6, y);
    ctx.lineTo(x - w.w / 2 + 2, y - h * 0.55); ctx.lineTo(x - 2, y - h * 0.35); ctx.lineTo(x + w.dir * 6, y - h);
    ctx.lineTo(x + w.w / 2 - 2, y - h * 0.45); ctx.lineTo(x + w.w / 2 + 6, y); ctx.closePath(); ctx.fill();
  }
}
function drawFx() {
  for (const r of rings) {
    const k = 1 - r.t / 0.35;
    ctx.strokeStyle = INK; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = RED; ctx.lineWidth = 3 * (1 - k); ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.6 * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = INK; ctx.lineCap = 'round';
  for (const s of spears) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y - s.len); ctx.lineTo(s.x, s.y); ctx.stroke(); }
  for (const s of slashes) {
    const k = s.t / 0.28, L = s.len * (0.6 + 0.4 * (1 - k));
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.globalAlpha = k;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -7 * k - 2, L, 0); ctx.quadraticCurveTo(0, 4, -L, 0); ctx.fill();
    ctx.restore();
  }
}
function drawGhosts() {
  for (const g of ghosts) drawStick({ x: g.x, y: g.y, s: 1, face: g.face, pose: POSES.dash(), lw: 3.4, ink: g.ink || INK, head: 'fill', alpha: g.life / 0.22 * 0.35 });
}

/* ---------- player ---------- */
function playerPose(p) {
  if (cast) return POSES.cast(clock);
  if (p.dead || p.hurtT > 0) return POSES.hurt();
  if (p.dashT > 0 || ultFx.cuts) return POSES.dash();
  if (p.atk.step === 1) return POSES.p1();
  if (p.atk.step === 2) return POSES.p2();
  if (p.atk.step === 3) return POSES.kick();
  if (p.shootPose > 0) return POSES.shoot();
  if (!p.onGround) return p.vy < 0 ? POSES.jump() : POSES.fall();
  if (Math.abs(p.vx) > 30) return POSES.run(p.runPhase);
  return POSES.idle(clock);
}
function drawPlayer() {
  const p = player;
  if (!p.dead && p.inv > 0 && !cast && !ultFx.cuts && Math.floor(p.inv * 18) % 2 === 0) return;
  const rot = p.dead ? -p.face * Math.min(1, p.deadT * 3) * Math.PI / 2 : 0;
  if (p.lsT > 0) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(clock * 12); ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, 26, 36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
  if (p.shieldT === 0) { ctx.strokeStyle = PENCIL; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2, 24, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  if (!p.dead) {
    const pts = p.scarf; ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
  }
  const r = drawStick({ x: p.x + p.w / 2, y: p.y + p.h, s: 1, face: p.face, pose: playerPose(p), lw: p.lsT > 0 ? 4.2 : 3.4, ink: INK, head: 'fill', eye: 'player', grounded: p.onGround && !p.dead, rot });
  if (!p.dead) p.neck = r.neck;
  if (p.slowT > 0) { ctx.strokeStyle = INK2; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; ctx.moveTo(p.x + p.w / 2, p.y + p.h / 2); ctx.lineTo(p.x + p.w / 2 + Math.cos(a) * 20, p.y + p.h / 2 + Math.sin(a) * 26); } ctx.stroke(); }
  if (p.atk.step && p.atk.t >= ATK[p.atk.step].a0 * 0.5 && p.atk.t <= ATK[p.atk.step].a1 + 0.05) {
    const A = ATK[p.atk.step], cx = p.x + p.w / 2 + p.face * (A.reach * 0.55), cy = p.y + A.yo + A.hh / 2;
    ctx.strokeStyle = INK; ctx.lineWidth = A.heavy ? 3 : 2; ctx.beginPath();
    const a0 = p.face > 0 ? -1.0 : Math.PI - 1.0;
    ctx.arc(cx - p.face * 10, cy, A.heavy ? 32 : 24, a0, a0 + 2.0); ctx.stroke();
  }
  if (p.shootPose > 0) { ctx.fillStyle = INK; ctx.fillRect(r.hF.x - 3, r.hF.y - 3, 6, 6); }
}
function drawBullets() {
  ctx.fillStyle = INK;
  for (const b of bullets) {
    if (b.kind === 'wave') {
      ctx.beginPath(); ctx.moveTo(b.x - 4, b.y + b.h); ctx.lineTo(b.x + b.w / 2 + Math.sign(b.vx) * 6, b.y); ctx.lineTo(b.x + b.w + 4, b.y + b.h); ctx.closePath(); ctx.fill();
    } else {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(a); ctx.fillRect(-7, -2, 14, 4); ctx.fillRect(-15, -1, 4, 2); ctx.restore();
    }
  }
}

/* ---------- HUD ---------- */
function drawHUD() {
  const p = player;
  ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.fillStyle = INK;
  const jig = p.hurtT > 0 ? rnd(-2, 2) : 0;
  for (let i = 0; i < p.maxHp; i++) heart(30 + i * 28 + jig, 18, 21, i < p.hp);
  let hx = 30 + p.maxHp * 28;
  if (p.shieldT >= 0) { ctx.beginPath(); ctx.arc(hx, 28, 9, 0, Math.PI * 2); if (p.shieldT === 0) ctx.fill(); else { ctx.stroke(); ctx.beginPath(); ctx.moveTo(hx, 28); ctx.arc(hx, 28, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.shieldT / 20)); ctx.closePath(); ctx.fill(); } }
  // ink meter
  const mx = 20, my = 50, mw = 160, ready = readyUlt();
  ctx.font = `10px ${FD}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK; ctx.fillText('INK', mx, my + 9);
  ctx.fillStyle = FAINT; ctx.fillRect(mx + 34, my, mw, 10);
  ctx.fillStyle = INK; ctx.fillRect(mx + 34, my, mw * p.meter / 100, 10);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(mx + 34, my, mw, 10);
  if (ready && Math.sin(clock * 8) > -0.4) { ctx.font = `11px ${FD}`; ctx.fillStyle = INK; ctx.fillText(KEY.ult + ' · ' + ULTS[ready].name, mx + 34 + mw + 10, my + 10); }
  ctx.font = `12px ${FD}`; ctx.fillStyle = INK; ctx.fillText(scene === 'arena' ? `FLOOR ${curFloor} · BOSS` : `FLOOR ${curFloor}`, 20, 84);
  ctx.fillStyle = PENCIL; ctx.fillText(fmtTime(runTime), 20, 102);
  if (p.lsT > 0) { ctx.fillStyle = INK; ctx.font = `12px ${FD}`; ctx.fillText('LAST STAND ' + Math.ceil(p.lsT), 20, 122); }
  // combo
  if (p.combo >= 3) {
    ctx.textAlign = 'right'; ctx.fillStyle = INK; ctx.font = `30px ${FD}`;
    ctx.fillText(String(p.combo), W - 22, 82);
    ctx.font = `11px ${FD}`; ctx.fillText(knows('cuts') ? `HITS · ${Math.min(p.combo, CUTS_NEED)}/${CUTS_NEED}` : 'HITS', W - 22, 100);
    ctx.fillStyle = FAINT; ctx.fillRect(W - 102, 106, 80, 3); ctx.fillStyle = INK; ctx.fillRect(W - 102, 106, 80 * clamp(p.comboT / 2.5, 0, 1), 3);
  }
  // boss bars
  const live = bosses.filter(b => b.state !== 'intro');
  if (scene === 'arena' && live.length) {
    const n = bosses.length, gap = 20, bw = n > 1 ? 300 : 420, total = n * bw + (n - 1) * gap, x0 = W / 2 - total / 2;
    bosses.forEach((b, i) => {
      if (b.state === 'intro') return;
      const bx = x0 + i * (bw + gap), by = 30;
      ctx.font = `13px ${FD}`; ctx.textAlign = 'center'; ctx.fillStyle = b.state === 'dead' ? PENCIL : INK; ctx.fillText(b.name || BOSS_INFO[curFloor].name, bx + bw / 2, by - 6);
      ctx.fillStyle = FAINT; ctx.fillRect(bx, by, bw * Math.max(0, b.chip) / b.maxHp, 14);
      ctx.fillStyle = INK2; ctx.fillRect(bx, by, bw * Math.max(0, b.hp) / b.maxHp, 14);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeRect(bx, by, bw, 14);
      ctx.lineWidth = 1.5; ctx.beginPath();
      for (const t of (b.phases.length ? b.phases : [0.5])) { ctx.moveTo(bx + bw * t, by); ctx.lineTo(bx + bw * t, by + 14); }
      if (knows('page')) { ctx.save(); ctx.setLineDash([2, 3]); ctx.moveTo(bx + bw * 0.25, by - 3); ctx.lineTo(bx + bw * 0.25, by + 17); ctx.restore(); }
      ctx.stroke();
    });
  }
  if (introT > 0 && scene === 'arena') {
    const el = introMax - introT, a = clamp(Math.min(el / 0.25, introT / 0.35), 0, 1), grow = clamp(el / 0.3, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = INK; ctx.fillRect(W / 2 - (W / 2) * grow, 196, W * grow, 124);
    ctx.fillStyle = PAPER; ctx.textAlign = 'center';
    ctx.font = `12px ${FD}`; ctx.fillText(`FLOOR ${curFloor} BOSS`, W / 2, 228);
    ctx.font = `${BOSS_INFO[curFloor].name.length > 12 ? 40 : 48}px ${FD}`; ctx.fillText(BOSS_INFO[curFloor].name, W / 2, 280);
    ctx.font = `20px ${FH}`; ctx.fillText(BOSS_INFO[curFloor].tip, W / 2, 308);
    ctx.restore();
  }
  // touch ULT button state
  const tu = $('tUlt'); if (isTouch && tu) tu.classList.toggle('ready', !!ready);
}
function drawCast() {
  const u = ULTS[cast.k], t = cast.t;
  ctx.fillStyle = 'rgba(251,250,246,0.55)'; ctx.fillRect(0, 0, W, H);
  const grow = clamp(t / 0.25, 0, 1);
  ctx.fillStyle = INK; ctx.beginPath();
  const top = 168, bot = 372, wv = 10;
  ctx.moveTo(W / 2 - W / 2 * grow, top);
  for (let x = W / 2 - W / 2 * grow; x <= W / 2 + W / 2 * grow; x += 24) ctx.lineTo(x, top + Math.sin(x * 0.05 + t * 4) * wv);
  for (let x = W / 2 + W / 2 * grow; x >= W / 2 - W / 2 * grow; x -= 24) ctx.lineTo(x, bot + Math.sin(x * 0.04 - t * 3) * wv);
  ctx.closePath(); ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc((i * 337 + 120) % W, top - 14 - i * 6, 4 + i * 2, 0, Math.PI * 2); ctx.fill(); }
  const tStart = 0.3, per = 0.03, chars = Math.floor(clamp((t - tStart) / per, 0, u.chant.length));
  ctx.fillStyle = PAPER; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `italic 30px ${FH}`; ctx.fillText(u.chant.slice(0, chars), W / 2, 238);
  const nameT = tStart + u.chant.length * per + 0.05;
  if (t > nameT) {
    const k = clamp((t - nameT) / 0.18, 0, 1), sc = 1.6 - 0.6 * k;
    ctx.save(); ctx.translate(W / 2, 318); ctx.scale(sc, sc); ctx.globalAlpha = k;
    ctx.font = `54px ${FD}`; ctx.fillStyle = PAPER; ctx.fillText(u.name, 0, 0);
    ctx.restore();
    ctx.fillStyle = RED; ctx.fillRect(W / 2 - 160 * k, 334, 320 * k, 4);
  }
}
function drawPageFx() {
  const t = ultFx.page.t, k = clamp(t / 0.32, 0, 1), fadeK = t > 0.6 ? clamp(1 - (t - 0.6) / 0.5, 0, 1) : 1;
  ctx.save(); ctx.globalAlpha = fadeK;
  ctx.translate(W / 2, H / 2); ctx.rotate(-0.42);
  const L = 1300 * k;
  ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-650, 0); ctx.quadraticCurveTo(-650 + L / 2, -40 * k, -650 + L, 0); ctx.quadraticCurveTo(-650 + L / 2, 26 * k, -650, 0); ctx.fill();
  ctx.fillStyle = RED; ctx.fillRect(-650, -1.5, L, 3);
  ctx.restore();
  if (t > 0.32 && t < 0.45) { ctx.fillStyle = PAPER; ctx.globalAlpha = 1 - (t - 0.32) / 0.13; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

/* ---------- render ---------- */
function render() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  drawBackground();
  const sx = shake > 0 ? rnd(-shake, shake) : 0, sy = shake > 0 ? rnd(-shake, shake) * 0.7 : 0;
  ctx.save(); ctx.translate(-Math.round(cam.x) + sx, -Math.round(cam.y) + sy);
  drawWorld();
  drawZones();
  for (const e of world.enemies) if (e.alive && vis(e.x, e.w, 60)) drawEnemy(e);
  for (const b of bosses) { ctx.save(); b.def.draw(b); ctx.restore(); }
  drawWaves();
  drawShots();
  drawBullets();
  drawGhosts();
  drawPlayer();
  for (const q of particles) { ctx.fillStyle = q.color; ctx.globalAlpha = Math.min(1, q.life * 3); ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  drawFx();
  for (const f of floaters) { ctx.globalAlpha = Math.min(1, f.t * 2.5); ctx.font = `14px ${FD}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y); }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (ultFx.page) drawPageFx();
  if (mode !== 'menu') drawHUD();
  if (cast) drawCast();
  if (fade > 0) { ctx.fillStyle = INK; ctx.globalAlpha = fade; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
