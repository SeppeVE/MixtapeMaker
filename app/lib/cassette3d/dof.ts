import {
  DepthTexture,
  HalfFloatType,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  ACESFilmicToneMapping,
  Color,
  Matrix3,
  Vector3,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/**
 * Subtle depth of field for the high tier (Stage 7), desktop only.
 *
 * The scene renders once into a multisampled half-float target with a depth
 * texture; a single full-screen pass onto the canvas blurs each pixel by how
 * far its depth is from the focus distance (a small disc gather), and applies
 * the tone mapping and sRGB output the canvas would have.
 *
 * The background colour needs care: rendering straight to the canvas, three
 * clears to it without tone mapping, but here it goes through the tone curve
 * with everything else (the floor, a see-through shadow catcher, sits on it), and
 * ACES darkens it to near black. So for this render the background is swapped
 * for the colour that the curve turns back into the real one. three's
 * BokehPass would render the whole scene a second time for depth; this reads
 * the depth the first render left behind.
 *
 * It only runs while a tape is off the shelf (the caller gives it a focus
 * distance); on the shelf the scene renders straight to the canvas as before.
 */

export const DOF = {
  /** Blur radius, in pixels at 1080p, for something far out of focus. */
  maxBlur: 5,
  /** How fast blur grows with distance from the focus (per cm, relative to the focus distance). */
  aperture: 2.2,
  /** Depth range around the focus that stays sharp, cm. */
  sharpRange: 4,
};

export interface DepthOfField {
  /** Render the scene with DOF focused `focus` cm from the camera; `strength` 0–1 scales the blur. */
  render: (focus: number, strength: number) => void;
  setSize: (width: number, height: number) => void;
  dispose: () => void;
}

const TAPS = 16;

export function createDepthOfField(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): DepthOfField {
  const size = renderer.getDrawingBufferSize(new Vector2());
  const target = new WebGLRenderTarget(size.x, size.y, {
    type: HalfFloatType,
    samples: 4,
    depthTexture: new DepthTexture(size.x, size.y),
  });

  // Disc of taps (golden-angle spiral), baked into the shader.
  const taps: string[] = [];
  for (let i = 0; i < TAPS; i++) {
    const r = Math.sqrt((i + 0.5) / TAPS);
    const a = i * 2.39996;
    taps.push(`vec2(${(Math.cos(a) * r).toFixed(4)}, ${(Math.sin(a) * r).toFixed(4)})`);
  }

  const material = new ShaderMaterial({
    uniforms: {
      tColor: { value: target.texture },
      tDepth: { value: target.depthTexture },
      resolution: { value: new Vector2(size.x, size.y) },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      focus: { value: 30 },
      aperture: { value: DOF.aperture },
      sharpRange: { value: DOF.sharpRange },
      maxBlur: { value: DOF.maxBlur },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform vec2 resolution;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform float focus;
      uniform float aperture;
      uniform float sharpRange;
      uniform float maxBlur;
      varying vec2 vUv;
      const vec2 TAPS[${TAPS}] = vec2[${TAPS}](${taps.join(', ')});

      float viewDepth(vec2 uv) {
        float d = texture2D(tDepth, uv).x;
        return -perspectiveDepthToViewZ(d, cameraNear, cameraFar);
      }
      // Circle of confusion in pixels: nothing within sharpRange of the focus, then growing.
      float coc(float z) {
        float off = max(abs(z - focus) - sharpRange, 0.0) / focus;
        return clamp(off * aperture, 0.0, 1.0) * maxBlur * resolution.y / 1080.0;
      }
      void main() {
        float depth = texture2D(tDepth, vUv).x;
        float centreCoc = coc(-perspectiveDepthToViewZ(depth, cameraNear, cameraFar));
        vec4 sum = texture2D(tColor, vUv);
        float weight = 1.0;
        // Under a pixel of blur, leave it sharp.
        if (centreCoc > 1.0) {
          for (int i = 0; i < ${TAPS}; i++) {
            vec2 uv = vUv + TAPS[i] * centreCoc / resolution;
            // A sharp foreground doesn't bleed into the blurred background behind it.
            float w = step(0.5 * centreCoc, coc(viewDepth(uv)) + 0.5);
            sum += texture2D(tColor, uv) * w;
            weight += w;
          }
        }
        vec3 color = sum.rgb / weight;
        #ifdef TONE_MAPPING
          if (depth < 1.0) color = toneMapping(color);
        #endif
        gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new FullScreenQuad(material);
  const compensated = { from: new Color(NaN, NaN, NaN), exposure: NaN, to: new Color() };

  return {
    render(focus, strength) {
      const previous = renderer.getRenderTarget();
      const background = scene.background;
      if (background instanceof Color && renderer.toneMapping === ACESFilmicToneMapping) {
        if (!compensated.from.equals(background) || compensated.exposure !== renderer.toneMappingExposure) {
          compensated.from.copy(background);
          compensated.exposure = renderer.toneMappingExposure;
          inverseACES(background, renderer.toneMappingExposure, compensated.to);
        }
        scene.background = compensated.to;
      }
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      scene.background = background;
      material.uniforms.focus!.value = focus;
      material.uniforms.aperture!.value = DOF.aperture;
      material.uniforms.sharpRange!.value = DOF.sharpRange;
      material.uniforms.maxBlur!.value = DOF.maxBlur * strength;
      material.uniforms.cameraNear!.value = camera.near;
      material.uniforms.cameraFar!.value = camera.far;
      // Onto the canvas, where three adds the tone mapping and sRGB defines to the shader.
      renderer.setRenderTarget(null);
      quad.render(renderer);
      renderer.setRenderTarget(previous);
    },
    setSize(width, height) {
      target.setSize(width, height);
      (material.uniforms.resolution!.value as Vector2).set(width, height);
    },
    dispose() {
      // RenderTarget.dispose() leaves its depth texture.
      target.depthTexture?.dispose();
      target.dispose();
      material.dispose();
      quad.dispose();
    },
  };
}

// --- Inverse of three's ACESFilmicToneMapping (tonemapping_pars_fragment) ------------------

// Row by row (the GLSL constructors list columns).
const ACES_IN = new Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const ACES_OUT = new Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const ACES_IN_INV = ACES_IN.clone().invert();
const ACES_OUT_INV = ACES_OUT.clone().invert();

/** The colour (linear) that ACES tone mapping at `exposure` turns into `target` (linear). */
export function inverseACES(target: Color, exposure: number, out: Color): Color {
  const v = new Vector3(target.r, target.g, target.b).applyMatrix3(ACES_OUT_INV);
  // RRTAndODTFit(x) = (x(x + a) − b) / (x(c·x + d) + e), solved for x.
  const fit = (u: number) => {
    const A = 1 - 0.983729 * u;
    const B = 0.0245786 - 0.432951 * u;
    const C = -(0.000090537 + 0.238081 * u);
    return (-B + Math.sqrt(Math.max(B * B - 4 * A * C, 0))) / (2 * A);
  };
  v.set(fit(v.x), fit(v.y), fit(v.z)).applyMatrix3(ACES_IN_INV).multiplyScalar(0.6 / exposure);
  return out.setRGB(Math.max(v.x, 0), Math.max(v.y, 0), Math.max(v.z, 0));
}
