<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{
  content: JCardContent;
  sanitizedCover: string;
  /** Render the panel background and cover art as real <img>s (lazy-loadable)
   *  instead of CSS background-images. Only the Explore grid preview sets this. */
  asImg?: boolean;
}>();

const showBgImage = computed(() => !props.content.continuousBackground && !!props.content.backgroundImageUrl);

const bg = computed<CSSProperties>(() => ({
  backgroundColor: props.content.continuousBackground
    ? 'transparent'
    : props.content.backgroundImageUrl ? 'transparent' : props.content.backgroundColor,
  backgroundImage: !props.asImg && showBgImage.value
    ? `url(${props.content.backgroundImageUrl})`
    : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const bgImgStyle: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' };

// Shared box geometry for the cover art, whether it paints as a CSS
// background (editor / full-size preview) or a real <img> (Explore grid).
const coverBoxStyle = computed<CSSProperties>(() => ({
  position: props.content.coverImageBehindContent ? 'absolute' : 'relative',
  zIndex: props.content.coverImageBehindContent ? 1 : undefined,
  top: 0,
  left: 0,
  width: '100%',
  height: props.content.isFullCoverImage ? '100%' : 'auto',
  aspectRatio: props.content.isFullCoverImage ? undefined : '1 / 1',
}));

const imgStyle = computed<CSSProperties>(() => ({
  ...coverBoxStyle.value,
  backgroundImage: props.content.coverImageUrl ? `url(${props.content.coverImageUrl})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  display: props.content.coverImageUrl ? 'block' : 'none',
}));

const coverImgTagStyle = computed<CSSProperties>(() => ({
  ...coverBoxStyle.value,
  objectFit: 'cover',
  display: 'block',
}));

const textStyle = computed<CSSProperties>(() => ({
  flex: props.content.isFullCoverImage && !props.content.coverImageBehindContent ? 0 : 1,
  padding: '1.5mm',
  overflow: 'hidden',
  fontSize: '2.8mm',
  lineHeight: 1.3,
  position: props.content.coverImageBehindContent ? 'absolute' : 'relative',
  zIndex: props.content.coverImageBehindContent ? 10 : undefined,
  top: props.content.coverImageBehindContent ? 0 : undefined,
  left: props.content.coverImageBehindContent ? 0 : undefined,
  width: props.content.coverImageBehindContent ? '100%' : undefined,
  height: props.content.coverImageBehindContent ? '100%' : undefined,
  display: props.content.isFullCoverImage && !props.content.coverImageBehindContent ? 'none' : 'block',
}));
</script>

<template>
  <div :style="bg">
    <img v-if="asImg && showBgImage" :src="content.backgroundImageUrl" loading="lazy" decoding="async" :style="bgImgStyle" alt="" >
    <img v-if="asImg && content.coverImageUrl" :src="content.coverImageUrl" loading="lazy" decoding="async" :style="coverImgTagStyle" alt="" >
    <div v-else-if="content.coverImageUrl" :style="imgStyle" />
    <div :style="textStyle" v-html="sanitizedCover" />
  </div>
</template>
