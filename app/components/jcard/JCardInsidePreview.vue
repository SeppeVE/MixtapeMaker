<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, type CSSProperties } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import type { JCardContent } from '~/types';
import { computeWidthMm, JCARD_HEIGHT_MM } from './dimensions';
import { resolveInsideContent, insideFlapVisibility } from './inside';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';

const props = defineProps<{ content: JCardContent }>();

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const content = computed(() => migrateJCardContent(props.content));
const insideContent = computed(() => resolveInsideContent(content.value));

const wrapperRef = ref<HTMLDivElement | null>(null);
const scale = ref(1);
const actual = ref(false);

const widthMm = computed(() => computeWidthMm(content.value));

function recompute() {
  const el = wrapperRef.value;
  if (!el || actual.value) return;
  const px = el.offsetWidth - 48;
  const natural = widthMm.value * (96 / 25.4);
  scale.value = Math.min(px / natural, 1);
}

onMounted(() => {
  recompute();
  useResizeObserver(wrapperRef, recompute);
});
watch([widthMm, actual], () => nextTick(recompute));

const s = computed(() => {
  const flaps = content.value.insideFlapContents ?? Array(6).fill('');
  return {
    flaps: flaps.map(sanitizeJCardHtml),
    spine: sanitizeJCardHtml(content.value.insideSpineContent ?? ''),
    back: sanitizeJCardHtml(content.value.insideBackContent ?? ''),
  };
});

// Mirror image of the outside: last flap first, back panel last.
const reversedFlapIndices = computed(() =>
  Array.from({ length: content.value.flaps }, (_, i) => content.value.flaps - 1 - i),
);

const visibility = computed(() => insideFlapVisibility(content.value.flaps));

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

const wrapperStyle = computed(() =>
  actual.value ? {} : { height: `calc(${JCARD_HEIGHT_MM}mm * ${scale.value} + 48px)` },
);
const cardStyle = computed(() => ({
  transform: actual.value ? 'none' : `scale(${scale.value})`,
  transformOrigin: 'top left',
  opacity: 1,
}));
</script>

<template>
  <div class="jcard-preview-root">
    <div class="jcard-preview-bar">
      <span class="jcard-preview-dim">
        {{ widthMm.toFixed(1) }} x {{ JCARD_HEIGHT_MM }} mm
        <span style="margin-left:6px;opacity:0.55;font-size:11px;font-family:var(--font-body)">
          inside, seen as if you flipped the card over like a book. Flaps marked "hidden when folded" end up face-down after an accordion fold.
        </span>
      </span>
      <button :class="`btn jcard-actual-btn${actual ? ' active' : ''}`" @click="actual = !actual">
        {{ actual ? 'Scale to fit' : 'Actual size' }}
      </button>
    </div>

    <div ref="wrapperRef" class="jcard-preview-wrapper" :style="wrapperStyle">
      <div :class="`jcard${content.isReversed ? ' reversed' : ''}`" :style="cardStyle">
        <div v-if="insideContent.continuousBackground" :style="continuousInsideBgStyle" />

        <div
          v-for="i in reversedFlapIndices"
          :key="i"
          class="jcard-part"
          :style="{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }"
        >
          <InsidePanel :content="content" :sanitized-content="s.flaps[i]" :flap-index="i" />
          <span v-if="visibility[i] === 'hidden'" class="jcard-fold-badge">hidden when folded</span>
        </div>

        <div class="jcard-part jcard-spine" style="position:relative;z-index:1">
          <Spine :content="insideContent" sanitized-top="" :sanitized-center="s.spine" sanitized-bottom="" />
        </div>

        <div :class="`jcard-part jcard-back${content.shortBack ? ' short' : ''}`" style="position:relative;z-index:1">
          <InsideBackPanel :content="insideContent" :sanitized-content="s.back" />
        </div>
      </div>
    </div>
  </div>
</template>
