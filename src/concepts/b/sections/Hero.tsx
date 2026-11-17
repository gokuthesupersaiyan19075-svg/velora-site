"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { resolveSlot } from "@/shared/media/library";
import { usePreviewCandidates } from "@/shared/media/preview-store";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, useGSAP, type Conditions } from "../gsap";
import { slotsB } from "../slots";
import { HoldToLaunch } from "../ui/HoldToLaunch";

const LINES = ["Faster", "Higher", "Louder"];

export function Hero({ onTickets }: { onTickets: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [preview] = usePreviewCandidates();
  const resolved = resolveSlot(slotsB.hero, preview);
  const isCoaster = resolved.asset?.category === "coaster";

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const { motion, mobile } = ctx.conditions as Conditions;
        if (!motion) return;
        const lines = q(".b-hero-line");
        // the three lines sit at different depths so the scroll "tear" has parallax
        gsap.set(lines, { z: (i: number) => i * 40 });
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.set(q(".b-hero-ground"), { autoAlpha: 1 })
          .fromTo(
            q(".b-hero-media"),
            { clipPath: "polygon(0% 0%, 3% 0%, 0% 100%, 0% 100%)" },
            { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 0.6, ease: "power4.out" },
            0.15,
          )
          .fromTo(q(".b-hero-zoom > :not(.velora-pause)"), { scale: 1.25 }, { scale: 1, duration: 0.9, ease: "power3.out" }, 0.15)
          .from(lines[0], { x: "-40vw", duration: 0.7 }, 0.25)
          .from(lines[1], { x: "40vw", duration: 0.7 }, 0.33)
          .from(lines[2], { scale: 2.2, autoAlpha: 0, duration: 0.7 }, 0.41)
          // arrive stretched, then spring back to compressed like a loaded spring
          .fromTo(q(".b-hero-line .b-kin"), { "--w": 125 }, { "--w": 62, duration: 0.5, ease: "back.out(2)", stagger: 0.08 }, 0.75)
          .from(q(".b-hero-sub, .b-hero-actions"), { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 1.0);

        if (isCoaster) {
          // one short shake on entry, coaster footage only
          tl.to(q(".b-hero-shake"), { keyframes: { x: [3, -2, 2, -3, 1, 0], y: [-2, 3, -1, 2, -1, 0] }, duration: 0.4, ease: "none" }, 0.6);
        }

        const k = mobile ? 0.5 : 1;
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } })
          .to(q(".b-hero-zoom > :not(.velora-pause)"), { scale: 1.1, ease: "none" }, 0)
          .to(lines[0], { x: `${-12 * k}vw`, ease: "none" }, 0)
          .to(lines[1], { x: `${12 * k}vw`, ease: "none" }, 0)
          .to(lines[2], { y: `${8 * k}vh`, ease: "none" }, 0);
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [isCoaster] },
  );

  return (
    <section id="top" ref={root} className="b-hero" aria-labelledby="b-h1">
      <div className="b-hero-ground" aria-hidden="true" />
      <div className="b-hero-media">
        <div className="b-hero-shake">
          <div className="b-hero-zoom">
            <AssetSlot slot={slotsB.hero} priority fullscreen playbackPriority={3} controlClassName="b-pause" placeholderClassName="b-ph" />
          </div>
        </div>
        <div className="b-hero-shade" aria-hidden="true" />
      </div>

      <div className="b-hero-copy">
        <h1 id="b-h1" className="b-hero-title" aria-label="VELORA. Faster, higher, louder.">
          {LINES.map((l, i) => (
            <span key={l} className={`b-hero-line b-hero-line--${i + 1}`} aria-hidden="true">
              <span className="b-kin">{l}</span>
            </span>
          ))}
        </h1>
        <p className="b-hero-sub">
          The theme park built for adrenaline.
        </p>
        <div className="b-hero-actions">
          <HoldToLaunch onLaunch={onTickets} />
          <a href="#rides" className="b-btn b-btn--ghost">
            See the rides
          </a>
        </div>
      </div>
    </section>
  );
}
