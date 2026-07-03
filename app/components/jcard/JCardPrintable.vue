<script setup lang="ts">
import type { CSSProperties } from 'vue';
import DOMPurify from 'dompurify';
import type { JCardContent } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { liftListColors } from '~/utils/htmlUtils';
import '~/assets/styles/jcard/jcard.css';

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'br', 'span'];
const ALLOWED_ATTR = ['style', 'class'];

function san(html: string): string {
  if (typeof window === 'undefined') return html;
  const clean = DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
  return liftListColors(clean);
}

const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

const props = defineProps<{ content: JCardContent }>();

const content = computed(() => migrateJCardContent(props.content));

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
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundColor: content.value.backgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.backgroundImageUrl ? `url(${content.value.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }
    : undefined
);

const classes = computed(() =>
  [
    'jcard',
    'jcard-printable',
    content.value.isReversed ? 'reversed' : '',
    content.value.showCutGuides ? 'show-guides' : '',
  ].filter(Boolean).join(' ')
);

// Replaces the React forwardRef: parents grab the DOM node for html-to-image capture.
const rootEl = ref<HTMLDivElement | null>(null);
defineExpose({ rootEl });
</script>

<template>
  <div ref="rootEl" :class="classes">
    <div v-if="content.continuousBackground" :style="continuousBgStyle" />
    <div :class="`jcard-part jcard-back${content.shortBack ? ' short' : ''}`" style="position: relative; z-index: 1">
      <BackPanel :content="content" :sanitized-left="s.backLeft" :sanitized-right="s.backRight" />
    </div>
    <div class="jcard-part jcard-spine" style="position: relative; z-index: 1">
      <Spine :content="content" :sanitized-top="s.spineTop" :sanitized-center="s.spineMid" :sanitized-bottom="s.spineBot" />
    </div>
    <div
      v-for="i in content.flaps"
      :key="i - 1"
      class="jcard-part"
      :style="{ width: FLAP_WIDTHS[i - 1], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }"
    >
      <CoverFlap v-if="i === 1" :content="content" :sanitized-cover="s.flaps[0]!" />
      <ContentFlap v-else :content="content" :sanitized-content="s.flaps[i - 1]!" :flap-index="i - 1" />
    </div>
  </div>
</template>
