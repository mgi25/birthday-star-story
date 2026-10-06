import './summit.css';
import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createRng } from '../core/random.js';
import { createCharacter, POSES } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { constellation } from '../components/constellation.js';
import { storyConfig, herInitial } from '../config.js';
import { buildSummit, LAP_PACK } from '../worlds/summit.js';
import { SITTING, swingLegs } from './scene6QuietMoment.js';
import { WIDE_FRAME, BRIGHTEST } from './scene8Realisation.js';

/*
 * SCENE 9 — THE ENDING
 *
 * He puts the bag aside and lies back on the summit, hands behind his head,
 * legs over the edge. The camera rises. Slowly, a handful of stars drift
 * into the first letter of her name. "I guess I found my star after all."
 * The world darkens to the title.
 */

/** The letter sits high in the sky, clear of the title below it. */
const LETTER_AT = { cx: 0, cy: 186, scale: 28 };

export default {
  id: 'scene9',
  title: 'The Ending',
  next: 'credits',
  ambience: 'amb.summit',
  music: 0.22,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();

    const camera = createCamera(stage, { ...WIDE_FRAME, reduced });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildSummit(ctx, frame, camera);
    const { field } = w;
    ['map', 'snack', 'telescope'].forEach((name) => gsap.set(w.item(name), { opacity: 1 }));
    const brightest = field.addHero({ ...BRIGHTEST, alpha: 1, glow: 1.45, pulse: 1.3, ...handoff?.star });

    const boy = createCharacter({ stage, reduced, ...SITTING, ...POSES.rest, head: -26, lean: -2, ...handoff?.boy });
    w.layers.summit.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    boy.lap(LAP_PACK);
    swingLegs(boy, reduced);

    // --- her initial, waiting in the sky as ordinary-looking stars
    const shape = constellation(herInitial(), LETTER_AT);
    const scatter = createRng(4242);
    const stars = shape.stars.map((target) => {
      const angle = scatter() * Math.PI * 2;
      const dist = scatter.range(70, 170);
      return {
        target,
        hero: field.addHero({ x: target.x + Math.cos(angle) * dist, y: target.y + Math.sin(angle) * dist * 0.8, size: 1.15, alpha: 0, tint: 0 }),
      };
    });
    const lines = field.addLines(shape.lines.map(([a, b]) => [stars[a].hero, stars[b].hero]));

    // --- narration and the title
    // The line sits below her letter here, not over it.
    const story = el('div', 'story-ui', frame.ui);
    story.style.top = 'calc(var(--u) * 352)';
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const found = captions.line('I guess I found my star after all.');

    const card = el('div', 'title-card', frame.ui);
    const name = el('p', 'title-card__name', card);
    name.textContent = `Happy Birthday, ${storyConfig.herName}`;
    const date = el('p', 'title-card__date', card);
    date.textContent = storyConfig.birthday;
    const note = el('p', 'title-card__note', card);
    note.textContent = 'A little story made only for you.';

    const tl = gsap.timeline({ paused: true });

    // He sets the bag aside…
    tl.add(boy.to({ ...POSES.setDown, head: 4 }, { duration: 0.7, ease: 'sine.inOut' }), 0.3);
    tl.call(() => boy.lap(null), null, 0.9);
    tl.set(w.item('pack'), { opacity: 1 }, 0.9);
    tl.call(() => audio.play('sfx.rustle'), null, 0.8);

    // …and lies back, hands behind his head, looking up.
    tl.call(() => boy.armLayer('back'), null, 1.5);
    tl.add(boy.to({ ...POSES.handsBehindHead, lean: -86, lift: -11.5, head: 4, wind: 0.5 }, { duration: 2.6, ease: 'sine.inOut' }), 1.4);
    tl.call(() => audio.setMusic(0.5, { fade: 7 }), null, 1.8);

    // The camera rises above him; the sky takes the frame.
    tl.add(camera.to({ zoom: 1, y: -40, focusX: 60, focusY: 900, duration: 8, ease: 'sine.inOut' }), 2.8);
    tl.to(brightest, { glow: 0.9, pulse: 0.6, size: 2.2, duration: 6 }, 3);
    // As her letter forms, the brightest star quietly gives way to it.
    tl.to(brightest, { alpha: 0.35, glow: 0.3, flare: 0.3, pulse: 0, duration: 6, ease: EASE.drift }, 8);

    // A few stars brighten… and slowly drift into the first letter of her name.
    const hs = stars.map((s) => s.hero);
    tl.to(hs, { alpha: 0.55, duration: 2.4, ease: EASE.drift, stagger: 0.12 }, 5);
    stars.forEach(({ hero, target }, i) => {
      tl.to(hero, { x: target.x, y: target.y, duration: reduced ? 2.5 : 8.5, ease: 'sine.inOut' }, 7 + i * 0.14);
    });
    const formed = 7 + stars.length * 0.14 + (reduced ? 2.5 : 8.5);
    tl.to(hs, { alpha: 0.95, size: 1.75, glow: 0.35, duration: 2.6, ease: EASE.arrive }, formed - 1.6);
    tl.to(lines, { alpha: 0.2, duration: 3, ease: EASE.drift }, formed - 0.6);
    tl.call(() => audio.play('sfx.constellation'), null, formed - 1.2);
    tl.add(boy.to({ head: 9 }, { duration: 1.4, ease: 'sine.inOut' }), formed - 0.8);

    // "I guess I found my star after all."
    const { end } = captions.sequence(tl, [{ line: found, at: formed + 0.6, hold: 3 }]);

    // The world slowly darkens. Her letter stays, faintly.
    const dark = end - 0.6;
    tl.to([frame.world, w.layers.sky.el], { opacity: 0, duration: 4.5, ease: 'sine.inOut' }, dark);
    tl.to(field.state, { dim: 0, duration: 4.5, ease: 'sine.inOut' }, dark);
    tl.to(brightest, { alpha: 0, duration: 4, ease: 'sine.inOut' }, dark);
    tl.to(hs, { alpha: 0.7, glow: 0.2, duration: 4 }, dark);
    tl.to(lines, { alpha: 0.13, duration: 4 }, dark);
    tl.call(() => audio.setMusic(0.42, { fade: 6 }), null, dark);
    tl.call(() => audio.setAmbienceLevel(0.4, { fade: 6 }), null, dark);

    // Happy Birthday.
    const title = dark + 4.6;
    tl.call(() => ctx.announce(`${name.textContent}. ${storyConfig.birthday}. ${note.textContent}`), null, title);
    tl.fromTo(name, { autoAlpha: 0, y: reduced ? 0 : 8 }, { autoAlpha: 1, y: 0, duration: 2.4, ease: EASE.arrive }, title);
    tl.fromTo(date, { autoAlpha: 0 }, { autoAlpha: 1, duration: 2, ease: EASE.drift }, title + 1.8);
    tl.fromTo(note, { autoAlpha: 0 }, { autoAlpha: 1, duration: 2.2, ease: EASE.drift }, title + 3.4);

    // Held long enough to read and feel; then into the dark.
    const out = title + 3.4 + 2.2 + 6.5;
    tl.to([name, date, note], { autoAlpha: 0, duration: 2.6, ease: 'sine.inOut' }, out);
    tl.to(hs, { alpha: 0, duration: 3, ease: 'sine.inOut' }, out + 0.4);
    tl.to(lines, { alpha: 0, duration: 2.4 }, out + 0.4);
    tl.call(() => ctx.next({ transition: 'cut' }), null, out + 3.6);

    return { timeline: tl, debug: { camera, boy, stars } };
  },
};
