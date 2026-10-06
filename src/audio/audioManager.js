import { CUES, BUS_LEVELS } from './cues.js';
import * as synth from './synth.js';

const BUSES = ['music', 'ambience', 'sfx'];

/**
 * Web Audio playback with three buses (music, ambience, sfx) into a master.
 *
 * Mobile browsers only allow sound after a user gesture, so nothing is
 * created until unlock() is called from inside a click handler (the Begin
 * button). Before that, play() is a silent no-op and setAmbience() just
 * remembers what should be playing, starting it the moment audio unlocks.
 */
class AudioManager {
  constructor(cues) {
    this.cues = cues;
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.buffers = new Map();
    this.loops = new Map();
    this.ambience = null;
    this.musicLevel = 0;
    this.ambienceLevel = 1;
    this.muted = false;
    this.listeners = new Set();

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  get unlocked() {
    return this.ctx !== null;
  }

  /** Call synchronously inside a user-gesture handler. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
      return true;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    try {
      // iOS 17+: behave like media playback (not silenced like a ringtone).
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {
      /* not supported */
    }

    const ctx = new Ctx({ latencyHint: 'playback' });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    for (const name of BUSES) {
      const bus = ctx.createGain();
      bus.gain.value = this.busTarget(name);
      bus.connect(this.master);
      this.buses[name] = bus;
    }

    // Older iOS needs a sound started inside the gesture to fully unlock.
    const blip = ctx.createBufferSource();
    blip.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    blip.connect(ctx.destination);
    blip.start(0);
    ctx.resume().catch(() => {});

    this.preload();
    if (this.ambience) this.play(this.ambience, { fadeIn: 3 });
    if (this.musicLevel > 0) this.play('music.theme', { fadeIn: 4 });
    this.emit();
    return true;
  }

  /** Fetch and decode every cue that has a file. */
  preload(ids = Object.keys(this.cues)) {
    if (!this.ctx) return;
    ids.forEach((id) => this.loadBuffer(id));
  }

  loadBuffer(id) {
    const cue = this.cues[id];
    if (!cue?.src || !this.ctx) return Promise.resolve(null);
    if (!this.buffers.has(id)) {
      const url = new URL(cue.src, document.baseURI).href;
      const request = fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${url}`);
          return res.arrayBuffer();
        })
        .then((data) => this.ctx.decodeAudioData(data))
        .catch((err) => {
          if (import.meta.env.DEV) console.warn(`[audio] could not load "${id}":`, err.message);
          return null;
        });
      this.buffers.set(id, request);
    }
    return this.buffers.get(id);
  }

  /**
   * Play a cue. Returns a handle with stop(fadeSeconds), or null when audio
   * is locked or the cue has nothing to play. Looping cues replace any
   * running instance of themselves.
   */
  play(id, { volume, fadeIn = 0, rate = 1 } = {}) {
    const cue = this.cues[id];
    if (!this.ctx || !cue) return null;
    if (!cue.src && !cue.synth) return null;

    const ctx = this.ctx;
    const out = ctx.createGain();
    out.connect(this.buses[cue.bus] ?? this.master);
    const level = volume ?? cue.volume ?? 1;
    const now = ctx.currentTime;
    if (fadeIn > 0) {
      out.gain.setValueAtTime(0, now);
      out.gain.linearRampToValueAtTime(level, now + fadeIn);
    } else {
      out.gain.value = level;
    }

    let voice = null;
    let stopped = false;
    const handle = {
      stop: (fade = 0.8) => {
        if (stopped) return;
        stopped = true;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + fade);
        setTimeout(() => {
          voice?.stop();
          out.disconnect();
        }, fade * 1000 + 80);
      },
    };

    if (cue.loop) {
      this.loops.get(id)?.stop(0.4);
      this.loops.set(id, handle);
    }

    const startSynth = () => {
      if (stopped || !cue.synth) return;
      voice = synth[cue.synth](ctx, out, { ...cue.opts, rate });
    };

    if (cue.src) {
      this.loadBuffer(id).then((buffer) => {
        if (stopped) return;
        if (!buffer) return startSynth();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = Boolean(cue.loop);
        source.playbackRate.value = rate;
        source.connect(out);
        source.start();
        if (!cue.loop) source.onended = () => out.disconnect();
        voice = { stop: () => source.stop() };
      });
    } else {
      startSynth();
    }
    return handle;
  }

  stop(id, { fade = 1 } = {}) {
    const handle = this.loops.get(id);
    if (!handle) return;
    handle.stop(fade);
    this.loops.delete(id);
  }

  /** Crossfade the looping bed to a new cue (or silence with null). */
  setAmbience(id, { fade = 2.5 } = {}) {
    if (id === this.ambience) return;
    const previous = this.ambience;
    this.ambience = id;
    if (!this.ctx) return;
    if (previous) this.stop(previous, { fade });
    if (id) this.play(id, { fadeIn: fade });
  }

  /** Gain a bus should sit at, given the current scene levels. */
  busTarget(name) {
    const base = BUS_LEVELS[name] ?? 1;
    if (name === 'music') return base * this.musicLevel;
    if (name === 'ambience') return base * this.ambienceLevel;
    return base;
  }

  rampBus(name, seconds) {
    const node = this.buses[name];
    if (!node) return;
    const t = this.ctx.currentTime;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(node.gain.value, t);
    node.gain.linearRampToValueAtTime(this.busTarget(name), t + seconds);
  }

  /**
   * Music intensity, 0 (off) … 1. Starts the music loop when needed and
   * stops it once faded to silence. Remembered until audio unlocks.
   */
  setMusic(level, { fade = 3 } = {}) {
    this.musicLevel = Math.max(0, level);
    if (!this.ctx) return;
    this.rampBus('music', fade);
    clearTimeout(this.musicStopTimer);
    if (this.musicLevel > 0) {
      if (!this.loops.has('music.theme')) this.play('music.theme', { fadeIn: fade });
    } else {
      this.musicStopTimer = setTimeout(() => {
        if (this.musicLevel === 0) this.stop('music.theme', { fade: 0.2 });
      }, fade * 1000 + 100);
    }
  }

  /** Overall ambience level, 0 … 1 (e.g. almost silent for the letter). */
  setAmbienceLevel(level, { fade = 2 } = {}) {
    this.ambienceLevel = Math.max(0, level);
    if (this.ctx) this.rampBus('ambience', fade);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.4);
    }
    this.emit();
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.listeners.forEach((fn) => fn(this));
  }
}

export const audio = new AudioManager(CUES);
