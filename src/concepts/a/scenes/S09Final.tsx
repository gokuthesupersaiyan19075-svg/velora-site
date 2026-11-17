"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, SplitText, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";
import { useUI } from "../ui/context";
import { MagneticButton } from "../ui/MagneticButton";

export function S09Final() {
  const root = useRef<HTMLElement>(null);
  const { openTickets } = useUI();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        if (c.reduced) return;
        const split = SplitText.create(q(".a-s9-name")[0], { type: "chars", mask: "chars" });
        const intro = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top 55%", once: true } });
        intro
          .from(split.chars, { yPercent: -110, duration: 1.2, ease: "expo.out", stagger: 0.05 })
          .from(q(".a-s9-ctas"), { opacity: 0, y: 12, duration: 0.8, ease: "power2.out" }, 0.7);
        // The closing aperture: bars return while the shot settles.
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 1 } })
          .fromTo(q(".a-s9-push"), { scale: 1.08 }, { scale: 1, ease: "none" }, 0)
          .fromTo(q(".a-letterbox"), { scaleY: 0 }, { scaleY: 1, ease: "power2.inOut", duration: 0.5 }, 0.5);
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("09")} data-scene="09" ref={root} className="a-s9" aria-labelledby="a-s9-h">
      <div className="a-s9-frame">
        <div className="a-s9-push" data-cursor="video">
          <AssetSlot slot={slotsA.final} alt="" sizes="100vw" controlClassName="a-pause a-pause--final" />
        </div>
        <div className="a-hero-grade" aria-hidden="true" />
        <div className="a-letterbox a-letterbox--top" aria-hidden="true" />
        <div className="a-letterbox a-letterbox--bottom" aria-hidden="true" />
        <div className="a-s9-content">
          <h2 id="a-s9-h" className="a-s9-name">
            VELORA
          </h2>
          <div className="a-s9-ctas">
            <MagneticButton onClick={(e) => openTickets(e.currentTarget as HTMLElement)}>Get tickets</MagneticButton>
            <a className="a-btn a-btn--ghost" href={`#${sceneId("08")}`}>
              Plan your visit
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
