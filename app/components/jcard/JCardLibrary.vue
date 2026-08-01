<script setup lang="ts">
import type { JCard } from '~/types';
import { useJCardLibraryStore } from '~/stores/jcardLibrary';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';

withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const emit = defineEmits<{ openCard: [card: JCard]; newCard: [] }>();

const library = useJCardLibraryStore();
const auth = useAuthStore();
const ui = useUiStore();

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

async function handleDelete(card: JCard) {
  await library.deleteCard(card);
}
</script>

<template>
  <div :class="`jcard-library${embedded ? ' jcard-library--embedded' : ''}`">
    <div v-if="!embedded" class="jcard-library-header">
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

    <div v-if="!library.loading && library.allCards.length > 0" class="jcard-library-grid">
      <div
        v-for="card in library.allCards"
        :key="card.id"
        class="jcard-card"
        role="button"
        :tabindex="0"
        @click="emit('openCard', card)"
        @keydown.enter="emit('openCard', card)"
      >
        <div class="jcard-card-swatch" :style="{ backgroundColor: card.content.backgroundColor }" />
        <div class="jcard-card-info">
          <p class="jcard-card-name">{{ card.title || 'Untitled' }}</p>
          <p class="jcard-card-meta">
            {{ card.content.flaps }} flap{{ card.content.flaps !== 1 ? 's' : '' }} · {{ fmt(card.updatedAt) }}
          </p>
        </div>
        <div class="jcl-card-actions" @click.stop>
          <span :class="`jcl-badge jcl-badge-${library.cardStatus(card)}`">
            <template v-if="library.cardStatus(card) === 'local'">💾 Local</template>
            <template v-else-if="library.cardStatus(card) === 'cloud'">☁ Cloud</template>
            <template v-else>✓ Synced</template>
          </span>
          <button
            v-if="library.cardStatus(card) === 'local' && auth.user"
            class="jcl-upload-btn btn"
            :disabled="library.uploadingIds.has(card.id)"
            title="Upload to cloud"
            @click="library.uploadCard(card)"
          >
            {{ library.uploadingIds.has(card.id) ? '…' : '↑ Cloud' }}
          </button>
          <button class="jcard-card-delete btn" title="Delete" @click.stop="handleDelete(card)">×</button>
        </div>
      </div>
    </div>
  </div>
</template>
