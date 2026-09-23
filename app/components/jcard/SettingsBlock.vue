<script setup lang="ts">
import type { Section } from './settingsSections';

const props = defineProps<{
  id: Section;
  label: string;
  visible: boolean;
  open: boolean;
  bg: string;
  fg: string;
}>();

const emit = defineEmits<{ toggle: [id: Section] }>();
</script>

<template>
  <div v-if="visible" class="jc-block">
    <button class="jc-heading" :style="{ background: bg, color: fg }" @click="emit('toggle', id)">
      <span>{{ label }}</span>
      <span class="jc-heading-caret">{{ open ? '▲' : '▼' }}</span>
    </button>
    <div v-if="open" class="jc-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* Each collapsible section is a bordered window */
.jc-block {
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow);
  background: var(--color-white);
  overflow: hidden;
}

/* Title bar */
.jc-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 5px 8px 4px;
  border: none;
  border-bottom: 2px solid var(--color-text);
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0.5px;
  text-align: left;
  background: var(--color-primary);
  color: var(--color-paper);
  user-select: none;
}

.jc-heading:hover {
  background: var(--color-mustard);
  color: var(--color-text);
}

/* Alternate accent for variety */
.jc-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--color-white);
}

/* ── SettingsBlock ── */
.jc-heading-caret {
  font-size: 14px;
  opacity: 0.8;
}
</style>
