import { supabase } from './supabase';
import type { JCard, JCardRender, JCardRenderFace } from '../types';
import type { JCardSnapshot } from '../lib/cassette3d/textures/jcardSnapshot';
import { RENDER_BUCKET, encodeFace, jcardRenderVersion } from '../lib/cassette3d/textures/jcardRender';

/**
 * Stored J-card renders for the 3D library (SUPABASE_SETUP.md step 3k).
 *
 * After the editor saves a card to the cloud, the card is rendered once its
 * edits have settled and the images go to the `jcard-renders` bucket under
 * {user_id}/{card_id}/{version}-{face}.webp. The row's `render` column records
 * the URLs, the panel layout and the content hash (`version`) they belong to.
 * The 3D view uses them while the hash still matches the card's content, and
 * otherwise renders in the browser (and, for your own cards, uploads the result).
 */

/** Quiet time after the last save before rendering, so typing isn't interrupted. */
const RENDER_DELAY_MS = 8000;
/** A year: every file name carries its content hash, so a URL never changes meaning. */
const CACHE_SECONDS = '31536000';

type RenderableCard = Pick<JCard, 'id' | 'userId' | 'content'>;

/** Upload a card's snapshot and point the row at it. Returns the stored render. */
export async function uploadJCardRender(card: RenderableCard, snapshot: JCardSnapshot, version: string): Promise<JCardRender> {
  const folder = `${card.userId}/${card.id}`;
  const face = async (name: 'outside' | 'inside', canvas: HTMLCanvasElement, panels: JCardRenderFace['panels']) => {
    const blob = await encodeFace(canvas);
    const ext = blob.type === 'image/webp' ? 'webp' : 'png';
    const path = `${folder}/${version}-${name}.${ext}`;
    const { error } = await supabase.storage.from(RENDER_BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type,
      cacheControl: CACHE_SECONDS,
    });
    if (error) throw error;
    return { url: supabase.storage.from(RENDER_BUCKET).getPublicUrl(path).data.publicUrl, panels };
  };

  const render: JCardRender = {
    version,
    pxPerMm: snapshot.pxPerMm,
    outside: await face('outside', snapshot.outside.canvas, toPanels(snapshot.outside.panels)),
    inside: snapshot.inside ? await face('inside', snapshot.inside.canvas, toPanels(snapshot.inside.panels)) : null,
  };
  const { error } = await supabase.from('jcards').update({ render }).eq('id', card.id);
  if (error) throw error;
  await removeOtherVersions(folder, version);
  return render;
}

/** Best-effort: remove every stored render of a card (the card was deleted). */
export async function deleteJCardRenders(userId: string, cardId: string): Promise<void> {
  await removeOtherVersions(`${userId}/${cardId}`, null);
}

async function removeOtherVersions(folder: string, keep: string | null): Promise<void> {
  try {
    const { data } = await supabase.storage.from(RENDER_BUCKET).list(folder, { limit: 100 });
    const stale = (data ?? []).filter((f) => f.id && (keep === null || !f.name.startsWith(`${keep}-`)));
    if (stale.length) await supabase.storage.from(RENDER_BUCKET).remove(stale.map((f) => `${folder}/${f.name}`));
  } catch { /* stale files only cost storage */ }
}

function toPanels(panels: JCardSnapshot['outside']['panels']): JCardRenderFace['panels'] {
  return Object.fromEntries(Object.entries(panels).filter(([, r]) => !!r)) as JCardRenderFace['panels'];
}

// --- Rendering after a save --------------------------------------------------------

const pending = new Map<string, { card: RenderableCard; timer: ReturnType<typeof setTimeout> }>();
/** Content hash each card was last rendered at, in this tab. */
const rendered = new Map<string, string>();
/** Set when the `render` column or the bucket is missing (step 3k not run yet): stop trying. */
let unavailable = false;
let queue: Promise<void> = Promise.resolve();

/**
 * Render a cloud card once it has gone quiet for a few seconds, and store the
 * result. Call after every successful cloud save; repeated calls just push the
 * render back. Never throws: a missing render only means the 3D view renders
 * the card itself.
 */
export function scheduleJCardRender(card: RenderableCard, delayMs = RENDER_DELAY_MS): void {
  if (typeof window === 'undefined' || !card.userId || unavailable) return;
  const existing = pending.get(card.id);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => run(card.id), delayMs);
  pending.set(card.id, { card: { id: card.id, userId: card.userId, content: card.content }, timer });
}

/** Start every scheduled render now, e.g. when the editor closes. */
export function flushJCardRenders(): void {
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer);
    run(id);
  }
}

function run(id: string) {
  const entry = pending.get(id);
  if (!entry) return;
  pending.delete(id);
  // One render at a time: each one mounts a card and holds a few large canvases.
  queue = queue.then(() => whenIdle()).then(() => renderAndStore(entry.card)).catch((err) => {
    console.warn('[jcardRenders] Could not store the J-card render', err);
  });
}

async function renderAndStore(card: RenderableCard) {
  const version = await jcardRenderVersion(card.content);
  if (rendered.get(card.id) === version) return;
  if ((await storedVersion(card.id)) === version) {
    rendered.set(card.id, version);
    return;
  }
  const { snapshotJCard } = await import('../lib/cassette3d/textures/jcardSnapshot');
  const snapshot = await snapshotJCard(card.content);
  // Images that failed to load would be baked into the render as blanks.
  // Leave it to the 3D view, which retries every time.
  if (snapshot.images.some((i) => !i.ok)) return;
  try {
    await uploadJCardRender(card, snapshot, version);
  } catch (err) {
    // Missing bucket or policies: same story as a missing column.
    unavailable = true;
    throw err;
  }
  rendered.set(card.id, version);
}

async function storedVersion(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('jcards').select('render').eq('id', id).maybeSingle();
  if (error) {
    // Most likely the column doesn't exist yet. Don't render anything this session.
    unavailable = true;
    throw error;
  }
  return (data as { render: JCardRender | null } | null)?.render?.version ?? null;
}

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 5000 });
    else setTimeout(resolve, 200);
  });
}
