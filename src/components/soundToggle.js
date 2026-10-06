/**
 * A faint speaker icon in the corner. It only appears once sound has
 * actually started (after Begin), so the opening stays clean.
 * The M key toggles it too.
 */
export function createSoundToggle(stageEl, audio) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sound-toggle';
  button.setAttribute('aria-label', 'Mute sound');
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/>
      <g class="icon-on"><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path d="M18 6.8a7.4 7.4 0 0 1 0 10.4"/></g>
      <g class="icon-off"><path d="M16 9.5l5 5M21 9.5l-5 5"/></g>
    </svg>`;
  stageEl.appendChild(button);

  button.addEventListener('click', () => audio.toggleMute());

  const sync = () => {
    button.classList.toggle('is-visible', audio.unlocked);
    button.setAttribute('aria-pressed', String(audio.muted));
    button.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
  };
  audio.onChange(sync);
  sync();

  return button;
}
