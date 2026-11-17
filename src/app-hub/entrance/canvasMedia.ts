/**
 * A world's clip as something a 2D canvas can draw: the local poster first, the 720p preview once
 * it has a frame. Drawing a cross-origin video only marks the canvas as "tainted" for reading,
 * which these engines never do (they never call getImageData on a canvas that holds media).
 * The video element sits in the page (visually hidden) so browsers keep decoding it while it plays.
 */
import { previewSrc } from "@/shared/media/delivery";
import type { MediaAsset } from "@/shared/media/types";

export class CanvasClip {
  readonly poster = new Image();
  readonly video: HTMLVideoElement | null = null;
  private wantPlay = false;
  private posterReady = false;

  constructor(asset: MediaAsset, host: HTMLElement) {
    this.poster.decoding = "async";
    this.poster.onload = () => (this.posterReady = true);
    this.poster.src = asset.web.poster;
    const src = asset.kind === "video" ? previewSrc(asset) : undefined;
    if (src) {
      const v = document.createElement("video");
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.preload = "none";
      v.setAttribute("aria-hidden", "true");
      v.tabIndex = -1;
      v.className = "ent-canvas-clip";
      v.src = src;
      host.appendChild(v);
      this.video = v;
    }
  }

  /** Start buffering early (the visitor is about to need it). */
  warm() {
    const v = this.video;
    if (v && v.preload !== "auto") {
      v.preload = "auto";
      if (v.readyState === 0) v.load();
    }
  }

  play(on: boolean) {
    const v = this.video;
    this.wantPlay = on;
    if (!v) return;
    if (on) {
      this.warm();
      v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }

  get playing() {
    return this.wantPlay && !!this.video && !this.video.paused;
  }

  /** The best frame available right now, with its natural size, or null before anything loaded. */
  frame(): { src: CanvasImageSource; w: number; h: number } | null {
    const v = this.video;
    if (v && v.readyState >= 2 && v.videoWidth) return { src: v, w: v.videoWidth, h: v.videoHeight };
    if (this.posterReady && this.poster.naturalWidth) return { src: this.poster, w: this.poster.naturalWidth, h: this.poster.naturalHeight };
    return null;
  }

  destroy() {
    const v = this.video;
    if (!v) return;
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
  }
}

/** Draw `f` to cover the rectangle (like object-fit: cover). */
export function drawCover(ctx: CanvasRenderingContext2D, f: { src: CanvasImageSource; w: number; h: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / f.w, h / f.h);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(f.src, (f.w - sw) / 2, (f.h - sh) / 2, sw, sh, x, y, w, h);
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** requestAnimationFrame loop with a frame cap and start/stop. */
export class Loop {
  private raf = 0;
  private last = 0;
  private running = false;
  constructor(
    private step: (dt: number, now: number) => void,
    public fps = 60,
  ) {}
  set(on: boolean) {
    if (on === this.running) return;
    this.running = on;
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else cancelAnimationFrame(this.raf);
  }
  private tick = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    const gap = 1000 / this.fps;
    if (now - this.last < gap - 2) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt, now);
  };
  get isRunning() {
    return this.running;
  }
}
