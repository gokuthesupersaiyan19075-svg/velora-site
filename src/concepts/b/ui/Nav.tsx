"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { sitePages } from "@/experiences/registry";
import { SoundToggle } from "@/shared/sound/SoundToggle";
import { isCurrentPage, pageHref } from "../pages/FooterNav";
import { SwitchLink } from "../pages/SwitchLink";
import { HoldToLaunch } from "./HoldToLaunch";

/** In-page anchors, offered as a secondary list on the home page only. */
const ANCHORS = [
  { href: "#top", label: "Start" },
  { href: "#park", label: "The park" },
  { href: "#rides", label: "Rides" },
  { href: "#thrill", label: "The ride" },
  { href: "#family", label: "Family" },
  { href: "#eat", label: "Food and shows" },
  { href: "#night", label: "Night" },
  { href: "#visit", label: "Plan your visit" },
];

/**
 * Corner navigation: wordmark top-left, sound + menu top-right, Back bottom-left,
 * hold-to-launch tickets bottom-right. Hides on scroll down, returns on scroll up
 * (driven by data attributes the root sets on .concept-b-root).
 */
export function Nav({ menuOpen, setMenuOpen, onTickets }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void; onTickets: () => void }) {
  const menuBtn = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname() ?? "";
  const home = pathname === pageHref("");

  useEffect(() => {
    if (!menuOpen) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen, setMenuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header className="b-nav" data-menu={menuOpen}>
        {home ? (
          <a href="#top" className="b-nav-mark b-kin" aria-label="VELORA, back to the start">
            VELORA
          </a>
        ) : (
          <Link href={pageHref("")} className="b-nav-mark b-kin" aria-label="VELORA Thrillverse, home">
            VELORA
          </Link>
        )}
        <div className="b-nav-end">
          <SoundToggle className="b-nav-sound" />
          <button
            ref={menuBtn}
            type="button"
            className="b-nav-menu"
            aria-expanded={menuOpen}
            aria-controls="b-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="b-nav-burger" aria-hidden="true">
              <i />
              <i />
            </span>
            {menuOpen ? "Close menu" : "Menu"}
          </button>
        </div>
      </header>

      <div className="b-nav-corner b-nav-tickets">
        <HoldToLaunch onLaunch={onTickets} />
      </div>

      <div className="b-pill">
        <button type="button" className="b-pill-btn" onClick={onTickets}>
          Get tickets
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="b-menu"
            className="b-menu"
            aria-label="Thrillverse"
            initial={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
            animate={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
            exit={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul>
              {sitePages.map((p, i) => (
                <motion.li
                  key={p.path}
                  initial={{ x: i % 2 ? 60 : -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    ref={i === 0 ? firstLink : undefined}
                    href={pageHref(p.path)}
                    onClick={close}
                    className="b-menu-link"
                    aria-current={isCurrentPage(pathname, p.path) ? "page" : undefined}
                  >
                    {p.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            {home && (
              <motion.div
                className="b-menu-sub"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="b-menu-sub-title">On this page</p>
                <ul>
                  {ANCHORS.map((l) => (
                    <li key={l.href}>
                      <a href={l.href} onClick={close}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
            <div className="b-menu-foot">
              <SwitchLink to="wonderverse" className="b-menu-switch" onNavigate={close}>
                Switch to Wonderverse
              </SwitchLink>
              <Link href="/" onClick={close}>
                VELORA entrance
              </Link>
              <SoundToggle className="b-menu-sound" />
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
