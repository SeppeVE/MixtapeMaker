<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import type { Song, Side, Mixtape } from '~/types';
import { useMixtapeStore } from '~/stores/mixtape';
import { isCloudId } from '~/utils/database';
import { isMixtapeUntitled } from '~/utils/mixtapeTitle';
import { useUnsavedStore } from '~/stores/unsaved';

const store = useMixtapeStore();
const router = useRouter();
const unsaved = useUnsavedStore();

// Warn before leaving with edits the cloud hasn't seen (see stores/unsaved.ts).
onMounted(() => {
  unsaved.register('mixtape', {
    path: '/mixtape',
    kind: 'mixtape',
    title: () => (isMixtapeUntitled(store.mixtape.title) ? '' : store.mixtape.title),
    dirty: () => store.hasUnsavedChanges(),
    save: () => store.save(),
  });
});
onBeforeUnmount(() => unsaved.unregister('mixtape'));

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

    <div class="editor-screen">
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
          :class="`lp-nav-title${isMixtapeUntitled(mixtape.title) ? ' lp-nav-title--untitled' : ''}`"
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
            @toggle-public="store.togglePublic(mixtape, !mixtape.isPublic)"
          />
        </div>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>

<style scoped>
/* Nav + workspace fill at least one screen (classic sticky-footer flex);
   the footer is regular content after it, reachable by scrolling .editor. */
.editor-screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Workspace 3-column grid ── */
.workspace {
  flex: 1;
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 290px 1fr 270px;
  gap: 13px;
  padding: 13px 16px;
  min-height: 0;
  overflow: hidden;
}

.col-search,
.col-deck,
.col-preview {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 0;
}

.col-preview {
  overflow-y: auto;
}

/* ── Hello banners ── */
.col-hello,
.deck-side-label {
  display: inline-flex;
  align-items: center;
  background: var(--color-mustard);
  color: var(--color-text);
  border: 2px solid var(--color-text);
  box-shadow: var(--shadow);
  padding: 4px 14px 2px;
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1;
  letter-spacing: 0.4px;
  flex-shrink: 0;
}

.deck-side-label {
  background: var(--color-seafoam);
  cursor: pointer;
}

.deck-side-label:hover { filter: brightness(1.06); }

.deck-side-label:active { transform: translate(2px, 2px); box-shadow: none; }

/* ── Deck toolbar ── */
.deck-toolbar {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.deck-toolbar-spacer { flex: 1; }

.deck-tool-btn {
  padding: 4px 14px 2px;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 400;
}

.flipping .col-deck {
  animation: tape-flip 0.48s cubic-bezier(0.4, 0, 0.2, 1) both;
  pointer-events: none;
}

@media screen and (max-width: 1200px) {
  .workspace {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

  .col-preview {
      order: 1;
    }

  .col-deck {
      grid-column: 1 / -1;
      order: 2;
    }
}

@media screen and (max-width: 768px) {
  .editor-screen {
      min-height: 0;
    }

  .workspace {
      display: flex;
      flex-direction: column;
      overflow: visible;
      padding: 10px 10px 24px;
    }

  .col-search,
    .col-deck,
    .col-preview {
      min-height: unset;
    }

  .col-preview {
      order: 0;
      /* natural height — TapePreview is not a scrollable container */
    }

  .col-search {
      order: 1;
      min-height: 0;
    }

  .col-deck {
      order: 2;
      /* fixed height so the internal song list can scroll */
      height: 460px;
      min-height: 0;
    }
}
</style>
