"use client";

import { forwardRef } from "react";
import { resolveSlot } from "./library";
import { MediaFrame, type MediaFrameProps } from "./MediaFrame";
import { Placeholder } from "./Placeholder";
import { usePreviewCandidates } from "./preview-store";
import { useTry } from "./try-store";
import type { MediaSlot } from "./types";

export type AssetSlotProps = Omit<MediaFrameProps, "asset"> & {
  slot: MediaSlot;
  placeholderClassName?: string;
};

/**
 * Approved asset → media. Nothing approved → placeholder (or, with "Preview candidates" on,
 * the first candidate with an "Unapproved candidate" badge).
 * A "Preview on site" from the picture chooser temporarily shows its candidate in this frame.
 * Must sit inside a positioned element when `fill` (default) is used.
 */
export const AssetSlot = forwardRef<HTMLVideoElement | null, AssetSlotProps>(function AssetSlot(
  { slot, placeholderClassName, ...frame },
  ref,
) {
  const [preview] = usePreviewCandidates();
  const tryState = useTry();
  if (tryState && tryState.slot === slot.id) {
    return (
      <>
        <MediaFrame ref={ref} asset={tryState.asset} {...frame} />
        <span className="velora-candidate-badge velora-try-badge">Preview: not chosen yet</span>
      </>
    );
  }
  const r = resolveSlot(slot, preview);
  if (r.state === "placeholder") {
    return <Placeholder slotId={slot.id} needs={slot.needs} className={placeholderClassName} />;
  }
  return (
    <>
      <MediaFrame ref={ref} asset={r.asset} {...frame} />
      {r.state === "candidate" && <span className="velora-candidate-badge">Unapproved candidate</span>}
    </>
  );
});
