// Camera route: one continuous walk at eye height through all five buildings.
// Keys are [t, px, py, pz, tx, ty, tz] with global progress t in 0..1, and are
// interpolated with a monotone cubic (Fritsch–Carlson) so speed stays even
// and the path never overshoots through walls.
import { CHAPTERS } from '../shared.js';

const EYE = 1.68;

export function buildRoute(sites) {
  const keys = [];
  const push = (chapter, r, pos, target) => keys.push([(chapter + r) / CHAPTERS, ...pos, ...target]);
  sites.forEach((site, chapter) => {
    const { x: bx, entry, exit, room } = site;
    const world = p => [p[0] + bx, p[1], p[2]];
    const e = bx + entry;
    // Arrival: establishing view from the far pavement, then over the zebra crossing.
    const lift = Math.min(4.5, site.height * 0.45 + (site.tall ? 2.2 : 0));
    if (chapter === 0) push(chapter, 0, [bx - 9, 1.74, 24], [bx + 1, 3.4, -8]);
    else push(chapter, 0, [e + 2.5, 1.74, 18.2], [bx + 0.5, lift, -6]);
    push(chapter, 0.13, [e - 0.6, 1.72, 11.5], [e + 0.6, 2.1, -6]);
    push(chapter, 0.25, [e, EYE, 2.9], [e, 1.62, -8]);
    for (const key of ['inside', 'room', 'mid', 'equipment', 'through', 'exit']) {
      const k = room.keys[key];
      push(chapter, k.r, world(k.pos), world(k.target));
    }
    const out = bx + exit;
    if (chapter < CHAPTERS - 1) {
      push(chapter, 0.9, [out + 2.2, 1.7, 5.2], [out + 16, 1.75, 12]);
    } else {
      push(chapter, 0.87, [out + 3, 1.75, 17.6], [bx - 34, 3.2, -4]);
      push(chapter, 1, [out + 5.5, 1.8, 19.4], [bx - 36, 3.4, -4]);
    }
  });
  return monotoneCubic(keys);
}

function monotoneCubic(keys) {
  const n = keys.length;
  const dims = keys[0].length - 1;
  const slopes = keys.map((key, i) => {
    const out = new Array(dims);
    const prev = keys[Math.max(0, i - 1)];
    const next = keys[Math.min(n - 1, i + 1)];
    for (let d = 0; d < dims; d++) {
      const c = d + 1;
      if (i === 0 || i === n - 1) { out[d] = (next[c] - prev[c]) / (next[0] - prev[0]); continue; }
      const h0 = key[0] - prev[0];
      const h1 = next[0] - key[0];
      const s0 = (key[c] - prev[c]) / h0;
      const s1 = (next[c] - key[c]) / h1;
      if (s0 * s1 <= 0) { out[d] = 0; continue; }
      const w0 = 2 * h1 + h0;
      const w1 = h1 + 2 * h0;
      out[d] = (w0 + w1) / (w0 / s0 + w1 / s1);
    }
    return out;
  });
  const result = new Float64Array(dims);
  return t => {
    let i = 0;
    while (i < n - 2 && t > keys[i + 1][0]) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const h = b[0] - a[0];
    const s = Math.min(1, Math.max(0, (t - a[0]) / h));
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    for (let d = 0; d < dims; d++) result[d] = h00 * a[d + 1] + h10 * h * slopes[i][d] + h01 * b[d + 1] + h11 * h * slopes[i + 1][d];
    return result;
  };
}
