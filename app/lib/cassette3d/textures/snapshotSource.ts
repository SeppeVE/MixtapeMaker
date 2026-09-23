import type { JCard } from '~/types';
import { isTrustedRender, jcardRenderVersion, loadStoredSnapshot } from './jcardRender';
import type { JCardSnapshot } from './jcardSnapshot';
import { getSnapshot, isSnapshotCached, type SnapshotOrigin } from './snapshotCache';

/**
 * Where a tape's J-card snapshot comes from, cheapest first:
 *   1. the in-memory cache (this tab has shown the card before),
 *   2. the stored render, if its content hash still matches the card,
 *   3. rendering in the browser, after which a card the viewer owns gets its
 *      render uploaded so the next visit takes path 2.
 * Storage specifics are injected, so this stays free of Supabase code.
 */

export type WriteBackStatus = 'skipped' | 'uploading' | 'stored' | 'failed';

export interface SnapshotResult {
  snapshot: JCardSnapshot;
  origin: SnapshotOrigin | 'memory';
  version: string;
  /** Settles with the outcome of uploading a runtime render (always 'skipped' otherwise). */
  writeBack: Promise<WriteBackStatus>;
}

export interface SnapshotSourceDeps {
  /** NUXT_PUBLIC_SUPABASE_URL: stored renders are only trusted from this project's bucket. */
  supabaseUrl: string;
  /** Upload a render of a card the viewer may write to. Absent or resolving false: skip. */
  canWriteBack?: (jcard: JCard) => boolean;
  writeBack?: (jcard: JCard, snapshot: JCardSnapshot, version: string) => Promise<unknown>;
}

export type SnapshotSource = (jcard: JCard) => Promise<SnapshotResult>;

export function createSnapshotSource(deps: SnapshotSourceDeps): SnapshotSource {
  return async (jcard) => {
    const version = await jcardRenderVersion(jcard.content);
    const key = `${jcard.id}:${version}`;
    const fromMemory = isSnapshotCached(key);
    let writeBack: Promise<WriteBackStatus> = Promise.resolve('skipped');

    const cached = await getSnapshot(key, async () => {
      const stored = jcard.render;
      if (stored?.version === version && isTrustedRender(stored, deps.supabaseUrl)) {
        try {
          return { snapshot: await loadStoredSnapshot(stored), origin: 'stored' };
        } catch (err) {
          console.warn('[cassette3d] Stored J-card render failed to load; rendering it here instead', err);
        }
      }
      const { snapshotJCard } = await import('./jcardSnapshot');
      const snapshot = await snapshotJCard(jcard.content);
      // Blank images would be baked into the stored render; only upload clean renders.
      if (deps.writeBack && deps.canWriteBack?.(jcard) && snapshot.images.every((i) => i.ok)) {
        writeBack = deps.writeBack(jcard, snapshot, version).then(
          () => 'stored' as const,
          (err) => {
            console.warn('[cassette3d] Could not store the J-card render', err);
            return 'failed' as const;
          },
        );
      }
      return { snapshot, origin: 'runtime' };
    });

    return { snapshot: cached.snapshot, origin: fromMemory ? 'memory' : cached.origin, version, writeBack };
  };
}
