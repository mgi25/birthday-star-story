import { gsap, EASE } from './gsap.js';

/** Split text into word spans (spaces stay real text so lines wrap naturally). */
export function splitWords(el, text) {
  el.textContent = '';
  const words = text.trim().split(/\s+/);
  return words.map((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word;
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    return span;
  });
}

/**
 * Seconds a line should stay fully visible. Errs on the generous side:
 * the film is watched, not skimmed, and some viewers read slowly.
 */
export function readingTime(text, { base = 1.6, perWord = 0.3, min = 2.8 } = {}) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(min, base + words * perWord);
}

/** Words drift up into place one after another, like breath. */
export function revealWords(words, { duration = 1.2, stagger = 0.085, reduced = false } = {}) {
  return gsap.fromTo(
    words,
    { autoAlpha: 0, yPercent: reduced ? 0 : 32 },
    {
      autoAlpha: 1,
      yPercent: 0,
      duration: reduced ? 0.9 : duration,
      stagger: reduced ? stagger * 0.5 : stagger,
      ease: EASE.arrive,
    },
  );
}

/** The whole line dissolves together. */
export function dissolve(el, { duration = 1.3, reduced = false } = {}) {
  return gsap.to(el, {
    autoAlpha: 0,
    yPercent: reduced ? 0 : -6,
    duration,
    ease: EASE.drift,
  });
}
