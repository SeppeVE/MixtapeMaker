<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';
// Explicit imports (not auto-import) so this renders under a standalone
// createApp() in the PDF export path, which has no Nuxt component resolver.
import BackPanel from './parts/BackPanel.vue';
import Spine from './parts/Spine.vue';
import CoverFlap from './parts/CoverFlap.vue';
import ContentFlap from './parts/ContentFlap.vue';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { sanitizeJCardHtml } from '~/utils/jcardSanitize';

const props = defineProps<{ content: JCardContent }>();

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const content = computed(() => migrateJCardContent(props.content));

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
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundColor: content.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.backgroundImageUrl ? `url(${content.value.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined,
);

const classes = computed(() =>
  ['jcard', 'jcard-printable', content.value.isReversed ? 'reversed' : '', content.value.showCutGuides ? 'show-guides' : '']
    .filter(Boolean)
    .join(' '),
);
</script>

<template>
  <div :class="classes">
    <div v-if="content.continuousBackground" :style="continuousBgStyle" />
    <div :class="`jcard-part jcard-back${content.shortBack ? ' short' : ''}`" style="position:relative;z-index:1">
      <BackPanel :content="content" :sanitized-left="s.backLeft" :sanitized-right="s.backRight" />
    </div>
    <div class="jcard-part jcard-spine" style="position:relative;z-index:1">
      <Spine :content="content" :sanitized-top="s.spineTop" :sanitized-center="s.spineMid" :sanitized-bottom="s.spineBot" />
    </div>
    <div
      v-for="i in content.flaps"
      :key="i - 1"
      class="jcard-part"
      :style="{ width: FLAP_WIDTHS[i - 1], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }"
    >
      <CoverFlap v-if="i - 1 === 0" :content="content" :sanitized-cover="s.flaps[0]" />
      <ContentFlap v-else :content="content" :sanitized-content="s.flaps[i - 1]" :flap-index="i - 1" />
    </div>
  </div>
</template>
