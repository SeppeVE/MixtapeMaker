<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, type CSSProperties } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import type { JCardContent } from '~/types';
import { FLAPS_MM, BACK_FULL_MM, BACK_SHORT_MM, SPINE_MM } from './dimensions';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';

const props = defineProps<{ content: JCardContent }>();

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const content = computed(() => migrateJCardContent(props.content));

const wrapperRef = ref<HTMLDivElement | null>(null);
const scale = ref(1);
const actual = ref(false);
const isReady = ref(false);

/** Wait for image URLs and document fonts before revealing the card. */
function waitForAssets(c: JCardContent): Promise<void> {
  const urls = [c.backgroundImageUrl, c.coverImageUrl].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );
  const imagePromises = urls.map(
    (url) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    }),
  );
  const fontPromise: Promise<void> =
    (document as any).fonts?.ready?.then(() => undefined) ?? Promise.resolve();
  return Promise.all([fontPromise, ...imagePromises]).then(() => undefined);
}

const totalWidthMm = computed(() =>
  (content.value.shortBack ? BACK_SHORT_MM : BACK_FULL_MM) +
  SPINE_MM +
  FLAPS_MM.slice(0, content.value.flaps).reduce((a, b) => a + b, 0),
);

function recompute() {
  const el = wrapperRef.value;
  if (!el || actual.value) return;
  const px = el.offsetWidth - 48;
  const natural = totalWidthMm.value * (96 / 25.4);
  scale.value = Math.min(px / natural, 1);
}

onMounted(() => {
  recompute();
  useResizeObserver(wrapperRef, recompute);
});
watch([totalWidthMm, actual], () => nextTick(recompute));

// Asset-gate: re-gate only when the actual image URLs change.
watch(
  () => [content.value.backgroundImageUrl, content.value.coverImageUrl],
  (_new, _old, onCleanup) => {
    isReady.value = false;
    let cancelled = false;
    onCleanup(() => { cancelled = true; });
    waitForAssets(content.value).then(() => {
      if (!cancelled) isReady.value = true;
    });
  },
  { immediate: true },
);

const s = computed(() => ({
  flaps: content.value.flapContents.map(sanitizeJCardHtml),
  spineTop: sanitizeJCardHtml(content.value.spineTopContent),
  spineMid: sanitizeJCardHtml(content.value.spineCenterContent),
  spineBot: sanitizeJCardHtml(content.value.spineBottomContent),
  backLeft: sanitizeJCardHtml(content.value.backLeftContent),
  backRight: sanitizeJCardHtml(content.value.backRightContent),
}));

const continuousBgStyle = computed<CSSProperties | undefined>(() =>
  content.value.continuousBackground
    ? {
        backgroundColor: content.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.backgroundImageUrl ? `url(${content.value.backgroundImageUrl})` : undefined,
      }
    : undefined,
);

const wrapperStyle = computed(() =>
  actual.value ? {} : { height: `calc(102mm * ${scale.value} + 48px)` },
);
const cardStyle = computed(() => ({ transform: actual.value ? 'none' : `scale(${scale.value})` }));
const cardClass = computed(() =>
  `jcard jcard-scale-container transform-origin-top-left${content.value.isReversed ? ' reversed' : ''}${isReady.value ? ' transition-opacity opacity-100' : ' transition-none opacity-0'}`,
);
</script>

<template>
  <div class="jcard-preview-root">
    <div class="jcard-preview-bar">
      <span class="jcard-preview-dim">{{ totalWidthMm.toFixed(1) }} × 102 mm</span>
      <button :class="`btn jcard-actual-btn${actual ? ' active' : ''}`" @click="actual = !actual">
        {{ actual ? 'Scale to fit' : 'Actual size' }}
      </button>
    </div>

    <div ref="wrapperRef" class="jcard-preview-wrapper" :style="wrapperStyle">
      <div v-if="!isReady" class="jcard-loader">
        <svg class="jcard-loader-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 20" />
        </svg>
        <span class="jcard-loader-label">Loading card…</span>
      </div>
      <div :class="cardClass" :style="cardStyle">
        <div v-if="content.continuousBackground" class="jcard-continuous-bg bg-cover" :style="continuousBgStyle" />
        <div :class="`jcard-part jcard-back jcard-part-positioned${content.shortBack ? ' short' : ''}`">
          <BackPanel :content="content" :sanitized-left="s.backLeft" :sanitized-right="s.backRight" />
        </div>
        <div class="jcard-part jcard-spine jcard-part-positioned">
          <Spine :content="content" :sanitized-top="s.spineTop" :sanitized-center="s.spineMid" :sanitized-bottom="s.spineBot" />
        </div>
        <div
          v-for="i in content.flaps"
          :key="i - 1"
          class="jcard-part jcard-flap"
          :style="{ width: FLAP_WIDTHS[i - 1] }"
        >
          <CoverFlap v-if="i - 1 === 0" :content="content" :sanitized-cover="s.flaps[0]" />
          <ContentFlap v-else :content="content" :sanitized-content="s.flaps[i - 1]" :flap-index="i - 1" />
        </div>
      </div>
    </div>
  </div>
</template>
