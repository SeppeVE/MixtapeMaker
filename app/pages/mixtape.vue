<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import type { Song, Side, Mixtape } from '~/types';
import { useMixtapeStore } from '~/stores/mixtape';
import { isCloudId } from '~/utils/database';

const store = useMixtapeStore();
const router = useRouter();

const sideA = ref(true);
const flipping = ref(false);
const isEditingTitle = ref(false);
const editTitle = ref('');
const titleInput = ref<HTMLInputElement | null>(null);

const mixtape = computed(() => store.mixtape);
const activeSide = computed<Side>(() => (sideA.value ? 'A' : 'B'));
const activeSongs = computed(() => (sideA.value ? mixtape.value.sideA : mixtape.value.sideB));
const maxDuration = computed(() => (mixtape.value.cassetteLength / 2) * 60);

function update(patch: Partial<Mixtape>) {
  store.updateMixtape(patch);
}

function doFlip() {
  if (flipping.value) return;
  flipping.value = true;
  setTimeout(() => { sideA.value = !sideA.value; }, 240);
  setTimeout(() => { flipping.value = false; }, 480);
}

function handleAddSong(song: Song, side: Side) {
  const key = side === 'A' ? 'sideA' : 'sideB';
  update({ [key]: [...mixtape.value[key], song] });
  if (side !== activeSide.value) doFlip();
}

function handleRemoveSong(songId: string, side: Side) {
  const key = side === 'A' ? 'sideA' : 'sideB';
  update({ [key]: mixtape.value[key].filter((s) => s.id !== songId) });
}

function handleReorderSongs(side: Side, songs: Song[]) {
  update({ [side === 'A' ? 'sideA' : 'sideB']: songs });
}

function handleMoveSong(songId: string, fromSide: Side, toSide: Side) {
  const fromKey = fromSide === 'A' ? 'sideA' : 'sideB';
  const toKey = toSide === 'A' ? 'sideA' : 'sideB';
  const song = mixtape.value[fromKey].find((s) => s.id === songId);
  if (!song) return;
  store.updateMixtape({
    [fromKey]: mixtape.value[fromKey].filter((s) => s.id !== songId),
    [toKey]: [...mixtape.value[toKey], song],
  });
}

function handleShuffle() {
  const songs = [...activeSongs.value];
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [songs[i], songs[j]] = [songs[j], songs[i]];
  }
  handleReorderSongs(activeSide.value, songs);
}

function startEditTitle() {
  editTitle.value = mixtape.value.title;
  isEditingTitle.value = true;
  nextTick(() => titleInput.value?.focus());
}
function saveTitle() {
  const trimmed = editTitle.value.trim();
  if (trimmed) update({ title: trimmed });
  isEditingTitle.value = false;
}
</script>

<template>
  <div :class="`editor editor-side-${sideA ? 'a' : 'b'}${flipping ? ' flipping' : ''}`">
    <Floaters :side-a="sideA" />

    <NavBar library>
      <button class="lp-nav-link" @click="router.back()">◀ Back</button>
      <span class="lp-nav-sep">/</span>
      <input
        v-if="isEditingTitle"
        ref="titleInput"
        v-model="editTitle"
        class="lp-nav-title-input"
        @blur="saveTitle"
        @keydown.enter="saveTitle"
        @keydown.escape="isEditingTitle = false"
      />
      <button
        v-else
        :class="`lp-nav-title${mixtape.title === 'Untitled Mixtape' ? ' lp-nav-title--untitled' : ''}`"
        title="Click to rename"
        @click="startEditTitle"
      >
        {{ mixtape.title }}
      </button>
    </NavBar>

    <div class="workspace">
      <div class="col-search">
        <div class="col-hello">Search</div>
        <SearchBar
          :side-a="mixtape.sideA"
          :side-b="mixtape.sideB"
          :active-side="activeSide"
          @add="handleAddSong"
        />
      </div>

      <div class="col-deck">
        <div class="deck-toolbar">
          <button
            :class="`deck-side-label deck-side-label-${sideA ? 'a' : 'b'}`"
            :title="`Flip to Side ${sideA ? 'B' : 'A'}`"
            @click="doFlip"
          >
            ▸ Side {{ activeSide }}
          </button>
          <div class="deck-toolbar-spacer" />
          <button class="btn deck-tool-btn" title="Shuffle this side" @click="handleShuffle">⤨ Shuffle</button>
          <button class="btn deck-tool-btn" title="Flip tape" @click="doFlip">↻ Flip</button>
        </div>
        <TapeSide
          :side="activeSide"
          :songs="activeSongs"
          :max-duration="maxDuration"
          @remove-song="handleRemoveSong"
          @reorder-songs="handleReorderSongs"
          @move-song="handleMoveSong"
        />
      </div>

      <div class="col-preview">
        <TapePreview
          :mixtape="mixtape"
          :side-a="sideA"
          :is-saving="store.isSaving"
          :is-cloud-saved="isCloudId(mixtape.id)"
          @update="update"
          @save="store.save()"
          @new-mixtape="store.newMixtape()"
          @toggle-public="store.togglePublic(mixtape.id, !mixtape.isPublic)"
        />
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
