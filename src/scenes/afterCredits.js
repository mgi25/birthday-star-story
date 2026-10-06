import { gsap, EASE } from '../animation/gsap.js';
import { el } from '../core/dom.js';
import { createFireflies } from '../components/fireflies.js';
import { createCineButton } from '../components/cineButton.js';

/*
 * AFTER THE CREDITS
 *
 * Darkness. The firefly from the forest drifts in, stops in the middle,
 * and has the last word. Then it goes, and the film offers to start again.
 */

export default {
  id: 'credits',
  title: 'After the credits',
  ambience: null,
  music: 0,

  create(ctx) {
    const { stage, audio, reduced } = ctx;
    const frame = ctx.frame();
    frame.backdrop.style.background = '#000';

    const flies = createFireflies({ stage, reduced, seed: 77 });
    frame.world.appendChild(flies.el);
    ctx.onCleanup(flies.destroy);
    const edge = () => stage.metrics.halfWidth + 60;
    const fly = flies.add({ x: -900, y: 520, size: 1.5, alpha: 1, glow: 1.2, wander: 5 });

    const line = el('p', 'credits-line', frame.ui);
    line.textContent = 'Still counts as a star.';

    const again = el('div', 'credits-again', frame.ui);
    const button = createCineButton({ label: 'Watch again', parent: again, reduced, onPress: () => ctx.goTo('scene1') });

    const tl = gsap.timeline({ paused: true });

    // Two seconds of darkness. Then, from the side, a small light.
    tl.set(fly, { x: () => -edge(), y: 560 }, 0);
    tl.to(fly, {
      keyframes: [
        { x: () => -edge() * 0.55, y: 500, duration: 1.5, ease: 'sine.inOut' },
        { x: () => -edge() * 0.2, y: 540, duration: 1.3, ease: 'sine.inOut' },
        { x: 0, y: 470, duration: 1.6, ease: 'sine.out' },
      ],
    }, 2);
    tl.call(() => audio.play('sfx.firefly'), null, 2.4);
    tl.to(fly, { wander: 3, glow: 1.5, duration: 1 }, 6.2);

    // It stops in the middle.
    tl.call(() => ctx.announce(line.textContent), null, 7.2);
    tl.fromTo(line, { autoAlpha: 0, y: reduced ? 0 : 6 }, { autoAlpha: 1, y: 0, duration: 1.8, ease: EASE.arrive }, 7.2);

    // A pause. And away it goes.
    tl.to(fly, { x: () => edge(), y: 130, wander: 6, duration: 3.4, ease: 'power1.in' }, 11.6);
    tl.to(line, { autoAlpha: 0, duration: 1.6, ease: EASE.drift }, 11.8);

    // Completely dark. Then, quietly, the way back to the beginning.
    tl.add(button.show({ duration: 2 }), 17);

    return { timeline: tl };
  },
};
