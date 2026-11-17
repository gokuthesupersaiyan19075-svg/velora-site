"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSoundEngine, type SoundName, type Voice } from "./engine";

/** Whether sound is on, plus the engine for sfx/synth calls. Safe to call during SSR (returns off). */
export function useSound() {
  const engine = typeof window === "undefined" ? null : getSoundEngine();
  const enabled = useSyncExternalStore(
    (cb) => (engine ? engine.subscribe(cb) : () => {}),
    () => engine?.enabled ?? false,
    () => false,
  );
  // "On" was remembered from an earlier visit but the browser has not had a tap yet, so nothing can play.
  const pending = useSyncExternalStore(
    (cb) => (engine ? engine.subscribe(cb) : () => {}),
    () => !!engine && engine.enabled && !engine.unlocked,
    () => false,
  );
  return {
    enabled,
    pending,
    setEnabled: (on: boolean) => engine?.setEnabled(on),
    toggle: () => {
      if (!engine) return;
      // "On" remembered from last visit but not yet started: the first tap starts the sound (it must not switch it off).
      if (engine.enabled && !engine.unlocked) engine.unlock();
      else engine.setEnabled(!engine.enabled);
    },
    sfx: (name: SoundName, opts?: { volume?: number; rate?: number }) => engine?.sfx(name, opts),
    chime: (freq?: number, opts?: { volume?: number; decay?: number }) => engine?.chime(freq, opts),
    tick: (opts?: { volume?: number; freq?: number }) => engine?.tick(opts),
    /** The world's own interface click (bell in Wonderverse, tick in Thrillverse). */
    ui: (step?: number) => engine?.ui(step),
    riser: (seconds?: number, opts?: { volume?: number }) => engine?.riser(seconds, opts) ?? (() => {}),
    layer: (key: string, name: SoundName | null, volume?: number) => engine?.layer(key, name, volume),
    preload: (names: SoundName[]) => engine?.preload(names),
  };
}

/** Declares the background bed for the page/experience while it is mounted. */
export function useSoundBed(name: SoundName | null, volume = 0.5) {
  useEffect(() => {
    const e = getSoundEngine();
    e.bed(name, volume);
    return () => e.bed(null);
  }, [name, volume]);
}

/**
 * A world's sound identity for as long as the visitor is inside it: its voice, its background bed
 * (continuous across that world's pages) and a short signature on arrival.
 */
export function useWorldSound(voice: Voice, bed: SoundName, volume: number) {
  useEffect(() => {
    const e = getSoundEngine();
    e.setVoice(voice);
    e.signature(voice);
    return () => e.setVoice("neutral");
  }, [voice]);
  useSoundBed(bed, volume);
}
