"""Headless test of build 11: the trial road, three test bosses, their spells, three more spells, and the HUD box.

    python build.py && python tests/test_bosses.py
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
        await ev("(()=>{const L=__life,P=L.P; P.noMana=false; P.manaTierMax=100; L.applyStats(true); L.setNight(false);})()")
        cast = lambda id: ev(f"(()=>{{const L=__life; L.P.mana=999; L.P.wordSlots=['{id}',null,null,null]; L.learnSpell('{id}'); L.cast('{id}');}})()")
        boss = lambda id: f"__life.foes.find(f=>f.boss==='{id}')"
        R = {}
        # HUD: the right box fits its text, even with blessing and summon timers
        await run(200); await ev("__life.P.bless={el:'agni',t:40,pow:1}; __life.SUMMONS.push({id:'deva',t:20,cd:9,x:__life.P.x,y:__life.P.y,pow:1})"); await run(2)
        await fr.screenshot(path=OUT + 'b11_01_hud.png'); await ev("__life.P.bless=null; __life.SUMMONS.length=0")
        # walk into the Chief's ring: the gates close
        await ev("__life.put(10140,760)"); await run(3); await run(60, {'right': True})
        A = "__life.ARENAS[0]"
        R['chief_fight'] = await ev(f"{A}.fight+' '+{boss('chief')}.state")
        await run(80); await fr.screenshot(path=OUT + 'b11_02_chief.png')
        # it attacks: hit taken, waves or swings
        await ev("__life.P.hp=100; __life.P.seeds=80"); seen = set(); hp0 = 100
        for i in range(60):
            await run(10); st = await ev(f"{boss('chief')}.state+'|'+__life.WAVES.filter(v=>v.hostile).length")
            seen.add(st.split('|')[0]); 
            if st.split('|')[1] != '0': seen.add('wave')
            await ev("__life.P.hp=100")
        R['chief_moves'] = ','.join(sorted(seen)); R['chief_hit_flag'] = await ev(f"{A}.hit"); R['seeds_after'] = await ev("__life.P.seeds+' stolen '+" + boss('chief') + ".stolen")
        # the gate holds you in
        await ev("__life.put(10260,760)"); await run(40, {'left': True}); R['gate_holds'] = await ev("Math.round(__life.P.x)")
        # phase two calls kin
        await ev(f"(()=>{{const B={boss('chief')}; B.hp=B.hpMax*0.45; B.state='idle';}})()"); await run(4)
        R['phase2'] = await ev(f"{boss('chief')}.phase+' kin '+__life.foes.filter(f=>f.arena==='chief'&&f.alive).length")
        await run(60); await fr.screenshot(path=OUT + 'b11_03_chief_phase2.png')
        # the grab steals seeds, and they come back when it falls
        await ev("__life.foes.filter(f=>!f.boss).forEach(f=>f.alive=false)"); await ev(f"(()=>{{const L=__life,B={boss('chief')}; L.P.inv=0; L.P.rollIF=0; L.P.seeds=80; B.x=L.P.x+90; B.face=-1; B.state='gwind'; B.t=0.05;}})()"); await run(40)
        R['grab'] = await ev(f"__life.P.seeds+' stolen '+{boss('chief')}.stolen")
        # kill it
        sd0 = await ev("__life.P.seeds")
        await ev(f"(()=>{{const B={boss('chief')}; __life.hurtFoe(B, 9999, true);}})()"); await run(120)
        R['chief_seeds'] = f"{sd0} -> {await ev('__life.P.seeds')}" 
        R['chief_down'] = await ev(f"{A}.fight+' alive '+({boss('chief')}||{{alive:false}}).alive+' quake '+__life.soul.spells.has('quake')+' vajra '+__life.soul.spells.has('vajra')+' kin '+__life.foes.filter(f=>f.arena==='chief'&&f.alive).length")
        await fr.screenshot(path=OUT + 'b11_04_chief_falls.png')
        await run(500)
        # the Ember Wraith: orbs and a dive, then won without a hit, which gives Vajra
        await ev("__life.put(11330,760); __life.P.hp=100"); await run(3); await run(70, {'right': True})
        A2 = "__life.ARENAS[1]"; R['wraith_fight'] = await ev(f"{A2}.fight")
        await ev("__life.P.inv=99"); seen = set(); orbs = 0
        for i in range(70):
            await run(8); st = await ev(f"{boss('wraith')}.state+'|'+__life.foes.length")
            seen.add(st.split('|')[0])
            orbs = max(orbs, await ev("0+(()=>{let n=0; return n})()"))
            if i == 30: await fr.screenshot(path=OUT + 'b11_05_wraith.png')
        R['wraith_moves'] = ','.join(sorted(seen)); R['wraith_hit_flag'] = await ev(f"{A2}.hit")
        await ev(f"(()=>{{const B={boss('wraith')}; __life.hurtFoe(B, 9999, true);}})()"); await run(130)
        R['wraith_down'] = await ev(f"'wisps '+__life.soul.spells.has('wisps')+' vajra '+__life.soul.spells.has('vajra')+' banner '+((__life.P&&1)?'':'')")
        await fr.screenshot(path=OUT + 'b11_06_gift.png'); await ev("__life.P.inv=0"); await run(600)
        # the Masked One: guard counters a light blow, a heavy blow breaks it; it steps through ink
        await ev("__life.put(12560,760); __life.P.hp=100"); await run(3); await run(60, {'right': True})
        await run(90); await ev(f"(()=>{{const B={boss('masked')}; B.state='guard'; B.t=1; B.hidden=false; B.x=__life.P.x+60;}})()")
        await ev(f"__life.hurtFoe({boss('masked')}, 10, false)"); R['guard_light'] = await ev(f"{boss('masked')}.state+' hp '+{boss('masked')}.hp")
        await run(30); await ev(f"(()=>{{const B={boss('masked')}; B.state='guard'; B.t=1; B.hidden=false; B.x=__life.P.x+60;}})()")
        await ev(f"__life.hurtFoe({boss('masked')}, 10, true)"); R['guard_heavy'] = await ev(f"{boss('masked')}.state")
        seen = set(); await ev("__life.P.inv=99")
        for i in range(80):
            await run(6); seen.add(await ev(f"{boss('masked')}.state")); 
            if i == 40: await fr.screenshot(path=OUT + 'b11_07_masked.png')
        R['masked_moves'] = ','.join(sorted(seen))
        await ev(f"(()=>{{const B={boss('masked')}; B.hp=B.hpMax*0.4; B.state='idle';}})()"); await run(6); R['mirror'] = await ev("__life.foes.filter(f=>f.mirror&&f.alive).length")
        await ev(f"(()=>{{const B={boss('masked')}; B.state='vanish'; B.t=0.45; B.hidden=true;}})()"); h0 = await ev(f"{boss('masked')}.hp"); await ev(f"__life.hurtFoe({boss('masked')}, 50, true)")
        await run(30); R['vanish'] = await ev(f"'hp kept '+({boss('masked')}.hp==={h0})+' hidden '+{boss('masked')}.hidden+' behind '+(Math.sign({boss('masked')}.x-__life.P.x)===-__life.P.face)")
        await run(40); await fr.screenshot(path=OUT + 'b11_08_mirror.png')
        # falling in a fight resets it
        await ev("__life.P.inv=0; __life.fall('test')"); await run(200)
        R['reset'] = await ev(f"__life.ARENAS[2].fight+' hp '+{boss('masked')}.hp+'/'+{boss('masked')}.hpMax+' state '+{boss('masked')}.state+' shrine '+__life.P.shrine")
        # the map shows the bosses
        await pg.keyboard.press('m'); await run(2); await fr.screenshot(path=OUT + 'b11_09_map.png'); await pg.keyboard.press('m'); await run(2)
        # --- the new spells ---
        await ev("__life.freeze(true)")
        # Quake: waves knock a foe down the road
        await ev("__life.put(1080,1000); __life.P.face=1"); await run(3); h0 = await ev("__life.foes[0].hp"); await cast('quake'); await run(40)
        R['quake'] = f"{h0} -> {await ev('Math.round(__life.foes[0].hp)')} alive {await ev('__life.foes[0].alive')}"
        # Wisps fly at a foe
        await ev("__life.put(3640,1100); __life.P.face=1"); await run(2); h0 = await ev("__life.foes[4].hp"); await cast('wisps'); n0 = await ev("__life.WISPS.length"); await run(90)
        R['wisps'] = f"{n0} wisps, foe {h0} -> {await ev('Math.round(__life.foes[4].hp)')}, left {await ev('__life.WISPS.length')}"
        await fr.screenshot(path=OUT + 'b11_10_wisps.png')
        # Ink step: 200 forward, stopped by a wall
        await ev("__life.noFoes(); __life.put(500,1000); __life.P.face=1"); await run(3); x0 = await ev("__life.P.x"); await cast('inkstep'); x1 = await ev("__life.P.x"); R['inkstep'] = f'{x0:.0f} -> {x1:.0f}'
        await ev("__life.put(1250,1000); __life.P.face=1"); await run(3); await cast('inkstep'); R['inkstep_wall'] = await ev("Math.round(__life.P.x)")
        # Surya: the sun stone wakes only with the real Sun high
        await ev("__life.setNight(true); __life.put(2850,790)"); await run(3); await run(1, {}, {'use': 1}); R['sun_stone_night'] = await ev("__life.soul.spells.has('surya')")
        await ev("__life.setNight(false)"); await run(1, {}, {'use': 1}); R['sun_stone_day'] = await ev("__life.soul.spells.has('surya')+' alt '+__life.sunAlt()")
        await run(30); await fr.screenshot(path=OUT + 'b11_11_sunstone.png')
        await ev("__life.setNight(true)"); R['surya_night'] = await ev("(()=>{const L=__life; L.P.mana=999; L.P.wordSlots=['surya',null,null,null]; const m=L.P.mana; L.cast('surya'); return L.P.mana===m;})()")
        await ev("__life.setNight(false)")
        open_ = await ev("(()=>{const L=__life; L.P.x=0; return 1})()")
        await run(300)
        # Karuna: spare three in one life
        await ev("__life.put(3640,1100)"); await run(2)
        await ev("(()=>{const L=__life; L.foes.slice(0,3).forEach(f=>{f.alive=true; f.state='kneel'; f.kneelT=0; f.awayT=5; f.hp=1;});})()"); await run(3)
        R['karuna_learned'] = await ev("__life.soul.spells.has('karuna')+' spared '+__life.life.spared")
        await run(300)
        # calm a foe: it stops; striking it weighs on karma
        await ev("(()=>{const L=__life, f=L.foes[4]; f.alive=true; f.hp=36; f.state='idle'; f.x=3700; L.put(3640,1100); L.P.face=1;})()"); await run(2)
        await cast('karuna'); await run(60); R['karuna_calm'] = await ev("Math.round(__life.foes[4].calmT)+' '+__life.foes[4].state+' hp '+__life.P.hp")
        k0 = await ev("__life.soul.karma"); await ev("__life.hurtFoe(__life.foes[4], 5, false)"); R['karuna_break'] = f"karma {k0} -> {await ev('__life.soul.karma')}"
        # Vajra jumps between foes
        await ev("(()=>{const L=__life; [4,5].forEach(i=>{const f=L.foes[i]; f.alive=true; f.hp=36; f.state='idle'; f.calmT=0;}); L.foes[4].x=3800; L.foes[5].x=3990; L.put(3640,1100); L.P.face=1;})()"); await run(2)
        await cast('vajra'); R['vajra'] = await ev("Math.round(__life.foes[4].hp)+','+Math.round(__life.foes[5].hp)")
        await run(2); await fr.screenshot(path=OUT + 'b11_12_vajra.png')
        # Surya by day hurts a foe under it
        await ev("(()=>{const L=__life, f=L.foes[5]; f.alive=true; f.hp=36; L.put(3800,1100); L.mouse.in=true; L.mouse.x=f.x+12-L.cam[0]; L.mouse.y=f.y-L.cam[1];})()"); await run(2)
        await ev("(()=>{const L=__life, f=L.foes[5]; L.mouse.x=f.x+12-L.cam[0]; L.mouse.y=f.y-L.cam[1];})()")
        await cast('surya'); R['surya_day'] = await ev("Math.round(__life.foes[5].hp)+' alive '+__life.foes[5].alive"); await run(4); await fr.screenshot(path=OUT + 'b11_13_surya.png')
        await ev("__life.mouse.in=false")
        # a new life: the bosses wait again, the gifts stay
        await ev("__life.P.prana=1; __life.fall('test')"); await run(200)
        await pg.locator('#deathIn .card').first.click(); await pg.wait_for_timeout(200); await ev("__life.freeze(true)")
        R['new_life'] = await ev("__life.foes.filter(f=>f.boss).length+' bosses, gifts '+['quake','wisps','vajra','surya','karuna'].map(i=>__life.soul.spells.has(i)).join()")
        R['ERR'] = errs
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
