import type { JCardContent } from '~/types';
import { snapshotJCard, type JCardSnapshot } from './jcardSnapshot';

/**
 * In-memory cache of J-card snapshots, keyed by card id + updatedAt (see
 * jcardCacheKey), so re-entering the 3D view or re-selecting a tape doesn't
 * re-render the card. Module level: it survives leaving and re-entering the
 * route, and is gone on a full reload. Stage 2's persistent cache (render on
 * save, store in Supabase Storage) is waiting on approval.
 */

const MAX_ENTRIES = 6;
const cache = new Map<string, Promise<JCardSnapshot>>();

export function getSnapshot(key: string, content: JCardContent): Promise<JCardSnapshot> {
  const hit = cache.get(key);
  if (hit) {
    // Refresh its place in the LRU order.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const pending = snapshotJCard(content);
  cache.set(key, pending);
  pending.catch(() => cache.delete(key));
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return pending;
}

export function isSnapshotCached(key: string): boolean {
  return cache.has(key);
}

export function clearSnapshotCache() {
  cache.clear();
}
