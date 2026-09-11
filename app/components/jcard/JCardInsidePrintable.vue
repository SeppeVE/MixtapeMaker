<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';
// Explicit imports (not auto-import) so this renders under a standalone
// createApp() in the PDF export path, which has no Nuxt component resolver.
import Spine from './parts/Spine.vue';
import InsidePanel from './parts/InsidePanel.vue';
import InsideBackPanel from './parts/InsideBackPanel.vue';
import { resolveInsideContent } from './inside';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';

const props = defineProps<{ content: JCardContent }>();

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const content = computed(() => migrateJCardContent(props.content));
const insideContent = computed(() => resolveInsideContent(content.value));

const s = computed(() => {
  const flaps = content.value.insideFlapContents ?? Array(6).fill('');
  return {
    flaps: flaps.map(sanitizeJCardHtml),
    spine: sanitizeJCardHtml(content.value.insideSpineContent ?? ''),
    back: sanitizeJCardHtml(content.value.insideBackContent ?? ''),
  };
});

const classes = computed(() =>
  ['jcard', 'jcard-printable', content.value.isReversed ? 'reversed' : '', content.value.showCutGuides ? 'show-guides' : '']
    .filter(Boolean)
    .join(' '),
);

// Mirror image of the outside: last flap first, back panel last.
const reversedFlapIndices = computed(() =>
  Array.from({ length: content.value.flaps }, (_, i) => content.value.flaps - 1 - i),
);

const continuousInsideBgStyle = computed<CSSProperties | undefined>(() =>
  insideContent.value.continuousBackground
    ? {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundColor: insideContent.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: insideContent.value.backgroundImageUrl ? `url(${insideContent.value.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined,
);
</script>

<template>
  <div :class="classes">
    <div v-if="insideContent.continuousBackground" :style="continuousInsideBgStyle" />

    <div
      v-for="i in reversedFlapIndices"
      :key="i"
      class="jcard-part"
      :style="{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }"
    >
      <InsidePanel :content="content" :sanitized-content="s.flaps[i]" :flap-index="i" />
    </div>

    <div class="jcard-part jcard-spine" style="position:relative;z-index:1">
      <Spine :content="insideContent" sanitized-top="" :sanitized-center="s.spine" sanitized-bottom="" />
    </div>

    <div :class="`jcard-part jcard-back${content.shortBack ? ' short' : ''}`" style="position:relative;z-index:1">
      <InsideBackPanel :content="insideContent" :sanitized-content="s.back" />
    </div>
  </div>
</template>
