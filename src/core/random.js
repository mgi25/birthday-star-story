/**
 * Seeded random numbers, so generated scenery (stars, rooftops, hills) looks
 * identical on every viewing and every device.
 */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  // mulberry32
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (min, max) => min + (max - min) * rng();
  rng.int = (min, max) => Math.floor(rng.range(min, max + 1));
  rng.pick = (list) => list[Math.floor(rng() * list.length)];
  rng.chance = (p) => rng() < p;
  return rng;
}

/** Smooth 1-D value noise in the range 0..1. `scale` is the feature size in world units. */
export function createNoise1D(rng, { scale = 300, octaves = 3 } = {}) {
  const tables = Array.from({ length: octaves }, () => Array.from({ length: 256 }, () => rng()));
  const at = (table, i) => table[((i % 256) + 256) % 256];
  return (x) => {
    let value = 0;
    let amp = 1;
    let norm = 0;
    let freq = 1 / scale;
    for (let o = 0; o < octaves; o++) {
      const xx = x * freq + o * 31.7;
      const i = Math.floor(xx);
      const f = xx - i;
      const s = f * f * (3 - 2 * f);
      const a = at(tables[o], i);
      const b = at(tables[o], i + 1);
      value += (a + (b - a) * s) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.13;
    }
    return value / norm;
  };
}
