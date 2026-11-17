"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BackToHub } from "@/shared/BackToHub";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { getSoundEngine } from "@/shared/sound/engine";
import { ScrollTrigger } from "../lib/gsap";
import { CinemaCursor } from "../ui/CinemaCursor";
import { UIContext, type DrawerContent } from "../ui/context";
import { Drawer } from "../ui/Drawer";
import { Footer } from "../ui/Footer";
import { Nav } from "../ui/Nav";
import { pageHref } from "./site";

/** How long the opening wipe covers the page (ms); page heroes start their entrance after it. */
export const WIPE_MS = 650;

/**
 * The frame every Wonderverse inner page sits in: the same nav, menu, drawer, cursor and footer as the home page.
 * Provides the UI context (scene "page-top" while the opening frame is under the nav, then "page")
 * and plays a short ink wipe carrying the page title on arrival, like the cuts between home scenes.
 */
export function PageShell({ wipe, children }: { wipe: string; children: ReactNode }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [drawer, setDrawer] = useState<{ content: DrawerContent; opener: HTMLElement | null } | null>(null);
  const [atTop, setAtTop] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);

  // Nav floats over the opening frame and turns to glass once the page scrolls on (no scroll handler).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAtTop(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The wipe's whoosh (silent unless the visitor turned sound on).
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => getSoundEngine().sfx("whoosh-wipe", { volume: 0.2 }), WIPE_MS - 250);
    return () => window.clearTimeout(t);
  }, [reduced]);

  const openDrawer = useCallback((content: DrawerContent, opener?: HTMLElement | null) => setDrawer({ content, opener: opener ?? null }), []);
  const openTickets = useCallback(() => router.push(pageHref("/tickets")), [router]);
  const close = useCallback(() => setDrawer(null), []);

  return (
    <UIContext.Provider value={{ openDrawer, openTickets, scene: atTop ? "page-top" : "page" }}>
      <a href="#a-main" className="a-skip">
        Skip to content
      </a>
      <div ref={sentinel} className="a-page-sentinel" aria-hidden="true" />
      <CinemaCursor />
      <Nav />
      <main id="a-main" className="a-main a-page">
        {children}
      </main>
      <Footer />
      <Drawer content={drawer?.content ?? null} onClose={close} returnTo={drawer?.opener ?? null} />
      <BackToHub className="a-back" />
      {!reduced && (
        <div className="a-wipe" aria-hidden="true" style={{ animationDelay: `${WIPE_MS - 350}ms` }}>
          <span className="a-wipe-title a-title-card">{wipe}</span>
        </div>
      )}
    </UIContext.Provider>
  );
}
