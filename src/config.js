/*
 * ─────────────────────────────────────────────────────────────────────────
 *  PERSONALISE THE FILM HERE. This is the only file you need to edit.
 * ─────────────────────────────────────────────────────────────────────────
 */
export const storyConfig = {
  /** Shown on the final title: "Happy Birthday, <herName>" */
  herName: 'HER NAME',

  /**
   * The letter the stars quietly form in the last scene (A–Z).
   * Leave empty ('') to use the first letter of herName.
   */
  herInitial: 'H',

  /** Shown under the title. */
  birthday: '07 · 10 · 2026',
};

/*
 * The letter (Scene 7), revealed one paragraph at a time.
 * This is the exact text — keep the wording as it is. "\n" is a line break.
 */
export const letter = [
  'If all the stars were gathered in one sky,\nI still think I would notice you first.',
  'There is something about you that makes even normal days feel a little more special.',
  'Time will keep moving, people will change, and life will take us through so many different places, but I hope one thing always stays the same — the way my heart finds comfort in you.',
  'You have become a part of so many small moments in my life, in my thoughts, in my smiles, and even in the silence.',
  'I do not know what the future will look like, but I know I am grateful that in this huge world, somehow I found you.',
  'Happy birthday, my love.',
];

/*
 * Recorded sounds. Drop files into /public/audio/ and put their paths here
 * (relative, no leading slash), e.g. 'audio/forest-night.mp3'.
 * Anything left as null uses the built-in procedural placeholder.
 */
export const audioFiles = {
  // ambience beds (looping)
  'amb.town': null, // gentle night air, faint distant town
  'amb.forest': null, // leaves, soft night insects
  'amb.mountain': null, // stronger wind
  'amb.summit': null, // open, airy high wind

  // music (looping, very quiet)
  'music.theme': null,

  // one-shots
  'sfx.chime': null, // Begin
  'sfx.twinkle': null, // a star noticing you
  'sfx.starBlink': null, // the star vanishing on the hill
  'sfx.firefly': null, // tiny firefly shimmer
  'sfx.footstep': null, // soft steps on grass
  'sfx.footstepRock': null, // steps on stone
  'sfx.slip': null, // gravel slide
  'sfx.rustle': null, // backpack / clothing
  'sfx.paper': null, // unfolding the letter
  'sfx.constellation': null, // the initial appearing
};

/** The initial actually used for the constellation. */
export function herInitial() {
  const raw = (storyConfig.herInitial || storyConfig.herName || 'A').trim();
  const letter = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : 'A';
}
