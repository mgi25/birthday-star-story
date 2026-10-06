import { audioFiles } from '../config.js';

/**
 * Every sound in the film, by id. File paths live in src/config.js
 * (audioFiles); until a file is set, `synth` names a procedural placeholder
 * from synth.js. A cue with neither is silently skipped.
 *
 *   bus     music | ambience | sfx  (each has its own volume)
 *   loop    keep playing until stopped (ambience, music)
 *   volume  0..1 level for this cue
 *   opts    passed to the placeholder synth
 */
const DEFS = {
  // ambience
  'amb.town': { bus: 'ambience', loop: true, volume: 0.55, synth: 'wind' },
  'amb.forest': { bus: 'ambience', loop: true, volume: 0.6, synth: 'leaves' },
  'amb.mountain': { bus: 'ambience', loop: true, volume: 0.7, synth: 'wind', opts: { cutoff: 620, gust: 260, swell: 0.32, level: 0.75 } },
  'amb.summit': { bus: 'ambience', loop: true, volume: 0.5, synth: 'wind', opts: { cutoff: 330, gust: 120, swell: 0.18, level: 0.7 } },

  // music
  'music.theme': { bus: 'music', loop: true, volume: 0.6, synth: 'pad' },

  // one-shots
  'sfx.chime': { bus: 'sfx', volume: 0.3, synth: 'chime' },
  'sfx.twinkle': { bus: 'sfx', volume: 0.32, synth: 'twinkle' },
  'sfx.starBlink': { bus: 'sfx', volume: 0.28, synth: 'blink' },
  'sfx.firefly': { bus: 'sfx', volume: 0.16, synth: 'chime', opts: { freq: 2637, level: 0.5 } },
  'sfx.footstep': { bus: 'sfx', volume: 0.22, synth: 'step' },
  'sfx.footstepRock': { bus: 'sfx', volume: 0.2, synth: 'step', opts: { tone: 1.6 } },
  'sfx.slip': { bus: 'sfx', volume: 0.3, synth: 'scrape' },
  'sfx.rustle': { bus: 'sfx', volume: 0.18, synth: 'rustle' },
  'sfx.paper': { bus: 'sfx', volume: 0.2, synth: 'paper' },
  'sfx.constellation': { bus: 'sfx', volume: 0.22, synth: 'arpeggio' },
};

export const CUES = Object.fromEntries(Object.entries(DEFS).map(([id, def]) => [id, { ...def, src: audioFiles[id] ?? null }]));

/** Relative levels of each bus before the master volume. */
export const BUS_LEVELS = {
  music: 0.7,
  ambience: 0.6,
  sfx: 0.85,
  // Recordings are levelled on load (see narration.js), so this stays at unity.
  narration: 1,
};
