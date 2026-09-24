<script setup lang="ts">
import { computed } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { HeroState, TapeMachineStatus } from '~/lib/cassette3d/animation/tapeMachine';

// Buttons for everything clicking the tape does, plus Back, so the 3D library
// works from the keyboard and with a screen reader. Escape steps back.
const props = defineProps<{ tape: TapeMachineStatus }>();
const emit = defineEmits<{
  request: [state: HeroState];
  step: [dir: 1 | -1];
  flip: [];
}>();

interface Action {
  label: string;
  run: () => void;
  primary?: boolean;
}

const go = (state: HeroState) => () => emit('request', state);

// Keyed on where the tape is heading, so the buttons answer straight away mid-animation.
const actions = computed<Action[]>(() => {
  switch (props.tape.target) {
    case 'presented':
      return [{ label: 'Open case', run: go('lidOpen'), primary: true }];
    case 'lidOpen':
      return [
        { label: 'Take out cassette', run: go('cassetteOut'), primary: true },
        { label: 'Close case', run: go('presented') },
      ];
    case 'cassetteOut':
      return [
        { label: 'Take out J-card', run: go('jcardOut'), primary: true },
        { label: 'Put cassette back', run: go('lidOpen') },
      ];
    case 'jcardOut':
      return [
        { label: 'Unfold J-card', run: go('jcardUnfolded'), primary: true },
        { label: 'Put J-card back', run: go('cassetteOut') },
      ];
    case 'jcardUnfolded':
      return [
        { label: 'Turn over', run: () => emit('flip'), primary: true },
        { label: 'Fold up', run: go('jcardOut') },
        { label: 'Put everything back', run: go('presented') },
      ];
  }
  return [];
});

const ANNOUNCE: Record<HeroState, string> = {
  presented: 'The case is closed.',
  lidOpen: 'The case is open. The cassette and the J-card are in the lid.',
  cassetteOut: 'The cassette is out.',
  jcardOut: 'The J-card is out, folded.',
  jcardUnfolded: 'The J-card is unfolded. Drag to look around it, or turn it over.',
};
const announcement = computed(() => (props.tape.animating ? '' : ANNOUNCE[props.tape.state]));

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || props.tape.target === 'presented') return;
  const el = e.target as HTMLElement | null;
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
  emit('step', -1);
});
</script>

<template>
  <div class="lib3d-overlay">
    <p class="lib3d-sr" role="status" aria-live="polite">{{ announcement }}</p>
    <div class="lib3d-actions" role="toolbar" aria-label="Cassette">
      <button
        v-if="tape.target !== 'presented'"
        type="button"
        class="btn lib3d-back"
        aria-keyshortcuts="Escape"
        @click="emit('step', -1)"
      >
        ◀ Back
      </button>
      <button
        v-for="a in actions"
        :key="a.label"
        type="button"
        :class="['btn', { 'btn-primary': a.primary }]"
        @click="a.run"
      >
        {{ a.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lib3d-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  display: flex;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
}
.lib3d-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  pointer-events: auto;
}
.lib3d-back {
  opacity: 0.85;
}
.lib3d-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
