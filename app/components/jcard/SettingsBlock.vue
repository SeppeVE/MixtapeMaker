<script setup lang="ts">
export type Section = 'info' | 'layout' | 'flaps' | 'background' | 'fonts' | 'spine' | 'back' | 'inside' | 'mixtape' | 'export' | 'presets';

const SECTION_COLORS: Record<Section, { bg: string; fg: string }> = {
  info: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  presets: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  layout: { bg: 'var(--color-mustard)', fg: 'var(--color-text)' },
  fonts: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  background: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  flaps: { bg: 'var(--color-mustard)', fg: 'var(--color-text)' },
  spine: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  back: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
  mixtape: { bg: 'var(--color-mustard)', fg: 'var(--color-text)' },
  export: { bg: 'var(--color-accent)', fg: 'var(--color-paper)' },
  inside: { bg: 'var(--color-primary)', fg: 'var(--color-paper)' },
};

const props = defineProps<{
  id: Section;
  label: string;
  isVisible: (s: Section) => boolean;
  isOpen: (s: Section) => boolean;
  onToggle: (s: Section) => void;
}>();

const colors = computed(() => SECTION_COLORS[props.id]);
</script>

<template>
  <div v-if="isVisible(id)" class="settings-block">
    <button
      class="settings-heading"
      :style="{ background: colors.bg, color: colors.fg }"
      @click="onToggle(id)"
    >
      <span>{{ label }}</span>
      <span style="font-size: 14px; opacity: 0.8">{{ isOpen(id) ? '▲' : '▼' }}</span>
    </button>
    <div v-if="isOpen(id)" class="settings-body">
      <slot />
    </div>
  </div>
</template>
