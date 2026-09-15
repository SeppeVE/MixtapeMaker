import type { Mixtape, Song } from '../types';
import { calculateTotalDuration, formatTime } from './timeUtils';

/**
 * Plain facts about a mixtape for the success modals. Facts wear better than
 * generated praise on a second viewing, so nothing here is complimentary
 * unless the numbers earn it.
 */
export function mixtapeFacts(mixtape: Mixtape): string[] {
  const all: Song[] = [...mixtape.sideA, ...mixtape.sideB];
  if (all.length === 0) return [];

  const sideCapacity = (mixtape.cassetteLength / 2) * 60;
  const totalA = calculateTotalDuration(mixtape.sideA);
  const totalB = calculateTotalDuration(mixtape.sideB);
  const facts: string[] = [];

  facts.push(
    `${all.length} track${all.length === 1 ? '' : 's'} · ` +
    `A ${formatTime(totalA)} / B ${formatTime(totalB)} of ${formatTime(sideCapacity)} per side` +
    packingNote(totalA, totalB, sideCapacity),
  );

  const artists = new Set(
    all.flatMap((s) => s.artist.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean)),
  ).size;
  if (artists > 0) facts.push(`${artists} distinct artist${artists === 1 ? '' : 's'}`);

  return facts;
}

function packingNote(totalA: number, totalB: number, capacity: number): string {
  if (capacity <= 0) return '';
  if (totalA > capacity || totalB > capacity) return ' — one side runs over';
  const fill = Math.min(totalA, totalB) / capacity;
  if (fill >= 0.9) return ' — nicely packed';
  return '';
}
