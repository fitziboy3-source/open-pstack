// objects.mjs — small things to set around a chart, each drawn to fit a box {x0,y0,x1,y1}.
// An object is { w, h, draw(S, box, arg) }: w and h are its natural size in mm, so the placer knows what to ask for.
import { rrect, ell, tf, darker } from './kit.mjs';

export const C = { ink: '#2a2430', wood: '#c99b6b', woodDeep: '#9c7148', cream: '#f3e9d6', clay: '#c98a6a', teal: '#8fcbbf', slate: '#aeb4bb', red: '#b8352f', yellow: '#f0c75a', pink: '#f2b9c2', paper: '#faf5ea', graphite: '#3b3640', navy: '#3a4a5c', sky: '#cfe5ec', green: '#9dbb86', skin: '#f6e3d2' };
const shadow = (S, poly, dx = 1.0, dy = 1.1) => S.hatch(poly.map(([x, y]) => [x + dx, y + dy]), { cut: [poly], angle: 45, pitch: 0.5, nib: 0.1 });
/** A filled, outlined part: paper first, then pencil colour, then the pen. */
export function part(S, poly, color, o = {}) { if (o.shadow) shadow(S, poly); S.fill(poly); if (color) S.pencil(poly, color, { pressure: o.pressure ?? 0.62, passes: o.passes ?? 2, angle: o.angle ?? 32 }); if (o.outline !== false) S.outline(poly, { nib: o.nib ?? 0.3 }); }
const fit = (b, w, h) => { const s = Math.min((b.x1 - b.x0) / w, (b.y1 - b.y0) / h); return { s, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, bottom: (b.y0 + b.y1) / 2 + h * s / 2 }; };

export const pen = { w: 20, h: 6, draw(S, b) { const { s, cx, cy } = fit(b, 20, 6), rot = -0.5, T = (p) => tf(p, { x: cx, y: cy, rot, s });
  part(S, T(rrect(-9, -1.1, 5.4, 1.1, 0.5)), C.navy, { pressure: 0.85, nib: 0.26 });
  part(S, T([[5.4, -1.1], [9.2, -0.15], [9.2, 0.15], [5.4, 1.1]]), '#d7c7a8', { pressure: 0.5, nib: 0.22 });
  part(S, T(rrect(-9.6, -1.3, -6.4, 1.3, 0.5)), '#2a3542', { pressure: 0.9, nib: 0.24 });
  S.ink(T([[-8.6, -1.3], [-8.6, -2.6], [-3.2, -2.6], [-3.2, -1.6]]), { nib: 0.2 }); } };
/** A sheet with ruled lines. arg: a title; "signed:Title" adds a signature and a pen. */
export const document = { w: 26, h: 32, draw(S, b, arg = '') { const signed = /^signed/.test(arg), title = arg.replace(/^signed:?/, '') || 'Contract'; const { s, cx, cy } = fit(b, 26, 32), rot = 0.06, T = (p) => tf(p, { x: cx - 1.5 * s, y: cy - 0.5 * s, rot, s });
  part(S, T(rrect(-11, -15, 11, 15, 0.4)), '#f3ead6', { shadow: true, pressure: 0.28, passes: 1, nib: 0.3 });
  S.text(title, ...T([[-8.6, -10.6]])[0], { font: 'Caveat', weight: 700, size: 4.2 * s, rot });
  for (let i = 0; i < 7; i++) S.ink(T([[-8.6, -6.4 + i * 2.3], [i === 6 ? 2 : 8.6, -6.4 + i * 2.3]]), { nib: 0.12, tremor: 0.08, color: '#6b6270' });
  if (signed) { const sig = []; for (let t = 0; t <= 1.001; t += 0.02) sig.push([-8.4 + t * 11, 11.6 - Math.sin(t * 17) * (1.3 - t) * 1.6 - Math.sin(t * 5) * 0.8]); S.ink(T(sig), { nib: 0.26, tremor: 0.05 }); S.ink(T([[-8.8, 13.2], [3.4, 13.2]]), { nib: 0.1, color: '#6b6270' }); pen.draw(S, { x0: cx + 1 * s, y0: cy + 5 * s, x1: cx + 15 * s, y1: cy + 15 * s }); } } };
export const envelope = { w: 22, h: 15, draw(S, b) { const { s, cx, cy } = fit(b, 22, 15), rot = -0.08, T = (p) => tf(p, { x: cx, y: cy, rot, s }), body = T(rrect(-10, -6.5, 10, 6.5, 0.4));
  part(S, body, '#f0e3c6', { shadow: true, pressure: 0.3, passes: 1, nib: 0.3 });
  S.ink(T([[-10, -6.5], [0, 1.6], [10, -6.5]]), { nib: 0.26 });
  S.ink(T([[-10, 6.5], [-2.6, 0.2]]), { nib: 0.14, color: '#6b6270' }); S.ink(T([[10, 6.5], [2.6, 0.2]]), { nib: 0.14, color: '#6b6270' });
  part(S, T(ell(0, 1.6, 1.6, 1.5)), C.red, { pressure: 0.9, nib: 0.2 }); } };
/** A rubber stamp. arg: the word; "word|#hex" picks the ink. */
export const stamp = { w: 26, h: 12, draw(S, b, arg = 'APPROVED') { const [word, color = C.red] = arg.split('|'); const { s, cx, cy } = fit(b, 26, 12), rot = -0.22, w = S.measure(word, { size: 4.4 * s }) + 5 * s, h = 8.2 * s, T = (p) => tf(p, { x: cx, y: cy, rot });
  S.outline(T(rrect(-w / 2, -h / 2, w / 2, h / 2, 1.4 * s)), { nib: 0.5 * s, color, tremor: 0.1 });
  S.outline(T(rrect(-w / 2 + 1 * s, -h / 2 + 1 * s, w / 2 - 1 * s, h / 2 - 1 * s, 0.9 * s)), { nib: 0.16 * s, color, tremor: 0.08 });
  S.text(word, cx, cy, { size: 4.4 * s, color, align: 'center', baseline: 'middle', rot, alpha: 0.9 }); } };
export const pencil = { w: 18, h: 5, draw(S, b) { const { s, cx, cy } = fit(b, 18, 5), rot = -0.08, T = (p) => tf(p, { x: cx, y: cy, rot, s });
  part(S, T([[-7, -1.2], [5, -1.2], [5, 1.2], [-7, 1.2]]), C.yellow, { pressure: 0.78, nib: 0.24, angle: 0 });
  S.ink(T([[-7, -0.1], [5, -0.1]]), { nib: 0.1, color: C.woodDeep });
  part(S, T([[5, -1.2], [8.4, 0], [5, 1.2]]), '#e8d7b6', { pressure: 0.45, nib: 0.2, passes: 1 });
  part(S, T([[7.4, -0.36], [8.4, 0], [7.4, 0.36]]), C.graphite, { pressure: 0.95, nib: 0.12, passes: 1 });
  part(S, T([[-8.6, -1.2], [-7, -1.2], [-7, 1.2], [-8.6, 1.2]]), C.pink, { pressure: 0.7, nib: 0.2, passes: 1 });
  part(S, T([[-7, -1.3], [-6, -1.3], [-6, 1.3], [-7, 1.3]]), C.slate, { pressure: 0.7, nib: 0.14, passes: 1 }); } };
export const house = { w: 20, h: 18, draw(S, b) { const { s, cx, bottom } = fit(b, 20, 18), y = bottom - 0.6 * s, T = (p) => tf(p, { x: cx, y, s });
  S.ink(T([[-10, 0.3], [10, 0.3]]), { nib: 0.22 });
  part(S, T([[-7, -9], [7, -9], [7, 0], [-7, 0]]), '#f1e4c9', { pressure: 0.4, nib: 0.3, angle: 90 });
  part(S, T([[-8.4, -9], [0, -16.4], [8.4, -9]]), C.clay, { pressure: 0.7, nib: 0.3, angle: 20 });
  part(S, T([[4, -15.2], [6.2, -15.2], [6.2, -10.8], [4, -12.8]]), C.woodDeep, { pressure: 0.75, nib: 0.2, passes: 1 });
  part(S, T(rrect(-1.6, -5.6, 1.6, 0, 0.2)), C.woodDeep, { pressure: 0.78, nib: 0.22, passes: 1 });
  for (const sd of [-1, 1]) { part(S, T(rrect(sd * 2.8 - (sd < 0 ? 2.8 : 0), -7, sd * 2.8 + (sd > 0 ? 2.8 : 0), -4.2, 0.2)), C.sky, { pressure: 0.5, nib: 0.2, passes: 1 }); S.ink(T([[sd * 4.2, -7], [sd * 4.2, -4.2]]), { nib: 0.12 }); } } };
export const bin = { w: 13, h: 17, draw(S, b) { const { s, cx, bottom } = fit(b, 13, 17), y = bottom - 0.5 * s, T = (p) => tf(p, { x: cx + 0.6 * s, y, s }), R = S.R;
  const ball = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 2.6 * R.range(0.72, 1.18); ball.push([-1.2 + Math.cos(a) * r, -12.4 + Math.sin(a) * r * 0.9]); }
  part(S, T(ball), '#f4ecdb', { pressure: 0.25, passes: 1, nib: 0.22 });
  for (let i = 0; i < 4; i++) S.ink(T([[-1.2 + R.range(-2, 2), -12.4 + R.range(-1.6, 1.6)], [-1.2 + R.range(-2, 2), -12.4 + R.range(-1.6, 1.6)]]), { nib: 0.1, color: '#6b6270' });
  part(S, T([[-5.2, -10], [5.2, -10], [4.2, 0], [-4.2, 0]]), C.slate, { shadow: true, pressure: 0.42, nib: 0.3, angle: 90 });
  for (const lx of [-2.6, 0, 2.6]) S.ink(T([[lx * 1.15, -8.6], [lx, -1.2]]), { nib: 0.12, color: '#6b6270' });
  S.ink(T([[-5.8, -10], [5.8, -10]]), { nib: 0.3 }); } };
/** A wall clock. arg: "h:mm" sets the hands. */
export const clock = { w: 14, h: 14, draw(S, b, arg = '10:10') { const [hh, mm] = arg.split(':').map(Number); const { s, cx, cy } = fit(b, 14, 14), r = 6 * s, T = (p) => tf(p, { x: cx, y: cy, s });
  part(S, T(ell(0, 0, 6.6, 6.6)), '#f7f1e3', { shadow: true, pressure: 0.25, passes: 1, nib: 0.34 });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, l = i % 3 ? 0.7 : 1.3; S.ink(T([[Math.cos(a) * 5.4, Math.sin(a) * 5.4], [Math.cos(a) * (5.4 - l), Math.sin(a) * (5.4 - l)]]), { nib: i % 3 ? 0.14 : 0.24 }); }
  const ah = ((hh % 12) + (mm || 0) / 60) / 12 * Math.PI * 2 - Math.PI / 2, am = (mm || 0) / 60 * Math.PI * 2 - Math.PI / 2;
  S.ink(T([[0, 0], [Math.cos(ah) * 3, Math.sin(ah) * 3]]), { nib: 0.4 }); S.ink(T([[0, 0], [Math.cos(am) * 4.4, Math.sin(am) * 4.4]]), { nib: 0.28 }); S.dot(cx, cy, 0.45 * s); void r; } };
/** A coin or a note. arg: the sign, "$" by default. */
export const coin = { w: 12, h: 12, draw(S, b, arg = '$') { const { s, cx, cy } = fit(b, 12, 12), T = (p) => tf(p, { x: cx, y: cy, s });
  part(S, T(ell(0, 0, 5.4, 5.4)), C.yellow, { shadow: true, pressure: 0.7, nib: 0.3 }); S.outline(T(ell(0, 0, 4.2, 4.2)), { nib: 0.14, color: C.woodDeep });
  S.text(arg, cx, cy, { size: 6 * s, align: 'center', baseline: 'middle', color: C.woodDeep }); } };
/** A parcel, taped. arg: a label. */
export const parcel = { w: 18, h: 16, draw(S, b, arg = '') { const { s, cx, bottom } = fit(b, 18, 16), y = bottom - 0.6 * s, T = (p) => tf(p, { x: cx, y, s });
  S.ink(T([[-9.4, 0.3], [9.4, 0.3]]), { nib: 0.22 });
  part(S, T([[-7.5, -13], [7.5, -13], [7.5, 0], [-7.5, 0]]), C.wood, { shadow: true, pressure: 0.55, nib: 0.3, angle: 0 });
  S.ink(T([[-7.5, -6.5], [7.5, -6.5]]), { nib: 0.14, color: C.woodDeep }); S.ink(T([[0, -13], [0, 0]]), { nib: 0.14, color: C.woodDeep });
  part(S, T(rrect(-1, -13.2, 1, 0.2, 0.1)), '#e9dcb8', { pressure: 0.5, passes: 1, nib: 0.12 });
  if (arg) { part(S, T(rrect(-6.2, -5, -1.8, -1.6, 0.2)), '#faf5ea', { pressure: 0.2, passes: 1, nib: 0.14 }); S.text(arg, cx - 4 * s, y - 2.6 * s, { size: 2.2 * s, align: 'center' }); } } };
/** A pennant on a pole. arg: a word on the flag, or "|#hex" for its colour. */
export const flag = { w: 14, h: 20, draw(S, b, arg = '') { const [word, color = C.red] = arg.split('|'); const { s, cx, bottom } = fit(b, 14, 20), y = bottom - 0.4 * s, T = (p) => tf(p, { x: cx - 4 * s, y, s });
  S.ink(T([[0, 0], [0, -18.6]]), { nib: 0.36 }); S.dot(...T([[0, -18.8]])[0], 0.5 * s);
  part(S, T([[0.4, -18], [11.6, -14.6], [0.4, -11.2]]), color, { pressure: 0.75, nib: 0.28, angle: 10 });
  if (word) S.text(word, cx - 0.6 * s, y - 13.8 * s, { size: 2.4 * s, align: 'center', color: '#fff6ee' }); } };
/** A person. arg: "pose|shirt" with pose stand, wave, hold or point, and a shirt colour. */
export const person = { w: 12, h: 24, draw(S, b, arg = '') { const [pose = 'stand', shirt = C.teal] = arg.split('|'); const { s, cx, bottom } = fit(b, 12, 24), y = bottom - 0.4 * s, T = (p) => tf(p, { x: cx, y, s }), R = S.R;
  const arm = (side, kind) => { const sh = [side * 3.2, -16.2]; const hand = kind === 'wave' ? [side * 6.4, -22.6] : kind === 'hold' ? [side * 2.2, -11.2] : kind === 'point' ? [side * 8.2, -15.4] : [side * 4.4, -9.8]; const el = kind === 'wave' ? [side * 5.6, -18.6] : [(sh[0] + hand[0]) / 2 + side * 0.8, (sh[1] + hand[1]) / 2]; S.ink(T([sh, el, hand]), { nib: 0.9 * s, color: shirt === 'paper' ? C.ink : darker(shirt, 0.1) }); S.ink(T([el, hand]), { nib: 0.75 * s, color: C.skin }); part(S, T(ell(hand[0], hand[1], 1.1, 1.05)), C.skin, { pressure: 0.5, passes: 1, nib: 0.18 }); };
  for (const sd of [-1, 1]) { part(S, T([[sd * 0.6, -9.6], [sd * 2.8, -9.6], [sd * 3.1, -1.2], [sd * 1.2, -1.2]]), C.navy, { pressure: 0.8, nib: 0.24, passes: 1 }); part(S, T(ell(sd * 2.4, -0.6, 2.2, 1.1)), C.graphite, { pressure: 0.9, nib: 0.22, passes: 1 }); }
  arm(-1, pose === 'wave' || pose === 'point' ? 'stand' : pose);
  part(S, T([[-3.4, -17.2], [3.4, -17.2], [3.9, -9.4], [-3.9, -9.4]]), shirt, { pressure: 0.68, nib: 0.28 });
  part(S, T(ell(0, -20.4, 2.7, 2.9)), C.skin, { pressure: 0.42, passes: 1, nib: 0.28 });
  part(S, T([[-2.9, -20.8], [-2.4, -23.4], [0, -23.9], [2.4, -23.4], [2.9, -20.8], [1.6, -21.6], [0, -22.2], [-1.6, -21.6]]), R.pick(['#3b2f2a', '#6b4a2e', '#2a2430', '#b5713b']), { pressure: 0.9, nib: 0.22, passes: 1 });
  for (const sd of [-1, 1]) S.dot(...T([[sd * 0.9, -20.6]])[0], 0.28 * s);
  S.ink(T([[-0.9, -19.1], [0, -18.6], [0.9, -19.1]]), { nib: 0.18 });
  arm(1, pose); } };
export const check = { w: 6, h: 6, draw(S, b, arg) { const { s, cx, cy } = fit(b, 6, 6); S.ink([[cx - 2.2 * s, cy], [cx - 0.5 * s, cy + 1.8 * s], [cx + 2.6 * s, cy - 2.4 * s]], { nib: 0.5 * s, color: arg || C.green }); } };
export const cross = { w: 6, h: 6, draw(S, b, arg) { const { s, cx, cy } = fit(b, 6, 6), c = arg || C.red; S.ink([[cx - 2 * s, cy - 2 * s], [cx + 2 * s, cy + 2 * s]], { nib: 0.45 * s, color: c }); S.ink([[cx + 2 * s, cy - 2 * s], [cx - 2 * s, cy + 2 * s]], { nib: 0.45 * s, color: c }); } };
export const OBJECTS = { pen, document, envelope, stamp, pencil, house, bin, clock, coin, parcel, flag, person, check, cross };
