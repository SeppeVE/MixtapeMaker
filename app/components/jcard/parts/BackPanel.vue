<script setup lang="ts">
import { computed, type CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

// Rotate ONE fixed-size container that spans the whole panel; text inside is laid
// out with normal flexbox so adding lines never shifts any rotation pivot.
const props = defineProps<{
  content: JCardContent;
  sanitizedLeft: string;
  sanitizedRight: string;
}>();

const isRev = computed(() => props.content.isReversed);
const panelBgImage = computed(() => props.content.backPanelImageUrl || props.content.backgroundImageUrl);

const bg = computed<CSSProperties>(() => ({
  backgroundColor: props.content.continuousBackground
    ? 'transparent'
    : panelBgImage.value ? 'transparent' : props.content.backgroundColor,
  backgroundImage: !props.content.continuousBackground && panelBgImage.value
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
  transform: isRev.value ? 'rotate(-90deg) translateX(-100%)' : 'rotate(90deg) translateY(-100%)',
  display: 'flex',
  flexDirection: isRev.value ? 'row-reverse' : 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  padding: '0 1.5mm',
  fontSize: '2.5mm',
  lineHeight: 1.3,
  gap: '2mm',
}));

const textStyle: CSSProperties = { whiteSpace: 'nowrap', maxWidth: '47%', overflow: 'hidden' };

const topHtml = computed(() => (isRev.value ? props.sanitizedRight : props.sanitizedLeft));
const btmHtml = computed(() => (isRev.value ? props.sanitizedLeft : props.sanitizedRight));
</script>

<template>
  <div :style="bg">
    <div :style="containerStyle">
      <div :style="textStyle" v-html="topHtml" />
      <div :style="textStyle" v-html="btmHtml" />
    </div>
  </div>
</template>
