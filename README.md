# playbounce

A brick-breaker game where the wall is somebody's name, and the name fights back.

The landing screen arrives pre-loaded with a stranger: ROSIE, KWAME, PRIYA, whoever comes up this time. Play as them or type over it with a name of your own. Then the wall wakes up. It reddens as you damage it, hardens so bricks take more hits, screams and shakes the screen, drops projectiles, and charges beams that saw blocks off your paddle. Lose every block and you're finished, however many lives you had left.

One static page: no install, no login, no build step, no backend, and no audio files. Send someone the URL and they're playing within a few seconds in any modern mobile, tablet, or desktop browser.

## Play it

Double-click `launch.command` (macOS), `launch.sh` (Linux), or `launch.bat` (Windows). Each one opens the game in your default browser. Or open `web/index.html` directly. There's nothing to install first.

## Share it

Upload the contents of `web/` to any static host (GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket, a folder on a web server) and send the URL. There's no server-side component, so a plain file host is enough.

## Modes

| Mode | What happens |
|---|---|
| TORMENT (default) | The wall wakes up, taunts you by name, hardens, and attacks. Roughly a third of competent runs clear it. |
| CLASSIC | Bricks and a paddle. Nothing fights back. |

## Controls

Space is the only action key: it starts a game, launches the ball, pauses, resumes, and plays again. Escape backs out one level, ending at the menu.

| Input | Desktop | Mobile and tablet |
|---|---|---|
| Move the paddle | Mouse, or left and right arrows | Drag, or tap where you want it |
| Start, launch, pause, resume | Space | Tap, and the pause button |
| Back out a level | Escape | The pause button |
| Move between menu rows | Up and down arrows | Tap |
| Change a setting | Left and right arrows | Tap |
| Commit a name you typed | Enter | The keyboard's done key |

Settings apply the moment you pick them, so Enter is only ever needed for text.

The game pauses itself when the tab goes to the background, so an interruption doesn't cost a life.

## How it works

Each letter comes from a 5x7 bitmap font. Every "on" pixel in a glyph becomes one destructible brick, so an 8-character name needs 47 columns and 7 rows. Cells stay square at every name length, which means a short name gets big chunky bricks and a long one gets small ones, and both keep the font's proportions.

The wall's attack pace scales with how many bricks it has. Without that, a long name means a longer fight and roughly twice the punishment, and the clear rate for SAMANTHA sat at 5% against 39% for ISAAC. Scaled, all name lengths land within a few points of each other.

Everything else, including the ball, the paddle, the beams, and the text, is sized from the canvas at run time, so the same code runs at 375px and at 1280px.

## Changing the cast

`web/names.js` holds the list, one name per line in a plain block at the top of the file. Add or remove lines, save, reload. Letters A-Z only, up to 8 characters. Anything that can't be drawn is dropped at load rather than breaking the game.

## Documentation

| File | What's in it |
|---|---|
| [USAGE.md](USAGE.md) | The full manual: modes, settings, the beast, powerups, the font, and the debug log |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diagram, module contracts, layout maths, and the balance harness |
| [CHANGELOG.md](CHANGELOG.md) | Dated changes per release |

## Layout

```
playbounce/
├── web/          the game, eleven files, no dependencies
└── tools/        headless balance harness
```

## License

MIT

Built by [Mo Shehu](https://mohammedshehu.com)
