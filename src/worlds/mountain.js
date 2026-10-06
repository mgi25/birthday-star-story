import { createRng, createNoise1D } from '../core/random.js';
import { NIGHT } from '../core/palette.js';
import * as scenery from '../components/scenery.js';
import { uid } from '../core/dom.js';

/*
 * THE MOUNTAIN (Scene 4) — part of the journey world, east of the forest.
 *
 * A path climbs in three stages separated by short cliffs he scrambles up.
 * Behind it: a rocky flank, distant peaks, a bank of cloud that starts above
 * him and ends below him, and the town, tiny, far down in the valley.
 */

/** The climbing path (depth-1 world units). Stages are walkable; the steep bits between are cliffs. */
const PATH = [
  [1860, 897],
  [1960, 893],
  [2100, 838],
  [2230, 768],
  [2330, 702],
  [2342, 420],
  [2356, 60],
  [2368, -250],
  [2378, -420],
  [2520, -480],
  [2680, -556],
  [2840, -628],
  [3000, -684],
  [3180, -716],
  [3400, -748],
];

/** Lower slope (A); the high, open ridge above the cloud (B), reached past a long cliff. */
export const STAGES = {
  A: { from: 1975, to: 2300 },
  B: { from: 2392, to: 2930, ledge: [2378, -420] },
};

/** Height of the path at x (walkable parts are gently smoothed). */
export function mountainY(x) {
  if (x <= PATH[0][0]) return PATH[0][1];
  for (let i = 1; i < PATH.length; i++) {
    const [x1, y1] = PATH[i];
    if (x <= x1) {
      const [x0, y0] = PATH[i - 1];
      const t = (x - x0) / (x1 - x0);
      const s = t * t * (3 - 2 * t);
      return y0 + (y1 - y0) * (0.35 * t + 0.65 * s);
    }
  }
  return PATH[PATH.length - 1][1];
}

const n1 = (v) => v.toFixed(1);

function terrainSvg() {
  const rng = createRng(8101);
  const faceId = uid('mtn-face');
  let d = `M${PATH[0][0]} 1000`;
  for (let x = PATH[0][0]; x <= 3400; x += 6) d += ` L${x} ${n1(mountainY(x))}`;
  d += ` L3400 1000 Z`;
  let rim = `M${PATH[0][0]} ${n1(mountainY(PATH[0][0]))}`;
  for (let x = PATH[0][0] + 6; x <= 3400; x += 6) rim += ` L${x} ${n1(mountainY(x))}`;

  // cracks and ledges in the cliff faces
  const cliffs = [[2330, 702, 2378, -420]];
  let cracks = '';
  for (const [x0, y0, x1, y1] of cliffs) {
    for (let i = 0; i < 4; i++) {
      const t = rng.range(0.15, 0.85);
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      cracks += `M${n1(cx - 3)} ${n1(cy)} l${n1(rng.range(14, 30))} ${n1(rng.range(-4, 8))}`;
    }
  }

  // rocks along the path, sparse pines low down, grass tufts
  const rockItems = [];
  for (let x = 1990; x < 3300; x += rng.range(70, 150)) {
    if (x > 2310 && x < 2400) continue;
    rockItems.push({ x, y: mountainY(x) + 6, w: rng.range(16, 34), h: rng.range(10, 22) });
  }
  const pines = [2015, 2075, 2160, 2255, 2560].map((x, i) => ({ x, y: mountainY(x) + 8, h: i < 4 ? rng.range(70, 120) : rng.range(40, 52), kind: 'pine' }));
  const tufts = [];
  for (let x = 1980; x < 3100; x += rng.range(40, 90)) {
    if (x > 2320 && x < 2390) continue;
    tufts.push({ x, y: mountainY(x) + 3, h: x < 2340 ? 13 : 8, spread: 14 });
  }

  return `
    <defs>
      <linearGradient id="${faceId}" x1="0" y1="-480" x2="0" y2="900" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#1e2352"/>
        <stop offset="0.45" stop-color="#11143a"/>
        <stop offset="1" stop-color="${NIGHT.ground}"/>
      </linearGradient>
    </defs>
    ${scenery.trees({ rng, items: pines, fill: NIGHT.ground })}
    <path d="${d}" fill="url(#${faceId})"/>
    <path d="${rim}" fill="none" stroke="${NIGHT.rockRim}" stroke-width="1.6" opacity="0.6"/>
    <path d="${cracks}" fill="none" stroke="${NIGHT.rockRim}" stroke-width="1.2" opacity="0.35"/>
    ${scenery.rocks({ rng, items: rockItems, fill: NIGHT.ground, rim: NIGHT.rockRim })}
    ${scenery.grass({ rng, fill: NIGHT.ground, clumps: tufts })}`;
}

/** The mountain's rocky flank, seen behind the path. */
function rockMidSvg() {
  const rng = createRng(8301);
  const noise = createNoise1D(rng, { scale: 60, octaves: 3 });
  const fn = (x) => {
    const rise = Math.max(0, x - 1300) * 1.15;
    return 905 - rise - 70 * noise(x);
  };
  let d = `M1300 1000`;
  for (let x = 1300; x <= 2900; x += 10) d += ` L${x} ${n1(fn(x))}`;
  d += ` L2900 1000 Z`;
  let rim = `M1300 ${n1(fn(1300))}`;
  for (let x = 1310; x <= 2900; x += 10) rim += ` L${x} ${n1(fn(x))}`;
  return `<path d="${d}" fill="${NIGHT.rockMid}"/><path d="${rim}" fill="none" stroke="${NIGHT.rockRim}" stroke-width="1.4" opacity="0.4"/>`;
}

/** Distant peaks with pale tops; they sink below as he climbs. */
function farPeaksSvg() {
  const rng = createRng(8501);
  const peaks = [];
  for (let x = 1240; x < 1720; x += rng.range(110, 190)) peaks.push({ x, top: rng.range(300, 470), w: rng.range(180, 300) });
  let body = '';
  let caps = '';
  for (const p of peaks) {
    body += `<path d="M${n1(p.x - p.w / 2)} 1000 L${n1(p.x - p.w * 0.12)} ${n1(p.top + 18)} L${n1(p.x)} ${n1(p.top)} L${n1(p.x + p.w * 0.16)} ${n1(p.top + 24)} L${n1(p.x + p.w / 2)} 1000 Z"/>`;
    caps += `<path d="M${n1(p.x - p.w * 0.07)} ${n1(p.top + 22)} L${n1(p.x)} ${n1(p.top)} L${n1(p.x + p.w * 0.09)} ${n1(p.top + 26)} L${n1(p.x + p.w * 0.02)} ${n1(p.top + 34)} Z"/>`;
  }
  return `<g fill="${NIGHT.peakFar}">${body}</g><g fill="${NIGHT.snow}" opacity="0.55">${caps}</g>`;
}

/** A broad bank of cloud: overhead at the foot of the climb, underfoot at the top. */
function cloudBankSvg() {
  const rng = createRng(8701);
  const items = [];
  for (let x = 1260; x < 2100; x += rng.range(130, 200)) items.push({ x, y: rng.range(210, 300), w: rng.range(380, 600), h: rng.range(40, 70), parts: 11 });
  return scenery.clouds({ rng, items: items.map((i) => ({ ...i, alpha: 1.25 })), fill: '#4a4c86', light: '#7a7cb0' });
}

/** The town, tiny, far below in the valley. */
function valleyTownSvg() {
  const rng = createRng(8901);
  let houses = '';
  let lights = '';
  for (let x = 40; x < 360; x += rng.range(7, 13)) {
    const h = rng.range(6, 16);
    houses += `<rect x="${n1(x)}" y="${n1(762 - h)}" width="${n1(rng.range(6, 11))}" height="${n1(h + 30)}"/>`;
    if (rng.chance(0.55)) lights += `<circle cx="${n1(x + 3)}" cy="${n1(762 - h + 5)}" r="1.1" opacity="${rng.range(0.6, 1).toFixed(2)}"/>`;
  }
  houses += `<rect x="207" y="728" width="4" height="40"/><path d="M206 729 L209 716 L212 729 Z"/>`;
  return `
    ${scenery.glow({ x: 200, y: 760, r: 170, rgb: NIGHT.lampGlow, opacity: 0.16 })}
    <g fill="${NIGHT.town}" opacity="0.35">${houses}</g>
    <g fill="${NIGHT.windowLit}">${lights}</g>`;
}

/**
 * Add the mountain's layers through the journey's `add` (which knows each
 * layer's depth and paints far → near).
 */
export function buildMountain({ add, world, covers }) {
  const layers = {};
  // The valley town only exists from up on the mountain: hidden until Scene 4 reveals it.
  layers.valleyTown = add(world, 'valleyTown', { band: [560, 800], svg: valleyTownSvg() });
  layers.valleyTown.el.style.opacity = '0';
  if (covers('farPeaks', 1080, 1900)) layers.farPeaks = add(world, 'farPeaks', { band: [280, 1000], svg: farPeaksSvg() });
  if (covers('cloudBank', 1100, 2450)) layers.cloudBank = add(world, 'cloudBank', { band: [120, 400], svg: cloudBankSvg() });
  layers.rockMid = add(world, 'rockMid', { band: [-1250, 1000], svg: rockMidSvg() });
  layers.terrain = add(world, 'terrain', { band: [-860, 1000], svg: terrainSvg() });
  return { layers, groundY: mountainY };
}
