<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{
  content: JCardContent;
  sanitizedTop: string;
  sanitizedCenter: string;
  sanitizedBottom: string;
}>();

const rot = computed(() => (props.content.isReversed ? 'rotate(-90deg)' : 'rotate(90deg)'));

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
}));

const base: CSSProperties = { position: 'absolute', whiteSpace: 'nowrap', fontSize: '2.5mm', lineHeight: 1.3, left: '50%' };
const topStyle = computed<CSSProperties>(() => ({ ...base, top: '1.5mm', transformOrigin: props.content.isReversed ? 'right center' : 'left center', transform: props.content.isReversed ? `translateX(-100%) ${rot.value}` : `translateX(0) ${rot.value}` }));
const midStyle = computed<CSSProperties>(() => ({ ...base, top: '50%', transformOrigin: 'center center', transform: `translateX(-50%) translateY(-50%) ${rot.value}` }));
const btmStyle = computed<CSSProperties>(() => ({ ...base, bottom: '1.5mm', transformOrigin: props.content.isReversed ? 'left center' : 'right center', transform: props.content.isReversed ? `translateX(0) ${rot.value}` : `translateX(-100%) ${rot.value}` }));
</script>

<template>
  <div :style="bg">
    <div :style="topStyle" v-html="sanitizedTop" />
    <div :style="midStyle" v-html="sanitizedCenter" />
    <div :style="btmStyle" v-html="sanitizedBottom" />
  </div>
</template>
