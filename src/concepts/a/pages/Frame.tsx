"use client";

import { AssetSlot } from "@/shared/media/AssetSlot";
import type { MediaSlot } from "@/shared/media/types";

type Props = {
  slot: MediaSlot;
  alt?: string;
  sizes?: string;
  className?: string;
  /** "still" shows the poster only (cards and lists: no extra video decoding). */
  playback?: "auto" | "still";
  /** Lifts an ink curtain when the frame scrolls in (needs useReveals on a parent). */
  reveal?: boolean;
};

/** A media frame in the Wonderverse style: hairline radius, cover fit, optional curtain reveal. */
export function Frame({ slot, alt = "", sizes = "100vw", className = "", playback = "auto", reveal = true }: Props) {
  return (
    <div className={`a-frame ${className}`} data-reveal={reveal ? "frame" : undefined} data-cursor={playback === "auto" ? "video" : undefined}>
      <div className="a-frame-media">
        <AssetSlot slot={slot} alt={alt} sizes={sizes} playback={playback} pauseControl={playback === "auto"} controlClassName="a-pause" />
      </div>
      <span className="a-curtain" aria-hidden="true" />
    </div>
  );
}
