<script setup lang="ts">
import type { CSSProperties } from 'vue';
import DOMPurify from 'dompurify';
import type { JCardContent } from '~/types';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { liftListColors } from '~/utils/htmlUtils';
import '~/assets/styles/jcard/jcard.css';

const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'br', 'span'];
const ALLOWED_ATTR = ['style', 'class'];
const FLAP_WIDTHS = ['65mm', '63.5mm', '61.5mm', '61.5mm', '62mm', '63.5mm'];

function san(html: string): string {
  if (typeof window === 'undefined') return html;
  const clean = DOMPurify.sanitize(
    html.replace(/<p>\s*<\/p>/g, '<p><br></p>').replace(/<p> <\/p>/g, '<p><br></p>'),
    { ALLOWED_TAGS, ALLOWED_ATTR, KEEP_CONTENT: true },
  );
  return liftListColors(clean);
}

const props = defineProps<{ content: JCardContent }>();

const content = computed(() => migrateJCardContent(props.content));

const s = computed(() => {
  const flaps = content.value.insideFlapContents ?? Array(6).fill('');
  return {
    flaps: flaps.map(san),
    spine: san(content.value.insideSpineContent ?? ''),
    back: san(content.value.insideBackContent ?? ''),
  };
});

const classes = computed(() =>
  ['jcard', 'jcard-printable', content.value.isReversed ? 'reversed' : '']
    .filter(Boolean).join(' ')
);

const reversedFlapIndices = computed(() =>
  Array.from({ length: content.value.flaps }, (_, i) => content.value.flaps - 1 - i)
);

// Use insideContinuousBackground if set, fall back to continuousBackground for old cards
const isContinuousInside = computed(
  () => content.value.insideContinuousBackground ?? content.value.continuousBackground
);

const continuousInsideBgStyle = computed<CSSProperties | undefined>(() =>
  isContinuousInside.value
    ? {
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundColor: content.value.insideBackgroundImageUrl ? 'transparent' : content.value.backgroundColor,
        backgroundImage: content.value.insideBackgroundImageUrl
          ? 'url(' + content.value.insideBackgroundImageUrl + ')'
          : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
      }
    : undefined
);

// Pass resolved inside settings to Spine (which reads continuousBackground + backgroundImageUrl)
const insideContent = computed(() => ({
  ...content.value,
  backgroundImageUrl: content.value.insideBackgroundImageUrl,
  continuousBackground: isContinuousInside.value,
}));

// Replaces the React forwardRef: parents grab the DOM node for html-to-image capture.
const rootEl = ref<HTMLDivElement | null>(null);
defineExpose({ rootEl });
</script>

<template>
  <div ref="rootEl" :class="classes">
    <div v-if="isContinuousInside" :style="continuousInsideBgStyle" />

    <div
      v-for="i in reversedFlapIndices"
      :key="i"
      class="jcard-part"
      :style="{ width: FLAP_WIDTHS[i], height: '100%', flexShrink: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }"
    >
      <InsidePanel :content="content" :sanitized-content="s.flaps[i]!" :flap-index="i" />
    </div>

    <div class="jcard-part jcard-spine" style="position: relative; z-index: 1">
      <Spine
        :content="insideContent"
        sanitized-top=""
        :sanitized-center="s.spine"
        sanitized-bottom=""
      />
    </div>

    <div
      :class="'jcard-part jcard-back' + (content.shortBack ? ' short' : '')"
      style="position: relative; z-index: 1"
    >
      <InsideBackPanel :content="content" :sanitized-content="s.back" />
    </div>
  </div>
</template>
