// PureFitness 3D universe: a scroll-driven walk along one street through five
// real-scale training environments. Public contract (used by pf-universe.js):
//   createUniverse(host, journey, { onReady, onError, onProgress })
//     -> { setLightMode(day), setReduced(flag), dispose() }
// Events: window 'scroll', 'pf-route-resize', 'pf-seek' (detail = progress).
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { springStep } from '../shared.js';
import { assetUrl, hasAsset } from './assets.js';
import { MaterialLibrary } from './materials.js';
import { Builder } from './builder.js';
import { ROOM_BUILDERS } from './rooms.js';
import { buildExterior } from './exterior.js';
import { buildRoute } from './route.js';
import { setDoorOpen } from './architecture.js';
import { disposeGeometryCache } from './geometry.js';

const ROOM_IDS = ['fitness', 'hoteller', 'erhverv', 'foreninger', 'service'];
const GAP = 14;
const RECT_POOL = 4;
// Rotates sunset.hdr so its sun (u = 0.80) lines up with MODES.warm.sunDir.
const HDR_ROTATION = 0.365;
// Probes hold bounce light from surfaces the area lights already shade directly;
// scaling them keeps dark materials (powder-coated steel, rubber) reading as dark.
const PROBE_INTENSITY = 0.6;

// Light mode presets. Warm = golden hour (HDR sky), day = clear midday (analytic sky).
const MODES = {
  warm: { sunColor: 0xffc08a, sunIntensity: 6, sunDir: [-0.62, 0.16, 0.77], envIntensity: 0.6, exposure: 0.92, insideBoost: 1.25, lamps: 1, windows: 1, fog: 0x8f7f78, fogDensity: 0.0042 },
  day: { sunColor: 0xfff4e6, sunIntensity: 5.5, sunDir: [-0.45, 0.62, 0.64], envIntensity: 1, exposure: 0.72, insideBoost: 1.35, lamps: 0, windows: 0.25, fog: 0xbfc9d1, fogDensity: 0.0028 },
};

const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.22 }, uGrain: { value: 0.022 }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uGrain; uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main(){
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
      float v = smoothstep(0.95, 0.25, length(c));
      color.rgb *= mix(1.0 - uVignette, 1.0, v);
      float n = hash(vUv * 1000.0 + uTime) - 0.5;
      color.rgb += n * uGrain;
      gl_FragColor = color;
    }`,
};

class SelectiveGTAOPass extends GTAOPass {
  constructor(scene, camera, w, h, hidden) {
    super(scene, camera, w, h);
    this.hidden = hidden;
  }
  _overrideVisibility() {
    for (const object of this.hidden) {
      if (object.visible) { object.visible = false; this._visibilityCache.push(object); }
    }
  }
}

const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;

export function createUniverse(host, journey, options) {
  const noop = { dispose() {}, setReduced() {}, setLightMode() {} };
  const mobile = host.clientWidth < 701;
  const lowEnd = mobile || (navigator.hardwareConcurrency || 8) < 4 || (navigator.deviceMemory || 8) < 4;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  } catch {
    options.onError();
    return noop;
  }
  let disposed = false;
  let frame = 0;
  let dirty = true;
  let jump = true;
  let ready = false;
  let loadedEnough = false;
  let day = false;
  let lastTime = 0;
  let target = 0;
  let value = 0;
  let velocity = 0;
  let distance = 1;
  let lastSite = -1;
  let slowFrames = 0;
  let sampleFrames = 0;
  const pixelBudget = 2.1e6;
  const maxRatio = () => Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.5, Math.sqrt(pixelBudget / Math.max(1, host.clientWidth * host.clientHeight)));
  let ratio = maxRatio();

  renderer.setPixelRatio(ratio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = MODES.warm.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  host.appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 900);
  const lib = new MaterialLibrary(renderer, { mobile });
  const resolver = room => name => (name.startsWith('@') ? lib.get(name.slice(1), 'world') : lib.get(name, room));

  // ---------------------------------------------------------------- world
  const sites = [];
  const signs = [];
  try {
    let x = 0;
    ROOM_BUILDERS.forEach((build, index) => {
      const id = ROOM_IDS[index];
      const builder = new Builder(resolver(id));
      builder.material = resolver(id);
      const room = build(builder);
      const width = room.spec.width + 0.6;
      if (index > 0) x += width / 2;
      const group = new THREE.Group();
      group.name = id;
      builder.build(group);
      group.position.x = x;
      scene.add(group);
      group.traverse(object => { if (object.userData.redraw) signs.push(object); });
      for (const rig of room.doors) rig.traverse(o => { o.castShadow = false; });
      sites.push({ id, x, width, depth: room.spec.depth, height: room.spec.height, tall: Boolean(room.tall), entry: room.spec.doors[0].x, exit: room.spec.doors[1].x, room, group, env: {} });
      x += width / 2 + GAP;
    });
  } catch (error) {
    console.error('Could not construct Purefitness street', error);
    renderer.dispose();
    renderer.domElement.remove();
    options.onError();
    return noop;
  }
  const exteriorBuilder = new Builder(resolver('world'));
  const exterior = buildExterior(exteriorBuilder, { xMin: sites[0].x - 40, xMax: sites[sites.length - 1].x + 40, buildings: sites, mobile });
  const exteriorGroup = exteriorBuilder.build(new THREE.Group());
  scene.add(exteriorGroup);
  const lampPools = makeLampPools(exterior.lamps);
  scene.add(lampPools);
  const route = buildRoute(sites);

  // Transparent meshes are excluded from ambient occlusion.
  const transparent = [];
  scene.traverse(object => {
    if (object.isMesh && object.material.transparent) transparent.push(object);
  });

  // ---------------------------------------------------------------- lighting
  const sun = new THREE.DirectionalLight(MODES.warm.sunColor, MODES.warm.sunIntensity);
  sun.castShadow = true;
  const shadowSize = lowEnd ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 220 });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = lowEnd ? 2 : 3;
  scene.add(sun, sun.target);

  const rects = Array.from({ length: RECT_POOL }, () => {
    const light = new THREE.RectAreaLight(0xffffff, 0, 1, 1);
    scene.add(light);
    return light;
  });

  const sky = new Sky();
  sky.scale.setScalar(1000); // box half-size 500 m, inside the camera far plane
  const skyUniforms = sky.material.uniforms;
  Object.assign(skyUniforms.turbidity, { value: 3.2 });
  Object.assign(skyUniforms.rayleigh, { value: 1.4 });
  Object.assign(skyUniforms.mieCoefficient, { value: 0.004 });
  Object.assign(skyUniforms.mieDirectionalG, { value: 0.8 });
  scene.add(sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environments = { warm: null, day: null };
  let warmBackground = null;
  const skyEnvironment = mode => {
    const preset = MODES[mode];
    skyUniforms.sunPosition.value.set(...preset.sunDir);
    const skyScene = new THREE.Scene();
    const clone = new Sky();
    clone.scale.setScalar(1000);
    for (const key of Object.keys(skyUniforms)) clone.material.uniforms[key].value = skyUniforms[key].value?.clone?.() ?? skyUniforms[key].value;
    skyScene.add(clone);
    const target = pmrem.fromScene(skyScene, 0, 0.1, 1000);
    clone.geometry.dispose();
    clone.material.dispose();
    return target;
  };
  environments.day = skyEnvironment('day');
  environments.warm = skyEnvironment('warm');
  const hdrPromise = hasAsset('sunset.hdr')
    ? new HDRLoader().loadAsync(assetUrl('sunset.hdr')).then(texture => {
      if (disposed) { texture.dispose(); return; }
      texture.mapping = THREE.EquirectangularReflectionMapping;
      warmBackground = texture;
      environments.warm?.dispose();
      environments.warm = pmrem.fromEquirectangular(texture);
      applyMode();
    }).catch(() => {})
    : Promise.resolve();

  scene.fog = new THREE.FogExp2(MODES.warm.fog, MODES.warm.fogDensity);

  // ---------------------------------------------------------------- post
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowEnd ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!lowEnd) {
    gtao = new SelectiveGTAOPass(scene, camera, 1, 1, transparent);
    gtao.blendIntensity = 0.9;
    gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.12, 0.45, 6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);

  // ---------------------------------------------------------------- probes
  const probeTarget = new THREE.WebGLCubeRenderTarget(lowEnd ? 128 : 256, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cubeCamera = new THREE.CubeCamera(0.05, 400, probeTarget);
  const captureProbes = mode => {
    const previous = scene.background;
    scene.background = mode === 'warm' && warmBackground ? warmBackground : null;
    sky.visible = !scene.background;
    lampPools.visible = false;
    // Luminaires are lit by the area-light pool; keep them out of the probes
    // so their light is not counted twice (direct + image-based).
    lib.scaleEmitters(0.06);
    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      if (site.env[mode]) continue;
      placeSiteLights(i);
      sites.forEach((other, j) => { other.group.visible = Math.abs(j - i) <= 1; });
      cubeCamera.position.set(site.x + site.room.probe[0], site.room.probe[1], site.room.probe[2]);
      renderer.shadowMap.needsUpdate = true;
      cubeCamera.update(renderer, scene);
      site.env[mode] = pmrem.fromCubemap(probeTarget.texture);
    }
    lib.scaleEmitters(1);
    scene.background = previous;
    lampPools.visible = true;
    lastSite = -1;
  };
  const applyProbes = () => {
    const mode = day ? 'day' : 'warm';
    for (const site of sites) if (site.env[mode]) lib.setRoomEnvironment(site.id, site.env[mode].texture, PROBE_INTENSITY);
  };

  function placeSiteLights(index) {
    const site = sites[index];
    const slots = site.room.lights.slice(0, RECT_POOL);
    rects.forEach((light, i) => {
      const slot = slots[i];
      if (!slot) { light.intensity = 0; return; }
      light.color.setHex(slot.color);
      light.intensity = slot.intensity;
      light.width = slot.width;
      light.height = slot.height;
      light.position.set(site.x + slot.position[0], slot.position[1], slot.position[2]);
      light.rotation.set(-Math.PI / 2, 0, 0);
    });
    const preset = MODES[day ? 'day' : 'warm'];
    const centre = new THREE.Vector3(site.x, 0, -site.depth / 2 + 4);
    sun.target.position.copy(centre);
    sun.position.copy(centre).addScaledVector(new THREE.Vector3(...preset.sunDir).normalize(), 120);
    sun.target.updateMatrixWorld();
    const span = Math.max(site.width, site.depth) * 0.75 + 10;
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span });
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  function applyMode() {
    const mode = day ? 'day' : 'warm';
    const preset = MODES[mode];
    sun.color.setHex(preset.sunColor);
    sun.intensity = preset.sunIntensity;
    skyUniforms.sunPosition.value.set(...preset.sunDir);
    const env = environments[mode];
    scene.environment = env?.texture || null;
    scene.environmentIntensity = preset.envIntensity;
    const useHdr = mode === 'warm' && warmBackground;
    scene.background = useHdr ? warmBackground : null;
    sky.visible = !useHdr;
    scene.backgroundIntensity = useHdr ? 0.55 : 1;
    // Rotate the HDR so its sun sits where the analytic sun casts shadows from.
    scene.backgroundRotation.y = scene.environmentRotation.y = useHdr ? HDR_ROTATION : 0;
    scene.fog.color.setHex(preset.fog);
    scene.fog.density = preset.fogDensity;
    lampPools.material.opacity = 0.55 * preset.lamps;
    lampPools.visible = preset.lamps > 0;
    setEmissive(lib.get('windowLit', 'world'), 2.4 * preset.windows + 0.4);
    setEmissive(lib.get('ledWarm', 'world'), 14 * Math.max(preset.lamps, 0.15));
    applyProbes();
    lastSite = -1;
    dirty = true;
    request();
  }

  // ---------------------------------------------------------------- loop
  const position = new THREE.Vector3();
  const look = new THREE.Vector3();
  const doorPoint = new THREE.Vector3();

  function nearestSite(x) {
    let best = 0;
    for (let i = 1; i < sites.length; i++) {
      if (Math.abs(x - sites[i].x) < Math.abs(x - sites[best].x)) best = i;
    }
    return best;
  }

  function request() {
    if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function readScroll() {
    target = clamp(window.scrollY / distance, 0, 1);
    dirty = true;
    request();
  }

  function readDistance() {
    distance = Math.max(1, Number(journey.dataset.distance) || journey.offsetHeight - window.innerHeight);
    readScroll();
  }

  function resize() {
    if (disposed) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    ratio = Math.min(ratio, maxRatio());
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    bloom.resolution.set(w * ratio / 2, h * ratio / 2);
    camera.aspect = w / h;
    // Vertical FOV for a ~24 mm lens on desktop, wider on portrait phones.
    camera.fov = w < 701 ? 66 : w / h < 1.3 ? 58 : 50;
    camera.updateProjectionMatrix();
    finish.uniforms.uAspect.value = w / h;
    readDistance();
  }

  function seek(event) {
    target = clamp(event.detail, 0, 1);
    value = target;
    velocity = 0;
    jump = true;
    dirty = true;
    request();
  }

  function visibility() {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { readScroll(); }
  }

  function tick(now) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.06) : 0.016;
    lastTime = now;
    if (jump) { value = target; velocity = 0; jump = false; } else {
      const next = springStep(value, velocity, target, dt);
      value = next.value;
      velocity = next.velocity;
    }
    const moving = value !== target;
    const keyed = route(value);
    position.set(keyed[0], keyed[1], keyed[2]);
    look.set(keyed[3], keyed[4], keyed[5]);
    camera.position.copy(position);
    camera.lookAt(look);

    const siteIndex = nearestSite(position.x);
    const site = sites[siteIndex];
    if (siteIndex !== lastSite) {
      lastSite = siteIndex;
      placeSiteLights(siteIndex);
    }
    sites.forEach((other, i) => { other.group.visible = Math.abs(i - siteIndex) <= 1 || Math.abs(position.x - other.x) < 110; });
    for (const s of sites) {
      for (const rig of s.room.doors) {
        doorPoint.setFromMatrixPosition(rig.matrixWorld);
        const d = Math.hypot(position.x - doorPoint.x, position.z - doorPoint.z);
        setDoorOpen(rig, 1 - smooth(d, 2.6, 6.5));
      }
    }
    // Eye adaptation: open up exposure indoors.
    const preset = MODES[day ? 'day' : 'warm'];
    const inside = smooth(-position.z, 0.2, 2.4) * (Math.abs(position.x - site.x) < site.width / 2 ? 1 : 0);
    renderer.toneMappingExposure = preset.exposure * THREE.MathUtils.lerp(1, preset.insideBoost, inside);
    finish.uniforms.uTime.value = (now % 10000) / 1000;

    const start = performance.now();
    try {
      composer.render(dt);
    } catch (error) {
      console.error('Purefitness rendering failed', error);
      options.onError();
      return;
    }
    const cost = performance.now() - start;
    options.onProgress?.(value);
    if (!ready && loadedEnough) { ready = true; options.onReady(); }
    dirty = false;
    // Adaptive resolution: step down while scrolling if frames are slow.
    if (moving) {
      sampleFrames++;
      if (cost > 22 || dt > 0.034) slowFrames++;
      if (sampleFrames >= 45) {
        if (slowFrames > 20 && ratio > maxRatio() * 0.6) {
          ratio = Math.max(maxRatio() * 0.6, ratio - 0.15);
          resize();
        }
        sampleFrames = 0;
        slowFrames = 0;
      }
    }
    if (moving || dirty) request(); else lastTime = 0;
  }

  function contextLost(event) {
    event.preventDefault();
    disposed = true;
    cancelAnimationFrame(frame);
    options.onError();
  }

  // ---------------------------------------------------------------- start
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('pf-route-resize', readDistance);
  window.addEventListener('pf-seek', seek);
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);

  const fonts = loadFonts().then(() => signs.forEach(sign => sign.userData.redraw()));
  const fallback = window.setTimeout(() => { loadedEnough = true; dirty = true; request(); }, 6000);
  Promise.allSettled([lib.ready(), hdrPromise, fonts]).then(async () => {
    if (disposed) return;
    applyMode();
    captureProbes(day ? 'day' : 'warm');
    applyMode();
    try { await renderer.compileAsync(scene, camera); } catch { /* compile lazily */ }
    if (disposed) return;
    window.clearTimeout(fallback);
    loadedEnough = true;
    dirty = true;
    request();
  });
  applyMode();
  resize();
  value = target;
  request();

  return {
    setLightMode(isDay) {
      day = Boolean(isDay);
      if (loadedEnough) captureProbes(day ? 'day' : 'warm');
      applyMode();
    },
    setReduced() { dirty = true; request(); },
    // Internals for the local dev harness only.
    debug: options.debug && { scene, renderer, composer, bloom, gtao, lib, sites, camera, sun, rects, render: () => { dirty = true; request(); } },
    dispose() {
      disposed = true;
      window.clearTimeout(fallback);
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', readScroll);
      window.removeEventListener('pf-route-resize', readDistance);
      window.removeEventListener('pf-seek', seek);
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(object => {
        if (object.isMesh) {
          object.geometry.dispose();
          const map = object.material.map;
          if (map?.isCanvasTexture) map.dispose();
        }
      });
      lib.dispose();
      disposeGeometryCache();
      for (const site of sites) for (const env of Object.values(site.env)) env?.dispose();
      environments.warm?.dispose();
      environments.day?.dispose();
      warmBackground?.dispose();
      probeTarget.dispose();
      pmrem.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      lampPools.geometry.dispose();
      lampPools.material.map?.dispose();
      lampPools.material.dispose();
      sun.shadow.dispose();
      composer.dispose();
      gtao?.dispose();
      bloom.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function setEmissive(material, value) {
  material.userData.baseEmissive = value;
  material.emissiveIntensity = value;
}

/** Additive pools of warm light under street lamps (visible at golden hour). */
function makeLampPools(lamps) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,196,130,1)');
  g.addColorStop(0.4, 'rgba(255,170,100,0.35)');
  g.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const geometries = lamps.map(([x, , z]) => new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2).translate(x, 0.012, z - 0.5));
  const merged = geometries.length ? mergeAll(geometries) : new THREE.PlaneGeometry(0, 0);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true, fog: true });
  const mesh = new THREE.Mesh(merged, material);
  mesh.renderOrder = 1;
  return mesh;
}

function mergeAll(geometries) {
  const positions = [];
  const uvs = [];
  const indices = [];
  let offset = 0;
  for (const geometry of geometries) {
    positions.push(...geometry.attributes.position.array);
    uvs.push(...geometry.attributes.uv.array);
    indices.push(...Array.from(geometry.index.array, i => i + offset));
    offset += geometry.attributes.position.count;
    geometry.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);
  return merged;
}

async function loadFonts() {
  if (!('FontFace' in window)) return;
  const faces = [['manrope-800.woff', '800'], ['manrope-500.woff', '500']].filter(([file]) => hasAsset(file));
  await Promise.allSettled(faces.map(async ([file, weight]) => {
    const face = new FontFace('Manrope', `url(${assetUrl(file)})`, { weight });
    await face.load();
    document.fonts.add(face);
  }));
}
