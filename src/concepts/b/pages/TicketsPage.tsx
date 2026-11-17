"use client";

import { LayoutGroup, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { listTicketTypes, priceLabel } from "@/park/tickets";
import { BookingForm } from "@/shared/booking/BookingForm";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { useSound } from "@/shared/sound/useSound";
import { HoldToLaunch } from "../ui/HoldToLaunch";
import { pageHref } from "./FooterNav";
import { PageHero } from "./PageHero";
import { PageShell } from "./PageShell";
import { slotsPages } from "./slots-pages";

const TYPES = listTicketTypes();

/**
 * Ticket types from the shared ticket logic. Launching opens the booking form (shared BookingForm,
 * saved in Supabase) with the chosen pass; payment is taken at the gate.
 */
export function TicketsPage() {
  const [chosen, setChosen] = useState(TYPES[0]?.slug ?? "");
  const [launched, setLaunched] = useState(false);
  const result = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { tick } = useSound();
  const pick = TYPES.find((t) => t.slug === chosen);

  const launch = useCallback(() => {
    setLaunched(true);
    requestAnimationFrame(() => {
      result.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      result.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }, [reduced]);

  const choose = (slug: string) => {
    if (slug === chosen) return;
    setChosen(slug);
    tick();
  };

  return (
    <PageShell slots={[slotsPages.ticketsHero]} next={{ href: pageHref("/attractions"), label: "See the rides" }} ticketsOverride={launch}>
      <PageHero
        id="b-tix-h"
        eyebrow="Tickets"
        lines={["Your", "ticket."]}
        label="Tickets"
        sub="Pick a pass, choose your day and book in under a minute. Pay at the gate."
        slot={slotsPages.ticketsHero}
      >
        <a href="#b-tix-types" className="b-btn b-btn--ghost">
          See ticket types
        </a>
      </PageHero>

      <section id="b-tix-types" className="b-ptix" aria-labelledby="b-tix-types-h">
        <div className="b-ptix-head">
          <h2 id="b-tix-types-h" className="b-plist-title b-kin">
            Pick a pass
          </h2>
          <p className="b-ptix-note">
            Every pass covers both worlds. Children under 3 go free; no payment online.
          </p>
        </div>

        <div className="b-ptix-grid" role="radiogroup" aria-label="Ticket type">
          <LayoutGroup id="b-ptix">
            {TYPES.map((t, i) => {
              const on = t.slug === chosen;
              return (
                <button
                  key={t.slug}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className="b-ptix-card"
                  data-on={on}
                  data-reveal
                  onClick={() => choose(t.slug)}
                  onKeyDown={(e) => {
                    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                    if (!step) return;
                    e.preventDefault();
                    const nextT = TYPES[(i + step + TYPES.length) % TYPES.length];
                    choose(nextT.slug);
                    (e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(".b-ptix-card")[(i + step + TYPES.length) % TYPES.length])?.focus();
                  }}
                >
                  {on && <motion.span layoutId="b-ptix-bg" className="b-ptix-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} aria-hidden="true" />}
                  <span className="b-ptix-num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="b-ptix-name b-kin">{t.name}</span>
                  <span className="b-ptix-line">{t.line}</span>
                  <span className="b-ptix-incl">
                    {t.includes.map((x) => (
                      <span key={x}>{x}</span>
                    ))}
                  </span>
                  <span className="b-ptix-price">{priceLabel(t)}</span>
                </button>
              );
            })}
          </LayoutGroup>
        </div>

        <div className="b-ptix-go">
          <HoldToLaunch label={pick ? `Continue with ${pick.name}` : "Continue"} onLaunch={launch} />
          <p className="b-ptix-go-note">Press, or hold to launch. Nothing is charged online: you pay at the gate.</p>
        </div>

        <div ref={result} id="book" className="b-ptix-result" data-on={launched}>
          {launched && (
            <>
              <p className="b-ptix-result-tag">Book your day</p>
              <BookingForm world="thrillverse" prefix="b" ticket={chosen} onTicketChange={setChosen} />
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
