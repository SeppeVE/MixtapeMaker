<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { uploadJCardImage } from '~/utils/supabaseImages';
import IconCheck from '~icons/material-symbols/check-rounded';

const props = defineProps<{
  label: string;
  currentUrl?: string;
  imageType: 'cover' | 'background';
  cardId?: string;
}>();

const emit = defineEmits<{ change: [result: { url: string | null; thumbUrl?: string }] }>();

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
    const { url, thumbUrl } = await uploadJCardImage(file, auth.user?.id ?? 'local', props.imageType, props.cardId);
    emit('change', { url, thumbUrl });
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
    <span class="jc-label">{{ label }}</span>

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
          <strong><IconCheck class="icon-inline" aria-hidden="true" /> {{ filename }}</strong>
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
        class="img-upload-input"
        :disabled="uploading"
        @change="handleInput"
      />
    </div>

    <button
      v-if="currentUrl"
      class="btn btn-secondary img-upload-remove"
      :disabled="uploading"
      @click.stop="emit('change', { url: null })"
    >
      Remove image
    </button>

    <p v-if="error" class="img-upload-error">{{ error }}</p>
  </div>
</template>

<style scoped>
/* Scoping also renames the generic `pulse` keyframe, so it stops being a
   global identifier any other stylesheet could collide with. */
.img-upload-root {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Drop zone */
.img-upload-drop {
  aspect-ratio: 3 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 2px dashed var(--color-text);
  padding: 12px;
  cursor: pointer;
  background-color: var(--color-paper-dk);
  /* checkerboard dither pattern */
  background-image:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Crect width='6' height='6' fill='%23DDD2B8'/%3E%3Crect width='3' height='3' fill='%23EFE8D6'/%3E%3Crect x='3' y='3' width='3' height='3' fill='%23EFE8D6'/%3E%3C/svg%3E");
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1;
  user-select: none;
  transition: border-style 0.1s;
}

.img-upload-drop:hover {
  border-style: solid;
  background-color: rgba(212, 169, 53, 0.15);
}

.img-upload-drop.drag-over {
  border-style: solid;
  border-color: var(--color-mustard);
  background-color: rgba(212, 169, 53, 0.2);
}

.img-upload-drop.has-image {
  border-style: solid;
  border-color: var(--color-accent);
  aspect-ratio: unset;
  min-height: 60px;
  flex-direction: row;
  padding: 8px 10px;
  background-image: none;
  background-color: var(--color-white);
  gap: 10px;
}

.img-upload-drop.uploading {
  opacity: 0.6;
  pointer-events: none;
}

/* Thumbnail when image is set */
.img-upload-thumb {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background-size: cover;
  background-position: center;
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow-sm);
}

.img-upload-drop-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-text-light);
  min-width: 0;
  flex: 1;
}

.img-upload-drop-text strong {
  font-size: 12px;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.img-upload-hint {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--color-text);
  opacity: 0.55;
}

.img-upload-spinner {
  font-style: italic;
  color: var(--color-text-light);
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.5; }
  to   { opacity: 1;   }
}

.img-upload-remove {
  font-size: 11px;
  padding: 4px 10px;
}

.img-upload-remove:hover {
  background: var(--color-mustard);
}

.img-upload-error {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-warning);
  background: rgba(91, 40, 56, 0.08);
  border: 1.5px solid var(--color-warning);
  padding: 4px 8px;
}

/* Hidden <input type="file"> driven by the drop zone. */
.img-upload-input {
  display: none;
}
</style>
