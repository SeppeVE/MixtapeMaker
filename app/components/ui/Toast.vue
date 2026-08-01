<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import type { ToastType } from '~/stores/ui';

const props = withDefaults(defineProps<{
  message: string;
  type?: ToastType;
  duration?: number;
}>(), {
  type: 'info',
  duration: 3000,
});

const emit = defineEmits<{ close: [] }>();

let timer: ReturnType<typeof setTimeout> | null = null;
onMounted(() => {
  timer = setTimeout(() => emit('close'), props.duration);
});
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div :class="`toast toast-${type}`">
    {{ message }}
  </div>
</template>
