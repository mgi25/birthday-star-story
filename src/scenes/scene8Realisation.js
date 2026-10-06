import './summit.css';
import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES, solveArm } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { buildSummit, ITEMS, LAP_PACK } from '../worlds/summit.js';
import { SIT_FRAME, SITTING, swingLegs } from './scene6QuietMoment.js';
import { HERO_SHINING } from './scene1Night.js';

/*
 * SCENE 8 — THE REALISATION
 *
 * The camera eases back. The brightest star — the one from the very first
 * night — shines again, right there. We expect him to jump up and chase it.
 * He doesn't. He settles, folds the letter, and tucks it inside his hoodie.
 */

/** Medium-wide framing: him at the edge, the sky above. Scene 9 starts here. */
export const WIDE_FRAME = { x: 0, y: 0, zoom: 1.55, focusX: 111, focusY: 1042 };
/** Where the brightest star returns (sky / screen units). */
export const BRIGHTEST = { x: 122, y: 160, tint: 1, ...HERO_SHINING };

export default {
  id: 'scene8',
  title: 'The Realisation',
  next: 'scene9',
  ambience: 'amb.summit',
  music: 0.22,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();

    const camera = createCamera(stage, { ...SIT_FRAME, reduced });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildSummit(ctx, frame, camera);
    ['map', 'snack', 'telescope'].forEach((name) => gsap.set(w.item(name), { opacity: 1 }));
    const star = w.field.addHero({ ...BRIGHTEST, alpha: 0 });

    const boy = createCharacter({ stage, reduced, ...SITTING, ...POSES.holdFront, head: 12, lean: 1, ...handoff?.boy });
    w.layers.summit.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    boy.lap(LAP_PACK);
    boy.hold('F', ITEMS.letterOpen);
    swingLegs(boy, reduced);

    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    // "Maybe he had been looking in the wrong place all along."
    // "Because sometimes…" "…you don’t find the brightest thing by looking at the sky."
    const [wrong, sometimes, sky] = ['scene8-01', 'scene8-02', 'scene8-03'].map((id) => captions.narrated(id));

    const tl = gsap.timeline({ paused: true });

    // The camera eases back; the brightest star is there again.
    tl.add(camera.to({ ...WIDE_FRAME, duration: 4.6, ease: 'sine.inOut' }), 0.3);
    tl.to(star, { alpha: 1, duration: 3.2, ease: EASE.drift }, 0.9);
    tl.call(() => audio.play('sfx.twinkle'), null, 1.6);

    // He sees it. For a moment he is about to go after it…
    tl.add(boy.to({ head: -30, lean: -2 }, { duration: 1.1, ease: 'sine.inOut' }), 2.6);
    tl.add(boy.to({ lift: -2.2 }, { duration: 0.5, ease: 'power2.out' }), 3.3);

    // …but he doesn't. He settles.
    tl.add(boy.to({ lift: 1.2, lean: -4, head: -16, ...solveArm('F', 16, -53), ...solveArm('B', 14, -55) }, { duration: 2, ease: 'sine.inOut' }), 4.5);

    // He folds the letter, slowly, and tucks it inside his hoodie.
    tl.call(() => audio.play('sfx.paper'), null, 6.6);
    tl.call(() => boy.hold('F', ITEMS.letterFolded), null, 7.3);
    tl.add(boy.to({ ...POSES.chest, head: 6 }, { duration: 1.2, ease: 'sine.inOut' }), 7.6);
    tl.call(() => boy.hold('F', null), null, 8.8);
    tl.add(boy.to({ armBU: POSES.chest.armFU + 6, armBL: POSES.chest.armFL }, { duration: 0.8 }), 8.6);
    tl.add(boy.to({ ...POSES.rest, head: -6, lean: -3 }, { duration: 1.3, ease: 'sine.inOut' }), 10.2);

    // The words, given room.
    const { starts, end } = captions.sequence(tl, [
      { line: wrong, at: 6.2, hold: 3.2 },
      { line: sometimes, hold: 2.1, gap: 0.7 },
      { line: sky, hold: 3.8, gap: 0.5 },
    ]);
    // The star glows, softly, between the lines.
    tl.to(star, { glow: 1.45, pulse: 1.3, duration: 2.4, ease: EASE.drift }, starts[1] - 1.2);
    tl.add(boy.to({ head: -26, lean: -2 }, { duration: 1.8, ease: 'sine.inOut' }), starts[2] + 2.4);

    tl.call(() => ctx.next({ transition: 'cut', handoff: { boy: boy.state(), star: { ...star } } }), null, end + 0.4);

    return { timeline: tl, debug: { camera, boy, star } };
  },
};
