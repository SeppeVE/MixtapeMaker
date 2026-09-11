import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * A page that can hold work not yet saved to the cloud registers itself here
 * while it's mounted. The client plugin (plugins/unsaved.client.ts) consults
 * the registry on every route change and on tab close.
 */
export interface UnsavedSource {
  /** Route path of the editor that owns the work. Only navigations *away from* this path are guarded. */
  path: string;
  /** Shown in the dialog, e.g. "mixtape" or "J-card". */
  kind: string;
  /** Name of the thing, e.g. the mixtape title. */
  title: () => string;
  /** True while there are changes not yet in the cloud. Read at navigation time. */
  dirty: () => boolean;
  /** Save to the cloud. Resolves true when the cloud now has the latest version. */
  save?: () => Promise<boolean>;
}

export const useUnsavedStore = defineStore('unsaved', () => {
  const sources = ref<Record<string, UnsavedSource>>({});
  /** The navigation waiting on the user's answer, or null when the dialog is closed. */
  const pending = ref<{ to: string; sources: UnsavedSource[] } | null>(null);
  const saving = ref(false);
  // Set right before the navigation the user approved, so the router guard lets it through once.
  let bypassNext = false;

  function register(key: string, source: UnsavedSource) {
    sources.value = { ...sources.value, [key]: source };
  }
  function unregister(key: string) {
    const next = { ...sources.value };
    delete next[key];
    sources.value = next;
  }

  /** Dirty sources owned by the page at `fromPath` (the page being left). */
  function dirtySources(fromPath: string): UnsavedSource[] {
    return Object.values(sources.value).filter((s) => s.path === fromPath && s.dirty());
  }

  /** Called by the router guard. Returns true to allow the navigation. */
  function shouldAllow(to: string, fromPath: string): boolean {
    if (bypassNext) {
      bypassNext = false;
      return true;
    }
    const dirty = dirtySources(fromPath);
    if (dirty.length === 0) return true;
    pending.value = { to, sources: dirty };
    return false;
  }

  function stay() {
    pending.value = null;
  }

  /** Approve the pending navigation once and return where to go. */
  function approve(): string | null {
    const to = pending.value?.to ?? null;
    pending.value = null;
    bypassNext = true;
    return to;
  }

  /** Save every dirty source; true when all of them are now in the cloud. */
  async function saveAll(): Promise<boolean> {
    if (!pending.value) return false;
    saving.value = true;
    try {
      for (const s of pending.value.sources) {
        if (!s.save) return false;
        if (!(await s.save())) return false;
      }
      return true;
    } catch {
      return false;
    } finally {
      saving.value = false;
    }
  }

  return { sources, pending, saving, register, unregister, dirtySources, shouldAllow, stay, approve, saveAll };
});
