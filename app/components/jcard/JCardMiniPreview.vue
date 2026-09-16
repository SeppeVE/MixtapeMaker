<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { JCARD_HEIGHT_MM, SPINE_MM, FLAPS_MM } from './dimensions';

// Thumbnail of a card's spine + front flap — the two panels you'd see on a
// shelved cassette. Shows each panel's background color/image only; see
// panelBg below for why the text itself is left out.
const props = defineProps<{ content: JCardContent; width?: number }>();

/** CSS defines mm as 1/25.4in and 1in as 96px, so this ratio is exact. */
const PX_PER_MM = 96 / 25.4;
const CARD_MM = SPINE_MM + FLAPS_MM[0];

const content = computed(() => migrateJCardContent(props.content));
const boxWidth = computed(() => props.width ?? 114);
const scale = computed(() => boxWidth.value / (CARD_MM * PX_PER_MM));
const boxHeight = computed(() => JCARD_HEIGHT_MM * PX_PER_MM * scale.value);

/** A card whose front has nothing on it yet gets skeleton geometry, never a blank box. */
const isBlank = computed(() => {
  const c = content.value;
  const text = (c.flapContents[0] ?? '').replace(/<[^>]*>/g, '').trim();
  return !text && !c.coverImageUrl && !c.backgroundImageUrl;
});

// Background only, no text — both panels render the same way at this size:
// rotated spine labels and stacked flap text both turn to noise once they're
// shrunk to a shelf-tape thumbnail, so the color/image underneath does the
// identifying instead. Mirrors Spine's and CoverFlap's own bg logic minus the
// text overlay. A continuous background is already drawn behind the whole
// card by the container below, so the panel itself stays transparent then.
const panelBg = computed<CSSProperties>(() => ({
  backgroundColor: content.value.continuousBackground
    ? 'transparent'
    : content.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
  backgroundImage: !content.value.continuousBackground && content.value.backgroundImageUrl
    ? `url(${content.value.backgroundImageUrl})`
    : undefined,
}));

// Matches JCardPreview: a continuous background is one image across the whole
// card, so it sits behind the panels instead of repeating inside each one.
const continuousStyle = computed(() =>
  content.value.continuousBackground
    ? {
        backgroundColor: content.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.backgroundImageUrl ? `url(${content.value.backgroundImageUrl})` : undefined,
      }
    : undefined,
);
</script>

<template>
  <div class="jcl-mini" :style="{ width: `${boxWidth}px`, height: `${boxHeight}px` }">
    <div
      :class="`jcl-mini-card${content.isReversed ? ' reversed' : ''}`"
      :style="{ width: `${CARD_MM}mm`, height: `${JCARD_HEIGHT_MM}mm`, transform: `scale(${scale})` }"
    >
      <div v-if="content.continuousBackground" class="jcl-mini-bg" :style="continuousStyle" />
      <div class="jcl-mini-panel jcl-mini-spine" :style="{ width: `${SPINE_MM}mm`, ...panelBg }" />
      <div class="jcl-mini-panel" :style="{ width: `${FLAPS_MM[0]}mm` }">
        <div v-if="isBlank" class="jcl-mini-blank" :style="{ background: content.backgroundColor }">
          <span class="jcl-mini-bar jcl-mini-bar--title" />
          <span class="jcl-mini-bar" />
          <span class="jcl-mini-bar jcl-mini-bar--md" />
          <span class="jcl-mini-bar jcl-mini-bar--sm" />
          <span class="jcl-mini-flap" />
        </div>
        <div v-else class="jcl-mini-art" :style="panelBg">
          <div v-if="content.coverImageUrl" class="jcl-mini-art-img" :style="{ backgroundImage: `url(${content.coverImageUrl})` }" />
        </div>
      </div>
    </div>
  </div>
</template>
