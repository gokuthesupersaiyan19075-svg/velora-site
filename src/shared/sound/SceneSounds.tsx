"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getSoundEngine, type SoundName } from "./engine";
import { useSoundBed } from "./useSound";

gsap.registerPlugin(ScrollTrigger);

/** One sound cue tied to a section of the page. */
export type SceneCue = {
  /** CSS selector of the section. */
  selector: string;
  /** One-shot played when the section comes into view (scrolling down or back up). */
  enter?: { name: SoundName; volume?: number; rate?: number };
  /** Ambient layer that plays only while the section is on screen. */
  layer?: { key: string; name: SoundName; volume?: number };
};

/**
 * Sound design for a page: cues per section, plus an optional background bed (the worlds play theirs
 * from their layout so it carries on across pages; pass `bed` only for a page that has its own). Nothing plays until the visitor
 * turns sound on (the engine is off by default and remembers the choice). Cues never stack: a one-shot
 * replays at most once every 4 s.
 */
export function SceneSounds({ bed = null, bedVolume = 0.4, cues, preload = [] }: { bed?: SoundName | null; bedVolume?: number; cues: SceneCue[]; preload?: SoundName[] }) {
  useSoundBed(bed, bedVolume);

  useEffect(() => {
    const engine = getSoundEngine();
    const wanted = new Set<SoundName>(preload);
    for (const c of cues) {
      if (c.enter) wanted.add(c.enter.name);
      if (c.layer) wanted.add(c.layer.name);
    }
    if (engine.enabled) engine.preload([...wanted]);
    const last = new Map<string, number>();
    const triggers: ScrollTrigger[] = [];
    // Wait a frame so pinned sections have created their spacers.
    const raf = requestAnimationFrame(() => {
      for (const c of cues) {
        const el = document.querySelector(c.selector);
        if (!el) continue;
        triggers.push(
          ScrollTrigger.create({
            trigger: el,
            start: "top 60%",
            end: "bottom 40%",
            onToggle(self) {
              if (c.layer) engine.layer(c.layer.key, self.isActive ? c.layer.name : null, c.layer.volume ?? 0.3);
              if (self.isActive && c.enter) {
                const now = performance.now();
                if (now - (last.get(c.selector) ?? -1e9) > 4000) {
                  last.set(c.selector, now);
                  engine.sfx(c.enter.name, { volume: c.enter.volume ?? 0.35, rate: c.enter.rate });
                }
              }
            },
          }),
        );
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      triggers.forEach((t) => t.kill());
      for (const c of cues) if (c.layer) engine.layer(c.layer.key, null);
    };
    // cues are static per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
