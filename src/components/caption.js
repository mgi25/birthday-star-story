import { gsap } from '../animation/gsap.js';
import { splitWords, readingTime, revealWords, dissolve } from '../animation/text.js';
import { narration, VOICE_DELAY } from '../audio/narration.js';
import { el } from '../core/dom.js';

/**
 * Narration. Every line is built up front and stacked in one grid cell, so
 * the scene timeline only animates (and can be scrubbed or seeked) without
 * ever mutating text mid-flight. Visual lines are aria-hidden; the scene's
 * live region announces each line as it appears.
 *
 * A narrated line (see audio/narrationScript.js) also starts its recording:
 * the voice begins just after the caption starts to appear, and the caption
 * stays until the voice has finished (never shorter than its own hold).
 */
export function createCaptions(parent, { reduced = false, announce = () => {} } = {}) {
  const stack = el('div', 'captions', parent);
  stack.setAttribute('aria-hidden', 'true');
  /** When the last line placed with at() / sequence() has fully gone. */
  let last = 0;

  function line(text, { voice: id = null } = {}) {
    const p = el('p', 'caption', stack);
    const words = splitWords(p, text);
    // Measured from the recording when the scene is built; null = caption only.
    const voice = id ? narration.cue(id) : null;

    return {
      el: p,
      text,
      /** Seconds from the start of play() until the voice finishes (0 when silent). */
      speechEnd: voice ? VOICE_DELAY + voice.spoken : 0,
      /**
       * Timeline: reveal → hold → dissolve.
       * keep: true leaves the line on screen (e.g. above a button).
       */
      play({ hold = readingTime(text), keep = false, out = 1.3 } = {}) {
        const tl = gsap.timeline();
        tl.set(p, { autoAlpha: 1, yPercent: 0 });
        tl.call(() => announce(text));
        const reveal = revealWords(words, { reduced });
        tl.add(reveal);
        if (voice) {
          tl.call(() => narration.speak(id), null, VOICE_DELAY - voice.lead);
          const spoken = VOICE_DELAY + voice.spoken + voice.after;
          hold = Math.max(hold, spoken - reveal.duration());
          // Whatever follows a kept line waits for its voice too.
          if (keep) tl.set({}, {}, spoken);
        }
        if (!keep) tl.add(dissolve(p, { reduced, duration: out }), `+=${hold}`);
        return tl;
      },
      hide(opts) {
        return dissolve(p, { reduced, ...opts });
      },
    };
  }

  /** A line from the narration script, with its recording. */
  function narrated(id) {
    return line(narration.text(id), { voice: id });
  }

  /**
   * Play a line at `position` (seconds, label or label±offset), or later if
   * the previous line is still on screen: a longer recording can push a line
   * back, never under another. Returns absolute times { start, end, speechEnd }.
   */
  function at(tl, l, position, opts) {
    tl.addLabel('caption:at', position);
    const start = Math.max(tl.labels['caption:at'], last);
    tl.removeLabel('caption:at');
    const clip = l.play(opts);
    tl.add(clip, start);
    last = start + clip.duration();
    return { start, end: last, speechEnd: start + l.speechEnd };
  }

  /**
   * Add lines to a timeline one after another, never overlapping.
   * steps: [{ line, at?, gap?, hold?, out? }] — `at` is the earliest start,
   * otherwise the line starts `gap` seconds after the previous one has fully faded.
   * Returns { end, starts }: when the last line has gone, and when each began.
   */
  function sequence(tl, steps, start = 0) {
    let t = start;
    const starts = [];
    for (const { line: l, at: earliest, gap = 0.4, ...opts } of steps) {
      const begin = Math.max(earliest ?? t + gap, t, last);
      const clip = l.play(opts);
      tl.add(clip, begin);
      starts.push(begin);
      t = begin + clip.duration();
      last = t;
    }
    return { end: t, starts };
  }

  return { el: stack, line, narrated, at, sequence };
}
