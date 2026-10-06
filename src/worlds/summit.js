import { el, uid } from '../core/dom.js';
import { createRng } from '../core/random.js';
import { NIGHT, BOY } from '../core/palette.js';
import { createLayer } from '../components/layer.js';
import { createStarfield } from '../components/starfield.js';
import { packMarkup } from '../components/character.js';
import * as scenery from '../components/scenery.js';

/*
 * THE SUMMIT — the world of Scenes 5–9.
 *
 * A small rocky top above a sea of cloud, under the deepest sky of the film.
 * Every summit scene rebuilds it from the same seeds, so cuts between them
 * are invisible. The plateau runs left to a sheer edge; beyond it the drop
 * and the cloud sea.
 */

export const SUMMIT = {
  /** where the rock ends */
  edgeX: 40,
  /** plateau surface */
  topY: 872,
  /** where he stops after arriving */
  standX: -46,
  /** sitting: hips on the edge */
  sitX: 33,
};

/** The summit surface (depth-1 world units). */
export function summitY(x) {
  if (x < -420) return 1000;
  if (x < -230) {
    const t = (x + 420) / 190;
    return 1000 - 128 * (t * t * (3 - 2 * t));
  }
  return SUMMIT.topY + 2.5 * Math.sin(x / 37) + (x < -150 ? (x + 150) * -0.06 : 0);
}

/** The things he finds in his bag (held props, centred on the palm). */
export const ITEMS = {
  map: `<g transform="translate(1 -6) rotate(-8)">
      <rect x="-6" y="-4.5" width="12" height="9" rx="0.8" fill="#d8cdb0"/>
      <path d="M-2 -4.5 V4.5 M2 -4.5 V4.5" stroke="#b9ad8e" stroke-width="0.6"/>
      <path d="M-4.6 2.4 Q-1 -1.6 1.5 1 T4.6 -2.6" stroke="#b5654c" stroke-width="0.7" fill="none" stroke-dasharray="1.2 0.9"/>
    </g>`,
  snack: `<g transform="translate(1 -5) rotate(-14)">
      <rect x="-6" y="-2.4" width="12" height="4.8" rx="1.6" fill="#b5654c"/>
      <rect x="-1.6" y="-2.4" width="3.2" height="4.8" fill="#efe1c0" opacity="0.85"/>
      <path d="M-6 -2.4 l-1.2 1.2 l1.2 1.2 l-1.2 1.2 l1.2 1.2 M6 -2.4 l1.2 1.2 l-1.2 1.2 l1.2 1.2 l-1.2 1.2" stroke="#b5654c" stroke-width="0.8" fill="none"/>
    </g>`,
  telescope: `<g transform="translate(2 -5) rotate(-22)">
      <rect x="-9" y="-1.6" width="9" height="3.2" rx="0.6" fill="#8e6e3c"/>
      <rect x="-0.5" y="-2.2" width="9.5" height="4.4" rx="0.8" fill="#c9a368"/>
      <rect x="2.4" y="-2.3" width="1" height="4.6" fill="#8e6e3c"/>
      <ellipse cx="9" cy="0" rx="0.9" ry="2.2" fill="#e7d9a6"/>
    </g>`,
  letterFolded: `<g transform="translate(1 -5) rotate(-6)">
      <rect x="-5.5" y="-4" width="11" height="8" rx="0.4" fill="#efe4cc" stroke="#c9bb98" stroke-width="0.5"/>
      <path d="M-5.5 0 H5.5" stroke="#cdbf9e" stroke-width="0.5"/>
    </g>`,
  letterOpen: `<g transform="translate(1 -9)">
      <rect x="-8" y="-10" width="16" height="20" rx="0.4" fill="#f1e7d0" stroke="#cdbf9e" stroke-width="0.5"/>
      <path d="M-8 -3.3 H8 M-8 3.3 H8" stroke="#ddd0b2" stroke-width="0.4"/>
      <path d="M-5.6 -7.4 H4.8 M-5.6 -5.6 H5.2 M-5.6 -1.6 H5.4 M-5.6 0.2 H3.8 M-5.6 4.6 H5 M-5.6 6.4 H2.6" stroke="#8d86a0" stroke-width="0.45"/>
    </g>`,
};

/** His backpack in his lap (body coordinates), flap open. */
export const LAP_PACK = `<g transform="translate(5 -64.5)">${packMarkup(BOY, 0, 0, { open: true })}</g>`;

/** Generous half-width so content exists even on ultra-wide or rotated screens. */
const REACH = 1300;

/**
 * Build the summit into a scene frame. Returns its layers, the deep starfield
 * and helpers. `items` = props set down on the rock beside him (hidden until placed).
 */
export function buildSummit(ctx, { backdrop, world }, camera) {
  const { stage, reduced } = ctx;
  const layers = {};
  const add = (parent, name, depth, opts) => {
    const layer = createLayer({ stage, camera, name, depth, depthX: depth, ...opts });
    parent.appendChild(layer.el);
    ctx.onCleanup(layer.destroy);
    layers[name] = layer;
    return layer;
  };

  // --- sky and the deepest field of stars in the film
  const sky = add(backdrop, 'sky', 0.15, {});
  el('div', 'sky sky--summit', sky.el);
  const field = createStarfield({
    stage,
    camera,
    depth: 0.1,
    depthRange: [0.03, 0.18],
    drift: 0.45,
    seed: 9001,
    bounds: { x0: -1500, x1: 1500, y0: -760, y1: 820 },
    density: 1 / 640,
    horizon: 840,
    reduced,
  });
  backdrop.appendChild(field.el);
  ctx.onCleanup(field.destroy);

  // --- peaks through the cloud sea, and the cloud sea itself
  const rng = createRng(9101);
  const peaks = [];
  for (let x = -REACH; x < REACH; x += rng.range(230, 420)) {
    if (Math.abs(x) < 120) continue;
    peaks.push({ x, top: rng.range(745, 800), w: rng.range(150, 260) });
  }
  const peakSvg = peaks
    .map((p) => `<path d="M${p.x - p.w / 2} 900 L${p.x - p.w * 0.1} ${p.top + 12} L${p.x} ${p.top} L${p.x + p.w * 0.14} ${p.top + 16} L${p.x + p.w / 2} 900 Z" fill="${NIGHT.peakFar}"/>
      <path d="M${p.x - p.w * 0.06} ${p.top + 14} L${p.x} ${p.top} L${p.x + p.w * 0.08} ${p.top + 18} Z" fill="${NIGHT.snow}" opacity="0.5"/>`)
    .join('');
  add(world, 'peaks', 0.3, { band: [700, 1000], svg: peakSvg.split(' 900 ').join(' 1000 ').split(' 900 Z').join(' 1000 Z') });

  const seaFar = [];
  for (let x = -REACH; x < REACH; x += rng.range(150, 230)) seaFar.push({ x, y: rng.range(812, 840), w: rng.range(380, 560), h: rng.range(36, 54), parts: 10, alpha: 1.2 });
  add(world, 'seaFar', 0.42, {
    band: [740, 1100],
    svg: `<rect x="${-REACH - 200}" y="850" width="${REACH * 2 + 400}" height="260" fill="${NIGHT.cloudSea}"/>
      ${scenery.clouds({ rng, items: seaFar, fill: NIGHT.cloudSea, light: NIGHT.cloudSeaLight })}`,
  });
  const seaNear = [];
  for (let x = -REACH; x < REACH; x += rng.range(170, 260)) seaNear.push({ x, y: rng.range(905, 935), w: rng.range(420, 620), h: rng.range(48, 70), parts: 10, alpha: 1.3 });
  add(world, 'seaNear', 0.6, {
    band: [820, 1100],
    svg: `<rect x="${-REACH - 200}" y="950" width="${REACH * 2 + 400}" height="160" fill="#2f3166"/>
      ${scenery.clouds({ rng, items: seaNear, fill: '#34366c', light: '#6d6fa6' })}`,
  });

  // --- the summit rock
  const rockRng = createRng(9301);
  let d = `M-460 1100`;
  for (let x = -460; x <= SUMMIT.edgeX; x += 5) d += ` L${x} ${summitY(x).toFixed(1)}`;
  d += ` L${SUMMIT.edgeX + 3} ${SUMMIT.topY + 6} L${SUMMIT.edgeX - 4} 940 L${SUMMIT.edgeX + 8} 1000 L${SUMMIT.edgeX + 2} 1100 Z`;
  let rim = `M-460 1000`;
  for (let x = -460; x <= SUMMIT.edgeX; x += 5) rim += ` L${x} ${summitY(x).toFixed(1)}`;
  const tufts = [-300, -250, -205, -160, -112, -80, -20, 12].map((x) => ({ x, y: summitY(x) + 2, h: 9, spread: 12 }));
  const rocks = [-340, -190, -128].map((x) => ({ x, y: summitY(x) + 4, w: rockRng.range(16, 26), h: rockRng.range(8, 14) }));
  // things he sets down beside him (Scene 6), hidden until placed
  const placed = [
    ['map', SUMMIT.sitX - 10, 0.9],
    ['snack', SUMMIT.sitX - 22, 0.8],
    ['telescope', SUMMIT.sitX - 36, 0.9],
  ]
    .map(([name, x, s]) => `<g data-item="${name}" opacity="0" transform="translate(${x} ${SUMMIT.topY - 2}) scale(${s})">${ITEMS[name]}</g>`)
    .join('') +
    // the bag, set down beside him before he lies back (Scene 9)
    `<g data-item="pack" opacity="0" transform="translate(${SUMMIT.sitX - 128} ${SUMMIT.topY - 26.5}) rotate(-8 8 28)">${packMarkup(BOY, 0, 0)}</g>`;
  const rockGrad = uid('summit-rock');
  add(world, 'summit', 1, {
    band: [700, 1100],
    svg: `
      <defs>
        <linearGradient id="${rockGrad}" x1="0" y1="820" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#14173c"/>
          <stop offset="1" stop-color="${NIGHT.summitRock}"/>
        </linearGradient>
      </defs>
      <path d="${d}" fill="url(#${rockGrad})"/>
      <path d="${rim}" fill="none" stroke="${NIGHT.summitRim}" stroke-width="1.5" opacity="0.6"/>
      <path d="M${SUMMIT.edgeX} ${SUMMIT.topY} L${SUMMIT.edgeX + 3} ${SUMMIT.topY + 6} L${SUMMIT.edgeX - 4} 940" fill="none" stroke="${NIGHT.summitRim}" stroke-width="1.2" opacity="0.45"/>
      ${scenery.rocks({ rng: rockRng, items: rocks, fill: NIGHT.summitRock, rim: NIGHT.summitRim })}
      ${scenery.grass({ rng: rockRng, fill: NIGHT.summitRock, clumps: tufts })}
      ${placed}`,
  });

  add(world, 'summitFg', 1.2, {
    band: [920, 1000],
    svg: scenery.grass({ rng: createRng(9401), fill: NIGHT.foreground, clumps: [-330, -270, -150].map((x) => ({ x, y: 1004, h: 34, blades: 7, spread: 20 })) }),
  });

  const item = (name) => layers.summit.svg.querySelector(`[data-item="${name}"]`);
  return { layers, field, item };
}
