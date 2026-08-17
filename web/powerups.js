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

  /* Weights are relative, not percentages. */
  var KINDS = [
    { key: 'plate',  glyph: 'P', weight: 4, label: 'PLATING' },
    { key: 'wide',   glyph: 'W', weight: 4, label: 'WIDER PADDLE' },
    { key: 'ball',   glyph: 'B', weight: 3, label: 'EXTRA BALL' },
    { key: 'life',   glyph: 'L', weight: 1, label: 'EXTRA LIFE' }
  ];

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

    return {
      reset: function () { tokens.length = 0; },

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
          ctx.fillStyle = '#0D0D0D';
          ctx.fillRect(left, top, size, size);
          ctx.strokeStyle = '#39FF14';
          ctx.lineWidth = 2;
          ctx.strokeRect(left + 1, top + 1, size - 2, size - 2);
          ctx.fillStyle = '#39FF14';
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
