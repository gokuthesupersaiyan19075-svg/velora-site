"use client";

import { useId, useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { fullMotionQuery } from "@/shared/motion/useReducedMotion";
import { conditions, gsap, useGSAP, type Cond } from "../lib/gsap";
import { slotsA } from "../slots";
import { sceneId } from "../scenes";
import { useUI } from "../ui/context";
import { faqs, park } from "@/park/content";

const FACTS = [
  { label: "Opening hours", value: park.facts.openingHours! },
  { label: "Location", value: park.facts.location! },
  { label: "Ticket prices", value: "Day Pass ₹2,499 · Family Pass ₹7,999" },
  { label: "Getting here", value: "Free VELORA Shuttle every 15 minutes from Novara Central; parking for 4,000 cars" },
];

// Shared answers (content.ts), so both worlds always say the same thing.
const FAQ = faqs.slice(0, 8);

export function S08Visit() {
  const root = useRef<HTMLElement>(null);
  const { openTickets } = useUI();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(conditions(fullMotionQuery()), (ctx) => {
        const c = ctx.conditions as Cond;
        if (c.reduced) return;
        const q = gsap.utils.selector(root);
        gsap.from(q("h2, h3"), { opacity: 0, duration: 0.6, stagger: 0.05, scrollTrigger: { trigger: root.current, start: "top 75%", once: true } });
      });
    },
    { scope: root },
  );

  return (
    <section id={sceneId("08")} data-scene="08" ref={root} className="a-s8" aria-labelledby="a-s8-h">
      <div className="a-wrap a-s8-grid">
        <div className="a-s8-main">
          <h2 id="a-s8-h" className="a-s8-heading">
            Plan your visit
          </h2>
          <p className="a-s8-lede">Everything you need before the day, from opening hours to the shuttle.</p>
          <dl className="a-facts">
            {FACTS.map((f) => (
              <div key={f.label} className="a-fact">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="a-s8-actions">
            <button type="button" className="a-btn a-btn--primary" onClick={(e) => openTickets(e.currentTarget)}>
              Get tickets
            </button>
            <a className="a-btn a-btn--ghost" href="/wonderverse/plan#getting-here">
              Get directions
            </a>
          </div>

          <h3 className="a-faq-heading">Questions</h3>
          <Faq />
        </div>
        <div className="a-s8-photo">
          <div className="a-s8-photo-frame">
            <AssetSlot slot={slotsA.visit} alt="Aerial view of an amusement park, used as a stand-in image" sizes="(min-width: 960px) 40vw, 100vw" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const base = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    const n = FAQ.length;
    const go = (j: number) => {
      e.preventDefault();
      buttons.current[(j + n) % n]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
  }

  return (
    <ul className="a-faq">
      {FAQ.map(({ q: qText, a: answer }, i) => {
        const isOpen = open === i;
        return (
          <li key={qText} className="a-faq-item" data-open={isOpen}>
            <h4 className="a-faq-q">
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${base}-${i}`}
                id={`${base}-b-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span>{qText}</span>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="a-faq-icon">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </h4>
            <div id={`${base}-${i}`} role="region" aria-labelledby={`${base}-b-${i}`} className="a-faq-a" hidden={!isOpen}>
              <p>{answer}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
