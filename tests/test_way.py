"""Headless test of build 21: mana, schools and the way of play from the chart. The reasons read from the chart,
the Body page, school signatures, mana growing with stillness and under a full Moon, Sovereign alone (damage,
prana, senses), Sangha with others (damage, wounds closing, bonds) and Balanced.

    python build.py && python tests/test_way.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart', 'off')
        # several random births, to see the chart's reasons vary
        R = {}; ev = pg.evaluate; fr = pg.locator('#frame')
        await pg.click('#btnQuick'); await pg.wait_for_timeout(200); await ev("__life.freeze(true); __life.setNight(false); __life.autoAsk='way'")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def tool(t): await ev(f"document.getElementById('{t}').click()"); await run(2)
        R['birth'] = await ev("(()=>{const b=__life.life.birth; return b.tierName+' '+b.school+' '+b.style+' · mana reasons '+b.why.mana.length+' score '+b.why.manaScore+' · schools '+b.why.schools.map(s=>s.id+' '+s.s).join(', ')+' · group '+b.why.social.group+' solo '+b.why.social.solo;})()")
        # make sure this body has mana, for the school tests
        if await ev("__life.P.noMana"):
            await ev("(()=>{const P=__life.P; P.noMana=false; P.manaTierMax=60; P.school='Agni'; __life.life.birth=Object.assign({},__life.life.birth,{tier:2,tierName:'Medium',school:'Agni'}); P.wordSlots=['ignite','shield']; __life.applyStats(true);})()")
        await pg.keyboard.press('Tab'); await run(1); await pg.click('[data-view="body"]'); await run(1)
        R['body_page'] = await ev("document.querySelector('#gearIn h2').innerText+' | '+[...document.querySelectorAll('#gearIn .lbl')].map(l=>l.innerText).join(' | ')")
        await fr.screenshot(path=OUT + 'b21_01_body.png'); await pg.keyboard.press('Escape'); await run(2)
        # the way: cycle to Sovereign
        for i in range(3):
            if await ev("__life.wayOf()") == 'Sovereign': break
            await tool('tWay')
        R['sovereign'] = await ev("'way '+__life.wayOf()+' prana '+__life.P.prana+'/'+__life.P.pranaMax+' alone '+__life.aloneNow()+' dmg '+__life.wayBoon('dmg')")
        await ev("__life.SUMMONS.push({id:'asura', x:__life.P.x, y:__life.P.y, t:10, cd:1, pow:1, face:1, swing:0})"); await run(1)
        R['sovereign_with'] = await ev("'alone '+__life.aloneNow()+' with '+__life.companions()+' dmg '+__life.wayBoon('dmg')")
        await tool('tWay'); await run(1)
        await ev("__life.P.hp = 50"); await run(60)
        R['sangha_with'] = await ev("'way '+__life.wayOf()+' prana '+__life.P.prana+'/'+__life.P.pranaMax+' dmg '+__life.wayBoon('dmg')+' hp after 1s '+__life.P.hp.toFixed(1)")
        b0 = await ev("__life.soul.paths.bhakti"); await ev("__life.walk('bhakti', 2)"); R['sangha_bonds'] = await ev(f"'bhakti {b0} -> '+__life.soul.paths.bhakti")
        await ev("__life.SUMMONS.length = 0"); await run(2)
        await ev("__life.P.hp = 50"); await run(60); R['sangha_alone'] = await ev("'dmg '+__life.wayBoon('dmg')+' hp after 1s '+__life.P.hp.toFixed(1)")
        await tool('tWay'); R['balanced'] = await ev("'way '+__life.wayOf()+' dmg alone '+__life.wayBoon('dmg')")
        # schools
        out = []
        for i in range(5):
            out.append(await ev("__life.P.school+': heal '+__life.schoolBoon('heal')+' prot '+__life.schoolBoon('prot')"))
            await tool('tSchool')
        R['schools'] = ' | '.join(out)
        for i in range(5):
            if await ev("__life.P.school") == 'Vayu': break
            await tool('tSchool')
        await ev("__life.noFoes(); __life.put(600,1000)"); await run(30); await run(30, {'right': True}); vv = await ev("Math.round(__life.P.vx)")
        await tool('tSchool'); await ev("__life.put(600,1000)"); await run(30); await run(30, {'right': True}); R['vayu_walk'] = await ev(f"'Vayu vx {vv} · '+__life.P.school+' vx '+Math.round(__life.P.vx)")
        for i in range(5):
            if await ev("__life.P.school") == 'Akasha': break
            await tool('tSchool')
        r0 = await ev("__life.soul.ranks.ignite||0"); await ev("__life.P.mana=__life.P.manaMax; __life.cast('ignite')"); R['akasha_rank'] = await ev(f"'ignite casts {r0} -> '+__life.soul.ranks.ignite")
        # the full Moon
        await ev("__life.moonTest = 0"); await ev("__life.P.mana = 0"); await run(60); m1 = await ev("__life.P.mana")
        await ev("__life.moonTest = 1"); await ev("__life.P.mana = 0"); await run(60); m2 = await ev("__life.P.mana")
        R['moon'] = f"mana in 1s: new Moon {m1:.2f}, full Moon {m2:.2f}"
        await ev("__life.moonTest = null")
        # mana grows with deep stillness
        mx0 = await ev("__life.P.manaMax"); await ev("__life.put(220,1000)"); await run(3)
        for i in range(2):
            await ev("__life.openMeditation(0); __life.MED.calm = 90; __life.MED.t = 63.9"); await run(30); await ev("__life.BQ.length=0")
        R['stillness_mana'] = await ev(f"'manaMax {mx0} -> '+__life.P.manaMax+' growth '+__life.manaGrowth()")
        # Sovereign senses: a foe beyond the edge of sight
        await tool('tWay')
        for i in range(3):
            if await ev("__life.wayOf()") == 'Sovereign': break
            await tool('tWay')
        await ev("(()=>{__life.put(1700,1000); const f=__life.foes.find(f=>!f.boss); f.alive=true; f.x=1700+900; f.l=2400; f.r=2900; f.gy=1000; f.y=1000-f.h; const g=__life.foes.filter(f=>!f.boss)[1]; g.alive=true; g.x=1700-760; g.l=700; g.r=1000; g.gy=1000; g.y=1000-g.h;})()")
        await run(3); await fr.screenshot(path=OUT + 'b21_02_senses.png')
        await pg.keyboard.press('Tab'); await run(1); await pg.click('[data-view="body"]'); await run(1); await fr.screenshot(path=OUT + 'b21_03_body_sovereign.png'); await pg.keyboard.press('Escape'); await run(2)
        # a body with no mana: no mana words, its own twins (new Moon, stamina from stillness)
        await tool('tEmpty'); await ev("__life.BQ.length=0")
        await pg.keyboard.press('Tab'); await run(1); await pg.click('[data-view="body"]'); await run(1)
        txt = await ev("document.getElementById('gearIn').innerText")
        R['empty_body_mentions_mana_returns'] = 'mana returns' in txt or "grows this body's mana" in txt
        R['empty_body_twins'] = ('dark sky' in txt) and ("grows this body's stamina" in txt)
        await fr.screenshot(path=OUT + 'b21_04_body_empty.png'); await pg.keyboard.press('Escape'); await run(2)
        await ev("__life.noFoes(); __life.put(220,1000)"); await run(3)
        async def st_regen(moon):
            await ev(f"__life.moonTest = {moon}"); await ev("__life.P.st = 0; __life.P.stDelay = 0"); await run(30); return await ev("__life.P.st")
        a1 = await st_regen(1); a0 = await st_regen(0); R['empty_moon'] = f"stamina in 0.5s: full Moon {a1:.1f}, new Moon {a0:.1f} · HUD tag new moon {await ev('__life.moonStamina()')}"
        await ev("__life.moonTest = null")
        s0 = await ev("__life.P.stBase"); await ev("__life.openMeditation(0); __life.MED.calm = 90; __life.MED.t = 63.9"); await run(30)
        R['empty_stillness'] = await ev(f"'stamina {s0} -> '+__life.P.stBase+'/'+__life.P.stMax+' mana '+__life.P.manaMax+' banner '+(__life.banner2&&__life.banner2.sub)")
        print(json.dumps(R, indent=1)); print('errors', errs)
        await b.close()
asyncio.run(main())
