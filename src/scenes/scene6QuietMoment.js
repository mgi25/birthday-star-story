import './summit.css';
import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES, packMarkup } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { BOY } from '../core/palette.js';
import { buildSummit, SUMMIT, ITEMS, LAP_PACK } from '../worlds/summit.js';

/*
 * SCENE 6 — THE QUIET MOMENT
 *
 * A dissolve from the wide shot: he is sitting on the edge now, legs over
 * the drop, his backpack in his lap. Breathing room. He opens the bag and
 * takes out a few ordinary things — a map, a snack, a small telescope —
 * setting each beside him. Then his hand finds something deeper. He slows.
 * A folded letter, soft with being carried. "Then he remembered something."
 */

/** The closer framing used for Scenes 6–8 (sitting at the edge). */
export const SIT_FRAME = { x: 0, y: 0, zoom: 2.4, focusX: 71, focusY: 1031 };

/** How he sits: hips on the edge, legs hanging over it. */
export const SITTING = { x: SUMMIT.sitX, y: SUMMIT.topY + 31, ...POSES.rest, ...POSES.sit, gear: 0, head: -10, wind: 0.75 };

/** Closed bag in his lap (same art as the one on his back). */
const LAP_PACK_CLOSED = `<g transform="translate(5 -64.5)">${packMarkup(BOY, 0, 0)}</g>`;

/** Gentle leg swing while sitting (the timeline-independent part of the idle). */
export function swingLegs(boy, reduced) {
  if (reduced) return null;
  return gsap.to(boy.pose, { legF: -16, legB: -22, duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true });
}

export default {
  id: 'scene6',
  title: 'The Quiet Moment',
  next: 'scene7',
  ambience: 'amb.summit',
  music: 0.16,

  create(ctx) {
    const { stage, audio, reduced } = ctx;
    const frame = ctx.frame();

    const camera = createCamera(stage, { ...SIT_FRAME, reduced });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildSummit(ctx, frame, camera);
    const boy = createCharacter({ stage, reduced, ...SITTING });
    w.layers.summit.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    boy.lap(LAP_PACK_CLOSED);
    swingLegs(boy, reduced);

    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const remembered = captions.line('Then he remembered something.');

    const tl = gsap.timeline({ paused: true });

    // Stillness. Wind, stars, the drop below his feet.
    tl.add(boy.to({ head: -16 }, { duration: 2.2, ease: EASE.drift }), 0.4);

    // He opens the bag.
    tl.add(boy.to({ head: 12, lean: 1 }, { duration: 0.9 }), 2.6);
    tl.call(() => boy.lap(LAP_PACK), null, 3.2);
    tl.call(() => audio.play('sfx.rustle'), null, 3.1);

    // Takes out a few ordinary things, looks, sets each beside him.
    const takeOut = (name, at, { look = 0.9 } = {}) => {
      tl.add(boy.to({ ...POSES.intoBag }, { duration: 0.5, ease: 'sine.inOut' }), at);
      tl.add(boy.to({ armFU: '+=5' }, { duration: 0.16, yoyo: true, repeat: 1 }), at + 0.5);
      tl.call(() => audio.play('sfx.rustle'), null, at + 0.5);
      tl.call(() => boy.hold('F', ITEMS[name]), null, at + 0.9);
      tl.add(boy.to({ ...POSES.lookItem, head: 0 }, { duration: 0.55, ease: 'sine.out' }), at + 0.9);
      tl.add(boy.to({ ...POSES.setDown, head: 6 }, { duration: 0.55, ease: 'sine.inOut' }), at + 1.45 + look);
      tl.call(() => boy.hold('F', null), null, at + 2 + look);
      tl.set(w.item(name), { opacity: 1 }, at + 2 + look);
      return at + 2.1 + look;
    };
    let t = takeOut('map', 3.4, { look: 0.8 });
    t = takeOut('snack', t, { look: 0.5 });
    t = takeOut('telescope', t, { look: 0.9 });

    // Deeper in the bag, his hand finds something. He stops.
    tl.add(boy.to({ ...POSES.intoBag, lean: 5, head: 14 }, { duration: 0.6 }), t + 0.2);
    tl.add(boy.to({ armFU: '+=4' }, { duration: 0.22, yoyo: true, repeat: 3 }), t + 0.8);
    tl.addLabel('found', t + 1.6);

    // Slowly, carefully, he draws it out.
    tl.call(() => boy.hold('F', ITEMS.letterFolded), null, 'found+=0.6');
    tl.add(boy.to({ ...POSES.holdFront, lean: 1, head: 10 }, { duration: 1.6, ease: 'sine.inOut' }), 'found+=0.6');
    tl.call(() => audio.setMusic(0.1, { fade: 4 }), null, 'found');

    // "Then he remembered something."
    const { end } = captions.sequence(tl, [{ line: remembered, at: tl.labels.found + 2.6, hold: 2.4 }]);

    // He begins to unfold it.
    tl.call(() => audio.play('sfx.paper'), null, end - 0.6);
    tl.call(() => ctx.next({ transition: 'cut', handoff: { boy: boy.state() } }), null, end - 0.2);

    return { timeline: tl, debug: { camera, boy } };
  },
};
