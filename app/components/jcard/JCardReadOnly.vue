<script setup lang="ts">
import { watch } from 'vue';
import type { JCardContent } from '~/types';
import { registerCustomFonts } from '~/utils/fontManager';

// Display-only outside + inside previews for a card someone else made.
// The previews touch document/ResizeObserver, so they're client-only.
const props = defineProps<{ content: JCardContent }>();

watch(
  () => props.content.customFonts,
  (fonts) => {
    if (import.meta.client && fonts?.length) registerCustomFonts(fonts).catch(console.error);
  },
  { immediate: true },
);
</script>

<template>
  <ClientOnly>
    <div class="jcard-readonly">
      <JCardPreview :content="content" label="▧ Outside" />
      <JCardInsidePreview :content="content" label="◧ Inside" />
    </div>
    <template #fallback>
      <p class="jcard-readonly-loading">Loading card…</p>
    </template>
  </ClientOnly>
</template>
