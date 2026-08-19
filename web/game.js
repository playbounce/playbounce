/*
 * Game loop, physics, collision, and canvas rendering.
 *
 * Sizing is derived from the canvas on every layout pass, so the same code runs
 * at 375px and at 1280px with no fixed pixel values anywhere.
 *
 * Two modes: CLASSIC is a plain brick-breaker, TORMENT wakes the wall up and
 * lets it fight back (see beast.js).
 */
(function (global) {
  'use strict';

  var PB = global.PB;
  var trace = PB.trace;

  var SPEED_FACTORS = { slow: 0.55, normal: 0.75, fast: 1.0 };
  var MAX_DEFLECT = Math.PI / 3;   /* paddle edge sends the ball 60 degrees off vertical */
  var MIN_VERTICAL = 0.22;         /* smallest share of speed kept on the y axis */
  var MAX_FRAME = 1 / 30;          /* longest step one frame may apply */
  var MAX_SUBSTEPS = 24;

  var WALL_TOP = 0.12;
  var WALL_TOP_MIN = 60;
  var WALL_WIDTH = 0.94;
  var WALL_HEIGHT = 0.40;
  var MIN_CELL = 4;

  var PADDLE_SPAN = 0.20;          /* share of canvas width at full health */
  var PADDLE_MIN = 56;
  var PADDLE_MAX = 190;
  var PADDLE_HEIGHT = 0.016;
  var PADDLE_MARGIN = 0.07;
  var START_BLOCKS = 10;
  var MAX_BLOCKS = 14;
  var PLATING_HITS = 2;

  var BALL_RADIUS = 0.013;
  var KEY_SPEED = 1.1;             /* paddle movement per second, as a share of canvas width */
  var COMBO_STEP = 3;              /* bricks per flight that soften the wall */
  var HARDEN_SHARE = 0.65;         /* share of live bricks a hardening pass armours */

  var COLOUR_BG = '#0D0D0D';
  var COLOUR_BRICK = '#39FF14';
  var COLOUR_BRICK_EDGE = '#12500A';
  var COLOUR_PADDLE = '#EFEFEF';
  var COLOUR_PLATING = '#A7DAFF';
  var COLOUR_CHILL = '#7FE6FF';

  /* An ice hit costs no blocks, only speed, and only for a few seconds. Long
     enough to lose a rally, short enough that it reads as a setback. */
  var CHILL_TIME = 5;
  var CHILL_FACTOR = 0.75;

  /*
   * A mouse or a finger normally places the paddle outright, so there's no
   * "three quarters of instant" to apply: chilling pointer input can only be a
   * speed cap, and a cap set at the key speed is a far harsher penalty than the
   * quarter the keys lose. This multiplier lifts the chilled pointer to a rate
   * that lags a flick without stranding the paddle mid-screen.
   */
  var CHILL_CHASE = 3;
  var BLAST_BALLS = 5;             /* balls fanned out by a caught ball blast */

  /*
   * Magenta because nothing else on screen is: the wall runs green through
   * amber to near-white, and projectiles take the wall's colour, so a white
   * ball was indistinguishable from incoming fire at DYING. It also stays clear
   * of the plating blue, the ice cyan, and the amber of the ball blast.
   */
  var COLOUR_BALL = '#FF3DE0';

  function clamp(value, low, high) {
    return value < low ? low : (value > high ? high : value);
  }

  PB.createGame = function createGame(canvas, callbacks) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var wallCanvas = document.createElement('canvas');
    var wallCtx = wallCanvas.getContext('2d');

    var handlers = callbacks || {};
    var wall = null;
    var view = { width: 0, height: 0, ratio: 1 };
    var layout = { cell: 0, originX: 0, originY: 0 };
    var paddle = { x: 0, y: 0, blocks: START_BLOCKS, blockWidth: 0, width: 0, height: 0, plating: 0, chill: 0, aim: null };
    var balls = [];
    var ballRadius = 0;
    var ballSpeed = 0;
    var held = true;                 /* a ball rides the paddle, waiting to launch */
    var painted = { brick: '', edge: '', hardness: 0 };

    var beast = PB.createBeast({
      onStage: function (key, rising) { report('stage', { stage: key, rising: rising }); },
      onScream: function () { report('scream', {}); },
      onProjectile: function (ice) { report('projectile', { ice: !!ice }); },
      onBeamCharge: function (time) { report('beamCharge', { time: time }); },
      onBeamFire: function () { report('beamFire', {}); },
      onHarden: function (hardness) { hardenWall(hardness); },
      onHeal: function (first) { healBrick(first); },
      /* No banner for this one: the heal line already says what's happening,
         and the bricks losing their dark cores shows the rest. */
      onSoften: function () { softenWall(); },
      onPaddleHit: function (blocks, source) { damagePaddle(blocks, source); },
      onChill: function () { chillPaddle(); }
    });

    var powerups = PB.createPowerups({
      onCatch: function (kind) { applyPowerup(kind); }
    });

    var state = {
      phase: 'idle',        /* idle | running | paused | ended */
      mode: 'torment',
      speedName: 'normal',
      lives: 3,
      unlimited: false,
      destroyed: 0,
      elapsed: 0,
      limit: 0,
      reported: -1,
      keyLeft: false,
      keyRight: false
    };

    var frame = 0;
    var lastTime = 0;

    function report(kind, detail) {
      if (handlers.onEvent) handlers.onEvent(kind, detail || {});
    }

    /*
     * The wall's height changes with name length, so the banner can't sit at a
     * fixed percentage without landing on the bricks. Report the midpoint of
     * the clear band between the wall and the paddle instead.
     */
    function notifyLayout() {
      if (!handlers.onLayout) return;
      var wallBottom = wall && wall.cols > 0
        ? layout.originY + layout.cell * wall.rows
        : view.height * 0.2;
      var band = Math.max(wallBottom, 0) + (paddle.y - wallBottom) / 2;
      handlers.onLayout({
        wallBottom: wallBottom,
        paddleTop: paddle.y,
        bannerY: Math.round(clamp(band, wallBottom + 24, paddle.y - 24))
      });
    }

    function torment() { return state.mode === 'torment'; }

    function environment() {
      return {
        view: view, wall: wall, layout: layout, paddle: paddle,
        destroyed: state.destroyed, held: held
      };
    }

    /* ---- layout ------------------------------------------------------- */

    function measure() {
      var ratio = Math.min(global.devicePixelRatio || 1, 2);
      var width = canvas.clientWidth;
      var height = canvas.clientHeight;
      if (width <= 0 || height <= 0) return false;

      view.width = width;
      view.height = height;
      view.ratio = ratio;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return true;
    }

    /*
     * Cells are square, so letters keep the font's proportions at every name
     * length. A short name fills the width budget and gets chunky bricks; an
     * eight-character name needs 47 columns, so its bricks come out smaller.
     */
    function layoutWall() {
      if (!wall || wall.cols === 0) return;
      var availWidth = view.width * WALL_WIDTH;
      var availHeight = view.height * WALL_HEIGHT;
      var cell = Math.floor(Math.min(availWidth / wall.cols, availHeight / wall.rows));
      layout.cell = Math.max(cell, MIN_CELL);
      layout.originX = Math.round((view.width - layout.cell * wall.cols) / 2);
      layout.originY = Math.round(Math.max(view.height * WALL_TOP, WALL_TOP_MIN));
      repaintWall();
    }

    function layoutPieces() {
      var span = clamp(view.width * PADDLE_SPAN, PADDLE_MIN, PADDLE_MAX);
      paddle.blockWidth = span / START_BLOCKS;
      paddle.width = paddle.blockWidth * paddle.blocks;
      paddle.height = Math.max(8, view.height * PADDLE_HEIGHT);
      paddle.y = view.height - paddle.height - Math.max(22, view.height * PADDLE_MARGIN);
      ballRadius = Math.max(4, Math.min(view.width, view.height) * BALL_RADIUS);
      ballSpeed = view.height * SPEED_FACTORS[state.speedName];
    }

    function resizePaddle() {
      paddle.blocks = clamp(paddle.blocks, 0, MAX_BLOCKS);
      paddle.width = paddle.blockWidth * paddle.blocks;
      paddle.x = clamp(paddle.x, 0, Math.max(0, view.width - paddle.width));
    }

    /* ---- wall rendering ------------------------------------------------ */

    function wallColours() {
      if (!torment()) return { brick: COLOUR_BRICK, edge: COLOUR_BRICK_EDGE };
      return beast.colours();
    }

    function paintCell(col, row, hp, colours) {
      var cell = layout.cell;
      var x = col * cell;
      var y = row * cell;
      wallCtx.clearRect(x, y, cell, cell);
      if (hp <= 0) return;

      var inset = cell >= 10 ? 2 : 1;
      wallCtx.fillStyle = colours.edge;
      wallCtx.fillRect(x, y, cell, cell);
      wallCtx.fillStyle = colours.brick;
      wallCtx.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);

      /* A hardened brick carries a dark core that grows with each extra hit it needs. */
      if (hp > 1) {
        var coreSize = Math.max(2, (cell - inset * 2) * (0.22 * (hp - 1) + 0.16));
        var offset = (cell - coreSize) / 2;
        wallCtx.fillStyle = colours.edge;
        wallCtx.fillRect(x + offset, y + offset, coreSize, coreSize);
      }
    }

    /* The wall changes only when a brick is hit or the beast's colour moves. */
    function repaintWall() {
      if (!wall || wall.cols === 0 || layout.cell === 0) return;
      var colours = wallColours();
      var width = layout.cell * wall.cols;
      var height = layout.cell * wall.rows;
      wallCanvas.width = Math.round(width * view.ratio);
      wallCanvas.height = Math.round(height * view.ratio);
      wallCtx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
      wallCtx.clearRect(0, 0, width, height);

      for (var row = 0; row < wall.rows; row += 1) {
        for (var col = 0; col < wall.cols; col += 1) {
          paintCell(col, row, wall.cells[row * wall.cols + col], colours);
        }
      }
      painted.brick = colours.brick;
      painted.edge = colours.edge;
    }

    /*
     * Hardening armours most of the surviving bricks but deliberately not all
     * of them, so the wall stays mottled and there's always a soft seam to aim
     * at rather than a uniform slab to grind through.
     */
    function hardenWall(hardness) {
      if (!wall) return;
      for (var i = 0; i < wall.cells.length; i += 1) {
        if (wall.cells[i] > 0 && wall.cells[i] < hardness && Math.random() < HARDEN_SHARE) {
          wall.cells[i] += 1;
        }
      }
      repaintWall();
      report('harden', { hardness: hardness });
    }

    /*
     * Regrow one destroyed brick, chosen at random from the cells the name
     * occupies, so the wall knits itself back together unevenly rather than
     * refilling in reading order.
     */
    function healBrick(first) {
      if (!wall || wall.live >= wall.total) return;

      var candidates = [];
      for (var i = 0; i < wall.cells.length; i += 1) {
        if (wall.mask[i] && !wall.cells[i]) candidates.push(i);
      }
      if (candidates.length === 0) return;

      var index = candidates[Math.floor(Math.random() * candidates.length)];
      wall.cells[index] = 1;
      wall.live += 1;
      state.destroyed = Math.max(0, state.destroyed - 1);
      paintCell(index % wall.cols, Math.floor(index / wall.cols), 1, wallColours());

      if (handlers.onScore) handlers.onScore(state.destroyed);
      trace('heal', { live: wall.live, left: candidates.length - 1 });
      report('heal', { first: first, live: wall.live });
    }

    /*
     * How many hits the live bricks still need, counted per depth: index 0 is
     * the bricks one hit from gone, index 1 those needing two, and so on. It's
     * the only view of the wall's armour from outside, which is what makes a
     * hardening pass or a heal stripping a layer measurable rather than a
     * thing you have to take on faith from the colours.
     */
    function wallArmour() {
      var counts = [];
      for (var i = 0; i < wall.cells.length; i += 1) {
        var hits = wall.cells[i];
        if (hits <= 0) continue;
        while (counts.length < hits) counts.push(0);
        counts[hits - 1] += 1;
      }
      return counts;
    }

    /* A combo takes a layer back off, which is what makes ricochets pay. */
    function softenWall() {
      if (!wall) return;
      for (var i = 0; i < wall.cells.length; i += 1) {
        if (wall.cells[i] > 1) wall.cells[i] -= 1;
      }
      repaintWall();
    }

    /* ---- paddle and balls ---------------------------------------------- */

    function newBall(x, y, angle) {
      return {
        x: x, y: y,
        vx: ballSpeed * Math.sin(angle),
        vy: -ballSpeed * Math.cos(angle),
        combo: 0
      };
    }

    function restBallOnPaddle() {
      held = true;
    }

    function heldBallPosition() {
      return { x: paddle.x + paddle.width / 2, y: paddle.y - ballRadius - 1 };
    }

    function launchBall() {
      if (state.phase !== 'running' || !held) return;
      held = false;
      var spot = heldBallPosition();
      balls.push(newBall(spot.x, spot.y, (Math.random() * 0.5 - 0.25) * MAX_DEFLECT));
      report('launch', {});
      trace('launch', { speed: Math.round(ballSpeed) });
    }

    function addBall() {
      var source = balls.length > 0 ? balls[0] : heldBallPosition();
      var angle = (Math.random() * 0.8 - 0.4) * MAX_DEFLECT;
      balls.push(newBall(source.x, source.y, angle));
      trace('ball.add', { balls: balls.length });
    }

    /*
     * Five balls fanned across the full deflection range from the paddle. The
     * spread is the point: one brick left on a wide wall is an aiming problem,
     * and a fan covers angles a single ball would need several rallies to try.
     */
    function burstBalls() {
      var origin = balls.length > 0 ? balls[0] : heldBallPosition();
      var spread = MAX_DEFLECT * 1.6;
      for (var i = 0; i < BLAST_BALLS; i += 1) {
        var share = BLAST_BALLS === 1 ? 0.5 : i / (BLAST_BALLS - 1);
        balls.push(newBall(origin.x, origin.y, (share - 0.5) * spread));
      }
      held = false;
      trace('ball.blast', { added: BLAST_BALLS, balls: balls.length });
    }

    /* Ice costs no blocks, only speed, and only until the timer runs out. */
    function chillPaddle() {
      if (state.phase !== 'running') return;
      paddle.chill = CHILL_TIME;
      paddle.aim = null;
      trace('chill', { seconds: CHILL_TIME });
      report('chill', {});
    }

    function applyPowerup(kind) {
      if (kind.key === 'plate') {
        paddle.plating = PLATING_HITS;
      } else if (kind.key === 'wide') {
        paddle.blocks = Math.min(MAX_BLOCKS, paddle.blocks + 2);
        resizePaddle();
      } else if (kind.key === 'life') {
        if (!state.unlimited) {
          state.lives += 1;
          if (handlers.onLives) handlers.onLives(state.lives);
        }
      } else if (kind.key === 'ball') {
        if (held) launchBall();
        else addBall();
      } else if (kind.key === 'blast') {
        burstBalls();
      }
      trace('powerup.apply', { kind: kind.key, blocks: paddle.blocks, plating: paddle.plating });
      report('powerup', { label: kind.label });
    }

    function damagePaddle(blocks, source) {
      if (state.phase !== 'running') return;

      if (paddle.plating > 0) {
        paddle.plating -= 1;
        trace('plating', { left: paddle.plating, source: source });
        report('plating', { source: source });
        return;
      }

      paddle.blocks = Math.max(0, paddle.blocks - blocks);
      resizePaddle();
      trace('damage', { blocks: blocks, left: paddle.blocks, source: source });
      report('damage', { blocks: blocks, left: paddle.blocks, source: source });

      if (paddle.blocks <= 0) finish('crushed');
    }

    /* Keeps the ball off a near-horizontal path it could bounce along forever. */
    function enforceVerticalTravel(ball) {
      var minY = ballSpeed * MIN_VERTICAL;
      if (Math.abs(ball.vy) >= minY) return;
      var signY = ball.vy < 0 ? -1 : 1;
      var signX = ball.vx < 0 ? -1 : 1;
      ball.vy = signY * minY;
      ball.vx = signX * Math.sqrt(Math.max(0, ballSpeed * ballSpeed - ball.vy * ball.vy));
      trace('unstick', { vy: Math.round(ball.vy) });
    }

    function bounceOffPaddle(ball) {
      if (ball.vy <= 0 || paddle.width <= 0) return;
      var nearX = clamp(ball.x, paddle.x, paddle.x + paddle.width);
      var nearY = clamp(ball.y, paddle.y, paddle.y + paddle.height);
      var dx = ball.x - nearX;
      var dy = ball.y - nearY;
      if (dx * dx + dy * dy > ballRadius * ballRadius) return;

      var centre = paddle.x + paddle.width / 2;
      var offset = clamp((ball.x - centre) / (paddle.width / 2), -1, 1);
      var angle = offset * MAX_DEFLECT;
      ball.y = paddle.y - ballRadius;
      ball.vx = ballSpeed * Math.sin(angle);
      ball.vy = -ballSpeed * Math.cos(angle);
      ball.combo = 0;
      report('paddle', {});
      trace('paddle', { offset: Math.round(offset * 100) / 100 });
    }

    /*
     * Every brick the ball overlaps this substep takes a hit, but the ball
     * reflects only once, off the axis it penetrated least.
     */
    function hitBricks(ball) {
      var cell = layout.cell;
      if (!wall || wall.live === 0 || cell === 0) return;

      var firstCol = Math.floor((ball.x - ballRadius - layout.originX) / cell);
      var lastCol = Math.floor((ball.x + ballRadius - layout.originX) / cell);
      var firstRow = Math.floor((ball.y - ballRadius - layout.originY) / cell);
      var lastRow = Math.floor((ball.y + ballRadius - layout.originY) / cell);
      if (lastCol < 0 || firstCol > wall.cols - 1) return;
      if (lastRow < 0 || firstRow > wall.rows - 1) return;

      firstCol = Math.max(firstCol, 0);
      lastCol = Math.min(lastCol, wall.cols - 1);
      firstRow = Math.max(firstRow, 0);
      lastRow = Math.min(lastRow, wall.rows - 1);

      var colours = wallColours();
      var bounced = false;
      var broke = false;
      var survived = false;

      for (var row = firstRow; row <= lastRow; row += 1) {
        for (var col = firstCol; col <= lastCol; col += 1) {
          var index = row * wall.cols + col;
          var hp = wall.cells[index];
          if (hp <= 0) continue;

          var left = layout.originX + col * cell;
          var top = layout.originY + row * cell;
          var nearX = clamp(ball.x, left, left + cell);
          var nearY = clamp(ball.y, top, top + cell);
          var dx = ball.x - nearX;
          var dy = ball.y - nearY;
          if (dx * dx + dy * dy > ballRadius * ballRadius) continue;

          hp -= 1;
          wall.cells[index] = hp;
          paintCell(col, row, hp, colours);
          if (torment()) beast.registerDamage();

          if (hp <= 0) {
            wall.live -= 1;
            state.destroyed += 1;
            broke = true;
            ball.combo += 1;
            if (torment()) {
              powerups.maybeDrop(left + cell / 2, top + cell / 2, environment());
              if (ball.combo > 0 && ball.combo % COMBO_STEP === 0 && beast.registerCombo(ball.combo)) {
                softenWall();
                report('combo', { bricks: ball.combo });
              }
            }
          } else {
            survived = true;
          }

          if (!bounced) {
            var overlapX = (ballRadius + cell / 2) - Math.abs(ball.x - (left + cell / 2));
            var overlapY = (ballRadius + cell / 2) - Math.abs(ball.y - (top + cell / 2));
            if (overlapX < overlapY) ball.vx = -ball.vx;
            else ball.vy = -ball.vy;
            bounced = true;
          }
        }
      }

      if (bounced) {
        enforceVerticalTravel(ball);
        if (broke) {
          if (handlers.onScore) handlers.onScore(state.destroyed);
          report('brick', { rage: torment() ? beast.rage() : 0 });
        } else if (survived) {
          report('hard', {});
        }
        trace('brick', { left: wall.live, destroyed: state.destroyed });
      }

      if (wall.live === 0) finish('cleared');
    }

    function loseLife() {
      if (!state.unlimited) state.lives -= 1;
      trace('life', { lives: state.unlimited ? 'inf' : state.lives, destroyed: state.destroyed });
      if (handlers.onLives) handlers.onLives(state.unlimited ? Infinity : state.lives);
      report('life', {});

      if (!state.unlimited && state.lives <= 0) {
        finish('over');
        return;
      }
      if (torment()) beast.clearAttacks();

      /* A fresh ball gets a repaired paddle. Blocks won from a powerup survive,
         so losing a life undoes beam damage without confiscating a pickup. */
      if (paddle.blocks < START_BLOCKS) {
        trace('repair', { from: paddle.blocks, to: START_BLOCKS });
        paddle.blocks = START_BLOCKS;
        resizePaddle();
      }
      /* The repair thaws it too, so a life isn't spent serving a frozen paddle. */
      paddle.chill = 0;
      paddle.aim = null;
      restBallOnPaddle();
    }

    function substep(ball, step) {
      ball.x += ball.vx * step;
      ball.y += ball.vy * step;

      if (ball.x - ballRadius < 0) {
        ball.x = ballRadius;
        ball.vx = Math.abs(ball.vx);
        report('wall', {});
      } else if (ball.x + ballRadius > view.width) {
        ball.x = view.width - ballRadius;
        ball.vx = -Math.abs(ball.vx);
        report('wall', {});
      }
      if (ball.y - ballRadius < 0) {
        ball.y = ballRadius;
        ball.vy = Math.abs(ball.vy);
        report('wall', {});
      }

      hitBricks(ball);
      if (state.phase !== 'running') return;
      bounceOffPaddle(ball);
    }

    function movePaddle(delta) {
      if (paddle.chill > 0) paddle.chill = Math.max(0, paddle.chill - delta);
      var travel = view.width * KEY_SPEED * (paddle.chill > 0 ? CHILL_FACTOR : 1) * delta;

      /*
       * A chilled paddle can't jump to the pointer, so aimAt leaves the wanted
       * position here and the paddle walks to it at the same reduced rate the
       * keys get. Uncooled there is no target to chase, because aimAt places
       * the paddle itself and clears this.
       */
      if (paddle.aim !== null) {
        var want = clamp(paddle.aim - paddle.width / 2, 0, Math.max(0, view.width - paddle.width));
        var reach = travel * CHILL_CHASE;
        var distance = want - paddle.x;
        if (Math.abs(distance) <= reach) {
          paddle.x = want;
          paddle.aim = null;
        } else {
          paddle.x += distance > 0 ? reach : -reach;
        }
      }

      if (state.keyLeft) paddle.x -= travel;
      if (state.keyRight) paddle.x += travel;
      paddle.x = clamp(paddle.x, 0, Math.max(0, view.width - paddle.width));
    }

    /* The clock runs only while a ball is live, so a paused or waiting
       player never loses time. The HUD hears about it once per whole second. */
    function advanceClock(delta) {
      state.elapsed += delta;
      var whole = Math.floor(state.elapsed);
      if (whole !== state.reported) {
        state.reported = whole;
        if (handlers.onTime) handlers.onTime(state.elapsed, state.limit);
      }
      if (state.limit > 0 && state.elapsed >= state.limit) {
        trace('timeout', { limit: state.limit, destroyed: state.destroyed });
        finish('timeout');
      }
    }

    function update(delta) {
      movePaddle(delta);

      /*
       * The wall works whether or not the ball is in play, so healing, attacks,
       * and hardening all keep running while a serve is held. Sitting on the
       * serve costs progress rather than buying a rest.
       */
      if (torment()) {
        beast.update(delta, environment());
        if (state.phase !== 'running') return;
        powerups.update(delta, environment());
        powerups.maybeBlast(delta, environment());

        var colours = beast.colours();
        if (colours.brick !== painted.brick) repaintWall();
      }

      if (held) return;

      advanceClock(delta);
      if (state.phase !== 'running') return;

      /* Split the frame so a fast ball can't step over a brick or the paddle. */
      var distance = ballSpeed * delta;
      var maxStep = Math.max(2, Math.min(layout.cell * 0.4, ballRadius));
      var steps = clamp(Math.ceil(distance / maxStep), 1, MAX_SUBSTEPS);
      var step = delta / steps;

      for (var i = 0; i < steps; i += 1) {
        for (var b = balls.length - 1; b >= 0; b -= 1) {
          substep(balls[b], step);
          if (state.phase !== 'running') return;
          if (balls[b].y - ballRadius > view.height) {
            balls.splice(b, 1);
            trace('ball.lost', { left: balls.length });
          }
        }
        if (balls.length === 0) {
          loseLife();
          return;
        }
      }
    }

    function drawPaddle() {
      if (paddle.blocks <= 0) return;
      var gutter = paddle.blockWidth > 9 ? 1 : 0;

      /* Frozen beats plated for colour, since the freeze is the thing you need
         to know about right now and it wears off on its own. */
      if (paddle.chill > 0) ctx.fillStyle = COLOUR_CHILL;
      else ctx.fillStyle = paddle.plating > 0 ? COLOUR_PLATING : COLOUR_PADDLE;
      for (var i = 0; i < paddle.blocks; i += 1) {
        ctx.fillRect(
          Math.round(paddle.x + i * paddle.blockWidth),
          Math.round(paddle.y),
          Math.max(1, Math.round(paddle.blockWidth - gutter)),
          Math.round(paddle.height)
        );
      }
      /*
       * Plating turns the paddle blue, which a player with a colour vision
       * deficiency may not register at all. The halo carries the same fact as
       * brightness instead of hue, and its size tracks the hits left, so the
       * paddle looks different rather than only bluer. One shadowed stroke
       * does it: shadowing all ten blocks costs ten blurred draws a frame.
       */
      if (paddle.plating > 0) {
        ctx.save();
        ctx.shadowColor = COLOUR_PLATING;
        ctx.shadowBlur = Math.max(5, paddle.height * (paddle.plating >= PLATING_HITS ? 2.2 : 1.3));
        ctx.strokeStyle = COLOUR_PLATING;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.round(paddle.x) - 2.5, Math.round(paddle.y) - 2.5,
          Math.round(paddle.width) + 5, Math.round(paddle.height) + 5
        );
        ctx.restore();
      }

      /*
       * A bar under the paddle that drains as the freeze lifts. The colour
       * shift alone would tell a colourblind player nothing, and unlike the
       * plating halo this one also answers the question being asked at the
       * time, which is how much longer the paddle stays slow.
       */
      if (paddle.chill > 0) {
        var left = paddle.chill / CHILL_TIME;
        var barY = Math.round(paddle.y + paddle.height + 4);
        ctx.fillStyle = COLOUR_CHILL;
        ctx.fillRect(Math.round(paddle.x), barY, Math.round(paddle.width * left), 3);
      }
    }

    function drawBall(x, y) {
      ctx.beginPath();
      ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    function render() {
      ctx.setTransform(view.ratio, 0, 0, view.ratio, 0, 0);
      ctx.fillStyle = COLOUR_BG;
      ctx.fillRect(0, 0, view.width, view.height);
      if (state.phase === 'idle') return;

      var shake = torment() ? beast.shakeOffset() : null;
      if (shake) ctx.translate(shake.x, shake.y);

      if (wall && wall.live > 0) {
        var alpha = torment() ? beast.wallAlpha() : 1;
        if (alpha < 1) ctx.globalAlpha = alpha;
        ctx.drawImage(
          wallCanvas, layout.originX, layout.originY,
          layout.cell * wall.cols, layout.cell * wall.rows
        );
        ctx.globalAlpha = 1;
      }

      if (torment()) {
        beast.draw(ctx, environment());
        powerups.draw(ctx);
      }

      drawPaddle();

      ctx.fillStyle = COLOUR_BALL;
      if (held) {
        var spot = heldBallPosition();
        drawBall(spot.x, spot.y);
      }
      for (var i = 0; i < balls.length; i += 1) drawBall(balls[i].x, balls[i].y);
    }

    function tick(now) {
      frame = global.requestAnimationFrame(tick);
      if (state.phase !== 'running') return;
      var delta = Math.min((now - lastTime) / 1000, MAX_FRAME);
      lastTime = now;
      if (delta > 0) update(delta);
      render();
    }

    function startLoop() {
      if (frame) return;
      lastTime = performance.now();
      frame = global.requestAnimationFrame(tick);
    }

    function stopLoop() {
      if (!frame) return;
      global.cancelAnimationFrame(frame);
      frame = 0;
    }

    function finish(result) {
      state.phase = 'ended';
      stopLoop();
      render();
      trace('end', { result: result, destroyed: state.destroyed, elapsed: Math.round(state.elapsed) });
      if (handlers.onEnd) handlers.onEnd(result, state.destroyed, state.elapsed);
    }

    /* ---- input ---------------------------------------------------------- */

    function pointerX(event) {
      var box = canvas.getBoundingClientRect();
      return clamp(event.clientX - box.left, 0, view.width);
    }

    /* Centre the paddle on a canvas x position, or ask movePaddle to walk it
       there when the paddle is chilled and can't be placed outright. */
    function aimAt(x) {
      if (paddle.chill > 0) {
        paddle.aim = x;
        return;
      }
      paddle.aim = null;
      paddle.x = clamp(x - paddle.width / 2, 0, Math.max(0, view.width - paddle.width));
    }

    function aimPaddle(event) {
      aimAt(pointerX(event));
    }

    function onPointerDown(event) {
      if (state.phase !== 'running') return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      aimPaddle(event);
      launchBall();
    }

    function onPointerMove(event) {
      if (state.phase !== 'running') return;
      if (event.pointerType !== 'mouse' && event.buttons === 0) return;
      event.preventDefault();
      aimPaddle(event);
    }

    function onPointerUp(event) {
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    var api = {
      start: function (config) {
        wall = PB.bricks.buildWall(config.name);
        state.mode = config.mode === 'classic' ? 'classic' : 'torment';
        state.speedName = SPEED_FACTORS[config.speed] ? config.speed : 'normal';
        state.unlimited = config.lives === Infinity;
        state.lives = state.unlimited ? Infinity : config.lives;
        state.destroyed = 0;
        state.elapsed = 0;
        state.limit = config.limit > 0 ? config.limit : 0;
        state.reported = -1;
        state.keyLeft = false;
        state.keyRight = false;
        state.phase = 'running';

        balls.length = 0;
        held = true;
        paddle.blocks = START_BLOCKS;
        paddle.plating = 0;
        paddle.chill = 0;
        paddle.aim = null;
        beast.reset(wall.total);
        powerups.reset();

        if (!measure()) {
          /* No box to measure yet, so take the size on the next frame rather
             than laying the wall out against zero. */
          trace('nolayout', {});
          global.requestAnimationFrame(function () { api.resize(); });
        }
        layoutPieces();
        resizePaddle();
        paddle.x = (view.width - paddle.width) / 2;
        layoutWall();
        notifyLayout();

        trace('start', {
          name: wall.name, bricks: wall.live, cols: wall.cols, cell: layout.cell,
          mode: state.mode, speed: state.speedName,
          lives: state.unlimited ? 'inf' : state.lives, limit: state.limit
        });

        if (handlers.onScore) handlers.onScore(0);
        if (handlers.onLives) handlers.onLives(state.unlimited ? Infinity : state.lives);
        if (handlers.onTime) handlers.onTime(0, state.limit);
        startLoop();
        render();
      },

      resize: function () {
        var previous = { width: view.width, height: view.height };
        if (!measure()) return;
        layoutPieces();
        resizePaddle();

        if (previous.width > 0 && previous.height > 0) {
          var scaleX = view.width / previous.width;
          var scaleY = view.height / previous.height;
          paddle.x = clamp(paddle.x * scaleX, 0, Math.max(0, view.width - paddle.width));
          for (var i = 0; i < balls.length; i += 1) {
            var ball = balls[i];
            ball.x = clamp(ball.x * scaleX, ballRadius, view.width - ballRadius);
            ball.y = clamp(ball.y * scaleY, ballRadius, view.height - ballRadius);
            /* Keep the heading, take the new canvas's speed. */
            var heading = Math.atan2(ball.vy, ball.vx);
            ball.vx = ballSpeed * Math.cos(heading);
            ball.vy = ballSpeed * Math.sin(heading);
          }
        } else {
          paddle.x = (view.width - paddle.width) / 2;
        }

        if (wall) layoutWall();
        notifyLayout();
        trace('resize', { width: view.width, height: view.height, cell: layout.cell });
        render();
      },

      launch: launchBall,
      aimAt: aimAt,

      setKey: function (side, down) {
        if (side === 'left') state.keyLeft = down;
        else if (side === 'right') state.keyRight = down;
      },

      pause: function () {
        if (state.phase !== 'running') return false;
        state.phase = 'paused';
        state.keyLeft = false;
        state.keyRight = false;
        stopLoop();
        trace('pause', { destroyed: state.destroyed });
        return true;
      },

      resume: function () {
        if (state.phase !== 'paused') return false;
        state.phase = 'running';
        startLoop();
        trace('resume', { destroyed: state.destroyed });
        return true;
      },

      stop: function () {
        state.phase = 'idle';
        stopLoop();
        wall = null;
        balls.length = 0;
        beast.clearAttacks();
        powerups.reset();
        render();
        trace('stop', {});
      },

      isRunning: function () { return state.phase === 'running'; },
      isPaused: function () { return state.phase === 'paused'; },

      /* Current state, for reading from the console alongside playbounce.debug(). */
      snapshot: function () {
        return {
          phase: state.phase,
          mode: state.mode,
          destroyed: state.destroyed,
          lives: state.unlimited ? Infinity : state.lives,
          elapsed: state.elapsed,
          limit: state.limit,
          held: held,
          balls: balls.map(function (ball) {
            return { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, combo: ball.combo };
          }),
          ball: { radius: ballRadius, speed: ballSpeed },
          paddle: {
            x: paddle.x, y: paddle.y, width: paddle.width,
            blocks: paddle.blocks, blockWidth: paddle.blockWidth, plating: paddle.plating,
            chill: Math.round(paddle.chill * 100) / 100
          },
          beast: {
            rage: beast.rage(), stage: beast.stageKey(), hardness: beast.hardness()
          },
          powerupsFalling: powerups.count(),
          attacks: torment() ? beast.attacks() : { beams: [], projectiles: [] },
          view: { width: view.width, height: view.height },
          wall: wall ? {
            name: wall.name, live: wall.live, total: wall.total,
            cols: wall.cols, rows: wall.rows,
            armour: wallArmour(),
            cell: layout.cell, originX: layout.originX, originY: layout.originY
          } : null
        };
      }
    };

    return api;
  };
})(window);
