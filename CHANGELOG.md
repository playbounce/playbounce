# Changelog

## 1.0.0 — 2026-08-16

First release.

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
- The wall keeps healing and hardening while a serve is held, so holding the ball buys no rest. It starts no new projectiles or beams during that window, and their timers hold rather than run down, so a player who just lost a ball isn't shot at while regrouping and serving releases no stored volley.
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
