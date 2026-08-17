/*
 * Bounded, always-on decision log.
 *
 * Browser code branches on events nobody controls (pointer, resize, visibility),
 * so every branch records what it decided as it decides it. Read the buffer from
 * the console with playbounce.debug(), playbounce.debug('life'), or
 * playbounce.debug.table().
 */
(function (global) {
  'use strict';

  var CAPACITY = 256;
  var buffer = new Array(CAPACITY);
  var written = 0;

  /* Pushing onto a capped array costs nothing, so this is never gated behind a flag. */
  function trace(kind, fields) {
    var record = { at: Math.round(performance.now()), kind: kind };
    if (fields) {
      for (var key in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, key)) record[key] = fields[key];
      }
    }
    buffer[written % CAPACITY] = record;
    written += 1;
  }

  function read(kind) {
    var start = written > CAPACITY ? written - CAPACITY : 0;
    var out = [];
    for (var i = start; i < written; i += 1) {
      var record = buffer[i % CAPACITY];
      if (!kind || record.kind === kind) out.push(record);
    }
    return out;
  }

  var debug = function (kind) { return read(kind); };
  debug.table = function (kind) { console.table(read(kind)); };
  debug.reset = function () { written = 0; };

  var PB = global.PB = global.PB || {};
  PB.trace = trace;

  /*
   * The same game ships from three places: a checkout, a local server, and an
   * installed pip package. They look identical on screen, so a player checking
   * whether a change is live has no way to tell which copy they opened. This is
   * the answer to that, readable as playbounce.version and recorded in the
   * ready line of every session. Kept in step with python/pyproject.toml by CI.
   */
  var VERSION = '1.1.0';

  global.playbounce = { debug: debug, version: VERSION };
  PB.version = VERSION;
})(window);
