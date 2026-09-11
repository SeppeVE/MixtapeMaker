import type { JCardContent } from '~/types';

/**
 * Settings the inside face renders with. Shared by the inside preview and the
 * inside printable so both stay identical.
 *
 * The inside is drawn as the mirror image of the outside (as if you flipped the
 * card over like a book). Spine and back-panel text is rotated 90°, so on the
 * inside it has to turn the other way for the top of the text to sit at the same
 * fold line as on the outside. Flipping `isReversed` does exactly that: it is the
 * only thing those two panels use it for.
 */
export function resolveInsideContent(content: JCardContent): JCardContent {
  return {
    ...content,
    backgroundImageUrl: content.insideBackgroundImageUrl,
    continuousBackground: content.insideContinuousBackground ?? content.continuousBackground,
    isReversed: !content.isReversed,
  };
}

export type FoldVisibility = 'visible' | 'hidden';

/**
 * Which inside faces can still be seen once the card is accordion-folded and put
 * in a cassette case.
 *
 * Every flap after the cover folds back against the previous one, so the faces
 * alternate: the cover's inside touches flap 2's inside, flap 2's outside touches
 * flap 3's outside, and so on. Only the last flap has a free face. That face is
 * the inside when the last flap has an even index (cover alone, cover + 2 flaps,
 * ...) and the outside otherwise.
 */
export function insideFlapVisibility(flaps: number): FoldVisibility[] {
  const last = flaps - 1;
  return Array.from({ length: flaps }, (_, i) =>
    i === last && last % 2 === 0 ? 'visible' : 'hidden',
  );
}
