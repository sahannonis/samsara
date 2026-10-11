"""Headless test of build 12: what a body born with no mana gets (scrolls, turning magic back, the Empty edge),
and the rule for a boss beaten in a past life.

    python build.py && python tests/test_born_empty.py
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
        await pg.select_option('#micStart', 'off'); await pg.click('#btnQuick'); await pg.wait_for_timeout(300)
        ev = pg.evaluate; fr = pg.locator('#frame')
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        boss = lambda id: f"__life.foes.find(f=>f.boss==='{id}')"
        R = {}
        # a body with mana cannot open the sealed chest or hold the Empty edge
        await ev("(()=>{const L=__life,P=L.P; P.noMana=false; P.manaTierMax=100; L.applyStats(true); L.setNight(false);})()")
        await ev("__life.put(11150,760)"); await run(3); await run(1, {}, {'use': 1}); R['sealed_for_mana'] = await ev("__life.mode+' opened '+!!__life.CHESTS_.find(c=>c.sealed).opened")
        # now make it a body with no mana
        await ev("document.getElementById('tEmpty').click()"); await run(2)
        R['empty_body'] = await ev("__life.P.noMana+' mana '+__life.P.manaMax+' slots '+__life.P.wordSlots.length")
        # the sealed chest opens; the blade can be held
        await run(1, {}, {'use': 1}); R['sealed_opens'] = await ev("__life.mode"); await ev("__life.moveItem(__life.CHESTS_.find(c=>c.sealed).inv,'weapon:6',true)")
        await pg.keyboard.press('Escape'); await run(2)
        await ev("__life.P.slots[0]=6; __life.P.slotIdx=0"); R['edge_in_hand'] = await ev("__life.WEAPONS[__life.P.slots[0]].name")
        await run(200); await fr.screenshot(path=OUT + 'b12_01_edge.png')
        # a spell chest gives scrolls to a body with no mana
        await ev("__life.put(2200,720)"); await run(2); await run(1, {}, {'use': 1})
        R['chest_scrolls'] = await ev("JSON.stringify(__life.P.scrolls)+' slots '+__life.P.wordSlots.join()+' knows '+__life.soul.spells.has('gust')")
        await run(30); await fr.screenshot(path=OUT + 'b12_02_scroll.png'); await run(300)
        # key 1 reads a scroll of Gust: no mana needed, one scroll used
        await ev("__life.put(500,1000)"); await run(3); await run(1, {}, {'h1': 1}); R['read_scroll'] = await ev("__life.P.scrolls.gust+' mana '+__life.P.mana")
        await run(1, {}, {'h1': 1}); await run(40); await run(1, {}, {'h1': 1}); R['no_scroll_left'] = await ev("__life.P.scrolls.gust")
        await run(4); await fr.screenshot(path=OUT + 'b12_03_hotbar.png')
        # write a scroll at a shrine with Grasping ink
        await ev("__life.P.mats.ink=6; __life.P.seeds=50; __life.put(220,1000)"); await run(2); await run(1, {}, {'use': 1}); await run(2)
        await pg.locator('[data-scribe="ignite"]').click(); R['scribe'] = await ev("__life.P.scrolls.ignite+' ink '+__life.P.mats.ink+' seeds '+__life.P.seeds")
        await fr.screenshot(path=OUT + 'b12_04_scribe.png'); await pg.keyboard.press('Escape'); await run(2)
        # turn magic back: a parried fire orb flies home
        await ev("__life.put(11700,760)"); await run(3); await run(60, {'right': True})
        R['wraith_fight'] = await ev("__life.ARENAS[1].fight")
        await run(80)
        await ev(f"(()=>{{const L=__life,P=L.P,B={boss('wraith')}; B.cd=99; L.P.hp=100; P.parryT=0.3; window.__orb={{hostile:true,fire:true,x:P.x+80,y:P.y+20,vx:-400,vy:0,life:2,dmg:12,r:9,src:B}}; L.shots.push(window.__orb);}})()")
        await run(14); R['orb_turned'] = await ev("'hostile '+window.__orb.hostile+' reflected '+!!window.__orb.reflected+' hp '+__life.P.hp")
        # a parried wave breaks
        await ev("(()=>{const L=__life,P=L.P; P.parryT=0.3; L.WAVES.push({x:P.x+70,dir:-1,gy:P.y+P.h,sp:400,left:400,dmg:14,h:30,hostile:true,fire:true});})()"); await run(20)
        R['wave_broken'] = await ev("__life.WAVES.filter(v=>v.hostile).length+' hp '+__life.P.hp")
        # the Empty edge against a boss: 40% deeper, poise twice as fast
        d = await ev(f"(()=>{{const B={boss('wraith')}; B.state='idle'; const h=B.hp, p=B.poise; __life.hurtFoe; return [h,p];}})()")
        await ev(f"(()=>{{const B={boss('wraith')}; window.__hp=B.hp; window.__po=B.poise;}})()")
        # beat it: no-mana body gets 3 scrolls of its move
        await ev(f"__life.hurtFoe({boss('wraith')}, 9999, true)"); await run(130)
        R['boss_scrolls'] = await ev("__life.P.scrolls.wisps+' knows '+__life.soul.spells.has('wisps')")
        await run(700)
        # rematch in a later life: nothing given, its own move hits three times as hard
        await ev("__life.P.prana=1; __life.fall('test')"); await run(200)
        await pg.locator('#deathIn .card').first.click(); await pg.wait_for_timeout(200); await ev("__life.freeze(true)")
        await ev("(()=>{const L=__life,P=L.P; P.noMana=false; P.manaTierMax=100; P.wordSlots=[null,null,null,null]; L.applyStats(true); L.setNight(false);})()")
        await ev("__life.put(11700,760)"); await run(3); await run(60, {'right': True}); await run(80)
        h = await ev(f"(()=>{{const B={boss('wraith')}; B.state='idle'; const a=B.hp; __life.hurtFoe(B,10,false); const b=B.hp; B.state='idle'; return [a,b];}})()")
        R['plain_hit'] = round(h[0] - h[1])
        await ev(f"(()=>{{const B={boss('wraith')}; window.__a=B.hp; B.state='idle'; B.x=__life.P.x+40; B.y=B.ar.gy-B.h;}})()")
        await ev("(()=>{const L=__life; L.P.mana=999; L.P.wordSlots=['wisps',null,null,null]; L.cast('wisps');})()"); await run(80)
        R['own_move'] = await ev(f"Math.round(window.__a-{boss('wraith')}.hp)+' wisps left '+__life.WISPS.length")
        await ev(f"__life.hurtFoe({boss('wraith')}, 9999, true)"); await run(100)
        R['rematch_reward'] = await ev("[__life.banner&&__life.banner.top, ...__life.BQ.map(b=>b.top)].join(' | ')+' · scrolls '+JSON.stringify(__life.P.scrolls)")
        await fr.screenshot(path=OUT + 'b12_05_again.png')
        # a mana body cannot hold the Empty edge
        await run(400); await pg.keyboard.press('Tab'); await run(2)
        R['edge_buttons'] = await ev("__life.P.weapons.has(6)")
        R['ERR'] = errs
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
