// Street, landscaping and street furniture shared by all five buildings.
// Buildings line the north side of a street running along +x; the promenade
// is z in [0.3, 8], the road z in [8, 15.5], the far pavement beyond.
import * as THREE from 'three';
import { cylinderGeometry, roundedBoxGeometry } from './geometry.js';

const HALF = Math.PI / 2;

export function buildExterior(b, { xMin, xMax, buildings, mobile }) {
  const length = xMax - xMin;
  const cx = (xMin + xMax) / 2;
  // Ground beyond the streetscape.
  b.floor('grass', length + 400, 360, cx, -0.02, -80);
  // Promenade, kerbs, road and far pavement.
  b.floor('paving', length, 7.8, cx, 0.001, 4.2);
  b.box('concreteWallDark', length, 0.14, 0.3, cx, 0.0, 8.05);
  b.floor('asphalt', length + 200, 7.4, cx, -0.07, 11.8);
  b.box('concreteWallDark', length + 200, 0.14, 0.3, cx, 0.0, 15.55);
  b.floor('paving', length + 200, 4, cx, 0.001, 17.7);
  b.floor('grass', length + 200, 8, cx, 0.002, 23.7);
  // Road markings: dashed centre line and edge lines.
  for (let x = xMin - 100; x < xMax + 100; x += 6) b.box('turfLine', 3, 0.004, 0.12, x, -0.066, 11.8, 0, { cast: false });
  b.box('turfLine', length + 200, 0.004, 0.1, cx, -0.066, 8.55, 0, { cast: false });
  b.box('turfLine', length + 200, 0.004, 0.1, cx, -0.066, 15.05, 0, { cast: false });
  // Zebra crossings in front of each entrance.
  for (const building of buildings) {
    const x = building.x + building.entry;
    for (let i = 0; i < 7; i++) b.box('turfLine', 0.5, 0.004, 6.2, x - 3 + i * 1.0, -0.066, 11.8, 0, { cast: false });
  }
  // Forecourt pockets between buildings: lawn, trees, bench and bike stands.
  for (let i = 0; i < buildings.length - 1; i++) {
    const a = buildings[i];
    const n = buildings[i + 1];
    const x0 = a.x + a.width / 2 + 0.5;
    const x1 = n.x - n.width / 2 - 0.5;
    const mid = (x0 + x1) / 2;
    const w = x1 - x0;
    b.box('concreteWallDark', w, 0.38, 14, mid, 0.19, -6.6);
    b.floor('grass', w - 0.2, 13.8, mid, 0.392, -6.6);
    columnTree(b, mid - w * 0.25, 0.38, -3.5, 7.5, 1 + i);
    columnTree(b, mid + w * 0.22, 0.38, -9.5, 8.5, 5 + i);
    b.at(mid - 1, 0, 2.6, 0, () => streetBench(b));
    for (let k = 0; k < 4; k++) bikeStand(b, mid + 2 + k * 0.9, 2.2);
  }
  // Trees and hedge along the far side.
  if (!mobile) for (let x = xMin - 30; x < xMax + 30; x += 11) columnTree(b, x + ((x * 7) % 3), 0, 23.5, 7 + ((x * 13) % 3), Math.round(x));
  b.box('hedge', length + 120, 1.3, 1.2, cx, 0.65, 27.5);
  // Street lights along the kerb.
  const lamps = [];
  for (let x = xMin + 4; x < xMax; x += 17) lamps.push(streetLight(b, x, 7.5));
  // Bollards at the entrances.
  for (const building of buildings) {
    for (const dx of [-2.6, 2.6]) b.add('aluminiumDark', cylinderGeometry(0.09, 0.09, 0.9, 16), building.x + building.entry + dx, 0.45, 6.6);
  }
  return { lamps };
}

/** Fastigiate hornbeam: straight trunk with a dense egg-shaped crown. */
function columnTree(b, x, y, z, height, seed) {
  const trunk = height * 0.28;
  b.add('bark', cylinderGeometry(0.09, 0.14, trunk, 10), x, y + trunk / 2, z);
  b.add('foliage', crownGeometry(seed), x, y + trunk + height * 0.36 - 0.4, z, 0, seed, 0, 1.25, height * 0.38, 1.25);
  b.contactShadow(3, 3, x, z, 0, y + 0.006);
}

const crowns = new Map();
function crownGeometry(seed) {
  const key = seed % 4;
  if (crowns.has(key)) return crowns.get(key);
  const geometry = new THREE.IcosahedronGeometry(1, 5);
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  const s = key * 1.7 + 0.3;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 7 + s) * Math.sin(v.y * 6.3 + s * 2) * Math.sin(v.z * 7.7 - s) * 0.12 + Math.sin(v.x * 17 + v.z * 13 + s) * 0.04;
    const taper = v.y > 0 ? 1 - v.y * 0.25 : 1 + v.y * 0.1;
    v.multiplyScalar(1 + n);
    v.x *= taper;
    v.z *= taper;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  crowns.set(key, geometry);
  return geometry;
}

function streetLight(b, x, z) {
  const height = 5.2;
  b.add('aluminiumDark', cylinderGeometry(0.05, 0.075, height, 14), x, height / 2, z);
  b.add('aluminiumDark', roundedBoxGeometry(0.9, 0.08, 0.22, 0.03), x - 0.35, height + 0.02, z);
  b.box('ledWarm', 0.7, 0.004, 0.14, x - 0.4, height - 0.022, z, 0, { cast: false });
  b.add('concreteWallDark', cylinderGeometry(0.16, 0.16, 0.25, 14), x, 0.12, z);
  return [x - 0.4, height - 0.03, z];
}

function streetBench(b) {
  b.block('concreteWallDark', 0.5, 0.42, 0.5, -0.9, 0, 0);
  b.block('concreteWallDark', 0.5, 0.42, 0.5, 0.9, 0, 0);
  for (let i = 0; i < 5; i++) b.block('oak', 2.4, 0.04, 0.08, 0, 0.42, -0.2 + i * 0.1);
  b.contactShadow(2.8, 0.9, 0, 0);
}

function bikeStand(b, x, z) {
  b.add('steel', new THREE.TorusGeometry(0.38, 0.025, 8, 24, Math.PI), x, 0.42, z, 0, HALF, 0);
  b.rod('steel', 0.025, [x, 0, z - 0.38], [x, 0.42, z - 0.38], 8);
  b.rod('steel', 0.025, [x, 0, z + 0.38], [x, 0.42, z + 0.38], 8);
}
