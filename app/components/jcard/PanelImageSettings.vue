<script setup lang="ts">
import { computed } from 'vue';
import type { JCardContent } from '~/types';
import { deleteJCardImage } from '~/utils/supabaseImages';

const props = defineProps<{
  content: JCardContent;
  cardId: string;
  activePanel: number;
  /** Outside panel 0 uses the cover fields. Every other slot uses a flap image array. */
  side: 'outside' | 'inside';
}>();

const emit = defineEmits<{
  'update:activePanel': [index: number];
  patch: [partial: Partial<JCardContent>];
}>();

const panelLabel = (i: number) => (i === 0 ? 'Cover' : `Panel ${i + 1}`);

const isCover = computed(() => props.side === 'outside' && props.activePanel === 0);

const imageUrl = computed(() => {
  if (props.side === 'inside') return props.content.insideFlapImageUrls?.[props.activePanel];
  if (isCover.value) return props.content.coverImageUrl;
  return props.content.flapImageUrls?.[props.activePanel];
});

const imageFull = computed(() => {
  if (props.side === 'inside') return props.content.insideFlapImageFulls?.[props.activePanel] ?? false;
  if (isCover.value) return props.content.isFullCoverImage;
  return props.content.flapImageFulls?.[props.activePanel] ?? false;
});

const imageBehind = computed(() => {
  if (props.side === 'inside') return props.content.insideFlapImageBehindContents?.[props.activePanel] ?? false;
  if (isCover.value) return props.content.coverImageBehindContent;
  return props.content.flapImageBehindContents?.[props.activePanel] ?? false;
});

const uploadLabel = computed(() => {
  if (props.side === 'inside') {
    return props.activePanel === 0 ? 'Inside cover image' : `Inside panel ${props.activePanel + 1} image`;
  }
  return isCover.value ? 'Cover image' : `Panel ${props.activePanel + 1} image`;
});

const fullLabel = computed(() =>
  props.side === 'inside' ? 'Fill panel with image' : 'Cover the full panel with the image',
);

const checkboxStyle = computed(() =>
  props.side === 'inside'
    ? 'panel-image-settings-checkbox-style inside'
    : 'panel-image-settings-checkbox-style',
);

function withIndex<T>(list: T[] | undefined, index: number, value: T, empty: T): T[] {
  const next = [...(list ?? Array(6).fill(empty))];
  next[index] = value;
  return next;
}

// Cover images carry a thumbnail (see supabaseImages.ts) that the Explore
// grid preview reads. The old thumbnail is orphaned once replaced or removed.
function onImageChange({ url, thumbUrl }: { url: string | null; thumbUrl?: string }) {
  if (props.side === 'inside') {
    emit('patch', {
      insideFlapImageUrls: withIndex(props.content.insideFlapImageUrls, props.activePanel, url ?? undefined, undefined),
    });
    return;
  }
  if (isCover.value) {
    if (props.content.coverImageThumbUrl) deleteJCardImage(props.content.coverImageThumbUrl);
    emit('patch', { coverImageUrl: url ?? undefined, coverImageThumbUrl: thumbUrl });
    return;
  }
  emit('patch', {
    flapImageUrls: withIndex(props.content.flapImageUrls, props.activePanel, url ?? undefined, undefined),
  });
}

function onFullChange(checked: boolean) {
  if (props.side === 'inside') {
    emit('patch', {
      insideFlapImageFulls: withIndex(props.content.insideFlapImageFulls, props.activePanel, checked, false),
    });
    return;
  }
  if (isCover.value) {
    emit('patch', { isFullCoverImage: checked });
    return;
  }
  emit('patch', {
    flapImageFulls: withIndex(props.content.flapImageFulls, props.activePanel, checked, false),
  });
}

function onBehindChange(checked: boolean) {
  if (props.side === 'inside') {
    emit('patch', {
      insideFlapImageBehindContents: withIndex(props.content.insideFlapImageBehindContents, props.activePanel, checked, false),
    });
    return;
  }
  if (isCover.value) {
    emit('patch', { coverImageBehindContent: checked });
    return;
  }
  emit('patch', {
    flapImageBehindContents: withIndex(props.content.flapImageBehindContents, props.activePanel, checked, false),
  });
}
</script>

<template>
  <div v-if="content.flaps > 1" class="settings-flap-tabs">
    <button
      v-for="i in content.flaps"
      :key="i - 1"
      type="button"
      :class="`btn${activePanel === i - 1 ? ' active' : ''}`"
      style="font-size:0.8rem;padding:4px 8px;min-width:0"
      @click="emit('update:activePanel', i - 1)"
    >
      {{ panelLabel(i - 1) }}
    </button>
  </div>

  <ImageUpload
    :label="uploadLabel"
    :current-url="imageUrl"
    image-type="cover"
    :card-id="cardId"
    @change="onImageChange"
  />
  <div v-if="imageUrl" :style="checkboxStyle">
    <label class="settings-checkbox-label">
      <input type="checkbox" :checked="imageFull" @change="onFullChange(($event.target as HTMLInputElement).checked)" />
      {{ fullLabel }}
    </label>
    <label class="settings-checkbox-label">
      <input type="checkbox" :checked="imageBehind" @change="onBehindChange(($event.target as HTMLInputElement).checked)" />
      Show text over image
    </label>
  </div>
</template>

<style scoped>
.panel-image-settings-checkbox-style {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;

  &.inside {
    margin-bottom: 8px;
  }
}
</style>