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
| `tests/` | Headless browser tests (Playwright), one per test build |
| `tools/` | A checker that compares the star engine with Swiss Ephemeris |
| `vendor/` | A copy of Astronomy Engine for offline tests, and tz-lookup (time zone from coordinates) |
| `data/` | `places.txt`: every birthplace the game knows, made by `tools/build-places.js` |

`dist/` is made by `build.py` and is not kept in git.

## Test builds so far

### Phase 1: core mechanics

1. **Star Panel**: real birth charts, checked against Swiss Ephemeris on 300 charts (planets within 20 arcseconds, lagna within 33).
2. **Chant Test**: spoken incantations with accent-tolerant matching.
3. **One Life**: combat, falling and true death, prana, karma, rebirth from real past charts, battle words, mic modes, mouse controls.
4. **The Proving Grounds**: crouch, ledges, ladders, plunge, swimming and breath, mud, ice, wind, darkness, crumbling floors, false walls, seven relics, the hotbar, shrine checkpoints, the map.
5. **Steed and Steel**: a horse to befriend, ride and call; spear, staff and twin daggers; garments; weight.
6. **Growth and the Forge**: starting stats from the chart, leveling at shrines, skills, gathering, weapon tiers and crafting.
7. **Pack and Road**: pack weight, two-way chests, your own chest that keeps things across lives, fast travel from the map.

### Phase 2: voice and magic

8. **The Spell Book**: eleven new spells (Gust, Pillar, Monsoon, Unseen, Ember rain, Echo, Grasp, Shani, Chandra's tide, Starfall, Fire wind) with requirements (Focus, birth school, night where the player really is, a past life) and many ways to find them: chests, an enemy drop, a teacher, a spoken riddle, a stone that wakes at night, a past body, and joining spells at a shrine. Spells grow stronger with use and stay with the soul.
9. **The Real Sky**: the real Sun and Moon (with its phase) for the player's chosen place and time, drawn in ink; the sky darkens with the Sun's real height, stars turn with sidereal time, dawn and dusk glow on the Sun's side, and night-only spells follow the real Sun. A Sky panel picks the place (city list, your location, or coordinates) and moves time.
10. **Chants and Callings**: longer spoken chants. Press C, pick a chant and speak its line; the cleaner and steadier you say it, the stronger it is, and a hit breaks it. Five weapon blessings (Agni, Jala, Vayu, Prithvi, Akasha) and five summons from the six realms (Deva, Asura, Preta, Forest kin, Naraka), each with an offering and a condition. Chants are learned from inscriptions in the world. Living things also get a moonlit edge at night so they stay visible.
11. **The Trial Road**: past the false wall at the end, three test bosses behind gates that close when the fight starts: the Grasping Chief (combo, slam with ground waves, a grab that steals seeds, calls its kin), the Ember Wraith (flies, fire orbs, dives, a ring of fire; rain puts out its fire) and the Masked One (cuts, lunges, steps through ink, guards and counters, shows you your own face). Bosses have poise, open up when it breaks, reset if you fall, and come back each new life. Each one's own move becomes your spell: Quake, Wisps and Ink step. Three more spells come in new ways: Surya (a stone that wakes under the real midday Sun), Karuna (spare three in one life) and Vajra (beat a boss without being hit). The top-right box now grows to fit its text.
12. **Born Empty**: what a body born with no mana gets instead of spells. It reads scrolls (one scroll, one cast, no mana or Focus needed) that wait in spell chests, are left by bosses and the Grasping, or are written at a shrine with Grasping ink. A timed parry turns magic back: fire orbs fly home at 2.5 times the damage and ground waves break. A sealed chest on the trial road holds the Empty edge, a blade only such a body can hold (40% more against bosses, twice the poise damage, longer blessings). A boss beaten in a past life gives nothing the second time, but its own move hits it three times as hard.
13. **Longbow and Voice**: the Empty longbow for bodies with no mana (a full draw flies flat and pierces; R picks reed, iron, ember or ink arrows, made at forges). Spells on your keys and prepared chants are now set at shrines (three chants, five for a body with no mana). A mic check before play learns how the player's voice comes through, the game keeps learning mishearings in play when you press the key after a miss, and chants survive being started over. This closes Phase 2; offline speech moves to the desktop build and co-op chants to Phase 6.
14. **Polish**: the Empty longbow shows its arrows and counts in the gear screen; any chant can be done without the voice by holding C for 3 seconds at 85% strength, in every mic setting; the horse jumps a second time in the air (each mount will have its own perk later: higher jumps, flight).

### Phase 3: soul systems

15. **Your Birth**: character creation. The first life begins at the player's own birth (date, local time and place, with past time zone changes handled), read with the same star engine as the Star Panel; if the hour is unknown the chart is read from the Moon (Chandra lagna); or the wheel decides. Then the body (build, hair, clothing), an optional soul name, and a soul mark that stays the same in every life and marks your past bodies. The player chooses how their birth is kept: with their saves (Steam Cloud on Steam), on this device only, or not at all.
16. **Every town**: about 172,000 birthplaces built in (the original cities plus GeoNames places of over 1,000 people), searched without accents; if a village is still missing, an online search through OpenStreetMap or coordinates pasted from any map (the time zone is found from the point).
17. **The Nine Stones**: a Navagraha shrine on the trial road reads the player twice. The one who dreams: the player's real birth against the real sky of today (tara bala, the Moon's house from the natal Moon, the day lord), once a real day, for an offering of seeds, a lotus petal and an ember stone, with a small gift until midnight. Two star tablets in the world open deeper readings: Saturn, Jupiter, Rahu and Ketu from the natal Moon (Sade Sati included) and the Vimshottari periods. This body: the current life's chart, once a life, with a boon from its strongest planet. Told in parables, never as predictions.
18. **The Ledger**: karma 2 and rebirth 2. Karma is hidden (no number; the world hints at it). Deeds no one sees weigh twice. After a boss the wheel asks why you fought, and at death your words are weighed against your deeds. Good karma brings Grasping at peace and more who beg; heavy karma, none who beg. Karma decides how many births are offered (1 to 3) and how fortunate they are (read from each real chart), which of the six realms the soul leans toward, and how many fragments of a life can be carried (a skill, a stat point, a weapon's temper, scrolls). A heavy life leaves a debt: born near the one you wronged, with one lotus less until you make it right. New small deeds: a hungry dog, and seeds left at shrines for strangers.
19. **Stillness**: meditation at shrines (hold Space to breathe in, hold, let go to breathe out, rest, four slow breaths; thoughts drift by and following one breaks the calm). A deep stillness restores mana and one prana a life, and shows false walls for the rest of the life. The first realization, "it is all in your mind": after a deep stillness a riddle rises (from a pool, a new one each time). A wrong answer loses nothing. A right answer is understood (chants and spells 5% stronger) and is realized only when the lesson has been lived: reborn at least once, a boss both beaten and fallen to, three deep stillnesses. Realizing it brings the first color into the ink world.
    Also in build 19: a Messages setting (fade on their own, with time to read and a line showing the time left, or stay until closed with Enter or a click), and a chart's stillness gift: a strong Jupiter, Ketu in the houses of release or dharma, or planets in the twelfth make a body turned inward, so stillness comes more easily.
20. **The Five Paths**: five roads toward realization (Jnana: knowing, Bhakti: love, Karma: right action, Dhyana: stillness, and the road walked alone), walked by deeds and never by words. Progress is hidden: at a shrine you only feel how worn each road is under your feet. Each road has three steps, each step gives a small gift, and no road is walked to its end in a single life. A teacher sits by the pool shrine; bowing to them opens the road of love through small services across lives, and closes the road walked alone for that soul, for good. A body born with no mana that walks the road of right action learns body arts for keys 1 to 4, paid with stamina (Breath strike, Iron stance, Empty step); one that walks the road of stillness to its end may, very rarely, wake a spark of mana for that life. Those who see clearly find a seat hidden in a false wall near the End shrine.
21. **The Chart's Way**: mana, schools and the way of play from the chart, explained on a new Body page (Tab): which parts of the chart gave this body its mana, why it belongs to its school, and why it plays best alone or with others. Each school has a signature (Agni: Ignite and burning ground; Jala: Restore and the lotus; Vayu: rolls and walking speed; Prithvi: Shield and lighter blows; Akasha: mana and faster spell ranks), and spells of your own school hit 15% harder. Mana grows a little with each deep stillness (up to 10 a body) and with the first realization (5 for every body after), and returns 25% faster under the real full Moon. Sovereign bodies are stronger alone (10% more damage, one more prana, and they feel foes beyond the edge of sight); Sangha bodies are stronger with others beside them (for now the beings you call and the shade of a past life: harder blows, wounds that close, callings that last longer and hit harder, the road of love walked faster); Balanced bodies have a little of both. Co-op will add real friends.
    Also in build 21: a rule for the whole game, that nothing about mana is shown to or given to a body with no mana; each mana effect has its own twin. Its stamina returns 25% faster under a new Moon (a full Moon helps mana), deep stillness grows its stamina (up to 15 a body) and the first realization adds 8 to every such body after, the staff and monk robe speed its stamina, and mana words are left out of its stats, messages and Body page.

### Phase 5 begins early: saving

22. **Saving**: the soul keeps itself, souls-like: one save per soul, written on its own (no saves to reload), in three soul slots on the title screen. It saves at birth, when you rest, fall or die, beat a boss, do a deed that counts, close a panel, every 20 seconds of play, and when the page is hidden or closed. Coming back, you wake at the last shrine you rested at with what you carried; foes return as after a rest and a fight in progress starts over. A death is saved the moment it happens with the births on offer, and leaving while falling still costs the prana, so leaving the page never undoes a death. The real birth goes into a save only when the player chose to keep it. Souls can be exported to a file and brought back, let go (deleted), and the pause menu leads back to the title.
23. **Groundwork** (nothing looks different): the world now lives in a level file (`levels/proving-grounds.json`: every collision shape, shrine, chest, foe, person and place, plus empty art layers at their depths, ready for painted art), and all drawing lives in its own file (`game/draw-ink.js`), apart from the rules, physics and saving in `game/game.js`. The decision behind it (Sahan): stay on the web, PC on Steam only, and add a three.js drawing beside the ink one for painted layers, real-sky light, glow, water, wind, cloth and hair.

## Running the tests

```
pip install playwright
playwright install chromium
python build.py
python tests/test_growth.py
python tests/test_pack_and_travel.py
python tests/test_spells.py
python tests/test_sky.py
python tests/test_chants.py
python tests/test_bosses.py
python tests/test_born_empty.py
python tests/test_bow_and_voice.py
python tests/test_birth.py
python tests/test_stones.py
python tests/test_karma.py
python tests/test_stillness.py
python tests/test_settings.py
python tests/test_paths.py
python tests/test_way.py
python tests/test_save.py
```

## Credits

- Planet positions: [Astronomy Engine](https://github.com/cosinekitty/astronomy) by Don Cross, MIT license (see `vendor/ASTRONOMY-ENGINE-LICENSE`).
- City and timezone list: built from [city-timezones](https://github.com/kevinroberts/city-timezones), MIT license, with Sri Lankan towns added.
- More places: [GeoNames](https://www.geonames.org) via [cities.json](https://github.com/lutangar/cities.json), CC BY 4.0.
- Time zone from coordinates: [tz-lookup](https://github.com/photostructure/tz-lookup), CC0 (see `vendor/TZ-LOOKUP-LICENSE`).
- Online place search: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org), © OpenStreetMap contributors (ODbL). Only used when the player presses Search online.
- Fonts: Rubik Mono One, Kalam, Literata and DM Mono from Google Fonts (SIL Open Font License).

Copyright © Sahan Nonis. All rights reserved.
