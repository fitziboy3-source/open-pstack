// kit.mjs — dry media on paper, for a 2-D canvas. Units are millimetres; the context is scaled by ppm.
// The look comes from four habits of a hand: strokes tremble, lines overshoot corners, colour is laid in
// hatched passes that multiply where they overlap, and nothing is placed twice in the same spot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

export const TAU = Math.PI * 2;
export const FONTS = { hand: 'Patrick Hand', display: 'Caveat' };
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Registers the bundled fonts once. Returns the family names in use. */
export function registerFonts() {
  const nm = path.join(HERE, '..', 'node_modules', '@fontsource');
  const files = [
    ['patrick-hand/files/patrick-hand-latin-400-normal.woff2', FONTS.hand],
    ['caveat/files/caveat-latin-400-normal.woff2', FONTS.display],
    ['caveat/files/caveat-latin-700-normal.woff2', FONTS.display],
  ];
  for (const [f, fam] of files) { const p = path.join(nm, f); if (!fs.existsSync(p)) throw new Error(`Font missing: ${p}. Run "npm install" in ${path.join(HERE, '..')}.`); GlobalFonts.registerFromPath(p, fam); }
  return FONTS;
}

export function makeRng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.gauss = (m = 0, s = 1) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}
export const rrect = (x0, y0, x1, y1, r, n = 7) => {
  r = Math.max(0.01, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2)); const out = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const t = a0 + (i / n) * Math.PI / 2; out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } };
  corner(x1 - r, y0 + r, -Math.PI / 2); corner(x1 - r, y1 - r, 0); corner(x0 + r, y1 - r, Math.PI / 2); corner(x0 + r, y0 + r, Math.PI);
  return out;
};
export const ell = (cx, cy, rx, ry = rx, rot = 0, n = 64) => { const out = [], c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const t = (i / n) * TAU, x = Math.cos(t) * rx, y = Math.sin(t) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); } return out; };
export const tf = (pts, { x = 0, y = 0, rot = 0, s = 1, sx = 1 } = {}) => { const c = Math.cos(rot), si = Math.sin(rot); return pts.map((p) => { const px = p[0] * s * sx, py = p[1] * s; return [x + px * c - py * si, y + px * si + py * c]; }); };
export const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
export function resample(p, step) {
  if (p.length < 2) return p.slice();
  const out = [p[0].slice()]; let need = step;
  for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = need; while (t <= d) { out.push(lerp2(a, b, t / d)); t += step; } need = t - d; }
  const last = p[p.length - 1]; if (Math.hypot(last[0] - out[out.length - 1][0], last[1] - out[out.length - 1][1]) > step * 0.2) out.push(last.slice());
  return out;
}
export function trim(p, d0, d1) {
  const L = polyLen(p); if (L <= d0 + d1 + 0.1) return p;
  const at = (dist) => { let acc = 0; for (let i = 1; i < p.length; i++) { const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + seg >= dist) return [i, lerp2(p[i - 1], p[i], (dist - acc) / (seg || 1))]; acc += seg; } return [p.length - 1, p[p.length - 1]]; };
  const [i0, a] = at(d0), [i1, b] = at(L - d1), out = [a]; for (let i = i0; i < i1; i++) out.push(p[i]); out.push(b); return out;
}
export const bbox = (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
export function noise1(R, lambda) {
  const vals = new Map(); const v = (i) => { if (!vals.has(i)) vals.set(i, R.range(-1, 1)); return vals.get(i); };
  return (t) => { const u = t / lambda, i = Math.floor(u), f = u - i, k = (1 - Math.cos(f * Math.PI)) / 2; return v(i) * (1 - k) + v(i + 1) * k; };
}
export const jitter = (pts, amt, R) => pts.map(([x, y]) => [x + R.gauss(0, amt), y + R.gauss(0, amt)]);
export const darker = (hex, k = 0.22) => { const h = hex.replace('#', ''), c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return '#' + c.map((v) => Math.round(v * (1 - k)).toString(16).padStart(2, '0')).join(''); };

export class Sheet {
  constructor({ w = 216, h = 216, ppm = 10, seed = 'plate', paper = '#f6efe1', ink = '#2a2430' }) {
    this.w = w; this.h = h; this.ppm = ppm; this.W = Math.round(w * ppm); this.H = Math.round(h * ppm);
    this.canvas = createCanvas(this.W, this.H); this.ctx = this.canvas.getContext('2d'); this.ctx.scale(ppm, ppm);
    this.R = makeRng(seed); this.INK = ink; this.PAPER = paper;
  }
  path(pts, close = true) { const c = this.ctx; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (close) c.closePath(); }
  pathAdd(pts) { const c = this.ctx; c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  /** The sheet itself: a warm base, a fine grain, a few fibres, and a faint vignette. */
  paper() {
    const c = this.ctx, { W, H, R } = this;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = this.PAPER; c.fillRect(0, 0, W, H);
    const img = c.getImageData(0, 0, W, H), d = img.data; let s = 0x9e3779b9 ^ Math.floor(R() * 1e9);
    for (let i = 0; i < d.length; i += 4) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const n = ((s >>> 0) % 1000) / 1000 - 0.5, g = n * 11; d[i] += g; d[i + 1] += g * 0.95; d[i + 2] += g * 0.8; }
    c.putImageData(img, 0, 0); c.restore();
    c.save(); c.globalAlpha = 0.07; c.strokeStyle = '#b8a27e'; c.lineWidth = 0.12; c.lineCap = 'round';
    for (let i = 0; i < Math.round(this.w * this.h / 110); i++) { const x = R() * this.w, y = R() * this.h, a = R() * TAU, l = R.range(0.6, 3.2); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    c.restore();
    const g = c.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.78); g.addColorStop(0, 'rgba(120,90,50,0)'); g.addColorStop(1, 'rgba(120,90,50,0.10)');
    c.save(); c.fillStyle = g; c.fillRect(0, 0, this.w, this.h); c.restore();
  }
  /** Clean paper under a shape, so that what was drawn there before disappears. */
  fill(poly, color = '#f9f4e8') { const c = this.ctx; c.save(); this.path(poly); c.fillStyle = color; c.fill(); c.restore(); }
  /** Coloured pencil: hatched strokes inside a roughened edge, two passes, multiplied where they cross. */
  pencil(poly, color, o = {}) {
    const c = this.ctx, R = this.R, angle = (o.angle ?? 32) * Math.PI / 180, pitch = o.pitch ?? 0.56, pressure = o.pressure ?? 0.62, passes = o.passes ?? 2, width = o.width ?? 0.72;
    c.save(); c.globalCompositeOperation = 'multiply'; this.path(jitter(poly, o.clipJitter ?? 0.3, R)); c.clip();
    const b = bbox(poly), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, L = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) + 4;
    for (let p = 0; p < passes; p++) {
      const a = angle + p * 0.5 + R.gauss(0, 0.03), dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx, pt = pitch * (p ? 1.4 : 1), pr = pressure * (p ? 0.5 : 1);
      c.strokeStyle = color; c.lineCap = 'round';
      for (let d = -L / 2; d <= L / 2; d += pt * R.range(0.8, 1.2)) {
        const sx = cx + nx * d, sy = cy + ny * d, l0 = L / 2 - R.range(0, 2.5), l1 = L / 2 - R.range(0, 2.5), bow = R.gauss(0, 0.28);
        c.globalAlpha = pr * R.range(0.5, 1); c.lineWidth = width * R.range(0.7, 1.3);
        c.beginPath(); c.moveTo(sx - dx * l0, sy - dy * l0); c.quadraticCurveTo(sx + nx * bow, sy + ny * bow, sx + dx * l1, sy + dy * l1); c.stroke();
      }
    }
    c.restore();
  }
  /** Thin pen hatching, for shadows and dark things. `cut` lists shapes to leave clean. */
  hatch(poly, o = {}) {
    const c = this.ctx, R = this.R, angle = (o.angle ?? 45) * Math.PI / 180, pitch = o.pitch ?? 0.5;
    c.save(); this.path(poly); if (o.cut) { for (const q of o.cut) this.pathAdd(q); c.clip('evenodd'); } else c.clip();
    const b = bbox(poly), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, L = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) + 2, dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
    c.strokeStyle = o.color || '#514852'; c.globalAlpha = o.alpha ?? 0.85; c.lineWidth = o.nib ?? 0.11; c.lineCap = 'round';
    for (let d = -L / 2; d <= L / 2; d += pitch * R.range(0.85, 1.15)) { const sx = cx + nx * d, sy = cy + ny * d; c.beginPath(); c.moveTo(sx - dx * L / 2, sy - dy * L / 2 + R.gauss(0, 0.05)); c.lineTo(sx + dx * L / 2, sy + dy * L / 2 + R.gauss(0, 0.05)); c.stroke(); }
    c.restore();
  }
  /** A pen line: trembling, with the pressure of a hand. */
  ink(pts, o = {}) {
    if (!pts || pts.length < 2) return;
    const c = this.ctx, R = this.R, nib = o.nib ?? 0.34, tremor = o.tremor ?? 0.13, P = resample(pts, 0.45);
    const n = noise1(R, 3.2), n2 = noise1(R, 6.5); let s = 0; const Q = [];
    for (let i = 0; i < P.length; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; if (i) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); const off = n(s) * tremor; Q.push([P[i][0] - dy / d * off, P[i][1] + dx / d * off]); }
    c.save(); c.strokeStyle = o.color || this.INK; c.globalAlpha = o.alpha ?? 1; c.lineCap = 'round'; c.lineJoin = 'round';
    if (o.dash) c.setLineDash(o.dash);
    const seg = 5;
    for (let i = 0; i < Q.length - 1; i += seg - 1) { const part = Q.slice(i, i + seg); c.lineWidth = nib * (0.8 + 0.4 * ((n2(i * 0.45) + 1) / 2)); c.beginPath(); c.moveTo(part[0][0], part[0][1]); for (let j = 1; j < part.length; j++) c.lineTo(part[j][0], part[j][1]); c.stroke(); }
    c.restore();
  }
  /** A closed outline in one stroke, overlapping itself a little where it ends. */
  outline(poly, o = {}) { const R = this.R, k = Math.floor(R() * poly.length), pts = poly.slice(k).concat(poly.slice(0, k)); const extra = resample(pts.concat([pts[0]]), 0.4).slice(0, 3); this.ink(pts.concat([pts[0]], extra), o); }
  /** A box drawn as four strokes that overshoot the corners. */
  box(x0, y0, x1, y1, o = {}) {
    const R = this.R, ov = () => R.range(0.25, 0.9) * (o.overshoot ?? 1), sides = [[[x0, y0], [x1, y0]], [[x1, y0], [x1, y1]], [[x1, y1], [x0, y1]], [[x0, y1], [x0, y0]]];
    for (const [a, b] of sides) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, e0 = ov(), e1 = ov(); this.ink([[a[0] - ux * e0, a[1] - uy * e0], [b[0] + ux * e1, b[1] + uy * e1]], o); }
  }
  dot(x, y, r, color) { const c = this.ctx; c.save(); c.fillStyle = color || this.INK; this.path(jitter(ell(x, y, r, r, 0, 24), r * 0.06, this.R)); c.fill(); c.restore(); }
  text(str, x, y, o = {}) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(o.rot ?? 0); if (o.slant) c.transform(1, 0, -o.slant, 1, 0, 0);
    c.font = `${o.weight || 400} ${o.size || 4}px "${o.font || FONTS.hand}"`; c.textAlign = o.align || 'left'; c.textBaseline = o.baseline || 'alphabetic'; c.fillStyle = o.color || this.INK; c.globalAlpha = o.alpha ?? 0.96; c.fillText(str, 0, 0); c.restore();
  }
  measure(str, o = {}) { const c = this.ctx; c.save(); c.font = `${o.weight || 400} ${o.size || 4}px "${o.font || FONTS.hand}"`; const w = c.measureText(str).width; c.restore(); return w; }
  /** Writes the plate as PNG, with any smaller copies asked for: [['-x.jpg', 2048, 93], ['-preview.png', 1080]]. */
  save(file, { sizes = [] } = {}) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, this.canvas.toBuffer('image/png'));
    const written = [file], base = file.replace(/\.png$/i, '');
    for (const [suffix, px, quality] of sizes) {
      const k = px / Math.max(this.W, this.H), c2 = createCanvas(Math.round(this.W * k), Math.round(this.H * k)), g = c2.getContext('2d');
      g.drawImage(this.canvas, 0, 0, c2.width, c2.height);
      const out = base + suffix; fs.writeFileSync(out, /\.jpe?g$/i.test(suffix) ? c2.toBuffer('image/jpeg', quality ?? 92) : c2.toBuffer('image/png')); written.push(out);
    }
    return written;
  }
}
