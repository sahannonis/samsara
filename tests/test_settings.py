"""Headless test of the message setting (fade with time to read, or stay until closed) and the chart's stillness gift.

    python build.py && python tests/test_settings.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 1000})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart', 'off'); await pg.click('#btnQuick'); await pg.wait_for_timeout(200)
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        # fading: a long message gets time to read, with a line that shows the time left
        await run(400); await ev("__life.learnSpell('gust')"); await run(2)
        R['fade_time'] = await ev("__life.banner2 && Math.round(__life.banner2.t0)+'s for '+(__life.banner2.top+' '+__life.banner2.sub).split(' ').length+' words'")
        await fr.screenshot(path=OUT + 'b19b_01_fade.png')
        # staying: it waits; Enter closes it
        await pg.select_option('#setMsg', 'stay'); await run(1200); R['stays'] = await ev("!!__life.banner2")
        await fr.screenshot(path=OUT + 'b19b_02_stay.png')
        await pg.locator('#frame').focus(); await pg.keyboard.press('Enter'); await run(2); R['enter_closes'] = await ev("!__life.banner2")
        # a click on the message closes it and is not an attack
        await ev("__life.learnSpell('pillar')"); await run(2); box = await fr.bounding_box()
        await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] * 196 / 540); await run(2)
        R['click_closes'] = await ev("!__life.banner2+' attacked '+!!__life.P.atk")
        R['kept'] = await ev("localStorage.getItem('samsara.settings')")
        # the chart's stillness gift: Jupiter, Ketu and the twelfth house
        R['inward'] = await ev("""(()=>{const E=__life.E, mk=(jd,jh,kh,n12)=>({by:{Jupiter:{dignity:jd,house:jh},Ketu:{house:kh}},planets:Array.from({length:n12},()=>({house:12,name:'Mars'}))});
          return [__life.inwardOf(mk('exalted',9,12,1)), __life.inwardOf(mk('neutral',3,4,0)), __life.inwardOf(mk('neutral',3,2,0))].join(',');})()""")
        R['ERR'] = errs
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
