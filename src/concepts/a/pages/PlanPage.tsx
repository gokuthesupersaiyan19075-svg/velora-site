"use client";

import Link from "next/link";
import { useRef } from "react";
import { attractionsIn, faqs, park, tbc, zones } from "@/park/content";
import { fromPrice } from "@/park/tickets";
import { slotsA } from "../slots";
import { ClosingBand } from "./ClosingBand";
import { Faq } from "./Faq";
import { Frame } from "./Frame";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { useReveals } from "./reveal";
import { pageHref, rideHref } from "./site";
import { ThrillLink } from "./ThrillLink";

const RIDES = attractionsIn("wonderverse");
const f = park.facts;

const CHAPTERS = [
  { id: "essentials", label: "The essentials" },
  { id: "getting-here", label: "Getting here" },
  { id: "zones", label: "The park" },
  { id: "accessibility", label: "Accessibility" },
  { id: "questions", label: "Questions" },
];

export function PlanPage() {
  const root = useRef<HTMLDivElement>(null);
  useReveals(root);

  return (
    <PageShell wipe="Plan your visit">
      <PageHero
        slot={slotsA.visit}
        alt="Aerial view of an amusement park at sunset, used as a stand-in image"
        eyebrow="Wonderverse / 04 Plan your visit"
        title="Plan your visit"
        lede="Everything you need before the day: hours, getting here, the zones and the answers to common questions."
      />
      <div ref={root}>
        <nav className="a-chapters" aria-label="On this page">
          <ol className="a-wrap a-chapters-list">
            {CHAPTERS.map((c, i) => (
              <li key={c.id}>
                <a href={`#${c.id}`}>
                  <span className="a-menu-n">{String(i + 1).padStart(2, "0")}</span>
                  {c.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="essentials" className="a-plan a-plan--split" aria-labelledby="essentials-h">
          <div className="a-wrap a-plan-grid">
            <div>
              <h2 id="essentials-h" className="a-plan-h a-title-card" data-reveal="words">
                The essentials
              </h2>
              <dl className="a-facts" data-reveal="fade">
                <Fact label="Location" value={tbc(f.location)} />
                <Fact label="Opening hours" value={tbc(f.openingHours)} />
                <Fact label="Season" value={tbc(f.season)} />
                <Fact label="Phone" value={tbc(f.phone)} />
                <Fact label="Email" value={tbc(f.email)} />
                <Fact label="Ticket prices" value={fromPrice()} />
              </dl>
              <div className="a-s8-actions" data-reveal="fade">
                <Link className="a-btn a-btn--primary" href={pageHref("/tickets")}>
                  Tickets
                </Link>
                <a className="a-btn a-btn--ghost" href="#getting-here">
                  Get directions
                </a>
              </div>
            </div>
            <Frame slot={slotsA.family4} className="a-plan-photo" sizes="(min-width: 960px) 40vw, 100vw" alt="Children riding carousel horses" />
          </div>
        </section>

        <section id="getting-here" className="a-plan" aria-labelledby="getting-here-h">
          <div className="a-wrap">
            <h2 id="getting-here-h" className="a-plan-h a-title-card" data-reveal="words">
              Getting here
            </h2>
            <div className="a-cols" data-reveal="fade">
              <div className="a-col">
                <h3 className="a-col-h">By car</h3>
                <p className="a-col-label">Parking</p>
                <p className="a-col-value">{tbc(f.parking)}</p>
              </div>
              <div className="a-col">
                <h3 className="a-col-h">By public transport</h3>
                <p className="a-col-label">Trains, buses and shuttles</p>
                <p className="a-col-value">{tbc(f.publicTransport)}</p>
              </div>
              <div className="a-col">
                <h3 className="a-col-h">Address</h3>
                <p className="a-col-label">Where to find us</p>
                <p className="a-col-value">{tbc(f.location)}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="zones" className="a-plan a-plan--zones" aria-labelledby="zones-h">
          <div className="a-wrap">
            <h2 id="zones-h" className="a-plan-h a-title-card" data-reveal="words">
              The park at a glance
            </h2>
            <p className="a-plan-lede" data-reveal="fade">
              VELORA is laid out in {zones.length} zones. Each zone is a short walk from the next, and the Main Gate opens onto the Lantern Quarter.
            </p>
            <ol className="a-trail" role="list">
              {zones.map((z, i) => {
                const rides = RIDES.filter((r) => r.zone === z.id);
                return (
                  <li key={z.id} className="a-trail-stop" data-reveal="fade">
                    <span className="a-trail-dot" aria-hidden="true" />
                    <p className="a-eyebrow">Zone {String(i + 1).padStart(2, "0")}</p>
                    <h3 className="a-trail-name">{z.name}</h3>
                    <p className="a-trail-line">{z.line}</p>
                    {rides.length > 0 ? (
                      <ul className="a-pills" role="list" aria-label={`Rides in ${z.name}`}>
                        {rides.map((r) => (
                          <li key={r.slug}>
                            <Link className="a-pill" href={rideHref(r.slug)}>
                              {r.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <ThrillLink className="a-link" to="/thrillverse/attractions">
                        Its rides are in Thrillverse <span aria-hidden="true">&nbsp;→</span>
                      </ThrillLink>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="accessibility" className="a-plan" aria-labelledby="accessibility-h">
          <div className="a-wrap a-access">
            <h2 id="accessibility-h" className="a-plan-h a-title-card" data-reveal="words">
              Accessibility
            </h2>
            <div className="a-access-body" data-reveal="fade">
              <p className="a-plan-lede">
                We want every visitor to enjoy VELORA. Paths are step-free throughout, wheelchairs and pushchairs can be borrowed free at Guest Services, and every ride page lists its access details
                before the park opens.
              </p>
              <p className="a-plan-lede">
                Each ride page lists its accessibility information and height requirement once the park confirms them.{" "}
                <Link className="a-inline" href={pageHref("/attractions")}>
                  Browse the attractions
                </Link>
              </p>
            </div>
          </div>
        </section>

        <section id="questions" className="a-plan a-plan--faq" aria-labelledby="questions-h">
          <div className="a-wrap a-faq-wrap">
            <h2 id="questions-h" className="a-plan-h a-title-card" data-reveal="words">
              Questions
            </h2>
            <Faq items={faqs} />
          </div>
        </section>
      </div>
      <ClosingBand
        title="See you at VELORA"
        body="Book online in under a minute and pay at the gate. Every ticket covers both worlds."
        primary={{ label: "Tickets", href: pageHref("/tickets") }}
        secondary={{ label: "Attractions", href: pageHref("/attractions") }}
      />
    </PageShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="a-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
