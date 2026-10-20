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
    <div class="sr-only">
      <h1>Cassette J-Card Designer</h1>
      <p>{{ SEO_DESCRIPTION }}</p>
    </div>
    <ClientOnly>
      <DesignerWorkspace />
    </ClientOnly>
  </div>
</template>
