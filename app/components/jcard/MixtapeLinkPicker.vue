<script setup lang="ts">
import { loadMixtapes } from '~/utils/database';
import type { Mixtape, JCardContent } from '~/types';
import { applyMixtapeToJCard } from '~/utils/jcardDefaults';

const props = defineProps<{
  mixtapeId: string | null | undefined;
  currentMixtape: Mixtape | null;
  content: JCardContent;
  onLinkChange: (id: string | null) => void;
  onContentChange: (c: JCardContent) => void;
}>();

const { user } = useAuth();
const mixtapes = ref<Mixtape[]>([]);
const overwriteCover = ref(false);
const showDuration = ref(false);

watch(
  user,
  (u) => {
    if (u) loadMixtapes(u.id).then((m) => { mixtapes.value = m; }).catch(console.error);
  },
  { immediate: true }
);

const options = computed(() =>
  user.value ? mixtapes.value : props.currentMixtape ? [props.currentMixtape] : []
);
const linked = computed(() => options.value.find((m) => m.id === props.mixtapeId) ?? null);

const handleSelect = (e: Event) => {
  props.onLinkChange((e.target as HTMLSelectElement).value || null);
};
</script>

<template>
  <div class="settings-section">
    <select
      class="settings-select"
      :value="mixtapeId ?? ''"
      @change="handleSelect"
    >
      <option value="">— None —</option>
      <option v-for="m in options" :key="m.id" :value="m.id">{{ m.title }}</option>
    </select>

    <div v-if="linked" style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px">
      <label class="settings-checkbox-label">
        <input v-model="overwriteCover" type="checkbox">
        Also overwrite cover panel
      </label>
      <label class="settings-checkbox-label">
        <input v-model="showDuration" type="checkbox">
        Include track duration
      </label>
      <button
        class="btn"
        style="font-size: 12px"
        @click="onContentChange(applyMixtapeToJCard(content, linked, { overwriteCover, showDuration }))"
      >
        ↺ Pull tracks from mixtape
      </button>
      <button class="btn" style="font-size: 12px" @click="onLinkChange(null)">
        Unlink
      </button>
    </div>

    <p v-if="mixtapeId && !linked" style="font-size: 11px; color: var(--color-warning); margin-top: 4px">
      Linked mixtape no longer available
    </p>
  </div>
</template>
