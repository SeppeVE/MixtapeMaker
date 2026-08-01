<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{ content: JCardContent; sanitizedCover: string }>();

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
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}));

const imgStyle = computed<CSSProperties>(() => ({
  position: props.content.coverImageBehindContent ? 'absolute' : 'relative',
  zIndex: props.content.coverImageBehindContent ? 1 : undefined,
  top: 0,
  left: 0,
  width: '100%',
  height: props.content.isFullCoverImage ? '100%' : 'auto',
  aspectRatio: props.content.isFullCoverImage ? undefined : '1 / 1',
  backgroundImage: props.content.coverImageUrl ? `url(${props.content.coverImageUrl})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  display: props.content.coverImageUrl ? 'block' : 'none',
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
    <div v-if="content.coverImageUrl" :style="imgStyle" />
    <div :style="textStyle" v-html="sanitizedCover" />
  </div>
</template>
