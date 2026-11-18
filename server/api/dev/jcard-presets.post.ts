// DEV ONLY: saves the J-card open in the designer as a starter preset.
//
// Writes app/presets/jcards/<id>.json and moves the card's images into
// public/presets/jcards/<id>/ so the preset doesn't depend on someone's
// Supabase upload (which the owner's image pruning could later delete) or on
// a multi-megabyte inlined data: URL. The JSON is bundled into the app at
// build time, so commit both folders to ship a new preset.
//
// `import.meta.dev` is false in production builds, so there this route is a 404
// and the file-system code below is never reached.
import { mkdir, readdir, rm, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const SINGLE_IMAGE_KEYS = [
  'coverImageUrl', 'backgroundImageUrl', 'insideBackgroundImageUrl',
  'backPanelImageUrl', 'insideBackPanelImageUrl',
] as const;
const ARRAY_IMAGE_KEYS = ['flapImageUrls', 'insideFlapImageUrls'] as const;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif',
};

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 });

  const body = await readBody<{ label?: string; title?: string; content?: Record<string, unknown> }>(event);
  const label = body?.label?.trim();
  if (!label || !body?.content || typeof body.content !== 'object') {
    throw createError({ statusCode: 400, message: 'A label and the card content are required' });
  }
  const id = slugify(label);
  if (!id) throw createError({ statusCode: 400, message: 'The preset name needs at least one letter or digit' });

  const root = process.cwd();
  const presetDir = join(root, 'app', 'presets', 'jcards');
  if (!(await exists(presetDir))) {
    throw createError({ statusCode: 500, message: `Run the dev server from the repo root (no ${presetDir})` });
  }
  const imageDir = join(root, 'public', 'presets', 'jcards', id);
  const publicPrefix = `/presets/jcards/${id}/`;
  const content = { ...body.content };
  const kept = new Set<string>();
  let counter = 0;

  // Returns the URL the preset should use for one image, writing the file
  // when it came from an upload or a data: URL.
  async function localise(url: unknown, name: string): Promise<unknown> {
    if (typeof url !== 'string' || !url) return url;
    if (url.startsWith(publicPrefix)) {
      kept.add(url.slice(publicPrefix.length));
      return url;
    }
    if (url.startsWith('/presets/')) return url; // another preset's image: leave it
    let bytes: Buffer;
    let mime: string;
    const dataMatch = url.match(/^data:([^;,]+);base64,(.*)$/s);
    if (dataMatch) {
      mime = dataMatch[1];
      bytes = Buffer.from(dataMatch[2], 'base64');
    } else if (/^https?:\/\//.test(url)) {
      const res = await fetch(url);
      if (!res.ok) throw createError({ statusCode: 502, message: `Could not download ${url} (${res.status})` });
      mime = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      bytes = Buffer.from(await res.arrayBuffer());
    } else {
      // A build asset path from this dev server (/_nuxt/…) won't exist in a
      // production build, so drop it rather than ship a broken image.
      return null;
    }
    const ext = EXT_BY_MIME[mime] ?? 'img';
    const file = `${name}-${Date.now()}-${counter++}.${ext}`;
    await mkdir(imageDir, { recursive: true });
    await writeFile(join(imageDir, file), bytes);
    kept.add(file);
    return publicPrefix + file;
  }

  for (const key of SINGLE_IMAGE_KEYS) {
    if (key in content) content[key] = await localise(content[key], key.replace(/Url$/, ''));
  }
  for (const key of ARRAY_IMAGE_KEYS) {
    const arr = content[key];
    if (Array.isArray(arr)) {
      content[key] = await Promise.all(arr.map((u, i) => localise(u, `${key.replace(/Urls$/, '')}-${i}`)));
    }
  }

  // Images an earlier save of this preset wrote but the design no longer uses.
  if (await exists(imageDir)) {
    for (const file of await readdir(imageDir)) {
      if (!kept.has(file)) await rm(join(imageDir, file));
    }
    if (!kept.size) await rm(imageDir, { recursive: true, force: true });
  }

  const jsonPath = join(presetDir, `${id}.json`);
  const overwritten = await exists(jsonPath);
  const file = { label, title: body.title ?? label, content };
  await writeFile(jsonPath, JSON.stringify(file, null, 2) + '\n');

  return { id, path: `app/presets/jcards/${id}.json`, overwritten };
});
