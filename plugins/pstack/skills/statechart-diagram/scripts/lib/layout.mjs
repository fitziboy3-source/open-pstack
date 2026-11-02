// layout.mjs — from the Mermaid that /statechart wrote to a laid-out chart: pele places every box and arrow,
// measuring each word in the hand font, and this file reads the places back out of pele's SVG.
import { createCanvas } from '@napi-rs/canvas';
import { FONTS, registerFonts } from './kit.mjs';

let pele;

/**
 * Takes the chart as /statechart wrote it. Drops the title (the plate writes its own), lifts the Legend block
 * out (the plate draws it by hand), applies word changes, and sets the direction when asked.
 */
export function prepareMmd(text, { direction, say = [] } = {}) {
  let fm = null, body = text.replace(/\r\n/g, '\n');
  const m = body.match(/^---\n([\s\S]*?)\n---\n/);
  if (m) { fm = m[1]; body = body.slice(m[0].length); }
  const title = fm?.match(/^title:\s*(.*?)\s*$/m)?.[1]?.replace(/^"(.*)"$/, '$1') ?? null;
  const fmKept = fm ? fm.split('\n').filter((l) => !/^title:/.test(l)).join('\n').trim() : '';
  const legend = [];
  const lg = body.match(/^[ \t]*state "Legend" as legend \{\n([\s\S]*?)\n[ \t]*\}[ \t]*\n/m);
  if (lg) { for (const line of lg[1].split('\n')) { const mm = line.match(/^\s*(lg\d+):\s*(.*)$/); if (mm) legend.push({ id: mm[1], text: mm[2].trim(), classes: [] }); } body = body.replace(lg[0], ''); }
  body = body.split('\n').filter((line) => {
    const mm = line.match(/^\s*class (lg\d+) (.+)$/);
    if (mm) { const item = legend.find((l) => l.id === mm[1]); if (item) item.classes.push(...mm[2].trim().split(/[\s,]+/)); return false; }
    return !/^\s*classDef /.test(line);
  }).join('\n');
  for (const [from, to] of say) body = body.split(from).join(to);
  if (direction) body = /^\s*direction\s+\w+/m.test(body) ? body.replace(/^(\s*)direction\s+\w+/m, `$1direction ${direction}`) : body.replace(/(stateDiagram-v2[ \t]*\n)/, `$1  direction ${direction}\n`);
  return { mmd: (fmKept ? `---\n${fmKept}\n---\n` : '') + body, title, legend };
}

const num = (s) => Number(s);
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : undefined; };
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Points along an SVG path. Pele writes absolute M, L, H, V, C and Z. */
export function pathPoints(d) {
  const out = [], tok = d.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || []; let i = 0, cmd = '', x = 0, y = 0;
  const n = () => num(tok[i++]);
  while (i < tok.length) {
    if (/^[A-Z]$/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M' || cmd === 'L') { x = n(); y = n(); out.push([x, y]); }
    else if (cmd === 'H') { x = n(); out.push([x, y]); }
    else if (cmd === 'V') { y = n(); out.push([x, y]); }
    else if (cmd === 'C') { const x1 = n(), y1 = n(), x2 = n(), y2 = n(), x3 = n(), y3 = n(), x0 = x, y0 = y; for (let k = 1; k <= 16; k++) { const t = k / 16, u = 1 - t; out.push([u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]); } x = x3; y = y3; }
    else if (cmd === 'Q') { const x1 = n(), y1 = n(), x2 = n(), y2 = n(), x0 = x, y0 = y; for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; out.push([u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2]); } x = x2; y = y2; }
    else if (cmd === 'Z') { if (out.length) out.push(out[0].slice()); }
    else i++;
  }
  return out;
}
function textLines(t) {
  if (!t) return [];
  const spans = [...t.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)];
  if (spans.length) return spans.map((m) => ({ text: unescape(m[2]), x: num(attr(m[1], 'x') ?? 0), y: num(attr(m[1], 'y') ?? 0) }));
  const m = t.match(/<text([^>]*)>([^<]*)<\/text>/);
  return m ? [{ text: unescape(m[2]), x: num(attr(m[1], 'x') ?? 0), y: num(attr(m[1], 'y') ?? 0) }] : [];
}

/** Reads pele's SVG into boxes and lines, in pele's own pixels. */
export function readSvg(svg) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const L = { width: num(vb[1]), height: num(vb[2]), clusters: [], dividers: [], edges: [], labels: [], nodes: [], starts: [] };
  const off = svg.match(/<g transform="translate\(([\d.-]+),([\d.-]+)\)">/), ox = off ? num(off[1]) : 0, oy = off ? num(off[2]) : 0;
  const P = (p) => [p[0] + ox, p[1] + oy];
  for (const m of svg.matchAll(/<g class="pele-cluster[^"]*" data-id="([^"]+)">([\s\S]*?)<\/g>/g)) {
    const rect = m[2].match(/<rect[^>]*>/)?.[0]; if (!rect) continue;
    const head = m[2].match(/<path d="M[\d.]+,([\d.]+)H/), label = textLines(m[2].match(/<text[\s\S]*?<\/text>/)?.[0]);
    L.clusters.push({ id: m[1], x: num(attr(rect, 'x')) + ox, y: num(attr(rect, 'y')) + oy, w: num(attr(rect, 'width')), h: num(attr(rect, 'height')), rx: num(attr(rect, 'rx') || 0), headY: head ? num(head[1]) + oy : undefined, label: label.map((l) => ({ ...l, x: l.x + ox, y: l.y + oy })) });
  }
  for (const m of svg.matchAll(/<path class="pele-divider" d="([^"]+)"/g)) L.dividers.push(pathPoints(m[1]).map(P));
  for (const m of svg.matchAll(/<g class="pele-edge [^"]*" data-id="([^"]+)">([\s\S]*?)<\/g>/g)) {
    const paths = [...m[2].matchAll(/<path( class="pele-marker")? d="([^"]+)"/g)], line = paths.find((p) => !p[1]), marker = paths.find((p) => p[1]);
    if (!line) continue;
    const mk = marker ? pathPoints(marker[2]).map(P) : undefined;
    L.edges.push({ id: m[1], pts: pathPoints(line[2]).map(P), tip: mk ? mk[0] : undefined });
  }
  for (const m of svg.matchAll(/<g class="pele-edge-label" data-id="([^"]+)">([\s\S]*?)<\/g>/g)) {
    const rect = m[2].match(/<rect[^>]*>/)?.[0]; if (!rect) continue;
    L.labels.push({ edge: m[1], x: num(attr(rect, 'x')) + ox, y: num(attr(rect, 'y')) + oy, w: num(attr(rect, 'width')), h: num(attr(rect, 'height')), lines: textLines(m[2].match(/<text[\s\S]*?<\/text>/)?.[0]).map((l) => ({ ...l, x: l.x + ox, y: l.y + oy })) });
  }
  for (const m of svg.matchAll(/<g class="pele-node pele-state((?: [^"]*)?)" data-id="([^"]+)" transform="translate\(([-\d.]+),([-\d.]+)\)">([\s\S]*?)<\/g>/g)) {
    const rect = m[5].match(/<rect[^>]*>/)?.[0]; if (!rect) continue;
    const cx = num(m[3]) + ox, cy = num(m[4]) + oy;
    L.nodes.push({ id: m[2], classes: m[1].trim().split(/\s+/).filter(Boolean), cx, cy, w: num(attr(rect, 'width')), h: num(attr(rect, 'height')), rx: num(attr(rect, 'rx') || 0), lines: textLines(m[5].match(/<text[\s\S]*?<\/text>/)?.[0]).map((l) => ({ ...l, x: l.x + cx, y: l.y + cy })) });
  }
  for (const m of svg.matchAll(/<g class="pele-node pele-state-start" data-id="([^"]+)" transform="translate\(([-\d.]+),([-\d.]+)\)">\s*<circle r="([\d.]+)"/g)) L.starts.push({ id: m[1], cx: num(m[2]) + ox, cy: num(m[3]) + oy, r: num(m[4]) });
  return L;
}

/** Lays the chart out with pele, measuring words in the hand font. */
export async function layOut(mmd, { fontSize = 16, padding = 12 } = {}) {
  pele ??= await import('pele'); registerFonts();
  const g = createCanvas(8, 8).getContext('2d');
  const measurer = { width(text, size, style) { g.font = `${style & 1 ? '700 ' : ''}${size}px "${FONTS.hand}"`; return g.measureText(text).width; } };
  const { svg } = pele.render(mmd, { measurer, fontFamily: FONTS.hand, fontSize, padding, responsive: false, limit: 1_000_000, outputLimit: 8_000_000, maxEdges: 10_000 });
  return { ...readSvg(svg), svg };
}

export function contentBox(L) {
  const xs = [], ys = [];
  for (const n of L.nodes) { xs.push(n.cx - n.w / 2, n.cx + n.w / 2); ys.push(n.cy - n.h / 2, n.cy + n.h / 2); }
  for (const c of L.clusters) { xs.push(c.x, c.x + c.w); ys.push(c.y, c.y + c.h); }
  for (const l of L.labels) { xs.push(l.x, l.x + l.w); ys.push(l.y, l.y + l.h); }
  for (const s of L.starts) { xs.push(s.cx - s.r, s.cx + s.r); ys.push(s.cy - s.r, s.cy + s.r); }
  for (const e of L.edges) for (const p of e.pts) { xs.push(p[0]); ys.push(p[1]); }
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
/** Fits a chart box into a place on the plate, keeping its shape. */
export function mapper(box, to) {
  const k = Math.min(to.w / box.w, to.h / box.h), ox = to.x + (to.w - box.w * k) / 2, oy = to.y + (to.h - box.h * k) / 2;
  return { k, P: (p) => [ox + (p[0] - box.x) * k, oy + (p[1] - box.y) * k], X: (x) => ox + (x - box.x) * k, Y: (y) => oy + (y - box.y) * k };
}
