import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Hero, TextureReport } from '~/lib/cassette3d/hero';
import type { Library, ShelfSort } from '~/lib/cassette3d/library';
import type { TapeMachineStatus, TapeState } from '~/lib/cassette3d/animation/tapeMachine';
import { resolveShelfTapes, type ShelfData } from '~/composables/useHeroTapeData';
import { useAuthStore } from '~/stores/auth';
import { isCloudId } from '~/utils/database';
import { uploadJCardRender } from '~/utils/jcardRenders';
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
}

/**
 * Bridge between Vue and the framework-free 3D scene. three.js is imported
 * inside onMounted so it lands in its own chunk and never in other pages' bundles.
 */
export function useCassetteScene(container: Ref<HTMLElement | null>) {
  const route = useRoute();
  const auth = useAuthStore();
  const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl ?? '');
  const status = ref<Cassette3DStatus>('loading');
  /** The J-card and label textures, which arrive after the scene is up. */
  const textureStatus = ref<TextureReport['status']>('idle');
  /** Where the tape is in the tape machine, for the overlay. */
  const tape = ref<TapeMachineStatus>({ state: 'presented', target: 'presented', animating: false });
  const shelf = shallowRef<ShelfInfo>({
    status: 'loading', source: null, signedIn: false, hasMixtapes: false, error: false, entries: [], order: [],
  });
  const hovered = ref<number | null>(null);
  const selected = ref<number | null>(null);

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
        onHover: (i) => { hovered.value = i; },
        onSelect: (i) => { selected.value = i; },
        onOrder: (order) => { shelf.value = { ...shelf.value, order }; },
      });
      // Look at the shelf while the tapes load.
      hero.machine.jump('onShelf');
      const cleanup = await debug.installDebug(handle, hero, library, params, import.meta.dev);
      if (unmounted) cleanup();
      else debugCleanup = cleanup;
      status.value = 'ready';

      const data = await resolveShelfTapes(route.query, import.meta.dev);
      if (unmounted || !library) return;
      shelf.value = {
        status: 'ready',
        source: data.source,
        signedIn: data.signedIn,
        hasMixtapes: data.hasMixtapes,
        error: !!data.error,
        entries: data.tapes.map((t, index) => ({
          index,
          id: t.mixtape.id,
          title: t.mixtape.title,
          meta: `C-${t.mixtape.cassetteLength} · ${t.mixtape.sideA.length + t.mixtape.sideB.length} tracks`,
        })),
        order: shelf.value.order,
      };
      await library.setTapes(data.tapes, data.initial);
    } catch (err) {
      console.error('[cassette3d] Failed to start the 3D scene', err);
      status.value = 'error';
    }
  });

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
    request: (state: TapeState) => hero?.machine.request(state),
    step: (dir: 1 | -1) => hero?.machine.step(dir),
    flip: () => hero?.machine.flip(),
    select: (index: number) => library?.select(index),
    highlight: (index: number | null) => library?.highlight(index),
    setShelfView: (search: string, sort: ShelfSort) => library?.setView(search, sort),
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
