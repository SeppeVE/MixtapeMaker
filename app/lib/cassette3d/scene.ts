import {
  ACESFilmicToneMapping,
  Color,
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
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Renderer, camera, lights, environment, resize handling and the render loop
 * for the 3D library. Framework-free: the Vue side talks to it only through
 * the returned CassetteScene handle (see useCassetteScene).
 *
 * Units: 1 scene unit = 1 cm.
 */

export type SceneStatus = 'ready' | 'contextLost';

export interface CassetteSceneOptions {
  onStatus?: (status: SceneStatus) => void;
}

export interface CassetteScene {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  keyLight: DirectionalLight;
  /** Called every frame before rendering, with the frame delta in seconds. */
  onFrame: (fn: (dt: number) => void) => () => void;
  /** Called after the canvas and camera have been resized. */
  onResize: (fn: () => void) => () => void;
  dispose: () => void;
}

const MAX_PIXEL_RATIO = 2;
const BACKGROUND = '#1b1714';

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

  const scene = new Scene();
  scene.background = new Color(BACKGROUND);

  // Near plane well out: the J-card sits millimetres behind the plastic, which needs the depth precision.
  const camera = new PerspectiveCamera(35, 1, 1, 400);
  camera.position.set(0, 14, 34);
  camera.lookAt(0, 2, 0);

  // Image-based lighting. RoomEnvironment is a stand-in until Stage 6 swaps in an HDRI.
  let envTarget: WebGLRenderTarget | null = null;
  function buildEnvironment() {
    envTarget?.dispose();
    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    envTarget = pmrem.fromScene(room, 0.04);
    scene.environment = envTarget.texture;
    room.dispose();
    pmrem.dispose();
  }
  buildEnvironment();
  scene.environmentIntensity = 0.6;

  const hemi = new HemisphereLight('#fff4e6', '#2a2019', 0.35);
  scene.add(hemi);

  const keyLight = new DirectionalLight('#fff1dc', 2.2);
  keyLight.position.set(18, 30, 16);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.radius = 4;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  // Tight around the hero case, so its shadow stays crisp. Stage 4 widens this for the shelf.
  const sc = keyLight.shadow.camera;
  sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12;
  sc.near = 20; sc.far = 60;
  scene.add(keyLight);

  // Shadow-catcher floor: invisible except where shadows land.
  const floor = new Mesh(new PlaneGeometry(200, 200), new ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

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
  // targets lose their contents, so the environment map is rebuilt. Stage 7
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
  let disposed = false;
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
    disposeObjectTree(scene);
    scene.environment = null;
    envTarget?.dispose();
    envTarget = null;
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

/** Dispose every geometry, material and material texture under `root`, and detach its children. */
export function disposeObjectTree(root: Object3D) {
  root.traverse((obj) => {
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
