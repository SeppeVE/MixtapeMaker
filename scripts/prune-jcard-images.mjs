#!/usr/bin/env node
// One-off cleanup for the `jcard-images` bucket: lists every file no J-card
// points at any more (replaced covers and backgrounds, their thumbnails, the
// folders of deleted cards) and, with --delete, removes them.
//
// Needs the service-role key, since it reads every user's cards and files:
//
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/prune-jcard-images.mjs            # dry run: list only
//   node scripts/prune-jcard-images.mjs --delete   # actually remove them
//
// Files younger than a day are left alone, so an image someone is placing on
// a card right now is never mistaken for an orphan.

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'jcard-images';
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const PAGE = 1000;

const url = process.env.SUPABASE_URL ?? process.env.NUXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const doDelete = process.argv.includes('--delete');
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Same matching as referencedJCardImagePaths() in app/utils/supabaseImages.ts.
const BUCKET_PATH_RE = new RegExp(`/${BUCKET}/([^"?#\\s]+)`, 'g');

async function referencedPaths() {
  const paths = new Set();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('jcards').select('content').range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data) {
      for (const match of JSON.stringify(row.content).matchAll(BUCKET_PATH_RE)) {
        try { paths.add(decodeURIComponent(match[1])); } catch { paths.add(match[1]); }
      }
    }
    if (data.length < PAGE) break;
  }
  return paths;
}

/** Every file under `prefix`, recursing into folders. */
async function listAll(prefix) {
  const files = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) files.push({ path, size: entry.metadata?.size ?? 0, createdAt: entry.created_at });
      else files.push(...(await listAll(path)));
    }
    if (data.length < PAGE) break;
  }
  return files;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const referenced = await referencedPaths();
const files = await listAll('');
const now = Date.now();
const orphans = files.filter((f) =>
  !referenced.has(f.path) && now - new Date(f.createdAt).getTime() > MIN_AGE_MS);

const total = files.reduce((sum, f) => sum + f.size, 0);
const orphanTotal = orphans.reduce((sum, f) => sum + f.size, 0);
for (const f of orphans) console.log(`${mb(f.size).padStart(10)}  ${f.path}`);
console.log(`\n${files.length} files (${mb(total)}) in ${BUCKET}, ${referenced.size} referenced by a card.`);
console.log(`${orphans.length} orphaned files (${mb(orphanTotal)}).`);

if (!doDelete) {
  console.log('Dry run: nothing deleted. Re-run with --delete to remove them.');
  process.exit(0);
}
for (let i = 0; i < orphans.length; i += 100) {
  const batch = orphans.slice(i, i + 100).map((f) => f.path);
  const { error } = await supabase.storage.from(BUCKET).remove(batch);
  if (error) throw error;
}
console.log(`Deleted ${orphans.length} files.`);
