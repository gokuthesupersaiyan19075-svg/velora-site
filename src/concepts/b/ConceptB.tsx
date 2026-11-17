"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setPlaybackLimit } from "@/shared/media/playback";
import { BackToHub } from "@/shared/BackToHub";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { gsap, popOnce, ScrollTrigger, useGSAP } from "./gsap";
import { Family } from "./sections/Family";
import { Final } from "./sections/Final";
import { Grid } from "./sections/Grid";
import { Hero } from "./sections/Hero";
import { Night } from "./sections/Night";
import { ParkReveal } from "./sections/ParkReveal";
import { Rides, type RideFilter } from "./sections/Rides";
import { Thrill } from "./sections/Thrill";
import { Visit } from "./sections/Visit";
import { Marquee } from "./ui/Marquee";
import { Nav } from "./ui/Nav";
import { Sheet } from "./ui/Sheet";
import { ThrillSounds } from "./sections/ThrillSounds";
import Link from "next/link";
import { attraction, durationLabel, heightLabel } from "@/park/content";
import { TicketSheetBody } from "./pages/PageShell";

/**
 * Concept B — Thrillverse.
 * The root owns the scroll-velocity engine: it writes --b-vel (0..1) and --b-skew (deg) on the root,
 * and every .b-kin headline stretches its width axis and skews with them.
 */
export function ConceptB() {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<RideFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tickets, setTickets] = useState(false);
  const [ride, setRide] = useState<string | null>(null);

  // One decoding video at a time on every device: measured, two 1080p clips at once dropped desktop
  // scrolling to ~30 fps, one keeps it at 60 (phones already ran one at a time).
  useEffect(() => {
    setPlaybackLimit(1);
    return () => setPlaybackLimit(null);
  }, []);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add(fullMotionQuery(), () => {
        // Smoothed velocity: the raw scroll velocity is noisy (and jumps when smooth scrolling settles),
        // which made the stretched headlines twitch. Each frame the shown value glides toward the target;
        // tiny tremors below DEAD px/s are ignored, and values are written only when they visibly change.
        const DEAD = 180;
        let target = 0;
        let shown = 0;
        let lastVel = "";
        let lastSkew = "";
        let velEls: HTMLElement[] = [];
        let ride: HTMLElement | null = null;
        const tick = () => {
          target *= 0.9; // the push fades out when scrolling stops
          shown += (target - shown) * 0.14;
          if (Math.abs(shown) < 1) shown = 0;
          // The width axis re-shapes the text, so it moves in 0.1 steps (2 width units): far fewer re-layouts, same look.
          const vel = (Math.round(Math.min(1, Math.abs(shown) / 2600) * 5) / 5).toFixed(1);
          const skew = gsap.utils.clamp(-8, 8, shown / -320).toFixed(1);
          // Written only on the two elements that read it (speed gauge, streak lines): a change on the root
          // would re-style the whole page on every step.
          if (vel !== lastVel) {
            lastVel = vel;
            if (!velEls.length) velEls = Array.from(el.querySelectorAll<HTMLElement>(".b-speed-fill, .b-thrill-lines, .b-nav-speed, .b-thrill-words"));
            velEls.forEach((n) => n.style.setProperty("--b-vel", vel));
          }
          // The six ride words (and only they) still stretch and lean with scroll speed, as in the approved design.
          if (skew !== lastSkew) {
            lastSkew = skew;
            if (!ride) ride = el.querySelector<HTMLElement>(".b-thrill-words");
            ride?.style.setProperty("--b-skew", skew);
          }
        };
        // Keep animated elements on stable GPU layers: with the default "auto", GSAP drops each layer when a tween
        // ends and rebuilds it on the next one, which re-layerised the page on almost every scroll frame.
        gsap.config({ force3D: true });
        gsap.ticker.add(tick);
        const stopPop = popOnce(el);
        let lastDir = 1;
        let turnAt = 0;
        const st = ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate(self) {
            const v = self.getVelocity();
            if (Math.abs(v) > DEAD && Math.abs(v) > Math.abs(target)) target = v;
            // corner nav hides on the way down, returns on the way up (only after a real 24px move,
            // so a settling scroll does not flick it in and out)
            const y = self.scroll();
            if (y < 80) {
              el.dataset.navHidden = "false";
              lastDir = -1;
            } else if (self.direction !== lastDir) {
              if (!turnAt) turnAt = y;
              if (Math.abs(y - turnAt) > 24) {
                lastDir = self.direction;
                turnAt = 0;
                el.dataset.navHidden = self.direction === 1 ? "true" : "false";
              }
            } else turnAt = 0;
          },
        });
        // fonts change line lengths: re-measure every trigger once they are in
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
        return () => {
          st.kill();
          stopPop();
          gsap.config({ force3D: "auto" });
          gsap.ticker.remove(tick);
          velEls.forEach((n) => n.style.removeProperty("--b-vel"));
          ride?.style.removeProperty("--b-skew");
          delete el.dataset.navHidden;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const openTickets = useCallback(() => setTickets(true), []);
  const closeTickets = useCallback(() => setTickets(false), []);
  const closeRide = useCallback(() => setRide(null), []);

  const showFamilyRides = () => {
    setFilter("water");
    requestAnimationFrame(() => {
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
      document.getElementById("rides")?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <div ref={root} className="concept-b-root" data-thrill="off">
      <ThrillSounds />
      <a href="#b-main" className="b-skiplink">
        Skip to content
      </a>
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} onTickets={openTickets} />
      <main id="b-main">
        <Hero onTickets={openTickets} />
        <Marquee />
        <ParkReveal />
        <Rides filter={filter} setFilter={setFilter} onOpenRide={setRide} />
        <Thrill />
        <Family onFamilyRides={showFamilyRides} />
        <Grid />
        <Night />
        <Visit onTickets={openTickets} />
      </main>
      <Final onTickets={openTickets} />
      <BackToHub className="b-back" />

      <Sheet open={tickets} onClose={closeTickets} title="Tickets">
        <TicketSheetBody onClose={closeTickets} />
      </Sheet>
      <Sheet open={!!ride} onClose={closeRide} title="Ride details">
        {(() => {
          const a = ride ? attraction(ride) : undefined;
          return (
            <p className="b-sheet-text">
              {a ? `${a.name}. ${a.type}. ${a.description}` : ""}
            </p>
          );
        })()}
        {(() => {
          const a = ride ? attraction(ride) : undefined;
          if (!a) return null;
          return (
            <>
              <dl className="b-sheet-list">
                <div>
                  <dt>Minimum height</dt>
                  <dd>{heightLabel(a.facts.minHeightCm)}</dd>
                </div>
                <div>
                  <dt>Ride time</dt>
                  <dd>{durationLabel(a.facts.durationMin)}</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>{a.facts.accessibility}</dd>
                </div>
              </dl>
              <Link href={`/thrillverse/attractions/${a.slug}`} className="b-btn b-btn--dark" onClick={closeRide}>
                Ride details
              </Link>
            </>
          );
        })()}
      </Sheet>
    </div>
  );
}
