# Changelog

## 1.1.0 — 2026-08-17

### Added

- The ball blast, the one perk that falls from the sky rather than hiding in a brick. It arrives only once the wall is down to its last tenth and a ball is already in play, and catching it fans five balls out of the paddle at once, which is what a single surviving brick on a wide wall needs.
- Ice blocks. One projectile in eight glows, turns, and falls slower than the rest. It costs no paddle block and instead drops the paddle to three quarters speed for five seconds, with a bar under the paddle draining as the freeze lifts. Plating can't absorb it, because there's no block taken.
- `playbounce.version`, also recorded in each session's `ready` line. The same game ships from a checkout, a local server, and an installed package, and they look identical on screen, so this answers which copy is open.

### Changed

- The end screen offers three routes instead of two: NEW GAME starts at once against a fresh stranger on the same settings, REMATCH replays the same name, and BACK TO MENU returns to the landing screen. Up and down walk the options on the pause and end screens, which the arrows previously did nothing on.
- The ball is magenta. It was near-white, which is the colour projectiles take at DYING, so incoming fire and the ball you were tracking looked alike in the stage where telling them apart counts for most.
- The cast grows from 160 names to 216, and picks now avoid the last two dozen rather than only the previous one. Measured over 3000 picks, the closest a name comes back went from 2 apart to 25.
- 238 taunt lines, up from 132. The sets seen most often grew most: damage from 5 lines to 17, powerup from 5 to 13, the end screens from 3 and 4 to 9 and 11. Each set now avoids its last ten lines rather than its last four, capped at half the set so a short one can't starve.
- The end and pause screens label the figure `SCORE` rather than `BRICKS DESTROYED`, since it counts bricks currently down and a healing wall takes it back.
- The balance harness reports ice fired, freezes taken, and ball blasts caught per game.
- Clear rates measured across 400 harness runs per name at equal skill: ABE 42%, ISAAC 38%, SAMANTHA 41%, against 31%, 26% and 28% before the ball blast and the ice block.

### Fixed

- `playbounce --serve --port N` skips any port a mainstream browser refuses to open (Chromium's `ERR_UNSAFE_PORT` list), rather than binding one and looking dead in the browser once opened.
- The taunt banner's border, which was an accent stripe down the left edge rather than the uniform hairline every other panel in the game uses.

## 1.0.0 — 2026-08-16

First release.

### Install

- `pip install playbounce` gives you a `playbounce` command that opens the bundled game in your default browser and exits. `--serve` puts it behind a localhost server and prints an address reachable from a phone on the same network, taking the next free port when the one asked for is busy. `--port N` and `--no-browser` cover the rest.
- The package carries the game inside it, copied from `web/` at build time, so an install needs no network access to play.

### The game

- Brick-breaker rendered on a canvas, where the wall is a name drawn from a 5x7 bitmap font covering A-Z. Every "on" pixel is one destructible brick.
- A rotating cast of 160 names, pre-filled on the landing screen so a game starts in one action. Play as whoever turns up, or type over it. The list lives in `web/names.js` as a plain editable block.
- Two modes. TORMENT is the default: the wall wakes up, taunts the player, hardens, and attacks. CLASSIC is bricks and a paddle with nothing fighting back.

### TORMENT

- Five rage stages driven by damage taken, from DORMANT to DYING, each with its own brick colour and attack cadence. The wall gets more aggressive the closer it is to dying.
- Projectiles that fall from live bricks and cut one block off the paddle.
- Beams that charge in a lit column for 1.2 seconds (0.7 at DYING), aim where the paddle was when the charge began, and cut away their full width in blocks.
- The paddle is 10 discrete blocks. Losing all of them ends the run outright, whatever the lives counter says, so there are two separate ways to die. Losing a ball repairs the paddle to full for the next serve, keeping any extra blocks won from a powerup.
- Hardening that armours most surviving bricks over time, leaving about a third soft so there's always a seam to aim at. Destroying 3 bricks in one flight takes a layer back off the whole wall.
- Self-healing. Once the wall has reached DYING, leaving it alone for 8 seconds starts regrowing bricks where the name used to be. Healing lowers the rage, which cools the stage, thins the attacks, and stops the blinking and shaking, so a wall left alone goes back to sleep in about 90 seconds. Any hit interrupts it.
- Healing costs the wall its armour. Regrown bricks come back soft, every fourth one strips a hardness layer from the rest of the wall, and no hardening passes run while a recovery is under way. A wall that recovers fully is as soft as it was at the start, so stalling trades a smaller wall for a harder one.
- The wall keeps healing while a serve is held, so holding the ball buys no rest. It starts no new projectiles or beams during that window, and their timers hold rather than run down, so a player who just lost a ball isn't shot at while regrouping and serving releases no stored volley.
- At DYING the wall blinks like a failing light and the screen carries a tremor that never settles, on top of harder impacts from screams and beams.
- Screen shake on screams and stage changes, damped for readers who ask for reduced motion, which also switches the blinking off.
- Hidden powerups in roughly 8% of bricks: paddle plating, extra width, an extra ball, an extra life.
- Randomised taunts from the wall on the landing screen, at every stage change, on damage, and at the end. Stage changes on the way down draw from a separate recovery set and chime instead of screaming, since a wall cooling off has nothing to threaten with. Each set avoids its last few lines rather than only the previous one.
- Attack pacing scaled to wall size, so name length no longer decides difficulty. Measured across 120 harness runs per name at equal skill, SUE, ISAAC, and SAMANTHA clear at 33%, 29%, and 36%.

### Everything else

- Landing screen: name, mode, speed (Slow, Normal, Fast), lives (3, 5, unlimited), time limit (none, 2:00, 5:00), and sound.
- Clock that counts up with no limit and down with one, running only while a ball is in play so pauses and the wait between lives cost nothing.
- Four endings, each reporting name, bricks destroyed, elapsed time, and a closing remark: `WALL CLEARED`, `PADDLE DESTROYED`, `GAME OVER`, `TIME UP`.
- Synthesised sound through the Web Audio API, with no audio files to load.
- Full keyboard control built around one action key and one back key: Space starts, launches, pauses, resumes, and plays again, while Escape steps back a level to the menu. Arrows move between menu rows, change settings in place, and drive the paddle in play. Enter is reserved for committing a typed name.
- Touch control by drag or tap, and mouse control on desktop.
- Automatic pause when the tab goes to the background.
- Responsive sizing derived from the canvas at run time, verified at 375px, 768px, and 1280px viewport widths.
- Always-on decision log readable with `playbounce.debug()`, and current state with `playbounce.state()`.
- Headless balance harness at `tools/simulate.js` that plays hundreds of games against a stubbed canvas and reports outcome distributions.
- Launchers for macOS, Linux, and Windows that open the game in the default browser.
