// Static scene builder: collects geometry per material under a transform stack
// and merges it into a handful of meshes per room (few draw calls, cheap shadows).
import * as THREE from 'three';
import { unitPlaneGeometry, boxGeometry, roundedBoxGeometry, planeGeometry, cylinderGeometry, mergeParts, matrix } from './geometry.js';

export class Builder {
  constructor(material) {
    this.material = material; // name -> THREE.Material
    this.parts = new Map(); // material name -> { cast, receive, list }
    this.stack = [new THREE.Matrix4()];
    this.dynamic = [];
  }

  get current() {
    return this.stack[this.stack.length - 1];
  }

  /** Run fn inside a local frame translated/rotated (radians, Y-up). */
  at(x, y, z, ry, fn, rx = 0, rz = 0) {
    this.stack.push(this.current.clone().multiply(matrix(x, y, z, rx, ry, rz)));
    try { fn(this); } finally { this.stack.pop(); }
    return this;
  }

  /** Add geometry with a local transform. options: { cast, receive } */
  add(name, geometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, options) {
    // Allow add(name, geometry, x, y, z, rx, ry, rz, options).
    if (typeof sx === 'object') { options = sx; sx = sy = sz = 1; }
    const world = this.current.clone().multiply(matrix(x, y, z, rx, ry, rz, sx, sy, sz));
    const key = options?.cast === false ? `${name}|nocast` : name;
    if (!this.parts.has(key)) this.parts.set(key, { name, cast: options?.cast !== false, list: [] });
    this.parts.get(key).list.push([geometry, world]);
    return this;
  }

  /** Axis-aligned box positioned by its centre. */
  box(name, w, h, d, x, y, z, ry = 0, options) {
    return this.add(name, boxGeometry(w, h, d), x, y, z, 0, ry, 0, 1, 1, 1, options);
  }

  /** Box positioned by its bottom centre (convenient for furniture). */
  block(name, w, h, d, x, y, z, ry = 0, options) {
    return this.box(name, w, h, d, x, y + h / 2, z, ry, options);
  }

  rounded(name, w, h, d, radius, x, y, z, rx = 0, ry = 0, rz = 0, options) {
    return this.add(name, roundedBoxGeometry(w, h, d, radius), x, y, z, rx, ry, rz, 1, 1, 1, options);
  }

  /** Cylinder between two points (tubes, bars, cables). */
  rod(name, radius, from, to, segments = 16, options) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const length = a.distanceTo(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    const local = new THREE.Matrix4().compose(mid, quaternion, new THREE.Vector3(1, 1, 1));
    const world = this.current.clone().multiply(local);
    const key = options?.cast === false ? `${name}|nocast` : name;
    if (!this.parts.has(key)) this.parts.set(key, { name, cast: options?.cast !== false, list: [] });
    this.parts.get(key).list.push([cylinderGeometry(radius, radius, length, segments), world]);
    return this;
  }

  /** Horizontal plane (floors, ceilings, decals). */
  floor(name, w, d, x, y, z, ry = 0, flip = false, options) {
    return this.add(name, planeGeometry(w, d, x * 0.13, z * 0.11), x, y, z, flip ? Math.PI / 2 : -Math.PI / 2, ry, 0, 1, 1, 1, options);
  }

  /** Vertical plane facing +z in local space (walls seen from one side). */
  wall(name, w, h, x, y, z, ry = 0, options) {
    return this.add(name, planeGeometry(w, h, x * 0.21, y * 0.17), x, y + h / 2, z, 0, ry, 0, 1, 1, 1, options);
  }

  /** Soft contact shadow under an object footprint. */
  contactShadow(w, d, x, z, ry = 0, y = 0.004) {
    return this.at(x, y, z, ry, b => b.add('shadow', unitPlaneGeometry(), 0, 0, 0, -Math.PI / 2, 0, 0, w, d, 1, { cast: false }));
  }

  /** Register an object that is animated or lit at runtime (not merged). */
  keep(object) {
    object.applyMatrix4(this.current);
    this.dynamic.push(object);
    return object;
  }

  build(group, { receiveShadow = true } = {}) {
    for (const { name, cast, list } of this.parts.values()) {
      const geometry = mergeParts(list);
      if (!geometry) continue;
      geometry.computeBoundingSphere();
      const material = this.material(name);
      const mesh = new THREE.Mesh(geometry, material);
      const transparent = material.transparent || name === 'shadow';
      const emitter = material.emissive && material.emissive.getHex() !== 0 && material.color?.getHex() === 0;
      mesh.castShadow = cast && !transparent && !emitter;
      mesh.receiveShadow = receiveShadow && !transparent;
      mesh.name = name;
      if (name === 'shadow') mesh.renderOrder = 1;
      if (material.transparent && name !== 'shadow') mesh.renderOrder = 2;
      group.add(mesh);
    }
    for (const object of this.dynamic) group.add(object);
    this.parts.clear();
    this.dynamic = [];
    return group;
  }
}
