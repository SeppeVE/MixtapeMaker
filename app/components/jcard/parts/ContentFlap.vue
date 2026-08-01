<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{
  content: JCardContent;
  sanitizedContent: string;
  flapIndex: number; // 0-based index into flapContents (0 = cover, handled by CoverFlap)
}>();

const imgUrl = computed(() => props.content.flapImageUrls?.[props.flapIndex]);
const isFull = computed(() => props.content.flapImageFulls?.[props.flapIndex] ?? false);
const behind = computed(() => props.content.flapImageBehindContents?.[props.flapIndex] ?? false);

const bg = computed<CSSProperties>(() => ({
  backgroundColor: props.content.continuousBackground
    ? 'transparent'
    : props.content.backgroundImageUrl ? 'transparent' : props.content.backgroundColor,
  backgroundImage: !props.content.continuousBackground && props.content.backgroundImageUrl
    ? `url(${props.content.backgroundImageUrl})`
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
  top: 0,
  left: 0,
  width: '100%',
  height: isFull.value ? '100%' : 'auto',
  aspectRatio: isFull.value ? undefined : '1 / 1',
  backgroundImage: imgUrl.value ? `url(${imgUrl.value})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  display: imgUrl.value ? 'block' : 'none',
}));

const textStyle = computed<CSSProperties>(() => ({
  flex: isFull.value && !behind.value ? 0 : 1,
  padding: '1.5mm',
  overflow: 'hidden',
  fontSize: '2.8mm',
  lineHeight: 1.3,
  position: behind.value ? 'absolute' : 'relative',
  zIndex: behind.value ? 10 : undefined,
  top: behind.value ? 0 : undefined,
  left: behind.value ? 0 : undefined,
  width: behind.value ? '100%' : undefined,
  height: behind.value ? '100%' : undefined,
  display: isFull.value && !behind.value ? 'none' : 'block',
}));

const isEmpty = computed(() => {
  const c = props.sanitizedContent;
  return !c || c === '<p><br></p>' || c.trim() === '';
});
</script>

<template>
  <div :style="bg">
    <div v-if="imgUrl" :style="imgStyle" />
    <div v-if="!isEmpty || behind" :style="textStyle" v-html="sanitizedContent" />
    <div v-else :style="textStyle" />
  </div>
</template>
