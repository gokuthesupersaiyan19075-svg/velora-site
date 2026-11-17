"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, SplitText, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";

const FRAMES = [
  { slot: slotsA.family1, cls: "a-col-1", speed: -4 },
  { slot: slotsA.family4, cls: "a-col-2", speed: -8 },
  { slot: slotsA.family2, cls: "a-col-3", speed: -2 },
  { slot: slotsA.family3, cls: "a-col-4", speed: -6 },
];

export function S05Everyone() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        if (c.reduced) return;

        SplitText.create(q(".a-s5-heading")[0], {
          type: "words",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.words, { opacity: 0, y: 16, duration: 1, ease: "power3.out", stagger: 0.08, scrollTrigger: { trigger: root.current, start: "top 70%", once: true } }),
        });
        gsap.from(q(".a-s5-copy"), { opacity: 0, y: 12, duration: 0.8, delay: 0.5, scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });

        q(".a-s5-frame").forEach((f: Element, i: number) => {
          const img = f.querySelector(".a-s5-img");
          const tl = gsap.timeline({ scrollTrigger: { trigger: f, start: "top 80%", once: true }, delay: i * 0.15 });
          tl.fromTo(f.querySelector(".a-s5-clip"), { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "expo.out" }).fromTo(
            img,
            { scale: 1.08 },
            { scale: 1, duration: 1.4, ease: "expo.out" },
            0,
          );
          if (c.desktop) {
            gsap.to(f, { yPercent: FRAMES[i].speed, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } });
          }
        });

        // Warm the ground from Velvet Ink to Theatre Plum as the scene ends.
        gsap.fromTo(
          root.current,
          { backgroundColor: "#120C1C" },
          { backgroundColor: "#2B1A3D", ease: "none", scrollTrigger: { trigger: root.current, start: "bottom 130%", end: "bottom 100%", scrub: true } },
        );
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("05")} data-scene="05" ref={root} className="a-s5" aria-labelledby="a-s5-h">
      <div className="a-wrap">
        <div className="a-s5-intro">
          <h2 id="a-s5-h" className="a-s5-heading">
            Room for everyone.
          </h2>
          <p className="a-s5-copy">
            Small riders and first-timers, grandparents, couples and the friends who came for the drop. The pace slows here, and the park
            makes room for all of them.
          </p>
        </div>
        <div className="a-s5-collage">
          {FRAMES.map((f) => (
            <figure key={f.slot.id} className={`a-s5-frame ${f.cls}`}>
              <div className="a-s5-clip">
                <div className="a-s5-img">
                  <AssetSlot slot={f.slot} alt="" sizes="(min-width: 768px) 45vw, 90vw" controlClassName="a-pause" />
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
