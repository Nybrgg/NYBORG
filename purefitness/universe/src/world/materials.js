// PBR material library. Textures are CC0 Poly Haven scans (see assets/sources.json),
// tiled in metres. Each room gets its own material instances so it can carry its
// own captured reflection probe.
import * as THREE from 'three';
import { assetUrl, hasAsset } from './assets.js';

// tile = real-world width of one texture repeat in metres.
const TEXTURE_SETS = {
  concreteWall: { base: 'concrete_wall_006', tile: 2 },
  boardConcrete: { diff: 'higgsfield-concrete.webp', base: 'concrete_wall_006', tile: 2.6 },
  oak: { base: 'oak_veneer_01', tile: 1.8 },
  rubber: { base: 'rubber_tiles', tile: 2 },
  leather: { base: 'brown_leather', tile: 0.7 },
  travertine: { base: 'marble_01', tile: 2.4 },
  darkMarble: { base: 'dark_marble', tile: 2 },
  concreteFloor: { base: 'concrete_floor_02', tile: 3.2 },
  grass: { base: 'grass_ground', tile: 3 },
  asphalt: { base: 'asphalt_02', tile: 3, rough: 'asphalt_02_rough_1k.jpg' },
};

const DEFINITIONS = {
  // Architecture
  concreteWall: { set: 'boardConcrete', color: 0xb4b9bd, roughness: 1, normalScale: 0.7 },
  concreteRaw: { set: 'concreteWall', color: 0xd9d6cf, roughness: 1 },
  concreteWallDark: { set: 'concreteWall', color: 0x8d8a85, roughness: 1 },
  concretePanel: { set: 'concreteWall', color: 0xbdb9b2, roughness: 1, normalScale: 0.6 },
  concreteFloor: { set: 'concreteFloor', color: 0xc9c5bd, roughness: 1 },
  polishedConcrete: { set: 'concreteFloor', color: 0xa9a59f, roughness: 0.55, normalScale: 0.25 },
  paving: { set: 'concreteWall', color: 0xb9b5ad, roughness: 1, normalScale: 0.8 },
  asphalt: { set: 'asphalt', color: 0x9a9894, roughness: 1 },
  grass: { set: 'grass', color: 0xc8d0b0, roughness: 1 },
  oak: { set: 'oak', color: 0xffffff, roughness: 1 },
  oakLight: { set: 'oak', color: 0xf3e6d2, roughness: 1 },
  walnut: { set: 'oak', color: 0x7b5a41, roughness: 1 },
  oakFloor: { set: 'oak', physical: true, color: 0xe9d6bb, roughness: 0.85, clearcoat: 0.35, clearcoatRoughness: 0.3 },
  rubber: { set: 'rubber', color: 0xffffff, roughness: 1 },
  rubberGrey: { set: 'rubber', color: 0xb4b6b4, roughness: 1 },
  travertine: { set: 'travertine', color: 0xf2ebe0, roughness: 0.9 },
  darkMarble: { set: 'darkMarble', color: 0xffffff, roughness: 0.6 },
  plaster: { color: 0xe8e5df, roughness: 0.92 },
  plasterWarm: { color: 0xe6dccd, roughness: 0.92 },
  paintGraphite: { color: 0x2c2e2d, roughness: 0.8 },
  ceilingBlack: { color: 0x1b1c1c, roughness: 0.92 },
  acousticPanel: { color: 0xdedcd6, roughness: 1 },
  felt: { color: 0x5d6158, roughness: 1 },
  claddingDark: { color: 0x232524, roughness: 0.5, metalness: 0.6 },
  aluminiumDark: { color: 0x2a2c2c, roughness: 0.38, metalness: 1 },
  aluminium: { color: 0xb9bcbd, roughness: 0.35, metalness: 1 },
  corten: { color: 0x6b3f26, roughness: 0.85, metalness: 0.25 },
  larch: { set: 'oak', color: 0x7c5f48, roughness: 1, normalScale: 1.4 },
  brick: { set: 'concreteWall', color: 0x8a5a45, roughness: 1, normalScale: 1.2 },
  // Glass: black diffuse so only reflections add light; opacity is the coating's absorption.
  glass: { physical: true, color: 0x000000, roughness: 0.015, metalness: 0, transparent: true, opacity: 0.3, envMapIntensity: 2.4, depthWrite: false, specularIntensity: 1, ior: 1.52, side: THREE.DoubleSide },
  glassTinted: { physical: true, color: 0x000000, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 2.4, depthWrite: false, side: THREE.DoubleSide },
  frostedGlass: { physical: true, color: 0xeef2f0, roughness: 0.4, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false },
  mirror: { color: 0xf4f4f2, roughness: 0.015, metalness: 1 },
  water: { physical: true, color: 0x2e4a4a, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.85 },
  // Equipment
  powderBlack: { physical: true, color: 0x0d0e0f, roughness: 0.55, metalness: 0, specularIntensity: 0.55 },
  powderGraphite: { physical: true, color: 0x2a2c2d, roughness: 0.55, metalness: 0, specularIntensity: 0.6 },
  powderWhite: { physical: true, color: 0xe4e4e0, roughness: 0.4, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.35 },
  chrome: { color: 0xe8e8e8, roughness: 0.08, metalness: 1 },
  steel: { color: 0xb8bab9, roughness: 0.3, metalness: 1 },
  knurl: { color: 0x9c9e9d, roughness: 0.55, metalness: 1 },
  rubberBlack: { color: 0x121212, roughness: 0.82 },
  rubberMatte: { color: 0x1d1e1e, roughness: 0.95 },
  plasticBlack: { color: 0x0f1010, roughness: 0.38 },
  plasticGrey: { color: 0x4a4c4d, roughness: 0.5 },
  vinylBlack: { set: 'leather', maps: ['normal', 'rough'], color: 0x161616, roughness: 0.75, normalScale: 0.5 },
  vinylCognac: { set: 'leather', color: 0xb8875e, roughness: 0.8 },
  beltRubber: { color: 0x191a1a, roughness: 0.9 },
  cable: { color: 0x1a1a1a, roughness: 0.4, metalness: 0.2 },
  turf: { set: 'grass', color: 0x6d8f4a, roughness: 1, normalScale: 0.4 },
  turfLine: { color: 0xe5e5dd, roughness: 0.9 },
  plywood: { set: 'oak', color: 0xd9b88f, roughness: 0.95 },
  foamMat: { color: 0x2b2f2c, roughness: 0.95 },
  accent: { color: 0xc9e264, roughness: 0.55 },
  accentGlow: { color: 0x000000, emissive: 0xd4ed72, emissiveIntensity: 2.2 },
  towel: { color: 0xeeebe4, roughness: 1 },
  towelGrey: { color: 0x8c8f8b, roughness: 1 },
  plantLeaf: { color: 0x3c5232, roughness: 0.7, side: THREE.DoubleSide },
  plantLeafDark: { color: 0x2b3d26, roughness: 0.72, side: THREE.DoubleSide },
  soil: { color: 0x2a2018, roughness: 1 },
  ceramic: { color: 0x2d2f2e, roughness: 0.35 },
  ceramicLight: { color: 0xd7d3cb, roughness: 0.4 },
  bark: { color: 0x4f4338, roughness: 1 },
  foliage: { color: 0x4b5e3a, roughness: 0.9, side: THREE.DoubleSide },
  hedge: { set: 'grass', color: 0x4c6338, roughness: 1, normalScale: 2 },
  tyre: { color: 0x141414, roughness: 0.75 },
  carPaint: { physical: true, color: 0xdedfdc, roughness: 0.3, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05 },
  carPaintDark: { physical: true, color: 0x24282a, roughness: 0.3, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.05 },
  toolRed: { physical: true, color: 0x8f1f1a, roughness: 0.35, metalness: 0.3, clearcoat: 0.6 },
  // Light emitters (luminance tuned for AgX exposure).
  ledWarm: { color: 0x000000, emissive: 0xffe2bd, emissiveIntensity: 14 },
  ledNeutral: { color: 0x000000, emissive: 0xfff1df, emissiveIntensity: 14 },
  ledCool: { color: 0x000000, emissive: 0xf2f6ff, emissiveIntensity: 12 },
  ledSoft: { color: 0x000000, emissive: 0xffd9a8, emissiveIntensity: 5 },
  diffuser: { color: 0xf2f0ea, roughness: 0.9, emissive: 0xfff3e2, emissiveIntensity: 3.5 },
  screen: { color: 0x050607, roughness: 0.15, emissive: 0x7aa1b8, emissiveIntensity: 0.6 },
  screenOff: { color: 0x060707, roughness: 0.12, metalness: 0.2 },
  windowLit: { atlas: true, color: 0x000000, emissive: 0xffe2bf, emissiveIntensity: 2.4 },
  windowDim: { atlas: true, color: 0x050505, roughness: 0.3, emissive: 0x8a7a66, emissiveIntensity: 0.12 },
  signLetter: { color: 0xf2f1ec, roughness: 0.4, emissive: 0xfff6e8, emissiveIntensity: 3.2 },
  shadow: { shadowDecal: true },
};

export class MaterialLibrary {
  constructor(renderer, { mobile }) {
    this.renderer = renderer;
    this.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), mobile ? 4 : 8);
    this.loader = new THREE.TextureLoader();
    this.textures = new Map();
    this.materials = new Map(); // `${room}:${name}` -> material
    this.pending = [];
    this.shadowTexture = makeShadowTexture();
  }

  texture(file, srgb, tile) {
    if (!hasAsset(file)) return null;
    const key = `${file}:${tile}`;
    if (this.textures.has(key)) return this.textures.get(key);
    const texture = new THREE.Texture();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1 / tile, 1 / tile);
    texture.anisotropy = this.anisotropy;
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    this.textures.set(key, texture);
    this.pending.push(this.loader.loadAsync(assetUrl(file)).then(loaded => {
      texture.image = loaded.image;
      texture.needsUpdate = true;
      loaded.dispose();
    }));
    return texture;
  }

  /** Returns the shared material for `room` (null room = global/exterior). */
  get(name, room = 'world') {
    const key = `${room}:${name}`;
    if (this.materials.has(key)) return this.materials.get(key);
    const def = DEFINITIONS[name];
    if (!def) throw new Error(`Unknown material ${name}`);
    let material;
    if (def.shadowDecal) {
      material = new THREE.MeshBasicMaterial({ map: this.shadowTexture, transparent: true, depthWrite: false, color: 0x000000, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });
    } else {
      const { set, maps, physical, normalScale, atlas, ...params } = def;
      material = physical ? new THREE.MeshPhysicalMaterial(params) : new THREE.MeshStandardMaterial(params);
      if (atlas) material.emissiveMap = this.interiorAtlas();
      if (set) {
        const info = TEXTURE_SETS[set];
        const use = maps || ['diff', 'normal', 'rough'];
        if (use.includes('diff')) material.map = this.texture(info.diff || `${info.base}_diff_1k.webp`, true, info.tile);
        if (use.includes('normal')) {
          material.normalMap = this.texture(`${info.base}_nor_gl_1k.webp`, false, info.tile);
          const s = normalScale ?? 1;
          material.normalScale.set(s, s);
        }
        if (use.includes('rough')) material.roughnessMap = this.texture(info.rough || `${info.base}_rough_1k.webp`, false, info.tile);
      }
    }
    material.name = key;
    this.materials.set(key, material);
    return material;
  }

  /** Procedural 4x2 atlas of lit interiors seen through upper-floor windows. */
  interiorAtlas() {
    if (this.atlas) return this.atlas;
    const cw = 256;
    const ch = 256;
    const canvas = document.createElement('canvas');
    canvas.width = cw * 4;
    canvas.height = ch * 2;
    const ctx = canvas.getContext('2d');
    let seed = 42;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let cell = 0; cell < 8; cell++) {
      const x0 = (cell % 4) * cw;
      const y0 = Math.floor(cell / 4) * ch;
      const warm = rand();
      const g = ctx.createLinearGradient(0, y0, 0, y0 + ch);
      g.addColorStop(0, `rgb(${235 + warm * 20},${215 + warm * 15},${185})`);
      g.addColorStop(0.55, `rgb(${150 + warm * 40},${130 + warm * 30},${105})`);
      g.addColorStop(1, 'rgb(40,34,28)');
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, cw, ch);
      // Ceiling luminaires in perspective.
      ctx.fillStyle = 'rgba(255,250,240,0.95)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 20 + i * 80 + rand() * 10, y0 + 14 + i * 6, 50, 5);
      // Back wall, doors and furniture silhouettes.
      ctx.fillStyle = 'rgba(70,58,46,0.55)';
      ctx.fillRect(x0, y0 + ch * 0.32, cw, ch * 0.08);
      for (let i = 0; i < 4; i++) {
        const w = 30 + rand() * 50;
        const x = x0 + rand() * (cw - w);
        ctx.fillStyle = `rgba(${20 + rand() * 30},${18 + rand() * 20},${16},0.85)`;
        ctx.fillRect(x, y0 + ch * (0.62 + rand() * 0.08), w, ch * 0.4);
        if (rand() > 0.5) { ctx.fillStyle = 'rgba(150,190,220,0.8)'; ctx.fillRect(x + 6, y0 + ch * 0.55, 18, 12); }
      }
      // Partially lowered blinds.
      const blind = rand() * 0.5;
      ctx.fillStyle = 'rgba(200,190,170,0.75)';
      for (let y = 0; y < ch * blind; y += 6) ctx.fillRect(x0, y0 + y, cw, 3);
      // Window mullion shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x0, y0, 4, ch);
      ctx.fillRect(x0 + cw - 4, y0, 4, ch);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.atlas = texture;
    return texture;
  }

  forRoom(room) {
    return name => this.get(name, room);
  }

  /** Assign a captured reflection probe to every material belonging to `room`. */
  setRoomEnvironment(room, envMap, intensity = 1) {
    for (const [key, material] of this.materials) {
      if (!key.startsWith(`${room}:`) || !('envMap' in material) || material instanceof THREE.MeshBasicMaterial) continue;
      material.envMap = envMap;
      material.envMapIntensity = (DEFINITIONS[key.slice(room.length + 1)]?.envMapIntensity ?? 1) * intensity;
      material.needsUpdate = true;
    }
  }

  /** Temporarily scale every emitter (used while capturing reflection probes). */
  scaleEmitters(factor) {
    for (const material of this.materials.values()) {
      if (!material.emissiveIntensity) continue;
      material.userData.baseEmissive ??= material.emissiveIntensity;
      material.emissiveIntensity = material.userData.baseEmissive * factor;
    }
  }

  ready() {
    return Promise.allSettled(this.pending);
  }

  dispose() {
    for (const material of this.materials.values()) material.dispose();
    for (const texture of this.textures.values()) texture.dispose();
    this.shadowTexture.dispose();
    this.atlas?.dispose();
  }
}

/** Soft radial contact-shadow texture for decals under equipment. */
function makeShadowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  // MeshBasicMaterial uses map.rgb * color; alphaMap gives the falloff.
  return texture;
}
