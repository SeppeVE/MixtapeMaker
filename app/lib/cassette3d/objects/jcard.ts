import { BoxGeometry, Group, Mesh, type Material } from 'three';
import { JCARD } from '../dimensions';

/**
 * The J-card as a chain of flat panels hinged at the creases. Each crease is a
 * Group pivot, and the next panel hangs off it, so folding is just rotating pivots.
 *
 * Panel frame: the card lies flat in XY, height along Y (centred), printed
 * outside face at z = 0 facing +Z, card stock filling z ∈ [−thickness, 0].
 * The chain starts at the cover (flap 1): the root's origin is the cover/spine
 * crease on the outside face, the spine and back hang off to −X, and the extra
 * flaps hang off the cover's free edge to +X.
 *
 * Folded as in the case: spine 90° and back another 90° behind the cover (a "J"),
 * extra flaps concertina'd behind the cover, 180° each, alternating direction.
 */

export type JCardPanelName = 'back' | 'spine' | `flap${number}`;

export interface JCardOptions {
  /** Number of flaps including the cover, 1–6 (JCardContent.flaps). */
  flaps: number;
  /** JCardContent.shortBack: a 10 mm back instead of 25.4 mm. */
  shortBack: boolean;
}

export interface JCardPanel {
  name: JCardPanelName;
  width: number;
  mesh: Mesh;
}

export interface JCardHinge {
  /** Name of the panel this crease leads to. */
  name: JCardPanelName;
  pivot: Group;
  /** Pivot rotation (radians) when folded as in the case. */
  foldedAngle: number;
}

export interface JCardModel {
  root: Group;
  /** Panels in print order: back, spine, flap1 (cover), flap2… */
  panels: JCardPanel[];
  hinges: JCardHinge[];
  /** 1 = folded as in the case, 0 = flat. Stage 3 staggers the hinges individually. */
  setFold: (amount: number) => void;
}

const t = JCARD.thickness;

export function createJCard(options: JCardOptions, paper: Material): JCardModel {
  const flapCount = Math.min(Math.max(Math.round(options.flaps), 1), JCARD.flaps.length);
  const root = new Group();
  root.name = 'jcard';
  const panels: JCardPanel[] = [];
  const hinges: JCardHinge[] = [];

  const makePanel = (name: JCardPanelName, width: number, towards: 1 | -1) => {
    const geometry = new BoxGeometry(width, JCARD.height, t);
    geometry.translate((towards * width) / 2, 0, -t / 2);
    const mesh = new Mesh(geometry, paper);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    panels.push({ name, width, mesh });
    return mesh;
  };

  /**
   * Hang a panel off `parent` at the crease x = edgeX. `inward` folds towards −Z
   * (the pivot sits on the inside face); otherwise it folds towards +Z.
   */
  const hinge = (
    parent: Group,
    edgeX: number,
    towards: 1 | -1,
    inward: boolean,
    foldDeg: number,
    name: JCardPanelName,
    width: number,
  ) => {
    const pivotZ = inward ? -t : 0;
    const pivot = new Group();
    pivot.name = `crease-${name}`;
    pivot.position.set(edgeX, 0, pivotZ);
    const content = new Group();
    content.position.z = -pivotZ;
    content.add(makePanel(name, width, towards));
    pivot.add(content);
    parent.add(pivot);
    // Rotating about Y by +θ turns +X towards −Z; mirror for panels hanging off to −X.
    const angle = towards * (inward ? 1 : -1) * ((foldDeg * Math.PI) / 180);
    hinges.push({ name, pivot, foldedAngle: angle });
    return content;
  };

  // Cover, then the spine and back to the left.
  const panelsInOrder: JCardPanelName[] = [];
  const cover = new Group();
  cover.add(makePanel('flap1', JCARD.flaps[0]!, 1));
  root.add(cover);
  const spine = hinge(cover, 0, -1, true, 90, 'spine', JCARD.spine);
  hinge(spine, -JCARD.spine, -1, true, 90, 'back', options.shortBack ? JCARD.backShort : JCARD.backFull);

  // Extra flaps to the right, concertina-folded behind the cover.
  let parent = cover;
  let edge = JCARD.flaps[0]!;
  for (let i = 1; i < flapCount; i++) {
    const width = JCARD.flaps[i]!;
    parent = hinge(parent, edge, 1, i % 2 === 1, 180, `flap${i + 1}`, width);
    edge = width;
  }

  panelsInOrder.push('back', 'spine', ...Array.from({ length: flapCount }, (_, i) => `flap${i + 1}` as JCardPanelName));
  panels.sort((a, b) => panelsInOrder.indexOf(a.name) - panelsInOrder.indexOf(b.name));

  const model: JCardModel = {
    root,
    panels,
    hinges,
    setFold(amount) {
      for (const h of hinges) h.pivot.rotation.y = h.foldedAngle * amount;
    },
  };
  model.setFold(1);
  return model;
}
