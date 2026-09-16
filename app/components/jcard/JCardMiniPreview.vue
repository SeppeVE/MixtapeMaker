<script setup lang="ts">
import { computed } from 'vue';
import type { JCardContent } from '~/types';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { JCARD_HEIGHT_MM, SPINE_MM, FLAPS_MM } from './dimensions';

// Thumbnail of a card's spine + front flap, rendered from the real panel
// components so the artwork someone actually made is what they recognise in
// the library. Only the two panels you would see on a shelved cassette.
const props = defineProps<{ content: JCardContent; width?: number }>();

/** CSS defines mm as 1/25.4in and 1in as 96px, so this ratio is exact. */
const PX_PER_MM = 96 / 25.4;
const CARD_MM = SPINE_MM + FLAPS_MM[0];

const content = computed(() => migrateJCardContent(props.content));
const boxWidth = computed(() => props.width ?? 114);
const scale = computed(() => boxWidth.value / (CARD_MM * PX_PER_MM));
const boxHeight = computed(() => JCARD_HEIGHT_MM * PX_PER_MM * scale.value);

const html = computed(() => ({
  cover: sanitizeJCardHtml(content.value.flapContents[0] ?? ''),
  spineTop: sanitizeJCardHtml(content.value.spineTopContent),
  spineMid: sanitizeJCardHtml(content.value.spineCenterContent),
  spineBot: sanitizeJCardHtml(content.value.spineBottomContent),
}));

/** A card whose front has nothing on it yet gets skeleton geometry, never a blank box. */
const isBlank = computed(() => {
  const c = content.value;
  const text = (c.flapContents[0] ?? '').replace(/<[^>]*>/g, '').trim();
  return !text && !c.coverImageUrl && !c.backgroundImageUrl;
});

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
      <div class="jcl-mini-panel jcl-mini-spine" :style="{ width: `${SPINE_MM}mm` }">
        <Spine
          :content="content"
          :sanitized-top="html.spineTop"
          :sanitized-center="html.spineMid"
          :sanitized-bottom="html.spineBot"
        />
      </div>
      <div class="jcl-mini-panel" :style="{ width: `${FLAPS_MM[0]}mm` }">
        <div v-if="isBlank" class="jcl-mini-blank" :style="{ background: content.backgroundColor }">
          <span class="jcl-mini-bar jcl-mini-bar--title" />
          <span class="jcl-mini-bar" />
          <span class="jcl-mini-bar jcl-mini-bar--md" />
          <span class="jcl-mini-bar jcl-mini-bar--sm" />
          <span class="jcl-mini-flap" />
        </div>
        <CoverFlap v-else :content="content" :sanitized-cover="html.cover" />
      </div>
    </div>
  </div>
</template>
