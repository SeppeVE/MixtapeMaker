<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { TapeMachineStatus, TapeState } from '~/lib/cassette3d/animation/tapeMachine';
import type { ShelfSort } from '~/lib/cassette3d/library';
import type { ShelfInfo } from '~/composables/useCassetteScene';
import { useMixtapeStore } from '~/stores/mixtape';
import { useUiStore } from '~/stores/ui';

// Buttons for everything clicking the tape does, plus Back, so the 3D library
// works from the keyboard and with a screen reader. Escape steps back. On the
// shelf: search and sort, the hovered tape's title, and a list of the tapes for
// keyboards and screen readers (it shows up when it gets focus).
const props = defineProps<{
  tape: TapeMachineStatus;
  shelf: ShelfInfo;
  hovered: number | null;
  selected: number | null;
}>();
const emit = defineEmits<{
  request: [state: TapeState];
  step: [dir: 1 | -1];
  flip: [];
  select: [index: number];
  highlight: [index: number | null];
  view: [search: string, sort: ShelfSort];
}>();

const store = useMixtapeStore();
const ui = useUiStore();

interface Action {
  label: string;
  run: () => void;
  primary?: boolean;
}

const go = (state: TapeState) => () => emit('request', state);
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
  if (s === 'onShelf') return `The shelf, ${props.shelf.order.length} tapes.`;
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
    <div v-if="onShelf && shelf.status === 'ready' && hasTapes" class="lib3d-toolbar" role="search">
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

    <!-- Empty states -->
    <div v-if="shelf.status === 'ready' && !hasTapes" class="lib3d-empty" role="status">
      <template v-if="shelf.error">
        <p>Your tapes couldn't be loaded.</p>
        <button type="button" class="btn btn-primary" @click="$router.go(0)">↻ Try again</button>
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
      <div v-if="onShelf && shelf.status === 'ready' && shelf.source === 'samples' && !shelf.signedIn" class="lib3d-note">
        These are sample tapes. Sign in to see your own.
        <button type="button" class="btn" @click="ui.openAuth()">Sign in</button>
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
.lib3d-overlay select {
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
