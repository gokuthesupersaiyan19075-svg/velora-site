"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { gsap, useGSAP } from "../gsap";
import { slotsB } from "../slots";
import { FooterNav } from "../pages/FooterNav";
import { HoldToLaunch } from "../ui/HoldToLaunch";

/** Scene 09 + footer: the heading loads like a spring as the section scrolls in. */
export function Final({ onTickets }: { onTickets: () => void }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(fullMotionQuery(), () => {
        const st = { trigger: q(".b-final")[0], start: "top 85%", end: "center center", scrub: true };
        // Transform-only rise: scrubbing the font width re-flowed the line every frame (it jumped and bounced).
        gsap.fromTo(q(".b-final-title .b-kin"), { yPercent: 18, scale: 0.94, autoAlpha: 0.35 }, { yPercent: 0, scale: 1, autoAlpha: 1, ease: "power2.out", scrollTrigger: st });
        gsap.fromTo(q(".b-final-zoom > :not(.velora-pause)"), { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { ...st, end: "bottom top" } });
        gsap.from(q(".b-final-cta"), { scale: 0.6, autoAlpha: 0, duration: 0.6, ease: "back.out(2.2)", scrollTrigger: { trigger: q(".b-final")[0], start: "center 70%" } });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root}>
      <section id="final" className="b-final" aria-labelledby="b-final-h">
        <div className="b-final-media">
          <div className="b-final-zoom">
            <AssetSlot slot={slotsB.final} fullscreen controlClassName="b-pause" placeholderClassName="b-ph" sizes="100vw" />
          </div>
        </div>
        <div className="b-final-copy">
          <h2 id="b-final-h" className="b-final-title">
            <span className="b-kin">Your turn.</span>
          </h2>
          <div className="b-final-cta">
            <HoldToLaunch onLaunch={onTickets} />
          </div>
        </div>
      </section>

      <footer className="b-foot">
        <div className="b-foot-top">
          <p className="b-foot-mark b-kin">VELORA</p>
          <FooterNav />
        </div>
        <p className="b-foot-credits">
          VELORA, Lake Aurelia Road, Novara Bay. Open daily 10:00 to 22:00.
        </p>
      </footer>
    </div>
  );
}
