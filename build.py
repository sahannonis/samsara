"""Build every playable page into dist/.

    python build.py

Each page is one self-contained HTML file: open it in Chrome or Edge.
For the mic, serve the folder (python -m http.server) so Chrome only asks once.
"""
import pathlib
ROOT = pathlib.Path(__file__).parent
DIST = ROOT / 'dist'
ENGINE = (ROOT / 'engine' / 'star-engine.js').read_text()
import gzip, base64
PLACES = base64.b64encode(gzip.compress((ROOT / 'data' / 'places.txt').read_bytes(), 9, mtime=0)).decode()
CITIES_V15 = (ROOT / 'star-panel' / 'cities.json').read_text().strip()  # test build 15 embedded the old list
TZLOOKUP = (ROOT / 'vendor' / 'tz-lookup.js').read_text().replace('"undefined"!=typeof module&&(module.exports=tzlookup);', '')

def art_json():
    import json
    parts = ROOT / 'art' / 'horse' / 'parts'
    names = ['head', 'neck', 'body', 'tail'] + [f'leg{l}_{k}' for l in ['FL', 'FR', 'BL', 'BR'] for k in ['thigh', 'shin']]
    import struct
    def one(n):
        b = (parts / f'{n}.png').read_bytes(); w, h = struct.unpack('>II', b[16:24])
        return {'src': 'data:image/png;base64,' + base64.b64encode(b).decode(), 'w': w, 'h': h}
    return json.dumps({'horse': {n: one(n) for n in names}})

def game(folder, out):
    head = (folder / 'head.html').read_text()
    code = (folder / 'game.js').read_text()
    # from build 23: the drawing lives in its own file, and the world in a level file
    draw = folder / 'draw-ink.js'
    if draw.exists(): code = code.replace('/*DRAW*/', draw.read_text())
    # from build 24: the painted look, drawn with three.js (three.js itself rides along as text)
    draw3 = folder / 'draw-three.js'
    if draw3.exists(): code = code.replace('/*DRAW3*/', draw3.read_text())
    # from build 25: Sahan's art, packed into the page (the night horse's parts)
    if '/*ART*/' in code: code = code.replace('/*ART*/null', art_json())
    level = folder / 'level.json' if (folder / 'level.json').exists() else ROOT / 'levels' / 'proving-grounds.json'
    code = code.replace('/*LEVEL*/null', level.read_text().strip())
    if '/*THREE*/' in head: head = head.replace('/*THREE*/', (ROOT / 'vendor' / 'three.module.min.js').read_text())
    page = head.replace('/*ENGINE*/', ENGINE).replace('/*GAME*/', code.replace('/*CITIES*/[]', CITIES_V15).replace("'/*PLACES*/'", "'" + PLACES + "'").replace('/*TZLOOKUP*/', TZLOOKUP))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    print(f'{out.relative_to(ROOT)}  {len(page) // 1024} KB')

def look_test():
    """The three.js look test: one page, with three.js and Astronomy Engine inside it."""
    folder = ROOT / 'looktest'
    look = '\n'.join((folder / f).read_text() for f in ['1-core.js', '2-world.js', '3-life.js', '4-main.js'])
    page = (folder / 'page.html').read_text().replace('/*ASTRO*/', (ROOT / 'vendor' / 'astronomy.browser.min.js').read_text()).replace('/*THREE*/', (ROOT / 'vendor' / 'three.module.min.js').read_text()).replace('/*LOOK*/', look)
    (DIST / 'look-test.html').write_text(page)
    print(f'dist/look-test.html  {len(page) // 1024} KB')

def star_panel():
    page = (ROOT / 'star-panel' / 'page.html').read_text().replace('/*ENGINE*/', ENGINE)
    (DIST / 'star-panel.html').write_text(page)
    (DIST / 'cities.json').write_text((ROOT / 'star-panel' / 'cities.json').read_text())
    print(f'dist/star-panel.html  {len(page) // 1024} KB')

def ink_tower():
    src = ROOT / 'ink-tower' / 'src'
    js = '\n'.join((src / f).read_text() for f in ['core.js', 'world.js', 'player.js', 'enemies.js', 'render.js', 'bosses.js', 'main.js'])
    page = (src / 'head.html').read_text() + "\n<script>\n(() => {\n'use strict';\n" + js + "\n})();\n</script>\n"
    (DIST / 'ink-tower.html').write_text(page)
    print(f'dist/ink-tower.html  {len(page) // 1024} KB')

if __name__ == '__main__':
    DIST.mkdir(exist_ok=True)
    game(ROOT / 'game', DIST / 'samsara.html')
    for d in sorted((ROOT / 'history').iterdir()):
        game(d, DIST / 'history' / f'{d.name}.html')
    star_panel()
    ink_tower()
    look_test()
    (DIST / 'chant-test.html').write_text((ROOT / 'chant-test' / 'samsara-chant-test.html').read_text())
    print('dist/chant-test.html')
