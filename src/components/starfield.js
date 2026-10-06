import { gsap } from '../animation/gsap.js';
import { createRng } from '../core/random.js';
import { device } from '../core/device.js';

/** Star tints: cream, warm yellow, a rare cool white for variety. */
const TINTS = [
  [255, 244, 222],
  [255, 226, 160],
  [220, 230, 255],
];

export function makeGlowSprite([r, g, b], size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.1, `rgba(${r},${g},${b},0.95)`);
  grad.addColorStop(0.24, `rgba(${r},${g},${b},0.42)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.09)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** A soft horizontal light streak used for a hero star's glint. */
function makeSpikeSprite([r, g, b]) {
  const w = 256;
  const h = 16;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const along = ctx.createLinearGradient(0, 0, w, 0);
  along.addColorStop(0, `rgba(${r},${g},${b},0)`);
  along.addColorStop(0.5, `rgba(255,255,255,1)`);
  along.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = along;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(0, 4, w, 8);
  ctx.globalAlpha = 0.45;
  ctx.fillRect(0, 6, w, 4);
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 7, w, 2);
  return canvas;
}

/**
 * The background star system, drawn on one canvas (hundreds of twinkling SVG
 * nodes would be far too slow on phones).
 *
 * Stars live in world units and get parallax from the camera: one `depth`
 * for all, or a random per-star depth from `depthRange` for a deep sky.
 * `drift` (units/sec) slowly slides the sky sideways, keyed to the global
 * clock so it continues seamlessly across scene cuts.
 *
 * `state.reveal` (0..1) fades stars in one by one, `state.dim` dims the field
 * (not the heroes), `state.alpha` fades everything. Hero stars are individually
 * tweenable objects: { x, y, alpha, size, glow, flare, pulse }.
 * `lines` draws faint constellation lines between heroes.
 */
export function createStarfield({
  stage,
  camera = null,
  depth = 0.1,
  depthX = depth,
  depthRange = null,
  drift = 0,
  seed = 11,
  bounds = { x0: -1750, x1: 1750, y0: -200, y1: 760 },
  density = 1 / 2300,
  horizon = 640,
  reduced = false,
}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'starfield';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');

  const rng = createRng(seed);
  const area = (bounds.x1 - bounds.x0) * (bounds.y1 - bounds.y0);
  const count = Math.round(area * density * (device.lowPower ? 0.65 : 1));
  const xRatio = depth ? depthX / depth : 1;
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = rng.range(bounds.x0, bounds.x1);
    const y = rng.range(bounds.y0, bounds.y1);
    const m = Math.pow(rng(), 2.7); // mostly faint, a few bright
    const thin = (y - (horizon - 280)) / 300; // fewer stars near the hazy horizon
    if (thin > 0 && rng() < thin) continue;
    const star = {
      x,
      y,
      r: 0.6 + m * 2.1,
      a: 0.34 + m * 0.66,
      tint: rng() < 0.1 ? 2 : rng() < 0.35 ? 1 : 0,
      twinkle: rng.range(0.1, 0.5),
      speed: rng.range(0.5, 1.9),
      phase: rng() * Math.PI * 2,
      threshold: rng(),
      d: depth,
    };
    if (depthRange) {
      // Nearer stars read a touch bigger and brighter.
      const k = rng();
      star.d = depthRange[0] + (depthRange[1] - depthRange[0]) * k;
      star.r *= 0.8 + k * 0.45;
    }
    stars.push(star);
  }

  const glows = TINTS.map((t) => makeGlowSprite(t));
  const spikes = TINTS.map((t) => makeSpikeSprite(t));
  const heroes = [];
  const lines = [];
  const state = { reveal: 1, dim: 1, alpha: 1 };
  const twinkleScale = reduced ? 0.35 : 1;
  const driftSpeed = drift * (reduced ? 0.3 : 1);
  const spanX = bounds.x1 - bounds.x0;
  const maxDepth = depthRange ? depthRange[1] : depth;

  let dpr = 1;
  let lastDraw = -1;
  let lastCam = '';

  function resize(m) {
    dpr = Math.min(window.devicePixelRatio || 1, device.maxDpr);
    canvas.width = Math.round(m.width * dpr);
    canvas.height = Math.round(m.height * dpr);
    draw(gsap.ticker.time);
  }

  const heroScreen = (h, camX, camY) => {
    const d = h.depth ?? depth;
    const dx = h.depthX ?? d * xRatio;
    return [h.x - camX * dx, h.y - camY * d];
  };

  function draw(time) {
    const { u, halfWidth } = stage.metrics;
    const k = u * dpr; // device pixels per world unit
    const cx = canvas.width / 2;
    const camX = camera ? camera.state.x : 0;
    const camY = camera ? camera.state.y : 0;
    const reveal = state.reveal;
    const edge = halfWidth + 20;
    const shift = driftSpeed ? time * driftSpeed : 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.alpha <= 0.001) return;
    ctx.globalCompositeOperation = 'lighter';

    for (const s of stars) {
      let wx = s.x;
      if (shift) wx = bounds.x0 + ((((wx - bounds.x0 + shift * (s.d / maxDepth)) % spanX) + spanX) % spanX);
      const x = wx - camX * s.d * xRatio;
      if (x < -edge || x > edge) continue;
      const y = s.y - camY * s.d;
      if (y < -20 || y > 1020) continue;

      let a = s.a * state.dim * state.alpha;
      if (reveal < 1) {
        const appear = (reveal - s.threshold * 0.88) / 0.12;
        if (appear <= 0) continue;
        if (appear < 1) a *= appear;
      }
      a *= 1 - s.twinkle * twinkleScale * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      if (a <= 0.01) continue;

      const size = Math.max(3.2 * dpr, s.r * k * 4.4);
      ctx.globalAlpha = a;
      ctx.drawImage(glows[s.tint], cx + x * k - size / 2, y * k - size / 2, size, size);
    }

    if (lines.length) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      for (const set of lines) {
        if (set.state.alpha <= 0.001) continue;
        ctx.strokeStyle = 'rgb(246, 236, 214)';
        ctx.lineWidth = Math.max(1, 0.9 * k);
        for (const [a, b] of set.pairs) {
          const [ax, ay] = heroScreen(a, camX, camY);
          const [bx, by] = heroScreen(b, camX, camY);
          ctx.globalAlpha = set.state.alpha * Math.min(a.alpha, b.alpha) * state.alpha;
          ctx.beginPath();
          ctx.moveTo(cx + ax * k, ay * k);
          ctx.lineTo(cx + bx * k, by * k);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
    }

    for (const h of heroes) {
      if (h.alpha <= 0.001) continue;
      const [hx, hy] = heroScreen(h, camX, camY);
      const x = cx + hx * k;
      const y = hy * k;
      const shimmer = 1 - 0.16 * twinkleScale * (0.5 + 0.5 * Math.sin(time * 1.3 + h.phase));
      const pulse = 1 + h.pulse * (reduced ? 0.05 : 0.16) * Math.sin(time * 2.1 + h.phase);
      const core = h.size * k * 4.4 * (1 + h.glow * 0.9) * pulse;
      const alpha = h.alpha * state.alpha;

      ctx.globalAlpha = Math.min(1, alpha * shimmer);
      ctx.drawImage(glows[h.tint], x - core / 2, y - core / 2, core, core);

      if (h.glow > 0) {
        const halo = core * 3.4;
        ctx.globalAlpha = Math.min(1, alpha * h.glow * 0.34 * pulse);
        ctx.drawImage(glows[h.tint], x - halo / 2, y - halo / 2, halo, halo);
      }

      if (h.flare > 0) {
        const len = core * 3.6 * h.flare * pulse;
        const thick = Math.max(2 * dpr, core * 0.16);
        ctx.globalAlpha = Math.min(1, alpha * h.flare * 0.6 * shimmer);
        ctx.drawImage(spikes[h.tint], x - len / 2, y - thick / 2, len, thick);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(spikes[h.tint], (-len * 1.15) / 2, -thick / 2, len * 1.15, thick);
        ctx.restore();
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Redraw at full rate while the camera moves; ~30fps is plenty for twinkles.
  const tick = (time) => {
    const cam = camera ? `${camera.state.x},${camera.state.y}` : '';
    const moving = cam !== lastCam;
    if (!moving && lastDraw >= 0 && time - lastDraw < 1 / 30) return;
    lastCam = cam;
    lastDraw = time;
    draw(time);
  };

  const offResize = stage.onResize(resize);
  resize(stage.metrics);
  gsap.ticker.add(tick);

  return {
    el: canvas,
    state,
    stars,
    /** Add a named star you can animate. Positions are world units. */
    addHero({ x, y, size = 1.5, alpha = 0, tint = 1, glow = 0, flare = 0, pulse = 0, depth: d, depthX: dx }) {
      const hero = { x, y, size, alpha, tint, glow, flare, pulse, phase: rng() * Math.PI * 2, depth: d, depthX: dx };
      heroes.push(hero);
      return hero;
    },
    /** Faint lines between heroes: pairs = [[heroA, heroB], …]. Tween the returned state.alpha. */
    addLines(pairs) {
      const set = { pairs, state: { alpha: 0 } };
      lines.push(set);
      return set.state;
    },
    /** Where a hero currently sits on screen (world units, x from centre). */
    screenOf(hero) {
      return heroScreen(hero, camera ? camera.state.x : 0, camera ? camera.state.y : 0);
    },
    redraw: () => draw(gsap.ticker.time),
    destroy() {
      gsap.ticker.remove(tick);
      offResize();
    },
  };
}
