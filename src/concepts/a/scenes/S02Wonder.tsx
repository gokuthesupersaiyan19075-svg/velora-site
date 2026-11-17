"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, revealWords, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";
import { park } from "@/park/content";

const STATS = [
  { label: "rides", value: park.stats.rides },
  { label: "hectares of park", value: park.stats.hectares },
  { label: "shows every day", value: park.stats.showsPerDay },
];

export function S02Wonder() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        if (c.reduced) return;

        revealWords(q(".a-s2-heading")[0], { trigger: root.current, start: "top 70%" });
        gsap.from(q(".a-s2-copy"), { opacity: 0, y: 12, duration: 0.8, delay: 0.6, scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });

        // Odometer: digits roll and settle on the park's numbers.
        q(".a-stat-digits").forEach((d: Element, i: number) => {
          gsap.fromTo(
            d.querySelectorAll(".a-roll"),
            { yPercent: -100 * (10 / 11) },
            { yPercent: 0, duration: 1.2, ease: "power3.out", delay: i * 0.12, scrollTrigger: { trigger: d, start: "top 85%", once: true } },
          );
        });

        if (c.desktop) {
          const section = root.current!;
          section.dataset.mode = "sticky";
          const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 1 } });
          tl.fromTo(q(".a-s2-pano"), { scale: 1.15 }, { scale: 1, ease: "none", duration: 1 }, 0)
            .fromTo(q(".a-s2-detail"), { yPercent: 20 }, { yPercent: -10, ease: "none", duration: 1 }, 0)
            .fromTo(q(".a-s2-detail-frame"), { clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0% 0 0 0)", ease: "power2.out", duration: 0.25 }, 0)
            .fromTo(q(".a-s2-wipe"), { yPercent: 100 }, { yPercent: 0, ease: "power2.inOut", duration: 0.2 }, 0.8);
          return () => {
            delete section.dataset.mode;
          };
        } else {
          gsap.fromTo(
            q(".a-s2-detail-frame"),
            { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0% 0 0 0)", duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: q(".a-s2-detail")[0], start: "top 80%", once: true } },
          );
        }
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("02")} data-scene="02" ref={root} className="a-s2" aria-labelledby="a-s2-h">
      <div className="a-s2-sticky">
        <div className="a-s2-pano-wrap" data-cursor="video">
          <div className="a-s2-pano">
            <AssetSlot slot={slotsA.panorama} alt="" sizes="100vw" controlClassName="a-pause" placeholderClassName="a-ph-right" />
          </div>
          <div className="a-s2-shade" aria-hidden="true" />
        </div>

        <div className="a-wrap a-s2-grid">
          <div className="a-s2-text">
            <h2 id="a-s2-h" className="a-s2-heading a-title-card">
              Step through the screen.
            </h2>
            <p className="a-s2-copy">
              Nineteen rides across four zones, from a golden carousel to a coaster that glows after dark. Scroll on and walk the park one
              scene at a time.
            </p>
            <dl className="a-stats">
              {STATS.map((s) => (
                <div key={s.label} className="a-stat">
                  <dt className="a-stat-label">
                    {s.label}
                  </dt>
                  <dd className="a-stat-value" aria-label={String(s.value)}>
                    <span className="a-stat-digits" aria-hidden="true">
                      <span className="a-roll">
                        <span>{String(s.value).padStart(2, "0")[0]}</span>
                        {Array.from({ length: 10 }, (_, k) => (
                          <span key={k}>{String((k * 7 + 3) % 10)}</span>
                        ))}
                      </span>
                      <span className="a-roll">
                        <span>{String(s.value).padStart(2, "0")[1]}</span>
                        {Array.from({ length: 10 }, (_, k) => (
                          <span key={k}>{String((k * 3 + 5) % 10)}</span>
                        ))}
                      </span>
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="a-s2-detail">
            <div className="a-s2-detail-frame">
              <AssetSlot slot={slotsA.detail} alt="" sizes="(min-width: 768px) 28vw, 90vw" controlClassName="a-pause" />
            </div>
          </div>
        </div>

        <div className="a-s2-wipe" aria-hidden="true">
          <span className="a-title-card">The attractions</span>
        </div>
      </div>
    </section>
  );
}
