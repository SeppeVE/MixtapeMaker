<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData, useSeoMeta, useRequestEvent, setResponseStatus } from '#app';
import { loadPublicJCard } from '~/utils/jcardDatabase';
import { loadPublicMixtape } from '~/utils/database';
import { loadProfilesByIds } from '~/utils/profileDatabase';
import IconCard from '~icons/material-symbols/devices-fold-2-sharp';

const route = useRoute();
const id = computed(() => route.params.id as string);

const { data, pending } = await useAsyncData(
  () => `public-jcard-${id.value}`,
  async () => {
    const card = await loadPublicJCard(id.value);
    if (!card) return { card: null, author: null, mixtape: null };
    const [profiles, mixtape] = await Promise.all([
      loadProfilesByIds([card.userId]),
      card.mixtapeId ? loadPublicMixtape(card.mixtapeId).catch(() => null) : Promise.resolve(null),
    ]);
    return { card, author: profiles.get(card.userId) ?? null, mixtape };
  },
);

const card = computed(() => data.value?.card ?? null);
const author = computed(() => data.value?.author ?? null);
const linkedMixtape = computed(() => data.value?.mixtape ?? null);
const notFound = computed(() => !pending.value && !card.value);

useSeoMeta({
  title: () => (card.value ? `${card.value.title || 'J-Card'} — Mixtape Maker` : 'J-Card — Mixtape Maker'),
  description: 'A cassette J-card designed on Mixtape Maker.',
  robots: 'noindex, follow',
});

if (import.meta.server && notFound.value) {
  setResponseStatus(useRequestEvent(), 404);
}
</script>

<template>
  <div class="lib-page">
    <NavBar library>
      <NuxtLink to="/explore" class="lp-nav-link">◀ Explore</NuxtLink>
      <span class="lp-nav-sep">/</span>
      <span style="font-family:var(--font-body);font-size:13px;color:var(--color-text)">J-Card</span>
    </NavBar>

    <div class="lib-content">
      <p v-if="pending" style="padding:40px;text-align:center">Loading…</p>

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
          <p v-if="linkedMixtape" class="pf-hint" style="margin-bottom:16px">
            Designed for the mixtape
            <NuxtLink :to="`/explore/${linkedMixtape.id}`" class="pf-inline-link">{{ linkedMixtape.title }}</NuxtLink>
          </p>
          <JCardReadOnly :content="card.content" />
        </section>
      </div>
    </div>
    <HomeFooter />
  </div>
</template>
