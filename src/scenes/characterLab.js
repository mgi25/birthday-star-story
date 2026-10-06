import { gsap } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { NIGHT } from '../core/palette.js';
import { createLayer } from '../components/layer.js';
import { createCharacter, POSES } from '../components/character.js';

/**
 * Dev-only turntable for the boy (open with ?scene=lab). Loops through
 * walking, turning and every named pose so the rig can be checked in
 * isolation. Not part of the film.
 */
export default {
  id: 'lab',
  title: 'Character lab',
  ambience: null,

  create(ctx) {
    const { root, stage, reduced } = ctx;
    const world = el('div', 'scene__world', root);
    world.style.background = 'linear-gradient(#0b1033, #242656 70%, #121535)';
    const ui = el('div', 'scene__ui', root);
    const label = el('p', 'lab-label', ui);

    const camera = createCamera(stage);
    ctx.onCleanup(camera.destroy);
    const ground = createLayer({
      stage,
      camera,
      name: 'ground',
      band: [700, 1000],
      svg: `<rect x="-2000" y="760" width="4000" height="240" fill="${NIGHT.ground}"/>
            <rect x="-2000" y="760" width="4000" height="1.5" fill="${NIGHT.groundRim}"/>`,
    });
    world.appendChild(ground.el);
    ctx.onCleanup(ground.destroy);

    const boy = createCharacter({ stage, reduced, x: -120, y: 760, scale: 2.4 });
    ground.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);

    const say = (text) => () => {
      label.textContent = text;
    };

    const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5 });
    tl.call(say('walk →'))
      .add(boy.walk(120, { from: -120 }))
      .call(say('look up'))
      .add(boy.to({ head: -30, lean: -3 }, { duration: 1 }), '+=0.3')
      .call(say('reach up'))
      .add(boy.to(POSES.reachUp, { duration: 1 }), '+=0.6')
      .call(say('thinking'))
      .add(boy.to({ ...POSES.rest, ...POSES.thinking, head: -10, lean: 0 }, { duration: 1 }), '+=0.6')
      .call(say('straps'))
      .add(boy.to({ ...POSES.straps, head: 0 }, { duration: 1 }), '+=0.8')
      .call(say('little hop'))
      .add(boy.to({ lift: -8 }, { duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1 }), '+=0.6')
      .call(say('← walk'))
      .add(boy.walk(-120, { from: 120 }), '+=0.6')
      .call(say('pockets, wind'))
      .add(boy.to({ ...POSES.pockets, wind: 1.4 }, { duration: 1 }))
      .add(boy.turn(1), '+=0.4')
      .add(boy.to({ ...POSES.rest, wind: 0.6 }, { duration: 1 }), '+=2');

    return { timeline: tl };
  },
};
