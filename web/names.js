/*
 * The rotating cast.
 *
 * The landing screen arrives pre-loaded with somebody, so a player can start
 * instantly, and whoever turns up is the one trying to kill them this round.
 *
 * ---------------------------------------------------------------------------
 * TO EDIT THIS LIST: add or remove lines in the block below. One name per line.
 * Letters A-Z only, up to 8 characters, since that's what the brick grid draws.
 * Case and stray spaces don't matter, and anything that can't be drawn is
 * dropped at load rather than breaking the game. No build step, no rebuild:
 * save the file and reload the page.
 * ---------------------------------------------------------------------------
 */
(function (global) {
  'use strict';

  var NAME_LIST = `
ROSIE     AMARA     KWAME     PRIYA     OMAR      NADIA     TENDAI    ZOLA
IMANI     CHIDI     LEILA     MATEO     SANAA     ELIJAH    NURA      KOFI
AISHA     DIEGO     YARA      THABO     RAVI      ESME      JAMAL     LUCIA
NIA       FREYA     HASSAN    INES      LOLA      MARCUS    NOOR      PEARL
QUINN     ROHAN     SADIE     TOMAS     UMA       VERA      WREN      YUSUF
ZARA      ADAEZE    BOLA      CIARA     EZRA      FATIMA    GRACE     HIRO
JOSIAH    KEZIA     LAYLA     MOSES     NKEM      OLIVE     PABLO     RUTH
TARIQ     BILAL     CORA      EMEKA     FARAH     HANA      IVY       SIMBA
ZURI      JELANI    MALAIKA   FEMI      TAIWO     KEHINDE   NGOZI     IFEOMA
CHINEDU   SADE      YEMI      DAYO      UCHE      IJEOMA    KAMAU     WANJIRU
ATIENO    OTIENO    MUSA      AWA       MARIAM    ABENA     YAA       OBI
KARIM     RANIA     SAMIR     YASMIN    AMIRA     IBRAHIM   HALIMA    SOFIA
ANIKA     ARJUN     DEEPA     KIRAN     MEERA     NIKHIL    POOJA     RAHUL
SANJAY    TARA      VIKRAM    ANAND     ISHAAN    LAKSHMI   NEHA      RIYA
MEI       YUKI      KENJI     SAKURA    JIN       LING      WEI       AKIRA
DAIKI     MINJI     SEOJUN    TAO       YUNA      CARMEN    JAVIER    ROSA
XIMENA    ELENA     MARISOL   RAFAEL    VALERIA   MABEL     FLORA     HAZEL
IRIS      JUNO      NELL      OTTO      PIPPA     SILAS     THEO      WILLA
ARLO      BRUNO     CLEO      DAISY     EDITH     FINN      HUGO      MAYA
NORA      OSCAR     RENA      SOLA      TESSA     VIOLA     ZAINAB    IDRIS
`;

  var PB = global.PB = global.PB || {};

  /* Anything the brick font can't draw is dropped here, not at render time. */
  var cast = [];
  var rejected = 0;
  var seen = {};

  NAME_LIST.split(/\s+/).forEach(function (entry) {
    var name = entry.toUpperCase().replace(/[^A-Z]/g, '');
    if (!name) return;
    if (name.length > 8 || seen[name]) { rejected += 1; return; }
    seen[name] = true;
    cast.push(name);
  });

  if (PB.trace) PB.trace('names', { loaded: cast.length, dropped: rejected });

  var last = -1;

  /* Never hand back the same name twice running. */
  function random() {
    if (cast.length === 0) return 'ROSIE';
    var index = Math.floor(Math.random() * cast.length);
    if (cast.length > 1 && index === last) index = (index + 1) % cast.length;
    last = index;
    return cast[index];
  }

  PB.names = { random: random, cast: cast, dropped: rejected };
})(window);
