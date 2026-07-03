<script setup lang="ts">
import type { CSSProperties } from 'vue';
import type { JCardContent } from '~/types';

const props = defineProps<{
  content: JCardContent;
  sanitizedLeft: string;
  sanitizedRight: string;
}>();

// The old approach rotated individual text divs using `transformOrigin: left center`.
// The pivot sits at the vertical centre of the element, so when lines are added and
// the element grows taller, the pivot shifts — dragging the rotated block to a
// different position every time the user types a newline.
//
// Fix: rotate ONE fixed-size container that spans the entire panel. Inside it, text
// is laid out with normal flexbox (no transform on the text elements themselves),
// so adding lines never changes any pivot point.
//
// Geometry (non-reversed, rotate +90°):
//   Container own size: width = --jcard-height (102mm), height = panel width
//   After rotate(90deg) translateY(-100%) with transform-origin 0 0:
//     container-left  → panel top
//     container-right → panel bottom
//     container-top   → panel right edge
//     container-bottom→ panel left edge
//   → flexDirection: row, alignItems: center puts text centred in panel width ✓
//
// Reversed (rotate -90°):
//   transform: rotate(-90deg) translateX(-100%)
//     container-right → panel top
//     container-left  → panel bottom
//   → flexDirection: row-reverse keeps topHtml at panel top ✓

const isRev = computed(() => props.content.isReversed);

// Per-panel image overrides the global background image when set
const panelBgImage = computed(() => props.content.backPanelImageUrl || props.content.backgroundImageUrl);

const bg = computed<CSSProperties>(() => ({
  backgroundColor: props.content.continuousBackground
    ? 'transparent'
    : panelBgImage.value ? 'transparent' : props.content.backgroundColor,
  backgroundImage: !props.content.continuousBackground && panelBgImage.value
    ? `url(${panelBgImage.value})`
    : undefined,
  backgroundSize: 'cover', backgroundPosition: 'center',
  width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
}));

const containerStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  // In its own coord space the container is 102mm wide × panel-width tall.
  // After rotation it visually fills the panel (panel-width wide × 102mm tall).
  // height must equal the back panel's WIDTH (not its height), so that
  // translateY(-100%) shifts by exactly the panel width.
  width: 'var(--jcard-height)',
  height: props.content.shortBack ? 'var(--w-back-short)' : 'var(--w-back-full)',
  transformOrigin: '0 0',
  transform: isRev.value
    ? 'rotate(-90deg) translateX(-100%)'
    : 'rotate(90deg) translateY(-100%)',
  display: 'flex',
  flexDirection: isRev.value ? 'row-reverse' : 'row',
  alignItems: 'center', // centres text in the panel's width
  justifyContent: 'space-between',
  boxSizing: 'border-box',
  padding: '0 1.5mm', // 1.5mm gap at panel top and bottom
  fontSize: '2.5mm',
  lineHeight: 1.3,
  gap: '2mm',
}));

const textStyle: CSSProperties = {
  whiteSpace: 'nowrap',
  maxWidth: '47%', // keep top/bottom text from colliding
  overflow: 'hidden',
};

const topHtml = computed(() => (isRev.value ? props.sanitizedRight : props.sanitizedLeft));
const btmHtml = computed(() => (isRev.value ? props.sanitizedLeft : props.sanitizedRight));
</script>

<template>
  <div :style="bg">
    <div :style="containerStyle">
      <!-- eslint-disable vue/no-v-html — content is DOMPurify-sanitized upstream -->
      <div :style="textStyle" v-html="topHtml" />
      <div :style="textStyle" v-html="btmHtml" />
    </div>
  </div>
</template>
