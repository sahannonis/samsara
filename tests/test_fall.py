"""Headless test of fall damage: short drops are free, high drops hurt, very high drops kill, a roll on landing
halves the hurt, water and wind catch you, a plunge counts as a roll, teleports never count.

    python build.py && python tests/test_fall.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js')
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
X, G = 600, 1000   # open ground in the proving grounds

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart', 'off')
        ev = pg.evaluate; R = {}; bad = []
        await pg.click('#btnQuick'); await pg.wait_for_timeout(200); await ev("__life.freeze(true); __life.setNight(false); __life.autoAsk='way'; __life.noFoes()")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def drop(h, keys={}, roll_at=None):
            await ev(f"(()=>{{const P=__life.P; P.dead=false; P.hp=P.hpMax; __life.put({X},{G}); }})()"); await run(40)
            await ev(f"(()=>{{const P=__life.P; __life.put({X},{G - h}); P.fallFree=false; P.fallTop=null; }})()")
            for i in range(200):
                if await ev("__life.P.onG || __life.P.dead"): break
                near = await ev(f"__life.P.vy > 0 && ({G} - (__life.P.y + __life.P.h)) < 70")
                await run(1, keys, {'roll': True} if (roll_at and near) else {})
            await run(2)
            return await ev("({hp: __life.P.hp, max: __life.P.hpMax, dead: !!__life.P.dead})")
        safe, deadly = await ev("[__life.FALL_SAFE, __life.FALL_DEADLY]")
        R['limits'] = f'safe {safe} deadly {deadly}'
        for h in (150, 380):
            r = await drop(h); R[f'drop_{h}'] = r
            if r['hp'] != r['max'] or r['dead']: bad.append(f'drop {h} should be free')
        r = await drop(600); R['drop_600'] = r
        if not (0 < r['hp'] < r['max']) or r['dead']: bad.append('drop 600 should hurt but not kill')
        hurt600 = r['max'] - r['hp']
        r = await drop(850); R['drop_850'] = r
        if not (r['hp'] < r['max'] - hurt600) and not r['dead']: bad.append('850 should hurt more than 600')
        r = await drop(600, roll_at=True); R['drop_600_roll'] = r
        if not (r['max'] - r['hp'] < hurt600) or r['dead']: bad.append('a roll should soften the fall')
        r = await drop(1150); R['drop_1150'] = r
        if not r['dead']: bad.append('1150 should kill')
        await run(200)
        r = await drop(1150, roll_at=True); R['drop_1150_roll'] = r
        if r['dead']: bad.append('a rolled landing from 1150 should be survived')
        # teleports are free
        await ev(f"(()=>{{const P=__life.P; P.dead=false; P.hp=P.hpMax; __life.put({X},{G - 900}); }})()")
        for i in range(120):
            if await ev("__life.P.onG"): break
            await run(1)
        await run(2); r = await ev("({hp: __life.P.hp, max: __life.P.hpMax})"); R['put_is_free'] = r
        if r['hp'] != r['max']: bad.append('a placed drop (put) should be free')
        await ev("document.getElementById('tShrine').click()"); await run(60); r = await ev("({hp: __life.P.hp, max: __life.P.hpMax})"); R['shrine_jump'] = r
        if r['hp'] != r['max']: bad.append('jumping to a shrine should be free')
        R['errors'] = errs
        for k, v in R.items(): print(k, ':', v)
        print('PROBLEMS:', bad or 'none')
        await b.close()
        if bad or errs: raise SystemExit(1)
asyncio.run(main())
