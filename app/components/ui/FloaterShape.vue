<script setup lang="ts">
const props = defineProps<{
  type: string;
  size: number;
  rot: number;
  color: string;
}>();

const INK = '#2A1E28';

const h = computed(() => props.size / 2);
const style = computed(() => ({
  transform: `rotate(${props.rot}deg)`,
  transformOrigin: 'center',
  display: 'block',
}));
const viewBox = computed(() => `${-h.value} ${-h.value} ${props.size} ${props.size}`);
</script>

<template>
  <svg v-if="type === 'sphere'" :width="size" :height="size" :viewBox="viewBox" :style="style">
    <circle :r="h - 1" :fill="color" :stroke="INK" stroke-width="2" />
    <path
      :d="`M ${-h + 5} -3 a ${h - 5} ${h / 2.5} 0 0 1 ${size - 10} 0`"
      fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"
    />
  </svg>

  <svg v-else-if="type === 'triangle'" :width="size" :height="size" :viewBox="viewBox" :style="style">
    <polygon :points="`0,${-h} ${h},${h} ${-h},${h}`" :fill="color" :stroke="INK" stroke-width="2" />
  </svg>

  <svg v-else-if="type === 'cube'" :width="size" :height="size" :viewBox="viewBox" :style="style">
    <polygon :points="`${-h},${-h * 0.5} 0,${-h} ${h},${-h * 0.5} 0,0`" fill="#EFE8D6" :stroke="INK" stroke-width="2" />
    <polygon :points="`${-h},${-h * 0.5} ${-h},${h * 0.5} 0,${h} 0,0`" :fill="color" :stroke="INK" stroke-width="2" />
    <polygon :points="`0,0 0,${h} ${h},${h * 0.5} ${h},${-h * 0.5}`" fill="#4A3A48" :stroke="INK" stroke-width="2" />
  </svg>

  <svg v-else-if="type === 'diamond'" :width="size" :height="size" :viewBox="viewBox" :style="style">
    <polygon :points="`0,${-h} ${h},0 0,${h} ${-h},0`" :fill="color" :stroke="INK" stroke-width="2" />
  </svg>

  <svg v-else :width="size" :height="size" :viewBox="viewBox" :style="style">
    <rect :x="-h" :y="-h" :width="size" :height="size" :fill="color" :stroke="INK" stroke-width="2" />
  </svg>
</template>
