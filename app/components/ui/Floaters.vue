<script setup lang="ts">
import '~/assets/styles/Floaters.css';

const props = defineProps<{ sideA: boolean }>();

const SHAPES_A = [
  { type: 'triangle', x: 7, y: 22, size: 38, rot: -15, color: '#5B2838' },
  { type: 'sphere', x: 88, y: 20, size: 32, rot: 0, color: '#D4A935' },
  { type: 'cube', x: 11, y: 74, size: 44, rot: 10, color: '#5B2838' },
  { type: 'diamond', x: 93, y: 68, size: 28, rot: 0, color: '#D4A935' },
  { type: 'square', x: 54, y: 88, size: 22, rot: 25, color: '#5B2838' },
  { type: 'triangle', x: 79, y: 8, size: 34, rot: 20, color: '#3D5A47' },
  { type: 'sphere', x: 41, y: 11, size: 20, rot: 0, color: '#5B2838' },
  { type: 'cube', x: 68, y: 84, size: 28, rot: -8, color: '#D4A935' },
];

const SHAPES_B = [
  { type: 'sphere', x: 6, y: 18, size: 36, rot: 0, color: '#5B2838' },
  { type: 'triangle', x: 90, y: 25, size: 30, rot: 12, color: '#D4A935' },
  { type: 'diamond', x: 14, y: 76, size: 32, rot: 0, color: '#D4A935' },
  { type: 'cube', x: 91, y: 65, size: 40, rot: -5, color: '#5B2838' },
  { type: 'square', x: 48, y: 86, size: 24, rot: -20, color: '#5B2838' },
  { type: 'sphere', x: 75, y: 10, size: 26, rot: 0, color: '#D4A935' },
  { type: 'triangle', x: 38, y: 9, size: 22, rot: -8, color: '#5B2838' },
  { type: 'diamond', x: 65, y: 82, size: 30, rot: 15, color: '#3D5A47' },
];

const shapes = computed(() => (props.sideA ? SHAPES_A : SHAPES_B));
</script>

<template>
  <div class="floaters" aria-hidden="true">
    <div
      v-for="(s, i) in shapes"
      :key="i"
      class="floater"
      :style="{ left: `${s.x}%`, top: `${s.y}%` }"
    >
      <FloaterShape :type="s.type" :size="s.size" :rot="s.rot" :color="s.color" />
    </div>
  </div>
</template>
