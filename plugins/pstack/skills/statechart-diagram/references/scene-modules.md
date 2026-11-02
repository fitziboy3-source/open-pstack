# Scene modules

When `--near` and `--anywhere` are not enough, give `--scene FILE.mjs`. It runs after the chart and the
objects are drawn and before the small print, with one argument:

```js
export default function scene(ctx) { /* draw */ }
```

`ctx` holds:

| field | what it is |
|---|---|
| `S` | the sheet: `S.ink(points, {nib, tremor, color, dash})`, `S.outline(poly, …)`, `S.box(x0,y0,x1,y1, …)`, `S.pencil(poly, color, {pressure, angle, passes})`, `S.hatch(poly, {cut})`, `S.fill(poly)`, `S.dot(x,y,r,color)`, `S.text(str, x, y, {size, font, weight, align, color, rot})`, `S.measure(str, {size})`, `S.R` the seeded random (`S.R()`, `S.R.range(a,b)`, `S.R.gauss(m,s)`, `S.R.pick(list)`). Units are millimetres, origin top left. |
| `kit` | `rrect(x0,y0,x1,y1,r)`, `ell(cx,cy,rx,ry,rot)`, `tf(points, {x,y,rot,s})`, `part(S, poly, color, {shadow, pressure, nib})`, `C` (named colours), `GROUP` and `MARK` (the chart colours) |
| `objects` | the object library: each is `{ w, h, draw(S, box, arg) }`; `box` is `{x0,y0,x1,y1}` in mm |
| `res` | what the chart drawer placed: `nodeBoxes` (`{x0,y0,x1,y1,n}` with `n.id`, `n.lines`, `n.classes`), `labelBoxes`, `clusterBoxes`, `edgeInfo` (`{id, from, to, bug}`), `stateSize`, `labelSize` |
| `placer` | `near(box, w, h, ['right','left','below','above'])` and `anywhere(w, h, [[x,yBottom], …])` return a free box and claim it, or `null`; `free(box)` tests one; `claim(box)` reserves one you drew into by hand |
| `L`, `m` | Pele's layout in its pixels, and the mapper into plate mm: `m.P([x,y])`, `m.X(x)`, `m.Y(y)`, `m.k` |
| `u` | the plate scale: 1 at 216 mm. Multiply hand-placed coordinates by it. |
| `title`, `legend`, `report`, `placed`, `skipped` | the words at the top, the legend entries, what `report.md` said, and what was placed or skipped so far |

Three habits keep a scene honest:

- Ask the placer before drawing anything free-standing, and draw into the box it returns. That is how the
  plate stays uncluttered as the chart changes.
- Build a thing from `kit.part` (paper, pencil, pen, in that order) and `S.ink` lines, the way the objects
  in `scripts/lib/objects.mjs` do. Read one of those before writing your own.
- Scale with `u`, so the scene still works at `--size 180`.

`references/scene-example.mjs` draws a shop counter under a chart and a note beside the broken state.
