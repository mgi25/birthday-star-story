import './summit.css';
import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { createWash } from '../components/wash.js';
import { buildSummit, summitY, SUMMIT } from '../worlds/summit.js';

/*
 * SCENE 5 — ABOVE THE CLOUDS
 *
 * The cloud clears and he steps up onto the summit. The camera eases back
 * and the sky opens: hundreds of stars over a sea of cloud. He looks left,
 * then right. Beautiful ones, rare ones, bright ones. The camera pulls back
 * further until he is very small beneath it all. But somehow…
 */

/** Scene 5's final framing; Scene 6 dissolves from it. */
export const SCENE5_END = { zoom: 1, y: -60, focusX: -40, focusY: 860 };

/** Narration (text and recordings: audio/narrationScript.js). */
const LINES = {
  reached: 'scene5-01', // He had finally reached the stars.
  hundreds: 'scene5-02', // There were hundreds of them.
  beautiful: 'scene5-03', // Beautiful ones.
  rare: 'scene5-04', // Rare ones.
  bright: 'scene5-05', // Bright ones.
  somehow: 'scene5-06', // But somehow…
  none: 'scene5-07', // …none of them felt like the one he was looking for.
};

export default {
  id: 'scene5',
  title: 'Above the Clouds',
  next: 'scene6',
  ambience: 'amb.summit',
  music: 0.6,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();

    const camera = createCamera(stage, { x: 0, y: 0, zoom: 1.75, focusX: -40, focusY: 830, reduced });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildSummit(ctx, frame, camera);
    const { field } = w;
    const wash = createWash(frame.picture, 'cloud', handoff?.wash ?? 1);

    const boy = createCharacter({ stage, reduced, x: -172, ...POSES.straps, armSwing: 0.4, head: -10, wind: 1.1 });
    boy.setGround(summitY);
    w.layers.summit.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    ctx.onCleanup(boy.onStep(() => audio.play('sfx.footstepRock', { rate: 0.9 + Math.random() * 0.2 })));

    // Stars that answer the narration (sky coordinates, clear of the text).
    const beautiful = [
      [-132, 196],
      [-104, 176],
      [-150, 168],
      [-118, 150],
    ].map(([x, y]) => field.addHero({ x, y, size: 1.3, alpha: 0.75, tint: 0 }));
    const rare = field.addHero({ x: 132, y: 482, size: 1.5, alpha: 0.8, tint: 2 });
    const bright = field.addHero({ x: 36, y: 120, size: 1.7, alpha: 0.9, tint: 1 });

    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const line = Object.fromEntries(Object.entries(LINES).map(([k, id]) => [k, captions.narrated(id)]));

    const tl = gsap.timeline({ paused: true });

    // Out of the cloud: he climbs the last few steps onto the top.
    tl.to(wash, { opacity: 0, duration: 2.4, ease: 'sine.out' }, 0);
    tl.add(boy.stroll(SUMMIT.standX, { from: -172, speed: 42, accel: 0.6, decel: 1.5 }), 0);
    const arrived = tl.duration();
    tl.add(boy.to({ ...POSES.rest, lift: 1.2, head: -6 }, { duration: 0.6 }), arrived);
    tl.add(boy.to({ lift: 0 }, { duration: 1.2 }), arrived + 0.6);
    tl.add(boy.to({ head: -32, lean: -3 }, { duration: 1.6, ease: 'sine.inOut' }), arrived + 1);

    // The sky opens.
    tl.addLabel('open', arrived + 0.8);
    tl.add(camera.to({ zoom: 1.14, y: -24, duration: 6, ease: 'sine.inOut' }), 'open');
    const afterReached = captions.sequence(tl, [{ line: line.reached, at: tl.labels.open + 1.4, hold: 2 }]).end;

    // He looks left… then right.
    tl.addLabel('look', afterReached - 0.6);
    tl.add(boy.turn(-1, { duration: 0.4 }), 'look');
    tl.add(boy.to({ head: -24 }, { duration: 0.6 }), 'look');
    tl.add(boy.turn(1, { duration: 0.4 }), 'look+=1.5');
    tl.add(boy.to({ head: -30 }, { duration: 0.6 }), 'look+=1.5');

    // There were hundreds. Beautiful ones. Rare ones. Bright ones.
    const short = { hold: 1, out: 0.7, gap: 0.25 };
    const { end: afterAll, starts } = captions.sequence(
      tl,
      [
        { line: line.hundreds, hold: 1.8, out: 1, gap: 0.3 },
        { line: line.beautiful, ...short },
        { line: line.rare, ...short },
        { line: line.bright, ...short },
      ],
      afterReached,
    );
    const answer = (start, stars, peak, settle) => {
      tl.to(stars, { ...peak, duration: 1.1, ease: EASE.arrive, stagger: 0.12 }, start + 0.4);
      tl.to(stars, { ...settle, duration: 1.6, ease: EASE.drift }, start + 1.9);
    };
    answer(starts[1], beautiful, { size: 2, glow: 0.7, alpha: 1 }, { size: 1.6, glow: 0.3 });
    answer(starts[2], [rare], { size: 2.3, glow: 1.1, pulse: 1 }, { glow: 0.5, pulse: 0.4 });
    answer(starts[3], [bright], { size: 2.6, glow: 1.2, flare: 0.8 }, { glow: 0.6, flare: 0.3, size: 2.1 });
    tl.call(() => audio.play('sfx.twinkle'), null, starts[3] + 0.5);

    // Further back. He is very small beneath it. But somehow…
    tl.addLabel('small', afterAll - 0.4);
    tl.add(camera.to({ zoom: SCENE5_END.zoom, y: SCENE5_END.y, focusY: SCENE5_END.focusY, duration: 5.5, ease: 'sine.inOut' }), 'small');
    tl.add(boy.to({ head: -18, lean: -1 }, { duration: 2.4 }), 'small+=3.4');
    tl.call(() => audio.setMusic(0.32, { fade: 6 }), null, 'small+=3');
    const { end } = captions.sequence(
      tl,
      [
        { line: line.somehow, hold: 2.4, gap: 0.9 },
        { line: line.none, hold: 3.6, gap: 0.5 },
      ],
      tl.labels.small,
    );

    // Stillness, then on to the quiet moment.
    tl.call(() => ctx.next({ transition: 'dissolve', dissolve: 2.2 }), null, end + 0.6);

    return { timeline: tl, debug: { camera, boy, field } };
  },
};
