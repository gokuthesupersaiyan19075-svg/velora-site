"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, SplitText, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";
import { useUI } from "../ui/context";
import { MagneticButton } from "../ui/MagneticButton";

export function S01Opening() {
  const root = useRef<HTMLElement>(null);
  const { openTickets } = useUI();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        const el = root.current!;
        if (c.reduced) {
          gsap.set(q(".a-letterbox"), { scaleY: 0 });
          el.dataset.ready = "true";
          return;
        }
        // ---- Load sequence (once) ----
        const split = SplitText.create(q(".a-wordmark")[0], { type: "chars", mask: "chars" });
        gsap.set(split.chars, { yPercent: 110 });
        gsap.set(q(".a-hero-load"), { opacity: 0, scale: 1.12 });
        gsap.set(q(".a-hero-line"), { opacity: 0, y: 12 });
        gsap.set(q(".a-hero-ctas"), { opacity: 0, scale: 0.96 });
        gsap.set(q(".a-scrollcue"), { opacity: 0 });
        el.dataset.ready = "true";
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.to(q(".a-hero-load"), { opacity: 1, scale: 1.06, duration: 1.6, ease: "power2.out" }, 0)
          .to(split.chars, { yPercent: 0, duration: 1.2, stagger: 0.05 }, 0.4)
          .to(q(".a-hero-line"), { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, 1.3)
          .to(q(".a-hero-ctas"), { opacity: 1, scale: 1, duration: 0.8 }, 1.6)
          .to(q(".a-scrollcue"), { opacity: 1, duration: 0.6 }, 1.9);
        gsap.fromTo(q(".a-scrollcue-fill"), { yPercent: -100 }, { yPercent: 100, duration: 2.4, ease: "power1.inOut", repeat: 2, delay: 2 });

        // ---- Scroll: pinned push-in, title lifts away, letterbox draws back ----
        const scroll = gsap.timeline({
          scrollTrigger: {
            trigger: q(".a-hero-stage")[0],
            start: "top top",
            end: c.mobile ? "+=60%" : "+=100%",
            pin: true,
            scrub: 1,
          },
        });
        scroll
          .fromTo(q(".a-hero-push"), { scale: 1.06 }, { scale: 1, ease: "none" }, 0)
          .to(q(".a-hero-title"), { y: "-18vh", opacity: 0, ease: "power1.in" }, 0)
          .to(q(".a-scrollcue"), { opacity: 0, duration: 0.2 }, 0)
          .to(q(".a-letterbox"), { scaleY: 0, ease: "power2.inOut" }, 0.15);
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("01")} data-scene="01" ref={root} className="a-hero" aria-labelledby="a-h1">
      <div className="a-hero-stage">
        <div className="a-hero-load" data-cursor="video">
          <div className="a-hero-push">
            <AssetSlot slot={slotsA.hero} priority playbackPriority={3} alt="" controlClassName="a-pause a-pause--hero" />
          </div>
        </div>
        <div className="a-hero-grade" aria-hidden="true" />
        <div className="a-letterbox a-letterbox--top" aria-hidden="true" />
        <div className="a-letterbox a-letterbox--bottom" aria-hidden="true" />

        <div className="a-hero-title">
          <h1 id="a-h1" className="a-wordmark">
            VELORA
          </h1>
          <p className="a-hero-line">A park you enter like a film.</p>
          <div className="a-hero-ctas">
            <MagneticButton href={`#${sceneId("02")}`}>Explore the park</MagneticButton>
            <button type="button" className="a-btn a-btn--ghost" onClick={(e) => openTickets(e.currentTarget)}>
              Get tickets
            </button>
          </div>
        </div>

        <div className="a-scrollcue" aria-hidden="true">
          <span className="a-scrollcue-fill" />
        </div>
      </div>
    </section>
  );
}
