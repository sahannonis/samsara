"""Headless test of build 15: character creation. Real birth (with a past time zone), day without the hour
(read from the Moon), the wheel, body and soul mark, and the three ways of keeping a birth.

    python build.py && python tests/test_birth.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def page(b):
    pg = await b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
    await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await pg.goto(PAGE); await pg.wait_for_timeout(400); return pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx1 = await b.new_context(viewport={'width': 1280, 'height': 1000})
        pg = await ctx1.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        await pg.select_option('#micStart', 'off'); await pg.click('#btnBegin'); await pg.wait_for_timeout(100)
        R['create_open'] = await ev("__life.mode+' '+!document.getElementById('ovCreate').hidden")
        await pg.click('[data-kind="real"]')
        await pg.fill('#crDate', '2000-01-01'); await pg.fill('#crTime', '08:00')
        await pg.locator('#crCity').type('Colom', delay=20); await pg.wait_for_timeout(50)
        R['city_list'] = await ev("[...document.querySelectorAll('[data-city]')].map(b=>b.innerText.split('\\n')[0]).slice(0,4).join(', ')")
        await pg.click('[data-city="0"]'); await pg.click('#crCast'); await pg.wait_for_timeout(100)
        R['chart_card'] = await ev("document.querySelector('#createIn .stats').innerText.replace(/\\n/g,' | ')")
        # check against the engine directly: Sri Lanka was on UTC+06:00 in 2000
        R['engine_check'] = await ev("""(()=>{const E=__life.E, c=__life.findCities('colombo')[0], u=E.localToUTC(2000,1,1,8,0,c.tz), ch=E.chart(u.utc,c.lat,c.lon);
          return E.fmtOffset(u.offset)+' lagna '+E.SIGNS[ch.lagna.sign].en+' moon '+E.SIGNS[ch.by.Moon.sign].en+', '+ch.by.Moon.nakName+' · game says '+__life.CR.birth.lagna+' / '+__life.CR.birth.moon;})()""")
        await fr.screenshot(path=OUT + 'b15_01_chart.png')
        await pg.click('#crNext'); await pg.wait_for_timeout(100)
        await pg.click('[data-build="5.2"]'); await pg.click('[data-hair="2"]'); await pg.click('[data-robe="1"]'); await pg.click('[data-mark="spiral"]')
        await pg.fill('#crName', 'Tester'); await pg.wait_for_timeout(200)
        R['preview_inked'] = await ev("(()=>{const c=document.getElementById('crPrev'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n;})()")
        await fr.screenshot(path=OUT + 'b15_02_body.png')
        await pg.click('#crNext'); await pg.wait_for_timeout(100)
        R['born_disabled_until_choice'] = await ev("document.getElementById('crBorn').disabled")
        await pg.click('[data-store="device"]'); await fr.screenshot(path=OUT + 'b15_03_keep.png'); await pg.click('#crBorn'); await pg.wait_for_timeout(200)
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        R['born'] = await ev("__life.mode+' real '+__life.life.birth.real+' looks '+JSON.stringify(__life.P.looks)+' mark '+__life.soul.mark+' name '+__life.soul.name")
        R['saved'] = await ev("localStorage.getItem('samsara.self')")
        await run(30); await fr.screenshot(path=OUT + 'b15_04_born.png')
        R['pscreen'] = await ev("[Math.round(__life.P.x-__life.cam[0]), Math.round(__life.P.y-__life.cam[1])]")
        await run(260); await ev("__life.P.x=520"); await run(3)
        await pg.screenshot(path=OUT + 'b15_05_mark.png', clip={'x': 300, 'y': 220, 'width': 420, 'height': 280})
        # a second life: the body changes, the mark stays and marks the old body
        await ev("__life.P.prana=1; __life.fall('test')"); await run(200)
        await pg.locator('#deathIn .card').first.click(); await pg.wait_for_timeout(200); await ev("__life.freeze(true)")
        R['life2'] = await ev("'life '+__life.life.n+' real '+!!__life.life.birth.real+' mark '+__life.soul.mark+' body '+__life.soul.bodies.length")
        await ev("(()=>{const b=__life.soul.bodies[0]; __life.put(b.x+60,b.y);})()"); await run(40); await fr.screenshot(path=OUT + 'b15_06_past_body.png')
        # reopen: what was kept is filled in
        pg2 = await ctx1.new_page(); errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)))
        await pg2.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg2.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg2.goto(PAGE); await pg2.wait_for_timeout(400); await pg2.click('#btnBegin'); await pg2.wait_for_timeout(100)
        R['remembered'] = await pg2.evaluate("document.getElementById('crDate').value+' '+document.getElementById('crTime').value+' '+document.getElementById('crCity').value")
        # day without the hour: read from the Moon
        await pg2.click('[data-kind="day"]'); await pg2.fill('#crDate', '1988-07-20'); await pg2.click('#crCast'); await pg2.wait_for_timeout(100)
        R['day_card'] = await pg2.evaluate("document.querySelector('#createIn .stats').innerText.replace(/\\n/g,' | ')")
        R['chandra'] = await pg2.evaluate("(()=>{const b=__life.CR.birth; return b.lagna.split(' ')[0]+' = '+b.moon.split(',')[0];})()")
        # do not keep it
        await pg2.click('#crNext'); await pg2.click('#crNext'); await pg2.click('[data-store="none"]'); await pg2.click('#crBorn'); await pg2.wait_for_timeout(100)
        R['not_kept'] = await pg2.evaluate("localStorage.getItem('samsara.self')")
        # the wheel
        pg3 = await b.new_page(); await pg3.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg3.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg3.goto(PAGE); await pg3.wait_for_timeout(400); await pg3.click('#btnBegin'); await pg3.click('[data-kind="wheel"]'); await pg3.click('#crCast'); await pg3.click('#crNext'); await pg3.click('#crNext'); await pg3.wait_for_timeout(100)
        R['wheel'] = await pg3.evaluate("__life.mode+' real '+!!__life.life.birth.real+' mark '+__life.soul.mark")
        # missing fields are explained
        pg4 = await b.new_page(); await pg4.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg4.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg4.goto(PAGE); await pg4.wait_for_timeout(400); await pg4.click('#btnBegin'); await pg4.click('[data-kind="real"]'); await pg4.fill('#crDate', '1999-05-14'); await pg4.click('#crCast')
        R['error'] = await pg4.evaluate("document.querySelector('.err').innerText")
        R['ERR'] = errs + errs2
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
