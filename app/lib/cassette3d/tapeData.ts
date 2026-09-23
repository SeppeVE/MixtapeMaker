import type { JCard, Mixtape } from '~/types';

/**
 * What the 3D viewer shows for one tape: a mixtape and its J-card. The viewer
 * only takes mixtapes that have a linked J-card (decided in Discovery).
 */
export interface TapeData {
  mixtape: Mixtape;
  jcard: JCard;
  /** Where it came from, for the debug report. */
  source: 'cloud' | 'fixture';
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

/** Pair each mixtape with its J-card, dropping mixtapes that have none. Keeps the mixtapes' order. */
export function pairTapes(mixtapes: Mixtape[], cards: JCard[]): TapeData[] {
  const out: TapeData[] = [];
  for (const mixtape of mixtapes) {
    const jcard = pickJCardFor(mixtape.id, cards);
    if (jcard) out.push({ mixtape, jcard, source: 'cloud' });
  }
  return out;
}

/** Cache key for anything rendered from a tape's J-card: changes whenever the card is saved. */
export function jcardCacheKey(jcard: JCard): string {
  return `${jcard.id}@${jcard.updatedAt}`;
}
