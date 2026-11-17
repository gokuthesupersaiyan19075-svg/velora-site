"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { SoundToggle } from "@/shared/sound/SoundToggle";
import { PAGES_A, pageFor, pageHref } from "../pages/site";
import { useThrillverseLink } from "../pages/switch";
import { SCENES_A, sceneId } from "../scenes";
import { useUI } from "./context";
import { useFocusTrap } from "./useFocusTrap";

type Mode = "float" | "glass" | "night" | "hidden";

// Home scenes "01".."09" drive the mode there; inner pages report "page-top" / "page" (see pages/PageShell).
function modeFor(scene: string): Mode {
  if (scene === "01" || scene === "page-top") return "float";
  if (scene === "04" || scene === "09") return "hidden";
  if (scene === "07") return "night";
  return "glass";
}

export function Nav() {
  const { scene } = useUI();
  const reduced = useReducedMotion();
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const mode = modeFor(scene);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const onPage = scene.startsWith("page");
  const page = pageFor(pathname);

  return (
    <>
      <motion.header
        className="a-nav"
        data-mode={mode}
        initial={reduced ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: mode === "hidden" ? 0 : 1, y: mode === "hidden" ? -24 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : scene === "01" ? 1.8 : 0 }}
        style={{ pointerEvents: mode === "hidden" ? "none" : undefined }}
        inert={mode === "hidden" ? true : undefined}
      >
        <div className="a-nav-bar">
          {onPage ? (
            <Link href={pageHref("")} className="a-nav-mark" aria-label="VELORA Wonderverse, home">
              VELORA
            </Link>
          ) : (
            <a href={`#${sceneId("01")}`} className="a-nav-mark" aria-label="VELORA, back to the opening">
              VELORA
            </a>
          )}
          {onPage ? (
            <p className="a-timecode">
              <span aria-hidden="true">{page.n} / </span>
              {page.label}
            </p>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="a-nav-actions">
            <SoundToggle className="a-sound a-sound--bar" />
            <button
              ref={menuBtn}
              type="button"
              className="a-btn a-btn--small a-btn--ghost a-menu-btn"
              aria-expanded={menuOpen}
              aria-controls="a-menu"
              onClick={() => setMenuOpen(true)}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M3 6.5h14M3 13.5h14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Menu
            </button>
          </div>
        </div>
        <span className="a-nav-progress" aria-hidden="true" />
      </motion.header>
      <Menu open={menuOpen} onClose={closeMenu} home={!onPage} currentPath={page.path} />
    </>
  );
}

type Preview = { kind: "page" | "scene"; i: number };

function Menu({ open, onClose, home, currentPath }: { open: boolean; onClose: () => void; home: boolean; currentPath: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const current = Math.max(0, PAGES_A.findIndex((p) => p.path === currentPath));
  const [preview, setPreview] = useState<Preview>({ kind: "page", i: current });
  const thrill = useThrillverseLink();
  useFocusTrap(panel, open, onClose);
  const s = preview.kind === "page" ? { key: `p${preview.i}`, slot: PAGES_A[preview.i].slot } : { key: `s${preview.i}`, slot: SCENES_A[preview.i].slot };
  const isPreview = (kind: Preview["kind"], i: number) => (preview.kind === kind && preview.i === i ? "true" : undefined);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="a-menu"
          ref={panel}
          className="a-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="a-menu-top">
            <span className="a-nav-mark">VELORA</span>
            <div className="a-menu-top-actions">
              <SoundToggle className="a-sound" />
              <button type="button" className="a-btn a-btn--small a-btn--ghost" onClick={onClose}>
                Close menu
              </button>
            </div>
          </div>
          <div className="a-menu-grid">
            <div>
              <nav aria-label="Wonderverse">
                <ol className="a-menu-list">
                  {PAGES_A.map((p, i) => (
                    <motion.li
                      key={p.path}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.25 + i * 0.05 }}
                    >
                      <Link
                        href={p.href}
                        onClick={onClose}
                        onPointerEnter={() => setPreview({ kind: "page", i })}
                        onFocus={() => setPreview({ kind: "page", i })}
                        data-preview={isPreview("page", i)}
                        aria-current={i === current ? "page" : undefined}
                      >
                        <span className="a-menu-n">{p.n}</span>
                        <span className="a-menu-t">{p.label}</span>
                      </Link>
                    </motion.li>
                  ))}
                </ol>
              </nav>
              {home && (
                <nav aria-label="Scenes on this page" className="a-menu-scenes">
                  <p className="a-menu-sub">On this page</p>
                  <ol className="a-menu-scenelist">
                    {SCENES_A.map((sc, i) => (
                      <motion.li
                        key={sc.n}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.03 }}
                      >
                        <a
                          href={`#${sceneId(sc.n)}`}
                          onClick={onClose}
                          onPointerEnter={() => setPreview({ kind: "scene", i })}
                          onFocus={() => setPreview({ kind: "scene", i })}
                          data-preview={isPreview("scene", i)}
                        >
                          <span className="a-menu-n">00:{sc.n}</span>
                          <span>{sc.title}</span>
                        </a>
                      </motion.li>
                    ))}
                  </ol>
                </nav>
              )}
              <div className="a-menu-links">
                <a href={thrill.href} onClick={thrill.onClick}>
                  Explore Thrillverse
                </a>
                <Link href="/">VELORA entrance</Link>
              </div>
            </div>
            <div className="a-menu-preview" aria-hidden="true">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={s.key}
                  className="a-menu-preview-frame"
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AssetSlot slot={s.slot} alt="" pauseControl={false} playbackPriority={5} sizes="40vw" />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
