# Narration

One recording per storyteller line, named exactly as below. The film finds them by name.
The text is what the caption shows (the same list lives in `src/audio/narrationScript.js`).

| file | line |
| --- | --- |
| `scene1-01.mp3` | Once, there was a boy who spent far too much time looking at the stars. |
| `scene1-02.mp3` | One night, he had a thought. |
| `scene1-03.mp3` | What if he could find the brightest one? |
| `scene2-01.mp3` | Apparently, stars were harder to catch than he expected. |
| `scene3-01.mp3` | Close enough. |
| `scene4-01.mp3` | So he kept going. |
| `scene4-02.mp3` | Because surely… |
| `scene4-03.mp3` | …the higher he went… |
| `scene4-04.mp3` | …the closer he would be. |
| `scene5-01.mp3` | He had finally reached the stars. |
| `scene5-02.mp3` | There were hundreds of them. |
| `scene5-03.mp3` | Beautiful ones. |
| `scene5-04.mp3` | Rare ones. |
| `scene5-05.mp3` | Bright ones. |
| `scene5-06.mp3` | But somehow… *(tender)* |
| `scene5-07.mp3` | …none of them felt like the one he was looking for. *(tender)* |
| `scene6-01.mp3` | Then he remembered something. *(tender)* |
| — | **Scene 7, the letter: no narration.** She reads it herself. |
| `scene8-01.mp3` | Maybe he had been looking in the wrong place all along. *(tender)* |
| `scene8-02.mp3` | Because sometimes… *(tender)* |
| `scene8-03.mp3` | …you don’t find the brightest thing by looking at the sky. *(tender)* |
| `scene9-01.mp3` | I guess I found my star after all. *(tender)* |

## Preparing the files

- **mp3**, mono, 44.1 or 48 kHz, 96–128 kbps. One line per file.
- A little quiet before and after the voice is fine (a few hundred ms). The film finds where the
  voice really starts and stops, so the caption appears as the voice begins and stays until it ends.
- Don't fade the room tone to digital silence; don't add music or effects.
- Levels are evened out automatically. Just avoid clipping.
- *Tender* lines: the film leaves more silence around them. Read them slower and quieter; don't rush.
- "Close enough." is a joke: deliver it dry. The boy's shrug lands right as the line ends.

## Checking

Run `npm run dev`, then in the browser console:

```js
__story.narration.cue('scene3-01') // { onset, end, spoken, … } in seconds, or null if the file wasn't found
```

If a take ever confuses the automatic timing (a loud breath before the first word, say), pin it by hand
in `src/audio/narrationScript.js`, e.g. `'scene2-01': { text: '…', onset: 0.42, end: 3.9 }`.

A missing file is fine: that line simply plays as a caption on its own.
