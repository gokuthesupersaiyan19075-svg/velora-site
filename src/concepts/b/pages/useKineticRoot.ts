"use client";

import type { RefObject } from "react";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { gsap, popOnce, ScrollTrigger, useGSAP } from "../gsap";

/**
 * The home page's scroll-velocity engine for the inner pages: writes --b-vel (0..1) and --b-skew (deg)
 * on the root so .b-kin headlines stretch and lean with scroll speed, and hides the corner nav on the way down.
 * Same constants as ConceptB so every Thrillverse page feels like one ride. Off under reduced motion.
 */
export function useKineticRoot(root: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(fullMotionQuery(), () => {
        const DEAD = 180;
        let target = 0;
        let shown = 0;
        let lastVel = "";
        const lastSkew = "";
        let velEls: HTMLElement[] = [];
        const tick = () => {
          target *= 0.9;
          shown += (target - shown) * 0.14;
          if (Math.abs(shown) < 1) shown = 0;
          // The width axis re-shapes the text, so it moves in 0.1 steps (2 width units): far fewer re-layouts, same look.
          const vel = (Math.round(Math.min(1, Math.abs(shown) / 2600) * 10) / 10).toFixed(1);
          const skew = gsap.utils.clamp(-8, 8, shown / -320).toFixed(1);
          // Written only on the two elements that read it (speed gauge, streak lines): a change on the root
          // would re-style the whole page on every step.
          if (vel !== lastVel) {
            lastVel = vel;
            if (!velEls.length) velEls = Array.from(el.querySelectorAll<HTMLElement>(".b-speed-fill, .b-thrill-lines, .b-nav-speed"));
            velEls.forEach((n) => n.style.setProperty("--b-vel", vel));
          }
          void skew;
          void lastSkew;
        };
        // Keep animated elements on stable GPU layers: with the default "auto", GSAP drops each layer when a tween
        // ends and rebuilds it on the next one, which re-layerised the page on almost every scroll frame.
        gsap.config({ force3D: true });
        gsap.ticker.add(tick);
        const stopPop = popOnce(el);
        let lastDir = 1;
        let turnAt = 0;
        const st = ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate(self) {
            const v = self.getVelocity();
            if (Math.abs(v) > DEAD && Math.abs(v) > Math.abs(target)) target = v;
            const y = self.scroll();
            if (y < 80) {
              el.dataset.navHidden = "false";
              lastDir = -1;
            } else if (self.direction !== lastDir) {
              if (!turnAt) turnAt = y;
              if (Math.abs(y - turnAt) > 24) {
                lastDir = self.direction;
                turnAt = 0;
                el.dataset.navHidden = self.direction === 1 ? "true" : "false";
              }
            } else turnAt = 0;
          },
        });
        document.fonts?.ready.then(() => ScrollTrigger.refresh());

        // Below-the-fold blocks slide up once as they arrive (transform + opacity only).
        const blocks = gsap.utils.toArray<HTMLElement>("[data-reveal]", el);
        gsap.set(blocks, { y: 48, autoAlpha: 0 });
        const batch = ScrollTrigger.batch(blocks, {
          start: "top 88%",
          once: true,
          onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.08, overwrite: true }),
        });

        return () => {
          st.kill();
          stopPop();
          gsap.config({ force3D: "auto" });
          batch.forEach((t) => t.kill());
          gsap.set(blocks, { clearProps: "transform,opacity,visibility" });
          gsap.ticker.remove(tick);
          velEls.forEach((n) => n.style.removeProperty("--b-vel"));
          delete el.dataset.navHidden;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );
}
