import asyncio, json
from playwright.async_api import async_playwright
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP=ROOT+'/'
LIB=ROOT+'/vendor/astronomy.browser.min.js'; OUT=ROOT+'/tests/shots/'; os.makedirs(OUT, exist_ok=True)
import os; os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':1000})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('file://'+ROOT+'/dist/history/test-build-5.html'); await pg.wait_for_timeout(400)
        await pg.select_option('#micStart','off'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        ev = pg.evaluate
        await ev("__life.freeze(true)")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def shot(name): await pg.locator('#frame').screenshot(path=OUT+name+'.png')
        st = lambda: ev("(()=>{const P=__life.P,h=__life.horse;return {x:Math.round(P.x),y:Math.round(P.y+P.h),vx:Math.round(P.vx),w:P.w,h:P.h,onG:P.onG,hp:+P.hp.toFixed(1),st:Math.round(P.st),mount:P.mount,horse:h.state,hhp:Math.round(h.hp),load:__life.loadNow().cls,prot:__life.protNow(),lotus:P.lotus,dead:P.dead}})()")
        R={}
        await run(30); R['start']=await st()
        # chests
        await ev("__life.put(300,1000)"); await run(1,{},{'use':1}); await run(5); R['hat']=await ev("[...__life.P.garbOwned].join()")
        await ev("__life.put(990,1000)"); await run(1,{},{'use':1}); R['mace']=await ev("[...__life.P.weapons].join()")
        await shot('01_chest')
        # all gear
        await ev("__life.freeze(false)"); await pg.click('#tGear'); await ev("__life.freeze(true)")
        R['allgear']=await ev("[...__life.P.weapons].join()+' | '+[...__life.P.garbOwned].join()")
        # weapon damage on a dummy foe
        async def wtest(wi, setup="", presses=1, heavy=False, frames=40):
            return await ev(f"""(()=>{{const L=__life;L.P.slots=[{wi},2];L.P.slotIdx=0;L.P.inv=99;L.put(1150,1000);L.P.face=1;
              const f=L.foes[0];L.foes.forEach((g,i)=>{{if(i>0)g.alive=false}});f.alive=true;f.hp=f.hpMax=1000;f.x=1150+22+30;f.state='idle';f.face=-1;{setup}
              const fx0=f.x; const out=[];for(let k=0;k<{presses};k++){{ f.x=fx0; f.state='stun';f.t=10;f.stag=0; L.P.x=1150; L.P.face=1; L.P.st=L.P.stMax; L.P.atk=null; const h0=f.hp; {'L.run(1,{heavy:true},{heavy:1});L.run(30,{heavy:true});L.run(30);' if heavy else 'L.run(1,{},{light:1});L.run('+str(frames)+');'} out.push(Math.round(h0-f.hp)); }}
              return out.join(',');}})()""")
        for wi,name in [(0,'blade'),(1,'mace'),(3,'spear'),(4,'staff'),(5,'daggers')]:
            R['w_'+name]=await wtest(wi, presses=3, frames=40)
        R['daggers_back']=await wtest(5, setup="f.face=1;", presses=1)
        R['staff_behind']=await wtest(4, setup="f.x=1150-60;", presses=1)
        R['blade_behind']=await wtest(0, setup="f.x=1150-60;", presses=1)
        R['spear_far']=await wtest(3, setup="f.x=1150+22+70;", presses=1)
        R['blade_far']=await wtest(0, setup="f.x=1150+22+70;", presses=1)
        R['spear_heavy']=await wtest(3, heavy=True)
        await ev("__life.P.slots=[4,2]; __life.put(1150,1000); __life.foes[0].x=1210; __life.foes[0].state='idle'"); await run(1,{'heavy':True},{'heavy':1}); await run(20,{'heavy':True}); await run(14); await shot('02_staff_spin')
        await ev("__life.P.slots=[3,2]; __life.put(1150,1000); __life.foes[0].x=1250"); await run(1,{},{'light':1}); await run(10); await shot('03_spear')
        await run(30)
        # load
        await ev("__life.P.slots=[0,2]; Object.assign(__life.P.garb,{head:null,body:'wrap',feet:'sandals'})"); R['load_light']=await ev("JSON.stringify(__life.loadNow())")
        await ev("__life.P.slots=[1,3]; Object.assign(__life.P.garb,{head:'helm',body:'mail',feet:'boots'})"); R['load_over']=await ev("__life.loadNow().cls+' '+__life.loadNow().w+' prot '+__life.protNow()")
        await ev("__life.noFoes(); __life.P.inv=0; __life.put(500,1000)"); await run(5); await run(1,{},{'roll':1}); await run(5); R['roll_over']=await ev("__life.P.rollT")
        await ev("__life.P.slots=[1,0]; Object.assign(__life.P.garb,{head:'helm',body:'leather',feet:'boots'})"); R['load_heavy']=await ev("__life.loadNow().cls")
        await ev("__life.put(500,1000)"); await run(5); x0=(await st())['x']; await run(1,{},{'roll':1}); await run(30); R['roll_heavy_dist']=(await st())['x']-x0
        await ev("__life.P.slots=[5,2]; Object.assign(__life.P.garb,{head:null,body:'wrap',feet:'sandals'})"); await ev("__life.put(500,1000)"); await run(5); x0=(await st())['x']; await run(1,{},{'roll':1}); await run(30); R['roll_light_dist']=(await st())['x']-x0
        await ev("__life.P.slots=[1,0]; Object.assign(__life.P.garb,{head:'helm',body:'mail',feet:'boots'})"); await ev("__life.put(600,1000)"); await run(10); await shot('04_armored')
        await ev("Object.assign(__life.P.garb,{head:'hat',body:'leather',feet:'cleats'})"); await run(2); await shot('05_hat_leather')
        await ev("Object.assign(__life.P.garb,{head:'band',body:'robe',feet:'sandals'}); __life.P.slots=[4,5]"); await run(2); await shot('06_band_robe'); R['band_st']=await ev("__life.P.stMax")
        # mud with boots / ice with cleats
        await ev("__life.P.slots=[0,2]; Object.assign(__life.P.garb,{head:null,body:'wrap',feet:'boots'}); __life.put(4520,955)"); await run(60,{'right':True}); R['mud_boots']=(await st())['x']-4520
        await ev("Object.assign(__life.P.garb,{feet:'cleats'}); __life.put(4870,955)"); await run(40,{'right':True}); await run(20); R['ice_cleats_stop']=(await st())['x']-4870
        # mail in water
        await ev("Object.assign(__life.P.garb,{body:'mail'}); __life.put(5250,1150)"); await run(180); R['mail_water_y']=(await st())['y']
        await ev("Object.assign(__life.P.garb,{body:'wrap',feet:'sandals'}); __life.P.hp=100; __life.P.breath=8")
        # horse
        await ev("__life.put(180,1000)"); await run(1,{},{'use':1})  # rest
        await ev("__life.noFoes(); __life.put(700,1000)"); await run(10); await shot('07_horse_wild')
        await ev("__life.P.lotus=0"); await run(1,{},{'use':1}); R['horse_nolotus']=await ev("__life.horse.state")
        await ev("__life.P.lotus=3"); await run(1,{},{'use':1}); R['horse_bond']=await ev("__life.horse.state+' lotus '+__life.P.lotus")
        await run(1,{},{'use':1}); await run(5); R['mounted']=await st(); await shot('08_mounted')
        await run(90,{'right':True}); R['ride']=await st()
        await ev("__life.put(200,1000)"); await run(90,{'right':True,'roll':True}); R['gallop']=await st(); await shot('09_gallop')
        await ev("__life.put(400,1000)"); await run(1,{'jump':True},{'jump':1}); ymin=10000
        for i in range(30):
            await run(1,{'jump':True}); ymin=min(ymin,(await st())['y'])
        R['horse_jump_height']=1000-ymin
        await run(60); await run(1,{},{'use':1}); R['dismount']=await st()
        # call horse: open ground, tunnel, dark
        await ev("__life.put(2500,1000)"); await run(3); await run(1,{},{'h8':1}); R['call_open']=await ev("__life.horse.state+' '+Math.round(__life.horse.x)")
        await ev("__life.horse.state='away'; __life.put(1500,1000)"); await run(3,{'down':True}); await run(1,{'down':True},{'h8':1}); R['call_tunnel']=await ev("__life.horse.state")
        await ev("__life.put(8650,760)"); await run(3); await run(1,{},{'h8':1}); R['call_dark']=await ev("__life.horse.state")
        await ev("__life.put(9000,760)"); await run(3); await run(1,{},{'h8':1}); R['call_arena']=await ev("__life.horse.state")
        await run(20); await shot('10_called'); await run(1,{},{'use':1}); await run(3); R['mount_after_call']=await ev("__life.P.mount")
        # refuses water at the ice edge
        await ev("__life.put(5040,955); __life.P.face=1"); await run(2); R['still_mounted']=await ev("__life.P.mount"); await run(120,{'right':True}); R['water_refuse']=await st()
        # trample + lance
        await ev("__life.put(180,1000)"); await run(1,{},{'use':1})
        await ev("""(()=>{const L=__life; L.put(650,1000); L.horse.x=661; L.horse.gy=1000; L.horse.state='idle'; L.P.onG=true; L.mount(); const f=L.foes[0]; L.foes.forEach((g,i)=>{if(i>0)g.alive=false}); f.x=1100; f.hp=f.hpMax=1000; L.P.inv=0;})()""")
        await run(120,{'right':True,'roll':True}); R['trample']=await ev("Math.round(1000-__life.foes[0].hp)")
        await ev("""(()=>{const L=__life; L.P.slots=[3,2]; L.P.slotIdx=0; L.put(500,1000); const f=L.foes[0]; f.x=1000; f.hp=1000; f.state='idle';})()""")
        R['lance_pre']=await st(); await run(60,{'right':True}); R['lance_mid']=await st(); await ev("__life.P.st=__life.P.stMax"); await run(1,{'right':True},{'light':1}); await run(20,{'right':True}); R['lance_post']=await st(); R['lance']=await ev("Math.round(1000-__life.foes[0].hp)")
        # horse hurt -> thrown
        await ev("__life.horse.hp=5; __life.P.inv=0; __life.P.rollIF=0"); await ev("__life.put(1000,1000); __life.foes[0].x=1060; __life.foes[0].state='idle'; __life.P.face=1"); R['mounted_before_thrown']=await ev("__life.P.mount")
        await run(120); R['thrown']=await st()
        await run(40); await shot('11_fled')
        # rebirth resets
        await ev("__life.freeze(false)"); await pg.click('#tEnd'); await pg.wait_for_timeout(2200)
        await pg.screenshot(path=OUT+'12_death.png'); await pg.click('#deathIn .card'); await pg.wait_for_timeout(300)
        R['reborn']=await ev("__life.horse.state+' '+[...__life.P.weapons].join()+' '+[...__life.P.garbOwned].join()")
        # gear screen
        await pg.click('#tGear'); await pg.click('#tHorse'); await pg.wait_for_timeout(200)
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'13_gear.png'); await pg.keyboard.press('Tab')
        await pg.keyboard.press('m'); await pg.wait_for_timeout(200); await shot('14_map'); await pg.keyboard.press('m')
        for k,v in R.items(): print(k, v)
        print('ERR', errs); await b.close()
asyncio.run(main())
