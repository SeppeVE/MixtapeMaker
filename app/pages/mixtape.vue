<script setup lang="ts">
import { useSeoMeta } from '#app';

const SEO_TITLE = 'Mixtape Editor: Plan a Cassette Tracklist from Spotify — Mixtape Maker';
const SEO_DESCRIPTION = 'Free online mixtape editor. Search Spotify, split your songs across Side A and Side B, and fit them to any tape length from C30 to C120 with live running times.';

useSeoMeta({
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  ogTitle: SEO_TITLE,
  ogDescription: SEO_DESCRIPTION,
});
useBreadcrumbs([{ name: 'Mixtape Editor', path: '/mixtape' }]);
</script>

<template>
  <!-- The page shell is prerendered for search engines; the editor itself reads
       the draft from localStorage, so it only mounts on the client. -->
  <div class="contents">
    <h1 class="sr-only">Mixtape Editor</h1>
    <ClientOnly>
      <MixtapeWorkspace>
        <ToolAbout tool="mixtape" />
      </MixtapeWorkspace>
      <!-- Prerendered stand-in: a screen of empty workspace, then the same
           about section, so the static HTML carries the page's real content. -->
      <template #fallback>
        <div class="editor">
          <div class="tool-placeholder" />
          <ToolAbout tool="mixtape" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
