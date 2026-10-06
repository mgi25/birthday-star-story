import { gsap } from '../animation/gsap.js';
import { createVeil } from '../animation/transitions.js';
import { device } from './device.js';
import { el } from './dom.js';

/**
 * Scene lifecycle.
 *
 * A scene is a plain object:
 *   {
 *     id: 'scene2',
 *     title: 'The First Star',
 *     next: 'scene3',          // where ctx.next() goes
 *     ambience: 'amb.town',    // looping bed for this scene (null = silence)
 *     music: 0.35,             // music level for this scene (omit to leave as is)
 *     create(ctx) {            // build DOM + timeline; return { timeline?, destroy? }
 *   }
 *
 * Transitions between scenes:
 *   'fade'      black veil out → swap → in (default; emotional beats only)
 *   'cut'       swap in the same frame. Used for invisible joins: the next
 *               scene rebuilds the same world and starts on the exact frame
 *               the previous one ended on (`handoff` carries the details).
 *   'dissolve'  the new picture fades in over the old one.
 *
 * Everything GSAP creates inside create() is captured by a gsap.context and
 * reverted on unmount. Anything created later (event handlers, callbacks)
 * must go through ctx.track(fn) to be captured too. Non-GSAP cleanup
 * (ticker callbacks, listeners) goes through ctx.onCleanup(fn).
 */
export function createSceneManager({ stage, audio, scenes, fallback }) {
  const container = stage.el.querySelector('[data-scenes]');
  const narration = stage.el.querySelector('[data-narration]');
  const veil = createVeil(stage.el.querySelector('.stage__veil'));

  let current = null;
  let token = 0;
  const lingering = new Set();

  function mount(def, { handoff = null, entry = 'fade' } = {}) {
    const root = document.createElement('section');
    root.className = `scene scene--${def.id}`;
    root.dataset.scene = def.id;
    root.setAttribute('aria-label', def.title ?? def.id);
    container.appendChild(root);

    const cleanups = [];
    let gctx = null;

    const ctx = {
      id: def.id,
      root,
      stage,
      audio,
      reduced: device.reducedMotion,
      handoff,
      entry,
      onCleanup: (fn) => cleanups.push(fn),
      track: (fn) => gctx.add(fn),
      /** Standard scene structure: picture (backdrop + zoomable world) and UI. */
      frame: () => {
        const picture = el('div', 'scene__picture', root);
        const backdrop = el('div', 'scene__backdrop', picture);
        const world = el('div', 'scene__world', picture);
        const ui = el('div', 'scene__ui', root);
        return { picture, backdrop, world, ui };
      },
      /** Announce narration to screen readers. */
      announce: (text) => {
        narration.textContent = text;
      },
      next: (opts) => goTo(def.next ?? fallback, opts),
      goTo: (id, opts) => goTo(id, opts),
      restart: () => goTo(def.id),
    };

    let result = {};
    gctx = gsap.context(() => {
      result = def.create(ctx) ?? {};
    }, root);

    return { def, root, gctx, cleanups, timeline: result.timeline ?? null, destroy: result.destroy, debug: result.debug, dead: false };
  }

  function unmount(scene) {
    if (scene.dead) return;
    scene.dead = true;
    lingering.delete(scene);
    scene.timeline?.kill();
    try {
      scene.destroy?.();
    } finally {
      for (const fn of scene.cleanups.reverse()) fn();
      scene.gctx.revert();
      scene.root.remove();
    }
  }

  function applyAudio(def) {
    audio.setAmbience(def.ambience ?? null);
    audio.setAmbienceLevel(def.ambienceLevel ?? 1);
    if (typeof def.music === 'number') audio.setMusic(def.music);
  }

  function start(scene, seek) {
    if (!scene.timeline) return;
    if (seek > 0) scene.timeline.seek(seek, true);
    scene.timeline.play();
  }

  /**
   * Change scene. A newer call always wins: if goTo() is called again
   * mid-transition the older one quietly stops.
   */
  async function goTo(id, { seek = 0, transition = 'fade', handoff = null, fadeOut = 1.1, fadeIn = 0.8, dissolve = 1.6 } = {}) {
    const def = scenes[id] ?? scenes[fallback];
    const mine = ++token;
    // Scenes usually ask for the next one from inside a timeline callback.
    // GSAP would adopt a context created there into the calling scene's own
    // context (and revert it along with that scene), so step outside first.
    // A microtask still lands before the next paint: cuts stay seamless.
    await null;
    if (mine !== token) return;
    const previous = current;
    const smooth = previous && !previous.dead && (transition === 'cut' || transition === 'dissolve');

    if (!smooth) {
      if (previous) {
        await veil.close(fadeOut);
        if (mine !== token) return;
        unmount(previous);
      }
      lingering.forEach(unmount);
      current = null;
      narration.textContent = '';
    }

    const scene = mount(def, { handoff, entry: smooth ? transition : 'fade' });
    current = scene;
    applyAudio(def);
    start(scene, seek);

    if (!smooth) {
      await veil.open(fadeIn);
      return;
    }

    lingering.forEach((s) => s !== previous && unmount(s));
    if (transition === 'cut') {
      unmount(previous);
      return;
    }
    // dissolve: the new picture fades in over the old one, then the old one goes.
    lingering.add(previous);
    const picture = scene.root.querySelector('.scene__picture');
    if (!picture) {
      unmount(previous);
      return;
    }
    gsap.fromTo(
      picture,
      { opacity: 0 },
      {
        opacity: 1,
        duration: dissolve,
        ease: 'sine.inOut',
        onComplete() {
          picture.style.opacity = '';
          unmount(previous);
        },
      },
    );
  }

  return {
    goTo,
    restart: () => current && goTo(current.def.id),
    get current() {
      return current;
    },
  };
}
