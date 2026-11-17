"use client";

import { useRef, type ReactNode } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import type { MediaSlot } from "@/shared/media/types";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, revealWords, useGSAP, type Cond } from "../lib/gsap";
import { WIPE_MS } from "./PageShell";

type Props = {
  slot: MediaSlot;
  /** Small line above the title, styled like the home timecode. */
  eyebrow: ReactNode;
  title: string;
  lede?: ReactNode;
  actions?: ReactNode;
  /** Above the eyebrow, e.g. a link back to the list. */
  back?: ReactNode;
  alt?: string;
};

/**
 * Opening frame of an inner page, cut from the same film as the home opening (scene 01):
 * graded footage under letterbox bars that draw back, a masked word rise on the title,
 * then a slow push-in as the visitor scrolls. No pinning: the page scrolls freely.
 */
export function PageHero({ slot, eyebrow, title, lede, actions, back, alt = "" }: Props) {
  const root = useRef<HTMLElement>(null);

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
        gsap.set(q(".a-phero-fade"), { opacity: 0, y: 14 });
        el.dataset.ready = "true";
        const delay = WIPE_MS / 1000;
        gsap
          .timeline({ delay, defaults: { ease: "expo.out" } })
          .fromTo(q(".a-phero-load"), { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1.04, duration: 1.6, ease: "power2.out" }, 0)
          .to(q(".a-letterbox"), { scaleY: 0, duration: 1.3, ease: "power2.inOut" }, 0.2)
          .to(q(".a-phero-fade"), { opacity: 1, y: 0, duration: 0.9, ease: "power2.out", stagger: 0.08 }, 0.55);
        revealWords(q(".a-phero-title")[0], { trigger: null, delay: delay + 0.25, stagger: 0.07 });

        // Scroll: the shot pushes in and drifts while the title lifts away.
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 1 } })
          .fromTo(q(".a-phero-push"), { scale: 1, yPercent: 0 }, { scale: 1.08, yPercent: 8, ease: "none" }, 0)
          .to(q(".a-phero-copy"), { y: c.mobile ? "-6vh" : "-12vh", opacity: 0.2, ease: "power1.in" }, 0);
      });
    },
    { scope: root },
  );

  return (
    <header ref={root} className="a-phero">
      <div className="a-phero-stage">
        <div className="a-phero-load" data-cursor="video">
          <div className="a-phero-push">
            <AssetSlot slot={slot} priority playbackPriority={3} alt={alt} controlClassName="a-pause a-pause--hero" />
          </div>
        </div>
        <div className="a-hero-grade a-phero-grade" aria-hidden="true" />
        <div className="a-letterbox a-letterbox--top" aria-hidden="true" />
        <div className="a-letterbox a-letterbox--bottom" aria-hidden="true" />
        <div className="a-wrap a-phero-copy">
          {back && <div className="a-phero-fade a-phero-back">{back}</div>}
          <p className="a-phero-fade a-eyebrow">{eyebrow}</p>
          <h1 className="a-phero-title a-title-card">{title}</h1>
          {lede && <p className="a-phero-fade a-phero-lede">{lede}</p>}
          {actions && <div className="a-phero-fade a-phero-actions">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
