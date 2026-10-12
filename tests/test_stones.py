"""Headless test of build 17: the nine stones. Reading of the one who dreams (real birth vs today's sky)
and of this body, offerings and the daily limit, tablets, gifts, and the birth form when no birth is kept.

    python build.py && python tests/test_stones.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
NOW = "Date.UTC(2026, 9, 12, 7, 30)"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx1 = await b.new_context(viewport={'width': 1280, 'height': 1000})
        pg = await ctx1.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        await pg.wait_for_function("__life.placesCount() > 100000", timeout=15000)
        await pg.select_option('#micStart', 'off'); await pg.click('#btnBegin'); await pg.click('[data-kind="real"]')
        await pg.fill('#crDate', '1990-03-15'); await pg.fill('#crTime', '09:45'); await pg.locator('#crCity').type('Kandy', delay=10); await pg.click('[data-city="0"]'); await pg.click('#crCast')
        await pg.click('#crNext'); await pg.click('#crNext'); await pg.click('[data-store="device"]'); await pg.click('#crBorn'); await pg.wait_for_timeout(200)
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        # the sky in October 2026, checked against known positions: Saturn in sidereal Pisces, Rahu in Aquarius
        R['sky_oct_2026'] = await ev(f"(()=>{{const E=__life.E, T=E.chart({NOW}, 7.29, 80.63); return ['Saturn','Jupiter','Rahu','Ketu','Moon'].map(n=>n+' '+E.SIGNS[T.by[n].sign].en+(n==='Moon'?' '+T.by.Moon.nakName:'')).join(', ');}})()")
        # an independent working of tara bala, the Moon's house, Saturn from the Moon and the dasha, compared with the reading
        await ev("__life.soul.tablets.add('wanderers'); __life.soul.tablets.add('periods')")
        R['check'] = await ev(f"""(()=>{{const E=__life.E, now={NOW}, sc=__life.soulChart(), nat=sc.c.by.Moon, T=E.chart(now, __life.SKY.lat, __life.SKY.lon);
          const tara=(((T.by.Moon.nak-nat.nak)%27)+27)%27%9, mh=((T.by.Moon.sign-nat.sign+12)%12)+1, sh=((T.by.Saturn.sign-nat.sign+12)%12)+1;
          // Vimshottari by hand: the birth star's lord rules first, for the unspent part of its years
          const ORD=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'], Y={{Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17}}, yr=365.25*864e5;
          const n=Math.floor(nat.lon/(360/27)), frac=(nat.lon-n*360/27)/(360/27); let i=n%9, t=sc.utc+(1-frac)*Y[ORD[i]]*yr; while(t<=now){{i=(i+1)%9; t+=Y[ORD[i]]*yr;}}
          const r=__life.readSoul(now);
          return JSON.stringify({{birthMoon:E.SIGNS[nat.sign].en+' '+nat.nakName, mine:{{tara:tara+1, moonHouse:mh, saturnHouse:sh, md:ORD[i]}}, reading:{{tara:r.tara, moonHouse:r.moonHouse, saturnHouse:r.saturnHouse, sadeSati:r.sadeSati, md:r.md, ad:r.ad, sections:r.sections.length}}}});}})()""")
        await ev("__life.soul.tablets.clear()")
        # go to the stones without an offering
        await ev("(()=>{const L=__life,n=L.NAVAGRAHA[0]; L.put(n.x-30,n.gy); L.P.seeds=0;})()"); await run(3); await run(1, {}, {'use': 1}); await run(1)
        R['no_offering'] = await ev("document.getElementById('stSoul').disabled")
        await fr.screenshot(path=OUT + 'b17_01_stones.png')
        await pg.keyboard.press('Escape'); await run(2)
        await ev("__life.P.seeds=200; __life.P.mats.petal=3; __life.P.mats.ember=2"); await run(1, {}, {'use': 1}); await run(1)
        await pg.click('#stSoul'); await pg.wait_for_timeout(50)
        R['reading'] = await ev("[...document.querySelectorAll('.rsec .lbl')].map(e=>e.innerText).join(' | ')+' · paid → seeds '+__life.P.seeds+' petals '+__life.P.mats.petal+' embers '+__life.P.mats.ember")
        R['reading_text'] = await ev("document.querySelector('.rsec .calc').innerText+' // '+document.querySelector('.rsec .hand').innerText")
        R['gift'] = await ev("JSON.stringify(__life.P.boons)")
        await fr.screenshot(path=OUT + 'b17_02_reading.png')
        await pg.click('#stBack'); R['daily_limit'] = await ev("!document.getElementById('stSoul') && !!document.getElementById('stSoulAgain')")
        # the body reading, once a life
        await pg.click('#stBody'); await pg.wait_for_timeout(50); R['body'] = await ev("document.querySelector('.rsec .calc').innerText+' // gifts '+__life.P.boons.map(b=>b.src+':'+b.kind+'+'+b.v).join(', ')")
        await fr.screenshot(path=OUT + 'b17_03_body.png'); await pg.keyboard.press('Escape'); await run(2)
        # tablets: one under the water, read with E
        await ev("(()=>{const L=__life,t=L.TABLETS[0]; L.put(t.x-10,t.gy);})()"); await run(2); await run(1, {}, {'use': 1}); R['tablet'] = await ev("[...__life.soul.tablets].join()")
        await run(30); await fr.screenshot(path=OUT + 'b17_04_tablet.png')
        await ev("document.getElementById('tTablets').click(); document.getElementById('tReadReset').click()")
        await ev("(()=>{const L=__life,n=L.NAVAGRAHA[0]; L.put(n.x-30,n.gy); L.P.seeds=200; L.P.mats.petal=3; L.P.mats.ember=2;})()"); await run(3); await run(1, {}, {'use': 1}); await pg.click('#stSoul'); await pg.wait_for_timeout(50)
        R['full_reading'] = await ev("[...document.querySelectorAll('.rsec .lbl')].map(e=>e.innerText).join(' | ')")
        R['full_text'] = await ev("[...document.querySelectorAll('.rsec')].slice(1,3).map(e=>e.innerText.replace(/\\n/g,' ')).join(' ### ')")
        await pg.screenshot(path=OUT + 'b17_05_full.png', full_page=True); await pg.keyboard.press('Escape'); await run(2)
        # the day's gift carries into the next life; the body reading does not
        await ev("__life.P.prana=1; __life.fall('test')"); await run(200); await pg.locator('#deathIn .card').first.click(); await pg.wait_for_timeout(200); await ev("__life.freeze(true)")
        R['next_life'] = await ev("__life.P.boons.map(b=>b.src).join(',')+' bodyRead '+!!__life.life.bodyRead")
        # a body without mana never gets a mana gift: Jupiter's day turns to breath
        R['fit_gift'] = await ev("(()=>{const L=__life; L.P.noMana=true; const keep=JSON.stringify(L.READS); localStorage.setItem('samsara.readings', keep); return 1;})()")
        R['fit_gift'] = await ev("(()=>{const L=__life, P=L.P; P.noMana=true; P.boons=[]; const b={kind:'mana',v:0.2,text:'x'}; L.READS.boon=b; L.READS.day=(()=>{const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})(); L.applyDayBoon(); return JSON.stringify(P.boons);})()")
        # the stones say whose birth they read
        await ev("(()=>{const L=__life,n=L.NAVAGRAHA[0]; L.put(n.x-30,n.gy);})()"); await run(3); await run(1, {}, {'use': 1}); await run(1)
        R['whose_birth'] = await ev("document.getElementById('gearIn').innerText.match(/know you as born[^.]*/)[0]")
        await pg.keyboard.press('Escape'); await run(2)
        # a player with no kept birth: the stones ask for it
        pg2 = await b.new_page(); errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)))
        await pg2.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg2.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg2.goto(PAGE); await pg2.wait_for_timeout(400); await pg2.wait_for_function("__life.placesCount() > 100000", timeout=15000)
        await pg2.select_option('#micStart', 'off'); await pg2.click('#btnQuick'); await pg2.wait_for_timeout(200); await pg2.evaluate("__life.freeze(true)")
        await pg2.evaluate("(()=>{const L=__life,n=L.NAVAGRAHA[0]; L.put(n.x-30,n.gy); L.P.seeds=200; L.P.mats.petal=3; L.P.mats.ember=2;})()"); await pg2.evaluate("__life.run(3)"); await pg2.evaluate("__life.run(1,{},{use:1})")
        R['asks_birth'] = await pg2.evaluate("!!document.getElementById('stTell')")
        await pg2.click('#stTell'); R['wheel_hidden'] = await pg2.evaluate("!document.querySelector('[data-kind=\"wheel\"]')")
        await pg2.click('[data-kind="day"]'); await pg2.fill('#crDate', '1993-11-02'); await pg2.locator('#crCity').type('Galle', delay=10); await pg2.click('[data-city="0"]'); await pg2.click('#crCast'); await pg2.click('#crNext')
        await pg2.click('[data-store="none"]'); await pg2.click('#crBorn'); await pg2.wait_for_timeout(100)
        R['back_at_stones'] = await pg2.evaluate("__life.mode+' can read '+!!document.getElementById('stSoul')+' kept '+localStorage.getItem('samsara.self')")
        await pg2.click('#stSoul'); R['day_only_periods'] = await pg2.evaluate("document.querySelector('#gearIn').innerText.includes('Today')")
        R['ERR'] = errs + errs2
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
