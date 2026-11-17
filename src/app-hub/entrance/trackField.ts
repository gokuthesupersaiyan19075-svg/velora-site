/**
 * Canvas engine for "The Switch Track" entrance: a coaster station at golden hour.
 * One train waits in the middle. To the left, a gentle track runs to the Ferris wheel (Wonderverse);
 * to the right, a lift hill drops into a vertical loop (Thrillverse). Each world's film plays inside
 * its portal: the wheel's rim and the loop. Throwing the points lights the chosen line; riding it
 * carries the train (and the camera) there, and the portal opens to fill the screen.
 *
 * Cost control: sky, sun and hills are painted once per layout; per frame only the track,
 * the wheel, the train and sprites are drawn. The loop stops off-screen, hidden or reduced.
 */
import { CanvasClip, drawCover, Loop, makeCanvas } from "./canvasMedia";

export type Side = 0 | 1; // 0 = Wonderverse (wheel, left), 1 = Thrillverse (loop, right)
type P = { x: number; y: number };

class Path {
  xs: Float32Array;
  ys: Float32Array;
  ls: Float32Array;
  length: number;
  constructor(pts: P[]) {
    const n = pts.length;
    this.xs = new Float32Array(n);
    this.ys = new Float32Array(n);
    this.ls = new Float32Array(n);
    let L = 0;
    for (let i = 0; i < n; i++) {
      this.xs[i] = pts[i].x;
      this.ys[i] = pts[i].y;
      if (i) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      this.ls[i] = L;
    }
    this.length = L;
  }
  /** Position and heading at arc length s (clamped; extended straight past the ends). */
  at(s: number) {
    const { xs, ys, ls } = this;
    const n = xs.length;
    if (s <= 0 || s >= this.length) {
      const [a, b] = s <= 0 ? [0, 1] : [n - 2, n - 1];
      const ang = Math.atan2(ys[b] - ys[a], xs[b] - xs[a]);
      const over = s <= 0 ? s : s - this.length;
      const bx = s <= 0 ? xs[0] : xs[n - 1];
      const by = s <= 0 ? ys[0] : ys[n - 1];
      return { x: bx + Math.cos(ang) * over, y: by + Math.sin(ang) * over, ang };
    }
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (ls[m] < s) lo = m;
      else hi = m;
    }
    const t = (s - ls[lo]) / (ls[hi] - ls[lo] || 1);
    return { x: xs[lo] + (xs[hi] - xs[lo]) * t, y: ys[lo] + (ys[hi] - ys[lo]) * t, ang: Math.atan2(ys[hi] - ys[lo], xs[hi] - xs[lo]) };
  }
  /** Arc length of the first point where `test` holds. */
  find(test: (x: number, y: number) => boolean) {
    for (let i = 0; i < this.xs.length; i++) if (test(this.xs[i], this.ys[i])) return this.ls[i];
    return this.length;
  }
}

function bez(out: P[], p0: P, p1: P, p2: P, p3: P, step = 5) {
  const est = Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y) + Math.hypot(p3.x - p2.x, p3.y - p2.y);
  const n = Math.max(4, Math.ceil(est / step));
  for (let i = out.length ? 1 : 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}
const lineTo = (out: P[], p: P) => bez(out, out[out.length - 1], out[out.length - 1], p, p);

function glow(size: number, stops: [number, string][]) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

const INK = "#1d0f24";
const RAIL = "#170a1c";
const WARM = "#ffd9a0";

type Ride = {
  side: Side;
  path: Path;
  s: number;
  v: number;
  liftTop: number;
  yTop: number;
  arriveAt: number;
  dropped: boolean;
  arrived: boolean;
  iris: number;
  done: boolean;
  cb: RideCallbacks;
};
export type RideCallbacks = { onDrop?: () => void; onArrive?: () => void; onDone: () => void };

/** Opening: the track draws out from the station (0..1) and the lights come on (0..1). */
export type TrackParams = { draw: number; lights: number };

export class TrackEngine {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private sky: HTMLCanvasElement | null = null;
  private warm: HTMLCanvasElement;
  private lamp: HTMLCanvasElement;
  private station!: Path;
  private branch: [Path, Path] = [new Path([{ x: 0, y: 0 }, { x: 1, y: 0 }]), new Path([{ x: 0, y: 0 }, { x: 1, y: 0 }])];
  private rideW!: Path;
  private rideT!: Path;
  private liftTopS = 0;
  private loopRange: [number, number] = [0, 0];
  private ground = 0;
  private wheel = { x: 0, y: 0, r: 0 };
  private loopC = { x: 0, y: 0, r: 0 };
  private car = 30;
  private points: Side | null = null;
  private glowSide: [number, number] = [0, 0];
  private bladeT = 0.5;
  private t = 0;
  private ride: Ride | null = null;
  private cam = { x: 0, y: 0, k: 1 };
  private loop: Loop;

  constructor(
    private canvas: HTMLCanvasElement,
    private clips: [CanvasClip, CanvasClip],
    readonly params: TrackParams,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.warm = glow(64, [
      [0, "rgba(255,248,230,1)"],
      [0.2, "rgba(255,214,140,0.9)"],
      [0.5, "rgba(255,160,70,0.25)"],
      [1, "rgba(255,120,40,0)"],
    ]);
    this.lamp = glow(256, [
      [0, "rgba(255,240,200,0.55)"],
      [0.3, "rgba(255,200,120,0.18)"],
      [1, "rgba(255,170,80,0)"],
    ]);
    this.loop = new Loop((dt) => this.step(dt), 60);
  }

  get busy() {
    return !!this.ride;
  }

  setRunning(on: boolean) {
    this.loop.set(on);
    if (!on) this.render();
  }

  setPoints(s: Side | null) {
    if (this.ride) return;
    this.points = s;
    if (!this.loop.isRunning) {
      this.glowSide = [s === 0 ? 1 : 0, s === 1 ? 1 : 0];
      this.bladeT = s === null ? 0.5 : s;
      this.render();
    }
  }

  /** Where each portal sits on screen (for placing labels). */
  portals() {
    return { wheel: { ...this.wheel }, loop: { ...this.loopC } };
  }

  layout(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const wide = w >= 768 && w >= h * 0.95;
    const yS = h * (wide ? 0.66 : 0.57);
    this.ground = yS + h * (wide ? 0.07 : 0.05);
    this.car = Math.max(20, Math.min(36, w * 0.024));
    const sL = { x: w * (wide ? 0.42 : 0.33), y: yS };
    const sR = { x: w * (wide ? 0.58 : 0.67), y: yS };
    this.station = new Path(lineTo([sL], sR));

    // Wonderverse: a gentle, rolling line to the wheel, and on out of the picture.
    const wr = wide ? Math.min(h * 0.23, w * 0.13) : Math.min(w * 0.24, h * 0.15);
    const wx = w * (wide ? 0.17 : 0.25);
    this.wheel = { x: wx, y: yS - h * 0.04 - wr, r: wr };
    const bw: P[] = [sL];
    bez(bw, sL, { x: sL.x - w * 0.05, y: yS }, { x: sL.x - w * 0.07, y: yS + h * 0.035 }, { x: (sL.x + wx) / 2, y: yS + h * 0.02 });
    bez(bw, bw[bw.length - 1], { x: (sL.x + wx) / 2 - w * 0.05, y: yS }, { x: wx + w * 0.06, y: yS - h * 0.025 }, { x: wx, y: yS });
    bez(bw, bw[bw.length - 1], { x: wx - w * 0.06, y: yS + h * 0.02 }, { x: -w * 0.05, y: yS }, { x: -w * 0.15, y: yS });
    this.branch[0] = new Path(bw);

    // Thrillverse: lift hill (wide screens), the drop, the loop, and away.
    const R = wide ? Math.min(h * 0.19, w * 0.1) : Math.min(w * 0.19, h * 0.11);
    const d = R * 0.5;
    const cx = w - R - d / 2 - w * (wide ? 0.035 : 0.05);
    const yL = yS + h * 0.02;
    const cy = yL - R;
    this.loopC = { x: cx, y: cy, r: R };
    const entry = { x: cx - d / 2, y: yL };
    const bt: P[] = [sR];
    let topY = yS;
    if (wide) {
      const top = { x: w * 0.68, y: h * 0.24 };
      topY = top.y;
      bez(bt, sR, { x: sR.x + w * 0.03, y: yS }, { x: w * 0.62, y: yS - h * 0.06 }, { x: w * 0.635, y: yS - h * 0.13 });
      bez(bt, bt[bt.length - 1], { x: w * 0.65, y: yS - h * 0.24 }, { x: top.x - w * 0.04, y: top.y }, top);
      bez(bt, top, { x: top.x + w * 0.045, y: top.y }, { x: entry.x - w * 0.09, y: yL }, { x: entry.x - w * 0.04, y: yL });
      lineTo(bt, entry);
    } else {
      bez(bt, sR, { x: sR.x + w * 0.06, y: yS }, { x: entry.x - w * 0.08, y: yL }, entry);
    }
    const loopStart = bt.length - 1;
    for (let i = 1; i <= 120; i++) {
      const th = (i / 120) * Math.PI * 2;
      bt.push({ x: cx + R * Math.sin(th) + d * (i / 120 - 0.5), y: cy + R * Math.cos(th) });
    }
    const loopEnd = bt.length - 1;
    bez(bt, bt[loopEnd], { x: bt[loopEnd].x + w * 0.04, y: yL }, { x: w * 1.05, y: yL }, { x: w * 1.2, y: yL });
    const tPath = new Path(bt);
    this.branch[1] = tPath;
    this.loopRange = [tPath.ls[loopStart], tPath.ls[loopEnd]];

    // Rides start with the train at the station, facing its line.
    const st = this.station;
    const rev = (p: Path) => Array.from(p.xs, (x, i) => ({ x, y: p.ys[i] })).reverse();
    const fwd = (p: Path) => Array.from(p.xs, (x, i) => ({ x, y: p.ys[i] }));
    this.rideT = new Path([...fwd(st), ...fwd(tPath).slice(1)]);
    this.rideW = new Path([...rev(st), ...fwd(this.branch[0]).slice(1)]);
    this.liftTopS = wide ? st.length + tPath.find((x, y) => y <= topY + 0.5) : st.length;
    this.paintSky(wide);
    this.render();
  }

  /** Golden-hour sky, sun and the hills behind the park: painted once per layout. */
  private paintSky(wide: boolean) {
    const { w, h, dpr } = this;
    const c = (this.sky = makeCanvas(w * dpr, h * dpr));
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    const sky = g.createLinearGradient(0, 0, 0, this.ground);
    sky.addColorStop(0, "#22123d");
    sky.addColorStop(0.38, "#5b2766");
    sky.addColorStop(0.68, "#c24f6a");
    sky.addColorStop(0.88, "#f2895a");
    sky.addColorStop(1, "#ffc27a");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // the sun, setting right behind the station
    const sy = this.ground - h * 0.02;
    const sr = Math.min(w, h) * (wide ? 0.13 : 0.16);
    const halo = g.createRadialGradient(w / 2, sy, sr * 0.6, w / 2, sy, sr * 4.5);
    halo.addColorStop(0, "rgba(255,214,150,0.55)");
    halo.addColorStop(1, "rgba(255,150,90,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, w, h);
    const disc = g.createLinearGradient(0, sy - sr, 0, sy + sr);
    disc.addColorStop(0, "#fff1cc");
    disc.addColorStop(1, "#ffb067");
    g.fillStyle = disc;
    g.beginPath();
    g.arc(w / 2, sy, sr, 0, Math.PI * 2);
    g.fill();
    // far hills, then the park's own ground
    const hills = (base: number, amp: number, col: string, seed: number) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w + 10; x += 10) {
        const y = base - amp * (0.55 + 0.45 * Math.sin(x * 0.004 + seed) * Math.cos(x * 0.0017 + seed * 2));
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.fill();
    };
    hills(this.ground - h * 0.02, h * 0.06, "rgba(122,48,96,0.55)", 1.3);
    hills(this.ground + h * 0.005, h * 0.03, "rgba(66,26,64,0.85)", 4.1);
    g.fillStyle = INK;
    g.fillRect(0, this.ground, w, h - this.ground);
    const fade = g.createLinearGradient(0, this.ground, 0, h);
    fade.addColorStop(0, "rgba(255,170,100,0.10)");
    fade.addColorStop(1, "rgba(0,0,0,0.0)");
    g.fillStyle = fade;
    g.fillRect(0, this.ground, w, h - this.ground);
  }

  startRide(side: Side, cb: RideCallbacks) {
    if (this.ride) return;
    this.points = side;
    const path = side === 1 ? this.rideT : this.rideW;
    const st = this.station.length;
    const trainLen = this.car * 3.3;
    const arriveAt =
      side === 1
        ? st + this.loopRange[0] + (this.loopRange[1] - this.loopRange[0]) * 0.72
        : path.find((x) => x <= this.wheel.x + this.car * 0.5);
    this.ride = {
      side,
      path,
      s: st / 2 + trainLen / 2,
      v: 0,
      liftTop: this.liftTopS,
      yTop: path.at(this.liftTopS).y,
      arriveAt,
      dropped: false,
      arrived: false,
      iris: 0,
      done: false,
      cb,
    };
  }

  private step(dt: number) {
    this.t += dt;
    const e = 1 - Math.exp(-dt * 6);
    const p = this.points;
    this.glowSide[0] += ((p === 0 ? 1 : 0) - this.glowSide[0]) * e;
    this.glowSide[1] += ((p === 1 ? 1 : 0) - this.glowSide[1]) * e;
    this.bladeT += ((p === null ? 0.5 : p) - this.bladeT) * (1 - Math.exp(-dt * 12));
    const r = this.ride;
    if (r) {
      const scale = this.h / 900;
      if (r.side === 1) {
        if (r.s < r.liftTop) r.v += (Math.max(360 * scale, 300) - r.v) * Math.min(1, dt * 3);
        else {
          if (!r.dropped) {
            r.dropped = true;
            r.cb.onDrop?.();
          }
          const y = r.path.at(r.s).y;
          r.v = Math.sqrt(Math.max(360 * 360 * scale * scale, 360 * 360 * scale * scale + 2 * 2400 * scale * (y - r.yTop)));
        }
      } else {
        r.v += (360 * Math.max(0.7, scale) - r.v) * Math.min(1, dt * 2.2);
      }
      if (!r.arrived) {
        r.s += r.v * dt;
        if (r.s >= r.arriveAt) {
          r.arrived = true;
          r.cb.onArrive?.();
        }
      } else {
        r.s += r.v * dt * (r.side === 1 ? 0.6 : 0.25);
        r.iris = Math.min(1, r.iris + dt / 0.85);
        if (r.iris >= 1 && !r.done) {
          r.done = true;
          r.cb.onDone();
        }
      }
      // camera: follow the train, closing in on the portal as it arrives
      const at = r.path.at(r.s);
      const portal = r.side === 1 ? this.loopC : this.wheel;
      const near = r.arrived ? 1 : Math.min(1, Math.max(0, 1 - Math.abs(at.x - portal.x) / (this.w * 0.35)));
      const tx = at.x + (portal.x - at.x) * near * 0.8;
      const ty = at.y + (portal.y - at.y) * near * 0.8;
      const tk = 1.25 + near * 0.45;
      const ce = 1 - Math.exp(-dt * 3.2);
      this.cam.x += (tx - this.cam.x) * ce;
      this.cam.y += (ty - this.cam.y) * ce;
      this.cam.k += (tk - this.cam.k) * ce;
    }
    this.render();
  }

  render() {
    const { ctx, w, h, dpr, params } = this;
    if (!this.sky || !w) return;
    const r = this.ride;
    const cam = r ? this.cam : { x: w / 2, y: h / 2, k: 1 };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    // the sky moves less than the park (depth)
    const kb = 1 + (cam.k - 1) * 0.25;
    const shift = (v: number, half: number) => Math.max(-1, Math.min(1, (v - half) / half)) * half * dpr * (kb - 1) * 0.9;
    ctx.setTransform(kb, 0, 0, kb, dpr * (w / 2) * (1 - kb) - shift(cam.x, w / 2), dpr * (h / 2) * (1 - kb) - shift(cam.y, h / 2));
    ctx.drawImage(this.sky, 0, 0);
    const ox = w / 2 - cam.k * cam.x;
    const oy = h / 2 - cam.k * cam.y;
    ctx.setTransform(dpr * cam.k, 0, 0, dpr * cam.k, dpr * ox, dpr * oy);

    const lights = params.lights;
    this.drawWheel(lights);
    this.drawLoopPortal(lights);
    const draw = params.draw;
    this.drawTrack(this.station, 1, draw, false);
    this.drawTrack(this.branch[0], 0.82 + 0.18 * this.glowSide[0], draw, false);
    this.drawTrack(this.branch[1], 0.82 + 0.18 * this.glowSide[1], draw, true);
    this.drawPoints(lights);
    this.drawChase(lights);
    this.drawTrain(lights);

    // the portal opens: its film grows from the rim to fill the screen
    if (r && r.iris > 0) {
      const portal = r.side === 1 ? this.loopC : this.wheel;
      const f = this.clips[r.side].frame();
      const sx = ox + portal.x * cam.k;
      const sy = oy + portal.y * cam.k;
      const e = r.iris < 0.5 ? 4 * r.iris ** 3 : 1 - (-2 * r.iris + 2) ** 3 / 2;
      const rad = portal.r * cam.k * 0.9 + (Math.hypot(w, h) - portal.r * cam.k * 0.9) * e;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.clip();
      if (f) drawCover(ctx, f, 0, 0, w, h);
      else {
        ctx.fillStyle = r.side === 1 ? "#2e2bff" : "#120c1c";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
  }

  private drawTrack(p: Path, bright: number, draw: number, hasLoop: boolean) {
    const { ctx } = this;
    const n = p.xs.length;
    const upto = p.length * Math.min(1, draw);
    if (upto <= 0) return;
    // supports
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let s = 14; s < upto; s += 26) {
      if (hasLoop && s > this.loopRange[0] && s < this.loopRange[1]) continue;
      const a = p.at(s);
      if (a.y < this.ground - 8 && a.x > -20 && a.x < this.w + 20) {
        ctx.moveTo(a.x, a.y + 4);
        ctx.lineTo(a.x, this.ground);
      }
    }
    ctx.stroke();
    // ties
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let s = 0; s < upto; s += 11) {
      const a = p.at(s);
      const nx = -Math.sin(a.ang) * 5;
      const ny = Math.cos(a.ang) * 5;
      ctx.moveTo(a.x - nx, a.y - ny);
      ctx.lineTo(a.x + nx, a.y + ny);
    }
    ctx.stroke();
    // rails
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = RAIL;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    let first = true;
    for (let i = 0; i < n && p.ls[i] <= upto; i++) {
      if (first) ctx.moveTo(p.xs[i], p.ys[i] - 2);
      else ctx.lineTo(p.xs[i], p.ys[i] - 2);
      first = false;
    }
    ctx.stroke();
    // the sun catches the top rail
    ctx.globalAlpha = 0.28 + 0.5 * (bright - 0.82) / 0.18;
    ctx.strokeStyle = WARM;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawWheel(lights: number) {
    const { ctx } = this;
    const { x, y, r } = this.wheel;
    const spin = this.t * 0.12;
    // film inside the rim
    const f = this.clips[0].frame();
    const show = 0.42 + 0.58 * this.glowSide[0];
    if (f) {
      ctx.save();
      ctx.globalAlpha = show * Math.min(1, this.params.draw * 1.5);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.94, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, f, x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
    // legs
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, this.ground);
    ctx.lineTo(x, y);
    ctx.lineTo(x + r * 0.55, this.ground);
    ctx.stroke();
    // rim and spokes
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = spin + (i / N) * Math.PI * 2;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.stroke();
    // gondolas, hanging level
    ctx.fillStyle = INK;
    for (let i = 0; i < N; i++) {
      const a = spin + (i / N) * Math.PI * 2;
      const gx = x + Math.cos(a) * r;
      const gy = y + Math.sin(a) * r;
      const s = Math.max(6, r * 0.075);
      ctx.beginPath();
      ctx.roundRect(gx - s / 2, gy + 2, s, s * 0.9, 2);
      ctx.fill();
    }
    // lights round the rim
    if (lights > 0) {
      ctx.globalCompositeOperation = "lighter";
      const ls = Math.max(10, r * 0.13);
      for (let i = 0; i < 32; i++) {
        const a = spin + (i / 32) * Math.PI * 2;
        const on = (i + Math.floor(this.t * 6)) % 4 === 0 ? 1 : 0.45;
        ctx.globalAlpha = lights * on * (0.6 + 0.4 * this.glowSide[0]);
        ctx.drawImage(this.warm, x + Math.cos(a) * r - ls / 2, y + Math.sin(a) * r - ls / 2, ls, ls);
      }
      ctx.globalAlpha = lights * 0.9;
      ctx.drawImage(this.warm, x - ls, y - ls, ls * 2, ls * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  private drawLoopPortal(lights: number) {
    const { ctx } = this;
    const { x, y, r } = this.loopC;
    const f = this.clips[1].frame();
    const show = 0.42 + 0.58 * this.glowSide[1];
    if (f) {
      ctx.save();
      ctx.globalAlpha = show * Math.min(1, Math.max(0, this.params.draw * 1.6 - 0.6));
      ctx.beginPath();
      ctx.arc(x, y, r * 0.86, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, f, x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
    if (lights > 0 && this.glowSide[1] > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = lights * this.glowSide[1] * 0.5;
      ctx.drawImage(this.lamp, x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  /** The points at each end of the station, and their signal lamps. */
  private drawPoints(lights: number) {
    const { ctx } = this;
    const st = this.station;
    const ends: [P, Side][] = [
      [{ x: st.xs[0], y: st.ys[0] }, 0],
      [{ x: st.xs[st.xs.length - 1], y: st.ys[st.ys.length - 1] }, 1],
    ];
    for (const [p, s] of ends) {
      const open = s === 0 ? 1 - this.bladeT : this.bladeT; // 1 = this line set
      const mast = Math.max(26, this.car * 1.1);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 4);
      ctx.lineTo(p.x, p.y - mast);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(p.x, p.y - mast, 5, 0, Math.PI * 2);
      ctx.fill();
      if (lights > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = lights * (0.15 + 0.85 * Math.max(0, open * 2 - 1));
        const ls = 26;
        ctx.drawImage(this.warm, p.x - ls / 2, p.y - mast - ls / 2, ls, ls);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }

  /** Lights running along the set line, toward its world. */
  private drawChase(lights: number) {
    if (lights <= 0) return;
    const { ctx } = this;
    ctx.globalCompositeOperation = "lighter";
    const ls = 12;
    for (const s of [0, 1] as Side[]) {
      const g = this.glowSide[s];
      if (g < 0.02) continue;
      const p = this.branch[s];
      const end = s === 1 ? this.loopRange[0] : p.find((x) => x <= this.wheel.x);
      const off = (this.t * 160) % 24;
      for (let d = off; d < end; d += 24) {
        const a = p.at(d);
        const fade = Math.min(1, d / 60) * Math.min(1, (end - d) / 60);
        ctx.globalAlpha = lights * g * fade * 0.9;
        ctx.drawImage(this.warm, a.x - ls / 2, a.y - 3 - ls / 2, ls, ls);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private drawTrain(lights: number) {
    const { ctx, car } = this;
    const r = this.ride;
    const gap = car * 0.15;
    const ch = car * 0.42;
    const cars: { x: number; y: number; ang: number }[] = [];
    if (r) {
      for (let i = 0; i < 3; i++) cars.push(r.path.at(r.s - car / 2 - i * (car + gap)));
    } else {
      const mid = this.station.length / 2;
      const bob = Math.sin(this.t * 2) * 0.6;
      for (let i = -1; i <= 1; i++) {
        const a = this.station.at(mid + i * (car + gap));
        cars.push({ x: a.x, y: a.y + bob, ang: a.ang });
      }
    }
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.ang);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.roundRect(-car / 2, -ch - 3, car, ch, [car * 0.18, car * 0.18, 3, 3]);
      ctx.fill();
      // riders
      ctx.beginPath();
      for (let k = 0; k < 2; k++) {
        const hx = -car * 0.22 + k * car * 0.42;
        ctx.moveTo(hx + car * 0.09, -ch - 3);
        ctx.arc(hx, -ch - 3 - car * 0.09, car * 0.09, 0, Math.PI * 2);
      }
      ctx.fill();
      // a warm stripe along the side
      ctx.fillStyle = "rgba(255,200,130,0.55)";
      ctx.fillRect(-car / 2 + 3, -ch * 0.55 - 3, car - 6, 1.5);
      ctx.restore();
    }
    if (lights > 0) {
      // headlamp(s): the lead car while riding, both ends while waiting
      ctx.globalCompositeOperation = "lighter";
      const lamp = (x: number, y: number, ang: number, dir: number) => {
        const lx = x + Math.cos(ang) * dir * (car / 2);
        const ly = y + Math.sin(ang) * dir * (car / 2) - ch * 0.5;
        ctx.globalAlpha = lights * 0.9;
        ctx.drawImage(this.warm, lx - 9, ly - 9, 18, 18);
        ctx.globalAlpha = lights * 0.35;
        const L = car * 3;
        ctx.drawImage(this.lamp, lx - L / 2 + Math.cos(ang) * dir * L * 0.35, ly - L / 2 + Math.sin(ang) * dir * L * 0.35, L, L);
      };
      if (r) lamp(cars[0].x, cars[0].y, cars[0].ang, 1);
      else {
        lamp(cars[0].x, cars[0].y, cars[0].ang, -1);
        lamp(cars[2].x, cars[2].y, cars[2].ang, 1);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  destroy() {
    this.loop.set(false);
  }
}
