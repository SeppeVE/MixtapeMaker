<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{
  content: JCardContent;
  sanitizedContent: string;
}>();

const isRev = computed(() => props.content.isReversed);

// Use insideContinuousBackground if set, fall back to continuousBackground for old cards
const isContinuous = computed(
  () => props.content.insideContinuousBackground ?? props.content.continuousBackground
);

// Per-panel image overrides the global inside background image when set
const panelBgImage = computed(
  () => props.content.insideBackPanelImageUrl || props.content.insideBackgroundImageUrl
);

const bg = computed<CSSProperties>(() => ({
  backgroundColor: isContinuous.value
    ? 'transparent'
    : panelBgImage.value ? 'transparent' : (props.content.backgroundColor || '#ffffff'),
  backgroundImage: !isContinuous.value && panelBgImage.value
    ? `url(${panelBgImage.value})`
    : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
}));

const containerStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: 'var(--jcard-height)',
  height: props.content.shortBack ? 'var(--w-back-short)' : 'var(--w-back-full)',
  transformOrigin: '0 0',
  transform: isRev.value
    ? 'rotate(-90deg) translateX(-100%)'
    : 'rotate(90deg) translateY(-100%)',
  boxSizing: 'border-box',
  padding: '1.5mm',
  fontSize: '2.5mm',
  lineHeight: 1.3,
  overflow: 'hidden',
}));
</script>

<template>
  <div :style="bg">
    <!-- eslint-disable-next-line vue/no-v-html — content is DOMPurify-sanitized upstream -->
    <div :style="containerStyle" v-html="sanitizedContent" />
  </div>
</template>
