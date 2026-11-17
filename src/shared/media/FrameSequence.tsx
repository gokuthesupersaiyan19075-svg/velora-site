"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/** Scroll-scrubbed clips pre-rendered as WebP frames (scripts: see docs, one clip only). */
export const SEQUENCES: Record<string, { count: number; fps: number }> = {
  "pexels-40268519": { count: 203, fps: 12 },
};

export type FrameSequenceHandle = { show: (progress: number) => void };

/**
 * Draws a pre-rendered frame sequence on a canvas. Scrubbing a normal video seeks between keyframes
 * and stutters; drawing still frames is instant at any speed, in both directions.
 * Loads coarse-to-fine (every 8th frame first, then every 4th, 2nd, then all), so scrubbing works
 * immediately and sharpens as the rest arrives. 1920 px frames on large screens, 1280 px on phones.
 */
export const FrameSequence = forwardRef<FrameSequenceHandle, { id: string; poster?: string; className?: string }>(function FrameSequence({ id, poster, className = "" }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const want = useRef(0);
  const drawn = useRef(-1);
  const seq = SEQUENCES[id];

  /**
   * Frames whose background decode (img.decode()) has finished. Only these are drawn, so a frame that has
   * just arrived is never decoded mid-scroll (measured: first-draw decodes dropped up to 22 frames per cold
   * pass). Each decoded 1080p frame is ~8 MB, so only a small window around the position is decoded.
   */
  const ready = useRef(new Set<number>());
  const pending = useRef(new Set<number>());
  const AHEAD = 4;

  const loadedAt = (i: number) => {
    const f = i >= 0 && seq && i < seq.count ? frames.current[i] : null;
    return f && f.complete && f.naturalWidth ? f : null;
  };

  /** Decode the frames around `index` off the main thread; forget the ones far away (the browser may drop them). */
  const prepare = (index: number) => {
    for (const k of ready.current) if (Math.abs(k - index) > AHEAD * 3) ready.current.delete(k);
    for (let d = 0; d <= AHEAD; d++) {
      for (const i of d ? [index + d, index - d] : [index]) {
        const img = loadedAt(i);
        if (!img || ready.current.has(i) || pending.current.has(i)) continue;
        pending.current.add(i);
        img
          .decode()
          .then(() => {
            ready.current.add(i);
            if (Math.abs(i - want.current) < Math.abs(drawn.current - want.current)) draw(want.current);
          })
          .catch(() => {})
          .finally(() => pending.current.delete(i));
      }
    }
  };

  const draw = (index: number) => {
    const c = canvas.current;
    if (!c || !seq) return;
    // Nearest decoded frame; only before anything is drawn (first paint) the nearest loaded image.
    let img: HTMLImageElement | null = null;
    let at = -1;
    for (let d = 0; d <= AHEAD * 3 && !img; d++) {
      for (const i of [index - d, index + d]) {
        if (!ready.current.has(i)) continue;
        const f = loadedAt(i);
        if (f) {
          img = f;
          at = i;
          break;
        }
      }
    }
    if (!img && drawn.current < 0) {
      for (let d = 0; d < seq.count && !img; d++) {
        for (const i of [index - d, index + d]) {
          const f = loadedAt(i);
          if (f) {
            img = f;
            at = i;
            break;
          }
        }
      }
    }
    prepare(index);
    if (!img || at === drawn.current) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // object-fit: cover
    const cw = c.width, ch = c.height, iw = img.naturalWidth, ih = img.naturalHeight;
    const s = Math.max(cw / iw, ch / ih);
    const w = iw * s, h = ih * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    drawn.current = at;
  };

  useImperativeHandle(ref, () => ({
    show(progress: number) {
      if (!seq) return;
      want.current = Math.round(Math.min(1, Math.max(0, progress)) * (seq.count - 1));
      draw(want.current);
    },
  }));

  useEffect(() => {
    const c = canvas.current;
    if (!c || !seq) return;
    const width = 1920; // phones get the full-size frames too: the clip is cropped to portrait, so 1280 px frames looked soft
    const resize = () => {
      const r = c.getBoundingClientRect();
      // Never back the canvas with more pixels than the source frames can fill: on phones (1280 px frames)
      // a 2x canvas only upscales the same image while quadrupling the fill cost of every scrub redraw.
      // (object-fit: cover scales by the larger ratio, so the smaller source/screen ratio is the 1:1 density.)
      const cap = Math.max(1, Math.min(width / Math.max(1, r.width), (width * 9) / 16 / Math.max(1, r.height)));
      // Desktop too: a 2x canvas over 1920 px frames only upscales the same pixels at 2–4x the fill cost per scrub frame.
      const dpr = Math.min(window.devicePixelRatio || 1, 2, cap);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      drawn.current = -1;
      draw(want.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    let cancelled = false;
    frames.current = new Array(seq.count).fill(null);
    const order: number[] = [];
    for (const step of [8, 4, 2, 1]) for (let i = 0; i < seq.count; i += step) if (!order.includes(i)) order.push(i);
    // Frames arriving mid-scrub stall it (measured: 21–48 slow frames per cold pass with downloads running,
    // 1 with none). So: fetch early in the background (once the page has settled, or when the ride is near),
    // and hold new fetches while the ride is on screen and being scrolled; they resume as soon as it stops.
    let lastScroll = 0;
    let onScreen = false;
    const onScroll = () => (lastScroll = performance.now());
    window.addEventListener("scroll", onScroll, { passive: true });
    const vis = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting));
    vis.observe(c);
    let started = false;
    let next = 0;
    const loadOne = () => {
      if (cancelled || next >= order.length) return;
      // Measured with a browser trace: frame downloads are handled on the main thread (~1.4 s per 5 s of
      // scrolling while they ran), so they wait for any scroll to settle, anywhere on the page. During the ride
      // itself only the few frames already in flight complete.
      if (performance.now() - lastScroll < (onScreen ? 200 : 350)) {
        window.setTimeout(loadOne, 150);
        return;
      }
      const i = order[next++];
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => {
        if (!cancelled && Math.abs(i - want.current) <= Math.abs(drawn.current - want.current)) draw(want.current);
        loadOne();
      };
      img.src = `/media/seq/${id}/${width}/${String(i + 1).padStart(3, "0")}.webp`;
      frames.current[i] = img;
    };
    const start = () => {
      if (started || cancelled) return;
      started = true;
      io.disconnect();
      for (let k = 0; k < 4; k++) loadOne();
    };
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start(), { rootMargin: "150% 0px" });
    io.observe(c);
    // In the background once the opening clip has had its head start.
    const early = window.setTimeout(() => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (ric) ric(start, { timeout: 4000 });
      else start();
    }, 4000);
    const decodedSet = ready.current;
    return () => {
      cancelled = true;
      window.clearTimeout(early);
      window.removeEventListener("scroll", onScroll);
      vis.disconnect();
      io.disconnect();
      ro.disconnect();
      decodedSet.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <canvas
      ref={canvas}
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundImage: poster ? `url(${poster})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
    />
  );
});
