"use client";

/**
 * VELORA sound engine (Web Audio). One instance for the whole site so sound carries across pages.
 * - Off by default; the visitor turns it on (browsers require a gesture anyway). The choice is remembered.
 * - Beds: looping ambience/music with seamless crossfaded loops. One "bed" plus any number of named "layers".
 * - Sfx: one-shot files, decoded once and cached.
 * - Synth: chimes, ticks, risers generated in the browser (no files).
 * - Voices: each world colours everything it plays. Wonderverse is warm and airy (soft top end, a
 *   gentle hall reverb, sounds a touch slower); Thrillverse is close and punchy (compressed, brighter,
 *   a touch faster). The entrance is neutral.
 * - Stops its loops when the tab is hidden and restarts them when it is visible again (if enabled).
 */
export const SOUND_FILES = {
  "cinematic-bed": "/media/audio/cinematic-bed.m4a",
  "fair-evening": "/media/audio/fair-evening.m4a",
  "whoosh-wipe": "/media/audio/whoosh-wipe.m4a",
  "whoosh-deep": "/media/audio/whoosh-deep.m4a",
  fireworks: "/media/audio/fireworks.m4a",
  "rush-bed": "/media/audio/rush-bed.m4a",
  "chain-lift": "/media/audio/chain-lift.m4a",
  "coaster-run": "/media/audio/coaster-run.m4a",
  "ride-scream": "/media/audio/ride-scream.m4a",
  riser: "/media/audio/riser.m4a",
  "whoosh-fast": "/media/audio/whoosh-fast.m4a",
  "night-crickets": "/media/audio/night-crickets.m4a",
  "chime-crystal": "/media/audio/chime-crystal.m4a",
  "portal-carousel": "/media/audio/portal-carousel.m4a",
  // Background music (Pixabay Content License). Loudness-matched, played very quietly.
  "music-gate": "/media/audio/music-gate.m4a",
  "music-wonder": "/media/audio/music-wonder.m4a",
  "music-thrill": "/media/audio/music-thrill.m4a",
} as const;
export type SoundName = keyof typeof SOUND_FILES;

const PREF_KEY = "velora:sound";
/** Background music sits at this share of the site's own audio level (10%; the visitor's device volume is untouched). */
export const MUSIC_LEVEL = 0.1;
const XFADE = 2.5; // seconds of overlap when a bed loops
type Loop = { name: SoundName; gain: GainNode; timer: number | null; sources: AudioBufferSourceNode[]; volume: number };
export type Voice = "neutral" | "wonder" | "thrill";
/** Per-voice playback rate for one-shots: Wonderverse a shade slower and rounder, Thrillverse snappier. */
const VOICE_RATE: Record<Voice, number> = { neutral: 1, wonder: 0.94, thrill: 1.06 };

/** A soft stereo hall: decaying noise, generated once (no file). */
function hallImpulse(ctx: AudioContext, seconds = 2.4) {
  const len = Math.round(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundName, Promise<AudioBuffer>>();
  private loops = new Map<string, Loop>(); // "bed" or layer key
  private wanted = new Map<string, { name: SoundName; volume: number }>();
  /** The newest start request per loop key; an older request that finishes loading later gives up. */
  private pending = new Map<string, symbol>();
  private listeners = new Set<() => void>();
  private voice: Voice = "neutral";
  private buses: Partial<Record<Voice, GainNode>> = {};
  enabled = false;
  /** True once audio has been started by a gesture on this page load (a remembered "on" is not enough). */
  unlocked = false;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.enabled = window.localStorage.getItem(PREF_KEY) === "on";
    } catch {
      /* storage blocked: stays off */
    }
    // Hidden tab: stop the loops (their schedule runs on timers that would pile up while the audio
    // clock is frozen), then suspend. Visible again: start fresh from what the page wants.
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.loops.forEach((_, k) => this.stopLoop(k, 0.15));
        const ctx = this.ctx;
        window.setTimeout(() => document.hidden && ctx.suspend(), 400);
      } else if (this.enabled) this.start();
    });
    // A remembered "on" still needs a gesture before audio may start.
    const unlock = (e: Event) => {
      // A tap on the sound switch itself is handled by its own click (it unlocks instead of toggling off),
      // otherwise the unlock here and the toggle there cancelled each other: it showed "on" but stayed silent.
      if ((e.target as Element | null)?.closest?.(".velora-sound")) return;
      if (this.enabled) this.start();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  private emit() {
    this.listeners.forEach((l) => l());
  }

  /** Starts audio from a gesture when "on" was remembered from an earlier visit. */
  unlock() {
    if (this.enabled) this.start();
  }

  private start() {
    if (!this.unlocked) {
      this.unlocked = true;
      this.emit();
    }
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.buildVoices(this.ctx, this.master);
    }
    this.ctx.resume();
    this.master!.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master!.gain.setTargetAtTime(1, this.ctx.currentTime, 0.4);
    // Start whatever the current page asked for.
    this.wanted.forEach((w, key) => this.startLoop(key, w.name, w.volume));
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    try {
      window.localStorage.setItem(PREF_KEY, on ? "on" : "off");
    } catch {
      /* not persisted */
    }
    if (on) this.start();
    else if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      const ctx = this.ctx;
      window.setTimeout(() => {
        if (!this.enabled) {
          this.loops.forEach((_, k) => this.stopLoop(k, 0));
          ctx.suspend();
        }
      }, 1200);
    }
    this.emit();
  }

  /** Three parallel buses after the master; setVoice crossfades between them. */
  private buildVoices(ctx: AudioContext, master: GainNode) {
    // Everything passes one gentle limiter so music, ride sounds and chimes never spike over each other.
    const out = ctx.createDynamicsCompressor();
    out.threshold.value = -12;
    out.knee.value = 10;
    out.ratio.value = 6;
    out.attack.value = 0.005;
    out.release.value = 0.3;
    out.connect(ctx.destination);
    const bus = (v: Voice) => {
      const g = ctx.createGain();
      g.gain.value = v === this.voice ? 1 : 0;
      master.connect(g);
      this.buses[v] = g;
      return g;
    };
    // neutral: straight through
    bus("neutral").connect(out);
    // wonder: rounded top end, a little warmth low down, and a soft hall
    const w = bus("wonder");
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 7200;
    warm.Q.value = 0.5;
    const body = ctx.createBiquadFilter();
    body.type = "lowshelf";
    body.frequency.value = 220;
    body.gain.value = 2;
    w.connect(warm).connect(body).connect(out);
    const hall = ctx.createConvolver();
    hall.buffer = hallImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.2;
    body.connect(hall).connect(wet).connect(out);
    // thrill: brighter, tighter, compressed
    const t = bus("thrill");
    const bite = ctx.createBiquadFilter();
    bite.type = "highshelf";
    bite.frequency.value = 3500;
    bite.gain.value = 3;
    const punch = ctx.createBiquadFilter();
    punch.type = "peaking";
    punch.frequency.value = 90;
    punch.Q.value = 0.9;
    punch.gain.value = 3;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 6;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const makeup = ctx.createGain();
    makeup.gain.value = 1.25;
    t.connect(bite).connect(punch).connect(comp).connect(makeup).connect(out);
  }

  /** Which world is playing: colours beds, effects and interface sounds alike. */
  setVoice(v: Voice) {
    // Music only: every page uses the same neutral path (no per-world filtering), so all tracks stay level-matched.
    if (v !== "neutral" || v === this.voice) return;
    this.voice = v;
    const ctx = this.ctx;
    if (!ctx) return;
    (Object.keys(this.buses) as Voice[]).forEach((k) => this.buses[k]!.gain.setTargetAtTime(k === v ? 1 : 0, ctx.currentTime, 0.35));
  }

  /** A short sound that says which world you just walked into (only when sound is on). */
  signature(v: Voice) {
    if (true as boolean) return; // sound effects removed: the site plays only its three music tracks
    if (!this.enabled || !this.ctx) return;
    if (v === "wonder") {
      // a music-box arpeggio rising into the hall
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => window.setTimeout(() => this.chime(f, { volume: 0.07, decay: 2.4 }), i * 110));
    } else if (v === "thrill") {
      this.sfx("whoosh-fast", { volume: 0.32 });
      this.tick({ volume: 0.14, freq: 2400 });
    }
  }

  /** The interface's own click, in each world's voice: a bell note in Wonderverse, a hard tick in Thrillverse. */
  ui(step = 0) {
    if (true as boolean) return; // sound effects removed
    if (this.voice === "wonder") this.chime([784, 880, 1046.5, 1174.7, 1318.5][((step % 5) + 5) % 5], { volume: 0.06, decay: 1.1 });
    else this.tick({ volume: 0.12, freq: this.voice === "thrill" ? 2200 : 1800 });
  }

  private load(name: SoundName): Promise<AudioBuffer> {
    let p = this.buffers.get(name);
    if (!p) {
      p = fetch(SOUND_FILES[name])
        .then((r) => r.arrayBuffer())
        .then((b) => this.ctx!.decodeAudioData(b));
      this.buffers.set(name, p);
    }
    return p;
  }

  /** Preload files so the first play is instant (no-op until sound is on). */
  preload(names: SoundName[]) {
    void names; // effects removed: nothing to preload
  }

  /** The page's background bed. null fades it out. */
  bed(name: SoundName | null, volume = 0.5) {
    this.layer("bed", name, volume);
  }

  /** Named extra ambience (e.g. "night" → crickets). null fades it out. */
  layer(key: string, name: SoundName | null, volume = 0.4) {
    // Only the background music ("bed") plays; ambience layers are removed.
    if (key !== "bed") return;
    if (!name) {
      this.wanted.delete(key);
      this.stopLoop(key, 1.5);
      return;
    }
    const cur = this.wanted.get(key);
    this.wanted.set(key, { name, volume });
    if (!this.enabled || !this.ctx) return;
    const playing = this.loops.get(key);
    if (playing && playing.name === name) {
      playing.volume = volume;
      playing.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.6);
      return;
    }
    if (cur || playing) this.stopLoop(key, 1.5);
    this.startLoop(key, name, volume);
  }

  private async startLoop(key: string, name: SoundName, volume: number) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (this.loops.get(key)?.name === name) return;
    const token = Symbol(key);
    this.pending.set(key, token);
    const buf = await this.load(name).catch(() => null);
    // Only the newest request may start, and never twice: a doubled loop could not be stopped later.
    if (this.pending.get(key) !== token) return;
    this.pending.delete(key);
    if (!buf || this.wanted.get(key)?.name !== name || !this.enabled) return;
    if (this.loops.get(key)?.name === name) return;
    if (this.loops.has(key)) this.stopLoop(key, 1.2);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master);
    gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.8);
    const loop: Loop = { name, gain, timer: null, sources: [], volume };
    this.loops.set(key, loop);
    // Seamless loop: each pass starts XFADE seconds before the previous one ends, both ramped.
    const schedule = (when: number) => {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      src.buffer = buf;
      src.connect(g).connect(gain);
      const dur = buf.duration;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(1, when + XFADE);
      g.gain.setValueAtTime(1, when + dur - XFADE);
      g.gain.linearRampToValueAtTime(0, when + dur);
      src.start(when);
      src.stop(when + dur + 0.05);
      loop.sources.push(src);
      src.onended = () => (loop.sources = loop.sources.filter((s) => s !== src));
      const next = when + dur - XFADE;
      loop.timer = window.setTimeout(() => {
        if (this.loops.get(key) === loop) schedule(next);
      }, Math.max(0, (next - ctx.currentTime - 1) * 1000));
    };
    schedule(ctx.currentTime + 0.05);
  }

  private stopLoop(key: string, fade: number) {
    this.pending.delete(key);
    const loop = this.loops.get(key);
    if (!loop || !this.ctx) return;
    this.loops.delete(key);
    if (loop.timer) window.clearTimeout(loop.timer);
    loop.gain.gain.setTargetAtTime(0, this.ctx.currentTime, Math.max(0.01, fade / 3));
    const t = this.ctx.currentTime + fade + 0.2;
    loop.sources.forEach((s) => {
      try {
        s.stop(t);
      } catch {
        /* already stopped */
      }
    });
  }

  /** One-shot file. */
  async sfx(name: SoundName, { volume = 0.7, rate = 1 }: { volume?: number; rate?: number } = {}) {
    if (true as boolean) return; // sound effects removed
    if (!this.enabled || !this.ctx || !this.master) return;
    const buf = await this.load(name).catch(() => null);
    if (!buf || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate * VOICE_RATE[this.voice];
    g.gain.value = volume;
    src.connect(g).connect(this.master);
    src.start();
  }

  /** Soft bell/chime: a few detuned sine partials with a long decay. */
  chime(freq = 880, { volume = 0.18, decay = 2.2 }: { volume?: number; decay?: number } = {}) {
    if (true as boolean) return; // sound effects removed
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    [1, 2.01, 3.98].forEach((m, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = "sine";
      o.frequency.value = freq * m;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume / (i + 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay / (i + 1));
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + decay);
    });
  }

  /** Short UI click/tick. */
  tick({ volume = 0.12, freq = 1800 }: { volume?: number; freq?: number } = {}) {
    if (true as boolean) return; // sound effects removed
    if (!this.enabled || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq / 2, t + 0.05);
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.08);
  }

  /** Rising noise+tone sweep, e.g. while a hold-to-launch button charges. Returns a stop function. */
  riser(seconds = 0.8, { volume = 0.15 }: { volume?: number } = {}): () => void {
    if (true as boolean) return () => {}; // sound effects removed
    if (!this.enabled || !this.ctx || !this.master) return () => {};
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(880, t + seconds);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(4000, t + seconds);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + seconds);
    o.connect(f).connect(g).connect(this.master);
    o.start(t);
    const stop = () => {
      const n = ctx.currentTime;
      g.gain.cancelScheduledValues(n);
      g.gain.setTargetAtTime(0, n, 0.05);
      o.stop(n + 0.3);
    };
    window.setTimeout(stop, seconds * 1000 + 50);
    return stop;
  }
}

let engine: SoundEngine | null = null;
export function getSoundEngine(): SoundEngine {
  if (!engine) engine = new SoundEngine();
  return engine;
}
