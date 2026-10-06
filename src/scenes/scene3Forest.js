import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { createFireflies } from '../components/fireflies.js';
import { buildJourney, groundY, trackY, PLACES, SKY } from '../worlds/journey.js';
import { SCENE2_EXIT } from './scene2FirstStar.js';

/*
 * SCENE 3 — THE FOREST
 *
 * Continues mid-stride from Scene 2. The town falls behind and trees take
 * over. Small lights drift between the trunks; one grows brighter and he is
 * sure it's a star. It leads him left, then right. He catches it in both
 * hands… a firefly. "Close enough." It rises past the canopy, where a real
 * star is waiting, and his curiosity comes back.
 */

const STOP_X = 1120;
/** Where Scene 3 hands over: the camera looking up into the sky above the trees. */
export const SCENE3_EXIT = { camY: -1150 };
/** The star he sees through the canopy (sky coordinates). */
export const CANOPY_STAR = { x: 119, y: 102, size: 2.2, tint: 1 };

export default {
  id: 'scene3',
  title: 'The Forest',
  next: 'scene4',
  ambience: 'amb.forest',
  music: 0.35,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();
    const h = handoff ?? {};

    // Default entry (?scene=3) matches where Scene 2 leaves him.
    const startX = h.boy?.x ?? PLACES.hill.x + 94;
    const camera = createCamera(stage, { x: startX + SCENE2_EXIT.lead, y: trackY(startX), zoom: 1, focusX: 40, focusY: 560, reduced, ...h.camera });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildJourney(ctx, frame, camera, { camX: [700, 1650] });
    const { field } = w;
    field.state.dim = h.dim ?? 0.82;
    field.addHero({ ...SKY.second, size: 1.6, alpha: 0.75, tint: 0 });
    const star = field.addHero({ ...CANOPY_STAR, alpha: 0 });

    const glow = w.layers.forestFar?.svg.querySelector('[data-glow]');
    if (glow) gsap.set(glow, { opacity: h.glow ?? 1 });

    const boy = createCharacter({
      stage,
      reduced,
      x: startX,
      ...POSES.straps,
      head: -2,
      armSwing: 0.25,
      wind: 0.7,
      walkAmount: 1,
      ...h.boy,
    });
    boy.setGround(groundY);
    w.ground.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    ctx.onCleanup(boy.onStep(() => audio.play('sfx.footstep', { rate: 0.85 + Math.random() * 0.2 })));

    // Fireflies live among the trees, just ahead of the boy's layer.
    const flies = createFireflies({ stage, camera, reduced });
    frame.world.insertBefore(flies.el, w.layers.foreground.el);
    ctx.onCleanup(flies.destroy);
    flies.swarm({ x0: STOP_X - 380, x1: STOP_X + 420, y0: 600, y1: 860, count: 16 });
    // From afar it is only a light (form 0); in his hands it is a firefly (form 1).
    const fly = flies.addHero({ x: STOP_X + 85, y: 742, size: 1.2, alpha: 0, glow: 0.4, wander: 7, length: 9.5 });

    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const line = captions.narrated('scene3-01'); // "Close enough."

    // Where the light sits in his cupped hands / on his head (world units).
    // `perch` lifts it from inside his closed hands to standing on his open palms.
    const perch = { v: 0 };
    const handsAt = () => [boy.pose.x + 15.5 * boy.pose.facing, boy.pose.y - 59 - perch.v + boy.pose.lift];
    // On his cowlick, carried by his head tilt and lean (rig: neck at (2, -75), hips at (0, -36)).
    const turn = (x, y, deg, cy = 0) => {
      const a = (deg * Math.PI) / 180;
      return [x * Math.cos(a) - (y - cy) * Math.sin(a), cy + x * Math.sin(a) + (y - cy) * Math.cos(a)];
    };
    const headAt = () => {
      const p = boy.pose;
      const [hx, hy] = turn(2.5, -31.3, p.head);
      const [x, y] = turn(hx + 2, hy - 75, p.lean, -36);
      return [p.x + x * p.facing, p.y + y + p.lift];
    };
    // Sitting on his head it tips with it.
    const headTilt = () => (boy.pose.head + boy.pose.lean) * Math.sign(fly.facing || 1) * boy.pose.facing;
    const follow = (target, tilt) => () => {
      const [x, y] = target();
      fly.x = x;
      fly.y = y;
      if (tilt) fly.angle = headTilt();
    };

    // --- the film
    const tl = gsap.timeline({ paused: true });
    const lead = { v: camera.state.x - boy.pose.x };

    // Into the trees: he keeps his pace, then slows to a stop.
    tl.add(boy.stroll(STOP_X, { from: startX, speed: SCENE2_EXIT.speed, accel: 0, decel: 1.7, autoTurn: false }), 0);
    const arrive = tl.duration();
    tl.to(lead, { v: 26, duration: arrive, ease: 'sine.inOut' }, 0);
    tl.add(camera.follow({ x: () => boy.pose.x + lead.v, y: () => trackY(boy.pose.x), duration: arrive }), 0);
    if (glow) tl.to(glow, { opacity: 0, duration: 3, ease: EASE.drift }, 0.6);
    tl.to(flies.state, { alpha: 1, duration: 3.5, ease: EASE.drift }, 1.4);
    tl.add(boy.to({ head: -18 }, { duration: 1.2, yoyo: true, repeat: 1, repeatDelay: 0.6 }), 2.4);

    // One light grows brighter. A star? He perks up.
    tl.addLabel('bright', arrive + 0.2);
    tl.to(fly, { alpha: 1, size: 2.4, glow: 1.6, duration: 1.4, ease: EASE.arrive }, 'bright');
    tl.call(() => audio.play('sfx.firefly'), null, 'bright+=0.3');
    tl.add(boy.to({ ...POSES.rest, head: -26, lean: -1, armSwing: 1 }, { duration: 0.8, ease: EASE.react }), 'bright+=0.5');
    tl.add(boy.to({ lift: -1.8 }, { duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }), 'bright+=0.6');

    // It drifts left. He follows.
    tl.addLabel('left', 'bright+=1.7');
    tl.to(fly, { x: STOP_X - 95, y: 728, duration: 1.4, ease: 'sine.inOut' }, 'left');
    tl.add(boy.stroll(STOP_X - 45, { from: STOP_X, speed: 46, accel: 0.4, decel: 0.6, facing: 1 }), 'left+=0.35');
    tl.add(boy.to({ head: -22 }, { duration: 0.6 }), 'left+=0.3');

    // Then right. He follows again.
    tl.addLabel('right', 'left+=1.7');
    tl.to(fly, { x: STOP_X + 105, y: 738, duration: 1.5, ease: 'sine.inOut' }, 'right');
    tl.add(boy.stroll(STOP_X + 70, { from: STOP_X - 45, speed: 52, accel: 0.4, decel: 0.7, facing: -1 }), 'right+=0.35');

    // It sinks to him. He closes both hands around it.
    tl.addLabel('catch', 'right+=2.1');
    tl.to(fly, { wander: 0, duration: 0.6 }, 'catch-=0.6');
    tl.to(fly, { x: STOP_X + 70 + 16, y: groundY(STOP_X + 70) - 59, duration: 0.9, ease: 'sine.inOut' }, 'catch-=0.6');
    tl.add(boy.to({ ...POSES.cupped, head: -6, lean: 2 }, { duration: 0.36, ease: 'back.out(1.6)' }), 'catch');
    tl.to(fly, { alpha: 0.6, glow: 1.3, size: 1.7, duration: 0.3 }, 'catch+=0.2');
    // Inside his hands it settles, facing him.
    tl.set(fly, { rest: 1, facing: -1, steer: false }, 'catch+=0.3');
    const inHands = { t: 0 };
    tl.to(inHands, { t: 1, duration: 4.3, ease: 'none', onUpdate: follow(handsAt) }, 'catch+=0.2');

    // The camera leans in with him, close enough to see what he has caught.
    // Zoom about a point chosen so his hands end up just below the middle of the frame.
    const CLOSE = { zoom: 3, hands: [24, 600] };
    const wide = { focusX: camera.state.focusX, focusY: camera.state.focusY };
    const closeFocus = (axis) => () => {
      const at = [STOP_X + 70 + 15.5, groundY(STOP_X + 70) - 62];
      const onScreen = at[axis] - (axis ? camera.state.y : camera.state.x);
      return (CLOSE.zoom * onScreen - CLOSE.hands[axis]) / (CLOSE.zoom - 1);
    };
    tl.set(camera.state, { focusX: closeFocus(0), focusY: closeFocus(1) }, 'catch-=0.9');
    tl.add(camera.to({ zoom: CLOSE.zoom, duration: 3.2, ease: 'sine.inOut' }), 'catch-=0.9');

    // A pause. He's thrilled.
    tl.add(boy.to({ lift: -2.2 }, { duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 3 }), 'catch+=0.7');
    tl.add(boy.to({ head: -12 }, { duration: 0.4, yoyo: true, repeat: 1 }), 'catch+=0.7');

    // Slowly, he opens his hands. A tiny firefly, its tail still glowing.
    tl.addLabel('open', 'catch+=1.9');
    tl.add(boy.to({ ...POSES.cuppedOpen, head: 2 }, { duration: 1.3, ease: 'sine.inOut' }), 'open');
    tl.to(perch, { v: 6.2, duration: 1.1, ease: 'sine.inOut' }, 'open+=0.2');
    tl.to(fly, { alpha: 1, glow: 1, size: 1.5, duration: 0.8 }, 'open+=0.5');
    tl.to(fly, { form: 1, duration: 0.9, ease: 'sine.inOut' }, 'open+=0.45');
    // He looks closer. (Time for us to look too.)
    tl.add(boy.to({ head: 7, lean: 3 }, { duration: 0.7, ease: 'sine.inOut' }), 'open+=1.4');
    // Wings out…
    tl.to(fly, { rest: 0, duration: 0.3, ease: 'power1.out' }, 'open+=2.3');

    // …it floats up and settles on his head.
    tl.addLabel('land', 'open+=2.6');
    const toHead = { k: 0 };
    tl.to(
      toHead,
      {
        k: 1,
        duration: 1.5,
        ease: 'sine.inOut',
        onUpdate() {
          const [ax, ay] = handsAt();
          const [bx, by] = headAt();
          const k = toHead.k;
          fly.x = ax + (bx - ax) * k + Math.sin(k * Math.PI) * 14;
          fly.y = ay + (by - ay) * k;
          fly.angle = headTilt();
        },
      },
      'land',
    );
    tl.to(fly, { rest: 1, duration: 0.3, ease: 'sine.out' }, 'land+=1.3');
    // Settled, it turns to face the way he does.
    tl.to(fly, { facing: 1, duration: 0.35, ease: 'power2.inOut' }, 'land+=1.6');
    tl.add(boy.to({ head: -14, ...POSES.rest }, { duration: 1.2 }), 'land+=0.3');
    // "Close enough."
    const said = captions.at(tl, line, 'land+=1.7', { hold: 2.2 });
    // The shrug is the punchline: it lands as the line ends, so a slower read only delays it.
    const late = Math.max(0, said.speechEnd - (tl.labels.land + 2.6));
    const onHead = { t: 0 };
    tl.to(onHead, { t: 1, duration: 4.2 + late, ease: 'none', onUpdate: follow(headAt, true) }, 'land+=1.5');
    tl.add(boy.to({ ...POSES.shrug, lift: -1.4, head: 5 }, { duration: 0.6, ease: 'sine.inOut' }), tl.labels.land + 2.6 + late);
    tl.add(boy.to({ ...POSES.rest, lift: 0, head: 3 }, { duration: 0.8, ease: 'sine.inOut' }), tl.labels.land + 3.5 + late);

    // The firefly rises above the trees, where a real star is shining. As the
    // camera pulls back it is just a light again, climbing towards the real one.
    tl.addLabel('rise', tl.labels.land + 4.7 + late);
    tl.to(fly, { rest: 0, duration: 0.3, ease: 'power1.out' }, 'rise-=0.3');
    tl.set(fly, { steer: true }, 'rise');
    tl.to(fly, { y: '-=640', x: '+=60', wander: 6, duration: 3.6, ease: 'power1.in' }, 'rise');
    tl.to(fly, { form: 0, duration: 1.6, ease: 'sine.in' }, 'rise+=0.9');
    tl.to(fly, { alpha: 0, duration: 1.2 }, 'rise+=2.6');
    tl.add(camera.to({ y: -360, zoom: 1, duration: 3.2, ease: 'sine.inOut' }), 'rise+=0.3');
    tl.set(camera.state, { ...wide }, 'rise+=3.6');
    tl.to(star, { alpha: 1, glow: 0.8, flare: 0.55, pulse: 0.6, duration: 2.2, ease: EASE.arrive }, 'rise+=1.6');
    if (w.layers.fgCanopy) tl.to(w.layers.fgCanopy.el, { opacity: 0, duration: 1.6, ease: EASE.drift }, 'rise+=0.4');
    tl.call(() => audio.play('sfx.twinkle'), null, 'rise+=2');

    // He looks up again. Curious. And on he goes.
    tl.add(boy.to({ head: -36, lean: -2 }, { duration: 1 }), 'rise+=0.8');
    tl.add(boy.to({ lift: -1.6 }, { duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }), 'rise+=2.6');
    tl.add(boy.to({ ...POSES.straps, head: -8, armSwing: 0.25, lean: 0 }, { duration: 0.8 }), 'rise+=3');
    tl.add(boy.stroll(STOP_X + 600, { from: STOP_X + 70, speed: 64, accel: 1, decel: 0, facing: 1 }), 'rise+=3.3');
    tl.add(camera.to({ y: SCENE3_EXIT.camY, x: '+=160', duration: 3.2, ease: 'sine.inOut' }), 'rise+=3.1');

    // Hand over to the climb (Scene 4) while we look at the sky.
    tl.call(() => ctx.next({ transition: 'cut', handoff: { camera: { ...camera.state }, dim: field.state.dim } }), null, 'rise+=5.8');

    return { timeline: tl, debug: { camera, boy, fly, flies, field } };
  },
};
