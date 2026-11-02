// place.mjs — finds room on the plate for a thing, beside the card it belongs to, where no arrow or word is.
export function makePlacer({ taken, edgePts, bounds }) {
  const inside = (b, x, y) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
  const free = (b) => b.x0 > bounds.x0 && b.x1 < bounds.x1 && b.y0 > bounds.y0 && b.y1 < bounds.y1
    && !taken.some((t) => b.x0 < t.x1 + 1.2 && b.x1 > t.x0 - 1.2 && b.y0 < t.y1 + 1.2 && b.y1 > t.y0 - 1.2)
    && !edgePts.some(([x, y]) => inside({ x0: b.x0 - 1, x1: b.x1 + 1, y0: b.y0 - 1, y1: b.y1 + 1 }, x, y));
  const claim = (b) => { taken.push(b); return b; };
  /** Beside a box: tries each side at growing distances, sliding along the side. */
  const near = (nb, w, h, prefs = ['right', 'left', 'below', 'above']) => {
    if (!nb) return null;
    for (const off of [3, 6, 10, 15, 22]) for (const side of prefs) {
      const horizontal = side === 'right' || side === 'left';
      const cx = side === 'right' ? nb.x1 + off + w / 2 : side === 'left' ? nb.x0 - off - w / 2 : (nb.x0 + nb.x1) / 2;
      const cy = side === 'below' ? nb.y1 + off + h / 2 : side === 'above' ? nb.y0 - off - h / 2 : (nb.y0 + nb.y1) / 2;
      for (const slide of [0, -0.5, 0.5, -1, 1]) {
        const dx = horizontal ? 0 : slide * w, dy = horizontal ? slide * h : 0;
        const b = { x0: cx - w / 2 + dx, x1: cx + w / 2 + dx, y0: cy - h / 2 + dy, y1: cy + h / 2 + dy };
        if (free(b)) return claim(b);
      }
    }
    return null;
  };
  /** Anywhere: tries the given spots (bottom-centre points), then a coarse sweep of the plate. */
  const anywhere = (w, h, spots = []) => {
    for (const [x, y] of spots) for (const dx of [0, 6, -6, 12, -12]) { const b = { x0: x + dx - w / 2, y0: y - h, x1: x + dx + w / 2, y1: y }; if (free(b)) return claim(b); }
    for (let y = bounds.y1 - 1; y > bounds.y0 + h; y -= 8) for (let x = bounds.x0 + 1 + w / 2; x < bounds.x1 - w / 2; x += 8) { const b = { x0: x - w / 2, y0: y - h, x1: x + w / 2, y1: y }; if (free(b)) return claim(b); }
    return null;
  };
  return { free, near, anywhere, claim };
}
