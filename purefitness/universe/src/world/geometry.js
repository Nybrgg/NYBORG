// Geometry helpers. All UVs are written in metres so one tiling texture per
// material reads at real-world scale on any surface (texture.repeat = 1 / tile).
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const cache = new Map();
const cached = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};

/** Box with UVs in metres on every face. Optional uv offset breaks visible repetition. */
export function boxGeometry(w, h, d, offset = 0) {
  return cached(`box:${w}:${h}:${d}:${offset}`, () => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const uv = geometry.attributes.uv;
    // Face order: +x, -x, +y, -y, +z, -z (4 vertices each).
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let face = 0; face < 6; face++) {
      for (let v = 0; v < 4; v++) {
        const i = face * 4 + v;
        uv.setXY(i, uv.getX(i) * dims[face][0] + offset, uv.getY(i) * dims[face][1] + offset * 0.37);
      }
    }
    return geometry;
  });
}

export function roundedBoxGeometry(w, h, d, radius = 0.02, segments = 2) {
  return cached(`rbox:${w}:${h}:${d}:${radius}:${segments}`, () => {
    const geometry = new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2.01, h / 2.01, d / 2.01));
    const uv = geometry.attributes.uv;
    const pos = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    // Re-project UVs (triplanar by dominant normal) in metres.
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(normal.getX(i)), ny = Math.abs(normal.getY(i)), nz = Math.abs(normal.getZ(i));
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (nx >= ny && nx >= nz) uv.setXY(i, z, y);
      else if (ny >= nz) uv.setXY(i, x, z);
      else uv.setXY(i, x, y);
    }
    return geometry;
  });
}

export function planeGeometry(w, h, offsetU = 0, offsetV = 0) {
  return cached(`plane:${w}:${h}:${offsetU}:${offsetV}`, () => {
    const geometry = new THREE.PlaneGeometry(w, h);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + offsetU, uv.getY(i) * h + offsetV);
    return geometry;
  });
}

export function unitPlaneGeometry() {
  return cached('unitplane', () => new THREE.PlaneGeometry(1, 1));
}

/** Unit plane whose UVs cover one cell of a cols x rows texture atlas. */
export function atlasPlaneGeometry(cols, rows, index) {
  return cached(`atlas:${cols}:${rows}:${index}`, () => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const uv = geometry.attributes.uv;
    const cx = index % cols;
    const cy = Math.floor(index / cols) % rows;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / cols, (cy + uv.getY(i)) / rows);
    return geometry;
  });
}

export function cylinderGeometry(rTop, rBottom, h, segments = 24, open = false) {
  return cached(`cyl:${rTop}:${rBottom}:${h}:${segments}:${open}`, () => {
    const geometry = new THREE.CylinderGeometry(rTop, rBottom, h, segments, 1, open);
    const uv = geometry.attributes.uv;
    const circumference = Math.PI * 2 * Math.max(rTop, rBottom);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circumference, uv.getY(i) * h);
    return geometry;
  });
}

/** Lathe from a 2D profile [[radius, y], ...] (metres). */
export function latheGeometry(key, profile, segments = 40) {
  return cached(`lathe:${key}:${segments}`, () => {
    const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
    const geometry = new THREE.LatheGeometry(points, segments);
    geometry.computeVertexNormals();
    return geometry;
  });
}

export function torusGeometry(radius, tube, radial = 12, tubular = 32, arc = Math.PI * 2) {
  return cached(`torus:${radius}:${tube}:${radial}:${tubular}:${arc}`, () => new THREE.TorusGeometry(radius, tube, radial, tubular, arc));
}

/** Tube through points (for cables, rails and handles). */
export function tubeGeometry(key, points, radius, tubular = 48, radial = 10) {
  return cached(`tube:${key}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), tubular, radius, radial, false));
}

/** Hexagonal prism (hex dumbbell heads), axis along X. */
export function hexGeometry(radius, length) {
  return cached(`hex:${radius}:${length}`, () => {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 6, 1, false);
    geometry.rotateZ(Math.PI / 2);
    geometry.rotateX(Math.PI / 6);
    return geometry;
  });
}

/**
 * Merge a list of [geometry, matrix] into one geometry. Used to batch static
 * detail per material so a room renders in a few draw calls.
 */
export function mergeParts(parts) {
  if (!parts.length) return null;
  const geometries = parts.map(([geometry, matrix]) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(matrix);
    return g;
  });
  const merged = mergeGeometries(geometries, false);
  geometries.forEach(g => g.dispose());
  return mergeVertices(merged, 1e-5);
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
export function matrix(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return _m.clone().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

export function disposeGeometryCache() {
  for (const geometry of cache.values()) geometry.dispose();
  cache.clear();
}
