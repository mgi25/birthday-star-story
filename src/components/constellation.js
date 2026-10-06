/**
 * Constellation letters. Each capital is a few strokes on a 4 × 6 grid
 * (y down). Stars go on the stroke corners, plus a star or two along long
 * strokes so the shape reads; lines join neighbouring stars. The result is
 * deliberately sparse — it should be discovered, not announced.
 */
const STROKES = {
  A: [[[0, 6], [2, 0], [4, 6]], [[0.8, 3.6], [3.2, 3.6]]],
  B: [[[0, 6], [0, 0], [2.6, 0], [3.5, 1.4], [2.6, 3], [0, 3]], [[2.6, 3], [3.8, 4.5], [2.8, 6], [0, 6]]],
  C: [[[4, 0.9], [2.4, 0], [0.8, 0.7], [0, 3], [0.8, 5.3], [2.4, 6], [4, 5.1]]],
  D: [[[0, 0], [0, 6], [2.3, 6], [4, 4.4], [4, 1.6], [2.3, 0], [0, 0]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  G: [[[4, 0.9], [2.4, 0], [0.8, 0.7], [0, 3], [0.8, 5.3], [2.4, 6], [4, 5.2], [4, 3.4], [2.3, 3.4]]],
  // Uprights meet the crossbar at a star, so their stars stay evenly spaced.
  H: [[[0, 0], [0, 3], [0, 6]], [[4, 0], [4, 3], [4, 6]], [[0, 3], [4, 3]]],
  I: [[[2, 0], [2, 6]], [[0.8, 0], [3.2, 0]], [[0.8, 6], [3.2, 6]]],
  J: [[[4, 0], [4, 4.6], [3, 6], [1.2, 6], [0, 4.8]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.4]], [[1.3, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [3.8, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.2], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  O: [[[2, 0], [0.4, 1.2], [0, 3], [0.4, 4.8], [2, 6], [3.6, 4.8], [4, 3], [3.6, 1.2], [2, 0]]],
  P: [[[0, 6], [0, 0], [2.8, 0], [3.8, 1.5], [2.8, 3], [0, 3]]],
  Q: [[[2, 0], [0.4, 1.2], [0, 3], [0.4, 4.8], [2, 6], [3.6, 4.8], [4, 3], [3.6, 1.2], [2, 0]], [[2.6, 4.6], [4.2, 6.4]]],
  R: [[[0, 6], [0, 0], [2.8, 0], [3.8, 1.5], [2.8, 3], [0, 3]], [[1.8, 3], [4, 6]]],
  S: [[[4, 0.8], [2.6, 0], [1, 0.2], [0, 1.4], [1, 2.8], [3, 3.2], [4, 4.6], [3, 5.8], [1.4, 6], [0, 5.2]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 4.4], [1.2, 6], [2.8, 6], [4, 4.4], [4, 0]]],
  V: [[[0, 0], [2, 6], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.6], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3]], [[4, 0], [2, 3], [2, 6]]],
  Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
};

/**
 * Star positions and joining lines for a letter, centred on (cx, cy),
 * `scale` world units per grid unit.
 */
export function constellation(letter, { cx = 0, cy = 0, scale = 30 } = {}) {
  const strokes = STROKES[letter] ?? STROKES.A;
  const points = [];
  const lines = [];
  const near = (x, y) => points.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.6);
  const addPoint = (x, y) => {
    const found = near(x, y);
    if (found >= 0) return found;
    points.push([x, y]);
    return points.length - 1;
  };

  for (const stroke of strokes) {
    let prev = addPoint(...stroke[0]);
    for (let i = 1; i < stroke.length; i++) {
      const [x0, y0] = stroke[i - 1];
      const [x1, y1] = stroke[i];
      const extra = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 2.4);
      for (let k = 1; k <= extra + 1; k++) {
        const t = k / (extra + 1);
        const idx = addPoint(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        if (idx !== prev) lines.push([prev, idx]);
        prev = idx;
      }
    }
  }

  return {
    stars: points.map(([x, y]) => ({ x: cx + (x - 2) * scale, y: cy + (y - 3) * scale })),
    lines,
  };
}
