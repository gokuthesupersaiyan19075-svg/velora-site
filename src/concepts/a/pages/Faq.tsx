"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { TBC, type Faq as FaqItem } from "@/park/content";

/**
 * Accordion in the style of the home FAQ (scene 08): buttons with aria-expanded inside headings,
 * Up/Down/Home/End move between questions, Enter/Space opens. Several answers can be open at once.
 */
export function Faq({ items, headingLevel = 3 }: { items: FaqItem[]; headingLevel?: 3 | 4 }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const base = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const H = headingLevel === 4 ? "h4" : "h3";

  function onKey(e: KeyboardEvent, i: number) {
    const n = items.length;
    const go = (j: number) => {
      e.preventDefault();
      buttons.current[(j + n) % n]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(n - 1);
  }

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <ul className="a-faq">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <li key={item.q} className="a-faq-item" data-open={isOpen}>
            <H className="a-faq-q">
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${base}-${i}`}
                id={`${base}-b-${i}`}
                onClick={() => toggle(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span>{item.q}</span>
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className="a-faq-icon">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </H>
            <div id={`${base}-${i}`} role="region" aria-labelledby={`${base}-b-${i}`} className="a-faq-a" hidden={!isOpen}>
              <p>{item.a ?? `Answer ${TBC.toLowerCase()}.`}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
