// Checks the star engine against Swiss Ephemeris (swetest) on random charts.
// Needs: Astronomy Engine source (npm astronomy-engine) and a locally built swetest
// with its ephemeris files. Set S to the folder holding ext/ae and ext/swe.
// Swiss Ephemeris is only a test reference here and is not shipped with the game.
const A = require(process.env.S + '/ext/ae/source/js/astronomy.js');
const E = require('../engine/star-engine.js')(A);
const { execFileSync } = require('child_process');
const SWE = process.env.S + '/ext/swe';
function swe(ms, lat, lon) {
  const d = new Date(ms);
  const date = `${d.getUTCDate()}.${d.getUTCMonth()+1}.${d.getUTCFullYear()}`;
  const t = `${d.getUTCHours()}:${d.getUTCMinutes()}:${d.getUTCSeconds()}`;
  const out = execFileSync(SWE + '/swetest', ['-edir' + SWE + '/ephe', '-b' + date, '-ut' + t, '-p0123456m', '-sid1', '-fPl', '-head', `-house${lon},${lat},W`]).toString();
  const r = {}; for (const line of out.split('\n')) { const m = line.match(/^(\S.*?)\s{2,}(-?[\d.]+)\s*$/); if (m) r[m[1].trim()] = +m[2]; }
  return r;
}
const map = { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'mean Node' };
const err = {}; const add = (k, v) => { (err[k] = err[k] || []).push(v); };
let signMiss = 0, nakMiss = 0, lagMiss = 0, N = +process.argv[2] || 300;
const dif = (a, b) => ((a - b + 540) % 360) - 180;
for (let i = 0; i < N; i++) {
  const ms = Date.UTC(1900, 0, 1) + Math.random() * (Date.UTC(2030, 0, 1) - Date.UTC(1900, 0, 1));
  const lat = -55 + Math.random() * 120, lon = -180 + Math.random() * 360;
  const c = E.chart(ms, lat, lon), r = swe(ms, lat, lon);
  for (const p of c.planets) { if (!map[p.name]) continue; const d = dif(p.lon, r[map[p.name]]) * 3600; add(p.name, d); if (Math.floor(p.lon/30) !== Math.floor(r[map[p.name]]/30)) signMiss++; if (p.name==='Moon' && Math.floor(p.lon/(360/27)) !== Math.floor(r.Moon/(360/27))) nakMiss++; }
  const dl = dif(c.lagna.lon, r.Ascendant) * 3600; add('Lagna', dl); if (Math.floor(c.lagna.lon/30) !== Math.floor(r.Ascendant/30)) lagMiss++;
}
console.log('arcseconds: mean / max abs');
for (const k in err) { const a = err[k]; const mean = a.reduce((s,x)=>s+x,0)/a.length; console.log(k.padEnd(8), mean.toFixed(1).padStart(8), Math.max(...a.map(Math.abs)).toFixed(1).padStart(8)); }
console.log('sign mismatches', signMiss, 'moon nakshatra mismatches', nakMiss, 'lagna sign mismatches', lagMiss, 'of', N);
