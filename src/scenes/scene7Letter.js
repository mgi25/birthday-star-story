import './summit.css';
import { gsap, EASE } from '../animation/gsap.js';
import { createCamera } from '../animation/camera.js';
import { el } from '../core/dom.js';
import { createCharacter, POSES } from '../components/character.js';
import { createWash } from '../components/wash.js';
import { readingTime } from '../animation/text.js';
import { letter as LETTER } from '../config.js';
import { buildSummit, ITEMS, LAP_PACK } from '../worlds/summit.js';
import { SIT_FRAME, SITTING, swingLegs } from './scene6QuietMoment.js';

/*
 * SCENE 7 — THE LETTER
 *
 * The heart of the film. He unfolds the letter; the world dims and the
 * camera leans in; the paper lifts out of his hands toward us until it can
 * be read. The words arrive a sentence at a time, with time to read each.
 * After the last line we stay with it. Then it settles back into his hands.
 */

/** Where his front hand holds the paper (body coordinates, see POSES.holdFront). */
const HAND = { x: 18, y: -62 };
const OPEN = { ...POSES.holdFront, ...{ armFU: POSES.holdFront.armFU - 2 } };

export default {
  id: 'scene7',
  title: 'The Letter',
  next: 'scene8',
  ambience: 'amb.summit',
  ambienceLevel: 0.22,
  music: 0.06,

  create(ctx) {
    const { stage, audio, reduced, handoff } = ctx;
    const frame = ctx.frame();

    const camera = createCamera(stage, { ...SIT_FRAME, reduced });
    camera.setWorld(frame.world);
    ctx.onCleanup(camera.destroy);

    const w = buildSummit(ctx, frame, camera);
    ['map', 'snack', 'telescope'].forEach((name) => gsap.set(w.item(name), { opacity: 1 }));
    const dim = createWash(frame.picture, 'dim', 0);

    const boy = createCharacter({ stage, reduced, ...SITTING, ...POSES.holdFront, head: 10, lean: 1, ...handoff?.boy });
    w.layers.summit.host.appendChild(boy.el);
    ctx.onCleanup(boy.destroy);
    boy.lap(LAP_PACK);
    boy.hold('F', ITEMS.letterFolded);
    swingLegs(boy, reduced);

    // --- the letter itself: real text on paper, in the UI layer (never dimmed)
    const sheet = el('div', 'letter', frame.ui);
    sheet.setAttribute('aria-hidden', 'true');
    const paper = el('div', 'letter__paper', sheet);
    const body = el('div', 'letter__body', paper);
    const paras = LETTER.map((text) => {
      const p = el('p', 'letter__para', body);
      text.split('\n').forEach((part, i) => {
        if (i) p.appendChild(document.createElement('br'));
        p.appendChild(document.createTextNode(part));
      });
      return p;
    });

    // Layout-dependent numbers, measured when needed (fonts are loaded by now).
    const margin = () => Math.max(20, stage.metrics.height * 0.05);
    const handPx = () => {
      const [sx, sy] = camera.toScreen(boy.pose.x + HAND.x, boy.pose.y + HAND.y + boy.pose.lift);
      const { u, width } = stage.metrics;
      return [width / 2 + sx * u, sy * u];
    };
    /** y (px) for the sheet so paragraph i is comfortably in view. */
    const restY = (i) => {
      const H = stage.metrics.height;
      const h = paper.offsetHeight;
      const m = margin();
      if (h <= H - 2 * m) return (H - h) / 2;
      const p = paras[i];
      const bottom = p.offsetTop + p.offsetHeight + 28;
      return Math.max(H - m - h, Math.min(m, H - m - bottom - H * 0.06));
    };
    const handTransform = () => {
      const [px, py] = handPx();
      const { width } = stage.metrics;
      const h = paper.offsetHeight;
      const s = (16 * stage.metrics.u * camera.state.zoom) / paper.offsetWidth;
      return { x: px - width / 2, y: py - h / 2, scale: s, rotation: -6 };
    };

    const tl = gsap.timeline({ paused: true });

    // He unfolds it in his hands.
    tl.call(() => audio.play('sfx.paper'), null, 0.1);
    tl.call(() => boy.hold('F', ITEMS.letterOpen), null, 0.35);
    tl.add(boy.to({ ...OPEN, head: 12 }, { duration: 0.6 }), 0.2);

    // The world dims; the camera leans in.
    tl.to(dim, { opacity: 0.6, duration: 3.2, ease: EASE.drift }, 0.6);
    tl.add(camera.to({ zoom: 2.75, duration: 7, ease: 'sine.inOut' }), 0.4);

    // The paper lifts out of his hands toward us, unfolding as it comes.
    const lift = 1.5;
    tl.set(sheet, { autoAlpha: 1 }, lift);
    tl.call(() => boy.hold('F', null), null, lift);
    if (reduced) {
      tl.fromTo(sheet, { x: 0, y: () => restY(0), scale: 1, rotation: 0, opacity: 0 }, { opacity: 1, duration: 1.6, ease: EASE.drift, immediateRender: false }, lift);
    } else {
      tl.fromTo(
        sheet,
        { ...{ x: () => handTransform().x, y: () => handTransform().y, scale: () => handTransform().scale, rotation: -6 } },
        { x: 0, y: () => restY(0), scale: 1, rotation: -0.6, duration: 2.8, ease: 'power2.inOut', immediateRender: false },
        lift,
      );
      tl.fromTo(paper, { clipPath: 'inset(33% 0% 33% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'power2.out' }, lift + 0.6);
    }

    // The words, a sentence at a time, each given time to be read.
    let t = lift + 3.2;
    paras.forEach((p, i) => {
      const text = LETTER[i];
      tl.call(() => ctx.announce(text.replace('\n', ' ')), null, t);
      tl.fromTo(p, { opacity: 0, y: reduced ? 0 : 6 }, { opacity: 1, y: 0, duration: 1.5, ease: EASE.arrive }, t);
      if (i > 0) tl.to(sheet, { y: () => restY(i), duration: 1.8, ease: 'sine.inOut' }, t - 0.2);
      const words = text.split(/\s+/).length;
      t += i === paras.length - 1 ? 1.5 : readingTime(text, { base: 1.1, perWord: 0.23, min: 3.2 }) + (words > 30 ? 0.6 : 0);
    });

    // "Happy birthday, my love." — and we stay with it.
    const settle = t + 2.6;

    // It settles back into his hands; the world returns.
    if (reduced) {
      tl.to(sheet, { autoAlpha: 0, duration: 1.4 }, settle);
    } else {
      tl.to(sheet, { x: () => handTransform().x, y: () => handTransform().y, scale: () => handTransform().scale, rotation: -6, duration: 2.4, ease: 'power2.inOut' }, settle);
      tl.to(sheet, { autoAlpha: 0, duration: 0.25 }, settle + 2.2);
    }
    tl.call(() => boy.hold('F', ITEMS.letterOpen), null, settle + 2.25);
    tl.to(dim, { opacity: 0, duration: 3, ease: EASE.drift }, settle + 0.8);
    tl.add(camera.to({ zoom: SIT_FRAME.zoom, duration: 3.2, ease: 'sine.inOut' }), settle + 0.6);
    tl.call(() => ctx.next({ transition: 'cut', handoff: { boy: boy.state() } }), null, settle + 3.9);

    return { timeline: tl, debug: { camera, boy, sheet, paras } };
  },
};
