"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BackToHub } from "@/shared/BackToHub";
import type { MediaSlot } from "@/shared/media/types";
import { prefersReducedMotion, useReducedMotion } from "@/shared/motion/useReducedMotion";
import { useSound } from "@/shared/sound/useSound";
import { listTicketTypes, priceLabel } from "@/park/tickets";
import { park } from "@/park/content";
import { HoldToLaunch } from "../ui/HoldToLaunch";
import { Nav } from "../ui/Nav";
import { Sheet } from "../ui/Sheet";
import { FooterNav, pageHref } from "./FooterNav";
import { useKineticRoot } from "./useKineticRoot";

const TicketsContext = createContext<() => void>(() => {});
/** Opens the page's tickets sheet (the honest "not open yet" message until sales open). */
export const useOpenTickets = () => useContext(TicketsContext);

/** The hold-to-launch control, wired to the shell's tickets sheet. */
export function ShellLaunch({ label, variant }: { label?: string; variant?: "sun" | "dark" | "chalk" }) {
  const openTickets = useOpenTickets();
  return <HoldToLaunch label={label} variant={variant} onLaunch={openTickets} />;
}

export type NextPage = { href: string; label: string; eyebrow?: string };

/**
 * The frame of every Thrillverse inner page: the same root (velocity engine, corner nav, tickets sheet)
 * as the home page, a quick slab wipe on arrival, a "next" slab and the home footer.
 */
export function PageShell({
  children,
  next,
  ticketsOverride,
}: {
  children: ReactNode;
  /** Media used on the page (kept for callers; footage credits are not shown). */
  slots?: MediaSlot[];
  next?: NextPage;
  /** Lets a page (the tickets page) handle the corner ticket control itself. */
  ticketsOverride?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tickets, setTickets] = useState(false);
  useKineticRoot(root);

  const openTickets = useCallback(() => (ticketsOverride ? ticketsOverride() : setTickets(true)), [ticketsOverride]);
  const closeTickets = useCallback(() => setTickets(false), []);

  return (
    <div ref={root} className="concept-b-root b-page">
      <a href="#b-main" className="b-skiplink">
        Skip to content
      </a>
      <PageWipe />
      <Nav menuOpen={menuOpen} setMenuOpen={setMenuOpen} onTickets={openTickets} />
      <main id="b-main" tabIndex={-1}>
        <TicketsContext.Provider value={openTickets}>{children}</TicketsContext.Provider>
        {next && <NextSlab next={next} />}
      </main>
      <PageFooter />
      <BackToHub className="b-back" />

      <Sheet open={tickets} onClose={closeTickets} title="Tickets">
        <TicketSheetBody onClose={closeTickets} />
      </Sheet>
    </div>
  );
}

/** The tickets sheet (home and inner pages): prices, hours and the way to the booking form. */
export function TicketSheetBody({ onClose }: { onClose: () => void }) {
  return (
    <>
      <p className="b-sheet-text">Book online in under a minute and pay at the gate. Every pass covers both worlds.</p>
      <dl className="b-sheet-list">
        {listTicketTypes().map((t) => (
          <div key={t.slug}>
            <dt>{t.name}</dt>
            <dd>{priceLabel(t)}</dd>
          </div>
        ))}
        <div>
          <dt>Open</dt>
          <dd>{park.facts.openingHours}</dd>
        </div>
      </dl>
      <Link href={`${pageHref("/tickets")}#book`} className="b-btn b-btn--dark" onClick={onClose}>
        Book tickets
      </Link>
    </>
  );
}

/** Two skewed slabs streak across on arrival. Decorative; never covers content at rest. */
function PageWipe() {
  const reduced = useReducedMotion();
  const { sfx } = useSound();
  const played = useRef(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (played.current || prefersReducedMotion()) return;
    played.current = true;
    sfx("whoosh-fast", { volume: 0.25 });
    // sfx is a fresh closure each render; the sound plays once per page arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (reduced || done) return null;
  // Offsets in vw so both bands start and end fully off-screen whatever their width.
  return (
    <div className="b-pwipe" aria-hidden="true">
      {(["sun", "pink"] as const).map((c, i) => (
        <motion.span
          key={c}
          className={`b-pwipe-band b-pwipe-band--${c}`}
          initial={{ x: "-100vw" }}
          animate={{ x: "125vw" }}
          transition={{ duration: 0.7, delay: i * 0.07, ease: [0.76, 0, 0.24, 1] }}
          onAnimationComplete={i === 1 ? () => setDone(true) : undefined}
        />
      ))}
    </div>
  );
}

function NextSlab({ next }: { next: NextPage }) {
  return (
    <section className="b-pnext" aria-label="Next page">
      <Link href={next.href} className="b-pnext-link">
        <span className="b-pnext-eyebrow">{next.eyebrow ?? "Next"}</span>
        <span className="b-pnext-label">
          <span className="b-kin">{next.label}</span>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M6 24h32M26 10l14 14-14 14" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="square" />
          </svg>
        </span>
      </Link>
    </section>
  );
}

function PageFooter() {
  return (
    <footer className="b-foot b-foot--page">
      <div className="b-foot-top">
        <p className="b-foot-mark b-kin">VELORA</p>
        <FooterNav />
      </div>
      <p className="b-foot-credits">
                VELORA, {park.facts.location}. Open daily 10:00 to 22:00.
      </p>
    </footer>
  );
}
