<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { Mixtape, CassetteLength } from '~/types';
import { formatTime, calculateTotalDuration } from '~/utils/timeUtils';

const props = defineProps<{
  mixtape: Mixtape;
  sideA: boolean;
  isSaving: boolean;
  isCloudSaved: boolean;
}>();

const emit = defineEmits<{
  update: [updates: Partial<Mixtape>];
  save: [];
  newMixtape: [];
  togglePublic: [];
}>();

function getSideStatus(totalDur: number, maxDur: number) {
  if (totalDur === 0) return { color: 'rgba(42,30,40,.25)', label: 'empty' };
  if (totalDur > maxDur) return { color: '#d4524a', label: `+${formatTime(totalDur - maxDur)} over` };
  const pct = Math.round((totalDur / maxDur) * 100);
  if (pct < 70) return { color: '#C4962A', label: `${pct}% · gap` };
  return { color: '#4a7c5e', label: `${pct}%` };
}

const editingTitle = ref(false);
const titleText = ref(props.mixtape.title);
const editingFor = ref(false);
const forText = ref(props.mixtape.dedicatedTo ?? '');
const titleInput = ref<HTMLInputElement | null>(null);
const forInput = ref<HTMLInputElement | null>(null);

const totalA = computed(() => calculateTotalDuration(props.mixtape.sideA));
const totalB = computed(() => calculateTotalDuration(props.mixtape.sideB));
const maxDur = computed(() => (props.mixtape.cassetteLength / 2) * 60);
const accentColor = computed(() => (props.sideA ? '#8FC9B7' : '#B4A0C7'));
const sideAStatus = computed(() => getSideStatus(totalA.value, maxDur.value));
const sideBStatus = computed(() => getSideStatus(totalB.value, maxDur.value));
const isUntitled = computed(() => props.mixtape.title === 'Untitled Mixtape');

function startEditTitle() {
  titleText.value = props.mixtape.title;
  editingTitle.value = true;
  nextTick(() => titleInput.value?.focus());
}
function saveTitle() {
  const trimmed = titleText.value.trim();
  if (trimmed) emit('update', { title: trimmed });
  editingTitle.value = false;
}
function startEditFor() {
  forText.value = props.mixtape.dedicatedTo ?? '';
  editingFor.value = true;
  nextTick(() => forInput.value?.focus());
}
function saveFor() {
  emit('update', { dedicatedTo: forText.value.trim() || undefined });
  editingFor.value = false;
}
</script>

<template>
  <div class="tape-preview">
    <!-- Cassette preview panel -->
    <div class="preview-panel">
      <div class="panel-titlebar panel-sage">▧ Preview</div>
      <div class="panel-body">
        <CassetteSVG
          :title="isUntitled ? undefined : mixtape.title"
          :side="sideA ? 'A' : 'B'"
          :accent-color="accentColor"
          :float="false"
        />

        <div class="cassette-meta">
          <!-- Title -->
          <div class="meta-row">
            <span class="meta-key">Title</span>
            <input
              v-if="editingTitle"
              ref="titleInput"
              v-model="titleText"
              class="meta-input"
              placeholder="Name your tape..."
              @blur="saveTitle"
              @keydown.enter="saveTitle"
              @keydown.escape="editingTitle = false"
            />
            <span
              v-else
              :class="`meta-value meta-editable${isUntitled ? ' meta-untitled' : ''}`"
              @click="startEditTitle"
            >
              <span v-if="isUntitled" class="meta-placeholder">pencil name your tape...</span>
              <template v-else>{{ mixtape.title }} <span class="meta-edit-hint">pencil</span></template>
            </span>
          </div>

          <!-- Tape length -->
          <div class="meta-row">
            <span class="meta-key">Length</span>
            <select
              class="meta-select"
              :value="mixtape.cassetteLength"
              @change="emit('update', { cassetteLength: Number(($event.target as HTMLSelectElement).value) as CassetteLength })"
            >
              <option :value="30">C30 · 15m / side</option>
              <option :value="45">C45 · 22.5m / side</option>
              <option :value="60">C60 · 30m / side</option>
              <option :value="90">C90 · 45m / side</option>
              <option :value="100">C100 · 50m / side</option>
              <option :value="120">C120 · 60m / side</option>
            </select>
          </div>

          <!-- Side A -->
          <div class="meta-row">
            <span class="meta-key">Side A</span>
            <span class="meta-value side-meta">
              <span class="side-status-dot" :style="{ background: sideAStatus.color }" />
              <span>{{ mixtape.sideA.length }} trk · {{ formatTime(totalA) }}</span>
            </span>
          </div>

          <!-- Side B -->
          <div class="meta-row">
            <span class="meta-key">Side B</span>
            <span class="meta-value side-meta">
              <span class="side-status-dot" :style="{ background: sideBStatus.color }" />
              <span>{{ mixtape.sideB.length }} trk · {{ formatTime(totalB) }}</span>
            </span>
          </div>

          <!-- For -->
          <div class="meta-row">
            <span class="meta-key">For</span>
            <input
              v-if="editingFor"
              ref="forInput"
              v-model="forText"
              class="meta-input"
              placeholder="who's this for?"
              @blur="saveFor"
              @keydown.enter="saveFor"
              @keydown.escape="editingFor = false"
            />
            <span v-else class="meta-value meta-editable" @click="startEditFor">
              <template v-if="mixtape.dedicatedTo">{{ mixtape.dedicatedTo }}</template>
              <span v-else class="meta-placeholder">click to add...</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions panel -->
    <div class="preview-panel">
      <div class="panel-titlebar panel-plum">Actions</div>
      <div class="panel-body panel-body-actions">
        <button class="btn btn-sage action-btn" :disabled="isSaving" @click="emit('save')">
          <span class="action-btn-icon">💾</span>
          {{ isSaving ? 'Saving to cloud...' : 'Save to cloud' }}
        </button>
        <button
          class="btn action-btn"
          :disabled="!isCloudSaved || mixtape.isCopy"
          :title="!isCloudSaved ? 'Save to cloud first' : mixtape.isCopy ? 'This is an unedited copy of another mixtape, and will not show up in the explore page' : undefined"
          @click="emit('togglePublic')"
        >
          <span class="action-btn-icon">{{ mixtape.isPublic ? '◉' : '◌' }}</span>
          {{ mixtape.isPublic ? 'Make Private' : 'Make Public' }}
        </button>
        <p v-if="mixtape.isCopy" class="action-note">
          This is an unedited copy of another mixtape, and will not show up in the explore page
        </p>
        <ExportToSpotify :mixtape="mixtape" />
        <div class="action-btn-divider" />
        <button class="btn action-btn action-btn-secondary" @click="emit('newMixtape')">
          <span class="action-btn-icon">+</span>
          New Mixtape
        </button>
      </div>
    </div>

    <!-- Dubbing progress -->
    <div v-if="isSaving" class="dubbing-panel">
      <div class="dubbing-reel" />
      <div class="dubbing-info">
        <div class="dubbing-label">dubbing to cloud...</div>
        <div class="dubbing-bar">
          <div class="dubbing-fill" />
        </div>
      </div>
    </div>
  </div>
</template>
