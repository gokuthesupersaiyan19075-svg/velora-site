"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { useSound } from "@/shared/sound/useSound";
import { pageHref } from "./FooterNav";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { RideBand } from "./RideBand";
import { RIDE_FILTERS, TAG_LABEL, thrillRides, type RideFilterId, type ThrillRide } from "./rides";
import { slotsPages } from "./slots-pages";

const RIDES = thrillRides();

/** Every Thrillverse attraction, filterable, each row opening its own page. */
export function AttractionsPage() {
  const [filter, setFilter] = useState<RideFilterId>("all");
  const reduced = useReducedMotion();
  const { tick } = useSound();
  const visible = RIDES.filter((r) => filter === "all" || r.tag === filter);

  const choose = (f: RideFilterId) => {
    if (f === filter) return;
    setFilter(f);
    tick();
  };

  return (
    <PageShell slots={[slotsPages.attractionsHero, ...RIDES.map((r) => r.slot)]} next={{ href: pageHref("/food-and-shows"), label: "Food and shows" }}>
      <PageHero
        id="b-attr-h"
        eyebrow="Attractions"
        lines={["Every", "ride."]}
        label="Attractions: every ride in Thrillverse"
        sub="Coasters, drops, white water and adventure. Every ride lists its minimum height and ride time."
        slot={slotsPages.attractionsHero}
      >
        <a href="#b-ride-list" className="b-btn b-btn--ghost">
          Jump to the list
        </a>
      </PageHero>
      <RideBand />

      <section id="b-ride-list" className="b-plist" aria-labelledby="b-plist-h">
        <div className="b-plist-head">
          <h2 id="b-plist-h" className="b-plist-title b-kin">
            Pick your rush
          </h2>
          <div className="b-chips" role="group" aria-label="Filter rides">
            <LayoutGroup id="b-pchips">
              {RIDE_FILTERS.map((f) => (
                <button key={f.id} type="button" className="b-chip" aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
                  {filter === f.id && <motion.span layoutId="b-pchip-bg" className="b-chip-bg" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                  <span className="b-chip-label">{f.label}</span>
                </button>
              ))}
            </LayoutGroup>
          </div>
        </div>
        <p className="b-plist-count" role="status">
          {visible.length} {visible.length === 1 ? "ride" : "rides"} shown
        </p>

        <ul className="b-plist-items">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((r, i) => (
              <RideRow key={r.ride.slug} r={r} index={i} reduced={reduced} />
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </PageShell>
  );
}

function RideRow({ r, index, reduced }: { r: ThrillRide; index: number; reduced: boolean }) {
  const [hot, setHot] = useState(false);
  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, x: index % 2 ? 80 : -80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: index % 2 ? -80 : 80, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="b-prow"
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
      onFocusCapture={() => setHot(true)}
      onBlurCapture={() => setHot(false)}
    >
      <Link href={r.href} className="b-prow-link">
        <span className="b-prow-num" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="b-prow-meta">
          <span className="b-ride-tag">{TAG_LABEL[r.tag]}</span>
          <span className="b-prow-name b-kin">{r.ride.name}</span>
          <span className="b-prow-type">
            {r.ride.type} · {r.zoneName}
          </span>
          <span className="b-prow-line">{r.ride.line}</span>
          <span className="b-prow-go">
            Ride details
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M3 12h15M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
            </svg>
          </span>
        </div>
        <div className="b-prow-media">
          <AssetSlot slot={r.slot} playback={hot ? "auto" : "still"} playbackPriority={5} pauseControl={false} placeholderClassName="b-ph" sizes="(min-width: 900px) 36vw, 100vw" alt="" />
        </div>
      </Link>
    </motion.li>
  );
}
