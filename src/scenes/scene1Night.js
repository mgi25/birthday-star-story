import './scene1Night.css';
import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { createCineButton } from '../components/cineButton.js';
import { buildJourney, settleWindows, groundY, PLACES, SKY } from '../worlds/journey.js';

/*
 * SCENE 1 — THE NIGHT
 *
 * Black. One tiny star, then another. The night fills in, the camera tilts
 * down to a small quiet town, and a boy stands outside looking up. One star
 * shines brighter; he notices; he has a thought. "Begin".
 *
 * After Begin he gathers himself and the film continues straight into
 * Scene 2 with an invisible cut (same world, same frame).
 */

/** Camera y while gazing at the open sky. */
const LOOK_UP = -1400;

/** Timing, in seconds. Later beats are placed relative to the narration. */
const BEAT = {
  firstStar: 0.8,
  secondStar: 2.9,
  nightFalls: 4.2,
  pan: 5.6,
  panDuration: 8.8,
  line1: 13.3,
};

const LINES = [
  'Once, there was a boy who spent far too much time looking at the stars.',
  'One night, he had a thought.',
  'What if he could find the brightest one?',
];

/** How the brightest star looks once it has shone (Scene 2 continues from this). */
export const HERO_SHINING = { alpha: 1, size: 2.4, glow: 1, flare: 1, pulse: 1 };

export default {
  id: 'scene1',
  title: 'The Night',
  next: 'scene2',
  ambience: 'amb.town',
  music: 0,

  create(ctx) {
    const { stage, audio, reduced } = ctx;
    const frame = ctx.frame();

    const camera = createCamera(stage, { y: reduced ? 0 : LOOK_UP, focusX: 40, focusY: 560, reduced });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildJourney(ctx, frame, camera, { camX: [0, 0] });
    const { field } = w;

    const boy = createCharacter({
      stage,
      reduced,
      x: PLACES.boyStart,
      y: groundY(PLACES.boyStart),
      ...POSES.pockets,
      head: -26,
      lean: -2,
      wind: 0.7,
    });
    w.ground.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);

    const hero = field.addHero({ ...SKY.hero, size: 2, tint: 1 });
    const second = field.addHero({ ...SKY.second, size: 1.6, tint: 0 });
    field.state.reveal = 0;

    // --- narration and the Begin button
    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const [line1, line2, line3] = LINES.map((text) => captions.line(text));

    const begin = createCineButton({
      label: 'Begin',
      parent: story,
      reduced,
      onPress: () => {
        // Inside the click: the one moment browsers allow sound to start.
        audio.unlock();
        audio.play('sfx.chime');
        ctx.track(() => {
          const out = gsap.timeline();
          out.add(begin.hide(), 0);
          out.add(line3.hide({ duration: 1.1 }), 0.1);
          out.to(hero, { glow: 1.5, duration: 1.4, ease: EASE.arrive }, 0.2);
          if (!reduced) {
            // a small determined hop
            out.add(boy.to({ lift: 2 }, { duration: 0.22, ease: 'power2.in' }), 0.55);
            out.add(boy.to({ lift: -3.5 }, { duration: 0.26, ease: 'power2.out' }));
            out.add(boy.to({ lift: 0 }, { duration: 0.24, ease: 'power2.in' }));
          }
          // Hand over to Scene 2 on exactly this frame.
          out.call(
            () =>
              ctx.next({
                transition: 'cut',
                handoff: { camera: { ...camera.state }, boy: boy.state(), hero: { ...hero }, second: { ...second }, dim: field.state.dim },
              }),
            null,
            reduced ? 1.3 : 1.7,
          );
        });
      },
    });

    // --- quiet life in the town
    const { off: windowOff, on: windowOn } = settleWindows(w.town);
    if (windowOn) gsap.set(windowOn, { opacity: 0 });

    // --- initial state
    const nightLayers = [w.layers.sky.el, w.layers.moon.el, w.layers.clouds.el];
    const townLayers = Object.entries(w.layers)
      .filter(([name]) => !['sky', 'moon', 'clouds'].includes(name))
      .map(([, layer]) => layer.el);
    gsap.set(nightLayers, { opacity: 0 });
    if (reduced) gsap.set(townLayers, { opacity: 0 });

    // --- the film
    const tl = gsap.timeline({ paused: true });

    // Black. One tiny star appears. Then another.
    tl.to(hero, { alpha: 0.9, glow: 0.2, duration: 2.4, ease: EASE.drift }, BEAT.firstStar);
    tl.to(second, { alpha: 0.75, duration: 2.0, ease: EASE.drift }, BEAT.secondStar);

    // Slowly the night sky becomes visible.
    tl.to(field.state, { reveal: 1, duration: 7.5, ease: 'power1.in' }, BEAT.nightFalls);
    tl.to(nightLayers, { opacity: 1, duration: 7, ease: EASE.drift }, BEAT.nightFalls + 0.4);

    // The camera moves down; a small quiet town appears; the boy, looking up.
    if (reduced) {
      tl.to(townLayers, { opacity: 1, duration: 3.5, ease: EASE.drift }, BEAT.pan + 2);
    } else {
      tl.add(camera.to({ y: 0, duration: BEAT.panDuration }), BEAT.pan);
    }

    // "Once, there was a boy…"
    tl.add(line1.play(), BEAT.line1);
    if (windowOff) tl.to(windowOff, { opacity: 0, duration: 0.25, ease: 'none' }, BEAT.line1 + 5.2);

    // Pause. He keeps looking up, settling his weight.
    tl.add(boy.to({ head: -22, lean: -1 }, { duration: 2.4 }), '-=0.6');

    // One star suddenly shines brighter than the others.
    tl.addLabel('shine', '-=0.5');
    tl.to(hero, { alpha: 1, size: 2.4, glow: 1, flare: 1, duration: 2.6, ease: 'power2.inOut' }, 'shine');
    tl.to(hero, { pulse: 1, duration: 2.5 }, 'shine+=1.8');
    tl.to(field.state, { dim: 0.82, duration: 2.6 }, 'shine');
    tl.call(() => audio.play('sfx.twinkle'), null, 'shine+=0.5');

    // He notices. His head tilts upward.
    tl.addLabel('notice', 'shine+=1.15');
    tl.add(boy.to({ head: -34 }, { duration: 0.9, ease: EASE.react }), 'notice');
    tl.add(boy.to({ lift: -2.4 }, { duration: 0.26, ease: 'power2.out', yoyo: true, repeat: 1 }), 'notice');
    tl.add(boy.to({ ...POSES.rest, lean: -3.5 }, { duration: 1.1, ease: EASE.settle }), 'notice+=0.25');

    // "One night, he had a thought." He looks down, hand to chin.
    tl.addLabel('thought', 'notice+=2.1');
    tl.add(boy.to({ ...POSES.thinking, head: -4, lean: 0 }, { duration: 1.3 }), 'thought');
    tl.add(line2.play({ hold: 3.2 }), 'thought+=0.4');
    if (windowOn) tl.to(windowOn, { opacity: 0.85, duration: 0.25, ease: 'none' }, 'thought+=2.2');

    // "What if he could find the brightest one?" Eyes back up, straps gripped.
    tl.addLabel('question', '+=0.7');
    tl.add(boy.to({ ...POSES.rest, head: -24 }, { duration: 1.1 }), 'question-=1.3');
    tl.add(boy.to({ ...POSES.straps, head: -33, lean: 1.5 }, { duration: 1.4, ease: EASE.settle }), 'question');
    tl.add(line3.play({ keep: true }), 'question+=0.4');

    // Begin.
    tl.add(begin.show(), '+=1.1');

    // A slow push-in under the whole narration.
    if (!reduced) {
      tl.add(camera.to({ zoom: 1.045, duration: tl.duration() - BEAT.line1, ease: 'sine.inOut' }), BEAT.line1);
    }

    return { timeline: tl };
  },
};
