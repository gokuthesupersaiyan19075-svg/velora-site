"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { attractionsIn, categoryLabel, zones, type AttractionCategory } from "@/park/content";
import { slotsA } from "../slots";
import { AttractionCard } from "./AttractionCard";
import { ClosingBand } from "./ClosingBand";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { useReveals } from "./reveal";
import { pageHref } from "./site";
import { ThrillLink } from "./ThrillLink";

const RIDES = attractionsIn("wonderverse");
const CATEGORIES = (Object.keys(categoryLabel) as AttractionCategory[]).filter((c) => RIDES.some((r) => r.category === c));
// Day into night: zones that hold Wonderverse rides, in park order, ending in the Lantern Quarter.
const ZONES = zones.filter((z) => RIDES.some((r) => r.zone === z.id));
const ELSEWHERE = zones.filter((z) => !RIDES.some((r) => r.zone === z.id));

type Filter = AttractionCategory | "all";

export function AttractionsPage() {
  return (
    <PageShell wipe="The attractions">
      <PageHero
        slot={slotsA.dusk}
        eyebrow="Wonderverse / 02 Attractions"
        title="Every ride in the wonder"
        lede="Golden carousels, a wheel above the lights, gentle water and a coaster that glows after sunset. Choose a ride to see what it is like."
      />
      <AttractionsList />
      <ClosingBand
        title="Make a day of it"
        body="Open daily 10:00 to 22:00. Plan your visit for heights, hours and getting here."
        primary={{ label: "Plan your visit", href: pageHref("/plan") }}
        secondary={{ label: "Tickets", href: pageHref("/tickets") }}
      />
    </PageShell>
  );
}

function AttractionsList() {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  // Filtering moves sections: rebuild the reveals against the new layout.
  useReveals(root, [filter]);
  const shown = RIDES.filter((r) => filter === "all" || r.category === filter);
  const label = filter === "all" ? "" : `${categoryLabel[filter].toLowerCase()} `;

  return (
    <div ref={root} className="a-attr">
      <div className="a-filter-bar">
        <div className="a-wrap a-filter-row">
          <div className="a-chips" role="group" aria-label="Filter attractions by type">
            {(["all", ...CATEGORIES] as Filter[]).map((c) => (
              <button key={c} type="button" className="a-chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
                {c === "all" ? "All" : categoryLabel[c]}
              </button>
            ))}
          </div>
          <p className="a-filter-count" role="status" aria-live="polite">
            {shown.length} {label}
            {shown.length === 1 ? "attraction" : "attractions"}
          </p>
        </div>
      </div>

      {ZONES.map((z) => {
        const rides = shown.filter((r) => r.zone === z.id);
        if (!rides.length) return null;
        const n = String(zones.indexOf(z) + 1).padStart(2, "0");
        return (
          <section key={z.id} className="a-zone" aria-labelledby={`a-zone-${z.id}`} data-zone={z.id}>
            <div className="a-wrap a-zone-grid">
              <header className="a-zone-head">
                <p className="a-eyebrow">Zone {n}</p>
                <h2 id={`a-zone-${z.id}`} className="a-zone-name a-title-card" data-reveal="words">
                  {z.name}
                </h2>
                <p className="a-zone-line" data-reveal="fade">
                  {z.line}
                </p>
              </header>
              <ul className="a-cards" role="list">
                <AnimatePresence mode="popLayout" initial={false}>
                  {rides.map((r, i) => (
                    <AttractionCard key={r.slug} ride={r} index={i} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </section>
        );
      })}

      {ELSEWHERE.length > 0 && (
        <aside className="a-wrap a-elsewhere" aria-label="More rides in Thrillverse">
          {ELSEWHERE.map((z) => (
            <p key={z.id} className="a-elsewhere-q">
              <span className="a-elsewhere-name">{z.name}.</span> {z.line} Its rides live in Thrillverse.
            </p>
          ))}
          <ThrillLink className="a-btn a-btn--ghost a-btn--small" to="/thrillverse/attractions">
            See Thrillverse rides <span aria-hidden="true">→</span>
          </ThrillLink>
        </aside>
      )}

      <p className="a-wrap a-attr-note">
        Every ride page lists its minimum height, ride time and access details. <Link href={pageHref("/plan")}>Plan your visit</Link>
      </p>
    </div>
  );
}
