import { gsap } from '../animation/gsap.js';
import { createRng } from '../core/random.js';
import { device } from '../core/device.js';

/** Warm, faintly green — close to the stars' yellow, but alive. */
const FIREFLY_RGB = [238, 246, 168];

/** A firefly glow: a fuller, softer core than a star's pinpoint. */
function makeFireflySprite([r, g, b], size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255,255,240,1)');
  grad.addColorStop(0.16, `rgba(${r},${g},${b},0.95)`);
  grad.addColorStop(0.38, `rgba(${r},${g},${b},0.38)`);
  grad.addColorStop(0.68, `rgba(${r},${g},${b},0.08)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * Fireflies: small warm lights that drift and slowly blink, drawn on one
 * canvas inside the (zoomable) world so they sit among the trees and in
 * front of the boy. Positions are world units at a parallax depth.
 *
 *   swarm({ x0, x1, y0, y1, count })   ambient fireflies around an area
 *   add({ x, y, size, alpha, glow, wander })   one you can tween; `wander`
 *     is how far it idly bobs (0 = holds perfectly still)
 *   state.alpha fades the whole swarm (not the named ones)
 *
 * Works without a camera too (fixed screen units), e.g. on a black card.
 */
export function createFireflies({ stage, camera = null, reduced = false, seed = 21 }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'starfield fireflies';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const sprite = makeFireflySprite(FIREFLY_RGB);
  const rng = createRng(seed);
  const flies = [];
  const named = [];
  const state = { alpha: 0 };
  const motion = reduced ? 0.4 : 1;
  let dpr = 1;

  function resize(m) {
    dpr = Math.min(window.devicePixelRatio || 1, device.maxDpr);
    canvas.width = Math.round(m.width * dpr);
    canvas.height = Math.round(m.height * dpr);
    draw(gsap.ticker.time);
  }

  function dot(x, y, size, alpha, glow, k, cx) {
    if (alpha <= 0.005) return;
    const px = cx + x * k;
    const py = y * k;
    const core = Math.max(4 * dpr, size * k * 6);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(sprite, px - core / 2, py - core / 2, core, core);
    if (glow > 0) {
      const halo = core * 4.2;
      ctx.globalAlpha = Math.min(1, alpha * glow * 0.3);
      ctx.drawImage(sprite, px - halo / 2, py - halo / 2, halo, halo);
    }
  }

  function draw(time) {
    const { u } = stage.metrics;
    const k = u * dpr;
    const cx = canvas.width / 2;
    const camX = camera ? camera.state.x : 0;
    const camY = camera ? camera.state.y : 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    if (state.alpha > 0.005) {
      for (const f of flies) {
        const x = f.x + motion * f.ax * Math.sin(time * f.sx + f.p1) - camX * f.d;
        const y = f.y + motion * f.ay * Math.sin(time * f.sy + f.p2) - camY * f.d;
        const blink = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(time * f.blink + f.p3), 2);
        dot(x, y, f.size, state.alpha * blink * f.a, 0.6, k, cx);
      }
    }
    for (const n of named) {
      const w = n.wander * motion;
      const x = n.x + w * Math.sin(time * 1.3 + n.p1) - camX * n.depth;
      const y = n.y + w * 0.7 * Math.sin(time * 1.7 + n.p2) - camY * n.depth;
      const blink = 0.8 + 0.2 * Math.sin(time * 2.2 + n.p1);
      dot(x, y, n.size, n.alpha * blink, n.glow, k, cx);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  const tick = (time) => draw(time);
  const offResize = stage.onResize(resize);
  resize(stage.metrics);
  gsap.ticker.add(tick);

  return {
    el: canvas,
    state,
    swarm({ x0, x1, y0, y1, count = 12, depth = [0.88, 1.06] }) {
      for (let i = 0; i < count; i++) {
        flies.push({
          x: rng.range(x0, x1),
          y: rng.range(y0, y1),
          d: rng.range(depth[0], depth[1]),
          ax: rng.range(10, 26),
          ay: rng.range(6, 16),
          sx: rng.range(0.25, 0.6),
          sy: rng.range(0.3, 0.7),
          p1: rng() * 6.28,
          p2: rng() * 6.28,
          p3: rng() * 6.28,
          blink: rng.range(0.6, 1.4),
          size: rng.range(1, 1.55),
          a: rng.range(0.55, 1),
        });
      }
    },
    add({ x, y, size = 1, alpha = 0, glow = 0.6, wander = 6, depth = 1 }) {
      const fly = { x, y, size, alpha, glow, wander, depth, p1: rng() * 6.28, p2: rng() * 6.28 };
      named.push(fly);
      return fly;
    },
    destroy() {
      gsap.ticker.remove(tick);
      offResize();
    },
  };
}
