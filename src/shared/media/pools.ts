import poolsJson from "../../../media/pools.json";
import { getAsset } from "./library";
import type { AssetCategory, MediaSlot } from "./types";

export type ExperienceId = "wonderverse" | "thrillverse";
type Pools = Record<ExperienceId, Partial<Record<AssetCategory, string[]>>>;
const pools = poolsJson as Pools;

/** Every asset id in one experience's pool (no asset belongs to two experiences). */
export function poolIds(exp: ExperienceId): string[] {
  return Object.values(pools[exp]).flat() as string[];
}

export interface SlotSpec {
  /** Unique within the experience, e.g. "home.hero" or "attraction.skyline-serpent". */
  key: string;
  /** Shown on the asset board: what this frame needs. */
  needs: string;
  /** Categories to draw candidates from, in order of preference. */
  from: AssetCategory[];
  /** Prefer video or photo for this frame. Default "video". */
  prefer?: "video" | "photo" | "any";
  /** How many candidates to offer on the asset board. Default 5. */
  options?: number;
}

/**
 * Builds an experience's slots from its own pool only. Each slot's FIRST candidate (its default pick)
 * is distinct from every other slot's default in the same experience, so no frame repeats;
 * the remaining options may overlap so the board always has choices.
 * Deterministic: same specs → same allocation.
 */
export function buildSlots<K extends string>(exp: ExperienceId, specs: (SlotSpec & { key: K })[]): Record<K, MediaSlot> {
  const usedAsDefault = new Set<string>();
  const out = {} as Record<K, MediaSlot>;
  for (const spec of specs) {
    const prefer = spec.prefer ?? "video";
    const ranked: string[] = [];
    for (const cat of spec.from) for (const id of pools[exp][cat] ?? []) if (!ranked.includes(id)) ranked.push(id);
    const kindOf = (id: string) => getAsset(id)?.kind;
    const fits = (id: string) => prefer === "any" || kindOf(id) === prefer;
    const ordered = [...ranked.filter(fits), ...ranked.filter((id) => !fits(id))];
    const first = ordered.find((id) => !usedAsDefault.has(id)) ?? ordered[0];
    if (first) usedAsDefault.add(first);
    const rest = ordered.filter((id) => id !== first);
    // Spread the extra options so neighbouring slots don't all offer the same alternatives.
    const offset = usedAsDefault.size % Math.max(1, rest.length);
    const extras = [...rest.slice(offset), ...rest.slice(0, offset)].slice(0, (spec.options ?? 5) - 1);
    out[spec.key] = { id: `${exp}.${spec.key}`, needs: spec.needs, candidates: first ? [first, ...extras] : [] };
  }
  return out;
}

/**
 * A slot whose candidates come only from this world's pool: the preferred ids that are in the pool
 * (in order; the first is the default pick), then the pool's best assets from `from`.
 * Preferred ids that belong to the other world are dropped, so no asset appears in both worlds.
 */
export function poolSlot(exp: ExperienceId, key: string, needs: string, preferred: string[], from: AssetCategory[], options = 5): MediaSlot {
  const own = new Set(poolIds(exp));
  const candidates = preferred.filter((id) => own.has(id));
  for (const cat of from) for (const id of pools[exp][cat] ?? []) if (candidates.length < options && !candidates.includes(id)) candidates.push(id);
  return { id: `${exp}.${key}`, needs, candidates };
}
