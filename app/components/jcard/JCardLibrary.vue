<script setup lang="ts">
import { ref, computed } from 'vue';
import type { JCard, Mixtape } from '~/types';
import { useJCardLibraryStore } from '~/stores/jcardLibrary';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { exportJCardToPDF } from '~/utils/jcardPdf';
import { migrateJCardContent } from '~/utils/jcardDefaults';
import { registerCustomFonts } from '~/utils/fontManager';
import IconEye from '~icons/mdi/eye';
import IconEyeOff from '~icons/mdi/eye-off';

// `mixtapes` is only used to label a linked card with its tape length; the
// component still works standalone without it.
const props = withDefaults(defineProps<{ embedded?: boolean; mixtapes?: Mixtape[] }>(), {
  embedded: false,
  mixtapes: () => [],
});

const emit = defineEmits<{ openCard: [card: JCard]; newCard: [] }>();

const library = useJCardLibraryStore();
const auth = useAuthStore();
const ui = useUiStore();

const exportingIds = ref<Set<string>>(new Set());

const tapeLength = computed(() => {
  const byId = new Map(props.mixtapes.map((m) => [m.id, m.cassetteLength]));
  return (card: JCard) => (card.mixtapeId ? byId.get(card.mixtapeId) : undefined);
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

async function handleDelete(card: JCard) {
  await library.deleteCard(card);
}

async function handlePrint(card: JCard) {
  if (exportingIds.value.has(card.id)) return;
  exportingIds.value = new Set(exportingIds.value).add(card.id);
  ui.showToast('Exporting print-ready PDF…', 'info');
  try {
    const content = migrateJCardContent(card.content);
    // The snapshot renders the card's own text, so its fonts have to be live
    // before we rasterise — the designer registers these on open, but from the
    // library the card may never have been opened this session.
    if (content.customFonts?.length) await registerCustomFonts(content.customFonts);
    await exportJCardToPDF(content, card.title || 'jcard');
    ui.showToast('J-card PDF downloaded', 'success');
  } catch (e) {
    console.error(e);
    ui.showToast('Could not generate the PDF — please try again', 'error');
  } finally {
    const ids = new Set(exportingIds.value);
    ids.delete(card.id);
    exportingIds.value = ids;
  }
}
</script>

<template>
  <div :class="`jcard-library${props.embedded ? ' jcard-library--embedded' : ''}`">
    <div v-if="!props.embedded" class="jcard-library-header">
      <h2 class="jcard-library-title">J-Cards</h2>
      <button class="btn btn-primary" @click="emit('newCard')">+ New Card</button>
    </div>

    <div v-if="!auth.user && library.allCards.length > 0" class="jcl-sync-banner">
      <span>💾 Your cards are saved locally. Sign in to back them up to the cloud.</span>
      <button class="btn" @click="ui.openAuth()">Sign In</button>
    </div>

    <p v-if="library.loading" class="jcard-library-empty">Loading…</p>

    <div v-if="!library.loading && library.error" class="jcl-error">
      <span>⚠ {{ library.error }}</span>
      <button class="btn" @click="library.loadCards()">↻ Retry</button>
    </div>

    <div v-if="!library.loading && !library.error && library.allCards.length === 0" class="jcard-library-empty">
      <p>No J-cards yet.</p>
      <button v-if="!auth.user" class="btn btn-primary" style="margin-top:12px" @click="ui.openAuth()">Sign in to get started</button>
      <button class="btn btn-primary" style="margin-top:12px" @click="emit('newCard')">Create your first J-card</button>
    </div>

    <div v-if="!library.loading && library.allCards.length > 0" class="jcl-grid">
      <div v-for="card in library.allCards" :key="card.id" class="jcl-card">
        <div
          class="jcl-card-body"
          role="button"
          :tabindex="0"
          @click="emit('openCard', card)"
          @keydown.enter="emit('openCard', card)"
        >
          <!-- The artwork itself, so cards are tellable apart at a glance. -->
          <ClientOnly>
            <JCardMiniPreview :content="card.content" />
            <template #fallback>
              <div class="jcl-mini jcl-mini--placeholder" />
            </template>
          </ClientOnly>

          <div class="jcl-card-info">
            <p class="jcl-card-title">{{ card.title || 'Untitled' }}</p>
            <div class="jcl-chips">
              <span class="jcl-chip jcl-chip-flaps">🎴 {{ card.content.flaps }} flap{{ card.content.flaps !== 1 ? 's' : '' }}</span>
              <span v-if="tapeLength(card)" class="jcl-chip">C-{{ tapeLength(card) }}</span>
              <span :class="`jcl-badge jcl-badge-${library.cardStatus(card)}`">
                <template v-if="library.cardStatus(card) === 'local'">💾 Local</template>
                <template v-else-if="library.cardStatus(card) === 'cloud'">☁ Cloud</template>
                <template v-else>✓ Synced</template>
              </span>
              <span
                v-if="library.cardStatus(card) !== 'local'"
                class="jcl-chip"
                :class="card.isPublic ? 'lib-badge-public' : 'lib-badge-private'"
                :title="card.isPublic ? 'Public · shown on your profile and the linked mixtape' : 'Private · only you can see this card'"
              >
                <component :is="card.isPublic ? IconEye : IconEyeOff" class="visibility-toggle-icon" aria-hidden="true" />
                {{ card.isPublic ? 'Public' : 'Private' }}
              </span>
            </div>
            <p class="jcl-card-edited">Edited {{ fmt(card.updatedAt) }}</p>
          </div>
        </div>

        <!-- Same paper footer strip as the tape cards, so both tabs behave alike. -->
        <div class="jcl-card-actions">
          <button class="lp-btn lp-btn-plum jcl-action" @click="emit('openCard', card)">
            ✎ Edit card
          </button>
          <button
            class="lp-btn lp-btn-paper jcl-action"
            :disabled="exportingIds.has(card.id)"
            title="Download a print-ready PDF"
            @click="handlePrint(card)"
          >
            {{ exportingIds.has(card.id) ? 'Exporting…' : 'Print PDF' }}
          </button>
          <button
            v-if="library.cardStatus(card) === 'local' && auth.user"
            class="lp-btn lp-btn-forest jcl-action"
            :disabled="library.uploadingIds.has(card.id)"
            title="Upload to cloud"
            @click="library.uploadCard(card)"
          >
            {{ library.uploadingIds.has(card.id) ? '…' : '↑ Cloud' }}
          </button>
          <button
            v-if="library.cardStatus(card) !== 'local'"
            class="btn jcl-visibility"
            :title="card.isPublic ? 'Hide this card from your profile' : 'Show this card on your profile'"
            @click="library.togglePublic(card)"
          >
            <VisibilityToggleIcon :is-public="card.isPublic" />
            {{ card.isPublic ? 'Make private' : 'Make public' }}
          </button>
          <button class="btn jcl-delete" title="Delete card" @click="handleDelete(card)">
            🗑 Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
