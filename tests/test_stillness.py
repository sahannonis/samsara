"""Headless test of build 19 (rule updated in build 23 from the lore: the question rises after a boss is beaten): meditation (breathing with the guide, thoughts that pass or are followed), its gifts,
the first riddle (wrong, understood, realized) and the first color.

    python build.py && python tests/test_stillness.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def newpage(b):
    pg = await b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart', 'off'); await pg.click('#btnQuick'); await pg.wait_for_timeout(200)
    await pg.evaluate("__life.freeze(true); __life.setNight(false)"); return pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg, errs = await newpage(b); ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def sit():
            await ev("__life.put(220,1000)"); await run(3); await run(1, {}, {'use': 1}); await run(1); await pg.click('#shrineMed'); await run(1)
        async def breathe(cycles=4, good=True, follow=False):
            for c in range(cycles):
                for ph in range(4):
                    hold = (ph < 2) if good else True
                    for k in range(4):
                        press = {}
                        if follow and ph == 1 and k == 0: press = {'use': 1}
                        await run(60, {'jump': True} if hold else {}, press)
        # a good stillness
        await ev("__life.P.prana = 2"); await sit(); R['mode'] = await ev("__life.mode")
        await breathe(1, True); await fr.screenshot(path=OUT + 'b19_01_breathe.png')
        R['calm_after_1'] = await ev("Math.round(__life.MED.calm)+' thoughts '+__life.MED.thoughts.length")
        await breathe(3, True)
        R['deep'] = await ev("__life.mode+' dhyana '+__life.soul.dhyana+' prana '+__life.P.prana+' false walls shown '+__life.FAKES.every(f=>f.found)")
        await run(2); await fr.screenshot(path=OUT + 'b19_02_stillness.png'); await run(300)
        # a restless one: holding the breath the whole time
        await sit(); await breathe(4, False); R['restless'] = await ev("__life.mode+' dhyana '+__life.soul.dhyana")
        await run(300)
        # following thoughts breaks the calm
        await sit(); await run(1, {}, {}); 
        for k in range(10):
            await run(60, {'jump': True})
            if await ev("__life.MED && __life.MED.thoughts.some(t=>t.state==='drift' && t.t>2 && t.t<5.5)"):
                break
        await fr.screenshot(path=OUT + 'b19_03_thought.png')
        c0 = await ev("__life.MED.calm"); await run(1, {'jump': True}, {'use': 1}); R['followed'] = await ev(f"Math.round({c0})+' -> '+Math.round(__life.MED.calm)+' followed '+__life.MED.followed")
        await run(30, {'jump': True}); await fr.screenshot(path=OUT + 'b19_04_followed.png')
        await pg.keyboard.press('Escape'); R['stood_up'] = await ev("__life.mode")
        await run(60)
        # the first lesson counted as lived: a deep stillness brings the question; a wrong answer loses nothing
        await ev("document.getElementById('tLived').click()"); await run(200)
        await sit(); await breathe(4, True); await run(2)
        for i in range(120):
            if await ev("__life.mode") == 'ask': break
            await run(30)
        R['riddle'] = await ev("__life.mode+' · '+document.querySelector('#gearIn h2').innerText")
        await fr.screenshot(path=OUT + 'b19_05_riddle.png')
        right = await ev("(()=>{const q=document.querySelector('#gearIn h2').innerText; const r=__life.RIDDLES.find(r=>r.q===q); return r.r;})()")
        wrong = (right + 1) % 4
        await pg.click(f'[data-ans="{wrong}"]'); await run(2); R['wrong'] = await ev("__life.soul.understood.has('mind')+' '+(__life.soul.realized.has('mind'))")
        await run(300)
        await sit(); await breathe(4, True); await run(2)
        for i in range(120):
            if await ev("__life.mode") == 'ask': break
            await run(30)
        R['riddle2_differs'] = await ev("__life.soul.asked.length")
        right = await ev("(()=>{const q=document.querySelector('#gearIn h2').innerText; return __life.RIDDLES.find(r=>r.q===q).r;})()")
        await pg.click(f'[data-ans="{right}"]'); await run(30)
        R['realized'] = await ev("__life.soul.realized.has('mind')+' color '+__life.colorK.toFixed(2)")
        await fr.screenshot(path=OUT + 'b19_06_realized.png')
        await run(400); R['color_full'] = await ev("__life.colorK.toFixed(2)")
        await ev("__life.put(700,1000)"); await run(60); await fr.screenshot(path=OUT + 'b19_07_color_day.png')
        await ev("__life.put(5400,1050)"); await run(60); await fr.screenshot(path=OUT + 'b19_08_color_pool.png')
        await ev("__life.setNight(true)"); await ev("__life.SKY.offset += 12*3600e3; __life.SKY.cache=null"); await ev("__life.put(2900,790)"); await run(60); await fr.screenshot(path=OUT + 'b19_09_color_night.png')
        # understood without having lived it: words, not color
        pg2, errs2 = await newpage(b)
        async def run2(n, keys={}, press={}): await pg2.evaluate(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        await pg2.evaluate("__life.soul.bossKills.chief = 1; __life.put(220,1000)"); await run2(3); await run2(1, {}, {'use': 1}); await run2(1); await pg2.click('#shrineMed'); await run2(1)
        await pg2.evaluate("__life.MED.followed = 1")   # a thought was followed: understood, not yet lived
        for c in range(4):
            for ph in range(4):
                await run2(240, {'jump': True} if ph < 2 else {})
        await run2(2)
        for i in range(30):
            if await pg2.evaluate("__life.mode") == 'ask': break
            await run2(30)
        right = await pg2.evaluate("(()=>{const q=document.querySelector('#gearIn h2').innerText; return __life.RIDDLES.find(r=>r.q===q).r;})()")
        await pg2.click(f'[data-ans="{right}"]'); await run2(30)
        R['understood_only'] = await pg2.evaluate("'understood '+__life.soul.understood.has('mind')+' realized '+__life.soul.realized.has('mind')+' color '+__life.colorK+' chant boon '+__life.boonV('chant')+' lived '+__life.livedMind()")
        await pg2.locator('#frame').screenshot(path=OUT + 'b19_10_understood.png')
        R['ERR'] = errs + errs2
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
