# The Boy Who Collected Stars

A short animated film for the browser (about 5 minutes). Vite + vanilla JS + SVG + canvas + GSAP;
builds to plain static files.

## Personalise it

Everything personal lives in **`src/config.js`**:

| what | where |
| --- | --- |
| her name (final title) | `storyConfig.herName` |
| the letter the stars form | `storyConfig.herInitial` (A–Z; leave `''` to use the first letter of her name) |
| the date under the title | `storyConfig.birthday` |
| the letter text (Scene 7) | `letter` (exact wording; `\n` is a line break) |
| recorded sounds | `audioFiles` (drop files in `public/audio/`, put relative paths here) |

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:phone    # same, reachable from a phone on your Wi-Fi
npm run build        # static site in dist/ (deploy anywhere, any sub-folder)
npm run preview      # serve the built dist/ locally
```

## Reviewing scenes

| param | effect |
| --- | --- |
| `?scene=1` … `?scene=9`, `?scene=credits` | start at a scene (`?scene=lab`: dev turntable for the boy) |
| `?t=20` | jump 20 s into that scene |
| `?speed=3` | play everything 3× faster |
| `?motion=reduced` | force the reduced-motion version |
| `?quality=low` | simulate a low-powered phone |
| `?debug` | in production builds: expose `window.__story` and the **R** (restart scene) key |

**M** toggles sound at any time. Sound only starts after **Begin** (browser rule), so a scene opened
directly with `?scene=` plays silently.

## How the film is put together

- **Scenes** (`src/scenes/`) are `{ id, title, next, ambience, music, create(ctx) }`. `create` builds DOM and
  returns a paused GSAP timeline. The scene manager (`src/core/sceneManager.js`) mounts/unmounts them and
  cleans up everything (GSAP context, ticker callbacks, listeners).
- **One continuous journey.** Most scenes join with an invisible **cut**: the next scene rebuilds the same
  seeded world and starts on the exact frame the previous one ended on (state passed as `handoff`).
  Scene 4 → 5 passes through cloud, Scene 5 → 6 is a dissolve, the ending fades to black.
- **Worlds** (`src/worlds/`): `journey.js` (town → hill → forest → mountain, Scenes 1–4, Scene 1's town is
  generated exactly as approved), `mountain.js`, `summit.js` (Scenes 5–9).
- **World units:** the stage is always 1000 units tall; x = 0 is the centre. The camera (`animation/camera.js`)
  moves parallax layers by depth and zooms the world (sky and stars stay put, like real distant things).
- **The boy** (`components/character.js`): one SVG rig used everywhere — named poses, walk cycle, scarf, props in
  hand, sitting and lying.
- **Narration** (`components/caption.js`): lines are sequenced so two never overlap.

## Structure

```
src/
  config.js               personal values, letter text, audio file paths
  main.js                 boot
  core/                   stage, scene manager, device flags, palette, RNG, DOM helpers
  animation/              GSAP setup, camera, text reveals, transitions
  components/             character, starfield, fireflies, constellation, layer, scenery,
                          caption, cine button, wash, grain, sound toggle
  worlds/                 journey (town/forest), mountain, summit
  scenes/                 scene1Night … scene9Ending, afterCredits, characterLab (dev)
  audio/                  audio manager (buses, unlock, levels), cues, procedural placeholders
  styles/                 tokens, base, stage, ui
public/audio/             put recordings here
```
