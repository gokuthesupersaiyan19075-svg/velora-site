"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { prefersReducedMotion } from "../motion/useReducedMotion";
import { isFastConnection } from "./delivery";

/**
 * Page-wide playback manager: only the most visible autoplay videos play (weighted by priority;
 * two on desktop, one on phones). Everything off-screen pauses. Videos the visitor
 * paused stay paused. Scrubbed videos are not registered (GSAP drives their currentTime).
 */
type Entry = { ratio: number; priority: number; autoplay: boolean };

const entries = new Map<HTMLVideoElement, Entry>();
const userPaused = new WeakSet<HTMLVideoElement>();
/** A registered video can hand actual playback to another element (the 4K overlay); see delivery.ts. */
const delegates = new WeakMap<HTMLVideoElement, HTMLVideoElement>();
const target = (v: HTMLVideoElement) => delegates.get(v) ?? v;
let observer: IntersectionObserver | null = null;
let frame = 0;

function decide() {
  frame = 0;
  if (typeof document !== "undefined" && document.hidden) {
    entries.forEach((_, v) => target(v).pause());
    return;
  }
  // The most visible videos play (weighted by priority): two at once on desktop so grids of clips
  // feel alive, one on phones or with data saver. Everything else pauses.
  const ranked: [HTMLVideoElement, number][] = [];
  entries.forEach((e, v) => {
    if (!e.autoplay || userPaused.has(v) || e.ratio < 0.2) return;
    ranked.push([v, e.ratio * e.priority]);
  });
  ranked.sort((a, b) => b[1] - a[1]);
  const playing = new Set(ranked.slice(0, maxPlaying()).filter(([, sc], i) => i === 0 || sc >= 0.3).map(([v]) => v));
  entries.forEach((e, v) => {
    const t = target(v);
    if (playing.has(v)) {
      if (t.paused) t.play().catch(() => {});
    } else if (!t.paused) {
      t.pause();
    }
  });
  playing.forEach(bufferNext);
}

/**
 * Once a clip plays smoothly, the next clip in page order (a ride track, the night layers) buffers
 * fully, so it starts the moment it arrives. Only ever one clip ahead, and only after the current one can
 * play through: buffering everything at once was measured to starve the clip on screen.
 */
function bufferNext(v: HTMLVideoElement) {
  // Desktop only: phones keep their data-light behaviour.
  if (window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) return;
  const t = target(v);
  const go = () => {
    if (t.paused) return;
    // The next autoplay clip in page order (the next card in a track, or the first clip of the next scene).
    const list = [...entries.keys()]
      .filter((x) => x.isConnected && entries.get(x)!.autoplay)
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const next = list[list.indexOf(v) + 1];
    if (!next || next.preload === "auto" || userPaused.has(next)) return;
    // Only a clip that is close (within two screens): buffering one several scenes away competed with the
    // scroll-scrubbed ride in between (measured dropped frames).
    const box = (next.closest("section") ?? next).getBoundingClientRect();
    if (box.top > innerHeight * 2 || box.bottom < -innerHeight) return;
    next.preload = "auto";
    if (next.readyState === 0 && next.querySelector("source")) next.load();
  };
  if (t.readyState >= 3) go();
  else t.addEventListener("canplaythrough", go, { once: true });
}

/** A page can cap simultaneous playback (Thrillverse: one decoder at a time; two 1080p decoders halved the desktop frame rate). */
let limit: number | null = null;
export function setPlaybackLimit(n: number | null) {
  limit = n;
  schedule();
}

function maxPlaying() {
  // A 4K clip is decoding (the overlay took over): never run a second video next to it.
  for (const v of entries.keys()) if (delegates.has(v)) return 1;
  if (limit !== null) return limit;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || (c?.effectiveType && c.effectiveType !== "4g" && c.effectiveType !== "3g")) return 1;
  // Two at once only when the connection can feed both at full quality.
  return window.matchMedia("(max-width: 767px), (pointer: coarse)").matches || !isFastConnection() ? 1 : 2;
}

function schedule() {
  if (frame) return;
  // rAF is throttled in background/embedded views and never fires there: a short timer guarantees the
  // visible clip still starts. Whichever fires first decides; the other is a no-op.
  const run = () => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    decide();
  };
  const timer = window.setTimeout(run, 120);
  frame = requestAnimationFrame(run);
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          const e = entries.get(it.target as HTMLVideoElement);
          if (e) e.ratio = it.isIntersecting ? it.intersectionRatio : 0;
        }
        schedule();
      },
      { threshold: [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 1] },
    );
    document.addEventListener("visibilitychange", schedule);
  }
  return observer;
}

/**
 * Warm-up: a video that is about to scroll into view (within about one screen) fetches its header
 * and first frame (preload="metadata"): the connection is open and the file's index is known, so it
 * starts the moment it arrives. It does NOT download the whole file: full pre-buffering of upcoming
 * clips was measured to choke the clip on screen (15 Mbps free → 2 Mbps for the visible video).
 * At most WARM_MAX warm-ups run at once; the rest queue in page order.
 */
const WARM_MAX = 2;
let warming = 0;
const warmQueue: HTMLVideoElement[] = [];
const warmed = new WeakSet<HTMLVideoElement>();
let nearObserver: IntersectionObserver | null = null;
/** Warm-up is judged per section (clips in a clipped sideways track never intersect on their own). */
const nearGroups = new Map<Element, Set<HTMLVideoElement>>();

function pumpWarm() {
  // Respect data saver / very slow connections: no speculative buffering there.
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g") return;
  // The clip the visitor is watching comes first: no speculative downloads while it is still starting.
  let starting = false;
  entries.forEach((e, v) => {
    const t = target(v);
    // playing, or visible and about to be played by decide(), but not yet able to play through
    if ((!t.paused || (e.autoplay && e.ratio >= 0.2 && !userPaused.has(v))) && t.readyState < 3) starting = true;
  });
  if (starting) {
    if (warmQueue.length) window.setTimeout(pumpWarm, 400);
    return;
  }
  while (warming < WARM_MAX && warmQueue.length) {
    const v = warmQueue.shift()!;
    if (!v.isConnected || warmed.has(v) || v.readyState >= 2) continue;
    warmed.add(v);
    warming++;
    // Some browsers never fire loadeddata for a metadata-only preload: never let the queue stall.
    const timeout = window.setTimeout(() => done(), 4000);
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      warming = Math.max(0, warming - 1);
      v.removeEventListener("loadeddata", done);
      v.removeEventListener("canplay", done);
      v.removeEventListener("error", done);
      pumpWarm();
    };
    v.addEventListener("loadeddata", done);
    v.addEventListener("canplay", done);
    v.addEventListener("error", done);
    if (v.preload === "none") v.preload = "metadata";
    if (v.readyState === 0) v.load();
  }
}

function getNearObserver() {
  if (!nearObserver) {
    nearObserver = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          if (!it.isIntersecting) continue;
          const group = nearGroups.get(it.target);
          nearObserver!.unobserve(it.target);
          nearGroups.delete(it.target);
          group?.forEach((v) => {
            if (!warmed.has(v) && v.isConnected) warmQueue.push(v);
          });
        }
        warmQueue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        pumpWarm();
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
  }
  return nearObserver;
}

export function useManagedVideo(
  ref: RefObject<HTMLVideoElement | null>,
  { autoplay = true, priority = 1, register = true }: { autoplay?: boolean; priority?: number; /** false: hover/tap clips run themselves and must not be paused by this manager */ register?: boolean } = {},
) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || !register) return;
    const auto = autoplay && !prefersReducedMotion();
    entries.set(v, { ratio: 0, priority, autoplay: auto });
    const obs = getObserver();
    obs.observe(v);
    const near = auto ? getNearObserver() : null;
    // Desktop warms a whole section (sideways tracks); phones warm clip by clip, as before.
    const nearTarget = window.matchMedia("(max-width: 767px)").matches ? v : (v.closest("section") ?? v);
    if (near) {
      const g = nearGroups.get(nearTarget) ?? new Set<HTMLVideoElement>();
      g.add(v);
      nearGroups.set(nearTarget, g);
      near.observe(nearTarget);
    }
    const onPlay = () => setPlaying(!target(v).paused);
    const onPause = () => setPlaying(!target(v).paused);
    // A play() that was refused or aborted while the file was still loading (or swapped by the stall guard)
    // is retried as soon as data arrives, so a visible clip never stays stuck on its poster.
    const retry = () => schedule();
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("loadeddata", retry);
    v.addEventListener("canplay", retry);
    return () => {
      v.removeEventListener("loadeddata", retry);
      v.removeEventListener("canplay", retry);
      obs.unobserve(v);
      nearGroups.get(nearTarget)?.delete(v);
      entries.delete(v);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.pause();
      delegates.delete(v);
    };
  }, [ref, autoplay, priority, register]);

  const syncPlaying = useCallback(() => {
    const v = ref.current;
    if (v) setPlaying(!target(v).paused);
  }, [ref]);

  /** Hand play/pause of this video to `d` (or back to itself with null). */
  const delegateTo = useCallback(
    (d: HTMLVideoElement | null) => {
      const v = ref.current;
      if (!v) return;
      const prev = delegates.get(v);
      if (prev === d) return;
      if (prev) {
        prev.removeEventListener("play", syncPlaying);
        prev.removeEventListener("pause", syncPlaying);
        delegates.delete(v);
      }
      if (d) {
        delegates.set(v, d);
        d.addEventListener("play", syncPlaying);
        d.addEventListener("pause", syncPlaying);
      }
      syncPlaying();
      schedule();
    },
    [ref, syncPlaying],
  );

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    const t = target(v);
    if (t.paused) {
      userPaused.delete(v);
      // Playing one video manually pauses whatever else is running.
      entries.forEach((_, other) => other !== v && target(other).pause());
      const e = entries.get(v);
      if (e) e.autoplay = true;
      t.play().catch(() => {});
    } else {
      userPaused.add(v);
      t.pause();
    }
  };

  return { playing, toggle, delegateTo };
}
