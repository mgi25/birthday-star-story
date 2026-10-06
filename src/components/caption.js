import { gsap } from '../animation/gsap.js';
import { splitWords, readingTime, revealWords, dissolve } from '../animation/text.js';
import { el } from '../core/dom.js';

/**
 * Narration. Every line is built up front and stacked in one grid cell, so
 * the scene timeline only animates (and can be scrubbed or seeked) without
 * ever mutating text mid-flight. Visual lines are aria-hidden; the scene's
 * live region announces each line as it appears.
 */
export function createCaptions(parent, { reduced = false, announce = () => {} } = {}) {
  const stack = el('div', 'captions', parent);
  stack.setAttribute('aria-hidden', 'true');

  function line(text) {
    const p = el('p', 'caption', stack);
    const words = splitWords(p, text);

    return {
      el: p,
      text,
      /**
       * Timeline: reveal → hold → dissolve.
       * keep: true leaves the line on screen (e.g. above a button).
       */
      play({ hold = readingTime(text), keep = false, out = 1.3 } = {}) {
        const tl = gsap.timeline();
        tl.set(p, { autoAlpha: 1, yPercent: 0 });
        tl.call(() => announce(text));
        tl.add(revealWords(words, { reduced }));
        if (!keep) tl.add(dissolve(p, { reduced, duration: out }), `+=${hold}`);
        return tl;
      },
      hide(opts) {
        return dissolve(p, { reduced, ...opts });
      },
    };
  }

  /**
   * Add lines to a timeline one after another, never overlapping.
   * steps: [{ line, at?, gap?, hold?, out? }] — `at` is absolute, otherwise
   * the line starts `gap` seconds after the previous one has fully faded.
   * Returns { end, starts }: when the last line has gone, and when each began.
   */
  function sequence(tl, steps, start = 0) {
    let t = start;
    const starts = [];
    for (const { line: l, at, gap = 0.4, ...opts } of steps) {
      const begin = at ?? t + gap;
      const clip = l.play(opts);
      tl.add(clip, begin);
      starts.push(begin);
      t = begin + clip.duration();
    }
    return { end: t, starts };
  }

  return { el: stack, line, sequence };
}
