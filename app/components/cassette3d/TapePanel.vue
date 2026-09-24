<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Mixtape } from '~/types';
import type { TapeData } from '~/lib/cassette3d/tapeData';
import type { ShelfInfo } from '~/composables/useCassetteScene';
import { useMixtapeStore } from '~/stores/mixtape';
import { useUiStore } from '~/stores/ui';
import { deleteMixtape } from '~/utils/database';
import { formatDuration } from '~/utils/timeUtils';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { registerCustomFonts } from '~/utils/fontManager';

// The tape that's off the shelf: what's on it, and everything the 2D library's
// tape card can do (the same store / database calls), plus editing and printing
// its J-card. Sample tapes (signed out) can only be printed.
const props = defineProps<{
  tape: TapeData;
  source: ShelfInfo['source'];
}>();
const emit = defineEmits<{
  updated: [mixtape: Mixtape];
  deleted: [mixtapeId: string];
}>();

const store = useMixtapeStore();
const ui = useUiStore();

const mixtape = computed(() => props.tape.mixtape);
/** Your own tape (dev: the seeded shelf pretends to be yours). */
const owned = computed(() => props.source === 'cloud' || props.source === 'seed');
const sides = computed(() => (
  [['Side A', mixtape.value.sideA], ['Side B', mixtape.value.sideB]] as const
).map(([label, songs]) => ({
  label,
  count: songs.length,
  duration: formatDuration(songs.reduce((s, t) => s + t.duration, 0)),
})));
const total = computed(() => formatDuration([...mixtape.value.sideA, ...mixtape.value.sideB].reduce((s, t) => s + t.duration, 0)));
const updated = computed(() => new Date(mixtape.value.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
const trackWord = (n: number) => (n === 1 ? 'track' : 'tracks');

// Details start folded on small screens, where they'd cover the tape.
const open = ref(typeof window === 'undefined' || (window.innerWidth >= 720 && window.innerHeight >= 560));
const busy = ref<'pdf' | 'share' | 'public' | 'delete' | null>(null);

async function run(kind: NonNullable<typeof busy.value>, fn: () => Promise<void>) {
  if (busy.value) return;
  busy.value = kind;
  try {
    await fn();
  } finally {
    busy.value = null;
  }
}

function editTape() {
  store.loadMixtape(mixtape.value);
}

function editCard() {
  store.openDesigner(props.tape.jcard);
}

// As the J-card library's Print button.
const printCard = () => run('pdf', async () => {
  ui.showToast('Exporting print-ready PDF…', 'info');
  try {
    const content = migrateJCardContent(props.tape.jcard.content);
    if (content.customFonts?.length) await registerCustomFonts(content.customFonts);
    const { exportJCardToPDF } = await import('~/utils/jcardPdf');
    await exportJCardToPDF(content, props.tape.jcard.title || 'jcard');
    ui.showToast('J-card PDF downloaded', 'success');
  } catch (e) {
    console.error(e);
    ui.showToast('Could not generate the PDF — please try again', 'error');
  }
});

// As the 2D library's "Copy link".
const share = () => run('share', async () => {
  const tape = mixtape.value;
  let url: string;
  try {
    const token = tape.shareToken ?? (await store.enableShare(tape.id));
    if (!tape.shareToken) emit('updated', { ...tape, shareToken: token });
    url = `${window.location.origin}/share/${token}`;
  } catch {
    ui.showToast('Failed to create share link', 'error');
    return;
  }
  let copied = false;
  try {
    await navigator.clipboard.writeText(url);
    copied = true;
  } catch { /* the modal has its own copy button */ }
  ui.openSuccessModal({
    title: 'Share link ready',
    trigger: 'share',
    link: { url, openLabel: 'Open link' },
    copied,
    note: 'Anyone with this link can view the mixtape, even while it is private.',
  });
});

// As the 2D library's "Make public / private".
const togglePublic = () => run('public', async () => {
  const tape = mixtape.value;
  if (tape.isCopy) return;
  if (await store.togglePublic(tape, !tape.isPublic)) emit('updated', { ...tape, isPublic: !tape.isPublic });
});

// As the 2D library's "Delete".
const remove = () => run('delete', async () => {
  const tape = mixtape.value;
  if (!confirm(`Delete "${tape.title}"?`)) return;
  try {
    await deleteMixtape(tape.id);
    ui.showToast('Tape deleted', 'info');
    emit('deleted', tape.id);
  } catch {
    ui.showToast('Failed to delete tape', 'error');
  }
});
</script>

<template>
  <section class="lib3d-panel" aria-label="This tape">
    <button
      type="button"
      class="lib3d-panel-head"
      :aria-expanded="open"
      aria-controls="lib3d-panel-body"
      @click="open = !open"
    >
      <span class="lib3d-panel-title">{{ mixtape.title }}</span>
      <span class="lib3d-panel-chevron" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>
    <div v-show="open" id="lib3d-panel-body" class="lib3d-panel-body">
      <p v-if="mixtape.dedicatedTo" class="lib3d-panel-dedication">For {{ mixtape.dedicatedTo }}</p>
      <dl class="lib3d-panel-sides">
        <div v-for="side in sides" :key="side.label">
          <dt>{{ side.label }}</dt>
          <dd>{{ side.count }} {{ trackWord(side.count) }} · {{ side.duration }}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{{ total }} on a C-{{ mixtape.cassetteLength }}</dd>
        </div>
      </dl>
      <p class="lib3d-panel-meta">
        <template v-if="owned">
          <span :class="['lib3d-panel-badge', { 'lib3d-panel-badge--public': mixtape.isPublic }]">
            {{ mixtape.isPublic ? 'Public' : 'Private' }}
          </span>
          · updated {{ updated }}
        </template>
        <template v-else>A sample tape</template>
      </p>
      <p v-if="mixtape.isCopy" class="lib3d-panel-note">
        An unedited copy of another mixtape. It won't show up on the explore page.
      </p>
      <div class="lib3d-panel-actions" role="toolbar" aria-label="Tape actions">
        <template v-if="owned">
          <button type="button" class="btn" @click="editTape">Edit tape</button>
          <button type="button" class="btn" @click="editCard">Edit J-card</button>
        </template>
        <button type="button" class="btn" :disabled="busy === 'pdf'" @click="printCard">
          {{ busy === 'pdf' ? 'Exporting…' : 'Print J-card (PDF)' }}
        </button>
        <template v-if="owned">
          <button type="button" class="btn" :disabled="busy === 'share'" title="Copy share link" @click="share">Copy link</button>
          <button
            type="button"
            class="btn"
            :disabled="mixtape.isCopy || busy === 'public'"
            :title="mixtape.isCopy ? 'An unedited copy can\'t be made public' : mixtape.isPublic ? 'Hide this tape from the explore page' : 'Show this tape on the explore page'"
            @click="togglePublic"
          >
            {{ mixtape.isPublic ? 'Make private' : 'Make public' }}
          </button>
          <button type="button" class="btn lib3d-panel-delete" :disabled="busy === 'delete'" @click="remove">Delete</button>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lib3d-panel {
  position: absolute;
  top: 12px;
  left: 16px;
  width: min(360px, calc(100% - 32px));
  background: rgba(20, 16, 13, 0.82);
  border-radius: 6px;
  pointer-events: auto;
}
.lib3d-panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
}
.lib3d-panel-title {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lib3d-panel-chevron {
  opacity: 0.7;
}
.lib3d-panel-body {
  padding: 0 14px 12px;
  font-size: 13px;
}
.lib3d-panel-dedication {
  margin: -4px 0 8px;
  font-style: italic;
  opacity: 0.85;
}
.lib3d-panel-sides {
  margin: 0 0 8px;
}
.lib3d-panel-sides div {
  display: flex;
  gap: 10px;
}
.lib3d-panel-sides dt {
  width: 52px;
  flex-shrink: 0;
  opacity: 0.7;
}
.lib3d-panel-sides dd {
  margin: 0;
}
.lib3d-panel-meta,
.lib3d-panel-note {
  margin: 0 0 10px;
  opacity: 0.85;
}
.lib3d-panel-badge {
  padding: 1px 6px;
  border: 1px solid rgba(242, 235, 217, 0.4);
  border-radius: 3px;
}
.lib3d-panel-badge--public {
  color: #1b1714;
  background: #b9d8a6;
  border-color: #b9d8a6;
}
.lib3d-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lib3d-panel-actions .btn {
  padding: 5px 10px;
  font-size: 12px;
}
.lib3d-panel-delete {
  margin-left: auto;
}
</style>
