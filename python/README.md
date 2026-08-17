# playbounce

A brick-breaker game where the wall fights back.

## Before you start

You need Python 3.9 or newer. Check with `python3 --version`. If that command isn't found, install Python from [python.org/downloads](https://www.python.org/downloads/) or your package manager (`apt install python3-pip`, `dnf install python3-pip`).

## Install

```
python3 -m pip install playbounce
```

## Play

```
playbounce
```

```
opened playbounce in your default browser
  file:///usr/local/lib/python3.12/site-packages/playbounce/web/index.html
```

Your browser opens on a landing screen with a stranger's name already typed in: ROSIE, KWAME, PRIYA, whoever comes up this time. Press Enter to play as them, or type over it with a name of your own. The wall is that name, spelled out in destructible bricks.

Then it wakes up. It reddens as you damage it, hardens so bricks take more hits, screams and shakes the screen, drops projectiles, and charges beams that saw blocks off your paddle. Lose every block and you're finished, however many lives you had left. Leave it alone too long near the end and it heals, growing back around you.

The game runs entirely in the browser with no network access, no backend, and no audio files. This package is a launcher for it.

## Serve it instead

To open the game on a phone or tablet on the same network:

```
playbounce --serve
```

```
playbounce serving on http://127.0.0.1:8000
  also reachable at http://192.168.1.24:8000
press ctrl-c to stop
```

| Option | What it does |
|---|---|
| `--serve` | Serve over localhost rather than opening the file directly |
| `--port N` | Serve on port N, or the next free port above it. Implies `--serve` |
| `--no-browser` | Print the address instead of opening a browser |
| `--version` | Print the version |

## Controls

Space is the action key: it starts a game, launches the ball, pauses, resumes, and plays again. Enter also starts a game from the menu. Escape backs out one level. Move the paddle with the mouse, the left and right arrows, or by dragging on a touchscreen.

## Documentation

- [USAGE.md](https://github.com/playbounce/playbounce/blob/main/USAGE.md), the full manual: modes, settings, the beast, powerups, the font, and the debug log
- [ARCHITECTURE.md](https://github.com/playbounce/playbounce/blob/main/ARCHITECTURE.md)
- [CHANGELOG.md](https://github.com/playbounce/playbounce/blob/main/CHANGELOG.md)

## License

MIT

Built by [Mo Shehu](https://mohammedshehu.com)
