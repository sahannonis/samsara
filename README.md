# Samsara

A 2D adventure-fantasy souls-like with a role-playing heart. You live one life, die, and are reborn. Karma decides the next birth, and each birth is cast from a real moment in the past with a real Vedic birth chart. Spells are spoken out loud. The world is drawn in black and white ink, and color returns as you come to understand.

The game bible (lore, systems and the build roadmap) lives in a separate shared doc.

## Play

```
python build.py
```

Then open `dist/samsara.html` in Chrome or Edge. For the microphone, serve the folder so Chrome only asks once:

```
python -m http.server
```

and go to `http://localhost:8000/dist/samsara.html`.

## What is here

| Folder | What it holds |
|---|---|
| `game/` | The current game: `head.html` (page, styles, panels) and `game.js` (everything that runs) |
| `engine/` | `star-engine.js`: the Vedic chart engine (sidereal planets, Lahiri ayanamsa, lagna, houses, nakshatras, Vimshottari dashas, historical timezones) and the game rules drawn from a chart |
| `star-panel/` | The Star Panel: enter a birth date, time and place and read the chart. `cities.json` has 7,228 cities with their timezones |
| `chant-test/` | The voice test for spoken incantations |
| `history/` | Source of each earlier test build, so any of them can be rebuilt |
| `ink-tower/` | The first stickman platformer this all grew from |
| `tests/` | Headless browser tests (Playwright) for movement, mounts and gear, and growth |
| `tools/` | A checker that compares the star engine with Swiss Ephemeris |
| `vendor/` | A copy of Astronomy Engine for offline tests |

`dist/` is made by `build.py` and is not kept in git.

## Test builds so far (Phase 1: core mechanics)

1. **Star Panel**: real birth charts, checked against Swiss Ephemeris on 300 charts (planets within 20 arcseconds, lagna within 33).
2. **Chant Test**: spoken incantations with accent-tolerant matching.
3. **One Life**: combat, falling and true death, prana, karma, rebirth from real past charts, battle words, mic modes, mouse controls.
4. **The Proving Grounds**: crouch, ledges, ladders, plunge, swimming and breath, mud, ice, wind, darkness, crumbling floors, false walls, seven relics, the hotbar, shrine checkpoints, the map.
5. **Steed and Steel**: a horse to befriend, ride and call; spear, staff and twin daggers; garments; weight.
6. **Growth and the Forge**: starting stats from the chart, leveling at shrines, skills, gathering, weapon tiers and crafting.
7. **Pack and Road**: pack weight, two-way chests, your own chest that keeps things across lives, fast travel from the map.

## Running the tests

```
pip install playwright
playwright install chromium
python build.py
python tests/test_growth.py
python tests/test_pack_and_travel.py
```

## Credits

- Planet positions: [Astronomy Engine](https://github.com/cosinekitty/astronomy) by Don Cross, MIT license (see `vendor/ASTRONOMY-ENGINE-LICENSE`).
- City and timezone list: built from [city-timezones](https://github.com/kevinroberts/city-timezones), MIT license, with Sri Lankan towns added.
- Fonts: Rubik Mono One, Kalam, Literata and DM Mono from Google Fonts (SIL Open Font License).

Copyright © Sahan Nonis. All rights reserved.
