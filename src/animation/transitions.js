import { gsap, EASE } from './gsap.js';

/** Fade elements in (autoAlpha keeps hidden things out of the tab order). */
export function fadeIn(targets, { duration = 1.2, ease = EASE.drift, ...rest } = {}) {
  return gsap.to(targets, { autoAlpha: 1, duration, ease, ...rest });
}

export function fadeOut(targets, { duration = 1.2, ease = EASE.drift, ...rest } = {}) {
  return gsap.to(targets, { autoAlpha: 0, duration, ease, ...rest });
}

/** Swap one shot for another without moving the camera (reduced-motion cut). */
export function crossFade(from, to, { duration = 2 } = {}) {
  return gsap
    .timeline()
    .to(to, { autoAlpha: 1, duration, ease: EASE.drift }, 0)
    .to(from, { autoAlpha: 0, duration, ease: EASE.drift }, 0);
}

/**
 * The black veil used between scenes. Resolves once the fade has finished.
 * Each call overwrites the previous fade, so rapid scene changes can't stack.
 */
export function createVeil(el) {
  const fade = (opacity, duration) =>
    new Promise((resolve) => {
      const current = Number(gsap.getProperty(el, 'opacity'));
      gsap.to(el, {
        opacity,
        duration: Math.abs(current - opacity) < 0.001 ? 0 : duration,
        ease: EASE.drift,
        overwrite: true,
        onComplete: resolve,
      });
    });

  return {
    /** fade to black */
    close: (duration = 1) => fade(1, duration),
    /** fade from black */
    open: (duration = 1) => fade(0, duration),
  };
}
