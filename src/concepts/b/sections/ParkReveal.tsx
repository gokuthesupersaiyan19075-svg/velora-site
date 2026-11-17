"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, SplitText, useGSAP, type Conditions } from "../gsap";
import { slotsB } from "../slots";
import { resolveSlot } from "@/shared/media/library";

/** Stills matching the moment of each clip the design was approved with (a chosen frame, not the first one). */
const PARK_STILL: Record<string, string> = {
  "pexels-33752850": "/media/web/pexels-33752850/poster-park.jpg",
  "pexels-28000863": "/media/web/pexels-28000863/poster-park.jpg",
};

const FLASHES = [
  { slot: slotsB.flash1, label: "Tempest" },
  { slot: slotsB.flash2, label: "Starfall Tower" },
  { slot: slotsB.flash3, label: "Freefall Flume" },
];

/** Scene 02: a small aerial frame blows up to full bleed, then three highlight slices cut across it. */
export function ParkReveal() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const { desktop, motion } = ctx.conditions as Conditions;
        if (!motion) return;
        const split = SplitText.create(q(".b-reveal-title"), { type: "words", mask: "words" });
        gsap.from(split.words, {
          yPercent: 120,
          duration: 0.6,
          ease: "back.out(1.6)",
          stagger: 0.05,
          scrollTrigger: { trigger: q(".b-reveal-title")[0], start: "top 80%" },
        });
        if (!desktop) return () => split.revert();

        root.current!.dataset.mode = "pin";
        const slices = q(".b-slice");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=475%", scrub: 0.5, pin: true, anticipatePin: 1 },
          defaults: { ease: "none" },
        });
        tl.fromTo(
          q(".b-reveal-aerial"),
          { clipPath: "inset(31% 35% 22% 35% round 14px)" },
          { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 6 },
        )
          .fromTo(q(".b-reveal-aerial-zoom > :not(.velora-pause)"), { scale: 1.3 }, { scale: 1, duration: 6 }, 0)
          .to(q(".b-reveal-title"), { color: "#F7F7F2", duration: 2 }, 3);
        // The aerial keeps its original scroll distance (6 units ≈ 160% of a screen); the three slices get twice
        // the scroll they had and gentler eases, so they travel with the scroll instead of snapping past.
        slices.forEach((s, i) => {
          const at = 6.2 + i * 3.2;
          const last = i === slices.length - 1;
          tl.fromTo(
            s,
            { clipPath: "polygon(0% 0%, 0% 0%, -14% 100%, -14% 100%)" },
            { clipPath: "polygon(0% 0%, 100% 0%, 86% 100%, -14% 100%)", duration: 1.4, ease: "power2.inOut" },
            at,
          ).fromTo(s.querySelector(".b-slice-zoom"), { scale: 1.2 }, { scale: 1, duration: 2.4, ease: "power1.out" }, at);
          tl.from(s.querySelector(".b-slice-cap"), { x: 60, autoAlpha: 0, duration: 1, ease: "power2.out" }, at + 0.6);
          if (!last) {
            tl.to(s, { clipPath: "polygon(114% 0%, 100% 0%, 100% 100%, 100% 100%)", duration: 1.2, ease: "power2.inOut" }, at + 2.4);
          } else {
            // the last slice widens to fill the screen and hands over to the ride gallery
            tl.to(s, { left: "0%", width: "100%", clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: 2.4, ease: "power2.inOut" }, at + 2.6);
          }
        });
        return () => {
          split.revert();
          delete root.current?.dataset.mode;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="park" ref={root} className="b-reveal" aria-labelledby="b-reveal-h">
      <h2 id="b-reveal-h" className="b-reveal-title b-kin">
        One park. Every speed.
      </h2>
      <div className="b-reveal-stage">
        <div className="b-reveal-aerial">
          <div className="b-reveal-aerial-zoom">
            <AssetSlot slot={slotsB.aerial} playback="still" controlClassName="b-pause" placeholderClassName="b-ph" sizes="100vw" />
          </div>
        </div>
        {FLASHES.map((f, i) => (
          <div key={f.slot.id} className={`b-slice b-slice--${i + 1}`}>
            <div className="b-slice-zoom">
              <AssetSlot slot={f.slot} playback="still" poster={PARK_STILL[resolveSlot(f.slot).asset?.id ?? ""]} pauseControl={false} placeholderClassName="b-ph" sizes="(min-width: 768px) 45vw, 33vw" />
            </div>
            <a href="#rides" className="b-slice-cap">
              <span className="b-kin">{f.label}</span>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
