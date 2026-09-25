import { Group } from 'three';
import { CASE_LAYOUT } from '../dimensions';
import { configureCasePlastic, createTapeMaterials, type CaseTint, type SurfaceMaps, type TapeMaterials } from '../materials';
import type { PlasticMode } from '../quality';
import { disposeObjectTree } from '../scene';
import { createCase, type CaseModel } from './caseModel';
import { createCassette, type CassetteModel } from './cassette';
import { createJCard, type JCardModel, type JCardOptions } from './jcard';

/**
 * One mixtape as a physical object: the case, the cassette in its tray and the
 * J-card in its lid, assembled closed. `root` is in the case frame (dimensions.ts);
 * whatever places the tape in the world moves `root`.
 */
export interface TapeModel {
  root: Group;
  case: CaseModel;
  cassette: CassetteModel;
  jcard: JCardModel;
  materials: TapeMaterials;
  setCaseTint: (tint: CaseTint) => void;
  /** How the case plastic is drawn (quality tier). */
  setPlasticMode: (mode: PlasticMode) => void;
  dispose: () => void;
}

export interface TapeOptions extends JCardOptions {
  tint?: CaseTint;
  plastic?: PlasticMode;
  /** Scuffs and paper grain (Stage 6); the tape owns them from here on. */
  surfaces?: SurfaceMaps;
}

export function createTape(options: TapeOptions): TapeModel {
  const materials = createTapeMaterials(options.tint ?? 'clear', options.surfaces);
  let tint: CaseTint = options.tint ?? 'clear';
  let plastic: PlasticMode = options.plastic ?? 'transmission';
  configureCasePlastic(materials.casePlastic, tint, plastic);

  const root = new Group();
  root.name = 'tape';
  // Some of these are off the meshes at times (the label while a texture covers it),
  // so disposeObjectTree is told about them.
  root.userData.ownedMaterials = Object.values(materials);

  const caseModel = createCase(materials.casePlastic);
  root.add(caseModel.root);

  // The J-card is clipped into the lid.
  const jcard = createJCard(options, materials.paper);
  jcard.root.position.set(CASE_LAYOUT.jcard.x, CASE_LAYOUT.jcard.y, CASE_LAYOUT.jcard.z);
  caseModel.lid.add(jcard.root);

  // The cassette lies on the J-card in the lid, tape edge towards the hinge, and
  // swings with the lid; closed, the tray's spindle posts sit in its hubs.
  // (Stage 3 lifts it out with Object3D.attach, which keeps its world pose.)
  const cassette = createCassette(materials);
  cassette.root.position.set(CASE_LAYOUT.cassette.x, CASE_LAYOUT.cassette.y, CASE_LAYOUT.cassette.z);
  cassette.root.rotation.z = -Math.PI / 2;
  caseModel.lid.add(cassette.root);

  return {
    root,
    case: caseModel,
    cassette,
    jcard,
    materials,
    setCaseTint(next) {
      tint = next;
      configureCasePlastic(materials.casePlastic, tint, plastic);
    },
    setPlasticMode(next) {
      plastic = next;
      configureCasePlastic(materials.casePlastic, tint, plastic);
    },
    dispose() {
      root.removeFromParent();
      disposeObjectTree(root);
    },
  };
}
