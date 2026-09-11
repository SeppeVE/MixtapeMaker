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
