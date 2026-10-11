"""Headless test of build 7: pack weight, two-way chests, your own chest across lives, fast travel.

    python build.py && python tests/test_pack_and_travel.py
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
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        await pg.select_option('#micStart', 'off'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        ev = pg.evaluate; fr = pg.locator('#frame')
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        R = {}
        await run(5); await ev("__life.noFoes()")
        R['start_pack'] = await ev("__life.packWeight()+' / '+__life.P.packMax")
        # open the spear chest on the plank: two-way panel
        await ev("__life.put(2400,810)"); await run(2); await run(1, {}, {'use': 1})
        R['chest_mode'] = await ev("__life.mode"); await fr.screenshot(path=OUT + 'b7_01_chest.png')
        await pg.click('#takeAll'); R['took_spear'] = await ev("[...__life.P.weapons].join()+' pack '+__life.packWeight()")
        # put the bow in? it is in a hand, so the button is disabled; put wood we gathered
        await ev("__life.P.mats.wood=3"); await pg.keyboard.press('Escape'); await run(1, {}, {'use': 1})
        await pg.click('[data-put="mat:wood:all"]'); R['left_wood'] = await ev("__life.P.mats.wood")
        await pg.keyboard.press('Escape'); R['mode_after'] = await ev("__life.mode")
        # pack limit: gathering stops when full
        await ev("__life.P.mats.iron=19"); R['pack_full'] = await ev("__life.packWeight()+' / '+__life.P.packMax")
        await ev("__life.put(600,1000); __life.P.face=1"); await run(4)
        for i in range(4): await ev("__life.P.st=999"); await run(1, {}, {'light': 1}); await run(25)
        R['wood_when_full'] = await ev("__life.P.mats.wood")
        await ev("__life.P.mats.iron=40"); R['overfull'] = await ev("__life.loadNow().cls+' '+__life.loadNow().full")
        await ev("__life.P.mats.iron=2")
        # your own chest: put the spear and iron in
        await ev("__life.put(280,1000)"); await run(2); await run(1, {}, {'use': 1}); R['home_mode'] = await ev("__life.mode")
        await pg.click('[data-put="weapon:3"]'); await pg.click('[data-put="mat:iron:all"]')
        await fr.screenshot(path=OUT + 'b7_02_home.png'); await pg.keyboard.press('Escape')
        R['home'] = await ev("[...__life.soul.home.weapons].join()+' iron '+__life.soul.home.mats.iron")
        # fast travel: rest at plateau via travel tool, then map click
        await ev("__life.freeze(false)"); await pg.click('#tShrine'); await pg.click('#tShrine'); await ev("__life.freeze(true)")
        R['visited'] = await ev("[...__life.P.visited].join()+' at '+Math.round(__life.P.x)")
        await pg.keyboard.press('m'); await run(1); await fr.screenshot(path=OUT + 'b7_03_map.png')
        await pg.keyboard.press('Digit2'); await run(2); R['travel_key'] = await ev("__life.mode+' x '+Math.round(__life.P.x)+' shrine '+__life.P.shrine")
        await ev("__life.noFoes()"); await pg.keyboard.press('m'); await run(1)
        # click the village shrine marker
        box = await pg.locator('#cv').bounding_box()
        hit = await ev("(()=>{ const L=__life; return null })()")
        await pg.keyboard.press('Digit5'); R['travel_unvisited_msg'] = await ev("__life.mode")
        await ev("""(()=>{})()""")
        await pg.mouse.move(box['x'] + box['width'] * ((30 + 180 * 900 / 13700) / 960), box['y'] + box['height'] * ((150 + 1000 * 300 / 1400 - 10) / 540))
        await run(1); await fr.screenshot(path=OUT + 'b7_04_map_hover.png')
        await pg.mouse.down(); await pg.mouse.up(); await run(2)
        R['travel_click'] = await ev("__life.mode+' x '+Math.round(__life.P.x)")
        # danger blocks travel
        await ev("""(()=>{const L=__life; L.put(1100,1000); const f=L.foes[0]; f.alive=true; f.x=1200; f.state='chase';})()""")
        await pg.keyboard.press('m'); await pg.keyboard.press('Digit2'); R['travel_danger'] = await ev("__life.mode+' x '+Math.round(__life.P.x)"); await run(1); await fr.screenshot(path=OUT + 'b7_06_danger.png')
        await pg.keyboard.press('Escape')
        # die: the home chest keeps the spear and iron; the spear chest stays empty
        await ev("__life.freeze(false)"); await pg.click('#tEnd'); await pg.wait_for_timeout(2200)
        await pg.screenshot(path=OUT + 'b7_05_death.png'); await pg.click('#deathIn .card'); await pg.wait_for_timeout(300)
        R['reborn'] = await ev("'carry '+[...__life.P.weapons].join()+' home '+[...__life.soul.home.weapons].join()+' iron '+__life.soul.home.mats.iron+' spear chest '+__life.CHESTS[3].inv.weapons.size+' hat chest '+__life.CHESTS[0].inv.garb.size")
        for k, v in R.items(): print(k, v)
        print('ERR', errs); await b.close()
asyncio.run(main())
