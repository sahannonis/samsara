"""Headless test of the current build: leveling, gathering, forge, rebirth.

    pip install playwright && playwright install chromium
    python build.py && python tests/test_growth.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB=os.path.join(ROOT,'vendor','astronomy.browser.min.js'); OUT=os.path.join(ROOT,'tests','shots')+'/'; os.makedirs(OUT, exist_ok=True)
PAGE='file://'+os.path.join(ROOT,'dist','samsara.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':1000})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        await pg.select_option('#micStart','off'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        ev=pg.evaluate; fr=pg.locator('#frame')
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        R={}
        R['birth']=await ev("JSON.stringify({stats:__life.P.stats, school:__life.P.school, noMana:__life.P.noMana, hp:__life.P.hpMax, st:__life.P.stBase, mana:__life.P.manaMax, lv:__life.levelOf()})")
        await run(5)
        # long banner: leather chest on the plank
        await ev("__life.noFoes(); __life.put(925,900)"); await run(2); await run(1,{},{'use':1}); await run(20); await fr.screenshot(path=OUT+'01_banner.png')
        # gather wood
        await ev("__life.put(600,1000); __life.P.face=1"); await run(4)
        for i in range(4): await ev("__life.P.st=999"); await run(1,{},{'light':1}); await run(25)
        R['wood']=await ev("__life.P.mats.wood"); await fr.screenshot(path=OUT+'02_tree.png')
        # ore in the tunnel while crouched
        await ev("__life.P.h=34; __life.put(1560,1000); __life.P.face=1"); await run(4,{"down":True})
        for i in range(4): await ev("__life.P.st=999"); await run(1,{'down':True},{'light':1}); await run(25,{'down':True})
        R['iron']=await ev("__life.P.mats.iron+' h'+__life.P.h")
        # petal by swimming into it
        await ev("__life.put(5290,1080)"); await run(30); R['petal']=await ev("__life.P.mats.petal")
        # ink from a kill
        await ev("""(()=>{const L=__life; L.put(180,1000); L.run(2); })()"""); await run(1,{},{'use':1}); await ev("document.querySelector('#ovGear').hidden=true"); 
        R['mode_after_shrine']=await ev("__life.mode")
        await pg.locator('#frame').screenshot(path=OUT+'03_shrine.png')
        await pg.keyboard.press('Escape'); R['mode_esc']=await ev("__life.mode")
        await ev("""(()=>{const L=__life; L.put(1100,1000); L.P.face=1; L.P.inv=99; const f=L.foes[0]; L.foes.forEach((g,i)=>{if(i>0)g.alive=false}); f.x=1140; f.hp=5; f.state='stun'; f.t=5;})()""")
        await run(1,{},{'light':1}); await run(30); R['ink']=await ev("__life.P.mats.ink+' foe '+__life.foes[0].alive+' '+__life.foes[0].state")
        # level up: rich tool, then the shrine panel
        await ev("__life.freeze(false)"); await pg.click('#tRich'); await ev("__life.freeze(true)")
        await ev("__life.put(180,1000)"); await run(2); await run(1,{},{'use':1})
        R['shrine_mode']=await ev("__life.mode"); hp0=await ev("__life.P.hpMax")
        for k in ['vit','vit','end','str']: await pg.click(f'[data-up="{k}"]')
        R['lv_after4']=await ev("__life.levelOf()+' hp'+__life.P.hpMax+' pend '+__life.P.skillPending")
        await pg.locator('#frame').screenshot(path=OUT+'04_skillpick.png')
        await pg.click('[data-skill="light_feet"]')
        await pg.click('[data-make="lotus"]'); R['lotus']=await ev("__life.P.lotusMax")
        for i in range(5): await pg.click('[data-up="str"]')
        R['lv10']=await ev("__life.levelOf()+' pend '+__life.P.skillPending+' skills '+[...__life.P.skills]")
        await pg.click('[data-skill="strong_back"]'); R['load']=await ev("__life.P.loadMax")
        await pg.locator('#frame').screenshot(path=OUT+'05_shrine_after.png')
        await pg.keyboard.press('Escape')
        # forge: temper the blade twice, compare damage
        d1=await ev("__life.wMul(__life.P.slots ? (__life.WEAPONS[0]) : null)")
        await ev("__life.P.seeds += 600; __life.P.mats.iron += 10"); await ev("__life.put(70,1000)"); await run(2); await run(1,{},{"use":1}); R["forge_mode"]=await ev("__life.mode")
        await pg.click('[data-tier="0"]'); await pg.click('[data-tier="0"]'); await pg.click('[data-make="knives"]'); await pg.click('[data-make="torch"]')
        d2=await ev("__life.wMul(__life.WEAPONS[0])"); R['blade_mul']=f'{d1:.3f} -> {d2:.3f}'
        R['forge_res']=await ev("JSON.stringify({tier:__life.P.wtier, knives:__life.P.knivesMax, torch:__life.P.torchMax, mats:__life.P.mats, seeds:__life.P.seeds})")
        await pg.locator('#frame').screenshot(path=OUT+'06_forge.png')
        await pg.keyboard.press('Escape')
        # long floater near the edge
        await ev("__life.put(30,1000)"); await run(1,{},{'h8':1}); await run(5); await fr.screenshot(path=OUT+'07_edge_floater.png')
        # nodes in other places
        await ev("__life.put(7600,660)"); await run(10); await fr.screenshot(path=OUT+'08_cave_nodes.png')
        await ev("__life.put(5400,1050)"); await run(5); await fr.screenshot(path=OUT+'09_petals.png')
        # rebirth
        await ev("__life.freeze(false)"); await pg.click('#tEnd'); await pg.wait_for_timeout(2200); await pg.screenshot(path=OUT+'10_death.png')
        await pg.click('#deathIn .card'); await pg.wait_for_timeout(300)
        R['reborn']=await ev("__life.levelOf()+' '+JSON.stringify(__life.P.mats)+' skills '+__life.P.skills.size+' tier '+JSON.stringify(__life.P.wtier)+' knives '+__life.P.knivesMax")
        for k,v in R.items(): print(k, v)
        print('ERR', errs); await b.close()
asyncio.run(main())
