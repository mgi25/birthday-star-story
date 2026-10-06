import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { createStarfield } from '../components/starfield.js';
import { buildJourney, settleWindows, groundY, trackY, PLACES, SKY } from '../worlds/journey.js';
import { HERO_SHINING } from './scene1Night.js';

/*
 * SCENE 2 — THE FIRST STAR
 *
 * Continues on Scene 1's exact last frame. He walks out through town toward
 * the bright star, the camera tracking alongside. On a small hill at the edge
 * of town the star comes down, close enough to touch. He reaches for it —
 * and it simply goes out. A warm glow appears beyond, toward the forest.
 */

const HILL_X = PLACES.hill.x;
const WALK_SPEED = 74;
/** Where the camera sits relative to him while walking (screen units, + = ahead). */
const LEAD = 74;

/** He leaves the hill at this pace; Scene 3 continues it. */
export const SCENE2_EXIT = { speed: 64, lead: LEAD };

export default {
  id: 'scene2',
  title: 'The First Star',
  next: 'scene3',
  ambience: 'amb.town',
  music: 0.3,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();
    const h = handoff ?? {};

    const camera = createCamera(stage, { x: 0, y: 0, zoom: 1.045, focusX: 40, focusY: 560, reduced, ...h.camera });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildJourney(ctx, frame, camera, { camX: [0, 1100] });
    const { field } = w;
    field.state.dim = h.dim ?? 0.82;

    // the state Scene 1 leaves the town in
    const { off, on } = settleWindows(w.town);
    if (off) gsap.set(off, { opacity: 0 });
    if (on) gsap.set(on, { opacity: 0.85 });

    const boy = createCharacter({
      stage,
      reduced,
      x: PLACES.boyStart,
      ...POSES.straps,
      head: -33,
      lean: 1.5,
      wind: 0.7,
      ...h.boy,
    });
    boy.setGround(groundY);
    w.ground.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    ctx.onCleanup(boy.onStep(() => audio.play('sfx.footstep', { rate: 0.9 + Math.random() * 0.2 })));

    const skyHero = field.addHero({ ...SKY.hero, tint: 1, ...HERO_SHINING, glow: 1.5, ...h.hero });
    field.addHero({ ...SKY.second, size: 1.6, alpha: 0.75, tint: 0, ...h.second });

    // When the star comes down to the hill it must pass in front of the town,
    // so it moves to a second (starless) canvas in the world, just ahead of the
    // boy's layer. Same sprite, same spot: the hand-over is invisible.
    const near = createStarfield({ stage, density: 0, reduced });
    frame.world.insertBefore(near.el, w.layers.foreground.el);
    ctx.onCleanup(near.destroy);
    const hero = near.addHero({ x: 0, y: 0, tint: 1, ...HERO_SHINING, glow: skyHero.glow, alpha: 0 });

    const glow = w.layers.forestFar?.svg.querySelector('[data-glow]');

    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const line = captions.narrated('scene2-01'); // "Apparently, stars were harder to catch than he expected."

    // --- the bright star's approach: it leaves the sky and comes down to the hill
    // Positions for the near star are in the world container's own (pre-zoom) space.
    const unzoom = ([x, y]) => {
      const { focusX: fx, focusY: fy, zoom } = camera.state;
      return [fx + (x - fx) / zoom, fy + (y - fy) / zoom];
    };
    const skyScreen = () => unzoom(field.screenOf(skyHero));
    const hoverScreen = () => [boy.pose.x + 24 - camera.state.x, boy.pose.y - 132 - camera.state.y];
    const approach = { k: 0 };
    const placeHero = () => {
      const [sx, sy] = skyScreen();
      const [tx, ty] = hoverScreen();
      const k = approach.k;
      hero.x = sx + (tx - sx) * k;
      hero.y = sy + (ty - sy) * k;
    };

    // --- the film
    const tl = gsap.timeline({ paused: true });
    const lead = { v: camera.state.x - boy.pose.x };

    // Settle back from Scene 1's push-in; eyes forward; off he goes.
    tl.add(camera.to({ zoom: 1, duration: 2.2, ease: 'sine.inOut' }), 0);
    tl.add(boy.to({ head: -10, lean: 0, armSwing: 0.25 }, { duration: 0.8 }), 0.3);
    tl.add(boy.stroll(HILL_X, { speed: WALK_SPEED, accel: 1.1, decel: 1.8 }), 0.6);
    const walkEnd = tl.duration();
    tl.to(lead, { v: LEAD, duration: 3, ease: 'sine.inOut' }, 0.6);
    tl.add(camera.follow({ x: () => boy.pose.x + lead.v, y: () => trackY(boy.pose.x), duration: walkEnd - 0.6 }), 0.6);

    // He keeps glancing up at it while he walks.
    tl.add(boy.to({ head: -28 }, { duration: 0.7, yoyo: true, repeat: 1, repeatDelay: 0.8 }), 3.4);
    tl.add(boy.to({ head: -24 }, { duration: 0.6, yoyo: true, repeat: 1, repeatDelay: 0.6 }), 7.2);

    // As he climbs the hill, the star comes down to meet him.
    const approachAt = walkEnd - 3.6;
    tl.call(placeHero, null, approachAt);
    tl.set(hero, { alpha: 1 }, approachAt);
    tl.set(skyHero, { alpha: 0 }, approachAt);
    tl.to(approach, { k: 1, duration: 3.8, ease: 'sine.inOut', onUpdate: placeHero }, approachAt);
    tl.to(hero, { size: 3, glow: 1.9, duration: 3.8, ease: 'sine.inOut' }, approachAt);
    tl.add(boy.to({ head: -40, lean: -2 }, { duration: 2.6 }), approachAt + 1);

    // He stops. Looks up. Slowly stretches his hand toward it.
    tl.addLabel('reach', walkEnd + 0.5);
    const holdPin = { t: 0 };
    tl.to(holdPin, { t: 1, duration: 6.5, ease: 'none', onUpdate: placeHero }, walkEnd);
    tl.add(camera.to({ zoom: 1.38, focusX: -30, focusY: 790, duration: 3.2, ease: 'sine.inOut' }), 'reach-=0.4');
    tl.add(boy.to({ ...POSES.reachUp, armSwing: 1, lean: 3, lift: -2.5, head: -46 }, { duration: 2.4, ease: 'power1.inOut' }), 'reach');
    tl.to(hero, { pulse: 1.4, duration: 1.6 }, 'reach+=0.6');

    // Just before he touches it: it blinks out.
    tl.addLabel('blink', 'reach+=2.7');
    tl.to(hero, { alpha: 0.3, duration: 0.07, ease: 'none' }, 'blink');
    tl.to(hero, { alpha: 0.85, duration: 0.09, ease: 'none' }, 'blink+=0.07');
    tl.to(hero, { alpha: 0, glow: 0.4, duration: 0.22, ease: 'power2.in' }, 'blink+=0.16');
    tl.call(() => audio.play('sfx.starBlink'), null, 'blink');

    // He freezes. Then looks at his empty hand.
    tl.add(boy.to({ ...POSES.lookHand, lift: 0, lean: 1, head: -14 }, { duration: 1.1, ease: 'power2.inOut' }), 'blink+=0.9');

    // "Apparently, stars were harder to catch than he expected."
    const said = captions.at(tl, line, 'blink+=2', { hold: 3.1 });
    tl.add(boy.to({ head: -6 }, { duration: 0.5, ease: 'power1.inOut', yoyo: true, repeat: 1 }), 'blink+=3');
    tl.add(boy.to({ ...POSES.rest, head: 2, lean: 0, lift: 0.8 }, { duration: 1.6 }), 'blink+=4.6');
    tl.add(camera.to({ zoom: 1, focusX: 40, focusY: 560, duration: 3.4, ease: 'sine.inOut' }), 'blink+=4.6');

    // A faint warm glow, farther away, toward the forest. He notices (once the line has been said).
    if (glow) tl.to(glow, { opacity: 1, duration: 2.4, ease: EASE.drift }, 'blink+=5.1');
    tl.addLabel('notice', Math.max(tl.labels.blink + 6.2, said.speechEnd + 0.5));
    tl.add(boy.to({ head: 6, lean: 2, lift: -1.4 }, { duration: 0.7, ease: EASE.react }), 'notice');
    tl.add(boy.to({ lift: 0 }, { duration: 0.5 }), 'notice+=0.7');

    // He adjusts his straps, and goes.
    tl.add(boy.to({ ...POSES.straps, head: -2, armSwing: 0.25, lean: 0 }, { duration: 0.9, ease: EASE.settle }), 'notice+=1.2');
    tl.call(() => audio.play('sfx.rustle'), null, 'notice+=1.3');
    tl.addLabel('go', 'notice+=1.8');
    const exitFrom = HILL_X;
    tl.add(boy.stroll(exitFrom + 400, { from: exitFrom, speed: SCENE2_EXIT.speed, accel: 1.2, decel: 0 }), 'go');
    tl.to(lead, { v: LEAD, duration: 0.1 }, 'go');
    tl.add(camera.follow({ x: () => boy.pose.x + lead.v, y: () => trackY(boy.pose.x), duration: 2.6 }), 'go');

    // Continue into the forest (Scene 3) mid-stride, on this exact frame.
    tl.call(
      () =>
        ctx.next({
          transition: 'cut',
          handoff: { camera: { ...camera.state }, boy: boy.state(), dim: field.state.dim, glow: glow ? Number(gsap.getProperty(glow, 'opacity')) : 1 },
        }),
      null,
      'go+=1.9',
    );

    return { timeline: tl, debug: { hero, camera, boy, field } };
  },
};
