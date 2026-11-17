"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { categoryLabel, type Attraction } from "@/park/content";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { useSound } from "@/shared/sound/useSound";
import { Frame } from "./Frame";
import { rideHref } from "./site";
import { slotForRide } from "./slots-pages";

// A gentle pentatonic run, so hovering along a row sounds like a music box rather than one repeated note.
const NOTES = [659.25, 783.99, 880, 1046.5, 1174.66];

/**
 * One attraction as a poster card: still frame, category, name and line.
 * The name is the link; it stretches over the whole card (no nested links, one tab stop per card).
 */
export function AttractionCard({ ride, index = 0, headingLevel = 3 }: { ride: Attraction; index?: number; headingLevel?: 2 | 3 }) {
  const reduced = useReducedMotion();
  const { chime } = useSound();
  const H = headingLevel === 2 ? "h2" : "h3";

  return (
    <motion.li
      className="a-card"
      layout={reduced ? false : "position"}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, scale: 0.97, transition: { duration: 0.25 } }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : (index % 3) * 0.06 }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") chime(NOTES[index % NOTES.length], { volume: 0.1, decay: 1.6 });
      }}
    >
      <Frame slot={slotForRide(ride.slug, ride.name)} playback="still" reveal={false} className="a-card-frame" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" />
      <p className="a-card-meta">
        <span className="a-card-cat">{categoryLabel[ride.category]}</span>
        <span aria-hidden="true">·</span>
        <span>{ride.type}</span>
        {ride.night && <span className="a-night-tag">After dark</span>}
      </p>
      <H className="a-card-title">
        <Link href={rideHref(ride.slug)} className="a-card-link">
          {ride.name}
        </Link>
      </H>
      <p className="a-card-line">{ride.line}</p>
      <span className="a-card-cta" aria-hidden="true">
        View ride <span className="a-arrow">→</span>
      </span>
    </motion.li>
  );
}
