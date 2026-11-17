"use client";

import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, revealWords, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";
import { useUI, type DrawerItem } from "../ui/context";
import { attraction, durationLabel, heightLabel, venue } from "@/park/content";
import { slotForRide, slotForVenue } from "../pages/slots-pages";

const ROWS = [
  {
    slot: slotsA.food,
    title: "Food and treats",
    body: "Something warm, something sweet, something to share on a bench between rides. Candy Lane is open 10:00 to 22:00, Midway Kitchen 11:00 to 21:00.",
    link: "See food options",
    layout: "left",
    action: { label: "Food and shows", href: "/wonderverse/food-and-shows" },
    items: () => venueItems(["candy-lane", "midway-kitchen", "lantern-night-market"]),
  },
  {
    slot: slotsA.shows,
    title: "Shows",
    body: "Performers, music and moments worth stopping for. Cirque Aurora plays three times a day and the Parade of Lights starts at 20:30.",
    link: "See show times",
    layout: "right",
    action: { label: "Food and shows", href: "/wonderverse/food-and-shows" },
    items: () => venueItems(["cirque-aurora", "parade-of-lights", "night-bloom"]),
  },
  {
    slot: slotsA.water2,
    title: "Water",
    body: "Slides, splashes and somewhere to cool off on a hot afternoon. Lagoon Rapids, Cascade Slides and Wave Cove are all in Splash Lagoon.",
    link: "See water rides",
    layout: "full",
    action: { label: "All attractions", href: "/wonderverse/attractions" },
    items: () => rideItems(["lagoon-rapids", "cascade-slides", "wave-cove"]),
  },
] as const;

/** Each place with its own picture, times and location (all from src/park/content.ts). */
function venueItems(slugs: string[]): DrawerItem[] {
  return slugs.flatMap((slug) => {
    const v = venue(slug);
    if (!v) return [];
    return [{ slot: slotForVenue(v.slug, v.name), title: v.name, meta: [v.facts.times, v.facts.location].filter(Boolean).join(" · "), body: v.description }];
  });
}
function rideItems(slugs: string[]): DrawerItem[] {
  return slugs.flatMap((slug) => {
    const a = attraction(slug);
    if (!a) return [];
    return [{ slot: slotForRide(a.slug, a.name), title: a.name, meta: `${heightLabel(a.facts.minHeightCm)} · ${durationLabel(a.facts.durationMin)}`, body: a.description }];
  });
}

export function S06Beyond() {
  const root = useRef<HTMLElement>(null);
  const { openDrawer } = useUI();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        const q = gsap.utils.selector(root);
        if (c.reduced) return;
        revealWords(q(".a-s6-heading")[0]);
        q(".a-row").forEach((row: Element) => {
          revealWords(row.querySelector(".a-row-title"), { trigger: row, start: "top 70%" });
          gsap.from(row.querySelectorAll(".a-row-body, .a-row-link"), {
            opacity: 0,
            y: 12,
            duration: 0.8,
            delay: 0.4,
            stagger: 0.08,
            scrollTrigger: { trigger: row, start: "top 70%", once: true },
          });
          const frame = row.querySelector(".a-row-frame");
          const full = row.classList.contains("a-row--full");
          if (c.desktop && !full) {
            // The shot widens from 70% to the full column as it scrolls in.
            gsap.fromTo(
              frame,
              { clipPath: "inset(0 15% 0 15%)" },
              { clipPath: "inset(0 0% 0 0%)", ease: "none", scrollTrigger: { trigger: row, start: "top 90%", end: "center center", scrub: 1 } },
            );
          } else {
            gsap.fromTo(
              frame,
              { clipPath: full ? "inset(8% 8% 8% 8%)" : "inset(100% 0 0 0)" },
              full
                ? { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "top top", scrub: 1 } }
                : { clipPath: "inset(0% 0 0 0)", duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: row, start: "top 80%", once: true } },
            );
          }
        });
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("06")} data-scene="06" ref={root} className="a-s6" aria-labelledby="a-s6-h">
      <div className="a-wrap a-s6-head">
        <h2 id="a-s6-h" className="a-s6-heading a-title-card">
          Beyond the rides
        </h2>
      </div>
      {ROWS.map((r) => (
        <article key={r.slot.id} className={`a-row a-row--${r.layout}`}>
          <div className="a-row-media">
            <div className="a-row-frame" data-cursor="video">
              <AssetSlot slot={r.slot} alt="" sizes={r.layout === "full" ? "100vw" : "(min-width: 768px) 55vw, 100vw"} controlClassName="a-pause" />
            </div>
          </div>
          <div className="a-row-text">
            <h3 className="a-row-title">{r.title}</h3>
            <p className="a-row-body">{r.body}</p>
            <button
              type="button"
              className="a-link a-row-link"
              onClick={(e) => openDrawer({ title: r.title, body: r.body, items: r.items(), action: r.action }, e.currentTarget)}
            >
              {r.link}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
