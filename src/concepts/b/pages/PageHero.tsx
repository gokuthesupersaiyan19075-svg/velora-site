"use client";

import { useRef, type ReactNode } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import type { MediaSlot } from "@/shared/media/types";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, useGSAP, type Conditions } from "../gsap";

/**
 * Inner-page opener in the home hero's language: Ultramarine ground, footage behind a shade,
 * stacked kinetic lines that tear in from opposite sides and drift apart as you scroll.
 * Only transforms and opacity move.
 */
export function PageHero({
  id,
  eyebrow,
  lines,
  label,
  sub,
  slot,
  size = "page",
  children,
  before,
}: {
  id: string;
  eyebrow: ReactNode;
  lines: string[];
  /** Accessible name of the h1 when the visible lines read differently. */
  label?: string;
  sub?: ReactNode;
  slot?: MediaSlot;
  /** "ride" = full-screen detail opener. */
  size?: "page" | "ride";
  children?: ReactNode;
  /** Rendered above the eyebrow (e.g. a back link). */
  before?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const { motion, mobile } = ctx.conditions as Conditions;
        if (!motion) return;
        const rows = q(".b-phero-line");
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from(q(".b-phero-zoom > :not(.velora-pause)"), { scale: 1.22, duration: 1, ease: "power3.out" }, 0)
          .from(rows, { x: (i: number) => (i % 2 ? "36vw" : "-36vw"), autoAlpha: 0, duration: 0.75, stagger: 0.08 }, 0.1)
          .from(q(".b-phero-eyebrow, .b-phero-before"), { x: -30, autoAlpha: 0, duration: 0.5 }, 0.2)
          .from(q(".b-phero-sub, .b-phero-actions"), { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.55);

        const k = mobile ? 0.5 : 1;
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } })
          .to(q(".b-phero-zoom > :not(.velora-pause)"), { scale: 1.08, ease: "none" }, 0)
          .to(rows, { x: (i: number) => `${(i % 2 ? 10 : -10) * k}vw`, ease: "none" }, 0);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className={`b-phero b-phero--${size}${slot ? " b-phero--media" : ""}`} aria-labelledby={id}>
      {slot && (
        <div className="b-phero-media">
          <div className="b-phero-zoom">
            <AssetSlot slot={slot} priority playbackPriority={3} controlClassName="b-pause b-phero-pause" placeholderClassName="b-ph" sizes="100vw" />
          </div>
          <div className="b-phero-shade" aria-hidden="true" />
        </div>
      )}
      <div className="b-phero-copy">
        {before && <div className="b-phero-before">{before}</div>}
        <p className="b-phero-eyebrow">{eyebrow}</p>
        <h1 id={id} className="b-phero-title" aria-label={label ?? lines.join(" ")}>
          {lines.map((l, i) => (
            <span key={`${l}-${i}`} className={`b-phero-line b-phero-line--${(i % 3) + 1}`} aria-hidden="true">
              <span className="b-kin">{l}</span>
            </span>
          ))}
        </h1>
        {sub && <p className="b-phero-sub">{sub}</p>}
        {children && <div className="b-phero-actions">{children}</div>}
      </div>
    </section>
  );
}
