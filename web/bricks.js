/*
 * Bitmap font and name-to-brick-wall conversion.
 *
 * Every "on" pixel of a glyph becomes one destructible brick. Glyphs are 5 wide
 * by 7 tall with a one-column gap between letters, so an N-character name needs
 * 6N-1 columns and 7 rows.
 */
(function (global) {
  'use strict';

  var PB = global.PB = global.PB || {};

  var GLYPH_W = 5;
  var GLYPH_H = 7;
  var GLYPH_GAP = 1;
  var MAX_NAME = 8;

  /* Written as rows of characters so the shapes stay readable in source. */
  var SHAPES = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
    N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####']
  };

  /* A character with no glyph draws as a solid block rather than vanishing. */
  var UNKNOWN = ['#####', '#####', '#####', '#####', '#####', '#####', '#####'];

  /* Parse once at load, not per wall build. */
  var GLYPHS = {};
  function compile(rows) {
    var bits = new Uint8Array(GLYPH_W * GLYPH_H);
    for (var y = 0; y < GLYPH_H; y += 1) {
      for (var x = 0; x < GLYPH_W; x += 1) {
        bits[y * GLYPH_W + x] = rows[y].charAt(x) === '#' ? 1 : 0;
      }
    }
    return bits;
  }
  for (var letter in SHAPES) {
    if (Object.prototype.hasOwnProperty.call(SHAPES, letter)) {
      GLYPHS[letter] = compile(SHAPES[letter]);
    }
  }
  var UNKNOWN_BITS = compile(UNKNOWN);

  /* Strip anything the font can't draw, uppercase the rest, cap the length. */
  function cleanName(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, MAX_NAME);
  }

  /*
   * Build the brick grid for a name. Cells are a flat Uint8Array indexed
   * row * cols + col: 1 is a live brick, 0 is empty space.
   */
  function buildWall(name) {
    var text = cleanName(name);
    var count = text.length;
    var cols = count > 0 ? count * GLYPH_W + (count - 1) * GLYPH_GAP : 0;
    var rows = GLYPH_H;
    var cells = new Uint8Array(cols * rows);
    var live = 0;

    for (var i = 0; i < count; i += 1) {
      var bits = GLYPHS[text.charAt(i)] || UNKNOWN_BITS;
      var offset = i * (GLYPH_W + GLYPH_GAP);
      for (var y = 0; y < GLYPH_H; y += 1) {
        for (var x = 0; x < GLYPH_W; x += 1) {
          if (bits[y * GLYPH_W + x]) {
            cells[y * cols + offset + x] = 1;
            live += 1;
          }
        }
      }
    }

    /* The mask records where bricks belong, so a healed wall knows where to
       regrow. Without it a destroyed cell and empty space are both zero. */
    return {
      name: text, cols: cols, rows: rows,
      cells: cells, mask: cells.slice(),
      live: live, total: live
    };
  }

  PB.bricks = {
    GLYPH_W: GLYPH_W,
    GLYPH_H: GLYPH_H,
    GLYPH_GAP: GLYPH_GAP,
    MAX_NAME: MAX_NAME,
    cleanName: cleanName,
    buildWall: buildWall
  };
})(window);
