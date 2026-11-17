"use client";

import Link from "next/link";
import { useRef } from "react";
import { attractionsIn, categoryLabel, durationLabel, tbc, zone, type Attraction } from "@/park/content";
import { AttractionCard } from "./AttractionCard";
import { ClosingBand } from "./ClosingBand";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { useReveals } from "./reveal";
import { pageHref, rideHref } from "./site";
import { slotForRide } from "./slots-pages";

const RIDES = attractionsIn("wonderverse");
const unit = (v: number | null, u: string) => (v === null ? tbc(v) : `${v} ${u}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AttractionDetail({ ride }: { ride: Attraction }) {
  const z = zone(ride.zone);
  const related = RIDES.filter((r) => r.zone === ride.zone && r.slug !== ride.slug);
  const next = RIDES[(RIDES.findIndex((r) => r.slug === ride.slug) + 1) % RIDES.length];

  return (
    <PageShell wipe={ride.name}>
      <PageHero
        slot={slotForRide(ride.slug, ride.name)}
        back={
          <Link href={pageHref("/attractions")} className="a-link a-back-link">
            <span aria-hidden="true">←</span>&nbsp;All attractions
          </Link>
        }
        eyebrow={`${z.name} / ${categoryLabel[ride.category]}`}
        title={ride.name}
        lede={`${ride.type}. ${ride.line}`}
      />
      <RideBody ride={ride} zoneName={z.name} />
      {related.length > 0 && <Related rides={related} zoneName={z.name} />}
      {next && next.slug !== ride.slug && (
        <nav className="a-next" aria-label="Next attraction">
          <Link href={rideHref(next.slug)} className="a-wrap a-next-link">
            <span className="a-eyebrow">Next ride</span>
            <span className="a-next-name a-title-card">
              {next.name} <span className="a-arrow" aria-hidden="true">→</span>
            </span>
          </Link>
        </nav>
      )}
      <ClosingBand
        title="Ride it for real"
        body="Open daily 10:00 to 22:00. Book a Day Pass from ₹2,499 and pay at the gate."
        primary={{ label: "Tickets", href: pageHref("/tickets") }}
        secondary={{ label: "Plan your visit", href: pageHref("/plan") }}
      />
    </PageShell>
  );
}

function RideBody({ ride, zoneName }: { ride: Attraction; zoneName: string }) {
  const root = useRef<HTMLElement>(null);
  useReveals(root);
  const f = ride.facts;
  const facts = [
    { label: "Minimum height", value: f.minHeightCm === null ? "No minimum height" : unit(f.minHeightCm, "cm") },
    { label: "Ride time", value: durationLabel(f.durationMin) },
    { label: "Intensity", value: f.intensity ? cap(f.intensity) : tbc(null) },
    { label: "Accessibility", value: tbc(f.accessibility) },
    { label: "Zone", value: zoneName },
    ...(ride.night ? [{ label: "Best time", value: "After dark, when it is lit" }] : []),
  ];

  return (
    <section ref={root} className="a-ride" aria-labelledby="a-ride-h">
      <div className="a-wrap a-ride-grid">
        <div className="a-ride-text">
          <h2 id="a-ride-h" className="a-eyebrow">
            About the ride
          </h2>
          <p className="a-ride-desc" data-reveal="fade">
            {ride.description}
          </p>
          <div className="a-ride-actions" data-reveal="fade">
            <Link className="a-btn a-btn--primary" href={pageHref("/tickets")}>
              Tickets
            </Link>
            <Link className="a-btn a-btn--ghost" href={pageHref("/plan")}>
              Plan your visit
            </Link>
          </div>
        </div>
        <div className="a-ride-facts" data-reveal="fade">
          <h3 className="a-ride-facts-h">Ride facts</h3>
          <dl className="a-facts a-facts--stack">
            {facts.map((x) => (
              <div key={x.label} className="a-fact" data-tbc={x.value === tbc(null) || undefined}>
                <dt>{x.label}</dt>
                <dd>{x.value}</dd>
              </div>
            ))}
          </dl>
          <p className="a-ride-note">Riders are measured at the entrance. Children below the minimum height can watch from the family viewing areas.</p>
        </div>
      </div>
    </section>
  );
}

function Related({ rides, zoneName }: { rides: Attraction[]; zoneName: string }) {
  const root = useRef<HTMLElement>(null);
  useReveals(root);
  return (
    <section ref={root} className="a-related" aria-labelledby="a-related-h">
      <div className="a-wrap">
        <h2 id="a-related-h" className="a-related-h a-title-card" data-reveal="words">
          More in {zoneName}
        </h2>
        <ul className="a-cards a-cards--row" role="list">
          {rides.map((r, i) => (
            <AttractionCard key={r.slug} ride={r} index={i} />
          ))}
        </ul>
      </div>
    </section>
  );
}
