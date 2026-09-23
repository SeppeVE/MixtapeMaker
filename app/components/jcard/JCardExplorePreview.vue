<script setup lang="ts">
import { computed, watch } from 'vue';
import type { CustomFont, JCardContent } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';
import { registerCustomFonts, renameFontFamilies, scopedFontFamily } from '~/utils/fontManager';
import { JCARD_HEIGHT_MM, SPINE_MM, FLAPS_MM } from './dimensions';

// Live Explore-grid preview: the real Spine + CoverFlap parts at natural mm
// size, shrunk with a single shared `transform: scale(var(--jc-scale))` (set
// once per grid by ExploreJCards.vue) so text is never re-flowed or resized —
// line breaks match the full-size card exactly. Unlike JCardPreview, there is
// no asset-gating spinner: background color and text paint immediately, and
// images lazy-load in place. Custom fonts arrive separately (`fonts`, fetched
// by ExploreJCards.vue after the page paints) and are registered under a
// per-card family name (`fontScope`), because document.fonts is shared and
// same-named fonts from different cards would otherwise collide. Until they
// load, text paints in the fallback font.
const props = defineProps<{ content: JCardContent; fonts?: CustomFont[]; fontScope?: string }>();

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

const scopedFonts = computed<CustomFont[]>(() =>
  props.fonts?.length && props.fontScope
    ? props.fonts.map((f) => ({ ...f, name: scopedFontFamily(f.name, props.fontScope!) }))
    : [],
);
const fontRename = computed(() =>
  new Map(props.fontScope ? (props.fonts ?? []).map((f) => [f.name, scopedFontFamily(f.name, props.fontScope!)]) : []),
);

watch(scopedFonts, (fonts) => {
  if (import.meta.client && fonts.length) registerCustomFonts(fonts).catch(console.error);
}, { immediate: true });

const render = (html: string) => renameFontFamilies(sanitizeJCardHtml(html), fontRename.value);
const sanitizedCover = computed(() => render(content.value.flapContents[0] ?? ''));
const sanitizedSpineTop = computed(() => render(content.value.spineTopContent));
const sanitizedSpineCenter = computed(() => render(content.value.spineCenterContent));
const sanitizedSpineBottom = computed(() => render(content.value.spineBottomContent));

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

<style scoped>
/* ═══════════════════════════════════════════════════════
   Explore grid J-card preview — live spine + cover flap
   ═══════════════════════════════════════════════════════ */

/* Fixed aspect-ratio cell: the grid layout never reflows regardless of
   scroll/load state. contain:strict + content-visibility:auto let the
   browser skip layout/paint for off-screen cards; contain-intrinsic-size
   gives it a placeholder size before it's ever been rendered. No
   will-change — it blurs the scaled text in Chrome. Border/shadow live on
   the wrapping .jce-grid-card, not here — this is the "header" of that card. */
.jce-box {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-bottom: 2px solid var(--color-text);
  contain: strict;
}

.jce-fallback {
  width: 100%;
  height: 100%;
}

/* Natural mm-sized card (width/height set inline from dimensions.ts),
   shrunk with a single transform driven by --jc-scale — set once per grid
   by ExploreJCards.vue, never per card. Fonts are never resized and text is
   never re-flowed here, so line breaks match the full-size card exactly. */
.jce-card {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  transform: scale(var(--jc-scale, 1));
  display: flex;
  flex-direction: row;
}

.jce-card.reversed {
  flex-direction: row-reverse;
}

.jce-panel {
  height: 100%;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;
  /* Stacked above .jce-continuous so a transparent panel still shows the
     continuous image through it, instead of painting in normal DOM order. */
  z-index: 1;
}

.jce-continuous {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.jce-continuous-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
