"""Headless test of build 27: a rigged 3D body from .glb files, loaded with the test tool's file picker (a made-by-code
test body boned like a Mixamo character, tests/assets/make_testbot.py). Every move is played by the game's own state.

    python tests/assets/make_testbot.py && python build.py && python tests/test_body3d.py
"""
import asyncio, json, base64, io, glob
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
ROOT='/home/claude/samsara'; LIB=ROOT+'/vendor/astronomy.browser.min.js'; PAGE='file://'+ROOT+'/dist/samsara.html'
GL=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
S=ROOT+'/tests/shots/'
FILES=sorted(glob.glob(ROOT+'/tests/assets/testbot/*.glb'))
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=GL); pg=await b.new_page(viewport={'width':1280,'height':1000}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') and 'Failed to load' not in m.text else None)
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.add_init_script("localStorage.setItem('samsara.testLook','painted')")
        await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart','off')
        await pg.click('#btnQuick'); await pg.wait_for_timeout(300); ev=pg.evaluate
        await ev("__life.freeze(true); __life.setNight(false); __life.noFoes(); document.getElementById('tColor').click()")
        for i in range(60):
            if await ev("__life.V3.ready"): break
            await pg.wait_for_timeout(250)
        bad = []
        # first Sahan's Mixamo character, packed into the page (art/characters/test3d)
        for i in range(60):
            if await ev("__life.V3.body3D().moves.length >= 27"): break
            await pg.wait_for_timeout(250)
        packed = await ev("__life.V3.body3D()"); print('packed', packed)
        if len(packed['moves']) < 27: bad.append(f"the packed character should have its 27 moves: {packed}")
        await ev("__life.V3.setDpr(0.4); __life.put(1200,1000)"); await ev("(()=>{ for (let i = 0; i < 30; i++) { __life.run(1, {right: true}); __life.V3.frame(0,0); } })()")
        url = await ev("(()=>{ __life.V3.setDpr(1.5); __life.V3.frame(0,0); const u = document.getElementById('gl').toDataURL('image/png'); __life.V3.setDpr(0.4); return u; })()")
        Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).save(S + 'b27_arissa_walk.png')
        # build 29: every state picks its move
        async def step(n, keys={}, press={}):
            await ev(f"(()=>{{ for (let i = 0; i < {n}; i++) {{ __life.run(1, {json.dumps(keys)}, i === 0 ? {json.dumps(press)} : {{}}); __life.V3.frame(0,0); }} }})()")
        k3 = lambda: ev("__life.V3.body3D().key")
        got = {}
        await ev("__life.put(420,1000); __life.P.slotIdx = 0; __life.P.st = __life.P.stMax"); await step(20)
        await step(4, {'right': True}); got['setting off'] = await k3()
        await step(30, {'right': True, 'dash': True}); await step(3, {'right': False, 'left': True, 'dash': True}); got['turn at a run'] = await k3()
        await step(25, {'left': True, 'dash': True}); await step(3, {'left': False, 'dash': False}); got['let go at a run'] = await k3()
        await step(30); await step(20, {'down': True}); got['crouch'] = await k3(); await step(15, {'down': True, 'right': True}); got['crawl'] = await k3(); await step(10, {'down': False, 'right': False})
        await ev("__life.P.st = __life.P.stMax"); await step(1, {}, {'parry': True}); await step(3); got['parry'] = await k3(); await step(30)
        await ev("__life.P.slotIdx = 1; __life.P.swapT = 0.4"); await step(8); got['bow out'] = await k3(); await step(30)
        await ev("__life.P.st = __life.P.stMax; __life.mouse.in = true; __life.mouse.x = __life.P.x - __life.camX + 220; __life.mouse.y = __life.P.y - __life.camY"); await step(20, {'heavy': True}, {'heavy': True}); got['bow drawn'] = await k3()
        await step(1, {'heavy': False}); await ev("__life.mouse.in = false; __life.P.slotIdx = 0"); await step(30)
        await ev("__life.put(3453,1100)"); await step(1, {'up': True}, {'up': 1}); await step(30, {'up': True}); got['ladder'] = await k3(); await step(1, {'up': False})
        await ev("__life.put(4290,1100); __life.P.face = 1"); await step(40, {'jump': True, 'right': True}, {'jump': 1}); got['hang'] = await k3(); await step(1, {'jump': False, 'right': False}); await step(30)
        await ev("__life.P.hp = __life.P.hpMax; __life.P.breath = 8; __life.put(5300,1100)"); await step(30); got['in water, still'] = await k3(); await step(20, {'right': True}); got['in water, moving'] = await k3(); await step(5, {'right': False})
        want3 = {'setting off': 'start_walk', 'turn at a run': 'run_turn', 'let go at a run': 'run_stop', 'crouch': 'crouch_idle', 'crawl': 'crouch_walk', 'parry': 'block', 'bow out': 'bow_equip', 'bow drawn': 'bow_draw',
                 'ladder': 'ladder', 'hang': 'ledge_climb', 'in water, still': 'tread', 'in water, moving': 'swim'}
        for k, v in want3.items():
            if got.get(k) != v: bad.append(f'{k} should play {v}, played {got.get(k)}')
        print('states:', got)
        # then the made-by-code test body, through the test tool's file picker
        await pg.set_input_files('#glbFiles', FILES)
        for i in range(40):
            if await ev("__life.V3.body3D().moves.length > 0"): break
            await pg.wait_for_timeout(250)
        print('loaded', await ev("JSON.stringify(__life.V3.body3D())"))
        await ev("__life.V3.setDpr(0.4); __life.put(1200,1000); __life.V3.setWeather('clear', true)")
        async def play(n, keys={}, press={}):
            await ev(f"(()=>{{ for (let i = 0; i < {n}; i++) {{ __life.run(1, {json.dumps(keys)}, i === 0 ? {json.dumps(press)} : {{}}); __life.V3.frame(0,0); }} }})()")
        shots=[]; keys={}
        async def close(name, wx=60, wy=48):
            url = await ev("(()=>{ __life.V3.setDpr(1.5); __life.V3.frame(0,0); const u = document.getElementById('gl').toDataURL('image/png'); __life.V3.setDpr(0.4); return u; })()")
            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))); k = im.size[0] / 960
            px, py = await ev("[__life.P.x + __life.P.w / 2 - __life.camX, __life.P.y + __life.P.h / 2 - __life.camY]")
            key = await ev("__life.V3.body3D().key"); keys[name] = key
            shots.append((name + ' ' + (key or ''), im.crop((int((px - wx) * k), int((py - wy) * k), int((px + wx) * k), int((py + wy) * k)))))
        await play(20); await close('idle')
        await play(20, {'right': True}); await close('walk')
        await play(30, {'right': True, 'roll': False}); await ev("__life.P.vx = 480"); await play(1, {'right': True}); await close('fast')
        await play(30, {}); await play(1, {}, {'jump': True}); await play(8, {'jump': True}); await close('jump')
        await play(40); await play(1, {}, {'light': True}); await play(5); await close('slash')
        await play(30); await play(1, {}, {'roll': True}); await play(10); await close('roll')
        await play(40); await play(3, {'left': True}); await close('turning'); await play(20, {'left': True}); await close('left')
        await ev("__life.P.dead = true; __life.P.deadT = 1.2"); await play(1); await close('death'); await ev("__life.P.dead = false; __life.P.deadT = 0")
        W,H=shots[0][1].size; cols=4; rows=(len(shots)+cols-1)//cols; o=Image.new('RGB',(W*cols,H*rows),'white'); d=ImageDraw.Draw(o)
        for i,(n,c) in enumerate(shots): o.paste(c,((i%cols)*W,(i//cols)*H)); d.text(((i%cols)*W+4,(i//cols)*H+4), n, fill=(255,0,0))
        o.save(S+'b27_body3d.png')
        want = {'idle': 'idle', 'walk': 'walk', 'jump': 'jump', 'slash': 'slash', 'roll': 'roll', 'left': 'walk', 'death': 'death'}
        for k, v in want.items():
            if keys.get(k) != v: bad.append(f'{k} should play {v}, played {keys.get(k)}')
        yaw = await ev("__life.V3.body3D().yaw")
        if yaw > -1.3: bad.append(f'facing left should turn the body round: yaw {yaw}')
        await play(30); j = await ev("__life.V3.joints()")
        feet, head = await ev("__life.P.y + __life.P.h"), j['head']['y']
        if not (feet - 75 < head < feet - 35): bad.append(f'the 3D body should stand about as tall as the traveler: feet {feet} head {head}')
        await ev("__life.V3.use3D(false)"); await play(2); off = await ev("__life.V3.body3D().on")
        if off: bad.append('the cut-out body should come back')
        # meditation last (it leaves play): the body sits in stillness at the shrine
        await ev("__life.V3.use3D(true)"); await ev("__life.put(220,1000)"); await step(3); await step(1, {}, {'use': 1}); await step(1); await pg.click('#shrineMed'); await step(5); got['meditation'] = await k3()
        if got['meditation'] != 'meditate': bad.append(f"meditation should sit, played {got['meditation']}")
        print('moves played:', keys); print('errors:', errs); print('PROBLEMS:', bad or 'none')
        if bad or errs: raise SystemExit(1)
        await b.close()
asyncio.run(main())
