"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { AssetSlot } from "@/shared/media/AssetSlot";
import type { DrawerContent } from "./context";
import { useFocusTrap } from "./useFocusTrap";

export function Drawer({ content, onClose, returnTo }: { content: DrawerContent | null; onClose: () => void; returnTo: HTMLElement | null }) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, !!content, onClose, returnTo);

  return (
    <AnimatePresence>
      {content && (
        <motion.div className="a-drawer-root" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <button type="button" className="a-drawer-scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="a-drawer-title"
            className="a-drawer"
            data-lenis-prevent
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="a-drawer-head">
              <h2 id="a-drawer-title">{content.title}</h2>
              <button type="button" className="a-icon-btn" onClick={onClose} aria-label="Close drawer">
                <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                  <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {content.media && (
              <div className="a-drawer-media">
                <AssetSlot slot={content.media} alt="" sizes="460px" controlClassName="a-pause" playbackPriority={6} />
              </div>
            )}
            <p className="a-drawer-body">{content.body}</p>
            {content.facts && (
              <dl className="a-drawer-facts">
                {content.facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {content.items && (
              <ul className="a-drawer-items">
                {content.items.map((it) => (
                  <li key={it.title} className="a-drawer-item">
                    <div className="a-drawer-thumb">
                      <AssetSlot slot={it.slot} playback="still" alt="" sizes="140px" />
                    </div>
                    <div>
                      <h3>{it.title}</h3>
                      <p className="a-drawer-item-meta">{it.meta}</p>
                      <p className="a-drawer-item-body">{it.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {content.action && (
              <a className="a-btn a-btn--light" href={content.action.href}>
                {content.action.label}
              </a>
            )}
            <p className="a-drawer-note">VELORA · Open daily 10:00 to 22:00 · Lake Aurelia Road, Novara Bay</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
