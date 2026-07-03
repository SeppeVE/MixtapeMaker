<script setup lang="ts">
import type { Mixtape } from '~/types';
import { searchPublicMixtapes } from '~/utils/database';
import { formatDuration } from '~/utils/timeUtils';
import '~/assets/styles/LibraryPage.css';
import '~/assets/styles/SearchBar.css';

const PAGE_SIZE = 24;

const { isAuthModalOpen } = useAppMixtapeState();
const onGoHome = () => navigateTo('/');
const onOpenAuth = () => { isAuthModalOpen.value = true; };
const onOpenLibrary = () => navigateTo('/library');
const onOpenMixtape = (id: string) => navigateTo(`/explore/${id}`);

const query = ref('');
const tapes = ref<Mixtape[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref<string | null>(null);
const hasMore = ref(true);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const runSearch = (q: string) => {
  loading.value = true;
  error.value = null;
  searchPublicMixtapes(q, PAGE_SIZE, 0)
    .then((results) => {
      tapes.value = results;
      hasMore.value = results.length === PAGE_SIZE;
    })
    .catch(() => { error.value = 'Failed to load public mixtapes'; })
    .finally(() => { loading.value = false; });
};

onMounted(() => runSearch(''));

const handleQueryChange = (value: string) => {
  query.value = value;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runSearch(value), 300);
};

const loadMore = () => {
  loadingMore.value = true;
  searchPublicMixtapes(query.value, PAGE_SIZE, tapes.value.length)
    .then((results) => {
      tapes.value = [...tapes.value, ...results];
      hasMore.value = results.length === PAGE_SIZE;
    })
    .catch(() => { error.value = 'Failed to load more mixtapes'; })
    .finally(() => { loadingMore.value = false; });
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const totalDuration = (m: Mixtape) =>
  [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);
</script>

<template>
  <div class="lib-page">
    <NavBar :on-go-home="onGoHome" :on-open-auth="onOpenAuth" :on-open-library="onOpenLibrary">
      <button class="lp-nav-link" @click="onGoHome">◀ Home</button>
      <span class="lp-nav-sep">/</span>
      <span style="font-family: var(--font-body); font-size: 13px; color: var(--color-text)">Explore</span>
    </NavBar>

    <div class="lib-header">
      <div class="lib-header-inner">
        <div>
          <div class="lib-page-eyebrow">◆ COMMUNITY MIXTAPES</div>
          <h1 class="lib-page-title">Explore</h1>
        </div>
      </div>
    </div>

    <div class="lib-content">
      <div class="lib-section-stack">
        <section class="lib-section">
          <div class="search-window explore-search-window">
            <div class="search-window-title">⌕ Search Mixtapes</div>
            <div class="search-form-area">
              <div class="search-form">
                <input
                  type="text"
                  :value="query"
                  placeholder="search by title…"
                  class="search-input"
                  @input="handleQueryChange(($event.target as HTMLInputElement).value)"
                >
              </div>
              <div v-if="!loading && !error" class="search-status-row">
                <div class="search-status">
                  {{ tapes.length }} result{{ tapes.length === 1 ? '' : 's' }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading" class="lib-cards-grid">
            <div v-for="n in 6" :key="n" class="lib-skeleton-tape">
              <div class="lib-skeleton-header" />
              <div class="lib-skeleton-body">
                <div class="lib-skeleton-line" />
                <div class="lib-skeleton-line lib-skeleton-line--short" />
                <div class="lib-skeleton-line lib-skeleton-line--short" />
              </div>
              <div class="lib-skeleton-footer" />
            </div>
          </div>

          <div v-if="!loading && error" class="lib-error-state">
            <span class="lib-error-icon">⚠</span>
            <span class="lib-error-msg">{{ error }}</span>
            <button class="lp-btn lp-btn-mustard" @click="runSearch(query)">↻ Retry</button>
          </div>

          <div v-if="!loading && !error && tapes.length === 0" class="lib-empty">
            <div class="lib-empty-icon">📼</div>
            <p>No public mixtapes found.</p>
          </div>

          <template v-if="!loading && !error && tapes.length > 0">
            <div class="lib-cards-grid">
              <div
                v-for="tape in tapes"
                :key="tape.id"
                class="lib-tape-card"
                role="button"
                tabindex="0"
                @click="onOpenMixtape(tape.id)"
                @keydown.enter="onOpenMixtape(tape.id)"
              >
                <div class="lib-tape-card-header">
                  <span class="lib-tape-card-title">{{ tape.title }}</span>
                </div>
                <div class="lib-tape-card-body">
                  <div class="lib-tape-row">
                    <span class="lib-tape-label">Side A</span>
                    <span class="lib-tape-value">{{ tape.sideA.length }} tracks</span>
                  </div>
                  <div class="lib-tape-row">
                    <span class="lib-tape-label">Side B</span>
                    <span class="lib-tape-value">{{ tape.sideB.length }} tracks</span>
                  </div>
                  <div class="lib-tape-row">
                    <span class="lib-tape-label">Total</span>
                    <span class="lib-tape-value">{{ formatDuration(totalDuration(tape)) }}</span>
                  </div>
                </div>
                <div class="lib-tape-card-footer">
                  <span class="lib-tape-length">C-{{ tape.cassetteLength }}</span>
                  <span class="lib-tape-date">{{ fmtDate(tape.updatedAt) }}</span>
                </div>
              </div>
            </div>
            <div v-if="hasMore" style="display: flex; justify-content: center; margin-top: 24px">
              <button class="lp-btn lp-btn-mustard" :disabled="loadingMore" @click="loadMore">
                {{ loadingMore ? 'Loading…' : 'Load more' }}
              </button>
            </div>
          </template>
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
