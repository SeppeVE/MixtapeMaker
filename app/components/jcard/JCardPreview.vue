<script setup lang="ts">
import type { CSSProperties } from 'vue';
import DOMPurify from 'dompurify';
import type { JCardContent } from '~/types';
import { FLAPS_MM, BACK_FULL_MM, BACK_SHORT_MM, SPINE_MM } from './dimensions';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { liftListColors } from '~/utils/htmlUtils';
import '~/assets/styles/jcard/jcard.css';
import '~/assets/styles/jcard/JCardPreview.css';
import '~/assets/styles/utilities.css';

/** Wait for all image URLs and document fonts to be ready. */
function waitForAssets(content: JCardContent): Promise<void> {
  const urls = [content.backgroundImageUrl, content.coverImageUrl]
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  const imagePromises = urls.map(url => new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  }));

  const fontPromise: Promise<void> =
    (document as any).fonts?.ready?.then(() => undefined) ?? Promise.resolve();

  return Promise.all([fontPromise, ...imagePromises]).then(() => undefined);
}

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'br', 'span'];
const ALLOWED_ATTR = ['style', 'class'];

function san(html: string) {
  if (typeof window === 'undefined') return html;
  const clean = DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
  return liftListColors(clean);
}

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const props = defineProps<{ content: JCardContent }>();

const content = computed(() => migrateJCardContent(props.content));
const wrapperRef = ref<HTMLDivElement | null>(null);
const scale = ref(1);
const actual = ref(false);
const isReady = ref(false);

// Wait for fonts + images before revealing the card so it never flashes
// a half-loaded state. The card stays mounted so scale calculation works.
// Only re-gate when the actual image URLs change, not on every edit.
watch(
  () => [content.value.backgroundImageUrl, content.value.coverImageUrl],
  () => {
    let cancelled = false;
    isReady.value = false;
    waitForAssets(content.value).then(() => {
      if (!cancelled) isReady.value = true;
    });
    onWatcherCleanup(() => { cancelled = true; });
  },
  { immediate: true }
);

const totalWidthMm = computed(
  () =>
    (content.value.shortBack ? BACK_SHORT_MM : BACK_FULL_MM) +
    SPINE_MM +
    FLAPS_MM.slice(0, content.value.flaps).reduce((a, b) => a + b, 0)
);

let obs: ResizeObserver | null = null;

const computeScale = () => {
  const el = wrapperRef.value;
  if (!el || actual.value) return;
  const px = el.offsetWidth - 48;
  const natural = totalWidthMm.value * (96 / 25.4);
  scale.value = Math.min(px / natural, 1);
};

onMounted(() => {
  computeScale();
  obs = new ResizeObserver(computeScale);
  if (wrapperRef.value) obs.observe(wrapperRef.value);
});
onUnmounted(() => obs?.disconnect());
watch([totalWidthMm, actual], () => nextTick(computeScale));

const s = computed(() => ({
  flaps: content.value.flapContents.map(san),
  spineTop: san(content.value.spineTopContent),
  spineMid: san(content.value.spineCenterContent),
  spineBot: san(content.value.spineBottomContent),
  backLeft: san(content.value.backLeftContent),
  backRight: san(content.value.backRightContent),
}));

const continuousBgStyle = computed<CSSProperties | undefined>(() =>
  content.value.continuousBackground
    ? {
        backgroundColor: content.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.backgroundImageUrl ? `url(${content.value.backgroundImageUrl})` : undefined,
      }
    : undefined
);
</script>

<template>
  <div class="jcard-preview-root">
    <div class="jcard-preview-bar">
      <span class="jcard-preview-dim">{{ totalWidthMm.toFixed(1) }} × 102 mm</span>
      <button
        :class="`btn jcard-actual-btn${actual ? ' active' : ''}`"
        @click="actual = !actual"
      >{{ actual ? 'Scale to fit' : 'Actual size' }}</button>
    </div>

    <div
      ref="wrapperRef"
      class="jcard-preview-wrapper"
      :style="{ height: actual ? undefined : `calc(102mm * ${scale} + 48px)` }"
    >
      <div v-if="!isReady" class="jcard-loader">
        <svg class="jcard-loader-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
            stroke-dasharray="40 20"
          />
        </svg>
        <span class="jcard-loader-label">Loading card…</span>
      </div>
      <div
        :class="`jcard jcard-scale-container transform-origin-top-left${content.isReversed ? ' reversed' : ''}${isReady ? ' transition-opacity opacity-100' : ' transition-none opacity-0'}`"
        :style="{ transform: actual ? 'none' : `scale(${scale})` }"
      >
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
          <CoverFlap v-if="i === 1" :content="content" :sanitized-cover="s.flaps[0]!" />
          <ContentFlap v-else :content="content" :sanitized-content="s.flaps[i - 1]!" :flap-index="i - 1" />
        </div>
      </div>
    </div>
  </div>
</template>
