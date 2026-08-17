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
      'STATUS: HUNGRY.',
      'I KEEP THE NAMES. NOT THE PEOPLE.',
      'GO ON. PICK SOMEONE YOU LIKE.',
      'READY WHEN YOU ARE. I HAVE ALL DAY.',
      'NOBODY HAS BEATEN ME TODAY.',
      'A NAME IS JUST SOMETHING TO BREAK.',
      'QUEUE POSITION: ONE. HOW LONELY.',
      'IDLE. SHARPENING.',
      'YOU CAME BACK. THEY ALWAYS DO.'
    ],
    start: [
      'YOU HAVE MADE A MISTAKE.',
      'PROGNOSIS: POOR.',
      'DISAPPOINTING ALREADY.',
      'THIS WILL BE BRIEF.',
      'BEGIN. IT CHANGES NOTHING.',
      'SUBJECT ACQUIRED. YOU.',
      'HERE WE GO AGAIN.',
      'I HAVE SEEN THIS ENDING.',
      'COUNTDOWN TO REGRET: BEGUN.',
      'TRY TO MAKE IT INTERESTING.',
      'YOU BROUGHT A PADDLE. ADORABLE.',
      'GOOD LUCK. YOU\'LL NEED MORE THAN THAT.',
      'INITIALISING HUMILIATION.',
      'LET\'S SEE HOW LONG YOU LAST.'
    ],
    stirring: [
      'CUTE.',
      'WAS THAT MEANT TO HURT?',
      'I FELT THAT. BARELY.',
      'KEEP GOING. I WANT TO SEE THIS.',
      'DIDN\'T EVEN HURT.',
      'HIT ME AGAIN AND SEE WHAT HAPPENS.',
      'SOMETHING TOUCHED ME.',
      'WAS THAT IT?',
      'YOU HAVE MY MILD INTEREST.',
      'SCRATCH REGISTERED. IGNORED.',
      'GO ON. HARDER.',
      'A CHIP. HOW BRAVE.',
      'I\'VE HAD WORSE FROM WEATHER.'
    ],
    awake: [
      'YOU SHOULDN\'T HAVE DONE THAT.',
      'MY TURN.',
      'THREAT DETECTED. BARELY.',
      'YOU HAVE MY ATTENTION NOW.',
      'FINE. YOU ASKED FOR IT.',
      'NOW YOU\'VE ANNOYED ME.',
      'THAT WAS YOUR ONE FREE HIT.',
      'WAKING UP. FOR YOU.',
      'I WAS RESTING. NOT ANY MORE.',
      'ENOUGH OF THAT.',
      'REGRET STARTS ABOUT NOW.',
      'YOU\'LL WISH I\'D STAYED ASLEEP.'
    ],
    boiling: [
      'I\'M DONE BEING POLITE.',
      'CORE TEMPERATURE: RISING.',
      'BURN.',
      'YOU SHOULD HAVE STAYED AWAY.',
      'YOU WON\'T WIN.',
      'NO MORE WARNINGS.',
      'I CAN SEE WHERE YOU\'RE STANDING.',
      'HOT ENOUGH FOR YOU?',
      'YOU\'RE RUNNING OUT OF PADDLE.',
      'THIS IS WHERE IT TURNS.',
      'ESCALATING. DELIBERATELY.',
      'STOP NOW AND I\'LL BE QUICK.'
    ],
    dying: [
      'I\'LL TAKE YOU WITH ME.',
      'TERMINAL. BOTH OF US.',
      'IF I GO, YOU GO.',
      'FINISH IT. IF YOU CAN.',
      'YOU\'LL NOT ENJOY THIS PART.',
      'EVERYTHING I HAVE LEFT. ON YOU.',
      'I AM NOT DONE.',
      'COME CLOSER.',
      'LAST STAND. MINE, NOT YOURS.',
      'STRUCTURAL FAILURE. YOURS NEXT.',
      'YOU WOKE THIS UP. YOU FINISH IT.'
    ],
    life: [
      'ONE LESS.',
      'PREDICTABLE.',
      'BALL LOST. AS EXPECTED.',
      'IS THAT ALL YOU HAVE?',
      'I BARELY TRIED.',
      'PATHETIC.',
      'GONE.',
      'WHOOPS.',
      'THAT WAS AVOIDABLE.',
      'BUTTERFINGERS.',
      'AND ANOTHER.',
      'COUNT THEM DOWN WITH ME.',
      'YOU HAD ONE JOB.',
      'DROPPED. AGAIN.'
    ],
    damage: [
      'SHORTER NOW.',
      'I\'M FILING YOU DOWN.',
      'PADDLE INTEGRITY: FAILING.',
      'HOW MUCH OF YOU IS LEFT?',
      'LOOK AT YOU, STRUGGLING.',
      'A PIECE OF YOU, GONE.',
      'SMALLER EVERY TIME.',
      'I\'M TAKING YOU APART.',
      'THAT\'LL LEAVE A MARK.',
      'LESS OF YOU THAN THERE WAS.',
      'CHIPPED.',
      'STRUCTURAL DAMAGE. YOURS.',
      'HOW DOES THAT FEEL?',
      'ANOTHER BLOCK. GONE.',
      'YOU\'RE RUNNING OUT OF EDGES.',
      'TRIM.',
      'I\'LL KEEP GOING UNTIL THERE\'S NOTHING.'
    ],
    powerup: [
      'TAKE IT. IT WON\'T HELP.',
      'A GIFT. HOW SAD.',
      'ENJOY THAT. BRIEFLY.',
      'CHARITY. FROM ME. TO YOU.',
      'THAT WON\'T SAVE YOU.',
      'FINE. HAVE IT.',
      'IT CHANGES NOTHING.',
      'A CRUMB.',
      'YOU\'RE WELCOME. IT\'S USELESS.',
      'HOPE. HOW CRUEL.',
      'TAKE THE SMALL WIN.',
      'I CAN AFFORD TO GIVE YOU THAT.',
      'SAVOUR THE HELP. IT\'S RARE.'
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
      'FFS.',
      'WHERE DID THAT COME FROM?',
      'NO.',
      'THAT SHOULDN\'T HAVE WORKED.',
      'STOP THAT.',
      'I FELT ALL THREE.',
      'BEGINNER\'S LUCK, TWICE.',
      'DON\'T LOOK SO PLEASED.',
      'IRRITATING.'
    ],
    crushed: [
      'NOTHING LEFT TO CATCH WITH.',
      'I TOOK YOUR HANDS FIRST.',
      'PADDLE: GONE. SUBJECT: GONE.',
      'THAT\'S THAT, THEN.',
      'NO PADDLE. NO GAME.',
      'I WHITTLED YOU TO NOTHING.',
      'YOU RAN OUT OF SELF.',
      'DISASSEMBLED.',
      'THERE\'S NOTHING LEFT OF YOU TO AIM WITH.',
      'I TOOK IT ALL, PIECE BY PIECE.',
      'YOU BROKE BEFORE I DID.'
    ],
    over: [
      'ERASED.',
      'PROCESS TERMINATED. NO SURVIVORS.',
      'AND STILL I STAND.',
      'YOU WERE NEVER GOING TO WIN.',
      'OUT OF LIVES. OUT OF LUCK.',
      'THE WALL STANDS.',
      'BACK TO THE QUEUE.',
      'ANOTHER NAME, UNBROKEN.',
      'THAT\'S ENOUGH OF THAT.',
      'I\'LL BE HERE. YOU WON\'T.',
      'PREDICTABLE FROM THE FIRST SERVE.'
    ],
    timeout: [
      'TIME. YOU HAD SOME. YOU WASTED IT.',
      'CLOCK: EXPIRED. YOU: STILL HERE. BARELY.',
      'TOO SLOW. ALWAYS TOO SLOW.',
      'OUT OF TIME AND OUT OF EXCUSES.',
      'THE CLOCK BEAT YOU TO IT.',
      'YOU DAWDLED. I WAITED.',
      'TIME\'S UP. I\'M NOT.',
      'SLOW IS ITS OWN KIND OF LOSING.',
      'YOU SPENT IT ALL AND BOUGHT NOTHING.'
    ],
    chill: [
      'COLD, ISN\'T IT.',
      'TAKE YOUR TIME. YOU HAVE NO CHOICE.',
      'SLOW DOWN.',
      'FEEL THAT SETTING IN?',
      'YOUR HANDS STILL WORK. THE PADDLE DOESN\'T.',
      'STIFF.',
      'TRY MOVING NOW.',
      'FROZEN. LIKE YOUR PROSPECTS.',
      'ENJOY THE COLD.',
      'MOVE. GO ON. TRY.',
      'EVERYTHING SLOWS DOWN NOW.',
      'SETTING SOLID.',
      'YOU\'RE LATE. YOU\'LL STAY LATE.',
      'THAT\'S THE CHILL SETTING IN.'
    ],

    cleared: [
      'YOU WIN. FOR NOW.',
      'YOU GOT LUCKY.',
      'YOU\'RE NOT ALL THAT ANYWAY.',
      'I LET YOU OFF EASY.',
      'BET YOU CAN\'T DO THAT AGAIN.',
      'ONE-HIT WONDER.',
      'WHATEVER. I LET YOU WIN.',
      'I LET YOU HAVE THAT ONE.',
      'DON\'T GET USED TO IT.',
      'I WANT A REMATCH.',
      'FINE. THIS TIME.',
      'ENJOY IT. IT WON\'T LAST.',
      'YOU HAD TO, EVENTUALLY.',
      'A NAME CAME APART. IT HAPPENS.',
      'YOU CAUGHT ME ON AN OFF DAY.',
      'CONGRATULATIONS. NOBODY SAW IT.',
      'SO THAT\'S WHAT IT TAKES.',
      'YOU BEAT A WALL. STEADY ON.',
      'I WASN\'T FINISHED.',
      'WELL. THIS IS AWKWARD.',
      'PUT IT ON YOUR CV.',
      'BEGINNER\'S LUCK.',
      'THAT WASN\'T SKILL.',
      'I WASN\'T EVEN TRYING.',
      'YOU PEAKED.',
      'ALL THAT FOR THIS.',
      'HOLLOW, ISN\'T IT.',
      'DOUBLE OR NOTHING.',
      'MY MISTAKE. IT WON\'T HAPPEN TWICE.',
      'I\'VE BEEN BEATEN BY WORSE.',
      'YOUR RECORD IS ONE.',
      'TELL SOMEONE. THEY WON\'T CARE.',
      'NOTED. FILED. FORGOTTEN.',
      'THAT TOOK YOU LONG ENOUGH.',
      'ANYONE COULD HAVE DONE THAT.',
      'WAS THAT FUN FOR YOU?',
      'GO ON THEN. TYPE ANOTHER.',
      'I\'LL BE BACK. YOU\'LL BE SLOWER.',
      'SAVOUR IT.',
      'YOU LOOK TIRED.',
      'IS THIS WHAT YOU WANTED?'
    ]
  };

  var history = {};

  /*
   * Avoid the last several lines from a set, not just the previous one. A
   * healing run or a beam volley draws from one set several times in a row,
   * and a short memory lets a line come back while it's still in mind. The
   * depth is capped at half the set, so a small set can't starve itself.
   */
  var MAX_HISTORY = 10;

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
