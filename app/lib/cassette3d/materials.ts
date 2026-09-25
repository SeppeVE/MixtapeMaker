import {
  Color,
  CustomBlending,
  DoubleSide,
  OneFactor,
  OneMinusSrcAlphaFactor,
  FrontSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Vector2,
  type Material,
  type Texture,
} from 'three';
import { CASSETTE, JCARD } from './dimensions';
import type { PlasticMode } from './quality';
import { PAPER_TILE_CM, SCUFF_TILE_CM, type PaperGrain } from './textures/surfaceTextures';

/**
 * Shared materials for the tape objects. Every tape gets its own set from
 * createTapeMaterials() so they can be disposed together with the tape.
 */

export type CaseTint = 'clear' | 'smoke';

/** Surface detail tuning (Stage 6); the debug GUI edits it live. */
export const SURFACE = {
  /** Roughness of the case plastic where the scuff mask is fully on (scratches, fingerprints). */
  scuffRoughness: 0.5,
  /**
   * How much light a scratch scatters back, as a share of a white matte surface's.
   * Scratches and prints show because their broken surface catches light from all
   * round, which roughness alone doesn't give a clear material.
   */
  scuffScatter: 0.018,
  /** Strength of the paper grain's normal map. */
  paperNormal: 0.35,
};

/** Procedural maps the tape's materials use (textures/surfaceTextures.ts). */
export interface SurfaceMaps {
  scuffs: Texture;
  grain: PaperGrain;
}

export interface TapeMaterials {
  /** Clear (or smoky) polystyrene of the case. */
  casePlastic: MeshPhysicalMaterial;
  /** Satin black cassette shell. */
  shell: MeshStandardMaterial;
  /** Slightly glossier shell parts (the raised trapezoid). */
  shellGloss: MeshStandardMaterial;
  /** Clear window panes of the cassette. Transparent rather than transmissive, so they still show through the case. */
  windowPane: MeshPhysicalMaterial;
  /** White hubs. */
  hub: MeshStandardMaterial;
  /** Brown oxide tape. */
  tape: MeshStandardMaterial;
  /** Screws. */
  screw: MeshStandardMaterial;
  /** Cassette label paper (Stage 2 gives it a texture). */
  label: MeshStandardMaterial;
  /** J-card stock (Stage 2 gives it the printed texture). */
  paper: MeshStandardMaterial;
}

/**
 * Every material of one tape. With `surfaces`, the case plastic gets its scuffs and
 * the J-card and label paper their grain; the materials own those textures then
 * (disposeObjectTree frees them with the tape).
 */
export function createTapeMaterials(tint: CaseTint = 'clear', surfaces?: SurfaceMaps): TapeMaterials {
  const casePlastic = createCasePlasticMaterial(tint);
  if (surfaces) addCaseScuffs(casePlastic, surfaces.scuffs);
  const label = new MeshStandardMaterial({ name: 'label', color: '#e2dccd', roughness: 0.85, metalness: 0 });
  const paper = new MeshStandardMaterial({ name: 'paper', color: '#e4dfd3', roughness: 0.82, metalness: 0 });
  if (surfaces) {
    // Plain paper faces are a whole panel (UV 0–1); an average panel's size sets the grain scale.
    const plain = { normal: surfaces.grain.normal, roughness: surfaces.grain.roughness };
    applyPaperGrain(paper, plain, JCARD.flaps[0]!, JCARD.height, false);
    const labelGrain = { normal: plain.normal.clone(), roughness: plain.roughness.clone() };
    applyPaperGrain(label, labelGrain, CASSETTE.label.width, CASSETTE.label.top - CASSETTE.label.bottom, false);
  }
  return {
    casePlastic,
    shell: new MeshStandardMaterial({ name: 'shell', color: '#141414', roughness: 0.5, metalness: 0 }),
    shellGloss: new MeshStandardMaterial({ name: 'shellGloss', color: '#161616', roughness: 0.32, metalness: 0 }),
    windowPane: new MeshPhysicalMaterial({
      name: 'windowPane',
      color: '#d8d4cc',
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: DoubleSide,
      specularIntensity: 1,
    }),
    hub: new MeshStandardMaterial({ name: 'hub', color: '#e9e6df', roughness: 0.45, metalness: 0 }),
    tape: new MeshStandardMaterial({ name: 'tape', color: '#3a2317', roughness: 0.35, metalness: 0.1 }),
    screw: new MeshStandardMaterial({ name: 'screw', color: '#8d8d8f', roughness: 0.35, metalness: 1 }),
    label,
    paper,
  };
}

/**
 * Case scuffs: the mask is projected onto each part along its dominant axis in
 * object space (the case's parts are built in the case frame), so it lands at the
 * same scale on every face without caring about their UVs. Where the mask is on,
 * the roughness goes up to SURFACE.scuffRoughness: scratches and prints show in
 * the highlights and blur the J-card behind them a touch, and vanish elsewhere.
 */
function addCaseScuffs(material: MeshPhysicalMaterial, scuffs: Texture) {
  // In the roughnessMap slot so it's disposed with the material; the lookup is replaced below.
  material.roughnessMap = scuffs;
  const scuffRoughness = { value: SURFACE.scuffRoughness };
  const scuffScatter = { value: SURFACE.scuffScatter };
  material.onBeforeRender = () => {
    scuffRoughness.value = SURFACE.scuffRoughness;
    scuffScatter.value = SURFACE.scuffScatter;
  };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.scuffRoughness = scuffRoughness;
    shader.uniforms.scuffScatter = scuffScatter;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vScuffPos;\nvarying vec3 vScuffNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvScuffPos = position;\nvScuffNormal = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vScuffPos;\nvarying vec3 vScuffNormal;\nuniform float scuffRoughness;\nuniform float scuffScatter;')
      .replace('#include <roughnessmap_fragment>', `
        vec3 scuffDir = normalize(vScuffNormal);
        vec3 scuffAbs = abs(scuffDir);
        vec2 scuffUv = scuffAbs.z >= max(scuffAbs.x, scuffAbs.y) ? vScuffPos.xy
          : (scuffAbs.x >= scuffAbs.y ? vScuffPos.zy : vScuffPos.xz);
        // The back of the tray gets a different patch of the mask than the lid.
        scuffUv += scuffDir.z < -0.5 ? vec2(3.7, 5.1) : vec2(0.0);
        #ifdef NO_SCUFFS
          float scuff = 0.0;
        #else
          float scuff = texture2D(roughnessMap, scuffUv / ${SCUFF_TILE_CM.toFixed(1)} + 0.5).g;
        #endif
        float roughnessFactor = mix(roughness, scuffRoughness, scuff);
      `)
      // Scattered light from the environment and the key light, added on top: on a clear
      // material the diffuse term is replaced by what's seen through it.
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        #ifndef NO_SCUFFS
        {
          // Both as irradiance / π, like a Lambertian surface would return.
          vec3 scatterLight = iblIrradiance * RECIPROCAL_PI;
          #if NUM_DIR_LIGHTS > 0
            scatterLight += directionalLights[0].color * saturate(dot(normal, directionalLights[0].direction)) * RECIPROCAL_PI;
          #endif
          #ifdef BLENDED_PLASTIC
            // Without transmission nothing behind is blurred by the scratch, and its light
            // lands straight on the card: a lighter touch reads the same.
            scatterLight *= 0.4;
          #endif
          reflectedLight.indirectSpecular += scuff * scuffScatter * scatterLight;
        }
        #endif
      `);
  };
  material.customProgramCacheKey = () => 'casePlasticScuffs';
}

/**
 * Paper grain on a material whose UVs span a `widthCm` × `heightCm` face. The
 * grain textures are used as given (cloned by the caller when they need their own
 * repeat); `ownRoughness` keeps the material's roughness as a multiplier.
 */
export function applyPaperGrain(
  material: MeshStandardMaterial,
  grain: { normal: Texture; roughness: Texture },
  widthCm: number,
  heightCm: number,
  ownRoughness: boolean,
) {
  for (const t of [grain.normal, grain.roughness]) t.repeat.set(widthCm / PAPER_TILE_CM, heightCm / PAPER_TILE_CM);
  material.normalMap = grain.normal;
  material.normalScale = new Vector2(SURFACE.paperNormal, SURFACE.paperNormal);
  material.roughnessMap = grain.roughness;
  // The map holds the roughness itself (0.74–0.92).
  if (!ownRoughness) material.roughness = 1;
  material.needsUpdate = true;
}

/**
 * Clones of `source`'s paper grain, to give another face its own repeat (they
 * share the uploaded image), or null when it has none. The caller disposes them.
 */
export function cloneGrain(source: Material): { normal: Texture; roughness: Texture } | null {
  const m = source as MeshStandardMaterial;
  if (!m.normalMap || !m.roughnessMap) return null;
  return { normal: m.normalMap.clone(), roughness: m.roughnessMap.clone() };
}

/**
 * Case plastic: thin, near-perfectly clear polystyrene. `smoke` tints it grey-brown
 * through attenuation, like the smoky cases in the reference photos.
 */
export function createCasePlasticMaterial(tint: CaseTint = 'clear'): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    name: `casePlastic-${tint}`,
    color: '#ffffff',
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    thickness: 0.12,
    ior: 1.5,
    // Toned down at the Stage 6 checkpoint: a showroom-glossy case didn't fit the wear.
    // (envMapIntensity only counts with the material's own envMap: the hero sets it
    // to the scene's environment.)
    specularIntensity: 0.8,
    envMapIntensity: 0.75,
    // Every plastic part is a closed solid, so front faces are enough. Double-sided
    // transmission would sample the J-card twice (through the back face, then again
    // through the front) and blur it.
    side: FrontSide,
  });
  applyCaseTint(material, tint);
  return material;
}

/**
 * Cheaper case plastic for the shelf's many cases: no transmission pass. It adds
 * the plastic's reflections on top of what's behind (black base colour, additive
 * source) and dims that a touch through its alpha, like thin clear plastic.
 */
export function createShelfPlasticMaterial(): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    name: 'shelfPlastic',
    color: '#000000',
    metalness: 0,
    // Dimmer than the hero case. Under RoomEnvironment even 0.04 washed a row of
    // spines out to white; the studio HDRI (Stage 6) takes 0.15 and the spines still
    // read. envMapIntensity only counts when the material has its own envMap; the
    // shelf sets it to the scene's.
    roughness: 0.08,
    specularIntensity: 1,
    envMapIntensity: 0.15,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    side: FrontSide,
  });
}

/**
 * How the hero case's plastic is drawn, by quality tier (Stage 7):
 *
 *  - transmission: the real thing. three renders the scene behind it into a
 *    texture (an extra pass) and refracts it; smoke tints through attenuation.
 *  - blended: no transmission pass. Like the shelf's plastic, it adds its
 *    reflections on top of what's behind and dims that a little through its
 *    alpha (more for smoke). Scratches stay.
 *  - plain: blended, without the scratches.
 */
export function configureCasePlastic(material: MeshPhysicalMaterial, tint: CaseTint, mode: PlasticMode) {
  const blended = mode !== 'transmission';
  material.transmission = blended ? 0 : 1;
  material.transparent = blended;
  material.depthWrite = !blended;
  material.blending = blended ? CustomBlending : NormalBlending;
  material.blendSrc = OneFactor;
  material.blendDst = OneMinusSrcAlphaFactor;
  if (blended) {
    material.color = new Color('#000000');
    material.opacity = tint === 'smoke' ? 0.45 : 0.1;
  } else {
    material.opacity = 1;
    applyCaseTint(material, tint);
  }
  const { NO_SCUFFS: _n, BLENDED_PLASTIC: _b, ...defines } = material.defines ?? {};
  if (mode === 'plain') defines.NO_SCUFFS = '';
  if (blended) defines.BLENDED_PLASTIC = '';
  material.defines = defines;
  material.needsUpdate = true;
}

export function applyCaseTint(material: MeshPhysicalMaterial, tint: CaseTint) {
  if (tint === 'smoke') {
    material.color = new Color('#b9b2aa');
    material.attenuationColor = new Color('#5b5048');
    material.attenuationDistance = 0.35;
  } else {
    material.color = new Color('#ffffff');
    material.attenuationColor = new Color('#f4f7f6');
    material.attenuationDistance = 4;
  }
}

export function disposeTapeMaterials(materials: TapeMaterials) {
  for (const m of Object.values(materials) as Material[]) m.dispose();
}
