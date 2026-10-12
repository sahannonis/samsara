// Builds data/places.txt: every place a player can pick as their birthplace.
//   node tools/build-places.js <path to GeoNames cities.json folder>
// Block 1: the original 7,228 cities (by size, with their time zones). Block 2: GeoNames places with
// more than 1,000 people (CC BY 4.0), grouped by country, time zone from coordinates (tz-lookup, CC0).
// Format: T|tz0|tz1…  then A|admin0|admin1…  then block 1 lines name|prov|country|lat|lon|tz
// then "=" and block 2: #CC headers and lines name|admin|lat|lon|tz (admin and tz are base-36 indexes).
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src) { console.error('give the cities.json folder'); process.exit(1); }
const tzlookup = require(path.join(__dirname, '..', 'vendor', 'tz-lookup.js'));
const big = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'star-panel', 'cities.json'), 'utf8'));
const geo = JSON.parse(fs.readFileSync(path.join(src, 'cities.json'), 'utf8'));
const adm1 = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(src, 'admin1.json'), 'utf8')).map(a => [a.code, a.name]));
const TZ = [], TZI = {}, AD = [], ADI = {};
const tzI = t => (t in TZI ? TZI[t] : (TZI[t] = TZ.push(t) - 1)).toString(36);
const adI = a => (a in ADI ? ADI[a] : (ADI[a] = AD.push(a) - 1)).toString(36);
const f2 = v => String(Math.round(v * 100) / 100);
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clean = s => String(s).replace(/[|\n#=]/g, ' ').trim();
const near = {}; const l1 = [];
for (const r of big) { l1.push([clean(r[0]), clean(r[1] || ''), clean(r[2] || ''), f2(r[3]), f2(r[4]), tzI(r[5])].join('|')); (near[norm(r[0])] = near[norm(r[0])] || []).push([r[3], r[4]]); }
const byC = {}; let skipped = 0;
for (const g of geo) {
  const lat = +g.lat, lon = +g.lng, n = norm(g.name);
  if ((near[n] || []).some(([a, b]) => Math.abs(a - lat) < 0.15 && Math.abs(b - lon) < 0.15)) { skipped++; continue; }
  let tz; try { tz = tzlookup(lat, lon); } catch (_) { continue; }
  (byC[g.country] = byC[g.country] || []).push([clean(g.name), adI(clean(adm1[g.country + '.' + g.admin1] || '')), f2(lat), f2(lon), tzI(tz)].join('|'));
}
const l2 = []; for (const c of Object.keys(byC).sort()) { l2.push('#' + c); l2.push(...byC[c]); }
const out = ['T|' + TZ.join('|'), 'A|' + AD.join('|'), ...l1, '=', ...l2].join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'data', 'places.txt'), out);
console.log(`block 1 ${l1.length}, block 2 ${l2.length - Object.keys(byC).length} (skipped ${skipped} already in block 1), ${TZ.length} time zones, ${(out.length / 1048576).toFixed(2)} MB`);
