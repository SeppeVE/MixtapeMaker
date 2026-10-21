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
//   node scripts/prune-jcard-images.mjs --show-used
//       # also list the files still in use, grouped by the card using them,
//       # with a link to each card (set SITE_URL for full links)
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
const showUsed = process.argv.includes('--show-used');
const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Same matching as referencedJCardImagePaths() in app/utils/supabaseImages.ts.
const BUCKET_PATH_RE = new RegExp(`/${BUCKET}/([^"?#\\s]+)`, 'g');

/** Every card, with the bucket paths its content points at. */
async function loadCards() {
  const cards = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('jcards')
      .select('id, title, user_id, is_public, is_copy, content')
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const row of data) {
      const paths = new Set();
      for (const match of JSON.stringify(row.content).matchAll(BUCKET_PATH_RE)) {
        try { paths.add(decodeURIComponent(match[1])); } catch { paths.add(match[1]); }
      }
      cards.push({ ...row, paths });
    }
    if (data.length < PAGE) break;
  }
  return cards;
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

const cards = await loadCards();
const referenced = new Set(cards.flatMap((c) => [...c.paths]));
const files = await listAll('');
const now = Date.now();
const orphans = files.filter((f) =>
  !referenced.has(f.path) && now - new Date(f.createdAt).getTime() > MIN_AGE_MS);

if (showUsed) {
  const byPath = new Map(files.map((f) => [f.path, f]));
  console.log('Files in use, by card:\n');
  for (const card of cards) {
    const used = [...card.paths].map((p) => byPath.get(p)).filter(Boolean);
    if (!used.length) continue;
    const visibility = card.is_copy ? 'copy, private' : card.is_public ? 'public' : 'private';
    const size = used.reduce((sum, f) => sum + f.size, 0);
    console.log(`${card.title || 'Untitled J-Card'}  (${visibility}, ${mb(size)})`);
    console.log(`  card:  ${siteUrl}/jcard/${card.id}`);
    console.log(`  owner: ${card.user_id}`);
    for (const f of used) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(f.path);
      console.log(`  ${mb(f.size).padStart(10)}  ${data.publicUrl}`);
    }
    console.log('');
  }
  console.log('---\n');
}

const total = files.reduce((sum, f) => sum + f.size, 0);
const orphanTotal = orphans.reduce((sum, f) => sum + f.size, 0);
console.log('Orphaned files:\n');
for (const f of orphans) {
  console.log(`${mb(f.size).padStart(10)}  ${supabase.storage.from(BUCKET).getPublicUrl(f.path).data.publicUrl}`);
}
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
