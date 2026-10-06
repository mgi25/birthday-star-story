import { device } from './device.js';

/** The stage is always DESIGN_HEIGHT world units tall; width follows the screen. */
export const DESIGN_HEIGHT = 1000;

/**
 * Responsive measurements for the full-screen stage.
 *
 * World coordinates: y runs 0 (top) → 1000 (bottom) at camera rest, and x = 0
 * is the horizontal centre. So the vertical composition is identical on every
 * screen, while wider screens simply reveal more of the world left and right.
 * Keep anything important within |x| < 200 so portrait phones see it.
 */
export function createStage(root) {
  const listeners = new Set();
  const metrics = {
    width: 1,
    height: 1,
    /** pixels per world unit */
    u: 1,
    aspect: 1,
    /** half the visible width, in world units */
    halfWidth: 500,
    portrait: true,
  };

  root.dataset.quality = device.lowPower ? 'low' : 'high';

  function measure() {
    // Some mobile browsers leave a stray scroll offset after rotating.
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    const rect = root.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    if (width === metrics.width && height === metrics.height) return;

    metrics.width = width;
    metrics.height = height;
    metrics.u = height / DESIGN_HEIGHT;
    metrics.aspect = width / height;
    metrics.halfWidth = width / metrics.u / 2;
    metrics.portrait = height >= width;

    root.style.setProperty('--u', `${metrics.u}px`);
    root.dataset.orientation = metrics.portrait ? 'portrait' : 'landscape';
    listeners.forEach((fn) => fn(metrics));
  }

  const observer = new ResizeObserver(measure);
  observer.observe(root);
  measure();

  return {
    el: root,
    metrics,
    measure,
    /** Subscribe to size changes. Returns an unsubscribe function. */
    onResize(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
