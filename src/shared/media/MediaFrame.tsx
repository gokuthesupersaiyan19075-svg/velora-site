"use client";

import Image from "next/image";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MediaAsset } from "./types";
import { useManagedVideo } from "./playback";
import { prefersReducedMotion } from "../motion/useReducedMotion";
import { cardAutoSources, cardSources, fullscreenTiers, isFastConnection, isPhone, measureConnection, onSpeedChange, useStallGuard, useUhdUpgrade, videoSources, videoTiers } from "./delivery";

export interface MediaFrameProps {
  asset: MediaAsset;
  /** Fills its positioned parent (object-fit: cover). Default true. */
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Above-the-fold media: eager poster/image, preload metadata. */
  priority?: boolean;
  /** Full-screen hero: 1080p on phones and a background 4K upgrade on large desktop screens. Default = priority. */
  hero?: boolean;
  /** "auto": managed autoplay (only the most visible play). "scrub": paused, caller drives currentTime. "still": poster only.
   *  "hover": poster until the visitor hovers the card (desktop) or taps its play button (touch); one at a time, 720p. */
  playback?: "auto" | "scrub" | "still" | "hover";
  /** Higher wins when two autoplay videos are equally visible. */
  playbackPriority?: number;
  /** Shows a small pause/play button for autoplaying video (WCAG 2.2.2). Default true. */
  pauseControl?: boolean;
  /** Extra class for the pause button so each concept can style/position it. */
  controlClassName?: string;
  /** Use this still instead of the asset's default poster (a chosen moment of the clip). */
  poster?: string;
  sizes?: string;
  objectPosition?: string;
  /** Accessible description; decorative media should pass "" */
  alt?: string;
  /** Full-screen clip: best genuine source first (4K where it exists), no speed test, no overlay; steps down only on a real error or sustained stall. */
  fullscreen?: boolean;
  /** Autoplaying card: 1080p on desktop, 720p on phones. */
  cardAuto?: boolean;
  /** Desktop plays this clip at 720p (a narrow strip beside a main clip); phones unchanged. */
  desktop720?: boolean;
  /** Loop only the first N seconds of an autoplaying clip. */
  maxSeconds?: number;
}

/** Only one hover/tap clip plays at a time. */
let stopHovered: (() => void) | null = null;

/**
 * Hover clips near the screen (desktop only) fetch their header and first frames ahead of the hover, so they
 * start the moment the pointer arrives. At most HOVER_WARM_MAX warm up at once; the rest wait in page order.
 */
const HOVER_WARM_MAX = 2;
let hoverWarming = 0;
const hoverQueue: { v: HTMLVideoElement; start: () => void }[] = [];
function pumpHoverWarm() {
  while (hoverWarming < HOVER_WARM_MAX && hoverQueue.length) {
    const { v, start } = hoverQueue.shift()!;
    if (!v.isConnected) continue;
    hoverWarming++;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(t);
      hoverWarming = Math.max(0, hoverWarming - 1);
      v.removeEventListener("loadeddata", done);
      v.removeEventListener("loadedmetadata", done);
      v.removeEventListener("error", done, true);
      pumpHoverWarm();
    };
    const t = window.setTimeout(done, 4000);
    v.addEventListener("loadeddata", done);
    v.addEventListener("loadedmetadata", done);
    v.addEventListener("error", done, true);
    // Creating a media pipeline blocks the page for a frame or two: do it while the browser is idle, never
    // mid-scroll in a pinned scene (measured: warm-ups during the ride caused a ~110 ms stall).
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(start, { timeout: 1500 });
    else window.setTimeout(start, 200);
  }
}
function queueHoverWarm(v: HTMLVideoElement, start: () => void) {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || c?.effectiveType === "2g" || c?.effectiveType === "slow-2g") return () => {};
  const item = { v, start };
  hoverQueue.push(item);
  hoverQueue.sort((a, b) => a.v.getBoundingClientRect().top - b.v.getBoundingClientRect().top);
  pumpHoverWarm();
  return () => {
    const i = hoverQueue.indexOf(item);
    if (i >= 0) hoverQueue.splice(i, 1);
  };
}

/** Cards do not need a 1920 px poster decoded for each of ~27 videos: the export serves 640/1080 px WebP copies. */
function videoPoster(poster: string | undefined, hero: boolean, phone: boolean) {
  if (!poster || hero || process.env.NEXT_PUBLIC_VELORA_EXPORT !== "1" || !poster.startsWith("/media/")) return poster;
  return `/media/sized/${poster.slice("/media/".length).replace(/\.[a-z]+$/i, "")}-${phone ? 640 : 1080}.webp`;
}

/** Renders an approved/candidate asset: <video> with HD/SD sources + poster, or next/image. */
export const MediaFrame = forwardRef<HTMLVideoElement | null, MediaFrameProps>(function MediaFrame(
  {
    asset,
    fill = true,
    className = "",
    style,
    priority = false,
    hero,
    playback = "auto",
    playbackPriority = 1,
    pauseControl = true,
    controlClassName = "",
    poster: posterOverride,
    sizes = "100vw",
    objectPosition = "50% 50%",
    alt,
    fullscreen = false,
    cardAuto = false,
    desktop720 = false,
    maxSeconds,
  },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);
  const managed = asset.kind === "video" && playback === "auto";
  const { playing, toggle, delegateTo } = useManagedVideo(videoRef, { autoplay: managed, priority: playbackPriority, register: playback !== "hover" });
  // 4K is for any clip that fills the screen (not only the hero); cards and previews stay at 1080p.
  const [covers, setCovers] = useState(false);
  const isHero = hero ?? (priority || covers);
  // 4K sources only for the page's opening clip; mid-page full-screen clips play 1080p (smoother scrolling).
  const best = isHero && (priority || hero === true);
  const hoverMode = asset.kind === "video" && playback === "hover";
  const isVideo = asset.kind === "video" && playback !== "still";
  const scrubbing = playback === "scrub";

  // Quality tiers (best first) for the stall guard; the first paint uses <source> media queries instead.
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(isPhone()), []);
  // The first video on the page measures the connection once; sizes follow the result.
  const [fast, setFast] = useState(true);
  // First render = the pre-built HTML: no browser-only inputs in the source list (hydration must match).
  const [settled, setSettled] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- switch to browser-only inputs once hydrated
  useEffect(() => setSettled(true), []);
  useEffect(() => {
    // Full-screen clips never wait on (or compete with) the speed probe.
    if (!isVideo || hoverMode || fullscreen) return;
    setFast(isFastConnection());
    measureConnection(asset.web.remote?.hd?.url ?? asset.web.remote?.fhd?.url);
    return onSpeedChange(() => setFast(isFastConnection()));
  }, [asset, isVideo, hoverMode, fullscreen]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `fast` changes the order videoTiers returns
  const tiers = useMemo(
    () => (!isVideo ? [] : desktop720 && !phone ? cardSources(asset).map((s) => s.src) : fullscreen ? fullscreenTiers(asset, { best: priority }) : cardAuto ? (phone ? [asset.web.remote?.hd?.url ?? cardAutoSources(asset)[0]?.src] : cardAutoSources(asset).filter((s) => !s.media).map((s) => s.src)).filter((u): u is string => !!u) : videoTiers(asset, { prominent: best, phone })),
    [asset, best, phone, isVideo, fast, fullscreen, cardAuto, priority, desktop720],
  );
  // Full-screen clips step down only after a sustained stall (4 s of real playback waiting), never on a first-load delay.
  useStallGuard(videoRef, tiers, isVideo && !scrubbing && !hoverMode, fullscreen ? 4000 : undefined);
  // Re-ordered once the connection is measured; a released video picks the new order up when it returns.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `fast` changes the order videoSources returns
  const sources = useMemo<{ src: string; media?: string }[]>(
    () =>
      scrubbing && asset.web.scrub
        ? [{ src: asset.web.scrub }]
        : desktop720
          ? [{ src: videoSources(asset, best, settled)[0]?.src, media: "(max-width: 767px)" }, ...cardSources(asset)].filter((s) => !!s.src)
          : fullscreen
          ? priority
            ? fullscreenTiers(asset).map((src) => ({ src }))
            : // mid-page full-screen clips start at 1080p everywhere (measured: 4K on a phone took 1.7 s to start)
              fullscreenTiers(asset, { best: false }).map((src) => ({ src }))
          : cardAuto
            ? cardAutoSources(asset)
            : videoSources(asset, best, settled),
    [scrubbing, asset, best, fast, fullscreen, cardAuto, priority, desktop720, settled],
  );

  // The page's priority clip (the hero) asks to play the moment it mounts, without waiting for the
  // visibility manager's first pass; the manager still pauses it once it leaves the screen.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !managed || !priority || prefersReducedMotion()) return;
    v.play().catch(() => {});
  }, [managed, priority]);

  // Long clips loop over their first `maxSeconds` only.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !maxSeconds || !managed) return;
    const cap = () => {
      if (v.currentTime >= maxSeconds && (v.duration || 0) > maxSeconds + 0.5) v.currentTime = 0;
    };
    v.addEventListener("timeupdate", cap);
    return () => v.removeEventListener("timeupdate", cap);
  }, [maxSeconds, managed]);


  // Far from the screen (beyond ~1 screen), a managed video gives up its download: browsers allow only a
  // few connections per server, and paused clips that keep buffering starve the ones arriving on screen.
  // It reconnects (sources come back, the browser picks one again) as soon as it is near.
  const releasable = managed && !priority && !scrubbing;
  const [near, setNear] = useState(true);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !releasable) return;
    // Reconnecting waits until the clip has stayed near for a moment: a fast fling (back to the top, say)
    // no longer wakes every clip it passes, which swamped the hero's resume for ~3 s.
    // Two checks: the section must be near (clips in a sideways track sit in a clipped container, so on their
    // own they never count as "near" until on screen, which made every card start cold), AND the clip itself
    // must be within ~1.2 screens vertically (its layout box is exact even when clipped). Without the second,
    // every card of a tall section kept downloading during the next scene (measured: 50–115 ms stalls).
    let t = 0;
    let poll = 0;
    let sectionNear = false;
    let isNear = true;
    const close = () => {
      const r = v.getBoundingClientRect();
      return r.bottom > -innerHeight * 1.2 && r.top < innerHeight * 2.2;
    };
    const apply = (want: boolean) => {
      if (want === isNear) return;
      window.clearTimeout(t);
      if (want) t = window.setTimeout(() => ((isNear = true), setNear(true)), 250);
      else {
        isNear = false;
        setNear(false);
      }
    };
    const check = () => apply(sectionNear && close());
    const io = new IntersectionObserver(
      ([e]) => {
        sectionNear = e.isIntersecting;
        window.clearInterval(poll);
        if (sectionNear) poll = window.setInterval(check, 300);
        check();
      },
      { rootMargin: "120% 0px 120% 0px" },
    );
    // Phones keep the per-clip check (unchanged behaviour, no extra data for cards not yet swiped in).
    io.observe(isPhone() ? v : (v.closest("section") ?? v));
    return () => {
      window.clearTimeout(t);
      window.clearInterval(poll);
      io.disconnect();
    };
  }, [releasable]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || near || !releasable) return;
    v.pause();
    v.removeAttribute("src");
    v.load(); // aborts the download; the poster stays
  }, [near, releasable]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !fill || !managed) return;
    const check = () => {
      const r = v.getBoundingClientRect();
      setCovers(r.width >= innerWidth * 0.85 && r.height >= innerHeight * 0.75);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(v);
    return () => ro.disconnect();
  }, [fill, managed]);

  // ---- hover / tap to play: poster first, nothing downloads or decodes until the visitor asks ----
  const [hoverOn, setHoverOn] = useState(false);
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hoverMode) return;
    const touch = !window.matchMedia("(any-hover: hover)").matches;
    setCoarse(touch);
    // the whole card (not just the picture) is the hover target
    const card = (v.closest("li, .b-grid-item") as HTMLElement | null) ?? v.parentElement;
    if (!card || touch) return;
    const enter = () => {
      if (prefersReducedMotion()) return;
      stopHovered?.();
      stopHovered = () => setHoverOn(false);
      setHoverOn(true);
    };
    const leave = () => setHoverOn(false);
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
    };
  }, [hoverMode]);
  // Desktop only: near the screen, the clip's sources attach and its opening is fetched (queued, 2 at a time).
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hoverMode || !window.matchMedia("(any-hover: hover)").matches || prefersReducedMotion()) return;
    let cancel = () => {};
    let t = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        cancel();
        window.clearTimeout(t);
        if (e.isIntersecting) t = window.setTimeout(() => (cancel = queueHoverWarm(v, () => setWarm(true))), 250);
        else setWarm(false);
      },
      // About a third of a screen ahead: enough to fetch the opening before the card arrives, without
      // waking cards that are still a pinned scene away.
      { rootMargin: "35% 0px 35% 0px" },
    );
    io.observe(v);
    return () => {
      cancel();
      window.clearTimeout(t);
      io.disconnect();
    };
  }, [hoverMode]);
  // Sources attached (or detached when far away): the browser picks one and fetches the opening.
  const wasWarm = useRef(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hoverMode) return;
    if (warm !== wasWarm.current && !hoverOn) v.load();
    wasWarm.current = warm;
  }, [warm, hoverMode, hoverOn]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hoverMode) return;
    if (hoverOn) {
      // A warmed clip already has its opening buffered: play at once instead of reloading it.
      if (!wasWarm.current || v.readyState === 0) v.load();
      v.play().catch(() => {});
      // previews run for at most 10 seconds, then loop from the start
      const cap = () => {
        if (v.currentTime >= 10) v.currentTime = 0;
      };
      v.addEventListener("timeupdate", cap);
      return () => v.removeEventListener("timeupdate", cap);
    } else {
      v.pause();
      v.load(); // sources are gone: releases the download and shows the poster again
    }
  }, [hoverOn, hoverMode]);
  const toggleHover = () => {
    if (!hoverOn) {
      stopHovered?.();
      stopHovered = () => setHoverOn(false);
    }
    setHoverOn(!hoverOn);
  };

  const overlayRef = useRef<HTMLVideoElement | null>(null);
  // The 4K upgrade runs a second decoder during the handover: only for the page's opening clip (priority).
  // Mid-page full-screen clips stay at 1080p; measured, upgrades in layered scenes (After Dark) dropped frames.
  const uhd = useUhdUpgrade(videoRef, overlayRef, asset, isVideo && managed && isHero && priority && fill && !fullscreen && !!asset.web.remote?.uhd, delegateTo);
  const label = alt ?? asset.description;
  const fit: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition }
    : { width: "100%", height: "auto" };

  if (asset.kind === "photo" || playback === "still") {
    const src = asset.kind === "photo" ? asset.web.src! : (posterOverride ?? asset.web.poster);
    return fill ? (
      <Image
        src={src}
        alt={label}
        fill
        sizes={sizes}
        priority={priority}
        quality={80}
        className={className}
        style={{ objectFit: "cover", objectPosition, ...style }}
      />
    ) : (
      <Image
        src={src}
        alt={label}
        width={asset.width}
        height={asset.height}
        sizes={sizes}
        priority={priority}
        quality={80}
        className={className}
        style={style}
      />
    );
  }

  const scrub = scrubbing;
  return (
    <>
      <video
        ref={videoRef}
        className={className}
        style={{ ...fit, ...style }}
        poster={videoPoster(asset.web.poster, isHero, phone)}
        muted
        playsInline
        loop={!scrub}
        preload={scrub || priority ? "auto" : hoverMode && warm ? "metadata" : "none"}
        aria-label={label || undefined}
        aria-hidden={label ? undefined : true}
        disablePictureInPicture
      >
        {/* Best tier first; if a file is missing or fails, the browser moves on to the next <source>. */}
        {hoverMode && (hoverOn || warm) && cardSources(asset).map((s, i) => <source key={`${i}-${s.src}`} src={s.src} type="video/mp4" />)}
        {!hoverMode && (near || !releasable) && sources.map((s, i) => (
          <source key={`${i}-${s.src}`} src={s.src} type="video/mp4" media={"media" in s ? s.media : undefined} />
        ))}
      </video>
      {managed && isHero && priority && fill && !fullscreen && asset.web.remote?.uhd && uhd !== "off" ? (
        // 4K upgrade layer: invisible until it has proven it can play through, then takes over at the same frame.
        <video
          ref={overlayRef}
          className={className}
          style={{ ...fit, ...style, opacity: uhd === "live" ? 1 : 0, pointerEvents: "none" }}
          muted
          playsInline
          loop
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
        />
      ) : null}
      {hoverMode && pauseControl && coarse && (
        <button
          type="button"
          onClick={toggleHover}
          className={`velora-pause ${controlClassName}`}
          aria-label={hoverOn ? "Pause video" : "Play video"}
          aria-pressed={hoverOn}
        >
          {hoverOn ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
      {managed && pauseControl && (
        <button
          type="button"
          onClick={toggle}
          className={`velora-pause ${controlClassName}`}
          aria-label={playing ? "Pause video" : "Play video"}
          aria-pressed={!playing}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M4 2.5v11l9.5-5.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      )}
    </>
  );
});
