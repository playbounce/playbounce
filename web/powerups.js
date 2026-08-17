/*
 * Perks hidden inside bricks. Nothing marks a brick as carrying one, so the
 * player finds out when it breaks and the token starts falling.
 */
(function (global) {
  'use strict';

  var PB = global.PB;
  var trace = PB.trace;

  var DROP_CHANCE = 0.08;
  var FALL_SPEED = 0.30;   /* share of canvas height per second */

  var COLOUR_PERK = '#39FF14';

  /* Weights are relative, not percentages. */
  var KINDS = [
    { key: 'plate',  glyph: 'P', weight: 4, label: 'PLATING' },
    { key: 'wide',   glyph: 'W', weight: 4, label: 'WIDER PADDLE' },
    { key: 'ball',   glyph: 'B', weight: 3, label: 'EXTRA BALL' },
    { key: 'life',   glyph: 'L', weight: 1, label: 'EXTRA LIFE' }
  ];

  /*
   * The ball blast is the one perk no brick carries. It falls out of the sky
   * once the wall is nearly down, which is where a single surviving brick
   * across a wide board stops being a test of aim and starts being a test of
   * patience. Amber and haloed so it never reads as one of the green perks.
   */
  var BLAST = { key: 'blast', glyph: '*', label: 'BALL BLAST', colour: '#FFB000', blast: true };
  var BLAST_AT = 0.10;      /* share of the wall still standing before it starts */
  var BLAST_EVERY = 25;     /* seconds between arrivals */

  var TOTAL_WEIGHT = KINDS.reduce(function (sum, kind) { return sum + kind.weight; }, 0);

  function rollKind() {
    var roll = Math.random() * TOTAL_WEIGHT;
    for (var i = 0; i < KINDS.length; i += 1) {
      roll -= KINDS[i].weight;
      if (roll <= 0) return KINDS[i];
    }
    return KINDS[0];
  }

  PB.createPowerups = function createPowerups(hooks) {
    var handlers = hooks || {};
    var tokens = [];
    var blastIn = BLAST_EVERY;

    return {
      reset: function () { tokens.length = 0; blastIn = BLAST_EVERY; },

      /* Called for every destroyed brick; most of them carry nothing. */
      maybeDrop: function (x, y, env) {
        if (Math.random() > DROP_CHANCE) return;
        var kind = rollKind();
        tokens.push({
          kind: kind,
          x: x,
          y: y,
          size: Math.max(10, env.layout.cell * 1.4),
          speed: env.view.height * FALL_SPEED
        });
        trace('powerup.drop', { kind: kind.key });
      },

      /*
       * The sky drop. Held back until the wall is nearly gone, so it never
       * eases a mid-game, and only while a ball is live, so it can't stack up
       * behind a held serve and arrive as a pile.
       */
      maybeBlast: function (delta, env) {
        var wall = env.wall;
        if (!wall || wall.live === 0 || wall.total === 0) return;
        if (wall.live / wall.total > BLAST_AT) { blastIn = BLAST_EVERY; return; }
        if (env.held) return;

        blastIn -= delta;
        if (blastIn > 0) return;
        blastIn = BLAST_EVERY;

        var size = Math.max(12, env.layout.cell * 1.6);
        tokens.push({
          kind: BLAST,
          x: size + Math.random() * Math.max(1, env.view.width - size * 2),
          y: -size,
          size: size,
          speed: env.view.height * FALL_SPEED
        });
        trace('powerup.drop', { kind: BLAST.key, sky: true });
      },

      update: function (delta, env) {
        for (var i = tokens.length - 1; i >= 0; i -= 1) {
          var token = tokens[i];
          token.y += token.speed * delta;
          var half = token.size / 2;
          var caught = token.x + half > env.paddle.x &&
                       token.x - half < env.paddle.x + env.paddle.width &&
                       token.y + half > env.paddle.y &&
                       token.y - half < env.paddle.y + env.paddle.height;
          if (caught) {
            tokens.splice(i, 1);
            trace('powerup.catch', { kind: token.kind.key });
            if (handlers.onCatch) handlers.onCatch(token.kind);
          } else if (token.y - half > env.view.height) {
            tokens.splice(i, 1);
            trace('powerup.miss', { kind: token.kind.key });
          }
        }
      },

      draw: function (ctx) {
        for (var i = 0; i < tokens.length; i += 1) {
          var token = tokens[i];
          var half = token.size / 2;
          var left = Math.round(token.x - half);
          var top = Math.round(token.y - half);
          var size = Math.round(token.size);
          var colour = token.kind.colour || COLOUR_PERK;

          ctx.save();
          /* The blast carries a halo on top of its own colour, so it stands
             out from the green perks without depending on hue to do it. */
          if (token.kind.blast) {
            ctx.shadowColor = colour;
            ctx.shadowBlur = size * 0.9;
          }
          ctx.fillStyle = '#0D0D0D';
          ctx.fillRect(left, top, size, size);
          ctx.strokeStyle = colour;
          ctx.lineWidth = 2;
          ctx.strokeRect(left + 1, top + 1, size - 2, size - 2);
          ctx.restore();

          ctx.fillStyle = colour;
          ctx.font = Math.round(size * 0.62) + 'px ui-monospace, Menlo, Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(token.kind.glyph, left + size / 2, top + size / 2 + 1);
        }
      },

      count: function () { return tokens.length; }
    };
  };
})(window);
