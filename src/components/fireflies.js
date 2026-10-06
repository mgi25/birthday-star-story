import { gsap } from '../animation/gsap.js';
import { createRng } from '../core/random.js';
import { device } from '../core/device.js';

/** Warm, faintly green — close to the stars' yellow, but alive. */
const FIREFLY_RGB = [238, 246, 168];
/** The lantern itself: a little greener and richer than the light it throws. */
const LANTERN_RGB = [214, 250, 118];

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

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

/*
 * THE HERO FIREFLY, drawn in profile facing +x, origin at the wing roots,
 * about 10 units from tail to antenna tips (scaled to `length` when drawn).
 * Kept to a handful of quiet shapes so it sits in the film's cut-paper style.
 */
const INK = '#15111d'; // head
const LIMB = '#3a3047'; // legs and antennae: a shade lighter, so they still read on dark
const SHELL = '#221b2d'; // thorax and abdomen
const COLLAR = '#6a4250'; // the pronotum's warm edge: fireflies wear a little pink collar
const RIM = 'rgba(255, 234, 176, 0.34)'; // its own light catching its edges
const LANTERN_AT = [-4.6, 0.95];
const WING_ROOT = [0.4, -0.95];
const WING = { rest: Math.PI + 0.05, beat: Math.PI + 1, sweep: 0.7, len: 5.8 };

function wingPath(ctx, len) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.2, -0.95, len * 0.72, -1.05, len, -0.2);
  ctx.bezierCurveTo(len * 0.8, 0.62, len * 0.3, 0.62, 0, 0);
}

/** One translucent wing at `angle` (radians, 0 = pointing forward). */
function drawWing(ctx, angle, len, a) {
  ctx.save();
  ctx.translate(WING_ROOT[0], WING_ROOT[1]);
  ctx.rotate(angle);
  const fill = ctx.createLinearGradient(0, 0, len, 0);
  fill.addColorStop(0, `rgba(255, 244, 212, ${0.5 * a})`);
  fill.addColorStop(1, `rgba(208, 224, 255, ${0.2 * a})`);
  wingPath(ctx, len);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 0.16;
  ctx.strokeStyle = `rgba(240, 246, 255, ${0.5 * a})`;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.3, -0.05);
  ctx.quadraticCurveTo(len * 0.45, -0.45, len * 0.82, -0.32);
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.26 * a})`;
  ctx.stroke();
  ctx.restore();
}

/** The soft fan a beating wing leaves behind it. */
function drawWingBlur(ctx, len, a) {
  ctx.beginPath();
  ctx.moveTo(WING_ROOT[0], WING_ROOT[1]);
  ctx.arc(WING_ROOT[0], WING_ROOT[1], len * 0.92, WING.beat - WING.sweep, WING.beat + WING.sweep);
  ctx.closePath();
  ctx.fillStyle = `rgba(222, 234, 255, ${0.09 * a})`;
  ctx.fill();
}

/**
 * Body, wings and lantern in local units. `fly` 0..1 (settled → flying),
 * `wings` the two wing angles, `lit` the lantern's brightness 0..1.
 */
function drawInsect(ctx, { body, fly, wings, lit, feelers }) {
  const legs = [
    [2.2, 0.8, 2.9, 1.9, 3.4, 2.45],
    [1.3, 0.95, 1.3, 2.1, 1.75, 2.6],
    [0.4, 0.95, -0.35, 1.95, -0.7, 2.5],
  ];

  // far wing (and the blur of both while they beat)
  ctx.globalAlpha = body;
  if (fly > 0.01) drawWingBlur(ctx, WING.len, fly);
  drawWing(ctx, wings[1], WING.len * 0.92, 0.75);

  // legs: tucked a little further back in flight
  ctx.strokeStyle = LIMB;
  ctx.lineWidth = 0.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [x0, y0, x1, y1, x2, y2] of legs) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 - fly * 0.35, y1);
    ctx.lineTo(x2 - fly * 0.9, y2 - fly * 0.1);
    ctx.stroke();
  }

  // abdomen, with the lantern in its last segments
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-2.6, 0.45, 3.35, 1.6, 0.1, 0, TAU);
  ctx.fillStyle = SHELL;
  ctx.fill();
  ctx.clip();
  const [lx, ly] = LANTERN_AT;
  ctx.beginPath();
  ctx.ellipse(lx + 0.05, ly - 0.05, 2.05, 1.5, 0.1, 0, TAU);
  ctx.fillStyle = 'rgb(176, 184, 120)'; // the lantern unlit: pale and waxy
  ctx.fill();
  const glow = ctx.createRadialGradient(lx - 0.3, ly + 0.3, 0, lx, ly, 2.2);
  const [r, g, b] = LANTERN_RGB;
  glow.addColorStop(0, `rgba(252, 255, 222, ${lit})`);
  glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${lit})`);
  glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0.55 * lit})`);
  ctx.fillStyle = glow;
  ctx.fill();
  // segment lines read as "tail", not "bead"
  ctx.strokeStyle = 'rgba(21, 17, 29, 0.55)';
  ctx.lineWidth = 0.16;
  for (const sx of [-1.3, -2.75, -3.95]) {
    ctx.beginPath();
    ctx.moveTo(sx + 0.35, -1.4);
    ctx.quadraticCurveTo(sx - 0.25, 0.4, sx + 0.25, 2.2);
    ctx.stroke();
  }
  ctx.restore();

  // head, eye, antennae
  ctx.beginPath();
  ctx.arc(3.05, 0.45, 0.95, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.45, 0.35, 0.42, 0, TAU);
  ctx.fillStyle = '#3c3652';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.56, 0.2, 0.13, 0, TAU);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
  ctx.strokeStyle = LIMB;
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.moveTo(3.6, -0.2);
  ctx.quadraticCurveTo(4.8, -1.6, 5.6 + feelers[0], -2 + feelers[0] * 0.4);
  ctx.moveTo(3.4, -0.3);
  ctx.quadraticCurveTo(4.2, -1.9, 4.9 + feelers[1] * 0.5, -2.55 + feelers[1]);
  ctx.stroke();

  // thorax: the shield over its head, with a warm lower edge
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(1.35, -0.3, 1.85, 1.4, -0.15, 0, TAU);
  ctx.fillStyle = SHELL;
  ctx.fill();
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(2.3, 0.75, 1.6, 0.95, -0.35, 0, TAU);
  ctx.fillStyle = COLLAR;
  ctx.fill();
  ctx.restore();

  // rim light from its own glow, so the dark shape holds against dark places
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 0.2;
  ctx.beginPath();
  ctx.ellipse(-2.6, 0.45, 3.35, 1.6, 0.1, Math.PI * 0.95, Math.PI * 2.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(1.35, -0.3, 1.85, 1.4, -0.15, Math.PI * 0.9, Math.PI * 2.1);
  ctx.stroke();

  // near wing over the body: the lantern shows through it
  drawWing(ctx, wings[0], WING.len, 1);
}

/**
 * Fireflies: small warm lights that drift and slowly blink, drawn inside the
 * (zoomable) world so they sit among the trees and in front of the boy.
 * Positions are world units at a parallax depth.
 *
 *   swarm({ x0, x1, y0, y1, count })   ambient fireflies around an area: just
 *     glowing dots on one shared canvas, cheap enough to have many
 *   addHero({ x, y, … })   the one firefly the story follows (see below)
 *   state.alpha fades the whole swarm (not the hero)
 *
 * Works without a camera too (fixed screen units), e.g. on a black card.
 */
export function createFireflies({ stage, camera = null, reduced = false, seed = 21 }) {
  const el = document.createElement('div');
  el.className = 'fireflies';
  el.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'starfield';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const sprite = makeFireflySprite(FIREFLY_RGB);
  const rng = createRng(seed);
  const flies = [];
  const heroes = [];
  const state = { alpha: 0 };
  const motion = reduced ? 0.4 : 1;
  let dpr = 1;
  let lastTime = null;

  function resize(m) {
    dpr = Math.min(window.devicePixelRatio || 1, device.maxDpr);
    canvas.width = Math.round(m.width * dpr);
    canvas.height = Math.round(m.height * dpr);
    draw(gsap.ticker.time, 0);
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

  /*
   * The hero's life: everything here is small and irregular on purpose. A
   * particle glides; an insect makes little course corrections, hangs in
   * the air for a moment, bobs with its wingbeat and flashes when it likes.
   */
  function live(e, dt) {
    const { hero: h, s } = e;
    const fly = 1 - clamp01(h.rest);

    // How the authored path is moving (for facing and pitch). Ignore jumps.
    if (dt > 0) {
      const vx = (h.x - s.lastX) / dt;
      const vy = (h.y - s.lastY) / dt;
      if (Math.abs(vx) + Math.abs(vy) < 900) {
        const k = 1 - Math.exp(-dt * 5);
        s.vx += (vx - s.vx) * k;
        s.vy += (vy - s.vy) * k;
      }
    }
    s.lastX = h.x;
    s.lastY = h.y;
    if (h.steer && fly > 0.5 && Math.abs(s.vx) > 12) {
      h.facing += (Math.sign(s.vx) - h.facing) * Math.min(1, dt * 8);
    }

    // Course corrections: a springy hop to a new nearby point every so often,
    // and now and then a pause where it simply holds its place.
    s.next -= dt;
    if (s.next <= 0) {
      s.pause = rng() < 0.28;
      if (!s.pause) {
        s.tx = rng.range(-1, 1);
        s.ty = rng.range(-0.7, 0.7);
      }
      s.next = s.pause ? rng.range(0.6, 1.3) : rng.range(0.3, 0.95);
    }
    const w = 7.5;
    const z = 0.6;
    s.jvx += (w * w * (s.tx - s.jx) - 2 * z * w * s.jvx) * dt;
    s.jvy += (w * w * (s.ty - s.jy) - 2 * z * w * s.jvy) * dt;
    s.jx += s.jvx * dt;
    s.jy += s.jvy * dt;
    s.calm += ((s.pause ? 0.05 : 1) - s.calm) * Math.min(1, dt * 4);

    // Light: quick flashes over a steady ember, at uneven intervals
    // (sometimes a double flash).
    s.flash += dt;
    if (s.flash > s.gap) {
      s.flash = 0;
      s.gap = rng() < 0.25 ? rng.range(0.3, 0.45) : rng.range(0.9, 2.4);
    }

    // Wings beat while flying; settled, they only twitch now and then.
    s.wing += dt * TAU * 17;
    s.twitchIn -= dt;
    if (s.twitchIn <= 0) {
      s.twitch = 0;
      s.twitchIn = rng.range(1.2, 2.8);
    }
    s.twitch += dt;
  }

  function drawHero(e, time, camX, camY) {
    const { hero: h, s, cvs, g } = e;
    const visible = h.alpha > 0.005;
    if (visible !== e.visible) {
      cvs.style.visibility = visible ? '' : 'hidden';
      e.visible = visible;
    }
    if (!visible) return;

    const { u } = stage.metrics;
    const fly = 1 - clamp01(h.rest);
    const form = clamp01(h.form);

    // where it is: the authored path plus its own meandering
    const m = h.wander * motion;
    const driftX = 0.45 * Math.sin(time * 0.83 + s.p1) + 0.2 * Math.sin(time * 1.91 + s.p2);
    const driftY = 0.35 * Math.sin(time * 1.13 + s.p2) + 0.15 * Math.sin(time * 2.37 + s.p1);
    const hover = 0.06 * (0.3 + 0.7 * s.calm) * Math.sin(time * TAU * 1.7 + s.p1);
    const bob = fly * motion * h.length * (hover + 0.02 * Math.sin(s.wing));
    const x = h.x + m * (0.7 * s.jx + driftX * s.calm) - camX * h.depth;
    const y = h.y + m * (0.6 * s.jy + driftY * s.calm) + bob - camY * h.depth;

    // light level 0..1
    const t = s.flash;
    const flash = t < 0.14 ? Math.sin((t / 0.14) * Math.PI * 0.5) : Math.exp(-(t - 0.14) / 0.38);
    const base = reduced ? 0.7 : 0.45;
    const level = base + (1 - base) * flash;

    // canvas just big enough for the halo and the insect, sharp at any zoom
    const core0 = Math.max(4 / u, h.size * 6);
    const halo = h.glow > 0 ? core0 * 4.2 : 0;
    const span = Math.ceil((Math.max(halo, h.length * 2.6) + 6) / 16) * 16;
    const zoom = camera ? Math.max(1, Math.ceil(camera.state.zoom * 2) / 2) : 1;
    const px = Math.min(1024, Math.ceil(span * u * dpr * zoom));
    if (cvs.width !== px) cvs.width = cvs.height = px;
    const cssSize = `${(span * u).toFixed(2)}px`;
    if (e.cssSize !== cssSize) {
      cvs.style.width = cvs.style.height = cssSize;
      e.cssSize = cssSize;
    }
    cvs.style.transform = `translate3d(${((x - span / 2) * u).toFixed(2)}px, ${((y - span / 2) * u).toFixed(2)}px, 0)`;

    const k = px / span; // canvas pixels per world unit
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, px, px);
    g.setTransform(k, 0, 0, k, px / 2, px / 2);

    // the insect's pose
    const sc = h.length / 10;
    const facing = Math.max(-1, Math.min(1, h.facing));
    const pitchFly = -0.5 + Math.max(-0.3, Math.min(0.25, s.vy * 0.004)) + 0.08 * s.jy;
    const pitch = lerp((h.angle * Math.PI) / 180, pitchFly, fly);
    const cos = Math.cos(pitch);
    const sin = Math.sin(pitch);
    const toWorld = ([lx, ly]) => [facing * sc * (lx * cos - ly * sin), sc * (lx * sin + ly * cos)];

    // The light. From far away this is all there is; as the insect appears it
    // gathers into the lantern at its tail.
    const [lanternX, lanternY] = toWorld(LANTERN_AT);
    const gx = lanternX * form;
    const gy = lanternY * form;
    g.globalCompositeOperation = 'lighter';
    if (halo > 0) {
      const size = halo * (0.85 + 0.15 * level);
      g.globalAlpha = Math.min(1, h.alpha * h.glow * 0.3 * (0.6 + 0.4 * level));
      g.drawImage(sprite, gx - size / 2, gy - size / 2, size, size);
    }
    const core = lerp(core0, h.length * 0.5, form) * (0.8 + 0.2 * level);
    g.globalAlpha = Math.min(1, h.alpha * (0.75 + 0.25 * level) * (1 - 0.25 * form));
    g.drawImage(sprite, gx - core / 2, gy - core / 2, core, core);
    g.globalCompositeOperation = 'source-over';

    const body = h.alpha * form;
    if (body > 0.01) {
      // a soft aura of its own size behind it, so the dark body has light to sit in
      const aura = h.length * 2.2 * (0.9 + 0.1 * level);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1, body * (0.18 + 0.22 * level));
      g.drawImage(sprite, lanternX - aura / 2, lanternY - aura / 2, aura, aura);
      g.globalCompositeOperation = 'source-over';

      const beat = reduced ? 0 : Math.sin(s.wing);
      const twitch = s.twitch < 0.3 ? Math.sin((s.twitch / 0.3) * Math.PI) * 0.22 * motion : 0;
      const near = lerp(WING.rest - twitch, WING.beat + WING.sweep * beat, fly);
      const far = lerp(WING.rest - twitch * 0.6 - 0.05, WING.beat + 0.2 + WING.sweep * Math.sin(s.wing - 0.5) * (reduced ? 0 : 1), fly);
      const feel = motion * 0.25;
      g.save();
      g.scale(facing, 1);
      g.rotate(pitch);
      g.scale(sc, sc);
      drawInsect(g, {
        body,
        fly,
        wings: [near, far],
        lit: 0.4 + 0.6 * level,
        feelers: [feel * Math.sin(time * 2.3 + s.p1), feel * Math.sin(time * 1.7 + s.p2)],
      });
      g.restore();

      // the lantern blooms over its own wing
      const bloom = h.length * 0.42 * (0.85 + 0.15 * level);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1, body * (0.25 + 0.5 * level));
      g.drawImage(sprite, lanternX - bloom / 2, lanternY - bloom / 2, bloom, bloom);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = 1;
  }

  function draw(time, dt) {
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

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    for (const e of heroes) {
      live(e, dt);
      drawHero(e, time, camX, camY);
    }
  }

  const tick = (time) => {
    const dt = lastTime === null ? 0 : Math.min(0.05, Math.max(0, time - lastTime));
    lastTime = time;
    draw(time, dt);
  };
  const offResize = stage.onResize(resize);
  resize(stage.metrics);
  gsap.ticker.add(tick);

  return {
    el,
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
    /**
     * The firefly the story follows, on its own small canvas so it stays sharp
     * when the camera pushes in. Tween any of:
     *   x, y, alpha     where it is (its middle) and how visible
     *   size, glow      its light, as for a star: from far away that is all it is
     *   form            0 just a light … 1 clearly a tiny beetle with a lit tail
     *   rest            0 flying (wings beating) … 1 settled (wings folded)
     *   wander          how far it meanders around x, y (0 = exactly there)
     *   angle           body tilt in degrees while settled (to sit on a slope)
     *   facing          1 right, -1 left; passes through 0 to turn, like the boy
     *   steer           while flying, turn to face the way it is going
     *   length          the insect, head to tail, in world units
     */
    addHero({ x, y, size = 1, alpha = 0, glow = 0.6, wander = 6, depth = 1, form = 0, rest = 0, angle = 0, facing = 1, steer = true, length = 8 }) {
      const hero = { x, y, size, alpha, glow, wander, depth, form, rest, angle, facing, steer, length };
      const cvs = document.createElement('canvas');
      cvs.className = 'firefly';
      el.appendChild(cvs);
      heroes.push({
        hero,
        cvs,
        g: cvs.getContext('2d'),
        visible: true,
        cssSize: '',
        s: {
          p1: rng() * TAU,
          p2: rng() * TAU,
          lastX: x,
          lastY: y,
          vx: 0,
          vy: 0,
          jx: 0,
          jy: 0,
          jvx: 0,
          jvy: 0,
          tx: 0,
          ty: 0,
          next: 0,
          pause: false,
          calm: 1,
          flash: 0,
          gap: rng.range(0.4, 1.4),
          wing: rng() * TAU,
          twitch: 1,
          twitchIn: rng.range(0.6, 2),
        },
      });
      return hero;
    },
    destroy() {
      gsap.ticker.remove(tick);
      offResize();
    },
  };
}
