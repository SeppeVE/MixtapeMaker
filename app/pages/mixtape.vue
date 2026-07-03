<script setup lang="ts">
import type { Mixtape, Song, Side } from '~/types';
import '~/assets/styles/mixtape/MixtapeEditor.css';

const router = useRouter();
const {
  mixtape,
  setMixtape,
  isSaving,
  isAuthModalOpen,
  handleSave,
  handleNewMixtape,
  handleTogglePublic,
  isCloudId,
} = useAppMixtapeState();

const sideA = ref(true);
const flipping = ref(false);
const isEditingTitle = ref(false);
const editTitle = ref('');

const activeSide = computed<Side>(() => (sideA.value ? 'A' : 'B'));
const activeSongs = computed(() => (sideA.value ? mixtape.value.sideA : mixtape.value.sideB));
const maxDuration = computed(() => (mixtape.value.cassetteLength / 2) * 60);

const update = (patch: Partial<Mixtape>) =>
  setMixtape({ ...mixtape.value, ...patch, updatedAt: new Date().toISOString() });

const doFlip = () => {
  if (flipping.value) return;
  flipping.value = true;
  setTimeout(() => { sideA.value = !sideA.value; }, 240);
  setTimeout(() => { flipping.value = false; }, 480);
};

const handleAddSong = (song: Song, side: Side) => {
  const key = side === 'A' ? 'sideA' : 'sideB';
  update({ [key]: [...mixtape.value[key], song] });
  if (side !== activeSide.value) doFlip();
};

const handleRemoveSong = (songId: string, side: Side) => {
  const key = side === 'A' ? 'sideA' : 'sideB';
  update({ [key]: mixtape.value[key].filter((s) => s.id !== songId) });
};

const handleReorderSongs = (side: Side, songs: Song[]) => {
  update({ [side === 'A' ? 'sideA' : 'sideB']: songs });
};

const handleMoveSong = (songId: string, fromSide: Side, toSide: Side) => {
  const fromKey = fromSide === 'A' ? 'sideA' : 'sideB';
  const toKey = toSide === 'A' ? 'sideA' : 'sideB';
  const song = mixtape.value[fromKey].find((s) => s.id === songId);
  if (!song) return;
  setMixtape({
    ...mixtape.value,
    [fromKey]: mixtape.value[fromKey].filter((s) => s.id !== songId),
    [toKey]: [...mixtape.value[toKey], song],
    updatedAt: new Date().toISOString(),
  });
};

const handleShuffle = () => {
  const songs = [...activeSongs.value];
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [songs[i], songs[j]] = [songs[j]!, songs[i]!];
  }
  handleReorderSongs(activeSide.value, songs);
};

const startEditTitle = () => {
  editTitle.value = mixtape.value.title;
  isEditingTitle.value = true;
};
const saveTitle = () => {
  const trimmed = editTitle.value.trim();
  if (trimmed) update({ title: trimmed });
  isEditingTitle.value = false;
};

const onOpenAuth = () => { isAuthModalOpen.value = true; };
const onOpenLibrary = () => navigateTo('/library');

const vFocus = { mounted: (el: HTMLElement) => el.focus() };
</script>

<template>
  <div :class="`editor editor-side-${sideA ? 'a' : 'b'}${flipping ? ' flipping' : ''}`">
    <Floaters :side-a="sideA" />

    <NavBar
      :on-go-home="() => navigateTo('/')"
      :on-open-auth="onOpenAuth"
      :on-open-library="onOpenLibrary"
      :on-save="handleSave"
      :is-saving="isSaving"
    >
      <button class="lp-nav-link" @click="router.back()">◀ Back</button>
      <span class="lp-nav-sep">/</span>
      <input
        v-if="isEditingTitle"
        v-model="editTitle"
        v-focus
        class="lp-nav-title-input"
        @blur="saveTitle"
        @keydown.enter="saveTitle"
        @keydown.escape="isEditingTitle = false"
      >
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
          :on-add-song="handleAddSong"
          :side-a="mixtape.sideA"
          :side-b="mixtape.sideB"
          :active-side="activeSide"
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
          :on-remove-song="handleRemoveSong"
          :on-reorder-songs="handleReorderSongs"
          :on-move-song="handleMoveSong"
        />
      </div>

      <div class="col-preview">
        <TapePreview
          :mixtape="mixtape"
          :side-a="sideA"
          :is-saving="isSaving"
          :on-update="update"
          :on-save="handleSave"
          :on-new-mixtape="handleNewMixtape"
          :on-toggle-public="() => handleTogglePublic(mixtape.id, !mixtape.isPublic)"
          :is-cloud-saved="isCloudId(mixtape.id)"
        />
      </div>
    </div>
    <HomeFooter :on-new-mixtape="handleNewMixtape" />
  </div>
</template>
