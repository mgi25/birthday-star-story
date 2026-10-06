import { gsap, EASE } from '../animation/gsap.js';

/**
 * The film's only kind of button: quiet, tracked capitals, hairline border.
 * onPress runs synchronously inside the click, so it may unlock audio.
 * It fires once; call reset() to arm it again.
 */
export function createCineButton({ label, onPress, parent = null, reduced = false }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cine-button';
  button.textContent = label;
  if (parent) parent.appendChild(button);

  let pressed = false;
  button.addEventListener('click', (event) => {
    if (pressed) return;
    pressed = true;
    button.disabled = true;
    onPress?.(event);
  });

  return {
    el: button,
    show({ duration = 1.6 } = {}) {
      return gsap.fromTo(
        button,
        { autoAlpha: 0, y: reduced ? 0 : 8 },
        { autoAlpha: 1, y: 0, duration, ease: EASE.arrive },
      );
    },
    hide({ duration = 0.7 } = {}) {
      return gsap.to(button, { autoAlpha: 0, duration, ease: EASE.drift });
    },
    reset() {
      pressed = false;
      button.disabled = false;
    },
  };
}
