import { CASE_LAYOUT } from './dimensions';
import { createHeroView, type HeroView, type HeroViewName } from './heroView';
import type { CaseTint } from './materials';
import { createJCard, type JCardOptions } from './objects/jcard';
import { createTape, type TapeModel } from './objects/tape';
import { disposeObjectTree, type CassetteScene } from './scene';

/**
 * Stage 1 content: one closed tape with a placeholder J-card on the hero turntable.
 * Stage 3 hands the tape to the tape machine; Stage 4 puts the shelf behind it.
 */
export interface HeroOptions extends JCardOptions {
  tint: CaseTint;
  /** Start on a fixed view instead of spinning. */
  view: HeroViewName | null;
  /** Lid opening in degrees (debug: checks the hinge). */
  lidDeg: number;
  /** J-card fold, 1 = folded in the case, 0 = flat (debug). */
  fold: number;
  autoRotate: boolean;
}

export const DEFAULT_HERO_OPTIONS: HeroOptions = {
  flaps: 2,
  shortBack: false,
  tint: 'clear',
  view: null,
  lidDeg: 0,
  fold: 1,
  autoRotate: true,
};

export interface Hero {
  tape: TapeModel;
  view: HeroView;
  setLidAngle: (deg: number) => void;
  setJCardFold: (amount: number) => void;
  /** Rebuild the placeholder J-card with a different panel layout. */
  setJCardLayout: (layout: JCardOptions) => void;
  /** Show or hide the parts, e.g. to look at the J-card on its own (debug). */
  setPartsVisible: (parts: Partial<Record<'case' | 'cassette' | 'jcard', boolean>>) => void;
  dispose: () => void;
}

export function createHero(handle: CassetteScene, options: HeroOptions): Hero {
  const tape = createTape(options);
  const view = createHeroView(handle, { autoRotate: options.autoRotate && !options.view });
  view.turntable.add(tape.root);

  let fold = options.fold;
  tape.case.setLidAngle(options.lidDeg);
  tape.jcard.setFold(fold);
  if (options.view) view.setView(options.view);

  return {
    tape,
    view,
    setLidAngle(deg) {
      tape.case.setLidAngle(deg);
    },
    setJCardFold(amount) {
      fold = amount;
      tape.jcard.setFold(amount);
    },
    setJCardLayout(layout) {
      // Materials are shared with the rest of the tape, so only the geometry goes.
      const old = tape.jcard.root;
      old.removeFromParent();
      old.traverse((obj) => (obj as { geometry?: { dispose: () => void } }).geometry?.dispose());
      const jcard = createJCard(layout, tape.materials.paper);
      jcard.root.position.set(CASE_LAYOUT.jcard.x, CASE_LAYOUT.jcard.y, CASE_LAYOUT.jcard.z);
      tape.case.lid.add(jcard.root);
      tape.jcard = jcard;
      jcard.setFold(fold);
    },
    setPartsVisible(parts) {
      // The J-card and cassette are children of the case root, so hide the case's own parts.
      if (parts.case !== undefined) {
        tape.case.tray.visible = parts.case;
        for (const child of tape.case.lid.children) {
          if (child !== tape.jcard.root) child.visible = parts.case;
        }
      }
      if (parts.cassette !== undefined) tape.cassette.root.visible = parts.cassette;
      if (parts.jcard !== undefined) tape.jcard.root.visible = parts.jcard;
    },
    dispose() {
      view.dispose();
      tape.dispose();
      disposeObjectTree(view.turntable);
    },
  };
}
