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

def game(folder, out):
    head = (folder / 'head.html').read_text()
    code = (folder / 'game.js').read_text()
    # from build 23: the drawing lives in its own file, and the world in a level file
    draw = folder / 'draw-ink.js'
    if draw.exists(): code = code.replace('/*DRAW*/', draw.read_text())
    level = folder / 'level.json' if (folder / 'level.json').exists() else ROOT / 'levels' / 'proving-grounds.json'
    code = code.replace('/*LEVEL*/null', level.read_text().strip())
    page = head.replace('/*ENGINE*/', ENGINE).replace('/*GAME*/', code.replace('/*CITIES*/[]', CITIES_V15).replace("'/*PLACES*/'", "'" + PLACES + "'").replace('/*TZLOOKUP*/', TZLOOKUP))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page)
    print(f'{out.relative_to(ROOT)}  {len(page) // 1024} KB')

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
    (DIST / 'chant-test.html').write_text((ROOT / 'chant-test' / 'samsara-chant-test.html').read_text())
    print('dist/chant-test.html')
