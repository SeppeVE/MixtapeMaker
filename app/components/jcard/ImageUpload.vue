<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { uploadJCardImage } from '~/utils/supabaseImages';

const props = defineProps<{
  label: string;
  currentUrl?: string;
  imageType: 'cover' | 'background';
  cardId?: string;
}>();

const emit = defineEmits<{ change: [url: string | null] }>();

const auth = useAuthStore();
const uploading = ref(false);
const dragOver = ref(false);
const error = ref<string | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

async function handleFile(file: File) {
  if (!file.type.startsWith('image/')) {
    error.value = 'Please choose an image file (JPG, PNG, WEBP…)';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File must be under 10 MB';
    return;
  }
  error.value = null;
  uploading.value = true;
  try {
    const url = await uploadJCardImage(file, auth.user?.id ?? 'local', props.imageType, props.cardId);
    emit('change', url);
  } catch (e) {
    error.value = 'Upload failed — try again';
    console.error(e);
  } finally {
    uploading.value = false;
  }
}

function handleDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
}

function handleInput(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) handleFile(file);
  target.value = '';
}

function openPicker() {
  if (!uploading.value) inputRef.value?.click();
}

const filename = computed(() =>
  props.currentUrl
    ? decodeURIComponent(props.currentUrl.split('/').pop()?.split('?')[0] ?? '')
    : null
);
</script>

<template>
  <div class="img-upload-root">
    <span class="settings-label">{{ label }}</span>

    <div
      :class="`img-upload-drop${dragOver ? ' drag-over' : ''}${currentUrl ? ' has-image' : ''}${uploading ? ' uploading' : ''}`"
      role="button"
      :tabindex="0"
      @drop.prevent="handleDrop"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @click="openPicker"
      @keydown.enter="openPicker"
    >
      <div v-if="currentUrl" class="img-upload-thumb" :style="{ backgroundImage: `url(${currentUrl})` }" />

      <div class="img-upload-drop-text">
        <span v-if="uploading" class="img-upload-spinner">Uploading…</span>
        <template v-else-if="currentUrl">
          <strong>✓ {{ filename }}</strong>
          <span>Click or drag to replace</span>
        </template>
        <template v-else>
          <strong>{{ dragOver ? 'Drop it!' : 'Drag & drop' }}</strong>
          <span>or click to choose file</span>
          <span class="img-upload-hint">JPG · PNG · WEBP · up to 10 MB</span>
        </template>
      </div>

      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        style="display:none"
        :disabled="uploading"
        @change="handleInput"
      />
    </div>

    <button
      v-if="currentUrl"
      class="btn btn-secondary img-upload-remove"
      :disabled="uploading"
      @click.stop="emit('change', null)"
    >
      Remove image
    </button>

    <p v-if="error" class="img-upload-error">{{ error }}</p>
  </div>
</template>
