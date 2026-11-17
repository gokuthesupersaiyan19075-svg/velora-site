"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { setPlaybackLimit } from "@/shared/media/playback";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, useGSAP, type Conditions } from "../gsap";
import { slotsB } from "../slots";

const STRIPS = [slotsB.night2, slotsB.night1, slotsB.night3];

/** Scene 07: neon word, counter-moving diagonal strips, the Ferris wheels take over the screen. */
export function Night() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const { desktop, motion } = ctx.conditions as Conditions;
        if (!motion) return;
        // the word switches on like a neon tube: stroke draws, then the fill comes up (no flicker)
        gsap
          .timeline({ scrollTrigger: { trigger: q(".b-neon")[0], start: "top 75%" } })
          .fromTo(q(".b-neon-stroke"), { strokeDashoffset: 3000 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" })
          .fromTo(q(".b-neon-fill"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power1.out" }, ">-0.2");

        if (!desktop) return;
        const el = root.current!;
        el.dataset.mode = "pin";
        const strips = q(".b-strip");
        gsap.set(strips, { z: (i: number) => [-80, 0, 80][i] });
        // While the stage is pinned all three strips play: the centre at 1080p, the two side strips at 720p
        // (the page otherwise runs one decoder at a time, which left the side strips frozen on their posters).
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: q(".b-night-stage")[0],
            start: "top top",
            end: "+=200%",
            scrub: true,
            pin: true,
            anticipatePin: 1,
            onToggle: (self) => setPlaybackLimit(self.isActive ? 3 : 1),
          },
          defaults: { ease: "none" },
        });
        tl.fromTo(strips[0], { xPercent: 20 }, { xPercent: -20, duration: 1 }, 0)
          .fromTo(strips[1], { xPercent: -20 }, { xPercent: 20, duration: 1 }, 0)
          .fromTo(strips[2], { xPercent: 20 }, { xPercent: -20, duration: 1 }, 0)
          .fromTo(strips, { "--b-bright": 0.55 }, { "--b-bright": 1, duration: 0.5, stagger: 0.1 }, 0.1)
          // the Ferris wheel strip expands to fill the screen
          .to(strips[1], { xPercent: 0, clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", top: "0%", height: "100%", duration: 0.6, ease: "power3.inOut" }, 1)
          .to([strips[0], strips[2]], { autoAlpha: 0, duration: 0.3 }, 1.1);

        // pointer parallax on the strips, up to 12px
        const move = (e: PointerEvent) => {
          const x = (e.clientX / window.innerWidth - 0.5) * 2;
          const y = (e.clientY / window.innerHeight - 0.5) * 2;
          strips.forEach((s, i) => gsap.to(s.querySelector(".b-strip-inner"), { x: x * 12 * (i - 1 || 0.5), y: y * 8 * (i - 1 || 0.5), duration: 0.8, ease: "power3.out" }));
        };
        window.addEventListener("pointermove", move);
        return () => {
          setPlaybackLimit(1);
          window.removeEventListener("pointermove", move);
          delete el.dataset.mode;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="night" ref={root} className="b-night" aria-labelledby="b-night-h">
      <h2 id="b-night-h" className="b-neon">
        <span className="b-visually-hidden">Night shift</span>
        <svg viewBox="0 0 1000 220" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
          <text x="50%" y="170" textAnchor="middle" className="b-neon-fill">
            Night shift
          </text>
          <text x="50%" y="170" textAnchor="middle" className="b-neon-stroke">
            Night shift
          </text>
        </svg>
      </h2>
      <p className="b-night-sub">After sunset the rides switch on their lights. Open until 22:00, with the After Dark Pass from 17:00.</p>
      <div className="b-night-stage">
        {STRIPS.map((s, i) => (
          <div key={s.id} className={`b-strip b-strip--${i + 1}`}>
            <div className="b-strip-inner">
              <AssetSlot slot={s} fullscreen={i === 1} desktop720={i !== 1} playbackPriority={i === 1 ? 3 : 1} controlClassName="b-pause" placeholderClassName="b-ph" sizes="100vw" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
