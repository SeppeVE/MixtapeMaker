<script setup lang="ts">
import type { JCard } from '~/types';
import type { JCardLibraryState } from '~/composables/useJCardLibrary';
import '~/assets/styles/jcard/JCardLibrary.css';

const props = withDefaults(
  defineProps<{
    library: JCardLibraryState;
    onOpenCard: (card: JCard) => void;
    onNewCard: () => void;
    onOpenAuth: () => void;
    embedded?: boolean;
  }>(),
  { embedded: false }
);

const {
  allCards,
  loading,
  error,
  uploadingIds,
  loadCards,
  cardStatus,
  uploadCard,
  deleteCard,
  user,
} = props.library;

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const badgeText = (status: string) =>
  status === 'local' ? '💾 Local' : status === 'cloud' ? '☁ Cloud' : '✓ Synced';
</script>

<template>
  <div :class="`jcard-library${embedded ? ' jcard-library--embedded' : ''}`">
    <div v-if="!embedded" class="jcard-library-header">
      <h2 class="jcard-library-title">J-Cards</h2>
      <button class="btn btn-primary" @click="onNewCard">+ New Card</button>
    </div>

    <div v-if="!user && allCards.length > 0" class="jcl-sync-banner">
      <span>💾 Your cards are saved locally. Sign in to back them up to the cloud.</span>
      <button class="btn" @click="onOpenAuth">Sign In</button>
    </div>

    <p v-if="loading" class="jcard-library-empty">Loading…</p>

    <div v-if="!loading && error" class="jcl-error">
      <span>⚠ {{ error }}</span>
      <button class="btn" @click="loadCards">↻ Retry</button>
    </div>

    <div v-if="!loading && !error && allCards.length === 0" class="jcard-library-empty">
      <p>No J-cards yet.</p>
      <button v-if="!user" class="btn btn-primary" style="margin-top: 12px" @click="onOpenAuth">Sign in to get started</button>
      <button class="btn btn-primary" style="margin-top: 12px" @click="onNewCard">Create your first J-card</button>
    </div>

    <div v-if="!loading && allCards.length > 0" class="jcard-library-grid">
      <div
        v-for="card in allCards"
        :key="card.id"
        class="jcard-card"
        role="button"
        tabindex="0"
        @click="onOpenCard(card)"
        @keydown.enter="onOpenCard(card)"
      >
        <div class="jcard-card-swatch" :style="{ backgroundColor: card.content.backgroundColor }" />
        <div class="jcard-card-info">
          <p class="jcard-card-name">{{ card.title || 'Untitled' }}</p>
          <p class="jcard-card-meta">
            {{ card.content.flaps }} flap{{ card.content.flaps !== 1 ? 's' : '' }} · {{ fmt(card.updatedAt) }}
          </p>
        </div>
        <div class="jcl-card-actions" @click.stop>
          <span :class="`jcl-badge jcl-badge-${cardStatus(card)}`">{{ badgeText(cardStatus(card)) }}</span>
          <button
            v-if="cardStatus(card) === 'local' && user"
            class="jcl-upload-btn btn"
            :disabled="uploadingIds.has(card.id)"
            title="Upload to cloud"
            @click="uploadCard(card)"
          >
            {{ uploadingIds.has(card.id) ? '…' : '↑ Cloud' }}
          </button>
          <button class="jcard-card-delete btn" title="Delete" @click="deleteCard(card)">×</button>
        </div>
      </div>
    </div>
  </div>
</template>
