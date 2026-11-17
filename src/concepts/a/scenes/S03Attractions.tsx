"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, ScrollTrigger, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";
import { useUI } from "../ui/context";
import { attraction, durationLabel, heightLabel, intensityLabel, zone } from "@/park/content";
import { rideHref } from "../pages/site";

// Wonderverse attractions (src/park/content.ts, world: "wonderverse").
const RIDES = [
  { slot: slotsA.coaster, ride: attraction("night-comet")! },
  { slot: slotsA.swing, ride: attraction("orbit-flyer")! },
  { slot: slotsA.carousel, ride: attraction("aurelia-carousel")! },
  { slot: slotsA.wheel, ride: attraction("velora-wheel")! },
  { slot: slotsA.water, ride: attraction("lagoon-rapids")! },
];

export function S03Attractions() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const drag = useRef<{ x: number; active: boolean } | null>(null);
  const { openDrawer } = useUI();
  const n = RIDES.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        const progressBar = document.querySelector(".concept-a .a-nav-progress");
        if (c.reduced || c.mobile) {
          st.current = null;
          return;
        }
        const trackEl = track.current!;
        const distance = () => trackEl.scrollWidth - window.innerWidth;
        const move = gsap.to(trackEl, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: q(".a-s3-pin")[0],
            start: "top top",
            end: () => "+=" + (n - 1) * window.innerHeight,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onUpdate(self) {
              const i = Math.round(self.progress * (n - 1));
              if (counter.current) counter.current.textContent = String(i + 1).padStart(2, "0");
              if (progressBar) gsap.set(progressBar, { scaleX: self.progress });
            },
            onToggle(self) {
              if (progressBar) gsap.to(progressBar, { opacity: self.isActive ? 1 : 0, duration: 0.3 });
            },
          },
        });
        st.current = move.scrollTrigger ?? null;

        q(".a-slide").forEach((slide: Element) => {
          const media = slide.querySelector(".a-slide-media");
          const title = slide.querySelector(".a-slide-title");
          const meta = slide.querySelector(".a-slide-meta");
          gsap.fromTo(media, { scale: 1.1 }, { scale: 1, ease: "none", scrollTrigger: { trigger: slide, containerAnimation: move, start: "left right", end: "center center", scrub: true } });
          gsap.fromTo(title, { x: "6vw" }, { x: "-6vw", ease: "none", scrollTrigger: { trigger: slide, containerAnimation: move, start: "left right", end: "right left", scrub: true } });
          const reveal = gsap.timeline({ scrollTrigger: { trigger: slide, containerAnimation: move, start: "left 60%", toggleActions: "play none none reverse" } });
          reveal
            .fromTo(title, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "expo.out" })
            .fromTo(meta, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.25);
        });
      });
    },
    { scope: root },
  );

  function goTo(index: number) {
    const t = st.current;
    const i = Math.max(0, Math.min(n - 1, index));
    if (t) {
      window.scrollTo({ top: t.start + ((t.end - t.start) * i) / (n - 1), behavior: "smooth" });
    } else {
      const slide = track.current?.children[i] as HTMLElement | undefined;
      slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  }

  function currentIndex() {
    const t = st.current;
    if (t) return Math.round(t.progress * (n - 1));
    const el = track.current;
    if (!el) return 0;
    return Math.round(el.scrollLeft / (el.scrollWidth / n));
  }

  /** Phones scroll the track natively (no pin), so the counter follows the slide nearest the middle. */
  function onTrackScroll() {
    const el = track.current;
    if (st.current || !el || !counter.current) return;
    const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const r = (c as HTMLElement).getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    counter.current.textContent = String(best + 1).padStart(2, "0");
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(currentIndex() + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(currentIndex() - 1);
    }
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || !st.current || (e.target as Element).closest("a, button")) return;
    drag.current = { x: e.clientX, active: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d?.active) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    window.scrollBy(0, -dx * (window.innerHeight / window.innerWidth) * 1.4);
  }
  function onUp() {
    if (drag.current) drag.current.active = false;
  }

  return (
    <section id={sceneId("03")} data-scene="03" ref={root} className="a-s3" aria-labelledby="a-s3-h">
      <div className="a-s3-pin">
        <div className="a-wrap a-s3-head">
          <h2 id="a-s3-h" className="a-s3-heading">
            The attractions
          </h2>
          <p className="a-s3-count" aria-hidden="true">
            <span ref={counter}>01</span> / {String(n).padStart(2, "0")}
          </p>
        </div>
        <div
          ref={track}
          className="a-s3-track"
          tabIndex={0}
          role="region"
          aria-roledescription="gallery"
          aria-label="Attractions. Use the left and right arrow keys to move between them."
          data-cursor="drag"
          onKeyDown={onKey}
          onScroll={onTrackScroll}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {RIDES.map((r, i) => (
            <article key={r.slot.id} className="a-slide" aria-label={`Attraction ${i + 1} of ${n}`}>
              <div className="a-slide-frame">
                <div className="a-slide-media">
                  <AssetSlot slot={r.slot} alt="" sizes="(min-width: 768px) 62vw, 85vw" controlClassName="a-pause" cardAuto={r.slot === slotsA.wheel} />
                </div>
              </div>
              <div className="a-slide-copy">
                <h3 className="a-slide-title">{r.ride.name}</h3>
                <div className="a-slide-meta">
                  <p>
                    {r.ride.type}. {r.ride.line}
                  </p>
                  <button
                    type="button"
                    className="a-link"
                    onClick={(e) =>
                      openDrawer(
                        {
                          title: r.ride.name,
                          body: r.ride.description,
                          media: r.slot,
                          facts: [
                            { label: "Type", value: r.ride.type },
                            { label: "Minimum height", value: heightLabel(r.ride.facts.minHeightCm) },
                            { label: "Ride time", value: durationLabel(r.ride.facts.durationMin) },
                            { label: "Intensity", value: intensityLabel(r.ride.facts.intensity) },
                            { label: "Zone", value: zone(r.ride.zone).name },
                            { label: "Access", value: r.ride.facts.accessibility ?? "Ask at the ride entrance" },
                          ],
                          action: { label: "Full ride page", href: rideHref(r.ride.slug) },
                        },
                        e.currentTarget,
                      )
                    }
                  >
                    See this ride
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
