<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{
  content: JCardContent;
  sanitizedContent: string;
  flapIndex: number; // 0-based
  label?: string;
}>();

const isEmpty = computed(
  () =>
    !props.sanitizedContent ||
    props.sanitizedContent === '<p><br></p>' ||
    props.sanitizedContent.trim() === ''
);

// Use insideContinuousBackground if set, fall back to continuousBackground for old cards
const isContinuous = computed(
  () => props.content.insideContinuousBackground ?? props.content.continuousBackground
);

const imgUrl = computed(() => props.content.insideFlapImageUrls?.[props.flapIndex]);
const isFull = computed(() => props.content.insideFlapImageFulls?.[props.flapIndex] ?? false);
const behind = computed(() => props.content.insideFlapImageBehindContents?.[props.flapIndex] ?? false);

const bg = computed<CSSProperties>(() => ({
  backgroundColor: isContinuous.value
    ? 'transparent'
    : props.content.insideBackgroundImageUrl ? 'transparent' : (props.content.backgroundColor || '#ffffff'),
  backgroundImage: !isContinuous.value && props.content.insideBackgroundImageUrl
    ? `url(${props.content.insideBackgroundImageUrl})`
    : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}));

const imgStyle = computed<CSSProperties>(() => ({
  position: behind.value ? 'absolute' : 'relative',
  zIndex: behind.value ? 1 : undefined,
  top: 0, left: 0, width: '100%',
  height: isFull.value ? '100%' : 'auto',
  aspectRatio: isFull.value ? undefined : '1 / 1',
  backgroundImage: imgUrl.value ? `url(${imgUrl.value})` : undefined,
  backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
  display: imgUrl.value ? 'block' : 'none',
}));

const textStyle = computed<CSSProperties>(() => ({
  flex: isFull.value && !behind.value ? 0 : 1,
  padding: '1.5mm', overflow: 'hidden', fontSize: '2.8mm', lineHeight: 1.3,
  position: behind.value ? 'absolute' : 'relative',
  zIndex: behind.value ? 10 : undefined,
  top: behind.value ? 0 : undefined, left: behind.value ? 0 : undefined,
  width: behind.value ? '100%' : undefined, height: behind.value ? '100%' : undefined,
  display: isFull.value && !behind.value ? 'none' : 'block',
}));

const labelStyle: CSSProperties = {
  position: 'absolute',
  bottom: '3px',
  right: '4px',
  fontSize: '2mm',
  color: 'rgba(0,0,0,0.15)',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};
</script>

<template>
  <div :style="bg">
    <div v-if="imgUrl" :style="imgStyle" />
    <!-- eslint-disable-next-line vue/no-v-html — content is DOMPurify-sanitized upstream -->
    <div v-if="!isEmpty" :style="textStyle" v-html="sanitizedContent" />
    <span v-else-if="label" :style="labelStyle" />
  </div>
</template>
