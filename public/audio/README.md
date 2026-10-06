# Audio files

Put recordings here (mp3 or m4a/aac play on every phone; add an ogg too if you like).

Then point the matching cue at the file in `src/audio/cues.js`:

```js
'amb.night': { bus: 'ambience', loop: true, volume: 0.55, src: 'audio/night-ambience.mp3', synth: 'wind' },
```

Use a relative path (no leading slash). Once `src` is set, the file replaces the
procedural placeholder named by `synth`. If the file fails to load, the placeholder plays instead.

Tips:
- Loops: trim to zero-crossings, or export with a short crossfade baked in.
- Keep ambience quiet and wide; the visuals carry the film.
- Mobile data: aim for under 1–2 MB per file (128 kbps mono is plenty for ambience).
