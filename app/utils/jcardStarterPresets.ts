import type { JCard, JCardContent } from '../types';
import { buildBlankJCardContent, migrateJCardContent } from './jcardDefaults';
import placeholderCover from '../assets/images/placeholder.jpg';

/**
 * Starter presets: complete example J-cards (fake title, tracklist, styling)
 * that a brand-new card opens with, picked at random.
 *
 * Each preset is a JSON file in `app/presets/jcards/`, bundled at build time.
 * Add one by dropping a file there, or design it in the designer and use the
 * dev-only "Save as preset" button, which writes the file for you.
 *
 * File shape (`<id>.json`):
 *   { "label": "Night Drive", "title": "Night Drive Vol. 2", "content": { …JCardContent } }
 *
 * `content` is merged over `buildBlankJCardContent()`, so a hand-written file
 * only needs the fields it changes. A `null` value means "explicitly empty"
 * (e.g. `"coverImageUrl": null` for no cover image instead of the placeholder).
 * Preset images live in `public/presets/jcards/<id>/` and are referenced as
 * `/presets/jcards/<id>/<file>`.
 */
export interface StarterPresetFile {
  label: string;
  title: string;
  content: Partial<Record<keyof JCardContent, unknown>>;
}

export interface StarterPreset extends StarterPresetFile {
  id: string;
}

const files = import.meta.glob<StarterPresetFile>('../presets/jcards/*.json', {
  eager: true,
  import: 'default',
});

export const STARTER_PRESETS: StarterPreset[] = Object.entries(files)
  .map(([path, file]) => ({ ...file, id: path.split('/').pop()!.replace(/\.json$/, '') }))
  .sort((a, b) => a.id.localeCompare(b.id));

function nullsToUndefined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null) out[k] = undefined;
    else if (Array.isArray(v)) out[k] = v.map((x) => (x === null ? undefined : x));
    else out[k] = v;
  }
  return out as T;
}

export function starterPresetContent(preset: StarterPreset): JCardContent {
  const merged = { ...buildBlankJCardContent(), ...nullsToUndefined(preset.content) } as JCardContent;
  return migrateJCardContent(merged);
}

/** A random starter preset, or null when the presets folder is empty. */
export function pickRandomStarterPreset(): StarterPreset | null {
  if (!STARTER_PRESETS.length) return null;
  return STARTER_PRESETS[Math.floor(Math.random() * STARTER_PRESETS.length)];
}

// Content keys that only point at upload-time thumbnails. Presets never carry
// them: the Explore grid falls back to the full image.
const THUMB_KEYS = ['coverImageThumbUrl', 'backgroundImageThumbUrl'] as const;

/**
 * Turn the card open in the designer into a preset file body. Used by the
 * dev-only "Save as preset" action; the dev server route then moves any
 * uploaded or inlined images into `public/presets/jcards/<id>/`.
 */
export function cardToStarterPresetFile(card: JCard, label: string): StarterPresetFile {
  const content: Record<string, unknown> = { ...card.content };
  for (const key of THUMB_KEYS) delete content[key];
  delete content.coverContent;
  delete content.insideContent;
  // The placeholder is a hashed build asset whose URL differs between dev and
  // production, so leave the key out and let the blank default supply it.
  if (content.coverImageUrl === placeholderCover) delete content.coverImageUrl;
  // Undefined would vanish from JSON and the merge would bring the
  // placeholder back, so "no image" is written as null.
  for (const [k, v] of Object.entries(content)) {
    if (v === undefined) content[k] = null;
    else if (Array.isArray(v)) content[k] = v.map((x) => (x === undefined ? null : x));
  }
  return { label, title: card.title, content };
}
