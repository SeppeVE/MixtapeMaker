import {
  Color,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

/**
 * Contact shadows under the hero tape (Stage 6): the soft dark band where a case
 * stands on the table, which the key light's shadow map is too coarse to give.
 *
 * An orthographic camera on the floor looks straight up and renders the subject
 * with a material whose darkness falls off with height (0 at `far` cm up), into a
 * small render target. That's blurred twice and shown on a plane just above the
 * floor. The same idea as drei's ContactShadows.
 *
 * It only re-renders when the subject moved, so a tape resting on the turntable
 * costs nothing. Everything else in the scene is hidden while it renders.
 */

export const CONTACT_SHADOWS = {
  /** Area covered, cm (centred on the turntable). Wide enough for the cassette lying beside the card. */
  width: 32,
  depth: 24,
  resolution: 512,
  /** How far above the floor something still casts, cm. */
  far: 2.5,
  /** Darkness of the shadow right at the floor. */
  darkness: 1.4,
  opacity: 0.75,
  /** Blur radius (in render target pixels, roughly). */
  blur: 2.4,
};

export interface ContactShadows {
  /** The plane showing the shadows (added to the scene by scene.ts). */
  root: Mesh;
  /** What casts them (the hero turntable), or null for none. */
  setSubject: (subject: Object3D | null) => void;
  /** Re-render if the subject moved. Called every frame before the main render. */
  update: (scene: Scene) => void;
  /** Force a re-render on the next update (e.g. after a tuning change). */
  invalidate: () => void;
  dispose: () => void;
}

export function createContactShadows(renderer: WebGLRenderer): ContactShadows {
  const c = CONTACT_SHADOWS;
  const opts = { type: HalfFloatType };
  const target = new WebGLRenderTarget(c.resolution, c.resolution, opts);
  const blurTarget = new WebGLRenderTarget(c.resolution, c.resolution, opts);
  target.texture.generateMipmaps = blurTarget.texture.generateMipmaps = false;

  // Looking straight up from the floor: screen +x = world +X, screen +y = world +Z.
  const camera = new OrthographicCamera(-c.width / 2, c.width / 2, c.depth / 2, -c.depth / 2, 0, c.far);
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 1, 0);
  camera.updateMatrixWorld();

  // Black, with alpha fading from `darkness` at the floor to 0 at `far` up.
  const depthMaterial = new MeshDepthMaterial();
  depthMaterial.userData.darkness = { value: c.darkness };
  depthMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = depthMaterial.userData.darkness;
    shader.fragmentShader = 'uniform float darkness;\n' + shader.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.0 ), clamp( ( 1.0 - fragCoordZ ) * darkness, 0.0, 1.0 ) );',
    );
  };

  const hBlur = new ShaderMaterial({ ...HorizontalBlurShader, uniforms: { tDiffuse: { value: null }, h: { value: 0 } }, depthTest: false });
  const vBlur = new ShaderMaterial({ ...VerticalBlurShader, uniforms: { tDiffuse: { value: null }, v: { value: 0 } }, depthTest: false });
  const quad = new FullScreenQuad();

  const geometry = new PlaneGeometry(c.width, c.depth);
  // Lying flat facing up, its v running towards +Z like the camera's screen y.
  geometry.rotateX(-Math.PI / 2);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const material = new MeshBasicMaterial({
    map: target.texture,
    transparent: true,
    opacity: c.opacity,
    depthWrite: false,
  });
  const plane = new Mesh(geometry, material);
  plane.name = 'contactShadows';
  plane.position.y = 0.004;
  plane.renderOrder = -1;
  plane.visible = false;

  let subject: Object3D | null = null;
  let lastSignature = NaN;
  const hidden: Object3D[] = [];
  const clear = new Color();

  function blur(amount: number) {
    hBlur.uniforms.tDiffuse!.value = target.texture;
    hBlur.uniforms.h!.value = amount / c.resolution;
    quad.material = hBlur;
    renderer.setRenderTarget(blurTarget);
    quad.render(renderer);
    vBlur.uniforms.tDiffuse!.value = blurTarget.texture;
    vBlur.uniforms.v!.value = amount / c.resolution;
    quad.material = vBlur;
    renderer.setRenderTarget(target);
    quad.render(renderer);
  }

  /** Cheap fingerprint of every visible mesh's world pose under the subject. */
  function signature(root: Object3D): number {
    let sum = 0;
    let k = 1;
    root.traverseVisible((obj) => {
      const e = obj.matrixWorld.elements;
      for (let i = 0; i < 16; i++) sum += e[i]! * (k + i * 0.618);
      k += 1.37;
    });
    return sum;
  }

  function render(scene: Scene, top: Object3D) {
    for (const child of scene.children) {
      if (child !== top && child.visible) {
        child.visible = false;
        hidden.push(child);
      }
    }
    const background = scene.background;
    const override = scene.overrideMaterial;
    const previousTarget = renderer.getRenderTarget();
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(clear);
    const shadowAuto = renderer.shadowMap.autoUpdate;

    scene.background = null;
    scene.overrideMaterial = depthMaterial;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    blur(c.blur);
    blur(c.blur * 0.4);

    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(clear, previousAlpha);
    renderer.shadowMap.autoUpdate = shadowAuto;
    scene.overrideMaterial = override;
    scene.background = background;
    for (const child of hidden) child.visible = true;
    hidden.length = 0;
  }

  return {
    root: plane,
    setSubject(next) {
      subject = next;
      lastSignature = NaN;
    },
    update(scene) {
      const on = !!subject && subject.visible && c.opacity > 0;
      plane.visible = on;
      if (!on || !subject) return;
      let top = subject;
      while (top.parent && top.parent !== scene) top = top.parent;
      if (top.parent !== scene) {
        plane.visible = false;
        return;
      }
      subject.updateWorldMatrix(true, true);
      const sig = signature(subject);
      material.opacity = c.opacity;
      if (sig === lastSignature) return;
      lastSignature = sig;
      depthMaterial.userData.darkness.value = c.darkness;
      camera.far = c.far;
      camera.updateProjectionMatrix();
      render(scene, top);
    },
    invalidate() {
      lastSignature = NaN;
    },
    dispose() {
      subject = null;
      plane.removeFromParent();
      target.dispose();
      blurTarget.dispose();
      depthMaterial.dispose();
      hBlur.dispose();
      vBlur.dispose();
      quad.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
