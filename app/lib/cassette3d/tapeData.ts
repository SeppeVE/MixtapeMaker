import type { JCard, Mixtape } from '~/types';
import { plainJCardFor } from './textures/plainCard';

/**
 * What the 3D viewer shows for one tape: a mixtape and its J-card. Your own
 * shelf only takes mixtapes that have a linked J-card (decided in Discovery);
 * the public shelves also take the rest, in a home-made paper card.
 */
export interface TapeData {
  mixtape: Mixtape;
  jcard: JCard;
  /** Where it came from, for the debug report. */
  source: 'cloud' | 'fixture';
  /** No J-card of its own: `jcard` is a stand-in, drawn as plain handwritten paper (see plainCard.ts). */
  plain?: boolean;
}

/** A mixtape's J-card: the most recently updated one linked to it, if there are several. */
export function pickJCardFor(mixtapeId: string, cards: JCard[]): JCard | null {
  let best: JCard | null = null;
  for (const card of cards) {
    if (card.mixtapeId !== mixtapeId) continue;
    if (!best || new Date(card.updatedAt).getTime() > new Date(best.updatedAt).getTime()) best = card;
  }
  return best;
}

/**
 * Pair each mixtape with its J-card, dropping mixtapes that have none, or with
 * `plain` giving those a plain paper card instead. Keeps the mixtapes' order.
 */
export function pairTapes(mixtapes: Mixtape[], cards: JCard[], { plain = false } = {}): TapeData[] {
  const out: TapeData[] = [];
  for (const mixtape of mixtapes) {
    const jcard = pickJCardFor(mixtape.id, cards);
    if (jcard) out.push({ mixtape, jcard, source: 'cloud' });
    else if (plain) out.push({ mixtape, jcard: plainJCardFor(mixtape), source: 'cloud', plain: true });
  }
  return out;
}
