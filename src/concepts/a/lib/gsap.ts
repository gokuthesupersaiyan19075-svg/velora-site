"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

let registered = false;
export function registerA() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
  registered = true;
}
registerA();

export { gsap, ScrollTrigger, SplitText, useGSAP };

/** Conditions shared by every scene: full motion vs reduced, desktop vs phone. */
export function conditions(fullQuery: string) {
  return {
    full: fullQuery,
    reduced: fullQuery === "(max-width: 0px)" ? "(min-width: 0px)" : "(prefers-reduced-motion: reduce)",
    desktop: "(min-width: 768px)",
    mobile: "(max-width: 767px)",
  };
}

export type Cond = { full: boolean; reduced: boolean; desktop: boolean; mobile: boolean };

/**
 * Word reveal: each word rises from yPercent 110 → 0 inside its own mask.
 * Returns the SplitText instance (reverted automatically by the gsap context).
 */
export function revealWords(
  el: Element | null,
  opts: { trigger?: Element | null; start?: string; delay?: number; stagger?: number; duration?: number; y?: number } = {},
) {
  if (!el) return null;
  return SplitText.create(el, {
    type: "words",
    mask: "words",
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.words, {
        yPercent: opts.y ?? 110,
        duration: opts.duration ?? 1.1,
        ease: "expo.out",
        stagger: opts.stagger ?? 0.06,
        delay: opts.delay ?? 0,
        scrollTrigger: opts.trigger === null ? undefined : { trigger: opts.trigger ?? el, start: opts.start ?? "top 70%", once: true },
      });
    },
  });
}
