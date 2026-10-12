"""Headless test of build 18: karma 2 and rebirth 2. Witnesses (unseen deeds weigh twice), the dog and the shrine gift,
the wheel's question after a boss and the check of words against deeds, the world's reactions, the new death screen
(verdict, realm, fragments, births by karma), and a debt that follows into the next life and is paid.

    python build.py && python tests/test_karma.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 1000})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e) + ' @ ' + (e.stack or '')[:400]))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        await pg.select_option('#micStart', 'off'); await pg.click('#btnQuick'); await pg.wait_for_timeout(200)
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        R['no_number'] = await ev("!/karma/i.test(document.getElementById('frame').innerText)")
        # a kneeling foe struck down with a witness near, and one struck down alone
        last = "JSON.stringify(__life.life.deeds[__life.life.deeds.length-1])"
        await ev("(()=>{const L=__life,f=L.foes[4],g=L.foes[5]; L.put(4100,1100); f.x=4130; f.state='kneel'; f.hp=1; g.x=4250; g.state='idle'; g.alive=true;})()"); await ev("__life.hurtFoe(__life.foes[4], 5, false)")
        R['seen_deed'] = await ev(last)
        await ev("(()=>{const L=__life; L.foes.forEach(f=>{ if(!f.boss) f.alive=false; }); const f=L.foes[2]; f.alive=true; L.put(2500,1000); f.x=2530; f.state='kneel'; f.hp=1;})()"); await ev("__life.hurtFoe(__life.foes[2], 5, false)")
        R['unseen_deed'] = await ev(last)
        await run(10); await fr.screenshot(path=OUT + 'b18_01_felt.png')
        # the dog
        await ev("(()=>{const L=__life; L.put(L.DOG.x-20, L.DOG.gy); L.P.lotus=2;})()"); await run(3); await run(1, {}, {'use': 1}); R['dog'] = await ev(last + "+' lotus '+__life.P.lotus")
        await run(20); await fr.screenshot(path=OUT + 'b18_02_dog.png')
        # leave seeds at a shrine
        await ev("__life.put(220,1000); __life.P.seeds=80"); await run(3); await run(1, {}, {'use': 1}); await pg.click('#dana'); R['dana'] = await ev(last + "+' seeds '+__life.P.seeds")
        # a boss falls and the wheel asks why
        await ev("__life.put(10200,760)"); await run(3); await run(60, {'right': True})
        await ev("__life.hurtFoe(__life.foes.find(f=>f.boss==='chief'), 9999, true)"); await run(140)
        for i in range(40):
            if await ev("__life.mode") == 'ask': break
            await run(30)
        R['asked'] = await ev("__life.mode+' · '+document.querySelector('#gearIn h2').innerText")
        await fr.screenshot(path=OUT + 'b18_03_ask.png')
        await pg.click('[data-why="protect"]'); R['intent'] = await ev("JSON.stringify(__life.life.intents)")
        # the world reacts: with good karma some Grasping are at peace and more of them beg; with heavy karma none beg
        await ev("__life.soul.karma = 7"); peace = 0
        for i in range(4):
            await ev("__life.spawnFoes()"); peace = max(peace, await ev("__life.foes.filter(f=>f.peace).length"))
        R['peace_foes'] = peace; R['beg_good'] = await ev("__life.begChance()")
        await ev("__life.soul.karma = -5"); R['beg_heavy'] = await ev("__life.begChance()")
        await ev("(()=>{const L=__life; L.soul.karma=7; L.spawnFoes(); let f=L.foes.find(f=>f.peace&&!f.boss); if(!f){f=L.foes[3]; f.peace=true;} L.put(f.x-60, f.gy); L.P.hp=100;})()"); await run(120)
        R['peace_holds'] = await ev("(()=>{const f=__life.foes.find(f=>f.peace); return f.state+' hp '+__life.P.hp;})()")
        await fr.screenshot(path=OUT + 'b18_04_peace.png')
        # a cruel life that said it fought to protect: words and hands disagree; heavy karma: one birth, a debt, no fragments
        await ev("(()=>{const L=__life; L.soul.karma=-3; L.P.skills.add('light_feet'); L.P.stats.str+=1;})()")
        await ev("__life.P.prana=1; __life.fall('test')"); await run(200)
        R['death_screen'] = await ev("document.getElementById('deathIn').innerText.replace(/\\n+/g,' | ').slice(0,1400)")
        R['births_heavy'] = await ev("document.querySelectorAll('#deathIn .card').length+' frags enabled '+[...document.querySelectorAll('#deathIn .frag')].filter(b=>!b.disabled).length")
        R['lie'] = await ev("__life.life.deeds.some(d=>d.kind==='lie')+' debt '+JSON.stringify(__life.soul.debt)")
        await pg.screenshot(path=OUT + 'b18_05_death.png', full_page=True)
        await pg.locator('#deathIn .card').first.click(); await pg.wait_for_timeout(200); await ev("__life.freeze(true)")
        R['debt_life'] = await ev("'lotusMax '+__life.P.lotusMax+' shrine '+__life.P.shrine+' ghost '+__life.life.debtGhost")
        await ev("(()=>{const L=__life,d=L.soul.debt; L.put(d.x-10,d.gy); L.P.lotus=Math.max(1,L.P.lotus);})()"); await run(30)
        await fr.screenshot(path=OUT + 'b18_06_debt.png')
        await run(1, {}, {'use': 1}); await run(2)
        R['debt_paid'] = await ev("'debt '+__life.soul.debt+' lotusMax '+__life.P.lotusMax+' '+" + last)
        await run(30); await fr.screenshot(path=OUT + 'b18_07_paid.png'); await run(300)
        # a good soul: three births to choose from, the most fortunate on offer, and two fragments
        await ev("(()=>{const L=__life; L.soul.karma=9; L.P.skills.add('iron_lungs'); L.P.stats.agi+=1; L.P.wtier[0]=3;})()")
        await ev("__life.P.prana=1; __life.fall('test')"); await run(200)
        R['births_good'] = await ev("document.querySelectorAll('#deathIn .card').length+' · '+document.querySelector('#deathIn .lbl').innerText")
        await pg.locator('#deathIn .frag').nth(0).click(); await pg.locator('#deathIn .frag').nth(2).click()
        R['chosen'] = await ev("[...document.querySelectorAll('#deathIn .frag.on')].map(e=>e.querySelector('b').innerText).join(' + ')")
        await pg.screenshot(path=OUT + 'b18_08_good_death.png', full_page=True)
        await pg.locator('#deathIn .card').first.click(); await pg.wait_for_timeout(200)
        R['carried'] = await ev("JSON.stringify(__life.life.carried)+' skills '+[...__life.P.skills].join()+' blade tier '+(__life.P.wtier[0]||1)")
        R['realm_good'] = await ev("__life.soul.lives[__life.soul.lives.length-2].realm")
        R['ERR'] = errs
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
