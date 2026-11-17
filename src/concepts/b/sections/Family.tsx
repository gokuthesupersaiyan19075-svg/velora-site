"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { gsap, SplitText, useGSAP } from "../gsap";
import { slotsB } from "../slots";
import { attraction } from "@/park/content";

const summit = attraction("summit-challenge")!;
const breaker = attraction("breaker-bay")!;

const FRAMES = [
  { slot: slotsB.family1, corner: "tl", tilt: -3 },
  { slot: slotsB.family2, corner: "tr", tilt: 3 },
  { slot: slotsB.family3, corner: "bl", tilt: 2 },
  { slot: slotsB.family4, corner: "br", tilt: -2 },
];
const FROM: Record<string, string> = {
  tl: "polygon(0 0, 0 0, 0 0, 0 0)",
  tr: "polygon(100% 0, 100% 0, 100% 0, 100% 0)",
  bl: "polygon(0 100%, 0 100%, 0 100%, 0 100%)",
  br: "polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)",
};

/** Scene 05: change gear — bright, bouncy, friendly. */
export function Family({ onFamilyRides }: { onFamilyRides: () => void }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(fullMotionQuery(), () => {
        const split = SplitText.create(q(".b-family-title"), { type: "words", mask: "words" });
        gsap.from(split.words, { yPercent: 110, duration: 0.5, ease: "back.out(1.4)", stagger: 0.06, scrollTrigger: { trigger: q(".b-family-title")[0], start: "top 80%" } });
        const frames = q(".b-family-frame");
        frames.forEach((f, i) => {
          gsap.fromTo(
            f,
            { clipPath: FROM[FRAMES[i].corner], rotate: FRAMES[i].tilt },
            {
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
              rotate: 0,
              duration: 0.6,
              ease: "power3.out",
              delay: i * 0.12,
              scrollTrigger: { trigger: q(".b-family-grid")[0], start: "top 75%" },
            },
          );
        });
        gsap.fromTo(q(".b-family-band"), { xPercent: -30 }, { xPercent: 10, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="family" ref={root} className="b-family" aria-labelledby="b-family-h">
      <div className="b-family-band" aria-hidden="true" />
      <div className="b-family-copy">
        <h2 id="b-family-h" tabIndex={-1} className="b-family-title">
          Adventure challenges.
        </h2>
        <p>
          {summit.name}: {summit.line.toLowerCase()} {breaker.name}: {breaker.line.toLowerCase()} Summit Challenge is for riders from 120 cm, Breaker Bay for strong swimmers from 130 cm.
        </p>
        <button type="button" className="b-btn b-btn--dark" onClick={onFamilyRides}>
          See extreme water rides
        </button>
      </div>
      <ul className="b-family-grid">
        {FRAMES.map((f, i) => (
          <li key={f.slot.id} className={`b-family-frame b-family-frame--${i + 1}`}>
            <AssetSlot slot={f.slot} playback="hover" controlClassName="b-pause" placeholderClassName="b-ph b-ph--light" sizes="(min-width: 768px) 30vw, 50vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
