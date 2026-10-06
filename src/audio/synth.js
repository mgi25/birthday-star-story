/**
 * Procedural placeholder sounds, built from Web Audio nodes so the audio
 * pipeline can be heard before any recordings exist. Each function takes
 * (context, outputNode, options) and returns { stop() }.
 * Replace any of them by setting a file path in src/config.js.
 */

const noiseCache = new WeakMap();

/** A few seconds of brown noise whose loop point is crossfaded (no click). */
function brownNoise(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const seconds = 6;
  const fadeLen = Math.floor(ctx.sampleRate * 0.5);
  const length = Math.floor(ctx.sampleRate * seconds) + fadeLen;
  const raw = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    raw[i] = last * 3.5;
  }
  const loopLen = length - fadeLen;
  const buffer = ctx.createBuffer(1, loopLen, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < loopLen; i++) {
    if (i < fadeLen) {
      const k = i / fadeLen;
      data[i] = raw[i] * k + raw[loopLen + i] * (1 - k);
    } else {
      data[i] = raw[i];
    }
  }
  noiseCache.set(ctx, buffer);
  return buffer;
}

const stopAll = (nodes) => {
  for (const node of nodes) {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  }
};

/** Disconnect a list of nodes after `seconds`. */
const releaseLater = (nodes, seconds) => setTimeout(() => nodes.forEach((n) => n.disconnect()), seconds * 1000);

/** Night wind: low-passed brown noise with slow gusts. Variants via options. */
export function wind(ctx, out, { cutoff = 420, gust = 170, swell = 0.22, level = 0.6, rate = 1 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = brownNoise(ctx);
  src.loop = true;
  src.playbackRate.value = rate;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  filter.Q.value = 0.6;

  const amp = ctx.createGain();
  amp.gain.value = level;

  const gustLfo = ctx.createOscillator();
  gustLfo.frequency.value = 0.07;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = gust;
  gustLfo.connect(gustDepth).connect(filter.frequency);

  const swellLfo = ctx.createOscillator();
  swellLfo.frequency.value = 0.11;
  const swellDepth = ctx.createGain();
  swellDepth.gain.value = swell;
  swellLfo.connect(swellDepth).connect(amp.gain);

  src.connect(filter).connect(amp).connect(out);
  src.start(0, Math.random() * 5);
  gustLfo.start();
  swellLfo.start();

  return {
    stop() {
      stopAll([src, gustLfo, swellLfo]);
    },
  };
}

/** Forest: a soft wind bed plus leafy rustle that swells and settles. */
export function leaves(ctx, out) {
  const bed = wind(ctx, out, { cutoff: 300, gust: 90, swell: 0.12, level: 0.35 });

  const src = ctx.createBufferSource();
  src.buffer = brownNoise(ctx);
  src.loop = true;
  src.playbackRate.value = 3.2;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1700;
  band.Q.value = 0.55;
  const amp = ctx.createGain();
  amp.gain.value = 0.05;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.19;
  const depth = ctx.createGain();
  depth.gain.value = 0.04;
  lfo.connect(depth).connect(amp.gain);
  src.connect(band).connect(amp).connect(out);
  src.start(0, Math.random() * 5);
  lfo.start();

  return {
    stop() {
      bed.stop();
      stopAll([src, lfo]);
    },
  };
}

/** A small glassy bell with a short echo. */
export function chime(ctx, out, { freq = 1318.5, when = 0, level = 1 } = {}) {
  const t = ctx.currentTime + 0.01 + when;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(level, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0005, t + 2.6);

  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.23;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.32;

  env.connect(out);
  env.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(out);

  const partials = [
    [1, 0.5],
    [2.01, 0.16],
    [3.02, 0.06],
    [4.17, 0.025],
  ];
  const oscillators = partials.map(([ratio, gain]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g).connect(env);
    osc.start(t);
    osc.stop(t + 2.8);
    return osc;
  });

  const timer = releaseLater([env, delay, feedback, wet], when + 4.5);

  return {
    stop() {
      clearTimeout(timer);
      stopAll(oscillators);
    },
  };
}

/** Two soft bells, a fifth apart: the sound of a star noticing you. */
export function twinkle(ctx, out) {
  const a = chime(ctx, out, { freq: 1318.5 });
  const b = chime(ctx, out, { freq: 1975.5, when: 0.14, level: 0.7 });
  return {
    stop() {
      a.stop();
      b.stop();
    },
  };
}

/** A rising little run of bells for the constellation. */
export function arpeggio(ctx, out) {
  const notes = [1046.5, 1318.5, 1568, 1975.5];
  const voices = notes.map((freq, i) => chime(ctx, out, { freq, when: i * 0.32, level: 0.55 - i * 0.07 }));
  return {
    stop() {
      voices.forEach((v) => v.stop());
    },
  };
}

/** The star going out: a soft falling "plink". */
export function blink(ctx, out) {
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1760, t);
  osc.frequency.exponentialRampToValueAtTime(620, t + 0.38);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.5, t + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0008, t + 0.6);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + 0.7);
  const timer = releaseLater([env], 1);
  return {
    stop() {
      clearTimeout(timer);
      stopAll([osc]);
    },
  };
}

/** Short filtered noise grains: the building block for small physical sounds. */
function grains(ctx, out, { times, freq, q = 1, type = 'bandpass', length = 0.08, rate = 2.5, level = 1 }) {
  const nodes = [];
  const now = ctx.currentTime + 0.01;
  for (const [i, offset] of times.entries()) {
    const src = ctx.createBufferSource();
    src.buffer = brownNoise(ctx);
    src.playbackRate.value = rate;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = Array.isArray(freq) ? freq[i % freq.length] : freq;
    filter.Q.value = q;
    const env = ctx.createGain();
    const t = now + offset;
    const len = Array.isArray(length) ? length[i % length.length] : length;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(level, t + Math.min(0.012, len / 4));
    env.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(filter).connect(env).connect(out);
    src.start(t, Math.random() * 4);
    src.stop(t + len + 0.05);
    nodes.push(src);
  }
  return {
    stop() {
      stopAll(nodes);
    },
  };
}

/** A muffled footstep: a short band-passed noise burst. */
export function step(ctx, out, { rate = 1, tone = 1 } = {}) {
  return grains(ctx, out, { times: [0], freq: 650 * rate * tone, q: 0.9, length: 0.16 });
}

/** Feet sliding on gravel, then a couple of pebbles. */
export function scrape(ctx, out) {
  return grains(ctx, out, {
    times: [0, 0.05, 0.28, 0.43],
    freq: [900, 1200, 3200, 2600],
    q: 0.8,
    length: [0.32, 0.25, 0.05, 0.04],
    level: 0.9,
  });
}

/** Backpack / clothing rustle. */
export function rustle(ctx, out) {
  return grains(ctx, out, { times: [0, 0.13, 0.24, 0.41], freq: [2400, 1900, 2700, 2100], q: 1.4, length: 0.09, rate: 3, level: 0.7 });
}

/** Paper being unfolded. */
export function paper(ctx, out) {
  const times = [0, 0.09, 0.15, 0.31, 0.38, 0.52, 0.66];
  return grains(ctx, out, { times, freq: [3800, 5200, 4400], type: 'highpass', q: 0.7, length: [0.05, 0.03, 0.06], rate: 4, level: 0.6 });
}

/**
 * Music placeholder: a slow, very soft pad (four gentle chords) with an
 * occasional high note. Just enough to feel the film's emotional shape.
 */
export function pad(ctx, out) {
  const CHORDS = [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [110.0, 164.81, 196.0, 261.63], // Am7
    [130.81, 196.0, 246.94, 329.63], // Cmaj7
    [98.0, 146.83, 220.0, 246.94], // G6/9-ish
  ];
  const MELODY = [523.25, 659.25, 587.33, 493.88];
  const LEN = 7.5;

  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 1150;
  lowpass.Q.value = 0.3;
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const wet = ctx.createGain();
  wet.gain.value = 0.25;
  bus.connect(lowpass).connect(out);
  lowpass.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(out);

  const voices = new Set();
  const voice = (freq, type, detune, gain, t, attack, length, release) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.setValueAtTime(gain, t + length);
    env.gain.linearRampToValueAtTime(0, t + length + release);
    osc.connect(env).connect(bus);
    osc.start(t);
    osc.stop(t + length + release + 0.1);
    voices.add(osc);
    osc.onended = () => {
      voices.delete(osc);
      env.disconnect();
    };
  };

  let index = 0;
  let next = ctx.currentTime + 0.1;
  let stopped = false;
  const schedule = () => {
    if (stopped) return;
    while (next < ctx.currentTime + 1.5) {
      for (const f of CHORDS[index % CHORDS.length]) {
        voice(f, 'sine', -5, 0.05, next, 2.8, LEN - 0.4, 2.8);
        voice(f, 'triangle', 6, 0.018, next, 3.2, LEN - 0.4, 2.8);
      }
      if (index % 2 === 1) voice(MELODY[(index >> 1) % MELODY.length], 'sine', 0, 0.022, next + 2.4, 0.06, 0.4, 3.2);
      next += LEN;
      index++;
    }
  };
  schedule();
  const timer = setInterval(schedule, 500);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      stopAll([...voices]);
      releaseLater([bus, lowpass, delay, feedback, wet], 0.3);
    },
  };
}
