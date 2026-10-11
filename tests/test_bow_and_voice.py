"""Headless test of build 13: the Empty longbow and its arrows, spells and chants set at shrines,
the mic check, learned mishearings and chants that survive a restart. Uses a fake microphone.

    python build.py && python tests/test_bow_and_voice.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
FAKE_SR = """
window.__heard = [];
class FakeSR { constructor(){ this.onresult=null; window.__rec=this; window.__heard=[]; } start(){ setTimeout(()=>this.onaudiostart&&this.onaudiostart(),10); } stop(){} abort(){} }
window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
window.__say = (text, isFinal=true) => { const r = window.__rec; if (!r || !r.onresult) return false; const res = [{ transcript: text }]; res.isFinal = isFinal; window.__heard.push(res); const results = window.__heard.slice(); r.onresult({ resultIndex: results.length - 1, results }); return true; };
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 1000})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(FAKE_SR)
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(400)
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}
        # mic check before play: it asks for three spells and learns a mishearing
        await pg.click('#btnMicCheck'); await pg.wait_for_timeout(50)
        await ev("__say('ignite')"); await ev("__say('the shield')"); await ev("__say('rest or')")
        R['mic_check'] = await ev("document.getElementById('micCheckMsg').innerText.replace(/\\n/g,' | ')")
        R['learned_store'] = await ev("localStorage.getItem('samsara.heard')")
        await fr.screenshot(path=OUT + 'b13_01_miccheck.png')
        await pg.select_option('#micStart', 'always'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        await ev("__life.freeze(true); __life.noFoes()")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        await ev("(()=>{const L=__life,P=L.P; P.noMana=false; P.manaTierMax=100; L.applyStats(true); P.wordSlots=['ignite','shield','restore',null]; L.setNight(false);})()")
        await run(220)
        # the learned phrase now casts Restore
        await ev("__life.P.hp=50"); await ev("__say('rest or')"); await run(2); R['learned_casts'] = await ev("Math.round(__life.P.hp)+' mana '+Math.round(__life.P.mana)")
        # learning in play: a miss, then the key, teaches the game
        await run(60); await ev("__say('she old')"); await run(1, {}, {'h2': 1}); R['learned_in_play'] = await ev("JSON.parse(localStorage.getItem('samsara.heard')).shield")
        # spell keys change only at a shrine
        await ev("__life.put(1500,1000)"); await run(3); await pg.keyboard.press('Tab'); await run(1)
        await pg.locator('[data-view="spells"]').click(); R['keys_away'] = await ev("document.querySelector('[data-ws]').disabled")
        await fr.screenshot(path=OUT + 'b13_02_keys_away.png'); await pg.keyboard.press('Escape'); await run(2)
        await ev("__life.put(220,1000)"); await run(3); await run(1, {}, {'use': 1}); await run(2)
        await pg.locator('#shrineSpells').click(); R['keys_at_shrine'] = await ev("document.querySelector('[data-ws]').disabled")
        await fr.screenshot(path=OUT + 'b13_03_keys_shrine.png')
        # chants: only prepared ones come up; prepare more at a shrine
        await ev("document.getElementById('tChants')"); await pg.locator('[data-view="chants"]').click()
        R['slots'] = await ev("__life.P.chantSlots+' prepared '+[...__life.P.prepared].join()")
        await pg.keyboard.press('Escape'); await run(2)
        await ev("['jala','vayu','prithvi','akasha','deva'].forEach(id=>__life.soul.chants.add(id))")
        await run(1, {}, {'chant': 1}); R['pick_list'] = await ev("__life.CHS.list.map(c=>c.id).join()"); await run(1, {}, {'chant': 1}); await run(1, {}, {'chant': 1}); await run(2)
        await run(1, {}, {'use': 1}); await pg.locator('#shrineChants').click(); await run(1)
        await pg.locator('[data-prep="vayu"]').click(); await pg.locator('[data-prep="jala"]').click()
        R['prepared_now'] = await ev("[...__life.P.prepared].join()")
        await fr.screenshot(path=OUT + 'b13_04_chants.png'); await pg.keyboard.press('Escape'); await run(2)
        # a chant that is started over still counts
        await run(1, {}, {'chant': 1}); await run(1, {}, {'h1': 1}); await run(2)
        await ev("__say('fire of the first', false)"); await ev("__say('fire of the first fire of the first morning burn what binds me')"); await run(2)
        R['restart'] = await ev("__life.CHS ? __life.CHS.matched.filter(Boolean).length+'/'+__life.CHS.matched.length : 'done '+JSON.stringify(__life.P.bless)")
        await run(400)
        # a chant without the voice, with the mic on: hold C for 3 seconds, 85%
        await ev("__life.P.bless=null"); await run(1, {}, {'chant': 1}); await run(1, {}, {'h1': 1}); await run(200, {'chant': True}); await run(2)
        R['voiceless'] = await ev("JSON.stringify(__life.P.bless)")
        # the horse jumps twice
        await ev("__life.put(700,1000)"); await run(3); await ev("document.getElementById('tHorse').click()"); await run(120); await ev("__life.mount()"); await run(10)
        await run(1, {}, {'jump': 1}); await run(18); vy1 = await ev("__life.P.vy"); await run(1, {}, {'jump': 1}); vy2 = await ev("__life.P.vy")
        R['horse_double'] = f"mounted {await ev('__life.P.mount')} vy {vy1:.0f} -> {vy2:.0f} used {await ev('__life.P.horseJumped')}"
        await run(6); await fr.screenshot(path=OUT + 'b14_01_horse_jump.png'); await run(80); await run(1, {}, {'jump': 1}); await run(10); await run(1, {}, {'jump': 1}); await run(1, {}, {'jump': 1})
        R['horse_no_third'] = await ev("__life.P.horseJumped")
        await run(80); await run(1, {}, {'use': 1}); await run(30)
        # --- the Empty longbow ---
        await ev("document.getElementById('tEmpty').click()"); await run(2)
        await ev("__life.put(12330,760)"); await run(3); await run(1, {}, {'use': 1}); await ev("__life.moveItem(__life.CHESTS_.find(c=>c.x===12330).inv,'weapon:7',true)")
        await pg.keyboard.press('Escape'); await run(2)
        R['bow'] = await ev("__life.P.weapons.has(7)+' arrows '+JSON.stringify(__life.P.arrows)")
        await ev("__life.P.slots[0]=7; __life.P.slotIdx=0")
        await pg.keyboard.press('Tab'); await run(1); await pg.locator('[data-view="gear"]').click()
        R['gear_arrows'] = await ev("[...document.querySelectorAll('#gearIn .slot')].map(e=>e.innerText).join(' ').match(/(Iron|Ember|Ink) ×\\d+/g).join(', ')")
        await fr.screenshot(path=OUT + 'b14_02_quiver.png'); await pg.keyboard.press('Escape'); await run(2)
        # full draw passes through two foes
        await ev("(()=>{const L=__life; [4,5].forEach((i,n)=>{const f=L.foes[i]; f.alive=true; f.hp=200; f.hpMax=200; f.state='idle'; f.x=3800+n*60;}); L.put(3600,1100); L.P.face=1; L.mouse.in=false;})()"); await run(2)
        await run(1, {'heavy': True}, {'heavy': 1}); await run(70, {'heavy': True}); await fr.screenshot(path=OUT + 'b13_05_draw.png'); await run(40)
        R['pierce'] = await ev("__life.foes[4].hp+','+__life.foes[5].hp")
        # R changes arrows: iron, ember, ink
        await run(30); await run(1, {}, {'arrow': 1}); R['kind1'] = await ev("__life.P.arrowKind")
        await run(1, {}, {'arrow': 1}); R['kind2'] = await ev("__life.P.arrowKind")
        place = "(()=>{const L=__life; [4,5].forEach((i,n)=>{const f=L.foes[i]; f.alive=true; f.hp=200; f.burnT=0; f.state='stun'; f.t=0.6; f.vx=0; f.x=3955+n*40;}); L.put(3760,1100); L.P.face=1;})()"
        await ev(place); await run(2)
        await run(1, {}, {'light': 1}); await run(14); R['ember'] = await ev("Math.round(__life.foes[4].hp)+' burn '+(__life.foes[4].burnT>0)+' near burn '+(__life.foes[5].burnT>0)+' left '+__life.P.arrows.ember")
        await fr.screenshot(path=OUT + 'b13_06_ember.png')
        await run(30); await run(1, {}, {'arrow': 1}); R['kind3'] = await ev("__life.P.arrowKind")
        await ev(place); await run(2); await run(1, {}, {'light': 1}); await run(14); R['ink'] = await ev("__life.foes[4].state+' '+__life.foes[4].t.toFixed(1)")
        await run(4); await fr.screenshot(path=OUT + 'b13_07_ink.png')
        R['ERR'] = errs
        for k, v in R.items(): print(k, v)
        await b.close()
asyncio.run(main())
