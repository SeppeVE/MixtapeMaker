<script setup lang="ts">
import { computed } from 'vue';

const STRIP_A = ['#D4A935','#5B2838','#8FC9B7','#B4A0C7','#A8C4A2','#3D5A47','#D4A935','#5B2838','#8FC9B7','#B4A0C7','#A8C4A2','#3D5A47'];
const STRIP_B = ['#3D5A47','#A8C4A2','#B4A0C7','#8FC9B7','#5B2838','#D4A935','#3D5A47','#A8C4A2','#B4A0C7','#8FC9B7','#5B2838','#D4A935'];

const props = defineProps<{ reverse?: boolean }>();
const strip = computed(() => (props.reverse ? STRIP_B : STRIP_A));
</script>

<template>
  <div class="lp-tape-strip">
    <span v-for="(c, i) in strip" :key="i" :style="{ background: c }" />
  </div>
</template>
