import manifestJson from "../../../media/manifest.json";
import approvalsJson from "../../../media/approvals.json";
import choicesJson from "../../../media/slot-choices.json";
import type { Approvals, AssetStatus, MediaAsset, MediaSlot } from "./types";

export const manifest = manifestJson as unknown as MediaAsset[];
export const approvals = approvalsJson as Approvals;
/** Per-slot picks made with "Use this here" on the asset board: slot id → asset id. Beats the preference order. */
export const slotChoices = choicesJson as Record<string, string>;

const byId = new Map(manifest.map((a) => [a.id, a]));

export function getAsset(id: string): MediaAsset | undefined {
  return byId.get(id);
}

export function statusOf(id: string): AssetStatus {
  return approvals[id] ?? "candidate";
}

export type SlotResolution =
  | { state: "approved"; asset: MediaAsset }
  | { state: "candidate"; asset: MediaAsset }
  | { state: "placeholder"; asset: null };

/**
 * What a frame shows, in order:
 * 1. the asset picked for this frame on the asset board ("Use this here"), unless rejected;
 * 2. otherwise the frame's default pick (its first candidate, chosen to be unique within the experience);
 * 3. otherwise the next candidate that is not rejected.
 * A placeholder only appears when every candidate is rejected or missing.
 * (`previewCandidates` is kept for API compatibility; defaults are always shown now.)
 */
export function resolveSlot(slot: MediaSlot, previewCandidates = false): SlotResolution {
  void previewCandidates;
  const picked = slotChoices[slot.id];
  if (picked && statusOf(picked) !== "rejected") {
    const asset = byId.get(picked);
    if (asset) return { state: "approved", asset };
  }
  for (const id of slot.candidates) {
    const asset = byId.get(id);
    if (asset && statusOf(id) !== "rejected") return { state: "approved", asset };
  }
  return { state: "placeholder", asset: null };
}

/** Approved assets referenced by a set of slots, for the footer credit line. */
export function approvedAssetsIn(slots: MediaSlot[]): MediaAsset[] {
  const seen = new Set<string>();
  const out: MediaAsset[] = [];
  for (const slot of slots) {
    const r = resolveSlot(slot, false);
    if (r.state === "approved" && !seen.has(r.asset.id)) {
      seen.add(r.asset.id);
      out.push(r.asset);
    }
  }
  return out;
}

/** Every approved asset listed anywhere in the given slots (wider than what is on screen). */
export function approvedCandidatesIn(slots: MediaSlot[]): MediaAsset[] {
  const seen = new Set<string>();
  const out: MediaAsset[] = [];
  for (const slot of slots) {
    for (const id of slot.candidates) {
      if (seen.has(id) || statusOf(id) !== "approved") continue;
      const a = byId.get(id);
      if (a) {
        seen.add(id);
        out.push(a);
      }
    }
  }
  return out;
}

/** The site a picture comes from, for credits ("Pexels", "Pixabay", "Coverr", or the pasted link's site). */
export function providerName(a: MediaAsset): string {
  if (a.provider === "pexels") return "Pexels";
  if (a.provider === "pixabay") return "Pixabay";
  if (a.provider === "coverr") return "Coverr";
  try {
    return new URL(a.sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}
