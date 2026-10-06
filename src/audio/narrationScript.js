/*
 * The storyteller's lines, in film order. Each line has one recording:
 *
 *   public/audio/narration/<id>.mp3      e.g. public/audio/narration/scene1-01.mp3
 *
 * The text is exactly what the caption shows. Scene 7 (the letter) has no
 * lines on purpose: she reads it herself.
 *
 *   mood 'tender'  an emotional line: more silence after the voice before the
 *                  caption leaves, and the music dips less underneath it.
 *
 * Captions follow the recordings automatically (voice onset and end are
 * measured from the audio). If a take ever confuses that — a loud breath
 * before the first word, say — pin it by hand, in seconds into the file:
 *   'scene2-01': { text: '…', onset: 0.42, end: 3.9 }
 * and `gain` (e.g. 0.8) nudges one line's level after the automatic levelling.
 */
export const NARRATION_DIR = 'audio/narration/';

export const NARRATION = {
  // Scene 1 — The Night
  'scene1-01': { text: 'Once, there was a boy who spent far too much time looking at the stars.' },
  'scene1-02': { text: 'One night, he had a thought.' },
  'scene1-03': { text: 'What if he could find the brightest one?' },

  // Scene 2 — The First Star
  'scene2-01': { text: 'Apparently, stars were harder to catch than he expected.' },

  // Scene 3 — The Forest
  'scene3-01': { text: 'Close enough.' },

  // Scene 4 — Higher
  'scene4-01': { text: 'So he kept going.' },
  'scene4-02': { text: 'Because surely…' },
  'scene4-03': { text: '…the higher he went…' },
  'scene4-04': { text: '…the closer he would be.' },

  // Scene 5 — Above the Clouds
  'scene5-01': { text: 'He had finally reached the stars.' },
  'scene5-02': { text: 'There were hundreds of them.' },
  'scene5-03': { text: 'Beautiful ones.' },
  'scene5-04': { text: 'Rare ones.' },
  'scene5-05': { text: 'Bright ones.' },
  'scene5-06': { text: 'But somehow…', mood: 'tender' },
  'scene5-07': { text: '…none of them felt like the one he was looking for.', mood: 'tender' },

  // Scene 6 — The Quiet Moment
  'scene6-01': { text: 'Then he remembered something.', mood: 'tender' },

  // Scene 7 — The Letter: not narrated.

  // Scene 8 — The Realisation
  'scene8-01': { text: 'Maybe he had been looking in the wrong place all along.', mood: 'tender' },
  'scene8-02': { text: 'Because sometimes…', mood: 'tender' },
  'scene8-03': { text: '…you don’t find the brightest thing by looking at the sky.', mood: 'tender' },

  // Scene 9 — The Ending
  'scene9-01': { text: 'I guess I found my star after all.', mood: 'tender' },
};
