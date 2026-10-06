import { gsap } from 'gsap';

/*
 * One place to configure GSAP. Import gsap from here, never from 'gsap'
 * directly, so defaults stay consistent across scenes.
 */
gsap.defaults({ ease: 'sine.inOut', duration: 1 });

// After a tab switch or a hitch, resume smoothly instead of jumping ahead.
gsap.ticker.lagSmoothing(500, 33);

/** Named eases so scenes share a vocabulary instead of magic strings. */
export const EASE = {
  /** slow-in, slow-out camera moves */
  camera: 'power2.inOut',
  /** settling into a pose */
  settle: 'power3.out',
  /** soft fades and drifts */
  drift: 'sine.inOut',
  /** gentle arrivals (text, light) */
  arrive: 'power2.out',
  /** a small physical reaction */
  react: 'back.out(2.2)',
};

export { gsap };
