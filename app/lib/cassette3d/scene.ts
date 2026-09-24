import {
  ACESFilmicToneMapping,
  Color,
  type DataTexture,
  EquirectangularReflectionMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
  type Material,
  type Object3D,
  type WebGLRenderTarget,
  Vector3,
} from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createContactShadows, type ContactShadows } from './contactShadows';

/**
 * Renderer, camera, lights, environment, resize handling and the render loop
 * for the 3D library. Framework-free: the Vue side talks to it only through
 * the returned CassetteScene handle (see useCassetteScene).
 *
 * Units: 1 scene unit = 1 cm.
 */

export type SceneStatus = 'ready' | 'contextLost';

/**
 * Studio HDRI for the image-based lighting: a CC0 Poly Haven studio, 512 × 256
 * EXR (DWAB), taken from @pmndrs/assets (see public/3d/CREDITS.md). ~110 kB.
 */
export const HDRI_URL = '/3d/hdri/studio.exr';

export interface CassetteSceneOptions {
  onStatus?: (status: SceneStatus) => void;
}

export interface CassetteScene {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  keyLight: DirectionalLight;
  /** Where the key light shines from, relative to its focus (debug GUI edits this). */
  keyOffset: Vector3;
  /** Soft contact shadows under the hero tape (its turntable is handed over with setSubject). */
  contactShadows: ContactShadows;
  /**
   * Resolves once the environment map is in: 'hdri' when the studio HDRI loaded,
   * 'room' when it couldn't and RoomEnvironment stands in.
   */
  environmentReady: Promise<'hdri' | 'room'>;
  /**
   * Centre the key light's shadow on a point, covering a square of `halfSize` cm
   * either way: tight round the hero tape, wide over the shelf.
   */
  setShadowFocus: (x: number, y: number, z: number, halfSize: number) => void;
  /** Called every frame before rendering, with the frame delta in seconds. */
  onFrame: (fn: (dt: number) => void) => () => void;
  /** Called after the canvas and camera have been resized. */
  onResize: (fn: () => void) => () => void;
  dispose: () => void;
}

const MAX_PIXEL_RATIO = 2;
const BACKGROUND = '#1b1714';
const DEG = Math.PI / 180;
/** Environment tuning (the debug GUI edits scene.environmentIntensity / environmentRotation live). */
export const ENVIRONMENT = { intensity: 0.6, rotationDeg: 0 };

/** Throws when WebGL2 isn't available, since three.js no longer supports WebGL1. */
export function createCassetteScene(container: HTMLElement, options: CassetteSceneOptions = {}): CassetteScene {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap was removed in r18x; PCFShadowMap is now the soft, filtered option.
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  let disposed = false;
  const scene = new Scene();
  scene.background = new Color(BACKGROUND);

  // Near plane well out: the J-card sits millimetres behind the plastic, which needs the depth precision.
  const camera = new PerspectiveCamera(35, 1, 1, 400);
  camera.position.set(0, 14, 34);
  camera.lookAt(0, 2, 0);

  // Image-based lighting from a studio HDRI (Stage 6), prefiltered with PMREM.
  // RoomEnvironment only stands in if the file can't be loaded.
  let envTarget: WebGLRenderTarget | null = null;
  let hdri: DataTexture | null = null;
  function buildEnvironment() {
    envTarget?.dispose();
    const pmrem = new PMREMGenerator(renderer);
    if (hdri) {
      envTarget = pmrem.fromEquirectangular(hdri);
    } else {
      const room = new RoomEnvironment();
      envTarget = pmrem.fromScene(room, 0.04);
      room.dispose();
    }
    scene.environment = envTarget.texture;
    pmrem.dispose();
  }
  const environmentReady = new EXRLoader().loadAsync(HDRI_URL).then(
    (texture) => {
      if (disposed) {
        texture.dispose();
        return 'hdri' as const;
      }
      texture.mapping = EquirectangularReflectionMapping;
      hdri = texture;
      buildEnvironment();
      return 'hdri' as const;
    },
    (err) => {
      console.warn('[cassette3d] Studio HDRI failed to load, using RoomEnvironment', err);
      if (!disposed) buildEnvironment();
      return 'room' as const;
    },
  );
  scene.environmentIntensity = ENVIRONMENT.intensity;
  // Turn the studio so its big softbox sits up and to the left of the camera.
  scene.environmentRotation.set(0, ENVIRONMENT.rotationDeg * DEG, 0);

  const hemi = new HemisphereLight('#fff4e6', '#2a2019', 0.35);
  scene.add(hemi);

  const keyLight = new DirectionalLight('#fff1dc', 2.2);
  const keyOffset = new Vector3(18, 30, 16);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.radius = 4;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  scene.add(keyLight.target);
  // The shadow camera follows a focus: tight round the hero case, so its shadow
  // stays crisp, and wide over the part of the shelf in view.
  const lastFocus = { x: NaN, y: NaN, z: NaN, s: NaN, ox: NaN, oy: NaN, oz: NaN };
  function setShadowFocus(x: number, y: number, z: number, halfSize: number) {
    const f = lastFocus;
    if (f.x === x && f.y === y && f.z === z && f.s === halfSize && f.ox === keyOffset.x && f.oy === keyOffset.y && f.oz === keyOffset.z) return;
    Object.assign(lastFocus, { x, y, z, s: halfSize, ox: keyOffset.x, oy: keyOffset.y, oz: keyOffset.z });
    const dist = 60 + 2 * halfSize;
    keyLight.target.position.set(x, y, z);
    keyLight.position.copy(keyOffset).setLength(dist).add(keyLight.target.position);
    const sc = keyLight.shadow.camera;
    sc.left = -halfSize; sc.right = halfSize; sc.top = halfSize; sc.bottom = -halfSize;
    sc.near = dist - halfSize - 25;
    sc.far = dist + halfSize + 25;
    sc.updateProjectionMatrix();
  }
  setShadowFocus(0, 0, 0, 12);

  // Shadow-catcher floor: invisible except where shadows land.
  const floor = new Mesh(new PlaneGeometry(200, 200), new ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  const contactShadows = createContactShadows(renderer);
  scene.add(contactShadows.root);

  // --- Resize ---------------------------------------------------------------
  const resizeCallbacks = new Set<() => void>();
  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    for (const fn of resizeCallbacks) fn();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // --- Render loop (paused while the tab is hidden or the context is lost) --
  const frameCallbacks = new Set<(dt: number) => void>();
  let lastTime = performance.now();
  let contextLost = false;
  let running = false;

  function frame(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    for (const fn of frameCallbacks) fn(dt);
    contactShadows.update(scene);
    renderer.render(scene, camera);
  }
  function syncLoop() {
    const shouldRun = !document.hidden && !contextLost;
    if (shouldRun === running) return;
    running = shouldRun;
    lastTime = performance.now();
    renderer.setAnimationLoop(shouldRun ? frame : null);
  }
  document.addEventListener('visibilitychange', syncLoop);
  syncLoop();

  // --- Context loss -----------------------------------------------------------
  // three.js re-uploads geometries and textures itself after a restore; render
  // targets lose their contents, so the environment map is rebuilt (from the
  // HDRI still held on the CPU). Stage 7
  // replaces this with a full scene rebuild.
  function onContextLost(e: Event) {
    e.preventDefault();
    contextLost = true;
    syncLoop();
    options.onStatus?.('contextLost');
  }
  function onContextRestored() {
    contextLost = false;
    buildEnvironment();
    syncLoop();
    options.onStatus?.('ready');
  }
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  // --- Dispose ----------------------------------------------------------------
  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    document.removeEventListener('visibilitychange', syncLoop);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    resizeObserver.disconnect();
    frameCallbacks.clear();
    resizeCallbacks.clear();

    disposeTransmissionTargets(renderer, scene);
    contactShadows.dispose();
    disposeObjectTree(scene);
    scene.environment = null;
    envTarget?.dispose();
    envTarget = null;
    hdri?.dispose();
    hdri = null;
    // LightShadow.dispose() frees the shadow render target but not its depth texture.
    keyLight.shadow.map?.depthTexture?.dispose();
    keyLight.shadow.dispose();

    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  return {
    renderer,
    scene,
    camera,
    keyLight,
    keyOffset,
    contactShadows,
    environmentReady,
    setShadowFocus,
    onFrame(fn) {
      frameCallbacks.add(fn);
      return () => frameCallbacks.delete(fn);
    },
    onResize(fn) {
      resizeCallbacks.add(fn);
      return () => resizeCallbacks.delete(fn);
    },
    dispose,
  };
}

/**
 * three.js keeps the render target for transmissive materials (the clear case) in
 * its internal render state and never disposes it, not even in renderer.dispose().
 * It's reachable through the materials' transmission sampler uniform.
 */
function disposeTransmissionTargets(renderer: WebGLRenderer, root: Object3D) {
  const targets = new Set<{ dispose: () => void }>();
  root.traverse((obj) => {
    const material = (obj as Mesh).material as Material | Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      const uniforms = (renderer.properties.get(m) as { uniforms?: Record<string, { value: unknown }> }).uniforms;
      const texture = uniforms?.transmissionSamplerMap?.value as Texture | null | undefined;
      if (texture?.renderTarget) targets.add(texture.renderTarget);
    }
  });
  targets.forEach((t) => t.dispose());
}

/**
 * Dispose every geometry, material and material texture under `root`, and detach
 * its children. Materials listed in an object's `userData.ownedMaterials` go too,
 * whether or not a mesh is wearing them right now.
 */
export function disposeObjectTree(root: Object3D) {
  root.traverse((obj) => {
    for (const m of (obj.userData.ownedMaterials as Material[] | undefined) ?? []) disposeMaterial(m);
    const mesh = obj as Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as Material | Material[] | undefined;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) disposeMaterial(m);
  });
  root.clear();
}

function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose();
  }
  material.dispose();
}
