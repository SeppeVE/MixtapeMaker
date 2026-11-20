// DEV ONLY: deletes a starter preset (DELETE /api/dev/jcard-presets?id=<id>).
// Removes app/presets/jcards/<id>.json and its image folder in
// public/presets/jcards/<id>/. A 404 in production builds, like the save route.
import { rm, access } from 'node:fs/promises';
import { join } from 'node:path';

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 });

  const id = String(getQuery(event).id ?? '');
  // Same shape the save route produces; also keeps the path inside the folder.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw createError({ statusCode: 400, message: 'Invalid preset id' });
  }

  const root = process.cwd();
  const jsonPath = join(root, 'app', 'presets', 'jcards', `${id}.json`);
  try {
    await access(jsonPath);
  } catch {
    throw createError({ statusCode: 404, message: `No preset app/presets/jcards/${id}.json` });
  }
  await rm(jsonPath);
  await rm(join(root, 'public', 'presets', 'jcards', id), { recursive: true, force: true });

  return { id, path: `app/presets/jcards/${id}.json` };
});
