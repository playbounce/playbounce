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
ADAORA    CHIOMA    NNAMDI    ZUBERI    BARAKA    NEEMA     THEMBA    LERATO
NALEDI    KAGISO    SIPHO     AYO       ASHA      JUMA      SIFA      OKON
LAYAN     ZAID      HUDA      SALMA     TAMER     NAILA     RAMI      SORAYA
ADITI     ROHIT     SUNIL     KAVYA     DEVAN     ISHA      NILA      PRANAV
HARUTO    AOI       RIKU      EMIKO     JISOO     NARI      CHENG     XIULAN
ISABELA   SANTOS    PILAR     NIEVES    ALEJO     LUZ       AGNES     CALLUM
FIONA     GRETA     INGRID    KLARA     MIRA      NIAMH     ODILE     EAMON
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

  /*
   * Names come out at random, but a plain roll repeats sooner than it feels it
   * should: with a cast this size the same face turns up within a handful of
   * visits often enough to read as a short list. Remembering the last stretch
   * of picks and rolling again keeps the cast feeling as big as it is.
   *
   * The window is capped at a third of the cast so a short hand-edited list
   * can never run out of names to offer.
   */
  var RECENT_MAX = 24;
  var recent = [];

  function random() {
    if (cast.length === 0) return 'ROSIE';
    if (cast.length === 1) return cast[0];

    var window = Math.min(RECENT_MAX, Math.max(1, Math.floor(cast.length / 3)));
    var index = 0;
    /* Bounded rather than a while-loop: a full window still leaves plenty of
       room, and a fixed ceiling can't hang if the cast is unusually small. */
    for (var attempt = 0; attempt < 40; attempt += 1) {
      index = Math.floor(Math.random() * cast.length);
      if (recent.indexOf(index) === -1) break;
    }

    recent.push(index);
    while (recent.length > window) recent.shift();
    return cast[index];
  }

  PB.names = { random: random, cast: cast, dropped: rejected };
})(window);
