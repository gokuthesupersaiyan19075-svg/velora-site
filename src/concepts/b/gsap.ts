"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

/** Conditions shared by every Concept B scene for gsap.matchMedia(). */
export function conditions(fullMotion: string) {
  return {
    desktop: `(min-width: 768px) and ${fullMotion}`,
    mobile: `(max-width: 767px) and ${fullMotion}`,
    motion: fullMotion,
  };
}

export type Conditions = { desktop: boolean; mobile: boolean; motion: boolean };

/**
 * Headlines (.b-kin) bounce once, the first time they scroll into view, and then stay still.
 * Transform only (no layout), so it costs nothing while scrolling. Returns a cleanup.
 */
export function popOnce(root: HTMLElement): () => void {
  // The ride words keep their own scroll-speed stretch and are not part of the one-time bounce.
  const els = Array.from(root.querySelectorAll<HTMLElement>(".b-kin")).filter((e) => !e.closest(".b-thrill, .b-final"));
  const io = new IntersectionObserver(
    (items) => {
      for (const it of items) {
        if (!it.isIntersecting) continue;
        io.unobserve(it.target);
        gsap.fromTo(it.target, { yPercent: 28, scaleY: 0.86 }, { yPercent: 0, scaleY: 1, duration: 0.8, ease: "back.out(2.6)", clearProps: "transform" });
      }
    },
    { threshold: 0.35 },
  );
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}
