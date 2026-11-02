// An example scene: a counter with a till in a free corner, and a hand-written note beside the state that
// breaks a rule. Run: plate.mjs chart.mmd --scene references/scene-example.mjs
export default function scene({ S, kit, objects, res, placer, u }) {
  const { rrect, ell, part, C } = kit;
  // a counter, wherever there is room for 44 x 22 mm
  const b = placer.anywhere(44 * u, 22 * u, [[36 * u, 204 * u], [180 * u, 204 * u], [36 * u, 110 * u]]);
  if (b) {
    const cx = (b.x0 + b.x1) / 2, y = b.y1 - 0.6 * u, T = (p) => kit.tf(p, { x: cx, y, s: u });
    S.ink(T([[-22, 0.3], [22, 0.3]]), { nib: 0.24 });
    part(S, T([[-16, -14], [16, -14], [16, 0], [-16, 0]]), C.cream, { pressure: 0.42, nib: 0.3 });
    for (let x = -10; x < 16; x += 8) S.ink(T([[x, -12], [x, -1.6]]), { nib: 0.12, color: '#6b6270' });
    part(S, T([[-18, -17], [18, -17], [18, -14], [-18, -14]]), C.wood, { pressure: 0.7, nib: 0.3, angle: 8 });
    part(S, T(rrect(4, -24, 14, -17, 0.6)), C.slate, { pressure: 0.6, nib: 0.26 });
    part(S, T(ell(-8, -19.4, 3.6, 1.6)), '#f2f2f2', { pressure: 0.2, passes: 1, nib: 0.22 });
  }
  // a note beside the broken state, in the reader's words
  const broken = res.nodeBoxes.find((nb) => nb.n.classes.includes('breaks'));
  const nb = broken && placer.near(broken, 30 * u, 14 * u, ['below', 'right', 'left']);
  if (nb) {
    const shape = rrect(nb.x0, nb.y0, nb.x1, nb.y1, 0.6 * u);
    S.hatch(shape.map(([x, y]) => [x + u, y + 1.1 * u]), { cut: [shape] }); S.fill(shape); S.pencil(shape, '#fbf3dc', { pressure: 0.45, passes: 1 }); S.outline(shape, { nib: 0.28 });
    S.text('TLC found this in 3 steps.', (nb.x0 + nb.x1) / 2, nb.y0 + 5.6 * u, { size: 3.2 * u, align: 'center', font: 'Caveat', weight: 700 });
    S.text('Who should have waited?', (nb.x0 + nb.x1) / 2, nb.y0 + 10.6 * u, { size: 3.0 * u, align: 'center', font: 'Caveat' });
  }
  // the objects library is there too
  const pb = placer.anywhere(objects.pen.w * u, objects.pen.h * u, [[196 * u, 60 * u]]);
  if (pb) objects.pen.draw(S, pb);
}
