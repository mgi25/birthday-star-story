import { gsap, EASE } from './gsap.js';

/**
 * A 2-D parallax camera.
 *
 * `state.x / state.y` are the camera position in world units. Negative y means
 * the camera is tilted up towards the sky. Each registered layer is offset by
 * -camera * depth (with an optional separate horizontal depth), so depth 1
 * moves with the world, depth 0 never moves, and depth > 1 (foreground) moves
 * faster than the world.
 *
 * `state.zoom` scales the world container around `state.focusX/Y` (screen
 * units: x from the centre, y from the top) for pushes and pull-backs. The
 * sky and stars live outside that container: like real distant things they
 * don't grow when the camera dollies in.
 *
 * Reduced motion: moves become a few clean cuts (stepped eases) instead of
 * long pans, and following snaps between fixed framings.
 */
export function createCamera(stage, { x = 0, y = 0, zoom = 1, focusX = 0, focusY = 600, reduced = false } = {}) {
  const state = { x, y, zoom, focusX, focusY };
  const layers = [];
  let world = null;

  function apply() {
    const { u } = stage.metrics;
    for (const layer of layers) {
      const tx = -state.x * layer.depthX * u;
      const ty = -state.y * layer.depth * u;
      layer.el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    }
    if (world) {
      world.style.transformOrigin = `calc(50% + ${state.focusX * u}px) ${state.focusY * u}px`;
      world.style.transform = state.zoom === 1 ? '' : `scale(${state.zoom.toFixed(5)})`;
    }
  }

  const offResize = stage.onResize(apply);

  /** In reduced motion, a long move becomes a handful of cuts. */
  const easeFor = (duration, ease) => (reduced ? `steps(${Math.max(1, Math.round(duration / 2.5))})` : ease);

  return {
    state,
    reduced,
    apply,
    /** Register a layer element with its parallax depth (and optional horizontal depth). */
    add(el, depth, depthX = depth) {
      layers.push({ el, depth, depthX });
      apply();
      return el;
    },
    /** The element that receives zoom. */
    setWorld(el) {
      world = el;
      apply();
    },
    set(vars) {
      Object.assign(state, vars);
      apply();
    },
    /**
     * Where a world point appears on screen right now (screen units: x from
     * the centre, y from the top), including parallax and zoom.
     */
    toScreen(wx, wy, depth = 1, depthX = depth) {
      const sx = wx - state.x * depthX;
      const sy = wy - state.y * depth;
      return [state.focusX + (sx - state.focusX) * state.zoom, state.focusY + (sy - state.focusY) * state.zoom];
    },
    /** Tween the camera. Returns the tween so it can sit in a timeline. */
    to(vars) {
      const { onUpdate, duration = 1, ease = EASE.camera, ...rest } = vars;
      return gsap.to(state, {
        duration,
        ease: easeFor(duration, ease),
        ...rest,
        onUpdate() {
          apply();
          onUpdate?.();
        },
      });
    },
    /**
     * Track a moving subject for `duration` seconds. getters return the wanted
     * camera x / y. Runs inside the timeline (not the ticker) so everything
     * drawn this frame sees the same camera. Reduced motion snaps every `snap` units.
     */
    follow({ x: getX, y: getY, duration, snap = 230 }) {
      const proxy = { p: 0 };
      const q = (v) => (reduced ? Math.round(v / snap) * snap : v);
      return gsap.to(proxy, {
        p: 1,
        duration,
        ease: 'none',
        onUpdate() {
          if (getX) state.x = q(getX());
          if (getY) state.y = q(getY());
          apply();
        },
      });
    },
    destroy() {
      offResize();
      layers.length = 0;
      world = null;
    },
  };
}
