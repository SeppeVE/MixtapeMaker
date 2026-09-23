<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncData, useSeoMeta, useRequestEvent, setResponseStatus } from '#app';
import type { JCardPaperSize } from '~/types';
import { loadPublicJCard } from '~/utils/jcardDatabase';
import { loadPublicMixtape } from '~/utils/database';
import { loadProfilesByIds } from '~/utils/profileDatabase';
import { registerCustomFonts } from '~/utils/fontManager';
import { useCopyToLibrary } from '~/composables/useCopyToLibrary';
import { useAuthStore } from '~/stores/auth';
import { useUiStore } from '~/stores/ui';
import { useMixtapeStore } from '~/stores/mixtape';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';
import IconPencil from '~icons/material-symbols/edit-sharp';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();
const mixtapeStore = useMixtapeStore();

const id = computed(() => route.params.id as string);

const { data, pending } = await useAsyncData(
  () => `public-jcard-${id.value}`,
  async () => {
    const card = await loadPublicJCard(id.value);
    if (!card) return { card: null, author: null, mixtape: null, sourceCard: null, sourceAuthor: null };
    const [mixtape, sourceCard] = await Promise.all([
      card.mixtapeId ? loadPublicMixtape(card.mixtapeId).catch(() => null) : Promise.resolve(null),
      card.copiedFromId ? loadPublicJCard(card.copiedFromId).catch(() => null) : Promise.resolve(null),
    ]);
    const authorIds = [card.userId, sourceCard?.userId].filter((v): v is string => !!v);
    const profiles = await loadProfilesByIds(authorIds);
    return {
      card,
      mixtape,
      sourceCard,
      author: profiles.get(card.userId) ?? null,
      sourceAuthor: sourceCard ? profiles.get(sourceCard.userId) ?? null : null,
    };
  },
);

const card = computed(() => data.value?.card ?? null);
const author = computed(() => data.value?.author ?? null);
const linkedMixtape = computed(() => data.value?.mixtape ?? null);
const sourceCard = computed(() => data.value?.sourceCard ?? null);
const sourceAuthor = computed(() => data.value?.sourceAuthor ?? null);
const notFound = computed(() => !pending.value && !card.value);
const isOwner = computed(() => !!auth.user && !!card.value && auth.user.id === card.value.userId);

useSeoMeta({
  title: () => (card.value ? `${card.value.title || 'J-Card'} — Mixtape Maker` : 'J-Card — Mixtape Maker'),
  description: 'A cassette J-card designed on Mixtape Maker.',
  robots: 'noindex, follow',
});

if (import.meta.server && notFound.value) {
  setResponseStatus(useRequestEvent(), 404);
}

// Back to Explore's J-Cards tab, restoring whatever search/page it had when
// history allows a true "back" (router.back() returns to that exact URL).
// With no history to return to (a direct link, a new tab) just land on the
// tab fresh.
function goBack() {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push('/explore?tab=jcards');
  }
}

// ── Export PDF ──
const exportPaperSize = ref<JCardPaperSize>(data.value?.card?.content.paperSize ?? 'a4');
const exporting = ref(false);

async function handleExportPdf() {
  if (!card.value || exporting.value) return;
  exporting.value = true;
  try {
    // JCardReadOnly registers the author's custom fonts on mount, but that's a
    // fire-and-forget call — wait for it here too (registerCustomFonts is safe
    // to call again, it skips already-registered faces) so the snapshot never
    // races the font load.
    if (card.value.content.customFonts?.length) {
      await registerCustomFonts(card.value.content.customFonts);
    }
    const { exportJCardToPDF } = await import('~/utils/jcardPdf');
    await exportJCardToPDF({ ...card.value.content, paperSize: exportPaperSize.value }, card.value.title || 'jcard');
  } catch (e) {
    console.error(e);
    ui.showToast('Could not generate the PDF — please try again', 'error');
  } finally {
    exporting.value = false;
  }
}

// ── Edit (owner) / Copy to my library (everyone else) ──
function handleEdit() {
  if (card.value) mixtapeStore.openDesigner(card.value);
}

// Signed out this parks the copy and opens the auth modal; the auth plugin
// replays it once a session lands, wherever the login flow drops the user.
const { copying, requestCopyJCard } = useCopyToLibrary();

function handleCopyClick() {
  if (card.value) void requestCopyJCard(card.value.id);
}
</script>

<template>
  <div class="lib-page">
    <div class="lib-screen">
      <NavBar library>
        <button class="lp-nav-link" @click="goBack">◀ Explore</button>
        <span class="lp-nav-sep">/</span>
        <span class="lp-nav-current">J-Card</span>
      </NavBar>

      <div class="lib-content">
        <p v-if="pending" class="lib-page-loading">Loading…</p>

        <div v-else-if="notFound" class="lib-empty">
          <IconCard class="lib-empty-icon" aria-hidden="true" />
          <p>This J-card isn't available.</p>
          <p class="lib-empty-sub">It may be private or no longer exist.</p>
        </div>

        <div v-else-if="card" class="lib-section-stack">
          <section class="lib-section">
            <div class="lib-section-head">
              <span>{{ card.title || 'Untitled J-Card' }}</span>
              <AuthorByline v-if="author" :profile="author" />
            </div>
            <p v-if="linkedMixtape" class="pf-hint jcard-detail-hint">
              Designed for the mixtape
              <NuxtLink :to="`/explore/${linkedMixtape.id}`" class="pf-inline-link">{{ linkedMixtape.title }}</NuxtLink>
            </p>
            <p v-if="sourceCard" class="pf-hint jcard-detail-hint">
              Based on
              <NuxtLink :to="`/jcard/${sourceCard.id}`" class="pf-inline-link">{{ sourceCard.title || 'Untitled J-Card' }}</NuxtLink> <AuthorByline v-if="sourceAuthor" :profile="sourceAuthor" />
            </p>

            <div class="jcard-detail-actions">
              <div class="jcard-detail-actions-main">
                <label class="jcard-detail-paper-label">
                  Paper
                  <select v-model="exportPaperSize" class="jcard-detail-paper-select">
                    <option value="a4">A4</option>
                    <option value="letter">US Letter</option>
                    <option value="fit">Fit to card</option>
                  </select>
                </label>
                <button class="lp-btn lp-btn-paper" :disabled="exporting" @click="handleExportPdf">
                  {{ exporting ? 'Exporting…' : 'Export PDF' }}
                </button>
              </div>
              <button v-if="isOwner" class="lp-btn lp-btn-plum" @click="handleEdit">
                <IconPencil class="icon-inline" aria-hidden="true" /> Edit
              </button>
              <button v-else class="lp-btn lp-btn-forest" :disabled="copying" @click="handleCopyClick">
                {{ copying ? 'Copying…' : '⎘ Copy to my library' }}
              </button>
            </div>

            <JCardReadOnly :content="card.content" />
          </section>
        </div>
      </div>
      <HomeFooterMain />
    </div>
    <HomeFooterRail />
  </div>
</template>
