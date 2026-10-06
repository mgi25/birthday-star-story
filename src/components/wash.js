import { el } from '../core/dom.js';

/**
 * A full-frame colour wash inside the picture (above the world, below the
 * narration). 'cloud' is used to pass through cloud between scenes: the
 * outgoing scene fades it in, the next scene starts covered and fades it out.
 */
export function createWash(picture, kind = 'cloud', opacity = 0) {
  const wash = el('div', `scene__wash wash--${kind}`, picture);
  wash.setAttribute('aria-hidden', 'true');
  wash.style.opacity = String(opacity);
  return wash;
}
