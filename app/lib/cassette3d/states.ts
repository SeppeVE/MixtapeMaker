/**
 * The tape states, in order. Stage 3's tapeMachine.ts drives transitions
 * between them; until then only the debug hooks read this list.
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
