<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';
// Explicit imports (not auto-import) so this renders under a standalone
// createApp() in the PDF export path, which has no Nuxt component resolver.
import Spine from './parts/Spine.vue';
import InsidePanel from './parts/InsidePanel.vue';
import InsideBackPanel from './parts/InsideBackPanel.vue';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';

const props = defineProps<{ content: JCardContent }>();

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const content = computed(() => migrateJCardContent(props.content));

const s = computed(() => {
  const flaps = content.value.insideFlapContents ?? Array(6).fill('');
  return {
    flaps: flaps.map(sanitizeJCardHtml),
    spine: sanitizeJCardHtml(content.value.insideSpineContent ?? ''),
    back: sanitizeJCardHtml(content.value.insideBackContent ?? ''),
  };
});

const classes = computed(() =>
  ['jcard', 'jcard-printable', content.value.isReversed ? 'reversed' : ''].filter(Boolean).join(' '),
);

const reversedFlapIndices = computed(() =>
  Array.from({ length: content.value.flaps }, (_, i) => content.value.flaps - 1 - i),
);

const isContinuousInside = computed(() => content.value.insideContinuousBackground ?? content.value.continuousBackground);

const continuousInsideBgStyle = computed<CSSProperties | undefined>(() =>
  isContinuousInside.value
    ? {
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundColor: content.value.insideBackgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.insideBackgroundImageUrl ? `url(${content.value.insideBackgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined,
);

const insideContent = computed(() => ({
  ...content.value,
  backgroundImageUrl: content.value.insideBackgroundImageUrl,
  continuousBackground: isContinuousInside.value,
}));
</script>

<template>
  <div :class="classes">
    <div v-if="isContinuousInside" :style="continuousInsideBgStyle" />

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
      <InsideBackPanel :content="content" :sanitized-content="s.back" />
    </div>
  </div>
</template>
