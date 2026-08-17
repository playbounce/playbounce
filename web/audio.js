/*
 * Synthesised sound. No audio files, so the payload stays near zero and there's
 * nothing to fetch at run time.
 *
 * Browsers refuse to start an AudioContext without a user gesture, so unlock()
 * runs from the Play button.
 */
(function (global) {
  'use strict';

  var PB = global.PB;
  var trace = PB.trace;

  var MASTER_GAIN = 0.32;

  PB.createAudio = function createAudio() {
    var ctx = null;
    var master = null;
    var noise = null;
    var muted = false;

    function ready() {
      return ctx !== null && ctx.state === 'running' && !muted;
    }

    function buildNoise() {
      var length = Math.floor(ctx.sampleRate * 0.5);
      var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      return buffer;
    }

    /* One oscillator with an attack-decay envelope. */
    function tone(type, from, to, duration, gain, delay) {
      if (!ready()) return;
      var start = ctx.currentTime + (delay || 0);
      var osc = ctx.createOscillator();
      var amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, start);
      if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
      amp.gain.setValueAtTime(0.0001, start);
      amp.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.012, duration / 4));
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(amp);
      amp.connect(master);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    function hiss(duration, gain, filterFrom, filterTo) {
      if (!ready()) return;
      var start = ctx.currentTime;
      var source = ctx.createBufferSource();
      var amp = ctx.createGain();
      var filter = ctx.createBiquadFilter();
      source.buffer = noise;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFrom, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), start + duration);
      amp.gain.setValueAtTime(gain, start);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      source.connect(filter);
      filter.connect(amp);
      amp.connect(master);
      source.start(start);
      source.stop(start + duration);
    }

    var sounds = {
      /* Brick pitch climbs with the wall's rage, so the room gets tenser. */
      brick: function (rage) {
        tone('square', 320 + (rage || 0) * 620, 220 + (rage || 0) * 400, 0.05, 0.22);
      },
      hard: function () { tone('square', 180, 150, 0.07, 0.18); },
      paddle: function () { tone('triangle', 200, 150, 0.08, 0.3); },
      wall: function () { tone('square', 150, 130, 0.04, 0.16); },
      launch: function () { tone('square', 400, 700, 0.1, 0.2); },
      charge: function (duration) { tone('sawtooth', 90, 780, duration, 0.14); },
      beam: function () {
        hiss(0.3, 0.5, 5200, 200);
        tone('sawtooth', 620, 70, 0.3, 0.26);
      },
      scream: function () {
        tone('sawtooth', 260, 70, 0.65, 0.24);
        tone('sawtooth', 253, 66, 0.65, 0.2);
        hiss(0.5, 0.28, 1800, 260);
      },
      damage: function () {
        tone('square', 110, 55, 0.32, 0.34);
        hiss(0.22, 0.3, 900, 160);
      },
      powerup: function () {
        tone('square', 520, 520, 0.07, 0.2, 0);
        tone('square', 660, 660, 0.07, 0.2, 0.07);
        tone('square', 880, 880, 0.12, 0.2, 0.14);
      },
      /* Rising and soft: the wall knitting itself back together. */
      heal: function () {
        tone('sine', 300, 520, 0.16, 0.16);
        tone('sine', 450, 780, 0.16, 0.1, 0.06);
      },
      life: function () { tone('sawtooth', 420, 80, 0.5, 0.3); },
      dead: function () {
        tone('sawtooth', 220, 40, 0.9, 0.34);
        hiss(0.7, 0.3, 1200, 100);
      },
      win: function () {
        tone('square', 440, 440, 0.1, 0.22, 0);
        tone('square', 587, 587, 0.1, 0.22, 0.1);
        tone('square', 880, 880, 0.28, 0.24, 0.2);
      }
    };

    return {
      /* Called from the first user gesture, where the browser allows audio to start. */
      unlock: function () {
        if (ctx) {
          if (ctx.state === 'suspended') ctx.resume();
          return;
        }
        var Ctor = global.AudioContext || global.webkitAudioContext;
        if (!Ctor) {
          trace('audio', { available: false });
          return;
        }
        ctx = new Ctor();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : MASTER_GAIN;
        master.connect(ctx.destination);
        noise = buildNoise();
        trace('audio', { available: true, state: ctx.state });
      },

      play: function (name, param) {
        var sound = sounds[name];
        if (sound) sound(param);
      },

      setMuted: function (value) {
        muted = !!value;
        if (master) master.gain.value = muted ? 0 : MASTER_GAIN;
        trace('mute', { muted: muted });
      },

      isMuted: function () { return muted; }
    };
  };
})(window);
