// Procedural fitness equipment at real-world dimensions (metres).
// Every factory draws into a Builder in a local frame: origin on the floor at
// the centre of the footprint, the user side facing +z.
import * as THREE from 'three';
import { latheGeometry, hexGeometry, cylinderGeometry, torusGeometry, tubeGeometry, roundedBoxGeometry } from './geometry.js';

const TAU = Math.PI * 2;
const HALF = Math.PI / 2;

// ---------------------------------------------------------------- plates & bars
const plateProfile = (radius, thickness) => {
  const t = thickness / 2;
  return [[0.0255, -0.014], [0.046, -0.014], [0.052, -t], [radius - 0.012, -t], [radius - 0.002, -t + 0.007], [radius, -t + 0.014], [radius, t - 0.014], [radius - 0.002, t - 0.007], [radius - 0.012, t], [0.052, t], [0.046, 0.014], [0.0255, 0.014], [0.0255, -0.014]];
};
const PLATES = {
  25: { r: 0.225, t: 0.068 },
  20: { r: 0.225, t: 0.056 },
  15: { r: 0.225, t: 0.044 },
  10: { r: 0.225, t: 0.034 },
  5: { r: 0.1375, t: 0.032 },
  2.5: { r: 0.105, t: 0.026 },
};

/** Bumper plate lying in the plane perpendicular to the local X axis. */
export function plate(b, kg, x, y, z, { axis = 'x', material = 'rubberBlack' } = {}) {
  const spec = PLATES[kg] || PLATES[20];
  const body = latheGeometry(`plate${kg}`, plateProfile(spec.r, spec.t), 48);
  const hub = latheGeometry('plateHub', [[0.0255, -0.0145], [0.044, -0.0145], [0.044, 0.0145], [0.0255, 0.0145], [0.0255, -0.0145]], 32);
  const [rx, rz] = axis === 'x' ? [0, HALF] : axis === 'z' ? [HALF, 0] : [0, 0];
  b.add(material, body, x, y, z, rx, 0, rz);
  b.add('steel', hub, x, y, z, rx, 0, rz);
  return spec;
}

/** Olympic barbell, centred, along local X. */
export function barbell(b, x, y, z, { load = [], ry = 0 } = {}) {
  b.at(x, y, z, ry, () => {
    b.add('knurl', cylinderGeometry(0.014, 0.014, 1.31, 16), 0, 0, 0, 0, 0, HALF);
    for (const side of [-1, 1]) {
      b.add('chrome', cylinderGeometry(0.031, 0.031, 0.03, 24), side * 0.67, 0, 0, 0, 0, HALF);
      b.add('chrome', cylinderGeometry(0.025, 0.025, 0.415, 24), side * 0.89, 0, 0, 0, 0, HALF);
      b.add('steel', cylinderGeometry(0.026, 0.026, 0.012, 24), side * 1.095, 0, 0, 0, 0, HALF);
      let offset = 0.7;
      for (const kg of load) {
        const spec = PLATES[kg];
        offset += spec.t / 2;
        plate(b, kg, side * offset, 0, 0);
        offset += spec.t / 2 + 0.002;
      }
    }
  });
}

// ---------------------------------------------------------------- dumbbells
export function hexDumbbell(b, kg, x, y, z, ry = 0) {
  const t = Math.cbrt(kg / 40);
  const r = 0.052 + 0.058 * t;
  const head = 0.046 + 0.084 * t;
  const handle = 0.135;
  b.at(x, y, z, ry, () => {
    b.add('chrome', cylinderGeometry(0.0165, 0.0165, handle + 0.02, 14), 0, 0, 0, 0, 0, HALF);
    for (const side of [-1, 1]) {
      b.add('rubberBlack', hexGeometry(r, head), side * (handle / 2 + head / 2), 0, 0);
      b.add('chrome', cylinderGeometry(0.028, 0.028, 0.012, 16), side * (handle / 2 + 0.004), 0, 0, 0, 0, HALF);
    }
  });
  return r;
}

/** Two-tier dumbbell rack with graded pairs. length in metres. */
export function dumbbellRack(b, length, { weights, tiers = 2 } = {}) {
  const depth = 0.72;
  const list = weights || [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40];
  // End frames.
  for (const side of [-1, 1]) {
    const x = side * (length / 2 - 0.04);
    b.block('powderBlack', 0.08, 0.05, depth, x, 0, 0);
    b.rod('powderBlack', 0.035, [x, 0.05, 0.18], [x, 0.86, 0.18], 4);
    b.rod('powderBlack', 0.035, [x, 0.05, -0.2], [x, 0.62, -0.2], 4);
    b.add('rubberMatte', roundedBoxGeometry(0.1, 0.03, 0.12, 0.01), x, 0.015, depth / 2 - 0.08);
    b.add('rubberMatte', roundedBoxGeometry(0.1, 0.03, 0.12, 0.01), x, 0.015, -depth / 2 + 0.08);
  }
  const shelves = tiers === 3 ? [[0.36, -0.22], [0.62, -0.02], [0.88, 0.2]] : [[0.5, -0.12], [0.86, 0.16]];
  const perTier = Math.ceil(list.length / shelves.length);
  shelves.forEach(([height, zc], tier) => {
    // Angled saddle tray.
    b.add('powderBlack', roundedBoxGeometry(length - 0.08, 0.035, 0.3, 0.008), 0, height, zc, -0.22, 0, 0);
    b.add('rubberMatte', roundedBoxGeometry(length - 0.12, 0.012, 0.28, 0.004), 0, height + 0.024, zc + 0.004, -0.22, 0, 0, { cast: false });
    const slice = list.slice(tier * perTier, tier * perTier + perTier).reverse();
    const pairs = slice.length;
    const slot = (length - 0.16) / pairs;
    slice.forEach((kg, i) => {
      const cx = -length / 2 + 0.08 + slot * (i + 0.5);
      for (const offset of [-0.25, 0.25]) {
        const r = 0.052 + 0.058 * Math.cbrt(kg / 40);
        hexDumbbell(b, kg, cx + offset * slot, height + 0.04 + r * 0.92, zc, HALF);
      }
    });
  });
  b.contactShadow(length + 0.2, depth + 0.3, 0, 0);
}

// ---------------------------------------------------------------- racks
export function powerRack(b, { load = [20, 20], platform = true, barOnHooks = true, brand = true } = {}) {
  const width = 1.22;
  const depth = 1.12;
  const height = 2.32;
  const u = 0.076;
  if (platform) {
    b.block('rubber', 3.0, 0.04, 2.5, 0, 0, 0.35);
    b.block('plywood', 1.2, 0.046, 2.46, 0, 0, 0.35);
    b.rounded('rubberMatte', 3.02, 0.042, 2.52, 0.012, 0, 0.0205, 0.35, 0, 0, 0, { cast: false });
  }
  const base = platform ? 0.046 : 0;
  b.at(0, base, 0, 0, () => {
    const posts = [[-width / 2, depth / 2], [width / 2, depth / 2], [-width / 2, -depth / 2], [width / 2, -depth / 2]];
    for (const [px, pz] of posts) {
      b.block('powderBlack', u, height, u, px, 0, pz);
      // Westside hole spacing through the bench zone, wider above.
      for (let y = 0.3; y < height - 0.12; y += y > 0.55 && y < 1.55 ? 0.0508 : 0.1016) {
        b.box('plasticBlack', 0.022, 0.022, 0.004, px, y, pz + u / 2 + 0.0005, 0, { cast: false });
        b.box('plasticBlack', 0.004, 0.022, 0.022, px + Math.sign(px) * (u / 2 + 0.0005), y, pz, 0, { cast: false });
      }
      b.box('powderBlack', 0.1, 0.012, 0.1, px, height + 0.006, pz);
    }
    // Feet and crossmembers.
    for (const side of [-1, 1]) {
      b.block('powderBlack', u, 0.076, depth + 0.4, side * width / 2, 0, 0);
      b.add('rubberMatte', roundedBoxGeometry(0.1, 0.02, 0.1, 0.008), side * width / 2, 0.01, depth / 2 + 0.17, 0, 0, 0, { cast: false });
      b.add('rubberMatte', roundedBoxGeometry(0.1, 0.02, 0.1, 0.008), side * width / 2, 0.01, -depth / 2 - 0.17, 0, 0, 0, { cast: false });
      b.box('powderBlack', u, u, depth, side * width / 2, height - u / 2, 0);
    }
    b.box('powderBlack', width, u, u, 0, height - u / 2, -depth / 2);
    b.box('powderBlack', width, 0.05, u, 0, 0.04, -depth / 2);
    // Pull-up bar front.
    b.add('knurl', cylinderGeometry(0.016, 0.016, width + 0.08, 16), 0, height - 0.02, depth / 2 + 0.06, 0, 0, HALF);
    for (const side of [-1, 1]) b.box('powderBlack', 0.08, 0.1, 0.14, side * width / 2, height - 0.05, depth / 2 + 0.02);
    // J-hooks with UHMW liner.
    for (const side of [-1, 1]) {
      const hx = side * width / 2;
      b.box('powderBlack', 0.09, 0.16, 0.012, hx, 1.36, depth / 2 + u / 2 + 0.008);
      b.box('powderBlack', 0.06, 0.012, 0.11, hx, 1.30, depth / 2 + u / 2 + 0.06);
      b.box('plasticGrey', 0.05, 0.008, 0.1, hx, 1.31, depth / 2 + u / 2 + 0.06, 0, { cast: false });
      b.box('powderBlack', 0.06, 0.05, 0.012, hx, 1.33, depth / 2 + u / 2 + 0.11);
      // Safety spotter arms.
      b.box('powderBlack', 0.05, 0.075, 0.62, hx, 0.86, depth / 2 + 0.31);
      b.box('plasticGrey', 0.045, 0.012, 0.6, hx, 0.904, depth / 2 + 0.31, 0, { cast: false });
      // Plate storage horns on rear posts.
      for (const hy of [0.42, 0.86]) {
        b.add('powderBlack', cylinderGeometry(0.025, 0.025, 0.24, 16), hx + side * 0.15, hy, -depth / 2, 0, 0, HALF);
      }
    }
    // Stored plates (rear horns).
    plate(b, 20, -width / 2 - 0.12, 0.42, -depth / 2);
    plate(b, 20, -width / 2 - 0.18, 0.42, -depth / 2);
    plate(b, 10, width / 2 + 0.1, 0.42, -depth / 2);
    plate(b, 5, width / 2 + 0.1, 0.86, -depth / 2);
    plate(b, 15, -width / 2 - 0.1, 0.86, -depth / 2);
    if (brand) b.box('accent', 0.3, 0.035, 0.002, 0, height - u / 2, -depth / 2 + u / 2 + 0.001, 0, { cast: false });
    if (barOnHooks) barbell(b, 0, 1.335, depth / 2 + u / 2 + 0.065, { load });
  });
  b.contactShadow(1.7, 1.8, 0, 0, 0, base + 0.003);
}

export function squatStand(b) {
  for (const side of [-1, 1]) {
    b.block('powderBlack', 0.076, 1.9, 0.076, side * 0.55, 0, 0);
    b.block('powderBlack', 0.076, 0.06, 0.8, side * 0.55, 0, 0);
    b.box('powderBlack', 0.08, 0.14, 0.12, side * 0.55, 1.32, 0.08);
  }
  b.box('powderBlack', 1.18, 0.06, 0.06, 0, 1.87, 0);
  b.contactShadow(1.4, 1, 0, 0);
}

// ---------------------------------------------------------------- benches
export function flatBench(b, { material = 'vinylBlack' } = {}) {
  const length = 1.22;
  b.rounded(material, 0.29, 0.075, length - 0.06, 0.03, 0, 0.405, 0);
  b.box('powderBlack', 0.08, 0.025, length - 0.2, 0, 0.355, 0);
  for (const z of [-length / 2 + 0.12, length / 2 - 0.12]) {
    b.box('powderBlack', 0.06, 0.32, 0.06, 0, 0.19, z);
    b.box('powderBlack', 0.5, 0.05, 0.08, 0, 0.025, z);
    for (const side of [-1, 1]) b.add('rubberMatte', roundedBoxGeometry(0.06, 0.02, 0.08, 0.008), side * 0.23, 0.005, z, 0, 0, 0, { cast: false });
  }
  b.contactShadow(0.7, 1.4, 0, 0);
}

export function adjustableBench(b, { incline = 0.5, material = 'vinylBlack' } = {}) {
  b.rounded(material, 0.3, 0.07, 0.38, 0.03, 0, 0.44, 0.38, -0.08, 0, 0);
  b.at(0, 0.44, 0.17, 0, () => {
    b.rounded(material, 0.3, 0.07, 0.86, 0.03, 0, 0.43 * Math.sin(incline), -0.43 * Math.cos(incline), incline, 0, 0);
    b.add('powderBlack', roundedBoxGeometry(0.08, 0.05, 0.8, 0.01), 0, 0.4 * Math.sin(incline) - 0.05, -0.4 * Math.cos(incline), incline, 0, 0);
  });
  b.box('powderBlack', 0.08, 0.06, 1.3, 0, 0.12, 0);
  b.rod('powderBlack', 0.03, [0, 0.15, 0.2], [0, 0.4, 0.3], 4);
  b.rod('powderBlack', 0.03, [0, 0.15, -0.2], [0, 0.36 + 0.3 * Math.sin(incline), -0.1], 4);
  for (const z of [-0.6, 0.6]) b.box('powderBlack', 0.52, 0.06, 0.08, 0, 0.03, z);
  b.add('plasticBlack', cylinderGeometry(0.05, 0.05, 0.05, 20), 0.24, 0.05, 0.62, 0, 0, HALF);
  b.add('plasticBlack', cylinderGeometry(0.05, 0.05, 0.05, 20), -0.24, 0.05, 0.62, 0, 0, HALF);
  b.contactShadow(0.7, 1.5, 0, 0);
}

// ---------------------------------------------------------------- cardio
export function treadmill(b, { screenMaterial = 'screen' } = {}) {
  const length = 2.08;
  const width = 0.9;
  // Deck and frame.
  b.rounded('plasticBlack', width, 0.2, length, 0.05, 0, 0.13, 0);
  b.box('beltRubber', 0.56, 0.012, 1.6, 0, 0.236, 0.12, 0, { cast: false });
  for (const side of [-1, 1]) {
    b.rounded('aluminium', 0.13, 0.03, 1.66, 0.012, side * 0.36, 0.24, 0.12);
    b.box('rubberMatte', 0.1, 0.005, 1.6, side * 0.36, 0.257, 0.12, 0, { cast: false });
  }
  // Motor hood at the front (-z).
  b.rounded('plasticBlack', width - 0.02, 0.3, 0.42, 0.08, 0, 0.2, -length / 2 + 0.2);
  b.rounded('powderGraphite', width - 0.1, 0.03, 0.3, 0.012, 0, 0.36, -length / 2 + 0.22, 0, 0, 0, { cast: false });
  // Uprights, handrails and console.
  for (const side of [-1, 1]) {
    b.rod('powderGraphite', 0.035, [side * 0.4, 0.3, -length / 2 + 0.3], [side * 0.38, 1.25, -length / 2 + 0.12], 12);
    b.rod('aluminium', 0.016, [side * 0.38, 1.12, -length / 2 + 0.16], [side * 0.38, 1.12, -length / 2 + 0.62], 12);
    b.rod('rubberMatte', 0.019, [side * 0.38, 1.12, -length / 2 + 0.3], [side * 0.38, 1.12, -length / 2 + 0.58], 12);
  }
  b.rod('aluminium', 0.016, [-0.38, 1.12, -length / 2 + 0.62], [0.38, 1.12, -length / 2 + 0.62], 12);
  b.rounded('plasticBlack', 0.82, 0.38, 0.12, 0.04, 0, 1.38, -length / 2 + 0.1, -0.45, 0, 0);
  b.rounded(screenMaterial, 0.5, 0.29, 0.01, 0.006, 0, 1.40, -length / 2 + 0.17, -0.45, 0, 0, { cast: false });
  b.contactShadow(1.2, 2.4, 0, 0);
}

export function spinBike(b) {
  // Frame tubes in a side profile.
  b.rod('powderBlack', 0.03, [0, 0.07, -0.52], [0, 0.07, 0.5], 8);
  b.rod('powderBlack', 0.026, [-0.24, 0.035, -0.5], [0.24, 0.035, -0.5], 8);
  b.rod('powderBlack', 0.026, [-0.24, 0.035, 0.5], [0.24, 0.035, 0.5], 8);
  b.rod('powderBlack', 0.034, [0, 0.08, 0.32], [0, 0.82, 0.18], 8);
  b.rod('powderBlack', 0.034, [0, 0.08, -0.25], [0, 1.0, -0.36], 8);
  b.rod('powderBlack', 0.03, [0, 0.45, 0.25], [0, 0.4, -0.32], 8);
  // Flywheel with chrome rim.
  b.add('chrome', cylinderGeometry(0.24, 0.24, 0.035, 40), 0, 0.37, -0.36, 0, 0, HALF);
  b.add('powderGraphite', cylinderGeometry(0.2, 0.2, 0.04, 32), 0, 0.37, -0.36, 0, 0, HALF);
  b.add('plasticBlack', roundedBoxGeometry(0.1, 0.5, 0.5, 0.04), 0, 0.42, -0.25);
  // Crank and pedals.
  b.add('steel', cylinderGeometry(0.035, 0.035, 0.2, 16), 0, 0.37, -0.05, 0, 0, HALF);
  b.rod('steel', 0.012, [0.11, 0.37, -0.05], [0.11, 0.2, 0.02], 8);
  b.rod('steel', 0.012, [-0.11, 0.37, -0.05], [-0.11, 0.54, -0.12], 8);
  b.rounded('plasticBlack', 0.1, 0.03, 0.12, 0.01, 0.16, 0.2, 0.02);
  b.rounded('plasticBlack', 0.1, 0.03, 0.12, 0.01, -0.16, 0.54, -0.12);
  // Saddle and post.
  b.rod('aluminium', 0.016, [0, 0.8, 0.19], [0, 1.0, 0.17], 8);
  b.add('vinylBlack', latheGeometry('saddle', [[0, 0], [0.09, 0.005], [0.11, 0.03], [0.09, 0.06], [0, 0.065]], 24), 0, 1.0, 0.2, 0, 0, 0, 0.75, 0.9, 1.4);
  // Handlebar.
  b.rod('aluminium', 0.016, [0, 0.98, -0.36], [0, 1.12, -0.38], 8);
  b.add('powderBlack', tubeGeometry('spinbar', [[-0.24, 1.12, -0.32], [-0.22, 1.13, -0.45], [0, 1.12, -0.47], [0.22, 1.13, -0.45], [0.24, 1.12, -0.32]], 0.014, 32, 8), 0, 0, 0);
  b.rounded('screen', 0.12, 0.08, 0.02, 0.01, 0, 1.2, -0.44, -0.6, 0, 0, { cast: false });
  b.contactShadow(0.7, 1.3, 0, 0);
}

export function rower(b) {
  // Monorail, front leg and flywheel housing (front is -z).
  b.add('aluminium', roundedBoxGeometry(0.1, 0.05, 2.0, 0.008), 0, 0.33, 0.25, -0.1, 0, 0);
  b.add('powderBlack', roundedBoxGeometry(0.42, 0.04, 0.06, 0.01), 0, 0.02, 1.22);
  b.rod('powderBlack', 0.02, [0, 0.04, 1.22], [0, 0.24, 1.2], 8);
  b.add('powderBlack', roundedBoxGeometry(0.52, 0.04, 0.08, 0.01), 0, 0.02, -0.82);
  b.add('plasticBlack', latheGeometry('rowerFan', [[0, -0.12], [0.24, -0.12], [0.28, -0.08], [0.28, 0.08], [0.24, 0.12], [0, 0.12]], 40), 0, 0.42, -0.72, 0, 0, HALF);
  b.add('powderGraphite', cylinderGeometry(0.08, 0.08, 0.26, 24), 0, 0.42, -0.72, 0, 0, HALF);
  b.rod('powderBlack', 0.025, [0, 0.42, -0.6], [0, 0.4, -0.3], 8);
  // Seat.
  b.rounded('plasticBlack', 0.3, 0.06, 0.3, 0.03, 0, 0.52, 0.32);
  b.rounded('plasticBlack', 0.16, 0.06, 0.14, 0.02, 0, 0.45, 0.32);
  // Footplates.
  for (const side of [-1, 1]) b.rounded('plasticGrey', 0.13, 0.03, 0.3, 0.015, side * 0.1, 0.3, -0.36, 0.9, 0, side * 0.2);
  // Monitor arm.
  b.add('powderBlack', tubeGeometry('rowerArm', [[0, 0.5, -0.6], [0, 0.82, -0.45], [0, 1.0, -0.2]], 0.015, 24, 8), 0, 0, 0);
  b.rounded('plasticBlack', 0.18, 0.15, 0.04, 0.02, 0, 1.02, -0.18, -0.4, 0, 0);
  b.rounded('screen', 0.12, 0.09, 0.01, 0.005, 0, 1.03, -0.155, -0.4, 0, 0, { cast: false });
  b.add('plasticBlack', cylinderGeometry(0.014, 0.014, 0.5, 12), 0, 0.45, -0.52, 0, 0, HALF);
  b.contactShadow(0.7, 2.6, 0, 0.15);
}

// ---------------------------------------------------------------- cable machines
function weightStack(b, x, z, plates = 18) {
  for (const side of [-1, 1]) b.rod('chrome', 0.012, [x + side * 0.11, 0.06, z], [x + side * 0.11, 1.95, z], 12);
  for (let i = 0; i < plates; i++) {
    b.box(i % 5 === 4 ? 'powderGraphite' : 'powderBlack', 0.3, 0.046, 0.14, x, 0.1 + i * 0.05, z);
  }
  b.box('chrome', 0.03, 0.08, 0.03, x, 0.1 + plates * 0.05 + 0.02, z);
  b.box('powderBlack', 0.3, 0.06, 0.14, x, 0.05, z);
}

export function functionalTrainer(b, { width = 1.6, shrouds = true } = {}) {
  const depth = 0.72;
  const height = 2.15;
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.25);
    for (const dx of [-0.2, 0.2]) {
      b.block('powderBlack', 0.06, height, 0.12, x + dx, 0, -depth / 2 + 0.1);
    }
    b.block('powderBlack', 0.5, 0.06, depth, x, 0, 0);
    weightStack(b, x, -depth / 2 + 0.1);
    if (shrouds) {
      b.rounded('frostedGlass', 0.36, 1.2, 0.01, 0.005, x, 0.75, -depth / 2 + 0.19, 0, 0, 0, { cast: false });
    }
    // Adjustable carriage column and pulley.
    b.block('powderGraphite', 0.09, height - 0.3, 0.09, x + side * 0.26, 0.1, 0.06);
    b.box('powderBlack', 0.14, 0.18, 0.14, x + side * 0.26, 1.35, 0.14);
    b.add('plasticBlack', cylinderGeometry(0.045, 0.045, 0.03, 24), x + side * 0.26, 1.28, 0.24, 0, 0, HALF);
    b.rod('cable', 0.003, [x + side * 0.26, 1.24, 0.25], [x + side * 0.26, 0.98, 0.32], 6);
    b.add('chrome', torusGeometry(0.06, 0.008, 8, 24, Math.PI), x + side * 0.26, 0.92, 0.33, 0, 0, Math.PI);
    b.add('rubberMatte', cylinderGeometry(0.016, 0.016, 0.13, 12), x + side * 0.26, 0.86, 0.33, 0, 0, HALF);
  }
  // Top frame and multi-grip pull-up bar.
  b.box('powderBlack', width, 0.08, 0.12, 0, height - 0.04, -depth / 2 + 0.1);
  b.box('powderBlack', width - 0.5, 0.06, 0.08, 0, height - 0.12, 0.2);
  b.add('knurl', cylinderGeometry(0.016, 0.016, width - 0.6, 14), 0, height - 0.18, 0.28, 0, 0, HALF);
  b.box('accent', 0.4, 0.04, 0.002, 0, height - 0.04, -depth / 2 + 0.161, 0, { cast: false });
  b.contactShadow(width + 0.4, 1.2, 0, 0);
}

export function cableCrossover(b, { width = 3.6 } = {}) {
  for (const side of [-1, 1]) {
    b.at(side * (width / 2 - 0.3), 0, 0, side * -0.35, () => functionalTowerSingle(b));
  }
  b.box('powderBlack', width - 0.4, 0.09, 0.09, 0, 2.3, 0);
  b.add('knurl', cylinderGeometry(0.016, 0.016, 1.2, 14), 0, 2.2, 0.08, 0, 0, HALF);
}

function functionalTowerSingle(b) {
  b.block('powderBlack', 0.6, 0.06, 0.7, 0, 0, 0);
  for (const dx of [-0.22, 0.22]) b.block('powderBlack', 0.07, 2.33, 0.1, dx, 0, -0.2);
  weightStack(b, 0, -0.2, 20);
  b.block('powderGraphite', 0.08, 2.1, 0.08, 0, 0.1, 0.12);
  b.box('powderBlack', 0.14, 0.16, 0.14, 0, 1.7, 0.2);
  b.add('plasticBlack', cylinderGeometry(0.045, 0.045, 0.03, 24), 0, 1.64, 0.28, 0, 0, HALF);
  b.rod('cable', 0.003, [0, 1.6, 0.29], [0, 1.2, 0.34], 6);
  b.add('chrome', torusGeometry(0.06, 0.008, 8, 24, Math.PI), 0, 1.14, 0.35, 0, 0, Math.PI);
  b.contactShadow(0.9, 0.9, 0, 0);
}

/** Selectorised machine (lat pulldown style). */
export function latPulldown(b) {
  weightStack(b, 0, -0.55, 18);
  b.block('powderBlack', 0.08, 2.2, 0.08, -0.22, 0, -0.62);
  b.block('powderBlack', 0.08, 2.2, 0.08, 0.22, 0, -0.62);
  b.rounded('frostedGlass', 0.36, 1.25, 0.01, 0.005, 0, 0.8, -0.45, 0, 0, 0, { cast: false });
  b.box('powderBlack', 0.08, 0.08, 1.1, 0, 2.2, -0.1);
  b.add('plasticBlack', cylinderGeometry(0.05, 0.05, 0.03, 24), 0, 2.15, 0.42, 0, 0, HALF);
  b.rod('cable', 0.003, [0, 2.1, 0.43], [0, 1.6, 0.43], 6);
  b.add('chrome', tubeGeometry('latbar', [[-0.6, 1.5, 0.43], [-0.45, 1.58, 0.43], [0, 1.6, 0.43], [0.45, 1.58, 0.43], [0.6, 1.5, 0.43]], 0.014, 32, 8), 0, 0, 0);
  b.rod('powderBlack', 0.04, [0, 0.05, 0.6], [0, 0.48, 0.45], 8);
  b.block('powderBlack', 0.08, 0.06, 1.5, 0, 0, 0);
  b.rounded('vinylBlack', 0.38, 0.08, 0.36, 0.03, 0, 0.5, 0.45);
  b.rod('powderBlack', 0.03, [0, 0.55, 0.3], [0, 0.72, 0.3], 8);
  b.rounded('vinylBlack', 0.36, 0.11, 0.12, 0.05, 0, 0.75, 0.3, 0, 0, 0);
  b.contactShadow(1, 1.8, 0, 0);
}

// ---------------------------------------------------------------- free weights & accessories
export function kettlebell(b, kg, x, y, z, ry = 0, material = 'powderBlack') {
  const s = 0.75 + 0.5 * Math.cbrt(kg / 32);
  const key = 'kettle';
  const body = latheGeometry(key, [[0, 0], [0.06, 0.003], [0.095, 0.03], [0.11, 0.08], [0.1, 0.13], [0.07, 0.165], [0.03, 0.18], [0, 0.182]], 28);
  b.at(x, y, z, ry, () => {
    b.add(material, body, 0, 0, 0, 0, 0, 0, s, s, s);
    b.add(material, torusGeometry(0.075, 0.016, 10, 28, Math.PI * 1.15), 0, 0.17 * s, 0, 0, 0, -0.075 * Math.PI, s, s * 1.15, s);
  });
}

export function kettlebellRack(b, length, weights = [8, 12, 16, 20, 24, 28, 32]) {
  for (const [y, z] of [[0.18, 0.08], [0.62, -0.06]]) {
    b.add('powderBlack', roundedBoxGeometry(length, 0.03, 0.38, 0.008), 0, y, z);
  }
  for (const side of [-1, 1]) {
    b.block('powderBlack', 0.05, 0.75, 0.05, side * (length / 2 - 0.03), 0, 0.2);
    b.block('powderBlack', 0.05, 0.75, 0.05, side * (length / 2 - 0.03), 0, -0.2);
  }
  const slot = (length - 0.1) / weights.length;
  weights.forEach((kg, i) => {
    const x = -length / 2 + 0.05 + slot * (i + 0.5);
    kettlebell(b, kg, x, 0.197, 0.08, i * 0.4, i % 3 === 2 ? 'powderGraphite' : 'powderBlack');
    kettlebell(b, Math.max(4, kg - 4), x, 0.637, -0.06, -i * 0.3);
  });
  b.contactShadow(length + 0.2, 0.7, 0, 0);
}

export function plyoBox(b, x, y, z, ry = 0, size = [0.76, 0.61, 0.51]) {
  b.at(x, y, z, ry, () => {
    b.rounded('plywood', size[0], size[2], size[1], 0.02, 0, size[2] / 2, 0);
    b.rounded('plasticBlack', 0.12, 0.035, 0.012, 0.006, 0, size[2] * 0.75, size[1] / 2 + 0.002, 0, 0, 0, { cast: false });
  });
}

export function medBall(b, x, y, z, r = 0.17, material = 'rubberMatte') {
  b.add(material, new THREE.SphereGeometry(r, 24, 16), x, y + r, z);
}

export function foamRollers(b, x, z, count = 4) {
  for (let i = 0; i < count; i++) b.add(i % 2 ? 'foamMat' : 'plasticBlack', cylinderGeometry(0.075, 0.075, 0.45, 20), x + i * 0.17, 0.075, z, 0, 0, HALF);
}

export function matRolls(b, x, z, count = 6, material = 'foamMat') {
  // Vertical storage of rolled mats.
  b.block('powderBlack', 0.06 + count * 0.13, 0.04, 0.2, x, 0.75, z);
  for (let i = 0; i < count; i++) b.add(i % 3 === 0 ? 'felt' : material, cylinderGeometry(0.06, 0.06, 0.62, 20), x - count * 0.065 + 0.06 + i * 0.13, 0.31, z);
}

export function mat(b, x, z, ry = 0, material = 'foamMat') {
  b.at(x, 0, z, ry, () => b.rounded(material, 0.61, 0.012, 1.83, 0.005, 0, 0.006, 0, 0, 0, 0, { cast: false }));
}

export function wallBalls(b, x, z, count = 5) {
  b.block('powderBlack', 0.4, 0.04, count * 0.38, x, 0.02, z);
  for (let i = 0; i < count; i++) medBall(b, x, 0.04, z - count * 0.19 + 0.19 + i * 0.38, 0.17, i % 2 ? 'rubberMatte' : 'plasticGrey');
}

/** Wall-mounted plate tree (vertical). */
export function plateTree(b) {
  b.block('powderBlack', 0.6, 0.05, 0.6, 0, 0, 0);
  b.block('powderBlack', 0.07, 1.25, 0.07, 0, 0.05, 0);
  const pegs = [[0.35, 25], [0.65, 20], [0.95, 15], [1.2, 10]];
  pegs.forEach(([y, kg], i) => {
    const side = i % 2 ? -1 : 1;
    b.add('powderBlack', cylinderGeometry(0.025, 0.025, 0.24, 14), side * 0.13, y, 0, 0, 0, HALF);
    plate(b, kg, side * 0.12, y, 0);
    plate(b, kg, side * 0.12 + side * (PLATES[kg].t + 0.004), y, 0);
  });
  b.contactShadow(1, 0.8, 0, 0);
}

/** Wall-mounted flat screen. */
export function wallScreen(b, w = 1.45, h = 0.82, material = 'screen') {
  b.rounded('plasticBlack', w, h, 0.03, 0.006, 0, 0, 0);
  b.box(material, w - 0.02, h - 0.02, 0.002, 0, 0, 0.016, 0, { cast: false });
}

export function mirrorWall(b, w, h, y = 0.25) {
  b.box('aluminiumDark', w + 0.02, h + 0.02, 0.01, 0, y + h / 2, 0.004, 0, { cast: false });
  b.box('mirror', w, h, 0.006, 0, y + h / 2, 0.012, 0, { cast: false });
}

// ---------------------------------------------------------------- furniture
export function receptionDesk(b, width = 3.2, { top = 'darkMarble', front = 'oak' } = {}) {
  b.block(front, width, 1.08, 0.12, 0, 0, 0.32);
  b.block(front, 0.12, 1.08, 0.7, -width / 2 + 0.06, 0, 0);
  b.block(front, 0.12, 1.08, 0.7, width / 2 - 0.06, 0, 0);
  b.block(top, width + 0.04, 0.03, 0.42, 0, 1.08, 0.24);
  b.block('paintGraphite', width - 0.24, 0.74, 0.6, 0, 0, -0.05);
  b.block(top, width - 0.1, 0.025, 0.66, 0, 0.74, -0.05);
  b.box('ledSoft', width - 0.3, 0.01, 0.01, 0, 0.02, 0.385, 0, { cast: false });
  b.rounded('plasticBlack', 0.5, 0.32, 0.02, 0.008, 0.6, 0.98, -0.05, -0.1, Math.PI, 0);
  b.rounded('screen', 0.47, 0.28, 0.003, 0.003, 0.6, 0.98, -0.062, -0.1, Math.PI, 0, { cast: false });
  b.contactShadow(width + 0.4, 1.2, 0, 0.1);
}

export function lockers(b, count, { material = 'oak', height = 1.9 } = {}) {
  const w = 0.4;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * w;
    b.block(material, w - 0.006, height / 2 - 0.006, 0.02, x, 0.12, 0.25);
    b.block(material, w - 0.006, height / 2 - 0.006, 0.02, x, 0.12 + height / 2, 0.25);
    b.box('aluminium', 0.012, 0.12, 0.02, x + w / 2 - 0.05, 0.12 + height * 0.35, 0.27, 0, { cast: false });
    b.box('aluminium', 0.012, 0.12, 0.02, x + w / 2 - 0.05, 0.12 + height * 0.85, 0.27, 0, { cast: false });
  }
  b.block('paintGraphite', count * w, height, 0.48, 0, 0.12, 0);
  b.block('paintGraphite', count * w, 0.12, 0.42, 0, 0, -0.02);
}

export function bench(b, length = 1.8, { seat = 'oak', frame = 'powderBlack' } = {}) {
  b.rounded(seat, length, 0.045, 0.38, 0.008, 0, 0.44, 0);
  for (const side of [-1, 1]) {
    b.block(frame, 0.04, 0.42, 0.04, side * (length / 2 - 0.15), 0, 0.14);
    b.block(frame, 0.04, 0.42, 0.04, side * (length / 2 - 0.15), 0, -0.14);
    b.box(frame, 0.04, 0.04, 0.32, side * (length / 2 - 0.15), 0.4, 0);
  }
  b.contactShadow(length + 0.2, 0.6, 0, 0);
}

export function towelShelf(b, width = 1.2) {
  b.block('walnut', width, 0.03, 0.4, 0, 0.9, 0);
  b.block('walnut', width, 0.03, 0.4, 0, 0.45, 0);
  for (let i = 0; i < Math.floor(width / 0.2); i++) {
    for (const y of [0.48, 0.93]) {
      for (let s = 0; s < 3; s++) b.rounded(i % 4 === 3 ? 'towelGrey' : 'towel', 0.18, 0.05, 0.32, 0.02, -width / 2 + 0.11 + i * 0.2, y + 0.025 + s * 0.048, 0);
    }
  }
}

/** Snake plant (Sansevieria) in a cylindrical planter. */
export function plant(b, x, z, { height = 1.0, pot = 'ceramic', seed = 1, scale = 1 } = {}) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  b.at(x, 0, z, 0, () => {
    const r = 0.21 * scale;
    b.add(pot, latheGeometry('pot', [[0, 0], [0.18, 0], [0.2, 0.02], [0.21, 0.42], [0.195, 0.42], [0.19, 0.06], [0, 0.06]], 32), 0, 0, 0, 0, 0, 0, scale, scale, scale);
    b.add('soil', cylinderGeometry(r - 0.02, r - 0.02, 0.01, 24), 0, 0.38 * scale, 0);
    const blades = 14;
    for (let i = 0; i < blades; i++) {
      const angle = rand() * TAU;
      const dist = rand() * r * 0.6;
      const h = height * (0.55 + rand() * 0.5);
      const tilt = 0.05 + rand() * 0.25;
      b.add(i % 3 ? 'plantLeaf' : 'plantLeafDark', leafGeometry(), Math.cos(angle) * dist, 0.38 * scale, Math.sin(angle) * dist, Math.cos(angle) * tilt, rand() * Math.PI, -Math.sin(angle) * tilt, 1, h, 1);
    }
  });
  b.contactShadow(0.6 * scale, 0.6 * scale, x, z);
}

let leaf = null;
function leafGeometry() {
  if (leaf) return leaf;
  const shape = new THREE.Shape();
  shape.moveTo(-0.025, 0);
  shape.bezierCurveTo(-0.045, 0.35, -0.04, 0.7, 0, 1);
  shape.bezierCurveTo(0.04, 0.7, 0.045, 0.35, 0.025, 0);
  shape.lineTo(-0.025, 0);
  leaf = new THREE.ShapeGeometry(shape, 8);
  // Fold the blade slightly along its spine for a realistic cross-section.
  const pos = leaf.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.abs(pos.getX(i)) * 0.5);
  leaf.computeVertexNormals();
  return leaf;
}
