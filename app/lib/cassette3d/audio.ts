/**
 * Sound for the tape machine (Stage 6), on the Web Audio API.
 *
 * The machine calls `play(cue)` at the moment something happens (the lid
 * unlatches, the cassette comes off the spindles, a crease opens). The sounds
 * are synthesised here, sample by sample (kept as the real ones at the Stage 6
 * checkpoint). A sound can still be swapped for a recording: list its name in
 * SOUND_OVERRIDES and put the MP3 in public/3d/sounds/.
 *
 * Browsers only allow audio after a user gesture: the context is created (or
 * resumed) on the first pointer or key press, and cues before that are dropped.
 * Muted, nothing is created at all.
 */

export const SOUND_CUES = [
  'shelfOut', // case slides out of its row
  'shelfIn', // ...and back in
  'caseOpen', // lid unlatches
  'caseClose', // lid snaps shut
  'cassetteOut', // cassette comes off the spindles
  'cassetteIn', // ...and clicks back on
  'cassetteDown', // cassette put down on the table
  'paperSlide', // J-card slides out of / into the lid
  'crease', // one crease of the J-card opens or closes
  'flip', // unfolded J-card turned over
] as const;

export type SoundCue = (typeof SOUND_CUES)[number];

/**
 * The sound each cue plays and its level. Several cues share a sound; `rate`
 * shifts its pitch a little.
 */
export const SOUND_FILES: Record<SoundCue, { file: string; gain: number; rate?: number }> = {
  shelfOut: { file: 'case-slide', gain: 0.5 },
  shelfIn: { file: 'case-slide', gain: 0.45, rate: 0.92 },
  caseOpen: { file: 'case-open', gain: 0.8 },
  caseClose: { file: 'case-close', gain: 0.9 },
  cassetteOut: { file: 'cassette-clack', gain: 0.7 },
  cassetteIn: { file: 'cassette-clack', gain: 0.75, rate: 0.94 },
  cassetteDown: { file: 'cassette-down', gain: 0.6 },
  paperSlide: { file: 'paper-slide', gain: 0.4 },
  crease: { file: 'paper-unfold', gain: 0.35 },
  flip: { file: 'paper-flip', gain: 0.4 },
};

export const SOUND_BASE_URL = '/3d/sounds/';
/**
 * Sounds played from a recording (public/3d/sounds/<name>.mp3) instead of being
 * synthesised. Empty: every sound is synthesised, and no files are fetched.
 */
export const SOUND_OVERRIDES: ReadonlySet<string> = new Set<string>([]);

export interface TapeSounds {
  play: (cue: SoundCue) => void;
  setMuted: (muted: boolean) => void;
  isMuted: () => boolean;
  /** Cues played so far (debug / tests), newest last, with where the sound came from. */
  log: () => { cue: SoundCue; source: 'file' | 'synth' | 'silent'; at: number }[];
  dispose: () => void;
}

/** Two cues of the same kind closer together than this play once (spamming the buttons). */
const MIN_INTERVAL_MS = 45;
const MAX_VOICES = 8;
const LOG_LENGTH = 50;

export function createTapeSounds(options: { muted: boolean }): TapeSounds {
  let muted = options.muted;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let disposed = false;
  const buffers = new Map<string, Promise<{ buffer: AudioBuffer; source: 'file' | 'synth' } | null>>();
  const lastPlayed = new Map<SoundCue, number>();
  const voices = new Set<AudioBufferSourceNode>();
  const history: { cue: SoundCue; source: 'file' | 'synth' | 'silent'; at: number }[] = [];

  const record = (cue: SoundCue, source: 'file' | 'synth' | 'silent') => {
    history.push({ cue, source, at: performance.now() });
    if (history.length > LOG_LENGTH) history.shift();
  };

  function unlock() {
    if (muted || disposed) return;
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  }
  const gestureEvents = ['pointerdown', 'keydown', 'touchend'] as const;
  for (const type of gestureEvents) window.addEventListener(type, unlock, { capture: true, passive: true });

  function load(file: string): Promise<{ buffer: AudioBuffer; source: 'file' | 'synth' } | null> {
    let entry = buffers.get(file);
    if (!entry) {
      const c = ctx!;
      const synth = () => {
        const buffer = synthesize(c, file);
        return buffer ? { buffer, source: 'synth' as const } : null;
      };
      entry = SOUND_OVERRIDES.has(file)
        ? fetch(`${SOUND_BASE_URL}${file}.mp3`)
          .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
          .then((data) => c.decodeAudioData(data))
          .then((buffer) => ({ buffer, source: 'file' as const }))
          // A recording that won't load falls back to the synthesised sound.
          .catch(synth)
        : Promise.resolve(synth());
      buffers.set(file, entry);
    }
    return entry;
  }

  return {
    play(cue) {
      const now = performance.now();
      // A context that's still resuming from the gesture that created it plays once it's up.
      if (muted || disposed || !ctx || !master || ctx.state === 'closed') {
        record(cue, 'silent');
        return;
      }
      if (now - (lastPlayed.get(cue) ?? -Infinity) < MIN_INTERVAL_MS) return;
      lastPlayed.set(cue, now);
      const spec = SOUND_FILES[cue];
      const c = ctx;
      const out = master;
      void load(spec.file).then((loaded) => {
        if (!loaded || muted || disposed || voices.size >= MAX_VOICES) return;
        record(cue, loaded.source);
        const src = c.createBufferSource();
        src.buffer = loaded.buffer;
        // A touch of variation, so repeated cues (creases) don't sound machine-made.
        src.playbackRate.value = (spec.rate ?? 1) * (0.96 + Math.random() * 0.08);
        const gain = c.createGain();
        gain.gain.value = spec.gain;
        src.connect(gain).connect(out);
        voices.add(src);
        src.onended = () => {
          voices.delete(src);
          gain.disconnect();
        };
        src.start();
      });
    },
    setMuted(next) {
      muted = next;
      if (muted) {
        for (const v of voices) v.stop();
        voices.clear();
        if (ctx?.state === 'running') void ctx.suspend();
      } else {
        // Unmuting is itself a click, so the context may start right away.
        unlock();
      }
    },
    isMuted: () => muted,
    log: () => [...history],
    dispose() {
      disposed = true;
      for (const type of gestureEvents) window.removeEventListener(type, unlock, { capture: true });
      for (const v of voices) v.stop();
      voices.clear();
      buffers.clear();
      void ctx?.close();
      ctx = null;
      master = null;
    },
  };
}

// --- Synthesised sounds -------------------------------------------------------------------

/**
 * The sounds, built sample by sample: plastic clicks and knocks are short
 * resonant decays plus a noise transient, paper is a short, higher tick.
 */
function synthesize(ctx: AudioContext, file: string): AudioBuffer | null {
  const rate = ctx.sampleRate;
  const make = (seconds: number, fill: (data: Float32Array, rand: () => number) => void) => {
    const buffer = ctx.createBuffer(1, Math.ceil(seconds * rate), rate);
    const data = buffer.getChannelData(0);
    let seed = hashString(file);
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    fill(data, rand);
    normalize(data, 0.9);
    return buffer;
  };

  /** A click: a noise burst through a resonator, decaying in `decay` seconds. */
  const click = (data: Float32Array, rand: () => number, at: number, freq: number, decay: number, level: number) => {
    const start = Math.floor(at * rate);
    const w = (2 * Math.PI * freq) / rate;
    const r = Math.exp(-1 / (decay * rate * 0.25));
    let y1 = 0;
    let y2 = 0;
    const n = Math.min(data.length - start, Math.floor(decay * rate * 2));
    for (let i = 0; i < n; i++) {
      const excite = i < rate * 0.0015 ? (rand() * 2 - 1) : 0;
      const y = excite + 2 * r * Math.cos(w) * y1 - r * r * y2;
      y2 = y1;
      y1 = y;
      const noise = (rand() * 2 - 1) * Math.exp(-i / (rate * 0.002));
      data[start + i] = data[start + i]! + level * (y * 0.08 + noise * 0.5);
    }
  };

  switch (file) {
    case 'case-open':
      return make(0.12, (d, r) => {
        click(d, r, 0, 3200, 0.012, 1);
        click(d, r, 0.035, 2100, 0.02, 0.6);
      });
    case 'case-close':
      return make(0.14, (d, r) => {
        click(d, r, 0, 1600, 0.03, 1);
        click(d, r, 0.012, 3600, 0.012, 0.7);
      });
    case 'cassette-clack':
      return make(0.12, (d, r) => {
        click(d, r, 0, 950, 0.035, 1);
        click(d, r, 0.018, 2400, 0.015, 0.5);
      });
    case 'cassette-down':
      return make(0.16, (d, r) => {
        click(d, r, 0, 620, 0.05, 1);
        click(d, r, 0.03, 1300, 0.02, 0.35);
      });
    // Short taps and ticks rather than swooshes (Stage 6 checkpoint): the noise-based
    // slides and unfolds sounded wrong next to the clicks.
    case 'case-slide':
      return make(0.12, (d, r) => {
        click(d, r, 0, 780, 0.03, 1);
        click(d, r, 0.01, 1900, 0.012, 0.4);
      });
    case 'paper-slide':
      return make(0.08, (d, r) => click(d, r, 0, 2600, 0.01, 1));
    case 'paper-unfold':
      return make(0.07, (d, r) => click(d, r, 0, 3400, 0.007, 1));
    case 'paper-flip':
      return make(0.1, (d, r) => {
        click(d, r, 0, 2900, 0.008, 1);
        click(d, r, 0.03, 3600, 0.006, 0.6);
      });
  }
  return null;
}

function normalize(data: Float32Array, peak: number) {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]!));
  if (max <= 0) return;
  const k = peak / max;
  for (let i = 0; i < data.length; i++) data[i] = data[i]! * k;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
