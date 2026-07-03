<script setup lang="ts">
import '~/assets/styles/Toast.css';

const props = withDefaults(
  defineProps<{
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
  }>(),
  { type: 'info', duration: 3000 }
);

let timer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  timer = setTimeout(props.onClose, props.duration);
});
onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <div :class="`toast toast-${type}`">
    {{ message }}
  </div>
</template>
