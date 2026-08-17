# playbounce usage

## Installing it

You need Python 3.9 or newer for this route. Check with `python3 --version`; if that command isn't found, install Python from [python.org/downloads](https://www.python.org/downloads/) or your package manager (`apt install python3-pip`, `dnf install python3-pip`).

```bash
python3 -m pip install playbounce
```

```bash
playbounce
```

```
opened playbounce in your default browser
  file:///usr/local/lib/python3.12/site-packages/playbounce/web/index.html
```

The game is inside the package, so nothing is fetched over the network when you play.

| Command | What it does |
|---|---|
| `playbounce` | Open the bundled game in your default browser and exit |
| `playbounce --serve` | Serve over localhost and print an address your phone can reach on the same network |
| `playbounce --port N` | Serve on port N, or the next free port above it if N is busy. Implies `--serve` |
| `playbounce --no-browser` | Print the address instead of opening a browser |
| `playbounce --version` | Print the version |

```bash
playbounce --serve
```

```
playbounce serving on http://127.0.0.1:8000
  also reachable at http://192.168.1.24:8000
press ctrl-c to stop
```

`python -m playbounce` runs the same command.

## Running it from a checkout

Open `web/index.html` in a browser, or use the launcher for your platform (`launch.command`, `launch.sh`, `launch.bat`). Both routes work with no server, since the page loads its scripts as classic scripts rather than modules.

To serve it locally instead:

```bash
python3 -m http.server 8767 --directory web
```

Then open `http://127.0.0.1:8767`.

## The landing screen

A name is already filled in when the page loads, drawn from the cast in `web/names.js`, and a different one turns up each time you come back to this screen. Play as them, or focus the field and type over it.

| Control | Values | Default |
|---|---|---|
| Name | Up to 8 letters | A random name from the cast |
| Mode | TORMENT, CLASSIC | TORMENT |
| Speed | Slow, Normal, Fast | Normal |
| Lives | 3, 5, ∞ | 3 |
| Time limit | None, 2:00, 5:00 | None |
| Sound | On, Off | On |

Anything that isn't A-Z is stripped as you type, and lowercase is uppercased.

## Controls

Space is the action key everywhere, and Escape is the back key everywhere.

| Action | Keyboard | Pointer and touch |
|---|---|---|
| Move between menu rows | Up and down arrows | Tap |
| Change a setting | Left and right arrows | Tap |
| Start a game | Space | Tap `> PLAY` |
| Launch the ball | Space | Tap |
| Pause | Space, while a ball is in play | The pause button |
| Resume | Space | Tap `> RESUME` |
| Play again | Space on the end screen | Tap `> PLAY AGAIN` |
| Move the paddle | Left and right arrows | Drag, or tap a position |
| Back out a level | Escape | Tap `> CHANGE NAME` |
| Commit a name you typed | Enter | The keyboard's done key |

Settings apply the moment you choose them, so nothing needs saving and Enter has no job outside the name field.

Escape steps back one level at a time: from a game it pauses, from the pause or end screen it returns to the menu, and from the name field it leaves the field without committing.

While the name field has focus it keeps the keys it needs: Space types a space, left and right move the caret, and Enter commits the name and hands focus back so Space starts the game.

## TORMENT

The wall's rage rises with the damage it takes, so it gets angrier the closer you are to winning.

| Stage | Damage done | Behaviour |
|---|---|---|
| DORMANT | under 15% | Asleep |
| STIRRING | 15-40% | Screams and screen shake |
| AWAKE | 40-70% | Projectiles, and hardening begins |
| BOILING | 70-90% | Projectiles and beams |
| DYING | over 90% | Wider beams, shorter warnings, constant shake |

### Attacks

Projectiles fall from bricks that are still alive and take one block off your paddle. Beams charge in a bright column for 1.2 seconds (0.7 at DYING) before firing, and take their full width in blocks: 2 at BOILING, 3 or 4 at DYING. They aim where your paddle was when the charge started, so standing still loses.

Your paddle starts at 10 blocks. Losing all of them ends the run outright, whatever your lives say. Lives cover dropped balls only, so there are two separate ways to die.

Losing a ball repairs the paddle back to its full 10 blocks for the next serve. Extra blocks won from a powerup are kept, so a life lost costs you the life and not your pickups.

### Hardening and combos

Once the wall is awake it periodically armours most of the surviving bricks, adding a hit to each and drawing a dark core that grows with the extra hits needed. It leaves about a third untouched, so there's always a soft seam to aim at.

Destroying 3 bricks in one flight (no paddle touch in between) takes a layer back off every brick on the wall. Ricochets are the only way to strip armour while you're still taking bricks down.

### Self-healing

Once the wall has reached DYING, it learns to knit itself back together. Stop damaging it for 8 seconds and bricks start reappearing where the name used to be, one at a time, scattered rather than in reading order.

While it recovers the wall gloats instead of threatening, drawing on its own set of lines for the whole healing period, including the stage changes on the way down.

Healing walks the rage meter back down, because rage reads the wall's current state rather than your running total. As bricks return the wall cools through the stages, attacks thin out, the blinking stops, the screen stops shaking, and if you never hit it again it goes back to sleep entirely. From the brink, a full recovery to DORMANT takes around 90 seconds of being left alone.

Recovery costs it armour. Bricks come back soft, and every 4 regrown the wall gives up one of its hardness layers across the rest of the wall. It runs no hardening passes at all while healing, so the armour only comes off during a recovery. A wall left alone from the brink all the way back to DORMANT is as soft as the one you started against, which means stalling hands you a bigger wall and an easier one at the same time.

Any hit interrupts healing and restarts the 8-second clock, so the pressure is to finish the job rather than circle the ball safely. Your score falls as the wall recovers, since it counts the bricks currently down, not the ones you've broken over the course of the game.

The wall doesn't wait for you to serve. Healing keeps running while a ball rides the paddle, so holding the serve buys nothing: hold it long enough at the brink and the name grows back around you. Refusing to serve for 90 seconds takes a wall from 7 bricks left to 66 of 79, and the score down with it.

It won't shoot at you while you're holding a serve, though. You've just lost a ball and can't play yet, so no new projectiles or beams start until you serve, and the attack timers hold rather than run down, so serving never releases a volley that queued up while you waited.

### Powerups

Roughly 8% of bricks conceal one. Nothing marks them, so you find out when the brick breaks and a token starts falling. Catch it with the paddle.

| Token | Effect |
|---|---|
| P | Plating, absorbs the next 2 hits |
| W | Two more paddle blocks, up to 14 |
| B | An extra ball |
| L | An extra life |

A plated paddle turns blue and carries a glow around it, which shrinks once plating is down to its last hit. The glow is there because colour on its own tells a player with a colour vision deficiency nothing.

Balls are independent. Losing your last one costs a life; while any ball is live, you're still in play.

## The clock

The clock runs only while a ball is in play. It stops while paused, and between losing a life and launching the next ball, so a player never loses time to an interruption or to thinking.

With no time limit the readout counts up. With a limit it counts down, and reaching zero ends the game.

## Endings

| Screen | Cause |
|---|---|
| `WALL CLEARED` | Every brick destroyed |
| `PADDLE DESTROYED` | Every paddle block cut away |
| `GAME OVER` | Lives exhausted |
| `TIME UP` | Time limit reached |

All four report the name, bricks destroyed, elapsed time, and a closing remark from the wall.

## Sound

Synthesised with the Web Audio API, so there are no audio files to load. Browsers only start audio after a user gesture, so it comes alive on your first tap or keypress. Turn it off on the landing screen, or before you start.

## Changing the cast

`web/names.js` opens with a plain block of names, one per line. Edit it, save, reload the page. No build step. Letters A-Z only and up to 8 characters, since that's what the brick grid draws. Duplicates and anything undrawable are dropped at load, and the count that survived is recorded in the debug log under `names`.

## The bitmap font

`web/bricks.js` holds one entry per letter in `SHAPES`, seven rows of five characters where `#` is a brick:

```js
A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
```

To add a character, add an entry of the same 5x7 shape and widen the filter in `cleanName` to accept it. Every row must be five characters and every glyph seven rows, since the wall builder indexes them directly.

`PB.bricks.buildWall(name)` returns the grid, where `cells` is a flat `Uint8Array` indexed `row * cols + col` holding each brick's remaining hits (0 is empty).

## Balance harness

`tools/simulate.js` loads these exact modules against a stubbed canvas and plays whole games with no rendering, so hundreds of runs finish in seconds. Use it to check a tuning change against outcome distributions rather than against one lucky run.

```bash
node tools/simulate.js --runs 200 --skill 0.7
node tools/simulate.js --runs 200 --name SAMANTHA --skill 0.95
node tools/simulate.js --runs 100 --mode classic
```

| Flag | Meaning |
|---|---|
| `--runs` | How many games to play |
| `--skill` | 0 to 1. Above 0.5 the simulated player reads beam telegraphs and dodges |
| `--name`, `--mode`, `--speed`, `--lives`, `--limit` | Same values as the landing screen |
| `--width`, `--height` | Viewport to simulate |

It reports outcome shares, duration percentiles, how much of the wall came down, and per-game counts for beams, projectiles, damage, powerups, combos, and hardenings.

## Reading the debug log

The game keeps a bounded, always-on record of what it decided, with no flag to switch on first. From the browser console:

```js
playbounce.debug()          // every record, oldest first
playbounce.debug('brick')   // one kind only
playbounce.debug.table()    // console.table view
playbounce.state()          // ball, paddle, wall, beast, and live attacks
```

The full set of record kinds, alphabetically: `audio`, `ball.add`, `ball.lost`, `beam.charge`, `beam.fire`, `beast.reset`, `brick`, `combo`, `damage`, `end`, `harden`, `heal`, `heal.soften`, `hidden`, `launch`, `life`, `mute`, `names`, `nolayout`, `paddle`, `pause`, `plating`, `powerup.apply`, `powerup.catch`, `powerup.drop`, `powerup.miss`, `projectile`, `ready`, `reject`, `repair`, `resize`, `resume`, `scream`, `screen`, `setting`, `stage`, `start`, `stop`, `timeout`, and `unstick`.

The buffer holds the last 256 records. A long TORMENT run generates more than that, so treat counts from a finished game as a recent window rather than a total.

`playbounce.state().wall.armour` counts the live bricks by how many hits they still need: `[12, 30, 5]` is 12 bricks one hit from gone, 30 needing two, and 5 needing three. Watch it across a hardening pass, a combo, or a recovery to see armour going on and coming off.

## Browser support

Chrome, Safari, and Firefox on iOS, Android, macOS, and Windows. The page uses Canvas 2D, Pointer Events, Web Audio, and `100dvh` with a `100vh` fallback for browsers without `dvh`. Screen shake is damped when the reader asks for reduced motion.
