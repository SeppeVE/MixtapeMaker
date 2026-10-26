<script setup lang="ts">
import { useSeoMeta } from '#app';

const SEO_TITLE = 'Cassette J-Card Maker: Free Printable J-Card Template — Mixtape Maker';
const SEO_DESCRIPTION = 'Design a cassette J-card online for free. Add your tracklist, cover art and spine text, then export a print-ready PDF to cut, fold and slip into your tape case.';

useSeoMeta({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  ogTitle: SEO_TITLE,
  ogDescription: SEO_DESCRIPTION,
});
useBreadcrumbs([{ name: 'J-Card Designer', path: '/cards/designer' }]);
</script>

<template>
  <!-- The page shell is prerendered for search engines; the designer itself
       reads the active card from localStorage, so it only mounts on the client. -->
  <div class="contents">
    <h1 class="sr-only">Cassette J-Card Designer</h1>
    <ClientOnly>
      <DesignerWorkspace>
        <ToolAbout tool="designer" />
      </DesignerWorkspace>
      <!-- Prerendered stand-in: a screen of empty workspace, then the same
           about section, so the static HTML carries the page's real content. -->
      <template #fallback>
        <div class="editor">
          <div class="tool-placeholder" />
          <ToolAbout tool="designer" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
