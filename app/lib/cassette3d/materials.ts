import {
  Color,
  DoubleSide,
  FrontSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
} from 'three';

/**
 * Shared materials for the tape objects. Every tape gets its own set from
 * createTapeMaterials() so they can be disposed together with the tape.
 */

export type CaseTint = 'clear' | 'smoke';

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

export function createTapeMaterials(tint: CaseTint = 'clear'): TapeMaterials {
  return {
    casePlastic: createCasePlasticMaterial(tint),
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
    label: new MeshStandardMaterial({ name: 'label', color: '#e2dccd', roughness: 0.85, metalness: 0 }),
    paper: new MeshStandardMaterial({ name: 'paper', color: '#e4dfd3', roughness: 0.82, metalness: 0 }),
  };
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
    specularIntensity: 1,
    envMapIntensity: 1.2,
    // Every plastic part is a closed solid, so front faces are enough. Double-sided
    // transmission would sample the J-card twice (through the back face, then again
    // through the front) and blur it.
    side: FrontSide,
  });
  applyCaseTint(material, tint);
  return material;
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
