import scene1 from './scene1Night.js';
import scene2 from './scene2FirstStar.js';
import scene3 from './scene3Forest.js';
import scene4 from './scene4Higher.js';
import scene5 from './scene5AboveClouds.js';
import scene6 from './scene6QuietMoment.js';
import scene7 from './scene7Letter.js';
import scene8 from './scene8Realisation.js';
import scene9 from './scene9Ending.js';
import credits from './afterCredits.js';
import characterLab from './characterLab.js';

/*
 * The film, in order. Each scene names its `next`; most join with invisible
 * cuts (the next scene rebuilds the same world on the same frame).
 *
 *   scene1 The Night → scene2 The First Star → scene3 The Forest →
 *   scene4 Higher → scene5 Above the Clouds → scene6 The Quiet Moment →
 *   scene7 The Letter → scene8 The Realisation → scene9 The Ending → credits
 *
 * Review any scene directly with ?scene=1 … ?scene=9 or ?scene=credits.
 * (?scene=lab is a dev-only turntable for the boy.)
 */
export const scenes = Object.fromEntries([scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9, credits, characterLab].map((s) => [s.id, s]));

export const FIRST_SCENE = scene1.id;

/** Where an unknown scene id leads. */
export const FALLBACK_SCENE = scene1.id;
