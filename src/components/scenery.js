import { createNoise1D } from '../core/random.js';
import { uid } from '../core/dom.js';

/*
 * Parametric scenery. Every builder returns SVG markup in world units
 * (stage = 1000 tall, x = 0 at centre), generated from a seeded RNG so the
 * world is identical on every device. Art is generated wide (WORLD_HALF
 * either side) so ultra-wide screens never run out of scenery.
 */
export const WORLD_HALF = 1750;

const n1 = (v) => v.toFixed(1);

/** A filled silhouette under y = fn(x). */
export function silhouette(fn, { x0 = -WORLD_HALF, x1 = WORLD_HALF, step = 14, bottom = 1000 } = {}) {
  let d = `M${x0} ${bottom} L${x0} ${n1(fn(x0))}`;
  for (let x = x0 + step; x < x1; x += step) d += ` L${x} ${n1(fn(x))}`;
  d += ` L${x1} ${n1(fn(x1))} L${x1} ${bottom} Z`;
  return d;
}

/** Just the top edge of a silhouette, for rim-light strokes. */
export function line(fn, { x0 = -WORLD_HALF, x1 = WORLD_HALF, step = 14 } = {}) {
  let d = `M${x0} ${n1(fn(x0))}`;
  for (let x = x0 + step; x < x1; x += step) d += ` L${x} ${n1(fn(x))}`;
  return `${d} L${x1} ${n1(fn(x1))}`;
}

/** Distant mountain ridge with soft peaks. */
export function mountains({ rng, base, height, scale = 260, fill, topFill = fill, bottom = 1000, x0 = -WORLD_HALF, x1 = WORLD_HALF }) {
  const noise = createNoise1D(rng, { scale, octaves: 4 });
  const fn = (x) => {
    const v = noise(x);
    const ridged = 1 - Math.abs(v * 2 - 1);
    return base - height * (0.35 * v + 0.65 * ridged * ridged);
  };
  const id = uid('mtn');
  const top = base - height;
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="${top}" x2="0" y2="${base + 60}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${topFill}"/>
        <stop offset="1" stop-color="${fill}"/>
      </linearGradient>
    </defs>
    <path d="${silhouette(fn, { bottom, x0, x1 })}" fill="url(#${id})"/>`;
}

/** Rolling hills. Returns { markup, y(x) } so props can sit on the ridge. */
export function hills({ rng, base, height, scale = 380, fill, bottom = 1000, x0 = -WORLD_HALF, x1 = WORLD_HALF }) {
  const noise = createNoise1D(rng, { scale, octaves: 2 });
  const y = (x) => base - height * noise(x);
  return { markup: `<path d="${silhouette(y, { bottom, step: 18, x0, x1 })}" fill="${fill}"/>`, y };
}

/**
 * A row of small-town buildings with warm windows.
 * `landmarks` are drawn exactly where requested (e.g. a bell tower).
 * Returns markup; lit windows get data-window="n" so scenes can switch them.
 */
export function town({ rng, ground, fill, windowFill, minH = 40, maxH = 100, gap = [-4, 12], lit = 0.22, landmarks = [], x0 = -WORLD_HALF, x1 = WORLD_HALF, cutoff = Infinity }) {
  let shapes = '';
  let windows = '';
  let windowIndex = 0;

  const addWindows = (x, top, w, h) => {
    const cols = Math.max(1, Math.floor((w - 10) / 13));
    const rows = Math.max(1, Math.floor((h - 12) / 17));
    const spanX = (cols - 1) * 13;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!rng.chance(lit)) continue;
        const wx = x + w / 2 - spanX / 2 + c * 13 - 2.6;
        const wy = top + 9 + r * 17;
        const alpha = rng.range(0.55, 0.95).toFixed(2);
        windows += `<rect data-window="${windowIndex++}" x="${n1(wx)}" y="${n1(wy)}" width="5.2" height="7.2" rx="0.8" opacity="${alpha}"/>`;
      }
    }
  };

  const building = (x, w, h) => {
    const top = ground - h;
    shapes += `<rect x="${n1(x)}" y="${n1(top)}" width="${n1(w)}" height="${n1(h + 400)}"/>`;
    const roof = rng.pick(['gable', 'gable', 'gable', 'flat', 'hip']);
    if (roof === 'gable') {
      const rh = w * rng.range(0.32, 0.52);
      shapes += `<path d="M${n1(x - 3)} ${n1(top + 0.5)} L${n1(x + w / 2)} ${n1(top - rh)} L${n1(x + w + 3)} ${n1(top + 0.5)} Z"/>`;
    } else if (roof === 'hip') {
      const rh = w * 0.22;
      shapes += `<path d="M${n1(x - 2)} ${n1(top + 0.5)} L${n1(x + w * 0.25)} ${n1(top - rh)} L${n1(x + w * 0.75)} ${n1(top - rh)} L${n1(x + w + 2)} ${n1(top + 0.5)} Z"/>`;
    }
    if (rng.chance(0.45)) {
      const cx = x + w * rng.range(0.15, 0.7);
      shapes += `<rect x="${n1(cx)}" y="${n1(top - w * 0.42)}" width="6" height="${n1(w * 0.3)}"/>`;
    }
    addWindows(x, top, w, h);
  };

  const tower = ({ x, w = 24, h = 170, spire = 46 }) => {
    const top = ground - h;
    shapes += `<rect x="${n1(x - w / 2)}" y="${n1(top)}" width="${w}" height="${n1(h + 400)}"/>`;
    shapes += `<path d="M${n1(x - w / 2 - 3)} ${n1(top + 1)} L${n1(x)} ${n1(top - spire)} L${n1(x + w / 2 + 3)} ${n1(top + 1)} Z"/>`;
    shapes += `<rect x="${n1(x - 0.8)}" y="${n1(top - spire - 10)}" width="1.6" height="11"/>`;
    windows += `<circle cx="${n1(x)}" cy="${n1(top + 18)}" r="5.2" opacity="0.8"/>`;
    windows += `<rect x="${n1(x - 2.5)}" y="${n1(top + 44)}" width="5" height="9" rx="2.5" opacity="0.55"/>`;
  };

  const reserved = landmarks.map((l) => [l.x - (l.w ?? 24) / 2 - 6, l.x + (l.w ?? 24) / 2 + 6]);
  let x = x0;
  while (x < x1) {
    const w = rng.range(36, 82);
    const h = rng.range(minH, maxH);
    const clash = reserved.some(([a, b]) => x < b && x + w > a);
    if (!clash) {
      // Always generate (so the random sequence never changes), keep only up to the cutoff.
      const before = [shapes, windows, windowIndex];
      building(x, w, h);
      if (x + w > cutoff) [shapes, windows, windowIndex] = before;
    }
    x += w + rng.range(gap[0], gap[1]);
  }
  landmarks.forEach(tower);

  return `<g fill="${fill}">${shapes}</g><g fill="${windowFill}">${windows}</g>`;
}

/** Simple tree silhouettes: round-topped or pine. */
export function trees({ rng, items, fill }) {
  let out = '';
  for (const t of items) {
    const { x, y, h } = t;
    const kind = t.kind ?? rng.pick(['round', 'round', 'pine']);
    if (kind === 'pine') {
      const w = h * 0.42;
      out += `<rect x="${n1(x - 2.5)}" y="${n1(y - h * 0.25)}" width="5" height="${n1(h * 0.3)}"/>`;
      for (let i = 0; i < 3; i++) {
        const ty = y - h * 0.18 - i * h * 0.24;
        const tw = w * (1 - i * 0.24);
        out += `<path d="M${n1(x - tw / 2)} ${n1(ty)} L${n1(x)} ${n1(ty - h * 0.42)} L${n1(x + tw / 2)} ${n1(ty)} Z"/>`;
      }
    } else {
      const r = h * 0.3;
      out += `<rect x="${n1(x - 2.5)}" y="${n1(y - h * 0.45)}" width="5" height="${n1(h * 0.5)}"/>`;
      const blobs = 4;
      for (let i = 0; i < blobs; i++) {
        const bx = x + rng.range(-r * 0.6, r * 0.6);
        const by = y - h * 0.58 - rng.range(-r * 0.3, r * 0.5);
        out += `<circle cx="${n1(bx)}" cy="${n1(by)}" r="${n1(r * rng.range(0.65, 0.95))}"/>`;
      }
      out += `<circle cx="${n1(x)}" cy="${n1(y - h + r)}" r="${n1(r * 0.85)}"/>`;
    }
  }
  return `<g fill="${fill}">${out}</g>`;
}

/** A street lamp with a warm pool of light. */
export function lamppost({ x, y, h = 150, fill, light, glowRgb }) {
  const halo = uid('halo');
  const pool = uid('pool');
  const top = y - h;
  return `
    <defs>
      <radialGradient id="${halo}">
        <stop offset="0" stop-color="rgb(${glowRgb})" stop-opacity="0.42"/>
        <stop offset="0.35" stop-color="rgb(${glowRgb})" stop-opacity="0.12"/>
        <stop offset="1" stop-color="rgb(${glowRgb})" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${pool}">
        <stop offset="0" stop-color="rgb(${glowRgb})" stop-opacity="0.26"/>
        <stop offset="1" stop-color="rgb(${glowRgb})" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${x}" cy="${y + 3}" rx="120" ry="18" fill="url(#${pool})"/>
    <circle cx="${x}" cy="${top + 13}" r="95" fill="url(#${halo})"/>
    <rect x="${x - 2}" y="${top + 18}" width="4" height="${h - 18}" fill="${fill}"/>
    <path d="M${x - 6} ${y} L${x - 4} ${y - 12} L${x + 4} ${y - 12} L${x + 6} ${y} Z" fill="${fill}"/>
    <path d="M${x - 7} ${top + 6} L${x + 7} ${top + 6} L${x + 5} ${top + 20} L${x - 5} ${top + 20} Z" fill="${light}"/>
    <path d="M${x - 10.5} ${top + 7} L${x} ${top - 3} L${x + 10.5} ${top + 7} Z" fill="${fill}"/>
    <rect x="${x - 5.5}" y="${top + 19}" width="11" height="2.4" fill="${fill}"/>`;
}

/** Low garden fence following the ground. */
export function fence({ x0, x1, groundY, h = 26, spacing = 17, fill }) {
  let out = '';
  let rail1 = '';
  let rail2 = '';
  for (let x = x0; x <= x1; x += spacing) {
    const gy = groundY(x) + 2;
    out += `<path d="M${n1(x - 2.2)} ${n1(gy)} L${n1(x - 2.2)} ${n1(gy - h)} L${n1(x)} ${n1(gy - h - 3)} L${n1(x + 2.2)} ${n1(gy - h)} L${n1(x + 2.2)} ${n1(gy)} Z"/>`;
    rail1 += `${rail1 ? 'L' : 'M'}${n1(x)} ${n1(gy - h * 0.72)} `;
    rail2 += `${rail2 ? 'L' : 'M'}${n1(x)} ${n1(gy - h * 0.3)} `;
  }
  return `<g fill="${fill}">${out}</g><g stroke="${fill}" stroke-width="2.6" fill="none">
    <path d="${rail1}"/><path d="${rail2}"/></g>`;
}

/** Clumps of grass blades rising from y. */
export function grass({ rng, clumps, fill }) {
  let d = '';
  for (const c of clumps) {
    const blades = c.blades ?? rng.int(4, 8);
    const spread = c.spread ?? 14;
    for (let b = 0; b < blades; b++) {
      const bx = c.x + rng.range(-spread, spread);
      const h = rng.range(c.h * 0.5, c.h);
      const lean = rng.range(-0.35, 0.35) * h;
      const w = rng.range(2.2, 4.4);
      d += `M${n1(bx - w)} ${n1(c.y)} Q${n1(bx + lean * 0.25)} ${n1(c.y - h * 0.55)} ${n1(bx + lean)} ${n1(c.y - h)} Q${n1(bx + lean * 0.3 + w * 0.4)} ${n1(c.y - h * 0.5)} ${n1(bx + w)} ${n1(c.y)} Z `;
    }
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

/** A thin crescent moon with a soft halo. */
export function moon({ x, y, r, fill, glowRgb = '246, 232, 198' }) {
  const halo = uid('moonhalo');
  // Outer arc, then an inner arc of a larger offset circle back to the start.
  const a = { x: x + r * 0.28, y: y - r * 0.96 };
  const b = { x: x + r * 0.28, y: y + r * 0.96 };
  return `
    <defs>
      <radialGradient id="${halo}">
        <stop offset="0" stop-color="rgb(${glowRgb})" stop-opacity="0.16"/>
        <stop offset="0.4" stop-color="rgb(${glowRgb})" stop-opacity="0.05"/>
        <stop offset="1" stop-color="rgb(${glowRgb})" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${x}" cy="${y}" r="${r * 3.6}" fill="url(#${halo})"/>
    <path d="M${n1(a.x)} ${n1(a.y)} A${r} ${r} 0 1 0 ${n1(b.x)} ${n1(b.y)} A${n1(r * 1.12)} ${n1(r * 1.12)} 0 0 1 ${n1(a.x)} ${n1(a.y)} Z" fill="${fill}"/>`;
}

/**
 * Long, wispy clouds: overlapping ellipses whose radial gradient fades to
 * nothing at the edge, so they read as soft without any blur filter.
 */
export function clouds({ rng, items, fill, light }) {
  const soft = uid('cloud');
  const lit = uid('cloudlit');
  let out = '';
  for (const c of items) {
    const parts = c.parts ?? 9;
    for (let i = 0; i < parts; i++) {
      const t = (i + 0.5) / parts;
      const px = c.x - c.w / 2 + t * c.w + rng.range(-c.w * 0.06, c.w * 0.06);
      const py = c.y + rng.range(-c.h * 0.3, c.h * 0.3);
      const taper = 1 - Math.abs(t - 0.5) * 1.1; // thicker in the middle
      const rx = rng.range(c.w * 0.14, c.w * 0.24);
      const ry = c.h * rng.range(0.55, 0.9) * taper;
      const useLit = i % 3 === 1;
      out += `<ellipse cx="${n1(px)}" cy="${n1(py - (useLit ? ry * 0.35 : 0))}" rx="${n1(rx)}" ry="${n1(ry)}" fill="url(#${useLit ? lit : soft})" opacity="${((c.alpha ?? 1) * rng.range(0.55, 0.9)).toFixed(2)}"/>`;
    }
  }
  return `
    <defs>
      <radialGradient id="${soft}">
        <stop offset="0" stop-color="${fill}" stop-opacity="0.75"/>
        <stop offset="0.55" stop-color="${fill}" stop-opacity="0.32"/>
        <stop offset="1" stop-color="${fill}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${lit}">
        <stop offset="0" stop-color="${light}" stop-opacity="0.5"/>
        <stop offset="0.6" stop-color="${light}" stop-opacity="0.16"/>
        <stop offset="1" stop-color="${light}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${out}`;
}

/* ───────────── forest, street and mountain pieces ───────────── */

/** A small distant street lamp (for the mid-ground town). */
export function townLamp({ x, y, h = 40, fill, light, glowRgb }) {
  const halo = uid('tlamp');
  const top = y - h;
  return `
    <defs>
      <radialGradient id="${halo}">
        <stop offset="0" stop-color="rgb(${glowRgb})" stop-opacity="0.4"/>
        <stop offset="1" stop-color="rgb(${glowRgb})" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${x}" cy="${top + 3}" r="26" fill="url(#${halo})"/>
    <rect x="${x - 0.9}" y="${top + 4}" width="1.8" height="${h - 4}" fill="${fill}"/>
    <rect x="${x - 2.6}" y="${top}" width="5.2" height="5" rx="1" fill="${light}"/>`;
}

/** Tall forest trees that reach out of frame: tapered trunks with canopy masses, or tall pines. */
export function tallTrees({ rng, items, fill }) {
  let out = '';
  for (const t of items) {
    const { x, base, top, w = 12 } = t;
    const kind = t.kind ?? 'round';
    out += `<path d="M${n1(x - w * 0.55)} ${n1(base)} L${n1(x - w * 0.3)} ${n1(top + 30)} L${n1(x + w * 0.3)} ${n1(top + 30)} L${n1(x + w * 0.55)} ${n1(base)} Z"/>`;
    if (kind === 'pine') {
      const H = base - top;
      const tiers = 7;
      for (let i = 0; i < tiers; i++) {
        const ty = top + i * H * 0.085;
        const tw = (10 + i * 9) * (t.spread ?? 1);
        out += `<path d="M${n1(x - tw)} ${n1(ty + H * 0.14)} L${n1(x)} ${n1(ty)} L${n1(x + tw)} ${n1(ty + H * 0.14)} Z"/>`;
      }
    } else {
      const r = t.r ?? 70;
      for (let i = 0; i < 6; i++) {
        const cx = x + rng.range(-r * 0.9, r * 0.9);
        const cy = top + rng.range(-r * 0.5, r * 0.45);
        out += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r * rng.range(0.5, 0.8))}"/>`;
      }
      // a couple of bare limbs reaching out under the canopy
      for (const side of [-1, 1]) {
        if (!rng.chance(0.6)) continue;
        const by = top + r * rng.range(0.4, 1.4);
        const len = rng.range(r * 0.6, r * 1.1);
        out += `<path d="M${n1(x)} ${n1(by + 8)} Q${n1(x + side * len * 0.5)} ${n1(by)} ${n1(x + side * len)} ${n1(by - len * 0.35)} L${n1(x + side * len)} ${n1(by - len * 0.35 + 3)} Q${n1(x + side * len * 0.5)} ${n1(by + 5)} ${n1(x)} ${n1(by + 14)} Z"/>`;
      }
    }
  }
  return `<g fill="${fill}">${out}</g>`;
}

/** Big near trunks with flared roots, rising out of frame. A faint rim catches the sky. */
export function trunks({ rng, items, fill, rim, top = -1350, crown = 0 }) {
  let out = '';
  let rims = '';
  for (const t of items) {
    const { x, base, w } = t;
    const h = w / 2;
    if (crown) {
      // a dark crown of leaves where the trunk ends (seen when looking up)
      for (let i = 0; i < 7; i++) {
        out += `<circle cx="${n1(x + rng.range(-crown * 0.9, crown * 0.9))}" cy="${n1(top + rng.range(-crown * 0.5, crown * 0.6))}" r="${n1(crown * rng.range(0.55, 0.85))}"/>`;
      }
    }
    out += `<path d="M${n1(x - h - 14)} ${n1(base + 6)} Q${n1(x - h - 2)} ${n1(base - 4)} ${n1(x - h)} ${n1(base - 34)} L${n1(x - h * 0.78)} ${top} L${n1(x + h * 0.78)} ${top} L${n1(x + h)} ${n1(base - 34)} Q${n1(x + h + 2)} ${n1(base - 4)} ${n1(x + h + 16)} ${n1(base + 6)} Z"/>`;
    if (rng.chance(0.7)) {
      const by = rng.range(base - 330, base - 200);
      const side = rng.chance(0.5) ? -1 : 1;
      const len = rng.range(40, 80);
      out += `<path d="M${n1(x + side * h * 0.8)} ${n1(by)} Q${n1(x + side * (h + len * 0.6))} ${n1(by - 14)} ${n1(x + side * (h + len))} ${n1(by - 40)} L${n1(x + side * (h + len) + side * 2)} ${n1(by - 37)} Q${n1(x + side * (h + len * 0.55))} ${n1(by - 4)} ${n1(x + side * h * 0.8)} ${n1(by + 10)} Z"/>`;
    }
    rims += `<path d="M${n1(x - h + 1.5)} ${n1(base - 36)} L${n1(x - h * 0.78 + 1.5)} ${top}"/>`;
  }
  return `<g fill="${fill}">${out}</g><g stroke="${rim}" stroke-width="1.6" fill="none" opacity="0.5">${rims}</g>`;
}

/** Leafy branches hanging into the top of frame (foreground). */
export function hangingBranches({ rng, items, fill }) {
  let out = '';
  for (const b of items) {
    const { x, tip, top = -320 } = b;
    const sway = rng.range(-60, 60);
    out += `<path d="M${n1(x - 6)} ${top} Q${n1(x + sway)} ${n1((top + tip) / 2)} ${n1(x + sway * 0.6)} ${n1(tip)} L${n1(x + sway * 0.6 + 3)} ${n1(tip)} Q${n1(x + sway + 6)} ${n1((top + tip) / 2)} ${n1(x + 6)} ${top} Z"/>`;
    const leaves = rng.int(7, 12);
    for (let i = 0; i < leaves; i++) {
      const k = 0.35 + (i / leaves) * 0.65;
      const lx = x + sway * k * 0.8 + rng.range(-34, 34);
      const ly = top + (tip - top) * k + rng.range(-12, 12);
      out += `<ellipse cx="${n1(lx)}" cy="${n1(ly)}" rx="${n1(rng.range(16, 30))}" ry="${n1(rng.range(8, 14))}" transform="rotate(${n1(rng.range(-35, 35))} ${n1(lx)} ${n1(ly)})"/>`;
    }
  }
  return `<g fill="${fill}">${out}</g>`;
}

/** Ferns and low plants along the bottom edge (foreground). */
export function ferns({ rng, items, fill }) {
  let d = '';
  for (const f of items) {
    const fronds = f.fronds ?? rng.int(5, 8);
    for (let i = 0; i < fronds; i++) {
      const a = -Math.PI / 2 + (i / (fronds - 1) - 0.5) * 2.3 + rng.range(-0.1, 0.1);
      const len = f.h * rng.range(0.7, 1.05);
      const tx = f.x + Math.cos(a) * len;
      const ty = f.y + Math.sin(a) * len;
      const mx = f.x + Math.cos(a + 0.25) * len * 0.55;
      const my = f.y + Math.sin(a + 0.25) * len * 0.55 - len * 0.12;
      d += `M${n1(f.x - 3)} ${n1(f.y)} Q${n1(mx)} ${n1(my)} ${n1(tx)} ${n1(ty)} Q${n1(mx + 6)} ${n1(my + 6)} ${n1(f.x + 3)} ${n1(f.y)} Z `;
    }
  }
  return `<path d="${d}" fill="${fill}"/>`;
}

/** A soft horizontal band of mist. */
export function mist({ x0, x1, y, h, color, opacity = 0.3 }) {
  const id = uid('mist');
  return `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity="0"/>
        <stop offset="0.55" stop-color="${color}" stop-opacity="${opacity}"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="url(#${id})"/>`;
}

/** A warm, soft glow (radial). Pass attrs such as data-glow to animate it. */
export function glow({ x, y, r, rgb, opacity = 0.5, attrs = '' }) {
  const id = uid('glow');
  return `
    <defs>
      <radialGradient id="${id}">
        <stop offset="0" stop-color="rgb(${rgb})" stop-opacity="${opacity}"/>
        <stop offset="0.4" stop-color="rgb(${rgb})" stop-opacity="${opacity * 0.3}"/>
        <stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})" ${attrs}/>`;
}

/** Scattered rocks sitting on a ground line. */
export function rocks({ rng, items, fill, rim }) {
  let out = '';
  let rims = '';
  for (const r of items) {
    const { x, y, w, h } = r;
    const p1 = rng.range(0.2, 0.45);
    const p2 = rng.range(0.55, 0.8);
    out += `<path d="M${n1(x - w / 2)} ${n1(y + 3)} L${n1(x - w / 2 + w * 0.08)} ${n1(y - h * 0.6)} L${n1(x - w / 2 + w * p1)} ${n1(y - h)} L${n1(x - w / 2 + w * p2)} ${n1(y - h * 0.92)} L${n1(x + w / 2)} ${n1(y - h * 0.3)} L${n1(x + w / 2 + 2)} ${n1(y + 3)} Z"/>`;
    if (rim) rims += `<path d="M${n1(x - w / 2 + w * 0.08)} ${n1(y - h * 0.6)} L${n1(x - w / 2 + w * p1)} ${n1(y - h)} L${n1(x - w / 2 + w * p2)} ${n1(y - h * 0.92)}"/>`;
  }
  return `<g fill="${fill}">${out}</g>${rim ? `<g stroke="${rim}" stroke-width="1.4" fill="none" opacity="0.55" stroke-linejoin="round">${rims}</g>` : ''}`;
}
