// The five venues of the tour. Each builder fills a Builder in the building's
// local frame (see architecture.js) and returns camera stops, light slots and
// the reflection-probe position for that room.
import * as THREE from 'three';
import { shell, curtainWall, linearLight, downlight, duct, upperFloors, makeSign } from './architecture.js';
import * as E from './equipment.js';

const HALF = Math.PI / 2;

/** Row of linear luminaires plus one area-light slot covering the row. */
function lightRow(b, lights, { x0, x1, y, z, segment = 3.6, gap = 0.6, emitter = 'ledNeutral', suspended = 0, color = 0xfff1df, intensity = 7, width = 0.07 }) {
  for (let x = x0; x + segment <= x1 + 0.01; x += segment + gap) {
    linearLight(b, x + segment / 2, y, z, segment, { emitter, suspended, width });
  }
  lights.push({ position: [(x0 + x1) / 2, y - 0.08, z], width: x1 - x0, height: 0.5, color, intensity });
}

// ------------------------------------------------------------------ 01 Fitness
export function fitness(b) {
  const spec = { width: 34, depth: 24, height: 5.6, roofDepth: 1.2, floor: 'rubber', walls: { back: 'concreteWall', left: 'concreteWall', right: 'concreteWall' }, ceiling: 'ceilingBlack', exterior: 'concretePanel', fascia: 'claddingDark', module: 1.7, transom: 3.1, doors: [{ x: -12, width: 2.2 }, { x: 12.5, width: 2.2 }] };
  shell(b, spec);
  const doors = curtainWall(b, spec, b.material);
  const lights = [];
  // Exposed services: ducts, cable trays and rows of suspended linear lights.
  duct(b, -16.5, 16.5, 4.75, -8.5, 0.32);
  duct(b, -16.5, 16.5, 4.75, -18.5, 0.32);
  for (const z of [-4.2, -11.5, -16, -21]) {
    lightRow(b, lights, { x0: -16, x1: 16, y: 4.3, z, segment: 3.6, gap: 0.5, suspended: 1.3, emitter: 'ledNeutral', intensity: 5.5 });
  }
  // Long-span steel roof trusses (no columns on the floor).
  for (let z = -3; z > -24; z -= 6) {
    b.box('powderBlack', 34, 0.08, 0.16, 0, 5.52, z, 0, { cast: false });
    b.box('powderBlack', 34, 0.08, 0.16, 0, 4.92, z, 0, { cast: false });
    for (let x = -16; x <= 16; x += 2) b.rod('powderBlack', 0.025, [x, 4.92, z], [x + 1, 5.52, z], 4, { cast: false });
  }
  // Reception: oak wall with backlit wordmark, travertine-topped desk.
  b.at(-16.3, 0, -6.5, HALF, () => {
    b.block('oak', 6, 3.4, 0.25, 0, 0, -0.55);
    E.receptionDesk(b, 3.4, { top: 'darkMarble', front: 'oak' });
  });
  const logo = makeSign('PUREFITNESS', 3.6, { intensity: 3.4 });
  logo.position.set(-16.15 + 0.4, 2.55, -6.5);
  logo.rotation.y = HALF;
  b.keep(logo);
  E.plant(b, -15.6, -2.2, { height: 1.2, seed: 3 });
  E.plant(b, -15.6, -10.4, { height: 1.0, seed: 9 });
  // Cardio row facing the glazing.
  for (let i = 0; i < 10; i++) b.at(-5.4 + i * 1.3, 0, -2.9, Math.PI, () => E.treadmill(b));
  for (let i = 0; i < 4; i++) b.at(9.2 + i * 0.95, 0, -2.6, Math.PI, () => E.spinBike(b));
  // Strength: four power racks on platforms facing the floor.
  [-10.5, -5.6, -0.7, 4.2].forEach((x, i) => b.at(x, 0, -17.2, 0, () => E.powerRack(b, { load: i % 2 ? [20, 10] : [20, 20, 5] })));
  b.at(-8.1, 0, -14.5, 0.4, () => E.flatBench(b));
  b.at(8.6, 0, -16.2, -0.3, () => E.flatBench(b));
  b.at(-12.8, 0, -12.6, 0, () => E.plyoBox(b, 0, 0, 0, 0.2));
  b.at(-12.0, 0, -12.2, 0, () => E.plyoBox(b, 0, 0, 0, -0.1, [0.76, 0.61, 0.61]));
  b.at(-3.1, 0, -14.4, -0.2, () => E.adjustableBench(b, { incline: 0 }));
  [-13.2, 1.8, 6.6].forEach(x => b.at(x, 0, -21, 0, () => E.plateTree(b)));
  // Dumbbell wall with mirror.
  b.at(11, 0, -23.975, 0, () => E.mirrorWall(b, 10, 2.1, 0.3));
  b.at(11, 0, -23.25, 0, () => E.dumbbellRack(b, 8.4, { tiers: 2 }));
  [8, 11, 14].forEach((x, i) => b.at(x, 0, -20.6, (i - 1) * 0.25, () => E.adjustableBench(b, { incline: 0.35 + i * 0.25 })));
  // Machines along the right wall.
  b.at(16.5, 0, -12.5, -HALF, () => E.functionalTrainer(b));
  b.at(16.3, 0, -7.5, -HALF, () => E.latPulldown(b));
  b.at(12.2, 0, -12.2, -HALF, () => E.cableCrossover(b, { width: 4.2 }));
  // Turf sled lane along the left wall.
  b.box('turf', 2.4, 0.02, 14, -15.2, 0.01, -18.6, 0, { cast: false });
  for (let z = -25; z <= -12; z += 2.5) b.box('turfLine', 2.4, 0.004, 0.06, -15.2, 0.022, z + 0.4, 0, { cast: false });
  b.box('turfLine', 0.05, 0.004, 14, -16.35, 0.022, -18.6, 0, { cast: false });
  b.box('turfLine', 0.05, 0.004, 14, -14.05, 0.022, -18.6, 0, { cast: false });
  b.at(-16.75, 0, -15, HALF, () => E.kettlebellRack(b, 2.2));
  E.wallBalls(b, -16.6, -20.5, 5);
  // Rowing machines and mats in the stretch zone.
  for (let i = 0; i < 3; i++) b.at(-2 + i * 1.2, 0, -9.6, HALF * 0, () => E.rower(b));
  for (let i = 0; i < 4; i++) E.mat(b, 2.5 + i * 0.85, -8.6, 0);
  E.matRolls(b, 6, -10.9, 6);
  E.foamRollers(b, 2.4, -10.6, 4);
  // Wall screens.
  b.at(-2, 3.2, -23.97, 0, () => E.wallScreen(b, 2.2, 1.24));
  b.at(16.97, 3.0, -18, -HALF, () => E.wallScreen(b, 1.8, 1.0));
  // Large graphic on the back wall.
  const wall = makeSign('STÆRKE RUM', 7.5, { intensity: 0.0, color: '#d4ed72', font: '800 150px Manrope, sans-serif', letterSpacing: 10 });
  wall.material.emissiveIntensity = 0.35;
  wall.position.set(-9.5, 3.9, -23.965);
  b.keep(wall);

  return {
    spec, doors, lights,
    probe: [0, 1.7, -12],
    sunPatch: [0, -10],
    keys: {
      inside: { r: 0.3, pos: [-12, 1.66, -1.3], target: [-6, 1.5, -10] },
      room: { r: 0.43, pos: [-11.2, 1.72, -5.8], target: [1.5, 1.25, -16.5] },
      mid: { r: 0.56, pos: [-7.4, 1.68, -11.6], target: [-5.6, 1.25, -16.6] },
      equipment: { r: 0.68, pos: [-3.7, 1.42, -12.9], target: [-5.7, 1.2, -16.9] },
      through: { r: 0.74, pos: [2.5, 1.66, -7.2], target: [11, 1.5, -5] },
      exit: { r: 0.8, pos: [12.5, 1.66, -1.6], target: [12.8, 1.6, 4] },
    },
  };
}

// ------------------------------------------------------------------ 02 Hotel
export function hotel(b) {
  const spec = { width: 18, depth: 13, height: 3.3, roofDepth: 0.5, floor: 'oakFloor', walls: { back: 'walnut', left: 'plasterWarm', right: 'travertine' }, ceiling: 'plaster', exterior: 'travertine', fascia: 'walnut', module: 1.5, doors: [{ x: -6, width: 1.8 }, { x: 6.5, width: 1.8 }], plinth: true };
  shell(b, spec);
  const doors = curtainWall(b, spec, b.material);
  upperFloors(b, { width: 18, depth: 13, base: 3.8, floors: 4, floorHeight: 3.2, style: 'balcony', material: 'travertine', seed: 11 });
  // Canopy and hotel sign.
  b.box('@walnut', 6, 0.18, 2.4, -6, 3.55, 1.2);
  b.box('@aluminiumDark', 6.04, 0.04, 2.44, -6, 3.44, 1.2, 0, { cast: false });
  for (const x of [-8.5, -6, -3.5]) b.add('@ledWarm', new THREE.CylinderGeometry(0.05, 0.05, 0.004, 16), x, 3.415, 1.6, 0, 0, 0, 1, 1, 1, { cast: false });
  const sign = makeSign('HOTEL · FITNESS & SPA', 4.2, { intensity: 2.2, font: '500 92px Manrope, sans-serif', letterSpacing: 18 });
  sign.position.set(-6, 3.95, 0.24);
  b.keep(sign);
  const lights = [];
  // Warm cove light along the walnut wall and a row of downlights.
  b.box('walnut', 17.4, 0.12, 0.3, 0, 3.12, -12.85);
  b.box('ledSoft', 17.2, 0.01, 0.02, 0, 3.07, -12.72, 0, { cast: false });
  lights.push({ position: [0, 3.0, -12.4], width: 17, height: 0.3, color: 0xffd2a1, intensity: 9, facing: 'down' });
  for (let x = -7.5; x <= 7.5; x += 2.5) for (const z of [-3.5, -8.5]) downlight(b, x, 3.3, z, 'ledWarm', 0.05);
  lights.push({ position: [0, 3.28, -3.5], width: 15, height: 0.4, color: 0xffd9b0, intensity: 5.5 });
  lights.push({ position: [0, 3.28, -8.5], width: 15, height: 0.4, color: 0xffd9b0, intensity: 5.5 });
  // Slatted walnut wall (vertical battens).
  for (let x = -8.85; x <= 8.85; x += 0.12) b.box('walnut', 0.045, 3.0, 0.04, x, 1.5, -12.95);
  // Mirror on the plaster wall + travertine-clad right wall bench.
  b.at(-8.975, 0, -7.5, HALF, () => E.mirrorWall(b, 6, 2.2, 0.35));
  // Cardio facing the garden glazing.
  for (let i = 0; i < 3; i++) b.at(-1.6 + i * 1.25, 0, -2.4, Math.PI, () => E.treadmill(b));
  b.at(2.6, 0, -2.2, Math.PI, () => E.spinBike(b));
  b.at(3.6, 0, -2.2, Math.PI, () => E.spinBike(b));
  // Functional trainer, dumbbells and bench.
  b.at(-4, 0, -12.2, 0, () => E.functionalTrainer(b, { width: 1.5 }));
  b.at(3.5, 0, -12.35, 0, () => E.dumbbellRack(b, 2.6, { weights: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24], tiers: 3 }));
  b.at(3.4, 0, -10.2, 0.15, () => E.adjustableBench(b, { incline: 0.6, material: 'vinylCognac' }));
  // Stretch zone with mats and rolls.
  for (let i = 0; i < 3; i++) E.mat(b, -7.4 + i * 0.8, -9.8, 0, 'felt');
  E.matRolls(b, -7.6, -12.6, 5, 'felt');
  b.at(-1.0, 0, -9.6, 0, () => E.kettlebellRack(b, 1.4, [4, 6, 8, 10, 12]));
  // Towel shelf, water, plants.
  b.at(7.6, 0, -12.6, 0, () => E.towelShelf(b, 1.6));
  b.at(8.65, 0, -6.6, -HALF, () => E.bench(b, 2.4, { seat: 'walnut', frame: 'aluminiumDark' }));
  E.plant(b, -8.3, -2.0, { height: 1.1, seed: 4, pot: 'ceramicLight' });
  E.plant(b, 8.3, -2.0, { height: 1.0, seed: 6, pot: 'ceramicLight' });
  E.plant(b, 8.3, -11, { height: 1.2, seed: 14, pot: 'ceramicLight' });
  b.at(0.6, 2.0, -12.9, 0, () => E.wallScreen(b, 1.2, 0.68, 'screenOff'));

  return {
    spec, doors, lights,
    tall: true,
    probe: [0, 1.6, -7],
    sunPatch: [0, -6],
    keys: {
      inside: { r: 0.3, pos: [-6, 1.64, -1.2], target: [-2, 1.4, -8] },
      room: { r: 0.43, pos: [-6.8, 1.66, -3.2], target: [2.5, 1.15, -11.5] },
      mid: { r: 0.56, pos: [-2.5, 1.62, -7.0], target: [3.2, 1.0, -11.8] },
      equipment: { r: 0.68, pos: [1.6, 1.38, -8.3], target: [3.6, 0.9, -12.3] },
      through: { r: 0.74, pos: [5.8, 1.62, -6.4], target: [6.5, 1.5, -1] },
      exit: { r: 0.8, pos: [6.5, 1.64, -1.4], target: [6.8, 1.6, 4] },
    },
  };
}

// ------------------------------------------------------------------ 03 Business
export function business(b) {
  const spec = { width: 20, depth: 14, height: 3.1, roofDepth: 0.55, floor: 'rubberGrey', walls: { back: 'plaster', left: 'oakLight', right: 'plaster' }, ceiling: 'acousticPanel', exterior: 'concretePanel', fascia: 'aluminiumDark', module: 1.35, doors: [{ x: -7, width: 1.8 }, { x: 7.5, width: 1.8 }] };
  shell(b, spec);
  const doors = curtainWall(b, spec, b.material);
  upperFloors(b, { width: 20, depth: 14, base: 3.65, floors: 5, floorHeight: 3.4, style: 'ribbon', material: 'concretePanel', seed: 23 });
  const lights = [];
  // Acoustic ceiling rafts and flush linear lights.
  for (let x = -7.5; x <= 7.5; x += 5) {
    b.box('acousticPanel', 4.2, 0.05, 11.5, x, 2.92, -7.2, 0, { cast: false });
    b.box('felt', 4.22, 0.012, 11.52, x, 2.89, -7.2, 0, { cast: false });
  }
  for (const z of [-3, -7, -11]) lightRow(b, lights, { x0: -9.5, x1: 9.5, y: 3.08, z, segment: 2.4, gap: 0.6, emitter: 'ledCool', color: 0xf3f4ff, intensity: 6 });
  // Glass partition to the office corridor (right) with oak frame.
  b.box('oakLight', 0.08, 3.1, 14, 6.8, 1.55, -7);
  for (let z = -13; z <= -1; z += 2) b.box('aluminiumDark', 0.05, 3.1, 0.05, 6.8, 1.55, z);
  b.box('frostedGlass', 0.012, 1.0, 13.8, 6.82, 1.3, -7, 0, { cast: false });
  b.box('glass', 0.012, 3.1, 13.8, 6.83, 1.55, -7, 0, { cast: false });
  // Corridor beyond: lockers and a bench (visible through the glass).
  b.at(9.7, 0, -8, -HALF, () => E.lockers(b, 10, { material: 'oakLight' }));
  b.at(8.2, 0, -5, -HALF, () => E.bench(b, 2.0, { seat: 'oakLight' }));
  // Training floor.
  b.at(-1, 0, -13.25, 0, () => E.functionalTrainer(b, { width: 1.6 }));
  b.at(3.8, 0, -13.3, 0, () => E.dumbbellRack(b, 2.4, { weights: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], tiers: 2 }));
  b.at(3.6, 0, -11, -0.25, () => E.flatBench(b));
  for (let i = 0; i < 2; i++) b.at(-6 + i * 1.3, 0, -2.4, Math.PI, () => E.treadmill(b));
  for (let i = 0; i < 2; i++) b.at(-2.6 + i * 1.0, 0, -2.2, Math.PI, () => E.spinBike(b));
  b.at(1.0, 0, -2.6, Math.PI, () => E.rower(b));
  for (let i = 0; i < 4; i++) E.mat(b, -8.6 + i * 0.8, -9.5, 0);
  E.matRolls(b, -8, -13.6, 6);
  b.at(-5.2, 0, -12.8, 0, () => E.kettlebellRack(b, 1.6, [6, 8, 12, 16, 20]));
  E.wallBalls(b, -9.6, -6.3, 4);
  b.at(-9.965, 1.85, -5, HALF, () => E.wallScreen(b, 1.6, 0.9));
  E.plant(b, 5.9, -1.5, { height: 1.0, seed: 17, pot: 'ceramicLight' });
  E.plant(b, -9.3, -1.5, { height: 0.9, seed: 21, pot: 'ceramicLight' });
  // Wall graphic.
  const wall = makeSign('MERE OVERSKUD', 5.5, { color: '#2c2e2d', font: '800 140px Manrope, sans-serif', letterSpacing: 8 });
  wall.material.emissiveIntensity = 0;
  wall.position.set(1.4, 2.35, -13.97);
  b.keep(wall);

  return {
    spec, doors, lights,
    tall: true,
    probe: [0, 1.6, -7],
    sunPatch: [0, -6],
    keys: {
      inside: { r: 0.3, pos: [-7, 1.64, -1.2], target: [-2, 1.4, -9] },
      room: { r: 0.43, pos: [-8.2, 1.68, -3.0], target: [3.4, 1.15, -10.4] },
      mid: { r: 0.56, pos: [-4.4, 1.64, -6.2], target: [1.6, 1.1, -12.4] },
      equipment: { r: 0.68, pos: [3.3, 1.5, -7.9], target: [0.6, 1.05, -13.2] },
      through: { r: 0.74, pos: [5.2, 1.62, -5.6], target: [7.5, 1.5, -1] },
      exit: { r: 0.8, pos: [7.5, 1.64, -1.3], target: [7.7, 1.6, 4] },
    },
  };
}

// ------------------------------------------------------------------ 04 Associations
export function association(b) {
  const spec = { width: 30, depth: 24, height: 7.2, roofDepth: 1.0, floor: 'oakFloor', walls: { back: 'concreteWall', left: 'concreteWall', right: 'concreteWall' }, ceiling: 'oakLight', exterior: 'larch', fascia: 'aluminiumDark', module: 2.0, transom: 3.0, doors: [{ x: -10, width: 2.2 }, { x: 10.5, width: 2.2 }] };
  shell(b, spec);
  const doors = curtainWall(b, spec, b.material);
  const lights = [];
  // Glulam roof beams and high-bay luminaires.
  for (let x = -12; x <= 12; x += 4) b.box('oak', 0.24, 0.9, 24, x, 6.75, -12);
  for (const z of [-5, -12, -19]) lightRow(b, lights, { x0: -13.5, x1: 13.5, y: 6.25, z, segment: 1.4, gap: 2.6, emitter: 'ledNeutral', suspended: 0.5, width: 0.3, intensity: 6 });
  // Court lines on the sports floor.
  const line = (w, d, x, z) => b.box('accent', w, 0.002, d, x, 0.002, z, 0, { cast: false });
  line(26, 0.05, 0, -2.5); line(26, 0.05, 0, -21.5); line(0.05, 19, -13, -12); line(0.05, 19, 13, -12); line(0.05, 19, 0, -12);
  b.add('accent', new THREE.RingGeometry(2.9, 2.95, 64), 0, 0.003, -12, -HALF, 0, 0, 1, 1, 1, { cast: false });
  // Training rig along the back wall.
  rig(b, 0, -21.6, 12);
  // Rowing row, plyo boxes, kettlebells.
  for (let i = 0; i < 5; i++) b.at(-9 + i * 1.1, 0, -10.5, 0, () => E.rower(b));
  [[-1, 0, 0], [-0.1, 0, 0.3], [-0.55, 0.51, 0.1]].forEach(([x, y, r], i) => E.plyoBox(b, 4 + x, y, -8.5, r, i === 2 ? [0.76, 0.61, 0.51] : [0.76, 0.61, 0.61]));
  b.at(8, 0, -9.2, 0, () => E.kettlebellRack(b, 2.6));
  E.wallBalls(b, 12.6, -11, 6);
  for (let i = 0; i < 6; i++) E.mat(b, -10 + i * 0.8, -15.6, 0, i % 2 ? 'foamMat' : 'felt');
  // Club wall: noticeboard, benches and storage.
  b.at(-14.8, 0, -8, HALF, () => E.bench(b, 3.6, { seat: 'oak' }));
  b.at(-14.97, 1.6, -15, HALF, () => b.block('felt', 3, 1.4, 0.04, 0, 0, 0));
  b.at(14.75, 0, -17, -HALF, () => E.lockers(b, 6, { material: 'plywood', height: 2.0 }));
  E.foamRollers(b, 10.5, -14.8, 6);
  const banner = makeSign('FÆLLES STYRKE', 9, { color: '#d4ed72', font: '800 150px Manrope, sans-serif', letterSpacing: 12 });
  banner.material.emissiveIntensity = 0.25;
  banner.position.set(0, 5.0, -23.965);
  b.keep(banner);

  return {
    spec, doors, lights,
    probe: [0, 2, -12],
    sunPatch: [0, -9],
    keys: {
      inside: { r: 0.3, pos: [-10, 1.66, -1.3], target: [-3, 1.8, -12] },
      room: { r: 0.43, pos: [-11.6, 1.74, -4.2], target: [1.5, 1.7, -19] },
      mid: { r: 0.56, pos: [-5.5, 1.68, -12.2], target: [-1, 1.6, -21] },
      equipment: { r: 0.68, pos: [-2.3, 1.45, -15.8], target: [1.2, 1.3, -21.4] },
      through: { r: 0.74, pos: [5, 1.66, -11.5], target: [10.5, 1.5, -4] },
      exit: { r: 0.8, pos: [10.5, 1.66, -1.4], target: [10.7, 1.6, 4] },
    },
  };
}

/** Wall-mounted functional training rig with pull-up stations. */
function rig(b, x, z, length) {
  const bays = Math.round(length / 1.8);
  const bay = length / bays;
  b.at(x, 0, z, 0, () => {
    for (let i = 0; i <= bays; i++) {
      const px = -length / 2 + i * bay;
      for (const pz of [-0.55, 0.55]) b.block('powderBlack', 0.076, 2.75, 0.076, px, 0, pz);
      b.block('powderBlack', 0.076, 0.05, 1.3, px, 0, 0);
    }
    for (const pz of [-0.55, 0.55]) b.box('powderBlack', length, 0.076, 0.076, 0, 2.71, pz);
    for (let i = 0; i < bays; i++) {
      const cx = -length / 2 + (i + 0.5) * bay;
      b.add('knurl', new THREE.CylinderGeometry(0.016, 0.016, bay - 0.08, 14), cx, 2.6, 0.62, 0, 0, HALF);
      if (i % 2 === 0) {
        // Gymnastic rings.
        for (const dx of [-0.25, 0.25]) {
          b.rod('cable', 0.008, [cx + dx, 2.67, 0], [cx + dx, 1.9, 0], 6);
          b.add('oak', new THREE.TorusGeometry(0.09, 0.016, 10, 28), cx + dx, 1.8, 0, 0, HALF, 0);
        }
      } else {
        E.barbell(b, cx, 1.38, 0.64, { load: [] });
        b.box('powderBlack', 0.06, 0.1, 0.1, cx - 0.65, 1.36, 0.6);
        b.box('powderBlack', 0.06, 0.1, 0.1, cx + 0.65, 1.36, 0.6);
      }
    }
  });
  b.contactShadow(length + 0.6, 2, x, z);
  // Plates and bars stored beneath.
  for (let i = 0; i < 8; i++) E.plate(b, 20, x - length / 2 + 0.4 + i * 0.07, 0.225, z - 0.3);
  for (let i = 0; i < 6; i++) E.plate(b, 10, x + length / 2 - 0.8 + i * 0.05, 0.225, z - 0.3);
}

// ------------------------------------------------------------------ 05 Service
export function service(b) {
  const spec = { width: 20, depth: 16, height: 4.8, roofDepth: 0.8, floor: 'concreteFloor', walls: { back: 'concreteWall', left: 'concreteWall', right: 'concreteWall' }, ceiling: 'ceilingBlack', exterior: 'claddingDark', fascia: 'claddingDark', module: 1.6, transom: 3.2, doors: [{ x: -6.5, width: 1.8 }, { x: 6, width: 4.2 }] };
  shell(b, spec);
  const doors = curtainWall(b, spec, b.material);
  const lights = [];
  for (const z of [-4, -9, -13.5]) lightRow(b, lights, { x0: -9, x1: 9, y: 4.4, z, segment: 1.5, gap: 1.0, emitter: 'ledCool', suspended: 0.4, width: 0.12, color: 0xf2f5ff, intensity: 7 });
  // Workbench with oak top, pegboard and tools.
  b.at(-3, 0, -15.4, 0, () => {
    b.block('oak', 4.2, 0.05, 0.8, 0, 0.88, 0);
    b.block('powderGraphite', 4.2, 0.82, 0.75, 0, 0.06, 0);
    for (let i = 0; i < 6; i++) b.box('powderBlack', 0.66, 0.16, 0.01, -1.75 + i * 0.7, 0.75, 0.38, 0, { cast: false });
    b.block('paintGraphite', 4.2, 1.4, 0.04, 0, 1.0, -0.38);
    for (let i = 0; i < 18; i++) {
      const tx = -1.9 + (i % 9) * 0.45;
      const ty = 1.3 + Math.floor(i / 9) * 0.55;
      b.box(i % 4 === 0 ? 'toolRed' : 'steel', 0.03, 0.28 - (i % 3) * 0.06, 0.02, tx, ty, -0.34);
    }
    b.box('ledCool', 3.8, 0.01, 0.05, 0, 2.38, -0.2, 0, { cast: false });
    // Machine part under repair on the bench.
    b.add('chrome', new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24), -0.8, 0.95, 0.05, HALF, 0, 0);
    b.add('plasticBlack', new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32), 0.4, 0.93, 0.0, 0, 0, 0);
    b.box('steel', 0.6, 0.02, 0.2, 1.2, 0.94, 0.1);
  });
  // Tool cabinet on wheels.
  b.at(2.2, 0, -15.3, 0, () => {
    b.rounded('toolRed', 1.2, 0.95, 0.5, 0.02, 0, 0.6, 0);
    for (let i = 0; i < 6; i++) b.box('aluminium', 0.6, 0.02, 0.01, 0, 0.25 + i * 0.13, 0.255, 0, { cast: false });
    for (const [x, z] of [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]]) b.add('tyre', new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), x, 0.07, z, 0, 0, HALF);
    b.block('rubberMatte', 1.22, 0.02, 0.52, 0, 1.075, 0);
  });
  // Equipment being serviced: treadmill with hood removed, cable machine with shrouds off.
  b.at(-4.5, 0, -9.5, 0.5, () => E.treadmill(b, { screenMaterial: 'screenOff' }));
  b.at(2.5, 0, -10.5, -0.3, () => E.latPulldown(b));
  b.at(-0.8, 0, -7.2, 0.2, () => E.spinBike(b));
  // Parts shelving along the right wall.
  b.at(9.55, 0, -9, -HALF, () => {
    for (const x of [-2.6, 0, 2.6]) {
      for (const dx of [-1.25, 1.25]) for (const dz of [-0.28, 0.28]) b.block('powderGraphite', 0.04, 2.6, 0.04, x + dx, 0, dz);
      for (const y of [0.1, 0.9, 1.7, 2.5]) {
        b.block('steel', 2.5, 0.03, 0.6, x, y, 0);
        for (let i = 0; i < 4; i++) b.rounded(i % 2 ? 'plywood' : 'plasticGrey', 0.5, 0.36, 0.45, 0.01, x - 0.9 + i * 0.6, y + 0.21, 0);
      }
    }
  });
  // Open toolbox and parts laid out on a mat next to the treadmill.
  b.at(-3.3, 0, -8.4, 0.3, () => {
    b.rounded('rubberMatte', 1.2, 0.006, 0.7, 0.003, 0, 0.003, 0, 0, 0, 0, { cast: false });
    b.rounded('toolRed', 0.5, 0.22, 0.24, 0.01, -0.3, 0.12, 0);
    b.box('toolRed', 0.5, 0.02, 0.24, -0.3, 0.33, -0.16, -1.1);
    for (let i = 0; i < 5; i++) b.box('steel', 0.18, 0.012, 0.02, 0.15 + (i % 3) * 0.1, 0.012, -0.2 + i * 0.09, 0.4 * i);
    b.add('chrome', new THREE.TorusGeometry(0.03, 0.008, 8, 20), 0.4, 0.01, 0.2, Math.PI / 2, 0, 0);
  });
  // Service trolley beside the treadmill, safety cones by the door.
  b.at(-2.5, 0, -11.5, 0, () => {
    b.block('powderBlack', 0.8, 0.03, 0.5, 0, 0.8, 0);
    b.block('powderBlack', 0.8, 0.03, 0.5, 0, 0.35, 0);
    for (const [x, z] of [[-0.38, -0.23], [0.38, -0.23], [-0.38, 0.23], [0.38, 0.23]]) b.block('steel', 0.02, 0.8, 0.02, x, 0, z);
    b.box('toolRed', 0.4, 0.15, 0.22, -0.1, 0.9, 0);
  });
  // Floor markings around the work bay.
  b.box('accent', 9, 0.002, 0.08, -1, 0.002, -5.2, 0, { cast: false });
  b.box('accent', 0.08, 0.002, 8, -5.5, 0.002, -9.2, 0, { cast: false });
  const sign = makeSign('PUREFITNESS SERVICE', 4.6, { intensity: 2.6, font: '800 104px Manrope, sans-serif', letterSpacing: 10 });
  sign.position.set(-4.5, 4.2, 0.2);
  b.keep(sign);

  return {
    spec, doors, lights,
    probe: [0, 1.7, -8],
    sunPatch: [0, -7],
    keys: {
      inside: { r: 0.3, pos: [-6.5, 1.66, -1.3], target: [-3, 1.2, -9] },
      room: { r: 0.43, pos: [-7.4, 1.7, -3.6], target: [0.5, 1.0, -12] },
      mid: { r: 0.56, pos: [-6.4, 1.62, -7.0], target: [-4.2, 0.8, -10] },
      equipment: { r: 0.68, pos: [-1.6, 1.5, -6.4], target: [-4.4, 0.7, -10.2] },
      through: { r: 0.74, pos: [2.5, 1.66, -5.5], target: [6, 1.5, -1] },
      exit: { r: 0.8, pos: [6, 1.66, -1.4], target: [6.5, 1.6, 4] },
    },
  };
}

export const ROOM_BUILDERS = [fitness, hotel, business, association, service];
