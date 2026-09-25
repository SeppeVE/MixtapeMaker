/**
 * The tape machine's states, on their own: no three.js or GSAP here, so the
 * page-level code that reads them (the ?debugState= and ?tape= handling) stays
 * out of the three.js chunk. tapeMachine.ts re-exports all of it.
 */

export const TAPE_STATES = [
  'onShelf',
  'pulledOut',
  'presented',
  'lidOpen',
  'cassetteOut',
  'jcardOut',
  'jcardUnfolded',
] as const;

export type TapeState = (typeof TAPE_STATES)[number];

export function isTapeState(value: unknown): value is TapeState {
  return typeof value === 'string' && (TAPE_STATES as readonly string[]).includes(value);
}

/** The states from 'presented' on: the tape is off the shelf. */
export const HERO_STATES = ['presented', 'lidOpen', 'cassetteOut', 'jcardOut', 'jcardUnfolded'] as const;
export type HeroState = (typeof HERO_STATES)[number];

export function isHeroState(value: unknown): value is HeroState {
  return typeof value === 'string' && (HERO_STATES as readonly string[]).includes(value);
}
