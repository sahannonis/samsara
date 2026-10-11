"""Headless test of build 9: the real sky. Checks Sun and Moon positions against
Astronomy Engine directly, night switching, and takes pictures across a day.

    python build.py && python tests/test_sky.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1280, 'height': 1000}, timezone_id='Asia/Colombo')
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        await pg.select_option('#micStart', 'off'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        ev = pg.evaluate; fr = pg.locator('#frame')
        R = {}
        R['place'] = await ev("__life.SKY.name+' '+__life.SKY.lat+','+__life.SKY.lon")
        # fixed moment: 2026-03-20 06:30 UTC = 12:00 in Colombo; the Sun should be high and close to the south or overhead
        async def at(iso, place=None):
            if place: await ev(f"Object.assign(__life.SKY, {json.dumps(place)})")
            await ev(f"(()=>{{const S=__life.SKY; S.offset = Date.parse('{iso}') - Date.now(); S.cache=null;}})()")
            return await ev("(()=>{const k=__life.skyState(); return {sun:[+k.sun.alt.toFixed(1), +k.sun.az.toFixed(1)], moon:[+k.moon.alt.toFixed(1), +k.moon.az.toFixed(1)], illum:+k.illum.toFixed(2), night: k.sun.alt < -6, text: __life.skyText()}})()")
        R['colombo_noon'] = await at('2026-03-20T06:30:00Z', {'lat': 6.932, 'lon': 79.858, 'tz': 'Asia/Colombo', 'name': 'Colombo'})
        # independent check with the library itself
        R['check'] = await ev("""(()=>{const A=Astronomy, d=new Date('2026-03-20T06:30:00Z'), o=new A.Observer(6.932,79.858,0), e=A.Equator(A.Body.Sun,d,o,true,true), h=A.Horizon(d,o,e.ra,e.dec,'normal'); return [+h.altitude.toFixed(1), +h.azimuth.toFixed(1)]})()""")
        R['colombo_sunset'] = await at('2026-10-11T12:40:00Z')
        R['colombo_midnight'] = await at('2026-10-11T18:30:00Z')
        R['london_winter_noon'] = await at('2026-12-21T12:00:00Z', {'lat': 51.507, 'lon': -0.128, 'tz': 'Europe/London', 'name': 'London'})
        R['sydney_morning'] = await at('2026-12-21T21:00:00Z', {'lat': -33.869, 'lon': 151.209, 'tz': 'Australia/Sydney', 'name': 'Sydney'})
        await ev("Object.assign(__life.SKY, {lat: 6.932, lon: 79.858, tz: 'Asia/Colombo', name: 'Colombo'})")
        # full moon night (2026-10-26 is a full moon), Colombo 22:00
        R['full_moon_night'] = await at('2026-10-26T16:30:00Z')
        await ev("__life.noFoes()")
        for name, iso in [('dawn', '2026-10-26T00:35:00Z'), ('morning', '2026-10-26T03:00:00Z'), ('noon', '2026-10-26T06:30:00Z'), ('dusk', '2026-10-26T12:25:00Z'), ('night', '2026-10-26T16:30:00Z')]:
            await at(iso); await pg.wait_for_timeout(150); await fr.screenshot(path=OUT + f'b9_{name}.png')
        R['night_spell_blocked_by_day'] = await at('2026-10-26T06:30:00Z')
        # night-only spell follows the real Sun
        await ev("__life.freeze(true)"); await ev("(()=>{const P=__life.P; P.noMana=false; P.manaTierMax=100; __life.applyStats(true); P.stats.foc=14; __life.learnSpell('starfall');})()")
        await at('2026-10-26T06:30:00Z'); await ev("__life.P.mana=999; __life.P.wordSlots=['starfall',null,null,null]; __life.cast('starfall')")
        R['starfall_day_mana'] = await ev("Math.round(__life.P.mana)")
        await at('2026-10-26T16:30:00Z'); await ev("__life.P.mana=999; __life.cast('starfall')")
        R['starfall_night_mana'] = await ev("Math.round(__life.P.mana)")
        # place panel: pick London from the list
        await ev('__life.freeze(false)'); await pg.select_option('#skyPlace', '10'); R['picked'] = await ev("__life.SKY.name")
        await pg.click('#skyFast'); await pg.wait_for_timeout(1000); R['fast_moves'] = await ev("(()=>{const a=__life.skyState().d.getTime(); return a})()")
        await pg.wait_for_timeout(1000); R['fast_moves2'] = await ev("__life.skyState().d.getTime()")
        R['fast_hours_per_second'] = round((R['fast_moves2'] - R['fast_moves']) / 3.6e6, 2)
        for k, v in R.items(): print(k, v)
        print('ERR', errs); await b.close()
asyncio.run(main())
