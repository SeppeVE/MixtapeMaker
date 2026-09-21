<script setup lang="ts">
import { computed } from 'vue';
import type { JCardContent } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';
import { JCARD_HEIGHT_MM, SPINE_MM, FLAPS_MM } from './dimensions';

// Live Explore-grid preview: the real Spine + CoverFlap parts at natural mm
// size, shrunk with a single shared `transform: scale(var(--jc-scale))` (set
// once per grid by ExploreJCards.vue) so text is never re-flowed or resized —
// line breaks match the full-size card exactly. Unlike JCardPreview, there is
// no asset-gating spinner: background color and text paint immediately, and
// images lazy-load in place. Custom fonts are intentionally NOT registered
// here (registerCustomFonts writes to the shared document.fonts, and
// same-named fonts from different cards would collide); text falls back to
// the curated font stack.
const props = defineProps<{ content: JCardContent }>();

const CARD_MM = SPINE_MM + FLAPS_MM[0];
const PX_PER_MM = 96 / 25.4;
const INTRINSIC_W = Math.round(CARD_MM * PX_PER_MM);
const INTRINSIC_H = Math.round(JCARD_HEIGHT_MM * PX_PER_MM);

const content = computed(() => migrateJCardContent(props.content));

// Prefer the small upload-time thumbnail over the original — Spine and
// CoverFlap just read `content.backgroundImageUrl` / `coverImageUrl`, so
// swapping it here is enough to make the whole preview use the thumb.
const previewContent = computed<JCardContent>(() => {
  const c = content.value;
  return {
    ...c,
    backgroundImageUrl: c.backgroundImageThumbUrl ?? c.backgroundImageUrl,
    coverImageUrl: c.coverImageThumbUrl ?? c.coverImageUrl,
  };
});

const isBlank = computed(() => {
  const c = content.value;
  const text = (c.flapContents[0] ?? '').replace(/<[^>]*>/g, '').trim();
  return !text && !c.coverImageUrl && !c.backgroundImageUrl;
});

const sanitizedCover = computed(() => sanitizeJCardHtml(content.value.flapContents[0] ?? ''));
const sanitizedSpineTop = computed(() => sanitizeJCardHtml(content.value.spineTopContent));
const sanitizedSpineCenter = computed(() => sanitizeJCardHtml(content.value.spineCenterContent));
const sanitizedSpineBottom = computed(() => sanitizeJCardHtml(content.value.spineBottomContent));

const continuousBgUrl = computed(() =>
  previewContent.value.continuousBackground ? previewContent.value.backgroundImageUrl : undefined,
);
const continuousBgColor = computed(() =>
  previewContent.value.continuousBackground && !continuousBgUrl.value ? previewContent.value.backgroundColor : undefined,
);

const boxStyle = computed(() => ({
  aspectRatio: `${CARD_MM} / ${JCARD_HEIGHT_MM}`,
  backgroundColor: content.value.backgroundColor,
  contentVisibility: 'auto' as const,
  containIntrinsicSize: `${INTRINSIC_W}px ${INTRINSIC_H}px`,
}));

const cardStyle = { width: `${CARD_MM}mm`, height: `${JCARD_HEIGHT_MM}mm` };
const spineStyle = { width: `${SPINE_MM}mm` };
const flapStyle = { width: `${FLAPS_MM[0]}mm` };
</script>

<template>
  <div class="jce-box" :style="boxStyle">
    <ClientOnly>
      <div :class="`jce-card${content.isReversed ? ' reversed' : ''}`" :style="cardStyle">
        <div v-if="continuousBgUrl || continuousBgColor" class="jce-continuous" :style="{ backgroundColor: continuousBgColor }">
          <img v-if="continuousBgUrl" :src="continuousBgUrl" loading="lazy" decoding="async" class="jce-continuous-img" alt="" >
        </div>
        <div class="jce-panel" :style="spineStyle">
          <Spine
            :content="previewContent"
            :sanitized-top="sanitizedSpineTop"
            :sanitized-center="sanitizedSpineCenter"
            :sanitized-bottom="sanitizedSpineBottom"
            as-img
          />
        </div>
        <div class="jce-panel" :style="flapStyle">
          <div v-if="isBlank" class="jcl-mini-blank" :style="{ background: content.backgroundColor }">
            <span class="jcl-mini-bar jcl-mini-bar--title" />
            <span class="jcl-mini-bar" />
            <span class="jcl-mini-bar jcl-mini-bar--md" />
            <span class="jcl-mini-bar jcl-mini-bar--sm" />
            <span class="jcl-mini-flap" />
          </div>
          <CoverFlap v-else :content="previewContent" :sanitized-cover="sanitizedCover" as-img />
        </div>
      </div>
      <template #fallback>
        <div class="jce-fallback" />
      </template>
    </ClientOnly>
  </div>
</template>
