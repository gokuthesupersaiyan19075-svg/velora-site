"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { listTicketTypes, priceLabel } from "@/park/tickets";
import { BookingForm } from "@/shared/booking/BookingForm";
import { slotsA } from "../slots";
import { ClosingBand } from "./ClosingBand";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { useReveals } from "./reveal";
import { pageHref } from "./site";

const TICKETS = listTicketTypes();

/**
 * Ticket types from the shared ticket logic, and the shared booking form (saved in Supabase).
 * Every stub's button picks that ticket in the form; payment is taken at the gate.
 */
export function TicketsPage() {
  const root = useRef<HTMLElement>(null);
  useReveals(root);
  const [ticket, setTicket] = useState(TICKETS[0].slug);
  const book = (slug: string) => {
    setTicket(slug);
    const form = document.getElementById("book");
    form?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    form?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  };

  return (
    <PageShell wipe="Tickets">
      <PageHero
        slot={slotsA.night2}
        eyebrow="Wonderverse / 05 Tickets"
        title="Your ticket into the wonder"
        lede="Choose a ticket, pick your day and book in under a minute. You pay at the gate."
      />
      <section ref={root} className="a-tix" aria-labelledby="a-tix-h">
        <div className="a-wrap">
          <div className="a-tix-status" data-open role="status">
            <span className="a-tix-dot" aria-hidden="true" />
            <div>
              <p className="a-tix-status-h">Tickets are on sale</p>
              <p id="a-tix-status" className="a-tix-status-body">
                Open daily 10:00 to 22:00. Every ticket covers both worlds, and children under 3 go free.
              </p>
            </div>
          </div>

          <h2 id="a-tix-h" className="a-plan-h a-title-card" data-reveal="words">
            Ticket types
          </h2>
          <ul className="a-tix-grid" role="list">
            {TICKETS.map((t, i) => (
              <li key={t.slug} className="a-stub" data-reveal="fade">
                <div className="a-stub-top">
                  <p className="a-stub-n">No. {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="a-stub-name">{t.name}</h3>
                  <p className="a-stub-line">{t.line}</p>
                </div>
                <div className="a-stub-perf" aria-hidden="true" />
                <div className="a-stub-bottom">
                  <p className="a-stub-label">Includes</p>
                  <ul className="a-stub-list">
                    {t.includes.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <p className="a-stub-price">
                    <span className="a-stub-label">Price</span>
                    <span>{priceLabel(t)}</span>
                  </p>
                  <button type="button" className="a-btn a-btn--primary a-stub-btn" onClick={() => book(t.slug)} aria-controls="book">
                    Book {t.name}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div id="book" className="a-book-wrap" data-reveal="fade" aria-labelledby="a-book-h" role="region">
            <h2 id="a-book-h" className="a-plan-h">
              Book your visit
            </h2>
            <BookingForm world="wonderverse" prefix="a" ticket={ticket} onTicketChange={setTicket} />
          </div>

          <div className="a-tix-notes" data-reveal="fade">
            <p>Booking is free and payment is taken at the gate. Day and Family Passes are valid on the date booked; the Season Pass starts on your first visit.</p>
            <p>
              Questions about opening times, heights or access? <Link className="a-inline" href={`${pageHref("/plan")}#questions`}>See the questions</Link>
            </p>
          </div>
        </div>
      </section>
      <ClosingBand
        title="Plan the day around the lights"
        body="See what is on in the Lantern Quarter after sunset, from the night market to Night Bloom."
        primary={{ label: "Food and shows", href: pageHref("/food-and-shows") }}
        secondary={{ label: "Plan your visit", href: pageHref("/plan") }}
      />
    </PageShell>
  );
}
