"use client";

import Link from "next/link";
import { motion, useReducedMotion as useMotionReduced } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { previewSrc } from "@/shared/media/delivery";
import { getAsset } from "@/shared/media/library";
import type { Storyboard } from "@/shared/storyboard/types";
import { experiences } from "@/experiences/registry";
import { park } from "@/park/content";

export interface HubConcept {
  sb: Storyboard;
  href: string;
  mediaId: string;
  /** className that applies the concept's display font to the panel title */
  fontClass: string;
}

export function Hub({ concepts }: { concepts: HubConcept[] }) {
  const [active, setActive] = useState(0);
  const reduced = useMotionReduced();
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="hub">
      <header className="hub-top">
        <motion.p
          className="hub-mark"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          VELORA
        </motion.p>
        <motion.div
          className="hub-intro"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
        >
          <h1>Two ways into the park</h1>
          <p>
            Explore VELORA the way you like it: as a sweeping film, or as a full-speed ride. Same park, same rides, two very different journeys.
            You can switch at any time.
          </p>
        </motion.div>
      </header>

      <main>
        <ul className="hub-panels" aria-label="Experiences">
          {concepts.map((c, i) => (
            <Panel key={c.sb.concept} c={c} index={i} active={active === i} onActivate={() => setActive(i)} reduced={!!reduced} />
          ))}
        </ul>
      </main>

      <footer className="hub-foot">
        <p>
          VELORA · Lake Aurelia Road, Novara Bay · Open daily 10:00 to 22:00 · {park.facts.phone}.
        </p>
      </footer>
    </div>
  );
}

function Panel({
  c,
  index,
  active,
  onActivate,
  reduced,
}: {
  c: HubConcept;
  index: number;
  active: boolean;
  onActivate: () => void;
  reduced: boolean;
}) {
  const asset = getAsset(c.mediaId);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const desktop = window.matchMedia("(min-width: 900px)").matches;
    if (active && desktop && !reduced) v.play().catch(() => {});
    else v.pause();
  }, [active, reduced]);

  const exp = experiences.find((e) => e.href === c.href)!;
  return (
    <motion.li
      className={`hub-panel hub-panel--${c.sb.concept}`}
      data-active={active}
      onPointerEnter={onActivate}
      onFocusCapture={onActivate}
      initial={reduced ? false : { clipPath: "inset(100% 0 0 0 round 22px)" }}
      animate={{ clipPath: "inset(0% 0 0 0 round 22px)" }}
      transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1], delay: 0.25 + index * 0.12 }}
    >
      <div className="hub-panel-media" aria-hidden="true">
        {asset && asset.kind === "video" ? (
          <video ref={video} muted loop playsInline preload="none" poster={asset.web.poster}>
            {previewSrc(asset) && <source src={previewSrc(asset)} type="video/mp4" />}
          </video>
        ) : null}
        <span className="hub-panel-shade" />
      </div>

      <div className="hub-panel-body">
        <span className="hub-panel-letter">{exp.promise}</span>
        <h2 className={`hub-panel-title ${c.fontClass}`}>{exp.name}</h2>
        <p className="hub-panel-tagline">{exp.summary}</p>
        <div className="hub-panel-actions">
          <Link href={c.href} className="hub-btn hub-btn--primary">
            Enter {exp.name}
          </Link>
        </div>
      </div>
    </motion.li>
  );
}
