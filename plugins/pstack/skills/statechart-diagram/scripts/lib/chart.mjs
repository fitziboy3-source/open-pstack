// chart.mjs — draws a laid-out chart on the sheet: parent states, arrows, cards, the words on the arrows,
// the start dot, and the marks /statechart puts on states (breaks, mayBreak, bugPath, repeats).
import { rrect, ell, resample, trim, polyLen } from './kit.mjs';

/** Pencil colours for /statechart's groups: stronger than the screen tints, so the hatching shows. */
export const GROUP = { blue: '#8fb8e8', orange: '#e8a57a', purple: '#c4a9e6', yellow: '#f0c75a', teal: '#86c7bb', tan: '#d9b98f', pink: '#f2a3c4' };
export const MARK = { breaks: '#b8352f', mayBreak: '#d0700f', bugPath: '#b8352f', repeats: '#8a3fc4', breaksFill: '#f3c2bb', mayBreakFill: '#f6d7b0' };
const PLAIN = '#efe4cc';

export function drawChart(S, L, m, o = {}) {
  const INK = S.INK, COND = o.condColor || '#a8443b', LINE = o.lineColor || '#3a3340';
  const k = m.k, stateSize = (o.stateSize ?? 16) * k * (o.textScale ?? 1), labelSize = (o.labelSize ?? 14) * k * (o.textScale ?? 1);
  const colourOf = (classes) => { const g = classes.find((c) => GROUP[c]); return o.groupColors?.[g] || (g ? GROUP[g] : PLAIN); };
  const nodeBoxes = L.nodes.map((n) => ({ x0: m.X(n.cx - n.w / 2) - 1.2, y0: m.Y(n.cy - n.h / 2) - 0.6, x1: m.X(n.cx + n.w / 2) + 1.2, y1: m.Y(n.cy + n.h / 2) + 0.6, n }));
  const labelBoxes = L.labels.map((l) => ({ x0: m.X(l.x), y0: m.Y(l.y), x1: m.X(l.x + l.w), y1: m.Y(l.y + l.h), l }));
  const clusterBoxes = L.clusters.map((c) => ({ x0: m.X(c.x), y0: m.Y(c.y), x1: m.X(c.x + c.w), y1: m.Y(c.y + c.h), headY: c.headY !== undefined ? m.Y(c.headY) : undefined, c }));
  const nodeAt = (p, pad = 2.5) => nodeBoxes.find((b) => p[0] > b.x0 - pad && p[0] < b.x1 + pad && p[1] > b.y0 - pad && p[1] < b.y1 + pad);
  const has = (n, cls) => n.classes.includes(cls);

  // parent states: a soft container with its name along the top
  for (const b of clusterBoxes) {
    const shape = rrect(b.x0, b.y0, b.x1, b.y1, 2.2);
    S.pencil(shape, o.clusterColor || '#e9e0cf', { pressure: 0.22, passes: 1, angle: 60, pitch: 0.9, width: 0.9 });
    S.outline(shape, { nib: 0.36, tremor: 0.16 });
    if (b.headY !== undefined) S.ink([[b.x0 + 0.4, b.headY], [b.x1 - 0.4, b.headY]], { nib: 0.22, tremor: 0.1 });
    const words = b.c.label.map((q) => q.text).join(' ');
    if (words) S.text(words, (b.x0 + b.x1) / 2, (b.headY !== undefined ? (b.y0 + b.headY) / 2 : b.y0 + stateSize * 1.3) + stateSize * 0.36, { size: stateSize, align: 'center', font: 'Caveat', weight: 700 });
  }
  for (const d of L.dividers) S.ink(d.map(m.P), { nib: 0.26, tremor: 0.1, dash: [1.6, 1.2], color: '#5a5260' });

  // arrows first, so that the cards sit on their ends
  const edgeInfo = [];
  for (const e of L.edges) {
    let pts = e.pts.map(m.P); if (e.tip) pts = pts.concat([m.P(e.tip)]);
    const fromStart = L.starts.some((s) => Math.hypot(s.cx - e.pts[0][0], s.cy - e.pts[0][1]) < 14);
    const a = nodeAt(pts[0]), b = nodeAt(pts[pts.length - 1]);
    const bug = !!(a && b && has(a.n, 'bugPath') && has(b.n, 'bugPath')) && o.markBugArrows !== false;
    edgeInfo.push({ id: e.id, from: a?.n.id, to: b?.n.id, bug });
    pts = trim(pts, fromStart ? 1.4 : 0.9, 0.15);
    const gap = 0.9, runs = [[]];
    for (const p of resample(pts, 0.3)) { const hit = labelBoxes.some((lb) => p[0] > lb.x0 - gap && p[0] < lb.x1 + gap && p[1] > lb.y0 - gap && p[1] < lb.y1 + gap); if (hit) { if (runs[runs.length - 1].length) runs.push([]); } else runs[runs.length - 1].push(p); }
    for (const r of runs) if (polyLen(r) > 0.6) {
      if (bug) { S.ctx.save(); S.ctx.globalAlpha = 0.5; S.ctx.strokeStyle = '#f0b3a8'; S.ctx.lineWidth = 1.6; S.ctx.lineCap = 'round'; S.ctx.lineJoin = 'round'; S.path(r.map(([x, y]) => [x + 0.5, y + 0.6]), false); S.ctx.stroke(); S.ctx.restore(); }
      S.ink(r, { nib: bug ? 0.5 : 0.3, tremor: 0.14, color: bug ? MARK.bugPath : LINE });
    }
    const end = pts[pts.length - 1], back = resample(pts, 0.4).slice(-7)[0], ang = Math.atan2(end[1] - back[1], end[0] - back[0]), c = Math.cos(ang), s = Math.sin(ang), len = 2.5 * (bug ? 1.15 : 1), wing = 1.0;
    const pt = (u, v) => [end[0] - u * c + v * -s, end[1] - u * s + v * c], head = [pt(0, 0), pt(len, wing), pt(len * 0.7, 0), pt(len, -wing)];
    S.ctx.save(); S.ctx.fillStyle = bug ? MARK.bugPath : LINE; S.path(head); S.ctx.fill(); S.ctx.restore(); S.outline(head, { nib: 0.2, tremor: 0.05, color: bug ? MARK.bugPath : LINE });
  }

  // the cards
  for (const b of nodeBoxes) {
    const n = b.n, shape = rrect(b.x0, b.y0, b.x1, b.y1, 1.1), broke = has(n, 'breaks'), may = has(n, 'mayBreak'), onPath = has(n, 'bugPath'), repeats = has(n, 'repeats');
    S.hatch(shape.map(([x, y]) => [x + 1.0, y + 1.15]), { cut: [shape], angle: 45, pitch: 0.5, nib: 0.1 });
    S.fill(shape); S.pencil(shape, broke ? MARK.breaksFill : may ? MARK.mayBreakFill : colourOf(n.classes), { pressure: 0.6, angle: 32 });
    if (onPath) S.outline(rrect(b.x0 - 1.2, b.y0 - 1.2, b.x1 + 1.2, b.y1 + 1.2, 2), { nib: 0.42, color: MARK.bugPath, tremor: 0.12 });
    if (repeats) S.outline(rrect(b.x0 - 1.2, b.y0 - 1.2, b.x1 + 1.2, b.y1 + 1.2, 2), { nib: 0.36, color: MARK.repeats, dash: [1.4, 1.1] });
    S.box(b.x0, b.y0, b.x1, b.y1, { nib: broke ? 0.52 : 0.4, overshoot: 0.9, color: broke ? MARK.breaks : may ? MARK.mayBreak : INK });
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, lh = stateSize * 1.18, top = cy - ((n.lines.length - 1) * lh) / 2 + stateSize * 0.36;
    n.lines.forEach((q, i) => S.text(q.text, cx, top + i * lh, { size: stateSize, align: 'center', rot: S.R.gauss(0, 0.006), color: broke ? MARK.breaks : may ? '#8a4a08' : INK }));
    if (o.cornerMark) o.cornerMark(S, b, n);
  }

  // the words on the arrows; a condition in [brackets] in its own colour
  for (const b of labelBoxes) {
    const cx = (b.x0 + b.x1) / 2, lh = labelSize * 1.22, n = b.l.lines.length, top = (b.y0 + b.y1) / 2 - ((n - 1) * lh) / 2 + labelSize * 0.36;
    b.l.lines.forEach((q, i) => { const runs = q.text.split(/(\[[^\]]*\])/).filter(Boolean), widths = runs.map((t) => S.measure(t, { size: labelSize })), total = widths.reduce((a, c) => a + c, 0); let x = cx - total / 2; runs.forEach((t, j) => { S.text(t, x, top + i * lh, { size: labelSize, color: t[0] === '[' ? COND : INK }); x += widths[j]; }); });
  }
  for (const s of L.starts) { const [x, y] = m.P([s.cx, s.cy]); S.dot(x, y, 1.6, INK); S.outline(ell(x, y, 2.7, 2.7), { nib: 0.22 }); }

  const edgePts = L.edges.flatMap((e) => resample(e.pts.map(m.P), 1.5));
  return { nodeBoxes, labelBoxes, clusterBoxes, edgePts, edgeInfo, stateSize, labelSize };
}

/** The hand-drawn legend: a swatch and the words for each entry /statechart put in its Legend block. */
export function drawLegend(S, items, { x0, y0, width, groupColors }) {
  if (!items.length) return { x0, y0, x1: x0, y1: y0 };
  const pitch = items.length > 5 ? 5.3 : 6.3, swW = 9.6, swH = pitch > 6 ? 4.4 : 3.8;
  S.text('the colours', x0, y0 + 5.2, { size: 3.4, color: '#4a4350' }); S.ink([[x0, y0 + 6.4], [x0 + 16, y0 + 6.6]], { nib: 0.18 });
  items.forEach((it, i) => {
    const y = y0 + 9.2 + i * pitch, sw = rrect(x0, y, x0 + swW, y + swH, 0.5), g = it.classes.find((c) => GROUP[c]);
    const breaks = it.classes.includes('breaks'), may = it.classes.includes('mayBreak'), path = it.classes.includes('bugPath'), rep = it.classes.includes('repeats');
    S.fill(sw);
    if (breaks || may || g) S.pencil(sw, breaks ? MARK.breaksFill : may ? MARK.mayBreakFill : (groupColors?.[g] || GROUP[g]), { pressure: 0.62 });
    if (path) S.outline(rrect(x0 - 0.8, y - 0.8, x0 + swW + 0.8, y + swH + 0.8, 1), { nib: 0.4, color: MARK.bugPath });
    if (rep) S.outline(rrect(x0 - 0.8, y - 0.8, x0 + swW + 0.8, y + swH + 0.8, 1), { nib: 0.34, color: MARK.repeats, dash: [1.4, 1.1] });
    S.box(x0, y, x0 + swW, y + swH, { nib: 0.26, overshoot: 0.5, color: breaks ? MARK.breaks : may ? MARK.mayBreak : S.INK });
    let size = 3.3; const room = width - swW - 3; while (size > 2.5 && S.measure(it.text, { size }) > room) size -= 0.1;
    S.text(it.text, x0 + swW + 2.8, y + swH * 0.82, { size, color: breaks ? MARK.breaks : S.INK });
  });
  return { x0: x0 - 2, y0: y0, x1: x0 + width, y1: y0 + 9.2 + items.length * pitch + 1 };
}
