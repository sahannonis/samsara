"""Headless test of build 8: spells, their effects and every way of finding them.

    python build.py && python tests/test_spells.py
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
        # give this body mana so every birth can cast
        await ev("(()=>{const L=__life,P=L.P; P.noMana=false; P.manaTierMax=100; L.applyStats(true); P.wordSlots=[P.wordSlots[0]||'ignite',null,null,null]; L.noFoes(); L.setNight(false);})()")
        R = {}
        R['known0'] = await ev("[...__life.soul.spells].join()")
        # chest: Gust
        await ev("__life.put(2200,720)"); await run(2); await run(1, {}, {'use': 1}); R['gust_learned'] = await ev("__life.soul.spells.has('gust')+' slots '+__life.P.wordSlots.join()")
        await run(10); await fr.screenshot(path=OUT + 'b8_01_learn.png')
        cast = lambda id: ev(f"(()=>{{const L=__life; L.P.mana=999; L.P.wordSlots=['{id}',null,null,null]; L.learnSpell('{id}'); L.cast('{id}');}})()")
        # Gust in the air lifts you
        await ev("__life.put(500,1000)"); await run(3); await run(1, {'jump': True}, {'jump': 1}); await run(10, {'jump': True}); vy0 = await ev("__life.P.vy"); await cast('gust'); vy1 = await ev("__life.P.vy"); R['gust_air'] = f'{vy0:.0f} -> {vy1:.0f}'
        # Pillar as a step to the plateau, without the feather
        await run(60); await ev("__life.put(2640,1000); __life.P.face=1"); await run(3)
        await ev("(()=>{const L=__life; L.mouse.in=true; L.mouse.x=2735-L.cam[0]; L.mouse.y=960-L.cam[1];})()"); await cast('pillar'); await ev("__life.mouse.in=false")
        R['pillar'] = await ev("JSON.stringify(__life.TEMPS.map(t=>[Math.round(t.x),Math.round(t.y)]))")
        await run(1, {'jump': True, 'right': True}, {'jump': 1}); await run(40, {'jump': True, 'right': True}); R['on_pillar'] = await ev("Math.round(__life.P.y+__life.P.h)+' x '+Math.round(__life.P.x)")
        await fr.screenshot(path=OUT + 'b8_02_pillar.png')
        await run(1, {'jump': True, 'right': True}, {'jump': 1}); await run(50, {'jump': True, 'right': True}); R['plateau_via_pillar'] = await ev("Math.round(__life.P.y+__life.P.h)+' x '+Math.round(__life.P.x)")
        # Monsoon cools burning ground
        await ev("__life.put(7950,760); __life.P.hp=100"); await run(2); await cast('monsoon'); await run(60); R['monsoon_hot_hp'] = await ev("Math.round(__life.P.hp)+' rains '+__life.RAINS.length")
        await fr.screenshot(path=OUT + 'b8_03_monsoon.png')
        await run(400); await ev("__life.P.hp=100"); await run(30); R['hot_after_rain_hp'] = await ev("Math.round(__life.P.hp)")
        # Unseen: a chasing foe gives up
        await ev("__life.P.hp=100; __life.put(180,1000)"); await run(1, {}, {'use': 1}); await pg.keyboard.press('Escape')
        await ev("(()=>{const L=__life; L.put(1100,1000); const f=L.foes[0]; L.foes.forEach((g,i)=>{if(i>0)g.alive=false}); f.x=1250; f.state='idle';})()"); await run(10)
        st0 = await ev("__life.foes[0].state"); await cast('unseen'); await run(30); R['unseen'] = f"{st0} -> " + await ev("__life.foes[0].state+' t '+__life.P.unseenT.toFixed(1)")
        await fr.screenshot(path=OUT + 'b8_04_unseen.png')
        # Embers and Grasp
        await ev("__life.P.unseenT=0; __life.foes[0].hp=1000; __life.foes[0].hpMax=1000; __life.P.face=1; __life.P.inv=99"); await cast('embers'); R['embers_shots'] = await ev("__life.P && 0"); await run(60); R['embers_dmg'] = await ev("Math.round(1000-__life.foes[0].hp)")
        await ev("__life.foes[0].x=1300; __life.foes[0].state='idle'; __life.P.seeds=0"); await cast('grasp'); R['grasp'] = await ev("Math.round(__life.foes[0].x)+' seeds '+__life.P.seeds+' karma '+__life.soul.karma")
        # Shani needs Focus 14
        await ev("__life.P.stats.foc=10"); await cast('shani'); R['shani_low_focus'] = await ev("(__life.P.shaniT||0).toFixed(1)")
        await ev("__life.P.stats.foc=14"); await cast('shani'); R['shani'] = await ev("__life.P.shaniT.toFixed(1)")
        # Tide heals over time with the real Moon
        await ev("__life.P.hp=40"); await cast('tide'); await run(360); R['tide_hp'] = await ev("Math.round(__life.P.hp)")
        # Starfall only at night
        await ev("__life.setNight(false); __life.foes[0].hp=1000; __life.foes[0].state='idle'; __life.P.stats.foc=14"); await cast('starfall'); R['starfall_day'] = await ev("Math.round(1000-__life.foes[0].hp)")
        await ev("__life.setNight(true)"); await cast('starfall'); R['starfall_night'] = await ev("Math.round(1000-__life.foes[0].hp)")
        await run(5); await fr.screenshot(path=OUT + 'b8_05_night.png'); await ev("__life.setNight(false)")
        # speaking stone: typed answer
        await ev("__life.soul.spells.delete('shani'); __life.put(3570,1100)"); await run(2); await run(1, {}, {'use': 1}); R['stone_mode'] = await ev("__life.mode")
        await fr.screenshot(path=OUT + 'b8_06_stone.png')
        await pg.fill('#stoneIn', 'jupiter'); await pg.click('#stoneGo'); R['stone_wrong'] = await ev("__life.soul.spells.has('shani')")
        await pg.fill('#stoneIn', 'Shani'); await pg.click('#stoneGo'); R['stone_right'] = await ev("__life.soul.spells.has('shani')+' '+__life.mode")
        # moon stone: day refuses, night teaches
        await ev("__life.soul.spells.delete('tide'); __life.put(6550,560)"); await run(2); await run(1, {}, {'use': 1}); R['moon_day'] = await ev("__life.soul.spells.has('tide')")
        await ev("__life.setNight(true)"); await run(1, {}, {'use': 1}); R['moon_night'] = await ev("__life.soul.spells.has('tide')"); await ev("__life.setNight(false)")
        # villager teaches Unseen after a gift
        await ev("__life.soul.spells.delete('unseen'); __life.put(560,1000); __life.P.lotus=3"); await run(2); await run(1, {}, {'use': 1}); await run(1, {}, {'use': 1}); R['villager_unseen'] = await ev("__life.soul.spells.has('unseen')")
        # Grasp drop after kills
        await ev("__life.soul.spells.delete('grasp'); __life.soul.kills=5")
        await ev("""(()=>{const L=__life; L.put(1100,1000); L.P.face=1; L.P.inv=99; const f=L.foes[0]; f.alive=true; f.x=1140; f.hp=1; f.state='stun'; f.t=5;})()""")
        for i in range(4):
            await ev("__life.P.st=999; const f=__life.foes[0]; if(f.alive){f.hp=1; f.state='stun'; f.t=5; f.x=1140}"); await run(1, {}, {'light': 1}); await run(30)
        R['grasp_drop'] = await ev("__life.soul.spells.has('grasp')+' kills '+__life.soul.kills")
        # joining at the shrine: Fire wind
        await ev("__life.soul.spells.delete('firewind'); __life.P.mats.ember=2; __life.P.seeds=100; __life.put(180,1000)"); await run(2); await run(1, {}, {'use': 1})
        await pg.click('#joinFW'); R['firewind'] = await ev("__life.soul.spells.has('firewind')")
        # spell book page
        await ev("__life.freeze(false)"); await pg.click('#tSpells'); await ev("__life.freeze(true)")
        await pg.keyboard.press('Tab'); await pg.click('[data-view="spells"]'); await pg.wait_for_timeout(100); await fr.screenshot(path=OUT + 'b8_07_book.png')
        await pg.select_option('[data-ws="0"]', 'pillar'); R['slot_select'] = await ev("__life.P.wordSlots.join()"); await pg.keyboard.press('Tab')
        # rebirth: spells stay; the past body teaches Echo
        await ev("__life.soul.spells.delete('echo')"); await ev("__life.freeze(false)"); await pg.click('#tEnd'); await pg.wait_for_timeout(2200); await pg.click('#deathIn .card'); await pg.wait_for_timeout(300); await ev("__life.freeze(true)")
        R['spells_after_rebirth'] = await ev("__life.soul.spells.size")
        await ev("(()=>{const L=__life; const b=L.soul.bodies[L.soul.bodies.length-1]; L.put(b.x-11,b.y); L.P.noMana=false; L.P.manaTierMax=100; L.applyStats(true);})()"); await run(3)
        R['echo_learned'] = await ev("__life.soul.spells.has('echo')")
        await cast('echo'); R['ally'] = await ev("!!__life.ALLY"); await run(20); await fr.screenshot(path=OUT + 'b8_08_echo.png')
        for k, v in R.items(): print(k, v)
        print('ERR', errs); await b.close()
asyncio.run(main())
