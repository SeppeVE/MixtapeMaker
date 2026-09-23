<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { Mixtape, CassetteLength } from '~/types';
import { formatTime, calculateTotalDuration } from '~/utils/timeUtils';
import { isMixtapeUntitled } from '~/utils/mixtapeTitle';
import IconSave from '~icons/material-symbols/save-rounded';

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
const titleRequired = ref(false);

const totalA = computed(() => calculateTotalDuration(props.mixtape.sideA));
const totalB = computed(() => calculateTotalDuration(props.mixtape.sideB));
const maxDur = computed(() => (props.mixtape.cassetteLength / 2) * 60);
const accentColor = computed(() => (props.sideA ? '#8FC9B7' : '#B4A0C7'));
const sideAStatus = computed(() => getSideStatus(totalA.value, maxDur.value));
const sideBStatus = computed(() => getSideStatus(totalB.value, maxDur.value));
const isUntitled = computed(() => isMixtapeUntitled(props.mixtape.title));

function startEditTitle() {
  titleText.value = props.mixtape.title;
  editingTitle.value = true;
  nextTick(() => titleInput.value?.focus());
}
function saveTitle() {
  const trimmed = titleText.value.trim();
  if (trimmed) {
    emit('update', { title: trimmed });
    if (!isMixtapeUntitled(trimmed)) titleRequired.value = false;
  }
  editingTitle.value = false;
}
function handleSaveClick() {
  if (isUntitled.value) {
    titleRequired.value = true;
    startEditTitle();
    return;
  }
  emit('save');
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
          <p v-if="titleRequired && isUntitled" class="meta-title-warning">
            Give your tape a name before saving to the cloud
          </p>

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
        <button class="btn btn-sage action-btn" :disabled="isSaving" @click="handleSaveClick">
          <IconSave class="action-btn-icon" aria-hidden="true" />
          {{ isSaving ? 'Saving to cloud...' : 'Save to cloud' }}
        </button>
        <button
          class="btn action-btn"
          :disabled="!isCloudSaved || mixtape.isCopy"
          :title="!isCloudSaved ? 'Save to cloud first' : mixtape.isCopy ? 'This is an unedited copy of another mixtape, and will not show up in the explore page' : undefined"
          @click="emit('togglePublic')"
        >
          <span class="action-btn-icon">
            <VisibilityToggleIcon :is-public="mixtape.isPublic" />
          </span>
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

<style scoped>
.tape-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Panel (SchWindow) ── */
.preview-panel {
  background: var(--color-sage);
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow);
}

.panel-titlebar {
  color: var(--color-paper);
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1;
  letter-spacing: 0.3px;
  padding: 5px 8px 4px;
  border-bottom: 2px solid var(--color-text);
}

.panel-sage { background: var(--color-forest); }

.panel-plum { background: var(--color-primary); }

.panel-body {
  padding: 10px;
  background: var(--color-sage);
}

.panel-body-actions {
  background: var(--color-paper);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Metadata ── */
.cassette-meta {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px dashed rgba(42,30,40,.3);
  font-size: 11px;
}

.meta-row:last-child { border-bottom: none; }

.meta-key {
  font-family: var(--font-display);
  font-size: 14px;
  opacity: 0.65;
  line-height: 1;
  flex-shrink: 0;
}

.meta-value {
  font-family: var(--font-body);
  font-size: 10px;
  color: var(--color-text);
}

.meta-editable {
  cursor: pointer;
  text-decoration: underline dotted;
}

.meta-editable:hover { color: var(--color-primary); }

.meta-placeholder { opacity: 0.45; font-style: italic; }

.meta-title-warning {
  margin: -2px 0 4px;
  font-size: 10px;
  font-style: italic;
  color: var(--color-warning);
}

.meta-input {
  font-family: var(--font-body);
  font-size: 10px;
  background: var(--color-white);
  border: 1.5px solid var(--color-text);
  color: var(--color-text);
  padding: 2px 5px;
  box-shadow: var(--bevel-in);
  flex: 1;
  min-width: 0;
}

.meta-input:focus { outline: none; background: rgba(212,169,53,.12); }

.meta-select {
  font-family: var(--font-body);
  font-size: 10px;
  background: var(--color-white);
  border: 1.5px solid var(--color-text);
  color: var(--color-text);
  padding: 2px 5px;
  cursor: pointer;
}

.meta-select:focus { outline: none; }

.action-btn-icon {
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
}

.action-btn-secondary {
  opacity: 0.75;
}

.action-btn-secondary:hover { opacity: 1; }

.action-note {
  font-size: 11px;
  font-style: italic;
  line-height: 1.3;
  opacity: 0.7;
  padding: 0 2px;
  margin: -2px 0 2px;
}

.action-btn-divider {
  border-top: 1px dashed rgba(42,30,40,.3);
  margin: 2px 0;
}

/* ── Dubbing progress ── */
.dubbing-panel {
  background: var(--color-paper);
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow-sm);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-display);
  font-size: 14px;
  line-height: 1.2;
}

.dubbing-reel {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-forest);
  border: 1.5px solid var(--color-text);
  flex-shrink: 0;
  animation: reel-spin 1.5s linear infinite;
  position: relative;
}

.dubbing-reel::before {
  content: '';
  position: absolute;
  inset: 30%;
  border-radius: 50%;
  background: var(--color-paper);
}

.dubbing-info { flex: 1; }

.dubbing-label { margin-bottom: 3px; }

.dubbing-bar {
  height: 5px;
  background: var(--color-paper-dk);
  border: 1px solid var(--color-text);
}

.dubbing-fill {
  height: 100%;
  width: 60%;
  background-image: repeating-linear-gradient(
    -45deg,
    var(--color-forest) 0px, var(--color-forest) 3px,
    var(--color-secondary) 3px, var(--color-secondary) 6px
  );
  animation: dub-progress 2s linear infinite;
}

/* ── Title meta row ── */
.meta-untitled {
  opacity: 0.75;
}

.meta-edit-hint {
  opacity: 0;
  font-size: 9px;
  transition: opacity 0.15s;
  margin-left: 2px;
}

.meta-editable:hover .meta-edit-hint { opacity: 0.5; }

/* ── Side status (dot + label) ── */
.side-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.side-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 1px;
  flex-shrink: 0;
  border: 1px solid rgba(42,30,40,.2);
}
</style>
