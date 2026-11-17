"use client";

import { useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, SplitText, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";

const LAYERS = [slotsA.dusk, slotsA.night1, slotsA.night2, slotsA.finale];
const GLOWS = [
  { x: "22%", y: "38%", c: "#E8B04B", s: 26 },
  { x: "71%", y: "30%", c: "#FF5C8A", s: 22 },
  { x: "55%", y: "62%", c: "#E8B04B", s: 18 },
  { x: "36%", y: "70%", c: "#FF5C8A", s: 16 },
  { x: "84%", y: "58%", c: "#E8B04B", s: 20 },
];

export function S07AfterDark() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        if (c.reduced) return;

        const split = SplitText.create(q(".a-s7-title")[0], { type: "chars" });
        const signOn = gsap
          .timeline({ paused: true })
          .set(split.chars, { opacity: 0, textShadow: "0 0 0px rgba(255,92,138,0)" })
          .to(split.chars, { opacity: 0.7, duration: 0.08, stagger: 0.03 })
          .to(split.chars, { opacity: 0.15, duration: 0.08 })
          .to(split.chars, { opacity: 0.9, duration: 0.08 })
          .to(split.chars, { opacity: 0.35, duration: 0.08 })
          .to(split.chars, { opacity: 1, textShadow: "0 0 24px rgba(255,92,138,0.85)", duration: 0.6, ease: "power2.out" });
        gsap.set(split.chars, { opacity: 0 });

        if (c.mobile) {
          q(".a-s7-layer").forEach((l: Element) =>
            gsap.fromTo(l, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: l, start: "top 80%", once: true } }),
          );
          gsap.to({}, { scrollTrigger: { trigger: q(".a-s7-title")[0], start: "top 75%", once: true, onEnter: () => signOn.play() } });
          return;
        }

        const layers = q(".a-s7-layer");
        const section = root.current!;
        section.dataset.mode = "pinned";
        gsap.set(layers.slice(1), { opacity: 0 });
        gsap.set(q(".a-glow"), { opacity: 0, scale: 0.6 });
        let lit = false;

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=300%",
            pin: q(".a-s7-stage")[0],
            scrub: 1,
            onUpdate(self) {
              const p = self.progress;
              const i = p < 0.4 ? 0 : p < 0.55 ? 1 : p < 0.7 ? 2 : 3;
              setActive((prev) => (prev === i ? prev : i));
              if (p >= 0.5 && !lit) {
                lit = true;
                signOn.restart();
              } else if (p < 0.45 && lit) {
                lit = false;
                signOn.pause(0);
                gsap.set(split.chars, { opacity: 0 });
              }
            },
          },
        });
        // Colour grade: peach → dusk violet → velvet ink
        tl.fromTo(q(".a-grade--peach"), { opacity: 0.35 }, { opacity: 0, duration: 0.4 }, 0)
          .fromTo(q(".a-grade--violet"), { opacity: 0 }, { opacity: 0.5, duration: 0.25 }, 0.1)
          .to(q(".a-grade--violet"), { opacity: 0.15, duration: 0.3 }, 0.45)
          .fromTo(q(".a-grade--ink"), { opacity: 0 }, { opacity: 0.35, duration: 0.3 }, 0.3)
          // Night layers cross-fade in under the grade
          .to(layers[1], { opacity: 1, duration: 0.1 }, 0.35)
          .to(layers[2], { opacity: 1, duration: 0.08 }, 0.55)
          .to(layers[3], { opacity: 1, duration: 0.08 }, 0.7)
          .fromTo(layers[3].querySelector(".a-s7-zoom"), { scale: 1 }, { scale: 1.08, duration: 0.3 }, 0.7)
          .to(q(".a-grade--ink"), { opacity: 0.1, duration: 0.2 }, 0.7)
          // Lights bloom
          .to(q(".a-glow"), { opacity: 1, scale: 1, stagger: 0.03, duration: 0.2, ease: "power2.out" }, 0.38)
          .to(q(".a-s7-text"), { y: -20, duration: 0.3 }, 0.7);
        return () => {
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("07")} data-scene="07" ref={root} className="a-s7" aria-labelledby="a-s7-h">
      <div className="a-s7-stage">
        {LAYERS.map((slot, i) => (
          <div key={slot.id} className={`a-s7-layer a-s7-layer--${i}`} data-cursor="video">
            <div className="a-s7-zoom">
              <AssetSlot slot={slot} alt="" sizes="100vw" playbackPriority={active === i ? 4 : 0.05} controlClassName="a-pause" />
            </div>
            <div className="a-grade a-grade--static" aria-hidden="true" />
          </div>
        ))}
        <div className="a-grade a-grade--peach" aria-hidden="true" />
        <div className="a-grade a-grade--violet" aria-hidden="true" />
        <div className="a-grade a-grade--ink" aria-hidden="true" />
        <div className="a-glows" aria-hidden="true">
          {GLOWS.map((g, i) => (
            <span key={i} className="a-glow" style={{ left: g.x, top: g.y, width: `${g.s}vmin`, height: `${g.s}vmin`, background: `radial-gradient(circle, ${g.c}55 0%, ${g.c}00 70%)` }} />
          ))}
        </div>
        <div className="a-s7-reflection" aria-hidden="true" />
        <div className="a-s7-text">
          <h2 id="a-s7-h" className="a-s7-title">
            After dark
          </h2>
          <p className="a-s7-copy">When the sun drops, the park changes key. The rides stay lit until 22:00, and Night Bloom lights up the lagoon at 21:30.</p>
        </div>
      </div>
    </section>
  );
}
