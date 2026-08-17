/*
 * Headless balance harness.
 *
 * Loads the browser modules against a stubbed canvas and plays whole games with
 * no rendering, so hundreds of runs finish in seconds. Use it to check tuning
 * changes against outcome distributions rather than against one lucky run.
 *
 *   node tools/simulate.js                       100 runs, default settings
 *   node tools/simulate.js --runs 300 --name SAMANTHA --skill 0.8
 *   node tools/simulate.js --mode classic --lives 5
 */
'use strict';

var fs = require('fs');
var path = require('path');

var WEB = path.join(__dirname, '..', 'web');
var MODULES = ['trace.js', 'bricks.js', 'powerups.js', 'beast.js', 'game.js'];

function noop() {}

/* Enough of a 2D context for the drawing calls to land somewhere harmless. */
function stubContext() {
  return {
    setTransform: noop, translate: noop, save: noop, restore: noop,
    fillRect: noop, clearRect: noop, strokeRect: noop, drawImage: noop,
    beginPath: noop, arc: noop, fill: noop, stroke: noop, fillText: noop,
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: ''
  };
}

function stubCanvas(width, height) {
  return {
    width: width, height: height, clientWidth: width, clientHeight: height,
    getContext: stubContext,
    addEventListener: noop, removeEventListener: noop,
    setPointerCapture: noop, releasePointerCapture: noop,
    hasPointerCapture: function () { return false; },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: width, height: height }; }
  };
}

function makeWindow(width, height) {
  var pending = null;
  var win = {
    devicePixelRatio: 1,
    requestAnimationFrame: function (fn) { pending = fn; return 1; },
    cancelAnimationFrame: function () { pending = null; },
    matchMedia: function () { return { matches: false }; },
    addEventListener: noop,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    console: { table: noop, log: noop }
  };
  win.window = win;
  win.document = {
    createElement: function () { return stubCanvas(width, height); },
    addEventListener: noop
  };
  win.performance = { now: function () { return Date.now(); } };
  win.takeFrame = function () { var fn = pending; pending = null; return fn; };
  return win;
}

function loadEngine(width, height) {
  var win = makeWindow(width, height);
  MODULES.forEach(function (file) {
    var source = fs.readFileSync(path.join(WEB, file), 'utf8');
    /* Each module is an IIFE taking the global, so hand it the stub window. */
    var factory = new Function('window', 'document', 'performance', 'console', source);
    factory(win, win.document, win.performance, win.console);
  });
  return win;
}

/*
 * A simulated player. `skill` from 0 to 1 sets how well they track the ball and
 * whether they read a charging beam and step out of it.
 */
function playOnce(options) {
  var width = options.width || 375;
  var height = options.height || 812;
  var win = loadEngine(width, height);
  var canvas = stubCanvas(width, height);

  var ended = null;
  var tally = { damage: 0, blocksLost: 0, powerup: 0, combo: 0, harden: 0, beamFire: 0, projectile: 0 };
  var game = win.PB.createGame(canvas, {
    onEvent: function (kind, detail) {
      if (kind === 'damage') { tally.damage += 1; tally.blocksLost += detail.blocks || 0; }
      else if (kind === 'powerup') tally.powerup += 1;
      else if (kind === 'combo') tally.combo += 1;
      else if (kind === 'harden') tally.harden += 1;
      else if (kind === 'beamFire') tally.beamFire += 1;
      else if (kind === 'projectile') tally.projectile += 1;
    },
    onEnd: function (result, destroyed, elapsed) {
      ended = { result: result, destroyed: destroyed, elapsed: elapsed };
    }
  });

  game.start({
    name: options.name, mode: options.mode, speed: options.speed,
    lives: options.lives, limit: options.limit
  });

  var skill = options.skill;
  var frames = 0;
  var maxFrames = 60 * (options.maxSeconds || 600);
  var step = 1 / 60;
  var damageTaken = 0;
  var caught = 0;
  var dropped = 0;

  while (frames < maxFrames && !ended) {
    var fn = win.takeFrame();
    if (!fn) break;

    var state = game.snapshot();
    if (state.phase !== 'running') break;

    if (state.held) {
      game.launch();
    } else if (state.balls.length > 0) {
      var ball = state.balls[0];
      var target = ball.x + Math.sin(frames / 37) * 0.45 * state.paddle.width;

      /* A skilled player reads the telegraph and steps out of the column. */
      if (skill > 0.5) {
        var beams = state.attacks.beams;
        for (var i = 0; i < beams.length; i += 1) {
          var beam = beams[i];
          if (beam.fired) continue;
          var overlaps = beam.x < target + state.paddle.width / 2 &&
                         beam.x + beam.width > target - state.paddle.width / 2;
          if (overlaps) {
            target = beam.x > width / 2
              ? beam.x - state.paddle.width
              : beam.x + beam.width + state.paddle.width;
          }
        }
      }

      /* Imperfect tracking: a weaker player lags behind the ball. */
      var current = state.paddle.x + state.paddle.width / 2;
      var follow = 0.25 + skill * 0.75;
      var next = current + (target - current) * follow;
      game.aimAt(next);
    }

    fn(frames * 16.7);
    frames += 1;
  }

  var final = game.snapshot();
  return {
    result: ended ? ended.result : 'timeout-harness',
    destroyed: final.destroyed,
    total: final.wall ? final.wall.total : 0,
    seconds: ended ? ended.elapsed : final.elapsed,
    paddleBlocks: final.paddle.blocks,
    hardness: final.beast.hardness,
    stage: final.beast.stage,
    tally: tally
  };
}

function parseArgs(argv) {
  var args = {
    runs: 100, name: 'ISAAC', mode: 'torment', speed: 'normal',
    lives: 3, limit: 0, skill: 0.7, width: 375, height: 812
  };
  for (var i = 2; i < argv.length; i += 2) {
    var key = argv[i].replace(/^--/, '');
    var value = argv[i + 1];
    if (key === 'lives' && value === 'unlimited') args.lives = Infinity;
    else if (['runs', 'lives', 'limit', 'width', 'height'].indexOf(key) >= 0) args[key] = parseInt(value, 10);
    else if (key === 'skill') args.skill = parseFloat(value);
    else args[key] = value;
  }
  return args;
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function main() {
  var args = parseArgs(process.argv);
  var outcomes = {};
  var durations = [];
  var clearedShare = [];
  var totals = { damage: 0, blocksLost: 0, powerup: 0, combo: 0, harden: 0, beamFire: 0, projectile: 0 };

  for (var i = 0; i < args.runs; i += 1) {
    var run = playOnce(args);
    outcomes[run.result] = (outcomes[run.result] || 0) + 1;
    durations.push(run.seconds);
    clearedShare.push(run.total > 0 ? run.destroyed / run.total : 0);
    Object.keys(totals).forEach(function (key) { totals[key] += run.tally[key]; });
  }

  durations.sort(function (a, b) { return a - b; });
  clearedShare.sort(function (a, b) { return a - b; });

  console.log('playbounce balance run');
  console.log('  name=' + args.name + ' mode=' + args.mode + ' speed=' + args.speed +
              ' lives=' + args.lives + ' skill=' + args.skill + ' runs=' + args.runs);
  console.log('');
  console.log('  outcomes');
  Object.keys(outcomes).sort().forEach(function (key) {
    var count = outcomes[key];
    console.log('    ' + key.padEnd(18) + String(count).padStart(4) +
                '  ' + (count / args.runs * 100).toFixed(0) + '%');
  });
  console.log('');
  console.log('  seconds    median ' + percentile(durations, 0.5).toFixed(0) +
              '   p90 ' + percentile(durations, 0.9).toFixed(0) +
              '   max ' + percentile(durations, 1).toFixed(0));
  console.log('  wall clear median ' + (percentile(clearedShare, 0.5) * 100).toFixed(0) + '%' +
              '   p10 ' + (percentile(clearedShare, 0.1) * 100).toFixed(0) + '%');
  console.log('');
  console.log('  per game   beams ' + (totals.beamFire / args.runs).toFixed(1) +
              '   projectiles ' + (totals.projectile / args.runs).toFixed(1) +
              '   hits taken ' + (totals.damage / args.runs).toFixed(1) +
              '   blocks lost ' + (totals.blocksLost / args.runs).toFixed(1));
  console.log('             powerups caught ' + (totals.powerup / args.runs).toFixed(1) +
              '   combos ' + (totals.combo / args.runs).toFixed(1) +
              '   hardenings ' + (totals.harden / args.runs).toFixed(1));
}

if (require.main === module) main();

/* Exported so focused checks can reuse the loader instead of rebuilding it. */
module.exports = { loadEngine: loadEngine, stubCanvas: stubCanvas, playOnce: playOnce };
