// Building shells, curtain-wall facades, automatic sliding doors and luminaires.
// Local frame per building: facade plane at z = 0 facing +z (street side),
// interior spans z in [-depth, 0] and x in [-width/2, width/2], floor at y = 0.
import * as THREE from 'three';
import { boxGeometry, roundedBoxGeometry, atlasPlaneGeometry } from './geometry.js';

const WALL = 0.3;

/**
 * Interior + exterior shell.
 * spec: { width, depth, height, floor, walls: { back, left, right, front }, ceiling, exterior, roof, plinth }
 */
export function shell(b, spec) {
  const { width: W, depth: D, height: H } = spec;
  const walls = { back: 'plaster', left: 'plaster', right: 'plaster', ...spec.walls };
  const exterior = spec.exterior || 'concretePanel';
  // Floor + slab edge.
  b.floor(spec.floor || 'polishedConcrete', W, D, 0, 0, -D / 2);
  b.box('@concreteWallDark', W + 2 * WALL, 0.3, D + WALL, 0, -0.17, -D / 2 - WALL / 2);
  // Interior wall faces.
  b.wall(walls.back, W, H, 0, 0, -D + 0.015);
  b.wall(walls.left, D, H, -W / 2 + 0.015, 0, -D / 2, Math.PI / 2);
  b.wall(walls.right, D, H, W / 2 - 0.015, 0, -D / 2, -Math.PI / 2);
  // Ceiling.
  b.floor(spec.ceiling || 'plaster', W, D, 0, H, -D / 2, 0, true, { cast: false });
  // Exterior volumes (walls carry the facade material outside).
  const top = H + (spec.roofDepth ?? 0.9);
  b.box('@' + exterior, WALL, top, D + WALL, -W / 2 - WALL / 2, top / 2, -D / 2 - WALL / 2);
  b.box('@' + exterior, WALL, top, D + WALL, W / 2 + WALL / 2, top / 2, -D / 2 - WALL / 2);
  b.box('@' + exterior, W, top, WALL, 0, top / 2, -D - WALL / 2);
  // Roof slab and parapet.
  b.box('@' + (spec.roof || 'concreteWallDark'), W + 2 * WALL, 0.25, D + WALL, 0, top - 0.125, -D / 2 - WALL / 2);
  b.box('@' + (spec.fascia || 'claddingDark'), W + 2 * WALL + 0.02, 0.18, WALL + 0.04, 0, top + 0.09, 0.02);
  // Ceiling void band above the glazing on the facade.
  b.box('@' + (spec.fascia || 'claddingDark'), W + 2 * WALL, top - H, WALL, 0, H + (top - H) / 2, -WALL / 2);
  if (spec.plinth !== false) b.box('@concreteWallDark', W + 2 * WALL + 0.1, 0.12, 0.5, 0, 0.06 - 0.1, 0.2);
}

/**
 * Floor-to-ceiling curtain wall along the facade with door openings.
 * doors: [{ x, width }] centre positions; returns door rigs for animation.
 */
export function curtainWall(b, spec, material) {
  const { width: W, height: H } = spec;
  const module = spec.module || 1.5;
  const doors = spec.doors || [];
  const inDoor = x => doors.some(d => Math.abs(x - d.x) < d.width / 2 + 0.01);
  const rigs = [];
  // Head and sill transoms.
  b.box('@aluminiumDark', W, 0.12, 0.16, 0, H - 0.06, 0);
  b.box('@aluminiumDark', W, 0.08, 0.16, 0, 0.04, 0);
  if (spec.transom) b.box('@aluminiumDark', W, 0.05, 0.12, 0, spec.transom, 0);
  // Mullions.
  const count = Math.round(W / module);
  const step = W / count;
  for (let i = 0; i <= count; i++) {
    const x = -W / 2 + i * step;
    if (inDoor(x)) continue;
    b.box('@aluminiumDark', 0.06, H, 0.16, x, H / 2, 0);
  }
  // Glass panes (skip door openings, which get their own frames).
  for (let i = 0; i < count; i++) {
    const x0 = -W / 2 + i * step;
    const x1 = x0 + step;
    const cx = (x0 + x1) / 2;
    if (inDoor(cx)) continue;
    b.add('@glass', boxGeometry(step - 0.06, H - 0.2, 0.012), cx, H / 2, 0, 0, 0, 0, 1, 1, 1, { cast: false });
  }
  for (const door of doors) {
    const dw = door.width;
    const dh = Math.min(2.5, H - 0.2);
    // Door portal frame.
    b.box('@aluminiumDark', 0.09, H, 0.2, door.x - dw / 2 - 0.045, H / 2, 0);
    b.box('@aluminiumDark', 0.09, H, 0.2, door.x + dw / 2 + 0.045, H / 2, 0);
    b.box('@aluminiumDark', dw, 0.22, 0.24, door.x, dh + 0.11, 0.02);
    if (H - dh > 0.4) b.add('@glass', boxGeometry(dw, H - dh - 0.3, 0.012), door.x, dh + 0.22 + (H - dh - 0.3) / 2, 0, 0, 0, 0, 1, 1, 1, { cast: false });
    // Door sensor and threshold.
    b.box('@plasticBlack', 0.18, 0.04, 0.06, door.x, dh + 0.02, 0.16);
    b.box('@aluminium', dw + 0.2, 0.01, 0.3, door.x, 0.005, 0, 0, { cast: false });
    // Entrance mat.
    b.box('rubberMatte', dw + 0.6, 0.012, 1.6, door.x, 0.006, -1.0, 0, { cast: false });
    rigs.push(slidingDoor(b, door.x, dw, dh, material));
  }
  return rigs;
}

function slidingDoor(b, x, width, height, material) {
  const rig = new THREE.Group();
  rig.position.set(x, 0, 0.06);
  const leafWidth = width / 2 + 0.03;
  const leaves = [-1, 1].map(side => {
    const leaf = new THREE.Group();
    const frame = material('@aluminiumDark');
    const glass = material('@glass');
    const pieces = [
      [frame, 0.05, height, 0.05, side * (leafWidth / 2 - 0.025), height / 2],
      [frame, 0.05, height, 0.05, -side * (leafWidth / 2 - 0.025), height / 2],
      [frame, leafWidth, 0.06, 0.05, 0, 0.03],
      [frame, leafWidth, 0.06, 0.05, 0, height - 0.03],
    ];
    for (const [mat, w, h, d, px, py] of pieces) {
      const mesh = new THREE.Mesh(boxGeometry(w, h, d), mat);
      mesh.position.set(px, py, 0);
      mesh.castShadow = true;
      leaf.add(mesh);
    }
    const pane = new THREE.Mesh(boxGeometry(leafWidth - 0.1, height - 0.12, 0.01), glass);
    pane.position.set(0, height / 2, 0);
    pane.renderOrder = 2;
    leaf.add(pane);
    const handle = new THREE.Mesh(roundedBoxGeometry(0.03, 0.5, 0.03, 0.01), material('@steel'));
    handle.position.set(-side * (leafWidth / 2 - 0.12), 1.05, 0.05);
    leaf.add(handle);
    leaf.userData.closed = side * (leafWidth / 2 - 0.03);
    leaf.userData.travel = side * (leafWidth - 0.02);
    leaf.position.x = leaf.userData.closed;
    rig.add(leaf);
    return leaf;
  });
  rig.userData = { leaves, open: 0 };
  b.keep(rig);
  return rig;
}

/** Animate a door rig: amount 0 (closed) .. 1 (open). */
export function setDoorOpen(rig, amount) {
  const eased = amount * amount * (3 - 2 * amount);
  rig.userData.open = eased;
  for (const leaf of rig.userData.leaves) leaf.position.x = leaf.userData.closed + leaf.userData.travel * eased;
}

/** Recessed or suspended linear LED luminaire along local x. */
export function linearLight(b, x, y, z, length, { ry = 0, emitter = 'ledNeutral', housing = 'aluminiumDark', suspended = 0, width = 0.07 } = {}) {
  b.at(x, y, z, ry, () => {
    b.box(housing, length, 0.07, width + 0.02, 0, -0.035, 0, 0, { cast: false });
    b.box(emitter, length - 0.04, 0.004, width, 0, -0.072, 0, 0, { cast: false });
    if (suspended > 0) {
      b.rod('steel', 0.0012, [-length / 2 + 0.2, 0, 0], [-length / 2 + 0.2, suspended, 0], 4, { cast: false });
      b.rod('steel', 0.0012, [length / 2 - 0.2, 0, 0], [length / 2 - 0.2, suspended, 0], 4, { cast: false });
    }
  });
}

/** Round downlight flush with the ceiling. */
export function downlight(b, x, y, z, emitter = 'ledWarm', radius = 0.06) {
  b.add('aluminium', new THREE.CylinderGeometry(radius + 0.015, radius + 0.015, 0.006, 24), x, y - 0.003, z, 0, 0, 0, 1, 1, 1, { cast: false });
  b.add(emitter, new THREE.CylinderGeometry(radius, radius, 0.002, 24), x, y - 0.007, z, 0, 0, 0, 1, 1, 1, { cast: false });
}

/** Exposed spiral duct (industrial ceilings). */
export function duct(b, x0, x1, y, z, radius = 0.3) {
  const length = Math.abs(x1 - x0);
  b.add('aluminium', new THREE.CylinderGeometry(radius, radius, length, 28, 1, true), (x0 + x1) / 2, y, z, 0, 0, Math.PI / 2, 1, 1, 1, { cast: false });
  for (let x = Math.min(x0, x1) + 1.2; x < Math.max(x0, x1); x += 2.4) {
    b.add('aluminium', new THREE.TorusGeometry(radius + 0.005, 0.012, 6, 28), x, y, z, 0, Math.PI / 2, 0, 1, 1, 1, { cast: false });
    b.rod('steel', 0.004, [x, y + radius, z], [x, y + radius + 0.9, z], 4, { cast: false });
  }
}

/**
 * Upper storeys above a ground-floor venue (hotel, office). Punched or ribbon
 * windows with lit interiors behind tinted glass.
 */
export function upperFloors(b, { width: W, depth: D, base, floors, floorHeight = 3.3, style = 'ribbon', material = 'concretePanel', seed = 7 }) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const total = floors * floorHeight;
  b.box('@' + material, W + 0.6, total, D + 0.3, 0, base + total / 2, -D / 2 - 0.15);
  for (let f = 0; f < floors; f++) {
    const y = base + f * floorHeight;
    if (style === 'ribbon') {
      const h = floorHeight * 0.58;
      b.box('@aluminiumDark', W - 0.4, h + 0.08, 0.06, 0, y + 0.95 + h / 2, 0.15);
      const panes = Math.round((W - 0.4) / 1.35);
      for (let i = 0; i < panes; i++) {
        const cx = -(W - 0.4) / 2 + (i + 0.5) * ((W - 0.4) / panes);
        const lit = rand() > 0.45;
        b.add(lit ? '@windowLit' : '@windowDim', atlasPlaneGeometry(4, 2, Math.floor(rand() * 8)), cx, y + 0.95 + h / 2, 0.17, 0, 0, 0, (W - 0.4) / panes - 0.05, h, 1, { cast: false });
        b.add('@glassTinted', boxGeometry((W - 0.4) / panes - 0.05, h, 0.01), cx, y + 0.95 + h / 2, 0.19, 0, 0, 0, 1, 1, 1, { cast: false });
      }
    } else {
      const count = Math.floor(W / 2.4);
      for (let i = 0; i < count; i++) {
        const cx = -W / 2 + (i + 0.5) * (W / count);
        const lit = rand() > 0.5;
        b.box('@aluminiumDark', 1.36, 1.86, 0.08, cx, y + 1.0 + 0.93, 0.16);
        b.add(lit ? '@windowLit' : '@windowDim', atlasPlaneGeometry(4, 2, Math.floor(rand() * 8)), cx, y + 1.0 + 0.9, 0.205, 0, 0, 0, 1.3, 1.8, 1, { cast: false });
        b.add('@glassTinted', boxGeometry(1.3, 1.8, 0.01), cx, y + 1.0 + 0.9, 0.21, 0, 0, 0, 1, 1, 1, { cast: false });
        if (style === 'balcony') {
          b.box('@concreteWallDark', 1.9, 0.16, 1.1, cx, y + 0.08, 0.7);
          b.box('@glass', 1.9, 1.0, 0.012, cx, y + 0.66, 1.24, 0, { cast: false });
          b.box('@aluminiumDark', 1.9, 0.04, 0.05, cx, y + 1.18, 1.24);
        }
      }
    }
  }
  // Side elevations get punched windows too.
  for (let f = 0; f < floors; f++) {
    const y = base + f * floorHeight + 1.0;
    for (const side of [-1, 1]) {
      for (let z = -2.4; z > -D + 1.5; z -= 3.2) {
        const lit = rand() > 0.55;
        b.box('@aluminiumDark', 0.08, 1.66, 1.26, side * (W / 2 + 0.31), y + 0.8, z);
        b.add(lit ? '@windowLit' : '@windowDim', atlasPlaneGeometry(4, 2, Math.floor(rand() * 8)), side * (W / 2 + 0.36), y + 0.8, z, 0, side * Math.PI / 2, 0, 1.2, 1.6, 1, { cast: false });
      }
    }
  }
  b.box('@claddingDark', W + 0.7, 0.2, D + 0.4, 0, base + total + 0.1, -D / 2 - 0.15);
}

/** Facade sign rendered from a canvas with the brand typeface (canvas sized to the text). */
export function signTexture(text, { font = '800 120px Manrope, sans-serif', color = '#f3f2ec', letterSpacing = 6, height = 192 } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const setup = () => {
    ctx.font = font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  };
  setup();
  const width = Math.min(4096, Math.max(64, Math.ceil(ctx.measureText(text).width + letterSpacing + 48)));
  canvas.width = 2 ** Math.ceil(Math.log2(width));
  canvas.height = height;
  setup();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvas.width / 2, height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData.textWidth = width;
  return texture;
}

/**
 * Backlit sign: a plane using the canvas texture as colour + emissive map.
 * `width` is the physical width of the lettering in metres.
 */
export function makeSign(text, width, options = {}) {
  const texture = signTexture(text, options);
  const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: options.emissive ?? 0xfff4e4, emissiveIntensity: options.intensity ?? 2.6, transparent: true, alphaTest: 0.35, roughness: 0.5 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  const fit = () => {
    const ratio = texture.image.width / texture.userData.textWidth;
    mesh.scale.set(width * ratio, (width * ratio * texture.image.height) / texture.image.width, 1);
  };
  fit();
  mesh.userData.redraw = () => {
    const fresh = signTexture(text, options);
    texture.image = fresh.image;
    texture.userData.textWidth = fresh.userData.textWidth;
    texture.needsUpdate = true;
    fresh.dispose();
    fit();
  };
  return mesh;
}
