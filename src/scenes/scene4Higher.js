import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES } from '../components/character.js';
import { createCaptions } from '../components/caption.js';
import { createWash } from '../components/wash.js';
import { buildJourney, SKY } from '../worlds/journey.js';
import { mountainY, STAGES } from '../worlds/mountain.js';
import { SCENE3_EXIT, CANOPY_STAR } from './scene3Forest.js';

/*
 * SCENE 4 — HIGHER
 *
 * Opens on the sky above the forest (Scene 3's last frame) and cranes down
 * to the foot of the mountain path, where he is already walking. He climbs
 * the lower slope among the last trees. Then the camera rises up through the
 * bank of cloud — and when it clears he is hauling himself onto a high ledge,
 * the cloud now below him, the town a few lights far down. The wind is
 * stronger. He slips once (and checks nobody saw). The camera rises into
 * cloud again, toward the summit.
 */

/** Frame the boy this far left of centre and this high on screen while climbing. */
const FRAME = { x: 70, y: 760 };
const UPHILL = 44;

export default {
  id: 'scene4',
  title: 'Higher',
  next: 'scene5',
  ambience: 'amb.mountain',
  music: 0.45,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();
    const h = handoff ?? {};

    const camera = createCamera(stage, { x: 1306, y: SCENE3_EXIT.camY, zoom: 1, focusX: 40, focusY: 560, reduced, ...h.camera });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildJourney(ctx, frame, camera, { camX: [1250, 3000] });
    const { field } = w;
    field.state.dim = h.dim ?? 0.82;
    field.addHero({ ...SKY.second, size: 1.6, alpha: 0.75, tint: 0 });
    const star = field.addHero({ ...CANOPY_STAR, alpha: 1, glow: 0.8, flare: 0.55, pulse: 0.6 });
    const m = w.mountain.layers;
    const mist = createWash(frame.picture, 'mist', 1);
    gsap.set(mist, { yPercent: -80 });
    const wash = createWash(frame.picture, 'cloud', 0);

    const boy = createCharacter({ stage, reduced, x: STAGES.A.from + 70, ...POSES.straps, armSwing: 0.4, head: -6, wind: 0.9 });
    boy.setGround(mountainY);
    w.ground.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    ctx.onCleanup(boy.onStep(() => audio.play('sfx.footstepRock', { rate: 0.85 + Math.random() * 0.25 })));

    const story = el('div', 'story-ui', frame.ui);
    const captions = createCaptions(story, { reduced, announce: ctx.announce });
    const [kept, surely, higher, closer] = ['So he kept going.', 'Because surely…', '…the higher he went…', '…the closer he would be.'].map((t) => captions.line(t));

    // Never let the camera dip below the ground line (the world ends there).
    const target = () => ({ x: boy.pose.x + FRAME.x, y: Math.min(0, boy.pose.y - FRAME.y) });
    // Hanging forest branches would float mid-air once we're among the rocks.
    if (w.layers.fgCanopy) gsap.set(w.layers.fgCanopy.el, { opacity: 0 });
    const follow = (duration) => camera.follow({ x: () => target().x, y: () => target().y, duration });
    const tl = gsap.timeline({ paused: true });

    // --- Crane down from the sky to the foot of the path, easing into tracking.
    const start = { x: camera.state.x, y: camera.state.y };
    const blend = { k: 0 };
    const crane = () => {
      const t = target();
      const k = reduced ? (blend.k < 1 ? 0 : 1) : blend.k;
      camera.set({ x: start.x + (t.x - start.x) * k, y: start.y + (t.y - start.y) * k });
    };
    const stepX = 2205;
    const toStep = boy.stroll(stepX, { from: STAGES.A.from + 70, speed: UPHILL, accel: 0.8, decel: 0.5 });
    tl.add(toStep, 0.2);
    tl.to(blend, { k: 1, duration: 3.6, ease: EASE.camera, onUpdate: crane }, 0);
    tl.to(star, { alpha: 0.6, glow: 0.3, flare: 0.2, duration: 3 }, 0.5);
    tl.add(kept.play({ hold: 2.2 }), 2.6);

    // A big step up: a hand on the rock, and up.
    tl.addLabel('step', 0.2 + toStep.duration());
    tl.add(boy.to({ ...POSES.reachUp, armFU: -95, armFL: -20, lean: 10, head: -10 }, { duration: 0.4 }), 'step');
    tl.add(boy.to({ lift: -5 }, { duration: 0.35, ease: 'power2.out' }), 'step+=0.3');
    tl.add(boy.stroll(STAGES.A.to, { from: stepX, speed: UPHILL, accel: 0.4, decel: 1.2 }), 'step+=0.45');
    tl.add(boy.to({ lift: 0, ...POSES.straps, lean: 0, head: -4 }, { duration: 0.5 }), 'step+=0.65');
    const stageAEnd = tl.duration();
    tl.add(follow(stageAEnd - 3.6), 3.6);

    // --- Up through the cloud bank. While the cloud fills the frame, he gains the ledge above.
    const [lx, ly] = STAGES.B.ledge;
    const ridge = { x: STAGES.B.from + FRAME.x, y: Math.min(0, mountainY(STAGES.B.from) - FRAME.y) };
    tl.addLabel('crane', stageAEnd - 0.3);
    tl.add(camera.to({ x: ridge.x, y: ridge.y, duration: 3.4, ease: EASE.camera }), 'crane');
    if (reduced) {
      // no sweeping motion: the cloud simply fades up and away in place
      gsap.set(mist, { yPercent: 0, opacity: 0 });
      tl.to(mist, { opacity: 1, duration: 1, ease: 'sine.inOut' }, 'crane+=0.6');
      tl.to(mist, { opacity: 0, duration: 1.2, ease: 'sine.inOut' }, 'crane+=1.9');
    } else {
      tl.to(mist, { yPercent: 80, duration: 2.4, ease: 'none' }, 'crane+=0.5');
    }
    const covered = tl.labels.crane + 0.5 + 1.2; // the mist's opaque middle is over the frame
    tl.call(() => boy.setGround(null), null, covered);
    tl.set(boy.pose, { x: lx - 8, y: ly + 34, ...POSES.reachUp, armBU: -150, armBL: -10, lean: 12, head: -20, lift: 0, armSwing: 0.4 }, covered);
    tl.set(m.valleyTown.el, { opacity: 1 }, covered);
    // The forest is far below now; its tall near trees must not poke up beside the ridge.
    const forest = ['forestNear', 'forestMid', 'fgFloor'].map((n) => w.layers[n]?.el).filter(Boolean);
    tl.set(forest, { opacity: 0 }, covered);
    tl.set(star, { alpha: 0 }, covered);
    tl.set(boy.pose, { wind: 1.35 }, covered);
    tl.add(surely.play({ hold: 1.4 }), 'crane+=1');
    tl.call(() => audio.setMusic(0.6, { fade: 4 }), null, 'crane');

    // He hauls himself over the edge.
    tl.addLabel('haul', 'crane+=3.1');
    tl.add(boy.to({ y: ly + 4, lean: 6 }, { duration: 0.9, ease: 'power2.out' }), 'haul');
    tl.call(() => audio.play('sfx.rustle'), null, 'haul+=0.1');
    tl.add(boy.to({ x: STAGES.B.from, y: mountainY(STAGES.B.from), ...POSES.straps, lean: 2, head: -6 }, { duration: 0.6, ease: 'sine.inOut' }), 'haul+=0.8');
    tl.call(() => boy.setGround(mountainY), null, 'haul+=1.4');

    // --- The high ridge: open sky, cloud below, stronger wind. He slips.
    const slipX = 2540;
    tl.addLabel('ridge', 'haul+=1.45');
    tl.add(boy.stroll(slipX, { from: STAGES.B.from, speed: UPHILL, accel: 0.8, decel: 0.2 }), 'ridge');
    tl.addLabel('slip', '>');
    tl.call(() => audio.play('sfx.slip'), null, 'slip');
    tl.add(boy.to({ x: slipX - 16, lean: -15, lift: 3, ...POSES.flail, head: -12 }, { duration: 0.26, ease: 'power2.out' }), 'slip');
    tl.add(boy.to({ lean: 4, lift: 0, ...POSES.rest, head: -2 }, { duration: 0.5, ease: 'back.out(2)' }), 'slip+=0.32');
    tl.add(boy.turn(-1, { duration: 0.3 }), 'slip+=1.2');
    tl.add(boy.to({ head: 4 }, { duration: 0.3 }), 'slip+=1.2');
    tl.add(boy.turn(1, { duration: 0.3 }), 'slip+=2');
    tl.add(boy.to({ ...POSES.straps, head: -4, lean: 0 }, { duration: 0.6 }), 'slip+=2.3');
    tl.add(higher.play({ hold: 1.5 }), 'slip+=2.5');
    tl.add(boy.stroll(STAGES.B.from + 300, { from: slipX - 16, speed: UPHILL - 4, accel: 0.8, decel: 1.4 }), 'slip+=2.7');
    tl.add(closer.play({ hold: 1.9 }), 'slip+=6.7');
    const ridgeEnd = tl.labels.slip + 7.6;
    tl.add(follow(ridgeEnd - tl.labels.ridge), 'ridge');
    tl.add(boy.to({ head: -32 }, { duration: 1.2 }), 'slip+=7');

    // --- The camera rises into cloud (after the last line has gone).
    tl.addLabel('rise', 'slip+=8.3');
    tl.add(camera.to({ y: '-=320', x: '+=40', duration: 3, ease: 'power1.in' }), 'rise');
    tl.to(wash, { opacity: 1, duration: 2.4, ease: 'sine.in' }, 'rise+=0.6');
    tl.call(() => ctx.next({ transition: 'cut', handoff: { wash: 1 } }), null, 'rise+=3');

    return { timeline: tl, debug: { camera, boy, field } };
  },
};
