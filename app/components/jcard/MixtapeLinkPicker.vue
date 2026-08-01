<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Mixtape, JCardContent } from '~/types';
import { useAuthStore } from '~/stores/auth';
import { loadMixtapes } from '~/utils/database';
import { applyMixtapeToJCard } from '~/utils/jcardDefaults';

const props = defineProps<{
  mixtapeId: string | null | undefined;
  currentMixtape: Mixtape | null;
  content: JCardContent;
}>();

const emit = defineEmits<{
  linkChange: [id: string | null];
  contentChange: [c: JCardContent];
}>();

const auth = useAuthStore();
const mixtapes = ref<Mixtape[]>([]);
const overwriteCover = ref(false);
const showDuration = ref(false);

async function load() {
  if (auth.user) {
    try {
      mixtapes.value = await loadMixtapes(auth.user.id);
    } catch (e) {
      console.error(e);
    }
  }
}
onMounted(load);
watch(() => auth.user, load);

const options = computed(() => (auth.user ? mixtapes.value : props.currentMixtape ? [props.currentMixtape] : []));
const linked = computed(() => options.value.find((m) => m.id === props.mixtapeId) ?? null);
</script>

<template>
  <div class="settings-section">
    <select
      class="settings-select"
      :value="mixtapeId ?? ''"
      @change="emit('linkChange', ($event.target as HTMLSelectElement).value || null)"
    >
      <option value="">— None —</option>
      <option v-for="m in options" :key="m.id" :value="m.id">{{ m.title }}</option>
    </select>

    <div v-if="linked" style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
      <label class="settings-checkbox-label">
        <input v-model="overwriteCover" type="checkbox" />
        Also overwrite cover panel
      </label>
      <label class="settings-checkbox-label">
        <input v-model="showDuration" type="checkbox" />
        Include track duration
      </label>
      <button class="btn" style="font-size:12px" @click="emit('contentChange', applyMixtapeToJCard(content, linked, { overwriteCover, showDuration }))">
        ↺ Pull tracks from mixtape
      </button>
      <button class="btn" style="font-size:12px" @click="emit('linkChange', null)">Unlink</button>
    </div>

    <p v-if="mixtapeId && !linked" style="font-size:11px;color:var(--color-warning);margin-top:4px">
      Linked mixtape no longer available
    </p>
  </div>
</template>
