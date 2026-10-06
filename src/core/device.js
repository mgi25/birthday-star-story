/**
 * Device and preference flags. Query params let you force them while testing:
 *   ?motion=reduced   simulate prefers-reduced-motion
 *   ?quality=low      simulate a low-powered phone
 */
const params = new URLSearchParams(window.location.search);
const reducedQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');

const cores = navigator.hardwareConcurrency || 8;
const memory = navigator.deviceMemory || 8;

export const device = {
  get reducedMotion() {
    return params.get('motion') === 'reduced' || Boolean(reducedQuery?.matches);
  },
  lowPower: params.get('quality') === 'low' || cores <= 2 || memory <= 2,
  /** Cap for canvas resolution; full device DPR is wasted on soft star glows. */
  get maxDpr() {
    return this.lowPower ? 1.25 : 2;
  },
};
