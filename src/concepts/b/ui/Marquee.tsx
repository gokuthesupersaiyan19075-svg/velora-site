"use client";

import { useRef } from "react";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { gsap, ScrollTrigger, useGSAP } from "../gsap";

import { attractionsIn } from "@/park/content";

// Thrillverse ride names from the shared content .
const NAMES = attractionsIn("thrillverse").map((a) => a.name);

/** Ride-name marquee: speeds up with scroll velocity, reverses with scroll direction. Static under reduced motion. */
export function Marquee() {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(fullMotionQuery(), () => {
        const loop = gsap.to(track.current, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
        let dir = 1;
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate(self) {
            dir = self.direction;
            const v = Math.min(Math.abs(self.getVelocity()) / 400, 6);
            gsap.to(loop, { timeScale: dir * (1 + v), duration: 0.2, overwrite: true });
            gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.25, ease: "power2.out" });
          },
        });
        return () => {
          loop.kill();
          st.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const row = (hidden: boolean) => (
    <ul className="b-marquee-row" aria-hidden={hidden || undefined}>
      {NAMES.map((n) => (
        <li key={n}>
          <span className="b-kin">{n}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 0l2.6 7.4L20 10l-7.4 2.6L10 20l-2.6-7.4L0 10l7.4-2.6z" />
          </svg>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className="b-marquee" role="region" aria-label="Thrillverse rides">
      <div ref={track} className="b-marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
