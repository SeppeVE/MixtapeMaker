/**
 * Post-build prerender script.
 * Runs after `vite build` and `vite build --ssr` to inject server-rendered HTML
 * into the static index.html, giving crawlers full page content.
 *
 * Only the homepage (/) is prerendered — app pages (/editor, /library, etc.)
 * are authenticated and have no crawlable content.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbs = (p) => path.resolve(__dirname, p);

const template = fs.readFileSync(toAbs('dist/index.html'), 'utf-8');
const { render } = await import('./dist/entry-server.js');

const routes = ['/'];

for (const url of routes) {
  const appHtml = render(url);
  const html = template.replace(
    '<div id="root"></div>',
    `<div id="root">${appHtml}</div>`
  );

  const outPath =
    url === '/'
      ? toAbs('dist/index.html')
      : toAbs(`dist${url}/index.html`);

  if (url !== '/') fs.mkdirSync(path.dirname(outPath), { recursive: true });

  fs.writeFileSync(outPath, html);
  console.log(`[prerender] ${url} → ${outPath}`);
}

console.log('[prerender] Done.');
