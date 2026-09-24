import { computed, onBeforeUnmount, onMounted, ref, shallowRef, triggerRef, watch, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Mixtape } from '~/types';
import type { TapeData } from '~/lib/cassette3d/tapeData';
import type { Hero, TextureReport } from '~/lib/cassette3d/hero';
import type { Library, ShelfSort } from '~/lib/cassette3d/library';
import type { TapeMachineStatus, TapeState } from '~/lib/cassette3d/animation/tapeMachine';
import { resolveShelfTapes, type PublicShelfOwner, type ShelfData, type ShelfScope } from '~/composables/useHeroTapeData';
import { useAuthStore } from '~/stores/auth';
import { isCloudId } from '~/utils/database';
import { uploadJCardRender, uploadJCardSpine } from '~/utils/jcardRenders';
import type { CassetteScene } from '~/lib/cassette3d/scene';

export type Cassette3DStatus = 'loading' | 'ready' | 'contextLost' | 'unsupported' | 'error';

/** One tape as the overlay lists it. */
export interface ShelfEntry {
  index: number;
  id: string;
  title: string;
  meta: string;
}

/** The shelf, for the overlay. */
export interface ShelfInfo {
  status: 'loading' | 'ready';
  source: ShelfData['source'] | null;
  signedIn: boolean;
  hasMixtapes: boolean;
  error: boolean;
  entries: ShelfEntry[];
  /** Tapes on the shelf right now (search / sort), as indices into `entries`. */
  order: number[];
  /** Every mixtape id you have in the cloud, J-card or not. */
  mixtapeIds: string[];
  /** The URL asked for a tape (?tape=) that isn't on this shelf. */
  missingTape: boolean;
  /** A user's public shelf: whose it is. */
  owner: PublicShelfOwner | null;
}

/**
 * Bridge between Vue and the framework-free 3D scene. three.js is imported
 * inside onMounted so it lands in its own chunk and never in other pages' bundles.
 */
export function useCassetteScene(container: Ref<HTMLElement | null>, scope: ShelfScope = {}) {
  const route = useRoute();
  const router = useRouter();
  const auth = useAuthStore();
  const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl ?? '');
  const status = ref<Cassette3DStatus>('loading');
  /** The J-card and label textures, which arrive after the scene is up. */
  const textureStatus = ref<TextureReport['status']>('idle');
  /** Where the tape is in the tape machine, for the overlay. */
  const tape = ref<TapeMachineStatus>({ state: 'presented', target: 'presented', animating: false });
  const shelf = shallowRef<ShelfInfo>({
    status: 'loading', source: null, signedIn: false, hasMixtapes: false, error: false, entries: [], order: [],
    mixtapeIds: [], missingTape: false, owner: null,
  });
  const hovered = ref<number | null>(null);
  const selected = ref<number | null>(null);
  /** The tapes on the shelf, shared with the library (edited in place, then triggered). */
  const tapes = shallowRef<TapeData[]>([]);
  /** The tape off the shelf (or on its way off), for the overlay's details and actions. */
  const selectedTape = computed(() => {
    void tapes.value;
    return selected.value !== null && tape.value.target !== 'onShelf' ? tapes.value[selected.value] ?? null : null;
  });
  let view: { search: string; sort: ShelfSort } = { search: '', sort: 'updated' };

  const toEntries = (list: TapeData[]): ShelfEntry[] => list.map((t, index) => ({
    index,
    id: t.mixtape.id,
    title: t.mixtape.title,
    meta: `C-${t.mixtape.cassetteLength} · ${t.mixtape.sideA.length + t.mixtape.sideB.length} tracks`,
  }));

  let handle: CassetteScene | null = null;
  let hero: Hero | null = null;
  let library: Library | null = null;
  let debugCleanup: (() => void) | null = null;
  let unmounted = false;

  onMounted(async () => {
    const el = container.value;
    if (!el) return;
    if (!hasWebGL2()) {
      status.value = 'unsupported';
      return;
    }
    try {
      const [{ createCassetteScene }, { createHero }, { createLibrary }, debug, { createSnapshotSource }] = await Promise.all([
        import('~/lib/cassette3d/scene'),
        import('~/lib/cassette3d/hero'),
        import('~/lib/cassette3d/library'),
        import('~/lib/cassette3d/debug'),
        import('~/lib/cassette3d/textures/snapshotSource'),
      ]);
      if (unmounted) return;
      const params = debug.parseDebugParams(route.query);
      handle = createCassetteScene(el, { onStatus: (s) => { status.value = s; } });
      // Stored renders first; a card you own that had to be rendered here gets its render uploaded.
      const snapshotSource = createSnapshotSource({
        supabaseUrl,
        canWriteBack: (jcard) => !!auth.user && jcard.userId === auth.user.id && isCloudId(jcard.id),
        writeBack: (jcard, snapshot, version) => uploadJCardRender(jcard, snapshot, version),
        writeSpine: (jcard, render, snapshot) => uploadJCardSpine(jcard, render, snapshot),
      });
      hero = createHero(handle, params.hero, snapshotSource, {
        reducedMotion: () => prefersReducedMotion(route.query.motion),
        fade: (to, ms) => fadeCanvas(el, to, ms),
        hasShelf: () => !!library,
        getSlot: (out) => library?.slotMatrix(out) ?? null,
      });
      hero.view.turntable.visible = false;
      hero.onTextureStatus((s) => { textureStatus.value = s; });
      hero.machine.onChange((s) => { tape.value = s; });
      library = createLibrary(handle, hero, {
        supabaseUrl,
        onHover: (i) => { hovered.value = i; },
        onSelect: (i) => {
          selected.value = i;
          if (i !== null && shelf.value.missingTape) shelf.value = { ...shelf.value, missingTape: false };
        },
        onOrder: (order) => { shelf.value = { ...shelf.value, order }; },
      });
      // Look at the shelf while the tapes load.
      hero.machine.jump('onShelf');
      const cleanup = await debug.installDebug(handle, hero, library, params, import.meta.dev);
      if (unmounted) cleanup();
      else debugCleanup = cleanup;
      status.value = 'ready';

      const data = await resolveShelfTapes(route.query, import.meta.dev, scope);
      if (unmounted || !library) return;
      tapes.value = data.tapes;
      // Synchronously up to the tape it takes off the shelf; the spines load after.
      const loading = library.setTapes(data.tapes, data.initial);
      shelf.value = {
        status: 'ready',
        source: data.source,
        signedIn: data.signedIn,
        hasMixtapes: data.hasMixtapes,
        error: !!data.error,
        entries: toEntries(data.tapes),
        order: shelf.value.order,
        mixtapeIds: data.mixtapeIds ?? [],
        missingTape: !!data.missingTape,
        owner: data.owner ?? null,
      };
      await loading;
    } catch (err) {
      console.error('[cassette3d] Failed to start the 3D scene', err);
      status.value = 'error';
    }
  });

  // The URL names the tape that's off the shelf (?tape=<mixtape id>), so a reload or a
  // shared link comes back to it. Replaced, not pushed: Back leaves the library.
  watch([selectedTape, () => shelf.value.status], ([t, s]) => {
    if (s !== 'ready' || unmounted) return;
    const id = t?.mixtape.id;
    if ((route.query.tape ?? undefined) === id) return;
    void router.replace({ query: { ...route.query, tape: id } });
  });

  /** A tape's mixtape changed (made public, shared): update it everywhere it's shown. */
  function updateMixtape(mixtape: Mixtape) {
    const i = tapes.value.findIndex((t) => t.mixtape.id === mixtape.id);
    if (i < 0) return;
    // In place: the library holds the same array.
    tapes.value[i] = { ...tapes.value[i]!, mixtape };
    triggerRef(tapes);
    shelf.value = { ...shelf.value, entries: toEntries(tapes.value) };
  }

  /** A tape was deleted: it leaves the shelf (a cut back to the shelf if it was out). */
  async function removeTape(mixtapeId: string) {
    if (!library) return;
    const next = tapes.value.filter((t) => t.mixtape.id !== mixtapeId);
    tapes.value = next;
    shelf.value = {
      ...shelf.value,
      entries: toEntries(next),
      mixtapeIds: shelf.value.mixtapeIds.filter((id) => id !== mixtapeId),
      hasMixtapes: shelf.value.hasMixtapes && shelf.value.mixtapeIds.length > 1,
    };
    const loading = library.setTapes(next);
    library.setView(view.search, view.sort);
    await loading;
  }

  onBeforeUnmount(() => {
    unmounted = true;
    library?.dispose();
    library = null;
    // The scene first: it frees GPU resources three.js only reaches through live materials.
    handle?.dispose();
    handle = null;
    hero?.dispose();
    hero = null;
    // After dispose, so the debug hook can record what the renderer still holds.
    debugCleanup?.();
    debugCleanup = null;
  });

  return {
    status,
    textureStatus,
    tape,
    shelf,
    hovered,
    selected,
    selectedTape,
    updateMixtape,
    removeTape,
    /** A mixtape saved from here (the draft): it's in the cloud now. */
    addMixtapeId: (id: string) => {
      if (!shelf.value.mixtapeIds.includes(id)) shelf.value = { ...shelf.value, mixtapeIds: [...shelf.value.mixtapeIds, id], hasMixtapes: true };
    },
    request: (state: TapeState) => hero?.machine.request(state),
    step: (dir: 1 | -1) => hero?.machine.step(dir),
    flip: () => hero?.machine.flip(),
    select: (index: number) => library?.select(index),
    highlight: (index: number | null) => library?.highlight(index),
    setShelfView: (search: string, sort: ShelfSort) => {
      view = { search, sort };
      library?.setView(search, sort);
    },
  };
}

function prefersReducedMotion(queryValue: unknown): boolean {
  if (queryValue === 'reduce') return true;
  if (queryValue === 'full') return false;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Fade the canvas host (reduced motion: fade out, cut, fade in). */
function fadeCanvas(el: HTMLElement, to: 'out' | 'in', ms: number): Promise<void> {
  el.style.transition = `opacity ${ms}ms ease`;
  el.style.opacity = to === 'out' ? '0' : '1';
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
