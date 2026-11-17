"use client";

import Link from "next/link";
import { useRef } from "react";
import { attractionsIn, tbc, venues, type Venue } from "@/park/content";
import { ClosingBand } from "./ClosingBand";
import { Frame } from "./Frame";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { useReveals } from "./reveal";
import { pageHref, rideHref } from "./site";
import { slotForVenue, slotsPages } from "./slots-pages";

const GROUPS: { kind: Venue["kind"]; title: string; line: string }[] = [
  { kind: "dining", title: "Food and treats", line: "Something warm, something sweet, something to share between rides." },
  { kind: "show", title: "Shows", line: "Performers, music and moments worth stopping for." },
  { kind: "event", title: "Events", line: "The moments the whole park gathers for." },
];

const NIGHT_VENUES = venues.filter((v) => v.night);
const NIGHT_RIDES = attractionsIn("wonderverse").filter((r) => r.night);

export function FoodShowsPage() {
  return (
    <PageShell wipe="Food and shows">
      <PageHero
        slot={slotsPages.foodHero}
        eyebrow="Wonderverse / 03 Food and shows"
        title="Food, shows and the glow after dark"
        lede="Spun sugar, warm plates, a circus under the big top and a night that ends in fireworks."
        actions={
          <a className="a-btn a-btn--ghost" href="#a-after-dark">
            What happens after dark
          </a>
        }
      />
      {GROUPS.map((g) => {
        const list = venues.filter((v) => v.kind === g.kind);
        return list.length ? <VenueGroup key={g.kind} group={g} list={list} /> : null;
      })}
      <AfterDark />
      <ClosingBand
        title="Stay for the lights"
        body="Cirque Aurora plays at 13:00, 16:00 and 19:00, and the After Dark Pass (₹1,499) covers every evening from 17:00."
        primary={{ label: "See ticket types", href: pageHref("/tickets") }}
        secondary={{ label: "Plan your visit", href: pageHref("/plan") }}
      />
    </PageShell>
  );
}

function VenueGroup({ group, list }: { group: (typeof GROUPS)[number]; list: Venue[] }) {
  const root = useRef<HTMLElement>(null);
  useReveals(root);
  return (
    <section ref={root} className="a-venues" data-kind={group.kind} aria-labelledby={`a-venues-${group.kind}`}>
      <div className="a-wrap a-venues-head">
        <h2 id={`a-venues-${group.kind}`} className="a-venues-title a-title-card" data-reveal="words">
          {group.title}
        </h2>
        <p className="a-venues-line" data-reveal="fade">
          {group.line}
        </p>
      </div>
      {list.map((v, i) => (
        <article key={v.slug} id={`venue-${v.slug}`} className={`a-row a-row--${i % 2 ? "right" : "left"} a-venue`} aria-labelledby={`venue-${v.slug}-h`}>
          <div className="a-row-media">
            <Frame slot={slotForVenue(v.slug, v.name)} className="a-row-frame" sizes="(min-width: 768px) 55vw, 100vw" />
          </div>
          <div className="a-row-text">
            {v.night && <p className="a-night-tag a-night-tag--lg">After dark</p>}
            <h3 id={`venue-${v.slug}-h`} className="a-row-title" data-reveal="words">
              {v.name}
            </h3>
            <p className="a-venue-line" data-reveal="fade">
              {v.line}
            </p>
            <p className="a-row-body" data-reveal="fade">
              {v.description}
            </p>
            <dl className="a-mini-facts" data-reveal="fade">
              <div>
                <dt>{v.kind === "dining" ? "Opening times" : "Show times"}</dt>
                <dd>{tbc(v.facts.times)}</dd>
              </div>
              <div>
                <dt>Where</dt>
                <dd>{tbc(v.facts.location)}</dd>
              </div>
            </dl>
          </div>
        </article>
      ))}
    </section>
  );
}

function AfterDark() {
  const root = useRef<HTMLElement>(null);
  useReveals(root);
  return (
    <section ref={root} id="a-after-dark" className="a-dark" aria-labelledby="a-dark-h">
      <div className="a-dark-glow" aria-hidden="true" />
      <div className="a-wrap a-dark-inner">
        <h2 id="a-dark-h" className="a-dark-title" data-reveal="words">
          After dark
        </h2>
        <p className="a-dark-copy" data-reveal="fade">
          When the lights come on, these are the places to be. The parade starts at 20:30 and Night Bloom at 21:30.
        </p>
        <div className="a-dark-cols">
          <div data-reveal="fade">
            <h3 className="a-dark-h3">Food and shows</h3>
            <ul className="a-dark-list" role="list">
              {NIGHT_VENUES.map((v) => (
                <li key={v.slug}>
                  <a href={`#venue-${v.slug}`}>
                    <span className="a-dark-name">{v.name}</span>
                    <span className="a-dark-line">{v.line}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal="fade">
            <h3 className="a-dark-h3">Rides lit at night</h3>
            <ul className="a-dark-list" role="list">
              {NIGHT_RIDES.map((r) => (
                <li key={r.slug}>
                  <Link href={rideHref(r.slug)}>
                    <span className="a-dark-name">{r.name}</span>
                    <span className="a-dark-line">{r.line}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
