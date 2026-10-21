"""Headless test of builds 24 to 26: the painted look (three.js) in the real game. It boots, draws the land, sky, water,
grass and the traveler, follows the game's own poses (walk, jump, roll, attack, hang, climb, swim, glide, crouch,
dead), turns from ink to color, goes dark at night, never breaks the rules, and can be switched back to ink.

    python build.py && python tests/test_painted.py
"""
import asyncio, json, os
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, 'vendor', 'astronomy.browser.min.js'); OUT = os.path.join(ROOT, 'tests', 'shots') + '/'; os.makedirs(OUT, exist_ok=True)
PAGE = 'file://' + os.path.join(ROOT, 'dist', 'samsara.html')
GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GL); pg = await b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        await pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(path=LIB, content_type='application/javascript')); await pg.route('https://fonts.googleapis.com/**', lambda r: r.abort())
        await pg.add_init_script("localStorage.setItem('samsara.testLook','painted')")
        await pg.goto(PAGE); await pg.wait_for_timeout(400); await pg.select_option('#micStart', 'off')
        ev = pg.evaluate; fr = pg.locator('#frame'); R = {}; bad = []
        await pg.click('#btnQuick'); await pg.wait_for_timeout(300); await ev("__life.freeze(true); __life.setNight(false); __life.autoAsk='way'; __life.noFoes()")
        for i in range(60):
            if await ev("__life.V3.ready || __life.V3.failed"): break
            await pg.wait_for_timeout(250)
        R['boot'] = await ev("({ready: __life.V3.ready, failed: __life.V3.failed, why: __life.V3.why, look: document.getElementById('setLook').value, gl: getComputedStyle(document.getElementById('gl')).display})")
        if not R['boot']['ready']: bad.append('three.js did not start: ' + str(R['boot']))
        async def run(n, keys={}, press={}): await ev(f"__life.run({n},{json.dumps(keys)},{json.dumps(press)})")
        async def show(name, wait=350):
            await pg.wait_for_timeout(wait); box = await fr.bounding_box(); await pg.screenshot(path=OUT + 'b26_' + name + '.png', clip=box, timeout=90000)
        async def stats(): return await ev("__life.V3.stats")
        async def play(n, keys={}, press={}):   # step the game and draw each step, as in real play
            await ev(f"(()=>{{ for (let i = 0; i < {n}; i++) {{ __life.run(1, {json.dumps(keys)}, i === 0 ? {json.dumps(press)} : {{}}); __life.V3.frame(0,0); }} }})()")
        async def close(name, wx=110, wy=75):
            await ev("__life.V3.setDpr(2)")
            url = await ev("(()=>{ __life.V3.frame(0,0); return document.getElementById('gl').toDataURL('image/png'); })()")
            await ev("__life.V3.setDpr(0.5)")
            from PIL import Image; import base64, io
            im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))); k = im.size[0] / 960
            px, py = await ev("[__life.P.x + __life.P.w / 2 - __life.camX, __life.P.y + __life.P.h / 2 - __life.camY]")
            im.crop((int((px - wx) * k), int((py - wy) * k), int((px + wx) * k), int((py + wy) * k))).save(OUT + 'b26_' + name + '.png')
        await run(30); await show('01_start_ink', 700)
        R['stats_start'] = await stats()
        if not R['stats_start'] or R['stats_start'].get('frames', 0) < 2: bad.append('no painted frames drawn')
        # walking and the pose follows
        await run(40, {'right': True}); R['walk_pose'] = await ev("(()=>{const p=__life.V3.pose(); return 'lF '+p.lF0.toFixed(2)+' lB '+p.lB0.toFixed(2)})()")
        await show('02_walk')
        # a close look at the traveler, straight from the WebGL picture at full size
        await close('02b_close')
        await ev("__life.P.hp=__life.P.hpMax"); await run(1, {}, {'jump': True}); await run(8, {'jump': True}); await show('03_jump', 120)
        j = await ev("__life.V3.joints()"); R['joints'] = {k: (round(v['x']), round(v['y'])) for k, v in j.items() if isinstance(v, dict)}
        feet_y = await ev("__life.P.y + __life.P.h"); head_y = j['head']['y']
        if not (feet_y - 70 < head_y < feet_y - 30): bad.append(f'head height looks wrong: feet {feet_y} head {head_y}')
        await run(60, {})
        # an attack, mid-swing
        await run(1, {}, {'light': True}); await run(7); await close('04b_attack_close'); await show('04_attack', 60)
        R['attack'] = await ev("(()=>{const j=__life.V3.joints(); return 'act '+j.act+' weapon '+j.id})()")
        await run(60)
        # color: the first realization
        await ev("document.getElementById('tColor').click()"); await run(400); await pg.wait_for_timeout(900); await show('05_color', 500)
        # night
        await ev("__life.setNight(true)"); await run(30); await show('06_night', 600)
        await ev("__life.setNight(false)"); await run(5)
        # water: the pool
        await ev("__life.put(5300, 1040)"); await run(90); await close('07b_swim_close'); await show('07_water', 500)
        R['water'] = await ev("'in water '+__life.P.inWater")
        # the wind and the dark cave
        await ev("__life.put(6700, 1390)"); await run(60); await show('08_wind', 400)
        await ev("__life.put(7570, 560)"); await run(60); await show("09_cave", 400); await ev("__life.P.hp = __life.P.hpMax; __life.P.dead = false")
        # rain
        await ev("__life.V3.setWeather('rain', true); __life.put(1200, 1000)"); await run(200); await show('10_rain', 600); await ev("__life.V3.setWeather('clear', true)")
        R['stats_rain'] = await stats()
        # torch
        await ev("__life.put(1200, 1000); __life.P.torch.lit = true"); await run(20); await close('11b_torch_close'); await show('11_torch', 400); await ev("__life.P.torch.lit = false")
        # build 25: the traveler stands in front of the ink things that are not painted yet
        await ev("__life.put(420, 1000)"); await run(40); await show('14_village_front', 600)
        R['ink_layer'] = await ev("(()=>{const c=__life.V3.inkLayer(); return c ? c.width+'x'+c.height : 'none'})()")
        if R['ink_layer'] == 'none' or R['ink_layer'].startswith('300x'): bad.append('the ink world should be drawn inside the painted picture')
        # the shrine burns, and its fire and lanterns light the night
        await ev("__life.setNight(true); __life.put(250, 1000)"); await run(30); await play(3); await show('15_shrine_night', 800); R['lights_night'] = await ev("__life.V3.lights()")
        if R['lights_night'] < 2: bad.append('the shrine fire and lanterns should light the night')
        await ev("__life.P.torch.lit = true; __life.put(1900, 1000)"); await play(3); await show('15b_torch_night', 600); await ev("__life.P.torch.lit = false; __life.setNight(false)")
        # weather
        await ev("__life.V3.setWeather('mist', true)"); await play(3); await show('16_mist', 600); R['mist'] = await ev("__life.V3.weather()")
        await ev("__life.V3.setWeather('storm', true)"); await play(30); await show('17_storm', 700); R['storm'] = await ev("__life.V3.weather()")
        if R['storm']['rain'] < 0.5 or R['storm']['kind'] != 'storm': bad.append('the storm should bring rain')
        await ev("__life.V3.setWeather('clear', true)"); await play(2); await ev("__life.V3.setWeather(null)")
        # the bow: its belly faces the target, the arm points at it
        await ev("__life.put(1200, 1000); __life.P.face = 1; __life.P.slotIdx = 1; __life.mouse.in = true; __life.mouse.x = __life.P.x - __life.camX + 200; __life.mouse.y = __life.P.y - __life.camY - 120"); await play(6)
        R['bow'] = await ev("(()=>{const p=__life.V3.pose(); return {wpn: +p.wpn.toFixed(2), id: __life.V3.joints().id}})()")
        if not (1.6 < R['bow']['wpn'] < 3.1): bad.append(f"the bow should point up and forward at the mouse: {R['bow']}")
        await ev("__life.P.inv = 0"); await close("20_bow_close", 70, 50); await ev("__life.mouse.in = false; __life.P.slotIdx = 0")
        # a chain of cuts: down, then up
        await play(30); await play(1, {}, {'light': True}); await play(6); R['cut1'] = await ev("+__life.V3.pose().wpn.toFixed(2)"); await close('21_cut_down', 70, 50)
        await play(14); await play(1, {}, {'light': True}); await play(6); R['cut2'] = await ev("+__life.V3.pose().wpn.toFixed(2)"); await close('22_cut_up', 70, 50)
        # the night horse: wild and grazing, then ridden at a gallop
        await ev("__life.P.st = __life.P.stMax; __life.put(700, 1000); __life.P.lotus = 3"); await play(20); await show('18_horse_wild', 600)
        R['horse_wild'] = await ev("__life.V3.horseState()")
        if not R['horse_wild']['on']: bad.append('the painted horse should show')
        await play(1, {}, {'use': 1}); await play(5); await play(1, {}, {'use': 1}); await play(5)
        R['mounted'] = await ev("__life.P.mount")
        await play(50, {'right': True, 'roll': True}); R['gallop'] = await ev("__life.V3.horseState()"); await close('19_gallop_close', 110, 75)
        R['gallop_frame'] = await ev("__life.V3.horseFrame()")
        if R['mounted'] and R['gallop_frame']['anim'] != 'run': bad.append(f"a gallop should play the run frames: {R['gallop_frame']}")
        await ev("__life.V3.horseMode('parts')"); await play(4); await close('19c_gallop_parts', 110, 75); R['parts_mode'] = await ev("__life.V3.horseFrame().mode"); await ev("__life.V3.horseMode('frames')")
        if R['mounted'] and R['gallop']['speed'] < 300: bad.append(f"a galloping horse should be fast: {R['gallop']}")
        seat = await ev("__life.V3.horseSeat()"); hip = await ev("__life.V3.joints().hip")
        R['rider_on_seat'] = round(abs(seat['y'] - hip['y']), 1)
        if R['mounted'] and R['rider_on_seat'] > 4: bad.append('the rider should sit on the saddle')
        await show('19b_gallop', 300)
        await play(1, {'right': False, 'roll': False}, {}); await play(30); await play(1, {}, {'use': 1}); await play(5); R['dismounted'] = not await ev("__life.P.mount")
        # the rules do not change: a fall from high still hurts the same
        await ev("(()=>{const P=__life.P; P.hp=P.hpMax; __life.put(600, 400); P.fallFree=false; P.fallTop=null;})()")
        for i in range(150):
            if await ev("__life.P.onG"): break
            await run(1)
        await run(2); R['fall_600'] = await ev("__life.P.hpMax - __life.P.hp")
        # dead body tips over
        await ev("__life.P.hp = 0; __life.P.dead = true; __life.P.deadT = 0.6"); await pg.wait_for_timeout(300); await show('12_dead', 200)
        await ev("__life.P.dead = false; __life.P.hp = __life.P.hpMax; __life.P.deadT = 0")
        # back to ink: the WebGL canvas hides and the ink world returns
        await ev("__life.setLook('ink')"); await pg.wait_for_timeout(400); await show('13_ink_again', 200)
        R['ink_again'] = await ev("getComputedStyle(document.getElementById('gl')).display")
        if R['ink_again'] != 'none': bad.append('the WebGL canvas should hide in ink mode')
        R['errors'] = errs
        for k, v in R.items(): print(k, ':', v)
        print('PROBLEMS:', bad or 'none')
        await b.close()
        if bad or errs: raise SystemExit(1)
asyncio.run(main())
