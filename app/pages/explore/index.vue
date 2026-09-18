<script setup lang="ts">
import { ref } from 'vue';
import { useSeoMeta, useAsyncData } from '#app';
import type { Mixtape, Profile } from '~/types';
import { searchPublicMixtapes } from '~/utils/database';
import { loadProfilesByIds } from '~/utils/profileDatabase';
import { formatDuration } from '~/utils/timeUtils';
import IconCassette from '~icons/ph/cassette-tape';
import IconWarning from '~icons/material-symbols/warning-rounded';

const PAGE_SIZE = 12;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const totalDuration = (m: Mixtape) => [...m.sideA, ...m.sideB].reduce((s, t) => s + t.duration, 0);

useSeoMeta({
  title: 'Explore — Mixtape Maker',
  description: 'Browse public cassette mixtapes made by the community.',
});

// Author profiles for a page of tapes, keyed by user id. Best-effort: a
// failed lookup just drops the bylines rather than the whole page.
async function fetchAuthors(list: Mixtape[]): Promise<Record<string, Profile>> {
  try {
    const map = await loadProfilesByIds(list.map((t) => t.userId).filter((id): id is string => !!id));
    return Object.fromEntries(map);
  } catch {
    return {};
  }
}

// SSR the initial (unfiltered, page 1) list for SEO.
const { data: initial } = await useAsyncData('explore-initial', async () => {
  const result = await searchPublicMixtapes('', PAGE_SIZE, 0);
  return { ...result, authors: await fetchAuthors(result.mixtapes) };
});

const query = ref('');
const page = ref(1);
const tapes = ref<Mixtape[]>(initial.value?.mixtapes ?? []);
const total = ref(initial.value?.total ?? 0);
const authors = ref<Record<string, Profile>>(initial.value?.authors ?? {});
const authorOf = (tape: Mixtape) => (tape.userId ? authors.value[tape.userId] : undefined);
const loading = ref(false);
const error = ref<string | null>(null);

let debounce: ReturnType<typeof setTimeout> | null = null;

async function runSearch() {
  loading.value = true;
  error.value = null;
  try {
    const { mixtapes, total: count } = await searchPublicMixtapes(query.value, PAGE_SIZE, (page.value - 1) * PAGE_SIZE);
    tapes.value = mixtapes;
    total.value = count;
    authors.value = await fetchAuthors(mixtapes);
  } catch {
    error.value = 'Failed to load public mixtapes';
  } finally {
    loading.value = false;
  }
}

function onQueryInput(value: string) {
  query.value = value;
  page.value = 1;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => runSearch(), 300);
}

function onPageChange(p: number) {
  page.value = p;
  runSearch();
}
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <NuxtLink to="/" class="lp-nav-link">◀ Home</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">Explore</span>
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

          <div v-else-if="error" class="lib-error-state">
            <IconWarning class="lib-error-icon" aria-hidden="true" />
            <span class="lib-error-msg">{{ error }}</span>
            <button class="lp-btn lp-btn-mustard" @click="runSearch">↻ Retry</button>
          </div>

          <div v-else-if="tapes.length === 0" class="lib-empty">
            <IconCassette class="lib-empty-icon" aria-hidden="true" />
            <p>No public mixtapes found.</p>
          </div>

          <template v-else>
            <div class="lib-cards-grid">
              <NuxtLink
                v-for="tape in tapes"
                :key="tape.id"
                :to="`/explore/${tape.id}`"
                class="lib-tape-card"
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
                <div v-if="authorOf(tape)" class="lib-tape-card-byline">
                  <AuthorByline :profile="authorOf(tape)!" />
                </div>
                <div class="lib-tape-card-footer">
                  <span class="lib-tape-length">C-{{ tape.cassetteLength }}</span>
                  <span class="lib-tape-date">{{ fmtDate(tape.updatedAt) }}</span>
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
    </div>
    <HomeFooter />
  </div>
</template>
