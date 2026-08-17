/*
 * Screens, settings, keyboard handling, and the wiring between the DOM, the
 * game engine, the wall's voice, and the sound.
 *
 * Keys: Space is the action key (start, launch, pause, resume, play again),
 * Escape backs out a level, arrows navigate the menu and move the paddle, and
 * Enter only commits text that's being typed.
 */
(function (global) {
  'use strict';

  var PB = global.PB;
  var trace = PB.trace;
  var doc = global.document;

  var TAUNT_MS = 2600;

  var el = {
    body: doc.body,
    stage: doc.getElementById('stage'),
    taunt: doc.getElementById('taunt'),
    tauntText: doc.getElementById('taunt-text'),
    score: doc.getElementById('hud-score'),
    lives: doc.getElementById('hud-lives'),
    time: doc.getElementById('hud-time'),
    pause: doc.getElementById('pause-button'),
    idleTaunt: doc.getElementById('idle-taunt'),
    name: doc.getElementById('name-input'),
    modeOptions: doc.getElementById('mode-options'),
    modeHint: doc.getElementById('mode-hint'),
    speedOptions: doc.getElementById('speed-options'),
    livesOptions: doc.getElementById('lives-options'),
    limitOptions: doc.getElementById('limit-options'),
    soundOptions: doc.getElementById('sound-options'),
    play: doc.getElementById('play-button'),
    startError: doc.getElementById('start-error'),
    pausedScore: doc.getElementById('paused-score'),
    pausedTime: doc.getElementById('paused-time'),
    resume: doc.getElementById('resume-button'),
    pausedChange: doc.getElementById('paused-change-button'),
    overTitle: doc.getElementById('over-title'),
    overTaunt: doc.getElementById('over-taunt'),
    overDetail: doc.getElementById('over-detail'),
    overScore: doc.getElementById('over-score'),
    overTime: doc.getElementById('over-time'),
    again: doc.getElementById('again-button'),
    overChange: doc.getElementById('over-change-button')
  };

  var settings = { name: '', mode: 'torment', speed: 'normal', lives: 3, limit: 0, sound: true };
  var audio = PB.createAudio();
  var tauntTimer = 0;
  var resizePending = false;
  var audioUnlocked = false;

  var MODE_HINTS = {
    torment: 'THE WALL WAKES UP AND FIGHTS BACK',
    classic: 'JUST BRICKS. NOTHING FIGHTS BACK.'
  };

  var END_TITLES = {
    cleared: 'WALL CLEARED',
    timeout: 'TIME UP',
    crushed: 'PADDLE DESTROYED',
    over: 'GAME OVER'
  };

  var END_SOUNDS = { cleared: 'win', timeout: 'dead', crushed: 'dead', over: 'dead' };
  var END_TAUNTS = { cleared: 'cleared', timeout: 'timeout', crushed: 'crushed', over: 'over' };

  function pad(value, width) {
    var text = String(value);
    while (text.length < width) text = '0' + text;
    return text;
  }

  function clock(seconds) {
    var whole = Math.max(0, Math.floor(seconds));
    return pad(Math.floor(whole / 60), 2) + ':' + pad(whole % 60, 2);
  }

  function screen() { return el.body.getAttribute('data-screen'); }

  function setScreen(name) {
    el.body.setAttribute('data-screen', name);
    trace('screen', { name: name });
  }

  /* Browsers only start audio from a user gesture, so take the first one. */
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.unlock();
    audio.setMuted(!settings.sound);
  }

  function banner(text) {
    if (!text) return;
    el.tauntText.textContent = text;
    el.taunt.classList.add('show');
    global.clearTimeout(tauntTimer);
    tauntTimer = global.setTimeout(function () {
      el.taunt.classList.remove('show');
    }, TAUNT_MS);
  }

  function showTaunt(kind) {
    banner(PB.taunts.pick(kind));
  }

  function hideTaunt() {
    global.clearTimeout(tauntTimer);
    el.taunt.classList.remove('show');
  }

  /* ---- game events ------------------------------------------------------ */

  /* Every engine event lands here, which keeps sound and voice out of the engine. */
  var EVENTS = {
    brick: function (detail) { audio.play('brick', detail.rage); },
    hard: function () { audio.play('hard'); },
    paddle: function () { audio.play('paddle'); },
    wall: function () { audio.play('wall'); },
    launch: function () { audio.play('launch'); },
    scream: function () { audio.play('scream'); },
    projectile: function () { audio.play('hard'); },
    beamCharge: function (detail) { audio.play('charge', detail.time); },
    beamFire: function () { audio.play('beam'); },
    harden: function () { audio.play('hard'); },
    plating: function () { audio.play('hard'); },
    /*
     * A stage change on the way down is the wall recovering, so it gloats and
     * chimes rather than screaming a threat it can't back up yet.
     */
    stage: function (detail) {
      if (detail.rising) {
        audio.play('scream');
        showTaunt(detail.stage);
      } else {
        audio.play('heal');
        showTaunt('heal');
      }
    },
    damage: function () {
      audio.play('damage');
      showTaunt('damage');
    },
    powerup: function (detail) {
      audio.play('powerup');
      banner('+ ' + detail.label);
    },
    combo: function () {
      audio.play('powerup');
      showTaunt('combo');
    },
    /* Only the first brick of a healing run gets a line, or it would never stop talking. */
    heal: function (detail) {
      audio.play('heal');
      if (detail.first) showTaunt('heal');
    },
    life: function () {
      audio.play('life');
      showTaunt('life');
    }
  };

  var game = PB.createGame(el.stage, {
    onScore: function (destroyed) {
      el.score.textContent = pad(destroyed, 4);
    },
    onLives: function (lives) {
      el.lives.textContent = lives === Infinity ? '∞' : String(lives);
    },
    /* With a limit set the readout counts down, otherwise it counts up. */
    onTime: function (elapsed, limit) {
      el.time.textContent = limit > 0 ? clock(Math.ceil(limit - elapsed)) : clock(elapsed);
    },
    onEvent: function (kind, detail) {
      var handler = EVENTS[kind];
      if (handler) handler(detail);
    },
    /* Park the banner in the clear space below the wall, never over it. */
    onLayout: function (box) {
      el.taunt.style.top = box.bannerY + 'px';
    },
    onEnd: function (result, destroyed, elapsed) {
      hideTaunt();
      audio.play(END_SOUNDS[result] || 'dead');
      el.overTitle.textContent = END_TITLES[result] || END_TITLES.over;
      el.overTaunt.textContent = PB.taunts.pick(END_TAUNTS[result] || 'over');
      el.overDetail.textContent = 'NAME: ' + settings.name;
      el.overScore.textContent = pad(destroyed, 4);
      el.overTime.textContent = clock(elapsed);
      setScreen('over');
      el.again.focus();
    }
  });

  /* ---- option groups ---------------------------------------------------- */

  /* Each group keeps one tabbable button, so arrow keys drive it like a radio set. */
  function makeGroup(container, attribute, apply) {
    var options = Array.prototype.slice.call(container.querySelectorAll('.opt'));

    function select(button, quiet) {
      for (var i = 0; i < options.length; i += 1) {
        var on = options[i] === button;
        options[i].setAttribute('aria-checked', on ? 'true' : 'false');
        options[i].tabIndex = on ? 0 : -1;
      }
      apply(button.getAttribute(attribute));
      if (!quiet) {
        audio.play('wall');
        trace('setting', { group: attribute, value: button.getAttribute(attribute) });
      }
    }

    container.addEventListener('click', function (event) {
      var button = event.target.closest('.opt');
      if (!button || !container.contains(button)) return;
      select(button, false);
      button.focus();
    });

    var current = container.querySelector('[aria-checked="true"]') || options[0];
    select(current, true);

    return {
      container: container,
      options: options,
      step: function (direction) {
        var index = options.indexOf(container.querySelector('[aria-checked="true"]'));
        if (index < 0) index = 0;
        var next = (index + direction + options.length) % options.length;
        select(options[next], false);
        options[next].focus();
      },
      focus: function () {
        var checked = container.querySelector('[aria-checked="true"]') || options[0];
        checked.focus();
      }
    };
  }

  var groups = [
    makeGroup(el.modeOptions, 'data-mode', function (value) {
      settings.mode = value;
      el.modeHint.textContent = MODE_HINTS[value] || '';
    }),
    makeGroup(el.speedOptions, 'data-speed', function (value) { settings.speed = value; }),
    makeGroup(el.livesOptions, 'data-lives', function (value) {
      settings.lives = value === 'unlimited' ? Infinity : parseInt(value, 10);
    }),
    makeGroup(el.limitOptions, 'data-limit', function (value) { settings.limit = parseInt(value, 10); }),
    makeGroup(el.soundOptions, 'data-sound', function (value) {
      settings.sound = value === 'on';
      audio.setMuted(!settings.sound);
    })
  ];

  /* Rows the up and down arrows walk through on the menu. */
  var rows = [{ focus: function () { el.name.focus(); }, container: el.name }]
    .concat(groups)
    .concat([{ focus: function () { el.play.focus(); }, container: el.play }]);

  function rowIndexOfActive() {
    var active = doc.activeElement;
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].container === active || rows[i].container.contains(active)) return i;
    }
    return -1;
  }

  function moveRow(direction) {
    var index = rowIndexOfActive();
    if (index < 0) index = direction > 0 ? -1 : rows.length;
    var next = (index + direction + rows.length) % rows.length;
    rows[next].focus();
  }

  function groupOfActive() {
    var active = doc.activeElement;
    for (var i = 0; i < groups.length; i += 1) {
      if (groups[i].container.contains(active)) return groups[i];
    }
    return null;
  }

  /* ---- start screen ------------------------------------------------------ */

  el.name.addEventListener('input', function () {
    var cleaned = PB.bricks.cleanName(el.name.value);
    if (cleaned !== el.name.value) el.name.value = cleaned;
    if (cleaned) el.startError.textContent = '';
  });

  /*
   * Space can reach these two through the key handler and, when a button holds
   * focus, through that button's own activation as well. Gating on the current
   * screen makes a second call a no-op rather than a second game.
   */
  function startGame() {
    if (screen() !== 'start') return;
    var name = PB.bricks.cleanName(el.name.value);
    if (!name) {
      el.startError.textContent = '> NAME NEEDED. TYPE ONE ABOVE.';
      el.name.focus();
      trace('reject', { reason: 'empty name' });
      return;
    }
    unlockAudio();
    el.startError.textContent = '';
    settings.name = name;
    el.name.blur();
    setScreen('playing');
    game.start(settings);
    if (settings.mode === 'torment') showTaunt('start');
  }

  el.play.addEventListener('click', startGame);

  /* ---- pause, resume, restart -------------------------------------------- */

  function pauseGame() {
    if (!game.pause()) return;
    hideTaunt();
    el.pausedScore.textContent = el.score.textContent;
    el.pausedTime.textContent = clock(game.snapshot().elapsed);
    setScreen('paused');
    el.resume.focus();
  }

  function resumeGame() {
    if (!game.resume()) return;
    setScreen('playing');
    blurActive();
  }

  function playAgain() {
    if (screen() !== 'over') return;
    unlockAudio();
    setScreen('playing');
    blurActive();
    game.start(settings);
    if (settings.mode === 'torment') showTaunt('start');
  }

  /* A different stranger each visit, already typed in so Play works instantly. */
  function rotateName() {
    el.name.value = PB.names.random();
    el.startError.textContent = '';
  }

  function backToStart() {
    game.stop();
    hideTaunt();
    rotateName();
    el.idleTaunt.textContent = PB.taunts.pick('idle');
    setScreen('start');
    /* Focus stays off the name field so Space starts the next game straight away. */
    blurActive();
  }

  /* Keeps Space from re-triggering whichever button was clicked last. */
  function blurActive() {
    if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur();
  }

  el.pause.addEventListener('click', function () { pauseGame(); });
  el.resume.addEventListener('click', resumeGame);
  el.again.addEventListener('click', playAgain);
  el.pausedChange.addEventListener('click', backToStart);
  el.overChange.addEventListener('click', backToStart);

  /* ---- keyboard ----------------------------------------------------------- */

  /* Space is the one action key: launch a held ball, otherwise pause. */
  function spaceInPlay() {
    if (game.snapshot().held) game.launch();
    else pauseGame();
  }

  /* Enter exists only to commit typed text, so it hands focus back afterwards. */
  function commitName() {
    var cleaned = PB.bricks.cleanName(el.name.value);
    if (!cleaned) {
      el.startError.textContent = '> NAME NEEDED. TYPE ONE ABOVE.';
      return;
    }
    el.startError.textContent = '';
    el.name.blur();
  }

  doc.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var where = screen();
    var typing = doc.activeElement === el.name;
    var key = event.key;

    if (key === 'Enter') {
      if (typing) { event.preventDefault(); commitName(); }
      return;
    }

    /* Back out one level at a time, ending at the menu. */
    if (key === 'Escape') {
      event.preventDefault();
      if (typing) el.name.blur();
      else if (where === 'playing') pauseGame();
      else if (where === 'paused' || where === 'over') backToStart();
      return;
    }

    if (key === ' ' || key === 'Spacebar') {
      if (typing) return; /* a space belongs in the field being typed into */
      event.preventDefault();
      if (where === 'start') startGame();
      else if (where === 'playing') spaceInPlay();
      else if (where === 'paused') resumeGame();
      else if (where === 'over') playAgain();
      return;
    }

    if (where === 'start') {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        moveRow(key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        if (typing) return; /* let the caret move instead */
        var group = groupOfActive();
        if (!group) return;
        event.preventDefault();
        group.step(key === 'ArrowRight' ? 1 : -1);
      }
      return;
    }

    if (where === 'playing') {
      if (key === 'ArrowLeft') { event.preventDefault(); game.setKey('left', true); }
      else if (key === 'ArrowRight') { event.preventDefault(); game.setKey('right', true); }
    }
  });

  doc.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowLeft') game.setKey('left', false);
    else if (event.key === 'ArrowRight') game.setKey('right', false);
  });

  doc.addEventListener('pointerdown', unlockAudio, { once: true });
  doc.addEventListener('keydown', unlockAudio, { once: true });

  /* A tab switch or a locked screen pauses rather than running on unseen. */
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden && game.isRunning()) {
      trace('hidden', {});
      pauseGame();
    }
  });

  /* ---- viewport ----------------------------------------------------------- */

  function onResize() {
    if (resizePending) return;
    resizePending = true;
    global.requestAnimationFrame(function () {
      resizePending = false;
      game.resize();
    });
  }

  global.addEventListener('resize', onResize);
  global.addEventListener('orientationchange', onResize);

  /* Console handles: playbounce.debug() for the event log, playbounce.state() for now. */
  global.playbounce.state = game.snapshot;

  /* Focusing selects the whole name, so typing replaces it in one go. */
  el.name.addEventListener('focus', function () { el.name.select(); });
  el.name.addEventListener('click', function () { el.name.select(); });

  rotateName();
  el.idleTaunt.textContent = PB.taunts.pick('idle');
  game.resize();
  trace('ready', { width: global.innerWidth, height: global.innerHeight });
})(window);
