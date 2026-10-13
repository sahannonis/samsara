"""Headless test of build 22: saving. Autosave into soul slots, continue after a reload (waking at the last
shrine with what you carried), a death that cannot be undone by leaving, leaving mid-fall, the real birth kept
only when the player chose to keep it, export and import, back to the title, and full slots.

    python build.py && python tests/test_save.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width': 1280, 'height': 1000})
        await ctx.add_init_script("localStorage.setItem('samsara.testSave','1')")
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def boot():
            await pg.goto(PAGE); await pg.wait_for_selector('#slots .slotcard'); await pg.wait_for_timeout(500); await pg.select_option('#micStart', 'off')
        async def cont(i=0):
            await pg.wait_for_selector(f'[data-cont="{i}"]'); await pg.click(f'[data-cont="{i}"]'); await pg.wait_for_timeout(300); await ev("__life.freeze(true); __life.setNight(false); __life.autoAsk='way'")
        await boot(); R['title_empty'] = await ev("document.getElementById('slots').innerText.replace(/\\n+/g,' | ')")
        await pg.click('#btnQuick'); await pg.wait_for_timeout(200); await ev("__life.freeze(true); __life.setNight(false); __life.autoAsk='way'")
        R['saved_at_birth'] = await ev("!!__life.readSlot(0)+' slot '+__life.slot")
        # play a little: feed the dog, gain things, rest at the plateau shrine, then walk away with more seeds
        await ev("__life.noFoes(); __life.put(__life.DOG.x-30, __life.DOG.gy)"); await run(3); await run(1, {}, {'use': 1}); await run(2)
        await ev("__life.P.seeds = 300; __life.P.mats.iron = 4; __life.learnSpell('gust'); __life.P.visited.add(1)")
        await ev("__life.put(__life.SHRINES[1].x, __life.SHRINES[1].gy)"); await run(3); await run(1, {}, {'use': 1}); await run(2); await pg.keyboard.press('Escape'); await run(80)
        await ev("__life.put(3400, 790); __life.P.seeds = 350; __life.P.hp = 60"); await run(3); await ev("__life.saveNow()")
        before = await ev("JSON.stringify({life:__life.life.n, seeds:__life.P.seeds, hp:Math.round(__life.P.hp), iron:__life.P.mats.iron, karma:__life.soul.karma, fed:!!__life.life.fedDog, gust:__life.soul.spells.has('gust'), shrine:__life.P.shrine, visited:[...__life.P.visited].sort().join(','), deeds:__life.soul.deeds.length, bhakti:__life.soul.paths.bhakti})")
        R['before'] = before
        await fr.screenshot(path=OUT + 'b22_00_before.png')
        # the page closes and opens again
        await boot(); R['title_one'] = await ev("document.getElementById('slots').innerText.replace(/\\n+/g,' | ')")
        await pg.screenshot(path=OUT + 'b22_01_title.png')
        await cont(0)
        after = await ev("JSON.stringify({life:__life.life.n, seeds:__life.P.seeds, hp:Math.round(__life.P.hp), iron:__life.P.mats.iron, karma:__life.soul.karma, fed:!!__life.life.fedDog, gust:__life.soul.spells.has('gust'), shrine:__life.P.shrine, visited:[...__life.P.visited].sort().join(','), deeds:__life.soul.deeds.length, bhakti:__life.soul.paths.bhakti})")
        R['after'] = after; R['same'] = before == after
        R['woke_at'] = await ev("Math.round(__life.P.x)+','+Math.round(__life.P.y+__life.P.h)+' plateau shrine at '+__life.SHRINES[1].x+' · sets '+(__life.P.visited instanceof Set)+','+(__life.soul.spells instanceof Set)+' · mode '+__life.mode+' · banner '+(__life.banner2&&__life.banner2.sub)")
        await run(2); await fr.screenshot(path=OUT + 'b22_02_continue.png')
        # a death is kept at once: leaving cannot undo it
        await ev("__life.P.prana = 1; __life.fall('Test: the last fall.')"); await run(100)
        R['death'] = await ev("__life.mode+' pending '+!!__life.soul.pending")
        births1 = await ev("__life.soul.pending.births.map(b=>b.place).join(' / ')")
        await boot(); R['title_dead'] = await ev("document.getElementById('slots').innerText.replace(/\\n+/g,' | ')")
        await cont(0); births2 = await ev("__life.soul.pending ? __life.soul.pending.births.map(b=>b.place).join(' / ') : 'none'")
        R['death_kept'] = await ev("__life.mode+' · death screen shown '+!document.getElementById('ovDeath').hidden") + f" · same births {births1 == births2}"
        await fr.screenshot(path=OUT + 'b22_03_death_kept.png')
        await pg.wait_for_selector('#deathIn .card'); await pg.click('#deathIn .card'); await run(2)
        R['reborn'] = await ev("'life '+__life.life.n+' pending '+!!__life.soul.pending+' lives '+__life.soul.lives.length")
        await boot(); await cont(0); R['reborn_kept'] = await ev("'life '+__life.life.n+' mode '+__life.mode")
        # leaving while falling: the fall still counts
        pr = await ev("__life.P.prana"); await ev("__life.fall('Test: fell and left.'); __life.saveNow()")
        await boot(); await cont(0); await run(20)
        R['left_mid_fall'] = await ev(f"'prana {pr} -> '+__life.P.prana+' dead '+__life.P.dead+' mode '+__life.mode")
        # the real birth: only kept when the player chose to keep it
        await ev("(()=>{const L=__life.life; __life.soul.lives[0].birth = Object.assign({}, __life.soul.lives[0].birth, {real:true, ms: 946692000000, geo:{lat:7.03,lon:79.92}, place:'Ragama, Sri Lanka', local:'1 Jan 2000, 08:00'}); __life.soul.self = {date:'2000-01-01', time:'08:00', city:{name:'Ragama'}, store:'none'};})()")
        R['not_kept'] = await ev("(()=>{const s=__life.snapshot(); const b=s.soul.lives[0].birth; return 'place '+b.place+' · ms '+b.ms+' · self '+s.soul.self;})()")
        await ev("__life.soul.self.store = 'device'")
        R['kept'] = await ev("(()=>{const s=__life.snapshot(); const b=s.soul.lives[0].birth; return 'place '+b.place+' · ms '+b.ms+' · self '+(s.soul.self&&s.soul.self.date);})()")
        await ev("__life.soul.self.store = 'none'; __life.saveNow()")
        R['not_kept_on_disk'] = await ev("!localStorage.getItem('samsara.soul.0').includes('Ragama')")
        # export and import into another slot
        R['import'] = await ev("__life.importSoul(localStorage.getItem('samsara.soul.0')) || 'ok'") + ' · slot 1 ' + await ev("JSON.stringify(__life.readSlot(1).summary)")
        R['import_bad'] = await ev("__life.importSoul('{\"hello\":1}')")
        # back to the title, a new soul in the last slot, and the slots are full
        await ev("__life.toTitle()"); await pg.wait_for_timeout(100)
        R['to_title'] = await ev("__life.mode+' · start shown '+!document.getElementById('ovStart').hidden")
        await pg.click('#btnQuick'); await pg.wait_for_timeout(200); await ev("__life.freeze(true)")
        R['new_soul'] = await ev("'slot '+__life.slot+' life '+__life.life.n+' karma '+__life.soul.karma+' lives '+__life.soul.lives.length+' deeds '+__life.soul.deeds.length")
        await ev("__life.toTitle()"); await pg.wait_for_timeout(100)
        R['full'] = await ev("'begin disabled '+document.getElementById('btnBegin').disabled+' · '+document.getElementById('slots').innerText.split('\\n').filter(t=>t.includes('slots')).join(' ')")
        await pg.screenshot(path=OUT + 'b22_04_title_full.png')
        # letting a soul go
        await pg.click('[data-del="2"]'); await pg.click('[data-del="2"]'); R['let_go'] = await ev("'slot 2 '+!!__life.readSlot(2)+' · begin disabled '+document.getElementById('btnBegin').disabled")
        print(json.dumps(R, indent=1)); print('errors', errs)
        await b.close()
asyncio.run(main())
