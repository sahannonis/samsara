"""Headless test of build 20: the five paths. Hidden progress fed by deeds, steps and gifts, the end of a road
needing more than one life, the teacher (and the road walked alone closing), body arts for a body with no mana,
the rare spark of mana, the riddle's faded answer and the seat of clear seeing.

    python build.py && python tests/test_paths.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
async def newpage(b):
    pg = await b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
    await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart', 'off'); await pg.click('#btnQuick'); await pg.wait_for_timeout(200)
    await pg.evaluate("__life.freeze(true); __life.setNight(false); __life.autoAsk='way'"); return pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg, errs = await newpage(b); ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def clear(): await ev("__life.BQ.length = 0"); await run(1); await ev("(()=>{ const b=__life.banner2; if(b) b.t=0; })()"); await run(2)
        R['start'] = await ev("JSON.stringify(__life.soul.paths)+' alone closed '+__life.soul.aloneClosed")
        # jnana: walking through the false wall
        await ev("__life.put(9560,760)"); await run(3); await run(50, {'right': True})
        R['false_wall'] = await ev("'found '+__life.FAKES[0].found+' jnana '+__life.soul.paths.jnana")
        # karma and bhakti: feeding the dog (unseen deeds weigh twice)
        await ev("__life.noFoes(); __life.put(__life.DOG.x-30, __life.DOG.gy)"); await run(3); await run(1, {}, {'use': 1})
        R['dog'] = await ev("'karma '+__life.soul.paths.karma+' bhakti '+__life.soul.paths.bhakti+' lives '+JSON.stringify(__life.soul.pathLives)")
        # a road does not end in a single life: plenty of points, still step 2
        await ev("__life.walk('dhyana', 30)"); await clear()
        R['one_life'] = await ev("'dhyana points '+__life.soul.paths.dhyana+' step '+__life.pathAt('dhyana')")
        # shrine: only feelings, no numbers
        await ev("__life.put(220,1000)"); await run(3); await run(1, {}, {'use': 1}); await run(1)
        roads = await ev("document.getElementById('gearIn').innerText")
        R['shrine_roads'] = ' | '.join(l for l in roads.split('\n') if 'road' in l.lower())[:600]
        await fr.screenshot(path=OUT + 'b20_01_shrine_roads.png'); await pg.keyboard.press('Escape'); await run(2)
        # bhakti step 1: one more lotus
        lot0 = await ev("__life.P.lotusMax"); await ev("__life.walk('bhakti', 4)"); await run(2)
        R['bhakti_1'] = await ev(f"'lotus {lot0} -> '+__life.P.lotusMax+' banner '+(__life.banner2&&__life.banner2.top)")
        await fr.screenshot(path=OUT + 'b20_02_step.png'); await clear()
        # the teacher: bowing closes the road walked alone
        await ev("__life.walk('alone', 4)"); R['alone_before'] = await ev("'alone step '+__life.pathAt('alone')+' stamina '+__life.P.stBase"); await clear()
        await ev("document.getElementById('tTeacher').click()"); await run(2); await run(1, {}, {'use': 1}); await run(1)
        R['teacher_first'] = await ev("__life.mode+' · '+document.querySelector('#gearIn h2').innerText")
        await fr.screenshot(path=OUT + 'b20_03_teacher.png')
        await pg.click('#teBow'); await run(2)
        R['bowed'] = await ev("'closed '+__life.soul.aloneClosed+' alone step '+__life.pathAt('alone')+' bhakti '+__life.soul.paths.bhakti+' banner '+(__life.banner2&&__life.banner2.top)")
        await clear(); await run(1, {}, {'use': 1}); await run(1)
        R['task'] = await ev("document.querySelector('#gearIn h2').innerText+' · done enabled '+!document.getElementById('teDone').disabled")
        await pg.click('#teDone'); await run(2)
        R['served'] = await ev("'served '+__life.soul.teacher.served+' bhakti '+__life.soul.paths.bhakti+' petals '+__life.P.mats.petal")
        await run(1, {}, {'use': 1}); await run(1); R['task2'] = await ev("document.querySelector('#gearIn h2').innerText+' · done enabled '+!document.getElementById('teDone').disabled")
        await pg.click('#teGo'); await run(2)
        await ev("__life.walk('alone', 20)"); R['alone_after'] = await ev("'alone points '+__life.soul.paths.alone+' step '+__life.pathAt('alone')")
        await fr.screenshot(path=OUT + 'b20_04_teacher_bowed.png')
        # every road to its end (the test tool counts another life for the third step)
        for i in range(3): await ev("document.getElementById('tPaths').click()"); await run(2); await clear()
        R['steps'] = await ev("JSON.stringify(__life.soul.pathStep)+' arts '+[...__life.soul.arts].join(',')+' keep '+__life.keepCount()")
        R['boons'] = await ev("['heal','dmg','mana','st','prot'].map(k=>k+' '+__life.roadBoon(k).toFixed(2)).join(' · ')")
        # bhakti end: held back once
        await ev("__life.noFoes(); __life.put(220,1000)"); await run(30); await ev("__life.hurtPlayer(9999)"); await run(1)
        R['held_back'] = await ev("'hp '+Math.round(__life.P.hp)+'/'+__life.P.hpMax+' dead '+__life.P.dead+' held '+__life.life.heldBack")
        await run(80); await ev("__life.hurtPlayer(9999)"); await run(1); R['second_blow'] = await ev("'dead '+__life.P.dead"); await run(200)
        for i in range(60):
            if await ev("__life.mode") in ('play',) and not await ev("__life.P.dead"): break
            if await ev("__life.mode") == 'death' or await ev("!document.getElementById('ovDeath').hidden"): break
            await run(30)
        R['after_fall'] = await ev("__life.mode+' dead '+__life.P.dead")
        # riddle: one false answer fades
        await ev("__life.openRiddle()"); await run(1)
        R['riddle_faded'] = await ev("document.querySelectorAll('#gearIn .choice.faded').length+' faded · disabled '+document.querySelector('#gearIn .choice.faded').disabled")
        await fr.screenshot(path=OUT + 'b20_05_riddle_faded.png')
        fi = await ev("(()=>{const q=document.querySelector('#gearIn h2').innerText; const r=__life.RIDDLES.find(r=>r.q===q); const f=[...document.querySelectorAll('#gearIn .choice')].findIndex(c=>c.classList.contains('faded')); return f!==r.r;})()")
        R['faded_is_false'] = fi
        await ev("document.querySelector('#gearIn .choice:not(.faded)').click()"); await run(2); await clear()
        await pg.screenshot(path=OUT + 'b20_tmp.png')
        print(json.dumps(R, indent=1)); print('errors', errs); R = {}
        # a fresh soul: a body with no mana learns body arts by right action
        await b.close(); b = await p.chromium.launch(); pg, errs2 = await newpage(b); ev = pg.evaluate; fr = pg.locator('#frame'); errs += errs2
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        await ev("document.getElementById('tEmpty').click()"); await run(2); await clear()
        await ev("__life.walk('karma', 4)"); await run(2)
        R['art_1'] = await ev("'arts '+[...__life.soul.arts].join(',')+' keys '+JSON.stringify(__life.P.wordSlots)+' · '+(__life.banner2&&__life.banner2.sub).slice(-160)")
        await clear()
        # breath strike against a foe in front
        await ev("__life.put(1100,1000)"); await run(3)
        await ev("(()=>{const f=__life.foes.find(f=>!f.boss&&f.alive); f.x=__life.P.x+60; f.gy=1000; f.y=1000-f.h; f.state='idle'; window.__f=f;})()")
        await ev("__life.P.face=1"); hp0 = await ev("__life.__f ? 0 : window.__f.hp"); await run(1, {}, {'h1': 1}); await run(2)
        R['breath'] = await ev(f"'foe hp {hp0} -> '+window.__f.hp+' stun '+window.__f.state+' cd '+__life.P.artCd.breath.toFixed(1)+' st '+Math.round(__life.P.st)")
        await run(1, {}, {'h1': 1}); R['breath_rest'] = await ev("__life.P.artCd.breath.toFixed(1)")
        await fr.screenshot(path=OUT + 'b20_06_breath.png')
        # iron stance: blows lose 80%
        await ev("__life.walk('karma', 6)"); await run(2); await clear(); await run(120)
        R['art_2'] = await ev("[...__life.soul.arts].join(',')+' keys '+JSON.stringify(__life.P.wordSlots)")
        await ev("__life.P.hp = __life.P.hpMax"); hp1 = await ev("__life.P.hp")
        await run(1, {}, {'h2': 1}); await run(5); await ev("__life.hurtPlayer(50)"); await run(1)
        R['iron'] = await ev(f"'hp {hp1} -> '+Math.round(__life.P.hp)+' rooted '+(__life.P.ironT>0)+' vx '+__life.P.vx")
        await fr.screenshot(path=OUT + 'b20_07_iron.png')
        await run(1, {'right': True}); R['iron_still'] = await ev("'x moves '+Math.round(__life.P.vx)")
        await run(120)
        # without the art, the same blow
        await ev("__life.P.hp = __life.P.hpMax; __life.P.inv=0"); await ev("__life.hurtPlayer(50)"); R['no_iron'] = await ev(f"'hp {hp1} -> '+Math.round(__life.P.hp)")
        await run(120)
        # empty step: through two foes
        await ev("__life.P.hp = __life.P.hpMax; __life.soul.paths.karma = 17; __life.soul.pathLives.karma.push(-1); __life.walk('karma', 1)"); await run(2); await clear(); await run(60)
        await ev("__life.put(1080,1000); __life.P.face=1; __life.P.st=__life.P.stMax"); await run(2)
        await ev("(()=>{const fs=__life.foes.filter(f=>!f.boss); fs.forEach(f=>f.alive=false); window.__g=[fs[0],fs[1]]; window.__g.forEach((f,i)=>{f.alive=true; f.hp=40; f.l=1000; f.r=1500; f.x=__life.P.x+70+i*60; f.gy=1000; f.y=1000-f.h; f.state='idle';});})()")
        await run(1, {}, {'h3': 1}); await run(28)
        R['empty_step'] = await ev("'foe hp '+window.__g.map(f=>f.hp).join(',')+' moved to '+Math.round(__life.P.x)+' hp '+Math.round(__life.P.hp)+'/'+__life.P.hpMax")
        # the spark: dhyana to its end in a body with no mana
        await ev("__life.soul.paths.dhyana = 17; __life.soul.pathLives.dhyana = [-1]; __life.walk('dhyana', 1)"); await run(2); await clear()
        await ev("__life.soul.testSpark = true; __life.noFoes(); __life.put(220,1000)"); await run(3)
        await ev("__life.openMeditation(0); __life.MED.calm = 90; __life.MED.t = 63.9"); await run(30)
        R['spark'] = await ev("'spark '+__life.P.spark+' mana '+__life.P.mana+'/'+__life.P.manaMax+' noMana still '+__life.P.noMana")
        await clear(); await ev("__life.P.wordSlots[3] = 'ignite'"); m0 = await ev("__life.P.mana"); await run(1, {}, {'h4': 1}); await run(2)
        R['spark_cast'] = await ev(f"'mana {m0} -> '+__life.P.mana+' shots '+__life.shots.length")
        await fr.screenshot(path=OUT + 'b20_08_spark.png')
        # gear panel: body arts on the keys page
        await pg.keyboard.press('Tab'); await run(1); await pg.click('[data-view="spells"]'); await run(1)
        R['spellbook'] = await ev("[...document.querySelectorAll('#gearIn select[data-ws] option')].map(o=>o.textContent).filter(t=>t.startsWith('Body art')).slice(0,3).join(' | ')")
        await fr.screenshot(path=OUT + 'b20_09_arts_page.png'); await pg.keyboard.press('Escape'); await run(2)
        # the seat of clear seeing, inside the false wall, only for jnana's end
        R['seat_hidden'] = await ev("__life.put(__life.SEAT.x, __life.SEAT.gy); __life.pathAt('jnana')")
        await ev("__life.soul.paths.jnana = 17; __life.soul.pathLives.jnana = [-1, 1]; __life.soul.pathStep.jnana = 2; __life.walk('jnana', 1)"); await run(3); await clear()
        await ev("__life.put(__life.SEAT.x, __life.SEAT.gy)"); await run(4); await fr.screenshot(path=OUT + 'b20_10_seat.png')
        await run(1, {}, {'use': 1}); await run(1); R['seat'] = await ev("__life.mode+' calm '+(__life.MED&&Math.round(__life.MED.calm))")
        print(json.dumps(R, indent=1)); print('errors', errs)
        await b.close()
asyncio.run(main())
