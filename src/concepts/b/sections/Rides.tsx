"use client";

import { LayoutGroup, motion } from "motion/react";
import { useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import type { MediaSlot } from "@/shared/media/types";
import { fullMotionQuery, useReducedMotion } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, ScrollTrigger, useGSAP, type Conditions } from "../gsap";
import { slotsB } from "../slots";
import { getSoundEngine } from "@/shared/sound/engine";
import { getLenis } from "@/experiences/ExperienceShell";
import { attraction, type Attraction } from "@/park/content";

export type RideFilter = "all" | "coaster" | "thrill" | "water";

// Thrillverse attractions (src/park/content.ts, world: "thrillverse").
const RIDES: { slot: MediaSlot; tag: Exclude<RideFilter, "all">; ride: Attraction }[] = [
  { slot: slotsB.rideCoaster, tag: "coaster", ride: attraction("skyline-serpent")! },
  { slot: slotsB.rideSwing, tag: "thrill", ride: attraction("tempest")! },
  { slot: slotsB.rideSpin, tag: "thrill", ride: attraction("vortex")! },
  { slot: slotsB.rideCarousel, tag: "coaster", ride: attraction("velocity-ridge")! },
  { slot: slotsB.rideBumper, tag: "thrill", ride: attraction("starfall-tower")! },
  { slot: slotsB.rideSplash, tag: "water", ride: attraction("riptide-rapids")! },
  { slot: slotsB.rideSlides, tag: "water", ride: attraction("freefall-flume")! },
];

const TAG_LABEL = { coaster: "Coaster", thrill: "Thrill", water: "Extreme water" } as const;
const FILTERS: { id: RideFilter; label: string }[] = [
  { id: "all", label: "All rides" },
  { id: "coaster", label: "Coasters" },
  { id: "thrill", label: "Thrill" },
  { id: "water", label: "Extreme water" },
];

/** Scene 03: filterable horizontal ride gallery, pinned on desktop, scroll-snap on mobile. */
export function Rides({ filter, setFilter, onOpenRide }: { filter: RideFilter; setFilter: (f: RideFilter) => void; onOpenRide: (name: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const visible = RIDES.filter((r) => filter === "all" || r.tag === filter);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const { desktop } = ctx.conditions as Conditions;
        if (!desktop) return;
        const el = root.current!;
        el.dataset.mode = "pin";
        const distance = () => Math.max(0, track.current!.scrollWidth - window.innerWidth);
        const move = gsap.to(track.current, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: true,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => el.style.setProperty("--b-progress", self.progress.toFixed(3)),
          },
        });
        // alternate entries + brightness as panels approach the centre
        gsap.utils.toArray<HTMLElement>(".b-ride", el).forEach((panel, i) => {
          const media = panel.querySelector(".b-ride-media");
          gsap.fromTo(
            media,
            { yPercent: i % 2 ? -15 : 15, clipPath: i % 2 ? "polygon(0 0, 100% 0, 100% 0, 0 0)" : "polygon(0 100%, 100% 100%, 100% 100%, 0 100%)" },
            {
              yPercent: 0,
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
              ease: "power3.out",
              scrollTrigger: { trigger: panel, containerAnimation: move, start: "left 95%", end: "left 55%", scrub: true },
            },
          );
          gsap.fromTo(
            panel,
            { "--b-bright": 0.6 },
            {
              "--b-bright": 1,
              ease: "none",
              scrollTrigger: { trigger: panel, containerAnimation: move, start: "left right", end: "center center", scrub: true },
            },
          );
        });
        return () => {
          delete el.dataset.mode;
          el.style.removeProperty("--b-progress");
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [filter], revertOnUpdate: true },
  );

  const choose = (f: RideFilter) => {
    getSoundEngine().tick({ volume: 0.2 });
    setFilter(f);
    // Bring the track back to its first card: filtering while partway along shortened the track under the
    // visitor, who then saw only the end panel and thought nothing had happened.
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      const el = root.current;
      if (!el) return;
      // While pinned the section sits at the top of the screen, so use the pin's own start position.
      const pin = ScrollTrigger.getAll().find((t) => t.trigger === el && t.pin);
      const top = pin ? pin.start : el.getBoundingClientRect().top + window.scrollY;
      if (Math.abs(window.scrollY - top) < 4) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(top, { duration: reduced ? 0 : 0.9 });
      else window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    });
  };

  return (
    <section id="rides" ref={root} className="b-rides" aria-labelledby="b-rides-h">
      <div className="b-rides-head">
        <h2 id="b-rides-h" className="b-rides-title b-kin">
          Pick your ride
        </h2>
        <div className="b-chips" role="group" aria-label="Filter rides">
          <LayoutGroup id="b-chips">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="b-chip" aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
                {filter === f.id && <motion.span layoutId="b-chip-bg" className="b-chip-bg" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className="b-chip-label">{f.label}</span>
              </button>
            ))}
          </LayoutGroup>
        </div>
      </div>

      <ul ref={track} className="b-track" aria-label={`${visible.length} rides shown`}>
        {visible.map((r, i) => (
          <RidePanel key={r.slot.id} ride={r} index={i} reduced={reduced} onOpen={onOpenRide} />
        ))}
        <li className="b-ride b-ride--ready" aria-hidden="true">
          <span className="b-ready-word b-kin">Ready?</span>
        </li>
      </ul>
      <div className="b-rides-progress" aria-hidden="true" />
    </section>
  );
}

function RidePanel({
  ride,
  index,
  reduced,
  onOpen,
}: {
  ride: (typeof RIDES)[number];
  index: number;
  reduced: boolean;
  onOpen: (name: string) => void;
}) {
  const [hot, setHot] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  const tilt = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== "mouse" || !card.current) return;
    const r = card.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(card.current, { rotateY: x * 12, rotateX: -y * 12, duration: 0.4, ease: "power2.out" });
  };
  const untilt = () => {
    setHot(false);
    if (card.current) gsap.to(card.current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
  };

  return (
    <motion.li
      layout={!reduced}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={`b-ride b-ride--${index % 2 ? "even" : "odd"}`}
      onPointerEnter={() => setHot(true)}
      onPointerMove={tilt}
      onPointerLeave={untilt}
      onFocusCapture={() => setHot(true)}
      onBlurCapture={() => setHot(false)}
    >
      <div ref={card} className="b-ride-card">
        <div className="b-ride-media">
          <AssetSlot slot={ride.slot} playback="auto" cardAuto maxSeconds={10} playbackPriority={hot ? 5 : 1} controlClassName="b-pause" placeholderClassName="b-ph" sizes="(min-width: 768px) 60vw, 80vw" />
        </div>
        <div className="b-ride-meta">
          <span className="b-ride-tag">{TAG_LABEL[ride.tag]}</span>
          <h3 className="b-ride-name b-kin">{ride.ride.name}</h3>
          <button type="button" className="b-ride-open" onClick={() => onOpen(ride.ride.slug)}>
            See ride details
          </button>
        </div>
      </div>
    </motion.li>
  );
}
