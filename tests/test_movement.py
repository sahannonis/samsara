import asyncio, json
from playwright.async_api import async_playwright
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP=ROOT+'/'
LIB=ROOT+'/vendor/astronomy.browser.min.js'; OUT=ROOT+'/tests/shots/'; os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':1000})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript'))
        await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.goto('file://'+ROOT+'/dist/history/test-build-4.html'); await pg.wait_for_timeout(400)
        await pg.select_option('#micStart','off'); await pg.click('#btnBegin'); await pg.wait_for_timeout(300)
        ev = pg.evaluate
        await ev("__life.freeze(true)")
        st = lambda: ev("(()=>{const P=__life.P;return {x:Math.round(P.x),y:Math.round(P.y+P.h),h:P.h,onG:P.onG,hp:Math.round(P.hp),hang:!!P.hang,lad:!!P.ladder,water:P.inWater,breath:+P.breath.toFixed(1),glide:P.glide,cling:P.cling,dead:P.dead,prana:P.prana,relics:[...P.relics].join(','),equip:P.equip.join(',')}})()")
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def shot(name): await pg.screenshot(path=OUT+name+'.png', clip={'x':20,'y':120,'width':1240,'height':700})
        R={}
        await run(30); R['start']=await st(); await shot('01_village')
        await run(60,{'right':True}); R['walk']=await st()
        # plank + garuda
        await ev("__life.put(850,1000)"); await run(70,{'jump':True},{'jump':1}); R['plank']=await st(); await shot('02_plank')
        # drop through
        await run(30,{'down':True},{'jump':1}); R['drop']=await st()
        # tunnel crawl
        await ev("__life.noFoes()")
        await ev("__life.put(1250,1000)"); await run(200,{'right':True,'down':True}); R['tunnel_mid']=await st(); await shot('03_tunnel')
        await run(30,{'right':True}); R['tunnel_nodown']=await st()
        await run(200,{'right':True}); R['tunnel_out']=await st()
        # high swing: crouched vs standing
        await ev("__life.put(1200,1000)"); await run(1)  # reset foes via rest? use shrine tool instead
        await ev("(()=>{const L=__life; L.P.shrine=0;})()")
        await ev("document.getElementById('tShrine')"); 
        await ev("__life.put(180,1000)"); await run(1,{}, {'use':1}); # rest at village -> foes back
        await ev("__life.put(1900,1000)"); await ev("__life.P.face=1")
        await run(240,{'down':True}); R['high_crouched']=await st(); await shot('04_highswing')
        await ev("__life.P.hp=100"); await run(240); R['high_standing']=await st()
        await ev("__life.noFoes(); __life.P.hp=100")
        # double jump onto plateau
        await ev("__life.put(2640,1000)")
        await run(22,{'jump':True,'right':True},{'jump':1}); await run(80,{'jump':True,'right':True},{'jump':1}); R['dbl']=await st()
        # plateau without feather: try
        await ev("__life.equip([])"); await ev("__life.put(2640,1000)")
        await run(22,{'jump':True,'right':True},{'jump':1}); await run(80,{'jump':True,'right':True},{'jump':1}); R['dbl_none']=await st()
        # ladder: from bottom
        await ev("__life.put(3453,1100)"); await run(1,{'up':True},{'up':1}); await run(150,{'up':True}); R['ladder_up']=await st(); await shot('05_ladder')
        await run(1,{'down':True},{'down':1}); await run(60,{'down':True}); R['ladder_down_mid']=await st()
        # ledge grab
        await ev("__life.put(4290,1100)"); await ev("__life.P.face=1")
        await run(40,{'jump':True,'right':True},{'jump':1}); R['ledge']=await st(); await shot('06_ledge')
        await run(1,{'up':True},{'up':1}); await run(30); R['ledge_up']=await st()
        # mud and ice
        await ev("__life.put(4520,955)"); await run(60,{'right':True}); R['mud_60']=await st()
        await ev("__life.put(4870,955)"); await run(40,{'right':True}); await run(20); R['ice_slide']=await st(); await shot('07_ice')
        # water
        await ev("__life.equip([])"); await ev("__life.put(5250,1300)"); await run(240); R['water_float']=await st()
        await ev("__life.put(5250,1330)"); await run(480,{'down':True}); R['water_under8s']=await st(); await shot('08_water')
        await run(120,{'down':True}); R['water_drown']=await st()
        await ev("__life.P.hp=100; __life.P.breath=8; __life.equip(['naga'])"); await ev("__life.put(5250,1330)"); await run(600,{'down':True}); R['naga']=await st()
        # chimney wall jumps with gecko via a bot
        await ev("__life.equip(['gecko'])"); await ev("__life.put(6150,1020)")
        R['chimney']=await ev("""(()=>{const L=__life;let dir=-1,log=[];L.run(1,{left:true},{jump:1});
          for(let i=0;i<900;i++){ const P=L.P; const keys={}; keys[dir<0?'left':'right']=true;
            if(P.cling){ L.run(1,keys,{jump:1}); dir=-dir; } else if(P.hang){ L.run(1,{},{up:1}); } else L.run(1,keys);
            if(P.onG && P.y+P.h<=560 && P.x>6220) return {ok:true,i,x:Math.round(P.x),y:Math.round(P.y+P.h)};
            if(P.onG && i>40 && P.y+P.h>=1020){ L.run(1,keys,{jump:1}); }
          } const P=L.P; return {ok:false,x:Math.round(P.x),y:Math.round(P.y+P.h),cling:P.cling};})()""")
        await shot('09_chimney_top')
        # glide over wind gap
        await ev("__life.equip(['kite'])"); await ev("__life.put(6560,560)")
        await run(1,{'jump':True,'right':True},{'jump':1}); await run(40,{'jump':True,'right':True}); await shot('10_glide'); await run(200,{'jump':True,'right':True}); R['glide']=await st()
        await ev("__life.equip([])"); await ev("__life.put(6560,560)"); await run(1,{'jump':True,'right':True},{'jump':1}); await run(150,{'jump':True,'right':True}); R['gap_nokite']=await st()
        await run(120); R['after_fall']=await st()
        # dark cave + torch
        await ev("__life.put(7700,660)"); await run(10); await shot('11_dark_notorch')
        await run(1,{},{'h5':1}); await run(10); await shot('12_dark_torch')
        # hot ground
        await ev("__life.noFoes(); __life.P.hp=100"); await ev("__life.equip([])"); await ev("__life.put(7900,760)"); await run(60); R['hot_1s']=await st()
        await ev("__life.P.hp=100; __life.equip(['ember'])"); await ev("__life.put(7900,760)"); await run(60); R['hot_ember']=await st()
        # crumble
        await ev("__life.put(8200,760)"); await run(40); R['crumble']=await st(); await run(20); R['crumble2']=await st()
        # fake wall + tortoise
        await ev("__life.P.dead=false; __life.P.hp=100"); 
        await ev("__life.equip(['bead'])"); await ev("__life.put(9400,760)"); await run(5); await shot('13_arena_bead')
        await run(200,{'right':True}); R['fake']=await st(); R['fakefound']=await ev("__life.FAKES[0].found")
        # plunge + knife
        await ev("__life.put(180,1000)"); await run(1,{},{'use':1})
        await ev("__life.put(1180,860)"); await run(1,{'down':True},{'mouseL':1}); await run(20,{'down':True}); R['plunge']=await ev("__life.foes[0].hp+'/'+__life.foes[0].state")
        await run(30); await ev("__life.put(800,1000)"); await ev("__life.mouse.in=false; __life.P.face=1"); await run(1,{},{'h6':1}); await run(30); R['knife']=await ev("__life.P.knives")
        await run(1,{'right':True}); 
        # gear + map
        await ev("__life.freeze(false)")
        await pg.keyboard.press('Tab'); await pg.wait_for_timeout(200); await pg.screenshot(path=OUT+'14_gear.png'); await pg.keyboard.press('Tab')
        await pg.keyboard.press('m'); await pg.wait_for_timeout(200); await shot('15_map'); await pg.keyboard.press('m')
        # true death and rebirth
        await pg.click('#tRelics'); await pg.click('#tEnd'); await pg.wait_for_timeout(2200)
        await pg.screenshot(path=OUT+'16_death.png'); R['mode']=await ev("__life.mode")
        await pg.click('#deathIn .card'); await pg.wait_for_timeout(300); R['reborn']=await st()
        for k,v in R.items(): print(k, v)
        print('ERR', errs)
        await b.close()
asyncio.run(main())
