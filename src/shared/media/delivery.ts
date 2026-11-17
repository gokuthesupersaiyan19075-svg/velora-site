"use client";

/**
 * Video delivery policy (see the plan's "Video delivery strategy"):
 * - Desktop: 4K wherever it exists when the measured connection can carry it, else 1080p; heroes can also upgrade to 4K in the background
 *   when the real 4K file downloads faster than it plays (measured, not guessed).
 * - Phones: 1080p (720p only on a slow connection); never below 720p.
 * - Stall guard: a stall longer than STALL_MS steps down one quality level at the same moment in the clip.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import type { MediaAsset } from "./types";

export const STALL_MS = 1200;
const SLOW_KEY = "velora:uhd-slow";
/** 4K must download at least this many times faster than its bitrate before it takes over. */
const UHD_MIN_RATE = 1.5;
/** Give up on the 4K upgrade if it hasn't proven itself within this time. */
const UHD_TIMEOUT_MS = 9000;

type Conn = { saveData?: boolean; effectiveType?: string };
const connection = (): Conn | undefined => (typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: Conn }).connection : undefined);

export const isPhone = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

// ---------- Connection speed (measured once per visit) ----------
const SPEED_KEY = "velora:mbps";
/** Below this, clips start at 720p so they play at once (1080p clips need roughly 6–8 Mbps). */
export const FAST_MBPS = 8;
/** 4K clips run at roughly 15–25 Mbps: desktop starts at 4K only above this measured speed. */
export const UHD_MBPS = 30;
let mbps: number | null = null;
let probing = false;
const speedListeners = new Set<() => void>();

/** The visitor's measured download speed in Mbit/s, or null before the first measurement. */
export function connectionMbps(): number | null {
  if (mbps === null && typeof window !== "undefined") {
    try {
      const v = sessionStorage.getItem(SPEED_KEY);
      if (v) mbps = Number(v);
    } catch {
      /* storage blocked */
    }
  }
  return mbps;
}
/**
 * Slow only on explicit evidence (Save-Data, or the browser reporting a 2g/3g class link). The 1.5 MB timing
 * probe is latency-dominated and under-reads fast Wi-Fi/5G badly, so it never lowers quality on its own:
 * a clip steps down to 720p only if it genuinely stalls (see useStallGuard).
 */
export const isFastConnection = () => {
  const c = connection();
  if (c?.saveData) return false;
  return !(c?.effectiveType && c.effectiveType !== "4g");
};
export function onSpeedChange(cb: () => void) {
  speedListeners.add(cb);
  return () => {
    speedListeners.delete(cb);
  };
}

/** Times a 1.5 MB slice of one of the site's own clips (once per visit) and remembers the speed. */
export function measureConnection(sampleUrl: string | undefined) {
  if (probing || connectionMbps() !== null || !sampleUrl || typeof window === "undefined") return;
  probing = true;
  const t = performance.now();
  fetch(sampleUrl, { headers: { range: "bytes=0-1499999" }, cache: "no-store" })
    .then((r) => r.arrayBuffer())
    .then((b) => {
      const s = (performance.now() - t) / 1000;
      mbps = Math.round(((b.byteLength * 8) / 1e6 / Math.max(s, 0.05)) * 10) / 10;
      try {
        sessionStorage.setItem(SPEED_KEY, String(mbps));
      } catch {
        /* not kept */
      }
      speedListeners.forEach((l) => l());
    })
    .catch(() => {})
    .finally(() => (probing = false));
}

/** Ordered playback URLs for one video, best first. Remote CDN renditions first, local encodes as fallback. */
export function videoTiers(asset: MediaAsset, { prominent, phone, settled = true }: { prominent: boolean; phone: boolean; /** false during the first (hydration) render: no browser-only inputs, so it matches the pre-built HTML */ settled?: boolean }): string[] {
  const r = asset.web.remote ?? {};
  // Local encodes are only a fallback for clips with no source file (they are not part of the live site).
  const local = asset.web.remote && Object.keys(asset.web.remote).length ? [] : [asset.web.hd, asset.web.sd];
  // Highest quality the connection can carry, best first; the stall guard steps down only if playback stalls.
  // Desktop: 4K wherever it exists once the measured speed can sustain it, otherwise 1080p.
  // Phone: 1080p (no 4K: the screen cannot show it). Slow connection: 720p first so clips start at once.
  const fast = settled ? isFastConnection() : true;
  const mb = settled ? connectionMbps() : null;
  // 4K only for full-screen heroes; cards and previews never download it (1080p is plenty at card size).
  const uhdOk = prominent && !phone && !!r.uhd && mb !== null && mb >= UHD_MBPS;
  const list = !fast
    ? prominent && !phone
      ? [r.fhd?.url, r.hd?.url]
      : [r.hd?.url, r.fhd?.url]
    : [uhdOk ? r.uhd?.url : undefined, r.fhd?.url, r.hd?.url];
  // No 1080p/720p from the source: the 4K file is still better than nothing.
  if (!r.fhd && !r.hd && r.uhd) list.push(r.uhd.url);
  return [...new Set([...list, ...local].filter((u): u is string => !!u))];
}

/**
 * Full-screen clips (Thrillverse hero, Night Shift centre, closing shot): the best genuine source first,
 * never chosen by a speed test. The stall guard steps down only after a real error or a sustained stall.
 */
export function fullscreenTiers(asset: MediaAsset, { best = true }: { best?: boolean } = {}): string[] {
  const r = asset.web.remote ?? {};
  const local = Object.keys(r).length ? [] : [asset.web.hd, asset.web.sd];
  // best: the hero (and phones, unchanged). Otherwise 1080p first on desktop: measured, the 4K closing shot had
  // not shown a frame after 8 s, and a 4K clip loading further down froze the hero for ~2.5 s on the way back up.
  const order = best ? [r.uhd?.url, r.fhd?.url, r.hd?.url] : [r.fhd?.url, r.hd?.url, r.uhd?.url];
  return [...new Set([...order, ...local].filter((u): u is string => !!u))];
}

/** Fixed 1080p (720p only as a failure fallback), never 4K: the Gate's opening film. */
export function fhdSources(asset: MediaAsset): { src: string }[] {
  const r = asset.web.remote ?? {};
  const local = Object.keys(r).length ? [] : [asset.web.hd, asset.web.sd];
  return [...new Set([r.fhd?.url, r.hd?.url, ...local].filter((u): u is string => !!u))].map((src) => ({ src }));
}

/**
 * Clips whose 1080p file starts slowly from the CDN (measured: pexels-29398766's 1080p file is 44 MB with a
 * 0.7–0.9 s first byte, against ~0.12 s for its 720p file). Cards play these at 720p so they start at once.
 */
const SLOW_FHD = new Set(["pexels-29398766"]);

/** Autoplaying card clips (Pick Your Ride): 1080p on desktop, 720p on phones, never 4K. */
export function cardAutoSources(asset: MediaAsset): { src: string; media?: string }[] {
  const r0 = asset.web.remote ?? {};
  const r = SLOW_FHD.has(asset.id) && r0.hd ? { ...r0, fhd: r0.hd } : r0;
  const local = Object.keys(r).length ? [] : [asset.web.hd, asset.web.sd];
  const out: { src: string; media?: string }[] = [];
  if (r.hd && r.fhd) out.push({ src: r.hd.url, media: "(max-width: 767px)" });
  for (const src of new Set([r.fhd?.url, r.hd?.url, ...local])) if (src) out.push({ src });
  return out;
}

/** Small preview clip (asset board, portal hover): 720p from the source, else the local encode. */
export function previewSrc(asset: MediaAsset): string | undefined {
  const r = asset.web.remote;
  return r?.hd?.url ?? r?.fhd?.url ?? asset.web.sd ?? r?.uhd?.url;
}

/** Card and collage clips: 720p first, 1080p as the fallback, never 4K. */
export function cardSources(asset: MediaAsset): { src: string }[] {
  const r = asset.web.remote ?? {};
  const local = Object.keys(r).length ? [] : [asset.web.sd, asset.web.hd];
  return [...new Set([r.hd?.url, r.fhd?.url, ...local].filter((u): u is string => !!u))].map((src) => ({ src }));
}

/** <source> elements for the first paint, chosen by CSS media queries (no JS needed). */
export function videoSources(asset: MediaAsset, prominent: boolean, settled = true): { src: string; media?: string }[] {
  const phone = videoTiers(asset, { prominent, phone: true, settled });
  const desk = videoTiers(asset, { prominent, phone: false, settled });
  const out: { src: string; media?: string }[] = [];
  if (phone[0] && phone[0] !== desk[0]) out.push({ src: phone[0], media: "(max-width: 767px)" });
  // Fallbacks in order: if a file fails to load, the browser moves on to the next <source>.
  for (const src of desk) out.push({ src });
  for (const src of phone) if (!out.some((s) => s.src === src && !s.media)) out.push({ src });
  return out;
}

function markSlow() {
  try {
    sessionStorage.setItem(SLOW_KEY, "1");
  } catch {
    /* storage blocked */
  }
}
function knownSlow() {
  try {
    return sessionStorage.getItem(SLOW_KEY) === "1";
  } catch {
    return false;
  }
}

/** Steps a stalled video down one tier at the same time position. */
export function useStallGuard(ref: RefObject<HTMLVideoElement | null>, tiers: string[], enabled: boolean, stallMs = STALL_MS) {
  useEffect(() => {
    const v = ref.current;
    if (!v || !enabled || !tiers.length) return;
    let timer = 0;
    const clear = () => {
      window.clearTimeout(timer);
      timer = 0;
    };
    // Only a stall during playback counts: the first load is latency, not bandwidth, and switching
    // files then would restart the download from zero (slower start, lower quality).
    let started = false;
    const onPlaying = () => {
      started = true;
      clear();
    };
    const onWaiting = () => {
      if (!started || timer || v.paused) return;
      timer = window.setTimeout(() => {
        timer = 0;
        if (v.paused || v.readyState >= 3) return;
        const i = tiers.indexOf(v.currentSrc);
        const next = i >= 0 ? tiers[i + 1] : undefined;
        if (!next) return;
        const t = v.currentTime;
        const resume = () => {
          v.currentTime = t;
          v.play().catch(() => {});
        };
        started = false;
        v.addEventListener("loadedmetadata", resume, { once: true });
        v.src = next;
        v.load();
      }, stallMs);
    };
    // A network error (dropped connection, CDN hiccup): retry the same file once, then the next size
    // down, keeping the playback position. The poster stays visible meanwhile, so nothing goes blank.
    let retried = "";
    const onError = () => {
      const failed = v.currentSrc || tiers[0];
      const i = tiers.indexOf(failed);
      const next = retried === failed ? (i >= 0 ? tiers[i + 1] : tiers[1]) : failed;
      if (!next) return;
      retried = failed;
      const t = v.currentTime;
      const wasPlaying = !v.paused || v.autoplay;
      window.setTimeout(() => {
        v.addEventListener(
          "loadedmetadata",
          () => {
            if (t) v.currentTime = t;
            if (wasPlaying) v.play().catch(() => {});
          },
          { once: true },
        );
        v.src = next;
        v.load();
      }, 1200);
    };
    const lastSource = v.querySelector("source:last-of-type");
    v.addEventListener("error", onError);
    lastSource?.addEventListener("error", onError);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    // Resuming after a pause (scrolling back to a clip) is a start, not a mid-play stall: never swap files then.
    const onPause = () => {
      clear();
      started = false;
    };
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("pause", onPause);
      clear();
      v.removeEventListener("error", onError);
      lastSource?.removeEventListener("error", onError);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", clear);
    };
  }, [ref, tiers, enabled, stallMs]);
}

/** Whether this visit may try a 4K upgrade for a hero video at all. */
export function uhdAllowed(asset: MediaAsset): boolean {
  if (typeof window === "undefined" || !asset.web.remote?.uhd) return false;
  if (isPhone() || window.matchMedia("(pointer: coarse)").matches) return false;
  // Only worth it on a large screen (downscaled 4K still looks crisper than 1080p there).
  if (window.innerWidth * (window.devicePixelRatio || 1) < 1700) return false;
  const c = connection();
  if (c?.saveData || (c?.effectiveType && c.effectiveType !== "4g")) return false;
  return !knownSlow();
}

export type UhdPhase = "idle" | "loading" | "live" | "off";

const PROBE_BYTES = 3 * 1024 * 1024;

/**
 * True when the connection downloads this 4K file at least UHD_MIN_RATE× faster than it plays.
 * Downloads only the first 3 MB (which the video element then reuses from the HTTP cache).
 * Any error (CORS, timeout, no size) counts as "not fast enough": the hero simply stays at 1080p.
 */
async function uhdFastEnough(url: string, duration: number, knownBytes?: number): Promise<boolean> {
  if (!duration) return false;
  const ctrl = new AbortController();
  const timeout = window.setTimeout(() => ctrl.abort(), UHD_TIMEOUT_MS);
  try {
    const t0 = performance.now();
    const res = await fetch(url, { headers: { range: `bytes=0-${PROBE_BYTES - 1}` }, signal: ctrl.signal, mode: "cors" });
    if (res.status !== 206 && res.status !== 200) return false;
    const got = (await res.arrayBuffer()).byteLength;
    const seconds = (performance.now() - t0) / 1000;
    if (!got || !seconds) return false;
    const downloadBps = (got * 8) / seconds;
    // CDNs don't expose Content-Range to other sites, so the file size comes from the manifest;
    // unknown sizes assume a heavy 4K file (45 Mb/s).
    const fileBps = knownBytes ? (knownBytes * 8) / duration : 45e6;
    return downloadBps >= fileBps * UHD_MIN_RATE;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Background 4K upgrade for a hero. Checks the connection against the real 4K file once the 1080p
 * main video is playing; only if it is fast enough is the 4K loaded into a hidden overlay, and once it can play through the
 * overlay take over at the same frame (the main video then pauses and hands play/pause to it).
 * If the 4K overlay later stalls, the main 1080p video resumes from the same moment.
 */
export function useUhdUpgrade(
  main: RefObject<HTMLVideoElement | null>,
  overlay: RefObject<HTMLVideoElement | null>,
  asset: MediaAsset,
  enabled: boolean,
  onDelegate: (to: HTMLVideoElement | null) => void,
) {
  const [phase, setPhase] = useState<UhdPhase>("idle");
  const delegate = useRef(onDelegate);
  useEffect(() => {
    delegate.current = onDelegate;
  });

  useEffect(() => {
    const m = main.current;
    // Not allowed: the overlay stays an empty, invisible element (phase "idle") and never loads anything.
    if (!enabled || !m || !uhdAllowed(asset)) return;
    let cancelled = false;
    let started = 0;
    let poll = 0;
    let stallTimer = 0;
    let offTime = () => {};

    const giveUp = (slow: boolean) => {
      window.clearInterval(poll);
      const o = overlay.current;
      if (o) {
        o.pause();
        o.removeAttribute("src");
        o.load();
      }
      if (slow) markSlow();
      if (!cancelled) setPhase("off");
    };

    const begin = async () => {
      const o = overlay.current;
      if (!o || cancelled) return;
      setPhase("loading");
      const url = asset.web.remote!.uhd!.url;
      // Bandwidth check against the real 4K file: time the first PROBE_BYTES and compare the download
      // speed with the file's own bitrate (file size from the manifest ÷ duration).
      const fast = await uhdFastEnough(url, asset.duration ?? 0, asset.web.remote!.uhd!.bytes);
      if (cancelled) return;
      if (!fast) return giveUp(true);
      started = performance.now();
      o.src = url;
      o.preload = "auto";
      o.load();
      poll = window.setInterval(() => {
        const elapsed = performance.now() - started;
        // Browsers buffer a paused video only a little, so "can play through" may never be reported.
        // The speed check already passed; once the opening is decodable, swapIn picks the moment.
        if (o.readyState >= 3) {
          window.clearInterval(poll);
          swapIn(o);
        } else if (elapsed > UHD_TIMEOUT_MS) {
          giveUp(true);
        }
      }, 250);
    };

    const bufferedAt = (v: HTMLVideoElement, t: number) => {
      for (let i = 0; i < v.buffered.length; i++) if (v.buffered.start(i) <= t && v.buffered.end(i) >= t) return true;
      return false;
    };

    // Same-frame handover. The overlay is parked at `target` (a moment the 1080p video has not reached
    // yet, inside what the 4K has already buffered, so the seek is instant); when the 1080p video gets
    // there, the overlay starts and is shown.
    const handover = (o: HTMLVideoElement, m2: HTMLVideoElement, target: number) => {
      const show = () => {
        if (cancelled) return;
        setPhase("live");
        delegate.current(o);
        m2.pause();
      };
      o.currentTime = target;
      o.addEventListener(
        "seeked",
        () => {
          if (cancelled) return;
          if (m2.paused) {
            // Not playing right now (off-screen or paused by the visitor): hand over silently.
            o.currentTime = m2.currentTime;
            show();
            return;
          }
          const wait = Math.max(0, (target - m2.currentTime) / (m2.playbackRate || 1));
          window.setTimeout(() => {
            if (cancelled) return;
            o.play()
              .then(show)
              .catch(() => giveUp(false));
          }, wait * 1000);
        },
        { once: true },
      );
    };

    const swapIn = (o: HTMLVideoElement) => {
      const m2 = main.current;
      if (!m2 || cancelled) return;
      const dur = o.duration || m2.duration || 0;
      const target = m2.currentTime + 0.35;
      const nearEnd = dur > 0 && target + 1.5 >= dur;
      if (m2.paused || (!nearEnd && bufferedAt(o, target) && bufferedAt(o, target + 1.5))) {
        handover(o, m2, m2.paused ? m2.currentTime : target);
        return;
      }
      // The 4K has only the clip's opening buffered (browsers buffer paused video sparingly), and
      // seeking 4K into unbuffered footage is slow. So switch where the clip loops back to its start.
      let last = m2.currentTime;
      const onTime = () => {
        const t = m2.currentTime;
        if (t < last - 0.5) {
          offTime();
          handover(o, m2, t + 0.25);
        }
        last = t;
      };
      offTime = () => m2.removeEventListener("timeupdate", onTime);
      m2.addEventListener("timeupdate", onTime);
    };

    // Overlay stall → hand back to the 1080p main video at the same moment.
    const onOverlayWaiting = () => {
      const o = overlay.current;
      if (!o || stallTimer || o.paused) return;
      stallTimer = window.setTimeout(() => {
        stallTimer = 0;
        const m2 = main.current;
        if (!o || !m2 || o.readyState >= 3 || cancelled) return;
        m2.currentTime = o.currentTime;
        delegate.current(null);
        m2.play().catch(() => {});
        giveUp(true);
      }, STALL_MS);
    };
    const clearStall = () => {
      window.clearTimeout(stallTimer);
      stallTimer = 0;
    };
    const o = overlay.current;
    o?.addEventListener("waiting", onOverlayWaiting);
    o?.addEventListener("playing", clearStall);

    // Start only after the 1080p video is actually playing, so the 4K download never delays first frame.
    const onPlaying = () => window.setTimeout(begin, 600);
    if (!m.paused && m.readyState >= 3) onPlaying();
    else m.addEventListener("playing", onPlaying, { once: true });

    return () => {
      cancelled = true;
      offTime();
      window.clearInterval(poll);
      clearStall();
      m.removeEventListener("playing", onPlaying);
      o?.removeEventListener("waiting", onOverlayWaiting);
      o?.removeEventListener("playing", clearStall);
      delegate.current(null);
    };
  }, [main, overlay, asset, enabled]);

  return phase;
}
