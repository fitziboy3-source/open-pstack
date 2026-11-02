#!/usr/bin/env node
// plate.mjs — draws a /statechart chart as a plate in pen and coloured pencil.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Sheet, rrect, ell, tf, registerFonts, FONTS } from './lib/kit.mjs';
import { prepareMmd, layOut, contentBox, mapper } from './lib/layout.mjs';
import { drawChart, drawLegend, GROUP, MARK } from './lib/chart.mjs';
import { OBJECTS, part, C } from './lib/objects.mjs';
import { makePlacer } from './lib/place.mjs';

const USAGE = `Usage: plate.mjs CHART.mmd [options]

Draws the chart as a square plate: the title block top left, the legend top right, the chart in the middle,
and small things of the reader's world around it where there is room. Reads report.md beside the chart,
when there is one, for the line under the title.

  --out DIR            where to write (default: <chart folder>/plate)
  --name NAME          file name stem (default: plate) -> NAME.png, NAME-x.jpg, NAME-preview.png,
                       NAME-layout.svg, NAME-plate.json
  --title WORDS        the big words (default: the chart's title, else the file name)
  --subtitle WORDS     the line under the title
  --note WORDS         the small line (default: what report.md says TLC checked)
  --footer WORDS       the small print, bottom left (default: the credit line)
  --source WORDS       a second small-print line, e.g. the repo and commit
  --say "OLD=NEW"      change words in the chart before drawing; repeatable
  --dir TB|LR          chart direction; with no --dir both are tried and the one whose words
                       come out bigger is kept
  --near ID=OBJECT[:ARG][@SCALE]   put a thing beside the state with that id; repeatable
                       objects: ${Object.keys(OBJECTS).join(', ')}
  --anywhere OBJECT[:ARG][@SCALE]  put a thing wherever there is room; repeatable
  --scene FILE.mjs     a module that draws more (see references/scene-modules.md)
  --no-legend          leave the legend out
  --no-marks           do not stamp "rule broken" beside a state that breaks a rule
  --seed WORDS         the hand's seed; same seed, same picture (default: the title)
  --size MM            plate side in mm (default 216)
  --ppm N              pixels per mm (default 10 -> 2160 px; --fast uses 5)
  --text-scale X       grow or shrink the chart's words (default 1)
  --spacing R,N        pele's rankSpacing,nodeSpacing when the chart has none (default 26,36)
  --fast               half size, for a quick look
Exit 0 when the plate is written, 2 on a bad input.`;

function parseArgs(argv) {
  const o = { say: [], near: [], anywhere: [] }; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { console.log(USAGE); process.exit(0); }
    if (a === '--fast' || a === '--no-legend' || a === '--no-marks') { o[a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = true; continue; }
    if (a.startsWith('--')) { const key = a.slice(2).replace(/-(\w)/g, (_, c) => c.toUpperCase()), v = argv[++i]; if (v === undefined) fail(`${a} needs a value`); if (Array.isArray(o[key])) o[key].push(v); else o[key] = v; continue; }
    pos.push(a);
  }
  if (pos.length !== 1) fail('Give one chart file.');
  return { ...o, chart: pos[0] };
}
function fail(msg) { console.error(`${msg}\n\n${USAGE}`); process.exit(2); }

function readReport(chartFile) {
  const f = path.join(path.dirname(chartFile), 'report.md'); if (!fs.existsSync(f)) return null;
  const t = fs.readFileSync(f, 'utf8'), r = {};
  const m = t.match(/TLC reached (\d[\d,]*) states? and (\d[\d,]*) steps?/); if (m) { r.states = m[1]; r.steps = m[2]; }
  const section = (name) => { const mm = t.match(new RegExp(`^## ${name}[^\\n]*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm')); return mm ? mm[1].trim() : null; };
  const hold = section('Rules that hold'); r.hold = hold ? hold.split('\n')[0].split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [];
  const broke = section('Rules that break'); r.break = broke ? [...new Set([...broke.matchAll(/^###\s+(\S+)/gm)].map((x) => x[1]).concat(broke.split('\n')[0].startsWith('#') ? [] : broke.split('\n')[0].split(/,\s*/).map((s) => s.trim()).filter((s) => /^\w+$/.test(s))))] : [];
  const unchecked = section('Rules not checked'); r.unchecked = unchecked ? unchecked.split('\n')[0].split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [];
  return r;
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
function defaultNote(rep) {
  if (!rep) return '';
  const bits = [];
  if (rep.states) bits.push(`checked by TLC: ${rep.states} states, ${rep.steps} steps`);
  if (rep.hold.length) bits.push(`${plural(rep.hold.length, 'rule')} hold`);
  if (rep.break.length) bits.push(`${plural(rep.break.length, 'rule')} break: ${rep.break.join(', ')}`);
  if (rep.unchecked.length) bits.push(`${plural(rep.unchecked.length, 'rule')} not checked`);
  return bits.join('  ·  ');
}
const fitSize = (S, text, o, max, maxSize, minSize) => { let s = maxSize; while (s > minSize && S.measure(text, { ...o, size: s }) > max) s -= 0.2; return s; };
const parseThing = (spec) => { const m = spec.match(/^([a-zA-Z]+)(?::(.*?))?(?:@([\d.]+))?$/); if (!m || !OBJECTS[m[1]]) fail(`Unknown object in "${spec}". Objects: ${Object.keys(OBJECTS).join(', ')}`); return { name: m[1], arg: m[2], scale: m[3] ? Number(m[3]) : 1 }; };

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(a.chart)) fail(`Cannot find ${a.chart}`);
  const size = Number(a.size || 216), ppm = a.fast ? 5 : Number(a.ppm || 10), u = size / 216;
  const outDir = a.out || path.join(path.dirname(a.chart), 'plate'), name = a.name || 'plate';
  const say = a.say.map((s) => { const i = s.indexOf('='); if (i < 0) fail(`--say wants OLD=NEW, got "${s}"`); return [s.slice(0, i), s.slice(i + 1)]; });
  const raw = fs.readFileSync(a.chart, 'utf8');
  const withSpacing = (mmd) => { if (/^---\n[\s\S]*config:/m.test(mmd)) return mmd; const [rs, ns] = (a.spacing || '26,36').split(',').map(Number), cfg = `config:\n  state:\n    rankSpacing: ${rs}\n    nodeSpacing: ${ns}`; return /^---\n/.test(mmd) ? mmd.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm) => `---\n${fm}\n${cfg}\n---\n`) : `---\n${cfg}\n---\n` + mmd; };
  registerFonts();
  const chartTo = { x: 8 * u, y: 48 * u, w: 200 * u, h: 158 * u };
  // lay it out; with no --dir, try both ways and keep the one whose words come out bigger
  let laid = [];
  for (const dir of a.dir ? [a.dir] : ['TB', 'LR']) { const prep = prepareMmd(raw, { direction: dir, say }); const L = await layOut(withSpacing(prep.mmd)); if (!L.nodes.length) fail('pele found no states in the chart. Is it a stateDiagram-v2?'); const box = contentBox(L); laid.push({ dir, prep, L, box, k: Math.min(chartTo.w / box.w, chartTo.h / box.h) }); }
  laid.sort((p, q) => q.k - p.k);
  const { dir: chosenDir, prep: { title: chartTitle, legend }, L } = laid[0];
  let title = a.title || chartTitle || path.basename(a.chart, path.extname(a.chart));
  const rep = readReport(a.chart), note = a.note ?? defaultNote(rep);
  const S = new Sheet({ w: size, h: size, ppm, seed: a.seed || title });
  S.paper();

  // the words at the top: the title on one line, or two when it is long, then the subtitle and the small line
  const left = 11.5 * u, titleRoom = (a.noLegend || !legend.length ? 190 : 112) * u, disp = { font: FONTS.display, weight: 700 };
  let titleLines = [title], titleSize = fitSize(S, title, disp, titleRoom, 19 * u, 12 * u);
  if (S.measure(title, { ...disp, size: titleSize }) > titleRoom) {
    const cut = title.match(/^(.{8,}?[:,;])\s+(.+)$/) || (() => { const w = title.split(' '); const h = Math.ceil(w.length / 2); return w.length > 1 ? [null, w.slice(0, h).join(' '), w.slice(h).join(' ')] : null; })();
    if (cut) { titleLines = [cut[1], cut[2]]; titleSize = Math.min(...titleLines.map((t) => fitSize(S, t, disp, titleRoom, 13.5 * u, 8 * u))); }
  }
  let y = (titleLines.length > 1 ? 18 : 24) * u;
  titleLines.forEach((t, i) => { S.text(t, left, y, { ...disp, size: titleSize, rot: -0.012 }); if (i < titleLines.length - 1) y += titleSize * 0.95; });
  if (a.subtitle) { const ss = fitSize(S, a.subtitle, { font: FONTS.display }, titleRoom + 6 * u, (titleLines.length > 1 ? 6 : 7.6) * u, 4.2 * u); y += ss * 1.15 + 0.6 * u; S.text(a.subtitle, left + 1 * u, y, { font: FONTS.display, size: ss, rot: -0.008 }); }
  if (note) { const ns = fitSize(S, note, {}, titleRoom + 10 * u, 3.3 * u, 2.4 * u); y += ns * 2.0; S.text(note, left + 1.1 * u, y, { size: ns, color: '#4a4350' }); }
  const titleBox = { x0: 8 * u, x1: (a.noLegend || !legend.length ? 212 : 126) * u, y0: 10 * u, y1: 46 * u };
  const legendBox = a.noLegend ? null : drawLegend(S, legend, { x0: 130 * u, y0: 10 * u, width: 80 * u });

  // the chart
  const box = contentBox(L), kMax = 0.42 * u, fit = Math.min(chartTo.w / box.w, chartTo.h / box.h), to = fit > kMax ? { x: chartTo.x + (chartTo.w - box.w * kMax) / 2, y: chartTo.y + (chartTo.h - box.h * kMax) / 2, w: box.w * kMax, h: box.h * kMax } : chartTo, m = mapper(box, to);
  const res = drawChart(S, L, m, { textScale: Number(a.textScale || 1) });
  const taken = [...res.nodeBoxes, ...res.labelBoxes, titleBox].concat(legendBox ? [legendBox] : []);
  const placer = makePlacer({ taken, edgePts: res.edgePts, bounds: { x0: 5 * u, x1: 211 * u, y0: 8 * u, y1: 208 * u } });
  const placed = [], skipped = [];
  const put = (thing, where, label) => { const ob = OBJECTS[thing.name], w = ob.w * thing.scale * u, h = ob.h * thing.scale * u, b = where(w, h); if (b) { ob.draw(S, b, thing.arg); placed.push({ what: label, box: b }); } else skipped.push(label); };
  if (!a.noMarks) for (const b of res.nodeBoxes) { const broke = b.n.classes.includes('breaks'), may = b.n.classes.includes('mayBreak'); if (broke || may) put({ name: 'stamp', arg: `${broke ? 'rule broken' : 'may break'}|${broke ? MARK.breaks : MARK.mayBreak}`, scale: 0.85 }, (w, h) => placer.near(b, w, h, ['right', 'left', 'above', 'below']), `stamp beside ${b.n.id}`); }
  for (const spec of a.near) { const i = spec.indexOf('='); if (i < 0) fail(`--near wants ID=OBJECT, got "${spec}"`); const id = spec.slice(0, i), thing = parseThing(spec.slice(i + 1)), nb = res.nodeBoxes.find((b) => b.n.id === id); if (!nb) { skipped.push(`${thing.name} near ${id} (no state with that id; ids: ${res.nodeBoxes.map((b) => b.n.id).join(' ')})`); continue; } put(thing, (w, h) => placer.near(nb, w, h), `${thing.name} near ${id}`); }
  for (const spec of a.anywhere) { const thing = parseThing(spec); put(thing, (w, h) => placer.anywhere(w, h, [[33 * u, 100 * u], [186 * u, 196 * u], [36 * u, 206 * u], [190 * u, 150 * u], [196 * u, 92 * u]]), `${thing.name} anywhere`); }
  if (a.scene) { const mod = await import(pathToFileURL(path.resolve(a.scene)).href); const ctx = { S, L, m, res, placer, placed, skipped, objects: OBJECTS, kit: { rrect, ell, tf, part, C, GROUP, MARK }, u, title, legend, report: rep }; if (typeof mod.default === 'function') await mod.default(ctx); else fail(`${a.scene} must export a default function (ctx) => void`); }

  // the small print
  const footer = a.footer ?? (rep ? 'drawn by code with statechart-diagram, after Kevin Ngo’s statechart-art  \u00b7  the states and arrows are the model TLC checked' : 'drawn by code with statechart-diagram, after Kevin Ngo’s statechart-art  \u00b7  a chart, not a checked model');
  S.text(footer, left, (a.source ? 210.4 : 212.2) * u, { size: fitSize(S, footer, {}, 196 * u, 2.7 * u, 2.1 * u), color: '#5a5260' });
  if (a.source) S.text(a.source, left, 214 * u, { size: fitSize(S, a.source, {}, 196 * u, 2.7 * u, 2.1 * u), color: '#5a5260' });

  fs.mkdirSync(outDir, { recursive: true });
  const files = S.save(path.join(outDir, `${name}.png`), { sizes: [['-x.jpg', 2048, 93], ['-preview.png', 1080]] });
  fs.writeFileSync(path.join(outDir, `${name}-layout.svg`), L.svg);
  const r2 = (v) => Math.round(v * 10) / 10, bx = (b) => ({ x0: r2(b.x0), y0: r2(b.y0), x1: r2(b.x1), y1: r2(b.y1) });
  const json = { title, note, chart: a.chart, direction: chosenDir, size, ppm, seed: a.seed || title, states: res.nodeBoxes.map((b) => ({ id: b.n.id, words: b.n.lines.map((q) => q.text).join(' '), classes: b.n.classes, box: bx(b) })), arrows: res.edgeInfo, placed: placed.map((p) => ({ what: p.what, box: bx(p.box) })), skipped, legend };
  fs.writeFileSync(path.join(outDir, `${name}-plate.json`), JSON.stringify(json, null, 1));
  console.log(`Drew "${title}" ${chosenDir}${a.dir ? '' : ' (chosen: the words come out bigger than ' + laid[1].dir + ')'}: ${plural(res.nodeBoxes.length, 'state')}, ${plural(L.edges.length, 'arrow')}, ${plural(placed.length, 'thing')} placed${skipped.length ? `, ${skipped.length} skipped for want of room (${skipped.join('; ')})` : ''}.`);
  console.log(`Look at ${path.join(outDir, `${name}-preview.png`)}. Files: ${files.map((f) => path.basename(f)).join(', ')}, ${name}-layout.svg, ${name}-plate.json in ${outDir}`);
}
main().catch((e) => { console.error(e.stack || e); process.exit(2); });
