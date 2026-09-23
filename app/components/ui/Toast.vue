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

<style scoped>
/* @keyframes toastIn and the mobile @media travel with the rules that use
   them; Vue scopes the keyframe name. */
.toast {
  position: fixed;
  bottom: var(--spacing-xl);
  right: var(--spacing-xl);
  padding: 8px 14px;
  background: var(--color-paper);
  color: var(--color-text);
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow);
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1;
  z-index: 10000;
  animation: toastIn 0.2s cubic-bezier(.3,.7,.3,1) both;
  max-width: 360px;
}

@keyframes toastIn {
  from { transform: translate(0, 20px); opacity: 0; }
  to   { transform: translate(0, 0);    opacity: 1; }
}

.toast-success {
  background: var(--color-forest);
  color: var(--color-paper);
  border-color: var(--color-text);
}

.toast-error {
  background: var(--color-primary);
  color: var(--color-paper);
  border-color: var(--color-text);
}

.toast-info {
  background: var(--color-paper);
  color: var(--color-text);
}

@media (max-width: 768px) {
  .toast {
    bottom: var(--spacing-md);
    right: var(--spacing-md);
    left: var(--spacing-md);
    max-width: none;
  }
}
</style>
