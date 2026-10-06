import { gsap, EASE } from '../animation/gsap.js';
import { SVG_NS } from '../core/dom.js';
import { BOY } from '../core/palette.js';

/*
 * THE BOY
 *
 * A rig of nested SVG groups, authored facing right with his feet at (0, 0)
 * and about 100 units tall. He is driven by a `pose` object:
 *
 *   - Scenes tween pose values with GSAP (head tilt, arm angles, position).
 *   - Every frame an animator adds the living layer on top: breathing,
 *     walk cycle, backpack bounce, scarf in the wind.
 *
 * Angles are degrees, SVG convention (clockwise positive). For limbs, which
 * hang straight down at 0°, negative swings them forward (towards his face).
 * For the head, negative tilts it back, i.e. looks up.
 */

const VIEW = { x: -70, y: -150, w: 140, h: 165 };
const LEG = 36; // hip to sole
const HIP_Y = -36;
const STEP = 24; // world units travelled per footstep
const UPPER_ARM = 14;
const FOREARM = 16.5; // elbow to centre of hand
const SHOULDER = { F: { x: 3, y: -66 }, B: { x: -1, y: -66 } };

/**
 * Two-bone IK: the angles that put a hand at (x, y), in body coordinates.
 * Used to author poses by "where the hand goes" instead of guessing angles.
 */
export function solveArm(side, x, y) {
  const s = SHOULDER[side];
  const dx = x - s.x;
  const dy = y - s.y;
  const d = Math.min(UPPER_ARM + FOREARM - 0.01, Math.max(Math.abs(UPPER_ARM - FOREARM) + 0.01, Math.hypot(dx, dy)));
  const toTarget = Math.atan2(-dx, dy);
  const bend = Math.acos((UPPER_ARM ** 2 + d ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * d));
  const upper = toTarget + bend;
  const ex = s.x - UPPER_ARM * Math.sin(upper);
  const ey = s.y + UPPER_ARM * Math.cos(upper);
  const fore = Math.atan2(-(x - ex), y - ey) - upper;
  const deg = (r) => {
    let a = (r * 180) / Math.PI;
    while (a > 180) a -= 360;
    while (a < -180) a += 360;
    return Math.round(a * 10) / 10;
  };
  return { [`arm${side}U`]: deg(upper), [`arm${side}L`]: deg(fore) };
}

/** Named poses, so every scene speaks the same body language. */
export const POSES = {
  rest: { lean: 0, armFU: 6, armFL: -10, armBU: -4, armBL: -10, handF: 1, handB: 1 },
  pockets: { lean: 0, ...solveArm('F', 12, -41), ...solveArm('B', 7, -42), handF: 0, handB: 0 },
  straps: { lean: 0, ...solveArm('F', 13, -56), ...solveArm('B', 9, -57), handF: 1, handB: 1 },
  thinking: { ...solveArm('F', 11.5, -77), handF: 1 },
  reachUp: { ...solveArm('F', 19, -112), handF: 1 },
  /** one hand held up in front of his face, looking at it */
  lookHand: { ...solveArm('F', 18, -84), handF: 1 },
  /** both hands closed around something small */
  cupped: { ...solveArm('F', 16.5, -58), ...solveArm('B', 14.5, -60), handF: 1, handB: 1 },
  /** cupped hands easing open */
  cuppedOpen: { ...solveArm('F', 20, -60), ...solveArm('B', 11, -58), handF: 1, handB: 1 },
  /** small palms-up shrug */
  shrug: { ...solveArm('F', 20, -48), ...solveArm('B', 12, -49), handF: 1, handB: 1 },
  /** catching himself: arms thrown forward */
  flail: { ...solveArm('F', 24, -70), ...solveArm('B', 20, -82), handF: 1, handB: 1 },
  /** holding something in front of his chest with both hands */
  holdFront: { ...solveArm('F', 18, -62), ...solveArm('B', 16, -64), handF: 1, handB: 1 },
  /** a hand on his chest (tucking something into his hoodie) */
  chest: { ...solveArm('F', 9, -61), handF: 1 },
  /** reaching down into a bag held in his lap (hand out of sight inside it) */
  intoBag: { ...solveArm('F', 14, -58), handF: 0 },
  /** holding something up in front of his face to look at it */
  lookItem: { ...solveArm('F', 21, -80), handF: 1 },
  /** setting something down beside him */
  setDown: { ...solveArm('F', -10, -34), handF: 1 },
  /** sitting on an edge, legs hanging forward */
  sit: { lean: -5, legF: -24, legB: -14, armFU: 10, armFL: -8, armBU: 4, armBL: -6, shadow: 0 },
  /** lying back, hands behind his head (use with a sit and lean ≈ -86) */
  handsBehindHead: { ...solveArm('F', -8, -93), ...solveArm('B', -6, -95), handF: 1, handB: 1 },
};

const DEFAULT_POSE = {
  x: 0,
  y: 0,
  scale: 1,
  facing: 1,
  head: 0,
  lean: 0,
  lift: 0,
  legF: -2,
  legB: 3,
  ...POSES.rest,
  /** scarf wind strength, 0 calm → 1.5 blustery */
  wind: 0.6,
  /** walk in place at this many units/sec (for scenes where the world scrolls) */
  treadmill: 0,
  /** how much the arms swing while walking (0 when holding his straps) */
  armSwing: 1,
  /** 0..1 visibility of the ground shadow (hide when sitting on a ledge) */
  shadow: 1,
  /** 0..1 visibility of the backpack and strap (0 once he takes it off) */
  gear: 1,
  /** held props keep this absolute angle instead of turning with the forearm */
  propFRot: 0,
  propBRot: 0,
};

/**
 * The backpack, top-left at (x, y). Shared by the rig and by the prop he sets
 * down later, so both are always the same object. `open` lifts the flap.
 */
export function packMarkup(P, x, y, { open = false } = {}) {
  const at = (dx, dy) => `${(x + dx).toFixed(2)} ${(y + dy).toFixed(2)}`;
  const flap = open
    ? `<ellipse cx="${x + 7.75}" cy="${y + 2.6}" rx="6.6" ry="2.2" fill="${P.packStrap}"/>
       <path d="M${at(0.6, 2)} Q${at(2, -6)} ${at(8, -7.5)} Q${at(14, -6)} ${at(14.9, 2)} Z" fill="${P.packFlap}"/>`
    : `<path d="M${at(0, 10)} Q${at(0, 0)} ${at(7.8, 0)} Q${at(15.5, 0)} ${at(15.5, 10)} L${at(15.5, 13.5)} L${at(0, 13.5)} Z" fill="${P.packFlap}"/>
       <rect x="${x + 6.6}" y="${y + 11.4}" width="2.6" height="4.2" rx="1" fill="${P.packStrap}"/>`;
  return `
    <rect x="${x}" y="${y + 1.5}" width="15.5" height="28" rx="5" fill="${P.pack}"/>
    ${flap}
    <rect x="${x + 2.5}" y="${y + 20}" width="10.5" height="7.5" rx="2.6" fill="${P.packFlap}" opacity="0.55"/>`;
}

function markup(P) {
  const limb = (color, len, width) =>
    `<line x1="0" y1="0" x2="0" y2="${len}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

  const arm = (side, sleeve, cuff) => `
    <g data-part="arm${side}">
      ${limb(sleeve, UPPER_ARM, 9)}
      <g data-part="fore${side}">
        <circle data-part="hand${side}" cx="0" cy="${FOREARM}" r="3.7" fill="${P.skin}"/>
        ${limb(sleeve, 11, 9.4)}
        <line x1="0" y1="10.2" x2="0" y2="11.6" stroke="${cuff}" stroke-width="10.2" stroke-linecap="round"/>
        <g data-part="prop${side}"></g>
      </g>
    </g>`;

  const leg = (side, color) => `
    <g data-part="leg${side}">
      <rect x="-4" y="-3" width="8" height="32" rx="3.6" fill="${color}"/>
      <path d="M-4.6 29 Q-5.2 36 -1 36 L8 36 Q10.8 36 10.3 33 Q9.7 29.4 4 29 Z" fill="${P.shoe}"/>
      <rect x="-5" y="35" width="15.6" height="1.5" rx="0.75" fill="${P.sole}" opacity="0.45"/>
    </g>`;

  const tail = (id, color, len1, len2) => `
    <g data-part="${id}1">
      <path d="M-3.6 -1.5 Q0 -3 3.6 -1.5 L3.1 ${len1} L-3.1 ${len1} Z" fill="${color}"/>
      <g data-part="${id}2">
        <circle cx="0" cy="0" r="3.1" fill="${color}"/>
        <path d="M-3.1 0 L3.1 0 L2.7 ${len2} L-2.7 ${len2} Z" fill="${color}"/>
        <rect x="-2.8" y="${len2 - 5}" width="5.6" height="1.5" fill="${P.scarfDeep}" opacity="0.8"/>
        <path d="M-1.8 ${len2} v2.8 M0 ${len2} v3.3 M1.8 ${len2} v2.8" stroke="${color}" stroke-width="1.1" stroke-linecap="round"/>
      </g>
    </g>`;

  return `
  <ellipse data-part="shadow" cx="1" cy="0.6" rx="17" ry="2.8" fill="${P.shadow}"/>
  <g data-part="root">
    <g data-part="bodyBack">
      ${tail('tailB', P.scarfShade, 11, 11)}
      ${arm('B', P.hoodieDark, P.hoodieDark)}
    </g>
    <g data-part="legs">
      ${leg('B', P.trousersBack)}
      ${leg('F', P.trousers)}
    </g>
    <g data-part="bodyFront">
      <path d="M-9 -73 C-14 -73 -16 -67 -16.5 -60 L-18.5 -38 C-19 -33.5 -17 -31 -13.5 -31 L13.5 -31 C17 -31 18.8 -33.5 18.2 -37 L15.5 -60 C15 -67 13 -73 8 -73 Z" fill="${P.hoodie}"/>
      <path d="M-18.8 -36.2 L18.4 -36.2 L18.3 -34 C18 -32 16.6 -31 13.5 -31 L-13.5 -31 C-17 -31 -18.9 -32.4 -18.9 -34 Z" fill="${P.hoodieShade}"/>
      <path d="M3.5 -48.5 Q10.5 -49.5 15.9 -46.5 L16.9 -39.5 L4 -39.5 Z" fill="${P.hoodieShade}" opacity="0.75"/>
      <path d="M12.5 -71.5 C15 -68 15.7 -63 16 -58 L18.2 -39" stroke="${P.hoodieLight}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="0.6"/>
      <g data-part="gear">
        <path d="M-10 -69 C-3 -68 3 -62 6.5 -51" stroke="${P.packStrap}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <g data-part="pack">${packMarkup(P, -28, -70)}</g>
      </g>
      <path d="M-14 -65.5 C-18 -70 -14.5 -78.5 -6 -77 L-1.5 -71 Z" fill="${P.hoodieShade}"/>
      <rect x="-10.5" y="-78" width="23" height="8.6" rx="4.3" fill="${P.scarf}"/>
      <path d="M-8 -73.4 Q1.5 -71.4 10.5 -73.8" stroke="${P.scarfShade}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M6.2 -71.5 L11.6 -71.5 L12.4 -60.5 L7.6 -60.8 Z" fill="${P.scarf}"/>
      <rect x="7.5" y="-64.4" width="4.8" height="1.4" fill="${P.scarfDeep}" opacity="0.7"/>
      ${tail('tailA', P.scarf, 13, 13)}
      <g data-part="head">
        <g transform="translate(1 -12.5)">
          <circle cx="0" cy="0" r="14.5" fill="${P.skin}"/>
          <circle cx="14.4" cy="1.6" r="2.1" fill="${P.skin}"/>
          <ellipse cx="8.6" cy="5.6" rx="2.9" ry="1.9" fill="${P.blush}" opacity="0.45"/>
          <path d="M12.6 -8.4 A15.6 15.6 0 0 0 -13.9 8.2 C-10.8 9.6 -7.6 7.2 -6 3 C-4.6 -1.2 -1.8 -4.6 3.6 -5 C7.2 -5.2 10 -6.2 12.6 -8.4 Z" fill="${P.hair}"/>
          <path d="M-3 -15.2 Q0.5 -20.5 4.6 -16.6" stroke="${P.hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
          <ellipse cx="-3.6" cy="2.4" rx="2.5" ry="3.3" fill="${P.skinShade}"/>
        </g>
      </g>
      <g data-part="lap"></g>
      ${arm('F', P.hoodie, P.hoodieShade)}
    </g>
  </g>`;
}

/**
 * Create the boy. Append `boy.el` inside a parallax layer (usually depth 1).
 * Returns { el, pose, to(), walk(), turn(), onStep(), destroy() }.
 */
export function createCharacter({ stage, reduced = false, palette = BOY, phase: startPhase = 0, walkAmount: startWalk = 0, ...initial }) {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('class', 'character');
  el.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = markup(palette);

  const part = (name) => el.querySelector(`[data-part="${name}"]`);
  const parts = {
    root: part('root'),
    legs: part('legs'),
    bodyBack: part('bodyBack'),
    bodyFront: part('bodyFront'),
    legF: part('legF'),
    legB: part('legB'),
    armF: part('armF'),
    armB: part('armB'),
    foreF: part('foreF'),
    foreB: part('foreB'),
    handF: part('handF'),
    handB: part('handB'),
    head: part('head'),
    pack: part('pack'),
    gear: part('gear'),
    shadow: part('shadow'),
    propF: part('propF'),
    propB: part('propB'),
    lap: part('lap'),
    tailA1: part('tailA1'),
    tailA2: part('tailA2'),
    tailB1: part('tailB1'),
    tailB2: part('tailB2'),
  };

  const pose = { ...DEFAULT_POSE, ...initial };
  const motion = reduced ? 0.45 : 1;
  const stepListeners = new Set();

  let prevX = pose.x;
  let walkAmount = startWalk;
  let phase = startPhase;
  let stepCount = Math.floor(phase / Math.PI + 0.5);
  let lastTransform = '';
  let groundFn = null;

  const f = (n) => n.toFixed(2);
  const set = (node, value) => node.setAttribute('transform', value);

  function update(time, dt) {
    const p = pose;
    if (groundFn) p.y = groundFn(p.x);

    // --- locomotion: legs are driven by distance travelled, so feet never slide
    let dx = Math.abs(p.x - prevX);
    if (dx > 40) dx = 0; // a jump cut / seek, not a walk
    prevX = p.x;
    const travelled = (dx + Math.abs(p.treadmill) * dt) / p.scale; // bigger boy, longer stride
    const target = Math.min(1, travelled / Math.max(dt, 1e-4) / 30);
    walkAmount += (target - walkAmount) * Math.min(1, dt * 7);
    phase += (Math.PI * travelled) / STEP;

    const contact = Math.floor(phase / Math.PI + 0.5);
    if (contact !== stepCount) {
      stepCount = contact;
      if (walkAmount > 0.4) stepListeners.forEach((fn) => fn());
    }

    const w = walkAmount;
    const s = Math.sin(phase);
    const legSwing = 24 * w;
    const legF = p.legF - s * legSwing;
    const legB = p.legB + s * legSwing;
    const hipDrop = LEG * (1 - Math.cos((Math.abs(s) * legSwing * Math.PI) / 180));

    // --- the living layer
    const breath = Math.sin(time * 1.7) * 0.55 * motion * (1 - w);
    let uphill = 0;
    if (groundFn) {
      // lean into slopes while walking: forward going up, back going down
      const slope = (groundFn(p.x + 6) - groundFn(p.x - 6)) / 12;
      uphill = Math.max(-6, Math.min(14, -slope * Math.sign(p.facing || 1) * 22)) * w;
    }
    const lean = p.lean + 5 * w + uphill;
    const armSwing = 20 * w * p.armSwing;
    const head = p.head + Math.sin(time * 0.55) * 0.9 * motion * (1 - w) + Math.sin(phase * 2) * 1.4 * w;
    const packY = w * 1.2 * Math.sin(phase * 2 - 0.9) + breath * 0.3;
    const packRot = w * 3 * Math.sin(phase * 2 - 1.3);

    const gust = 0.5 + 0.5 * Math.sin(time * 0.43 + 1.1);
    const tailBase = 14 + p.wind * (26 + 12 * gust) + 16 * w;
    const a1 = tailBase + motion * ((4 + 5 * p.wind) * Math.sin(time * 2.7) + 2.5 * Math.sin(time * 6.1 + 0.8));
    const a2 = motion * ((9 + 7 * p.wind) * Math.sin(time * 2.7 - 1.2) + 3.5 * Math.sin(time * 6.6 + 2.1)) + 6 * w;
    const b1 = tailBase - 9 + motion * ((4 + 4 * p.wind) * Math.sin(time * 2.4 + 1.7) + 2 * Math.sin(time * 5.3));
    const b2 = motion * (8 + 6 * p.wind) * Math.sin(time * 2.4 + 0.4);

    // --- write transforms
    const body = `translate(0 ${f(hipDrop + p.lift + breath)}) rotate(${f(lean)} 0 ${HIP_Y})`;
    set(parts.root, `scale(${f(p.facing)} 1)`);
    set(parts.legs, `translate(0 ${f(hipDrop + p.lift)})`);
    set(parts.bodyBack, body);
    set(parts.bodyFront, body);
    set(parts.legF, `translate(3 ${HIP_Y}) rotate(${f(legF)})`);
    set(parts.legB, `translate(-3 ${HIP_Y}) rotate(${f(legB)})`);
    const armFU = p.armFU + s * armSwing;
    const armBU = p.armBU - s * armSwing;
    const armFL = p.armFL - 14 * w;
    const armBL = p.armBL - 14 * w;
    set(parts.armF, `translate(${SHOULDER.F.x} ${SHOULDER.F.y}) rotate(${f(armFU)})`);
    set(parts.armB, `translate(${SHOULDER.B.x} ${SHOULDER.B.y}) rotate(${f(armBU)})`);
    set(parts.foreF, `translate(0 ${UPPER_ARM}) rotate(${f(armFL)})`);
    set(parts.foreB, `translate(0 ${UPPER_ARM}) rotate(${f(armBL)})`);
    if (parts.propF.firstChild) set(parts.propF, `translate(0 ${FOREARM}) rotate(${f(p.propFRot - (armFU + armFL + lean))})`);
    if (parts.propB.firstChild) set(parts.propB, `translate(0 ${FOREARM}) rotate(${f(p.propBRot - (armBU + armBL + lean))})`);
    parts.shadow.setAttribute('opacity', f(p.shadow));
    parts.gear.setAttribute('opacity', f(p.gear));
    set(parts.handF, `translate(0 ${FOREARM}) scale(${f(p.handF)}) translate(0 ${-FOREARM})`);
    set(parts.handB, `translate(0 ${FOREARM}) scale(${f(p.handB)}) translate(0 ${-FOREARM})`);
    set(parts.head, `translate(2 -75) rotate(${f(head)})`);
    set(parts.pack, `translate(0 ${f(packY)}) rotate(${f(packRot)} -20 -68)`);
    set(parts.tailA1, `translate(-8 -74) rotate(${f(a1)})`);
    set(parts.tailA2, `translate(0 13) rotate(${f(a2)})`);
    set(parts.tailB1, `translate(-6.5 -72) rotate(${f(b1)})`);
    set(parts.tailB2, `translate(0 11) rotate(${f(b2)})`);

    const { u } = stage.metrics;
    const transform = `translate3d(${f((p.x + VIEW.x) * u)}px, ${f((p.y + VIEW.y) * u)}px, 0) scale(${f(p.scale)})`;
    if (transform !== lastTransform) {
      el.style.transform = transform;
      lastTransform = transform;
    }
  }

  const tick = (time, deltaMs) => update(time, Math.min(deltaMs / 1000, 0.05));
  gsap.ticker.add(tick);
  update(gsap.ticker.time, 0);

  return {
    el,
    pose,
    /** Tween pose values: boy.to({ head: -20, ...POSES.straps }, { duration: 1 }) */
    to(vars, opts = {}) {
      return gsap.to(pose, { duration: 1, ease: EASE.drift, ...opts, ...vars });
    },
    /** Quick paper-cutout turn to face a direction (1 right, -1 left). */
    turn(facing, { duration = 0.32 } = {}) {
      return gsap.to(pose, { facing, duration, ease: 'power2.inOut' });
    },
    /**
     * Walk to x. Pass `from` when chaining walks inside a prebuilt timeline,
     * so durations are computed from where he will be, not where he is now.
     */
    walk(x, { from = pose.x, speed = 55, ease = 'sine.inOut', autoTurn = true, facing = pose.facing } = {}) {
      const tl = gsap.timeline();
      const dir = Math.sign(x - from) || 1;
      if (autoTurn && Math.sign(facing) !== dir) tl.add(this.turn(dir));
      tl.to(pose, { x, duration: Math.abs(x - from) / speed, ease });
      return tl;
    },
    /**
     * Walk to x like a person: ease into the pace, hold it, ease out.
     * accel / decel are seconds (0 = already moving / keep going).
     * The steady middle is linear, so a scene can cut mid-stride.
     */
    stroll(x, { from = pose.x, speed = 60, accel = 1, decel = 1.4, autoTurn = true, facing = pose.facing } = {}) {
      const tl = gsap.timeline();
      const dir = Math.sign(x - from) || 1;
      if (autoTurn && Math.sign(facing) !== dir) tl.add(this.turn(dir));
      const total = Math.abs(x - from);
      // a sine ease reaches top speed (π/2)·distance/duration
      let d1 = (speed * accel) / (Math.PI / 2);
      let d3 = (speed * decel) / (Math.PI / 2);
      let k = 1;
      if (d1 + d3 > total) {
        k = total / (d1 + d3);
        d1 *= k;
        d3 *= k;
      }
      const a = from + dir * d1;
      const b = x - dir * d3;
      if (d1 > 0) tl.to(pose, { x: a, duration: accel * k, ease: 'sine.in' });
      if (Math.abs(b - a) > 0.01) tl.to(pose, { x: b, duration: Math.abs(b - a) / speed, ease: 'none' });
      if (d3 > 0) tl.to(pose, { x, duration: decel * k, ease: 'sine.out' });
      return tl;
    },
    onStep(fn) {
      stepListeners.add(fn);
      return () => stepListeners.delete(fn);
    },
    /** Put SVG markup in a hand ('F' front, 'B' back), centred on the palm. null empties it. */
    hold(side, svg) {
      const slot = side === 'B' ? parts.propB : parts.propF;
      slot.innerHTML = svg ?? '';
      update(gsap.ticker.time, 0);
    },
    /** Something held against his chest/lap, in front of his body (body coordinates). */
    lap(svg) {
      parts.lap.innerHTML = svg ?? '';
    },
    /**
     * Draw his near (front) arm behind his body and head instead of in front —
     * e.g. hands tucked behind his head while lying down. 'front' restores it.
     */
    armLayer(where) {
      if (where === 'back') parts.bodyBack.appendChild(parts.armF);
      else parts.bodyFront.appendChild(parts.armF);
    },
    /** Keep his feet on a ground line y = fn(x) (null to let scenes move y freely). */
    setGround(fn) {
      groundFn = fn;
      if (fn) pose.y = fn(pose.x);
    },
    /** Everything needed to continue him seamlessly in the next scene. */
    state() {
      return { ...pose, phase, walkAmount };
    },
    destroy() {
      gsap.ticker.remove(tick);
      stepListeners.clear();
    },
  };
}
