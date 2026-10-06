import { gsap } from '../animation/gsap.js';
import { audio } from './audioManager.js';
import { NARRATION, NARRATION_DIR } from './narrationScript.js';

/*
 * Recorded narration.
 *
 * Every file is fetched and decoded up front (that needs no user gesture)
 * and measured: where the voice really starts and stops, and how loud the
 * speech is. Scene timelines are built from those numbers, so each caption
 * appears as its voice begins and stays until the line has been spoken.
 * A line without a recording simply keeps its caption-only timing.
 */

/** The voice begins this long after its caption starts to appear. */
export const VOICE_DELAY = 0.15;
/** Quiet kept before the measured onset, so soft first consonants survive. */
const PREROLL = 0.08;
/** How long a caption stays once the voice has finished, before it dissolves. */
const AFTER = { normal: 0.7, tender: 1.4 };
/** How far music and ambience dip under the voice. */
const DUCK = { normal: 0.6, tender: 0.75 };
/** Tender lines sit a touch quieter. */
const LEVEL = { normal: 1, tender: 0.9 };
/** Speech is levelled to this RMS (about −20 dBFS), with peaks kept under the ceiling. */
const TARGET_RMS = 0.1;
const PEAK_CEILING = 0.89;

/**
 * Where the voice starts and ends in a recording, and how loud it is.
 * 10 ms RMS frames; the threshold sits well above the room tone and well
 * below the speech, and must hold for a few frames (a click is not a voice).
 */
function analyse(buffer) {
  const { sampleRate, length, numberOfChannels } = buffer;
  const channels = Array.from({ length: numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const win = Math.max(1, Math.round(sampleRate * 0.01));
  const frames = Math.ceil(length / win);
  const rms = new Float32Array(frames);
  let peak = 0;
  let loudest = 0;
  for (let f = 0; f < frames; f++) {
    const from = f * win;
    const to = Math.min(length, from + win);
    let sum = 0;
    for (let i = from; i < to; i++) {
      let v = 0;
      for (const ch of channels) {
        v += ch[i];
        peak = Math.max(peak, Math.abs(ch[i]));
      }
      v /= numberOfChannels;
      sum += v * v;
    }
    rms[f] = Math.sqrt(sum / (to - from));
    loudest = Math.max(loudest, rms[f]);
  }
  if (loudest < 1e-4) return null;

  const floor = Float32Array.from(rms).sort()[Math.floor(frames * 0.1)];
  const on = Math.max(Math.min(floor * 3.2, loudest * 0.15), loudest * 0.056);
  const off = Math.max(Math.min(floor * 2.5, loudest * 0.1), loudest * 0.03);

  let first = 0;
  for (let f = 0; f < frames; f++) {
    if (rms[f] < on) continue;
    let held = 0;
    for (let k = f; k < Math.min(frames, f + 6); k++) if (rms[k] >= on * 0.5) held++;
    if (held >= 4) {
      first = f;
      break;
    }
  }
  let last = frames - 1;
  while (last > first && rms[last] < off) last--;

  let sum = 0;
  let n = 0;
  for (let f = first; f <= last; f++) {
    if (rms[f] < on) continue;
    sum += rms[f] * rms[f];
    n++;
  }
  return {
    onset: (first * win) / sampleRate,
    end: Math.min(buffer.duration, ((last + 1) * win) / sampleRate),
    speech: Math.sqrt(sum / Math.max(1, n)),
    peak,
  };
}

let decoder = null;
function decode(data) {
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Offline) return Promise.reject(new Error('no Web Audio'));
  decoder ??= new Offline(1, 1, 48000);
  // Callback form also works on older Safari, whose decodeAudioData returns no promise.
  return new Promise((resolve, reject) => {
    decoder.decodeAudioData(data, resolve, reject)?.catch?.(() => {});
  });
}

async function load(id, def) {
  const url = new URL(`${NARRATION_DIR}${id}.mp3`, document.baseURI).href;
  const res = await fetch(url);
  // Some hosts (and dev servers) answer a missing file with a web page.
  if (!res.ok || (res.headers.get('content-type') || '').includes('text/html')) return null;
  const buffer = await decode(await res.arrayBuffer());
  const measured = analyse(buffer);
  if (!measured) return null;

  const mood = def.mood ?? 'normal';
  const onset = Math.min(def.onset ?? measured.onset, buffer.duration);
  const end = Math.max(onset + 0.1, Math.min(def.end ?? measured.end, buffer.duration));
  let gain = Math.min(Math.max(TARGET_RMS / (measured.speech || TARGET_RMS), 0.25), 4);
  gain = Math.min(gain, PEAK_CEILING / measured.peak) * LEVEL[mood] * (def.gain ?? 1);
  return { id, buffer, mood, onset, end, lead: Math.min(PREROLL, onset), gain };
}

function createNarration() {
  const clips = new Map();
  const playing = new Set();
  let loading = null;
  let enabled = true;

  return {
    /** Fetch, decode and measure every line. Safe to call again. */
    preload() {
      loading ??= Promise.all(
        Object.entries(NARRATION).map(([id, def]) =>
          load(id, def)
            .catch((err) => {
              if (import.meta.env.DEV) console.warn(`[narration] could not load "${id}":`, err.message);
              return null;
            })
            .then((clip) => clips.set(id, clip)),
        ),
      ).then(() => {
        if (!import.meta.env.DEV) return;
        const ids = Object.keys(NARRATION);
        const missing = ids.filter((id) => !clips.get(id));
        if (missing.length === ids.length) console.info(`[narration] no recordings in public/${NARRATION_DIR} yet: captions keep their own timing`);
        else if (missing.length) console.info(`[narration] not recorded yet (caption only): ${missing.join(', ')}`);
      });
      return loading;
    },

    /** Resolves once everything is measured, or after `timeout` ms, whichever is first. */
    ready(timeout = 3000) {
      return Promise.race([this.preload(), new Promise((resolve) => setTimeout(resolve, timeout))]);
    },

    /** The caption text for a line. */
    text: (id) => NARRATION[id]?.text ?? '',

    /**
     * Timing a caption needs to follow its recording, or null when there is
     * none (yet). `onset` / `end`: where the voice is in the file. `lead`:
     * playback start → voice onset. `spoken`: onset → end. `after`: how long
     * the caption should stay once the voice has finished.
     */
    cue(id) {
      const clip = clips.get(id);
      if (!clip) return null;
      const { onset, end, lead, mood } = clip;
      return { onset, end, lead, spoken: end - onset, after: AFTER[mood] };
    },

    /** Speak a line now (silently skipped while sound is locked or narration is off). */
    speak(id) {
      const clip = clips.get(id);
      if (!clip || !enabled || !audio.unlocked) return;
      // ?speed= previews run the pictures faster than any voice could follow.
      if (gsap.globalTimeline.timeScale() !== 1) return;

      const now = audio.ctx.currentTime;
      for (const line of playing) {
        if (line.voiceEnd > now + 0.05) {
          // Never cut a voice off; timelines are laid out so this cannot happen.
          if (import.meta.env.DEV) console.warn(`[narration] "${id}" starts while "${line.id}" is still speaking`);
        } else {
          line.handle.stop(0.25); // only its trailing room tone is left
          playing.delete(line);
        }
      }

      const offset = clip.onset - clip.lead;
      const handle = audio.playBuffer(clip.buffer, { bus: 'narration', volume: clip.gain, offset, fadeIn: 0.02 });
      if (!handle) return;
      const voiceEnd = now + clip.lead + (clip.end - clip.onset);
      const line = { id, handle, voiceEnd };
      playing.add(line);
      setTimeout(() => playing.delete(line), (clip.buffer.duration - offset) * 1000 + 100);
      audio.duck(DUCK[clip.mood], { until: voiceEnd });
    },

    /** Fade out whatever is being spoken. */
    stop(fade = 0.5) {
      if (!playing.size) return;
      playing.forEach((line) => line.handle.stop(fade));
      playing.clear();
      audio.unduck(fade + 0.4);
    },

    /** Turn narration off (and quiet anything mid-line) or back on. */
    setEnabled(on) {
      enabled = on;
      if (!on) this.stop(0.8);
    },
  };
}

export const narration = createNarration();
