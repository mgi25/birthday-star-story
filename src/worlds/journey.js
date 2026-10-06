import { el } from '../core/dom.js';
import { createRng } from '../core/random.js';
import { NIGHT } from '../core/palette.js';
import { gsap } from '../animation/gsap.js';
import { createLayer } from '../components/layer.js';
import { createStarfield } from '../components/starfield.js';
import * as scenery from '../components/scenery.js';
import { buildMountain } from './mountain.js';

/*
 * THE JOURNEY WORLD — one continuous place for Scenes 1–4:
 * the town → a small hill at its edge → the forest → the mountain path.
 *
 * Every scene that travels through it rebuilds it from these same seeded
 * definitions, so adjacent scenes can join with an invisible cut: the next
 * scene's first frame is pixel-for-pixel the previous scene's last frame.
 *
 * Scene 1's town is generated first from its original random stream, in the
 * original order, so it never changes. Everything added for the journey
 * draws from its own seeds.
 */

/** Story geography, in world units (depth-1 coordinates). */
export const PLACES = {
  boyStart: -34,
  lampX: -180,
  tower: { x: 168, w: 24, h: 172, spire: 46 },
  townGround: 772,
  /** last building of the mid-ground town (town-layer x) */
  townEnd: 810,
  hill: { x: 700, height: 96, width: 135 },
  forestEdge: 900,
  /** where the climb begins */
  mountainBase: 1980,
};

export const SKY = {
  hero: { x: 140, y: 205 },
  second: { x: -78, y: 140 },
  moon: { x: -168, y: 92, r: 13 },
};

/** Parallax depths (vertical, horizontal) for each layer. */
export const DEPTH = {
  sky: [0.25, 0],
  stars: [0.1, 0.06],
  moon: [0.2, 0.03],
  clouds: [0.3, 0.22],
  mountains: [0.45, 0.4],
  hills: [0.62, 0.55],
  valleyTown: [0.12, 0.1],
  farPeaks: [0.35, 0.45],
  cloudBank: [0.5, 0.6],
  forestFar: [0.7, 0.66],
  rockMid: [0.7, 0.68],
  town: [0.8, 0.78],
  trees: [0.9, 0.88],
  forestMid: [0.9, 0.9],
  forestNear: [1, 1],
  terrain: [1, 1],
  ground: [1, 1],
  foreground: [1.25, 1.25],
  fgFloor: [1.3, 1.3],
  fgCanopy: [1.35, 1.35],
};

const scene1Ground = (x) => 896 + 9 * Math.sin((x + 140) / 230) + 5 * Math.sin(x / 83 + 1.2);

/** The ground he walks on through town, over the hill and into the forest. */
export const groundY = (x) =>
  scene1Ground(x) - PLACES.hill.height * Math.exp(-(((x - PLACES.hill.x) / PLACES.hill.width) ** 2));

/** Camera height while walking: it rises gently with the hill so he stays framed. */
export const trackY = (x) => (groundY(x) - groundY(PLACES.boyStart)) * 0.55;

/** Generous half-width so content exists even on ultra-wide or rotated screens. */
const REACH = 1300;

/** Lit windows near the centre (Scene 1 switches two of them). */
export function centreWindows(townLayer) {
  const all = [...townLayer.svg.querySelectorAll('rect[data-window]')];
  return all
    .map((node) => ({ node, x: Number(node.getAttribute('x')) }))
    .filter(({ x }) => Math.abs(x) < 170)
    .map(({ node }) => node);
}

/** The state Scene 1 leaves those two windows in. */
export function settleWindows(townLayer) {
  const windows = centreWindows(townLayer);
  const off = windows[1];
  const on = windows[windows.length - 2];
  return { off, on };
}

/** Cloud drift keyed to the global clock, so it never jumps across a cut. */
const cloudDrift = (time) => -35 + 35 * Math.cos((time * Math.PI * 2) / 140);

/**
 * Build the journey world into a scene frame.
 *   camX: the camera's horizontal travel in this scene, [min, max]
 *   camY: its vertical travel (for the climb), [min, max]
 * Layers the camera can never see are skipped.
 */
export function buildJourney(ctx, { backdrop, world }, camera, { camX = [0, 0], camY = [0, 0] } = {}) {
  const { stage, reduced } = ctx;
  const layers = {};
  const covers = (name, x0, x1, reach = REACH) => {
    const dx = DEPTH[name][1];
    return camX[1] * dx + reach >= x0 && camX[0] * dx - reach <= x1;
  };
  const span = (name) => {
    const dx = DEPTH[name][1];
    return [Math.min(-scenery.WORLD_HALF, Math.floor(camX[0] * dx - REACH)), Math.max(scenery.WORLD_HALF, Math.ceil(camX[1] * dx + REACH))];
  };
  const pending = [];
  const add = (parent, name, opts) => {
    const [depth, depthX] = DEPTH[name];
    const layer = createLayer({ stage, camera, name, depth, depthX, camX, ...opts });
    if (parent === world) pending.push(layer);
    else parent.appendChild(layer.el);
    ctx.onCleanup(layer.destroy);
    layers[name] = layer;
    return layer;
  };

  // Scene 1's random stream. Do not reorder the calls that use it.
  const rng = createRng(1907);

  // --- backdrop: sky and stars (never zoomed)
  const sky = add(backdrop, 'sky', {});
  el('div', 'sky sky--night', sky.el);

  const field = createStarfield({ stage, camera, depth: DEPTH.stars[0], depthX: DEPTH.stars[1], seed: 4021, reduced });
  backdrop.appendChild(field.el);
  ctx.onCleanup(field.destroy);

  // --- moon and clouds
  add(world, 'moon', { band: [20, 170], svg: scenery.moon({ ...SKY.moon, fill: NIGHT.moon }) });
  const clouds = add(world, 'clouds', {
    band: [400, 650],
    overscan: 160,
    drift: true,
    svg: `${scenery.clouds({
      rng,
      fill: NIGHT.cloud,
      light: NIGHT.cloudLight,
      items: [
        { x: -1250, y: 522, w: 480, h: 26 },
        { x: -620, y: 566, w: 540, h: 28 },
        { x: 30, y: 604, w: 420, h: 20 },
        { x: 650, y: 552, w: 560, h: 30 },
        { x: 1300, y: 530, w: 460, h: 24 },
        { x: -920, y: 436, w: 320, h: 14, alpha: 0.6 },
        { x: 1000, y: 424, w: 340, h: 14, alpha: 0.6 },
      ],
    })}${cloudsBeyondSvg(camX)}`,
  });
  if (!reduced) {
    const drift = (time) => {
      clouds.host.style.transform = `translate3d(${(cloudDrift(time) * stage.metrics.u).toFixed(2)}px, 0, 0)`;
    };
    drift(gsap.ticker.time);
    gsap.ticker.add(drift);
    ctx.onCleanup(() => gsap.ticker.remove(drift));
  }

  // --- distant mountains and hills
  const [mx0, mx1] = span('mountains');
  add(world, 'mountains', {
    band: [520, 1000],
    svg: scenery.mountains({ rng, base: 706, height: 132, scale: 240, fill: NIGHT.mountains, topFill: NIGHT.mountainsTop, x0: mx0, x1: mx1 }),
  });
  const [hx0, hx1] = span('hills');
  const hillsSvg = scenery.hills({ rng, base: 760, height: 92, scale: 250, fill: NIGHT.hills, x0: hx0, x1: hx1 }).markup;
  add(world, 'hills', { band: [640, 1000], svg: hillsSvg });

  // --- far treeline (journey), behind the town
  if (covers('forestFar', 600, 2500)) add(world, 'forestFar', { band: [330, 1000], svg: forestFarSvg() });

  // --- the town (Scene 1), ending at its edge
  const [tx0, tx1] = span('town');
  const townBack = scenery.town({ rng, ground: PLACES.townGround, fill: NIGHT.town, windowFill: NIGHT.windowLit, minH: 46, maxH: 104, landmarks: [PLACES.tower], cutoff: PLACES.townEnd });
  const townFront = scenery.town({ rng, ground: PLACES.townGround + 20, fill: NIGHT.townFront, windowFill: NIGHT.windowLit, minH: 24, maxH: 58, lit: 0.16, gap: [6, 40], cutoff: PLACES.townEnd });
  const town = add(world, 'town', {
    band: [540, 1000],
    svg: `${townBack}${townFront}
      <rect x="${tx0}" y="${PLACES.townGround + 20}" width="${tx1 - tx0}" height="300" fill="${NIGHT.field}"/>
      ${townLampsSvg()}`,
  });

  // --- field trees (Scene 1)
  const treesSvg = scenery.trees({
    rng,
    fill: NIGHT.trees,
    items: [
      { x: -268, y: 888, h: 132 },
      { x: -336, y: 890, h: 98, kind: 'pine' },
      { x: 262, y: 890, h: 116 },
      { x: 322, y: 892, h: 150, kind: 'pine' },
      { x: -560, y: 886, h: 112 },
      { x: 610, y: 888, h: 126 },
      { x: -830, y: 888, h: 140, kind: 'pine' },
      { x: 900, y: 890, h: 104 },
      { x: -1120, y: 888, h: 120 },
      { x: 1180, y: 890, h: 138, kind: 'pine' },
      { x: -1450, y: 888, h: 108 },
      { x: 1500, y: 888, h: 118 },
    ],
  });
  add(world, 'trees', { band: [700, 1000], svg: treesSvg });

  // --- the forest (journey)
  if (covers('forestMid', 860, 2400)) add(world, 'forestMid', { band: [-260, 1000], svg: forestMidSvg() });
  if (covers('forestNear', 1000, 2350)) add(world, 'forestNear', { band: [-720, 1000], svg: forestNearSvg() });

  // --- the mountain (journey, Scene 4)
  const nearReach = Math.max(stage.metrics.halfWidth, 600) + 250;
  const mountain = covers('ground', PLACES.mountainBase - 300, 4000, nearReach) ? buildMountain({ add, world, covers }) : null;

  // --- ground: lamp, fence, the street, the hill
  const [gx0, gx1] = span('ground');
  const groundEnd = Math.min(gx1, mountain ? PLACES.mountainBase + 60 : gx1);
  const ground = add(world, 'ground', {
    band: [680, 1000],
    svg: `
      ${scenery.lamppost({ x: PLACES.lampX, y: groundY(PLACES.lampX), h: 150, fill: NIGHT.ground, light: NIGHT.lamp, glowRgb: NIGHT.lampGlow })}
      ${streetLampsSvg()}
      <path d="${scenery.silhouette(groundY, { x0: gx0, x1: groundEnd })}" fill="${NIGHT.ground}"/>
      <path d="${scenery.line(groundY, { x0: gx0, x1: groundEnd })}" fill="none" stroke="${NIGHT.groundRim}" stroke-width="1.4" opacity="0.55"/>
      ${scenery.fence({ x0: 58, x1: 262, groundY, fill: NIGHT.ground })}
      ${scenery.grass({
        rng,
        fill: NIGHT.ground,
        clumps: [-420, -300, -240, -120, 30, 120, 330, 470, 640].map((x) => ({ x, y: groundY(x) + 3, h: 12, spread: 18 })),
      })}
      ${groundExtrasSvg()}`,
  });

  // --- foreground
  const [fx0, fx1] = span('foreground');
  add(world, 'foreground', {
    band: [880, 1000],
    svg: `${scenery.grass({
      rng,
      fill: NIGHT.foreground,
      clumps: [
        { x: -250, y: 1004, h: 78, blades: 9, spread: 26 },
        { x: -196, y: 1004, h: 46 },
        { x: -130, y: 1004, h: 22 },
        { x: -40, y: 1004, h: 14 },
        { x: 70, y: 1004, h: 16 },
        { x: 168, y: 1004, h: 34 },
        { x: 236, y: 1004, h: 70, blades: 9, spread: 24 },
        { x: -420, y: 1004, h: 60 },
        { x: 420, y: 1004, h: 56 },
        { x: -700, y: 1004, h: 64 },
        { x: 720, y: 1004, h: 70 },
      ],
    })}
      <rect x="${fx0}" y="992" width="${fx1 - fx0}" height="10" fill="${NIGHT.foreground}"/>
      ${foregroundExtrasSvg()}`,
  });
  if (covers('fgFloor', 1230, 2700)) add(world, 'fgFloor', { band: [850, 1000], svg: fgFloorSvg() });
  if (covers('fgCanopy', 1280, 2500)) add(world, 'fgCanopy', { band: [-330, 260], svg: fgCanopySvg() });

  // Paint far → near (stable, so equal depths keep build order).
  pending
    .map((layer, i) => ({ layer, i }))
    .sort((a, b) => a.layer.depth - b.layer.depth || a.i - b.i)
    .forEach(({ layer }) => world.appendChild(layer.el));

  return { layers, field, town, ground, mountain };
}

/* ───────────── journey additions (each with its own seed) ───────────── */

/**
 * More clouds further along the journey, so the sky never runs out.
 * Own random streams (never Scene 1's), and each cloud seeded by its index,
 * so a longer list in a later scene draws the shared clouds identically.
 */
function cloudsBeyondSvg(camX) {
  if (camX[1] < 600) return '';
  const place = createRng(3101);
  let out = '';
  for (let i = 0, x = 1900; x < 1900 + camX[1] * 0.22 + 1400; i++, x += place.range(500, 800)) {
    const item = { x, y: place.range(470, 600), w: place.range(380, 560), h: place.range(18, 30), parts: 9 };
    out += scenery.clouds({ rng: createRng(3200 + i), items: [item], fill: NIGHT.cloud, light: NIGHT.cloudLight });
  }
  return out;
}

/** Two small street lamps in the town's street (only wide screens see them in Scene 1). */
function townLampsSvg() {
  return [420, 690].map((x) => scenery.townLamp({ x, y: PLACES.townGround + 21, h: 40, fill: NIGHT.townFront, light: NIGHT.lamp, glowRgb: NIGHT.lampGlow })).join('');
}

/** A second street lamp on the walk out of town. */
function streetLampsSvg() {
  return scenery.lamppost({ x: 480, y: groundY(480), h: 146, fill: NIGHT.ground, light: NIGHT.lamp, glowRgb: NIGHT.lampGlow });
}

/** Bushes, a garden wall and grass on the way out of town, over the hill and into the trees. */
function groundExtrasSvg() {
  const rng = createRng(5203);
  // Everything here sits beyond x ≈ 420 so phones and tablets see Scene 1 unchanged.
  const bushes = [432, 600, 1010, 1080].map((x) => ({ x, y: groundY(x) + 4, h: rng.range(26, 40), kind: 'round' }));
  return `
    ${scenery.trees({ rng, items: bushes.map((b) => ({ ...b, h: b.h * 1.6 })), fill: NIGHT.ground })}
    ${scenery.fence({ x0: 520, x1: 590, groundY, fill: NIGHT.ground, h: 22, spacing: 15 })}
    ${scenery.grass({
      rng,
      fill: NIGHT.ground,
      clumps: [600, 660, 735, 790, 860, 950, 1150, 1230, 1300, 1420, 1520, 1650, 1760, 1880].map((x) => ({ x, y: groundY(x) + 3, h: 14, spread: 20 })),
    })}`;
}

/** A garden fence and plants passing close to camera. */
function foregroundExtrasSvg() {
  const rng = createRng(6301);
  return `
    ${scenery.fence({ x0: 840, x1: 975, groundY: () => 1000, fill: NIGHT.foreground, h: 54, spacing: 24 })}
    ${scenery.grass({ rng, fill: NIGHT.foreground, clumps: [1100, 1180, 1290].map((x) => ({ x, y: 1004, h: 62, blades: 8, spread: 22 })) })}`;
}

/** The far treeline: starts behind the edge of town and thickens into forest. */
function forestFarSvg() {
  const rng = createRng(7001);
  const items = [];
  let x = 600;
  while (x < 2500) {
    const t = Math.min(1, (x - 600) / 260);
    const h = rng.range(170, 330) * (0.5 + 0.5 * t);
    items.push({ x, y: 846 + rng.range(-8, 8), h, kind: rng.chance(0.62) ? 'pine' : 'round' });
    x += rng.range(18, 32) / (0.35 + 0.65 * t);
  }
  return `
    ${scenery.trees({ rng, items, fill: NIGHT.forestFar })}
    <rect x="600" y="836" width="1900" height="200" fill="${NIGHT.forestFar}"/>
    ${scenery.mist({ x0: 560, x1: 2500, y: 720, h: 150, color: NIGHT.mist, opacity: 0.32 })}
    ${scenery.glow({ x: 636, y: 650, r: 90, rgb: NIGHT.firefly, opacity: 0.55, attrs: 'data-glow opacity="0"' })}`;
}

/** Tall forest trees: a few at the edge, then a proper forest. */
function forestMidSvg() {
  const rng = createRng(7301);
  const items = [];
  let x = 860;
  while (x < 2400) {
    const t = Math.min(1, (x - 860) / 300);
    // Mostly tall pines running out of frame; rounder trees keep their crowns in view.
    const pine = rng.chance(0.68);
    const top = pine ? rng.range(-90, 150) + (1 - t) * 260 : rng.range(230, 380) + (1 - t) * 160;
    items.push({ x, base: 900, top, w: rng.range(9, 15), r: rng.range(55, 85), kind: pine ? 'pine' : 'round', spread: rng.range(0.9, 1.3) });
    x += rng.range(70, 120) / (0.45 + 0.55 * t);
  }
  return `
    ${scenery.tallTrees({ rng, items, fill: NIGHT.forestMid })}
    ${scenery.mist({ x0: 820, x1: 2400, y: 790, h: 120, color: NIGHT.mist, opacity: 0.28 })}`;
}

/** Big trunks at his depth. A gap is left where the firefly moment happens. */
function forestNearSvg() {
  const rng = createRng(7501);
  const xs = [985, 1330, 1470, 1650, 1790, 1930];
  const items = xs.map((x) => ({ x, base: groundY(x) + 6, w: rng.range(24, 38) }));
  return scenery.trunks({ rng, items, fill: NIGHT.forestNear, rim: NIGHT.forestRim, top: -470, crown: 120 });
}

/** Ferns along the bottom of frame in the forest. */
function fgFloorSvg() {
  const rng = createRng(7701);
  const items = [];
  for (let x = 1240; x < 2700; x += rng.range(110, 220)) items.push({ x, y: 1006, h: rng.range(48, 86) });
  return scenery.ferns({ rng, items, fill: NIGHT.foreground });
}

/** Leafy branches hanging into the top of frame in the forest. */
function fgCanopySvg() {
  const rng = createRng(7901);
  const items = [];
  for (let x = 1300; x < 2500; x += rng.range(260, 420)) items.push({ x, tip: rng.range(40, 150) });
  return scenery.hangingBranches({ rng, items, fill: NIGHT.foreground });
}
