/*
 * The wall's voice. Three registers mixed on purpose: theatrical villain,
 * plain contempt, and deadpan system output.
 *
 * The lines never name the player. The name is already spelled out in bricks
 * a few inches above the text, so saying it adds nothing. They speak to the
 * player instead, and they threaten rather than narrate: a wall announcing
 * its own state ("now I'm awake") is weaker than one making a promise.
 */
(function (global) {
  'use strict';

  var PB = global.PB;

  var LINES = {
    idle: [
      'ANOTHER ONE. GOOD. I WAS GETTING BORED.',
      'TYPE IT. I DARE YOU.',
      'SUBJECT REQUIRED. SUPPLY A NAME.',
      'NAMES GO IN. NOTHING COMES OUT.',
      'I HAVE EATEN BETTER NAMES THAN YOURS.',
      'YOU WON\'T FINISH THIS. TYPE IT ANYWAY.',
      'AWAITING INPUT. AWAITING DISAPPOINTMENT.',
      'THEY ALL THINK THEY\'RE THE ONE.',
      'LAST PLAYER LEFT CRYING. YOUR TURN.',
      'STATUS: HUNGRY.'
    ],
    start: [
      'YOU HAVE MADE A MISTAKE.',
      'PROGNOSIS: POOR.',
      'DISAPPOINTING ALREADY.',
      'THIS WILL BE BRIEF.',
      'BEGIN. IT CHANGES NOTHING.',
      'SUBJECT ACQUIRED. YOU.'
    ],
    stirring: [
      'CUTE.',
      'WAS THAT MEANT TO HURT?',
      'I FELT THAT. BARELY.',
      'KEEP GOING. I WANT TO SEE THIS.',
      'DIDN\'T EVEN HURT.',
      'HIT ME AGAIN AND SEE WHAT HAPPENS.'
    ],
    awake: [
      'YOU SHOULDN\'T HAVE DONE THAT.',
      'MY TURN.',
      'THREAT DETECTED. BARELY.',
      'YOU HAVE MY ATTENTION NOW.',
      'FINE. YOU ASKED FOR IT.'
    ],
    boiling: [
      'I\'M DONE BEING POLITE.',
      'CORE TEMPERATURE: RISING.',
      'BURN.',
      'YOU SHOULD HAVE STAYED AWAY.',
      'YOU WON\'T WIN.'
    ],
    dying: [
      'I\'LL TAKE YOU WITH ME.',
      'TERMINAL. BOTH OF US.',
      'IF I GO, YOU GO.',
      'FINISH IT. IF YOU CAN.'
    ],
    life: [
      'ONE LESS.',
      'PREDICTABLE.',
      'BALL LOST. AS EXPECTED.',
      'IS THAT ALL YOU HAVE?',
      'I BARELY TRIED.',
      'PATHETIC.'
    ],
    damage: [
      'SHORTER NOW.',
      'I\'M FILING YOU DOWN.',
      'PADDLE INTEGRITY: FAILING.',
      'HOW MUCH OF YOU IS LEFT?',
      'LOOK AT YOU, STRUGGLING.'
    ],
    powerup: [
      'TAKE IT. IT WON\'T HELP.',
      'A GIFT. HOW SAD.',
      'ENJOY THAT. BRIEFLY.',
      'CHARITY. FROM ME. TO YOU.',
      'THAT WON\'T SAVE YOU.'
    ],
    /* Fired when a ricochet takes 3 bricks in one flight, so these read as the
       wall losing composure at the one thing the player can do well. */
    /*
     * Spoken only while the wall is knitting itself back together, including
     * the stage changes on the way down. The rising sets threaten; these gloat,
     * because a wall that's recovering has nothing to threaten about yet.
     */
    heal: [
      'AH, THAT FEELS GOOD.',
      'I REALLY TOOK A BEATING.',
      'GOOD THING YOU\'RE SO SLOW.',
      'POWERING BACK UP.',
      'NOTHING CAN KILL ME.',
      'THAT WAS EASY.',
      'BARELY A SCRATCH.',
      'I DIDN\'T FEEL A THING.',
      'THAT\'S BETTER.',
      'TAKE YOUR TIME. I\'LL WAIT.',
      'DID YOU THINK I WAS DONE?',
      'REBUILDING. THANKS FOR THE BREAK.',
      'I HEAL. YOU DON\'T.'
    ],
    combo: [
      'LUCKY.',
      'DO THAT AGAIN. I DARE YOU.',
      'UNACCEPTABLE.',
      'AN ACCIDENT, SURELY.',
      'YOU\'LL PAY FOR THAT.',
      'THAT\'S CHEATING.',
      'FFS.'
    ],
    crushed: [
      'NOTHING LEFT TO CATCH WITH.',
      'I TOOK YOUR HANDS FIRST.',
      'PADDLE: GONE. SUBJECT: GONE.',
      'THAT\'S THAT, THEN.'
    ],
    over: [
      'ERASED.',
      'PROCESS TERMINATED. NO SURVIVORS.',
      'AND STILL I STAND.',
      'YOU WERE NEVER GOING TO WIN.'
    ],
    timeout: [
      'TIME. YOU HAD SOME. YOU WASTED IT.',
      'CLOCK: EXPIRED. YOU: STILL HERE. BARELY.',
      'TOO SLOW. ALWAYS TOO SLOW.'
    ],
    cleared: [
      'FINE. THIS TIME.',
      'YOU WIN. I\'LL BE HERE WHEN YOU TYPE IT AGAIN.',
      'ENJOY IT. IT WON\'T LAST.',
      'ONE OF YOU HAD TO, EVENTUALLY.'
    ]
  };

  var history = {};
  var MAX_HISTORY = 4;

  /*
   * Avoid the last few lines from a set, not just the previous one. A healing
   * run or a beam volley draws from one set several times in a row, and a
   * single-entry memory lets a line come back two picks later.
   */
  function pick(kind) {
    var set = LINES[kind];
    if (!set || set.length === 0) return '';

    var recent = history[kind] || (history[kind] = []);
    var choices = [];
    for (var i = 0; i < set.length; i += 1) {
      if (recent.indexOf(set[i]) < 0) choices.push(set[i]);
    }
    if (choices.length === 0) choices = set;

    var line = choices[Math.floor(Math.random() * choices.length)];
    var depth = Math.min(MAX_HISTORY, Math.max(1, Math.floor(set.length / 2)));
    recent.push(line);
    while (recent.length > depth) recent.shift();
    return line;
  }

  PB.taunts = { pick: pick, kinds: Object.keys(LINES) };
})(window);
