<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAsyncData } from '#app';
import type { JCardPreviewRow, Profile } from '~/types';
import { searchPublicJCards } from '~/utils/jcardDatabase';
import { loadProfilesByIds } from '~/utils/profileDatabase';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';
import IconWarning from '~icons/material-symbols/warning-rounded';

const PAGE_SIZE = 12;

const route = useRoute();
const router = useRouter();

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

// Author profiles for a page of cards, keyed by user id. Best-effort: a
// failed lookup just drops the bylines rather than the whole page.
async function fetchAuthors(list: JCardPreviewRow[]): Promise<Record<string, Profile>> {
  try {
    const map = await loadProfilesByIds(list.map((c) => c.userId).filter((id): id is string => !!id));
    return Object.fromEntries(map);
  } catch {
    return {};
  }
}

// Restore state from the URL (q/page) so the back button from a card's
// detail page lands back on the same search/page, not a reset page 1.
const initialQuery = typeof route.query.q === 'string' ? route.query.q : '';
const initialPage = Math.max(1, parseInt(String(route.query.page ?? '1'), 10) || 1);

// SSR whatever the current URL asks for — page 1 unfiltered on a fresh visit,
// which is what search engines see. The rows come from public_jcard_previews,
// already trimmed server-side (no inside content, no custom fonts, no data: URLs).
const { data: initial } = await useAsyncData('explore-jcards-initial', async () => {
  const result = await searchPublicJCards(initialQuery, PAGE_SIZE, (initialPage - 1) * PAGE_SIZE);
  return { ...result, authors: await fetchAuthors(result.cards) };
});

const query = ref(initialQuery);
const page = ref(initialPage);
const cards = ref<JCardPreviewRow[]>(initial.value?.cards ?? []);
const total = ref(initial.value?.total ?? 0);
const authors = ref<Record<string, Profile>>(initial.value?.authors ?? {});
const authorOf = (card: JCardPreviewRow) => (card.userId ? authors.value[card.userId] : undefined);
const loading = ref(false);
const error = ref<string | null>(null);

let debounce: ReturnType<typeof setTimeout> | null = null;

function syncUrl() {
  router.replace({ query: { tab: 'jcards', q: query.value.trim() || undefined, page: page.value > 1 ? String(page.value) : undefined } });
}

async function runSearch() {
  loading.value = true;
  error.value = null;
  try {
    const { cards: rows, total: count } = await searchPublicJCards(query.value, PAGE_SIZE, (page.value - 1) * PAGE_SIZE);
    cards.value = rows;
    total.value = count;
    authors.value = await fetchAuthors(rows);
  } catch {
    error.value = 'Failed to load public J-cards';
  } finally {
    loading.value = false;
  }
}

function onQueryInput(value: string) {
  query.value = value;
  page.value = 1;
  syncUrl();
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => runSearch(), 300);
}

function onPageChange(p: number) {
  page.value = p;
  syncUrl();
  runSearch();
}
</script>

<template>
  <div class="lib-section-stack">
    <section class="lib-section">
      <div class="search-window explore-search-window">
        <div class="search-window-title">⌕ Search J-Cards</div>
        <div class="search-form-area">
          <div class="search-form">
            <input
              :value="query"
              type="text"
              placeholder="search by title…"
              class="search-input"
              @input="onQueryInput(($event.target as HTMLInputElement).value)"
            />
          </div>
          <div v-if="!loading && !error" class="search-status-row">
            <div class="search-status">{{ total }} result{{ total === 1 ? '' : 's' }}</div>
          </div>
          <div v-if="!loading && !error" class="explore-filters">
            <div class="explore-filters-label">◆ FILTERS</div>
            <ExplorePagination
              :page="page"
              :total="total"
              :page-size="PAGE_SIZE"
              class="explore-pager--left"
              @update:page="onPageChange"
            />
          </div>
        </div>
      </div>

      <div v-if="loading" class="jcl-grid">
        <div v-for="n in 6" :key="n" class="lib-skeleton-jcard">
          <div class="lib-skeleton-header" />
          <div class="lib-skeleton-body">
            <div class="lib-skeleton-line" />
            <div class="lib-skeleton-line lib-skeleton-line--short" />
            <div class="lib-skeleton-line lib-skeleton-line--short" />
          </div>
          <div class="lib-skeleton-footer" />
        </div>
      </div>

      <div v-else-if="error" class="lib-error-state">
        <IconWarning class="lib-error-icon" aria-hidden="true" />
        <span class="lib-error-msg">{{ error }}</span>
        <button class="lp-btn lp-btn-mustard" @click="runSearch">↻ Retry</button>
      </div>

      <div v-else-if="cards.length === 0" class="lib-empty">
        <IconCard class="lib-empty-icon" aria-hidden="true" />
        <p>No public J-cards found.</p>
      </div>

      <template v-else>
        <div class="jcl-grid">
          <NuxtLink
            v-for="card in cards"
            :key="card.id"
            :to="`/jcard/${card.id}`"
            class="jcl-card"
          >
            <div class="jcl-card-body">
              <ClientOnly>
                <JCardMiniPreview :content="card.content" />
                <template #fallback>
                  <div class="jcl-mini jcl-mini--placeholder" />
                </template>
              </ClientOnly>

              <div class="jcl-card-info">
                <p class="jcl-card-title">{{ card.title || 'Untitled J-Card' }}</p>
                <AuthorByline v-if="authorOf(card)" :profile="authorOf(card)!" />
                <div class="jcl-chips">
                  <span class="jcl-chip jcl-chip-flaps">
                    <IconCard class="icon-inline" aria-hidden="true" /> {{ card.flapCount }} panel{{ card.flapCount !== 1 ? 's' : '' }}
                  </span>
                  <span v-if="card.hasInside" class="jcl-chip">Inside</span>
                  <span v-if="card.mixtapeId" class="jcl-chip" title="Designed for a mixtape">♫</span>
                </div>
                <p class="jcl-card-edited">{{ fmtDate(card.updatedAt) }}</p>
              </div>
            </div>
          </NuxtLink>
        </div>
        <ExplorePagination
          :page="page"
          :total="total"
          :page-size="PAGE_SIZE"
          class="explore-pager--left"
          style="margin-top:24px"
          @update:page="onPageChange"
        />
      </template>
    </section>
  </div>
</template>
