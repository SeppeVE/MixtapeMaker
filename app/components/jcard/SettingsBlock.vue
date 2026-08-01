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
  <div v-if="visible" class="settings-block">
    <button class="settings-heading" :style="{ background: bg, color: fg }" @click="emit('toggle', id)">
      <span>{{ label }}</span>
      <span style="font-size:14px;opacity:0.8">{{ open ? '▲' : '▼' }}</span>
    </button>
    <div v-if="open" class="settings-body">
      <slot />
    </div>
  </div>
</template>
