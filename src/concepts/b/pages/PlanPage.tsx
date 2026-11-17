"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { faqs, heightLabel, park, tbc, type Faq } from "@/park/content";
import { useSound } from "@/shared/sound/useSound";
import { pageHref } from "./FooterNav";
import { PageHero } from "./PageHero";
import { PageShell, ShellLaunch } from "./PageShell";
import { thrillRides } from "./rides";
import { slotsPages } from "./slots-pages";

const RIDES = thrillRides();
const FACTS: { k: string; v: string | null }[] = [
  { k: "Opening hours", v: park.facts.openingHours },
  { k: "Season", v: park.facts.season },
  { k: "Location", v: park.facts.location },
  { k: "Public transport", v: park.facts.publicTransport },
  { k: "Parking", v: park.facts.parking },
  { k: "Contact", v: `${park.facts.phone} · ${park.facts.email}` },
];

/** Plan your visit: the practical page. The volume drops like the home Visit scene. */
export function PlanPage() {
  return (
    <PageShell slots={[slotsPages.planHero]} next={{ href: pageHref("/tickets"), label: "Tickets" }}>
      <PageHero
        id="b-plan-h"
        eyebrow="Plan your visit"
        lines={["Plan", "the", "rush."]}
        label="Plan your visit"
        sub="Hours, getting here and rider requirements, all in one place."
        slot={slotsPages.planHero}
      >
        <a href="#b-faq" className="b-btn b-btn--ghost">
          Questions
        </a>
      </PageHero>

      <section className="b-visit b-pplan" aria-labelledby="b-plan-facts-h">
        <div className="b-visit-inner">
          <h2 id="b-plan-facts-h" className="b-visit-title b-kin">
            The basics
          </h2>
          <dl className="b-visit-facts" data-reveal>
            {FACTS.map((f) => (
              <div key={f.k}>
                <dt>{f.k}</dt>
                <dd>{tbc(f.v)}</dd>
              </div>
            ))}
          </dl>
          <div className="b-visit-actions" data-reveal>
            <ShellLaunch variant="dark" label="Get tickets" />
            <a href={`tel:${park.facts.phone!.replace(/[^\d+]/g, "")}`} className="b-btn b-btn--outline">
              Call the park
            </a>
          </div>

          <div className="b-preq" data-reveal>
            <div className="b-preq-head">
              <h2 className="b-faq-title">Rider requirements</h2>
              <p>
                Some rides have height requirements for safety. Riders are measured at each ride entrance.
                Always follow the signs and staff at each ride.
              </p>
            </div>
            <table className="b-preq-table">
              <caption className="b-visually-hidden">Height requirement for each Thrillverse ride</caption>
              <thead>
                <tr>
                  <th scope="col">Ride</th>
                  <th scope="col">Minimum height</th>
                </tr>
              </thead>
              <tbody>
                {RIDES.map((r) => (
                  <tr key={r.ride.slug}>
                    <th scope="row">
                      <Link href={r.href}>{r.ride.name}</Link>
                    </th>
                    <td>{heightLabel(r.ride.facts.minHeightCm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div id="b-faq" className="b-faq" data-reveal>
            <h2 className="b-faq-title">Questions</h2>
            <ul>
              {faqs.map((f) => (
                <FaqItem key={f.q} f={f} />
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function FaqItem({ f }: { f: Faq }) {
  const [open, setOpen] = useState(false);
  const { tick } = useSound();
  const id = useId();
  return (
    <li className="b-faq-item" data-open={open}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            setOpen(!open);
            tick({ volume: 0.4 });
          }}
        >
          <span>{f.q}</span>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </h3>
      <div id={id} className="b-faq-panel">
        <div>
          <p>{f.a}</p>
        </div>
      </div>
    </li>
  );
}
