"use client";

import { useId, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { slotsB } from "../slots";
import { HoldToLaunch } from "../ui/HoldToLaunch";
import Link from "next/link";
import { faqs, park } from "@/park/content";

// Shared answers (content.ts), so both worlds always say the same thing.
const FAQ = faqs.slice(0, 8);

/** Scene 08: lower the volume. Clear information, no scroll effects. */
export function Visit({ onTickets }: { onTickets: () => void }) {
  return (
    <section id="visit" className="b-visit" aria-labelledby="b-visit-h">
      <div className="b-visit-inner">
        <div className="b-visit-top">
          <h2 id="b-visit-h" className="b-visit-title b-kin">
            Plan your visit
          </h2>
          <div className="b-visit-photo">
            <AssetSlot slot={slotsB.visit} placeholderClassName="b-ph b-ph--light" sizes="(min-width: 768px) 40vw, 100vw" />
          </div>
        </div>

        <dl className="b-visit-facts">
          <div>
            <dt>Opening hours</dt>
            <dd>{park.facts.openingHours}</dd>
          </div>
          <div>
            <dt>Tickets and prices</dt>
            <dd>Day Pass ₹2,499 · Family Pass ₹7,999 · After Dark ₹1,499</dd>
          </div>
          <div>
            <dt>Getting here</dt>
            <dd>{park.facts.location}. Free shuttle every 15 minutes from Novara Central.</dd>
          </div>
        </dl>

        <div className="b-visit-actions">
          <HoldToLaunch onLaunch={onTickets} variant="dark" />
          <Link href="/thrillverse/plan" className="b-btn b-btn--outline">
            Get directions
          </Link>
        </div>

        <div className="b-faq">
          <h3 className="b-faq-title">Questions</h3>
          <ul>
            {FAQ.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a ?? ""} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="b-faq-item" data-open={open}>
      <h4>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span>{q}</span>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M3 8h10M8 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </h4>
      <div id={id} className="b-faq-panel" role="region" aria-label={q}>
        <div>
          <p>{a}</p>
        </div>
      </div>
    </li>
  );
}
