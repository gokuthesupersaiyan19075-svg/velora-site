"use client";

import { useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, ScrollTrigger, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";

const CUTS = [
  { slot: slotsA.rush, word: "Hold on." },
  { slot: slotsA.rushNight, word: "Lean in." },
  { slot: slotsA.rushSpin, word: "Let go." },
];

export function S04Adrenaline() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        if (c.reduced) return;

        if (c.mobile) {
          q(".a-cut").forEach((cut: Element, i: number) => {
            // Stacked on phones: whichever cut is on screen gets playback priority (it stayed on cut 1, so the
            // later clips waited for it to leave the screen before starting).
            ScrollTrigger.create({ trigger: cut, start: "top 65%", end: "bottom 35%", onToggle: (self) => self.isActive && setActive(i) });
            gsap.fromTo(
              cut.querySelector(".a-cut-clip"),
              { clipPath: "inset(0 100% 0 0)" },
              { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power4.inOut", scrollTrigger: { trigger: cut, start: "top 75%", once: true } },
            );
            gsap.from(cut.querySelector(".a-cut-word"), { scale: 1.4, opacity: 0, duration: 0.5, delay: 0.3, scrollTrigger: { trigger: cut, start: "top 75%", once: true } });
          });
          return;
        }

        // Desktop: everything stacked in one pinned stage, cut on scroll.
        const section = root.current!;
        section.dataset.mode = "pinned";
        const clips = q(".a-cut-clip");
        const inner = q(".a-cut-inner");
        const words = q(".a-cut-word");
        gsap.set(clips, { clipPath: "inset(0 100% 0 0)" });
        gsap.set(clips[1], { clipPath: "inset(0 0 0 100%)" });
        gsap.set(clips[2], { clipPath: "inset(15% 20% 85% 20%)" });
        gsap.set(words.slice(1), { opacity: 0, scale: 1.4 });

        const tl = gsap.timeline({
          defaults: { ease: "power4.inOut" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=250%",
            pin: q(".a-s4-stage")[0],
            scrub: 1,
            onUpdate(self) {
              // Switch the playing clip just BEFORE its wipe starts (cuts begin at 1/3.5 and 2/3.5 of the timeline),
              // so it is already moving when it appears; the old 0.33/0.66 marks started it after it was on screen.
              const i = self.progress < 0.25 ? 0 : self.progress < 0.53 ? 1 : 2;
              setActive((prev) => (prev === i ? prev : i));
            },
          },
        });
        // Cut 1 — wipe left to right
        tl.to(clips[0], { clipPath: "inset(0 0% 0 0)", duration: 0.35 }, 0)
          .fromTo(inner[0], { scale: 1.2, rotate: -1.5 }, { scale: 1, rotate: 0, duration: 1, ease: "power2.out" }, 0)
          // Cut 2 — wipe right to left, word 1 blurs out
          // (no blur filters on playing full-screen video: they were re-rendered every frame and caused the lag)
          .to(clips[0], { opacity: 0.55, duration: 0.35 }, 1)
          .to(clips[1], { clipPath: "inset(0 0 0 0%)", duration: 0.35 }, 1)
          .fromTo(inner[1], { scale: 1.2, rotate: -1.5 }, { scale: 1, rotate: 0, duration: 1, ease: "power2.out" }, 1)
          .to(words[0], { scale: 0.85, opacity: 0, duration: 0.3 }, 1)
          .to(words[1], { opacity: 1, scale: 1, duration: 0.4, ease: "expo.out" }, 1.1)
          // Cut 3 — top to bottom into a framed shot, then grows to full bleed
          .to(clips[1], { opacity: 0.55, duration: 0.35 }, 2)
          .to(clips[2], { clipPath: "inset(15% 20% 15% 20%)", duration: 0.35 }, 2)
          .fromTo(inner[2], { scale: 1.2, rotate: -1.5 }, { scale: 1, rotate: 0, duration: 1, ease: "power2.out" }, 2)
          .to(words[1], { scale: 0.85, opacity: 0, duration: 0.3 }, 2)
          .to(words[2], { opacity: 1, scale: 1, duration: 0.4, ease: "expo.out" }, 2.1)
          .to(clips[2], { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power2.inOut" }, 2.4)
          // Exit — the peak warms (overlay only; a saturate filter on the playing clip cost every frame)
          .to(q(".a-s4-warm"), { opacity: 1, duration: 0.4, ease: "none" }, 3.1)
          .to(words[2], { opacity: 0, y: -30, duration: 0.3 }, 3.2);
        return () => {
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("04")} data-scene="04" ref={root} className="a-s4" aria-labelledby="a-s4-h">
      <h2 id="a-s4-h" className="sr-only-focusable">
        Feel the adrenaline
      </h2>
      <div className="a-s4-stage">
        {CUTS.map((cut, i) => (
          <div key={cut.slot.id} className={`a-cut a-cut--${i + 1}`}>
            <div className="a-cut-clip" data-cursor="video">
              <div className="a-cut-inner">
                <AssetSlot
                  slot={cut.slot}
                  alt=""
                  playbackPriority={active === i ? 4 : 0.05}
                  sizes="100vw"
                  controlClassName="a-pause"
                />
              </div>
            </div>
            <p className="a-cut-word">{cut.word}</p>
          </div>
        ))}
        <div className="a-s4-warm" aria-hidden="true" />
      </div>
    </section>
  );
}
