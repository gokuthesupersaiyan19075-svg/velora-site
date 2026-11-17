/**
 * Canvas engine for "The Marquee" entrance: a fairground sign made of bulbs.
 * The board is a grid of bulbs. A chase runs round the frame and down the seam between the worlds;
 * the name VELORA lights letter by letter; then each half becomes a screen whose bulbs show that
 * world's film (the clip is drawn into a tiny canvas, one pixel per bulb, then masked by the bulbs).
 * Choosing a world swells its bulbs until they merge into the clear film.
 *
 * Cost control: sprites are pre-rendered (drawImage only, no per-frame gradients or filters),
 * the bulb count is capped, the loop stops off-screen, in hidden tabs and with reduced motion.
 */
import { CanvasClip, drawCover, Loop, makeCanvas } from "./canvasMedia";

export type Side = 0 | 1; // 0 = Wonderverse, 1 = Thrillverse

export type MarqueeParams = {
  /** Frame and seam chase lights, 0..1. */
  frame: number;
  /** VELORA letters lit, 0..6 (fractional = the next letter warming up). */
  logo: number;
  /** The screens switch on from the centre outwards, 0..1. */
  screen: number;
  /** World names in bulbs, 0..1. */
  names: number;
  /** A world chosen: its bulbs swell and merge into the clear film, 0..1. */
  bloom: number;
};

type Fonts = { wonder: string; thrill: string; brand: string };

const MAX_BULBS = 7200;
const BOARD = "#140a12";

function disc(size: number, stops: [number, string][]) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export class MarqueeEngine {
  chosen: Side | null = null;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private tiny: [HTMLCanvasElement, HTMLCanvasElement];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private pitch = 14;
  private cols = 0;
  private rows = 0;
  private ox = 0;
  private oy = 0;
  private axisX = true;
  private n = 0;
  // per bulb
  private cx = new Float32Array(0);
  private cy = new Float32Array(0);
  private side = new Uint8Array(0);
  /** -1 screen bulb, otherwise its position along the chase path. */
  private chase = new Int16Array(0);
  private dist = new Float32Array(0);
  private seam = new Uint8Array(0);
  /** Board bulbs behind a world name (dimmed so the lettering reads). */
  private nameLit = new Uint8Array(0);
  /** Lettering bulbs on the fine grid: position, kind (0 VELORA, 1 Wonderverse, 2 Thrillverse), VELORA letter. */
  private fine = 7;
  private lx = new Float32Array(0);
  private ly = new Float32Array(0);
  private lkind = new Uint8Array(0);
  private lletter = new Int8Array(0);
  private base: HTMLCanvasElement | null = null;
  private white: HTMLCanvasElement;
  private warm: HTMLCanvasElement;
  private glass: HTMLCanvasElement;
  private lit: [number, number] = [0, 0];
  private hover: Side | null = null;
  private px = -1e4;
  private py = -1e4;
  private wand = 0;
  private wandTarget = 0;
  private t = 0;
  private loop: Loop;
  private fonts: Fonts;

  constructor(
    private canvas: HTMLCanvasElement,
    private clips: [CanvasClip, CanvasClip],
    fonts: Fonts,
    /** Owned by the component (its opening timeline animates them); read every frame. */
    readonly params: MarqueeParams,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.layer = makeCanvas(1, 1);
    this.lctx = this.layer.getContext("2d")!;
    this.tiny = [makeCanvas(1, 1), makeCanvas(1, 1)];
    this.fonts = fonts;
    this.white = disc(64, [
      [0, "rgba(255,255,255,1)"],
      [0.55, "rgba(255,255,255,0.92)"],
      [0.8, "rgba(255,255,255,0.35)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    this.warm = disc(96, [
      [0, "rgba(255,250,235,1)"],
      [0.16, "rgba(255,226,160,0.95)"],
      [0.34, "rgba(255,180,80,0.42)"],
      [0.62, "rgba(255,140,50,0.12)"],
      [1, "rgba(255,120,40,0)"],
    ]);
    this.glass = disc(32, [
      [0, "rgba(120,78,70,0.55)"],
      [0.6, "rgba(70,40,46,0.4)"],
      [1, "rgba(40,20,30,0)"],
    ]);
    this.loop = new Loop((dt) => this.step(dt), 60);
  }

  setRunning(on: boolean) {
    this.loop.set(on);
    if (!on) this.render();
  }

  setHover(s: Side | null) {
    this.hover = s;
    if (!this.loop.isRunning) this.render();
  }

  setPointer(x: number, y: number, inside: boolean) {
    this.px = x;
    this.py = y;
    this.wandTarget = inside ? 1 : 0;
  }

  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.layer.width = this.canvas.width;
    this.layer.height = this.canvas.height;
    this.axisX = w >= 768 && w >= h;

    let pitch = w < 640 ? 11 : w < 1200 ? 13 : 15;
    while ((w / pitch) * (h / pitch) > MAX_BULBS) pitch += 1;
    this.pitch = pitch;
    this.cols = Math.floor(w / pitch);
    this.rows = Math.floor(h / pitch);
    this.ox = (w - this.cols * pitch) / 2 + pitch / 2;
    this.oy = (h - this.rows * pitch) / 2 + pitch / 2;
    const n = (this.n = this.cols * this.rows);
    this.cx = new Float32Array(n);
    this.cy = new Float32Array(n);
    this.side = new Uint8Array(n);
    this.chase = new Int16Array(n).fill(-1);
    this.dist = new Float32Array(n);
    this.seam = new Uint8Array(n);
    this.nameLit = new Uint8Array(n);

    const { cols, rows } = this;
    const seamCol = Math.floor(cols / 2);
    const seamRow = Math.floor(rows / 2);
    const maxD = Math.hypot(w / 2, h / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = this.ox + c * pitch;
        const y = this.oy + r * pitch;
        this.cx[i] = x;
        this.cy[i] = y;
        this.side[i] = (this.axisX ? c >= seamCol : r >= seamRow) ? 1 : 0;
        this.dist[i] = Math.hypot(x - w / 2, y - h / 2) / maxD;
        // The chase path: clockwise round the frame, plus the seam.
        let k = -1;
        if (r === 0) k = c;
        else if (c === cols - 1) k = cols + r;
        else if (r === rows - 1) k = cols + rows + (cols - c);
        else if (c === 0) k = 2 * cols + rows + (rows - r);
        else if (this.axisX ? c === seamCol : r === seamRow) {
          k = this.axisX ? r : c;
          this.seam[i] = 1;
        }
        this.chase[i] = k;
      }
    }
    this.tiny[0].width = this.tiny[1].width = this.axisX ? seamCol : cols;
    this.tiny[0].height = this.tiny[1].height = this.axisX ? rows : seamRow;
    this.rasterText();
    this.paintBase();
    this.render();
  }

  /**
   * VELORA and the two names as lettering bulbs on a finer grid (half the board pitch, so the
   * letters read). Rasterised from our own text canvas, which holds no media and is safe to read.
   * Board bulbs behind a name are marked so they dim and the lettering stands out.
   */
  private rasterText() {
    const { w, h } = this;
    const c = makeCanvas(w, h);
    const g = c.getContext("2d", { willReadFrequently: true })!;
    const fp = (this.fine = this.pitch * 0.5);
    const fit = (text: string, font: (px: number) => string, maxW: number, maxH: number, stretch?: CanvasFontStretch) => {
      g.fontStretch = stretch ?? "normal";
      let px = maxH;
      g.font = font(px);
      const m = g.measureText(text).width;
      if (m > maxW) px = (px * maxW) / m;
      g.font = font(px);
      return px;
    };
    const xs: number[] = [];
    const ys: number[] = [];
    const kinds: number[] = [];
    const letters: number[] = [];
    const sample = (kind: number, letterAt: (x: number) => number) => {
      const data = g.getImageData(0, 0, c.width, c.height).data;
      const x0 = this.ox - this.pitch / 2 + fp / 2;
      const y0 = this.oy - this.pitch / 2 + fp / 2;
      for (let y = y0; y < h; y += fp)
        for (let x = x0; x < w; x += fp) {
          const a = data[(Math.round(y) * c.width + Math.round(x)) * 4 + 3];
          if (a > 120) {
            xs.push(x);
            ys.push(y);
            kinds.push(kind);
            letters.push(letterAt(x));
          }
        }
    };
    g.textBaseline = "middle";
    g.textAlign = "left";
    g.fillStyle = "#fff";

    // VELORA, letter by letter
    const word = "VELORA";
    fit(word, (px) => `800 ${px}px ${this.fonts.wonder}`, w * 0.72, h * (this.axisX ? 0.42 : 0.24));
    const total = g.measureText(word).width;
    const lx0 = (w - total) / 2;
    const edges = [0];
    for (let k = 1; k <= word.length; k++) edges.push(g.measureText(word.slice(0, k)).width);
    g.fillText(word, lx0, h / 2);
    sample(0, (x) => {
      let L = 0;
      while (L < word.length - 1 && x - lx0 > edges[L + 1]) L++;
      return L;
    });

    // World names, one per half
    g.clearRect(0, 0, w, h);
    const halfW = this.axisX ? w / 2 : w;
    const halfH = this.axisX ? h : h / 2;
    const names: [string, (px: number) => string, CanvasFontStretch | undefined][] = [
      ["WONDERVERSE", (px) => `800 ${px}px ${this.fonts.wonder}`, undefined],
      ["THRILLVERSE", (px) => `italic 900 ${px}px ${this.fonts.thrill}`, "expanded"],
    ];
    this.nameLit.fill(0);
    names.forEach(([text, font, stretch], sd) => {
      g.clearRect(0, 0, w, h);
      // Portrait halves are narrow: the name stacks on two lines (WONDER / VERSE) so its letters read.
      const lines = this.axisX ? [text] : [text.slice(0, -5), text.slice(-5)];
      const longest = lines.reduce((a, b) => (b.length > a.length ? b : a));
      const px = fit(longest, font, halfW * (this.axisX ? 0.84 : 0.8), halfH * (this.axisX ? 0.26 : 0.2), stretch);
      const lh = px * 0.92;
      const ox = this.axisX ? sd * halfW : 0;
      const oy = this.axisX ? 0 : sd * halfH;
      const cy = oy + halfH * (this.axisX ? 0.36 : 0.37);
      let left = w;
      let right = 0;
      lines.forEach((line, k) => {
        const tw = g.measureText(line).width;
        const tx = ox + (halfW - tw) / 2;
        left = Math.min(left, tx);
        right = Math.max(right, tx + tw);
        g.fillText(line, tx, cy + (k - (lines.length - 1) / 2) * lh);
      });
      sample(1 + sd, () => -1);
      // the plate behind the name: board bulbs here dim
      const pad = this.pitch * 1.5;
      const top = cy - (lines.length * lh) / 2 - pad;
      const bottom = cy + (lines.length * lh) / 2 + pad;
      for (let i = 0; i < this.n; i++) {
        const x = this.cx[i];
        const y = this.cy[i];
        if (x > left - pad && x < right + pad && y > top && y < bottom) this.nameLit[i] = 1;
      }
    });
    g.fontStretch = "normal";
    this.lx = Float32Array.from(xs);
    this.ly = Float32Array.from(ys);
    this.lkind = Uint8Array.from(kinds);
    this.lletter = Int8Array.from(letters);
  }

  /** Unlit glass bulbs, painted once per layout. */
  private paintBase() {
    const b = (this.base = makeCanvas(this.canvas.width, this.canvas.height));
    const g = b.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    g.fillStyle = BOARD;
    g.fillRect(0, 0, this.w, this.h);
    const s = this.pitch * 0.9;
    for (let i = 0; i < this.n; i++) g.drawImage(this.glass, this.cx[i] - s / 2, this.cy[i] - s / 2, s, s);
  }

  private step(dt: number) {
    this.t += dt;
    const e = 1 - Math.exp(-dt * 7);
    this.lit[0] += ((this.hover === 0 ? 1 : this.hover === 1 ? -1 : 0) - this.lit[0]) * e;
    this.lit[1] += ((this.hover === 1 ? 1 : this.hover === 0 ? -1 : 0) - this.lit[1]) * e;
    this.wand += (this.wandTarget - this.wand) * (1 - Math.exp(-dt * 5));
    this.render();
  }

  render() {
    const { ctx, lctx, dpr, pitch, n, params: P } = this;
    if (!this.base || !n) return;
    const bloom = P.bloom;
    const ch = this.chosen;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(this.base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // ---- screens: bulb mask, then the film pixelated one pixel per bulb ----
    const frames = [this.clips[0].frame(), this.clips[1].frame()];
    if (P.screen > 0.001) {
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = "source-over";
      lctx.clearRect(0, 0, this.layer.width, this.layer.height);
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const R = 120;
      const R2 = R * R;
      const wand = this.wand;
      const front = P.screen * 1.25;
      for (let i = 0; i < n; i++) {
        if (this.chase[i] >= 0 && bloom < 0.01) continue;
        const sd = this.side[i] as Side;
        // switch-on ripple from the centre
        const on = Math.min(1, Math.max(0, (front - this.dist[i]) * 6));
        if (on <= 0) continue;
        const lit = this.lit[sd];
        let k = 0.78 + 0.16 * lit;
        let a = 0.86 + 0.14 * lit;
        if (lit < 0) a = 0.86 + 0.5 * lit;
        if (wand > 0.01) {
          const dx = this.cx[i] - this.px;
          const dy = this.cy[i] - this.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const f = 1 - d2 / R2;
            k += 0.42 * f * f * wand;
            a = Math.min(1, a + 0.4 * f * wand);
          }
        }
        if (ch !== null) {
          if (sd === ch) k += bloom * bloom * 2.2;
          else a *= 1 - Math.min(1, bloom * 1.6);
        }
        if (this.nameLit[i]) a *= 1 - 0.72 * P.names * (1 - bloom);
        a *= on;
        if (a <= 0.01) continue;
        const s = pitch * k * on;
        lctx.globalAlpha = a;
        lctx.drawImage(this.white, this.cx[i] - s / 2, this.cy[i] - s / 2, s, s);
      }
      lctx.globalAlpha = 1;
      lctx.globalCompositeOperation = "source-in";
      lctx.imageSmoothingEnabled = false;
      // The chosen world is drawn last: its film grows over the whole board while it blooms.
      const order: Side[] = ch === 0 ? [1, 0] : [0, 1];
      for (const sd of order) {
        const f = frames[sd];
        const tc = this.tiny[sd];
        const tg = tc.getContext("2d")!;
        if (f) drawCover(tg, f, 0, 0, tc.width, tc.height);
        else {
          tg.fillStyle = sd === 0 ? "#e8b04b" : "#2e2bff";
          tg.fillRect(0, 0, tc.width, tc.height);
        }
        const half = this.axisX ? { x: 0, y: 0, w: this.w / 2, h: this.h } : { x: 0, y: 0, w: this.w, h: this.h / 2 };
        if (sd === 1) {
          if (this.axisX) half.x = this.w / 2;
          else half.y = this.h / 2;
        }
        // While a world blooms, its film stretches over the whole board.
        if (ch === sd && bloom > 0) {
          const g = bloom * bloom;
          half.x *= 1 - g;
          half.y *= 1 - g;
          half.w += (this.w - half.w) * g;
          half.h += (this.h - half.h) * g;
        }
        // Clip to this world's half: "source-in" would otherwise wipe the other half's bulbs.
        lctx.save();
        lctx.beginPath();
        lctx.rect(half.x, half.y, half.w, half.h);
        lctx.clip();
        lctx.drawImage(tc, half.x, half.y, half.w, half.h);
        lctx.restore();
      }
      lctx.imageSmoothingEnabled = true;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.layer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // ---- warm filament bulbs: the chase round the frame and down the seam ----
    ctx.globalCompositeOperation = "lighter";
    const ws = pitch * 2.6;
    const chaseOn = P.frame * (1 - Math.min(1, bloom * 2));
    const tt = this.t * 9;
    const logoOut = 1 - P.screen;
    const names = P.names * (1 - Math.min(1, bloom * 2.5));
    for (let i = 0; i < n; i++) {
      let a = 0;
      const k = this.chase[i];
      if (k >= 0 && chaseOn > 0) {
        const ph = (k - tt) % 4;
        // the seam between the worlds lights only once the screens are on
        const on = this.seam[i] ? chaseOn * P.screen : chaseOn;
        a = (ph < 0 ? ph + 4 : ph) < 1.4 ? on : on * 0.22;
      }
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(this.warm, this.cx[i] - ws / 2, this.cy[i] - ws / 2, ws, ws);
    }
    // lettering on the fine grid
    const fs = this.fine * 2.4;
    for (let j = 0; j < this.lx.length; j++) {
      const kind = this.lkind[j];
      let a = 0;
      if (kind === 0) {
        if (logoOut <= 0) continue;
        const L = this.lletter[j];
        const v = Math.min(1, Math.max(0, P.logo - L));
        a = v * logoOut * (0.84 + 0.16 * Math.sin(this.t * 3 + L));
      } else {
        if (names <= 0) continue;
        const lit = this.lit[(kind - 1) as Side];
        const twinkle = 0.88 + 0.12 * Math.sin(this.t * 5 + j * 0.61);
        a = names * twinkle * (lit < 0 ? 0.5 + 0.5 * (1 + lit) : 0.86 + 0.14 * lit);
      }
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(this.warm, this.lx[j] - fs / 2, this.ly[j] - fs / 2, fs, fs);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // ---- the chosen film resolves out of the bulbs ----
    if (ch !== null && bloom > 0.55) {
      const f = frames[ch];
      if (f) {
        ctx.globalAlpha = Math.min(1, (bloom - 0.55) / 0.4);
        drawCover(ctx, f, 0, 0, this.w, this.h);
        ctx.globalAlpha = 1;
      }
    }
  }

  destroy() {
    this.loop.set(false);
  }
}
