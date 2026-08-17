/*
 * The wall as a hostile thing: rage, hardening, screams, and the attacks it
 * throws once it wakes up.
 *
 * Rage rises with the damage it takes, so the closer the player is to winning,
 * the harder it fights back.
 */
(function (global) {
  'use strict';

  var PB = global.PB;
  var trace = PB.trace;

  /* Ordered low to high; the last one whose threshold is met is the live stage. */
  var STAGES = [
    { key: 'dormant',  at: 0.00, brick: '#39FF14', edge: '#12500A', projectile: 0,   beam: 0,   scream: 0  },
    { key: 'stirring', at: 0.15, brick: '#B6FF1A', edge: '#3D5A08', projectile: 0,   beam: 0,   scream: 8  },
    { key: 'awake',    at: 0.40, brick: '#FFB000', edge: '#5A3C00', projectile: 4.2, beam: 0,   scream: 7  },
    { key: 'boiling',  at: 0.70, brick: '#FF4A1A', edge: '#5E1703', projectile: 2.5, beam: 6.0, scream: 5  },
    { key: 'dying',    at: 0.90, brick: '#FFECEC', edge: '#8C1010', projectile: 1.5, beam: 3.4, scream: 3  }
  ];

  var CHARGE_TIME = 1.2;        /* telegraph before a beam fires */
  var CHARGE_TIME_DYING = 0.7;
  var BEAM_FLASH = 0.28;        /* how long the fired beam stays on screen */
  var PROJECTILE_SPEED = 0.42;  /* share of canvas height per second */
  var HARDEN_EVERY = 14;        /* seconds between hardening passes once awake */
  var REFERENCE_BRICKS = 80;    /* a five-letter name, the pace everything is tuned against */
  var PACE_MIN = 0.72;
  var PACE_MAX = 1.75;
  var MAX_HARDNESS = 4;
  var COMBO_RELEASE = 3;        /* bricks in one flight that soften the wall */
  var SHAKE_DECAY = 3.4;
  var SHAKE_PIXELS = 14;
  var SHAKE_PIXELS_DYING = 21;  /* the last stage throws the screen around harder */
  var DYING_TREMOR = 0.2;       /* unrest that never settles once it's dying */

  /* Slow enough to read as a failing light rather than a strobe, and well under
     the three-flashes-a-second line that risks hurting photosensitive players. */
  var BLINK_PERIOD = 0.72;
  var BLINK_DUTY = 0.68;        /* share of each cycle spent at full brightness */
  var BLINK_LOW = 0.35;

  /* Once it has been to the brink, leaving it alone lets it knit itself back
     together. Slow enough to plan a finish around, relentless if ignored. */
  var HEAL_DELAY = 8;           /* seconds without taking a hit before it starts */
  var HEAL_INTERVAL = 1.4;      /* seconds per brick regrown, before pacing */

  /* Regrown bricks come back soft, so armour that stayed on the survivors would
     leave a healed wall tougher than the one that was there before. Shedding a
     layer every few heals walks the whole wall back down as it calms. */
  var HEAL_SOFTEN_EVERY = 4;    /* bricks regrown per hardness layer given up */

  function randomBetween(low, high) {
    return low + Math.random() * (high - low);
  }

  PB.createBeast = function createBeast(hooks) {
    var handlers = hooks || {};
    var reducedMotion = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

    var state = {
      rage: 0,
      stage: 0,
      hardness: 1,
      hardenIn: HARDEN_EVERY,
      projectileIn: 0,
      beamIn: 0,
      screamIn: 0,
      shake: 0,
      pace: 1,
      clock: 0,
      armed: false,       /* has it ever reached the dying stage */
      healing: false,
      sinceDamage: 0,
      healIn: HEAL_INTERVAL,
      healCount: 0        /* bricks regrown since the last layer of armour came off */
    };

    var projectiles = [];
    var beams = [];

    function stage() { return STAGES[state.stage]; }

    /*
     * A longer name is a bigger wall and a longer fight, and attack timers run
     * on the clock, so without this an eight-letter name takes roughly twice
     * the punishment of a three-letter one. Pace stretches the intervals with
     * the wall's size so nobody is condemned by their own name, while leaving
     * a long name somewhat harder.
     */
    function reset(totalBricks) {
      var bricks = totalBricks > 0 ? totalBricks : REFERENCE_BRICKS;
      state.pace = Math.min(PACE_MAX, Math.max(PACE_MIN, bricks / REFERENCE_BRICKS));
      state.rage = 0;
      state.stage = 0;
      state.hardness = 1;
      state.hardenIn = HARDEN_EVERY * state.pace;
      state.shake = 0;
      state.armed = false;
      state.healing = false;
      state.sinceDamage = 0;
      state.healIn = HEAL_INTERVAL * state.pace;
      state.healCount = 0;
      projectiles.length = 0;
      beams.length = 0;
      scheduleAll();
      trace('beast.reset', { bricks: bricks, pace: Math.round(state.pace * 100) / 100 });
    }

    function scheduleAll() {
      var s = stage();
      var pace = state.pace;
      state.projectileIn = s.projectile > 0 ? randomBetween(s.projectile * 0.6, s.projectile) * pace : Infinity;
      state.beamIn = s.beam > 0 ? randomBetween(s.beam * 0.6, s.beam) * pace : Infinity;
      state.screamIn = s.scream > 0 ? randomBetween(s.scream * 0.5, s.scream) * pace : Infinity;
    }

    /* Stored at full strength; the reduced-motion damping happens at render. */
    function addShake(amount) {
      state.shake = Math.min(1, state.shake + amount);
    }

    function setRage(fraction) {
      state.rage = fraction;
      var next = 0;
      for (var i = 0; i < STAGES.length; i += 1) {
        if (fraction >= STAGES[i].at) next = i;
      }
      if (next === state.stage) return;
      var rising = next > state.stage;
      state.stage = next;
      if (next >= 4) state.armed = true;
      scheduleAll();
      addShake(rising ? 0.6 : 0.25);
      trace('stage', { stage: stage().key, rage: Math.round(fraction * 100), rising: rising });
      if (handlers.onStage) handlers.onStage(stage().key, rising);
    }

    /* Beams aim where the paddle is when charging starts, so standing still loses. */
    function spawnBeam(env) {
      var blocks = state.stage >= 4 ? (Math.random() < 0.4 ? 4 : 3) : 2;
      var width = blocks * env.paddle.blockWidth;
      var centre = env.paddle.x + env.paddle.width / 2;
      var jitter = randomBetween(-env.paddle.width * 0.4, env.paddle.width * 0.4);
      var x = Math.max(0, Math.min(env.view.width - width, centre + jitter - width / 2));
      beams.push({
        x: x,
        width: width,
        blocks: blocks,
        charge: 0,
        chargeTime: state.stage >= 4 ? CHARGE_TIME_DYING : CHARGE_TIME,
        flash: 0,
        fired: false
      });
      trace('beam.charge', { blocks: blocks, x: Math.round(x) });
      if (handlers.onBeamCharge) handlers.onBeamCharge(state.stage >= 4 ? CHARGE_TIME_DYING : CHARGE_TIME);
    }

    /* Projectiles fall from a brick that's still alive, so the wall spits at you. */
    function spawnProjectile(env) {
      var wall = env.wall;
      if (!wall || wall.live === 0) return;
      var choices = [];
      for (var col = 0; col < wall.cols; col += 1) {
        for (var row = wall.rows - 1; row >= 0; row -= 1) {
          if (wall.cells[row * wall.cols + col]) { choices.push({ col: col, row: row }); break; }
        }
      }
      if (choices.length === 0) return;
      var pick = choices[Math.floor(Math.random() * choices.length)];
      projectiles.push({
        x: env.layout.originX + (pick.col + 0.5) * env.layout.cell,
        y: env.layout.originY + (pick.row + 1) * env.layout.cell,
        size: Math.max(4, env.layout.cell * 0.5),
        speed: env.view.height * PROJECTILE_SPEED
      });
      trace('projectile', { col: pick.col, row: pick.row });
      if (handlers.onProjectile) handlers.onProjectile();
    }

    function hitsPaddle(box, paddle) {
      return box.right > paddle.x && box.left < paddle.x + paddle.width &&
             box.bottom > paddle.y && box.top < paddle.y + paddle.height;
    }

    function update(delta, env) {
      /* Rage reads the wall's current state, not the running score, so bricks
         growing back walk the aggression meter down on their own. */
      var total = env.wall ? env.wall.total : 0;
      if (total > 0) setRage((total - env.wall.live) / total);

      if (state.armed) {
        state.sinceDamage += delta;
        if (state.sinceDamage >= HEAL_DELAY && env.wall && env.wall.live < total) {
          state.healIn -= delta;
          if (state.healIn <= 0) {
            state.healIn = HEAL_INTERVAL * state.pace;
            var first = !state.healing;
            state.healing = true;
            if (handlers.onHeal) handlers.onHeal(first);

            state.healCount += 1;
            if (state.healCount >= HEAL_SOFTEN_EVERY) {
              state.healCount = 0;
              if (state.hardness > 1) {
                state.hardness -= 1;
                /* Put the hardening pass back to full delay as well, or the
                   next one fires straight into the layer just given up. */
                state.hardenIn = HARDEN_EVERY * state.pace;
                trace('heal.soften', { hardness: state.hardness });
                if (handlers.onSoften) handlers.onSoften(state.hardness);
              }
            }
          }
        }
      }

      state.clock += delta;
      state.shake = Math.max(0, state.shake - SHAKE_DECAY * delta * state.shake - 0.01 * delta);

      var s = stage();

      if (s.scream > 0) {
        state.screamIn -= delta;
        if (state.screamIn <= 0) {
          state.screamIn = randomBetween(s.scream * 0.6, s.scream * 1.4) * state.pace;
          addShake(state.stage >= 3 ? 0.9 : 0.45);
          trace('scream', { stage: s.key });
          if (handlers.onScream) handlers.onScream();
        }
      }

      /*
       * No new attacks at a player who can't play yet: a held serve means they
       * just lost a ball and are regrouping. The timers hold rather than run
       * down, so serving doesn't release a volley that queued up while waiting.
       * Healing and hardening carry on regardless, so waiting still costs.
       */
      if (!env.held) {
        if (s.projectile > 0) {
          state.projectileIn -= delta;
          if (state.projectileIn <= 0) {
            state.projectileIn = randomBetween(s.projectile * 0.6, s.projectile * 1.3) * state.pace;
            spawnProjectile(env);
          }
        }

        if (s.beam > 0) {
          state.beamIn -= delta;
          if (state.beamIn <= 0) {
            state.beamIn = randomBetween(s.beam * 0.7, s.beam * 1.3) * state.pace;
            spawnBeam(env);
          }
        }
      }

      /* Hardening only bites once the wall is awake, and stops entirely while
         it's knitting itself back together: a wall that's calming down and
         re-armouring at the same time reads as two different moods at once.
         The timer holds rather than running down, so landing a hit doesn't
         release a hardening pass that queued up during the lull. */
      if (state.stage >= 2 && !state.healing) {
        state.hardenIn -= delta;
        if (state.hardenIn <= 0) {
          state.hardenIn = HARDEN_EVERY * state.pace;
          if (state.hardness < MAX_HARDNESS) {
            state.hardness += 1;
            trace('harden', { hardness: state.hardness });
            if (handlers.onHarden) handlers.onHarden(state.hardness);
          }
        }
      }

      var i;
      for (i = projectiles.length - 1; i >= 0; i -= 1) {
        var p = projectiles[i];
        p.y += p.speed * delta;
        var half = p.size / 2;
        if (hitsPaddle({ left: p.x - half, right: p.x + half, top: p.y - half, bottom: p.y + half }, env.paddle)) {
          projectiles.splice(i, 1);
          addShake(0.35);
          if (handlers.onPaddleHit) handlers.onPaddleHit(1, 'projectile');
        } else if (p.y - half > env.view.height) {
          projectiles.splice(i, 1);
        }
      }

      for (i = beams.length - 1; i >= 0; i -= 1) {
        var b = beams[i];
        if (!b.fired) {
          b.charge += delta;
          if (b.charge >= b.chargeTime) {
            b.fired = true;
            b.flash = BEAM_FLASH;
            addShake(0.7);
            trace('beam.fire', { blocks: b.blocks });
            if (handlers.onBeamFire) handlers.onBeamFire();
            var overlaps = b.x < env.paddle.x + env.paddle.width && b.x + b.width > env.paddle.x;
            if (overlaps && handlers.onPaddleHit) handlers.onPaddleHit(b.blocks, 'beam');
          }
        } else {
          b.flash -= delta;
          if (b.flash <= 0) beams.splice(i, 1);
        }
      }
    }

    function draw(ctx, env) {
      var i;

      for (i = 0; i < beams.length; i += 1) {
        var b = beams[i];
        if (!b.fired) {
          /* Telegraph: a column that brightens as the shot gets closer. */
          var progress = b.charge / b.chargeTime;
          ctx.fillStyle = 'rgba(255, 74, 26, ' + (0.14 + progress * 0.34).toFixed(3) + ')';
          ctx.fillRect(b.x, 0, b.width, env.view.height);
          /* Edges and a thickening cap, so the column reads even in daylight. */
          ctx.fillStyle = 'rgba(255, 236, 236, ' + (0.35 + progress * 0.5).toFixed(3) + ')';
          ctx.fillRect(b.x, 0, 1.5, env.view.height);
          ctx.fillRect(b.x + b.width - 1.5, 0, 1.5, env.view.height);
          ctx.fillRect(b.x, 0, b.width, 4 + progress * 10);
        } else {
          var fade = Math.max(0, b.flash / BEAM_FLASH);
          ctx.fillStyle = 'rgba(255, 236, 236, ' + (fade * 0.9).toFixed(3) + ')';
          ctx.fillRect(b.x, 0, b.width, env.view.height);
        }
      }

      ctx.fillStyle = stage().brick;
      for (i = 0; i < projectiles.length; i += 1) {
        var p = projectiles[i];
        var half = p.size / 2;
        ctx.fillRect(Math.round(p.x - half), Math.round(p.y - half), Math.round(p.size), Math.round(p.size));
      }
    }

    return {
      reset: reset,
      update: update,
      draw: draw,

      /* Any hit interrupts healing and restarts the clock on it. */
      registerDamage: function () {
        state.sinceDamage = 0;
        state.healing = false;
        state.healIn = HEAL_INTERVAL * state.pace;
        state.healCount = 0;
      },

      isHealing: function () { return state.healing; },

      /* A well-aimed ricochet through several bricks softens the wall. */
      registerCombo: function (count) {
        if (count < COMBO_RELEASE || state.hardness <= 1) return false;
        state.hardness -= 1;
        state.hardenIn = HARDEN_EVERY * state.pace;
        trace('combo', { bricks: count, hardness: state.hardness });
        return true;
      },

      /* Live attacks, so a player can read what's incoming from the console. */
      attacks: function () {
        return {
          beams: beams.map(function (b) {
            return { x: b.x, width: b.width, blocks: b.blocks, charge: b.charge, chargeTime: b.chargeTime, fired: b.fired };
          }),
          projectiles: projectiles.map(function (p) {
            return { x: p.x, y: p.y, size: p.size };
          })
        };
      },

      hardness: function () { return state.hardness; },
      rage: function () { return state.rage; },
      stageKey: function () { return stage().key; },
      colours: function () { return { brick: stage().brick, edge: stage().edge }; },

      /*
       * Shake only moves the drawing, never the ball or paddle positions the
       * physics uses, so it disorients without taking control away.
       */
      shakeOffset: function () {
        var dying = state.stage >= 4;
        var amount = state.shake + (dying ? DYING_TREMOR : 0);
        if (reducedMotion) amount *= 0.2;
        if (amount <= 0.001) return null;
        var magnitude = amount * (dying ? SHAKE_PIXELS_DYING : SHAKE_PIXELS);
        return {
          x: (Math.random() * 2 - 1) * magnitude,
          y: (Math.random() * 2 - 1) * magnitude
        };
      },

      /* The wall blinks like a failing light once it's dying. */
      wallAlpha: function () {
        if (state.stage < 4 || reducedMotion) return 1;
        var phase = (state.clock % BLINK_PERIOD) / BLINK_PERIOD;
        return phase < BLINK_DUTY ? 1 : BLINK_LOW;
      },

      clearAttacks: function () {
        projectiles.length = 0;
        beams.length = 0;
      }
    };
  };
})(window);
