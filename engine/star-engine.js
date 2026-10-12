/* Samsara star engine: Vedic (sidereal, Lahiri) chart from a real moment and place.
   Planet positions come from Astronomy Engine (MIT, Don Cross). Everything else is here. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createStarEngine = factory;
})(typeof self !== 'undefined' ? self : this, function createStarEngine(A) {
  'use strict';
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;
  const NAK = 360 / 27, PADA = NAK / 4;

  /* Lahiri ayanamsa at J2000.0, measured on the J2000 ecliptic. */
  const AYAN_J2000 = 23.857092;

  const SIGNS = [
    { en: 'Aries', sa: 'Mesha', el: 'fire', lord: 'Mars' }, { en: 'Taurus', sa: 'Vrishabha', el: 'earth', lord: 'Venus' },
    { en: 'Gemini', sa: 'Mithuna', el: 'air', lord: 'Mercury' }, { en: 'Cancer', sa: 'Karka', el: 'water', lord: 'Moon' },
    { en: 'Leo', sa: 'Simha', el: 'fire', lord: 'Sun' }, { en: 'Virgo', sa: 'Kanya', el: 'earth', lord: 'Mercury' },
    { en: 'Libra', sa: 'Tula', el: 'air', lord: 'Venus' }, { en: 'Scorpio', sa: 'Vrishchika', el: 'water', lord: 'Mars' },
    { en: 'Sagittarius', sa: 'Dhanu', el: 'fire', lord: 'Jupiter' }, { en: 'Capricorn', sa: 'Makara', el: 'earth', lord: 'Saturn' },
    { en: 'Aquarius', sa: 'Kumbha', el: 'air', lord: 'Saturn' }, { en: 'Pisces', sa: 'Meena', el: 'water', lord: 'Jupiter' },
  ];
  const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
    'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  const YEAR_DAYS = 365.25;
  const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const SANSKRIT = { Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangala', Mercury: 'Budha', Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu' };
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  const BODY = { Sun: A.Body.Sun, Moon: A.Body.Moon, Mars: A.Body.Mars, Mercury: A.Body.Mercury, Jupiter: A.Body.Jupiter, Venus: A.Body.Venus, Saturn: A.Body.Saturn };

  const ROT_ECL = A.Rotation_EQJ_ECL();
  const precession = T => (5028.796195 * T + 1.1054348 * T * T) / 3600; // general precession in longitude, degrees
  const ayanamsa = time => AYAN_J2000 + precession(time.tt / 36525);

  function lonJ2000(name, time) {
    const v = A.GeoVector(BODY[name], time, true);
    return A.SphereFromVector(A.RotateVector(ROT_ECL, v)).lon;
  }
  function meanNodeTropical(time) {
    const T = time.tt / 36525;
    return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000);
  }
  function gmst(time) {
    const d = time.ut, T = d / 36525;
    return norm(280.46061837 + 360.98564736629 * d + 0.000387933 * T * T - T * T * T / 38710000);
  }
  function meanObliquity(time) {
    const T = time.tt / 36525;
    return 23.439291111 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
  }
  /* True (apparent) ascendant of date, returned with the nutation in longitude so the mean ayanamsa can be applied. */
  function ascTropical(time, lat, lon) {
    const tilt = A.e_tilt(time);
    const r = norm(A.SiderealTime(time) * 15 + lon) * D2R, e = tilt.tobl * D2R, f = lat * D2R;
    return norm(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(f) * Math.sin(e))) * R2D - tilt.dpsi / 3600);
  }
  function siderealOf(name, time) {
    if (name === 'Rahu') return norm(meanNodeTropical(time) - ayanamsa(time));
    if (name === 'Ketu') return norm(meanNodeTropical(time) + 180 - ayanamsa(time));
    return norm(lonJ2000(name, time) - AYAN_J2000);
  }
  const lagnaOf = (time, lat, lon) => norm(ascTropical(time, lat, lon) - ayanamsa(time));

  function describe(lon) {
    const sign = Math.floor(lon / 30), n = Math.floor(lon / NAK);
    return { lon, sign, deg: lon - sign * 30, nak: n, nakName: NAKSHATRAS[n], pada: Math.floor((lon - n * NAK) / PADA) + 1, nakLord: DASHA_ORDER[n % 9] };
  }
  function dignity(name, sign) {
    if (!(name in EXALT)) return '';
    if (EXALT[name] === sign) return 'exalted';
    if ((EXALT[name] + 6) % 12 === sign) return 'debilitated';
    if (OWN[name].includes(sign)) return 'own sign';
    return '';
  }

  /* ---------- time zones (historical offsets come from the browser's tz database) ---------- */
  const dtfCache = {};
  function zoneParts(ms, tz) {
    const f = dtfCache[tz] || (dtfCache[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
    const o = {}; for (const p of f.formatToParts(new Date(ms))) o[p.type] = p.value;
    return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour % 24, +o.minute, +o.second);
  }
  const offsetMin = (ms, tz) => Math.round((zoneParts(ms, tz) - ms) / 60000);
  /* Local wall time in a zone -> UTC ms. Handles past offset changes. */
  function localToUTC(y, mo, d, h, mi, tz) {
    const wall = Date.UTC(y, mo - 1, d, h, mi);
    let utc = wall - offsetMin(wall, tz) * 60000;
    utc = wall - offsetMin(utc, tz) * 60000;
    return { utc, offset: offsetMin(utc, tz) };
  }
  function fmtOffset(m) { const s = m < 0 ? '-' : '+', a = Math.abs(m); return `UTC${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`; }

  /* ---------- the chart ---------- */
  function chart(utcMs, lat, lon) {
    const time = A.MakeTime(new Date(utcMs));
    const lag = describe(lagnaOf(time, lat, lon));
    const before = A.MakeTime(new Date(utcMs - 3600e3)), after = A.MakeTime(new Date(utcMs + 3600e3));
    const planets = GRAHAS.map(name => {
      const p = describe(siderealOf(name, time));
      let speed = norm(siderealOf(name, after) - siderealOf(name, before) + 180) - 180;
      p.name = name; p.sa = SANSKRIT[name];
      p.retro = name === 'Rahu' || name === 'Ketu' ? true : speed < 0;
      p.house = ((p.sign - lag.sign + 12) % 12) + 1;
      p.dignity = dignity(name, p.sign);
      return p;
    });
    const by = Object.fromEntries(planets.map(p => [p.name, p]));
    const sun = by.Sun, moon = by.Moon;
    const elong = norm(moon.lon - sun.lon);
    return { utc: utcMs, lat, lon, ayanamsa: ayanamsa(time), lagna: lag, planets, by, elong, tithi: Math.floor(elong / 12) + 1, paksha: elong < 180 ? 'Shukla (waxing)' : 'Krishna (waning)', lagnaWindow: lagnaWindow(utcMs, lat, lon, lag.sign) };
  }
  /* How many minutes earlier / later the lagna would change sign. */
  function lagnaWindow(utcMs, lat, lon, sign) {
    const at = m => Math.floor(lagnaOf(A.MakeTime(new Date(utcMs + m * 60000)), lat, lon) / 30);
    let back = null, fwd = null;
    for (let m = 1; m <= 240; m++) { if (fwd === null && at(m) !== sign) fwd = m; if (back === null && at(-m) !== sign) back = m; if (fwd !== null && back !== null) break; }
    return { back, fwd };
  }

  /* ---------- Vimshottari dasha ---------- */
  function dashas(utcMs, moonLon) {
    const n = Math.floor(moonLon / NAK), frac = (moonLon - n * NAK) / NAK;
    const first = n % 9, yr = YEAR_DAYS * 86400000;
    let start = utcMs - frac * DASHA_YEARS[DASHA_ORDER[first]] * yr;
    const list = [];
    for (let i = 0; i < 9 * 2; i++) {
      const lord = DASHA_ORDER[(first + i) % 9], len = DASHA_YEARS[lord] * yr, md = { lord, start, end: start + len, sub: [] };
      let s = start;
      for (let j = 0; j < 9; j++) {
        const al = DASHA_ORDER[(first + i + j) % 9], alen = len * DASHA_YEARS[al] / 120, ad = { lord: al, start: s, end: s + alen, sub: [] };
        let ps = s;
        for (let k = 0; k < 9; k++) { const pl = DASHA_ORDER[(first + i + j + k) % 9], plen = alen * DASHA_YEARS[pl] / 120; ad.sub.push({ lord: pl, start: ps, end: ps + plen }); ps += plen; }
        md.sub.push(ad); s += alen;
      }
      list.push(md); start += len;
      if (start > utcMs + 125 * yr) break;
    }
    return { balanceYears: (1 - frac) * DASHA_YEARS[DASHA_ORDER[first]], list };
  }
  function dashaAt(d, ms) {
    const md = d.list.find(x => ms >= x.start && ms < x.end); if (!md) return null;
    const ad = md.sub.find(x => ms >= x.start && ms < x.end), pd = ad.sub.find(x => ms >= x.start && ms < x.end);
    return { md, ad, pd };
  }

  /* ---------- draft game rules (not a traditional reading) ---------- */
  const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUSTHANA = [6, 8, 12];
  function strength(p) {
    let s = 1;
    if (p.dignity === 'exalted') s += 2; else if (p.dignity === 'own sign') s += 1.5; else if (p.dignity === 'debilitated') s -= 1;
    if (KENDRA.includes(p.house)) s += 1; if (TRIKONA.includes(p.house)) s += 0.75; if (DUSTHANA.includes(p.house)) s -= 0.5;
    return s + p.deg / 3000; // tiny, planet-neutral tie-break
  }
  function game(c, T) {
    T = T || THRESH;
    const by = c.by;
    const bright = (1 - Math.cos(c.elong * D2R)) / 2; // 0 at new Moon, 1 at full
    const moonStr = strength(by.Moon);
    let mana = 2.2 * bright + 0.5 * moonStr;
    // the reasons, in plain words, for the player to read (each with its weight)
    const ord = n => n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
    const dig = p => p.dignity && p.dignity !== 'neutral' ? `, ${p.dignity}` : '';
    const manaWhy = [[`The Moon was ${Math.round(bright * 100)}% lit when you were born`, 2.2 * bright], [`The Moon sits in ${SIGNS[by.Moon.sign].en}, in your ${ord(by.Moon.house)} house${dig(by.Moon)}`, 0.5 * moonStr]];
    if (KENDRA.includes(by.Jupiter.house) || TRIKONA.includes(by.Jupiter.house)) { mana += 0.8; manaWhy.push([`Jupiter, the teacher, stands strong in your ${ord(by.Jupiter.house)} house`, 0.8]); }
    if (by.Jupiter.dignity === 'exalted' || by.Jupiter.dignity === 'own sign') { mana += 0.5; manaWhy.push([`Jupiter is ${by.Jupiter.dignity}`, 0.5]); }
    if ([4, 8, 12].includes(by.Ketu.house)) { mana += 0.7; manaWhy.push([`Ketu, the mystic, sits in your ${ord(by.Ketu.house)} house, a hidden house`, 0.7]); }
    const hid = c.planets.filter(p => p.name !== 'Ketu' && [4, 8, 12].includes(p.house));
    mana += 0.35 * Math.min(4, hid.length); if (hid.length) manaWhy.push([`${hid.map(p => p.name).join(', ')} in the hidden houses (4th, 8th, 12th)`, 0.35 * Math.min(4, hid.length)]);
    const tiers = ['None', 'Low', 'Medium', 'High', 'Great'];
    let tier = 0; while (tier < 4 && mana >= T.mana[tier]) tier++;

    const pl = n => ({ planet: n, where: `${n} in ${SIGNS[by[n].sign].en}, your ${ord(by[n].house)} house${dig(by[n])}` });
    const schools = [
      { id: 'Agni', el: 'Fire', s: strength(by.Mars) + T.lum * strength(by.Sun), ...pl('Mars') },
      { id: 'Jala', el: 'Water', s: strength(by.Venus) + T.lum * strength(by.Moon), ...pl('Venus') },
      { id: 'Vayu', el: 'Air', s: strength(by.Saturn), ...pl('Saturn') },
      { id: 'Prithvi', el: 'Earth', s: strength(by.Mercury) + T.earth, ...pl('Mercury') },
      { id: 'Akasha', el: 'Ether', s: strength(by.Jupiter) - T.akasha, ...pl('Jupiter') },
    ].sort((a, b) => b.s - a.s);

    const group = c.planets.filter(p => [7, 11].includes(p.house)).length * 0.9 + 0.5 * (strength(by[SIGNS[(c.lagna.sign + 6) % 12].lord]) + strength(by[SIGNS[(c.lagna.sign + 10) % 12].lord]));
    const solo = c.planets.filter(p => [1, 10].includes(p.house)).length * 0.9 + 0.5 * (strength(by.Sun) + strength(by.Mars));
    const diff = group - solo;
    const in711 = c.planets.filter(p => [7, 11].includes(p.house)).map(p => p.name), in110 = c.planets.filter(p => [1, 10].includes(p.house)).map(p => p.name);
    const socialWhy = { group: Math.round(group * 100) / 100, solo: Math.round(solo * 100) / 100,
      groupSays: in711.length ? `${in711.join(', ')} in your houses of partners and friends (7th and 11th)` : 'no planets in your houses of partners and friends (7th and 11th)',
      soloSays: `${in110.length ? `${in110.join(', ')} in your houses of self and deeds (1st and 10th), ` : ''}the Sun and Mars ${strength(by.Sun) + strength(by.Mars) >= 3.5 ? 'strong' : strength(by.Sun) + strength(by.Mars) >= 2 ? 'steady' : 'quiet'}` };
    const social = diff > T.social ? 'Sangha: stronger with others' : diff < -T.social ? 'Sovereign: stronger alone' : 'Balanced: strong either way';

    const regions = { fire: 'Deserts and volcanic lands', earth: 'Mountains, forests and farmland', air: 'Highlands, cliffs and sky cities', water: 'Coasts, rivers and marshes' };
    const civ = { Sun: 'Rulers and keepers of law', Moon: 'Healers and river folk', Mars: 'Warriors and smiths', Mercury: 'Traders and scholars', Jupiter: 'Teachers and temple keepers', Venus: 'Artists and musicians', Saturn: 'Workers and ascetics', Rahu: 'Wanderers, outsiders and inventors', Ketu: 'Mystics and hermits' };
    return {
      manaScore: mana, manaTier: tiers[tier], manaTierIndex: tier,
      school: tier === 0 ? null : schools[0],
      social, why: { mana: manaWhy.map(([t, v]) => [t, Math.round(v * 100) / 100]), manaScore: Math.round(mana * 100) / 100, next: tier < 4 ? Math.round((T.mana[tier] - mana) * 100) / 100 : null, schools: schools.map(x => ({ id: x.id, s: Math.round(x.s * 100) / 100, where: x.where })), social: socialWhy },
      region: regions[SIGNS[c.lagna.sign].el], regionElement: SIGNS[c.lagna.sign].el,
      civilization: civ[by.Moon.nakLord], civLord: by.Moon.nakLord,
    };
  }
  const THRESH = { mana: [2.32, 3.15, 4.09, 5.14], akasha: 0.7, social: 0.8, lum: 0, earth: 0.1 };

  return { SIGNS, NAKSHATRAS, GRAHAS, SANSKRIT, DASHA_ORDER, DASHA_YEARS, chart, dashas, dashaAt, game, THRESH, localToUTC, offsetMin, fmtOffset, describe, siderealOf, lagnaOf, ayanamsa, norm };
});
