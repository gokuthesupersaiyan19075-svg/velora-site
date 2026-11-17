/**
 * Lights layer for "The Night Sky" entrance: the park from above at dusk turning to night.
 * One 2D canvas, pre-rendered glow sprites (drawImage only, no per-frame gradients or filters),
 * a frame cap (30 fps at rest, 48 while something is lit or moving) and a full stop whenever
 * the canvas is off-screen, the tab is hidden, the view is zoomed in or motion is reduced.
 */

export type DistrictKey = "w" | "t";
export type Anchor = { cx: number; cy: number; R: number };
type Rect = { left: number; top: number; right: number; bottom: number };

/** A light. Rotating lights keep polar coordinates around their district's centre. */
type Pt = {
  x: number;
  y: number;
  r: number;
  a: number;
  ph: number;
  sp: number;
  on: number;
  polar?: { pr: number; pa: number; spin: number; ry?: number };
};

type District = {
  key: DistrictKey;
  anchor: Anchor;
  pts: Pt[];
  edges: [number, number][];
  track: number[];
  lit: number;
  /** Per-frame resolved positions, allocated once. */
  xs: Float32Array;
  ys: Float32Array;
  depth: Float32Array;
};

const district = (key: DistrictKey, anchor: Anchor, pts: Pt[], edges: [number, number][], track: number[]): District => ({
  key,
  anchor,
  pts,
  edges,
  track,
  lit: 0,
  xs: new Float32Array(pts.length),
  ys: new Float32Array(pts.length),
  depth: new Float32Array(pts.length).fill(1),
});

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sprite(size: number, stops: [number, string][]) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Catmull-Rom through control points, `n` samples. */
function spline(ctrl: [number, number][], n: number): [number, number][] {
  const out: [number, number][] = [];
  const seg = ctrl.length - 1;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * seg;
    const k = Math.min(seg - 1, Math.floor(u));
    const t = u - k;
    const p0 = ctrl[Math.max(0, k - 1)];
    const p1 = ctrl[k];
    const p2 = ctrl[k + 1];
    const p3 = ctrl[Math.min(seg, k + 2)];
    const t2 = t * t;
    const t3 = t2 * t;
    const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

/** Wonderverse: a big wheel (it turns while lit), a carousel ring and a string of garden lamps. */
function buildWonder(A: Anchor, rnd: () => number): District {
  const pts: Pt[] = [];
  const edges: [number, number][] = [];
  const { cx, cy, R } = A;
  const add = (x: number, y: number, r: number, on: number, polar?: Pt["polar"]) => {
    pts.push({ x: cx + x * R, y: cy + y * R, r, a: 0.75 + rnd() * 0.25, ph: rnd() * 6.28, sp: 0.6 + rnd() * 1.2, on, polar });
    return pts.length - 1;
  };
  const hub = add(0, 0, 3.4, 0.55);
  const ring: number[] = [];
  for (let i = 0; i < 36; i++) {
    const pa = (i / 36) * Math.PI * 2;
    ring.push(add(0, 0, 1.9, 0.5 + (i / 36) * 0.35, { pr: 0.84 * R, pa, spin: 1 }));
  }
  ring.forEach((p, i) => edges.push([p, ring[(i + 1) % ring.length]]));
  for (let i = 0; i < 9; i++) {
    const pa = (i / 9) * Math.PI * 2;
    const g = add(0, 0, 3.3, 0.6 + i * 0.03, { pr: 0.94 * R, pa, spin: 1 });
    edges.push([hub, g]);
    for (const f of [0.32, 0.56]) add(0, 0, 1.3, 0.62, { pr: f * R, pa, spin: 1 });
  }
  // Legs
  for (const side of [-1, 1]) {
    let prev = hub;
    for (let k = 1; k <= 5; k++) {
      const p = add(side * 0.1 * k, 0.2 * k, 1.5, 0.5 + k * 0.03);
      edges.push([prev, p]);
      prev = p;
    }
  }
  // Carousel: an ellipse of lights that spins quicker, front half brighter.
  const cRing: number[] = [];
  const ccx = 1.5;
  const ccy = 0.62;
  for (let i = 0; i < 16; i++) {
    const pa = (i / 16) * Math.PI * 2;
    const p = pts.length;
    pts.push({ x: cx + ccx * R, y: cy + ccy * R, r: 2.1, a: 0.9, ph: rnd() * 6.28, sp: 1, on: 0.6, polar: { pr: 0.36 * R, pa, spin: 3.2, ry: 0.32 } });
    cRing.push(p);
  }
  cRing.forEach((p, i) => edges.push([p, cRing[(i + 1) % cRing.length]]));
  const top = add(ccx, ccy - 0.36, 2.8, 0.66);
  edges.push([top, cRing[0]], [top, cRing[8]]);
  // Garden lamps on the far side
  const path = spline(
    [
      [-1.85, 0.95],
      [-1.55, 0.55],
      [-1.35, -0.1],
      [-1.55, -0.7],
    ],
    12,
  );
  let prev = -1;
  path.forEach(([x, y], i) => {
    const p = add(x, y, 1.6, 0.4 + i * 0.03);
    if (prev >= 0) edges.push([prev, p]);
    prev = p;
  });
  return district("w", A, pts, edges, []);
}

/** Thrillverse: a coaster with a lift hill, a drop, a full loop and a camelback; a train runs it while lit. */
function buildThrill(A: Anchor, rnd: () => number): District {
  const pts: Pt[] = [];
  const edges: [number, number][] = [];
  const { cx, cy, R } = A;
  const add = (x: number, y: number, r: number, on: number) => {
    pts.push({ x: cx + x * R, y: cy + y * R, r, a: 0.75 + rnd() * 0.25, ph: rnd() * 6.28, sp: 0.8 + rnd() * 1.4, on });
    return pts.length - 1;
  };
  const track: number[] = [];
  const a = spline(
    [
      [-1.92, 0.95],
      [-1.74, 0.62],
      [-1.46, -0.72],
      [-1.24, -0.9],
      [-1.02, -0.52],
      [-0.78, 0.82],
      [-0.38, 0.98],
      [0, 0.86],
    ],
    38,
  );
  a.forEach(([x, y], i) => track.push(add(x, y, 1.8, 0.45 + (i / a.length) * 0.25)));
  const loopR = 0.84;
  for (let i = 1; i < 36; i++) {
    const ang = Math.PI / 2 - (i / 36) * Math.PI * 2; // from the bottom, round the loop
    track.push(add(Math.cos(ang) * loopR * 1.0 + (i / 36) * 0.14, Math.sin(ang) * loopR, 1.9, 0.7));
  }
  const b = spline(
    [
      [0.14, 0.86],
      [0.55, 0.98],
      [0.96, 0.62],
      [1.26, -0.06],
      [1.52, 0.4],
      [1.72, 0.86],
      [1.94, 0.95],
    ],
    30,
  );
  b.slice(1).forEach(([x, y], i) => track.push(add(x, y, 1.8, 0.75 + (i / b.length) * 0.2)));
  for (let i = 0; i < track.length - 1; i++) edges.push([track[i], track[i + 1]]);
  // Supports under the lift hill and the camelback
  for (const [sx, top] of [
    [-1.42, -0.62],
    [-1.12, -0.74],
    [1.26, 0.04],
  ] as const) {
    let prev = -1;
    for (let k = 0; k <= 4; k++) {
      const p = add(sx, top + ((0.98 - top) * k) / 4, 1.1, 0.5 + k * 0.04);
      if (prev >= 0) edges.push([prev, p]);
      prev = p;
    }
  }
  return district("t", A, pts, edges, track);
}

export class SkyEngine {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private W = 0;
  private H = 0;
  private stars: Pt[] = [];
  private lamps: (Pt & { warm: boolean })[] = [];
  private d: District[] = [];
  private sprites: Record<"w" | "t" | "train" | "warm" | "cool", HTMLCanvasElement>;
  private hover: DistrictKey | null = null;
  private intro = 0;
  private raf = 0;
  private running = false;
  private lastDraw = 0;
  private lastT = 0;
  private time = 0;
  private spin = { w: 0, t: 0 };
  private train = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: true })!;
    this.sprites = {
      w: sprite(48, [
        [0, "rgba(255,247,228,1)"],
        [0.16, "rgba(246,206,126,0.95)"],
        [0.42, "rgba(232,176,75,0.32)"],
        [1, "rgba(232,176,75,0)"],
      ]),
      t: sprite(48, [
        [0, "rgba(255,255,255,1)"],
        [0.16, "rgba(196,206,255,0.95)"],
        [0.44, "rgba(84,92,255,0.38)"],
        [1, "rgba(46,43,255,0)"],
      ]),
      train: sprite(48, [
        [0, "rgba(255,255,240,1)"],
        [0.2, "rgba(255,206,64,1)"],
        [0.5, "rgba(255,184,0,0.35)"],
        [1, "rgba(255,184,0,0)"],
      ]),
      warm: sprite(32, [
        [0, "rgba(255,236,200,0.95)"],
        [0.25, "rgba(255,196,120,0.45)"],
        [1, "rgba(255,180,90,0)"],
      ]),
      cool: sprite(32, [
        [0, "rgba(236,242,255,0.95)"],
        [0.25, "rgba(170,190,255,0.4)"],
        [1, "rgba(150,170,255,0)"],
      ]),
    };
  }

  /** Rebuild every light for a new size. `avoid` keeps lamps out from behind text. */
  layout(W: number, H: number, w: Anchor, t: Anchor, avoid: Rect[]) {
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    const rnd = mulberry(20261115);
    const inDistrict = (x: number, y: number) =>
      [w, t].some((A) => Math.abs(x - A.cx) < A.R * 2.05 && Math.abs(y - A.cy) < A.R * 1.12);
    const blocked = (x: number, y: number) => avoid.some((r) => x > r.left - 8 && x < r.right + 8 && y > r.top - 8 && y < r.bottom + 8);

    const area = W * H;
    this.stars = [];
    const starCount = Math.min(170, Math.round(area / 8500));
    for (let i = 0; i < starCount; i++) {
      const x = rnd() * W;
      const y = Math.pow(rnd(), 1.6) * H * 0.62;
      if (blocked(x, y)) continue;
      this.stars.push({ x, y, r: rnd() < 0.12 ? 1.6 : 1, a: 0.25 + rnd() * 0.6, ph: rnd() * 6.28, sp: 0.4 + rnd() * 1.6, on: rnd() * 0.55 });
    }

    // Park lamps seen from above: a promenade between the districts plus a few winding paths.
    this.lamps = [];
    const pushLamp = (x: number, y: number) => {
      if (x < 4 || x > W - 4 || y < 4 || y > H - 4 || inDistrict(x, y) || blocked(x, y)) return;
      this.lamps.push({ x, y, r: 0.9 + rnd() * 1.1, a: 0.35 + rnd() * 0.5, ph: rnd() * 6.28, sp: 0.3 + rnd(), on: 0.15 + rnd() * 0.6, warm: rnd() < 0.7 });
    };
    const lampBudget = Math.min(240, Math.round(area / 6500));
    const paths: [number, number][][] = [
      spline([[w.cx, w.cy + w.R * 1.2], [(w.cx + t.cx) / 2, Math.max(w.cy, t.cy) + Math.min(w.R, t.R) * 1.6], [t.cx, t.cy + t.R * 1.2]], 26),
      spline([[0, H * 0.82], [W * 0.3, H * 0.9], [W * 0.62, H * 0.84], [W, H * 0.95]], 30),
      spline([[W * 0.08, H], [W * 0.18, H * 0.7], [W * 0.1, H * 0.45]], 14),
      spline([[W * 0.92, H], [W * 0.84, H * 0.72], [W * 0.95, H * 0.48]], 14),
    ];
    paths.forEach((p) => p.forEach(([x, y]) => pushLamp(x + (rnd() - 0.5) * 6, y + (rnd() - 0.5) * 6)));
    let guard = 0;
    while (this.lamps.length < lampBudget && guard++ < lampBudget * 6) pushLamp(rnd() * W, H * 0.4 + Math.pow(rnd(), 0.8) * H * 0.6);

    const prevLit = Object.fromEntries(this.d.map((d) => [d.key, d.lit]));
    this.d = [buildWonder(w, rnd), buildThrill(t, rnd)];
    this.d.forEach((d) => (d.lit = prevLit[d.key] ?? 0));
    this.draw(true);
  }

  setHover(k: DistrictKey | null) {
    this.hover = k;
    this.wake();
  }

  setIntro(p: number) {
    this.intro = p;
    if (!this.running) this.draw(true);
  }

  /** Start/stop the loop. Stopped, the canvas keeps its last frame. */
  setRunning(on: boolean) {
    if (on === this.running) return;
    this.running = on;
    if (on) {
      this.lastT = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.draw(true);
    }
  }

  /** Static mode (reduced motion): one frame per change. */
  wake() {
    if (!this.running) this.draw(true);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.running = false;
  }

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const busy = this.hover !== null || this.intro < 1 || this.d.some((d) => d.lit > 0.36);
    const interval = 1000 / (busy ? 48 : 30);
    if (now - this.lastDraw < interval - 1) return;
    this.lastDraw = now;
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    this.lastT = now;
    this.time += dt;
    this.draw(false, dt);
  };

  private draw(still: boolean, dt = 0) {
    const { ctx, W, H } = this;
    if (!W || !H) return;
    const p = this.intro;
    const t = this.time;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ramp = (on: number) => Math.min(1, Math.max(0, (p - on) / 0.12));

    // Stars: plain 1px squares.
    ctx.fillStyle = "#e6ecff";
    for (const s of this.stars) {
      const v = ramp(s.on);
      if (!v) continue;
      ctx.globalAlpha = v * s.a * (still ? 0.85 : 0.6 + 0.4 * Math.sin(t * s.sp + s.ph));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }

    for (const l of this.lamps) {
      const v = ramp(l.on);
      if (!v) continue;
      ctx.globalAlpha = v * l.a * (still ? 0.9 : 0.82 + 0.18 * Math.sin(t * l.sp + l.ph));
      const size = l.r * 7;
      ctx.drawImage(l.warm ? this.sprites.warm : this.sprites.cool, l.x - size / 2, l.y - size / 2, size, size);
    }

    for (const d of this.d) {
      const target = this.hover === d.key ? 1 : this.hover ? 0.12 : 0.3;
      if (!this.running) d.lit = target;
      else if (dt) d.lit += (target - d.lit) * (1 - Math.exp(-dt * 5));
      const lit = d.lit;
      if (d.key === "w") this.spin.w += dt * (0.05 + lit * 0.22);
      else this.spin.t += dt * (0.2 + lit * 1.2);
      const ang = d.key === "w" ? this.spin.w : this.spin.t;

      // Resolve positions: rotating lights turn around their own centre (pt.x, pt.y).
      const { xs, ys, depth } = d;
      d.pts.forEach((pt, i) => {
        if (pt.polar) {
          const a = pt.polar.pa + ang * pt.polar.spin;
          xs[i] = pt.x + Math.cos(a) * pt.polar.pr;
          ys[i] = pt.y + Math.sin(a) * pt.polar.pr * (pt.polar.ry ?? 1);
          depth[i] = pt.polar.ry ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(a)) : 1;
        } else {
          xs[i] = pt.x;
          ys[i] = pt.y;
          depth[i] = 1;
        }
      });

      // Constellation lines, drawn as one path.
      const lineA = ramp(0.55) * (0.08 + lit * 0.42);
      if (lineA > 0.01) {
        ctx.globalAlpha = lineA;
        ctx.strokeStyle = d.key === "w" ? "#f2c66f" : "#aab4ff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const [a, b] of d.edges) {
          ctx.moveTo(xs[a], ys[a]);
          ctx.lineTo(xs[b], ys[b]);
        }
        ctx.stroke();
      }

      // Train: a bright run of lights travelling the track.
      let head = -1;
      if (d.key === "t" && d.track.length) {
        this.train = (this.train + dt * (14 + lit * 46)) % d.track.length;
        head = this.train;
      }

      const spr = d.key === "w" ? this.sprites.w : this.sprites.t;
      const grow = 1 + lit * 0.4;
      d.pts.forEach((pt, i) => {
        const v = ramp(pt.on);
        if (!v) return;
        const tw = still ? 1 : 0.8 + 0.2 * Math.sin(t * pt.sp + pt.ph);
        ctx.globalAlpha = Math.min(1, v * pt.a * (0.42 + lit * 0.58) * tw * depth[i]);
        const size = pt.r * 6.5 * grow;
        ctx.drawImage(spr, xs[i] - size / 2, ys[i] - size / 2, size, size);
      });
      if (head >= 0 && lit > 0.05 && !still) {
        const n = d.track.length;
        for (let k = 0; k < 6; k++) {
          const idx = d.track[Math.floor((head - k * 1.4 + n) % n)];
          ctx.globalAlpha = Math.min(1, lit * (1 - k / 7)) * ramp(0.6);
          const size = (2.2 - k * 0.2) * 9;
          ctx.drawImage(this.sprites.train, xs[idx] - size / 2, ys[idx] - size / 2, size, size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
