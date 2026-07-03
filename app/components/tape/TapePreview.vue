<script setup lang="ts">
import type { Mixtape, CassetteLength } from '~/types';
import { calculateTotalDuration, formatTime } from '~/utils/timeUtils';
import '~/assets/styles/TapePreview.css';

const props = defineProps<{
  mixtape: Mixtape;
  sideA: boolean;
  isSaving: boolean;
  onUpdate: (updates: Partial<Mixtape>) => void;
  onSave: () => void;
  onNewMixtape: () => void;
  onTogglePublic: () => void;
  isCloudSaved: boolean;
}>();

const editingTitle = ref(false);
const titleText = ref(props.mixtape.title);
const editingFor = ref(false);
const forText = ref(props.mixtape.dedicatedTo ?? '');

const totalA = computed(() => calculateTotalDuration(props.mixtape.sideA));
const totalB = computed(() => calculateTotalDuration(props.mixtape.sideB));
const maxDur = computed(() => (props.mixtape.cassetteLength / 2) * 60);
const accentColor = computed(() => (props.sideA ? '#8FC9B7' : '#B4A0C7'));

function getSideStatus(totalDur: number, maxDurVal: number) {
  if (totalDur === 0) return { color: 'rgba(42,30,40,.25)', label: 'empty' };
  if (totalDur > maxDurVal) return { color: '#d4524a', label: `+${formatTime(totalDur - maxDurVal)} over` };
  const pct = Math.round((totalDur / maxDurVal) * 100);
  if (pct < 70) return { color: '#C4962A', label: `${pct}% · gap` };
  return { color: '#4a7c5e', label: `${pct}%` };
}

const sideAStatus = computed(() => getSideStatus(totalA.value, maxDur.value));
const sideBStatus = computed(() => getSideStatus(totalB.value, maxDur.value));

const isUntitled = computed(() => props.mixtape.title === 'Untitled Mixtape');

const saveTitle = () => {
  const trimmed = titleText.value.trim();
  if (trimmed) props.onUpdate({ title: trimmed });
  editingTitle.value = false;
};

const saveFor = () => {
  props.onUpdate({ dedicatedTo: forText.value.trim() || undefined });
  editingFor.value = false;
};

const startEditTitle = () => {
  titleText.value = props.mixtape.title;
  editingTitle.value = true;
};

const startEditFor = () => {
  forText.value = props.mixtape.dedicatedTo ?? '';
  editingFor.value = true;
};

const handleLengthChange = (e: Event) => {
  props.onUpdate({ cassetteLength: Number((e.target as HTMLSelectElement).value) as CassetteLength });
};

const vFocus = { mounted: (el: HTMLElement) => el.focus() };
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
              v-model="titleText"
              v-focus
              class="meta-input"
              placeholder="Name your tape..."
              @blur="saveTitle"
              @keydown.enter="saveTitle"
              @keydown.escape="editingTitle = false"
            >
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
            <select class="meta-select" :value="mixtape.cassetteLength" @change="handleLengthChange">
              <option :value="30">C30 · 15m / side</option>
              <option :value="45">C45 · 22.5m / side</option>
              <option :value="60">C60 · 30m / side</option>
              <option :value="90">C90 · 45m / side</option>
              <option :value="100">C100 · 50m / side</option>
              <option :value="120">C120 · 60m / side</option>
            </select>
          </div>

          <!-- Side A with fill status -->
          <div class="meta-row">
            <span class="meta-key">Side A</span>
            <span class="meta-value side-meta">
              <span class="side-status-dot" :style="{ background: sideAStatus.color }" />
              <span>{{ mixtape.sideA.length }} trk · {{ formatTime(totalA) }}</span>
            </span>
          </div>

          <!-- Side B with fill status -->
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
              v-model="forText"
              v-focus
              class="meta-input"
              placeholder="who's this for?"
              @blur="saveFor"
              @keydown.enter="saveFor"
              @keydown.escape="editingFor = false"
            >
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
        <button class="btn action-btn" :disabled="isSaving" @click="onSave">
          {{ isSaving ? 'Saving to cloud...' : 'Save to cloud' }}
        </button>
        <button class="btn action-btn" @click="onNewMixtape">
          + New Mixtape
        </button>
        <button
          class="btn action-btn"
          :disabled="!isCloudSaved"
          :title="isCloudSaved ? undefined : 'Save to cloud first'"
          @click="onTogglePublic"
        >
          {{ mixtape.isPublic ? '◉ Make Private' : '◌ Make Public' }}
        </button>
        <ExportToSpotify :mixtape="mixtape" />
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
