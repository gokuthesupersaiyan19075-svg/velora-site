"use client";

import type { RefObject } from "react";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, revealWords, useGSAP, type Cond } from "../lib/gsap";

/**
 * Scroll reveals for an inner page, using the same vocabulary as the home scenes:
 * - [data-reveal="words"]: masked word rise (revealWords, as in scenes 02 and 06);
 * - [data-reveal="fade"]: soft rise and fade;
 * - [data-reveal="frame"]: a frame whose ink curtain (.a-curtain) lifts while the shot settles from 1.12.
 * Transform and opacity only. Reduced motion: everything is simply shown.
 * Pass `dependencies` when content inside the scope changes (e.g. a filter): reveals are rebuilt against the new layout.
 */
export function useReveals(scope: RefObject<HTMLElement | null>, dependencies: unknown[] = []) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        if (c.reduced) return;
        const q = gsap.utils.selector(scope);
        q('[data-reveal="words"]').forEach((el: Element) => revealWords(el, { start: "top 85%" }));
        q('[data-reveal="fade"]').forEach((el: Element) =>
          gsap.from(el, { opacity: 0, y: 16, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }),
        );
        q('[data-reveal="frame"]').forEach((el: Element) => {
          const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%", once: true } });
          tl.fromTo(el.querySelector(".a-curtain"), { scaleY: 1 }, { scaleY: 0, duration: 1.1, ease: "expo.inOut" }, 0).fromTo(
            el.querySelector(".a-frame-media"),
            { scale: 1.12 },
            { scale: 1, duration: 1.6, ease: "expo.out" },
            0.15,
          );
        });
      });
    },
    { scope, dependencies, revertOnUpdate: true },
  );
}
