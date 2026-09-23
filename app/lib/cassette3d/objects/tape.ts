import { Group } from 'three';
import { CASE_LAYOUT } from '../dimensions';
import { applyCaseTint, createTapeMaterials, type CaseTint, type TapeMaterials } from '../materials';
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
  dispose: () => void;
}

export interface TapeOptions extends JCardOptions {
  tint?: CaseTint;
}

export function createTape(options: TapeOptions): TapeModel {
  const materials = createTapeMaterials(options.tint ?? 'clear');

  const root = new Group();
  root.name = 'tape';

  const caseModel = createCase(materials.casePlastic);
  root.add(caseModel.root);

  // The J-card rides in the lid, so it swings with it.
  const jcard = createJCard(options, materials.paper);
  jcard.root.position.set(CASE_LAYOUT.jcard.x, CASE_LAYOUT.jcard.y, CASE_LAYOUT.jcard.z);
  caseModel.lid.add(jcard.root);

  // The cassette lies in the tray, tape edge towards the hinge. It's a child of the
  // case root, not the tray, so the tape machine can lift it out on its own.
  const cassette = createCassette(materials);
  cassette.root.position.set(CASE_LAYOUT.cassette.x, CASE_LAYOUT.cassette.y, CASE_LAYOUT.cassette.z);
  cassette.root.rotation.z = -Math.PI / 2;
  caseModel.root.add(cassette.root);

  return {
    root,
    case: caseModel,
    cassette,
    jcard,
    materials,
    setCaseTint(tint) {
      applyCaseTint(materials.casePlastic, tint);
    },
    dispose() {
      root.removeFromParent();
      disposeObjectTree(root);
    },
  };
}
