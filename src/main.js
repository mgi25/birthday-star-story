import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/stage.css';
import './styles/ui.css';

import { gsap } from './animation/gsap.js';
import { createStage } from './core/stage.js';
import { createSceneManager } from './core/sceneManager.js';
import { audio } from './audio/audioManager.js';
import { narration } from './audio/narration.js';
import { installGrain } from './components/grain.js';
import { createSoundToggle } from './components/soundToggle.js';
import { scenes, FIRST_SCENE, FALLBACK_SCENE } from './scenes/index.js';

/*
 * Query params (handy while building scenes):
 *   ?scene=1 | scene1 | lab   start at a scene
 *   ?t=20                     jump to 20s into that scene
 *   ?speed=3                  play everything 3× faster
 *   ?motion=reduced           force the reduced-motion version
 *   ?quality=low              simulate a low-powered phone
 *   ?debug                    expose window.__story and the R (restart) key
 */
const params = new URLSearchParams(window.location.search);
const debug = import.meta.env.DEV || params.has('debug');

const stage = createStage(document.getElementById('stage'));
installGrain(stage.el.querySelector('.stage__grain'));
createSoundToggle(stage.el, audio);

const manager = createSceneManager({ stage, audio, narration, scenes, fallback: FALLBACK_SCENE });

const speed = Number(params.get('speed'));
if (speed > 0) gsap.globalTimeline.timeScale(speed);

function startScene() {
  const requested = params.get('scene');
  const id = requested && /^\d+$/.test(requested) ? `scene${requested}` : requested;
  manager.goTo(id && scenes[id] ? id : FIRST_SCENE, { seek: Number(params.get('t')) || 0 });
}

// Wait briefly for the typeface (so captions never flash in a fallback font)
// and for the narration to be measured (captions are timed to the voice).
const fonts = document.fonts
  ? Promise.all([
      document.fonts.load('500 1em "Cormorant Garamond"'),
      document.fonts.load('600 1em "Cormorant Garamond"'),
    ])
  : Promise.resolve();
Promise.race([Promise.all([fonts.catch(() => {}), narration.preload()]), new Promise((resolve) => setTimeout(resolve, 3000))])
  .catch(() => {})
  .then(startScene);

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  if (event.key === 'm' || event.key === 'M') audio.toggleMute();
  if (debug && (event.key === 'r' || event.key === 'R')) manager.restart();
});

if (debug) window.__story = { manager, audio, narration, stage, gsap };
