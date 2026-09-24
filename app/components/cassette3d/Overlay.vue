<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventListener } from '@vueuse/core';
import type { TapeMachineStatus, TapeState } from '~/lib/cassette3d/animation/tapeMachine';
import type { ShelfSort } from '~/lib/cassette3d/library';
import type { ShelfInfo } from '~/composables/useCassetteScene';
import type { Mixtape } from '~/types';
import type { TapeData } from '~/lib/cassette3d/tapeData';
import { useAuthStore } from '~/stores/auth';
import { useMixtapeStore } from '~/stores/mixtape';
import { useUiStore } from '~/stores/ui';
import { isMixtapeUntitled } from '~/utils/mixtapeTitle';
import LibraryViewToggle from './LibraryViewToggle.vue';
import TapePanel from './TapePanel.vue';

// Buttons for everything clicking the tape does, plus Back, so the 3D library
// works from the keyboard and with a screen reader. Escape steps back. On the
// shelf: search and sort, the hovered tape's title, and a list of the tapes for
// keyboards and screen readers (it shows up when it gets focus), the 2D/3D switch,
// a New menu, and the unsaved draft. Off the shelf: the tape's details and actions.
const props = defineProps<{
  tape: TapeMachineStatus;
  shelf: ShelfInfo;
  hovered: number | null;
  selected: number | null;
  selectedTape: TapeData | null;
}>();
const emit = defineEmits<{
  request: [state: TapeState];
  step: [dir: 1 | -1];
  flip: [];
  select: [index: number];
  highlight: [index: number | null];
  view: [search: string, sort: ShelfSort];
  updated: [mixtape: Mixtape];
  deleted: [mixtapeId: string];
  saved: [mixtapeId: string];
}>();

const auth = useAuthStore();
const store = useMixtapeStore();
const ui = useUiStore();
const router = useRouter();

interface Action {
  label: string;
  run: () => void;
  primary?: boolean;
}

const go = (state: TapeState) => () => emit('request', state);
/** A user's public shelf (their profile), not your library. */
const isPublic = computed(() => props.shelf.source === 'public');
const owner = computed(() => props.shelf.owner);
const route = useRoute();
/** The owner's profile, keeping a per-visit ?3d=1. */
const profileLink = computed(() => ({
  path: `/user/${owner.value?.username ?? ''}`,
  query: route.query['3d'] ? { '3d': route.query['3d'] } : {},
}));
const onShelf = computed(() => props.tape.target === 'onShelf');
const hasTapes = computed(() => props.shelf.entries.length > 0);

// Keyed on where the tape is heading, so the buttons answer straight away mid-animation.
const actions = computed<Action[]>(() => {
  switch (props.tape.target) {
    case 'onShelf':
      return [];
    case 'pulledOut':
      return [
        { label: 'Take it out', run: go('presented'), primary: true },
        { label: 'Put it back', run: go('onShelf') },
      ];
    case 'presented':
      return [
        { label: 'Open case', run: go('lidOpen'), primary: true },
        ...(hasTapes.value ? [{ label: 'Back to the shelf', run: go('onShelf') }] : []),
      ];
    case 'lidOpen':
      return [
        { label: 'Take out cassette', run: go('cassetteOut'), primary: true },
        { label: 'Close case', run: go('presented') },
      ];
    case 'cassetteOut':
      return [
        { label: 'Take out J-card', run: go('jcardOut'), primary: true },
        { label: 'Put cassette back', run: go('lidOpen') },
      ];
    case 'jcardOut':
      return [
        { label: 'Unfold J-card', run: go('jcardUnfolded'), primary: true },
        { label: 'Put J-card back', run: go('cassetteOut') },
      ];
    case 'jcardUnfolded':
      return [
        { label: 'Turn over', run: () => emit('flip'), primary: true },
        { label: 'Fold up', run: go('jcardOut') },
        { label: 'Put everything back', run: go('presented') },
      ];
  }
  return [];
});

const selectedTitle = computed(() => (props.selected !== null ? props.shelf.entries[props.selected]?.title ?? '' : ''));
const ANNOUNCE: Record<TapeState, string> = {
  onShelf: 'The shelf.',
  pulledOut: 'pulled out of the shelf.',
  presented: 'The case is closed.',
  lidOpen: 'The case is open. The cassette and the J-card are in the lid.',
  cassetteOut: 'The cassette is out.',
  jcardOut: 'The J-card is out, folded.',
  jcardUnfolded: 'The J-card is unfolded. Drag to look around it, or turn it over.',
};
const announcement = computed(() => {
  if (props.tape.animating) return '';
  const s = props.tape.state;
  if (s === 'onShelf') {
    const whose = isPublic.value && owner.value ? `@${owner.value.username}'s shelf` : 'The shelf';
    return `${whose}, ${props.shelf.order.length} tapes.`;
  }
  if (s === 'pulledOut') return `${selectedTitle.value}, ${ANNOUNCE.pulledOut}`;
  if (s === 'presented' && selectedTitle.value) return `${selectedTitle.value}. ${ANNOUNCE.presented}`;
  return ANNOUNCE[s];
});

// --- Shelf: search and sort ---------------------------------------------------------
const search = ref('');
const sort = ref<ShelfSort>('updated');
const SORTS: { value: ShelfSort; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'created', label: 'Recently created' },
  { value: 'title', label: 'Title A–Z' },
];
watch([search, sort], () => emit('view', search.value, sort.value));

const caption = computed(() => {
  const i = props.hovered;
  if (i === null) return null;
  return props.shelf.entries[i] ?? null;
});
const orderedEntries = computed(() => props.shelf.order.map((i) => props.shelf.entries[i]!).filter(Boolean));
const countLabel = computed(() => {
  const total = props.shelf.entries.length;
  const shown = props.shelf.order.length;
  const word = (n: number) => (n === 1 ? 'tape' : 'tapes');
  return shown === total ? `${total} ${word(total)}` : `${shown} of ${total} ${word(total)}`;
});

// --- The working draft, as the 2D library shows it: songs, but not in the cloud yet.
const draft = computed(() => store.mixtape);
const draftIsUnsaved = computed(() => {
  const d = draft.value;
  if (!props.shelf.source || props.shelf.source === 'seed' || props.shelf.source === 'public') return false;
  return (d.sideA.length > 0 || d.sideB.length > 0) && !props.shelf.mixtapeIds.includes(d.id);
});
async function saveDraft() {
  if (!auth.user) {
    ui.openAuth();
    return;
  }
  const wasUntitled = isMixtapeUntitled(draft.value.title);
  if (await store.save()) emit('saved', store.mixtape.id);
  else if (wasUntitled) router.push('/mixtape');
}

// --- New menu ------------------------------------------------------------------------
const menu = ref<HTMLDetailsElement | null>(null);
function closeMenu() {
  if (menu.value) menu.value.open = false;
}

useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || props.tape.target === 'onShelf') return;
  const el = e.target as HTMLElement | null;
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
  emit('step', -1);
});
</script>

<template>
  <div class="lib3d-overlay">
    <p class="lib3d-sr" role="status" aria-live="polite">{{ announcement }}</p>

    <!-- Shelf toolbar -->
    <div v-if="onShelf && shelf.status === 'ready'" class="lib3d-toolbar">
      <LibraryViewToggle v-if="!isPublic" current="3d" dark />
      <NuxtLink v-else-if="owner" :to="profileLink" class="lib3d-owner">◀ @{{ owner.username }}</NuxtLink>
      <div v-if="hasTapes" class="lib3d-toolbar-search" role="search">
        <input
          v-model="search"
          type="search"
          class="lib3d-search"
          placeholder="Search tapes, songs, artists"
          aria-label="Search the shelf"
        >
        <select v-model="sort" class="lib3d-sort" aria-label="Sort the shelf">
          <option v-for="s in SORTS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <span class="lib3d-count">{{ countLabel }}</span>
      </div>
      <details v-if="!isPublic" ref="menu" class="lib3d-menu">
        <summary class="lib3d-menu-button">＋ New</summary>
        <div class="lib3d-menu-items" @click="closeMenu">
          <button type="button" @click="store.newMixtape()">New mixtape</button>
          <button type="button" @click="store.openDesigner(null)">New J-card</button>
          <NuxtLink :to="{ path: '/library', query: { tab: 'jcards' } }">All J-cards (2D)</NuxtLink>
        </div>
      </details>
    </div>

    <!-- The tape off the shelf: details and actions -->
    <TapePanel
      v-if="selectedTape && shelf.status === 'ready'"
      :key="selectedTape.mixtape.id"
      :tape="selectedTape"
      :source="shelf.source"
      :owner="shelf.owner"
      @updated="emit('updated', $event)"
      @deleted="emit('deleted', $event)"
    />

    <!-- Empty states -->
    <div v-if="shelf.status === 'ready' && !hasTapes" class="lib3d-empty" role="status">
      <template v-if="isPublic && owner?.status === 'notFound'">
        <p>No user named @{{ owner.username }}.</p>
        <NuxtLink to="/explore" class="btn">Explore</NuxtLink>
      </template>
      <template v-else-if="isPublic && owner?.status === 'private'">
        <p>@{{ owner.username }} has set their profile to private.</p>
      </template>
      <template v-else-if="shelf.error">
        <p>{{ isPublic ? 'These tapes couldn\'t be loaded.' : 'Your tapes couldn\'t be loaded.' }}</p>
        <button type="button" class="btn btn-primary" @click="$router.go(0)">↻ Try again</button>
      </template>
      <template v-else-if="isPublic && owner">
        <p>{{ owner.isYou ? 'You have' : `@${owner.username} has` }} no public mixtapes with a public J-card yet.</p>
        <p class="lib3d-empty-sub">The public shelf shows public mixtapes that have a public J-card linked to them.</p>
        <NuxtLink :to="profileLink" class="btn">Back to the profile</NuxtLink>
      </template>
      <template v-else-if="shelf.hasMixtapes">
        <p>None of your mixtapes has a J-card yet.</p>
        <p class="lib3d-empty-sub">The shelf shows every mixtape that has one. Design a J-card and link it to a mixtape.</p>
        <button type="button" class="btn btn-primary" @click="store.openDesigner(null)">Design a J-card</button>
      </template>
      <template v-else>
        <p>Your shelf is empty.</p>
        <p class="lib3d-empty-sub">Make a mixtape and design its J-card, and it will stand here.</p>
        <button type="button" class="btn btn-primary" @click="store.newMixtape()">▶ Make a tape</button>
      </template>
    </div>
    <div v-else-if="onShelf && shelf.status === 'ready' && !shelf.order.length" class="lib3d-empty" role="status">
      <p>No tapes match “{{ search }}”.</p>
      <button type="button" class="btn" @click="search = ''">Clear search</button>
    </div>

    <!-- Tapes for the keyboard / screen readers: hidden until one of them has focus. -->
    <ul v-if="onShelf && orderedEntries.length" class="lib3d-list" aria-label="Tapes on the shelf">
      <li v-for="entry in orderedEntries" :key="entry.id">
        <button
          type="button"
          class="lib3d-list-item"
          @focus="emit('highlight', entry.index)"
          @blur="emit('highlight', null)"
          @click="emit('select', entry.index)"
        >
          {{ entry.title }}, {{ entry.meta }}
        </button>
      </li>
    </ul>

    <div class="lib3d-bottom">
      <!-- Signed out: the samples -->
      <div v-if="onShelf && shelf.status === 'ready' && shelf.missingTape" class="lib3d-note" role="status">
        <template v-if="isPublic">That tape isn't on this shelf. It shows public mixtapes with a public J-card.</template>
        <template v-else-if="shelf.signedIn">That tape isn't on your shelf. The shelf shows your mixtapes that have a J-card.</template>
        <template v-else>Sign in to open that tape.</template>
      </div>
      <div v-if="onShelf && shelf.status === 'ready' && shelf.source === 'samples' && !shelf.signedIn" class="lib3d-note">
        These are sample tapes. Sign in to see your own.
        <button type="button" class="btn" @click="ui.openAuth()">Sign in</button>
      </div>
      <div v-if="onShelf && draftIsUnsaved" class="lib3d-note lib3d-draft">
        <span>Unsaved draft: <strong>{{ draft.title }}</strong></span>
        <button type="button" class="btn" @click="store.loadMixtape(draft)">Open</button>
        <button type="button" class="btn" :disabled="store.isSaving" @click="saveDraft">
          {{ store.isSaving ? 'Saving…' : 'Save to cloud' }}
        </button>
      </div>
      <p v-if="onShelf && caption" class="lib3d-caption" aria-hidden="true">
        <strong>{{ caption.title }}</strong> <span>{{ caption.meta }}</span>
      </p>
      <p v-else-if="onShelf && shelf.order.length" class="lib3d-caption lib3d-caption--hint" aria-hidden="true">
        Click a tape to take it off the shelf. Drag or scroll to look along it.
      </p>
      <div v-if="actions.length || !onShelf" class="lib3d-actions" role="toolbar" aria-label="Cassette">
        <button
          v-if="!onShelf && hasTapes"
          type="button"
          class="btn lib3d-back"
          aria-keyshortcuts="Escape"
          @click="emit('step', -1)"
        >
          ◀ Back
        </button>
        <button
          v-for="a in actions"
          :key="a.label"
          type="button"
          :class="['btn', { 'btn-primary': a.primary }]"
          @click="a.run"
        >
          {{ a.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lib3d-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: var(--font-body);
  color: var(--color-paper);
}
.lib3d-overlay button,
.lib3d-overlay input,
.lib3d-overlay select,
.lib3d-overlay a,
.lib3d-overlay summary,
.lib3d-menu-items {
  pointer-events: auto;
}
.lib3d-toolbar {
  position: absolute;
  top: 12px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.lib3d-owner {
  padding: 6px 10px;
  font-size: 14px;
  color: inherit;
  text-decoration: none;
  background: rgba(20, 16, 13, 0.78);
  border: 1px solid rgba(242, 235, 217, 0.3);
  border-radius: 4px;
  white-space: nowrap;
}
.lib3d-toolbar-search {
  display: flex;
  flex: 1 1 320px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 560px;
  min-width: 0;
}
.lib3d-menu {
  position: relative;
}
.lib3d-menu-button,
.lib3d-search,
.lib3d-sort {
  font: inherit;
  font-size: 14px;
  color: var(--color-paper);
  background: rgba(20, 16, 13, 0.78);
  border: 1px solid rgba(242, 235, 217, 0.3);
  border-radius: 4px;
  padding: 6px 10px;
}
.lib3d-menu-button {
  list-style: none;
  cursor: pointer;
  white-space: nowrap;
}
.lib3d-menu-button::-webkit-details-marker {
  display: none;
}
.lib3d-menu-items {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 170px;
  padding: 4px 0;
  background: rgba(20, 16, 13, 0.94);
  border: 1px solid rgba(242, 235, 217, 0.3);
  border-radius: 4px;
}
.lib3d-menu-items button,
.lib3d-menu-items a {
  padding: 8px 12px;
  font: inherit;
  font-size: 14px;
  color: inherit;
  text-align: left;
  text-decoration: none;
  background: none;
  border: 0;
  cursor: pointer;
}
.lib3d-menu-items button:hover,
.lib3d-menu-items a:hover {
  background: rgba(242, 235, 217, 0.12);
}
.lib3d-draft strong {
  font-weight: normal;
  text-decoration: underline;
}
.lib3d-search {
  flex: 1 1 200px;
  max-width: 320px;
  min-width: 0;
}
.lib3d-count {
  font-size: 13px;
  opacity: 0.75;
  white-space: nowrap;
}
.lib3d-note {
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  text-align: center;
  background: rgba(20, 16, 13, 0.7);
  padding: 6px 10px;
  border-radius: 4px;
}
.lib3d-empty {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  width: min(380px, calc(100% - 32px));
  padding: 16px 18px;
  text-align: center;
  font-size: 15px;
  background: rgba(20, 16, 13, 0.82);
  border-radius: 6px;
}
.lib3d-empty p {
  margin: 0 0 10px;
}
.lib3d-empty-sub {
  font-size: 13px;
  opacity: 0.8;
}
.lib3d-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}
.lib3d-caption {
  margin: 0;
  max-width: 100%;
  padding: 6px 12px;
  font-size: 15px;
  text-align: center;
  background: rgba(20, 16, 13, 0.78);
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lib3d-caption span {
  opacity: 0.75;
  margin-left: 6px;
  font-size: 13px;
}
.lib3d-caption--hint {
  font-size: 13px;
  opacity: 0.7;
  white-space: normal;
}
.lib3d-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.lib3d-back {
  opacity: 0.85;
}
.lib3d-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
/* Visually hidden; the focused item shows as a pill above the caption. */
.lib3d-list {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 64px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.lib3d-list-item {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
}
.lib3d-list-item:focus-visible {
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: auto;
  height: auto;
  max-width: calc(100% - 32px);
  overflow: hidden;
  text-overflow: ellipsis;
  clip: auto;
  padding: 6px 12px;
  font: inherit;
  font-size: 14px;
  color: #1b1714;
  background: var(--color-paper, #f2ebd9);
  border-radius: 4px;
  outline: 2px solid #f2b35a;
}
</style>
