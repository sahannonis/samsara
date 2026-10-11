"""Headless test of build 10: chants (weapon blessings and summons) with a fake microphone.

    python build.py && python tests/test_chants.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
FAKE_SR = """
window.__heard = [];
class FakeSR { constructor(){ this.onresult=null; window.__rec=this; } start(){ setTimeout(()=>this.onaudiostart&&this.onaudiostart(),10); } stop(){} abort(){} }
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
        await pg.select_option('#micStart', 'always'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        ev = pg.evaluate; fr = pg.locator('#frame')
        await ev("__life.freeze(true); __life.noFoes()")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        R = {}
        R['known'] = await ev("[...__life.soul.chants].join()")
        # pick and chant Agni with the fake mic
        await ev("__life.put(600,1000)"); await run(3); await run(1, {}, {'chant': 1}); R['pick'] = await ev("__life.CHS && __life.CHS.state")
        await run(1, {}, {'h1': 1}); R['chanting'] = await ev("__life.CHS && __life.CHS.state")
        await run(5); await fr.screenshot(path=OUT + 'b10_01_chanting.png')
        await ev("__say('fire of the first morning', false)"); await run(10); R['half'] = await ev("__life.CHS && __life.CHS.matched.filter(Boolean).length")
        await fr.screenshot(path=OUT + 'b10_02_half.png')
        await ev("__say('fire of the first morning burn what binds me')"); await run(2)
        R['blessed'] = await ev("JSON.stringify(__life.P.bless)")
        await run(20); await fr.screenshot(path=OUT + 'b10_03_blessed.png')
        # blessed blade hits harder and burns
        await ev("""(()=>{const L=__life; L.put(1100,1000); L.P.face=1; L.P.inv=99; L.P.slots=[0,2]; L.P.slotIdx=0; const f=L.foes[0]; f.alive=true; f.hp=f.hpMax=1000; f.x=1140; f.state='stun'; f.t=10;})()""")
        await run(1, {}, {'light': 1}); await run(30); R['agni_hit'] = await ev("Math.round(1000-__life.foes[0].hp)+' burn '+(__life.foes[0].burnT||0).toFixed(1)")
        # a hit breaks the chant
        await ev("__life.P.bless=null; __life.P.inv=0; __life.P.rollIF=0; __life.put(600,1000)"); await run(3); await run(1, {}, {'chant': 1}); await run(1, {}, {'h1': 1})
        await ev("""(()=>{const L=__life; const f=L.foes[0]; f.x=640; f.state='swing'; f.t=0.16; f.hitDone=false; f.face=-1; f.hp=1000;})()"""); await run(5)
        R['broken'] = await ev("(__life.CHS ? __life.CHS.state : 'none')+' hp '+Math.round(__life.P.hp)")
        await ev("__life.noFoes(); __life.P.hp=100")
        # learning from an inscription
        await run(40); await ev("__life.put(820,1000)"); await run(2); await run(1, {}, {'use': 1}); R['insc_mode'] = await ev("__life.mode")
        await fr.screenshot(path=OUT + 'b10_04_inscription.png')
        await pg.click('#learnChant'); R['learned_tiryak'] = await ev("__life.soul.chants.has('tiryak')")
        # summons need offerings and conditions
        await ev("__life.freeze(false)"); await pg.click('#tChants'); await ev("__life.freeze(true)")
        await ev("__life.put(1100,1000)"); await run(3)
        async def summon(idx, line):
            await run(1, {}, {'chant': 1}); await run(1, {}, {'chant': 1}); await run(1, {}, {'h' + str(idx): 1})
            st = await ev("__life.CHS ? __life.CHS.state : 'none'")
            if st == 'chant': await ev(f"__say({json.dumps(line)})"); await run(2)
            return st
        R['tiryak_with_mana'] = await summon(4, 'brothers of the forest run with me') + ' ' + await ev("__life.SUMMONS.map(s=>s.id).join()")
        await ev("""(()=>{const L=__life,P=L.P; P.noMana=true;})()""")
        R['tiryak_no_mana'] = await summon(4, 'brothers of the forest run with me') + ' ' + await ev("__life.SUMMONS.map(s=>s.id).join()")
        await ev("""(()=>{const L=__life; const f=L.foes[0]; f.alive=true; f.hp=f.hpMax=1000; f.x=1250; f.state='idle';})()"""); await run(120)
        R['tiger_dmg'] = await ev("Math.round(1000-__life.foes[0].hp)"); await fr.screenshot(path=OUT + 'b10_05_tiger.png')
        await run(1200); R['summon_gone'] = await ev("__life.SUMMONS.length")
        R['again_without_rest'] = await summon(4, 'brothers of the forest run with me')
        await ev("__life.P.noMana=false")
        R['deva'] = await summon(1, 'shining ones above the clouds come down and stand with me') + ' ' + await ev("__life.SUMMONS.map(s=>s.id).join()")
        await run(30); await fr.screenshot(path=OUT + 'b10_06_deva.png'); await run(1200)
        await ev("__life.soul.karma=-2"); R['deva_bad_karma'] = await summon(1, 'x')
        await ev("__life.soul.karma=0; __life.P.seeds=100")
        await ev("""(()=>{const L=__life; const f=L.foes[0]; f.alive=true; f.hp=f.hpMax=1000; f.x=1250; f.state='idle';})()""")
        R['asura'] = await summon(2, 'proud ones who never kneel fight beside me now'); await run(60); await fr.screenshot(path=OUT + 'b10_07_asura.png'); await run(1200)
        R['asura_price'] = await ev("__life.P.seeds+' foe dmg '+Math.round(1000-__life.foes[0].hp)")
        await ev("""(()=>{const L=__life; const f=L.foes[0]; f.alive=true; f.hp=f.hpMax=1000; f.x=1250; f.state='idle';})()""")
        R['naraka'] = await summon(5, 'burning ones below the earth rise and break them'); await run(30); await fr.screenshot(path=OUT + 'b10_08_naraka.png'); await run(300)
        R['naraka_dmg'] = await ev("Math.round(1000-__life.foes[0].hp)+' my hp '+Math.round(__life.P.hp)")
        # mic off: hold C
        await ev("__life.setMicMode('off'); __life.P.bless=null; __life.noFoes()"); await run(1, {}, {'chant': 1}); await run(1, {}, {'h1': 1})
        await run(250, {'chant': True}); R['mic_off_hold'] = await ev("JSON.stringify(__life.P.bless)")
        # chants page
        await pg.keyboard.press('Tab'); await pg.click('[data-view="chants"]'); await pg.wait_for_timeout(100); await fr.screenshot(path=OUT + 'b10_09_book.png'); await pg.keyboard.press('Tab')
        for k, v in R.items(): print(k, v)
        print('ERR', errs); await b.close()
asyncio.run(main())
